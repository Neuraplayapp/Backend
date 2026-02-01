// Base Tool Implementation with Inheritance Structure
const logger = require('../utils/logger');
const { createWebSearchBreaker, createLLMBreaker, createImageGenBreaker } = require('../utils/circuit-breaker');
const cacheService = require('../services/cache.service');

class BaseTool {
  constructor(config = {}) {
    this.name = config.name || this.constructor.name;
    this.description = config.description || '';
    this.version = config.version || '1.0.0';
    this.category = config.category || 'general';
    this.timeout = config.timeout || 30000;
    this.retryPolicy = config.retryPolicy || { maxRetries: 2, backoff: 'exponential' };
    this.cache = config.cache || { enabled: false, ttl: 300000 };
    this.circuitBreaker = config.circuitBreaker || null;
    this.dependencies = config.dependencies || [];
    this.schema = config.schema || {};
    
    // Execution statistics
    this.stats = {
      executions: 0,
      successes: 0,
      failures: 0,
      totalDuration: 0,
      lastExecuted: null,
      avgDuration: 0
    };
    
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      // Initialize circuit breaker if specified
      if (this.circuitBreaker && typeof this.circuitBreaker === 'string') {
        switch (this.circuitBreaker) {
          case 'web-search':
            this.circuitBreaker = createWebSearchBreaker();
            break;
          case 'llm':
            this.circuitBreaker = createLLMBreaker();
            break;
          case 'image-gen':
            this.circuitBreaker = createImageGenBreaker();
            break;
          default:
            this.circuitBreaker = null;
        }
      }
      
      // Run tool-specific initialization
      await this.onInitialize();
      
      this.initialized = true;
      
      logger.info('Tool initialized', {
        name: this.name,
        category: this.category,
        version: this.version
      });
      
    } catch (error) {
      logger.error('Tool initialization failed', {
        name: this.name,
        error
      });
      throw error;
    }
  }

  async execute(parameters, context = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const executionId = `${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    this.stats.executions++;
    this.stats.lastExecuted = new Date();
    
    logger.debug('Tool execution started', {
      tool: this.name,
      executionId,
      parameters: this.sanitizeParameters(parameters)
    });

    try {
      // Validate parameters
      const validationResult = this.validateParameters(parameters);
      if (!validationResult.valid) {
        throw new Error(`Parameter validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Check cache if enabled
      if (this.cache.enabled) {
        const cacheKey = this.generateCacheKey(parameters);
        const cached = await cacheService.get(cacheKey, {
          namespace: `tool:${this.name}`,
          ttl: this.cache.ttl
        });
        
        if (cached) {
          logger.debug('Tool cache hit', { tool: this.name, executionId });
          return this.processResult(cached, context, executionId, Date.now() - startTime);
        }
      }

      // Execute with circuit breaker if available
      let result;
      if (this.circuitBreaker) {
        result = await this.circuitBreaker.execute(
          () => this.executeWithTimeout(parameters, context, executionId),
          () => this.fallback(parameters, context, executionId)
        );
      } else {
        result = await this.executeWithTimeout(parameters, context, executionId);
      }

      // Cache result if enabled
      if (this.cache.enabled && result && result.success) {
        const cacheKey = this.generateCacheKey(parameters);
        await cacheService.set(cacheKey, result, {
          namespace: `tool:${this.name}`,
          ttl: this.cache.ttl
        });
      }

      const duration = Date.now() - startTime;
      this.updateStats(true, duration);
      
      return this.processResult(result, context, executionId, duration);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateStats(false, duration);
      
      logger.error('Tool execution failed', {
        tool: this.name,
        executionId,
        error,
        duration
      });
      
      return this.processError(error, context, executionId, duration);
    }
  }

  async executeWithTimeout(parameters, context, executionId) {
    return Promise.race([
      this.doExecute(parameters, context, executionId),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Tool execution timeout: ${this.timeout}ms`)), this.timeout)
      )
    ]);
  }

  // Abstract method - must be implemented by subclasses
  async doExecute(parameters, context, executionId) {
    throw new Error(`Tool ${this.name} must implement doExecute method`);
  }

  // Hook methods that can be overridden
  async onInitialize() {
    // Override in subclasses for custom initialization
  }

  async fallback(parameters, context, executionId) {
    // Override in subclasses for custom fallback behavior
    return {
      success: false,
      error: 'Service unavailable, fallback not implemented',
      fallback: true
    };
  }

  validateParameters(parameters) {
    // Basic validation - override for tool-specific validation
    if (!parameters || typeof parameters !== 'object') {
      return {
        valid: false,
        errors: ['Parameters must be an object']
      };
    }

    // JSON Schema validation if schema is provided
    if (this.schema && this.schema.required) {
      const missing = this.schema.required.filter(field => !(field in parameters));
      if (missing.length > 0) {
        return {
          valid: false,
          errors: [`Missing required fields: ${missing.join(', ')}`]
        };
      }
    }

    return { valid: true, errors: [] };
  }

  sanitizeParameters(parameters) {
    // Remove sensitive data from logs
    const sanitized = { ...parameters };
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'apiKey'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  generateCacheKey(parameters) {
    // Generate a deterministic cache key
    const normalized = JSON.stringify(parameters, Object.keys(parameters).sort());
    return `${this.name}:${this.createHash(normalized)}`;
  }

  createHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  processResult(result, context, executionId, duration) {
    return {
      success: true,
      data: result,
      metadata: {
        tool: this.name,
        executionId,
        duration,
        timestamp: new Date().toISOString(),
        cached: result.cached || false
      }
    };
  }

  processError(error, context, executionId, duration) {
    return {
      success: false,
      error: error.message || 'Tool execution failed',
      metadata: {
        tool: this.name,
        executionId,
        duration,
        timestamp: new Date().toISOString(),
        errorType: error.constructor.name
      }
    };
  }

  updateStats(success, duration) {
    if (success) {
      this.stats.successes++;
    } else {
      this.stats.failures++;
    }
    
    this.stats.totalDuration += duration;
    this.stats.avgDuration = this.stats.totalDuration / this.stats.executions;
  }

  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.executions > 0 ? (this.stats.successes / this.stats.executions) * 100 : 0,
      failureRate: this.stats.executions > 0 ? (this.stats.failures / this.stats.executions) * 100 : 0
    };
  }

  getInfo() {
    return {
      name: this.name,
      description: this.description,
      version: this.version,
      category: this.category,
      schema: this.schema,
      dependencies: this.dependencies,
      timeout: this.timeout,
      cache: this.cache,
      stats: this.getStats()
    };
  }

  healthCheck() {
    const stats = this.getStats();
    const isHealthy = stats.successRate >= 80 && this.initialized;
    
    return {
      healthy: isHealthy,
      initialized: this.initialized,
      successRate: stats.successRate,
      avgDuration: stats.avgDuration,
      lastExecuted: this.stats.lastExecuted
    };
  }
}

// Specialized base classes for different tool types

class HttpTool extends BaseTool {
  constructor(config = {}) {
    super({
      ...config,
      circuitBreaker: config.circuitBreaker || 'web-search',
      timeout: config.timeout || 10000,
      cache: { enabled: true, ttl: 300000, ...config.cache }
    });
    
    this.baseUrl = config.baseUrl || '';
    this.headers = config.headers || {};
    this.retryStatusCodes = config.retryStatusCodes || [429, 502, 503, 504];
  }

  async makeRequest(method, url, data = null, options = {}) {
    const axios = require('axios');
    
    const requestConfig = {
      method,
      url: this.baseUrl + url,
      headers: { ...this.headers, ...options.headers },
      timeout: options.timeout || this.timeout,
      data
    };

    const response = await axios(requestConfig);
    return response.data;
  }

  async fallback(parameters, context, executionId) {
    return {
      success: false,
      error: 'HTTP service unavailable',
      fallback: true,
      data: null
    };
  }
}

class DatabaseTool extends BaseTool {
  constructor(config = {}) {
    super({
      ...config,
      timeout: config.timeout || 5000,
      cache: { enabled: true, ttl: 60000, ...config.cache }
    });
  }

  async fallback(parameters, context, executionId) {
    return {
      success: false,
      error: 'Database unavailable',
      fallback: true,
      data: []
    };
  }
}

class LLMTool extends BaseTool {
  constructor(config = {}) {
    super({
      ...config,
      circuitBreaker: config.circuitBreaker || 'llm',
      timeout: config.timeout || 60000,
      cache: { enabled: true, ttl: 600000, ...config.cache }
    });
    
    this.model = config.model || 'accounts/fireworks/models/gpt-oss-120b';
    this.maxTokens = config.maxTokens || 2000;
    this.temperature = config.temperature || 0.7;
  }

  async fallback(parameters, context, executionId) {
    return {
      success: false,
      error: 'LLM service unavailable',
      fallback: true,
      data: 'I apologize, but I cannot process your request at the moment due to technical difficulties.'
    };
  }
}

class ImageTool extends BaseTool {
  constructor(config = {}) {
    super({
      ...config,
      circuitBreaker: config.circuitBreaker || 'image-gen',
      timeout: config.timeout || 120000,
      cache: { enabled: true, ttl: 3600000, ...config.cache }
    });
  }

  async fallback(parameters, context, executionId) {
    return {
      success: false,
      error: 'Image service unavailable',
      fallback: true,
      data: null
    };
  }
}

module.exports = {
  BaseTool,
  HttpTool,
  DatabaseTool,
  LLMTool,
  ImageTool
};
