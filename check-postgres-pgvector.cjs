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
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

(async () => {
  try {
    console.log('🔍 CHECKING POSTGRESQL AND PGVECTOR STATUS...');
    
    // 1. Check PostgreSQL version
    console.log('\n📊 Step 1: PostgreSQL Version Check');
    const versionResult = await pool.query('SELECT version()');
    console.log('PostgreSQL Version:', versionResult.rows[0].version);
    
    // 2. Check existing extensions
    console.log('\n📊 Step 2: Current Extensions');
    const extResult = await pool.query('SELECT extname, extversion FROM pg_extension ORDER BY extname');
    console.log('Installed Extensions:');
    extResult.rows.forEach(ext => {
      console.log(`  ✅ ${ext.extname} (${ext.extversion})`);
    });
    
    // 3. Check if pgvector is in the list
    const vectorExt = extResult.rows.find(ext => ext.extname === 'vector');
    if (vectorExt) {
      console.log(`\n✅ pgvector ALREADY INSTALLED: ${vectorExt.extversion}`);
    } else {
      console.log('\n❌ pgvector NOT FOUND - attempting to install...');
      
      // 4. Try to create the extension using correct syntax
      try {
        await pool.query('CREATE EXTENSION vector');
        console.log('✅ pgvector extension created successfully!');
        
        // Verify installation
        const recheck = await pool.query("SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'");
        if (recheck.rows.length > 0) {
          console.log(`✅ Verification: pgvector ${recheck.rows[0].extversion} is now installed`);
        }
      } catch (createError) {
        console.log('❌ Failed to create pgvector extension:', createError.message);
        console.log('Error Code:', createError.code);
        console.log('Error Detail:', createError.detail);
      }
    }
    
    // 5. Test vector operations if extension exists
    const finalCheck = await pool.query("SELECT extname FROM pg_extension WHERE extname = 'vector'");
    if (finalCheck.rows.length > 0) {
      console.log('\n📊 Step 3: Testing Vector Operations');
      try {
        const testResult = await pool.query("SELECT '[1,2,3]'::vector(3) <-> '[1,2,4]'::vector(3) as distance");
        console.log('✅ Vector operations test passed! Distance:', testResult.rows[0].distance);
        
        // Test creating a simple vector table
        await pool.query('DROP TABLE IF EXISTS test_vectors');
        await pool.query(`
          CREATE TABLE test_vectors (
            id SERIAL PRIMARY KEY,
            content TEXT,
            embedding VECTOR(3)
          )
        `);
        
        await pool.query(`
          INSERT INTO test_vectors (content, embedding) 
          VALUES ('test', '[1,2,3]')
        `);
        
        const vectorTest = await pool.query('SELECT * FROM test_vectors');
        console.log('✅ Vector table test passed:', vectorTest.rows[0]);
        
        await pool.query('DROP TABLE test_vectors');
        console.log('✅ All pgvector functionality confirmed working!');
        
      } catch (testError) {
        console.log('❌ Vector operations test failed:', testError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  } finally {
    await pool.end();
  }
})();

