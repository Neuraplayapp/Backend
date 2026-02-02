// Use built-in fetch for Node 18+
const fetch = globalThis.fetch;

(async () => {
  try {
    console.log('🔍 Testing pgvector through server API...');
    
    // 1. Check PostgreSQL version
    console.log('\n📊 Step 1: PostgreSQL Version');
    const versionResponse = await fetch('http://localhost:3001/api/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'custom',
        query: 'SELECT version()',
        data: {}
      })
    });
    
    const versionData = await versionResponse.json();
    if (versionData.success && versionData.data) {
      console.log('PostgreSQL Version:', versionData.data[0].version);
    } else {
      console.log('❌ Version check failed:', versionData);
    }
    
    // 2. Check existing extensions
    console.log('\n📊 Step 2: Check Extensions');
    const extResponse = await fetch('http://localhost:3001/api/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'custom',
        query: 'SELECT extname, extversion FROM pg_extension ORDER BY extname',
        data: {}
      })
    });
    
    const extData = await extResponse.json();
    if (extData.success && extData.data) {
      console.log('Installed Extensions:');
      extData.data.forEach(ext => {
        console.log(`  ✅ ${ext.extname} (${ext.extversion})`);
      });
      
      // Check if pgvector is installed
      const vectorExt = extData.data.find(ext => ext.extname === 'vector');
      if (vectorExt) {
        console.log(`\n✅ pgvector FOUND: ${vectorExt.extversion}`);
        
        // Test vector operations
        console.log('\n📊 Step 3: Test Vector Operations');
        const testResponse = await fetch('http://localhost:3001/api/database', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'custom',
            query: "SELECT '[1,2,3]'::vector(3) <-> '[1,2,4]'::vector(3) as distance",
            data: {}
          })
        });
        
        const testData = await testResponse.json();
        if (testData.success) {
          console.log('✅ Vector operations working! Distance:', testData.data[0].distance);
        } else {
          console.log('❌ Vector test failed:', testData);
        }
        
      } else {
        console.log('\n❌ pgvector NOT FOUND - attempting to install...');
        
        // Try to create extension
        const createResponse = await fetch('http://localhost:3001/api/database', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'custom',
            query: 'CREATE EXTENSION vector',
            data: {}
          })
        });
        
        const createData = await createResponse.json();
        if (createData.success) {
          console.log('✅ pgvector extension created successfully!');
        } else {
          console.log('❌ Failed to create pgvector:', createData);
        }
      }
    } else {
      console.log('❌ Extension check failed:', extData);
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
})();
