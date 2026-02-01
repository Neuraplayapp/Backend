const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || process.env.RENDER_POSTGRES_URL;

if (!DATABASE_URL) {
  console.error('❌ No database URL found');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function fixMemoryData() {
  try {
    console.log('🔍 Finding user admin_2025...');
    const userResult = await pool.query('SELECT id FROM users WHERE username = $1', ['admin_2025']);
    
    if (userResult.rows.length === 0) {
      console.error('❌ User admin_2025 not found');
      return;
    }
    
    const userId = userResult.rows[0].id;
    console.log(`✅ Found user: ${userId}`);
    
    // Delete incorrect memories
    console.log('🗑️ Removing incorrect memories...');
    const deleteResult = await pool.query(`
      DELETE FROM user_memories 
      WHERE user_id = $1 AND (
        value ILIKE '%alex%' OR 
        value ILIKE '%fluffy%' OR
        memory_key ILIKE '%test%' OR
        memory_key ILIKE '%concurrent%' OR
        memory_key ILIKE '%assistant_%'
      )
    `, [userId]);
    console.log(`🗑️ Deleted ${deleteResult.rowCount} incorrect memories`);
    
    // Update existing correct memories
    console.log('✅ Updating correct memories...');
    
    // Update pet name from Fluffy to Hirra
    await pool.query(`
      UPDATE user_memories 
      SET memory_value = 'Hirra the cat', updated_at = NOW()
      WHERE user_id = $1 AND memory_key = 'pet_name'
    `, [userId]);
    
    // Insert/Update correct family information
    const correctMemories = [
      ['user_name', 'Sammy'],
      ['wife_name', 'Alfiya'],
      ['mother_name', 'Nourah'],
      ['pet_cat', 'Hirra'],
      ['pet_parrots', 'Rujal and Rijal'],
      ['family_info', 'Married to Alfiya, mother is Nourah, has a cat named Hirra and parrots named Rujal and Rijal']
    ];
    
    for (const [key, value] of correctMemories) {
      await pool.query(`
        INSERT INTO user_memories (user_id, memory_key, memory_value, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (user_id, memory_key) 
        DO UPDATE SET memory_value = $3, updated_at = NOW()
      `, [userId, key, value]);
      console.log(`✅ Set ${key}: ${value}`);
    }
    
    // Verify final state
    console.log('🔍 Verifying updated memories...');
    const finalCheck = await pool.query(
      'SELECT memory_key, memory_value FROM user_memories WHERE user_id = $1 ORDER BY memory_key',
      [userId]
    );
    
    console.log('📊 Final memory state:');
    finalCheck.rows.forEach(row => {
      console.log(`  ${row.memory_key}: ${row.memory_value}`);
    });
    
    console.log('✅ Memory data correction completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixMemoryData();