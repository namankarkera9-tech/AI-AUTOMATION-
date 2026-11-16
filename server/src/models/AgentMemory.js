const { Schema } = require('mongoose');
const { createModel } = require('./modelAdapter');

const agentMemorySchema = new Schema(
  {
    workflowId: {
      type: Schema.Types.Mixed,
      ref: 'Workflow',
      required: true,
      index: true,
    },
    executionId: {
      type: Schema.Types.Mixed,
      ref: 'Execution',
      required: true,
      index: true,
    },
    agent: {
      type: String,
      required: true,
      index: true,
    },
    key: {
      type: String,
      required: true,
    },
    value: {
      type: Schema.Types.Mixed,
      default: null,
    },
    confidence: {
      type: Number,
      default: 1.0,
    },
  },
  {
    timestamps: true,
  }
);

const AgentMemory = createModel('AgentMemory', agentMemorySchema);

module.exports = AgentMemory;
