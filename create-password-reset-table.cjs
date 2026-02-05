/**
 * Create password_reset_tokens table for production-safe token storage
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

async function createTable() {
  const client = await pool.connect();
  
  try {
    console.log('\n📋 Creating password_reset_tokens table...\n');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        token VARCHAR(255) UNIQUE NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes separately (PostgreSQL syntax)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_token ON password_reset_tokens(token)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_expires ON password_reset_tokens(expires_at)
    `);
    
    console.log('✅ Table created successfully!');
    
    // Clean up expired tokens
    const deleteResult = await client.query(`
      DELETE FROM password_reset_tokens 
      WHERE expires_at < NOW()
    `);
    
    console.log(`🧹 Cleaned up ${deleteResult.rowCount} expired tokens\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  createTable()
    .then(() => {
      console.log('✅ Done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Failed:', error);
      process.exit(1);
    })
    .finally(() => {
      pool.end();
    });
}

module.exports = { createTable };

