const plannerAgent = require('./plannerAgent');
const executionAgent = require('./executionAgent');
const validationAgent = require('./validationAgent');
const recoveryAgent = require('./recoveryAgent');
const monitoringAgent = require('./monitoringAgent');
const Execution = require('../models/Execution');
const AgentMemory = require('../models/AgentMemory');
const notificationService = require('../services/notificationService');
const { emitExecutionStatus } = require('../config/socket');

// LangGraph is the orchestration entry point when installed; retain the agent-chain fallback.
let LangGraph = null;
let langGraphStatus = 'not-installed';
try {
  LangGraph = require('@langchain/langgraph');
  langGraphStatus = 'available';
} catch {
  langGraphStatus = 'not-installed';
}

class Orchestrator {
  constructor() {
    this.activeExecutionControls = new Map(); // executionId -> { status: 'running' | 'paused' | 'cancelled' }
  }

  setExecutionControl(executionId, command) {
    const strId = String(executionId);
    if (!this.activeExecutionControls.has(strId)) {
      this.activeExecutionControls.set(strId, { status: command });
    } else {
      this.activeExecutionControls.get(strId).status = command;
    }
  }

  getExecutionControl(executionId) {
    const strId = String(executionId);
    return this.activeExecutionControls.get(strId)?.status || 'running';
  }

  async getDurableExecutionControl(executionId) {
    const localStatus = this.getExecutionControl(executionId);
    if (localStatus === 'cancelled') return 'cancelled';
    const execution = await Execution.findById(String(executionId));
    if (execution?.status === 'CANCELLED') return 'cancelled';
    if (execution?.status === 'PAUSED') return 'paused';
    return localStatus;
  }

  clearExecutionControl(executionId) {
    this.activeExecutionControls.delete(String(executionId));
  }

  async runWorkflow(args) {
    if (!LangGraph) return this.runWorkflowWithAgents(args);
    const { StateGraph, Annotation, START, END } = LangGraph;
    // Keep service instances/documents in the node closure; LangGraph state should remain serializable.
    const State = Annotation.Root({ completed: Annotation() });
    const graph = new StateGraph(State)
      .addNode('agent_orchestration', async () => {
        await this.runWorkflowWithAgents(args);
        return { completed: true };
      })
      .addEdge(START, 'agent_orchestration')
      .addEdge('agent_orchestration', END)
      .compile();
    await graph.invoke({});
  }

