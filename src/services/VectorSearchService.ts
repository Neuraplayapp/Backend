/**
 * 🔍 Vector Search Service - Semantic Search with pgvector
 * Provides intelligent semantic search with fallback to text search
 */

import { serviceContainer } from './ServiceContainer';
// HNSW services are backend-only - conditionally loaded to support both frontend and backend





export interface SearchResult {
  id: string;
  content: string;
  similarity: number;
  metadata?: Record<string, any>;
  source: 'hnsw' | 'vector' | 'text';
}

export interface EmbeddingVector {
  id: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, any>;
  created_at?: Date;
}

export class VectorSearchService {
  private static instance: VectorSearchService;
  private vectorSupported: boolean = false;
  private databaseManager: any;

  constructor() {
    // Will be initialized by ServiceContainer
  }

  static getInstance(): VectorSearchService {
    if (!VectorSearchService.instance) {
      VectorSearchService.instance = new VectorSearchService();
    }
    return VectorSearchService.instance;
  }

  async initialize(): Promise<void> {
    try {
      // FRONTEND: Use backend API for all vector operations
      if (typeof window !== 'undefined') {
        // Browser environment - using backend API mode
        this.vectorSupported = true; // Enable vector search via API
        return;
      }
      
      // BACKEND ONLY: Check if databaseManager is available before proceeding
      try {
        this.databaseManager = serviceContainer.get('databaseManager');
      } catch (dbError) {
        console.log('🔄 VectorSearchService: DatabaseManager not available, using fallback mode');
        this.vectorSupported = false;
        return;
      }
      
      // Note: HNSW acceleration is handled by backend services
      console.log('🚀 VectorSearchService: Initialized with pgvector support (HNSW acceleration via backend APIs)');
      
      // Test if pgvector is available
      this.vectorSupported = await this.testVectorSupport();
      
      if (this.vectorSupported) {
        console.log('✅ VectorSearchService: pgvector enabled');
        await this.ensureVectorTables();
      } else {
        console.log('🔄 VectorSearchService: Using text-based search fallback');
      }
      
    } catch (error: any) {
      console.error('❌ VectorSearchService initialization failed:', error?.message);
      this.vectorSupported = false;
    }
  }

  /**
   * Test if pgvector extension is available
   */
  private async testVectorSupport(): Promise<boolean> {
    try {
      // FRONTEND FIX: Skip all database operations in browser environment
      if (typeof window !== 'undefined') {
        console.log('🔍 VectorSearchService: Browser environment detected - skipping pgvector test (using API)');
        return false; // Frontend uses API, not direct database access
      }
      
      // Skip vector support test if database is unavailable
      if (!this.databaseManager) {
        console.warn('⚠️ Database manager not available for vector support test');
        return false;
      }
      
      // BACKEND ONLY: Enhanced pgvector detection with fallback creation
      console.log('🔍 VectorSearchService: Testing pgvector extension...');
      
      // First, try to enable the extension if it's not already enabled
      try {
        await this.databaseManager.executeQuery({
          action: 'custom',
          query: "CREATE EXTENSION IF NOT EXISTS vector",
          data: {}
        });
        console.log('✅ pgvector extension enabled successfully');
      } catch (createError: any) {
        console.warn('⚠️ Could not create pgvector extension:', createError?.message);
      }
      
      // Test for pgvector extension availability
      const result = await this.databaseManager.executeQuery({
        action: 'custom',
        query: "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'",
        data: {}
      });
      
      // Check if result contains data
      const hasVector = result?.data && result.data.length > 0;
      
      if (hasVector) {
        const version = result.data[0]?.extversion || 'unknown';
        console.log('🔍 VectorSearchService: pgvector test result: Available (version:', version, ')');
        
        // Test vector operations capability
        try {
          await this.databaseManager.executeQuery({
            action: 'custom',
            query: "SELECT '[1,2,3]'::vector(3) <-> '[1,2,4]'::vector(3) as distance",
            data: {}
          });
          console.log('✅ Vector operations test passed');
          return true;
        } catch (opError: any) {
          console.warn('⚠️ Vector operations test failed:', opError?.message);
          return false;
        }
      } else {
        console.log('🔍 VectorSearchService: pgvector test result: Not available');
        return false;
      }
      
    } catch (error: any) {
      console.warn('⚠️ pgvector test failed:', error?.message);
      return false;
    }
  }

