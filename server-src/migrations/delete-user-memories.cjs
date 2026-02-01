/**
 * 🗑️ DELETE ALL MEMORIES FOR SPECIFIC USER
 * 
 * Clears ALL memory-related data for a single user across all tables
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load development.env if it exists
const envPath = path.join(__dirname, '../../development.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  });
  console.log('✅ Loaded development.env');
}

async function deleteUserMemories(userId) {
  const isLocal = !process.env.DATABASE_URL?.includes('amazonaws.com') && 
                  !process.env.DATABASE_URL?.includes('render.com');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocal ? false : { rejectUnauthorized: false }
  });

  try {
    if (!userId) {
      console.error('❌ Usage: node delete-user-memories.cjs <userId>');
      process.exit(1);
    }
    
    console.log(`🗑️ DELETING ALL MEMORIES FOR USER: ${userId}`);
    
    // List of all memory-related tables with user_id columns
    const memoryTables = [
      { table: 'user_memories', column: 'user_id' },
      { table: 'hnsw_vector_metadata', column: 'user_id' },
      { table: 'cross_chat_knowledge', column: 'user_id' },
      { table: 'episodic_memories', column: 'user_id' },
      { table: 'semantic_memories', column: 'user_id' },
      { table: 'user_behavior_patterns', column: 'user_id' },
      { table: 'npu_analyses', column: 'user_id' }
    ];
    
    let totalDeleted = 0;
    
    for (const { table, column } of memoryTables) {
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
        
        // Count records for this user
        const countResult = await pool.query(
          `SELECT COUNT(*) as count FROM ${table} WHERE ${column} = $1`,
          [userId]
        );
        const count = parseInt(countResult.rows[0].count);
        
        if (count === 0) {
          console.log(`✅ No records for user in ${table}`);
          continue;
        }
        
        console.log(`🗑️ Deleting ${count} records from ${table}...`);
        
        // Delete user's records
        const deleteResult = await pool.query(
          `DELETE FROM ${table} WHERE ${column} = $1`,
          [userId]
        );
        totalDeleted += deleteResult.rowCount || 0;
        
        console.log(`✅ Deleted ${deleteResult.rowCount} records from ${table}`);
        
      } catch (tableError) {
        console.warn(`⚠️ Error with table ${table}:`, tableError.message);
      }
    }
    
    console.log(`\n🧹 CLEANUP COMPLETE: Deleted ${totalDeleted} total records for user ${userId}`);
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error deleting user memories:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  const userId = process.argv[2];
  deleteUserMemories(userId)
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { deleteUserMemories };

