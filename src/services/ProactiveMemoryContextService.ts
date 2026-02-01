/**
 * 🎯 PROACTIVE MEMORY CONTEXT SERVICE
 * 
 * The "Claude-like" memory injection system.
 * 
 * Instead of only retrieving memories when users explicitly ask "what do you know about me?",
 * this service PROACTIVELY identifies topically-relevant memories and strategically injects
 * them into the conversation context.
 * 
 * Example: User asks "How do I set up a company?"
 * - Normal system: Returns generic company setup info
 * - With this service: "For your company NeuraPlay, you might want to consider..."
 * 
 * Key capabilities:
 * 1. Topic extraction from any message
 * 2. Semantic similarity scoring of memories against topics
 * 3. Strategic context injection with natural weaving instructions
 * 4. Importance-based prioritization (identity > profession > hobbies > preferences)
 */

import { vectorSearchService } from './VectorSearchService';

// ============= INTERFACES =============

export interface TopicExtraction {
  primaryTopics: string[];           // Main topics (e.g., "business", "company formation")
  semanticCategories: string[];      // Broader categories (e.g., "entrepreneurship", "legal")
  entityMentions: string[];          // Named entities in the message
  queryIntent: 'question' | 'statement' | 'action' | 'discussion';
}

export interface RelevantMemory {
  memory: {
    key: string;
    content: string;
    category: string;
    metadata?: any;
  };
  topicRelevanceScore: number;       // 0-1 how relevant to current topic
  importanceWeight: number;          // 0-1 based on memory category importance
  finalScore: number;                // Combined score for ranking
  useCase: string;                   // Natural language: "Could be relevant for discussing X"
  shouldMention: boolean;            // Whether this should be actively mentioned
}

export interface StrategicContextInjection {
  contextBlock: string;              // The formatted context to inject into prompt
  memoriesIncluded: number;          // How many memories were included
  topTopics: string[];               // What topics were detected
  injectionStrength: 'strong' | 'moderate' | 'subtle' | 'none';
}

// ============= CONSTANTS =============

/**
 * Memory category importance weights
 * Higher weight = more important to include in context
 */
const CATEGORY_IMPORTANCE: Record<string, number> = {
  // Core Identity (always relevant)
  'name': 1.0,
  'identity': 0.95,
  
  // Professional (often relevant for advice)
  'profession': 0.9,
  'company': 0.9,
  'business': 0.9,
  'work': 0.85,
  'job': 0.85,
  'career': 0.85,
  
  // Location (contextually relevant)
  'location': 0.75,
  'city': 0.75,
  'country': 0.75,
  
  // Learning & Education
  'education': 0.8,
  'studies': 0.8,
  'learning': 0.8,
  'skills': 0.8,
  'course': 0.7,                    // Course summaries (what they're learning)
  'learning_moment': 0.75,          // Learning struggles/breakthroughs (valuable!)
  
  // Goals & Plans
  'goal': 0.8,
  'plan': 0.75,
  
  // Personal Interests
  'hobbies': 0.6,
  'hobby': 0.6,
  'interests': 0.6,
  'interest': 0.6,
  'favorite': 0.55,
  'preference': 0.5,
  'preferences': 0.5,
  
  // Relationships
  'family': 0.65,
  'friend': 0.55,
  'colleague': 0.6,
  'pets': 0.55,
  'pet': 0.55,
  'relationships': 0.6,
  
  // Emotional context
  'emotion': 0.5,
  'mood': 0.45,
  
  // General
  'general': 0.4,
  'other': 0.3
};

/**
 * Topic-to-category mappings for relevance boosting
 * When a topic matches these keywords, boost memories in related categories
 */
