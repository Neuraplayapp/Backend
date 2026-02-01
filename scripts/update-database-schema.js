#!/usr/bin/env node

// Script to update database schema on Render
const { Pool } = require('pg');

async function updateSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.RENDER_POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    
    console.log('🔄 Updating database schema...');
    
    // Create npu_analyses table if it doesn't exist
    console.log('📋 Creating/updating npu_analyses table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS npu_analyses (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        session_id VARCHAR(255) NOT NULL,
        
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
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ npu_analyses table created/verified');
    
    // Create indexes
    console.log('📋 Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_npu_analyses_user_id ON npu_analyses(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_npu_analyses_session_id ON npu_analyses(session_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_npu_analyses_timestamp ON npu_analyses(timestamp);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_npu_analyses_performance ON npu_analyses(performance_score);
    `);
    console.log('✅ Indexes created');
    
    // Check if users table exists (required for foreign key)
    const usersTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (usersTableExists.rows[0].exists) {
      // Check if foreign key already exists
      const fkExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.table_constraints 
          WHERE constraint_type = 'FOREIGN KEY' 
          AND table_name = 'npu_analyses'
          AND constraint_name = 'npu_analyses_user_id_fkey'
        );
      `);
      
      if (!fkExists.rows[0].exists) {
        console.log('📋 Adding foreign key constraint...');
        await client.query(`
          ALTER TABLE npu_analyses 
          ADD CONSTRAINT npu_analyses_user_id_fkey 
          FOREIGN KEY (user_id) REFERENCES users(id);
        `);
        console.log('✅ Foreign key added');
      } else {
        console.log('✅ Foreign key already exists');
      }
    } else {
      console.log('⚠️  Users table not found - skipping foreign key constraint');
    }
    
    console.log('\n✅ Database schema update complete!');
    
    client.release();
  } catch (error) {
    console.error('❌ Database update error:', error.message);
    console.error('Details:', error);
  } finally {
    await pool.end();
  }
}

// Check if DATABASE_URL is provided
if (!process.env.DATABASE_URL && !process.env.RENDER_POSTGRES_URL) {
  console.error('❌ Please provide DATABASE_URL or RENDER_POSTGRES_URL environment variable');
  console.log('Usage: DATABASE_URL=postgresql://... node scripts/update-database-schema.js');
  process.exit(1);
}

updateSchema();
