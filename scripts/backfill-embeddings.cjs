// Backfill embeddings for existing memories
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.RENDER_POSTGRES_URL,
  ssl: process.env.POSTGRES_SSL === 'true' || process.env.DATABASE_URL?.includes('render.com') || process.env.RENDER_POSTGRES_URL?.includes('render.com') ? {
    rejectUnauthorized: false,
    require: true,
    ca: false
  } : false,
  max: 5, // Reduce from 50 to 5 for local development
  idleTimeoutMillis: 60000, // Increase to 60 seconds
  connectionTimeoutMillis: 10000, // Increase to 10 seconds
  acquireTimeoutMillis: 60000, // Add acquire timeout
});

async function generateEmbedding(text) {
  try {
    const FIREWORKS_API_KEY = process.env.FIREWORKS_API_KEY || process.env.VITE_FIREWORKS_API_KEY;
    
    if (!FIREWORKS_API_KEY) {
      throw new Error('No Fireworks API key found');
    }

    const response = await fetch('https://api.fireworks.ai/inference/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIREWORKS_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: text,
        model: 'nomic-ai/nomic-embed-text-v1.5',
        dimensions: 768
      })
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error(`❌ Failed to generate embedding:`, error.message);
    return null;
  }
}

async function backfillEmbeddings() {
  try {
    console.log('🚀 Starting embeddings backfill...');
    
    // Get all memories without embeddings
    const result = await pool.query(`
      SELECT id, user_id, memory_key, content
      FROM user_memories
      WHERE embedding IS NULL
      ORDER BY created_at DESC
    `);
    
    console.log(`📊 Found ${result.rows.length} memories to process`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const memory of result.rows) {
      try {
        console.log(`🔄 Processing: ${memory.memory_key}...`);
        
        // Generate embedding
        const embedding = await generateEmbedding(`${memory.memory_key}: ${memory.content}`);
        
        if (!embedding) {
          console.log(`⚠️ Skipping ${memory.memory_key} - embedding generation failed`);
          failCount++;
          continue;
        }
        
        // Store in vector_embeddings table
        await pool.query(`
          INSERT INTO vector_embeddings (id, user_id, content, embedding, metadata, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET
            embedding = $4,
            updated_at = NOW()
        `, [
          `${memory.user_id}_${memory.memory_key}_${Date.now()}`,
          memory.user_id,
          `${memory.memory_key}: ${memory.content}`,
          JSON.stringify(embedding),
          JSON.stringify({
            memoryKey: memory.memory_key,
            timestamp: new Date().toISOString(),
            backfilled: true
          })
        ]);
        
        // Update user_memories table with embedding in pgvector format
        await pool.query(`
          UPDATE user_memories
          SET 
            embedding = $1::vector,
            updated_at = NOW()
          WHERE id = $2
        `, [
          `[${embedding.join(',')}]`,  // pgvector format, not JSONB
          memory.id
        ]);
        
        console.log(`✅ ${memory.memory_key} - embedding stored`);
        successCount++;
        
        // Rate limit: 1 request per second
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Failed to process ${memory.memory_key}:`, error.message);
        failCount++;
      }
    }
    
    console.log(`\n📊 Backfill complete:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📈 Total: ${result.rows.length}`);
    
  } catch (error) {
    console.error('❌ Backfill error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  backfillEmbeddings()
    .then(() => {
      console.log('✅ Backfill completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Backfill failed:', error);
      process.exit(1);
    });
}

module.exports = { backfillEmbeddings };

