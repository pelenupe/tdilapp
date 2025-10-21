const fs = require('fs');
const path = require('path');
const { logAuditEvent } = require('./enhancedAuthMiddleware');

// Ensure log directory exists
const logDir = process.env.LOG_FILE ? path.dirname(process.env.LOG_FILE) : '/var/log/tdil';
if (!fs.existsSync(logDir)) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
  } catch (error) {
    console.warn(`Could not create log directory: ${logDir}. Logging to console only.`);
  }
}

// Custom logger class
class Logger {
  constructor() {
    this.logFile = process.env.LOG_FILE || path.join(logDir, 'app.log');
    this.errorLogFile = process.env.ERROR_LOG_FILE || path.join(logDir, 'error.log');
    this.accessLogFile = process.env.ACCESS_LOG_FILE || path.join(logDir, 'access.log');
    this.logLevel = process.env.LOG_LEVEL || 'info';
    // Disable file logging for cloud deployments (Render, Heroku, etc.)
    this.enableFileLogging = process.env.ENABLE_FILE_LOGGING === 'true' && fs.existsSync(logDir);
  }

  formatMessage(level, message, meta = {}) {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      meta,
      pid: process.pid,
      hostname: require('os').hostname()
    }) + '\n';
  }

  writeToFile(filename, content) {
    if (!this.enableFileLogging) {
      return;
    }
    
    try {
      fs.appendFileSync(filename, content);
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  shouldLog(level) {
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    return levels[level] <= levels[this.logLevel];
  }

  error(message, meta = {}) {
    if (this.shouldLog('error')) {
      const formatted = this.formatMessage('error', message, meta);
      console.error(formatted.trim());
      this.writeToFile(this.errorLogFile, formatted);
      this.writeToFile(this.logFile, formatted);
    }
  }

  warn(message, meta = {}) {
    if (this.shouldLog('warn')) {
      const formatted = this.formatMessage('warn', message, meta);
      console.warn(formatted.trim());
      this.writeToFile(this.logFile, formatted);
    }
  }

  info(message, meta = {}) {
    if (this.shouldLog('info')) {
      const formatted = this.formatMessage('info', message, meta);
      console.info(formatted.trim());
      this.writeToFile(this.logFile, formatted);
    }
  }

  debug(message, meta = {}) {
    if (this.shouldLog('debug')) {
      const formatted = this.formatMessage('debug', message, meta);
      console.debug(formatted.trim());
      this.writeToFile(this.logFile, formatted);
    }
  }

  access(req, res, responseTime) {
    const accessLog = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      status: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || null,
      referrer: req.get('Referrer') || null,
      contentLength: res.get('Content-Length') || 0
    };

    const formatted = JSON.stringify(accessLog) + '\n';
    this.writeToFile(this.accessLogFile, formatted);

    if (process.env.ENABLE_ACCESS_LOG === 'true') {
      console.log(`${req.method} ${req.url} ${res.statusCode} - ${responseTime}ms`);
    }
  }
}

const logger = new Logger();

// Request logging middleware
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request start
  logger.debug('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || null
  });

  // Override res.end to calculate response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    logger.access(req, res, responseTime);
    originalEnd.apply(res, args);
  };

  next();
};

// Enhanced error handler middleware
const errorHandler = (error, req, res, next) => {
  // Log error details
  const errorId = generateErrorId();
  const errorDetails = {
    errorId,
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || null,
    body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined,
    params: req.params,
    query: req.query
  };

  logger.error('Unhandled error', errorDetails);

  // Log to audit trail for security-related errors
  if (error.name === 'UnauthorizedError' || error.status === 401 || error.status === 403) {
    logAuditEvent(
      req.user?.id || null,
      'SECURITY_ERROR',
      'auth',
      null,
      { error: error.message, errorId },
      req.ip,
      req.get('User-Agent')
    );
  }

  // Determine error response based on environment and error type
  let statusCode = error.status || error.statusCode || 500;
  let response = {
    error: 'Internal server error',
    errorId,
    timestamp: new Date().toISOString()
  };

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    response.error = 'Validation failed';
    response.details = error.details || error.message;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    response.error = 'Invalid data format';
  } else if (error.name === 'MongoError' && error.code === 11000) {
    statusCode = 409;
    response.error = 'Duplicate entry';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    response.error = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    response.error = 'Token expired';
  } else if (statusCode >= 400 && statusCode < 500) {
    response.error = error.message || 'Bad request';
  }

  // Include detailed error information in development
  if (process.env.NODE_ENV === 'development' || process.env.ENABLE_DETAILED_ERRORS === 'true') {
    response.stack = error.stack;
    response.details = error.details;
  }

  res.status(statusCode).json(response);
};

// 404 handler
const notFoundHandler = (req, res) => {
  const errorId = generateErrorId();
  
  logger.warn('Route not found', {
    errorId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || null
  });

  res.status(404).json({
    error: 'Route not found',
    errorId,
    timestamp: new Date().toISOString()
  });
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Generate unique error ID
const generateErrorId = () => {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Validation error handler
const handleValidationError = (errors) => {
  const validationError = new Error('Validation failed');
  validationError.name = 'ValidationError';
  validationError.status = 400;
  validationError.details = errors;
  return validationError;
};

// Database error handler
const handleDatabaseError = (error) => {
  logger.error('Database error', {
    message: error.message,
    code: error.code,
    detail: error.detail,
    constraint: error.constraint,
    table: error.table,
    column: error.column
  });

  // Convert PostgreSQL errors to user-friendly messages
  if (error.code === '23505') { // Unique constraint violation
    const duplicateError = new Error('A record with this information already exists');
    duplicateError.status = 409;
    duplicateError.name = 'DuplicateError';
    return duplicateError;
  }

  if (error.code === '23503') { // Foreign key constraint violation
    const foreignKeyError = new Error('Referenced record does not exist');
    foreignKeyError.status = 400;
    foreignKeyError.name = 'ForeignKeyError';
    return foreignKeyError;
  }

  if (error.code === '23502') { // Not null constraint violation
    const notNullError = new Error('Required field is missing');
    notNullError.status = 400;
    notNullError.name = 'NotNullError';
    return notNullError;
  }

  // Generic database error
  const dbError = new Error('Database operation failed');
  dbError.status = 500;
  dbError.name = 'DatabaseError';
  return dbError;
};

// Graceful shutdown handler
const gracefulShutdown = (server) => {
  const signals = ['SIGTERM', 'SIGINT'];
  
  signals.forEach(signal => {
    process.on(signal, () => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
      
      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    });
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', {
      message: error.message,
      stack: error.stack
    });
    
    // Graceful shutdown
    server.close(() => {
      process.exit(1);
    });
    
    setTimeout(() => {
      process.exit(1);
    }, 5000);
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled promise rejection', {
      reason: reason?.message || reason,
      promise: promise.toString()
    });
    
    // Don't exit the process for unhandled promise rejections
    // Just log them for monitoring
  });
};

module.exports = {
  logger,
  requestLogger,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  handleValidationError,
  handleDatabaseError,
  gracefulShutdown
};
