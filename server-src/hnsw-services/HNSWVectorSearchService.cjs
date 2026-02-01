/**
 * 🚀 HNSW Vector Search Service - CommonJS Version
 * 
 * State-of-the-art performance vector search using HNSW + PostgreSQL persistence
 * Converted to CommonJS for server-side compatibility
 * 
 * ⚠️ DISABLED: pgvector in PostgreSQL is primary. HNSW kept for future high-scale use.
 */

// 🔧 FEATURE FLAG: Set to true to re-enable HNSW in-memory search
const HNSW_ENABLED = false;

const { HierarchicalNSW } = require('hnswlib-node');
const fs = require('fs');
const path = require('path');

class HNSWVectorSearchService {
  constructor() {
    this.index = null;
    this.indexLoaded = false;
    this.hnswEnabled = HNSW_ENABLED;
    this.databaseManager = null;
    this.vectorIdMap = new Map(); // HNSW label -> our ID
    this.idVectorMap = new Map(); // our ID -> HNSW label
    this.vectorMetadata = new Map(); // ID -> data
    this.nextLabel = 0;
    this.indexDirty = false;
    this.autoSaveInterval = null;
    // 🔧 WINDOWS COMPATIBLE: Use OS-appropriate temp directory
    const os = require('os');
    const path = require('path');
    this.tempIndexPath = path.join(os.tmpdir(), 'neuraplay_hnsw.index');
  }

  static getInstance() {
    if (!HNSWVectorSearchService.instance) {
      HNSWVectorSearchService.instance = new HNSWVectorSearchService();
    }
    return HNSWVectorSearchService.instance;
  }

  /**
   * 🏗️ Initialize HNSW index with PostgreSQL persistence
   */
  async initialize() {
    // 🔧 DISABLED: pgvector is primary, HNSW kept for future high-scale use
    if (!this.hnswEnabled) {
      console.log('ℹ️ HNSW in-memory search disabled (pgvector is primary)');
      return;
    }
    
    try {
      console.log('🚀 Initializing HNSW Vector Search Service...');

      // 🔧 ENHANCED: Robust database connection with multiple fallbacks
      await this.establishDatabaseConnection();
      console.log(`✅ HNSW: Database connection status: ${this.databaseManager ? 'Connected' : 'In-memory mode'}`);
      
      // Validate database connection before proceeding
      if (this.databaseManager) {
        const connectionValid = await this.validateDatabaseConnection();
        if (!connectionValid) {
          console.warn('⚠️ HNSW: Database connection validation failed, using in-memory mode');
          this.databaseManager = null;
        }
      }

      // Create indices table for HNSW persistence
      await this.ensureIndicesTable();

      // Load or create HNSW index
      await this.loadOrCreateIndex();

      // Set up auto-save every hour
      this.setupAutoSave();

      console.log('✅ HNSW Vector Search Service initialized successfully');
      
    } catch (error) {
      console.error('❌ HNSW initialization failed:', error);
      this.indexLoaded = false;
    }
  }

  /**
   * 🔧 ENHANCED: Establish robust database connection with multiple fallbacks
   */
  async establishDatabaseConnection() {
    try {
      // First try: ServiceContainer (if available)
      try {
        const { serviceContainer } = require('./ServiceContainer.cjs');
        this.databaseManager = serviceContainer.get('databaseManager');
        console.log('✅ HNSW: Connected via ServiceContainer');
        return;
      } catch (serviceError) {
        console.log('🔄 HNSW: ServiceContainer not available, trying direct connection');
      }
      
      // Second try: Direct database connection
      try {
        const { pool, queryBuilder } = require('../../services/database.cjs');
        if (pool && pool()) {
          this.databaseManager = { 
            pool: pool(), 
            queryBuilder: queryBuilder ? queryBuilder() : null 
          };
          console.log('✅ HNSW: Connected via direct database pool');
          return;
        }
      } catch (dbError) {
        console.log('🔄 HNSW: Direct pool not available, trying alternative paths');
      }
      
      // Third try: Alternative database module path
      try {
        const dbModule = require('../../services/database.cjs');
        if (dbModule && dbModule.pool && typeof dbModule.pool === 'function') {
          const poolInstance = dbModule.pool();
          if (poolInstance) {
            this.databaseManager = { pool: poolInstance };
            console.log('✅ HNSW: Connected via alternative database path');
            return;
          }
        }
      } catch (altError) {
        console.log('🔄 HNSW: Alternative path failed');
      }
      
      console.log('⚠️ HNSW: All database connection attempts failed, using in-memory mode');
      this.databaseManager = null;
      
    } catch (error) {
      console.error('❌ HNSW: Database connection establishment failed:', error.message);
      this.databaseManager = null;
    }
  }

