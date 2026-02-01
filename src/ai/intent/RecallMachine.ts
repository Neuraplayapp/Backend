// Episodic Retrieval System - Neuropsychological Equivalent: Hippocampus
// ChatGPT Equivalent: Contextual Memory Retrieval / Long-term Memory Access
// State-of-the-Art Contextual Memory Retrieval Engine
// Partners with RetrievalMachine - RetrievalMachine extracts, EpisodicRetrievalSystem retrieves

export interface RecallContext {
  currentMessage: string;
  conversationContext: any;
  emotionalState?: 'positive' | 'negative' | 'neutral' | 'excited' | 'frustrated' | 'confused';
  temporalRelevance?: 'recent' | 'ongoing' | 'historical';
  userId: string;
  sessionId: string;
  topK?: number;
  semanticSimilarity?: boolean;
  associativeLinks?: boolean;
}

export interface RecalledMemory {
  id: string;
  content: string;
  type: 'personal' | 'preference' | 'emotional' | 'factual' | 'relational' | 'temporal' | 'professional' | 'behavioral';
  category: string;
  subcategory?: string;
  relevanceScore: number;
  semanticSimilarity: number;
  temporalRelevance: number;
  emotionalAlignment: number;
  associativeStrength: number;
  recallReason: string;
  originalContext: any;
  lastAccessed: Date;
  accessCount: number;
}

export interface ContextualRecallResult {
  memories: RecalledMemory[];
  totalFound: number;
  recallQuality: number;
  contextualRelevance: number;
  recallStrategy: string;
  processingTime: number;
}

export class EpisodicRetrievalSystem {
  private static instance: EpisodicRetrievalSystem;
  private semanticWeights = {
    exact_match: 1.0,
    semantic_similar: 0.8,
    contextual_related: 0.6,
    associative_linked: 0.4,
    temporal_nearby: 0.3
  };

  static getInstance(): EpisodicRetrievalSystem {
    if (!this.instance) {
      this.instance = new EpisodicRetrievalSystem();
    }
    return this.instance;
  }