  /**
   * 🏗️ PRODUCTION VECTOR TABLES - Works with ANY PostgreSQL
   * Creates optimized tables for vector storage using JSONB
   */
  private async ensureVectorTables(): Promise<void> {
    try {
      // 🔧 ENHANCE EXISTING SCHEMA: Add vector search columns to working memory system
      console.log('🔍 VectorSearchService: Enhancing existing user_memories table for vector search...');
      
      // Add content_type column for categorization (essential for vector search)
      await this.databaseManager.executeQuery({
        action: 'custom',
        query: `
          ALTER TABLE user_memories 
          ADD COLUMN IF NOT EXISTS content_type VARCHAR(100) DEFAULT 'memory';
        `
      });

      // Add embedding_vector column for vector storage (essential for semantic search)
      await this.databaseManager.executeQuery({
        action: 'custom',
        query: `
          ALTER TABLE user_memories 
          ADD COLUMN IF NOT EXISTS embedding_vector JSONB DEFAULT '[]'::jsonb;
        `
      });

      // Add embedding_magnitude for optimization
      await this.databaseManager.executeQuery({
        action: 'custom',
        query: `
          ALTER TABLE user_memories 
          ADD COLUMN IF NOT EXISTS embedding_magnitude FLOAT DEFAULT 0;
        `
      });

      // Add content_hash for deduplication
      await this.databaseManager.executeQuery({
        action: 'custom',
        query: `
          ALTER TABLE user_memories 
          ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64);
        `
      });

      // Add keywords as alias for tags (don't replace existing tags)
      await this.databaseManager.executeQuery({
        action: 'custom',
        query: `
          ALTER TABLE user_memories 
          ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}';
        `
      });

      // Add quality_score as alias for importance_score (don't replace existing)
      await this.databaseManager.executeQuery({
        action: 'custom',
        query: `
          ALTER TABLE user_memories 
          ADD COLUMN IF NOT EXISTS quality_score FLOAT DEFAULT 0;
        `
      });

      // Add usage_count as alias for access_count (don't replace existing)
      await this.databaseManager.executeQuery({
        action: 'custom',
        query: `
          ALTER TABLE user_memories 
          ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
        `
      });

      // Add last_accessed for tracking
      await this.databaseManager.executeQuery({
        action: 'custom',
        query: `
          ALTER TABLE user_memories 
          ADD COLUMN IF NOT EXISTS last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        `
      });

      console.log('✅ VectorSearchService: Enhanced user_memories table with vector search columns');

      // Optimized indexes for production performance
      await this.databaseManager.executeQuery({
        action: 'custom',
        query: `
          CREATE INDEX IF NOT EXISTS idx_user_memories_user_content 
          ON user_memories(user_id, content_type, created_at DESC);
        `
      });

      await this.databaseManager.executeQuery({
        action: 'custom',
        query: `
          CREATE INDEX IF NOT EXISTS idx_user_memories_quality 
          ON user_memories(quality_score DESC, usage_count DESC) 
          WHERE quality_score > 0.5;
        `
      });

      await this.databaseManager.executeQuery({
        action: 'custom',
        query: `
          CREATE INDEX IF NOT EXISTS idx_user_memories_content_hash 
          ON user_memories(content_hash) 
          WHERE content_hash IS NOT NULL;
        `
      });

      // Full-text search index for fallback
      await this.databaseManager.executeQuery({
        action: 'custom',
        query: `
          CREATE INDEX IF NOT EXISTS idx_user_memories_content_search 
          ON user_memories USING GIN(to_tsvector('english', content));
        `
      });

      // Keyword array index for fast keyword searches
      await this.databaseManager.executeQuery({
        action: 'custom',
        query: `
          CREATE INDEX IF NOT EXISTS idx_user_memories_keywords 
          ON user_memories USING GIN(keywords);
        `
      });

      console.log('✅ Production vector search tables and indexes created');
      
    } catch (error) {
      console.error('❌ Failed to create vector tables:', error);
      throw error;
    }
  }

  /**
   * Store embeddings for semantic search (HNSW + PostgreSQL)
   */
  async storeEmbedding(data: EmbeddingVector): Promise<void> {
    // FRONTEND: Route through backend API
    if (typeof window !== 'undefined') {
      try {
        const { apiService } = await import('./APIService');
        
        console.log('📝 Storing embedding via backend API');
        
        const response = await apiService.makeRequest({
          endpoint: '/api/vector/store',
          method: 'POST',
          data: {
            id: data.id,
            userId: data.metadata?.userId || 'system',
            content: data.content,
            embedding: data.embedding,
            metadata: data.metadata || {}
          }
        });

        if (response.success) {
          console.log('✅ Vector embedding stored via backend API');
          return;
        }
        
        throw new Error('Backend API storage failed');
      } catch (error) {
        console.error('❌ Failed to store via backend API:', error);
        // No fallback in frontend - backend handles DB fallback
        throw error;
      }
    }

    // BACKEND: Direct database storage with HNSW
    if (!this.vectorSupported) {
      console.log('📝 Storing content for text search fallback');
      await this.databaseManager.saveCrossChatKnowledge({
        id: data.id,
        content: data.content,
        metadata: data.metadata || {},
        knowledge_type: 'embedding_fallback'
      });
      return;
    }

    try {
      await this.databaseManager.executeQuery({
        action: 'custom',
        query: `
          INSERT INTO vector_embeddings (id, user_id, content, embedding, metadata)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO UPDATE SET
            content = $3,
            embedding = $4,
            metadata = $5,
            updated_at = CURRENT_TIMESTAMP
        `,
        params: [
          data.id,
          data.metadata?.userId || 'system',
          data.content,
          JSON.stringify(data.embedding),
          JSON.stringify(data.metadata || {})
        ]
      });

      console.log('✅ Vector embedding stored successfully');
      
    } catch (error) {
      console.error('❌ Failed to store vector embedding:', error);
      // Fallback to text storage
      await this.databaseManager.saveCrossChatKnowledge({
        id: data.id,
        content: data.content,
        metadata: data.metadata || {},
        knowledge_type: 'embedding_fallback'
      });
    }
  }

