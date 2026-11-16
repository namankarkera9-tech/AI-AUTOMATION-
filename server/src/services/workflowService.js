const Workflow = require('../models/Workflow');
const Execution = require('../models/Execution');
const ExecutionLog = require('../models/ExecutionLog');
const ApiError = require('../utils/apiError');
const aiWorkflowGenerator = require('./aiWorkflowGenerator');
const workflowQueue = require('../queues/workflowQueue');

class WorkflowService {
  async getDashboardMetrics(userId) {
    const totalWorkflows = await Workflow.countDocuments({ owner: userId });
    const activeWorkflows = await Workflow.countDocuments({ owner: userId, status: 'active' });
    
    const executions = await Execution.find({ userId }).sort({ createdAt: -1 }).limit(100);
    const totalExecutions = executions.length;
    const completedExecutions = executions.filter((e) => e.status === 'COMPLETED').length;
    const failedExecutions = executions.filter((e) => e.status === 'FAILED').length;
    const runningExecutions = executions.filter((e) => e.status === 'RUNNING' || e.status === 'RETRYING').length;

    const successRate = totalExecutions > 0 ? Math.round((completedExecutions / totalExecutions) * 100) : 100;
    
    // Recent logs for AI activity feed
    const executionIds = executions.map((execution) => execution._id || execution.id);
    const recentLogs = executionIds.length
      ? await ExecutionLog.find({ executionId: { $in: executionIds } }).sort({ createdAt: -1 }).limit(15)
      : [];
    const recentWorkflows = await Workflow.find({ owner: userId }).sort({ updatedAt: -1 }).limit(5);

    return {
      metrics: {
        totalWorkflows,
        activeWorkflows,
        totalExecutions,
        completedExecutions,
        failedExecutions,
        runningExecutions,
        successRate,
      },
      recentWorkflows,
      recentExecutions: executions.slice(0, 8),
      recentLogs,
    };
  }

  async listWorkflows(userId, { status, search, limit = 20, skip = 0 }) {
    const query = { owner: userId };
    if (status && status !== 'all') {
      query.status = status;
    }

    let workflows = await Workflow.find(query).sort({ updatedAt: -1 }).skip(Number(skip)).limit(Number(limit));
    
    if (search) {
      const s = search.toLowerCase();
      workflows = workflows.filter(
        (w) =>
          w.name.toLowerCase().includes(s) ||
          (w.description && w.description.toLowerCase().includes(s)) ||
          (w.tags && w.tags.some((t) => t.toLowerCase().includes(s)))
      );
    }

    const total = await Workflow.countDocuments(query);
    return { workflows, total };
  }

  async getWorkflowById(id, userId) {
    const workflow = await Workflow.findById(id);
    if (!workflow) {
      throw ApiError.notFound('Workflow not found');
    }
    if (String(workflow.owner) !== String(userId)) {
      throw ApiError.forbidden('You do not have permission to view this workflow');
    }
    return workflow;
  }

  async createWorkflow(userId, data) {
    const { name, description = '', trigger = { type: 'manual', config: {} }, nodes = [], edges = [], tags = [] } = data;
    
    const workflow = await Workflow.create({
      name: name || 'Untitled Workflow',
      description,
      owner: userId,
      status: 'draft',
      trigger,
      nodes,
      edges,
      version: 1,
      tags,
    });

    return workflow;
  }

  async generateWorkflow(userId, { prompt }) {
    if (!prompt) {
      throw ApiError.badRequest('Prompt is required for AI workflow generation');
    }

    const generated = await aiWorkflowGenerator.generateWorkflow(prompt);
    
    // Automatically save as draft workflow
    const workflow = await Workflow.create({
      name: generated.name,
      description: generated.description,
      owner: userId,
      status: 'draft',
      trigger: generated.trigger,
      nodes: generated.nodes,
      edges: generated.edges,
      tags: generated.tags,
      version: 1,
    });

    return workflow;
  }

  async updateWorkflow(id, userId, data) {
    const existing = await this.getWorkflowById(id, userId);

    const snapshot = {
      version: existing.version || 1,
      name: existing.name,
      description: existing.description,
      trigger: existing.trigger,
      nodes: existing.nodes || [],
      edges: existing.edges || [],
      tags: existing.tags || [],
      createdAt: new Date(),
    };

    const updatePayload = {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.status && { status: data.status }),
      ...(data.trigger && { trigger: data.trigger }),
      ...(data.nodes && { nodes: data.nodes }),
      ...(data.edges && { edges: data.edges }),
      ...(data.tags && { tags: data.tags }),
      $push: { versions: snapshot },
      $inc: { version: 1 },
    };

