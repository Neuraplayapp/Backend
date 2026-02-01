/**
 * 🎯 MEMORY SUPERSESSION SERVICE
 * 
 * Context-aware memory prioritization that understands:
 * - Core Identity (name, location) - for greetings
 * - Relationships (family, coaches, friends) - when asking about people
 * - Preferences (learning style, interests) - for personalization
 * - Goals & Motivation - when discussing progress/aspirations
 * - Education (courses, modules, progress) - for dashboard/learning queries
 * - Recent Activities - for "what did we do last time" type queries
 * 
 * The service dynamically boosts memories based on query context,
 * not just static category matching.
 */

export interface QueryContext {
  type: 'greeting' | 'recall' | 'chat' | 'dashboard' | 'learning';
  category?: string;           // LLM-determined category (family, education, etc.)
  queryTerms?: string[];       // Extracted search terms
  resolvedPronoun?: string;    // "him" → "mohammed"
  isTemporalQuery?: boolean;   // "last time", "yesterday", "before"
  isDashboardQuery?: boolean;  // User is on dashboard
  currentCourse?: string;      // Current course being studied
}

export interface ScoredMemory {
  // Original memory fields preserved via spread
  [key: string]: any;
  
  // Supersession scoring metadata
  _supersession: {
    timeDecay: number;
    relevance: number;
    importance: number;
    sourcePriority: number;
    accessBonus: number;
    contextBoost: number;
    boostReason: string;
    score: number;
    ageInDays: number;
  };
}

// 🎯 CATEGORY DEFINITIONS: What types of memories exist
const CATEGORY_DEFINITIONS = {
  // Core identity - user's personal information
  // 🎯 EXPANDED: Include all possible name key patterns
  coreIdentity: {
    keys: ['user_name', 'name_', '_name', 'my_name', 'i_am', 'i_am_', 'user_', 'personal_', 
           'user_location', 'user_profession', 'user_studies', 'user_skill', 'current_location'],
    categories: ['name', 'personal', 'identity', 'location', 'profession', 'studies', 'skills'],
    boost: 0.5, // 🎯 INCREASED from 0.4 to prioritize identity
    reason: 'core_identity'
  },
  
  // Relationships - family, friends, coaches
  relationships: {
    keys: ['family_', 'wife', 'husband', 'mother', 'father', 'uncle', 'aunt', 'brother', 'sister', 'son', 'daughter', 'friend', 'coach', 'mentor', 'colleague'],
    categories: ['family', 'relationships', 'people', 'social'],
    boost: 0.35,
    reason: 'relationship'
  },
  
  // Preferences - how user likes things
  preferences: {
    keys: ['preference_', 'likes_', 'prefers_', 'favorite_', 'learning_style', 'communication_style'],
    categories: ['preference', 'preferences', 'style', 'likes'],
    boost: 0.3,
    reason: 'preference'
  },
  
  // Goals & Motivation - what user wants to achieve
  goals: {
    keys: ['goal_', 'motivation_', 'aspiration_', 'wants_to', 'aims_to', 'objective_', 'target_'],
    categories: ['goal', 'goals', 'motivation', 'aspiration', 'objectives'],
    boost: 0.35,
    reason: 'goal'
  },
  
  // Education - courses, modules, learning progress
  education: {
    keys: ['course_', 'module_', 'lesson_', 'learning_', 'study_', 'progress_', 'dashboard_', 'educational_'],
    categories: ['education', 'course', 'courses', 'learning', 'module', 'dashboard', 'academic'],
    boost: 0.4,
    reason: 'education'
  },
  
  // Recent activities - what happened in sessions
  activities: {
    keys: ['activity_', 'session_', 'discussed_', 'worked_on', 'last_topic', 'recent_'],
    categories: ['activity', 'session', 'history', 'recent'],
    boost: 0.3,
    reason: 'activity'
  },
  
  // Canvas documents - created content
  canvas: {
    keys: ['canvas_', 'document_', 'chart_', 'code_'],
    categories: ['canvas', 'document', 'creation'],
    boost: 0.25,
    reason: 'canvas'
  }
};

class MemorySupersessionService {
  
