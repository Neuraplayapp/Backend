// Memory Operations - Extracted from ChatHandler.ts
// Handles all memory extraction, storage, retrieval, and supersession logic

import { chatMemoryService } from '../../services/ChatMemoryService';
import { 
  MEMORY_CATEGORIES, 
  PERSONAL_CATEGORIES,
  EDUCATION_CATEGORIES,
  DOCUMENT_CATEGORIES,
  detectCategoryFromKey,
  toStructuredMemory,
  isDocumentCategory,
  debugMemories,
  getCategoryBoost,
  type MemoryCategory 
} from '../../services/MemoryCategoryRegistry';

// 🎯 Export canonical categories for use in LLM prompts
const CANONICAL_CATEGORY_LIST = Object.values(MEMORY_CATEGORIES);
const CANONICAL_CATEGORY_ENUM = CANONICAL_CATEGORY_LIST.filter(c => 
  // Exclude system categories from user-facing extraction
  c !== 'canvas_document' && c !== 'document' && c !== 'cognitive' && c !== 'behavior' && c !== 'context'
);

// ========== INTERFACES ==========

export interface MemoryContext {
  type: 'store' | 'recall' | 'update' | 'forget' | 'ambiguous';
  confidence: number;
  category: string;
  extractedData?: {
    key?: string;
    value?: string;
    subject?: string;
    metadata?: any;
  };
  supersessionBehavior?: 'replace_conflicts' | 'accumulate';
  isPersonalRecallable?: boolean;
}

export interface AutoMemoryItem {
  category: string;
  key: string;
  value: string;
  timestamp: number;
  confidence: number;
  metadata?: any;
}

// ========== MEMORY OPERATIONS CLASS ==========

export class MemoryOperations {
  private conversationMemory: Map<string, any[]> = new Map();

  /**
   * 📍 Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * 🎯 SUPERSESSION SCORING: Apply time decay + relevance + importance for memory prioritization
   */
  applySupersessionScoring(memories: any[], topN: number = 10): any[] {
    if (!memories || memories.length === 0) return [];
    
    const scoredMemories = memories.map(mem => {
      const memoryTimestamp = mem.created_at ? new Date(mem.created_at).getTime() : 
                              mem.timestamp ? new Date(mem.timestamp).getTime() : Date.now();
      const ageInDays = (Date.now() - memoryTimestamp) / (1000 * 60 * 60 * 24);
      const timeDecay = Math.max(0.5, 1 - (ageInDays * 0.01));
      const relevance = mem.similarity || 0.8;
      const importance = mem.metadata?.importanceScore || 0.5;
      
      const source = mem.metadata?.source || mem.source || 'auto_captured';
      const sourcePriority = {
        'llm_extraction_validated': 0.7,
        'explicit_statement': 1.0,
        'inferred_from_context': 0.8,
        'auto_captured': 0.7,
        'canvas_derived': 0.6
      }[source] || 0.7;
      
      const accessCount = mem.metadata?.accessCount || 0;
      const accessBonus = Math.min(0.2, accessCount * 0.02);
      
      const memKey = (mem.memory_key || mem.key || '').toLowerCase();
      const memCategory = (mem.metadata?.category || mem.category || '').toLowerCase();
      
      const CORE_IDENTITY_KEYS = ['user_name', 'user_location', 'user_profession', 'user_studies', 'user_skill', 'current_location'];
      const CORE_IDENTITY_CATEGORIES = ['name', 'location', 'profession', 'studies', 'skills'];
      
      const isCoreIdentity = CORE_IDENTITY_KEYS.some(k => memKey.includes(k)) ||
                             CORE_IDENTITY_CATEGORIES.includes(memCategory);
      const identityBoost = isCoreIdentity ? 0.4 : 0;
      
      const supersessionScore = (relevance * timeDecay * importance * sourcePriority) + accessBonus + identityBoost;
      
      return {
        ...mem,
        _supersession: {
          timeDecay,
          relevance,
          importance,
          sourcePriority,
          accessBonus,
          identityBoost,
          isCoreIdentity,
          score: supersessionScore,
          ageInDays
        }
      };
    });
    
    scoredMemories.sort((a, b) => (b._supersession?.score || 0) - (a._supersession?.score || 0));
    return scoredMemories.slice(0, topN);
  }

