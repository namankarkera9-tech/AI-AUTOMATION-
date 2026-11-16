const { addExecutionJob } = require('./executionQueue');

class WorkflowQueue {
  async dispatchWorkflow(workflow, input = {}, userId) {
    const Execution = require('../models/Execution');

    const execution = await Execution.create({
      workflowId: workflow._id || workflow.id,
      userId,
      workflowSnapshot: {
        name: workflow.name,
        nodes: workflow.nodes,
        edges: workflow.edges,
        trigger: workflow.trigger,
        version: workflow.version,
      },
      status: 'PENDING',
      input,
      retryCount: 0,
    });

    const execId = execution._id ? String(execution._id) : String(execution.id);

    await addExecutionJob({
      executionId: execId,
      workflowId: String(workflow._id || workflow.id),
      workflow: execution.workflowSnapshot,
      input,
      userId,
    });

    return execution;
  }
}

module.exports = new WorkflowQueue();
