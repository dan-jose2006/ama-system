const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  // Log the error
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // PostgreSQL constraint violations
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      error: 'A record with this information already exists.',
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      error: 'Referenced record does not exist.',
    });
  }

  if (err.code === '23514') {
    return res.status(400).json({
      success: false,
      error: 'Data validation failed. Please check your input values.',
    });
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred.'
      : err.message;

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