const TOPIC_CATEGORY_AFFINITIES: Record<string, string[]> = {
  // Business/Company topics boost these memory categories
  'business': ['company', 'profession', 'work', 'business', 'career', 'skills', 'education'],
  'company': ['company', 'profession', 'work', 'business', 'career'],
  'startup': ['company', 'profession', 'business', 'career', 'skills'],
  'entrepreneur': ['company', 'profession', 'business', 'career'],
  'work': ['profession', 'work', 'company', 'business', 'career', 'skills'],
  'job': ['profession', 'work', 'career', 'skills', 'education'],
  'career': ['profession', 'work', 'company', 'career', 'education', 'skills'],
  
  // Learning topics - include learning_moment for struggles/breakthroughs
  'learn': ['education', 'studies', 'learning', 'skills', 'interests', 'course', 'learning_moment', 'goal'],
  'study': ['education', 'studies', 'learning', 'skills', 'course', 'learning_moment'],
  'course': ['education', 'studies', 'learning', 'interests', 'course', 'learning_moment'],
  'education': ['education', 'studies', 'learning', 'skills', 'profession', 'course'],
  'training': ['education', 'learning', 'skills', 'course', 'learning_moment'],
  'tutorial': ['education', 'learning', 'skills', 'course', 'learning_moment'],
  'lesson': ['education', 'learning', 'course', 'learning_moment'],
  'practice': ['learning', 'skills', 'course', 'learning_moment', 'hobby'],
  'struggle': ['learning_moment', 'learning', 'education'],
  'difficult': ['learning_moment', 'learning'],
  'understand': ['learning_moment', 'learning', 'education'],
  
  // Goal/Plan topics
  'goal': ['goal', 'plan', 'profession', 'education', 'interests'],
  'plan': ['plan', 'goal', 'profession', 'business'],
  'future': ['goal', 'plan', 'profession', 'career'],
  'aspiration': ['goal', 'plan', 'interests'],
  
  // Location topics
  'travel': ['location', 'city', 'country', 'interests', 'hobbies'],
  'move': ['location', 'city', 'country', 'profession', 'work'],
  'local': ['location', 'city', 'country'],
  'city': ['location', 'city', 'profession'],
  'country': ['location', 'country'],
  
  // Personal topics
  'family': ['family', 'relationships', 'name'],
  'hobby': ['hobbies', 'hobby', 'interests', 'preference'],
  'pet': ['pets', 'pet', 'family'],
  'health': ['preferences', 'hobbies', 'interests'],
  'food': ['preferences', 'hobbies', 'location'],
  
  // Tech topics (common for NeuraPlay users)
  'ai': ['profession', 'company', 'skills', 'education', 'interests', 'learning_moment', 'course'],
  'programming': ['profession', 'skills', 'education', 'interests', 'hobbies', 'learning_moment', 'course'],
  'technology': ['profession', 'company', 'skills', 'interests'],
  'software': ['profession', 'company', 'skills', 'education', 'learning_moment'],
  'developer': ['profession', 'skills', 'education', 'interests', 'learning_moment'],
  'code': ['profession', 'skills', 'education', 'learning_moment', 'course'],
  'coding': ['profession', 'skills', 'education', 'learning_moment', 'course', 'hobby']
};

// ============= SERVICE CLASS =============

class ProactiveMemoryContextService {
  private static instance: ProactiveMemoryContextService;
  
  private constructor() {}
  
  static getInstance(): ProactiveMemoryContextService {
    if (!ProactiveMemoryContextService.instance) {
      ProactiveMemoryContextService.instance = new ProactiveMemoryContextService();
    }
    return ProactiveMemoryContextService.instance;
  }
  
  // ============= MAIN PUBLIC API =============
  
