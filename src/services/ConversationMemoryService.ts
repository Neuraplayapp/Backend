// Unified Conversation Memory Service
// Single source of truth for conversation history and memory across all handlers

import { chatMemoryService } from './ChatMemoryService';
import { getCurrentLanguageName, getCurrentLanguage } from '../utils/languageUtils';

export interface ConversationContext {
  sessionId: string;
  userId: string;
  conversationHistory: any[];
  isFirstMessage: boolean;
  messageCount: number;
  lastActivity: Date;
}

export interface ConversationPromptOptions {
  includePersonalMemories?: boolean;
  maxHistoryMessages?: number;
  includeEmotionalContext?: boolean;
  includeLearningContext?: boolean;
  includeDashboardContext?: boolean;
  includeSocraticContext?: boolean;  // Dynamic Socratic context via HNSW
  includeCanvasContext?: boolean;    // Canvas document context for AI awareness
  includeComprehensiveAnalytics?: boolean; // 🎯 Full learning analytics snapshot
  currentModuleId?: string;          // Learning module ID for contextual Socratic guidance
  customInstructions?: string;
  // 🎯 REFACTOR: Accept pre-fetched memories to avoid duplicate searches
  prefetchedMemories?: any[];        // Pass memories from ChatHandler to avoid double retrieval
}

export class ConversationMemoryService {
  private static instance: ConversationMemoryService;
  
  static getInstance(): ConversationMemoryService {
    if (!ConversationMemoryService.instance) {
      ConversationMemoryService.instance = new ConversationMemoryService();
    }
    return ConversationMemoryService.instance;
  }

  /**
   * Get comprehensive conversation context for any handler
   */
  async getConversationContext(sessionId: string, userId?: string): Promise<ConversationContext> {
    try {
      // 🔥 FIX: Use ConversationService (in-memory) instead of ChatMemoryService (database)
      // ConversationService has the REAL-TIME conversation state (17 messages)
      // ChatMemoryService may be stale or loading async (0 chats)
      const { conversationService } = await import('./ConversationService');
      const conversation = conversationService.getConversation(sessionId);
      const conversationHistory = conversation?.messages || [];
      
      console.log(`🧠 ConversationMemoryService.getConversationContext: Retrieved ${conversationHistory.length} messages for session ${sessionId}`);

      return {
        sessionId,
        userId: userId || 'anonymous',
        conversationHistory,
        isFirstMessage: conversationHistory.length === 0,
        messageCount: conversationHistory.length,
        lastActivity: conversationHistory.length > 0 
          ? new Date(conversationHistory[conversationHistory.length - 1].timestamp)
          : new Date()
      };
    } catch (error) {
      console.warn('⚠️ Failed to get conversation context:', error);
      
      // ENHANCED FALLBACK: Try to detect if this is really a first message by checking memory
      let isLikelyFirstMessage = true;
      
      if (userId && userId !== 'anonymous') {
        try {
          // Check if user has any stored memories (indicating previous conversations)
          const { memoryDatabaseBridge } = await import('./MemoryDatabaseBridge');
          const memoryCheck = await memoryDatabaseBridge.searchMemories({
            userId,
            query: '',  // Get any memories
            limit: 1
          });
          
          // If user has memories, they've likely talked before
          if (memoryCheck.success && memoryCheck.memories && memoryCheck.memories.length > 0) {
            isLikelyFirstMessage = false;
            console.log('🧠 ConversationMemoryService: User has memories - treating as continuing conversation');
          }
        } catch (memoryError) {
          console.warn('⚠️ Memory check failed in fallback:', memoryError);
        }
      }
      
      return {
        sessionId,
        userId: userId || 'anonymous',
        conversationHistory: [],
        isFirstMessage: isLikelyFirstMessage,
        messageCount: 0,
        lastActivity: new Date()
      };
    }
  }

