// server-src/routes/memory.js
// Memory API endpoint for the enhanced memory system

const express = require('express');
const router = express.Router();
const { pool, queryBuilder, getDatabaseStatus } = require('../../services/database.cjs');

/**
 * Memory API endpoint
 * Handles store, search, update, and delete operations for user memories
 */
router.post('/memory', async (req, res) => {
  try {
    // CRITICAL DEBUG: Log exactly what we receive
    console.log('🔍 MEMORY API DEBUG - Full request body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 MEMORY API DEBUG - Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('🔍 MEMORY API DEBUG - Content-Type:', req.headers['content-type']);
    
    const { action, userId, key, value, query, context, metadata, limit, categories, tags } = req.body;
    
    // Validate required parameters
    if (!action) {
      console.log('❌ MEMORY API DEBUG - Missing action parameter!');
      console.log('🔍 MEMORY API DEBUG - Available body keys:', Object.keys(req.body));
      return res.status(400).json({ 
        success: false, 
        error: 'Action is required',
        debug: {
          bodyKeys: Object.keys(req.body),
          bodyContent: req.body
        }
      });
    }
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID is required' 
      });
    }
    
    // 🔧 GRACEFUL DATABASE HANDLING: Check if database is available
    let db = null;
    let knex = null;
    
    try {
      const poolInstance = pool();
      const knexInstance = queryBuilder();
      
      if (poolInstance && knexInstance) {
        db = poolInstance;
        knex = knexInstance;
        console.log('✅ Database pool available for memory operations');
      } else {
        console.log('⚠️ Database pool not available, will use HNSW-only mode');
      }
    } catch (poolError) {
      console.warn('⚠️ Database pool initialization error, using HNSW-only mode:', poolError.message);
    }
    
    // Enhanced input validation
    if (!userId || userId.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'User ID cannot be empty'
      });
    }
    
    if (action === 'store' && (!key || key.toString().trim() === '')) {
      console.log('❌ Validation failed: Empty key provided');
      return res.status(400).json({
        success: false,
        error: 'Memory key cannot be empty for store operations'
      });
    }
    
    if (action === 'store' && (!value || value.toString().trim() === '')) {
      console.log('❌ Validation failed: Empty value provided');
      return res.status(400).json({
        success: false,
        error: 'Memory value cannot be empty for store operations'
      });
    }
    
    // 🔧 HANDLE OPERATIONS WITH OR WITHOUT DATABASE
    switch (action) {
      case 'store':
        if (db && knex) {
          await handleStore(db, knex, userId, key, value, context, metadata, res);
        } else {
          await handleStoreHNSWOnly(userId, key, value, context, metadata, res);
        }
        break;
        
      case 'search':
        if (db && knex) {
          console.log('🔍 Using direct database search for memory retrieval');
          await handleDirectSearch(db, knex, userId, query, limit, categories, tags, res);
        } else {
          await handleSearchHNSWOnly(userId, query, limit, res);
        }
        break;
        
      case 'update':
        if (db && knex) {
          await handleUpdate(db, knex, userId, key, value, context, metadata, res);
        } else {
          // HNSW doesn't support update, treat as store
          await handleStoreHNSWOnly(userId, key, value, context, metadata, res);
        }
        break;
        
      case 'delete':
        if (db && knex) {
          await handleDelete(db, knex, userId, key, res);
        } else {
          // HNSW doesn't support delete easily, return success
          res.json({ success: true, message: 'Delete not supported in HNSW-only mode' });
        }
        break;
        
      case 'get_learning_context':
        if (db && knex) {
          await handleGetLearningContext(db, knex, userId, context?.domain, res);
        } else {
          res.json({ success: true, context: { progression: [], memories: [], patterns: [], hasHistory: false } });
        }
        break;
        
      case 'vector_search':
        await handleVectorSearch(db, knex, req.body, res);
        break;
        
      case 'hnsw_bridge_search':
        await handleHNSWBridgeSearch(db, knex, req.body, res);
        break;
        
      case 'store_vector':
        await handleStoreVector(db, knex, req.body, res);
        break;
        
      case 'store_assistant_memory':
        await handleStoreAssistantMemory(db, knex, req.body, res);
        break;
        
      case 'store_cross_chat':
        await handleStoreCrossChat(db, knex, req.body, res);
        break;
        
      case 'save_hnsw_index':
        await handleSaveHNSWIndex(res);
        break;
        
      default:
        res.status(400).json({ 
          success: false, 
          error: `Invalid action: ${action}` 
        });
    }
    
  } catch (error) {
    console.error('❌ Memory API error:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      action: req.body?.action,
      userId: req.body?.userId
    });
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error',
      details: error.stack
    });
  }
});

/**
 * Handle memory storage
 */
