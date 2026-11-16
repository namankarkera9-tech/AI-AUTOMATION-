const config = require('../config/env');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_ERROR';
  let details = err.details || null;

  // Handle Mongoose / DB specific errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  } else if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_KEY';
    message = 'Resource already exists';
    details = err.keyValue;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Log error (never log credentials or sensitive data)
  if (statusCode >= 500) {
    console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err.message);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code,
      details,
      ...(config.nodeEnv === 'development' && statusCode >= 500 ? { stack: err.stack } : {}),
    },
  });
};

module.exports = errorHandler;