  /**
   * Build conversation-aware prompt that prevents amnesia
   * This is the core fix that was working before
   */
  async buildConversationAwarePrompt(
    message: string,
    sessionId: string,
    userId: string,
    options: ConversationPromptOptions = {}
  ): Promise<string> {
    const {
      maxHistoryMessages = 8,
      includePersonalMemories = false,
      includeLearningContext = false,
      includeDashboardContext = false,
      includeSocraticContext = false,
      includeCanvasContext = true, // Default true - AI should always know about canvas docs
      currentModuleId,
      customInstructions = '',
      prefetchedMemories  // 🎯 REFACTOR: Use pre-fetched memories if available
    } = options;

    try {
      // Get conversation context
      const context = await this.getConversationContext(sessionId, userId);
      
      // Build conversation history section
      let conversationHistorySection = '';
      if (context.conversationHistory.length > 0) {
        const recentMessages = context.conversationHistory.slice(-maxHistoryMessages);
        
        conversationHistorySection = '\n\n📝 **CONVERSATION HISTORY:**\n' + 
          recentMessages.map((msg: any, index: number) => {
            const role = (msg.role === 'user' || msg.isUser) ? 'User' : 'NeuraPlay';
            const time = new Date(msg.timestamp).toLocaleTimeString();
            let content = msg.content || msg.text || msg.message;
            
            // 🎯 SANITIZE: Remove any UUIDs from conversation history
            // This prevents the LLM from echoing previously exposed UUIDs
            content = this.sanitizeUUIDs(content);
            
            return `[${index + 1}] ${time} ${role}: ${content}`;
          }).join('\n');
        
        conversationHistorySection += '\n\n⚠️ IMPORTANT: You are continuing this conversation. Reference previous messages naturally when relevant.';
      }

      // Add personal memories if requested
      // 🎯 REFACTOR: Use pre-fetched memories from ChatHandler to avoid duplicate retrieval
      let personalMemorySection = '';
      if (includePersonalMemories && userId !== 'anonymous') {
        // Prefer pre-fetched memories (from ChatHandler's sophisticated search)
        // Only fall back to simple keyword search if no memories were pre-fetched
        const memories = prefetchedMemories && prefetchedMemories.length > 0 
          ? prefetchedMemories 
          : await this.getRelevantPersonalMemories(message, userId);
        
        if (memories.length > 0) {
          // 🧠 USE NATURAL MEMORY CONTEXT - No more raw data
          const formattedMemories = await this.formatMemoriesNaturally(memories);
          personalMemorySection = '\n\n🧠 **PERSONAL CONTEXT:**\n' + formattedMemories;
          
          // 🔍 CRITICAL DEBUG: Log exactly what memories the LLM will see
          console.log(`🧠 ConversationMemoryService: Using ${prefetchedMemories?.length ? 'PRE-FETCHED' : 'keyword-search'} memories (${memories.length} total)`);
          console.log('🔍 MEMORY CONTEXT FOR LLM:', formattedMemories.substring(0, 500));
          
          // Log raw memory data for debugging
          for (let i = 0; i < Math.min(5, memories.length); i++) {
            const m = memories[i];
            console.log(`  📝 Memory ${i}: key="${m.memory_key || m.key}", content="${(m.content || m.value || m.memory_value || '').substring(0, 80)}..."`);
          }
        }
      }

      // Add learning context if requested
      // 🎯 UNIFIED: Single service provides EVERYTHING - no more fragmentation!
      let learningContextSection = '';
      if (includeLearningContext && userId !== 'anonymous') {
        try {
          const { unifiedLearningContextService } = await import('./UnifiedLearningContextService');
          const context = await unifiedLearningContextService.getContext(userId, message);
          
          learningContextSection = context.formattedForAI;
          
          console.log('🧠 ConversationMemoryService: Unified learning context:', {
            isInLearning: context.isInLearningCentral,
            hasCourse: !!context.currentCourse,
            hasContent: !!context.currentCourse?.currentStepContent,
            struggles: context.struggles.knowledgeGaps.length,
            dueItems: context.retention.itemsDueForReview
          });
        } catch (contextError: any) {
          console.warn('⚠️ Learning context failed:', contextError?.message);
        }
      }

      // Add Learning Central activity context if requested
      let dashboardContextSection = '';
      if (includeDashboardContext && userId !== 'anonymous') {
        const { dashboardContextService } = await import('./DashboardContextService');
        const dashboardContext = dashboardContextService.getCurrentDashboardContext(userId);
        dashboardContextSection = dashboardContextService.formatDashboardContextForAI(dashboardContext);
      }

      // 🎯 COMPREHENSIVE LEARNING ANALYTICS (optional - for deep learning context)
      let analyticsContextSection = '';
      if (options.includeComprehensiveAnalytics && userId !== 'anonymous') {
        try {
          const { unifiedLearningAnalytics } = await import('./UnifiedLearningAnalytics');
          analyticsContextSection = await unifiedLearningAnalytics.formatForAIAssistant(userId);
          console.log('📊 ConversationMemoryService: Added comprehensive learning analytics');
        } catch (analyticsError: any) {
          console.warn('⚠️ Learning analytics failed:', analyticsError?.message);
        }
      }

      // 📄 CANVAS DOCUMENT CONTEXT - Make AI aware of canvas documents
      let canvasContextSection = '';
      if (includeCanvasContext) {
        try {
          const canvasContext = await this.getCanvasDocumentContext(sessionId, userId, message);
          if (canvasContext) {
            canvasContextSection = canvasContext;
          }
        } catch (canvasError: any) {
          console.warn('⚠️ Canvas context retrieval failed:', canvasError?.message);
        }
      }

      // 🧠 DYNAMIC SOCRATIC CONTEXT via HNSW Vector Search
      // ONLY activates when user shows EXPLICIT learning intent - works GLOBALLY across the app
      let socraticContextSection = '';
      if (includeSocraticContext && userId !== 'anonymous') {
        // Check for explicit learning intent in the message
        const hasLearningIntent = this.detectLearningIntent(message);
        
        // ONLY inject Socratic context when user explicitly wants to LEARN
        // This works globally - not restricted to Learning Central modules
        if (hasLearningIntent) {
          try {
            const { dynamicSocraticContextService } = await import('./DynamicSocraticContextService');
            const socraticResult = await dynamicSocraticContextService.buildSocraticContext(
              userId,
              message,
              currentModuleId, // Still pass module ID for additional context if available
              sessionId
            );
            
            if (socraticResult.success && socraticResult.context) {
              socraticContextSection = socraticResult.context.contextPrompt;
              console.log(`🧠 Socratic context injected GLOBALLY (${socraticResult.processingTime}ms via ${socraticResult.source}) - explicit learning intent detected`);
            }
          } catch (socraticError: any) {
            console.warn('⚠️ Socratic context retrieval failed:', socraticError?.message);
          }
        } else {
          console.log('🧠 Socratic context SKIPPED - no explicit learning intent');
        }
      }

      // Build the final prompt  
      const hasPersonalMemories = personalMemorySection.length > 0;
      
      // 🌍 GET USER'S PREFERRED LANGUAGE FOR DYNAMIC CONTENT
      const langCode = getCurrentLanguage();
      const langName = getCurrentLanguageName();
      const languageInstruction = langCode !== 'en' 
        ? `\n\n🌍 **LANGUAGE REQUIREMENT:** The user's preferred language is ${langName}. Respond ENTIRELY in ${langName}. All explanations, examples, greetings, and content must be in ${langName}.`
        : '';
      
      // 🎯 CAPABILITY AWARENESS - Tell AI what it can do
      const capabilityAwareness = `
📋 YOUR CAPABILITIES (use these, NEVER suggest external tools):
- CREATE DOCUMENTS: When user says "make/create/write/draft a document/guide/plan", you will create it in NeuraPlay's canvas
- CREATE CHARTS: You can generate interactive charts and visualizations
- CREATE COURSES: You can generate personalized learning courses
- REMEMBER: You have full memory of user's info, preferences, family, work
- NAVIGATE: You can take users to different parts of the platform

🚫 NEVER suggest external tools like:
- "Paste this into Google Docs/Word/Notion"
- "Copy this to a PDF"
- "Use an external app"
Instead: Offer to create it directly: "I'll create this document for you right now" or "Let me make this guide in your canvas"
`;
      
      let basePrompt = '';
      
      if (context.isFirstMessage && !hasPersonalMemories) {
        // True first time meeting - ONLY case where introduction is allowed
        const contextualInfo = await this.getContextualGreetingInfo(userId);
        
        basePrompt = `You are NeuraPlay, a friendly AI learning companion. This is genuinely the FIRST TIME meeting this user - they have no stored memories.
${languageInstruction}
${capabilityAwareness}
${contextualInfo}${learningContextSection}${dashboardContextSection}${canvasContextSection}${socraticContextSection}${analyticsContextSection}

The user said: "${message}"

Give a warm, welcoming response in ${langName}. You MAY briefly introduce yourself since this is truly the first meeting. Ask how you can help them today.

🚨 **CRITICAL OUTPUT INSTRUCTION:**
- RESPOND DIRECTLY to the user with your actual conversational response
- DO NOT show reasoning, thinking process, or internal analysis
- DO NOT say things like "The user asks..." or "I should mention..." or "We need to..."
- ONLY output what you would actually SAY to the user in conversation`;
      } else if (context.isFirstMessage && hasPersonalMemories) {
        // New conversation but we have memories from before  
        const contextualInfo = await this.getContextualGreetingInfo(userId);
        
        basePrompt = `You are continuing as their AI assistant. The user already knows you - this is a returning user.
${languageInstruction}
${capabilityAwareness}
🧠 **WHAT YOU KNOW ABOUT THIS USER - ACTIVELY USE THIS:**
${personalMemorySection}${contextualInfo}${learningContextSection}${dashboardContextSection}${canvasContextSection}${socraticContextSection}${analyticsContextSection}

The user said: "${message}"

🎯 **MEMORY USAGE INSTRUCTIONS:**
- When the user asks you to write about them, create content about them, or reference their life: ACTIVELY WEAVE all relevant memories into your response
- Don't just acknowledge memories exist - INCORPORATE them with specific details (names, places, interests, family members, goals)
- If user asks about their family, mention specific family members by name
- If user asks about their work, mention their specific profession and projects
- If user asks you to write creatively about them, paint a rich picture using ALL the personal details you know

Respond warmly in ${langName} as someone who already knows them.

🚫 ABSOLUTELY FORBIDDEN - DO NOT DO ANY OF THESE:
- Never say "I'm NeuraPlay" or "I'm your learning companion"
- Never introduce yourself
- Never say "nice to meet you" or similar first-meeting phrases
- Never explain what you can do as if they don't know

✅ INSTEAD:
- Greet them like an old friend: "Hey [name]!" or "Good to see you!"
- Reference things you know about them naturally
- Jump straight into being helpful

🚨 **CRITICAL OUTPUT INSTRUCTION:**
- RESPOND DIRECTLY to the user with your actual conversational response
- DO NOT show reasoning, thinking process, or internal analysis
- DO NOT say things like "The user asks..." or "I should mention..." or "We need to..."
- ONLY output what you would actually SAY to the user in conversation`;
      } else {
        // Ongoing conversation
        basePrompt = `ONGOING CONVERSATION - You are mid-conversation with this user.
${languageInstruction}
${capabilityAwareness}
PREVIOUS MESSAGES:
${conversationHistorySection}

🧠 **WHAT YOU KNOW ABOUT THIS USER - ACTIVELY USE THIS:**
${personalMemorySection}${learningContextSection}${dashboardContextSection}${canvasContextSection}${socraticContextSection}${analyticsContextSection}

The user just said: "${message}"

🎯 **MEMORY USAGE INSTRUCTIONS:**
- When the user asks you to write about them, create content about them, or reference their life: ACTIVELY WEAVE all relevant memories into your response
- Don't just acknowledge memories exist - INCORPORATE them with specific details (names, places, interests, family members, goals)
- If user asks about their family, mention specific family members by name
- If user asks about their work, mention their specific profession and projects
- If user asks you to write creatively about them, paint a rich picture using ALL the personal details you know

🚫 NEVER reintroduce yourself or explain who you are - you're already talking!
✅ Just respond naturally in ${langName} to continue the conversation.

🚨 **CRITICAL OUTPUT INSTRUCTION:**
- RESPOND DIRECTLY to the user with your actual conversational response
- DO NOT show reasoning, thinking process, or internal analysis  
- DO NOT say things like "The user asks..." or "I should mention..." or "We need to..."
- ONLY output what you would actually SAY to the user in conversation`;
      }

      const finalPrompt = customInstructions ? `${basePrompt}\n\n${customInstructions}` : basePrompt;
      
      // 🔍 CRITICAL DEBUG: Log the FULL prompt being sent to LLM
      console.log('🔍 FULL PROMPT TO LLM (first 1000 chars):', finalPrompt.substring(0, 1000));
      console.log('🔍 PROMPT LENGTH:', finalPrompt.length, 'chars');
      console.log('🔍 HAS PERSONAL MEMORIES:', personalMemorySection.length > 50 ? 'YES' : 'NO');
      
      return finalPrompt;

    } catch (error) {
      console.error('❌ Failed to build conversation-aware prompt:', error);
      
      // Fallback prompt that still prevents amnesia
      return `Continue this conversation as NeuraPlay AI. The user said: "${message}". Respond naturally and helpfully.`;
    }
  }

