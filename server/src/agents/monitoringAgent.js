const ExecutionLog = require('../models/ExecutionLog');
const { emitExecutionEvent } = require('../config/socket');

/**
 * Monitoring Agent
 * Observability agent: Records structured execution logs, streams real-time events to Socket.IO,
 * and maintains timeline audit trails.
 */
class MonitoringAgent {
  async emitLog({ executionId, workflowId, nodeId = null, agent, level = 'info', eventType, message, metadata = {} }) {
    // 1. Write ExecutionLog row to DB / in-memory store
    const logDoc = await ExecutionLog.create({
      executionId,
      workflowId,
      nodeId,
      agent,
      level,
      eventType,
      message,
      metadata,
    });

    const logObj = logDoc.toObject ? logDoc.toObject() : logDoc;

    // 2. Broadcast via Socket.IO for live timeline rendering
    emitExecutionEvent(executionId, {
      id: logObj._id || logObj.id,
      executionId,
      workflowId,
      nodeId,
      agent,
      level,
      eventType,
      message,
      metadata,
      createdAt: logObj.createdAt || new Date().toISOString(),
    });

    return logObj;
  }
}

module.exports = new MonitoringAgent();
