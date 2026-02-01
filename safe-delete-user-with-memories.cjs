/**
 * 🗑️ SAFE USER DELETION SCRIPT
 * 
 * Safely deletes a SINGLE user and ALL their associated data:
 * - User account
 * - All memories (via CASCADE)
 * - All conversations (via CASCADE)
 * - All messages (via CASCADE)
 * - All sessions (via CASCADE)
 * - All game progress (via CASCADE)
 * 
 * SAFETY FEATURES:
 * - Only accepts email as input (explicit targeting)
 * - Shows what will be deleted BEFORE deletion
 * - Requires manual confirmation
 * - Provides detailed deletion report
 */

const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Load environment variables
const envPath = path.join(__dirname, 'development.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
    }
  });
}

const pool = new Pool({
  connectionString: process.env.RENDER_POSTGRES_URL || process.env.DATABASE_URL,
  ssl: (process.env.NODE_ENV === 'production' || process.env.POSTGRES_SSL === 'true') 
    ? { rejectUnauthorized: false } 
    : false,
});

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, answer => {
    rl.close();
    resolve(answer);
  }));
}

async function safeDeleteUser(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    console.error('❌ Invalid email address provided');
    return;
  }

  const client = await pool.connect();
  
  try {
    console.log('\n🔍 ═══════════════════════════════════════════════════');
    console.log('   CHECKING USER AND ASSOCIATED DATA');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Find the user
    const userResult = await client.query(
      'SELECT id, username, email, role, created_at FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (userResult.rows.length === 0) {
      console.log(`❌ User not found: ${email}`);
      return;
    }
    
    const user = userResult.rows[0];
    console.log('📋 User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Created: ${user.created_at}`);
    
    // Count associated data
    const memoriesCount = await client.query(
      'SELECT COUNT(*) FROM user_memories WHERE user_id = $1',
      [user.id]
    );
    
    const conversationsCount = await client.query(
      'SELECT COUNT(*) FROM conversations WHERE user_id = $1',
      [user.id]
    );
    
    const messagesCount = await client.query(
      'SELECT COUNT(*) FROM messages WHERE user_id = $1',
      [user.id]
    );
    
    const sessionsCount = await client.query(
      'SELECT COUNT(*) FROM user_sessions WHERE user_id = $1',
      [user.id]
    );
    
    console.log('\n📊 Associated data that will be deleted:');
    console.log(`   Memories: ${memoriesCount.rows[0].count}`);
    console.log(`   Conversations: ${conversationsCount.rows[0].count}`);
    console.log(`   Messages: ${messagesCount.rows[0].count}`);
    console.log(`   Sessions: ${sessionsCount.rows[0].count}`);
    
    // Confirmation
    console.log('\n⚠️  WARNING: This action CANNOT be undone!');
    console.log(`⚠️  All data for ${user.email} will be permanently deleted.\n`);
    
    const confirmation = await askQuestion('Type the email address again to confirm deletion: ');
    
    if (confirmation.toLowerCase().trim() !== email.toLowerCase().trim()) {
      console.log('\n❌ Deletion cancelled - email did not match');
      return;
    }
    
    console.log('\n🗑️  Deleting user and all associated data...');
    
    // Start transaction
    await client.query('BEGIN');
    
    try {
      // Delete user (CASCADE will delete all associated data automatically)
      const deleteResult = await client.query(
        'DELETE FROM users WHERE id = $1 RETURNING email, username',
        [user.id]
      );
      
      await client.query('COMMIT');
      
      console.log('\n✅ ═══════════════════════════════════════════════════');
      console.log('   DELETION SUCCESSFUL');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`✅ Deleted user: ${deleteResult.rows[0].email}`);
      console.log(`✅ All memories, conversations, messages, and sessions deleted via CASCADE`);
      console.log('═══════════════════════════════════════════════════════\n');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Deletion failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Command line usage
if (require.main === module) {
  const email = process.argv[2];
  
  if (!email) {
    console.log('\n📖 Usage: node safe-delete-user-with-memories.cjs <email>');
    console.log('\nExample:');
    console.log('  node safe-delete-user-with-memories.cjs user@example.com\n');
    process.exit(1);
  }
  
  safeDeleteUser(email)
    .then(() => {
      console.log('✅ Operation complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Operation failed:', error);
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}

module.exports = { safeDeleteUser };

