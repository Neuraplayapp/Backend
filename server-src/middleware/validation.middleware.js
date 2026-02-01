// Validation Middleware - Comprehensive input validation
const { body, param, query, validationResult } = require('express-validator');

class ValidationMiddleware {
  
  // Handle validation results
  handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value,
        location: error.location
      }));
      
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: formattedErrors,
        metadata: {
          timestamp: new Date().toISOString(),
          path: req.path,
          method: req.method,
          validationErrorCount: formattedErrors.length
        }
      });
    }
    
    next();
  };

  // Session validation rules
  createSessionValidation = [
    body('userId')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('User ID must be a string between 1-255 characters'),
    
    body('initialContext')
      .optional()
      .isObject()
      .withMessage('Initial context must be an object'),
    
    body('initialContext')
      .optional()
      .custom((value) => {
        if (value && JSON.stringify(value).length > 10000) {
          throw new Error('Initial context too large (max 10KB)');
        }
        return true;
      }),
    
    this.handleValidationErrors
  ];

  sessionIdValidation = [
    param('sessionId')
      .isUUID(4)
      .withMessage('Session ID must be a valid UUID'),
    
    this.handleValidationErrors
  ];

  // Agent execution validation
  executeGoalValidation = [
    body('sessionId')
      .isUUID(4)
      .withMessage('Session ID must be a valid UUID'),
    
    body('goal')
      .isString()
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Goal must be a string between 1-2000 characters'),
    
    body('goal')
      .matches(/^[a-zA-Z0-9\s\.\,\!\?\-\:\;\'\"]+$/)
      .withMessage('Goal contains invalid characters'),
    
    body('constraints')
      .optional()
      .isObject()
      .withMessage('Constraints must be an object'),
    
    body('constraints.timeoutMs')
      .optional()
      .isInt({ min: 5000, max: 300000 })
      .withMessage('Timeout must be between 5-300 seconds'),
    
    body('constraints.maxSteps')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Max steps must be between 1-50'),
    
    body('constraints.allowedTools')
      .optional()
      .isArray()
      .withMessage('Allowed tools must be an array'),
    
    body('constraints.allowedTools.*')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Tool names must be strings between 1-100 characters'),
    
    this.handleValidationErrors
  ];

  // Tool execution validation
  executeToolValidation = [
    body('toolName')
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Tool name must be alphanumeric with underscores/hyphens'),
    
    body('parameters')
      .isObject()
      .withMessage('Parameters must be an object'),
    
    body('parameters')
      .custom((value) => {
        if (JSON.stringify(value).length > 50000) {
          throw new Error('Parameters too large (max 50KB)');
        }
        return true;
      }),
    
    body('sessionId')
      .optional()
      .isUUID(4)
      .withMessage('Session ID must be a valid UUID'),
    
    this.handleValidationErrors
  ];

  // Context management validation
  saveContextValidation = [
    body('sessionId')
      .isUUID(4)
      .withMessage('Session ID must be a valid UUID'),
    
    body('contextType')
      .isIn(['short-term', 'working', 'long-term', 'semantic'])
      .withMessage('Context type must be one of: short-term, working, long-term, semantic'),
    
    body('key')
      .isString()
      .trim()
      .isLength({ min: 1, max: 255 })
      .matches(/^[a-zA-Z0-9_.-]+$/)
      .withMessage('Key must be alphanumeric with dots, underscores, hyphens'),
    
    body('value')
      .exists()
      .withMessage('Value is required'),
    
    body('value')
      .custom((value) => {
        if (JSON.stringify(value).length > 100000) {
          throw new Error('Context value too large (max 100KB)');
        }
        return true;
      }),
    
    body('tags')
      .optional()
      .isArray({ max: 20 })
      .withMessage('Tags must be an array with max 20 items'),
    
    body('tags.*')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Tags must be strings between 1-50 characters'),
    
    this.handleValidationErrors
  ];

  // Query parameter validation
  paginationValidation = [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1-100'),
    
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be non-negative'),
    
    this.handleValidationErrors
  ];

  timeRangeValidation = [
    query('timeRange')
      .optional()
      .matches(/^(\d+)[hdwm]$/)
      .withMessage('Time range must be in format: number + unit (h/d/w/m)'),
    
    query('timeRange')
      .optional()
      .custom((value) => {
        const match = value.match(/^(\d+)[hdwm]$/);
        if (match) {
          const num = parseInt(match[1]);
          const unit = match[2];
          
          // Reasonable limits
          if (unit === 'h' && num > 168) throw new Error('Max 168 hours (1 week)');
          if (unit === 'd' && num > 90) throw new Error('Max 90 days');
          if (unit === 'w' && num > 52) throw new Error('Max 52 weeks');
          if (unit === 'm' && num > 12) throw new Error('Max 12 months');
        }
        return true;
      }),
    
    this.handleValidationErrors
  ];

  // File upload validation
  fileUploadValidation = [
    body('fileName')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 255 })
      .matches(/^[a-zA-Z0-9._-]+$/)
      .withMessage('File name must be alphanumeric with dots, underscores, hyphens'),
    
    body('fileSize')
      .optional()
      .isInt({ min: 1, max: 10 * 1024 * 1024 }) // 10MB max
      .withMessage('File size must be between 1 byte and 10MB'),
    
    body('mimeType')
      .optional()
      .isIn(['image/jpeg', 'image/png', 'image/gif', 'text/plain', 'application/json', 'application/pdf'])
      .withMessage('Unsupported file type'),
    
    this.handleValidationErrors
  ];

  // Security validation
  securityValidation = [
    // XSS prevention
    body('*')
      .optional()
      .customSanitizer((value) => {
        if (typeof value === 'string') {
          return value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        }
        return value;
      }),
    
    // SQL injection prevention (basic)
    body('*')
      .optional()
      .custom((value) => {
        if (typeof value === 'string') {
          const sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
            /(;|\||&|\$|\?)/g
          ];
          
          for (const pattern of sqlPatterns) {
            if (pattern.test(value)) {
              throw new Error('Input contains potentially dangerous characters');
            }
          }
        }
        return true;
      }),
    
    this.handleValidationErrors
  ];

  // Rate limiting validation
  rateLimitValidation = [
    body()
      .custom((value, { req }) => {
        const bodySize = JSON.stringify(req.body).length;
        if (bodySize > 1000000) { // 1MB
          throw new Error('Request body too large (max 1MB)');
        }
        return true;
      }),
    
    this.handleValidationErrors
  ];

  // Compound validations for specific endpoints
  agentSessionEndpoint = [
    ...this.createSessionValidation,
    ...this.securityValidation,
    ...this.rateLimitValidation
  ];

  agentExecuteEndpoint = [
    ...this.executeGoalValidation,
    ...this.securityValidation,
    ...this.rateLimitValidation
  ];

  toolExecuteEndpoint = [
    ...this.executeToolValidation,
    ...this.securityValidation,
    ...this.rateLimitValidation
  ];

  contextEndpoint = [
    ...this.saveContextValidation,
    ...this.securityValidation
  ];

  // Custom validation helpers
  validateJSON = (maxSize = 10000) => {
    return body().custom((value, { req }) => {
      try {
        const parsed = JSON.parse(JSON.stringify(req.body));
        const size = JSON.stringify(parsed).length;
        
        if (size > maxSize) {
          throw new Error(`JSON payload too large (max ${maxSize} bytes)`);
        }
        
        return true;
      } catch (error) {
        throw new Error('Invalid JSON format');
      }
    });
  };

  validateUniqueFields = (fields) => {
    return body().custom((value, { req }) => {
      const seen = new Set();
      
      for (const field of fields) {
        const fieldValue = req.body[field];
        if (fieldValue && seen.has(fieldValue)) {
          throw new Error(`Duplicate value in field: ${field}`);
        }
        seen.add(fieldValue);
      }
      
      return true;
    });
  };
}

module.exports = new ValidationMiddleware();
