const BaseIntegration = require('./baseIntegration');
const config = require('../config/env');
const ApiError = require('../utils/apiError');
const axios = require('axios');

class DiscordIntegration extends BaseIntegration {
  constructor() {
    super('discord', 'Discord');
  }

  getAuthUrl(state) {
    const clientId = config.integrations.discord.clientId;
    const redirectUri = config.integrations.discord.redirectUri;
    if (!clientId) throw new Error('Discord OAuth is not configured');

    return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=bot%20messages.read&permissions=2048&state=${state}`;
  }

  async handleOAuthCallback(code) {
    const { clientId, clientSecret, redirectUri, botToken } = config.integrations.discord;
    if (!clientId || !clientSecret) throw new Error('Discord OAuth is not configured');

    try {
      const response = await axios.post(
        'https://discord.com/api/oauth2/token',
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
        scopes: (response.data.scope || '').split(' '),
      };
    } catch (err) {
      throw new Error(`Discord OAuth exchange failed: ${err.message}`);
    }
  }

  async refreshAccessToken(refreshToken) {
    const { clientId, clientSecret } = config.integrations.discord;
    const response = await axios.post('https://discord.com/api/v10/oauth2/token', new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token || refreshToken,
      expiresIn: response.data.expires_in,
    };
  }

  async testConnection(credentials) {
    this.assertConnected(credentials);
    const token = credentials.botToken || config.integrations.discord.botToken;
    if (!token) throw ApiError.integrationNotConnected('Discord bot token');
    await axios.get('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bot ${token}` },
    });
    return { status: 'healthy', provider: 'discord', connected: true };
  }

  async executeAction(actionName, params = {}, credentials = {}) {
    this.assertConnected(credentials);

    switch (actionName) {
      case 'post_message': {
        const { channelId, content = '' } = params;
        if (!content) throw ApiError.badRequest('Discord message content is required');
        if (!channelId) throw ApiError.badRequest('Discord channelId is required');
        const token = credentials.botToken || config.integrations.discord.botToken;
        if (!token) throw ApiError.integrationNotConnected('Discord bot token');
        const response = await axios.post(`https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}/messages`, { content }, {
          headers: { Authorization: `Bot ${token}` },
        });
        return { delivered: true, channelId, messageId: response.data.id, content };
      }

      case 'get_guild_info': {
        throw ApiError.badRequest('Discord guild lookup is not available; configure a bot and use post_message');
      }

      default:
        throw ApiError.badRequest(`Unknown Discord action: ${actionName}`);
    }
  }
}

module.exports = new DiscordIntegration();
