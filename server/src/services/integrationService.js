const Integration = require('../models/Integration');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/env');
const { encrypt, decrypt } = require('../utils/crypto');
const ApiError = require('../utils/apiError');
const gmail = require('../integrations/gmail');
const slack = require('../integrations/slack');
const discord = require('../integrations/discord');
const googleSheets = require('../integrations/googleSheets');

const providers = {
  gmail,
  slack,
  discord,
  'google-sheets': googleSheets,
};
const pendingOAuthStates = new Map();

class IntegrationService {
  getProviderHandler(provider) {
    const handler = providers[provider];
    if (!handler) {
      throw ApiError.badRequest(`Unsupported integration provider: ${provider}`);
    }
    return handler;
  }

  async listIntegrations(userId) {
    const list = await Integration.find({ userId });
    const recordsByProvider = {};
    for (const record of list) {
      recordsByProvider[record.provider] = record;
    }

    const availableProviders = [
      { id: 'gmail', name: 'Gmail', description: 'Read and send emails, parse messages, auto-reply to customers' },
      { id: 'slack', name: 'Slack', description: 'Post alerts, interact with channels, send thread notifications' },
      { id: 'discord', name: 'Discord', description: 'Broadcast announcements to ops channels via bot webhook' },
      { id: 'google-sheets', name: 'Google Sheets', description: 'Log rows, sync metrics, read tabular data live' },
    ];

    return availableProviders.map((p) => {
      const rec = recordsByProvider[p.id];
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        status: rec ? rec.status : 'disconnected',
        enabled: rec ? rec.enabled !== false : true,
        accountEmail: rec ? rec.accountEmail : null,
        scopes: rec ? rec.scopes : [],
        lastError: rec ? rec.lastError : null,
        updatedAt: rec ? rec.updatedAt : null,
      };
    });
  }

  async getIntegrationStatus(userId) {
    const integrations = await this.listIntegrations(userId);
    const summary = {
      total: integrations.length,
      connected: integrations.filter((i) => i.status === 'connected').length,
      disconnected: integrations.filter((i) => i.status === 'disconnected').length,
      error: integrations.filter((i) => i.status === 'error').length,
      providers: integrations,
    };
    return summary;
  }

  getOAuthStartUrl(provider, userId) {
    const handler = this.getProviderHandler(provider);
    for (const [nonce, expiry] of pendingOAuthStates.entries()) {
      if (expiry < Date.now()) pendingOAuthStates.delete(nonce);
    }
    const nonce = crypto.randomBytes(24).toString('hex');
    pendingOAuthStates.set(nonce, Date.now() + 10 * 60 * 1000);
    const state = jwt.sign({ userId: String(userId), provider, nonce }, config.jwt.secret, { expiresIn: '10m' });
    return handler.getAuthUrl(state);
  }

  async handleOAuthCallback(provider, code, state) {
    const handler = this.getProviderHandler(provider);
    if (!code || !state) throw ApiError.badRequest('OAuth code and state are required', 'INVALID_OAUTH_STATE');
    let decoded;
    try {
      decoded = jwt.verify(state, config.jwt.secret);
    } catch {
      throw ApiError.badRequest('OAuth state is invalid or expired', 'INVALID_OAUTH_STATE');
    }
    const stateExpiresAt = pendingOAuthStates.get(decoded.nonce);
    if (!stateExpiresAt || stateExpiresAt < Date.now() || decoded.provider !== provider || !decoded.userId) {
      pendingOAuthStates.delete(decoded.nonce);
      throw ApiError.badRequest('OAuth state is invalid, expired, or already used', 'INVALID_OAUTH_STATE');
    }
    pendingOAuthStates.delete(decoded.nonce);
    const userId = decoded.userId;

    const tokenData = await handler.handleOAuthCallback(code);

    const encryptedAccessToken = tokenData.accessToken ? encrypt(tokenData.accessToken) : null;
    const encryptedRefreshToken = tokenData.refreshToken ? encrypt(tokenData.refreshToken) : null;
    const expiresAt = tokenData.expiresIn ? new Date(Date.now() + tokenData.expiresIn * 1000) : null;

    // Check if record exists
    let existing = await Integration.findOne({ userId, provider });
    if (existing) {
      existing = await Integration.findByIdAndUpdate(
        existing._id || existing.id,
        {
          status: 'connected',
          accountEmail: tokenData.accountEmail || tokenData.teamName || existing.accountEmail || '',
          scopes: tokenData.scopes || existing.scopes,
          encryptedAccessToken,
          encryptedRefreshToken,
          tokenExpiresAt: expiresAt,
          lastError: null,
          config: tokenData.teamName || tokenData.teamId ? { ...existing.config, teamName: tokenData.teamName, teamId: tokenData.teamId } : existing.config,
        },
        { new: true }
      );
    } else {
      existing = await Integration.create({
        userId,
        provider,
        status: 'connected',
        accountEmail: tokenData.accountEmail || tokenData.teamName || '',
        scopes: tokenData.scopes || [],
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenExpiresAt: expiresAt,
        config: tokenData.teamName || tokenData.teamId ? { teamName: tokenData.teamName, teamId: tokenData.teamId } : {},
      });
    }

    return existing;
  }

  async saveIntegrationConfig(userId, provider, { apiKey, botToken, status = 'connected', accountEmail = '' }) {
    const handler = this.getProviderHandler(provider);

    const tokenToSave = botToken || apiKey;
    if (!tokenToSave) throw ApiError.badRequest('A real provider credential is required', 'CREDENTIAL_REQUIRED');
    const encryptedAccessToken = encrypt(tokenToSave);

    let existing = await Integration.findOne({ userId, provider });
    if (existing) {
      return Integration.findByIdAndUpdate(
        existing._id || existing.id,
        {
          status: 'connected',
          accountEmail: accountEmail || `${provider}@agentflow.local`,
          encryptedAccessToken,
          lastError: null,
        },
        { new: true }
      );
    }

    return Integration.create({
      userId,
      provider,
      status: 'connected',
      accountEmail: accountEmail || `${provider}@agentflow.local`,
      encryptedAccessToken,
    });
  }

  async getDecryptedCredentials(userId, provider) {
    const integration = await Integration.findOne({ userId, provider }, {
      status: 1,
      tokenExpiresAt: 1,
      enabled: 1,
      encryptedAccessToken: 1,
      encryptedRefreshToken: 1,
      config: 1,
    });
    if (!integration || integration.status !== 'connected' || integration.enabled === false) {
      throw ApiError.integrationNotConnected(provider);
    }

    let accessToken = null;
    let refreshToken = null;

    if (integration.encryptedAccessToken) {
      try {
        accessToken = decrypt(integration.encryptedAccessToken);
      } catch (err) {
        throw ApiError.authExpired(provider);
      }
    }

    if (integration.encryptedRefreshToken) {
      try {
        refreshToken = decrypt(integration.encryptedRefreshToken);
      } catch (err) {
        // ignore
      }
    }

    if (integration.tokenExpiresAt && new Date() > new Date(integration.tokenExpiresAt)) {
      if (!refreshToken) throw ApiError.authExpired(provider);
      try {
        const refreshed = await this.getProviderHandler(provider).refreshAccessToken(refreshToken);
        accessToken = refreshed.accessToken;
        refreshToken = refreshed.refreshToken || refreshToken;
        await Integration.findByIdAndUpdate(integration._id || integration.id, {
          encryptedAccessToken: encrypt(accessToken),
          encryptedRefreshToken: encrypt(refreshToken),
          tokenExpiresAt: refreshed.expiresIn ? new Date(Date.now() + refreshed.expiresIn * 1000) : null,
          status: 'connected',
          lastError: null,
        }, { new: true });
      } catch {
        await Integration.findByIdAndUpdate(integration._id || integration.id, {
          status: 'expired',
          lastError: 'Token refresh failed; reconnect required',
        }, { new: true });
        throw ApiError.authExpired(provider);
      }
    }

    return {
      accessToken,
      refreshToken,
      botToken: provider === 'discord' ? config.integrations.discord.botToken || undefined : undefined,
      config: integration.config,
    };
  }

  async testIntegration(userId, provider) {
    const handler = this.getProviderHandler(provider);
    const credentials = await this.getDecryptedCredentials(userId, provider);
    try {
      return await handler.testConnection(credentials);
    } catch (error) {
      if (error.response?.status === 401) throw ApiError.authExpired(provider);
      if (error.response?.status === 429) {
        const rateLimitError = new ApiError(429, `Provider ${provider} rate limit exceeded`, 'RATE_LIMIT');
        throw rateLimitError;
      }
      throw error;
    }
  }

  async setIntegrationEnabled(userId, provider, enabled) {
    this.getProviderHandler(provider);
    const integration = await Integration.findOne({ userId, provider });
    if (!integration) throw ApiError.notFound(`Integration ${provider} is not configured`);
    return Integration.findByIdAndUpdate(integration._id || integration.id, { enabled: Boolean(enabled) }, { new: true });
  }

  async handleSlackEvent(payload) {
    const event = payload.event || {};
    const teamId = payload.team_id || payload.team?.id;
    const integrationsForTeam = await Integration.find({ provider: 'slack', status: 'connected', enabled: true });
    const teamIntegration = integrationsForTeam.find((integration) => integration.config?.teamId === teamId);
    if (!teamIntegration || !teamId) return { accepted: true, matchedWorkflows: 0 };

    const Workflow = require('../models/Workflow');
    const workflowQueue = require('../queues/workflowQueue');
    const userId = String(teamIntegration.userId);
    const workflows = await Workflow.find({ owner: userId, status: 'active' });
    const matchingWorkflows = workflows.filter((workflow) =>
      workflow.trigger?.type === 'event' &&
      workflow.trigger?.config?.provider === 'slack' &&
      (!workflow.trigger.config.event || workflow.trigger.config.event === event.type)
    );

    const workflowService = require('./workflowService');
    const runnableWorkflows = matchingWorkflows.filter((workflow) => workflowService.validateGraph(workflow).valid);
    await Promise.all(runnableWorkflows.map((workflow) => workflowQueue.dispatchWorkflow(workflow, {
      provider: 'slack',
      event: payload.event,
      eventId: payload.event_id,
      teamId,
    }, userId)));
    return { accepted: true, matchedWorkflows: runnableWorkflows.length };
  }

  async executeIntegrationAction(userId, provider, action, params) {
    const handler = this.getProviderHandler(provider);
    const credentials = await this.getDecryptedCredentials(userId, provider);
    try {
      return await handler.executeAction(action, params, credentials);
    } catch (error) {
      if (error.response?.status === 401) throw ApiError.authExpired(provider);
      if (error.response?.status === 429) {
        throw new ApiError(429, `Provider ${provider} rate limit exceeded`, 'RATE_LIMIT');
      }
      throw error;
    }
  }
}

module.exports = new IntegrationService();