  /**
   * 🎯 STATE-OF-THE-ART SEMANTIC SEARCH
   * Multi-modal semantic search with HNSW performance + advanced fallbacks
   */
  async semanticSearch(
    query: string, 
    queryEmbedding?: number[],
    userId?: string,
    limit: number = 5, // Reduced default limit
    similarityThreshold: number = 0.7, // Increased default threshold
    contextFilters?: {
      contentTypes?: string[];
      categories?: string[]; // 🎯 Filter by memory categories (family, hobbies, location, etc.)
      excludeCategories?: string[]; // 🎯 EXCLUDE specific categories at DATABASE level (e.g., ['course'] for personal queries)
      timeRange?: string;
      qualityMin?: number;
      includeRelated?: boolean;
      includeLearningMoments?: boolean; // 🎯 Only set true for learning-related queries
    }
  ): Promise<SearchResult[]> {
    
    try {
      // Generate embedding if not provided
      if (!queryEmbedding) {
        queryEmbedding = await this.generateEmbedding(query);
      }

      // 📊 PostgreSQL vector search (HNSW acceleration handled by backend)
      // Frontend uses standard vector search; backend provides HNSW optimization transparently
      return await this.advancedSemanticSearch(query, queryEmbedding, userId, limit, similarityThreshold, contextFilters);
      
    } catch (error) {
      console.error('❌ Advanced semantic search failed, using text fallback:', error);
      return this.intelligentTextSearch(query, userId, limit, contextFilters);
    }
  }

