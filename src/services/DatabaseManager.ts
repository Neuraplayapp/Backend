// Database Manager - Centralized database operations with cross-chat knowledge
// State-of-the-art database service for NeuraPlay AI Platform

export interface DatabaseQuery {
  action: 'save' | 'get' | 'delete' | 'search';
  collection: string;
  data?: any;
  key?: string;
  filters?: any;
}

export interface CrossChatSearchOptions {
  userId: string;
  query: string;
  limit?: number;
  timeRange?: string;
  includeContext?: boolean;
}

export interface KnowledgeSearchResult {
  messages: Array<{
    content: string;
    timestamp: string;
    sessionId: string;
    context?: any;
    relevanceScore?: number;
  }>;
  totalFound: number;
  searchTime: number;
}

export class DatabaseManager {
  private static instance: DatabaseManager;
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/api';
  }

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Execute database query with error handling
   */
  async executeQuery(query: DatabaseQuery): Promise<any> {
    try {
      // Query: ${query.action} ${query.collection}
      
      const response = await fetch(`${this.baseUrl}/database`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Database query failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return result;
      
    } catch (error) {
      console.error('❌ DatabaseManager: Query failed:', error);
      throw error;
    }
  }

  /**
   * Save user data and sync with database
   */
  async saveUserData(userData: any): Promise<boolean> {
    try {
      await this.executeQuery({
        action: 'save',
        collection: 'users',
        data: userData
      });
      
      console.log('✅ User data synchronized with database');
      return true;
    } catch (error) {
      console.error('❌ Failed to save user data:', error);
      return false;
    }
  }

  /**
   * Get user data from database
   */
  async getUserData(userId: string): Promise<any | null> {
    try {
      const result = await this.executeQuery({
        action: 'get',
        collection: 'users',
        key: userId
      });
      
      return result && result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('❌ Failed to get user data:', error);
      return null;
    }
  }

  /**
   * Log AI interaction for cross-chat knowledge
   */
  async logAIInteraction(data: {
    userId: string;
    sessionId: string;
    input: string;
    output: string;
    toolsUsed?: string[];
    responseTime?: number;
  }): Promise<void> {
    try {
      await this.executeQuery({
        action: 'save',
        collection: 'ai_logs',
        data: {
          id: `ai_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          userId: data.userId,
          sessionId: data.sessionId,
          interactionType: 'chat',
          input: data.input,
          output: data.output,
          toolsUsed: data.toolsUsed || [],
          responseTime: data.responseTime || 0
        }
      });
      
      console.log('✅ AI interaction logged for knowledge system');
    } catch (error) {
      console.error('❌ Failed to log AI interaction:', error);
    }
  }

  /**
   * Store conversation context for cross-chat retrieval
   */
  async storeConversationContext(data: {
    sessionId: string;
    userId: string;
    contextType: string;
    contextKey: string;
    contextValue: any;
    tags?: string[];
  }): Promise<void> {
    try {
      await this.executeQuery({
        action: 'save',
        collection: 'context_store',
        data: {
          id: `ctx_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          sessionId: data.sessionId,
          contextType: data.contextType,
          contextKey: data.contextKey,
          contextValue: data.contextValue,
          tags: data.tags || []
        }
      });
      
      console.log('✅ Context stored for cross-chat retrieval');
    } catch (error) {
      console.error('❌ Failed to store context:', error);
    }
  }

  // ===== NEUROPSYCHOLOGICAL COGNITIVE MODULES INTEGRATION =====

  /**
   * Store Error Detection Pattern (Anterior Cingulate Cortex)
   */
  async storeErrorDetectionPattern(data: {
    userId: string;
    sessionId: string;
    errorType: 'conflict' | 'correction' | 'misunderstanding' | 'contradiction';
    confidence: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    cognitiveMarkers: any;
    errorLocation?: any;
  }): Promise<void> {
    try {
      await this.executeQuery({
        action: 'save',
        collection: 'error_detection_patterns',
        data: {
          id: crypto.randomUUID(), // ✅ FIX: Use proper UUID format
          ...data,
          created_at: new Date().toISOString()
        }
      });
      console.log('🧠 Error detection pattern stored');
    } catch (error) {
      console.error('❌ Failed to store error detection pattern:', error);
    }
  }

  /**
   * Store Mental State Model (Temporoparietal Junction)
   */
  async storeMentalStateModel(data: {
    userId: string;
    sessionId: string;
    messageId: string;
    intendedMeaning: string;
    expressedMeaning: string;
    beliefState: any;
    intentionalStance: any;
    communicativeIntent: any;
    correctionAnalysis?: any;
  }): Promise<void> {
    try {
      await this.executeQuery({
        action: 'save',
        collection: 'mental_state_models',
        data: {
          id: `mental_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          intended_meaning: data.intendedMeaning,
          expressed_meaning: data.expressedMeaning,
          belief_state: data.beliefState,
          intentional_stance: data.intentionalStance,
          communicative_intent: data.communicativeIntent,
          correction_analysis: data.correctionAnalysis,
          user_id: data.userId,
          session_id: data.sessionId,
          message_id: data.messageId,
          confidence_score: 0.8,
          created_at: new Date().toISOString()
        }
      });
      console.log('🧠 Mental state model stored');
    } catch (error) {
      console.error('❌ Failed to store mental state model:', error);
    }
  }

  /**
   * Store Episodic Memory (Hippocampus)
   */
  async storeEpisodicMemory(data: {
    userId: string;
    memoryId: string;
    content: string;
    memoryType: 'episodic' | 'semantic' | 'procedural' | 'emotional';
    context: any;
    emotionalWeight: number;
    importanceScore: number;
    associativeLinks?: string[];
    retrievalCues?: string[];
  }): Promise<void> {
    try {
      await this.executeQuery({
        action: 'save',
        collection: 'episodic_memories',
        data: {
          id: `episodic_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          user_id: data.userId,
          memory_id: data.memoryId,
          content: data.content,
          memory_type: data.memoryType,
          context: data.context,
          emotional_weight: data.emotionalWeight,
          importance_score: data.importanceScore,
          temporal_relevance: 'recent',
          memory_strength: 1.0,
          associative_links: data.associativeLinks || [],
          retrieval_cues: data.retrievalCues || [],
          access_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });
      console.log('🧠 Episodic memory stored');
    } catch (error) {
      console.error('❌ Failed to store episodic memory:', error);
    }
  }

  /**
   * Store Semantic Memory (Temporal Lobe)
   */
  async storeSemanticMemory(data: {
    userId: string;
    semanticType: 'personal' | 'preference' | 'emotional' | 'factual' | 'relational' | 'temporal' | 'professional' | 'behavioral';
    category: string;
    subcategory?: string;
    content: string;
    rawSentence: string;
    confidence: number;
    emotionalWeight: number;
    temporalRelevance: number;
    importance: number;
    relationships?: string[];
    contradicts?: string[];
    context: any;
    metadata: any;
  }): Promise<void> {
    try {
      await this.executeQuery({
        action: 'save',
        collection: 'semantic_memories',
        data: {
          id: `semantic_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          user_id: data.userId,
          semantic_type: data.semanticType,
          category: data.category,
          subcategory: data.subcategory,
          content: data.content,
          raw_sentence: data.rawSentence,
          confidence: data.confidence,
          emotional_weight: data.emotionalWeight,
          temporal_relevance: data.temporalRelevance,
          importance: data.importance,
          relationships: data.relationships || [],
          contradicts: data.contradicts || [],
          context: data.context,
          metadata: data.metadata,
          conflict_resolved: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });
      console.log('🧠 Semantic memory stored');
    } catch (error) {
      console.error('❌ Failed to store semantic memory:', error);
    }
  }

  /**
   * Store Canvas Preference Pattern
   */
  async storeCanvasPreference(data: {
    userId: string;
    preferenceType: 'activation_pattern' | 'content_type_preference' | 'frustration_pattern';
    patternData: any;
    confidence: number;
    positiveInteractions: number;
    negativeInteractions: number;
  }): Promise<void> {
    try {
      await this.executeQuery({
        action: 'save',
        collection: 'canvas_preferences',
        data: {
          id: `canvas_pref_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          user_id: data.userId,
          preference_type: data.preferenceType,
          pattern_data: data.patternData,
          confidence: data.confidence,
          usage_frequency: 1,
          positive_interactions: data.positiveInteractions,
          negative_interactions: data.negativeInteractions,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });
      console.log('🧠 Canvas preference stored');
    } catch (error) {
      console.error('❌ Failed to store canvas preference:', error);
    }
  }

  /**
   * Track Cognitive State
   */
  async trackCognitiveState(data: {
    userId: string;
    sessionId: string;
    cognitiveLoad: number;
    emotionalState: string;
    confusionLevel: number;
    attentionSpan: number;
    learningMomentum: number;
    errorFrequency: number;
    correctionAttempts: number;
    sessionQuality: number;
  }): Promise<void> {
    try {
      await this.executeQuery({
        action: 'save',
        collection: 'cognitive_states',
        data: {
          id: `cognitive_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          user_id: data.userId,
          session_id: data.sessionId,
          cognitive_load: data.cognitiveLoad,
          emotional_state: data.emotionalState,
          confusion_level: data.confusionLevel,
          attention_span: data.attentionSpan,
          learning_momentum: data.learningMomentum,
          error_frequency: data.errorFrequency,
          correction_attempts: data.correctionAttempts,
          session_quality: data.sessionQuality,
          measured_at: new Date().toISOString()
        }
      });
      console.log('🧠 Cognitive state tracked');
    } catch (error) {
      console.error('❌ Failed to track cognitive state:', error);
    }
  }

  /**
   * Retrieve Episodic Memories for Contextual Recall
   */
  async retrieveEpisodicMemories(userId: string, filters?: {
    memoryType?: string;
    importanceThreshold?: number;
    timeRange?: string;
    limit?: number;
  }): Promise<any[]> {
    try {
      const result = await this.executeQuery({
        action: 'get',
        collection: 'episodic_memories',
        filters: {
          user_id: userId,
          ...filters
        }
      });
      return Array.isArray(result) ? result : [result].filter(Boolean);
    } catch (error) {
      console.error('❌ Failed to retrieve episodic memories:', error);
      return [];
    }
  }

  /**
   * Retrieve Semantic Memories by Category
   */
  async retrieveSemanticMemories(userId: string, filters?: {
    semanticType?: string;
    category?: string;
    importanceThreshold?: number;
    limit?: number;
  }): Promise<any[]> {
    try {
      const result = await this.executeQuery({
        action: 'get',
        collection: 'semantic_memories',
        filters: {
          user_id: userId,
          ...filters
        }
      });
      return Array.isArray(result) ? result : [result].filter(Boolean);
    } catch (error) {
      console.error('❌ Failed to retrieve semantic memories:', error);
      return [];
    }
  }

  /**
   * Retrieve Canvas Preferences for Activation Learning
   */
  async retrieveCanvasPreferences(userId: string, preferenceType?: string): Promise<any[]> {
    try {
      const result = await this.executeQuery({
        action: 'get',
        collection: 'canvas_preferences',
        filters: {
          user_id: userId,
          ...(preferenceType && { preference_type: preferenceType })
        }
      });
      return Array.isArray(result) ? result : [result].filter(Boolean);
    } catch (error) {
      console.error('❌ Failed to retrieve canvas preferences:', error);
      return [];
    }
  }

  /**
   * Cross-chat knowledge search
   */
  async searchCrossChat(options: CrossChatSearchOptions): Promise<KnowledgeSearchResult> {
    const startTime = Date.now();
    
    try {
      console.log('🔍 DatabaseManager: Searching cross-chat knowledge for:', options.query);
      
      // Search AI logs for relevant interactions
      const aiLogs = await this.executeQuery({
        action: 'get',
        collection: 'ai_logs',
        key: options.userId,
        filters: {
          interactionType: 'chat'
        }
      });

      // Search conversations
      const conversations = await this.executeQuery({
        action: 'get',
        collection: 'conversations',
        key: options.userId
      });

      // Search context store
      const contexts = await this.executeQuery({
        action: 'get',
        collection: 'context_store',
        filters: {
          // We can search by context type or tags
        }
      });

      // Simple text-based relevance scoring
      const searchTerms = options.query.toLowerCase().split(' ');
      const relevantMessages: any[] = [];

      // Process AI logs
      if (aiLogs && Array.isArray(aiLogs)) {
        aiLogs.forEach((log: any) => {
          const inputText = (log.input || '').toLowerCase();
          const outputText = (log.output || '').toLowerCase();
          const combinedText = `${inputText} ${outputText}`;
          
          const relevanceScore = this.calculateRelevance(combinedText, searchTerms);
          
          if (relevanceScore > 0.3) { // Relevance threshold
            relevantMessages.push({
              content: `Q: ${log.input}\nA: ${log.output}`,
              timestamp: log.timestamp,
              sessionId: log.session_id,
              relevanceScore,
              type: 'ai_interaction'
            });
          }
        });
      }

      // Process conversations
      if (conversations && Array.isArray(conversations)) {
        conversations.forEach((conv: any) => {
          if (conv.messages && Array.isArray(conv.messages)) {
            conv.messages.forEach((msg: any) => {
              const messageText = (msg.text || '').toLowerCase();
              const relevanceScore = this.calculateRelevance(messageText, searchTerms);
              
              if (relevanceScore > 0.3) {
                relevantMessages.push({
                  content: msg.text,
                  timestamp: msg.timestamp,
                  sessionId: conv.id,
                  relevanceScore,
                  type: 'conversation'
                });
              }
            });
          }
        });
      }

      // Sort by relevance and limit results
      relevantMessages.sort((a, b) => b.relevanceScore - a.relevanceScore);
      const limitedResults = relevantMessages.slice(0, options.limit || 20);

      const searchTime = Date.now() - startTime;

      return {
        messages: limitedResults,
        totalFound: relevantMessages.length,
        searchTime
      };

    } catch (error) {
      console.error('❌ Cross-chat search failed:', error);
      return {
        messages: [],
        totalFound: 0,
        searchTime: Date.now() - startTime
      };
    }
  }

  /**
   * Simple relevance scoring for text search
   */
  private calculateRelevance(text: string, searchTerms: string[]): number {
    let score = 0;
    const textWords = text.split(' ');
    
    searchTerms.forEach(term => {
      if (text.includes(term)) {
        score += 0.5; // Base score for containing the term
        
        // Bonus for exact word match
        if (textWords.includes(term)) {
          score += 0.3;
        }
        
        // Bonus for term frequency
        const frequency = (text.match(new RegExp(term, 'g')) || []).length;
        score += Math.min(frequency * 0.1, 0.2);
      }
    });
    
    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Get user usage statistics from database
   */
  async getUserUsageStats(userId: string): Promise<any> {
    try {
      const userData = await this.getUserData(userId);
      return userData?.usage || null;
    } catch (error) {
      console.error('❌ Failed to get usage stats:', error);
      return null;
    }
  }

  /**
   * Update user usage in database
   */
  async updateUserUsage(userId: string, usageData: any): Promise<boolean> {
    try {
      const userData = await this.getUserData(userId);
      if (userData) {
        userData.usage = usageData;
        await this.saveUserData(userData);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to update usage:', error);
      return false;
    }
  }

  /**
   * Check database connectivity
   */
  async isConnected(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // === STATE-OF-THE-ART NPU INTEGRATION METHODS ===

  /**
   * Save NPU analysis to database
   */
  async saveNPUAnalysis(analysis: any): Promise<void> {
    console.log('🧠 DatabaseManager: Saving NPU analysis:', analysis.id);
    await this.executeQuery({
      action: 'save',
      collection: 'npu_analyses',
      data: analysis
    });
  }

  /**
   * Get NPU analytics for user
   */
  async getNPUAnalytics(userId: string, timeRange = '24h'): Promise<any> {
    console.log('📈 DatabaseManager: Getting NPU analytics for user:', userId);
    return await this.executeQuery({
      action: 'get',
      collection: 'npu_analyses',
      key: userId,
      filters: { timeRange }
    });
  }

  /**
   * Save cross-chat knowledge
   */
  async saveCrossChatKnowledge(knowledge: any): Promise<void> {
    console.log('🧩 DatabaseManager: Saving cross-chat knowledge:', knowledge.id);
    await this.executeQuery({
      action: 'save',
      collection: 'cross_chat_knowledge',
      data: knowledge
    });
  }

  /**
   * Retrieve cross-chat knowledge for user
   */
  async getCrossChatKnowledge(userId: string, query?: string, limit = 20): Promise<any[]> {
    console.log('🔍 DatabaseManager: Retrieving cross-chat knowledge for:', userId);
    
    const filters: any = {};
    if (query) {
      filters.contentSearch = query;
    }
    if (limit) {
      filters.limit = limit;
    }
    
    const result = await this.executeQuery({
      action: 'get',
      collection: 'cross_chat_knowledge',
      key: userId,
      filters
    });
    
    return Array.isArray(result) ? result : [];
  }

  /**
   * Save user behavior pattern
   */
  async saveBehaviorPattern(pattern: any): Promise<void> {
    console.log('🎯 DatabaseManager: Saving behavior pattern:', pattern.id);
    await this.executeQuery({
      action: 'save',
      collection: 'user_behavior_patterns',
      data: pattern
    });
  }

  /**
   * Get user behavior patterns
   */
  async getBehaviorPatterns(userId: string): Promise<any[]> {
    console.log('📊 DatabaseManager: Getting behavior patterns for:', userId);
    const result = await this.executeQuery({
      action: 'get',
      collection: 'user_behavior_patterns',
      key: userId
    });
    
    return Array.isArray(result) ? result : [];
  }

  /**
   * Sync user usage limits with database
   */
  async syncUserUsage(userId: string, usageData: any): Promise<void> {
    console.log('🔄 DatabaseManager: Syncing user usage:', userId);
    
    // CRITICAL: Convert username to UUID if needed before database save
    let resolvedUserId = userId;
    if (userId && userId !== 'anonymous' && !this.isValidUUID(userId)) {
      // Look up the actual UUID for this username
      try {
        const userResult = await this.executeQuery({
          action: 'get',
          collection: 'users',
          filters: { username: userId }
        });
        
        if (userResult && userResult.length > 0) {
          resolvedUserId = userResult[0].id;
          console.log(`✅ DatabaseManager: Converted username ${userId} to UUID ${resolvedUserId}`);
        } else {
          console.warn(`⚠️ DatabaseManager: User not found for syncUserUsage: ${userId}`);
          return; // Don't sync if user doesn't exist
        }
      } catch (error) {
        console.error(`❌ DatabaseManager: Failed to resolve user ${userId}:`, error);
        return; // Don't sync if we can't resolve the user
      }
    }
    
    await this.executeQuery({
      action: 'save',
      collection: 'user_usage_sync',
      data: {
        user_id: resolvedUserId, // Now using proper UUID
        ai_prompts_count: usageData.aiPrompts || 0,
        image_gen_count: usageData.imageGeneration || 0,
        voice_usage_count: usageData.voiceUsage || 0,
        last_sync: new Date().toISOString(),
        ...usageData
      }
    });
  }

  /**
   * Helper to validate UUID format
   */
  private isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Get user usage from database
   */
  async getUserUsageSync(userId: string): Promise<any> {
    console.log('📊 DatabaseManager: Getting user usage sync for:', userId);
    const result = await this.executeQuery({
      action: 'get',
      collection: 'user_usage_sync',
      key: userId
    });
    
    return Array.isArray(result) ? result[0] : null;
  }

  /**
   * Start intelligent session tracking
   */
  async startIntelligentSession(sessionData: any): Promise<void> {
    console.log('🎯 DatabaseManager: Starting intelligent session:', sessionData.id);
    await this.executeQuery({
      action: 'save',
      collection: 'intelligent_sessions',
      data: sessionData
    });
  }

  /**
   * Update intelligent session
   */
  async updateIntelligentSession(sessionId: string, updates: any): Promise<void> {
    console.log('🔄 DatabaseManager: Updating intelligent session:', sessionId);
    await this.executeQuery({
      action: 'save',
      collection: 'intelligent_sessions',
      data: {
        id: sessionId,
        ...updates
      }
    });
  }
}

// Export singleton instance
export const databaseManager = DatabaseManager.getInstance();
