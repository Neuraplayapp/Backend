/**
 * 🚀 HNSW CORE INTEGRATION SERVICE - CommonJS Version
 * 
 * **THE CENTRAL NERVOUS SYSTEM** for all NeuraPlay vector operations
 * Converted to CommonJS for server-side compatibility
 * 
 * ⚠️ NOTE: HNSW in-memory search is DISABLED (pgvector is primary)
 * But generateEmbedding() is STILL ACTIVE - used by pgvector storage!
 */

// 🔧 FEATURE FLAG: HNSW in-memory search disabled, but embedding generation stays active
const HNSW_SEARCH_ENABLED = false;

const { hnswVectorSearchService } = require('./HNSWVectorSearchService.cjs');
const { similarityCalculationService } = require('../services/SimilarityCalculationService.cjs');

class HNSWCoreIntegration {
  constructor() {
    this.initialized = false;
    this.hnswSearchEnabled = HNSW_SEARCH_ENABLED;
  }

  /**
   * 🎯 DETERMINE COMPONENT TYPE FROM MEMORY KEY/CATEGORY
   * Maps memory categories to proper componentTypes for efficient filtering at scale
   * 
   * ALIGNED WITH: src/ai/handlers/ToolCallingHandler.ts:determineComponentType()
   * 
   * @param {string} key - Memory key (e.g., 'family_uncle_mohammad', 'name_user')
   * @param {string} category - Memory category from metadata
   * @returns {string} - Proper componentType for storage
   */
  determineComponentType(key, category) {
    const keyLower = (key || '').toLowerCase();
    const categoryLower = (category || '').toLowerCase();
    
    // Priority: Check key patterns first, then category
    // 🔄 ALIGNED with frontend ToolCallingHandler.ts categoryToComponentMap
    const componentTypeMap = {
      // Identity & Personal (matches frontend: 'personal_identity')
      'name': 'personal_identity',
      'identity': 'personal_identity',
      'personal': 'personal_identity',
      'birthday': 'personal_identity',
      'age': 'personal_identity',
      
      // Relationships & Family (matches frontend: 'relationships')
      'family': 'relationships',
      'wife': 'relationships',
      'husband': 'relationships',
      'spouse': 'relationships',
      'partner': 'relationships',
      'romantic': 'relationships',
      'son': 'relationships',
      'daughter': 'relationships',
      'child': 'relationships',
      'mother': 'relationships',
      'father': 'relationships',
      'parent': 'relationships',
      'uncle': 'relationships',
      'aunt': 'relationships',
      'cousin': 'relationships',
      'sibling': 'relationships',
      'brother': 'relationships',
      'sister': 'relationships',
      'friend': 'relationships',
      'pet': 'relationships',
      'social': 'relationships',
      
      // Professional & Education (matches frontend: 'professional')
      'job': 'professional',
      'work': 'professional',
      'career': 'professional',
      'profession': 'professional',
      'company': 'professional',
      'education': 'professional',
      'school': 'professional',
      'university': 'professional',
      'degree': 'professional',
      
      // Location (matches frontend: 'personal_context')
      'location': 'personal_context',
      'city': 'personal_context',
      'country': 'personal_context',
      'address': 'personal_context',
      'home': 'personal_context',
      'live': 'personal_context',
      
      // Emotional (matches frontend: 'emotional_state')
      'happy': 'emotional_state',
      'sad': 'emotional_state',
      'angry': 'emotional_state',
      'anxious': 'emotional_state',
      'love': 'emotional_state',
      'fear': 'emotional_state',
      'emotion': 'emotional_state',
      
      // Preferences (matches frontend: 'preferences')
      'preference': 'preferences',
      'food_preference': 'preferences',
      'music_preference': 'preferences',
      'movie_preference': 'preferences',
      'like': 'preferences',
      'dislike': 'preferences',
      'favorite': 'preferences',
      'style': 'preferences',
      
      // Interests (matches frontend: 'interests')
      'hobby': 'interests',
      'hobbies': 'interests',
      'interest': 'interests',
      'passion': 'interests',
      
      // Plans & Goals (extended - not in frontend but useful)
      'plan': 'goals',
      'goal': 'goals',
      'deadline': 'goals',
      'assignment': 'goals',
      'project': 'goals',
      
      // Learning (extended - not in frontend but useful)
      'course': 'learning',
      'learning': 'learning',
      'lesson': 'learning',
      'study': 'learning',
      'learning_moment': 'learning',
      'education': 'learning',
      
      // Research & News
      'research_insight': 'learning',
      'news_discovery': 'learning',
      
      // Canvas & Documents (de-prioritized in personal context)
      'canvas_document': 'canvas_document',
      'canvas': 'canvas_document',
      'document': 'document',
      'code_canvas': 'code_canvas',
      'chart_canvas': 'chart_canvas',
      
      // System/Internal (behavioral patterns)
      'cognitive': 'cognitive',
      'behavior': 'behavior',
      'context': 'context',
      
      // Legacy
      'general': 'general'
    };
    
    // Check key patterns
    for (const [pattern, type] of Object.entries(componentTypeMap)) {
      if (keyLower.includes(pattern)) {
        return type;
      }
    }
    
    // Check category
    for (const [pattern, type] of Object.entries(componentTypeMap)) {
      if (categoryLower.includes(pattern)) {
        return type;
      }
    }
    
    // Fallback to chat_knowledge for backward compatibility
    return 'chat_knowledge';
  }

