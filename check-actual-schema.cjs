// Check actual production database schema
const { Pool } = require('pg');
require('dotenv').config();

// Load development.env
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, 'development.env');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...values] = trimmed.split('=');
      if (key && values.length > 0) {
        const value = values.join('=').replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
}

const pool = new Pool({
  connectionString: process.env.RENDER_POSTGRES_URL || process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' || process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false
});

(async () => {
  try {
    console.log('🔍 CHECKING ACTUAL PRODUCTION DATABASE SCHEMA...');
    
    // Check user_memories table schema
    const schemaResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'user_memories' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 ACTUAL user_memories TABLE COLUMNS:');
    if (schemaResult.rows.length === 0) {
      console.log('❌ user_memories table does not exist!');
    } else {
      schemaResult.rows.forEach(col => {
        console.log(`  ✅ ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}${col.column_default ? ` DEFAULT ${col.column_default}` : ''}`);
      });
    }
    
    // Check sample data structure
    try {
      const sampleResult = await pool.query('SELECT * FROM user_memories LIMIT 3');
      console.log('\n📊 SAMPLE DATA STRUCTURE:');
      if (sampleResult.rows.length > 0) {
        console.log('Sample row keys:', Object.keys(sampleResult.rows[0]));
        sampleResult.rows.forEach((row, i) => {
          console.log(`Row ${i + 1}:`, Object.keys(row).map(key => `${key}=${typeof row[key]} (${String(row[key]).substring(0, 50)}...)`));
        });
      } else {
        console.log('No data in user_memories table');
      }
    } catch (sampleError) {
      console.log('❌ Could not sample data:', sampleError.message);
    }
    
  } catch (error) {
    console.error('❌ Schema check failed:', error.message);
  } finally {
    await pool.end();
  }
})();