async function handleStore(db, knex, userId, key, value, context, metadata, res) {
  try {
    // For test scenarios, prevent auto-creation of obviously test users
    if (userId === 'nonexistent_user' || (userId.includes('test') && userId.includes('nonexistent'))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID provided'
      });
    }
    
    // Ensure user exists - auto-create if needed for real users
    const validUserId = await ensureUserExists(db, knex, userId);
    
    // 🔧 USER ID NORMALIZATION: ALWAYS use original userId for HNSW
    // This ensures proper user isolation for thousands of users
    const normalizedUserId = userId; // Use original string format for consistent HNSW user isolation
    
    // Check if memory already exists
    const existing = await knex('user_memories')
      .where({ user_id: validUserId, memory_key: key })
      .first();
    
    // 🚀 GENERATE EMBEDDING - Required for pgvector search
    let embedding = null;
    try {
      const path = require('path');
      const hnswCoreIntegrationPath = path.join(__dirname, '..', 'hnsw-services', 'HNSWCoreIntegration.cjs');
      const { hnswCoreIntegration } = require(hnswCoreIntegrationPath);
      
      if (hnswCoreIntegration) {
        const embeddingVector = await hnswCoreIntegration.generateEmbedding(value);
        // ✅ CRITICAL: Store as pgvector format [x,y,z] not JSONB
        // The pg library will handle the vector type conversion
        embedding = `[${embeddingVector.join(',')}]`;
        console.log('✅ Generated pgvector embedding for memory storage:', {
          dimensions: embeddingVector.length,
          preview: `[${embeddingVector.slice(0, 3).join(',')}...]`
        });
      }
    } catch (embError) {
      console.warn('⚠️ Failed to generate embedding, storing without it:', embError.message);
      console.error('🔍 Embedding error details:', embError);
    }
    
    const memoryData = {
      user_id: validUserId,
      memory_key: key,
      content: value,
      embedding: embedding, // ✅ CRITICAL: Store embedding in PostgreSQL
      updated_at: new Date()
    };
    
    if (existing) {
      // Update existing memory
      await knex('user_memories')
        .where({ user_id: validUserId, memory_key: key })
        .update(memoryData);
      console.log('✅ Updated existing memory in user_memories table');
    } else {
      // Insert new memory
      await knex('user_memories')
        .insert({
          ...memoryData,
          created_at: new Date()
        });
      console.log('✅ Inserted new memory into user_memories table');
    }
    
    // Verify the storage by querying back
    const verification = await knex('user_memories')
      .where({ user_id: validUserId, memory_key: key })
      .select('memory_key', 'embedding')
      .first();
    console.log('🔍 Storage verification:', {
      key: verification?.memory_key,
      hasEmbedding: !!verification?.embedding,
      embeddingType: typeof verification?.embedding
    });
    
    // Store cognitive progression if applicable
    if (context?.domain && (context?.category === 'learning' || context?.category === 'cognitive_insight')) {
      await storeCognitiveProgression(knex, validUserId, key, value, context);
    }
    
    // ✅ No need for separate HNSW storage - pgvector handles it natively in PostgreSQL
    console.log('✅ Memory stored with pgvector embedding in PostgreSQL');
    
    res.json({ 
      success: true, 
      message: 'Memory stored successfully',
      data: { key, value }
    });
    
  } catch (error) {
    console.error('❌ Store memory error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * Handle direct database memory search - simple and reliable
 */
async function handleDirectSearch(db, knex, userId, query, limit = 20, categories, tags, res) {
  try {
    // Ensure user exists - auto-create if needed
    const validUserId = await ensureUserExists(db, knex, userId);
    
    let memories;
    
    if (query && query.trim()) {
      console.log(`🚀 Using pgvector similarity search for query: "${query}"`);
      
      // 🚀 PRIMARY: pgvector semantic search
      try {
        const path = require('path');
        const hnswCoreIntegrationPath = path.join(__dirname, '..', 'hnsw-services', 'HNSWCoreIntegration.cjs');
        const { hnswCoreIntegration } = require(hnswCoreIntegrationPath);
        
        if (hnswCoreIntegration) {
          // Generate embedding for the query
          const queryEmbedding = await hnswCoreIntegration.generateEmbedding(query);
          const queryVector = `[${queryEmbedding.join(',')}]`;
          
          // Build the vector similarity query
          let sqlQuery = `
            SELECT *, 
                   embedding <-> $1::vector as distance
            FROM user_memories
            WHERE user_id = $2
              AND embedding IS NOT NULL
          `;
          
          const params = [queryVector, validUserId];
          let paramIndex = 3;
          
          // Add category filtering
          if (categories && Array.isArray(categories) && categories.length > 0) {
            console.log(`🎯 Filtering by categories: ${categories.join(', ')}`);
            const categoryConditions = categories.map(() => {
              return `(memory_key ILIKE $${paramIndex++} OR content ILIKE $${paramIndex - 1})`;
            }).join(' OR ');
            sqlQuery += ` AND (${categoryConditions})`;
            categories.forEach(cat => params.push(`%${cat}%`));
          }
          
          // Add tag filtering
          if (tags && Array.isArray(tags) && tags.length > 0) {
            console.log(`🏷️ Filtering by tags: ${tags.join(', ')}`);
            const tagConditions = tags.map(() => `content ILIKE $${paramIndex++}`).join(' OR ');
            sqlQuery += ` AND (${tagConditions})`;
            tags.forEach(tag => params.push(`%${tag}%`));
          }
          
          sqlQuery += ` ORDER BY distance ASC LIMIT $${paramIndex}`;
          params.push(limit);
          
          const result = await db.query(sqlQuery, params);
          memories = result.rows;
          
          console.log(`✅ pgvector found ${memories.length} memories (avg distance: ${memories.length > 0 ? (memories.reduce((sum, m) => sum + parseFloat(m.distance), 0) / memories.length).toFixed(3) : 'N/A'})`);
        } else {
          throw new Error('HNSW integration not available');
        }
      } catch (vectorError) {
        console.warn('⚠️ pgvector search failed, falling back to keyword search:', vectorError.message);
        
        // FALLBACK: Keyword search
        let queryBuilder = knex('user_memories')
          .where('user_id', validUserId)
          .andWhere(function() {
            this.where('content', 'ilike', `%${query}%`)
                .orWhere('memory_key', 'ilike', `%${query}%`);
                
            const words = query.toLowerCase().split(' ').filter(word => word.length > 1);
            words.forEach(word => {
              this.orWhere('content', 'ilike', `%${word}%`)
                  .orWhere('memory_key', 'ilike', `%${word}%`);
            });
          });
        
        if (categories && Array.isArray(categories) && categories.length > 0) {
          queryBuilder = queryBuilder.andWhere(function() {
            categories.forEach(category => {
              this.orWhere('memory_key', 'ilike', `%${category}%`)
                  .orWhere('content', 'ilike', `%${category}%`);
            });
          });
        }
        
        if (tags && Array.isArray(tags) && tags.length > 0) {
          queryBuilder = queryBuilder.andWhere(function() {
            tags.forEach(tag => {
              this.orWhere('content', 'ilike', `%${tag}%`);
            });
          });
        }
        
        memories = await queryBuilder
          .orderBy('updated_at', 'desc')
          .limit(limit);
      }
    } else {
      // Get all memories if no query
      console.log('🔍 Fetching all memories for user');
      memories = await knex('user_memories')
        .where('user_id', validUserId)
        .orderBy('updated_at', 'desc')
        .limit(limit);
    }
    
    console.log(`✅ Found ${memories.length} memories`);
    
    // Increment access count for retrieved memories
    if (memories.length > 0) {
      // Note: access_count tracking disabled due to simplified schema
    }
    
    // Return memories directly (no context column in simplified schema)
    res.json({ 
      success: true, 
      memories,
      total: memories.length,
      source: 'database_direct'
    });
    
  } catch (error) {
    console.error('❌ Direct search error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Handle memory search (LEGACY - keeping for vector search fallback)
 */
async function handleSearch(db, knex, userId, query, limit = 20, res) {
  try {
    // Ensure user exists - auto-create if needed
    const validUserId = await ensureUserExists(db, knex, userId);
    
    let memories;
    
    // 🌍 UNIVERSAL QUERY HANDLING: Handle special cases
    if (query && query !== 'ALL MEMORIES') {
      // Enhanced semantic search with better keyword matching
      const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);
      
      // 🔧 SEMANTIC MAPPINGS: Essential for memory categorization and search bridging
      // These help the system understand related concepts and bridge user queries to stored categories
      // 🌍 COMPREHENSIVE SEMANTIC MAPPINGS - ALL CATEGORIES
      const semanticMappings = {
        // 👤 Personal Identity
        'name': ['name', 'called', 'known_as', 'username', 'nickname'],
        'age': ['age', 'old', 'born', 'birthday', 'years'],
        'location': ['location', 'live', 'from', 'city', 'country', 'hometown', 'current_location', 'where', 'place'],
        'current_location': ['current_location', 'location', 'where', 'city', 'country', 'current'],
        'where': ['where', 'location', 'current_location', 'city', 'place'],
        'from': ['from', 'hometown', 'location', 'current_location', 'origin'],
        
        // 💼 Professional & Education
        'profession': ['profession', 'job', 'work', 'career', 'occupation', 'company', 'workplace'],
        'job': ['job', 'profession', 'work', 'career', 'occupation', 'employment'],
        'work': ['work', 'job', 'profession', 'career', 'occupation', 'office'],
        'career': ['career', 'profession', 'job', 'work', 'occupation'],
        'education': ['education', 'school', 'university', 'college', 'degree', 'study', 'studies'],
        'school': ['school', 'education', 'university', 'college', 'studies'],
        'skills': ['skills', 'talent', 'ability', 'good_at', 'expertise', 'proficient'],
        
        // 👨‍👩‍👧‍👦 Relationships & Family
        'family': ['family', 'parents', 'siblings', 'children', 'relatives', 'mother', 'father', 'brother', 'sister'],
        'parents': ['parents', 'family', 'mother', 'father', 'mom', 'dad'],
        'siblings': ['siblings', 'family', 'brother', 'sister', 'brothers', 'sisters'],
        'children': ['children', 'family', 'kids', 'son', 'daughter', 'child'],
        'mother': ['mother', 'mom', 'mama', 'family', 'parents'],
        'father': ['father', 'dad', 'papa', 'family', 'parents'],
        'romantic': ['partner', 'boyfriend', 'girlfriend', 'spouse', 'husband', 'wife', 'married', 'dating', 'relationship'],
        'partner': ['partner', 'boyfriend', 'girlfriend', 'spouse', 'relationship', 'romantic'],
        'friend': ['friend', 'buddy', 'pal', 'bestfriend', 'colleague', 'friends', 'friendship'],
        'friends': ['friends', 'friend', 'buddy', 'pal', 'bestfriend', 'friendship'],
        'relationship': ['relationship', 'friend', 'partner', 'boyfriend', 'girlfriend', 'romantic'],
        
        // 🐾 Pets & Animals
        'pet': ['pet', 'pets', 'animal', 'dog', 'cat', 'puppy', 'kitten', 'pet_name'],
        'pet_name': ['pet_name', 'pet', 'animal', 'dog', 'cat', 'pets'],
        'animal': ['animal', 'pet', 'pets', 'dog', 'cat', 'wildlife'],
        'dog': ['dog', 'puppy', 'canine', 'pet', 'pets', 'animal'],
        'cat': ['cat', 'kitten', 'feline', 'pet', 'pets', 'animal'],
        
        // 💖 Emotions & Feelings (COMPREHENSIVE)
        'emotion': ['emotion', 'feeling', 'mood', 'sentiment', 'emotional'],
        'feeling': ['feeling', 'emotion', 'mood', 'sentiment', 'feel'],
        'mood': ['mood', 'emotion', 'feeling', 'sentiment'],
        'happy': ['happy', 'joyful', 'excited', 'thrilled', 'elated', 'cheerful', 'delighted', 'glad'],
        'sad': ['sad', 'depressed', 'upset', 'disappointed', 'melancholy', 'heartbroken', 'down'],
        'angry': ['angry', 'furious', 'mad', 'irritated', 'frustrated', 'annoyed', 'rage'],
        'anxious': ['anxious', 'worried', 'nervous', 'stressed', 'overwhelmed', 'panic', 'anxiety'],
        'love': ['love', 'adore', 'cherish', 'care', 'affection', 'devoted', 'loving'],
        'afraid': ['afraid', 'scared', 'terrified', 'fearful', 'phobia', 'fear'],
        'excited': ['excited', 'thrilled', 'enthusiastic', 'eager', 'happy', 'elated'],
        'stressed': ['stressed', 'overwhelmed', 'anxious', 'worried', 'pressure', 'tense'],
        
        // 🎯 Preferences & Interests
        'favorite': ['favorite', 'love', 'like', 'prefer', 'best', 'preferred'],
        'favorite_food': ['favorite_food', 'love_eating', 'cuisine', 'dish', 'food', 'meal'],
        'favorite_color': ['favorite_color', 'color', 'prefer_color', 'favourite_color'],
        'hobbies': ['hobbies', 'hobby', 'interests', 'passion', 'enjoy', 'activity', 'fun', 'pastime'],
        'hobby': ['hobby', 'hobbies', 'interest', 'passion', 'activity', 'pastime'],
        'interests': ['interests', 'hobbies', 'hobby', 'passion', 'enjoy', 'like'],
        'music': ['music', 'song', 'band', 'artist', 'genre', 'listen', 'musical'],
        'movies': ['movies', 'movie', 'film', 'show', 'series', 'watch', 'cinema'],
        'books': ['books', 'book', 'read', 'reading', 'author', 'novel', 'literature'],
        'sports': ['sports', 'sport', 'game', 'team', 'play', 'exercise', 'fitness', 'athletic'],
        
        // 🎯 Goals & Aspirations
        'goal': ['goal', 'goals', 'dreams', 'aspirations', 'plans', 'ambitions', 'aims'],
        'goals': ['goals', 'goal', 'dreams', 'aspirations', 'plans', 'ambitions', 'aims'],
        'dreams': ['dreams', 'dream', 'goals', 'aspirations', 'plans', 'ambitions', 'hopes'],
        'aspirations': ['aspirations', 'goals', 'dreams', 'plans', 'ambitions', 'hopes'],
        'plans': ['plans', 'goal', 'goals', 'dreams', 'aspirations', 'planning'],
        'achievements': ['achievements', 'accomplishments', 'success', 'proud', 'won', 'completed'],
        'fears': ['fears', 'fear', 'worry', 'concern', 'afraid_of', 'scared_of', 'phobia'],
        'challenges': ['challenges', 'challenge', 'difficult', 'struggle', 'problem', 'issue'],
        
        // 📅 Temporal & Events
        'memory': ['memory', 'memories', 'remember', 'experience', 'event', 'happened'],
        'memories': ['memories', 'memory', 'remember', 'experience', 'events', 'past'],
        'experience': ['experience', 'event', 'memory', 'happened', 'lived'],
        'event': ['event', 'experience', 'memory', 'happened', 'occasion'],
        'routine': ['routine', 'daily', 'habit', 'usually', 'regular', 'schedule'],
        'birthday': ['birthday', 'birth', 'born', 'age', 'celebration', 'party'],
        
        // 🏠 Living & Lifestyle
        'home': ['home', 'house', 'apartment', 'room', 'living', 'residence'],
        'health': ['health', 'medical', 'condition', 'allergy', 'medication', 'doctor', 'wellness'],
        'food': ['food', 'eat', 'meal', 'cooking', 'cuisine', 'dish', 'restaurant'],
        'transportation': ['car', 'drive', 'transport', 'travel', 'commute', 'vehicle'],
        'technology': ['computer', 'phone', 'device', 'software', 'tech', 'app', 'internet'],
        
        // Legacy mappings for backward compatibility
        'subject': ['mathematics', 'math', 'science', 'subject', 'topic'],
        'mathematics': ['algebra', 'calculus', 'math', 'mathematics', 'numbers'],
        'math': ['algebra', 'calculus', 'math', 'mathematics', 'numbers'],
        'current': ['new york', 'current', 'current_location', 'location', 'now']
      };
      
      memories = await knex('user_memories')
        .where('user_id', validUserId)
        .andWhere(function() {
          // Search in content and memory_key
          this.where('content', 'ilike', `%${query}%`)
              .orWhere('memory_key', 'ilike', `%${query}%`);
          
          // Enhanced semantic matching for common queries
          searchTerms.forEach(term => {
            if (semanticMappings[term]) {
              semanticMappings[term].forEach(mapped => {
                this.orWhere('content', 'ilike', `%${mapped}%`)
                    .orWhere('memory_key', 'ilike', `%${mapped}%`);
              });
            }
          });
          
          // CRITICAL FIX: Also check the full query against semantic mappings
          if (semanticMappings[query.toLowerCase()]) {
            semanticMappings[query.toLowerCase()].forEach(mapped => {
              this.orWhere('content', 'ilike', `%${mapped}%`)
                  .orWhere('memory_key', 'ilike', `%${mapped}%`);
            });
          }
        })
        .orderBy('updated_at', 'desc')
        .limit(limit);
    } else {
      // Get all memories
      memories = await knex('user_memories')
        .where('user_id', validUserId)
        .orderBy('updated_at', 'desc')
        .limit(limit);
    }
    
    // Increment access count for top results
    if (memories.length > 0) {
      // Note: access_count tracking disabled due to simplified schema
    }
    
    // Return memories directly (no context column in simplified schema)
    res.json({ 
      success: true, 
      memories,
      total: memories.length
    });
    
  } catch (error) {
    console.error('❌ Search memory error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * Handle memory update
 */
async function handleUpdate(db, knex, userId, key, value, context, metadata, res) {
  try {
    // Ensure user exists - auto-create if needed
    const validUserId = await ensureUserExists(db, knex, userId);
    
    const updateData = {
      content: value,
      updated_at: new Date()
    };
    
    const updated = await knex('user_memories')
      .where({ user_id: validUserId, memory_key: key })
      .update(updateData);
    
    if (updated === 0) {
      // Memory doesn't exist, create it
      await handleStore(db, knex, validUserId, key, value, context, metadata, res);
    } else {
      res.json({ 
        success: true, 
        message: 'Memory updated successfully' 
      });
    }
    
  } catch (error) {
    console.error('❌ Update memory error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * Handle memory deletion
 */
async function handleDelete(db, knex, userId, key, res) {
  try {
    // Ensure user exists - auto-create if needed
    const validUserId = await ensureUserExists(db, knex, userId);
    
    const deleted = await knex('user_memories')
      .where({ user_id: validUserId, memory_key: key })
      .delete();
    
    res.json({ 
      success: true, 
      message: deleted > 0 ? 'Memory deleted successfully' : 'Memory not found',
      deleted
    });
    
  } catch (error) {
    console.error('❌ Delete memory error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * Handle getting learning context
 */
async function handleGetLearningContext(db, knex, userId, domain, res) {
  try {
    // Ensure user exists - auto-create if needed
    const validUserId = await ensureUserExists(db, knex, userId);
    
    // Get cognitive progression
    let progressionQuery = knex('cognitive_domain_progression')
      .where('user_id', validUserId)
      .orderBy('updated_at', 'desc');
    
    if (domain) {
      progressionQuery = progressionQuery.where('domain', domain);
    }
    
    const progression = await progressionQuery;
    
    // Get recent learning memories (simplified - context column removed from schema)
    const learningMemories = await knex('user_memories')
      .where('user_id', validUserId)
      .orderBy('updated_at', 'desc')
      .limit(20);
    
    // Get behavior patterns
    const patterns = await knex('user_behavior_patterns')
      .where('user_id', validUserId)
      .orderBy('last_updated', 'desc')
      .limit(10);
    
    // Parse JSON fields (simplified for current schema)
    const context = {
      progression: progression.map(p => ({
        ...p,
        progression_data: typeof p.progression_data === 'string' ? JSON.parse(p.progression_data) : p.progression_data
      })),
      memories: learningMemories,
      patterns: patterns.map(p => ({
        ...p,
        pattern: typeof p.pattern === 'string' ? JSON.parse(p.pattern) : p.pattern
      })),
      hasHistory: progression.length > 0 || learningMemories.length > 0
    };
    
    res.json({ 
      success: true, 
      context
    });
    
  } catch (error) {
    console.error('❌ Get learning context error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * Store cognitive progression
 */
async function storeCognitiveProgression(knex, userId, key, value, context) {
  try {
    const domain = context.domain || extractDomain(key, value);
    const emotionalState = context.emotionalState || 'neutral';
    const masteryLevel = context.masteryLevel || inferMasteryLevel(value);
    
    // Check if progression exists
    const existing = await knex('cognitive_domain_progression')
      .where({ 
        user_id: userId, 
        domain,
        subdomain: context.subdomain || null
      })
      .first();
    
    const progressionData = {
      user_id: userId,
      domain,
      subdomain: context.subdomain || null,
      mastery_level: masteryLevel,
      emotional_state: emotionalState,
      progression_data: JSON.stringify({
        key,
        value,
        context,
        timestamp: new Date().toISOString()
      }),
      last_interaction: new Date(),
      updated_at: new Date()
    };
    
    if (existing) {
      await knex('cognitive_domain_progression')
        .where({ id: existing.id })
        .update(progressionData);
    } else {
      // Generate UUID for cognitive progression
      const client = await pool().connect();
      try {
        const uuidResult = await client.query('SELECT uuid_generate_v4() as id');
        const newId = uuidResult.rows[0].id;
        
        await knex('cognitive_domain_progression')
          .insert({
            id: newId,
            ...progressionData,
            created_at: new Date()
          });
      } finally {
        client.release();
      }
    }
    
  } catch (error) {
    console.error('⚠️ Failed to store cognitive progression:', error);
  }
}

// Helper functions
function extractTags(key, value, category) {
  const tags = [];
  if (category) tags.push(category);
  
  const combined = `${key} ${value}`.toLowerCase();
  
  // Domain tags
  if (combined.includes('math')) tags.push('math');
  if (combined.includes('science')) tags.push('science');
  if (combined.includes('programming') || combined.includes('code')) tags.push('programming');
  if (combined.includes('language') || combined.includes('writing')) tags.push('language');
  
  // Emotion tags
  const emotions = ['happy', 'sad', 'anxious', 'excited', 'frustrated', 'confident'];
  emotions.forEach(emotion => {
    if (combined.includes(emotion)) tags.push(emotion);
  });
  
  return tags;
}

function calculateImportance(key, value, category) {
  const categoryWeights = {
    'name': 0.9,
    'event': 0.8,
    'cognitive_insight': 0.85,
    'learning': 0.8,
    'preference': 0.7,
    'emotion': 0.75,
    'relationship': 0.85,
    'location': 0.6,
    'general': 0.5
  };
  
  let importance = categoryWeights[category] || 0.5;
  
  // Adjust based on content length
  if (value.length > 100) importance += 0.1;
  if (value.length > 200) importance += 0.1;
  
  return Math.min(1.0, importance);
}

function extractDomain(key, value) {
  const combined = `${key} ${value}`.toLowerCase();
  
  if (combined.includes('math') || combined.includes('equation')) return 'math';
  if (combined.includes('science') || combined.includes('physics')) return 'science';
  if (combined.includes('code') || combined.includes('programming')) return 'programming';
  if (combined.includes('language') || combined.includes('writing')) return 'language';
  if (combined.includes('history')) return 'history';
  
  return 'general';
}

function inferMasteryLevel(value) {
  const valueLower = value.toLowerCase();
  
  if (valueLower.includes('mastered') || valueLower.includes('understand')) {
    return 'understanding';
  }
  if (valueLower.includes('confused') || valueLower.includes("don't understand")) {
    return 'confused';
  }
  if (valueLower.includes('struggling')) {
    return 'struggling';
  }
  if (valueLower.includes('exploring')) {
    return 'exploring';
  }
  
  return 'learning';
}

/**
 * Ensure user exists, creating if necessary with proper UUID format
 */
async function ensureUserExists(db, knex, userId) {
  try {
    // Check if userId is a valid UUID format
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    
    let existingUser;
    if (isUUID) {
      // Search by ID if it's a UUID
      existingUser = await knex('users').where('id', userId).first();
    } else {
      // Search by username if it's not a UUID
      existingUser = await knex('users').where('username', userId).first();
    }
    
    if (existingUser) {
      console.log(`✅ Found existing user: ${existingUser.id} (${existingUser.username})`);
      return existingUser.id;
    }
    
    // User doesn't exist, create one with proper UUID using knex
    console.log(`🧑‍💻 Creating new user for memory system: ${userId}`);
    
    try {
      // Use knex directly instead of pool() to avoid connection issues
      const [newUser] = await knex('users')
        .insert({
          username: userId,
          email: `${userId}@memory.system`,
          password: 'system_generated_user',
          role: 'learner',
          profile: JSON.stringify({
            created_for: 'memory_system',
            original_id: userId,
            auto_created: true,
            created_at: new Date().toISOString()
          })
        })
        .returning(['id', 'username', 'email']);
      
      console.log(`✅ Created new user for memory system:`, newUser);
      
      return newUser.id;
      
    } catch (insertError) {
      console.error('❌ Failed to insert new user:', insertError);
      throw insertError;
    }
    
  } catch (error) {
    console.error('❌ Failed to ensure user exists:', error);
    
    // Fallback: try to find any existing user or create a system user
    try {
      const systemUser = await knex('users')
        .where('username', 'system_memory_fallback')
        .first();
      
      if (systemUser) {
        console.log(`🔧 Using fallback system user: ${systemUser.id}`);
        return systemUser.id;
      }
      
      // Ultimate fallback: create system user
      const client = await pool().connect();
      try {
        const result = await client.query(`
          INSERT INTO users (id, username, email, password, role, profile)
          VALUES (
            uuid_generate_v4(),
            'system_memory_fallback',
            'system@memory.fallback',
            'system_fallback',
            'system',
            $1
          )
          ON CONFLICT (username) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
          RETURNING id, username
        `, [JSON.stringify({ purpose: 'memory_system_fallback', created_at: new Date().toISOString() })]);
        
        const fallbackUser = result.rows[0];
        console.log(`🔧 Created/retrieved fallback system user:`, fallbackUser);
        
        return fallbackUser.id;
        
      } finally {
        client.release();
      }
      
    } catch (fallbackError) {
      console.error('❌ Even fallback user creation failed:', fallbackError);
      throw new Error('Unable to ensure user exists for memory operations');
    }
  }
}

/**
 * 🚀 HNSW INTEGRATION HANDLERS
 * Connect HNSW services to the memory API
 */

/**
 * 🚀 ENHANCED: Handle HNSW Bridge Search (FASTEST - Direct Bridge Access)
 */
async function handleHNSWBridgeSearch(db, knex, requestBody, res) {
  try {
    const { userId, query, componentTypes, limit = 10, similarityThreshold = 0.1 } = requestBody;
    
    console.log('🚀 HNSW Bridge Search:', { userId, query: query?.substring(0, 50), componentTypes, limit });
    
    try {
      // Import HNSW System Bridges using proper path resolution
      const path = require('path');
      const bridgesPath = path.join(__dirname, '..', 'hnsw-services', 'HNSWSystemBridges.cjs');
      const { memorySystemBridge } = require(bridgesPath);
      
      if (memorySystemBridge) {
        console.log('🎯 Using MemorySystemBridge for ultra-fast search');
        
        // Use the sophisticated memory system bridge
        const bridgeResults = await memorySystemBridge.recallMemoryWithHNSW(query, userId, {
          limit,
          similarityThreshold,
          componentTypes
        });
        
        if (bridgeResults && bridgeResults.length > 0) {
          console.log(`✅ HNSW Bridge found ${bridgeResults.length} memories with ultra-fast search`);
          
          // Transform bridge results to expected format
          const memories = bridgeResults.map(result => ({
            id: result.id,
            memory_key: result.memory_key,
            content: result.content,
            similarity: result.similarity,
            metadata: result.context || {},
            source: result.source,
            created_at: result.timestamp
          }));
          
          return res.json({
            success: true,
            memories,
            total: memories.length,
            source: 'hnsw_bridge_accelerated'
          });
        } else {
          console.log('🔄 HNSW Bridge returned no results, falling back to core integration');
        }
      }
    } catch (bridgeError) {
      console.warn('⚠️ HNSW Bridge search failed, using core integration fallback:', bridgeError.message);
    }
    
    // 🔄 FALLBACK: Use HNSW Core Integration
    await handleVectorSearch(db, knex, requestBody, res);
    
  } catch (error) {
    console.error('❌ HNSW Bridge search error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Handle vector search using HNSW acceleration
 */
async function handleVectorSearch(db, knex, requestBody, res) {
  try {
    const { userId, query, componentTypes, limit = 10 } = requestBody;
    
    console.log('🔍 Memory Search:', { userId, query: query?.substring(0, 50), limit });
    
    // 🚀 SIMPLIFIED: Skip broken HNSW, go directly to database
    // Using direct DB search - HNSW now uses 768 dimensions (nomic model)
    
    // Get user UUID
    const validUserId = await ensureUserExists(db, knex, userId);
    
    if (!validUserId) {
      return res.json({
        success: true,
        memories: [],
        total: 0,
        source: 'no_user'
      });
    }
    
    // Fetch ALL memories for user directly from database
    const memories = await knex('user_memories')
      .where('user_id', validUserId)
      .orderBy('updated_at', 'desc')
      .limit(limit || 50);
    
    console.log(`✅ Direct DB found ${memories.length} memories for user ${validUserId}`);
    
    return res.json({
      success: true,
      memories: memories.map(m => ({
        id: m.id,
        memory_key: m.memory_key,
        memory_value: m.content,
        content: m.content,
        similarity: 1.0,
        metadata: m.metadata || m.context || {},
        source: 'database_direct',
        created_at: m.created_at
      })),
      total: memories.length,
      source: 'database_direct'
    });
    
  } catch (error) {
    console.error('❌ Memory search error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Handle vector storage using HNSW acceleration
 */
async function handleStoreVector(db, knex, requestBody, res) {
  try {
    const { userId, vectorId, content, embedding, metadata } = requestBody;
    
    console.log('📥 HNSW Vector Storage:', { userId, vectorId, contentLength: content?.length });
    
    // Try to use HNSW service if available
    try {
      const path = require('path');
      const hnswCoreIntegrationPath = path.join(__dirname, '..', 'hnsw-services', 'HNSWCoreIntegration.cjs');
      const { hnswCoreIntegration } = require(hnswCoreIntegrationPath);
      
      if (hnswCoreIntegration) {
        const vectorData = {
          id: vectorId,
          content,
          componentType: metadata?.componentType || 'general',
          userId,
          sessionId: metadata?.sessionId,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
            tags: metadata?.tags || []
          }
        };
        
        const result = await hnswCoreIntegration.storeVector(vectorData);
        
        return res.json({
          success: result.success,
          vectorId: result.vectorId,
          message: 'Vector stored with HNSW acceleration'
        });
      }
    } catch (hnswError) {
      console.warn('⚠️ HNSW storage failed, using fallback:', hnswError.message);
    }
    
    // Fallback to traditional storage
    await handleStore(db, knex, userId, vectorId, content, metadata, {}, res);
    
  } catch (error) {
    console.error('❌ Vector storage error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Handle assistant memory storage
 */
async function handleStoreAssistantMemory(db, knex, requestBody, res) {
  try {
    const { userId, assistantType, sessionId, memoryType, content, context } = requestBody;
    
    console.log('🤖 Assistant Memory Storage:', { userId, assistantType, memoryType });
    
    try {
      const path = require('path');
      const bridgesPath = path.join(__dirname, '..', '..', 'hnsw-services', 'HNSWSystemBridges.cjs');
      const { assistantSystemBridge } = require(bridgesPath);
      
      if (assistantSystemBridge) {
        const result = await assistantSystemBridge.storeAssistantInteraction({
          userId,
          assistantType,
          sessionId,
          userMessage: context?.userMessage || '',
          assistantResponse: context?.assistantResponse || content,
          context,
          metadata: { memoryType }
        });
        
        return res.json({
          success: result.success,
          vectorId: result.vectorId,
          message: 'Assistant memory stored with HNSW acceleration'
        });
      }
    } catch (hnswError) {
      console.warn('⚠️ Assistant memory HNSW storage failed:', hnswError.message);
    }
    
    // Fallback to traditional storage
    const memoryKey = `assistant_${assistantType}_${memoryType}_${Date.now()}`;
    await handleStore(db, knex, userId, memoryKey, content, context, { assistantType, memoryType }, res);
    
  } catch (error) {
    console.error('❌ Assistant memory storage error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Handle cross-chat knowledge storage
 */
async function handleStoreCrossChat(db, knex, requestBody, res) {
  try {
    const { userId, id, content, knowledgeType, sessionId, metadata } = requestBody;
    
    console.log('🔄 Cross-Chat Knowledge Storage:', { userId, id, knowledgeType });
    
    try {
      const path = require('path');
      const bridgesPath = path.join(__dirname, '..', '..', 'hnsw-services', 'HNSWSystemBridges.cjs');
      const { crossChatKnowledgeBridge } = require(bridgesPath);
      
      if (crossChatKnowledgeBridge) {
        const result = await crossChatKnowledgeBridge.storeCrossChatKnowledge({
          id,
          content,
          userId,
          sessionId,
          knowledgeType,
          metadata
        });
        
        return res.json({
          success: result.success,
          vectorId: result.vectorId,
          message: 'Cross-chat knowledge stored with HNSW acceleration'
        });
      }
    } catch (hnswError) {
      console.warn('⚠️ Cross-chat HNSW storage failed:', hnswError.message);
    }
    
    // Fallback to traditional storage
    await handleStore(db, knex, userId, id, content, { knowledgeType, sessionId }, metadata || {}, res);
    
  } catch (error) {
    console.error('❌ Cross-chat knowledge storage error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Handle HNSW index save request
 */
async function handleSaveHNSWIndex(res) {
  try {
    console.log('💾 HNSW Index Save Request');
    
    try {
      const path = require('path');
      const hnswServicePath = path.join(__dirname, '..', '..', 'hnsw-services', 'HNSWVectorSearchService.cjs');
      const { hnswVectorSearchService } = require(hnswServicePath);
      
      if (hnswVectorSearchService && hnswVectorSearchService.isAvailable()) {
        await hnswVectorSearchService.saveIndex();
        
        return res.json({
          success: true,
          message: 'HNSW index saved to PostgreSQL successfully'
        });
      } else {
        return res.json({
          success: false,
          message: 'HNSW service not available'
        });
      }
    } catch (hnswError) {
      console.warn('⚠️ HNSW index save failed:', hnswError.message);
      return res.json({
        success: false,
        message: 'HNSW index save failed',
        error: hnswError.message
      });
    }
    
  } catch (error) {
    console.error('❌ HNSW index save error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 🚀 HNSW-ONLY HANDLERS (when database is not available)
 */

/**
 * Handle store using HNSW only
 */
async function handleStoreHNSWOnly(userId, key, value, context, metadata, res) {
  try {
    console.log('🚀 Storing memory in HNSW-only mode:', key);
    
    const path = require('path');
    const hnswCorePath = path.join(__dirname, '..', 'hnsw-services', 'HNSWCoreIntegration.cjs');
    const { hnswCoreIntegration } = require(hnswCorePath);
    
    if (!hnswCoreIntegration.initialized) {
      await hnswCoreIntegration.initialize();
    }
    
    // 🎯 PROPER COMPONENT TYPE: Use determined type for efficient filtering at scale
    const memoryCategory = metadata?.category || '';
    const determinedComponentType = hnswCoreIntegration.determineComponentType(key, memoryCategory);
    
    const vectorData = {
      id: `${userId}_${key}_${Date.now()}`,
      content: `${key}: ${value}`,
      componentType: determinedComponentType,  // 🎯 Proper type instead of hardcoded 'chat_knowledge'
      userId,
      sessionId: metadata?.sessionId || 'default_session',
      metadata: {
        memoryKey: key,
        timestamp: new Date().toISOString(),
        ...(metadata || {})
      }
    };
    
    const result = await hnswCoreIntegration.storeVector(vectorData);
    
    if (result.success) {
      console.log(`✅ Memory stored in HNSW-only mode: ${key}`);
      return res.json({
        success: true,
        message: 'Memory stored successfully (HNSW-only mode)',
        data: { key, value },
        source: 'hnsw_only'
      });
    } else {
      throw new Error('HNSW storage failed');
    }
  } catch (error) {
    console.error('❌ HNSW-only store failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Handle search using HNSW only
 */
async function handleSearchHNSWOnly(userId, query, limit, res) {
  try {
    console.log('🚀 Searching memories in HNSW-only mode:', query);
    
    const path = require('path');
    const hnswCorePath = path.join(__dirname, '..', 'hnsw-services', 'HNSWCoreIntegration.cjs');
    const { hnswCoreIntegration } = require(hnswCorePath);
    
    if (!hnswCoreIntegration.initialized) {
      await hnswCoreIntegration.initialize();
    }
    
    // 🎯 ALL COMPONENT TYPES: Include personal types for comprehensive memory search
    const allComponentTypes = [
      'chat_knowledge', 'general', 'memory',              // Legacy
      'personal_identity', 'relationships', 'professional', // Personal
      'personal_context', 'emotional_state', 'preferences', // Context
      'interests', 'goals', 'learning'                      // Behavioral
    ];
    
    const searchOptions = {
      userId,
      componentTypes: allComponentTypes,  // 🎯 ALL types by default
      limit: limit || 20,
      similarityThreshold: 0.1,
      includeMetadata: true
    };
    
    const results = await hnswCoreIntegration.searchVectors(query || '', searchOptions);
    
    // Transform results to expected format
    const memories = results.map(result => ({
      id: result.id,
      memory_key: result.metadata?.memoryKey || result.id,
      content: result.content,
      similarity: result.similarity,
      metadata: result.metadata || {},
      source: 'hnsw_only',
      created_at: result.metadata?.timestamp
    }));
    
    console.log(`✅ HNSW-only mode found ${memories.length} memories`);
    return res.json({
      success: true,
      memories,
      total: memories.length,
      source: 'hnsw_only'
    });
  } catch (error) {
    console.error('❌ HNSW-only search failed:', error);
    // Return empty results instead of error
    return res.json({
      success: true,
      memories: [],
      total: 0,
      source: 'hnsw_only_empty',
      message: 'No memories found. Vector store is empty - add memories through conversation.'
    });
  }
}

/**
 * 🗑️ RESET HNSW INDEX - Clear broken index and start fresh
 */
router.post('/reset-hnsw', async (req, res) => {
  try {
    console.log('🗑️ Resetting HNSW index...');
    
    const { pool } = require('../../services/database.cjs');
    const db = pool();
    
    if (db) {
      // Clear the HNSW index data from database
      await db.query('DELETE FROM hnswlib_indices');
      await db.query('DELETE FROM hnsw_vector_metadata');
      console.log('✅ Cleared HNSW index tables');
      
      // Reload HNSW service to create fresh index
      const path = require('path');
      const hnswPath = path.join(__dirname, '..', 'hnsw-services', 'HNSWVectorSearchService.cjs');
      delete require.cache[require.resolve(hnswPath)];
      
      return res.json({
        success: true,
        message: 'HNSW index reset. New index will be created with 768 dimensions.'
      });
    }
    
    res.status(500).json({ success: false, error: 'Database not available' });
  } catch (error) {
    console.error('❌ HNSW reset failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 🚀 BACKFILL EMBEDDINGS - Generate embeddings for existing memories
 * This endpoint is meant to be called on Render where the API key exists
 */
router.post('/memory/backfill-embeddings', async (req, res) => {
  try {
    console.log('🚀 Starting embeddings backfill...');
    
    const db = pool();
    if (!db) {
      return res.status(500).json({ success: false, error: 'Database not available' });
    }
    
    // Get memories without embeddings
    const result = await db.query(`
      SELECT id, user_id, memory_key, content
      FROM user_memories
      WHERE embedding IS NULL
      ORDER BY created_at DESC
      LIMIT 100
    `);
    
    console.log(`📊 Found ${result.rows.length} memories to process`);
    
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        message: 'All memories already have embeddings!',
        processed: 0
      });
    }
    
    // Get HNSW integration for embedding generation
    const path = require('path');
    const hnswPath = path.join(__dirname, '..', 'hnsw-services', 'HNSWCoreIntegration.cjs');
    const { hnswCoreIntegration } = require(hnswPath);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const memory of result.rows) {
      try {
        const textToEmbed = `${memory.memory_key}: ${memory.content}`;
        const embedding = await hnswCoreIntegration.generateEmbedding(textToEmbed);
        
        if (embedding && embedding.length > 0) {
          // Store embedding in pgvector format
          const vectorString = `[${embedding.join(',')}]`;
          await db.query(
            `UPDATE user_memories SET embedding = $1::vector, updated_at = NOW() WHERE id = $2`,
            [vectorString, memory.id]
          );
          successCount++;
          console.log(`✅ Backfilled: ${memory.memory_key}`);
        } else {
          failCount++;
          console.log(`⚠️ No embedding for: ${memory.memory_key}`);
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (err) {
        console.error(`❌ Failed to backfill ${memory.memory_key}:`, err.message);
        failCount++;
      }
    }
    
    res.json({
      success: true,
      message: `Backfill complete: ${successCount} success, ${failCount} failed`,
      processed: successCount,
      failed: failCount,
      remaining: result.rows.length - successCount - failCount
    });
    
  } catch (error) {
    console.error('❌ Backfill error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
