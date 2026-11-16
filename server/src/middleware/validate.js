const { validationResult } = require('express-validator');
const ApiError = require('../utils/apiError');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));
    return next(ApiError.badRequest('Validation error', 'VALIDATION_ERROR', errorDetails));
  }
  next();
};

module.exports = validate;
