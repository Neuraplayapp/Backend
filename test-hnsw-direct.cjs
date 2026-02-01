/**
 * 🔬 DIRECT HNSW TEST
 * 
 * Test HNSW storage and search directly without going through APIs
 * to isolate the exact issue
 */

async function testHNSWDirect() {
  try {
    console.log('🔬 DIRECT HNSW TEST - Loading modules...');
    
    // Import HNSW services directly
    const { hnswCoreIntegration } = require('./server-src/hnsw-services/HNSWCoreIntegration.cjs');
    
    console.log('✅ Modules loaded, initializing HNSW...');
    
    // Initialize HNSW
    await hnswCoreIntegration.initialize();
    
    console.log('✅ HNSW initialized, testing storage...');
    
    // Test 1: Store a simple vector
    const testData = {
      id: 'test_vector_001',
      content: 'This is a test document about machine learning and AI',
      componentType: 'test_component',
      userId: 'test_user_123',
      sessionId: 'test_session',
      metadata: {
        timestamp: new Date().toISOString(),
        tags: ['test', 'ai', 'ml']
      }
    };
    
    console.log('📥 Storing test vector...');
    const storeResult = await hnswCoreIntegration.storeVector(testData);
    console.log('📥 Store result:', storeResult);
    
    // Test 2: Search for the vector
    console.log('🔍 Searching for stored vector...');
    const searchOptions = {
      userId: 'test_user_123',
      componentTypes: ['test_component'],
      limit: 5,
      similarityThreshold: 0.1  // Very low threshold
    };
    
    const searchResults = await hnswCoreIntegration.searchVectors('machine learning AI test', searchOptions);
    console.log('🔍 Search results:', searchResults);
    
    // Test 3: Check HNSW stats
    console.log('📊 Getting HNSW performance stats...');
    const stats = hnswCoreIntegration.getPerformanceStats();
    console.log('📊 HNSW stats:', stats);
    
    // Summary
    console.log('\n🎯 TEST SUMMARY:');
    console.log(`  Storage: ${storeResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`  Search Results: ${searchResults.length} found`);
    console.log(`  HNSW Available: ${stats.hnswAvailable}`);
    
    if (searchResults.length > 0) {
      console.log('  First result similarity:', searchResults[0].similarity);
      console.log('  First result content:', searchResults[0].content.substring(0, 50) + '...');
    }
    
  } catch (error) {
    console.error('❌ Direct HNSW test failed:', error.message);
    console.error('❌ Stack:', error.stack);
  }
}

// Run the test
testHNSWDirect().then(() => {
  console.log('🔬 Direct HNSW test completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});
