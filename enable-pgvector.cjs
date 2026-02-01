// Direct pgvector enablement script
const fetch = globalThis.fetch;

(async () => {
  try {
    console.log('🔧 ENABLING PGVECTOR EXTENSION...');
    
    // Try to create the extension using the correct syntax from Render docs
    console.log('\n📝 Step 1: Creating pgvector extension...');
    const createResponse = await fetch('http://localhost:3001/api/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'custom',
        query: 'CREATE EXTENSION vector',  // Exact syntax from Render docs
        data: {}
      })
    });
    
    const createData = await createResponse.json();
    console.log('Extension creation result:', createData);
    
    if (createData.success) {
      console.log('✅ pgvector extension created!');
      
      // Verify the extension was created
      console.log('\n📊 Step 2: Verifying extension...');
      const verifyResponse = await fetch('http://localhost:3001/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'custom',
          query: "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'",
          data: {}
        })
      });
      
      const verifyData = await verifyResponse.json();
      console.log('Extension verification:', verifyData);
      
      if (verifyData.success && verifyData.data && verifyData.data.length > 0) {
        console.log(`✅ pgvector ${verifyData.data[0].extversion} confirmed installed!`);
        
        // Test vector operations
        console.log('\n📊 Step 3: Testing vector operations...');
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
          console.log('✅ Vector operations confirmed working! Distance:', testData.data[0].distance);
          
          // Create proper vector_embeddings table
          console.log('\n📊 Step 4: Creating vector_embeddings table...');
          const tableResponse = await fetch('http://localhost:3001/api/database', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'custom',
              query: `
                CREATE TABLE IF NOT EXISTS vector_embeddings (
                  id TEXT PRIMARY KEY,
                  user_id TEXT NOT NULL,
                  content TEXT NOT NULL,
                  embedding VECTOR(768) NOT NULL, -- Fireworks nomic-ai/nomic-embed-text-v1.5
                  metadata JSONB DEFAULT '{}',
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
              `,
              data: {}
            })
          });
          
          const tableData = await tableResponse.json();
          if (tableData.success) {
            console.log('✅ vector_embeddings table created!');
            
            // Create HNSW index
            console.log('\n📊 Step 5: Creating HNSW index...');
            const indexResponse = await fetch('http://localhost:3001/api/database', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'custom',
                query: `
                  CREATE INDEX IF NOT EXISTS vector_embeddings_hnsw_idx 
                  ON vector_embeddings 
                  USING hnsw (embedding vector_cosine_ops)
                `,
                data: {}
              })
            });
            
            const indexData = await indexResponse.json();
            if (indexData.success) {
              console.log('✅ HNSW index created!');
              console.log('\n🎉 PGVECTOR FULLY ENABLED AND CONFIGURED!');
            } else {
              console.log('❌ HNSW index creation failed:', indexData);
            }
          } else {
            console.log('❌ Vector table creation failed:', tableData);
          }
        } else {
          console.log('❌ Vector operations test failed:', testData);
        }
      } else {
        console.log('❌ Extension verification failed - not found');
      }
    } else if (createData.message && createData.message.includes('already exists')) {
      console.log('✅ pgvector extension already exists!');
    } else {
      console.log('❌ Extension creation failed:', createData);
    }
    
  } catch (error) {
    console.error('❌ pgvector enablement failed:', error.message);
  }
})();

