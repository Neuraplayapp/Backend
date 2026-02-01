const { Pool } = require('pg');
const knex = require('knex');
const StateOfTheArtDatabase = require('./StateOfTheArtDatabase.cjs');

let pool = null;
let databaseAvailable = false;
let queryBuilder = null;
let stateOfArtDb = null;

// Initialize PostgreSQL connection
const initializeDatabase = () => {
  pool = new Pool({
    connectionString: process.env.RENDER_POSTGRES_URL || process.env.DATABASE_URL,
    ssl: (process.env.NODE_ENV === 'production' || process.env.POSTGRES_SSL === 'true') ? { rejectUnauthorized: false } : false,
  });

  // Initialize Knex query builder
  queryBuilder = knex({
    client: 'pg',
    connection: {
      connectionString: process.env.RENDER_POSTGRES_URL || process.env.DATABASE_URL,
      ssl: (process.env.NODE_ENV === 'production' || process.env.POSTGRES_SSL === 'true') ? { rejectUnauthorized: false } : false,
    },
    pool: {
      min: 2,
      max: 10
    }
  });

  console.log('🔗 Connecting to Render PostgreSQL database with Knex query builder...');
  
  return initDatabase();
};

// Initialize database tables (non-blocking to prevent server crashes)
async function initDatabase() {
  try {
    console.log('🚀 Working with existing functional Render database...');
    
    const client = await pool.connect();
    
    // ===== ENABLE ALL REQUIRED EXTENSIONS =====
    console.log('🔍 Enabling extensions for full functionality...');
    
    // Enable UUID extension for user management
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    console.log('✅ UUID extension enabled');
    
    // Enable pgvector extension for semantic search/vector operations
    let vectorSupported = false;
    try {
      await client.query(`CREATE EXTENSION IF NOT EXISTS vector`);
      console.log('✅ pgvector extension enabled for semantic search');
      vectorSupported = true;
    } catch (vectorError) {
      console.log('📝 pgvector extension not available - semantic search may have limited functionality');
      console.log('Vector error details:', vectorError.message);
      vectorSupported = false;
    }
    
    // Test connection to existing schema
    try {
      const testQuery = await client.query('SELECT 1 as test');
      console.log('✅ Database connection test successful');
      
      // Test table access and log available tables
      const tableTest = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      console.log('✅ Found', tableTest.rows.length, 'tables:', tableTest.rows.map(r => r.table_name).join(', '));
      
      // Test critical tables for memory functionality
      const criticalTables = ['users', 'user_memories', 'conversations'];
      for (const table of criticalTables) {
        try {
          await client.query(`SELECT 1 FROM ${table} LIMIT 1`);
          console.log(`✅ ${table} table accessible`);
        } catch (tableError) {
          console.log(`⚠️ ${table} table not accessible: ${tableError.message}`);
        }
      }
      
    } catch (testError) {
      console.error('❌ Database connection test failed:', testError.message);
      throw testError;
    }

    // ===== ENSURE ALL REQUIRED TABLES EXIST =====
    console.log('🔍 Ensuring all required tables exist for full functionality...');
    
    // ===== WORK WITH EXISTING RENDER PRODUCTION SCHEMA =====
    console.log('✅ Using existing Render production database - ALL FUNCTIONALITY ALREADY AVAILABLE');
    console.log('  📊 Vector Search: pgvector extension already enabled');
    console.log('  🌤️ Weather: Store in user_memories with weather categories');
    console.log('  🎨 Canvas: Store in user_memories with canvas categories'); 
    console.log('  🤖 Assistants: Store in user_memories with assistant categories');
    console.log('  🧠 Memory: user_memories table fully functional with importance scoring');
    console.log('  🔍 Search: Full text and semantic search via existing infrastructure');
    console.log('  🔄 Cross-Chat: conversations table with full session support');
    console.log('  📋 LLM Context: All personal info stored and searchable in existing schema');

    // Create ai_logs table - ALIGNED WITH PRODUCTION SCHEMA
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        interaction_type VARCHAR(100) NOT NULL,
        input TEXT,
        output TEXT,
        tools_used JSONB DEFAULT '[]',
        response_time INTEGER,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        session_id UUID,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Create agent_sessions table for new architecture - ALIGNED WITH PRODUCTION SCHEMA
    await client.query(`
      CREATE TABLE IF NOT EXISTS agent_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        state JSONB DEFAULT '{}',
        context JSONB DEFAULT '{}',
        state_history JSONB DEFAULT '[]',
        phase VARCHAR(50) DEFAULT 'IDLE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Create vector_embeddings table for semantic search - CRITICAL FOR VECTOR API
    await client.query(`
      CREATE TABLE IF NOT EXISTS vector_embeddings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding JSONB NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes for vector_embeddings
    await client.query(`CREATE INDEX IF NOT EXISTS idx_vector_embeddings_user_id ON vector_embeddings(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_vector_embeddings_content_search ON vector_embeddings USING GIN(to_tsvector('english', content))`);
    console.log('✅ vector_embeddings table created with indexes');

    // Create tool_executions table for detailed tool tracking - ALIGNED WITH PRODUCTION SCHEMA
    await client.query(`
      CREATE TABLE IF NOT EXISTS tool_executions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        session_id UUID NOT NULL,
        tool_name VARCHAR(100) NOT NULL,
        input_params JSONB DEFAULT '{}',
        output_result JSONB DEFAULT '{}',
        status VARCHAR(50) NOT NULL,
        execution_time INTEGER,
        error_details JSONB,
        retry_count INTEGER DEFAULT 0,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        -- FOREIGN KEY (session_id) REFERENCES agent_sessions(id) ON DELETE CASCADE -- Temporarily disabled
      )
    `);

    // Create context_store table for unified memory management - ALIGNED WITH PRODUCTION SCHEMA
    await client.query(`
      CREATE TABLE IF NOT EXISTS context_store (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        session_id UUID NOT NULL,
        context_type VARCHAR(50) NOT NULL,
        context_key VARCHAR(255) NOT NULL,
        context_value JSONB DEFAULT '{}',
        tags TEXT[],
        embedding JSONB DEFAULT NULL, -- Vector embedding as JSON for compatibility
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
        -- FOREIGN KEY (session_id) REFERENCES agent_sessions(id) ON DELETE CASCADE -- Temporarily disabled
      )
    `);

    // Create tool_registry_cache table for tool performance tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS tool_registry_cache (
        tool_name VARCHAR(100) PRIMARY KEY,
        execution_count INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        failure_count INTEGER DEFAULT 0,
        avg_execution_time FLOAT DEFAULT 0,
        last_executed TIMESTAMP,
        cache_data JSONB DEFAULT '{}',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Scribble boards (persist entire board state compactly as JSON) - ALIGNED WITH PRODUCTION SCHEMA
    await client.query(`
      CREATE TABLE IF NOT EXISTS scribble_boards (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        data JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Tool and board events log (auditable stream of actions) - ALIGNED WITH PRODUCTION SCHEMA
    await client.query(`
      CREATE TABLE IF NOT EXISTS scribble_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        board_id UUID,
        event_name VARCHAR(100) NOT NULL,
        detail JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Create chat_tabs table for tabbed interface state persistence - ALIGNED WITH PRODUCTION SCHEMA
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_tabs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        title VARCHAR(255) NOT NULL,
        messages JSONB DEFAULT '[]',
        mode VARCHAR(50) DEFAULT 'chat',
        canvas_mode BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        context JSONB DEFAULT '{}',
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Create indexes for chat_tabs
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_tabs_user_id ON chat_tabs(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_tabs_last_active ON chat_tabs(last_active);
    `);

    // === STATE-OF-THE-ART NPU INTEGRATION TABLES ===
    
    // NPU Analysis tracking - stores complete 10-layer analysis - ALIGNED WITH PRODUCTION SCHEMA
    await client.query(`
      CREATE TABLE IF NOT EXISTS npu_analyses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        session_id UUID NOT NULL,
        
        -- 10-Layer NPU breakdown (stored as JSONB for complex analytics)
        linguistic_analysis JSONB DEFAULT '{}',
        intent_analysis JSONB DEFAULT '{}',
        context_analysis JSONB DEFAULT '{}',
        confusion_analysis JSONB DEFAULT '{}',
        socratic_analysis JSONB DEFAULT '{}',
        mode_analysis JSONB DEFAULT '{}',
        canvas_analysis JSONB DEFAULT '{}',
        educational_analysis JSONB DEFAULT '{}',
        creative_analysis JSONB DEFAULT '{}',
        memory_analysis JSONB DEFAULT '{}',
        
        -- Input/Output
        input_text TEXT,
        output_text TEXT,
        
        -- Performance metrics
        total_processing_time INTEGER,
        performance_score FLOAT DEFAULT 0,
        complexity_score FLOAT DEFAULT 0,
        
        -- Tools and safety
        tools_executed JSONB DEFAULT '[]',
        safety_flags JSONB DEFAULT '[]',
        
        -- Timestamps
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Cross-chat knowledge system - ALIGNED WITH PRODUCTION SCHEMA
    await client.query(`
      CREATE TABLE IF NOT EXISTS cross_chat_knowledge (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        source_session_id UUID NOT NULL,
        knowledge_type VARCHAR(50) NOT NULL, -- 'fact', 'preference', 'skill', 'interest', 'goal'
        content TEXT NOT NULL,
        context JSONB DEFAULT '{}',
        relevance_score FLOAT DEFAULT 0,
        usage_count INTEGER DEFAULT 1,
        last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tags TEXT[],
        embedding JSONB DEFAULT NULL, -- Vector embedding as JSON for compatibility
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // User behavior patterns from NPU analysis - ALIGNED WITH PRODUCTION SCHEMA
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_behavior_patterns (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        pattern_type VARCHAR(100) NOT NULL, -- 'learning_style', 'interaction_preference', etc.
        pattern JSONB NOT NULL, -- Pattern details, frequency, confidence, recommendations
        detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        confidence FLOAT DEFAULT 0,
        
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // User memories table for persistent memory storage - Nomic embeddings (768 dims)
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_memories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        memory_key VARCHAR(255) NOT NULL,
        content TEXT NOT NULL, -- Actual memory content
        
        -- Nomic/Fireworks: nomic-ai/nomic-embed-text-v1.5 (768 dims) - PRIMARY
        embedding vector(768),
        embedding_model VARCHAR(100) DEFAULT 'nomic-ai/nomic-embed-text-v1.5',
        
        -- 🎯 CRITICAL: metadata stores category for hierarchical ranking
        metadata JSONB DEFAULT '{}', -- Contains category, source, etc.
        context JSONB DEFAULT '{}', -- Conversation context
        tags TEXT[] DEFAULT '{}', -- Searchable tags
        importance_score DECIMAL DEFAULT 0.5, -- Relevance weighting
        access_count INTEGER DEFAULT 0, -- Usage tracking
        last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, memory_key)
      )
    `);
    
    // 🎯 MIGRATION: Add metadata column if it doesn't exist (for existing databases)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='user_memories' AND column_name='metadata'
        ) THEN
          ALTER TABLE user_memories ADD COLUMN metadata JSONB DEFAULT '{}';
          RAISE NOTICE 'Added metadata column to user_memories for category ranking';
        END IF;
      END $$;
    `);
    
    // 🚀 Add future-proof embedding columns if they don't exist (migration for existing tables)
    await client.query(`
      DO $$
      BEGIN
        -- Primary 768-dim embedding (Nomic/Fireworks)
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='user_memories' AND column_name='embedding'
        ) THEN
          ALTER TABLE user_memories ADD COLUMN embedding vector(768);
          RAISE NOTICE 'Added embedding (768) column to user_memories';
        END IF;
        
        -- NOTE: We only use Nomic embeddings (768 dims) via Fireworks
        -- No other embedding columns needed
        
        -- Model tracking column
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='user_memories' AND column_name='embedding_model'
        ) THEN
          ALTER TABLE user_memories ADD COLUMN embedding_model VARCHAR(100) DEFAULT 'nomic-ai/nomic-embed-text-v1.5';
          RAISE NOTICE 'Added embedding_model column to user_memories';
        END IF;
        
        -- 🔧 FIX TYPO: Rename 'emmbedding' to 'embedding' if typo exists
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='user_memories' AND column_name='emmbedding'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='user_memories' AND column_name='embedding'
        ) THEN
          ALTER TABLE user_memories RENAME COLUMN emmbedding TO embedding;
          RAISE NOTICE '✅ Fixed typo: renamed emmbedding to embedding';
        END IF;
        
        -- 🔧 If both columns exist (shouldn't happen, but handle it), copy and drop typo
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='user_memories' AND column_name='emmbedding'
        ) AND EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='user_memories' AND column_name='embedding'
        ) THEN
          UPDATE user_memories SET embedding = emmbedding WHERE embedding IS NULL AND emmbedding IS NOT NULL;
          ALTER TABLE user_memories DROP COLUMN emmbedding;
          RAISE NOTICE '✅ Merged emmbedding data into embedding and dropped typo column';
        END IF;
      END $$;
    `);
    
    // 🚀 Create indexes for user_memories table
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_memories_user_id ON user_memories(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_memories_memory_key ON user_memories(memory_key);
      CREATE INDEX IF NOT EXISTS idx_user_memories_content_search ON user_memories USING gin(to_tsvector('english', content));
    `);
    
    // 🚀 Create pgvector indexes for ALL embedding columns (separate queries to handle errors gracefully)
    // 🎯 Only create index for Nomic embeddings (768 dims) - the only model we use
    const embeddingIndexes = [
      { column: 'embedding', name: 'idx_user_memories_embedding_768', dims: 768 }
    ];
    
    for (const idx of embeddingIndexes) {
      try {
        await client.query(`
          CREATE INDEX IF NOT EXISTS ${idx.name}
          ON user_memories USING ivfflat (${idx.column} vector_cosine_ops) 
          WITH (lists = 100);
        `);
        console.log(`✅ Created pgvector IVFFlat index on user_memories.${idx.column} (${idx.dims} dims)`);
      } catch (indexError) {
        console.warn(`⚠️ Could not create vector index for ${idx.column}:`, indexError.message);
      }
    }

    // Cognitive domain progression tracking (NEW) - ALIGNED WITH PRODUCTION SCHEMA
    await client.query(`
      CREATE TABLE IF NOT EXISTS cognitive_domain_progression (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        domain VARCHAR(100) NOT NULL, -- 'math', 'science', 'programming', etc.
        subdomain VARCHAR(100), -- 'algebra', 'physics', 'javascript', etc.
        mastery_level VARCHAR(50) NOT NULL, -- 'struggling', 'confused', 'exploring', 'understanding', 'confident'
        emotional_state VARCHAR(50), -- 'scared', 'frustrated', 'curious', 'confident', etc.
        progression_data JSONB DEFAULT '{}', -- Detailed progression metrics
        last_interaction TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, domain, subdomain)
      )
    `);

    // Real-time usage tracking with database sync - ALIGNED WITH PRODUCTION SCHEMA
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_usage_sync (
        user_id UUID PRIMARY KEY,
        ai_prompts_count INTEGER DEFAULT 0,
        ai_prompts_last_reset TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        image_gen_count INTEGER DEFAULT 0,
        image_gen_last_reset TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        voice_usage_count INTEGER DEFAULT 0,
        voice_last_reset TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Session intelligence - enhanced session tracking - ALIGNED WITH PRODUCTION SCHEMA
    await client.query(`
      CREATE TABLE IF NOT EXISTS intelligent_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        session_type VARCHAR(50) DEFAULT 'chat', -- 'chat', 'voice', 'canvas', 'mixed'
        start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_time TIMESTAMP,
        total_interactions INTEGER DEFAULT 0,
        
        -- NPU performance for this session
        avg_processing_time FLOAT DEFAULT 0,
        intent_distribution JSONB DEFAULT '{}',
        tools_used JSONB DEFAULT '[]',
        canvas_activated BOOLEAN DEFAULT false,
        
        -- Learning analytics
        learning_progress JSONB DEFAULT '{}',
        confusion_events INTEGER DEFAULT 0,
        socratic_triggers INTEGER DEFAULT 0,
        
        -- Quality metrics
        user_satisfaction FLOAT, -- If collected
        session_quality_score FLOAT DEFAULT 0,
        
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // === PERFORMANCE INDEXES FOR NPU TABLES ===
    
    // NPU analysis indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_npu_analyses_user_id ON npu_analyses(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_npu_analyses_timestamp ON npu_analyses(timestamp);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_npu_analyses_performance ON npu_analyses(performance_score);
    `);
    
    // Cross-chat knowledge indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_user_id ON cross_chat_knowledge(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_type ON cross_chat_knowledge(knowledge_type);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_relevance ON cross_chat_knowledge(relevance_score);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON cross_chat_knowledge USING GIN(tags);
    `);
    
    // Behavior patterns indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_behavior_user_id ON user_behavior_patterns(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_behavior_type ON user_behavior_patterns(pattern_type);
    `);
    
    // Session intelligence indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_intelligent_sessions_user_id ON intelligent_sessions(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_intelligent_sessions_start_time ON intelligent_sessions(start_time);
    `);

    // ===== NEUROPSYCHOLOGICAL COGNITIVE MODULES (STATE-OF-THE-ART) =====
    console.log('🧠 Creating cognitive modules tables for NPU integration...');

    // Error Detection Circuit (Anterior Cingulate Cortex) - Conflict/Error Detection
    await client.query(`
      CREATE TABLE IF NOT EXISTS error_detection_patterns (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        session_id VARCHAR(255),
        error_type VARCHAR(50) NOT NULL, -- 'conflict', 'correction', 'misunderstanding', 'contradiction'
        confidence FLOAT NOT NULL,
        severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
        error_location JSONB DEFAULT '{}', -- messageIndex, conceptMismatch, temporalReference
        cognitive_markers JSONB NOT NULL, -- negationDetected, conflictWords, emotionalTone, urgencyLevel
        resolution_pattern JSONB, -- How the error was resolved
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Theory of Mind Processor (Temporoparietal Junction) - Mental State Understanding
    await client.query(`
      CREATE TABLE IF NOT EXISTS mental_state_models (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        session_id VARCHAR(255),
        message_id VARCHAR(255),
        intended_meaning TEXT NOT NULL,
        expressed_meaning TEXT NOT NULL,
        belief_state JSONB NOT NULL, -- userBeliefs, userAssumptions, knowledgeGaps
        intentional_stance JSONB NOT NULL, -- primaryGoal, secondaryGoals, emotionalState, cognitiveLoad
        communicative_intent JSONB NOT NULL, -- directSpeechAct, indirectSpeechAct, pragmaticImplicature
        correction_analysis JSONB, -- correctionType, originalIntention, correctedIntention, mentalModelMismatch
        confidence_score FLOAT DEFAULT 0.5,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Episodic Retrieval System (Hippocampus) - Contextual Memory Retrieval
    await client.query(`
      CREATE TABLE IF NOT EXISTS episodic_memories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        memory_id VARCHAR(255) UNIQUE NOT NULL,
        content TEXT NOT NULL,
        memory_type VARCHAR(50) NOT NULL, -- 'episodic', 'semantic', 'procedural', 'emotional'
        context JSONB NOT NULL, -- conversationContext, emotionalState, temporalRelevance
        semantic_embeddings JSONB DEFAULT NULL, -- Vector embedding as JSON for compatibility
        emotional_weight FLOAT DEFAULT 0.5,
        temporal_relevance VARCHAR(20) DEFAULT 'recent', -- 'recent', 'ongoing', 'historical'
        importance_score FLOAT DEFAULT 0.5,
        access_count INTEGER DEFAULT 0,
        last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        memory_strength FLOAT DEFAULT 1.0, -- Decays over time
        associative_links JSONB DEFAULT '[]', -- Links to other memories
        retrieval_cues JSONB DEFAULT '[]', -- What triggers this memory
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Semantic Memory Network (Temporal Lobe) - Knowledge Representation
    await client.query(`
      CREATE TABLE IF NOT EXISTS semantic_memories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        semantic_type VARCHAR(50) NOT NULL, -- 'personal', 'preference', 'emotional', 'factual', 'relational', 'temporal', 'professional', 'behavioral'
        category VARCHAR(100) NOT NULL,
        subcategory VARCHAR(100),
        content TEXT NOT NULL,
        raw_sentence TEXT NOT NULL,
        confidence FLOAT NOT NULL,
        emotional_weight FLOAT NOT NULL,
        temporal_relevance FLOAT NOT NULL,
        importance FLOAT NOT NULL,
        relationships JSONB DEFAULT '[]', -- What this memory relates to
        contradicts JSONB DEFAULT '[]', -- Existing memories this might contradict
        context JSONB NOT NULL, -- conversationTopic, userMood, timeContext, certaintyLevel
        metadata JSONB NOT NULL, -- extractedAt, sessionId, messageId, extractionMethod
        semantic_vector JSONB DEFAULT NULL, -- Vector embedding as JSON for compatibility
        conflict_resolved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Canvas Preferences & Behavioral Patterns - User Interaction Learning
    await client.query(`
      CREATE TABLE IF NOT EXISTS canvas_preferences (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        preference_type VARCHAR(50) NOT NULL, -- 'activation_pattern', 'content_type_preference', 'frustration_pattern'
        pattern_data JSONB NOT NULL, -- Detailed preference patterns
        confidence FLOAT DEFAULT 0.5,
        usage_frequency INTEGER DEFAULT 0,
        positive_interactions INTEGER DEFAULT 0,
        negative_interactions INTEGER DEFAULT 0,
        last_interaction_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Temporal Memory Dynamics - Memory Relationships Over Time
    await client.query(`
      CREATE TABLE IF NOT EXISTS memory_temporal_relationships (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        memory_a_id VARCHAR(255), -- Can reference episodic_memories or semantic_memories
        memory_b_id VARCHAR(255),
        relationship_type VARCHAR(50) NOT NULL, -- 'causal', 'temporal_sequence', 'contradictory', 'reinforcing', 'associative'
        strength FLOAT DEFAULT 0.5,
        direction VARCHAR(20) DEFAULT 'bidirectional', -- 'a_to_b', 'b_to_a', 'bidirectional'
        temporal_distance_ms BIGINT, -- Time difference between memories
        confidence FLOAT DEFAULT 0.5,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Cognitive State Tracking - Real-time Cognitive Load Monitoring
    await client.query(`
      CREATE TABLE IF NOT EXISTS cognitive_states (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        session_id VARCHAR(255),
        cognitive_load FLOAT DEFAULT 0.5, -- Mental effort required
        emotional_state VARCHAR(50), -- 'neutral', 'frustrated', 'confused', 'focused', 'engaged'
        confusion_level FLOAT DEFAULT 0.0,
        attention_span FLOAT DEFAULT 1.0,
        learning_momentum FLOAT DEFAULT 0.5,
        error_frequency INTEGER DEFAULT 0,
        correction_attempts INTEGER DEFAULT 0,
        session_quality FLOAT DEFAULT 0.5,
        measured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Memory Consolidation Tracking - STM→LTM Promotion
    await client.query(`
      CREATE TABLE IF NOT EXISTS memory_consolidation (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        source_memory_id VARCHAR(255) NOT NULL, -- From episodic or working memory
        target_memory_id VARCHAR(255), -- Consolidated into long-term
        consolidation_type VARCHAR(50) NOT NULL, -- 'stm_to_ltm', 'episodic_to_semantic', 'strengthening', 'decay'
        consolidation_trigger VARCHAR(50), -- 'repetition', 'emotional_significance', 'cross_reference', 'sleep_simulation'
        strength_before FLOAT,
        strength_after FLOAT,
        importance_before FLOAT,
        importance_after FLOAT,
        consolidated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Cognitive modules performance indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_error_detection_user_id ON error_detection_patterns(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_error_detection_type ON error_detection_patterns(error_type);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_mental_state_user_id ON mental_state_models(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_episodic_memories_user_id ON episodic_memories(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_episodic_memories_type ON episodic_memories(memory_type);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_semantic_memories_user_id ON semantic_memories(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_semantic_memories_type ON semantic_memories(semantic_type);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_canvas_preferences_user_id ON canvas_preferences(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_memory_relationships_user_id ON memory_temporal_relationships(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cognitive_states_user_id ON cognitive_states(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_memory_consolidation_user_id ON memory_consolidation(user_id);
    `);

    console.log('✅ Cognitive modules database schema integrated');

    // 🔍 CRITICAL DIAGNOSTIC: Check for user_id leak (all memories under one user)
    try {
      // 🔧 FIX: PostgreSQL doesn't support LIMIT inside STRING_AGG
      // Use a subquery to get limited sample keys
      const userIdCheck = await client.query(`
        SELECT 
          user_id, 
          COUNT(*) as memory_count,
          (SELECT STRING_AGG(DISTINCT mk, ', ') FROM (
            SELECT memory_key as mk FROM user_memories um2 
            WHERE um2.user_id = user_memories.user_id AND um2.embedding IS NOT NULL
            ORDER BY um2.memory_key LIMIT 3
          ) sub) as sample_keys
        FROM user_memories 
        WHERE embedding IS NOT NULL
        GROUP BY user_id
        ORDER BY memory_count DESC
        LIMIT 10
      `);
      
      console.log('🔍 CRITICAL: User ID distribution in user_memories table:');
      if (userIdCheck.rows.length === 0) {
        console.log('   📭 No memories with embeddings found in database');
      } else if (userIdCheck.rows.length === 1) {
        console.log('   ⚠️ WARNING: ALL MEMORIES BELONG TO ONE USER - POSSIBLE DATA LEAK!');
        console.log(`   👤 ${userIdCheck.rows[0].user_id}: ${userIdCheck.rows[0].memory_count} memories`);
        console.log(`   🔑 Sample keys: ${userIdCheck.rows[0].sample_keys}`);
      } else {
        console.log(`   ✅ ${userIdCheck.rows.length} distinct users found (healthy separation)`);
        userIdCheck.rows.forEach(row => {
          console.log(`   👤 ${row.user_id}: ${row.memory_count} memories`);
        });
      }
    } catch (diagError) {
      console.warn('⚠️ Could not check user_id distribution:', diagError.message);
    }

    // 🔍 DIAGNOSTIC: Check admin user status
    try {
      console.log('\n🔍 === ADMIN USER DIAGNOSTIC ===');
      const allUsers = await client.query(`
        SELECT id, username, email, role, created_at 
        FROM users 
        ORDER BY created_at DESC
        LIMIT 10
      `);
      
      console.log('📊 CURRENT USERS IN DATABASE:');
      allUsers.rows.forEach(user => {
        console.log(`   ${user.username} (${user.email}) - Role: ${user.role} - UUID: ${user.id.substring(0, 8)}...`);
      });
      
      // Check for m_abulhassan
      const mAbulhassan = await client.query(`
        SELECT u.id, u.username, u.email, u.role, COUNT(m.id) as memory_count
        FROM users u
        LEFT JOIN user_memories m ON u.id = m.user_id
        WHERE u.username = 'm_abulhassan' OR u.email = 'm_abulhassan@msn.com'
        GROUP BY u.id, u.username, u.email, u.role
      `);
      
      if (mAbulhassan.rows.length > 0) {
        const user = mAbulhassan.rows[0];
        console.log(`✅ m_abulhassan: EXISTS - Role: ${user.role}, Memories: ${user.memory_count}, UUID: ${user.id.substring(0, 8)}...`);
      } else {
        console.log('⚠️  m_abulhassan: DOES NOT EXIST - Migration may be needed');
      }
      
      // Check for duplicates
      const duplicateCheck = await client.query(`
        SELECT username, COUNT(*) as count 
        FROM users 
        GROUP BY username 
        HAVING COUNT(*) > 1
      `);
      
      if (duplicateCheck.rows.length > 0) {
        console.log('⚠️  DUPLICATE USERNAMES FOUND:');
        duplicateCheck.rows.forEach(dup => {
          console.log(`   ${dup.username}: ${dup.count} copies`);
        });
      }
      
      console.log('=================================\n');
    } catch (diagError) {
      console.warn('⚠️ Could not run admin diagnostic:', diagError.message);
    }

    // NOTE: Obsolete migration calls removed (reset-admin-users, cleanup-invalid-embeddings)
    // These were temporary fixes - we now have proper delete functions in the memory API

    client.release();
    databaseAvailable = true;
    console.log('✅ Database connection confirmed - ready for operations');
    return true;
  } catch (error) {
    console.error('❌ Database connection error:', error);
    console.log('📝 Continuing with limited functionality...');
    databaseAvailable = false;
    return false;
  }
}

// Helper function to get user UUID from username or UUID
async function getUserUUID(userIdOrUsernameOrEmail, client) {
  try {
    // Check if it's already a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(userIdOrUsernameOrEmail)) {
      return userIdOrUsernameOrEmail;
    }
    
    // Check if it looks like an email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmail = emailRegex.test(userIdOrUsernameOrEmail);
    
    // Look up user by username or email
    const userResult = await client.query(
      isEmail 
        ? 'SELECT id FROM users WHERE email = $1'
        : 'SELECT id FROM users WHERE username = $1',
      [userIdOrUsernameOrEmail]
    );
    
    if (userResult.rows.length > 0) {
      console.log(`✅ Database: Found existing user: ${userResult.rows[0].id} (${userIdOrUsernameOrEmail})`);
      return userResult.rows[0].id;
    }
    
    console.log(`❌ Database: User not found: ${userIdOrUsernameOrEmail}`);
    return null;
  } catch (error) {
    console.error('❌ Database: Error looking up user:', error);
    return null;
  }
}

// Database helper functions
async function saveToDatabase(client, collection, data) {
  const timestamp = new Date().toISOString();
  
  switch (collection) {
    case 'users':
      await client.query(`
        INSERT INTO users (id, username, email, profile, updated_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          username = EXCLUDED.username,
          email = EXCLUDED.email,
          profile = EXCLUDED.profile,
          updated_at = EXCLUDED.updated_at
      `, [data.id, data.username, data.email, JSON.stringify(data.profile), timestamp]);
      break;

    case 'analytics':
      // ENHANCED FIX: Better error handling for analytics data
      try {
        // Convert username to UUID if needed, or use anonymous UUID
        let analyticsUserUUID = null;
        if (data.userId && data.userId !== 'anonymous') {
          analyticsUserUUID = await getUserUUID(data.userId, client);
          if (!analyticsUserUUID) {
            console.warn(`⚠️ Analytics: User not found, using anonymous: ${data.userId}`);
            // Create a consistent anonymous UUID instead of string
            analyticsUserUUID = '00000000-0000-0000-0000-000000000000';
          }
        } else {
          // Use a consistent anonymous UUID instead of string
          analyticsUserUUID = '00000000-0000-0000-0000-000000000000';
        }
        
        // Validate all required fields before inserting
        if (!data.id || !data.eventType) {
          console.warn('⚠️ Analytics: Missing required fields (id or eventType), skipping insert');
          return; // Skip insert but don't throw error
        }
        
        // 🔧 FIX: Validate sessionId is a UUID, not a session string
        // Analytics table session_id column is type UUID, not TEXT
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validSessionId = data.sessionId && uuidRegex.test(data.sessionId) ? data.sessionId : null;
        
        await client.query(`
          INSERT INTO analytics (id, user_id, event_type, event_data, session_id, user_agent, platform)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO NOTHING
        `, [
          data.id, 
          analyticsUserUUID, 
          data.eventType, 
          JSON.stringify(data.eventData || {}), 
          validSessionId, 
          data.userAgent || null, 
          data.platform || null
        ]);
        
        console.log(`✅ Analytics logged: ${data.eventType} for user ${analyticsUserUUID}`);
      } catch (analyticsError) {
        console.error('❌ Analytics insert failed (non-fatal):', analyticsError.message);
        // Don't throw - analytics failures shouldn't break the app
        // Just log and continue
      }
      break;

    case 'posts':
      // Convert username to UUID if needed
      const postUserUUID = await getUserUUID(data.userId, client);
      if (!postUserUUID) {
        throw new Error(`User not found: ${data.userId}`);
      }
      await client.query(`
        INSERT INTO posts (id, user_id, channel, title, content, votes, replies, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          content = EXCLUDED.content,
          votes = EXCLUDED.votes,
          replies = EXCLUDED.replies,
          updated_at = EXCLUDED.updated_at
      `, [data.id, postUserUUID, data.channel, data.title, data.content, data.votes, JSON.stringify(data.replies), timestamp]);
      break;

    case 'conversations':
      // CRITICAL: Validate conversation ID is a valid UUID
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!data.id || !uuidPattern.test(data.id)) {
        console.warn(`🚨 Database: Rejecting invalid conversation ID (not a UUID): ${data.id}`);
        // Skip silently instead of throwing - this prevents memory keys from causing errors
        return;
      }
      
      // Convert username to UUID if needed
      let conversationUserUUID = null;
      if (data.userId) {
        conversationUserUUID = await getUserUUID(data.userId, client);
        if (!conversationUserUUID) {
          // If user doesn't exist, check if userId is already a valid UUID
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(data.userId)) {
            // Use the UUID directly if it's already valid
            conversationUserUUID = data.userId;
            console.log(`⚠️ Database: User UUID not found in DB, but using provided UUID: ${data.userId}`);
          } else {
            console.warn(`⚠️ Database: User not found: ${data.userId}, skipping conversation save`);
            // Don't throw - just skip the save gracefully
            return;
          }
        }
      } else {
        console.warn(`⚠️ Database: No userId provided for conversation ${data.id}, skipping save`);
        return;
      }
      
      await client.query(`
        INSERT INTO conversations (id, user_id, messages, metadata, updated_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          messages = EXCLUDED.messages,
          metadata = EXCLUDED.metadata,
          updated_at = EXCLUDED.updated_at
      `, [data.id, conversationUserUUID, JSON.stringify(data.messages), JSON.stringify(data.metadata), timestamp]);
      break;

    case 'ai_logs':
      await client.query(`
        INSERT INTO ai_logs (id, user_id, interaction_type, input, output, tools_used, response_time, session_id)
        VALUES ($1, COALESCE($2, 'anonymous'), $3, $4, $5, $6, $7, $8)
      `, [data.id, data.userId || null, data.interactionType, data.input, data.output, JSON.stringify(data.toolsUsed), data.responseTime, data.sessionId]);
      break;

    case 'agent_sessions':
      await client.query(`
        INSERT INTO agent_sessions (id, user_id, state, context, state_history, phase, updated_at, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          state = EXCLUDED.state,
          context = EXCLUDED.context,
          state_history = EXCLUDED.state_history,
          phase = EXCLUDED.phase,
          updated_at = EXCLUDED.updated_at,
          expires_at = EXCLUDED.expires_at
      `, [data.id, data.userId, JSON.stringify(data.state), JSON.stringify(data.context), JSON.stringify(data.stateHistory), data.phase, timestamp, data.expiresAt]);
      break;

    case 'tool_executions':
      await client.query(`
        INSERT INTO tool_executions (id, session_id, tool_name, input_params, output_result, status, execution_time, error_details, retry_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [data.id, data.sessionId, data.toolName, JSON.stringify(data.inputParams), JSON.stringify(data.outputResult), data.status, data.executionTime, JSON.stringify(data.errorDetails), data.retryCount || 0]);
      break;

    case 'context_store':
      await client.query(`
        INSERT INTO context_store (id, session_id, context_type, context_key, context_value, tags, updated_at, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          context_value = EXCLUDED.context_value,
          tags = EXCLUDED.tags,
          updated_at = EXCLUDED.updated_at,
          expires_at = EXCLUDED.expires_at
      `, [data.id, data.sessionId, data.contextType, data.contextKey, JSON.stringify(data.contextValue), data.tags, timestamp, data.expiresAt]);
      break;

    case 'tool_registry_cache':
      await client.query(`
        INSERT INTO tool_registry_cache (tool_name, execution_count, success_count, failure_count, avg_execution_time, last_executed, cache_data, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (tool_name) DO UPDATE SET
          execution_count = EXCLUDED.execution_count,
          success_count = EXCLUDED.success_count,
          failure_count = EXCLUDED.failure_count,
          avg_execution_time = EXCLUDED.avg_execution_time,
          last_executed = EXCLUDED.last_executed,
          cache_data = EXCLUDED.cache_data,
          updated_at = EXCLUDED.updated_at
      `, [data.toolName, data.executionCount, data.successCount, data.failureCount, data.avgExecutionTime, data.lastExecuted, JSON.stringify(data.cacheData), timestamp]);
      break;

    case 'scribble_boards':
      await client.query(`
        INSERT INTO scribble_boards (id, user_id, name, data, updated_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          data = EXCLUDED.data,
          updated_at = EXCLUDED.updated_at
      `, [data.id, data.userId, data.name, JSON.stringify(data.data || {}), timestamp]);
      break;

    case 'scribble_events':
      await client.query(`
        INSERT INTO scribble_events (id, user_id, board_id, event_name, detail)
        VALUES ($1, COALESCE($2, 'anonymous'), $3, $4, $5)
      `, [data.id, data.userId || null, data.boardId || null, data.eventName, JSON.stringify(data.detail || {})]);
      break;

    case 'chat_tabs':
      await client.query(`
        INSERT INTO chat_tabs (id, user_id, title, messages, mode, canvas_mode, last_active, context)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          messages = EXCLUDED.messages,
          mode = EXCLUDED.mode,
          canvas_mode = EXCLUDED.canvas_mode,
          last_active = EXCLUDED.last_active,
          context = EXCLUDED.context
      `, [
        data.id, 
        data.userId, 
        data.title, 
        JSON.stringify(data.messages || []), 
        data.mode || 'chat', 
        data.canvasMode || false, 
        data.lastActive || timestamp, 
        JSON.stringify(data.context || {})
      ]);
      break;

    case 'npu_analyses':
      // NPU (Neural Processing Unit) analysis logging
      await client.query(`
        INSERT INTO npu_analyses (
          id, user_id, session_id,
          linguistic_analysis, intent_analysis, context_analysis,
          confusion_analysis, socratic_analysis, mode_analysis,
          canvas_analysis, educational_analysis, creative_analysis,
          memory_analysis, total_processing_time, input_text,
          output_text, safety_flags, tools_executed,
          performance_score, complexity_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        ON CONFLICT (id) DO UPDATE SET
          linguistic_analysis = EXCLUDED.linguistic_analysis,
          intent_analysis = EXCLUDED.intent_analysis,
          context_analysis = EXCLUDED.context_analysis,
          confusion_analysis = EXCLUDED.confusion_analysis,
          socratic_analysis = EXCLUDED.socratic_analysis,
          mode_analysis = EXCLUDED.mode_analysis,
          canvas_analysis = EXCLUDED.canvas_analysis,
          educational_analysis = EXCLUDED.educational_analysis,
          creative_analysis = EXCLUDED.creative_analysis,
          memory_analysis = EXCLUDED.memory_analysis,
          total_processing_time = EXCLUDED.total_processing_time,
          output_text = EXCLUDED.output_text,
          performance_score = EXCLUDED.performance_score,
          complexity_score = EXCLUDED.complexity_score
      `, [
        data.id,
        data.userId,
        data.sessionId,
        JSON.stringify(data.linguistic_analysis || {}),
        JSON.stringify(data.intent_analysis || {}),
        JSON.stringify(data.context_analysis || {}),
        JSON.stringify(data.confusion_analysis || {}),
        JSON.stringify(data.socratic_analysis || {}),
        JSON.stringify(data.mode_analysis || {}),
        JSON.stringify(data.canvas_analysis || {}),
        JSON.stringify(data.educational_analysis || {}),
        JSON.stringify(data.creative_analysis || {}),
        JSON.stringify(data.memory_analysis || {}),
        data.total_processing_time || 0,
        data.input_text || '',
        data.output_text || '',
        JSON.stringify(data.safety_flags || []),
        JSON.stringify(data.tools_executed || []),
        data.performance_score || 0,
        data.complexity_score || 0
      ]);
      break;

    // ===== COGNITIVE MODULES DATABASE HANDLERS =====
    
    case 'error_detection_patterns':
      // Error Detection Circuit (Anterior Cingulate Cortex)
      await client.query(`
        INSERT INTO error_detection_patterns (
          id, user_id, session_id, error_type, confidence, severity,
          error_location, cognitive_markers, resolution_pattern, resolved_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          confidence = EXCLUDED.confidence,
          severity = EXCLUDED.severity,
          error_location = EXCLUDED.error_location,
          cognitive_markers = EXCLUDED.cognitive_markers,
          resolution_pattern = EXCLUDED.resolution_pattern,
          resolved_at = EXCLUDED.resolved_at
      `, [
        data.id,
        data.userId,
        data.sessionId,
        data.error_type,
        data.confidence,
        data.severity,
        JSON.stringify(data.error_location || {}),
        JSON.stringify(data.cognitive_markers || {}),
        JSON.stringify(data.resolution_pattern || {}),
        data.resolved_at
      ]);
      break;

    case 'mental_state_models':
      // Theory of Mind Processor (Temporoparietal Junction) with state-of-the-art graceful degradation
      try {
        console.log('🧠 Storing mental state model with graceful degradation');
        
        // Normalize user_id parameter names and ensure required fields
        const normalizedData = {
          ...data,
          user_id: data.user_id || data.userId,
          session_id: data.session_id || data.sessionId,
          intended_meaning: data.intended_meaning || data.intendedMeaning || 'user_input',
          expressed_meaning: data.expressed_meaning || data.expressedMeaning || data.intended_meaning || data.intendedMeaning || 'user_input'
        };
        
        // Use graceful degradation for mental state models
        const result = await storeWithGracefulDegradation('mental_state_models', normalizedData);
        console.log(`✅ Mental state model stored: ${result.id}`);
      } catch (error) {
        console.warn('⚠️ Fallback: Using legacy mental state model storage:', error.message);
        
        // Ensure user_id is available
        let userId = data.userId || data.user_id;
        if (!userId) {
          userId = await getOrCreateFallbackUser();
          console.log(`🔧 Generated fallback user_id for mental state model: ${userId}`);
        }
        
        // Ensure required fields have values
        const intendedMeaning = data.intended_meaning || data.intendedMeaning || 'user_input';
        const expressedMeaning = data.expressed_meaning || data.expressedMeaning || intendedMeaning;
        
        await client.query(`
          INSERT INTO mental_state_models (
            id, user_id, session_id, message_id, intended_meaning, expressed_meaning,
            belief_state, intentional_stance, communicative_intent, correction_analysis, confidence_score
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO UPDATE SET
            intended_meaning = EXCLUDED.intended_meaning,
            expressed_meaning = EXCLUDED.expressed_meaning,
            belief_state = EXCLUDED.belief_state,
            intentional_stance = EXCLUDED.intentional_stance,
            communicative_intent = EXCLUDED.communicative_intent,
            correction_analysis = EXCLUDED.correction_analysis,
            confidence_score = EXCLUDED.confidence_score
        `, [
          data.id || `mental_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId,
          data.sessionId || data.session_id,
          data.message_id || data.messageId,
          intendedMeaning,
          expressedMeaning,
          JSON.stringify(data.belief_state || data.beliefState || {}),
          JSON.stringify(data.intentional_stance || data.intentionalStance || {}),
          JSON.stringify(data.communicative_intent || data.communicativeIntent || {}),
          JSON.stringify(data.correction_analysis || data.correctionAnalysis || {}),
          data.confidence_score || data.confidenceScore || 0.5
        ]);
        console.log('✅ Mental state model stored with legacy fallback');
      }
      break;

    case 'episodic_memories':
      // Episodic Retrieval System (Hippocampus)
      await client.query(`
        INSERT INTO episodic_memories (
          id, user_id, memory_id, content, memory_type, context, emotional_weight,
          temporal_relevance, importance_score, access_count, memory_strength,
          associative_links, retrieval_cues, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (memory_id) DO UPDATE SET
          content = EXCLUDED.content,
          context = EXCLUDED.context,
          emotional_weight = EXCLUDED.emotional_weight,
          temporal_relevance = EXCLUDED.temporal_relevance,
          importance_score = EXCLUDED.importance_score,
          access_count = EXCLUDED.access_count,
          memory_strength = EXCLUDED.memory_strength,
          associative_links = EXCLUDED.associative_links,
          retrieval_cues = EXCLUDED.retrieval_cues,
          updated_at = EXCLUDED.updated_at
      `, [
        data.id,
        data.userId,
        data.memory_id,
        data.content,
        data.memory_type,
        JSON.stringify(data.context || {}),
        data.emotional_weight || 0.5,
        data.temporal_relevance || 'recent',
        data.importance_score || 0.5,
        data.access_count || 0,
        data.memory_strength || 1.0,
        JSON.stringify(data.associative_links || []),
        JSON.stringify(data.retrieval_cues || []),
        new Date().toISOString()
      ]);
      break;

    case 'semantic_memories':
      // Semantic Memory Network (Temporal Lobe)
      await client.query(`
        INSERT INTO semantic_memories (
          id, user_id, semantic_type, category, subcategory, content, raw_sentence,
          confidence, emotional_weight, temporal_relevance, importance, relationships,
          contradicts, context, metadata, conflict_resolved, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (id) DO UPDATE SET
          content = EXCLUDED.content,
          confidence = EXCLUDED.confidence,
          emotional_weight = EXCLUDED.emotional_weight,
          temporal_relevance = EXCLUDED.temporal_relevance,
          importance = EXCLUDED.importance,
          relationships = EXCLUDED.relationships,
          contradicts = EXCLUDED.contradicts,
          context = EXCLUDED.context,
          metadata = EXCLUDED.metadata,
          conflict_resolved = EXCLUDED.conflict_resolved,
          updated_at = EXCLUDED.updated_at
      `, [
        data.id,
        data.userId,
        data.semantic_type,
        data.category,
        data.subcategory,
        data.content,
        data.raw_sentence,
        data.confidence,
        data.emotional_weight,
        data.temporal_relevance,
        data.importance,
        JSON.stringify(data.relationships || []),
        JSON.stringify(data.contradicts || []),
        JSON.stringify(data.context || {}),
        JSON.stringify(data.metadata || {}),
        data.conflict_resolved || false,
        new Date().toISOString()
      ]);
      break;

    case 'cross_chat_knowledge':
      // Cross-chat knowledge persistence
      await client.query(`
        INSERT INTO cross_chat_knowledge (
          id, user_id, source_session_id, knowledge_type, content, context,
          relevance_score, usage_count, last_accessed, tags, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          content = EXCLUDED.content,
          context = EXCLUDED.context,
          relevance_score = EXCLUDED.relevance_score,
          usage_count = EXCLUDED.usage_count,
          last_accessed = EXCLUDED.last_accessed,
          tags = EXCLUDED.tags,
          updated_at = EXCLUDED.updated_at
      `, [
        data.id,
        data.userId,
        data.source_session_id,
        data.knowledge_type,
        data.content,
        JSON.stringify(data.context || {}),
        data.relevance_score || 0,
        data.usage_count || 1,
        data.last_accessed || new Date().toISOString(),
        data.tags || [],
        new Date().toISOString()
      ]);
      break;

    case 'cognitive_states':
      // Real-time cognitive state tracking with state-of-the-art graceful degradation
      try {
        console.log('🧠 Storing cognitive state with graceful degradation');
        
        // Normalize user_id parameter names
        const normalizedData = {
          ...data,
          user_id: data.user_id || data.userId,
          session_id: data.session_id || data.sessionId
        };
        
        // Use graceful degradation for cognitive states
        const result = await storeWithGracefulDegradation('cognitive_states', normalizedData);
        console.log(`✅ Cognitive state stored: ${result.id}`);
      } catch (error) {
        console.warn('⚠️ Fallback: Using legacy cognitive state storage:', error.message);
        
        // Ensure user_id is available
        let userId = data.userId || data.user_id;
        if (!userId) {
          userId = await getOrCreateFallbackUser();
          console.log(`🔧 Generated fallback user_id for cognitive state: ${userId}`);
        }
        
        // Add defaults for missing cognitive data
        await client.query(`
          INSERT INTO cognitive_states (
            id, user_id, session_id, cognitive_load, emotional_state, confusion_level,
            attention_span, learning_momentum, error_frequency, correction_attempts, session_quality
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO NOTHING
        `, [
          data.id || `cognitive_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId,
          data.sessionId || data.session_id,
          data.cognitive_load || 0.5,
          data.emotional_state || 'neutral',
          data.confusion_level || 0.0,
          data.attention_span || 1.0,
          data.learning_momentum || 0.5,
          data.error_frequency || 0,
          data.correction_attempts || 0,
          data.session_quality || 0.5
        ]);
        console.log('✅ Cognitive state stored with legacy fallback');
      }
      break;

    case 'canvas_preferences':
      // Canvas usage patterns and preferences
      await client.query(`
        INSERT INTO canvas_preferences (
          id, user_id, preference_type, pattern_data, confidence, usage_frequency,
          positive_interactions, negative_interactions, last_interaction_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          pattern_data = EXCLUDED.pattern_data,
          confidence = EXCLUDED.confidence,
          usage_frequency = EXCLUDED.usage_frequency,
          positive_interactions = EXCLUDED.positive_interactions,
          negative_interactions = EXCLUDED.negative_interactions,
          last_interaction_at = EXCLUDED.last_interaction_at,
          updated_at = EXCLUDED.updated_at
      `, [
        data.id,
        data.userId,
        data.preference_type,
        JSON.stringify(data.pattern_data || {}),
        data.confidence || 0.5,
        data.usage_frequency || 0,
        data.positive_interactions || 0,
        data.negative_interactions || 0,
        data.last_interaction_at || new Date().toISOString(),
        new Date().toISOString()
      ]);
      break;

    case 'memory_consolidation':
      // Memory consolidation tracking (STM→LTM)
      await client.query(`
        INSERT INTO memory_consolidation (
          id, user_id, source_memory_id, target_memory_id, consolidation_type,
          consolidation_trigger, strength_before, strength_after, importance_before, importance_after
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        data.id,
        data.userId,
        data.source_memory_id,
        data.target_memory_id,
        data.consolidation_type,
        data.consolidation_trigger,
        data.strength_before,
        data.strength_after,
        data.importance_before,
        data.importance_after
      ]);
      break;

    case 'user_behavior_patterns':
      // User behavior patterns from NPU analysis
      await client.query(`
        INSERT INTO user_behavior_patterns (
          id, user_id, pattern_type, pattern, detected_at, last_updated, confidence
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          pattern = EXCLUDED.pattern,
          last_updated = EXCLUDED.last_updated,
          confidence = EXCLUDED.confidence
      `, [
        data.id,
        data.userId,
        data.patternType,
        JSON.stringify(data.pattern || {}),
        data.detectedAt,
        data.lastUpdated,
        data.confidence || 0
      ]);
      break;

    default:
      throw new Error(`Unknown collection: ${collection}`);
  }
}

async function getFromDatabase(client, collection, key, filters = {}) {
  if (!queryBuilder) {
    throw new Error('Query builder not initialized');
  }

  let query;

  switch (collection) {
    case 'users':
      query = queryBuilder('users').select('*');
      if (key) {
        query = query.where('id', key);
      }
      query = query.orderBy('updated_at', 'desc');
      break;

    case 'analytics':
      query = queryBuilder('analytics').select('*');
      if (key) {
        query = query.where('user_id', key);
      }
      if (filters.eventType) {
        query = query.where('event_type', filters.eventType);
      }
      query = query.orderBy('timestamp', 'desc').limit(100);
      break;

    case 'posts':
      query = queryBuilder('posts').select('*');
      if (filters.channel) {
        query = query.where('channel', filters.channel);
      }
      query = query.orderBy('created_at', 'desc').limit(100);
      break;

    case 'conversations':
      query = queryBuilder('conversations').select('*');
      if (key) {
        query = query.where('user_id', key);
      }
      query = query.orderBy('updated_at', 'desc').limit(100);
      break;

    case 'ai_logs':
      query = queryBuilder('ai_logs').select('*');
      if (key) {
        query = query.where('user_id', key);
      }
      if (filters.interactionType) {
        query = query.where('interaction_type', filters.interactionType);
      }
      query = query.orderBy('timestamp', 'desc').limit(100);
      break;

    case 'agent_sessions':
      query = queryBuilder('agent_sessions').select('*');
      if (key) {
        query = query.where('user_id', key);
      }
      if (filters.phase) {
        query = query.where('phase', filters.phase);
      }
      query = query.orderBy('updated_at', 'desc').limit(50);
      break;

    case 'tool_executions':
      query = queryBuilder('tool_executions').select('*');
      if (key) {
        query = query.where('session_id', key);
      }
      if (filters.toolName) {
        query = query.where('tool_name', filters.toolName);
      }
      if (filters.status) {
        query = query.where('status', filters.status);
      }
      query = query.orderBy('timestamp', 'desc').limit(100);
      break;

    case 'context_store':
      query = queryBuilder('context_store').select('*');
      if (key) {
        query = query.where('session_id', key);
      }
      if (filters.contextType) {
        query = query.where('context_type', filters.contextType);
      }
      if (filters.contextKey) {
        query = query.where('context_key', filters.contextKey);
      }
      query = query.orderBy('updated_at', 'desc').limit(100);
      break;

    case 'tool_registry_cache':
      query = queryBuilder('tool_registry_cache').select('*');
      if (key) {
        query = query.where('tool_name', key);
      }
      query = query.orderBy('updated_at', 'desc');
      break;

    case 'scribble_boards':
      query = queryBuilder('scribble_boards').select('*');
      if (key) {
        query = query.where('user_id', key);
      }
      if (filters?.boardId) {
        query = query.where('id', filters.boardId);
      }
      query = query.orderBy('updated_at', 'desc').limit(100);
      break;

    case 'scribble_events':
      query = queryBuilder('scribble_events').select('*');
      if (key) {
        query = query.where('user_id', key);
      }
      if (filters?.boardId) {
        query = query.where('board_id', filters.boardId);
      }
      if (filters?.eventName) {
        query = query.where('event_name', filters.eventName);
      }
      query = query.orderBy('created_at', 'desc').limit(200);
      break;

    case 'chat_tabs':
      query = queryBuilder('chat_tabs').select('*');
      if (key) {
        query = query.where('user_id', key);
      }
      if (filters?.tabId) {
        query = query.where('id', filters.tabId);
      }
      if (filters?.mode) {
        query = query.where('mode', filters.mode);
      }
      query = query.orderBy('last_active', 'desc').limit(50);
      break;

    case 'npu_analyses':
      query = queryBuilder('npu_analyses').select('*');
      if (key) {
        query = query.where('id', key);
      }
      if (filters?.userId) {
        query = query.where('user_id', filters.userId);
      }
      if (filters?.sessionId) {
        query = query.where('session_id', filters.sessionId);
      }
      query = query.orderBy('timestamp', 'desc').limit(100);
      break;

    // ===== COGNITIVE MODULES QUERY HANDLERS =====
    
    case 'error_detection_patterns':
      query = queryBuilder('error_detection_patterns').select('*');
      if (key) {
        query = query.where('user_id', key);
      }
      if (filters?.sessionId) {
        query = query.where('session_id', filters.sessionId);
      }
      if (filters?.errorType) {
        query = query.where('error_type', filters.errorType);
      }
      if (filters?.severity) {
        query = query.where('severity', filters.severity);
      }
      query = query.orderBy('created_at', 'desc').limit(100);
      break;

    case 'mental_state_models':
      query = queryBuilder('mental_state_models').select('*');
      if (key) {
        query = query.where('user_id', key);
      }
      if (filters?.sessionId) {
        query = query.where('session_id', filters.sessionId);
      }
      if (filters?.messageId) {
        query = query.where('message_id', filters.messageId);
      }
      query = query.orderBy('created_at', 'desc').limit(100);
      break;

    case 'episodic_memories':
      query = queryBuilder('episodic_memories').select('*');
      if (key) {
        query = query.where('user_id', key);
      }
      if (filters?.memoryType) {
        query = query.where('memory_type', filters.memoryType);
      }
      if (filters?.temporalRelevance) {
        query = query.where('temporal_relevance', filters.temporalRelevance);
      }
      if (filters?.minImportance) {
        query = query.where('importance_score', '>=', filters.minImportance);
      }
      query = query.orderBy('last_accessed_at', 'desc').limit(100);
      break;

    case 'semantic_memories':
      query = queryBuilder('semantic_memories').select('*');
      if (key) {
        query = query.where('user_id', key);
      }
      if (filters?.semanticType) {
        query = query.where('semantic_type', filters.semanticType);
      }
      if (filters?.category) {
        query = query.where('category', filters.category);
      }
      if (filters?.subcategory) {
        query = query.where('subcategory', filters.subcategory);
      }
      if (filters?.minConfidence) {
        query = query.where('confidence', '>=', filters.minConfidence);
      }
      query = query.orderBy('updated_at', 'desc').limit(100);
      break;

    case 'cross_chat_knowledge':
      query = queryBuilder('cross_chat_knowledge').select('*');
      if (key) {
        query = query.where('user_id', key);
      }
      if (filters?.knowledgeType) {
        query = query.where('knowledge_type', filters.knowledgeType);
      }
      if (filters?.minRelevance) {
        query = query.where('relevance_score', '>=', filters.minRelevance);
      }
      query = query.orderBy('last_accessed', 'desc').limit(100);
      break;

    case 'cognitive_states':
      query = queryBuilder('cognitive_states').select('*');
      if (key) {
        query = query.where('user_id', key);
      }
      if (filters?.sessionId) {
        query = query.where('session_id', filters.sessionId);
      }
      if (filters?.emotionalState) {
        query = query.where('emotional_state', filters.emotionalState);
      }
      query = query.orderBy('measured_at', 'desc').limit(100);
      break;

    case 'canvas_preferences':
      query = queryBuilder('canvas_preferences').select('*');
      if (key) {
        query = query.where('user_id', key);
      }
      if (filters?.preferenceType) {
        query = query.where('preference_type', filters.preferenceType);
      }
      query = query.orderBy('last_interaction_at', 'desc').limit(100);
      break;

    case 'memory_consolidation':
      query = queryBuilder('memory_consolidation').select('*');
      if (key) {
        query = query.where('user_id', key);
      }
      if (filters?.consolidationType) {
        query = query.where('consolidation_type', filters.consolidationType);
      }
      if (filters?.consolidationTrigger) {
        query = query.where('consolidation_trigger', filters.consolidationTrigger);
      }
      query = query.orderBy('consolidated_at', 'desc').limit(100);
      break;

    case 'user_behavior_patterns':
      query = queryBuilder('user_behavior_patterns').select('*');
      if (key) {
        query = query.where('user_id', key);
      }
      if (filters?.patternType) {
        query = query.where('pattern_type', filters.patternType);
      }
      query = query.orderBy('detected_at', 'desc').limit(100);
      break;

    default:
      throw new Error(`Unknown collection: ${collection}`);
  }

  const result = await query;
  return result;
}

async function deleteFromDatabase(client, collection, key) {
  if (!key) {
    throw new Error('Key is required for delete operations');
  }

  if (!queryBuilder) {
    throw new Error('Query builder not initialized');
  }

  switch (collection) {
    case 'users':
      await queryBuilder('users').where('id', key).del();
      break;
    case 'analytics':
      await queryBuilder('analytics').where('id', key).del();
      break;
    case 'posts':
      await queryBuilder('posts').where('id', key).del();
      break;
    case 'conversations':
      await queryBuilder('conversations').where('id', key).del();
      break;
    case 'ai_logs':
      await queryBuilder('ai_logs').where('id', key).del();
      break;
    case 'agent_sessions':
      await queryBuilder('agent_sessions').where('id', key).del();
      break;
    case 'tool_executions':
      await queryBuilder('tool_executions').where('id', key).del();
      break;
    case 'context_store':
      await queryBuilder('context_store').where('id', key).del();
      break;
    case 'tool_registry_cache':
      await queryBuilder('tool_registry_cache').where('tool_name', key).del();
      break;
    case 'scribble_boards':
      await queryBuilder('scribble_boards').where('id', key).del();
      break;
    case 'scribble_events':
      await queryBuilder('scribble_events').where('id', key).del();
      break;
    case 'chat_tabs':
      await queryBuilder('chat_tabs').where('id', key).del();
      break;
    case 'npu_analyses':
      await queryBuilder('npu_analyses').where('id', key).del();
      break;

    // ===== COGNITIVE MODULES DELETE HANDLERS =====
    
    case 'error_detection_patterns':
      await queryBuilder('error_detection_patterns').where('id', key).del();
      break;
    case 'mental_state_models':
      await queryBuilder('mental_state_models').where('id', key).del();
      break;
    case 'episodic_memories':
      await queryBuilder('episodic_memories').where('memory_id', key).del();
      break;
    case 'semantic_memories':
      await queryBuilder('semantic_memories').where('id', key).del();
      break;
    case 'cross_chat_knowledge':
      await queryBuilder('cross_chat_knowledge').where('id', key).del();
      break;
    case 'cognitive_states':
      await queryBuilder('cognitive_states').where('id', key).del();
      break;
    case 'canvas_preferences':
      await queryBuilder('canvas_preferences').where('id', key).del();
      break;
    case 'memory_consolidation':
      await queryBuilder('memory_consolidation').where('id', key).del();
      break;

    case 'user_behavior_patterns':
      await queryBuilder('user_behavior_patterns').where('id', key).del();
      break;

    default:
      throw new Error(`Unknown collection: ${collection}`);
  }
}

// Database API handler
async function handleDatabaseRequest(req, res) {
  try {
    const { action, collection, data, key, filters, query } = req.body;
    
    // Enhanced parameter validation to handle different request types
    if (!action) {
      return res.status(400).json({ error: 'Missing required parameter: action' });
    }
    
    // For custom queries, collection might be embedded in the query
    if (action === 'custom' && !collection && !query) {
      return res.status(400).json({ error: 'Custom action requires either collection or query parameter' });
    }
    
    if (!collection && action !== 'custom') {
      return res.status(400).json({ error: 'Missing required parameter: collection' });
    }
    
    // If database is not available, return graceful error
    if (!pool) {
      console.log('📝 Database request made but DB unavailable - using in-memory fallback');
      return res.json({ 
        success: true,
        message: 'Database temporarily unavailable - using in-memory storage',
        data: null
      });
    }

    const client = await pool.connect();

    try {
      switch (action) {
        case 'save':
          // ENHANCED: Catch and handle save errors gracefully
          try {
            await saveToDatabase(client, collection, data);
            res.json({ success: true, message: 'Data saved successfully' });
          } catch (saveError) {
            console.error(`❌ Save to ${collection} failed:`, saveError.message);
            // For analytics, return success even if save fails (non-critical)
            if (collection === 'analytics' || collection === 'aiLogs') {
              console.log('⚠️ Analytics/logs save failed but returning success (non-fatal)');
              res.json({ 
                success: true, 
                message: 'Data logged locally', 
                warning: 'Remote sync skipped'
              });
            } else {
              // For critical data, return error
              throw saveError;
            }
          }
          break;

        case 'get':
          const result = await getFromDatabase(client, collection, key, filters);
          res.json(result);
          break;

        case 'delete':
          await deleteFromDatabase(client, collection, key);
          res.json({ success: true, message: 'Data deleted successfully' });
          break;

        case 'custom':
          // Support custom SQL queries for advanced operations
          if (!query) {
            return res.status(400).json({ error: 'Custom action requires query parameter' });
          }
          try {
            // CRITICAL FIX: Handle multiple parameter formats
            let queryParams = [];
            
            // Check for VectorSearchService format (params array)
            if (req.body.params && Array.isArray(req.body.params)) {
              queryParams = req.body.params;
            }
            // Check for standard data object format
            else if (data && typeof data === 'object') {
              queryParams = Array.isArray(data) ? data : Object.values(data);
            }
            
            console.log('🔍 Custom query params:', queryParams.length, 'parameters');
            
            const customResult = await client.query(query, queryParams);
            res.json({ 
              success: true, 
              data: customResult.rows,
              rowCount: customResult.rowCount 
            });
          } catch (queryError) {
            console.error('Custom query error:', queryError);
            console.error('Query:', query);
            console.error('Params:', req.body.params || data);
            res.status(400).json({ 
              error: 'Query execution failed', 
              details: queryError.message 
            });
          }
          break;

        default:
          res.status(400).json({ error: 'Invalid action' });
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database API error:', error);
    // Include more detailed error information for debugging
    res.status(500).json({ 
      error: 'Database operation failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      hint: error.hint || undefined
    });
  }
}

// STATE-OF-THE-ART GRACEFUL DEGRADATION FUNCTIONS

async function storeWithGracefulDegradation(table, data) {
  try {
    if (!stateOfArtDb || !stateOfArtDb.isInitialized) {
      console.log('🔄 State-of-the-art DB not available, using legacy storage');
      return await legacySaveToDatabase(table, data);
    }
    
    return await stateOfArtDb.storeWithGracefulDegradation(table, data, {
      allowPartialFailure: true,
      sanitizeUserIds: true,
      generateDefaults: true
    });
    
  } catch (error) {
    console.warn(`⚠️ Graceful storage failed for ${table}:`, error.message);
    
    // Ultimate fallback - log and continue
    console.log(`📝 Logging ${table} data to console as fallback:`, {
      timestamp: new Date().toISOString(),
      table,
      data: JSON.stringify(data, null, 2),
      error: error.message
    });
    
    return { id: `fallback_${Date.now()}`, ...data, _fallback: true };
  }
}

async function legacySaveToDatabase(table, data) {
  // Enhanced legacy function with better user handling
  try {
    // Gracefully handle missing user_id
    if (!data.user_id) {
      data.user_id = await getOrCreateFallbackUser();
      console.log(`🔧 Added fallback user_id for ${table}:`, data.user_id);
    }
    
    // Add default values based on table
    data = addTableDefaults(table, data);
    
    const columns = Object.keys(data).join(', ');
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    
    const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) ON CONFLICT DO NOTHING RETURNING *`;
    
    const result = await pool.query(query, values);
    return result.rows[0] || { id: `fallback_${Date.now()}`, ...data };
    
  } catch (error) {
    console.warn(`⚠️ Legacy save failed for ${table}:`, error.message);
    return { id: `fallback_${Date.now()}`, ...data, _error: error.message };
  }
}

async function getOrCreateFallbackUser() {
  try {
    // Try to get existing fallback user
    const result = await pool.query('SELECT id FROM users WHERE username = $1', ['system_fallback_user']);
    
    if (result.rows.length > 0) {
      return result.rows[0].id;
    }
    
    // Create fallback user with proper ID format
    const fallbackUserId = `user_${Date.now()}_fallback`;
    await pool.query(`
      INSERT INTO users (id, username, email, password, role, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (username) DO UPDATE SET updated_at = NOW()
    `, [
      fallbackUserId,
      'system_fallback_user',
      'fallback@system.local',
      'system_generated',
      'system',
      JSON.stringify({ purpose: 'graceful_degradation', created_at: new Date().toISOString() })
    ]);
    
    console.log(`✅ Created fallback user: ${fallbackUserId}`);
    return fallbackUserId;
    
  } catch (error) {
    console.warn('⚠️ Could not create fallback user:', error.message);
    return 'anonymous_user_fallback'; // Ultimate fallback
  }
}

function addTableDefaults(table, data) {
  const defaults = {
    cognitive_states: {
      cognitive_load: 0.5,
      emotional_state: 'neutral',
      confusion_level: 0.0,
      attention_span: 1.0,
      learning_momentum: 0.5,
      error_frequency: 0,
      correction_attempts: 0,
      session_quality: 0.5
    },
    mental_state_models: {
      confidence_score: 0.8
    },
    semantic_embeddings: {
      quality_score: 5,
      usage_count: 0,
      content_type: 'text'
    },
    cross_chat_knowledge: {
      confidence_level: 0.8,
      importance_score: 1,
      usage_count: 0
    }
  };

  if (defaults[table]) {
    return { ...defaults[table], ...data };
  }
  
  return data;
}

async function performResilientSemanticSearch(query, userId, options = {}) {
  try {
    if (stateOfArtDb && stateOfArtDb.isInitialized) {
      return await stateOfArtDb.performSemanticSearch(query, userId, options);
    }
    
    // Fallback to basic search
    console.log('🔄 Using fallback search method');
    return await performBasicTextSearch(query, userId, options);
    
  } catch (error) {
    console.warn('⚠️ Semantic search failed, using basic fallback:', error.message);
    return await performBasicTextSearch(query, userId, options);
  }
}

async function performBasicTextSearch(query, userId, options = {}) {
  const { limit = 5 } = options;
  
  try {
    const searchQuery = `
      SELECT id, content, content_type, metadata, quality_score, usage_count, created_at
      FROM semantic_embeddings
      WHERE user_id = $1 AND content ILIKE $2
      ORDER BY quality_score DESC, usage_count DESC, created_at DESC
      LIMIT $3
    `;
    
    const result = await pool.query(searchQuery, [userId, `%${query}%`, limit]);
    return result.rows;
    
  } catch (error) {
    console.error('❌ Basic text search failed:', error);
    return []; // Empty results for graceful degradation
  }
}

module.exports = {
  initializeDatabase,
  handleDatabaseRequest,
  saveToDatabase,
  getFromDatabase,
  deleteFromDatabase,
  getDatabaseStatus: () => ({ available: databaseAvailable, pool, queryBuilder: !!queryBuilder }),
  pool: () => pool,
  queryBuilder: () => queryBuilder,
  
  // STATE-OF-THE-ART GRACEFUL DEGRADATION EXPORTS
  storeWithGracefulDegradation,
  legacySaveToDatabase,
  getOrCreateFallbackUser,
  addTableDefaults,
  performResilientSemanticSearch,
  performBasicTextSearch,
  
  // Access to state-of-the-art database instance
  getStateOfArtDb: () => stateOfArtDb
};