  async runWorkflowWithAgents({ executionId, workflow, workflowId, input = {}, userId, integrationService, aiService }) {
    const strExecutionId = String(executionId);
    const strWorkflowId = String(workflowId || workflow._id || workflow.id);
    const startTime = Date.now();

    const queuedExecution = await Execution.findById(strExecutionId);
    if (!queuedExecution || queuedExecution.status === 'CANCELLED') return;

    this.setExecutionControl(strExecutionId, 'running');

    // 1. Mark Execution as RUNNING
    await Execution.findByIdAndUpdate(strExecutionId, {
      status: 'RUNNING',
      startedAt: new Date(),
      metadata: { langGraph: langGraphStatus, orchestrator: 'chain-of-agents-v1' },
    });
    emitExecutionStatus(strExecutionId, { status: 'RUNNING', executionId: strExecutionId });

    // Step 1: Planner Agent
    const plan = plannerAgent.plan(workflow, input);

    await monitoringAgent.emitLog({
      executionId: strExecutionId,
      workflowId: strWorkflowId,
      agent: 'planner',
      level: 'info',
      eventType: 'PLAN_GENERATED',
      message: `Planner Agent constructed sequence with ${plan.sequence.length} steps. Confidence score: ${(plan.confidence * 100).toFixed(0)}%.`,
      metadata: { plan, langGraph: langGraphStatus },
    });

    // Store in AgentMemory
    await AgentMemory.create({
      workflowId: strWorkflowId,
      executionId: strExecutionId,
      agent: 'planner',
      key: 'execution_plan',
      value: plan,
      confidence: plan.confidence,
    });

    const executionContext = { ...input };
    const stepOutputs = {};
    const nodesMap = new Map((workflow.nodes || []).map((n) => [n.id, n]));

    let executionFailed = false;
    let failureError = null;
    const skippedNodeIds = new Set();

    // Step 2-5: Execute each node in the plan
    for (let i = 0; i < plan.sequence.length; i++) {
      const nodeId = plan.sequence[i];
      const node = nodesMap.get(nodeId);
      if (skippedNodeIds.has(nodeId)) continue;

      // Check pause / cancel controls
      let controlStatus = await this.getDurableExecutionControl(strExecutionId);
      if (controlStatus === 'cancelled') {
        await monitoringAgent.emitLog({
          executionId: strExecutionId,
          workflowId: strWorkflowId,
          nodeId,
          agent: 'monitoring',
          level: 'warning',
          eventType: 'EXECUTION_CANCELLED',
          message: 'Execution was cancelled by operator.',
        });

        await Execution.findByIdAndUpdate(strExecutionId, {
          status: 'CANCELLED',
          completedAt: new Date(),
          duration: Date.now() - startTime,
        });
        emitExecutionStatus(strExecutionId, { status: 'CANCELLED', executionId: strExecutionId });
        this.clearExecutionControl(strExecutionId);
        return;
      }

      while (await this.getDurableExecutionControl(strExecutionId) === 'paused') {
        await Execution.findByIdAndUpdate(strExecutionId, { status: 'PAUSED' });
        emitExecutionStatus(strExecutionId, { status: 'PAUSED', executionId: strExecutionId });
        await new Promise((resolve) => setTimeout(resolve, 1000));
        if (await this.getDurableExecutionControl(strExecutionId) === 'cancelled') break;
      }

      if (await this.getDurableExecutionControl(strExecutionId) === 'cancelled') continue;

      if (!node) continue;

      // Update current node in Execution document
      await Execution.findByIdAndUpdate(strExecutionId, { currentNodeId: nodeId });

      // Monitoring Agent emits node start
      await monitoringAgent.emitLog({
        executionId: strExecutionId,
        workflowId: strWorkflowId,
        nodeId,
        agent: 'monitoring',
        level: 'info',
        eventType: 'NODE_START',
        message: `Starting execution for node: [${node.data?.label || nodeId}]`,
        metadata: { nodeType: node.data?.nodeType },
      });

      let nodeExecutedSuccessfully = false;
      let retryCount = 0;
      const maxRetries = 3;
      let nodeResult = null;

      while (!nodeExecutedSuccessfully && retryCount <= maxRetries) {
        try {
          // Execution Agent runs node
          nodeResult = await executionAgent.executeNode({
            node,
            nodeInput: executionContext,
            executionContext,
            integrationService,
            aiService,
            userId,
          });

          // Validation Agent validates output
          const validation = validationAgent.validate({ node, result: nodeResult });

          if (!validation.isValid) {
            throw new Error(`VALIDATION_FAILED: ${validation.issues.join(', ')}`);
          }

          // Validation Passed log
          await monitoringAgent.emitLog({
            executionId: strExecutionId,
            workflowId: strWorkflowId,
            nodeId,
            agent: 'validation',
            level: 'success',
            eventType: 'VALIDATION_PASSED',
            message: `Validation Agent confirmed required fields for [${node.data?.label || nodeId}].`,
            metadata: { validation },
          });

          // Monitoring Agent logs success
          await monitoringAgent.emitLog({
            executionId: strExecutionId,
            workflowId: strWorkflowId,
            nodeId,
            agent: 'execution',
            level: 'success',
            eventType: 'NODE_SUCCESS',
            message: `Node [${node.data?.label || nodeId}] finished in ${nodeResult.duration}ms.`,
            metadata: { output: nodeResult.output },
          });

          // Save node output into execution context
          stepOutputs[nodeId] = nodeResult.output;
          Object.assign(executionContext, nodeResult.output);
          if (node.data?.nodeType === 'condition') {
            const selectedBranch = nodeResult.output.branch;
            const skippedRoots = (workflow.edges || [])
              .filter((edge) => edge.source === nodeId && ['true', 'false'].includes(edge.sourceHandle) && edge.sourceHandle !== selectedBranch)
              .map((edge) => edge.target);
            const pending = [...skippedRoots];
            while (pending.length) {
              const skippedId = pending.pop();
              if (skippedNodeIds.has(skippedId)) continue;
              skippedNodeIds.add(skippedId);
              for (const edge of workflow.edges || []) {
                if (edge.source === skippedId) pending.push(edge.target);
              }
            }
          }
          nodeExecutedSuccessfully = true;
        } catch (nodeError) {
          // Recovery Agent handles and classifies failure
          const recovery = recoveryAgent.classifyAndResolve({
            error: nodeError,
            node,
            retryCount,
            maxRetries,
          });

          await monitoringAgent.emitLog({
            executionId: strExecutionId,
            workflowId: strWorkflowId,
            nodeId,
            agent: 'recovery',
            level: 'warning',
            eventType: 'FAILURE_CLASSIFIED',
            message: `Recovery Agent: Failure classified as ${recovery.classification}. Strategy: ${recovery.strategy}. Reason: ${recovery.reason}`,
            metadata: { recovery, error: nodeError.message },
          });

          if (recovery.strategy === 'retry_with_backoff' && retryCount < maxRetries) {
            retryCount++;
            await Execution.findByIdAndUpdate(strExecutionId, {
              status: 'RETRYING',
              $inc: { retryCount: 1 },
            });
            emitExecutionStatus(strExecutionId, { status: 'RETRYING', executionId: strExecutionId });

            await monitoringAgent.emitLog({
              executionId: strExecutionId,
              workflowId: strWorkflowId,
              nodeId,
              agent: 'recovery',
              level: 'info',
              eventType: 'RETRY_SCHEDULED',
              message: `Applying exponential backoff of ${recovery.backoffMs}ms before attempt ${retryCount + 1}/${maxRetries}...`,
            });

            await new Promise((res) => setTimeout(res, recovery.backoffMs));
          } else {
            // Strategy is escalate
            executionFailed = true;
            failureError = {
              classification: recovery.classification,
              nodeId,
              message: nodeError.message,
              reason: recovery.reason,
            };

            await monitoringAgent.emitLog({
              executionId: strExecutionId,
              workflowId: strWorkflowId,
              nodeId,
              agent: 'recovery',
              level: 'error',
              eventType: 'ESCALATION_TRIGGERED',
              message: `Recovery Agent escalated failure on node [${node.data?.label || nodeId}]: ${recovery.reason}`,
              metadata: { failureError },
            });

            // Create user notification for escalation
            await notificationService.createNotification({
              userId,
              workflowId: strWorkflowId,
              executionId: strExecutionId,
              type: 'escalation',
              title: `Workflow Execution Escalated: ${workflow.name}`,
              message: `Failure on node [${node.data?.label || nodeId}]: ${recovery.reason}`,
            });

            break; // Stop further node execution
          }
        }
      }

      if (executionFailed) break;
    }

    const duration = Date.now() - startTime;
    const finalControl = await this.getDurableExecutionControl(strExecutionId);
    const finalStatus = finalControl === 'cancelled' ? 'CANCELLED' : executionFailed ? 'FAILED' : 'COMPLETED';

    // Update Execution document
    await Execution.findByIdAndUpdate(strExecutionId, {
      status: finalStatus,
      completedAt: new Date(),
      duration,
      output: stepOutputs,
      error: failureError,
      currentNodeId: null,
    });

    emitExecutionStatus(strExecutionId, {
      status: finalStatus,
      executionId: strExecutionId,
      duration,
      output: stepOutputs,
      error: failureError,
    });

    // Final notification
    await notificationService.createNotification({
      userId,
      workflowId: strWorkflowId,
      executionId: strExecutionId,
      type: finalStatus === 'CANCELLED' ? 'info' : executionFailed ? 'error' : 'success',
      title: finalStatus === 'CANCELLED' ? `Workflow Cancelled: ${workflow.name}` : executionFailed ? `Workflow Failed: ${workflow.name}` : `Workflow Completed: ${workflow.name}`,
      message: finalStatus === 'CANCELLED'
        ? 'Execution was cancelled by the operator.'
        : executionFailed
        ? `Execution halted due to ${failureError?.classification || 'an error'}`
        : `Execution succeeded across all steps in ${duration}ms.`,
    });

    this.clearExecutionControl(strExecutionId);
  }
}

module.exports = new Orchestrator();
