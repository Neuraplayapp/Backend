const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neuraplay_database_user:QSCSrwhxH2rju0CxzZK9zLurnd1Pqlmr@dpg-d29kqv2li9vc73frta6g-a.oregon-postgres.render.com/neuraplay_database',
  ssl: { rejectUnauthorized: false }
});

async function verify() {
  try {
    // Check for smt@neuraplay.biz specifically
    const result = await pool.query(`
      SELECT id, email, username, role, password, profile
      FROM users 
      WHERE email = 'smt@neuraplay.biz'
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ User smt@neuraplay.biz NOT found. Creating now...');
      
      // Insert with proper handling
      const insertResult = await pool.query(`
        INSERT INTO users (id, username, email, password, role, profile, is_verified, created_at, updated_at)
        VALUES (
          gen_random_uuid(),
          'Sammy',
          'smt@neuraplay.biz',
          'NEEDS_PASSWORD_SETUP',
          'admin',
          '{"role": "admin", "needsPasswordSetup": true, "permissions": ["full_access", "immutable_access", "database_admin", "user_management", "system_control", "ai_administration", "analytics_access", "content_moderation"], "level": 999, "xp": 999999, "stars": 999999}'::jsonb,
          true,
          NOW(),
          NOW()
        )
        RETURNING id, email, username, role
      `);
      console.log('✅ CREATED:', insertResult.rows[0]);
    } else {
      console.log('✅ User found:', result.rows[0].email);
      console.log('   Username:', result.rows[0].username);
      console.log('   Role:', result.rows[0].role);
      console.log('   Password:', result.rows[0].password);
    }
    
    console.log('\n🔑 Login with:');
    console.log('   Email: smt@neuraplay.biz');
    console.log('   Password: Enter any password (6+ chars) on first login!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

verify();

