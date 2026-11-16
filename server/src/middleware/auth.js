const jwt = require('jsonwebtoken');
const config = require('../config/env');
const ApiError = require('../utils/apiError');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return next(ApiError.unauthorized('No authentication token provided'));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(ApiError.unauthorized('Token expired', 'TOKEN_EXPIRED'));
      }
      return next(ApiError.unauthorized('Invalid authentication token', 'INVALID_TOKEN'));
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return next(ApiError.unauthorized('User not found for this token', 'USER_NOT_FOUND'));
    }

    // Attach user to request
    req.user = {
      id: user._id ? String(user._id) : String(user.id),
      _id: user._id ? String(user._id) : String(user.id),
      email: user.email,
      name: user.name,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('User is not authenticated'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Role '${req.user.role}' is not authorized to access this resource`));
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorizeRole,
};
