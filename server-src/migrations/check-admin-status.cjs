/**
 * 🔍 DIAGNOSTIC: Check status of admin users
 */

const { Pool } = require('pg');

async function checkAdminStatus() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    console.log('\n🔍 ADMIN USER STATUS CHECK:\n');
    
    // 1. Check all users
    const allUsers = await pool.query(`
      SELECT id, username, email, role, created_at 
      FROM users 
      ORDER BY created_at DESC
    `);
    
    console.log('📊 ALL USERS IN DATABASE:');
    allUsers.rows.forEach(user => {
      console.log(`   ${user.username} (${user.email}) - Role: ${user.role} - ID: ${user.id}`);
    });
    
    // 2. Check for m_abulhassan specifically
    const mAbulhassan = await pool.query(`
      SELECT id, username, email, role 
      FROM users 
      WHERE username = 'm_abulhassan' OR email = 'm_abulhassan@msn.com'
    `);
    
    console.log('\n🔍 m_abulhassan STATUS:');
    if (mAbulhassan.rows.length > 0) {
      const user = mAbulhassan.rows[0];
      console.log(`   ✅ EXISTS: ${user.username} (${user.email})`);
      console.log(`   📝 Role: ${user.role}`);
      console.log(`   🆔 UUID: ${user.id}`);
      
      // Check memories
      const memories = await pool.query(`
        SELECT COUNT(*) as count 
        FROM user_memories 
        WHERE user_id = $1
      `, [user.id]);
      
      console.log(`   💾 Memories: ${memories.rows[0].count}`);
    } else {
      console.log('   ❌ DOES NOT EXIST');
    }
    
    // 3. Check for duplicates
    const duplicates = await pool.query(`
      SELECT username, COUNT(*) as count 
      FROM users 
      GROUP BY username 
      HAVING COUNT(*) > 1
    `);
    
    console.log('\n⚠️  DUPLICATE USERNAMES:');
    if (duplicates.rows.length > 0) {
      duplicates.rows.forEach(dup => {
        console.log(`   ${dup.username}: ${dup.count} copies`);
      });
    } else {
      console.log('   ✅ No duplicates found');
    }
    
    // 4. Check admin_2025
    const admin2025 = await pool.query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE username = 'admin_2025'
    `);
    
    console.log('\n🔍 admin_2025 COUNT:', admin2025.rows[0].count);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  checkAdminStatus()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}

module.exports = { checkAdminStatus };



