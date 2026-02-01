// NPU Database Integration - State-of-the-Art tracking for 10-Layer Neural Processing Unit
// Real-time analytics, cross-chat knowledge, and intelligent session management

import { databaseManager } from './DatabaseManager';

export interface NPUAnalysis {
  requestId: string;
  userId: string;
  sessionId: string;
  
  // 10-Layer NPU breakdown
  layer1_linguistic: {
    components: any;
    processingTime: number;
  };
  layer2_intent: {
    primaryIntent: string;
    confidence: number;
    reasoning: string;
    processingTime: number;
  };
  layer3_context: {
    contextState: any;
    relevantHistory: string[];
    processingTime: number;
  };
  layer4_confusion: {
    confusionLevel: number;
    knowledgeGaps: string[];
    processingTime: number;
    cognitiveInsights: string[];  // NEW: Extractable insights for memory
    emotionalState: string;       // NEW: Emotional progression tracking
    domainContext: string;        // NEW: What domain user is working in
  };
  layer5_socratic: {
    questionsGenerated: string[];
    socraticEnabled: boolean;
    processingTime: number;
  };
  layer6_mode: {
    selectedMode: string;
    modeReasoning: string;
    processingTime: number;
  };
  layer7_canvas: {
    activationTriggered: boolean;
    activationReason: string;
    processingTime: number;
  };
  layer8_educational: {
    educationalContent: boolean;
    learningObjectives: string[];
    processingTime: number;
  };
  layer9_creative: {
    creativeContent: boolean;
    creativityScore: number;
    processingTime: number;
  };
  layer10_memory: {
    memoryRetrieved: any[];
    memoryStored: any[];
    processingTime: number;
  };
  
  // Overall metrics
  totalProcessingTime: number;
  timestamp: string;
  inputText: string;
  outputText: string;
  safetyFlags: string[];
  toolsExecuted: string[];
}

export interface UserBehaviorPattern {
  userId: string;
  patternType: 'learning_style' | 'interaction_preference' | 'confusion_triggers' | 'success_indicators';
  pattern: {
    description: string;
    frequency: number;
    confidence: number;
    examples: string[];
    recommendations: string[];
  };
  detectedAt: string;
  lastUpdated: string;
}

export interface CrossChatKnowledge {
  id: string;
  userId: string;
  sourceSessionId: string;
  knowledgeType: 'fact' | 'preference' | 'skill' | 'interest' | 'goal';
  content: string;
  context: any;
  relevanceScore: number;
  usageCount: number;
  lastAccessed: string;
  tags: string[];
  embedding?: number[]; // For semantic search
}

export class NPUDatabaseIntegration {
  private static instance: NPUDatabaseIntegration;
  
  static getInstance(): NPUDatabaseIntegration {
    if (!NPUDatabaseIntegration.instance) {
      NPUDatabaseIntegration.instance = new NPUDatabaseIntegration();
    }
    return NPUDatabaseIntegration.instance;
  }

  /**
   * Log complete NPU analysis for real-time tracking
   */
  async logNPUAnalysis(analysis: NPUAnalysis): Promise<void> {
    try {
      console.log('🧠 NPUDatabaseIntegration: Logging 10-layer analysis');
      
      // Ensure text fields don't exceed reasonable limits
      const truncateText = (text: string, maxLength: number = 5000): string => {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
      };
      
      // Store in npu_analyses table
      await databaseManager.executeQuery({
        action: 'save',
        collection: 'npu_analyses',
        data: {
          id: analysis.requestId || `npu_${Date.now()}`,
          userId: analysis.userId || 'anonymous',
          sessionId: analysis.sessionId || 'unknown',
          
          // Layer breakdown (stored as JSONB for complex queries)
          linguistic_analysis: analysis.layer1_linguistic || {},
          intent_analysis: analysis.layer2_intent || {},
          context_analysis: analysis.layer3_context || {},
          confusion_analysis: analysis.layer4_confusion || {},
          socratic_analysis: analysis.layer5_socratic || {},
          mode_analysis: analysis.layer6_mode || {},
          canvas_analysis: analysis.layer7_canvas || {},
          educational_analysis: analysis.layer8_educational || {},
          creative_analysis: analysis.layer9_creative || {},
          memory_analysis: analysis.layer10_memory || {},
          
          // Aggregated metrics - ensure text fields are truncated
          total_processing_time: analysis.totalProcessingTime || 0,
          input_text: truncateText(analysis.inputText),
          output_text: truncateText(analysis.outputText),
          safety_flags: analysis.safetyFlags || [],
          tools_executed: analysis.toolsExecuted || [],
          
          // Performance metrics for optimization
          performance_score: this.calculatePerformanceScore(analysis) || 0,
          complexity_score: this.calculateComplexityScore(analysis) || 0
          
          // timestamp is handled by database DEFAULT CURRENT_TIMESTAMP
        }
      });

      // Extract and store knowledge for cross-chat retrieval
      await this.extractKnowledgeFromAnalysis(analysis);
      
      // Update user behavior patterns
      await this.updateBehaviorPatterns(analysis);
      
      // NEW: Automatically extract cognitive insights into user memories
      await this.extractCognitiveInsightsToMemory(analysis);
      
      console.log('✅ NPU analysis logged successfully');
    } catch (error) {
      console.error('❌ Failed to log NPU analysis:', error);
      // Don't let NPU logging failure break the entire flow
      // This is analytics/logging, not core functionality
    }
  }

