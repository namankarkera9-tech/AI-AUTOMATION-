const express = require('express');
const { body, param } = require('express-validator');
const integrationController = require('../controllers/integrationController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// OAuth callback is public because provider redirects back to it
router.post('/slack/events', integrationController.handleSlackEvent);
router.get('/oauth/:provider/callback', integrationController.handleOAuthCallback);
router.get('/oauth/error', integrationController.oauthError);

// Protected routes
router.use(authenticate);

router.get('/', integrationController.listIntegrations);
router.get('/status', integrationController.getIntegrationStatus);
router.get('/oauth/:provider/start', [param('provider').isIn(['gmail', 'slack', 'discord', 'google-sheets']), validate], integrationController.startOAuth);
router.post('/:provider/test', [param('provider').isIn(['gmail', 'slack', 'discord', 'google-sheets']), validate], integrationController.testIntegration);
router.patch('/:provider/enabled', [param('provider').isIn(['gmail', 'slack', 'discord', 'google-sheets']), body('enabled').isBoolean(), validate], integrationController.setIntegrationEnabled);

router.post(
  '/',
  [
    body('provider')
      .isIn(['gmail', 'slack', 'google-sheets', 'discord', 'openrouter', 'gemini'])
      .withMessage('Valid provider is required'),
    validate,
  ],
  integrationController.saveIntegration
);

module.exports = router;
