/**
 * 🔐 CREATE ADMIN USER - smt@neuraplay.biz
 * Creates/updates the permanent admin account with password setup on first login
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
const dbUrl = process.env.RENDER_POSTGRES_URL || process.env.DATABASE_URL;
const needsSSL = dbUrl && (
  dbUrl.includes('render.com') ||
  dbUrl.includes('heroku') ||
  process.env.NODE_ENV === 'production' ||
  process.env.POSTGRES_SSL === 'true'
);
const pool = new Pool({
  connectionString: dbUrl,
  ssl: needsSSL ? { rejectUnauthorized: false } : false,
});

async function createAdminUser() {
  console.log('\n🔐 ═══════════════════════════════════════════════════');
  console.log('   CREATING NEURAPLAY ADMIN USER');
  console.log('   Email: smt@neuraplay.biz');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const client = await pool.connect();
  
  try {
    const email = 'smt@neuraplay.biz';
    const username = 'NeuraPlay Admin';
    
    const profile = JSON.stringify({
      role: 'admin',
      displayName: 'NeuraPlay Admin',
      avatar: '/assets/images/Mascot.png',
      rank: 'System Administrator',
      level: 999,
      xp: 999999,
      xpToNextLevel: 999999,
      stars: 999999,
      about: 'NeuraPlay System Administrator',
      permissions: [
        'full_access',
        'immutable_access',
        'database_admin',
        'user_management',
        'system_control',
        'ai_administration',
        'analytics_access',
        'content_moderation'
      ],
      needsPasswordSetup: true,
      adminSettings: {
        canDeleteUsers: true,
        canModifyDatabase: true,
        canAccessLogs: true,
        canControlSystem: true,
        immutableAccess: true
      },
      preferences: {
        theme: 'admin',
        notifications: true,
        beta_features: true,
        admin_panel: true,
        debug_mode: true
      }
    });

    const subscription = JSON.stringify({
      tier: 'unlimited',
      status: 'active'
    });

    const usage = JSON.stringify({
      aiPrompts: { count: 0, lastReset: new Date().toISOString(), history: [] },
      imageGeneration: { count: 0, lastReset: new Date().toISOString(), history: [] }
    });

    // Check if admin user exists
    const existingUser = await client.query(
      'SELECT id, username, email FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      console.log('📝 Admin user already exists. Updating...');
      
      // Update existing admin user
      const result = await client.query(`
        UPDATE users SET
          username = $1,
          role = 'admin',
          profile = $2,
          subscription = $3,
          password = 'NEEDS_PASSWORD_SETUP',
          is_verified = true,
          updated_at = NOW()
        WHERE email = $4
        RETURNING id, username, email
      `, [username, profile, subscription, email.toLowerCase()]);
      
      console.log(`✅ Updated admin user: ${result.rows[0].username}`);
      console.log(`   📧 Email: ${result.rows[0].email}`);
      console.log(`   🆔 ID: ${result.rows[0].id}`);
    } else {
      console.log('🆕 Creating new admin user...');
      
      // Insert new admin user
      const result = await client.query(`
        INSERT INTO users (id, username, email, password, role, profile, subscription, usage, is_verified, created_at, updated_at)
        VALUES ('admin-smt-001', $1, $2, 'NEEDS_PASSWORD_SETUP', 'admin', $3, $4, $5, true, NOW(), NOW())
        RETURNING id, username, email
      `, [username, email.toLowerCase(), profile, subscription, usage]);
      
      console.log(`✅ Created new admin user: ${result.rows[0].username}`);
      console.log(`   📧 Email: ${result.rows[0].email}`);
      console.log(`   🆔 ID: ${result.rows[0].id}`);
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ ADMIN USER READY');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📧 Login Email: smt@neuraplay.biz');
    console.log('🔐 Password: Enter ANY password - it will be set as your password');
    console.log('⭐ Tier: Unlimited (Full Admin Rights)');
    console.log('═══════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Failed to create admin user:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  createAdminUser()
    .then(() => {
      console.log('✅ Admin user creation complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Admin user creation failed:', error);
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}

module.exports = { createAdminUser };