  /**
   * Extract cross-chat knowledge from NPU analysis
   */
  private async extractKnowledgeFromAnalysis(analysis: NPUAnalysis): Promise<void> {
    const knowledgeItems: CrossChatKnowledge[] = [];
    
    // Extract from layer 3 (context)
    if (analysis.layer3_context.relevantHistory.length > 0) {
      analysis.layer3_context.relevantHistory.forEach((item, index) => {
        knowledgeItems.push({
          id: `knowledge_${analysis.requestId}_context_${index}`,
          userId: analysis.userId,
          sourceSessionId: analysis.sessionId,
          knowledgeType: 'fact',
          content: item,
          context: analysis.layer3_context.contextState,
          relevanceScore: 0.8,
          usageCount: 1,
          lastAccessed: analysis.timestamp,
          tags: ['context', 'history']
        });
      });
    }
    
    // Extract from layer 8 (educational)
    if (analysis.layer8_educational.learningObjectives.length > 0) {
      analysis.layer8_educational.learningObjectives.forEach((objective, index) => {
        knowledgeItems.push({
          id: `knowledge_${analysis.requestId}_learning_${index}`,
          userId: analysis.userId,
          sourceSessionId: analysis.sessionId,
          knowledgeType: 'goal',
          content: objective,
          context: { educational: true },
          relevanceScore: 0.9,
          usageCount: 1,
          lastAccessed: analysis.timestamp,
          tags: ['learning', 'objective', 'educational']
        });
      });
    }
    
    // Store knowledge items
    for (const item of knowledgeItems) {
      try {
        await databaseManager.executeQuery({
          action: 'save',
          collection: 'cross_chat_knowledge',
          data: item
        });
      } catch (error) {
        console.error('Failed to store knowledge item:', error);
      }
    }
  }

  /**
   * Update user behavior patterns based on NPU analysis
   */
  private async updateBehaviorPatterns(analysis: NPUAnalysis): Promise<void> {
    const patterns: UserBehaviorPattern[] = [];
    
    // Detect confusion patterns
    if (analysis.layer4_confusion.confusionLevel > 0.7) {
      patterns.push({
        userId: analysis.userId,
        patternType: 'confusion_triggers',
        pattern: {
          description: `High confusion detected in: ${analysis.layer2_intent.primaryIntent}`,
          frequency: 1,
          confidence: analysis.layer4_confusion.confusionLevel,
          examples: analysis.layer4_confusion.knowledgeGaps,
          recommendations: analysis.layer5_socratic.questionsGenerated
        },
        detectedAt: analysis.timestamp,
        lastUpdated: analysis.timestamp
      });
    }
    
    // Detect learning style preferences
    if (analysis.layer6_mode.selectedMode === 'socratic_chat') {
      patterns.push({
        userId: analysis.userId,
        patternType: 'learning_style',
        pattern: {
          description: 'Prefers socratic learning approach',
          frequency: 1,
          confidence: 0.8,
          examples: [analysis.inputText],
          recommendations: ['Continue with question-based learning', 'Encourage deeper thinking']
        },
        detectedAt: analysis.timestamp,
        lastUpdated: analysis.timestamp
      });
    }
    
    // Store patterns
    for (const pattern of patterns) {
      try {
        await databaseManager.executeQuery({
          action: 'save',
          collection: 'user_behavior_patterns',
          data: {
            id: `pattern_${pattern.userId}_${pattern.patternType}_${Date.now()}`,
            ...pattern
          }
        });
      } catch (error) {
        console.error('Failed to store behavior pattern:', error);
      }
    }
  }

  /**
   * Retrieve cross-chat knowledge for user
   */
  async retrieveUserKnowledge(userId: string, query?: string, limit = 20): Promise<CrossChatKnowledge[]> {
    try {
      const filters: any = {};
      
      if (query) {
        // Simple text search - in production, use vector similarity
        filters.contentSearch = query;
      }
      
      const result = await databaseManager.executeQuery({
        action: 'get',
        collection: 'cross_chat_knowledge',
        key: userId,
        filters
      });
      
      return Array.isArray(result) ? result.slice(0, limit) : [];
    } catch (error) {
      console.error('❌ Failed to retrieve knowledge:', error);
      return [];
    }
  }

