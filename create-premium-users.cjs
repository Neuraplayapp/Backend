/**
 * 🌟 CREATE PREMIUM USERS UTILITY
 * Creates premium users with full rights who can set their own password on first login
 * 
 * Users created:
 * 1. Nourah - nouthu@msn.com
 * 2. Mohammed - m_abulhassan@msn.com  
 * 3. Ahmed - Uncle_Ahmed
 */

const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Load environment variables from development.env if exists
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

// Initialize PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.RENDER_POSTGRES_URL || process.env.DATABASE_URL,
  ssl: (process.env.NODE_ENV === 'production' || process.env.POSTGRES_SSL === 'true') ? { rejectUnauthorized: false } : false,
});

const premiumUsers = [
  {
    username: 'Nourah',
    email: 'nouthu@msn.com',
    displayName: 'Nourah'
  },
  {
    username: 'Mohammed',
    email: 'm_abulhassan@msn.com',
    displayName: 'Mohammed'
  },
  {
    username: 'Uncle_Ahmed',
    email: 'uncle_ahmed@neuraplay.user',
    displayName: 'Ahmed'
  }
];

async function createPremiumUser(client, userData) {
  console.log(`🌟 Creating premium user: ${userData.displayName} (${userData.email || userData.username})`);
  
  const profile = JSON.stringify({
    role: 'admin',
    displayName: userData.displayName,
    avatar: '/assets/images/Mascot.png',
    rank: 'Premium Member',
    xp: 0,
    xpToNextLevel: 100,
    stars: 0,
    about: '',
    permissions: [
      'full_access',
      'user_management',
      'ai_administration',
      'analytics_access',
      'content_moderation'
    ],
    needsPasswordSetup: true
  });

  const subscription = JSON.stringify({
    tier: 'unlimited',
    status: 'active'
  });

  const usage = JSON.stringify({
    aiPrompts: { count: 0, lastReset: new Date().toISOString(), history: [] },
    imageGeneration: { count: 0, lastReset: new Date().toISOString(), history: [] }
  });

  try {
    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id, username, email FROM users WHERE email = $1 OR username = $2',
      [userData.email.toLowerCase(), userData.username]
    );

    if (existingUser.rows.length > 0) {
      // Update existing user
      const result = await client.query(`
        UPDATE users SET
          role = 'admin',
          profile = $1,
          subscription = $2,
          password = 'NEEDS_PASSWORD_SETUP',
          is_verified = true,
          updated_at = NOW()
        WHERE email = $3 OR username = $4
        RETURNING id, username, email
      `, [profile, subscription, userData.email.toLowerCase(), userData.username]);
      
      console.log(`✅ Updated existing user: ${result.rows[0].username} (${result.rows[0].email})`);
      return result.rows[0];
    } else {
      // Insert new user - let database generate UUID
      const result = await client.query(`
        INSERT INTO users (id, username, email, password, role, profile, subscription, usage, is_verified, created_at, updated_at)
        VALUES (uuid_generate_v4(), $1, $2, 'NEEDS_PASSWORD_SETUP', 'admin', $3, $4, $5, true, NOW(), NOW())
        RETURNING id, username, email
      `, [userData.username, userData.email.toLowerCase(), profile, subscription, usage]);
      
      console.log(`✅ Created new premium user: ${result.rows[0].username} (${result.rows[0].email})`);
      return result.rows[0];
    }
  } catch (error) {
    console.error(`❌ Failed to create/update user ${userData.username}:`, error.message);
    throw error;
  }
}

async function createAllPremiumUsers() {
  console.log('\n🌟 ═══════════════════════════════════════════════════');
  console.log('   CREATING PREMIUM USERS WITH FULL RIGHTS');
  console.log('   Users will set their own password on first login');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const client = await pool.connect();
  
  try {
    const createdUsers = [];
    
    for (const userData of premiumUsers) {
      try {
        const user = await createPremiumUser(client, userData);
        createdUsers.push(user);
      } catch (error) {
        console.error(`❌ Error with user ${userData.username}:`, error.message);
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📋 SUMMARY: Premium Users Created/Updated');
    console.log('═══════════════════════════════════════════════════════');
    
    createdUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username}`);
      console.log(`   📧 Login: ${user.email || user.username}`);
      console.log(`   🔐 Password: User sets on first login`);
      console.log(`   ⭐ Tier: Unlimited (Full Premium Rights)`);
      console.log('');
    });
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ All premium users are ready!');
    console.log('   They can log in with their email/username and');
    console.log('   whatever password they enter will become their password.');
    console.log('═══════════════════════════════════════════════════════\n');
    
    return createdUsers;
    
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  createAllPremiumUsers()
    .then(() => {
      console.log('✅ Premium user creation complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Premium user creation failed:', error);
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}

module.exports = { createPremiumUser, createAllPremiumUsers };

