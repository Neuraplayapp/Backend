/**
 * 🧠 NEURAL SPACED MASTERY - DATABASE MIGRATION
 * 
 * Creates 3 new tables for ML-powered spaced repetition:
 * 1. practice_items - Learning content with semantic embeddings
 * 2. practice_states - SM-2 state per user per item
 * 3. ml_training_data - Training data for neural models
 * 
 * ✅ SAFE: Does not modify existing tables
 * ✅ Uses pgvector (already enabled)
 * ✅ Separate from user_memories system
 */

const { Pool } = require('pg');
require('dotenv').config();

// Load development.env
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '../../development.env');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...values] = trimmed.split('=');
      if (key && values.length > 0) {
        const value = values.join('=').replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
}

const pool = new Pool({
  connectionString: process.env.RENDER_POSTGRES_URL || process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' || process.env.POSTGRES_SSL === 'true' 
    ? { rejectUnauthorized: false } 
    : false
});

(async () => {
  const client = await pool.connect();
  
  try {
    console.log('🧠 Starting Neural Spaced Mastery migration...\n');
    
    // ═══════════════════════════════════════════════════════════════
    // 0️⃣ ENABLE PGVECTOR EXTENSION (outside transaction)
    // ═══════════════════════════════════════════════════════════════
    
    console.log('🔌 Checking pgvector extension...');
    
    let hasVectorSupport = false;
    
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS vector');
      hasVectorSupport = true;
      console.log('✅ pgvector extension enabled\n');
    } catch (vectorError) {
      console.log('⚠️  pgvector not available - using JSONB for embeddings (local dev mode)\n');
      // Don't throw - continue with JSONB fallback
    }
    
    // Now start transaction for table creation
    await client.query('BEGIN');
    
    // ═══════════════════════════════════════════════════════════════
    // 1️⃣ PRACTICE ITEMS - Learning content with semantic embeddings
    // ═══════════════════════════════════════════════════════════════
    
    console.log('📚 Creating practice_items table...');
    
    // Create table with or without vector support
    if (hasVectorSupport) {
      await client.query(`
        CREATE TABLE IF NOT EXISTS practice_items (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          course_id VARCHAR(255) NOT NULL,
          competency_id VARCHAR(255) NOT NULL,
          
          -- Content
          question_text TEXT NOT NULL,
          answer_text TEXT,
          question_type VARCHAR(50) DEFAULT 'multiple_choice',
          
          -- Metadata
          difficulty DECIMAL(3,2) DEFAULT 0.5 CHECK (difficulty >= 0 AND difficulty <= 1),
          concept VARCHAR(255),
          content_type VARCHAR(50) DEFAULT 'textual',
          cognitive_load DECIMAL(3,2) DEFAULT 0.5,
          
          -- Semantic embedding for clustering (pgvector)
          embedding vector(384),
          
          -- Relationships
          related_item_ids JSONB DEFAULT '[]'::jsonb,
          semantic_cluster VARCHAR(255),
          
          -- Timestamps
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          
          -- Indexes for fast lookup
          CONSTRAINT valid_difficulty CHECK (difficulty >= 0 AND difficulty <= 1),
          CONSTRAINT valid_cognitive_load CHECK (cognitive_load >= 0 AND cognitive_load <= 1)
        )
      `);
    } else {
      // Fallback without vector support (local dev)
      await client.query(`
        CREATE TABLE IF NOT EXISTS practice_items (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          course_id VARCHAR(255) NOT NULL,
          competency_id VARCHAR(255) NOT NULL,
          
          -- Content
          question_text TEXT NOT NULL,
          answer_text TEXT,
          question_type VARCHAR(50) DEFAULT 'multiple_choice',
          
          -- Metadata
          difficulty DECIMAL(3,2) DEFAULT 0.5 CHECK (difficulty >= 0 AND difficulty <= 1),
          concept VARCHAR(255),
          content_type VARCHAR(50) DEFAULT 'textual',
          cognitive_load DECIMAL(3,2) DEFAULT 0.5,
          
          -- Semantic embedding for clustering (JSONB fallback)
          embedding JSONB,
          
          -- Relationships
          related_item_ids JSONB DEFAULT '[]'::jsonb,
          semantic_cluster VARCHAR(255),
          
          -- Timestamps
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          
          -- Indexes for fast lookup
          CONSTRAINT valid_difficulty CHECK (difficulty >= 0 AND difficulty <= 1),
          CONSTRAINT valid_cognitive_load CHECK (cognitive_load >= 0 AND cognitive_load <= 1)
        )
      `);
    }
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_practice_items_user 
      ON practice_items(user_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_practice_items_course 
      ON practice_items(course_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_practice_items_competency 
      ON practice_items(competency_id)
    `);
    
    // pgvector index for semantic search (only if vector support available)
    if (hasVectorSupport) {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_practice_items_embedding 
        ON practice_items 
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
      `);
    }
    
    console.log('✅ practice_items table created\n');
    
    // ═══════════════════════════════════════════════════════════════
    // 2️⃣ PRACTICE STATES - SM-2 state per user per item
    // ═══════════════════════════════════════════════════════════════
    
    console.log('📊 Creating practice_states table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS practice_states (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        item_id VARCHAR(255) NOT NULL REFERENCES practice_items(id) ON DELETE CASCADE,
        competency_id VARCHAR(255),
        
        -- SM-2 Algorithm state
        repetitions INTEGER DEFAULT 0,
        ease_factor DECIMAL(4,2) DEFAULT 2.5,
        interval INTEGER DEFAULT 1,
        next_review_date TIMESTAMP WITH TIME ZONE NOT NULL,
        last_reviewed_at TIMESTAMP WITH TIME ZONE,
        
        -- Performance tracking
        total_reviews INTEGER DEFAULT 0,
        correct_reviews INTEGER DEFAULT 0,
        average_response_time INTEGER DEFAULT 0,
        average_quality DECIMAL(3,2) DEFAULT 0,
        consistency_score DECIMAL(3,2) DEFAULT 1.0,
        
        -- Review history (last 20 reviews)
        review_history JSONB DEFAULT '[]'::jsonb,
        
        -- Timestamps
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        -- Constraints
        UNIQUE(user_id, item_id),
        CONSTRAINT valid_ease_factor CHECK (ease_factor >= 1.3),
        CONSTRAINT valid_interval CHECK (interval >= 0)
      )
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_practice_states_user 
      ON practice_states(user_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_practice_states_next_review 
      ON practice_states(next_review_date)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_practice_states_user_review 
      ON practice_states(user_id, next_review_date)
    `);
    
    console.log('✅ practice_states table created\n');
    
    // ═══════════════════════════════════════════════════════════════
    // 3️⃣ ML TRAINING DATA - For future neural model training
    // ═══════════════════════════════════════════════════════════════
    
    console.log('🤖 Creating ml_training_data table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS ml_training_data (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        item_id VARCHAR(255),
        
        -- Input features (14 dimensions for ML model)
        feature_data JSONB NOT NULL,
        
        -- Target outcome (actual results)
        outcome_data JSONB NOT NULL,
        
        -- Metadata
        model_version INTEGER DEFAULT 1,
        recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ml_training_data_user 
      ON ml_training_data(user_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ml_training_data_recorded 
      ON ml_training_data(recorded_at DESC)
    `);
    
    console.log('✅ ml_training_data table created\n');
    
    // ═══════════════════════════════════════════════════════════════
    // 4️⃣ TRIGGERS - Auto-update timestamps
    // ═══════════════════════════════════════════════════════════════
    
    console.log('⚡ Creating triggers...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION update_practice_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS practice_items_updated_at ON practice_items
    `);
    
    await client.query(`
      CREATE TRIGGER practice_items_updated_at
        BEFORE UPDATE ON practice_items
        FOR EACH ROW
        EXECUTE FUNCTION update_practice_updated_at()
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS practice_states_updated_at ON practice_states
    `);
    
    await client.query(`
      CREATE TRIGGER practice_states_updated_at
        BEFORE UPDATE ON practice_states
        FOR EACH ROW
        EXECUTE FUNCTION update_practice_updated_at()
    `);
    
    console.log('✅ Triggers created\n');
    
    // ═══════════════════════════════════════════════════════════════
    // 5️⃣ STATS & VERIFICATION
    // ═══════════════════════════════════════════════════════════════
    
    await client.query('COMMIT');
    
    console.log('📊 Migration Statistics:');
    
    const itemsCount = await client.query('SELECT COUNT(*) FROM practice_items');
    console.log(`   📚 Practice Items: ${itemsCount.rows[0].count}`);
    
    const statesCount = await client.query('SELECT COUNT(*) FROM practice_states');
    console.log(`   📊 Practice States: ${statesCount.rows[0].count}`);
    
    const mlCount = await client.query('SELECT COUNT(*) FROM ml_training_data');
    console.log(`   🤖 ML Training Data: ${mlCount.rows[0].count}`);
    
    // Verify pgvector
    const vectorCheck = await client.query(`
      SELECT COUNT(*) 
      FROM pg_extension 
      WHERE extname = 'vector'
    `);
    
    if (vectorCheck.rows[0].count > 0) {
      console.log('   ✅ pgvector extension enabled');
    } else {
      console.log('   ⚠️  pgvector extension not found');
    }
    
    console.log('\n🎉 Neural Spaced Mastery migration completed successfully!');
    console.log('📝 Next steps:');
    console.log('   1. Start generating courses with practice items');
    console.log('   2. User reviews will automatically collect ML data');
    console.log('   3. System learns from each user individually\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();