  /**
   * Get user behavior patterns
   */
  async getUserBehaviorPatterns(userId: string): Promise<UserBehaviorPattern[]> {
    try {
      const result = await databaseManager.executeQuery({
        action: 'get',
        collection: 'user_behavior_patterns',
        key: userId
      });
      
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('❌ Failed to get behavior patterns:', error);
      return [];
    }
  }

  /**
   * Get NPU performance analytics
   */
  async getNPUAnalytics(userId: string, timeRange = '24h'): Promise<any> {
    try {
      const result = await databaseManager.executeQuery({
        action: 'get',
        collection: 'npu_analyses',
        key: userId,
        filters: {
          timeRange
        }
      });
      
      if (!Array.isArray(result) || result.length === 0) {
        return {
          totalRequests: 0,
          averageProcessingTime: 0,
          intentDistribution: {},
          performanceScore: 0
        };
      }
      
      // Calculate analytics
      const analytics = {
        totalRequests: result.length,
        averageProcessingTime: result.reduce((sum, item) => sum + (item.total_processing_time || 0), 0) / result.length,
        intentDistribution: this.calculateIntentDistribution(result),
        performanceScore: result.reduce((sum, item) => sum + (item.performance_score || 0), 0) / result.length,
        layerPerformance: this.calculateLayerPerformance(result)
      };
      
      return analytics;
    } catch (error) {
      console.error('❌ Failed to get NPU analytics:', error);
      return null;
    }
  }