  /**
   * 🎯 MAIN ENTRY: Apply context-aware scoring to memories
   * 
   * @param memories - Raw memories from vector search
   * @param context - Query context for smart boosting
   * @param topN - How many top memories to return
   */
  applyContextAwareScoring(
    memories: any[], 
    context: QueryContext, 
    topN: number = 15
  ): ScoredMemory[] {
    if (!memories || memories.length === 0) return [];
    
    console.log(`🎯 MemorySupersession: Scoring ${memories.length} memories for ${context.type} query`);
    
    const scoredMemories = memories.map(mem => this.scoreMemory(mem, context));
    
    // Sort by supersession score (highest first) and take top N
    scoredMemories.sort((a, b) => (b._supersession?.score || 0) - (a._supersession?.score || 0));
    const topMemories = scoredMemories.slice(0, topN);
    
    // Log top 5 for debugging
    console.log(`🎯 Top ${Math.min(5, topMemories.length)} memories after supersession:`);
    topMemories.slice(0, 5).forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.memory_key || m.key}: score=${m._supersession.score.toFixed(3)} (${m._supersession.boostReason})`);
    });
    
    return topMemories;
  }
  
  /**
   * Score a single memory based on context
   */
  private scoreMemory(mem: any, context: QueryContext): ScoredMemory {
    // 📊 BASE SCORING: Time decay + relevance + importance + source
    const baseScore = this.calculateBaseScore(mem);
    
    // 🎯 CONTEXT BOOST: Dynamic boost based on query context
    const contextBoost = this.calculateContextBoost(mem, context);
    
    // 🔢 FINAL SUPERSESSION SCORE
    const finalScore = baseScore.combinedScore + contextBoost.boost;
    
    return {
      ...mem,
      _supersession: {
        timeDecay: baseScore.timeDecay,
        relevance: baseScore.relevance,
        importance: baseScore.importance,
        sourcePriority: baseScore.sourcePriority,
        accessBonus: baseScore.accessBonus,
        contextBoost: contextBoost.boost,
        boostReason: contextBoost.reason,
        score: finalScore,
        ageInDays: baseScore.ageInDays
      }
    };
  }
  
  /**
   * Calculate base score (time decay, relevance, importance, source)
   */
  private calculateBaseScore(mem: any): {
    timeDecay: number;
    relevance: number;
    importance: number;
    sourcePriority: number;
    accessBonus: number;
    combinedScore: number;
    ageInDays: number;
  } {
    // Time decay: 1% per day, minimum 50%
    const memoryTimestamp = mem.created_at ? new Date(mem.created_at).getTime() : 
                            mem.timestamp ? new Date(mem.timestamp).getTime() : Date.now();
    const ageInDays = (Date.now() - memoryTimestamp) / (1000 * 60 * 60 * 24);
    const timeDecay = Math.max(0.5, 1 - (ageInDays * 0.01));
    
    // Relevance: semantic similarity score
    const relevance = mem.similarity || 0.8;
    
    // Importance: from metadata or default
    const importance = mem.metadata?.importanceScore || 0.5;
    
    // Source priority
    const source = mem.metadata?.source || mem.source || 'auto_captured';
    const sourcePriority: number = ({
      'llm_extraction_validated': 0.7,
      'explicit_statement': 1.0,
      'inferred_from_context': 0.8,
      'auto_captured': 0.7,
      'canvas_derived': 0.6
    } as Record<string, number>)[source] || 0.7;
    
    // Access bonus (up to +0.2)
    const accessCount = mem.metadata?.accessCount || 0;
    const accessBonus = Math.min(0.2, accessCount * 0.02);
    
    const combinedScore = (relevance * timeDecay * importance * sourcePriority) + accessBonus;
    
    return { timeDecay, relevance, importance, sourcePriority, accessBonus, combinedScore, ageInDays };
  }
  
  /**
   * 🎯 CONTEXT BOOST: Dynamically boost based on query context
   * This is the "smart" part that understands what's being asked
   */
  private calculateContextBoost(mem: any, context: QueryContext): { boost: number; reason: string } {
    const memKey = (mem.memory_key || mem.key || '').toLowerCase();
    const memCategory = (mem.metadata?.category || mem.category || '').toLowerCase();
    const memValue = (mem.content || mem.memory_value || mem.value || '').toLowerCase();
    
    // 🔄 ACCUMULATE BOOSTS: Multiple reasons can apply
    let totalBoost = 0;
    const reasons: string[] = [];
    
    // 1️⃣ GREETING CONTEXT: Boost core identity + recent activity
    if (context.type === 'greeting') {
      // Core identity is ALWAYS boosted for greetings
      if (this.matchesCategory(memKey, memCategory, CATEGORY_DEFINITIONS.coreIdentity)) {
        totalBoost += CATEGORY_DEFINITIONS.coreIdentity.boost;
        reasons.push('identity');
      }
      // Preferences help personalize greeting
      if (this.matchesCategory(memKey, memCategory, CATEGORY_DEFINITIONS.preferences)) {
        totalBoost += CATEGORY_DEFINITIONS.preferences.boost * 0.5; // Half boost
        reasons.push('preference');
      }
      // Recent activities for "how's X going?"
      if (this.matchesCategory(memKey, memCategory, CATEGORY_DEFINITIONS.activities)) {
        totalBoost += CATEGORY_DEFINITIONS.activities.boost;
        reasons.push('recent');
      }
      // Education for learning-focused greetings
      if (this.matchesCategory(memKey, memCategory, CATEGORY_DEFINITIONS.education)) {
        totalBoost += CATEGORY_DEFINITIONS.education.boost * 0.5;
        reasons.push('education');
      }
    }
    
    // 2️⃣ DASHBOARD/LEARNING CONTEXT: Prioritize education memories
    if (context.type === 'dashboard' || context.type === 'learning' || context.isDashboardQuery) {
      if (this.matchesCategory(memKey, memCategory, CATEGORY_DEFINITIONS.education)) {
        totalBoost += CATEGORY_DEFINITIONS.education.boost;
        reasons.push('education');
      }
      // Goals are relevant to learning
      if (this.matchesCategory(memKey, memCategory, CATEGORY_DEFINITIONS.goals)) {
        totalBoost += CATEGORY_DEFINITIONS.goals.boost;
        reasons.push('goals');
      }
      // Current course gets extra boost
      if (context.currentCourse && memValue.includes(context.currentCourse.toLowerCase())) {
        totalBoost += 0.3;
        reasons.push('current_course');
      }
    }
    
    // 3️⃣ RECALL CONTEXT: Boost based on LLM-determined category
    if (context.type === 'recall' && context.category) {
      // Match LLM category to our category definitions
      const categoryBoost = this.getCategoryBoostByName(context.category, memKey, memCategory);
      if (categoryBoost.boost > 0) {
        totalBoost += categoryBoost.boost;
        reasons.push(categoryBoost.reason);
      }
      
      // Query terms get extra boost (direct name/topic match)
      if (context.queryTerms && context.queryTerms.length > 0) {
        const termMatch = context.queryTerms.some(term => 
          term.length >= 3 && (memKey.includes(term) || memValue.includes(term))
        );
        if (termMatch) {
          totalBoost += 0.35;
          reasons.push('query_match');
        }
      }
      
      // Resolved pronoun match ("him" → "mohammed")
      if (context.resolvedPronoun && memValue.includes(context.resolvedPronoun.toLowerCase())) {
        totalBoost += 0.3;
        reasons.push('pronoun_resolved');
      }
    }
    
    // 4️⃣ TEMPORAL QUERIES: Boost recent activities
    if (context.isTemporalQuery) {
      if (this.matchesCategory(memKey, memCategory, CATEGORY_DEFINITIONS.activities)) {
        totalBoost += 0.4;
        reasons.push('temporal');
      }
      // Also boost very recent memories (< 7 days old)
      const ageInDays = this.getMemoryAge(mem);
      if (ageInDays < 7) {
        totalBoost += 0.2 * (1 - ageInDays / 7); // More recent = more boost
        reasons.push('recent_memory');
      }
    }
    
    // 5️⃣ REGULAR CHAT: Light boost for identity + preferences
    if (context.type === 'chat' && reasons.length === 0) {
      // Always have some identity context available
      if (this.matchesCategory(memKey, memCategory, CATEGORY_DEFINITIONS.coreIdentity)) {
        totalBoost += CATEGORY_DEFINITIONS.coreIdentity.boost * 0.3; // Light boost
        reasons.push('identity_context');
      }
      // Preferences help maintain personalization
      if (this.matchesCategory(memKey, memCategory, CATEGORY_DEFINITIONS.preferences)) {
        totalBoost += CATEGORY_DEFINITIONS.preferences.boost * 0.3;
        reasons.push('preference_context');
      }
    }
    
    return {
      boost: totalBoost,
      reason: reasons.length > 0 ? reasons.join('+') : 'none'
    };
  }
  
  /**
   * Check if memory matches a category definition
   */
  private matchesCategory(
    memKey: string, 
    memCategory: string, 
    categoryDef: { keys: string[]; categories: string[] }
  ): boolean {
    // Match by key patterns
    const keyMatch = categoryDef.keys.some(k => memKey.includes(k));
    // Match by category name
    const categoryMatch = categoryDef.categories.includes(memCategory);
    
    return keyMatch || categoryMatch;
  }
  
  /**
   * Get category boost by LLM-determined category name
   */
  private getCategoryBoostByName(
    categoryName: string, 
    memKey: string, 
    memCategory: string
  ): { boost: number; reason: string } {
    const categoryLower = categoryName.toLowerCase();
    
    // Map LLM categories to our definitions
    const categoryMapping: Record<string, keyof typeof CATEGORY_DEFINITIONS> = {
      'family': 'relationships',
      'relationships': 'relationships',
      'people': 'relationships',
      'name': 'coreIdentity',
      'identity': 'coreIdentity',
      'personal': 'coreIdentity',
      'location': 'coreIdentity',
      'preference': 'preferences',
      'preferences': 'preferences',
      'goal': 'goals',
      'goals': 'goals',
      'motivation': 'goals',
      'education': 'education',
      'course': 'education',
      'learning': 'education',
      'dashboard': 'education',
      'activity': 'activities',
      'recent': 'activities',
      'history': 'activities',
      'canvas': 'canvas',
      'document': 'canvas'
    };
    
    const defKey = categoryMapping[categoryLower];
    if (defKey && this.matchesCategory(memKey, memCategory, CATEGORY_DEFINITIONS[defKey])) {
      const def = CATEGORY_DEFINITIONS[defKey];
      return { boost: def.boost, reason: def.reason };
    }
    
    return { boost: 0, reason: 'no_match' };
  }
  
  /**
   * Get memory age in days
   */
  private getMemoryAge(mem: any): number {
    const memoryTimestamp = mem.created_at ? new Date(mem.created_at).getTime() : 
                            mem.timestamp ? new Date(mem.timestamp).getTime() : Date.now();
    return (Date.now() - memoryTimestamp) / (1000 * 60 * 60 * 24);
  }
  
  /**
   * 🎯 SIMPLE SUPERSESSION: For backwards compatibility (no context)
   * Uses greeting context by default (identity-focused)
   */
  applySupersessionScoring(memories: any[], topN: number = 10): ScoredMemory[] {
    return this.applyContextAwareScoring(memories, { type: 'greeting' }, topN);
  }
  
  /**
   * Detect if a query is temporal ("last time", "yesterday", "before")
   */
  isTemporalQuery(message: string): boolean {
    const temporalPatterns = [
      /last\s*(time|session|chat|conversation)/i,
      /yesterday/i,
      /before/i,
      /previous(ly)?/i,
      /earlier/i,
      /recent(ly)?/i,
      /what\s*did\s*we/i,
      /do\s*you\s*remember\s*when/i
    ];
    return temporalPatterns.some(p => p.test(message));
  }
  
  /**
   * Create query context from message analysis
   */
  createQueryContext(
    type: QueryContext['type'],
    llmAnalysis?: { category?: string; extractedData?: any },
    additionalContext?: Partial<QueryContext>
  ): QueryContext {
    const context: QueryContext = { type };
    
    if (llmAnalysis?.category) {
      context.category = llmAnalysis.category;
    }
    
    if (llmAnalysis?.extractedData) {
      const data = llmAnalysis.extractedData;
      if (data.query) {
        context.queryTerms = data.query.toLowerCase().split(/\s+/).filter((t: string) => t.length >= 3);
      }
      if (data.resolvedPronoun) {
        context.resolvedPronoun = data.resolvedPronoun;
      }
    }
    
    // Merge additional context
    return { ...context, ...additionalContext };
  }
}

// Singleton export
export const memorySupersessionService = new MemorySupersessionService();
export default memorySupersessionService;









