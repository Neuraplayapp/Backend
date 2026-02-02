const fetch = require('node-fetch');

async function testMemoryStore() {
  console.log('🧪 Testing Memory Storage...\n');
  
  try {
    // Test storing a memory directly
    console.log('📝 Testing direct memory storage...');
    
    const storeResponse = await fetch('http://localhost:3001/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'store',
        userId: 'admin_2025',
        key: 'education_test',
        value: 'Has two masters degrees: one in project management and one in electronic health (system informatics)',
        metadata: {
          category: 'profession',
          confidence: 0.9,
          source: 'manual_test'
        }
      })
    });

    if (storeResponse.ok) {
      const storeData = await storeResponse.json();
      console.log('✅ Store Response:', JSON.stringify(storeData, null, 2));
    } else {
      console.log('❌ Store failed:', storeResponse.status, storeResponse.statusText);
      const errorText = await storeResponse.text();
      console.log('Error details:', errorText);
    }

    // Wait a moment then test retrieval
    console.log('\n🔍 Testing memory retrieval...');
    
    const searchResponse = await fetch('http://localhost:3001/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'search',
        userId: 'admin_2025',
        query: 'education masters degree work profession'
      })
    });

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      console.log('✅ Search Response:', JSON.stringify(searchData, null, 2));
      
      if (searchData.success && searchData.memories && searchData.memories.length > 0) {
        console.log('\n🎯 Found memories:');
        searchData.memories.forEach((memory, index) => {
          console.log(`${index + 1}. ${memory.memory_key || memory.key}: "${memory.content || memory.memory_value || memory.value}"`);
        });
      } else {
        console.log('❌ No memories found');
      }
    } else {
      console.log('❌ Search failed:', searchResponse.status, searchResponse.statusText);
      const errorText = await searchResponse.text();
      console.log('Error details:', errorText);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testMemoryStore().catch(console.error);
