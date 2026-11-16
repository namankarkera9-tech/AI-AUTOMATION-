const dotenv = require('dotenv');
const path = require('path');
const crypto = require('crypto');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProduction = process.env.NODE_ENV === 'production';
const developmentJwtSecret = crypto.randomBytes(48).toString('hex');
const developmentEncryptionKey = crypto.randomBytes(32).toString('hex');

const config = {
  port: parseInt(process.env.PORT, 10) || 5001,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/agentflow_ai',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  jwt: {
    secret: process.env.JWT_SECRET || (isProduction ? '' : developmentJwtSecret),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  encryptionKey: process.env.CREDENTIAL_ENCRYPTION_KEY || (isProduction ? '' : developmentEncryptionKey),
  
  ai: {
    openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
  },
  
  integrations: {
    gmail: {
      clientId: process.env.GMAIL_CLIENT_ID || '',
      clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
      redirectUri: process.env.GMAIL_REDIRECT_URI || 'http://localhost:5001/api/integrations/oauth/gmail/callback',
    },
    slack: {
      clientId: process.env.SLACK_CLIENT_ID || '',
      clientSecret: process.env.SLACK_CLIENT_SECRET || '',
      signingSecret: process.env.SLACK_SIGNING_SECRET || '',
      redirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:5001/api/integrations/oauth/slack/callback',
    },
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID || '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
      botToken: process.env.DISCORD_BOT_TOKEN || '',
      redirectUri: process.env.DISCORD_REDIRECT_URI || 'http://localhost:5001/api/integrations/oauth/discord/callback',
    },
    googleSheets: {
      clientId: process.env.GOOGLE_SHEETS_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_SHEETS_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_SHEETS_REDIRECT_URI || 'http://localhost:5001/api/integrations/oauth/google-sheets/callback',
    },
  },
};

module.exports = config;