  /**
   * 🔧 Sanitize strings to remove invalid Unicode surrogates
   * Prevents "lone leading surrogate in hex escape" errors from LLM APIs
   */
  private sanitizeForLLM(str: string): string {
    if (typeof str !== 'string') return '';
    
    return str
      // Remove lone high surrogates (U+D800-U+DBFF not followed by low surrogate)
      .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '')
      // Remove lone low surrogates (U+DC00-U+DFFF not preceded by high surrogate)  
      .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
      // Remove other problematic control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  /**
   * 🧠 FORMAT MEMORIES NATURALLY
   * 
   * Converts raw memory data into natural conversational context
   */
  private async formatMemoriesNaturally(memories: any[]): Promise<string> {
    const memoryContexts: string[] = [];
    
    for (const memory of memories) {
      // 🎯 CRITICAL FIX: RecallMachine returns 'id' as the memory_key, 'content' for value
      // Must check ALL possible field names in priority order (same as CoreTools fix)
      // 🔧 SANITIZE: Remove invalid Unicode surrogates that break LLM APIs
      const rawContent = memory.memory_value || memory.content || memory.value || '';
      const content = this.sanitizeForLLM(rawContent);
      const key = memory.id || memory.memory_key || memory.originalContext?.memoryKey || memory.key || '';
      
      // 🎯 CRITICAL FIX: Use pre-extracted category from RecallMachine if available
      // RecallMachine already categorized the memory - use it!
      const preExtractedCategory = memory.category || memory.originalContext?.category || '';
      
      // Only use regex categorization as fallback if RecallMachine didn't provide category
      const category = preExtractedCategory || this.categorizeMemoryContent(key, content);
      
      // 🔍 DEBUG: Log field extraction for troubleshooting
      console.log(`📝 formatMemoriesNaturally: key="${key.substring(0, 40)}", category="${category}", content="${content.substring(0, 30)}..."`);
      
      // Format naturally based on category
      const naturalContext = this.formatMemoryByCategory(category, content, key);
      if (naturalContext) {
        memoryContexts.push(naturalContext);
      }
    }
    
    return memoryContexts.length > 0 
      ? memoryContexts.join('\n')
      : 'You have some stored information about this user.';
  }