  /**
   * 🎯 MAIN ENTRY POINT
   * 
   * Call this on EVERY message to get strategically relevant memory context.
   * Returns formatted context ready for prompt injection.
   * 
   * @param message - The user's message
   * @param userId - User ID
   * @param options - Configuration options
   * @param prefetchedMemories - OPTIONAL: Pre-fetched memories from MemoryOperations (avoids duplicate search)
   */
  async getProactiveContext(
    message: string,
    userId: string,
    options: {
      maxMemories?: number;
      minRelevanceScore?: number;
      includeUseCase?: boolean;
    } = {},
    prefetchedMemories?: any[]  // 🎯 Accept pre-fetched memories to avoid duplicate vector search
  ): Promise<StrategicContextInjection> {
    const {
      maxMemories = 5,
      minRelevanceScore = 0.35,
      includeUseCase = true
    } = options;
    
    // Skip for anonymous users
    if (!userId || userId === 'anonymous') {
      return {
        contextBlock: '',
        memoriesIncluded: 0,
        topTopics: [],
        injectionStrength: 'none'
      };
    }
    
    try {
      // 1. Extract topics from the message
      const topics = await this.extractTopics(message);
      console.log('🎯 ProactiveMemory: Extracted topics:', topics.primaryTopics);
      
      // 2. Use pre-fetched memories if provided, otherwise fetch (fallback only)
      let allMemories: any[];
      if (prefetchedMemories && prefetchedMemories.length > 0) {
        // 🎯 USE PRE-FETCHED: Apply smart filtering to already-retrieved memories
        allMemories = this.filterMemoriesForProactiveContext(prefetchedMemories);
        console.log(`🎯 ProactiveMemory: Using ${allMemories.length} pre-fetched memories (no duplicate search)`);
      } else {
        // Fallback: Do our own search (only if nothing pre-fetched)
        allMemories = await this.getAllUserMemories(userId, message);
        console.log(`🎯 ProactiveMemory: Fetched ${allMemories.length} memories (fallback search)`);
      }
      
      if (allMemories.length === 0) {
        return {
          contextBlock: '',
          memoriesIncluded: 0,
          topTopics: topics.primaryTopics,
          injectionStrength: 'none'
        };
      }
      
      // 3. Score each memory against current topics
      const scoredMemories = await this.scoreMemoriesAgainstTopics(allMemories, topics);
      
      // 4. Filter and rank
      const relevantMemories = scoredMemories
        .filter(m => m.finalScore >= minRelevanceScore)
        .sort((a, b) => b.finalScore - a.finalScore)
        .slice(0, maxMemories);
      
      console.log(`🎯 ProactiveMemory: ${relevantMemories.length} memories pass relevance threshold (${minRelevanceScore})`);
      
      if (relevantMemories.length === 0) {
        return {
          contextBlock: '',
          memoriesIncluded: 0,
          topTopics: topics.primaryTopics,
          injectionStrength: 'none'
        };
      }
      
      // 5. Build strategic context injection
      const contextBlock = this.buildStrategicContextInjection(relevantMemories, topics, includeUseCase);
      
      // Determine injection strength based on relevance scores
      const avgScore = relevantMemories.reduce((sum, m) => sum + m.finalScore, 0) / relevantMemories.length;
      const injectionStrength = avgScore > 0.7 ? 'strong' : avgScore > 0.5 ? 'moderate' : 'subtle';
      
      return {
        contextBlock,
        memoriesIncluded: relevantMemories.length,
        topTopics: topics.primaryTopics,
        injectionStrength
      };
      
    } catch (error) {
      console.warn('⚠️ ProactiveMemoryContextService: Error getting proactive context:', error);
      return {
        contextBlock: '',
        memoriesIncluded: 0,
        topTopics: [],
        injectionStrength: 'none'
      };
    }
  }
  
  /**
   * 🎯 FILTER PRE-FETCHED MEMORIES
   * 
   * Apply the same smart filtering to pre-fetched memories from MemoryOperations.
   * This ensures consistency whether we fetch ourselves or receive pre-fetched data.
   */
  private filterMemoriesForProactiveContext(memories: any[]): any[] {
    return memories.filter(m => {
      const category = (m.metadata?.category || m.category || '').toLowerCase();
      const key = (m.memory_key || m.key || '').toLowerCase();
      const memoryType = (m.metadata?.type || '').toLowerCase();
      
      // ❌ ALWAYS EXCLUDE: Canvas documents (handled by CanvasAccessTracker)
      if (category.includes('canvas') || category === 'document' || key.includes('canvas_')) {
        return false;
      }
      
      // ❌ EXCLUDE: Raw course content chunks (these are lesson text, not personal)
      if (memoryType === 'course_chunk' || key.match(/^course_.*_chunk_\d+$/)) {
        return false;
      }
      
      // ❌ EXCLUDE: Cognitive patterns (internal system data)
      if (key.includes('cognitive_pattern') || category === 'cognitive') {
        return false;
      }
      
      // ✅ INCLUDE: Everything else
      return true;
    });
  }
  
  // ============= TOPIC EXTRACTION =============
  
