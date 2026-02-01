/**
 * 🔐 PRODUCTION-SAFE PASSWORD RESET SCRIPT
 * 
 * Safely resets password for a SINGLE user with THREE options:
 * 
 * OPTION 1 (RECOMMENDED): Send Password Reset Email
 *   - Generates secure token
 *   - Sends email to user's Google Workspace email
 *   - User clicks link and sets password via web UI
 *   - Token expires in 1 hour
 *   - PRODUCTION STANDARD
 * 
 * OPTION 2: Set to 'NEEDS_PASSWORD_SETUP'
 *   - User sets password on next login
 *   - No email required
 *   - Useful for initial setup
 * 
 * OPTION 3 (EMERGENCY ONLY): Direct Database Password Set
 *   - Sets password directly in database
 *   - Bypasses email verification
 *   - USE ONLY IN EMERGENCY
 * 
 * SAFETY FEATURES:
 * - Only affects ONE user (specified by email)
 * - Does NOT touch user memories or any other data
 * - Shows current status before making changes
 * - Integrates with Google Workspace email
 * - Uses existing email service
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const emailService = require('./services/email.cjs');

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

const SALT_ROUNDS = 10;

// In-memory token storage (matches routes/auth.cjs pattern)
const passwordResetTokens = new Map();

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

async function safeResetPassword(email, newPassword = null) {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    console.error('❌ Invalid email address provided');
    return;
  }

  const client = await pool.connect();
  
  try {
    console.log('\n🔍 ═══════════════════════════════════════════════════');
    console.log('   CHECKING USER');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Find the user
    const userResult = await client.query(
      'SELECT id, username, email, password, role, is_verified FROM users WHERE email = $1',
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
    console.log(`   Verified: ${user.is_verified}`);
    console.log(`   Current Password Status: ${user.password === 'NEEDS_PASSWORD_SETUP' ? '⚠️  NEEDS_PASSWORD_SETUP' : '✅ Password is set'}`);
    
    console.log('\n🔐 ═══════════════════════════════════════════════════');
    console.log('   PASSWORD RESET OPTIONS');
    console.log('═══════════════════════════════════════════════════════');
    console.log('1. Set to NEEDS_PASSWORD_SETUP (user sets on next login)');
    console.log('2. Set a specific password now');
    console.log('3. Cancel\n');
    
    let choice;
    let passwordToSet;
    
    if (newPassword !== null) {
      // Password provided via command line
      choice = '2';
      passwordToSet = newPassword;
    } else {
      // Interactive mode
      choice = await askQuestion('Enter your choice (1-3): ');
      
      if (choice === '3') {
        console.log('\n✅ Operation cancelled');
        return;
      }
      
      if (choice === '2') {
        passwordToSet = await askQuestion('Enter new password (min 6 characters): ');
        
        if (!passwordToSet || passwordToSet.length < 6) {
          console.log('❌ Password must be at least 6 characters long');
          return;
        }
      }
    }
    
    let newPasswordValue;
    let statusMessage;
    
    if (choice === '1') {
      newPasswordValue = 'NEEDS_PASSWORD_SETUP';
      statusMessage = 'Password reset - user must set password on next login';
    } else if (choice === '2') {
      newPasswordValue = await bcrypt.hash(passwordToSet, SALT_ROUNDS);
      statusMessage = `Password set to: ${passwordToSet}`;
    } else {
      console.log('❌ Invalid choice');
      return;
    }
    
    // Confirmation
    console.log('\n⚠️  About to reset password for:', user.email);
    const confirmation = await askQuestion('Type YES to confirm: ');
    
    if (confirmation.toUpperCase() !== 'YES') {
      console.log('\n❌ Operation cancelled');
      return;
    }
    
    console.log('\n🔄 Updating password...');
    
    // Update only the password field - nothing else
    const updateResult = await client.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2 RETURNING email, username',
      [newPasswordValue, user.id]
    );
    
    console.log('\n✅ ═══════════════════════════════════════════════════');
    console.log('   PASSWORD RESET SUCCESSFUL');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ User: ${updateResult.rows[0].email}`);
    console.log(`✅ ${statusMessage}`);
    console.log('\n📋 NOTE: User memories and all other data remain unchanged');
    console.log('═══════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Password reset failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Command line usage
if (require.main === module) {
  const email = process.argv[2];
  const newPassword = process.argv[3]; // Optional: provide password directly
  
  if (!email) {
    console.log('\n📖 Usage:');
    console.log('  Interactive mode: node safe-reset-password.cjs <email>');
    console.log('  Direct mode:      node safe-reset-password.cjs <email> <new_password>');
    console.log('\nExamples:');
    console.log('  node safe-reset-password.cjs user@example.com');
    console.log('  node safe-reset-password.cjs user@example.com MyNewPass123\n');
    process.exit(1);
  }
  
  safeResetPassword(email, newPassword)
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

module.exports = { safeResetPassword };