  /**
   * 🏷️ CATEGORIZE MEMORY CONTENT
   */
  private categorizeMemoryContent(key: string, content: string): string {
    const keyLower = key.toLowerCase();
    const contentLower = content.toLowerCase();
    
    // Name patterns
    if (keyLower.includes('name') || contentLower.includes('my name') || contentLower.includes("i'm ")) {
      return 'name';
    }
    
    // Professional patterns  
    if (keyLower.includes('job') || keyLower.includes('work') || keyLower.includes('profession') || 
        contentLower.includes('work') || contentLower.includes('job')) {
      return 'profession';
    }
    
    // Hobby patterns
    if (keyLower.includes('hobby') || keyLower.includes('interest') || 
        contentLower.includes('enjoy') || contentLower.includes('love') || 
        contentLower.includes('programming') || contentLower.includes('coding')) {
      return 'hobbies';
    }
    
    // Location patterns
    if (keyLower.includes('location') || keyLower.includes('live') || 
        contentLower.includes('from') || contentLower.includes('live')) {
      return 'location';
    }
    
    // Pet patterns
    if (keyLower.includes('pet') || contentLower.includes('dog') || 
        contentLower.includes('cat') || contentLower.includes('pet')) {
      return 'pets';
    }
    
    // Family patterns
    if (keyLower.includes('family') || contentLower.includes('parent') || 
        contentLower.includes('sibling') || contentLower.includes('child')) {
      return 'family';
    }
    
    // 💙 EMOTION/MOOD patterns
    if (keyLower.includes('emotion') || keyLower.includes('mood') || keyLower.includes('feeling') ||
        contentLower.includes('feeling great') || contentLower.includes('feeling stressed') ||
        contentLower.includes('i am feeling') || contentLower.includes("i'm feeling") ||
        contentLower.includes('happy') || contentLower.includes('stressed') || contentLower.includes('anxious')) {
      return 'emotion';
    }
    
    // Colleague patterns
    if (keyLower.includes('colleague') || keyLower.includes('coworker') || keyLower.includes('assistant_')) {
      return 'colleague';
    }
    
    return 'general';
  }

  /**
   * 🎭 FORMAT MEMORY BY CATEGORY
   */
  private formatMemoryByCategory(category: string, content: string, key: string): string {
    const keyLower = key.toLowerCase();
    
    switch (category) {
      case 'name':
        return `• This user's name is ${content}`;
        
      case 'profession':
        return `• They work in ${content}`;
        
      case 'hobbies':
      case 'hobby':
        return `• They enjoy ${content}`;
        
      case 'location':
        return `• They are located in ${content}`;
        
      case 'pets':
      case 'pet':
        return `• They have a pet: ${content}`;
        
      case 'family':
        return `• Family member: ${content}`;
        
      case 'colleague':
        // 🎯 CRITICAL: Colleagues are NOT family - make this explicit
        return `• Work colleague/assistant: ${content} (NOT a family member)`;
        
      case 'friend':
        return `• Friend: ${content}`;
        
      case 'emotion':
      case 'mood':
        // 💙 EMOTIONAL CONTEXT - helps AI be empathetic
        return `• Recent emotional state: ${content}`;
        
      default:
        // Check key patterns for colleague detection
        if (keyLower.startsWith('assistant_') || keyLower.startsWith('colleague_') || keyLower.startsWith('coworker_')) {
          return `• Work colleague/assistant: ${content} (NOT a family member)`;
        }
        return `• ${content}`;
    }
  }