  /**
   * Extract topics from a message using a combination of:
   * 1. Keyword extraction
   * 2. Semantic category mapping
   * 3. Optional LLM-based extraction for complex messages
   */
  async extractTopics(message: string): Promise<TopicExtraction> {
    const msgLower = message.toLowerCase();
    
    // Primary topics from keyword matching
    const primaryTopics: string[] = [];
    const semanticCategories: string[] = [];
    const entityMentions: string[] = [];
    
    // Business/Work detection
    if (/\b(company|business|startup|enterprise|firm|corporation)\b/i.test(message)) {
      primaryTopics.push('business', 'company');
      semanticCategories.push('entrepreneurship', 'professional');
    }
    if (/\b(work|job|career|profession|employment|hire|hiring)\b/i.test(message)) {
      primaryTopics.push('work', 'career');
      semanticCategories.push('professional');
    }
    
    // Learning/Education detection
    if (/\b(learn|study|course|education|training|skill|tutorial)\b/i.test(message)) {
      primaryTopics.push('learning', 'education');
      semanticCategories.push('education', 'development');
    }
    
    // Tech detection
    if (/\b(ai|artificial intelligence|machine learning|programming|code|software|developer|app)\b/i.test(message)) {
      primaryTopics.push('technology', 'programming');
      semanticCategories.push('tech', 'professional');
    }
    
    // Location detection
    if (/\b(city|country|location|move|travel|live|based|local)\b/i.test(message)) {
      primaryTopics.push('location');
      semanticCategories.push('geography', 'lifestyle');
    }
    
    // Personal/Family detection
    if (/\b(family|wife|husband|child|children|kid|parent|mother|father|sibling)\b/i.test(message)) {
      primaryTopics.push('family');
      semanticCategories.push('personal', 'relationships');
    }
    if (/\b(pet|dog|cat|animal)\b/i.test(message)) {
      primaryTopics.push('pets');
      semanticCategories.push('personal', 'lifestyle');
    }
    
    // Hobby/Interest detection
    if (/\b(hobby|hobbies|interest|enjoy|love|passionate|favorite)\b/i.test(message)) {
      primaryTopics.push('interests', 'hobbies');
      semanticCategories.push('personal', 'lifestyle');
    }
    
    // Health/Wellness detection
    if (/\b(health|fitness|exercise|diet|wellness|mental health)\b/i.test(message)) {
      primaryTopics.push('health');
      semanticCategories.push('wellness', 'lifestyle');
    }
    
    // Finance detection
    if (/\b(money|finance|invest|budget|salary|income|tax|financial)\b/i.test(message)) {
      primaryTopics.push('finance');
      semanticCategories.push('financial', 'professional');
    }
    
    // Detect query intent
    let queryIntent: 'question' | 'statement' | 'action' | 'discussion' = 'discussion';
    if (/^(what|how|why|when|where|who|can|could|should|would|is|are|do|does)\b/i.test(message.trim())) {
      queryIntent = 'question';
    } else if (/\b(please|help|show|tell|give|create|make|find)\b/i.test(message)) {
      queryIntent = 'action';
    } else if (/\b(i think|i believe|i feel|in my opinion)\b/i.test(msgLower)) {
      queryIntent = 'statement';
    }
    
    // Extract potential entity mentions (capitalized words that might be names/companies)
    const capitalizedWords = message.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    const commonWords = new Set(['I', 'The', 'This', 'That', 'What', 'How', 'Why', 'When', 'Where', 'Who', 'Can', 'Could', 'Should', 'Would', 'Please', 'Help']);
    for (const word of capitalizedWords) {
      if (!commonWords.has(word) && word.length > 2) {
        entityMentions.push(word);
      }
    }
    
    // If no topics detected, use semantic embedding approach
    if (primaryTopics.length === 0) {
      // Default to general discussion topics based on common patterns
      if (msgLower.includes('advice') || msgLower.includes('recommend') || msgLower.includes('suggest')) {
        primaryTopics.push('advice');
        semanticCategories.push('guidance');
      } else {
        primaryTopics.push('general');
      }
    }
    
    return {
      primaryTopics: [...new Set(primaryTopics)],
      semanticCategories: [...new Set(semanticCategories)],
      entityMentions: [...new Set(entityMentions)],
      queryIntent
    };
  }
  
