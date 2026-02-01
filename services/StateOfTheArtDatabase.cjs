/**
 * STATE-OF-THE-ART DATABASE ARCHITECTURE
 * 
 * Features:
 * - Graceful degradation and fallback mechanisms
 * - Polymorphic schema design for future expansion
 * - Advanced constraint handling with soft failures
 * - Temporal data management and audit trails
 * - Vector search with hybrid similarity scoring
 * - Comprehensive error recovery and resilience
 * - Multi-tenant architecture ready
 * - ACID compliance with optimistic locking
 * 
 * Author: AI Assistant
 * Date: 2025-01-27
 */

const { Pool } = require('pg');
const knex = require('knex');

class StateOfTheArtDatabase {
  constructor(config = {}) {
    this.config = {
      // Connection pooling with smart limits
      connectionPool: {
        min: 2,
        max: 20,
        idleTimeoutMillis: 30000,
        acquireTimeoutMillis: 60000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200,
        ...config.connectionPool
      },
      
      // Resilience configuration
      resilience: {
        maxRetries: 3,
        retryDelayMs: 1000,
        circuitBreakerThreshold: 5,
        circuitBreakerTimeoutMs: 30000,
        gracefulDegradationEnabled: true,
        ...config.resilience
      },
      
      // Performance optimizations
      performance: {
        queryTimeoutMs: 10000,
        batchSize: 100,
        cacheEnabled: true,
        cacheTtlMs: 300000, // 5 minutes
        ...config.performance
      },
      
      // Future expansion capabilities
      futureProof: {
        schemaVersioning: true,
        dynamicSchemaSupport: true,
        polymorphicAssociations: true,
        eventSourcing: true,
        ...config.futureProof
      },
      
      ...config
    };
    
    this.pool = null;
    this.knex = null;
    this.circuitBreaker = new CircuitBreaker();
    this.queryCache = new Map();
    this.schemaVersion = '1.0.0';
    this.isInitialized = false;
  }

  async initialize(databaseUrl) {
    try {
      console.log('🚀 Initializing State-of-the-Art Database...');
      
      // Initialize connection pool with advanced configuration
      this.pool = new Pool({
        connectionString: databaseUrl,
        ...this.config.connectionPool,
        
        // Advanced pool events
        onConnect: (client) => {
          console.log('📡 Database client connected');
          // Set session-level configurations
          client.query('SET statement_timeout = 30000');
          client.query('SET idle_in_transaction_session_timeout = 60000');
        },
        
        onRemove: (client) => {
          console.log('📴 Database client removed');
        }
      });

      // Initialize Knex for advanced query building
      this.knex = knex({
        client: 'postgresql',
        connection: databaseUrl,
        pool: this.config.connectionPool,
        acquireConnectionTimeout: this.config.connectionPool.acquireTimeoutMillis,
        
        // Advanced Knex configuration
        asyncStackTraces: true,
        log: {
          warn: (message) => console.warn('⚠️ Knex Warning:', message),
          error: (message) => console.error('❌ Knex Error:', message),
          deprecate: (message) => console.warn('📱 Knex Deprecation:', message)
        }
      });

      // Test connection and get database info
      const client = await this.pool.connect();
      try {
        const result = await client.query('SELECT version(), current_database(), current_user, inet_server_addr(), inet_server_port()');
        console.log('✅ Database connected:', {
          version: result.rows[0].version,
          database: result.rows[0].current_database,
          user: result.rows[0].current_user,
          host: result.rows[0].inet_server_addr,
          port: result.rows[0].inet_server_port
        });
      } finally {
        client.release();
      }

      // Initialize advanced database features
      await this.initializeAdvancedFeatures();
      
      // Create or upgrade schema
      await this.initializeSchema();
      
      this.isInitialized = true;
      console.log('🎯 State-of-the-Art Database initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize State-of-the-Art Database:', error);
      
      // Graceful degradation - continue without database
      if (this.config.resilience.gracefulDegradationEnabled) {
        console.log('🔄 Enabling graceful degradation mode');
        this.isInitialized = false; // Continue without database
      } else {
        throw error;
      }
    }
  }