  /**
   * Calculate performance score for NPU analysis
   */
  private calculatePerformanceScore(analysis: NPUAnalysis): number {
    let score = 100;
    
    // Penalize for high processing time
    if (analysis.totalProcessingTime > 3000) score -= 20;
    else if (analysis.totalProcessingTime > 1500) score -= 10;
    
    // Bonus for high confidence intent detection
    if (analysis.layer2_intent.confidence > 0.9) score += 10;
    else if (analysis.layer2_intent.confidence < 0.6) score -= 15;
    
    // Bonus for successful tool execution
    if (analysis.toolsExecuted.length > 0) score += 5;
    
    // Penalize for safety flags
    score -= analysis.safetyFlags.length * 10;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate complexity score for request
   */
  private calculateComplexityScore(analysis: NPUAnalysis): number {
    let complexity = 0;
    
    // Input length complexity
    complexity += Math.min(analysis.inputText.length / 100, 5);
    
    // Tools used complexity
    complexity += analysis.toolsExecuted.length * 2;
    
    // Context complexity
    if (analysis.layer3_context.relevantHistory.length > 0) complexity += 3;
    
    // Creative/educational complexity
    if (analysis.layer8_educational.educationalContent) complexity += 2;
    if (analysis.layer9_creative.creativeContent) complexity += 2;
    
    return Math.min(complexity, 10);
  }

  /**
   * Calculate intent distribution from analytics
   */
  private calculateIntentDistribution(analyses: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    analyses.forEach(analysis => {
      const intent = analysis.intent_analysis?.primaryIntent || 'unknown';
      distribution[intent] = (distribution[intent] || 0) + 1;
    });
    
    return distribution;
  }

  /**
   * Calculate layer-by-layer performance
   */
  private calculateLayerPerformance(analyses: any[]): Record<string, number> {
    const layers = [
      'linguistic', 'intent', 'context', 'confusion', 'socratic',
      'mode', 'canvas', 'educational', 'creative', 'memory'
    ];
    
    const performance: Record<string, number> = {};
    
    layers.forEach(layer => {
      const avgTime = analyses.reduce((sum, analysis) => {
        return sum + (analysis[`${layer}_analysis`]?.processingTime || 0);
      }, 0) / analyses.length;
      
      performance[layer] = avgTime;
    });
    
    return performance;
  }

  /**
   * NEW: Automatically extract cognitive insights into user_memories
   * This is the key method that implements the neurocognitive tracking
   */
  private async extractCognitiveInsightsToMemory(analysis: NPUAnalysis): Promise<void> {
    try {
      console.log('🧠 Extracting cognitive insights to memory...');
      
      const insights = analysis.layer4_confusion.cognitiveInsights || [];
      const emotionalState = analysis.layer4_confusion.emotionalState;
      const domain = analysis.layer4_confusion.domainContext;
      
      if (insights.length === 0 && emotionalState === 'neutral') {
        return; // Nothing significant to store
      }
      
      // Store each cognitive insight as a memory
      for (const insight of insights) {
        const memoryKey = this.generateMemoryKey(insight, domain);
        
        await this.storeUserMemory(analysis.userId, memoryKey, insight, {
          domain,
          emotionalState,
          sessionId: analysis.sessionId,
          timestamp: analysis.timestamp,
          confusionLevel: analysis.layer4_confusion.confusionLevel,
          source: 'npu_cognitive_analysis'
        });
      }
      
      // Store domain progression tracking
      if (domain !== 'general') {
        const progressionKey = `domain_progression_${domain}`;
        const progressionValue = `Currently ${emotionalState} about ${domain} (confusion level: ${analysis.layer4_confusion.confusionLevel.toFixed(2)})`;
        
        await this.storeUserMemory(analysis.userId, progressionKey, progressionValue, {
          domain,
          emotionalState,
          masteryLevel: this.inferMasteryLevel(analysis.layer4_confusion.confusionLevel, emotionalState),
          sessionId: analysis.sessionId,
          timestamp: analysis.timestamp,
          source: 'npu_domain_tracking'
        });
      }
      
      console.log(`✅ Stored ${insights.length} cognitive insights for user ${analysis.userId}`);
      
    } catch (error) {
      console.error('❌ Failed to extract cognitive insights to memory:', error);
    }
  }

  /**
   * Store insight in user_memories table via memory API
   */
  private async storeUserMemory(userId: string, key: string, value: string, context: any): Promise<void> {
    try {
      const response = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'store',
          userId,
          key,
          value,
          context
        })
      });
      
      if (!response.ok) {
        throw new Error(`Memory API failed: ${response.status}`);
      }
      
    } catch (error) {
      console.error('❌ Failed to store user memory:', error);
    }
  }

  /**
   * Generate appropriate memory key for cognitive insight
   */
  private generateMemoryKey(insight: string, domain: string): string {
    const cleanInsight = insight.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
    
    return `cognitive_${domain}_${cleanInsight}`;
  }

  /**
   * Infer mastery level from confusion and emotional state
   */
  private inferMasteryLevel(confusionLevel: number, emotionalState: string): string {
    if (emotionalState === 'scared' || emotionalState === 'frustrated') return 'struggling';
    if (emotionalState === 'confused' || confusionLevel > 0.7) return 'confused';
    if (emotionalState === 'exploring' || confusionLevel > 0.3) return 'exploring';
    if (emotionalState === 'confident' || confusionLevel < 0.2) return 'understanding';
    return 'learning';
  }

  /**
   * NEW: Retrieve cognitive context for NPU enhancement
   * This makes past insights influence current NPU processing
   */
  async getCognitiveContextForNPU(userId: string, domain: string): Promise<any> {
    try {
      console.log(`🧠 Retrieving cognitive context for ${userId} in ${domain} domain`);
      
      // Get domain-specific memories
      const response = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search',
          userId,
          query: domain
        })
      });
      
      if (!response.ok) {
        return { newUser: true };
      }
      
      const memoryResult = await response.json();
      const memories = memoryResult.memories || [];
      
      // Parse cognitive insights from memories
      const domainMemories = memories.filter((m: any) => 
        m.memory_key.includes(`cognitive_${domain}`) || 
        m.memory_key.includes(`domain_progression_${domain}`)
      );
      
      if (domainMemories.length === 0) {
        return { newToDomain: true, domain };
      }
      
      // Extract current state from most recent memories
      const cognitiveContext = {
        domain,
        hasHistory: true,
        struggles: [] as string[],
        preferences: [] as string[],
        emotionalProgression: [] as Array<{ state: string; timestamp: string }>,
        masteryLevel: 'exploring'
      };
      
      domainMemories.forEach((memory: any) => {
        const content = memory.content || memory.memory_value;
        const context = memory.context || {};
        
        if (content.includes('struggles with') || content.includes('difficulty with')) {
          cognitiveContext.struggles.push(content);
        }
        
        if (content.includes('prefers') || content.includes('learns well with')) {
          cognitiveContext.preferences.push(content);
        }
        
        if (context.emotionalState) {
          cognitiveContext.emotionalProgression.push({
            state: context.emotionalState,
            timestamp: context.timestamp
          });
        }
        
        if (context.masteryLevel) {
          cognitiveContext.masteryLevel = context.masteryLevel;
        }
      });
      
      console.log('✅ Retrieved cognitive context:', cognitiveContext);
      return cognitiveContext;
      
    } catch (error) {
      console.error('❌ Failed to get cognitive context:', error);
      return { error: true };
    }
  }
}

// Export singleton
export const npuDatabaseIntegration = NPUDatabaseIntegration.getInstance();