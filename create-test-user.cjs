/**
 * 🧑‍💻 CREATE TEST USER UTILITY
 * Creates proper UUID-based test users for memory system testing
 */

const { Pool } = require('pg');

// Initialize PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.RENDER_POSTGRES_URL || process.env.DATABASE_URL,
  ssl: (process.env.NODE_ENV === 'production' || process.env.POSTGRES_SSL === 'true') ? { rejectUnauthorized: false } : false,
});

async function createTestUser(username = 'testuser', email = 'test@example.com') {
  console.log(`🧑‍💻 Creating test user: ${username} (${email})`);
  
  try {
    const client = await pool.connect();
    
    try {
      // Create test user with proper UUID
      const result = await client.query(`
        INSERT INTO users (id, username, email, password, role, profile)
        VALUES (
          uuid_generate_v4(),
          $1,
          $2,
          'test_password_hash',
          'learner',
          '{"test_user": true, "created_for_testing": true}'
        )
        ON CONFLICT (username) DO UPDATE SET
          email = EXCLUDED.email,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, username, email
      `, [username, email]);
      
      const user = result.rows[0];
      console.log(`✅ Test user created:`, user);
      
      return user;
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Failed to create test user:', error);
    throw error;
  }
}

async function createMultipleTestUsers() {
  console.log('🧑‍💻 Creating multiple test users for comprehensive testing...');
  
  const testUsers = [
    { username: 'testuser', email: 'test@example.com' },
    { username: 'sammy_test', email: 'sammy@test.com' },
    { username: 'admin_test', email: 'admin@test.com' },
    { username: 'learner_test', email: 'learner@test.com' }
  ];
  
  const createdUsers = [];
  
  for (const userData of testUsers) {
    try {
      const user = await createTestUser(userData.username, userData.email);
      createdUsers.push(user);
    } catch (error) {
      console.warn(`⚠️ Could not create user ${userData.username}:`, error.message);
    }
  }
  
  console.log(`✅ Created ${createdUsers.length} test users`);
  return createdUsers;
}

async function getTestUserByName(username) {
  try {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        'SELECT id, username, email FROM users WHERE username = $1',
        [username]
      );
      
      if (result.rows.length === 0) {
        console.log(`❌ Test user ${username} not found`);
        return null;
      }
      
      const user = result.rows[0];
      console.log(`✅ Found test user:`, user);
      return user;
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error(`❌ Failed to get test user ${username}:`, error);
    return null;
  }
}

// Run if called directly
if (require.main === module) {
  (async () => {
    try {
      console.log('🧑‍💻 Creating test users for memory system testing...');
      
      const users = await createMultipleTestUsers();
      
      console.log('\n🎯 Test users ready for memory system tests:');
      users.forEach(user => {
        console.log(`  - ${user.username}: ${user.id}`);
      });
      
    } catch (error) {
      console.error('❌ Test user creation failed:', error);
      process.exit(1);
    } finally {
      await pool.end();
    }
  })();
}

module.exports = {
  createTestUser,
  createMultipleTestUsers,
  getTestUserByName
};