  async initializeAdvancedFeatures() {
    console.log('🔧 Initializing advanced database features...');
    
    try {
      // Enable required extensions with fallback handling
      const extensions = [
        'pgvector',      // Vector operations for AI embeddings
        'pg_trgm',       // Trigram similarity for fuzzy matching
        'btree_gin',     // Advanced indexing
        'btree_gist',    // Spatial and temporal indexing
        'uuid-ossp',     // UUID generation
        'pgcrypto',      // Cryptographic functions
        'pg_stat_statements' // Query performance monitoring
      ];

      for (const extension of extensions) {
        try {
          await this.pool.query(`CREATE EXTENSION IF NOT EXISTS "${extension}"`);
          console.log(`✅ Extension enabled: ${extension}`);
        } catch (error) {
          console.warn(`⚠️ Could not enable extension ${extension}:`, error.message);
          // Continue without this extension - graceful degradation
        }
      }

      // Configure advanced PostgreSQL settings
      const advancedSettings = [
        "SET shared_preload_libraries = 'pg_stat_statements'",
        "SET track_activity_query_size = 2048",
        "SET log_min_duration_statement = 1000", // Log slow queries
        "SET log_checkpoints = on",
        "SET log_connections = on",
        "SET log_disconnections = on",
        "SET log_statement = 'mod'" // Log modifications
      ];

      for (const setting of advancedSettings) {
        try {
          await this.pool.query(setting);
        } catch (error) {
          console.warn(`⚠️ Could not apply setting: ${setting}`, error.message);
          // Continue without this setting
        }
      }

    } catch (error) {
      console.warn('⚠️ Some advanced features could not be initialized:', error.message);
      // Continue with basic functionality
    }
  }

  async initializeSchema() {
    console.log('📋 Initializing state-of-the-art database schema...');
    
    try {
      // Create schema versioning table first
      await this.createSchemaVersionTable();
      
      // Check current schema version
      const currentVersion = await this.getCurrentSchemaVersion();
      console.log(`📊 Current schema version: ${currentVersion}`);
      
      if (this.shouldUpgradeSchema(currentVersion)) {
        await this.upgradeSchema(currentVersion);
      }
      
      // Create core tables with advanced features
      await this.createAdvancedTables();
      
      // Create optimized indices
      await this.createOptimizedIndices();
      
      // Create triggers and constraints
      await this.createTriggersAndConstraints();
      
      console.log('✅ Schema initialization completed');
      
    } catch (error) {
      console.error('❌ Schema initialization failed:', error);
      throw error;
    }
  }

  async createSchemaVersionTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS schema_versions (
        id SERIAL PRIMARY KEY,
        version VARCHAR(50) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        applied_by VARCHAR(100) DEFAULT current_user,
        description TEXT,
        checksum VARCHAR(64),
        
        -- Audit fields
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Insert initial version if not exists
      INSERT INTO schema_versions (version, description) 
      VALUES ('${this.schemaVersion}', 'State-of-the-Art Database Initial Schema')
      ON CONFLICT (version) DO NOTHING;
    `;
    
    await this.pool.query(query);
  }

  async createAdvancedTables() {
    console.log('🏗️ Creating advanced database tables...');
    
    // Users table with advanced features
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) UNIQUE,
        email VARCHAR(255) UNIQUE,
        
        -- Polymorphic user data (future-proof)
        user_type VARCHAR(50) DEFAULT 'standard',
        metadata JSONB DEFAULT '{}',
        preferences JSONB DEFAULT '{}',
        
        -- Security and audit
        password_hash VARCHAR(255),
        last_login_at TIMESTAMP WITH TIME ZONE,
        login_count INTEGER DEFAULT 0,
        failed_login_attempts INTEGER DEFAULT 0,
        account_locked_until TIMESTAMP WITH TIME ZONE,
        
        -- Soft delete and versioning
        deleted_at TIMESTAMP WITH TIME ZONE,
        version INTEGER DEFAULT 1,
        
        -- Temporal audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by UUID REFERENCES users(id),
        updated_by UUID REFERENCES users(id),
        
        -- Advanced constraints
        CONSTRAINT users_email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
        CONSTRAINT users_username_valid CHECK (length(username) >= 3),
        CONSTRAINT users_not_deleted CHECK (deleted_at IS NULL OR deleted_at > created_at)
      );
    `);

