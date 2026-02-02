/**
 * 🧠 MEMORY VECTOR SEARCH DIAGNOSTIC TEST
 * 
 * Tests ONLY memory retrieval without implanting any new memories
 * Checks if the vector search service is actually working
 */

const fetch = require('node-fetch');

const TEST_CONFIG = {
  baseUrl: 'https://neuraplayapp.onrender.com',
  // baseUrl: 'http://localhost:3001', // Uncomment for local testing
  testUserId: 'diagnostic_user_12345',
  timeout: 30000
};

console.log('🧠 MEMORY VECTOR SEARCH DIAGNOSTIC TEST');
console.log('=====================================');
console.log(`🔗 Testing against: ${TEST_CONFIG.baseUrl}`);
console.log(`👤 Test User ID: ${TEST_CONFIG.testUserId}`);
console.log('');

async function testMemoryRetrieval(query, description) {
  console.log(`\n🔍 TEST: ${description}`);
  console.log(`📝 Query: "${query}"`);
  console.log('─'.repeat(50));
  
  try {
    const startTime = Date.now();
    
    // Test the memory search endpoint
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'search',
        userId: TEST_CONFIG.testUserId,
        query: query,
        limit: 10
      }),
      timeout: TEST_CONFIG.timeout
    });
    
    const responseTime = Date.now() - startTime;
    const data = await response.json();
    
    console.log(`⏱️  Response Time: ${responseTime}ms`);
    console.log(`📊 HTTP Status: ${response.status}`);
    console.log(`✅ Success: ${data.success}`);
    
    if (data.success) {
      console.log(`🔢 Memories Found: ${data.count || data.memories?.length || 0}`);
      
      if (data.memories && data.memories.length > 0) {
        console.log('📋 Found Memories:');
        data.memories.forEach((memory, index) => {
          console.log(`   ${index + 1}. Key: ${memory.key || memory.memory_key || 'N/A'}`);
          console.log(`      Content: ${memory.content || memory.value || 'N/A'}`);
          console.log(`      Similarity: ${memory.similarity || 'N/A'}`);
          console.log('');
        });
      } else {
        console.log('❌ NO MEMORIES FOUND - This indicates the vector search is not finding existing memories');
      }
      
      // Check if this was a fallback response
      if (data.fallback) {
        console.log('⚠️  WARNING: Using fallback service (vector search may not be working)');
      }
      
      // Check the source of the response
      if (data.source) {
        console.log(`🔍 Search Source: ${data.source}`);
      }
      
    } else {
      console.log(`❌ Error: ${data.error}`);
      if (data.details) {
        console.log(`📝 Details: ${data.details}`);
      }
    }
    
    return data;
    
  } catch (error) {
    console.log(`❌ Request Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testVectorSearchSpecifically() {
  console.log(`\n🚀 TEST: Vector Search Endpoint Specifically`);
  console.log('─'.repeat(50));
  
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'vector_search',
        userId: TEST_CONFIG.testUserId,
        query: 'work job profession',
        limit: 10,
        similarityThreshold: 0.1
      }),
      timeout: TEST_CONFIG.timeout
    });
    
    const data = await response.json();
    
    console.log(`📊 HTTP Status: ${response.status}`);
    console.log(`✅ Success: ${data.success}`);
    console.log(`🔢 Results: ${data.count || data.memories?.length || 0}`);
    
    if (data.source) {
      console.log(`🔍 Source: ${data.source}`);
    }
    
    return data;
    
  } catch (error) {
    console.log(`❌ Vector Search Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testServerMemoryEndpoint() {
  console.log(`\n🔧 TEST: Server Memory Endpoint (Direct Vector Service)`);
  console.log('─'.repeat(50));
  
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/server-memory/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'search',
        userId: TEST_CONFIG.testUserId,
        query: 'remember me',
        limit: 10
      }),
      timeout: TEST_CONFIG.timeout
    });
    
    const data = await response.json();
    
    console.log(`📊 HTTP Status: ${response.status}`);
    console.log(`✅ Success: ${data.success}`);
    console.log(`🔢 Results: ${data.count || data.memories?.length || 0}`);
    
    if (data.memories && data.memories.length > 0) {
      console.log('📋 Direct Service Results:');
      data.memories.slice(0, 3).forEach((memory, index) => {
        console.log(`   ${index + 1}. ${memory.content || memory.value || 'N/A'}`);
      });
    }
    
    return data;
    
  } catch (error) {
    console.log(`❌ Direct Service Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runDiagnosticTests() {
  console.log('🚀 Starting Memory Vector Search Diagnostic...\n');
  
  // Test 1: "Hello do you remember me" - Basic memory recall
  const test1 = await testMemoryRetrieval(
    'hello do you remember me',
    'Basic Memory Recall - "Hello do you remember me"'
  );
  
  // Test 2: "What do I work with" - Specific information recall
  const test2 = await testMemoryRetrieval(
    'what do i work with',
    'Specific Information Recall - "What do I work with"'
  );
  
  // Test 3: Vector search endpoint specifically
  const test3 = await testVectorSearchSpecifically();
  
  // Test 4: Direct server memory endpoint
  const test4 = await testServerMemoryEndpoint();
  
  // Summary
  console.log('\n📊 DIAGNOSTIC SUMMARY');
  console.log('====================');
  
  const tests = [
    { name: 'Basic Memory Recall', result: test1 },
    { name: 'Specific Information Recall', result: test2 },
    { name: 'Vector Search Endpoint', result: test3 },
    { name: 'Direct Server Memory', result: test4 }
  ];
  
  tests.forEach((test, index) => {
    const status = test.result.success ? '✅ PASS' : '❌ FAIL';
    const memoryCount = test.result.count || test.result.memories?.length || 0;
    const fallback = test.result.fallback ? ' (FALLBACK)' : '';
    
    console.log(`${index + 1}. ${test.name}: ${status} - ${memoryCount} memories${fallback}`);
  });
  
  // Diagnosis
  console.log('\n🔍 DIAGNOSIS:');
  const allFailed = tests.every(test => !test.result.success || (test.result.memories?.length || 0) === 0);
  const usingFallback = tests.some(test => test.result.fallback);
  
  if (allFailed) {
    console.log('❌ CRITICAL: No memories found in any test - Vector search system not working');
    console.log('   Possible causes:');
    console.log('   - Database has no memories for this user');
    console.log('   - Vector search service not properly connected');
    console.log('   - Memory storage never worked');
  } else if (usingFallback) {
    console.log('⚠️  WARNING: System using fallback - Vector search may be degraded');
  } else {
    console.log('✅ SUCCESS: Vector search system appears to be working');
  }
  
  console.log('\n🏁 Diagnostic Complete');
}

// Run the diagnostic
runDiagnosticTests().catch(error => {
  console.error('❌ Diagnostic failed:', error);
  process.exit(1);
});
