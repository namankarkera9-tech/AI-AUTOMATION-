const integrationService = require('../services/integrationService');
const asyncHandler = require('../utils/asyncHandler');
const config = require('../config/env');
const crypto = require('crypto');

const listIntegrations = asyncHandler(async (req, res) => {
  const integrations = await integrationService.listIntegrations(req.user.id);
  res.status(200).json({
    success: true,
    data: { integrations },
  });
});

const getIntegrationStatus = asyncHandler(async (req, res) => {
  const status = await integrationService.getIntegrationStatus(req.user.id);
  res.status(200).json({
    success: true,
    data: { status },
  });
});

const startOAuth = asyncHandler(async (req, res) => {
  const { provider } = req.params;
  const redirectUrl = integrationService.getOAuthStartUrl(provider, req.user.id);
  res.status(200).json({
    success: true,
    data: { redirectUrl },
  });
});

const handleOAuthCallback = asyncHandler(async (req, res) => {
  const { provider } = req.params;
  const { code, state } = req.query;

  if (!['gmail', 'slack', 'discord', 'google-sheets'].includes(provider)) {
    return res.redirect(`${config.clientUrl}/integrations?error=${encodeURIComponent('Unsupported OAuth provider')}`);
  }

  try {
    await integrationService.handleOAuthCallback(provider, code, state);
    // Redirect user back to the client integrations page with a success message
    res.redirect(`${config.clientUrl}/integrations?connected=${provider}`);
  } catch (error) {
    res.redirect(
      `${config.clientUrl}/integrations?error=${encodeURIComponent(error.message)}&provider=${provider}`
    );
  }
});

const oauthError = asyncHandler(async (req, res) => {
  const { provider, error } = req.query;
  res.status(400).json({
    success: false,
    error: {
      code: 'OAUTH_AUTHENTICATION_FAILED',
      message: error || 'OAuth authentication encountered an error',
      provider: provider || 'unknown',
    },
  });
});

const saveIntegration = asyncHandler(async (req, res) => {
  const { provider, apiKey, botToken, status, accountEmail } = req.body;
  const saved = await integrationService.saveIntegrationConfig(req.user.id, provider, {
    apiKey,
    botToken,
    status,
    accountEmail,
  });

  res.status(200).json({
    success: true,
    message: `${provider} configuration saved successfully`,
    data: { integration: saved },
  });
});

const testIntegration = asyncHandler(async (req, res) => {
  const result = await integrationService.testIntegration(req.user.id, req.params.provider);
  res.status(200).json({ success: true, data: { result } });
});

const setIntegrationEnabled = asyncHandler(async (req, res) => {
  const integration = await integrationService.setIntegrationEnabled(req.user.id, req.params.provider, req.body.enabled);
  res.status(200).json({ success: true, data: { integration } });
});

const handleSlackEvent = asyncHandler(async (req, res) => {
  const timestamp = req.get('x-slack-request-timestamp');
  const signature = req.get('x-slack-signature');
  const signingSecret = config.integrations.slack.signingSecret;
  if (!signingSecret) return res.status(503).json({ error: 'Slack Events API is not configured' });
  if (!timestamp || Math.abs(Date.now() / 1000 - Number(timestamp)) > 60 * 5 || !signature || !req.rawBody) {
    return res.status(401).json({ error: 'Invalid Slack request signature' });
  }
  const base = `v0:${timestamp}:${req.rawBody.toString('utf8')}`;
  const expected = `v0=${crypto.createHmac('sha256', signingSecret).update(base).digest('hex')}`;
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
    return res.status(401).json({ error: 'Invalid Slack request signature' });
  }
  const payload = req.body;
  if (payload.type === 'url_verification') return res.status(200).json({ challenge: payload.challenge });
  if (payload.type === 'event_callback') {
    await integrationService.handleSlackEvent(payload);
    return res.status(200).json({ ok: true });
  }
  return res.status(200).json({ ok: true });
});

module.exports = {
  listIntegrations,
  getIntegrationStatus,
  startOAuth,
  handleOAuthCallback,
  oauthError,
  saveIntegration,
  testIntegration,
  setIntegrationEnabled,
  handleSlackEvent,
};