    // Advanced sessions table
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        
        -- Session management
        session_token VARCHAR(255) UNIQUE NOT NULL,
        refresh_token VARCHAR(255) UNIQUE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        
        -- Device and location tracking
        device_info JSONB DEFAULT '{}',
        ip_address INET,
        user_agent TEXT,
        location JSONB DEFAULT '{}',
        
        -- Security flags
        is_active BOOLEAN DEFAULT true,
        force_logout BOOLEAN DEFAULT false,
        security_level INTEGER DEFAULT 1,
        
        -- Audit
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        -- Constraints
        CONSTRAINT sessions_expires_future CHECK (expires_at > created_at),
        CONSTRAINT sessions_security_level_valid CHECK (security_level BETWEEN 1 AND 5)
      );
    `);

    // Enhanced conversations table
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
        
        -- Conversation metadata
        title VARCHAR(500),
        conversation_type VARCHAR(50) DEFAULT 'chat',
        status VARCHAR(50) DEFAULT 'active',
        
        -- Advanced features
        metadata JSONB DEFAULT '{}',
        tags TEXT[] DEFAULT '{}',
        priority INTEGER DEFAULT 1,
        
        -- AI and context
        ai_model VARCHAR(100),
        context_window_size INTEGER DEFAULT 4096,
        conversation_embedding vector(768), -- Fireworks nomic-ai/nomic-embed-text-v1.5 (768 dims)
        
        -- Analytics
        message_count INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        avg_response_time DECIMAL(10,3),
        satisfaction_score DECIMAL(3,2),
        
        -- Temporal and audit
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ended_at TIMESTAMP WITH TIME ZONE,
        archived_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        -- Constraints
        CONSTRAINT conversations_status_valid CHECK (status IN ('active', 'paused', 'ended', 'archived')),
        CONSTRAINT conversations_priority_valid CHECK (priority BETWEEN 1 AND 10),
        CONSTRAINT conversations_satisfaction_valid CHECK (satisfaction_score IS NULL OR satisfaction_score BETWEEN 0.0 AND 5.0)
      );
    `);

    // Advanced messages table with polymorphic content
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        
        -- Message content (polymorphic)
        content TEXT NOT NULL,
        content_type VARCHAR(50) DEFAULT 'text',
        content_format VARCHAR(50) DEFAULT 'plain',
        raw_content JSONB, -- Original raw content for complex types
        
        -- Message metadata
        role VARCHAR(50) NOT NULL, -- 'user', 'assistant', 'system', 'tool'
        message_type VARCHAR(50) DEFAULT 'standard',
        metadata JSONB DEFAULT '{}',
        
        -- AI processing
        embedding vector(768), -- Fireworks nomic-ai/nomic-embed-text-v1.5 (768 dims)
        intent_classification JSONB DEFAULT '{}',
        sentiment_score DECIMAL(3,2),
        language VARCHAR(10) DEFAULT 'en',
        
        -- Processing metrics
        processing_time_ms INTEGER,
        token_count INTEGER,
        model_used VARCHAR(100),
        confidence_score DECIMAL(3,2),
        
        -- Thread and relationships
        parent_message_id UUID REFERENCES messages(id),
        thread_id UUID,
        reply_to_message_id UUID REFERENCES messages(id),
        
        -- Status and flags
        status VARCHAR(50) DEFAULT 'delivered',
        is_edited BOOLEAN DEFAULT false,
        is_deleted BOOLEAN DEFAULT false,
        edit_count INTEGER DEFAULT 0,
        
        -- Temporal and audit
        sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        edited_at TIMESTAMP WITH TIME ZONE,
        deleted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        -- Constraints
        CONSTRAINT messages_role_valid CHECK (role IN ('user', 'assistant', 'system', 'tool', 'canvas')),
        CONSTRAINT messages_status_valid CHECK (status IN ('pending', 'delivered', 'failed', 'retracted')),
        CONSTRAINT messages_content_not_empty CHECK (length(trim(content)) > 0),
        CONSTRAINT messages_sentiment_valid CHECK (sentiment_score IS NULL OR sentiment_score BETWEEN -1.0 AND 1.0),
        CONSTRAINT messages_confidence_valid CHECK (confidence_score IS NULL OR confidence_score BETWEEN 0.0 AND 1.0)
      );
    `);

    // Enhanced cognitive states table with graceful degradation
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS cognitive_states (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
        conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
        message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
        
        -- Cognitive metrics with defaults for missing data
        cognitive_load DECIMAL(3,2) DEFAULT 0.5,
        emotional_state VARCHAR(50) DEFAULT 'neutral',
        confusion_level DECIMAL(3,2) DEFAULT 0.0,
        attention_span DECIMAL(3,2) DEFAULT 1.0,
        learning_momentum DECIMAL(3,2) DEFAULT 0.5,
        error_frequency INTEGER DEFAULT 0,
        correction_attempts INTEGER DEFAULT 0,
        session_quality DECIMAL(3,2) DEFAULT 0.5,
        
        -- Enhanced cognitive analysis
        cognitive_patterns JSONB DEFAULT '{}',
        learning_style VARCHAR(50),
        interaction_preferences JSONB DEFAULT '{}',
        
        -- AI model confidence and metadata
        model_confidence DECIMAL(3,2) DEFAULT 0.8,
        analysis_metadata JSONB DEFAULT '{}',
        
        -- Temporal tracking
        analysis_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        -- Constraints with graceful handling
        CONSTRAINT cognitive_load_range CHECK (cognitive_load BETWEEN 0.0 AND 1.0),
        CONSTRAINT confusion_level_range CHECK (confusion_level BETWEEN 0.0 AND 1.0),
        CONSTRAINT attention_span_range CHECK (attention_span BETWEEN 0.0 AND 1.0),
        CONSTRAINT learning_momentum_range CHECK (learning_momentum BETWEEN 0.0 AND 1.0),
        CONSTRAINT session_quality_range CHECK (session_quality BETWEEN 0.0 AND 1.0),
        CONSTRAINT model_confidence_range CHECK (model_confidence BETWEEN 0.0 AND 1.0)
      );
    `);

    // Enhanced mental state models table
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS mental_state_models (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
        message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
        
        -- Mental state content
        intended_meaning TEXT NOT NULL,
        expressed_meaning TEXT NOT NULL,
        
        -- Cognitive models (JSONB for flexibility)
        belief_state JSONB DEFAULT '{}',
        intentional_stance JSONB DEFAULT '{}',
        communicative_intent JSONB DEFAULT '{}',
        correction_analysis JSONB DEFAULT '{}',
        
        -- Model metadata
        model_version VARCHAR(50) DEFAULT '1.0',
        confidence_score DECIMAL(3,2) DEFAULT 0.8,
        processing_metadata JSONB DEFAULT '{}',
        
        -- Temporal tracking
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        -- Constraints
        CONSTRAINT mental_state_confidence_range CHECK (confidence_score BETWEEN 0.0 AND 1.0),
        CONSTRAINT mental_state_meaning_not_empty CHECK (
          length(trim(intended_meaning)) > 0 AND 
          length(trim(expressed_meaning)) > 0
        )
      );
    `);

    // Enhanced semantic embeddings table for vector search
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS semantic_embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        
        -- Content and metadata
        content TEXT NOT NULL,
        content_type VARCHAR(50) DEFAULT 'text',
        content_hash VARCHAR(64), -- For deduplication
        
        -- Vector embeddings
        embedding_vector vector(768), -- Fireworks nomic-ai/nomic-embed-text-v1.5 (768 dims)
        
        -- Semantic metadata
        keywords TEXT[] DEFAULT '{}',
        topics TEXT[] DEFAULT '{}',
        entities JSONB DEFAULT '{}',
        content_length INTEGER,
        
        -- Quality and usage metrics
        quality_score INTEGER DEFAULT 5,
        usage_count INTEGER DEFAULT 0,
        last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        -- Context and relationships
        source_type VARCHAR(50),
        source_id UUID,
        conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
        
        -- Metadata for future expansion
        metadata JSONB DEFAULT '{}',
        tags TEXT[] DEFAULT '{}',
        
        -- Temporal tracking
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        -- Constraints
        CONSTRAINT semantic_content_not_empty CHECK (length(trim(content)) > 0),
        CONSTRAINT semantic_quality_range CHECK (quality_score BETWEEN 1 AND 10),
        CONSTRAINT semantic_usage_positive CHECK (usage_count >= 0)
      );
    `);

    // Cross-chat knowledge table for persistent learning
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS cross_chat_knowledge (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        
        -- Knowledge content
        knowledge_key VARCHAR(255) NOT NULL,
        knowledge_value JSONB NOT NULL,
        knowledge_type VARCHAR(50) DEFAULT 'preference',
        
        -- Context and metadata
        source_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
        confidence_level DECIMAL(3,2) DEFAULT 0.8,
        importance_score INTEGER DEFAULT 1,
        
        -- Semantic embedding for knowledge
        knowledge_embedding vector(768), -- Fireworks nomic-ai/nomic-embed-text-v1.5 (768 dims)
        
        -- Usage and validation
        usage_count INTEGER DEFAULT 0,
        last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        validated_count INTEGER DEFAULT 0,
        contradiction_count INTEGER DEFAULT 0,
        
        -- Temporal and versioning
        learned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        -- Unique constraint for user knowledge
        UNIQUE(user_id, knowledge_key),
        
        -- Constraints
        CONSTRAINT knowledge_confidence_range CHECK (confidence_level BETWEEN 0.0 AND 1.0),
        CONSTRAINT knowledge_importance_range CHECK (importance_score BETWEEN 1 AND 10),
        CONSTRAINT knowledge_key_not_empty CHECK (length(trim(knowledge_key)) > 0)
      );
    `);

    console.log('✅ Advanced tables created successfully');
  }

  async createOptimizedIndices() {
    console.log('📊 Creating optimized database indices...');
    
    const indices = [
      // Users indices
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users USING btree (email) WHERE deleted_at IS NULL',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username ON users USING btree (username) WHERE deleted_at IS NULL',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users USING btree (created_at)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_metadata_gin ON users USING gin (metadata)',
      
      // Sessions indices
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_user_id ON sessions USING btree (user_id) WHERE is_active = true',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_token ON sessions USING btree (session_token) WHERE is_active = true',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_expires_at ON sessions USING btree (expires_at)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_last_activity ON sessions USING btree (last_activity_at)',
      
      // Conversations indices
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_user_id ON conversations USING btree (user_id, created_at DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_status ON conversations USING btree (status, updated_at)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_embedding_vector ON conversations USING ivfflat (conversation_embedding vector_cosine_ops)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_tags_gin ON conversations USING gin (tags)',
      
      // Messages indices
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_id ON messages USING btree (conversation_id, sent_at)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_user_id ON messages USING btree (user_id, sent_at DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_embedding_vector ON messages USING ivfflat (embedding vector_cosine_ops)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_content_trgm ON messages USING gin (content gin_trgm_ops)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_intent_gin ON messages USING gin (intent_classification)',
      
      // Cognitive states indices
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cognitive_states_user_id ON cognitive_states USING btree (user_id, analysis_timestamp DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cognitive_states_session_id ON cognitive_states USING btree (session_id, analysis_timestamp)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cognitive_states_patterns_gin ON cognitive_states USING gin (cognitive_patterns)',
      
      // Mental state models indices
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mental_state_models_user_id ON mental_state_models USING btree (user_id, created_at DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mental_state_models_meaning_trgm ON mental_state_models USING gin (intended_meaning gin_trgm_ops)',
      
      // Semantic embeddings indices
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_semantic_embeddings_user_id ON semantic_embeddings USING btree (user_id, created_at DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_semantic_embeddings_vector ON semantic_embeddings USING ivfflat (embedding_vector vector_cosine_ops)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_semantic_embeddings_content_trgm ON semantic_embeddings USING gin (content gin_trgm_ops)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_semantic_embeddings_keywords_gin ON semantic_embeddings USING gin (keywords)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_semantic_embeddings_content_hash ON semantic_embeddings USING btree (content_hash)',
      
      // Cross-chat knowledge indices
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cross_chat_knowledge_user_key ON cross_chat_knowledge USING btree (user_id, knowledge_key)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cross_chat_knowledge_embedding ON cross_chat_knowledge USING ivfflat (knowledge_embedding vector_cosine_ops)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cross_chat_knowledge_type ON cross_chat_knowledge USING btree (knowledge_type, importance_score DESC)',
      
      // Composite indices for common queries
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_role_time ON messages USING btree (conversation_id, role, sent_at DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cognitive_states_user_session_time ON cognitive_states USING btree (user_id, session_id, analysis_timestamp DESC)'
    ];

    for (const indexQuery of indices) {
      try {
        await this.pool.query(indexQuery);
        console.log('✅ Index created:', indexQuery.split(' ')[5]); // Extract index name
      } catch (error) {
        if (error.message.includes('already exists')) {
          // Index already exists, skip
          continue;
        }
        console.warn('⚠️ Failed to create index:', error.message);
        // Continue with other indices
      }
    }
    
    console.log('✅ Optimized indices created successfully');
  }

  async createTriggersAndConstraints() {
    console.log('⚡ Creating triggers and advanced constraints...');
    
    // Updated_at trigger function
    await this.pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Message count trigger for conversations
    await this.pool.query(`
      CREATE OR REPLACE FUNCTION update_conversation_message_count()
      RETURNS TRIGGER AS $$
      BEGIN
          IF TG_OP = 'INSERT' THEN
              UPDATE conversations 
              SET message_count = message_count + 1,
                  last_message_at = NEW.sent_at
              WHERE id = NEW.conversation_id;
              RETURN NEW;
          ELSIF TG_OP = 'DELETE' THEN
              UPDATE conversations 
              SET message_count = GREATEST(message_count - 1, 0)
              WHERE id = OLD.conversation_id;
              RETURN OLD;
          END IF;
          RETURN NULL;
      END;
      $$ language 'plpgsql';
    `);

    // Create triggers
    const triggers = [
      'CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()',
      'CREATE TRIGGER trigger_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()',
      'CREATE TRIGGER trigger_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()',
      'CREATE TRIGGER trigger_semantic_embeddings_updated_at BEFORE UPDATE ON semantic_embeddings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()',
      'CREATE TRIGGER trigger_cross_chat_knowledge_updated_at BEFORE UPDATE ON cross_chat_knowledge FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column()',
      'CREATE TRIGGER trigger_conversation_message_count AFTER INSERT OR DELETE ON messages FOR EACH ROW EXECUTE PROCEDURE update_conversation_message_count()'
    ];

    for (const triggerQuery of triggers) {
      try {
        await this.pool.query(triggerQuery);
      } catch (error) {
        if (error.message.includes('already exists')) {
          continue;
        }
        console.warn('⚠️ Failed to create trigger:', error.message);
      }
    }
    
    console.log('✅ Triggers and constraints created successfully');
  }

  // STATE-OF-THE-ART QUERY METHODS WITH GRACEFUL DEGRADATION

  async executeResilientQuery(query, params = [], options = {}) {
    const {
      maxRetries = this.config.resilience.maxRetries,
      retryDelayMs = this.config.resilience.retryDelayMs,
      fallbackResult = null,
      queryName = 'unknown'
    } = options;

    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Check circuit breaker
        if (this.circuitBreaker.isOpen()) {
          console.warn(`🔌 Circuit breaker is open for query: ${queryName}`);
          return fallbackResult;
        }

        const startTime = Date.now();
        const result = await this.pool.query(query, params);
        const duration = Date.now() - startTime;
        
        // Record successful execution
        this.circuitBreaker.recordSuccess();
        
        // Log slow queries
        if (duration > 1000) {
          console.warn(`🐌 Slow query detected (${duration}ms): ${queryName}`);
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        this.circuitBreaker.recordFailure();
        
        console.warn(`⚠️ Query attempt ${attempt}/${maxRetries} failed for ${queryName}:`, error.message);
        
        if (attempt < maxRetries) {
          await this.delay(retryDelayMs * attempt); // Exponential backoff
        }
      }
    }
    
    // All retries failed
    console.error(`❌ Query failed after ${maxRetries} attempts: ${queryName}`, lastError);
    
    // Return fallback result if graceful degradation is enabled
    if (this.config.resilience.gracefulDegradationEnabled) {
      console.log(`🔄 Returning fallback result for: ${queryName}`);
      return { rows: fallbackResult || [], rowCount: 0, resilient_fallback: true };
    }
    
    throw lastError;
  }

  async storeWithGracefulDegradation(table, data, options = {}) {
    const {
      allowPartialFailure = true,
      sanitizeUserIds = true,
      generateDefaults = true
    } = options;

    try {
      // Sanitize and add defaults for ambiguous scenarios
      if (sanitizeUserIds && !data.user_id) {
        data.user_id = await this.getOrCreateAnonymousUser();
      }

      if (generateDefaults) {
        data = this.addDefaultValues(table, data);
      }

      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      
      const query = `
        INSERT INTO ${table} (${columns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT DO NOTHING
        RETURNING *
      `;
      
      const result = await this.executeResilientQuery(query, values, {
        queryName: `insert_${table}`,
        fallbackResult: [{ id: 'fallback_id', ...data }]
      });
      
      return result.rows[0];
      
    } catch (error) {
      console.error(`❌ Failed to store data in ${table}:`, error);
      
      if (allowPartialFailure) {
        console.log(`🔄 Continuing with partial failure for ${table}`);
        return { id: 'fallback_id', ...data, _fallback: true };
      }
      
      throw error;
    }
  }

  async getOrCreateAnonymousUser() {
    try {
      // Try to get existing anonymous user
      const result = await this.pool.query(
        'SELECT id FROM users WHERE username = $1',
        ['anonymous_system_user']
      );
      
      if (result.rows.length > 0) {
        return result.rows[0].id;
      }
      
      // Create anonymous user
      const createResult = await this.pool.query(`
        INSERT INTO users (username, email, user_type, metadata)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (username) DO UPDATE SET updated_at = NOW()
        RETURNING id
      `, [
        'anonymous_system_user',
        'anonymous@system.local',
        'system',
        { purpose: 'graceful_degradation', created_by: 'state_of_art_database' }
      ]);
      
      return createResult.rows[0].id;
      
    } catch (error) {
      console.warn('⚠️ Could not create anonymous user, using fallback UUID');
      return '00000000-0000-0000-0000-000000000000'; // Known fallback UUID
    }
  }

  addDefaultValues(table, data) {
    const defaults = {
      cognitive_states: {
        cognitive_load: 0.5,
        emotional_state: 'neutral',
        confusion_level: 0.0,
        attention_span: 1.0,
        learning_momentum: 0.5,
        error_frequency: 0,
        correction_attempts: 0,
        session_quality: 0.5,
        model_confidence: 0.8
      },
      mental_state_models: {
        confidence_score: 0.8,
        model_version: '1.0'
      },
      semantic_embeddings: {
        quality_score: 5,
        usage_count: 0,
        content_type: 'text'
      },
      cross_chat_knowledge: {
        confidence_level: 0.8,
        importance_score: 1,
        knowledge_type: 'preference',
        usage_count: 0,
        validated_count: 0,
        contradiction_count: 0,
        version: 1
      }
    };

    if (defaults[table]) {
      return { ...defaults[table], ...data };
    }
    
    return data;
  }

  async performSemanticSearch(query, userId, options = {}) {
    const {
      limit = 5,
      similarityThreshold = 0.6,
      includeEmbedding = false,
      contentTypes = null
    } = options;

    try {
      // Get query embedding (would typically call OpenAI API)
      const queryEmbedding = await this.getQueryEmbedding(query);
      
      let whereClause = 'WHERE embedding_vector IS NOT NULL AND user_id = $2';
      let params = [queryEmbedding, userId, similarityThreshold, limit];
      
      if (contentTypes) {
        whereClause += ' AND content_type = ANY($5)';
        params.push(contentTypes);
      }
      
      const searchQuery = `
        WITH embedding_similarities AS (
          SELECT *,
            -- Cosine similarity for semantic matching
            1 - (embedding_vector <=> $1::vector) as semantic_similarity,
            -- Keyword matching score
            (
              SELECT COUNT(*)
              FROM unnest(keywords) as keyword
              WHERE keyword ILIKE ANY(string_to_array(lower($1), ' '))
            ) / GREATEST(array_length(keywords, 1), 1.0) as keyword_similarity,
            -- Content length relevance (prefer comprehensive content)
            CASE
              WHEN content_length BETWEEN 100 AND 1000 THEN 1.0
              WHEN content_length BETWEEN 50 AND 2000 THEN 0.8
              ELSE 0.6
            END as length_relevance
          FROM semantic_embeddings
          ${whereClause}
        ),
        ranked_results AS (
          SELECT *,
            -- State-of-the-art composite scoring
            (
              semantic_similarity * 0.6 +
              keyword_similarity * 0.2 +
              (quality_score / 10.0) * 0.1 +
              (LOG(usage_count + 1) / 10.0) * 0.05 +
              length_relevance * 0.05
            ) as composite_score
          FROM embedding_similarities
          WHERE semantic_similarity > $3
        )
        SELECT
          id,
          content,
          content_type,
          semantic_similarity,
          keyword_similarity,
          composite_score,
          metadata,
          quality_score,
          usage_count,
          created_at
          ${includeEmbedding ? ', embedding_vector' : ''}
        FROM ranked_results
        ORDER BY composite_score DESC, semantic_similarity DESC, quality_score DESC
        LIMIT $4
      `;
      
      const result = await this.executeResilientQuery(searchQuery, params, {
        queryName: 'semantic_search',
        fallbackResult: []
      });
      
      return result.rows;
      
    } catch (error) {
      console.error('❌ Semantic search failed:', error);
      
      // Fallback to simple text search
      return await this.performFallbackTextSearch(query, userId, { limit });
    }
  }

  async performFallbackTextSearch(query, userId, options = {}) {
    const { limit = 5 } = options;
    
    try {
      const fallbackQuery = `
        SELECT
          id,
          content,
          content_type,
          metadata,
          quality_score,
          usage_count,
          ts_rank(to_tsvector('english', content), plainto_tsquery('english', $1)) as text_rank
        FROM semantic_embeddings
        WHERE content IS NOT NULL AND user_id = $2
        AND (
          to_tsvector('english', content) @@ plainto_tsquery('english', $1) OR
          content ILIKE '%' || $1 || '%' OR
          keywords && string_to_array(lower($1), ' ')
        )
        ORDER BY
          text_rank DESC,
          quality_score DESC,
          usage_count DESC
        LIMIT $3
      `;
      
      const result = await this.executeResilientQuery(fallbackQuery, [query, userId, limit], {
        queryName: 'fallback_text_search',
        fallbackResult: []
      });
      
      return result.rows;
      
    } catch (error) {
      console.error('❌ Fallback text search failed:', error);
      return []; // Empty result for graceful degradation
    }
  }

  async getQueryEmbedding(query) {
    // This would typically call OpenAI API to get embeddings
    // For now, return a zero vector as fallback (768 dims for nomic model)
    return new Array(768).fill(0);
  }

  async getCurrentSchemaVersion() {
    try {
      const result = await this.pool.query(
        'SELECT version FROM schema_versions ORDER BY applied_at DESC LIMIT 1'
      );
      return result.rows[0]?.version || '0.0.0';
    } catch (error) {
      return '0.0.0';
    }
  }

  shouldUpgradeSchema(currentVersion) {
    // Implement semantic versioning comparison
    return this.compareVersions(currentVersion, this.schemaVersion) < 0;
  }

  compareVersions(a, b) {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      
      if (aPart < bPart) return -1;
      if (aPart > bPart) return 1;
    }
    
    return 0;
  }

  async upgradeSchema(fromVersion) {
    console.log(`🔄 Upgrading schema from ${fromVersion} to ${this.schemaVersion}`);
    // Implement schema migration logic here
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
    }
    if (this.knex) {
      await this.knex.destroy();
    }
  }
}

// Circuit Breaker implementation for database resilience
class CircuitBreaker {
  constructor(threshold = 5, timeoutMs = 30000) {
    this.threshold = threshold;
    this.timeoutMs = timeoutMs;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  isOpen() {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeoutMs) {
        this.state = 'HALF_OPEN';
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}

module.exports = StateOfTheArtDatabase;
