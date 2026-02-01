// Context Manager - Intelligent context enrichment and retrieval
interface ContextData {
  sessionId: string;
  timestamp: number;
  data: any;
  embedding?: number[];
  tags?: string[];
  relevanceScore?: number;
}

interface HistoricalContext {
  id: string;
  data: any;
  relevance: number;
  timestamp: number;
}

export class ContextManager {
  private sessionCache = new Map<string, Map<string, any>>();
  private embeddingCache = new Map<string, number[]>();
  private contextHistory: ContextData[] = [];
  private maxHistorySize = 1000;

  constructor(
    private vectorDB?: any, // Vector database adapter
    private redis?: any      // Redis cache adapter
  ) {}

  async enrichParams(params: any, sessionContext: any, sessionId: string): Promise<any> {
    try {
      // 1. Get session-specific context
      const sessionData = await this.getSessionContext(sessionId);
      
      // 2. Retrieve semantically similar historical context
      const similarContext = await this.getRelevantHistoricalContext(
        JSON.stringify(params), 
        sessionId
      );

      // 3. Merge contexts with priority
      const enrichedContext = {
        ...sessionContext,
        session: sessionData,
        historical: similarContext,
        timestamp: Date.now()
      };

      // 4. Perform template substitution
      const enrichedParams = await this.substituteTemplates(params, enrichedContext);

      // 5. Cache the enriched context
      await this.cacheContext(sessionId, 'enriched_params', enrichedParams);

      return enrichedParams;

    } catch (error) {
      console.error('❌ Context enrichment failed:', error);
      return params; // Return original params if enrichment fails
    }
  }

  async updateContext(sessionId: string, key: string, data: any, tags?: string[]): Promise<void> {
    try {
      const contextEntry: ContextData = {
        sessionId,
        timestamp: Date.now(),
        data,
        tags: tags || []
      };

      // 1. Generate embedding for semantic search
      if (this.vectorDB) {
        const embedding = await this.generateEmbedding(JSON.stringify(data));
        contextEntry.embedding = embedding;

        // Store in vector database
        await this.vectorDB.upsert([{
          id: `${sessionId}-${key}-${Date.now()}`,
          values: embedding,
          metadata: {
            sessionId,
            key,
            timestamp: contextEntry.timestamp,
            tags: tags || []
          }
        }]);
      }

      // 2. Update session cache
      if (!this.sessionCache.has(sessionId)) {
        this.sessionCache.set(sessionId, new Map());
      }
      this.sessionCache.get(sessionId)!.set(key, data);

      // 3. Update Redis cache if available
      if (this.redis) {
        await this.redis.hset(`session:${sessionId}`, key, JSON.stringify(data));
        await this.redis.expire(`session:${sessionId}`, 3600); // 1 hour TTL
      }

      // 4. Add to in-memory history
      this.contextHistory.push(contextEntry);
      if (this.contextHistory.length > this.maxHistorySize) {
        this.contextHistory.shift(); // Remove oldest entry
      }

      console.log(`✅ Context updated: ${sessionId}:${key}`);

    } catch (error) {
      console.error('❌ Failed to update context:', error);
    }
  }

  async getSessionContext(sessionId: string): Promise<any> {
    try {
      // 1. Check in-memory cache first
      const cached = this.sessionCache.get(sessionId);
      if (cached) {
        return Object.fromEntries(cached);
      }

      // 2. Check Redis cache
      if (this.redis) {
        const redisData = await this.redis.hgetall(`session:${sessionId}`);
        if (redisData && Object.keys(redisData).length > 0) {
          const parsed = {};
          for (const [key, value] of Object.entries(redisData)) {
            try {
              parsed[key] = JSON.parse(value as string);
            } catch {
              parsed[key] = value;
            }
          }
          
          // Populate in-memory cache
          this.sessionCache.set(sessionId, new Map(Object.entries(parsed)));
          return parsed;
        }
      }

      return {};

    } catch (error) {
      console.error('❌ Failed to get session context:', error);
      return {};
    }
  }

  private async getRelevantHistoricalContext(
    query: string, 
    sessionId: string, 
    topK: number = 5
  ): Promise<HistoricalContext[]> {
    try {
      if (!this.vectorDB) {
        // Fallback to simple in-memory search
        return this.searchMemoryContext(query, sessionId, topK);
      }

      const queryEmbedding = await this.generateEmbedding(query);
      
      const results = await this.vectorDB.query({
        vector: queryEmbedding,
        topK,
        filter: {
          sessionId: { $eq: sessionId }
        },
        includeMetadata: true
      });

      return results.matches.map((match: any) => ({
        id: match.id,
        data: match.metadata,
        relevance: match.score,
        timestamp: match.metadata.timestamp
      }));

    } catch (error) {
      console.error('❌ Failed to get historical context:', error);
      return [];
    }
  }