  // ============= MEMORY RETRIEVAL =============
  
  /**
   * Get all user memories using vector search with a broad query
   * 
   * FILTERING STRATEGY:
   * - EXCLUDE: canvas_document, document (handled by CanvasAccessTracker)
   * - EXCLUDE: Raw course content (course chunks with full lesson text)
   * - INCLUDE: Learning moments (struggles, breakthroughs) - these are valuable
   * - INCLUDE: Course progress summaries (what they're studying, not the content)
   * - INCLUDE: All personal memories (name, profession, family, etc.)
   */
  private async getAllUserMemories(userId: string, currentMessage: string): Promise<any[]> {
    try {
      // Use a combination of:
      // 1. Semantic search based on current message
      // 2. Broad search for all personal info
      
      // Search 1: Message-based semantic search
      const messageResults = await vectorSearchService.semanticSearch(
        currentMessage,
        undefined,
        userId,
        15,   // Get top 15 results
        0.25  // Lower threshold to catch more
      );
      
      // Search 2: Broad personal info search
      const broadQuery = 'user personal information name company work profession location interests hobbies family';
      const broadResults = await vectorSearchService.semanticSearch(
        broadQuery,
        undefined,
        userId,
        20,   // Get top 20 results
        0.15  // Very low threshold
      );
      
      // Merge and deduplicate
      const allResults = [...messageResults, ...broadResults];
      const seen = new Set<string>();
      const deduplicated: any[] = [];
      
      for (const result of allResults) {
        const key = result.memory_key || result.key || result.id;
        if (!seen.has(key)) {
          seen.add(key);
          deduplicated.push(result);
        }
      }
      
      // 🎯 SMART FILTERING: Keep personal info, filter content appropriately
      return deduplicated.filter(m => {
        const category = (m.metadata?.category || m.category || '').toLowerCase();
        const key = (m.memory_key || m.key || '').toLowerCase();
        const memoryType = (m.metadata?.type || '').toLowerCase();
        
        // ❌ ALWAYS EXCLUDE: Canvas documents (handled by CanvasAccessTracker)
        if (category.includes('canvas') || category === 'document' || key.includes('canvas_')) {
          return false;
        }
        
        // ❌ EXCLUDE: Raw course content chunks (these are lesson text, not personal)
        // Course chunks have keys like: course_{id}_section_X_chunk_X
        // 🐛 FIX: Updated pattern to match actual key format with _section_ in the middle
        if (memoryType === 'course_chunk' || key.match(/^course_.*_section_\d+_chunk_\d+$/) || key.includes('_chunk_')) {
          return false;
        }
        
        // ❌ EXCLUDE: Cognitive patterns (internal system data)
        if (key.includes('cognitive_pattern') || category === 'cognitive') {
          return false;
        }
        
        // ✅ INCLUDE: Learning moments (struggles, breakthroughs, emotional states)
        // These are PERSONAL and valuable for context
        if (category === 'learning_moment' || memoryType === 'learning_moment') {
          return true;
        }
        
        // ✅ INCLUDE: Course summaries (what they're studying, not the content)
        // Course summaries have keys like: course_{id}_summary (NOT course_summary_{id})
        // 🐛 FIX: Updated pattern to match actual key format ending with _summary
        if (key.endsWith('_summary') || memoryType === 'course_summary') {
          return true;
        }
        
        // ✅ INCLUDE: Everything else (personal info, preferences, etc.)
        return true;
      });
      
    } catch (error) {
      console.warn('⚠️ ProactiveMemory: Failed to get user memories:', error);
      return [];
    }
  }
  
  // ============= RELEVANCE SCORING =============
  
