// Rate Limiting Middleware for Agent Operations
const dbManager = require('../config/database');

class RateLimitMiddleware {
  constructor() {
    this.limits = {
      // General agent operations
      agentOperations: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 60, // 60 requests per minute
        keyGenerator: (req) => `agent:${req.ip}:${req.user?.id || 'anonymous'}`
      },
      
      // Agent execution (more restrictive)
      agentExecution: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 10, // 10 executions per minute
        keyGenerator: (req) => `agent_exec:${req.ip}:${req.user?.id || 'anonymous'}`
      },
      
      // Tool calls (very restrictive)
      toolCalls: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 30, // 30 tool calls per minute
        keyGenerator: (req) => `tools:${req.ip}:${req.user?.id || 'anonymous'}`
      }
    };
  }

  // Redis-based rate limiting with fallback to memory
  async checkRateLimit(req, res, limitConfig) {
    const key = limitConfig.keyGenerator(req);
    const now = Date.now();
    const windowStart = now - limitConfig.windowMs;

    try {
      // Try Redis first (hot layer)
      const current = await dbManager.getHotData(key);
      
      if (current) {
        // Filter out old requests
        const validRequests = current.requests.filter(timestamp => timestamp > windowStart);
        
        if (validRequests.length >= limitConfig.maxRequests) {
          // Rate limit exceeded
          const oldestRequest = validRequests[0];
          const retryAfter = Math.ceil((oldestRequest + limitConfig.windowMs - now) / 1000);
          
          res.set({
            'X-RateLimit-Limit': limitConfig.maxRequests,
            'X-RateLimit-Remaining': 0,
            'X-RateLimit-Reset': new Date(oldestRequest + limitConfig.windowMs),
            'Retry-After': retryAfter
          });
          
          const error = new Error('Rate limit exceeded');
          error.name = 'RateLimitError';
          error.retryAfter = retryAfter;
          throw error;
        }
        
        // Add current request
        validRequests.push(now);
        await dbManager.setHotData(key, { requests: validRequests }, Math.ceil(limitConfig.windowMs / 1000));
        
        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': limitConfig.maxRequests,
          'X-RateLimit-Remaining': limitConfig.maxRequests - validRequests.length,
          'X-RateLimit-Reset': new Date(now + limitConfig.windowMs)
        });
        
      } else {
        // First request in window
        await dbManager.setHotData(key, { requests: [now] }, Math.ceil(limitConfig.windowMs / 1000));
        
        res.set({
          'X-RateLimit-Limit': limitConfig.maxRequests,
          'X-RateLimit-Remaining': limitConfig.maxRequests - 1,
          'X-RateLimit-Reset': new Date(now + limitConfig.windowMs)
        });
      }
      
    } catch (error) {
      if (error.name === 'RateLimitError') {
        throw error;
      }
      
      // If Redis fails, use in-memory fallback (less accurate but functional)
      console.warn('⚠️ Rate limiting falling back to memory-based tracking');
      await this.memoryBasedRateLimit(req, res, limitConfig);
    }
  }

  // In-memory rate limiting fallback
  memoryRateLimit = new Map();

  async memoryBasedRateLimit(req, res, limitConfig) {
    const key = limitConfig.keyGenerator(req);
    const now = Date.now();
    const windowStart = now - limitConfig.windowMs;

    const current = this.memoryRateLimit.get(key) || { requests: [] };
    
    // Filter out old requests
    current.requests = current.requests.filter(timestamp => timestamp > windowStart);
    
    if (current.requests.length >= limitConfig.maxRequests) {
      const oldestRequest = current.requests[0];
      const retryAfter = Math.ceil((oldestRequest + limitConfig.windowMs - now) / 1000);
      
      res.set({
        'X-RateLimit-Limit': limitConfig.maxRequests,
        'X-RateLimit-Remaining': 0,
        'X-RateLimit-Reset': new Date(oldestRequest + limitConfig.windowMs),
        'Retry-After': retryAfter
      });
      
      const error = new Error('Rate limit exceeded');
      error.name = 'RateLimitError';
      error.retryAfter = retryAfter;
      throw error;
    }
    
    // Add current request
    current.requests.push(now);
    this.memoryRateLimit.set(key, current);
    
    // Cleanup old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      this.cleanupMemoryRateLimit();
    }
    
    res.set({
      'X-RateLimit-Limit': limitConfig.maxRequests,
      'X-RateLimit-Remaining': limitConfig.maxRequests - current.requests.length,
      'X-RateLimit-Reset': new Date(now + limitConfig.windowMs)
    });
  }

  cleanupMemoryRateLimit() {
    const now = Date.now();
    for (const [key, data] of this.memoryRateLimit.entries()) {
      if (!data.requests.length || data.requests[data.requests.length - 1] < now - 60 * 60 * 1000) {
        this.memoryRateLimit.delete(key);
      }
    }
  }

  // Middleware factory functions
  agentOperations = async (req, res, next) => {
    try {
      await this.checkRateLimit(req, res, this.limits.agentOperations);
      next();
    } catch (error) {
      if (error.name === 'RateLimitError') {
        return res.status(429).json({
          success: false,
          error: 'Too many agent operations. Please slow down.',
          retryAfter: error.retryAfter,
          metadata: {
            timestamp: new Date().toISOString(),
            type: 'rate_limit',
            limit: 'agent_operations'
          }
        });
      }
      next(error);
    }
  };

  agentExecution = async (req, res, next) => {
    try {
      await this.checkRateLimit(req, res, this.limits.agentExecution);
      next();
    } catch (error) {
      if (error.name === 'RateLimitError') {
        return res.status(429).json({
          success: false,
          error: 'Too many agent executions. Agent operations are computationally expensive.',
          retryAfter: error.retryAfter,
          metadata: {
            timestamp: new Date().toISOString(),
            type: 'rate_limit',
            limit: 'agent_execution'
          }
        });
      }
      next(error);
    }
  };

  toolCalls = async (req, res, next) => {
    try {
      await this.checkRateLimit(req, res, this.limits.toolCalls);
      next();
    } catch (error) {
      if (error.name === 'RateLimitError') {
        return res.status(429).json({
          success: false,
          error: 'Too many tool calls. Please reduce the frequency of requests.',
          retryAfter: error.retryAfter,
          metadata: {
            timestamp: new Date().toISOString(),
            type: 'rate_limit',
            limit: 'tool_calls'
          }
        });
      }
      next(error);
    }
  };

  // Custom rate limit for specific operations
  custom = (windowMs, maxRequests, keyPrefix = 'custom') => {
    return async (req, res, next) => {
      try {
        await this.checkRateLimit(req, res, {
          windowMs,
          maxRequests,
          keyGenerator: (req) => `${keyPrefix}:${req.ip}:${req.user?.id || 'anonymous'}`
        });
        next();
      } catch (error) {
        if (error.name === 'RateLimitError') {
          return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded for this operation.',
            retryAfter: error.retryAfter,
            metadata: {
              timestamp: new Date().toISOString(),
              type: 'rate_limit',
              limit: keyPrefix
            }
          });
        }
        next(error);
      }
    };
  };

  // Get current rate limit status
  async getStatus(req, limitType = 'agentOperations') {
    const limitConfig = this.limits[limitType];
    if (!limitConfig) return null;

    const key = limitConfig.keyGenerator(req);
    const now = Date.now();
    const windowStart = now - limitConfig.windowMs;

    try {
      const current = await dbManager.getHotData(key);
      if (!current) return {
        limit: limitConfig.maxRequests,
        remaining: limitConfig.maxRequests,
        reset: new Date(now + limitConfig.windowMs)
      };

      const validRequests = current.requests.filter(timestamp => timestamp > windowStart);
      return {
        limit: limitConfig.maxRequests,
        remaining: Math.max(0, limitConfig.maxRequests - validRequests.length),
        reset: new Date(validRequests[0] + limitConfig.windowMs)
      };
    } catch (error) {
      return null;
    }
  }
}

module.exports = new RateLimitMiddleware();