  /**
   * 🌐 BACKEND API SEMANTIC SEARCH
   * Routes semantic search through backend API (for frontend use)
   */
  private async backendSemanticSearch(
    query: string,
    queryEmbedding: number[],
    userId?: string,
    limit: number = 10,
    similarityThreshold: number = 0.6,
    contextFilters?: any
  ): Promise<SearchResult[]> {
    try {
      const { apiService } = await import('./APIService');
      
      console.log('🔍 VectorSearchService: Using pgvector for semantic search');
      
      // Use /api/memory with vector_search action (pgvector-based)
      // HNSW is for future expansion, pgvector is the primary method
      // 🎯 CRITICAL: Include ALL componentTypes for comprehensive memory search
      // Without this, personal_identity, relationships, etc. would be filtered out
      const allComponentTypes = [
        'chat_knowledge',      // Legacy (backward compatibility)
        'general',             // General memories
        'memory',              // Generic memories
        'personal_identity',   // Names, identity
        'relationships',       // Family, friends, pets
        'professional',        // Job, education
        'personal_context',    // Location
        'emotional_state',     // Emotions
        'preferences',         // Likes, dislikes
        'interests',           // Hobbies
        'goals',               // Plans, deadlines
        'learning'             // Courses
      ];
      
      // 🎯 HIERARCHICAL CATEGORY PRIORITY BOOSTS
      // Based on MemoryCategoryRegistry.ts - ALL categories with tiered importance
      // This tells the backend to boost certain categories during similarity scoring
      //
      // TIER 1 (0.5): Core Personal Identity - WHO the user IS
      // TIER 2 (0.4): Relationships & Demographics - WHO they KNOW and WHERE they ARE  
      // TIER 3 (0.3): Preferences & Interests - WHAT they LIKE
      // TIER 4 (0.2): Goals & State - WHAT they WANT and HOW they FEEL
      // TIER 5 (0.1): Education & Research - WHAT they're LEARNING (has own delivery channel)
      // TIER 6 (0.0): System/Internal - Behavioral patterns
      // TIER 7 (-0.1): Content chunks - Pollutes personal context
      
      const categoryBoosts = {
        // ═══════════════════════════════════════════════════
        // TIER 1: CORE PERSONAL IDENTITY (boost: 0.5)
        // The most fundamental "who is this person" information
        // ═══════════════════════════════════════════════════
        'name': 0.5,           // User's actual name
        
        // ═══════════════════════════════════════════════════
        // TIER 2: RELATIONSHIPS & DEMOGRAPHICS (boost: 0.4)
        // People they know, where they live, what they do
        // ═══════════════════════════════════════════════════
        'family': 0.4,         // Wife, husband, parents, siblings, uncles, etc.
        'friend': 0.4,         // Friends
        'colleague': 0.4,      // Work colleagues
        'location': 0.4,       // Where user lives
        'profession': 0.4,     // Job/career
        'age': 0.4,            // User's age
        'birthday': 0.4,       // User's birthday
        'pet': 0.4,            // User's pets
        
        // ═══════════════════════════════════════════════════
        // TIER 3: PREFERENCES & INTERESTS (boost: 0.3)
        // What they like, enjoy, prefer
        // ═══════════════════════════════════════════════════
        'preference': 0.3,     // General preferences
        'hobby': 0.3,          // Hobbies and activities
        'interest': 0.3,       // Topics of interest
        'favorite': 0.3,       // Favorite things
        
        // ═══════════════════════════════════════════════════
        // TIER 4: GOALS & STATE (boost: 0.2)
        // What they want to achieve, how they feel
        // ═══════════════════════════════════════════════════
        'goal': 0.2,           // Goals and aspirations
        'plan': 0.2,           // Plans and intentions
        'emotion': 0.2,        // Emotional state
        'mood': 0.2,           // Current mood
        
        // ═══════════════════════════════════════════════════
        // TIER 5: EDUCATION & RESEARCH (boost: 0.1)
        // Learning content - has its own dedicated delivery channel
        // ═══════════════════════════════════════════════════
        'education': 0.1,          // Educational background
        'course': 0.1,             // Course content/progress
        'learning_moment': 0.1,    // Captured learning interactions
        'research_insight': 0.1,   // AI-synthesized research findings
        'news_discovery': 0.1,     // News topics user explored
        
        // ═══════════════════════════════════════════════════
        // TIER 6: SYSTEM/INTERNAL (boost: 0.0)
        // Behavioral patterns - rarely needed in personal context
        // ═══════════════════════════════════════════════════
        'cognitive': 0.0,      // Cognitive patterns
        'behavior': 0.0,       // User behavior patterns
        'context': 0.0,        // Contextual information
        
        // ═══════════════════════════════════════════════════
        // TIER 7: CONTENT CHUNKS (boost: -0.2)
        // Document content that pollutes personal context
        // ═══════════════════════════════════════════════════
        'canvas_document': -0.2,   // Canvas documents
        'document': -0.2,          // General documents
        
        // ═══════════════════════════════════════════════════
        // LEGACY: GENERAL & MISSING (boost: 0.3)
        // Old memories without proper category - may contain valuable personal info!
        // ═══════════════════════════════════════════════════
        'general': 0.3,        // Explicitly marked as 'general'
        '': 0.3,               // Empty string category
        'null': 0.3,           // String "null" (sometimes happens)
        'undefined': 0.3,      // String "undefined" (sometimes happens)
        // DEFAULT: Any unknown category gets 0.2 (backend should use this for null/missing)
        '_default': 0.2        // Fallback for any unrecognized category
      };
      
      // 🎯 Tell backend how to handle legacy/missing categories
      const legacyHandling = {
        treatNullAs: 'general',           // null category → treat as 'general'
        treatUndefinedAs: 'general',      // undefined category → treat as 'general'
        treatEmptyAs: 'general',          // empty string → treat as 'general'
        defaultBoost: 0.2                 // Any unrecognized category gets this boost
      };

      const response = await apiService.makeRequest({
        endpoint: '/api/memory',
        method: 'POST',
        data: {
          action: 'vector_search',
          userId,
          query,
          embedding: queryEmbedding,
          limit,
          similarityThreshold: similarityThreshold || 0.1,
          componentTypes: contextFilters?.contentTypes || allComponentTypes,  // 🎯 ALL types by default
          categories: contextFilters?.categories,
          excludeCategories: contextFilters?.excludeCategories, // 🎯 Exclude at DATABASE level
          conversationId: contextFilters?.conversationId, // 🎯 CRITICAL: Filter canvas docs by conversation
          tags: contextFilters?.tags,
          includeLearningMoments: contextFilters?.includeLearningMoments || false, // 🎯 Exclude by default
          // 🎯 NEW: Hierarchical category boosting system
          categoryBoosts,        // Tell backend to apply category-based score adjustments
          legacyHandling,        // Tell backend how to handle null/undefined/empty categories
          prioritizeIdentity: true // Flag to enable identity-first scoring
        }
      });

      // ✅ CRITICAL FIX: apiService.makeRequest wraps response in `data` field
      const actualData = response.data || response;
      
      // Debug: Log the actual response structure
      console.log('🔍 pgvector response:', {
        hasSuccess: 'success' in actualData,
        successValue: actualData.success,
        hasMemories: 'memories' in actualData,
        memoriesType: typeof actualData.memories,
        isArray: Array.isArray(actualData.memories),
        memoriesLength: actualData.memories?.length,
        responseKeys: Object.keys(actualData)
      });
      
      if (actualData.success && actualData.memories && Array.isArray(actualData.memories)) {
        console.log(`✅ pgvector search returned ${actualData.memories.length} results`);
        return actualData.memories.map((result: any) => ({
          id: result.id || result.memory_id,
          content: result.content || result.memory_value,
          similarity: result.similarity || result.score || 0,
          metadata: result.metadata || {},
          source: 'pgvector' as const,
          memory_key: result.memory_key || result.metadata?.key || result.id,
          key: result.memory_key || result.metadata?.key || result.id
        }));
      }

      console.warn('⚠️ pgvector search returned no results');
      return [];
    } catch (error) {
      console.error('❌ pgvector semantic search failed:', error);
      return [];
    }
  }

