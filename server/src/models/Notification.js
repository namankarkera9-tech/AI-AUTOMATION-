const { Schema } = require('mongoose');
const { createModel } = require('./modelAdapter');

const notificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.Mixed,
      ref: 'User',
      required: true,
      index: true,
    },
    workflowId: {
      type: Schema.Types.Mixed,
      ref: 'Workflow',
      default: null,
    },
    executionId: {
      type: Schema.Types.Mixed,
      ref: 'Execution',
      default: null,
    },
    type: {
      type: String,
      enum: ['info', 'success', 'warning', 'error', 'escalation'],
      default: 'info',
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
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

const Notification = createModel('Notification', notificationSchema);

module.exports = Notification;