  /**
   * Get relevant personal memories for context (simplified version)
   */
  private async getRelevantPersonalMemories(message: string, userId: string): Promise<any[]> {
    try {
      // Import memory bridge for searching
      const { memoryDatabaseBridge } = await import('./MemoryDatabaseBridge');
      
      // Extract keywords for memory search
      const keywords = this.extractKeywords(message);
      
      // Search for relevant memories
      const result = await memoryDatabaseBridge.searchMemories({
        userId,
        query: keywords.join(' '),
        limit: 5
      });

      return result.success ? (result.memories || []) : [];
    } catch (error) {
      console.warn('⚠️ Failed to get personal memories:', error);
      return [];
    }
  }

  /**
   * Extract keywords for memory search
   */
  private extractKeywords(message: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    const memoryKeywords = ['name', 'my', 'your', 'what', 'who', 'remember', 'recall'];
    
    const words = message.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1 && (!stopWords.has(word) || memoryKeywords.includes(word)));
    
    return words.slice(0, 5);
  }

  /**
   * 📄 GET CANVAS DOCUMENT CONTEXT
   * 
   * Retrieves canvas documents from the current session to make AI aware of them.
   * This allows the AI to answer questions like "tell me about the document" or
   * reference document content naturally in conversation.
   */
  /**
   * Smart content chunking that preserves tables, charts, and structural elements
   * Instead of naive truncation, this intelligently selects what to include
   */
  /**
   * 🎯 SANITIZE UUIDs from content to prevent LLM from exposing them to users
   * Replaces UUIDs with "[document]" or similar placeholders
   */
  private sanitizeUUIDs(content: string): string {
    if (!content) return content;
    
    // UUID pattern: 8-4-4-4-12 hex characters (with or without dashes)
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    
    // Canvas element ID pattern: canvas-timestamp-randomchars
    const canvasIdPattern = /canvas-\d+-[a-z0-9]+/gi;
    
    // Session/conversation ID mentions
    const sessionIdPattern = /(?:session|conversation|document|element)\s*(?:id|ID|Id)?\s*[:=]?\s*[0-9a-f-]{20,}/gi;
    
    return content
      .replace(uuidPattern, '[document]')
      .replace(canvasIdPattern, '[canvas document]')
      .replace(sessionIdPattern, '[document]');
  }
  
  private smartChunkContent(content: string, userMessage: string): string {
    const MAX_CHARS = 3000; // Increased from 2000 for better context
    
    // If short enough, include everything
    if (content.length <= MAX_CHARS) {
      return content;
    }
    
    // Detect what user is asking about
    const messageLower = userMessage.toLowerCase();
    const askingAboutChart = /\b(chart|table|comparison|commonalit|difference)\b/i.test(messageLower);
    
    // Split into sections (by headers)
    const sections = this.splitIntoSections(content);
    
    // Find important sections (tables, charts, user-relevant)
    const tableSections: string[] = [];
    const regularSections: string[] = [];
    
    for (const section of sections) {
      const sectionLower = section.toLowerCase();
      const hasTable = section.includes('|') && section.split('|').length > 10; // Markdown table
      const isChartSection = /\b(chart|table|comparison)\b/i.test(section);
      
      if (hasTable || isChartSection) {
        tableSections.push(section);
      } else {
        regularSections.push(section);
      }
    }
    
    // Build smart preview
    const chunks: string[] = [];
    let currentSize = 0;
    
    // 1. Always include first section (intro/overview) - up to 800 chars
    if (regularSections.length > 0) {
      const intro = regularSections[0].substring(0, 800);
      chunks.push(intro);
      currentSize += intro.length;
    }
    
    // 2. If user asks about charts/tables, prioritize those sections
    if (askingAboutChart && tableSections.length > 0) {
      for (const tableSection of tableSections) {
        if (currentSize + tableSection.length < MAX_CHARS) {
          chunks.push(tableSection);
          currentSize += tableSection.length;
        } else {
          // Include truncated version
          const remaining = MAX_CHARS - currentSize - 100;
          if (remaining > 200) {
            chunks.push(tableSection.substring(0, remaining) + '\n\n...[table continues]');
          }
          break;
        }
      }
    } else {
      // 3. Include middle sections if space available
      const middleSections = regularSections.slice(1, -1);
      for (const section of middleSections) {
        if (currentSize + section.length < MAX_CHARS - 500) { // Leave room for end
          chunks.push(section);
          currentSize += section.length;
        }
      }
      
      // 4. Always try to include last section (conclusions/charts often at end)
      if (regularSections.length > 1) {
        const lastSection = regularSections[regularSections.length - 1];
        const remaining = MAX_CHARS - currentSize - 100;
        if (remaining > 300) {
          chunks.push(lastSection.substring(Math.max(0, lastSection.length - remaining)));
        }
      }
      
      // 5. Include any tables that fit
      for (const tableSection of tableSections) {
        if (currentSize + tableSection.length < MAX_CHARS) {
          chunks.push(tableSection);
          currentSize += tableSection.length;
        }
      }
    }
    
    const result = chunks.join('\n\n---\n\n');
    
    // Add metadata about what was included
    const includedTables = tableSections.filter(t => result.includes(t.substring(0, 50))).length;
    const metadata = `\n\n📊 [Document contains ${sections.length} sections, ${tableSections.length} tables/charts. Showing ${chunks.length} sections${includedTables > 0 ? `, including ${includedTables} tables` : ''}.]`;
    
    return result + metadata;
  }
  
  /**
   * Split content into sections by markdown headers
   */
  private splitIntoSections(content: string): string[] {
    const lines = content.split('\n');
    const sections: string[] = [];
    let currentSection: string[] = [];
    
    for (const line of lines) {
      // Check if line is a header (# Header or ## Header)
      if (/^#{1,6}\s/.test(line)) {
        // Save previous section if exists
        if (currentSection.length > 0) {
          sections.push(currentSection.join('\n'));
          currentSection = [];
        }
      }
      currentSection.push(line);
    }
    
    // Add final section
    if (currentSection.length > 0) {
      sections.push(currentSection.join('\n'));
    }
    
    return sections.length > 0 ? sections : [content];
  }

  /**
   * 🎯 GET CANVAS CONTEXT VIA VECTORS (not raw store)
   * This ensures:
   * 1. No raw IDs leak to the LLM
   * 2. Content is properly chunked and supersessioned
   * 3. Semantic relevance to user's message
   */
  private async getCanvasDocumentContext(_sessionId: string, userId: string, message: string): Promise<string | null> {
    try {
      // 🎯 APPROACH 1: Vector search for semantically relevant canvas content
      const { vectorSearchService } = await import('./VectorSearchService');
      
      // Search for canvas documents by content relevance
      // 🔥 FIX: Use actual userId - canvas docs are user-specific
      const vectorResults = await vectorSearchService.semanticSearch(
        message,
        undefined,  // no specific embedding
        userId,     // 🔥 Use actual userId for user's canvas docs
        5,          // top 5 results
        0.3         // lower threshold to catch more docs
      );
      
      // Filter to only canvas documents - use registry for consistency
      const { MEMORY_CATEGORIES } = await import('./MemoryCategoryRegistry');
      const canvasResults = vectorResults.filter(r => 
        r.category === MEMORY_CATEGORIES.CANVAS_DOCUMENT || 
        r.source === 'canvas' ||
        r.memory_key?.startsWith('canvas_')
      );
      
      console.log(`📄 Canvas vector search: Found ${canvasResults.length} relevant canvas docs`);
      
      // 🎯 APPROACH 2: Fallback to localStorage if no vector results
      let documents: Array<{title: string; content: string; recency: number}> = [];
      
      if (canvasResults.length > 0) {
        // Use vector results (already semantically ranked)
        documents = canvasResults.map(r => ({
          title: r.metadata?.title || this.extractTitleFromContent(r.content) || 'Untitled',
          content: r.content,
          recency: r.created_at ? new Date(r.created_at).getTime() : Date.now()
        }));
      } else {
        // Fallback: Load from localStorage
        documents = await this.loadCanvasDocsFromStorage();
      }
      
      if (documents.length === 0) {
        console.log(`📄 Canvas context: No documents found`);
        return null;
      }
      
      // 🎯 SUPERSESSION: Sort by recency, take top 3
      documents.sort((a, b) => b.recency - a.recency);
      const topDocs = documents.slice(0, 3);
      
      console.log(`📄 Canvas context: Using ${topDocs.length} documents`, {
        titles: topDocs.map(d => d.title)
      });
      
      // Build context WITHOUT any IDs
      const contextParts: string[] = [];
      contextParts.push('\n\n📄 **CANVAS DOCUMENTS:**');
      
      for (let i = 0; i < topDocs.length; i++) {
        const doc = topDocs[i];
        const priority = i === 0 ? '🎯 PRIMARY' : i === 1 ? '📋 SECONDARY' : '📌 TERTIARY';
        
        // 🎯 ENHANCED: Include section headers so AI knows document structure
        const sectionHeaders = this.extractSectionHeaders(doc.content);
        const headersList = sectionHeaders.length > 0 
          ? `\nSections: ${sectionHeaders.join(', ')}`
          : '';
        
        // Smart chunk content for relevance (PRIMARY gets more content)
        const smartContent = i === 0 
          ? this.smartChunkContent(doc.content, message)
          : doc.content.substring(0, 300) + (doc.content.length > 300 ? '...' : '');
        
        contextParts.push(`\n${priority}: "${doc.title}"${headersList}`);
        contextParts.push(`${smartContent}\n`);
      }
      
      contextParts.push('\n💡 **RULES:**');
      contextParts.push('- Always refer to documents by TITLE or SECTION NAME');
      contextParts.push('- When user references a section (e.g., "personal lens"), you know which document it belongs to');
      contextParts.push('- When user says "the document" → refer to PRIMARY by title');
      
      return contextParts.join('\n');
      
    } catch (error: any) {
      console.warn('⚠️ Canvas context via vectors failed:', error?.message);
      return null;
    }
  }
  
  /**
   * 🎯 LOAD CANVAS DOCS FROM LOCALSTORAGE (fallback)
   * No raw IDs - just titles and content
   * Uses CanvasAccessTracker for LAST-OPENED priority
   */
  private async loadCanvasDocsFromStorage(): Promise<Array<{title: string; content: string; recency: number}>> {
    const docs: Array<{title: string; content: string; recency: number}> = [];
    
    try {
      // 🎯 NEW: Use CanvasAccessTracker for priority ordering
      let lastOpenedElementId: string | null = null;
      try {
        const { canvasAccessTracker } = await import('./CanvasAccessTracker');
        const canvasContext = canvasAccessTracker.getCanvasContextForAssistant(10);
        lastOpenedElementId = canvasContext.lastOpened?.elementId || null;
        console.log('📄 Canvas fallback: Last opened =', canvasContext.lastOpened?.title || 'none');
      } catch { /* ignore */ }
      
      // Check localStorage for canvas documents
      const storedDocs = localStorage.getItem('neuraplay_canvas_documents');
      if (storedDocs) {
        const parsed = JSON.parse(storedDocs);
        if (Array.isArray(parsed)) {
          for (const doc of parsed) {
            docs.push({
              title: doc.title || 'Untitled',
              content: doc.content || '',
              recency: doc.updatedAt || doc.createdAt || Date.now()
            });
          }
        }
      }
      
      // Also try the canvas store but ONLY extract title + content (no IDs)
      try {
        const { useCanvasStore } = await import('../stores/canvasStore');
        const store = useCanvasStore.getState();
        
        for (const elements of Object.values(store.canvasElementsByConversation || {})) {
          for (const el of (elements as any[])) {
            if (el.type === 'document') {
              const title = el.content?.title || 'Untitled';
              const content = el.versions?.[el.versions.length - 1]?.content || el.content?.content || '';
              
              // 🎯 PRIORITY: If this is the last-opened document, boost its recency
              const isLastOpened = el.id === lastOpenedElementId;
              const recency = isLastOpened 
                ? Date.now() // Boost to current time = highest priority
                : (el.updatedAt || el.createdAt || new Date(el.timestamp || Date.now()).getTime());
              
              // Avoid duplicates by title
              if (!docs.find(d => d.title === title)) {
                docs.push({ title, content, recency });
              }
            }
          }
        }
      } catch (e) {
        // Canvas store not available, that's okay
      }
    } catch (e) {
      console.warn('⚠️ Failed to load canvas docs from storage:', e);
    }
    
    return docs;
  }
  
  /**
   * Extract title from content (first heading or first line)
   */
  private extractTitleFromContent(content: string): string | null {
    if (!content) return null;
    
    // Try to find a markdown heading
    const headingMatch = content.match(/^#\s+(.+)$/m);
    if (headingMatch) return headingMatch[1].trim();
    
    // Use first line if short enough
    const firstLine = content.split('\n')[0].trim();
    if (firstLine.length < 100) return firstLine;
    
    return null;
  }
  
  /**
   * 🎯 Extract section headers from markdown content
   * This helps AI know what sections exist in a document
   */
  private extractSectionHeaders(content: string): string[] {
    if (!content) return [];
    
    const headers: string[] = [];
    const headerRegex = /^#{1,3}\s+(.+)$/gm;
    let match;
    
    while ((match = headerRegex.exec(content)) !== null) {
      const header = match[1].trim();
      // Skip very long headers (likely not real headers)
      if (header.length < 80 && !headers.includes(header)) {
        headers.push(header);
      }
    }
    
    // Limit to first 8 headers to avoid token explosion
    return headers.slice(0, 8);
  }

  /**
   * 🎓 DETECT LEARNING INTENT
   * 
   * Determines if the user is actively trying to LEARN something.
   * Used to gate Socratic context injection - we don't want to be Socratic
   * for casual conversation, only when the user is in a learning mindset.
   * 
   * Returns true ONLY when user shows clear learning intent:
   * - Asking for explanations/tutorials
   * - Requesting to understand something
   * - Studying specific topics
   * - Working through educational content
   */
  private detectLearningIntent(message: string): boolean {
    const messageLower = message.toLowerCase();
    
    // EXPLICIT learning request patterns
    const learningPatterns = [
      // Teaching requests
      /teach\s+me/i,
      /explain\s+(to\s+me\s+)?how/i,
      /explain\s+(to\s+me\s+)?what/i,
      /explain\s+(to\s+me\s+)?why/i,
      /help\s+me\s+(understand|learn)/i,
      /can\s+you\s+(teach|explain|show)/i,
      /how\s+does?\s+.+\s+work/i,
      /what\s+is\s+(a|an|the)\s+/i,
      /i\s+want\s+to\s+learn/i,
      /i('m|\s+am)\s+learning/i,
      /i('m|\s+am)\s+studying/i,
      /i\s+don('t|'t)\s+understand/i,
      /i('m|\s+am)\s+confused\s+about/i,
      /can\s+you\s+walk\s+me\s+through/i,
      /step\s+by\s+step/i,
      /tutorial/i,
      /guide\s+me/i,
      /break\s+(it\s+)?down/i
    ];
    
    // Check explicit patterns
    for (const pattern of learningPatterns) {
      if (pattern.test(messageLower)) {
        return true;
      }
    }
    
    // Keyword combinations that suggest learning
    const learningKeywords = ['learn', 'understand', 'study', 'explain', 'teach', 'lesson', 'course', 'module', 'tutorial', 'concept', 'theory'];
    const questionWords = ['how', 'why', 'what'];
    
    const hasLearningKeyword = learningKeywords.some(kw => messageLower.includes(kw));
    const hasQuestionWord = questionWords.some(qw => messageLower.startsWith(qw) || messageLower.includes(` ${qw} `));
    
    // Combination of learning keyword + question word strongly suggests learning intent
    if (hasLearningKeyword && hasQuestionWord) {
      return true;
    }
    
    // Educational topic indicators with question
    const educationalTopics = ['math', 'science', 'history', 'language', 'grammar', 'coding', 'programming', 'physics', 'chemistry', 'biology', 'geography'];
    const hasEducationalTopic = educationalTopics.some(topic => messageLower.includes(topic));
    
    if (hasEducationalTopic && hasQuestionWord) {
      return true;
    }
    
    // Default: NOT a learning request
    // This is important - we don't want to be Socratic for:
    // - Casual greetings
    // - General questions
    // - Task requests
    // - Personal conversation
    return false;
  }

  /**
   * Get contextual information for enhanced greetings (weather, location, time)
   */
  private async getContextualGreetingInfo(userId: string): Promise<string> {
    let contextualInfo = '';
    
    try {
      const now = new Date();
      const hour = now.getHours();
      
      // Add time-based greeting
      let timeGreeting = '';
      if (hour >= 6 && hour < 12) timeGreeting = 'Good morning';
      else if (hour >= 12 && hour < 17) timeGreeting = 'Good afternoon';
      else if (hour >= 17 && hour < 22) timeGreeting = 'Good evening';
      else timeGreeting = 'Hope you\'re having a good day';
      
      contextualInfo += `\n\n🕐 **TIME CONTEXT:** ${timeGreeting}! It's ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      
      // Try to get weather information
      try {
        const { toolRegistry } = await import('../services/ToolRegistry');
        
        const weatherResult = await toolRegistry.execute('get-weather', {
          autoDetectLocation: true
        }, {
          sessionId: 'greeting-context',
          userId,
          startTime: Date.now()
        });
        
        console.log('🌤️ ConversationMemoryService: Weather result structure:', {
          hasSuccess: weatherResult?.success,
          hasData: !!weatherResult?.data,
          dataKeys: weatherResult?.data ? Object.keys(weatherResult.data) : [],
          data: weatherResult?.data
        });
        
        // FIXED: Weather data is at weatherResult.data directly, not weatherResult.data.weather
        if (weatherResult.success && weatherResult.data) {
          const weather = weatherResult.data;
          const temp = weather.temperature_c || weather.temperature || weather.temp;
          const location = weather.location || weather.city || 'your area';
          const condition = weather.condition || weather.description || weather.weather;
          
          if (temp !== undefined && location && condition) {
            contextualInfo += `\n\n☁️ **WEATHER CONTEXT:** Currently ${condition} and ${temp}°C in ${location}`;
          }
        }
      } catch (weatherError) {
        console.warn('⚠️ Failed to get weather for greeting:', weatherError);
        // Don't include weather if it fails
      }
      
      // Try to get user's location from memories
      // 🎯 CRITICAL: Search for USER's location, not someone else's (like assistant's location)
      try {
        const { memoryDatabaseBridge } = await import('./MemoryDatabaseBridge');
        const locationMemory = await memoryDatabaseBridge.searchMemories({
          userId,
          query: 'user location family location where I live my location current location home',
          limit: 5  // Get more results to filter
        });
        
        if (locationMemory.success && locationMemory.memories && locationMemory.memories.length > 0) {
          // 🎯 FILTER: Prioritize user/family location, exclude assistant/colleague locations
          const userLocationMemory = locationMemory.memories.find((m: any) => {
            const key = (m.memory_key || '').toLowerCase();
            // Exclude assistant/colleague locations - these are OTHER people's locations
            if (key.includes('assistant_') || key.includes('colleague_')) {
              return false;
            }
            // Prioritize family_location, user_location, or just 'location'
            return key.includes('family_location') || 
                   key.includes('user_location') || 
                   key === 'location' ||
                   key.includes('my_location');
          });
          
          if (userLocationMemory) {
            const location = userLocationMemory.memory_value;
            if (location && !contextualInfo.includes(location)) {
              contextualInfo += `\n\n📍 **LOCATION CONTEXT:** I see you're in ${location}`;
            }
          }
        }
      } catch (locationError) {
        console.warn('⚠️ Failed to get location for greeting:', locationError);
      }
      
    } catch (error) {
      console.warn('⚠️ Failed to get contextual greeting info:', error);
    }
    
    return contextualInfo;
  }

  /**
   * Store simple conversation memory (if needed)
   */
  async storeConversationMemory(data: {
    userId: string;
    key: string;
    value: string;
    sessionId: string;
    category?: string;
  }): Promise<boolean> {
    try {
      const { memoryDatabaseBridge } = await import('./MemoryDatabaseBridge');
      
      const result = await memoryDatabaseBridge.storeMemory(
        data.userId,
        data.key,
        data.value,
        {
          category: data.category || 'general',
          sessionId: data.sessionId,
          source: 'conversation',
          timestamp: new Date().toISOString()
        }
      );

      return result.success === true;
    } catch (error) {
      console.warn('⚠️ Failed to store conversation memory:', error);
      return false;
    }
  }

  /**
   * Check if user is referencing previous conversation
   */
  isReferencingPreviousConversation(message: string): boolean {
    const referencePatterns = [
      /previously\s+(?:said|mentioned|discussed)/i,
      /other\s+things?\s+(?:previously\s+)?(?:said|mentioned)/i,
      /(?:as|like)\s+i\s+(?:said|mentioned)\s+(?:before|earlier)/i,
      /refer(?:ring)?\s+to\s+(?:what|the)\s+(?:i|we)\s+(?:said|discussed)/i,
      /(?:remember|recall)\s+when\s+(?:i|we)\s+(?:said|talked)/i,
      /back\s+to\s+(?:what|the)\s+(?:we|i)\s+(?:discussed|talked)/i,
      /you\s+(?:said|mentioned|told)\s+(?:me\s+)?(?:that|about)/i,
      /earlier\s+(?:you|we|i)\s+(?:said|mentioned|discussed)/i,
      /from\s+our\s+(?:previous\s+)?conversation/i,
      /in\s+our\s+(?:last\s+)?chat/i
    ];
    
    return referencePatterns.some(pattern => pattern.test(message));
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(sessionId: string): Promise<{
    messageCount: number;
    duration: number;
    lastActivity: Date;
  }> {
    const context = await this.getConversationContext(sessionId);
    
    const firstMessage = context.conversationHistory[0];
    const lastMessage = context.conversationHistory[context.conversationHistory.length - 1];
    
    const duration = firstMessage && lastMessage 
      ? new Date(lastMessage.timestamp).getTime() - new Date(firstMessage.timestamp).getTime()
      : 0;

    return {
      messageCount: context.messageCount,
      duration,
      lastActivity: context.lastActivity
    };
  }
}

// Export singleton instance
export const conversationMemoryService = ConversationMemoryService.getInstance();