  /**
   * 🔧 Validate database connection with simple test query
   */
  async validateDatabaseConnection() {
    try {
      if (!this.databaseManager || !this.databaseManager.pool) {
        return false;
      }
      
      // Test connection with simple query
      const client = await this.databaseManager.pool.connect();
      try {
        await client.query('SELECT 1 as test');
        console.log('✅ HNSW: Database connection validated successfully');
        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ HNSW: Database connection validation failed:', error.message);
      return false;
    }
  }

  /**
   * 📋 Create table for storing HNSW indices
   */
  async ensureIndicesTable() {
    try {
      // Use available database connection
      let poolInstance;
      
      if (this.databaseManager && this.databaseManager.pool) {
        // this.databaseManager.pool is already the Pool instance
        poolInstance = this.databaseManager.pool;
      } else {
        const dbModule = require('../../services/database.cjs');
        // dbModule.pool is a function that returns the Pool instance
        poolInstance = dbModule.pool ? (typeof dbModule.pool === 'function' ? dbModule.pool() : dbModule.pool) : null;
      }
      
      if (poolInstance) {
        const client = await poolInstance.connect();
        
        try {
          await client.query(`
            CREATE TABLE IF NOT EXISTS hnswlib_indices (
              name VARCHAR(100) PRIMARY KEY,
              index_data BYTEA NOT NULL,
              vector_count INTEGER DEFAULT 0,
              dimension INTEGER DEFAULT 768,
              max_elements INTEGER DEFAULT 100000,
              ef_construction INTEGER DEFAULT 200,
              m INTEGER DEFAULT 16,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);

          await client.query(`
            CREATE TABLE IF NOT EXISTS hnsw_vector_metadata (
              vector_id VARCHAR(255) PRIMARY KEY,
              hnsw_label INTEGER NOT NULL,
              content TEXT NOT NULL,
              user_id VARCHAR(255),
              content_type VARCHAR(100) DEFAULT 'knowledge',
              metadata JSONB DEFAULT '{}',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);

          console.log('✅ HNSW indices tables created/verified');
        } finally {
          client.release();
        }
      } else {
        console.log('⚠️ HNSW: No database connection, tables not created');
      }
      
    } catch (error) {
      console.error('❌ Failed to create HNSW tables:', error.message);
      // Continue without database persistence
    }
  }

  /**
   * 📥 Load existing index or create new one
   */
  async loadOrCreateIndex() {
    try {
      // Get available database connection
      let poolInstance;
      
      if (this.databaseManager && this.databaseManager.pool) {
        // this.databaseManager.pool is already the Pool instance
        poolInstance = this.databaseManager.pool;
      } else {
        const dbModule = require('../../services/database.cjs');
        // dbModule.pool is a function that returns the Pool instance
        poolInstance = dbModule.pool ? (typeof dbModule.pool === 'function' ? dbModule.pool() : dbModule.pool) : null;
      }
      
      if (poolInstance) {
        const client = await poolInstance.connect();
        
        try {
          const result = await client.query(
            'SELECT * FROM hnswlib_indices WHERE name = $1',
            ['main']
          );

          if (result.rows && result.rows.length > 0) {
            // Load existing index
            await this.loadExistingIndex(result.rows[0]);
            console.log('📥 Loaded existing HNSW index from database');
          } else {
            // Create new index
            await this.createNewIndex();
            console.log('🆕 Created new HNSW index');
          }
        } finally {
          client.release();
        }
      } else {
        // Create new index without database
        console.log('🔄 Creating in-memory HNSW index (no database)');
        await this.createNewIndex();
      }

      // Load vector metadata (if database available)
      await this.loadVectorMetadata();
      
    } catch (error) {
      console.error('❌ Failed to load/create index:', error.message);
      // Fallback to new index
      console.log('🔄 Falling back to new in-memory index');
      await this.createNewIndex();
    }
  }

  /**
   * 📥 Load existing HNSW index from PostgreSQL
   */
  async loadExistingIndex(indexData) {
    try {
      console.log('📥 Loading existing HNSW index from PostgreSQL...');

      // 🔧 FIX: Check for dimension mismatch - we use 768 now, old indexes used 1536
      const storedDimension = indexData.dimension || 768;
      const expectedDimension = 768; // Nomic model uses 768 dimensions
      
      if (storedDimension !== expectedDimension) {
        console.warn(`⚠️ DIMENSION MISMATCH: Index has ${storedDimension} dims, we need ${expectedDimension}`);
        console.log('🔄 Clearing old index and creating fresh one with correct dimensions...');
        
        // Clear the old index from database
        await this.clearOldIndex();
        await this.createNewIndex();
        return;
      }

      // Write binary data to temp file
      fs.writeFileSync(this.tempIndexPath, indexData.index_data);

      // Create and load HNSW index
      this.index = new HierarchicalNSW('cosine', expectedDimension);
      this.index.readIndexSync(this.tempIndexPath);
      
      this.indexLoaded = true;
      console.log(`✅ Loaded HNSW index with ${indexData.vector_count} vectors (${storedDimension} dims)`);
      
    } catch (error) {
      console.error('❌ Failed to load existing index:', error);
      await this.createNewIndex();
    }
  }
  
  /**
   * 🗑️ Clear old HNSW index (used when dimension mismatch detected)
   */
  async clearOldIndex() {
    try {
      let poolInstance;
      
      if (this.databaseManager && this.databaseManager.pool) {
        poolInstance = this.databaseManager.pool;
      } else {
        const dbModule = require('../../services/database.cjs');
        poolInstance = dbModule.pool ? (typeof dbModule.pool === 'function' ? dbModule.pool() : dbModule.pool) : null;
      }
      
      if (poolInstance) {
        const client = await poolInstance.connect();
        try {
          await client.query('DELETE FROM hnswlib_indices WHERE name = $1', ['main']);
          await client.query('DELETE FROM hnsw_vector_metadata');
          console.log('✅ Cleared old HNSW index data from database');
        } finally {
          client.release();
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to clear old index:', error.message);
    }
  }

  /**
   * 🆕 Create new HNSW index
   */
  async createNewIndex() {
    try {
      console.log('🆕 Creating new HNSW index...');

      // 🚀 CRITICAL: Use 768 dimensions to match Fireworks nomic-ai/nomic-embed-text-v1.5
      // Previous bug: Was using 1536 dimensions but embeddings are 768-dimensional
      this.index = new HierarchicalNSW('cosine', 768);
      this.index.initIndex(100000); // Support up to 100k vectors
      
      // Note: hnswlib-node may not support setEfConstruction/setEf methods
      // Check if methods exist before calling them
      if (typeof this.index.setEfConstruction === 'function') {
        this.index.setEfConstruction(200); // High quality construction
      }
      if (typeof this.index.setEf === 'function') {
        this.index.setEf(50); // Good search quality
      }

      // Reset mappings for new index
      this.vectorIdMap.clear();
      this.idVectorMap.clear();
      this.vectorMetadata.clear();
      this.nextLabel = 0;

      this.indexLoaded = true;
      this.indexDirty = true;
      
      console.log('✅ Created new HNSW index (100k capacity, ready for vectors)');
      
    } catch (error) {
      console.error('❌ Failed to create new index:', error.message);
      this.indexLoaded = false;
      // Don't throw - let it continue with fallback
    }
  }

  /**
   * 📊 Load vector metadata from PostgreSQL
   */
  async loadVectorMetadata() {
    try {
      // Get available database connection
      let poolInstance;
      
      if (this.databaseManager && this.databaseManager.pool) {
        // this.databaseManager.pool is already the Pool instance
        poolInstance = this.databaseManager.pool;
      } else {
        const dbModule = require('../../services/database.cjs');
        // dbModule.pool is a function that returns the Pool instance
        poolInstance = dbModule.pool ? (typeof dbModule.pool === 'function' ? dbModule.pool() : dbModule.pool) : null;
      }
      
      if (poolInstance) {
        const client = await poolInstance.connect();
        
        try {
          const result = await client.query(
            'SELECT * FROM hnsw_vector_metadata ORDER BY hnsw_label'
          );

          for (const row of result.rows) {
            this.vectorIdMap.set(row.hnsw_label, row.vector_id);
            this.idVectorMap.set(row.vector_id, row.hnsw_label);
            this.vectorMetadata.set(row.vector_id, {
              id: row.vector_id,
              content: row.content,
              embedding: [], // Not needed for search
              metadata: row.metadata,
              userId: row.user_id,
              contentType: row.content_type
            });
            this.nextLabel = Math.max(this.nextLabel, row.hnsw_label + 1);
          }

          console.log(`✅ Loaded metadata for ${result.rows.length} vectors`);
        } finally {
          client.release();
        }
      } else {
        console.log('⚠️ HNSW: No database connection, starting with empty metadata');
      }
      
    } catch (error) {
      console.error('❌ Failed to load vector metadata:', error.message);
      console.log('🔄 Continuing with empty metadata');
    }
  }

  /**
   * 💾 Store vector to pgvector (PostgreSQL)
   * This is the source of truth - HNSW is just for speed
   */
  async storeToPgvector(data) {
    try {
      let poolInstance;
      
      if (this.databaseManager && this.databaseManager.pool) {
        poolInstance = this.databaseManager.pool;
      } else {
        const dbModule = require('../../services/database.cjs');
        poolInstance = dbModule.pool ? (typeof dbModule.pool === 'function' ? dbModule.pool() : dbModule.pool) : null;
      }
      
      if (!poolInstance) {
        console.warn('⚠️ No database pool available for pgvector storage');
        return;
      }

      const client = await poolInstance.connect();
      
      try {
        // Convert embedding array to pgvector format
        const embeddingVector = `[${data.embedding.join(',')}]`;
        
        // Store in user_memories table with pgvector embedding column
        await client.query(`
          INSERT INTO user_memories (
            user_id, 
            memory_key, 
            content, 
            embedding,
            metadata,
            created_at, 
            updated_at
          )
          VALUES ($1, $2, $3, $4::vector, $5, NOW(), NOW())
          ON CONFLICT (user_id, memory_key) 
          DO UPDATE SET 
            content = EXCLUDED.content,
            embedding = EXCLUDED.embedding::vector,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
        `, [
          data.userId,
          data.id,
          data.content,
          embeddingVector,
          JSON.stringify(data.metadata || {})
        ]);
        
        console.log(`✅ Stored to pgvector: userId=${data.userId}, key=${data.id.substring(0, 50)}..., dims=${data.embedding.length}`);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ Failed to store to pgvector:', error.message);
      throw error; // Re-throw so caller knows it failed
    }
  }

  /**
   * ➕ Add vector to HNSW index
   */
  async addVector(data) {
    // 🔧 CRITICAL FIX: Store to pgvector even if HNSW index isn't loaded
    // HNSW is just for speed - pgvector is the source of truth
    
    try {
      // 1️⃣ STORE TO PGVECTOR FIRST (source of truth)
      await this.storeToPgvector(data);
      
      // 2️⃣ THEN add to HNSW index if available (for speed)
      let label = null; // 🔧 FIX: Define outside the if block
      
      if (this.indexLoaded && this.index) {
        // Check if vector already exists
        if (this.idVectorMap.has(data.id)) {
          await this.updateVector(data);
          return;
        }

        label = this.nextLabel++;
        
        // Add to HNSW index
        this.index.addPoint(data.embedding, label);
        
        // Update mappings
        this.vectorIdMap.set(label, data.id);
        this.idVectorMap.set(data.id, label);
        this.vectorMetadata.set(data.id, data);
        
        // Store metadata in PostgreSQL (if available and HNSW is active)
        try {
          let poolInstance;
          
          if (this.databaseManager && this.databaseManager.pool) {
            // this.databaseManager.pool is already the Pool instance
            poolInstance = this.databaseManager.pool;
          } else {
            const dbModule = require('../../services/database.cjs');
            // dbModule.pool is a function that returns the Pool instance
            poolInstance = dbModule.pool ? (typeof dbModule.pool === 'function' ? dbModule.pool() : dbModule.pool) : null;
          }
          
          if (poolInstance) {
            const client = await poolInstance.connect();
            
            try {
              await client.query(`
                INSERT INTO hnsw_vector_metadata 
                (vector_id, hnsw_label, content, user_id, content_type, metadata)
                VALUES ($1, $2, $3, $4, $5, $6)
              `, [
                data.id,
                label,
                data.content,
                data.userId || null,
                data.contentType || 'knowledge',
                JSON.stringify(data.metadata || {})
              ]);
            } finally {
              client.release();
            }
          }
        } catch (dbError) {
          console.warn('⚠️ Failed to store metadata in PostgreSQL:', dbError.message);
        }

        this.indexDirty = true;
        console.log(`✅ Added vector ${data.id} to HNSW index (label: ${label})`);
      } else {
        console.log('⚠️ HNSW index not loaded, stored to pgvector only');
      }
      
    } catch (error) {
      console.error('❌ Failed to add vector to HNSW:', error);
    }
  }

  /**
   * 🔄 Update existing vector
   */
  async updateVector(data) {
    if (!this.indexLoaded || !this.index) {
      return;
    }

    try {
      const existingLabel = this.idVectorMap.get(data.id);
      if (existingLabel !== undefined) {
        // Update metadata
        this.vectorMetadata.set(data.id, data);

        try {
          let poolInstance;
          
          if (this.databaseManager && this.databaseManager.pool) {
            // this.databaseManager.pool is already the Pool instance
            poolInstance = this.databaseManager.pool;
          } else {
            const dbModule = require('../../services/database.cjs');
            // dbModule.pool is a function that returns the Pool instance
            poolInstance = dbModule.pool ? (typeof dbModule.pool === 'function' ? dbModule.pool() : dbModule.pool) : null;
          }
          
          if (poolInstance) {
            const client = await poolInstance.connect();
            
            try {
              await client.query(`
                UPDATE hnsw_vector_metadata 
                SET content = $1, metadata = $2, updated_at = CURRENT_TIMESTAMP
                WHERE vector_id = $3
              `, [
                data.content,
                JSON.stringify(data.metadata || {}),
                data.id
              ]);
            } finally {
              client.release();
            }
          }
        } catch (dbError) {
          console.warn('⚠️ Failed to update metadata in PostgreSQL:', dbError.message);
        }

        console.log(`✅ Updated vector metadata for ${data.id}`);
      }
      
    } catch (error) {
      console.error('❌ Failed to update vector:', error);
    }
  }

  /**
   * 🔍 Get all user vectors from pgvector (for browsing with empty query)
   */
  async getAllUserVectorsPgvector(userId, contentTypes, limit = 10) {
    try {
      let poolInstance;
      
      if (this.databaseManager && this.databaseManager.pool) {
        poolInstance = this.databaseManager.pool;
      } else {
        const dbModule = require('../../services/database.cjs');
        poolInstance = dbModule.pool ? (typeof dbModule.pool === 'function' ? dbModule.pool() : dbModule.pool) : null;
      }
      
      if (!poolInstance) {
        console.warn('⚠️ No database pool available for pgvector getAllUserVectors');
        return [];
      }

      const client = await poolInstance.connect();
      
      try {
        let query = `
          SELECT 
            memory_key as id,
            content,
            embedding,
            user_id,
            metadata,
            0.8 as similarity
          FROM user_memories
          WHERE embedding IS NOT NULL
        `;
        const params = [];
        let paramIndex = 1;
        
        if (userId) {
          query += ` AND user_id = $${paramIndex}`;
          params.push(userId);
          paramIndex++;
        }
        
        query += ` ORDER BY updated_at DESC LIMIT $${paramIndex}`;
        params.push(limit);
        
        const result = await client.query(query, params);
        
        console.log(`✅ pgvector getAllUserVectors found ${result.rows.length} results for user ${userId}`);
        
        return result.rows.map(row => {
          // 🔧 FIX: PostgreSQL returns vectors as strings, need to parse to array
          let embeddingArray = row.embedding;
          if (typeof row.embedding === 'string') {
            try {
              // Parse "[0.1,0.2,0.3]" → [0.1,0.2,0.3]
              embeddingArray = JSON.parse(row.embedding);
            } catch (e) {
              console.error(`❌ Failed to parse embedding for ${row.id}:`, e.message);
              embeddingArray = null;
            }
          }
          
          return {
            id: row.id,
            content: row.content,
            embedding: embeddingArray,
            userId: row.user_id,
            metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
            contentType: 'memory',
            similarity: 0.8 // Default for browsing
          };
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ pgvector getAllUserVectors failed:', error.message);
      return [];
    }
  }

  /**
   * 🔍 Get all user vectors for browsing (empty query support)
   */
  async getAllUserVectors(userId, contentTypes, limit = 10) {
    try {
      if (!this.indexLoaded || !this.index) {
        // Fallback to pgvector
        console.log('🔄 HNSW not loaded, using pgvector for getAllUserVectors');
        return await this.getAllUserVectorsPgvector(userId, contentTypes, limit);
      }

      // Check if we have any vectors
      if (this.vectorMetadata.size === 0) {
        // Silent - empty HNSW is normal, pgvector is primary
        return [];
      }
      
      const results = [];
      
      // Iterate through all vectors and filter by user and content type
      for (const [vectorId, metadata] of this.vectorMetadata.entries()) {
        // Apply user filter
        if (userId && metadata.userId !== userId) {
          continue;
        }
        
        // Apply content type filter
        if (contentTypes && contentTypes.length > 0) {
          const vectorContentType = metadata.contentType || 'memory';
          if (!contentTypes.includes(vectorContentType)) {
            continue;
          }
        }
        
        // Add to results with default similarity for browsing
        results.push({
          id: vectorId,
          content: metadata.content,
          similarity: 0.8, // Default similarity for browsing
          embedding: metadata.embedding,
          metadata: metadata.metadata,
          source: 'hnsw_browse'
        });
        
        // Stop when we have enough results
        if (results.length >= limit) {
          break;
        }
      }
      
      console.log(`✅ HNSW getAllUserVectors found ${results.length} vectors for user browsing`);
      return results;
      
    } catch (error) {
      console.error('❌ HNSW getAllUserVectors failed:', error);
      return [];
    }
  }

  /**
   * 🔍 Search pgvector directly (fallback when HNSW not available)
   */
  /**
   * 🧠 INTELLIGENT TEMPORAL STATE MANAGEMENT
   * 
   * SUPERSESSION (keep ONLY latest):
   * - emotion, location (current), profession (current), relationship_status, health_status
   * - Example: sad → happy → returns ONLY happy
   * 
   * ACCUMULATION (keep ALL):
   * - hobby, skill, family, friend, fear, like, dislike, preference, pet, goal, ambition
   * - location (past/future), studies (past/completed), profession (past)
   * - Example: hobby=painting, hobby=guitar → returns BOTH
   * 
   * EXCEPTION: Same entity with conflicting context → supersession
   * - hobby=painting (love it) → hobby=painting (quit) → returns ONLY quit
   */
  /**
   * 🎯 FIFO MEMORY DEGRADATION SYSTEM
   * Keeps 10 most recent memories per category
   * When 11th memory is added, oldest is removed (FIFO)
   * 
   * 🔒 IDENTITY PROTECTION: name/family/personal categories are EXEMPT from limits
   * These memories are always kept and boosted to the top of results
   */
  deduplicateByLatestState(memories) {
    if (!memories || memories.length === 0) return [];
    
    const MEMORIES_PER_CATEGORY = 10; // Keep 10 most recent per category
    
    // 🔒 PROTECTED CATEGORIES: Never delete these, always boost to top
    // 🎯 ALL CATEGORIES FROM MemoryCategoryRegistry.ts with priority tiers
    // 
    // TIER 1 (0.5): Core Personal Identity - WHO the user IS
    // TIER 2 (0.4): Relationships & Demographics - WHO they KNOW and WHERE they ARE  
    // TIER 3 (0.3): Preferences & Interests - WHAT they LIKE
    // TIER 4 (0.2): Goals & State - WHAT they WANT and HOW they FEEL
    // TIER 5 (0.1): Education & Research - WHAT they're LEARNING
    // TIER 6 (0.0): System/Internal - Behavioral patterns
    // TIER 7 (-0.2): Content chunks - Pollutes personal context
    
    const CATEGORY_PRIORITY_BOOSTS = {
      // ═══════════════════════════════════════════════════
      // TIER 1: CORE PERSONAL IDENTITY (boost: 0.5, PROTECTED)
      // ═══════════════════════════════════════════════════
      'name': 0.5,
      
      // ═══════════════════════════════════════════════════
      // TIER 2: RELATIONSHIPS & DEMOGRAPHICS (boost: 0.4, PROTECTED)
      // ═══════════════════════════════════════════════════
      'family': 0.4,
      'friend': 0.4,
      'colleague': 0.4,
      'location': 0.4,
      'profession': 0.4,
      'age': 0.4,
      'birthday': 0.4,
      'pet': 0.4,
      
      // ═══════════════════════════════════════════════════
      // TIER 3: PREFERENCES & INTERESTS (boost: 0.3, PROTECTED)
      // ═══════════════════════════════════════════════════
      'preference': 0.3,
      'hobby': 0.3,
      'interest': 0.3,
      'favorite': 0.3,
      'general': 0.3,  // Legacy data - may contain personal info!
      
      // ═══════════════════════════════════════════════════
      // TIER 4: GOALS & STATE (boost: 0.2, PROTECTED)
      // ═══════════════════════════════════════════════════
      'goal': 0.2,
      'plan': 0.2,
      'emotion': 0.2,
      'mood': 0.2,
      
      // ═══════════════════════════════════════════════════
      // TIER 5: EDUCATION & RESEARCH (boost: 0.1, NOT protected from FIFO)
      // ═══════════════════════════════════════════════════
      'education': 0.1,
      'course': 0.1,
      'learning_moment': 0.1,
      'research_insight': 0.1,
      'news_discovery': 0.1,
      
      // ═══════════════════════════════════════════════════
      // TIER 6: SYSTEM/INTERNAL (boost: 0.0, NOT protected)
      // ═══════════════════════════════════════════════════
      'cognitive': 0.0,
      'behavior': 0.0,
      'context': 0.0,
      
      // ═══════════════════════════════════════════════════
      // TIER 7: CONTENT (boost: -0.2, NOT protected, de-prioritized)
      // ═══════════════════════════════════════════════════
      'canvas_document': -0.2,
      'document': -0.2
    };
    
    // Categories with boost >= 0.2 are PROTECTED from FIFO deletion
    const PROTECTED_CATEGORIES = Object.entries(CATEGORY_PRIORITY_BOOSTS)
      .filter(([_, boost]) => boost >= 0.2)
      .map(([cat]) => cat);
    
    // 🎯 ALL personal key patterns that indicate protected memories
    const PROTECTED_KEYS = [
      // Names
      'user_name', 'my_name', 'name',
      // Family relations
      'wife', 'husband', 'spouse', 'partner',
      'mother', 'father', 'mom', 'dad', 'parent',
      'son', 'daughter', 'child', 'kid',
      'uncle', 'aunt', 'cousin', 'nephew', 'niece',
      'brother', 'sister', 'sibling',
      'grandfather', 'grandmother', 'grandpa', 'grandma',
      // Friends & Colleagues
      'friend', 'colleague', 'coworker',
      // Pets
      'pet', 'cat', 'dog',
      // Location
      'location', 'city', 'country', 'lives_in', 'from_',
      // Profession
      'profession', 'job', 'work', 'career', 'occupation',
      // Age
      'age', 'birthday', 'born',
      // Preferences
      'preference', 'prefer', 'favorite', 'favourite',
      // Hobbies & Interests
      'hobby', 'hobbies', 'interest', 'interests',
      // Goals
      'goal', 'aspiration', 'dream', 'plan'
    ];
    
    // Helper to get category boost for a memory
    const getCategoryBoost = (memory) => {
      const metadata = memory.metadata || {};
      const category = (metadata.category || '').toLowerCase();
      
      // Direct category match
      if (CATEGORY_PRIORITY_BOOSTS[category] !== undefined) {
        return CATEGORY_PRIORITY_BOOSTS[category];
      }
      
      // Check for partial matches (e.g., 'family_uncle' contains 'family')
      for (const [cat, boost] of Object.entries(CATEGORY_PRIORITY_BOOSTS)) {
        if (category.includes(cat)) {
          return boost;
        }
      }
      
      // Default boost for unknown/null/undefined categories (treat as legacy 'general')
      return 0.3;
    };
    
    // Helper to check if memory is protected (boost >= 0.2)
    const isProtectedMemory = (memory) => {
      const metadata = memory.metadata || {};
      const category = (metadata.category || '').toLowerCase();
      const memKey = (metadata.memoryKey || memory.id || '').toLowerCase();
      
      // Check by category
      const categoryProtected = PROTECTED_CATEGORIES.some(c => category.includes(c));
      
      // Check by key patterns
      const keyProtected = PROTECTED_KEYS.some(k => memKey.includes(k));
      
      // Also protect memories with null/undefined/empty category (legacy data)
      const isLegacy = !category || category === 'null' || category === 'undefined' || category === 'general';
      
      return categoryProtected || keyProtected || isLegacy;
    };
    
    // Separate protected memories from regular memories
    const protectedMemories = [];
    const regularMemories = [];
    
    for (const memory of memories) {
      // 🎯 Apply category boost to similarity score
      const boost = getCategoryBoost(memory);
      memory.categoryBoost = boost;
      memory.adjustedSimilarity = (memory.similarity || 0) + boost;
      
      if (isProtectedMemory(memory)) {
        protectedMemories.push(memory);
      } else {
        regularMemories.push(memory);
      }
    }
    
    console.log(`🔒 FIFO: Protected ${protectedMemories.length} personal memories from deletion (boost >= 0.2)`);
    
    // Group ONLY regular memories by category
    const categorized = new Map();
    
    for (const memory of regularMemories) {
      const metadata = memory.metadata || {};
      const category = metadata.category || 'unknown';
      
      if (!categorized.has(category)) {
        categorized.set(category, []);
      }
      
      categorized.get(category).push({
        memory,
        timestamp: this.extractTimestamp(memory.id, metadata)
      });
    }
    
    // For each category, keep only the 10 most recent (FIFO)
    const result = [];
    
    for (const [category, categoryMemories] of categorized.entries()) {
      // Sort by timestamp (newest first)
      categoryMemories.sort((a, b) => b.timestamp - a.timestamp);
      
      // Take top 10 (most recent)
      const kept = categoryMemories.slice(0, MEMORIES_PER_CATEGORY);
      
      if (kept.length < categoryMemories.length) {
        console.log(`🗑️ FIFO: ${category} had ${categoryMemories.length} memories, kept ${kept.length} most recent`);
      }
      
      // Add to result
      result.push(...kept.map(item => item.memory));
    }
    
    // 🎯 CRITICAL: Add ALL protected memories (protected from FIFO)
    // AND put them at the TOP of results (sorted by adjustedSimilarity)
    const combinedResult = [...protectedMemories, ...result];
    
    // 🎯 Sort combined results by adjustedSimilarity (includes category boost)
    combinedResult.sort((a, b) => (b.adjustedSimilarity || b.similarity || 0) - (a.adjustedSimilarity || a.similarity || 0));
    
    // 🔄 TRUE DEDUPLICATION: Keep only the LATEST version of each unique memoryKey
    // This fixes the issue where "family_uncle_ahmed" appears twice
    const deduplicatedMap = new Map();
    for (const memory of combinedResult) {
      const metadata = memory.metadata || {};
      const memKey = metadata.memoryKey || memory.id || '';
      const timestamp = this.extractTimestamp(memory.id, metadata);
      
      // If we haven't seen this key, or this is newer, keep it
      if (!deduplicatedMap.has(memKey) || deduplicatedMap.get(memKey).timestamp < timestamp) {
        deduplicatedMap.set(memKey, { memory, timestamp });
      }
    }
    
    const deduplicatedResult = Array.from(deduplicatedMap.values()).map(item => item.memory);
    console.log(`🔄 Deduplicated by key: ${combinedResult.length} → ${deduplicatedResult.length} unique memories`);
    
    // 🎯 Sort by adjustedSimilarity (includes category boosts)
    // Higher boost = higher in results (identity/personal at top)
    deduplicatedResult.sort((a, b) => {
      const simA = a.adjustedSimilarity || a.similarity || 0;
      const simB = b.adjustedSimilarity || b.similarity || 0;
      
      // Sort by adjusted similarity (which includes category boost)
      if (Math.abs(simB - simA) > 0.01) return simB - simA;
      
      // Tie-breaker: More recent first
      const metaA = a.metadata || {};
      const metaB = b.metadata || {};
      const timeA = this.extractTimestamp(a.id, metaA);
      const timeB = this.extractTimestamp(b.id, metaB);
      return timeB - timeA;
    });
    
    console.log(`✅ FIFO system: ${memories.length} → ${deduplicatedResult.length} memories (${protectedMemories.length} personal protected, max ${MEMORIES_PER_CATEGORY} per other category)`);
    
    return deduplicatedResult;
  }
  
  /**
   * Extract timestamp from memory ID or metadata
   */
  extractTimestamp(id, metadata) {
    // Try to extract from metadata first
    if (metadata?.timestamp) {
      return typeof metadata.timestamp === 'number' ? metadata.timestamp : new Date(metadata.timestamp).getTime();
    }
    if (metadata?.storedAt) {
      return new Date(metadata.storedAt).getTime();
    }
    if (metadata?.created_at) {
      return new Date(metadata.created_at).getTime();
    }
    
    // Try to extract timestamp from ID (format: userId_key_timestamp)
    const parts = id.split('_');
    const lastPart = parts[parts.length - 1];
    const possibleTimestamp = parseInt(lastPart);
    if (!isNaN(possibleTimestamp) && possibleTimestamp > 1000000000000) {
      return possibleTimestamp;
    }
    
    // Fallback: return 0 (will be treated as oldest)
    return 0;
  }

  async searchPgvector(queryEmbedding, k = 10, userId, contentTypes, options = {}) {
    try {
      let poolInstance;
      
      if (this.databaseManager && this.databaseManager.pool) {
        poolInstance = this.databaseManager.pool;
      } else {
        const dbModule = require('../../services/database.cjs');
        poolInstance = dbModule.pool ? (typeof dbModule.pool === 'function' ? dbModule.pool() : dbModule.pool) : null;
      }
      
      if (!poolInstance) {
        console.warn('⚠️ No database pool available for pgvector search');
        return [];
      }

      const client = await poolInstance.connect();
      
      try {
        // Convert embedding to pgvector format
        const queryVector = `[${queryEmbedding.join(',')}]`;
        
        // 🎯 SMART EXCLUSIONS: By default, exclude learning moments for personal queries
        // Include them ONLY when explicitly requested (learning-related queries)
        const excludeCategories = options.excludeCategories || [];
        const includeLearningMoments = options.includeLearningMoments || false;
        
        // 🎯 CATEGORY FILTERING: When categories array is provided, ONLY return those categories
        // This is the CORRECT approach - filter at SQL level, not boost after retrieval!
        const includeCategories = options.categories || [];
        
        // 🎯 SQL-LEVEL CATEGORY BOOSTS: Apply hierarchical boosts in ORDER BY
        // This ensures family memories (0.67 + 0.4 = 1.07) rank above courses (0.82 + 0.1 = 0.92)
        // BEFORE the LIMIT is applied - no need to retrieve thousands of results!
        //
        // TIER 1 (0.5): name - Core identity
        // TIER 2 (0.4): family, friend, colleague, location, profession, age, birthday, pet
        // TIER 3 (0.3): preference, hobby, interest, favorite, general (legacy)
        // TIER 4 (0.2): goal, plan, emotion, mood
        // TIER 5 (0.1): education, course, learning_moment, research_insight, news_discovery
        // TIER 6 (0.0): cognitive, behavior, context
        // TIER 7 (-0.2): canvas_document, document
        
        let query = `
          SELECT 
            memory_key as id,
            content,
            embedding,
            user_id,
            metadata,
            1 - (embedding <=> $1::vector) as similarity,
            -- 🎯 SQL-LEVEL CATEGORY BOOST CALCULATION
            CASE 
              -- TIER 1: Core Identity (boost 0.5) - Match user_name, my_name, name_, etc.
              WHEN LOWER(COALESCE(metadata->>'category', '')) = 'name' THEN 0.5
              WHEN memory_key ILIKE '%user_name%' THEN 0.5
              WHEN memory_key ILIKE '%my_name%' THEN 0.5
              WHEN memory_key ILIKE 'name_%' AND memory_key NOT ILIKE '%course%' THEN 0.5
              WHEN memory_key ILIKE '%identity%' AND memory_key NOT ILIKE '%course%' THEN 0.5
              
              -- TIER 2: Relationships & Demographics (boost 0.4)
              WHEN LOWER(COALESCE(metadata->>'category', '')) IN ('family', 'friend', 'colleague', 'location', 'profession', 'age', 'birthday', 'pet') THEN 0.4
              WHEN memory_key ILIKE '%family%' OR memory_key ILIKE '%uncle%' OR memory_key ILIKE '%aunt%' 
                   OR memory_key ILIKE '%wife%' OR memory_key ILIKE '%husband%' OR memory_key ILIKE '%mother%'
                   OR memory_key ILIKE '%father%' OR memory_key ILIKE '%brother%' OR memory_key ILIKE '%sister%'
                   OR memory_key ILIKE '%cousin%' OR memory_key ILIKE '%friend%' OR memory_key ILIKE '%pet%'
                   OR memory_key ILIKE '%colleague%' OR memory_key ILIKE '%coworker%' OR memory_key ILIKE 'assistant_%'
                   OR memory_key ILIKE '%location%' OR memory_key ILIKE '%profession%' THEN 0.4
              
              -- TIER 3: Preferences & Interests + Legacy (boost 0.3)
              WHEN LOWER(COALESCE(metadata->>'category', '')) IN ('preference', 'hobby', 'interest', 'favorite', 'general') THEN 0.3
              WHEN COALESCE(metadata->>'category', '') = '' OR metadata->>'category' IS NULL THEN 0.3  -- Legacy null category
              WHEN memory_key ILIKE '%preference%' OR memory_key ILIKE '%hobby%' OR memory_key ILIKE '%interest%' THEN 0.3
              
              -- TIER 4: Goals & State (boost 0.2)
              WHEN LOWER(COALESCE(metadata->>'category', '')) IN ('goal', 'plan', 'emotion', 'mood') THEN 0.2
              
              -- TIER 5: Education (boost 0.1)
              WHEN LOWER(COALESCE(metadata->>'category', '')) IN ('education', 'course', 'learning_moment', 'research_insight', 'news_discovery') THEN 0.1
              WHEN memory_key ILIKE 'course_%' THEN 0.1
              
              -- TIER 6: System (boost 0.0)
              WHEN LOWER(COALESCE(metadata->>'category', '')) IN ('cognitive', 'behavior', 'context') THEN 0.0
              
              -- TIER 7: Content (boost -0.2)
              WHEN LOWER(COALESCE(metadata->>'category', '')) IN ('canvas_document', 'document') THEN -0.2
              
              -- Default: Unknown categories get 0.2
              ELSE 0.2
            END as category_boost,
            -- 🎯 ADJUSTED SIMILARITY = raw similarity + category boost
            (1 - (embedding <=> $1::vector)) + 
            CASE 
              -- TIER 1: Core Identity (boost 0.5) - Match user_name, my_name, name_, etc.
              WHEN LOWER(COALESCE(metadata->>'category', '')) = 'name' THEN 0.5
              WHEN memory_key ILIKE '%user_name%' THEN 0.5
              WHEN memory_key ILIKE '%my_name%' THEN 0.5
              WHEN memory_key ILIKE 'name_%' AND memory_key NOT ILIKE '%course%' THEN 0.5
              WHEN memory_key ILIKE '%identity%' AND memory_key NOT ILIKE '%course%' THEN 0.5
              WHEN LOWER(COALESCE(metadata->>'category', '')) IN ('family', 'friend', 'colleague', 'location', 'profession', 'age', 'birthday', 'pet') THEN 0.4
              WHEN memory_key ILIKE '%family%' OR memory_key ILIKE '%uncle%' OR memory_key ILIKE '%aunt%' 
                   OR memory_key ILIKE '%wife%' OR memory_key ILIKE '%husband%' OR memory_key ILIKE '%mother%'
                   OR memory_key ILIKE '%father%' OR memory_key ILIKE '%brother%' OR memory_key ILIKE '%sister%'
                   OR memory_key ILIKE '%cousin%' OR memory_key ILIKE '%friend%' OR memory_key ILIKE '%pet%'
                   OR memory_key ILIKE '%colleague%' OR memory_key ILIKE '%coworker%' OR memory_key ILIKE 'assistant_%'
                   OR memory_key ILIKE '%location%' OR memory_key ILIKE '%profession%' THEN 0.4
              WHEN LOWER(COALESCE(metadata->>'category', '')) IN ('preference', 'hobby', 'interest', 'favorite', 'general') THEN 0.3
              WHEN COALESCE(metadata->>'category', '') = '' OR metadata->>'category' IS NULL THEN 0.3
              WHEN memory_key ILIKE '%preference%' OR memory_key ILIKE '%hobby%' OR memory_key ILIKE '%interest%' THEN 0.3
              WHEN LOWER(COALESCE(metadata->>'category', '')) IN ('goal', 'plan', 'emotion', 'mood') THEN 0.2
              WHEN LOWER(COALESCE(metadata->>'category', '')) IN ('education', 'course', 'learning_moment', 'research_insight', 'news_discovery') THEN 0.1
              WHEN memory_key ILIKE 'course_%' THEN 0.1
              WHEN LOWER(COALESCE(metadata->>'category', '')) IN ('cognitive', 'behavior', 'context') THEN 0.0
              WHEN LOWER(COALESCE(metadata->>'category', '')) IN ('canvas_document', 'document') THEN -0.2
              ELSE 0.2
            END as adjusted_similarity
          FROM user_memories
          WHERE embedding IS NOT NULL
        `;
        const params = [queryVector];
        let paramIndex = 2;
        
        if (userId) {
          query += ` AND user_id = $${paramIndex}`;
          params.push(userId);
          paramIndex++;
        }
        
        // 🔥 EXCLUDE learning moments by default (they have their own delivery channel)
        if (!includeLearningMoments) {
          query += ` AND memory_key NOT LIKE '%learning_moment%'`;
        }
        
        // Exclude additional categories if specified
        for (const category of excludeCategories) {
          const catLower = category.toLowerCase();
          query += ` AND (metadata->>'category' IS NULL OR LOWER(metadata->>'category') != '${catLower}')`;
          query += ` AND memory_key NOT LIKE '${catLower}_%'`;
        }
        
        // 🎯 INCLUDE SPECIFIC CATEGORIES: When asking about family, ONLY get family memories!
        // This is the CORRECT approach - filter at SQL level, not boost after retrieval
        if (includeCategories && includeCategories.length > 0) {
          const categoryConditions = includeCategories.map(cat => {
            const catLower = cat.toLowerCase();
            // Match by metadata category OR by memory_key patterns (comprehensive for legacy data!)
            // Each category needs SPECIFIC key patterns that actually exist in the database
            
            // Special expanded patterns for each category
            const keyPatternMap = {
              'name': [
                "memory_key ILIKE '%user_name%'",
                "memory_key ILIKE '%my_name%'", 
                "memory_key ILIKE 'name_%'",
                "memory_key ILIKE '%_name_%'",
                "memory_key ILIKE '%called%'",
                "memory_key ILIKE '%identity%'"
              ],
              'family': [
                "memory_key ILIKE 'family_%'",
                "memory_key ILIKE '%_family_%'",
                "memory_key ILIKE '%uncle%'",
                "memory_key ILIKE '%aunt%'",
                "memory_key ILIKE '%mother%'",
                "memory_key ILIKE '%father%'",
                "memory_key ILIKE '%brother%'",
                "memory_key ILIKE '%sister%'",
                "memory_key ILIKE '%wife%'",
                "memory_key ILIKE '%husband%'",
                "memory_key ILIKE '%spouse%'",
                "memory_key ILIKE '%son%'",
                "memory_key ILIKE '%daughter%'",
                "memory_key ILIKE '%cousin%'",
                "memory_key ILIKE '%grandma%'",
                "memory_key ILIKE '%grandpa%'",
                "memory_key ILIKE '%grandmother%'",
                "memory_key ILIKE '%grandfather%'",
                "memory_key ILIKE '%parent%'"
              ],
              'friend': [
                "memory_key ILIKE 'friend_%'",
                "memory_key ILIKE '%_friend_%'",
                "memory_key ILIKE '%friendship%'"
              ],
              'pet': [
                "memory_key ILIKE 'pet_%'",
                "memory_key ILIKE '%_pet_%'",
                "memory_key ILIKE '%dog_%'",
                "memory_key ILIKE '%cat_%'"
              ],
              'location': [
                "memory_key ILIKE 'location_%'",
                "memory_key ILIKE '%_location_%'",
                "memory_key ILIKE '%lives_in%'",
                "memory_key ILIKE '%city_%'",
                "memory_key ILIKE '%country_%'"
              ],
              'profession': [
                "memory_key ILIKE 'profession_%'",
                "memory_key ILIKE '%_profession_%'",
                "memory_key ILIKE '%job_%'",
                "memory_key ILIKE '%work_%'",
                "memory_key ILIKE '%career_%'",
                "memory_key ILIKE '%occupation_%'"
              ],
              'general': [
                "memory_key ILIKE 'general_%'",
                "memory_key ILIKE 'unified_%'",
                "(COALESCE(metadata->>'category', '') = '' OR metadata->>'category' IS NULL)"
              ]
            };
            
            const keyPatterns = keyPatternMap[catLower] || [`memory_key ILIKE '${catLower}_%'`];
            const metaCondition = `LOWER(COALESCE(metadata->>'category', '')) = '${catLower}'`;
            const keyConditions = keyPatterns.join(' OR ');
            
            return `(${metaCondition} OR ${keyConditions})`;
          }).join(' OR ');
          query += ` AND (${categoryConditions})`;
          console.log(`🎯 SQL CATEGORY FILTER: Restricting to categories: ${includeCategories.join(', ')}`);
        }
        
        // 🎯 CONVERSATION ID FILTER: Only return canvas documents from the CURRENT conversation
        // This prevents documents from one chat appearing in another chat
        const conversationId = options.conversationId;
        if (conversationId) {
          query += ` AND (metadata->>'conversationId' = '${conversationId}' OR metadata->>'conversationId' IS NULL)`;
          console.log(`🎯 SQL CONVERSATION FILTER: Restricting to conversation: ${conversationId}`);
        }
        
        // 🎯 ORDER BY ADJUSTED SIMILARITY (includes category boost!)
        // Family (0.67 raw + 0.4 boost = 1.07) will rank above courses (0.82 raw + 0.1 boost = 0.92)
        const expandedLimit = Math.max(k * 3, 100); // Reasonable limit - boosts applied at SQL level
        query += ` ORDER BY adjusted_similarity DESC LIMIT $${paramIndex}`;
        params.push(expandedLimit);
        
        const result = await client.query(query, params);
        
        // Debug: Show what userIds actually exist in the database
        const userIdsInDb = await client.query(`
          SELECT DISTINCT user_id, COUNT(*) as count 
          FROM user_memories 
          WHERE embedding IS NOT NULL 
          GROUP BY user_id
        `);
        console.log(`🔍 DEBUG: user_ids in database:`, userIdsInDb.rows.map(r => `${r.user_id} (${r.count} memories)`).join(', '));
        
        console.log(`✅ pgvector search found ${result.rows.length} results for userId=${userId}`);
        
        const allMemories = result.rows.map(row => {
          // 🔧 FIX: PostgreSQL returns vectors as strings, need to parse to array
          let embeddingArray = row.embedding;
          if (typeof row.embedding === 'string') {
            try {
              // Parse "[0.1,0.2,0.3]" → [0.1,0.2,0.3]
              embeddingArray = JSON.parse(row.embedding);
            } catch (e) {
              console.error(`❌ Failed to parse embedding for ${row.id}:`, e.message);
              embeddingArray = null;
            }
          }
          
          return {
            id: row.id,
            content: row.content,
            embedding: embeddingArray,
            userId: row.user_id,
            metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
            contentType: 'memory',
            similarity: parseFloat(row.similarity),
            // 🎯 SQL-calculated boosts (already applied in ORDER BY)
            categoryBoost: parseFloat(row.category_boost || 0),
            adjustedSimilarity: parseFloat(row.adjusted_similarity || row.similarity)
          };
        });
        
        // 🧠 TEMPORAL STATE MANAGEMENT: Keep only latest state per entity
        // This also applies identity boosting - identity memories go to TOP
        const deduplicated = this.deduplicateByLatestState(allMemories);
        console.log(`🔄 Deduplicated: ${result.rows.length} → ${deduplicated.length} (keeping latest states)`);
        
        // 🎯 NOW apply the actual requested limit (after identity boosting)
        const finalResults = deduplicated.slice(0, k);
        console.log(`✅ Final results: ${finalResults.length} (requested ${k})`);
        
        return finalResults;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ pgvector search failed:', error.message);
      return [];
    }
  }

  /**
   * 🔍 Perform HNSW search
   * @param options.includeLearningMoments - Set true for learning-related queries
   * @param options.excludeCategories - Array of categories to exclude from results
   */
  async search(queryEmbedding, k = 10, userId, contentTypes, options = {}) {
    // 🔧 FALLBACK: If HNSW not loaded, use pgvector directly
    if (!this.hnswEnabled || !this.indexLoaded || !this.index) {
      console.log('🔄 HNSW not loaded, using pgvector for search');
      return await this.searchPgvector(queryEmbedding, k, userId, contentTypes, options);
    }

    try {
      // Silent check - HNSW is optional layer
      if (this.vectorMetadata.size === 0) {
        return [];
      }
      
      // Perform HNSW search
      const hnswResults = this.index.searchKnn(queryEmbedding, Math.min(k * 3, 100));
      const results = [];
      
      for (const result of hnswResults.neighbors) {
        const vectorId = this.vectorIdMap.get(result);
        if (!vectorId) continue;

        const metadata = this.vectorMetadata.get(vectorId);
        if (!metadata) continue;

        // Apply filters
        if (userId && metadata.userId !== userId) continue;
        if (contentTypes && contentTypes.length > 0 && !contentTypes.includes(metadata.contentType || 'knowledge')) continue;

        const similarity = 1 - hnswResults.distances[hnswResults.neighbors.indexOf(result)];
        
        results.push({
          id: vectorId,
          content: metadata.content,
          similarity,
          embedding: metadata.embedding,
          metadata: metadata.metadata,
          source: 'hnsw'
        });

        if (results.length >= k) break;
      }
      return results;
      
    } catch (error) {
      console.error('❌ HNSW search failed:', error);
      return [];
    }
  }

  /**
   * 💾 Save HNSW index to PostgreSQL
   */
  async saveIndex() {
    if (!this.indexLoaded || !this.index || !this.indexDirty) {
      return; // Nothing to save
    }

    try {
      console.log('💾 Saving HNSW index to PostgreSQL...');

      // Write index to temporary file
      this.index.writeIndexSync(this.tempIndexPath);
      
      // Read binary data
      const indexBuffer = fs.readFileSync(this.tempIndexPath);
      const vectorCount = this.vectorMetadata.size;

      // Save to PostgreSQL (if available)
      let poolInstance;
      
      if (this.databaseManager && this.databaseManager.pool) {
        // this.databaseManager.pool is already the Pool instance
        poolInstance = this.databaseManager.pool;
      } else {
        const dbModule = require('../../services/database.cjs');
        // dbModule.pool is a function that returns the Pool instance
        poolInstance = dbModule.pool ? (typeof dbModule.pool === 'function' ? dbModule.pool() : dbModule.pool) : null;
      }
      
      if (poolInstance) {
        const client = await poolInstance.connect();
        
        try {
          await client.query(`
            INSERT INTO hnswlib_indices 
            (name, index_data, vector_count, dimension, updated_at) 
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (name) DO UPDATE 
            SET index_data = $2, vector_count = $3, updated_at = NOW()
          `, ['main', indexBuffer, vectorCount, 768]);
        } finally {
          client.release();
        }
      } else {
        console.log('⚠️ HNSW: No database connection, index not persisted');
      }

      this.indexDirty = false;
      console.log(`✅ Saved HNSW index (${vectorCount} vectors, ${(indexBuffer.length / 1024 / 1024).toFixed(2)}MB)`);
      
    } catch (error) {
      console.error('❌ Failed to save HNSW index:', error);
    }
  }

  /**
   * ⏰ Set up automatic saving
   */
  setupAutoSave() {
    // Save index every hour
    this.autoSaveInterval = setInterval(() => {
      this.saveIndex();
    }, 60 * 60 * 1000); // 1 hour

    // Save on process exit
    process.on('SIGINT', () => this.saveIndex());
    process.on('SIGTERM', () => this.saveIndex());
  }

  /**
   * 📊 Get index statistics
   */
  getStats() {
    return {
      loaded: this.indexLoaded,
      vectorCount: this.vectorMetadata.size,
      capacity: 100000,
      memoryUsage: this.indexLoaded ? `~${(this.vectorMetadata.size * 6.5 / 1024).toFixed(1)}KB` : '0KB'
    };
  }

  /**
   * 🧹 Cleanup resources
   */
  async cleanup() {
    try {
      await this.saveIndex();
      
      if (this.autoSaveInterval) {
        clearInterval(this.autoSaveInterval);
      }

      // Clean up temp file
      if (fs.existsSync(this.tempIndexPath)) {
        fs.unlinkSync(this.tempIndexPath);
      }

      console.log('✅ HNSW cleanup completed');
      
    } catch (error) {
      console.error('❌ HNSW cleanup failed:', error);
    }
  }

  /**
   * ✅ Check if HNSW is available
   */
  isAvailable() {
    return this.indexLoaded && this.index !== null;
  }
}

// Export singleton instance
const hnswVectorSearchService = HNSWVectorSearchService.getInstance();

module.exports = {
  HNSWVectorSearchService,
  hnswVectorSearchService
};
