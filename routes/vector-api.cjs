// Vector API Routes - HNSW Semantic Search & Storage
// 🚀 PRIMARY: Uses HNSWCoreIntegration for 50-100x faster semantic search
const express = require('express');
const router = express.Router();
const path = require('path');

// Render backend URL for local dev proxying
const RENDER_BACKEND_URL = 'https://neuraplay.onrender.com';

// Environment detection
const isLocalDevelopment = () => {
  const hostname = require('os').hostname();
  return process.env.NODE_ENV === 'development' || 
         (!process.env.RENDER && !process.env.RAILWAY_ENVIRONMENT);
};

// 🚀 Load HNSW Core Integration - THE CENTRAL VECTOR SERVICE
let hnswCoreIntegration = null;
try {
  const hnswCorePath = path.join(__dirname, '..', 'server-src', 'hnsw-services', 'HNSWCoreIntegration.cjs');
  const hnswModule = require(hnswCorePath);
  hnswCoreIntegration = hnswModule.hnswCoreIntegration;
  console.log('✅ Vector API: HNSW Core Integration loaded');
} catch (loadError) {
  console.warn('⚠️ Vector API: HNSW Core Integration not available, will use fallback:', loadError.message);
}

// POST /api/vector/search - Semantic search with HNSW (PRIMARY)
router.post('/search', async (req, res) => {
  try {
    const { query, embedding, userId, limit = 10, similarityThreshold = 0.6, contextFilters } = req.body;
    
    console.log(`🔍 Vector search requested for user: ${userId || 'anonymous'}`);
    
    // 🚀 PRIMARY: Use vector search via pgvector backend
    if (hnswCoreIntegration) {
      try {
        console.log('🚀 Using pgvector for semantic search');
        
        // 🎯 ALL COMPONENT TYPES: Include personal types for comprehensive memory search
        const allComponentTypes = [
          'chat_knowledge', 'general', 'memory',              // Legacy
          'personal_identity', 'relationships', 'professional', // Personal
          'personal_context', 'emotional_state', 'preferences', // Context
          'interests', 'goals', 'learning',                     // Behavioral
          'canvas_document', 'document', 'code_canvas', 'chart_canvas' // Canvas
        ];
        
        const searchOptions = {
          userId: userId,
          // 🎯 Include ALL types including personal for comprehensive search
          componentTypes: contextFilters?.contentTypes || allComponentTypes,
          limit: limit,
          similarityThreshold: similarityThreshold
        };
        
        const hnswResults = await hnswCoreIntegration.searchVectors(query, searchOptions);
        
        console.log(`✅ HNSW search returned ${hnswResults.length} results`);
        
        return res.json({
          success: true,
          data: hnswResults.map(result => ({
            id: result.id,
            content: result.content,
            similarity: result.similarity,
            metadata: result.metadata || {},
            source: 'hnsw_accelerated'
          }))
        });
      } catch (hnswError) {
        console.warn('⚠️ HNSW search failed, falling back to database:', hnswError.message);
      }
    }
    
    // 🔀 LOCAL DEV: Forward to Render backend (has pgvector)
    if (isLocalDevelopment()) {
      console.log('🔀 LOCAL DEV: Forwarding vector search to Render backend (pgvector available there)');
      try {
        const response = await fetch(`${RENDER_BACKEND_URL}/api/vector/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            embedding,
            userId,
            limit,
            similarityThreshold,
            contextFilters
          })
        });
        
        if (response.ok) {
          const renderData = await response.json();
          console.log(`✅ Render backend vector search returned ${renderData.data?.length || 0} results`);
          return res.json(renderData);
        } else {
          console.warn('⚠️ Render vector search failed:', response.status);
        }
      } catch (proxyError) {
        console.warn('⚠️ Failed to proxy vector search to Render:', proxyError.message);
      }
    }
    
    // 🔄 FALLBACK: Use PostgreSQL with pgvector (only works on Render/production)
    const { pool } = require('../services/database.cjs');
    const dbPool = pool();
    
    if (!dbPool) {
      return res.status(500).json({ 
        success: false, 
        error: 'Database not available' 
      });
    }
    
    // Generate embedding if not provided
    let queryEmbedding = embedding;
    if (!queryEmbedding && hnswCoreIntegration) {
      queryEmbedding = await hnswCoreIntegration.generateEmbedding(query);
    }
    
    if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
      // Text-only fallback
      console.log('🔄 No embedding available, using text search');
      
      const textQuery = `
        SELECT id, content, metadata, user_id,
               ts_rank(to_tsvector('english', content), plainto_tsquery('english', $1)) as relevance
        FROM user_memories
        WHERE user_id = $2 AND content IS NOT NULL
        ORDER BY relevance DESC
        LIMIT $3
      `;
      
      const result = await dbPool.query(textQuery, [query, userId || 'anonymous', limit]);
      
      return res.json({
        success: true,
        data: result.rows.map(row => ({
          id: row.id,
          content: row.content,
          similarity: parseFloat(row.relevance) * 0.5,
          metadata: row.metadata || {},
          source: 'text_fallback'
        })),
        fallback: true
      });
    }

    // Build WHERE clause with filters
    let whereConditions = ['content IS NOT NULL', 'embedding IS NOT NULL'];
    const queryVector = `[${queryEmbedding.join(',')}]`;
    const params = [queryVector];
    let paramIndex = 2;

    if (userId && userId !== 'anonymous') {
      whereConditions.push(`user_id = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // pgvector similarity search
    const searchQuery = `
      SELECT 
        id,
        content,
        metadata,
        user_id,
        1 - (embedding <-> $1::vector) as similarity
      FROM user_memories
      WHERE ${whereClause}
        AND (embedding <-> $1::vector) < ${1 - similarityThreshold}
      ORDER BY embedding <-> $1::vector ASC
      LIMIT $${paramIndex}
    `;

    params.push(limit);

    console.log(`🔍 Executing pgvector search with ${whereConditions.length} filters`);
    
    const result = await dbPool.query(searchQuery, params);
    
    const searchResults = result.rows.map(row => ({
      id: row.id,
      content: row.content,
      similarity: parseFloat(row.similarity),
      metadata: row.metadata || {},
      source: 'pgvector'
    }));

    console.log(`✅ pgvector search returned ${searchResults.length} results`);
    
    res.json({
      success: true,
      data: searchResults
    });

  } catch (error) {
    console.error('❌ Vector search error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Vector search failed',
      details: error.message
    });
  }
});

// POST /api/vector/store - Store embedding with HNSW index (PRIMARY)
router.post('/store', async (req, res) => {
  try {
    const { id, userId, content, embedding, metadata } = req.body;
    
    if (!id || !content) {
      return res.status(400).json({ 
        success: false,
        error: 'id and content required' 
      });
    }

    console.log(`📝 Storing embedding for user: ${userId || 'system'}`);
    
    // 🚀 PRIMARY: Use pgvector for storage
    if (hnswCoreIntegration) {
      try {
        console.log('🚀 Using pgvector for vector storage');
        
        // Generate embedding if not provided
        let vectorEmbedding = embedding;
        if (!vectorEmbedding || !Array.isArray(vectorEmbedding) || vectorEmbedding.length === 0) {
          console.log('🧠 Generating embedding for content...');
          vectorEmbedding = await hnswCoreIntegration.generateEmbedding(content);
        }
        
        // Store in HNSW index
        const vectorData = {
          id: id,
          content: content,
          componentType: metadata?.contentType || 'chat_knowledge',
          userId: userId || 'system',
          sessionId: metadata?.sessionId || `session_${Date.now()}`,
          metadata: {
            ...metadata,
            memoryKey: metadata?.key || id,
            timestamp: new Date().toISOString()
          }
        };
        
        const result = await hnswCoreIntegration.storeVector(vectorData);
        
        if (result.success) {
          console.log(`✅ Vector stored with HNSW acceleration: ${id}`);
          return res.json({
            success: true,
            message: 'Embedding stored with HNSW acceleration',
            id: id,
            vectorId: result.vectorId,
            source: 'hnsw_accelerated'
          });
        }
      } catch (hnswError) {
        console.warn('⚠️ HNSW storage failed, falling back to database:', hnswError.message);
      }
    }
    
    // 🔀 LOCAL DEV: Forward to Render backend (has pgvector)
    if (isLocalDevelopment()) {
      console.log('🔀 LOCAL DEV: Forwarding vector store to Render backend (pgvector available there)');
      try {
        const response = await fetch(`${RENDER_BACKEND_URL}/api/vector/store`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, userId, content, embedding, metadata })
        });
        
        if (response.ok) {
          const renderData = await response.json();
          console.log(`✅ Render backend vector store succeeded: ${id}`);
          return res.json(renderData);
        } else {
          console.warn('⚠️ Render vector store failed:', response.status);
        }
      } catch (proxyError) {
        console.warn('⚠️ Failed to proxy vector store to Render:', proxyError.message);
      }
    }
    
    // 🔄 FALLBACK: Use PostgreSQL with pgvector (only works on Render/production)
    const db = require('../services/database.cjs');
    const dbPool = db.pool();
    
    if (!dbPool) {
      return res.status(500).json({ 
        success: false, 
        error: 'Database not available' 
      });
    }
    
    // Generate embedding if not provided
    let vectorEmbedding = embedding;
    if ((!vectorEmbedding || !Array.isArray(vectorEmbedding) || vectorEmbedding.length === 0) && hnswCoreIntegration) {
      vectorEmbedding = await hnswCoreIntegration.generateEmbedding(content);
    }
    
    if (vectorEmbedding && Array.isArray(vectorEmbedding) && vectorEmbedding.length > 0) {
      // Store with pgvector embedding
      const embeddingStr = `[${vectorEmbedding.join(',')}]`;
      
      const storeQuery = `
        INSERT INTO user_memories (id, user_id, memory_key, content, embedding, context, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5::vector, $6, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          content = $4,
          embedding = $5::vector,
          context = $6,
          updated_at = NOW()
      `;
      
      await dbPool.query(storeQuery, [
        id,
        userId || 'system',
        metadata?.key || id,
        content,
        embeddingStr,
        JSON.stringify(metadata || {})
      ]);
      
      console.log(`✅ Embedding stored with pgvector: ${id}`);
      
      return res.json({
        success: true,
        message: 'Embedding stored with pgvector',
        id: id,
        source: 'pgvector'
      });
    }
    
    // Text-only fallback
    const fallbackQuery = `
      INSERT INTO user_memories (id, user_id, memory_key, content, context, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        content = $4,
        context = $5,
        updated_at = NOW()
    `;
    
    await dbPool.query(fallbackQuery, [
      id,
      userId || 'system',
      metadata?.key || id,
      content,
      JSON.stringify(metadata || {})
    ]);
    
    console.log(`✅ Stored without embedding (text-only): ${id}`);
    
    res.json({
      success: true,
      message: 'Stored without embedding (text-only)',
      id: id,
      source: 'text_only',
      fallback: true
    });

  } catch (error) {
    console.error('❌ Vector storage error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Vector storage failed',
      details: error.message
    });
  }
});

module.exports = router;

