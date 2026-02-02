/**
 * Test if we can find the user directly in the database
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
  ssl: false // Local dev doesn't use SSL
});

async function testDbQuery() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔍 Testing database query for user...\n');
    
    const email = 'smt@neuraplay.biz';
    console.log('Looking for email:', email);
    console.log('Lowercase:', email.toLowerCase());
    
    // Test the exact query from auth route
    const result = await client.query(
      `SELECT * FROM users WHERE email = $1 OR username = $2`,
      [email.toLowerCase(), email]
    );
    
    console.log('\nResults found:', result.rows.length);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('\n✅ User found!');
      console.log('ID:', user.id);
      console.log('Username:', user.username);
      console.log('Email:', user.email);
      console.log('Password:', user.password);
      console.log('Role:', user.role);
      console.log('Verified:', user.is_verified);
      
      const profile = typeof user.profile === 'string' ? JSON.parse(user.profile) : user.profile;
      console.log('needsPasswordSetup:', profile?.needsPasswordSetup);
    } else {
      console.log('\n❌ User NOT found in database!');
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testDbQuery();



