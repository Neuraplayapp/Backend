// Agent Routes - API endpoints for AI Agent operations
const express = require('express');
const { body, param, query } = require('express-validator');
const agentController = require('../controllers/agent.controller');
const authMiddleware = require('../middleware/auth.middleware');
const rateLimitMiddleware = require('../middleware/rate-limit.middleware');

const router = express.Router();

// Apply rate limiting to all agent routes
router.use(rateLimitMiddleware.agentOperations);

// Session Management Routes
router.post('/session',
  authMiddleware.optional, // Allow anonymous sessions with limitations
  [
    body('userId').optional().isString().trim(),
    body('initialContext').optional().isObject()
  ],
  agentController.createSession
);

router.get('/session/:sessionId',
  authMiddleware.optional,
  [
    param('sessionId').isUUID().withMessage('Invalid session ID format')
  ],
  agentController.getSession
);

router.delete('/session/:sessionId',
  authMiddleware.optional,
  [
    param('sessionId').isUUID().withMessage('Invalid session ID format')
  ],
  agentController.closeSession
);

// Execution Routes
router.post('/execute',
  authMiddleware.required, // Execution requires authentication
  rateLimitMiddleware.agentExecution, // Stricter rate limiting for execution
  [
    body('sessionId').isUUID().withMessage('Invalid session ID format'),
    body('goal').isString().isLength({ min: 1, max: 1000 }).withMessage('Goal must be 1-1000 characters'),
    body('constraints').optional().isObject(),
    body('constraints.timeoutMs').optional().isInt({ min: 1000, max: 300000 }).withMessage('Timeout must be 1-300 seconds'),
    body('constraints.maxSteps').optional().isInt({ min: 1, max: 20 }).withMessage('Max steps must be 1-20')
  ],
  agentController.executeGoal
);

router.post('/plan',
  authMiddleware.required,
  [
    body('sessionId').isUUID().withMessage('Invalid session ID format'),
    body('goal').isString().isLength({ min: 1, max: 1000 }).withMessage('Goal must be 1-1000 characters')
  ],
  agentController.planExecution
);

router.post('/step',
  authMiddleware.required,
  [
    body('sessionId').isUUID().withMessage('Invalid session ID format'),
    body('stepIndex').isInt({ min: 0 }).withMessage('Step index must be non-negative integer')
  ],
  agentController.executeStep
);

// Context Management Routes
router.post('/context',
  authMiddleware.required,
  [
    body('sessionId').isUUID().withMessage('Invalid session ID format'),
    body('contextType').isIn(['short-term', 'working', 'long-term', 'semantic']).withMessage('Invalid context type'),
    body('key').isString().isLength({ min: 1, max: 100 }).withMessage('Key must be 1-100 characters'),
    body('value').exists().withMessage('Value is required'),
    body('tags').optional().isArray().withMessage('Tags must be an array')
  ],
  agentController.saveContext
);

router.get('/context/:sessionId',
  authMiddleware.required,
  [
    param('sessionId').isUUID().withMessage('Invalid session ID format'),
    query('contextType').optional().isIn(['short-term', 'working', 'long-term', 'semantic']),
    query('key').optional().isString().isLength({ max: 100 })
  ],
  agentController.getContext
);

// Analytics Routes
router.get('/analytics/:sessionId',
  authMiddleware.required,
  [
    param('sessionId').isUUID().withMessage('Invalid session ID format')
  ],
  agentController.getAnalytics
);

// Memory Management Routes
router.post('/memory',
  authMiddleware.optional, // Allow memory operations without strict auth for now
  [
    body('action').isIn(['store', 'retrieve', 'search']).withMessage('Action must be store, retrieve, or search'),
    body('userId').isString().isLength({ min: 1 }).withMessage('UserId is required'),
    body('key').optional().isString().isLength({ max: 255 }),
    body('value').optional().isString(),
    body('query').optional().isString().isLength({ max: 255 })
  ],
  agentController.handleMemory
);

router.get('/memory/init',
  agentController.initializeMemoryTable
);

// Health Check Route (public)
router.get('/health',
  agentController.healthCheck
);

// Error handling middleware specific to agent routes
router.use((error, req, res, next) => {
  console.error('🚨 Agent route error:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.details,
      metadata: {
        timestamp: new Date().toISOString(),
        path: req.path,
        method: req.method
      }
    });
  }
  
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      metadata: {
        timestamp: new Date().toISOString(),
        path: req.path
      }
    });
  }
  
  if (error.name === 'RateLimitError') {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      retryAfter: error.retryAfter,
      metadata: {
        timestamp: new Date().toISOString(),
        path: req.path
      }
    });
  }
  
  // Generic server error
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    metadata: {
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method
    }
  });
});

module.exports = router;
