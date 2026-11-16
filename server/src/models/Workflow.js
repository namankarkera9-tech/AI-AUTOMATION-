const { Schema } = require('mongoose');
const { createModel } = require('./modelAdapter');

const workflowSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Workflow name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    owner: {
      type: Schema.Types.Mixed, // allows ObjectId or String ID
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'archived'],
      default: 'draft',
      index: true,
    },
    trigger: {
      type: {
        type: String,
        enum: ['manual', 'webhook', 'schedule', 'event'],
        default: 'manual',
      },
      config: {
        type: Schema.Types.Mixed,
        default: {},
      },
    },
    nodes: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    edges: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    version: {
      type: Number,
      default: 1,
    },
    versions: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    executionHistory: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    lastExecutedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Workflow = createModel('Workflow', workflowSchema);

module.exports = Workflow;
