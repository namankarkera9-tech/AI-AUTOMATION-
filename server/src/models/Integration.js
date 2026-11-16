const { Schema } = require('mongoose');
const { createModel } = require('./modelAdapter');

const integrationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.Mixed,
      ref: 'User',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['gmail', 'slack', 'google-sheets', 'discord', 'openrouter', 'gemini'],
      required: true,
    },
    status: {
      type: String,
      enum: ['connected', 'disconnected', 'expired', 'error'],
      default: 'disconnected',
      index: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    accountEmail: {
      type: String,
      default: '',
    },
    scopes: {
      type: [String],
      default: [],
    },
    encryptedAccessToken: {
      type: String,
      default: null,
      select: false,
    },
    encryptedRefreshToken: {
      type: String,
      default: null,
      select: false,
    },
    tokenExpiresAt: {
      type: Date,
      default: null,
    },
    lastError: {
      type: String,
      default: null,
    },
    config: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const Integration = createModel('Integration', integrationSchema);

module.exports = Integration;
