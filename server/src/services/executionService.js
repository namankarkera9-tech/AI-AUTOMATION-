const Execution = require('../models/Execution');
const ExecutionLog = require('../models/ExecutionLog');
const ApiError = require('../utils/apiError');
const orchestrator = require('../agents/orchestrator');
const { addExecutionJob } = require('../queues/executionQueue');
const { emitExecutionStatus } = require('../config/socket');

class ExecutionService {
  async listExecutions(userId, { status, workflowId, limit = 20, skip = 0, sort = 'newest' }) {
    const query = { userId };
    if (status && status !== 'all') {
      query.status = status;
    }
    if (workflowId) {
      query.workflowId = workflowId;
    }

    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const safeSkip = Math.max(Number(skip) || 0, 0);
    const sortOrder = sort === 'oldest' ? 1 : -1;
    const executions = await Execution.find(query)
      .sort({ createdAt: sortOrder })
      .skip(safeSkip)
      .limit(safeLimit);

    const total = await Execution.countDocuments(query);
    return { executions, total, limit: safeLimit, skip: safeSkip, sort };
  }

  async getExecutionById(id, userId) {
    const execution = await Execution.findById(id);
    if (!execution) {
      throw ApiError.notFound('Execution session not found');
    }
    if (String(execution.userId) !== String(userId)) {
      throw ApiError.forbidden('You do not have access to this execution');
    }
    return execution;
  }

  async getExecutionTimeline(id, userId) {
    await this.getExecutionById(id, userId);
    const logs = await ExecutionLog.find({ executionId: id }).sort({ createdAt: 1 });
    return logs;
  }

  async pauseExecution(id, userId) {
    const execution = await this.getExecutionById(id, userId);
    if (execution.status !== 'RUNNING') {
      throw ApiError.badRequest(`Cannot pause execution with status: ${execution.status}`);
    }

    orchestrator.setExecutionControl(id, 'paused');
    const updated = await Execution.findByIdAndUpdate(id, { status: 'PAUSED' }, { new: true });
    emitExecutionStatus(id, { status: 'PAUSED', executionId: id });
    return updated;
  }

  async resumeExecution(id, userId) {
    const execution = await this.getExecutionById(id, userId);
    if (execution.status !== 'PAUSED') {
      throw ApiError.badRequest(`Cannot resume execution with status: ${execution.status}`);
    }

    orchestrator.setExecutionControl(id, 'running');
    const updated = await Execution.findByIdAndUpdate(id, { status: 'RUNNING' }, { new: true });
    emitExecutionStatus(id, { status: 'RUNNING', executionId: id });
    return updated;
  }

  async cancelExecution(id, userId) {
    const execution = await this.getExecutionById(id, userId);
    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(execution.status)) {
      throw ApiError.badRequest(`Execution is already terminated with status: ${execution.status}`);
    }

    orchestrator.setExecutionControl(id, 'cancelled');
    const updated = await Execution.findByIdAndUpdate(
      id,
      { status: 'CANCELLED', completedAt: new Date() },
      { new: true }
    );
    emitExecutionStatus(id, { status: 'CANCELLED', executionId: id });
    return updated;
  }

  async retryExecution(id, userId) {
    const existing = await this.getExecutionById(id, userId);

    const newExecution = await Execution.create({
      workflowId: existing.workflowId,
      userId,
      workflowSnapshot: existing.workflowSnapshot,
      status: 'PENDING',
      input: existing.input,
      retryCount: 0,
    });

    const newExecId = newExecution._id ? String(newExecution._id) : String(newExecution.id);

    await addExecutionJob({
      executionId: newExecId,
      workflowId: String(existing.workflowId),
      workflow: existing.workflowSnapshot,
      input: existing.input,
      userId,
    });

    return newExecution;
  }
}

module.exports = new ExecutionService();