  static getInstance() {
    if (!HNSWCoreIntegration.instance) {
      HNSWCoreIntegration.instance = new HNSWCoreIntegration();
    }
    return HNSWCoreIntegration.instance;
  }

  /**
   * 🚀 Initialize HNSW as core service for all systems
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // 🔧 Only initialize HNSW search if enabled
      if (this.hnswSearchEnabled) {
        console.log('🚀 HNSWCoreIntegration: Initializing HNSW in-memory search...');
        await hnswVectorSearchService.initialize();
        console.log('✅ HNSWCoreIntegration: HNSW search ready');
      } else {
        console.log('ℹ️ HNSWCoreIntegration: HNSW search disabled (pgvector is primary). Embedding generation active.');
      }
      
      this.initialized = true;
      
    } catch (error) {
      console.error('❌ HNSWCoreIntegration initialization failed:', error?.message);
      this.initialized = false;
    }
  }

  /**
   * 📥 UNIVERSAL STORAGE - All systems use this method
   */
  async storeVector(data) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // Generate embedding for the content
      const embedding = await this.generateEmbedding(data.content);

      // Create enhanced metadata for HNSW
      const enhancedMetadata = {
        ...data.metadata,
        componentType: data.componentType,
        userId: data.userId,
        sessionId: data.sessionId,
        storedAt: new Date().toISOString(),
        version: '1.0'
      };

      // Store in HNSW (primary storage)
      await hnswVectorSearchService.addVector({
        id: data.id,
        content: data.content,
        embedding,
        metadata: enhancedMetadata,
        userId: data.userId,
        contentType: data.componentType
      });

