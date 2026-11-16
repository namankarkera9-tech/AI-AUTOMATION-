const { Schema } = require('mongoose');
const { createModel } = require('./modelAdapter');

const executionLogSchema = new Schema(
  {
    executionId: {
      type: Schema.Types.Mixed,
      ref: 'Execution',
      required: true,
      index: true,
    },
    workflowId: {
      type: Schema.Types.Mixed,
      ref: 'Workflow',
      required: true,
      index: true,
    },
    nodeId: {
      type: String,
      default: null,
    },
    agent: {
      type: String,
      enum: ['planner', 'execution', 'validation', 'recovery', 'monitoring'],
      required: true,
      index: true,
    },
    level: {
      type: String,
      enum: ['info', 'warning', 'error', 'success'],
      default: 'info',
    },
    eventType: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const ExecutionLog = createModel('ExecutionLog', executionLogSchema);

module.exports = ExecutionLog;