    const updated = await Workflow.findByIdAndUpdate(id, updatePayload, { new: true });
    return updated;
  }

  async listWorkflowVersions(id, userId) {
    const workflow = await this.getWorkflowById(id, userId);
    return [{
      version: workflow.version || 1,
      name: workflow.name,
      description: workflow.description,
      trigger: workflow.trigger,
      nodes: workflow.nodes || [],
      edges: workflow.edges || [],
      tags: workflow.tags || [],
      createdAt: workflow.updatedAt,
      current: true,
    }, ...(workflow.versions || []).slice().reverse().map((version) => ({ ...version, current: false }))];
  }

  async restoreWorkflowVersion(id, userId, versionNumber) {
    const workflow = await this.getWorkflowById(id, userId);
    const previous = (workflow.versions || []).find((version) => Number(version.version) === Number(versionNumber));
    if (!previous) throw ApiError.notFound('Workflow version not found');
    return this.updateWorkflow(id, userId, {
      name: previous.name,
      description: previous.description,
      trigger: previous.trigger,
      nodes: previous.nodes,
      edges: previous.edges,
      tags: previous.tags,
    });
  }

  async duplicateWorkflow(id, userId) {
    const source = await this.getWorkflowById(id, userId);
    
    const clone = await Workflow.create({
      name: `${source.name} (Copy)`,
      description: source.description,
      owner: userId,
      status: 'draft',
      trigger: source.trigger,
      nodes: source.nodes,
      edges: source.edges,
      tags: source.tags,
      version: 1,
    });

    return clone;
  }

  async executeWorkflow(id, userId, input = {}) {
    const workflow = await this.getWorkflowById(id, userId);
    const validation = this.validateGraph(workflow);
    if (!validation.valid) {
      throw ApiError.unprocessable('Workflow graph is invalid and cannot be executed', 'WORKFLOW_VALIDATION_FAILED', validation);
    }
    
    // Update lastExecutedAt
    await Workflow.findByIdAndUpdate(id, { lastExecutedAt: new Date() });

    // Enqueue execution
    const execution = await workflowQueue.dispatchWorkflow(workflow, input, userId);
    return execution;
  }

  async validateWorkflow(id, userId) {
    const workflow = await this.getWorkflowById(id, userId);
    return this.validateGraph(workflow);
  }

  validateGraph(workflow) {
    const nodes = workflow.nodes || [];
    const edges = workflow.edges || [];
    const errors = [];
    const ids = new Set(nodes.map((node) => node.id));
    if (!nodes.length) errors.push('Add at least one node before execution.');
    if (ids.size !== nodes.length) errors.push('Every node must have a unique ID.');
    for (const edge of edges) {
      if (!ids.has(edge.source) || !ids.has(edge.target)) errors.push(`Edge ${edge.id || ''} references a missing node.`);
    }

    const indegree = new Map(nodes.map((node) => [node.id, 0]));
    const adjacency = new Map(nodes.map((node) => [node.id, []]));
    for (const edge of edges) {
      if (!ids.has(edge.source) || !ids.has(edge.target)) continue;
      adjacency.get(edge.source).push(edge.target);
      indegree.set(edge.target, indegree.get(edge.target) + 1);
    }
    const queue = [...indegree.entries()].filter(([, degree]) => degree === 0).map(([id]) => id);
    let visited = 0;
    while (queue.length) {
      const current = queue.shift();
      visited += 1;
      for (const target of adjacency.get(current)) {
        indegree.set(target, indegree.get(target) - 1);
        if (indegree.get(target) === 0) queue.push(target);
      }
    }
    if (visited !== nodes.length) errors.push('Workflow contains a cycle. Remove cyclic connections before execution.');
    return { valid: errors.length === 0, errors, nodeCount: nodes.length, edgeCount: edges.length };
  }

  async deleteWorkflow(id, userId) {
    await this.getWorkflowById(id, userId);
    await Workflow.findByIdAndDelete(id);
    return { success: true };
  }
}

module.exports = new WorkflowService();
