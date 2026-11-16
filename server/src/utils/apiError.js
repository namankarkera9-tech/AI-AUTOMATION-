class ApiError extends Error {
  constructor(statusCode, message, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, code = 'BAD_REQUEST', details = null) {
    return new ApiError(400, message, code, details);
  }

  static unauthorized(message = 'Unauthorized access', code = 'UNAUTHORIZED') {
    return new ApiError(401, message, code);
  }

  static forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
    return new ApiError(403, message, code);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new ApiError(404, message, code);
  }

  static conflict(message = 'Resource conflict', code = 'CONFLICT') {
    return new ApiError(409, message, code);
  }

  static unprocessable(message, code = 'UNPROCESSABLE_ENTITY', details = null) {
    return new ApiError(422, message, code, details);
  }

  static integrationNotConnected(provider) {
    return new ApiError(
      400,
      `Integration for ${provider} is not connected. Please connect it in the Integrations panel.`,
      'INTEGRATION_NOT_CONNECTED',
      { provider }
    );
  }

  static authExpired(provider) {
    return new ApiError(
      401,
      `Authorization for ${provider} has expired. Please reconnect in the Integrations panel.`,
      'AUTH_EXPIRED',
      { provider }
    );
  }
}

module.exports = ApiError;
