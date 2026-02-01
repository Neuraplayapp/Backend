// Centralized Error Handling Middleware
const logger = require('../utils/logger');

class ErrorMiddleware {
  constructor() {
    this.errorTypes = {
      VALIDATION_ERROR: 'ValidationError',
      AUTHENTICATION_ERROR: 'AuthenticationError', 
      AUTHORIZATION_ERROR: 'AuthorizationError',
      NOT_FOUND_ERROR: 'NotFoundError',
      RATE_LIMIT_ERROR: 'RateLimitError',
      CIRCUIT_BREAKER_ERROR: 'CircuitBreakerError',
      DATABASE_ERROR: 'DatabaseError',
      EXTERNAL_API_ERROR: 'ExternalApiError',
      TOOL_EXECUTION_ERROR: 'ToolExecutionError',
      AGENT_ERROR: 'AgentError',
      BUSINESS_LOGIC_ERROR: 'BusinessLogicError',
      SYSTEM_ERROR: 'SystemError'
    };
  }

  // Main error handling middleware
  handleError = (error, req, res, next) => {
    // Add request context to error
    const errorContext = {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id,
      sessionId: req.sessionId,
      timestamp: new Date().toISOString()
    };

    // Categorize and process the error
    const processedError = this.processError(error, errorContext);
    
    // Log the error
    this.logError(processedError, errorContext);
    
    // Send appropriate response
    this.sendErrorResponse(res, processedError);
  };

  processError(error, context) {
    // Handle known error types
    if (error.isCircuitBreakerError) {
      return this.createErrorResponse(
        this.errorTypes.CIRCUIT_BREAKER_ERROR,
        'Service temporarily unavailable',
        503,
        'CIRCUIT_BREAKER_OPEN',
        { service: error.service }
      );
    }

    if (error.name === 'ValidationError' || error.type === 'validation') {
      return this.createErrorResponse(
        this.errorTypes.VALIDATION_ERROR,
        'Invalid input data',
        400,
        'VALIDATION_FAILED',
        { details: error.details || error.message }
      );
    }

    if (error.name === 'UnauthorizedError' || error.status === 401) {
      return this.createErrorResponse(
        this.errorTypes.AUTHENTICATION_ERROR,
        'Authentication required',
        401,
        'AUTHENTICATION_REQUIRED'
      );
    }

    if (error.name === 'ForbiddenError' || error.status === 403) {
      return this.createErrorResponse(
        this.errorTypes.AUTHORIZATION_ERROR,
        'Insufficient permissions',
        403,
        'AUTHORIZATION_FAILED'
      );
    }

    if (error.name === 'NotFoundError' || error.status === 404) {
      return this.createErrorResponse(
        this.errorTypes.NOT_FOUND_ERROR,
        'Resource not found',
        404,
        'RESOURCE_NOT_FOUND'
      );
    }

    if (error.code === 'LIMIT_REACHED' || error.status === 429) {
      return this.createErrorResponse(
        this.errorTypes.RATE_LIMIT_ERROR,
        'Rate limit exceeded',
        429,
        'RATE_LIMIT_EXCEEDED',
        { retryAfter: error.retryAfter || 60 }
      );
    }

    // Database errors
    if (this.isDatabaseError(error)) {
      return this.createErrorResponse(
        this.errorTypes.DATABASE_ERROR,
        'Database operation failed',
        500,
        'DATABASE_ERROR',
        { 
          operation: error.operation,
          constraint: error.constraint 
        }
      );
    }

    // External API errors
    if (this.isExternalApiError(error)) {
      return this.createErrorResponse(
        this.errorTypes.EXTERNAL_API_ERROR,
        'External service error',
        502,
        'EXTERNAL_SERVICE_ERROR',
        { 
          service: error.service,
          statusCode: error.statusCode 
        }
      );
    }

    // Tool execution errors
    if (error.toolName || error.type === 'tool_execution') {
      return this.createErrorResponse(
        this.errorTypes.TOOL_EXECUTION_ERROR,
        'Tool execution failed',
        500,
        'TOOL_EXECUTION_FAILED',
        { 
          toolName: error.toolName,
          parameters: error.parameters,
          executionId: error.executionId
        }
      );
    }

    // Agent errors
    if (error.sessionId || error.type === 'agent') {
      return this.createErrorResponse(
        this.errorTypes.AGENT_ERROR,
        'Agent processing error',
        500,
        'AGENT_PROCESSING_ERROR',
        { 
          sessionId: error.sessionId,
          phase: error.phase,
          step: error.step
        }
      );
    }

    // Business logic errors
    if (error.type === 'business' || error.isBusiness) {
      return this.createErrorResponse(
        this.errorTypes.BUSINESS_LOGIC_ERROR,
        error.message || 'Business rule violation',
        400,
        'BUSINESS_RULE_VIOLATION',
        { rule: error.rule }
      );
    }

    // Default system error
    return this.createErrorResponse(
      this.errorTypes.SYSTEM_ERROR,
      'Internal server error',
      500,
      'INTERNAL_SERVER_ERROR',
      process.env.NODE_ENV === 'development' ? { stack: error.stack } : {}
    );
  }

  createErrorResponse(type, message, statusCode, code, details = {}) {
    return {
      type,
      message,
      statusCode,
      code,
      details,
      timestamp: new Date().toISOString(),
      success: false
    };
  }

