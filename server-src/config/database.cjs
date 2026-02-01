// Layered Database Configuration for Agentic AI System
const { Pool } = require('pg');
const Redis = require('redis');
const knex = require('knex');

class DatabaseManager {
  constructor() {
    this.postgres = null;
    this.redis = null;
    this.vectorDb = null;
    this.queryBuilder = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    console.log('🏗️ Initializing layered database architecture...');

    // Initialize services in order, with error handling
    const results = {
      postgres: false,
      redis: false,
      vector: false
    };

    // 1. PostgreSQL (Warm Layer - Primary Storage)
    try {
      await this.initializePostgreSQL();
      results.postgres = true;
    } catch (error) {
      console.warn('⚠️ PostgreSQL unavailable in development mode:', error.message);
    }
    
    // 2. Redis (Hot Layer - Cache & Session State)  
    try {
      await this.initializeRedis();
      results.redis = true;
    } catch (error) {
      console.warn('⚠️ Redis unavailable, using in-memory fallback:', error.message);
    }
    
    // 3. Vector Database (Semantic Search)
    try {
      await this.initializeVectorDB();
      results.vector = true;
    } catch (error) {
      console.warn('⚠️ Vector DB unavailable, using basic search:', error.message);
    }

    this.initialized = true;
    
    console.log('✅ Database architecture initialized:');
    console.log(`   📊 PostgreSQL: ${results.postgres ? '✅' : '❌'}`);
    console.log(`   🔥 Redis: ${results.redis ? '✅' : '❌'}`);  
    console.log(`   🧠 Vector: ${results.vector ? '✅' : '❌'}`);
    
    if (!results.postgres && !results.redis) {
      console.warn('⚠️ No databases available - running in minimal mode');
    }
  }

  async initializePostgreSQL() {
    try {
      // Skip PostgreSQL in development if no connection string provided
      if (!process.env.RENDER_POSTGRES_URL && !process.env.DATABASE_URL && process.env.NODE_ENV === 'development') {
        console.log('⚠️ PostgreSQL not configured for development, skipping database layer');
        this.postgres = null;
        this.queryBuilder = null;
        return;
      }

      // Determine SSL requirements based on connection URL
      const connectionString = process.env.RENDER_POSTGRES_URL || process.env.DATABASE_URL;
      const needsSSL = connectionString && (
        connectionString.includes('render.com') || 
        connectionString.includes('heroku') || 
        connectionString.includes('.com/') ||
        process.env.POSTGRES_SSL === 'true'
      );

      this.postgres = new Pool({
        connectionString: connectionString,
        ssl: needsSSL ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      this.queryBuilder = knex({
        client: 'pg',
        connection: {
          connectionString: connectionString,
          ssl: needsSSL ? { rejectUnauthorized: false } : false,
        },
        pool: {
          min: 2,
          max: 20
        }
      });

      // Test connection
      const client = await this.postgres.connect();
      await client.query('SELECT NOW()');
      client.release();

      console.log('📊 PostgreSQL (Warm Layer) connected');
    } catch (error) {
      console.error('❌ PostgreSQL connection failed:', error);
      throw error;
    }
  }

  async initializeRedis() {
    try {
      // Check if Redis is explicitly disabled
      if (process.env.REDIS_DISABLED === 'true' || process.env.DISABLE_REDIS === 'true') {
        console.log('⚠️ Redis explicitly disabled, using in-memory cache');
        this.redis = new Map();
        return;
      }
      
      const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || 'redis://localhost:6379';
      
      // Don't try Redis in development unless explicitly set
      if (!process.env.REDIS_URL && !process.env.UPSTASH_REDIS_URL && process.env.NODE_ENV === 'development') {
        console.log('⚠️ Redis not configured for development, using in-memory cache');
        this.redis = new Map();
        return;
      }
      
      this.redis = Redis.createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 3000,
          reconnectStrategy: (retries) => {
            if (retries > 3) return false; // Stop reconnecting after 3 attempts
            return Math.min(retries * 1000, 3000);
          }
        }
      });

      this.redis.on('error', (err) => {
        if (err.code === 'ECONNREFUSED') {
          console.warn('⚠️ Redis unavailable, falling back to in-memory cache');
          this.redis = new Map();
        } else {
          console.error('Redis Client Error:', err);
        }
      });

      this.redis.on('connect', () => {
        console.log('🔥 Redis (Hot Layer) connected');
      });

      // Add timeout to connection attempt
      const connectPromise = this.redis.connect();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);

