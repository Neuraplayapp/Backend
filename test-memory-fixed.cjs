// Test memory system after schema fix
const fetch = globalThis.fetch;

(async () => {
  try {
    console.log('🔧 TESTING MEMORY SYSTEM AFTER SCHEMA FIX...');
    
    // Test 1: Store a simple memory
    console.log('\n📝 Step 1: Testing memory storage...');
    const storeResponse = await fetch('http://localhost:3001/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'store',
        userId: 'test_user_schema_fix',
        key: 'test_memory',
        value: 'This is a test memory after schema fix',
        context: { category: 'test' }
      })
    });
    
    const storeData = await storeResponse.json();
    console.log('Store result:', storeData);
    
    if (storeData.success) {
      console.log('✅ Memory storage successful!');
      
      // Test 2: Search for the stored memory
      console.log('\n🔍 Step 2: Testing memory search...');
      const searchResponse = await fetch('http://localhost:3001/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search',
          userId: 'test_user_schema_fix',
          query: 'test memory',
          limit: 5
        })
      });
      
      const searchData = await searchResponse.json();
      console.log('Search result:', searchData);
      
      if (searchData.success) {
        console.log('✅ Memory search successful!');
        console.log(`Found ${searchData.memories?.length || 0} memories`);
        
        if (searchData.memories?.length > 0) {
          console.log('Sample memory:', searchData.memories[0]);
        }
      } else {
        console.log('❌ Memory search failed:', searchData);
      }
    } else {
      console.log('❌ Memory storage failed:', storeData);
    }
    
    // Test 3: Check database status
    console.log('\n📊 Step 3: Testing database status...');
    const statusResponse = await fetch('http://localhost:3001/api/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'custom',
        query: 'SELECT 1 as test',
        data: {}
      })
    });
    
    const statusData = await statusResponse.json();
    console.log('Database status:', statusData);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
})();

