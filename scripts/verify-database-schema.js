#!/usr/bin/env node

// Script to verify database schema on Render
const { Pool } = require('pg');

async function verifySchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.RENDER_POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    
    console.log('🔍 Checking for npu_analyses table...');
    
    // Check if npu_analyses table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'npu_analyses'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    console.log(`✅ npu_analyses table exists: ${tableExists}`);
    
    if (tableExists) {
      // Check table columns
      const columnCheck = await client.query(`
        SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'npu_analyses'
        ORDER BY ordinal_position;
      `);
      
      console.log('\n📋 Table columns:');
      columnCheck.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
      });
    } else {
      console.log('❌ Table does not exist! You need to run database initialization.');
    }
    
    // Check other essential tables
    const essentialTables = ['users', 'user_memories', 'cross_chat_knowledge', 'user_behavior_patterns'];
    console.log('\n🔍 Checking other essential tables:');
    
    for (const table of essentialTables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      console.log(`  - ${table}: ${result.rows[0].exists ? '✅' : '❌'}`);
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  } finally {
    await pool.end();
  }
}

// Check if DATABASE_URL is provided
if (!process.env.DATABASE_URL && !process.env.RENDER_POSTGRES_URL) {
  console.error('❌ Please provide DATABASE_URL or RENDER_POSTGRES_URL environment variable');
  console.log('Usage: DATABASE_URL=postgresql://... node scripts/verify-database-schema.js');
  process.exit(1);
}

verifySchema();
