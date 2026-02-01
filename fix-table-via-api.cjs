// Create user_memories table via the working /api/database endpoint
const fetch = globalThis.fetch;

(async () => {
  try {
    console.log('🔧 CREATING user_memories TABLE VIA API...');
    
    // Step 1: Check if table exists and get its schema
    console.log('\n📊 Step 1: Checking table existence...');
    const checkResponse = await fetch('http://localhost:3001/api/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'custom',
        query: `
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'user_memories' 
          ORDER BY ordinal_position
        `
      })
    });
    
    const checkData = await checkResponse.json();
    console.log('Table check result:', checkData);
    
    // Step 2: If table doesn't exist or has wrong schema, create it
    if (!checkData.success || checkData.message === 'Database temporarily unavailable - using in-memory storage') {
      console.log('❌ Cannot check schema - database not available via API');
      return;
    }
    
    const hasContentColumn = checkData.data && checkData.data.some(col => col.column_name === 'content');
    console.log(`Has content column: ${hasContentColumn}`);
    
    if (!hasContentColumn) {
      console.log('\n🔧 Step 2: Creating user_memories table...');
      
      // Drop table if it exists with wrong schema
      const dropResponse = await fetch('http://localhost:3001/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'custom',
          query: 'DROP TABLE IF EXISTS user_memories CASCADE'
        })
      });
      
      const dropData = await dropResponse.json();
      console.log('Drop result:', dropData);
      
      // Create table with correct schema
      const createResponse = await fetch('http://localhost:3001/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'custom',
          query: `
            CREATE TABLE user_memories (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              user_id UUID NOT NULL,
              memory_key VARCHAR(255) NOT NULL,
              content TEXT NOT NULL,
              context JSONB DEFAULT '{}',
              tags TEXT[] DEFAULT '{}',
              importance_score DECIMAL DEFAULT 0.5,
              access_count INTEGER DEFAULT 0,
              last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(user_id, memory_key)
            )
          `
        })
      });
      
      const createData = await createResponse.json();
      console.log('Create result:', createData);
      
      if (createData.success) {
        console.log('✅ user_memories table created successfully!');
        
        // Verify schema
        const verifyResponse = await fetch('http://localhost:3001/api/database', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'custom',
            query: `
              SELECT column_name, data_type 
              FROM information_schema.columns 
              WHERE table_name = 'user_memories' 
              ORDER BY ordinal_position
            `
          })
        });
        
        const verifyData = await verifyResponse.json();
        console.log('\n📊 VERIFIED SCHEMA:');
        if (verifyData.success && verifyData.data) {
          verifyData.data.forEach(col => {
            console.log(`  ✅ ${col.column_name} (${col.data_type})`);
          });
        }
      } else {
        console.log('❌ Table creation failed:', createData);
      }
    } else {
      console.log('✅ Table already has correct schema');
    }
    
  } catch (error) {
    console.error('❌ API table creation failed:', error.message);
  }
})();