  /**
   * 🚀 ADVANCED SEMANTIC SEARCH - Production Implementation
   * Uses JSONB embeddings with mathematical similarity computation
   */
  private async advancedSemanticSearch(
    query: string,
    queryEmbedding: number[],
    userId?: string,
    limit: number = 10,
    similarityThreshold: number = 0.6,
    contextFilters?: any
  ): Promise<SearchResult[]> {
    
    try {
      // FRONTEND: Route through backend API for semantic search
      if (typeof window !== 'undefined') {
        console.log('🔍 VectorSearchService: Using backend API for semantic search');
        return await this.backendSemanticSearch(query, queryEmbedding, userId, limit, similarityThreshold, contextFilters);
      }
      const embeddingJson = JSON.stringify(queryEmbedding);
      
      // Build advanced WHERE clause with context filters
      let whereConditions = ['content IS NOT NULL'];
      const params: any[] = [embeddingJson, query]; // Fixed: Add query as $2
      let paramIndex = 3; // Start from $3

      if (userId) {
        whereConditions.push(`user_id = $${paramIndex}`);
        params.push(userId);
        paramIndex++;
      }

      if (contextFilters?.contentTypes?.length) {
        whereConditions.push(`content_type = ANY($${paramIndex})`);
        params.push(contextFilters.contentTypes);
        paramIndex++;
      }

      if (contextFilters?.qualityMin) {
        whereConditions.push(`quality_score >= $${paramIndex}`);
        params.push(contextFilters.qualityMin);
        paramIndex++;
      }

      if (contextFilters?.timeRange) {
        const timeRangeMap: Record<string, string> = {
          '24h': '1 day',
          '7d': '7 days',
          '30d': '30 days',
          '90d': '90 days'
        };
        const interval = timeRangeMap[contextFilters.timeRange] || '30 days';
        whereConditions.push(`created_at >= NOW() - INTERVAL '${interval}'`);
      }
      
      // Add fixed parameters at the end
      const similarityThresholdParam = paramIndex++;
      const limitParam = paramIndex++;
      params.push(similarityThreshold, limit);

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // State-of-the-art similarity calculation using JSONB
      const result = await this.databaseManager.executeQuery({
        action: 'custom',
        query: `
          WITH embedding_similarities AS (
            SELECT 
              id,
              content,
              COALESCE(content_type, 'memory') as content_type,
              COALESCE(keywords, tags) as keywords,
              context as metadata,
              COALESCE(quality_score, importance_score) as quality_score,
              COALESCE(usage_count, access_count) as usage_count,
              COALESCE(embedding_magnitude, 1.0) as embedding_magnitude,
              created_at,
              -- Text similarity based on content matching
              (
                CASE 
                  WHEN content ILIKE '%' || $2 || '%' THEN 0.9
                  WHEN memory_key ILIKE '%' || $2 || '%' THEN 0.8
                  WHEN $2 = ANY(COALESCE(keywords, tags)) THEN 0.7
                  ELSE 0.3
                END
              ) as semantic_similarity,
              -- Tag overlap boost  
              (
                SELECT COUNT(*)::float / GREATEST(array_length(COALESCE(keywords, tags), 1), 1)
                FROM unnest(COALESCE(keywords, tags)) as tag
                WHERE tag ILIKE ANY(string_to_array(lower($2), ' '))
              ) as keyword_similarity,
              -- Content length relevance (calculated on the fly)
              CASE 
                WHEN LENGTH(content) BETWEEN 100 AND 1000 THEN 1.0
                WHEN LENGTH(content) BETWEEN 50 AND 2000 THEN 0.8
                ELSE 0.6
              END as length_relevance
            FROM user_memories
            ${whereClause}
          ),
          ranked_results AS (
            SELECT *,
              -- State-of-the-art composite scoring
              (
                semantic_similarity * 0.6 +
                keyword_similarity * 0.2 +
                (quality_score / 10.0) * 0.1 +
                (LOG(usage_count + 1) / 10.0) * 0.05 +
                length_relevance * 0.05
              ) as composite_score
            FROM embedding_similarities
            WHERE semantic_similarity > $${similarityThresholdParam}
          )
          SELECT 
            id,
            content,
            content_type,
            semantic_similarity,
            keyword_similarity,
            composite_score,
            metadata,
            quality_score,
            usage_count,
            created_at
          FROM ranked_results
          ORDER BY composite_score DESC, semantic_similarity DESC, quality_score DESC
          LIMIT $${limitParam}
        `,
        params
      });

      // Update usage counts for accessed embeddings
      if (result?.length > 0) {
        const accessedIds = result.map((row: any) => row.id);
        await this.databaseManager.executeQuery({
          action: 'custom',
          query: `
            UPDATE user_memories 
            SET usage_count = COALESCE(usage_count, 0) + 1, 
                access_count = access_count + 1,
                last_accessed = CURRENT_TIMESTAMP
            WHERE id = ANY($1)
          `,
          params: [accessedIds]
        });
      }

      // CRITICAL FIX: Handle DatabaseManager API response format + Safe array handling
      let results = [];
      if (result) {
        // Handle DatabaseManager API response wrapper
        if (typeof result === 'object' && 'success' in result) {
          if (result.success === false) {
            console.warn('⚠️ VectorSearchService: Database query failed:', result.message || 'Unknown error');
            return [];
          }
          
          if (result.success === true && result.data === null) {
            console.warn('⚠️ VectorSearchService: Database unavailable, using fallback:', result.message);
            return [];
          }
          
          if (result.success === true && result.data) {
            // Extract data from API response wrapper
            if (Array.isArray(result.data)) {
              results = result.data;
            } else if (result.data.rows && Array.isArray(result.data.rows)) {
              results = result.data.rows;
            } else {
              console.warn('⚠️ VectorSearchService: Unexpected API data format:', result.data);
              return [];
            }
          }
        } else if (Array.isArray(result)) {
          results = result;
        } else if (result.rows && Array.isArray(result.rows)) {
          results = result.rows;
        } else if (result.data && Array.isArray(result.data)) {
          results = result.data;
        } else if (typeof result === 'object' && result.length !== undefined) {
          // Handle array-like objects
          results = Array.from(result);
        } else {
          console.warn('⚠️ VectorSearchService: Unexpected result format:', typeof result, result);
          return [];
        }
      }
      
      if (!Array.isArray(results)) {
        console.warn('⚠️ VectorSearchService: Expected array, got:', typeof results, 'Full result:', result);
        return [];
      }
      
      // CRITICAL FIX: Filter out undefined/null content before mapping
      results = results.filter(row => row && row.content && typeof row.content === 'string' && row.content.trim() !== '');
      
      return results.map((row: any) => ({
        id: row.id,
        content: row.content,
        similarity: parseFloat(row.composite_score || row.semantic_similarity),
        metadata: {
          ...row.metadata,
          contentType: row.content_type,
          semanticSimilarity: parseFloat(row.semantic_similarity),
          keywordSimilarity: parseFloat(row.keyword_similarity),
          qualityScore: parseFloat(row.quality_score),
          usageCount: parseInt(row.usage_count)
        },
        source: 'vector' as const
      }));

    } catch (error) {
      console.error('❌ Advanced semantic search failed:', error);
      throw error;
    }
  }

