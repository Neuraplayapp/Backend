// Circuit Breaker Pattern for External API Resilience
const logger = require('./logger');

class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || 'default';
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds
    this.expectedErrors = options.expectedErrors || [];
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = Date.now();
    
    // Statistics
    this.stats = {
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      totalTimeouts: 0,
      totalRejections: 0,
      lastStateChange: Date.now(),
      stateHistory: []
    };
    
    // Monitoring window for rolling statistics
    this.window = [];
    this.windowSize = options.windowSize || 100;
    
    logger.info('Circuit breaker initialized', {
      name: this.name,
      failureThreshold: this.failureThreshold,
      resetTimeout: this.resetTimeout
    });
  }

  async execute(fn, fallback = null) {
    const canExecute = this.canExecute();
    
    if (!canExecute) {
      this.stats.totalRejections++;
      
      if (fallback) {
        logger.debug('Circuit breaker OPEN, executing fallback', {
          name: this.name,
          state: this.state
        });
        return await this.executeFallback(fallback);
      } else {
        const error = new Error(`Circuit breaker is OPEN for ${this.name}`);
        error.isCircuitBreakerError = true;
        throw error;
      }
    }

    const startTime = Date.now();
    this.stats.totalRequests++;
    
    try {
      const result = await fn();
      
      this.onSuccess(Date.now() - startTime);
      return result;
      
    } catch (error) {
      this.onFailure(error, Date.now() - startTime);
      
      if (fallback && this.shouldUseFallback(error)) {
        logger.warn('Primary function failed, using fallback', {
          name: this.name,
          error: error.message
        });
        return await this.executeFallback(fallback);
      }
      
      throw error;
    }
  }

  canExecute() {
    switch (this.state) {
      case 'CLOSED':
        return true;
      
      case 'OPEN':
        if (Date.now() >= this.nextAttempt) {
          this.setState('HALF_OPEN');
          return true;
        }
        return false;
      
      case 'HALF_OPEN':
        return true;
      
      default:
        return false;
    }
  }

  onSuccess(duration) {
    this.recordResult(true, duration);
    this.stats.totalSuccesses++;
    
    switch (this.state) {
      case 'HALF_OPEN':
        this.successCount++;
        if (this.successCount >= 3) { // Require 3 successes to close
          this.setState('CLOSED');
          this.reset();
        }
        break;
      
      case 'CLOSED':
        this.reset();
        break;
    }
    
    logger.debug('Circuit breaker success', {
      name: this.name,
      state: this.state,
      duration
    });
  }

  onFailure(error, duration) {
    this.recordResult(false, duration, error);
    this.stats.totalFailures++;
    this.lastFailureTime = Date.now();
    
    // Don't count expected errors as failures
    if (this.isExpectedError(error)) {
      logger.debug('Expected error ignored by circuit breaker', {
        name: this.name,
        error: error.message
      });
      return;
    }
    
    this.failureCount++;
    
    switch (this.state) {
      case 'CLOSED':
      case 'HALF_OPEN':
        if (this.failureCount >= this.failureThreshold) {
          this.setState('OPEN');
          this.nextAttempt = Date.now() + this.resetTimeout;
        }
        break;
    }
    
    logger.warn('Circuit breaker failure recorded', {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      threshold: this.failureThreshold,
      error: error.message,
      duration
    });
  }

  setState(newState) {
    const oldState = this.state;
    this.state = newState;
    this.stats.lastStateChange = Date.now();
    
    this.stats.stateHistory.push({
      from: oldState,
      to: newState,
      timestamp: Date.now(),
      failureCount: this.failureCount
    });
    
    // Keep only last 20 state changes
    if (this.stats.stateHistory.length > 20) {
      this.stats.stateHistory = this.stats.stateHistory.slice(-20);
    }
    
    logger.info('Circuit breaker state changed', {
      name: this.name,
      from: oldState,
      to: newState,
      failureCount: this.failureCount
    });
  }

  reset() {
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
  }

  recordResult(success, duration, error = null) {
    const result = {
      success,
      duration,
      timestamp: Date.now(),
      error: error ? error.message : null
    };
    
    this.window.push(result);
    
    // Keep window size limited
    if (this.window.length > this.windowSize) {
      this.window.shift();
    }
  }

  isExpectedError(error) {
    if (!this.expectedErrors.length) return false;
    
    return this.expectedErrors.some(expectedError => {
      if (typeof expectedError === 'string') {
        return error.message.includes(expectedError);
      }
      if (expectedError instanceof Error) {
        return error.constructor === expectedError.constructor;
      }
      if (typeof expectedError === 'function') {
        return expectedError(error);
      }
      return false;
    });
  }

  shouldUseFallback(error) {
    // Use fallback for all errors when circuit is open
    if (this.state === 'OPEN') return true;
    
    // Use fallback for network/timeout errors
    const networkErrors = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET'];
    return networkErrors.some(code => error.code === code);
  }

  async executeFallback(fallback) {
    try {
      if (typeof fallback === 'function') {
        return await fallback();
      }
      return fallback;
    } catch (fallbackError) {
      logger.error('Fallback execution failed', {
        name: this.name,
        error: fallbackError.message
      });
      throw fallbackError;
    }
  }

  // Statistics and monitoring
  getStats() {
    const now = Date.now();
    const recentWindow = this.window.filter(result => 
      now - result.timestamp < this.monitoringPeriod
    );
    
    const recentFailures = recentWindow.filter(r => !r.success).length;
    const recentSuccesses = recentWindow.filter(r => r.success).length;
    const avgDuration = recentWindow.length > 0 
      ? recentWindow.reduce((sum, r) => sum + r.duration, 0) / recentWindow.length 
      : 0;
    
    return {
      name: this.name,
      state: this.state,
      currentFailureCount: this.failureCount,
      failureThreshold: this.failureThreshold,
      nextAttemptIn: this.state === 'OPEN' ? Math.max(0, this.nextAttempt - now) : 0,
      lastFailureTime: this.lastFailureTime,
      stats: {
        ...this.stats,
        recent: {
          requests: recentWindow.length,
          failures: recentFailures,
          successes: recentSuccesses,
          failureRate: recentWindow.length > 0 ? (recentFailures / recentWindow.length) * 100 : 0,
          avgDuration: Math.round(avgDuration)
        }
      }
    };
  }

  healthCheck() {
    const stats = this.getStats();
    const isHealthy = stats.state === 'CLOSED' && stats.stats.recent.failureRate < 50;
    
    return {
      healthy: isHealthy,
      state: stats.state,
      failureRate: stats.stats.recent.failureRate,
      message: isHealthy 
        ? 'Circuit breaker is healthy' 
        : `Circuit breaker is ${stats.state.toLowerCase()}, failure rate: ${stats.stats.recent.failureRate}%`
    };
  }

  // Manual controls
  forceOpen() {
    this.setState('OPEN');
    this.nextAttempt = Date.now() + this.resetTimeout;
    logger.warn('Circuit breaker manually forced OPEN', { name: this.name });
  }

  forceClose() {
    this.setState('CLOSED');
    this.reset();
    logger.info('Circuit breaker manually forced CLOSED', { name: this.name });
  }

  forceHalfOpen() {
    this.setState('HALF_OPEN');
    this.successCount = 0;
    logger.info('Circuit breaker manually set to HALF_OPEN', { name: this.name });
  }
}

