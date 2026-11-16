const BaseIntegration = require('./baseIntegration');
const config = require('../config/env');
const ApiError = require('../utils/apiError');
const axios = require('axios');

class SlackIntegration extends BaseIntegration {
  constructor() {
    super('slack', 'Slack');
  }

  getAuthUrl(state) {
    const clientId = config.integrations.slack.clientId;
    const redirectUri = config.integrations.slack.redirectUri;
    if (!clientId) throw new Error('Slack OAuth is not configured');
    const scopes = encodeURIComponent('chat:write,channels:read,users:read');

    return `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&state=${state}`;
  }

  async handleOAuthCallback(code) {
    const { clientId, clientSecret, redirectUri } = config.integrations.slack;
    if (!clientId || !clientSecret) throw new Error('Slack OAuth is not configured');

    try {
      const response = await axios.post(
        'https://slack.com/api/oauth.v2.access',
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      if (!response.data.ok) {
        throw new Error(response.data.error || 'Slack OAuth failed');
      }

      return {
        accessToken: response.data.access_token,
        teamName: response.data.team?.name,
        teamId: response.data.team?.id,
        scopes: (response.data.scope || '').split(','),
      };
    } catch (err) {
      throw new Error(`Slack OAuth exchange failed: ${err.message}`);
    }
  }

  async refreshAccessToken(refreshToken) {
    const { clientId, clientSecret } = config.integrations.slack;
    const response = await axios.post('https://slack.com/api/oauth.v2.access', new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    if (!response.data.ok) throw new Error(`Slack token refresh failed: ${response.data.error}`);
    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || refreshToken,
      expiresIn: response.data.expires_in,
    };
  }

  async testConnection(credentials) {
    this.assertConnected(credentials);
    const response = await axios.post('https://slack.com/api/auth.test', {}, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });
    if (!response.data.ok) throw new Error(`Slack connection failed: ${response.data.error}`);
    return { status: 'healthy', provider: 'slack', connected: true };
  }

  async executeAction(actionName, params = {}, credentials = {}) {
    this.assertConnected(credentials);

    switch (actionName) {
      case 'post_message': {
        const { channel = '#general', message = '' } = params;
        if (!message) throw ApiError.badRequest('Message content is required');

        const response = await axios.post('https://slack.com/api/chat.postMessage', { channel, text: message }, {
          headers: { Authorization: `Bearer ${credentials.accessToken}` },
        });
        if (!response.data.ok) throw new Error(`Slack message failed: ${response.data.error}`);
        return { delivered: true, channel: response.data.channel, ts: response.data.ts, message };
      }

      case 'list_channels': {
        const response = await axios.get('https://slack.com/api/conversations.list', {
          params: { limit: 200 },
          headers: { Authorization: `Bearer ${credentials.accessToken}` },
        });
        if (!response.data.ok) throw new Error(`Slack channel listing failed: ${response.data.error}`);
        return { channels: response.data.channels || [] };
      }

      default:
        throw ApiError.badRequest(`Unknown Slack action: ${actionName}`);
    }
  }
}

module.exports = new SlackIntegration();
