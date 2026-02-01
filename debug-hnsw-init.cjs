// Debug HNSW Initialization
const path = require('path');

async function debugHNSWInit() {
  console.log('🔍 Debugging HNSW Initialization...');
  
  try {
    // Check HNSW Core Integration
    const hnswCoreIntegrationPath = path.join(__dirname, 'server-src', 'hnsw-services', 'HNSWCoreIntegration.cjs');
    console.log('📁 HNSW Core Integration Path:', hnswCoreIntegrationPath);
    
    const { hnswCoreIntegration } = require(hnswCoreIntegrationPath);
    console.log('✅ HNSW Core Integration loaded:', !!hnswCoreIntegration);
    
    if (hnswCoreIntegration) {
      console.log('🔧 HNSW initialized:', hnswCoreIntegration.initialized);
      console.log('🔧 HNSW available:', hnswCoreIntegration.isAvailable());
      
      // Try to initialize
      await hnswCoreIntegration.initialize();
      console.log('✅ HNSW initialization completed');
      
      // Check if we can store a test vector
      const testVector = {
        id: 'debug_test_vector',
        content: 'This is a debug test vector',
        componentType: 'chat_knowledge',
        userId: 'debug_user',
        sessionId: 'debug_session',
        metadata: {
          timestamp: new Date().toISOString()
        }
      };
      
      console.log('📥 Attempting to store test vector...');
      const storeResult = await hnswCoreIntegration.storeVector(testVector);
      console.log('📥 Store result:', storeResult);
      
      // Check index stats
      console.log('📊 Getting index stats...');
      const stats = await hnswCoreIntegration.getIndexStats();
      console.log('📊 Index stats:', stats);
      
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    console.error('Stack:', error.stack);
  }
}

debugHNSWInit();







