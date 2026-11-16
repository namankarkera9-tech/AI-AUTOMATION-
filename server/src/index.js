const http = require('http');
const app = require('./app');
const config = require('./config/env');
const { connectDB } = require('./config/db');
const { initSocket } = require('./config/socket');
const { initRedis } = require('./queues/redis');
const { initExecutionQueue } = require('./queues/executionQueue');

const server = http.createServer(app);

// Initialize Socket.IO real-time engine
initSocket(server);

const startServer = async () => {
  try {
    if (config.nodeEnv === 'production' && (config.jwt.secret.length < 32 || !/^[a-f0-9]{64}$/i.test(config.encryptionKey))) {
      throw new Error('Production requires JWT_SECRET (at least 32 characters) and CREDENTIAL_ENCRYPTION_KEY (64 hex characters).');
    }
    if (config.nodeEnv !== 'production' && (!process.env.JWT_SECRET || !process.env.CREDENTIAL_ENCRYPTION_KEY)) {
      console.warn('[Security] Using ephemeral development secrets. Configure JWT_SECRET and CREDENTIAL_ENCRYPTION_KEY for persistent local credentials.');
    }

    // 1. Connect DB (falls back to memory store seamlessly if Mongo is offline)
    await connectDB();

    // 2. Initialize Redis (falls back to in-memory queues seamlessly if Redis is offline)
    initRedis();

    // 3. Initialize background execution queue
    initExecutionQueue();

    // 4. Start HTTP Server
    server.listen(config.port, () => {
      console.log('====================================================');
      console.log(`🚀 Agentflow_AI Server running on port ${config.port}`);
      console.log(`🌐 Environment: ${config.nodeEnv}`);
      console.log(`🔗 API Base: http://localhost:${config.port}/api`);
      console.log(`⚡ WebSocket Server: active on port ${config.port}`);
      console.log('====================================================');
    });
  } catch (error) {
    console.error('Fatal error during server startup:', error);
    process.exit(1);
  }
};

// Graceful termination handling
const handleShutdown = (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP and WebSocket servers closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

startServer();
