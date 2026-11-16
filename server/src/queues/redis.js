const Redis = require('ioredis');
const config = require('../config/env');

let redisClient = null;
let isRedisAvailable = false;

const initRedis = () => {
  try {
    const client = new Redis(config.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      connectTimeout: 2000,
      retryStrategy(times) {
        if (times > 2) {
          return null; // Stop reconnecting and let fallback take over
        }
        return 1000;
      },
    });

    client.on('ready', () => {
      isRedisAvailable = true;
      console.log('[Queue] Redis Connected for BullMQ background queues.');
      // Redis can become ready after the server selected the in-memory fallback.
      require('./executionQueue').initExecutionQueue();
    });

    client.on('error', (err) => {
      isRedisAvailable = false;
      // Suppress repeated connection logs once fallback is active
    });

    redisClient = client;
    return client;
  } catch (error) {
    isRedisAvailable = false;
    console.warn(`[Queue] Redis connection failed: ${error.message}. Active fallback: In-Memory Queue.`);
    return null;
  }
};

const getRedisClient = () => redisClient;
const checkRedisAvailable = () => isRedisAvailable;

module.exports = {
  initRedis,
  getRedisClient,
  checkRedisAvailable,
};
