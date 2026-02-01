/**
 * 🔐 RESET ADMIN PASSWORD
 * Resets the admin password to NEEDS_PASSWORD_SETUP mode
 * WITHOUT touching any memories or user data
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

async function resetAdminPassword() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔐 ═══════════════════════════════════════════════════');
    console.log('   RESETTING ADMIN PASSWORD');
    console.log('   Email: smt@neuraplay.biz');
    console.log('   All memories and data will be preserved');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Get current user state
    const currentUser = await client.query(
      'SELECT id, username, email, profile FROM users WHERE email = $1',
      ['smt@neuraplay.biz']
    );
    
    if (currentUser.rows.length === 0) {
      console.log('❌ Admin user not found!');
      return;
    }
    
    const user = currentUser.rows[0];
    console.log('📝 Found user:', user.username);
    console.log('   ID:', user.id);
    
    // Update ONLY the password field and add needsPasswordSetup to profile
    const profile = typeof user.profile === 'string' ? JSON.parse(user.profile) : user.profile;
    profile.needsPasswordSetup = true;
    
    await client.query(
      `UPDATE users 
       SET password = 'NEEDS_PASSWORD_SETUP',
           profile = $1,
           updated_at = NOW()
       WHERE email = $2`,
      [JSON.stringify(profile), 'smt@neuraplay.biz']
    );
    
    console.log('\n✅ Password reset complete!');
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📧 Login Email: smt@neuraplay.biz');
    console.log('🔐 Password: Enter ANY password (6+ characters)');
    console.log('   Whatever you enter will become your new password');
    console.log('💾 All your memories and data are preserved');
    console.log('═══════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

resetAdminPassword().catch(console.error);



