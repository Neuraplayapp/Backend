/**
 * 🧠 MEMORY DATABASE BRIDGE - CLEAN VERSION
 * 
 * ONLY uses working components:
 * 1. HNSW Vector Search (PRIMARY)
 * 2. Direct API Search (FALLBACK)
 * 
 * ALL BROKEN SERVICES REMOVED
 */

import { apiService } from './APIService';
import DOMPurify from 'dompurify';

interface MemorySearchData {
  userId: string;
  query: string;
  limit?: number;
  categories?: string[];
  tags?: string[];
  timeRange?: string;
  includeMetadata?: boolean;
  excludeNonPersonal?: boolean;  // 🎯 Filter out canvas docs from personal recall queries
  isPersonalRecallable?: boolean;  // 🎯 LAZY LOADING: Filter at database level
  minImportanceScore?: number;  // 🎯 LAZY LOADING: Only fetch important memories
  source?: string[];  // 🎯 LAZY LOADING: Filter by source type
}

interface Memory {
  id: string;
  memory_key: string;
  memory_value: string;
  similarity?: number;
  metadata?: any;
  access_count?: number;
  created_at?: string;
  updated_at?: string;
}

interface MemorySearchResult {
  success: boolean;
  memories: Memory[];
  total: number;
  source: string;
  message?: string;
}

class MemoryDatabaseBridge {
  private cache = new Map<string, any>();
  private cacheTimeout = 30000; // 30 seconds
  private readonly MAX_INPUT_LENGTH = 10000; // Max characters for input

  constructor() {
    console.log('🧠 MemoryDatabaseBridge: Initialized with CLEAN architecture (HNSW + Direct API only)');
  }

  /**
   * 🔐 SECURITY: Sanitize input to prevent injection attacks
   */
  private sanitizeInput(input: string): string {
    if (!input) return '';
    
    // Remove HTML/script tags using DOMPurify
    let sanitized = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
    
    // Limit length to prevent DoS
    if (sanitized.length > this.MAX_INPUT_LENGTH) {
      sanitized = sanitized.substring(0, this.MAX_INPUT_LENGTH);
      console.warn('⚠️ MemoryBridge: Input truncated for security');
    }
    
    return sanitized.trim();
  }

  /**
   * 🔍 SMART QUERY EXPANSION - Expand user queries for better recall
   */
  private async expandQuery(query: string): Promise<string> {
    try {
      // Simple expansion for common patterns
      const expansions: Record<string, string> = {
        'where do i live': 'location home address residence city country',
        'what do i do': 'work job profession career occupation',
        'who is my': 'family relationship',
        'my name': 'name identity called',
        'what do i like': 'preferences interests hobbies likes favorites',
        'my pet': 'pet animal dog cat',
        'my family': 'family relatives mother father sister brother',
        'my skills': 'skills abilities talents expertise',
        'my goals': 'goals ambitions dreams aspirations objectives'
      };
      
      const queryLower = query.toLowerCase();
      for (const [pattern, expansion] of Object.entries(expansions)) {
        if (queryLower.includes(pattern)) {
          console.log(`🔍 Query expanded: "${query}" → "${query} ${expansion}"`);
          return `${query} ${expansion}`;
        }
      }
      
      return query;
    } catch (error) {
      console.warn('⚠️ Query expansion failed, using original query');
      return query;
    }
  }