  /**
   * Score each memory against the extracted topics
   */
  private async scoreMemoriesAgainstTopics(
    memories: any[],
    topics: TopicExtraction
  ): Promise<RelevantMemory[]> {
    const scoredMemories: RelevantMemory[] = [];
    
    for (const memory of memories) {
      const content = memory.content || memory.memory_value || memory.value || '';
      // 🎯 CRITICAL FIX: RecallMachine returns 'id' as the memory_key (same fix as ConversationMemoryService)
      const key = memory.id || memory.memory_key || memory.originalContext?.memoryKey || memory.key || '';
      const category = (memory.metadata?.category || memory.category || 'general').toLowerCase();
      
      if (!content || content.length < 3) continue;
      
      // Calculate topic relevance score
      let topicRelevanceScore = 0;
      const matchedTopics: string[] = [];
      
      // Check if memory category matches any topic-category affinities
      for (const topic of topics.primaryTopics) {
        const affinities = TOPIC_CATEGORY_AFFINITIES[topic] || [];
        if (affinities.includes(category)) {
          topicRelevanceScore += 0.3;
          matchedTopics.push(topic);
        }
      }
      
      // Check content overlap with topics
      const contentLower = content.toLowerCase();
      const keyLower = key.toLowerCase();
      
      for (const topic of topics.primaryTopics) {
        if (contentLower.includes(topic) || keyLower.includes(topic)) {
          topicRelevanceScore += 0.25;
          if (!matchedTopics.includes(topic)) matchedTopics.push(topic);
        }
      }
      
      // Check semantic category matches
      for (const semCat of topics.semanticCategories) {
        if (contentLower.includes(semCat) || category.includes(semCat)) {
          topicRelevanceScore += 0.15;
        }
      }
      
      // Check entity mentions
      for (const entity of topics.entityMentions) {
        if (contentLower.includes(entity.toLowerCase())) {
          topicRelevanceScore += 0.4;
          matchedTopics.push(`entity:${entity}`);
        }
      }
      
      // Use vector similarity if available
      if (memory.similarity && memory.similarity > 0.3) {
        topicRelevanceScore += memory.similarity * 0.5;
      }
      
      // Cap at 1.0
      topicRelevanceScore = Math.min(1.0, topicRelevanceScore);
      
      // Get importance weight from category
      const importanceWeight = CATEGORY_IMPORTANCE[category] || CATEGORY_IMPORTANCE['general'];
      
      // Calculate final score (weighted combination)
      const finalScore = (topicRelevanceScore * 0.6) + (importanceWeight * 0.4);
      
      // Generate use case description
      const useCase = this.generateUseCase(category, matchedTopics, topics);
      
      // Determine if this should be actively mentioned
      const shouldMention = finalScore > 0.5 || 
                           (importanceWeight >= 0.9 && topicRelevanceScore > 0.2);
      
      scoredMemories.push({
        memory: {
          key,
          content,
          category,
          metadata: memory.metadata
        },
        topicRelevanceScore,
        importanceWeight,
        finalScore,
        useCase,
        shouldMention
      });
    }
    
    return scoredMemories;
  }
  
  /**
   * Generate a natural language use case for why this memory might be relevant
   */
  private generateUseCase(category: string, matchedTopics: string[], topics: TopicExtraction): string {
    if (matchedTopics.length === 0 && topics.primaryTopics.length === 0) {
      return 'general context';
    }
    
    const categoryUseCases: Record<string, string> = {
      'company': 'when discussing business or professional matters',
      'business': 'when giving business advice',
      'profession': 'when discussing career or work-related topics',
      'work': 'for work-related context',
      'name': 'for personalized communication',
      'location': 'when discussing location-specific matters',
      'education': 'when discussing learning or qualifications',
      'skills': 'when recommending approaches based on abilities',
      'hobbies': 'for personal connection or relevant examples',
      'interests': 'when relating concepts to user interests',
      'family': 'when context involves personal life',
      'pets': 'for personal connection'
    };
    
    return categoryUseCases[category] || `relates to ${topics.primaryTopics.join(', ')}`;
  }
  
  // ============= CONTEXT INJECTION =============
  
