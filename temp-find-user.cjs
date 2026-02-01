const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neuraplay_database_user:QSCSrwhxH2rju0CxzZK9zLurnd1Pqlmr@dpg-d29kqv2li9vc73frta6g-a.oregon-postgres.render.com/neuraplay_database',
  ssl: { rejectUnauthorized: false }
});

async function findUser() {
  try {
    // Search for ANY user with sammy, smt, admin in email or username
    const result = await pool.query(`
      SELECT id, email, username, role, 
             LEFT(password, 25) as password_preview,
             profile->>'needsPasswordSetup' as needs_setup,
             is_verified,
             created_at
      FROM users 
      ORDER BY created_at DESC
      LIMIT 20
    `);
    
    console.log('=== ALL USERS IN DATABASE ===\n');
    result.rows.forEach((row, i) => {
      console.log(`${i+1}. ${row.email}`);
      console.log(`   Username: ${row.username}`);
      console.log(`   Role: ${row.role}`);
      console.log(`   Password: ${row.password_preview}...`);
      console.log(`   Needs Setup: ${row.needs_setup || 'no'}`);
      console.log(`   Verified: ${row.is_verified}`);
      console.log('');
    });
    
    console.log(`Total: ${result.rows.length} users found`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

findUser();