      // Test Redis
      await this.redis.set('health_check', 'ok', { EX: 60 });
      
    } catch (error) {
      console.warn('⚠️ Redis not available, using in-memory cache fallback:', error.message);
      // Fallback to in-memory cache
      this.redis = new Map();
    }
  }

  async initializeVectorDB() {
    try {
      // For now, we'll use pgvector extension in PostgreSQL
      // In production, you'd use Pinecone, Weaviate, or Qdrant
      
      const client = await this.postgres.connect();
      
      // Try to create vector extension (may fail if not available)
      try {
        await client.query('CREATE EXTENSION IF NOT EXISTS vector');
        console.log('🧠 Vector search (pgvector) enabled');
        this.vectorDb = 'pgvector';
      } catch (vectorError) {
        console.warn('⚠️ Vector extension not available, using fallback search');
        this.vectorDb = 'fallback';
      }
      
      client.release();
      
    } catch (error) {
      console.warn('⚠️ Vector DB initialization failed:', error);
      this.vectorDb = 'fallback';
    }
  }

  // Hot Layer (Redis) - Session State & Cache
  async getHotData(key, fallbackFn = null) {
    try {
      if (this.redis instanceof Map) {
        // In-memory fallback
        return this.redis.get(key) || (fallbackFn ? await fallbackFn() : null);
      }
      
      const data = await this.redis.get(key);
      if (data) {
        return JSON.parse(data);
      }
      
      // Cache miss - try fallback
      if (fallbackFn) {
        const result = await fallbackFn();
        if (result) {
          await this.setHotData(key, result, 300); // 5 min cache
        }
        return result;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Hot data read error:', error);
      return fallbackFn ? await fallbackFn() : null;
    }
  }

  async setHotData(key, value, ttlSeconds = 300) {
    try {
      if (this.redis instanceof Map) {
        // In-memory fallback
        this.redis.set(key, value);
        setTimeout(() => this.redis.delete(key), ttlSeconds * 1000);
        return;
      }
      
      await this.redis.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.error('❌ Hot data write error:', error);
    }
  }

  async deleteHotData(key) {
    try {
      if (this.redis instanceof Map) {
        this.redis.delete(key);
        return;
      }
      
      await this.redis.del(key);
    } catch (error) {
      console.error('❌ Hot data delete error:', error);
    }
  }

  // Warm Layer (PostgreSQL) - Primary Storage
  async getWarmData(table, filters = {}) {
    try {
      let query = this.queryBuilder(table);
      
      Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          query = query.whereIn(key, value);
        } else {
          query = query.where(key, value);
        }
      });
      
      return await query.select('*').orderBy('updated_at', 'desc');
    } catch (error) {
      console.error('❌ Warm data read error:', error);
      throw error;
    }
  }

  async setWarmData(table, data) {
    try {
      return await this.queryBuilder(table)
        .insert(data)
        .onConflict('id')
        .merge()
        .returning('*');
    } catch (error) {
      console.error('❌ Warm data write error:', error);
      throw error;
    }
  }

  // Vector/Semantic Search
  async semanticSearch(query, table = 'context_store', limit = 10) {
    try {
      if (this.vectorDb === 'pgvector') {
        // Use pgvector for semantic search
        const client = await this.postgres.connect();
        
        // This would need actual embedding generation
        // For now, we'll do text similarity search
        const result = await client.query(`
          SELECT *, similarity(context_value::text, $1) as score
          FROM ${table} 
          WHERE similarity(context_value::text, $1) > 0.1
          ORDER BY score DESC 
          LIMIT $2
        `, [query, limit]);
        
        client.release();
        return result.rows;
      } else {
        // Fallback to simple text search
        return await this.queryBuilder(table)
          .where('context_value', 'like', `%${query}%`)
          .limit(limit);
      }
    } catch (error) {
      console.error('❌ Semantic search error:', error);
      return [];
    }
  }

  // Session Management with Hot/Warm Pattern
  async getSession(sessionId) {
    // 1. Try hot layer first (Redis)
    const hotSession = await this.getHotData(`session:${sessionId}`);
    if (hotSession) {
      return hotSession;
    }

    // 2. Fallback to warm layer (PostgreSQL)
    const warmSessions = await this.getWarmData('agent_sessions', { id: sessionId });
    const session = warmSessions[0];
    
    if (session) {
      // Cache in hot layer for next time
      await this.setHotData(`session:${sessionId}`, session, 600); // 10 min
    }
    
    return session;
  }

  async saveSession(sessionData) {
    // 1. Save to warm layer (PostgreSQL) - primary
    await this.setWarmData('agent_sessions', sessionData);
    
    // 2. Update hot layer (Redis) - cache
    await this.setHotData(`session:${sessionData.id}`, sessionData, 600);
  }

  // Health check for all layers
  async healthCheck() {
    const health = {
      postgres: false,
      redis: false,
      vector: false,
      timestamp: new Date().toISOString()
    };

    try {
      // Check PostgreSQL
      const client = await this.postgres.connect();
      await client.query('SELECT 1');
      client.release();
      health.postgres = true;
    } catch (error) {
      console.error('PostgreSQL health check failed:', error);
    }

    try {
      // Check Redis
      if (this.redis instanceof Map) {
        health.redis = true; // In-memory fallback
      } else {
        await this.redis.ping();
        health.redis = true;
      }
    } catch (error) {
      console.error('Redis health check failed:', error);
    }

    health.vector = this.vectorDb !== 'fallback';

    return health;
  }

  async close() {
    if (this.postgres) await this.postgres.end();
    if (this.redis && typeof this.redis.quit === 'function') await this.redis.quit();
    if (this.queryBuilder) await this.queryBuilder.destroy();
  }
}

module.exports = new DatabaseManager();
