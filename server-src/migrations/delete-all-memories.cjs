/**
 * 🗑️ DELETE ALL MEMORIES FOR ALL USERS
 * 
 * WARNING: This will permanently delete ALL user memories from the database
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

async function deleteAllMemories() {
  const isLocal = !process.env.DATABASE_URL?.includes('amazonaws.com') && 
                  !process.env.DATABASE_URL?.includes('render.com');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocal ? false : { rejectUnauthorized: false }
  });

  try {
    console.log('🗑️ COMPREHENSIVE MEMORY DELETION FOR ALL USERS...');
    
    // List of all memory-related tables
    const memoryTables = [
      'user_memories',
      'hnsw_vector_metadata',
      'cross_chat_knowledge',
      'episodic_memories',
      'semantic_memories',
      'user_behavior_patterns',
      'npu_analyses'
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

