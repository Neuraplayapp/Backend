// Test HNSW Vector Storage
const fetch = require('node-fetch');

async function testHNSWStorage() {
  console.log('🧪 Testing HNSW Vector Storage...');
  
  try {
    // Test storing a memory via unified_memory_search (should trigger HNSW)
    const storeResponse = await fetch('http://localhost:3001/api/server-memory/memory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'store',
        userId: 'test_hnsw_user',
        key: 'test_hnsw_memory',
        value: 'This is a test memory to check HNSW vector storage',
        context: {
          category: 'test',
          timestamp: new Date().toISOString()
        },
        metadata: {
          sessionId: 'test_session',
          componentType: 'chat_knowledge'
        }
      })
    });
    
    const storeResult = await storeResponse.json();
    console.log('📥 Store Result:', storeResult);
    
    // Wait a moment for HNSW processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test vector search to see if HNSW has vectors
    const searchResponse = await fetch('http://localhost:3001/api/server-memory/memory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'vector_search',
        userId: 'test_hnsw_user',
        query: 'test memory',
        limit: 5,
        similarityThreshold: 0.1,
        componentTypes: ['chat_knowledge', 'general', 'memory']
      })
    });
    
    const searchResult = await searchResponse.json();
    console.log('🔍 Vector Search Result:', searchResult);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testHNSWStorage();