// Circuit breaker factory and registry
class CircuitBreakerRegistry {
  constructor() {
    this.breakers = new Map();
  }

  create(name, options = {}) {
    if (this.breakers.has(name)) {
      return this.breakers.get(name);
    }

    const breaker = new CircuitBreaker({ ...options, name });
    this.breakers.set(name, breaker);
    
    return breaker;
  }

  get(name) {
    return this.breakers.get(name);
  }

  remove(name) {
    return this.breakers.delete(name);
  }

  list() {
    return Array.from(this.breakers.keys());
  }

  getAllStats() {
    const stats = {};
    for (const [name, breaker] of this.breakers.entries()) {
      stats[name] = breaker.getStats();
    }
    return stats;
  }

  healthCheck() {
    const health = {};
    let overallHealthy = true;
    
    for (const [name, breaker] of this.breakers.entries()) {
      const breakerHealth = breaker.healthCheck();
      health[name] = breakerHealth;
      
      if (!breakerHealth.healthy) {
        overallHealthy = false;
      }
    }
    
    return {
      overall: overallHealthy,
      breakers: health
    };
  }
}

// Singleton registry
const registry = new CircuitBreakerRegistry();

// Convenience functions for common external services
const createWebSearchBreaker = () => registry.create('web-search', {
  failureThreshold: 3,
  resetTimeout: 30000,
  expectedErrors: ['rate limit', 'quota exceeded']
});

const createLLMBreaker = () => registry.create('llm-service', {
  failureThreshold: 5,
  resetTimeout: 60000,
  expectedErrors: ['context length exceeded', 'content policy']
});

const createImageGenBreaker = () => registry.create('image-generation', {
  failureThreshold: 2,
  resetTimeout: 45000,
  expectedErrors: ['content policy', 'safety filter']
});

const createDatabaseBreaker = () => registry.create('database', {
  failureThreshold: 3,
  resetTimeout: 10000,
  expectedErrors: []
});

module.exports = {
  CircuitBreaker,
  registry,
  createWebSearchBreaker,
  createLLMBreaker,
  createImageGenBreaker,
  createDatabaseBreaker
};