  /**
   * 🔍 PRIMARY MEMORY SEARCH - CLEAN & DIRECT
   */
  async searchMemories(data: MemorySearchData): Promise<MemorySearchResult> {
    // 🎯 SMART QUERY EXPANSION: Expand query for better recall
    const expandedQuery = await this.expandQuery(data.query);
    const searchQuery = expandedQuery !== data.query ? expandedQuery : data.query;
    
    const cacheKey = `${data.userId}_${searchQuery}_${data.limit}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('🚀 MemoryBridge: Using cached results');
        return cached.result;
      }
    }

    let memories: Memory[] = [];
    let searchMethod = 'unknown';
    let response: any;

    try {
      // 🚀 PRIMARY: HNSW Vector Search (WORKING)
      // Using HNSW vector search as primary method
      
      response = await apiService.makeRequest({
        endpoint: '/api/memory',
        method: 'POST',
        data: {
          action: 'vector_search',
          userId: data.userId,
          query: searchQuery, // 🎯 Use expanded query
          limit: data.limit || 20,
          similarityThreshold: 0.1, // Lower threshold for better results
          // 🎯 CRITICAL: Include ALL componentTypes for comprehensive memory search
          componentTypes: [
            'chat_knowledge', 'general', 'memory', 'personal_identity',
            'relationships', 'professional', 'personal_context',
            'emotional_state', 'preferences', 'interests', 'goals', 'learning'
          ],
          categories: data.categories, // ✅ Pass category filter through
          tags: data.tags, // ✅ Pass tags filter through
          excludeNonPersonal: data.excludeNonPersonal, // 🎯 Filter out canvas docs
          // 🎯 LAZY LOADING: Database-level filtering
          isPersonalRecallable: data.isPersonalRecallable,
          minImportanceScore: data.minImportanceScore,
          source: data.source
        }
      });
      
      searchMethod = 'hnsw_primary';
      
      if (response.success) {
        const backendData = response.data || {};
        memories = backendData.memories || response.memories || [];
        
        if (memories.length > 0) {
          const result = { success: true, memories, total: memories.length, source: 'hnsw_accelerated' };
          this.updateCache(cacheKey, result);
          return result;
        }
        
        // 🔄 RETRY with lower threshold if few results
        // ⚠️ DISABLED: Retry logic was causing 3x API calls (vector_search → retry → fallback)
        // This was spamming logs with "🚀 Using pgvector as PRIMARY retrieval method" 20+ times
        // if (memories.length < 3) {
        //   console.log('🔄 MemoryBridge: Low results, retrying with lower threshold');
        //   const retryResponse = await apiService.makeRequest({
        //     endpoint: '/api/memory',
        //     method: 'POST',
        //     data: {
        //       action: 'vector_search',
        //       userId: data.userId,
        //       query: data.query,
        //       limit: data.limit || 20,
        //       similarityThreshold: 0.05, // Even lower threshold
        //       componentTypes: ['chat_knowledge', 'general', 'memory'],
        //       categories: data.categories,
        //       tags: data.tags
        //     }
        //   });
        //   
        //   if (retryResponse.success) {
        //     const retryData = retryResponse.data || {};
        //     const retryMemories = retryData.memories || retryResponse.memories || [];
        //     if (retryMemories.length > memories.length) {
        //       memories = retryMemories;
        //       const result = { success: true, memories, total: memories.length, source: 'hnsw_low_threshold' };
        //       this.updateCache(cacheKey, result);
        //       return result;
        //     }
        //   }
        // }
        // HNSW returned 0, fall through to direct search
      }
      
    } catch (hnswError: any) {
      // HNSW failed, fall through to direct search
    }

    // 🔄 FALLBACK: Direct API Search
    try {
      
      response = await apiService.makeRequest({
        endpoint: '/api/memory',
        method: 'POST',
        data: {
          action: 'search',
          userId: data.userId,
          query: searchQuery, // 🎯 Use expanded query
          limit: data.limit || 20,
          categories: data.categories, // ✅ Pass category filter through
          tags: data.tags, // ✅ Pass tags filter through
          // 🎯 LAZY LOADING: Database-level filtering
          isPersonalRecallable: data.isPersonalRecallable,
          minImportanceScore: data.minImportanceScore,
          source: data.source
        }
      });
      
      searchMethod = 'direct_api_fallback';
      
      if (response.success) {
        const backendData = response.data || {};
        memories = backendData.memories || response.memories || [];
        const result = { success: true, memories, total: memories.length, source: 'direct_api' };
        this.updateCache(cacheKey, result);
        return result;
      }
      
    } catch (directError: any) {
      // Direct API search failed silently
    }

    // 💀 COMPLETE FAILURE
    console.error('❌ MemoryBridge: ALL search methods failed');
    return { 
      success: false, 
      memories: [], 
      total: 0, 
      source: 'failed',
      message: 'All search methods failed' 
    };
  }

  /**
   * 💾 STORE MEMORY - With verification, sanitization, and detailed logging
   */
  async storeMemory(params: { userId: string; key: string; value: string; metadata?: any } | string, key?: string, value?: string, metadata?: any): Promise<{ success: boolean; message?: string }> {
    // Handle both object and individual parameter formats for backward compatibility
    const actualParams = typeof params === 'object' ? params : { userId: params, key: key!, value: value!, metadata };
    
    // Validate required fields
    if (!actualParams.userId || !actualParams.key || !actualParams.value) {
      console.error('❌ MemoryBridge: Missing required fields for store', { 
        hasUserId: !!actualParams.userId, 
        hasKey: !!actualParams.key, 
        hasValue: !!actualParams.value 
      });
      return { success: false, message: 'Missing required fields' };
    }
    
    // 🔐 SECURITY: Sanitize all inputs
    const sanitizedKey = this.sanitizeInput(actualParams.key);
    const sanitizedValue = this.sanitizeInput(actualParams.value);
    const sanitizedUserId = this.sanitizeInput(actualParams.userId);
    
    if (!sanitizedKey || !sanitizedValue) {
      console.warn('⚠️ MemoryBridge: Input sanitized to empty - rejecting');
      return { success: false, message: 'Invalid input after sanitization' };
    }
    
    try {
      console.log(`💾 MemoryBridge: Storing memory [${sanitizedKey}] for user [${sanitizedUserId}]`);
      
      const response = await apiService.makeRequest({
        endpoint: '/api/memory',
        method: 'POST',
        data: {
          action: 'store',
          userId: sanitizedUserId,
          key: sanitizedKey,
          value: sanitizedValue,
          metadata: {
            ...actualParams.metadata,
            storedAt: new Date().toISOString()
          }
        }
      });

      if (response.success) {
        console.log(`✅ MemoryBridge: STORED [${actualParams.key}] = "${actualParams.value.substring(0, 50)}..."`);
        this.clearCache(actualParams.userId);
        return { success: true, message: 'Memory stored successfully' };
      }
      
      console.warn(`⚠️ MemoryBridge: Store returned unsuccessful`, response);
      return { success: false, message: response.error || 'Store operation failed' };
    } catch (error: any) {
      console.error(`❌ MemoryBridge: Store FAILED for [${actualParams.key}]:`, error?.message || error);
      return { success: false, message: error?.message || 'Store exception' };
    }
  }

  /**
   * 📋 GET ALL MEMORIES BY USER ID
   * Used for checking existing memories before auto-extraction
   */
  async getMemoriesByUserId(userId: string): Promise<Memory[]> {
    try {
      // Use the search method with a broad query to get all user memories
      const result = await this.searchMemories({
        userId,
        query: '*', // Broad query to get all memories
        limit: 100
      });
      
      return result.memories || [];
    } catch (error) {
      console.warn('⚠️ MemoryBridge: getMemoriesByUserId failed:', error);
      return [];
    }
  }

  /**
   * 🗑️ DELETE MEMORY
   */
  async deleteMemory(userId: string, key: string): Promise<boolean> {
    try {
      const response = await apiService.makeRequest({
        endpoint: '/api/memory',
        method: 'POST',
        data: {
          action: 'delete',
          userId,
          key
        }
      });

      if (response.success) {
        console.log(`✅ MemoryBridge: Deleted memory ${key}`);
        this.clearCache(userId); // Clear cache after deleting
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('❌ MemoryBridge: Delete failed:', error?.message || error);
      return false;
    }
  }

  /**
   * 🧹 CACHE MANAGEMENT
   */
  private updateCache(key: string, result: any) {
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  private clearCache(userId?: string) {
    if (userId) {
      // Clear only user-specific cache entries
      for (const [key] of this.cache) {
        if (key.startsWith(userId)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.cache.clear();
    }
  }

  /**
   * 📊 GET CACHE STATS
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * 🚨 CLEAR ALL CACHES - Call on user logout/login
   * Prevents cross-user memory leakage
   */
  clearAllCaches(): void {
    console.log('🧹 MemoryBridge: Clearing ALL caches (user changed)');
    this.cache.clear();
  }
}

// Export singleton instance
export const memoryDatabaseBridge = new MemoryDatabaseBridge();
export { MemoryDatabaseBridge };

console.log('🧠 Clean MemoryDatabaseBridge loaded - ONLY working components (HNSW + Direct API)');