      // Removed verbose log to reduce noise
      return { success: true, vectorId: data.id };
      
    } catch (error) {
      console.error('❌ HNSWCoreIntegration storage failed:', error?.message);
      return { success: false, vectorId: '' };
    }
  }

  /**
   * 🔍 UNIVERSAL SEARCH - All systems use this method  
   */
  async searchVectors(query, options = {}) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const {
        userId,
        componentTypes,
        categories, // 🎯 Category filter for intent-driven retrieval
        excludeCategories, // 🎯 EXCLUDE specific categories at DATABASE level (e.g., ['course'])
        conversationId, // 🎯 CRITICAL: Filter canvas docs by conversation
        limit = 10,
        similarityThreshold = 0.1,
        timeRange = 'all',
        includeMetadata = true,
        includeLearningMoments = false, // 🎯 Only include for learning-related queries
        categoryBoosts,      // 🎯 Hierarchical category boosts from frontend
        legacyHandling,      // 🎯 How to handle null/undefined/empty categories
        prioritizeIdentity   // 🎯 Flag to enable identity-first scoring
      } = options;

      // 🔧 ENHANCED: Handle empty queries for memory browsing
      let hnswResults = [];
      let queryEmbedding = null; // 🔧 FIX: Define outside the if block
      
      if (query && query.trim()) {
        // Generate query embedding for semantic search
        queryEmbedding = await this.generateEmbedding(query);

        // Search using HNSW (50-100x faster)
        // 🎯 Pass ALL filtering options to SQL level
        hnswResults = await hnswVectorSearchService.search(
          queryEmbedding,
          limit * 2, // Get more candidates for filtering
          userId,
          componentTypes,
          { 
            includeLearningMoments, 
            excludeCategories,
            categories,          // 🎯 CRITICAL: Filter TO specific categories at SQL level!
            conversationId,      // 🎯 CRITICAL: Filter canvas docs by conversation
            categoryBoosts,      // 🎯 Pass category boosts for identity prioritization
            legacyHandling,      // 🎯 Pass legacy handling config
            prioritizeIdentity   // 🎯 Pass identity priority flag
          }
        );
      } else {
        // 🔍 EMPTY QUERY: Get all user memories for browsing
        console.log('🔍 Empty query detected - retrieving all user memories for browsing');
        
        // Get all vectors for this user (bypassing semantic search)
        hnswResults = await hnswVectorSearchService.getAllUserVectors(
          userId,
          componentTypes,
          limit * 2
        );
      }
      
      // 🎯 EXCLUDE CATEGORIES FILTER: Database-level exclusion for efficiency
      // This ensures course chunks don't pollute personal memory retrieval
      if (excludeCategories && excludeCategories.length > 0) {
        const beforeCount = hnswResults.length;
        hnswResults = hnswResults.filter(r => {
          const category = (r.metadata?.category || '').toLowerCase();
          const key = (r.metadata?.memoryKey || r.id || '').toLowerCase();
          
          for (const excludeCat of excludeCategories) {
            // Check category field
            if (category === excludeCat.toLowerCase()) return false;
            // Also check key patterns (e.g., 'course_xxx_section_1_chunk_2')
            if (key.startsWith(`${excludeCat.toLowerCase()}_`)) return false;
          }
          return true;
        });
        console.log(`🚫 Excluded categories ${excludeCategories.join(', ')}: ${beforeCount} → ${hnswResults.length}`);
      }

      // 🧮 STATE-OF-THE-ART SIMILARITY CALCULATION
      // 🎯 IMPORTANT: pgvector results already have adjustedSimilarity with category boosts
      // Only recalculate if no adjustedSimilarity exists (e.g., from HNSW path)
      let results = hnswResults.map(result => {
        // Get the stored embedding for this result
        const storedEmbedding = result.embedding || result.vector;
        
        // 🎯 USE SQL-LEVEL ADJUSTED SIMILARITY if available (includes category boosts)
        // Only recalculate if we don't have adjusted similarity (HNSW path)
        let similarity;
        if (result.adjustedSimilarity !== undefined) {
          // pgvector path: Use the SQL-calculated adjusted similarity (includes category boosts)
          similarity = result.adjustedSimilarity;
        } else if (storedEmbedding && queryEmbedding) {
          // HNSW path: Calculate similarity + apply category boost
          const rawSimilarity = similarityCalculationService.calculateSimilarity(
            queryEmbedding, 
            storedEmbedding, 
            'semantic', 
            {
              adaptiveScoring: true,
              contentType: (result.metadata || {}).contentType || 'memory',
              timestamp: (result.metadata || {}).timestamp,
              queryLength: query ? query.length : 0,
              normalize: true,
              positiveRange: true
            }
          );
          // Apply category boost from result if available
          const categoryBoost = result.categoryBoost || 0;
          similarity = rawSimilarity + categoryBoost;
        } else {
          similarity = result.similarity || 0;
        }

        console.log(`🧮 SimilarityService: Calculated similarity=${similarity.toFixed(3)} for ${result.id}${result.categoryBoost ? ` (boost=${result.categoryBoost})` : ''}`);
        
        // 🔍 LOG ACTUAL CONTENT for family memories to diagnose missing names issue
        if (result.id && result.id.includes('family_')) {
          console.log(`👨‍👩‍👧 FAMILY MEMORY CONTENT:`, {
            id: result.id,
            content: result.content,
            metadata: result.metadata
          });
        }

        return {
          id: result.id,
          content: result.content,
          similarity: similarity,
          componentType: (result.metadata || {}).contentType || (result.metadata || {}).componentType || 'memory',
          metadata: result.metadata || {},
          source: result.source || 'hnsw'
        };
      });

      // Apply component type filter with SAFETY CHECK
      // 🔒 FIX: Don't silently filter out all results - same safety as category filter
      if (componentTypes && componentTypes.length > 0) {
        const beforeCount = results.length;
        const filteredByType = results.filter(r => componentTypes.includes(r.componentType));
        
        // 🔒 SAFETY: If filter would remove ALL results, skip it
        if (filteredByType.length === 0 && beforeCount > 0) {
          console.log(`⚠️ ComponentType filter would remove ALL ${beforeCount} results - skipping to preserve data`);
          // Don't apply the filter - keep all results
        } else {
          results = filteredByType;
        }
      }

      // 🎯 CATEGORY FILTER: Intent-driven retrieval for specific memory categories
      // 🔒 FIX: Only apply if categories are explicitly provided AND not empty
      // This prevents accidentally filtering out all personal memories
      if (categories && categories.length > 0) {
        const beforeCount = results.length;
        console.log(`🎯 Filtering by categories: ${categories.join(', ')}`);
        const filteredResults = results.filter(r => {
          const category = r.metadata?.category || '';
          return categories.includes(category);
        });
        
        // 🔒 SAFETY: If filter removes everything, DON'T apply it!
        // This prevents the "0 results match categories" issue
        if (filteredResults.length === 0 && beforeCount > 0) {
          console.log(`⚠️ Category filter would remove ALL results - skipping filter to preserve data`);
        } else {
          results = filteredResults;
          console.log(`✅ Category filter: ${results.length} results match categories`);
        }
      }

      // 🎯 INTELLIGENT SIMILARITY FILTERING
      if (query && query.trim()) {
        // Calculate optimal threshold using our smart algorithm
        const similarities = results.map(r => r.similarity);
        const optimalThreshold = similarityCalculationService.calculateOptimalThreshold(
          similarities, 
          { 
            strategy: 'adaptive', 
            percentile: 0.7 
          }
        );
        
        // Use the lower of the provided threshold or calculated optimal threshold
        const finalThreshold = Math.min(similarityThreshold, optimalThreshold);
        
        console.log(`🎯 SimilarityService: Using threshold=${finalThreshold.toFixed(3)} (provided=${similarityThreshold}, optimal=${optimalThreshold.toFixed(3)})`);
        
        results = results.filter(r => r.similarity >= finalThreshold);
      } else {
        // For empty queries, use a very low threshold to allow browsing
        console.log('🔍 SimilarityService: Empty query - using low threshold for memory browsing');
        results = results.filter(r => r.similarity >= 0.01);
      }

      // Apply time range filter
      if (timeRange !== 'all') {
        const now = Date.now();
        const timeRangeMs = this.getTimeRangeMs(timeRange);
        results = results.filter(r => {
          const timestamp = r.metadata?.timestamp;
          if (!timestamp) return true;
          return (now - new Date(timestamp).getTime()) <= timeRangeMs;
        });
      }

      // Take final limit
      results = results.slice(0, limit);

      // Removed verbose log to reduce noise
      return results;
      
    } catch (error) {
      console.error('❌ HNSWCoreIntegration search failed:', error?.message);
      return [];
    }
  }

  /**
   * 🔤 Generate embedding using Fireworks AI (dev & prod)
   * Both environments route through Render backend anyway
   */
  async generateEmbedding(text) {
    try {
      const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
      
      // Detect environment
      const isLocalDevelopment = process.env.RENDER !== 'true' && process.env.NODE_ENV !== 'production';
      
      // 🔑 Check ALL possible API key variations (case-insensitive check)
      const FIREWORKS_API_KEY = 
        process.env.NEURAPLAY ||           // All caps
        process.env.Neuraplay ||           // Mixed case
        process.env.neuraplay ||           // Lowercase
        process.env.FIREWORKS_API_KEY || 
        process.env.VITE_FIREWORKS_API_KEY || 
        process.env.VITE_API_KEY ||
        process.env.API_KEY;               // Generic fallback
      
      // LOCAL DEV: Forward embedding requests to Render backend (which has real API key)
      if (isLocalDevelopment) {
        console.log('🔀 LOCAL DEV: Forwarding embedding request to Render backend');
        
        const renderResponse = await fetch('https://neuraplay.onrender.com/api/embeddings/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });
        
        if (!renderResponse.ok) {
          const errorText = await renderResponse.text();
          throw new Error(`Render backend embedding failed: ${renderResponse.status} - ${errorText}`);
        }
        
        const renderResult = await renderResponse.json();
        
        if (renderResult.embedding) {
          console.log('✅ Received embedding from Render backend');
          return renderResult.embedding;
        }
        
        throw new Error('Invalid Render backend response format');
      }
      
      // PRODUCTION: Call Fireworks directly OR use internal unified route
      if (!FIREWORKS_API_KEY) {
        // Try using the internal unified route handler instead (it finds the key differently)
        console.log('⚠️ No direct API key, attempting internal route...');
        
        try {
          // Use the embeddings endpoint through unified route
          const internalFetch = await fetch('http://localhost:' + (process.env.PORT || 10000) + '/api/unified', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              service: 'fireworks',
              endpoint: 'embeddings',
              data: { text, model: 'nomic-ai/nomic-embed-text-v1.5', dimensions: 768 }
            })
          });
          
          if (internalFetch.ok) {
            const internalResult = await internalFetch.json();
            if (internalResult.data?.[0]?.embedding) {
              console.log('✅ Embedding via internal unified route');
              return internalResult.data[0].embedding;
            }
          }
        } catch (internalErr) {
          console.warn('⚠️ Internal route failed:', internalErr.message);
        }
        
        throw new Error('No Fireworks API key configured');
      }
      
      console.log('✅ Fireworks API key found');
      
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
        const errorText = await response.text();
        throw new Error(`Fireworks embedding failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      if (result.data?.[0]?.embedding) {
        return result.data[0].embedding;
      }
      
      throw new Error('Invalid Fireworks embedding response format');
      
    } catch (error) {
      console.error('❌ Embedding generation failed:', error.message);
      console.log('⚠️ Using fallback embedding generation');
      
      // Fallback to inline generation if API call fails
      const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 0);
      const embedding = new Array(768).fill(0); // Match Fireworks dimensions
      
      for (const word of words) {
        let wordHash = 0;
        for (let i = 0; i < word.length; i++) {
          wordHash = ((wordHash << 5) - wordHash + word.charCodeAt(i)) | 0;
        }
        
        for (let k = 0; k < 3; k++) {
          const index = Math.abs(wordHash + k * 1000) % 768;
          embedding[index] += 1.0;
        }
      }
      
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      if (magnitude > 0) {
        for (let i = 0; i < embedding.length; i++) {
          embedding[i] /= magnitude;
        }
      }
      
      console.log('⚠️ Using synthetic fallback embedding (limited accuracy)');
      return embedding;
    }
  }

  /**
   * 🗂️ COMPONENT-SPECIFIC STORAGE METHODS
   */

  // Code Canvas Integration
  async storeCodeCanvasData(data) {
    const vectorData = {
      id: `code_${data.canvasId}_${data.elementId}`,
      content: `${data.language} code: ${data.code}`,
      componentType: 'code_canvas',
      userId: data.userId,
      sessionId: data.sessionId,
      metadata: {
        canvasId: data.canvasId,
        elementType: 'code',
        language: data.language,
        timestamp: new Date().toISOString(),
        tags: data.tags || ['code', data.language]
      }
    };

    return this.storeVector(vectorData);
  }

  // Chart Canvas Integration
  async storeChartCanvasData(data) {
    const content = `${data.chartType} chart: ${data.description || 'Chart visualization'} ${JSON.stringify(data.chartConfig).substring(0, 500)}`;
    
    const vectorData = {
      id: `chart_${data.canvasId}_${data.elementId}`,
      content,
      componentType: 'chart_canvas',
      userId: data.userId,
      sessionId: data.sessionId,
      metadata: {
        canvasId: data.canvasId,
        elementType: 'chart',
        chartType: data.chartType,
        timestamp: new Date().toISOString(),
        tags: ['chart', data.chartType, 'visualization']
      }
    };

    return this.storeVector(vectorData);
  }

  // Document Canvas Integration
  async storeDocumentCanvasData(data) {
    const vectorData = {
      id: `doc_${data.canvasId}_${data.elementId}`,
      content: `${data.title || 'Document'}: ${data.content}`,
      componentType: 'document_canvas',
      userId: data.userId,
      sessionId: data.sessionId,
      metadata: {
        canvasId: data.canvasId,
        elementType: 'document',
        documentType: data.documentType,
        timestamp: new Date().toISOString(),
        tags: ['document', data.documentType]
      }
    };

    return this.storeVector(vectorData);
  }

  // Assistant Memory Integration
  async storeAssistantMemory(data) {
    const vectorData = {
      id: `assistant_${data.assistantType}_${data.userId}_${Date.now()}`,
      content: data.content,
      componentType: 'assistant_memory',
      userId: data.userId,
      sessionId: data.sessionId,
      metadata: {
        assistantType: data.assistantType,
        memoryType: data.memoryType,
        context: data.context,
        timestamp: new Date().toISOString(),
        tags: ['assistant', data.assistantType, data.memoryType]
      }
    };

    return this.storeVector(vectorData);
  }

  /**
   * 🔍 COMPONENT-SPECIFIC SEARCH METHODS
   */

        // Search Code Canvas
  async searchCodeCanvas(query, userId, options = {}) {
    const searchOptions = {
      userId,
      componentTypes: ['code_canvas'],
      limit: options.limit || 5,
      similarityThreshold: 0.3
    };

    let results = await this.searchVectors(query, searchOptions);

    // Filter by language if specified
    if (options.language) {
      results = results.filter(r => r.metadata.language === options.language);
    }

    // Filter by canvas if specified
    if (options.canvasId) {
      results = results.filter(r => r.metadata.canvasId === options.canvasId);
    }

    return results;
  }

  // Search Chart Canvas
  async searchChartCanvas(query, userId, options = {}) {
    const searchOptions = {
      userId,
      componentTypes: ['chart_canvas'],
      limit: options.limit || 5,
      similarityThreshold: 0.3
    };

    let results = await this.searchVectors(query, searchOptions);

    // Filter by chart type if specified
    if (options.chartType) {
      results = results.filter(r => r.metadata.chartType === options.chartType);
    }

    // Filter by canvas if specified
    if (options.canvasId) {
      results = results.filter(r => r.metadata.canvasId === options.canvasId);
    }

    return results;
  }

  // Search Assistant Memory
  async searchAssistantMemory(query, userId, assistantType, options = {}) {
    const searchOptions = {
      userId,
      componentTypes: ['assistant_memory'],
      sessionId: options.sessionId,
      limit: options.limit || 10,
      similarityThreshold: 0.3
    };

    const results = await this.searchVectors(query, searchOptions);
    
    // Filter by assistant type
    return results.filter(r => r.metadata.assistantType === assistantType);
  }

  /**
   * 📊 PERFORMANCE METRICS
   */
  getPerformanceStats() {
    return {
      isInitialized: this.initialized,
      hnswAvailable: hnswVectorSearchService.isAvailable(),
      estimatedSpeedBoost: hnswVectorSearchService.isAvailable() ? '50-100x faster' : 'Standard speed',
      supportedComponents: [
        'Code Canvas',
        'Chart Canvas', 
        'Document Canvas',
        'Assistant Memory',
        'Chat Knowledge',
        'Cross-Session Memory'
      ]
    };
  }

  /**
   * 🛠️ UTILITY METHODS
   */
  getTimeRangeMs(timeRange) {
    const ranges = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    return ranges[timeRange] || Infinity;
  }

  /**
   * 🧹 CLEANUP
   */
  async cleanup() {
    try {
      await hnswVectorSearchService.cleanup();
      console.log('✅ HNSWCoreIntegration: Cleanup completed');
    } catch (error) {
      console.error('❌ HNSWCoreIntegration cleanup failed:', error?.message);
    }
  }
}

// Export singleton instance
const hnswCoreIntegration = HNSWCoreIntegration.getInstance();

module.exports = {
  HNSWCoreIntegration,
  hnswCoreIntegration
};
