const { Pool } = require('pg');

async function checkMemories() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🔍 Checking memories for smt@neuraplay.biz...\n');
    
    // Get user UUID
    const userResult = await pool.query(
      `SELECT id FROM users WHERE email = 'smt@neuraplay.biz'`
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const userId = userResult.rows[0].id;
    console.log(`✅ User UUID: ${userId}\n`);
    
    // Get family memories
    const familyMemories = await pool.query(
      `SELECT memory_key, memory_value, content, updated_at 
       FROM user_memories 
       WHERE user_id = $1 
       AND (memory_key LIKE '%family%' OR memory_key LIKE '%uncle%' OR memory_key LIKE '%wife%' OR memory_key LIKE '%mother%')
       ORDER BY updated_at DESC`,
      [userId]
    );
    
    console.log(`📊 Found ${familyMemories.rows.length} family-related memories:\n`);
    
    familyMemories.rows.forEach((row, i) => {
      console.log(`${i + 1}. KEY: ${row.memory_key}`);
      console.log(`   VALUE: ${row.memory_value || 'N/A'}`);
      console.log(`   CONTENT: ${(row.content || '').substring(0, 150)}`);
      console.log(`   UPDATED: ${row.updated_at}`);
      console.log('');
    });
    
    // Get ALL recent memories
    const allMemories = await pool.query(
      `SELECT memory_key, LEFT(content, 80) as content_preview
       FROM user_memories 
       WHERE user_id = $1 
       ORDER BY updated_at DESC 
       LIMIT 15`,
      [userId]
    );
    
    console.log(`📋 Last 15 memories (any type):\n`);
    allMemories.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.memory_key}: ${row.content_preview}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkMemories();