  /**
   * 🧠 LLM-POWERED MEMORY CONTEXT ANALYSIS
   */
  async analyzeMemoryContext(message: string, intentAnalysis?: any, conversationHistory?: any[]): Promise<MemoryContext> {
    const msgLower = message.toLowerCase();
    
    // 🔥 FAST PATH: Explicit delete/forget requests - BYPASS LLM for reliability
    const deleteAllPattern = /\b(delete|remove|forget|clear|wipe|erase)\b.*(all|every|everything).*(memor|info|data|know|remember)/i;
    const deleteMemoriesPattern = /\b(delete|remove|forget|clear|wipe|erase)\b.*(your|my)?.*(memor|info|data)/i;
    const forgetMePattern = /\bforget\b.*(about|everything|all|me)/i;
    
    if (deleteAllPattern.test(message) || forgetMePattern.test(message)) {
      console.log('🔥 FAST PATH: Detected explicit DELETE ALL request');
      return {
        type: 'forget',
        confidence: 0.99,
        category: 'all',
        extractedData: { targetMemory: 'all' },
        supersessionBehavior: 'replace_conflicts',
        isPersonalRecallable: false
      };
    }
    
    if (deleteMemoriesPattern.test(message)) {
      console.log('🔥 FAST PATH: Detected DELETE MEMORIES request');
      return {
        type: 'forget',
        confidence: 0.95,
        category: 'memory',
        extractedData: { targetMemory: 'personal' },
        supersessionBehavior: 'replace_conflicts',
        isPersonalRecallable: false
      };
    }
    
    // Fast path for greetings
    const simpleGreetingPattern = /^(hey|hi|hello|hiya|heya|yo|sup|whats up|what's up|good\s*(morning|afternoon|evening)|i'?m back|back again)[\s!.,?]*$/i;
    if (simpleGreetingPattern.test(message.trim())) {
      return {
        type: 'ambiguous',
        confidence: 0.99,
        category: 'greeting',
        extractedData: {}
      };
    }
    
    try {
      const memoryAnalysis = await this.getLLMMemoryAnalysis(message, conversationHistory);
      
      if (memoryAnalysis) {
        return {
          type: memoryAnalysis.type,
          confidence: memoryAnalysis.confidence,
          category: memoryAnalysis.category,
          extractedData: memoryAnalysis.extractedData,
          supersessionBehavior: memoryAnalysis.supersessionBehavior || this.getDefaultSupersessionBehavior(memoryAnalysis.category),
          isPersonalRecallable: memoryAnalysis.isPersonalRecallable !== false
        };
      }
    } catch (error) {
      console.warn('⚠️ LLM memory analysis failed, using fallback:', error);
    }
    
    // Fallback
    if (intentAnalysis?.toolRequests?.isMemoryRequest) {
      const hasRememberKeywords = /\b(remember|save|store|memorize|don't forget|note that)\b/i.test(message);
      const hasPersonalInfo = /\b(my|i'm|i am|im|i)\b/i.test(message);
      const hasNumericData = /\d+\s*(cm|kg|lbs|ft|inches|years|old|tall|weigh)/i.test(message);
      
      if (hasRememberKeywords && (hasPersonalInfo || hasNumericData)) {
        const dynamicCategory = await this.detectCategoryWithLLM(message);
        return {
          type: 'store' as const,
          confidence: 0.95,
          category: dynamicCategory || 'general',
          extractedData: this.extractDataFromMessage(message)
        };
      }
      
      const isPureQuestion = /^(what|who|where|when|how|do you know|tell me)\b/i.test(message.trim());
      
      return {
        type: isPureQuestion ? 'recall' : (hasPersonalInfo ? 'store' : 'recall'),
        confidence: 0.9,
        category: 'general' as const,
        extractedData: this.extractDataFromMessage(message)
      };
    }
    
    return { type: 'ambiguous', confidence: 0, category: 'general' };
  }

  /**
   * 🧠 LLM-POWERED MEMORY ANALYSIS
   */
  async getLLMMemoryAnalysis(message: string, conversationHistory?: any[]): Promise<any> {
    try {
      const { UnifiedAPIRouter } = await import('../../services/UnifiedAPIRouter');
      const unifiedAPIRouter = UnifiedAPIRouter.getInstance();
      
      let contextSection = '';
      if (conversationHistory && conversationHistory.length > 0) {
        const recentMessages = conversationHistory.slice(-7);
        const contextLines = recentMessages.map(msg => 
          `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        ).join('\n');
        contextSection = `\n\nRECENT CONVERSATION CONTEXT:\n${contextLines}\n`;
      }
      
      // 🔧 CRITICAL: Tell model to output ONLY JSON with CANONICAL categories from MemoryCategoryRegistry
      const prompt = `OUTPUT ONLY VALID JSON. NO EXPLANATIONS. NO REASONING. JUST THE JSON OBJECT.

Analyze this message for memory operations.

Message: "${message}"${contextSection}

TYPE RULES:
1. Personal info sharing (name, family, location, work, interests) = type: "store"
2. "remember that", "don't forget", "save this" = type: "store"
3. "what's my", "tell me about", "do you know", "do you remember" = type: "recall"
4. "delete", "remove", "forget", "clear" = type: "forget"
5. NEGATIONS that correct wrong info = type: "forget"
6. "actually it's", "I meant", "no, it's" = type: "update"
7. Casual greetings with no personal info = type: "ambiguous"

🚨 CATEGORY MUST BE ONE OF THESE EXACT VALUES (from MemoryCategoryRegistry):

TIER 1 - IDENTITY:
- "name" = user's own name, who they are, identity

TIER 2 - RELATIONSHIPS & DEMOGRAPHICS:
- "family" = uncle, aunt, mother, father, brother, sister, cousin, grandparent, wife, husband, spouse, partner, relative
- "friend" = friends, buddies, pals
- "colleague" = coworkers, work partners, boss
- "location" = city, country, address, where they live/from
- "profession" = job, work, career, occupation
- "age" = how old they are
- "birthday" = birth date, when born
- "pet" = dog, cat, animals, pets

TIER 3 - PREFERENCES & INTERESTS:
- "preference" = what they prefer, like, dislike
- "hobby" = hobbies, activities, pastimes
- "interest" = topics they're interested in
- "favorite" = favorite things

TIER 4 - GOALS & EMOTIONS:
- "goal" = dreams, aspirations, ambitions, what they want to achieve
- "plan" = plans, intentions, schedule
- "emotion" = how they feel, emotional state
- "mood" = current mood

TIER 5 - EDUCATION:
- "education" = school, university, studies, degree
- "course" = courses, lessons, learning

- "general" = anything that doesn't fit above categories

Return JSON: { "type": "store|recall|forget|update|ambiguous", "category": "<one of the categories above>", "confidence": 0.0-1.0, "extractedData": {} }

RESPOND WITH ONLY THE JSON OBJECT.`;
      
      // 🎯 CRITICAL FIX: Use response_format to FORCE JSON output (like working category detection)
      const result = await unifiedAPIRouter.routeAPICall('fireworks', 'llm-completion', {
        messages: [
          { role: 'system', content: 'You are a JSON extraction API. Return ONLY valid JSON with no additional text, explanations, or reasoning.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000, // MATCH WORKING CALLS: 300 was causing model to switch to reasoning mode
        temperature: 0.0, // CRITICAL: Deterministic = no reasoning tokens
        model: 'accounts/fireworks/models/gpt-oss-120b',
        response_format: { type: 'json_object' } // 🔒 FORCE JSON - prevents reasoning tokens!
      });
      
      if (result?.success && result?.data) {
        let responseText = '';
        // Try content first, then reasoning_content as fallback (Fireworks quirk)
        if (result.data?.choices?.[0]?.message?.content) {
          responseText = result.data.choices[0].message.content;
        } else if (result.data?.choices?.[0]?.message?.reasoning_content) {
          // 🔧 FIX: Some models put JSON in reasoning_content instead of content
          responseText = result.data.choices[0].message.reasoning_content;
          console.log('⚠️ analyzeMemoryContext: Using reasoning_content fallback');
        } else if (result.data?.[0]?.generated_text) {
          responseText = result.data[0].generated_text;
        } else if (result.data?.completion) {
          responseText = result.data.completion;
        }
        
        // 🎯 WORKING: Extract JSON with regex (like commit 2d9d24a)
        const match = responseText.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]);
            
            // 🔧 NORMALIZE CATEGORY: Map legacy/incorrect names to canonical MemoryCategoryRegistry values
            // CRITICAL: Each category must map to its EXACT canonical name from MemoryCategoryRegistry
            const categoryNormalizationMap: Record<string, string> = {
              // Plural → Singular (canonical)
              'pets': 'pet',
              'preferences': 'preference',
              'hobbies': 'hobby',
              'interests': 'interest',
              'favorites': 'favorite',
              'goals': 'goal',
              'plans': 'plan',
              'emotions': 'emotion',
              'moods': 'mood',
              'friends': 'friend',
              'colleagues': 'colleague',
              'courses': 'course',
              // Profession aliases
              'jobs': 'profession',
              'work': 'profession',
              'career': 'profession',
              // ⚠️ "relationships" is NOT a canonical category - expand to family (for spouse queries)
              // But friend/colleague have their OWN categories - don't collapse them!
              'relationships': 'family',
            };
            
            if (parsed.category && categoryNormalizationMap[parsed.category.toLowerCase()]) {
              const oldCategory = parsed.category;
              parsed.category = categoryNormalizationMap[parsed.category.toLowerCase()];
              console.log(`🔄 Category normalized: "${oldCategory}" → "${parsed.category}"`);
            }
            
            console.log('🔍 getLLMMemoryAnalysis parsed:', parsed);
            return parsed;
          } catch (e) {
            console.warn('⚠️ JSON parse failed in memory analysis');
          }
        }
      }
      console.log('🔍 getLLMMemoryAnalysis: No success or no data', { success: result?.success, hasData: !!result?.data });
      return null;
    } catch (error) {
      console.warn('⚠️ LLM memory analysis failed:', error);
      return null;
    }
  }

  /**
   * Get default supersession behavior based on category
   */
  getDefaultSupersessionBehavior(category: string): 'replace_conflicts' | 'accumulate' {
    const replaceCategories = ['name', 'location', 'profession', 'age', 'nationality', 'language'];
    return replaceCategories.includes(category) ? 'replace_conflicts' : 'accumulate';
  }

  /**
   * Detect category using LLM
   * 🔒 Uses CANONICAL categories from MemoryCategoryRegistry
   */
  async detectCategoryWithLLM(message: string): Promise<MemoryCategory> {
    try {
      const { UnifiedAPIRouter } = await import('../../services/UnifiedAPIRouter');
      const unifiedAPIRouter = UnifiedAPIRouter.getInstance();
      
      // 🔒 Categories come from MemoryCategoryRegistry - single source of truth
      // 🎯 Use 120b model with response_format for reliable JSON
      const result = await unifiedAPIRouter.routeAPICall('fireworks', 'llm-completion', {
        messages: [{ 
          role: 'user', 
          content: `Categorize this message into ONE category. Return ONLY the JSON object, nothing else.

Message: "${message}"

Categories: ${CANONICAL_CATEGORY_ENUM.join(', ')}

Output: {"category":"chosen_category"}` 
        }],
        max_tokens: 100,
        temperature: 0.0, // CRITICAL: Deterministic = no reasoning tokens
        model: 'accounts/fireworks/models/llama-v3p1-8b-instruct',
        response_format: { type: 'json_object' }
      });
      
      if (result?.success && result?.data) {
        let responseText = '';
        // Try content first, then reasoning_content as fallback
        if (result.data?.choices?.[0]?.message?.content) {
          responseText = result.data.choices[0].message.content;
        } else if (result.data?.choices?.[0]?.message?.reasoning_content) {
          responseText = result.data.choices[0].message.reasoning_content;
        } else if (result.data?.[0]?.generated_text) {
          responseText = result.data[0].generated_text;
        } else if (result.data?.completion) {
          responseText = result.data.completion;
        }
        
        // 🎯 Use safeParseJSON for robust parsing
        const { LLMResponseNormalizer } = await import('../../services/LLMResponseNormalizer');
        const parsed = LLMResponseNormalizer.safeParseJSON(responseText);
        if (parsed?.category) {
          return parsed.category.toLowerCase();
        }
        // Extract category from text as last resort
        const catMatch = responseText.toLowerCase().match(new RegExp(CANONICAL_CATEGORY_ENUM.join('|')));
        return catMatch ? catMatch[0] : 'general';
      }
      return 'general';
    } catch {
      return 'general';
    }
  }

  /**
   * Extract data from message (simple patterns)
   */
  extractDataFromMessage(message: string): any {
    const data: any = {};
    
    // Name patterns
    const nameMatch = message.match(/\bmy\s+name\s+is\s+(\w+)/i) ||
                      message.match(/\bi(?:'m|\s+am)\s+(\w+)(?:\s|$|\.)/i) ||
                      message.match(/\bcall\s+me\s+(\w+)/i);
    if (nameMatch && nameMatch[1]) {
      data.key = 'user_name';
      data.value = nameMatch[1];
    }
    
    return data;
  }

  /**
   * Extract memory data from message based on category
   */
  extractMemoryData(message: string, category: string): any {
    const data: any = {};
    
    switch (category) {
      case 'name':
        const nameMatch = message.match(/\bmy\s+name\s+is\s+(\w+)/i);
        if (nameMatch) {
          data.key = 'user_name';
          data.value = nameMatch[1];
        }
        break;
        
      case 'preference':
        const prefMatch = message.match(/(?:like|love|prefer|hate|enjoy)\s+(.+?)(?:\.|,|!|$)/i);
        if (prefMatch) {
          data.key = `preference_${prefMatch[1].substring(0, 20).replace(/\s+/g, '_')}`;
          data.value = prefMatch[0];
        }
        break;
        
      case 'pet':
        const petMatch = message.match(/(?:pet|dog|cat|puppy|kitten).*?(?:called|named|is)\s+(\w+)/i);
        if (petMatch) {
          data.key = 'pet_name';
          data.value = petMatch[1];
        }
        break;
        
      default:
        const cleanMsg = message.replace(/^(remember|store|save|keep)\s+(that|this)?\s*/i, '').trim();
        data.key = `memory_${Date.now()}`;
        data.value = cleanMsg;
    }
    
    return data;
  }

  /**
   * Validate extraction in message
   */
  validateExtractionInMessage(extractedText: string, originalMessage: string): boolean {
    if (!extractedText || !originalMessage) return false;
    
    const normalizedExtracted = extractedText.toLowerCase().trim();
    const normalizedMessage = originalMessage.toLowerCase();
    
    // Check if key words from extraction exist in original
    const words = normalizedExtracted.split(/\s+/).filter(w => w.length > 2);
    const matchCount = words.filter(word => normalizedMessage.includes(word)).length;
    
    return matchCount >= Math.min(2, words.length);
  }

  /**
   * 🧠 Generate a structured memory key from category and content
   */
  generateMemoryKey(category: string, content: string): string {
    const cleanContent = content.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      .join('_');
    
    const categoryPrefix = category.toLowerCase().replace(/[^a-z]/g, '');
    return `${categoryPrefix}_${cleanContent}_${Date.now()}`;
  }

  /**
   * 🧠 Extract semantic memory key from full ID
   * IDs look like: "28ab2c05-644d-4baa-bf62-1f176e3c9c8f_family_uncle_ahmed_1767210087580"
   * We extract: "family_uncle_ahmed"
   */
  private extractMemoryKeyFromId(id: string): string {
    if (!id) return 'unknown';
    
    // Pattern: UUID_key_timestamp or just key_timestamp
    // Try to extract the middle part (the semantic key)
    const parts = id.split('_');
    
    // If starts with UUID (8-4-4-4-12 pattern), skip it
    if (parts[0] && parts[0].match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i)) {
      // Skip UUID and timestamp at end
      const keyParts = parts.slice(1, -1);
      return keyParts.join('_') || id;
    }
    
    // If ends with timestamp (all digits, 13 chars), remove it
    const lastPart = parts[parts.length - 1];
    if (lastPart && lastPart.match(/^\d{13}$/)) {
      return parts.slice(0, -1).join('_') || id;
    }
    
    return id;
  }

  /**
   * Extract auto memories from message using RetrievalMachine (STATE-OF-THE-ART)
   * 🧠 Uses sophisticated semantic extraction with importance scoring
   * 🔒 Uses CANONICAL categories from MemoryCategoryRegistry
   * 🎯 Properly structures output with entityName for people
   */
  async extractAutoMemories(
    message: string, 
    sessionId: string, 
    userId: string, 
    intentAnalysis?: any,
    conversationContext?: any
  ): Promise<AutoMemoryItem[]> {
    const memories: AutoMemoryItem[] = [];
    
    try {
      // 🧠 PRIMARY: Use RetrievalMachine for STATE-OF-THE-ART semantic extraction
      const { retrievalMachine } = await import('../intent/RetrievalMachine');
      
      const extractedMemories = await retrievalMachine.extractMemories(
        message,
        {
          topic: conversationContext?.topic || intentAnalysis?.context?.topic || 'general',
          sessionId,
          messageId: `msg_${Date.now()}`
        },
        [] // existing memories - could be populated from previous extractions
      );
      
      if (extractedMemories.length > 0) {
        console.log(`🧠 extractAutoMemories: RetrievalMachine extracted ${extractedMemories.length} state-of-the-art memories`);
        
        // 🐛 CRITICAL FIX: Get existing memories to prevent overwrites
        const { memoryDatabaseBridge } = await import('../../services/MemoryDatabaseBridge');
        let existingKeys = new Set<string>();
        
        try {
          const existingResult = await memoryDatabaseBridge.searchMemories({
            userId,
            query: 'user name family personal identity',
            limit: 50,
            includeMetadata: true
          });
          
          if (existingResult.success && existingResult.memories) {
            existingKeys = new Set(existingResult.memories.map((m: any) => 
              (m.memory_key || m.key || '').toLowerCase()
            ));
            console.log(`  🔒 Found ${existingKeys.size} existing memory keys for user`);
          }
        } catch (err) {
          console.warn('  ⚠️ Could not fetch existing memories:', err);
        }
        
        // 🔒 PROTECTED KEYS for name updates
        const protectedKeyPatterns = ['user_name', 'my_name', 'name'];
        const messageLower = message.toLowerCase();
        const isExplicitNameUpdate = 
          messageLower.includes('my name is') || 
          messageLower.includes('call me') ||
          messageLower.includes("i'm called");
        
        for (const extracted of extractedMemories) {
          // Only include high-importance memories (threshold from RetrievalMachine)
          if (extracted.importance < 0.5) {
            console.log(`  ⏭️ SKIPPING low-importance memory (${extracted.importance.toFixed(2)}): ${extracted.content}`);
            continue;
          }
          
          // 🎯 Map RetrievalMachine types to our canonical categories
          // Priority: 1) extracted.category (if valid), 2) content-based detection, 3) type-based mapping
          let normalizedCategory: MemoryCategory = MEMORY_CATEGORIES.GENERAL;
          
          // FIRST: Check if extracted.category is already a valid canonical category
          const validCategories = Object.values(MEMORY_CATEGORIES);
          if (extracted.category && validCategories.includes(extracted.category as any)) {
            normalizedCategory = extracted.category as MemoryCategory;
          } else {
            // SECOND: Detect category from content (more precise)
            const contentLower = extracted.content.toLowerCase();
            
            if (contentLower.includes('name is') || contentLower.includes('my name') || contentLower.includes('i am ')) {
              normalizedCategory = MEMORY_CATEGORIES.NAME;
            } else if (contentLower.includes('wife') || contentLower.includes('husband') || contentLower.includes('mother') || 
                       contentLower.includes('father') || contentLower.includes('brother') || contentLower.includes('sister') ||
                       contentLower.includes('uncle') || contentLower.includes('aunt') || contentLower.includes('cousin') ||
                       contentLower.includes('son') || contentLower.includes('daughter') || contentLower.includes('parent')) {
              normalizedCategory = MEMORY_CATEGORIES.FAMILY;
            } else if (contentLower.includes('friend')) {
              normalizedCategory = MEMORY_CATEGORIES.FRIEND;
            } else if (contentLower.includes('colleague') || contentLower.includes('coworker')) {
              normalizedCategory = MEMORY_CATEGORIES.COLLEAGUE;
            } else if (contentLower.includes('live in') || contentLower.includes('from ') || contentLower.includes('city') || contentLower.includes('country')) {
              normalizedCategory = MEMORY_CATEGORIES.LOCATION;
            } else if (contentLower.includes('work as') || contentLower.includes('job') || contentLower.includes('career') || contentLower.includes('profession')) {
              normalizedCategory = MEMORY_CATEGORIES.PROFESSION;
            } else if (contentLower.includes('years old') || contentLower.includes('age')) {
              normalizedCategory = MEMORY_CATEGORIES.AGE;
            } else if (contentLower.includes('birthday') || contentLower.includes('born on')) {
              normalizedCategory = MEMORY_CATEGORIES.BIRTHDAY;
            } else if (contentLower.includes('pet') || contentLower.includes('dog') || contentLower.includes('cat')) {
              normalizedCategory = MEMORY_CATEGORIES.PET;
            } else if (contentLower.includes('hobby') || contentLower.includes('hobbies')) {
              normalizedCategory = MEMORY_CATEGORIES.HOBBY;
            } else if (contentLower.includes('interest') || contentLower.includes('enjoy')) {
              normalizedCategory = MEMORY_CATEGORIES.INTEREST;
            } else if (contentLower.includes('favorite') || contentLower.includes('favourite')) {
              normalizedCategory = MEMORY_CATEGORIES.FAVORITE;
            } else if (contentLower.includes('prefer')) {
              normalizedCategory = MEMORY_CATEGORIES.PREFERENCE;
            } else if (contentLower.includes('goal') || contentLower.includes('aspiration') || contentLower.includes('want to')) {
              normalizedCategory = MEMORY_CATEGORIES.GOAL;
            } else if (contentLower.includes('plan to') || contentLower.includes('going to')) {
              normalizedCategory = MEMORY_CATEGORIES.PLAN;
            } else if (contentLower.includes('education') || contentLower.includes('school') || contentLower.includes('university') || contentLower.includes('degree')) {
              normalizedCategory = MEMORY_CATEGORIES.EDUCATION;
            } else if (contentLower.includes('course') || contentLower.includes('lesson')) {
              normalizedCategory = MEMORY_CATEGORIES.COURSE;
            } else if (contentLower.includes('feel') || contentLower.includes('emotion')) {
              normalizedCategory = MEMORY_CATEGORIES.EMOTION;
            } else if (contentLower.includes('mood')) {
              normalizedCategory = MEMORY_CATEGORIES.MOOD;
            } else {
              // THIRD: Fall back to type-based mapping
              const typeMap: Record<string, MemoryCategory> = {
            'personal': MEMORY_CATEGORIES.NAME,
            'relational': MEMORY_CATEGORIES.FAMILY,
            'preference': MEMORY_CATEGORIES.PREFERENCE,
            'professional': MEMORY_CATEGORIES.PROFESSION,
                'emotional': MEMORY_CATEGORIES.EMOTION,
                'behavioral': MEMORY_CATEGORIES.BEHAVIOR,
                'temporal': MEMORY_CATEGORIES.GENERAL,
            'factual': MEMORY_CATEGORIES.GENERAL
          };
              normalizedCategory = typeMap[extracted.type] || MEMORY_CATEGORIES.GENERAL;
            }
          }
          
          // Generate key from content
          const key = this.generateMemoryKey(normalizedCategory, extracted.content);
          const keyLower = key.toLowerCase();
          const isNameKey = protectedKeyPatterns.some(p => keyLower.includes(p));
          
          // Check protection logic
          if (isNameKey && isExplicitNameUpdate) {
            console.log(`  ✅ ALLOWING name update - user explicitly said their name`);
          } else if (existingKeys.has(keyLower)) {
            console.log(`  ⏭️ SKIPPING "${key}" - already exists for this user`);
            continue;
          } else {
            const hasExistingProtectedKey = protectedKeyPatterns.some(p => 
              Array.from(existingKeys).some(k => k.includes(p))
            );
            
            if (isNameKey && hasExistingProtectedKey) {
              console.log(`  🔒 SKIPPING "${key}" - protected key (name) already exists`);
              continue;
            }
          }
          
          console.log(`  📝 Extracted: ${normalizedCategory} | key="${key}" | importance=${extracted.importance.toFixed(2)} | emotional=${extracted.emotionalWeight.toFixed(2)}`);
          
          memories.push({
            category: normalizedCategory,
            key,
            value: extracted.content,
            timestamp: Date.now(),
            confidence: extracted.confidence,
            metadata: {
              source: 'retrieval_machine_semantic',
              sessionId,
              importance: extracted.importance,
              emotionalWeight: extracted.emotionalWeight,
              temporalRelevance: extracted.temporalRelevance,
              relationships: extracted.relationships,
              userMood: extracted.context.userMood,
              certaintyLevel: extracted.context.certaintyLevel,
              extractionMethod: extracted.metadata.extractionMethod
            }
          });
        }
        
        // If RetrievalMachine got results, return them
        if (memories.length > 0) {
          return memories;
        }
      }
      
      // 🔄 FALLBACK: Use LLM extraction if RetrievalMachine didn't find anything
      console.log('🔄 extractAutoMemories: Falling back to LLM extraction');
      const { UnifiedAPIRouter } = await import('../../services/UnifiedAPIRouter');
      const unifiedAPIRouter = UnifiedAPIRouter.getInstance();
      
      // 🔒 Prompt uses canonical categories from registry
      const prompt = `Extract personal information from this message. Be VERY precise with names.

Message: "${message}"

CATEGORIES (use ONLY these): ${CANONICAL_CATEGORY_ENUM.join(', ')}

⚠️ CRITICAL - DO NOT EXTRACT if the message is:
- A CORRECTION: "My name is NOT X", "I'm not X", "That's wrong"
- A DELETION REQUEST: "Forget X", "Delete X", "Remove X", "Don't remember X"
- A NEGATION: "I don't have X", "I'm not called X"
- A QUESTION: "What is my name?", "Do you remember X?"

Only extract NEW POSITIVE information like "My name IS X", "I have a dog named Y".

For EACH piece of POSITIVE information found, provide:
- category: one of the categories above
- key: descriptive key like "user_name", "family_wife_sarah", "pet_dog_max"
- value: the ACTUAL value (for people, use their FULL NAME, not the relation)
- entityName: if this is about a PERSON, put their actual name here (e.g., "Sarah", "John Smith")
- entityRelation: if this is a family member, put the relation here (e.g., "wife", "son", "mother")
- confidence: 0.0 to 1.0

CRITICAL: For family members, the 'value' and 'entityName' should be the person's ACTUAL NAME, NOT the relation type.
Example: "My wife Sarah" → entityName: "Sarah", entityRelation: "wife", value: "Sarah"

If NO positive information to extract, return: {"extractions": []}`;
      
      // 🎯 CRITICAL FIX: Use response_format to FORCE JSON output (like working category detection)
      const response = await unifiedAPIRouter.routeAPICall('fireworks', 'llm-completion', {
        messages: [
          { role: 'system', content: 'You are a JSON extraction API. Return ONLY valid JSON with no additional text, explanations, or reasoning.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000, // CRITICAL: Enough room for complete JSON (10+ entities)
        temperature: 0.0, // CRITICAL: Deterministic = no reasoning tokens
        model: 'accounts/fireworks/models/gpt-oss-120b',
        response_format: { type: 'json_object' } // 🔒 FORCE JSON - prevents reasoning tokens!
      });
      
      if (response?.success && response?.data) {
        let responseText = '';
        // Try content first, then reasoning_content as fallback (Fireworks quirk)
        if (response.data?.choices?.[0]?.message?.content) {
          responseText = response.data.choices[0].message.content;
        } else if (response.data?.choices?.[0]?.message?.reasoning_content) {
          // 🔧 FIX: Some models put JSON in reasoning_content instead of content
          responseText = response.data.choices[0].message.reasoning_content;
          console.log('⚠️ extractAutoMemories: Using reasoning_content fallback');
        } else if (response.data?.[0]?.generated_text) {
          responseText = response.data[0].generated_text;
        } else if (response.data?.completion) {
          responseText = response.data.completion;
        }
        
        // 🔍 DEBUG: Log what we got from LLM
        const { logger } = await import('../../services/LoggingService');
        logger.debug('extractAutoMemories', `LLM response (first 500 chars): ${responseText.substring(0, 500)}`);
        
        // 🎯 WORKING: Extract JSON with regex (like commit 2d9d24a)
        const match = responseText.match(/\{[\s\S]*\}/);
        let parsed: any = null;
        if (match) {
          try {
            parsed = JSON.parse(match[0]);
            logger.debug('extractAutoMemories', `Parsed JSON keys: ${Object.keys(parsed || {}).join(', ')}`);
          } catch (e) {
            logger.warn('extractAutoMemories', `JSON.parse failed: ${e}, trying safeParseJSON`);
            const { LLMResponseNormalizer } = await import('../../services/LLMResponseNormalizer');
            parsed = LLMResponseNormalizer.safeParseJSON(responseText);
          }
        } else {
          logger.warn('extractAutoMemories', 'No JSON object found in response');
        }
        // 🔧 FIX: LLM sometimes returns "data" instead of "extractions"
        const extractions = parsed?.extractions || parsed?.data || [];
        logger.info('extractAutoMemories', `Extractions count: ${extractions.length}`);
        
        if (extractions.length > 0) {
          console.log(`🧠 extractAutoMemories: LLM extracted ${extractions.length} items`);
          
          // 🐛 CRITICAL FIX: Get existing memories to prevent overwrites
          // If a key like "user_name" already exists, do NOT overwrite it via auto-extraction
          const { memoryDatabaseBridge } = await import('../../services/MemoryDatabaseBridge');
          let existingKeys = new Set<string>();
          
          try {
            // 🔧 FIX: Use searchMemories with broad query to get user's existing keys
            const existingResult = await memoryDatabaseBridge.searchMemories({
              userId,
              query: 'user name family personal identity', // Broad query for personal info
              limit: 50,
              includeMetadata: true
            });
            
            if (existingResult.success && existingResult.memories) {
              existingKeys = new Set(existingResult.memories.map((m: any) => 
                (m.memory_key || m.key || '').toLowerCase()
              ));
              console.log(`  🔒 Found ${existingKeys.size} existing memory keys for user`);
            }
          } catch (err) {
            console.warn('  ⚠️ Could not fetch existing memories:', err);
          }
          
          // 🔒 PROTECTED KEYS: These should NEVER be overwritten by auto-extraction
          // UNLESS user explicitly says "my name is X" or "call me X"
          const protectedKeyPatterns = ['user_name', 'my_name', 'name'];
          
          // 🎯 Check if this is an EXPLICIT name update from the user (simple string check)
          const messageLower = message.toLowerCase();
          const isExplicitNameUpdate = 
            messageLower.includes('my name is') || 
            messageLower.includes('call me') ||
            messageLower.includes("i'm called");
          
          for (const extraction of extractions) {
            if (this.validateExtractionInMessage(extraction.value, message)) {
              const keyLower = extraction.key?.toLowerCase() || '';
              const isNameKey = protectedKeyPatterns.some(p => keyLower.includes(p));
              
              // 🎯 If user explicitly says "my name is X", ALLOW the update (supersede old name)
              if (isNameKey && isExplicitNameUpdate) {
                console.log(`  ✅ ALLOWING name update - user explicitly said their name is "${extraction.value}"`);
                // Don't skip - let it through to update the name
              } else if (existingKeys.has(keyLower)) {
                // Skip non-name keys that already exist
                console.log(`  ⏭️ SKIPPING "${extraction.key}" - already exists for this user`);
                continue;
              } else {
                // Skip if this is a protected key pattern that exists in any form (and not explicit update)
              const hasExistingProtectedKey = protectedKeyPatterns.some(p => 
                Array.from(existingKeys).some(k => k.includes(p))
              );
              
                if (isNameKey && hasExistingProtectedKey) {
                console.log(`  🔒 SKIPPING "${extraction.key}" - protected key (name) already exists`);
                continue;
                }
              }
              
              // 🎯 Normalize category to canonical form
              const normalizedCategory = CANONICAL_CATEGORY_ENUM.includes(extraction.category) 
                ? extraction.category 
                : detectCategoryFromKey(extraction.key);
              
              // 🎯 For people, ensure entityName is properly set
              const entityName = extraction.entityName || 
                (extraction.category === MEMORY_CATEGORIES.FAMILY || extraction.category === MEMORY_CATEGORIES.NAME 
                  ? extraction.value 
                  : undefined);
              
              console.log(`  📝 Extracted: ${normalizedCategory} | key="${extraction.key}" | value="${extraction.value}" | entityName="${entityName || 'N/A'}"`);
              
              memories.push({
                category: normalizedCategory,
                key: extraction.key,
                value: extraction.value,
                timestamp: Date.now(),
                confidence: extraction.confidence || 0.8,
                metadata: {
                  source: 'llm_extraction_validated',
                  sessionId,
                  // 🎯 CRITICAL: Store entityName and entityRelation in metadata
                  entityName: entityName,
                  entityRelation: extraction.entityRelation,
                  entityType: entityName ? 'PERSON' : 'OTHER'
                }
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ LLM auto-extraction failed:', error);
      
      // Minimal fallback for names - ALLOW updates when user explicitly says "my name is X"
      const msgLower = message.toLowerCase();
      let extractedName: string | null = null;
      
      // Simple extraction: find word after "my name is" or "call me"
      if (msgLower.includes('my name is')) {
        const words = message.split(/\s+/);
        const idx = words.findIndex((w, i) => 
          i >= 2 && words[i-2]?.toLowerCase() === 'my' && words[i-1]?.toLowerCase() === 'name' && w.toLowerCase() === 'is'
        );
        if (idx >= 0 && words[idx + 1]) {
          extractedName = words[idx + 1].replace(/[.,!?]/g, '');
        }
      } else if (msgLower.includes('call me')) {
        const words = message.split(/\s+/);
        const idx = words.findIndex((w, i) => 
          i >= 1 && words[i-1]?.toLowerCase() === 'call' && w.toLowerCase() === 'me'
        );
        if (idx >= 0 && words[idx + 1]) {
          extractedName = words[idx + 1].replace(/[.,!?]/g, '');
        }
      }
      
      if (extractedName && extractedName.length > 1) {
        // Capitalize first letter
        extractedName = extractedName.charAt(0).toUpperCase() + extractedName.slice(1).toLowerCase();
        console.log(`  ✅ Fallback: User explicitly stated name is "${extractedName}" - allowing update`);
            memories.push({
              category: 'name',
              key: 'user_name',
          value: extractedName,
              timestamp: Date.now(),
          confidence: 0.95,
          metadata: { 
            source: 'explicit_user_statement',
            supersedes: true
          }
        });
      }
    }
    
    return memories;
  }

  /**
   * Store auto memories to database
   */
  async storeAutoMemories(memories: AutoMemoryItem[], sessionId: string, userId: string): Promise<void> {
    if (memories.length === 0) return;
    
    const { memoryDatabaseBridge } = await import('../../services/MemoryDatabaseBridge');
    const { vectorSearchService } = await import('../../services/VectorSearchService');
    
    // 🎯 If storing a new name that supersedes old ones, DELETE old name memories first
    const nameMemory = memories.find(m => 
      m.key?.toLowerCase().includes('user_name') && m.metadata?.supersedes
    );
    
    if (nameMemory) {
      console.log(`🗑️ Deleting old name memories before storing new name: "${nameMemory.value}"`);
      try {
        // Get all existing name memories for this user
        const existingMemories = await memoryDatabaseBridge.getMemoriesByUserId(userId);
        const oldNameMemories = existingMemories.filter((m: any) => 
          m.key?.toLowerCase().includes('user_name') || 
          m.key?.toLowerCase().includes('my_name') ||
          (m.metadata?.category === 'name' && m.key?.toLowerCase().includes('name'))
        );
        
        // Delete each old name memory
        for (const oldMem of oldNameMemories as any[]) {
          try {
            await memoryDatabaseBridge.deleteMemory(userId, oldMem.key || oldMem.memory_key);
            console.log(`  🗑️ Deleted old name memory: ${oldMem.key || oldMem.memory_key}`);
          } catch (delErr) {
            console.warn(`  ⚠️ Could not delete old memory:`, delErr);
          }
        }
      } catch (err) {
        console.warn('⚠️ Could not clean up old name memories:', err);
      }
    }
    
    const storagePromises = memories.map(async (memory) => {
      try {
        await memoryDatabaseBridge.storeMemory({
          userId,
          key: memory.key,
          value: memory.value,
          metadata: {
            ...memory.metadata,
            category: memory.category,
            confidence: memory.confidence,
            autoExtracted: true,
            source: 'auto_captured',
            sessionId,
            storedAt: new Date().toISOString()
          }
        });
        
        // Also store with vector embeddings
        try {
          await vectorSearchService.storeEmbedding({
            id: `${userId}_${memory.key}_${Date.now()}`,
            content: memory.value,
            embedding: await vectorSearchService.generateEmbedding(memory.value),
            metadata: {
              userId,
              key: memory.key,
              category: memory.category,
              confidence: memory.confidence,
              autoExtracted: true,
              sessionId,
              timestamp: Date.now()
            }
          });
        } catch (vectorError) {
          console.warn(`⚠️ Vector storage failed for ${memory.key}:`, vectorError);
        }
        
      } catch (error) {
        console.warn(`⚠️ Failed to auto-store memory: ${memory.key}`, error);
      }
    });
    
    await Promise.allSettled(storagePromises);
    console.log(`✅ Batch storage completed for ${memories.length} memories`);
  }

  /**
   * 🧠 Detect emotional state from message content
   */
  private detectEmotionalState(message: string): 'positive' | 'negative' | 'neutral' | 'excited' | 'frustrated' | 'confused' {
    const msgLower = message.toLowerCase();
    
    if (msgLower.match(/\b(excited|amazing|awesome|fantastic|wonderful|thrilled)\b/)) return 'excited';
    if (msgLower.match(/\b(frustrated|annoying|difficult|struggle|problem|angry|hate)\b/)) return 'frustrated';
    if (msgLower.match(/\b(confused|unclear|uncertain|not sure|puzzled|don't understand)\b/)) return 'confused';
    if (msgLower.match(/\b(happy|glad|love|enjoy|great|good|pleased)\b/)) return 'positive';
    if (msgLower.match(/\b(sad|disappointed|unhappy|bad|terrible|awful)\b/)) return 'negative';
    
    return 'neutral';
  }

  /**
   * 🧠 Detect temporal relevance from message content
   */
  private detectTemporalRelevance(message: string): 'recent' | 'ongoing' | 'historical' {
    const msgLower = message.toLowerCase();
    
    if (msgLower.match(/\b(before|previously|used to|in the past|history|ago|last year|years ago)\b/)) return 'historical';
    if (msgLower.match(/\b(always|usually|often|continuing|regular|habit|typically)\b/)) return 'ongoing';
    
    return 'recent';
  }

  /**
   * Get relevant memories using RecallMachine (STATE-OF-THE-ART 5-strategy retrieval)
   * 🧠 Uses EpisodicRetrievalSystem for semantic, emotional, temporal, associative, conversational recall
   * 🔒 Uses LLM-analyzed memoryContext for intelligent retrieval
   * 🔥 CRITICAL: ALWAYS retrieves identity memories regardless of message type (prevents amnesia!)
   * @param memoryContext - Optional LLM-analyzed context (category, type) from analyzeMemoryContext
   */
  async getRelevantMemories(message: string, sessionId: string, userId: string, memoryContext?: MemoryContext): Promise<any[]> {
    try {
      const msgLower = message.toLowerCase().trim();
      const llmCategory = memoryContext?.category?.toLowerCase();
      const llmType = memoryContext?.type;
      const isLLMRecall = llmType === 'recall';
      const firstWordGreeting = ['hi', 'hello', 'hey', 'yo', 'hiya', 'howdy', 'greetings', 'sup'].includes(msgLower.split(/[\s!?,.:]/)[0]);
      
      // 🎯 STEP 1: LEVERAGE FULL CATEGORY SYSTEM FROM MemoryCategoryRegistry
      // Use the canonical categories to build a comprehensive, intelligent search
      
      const { vectorSearchService } = await import('../../services/VectorSearchService');
      
      // 🔥 CORE IDENTITY: ALWAYS retrieve name + legacy general data (prevents amnesia!)
      const coreIdentityCategories: MemoryCategory[] = [
        MEMORY_CATEGORIES.NAME,
        MEMORY_CATEGORIES.GENERAL  // Legacy data may contain personal info!
      ];
      
      // 🔥 CATEGORY EXPANSION MAP: When user asks about X, also include related categories
      // Based on semantic relationships between our 28 categories
      const categoryExpansionMap: Record<string, MemoryCategory[]> = {
        // Relationships expand to include related people categories
        [MEMORY_CATEGORIES.FAMILY]: [MEMORY_CATEGORIES.FAMILY],
        [MEMORY_CATEGORIES.FRIEND]: [MEMORY_CATEGORIES.FRIEND],
        [MEMORY_CATEGORIES.COLLEAGUE]: [MEMORY_CATEGORIES.COLLEAGUE, MEMORY_CATEGORIES.PROFESSION],
        
        // Personal info categories
        [MEMORY_CATEGORIES.LOCATION]: [MEMORY_CATEGORIES.LOCATION],
        [MEMORY_CATEGORIES.PROFESSION]: [MEMORY_CATEGORIES.PROFESSION, MEMORY_CATEGORIES.EDUCATION],
        [MEMORY_CATEGORIES.AGE]: [MEMORY_CATEGORIES.AGE, MEMORY_CATEGORIES.BIRTHDAY],
        [MEMORY_CATEGORIES.BIRTHDAY]: [MEMORY_CATEGORIES.BIRTHDAY, MEMORY_CATEGORIES.AGE],
        [MEMORY_CATEGORIES.PET]: [MEMORY_CATEGORIES.PET],
        
        // Preferences & interests are related
        [MEMORY_CATEGORIES.PREFERENCE]: [MEMORY_CATEGORIES.PREFERENCE, MEMORY_CATEGORIES.FAVORITE],
        [MEMORY_CATEGORIES.HOBBY]: [MEMORY_CATEGORIES.HOBBY, MEMORY_CATEGORIES.INTEREST],
        [MEMORY_CATEGORIES.INTEREST]: [MEMORY_CATEGORIES.INTEREST, MEMORY_CATEGORIES.HOBBY],
        [MEMORY_CATEGORIES.FAVORITE]: [MEMORY_CATEGORIES.FAVORITE, MEMORY_CATEGORIES.PREFERENCE],
        
        // Goals & plans are related
        [MEMORY_CATEGORIES.GOAL]: [MEMORY_CATEGORIES.GOAL, MEMORY_CATEGORIES.PLAN],
        [MEMORY_CATEGORIES.PLAN]: [MEMORY_CATEGORIES.PLAN, MEMORY_CATEGORIES.GOAL],
        
        // Emotions & mood are related
        [MEMORY_CATEGORIES.EMOTION]: [MEMORY_CATEGORIES.EMOTION, MEMORY_CATEGORIES.MOOD],
        [MEMORY_CATEGORIES.MOOD]: [MEMORY_CATEGORIES.MOOD, MEMORY_CATEGORIES.EMOTION],
        
        // Education categories
        [MEMORY_CATEGORIES.EDUCATION]: [MEMORY_CATEGORIES.EDUCATION, MEMORY_CATEGORIES.COURSE],
        [MEMORY_CATEGORIES.COURSE]: [...EDUCATION_CATEGORIES],
        [MEMORY_CATEGORIES.LEARNING_MOMENT]: [...EDUCATION_CATEGORIES],
        
        // Document categories
        [MEMORY_CATEGORIES.CANVAS_DOCUMENT]: [...DOCUMENT_CATEGORIES],
        [MEMORY_CATEGORIES.DOCUMENT]: [...DOCUMENT_CATEGORIES],
        
        // Research
        [MEMORY_CATEGORIES.RESEARCH_INSIGHT]: [MEMORY_CATEGORIES.RESEARCH_INSIGHT, MEMORY_CATEGORIES.NEWS_DISCOVERY],
        [MEMORY_CATEGORIES.NEWS_DISCOVERY]: [MEMORY_CATEGORIES.NEWS_DISCOVERY, MEMORY_CATEGORIES.RESEARCH_INSIGHT],
      };
      
      // Build the list of categories to retrieve
      let categoriesToFetch: MemoryCategory[] = [...coreIdentityCategories];
      
      // Add category-specific categories if LLM detected a specific intent
      if (llmCategory && categoryExpansionMap[llmCategory as MemoryCategory]) {
        categoriesToFetch = [...categoriesToFetch, ...categoryExpansionMap[llmCategory as MemoryCategory]];
      }
      
      // For greetings or general queries, add ALL personal categories
      // This ensures the AI knows who the user is and can provide personalized responses
      if (firstWordGreeting || !llmCategory || llmCategory === 'general' || llmType !== 'recall') {
        categoriesToFetch = [...categoriesToFetch, ...PERSONAL_CATEGORIES];
      }
      
      // Deduplicate
      categoriesToFetch = [...new Set(categoriesToFetch)];
      
      console.log(`🧠 getRelevantMemories: Fetching ${categoriesToFetch.length} categories: ${categoriesToFetch.join(', ')} (llmCategory=${llmCategory}, isGreeting=${firstWordGreeting})`);
      
      // 🎯 SEMANTIC QUERY TERMS FOR EACH CATEGORY
      // These help the vector search find relevant memories
      const categoryQueryTerms: Record<MemoryCategory, string> = {
        // TIER 1: Core Identity
        [MEMORY_CATEGORIES.NAME]: 'user_name my name I am called who am I identity',
        
        // TIER 2: Relationships & Demographics
        [MEMORY_CATEGORIES.FAMILY]: 'family wife husband mother father brother sister uncle aunt cousin grandparent son daughter nephew niece relative',
        [MEMORY_CATEGORIES.FRIEND]: 'friend friends friendship buddy pal',
        [MEMORY_CATEGORIES.COLLEAGUE]: 'colleague coworker work partner team member boss',
        [MEMORY_CATEGORIES.LOCATION]: 'location city country where live from hometown address',
        [MEMORY_CATEGORIES.PROFESSION]: 'job work profession career occupation studies student',
        [MEMORY_CATEGORIES.AGE]: 'age years old how old',
        [MEMORY_CATEGORIES.BIRTHDAY]: 'birthday born date birth',
        [MEMORY_CATEGORIES.PET]: 'pet dog cat animal',
        
        // TIER 3: Preferences & Interests
        [MEMORY_CATEGORIES.PREFERENCE]: 'preference prefer like dislike favor',
        [MEMORY_CATEGORIES.HOBBY]: 'hobby hobbies activity activities pastime enjoy',
        [MEMORY_CATEGORIES.INTEREST]: 'interest interests passion passionate topic',
        [MEMORY_CATEGORIES.FAVORITE]: 'favorite favourite best love loved',
        [MEMORY_CATEGORIES.GENERAL]: 'personal about me identity general',
        
        // TIER 4: Goals & Emotions
        [MEMORY_CATEGORIES.GOAL]: 'goal dream aspiration ambition want achieve',
        [MEMORY_CATEGORIES.PLAN]: 'plan planning schedule deadline intention',
        [MEMORY_CATEGORIES.EMOTION]: 'emotion feeling feel emotional',
        [MEMORY_CATEGORIES.MOOD]: 'mood feeling state today',
        
        // TIER 5: Education
        [MEMORY_CATEGORIES.EDUCATION]: 'education school university degree study studies',
        [MEMORY_CATEGORIES.COURSE]: 'course lesson learning module section',
        [MEMORY_CATEGORIES.LEARNING_MOMENT]: 'learned learning insight moment',
        [MEMORY_CATEGORIES.RESEARCH_INSIGHT]: 'research insight finding discovery',
        [MEMORY_CATEGORIES.NEWS_DISCOVERY]: 'news article topic discovery',
        
        // TIER 6: System
        [MEMORY_CATEGORIES.COGNITIVE]: 'cognitive pattern thinking',
        [MEMORY_CATEGORIES.BEHAVIOR]: 'behavior pattern action',
        [MEMORY_CATEGORIES.CONTEXT]: 'context session information',
        
        // TIER 7: Documents
        [MEMORY_CATEGORIES.CANVAS_DOCUMENT]: 'canvas document wrote created',
        [MEMORY_CATEGORIES.DOCUMENT]: 'document file wrote created',
      };
      
      const identitySearchQuery = categoriesToFetch
        .map(cat => categoryQueryTerms[cat] || cat)
        .join(' ');
      
      // 🎯 FILTER at SQL level: Only get the categories we need
      // This ensures family memories aren't competing with course content!
      const identityMemories = await vectorSearchService.semanticSearch(
        identitySearchQuery,
        undefined,
        userId,
        50,
        0.05,
        { 
          categories: categoriesToFetch // 🎯 SQL-level category filtering!
        }
      );
      
      console.log(`🧠 getRelevantMemories: Retrieved ${identityMemories.length} memories from categories: ${categoriesToFetch.join(', ')}`);
      
      // 🎯 DEBUG: Log the actual memories retrieved (for debugging name/family issues)
      if (identityMemories.length > 0) {
        console.log(`📋 IDENTITY MEMORIES RETRIEVED:`);
        identityMemories.slice(0, 15).forEach((m, i) => {
          const key = m.memory_key || m.key || m.id || 'unknown';
          const category = m.metadata?.category || 'no-category';
          const content = (m.content || m.value || '').substring(0, 80);
          console.log(`   ${i+1}. [${category}] ${key}: "${content}..."`);
        });
      } else {
        console.warn(`⚠️ NO IDENTITY MEMORIES RETRIEVED! Categories searched: ${categoriesToFetch.join(', ')}`);
      }
      
      // 🧠 STEP 2: Use RecallMachine for message-specific retrieval
      const { episodicRetrievalSystem } = await import('../intent/RecallMachine');
      
      // Determine emotional state from context
      const emotionalState = this.detectEmotionalState(message);
      
      // Determine temporal relevance
      const temporalRelevance = this.detectTemporalRelevance(message);
      
      console.log(`🧠 getRelevantMemories: Using EpisodicRetrievalSystem (5-strategy recall) - emotion: ${emotionalState}, temporal: ${temporalRelevance}`);
      
      const recallResult = await episodicRetrievalSystem.contextualRecall({
        currentMessage: message,
        conversationContext: {
          topic: llmCategory || 'general',
          isGreeting: firstWordGreeting,
          isRecall: isLLMRecall
        },
        emotionalState,
        temporalRelevance,
        userId,
        sessionId,
        topK: 15,
        semanticSimilarity: true,
        associativeLinks: !firstWordGreeting // Don't run expensive associative recall for greetings
      });
      
      console.log(`🧠 getRelevantMemories: RecallMachine returned ${recallResult.memories.length} memories in ${recallResult.processingTime}ms (quality: ${recallResult.recallQuality.toFixed(2)}, strategy: ${recallResult.recallStrategy})`);
      
      // 🔥 CRITICAL: Merge identity memories with RecallMachine results
      // Identity memories are ALWAYS included to prevent amnesia
      const recallMemoryIds = new Set(recallResult.memories.map(m => m.id));
      
      // Convert identity memories to RecalledMemory format for merging
      // 🔧 Note: identityMemories is SearchResult[] - fields are in .metadata
      const identityAsRecalled = identityMemories
        .filter(m => {
          // Skip if already in recall results (avoid duplicates)
          const id = m.id || m.metadata?.memory_key;
          return !recallMemoryIds.has(id);
        })
        .filter(m => {
          // Filter out ONLY document/canvas content (NOT courses - user wants those!)
          // 🔥 FIX: Only filter course CHUNKS (detailed content), keep course SUMMARIES
          const key = (m.metadata?.memory_key || m.metadata?.key || m.id || '').toLowerCase();
          const cat = (m.metadata?.category || '').toLowerCase();
          // Only filter out course chunks (granular content), NOT course summaries
          if (cat === 'course' && key.includes('_chunk_')) return false;
          if (key.match(/^course_.*_section_\d+_chunk/)) return false;
          // Filter canvas documents
          if (cat === 'canvas_document' || cat === 'document') return false;
          return true;
        })
        .map(m => ({
          id: m.id || m.metadata?.memory_key,
          content: m.content || m.metadata?.memory_value || m.metadata?.value,
          type: 'personal' as const,
          category: m.metadata?.category || 'general',
          relevanceScore: 0.8, // High score for identity memories
          semanticSimilarity: m.similarity || 0.7,
          temporalRelevance: 0.5,
          emotionalAlignment: 0.5,
          associativeStrength: 0.5,
          recallReason: 'Core identity context (always included)',
          originalContext: m.metadata || {},
          lastAccessed: new Date(),
          accessCount: 1
        }));
      
      // Merge: RecallMachine results + identity memories
      const combinedMemories = [...recallResult.memories, ...identityAsRecalled];
      
      console.log(`🧠 getRelevantMemories: Combined ${recallResult.memories.length} RecallMachine + ${identityAsRecalled.length} identity = ${combinedMemories.length} total`);
      
      if (combinedMemories.length > 0) {
        // Convert RecalledMemory format to expected output format
        const memories = combinedMemories
          .filter(m => {
            // 🔥 Filter out course chunks - they have their own delivery channel
            const key = (m.id || '').toLowerCase();
            const cat = (m.category || '').toLowerCase();
            if (cat === 'course' && key.includes('_chunk_')) return false;
            if (key.match(/^course_.*_section_\d+/)) return false;
            if (cat === 'canvas_document' || cat === 'document') return false;
            return true;
          })
          .map(m => {
            // 🎯 CRITICAL: Extract the actual memory_key from id or originalContext
            // The id might be like "28ab2c05-..._family_uncle_ahmed_1767..."
            // We need the semantic key (family_uncle_ahmed) for categorization
            const memoryKey = m.originalContext?.memoryKey || 
                              m.originalContext?.key || 
                              m.originalContext?.memory_key ||
                              this.extractMemoryKeyFromId(m.id);
            
            return {
              id: m.id,
              memory_key: memoryKey,
              key: memoryKey,
              content: m.content,
              value: m.content,
              memory_value: m.content,
              category: m.category,
              similarity: m.relevanceScore,
              contextScore: m.relevanceScore,
              metadata: {
                category: m.category,
                subcategory: (m as any).subcategory, // May not exist on identity memories
                semanticSimilarity: m.semanticSimilarity,
                emotionalAlignment: m.emotionalAlignment,
                temporalRelevance: m.temporalRelevance,
                associativeStrength: m.associativeStrength,
                recallReason: m.recallReason,
                recallStrategy: recallResult.recallStrategy || 'identity_merged'
              }
            };
          });
        
        console.log(`🧠 getRelevantMemories: Returning ${memories.length} filtered memories (RecallMachine + identity)`);
        
        // Log first few results
        for (let i = 0; i < Math.min(5, memories.length); i++) {
          const m = memories[i];
          console.log(`  📝 Memory ${i}: category="${m.category}" | key="${m.key}" | relevance=${m.similarity?.toFixed(2)} | reason="${m.metadata?.recallReason}"`);
        }
        
        return memories;
      }
      
      // 🔄 FALLBACK: Use traditional vector search if RecallMachine returns nothing
      // 🔥 NOTE: We STILL have identityMemories from the start - include them!
      console.log('🔄 getRelevantMemories: RecallMachine returned 0 results, falling back to traditional vector search');
      console.log(`🔄 getRelevantMemories: But we still have ${identityMemories.length} identity memories to include!`);
      // vectorSearchService already imported at start of function
      
      let searchQuery = message;
      let limit = 20;
      let similarityThreshold = 0.5;

      // 🎯 LLM-DRIVEN RETRIEVAL: Use LLM's understanding of what user wants
      if (isLLMRecall && llmCategory) {
        console.log(`🧠 getRelevantMemories: Using LLM-analyzed category: "${llmCategory}"`);
        
        // 🎯 NORMALIZE LLM category to CANONICAL categories from MemoryCategoryRegistry
        // CRITICAL: Each category must map to its EXACT canonical name, never to a super-category
        const categoryNormalization: Record<string, string> = {
          // FAMILY - specific family roles → 'family' (canonical category)
          'uncle': 'family', 'uncles': 'family', 'aunt': 'family', 'aunts': 'family',
          'mother': 'family', 'father': 'family', 'parent': 'family', 'parents': 'family',
          'brother': 'family', 'sister': 'family', 'sibling': 'family', 'siblings': 'family',
          'cousin': 'family', 'cousins': 'family', 'relative': 'family', 'relatives': 'family',
          'spouse': 'family', 'partner': 'family', 'wife': 'family', 'husband': 'family',
          
          // FRIEND - their own canonical category
          'friend': 'friend', 'friends': 'friend', 'buddy': 'friend', 'pal': 'friend',
          
          // COLLEAGUE - their own canonical category (NOT family!)
          'colleague': 'colleague', 'colleagues': 'colleague', 'coworker': 'colleague', 
          'coworkers': 'colleague', 'boss': 'colleague', 'assistant': 'colleague',
          
          // PROFESSION
          'job': 'profession', 'work': 'profession', 'career': 'profession', 'occupation': 'profession',
          
          // LOCATION
          'city': 'location', 'country': 'location', 'address': 'location', 'home': 'location',
          
          // PREFERENCES & INTERESTS - their own canonical categories
          'hobby': 'hobby', 'hobbies': 'hobby',
          'interest': 'interest', 'interests': 'interest',
          'preference': 'preference', 'preferences': 'preference',
          
          // PET
          'dog': 'pet', 'cat': 'pet', 'animal': 'pet', 'pets': 'pet',
          
          // NAME/IDENTITY
          'user': 'name', 'self': 'name', 'me': 'name', 'myself': 'name'
        };
        
        const normalizedCategory = categoryNormalization[llmCategory] || llmCategory;
        console.log(`🧠 getRelevantMemories: Normalized category: "${llmCategory}" → "${normalizedCategory}"`);
        
        // Map normalized categories to targeted search queries
        // 🔥 ALL categories from MemoryCategoryRegistry.ts - each includes 'general' for legacy data
        const categorySearchMap: Record<string, { query: string; threshold: number; limit: number }> = {
          // PERSONAL IDENTITY
          'name': { query: 'user_name my name what is my name I am named personal identity general', threshold: 0.05, limit: 50 },
          'personal': { query: 'user_name my name personal identity location profession general', threshold: 0.05, limit: 50 },
          'identity': { query: 'user_name my name personal identity who am I general', threshold: 0.05, limit: 50 },
          'location': { query: 'location city country live living address where from general', threshold: 0.05, limit: 50 },
          'profession': { query: 'job work profession career occupation study studies general', threshold: 0.05, limit: 50 },
          'age': { query: 'age years old how old born general', threshold: 0.05, limit: 50 },
          'birthday': { query: 'birthday birth date born when born general', threshold: 0.05, limit: 50 },
          
          // RELATIONSHIPS
          'family': { query: 'family uncle aunt mother father brother sister cousin relative grandparent son daughter general', threshold: 0.05, limit: 50 },
          'relationships': { query: 'wife husband spouse partner family friend colleague relationship general', threshold: 0.05, limit: 50 },
          'wife': { query: 'wife spouse partner married marriage family general', threshold: 0.05, limit: 50 },
          'husband': { query: 'husband spouse partner married marriage family general', threshold: 0.05, limit: 50 },
          'friend': { query: 'friend friends friendship buddy pal general', threshold: 0.05, limit: 50 },
          'colleague': { query: 'colleague coworker work partner team member general', threshold: 0.05, limit: 50 },
          
          // PREFERENCES & INTERESTS
          'preference': { query: 'preference like prefer favorite enjoy general', threshold: 0.05, limit: 50 },
          'preferences': { query: 'preference like prefer favorite enjoy general', threshold: 0.05, limit: 50 },
          'hobby': { query: 'hobby hobbies activities pastime recreation general', threshold: 0.05, limit: 50 },
          'hobbies': { query: 'hobby hobbies activities pastime recreation general', threshold: 0.05, limit: 50 },
          'interest': { query: 'interest interests like enjoy passionate about general', threshold: 0.05, limit: 50 },
          'interests': { query: 'interest interests like enjoy passionate about general', threshold: 0.05, limit: 50 },
          'favorite': { query: 'favorite favourite best love prefer general', threshold: 0.05, limit: 50 },
          
          // PETS
          'pet': { query: 'pet dog cat animal companion general', threshold: 0.05, limit: 50 },
          'pets': { query: 'pet dog cat animal companion general', threshold: 0.05, limit: 50 },
          
          // GOALS & ASPIRATIONS
          'goal': { query: 'goal goals aspiration dream want to achieve general', threshold: 0.05, limit: 50 },
          'goals': { query: 'goal goals aspiration dream want to achieve general', threshold: 0.05, limit: 50 },
          'plan': { query: 'plan plans intention future going to general', threshold: 0.05, limit: 50 },
          
          // EDUCATION & LEARNING
          'education': { query: 'education school university degree study studied general', threshold: 0.05, limit: 50 },
          'course': { query: 'course lesson learning study progress education general', threshold: 0.05, limit: 50 },
          'courses': { query: 'course lesson learning study progress education general', threshold: 0.05, limit: 50 },
          'lesson': { query: 'lesson course learning study module section general', threshold: 0.05, limit: 50 },
          'lessons': { query: 'lesson course learning study module section general', threshold: 0.05, limit: 50 },
          'learning_moment': { query: 'learning moment learned discovered insight general', threshold: 0.05, limit: 50 },
          
          // RESEARCH & NEWS
          'research_insight': { query: 'research insight discovery finding explored general', threshold: 0.05, limit: 50 },
          'news_discovery': { query: 'news article topic read about explored general', threshold: 0.05, limit: 50 },
          
          // EMOTIONS & STATE
          'emotion': { query: 'emotion emotions feeling feelings felt general', threshold: 0.05, limit: 50 },
          'mood': { query: 'mood happy sad excited anxious feeling general', threshold: 0.05, limit: 50 },
          
          // SYSTEM/INTERNAL
          'cognitive': { query: 'cognitive pattern thinking style approach general', threshold: 0.05, limit: 50 },
          'behavior': { query: 'behavior behaviour pattern habit tendency general', threshold: 0.05, limit: 50 },
          'context': { query: 'context contextual situation circumstance general', threshold: 0.05, limit: 50 },
          
          // CATCH-ALL
          'general': { query: 'personal information about me user preferences family name location general', threshold: 0.05, limit: 50 },
        };
        
        const searchConfig = categorySearchMap[normalizedCategory] || categorySearchMap['general'];
        searchQuery = searchConfig.query;
        similarityThreshold = searchConfig.threshold;
        limit = searchConfig.limit;
      } else if (firstWordGreeting) {
        // Greeting - search broadly for personalization
        // 🔥 Include 'general' keyword since legacy memories may be stored there
        searchQuery = 'user name family preferences location profession hobbies personal information general about me';
        similarityThreshold = 0.10; // Lower threshold to catch legacy data
        limit = 50;
      } else {
        // 🔥 For ANY message, search broadly to include legacy 'general' category memories
        // This prevents amnesia when user asks about stored info
        searchQuery = `${message} user name family personal general about me`;
        similarityThreshold = 0.15;
        limit = 40;
      }
      // Otherwise use the enhanced message as searchQuery
      
      // 🎯 DETECT LEARNING HISTORY QUERIES
      // Learning moments should be included when asking about past learning experiences
      const isLearningHistoryQuery = 
        llmCategory === 'education' || 
        llmCategory === 'learning' ||
        msgLower.includes('struggle') ||
        msgLower.includes('struggled') ||
        msgLower.includes('learning history') ||
        msgLower.includes('how am i doing') ||
        msgLower.includes('my progress') ||
        msgLower.includes('what did i learn') ||
        msgLower.includes('how have i') ||
        msgLower.includes('improved') ||
        msgLower.includes('retention') ||
        msgLower.includes('review') ||
        msgLower.includes('forgot') ||
        msgLower.includes('remember from') ||
        msgLower.includes('last lesson') ||
        msgLower.includes('previous lesson');
      
      const searchResults = await vectorSearchService.semanticSearch(
        searchQuery,
        undefined,
        userId,
        limit,
        similarityThreshold,
        { 
          includeLearningMoments: isLearningHistoryQuery, // 🎯 Include for learning queries
          // 🔥 FIX: DON'T exclude courses - user might ask about their courses!
          // Only exclude document/canvas content which pollutes memory retrieval
          excludeCategories: ['canvas_document', 'document']
        }
      );
      
      if (isLearningHistoryQuery) {
        console.log('📚 getRelevantMemories: Including learning moments for learning history query');
      }
      
      console.log(`🔍 getRelevantMemories: Vector search returned ${searchResults.length} results`);
      
      // 🔥 CRITICAL: MERGE identity memories into search results (prevents amnesia!)
      // Identity memories were fetched at start - they MUST be included regardless of search query
      // 🔧 Note: SearchResult uses .id and .metadata for fields
      const searchResultIds = new Set(searchResults.map(r => r.id || r.metadata?.memory_key));
      const newIdentityMemories = identityMemories.filter(m => {
        const id = m.id || m.metadata?.memory_key;
        return !searchResultIds.has(id);
      });
      
      // Combine: search results + identity memories
      const combinedSearchResults = [...searchResults, ...newIdentityMemories];
      console.log(`🔥 getRelevantMemories: Merged ${searchResults.length} search + ${newIdentityMemories.length} identity = ${combinedSearchResults.length} total (FALLBACK path)`);
      
      // 🔒 Convert to structured format using registry
      const structured = combinedSearchResults.map(toStructuredMemory);
      debugMemories(structured, 'Raw search results (with identity)');
      
      // 🎯 CLEAN FILTERING FOR PERSONAL MEMORIES
      // Learning moments have their OWN delivery channel (UnifiedLearningContextService → learningContextSection)
      // They should NEVER pollute personal memory retrieval - they're added separately to the prompt
      
      const filteredResults = structured.filter(m => {
        const cat = (m.category || '').toLowerCase();
        const key = (m.key || '').toLowerCase();
        const content = (m.content || '').toLowerCase();
        
        // Always filter out document content
        if (isDocumentCategory(m.category)) return false;
        
        // Filter out search logs (never useful for context)
        if (key.includes('unified_') && content.includes('searched for')) return false;
        
        // 🔥 ALWAYS filter learning moments - they have their own dedicated section
        // UnifiedLearningContextService → learningContextSection in prompt
        // Keeping them here would be redundant AND pollute personal memory slots
        if (key.includes('learning_moment')) return false;
        if (cat === 'learning_moment') return false;
        if (content.startsWith('learning moment:')) return false;
        
        // 🔥 Filter ONLY course content CHUNKS - not course titles/summaries!
        // Course chunks have keys like: course_xxx_section_X_chunk_X
        // Course titles (course_greek_intro, course_arabic) are ALLOWED - user wants to know their courses!
        // Course summaries (ending with _summary) are ALLOWED - they're high-level overviews
        if (key.includes('_chunk_')) return false; // Filter any chunk (granular content)
        
        return true;
      });
      
      console.log(`🔍 getRelevantMemories: Filtered ${structured.length} → ${filteredResults.length} (category: ${llmCategory || 'none'}, learning history: ${isLearningHistoryQuery})`);
      
      // 🎯 USE EXISTING MEMORY SUPERSESSION SERVICE with LLM-analyzed context
      const { memorySupersessionService } = await import('../../services/MemorySupersessionService');
      
      // 🔥 USE LLM-ANALYZED CONTEXT - no more regex detection!
      let contextType: 'greeting' | 'recall' | 'chat' = 'chat';
      
      if (firstWordGreeting) {
        contextType = 'greeting';
      } else if (isLLMRecall || llmCategory) {
        // LLM already determined this is a recall query
        contextType = 'recall';
      }
      
      // 🎯 USE LLM-DETERMINED CATEGORY - the intelligent path
      const detectedCategory = llmCategory || undefined;
      
      console.log(`🧠 getRelevantMemories: contextType=${contextType}, category=${detectedCategory || 'none'}`);
      
      // Create query context for smart scoring
      const queryContext = memorySupersessionService.createQueryContext(
        contextType,
        { 
          category: detectedCategory,
          extractedData: { query: message }
        }
      );
      
      // Apply context-aware scoring - this will properly prioritize based on what user is asking
      const scoredResults = memorySupersessionService.applyContextAwareScoring(
        filteredResults, 
        queryContext, 
        20  // Keep top 20
      );
      
      // Use scored results (they're already sorted by context-aware score)
      const rerankedResults = scoredResults;
      
      console.log(`🔍 getRelevantMemories: After filtering: ${rerankedResults.length} results (removed ${structured.length - filteredResults.length} document entries)`);
      
      // Log first few results with full detail (now reranked with identity at top)
      for (let i = 0; i < Math.min(5, rerankedResults.length); i++) {
        const m = rerankedResults[i];
        console.log(`  📝 Memory ${i}: category="${m.category}" | key="${m.key}" | content="${m.content?.substring(0, 40)}..." | entityName="${m.entityName || 'N/A'}"`);
      }
      
      // Return in the expected format, preserving structured data
      const memories = rerankedResults.map(m => ({
        id: m.id,
        memory_key: m.key,
        key: m.key,
        content: m.content,
        value: m.content,
        memory_value: m.content,
        similarity: m.confidence,
        source: m.source,
        category: m.category,
        metadata: {
          ...m.metadata,
          // 🎯 Ensure entityName is always available
          entityName: m.entityName,
          entityRelation: m.entityRelation,
          entityType: m.entityType,
          category: m.category
        },
        created_at: m.timestamp
      }));
      
      return memories.slice(0, 20);
    } catch (error) {
      console.warn('⚠️ Memory retrieval failed:', error);
      return [];
    }
  }

  /**
   * Extract update data from message
   */
  extractUpdateData(message: string): { key: string; value: string } | null {
    const match = message.match(/(?:update|change|modify|correct)\s+(?:my\s+)?(\w+)(?:\s+to\s+|\s+is\s+now\s+)(.+)/i);
    if (match) {
      return {
        key: match[1].toLowerCase(),
        value: match[2].trim()
      };
    }
    return null;
  }

  /**
   * Extract forget key from message
   */
  extractForgetKey(message: string): string | null {
    const match = message.match(/(?:forget|delete|remove|clear)\s+(?:my\s+)?(\w+)/i);
    return match ? match[1].toLowerCase() : null;
  }

  /**
   * Extract enhanced forget data
   */
  async extractForgetData(message: string, extractedData?: any): Promise<any> {
    if (extractedData?.targetMemory || extractedData?.key) {
      return {
        targetMemory: extractedData.targetMemory,
        key: extractedData.key,
        confidence: 0.9
      };
    }
    
    const forgetKey = this.extractForgetKey(message);
    if (forgetKey) {
      return {
        key: forgetKey,
        targetMemory: forgetKey,
        confidence: 0.7
      };
    }
    
    return null;
  }

  /**
   * Detect category intent from message
   */
  detectCategoryIntent(message: string): { category: string; relationship?: string; searchQuery: string } | null {
    const msgLower = message.toLowerCase();
    
    if (msgLower.match(/\b(uncle|uncles|aunt|aunts)\b/)) {
      return { category: 'family', relationship: 'uncle', searchQuery: 'family uncle' };
    }
    if (msgLower.match(/\b(brother|brothers|sister|sisters|sibling|siblings)\b/)) {
      return { category: 'family', relationship: 'sibling', searchQuery: 'family sibling brother sister' };
    }
    if (msgLower.match(/\b(mom|mother|dad|father|parent|parents)\b/)) {
      return { category: 'family', relationship: 'parent', searchQuery: 'family mother father parent' };
    }
    if (msgLower.match(/\b(wife|husband|spouse|partner)\b/)) {
      return { category: 'family', relationship: 'spouse', searchQuery: 'family wife husband spouse' };
    }
    if (msgLower.match(/\b(pet|pets|dog|dogs|cat|cats|animal|animals)\b/)) {
      return { category: 'pets', searchQuery: 'pets animals dog cat' };
    }
    if (msgLower.match(/\b(hobby|hobbies|interest|interests)\b/)) {
      return { category: 'hobbies', searchQuery: 'hobbies interests activities' };
    }
    
    return null;
  }

  /**
   * Get emotional valence
   */
  getEmotionalValence(emotion: string): number {
    const positive = ['happy', 'excited', 'relaxed', 'calm', 'peaceful', 'energetic', 'great', 'good', 'wonderful', 'amazing'];
    const negative = ['sad', 'anxious', 'worried', 'stressed', 'frustrated', 'angry', 'tired', 'bad', 'terrible', 'awful'];
    
    if (positive.includes(emotion.toLowerCase())) return 1;
    if (negative.includes(emotion.toLowerCase())) return -1;
    return 0;
  }
}

// Export singleton instance
export const memoryOperations = new MemoryOperations();

