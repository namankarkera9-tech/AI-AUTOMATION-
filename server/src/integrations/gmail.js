const BaseIntegration = require('./baseIntegration');
const config = require('../config/env');
const ApiError = require('../utils/apiError');
const axios = require('axios');

class GmailIntegration extends BaseIntegration {
  constructor() {
    super('gmail', 'Gmail');
  }

  getAuthUrl(state) {
    const clientId = config.integrations.gmail.clientId;
    const redirectUri = config.integrations.gmail.redirectUri;
    if (!clientId) throw new Error('Gmail OAuth is not configured');
    const scopes = encodeURIComponent(
      'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email'
    );

    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${scopes}&access_type=offline&prompt=consent&state=${state}`;
  }

  async handleOAuthCallback(code) {
    const { clientId, clientSecret, redirectUri } = config.integrations.gmail;
    if (!clientId || !clientSecret) throw new Error('Gmail OAuth is not configured');

    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
        scopes: (response.data.scope || '').split(' '),
        accountEmail: (await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${response.data.access_token}` },
        })).data.email,
      };
    } catch (err) {
      throw new Error(`Gmail OAuth exchange failed: ${err.response?.data?.error_description || err.message}`);
    }
  }

  async refreshAccessToken(refreshToken) {
    const { clientId, clientSecret } = config.integrations.gmail;
    const response = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    return { accessToken: response.data.access_token, refreshToken, expiresIn: response.data.expires_in };
  }

  async testConnection(credentials) {
    this.assertConnected(credentials);
    await axios.get('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });
    return { status: 'healthy', provider: 'gmail', connected: true };
  }

  async executeAction(actionName, params = {}, credentials = {}) {
    this.assertConnected(credentials);

    switch (actionName) {
      case 'send_email': {
        const { to, subject, body } = params;
        if (!to) throw ApiError.badRequest('Recipient email (to) is required');
        if (!subject || !body) throw ApiError.badRequest('Email subject and body are required');
        const rawMessage = [
          `To: ${to}`,
          `Subject: ${subject}`,
          'MIME-Version: 1.0',
          'Content-Type: text/plain; charset=UTF-8',
          '',
          body,
        ].join('\r\n');
        const raw = Buffer.from(rawMessage).toString('base64url');
        const response = await axios.post('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { raw }, {
          headers: { Authorization: `Bearer ${credentials.accessToken}` },
        });
        return { delivered: true, messageId: response.data.id, recipient: to, subject };
      }

      case 'read_emails': {
        const { query = 'is:unread', maxResults = 5 } = params;
        const response = await axios.get('https://gmail.googleapis.com/gmail/v1/users/me/messages', {
          params: { q: query, maxResults: Math.min(Number(maxResults) || 5, 100) },
          headers: { Authorization: `Bearer ${credentials.accessToken}` },
        });
        const messages = await Promise.all((response.data.messages || []).map(async ({ id }) => {
          const item = await axios.get(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`, {
            params: { format: 'metadata', metadataHeaders: ['Subject', 'From', 'Date'] },
            headers: { Authorization: `Bearer ${credentials.accessToken}` },
          });
          const headers = item.data.payload?.headers || [];
          const getHeader = (name) => headers.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value;
          return { id, subject: getHeader('Subject'), from: getHeader('From'), date: getHeader('Date'), snippet: item.data.snippet };
        }));
        return { messages, total: response.data.resultSizeEstimate || messages.length };
      }

      default:
        throw ApiError.badRequest(`Unknown Gmail action: ${actionName}`);
    }
  }
}

module.exports = new GmailIntegration();
