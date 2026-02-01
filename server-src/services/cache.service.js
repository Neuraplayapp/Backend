// Multi-Level Caching Strategy Service
const Redis = require('redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.levels = {
      L1: 'memory',     // In-memory cache (fastest)
      L2: 'redis',      // Redis cache (fast, persistent)
      L3: 'database'    // Database cache (slower, most persistent)
    };
    
    // In-memory cache (L1)
    this.memoryCache = new Map();
    this.memoryCacheConfig = {
      maxSize: parseInt(process.env.MEMORY_CACHE_SIZE) || 1000,
      ttl: parseInt(process.env.MEMORY_CACHE_TTL) || 300000, // 5 minutes
      cleanupInterval: 60000 // 1 minute
    };
    
    // Redis client (L2)
    this.redisClient = null;
    this.redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      db: process.env.REDIS_CACHE_DB || 1,
      keyPrefix: 'neuraplay:cache:',
      defaultTTL: parseInt(process.env.REDIS_CACHE_TTL) || 3600 // 1 hour
    };
    
    // Cache statistics
    this.stats = {
      hits: { L1: 0, L2: 0, L3: 0 },
      misses: { L1: 0, L2: 0, L3: 0 },
      sets: { L1: 0, L2: 0, L3: 0 },
      deletes: { L1: 0, L2: 0, L3: 0 },
      errors: { L1: 0, L2: 0, L3: 0 }
    };
    
    this.initialize();
  }

  async initialize() {
    try {
      // Initialize Redis connection
      await this.initializeRedis();
      
      // Start memory cache cleanup
      this.startMemoryCacheCleanup();
      
      logger.info('Cache service initialized', {
        levels: Object.keys(this.levels),
        memoryMaxSize: this.memoryCacheConfig.maxSize,
        redisHost: this.redisConfig.host
      });
      
    } catch (error) {
      logger.error('Cache service initialization failed', { error });
    }
  }

  async initializeRedis() {
    try {
      // Check if Redis is explicitly disabled
      if (process.env.REDIS_DISABLED === 'true' || process.env.DISABLE_REDIS === 'true') {
        logger.info('⚠️ Redis explicitly disabled, skipping Redis initialization');
        this.redisClient = null;
        return;
      }
      
      // Determine Redis connection URL
      const redisUrl = process.env.RENDER_REDIS_URL || 
                      process.env.REDIS_URL || 
                      `redis://${this.redisConfig.host}:${this.redisConfig.port}`;
      
      logger.info('🔄 Attempting Redis connection', { 
        hasRenderUrl: !!process.env.RENDER_REDIS_URL,
        hasRedisUrl: !!process.env.REDIS_URL,
        usingUrl: redisUrl.replace(/redis:\/\/[^@]*@/, 'redis://***@') // Hide credentials
      });
      
      this.redisClient = Redis.createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 10000,
          lazyConnect: false,
          reconnectDelayOnFailover: 1000
        },
        retry_strategy: (options) => {
          logger.debug('Redis retry attempt', { 
            attempt: options.attempt, 
            totalRetryTime: options.total_retry_time,
            error: options.error?.code 
          });
          
          if (options.total_retry_time > 1000 * 10) { // 10 seconds max
            logger.warn('Redis retry time exhausted - disabling Redis and using PostgreSQL only');
            this.redisClient = null;
            return undefined;
          }
          
          if (options.attempt > 3) {
            logger.warn('Redis max attempts reached - disabling Redis and using PostgreSQL only');
            this.redisClient = null;
            return undefined;
          }
          
          // Exponential backoff
          return Math.min(options.attempt * 2000, 5000);
        }
      });

      this.redisClient.on('connect', () => {
        logger.info('🔥 Redis (Hot Layer) connected successfully!');
      });

      this.redisClient.on('ready', () => {
        logger.info('🔥 Redis (Hot Layer) ready for commands');
      });

      this.redisClient.on('error', (error) => {
        // Only log significant errors, not connection retries
        if (error.code !== 'ECONNREFUSED' || this.redisErrorCount === 0) {
          logger.warn('Redis cache error', { 
            error: error.message, 
            code: error.code
          });
        }
        
        // Track error count to disable after too many failures
        this.redisErrorCount = (this.redisErrorCount || 0) + 1;
        
        if (this.redisErrorCount > 10) {
          logger.warn('Too many Redis errors - disabling Redis completely');
          this.redisClient = null;
        }
      });

      this.redisClient.on('end', () => {
        logger.warn('Redis connection ended');
      });

      this.redisClient.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
      });

      await this.redisClient.connect();
      
      // Test the connection
      await this.redisClient.ping();
      logger.info('🔥 Redis (Hot Layer) ping successful - fully operational!');
      
    } catch (error) {
      logger.warn('Redis initialization failed - using PostgreSQL fallback', { 
        error: error.message,
        code: error.code
      });
      this.redisClient = null;
    }
  }

  startMemoryCacheCleanup() {
    setInterval(() => {
      this.cleanupMemoryCache();
    }, this.memoryCacheConfig.cleanupInterval);
  }

  cleanupMemoryCache() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expires) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }
    
    // If cache is still too large, remove oldest entries
    if (this.memoryCache.size > this.memoryCacheConfig.maxSize) {
      const entries = Array.from(this.memoryCache.entries())
        .sort((a, b) => a[1].accessed - b[1].accessed);
      
      const toRemove = this.memoryCache.size - this.memoryCacheConfig.maxSize;
      for (let i = 0; i < toRemove; i++) {
        this.memoryCache.delete(entries[i][0]);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.debug('Memory cache cleanup completed', { 
        cleaned, 
        remaining: this.memoryCache.size 
      });
    }
  }

  // Core caching methods
  async get(key, options = {}) {
    const cacheKey = this.buildKey(key, options.namespace);
    
    try {
      // L1: Memory cache
      const memoryResult = await this.getFromMemory(cacheKey);
      if (memoryResult !== null) {
        this.stats.hits.L1++;
        logger.trace('Cache hit L1', { key: cacheKey });
        return memoryResult;
      }
      this.stats.misses.L1++;

      // L2: Redis cache
      if (this.redisClient) {
        const redisResult = await this.getFromRedis(cacheKey);
        if (redisResult !== null) {
          this.stats.hits.L2++;
          logger.trace('Cache hit L2', { key: cacheKey });
          
          // Promote to L1
          await this.setInMemory(cacheKey, redisResult, options.ttl);
          return redisResult;
        }
        this.stats.misses.L2++;
      }

      // L3: Database cache (if specified)
      if (options.databaseFallback) {
        const dbResult = await this.getFromDatabase(cacheKey, options);
        if (dbResult !== null) {
          this.stats.hits.L3++;
          logger.trace('Cache hit L3', { key: cacheKey });
          
          // Promote to L2 and L1
          await this.setInRedis(cacheKey, dbResult, options.ttl);
          await this.setInMemory(cacheKey, dbResult, options.ttl);
          return dbResult;
        }
        this.stats.misses.L3++;
      }

      logger.trace('Cache miss all levels', { key: cacheKey });
      return null;
      
    } catch (error) {
      logger.error('Cache get error', { key: cacheKey, error });
      return null;
    }
  }

  async set(key, value, options = {}) {
    const cacheKey = this.buildKey(key, options.namespace);
    const ttl = options.ttl || this.memoryCacheConfig.ttl;
    
    try {
      // Set in all available levels
      const promises = [];
      
      // L1: Memory
      promises.push(this.setInMemory(cacheKey, value, ttl));
      
      // L2: Redis
      if (this.redisClient && options.redis !== false) {
        promises.push(this.setInRedis(cacheKey, value, options.redisTTL || ttl));
      }
      
      // L3: Database (if specified)
      if (options.database) {
        promises.push(this.setInDatabase(cacheKey, value, options));
      }
      
      await Promise.allSettled(promises);
      
      logger.trace('Cache set completed', { key: cacheKey, ttl });
      return true;
      
    } catch (error) {
      logger.error('Cache set error', { key: cacheKey, error });
      return false;
    }
  }

  async delete(key, options = {}) {
    const cacheKey = this.buildKey(key, options.namespace);
    
    try {
      const promises = [];
      
      // Delete from all levels
      promises.push(this.deleteFromMemory(cacheKey));
      
      if (this.redisClient) {
        promises.push(this.deleteFromRedis(cacheKey));
      }
      
      if (options.database) {
        promises.push(this.deleteFromDatabase(cacheKey, options));
      }
      
      await Promise.allSettled(promises);
      
      logger.trace('Cache delete completed', { key: cacheKey });
      return true;
      
    } catch (error) {
      logger.error('Cache delete error', { key: cacheKey, error });
      return false;
    }
  }

  // L1: Memory cache operations
  async getFromMemory(key) {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      this.memoryCache.delete(key);
      return null;
    }
    
    entry.accessed = Date.now();
    return entry.value;
  }

  async setInMemory(key, value, ttl) {
    const expires = Date.now() + (ttl || this.memoryCacheConfig.ttl);
    
    this.memoryCache.set(key, {
      value,
      expires,
      accessed: Date.now(),
      created: Date.now()
    });
    
    this.stats.sets.L1++;
    return true;
  }

  async deleteFromMemory(key) {
    const deleted = this.memoryCache.delete(key);
    if (deleted) this.stats.deletes.L1++;
    return deleted;
  }

  // L2: Redis cache operations
  async getFromRedis(key) {
    if (!this.redisClient) return null;
    
    try {
      const result = await this.redisClient.get(this.redisConfig.keyPrefix + key);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      this.stats.errors.L2++;
      logger.error('Redis get error', { key, error });
      return null;
    }
  }

  async setInRedis(key, value, ttl) {
    if (!this.redisClient) return false;
    
    try {
      const serialized = JSON.stringify(value);
      const redisTTL = Math.floor((ttl || this.redisConfig.defaultTTL) / 1000);
      
      await this.redisClient.setEx(
        this.redisConfig.keyPrefix + key,
        redisTTL,
        serialized
      );
      
      this.stats.sets.L2++;
      return true;
    } catch (error) {
      this.stats.errors.L2++;
      logger.error('Redis set error', { key, error });
      return false;
    }
  }

  async deleteFromRedis(key) {
    if (!this.redisClient) return false;
    
    try {
      const deleted = await this.redisClient.del(this.redisConfig.keyPrefix + key);
      if (deleted) this.stats.deletes.L2++;
      return deleted > 0;
    } catch (error) {
      this.stats.errors.L2++;
      logger.error('Redis delete error', { key, error });
      return false;
    }
  }

  // L3: Database cache operations (placeholder for database integration)
  async getFromDatabase(key, options) {
    // This would integrate with your database service
    // For now, return null (no database cache)
    return null;
  }

  async setInDatabase(key, value, options) {
    // This would store cache in database
    // For now, return false (no database cache)
    return false;
  }

  async deleteFromDatabase(key, options) {
    // This would delete cache from database
    // For now, return false (no database cache)
    return false;
  }

  // Utility methods
  buildKey(key, namespace) {
    return namespace ? `${namespace}:${key}` : key;
  }

  // High-level caching patterns
  async getOrSet(key, fetchFunction, options = {}) {
    const cached = await this.get(key, options);
    
    if (cached !== null) {
      return cached;
    }
    
    // Fetch fresh data
    const freshData = await fetchFunction();
    
    if (freshData !== null && freshData !== undefined) {
      await this.set(key, freshData, options);
    }
    
    return freshData;
  }

  async mget(keys, options = {}) {
    const results = {};
    
    for (const key of keys) {
      results[key] = await this.get(key, options);
    }
    
    return results;
  }

  async mset(keyValuePairs, options = {}) {
    const promises = Object.entries(keyValuePairs).map(([key, value]) =>
      this.set(key, value, options)
    );
    
    const results = await Promise.allSettled(promises);
    return results.every(result => result.status === 'fulfilled' && result.value);
  }

  // Cache warming
  async warmCache(keyValuePairs, options = {}) {
    logger.info('Cache warming started', { keys: Object.keys(keyValuePairs).length });
    
    const results = await this.mset(keyValuePairs, {
      ...options,
      ttl: options.warmTTL || this.memoryCacheConfig.ttl * 2
    });
    
    logger.info('Cache warming completed', { success: results });
    return results;
  }

  // Cache invalidation patterns
  async invalidatePattern(pattern, options = {}) {
    let invalidated = 0;
    
    // Memory cache
    for (const key of this.memoryCache.keys()) {
      if (this.matchesPattern(key, pattern)) {
        await this.deleteFromMemory(key);
        invalidated++;
      }
    }
    
    // Redis cache
    if (this.redisClient && options.redis !== false) {
      try {
        const keys = await this.redisClient.keys(this.redisConfig.keyPrefix + pattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
          invalidated += keys.length;
        }
      } catch (error) {
        logger.error('Redis pattern invalidation error', { pattern, error });
      }
    }
    
    logger.info('Cache pattern invalidated', { pattern, invalidated });
    return invalidated;
  }

  matchesPattern(key, pattern) {
    // Simple glob-like pattern matching
    const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
    return regex.test(key);
  }

  // Statistics and monitoring
  getStats() {
    return {
      stats: this.stats,
      memoryCache: {
        size: this.memoryCache.size,
        maxSize: this.memoryCacheConfig.maxSize,
        utilization: (this.memoryCache.size / this.memoryCacheConfig.maxSize) * 100
      },
      redis: {
        connected: !!this.redisClient,
        host: this.redisConfig.host,
        db: this.redisConfig.db
      },
      hitRates: {
        L1: this.calculateHitRate('L1'),
        L2: this.calculateHitRate('L2'),
        L3: this.calculateHitRate('L3'),
        overall: this.calculateOverallHitRate()
      }
    };
  }

  calculateHitRate(level) {
    const hits = this.stats.hits[level];
    const total = hits + this.stats.misses[level];
    return total > 0 ? (hits / total) * 100 : 0;
  }

  calculateOverallHitRate() {
    const totalHits = Object.values(this.stats.hits).reduce((sum, hits) => sum + hits, 0);
    const totalMisses = Object.values(this.stats.misses).reduce((sum, misses) => sum + misses, 0);
    const total = totalHits + totalMisses;
    return total > 0 ? (totalHits / total) * 100 : 0;
  }

  // Health check
  healthCheck() {
    const stats = this.getStats();
    
    return {
      cache: {
        healthy: true,
        levels: {
          memory: true,
          redis: !!this.redisClient,
          database: false // Not implemented yet
        },
        hitRate: stats.hitRates.overall,
        memoryUtilization: stats.memoryCache.utilization
      }
    };
  }

  // Cleanup and shutdown
  async shutdown() {
    logger.info('Cache service shutting down...');
    
    if (this.redisClient) {
      await this.redisClient.quit();
    }
    
    this.memoryCache.clear();
    
    logger.info('Cache service shutdown completed');
  }
}

module.exports = new CacheService();
