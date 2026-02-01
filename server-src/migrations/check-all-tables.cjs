const { Pool } = require('pg');

async function checkAllTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const userId = 'admin-smt-001';
    console.log(`🔍 Checking ALL memory-related tables for user: ${userId}\n`);
    
    // Check user_memories
    const userMem = await pool.query(
      `SELECT COUNT(*) as count FROM user_memories WHERE user_id = $1`,
      [userId]
    );
    console.log(`📊 user_memories: ${userMem.rows[0].count} rows`);
    
    // Check cross_chat_knowledge
    try {
      const crossChat = await pool.query(
        `SELECT COUNT(*) as count FROM cross_chat_knowledge WHERE user_id = $1`,
        [userId]
      );
      console.log(`📊 cross_chat_knowledge: ${crossChat.rows[0].count} rows`);
    } catch (e) {
      console.log(`⚠️ cross_chat_knowledge: table doesn't exist or error`);
    }
    
    // Check episodic_memories
    try {
      const episodic = await pool.query(
        `SELECT COUNT(*) as count FROM episodic_memories WHERE user_id = $1`,
        [userId]
      );
      console.log(`📊 episodic_memories: ${episodic.rows[0].count} rows`);
    } catch (e) {
      console.log(`⚠️ episodic_memories: table doesn't exist or error`);
    }
    
    // Check semantic_memories
    try {
      const semantic = await pool.query(
        `SELECT COUNT(*) as count FROM semantic_memories WHERE user_id = $1`,
        [userId]
      );
      console.log(`📊 semantic_memories: ${semantic.rows[0].count} rows`);
    } catch (e) {
      console.log(`⚠️ semantic_memories: table doesn't exist or error`);
    }
    
    // Check hnsw_vector_metadata
    try {
      const hnsw = await pool.query(
        `SELECT COUNT(*) as count FROM hnsw_vector_metadata WHERE user_id = $1`,
        [userId]
      );
      console.log(`📊 hnsw_vector_metadata: ${hnsw.rows[0].count} rows`);
    } catch (e) {
      console.log(`⚠️ hnsw_vector_metadata: table doesn't exist or error`);
    }
    
    // List all tables
    console.log('\n📋 All tables in database:');
    const tables = await pool.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    );
    tables.rows.forEach(row => console.log(`  - ${row.tablename}`));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkAllTables();

