require('dotenv').config();
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.POSTGRES_SSL === 'true'
    ? { rejectUnauthorized: false }
    : false
});

(async () => {
  try {
    console.log('Testing PostgreSQL connection...');
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Connected at:', res.rows[0].now);
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  } finally {
    await pool.end();
  }
})();