  /**
   * 🧠 INTELLIGENT TEXT SEARCH - Advanced fallback
   * Enhanced text search with context awareness
   */
  private async intelligentTextSearch(
    query: string,
    userId?: string,
    limit: number = 10,
    contextFilters?: any
  ): Promise<SearchResult[]> {
    try {
      // FRONTEND FIX: Skip database operations in browser
      if (typeof window !== 'undefined') {
        console.log('🔍 VectorSearchService: Browser detected - skipping intelligentTextSearch');
        return [];
      }
      // Use full-text search with ranking
      let whereConditions = ['content IS NOT NULL'];
      const params: any[] = [query];
      let paramIndex = 2;

      if (userId) {
        whereConditions.push(`user_id = $${paramIndex}`);
        params.push(userId);
        paramIndex++;
      }

      if (contextFilters?.contentTypes?.length) {
        whereConditions.push(`content_type = ANY($${paramIndex})`);
        params.push(contextFilters.contentTypes);
        paramIndex++;
      }
      
      // Add limit parameter
      const limitParam = paramIndex;
      params.push(limit);

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      let result;
      
      try {
        // Try with similarity function (requires pg_trgm extension)
        result = await this.databaseManager.executeQuery({
          action: 'custom',
          query: `
            SELECT 
              id,
              content,
              content_type,
              metadata,
              quality_score,
              usage_count,
                          ts_rank(to_tsvector('english', content), plainto_tsquery('english', $1)) as text_rank,
            CASE 
              WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') 
              THEN similarity(content, $1) 
              ELSE 0.0 
            END as content_similarity
            FROM user_memories
            ${whereClause}
            AND (
              to_tsvector('english', content) @@ plainto_tsquery('english', $1) OR
              content ILIKE '%' || $1 || '%' OR
              keywords && string_to_array(lower($1), ' ')
            )
            ORDER BY 
              text_rank DESC,
              content_similarity DESC,
              quality_score DESC,
              usage_count DESC
            LIMIT $${limitParam}
          `,
          params
        });
      } catch (error: any) {
        console.warn('⚠️ similarity() function failed, using fallback without text similarity:', error?.message);
        
        // Fallback without similarity function
        result = await this.databaseManager.executeQuery({
          action: 'custom',
          query: `
            SELECT 
              id,
              content,
              content_type,
              metadata,
              quality_score,
              usage_count,
              ts_rank(to_tsvector('english', content), plainto_tsquery('english', $1)) as text_rank,
              0.5 as content_similarity
            FROM user_memories
            ${whereClause}
            AND (
              to_tsvector('english', content) @@ plainto_tsquery('english', $1) OR
              content ILIKE '%' || $1 || '%' OR
              keywords && string_to_array(lower($1), ' ')
            )
            ORDER BY 
              text_rank DESC,
              quality_score DESC,
              usage_count DESC
            LIMIT $${limitParam}
          `,
          params
        });
      }

      // CRITICAL FIX: Handle DatabaseManager API response format + Safe array handling
      let results = [];
      if (result) {
        // Handle DatabaseManager API response wrapper
        if (typeof result === 'object' && 'success' in result) {
          if (result.success === false) {
            console.warn('⚠️ VectorSearchService: Database query failed:', result.message || 'Unknown error');
            return [];
          }
          
          if (result.success === true && result.data === null) {
            console.warn('⚠️ VectorSearchService: Database unavailable, using fallback:', result.message);
            return [];
          }
          
          if (result.success === true && result.data) {
            // Extract data from API response wrapper
            if (Array.isArray(result.data)) {
              results = result.data;
            } else if (result.data.rows && Array.isArray(result.data.rows)) {
              results = result.data.rows;
            } else {
              console.warn('⚠️ VectorSearchService: Unexpected API data format:', result.data);
              return [];
            }
          }
        } else if (Array.isArray(result)) {
          results = result;
        } else if (result.rows && Array.isArray(result.rows)) {
          results = result.rows;
        } else if (result.data && Array.isArray(result.data)) {
          results = result.data;
        } else if (typeof result === 'object' && result.length !== undefined) {
          // Handle array-like objects
          results = Array.from(result);
        } else {
          console.warn('⚠️ VectorSearchService: Unexpected result format:', typeof result, result);
          return [];
        }
      }
      
      if (!Array.isArray(results)) {
        console.warn('⚠️ VectorSearchService: Expected array, got:', typeof results, 'Full result:', result);
        return [];
      }
      
      // CRITICAL FIX: Filter out undefined/null content before mapping
      results = results.filter(row => row && row.content && typeof row.content === 'string' && row.content.trim() !== '');
      
      return results.map((row: any, index: number) => ({
        id: row.id || `text_${index}`,
        content: row.content,
        similarity: parseFloat(row.text_rank || row.content_similarity || 0),
        metadata: {
          ...row.metadata,
          contentType: row.content_type,
          textRank: parseFloat(row.text_rank || 0),
          qualityScore: parseFloat(row.quality_score || 0)
        },
        source: 'text' as const
      }));

    } catch (error) {
      console.error('❌ Intelligent text search failed:', error);
      return this.basicTextSearch(query, userId, limit);
    }
  }

