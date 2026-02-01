/**
 * 🗑️ DELETE ALL MEMORIES FOR ALL USERS - DEBUG VERSION
 * 
 * WARNING: This will permanently delete ALL user memories from the database
 */

const { Pool } = require('pg');

async function deleteAllMemories() {
  console.log('🔍 CHECKING DATABASE_URL...');
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  console.log('DATABASE_URL value:', process.env.DATABASE_URL?.substring(0, 30) + '...' || 'NOT FOUND');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment variables!');
    console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('DATA') || k.includes('PG')));
    process.exit(1);
  }
  
  const isLocal = !process.env.DATABASE_URL?.includes('amazonaws.com') && 
                  !process.env.DATABASE_URL?.includes('render.com');
  
  console.log('Is local?', isLocal);
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocal ? false : { rejectUnauthorized: false }
  });

  try {
    console.log('🗑️ COMPREHENSIVE MEMORY DELETION FOR ALL USERS...');
    
    // Test connection first
    console.log('Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');
    
    // List of all memory-related tables - COMPREHENSIVE LIST
    const memoryTables = [
      // Core memory tables
      'user_memories',
      
      // Vector/embedding tables - CRITICAL for semantic search
      'vector_embeddings',
      'semantic_embeddings',
      'hnsw_vector_metadata',
      
      // Knowledge and context tables
      'cross_chat_knowledge',
      'episodic_memories',
      'semantic_memories',
      
      // Canvas and document tables
      'canvas_documents',
      'canvas_preferences',
      
      // Behavioral and analytics tables
      'user_behavior_patterns',
      'npu_analyses',
      'learning_moments',
      'emotional_states',
      'quiz_results',
      
      // Course data (optional - uncomment to clear courses too)
      // 'user_courses'
    ];
    
    let totalDeleted = 0;
    
    for (const table of memoryTables) {
      try {
        // Check if table exists
        const tableCheck = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          )
        `, [table]);
        
        if (!tableCheck.rows[0].exists) {
          console.log(`⏭️ Table ${table} does not exist, skipping`);
          continue;
        }
        
        // Count records
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = parseInt(countResult.rows[0].count);
        
        if (count === 0) {
          console.log(`✅ Table ${table} is already empty`);
          continue;
        }
        
        console.log(`🗑️ Deleting ${count} records from ${table}...`);
        
        // Delete all records
        const deleteResult = await pool.query(`DELETE FROM ${table}`);
        totalDeleted += deleteResult.rowCount || 0;
        
        console.log(`✅ Deleted ${deleteResult.rowCount} records from ${table}`);
        
      } catch (tableError) {
        console.warn(`⚠️ Error with table ${table}:`, tableError.message);
      }
    }
    
    console.log(`\n🧹 CLEANUP COMPLETE: Deleted ${totalDeleted} total records across all memory tables`);
    console.log('📊 All memory systems are now clean - ready for fresh extraction testing');
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error deleting memories:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  deleteAllMemories()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { deleteAllMemories };

