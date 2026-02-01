/**
 * 🧠 DYNAMIC SOCRATIC CONTEXT SERVICE
 * 
 * STATE-OF-THE-ART Socratic learning that leverages the full vector infrastructure.
 * 
 * KEY PRINCIPLES:
 * - NO STATIC INTERCEPTION of LLM - everything is DYNAMIC context injection
 * - FULL HNSW vector search across ALL memory categories
 * - Cross-persistent memories retrieved and placed contextually
 * - GPT-OSS 120b powered with vectorized semantic understanding
 * - Modular - enhances ChatHandler without breaking existing flows
 * 
 * ARCHITECTURE:
 * 1. Retrieves ALL relevant memories via HNSW (not just "learning" category)
 * 2. Builds dynamic context from cross-chat knowledge, behavior patterns
 * 3. Generates vectorized Socratic prompts based on learner state
 * 4. Injects context into LLM prompt - LLM does the thinking, not static logic
 */

import { memoryDatabaseBridge } from './MemoryDatabaseBridge';
import { npuDatabaseIntegration } from './NPUDatabaseIntegration';
import { learningProgressContextService } from './LearningProgressContextService';
import { unifiedPreferenceManager } from './UnifiedPreferenceManager';

// Types for dynamic Socratic context
export interface DynamicSocraticContext {
  // Core learning state
  learnerState: {
    comprehensionLevel: number;
    currentDomain: string;
    emotionalProgression: string[];
    masteryLevel: 'novice' | 'exploring' | 'understanding' | 'applying' | 'mastering';
  };
  
  // Retrieved from HNSW across ALL categories
  relevantKnowledge: {
    facts: string[];
    preferences: string[];
    struggles: string[];
    successes: string[];
    emotionalPatterns: string[];
    goals: string[];
    crossChatInsights: string[];
  };
  
  // Dynamic Socratic prompt components
  socraticGuidance: {
    phase: 'elenchus' | 'aporia' | 'maieutics' | 'anamnesis';
    approach: string;
    suggestedQuestions: string[];
    avoidPatterns: string[];
    personalizationNotes: string;
  };
  
  // For context injection into LLM
  contextPrompt: string;
  timestamp: string;
}

export interface SocraticQueryResult {
  success: boolean;
  context: DynamicSocraticContext | null;
  source: string;
  processingTime: number;
}

class DynamicSocraticContextService {
  private static instance: DynamicSocraticContextService;
  private contextCache: Map<string, { context: DynamicSocraticContext; expiry: number }> = new Map();
  private cacheTimeout = 60000; // 1 minute cache

  static getInstance(): DynamicSocraticContextService {
    if (!DynamicSocraticContextService.instance) {
      DynamicSocraticContextService.instance = new DynamicSocraticContextService();
    }
    return DynamicSocraticContextService.instance;
  }

