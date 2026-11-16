const { Schema } = require('mongoose');
const { createModel } = require('./modelAdapter');

const executionSchema = new Schema(
  {
    workflowId: {
      type: Schema.Types.Mixed,
      ref: 'Workflow',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.Mixed,
      ref: 'User',
      required: true,
      index: true,
    },
    workflowSnapshot: {
      type: Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'RETRYING', 'PAUSED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    currentNodeId: {
      type: String,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number, // in ms
      default: 0,
    },
    input: {
      type: Schema.Types.Mixed,
      default: {},
    },
    output: {
      type: Schema.Types.Mixed,
      default: {},
    },
    error: {
      type: Schema.Types.Mixed,
      default: null,
    },
    retryCount: {
      type: Number,
      default: 0,
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

const Execution = createModel('Execution', executionSchema);

module.exports = Execution;