  /**
   * STATE-OF-THE-ART: Contextual memory recall using multiple strategies with rate limiting
   */
  async contextualRecall(context: RecallContext): Promise<ContextualRecallResult> {
    const startTime = Date.now();
    console.log('🔍 EpisodicRetrievalSystem: Starting contextual memory recall');

    const {
      currentMessage,
      conversationContext,
      emotionalState = 'neutral',
      temporalRelevance = 'recent',
      userId,
      sessionId,
      topK = 5, // Reduced default to prevent overload
      semanticSimilarity = true,
      associativeLinks = false // Disabled by default to reduce API calls
    } = context;

    // Rate limiting: Skip recall for error messages or very short messages
    if (!currentMessage || currentMessage.length < 10 || currentMessage.includes('I apologize, but I encountered an issue')) {
      console.log('🔍 EpisodicRetrievalSystem: Skipping recall for error/short message');
      return {
        memories: [],
        totalFound: 0,
        recallQuality: 0,
        contextualRelevance: 0,
        recallStrategy: 'skipped',
        processingTime: Date.now() - startTime
      };
    }

    try {
      // STRATEGY 1: Direct semantic search (primary strategy)
      const semanticMemories = await this.performSemanticRecall(currentMessage, userId, Math.min(topK, 3));
      
      // STRATEGY 2-5: Only run if semantic search succeeds and we need more context
      const shouldRunExtendedRecall = semanticMemories.length < 2 && currentMessage.length > 50;
      
      let emotionalMemories = [];
      let temporalMemories = [];  
      let associativeMemories = [];
      let conversationalMemories = [];
      
      if (shouldRunExtendedRecall) {
        // Run other strategies only when needed
        [emotionalMemories, temporalMemories, conversationalMemories] = await Promise.all([
          this.performEmotionalRecall(emotionalState, userId, 2),
          this.performTemporalRecall(temporalRelevance, userId, 2),
          this.performConversationalRecall(conversationContext, sessionId, userId, 2)
        ]);
        
        // Associative recall only if explicitly enabled
        if (associativeLinks) {
          associativeMemories = await this.performAssociativeRecall(currentMessage, userId, 2);
        }
      }

      // MERGE AND RANK all recalled memories
      const allMemories = [
        ...semanticMemories,
        ...emotionalMemories,
        ...temporalMemories,
        ...associativeMemories,
        ...conversationalMemories
      ];

      // DEDUPLICATE and calculate composite relevance scores
      const deduplicatedMemories = this.deduplicateMemories(allMemories);
      
      // CONTEXTUAL RANKING using current message context
      const rankedMemories = this.performContextualRanking(
        deduplicatedMemories,
        currentMessage,
        emotionalState,
        temporalRelevance
      );

      // SELECT TOP-K most relevant
      const finalMemories = rankedMemories.slice(0, topK);

      // UPDATE ACCESS STATISTICS
      await this.updateAccessStatistics(finalMemories, userId);

      const processingTime = Date.now() - startTime;

      const result: ContextualRecallResult = {
        memories: finalMemories,
        totalFound: allMemories.length,
        recallQuality: this.calculateRecallQuality(finalMemories),
        contextualRelevance: this.calculateContextualRelevance(finalMemories, currentMessage),
        recallStrategy: this.determineRecallStrategy(finalMemories),
        processingTime
      };

      console.log(`🔍 EpisodicRetrievalSystem: Recalled ${finalMemories.length} memories in ${processingTime}ms`, {
        recallQuality: result.recallQuality,
        contextualRelevance: result.contextualRelevance,
        strategy: result.recallStrategy
      });

      return result;

    } catch (error) {
      console.error('❌ EpisodicRetrievalSystem: Failed to perform contextual recall:', error);
      return {
        memories: [],
        totalFound: 0,
        recallQuality: 0,
        contextualRelevance: 0,
        recallStrategy: 'fallback',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * STRATEGY 1: Semantic similarity-based recall
   */
  private async performSemanticRecall(message: string, userId: string, topK: number): Promise<RecalledMemory[]> {
    try {
      // Extract key semantic concepts from current message
      const semanticConcepts = this.extractSemanticConcepts(message);
      
      // 🎯 CRITICAL FIX: If no concepts extracted, use original message
      // Otherwise short messages like "what is my name" become empty queries
      // which triggers getAllUserVectors (returns newest 20 = all courses)
      const semanticQuery = semanticConcepts.length > 0 
        ? semanticConcepts.join(' OR ')
        : message;
      
      // Search stored memories using toolRegistry
      const { toolRegistry } = await import('../../services/ToolRegistry');
      
      const searchResult = await toolRegistry.execute('store_memory', {
        action: 'search',
        userId,
        query: semanticQuery
      }, { sessionId: 'semantic-recall', userId, startTime: Date.now() });

      const rawMemories = searchResult.data?.memories || [];
      
      // Convert to RecalledMemory format with semantic similarity scoring
      return rawMemories.map((memory: any) => this.convertToRecalledMemory(
        memory, 
        'semantic_search',
        this.calculateSemanticSimilarity(message, memory.content || memory.value || ''),
        'Semantic similarity to current message'
      )).slice(0, topK);

    } catch (error) {
      console.warn('⚠️ EpisodicRetrievalSystem: Semantic recall failed:', error);
      return [];
    }
  }

  /**
   * STRATEGY 2: Emotional state-aligned recall
   */
  private async performEmotionalRecall(emotionalState: string, userId: string, topK: number): Promise<RecalledMemory[]> {
    try {
      // Build emotional context query
      const emotionalQueries = {
        positive: 'love enjoy happy excited proud grateful satisfied',
        negative: 'hate dislike sad frustrated angry disappointed stressed',
        excited: 'excited thrilled amazing fantastic incredible wonderful',
        frustrated: 'frustrated annoying difficult struggle problem issue',
        confused: 'confused unclear uncertain not sure puzzled',
        neutral: 'normal regular usual typical standard'
      };

      const query = emotionalQueries[emotionalState as keyof typeof emotionalQueries] || emotionalQueries.neutral;

      const { toolRegistry } = await import('../../services/ToolRegistry');
      
      const searchResult = await toolRegistry.execute('store_memory', {
        action: 'search',
        userId,
        query
      }, { sessionId: 'emotional-recall', userId, startTime: Date.now() });

      const rawMemories = searchResult.data?.memories || [];
      
      return rawMemories.map((memory: any) => this.convertToRecalledMemory(
        memory,
        'emotional_alignment',
        this.calculateEmotionalAlignment(emotionalState, memory.content || memory.value || ''),
        `Emotional alignment with ${emotionalState} state`
      )).slice(0, topK);

    } catch (error) {
      console.warn('⚠️ EpisodicRetrievalSystem: Emotional recall failed:', error);
      return [];
    }
  }

  /**
   * STRATEGY 3: Temporal context recall
   */
  private async performTemporalRecall(temporalRelevance: string, userId: string, topK: number): Promise<RecalledMemory[]> {
    try {
      // Build temporal query based on relevance
      const temporalQueries = {
        recent: 'today recently now currently latest new',
        ongoing: 'always usually often continuing regular habit',
        historical: 'before previously used to in the past history'
      };

      const query = temporalQueries[temporalRelevance as keyof typeof temporalQueries] || temporalQueries.recent;

      const { toolRegistry } = await import('../../services/ToolRegistry');
      
      const searchResult = await toolRegistry.execute('store_memory', {
        action: 'search',
        userId,
        query
      }, { sessionId: 'temporal-recall', userId, startTime: Date.now() });

      const rawMemories = searchResult.data?.memories || [];
      
      return rawMemories.map((memory: any) => this.convertToRecalledMemory(
        memory,
        'temporal_context',
        this.calculateTemporalRelevance(temporalRelevance, memory),
        `Temporal relevance for ${temporalRelevance} context`
      )).slice(0, topK);

    } catch (error) {
      console.warn('⚠️ EpisodicRetrievalSystem: Temporal recall failed:', error);
      return [];
    }
  }

  /**
   * STRATEGY 4: Associative recall (memories linked to current concepts)
   */
  private async performAssociativeRecall(message: string, userId: string, topK: number): Promise<RecalledMemory[]> {
    try {
      // Extract entities and concepts for associative linking
      const entities = this.extractEntities(message);
      const concepts = this.extractConcepts(message);
      
      // Build associative queries
      const associativeTerms = [...entities, ...concepts];
      const query = associativeTerms.join(' OR ');

      const { toolRegistry } = await import('../../services/ToolRegistry');
      
      const searchResult = await toolRegistry.execute('store_memory', {
        action: 'search',
        userId,
        query
      }, { sessionId: 'associative-recall', userId, startTime: Date.now() });

      const rawMemories = searchResult.data?.memories || [];
      
      return rawMemories.map((memory: any) => this.convertToRecalledMemory(
        memory,
        'associative_link',
        this.calculateAssociativeStrength(associativeTerms, memory.content || memory.value || ''),
        'Associative links to current concepts'
      )).slice(0, topK);

    } catch (error) {
      console.warn('⚠️ EpisodicRetrievalSystem: Associative recall failed:', error);
      return [];
    }
  }

  /**
   * STRATEGY 5: Conversational context recall
   */
  private async performConversationalRecall(
    conversationContext: any, 
    sessionId: string, 
    userId: string, 
    topK: number
  ): Promise<RecalledMemory[]> {
    try {
      // Build query from conversation context
      const topic = conversationContext?.topic || 'general';
      const query = `conversation topic ${topic} session context`;

      const { toolRegistry } = await import('../../services/ToolRegistry');
      
      const searchResult = await toolRegistry.execute('store_memory', {
        action: 'search',
        userId,
        query
      }, { sessionId: 'conversational-recall', userId, startTime: Date.now() });

      const rawMemories = searchResult.data?.memories || [];
      
      return rawMemories.map((memory: any) => this.convertToRecalledMemory(
        memory,
        'conversational_context',
        this.calculateConversationalRelevance(conversationContext, memory),
        'Relevance to current conversation context'
      )).slice(0, topK);

    } catch (error) {
      console.warn('⚠️ EpisodicRetrievalSystem: Conversational recall failed:', error);
      return [];
    }
  }

  /**
   * Convert raw memory to RecalledMemory with scoring
   * 🎯 CRITICAL FIX: Backend returns memory_key, metadata.category, memory_value - NOT id, key, category
   */
  private convertToRecalledMemory(
    rawMemory: any, 
    recallStrategy: string, 
    relevanceScore: number,
    recallReason: string
  ): RecalledMemory {
    // 🎯 FIX: Extract from correct fields - backend uses memory_key, metadata.category, memory_value
    const metadata = rawMemory.metadata || {};
    const memoryKey = rawMemory.memory_key || rawMemory.key || rawMemory.id || `memory_${Date.now()}`;
    const category = metadata.category || rawMemory.category || 'general';
    const content = rawMemory.content || rawMemory.memory_value || rawMemory.value || '';
    
    return {
      id: memoryKey,
      content,
      type: metadata.type || rawMemory.type || category || 'factual',
      category,
      subcategory: metadata.subcategory || rawMemory.subcategory,
      relevanceScore,
      semanticSimilarity: recallStrategy === 'semantic_search' ? relevanceScore : 0.5,
      temporalRelevance: recallStrategy === 'temporal_context' ? relevanceScore : 0.5,
      emotionalAlignment: recallStrategy === 'emotional_alignment' ? relevanceScore : 0.5,
      associativeStrength: recallStrategy === 'associative_link' ? relevanceScore : 0.5,
      recallReason,
      originalContext: metadata,
      lastAccessed: new Date(),
      accessCount: (rawMemory.accessCount || metadata.accessCount || 0) + 1
    };
  }

  /**
   * Deduplicate memories by content similarity
   */
  private deduplicateMemories(memories: RecalledMemory[]): RecalledMemory[] {
    const unique: RecalledMemory[] = [];
    const seen = new Set<string>();

    for (const memory of memories) {
      const contentHash = this.generateContentHash(memory.content);
      if (!seen.has(contentHash)) {
        seen.add(contentHash);
        unique.push(memory);
      }
    }

    return unique;
  }

  /**
   * Contextual ranking using multiple factors
   */
  private performContextualRanking(
    memories: RecalledMemory[],
    currentMessage: string,
    emotionalState: string,
    temporalRelevance: string
  ): RecalledMemory[] {
    return memories.map(memory => {
      // Calculate composite relevance score
      const compositeScore = 
        (memory.semanticSimilarity * 0.3) +
        (memory.temporalRelevance * 0.2) +
        (memory.emotionalAlignment * 0.2) +
        (memory.associativeStrength * 0.2) +
        (memory.relevanceScore * 0.1);

      memory.relevanceScore = compositeScore;
      return memory;
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Helper methods for scoring
   */
  private extractSemanticConcepts(message: string): string[] {
    // Extract key nouns, verbs, and adjectives
    const words = message.toLowerCase().split(/\s+/);
    return words.filter(word => word.length > 3 && !this.isStopWord(word));
  }

  private extractEntities(message: string): string[] {
    // Extract named entities (capitalized words)
    return message.match(/\b[A-Z][a-z]+\b/g) || [];
  }

  private extractConcepts(message: string): string[] {
    // Extract conceptual terms
    const concepts = [];
    const conceptPatterns = [
      /\b(work|job|career|business|company)\b/gi,
      /\b(family|home|house|personal|private)\b/gi,
      /\b(hobby|interest|passion|enjoy|love)\b/gi,
      /\b(problem|issue|difficulty|challenge)\b/gi,
      /\b(plan|goal|objective|target|aim)\b/gi
    ];

    for (const pattern of conceptPatterns) {
      const matches = message.match(pattern) || [];
      concepts.push(...matches);
    }

    return concepts;
  }

  private calculateSemanticSimilarity(message1: string, message2: string): number {
    // Simple word overlap similarity (in production, use embeddings)
    const words1 = new Set(message1.toLowerCase().split(/\s+/));
    const words2 = new Set(message2.toLowerCase().split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return intersection.size / union.size;
  }

  private calculateEmotionalAlignment(currentEmotion: string, memoryContent: string): number {
    const emotionalWords = {
      positive: ['love', 'enjoy', 'happy', 'excited', 'proud', 'grateful'],
      negative: ['hate', 'dislike', 'sad', 'frustrated', 'angry', 'disappointed'],
      excited: ['excited', 'thrilled', 'amazing', 'fantastic', 'incredible'],
      frustrated: ['frustrated', 'annoying', 'difficult', 'struggle', 'problem'],
      confused: ['confused', 'unclear', 'uncertain', 'puzzled'],
      neutral: ['normal', 'regular', 'usual', 'typical']
    };

    const targetWords = emotionalWords[currentEmotion as keyof typeof emotionalWords] || [];
    const contentLower = memoryContent.toLowerCase();
    const matches = targetWords.filter(word => contentLower.includes(word)).length;
    return Math.min(1.0, matches / targetWords.length);
  }

  private calculateTemporalRelevance(temporalContext: string, memory: any): number {
    // Simple temporal scoring based on keywords
    const content = (memory.content || memory.value || '').toLowerCase();
    const temporalIndicators = {
      recent: ['today', 'recently', 'now', 'currently', 'latest', 'new'],
      ongoing: ['always', 'usually', 'often', 'continuing', 'regular', 'habit'],
      historical: ['before', 'previously', 'used to', 'in the past', 'history']
    };

    const indicators = temporalIndicators[temporalContext as keyof typeof temporalIndicators] || [];
    const matches = indicators.filter(indicator => content.includes(indicator)).length;
    return Math.min(1.0, matches / indicators.length);
  }

  private calculateAssociativeStrength(concepts: string[], memoryContent: string): number {
    const contentLower = memoryContent.toLowerCase();
    const matches = concepts.filter(concept => contentLower.includes(concept.toLowerCase())).length;
    return Math.min(1.0, matches / concepts.length);
  }

  private calculateConversationalRelevance(context: any, memory: any): number {
    // Score based on topic and context similarity
    if (!context?.topic) return 0.5;
    
    const content = (memory.content || memory.value || '').toLowerCase();
    const topic = context.topic.toLowerCase();
    
    return content.includes(topic) ? 0.8 : 0.3;
  }

  private isStopWord(word: string): boolean {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'this', 'that', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'];
    return stopWords.includes(word.toLowerCase());
  }

  private generateContentHash(content: string): string {
    // Simple hash for deduplication
    return content.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private calculateRecallQuality(memories: RecalledMemory[]): number {
    if (memories.length === 0) return 0;
    const avgRelevance = memories.reduce((sum, mem) => sum + mem.relevanceScore, 0) / memories.length;
    return avgRelevance;
  }

  private calculateContextualRelevance(memories: RecalledMemory[], currentMessage: string): number {
    if (memories.length === 0) return 0;
    const avgSemantic = memories.reduce((sum, mem) => sum + mem.semanticSimilarity, 0) / memories.length;
    return avgSemantic;
  }

  private determineRecallStrategy(memories: RecalledMemory[]): string {
    if (memories.length === 0) return 'none';
    
    // Determine primary strategy based on highest scoring memories
    const topMemory = memories[0];
    if (topMemory.semanticSimilarity > 0.7) return 'semantic_dominant';
    if (topMemory.emotionalAlignment > 0.7) return 'emotional_dominant';
    if (topMemory.temporalRelevance > 0.7) return 'temporal_dominant';
    if (topMemory.associativeStrength > 0.7) return 'associative_dominant';
    return 'hybrid_strategy';
  }

  /**
   * Update access statistics for recalled memories
   */
  private async updateAccessStatistics(memories: RecalledMemory[], userId: string): Promise<void> {
    // In a real implementation, update access counts and last accessed times in database
    console.log(`📊 EpisodicRetrievalSystem: Updated access stats for ${memories.length} memories for user ${userId}`);
  }
}

export const episodicRetrievalSystem = EpisodicRetrievalSystem.getInstance();

// Export with both names for backward compatibility during transition
export const recallMachine = episodicRetrievalSystem;