  private searchMemoryContext(query: string, sessionId: string, topK: number): HistoricalContext[] {
    const queryLower = query.toLowerCase();
    
    return this.contextHistory
      .filter(entry => entry.sessionId === sessionId)
      .map(entry => {
        const dataStr = JSON.stringify(entry.data).toLowerCase();
        const relevance = this.calculateStringRelevance(queryLower, dataStr);
        
        return {
          id: `${entry.sessionId}-${entry.timestamp}`,
          data: entry.data,
          relevance,
          timestamp: entry.timestamp
        };
      })
      .filter(item => item.relevance > 0.1) // Minimum relevance threshold
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, topK);
  }

  private calculateStringRelevance(query: string, text: string): number {
    const queryWords = query.split(/\s+/);
    const textWords = text.split(/\s+/);
    
    let matches = 0;
    for (const word of queryWords) {
      if (textWords.some(textWord => textWord.includes(word) || word.includes(textWord))) {
        matches++;
      }
    }
    
    return matches / queryWords.length;
  }

  private async substituteTemplates(params: any, context: any): Promise<any> {
    if (typeof params !== 'object' || params === null) {
      return params;
    }

    const substituted = { ...params };
    
    for (const [key, value] of Object.entries(substituted)) {
      if (typeof value === 'string') {
        substituted[key] = this.interpolateString(value, context);
      } else if (typeof value === 'object') {
        substituted[key] = await this.substituteTemplates(value, context);
      }
    }

    return substituted;
  }

  private interpolateString(template: string, context: any): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getNestedValue(context, path);
      return value !== undefined ? String(value) : match;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const cacheKey = this.hashString(text);
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    try {
      // FIXED: Route through backend using Render environment variables (per user preference)
      const { apiService } = await import('./APIService');
      
      const response = await apiService.makeRequest({
        endpoint: '/api',
        method: 'POST',
        data: {
          task_type: 'embeddings',
          input_data: {
            input: text,
            model: 'text-embedding-ada-002'
          }
        }
      });

      if (!response.success || !response.data?.data?.[0]?.embedding) {
        throw new Error(response.error || 'Embedding generation failed');
      }

      const data = response.data;
      const embedding = data.data[0].embedding;

      // Cache the embedding
      this.embeddingCache.set(cacheKey, embedding);
      
      // Limit cache size
      if (this.embeddingCache.size > 10000) {
        const firstKey = this.embeddingCache.keys().next().value;
        this.embeddingCache.delete(firstKey);
      }

      return embedding;

    } catch (error) {
      console.error('❌ Failed to generate embedding:', error);
      // Return a dummy embedding vector of appropriate size (768 dims for nomic model)
      return new Array(768).fill(0);
    }
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private async cacheContext(sessionId: string, key: string, data: any): Promise<void> {
    try {
      if (!this.sessionCache.has(sessionId)) {
        this.sessionCache.set(sessionId, new Map());
      }
      
      this.sessionCache.get(sessionId)!.set(key, data);

      if (this.redis) {
        await this.redis.hset(`session:${sessionId}`, key, JSON.stringify(data));
      }
    } catch (error) {
      console.error('❌ Failed to cache context:', error);
    }
  }

  // Cleanup methods
  async clearSession(sessionId: string): Promise<void> {
    this.sessionCache.delete(sessionId);
    
    if (this.redis) {
      await this.redis.del(`session:${sessionId}`);
    }

    // Remove from context history
    this.contextHistory = this.contextHistory.filter(
      entry => entry.sessionId !== sessionId
    );
  }

  async clearOldContext(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    const cutoff = Date.now() - maxAgeMs;
    
    this.contextHistory = this.contextHistory.filter(
      entry => entry.timestamp > cutoff
    );

    console.log(`🧹 Cleared old context entries older than ${maxAgeMs}ms`);
  }

  // Statistics
  getContextStats(): {
    sessionsInMemory: number;
    historyEntries: number;
    embeddingsCached: number;
  } {
    return {
      sessionsInMemory: this.sessionCache.size,
      historyEntries: this.contextHistory.length,
      embeddingsCached: this.embeddingCache.size
    };
  }
}
