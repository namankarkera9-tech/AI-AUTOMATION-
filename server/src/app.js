const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const { helmetMiddleware, corsOptions } = require('./middleware/security');
const errorHandler = require('./middleware/errorHandler');
const ApiError = require('./utils/apiError');
const config = require('./config/env');
const { isMongoConnected } = require('./config/db');

// Route imports
const authRoutes = require('./routes/authRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const executionRoutes = require('./routes/executionRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Security and utility middlewares
app.use(helmetMiddleware);
app.use(cors(corsOptions));
app.use(compression());
if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buffer) => { req.rawBody = Buffer.from(buffer); },
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Heartbeat & Health Check Endpoint
app.get('/api/health', (req, res) => {
  const uptimeSeconds = process.uptime();
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptimeSeconds / 60)}m ${Math.floor(uptimeSeconds % 60)}s`,
    environment: config.nodeEnv,
    services: {
      database: isMongoConnected() ? 'mongodb-connected' : 'in-memory-active',
      queueEngine: 'bullmq-or-fallback-ready',
      socketServer: 'active',
      orchestration: 'multi-agent-v1',
    },
    security: {
      jwtSecretConfigured: Boolean(process.env.JWT_SECRET),
      credentialEncryptionKeyConfigured: Boolean(process.env.CREDENTIAL_ENCRYPTION_KEY),
      helmetEnabled: true,
      corsRestricted: true,
    },
    aiProviders: {
      openrouterConfigured: Boolean(config.ai.openrouterApiKey),
      geminiConfigured: Boolean(config.ai.geminiApiKey),
    },
    version: '1.0.0',
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/executions', executionRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/notifications', notificationRoutes);

// Catch-all 404 handler
app.use((req, res, next) => {
  next(ApiError.notFound(`Cannot ${req.method} ${req.originalUrl}`));
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
