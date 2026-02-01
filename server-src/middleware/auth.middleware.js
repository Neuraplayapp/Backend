// Authentication Middleware for Agent Operations
// JWT is optional for basic functionality, will work without it
let jwt;
try {
  jwt = require('jsonwebtoken');
} catch (error) {
  console.warn('JWT not available, using basic auth');
  jwt = null;
}

class AuthMiddleware {
  
  // Extract user from JWT token
  extractUser(req) {
    const authHeader = req.headers.authorization;
    
    // No auth header = guest access (still works)
    if (!authHeader) return null;
    
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;
    
    try {
      if (!jwt) {
        // JWT module not available - guest access
        console.warn('⚠️ JWT module not available, using guest access');
        return { id: 'guest-user', role: 'user' };
      }
      
      // 🔐 SECURITY FIX: Require JWT_SECRET - no fallback secret
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        console.error('❌ SECURITY: JWT_SECRET not configured - rejecting token');
        return null; // Force guest mode if no secret configured
      }
      
      const decoded = jwt.verify(token, secret);
      return decoded;
    } catch (error) {
      console.warn('⚠️ Invalid JWT token:', error.message);
      return null;
    }
  }
  
  // Required authentication - blocks request if no valid token
  required = (req, res, next) => {
    const user = this.extractUser(req);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please provide a valid authorization token',
        metadata: {
          timestamp: new Date().toISOString(),
          path: req.path,
          method: req.method
        }
      });
    }
    
    req.user = user;
    next();
  };
  
  // Optional authentication - continues with or without token
  optional = (req, res, next) => {
    const user = this.extractUser(req);
    req.user = user; // null if no valid token
    next();
  };
  
  // Role-based authorization
  requireRole = (roles) => {
    if (typeof roles === 'string') {
      roles = [roles];
    }
    
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          metadata: {
            timestamp: new Date().toISOString(),
            requiredRoles: roles
          }
        });
      }
      
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          message: `Required role: ${roles.join(' or ')}, current role: ${req.user.role}`,
          metadata: {
            timestamp: new Date().toISOString(),
            requiredRoles: roles,
            userRole: req.user.role
          }
        });
      }
      
      next();
    };
  };
  
  // Subscription tier validation
  requireTier = (minTier) => {
    const tierHierarchy = {
      'free': 0,
      'premium': 1,
      'enterprise': 2
    };
    
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          metadata: {
            timestamp: new Date().toISOString(),
            requiredTier: minTier
          }
        });
      }
      
      const userTier = req.user.subscription?.tier || 'free';
      const userTierLevel = tierHierarchy[userTier] || 0;
      const requiredLevel = tierHierarchy[minTier] || 0;
      
      if (userTierLevel < requiredLevel) {
        return res.status(403).json({
          success: false,
          error: 'Subscription upgrade required',
          message: `This feature requires ${minTier} subscription or higher`,
          metadata: {
            timestamp: new Date().toISOString(),
            requiredTier: minTier,
            userTier,
            upgradeUrl: '/pricing'
          }
        });
      }
      
      next();
    };
  };
  
  // Usage limit validation
  checkUsageLimits = (operation) => {
    const limits = {
      free: {
        aiPrompts: 20,
        imageGeneration: 5,
        agentExecutions: 3
      },
      premium: {
        aiPrompts: 500,
        imageGeneration: 100,
        agentExecutions: 50
      },
      enterprise: {
        aiPrompts: -1, // unlimited
        imageGeneration: -1,
        agentExecutions: -1
      }
    };
    
    return async (req, res, next) => {
      if (!req.user) {
        // Anonymous users get very limited access
        const anonymousLimits = {
          aiPrompts: 3,
          imageGeneration: 1,
          agentExecutions: 1
        };
        
        // Here you'd check anonymous usage from IP-based tracking
        // For now, we'll just allow limited access
        req.usageInfo = {
          allowed: true,
          remaining: anonymousLimits[operation] || 1,
          limit: anonymousLimits[operation] || 1,
          tier: 'anonymous'
        };
        return next();
      }
      
      const userTier = req.user.subscription?.tier || 'free';
      const tierLimits = limits[userTier] || limits.free;
      const userUsage = req.user.usage || {};
      
      const operationUsage = userUsage[operation] || { count: 0 };
      const limit = tierLimits[operation];
      
      if (limit !== -1 && operationUsage.count >= limit) {
        return res.status(429).json({
          success: false,
          error: 'Usage limit exceeded',
          message: `You've reached your ${operation} limit for ${userTier} tier`,
          metadata: {
            timestamp: new Date().toISOString(),
            operation,
            used: operationUsage.count,
            limit,
            tier: userTier,
            upgradeUrl: '/pricing'
          }
        });
      }
      
      req.usageInfo = {
        allowed: true,
        remaining: limit === -1 ? -1 : limit - operationUsage.count,
        limit,
        tier: userTier
      };
      
      next();
    };
  };
  
  // API key validation (for server-to-server calls)
  validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required',
        message: 'Please provide a valid API key in x-api-key header'
      });
    }
    
    // In production, validate against database
    const validApiKeys = (process.env.VALID_API_KEYS || '').split(',');
    
    if (!validApiKeys.includes(apiKey)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key',
        metadata: {
          timestamp: new Date().toISOString()
        }
      });
    }
    
    req.apiKey = apiKey;
    next();
  };
  
  // Session ownership validation
  validateSessionOwnership = async (req, res, next) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required for session access'
        });
      }
      
      // Check if user owns the session
      const agentService = require('../services/agent.service');
      const session = await agentService.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }
      
      if (session.user_id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You can only access your own sessions'
        });
      }
      
      req.session = session;
      next();
      
    } catch (error) {
      console.error('❌ Session ownership validation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate session ownership'
      });
    }
  };
}

module.exports = new AuthMiddleware();
