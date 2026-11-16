const ApiError = require('../utils/apiError');

class BaseIntegration {
  constructor(providerName, displayName) {
    this.providerName = providerName;
    this.displayName = displayName;
  }

  getAuthUrl(state) {
    throw new Error('getAuthUrl must be implemented by subclass');
  }

  async handleOAuthCallback(code) {
    throw new Error('handleOAuthCallback must be implemented by subclass');
  }

  async testConnection(credentials) {
    throw new Error('testConnection must be implemented by subclass');
  }

  async executeAction(actionName, params, credentials) {
    throw new Error('executeAction must be implemented by subclass');
  }

  async refreshAccessToken(refreshToken) {
    throw new Error('refreshAccessToken must be implemented by subclass');
  }

  assertConnected(credentials) {
    if (!credentials || (!credentials.accessToken && !credentials.botToken && !credentials.apiKey)) {
      throw ApiError.integrationNotConnected(this.displayName || this.providerName);
    }
  }
}

module.exports = BaseIntegration;
