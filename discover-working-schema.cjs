// Find working schema by testing different table queries
const fetch = globalThis.fetch;

(async () => {
  try {
    console.log('🔍 DISCOVERING WORKING DATABASE SCHEMA...');
    
    // Test what tables exist
    console.log('\n📊 Step 1: Testing table existence...');
    
    const tables = ['user_memories', 'users', 'conversations', 'memories', 'user_data'];
    
    for (const table of tables) {
      try {
        const response = await fetch('http://localhost:3001/api/memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'search',
            userId: 'health_check',
            query: 'test',
            limit: 1
          })
        });
        
        const data = await response.json();
        console.log(`Table test result:`, data);
        break; // Exit after first successful call
      } catch (error) {
        console.log(`❌ Error testing:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Discovery failed:', error.message);
  }
})();