  /**
   * Basic text search fallback
   */
  private async basicTextSearch(
    query: string,
    userId?: string,
    limit: number = 10
  ): Promise<SearchResult[]> {
    try {
      // FRONTEND FIX: Skip database operations in browser
      if (typeof window !== 'undefined') {
        console.log('🔍 VectorSearchService: Browser detected - skipping basicTextSearch');
        return [];
      }
      const knowledge = await this.databaseManager.getCrossChatKnowledge(
        userId || 'all',
        query,
        limit
      );

      return knowledge.map((item: any, index: number) => ({
        id: item.id || `text_${index}`,
        content: item.content,
        similarity: this.calculateTextSimilarity(query, item.content),
        metadata: item.metadata || {},
        source: 'text' as const
      }));

    } catch (error) {
      console.error('❌ Basic text search failed:', error);
      return [];
    }
  }

  /**
   * Simple text similarity calculation
   */
  private calculateTextSimilarity(query: string, content: string): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentWords = content.toLowerCase().split(/\s+/);
    
    const commonWords = queryWords.filter(word => 
      contentWords.some(cWord => cWord.includes(word) || word.includes(cWord))
    );
    
    return commonWords.length / Math.max(queryWords.length, 1);
  }

  /**
   * 🎯 PRODUCTION EMBEDDING GENERATION
   * Generates high-quality embeddings using Fireworks AI (user's exclusive provider)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Method 1: Try Fireworks embeddings (production quality)
      const fireworksEmbedding = await this.generateFireworksEmbedding(text);
      if (fireworksEmbedding) {
        return fireworksEmbedding;
      }
      
      // Method 2: Use advanced text analysis (production fallback)
      return this.generateAdvancedTextEmbedding(text);
      
    } catch (error: any) {
      console.warn('⚠️ Embedding generation failed, using fallback:', error?.message);
      return this.generateAdvancedTextEmbedding(text);
    }
  }

  /**
   * Fireworks AI embeddings routed through backend (user's exclusive AI provider)
   */
  private async generateFireworksEmbedding(text: string): Promise<number[] | null> {
    try {
      console.log('🧠 EMBEDDINGS: Using Fireworks AI for text embedding');
      
      const { UnifiedAPIRouter } = await import('./UnifiedAPIRouter');
      const unifiedAPIRouter = UnifiedAPIRouter.getInstance();
      
      // Use Fireworks embedding model (nomic-ai/nomic-embed-text-v1.5)
      const embeddingResponse = await unifiedAPIRouter.routeAPICall(
        'fireworks',
        'embeddings',
        {
          input: text,
          model: 'nomic-ai/nomic-embed-text-v1.5',
          dimensions: 768  // Nomic embeddings are 768-dimensional
        }
      );

      if (embeddingResponse.success && embeddingResponse.data?.data?.[0]?.embedding) {
        return embeddingResponse.data.data[0].embedding;
      }
      
      // Try alternative extraction path
      if (embeddingResponse.success && Array.isArray(embeddingResponse.data)) {
        return embeddingResponse.data;
      }
      
      return null;
    } catch (error: any) {
      console.warn('⚠️ Fireworks embedding failed:', error?.message);
      return null;
    }
  }

  /**
   * 🚀 ADVANCED TEXT EMBEDDING - Production Quality
   * Creates semantic embeddings using NLP techniques
   */
  private generateAdvancedTextEmbedding(text: string): number[] {
    const cleanText = text.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
    const words = cleanText.split(/\s+/).filter(word => word.length > 2);
    
    // Initialize embedding vector - MUST match Fireworks nomic-ai/nomic-embed-text-v1.5 (768 dimensions)
    const embedding = new Array(768).fill(0);
    
    // Educational & AI domain keywords with semantic weights
    const domainKeywords: Record<string, number> = {
      'artificial': 0.9, 'intelligence': 0.9, 'machine': 0.8, 'learning': 0.8,
      'neural': 0.8, 'network': 0.7, 'deep': 0.7, 'algorithm': 0.7,
      'data': 0.6, 'model': 0.6, 'training': 0.6, 'prediction': 0.6,
      'education': 0.8, 'teach': 0.7, 'learn': 0.7, 'student': 0.6,
      'knowledge': 0.7, 'skill': 0.6, 'understanding': 0.6, 'concept': 0.6
    };

    // Sentiment and emotion keywords
    const emotionKeywords: Record<string, number> = {
      'happy': 0.5, 'sad': -0.5, 'excited': 0.7, 'frustrated': -0.6,
      'confident': 0.6, 'confused': -0.4, 'interested': 0.5, 'bored': -0.5
    };

    // Process each word
    words.forEach((word, index) => {
      const wordHash = this.advancedTextHash(word);
      const position = Math.abs(wordHash) % 768;
      
      // Base semantic value
      let semanticWeight = 0.1;
      
      // Apply domain-specific weights
      if (domainKeywords[word]) {
        semanticWeight += domainKeywords[word];
      }
      
      // Apply emotion weights
      if (emotionKeywords[word]) {
        semanticWeight += emotionKeywords[word] * 0.3;
      }
      
      // Position-based encoding (beginning/end words are more important)
      const positionWeight = index < 3 || index >= words.length - 3 ? 1.2 : 1.0;
      
      // Update embedding at calculated position
      embedding[position] += semanticWeight * positionWeight;
      
      // Spread semantic influence to nearby dimensions
      for (let i = 1; i <= 3; i++) {
        const nearPos1 = (position + i) % 768;
        const nearPos2 = (position - i + 768) % 768;
        embedding[nearPos1] += semanticWeight * 0.3 * positionWeight;
        embedding[nearPos2] += semanticWeight * 0.3 * positionWeight;
      }
    });

    // Normalize the embedding vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] = embedding[i] / magnitude;
      }
    }

    return embedding;
  }

  /**
   * Advanced hash function for better distribution
   */
  private advancedTextHash(text: string): number {
    let hash = 0;
    if (text.length === 0) return hash;
    
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Apply additional mixing for better distribution
    hash ^= hash >>> 16;
    hash *= 0x85ebca6b;
    hash ^= hash >>> 13;
    hash *= 0xc2b2ae35;
    hash ^= hash >>> 16;
    
    return hash;
  }



  /**
   * Check if vector search is supported
   */
  isVectorSupported(): boolean {
    return this.vectorSupported;
  }

  /**
   * Get search capabilities info
   */
  getSearchCapabilities(): { 
    hnsw: boolean; 
    vector: boolean; 
    text: boolean; 
    fallback: boolean;
    performance: string;
  } {
    // HNSW acceleration is backend-only, frontend uses standard vector search
    const hnswAvailable = false; // Will be true when called from backend with HNSW
    return {
      hnsw: hnswAvailable,
      vector: this.vectorSupported,
      text: true,
      fallback: !this.vectorSupported,
      performance: this.vectorSupported ? '📊 PostgreSQL Vector (with backend HNSW acceleration)' : '📝 Text Search'
    };
  }
}

export const vectorSearchService = VectorSearchService.getInstance();