  isDatabaseError(error) {
    const dbErrors = [
      'SequelizeError',
      'QueryFailedError', 
      'DatabaseError',
      'ConnectionError',
      'TimeoutError'
    ];
    
    return dbErrors.includes(error.name) || 
           error.code?.startsWith('PG') || // PostgreSQL errors
           error.errno !== undefined; // General DB errors
  }

  isExternalApiError(error) {
    return error.isAxiosError || 
           error.response?.status >= 400 ||
           ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'].includes(error.code);
  }

  logError(processedError, context) {
    const logLevel = this.getLogLevel(processedError.statusCode);
    
    logger[logLevel]('Request error', {
      ...processedError,
      ...context,
      type: 'request_error'
    });

    // Log to separate error tracking if needed
    if (processedError.statusCode >= 500) {
      this.logCriticalError(processedError, context);
    }
  }

  getLogLevel(statusCode) {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'info';
  }

  logCriticalError(error, context) {
    // This could integrate with external error tracking services
    logger.error('Critical error detected', {
      ...error,
      ...context,
      severity: 'critical',
      requiresAttention: true
    });
  }

  sendErrorResponse(res, processedError) {
    // Set security headers
    res.removeHeader('X-Powered-By');
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    });

    // Send response
    res.status(processedError.statusCode).json({
      error: {
        type: processedError.type,
        message: processedError.message,
        code: processedError.code,
        timestamp: processedError.timestamp,
        ...(Object.keys(processedError.details).length > 0 && { 
          details: processedError.details 
        })
      },
      success: false,
      requestId: res.req?.requestId
    });
  }

  // Async error handler for promises
  asyncHandler = (fn) => {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };

  // 404 handler middleware
  notFoundHandler = (req, res, next) => {
    const error = new Error(`Route not found: ${req.method} ${req.url}`);
    error.status = 404;
    error.name = 'NotFoundError';
    next(error);
  };

  // Validation error handler
  validationErrorHandler = (errors) => {
    const error = new Error('Validation failed');
    error.name = 'ValidationError';
    error.type = 'validation';
    error.details = errors;
    return error;
  };

  // Create custom error classes
  createCustomErrors() {
    return {
      ValidationError: class extends Error {
        constructor(message, details = {}) {
          super(message);
          this.name = 'ValidationError';
          this.type = 'validation';
          this.details = details;
        }
      },

      AuthenticationError: class extends Error {
        constructor(message = 'Authentication required') {
          super(message);
          this.name = 'UnauthorizedError';
          this.status = 401;
        }
      },

      AuthorizationError: class extends Error {
        constructor(message = 'Insufficient permissions') {
          super(message);
          this.name = 'ForbiddenError';
          this.status = 403;
        }
      },

      NotFoundError: class extends Error {
        constructor(message = 'Resource not found') {
          super(message);
          this.name = 'NotFoundError';
          this.status = 404;
        }
      },

      RateLimitError: class extends Error {
        constructor(message = 'Rate limit exceeded', retryAfter = 60) {
          super(message);
          this.name = 'RateLimitError';
          this.status = 429;
          this.retryAfter = retryAfter;
        }
      },

      BusinessLogicError: class extends Error {
        constructor(message, rule = null) {
          super(message);
          this.type = 'business';
          this.isBusiness = true;
          this.rule = rule;
        }
      },

      ToolExecutionError: class extends Error {
        constructor(message, toolName, parameters = {}, executionId = null) {
          super(message);
          this.type = 'tool_execution';
          this.toolName = toolName;
          this.parameters = parameters;
          this.executionId = executionId;
        }
      },

      AgentError: class extends Error {
        constructor(message, sessionId, phase = null, step = null) {
          super(message);
          this.type = 'agent';
          this.sessionId = sessionId;
          this.phase = phase;
          this.step = step;
        }
      },

      ExternalApiError: class extends Error {
        constructor(message, service, statusCode = null) {
          super(message);
          this.type = 'external_api';
          this.service = service;
          this.statusCode = statusCode;
        }
      }
    };
  }

  // Error recovery strategies
  recoverFromError(error, context) {
    switch (error.type) {
      case this.errorTypes.CIRCUIT_BREAKER_ERROR:
        return this.recoverFromCircuitBreaker(error, context);
      
      case this.errorTypes.EXTERNAL_API_ERROR:
        return this.recoverFromExternalApi(error, context);
      
      case this.errorTypes.TOOL_EXECUTION_ERROR:
        return this.recoverFromToolExecution(error, context);
      
      default:
        return null;
    }
  }

  recoverFromCircuitBreaker(error, context) {
    return {
      strategy: 'fallback',
      message: 'Using cached or simplified response',
      action: 'retry_later'
    };
  }

  recoverFromExternalApi(error, context) {
    return {
      strategy: 'retry_with_backoff',
      message: 'Will retry with exponential backoff',
      retryAfter: Math.min(60, Math.pow(2, context.attemptCount || 1))
    };
  }

  recoverFromToolExecution(error, context) {
    return {
      strategy: 'alternative_tool',
      message: 'Attempting with alternative tool',
      alternativeTool: error.alternativeTool
    };
  }

  // Health check for error handling system
  healthCheck() {
    return {
      errorHandling: {
        middlewareActive: true,
        customErrorsAvailable: true,
        loggingEnabled: true,
        recoveryStrategiesEnabled: true
      }
    };
  }
}

module.exports = new ErrorMiddleware();
