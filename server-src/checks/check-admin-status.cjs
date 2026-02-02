/**
 * Check admin user status in database
 */

const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

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
  ssl: (process.env.NODE_ENV === 'production' || process.env.POSTGRES_SSL === 'true') ? { rejectUnauthorized: false } : false,
});

async function checkAdmin() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔍 Checking admin user: smt@neuraplay.biz\n');
    
    const result = await client.query(
      `SELECT id, username, email, password, role, is_verified, profile 
       FROM users 
       WHERE email = $1`,
      ['smt@neuraplay.biz']
    );
    
    if (result.rows.length === 0) {
      console.log('❌ Admin user NOT FOUND in database!');
      console.log('   Email: smt@neuraplay.biz');
      return;
    }
    
    const user = result.rows[0];
    const profile = typeof user.profile === 'string' ? JSON.parse(user.profile) : user.profile;
    
    console.log('✅ Admin user found:');
    console.log('   ID:', user.id);
    console.log('   Username:', user.username);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Verified:', user.is_verified);
    console.log('   Password Status:', user.password === 'NEEDS_PASSWORD_SETUP' ? '⚠️  NEEDS_PASSWORD_SETUP' : '✅ Password is set');
    console.log('   Profile needsPasswordSetup:', profile?.needsPasswordSetup);
    console.log('\n📋 Full Profile:');
    console.log(JSON.stringify(profile, null, 2));
    
  } finally {
    client.release();
    await pool.end();
  }
}

checkAdmin().catch(console.error);



