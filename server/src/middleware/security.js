const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const config = require('../config/env');

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs for auth routes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again after 15 minutes',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
});

const corsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);
    if (
      origin === config.clientUrl
    ) {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS policy'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

const helmetMiddleware = helmet({
  contentSecurityPolicy: false, // disabled for websocket/canvas inline script compatibility in development
  crossOriginEmbedderPolicy: false,
});

module.exports = {
  authRateLimiter,
  corsOptions,
  helmetMiddleware,
};
