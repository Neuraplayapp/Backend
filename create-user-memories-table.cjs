// Create the missing user_memories table with correct schema
const { Pool } = require('pg');
require('dotenv').config();

// Load development.env
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, 'development.env');

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
  ssl: process.env.NODE_ENV === 'production' || process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false
});

(async () => {
  try {
    console.log('🔧 CREATING user_memories TABLE...');
    
    // First check if table exists
    const tableExistsResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_memories'
      );
    `);
    
    const tableExists = tableExistsResult.rows[0].exists;
    console.log(`Table exists: ${tableExists}`);
    
    if (tableExists) {
      // Check current schema
      const schemaResult = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'user_memories' 
        ORDER BY ordinal_position
      `);
      
      console.log('Current schema:');
      schemaResult.rows.forEach(col => {
        console.log(`  ${col.column_name} (${col.data_type})`);
      });
      
      // Drop and recreate if schema is wrong
      if (!schemaResult.rows.some(col => col.column_name === 'content')) {
        console.log('❌ Schema is wrong, dropping table...');
        await pool.query('DROP TABLE IF EXISTS user_memories CASCADE');
        console.log('✅ Dropped table');
      }
    }
    
    // Create table with correct schema
    console.log('🔧 Creating user_memories table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_memories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        memory_key VARCHAR(255) NOT NULL,
        content TEXT NOT NULL, -- Actual memory content
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
    
    console.log('✅ user_memories table created successfully!');
    
    // Verify schema
    const verifyResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_memories' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 VERIFIED SCHEMA:');
    verifyResult.rows.forEach(col => {
      console.log(`  ✅ ${col.column_name} (${col.data_type})`);
    });
    
  } catch (error) {
    console.error('❌ Table creation failed:', error.message);
  } finally {
    await pool.end();
  }
})();