  /**
   * 🎯 MAIN ENTRY POINT: Build dynamic Socratic context for a learning interaction
   * 
   * This retrieves ALL relevant memories via HNSW, not just learning ones.
   * Everything is vectorized and placed contextually.
   */
  async buildSocraticContext(
    userId: string,
    currentMessage: string,
    moduleId?: string,
    _sessionId?: string  // Reserved for future session-specific context
  ): Promise<SocraticQueryResult> {
    const startTime = Date.now();
    
    try {
      console.log('🧠 DynamicSocraticContext: Building context via HNSW for user:', userId);
      
      // Check cache first
      const cacheKey = `${userId}_${moduleId || 'general'}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log('🚀 DynamicSocraticContext: Using cached context');
        return { success: true, context: cached, source: 'cache', processingTime: Date.now() - startTime };
      }

      // 1. 🔍 HNSW VECTOR SEARCH - Retrieve ALL relevant memories across categories
      const allRelevantKnowledge = await this.retrieveAllRelevantKnowledge(userId, currentMessage, moduleId);
      
      // 2. 🧠 NPU COGNITIVE CONTEXT - Get behavior patterns and emotional progression
      // ⚠️ DISABLED: NPU causing repeated API calls
      // const cognitiveContext = await npuDatabaseIntegration.getCognitiveContextForNPU(userId, moduleId || 'learning');
      const cognitiveContext = { newUser: true }; // Return empty context to skip NPU calls
      
      // 3. 📊 LEARNING PROGRESS - Get module-specific progress if available
      const learningProgress = moduleId 
        ? await learningProgressContextService.getUserLearningContext(userId, moduleId)
        : null;
      
      // 4. 🎯 USER PREFERENCES - Get learning style preferences
      const preferences = await this.getLearningPreferences(userId);
      
      // 5. 🏗️ BUILD DYNAMIC CONTEXT - LLM will use this, not static logic
      const dynamicContext = await this.assembleDynamicContext(
        allRelevantKnowledge,
        cognitiveContext,
        learningProgress,
        preferences,
        currentMessage
      );
      
      // 6. 💾 CACHE for performance
      this.setCache(cacheKey, dynamicContext);
      
      console.log('✅ DynamicSocraticContext: Built context in', Date.now() - startTime, 'ms');
      
      return {
        success: true,
        context: dynamicContext,
        source: 'hnsw_vector_search',
        processingTime: Date.now() - startTime
      };
      
    } catch (error: any) {
      console.error('❌ DynamicSocraticContext: Failed to build context:', error?.message);
      return {
        success: false,
        context: null,
        source: 'error',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * 🔍 RETRIEVE ALL RELEVANT KNOWLEDGE VIA HNSW
   * 
   * Searches across ALL memory categories, not just learning.
   * Uses semantic search with embeddings for contextual relevance.
   */
  private async retrieveAllRelevantKnowledge(
    userId: string,
    currentMessage: string,
    moduleId?: string
  ): Promise<DynamicSocraticContext['relevantKnowledge']> {
    
    console.log('🔍 HNSW Vector Search: Retrieving all relevant knowledge');
    
    const knowledge: DynamicSocraticContext['relevantKnowledge'] = {
      facts: [],
      preferences: [],
      struggles: [],
      successes: [],
      emotionalPatterns: [],
      goals: [],
      crossChatInsights: []
    };
    
    try {
      // 🎯 SEMANTIC SEARCH across all categories
      const searchQueries = [
        currentMessage, // Main query
        moduleId ? `learning ${moduleId}` : 'learning progress',
        'struggles difficulties confusion',
        'preferences style approach',
        'goals objectives targets',
        'emotional feelings mood'
      ];
      
      // Parallel HNSW searches for maximum performance
      const searchPromises = searchQueries.map(query => 
        memoryDatabaseBridge.searchMemories({
          userId,
          query,
          limit: 10,
          categories: undefined, // ALL categories - immutable retrieval
          includeMetadata: true
        })
      );
      
      const searchResults = await Promise.all(searchPromises);
      
      // Process all results and categorize
      searchResults.forEach((result) => {
        if (result.success && result.memories) {
          result.memories.forEach((memory: any) => {
            const content = memory.memory_value || (memory as any).content || '';
            const key = memory.memory_key || '';
            
            // Categorize based on content and key patterns
            if (this.isStruggleContent(content, key)) {
              knowledge.struggles.push(content);
            } else if (this.isSuccessContent(content, key)) {
              knowledge.successes.push(content);
            } else if (this.isPreferenceContent(content, key)) {
              knowledge.preferences.push(content);
            } else if (this.isEmotionalContent(content, key)) {
              knowledge.emotionalPatterns.push(content);
            } else if (this.isGoalContent(content, key)) {
              knowledge.goals.push(content);
            } else {
              knowledge.facts.push(content);
            }
          });
        }
      });
      
      // 🔗 CROSS-CHAT KNOWLEDGE - Retrieve from NPU database
      // ⚠️ DISABLED: NPU causing repeated API calls
      // const crossChatKnowledge = await npuDatabaseIntegration.retrieveUserKnowledge(userId, currentMessage, 5);
      // crossChatKnowledge.forEach(item => {
      //   knowledge.crossChatInsights.push(item.content);
      // });
      const crossChatKnowledge = []; // Return empty to skip NPU calls
      
      console.log('✅ Retrieved knowledge:', {
        facts: knowledge.facts.length,
        preferences: knowledge.preferences.length,
        struggles: knowledge.struggles.length,
        successes: knowledge.successes.length,
        emotionalPatterns: knowledge.emotionalPatterns.length,
        goals: knowledge.goals.length,
        crossChatInsights: knowledge.crossChatInsights.length
      });
      
    } catch (error: any) {
      console.error('❌ HNSW retrieval failed:', error?.message);
    }
    
    return knowledge;
  }

  /**
   * 🎯 GET LEARNING PREFERENCES
   */
  private async getLearningPreferences(userId: string): Promise<any> {
    try {
      const prefs = await unifiedPreferenceManager.getUserPreferences({
        userId,
        category: 'learning',
        includeDefaults: true
      });
      
      return prefs.reduce((acc, pref) => {
        acc[pref.key] = pref.value;
        return acc;
      }, {} as any);
      
    } catch (error) {
      console.warn('⚠️ Could not retrieve learning preferences:', error);
      return {};
    }
  }

  /**
   * 🏗️ ASSEMBLE DYNAMIC CONTEXT
   * 
   * This builds the context that will be INJECTED into the LLM prompt.
   * The LLM does the actual Socratic thinking - we just provide rich context.
   */
  private async assembleDynamicContext(
    knowledge: DynamicSocraticContext['relevantKnowledge'],
    cognitiveContext: any,
    learningProgress: any,
    preferences: any,
    currentMessage: string
  ): Promise<DynamicSocraticContext> {
    
    // Determine learner state from all sources
    const learnerState = this.determineLearnerState(cognitiveContext, learningProgress, knowledge);
    
    // Determine Socratic phase based on learner state
    const socraticPhase = this.determineSocraticPhase(learnerState, knowledge);
    
    // Build personalized Socratic guidance
    const socraticGuidance = await this.buildSocraticGuidance(
      socraticPhase,
      learnerState,
      knowledge,
      preferences,
      currentMessage
    );
    
    // 🎯 BUILD CONTEXT PROMPT FOR LLM INJECTION
    const contextPrompt = this.buildContextPromptForLLM(
      learnerState,
      knowledge,
      socraticGuidance,
      preferences
    );
    
    return {
      learnerState,
      relevantKnowledge: knowledge,
      socraticGuidance,
      contextPrompt,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 🧠 DETERMINE LEARNER STATE
   */
  private determineLearnerState(
    cognitiveContext: any,
    learningProgress: any,
    knowledge: DynamicSocraticContext['relevantKnowledge']
  ): DynamicSocraticContext['learnerState'] {
    
    let comprehensionLevel = 50; // Default
    let masteryLevel: DynamicSocraticContext['learnerState']['masteryLevel'] = 'exploring';
    
    // From learning progress
    if (learningProgress?.currentSession) {
      comprehensionLevel = learningProgress.currentSession.comprehensionLevel || 50;
    }
    if (learningProgress?.overallStats) {
      comprehensionLevel = Math.max(comprehensionLevel, learningProgress.overallStats.averageComprehension || 0);
    }
    
    // From cognitive context
    if (cognitiveContext?.masteryLevel) {
      masteryLevel = this.mapMasteryLevel(cognitiveContext.masteryLevel);
    } else {
      // Infer from comprehension
      if (comprehensionLevel < 30) masteryLevel = 'novice';
      else if (comprehensionLevel < 50) masteryLevel = 'exploring';
      else if (comprehensionLevel < 70) masteryLevel = 'understanding';
      else if (comprehensionLevel < 90) masteryLevel = 'applying';
      else masteryLevel = 'mastering';
    }
    
    // Emotional progression from knowledge
    const emotionalProgression = knowledge.emotionalPatterns.slice(0, 5);
    
    return {
      comprehensionLevel,
      currentDomain: cognitiveContext?.domain || 'general',
      emotionalProgression,
      masteryLevel
    };
  }

  /**
   * 🏛️ DETERMINE SOCRATIC PHASE
   * 
   * Uses the classical Socratic method phases:
   * - elenchus: Cross-examination to reveal contradictions
   * - aporia: State of puzzlement/awareness of not knowing
   * - maieutics: "Midwifery" - helping birth understanding
   * - anamnesis: Recollection - drawing out innate knowledge
   */
  private determineSocraticPhase(
    learnerState: DynamicSocraticContext['learnerState'],
    knowledge: DynamicSocraticContext['relevantKnowledge']
  ): 'elenchus' | 'aporia' | 'maieutics' | 'anamnesis' {
    
    const { masteryLevel, comprehensionLevel } = learnerState;
    const hasStruggles = knowledge.struggles.length > 0;
    const hasSuccesses = knowledge.successes.length > 2;
    
    // Novice with struggles -> elenchus (reveal what they don't know)
    if (masteryLevel === 'novice' || (hasStruggles && comprehensionLevel < 40)) {
      return 'elenchus';
    }
    
    // Exploring with some confusion -> aporia (embrace puzzlement)
    if (masteryLevel === 'exploring' || (hasStruggles && !hasSuccesses)) {
      return 'aporia';
    }
    
    // Understanding and applying -> maieutics (help birth new understanding)
    if (masteryLevel === 'understanding' || masteryLevel === 'applying') {
      return 'maieutics';
    }
    
    // Mastering or has many successes -> anamnesis (draw out deeper knowledge)
    if (masteryLevel === 'mastering' || hasSuccesses) {
      return 'anamnesis';
    }
    
    return 'maieutics'; // Default
  }

  /**
   * 🎯 BUILD SOCRATIC GUIDANCE
   */
  private async buildSocraticGuidance(
    phase: 'elenchus' | 'aporia' | 'maieutics' | 'anamnesis',
    learnerState: DynamicSocraticContext['learnerState'],
    knowledge: DynamicSocraticContext['relevantKnowledge'],
    preferences: any,
    currentMessage: string
  ): Promise<DynamicSocraticContext['socraticGuidance']> {
    
    const phaseApproaches = {
      elenchus: 'Ask probing questions to gently reveal gaps in understanding. Use "What do you think would happen if..." or "How would you explain..."',
      aporia: 'Help the learner embrace productive puzzlement. Validate confusion as part of learning. Use "It\'s okay not to know yet. Let\'s explore together..."',
      maieutics: 'Guide discovery through targeted questions. The learner is close - help them make the final connections. Use "What patterns do you notice..."',
      anamnesis: 'Draw out deeper understanding by connecting to prior knowledge. Use "How does this relate to what you mentioned about..." or "Earlier you discovered..."'
    };
    
    // Build personalization notes from knowledge
    const personalizationNotes = this.buildPersonalizationNotes(knowledge, preferences);
    
    // Generate suggested questions dynamically (via LLM, not static)
    const suggestedQuestions = await this.generateDynamicQuestions(
      phase,
      currentMessage,
      knowledge,
      learnerState
    );
    
    // Patterns to avoid based on struggles
    const avoidPatterns = knowledge.struggles.map(s => 
      `Avoid overwhelming with: ${s.substring(0, 50)}...`
    ).slice(0, 3);
    
    return {
      phase,
      approach: phaseApproaches[phase],
      suggestedQuestions,
      avoidPatterns,
      personalizationNotes
    };
  }

  /**
   * 🎯 GENERATE DYNAMIC QUESTIONS VIA LLM
   * 
   * Uses GPT-OSS 120b to generate contextually relevant Socratic questions.
   * NOT static - fully dynamic based on learner context.
   */
  private async generateDynamicQuestions(
    phase: 'elenchus' | 'aporia' | 'maieutics' | 'anamnesis',
    currentMessage: string,
    knowledge: DynamicSocraticContext['relevantKnowledge'],
    learnerState: DynamicSocraticContext['learnerState']
  ): Promise<string[]> {
    
    try {
      const { UnifiedAPIRouter } = await import('./UnifiedAPIRouter');
      const unifiedAPIRouter = UnifiedAPIRouter.getInstance();
      
      // 🔧 AGGRESSIVE ANTI-REASONING PROMPT
      const questionPrompt = `OUTPUT ONLY JSON. NO EXPLANATIONS. START WITH {

Topic: "${currentMessage}"
Phase: ${phase}
Level: ${learnerState.masteryLevel}

{"questions":["Question 1?","Question 2?","Question 3?"]}

Generate 3 Socratic questions for ${phase} phase. JSON ONLY:`;

      // 🎯 WORKING: No response_format, use regex extraction (like commit 2d9d24a)
      const response = await unifiedAPIRouter.routeAPICall(
        'fireworks',
        'llm-completion',
        {
          messages: [{ role: 'user', content: questionPrompt }],
          max_tokens: 500,
          temperature: 0.7,
          model: 'accounts/fireworks/models/gpt-oss-120b'
        }
      );
      
      if (response?.success && response?.data) {
        let responseText = '';
        if (typeof response.data === 'string') {
          responseText = response.data;
        } else if (response.data?.choices?.[0]?.message?.content) {
          responseText = response.data.choices[0].message.content;
        } else if (response.data?.[0]?.generated_text) {
          responseText = response.data[0].generated_text;
        } else if (response.data?.completion) {
          responseText = response.data.completion;
        }
        
        // 🎯 WORKING: Extract JSON with regex (like commit 2d9d24a)
        const match = responseText.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]);
            return parsed?.questions || [];
          } catch (e) {
            console.warn('⚠️ JSON parse failed in Socratic questions');
          }
        }
      }
      
    } catch (error: any) {
      console.warn('⚠️ Dynamic question generation failed:', error?.message);
    }
    
    // Fallback questions based on phase
    return this.getFallbackQuestions(phase);
  }

  /**
   * 🎯 BUILD CONTEXT PROMPT FOR LLM INJECTION
   * 
   * This is the key output - a rich context string that gets injected
   * into the LLM prompt to enable dynamic Socratic behavior.
   */
  private buildContextPromptForLLM(
    learnerState: DynamicSocraticContext['learnerState'],
    knowledge: DynamicSocraticContext['relevantKnowledge'],
    guidance: DynamicSocraticContext['socraticGuidance'],
    preferences: any
  ): string {
    
    const parts: string[] = [];
    
    parts.push(`\n\n🧠 **DYNAMIC SOCRATIC CONTEXT** (Retrieved via HNSW Vector Search)\n`);
    
    // Learner state
    parts.push(`**Learner State:**`);
    parts.push(`- Comprehension: ${learnerState.comprehensionLevel}%`);
    parts.push(`- Mastery Level: ${learnerState.masteryLevel}`);
    parts.push(`- Domain: ${learnerState.currentDomain}`);
    if (learnerState.emotionalProgression.length > 0) {
      parts.push(`- Recent emotional states: ${learnerState.emotionalProgression.slice(0, 3).join(', ')}`);
    }
    
    // Socratic phase guidance
    parts.push(`\n**Socratic Phase: ${guidance.phase.toUpperCase()}**`);
    parts.push(`Approach: ${guidance.approach}`);
    
    // Personalization
    if (guidance.personalizationNotes) {
      parts.push(`\n**Personalization:** ${guidance.personalizationNotes}`);
    }
    
    // What to leverage (successes)
    if (knowledge.successes.length > 0) {
      parts.push(`\n**Build on these successes:**`);
      knowledge.successes.slice(0, 3).forEach(s => parts.push(`- ${s.substring(0, 100)}`));
    }
    
    // What to be mindful of (struggles)
    if (knowledge.struggles.length > 0) {
      parts.push(`\n**Be mindful of past struggles:**`);
      knowledge.struggles.slice(0, 3).forEach(s => parts.push(`- ${s.substring(0, 100)}`));
    }
    
    // Cross-chat insights
    if (knowledge.crossChatInsights.length > 0) {
      parts.push(`\n**Cross-session insights:**`);
      knowledge.crossChatInsights.slice(0, 2).forEach(i => parts.push(`- ${i.substring(0, 100)}`));
    }
    
    // Goals
    if (knowledge.goals.length > 0) {
      parts.push(`\n**Learner's goals:**`);
      knowledge.goals.slice(0, 2).forEach(g => parts.push(`- ${g.substring(0, 100)}`));
    }
    
    // Suggested questions
    if (guidance.suggestedQuestions.length > 0) {
      parts.push(`\n**Consider weaving in questions like:**`);
      guidance.suggestedQuestions.forEach(q => parts.push(`- "${q}"`));
    }
    
    // Preferences
    if (preferences?.difficulty_preference) {
      parts.push(`\n**Preference:** Difficulty level: ${preferences.difficulty_preference}`);
    }
    
    parts.push(`\n⚠️ **CRITICAL:** Use this context naturally. Don't recite it - let it inform your response. Be a Socratic guide, not a lecturer.`);
    
    return parts.join('\n');
  }

  /**
   * 📝 BUILD PERSONALIZATION NOTES
   */
  private buildPersonalizationNotes(
    knowledge: DynamicSocraticContext['relevantKnowledge'],
    preferences: any
  ): string {
    const notes: string[] = [];
    
    if (knowledge.preferences.length > 0) {
      const prefSample = knowledge.preferences[0];
      if (prefSample.includes('visual')) notes.push('Prefers visual explanations');
      if (prefSample.includes('example')) notes.push('Learns well with examples');
      if (prefSample.includes('step')) notes.push('Prefers step-by-step approach');
    }
    
    if (preferences?.difficulty_preference === 'adaptive') {
      notes.push('Adapts to demonstrated ability level');
    }
    
    if (knowledge.emotionalPatterns.some(e => e.includes('frustrated') || e.includes('confused'))) {
      notes.push('May need extra patience and encouragement');
    }
    
    if (knowledge.emotionalPatterns.some(e => e.includes('confident') || e.includes('excited'))) {
      notes.push('Can be challenged with deeper questions');
    }
    
    return notes.join('. ') || 'No specific personalization detected';
  }

  // Helper methods for content categorization
  private isStruggleContent(content: string, key: string): boolean {
    const patterns = ['struggle', 'difficult', 'confus', 'stuck', 'problem', 'fail', 'wrong', 'mistake', 'error', 'hard'];
    const lower = (content + key).toLowerCase();
    return patterns.some(p => lower.includes(p));
  }

  private isSuccessContent(content: string, key: string): boolean {
    const patterns = ['success', 'achieve', 'master', 'understand', 'learn', 'breakthrough', 'solved', 'correct', 'got it'];
    const lower = (content + key).toLowerCase();
    return patterns.some(p => lower.includes(p));
  }

  private isPreferenceContent(content: string, key: string): boolean {
    const patterns = ['prefer', 'like', 'style', 'approach', 'best when', 'better with', 'enjoy'];
    const lower = (content + key).toLowerCase();
    return patterns.some(p => lower.includes(p));
  }

  private isEmotionalContent(content: string, key: string): boolean {
    const patterns = ['feel', 'emotion', 'mood', 'frustrated', 'excited', 'anxious', 'confident', 'scared', 'happy'];
    const lower = (content + key).toLowerCase();
    return patterns.some(p => lower.includes(p));
  }

  private isGoalContent(content: string, key: string): boolean {
    const patterns = ['goal', 'objective', 'target', 'want to', 'aim', 'hope to', 'trying to', 'aspire'];
    const lower = (content + key).toLowerCase();
    return patterns.some(p => lower.includes(p));
  }

  private mapMasteryLevel(level: string): DynamicSocraticContext['learnerState']['masteryLevel'] {
    const mapping: Record<string, DynamicSocraticContext['learnerState']['masteryLevel']> = {
      'struggling': 'novice',
      'confused': 'novice',
      'exploring': 'exploring',
      'learning': 'understanding',
      'understanding': 'applying',
      'mastering': 'mastering'
    };
    return mapping[level] || 'exploring';
  }

  private getFallbackQuestions(phase: 'elenchus' | 'aporia' | 'maieutics' | 'anamnesis'): string[] {
    const fallbacks = {
      elenchus: [
        "What makes you think that's the case?",
        "Can you walk me through your reasoning?",
        "What would happen if that assumption was wrong?"
      ],
      aporia: [
        "It's okay to be uncertain - what aspects feel unclear?",
        "What would help you understand this better?",
        "Let's explore this together - what's your intuition?"
      ],
      maieutics: [
        "What connections do you see here?",
        "How does this relate to what you already know?",
        "What patterns are emerging for you?"
      ],
      anamnesis: [
        "Earlier you mentioned something similar - how does this connect?",
        "What prior knowledge can you draw on here?",
        "How would you explain this to someone else?"
      ]
    };
    return fallbacks[phase];
  }

  // Cache management
  private getFromCache(key: string): DynamicSocraticContext | null {
    const cached = this.contextCache.get(key);
    if (cached && Date.now() < cached.expiry) {
      return cached.context;
    }
    this.contextCache.delete(key);
    return null;
  }

  private setCache(key: string, context: DynamicSocraticContext): void {
    this.contextCache.set(key, {
      context,
      expiry: Date.now() + this.cacheTimeout
    });
  }

  /**
   * 🧹 CLEAR CACHE for user (after new learning data)
   */
  clearUserCache(userId: string): void {
    for (const [key] of this.contextCache) {
      if (key.startsWith(userId)) {
        this.contextCache.delete(key);
      }
    }
  }
}

// Export singleton
export const dynamicSocraticContextService = DynamicSocraticContextService.getInstance();
export { DynamicSocraticContextService };
// Note: DynamicSocraticContext and SocraticQueryResult are already exported as interfaces above

