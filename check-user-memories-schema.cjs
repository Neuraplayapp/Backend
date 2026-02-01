// Check actual user_memories table schema
const fetch = globalThis.fetch;

(async () => {
  try {
    console.log('🔍 CHECKING user_memories TABLE SCHEMA...');
    
    // Get table schema
    const schemaResponse = await fetch('http://localhost:3001/api/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'custom',
        query: `
          SELECT column_name, data_type, is_nullable, column_default 
          FROM information_schema.columns 
          WHERE table_name = 'user_memories' 
          ORDER BY ordinal_position
        `,
        data: {}
      })
    });
    
    const schemaData = await schemaResponse.json();
    if (schemaData.success && schemaData.data) {
      console.log('\n📊 ACTUAL user_memories TABLE SCHEMA:');
      schemaData.data.forEach(col => {
        console.log(`  ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}${col.column_default ? ` DEFAULT ${col.column_default}` : ''}`);
      });
    } else {
      console.log('❌ Schema check failed:', schemaData);
    }
    
    // Sample some data to see what's actually stored
    const sampleResponse = await fetch('http://localhost:3001/api/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'custom',
        query: 'SELECT * FROM user_memories LIMIT 3',
        data: {}
      })
    });
    
    const sampleData = await sampleResponse.json();
    if (sampleData.success && sampleData.data) {
      console.log('\n📊 SAMPLE DATA:');
      sampleData.data.forEach((row, i) => {
        console.log(`  Row ${i + 1}:`, Object.keys(row).map(key => `${key}=${row[key]}`).join(', '));
      });
    } else {
      console.log('❌ Sample data failed:', sampleData);
    }
    
  } catch (error) {
    console.error('❌ Schema check failed:', error.message);
  }
})();

