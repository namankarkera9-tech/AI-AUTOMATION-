const BaseIntegration = require('./baseIntegration');
const config = require('../config/env');
const ApiError = require('../utils/apiError');
const axios = require('axios');

class GoogleSheetsIntegration extends BaseIntegration {
  constructor() {
    super('google-sheets', 'Google Sheets');
  }

  getAuthUrl(state) {
    const clientId = config.integrations.googleSheets.clientId;
    const redirectUri = config.integrations.googleSheets.redirectUri;
    if (!clientId) throw new Error('Google Sheets OAuth is not configured');
    const scopes = encodeURIComponent(
      'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email'
    );

    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${scopes}&access_type=offline&prompt=consent&state=${state}`;
  }

  async handleOAuthCallback(code) {
    const { clientId, clientSecret, redirectUri } = config.integrations.googleSheets;
    if (!clientId || !clientSecret) throw new Error('Google Sheets OAuth is not configured');

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
      };
    } catch (err) {
      throw new Error(`Google Sheets OAuth exchange failed: ${err.message}`);
    }
  }

  async refreshAccessToken(refreshToken) {
    const { clientId, clientSecret } = config.integrations.googleSheets;
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
    await axios.get('https://www.googleapis.com/drive/v3/about', {
      params: { fields: 'user' },
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });
    return { status: 'healthy', provider: 'google-sheets', connected: true };
  }

  async executeAction(actionName, params = {}, credentials = {}) {
    this.assertConnected(credentials);

    switch (actionName) {
      case 'append_row': {
        const { spreadsheetId, range, values = [] } = params;
        if (!spreadsheetId || !range) throw ApiError.badRequest('spreadsheetId and range are required');
        const rowData = Array.isArray(values) ? values : [values];
        const response = await axios.post(
          `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append`,
          { values: rowData },
          { params: { valueInputOption: 'USER_ENTERED', insertDataOption: 'INSERT_ROWS' }, headers: { Authorization: `Bearer ${credentials.accessToken}` } }
        );
        return { appended: true, spreadsheetId, updatedRange: response.data.updates?.updatedRange, rowsInserted: response.data.updates?.updatedRows || 0 };
      }

      case 'read_range': {
        const { spreadsheetId, range } = params;
        if (!spreadsheetId || !range) throw ApiError.badRequest('spreadsheetId and range are required');
        const response = await axios.get(
          `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`,
          { headers: { Authorization: `Bearer ${credentials.accessToken}` } }
        );
        return { spreadsheetId, range, rows: response.data.values || [] };
      }

      default:
        throw ApiError.badRequest(`Unknown Google Sheets action: ${actionName}`);
    }
  }
}

module.exports = new GoogleSheetsIntegration();