  /**
   * Build the strategic context injection string
   */
  private buildStrategicContextInjection(
    memories: RelevantMemory[],
    topics: TopicExtraction,
    includeUseCase: boolean
  ): string {
    if (memories.length === 0) return '';
    
    // Sort by final score
    const sorted = [...memories].sort((a, b) => b.finalScore - a.finalScore);
    
    // Build context header
    let contextBlock = `\n\n🎯 **RELEVANT PERSONAL CONTEXT** (naturally weave when appropriate):\n`;
    
    // Add memories with context hints
    for (const mem of sorted) {
      const formattedContent = this.formatMemoryContent(mem.memory.category, mem.memory.content, mem.memory.metadata);
      
      if (includeUseCase && mem.useCase) {
        // Include hint about when to use this
        contextBlock += `• ${formattedContent} [${mem.useCase}]\n`;
      } else {
        contextBlock += `• ${formattedContent}\n`;
      }
    }
    
    // Add strategic instruction based on injection strength
    const hasHighRelevance = sorted.some(m => m.finalScore > 0.7);
    const hasMentionables = sorted.some(m => m.shouldMention);
    
    if (hasHighRelevance && hasMentionables) {
      contextBlock += `\n✨ These details are HIGHLY relevant to the current topic. Reference them naturally (e.g., "For your company..." or "Given your background in...").`;
    } else {
      contextBlock += `\n⚠️ Include these details ONLY if contextually natural. Don't force them if irrelevant to the specific question.`;
    }
    
    return contextBlock;
  }
  
  /**
   * Format memory content based on category for natural reading
   */
  private formatMemoryContent(category: string, content: string, metadata?: any): string {
    // Clean up content
    const cleaned = content.trim();
    
    switch (category) {
      case 'name':
        return `User's name: ${cleaned}`;
      case 'company':
      case 'business':
        if (cleaned.toLowerCase().includes('company') || cleaned.toLowerCase().includes('business')) {
          return cleaned;
        }
        return `Runs/owns: ${cleaned}`;
      case 'profession':
      case 'work':
      case 'job':
        if (cleaned.toLowerCase().includes('work') || cleaned.toLowerCase().includes('profession')) {
          return cleaned;
        }
        return `Profession: ${cleaned}`;
      case 'location':
        return `Location: ${cleaned}`;
      case 'education':
      case 'studies':
        return `Education: ${cleaned}`;
      case 'skills':
        return `Skills: ${cleaned}`;
      case 'hobbies':
      case 'hobby':
      case 'interests':
      case 'interest':
        return `Interests: ${cleaned}`;
      case 'family':
        return `Family: ${cleaned}`;
      case 'pets':
      case 'pet':
        return `Pet: ${cleaned}`;
      case 'goal':
        return `Goal: ${cleaned}`;
      case 'plan':
        return `Plan: ${cleaned}`;
        
      // 🎯 LEARNING MOMENTS - Special handling for personalized learning context
      case 'learning_moment':
        // Extract useful info from learning moment
        const courseTitle = metadata?.courseTitle || '';
        const hasStruggle = metadata?.hasStruggle;
        const emotionalState = metadata?.emotionalState;
        
        if (hasStruggle) {
          return `Learning challenge: Struggled with "${courseTitle || cleaned}" ${emotionalState ? `(felt ${emotionalState})` : ''}`;
        } else if (emotionalState === 'excited' || emotionalState === 'confident') {
          return `Learning breakthrough: Had success with "${courseTitle || cleaned}"`;
        }
        return `Currently learning: ${courseTitle || cleaned}`;
        
      case 'course':
        // Course summaries (not content)
        if (cleaned.length > 100) {
          // Truncate long content, extract just the title
          const titleMatch = cleaned.match(/Learning Course: "([^"]+)"/);
          if (titleMatch) {
            return `Currently studying: ${titleMatch[1]}`;
          }
        }
        return `Learning: ${cleaned.substring(0, 80)}...`;
        
      default:
        return cleaned;
    }
  }
  
  // ============= UTILITY METHODS =============
  
  /**
   * Check if a message is likely to benefit from proactive memory injection
   */
  shouldApplyProactiveContext(message: string): boolean {
    const msgLower = message.toLowerCase();
    
    // Skip for very short messages (greetings)
    if (message.length < 10) return false;
    
    // Skip for explicit memory queries (handled elsewhere)
    if (/\b(remember|recall|what do you know|my name|tell me about me)\b/i.test(message)) {
      return false;
    }
    
    // Skip for meta-questions about the AI itself
    if (/\b(what are you|who are you|can you|what can you do)\b/i.test(message)) {
      return false;
    }
    
    // Apply for everything else
    return true;
  }
}

// ============= EXPORTS =============

export const proactiveMemoryContextService = ProactiveMemoryContextService.getInstance();
export { ProactiveMemoryContextService };

