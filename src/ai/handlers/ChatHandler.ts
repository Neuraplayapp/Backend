// Chat Handler - Core conversation logic
// Memory operations moved to MemoryOperations.ts
// Response generation moved to ResponseGenerators.ts

import { AIRequest, AIResponse } from '../AIRouter';
import { toolRegistry } from '../../services/ToolRegistry';
import { ContextManager } from '../../services/ContextManager';
import { chatMemoryService } from '../../services/ChatMemoryService';
import { conversationMemoryService } from '../../services/ConversationMemoryService';
import { searchChatIntegration } from '../../services/SearchChatIntegration';
import { emotionalIntelligenceService } from '../../services/EmotionalIntelligenceService';
import { greetingService } from '../../services/GreetingService';

// Import refactored modules
import { memoryOperations, MemoryContext, AutoMemoryItem } from './MemoryOperations';
import { responseGenerators } from './ResponseGenerators';
import { proactiveMemoryContextService } from '../../services/ProactiveMemoryContextService';

export class ChatHandler {
  private contextManager: ContextManager;
  private conversationMemory: Map<string, any[]> = new Map();

  constructor() {
    this.contextManager = new ContextManager();
  }
  
  /**
   * 🔒 SANITIZE ALL RESPONSES - Remove UUIDs and reasoning tokens before showing to user
   * This is the FINAL safety net to prevent any UUID or reasoning leakage
   */
  private sanitizeResponse(text: string): string {
    if (!text) return text;
    
    // 🧠 STRIP REASONING TOKENS FIRST (before other sanitization)
    // Pattern 1: <think>...</think> blocks
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    // Pattern 2: <thinking>...</thinking> blocks
    text = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
    // Pattern 3: <reasoning>...</reasoning> blocks
    text = text.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '');
    // Pattern 4: [thinking]...[/thinking] bracket notation
    text = text.replace(/\[thinking\][\s\S]*?\[\/thinking\]/gi, '');
    // Pattern 5: Base model tokens like <|channel|>, <|message|>, <|end|>
    text = text.replace(/<\|(?:channel|message|end)\|>/g, '');
    
    // 🔧 GPT-OSS reasoning preambles (chain-of-thought leaking into response)
    const reasoningPreambles = [
      /^We need to (?:respond|output|answer|help)[\s\S]*?(?=\n\n|[A-Z][a-z]+ )/i,
      /^The (?:user|context|message|instruction)[\s\S]*?(?=\n\n|[A-Z][a-z]+ )/i,
      /^(?:First|Let me|I should|I need to|I'll|We should)[\s\S]*?(?=\n\n)/i,
    ];
    
    for (const pattern of reasoningPreambles) {
      if (pattern.test(text)) {
        const stripped = text.replace(pattern, '').trim();
        // Only use stripped version if it leaves meaningful content
        if (stripped.length > 20) {
          text = stripped;
          break;
        }
      }
    }
    
    // UUID pattern: 8-4-4-4-12 hex characters (with or without dashes)
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    
    // Canvas element ID pattern: canvas-timestamp-randomchars
    const canvasIdPattern = /canvas-\d+-[a-z0-9]+/gi;
    
    return text
      .replace(uuidPattern, 'your document')
      .replace(canvasIdPattern, 'your canvas document')
      .trim();
  }

  async handle(request: AIRequest, intentAnalysis: any): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      console.log('💬 ChatHandler: Processing chat mode request');
      
      const message = request.message || '';
      const sessionId = request.sessionId || '';
      const userId = request.userId || 'anonymous';
      
      // 🎯 CONTEXT OPTIONS: Control what gets injected into the prompt
      // Useful for specialized requests like news summarization
      const contextOptions = request.contextOptions || {};
      const skipPersonalMemories = contextOptions.skipPersonalMemories === true;
      const skipConversationHistory = contextOptions.skipConversationHistory === true;
      const skipLearningContext = contextOptions.skipLearningContext === true;
      
      if (skipPersonalMemories) {
        console.log('📰 ChatHandler: skipPersonalMemories=true - using focused mode (no personal context)');
      }
      
      // 🎯 STEP 1: ANALYZE MEMORY INTENT (for recall/forget operations)
      const memoryContext = await memoryOperations.analyzeMemoryContext(message, intentAnalysis);
      console.log('📍 MEMORY CONTEXT ANALYSIS:', memoryContext);
      
      // 🧠 STEP 2: ALWAYS EXTRACT - Like canvas, no gating!
      // The extraction LLM is intelligent - it returns empty array if nothing is extractable
      // 🎯 NOTE: Memory extraction now happens in AIRouter (universal extraction)
      // No need to duplicate here - AIRouter runs it on EVERY request before handlers
      // We define autoMemories as empty since extraction is handled upstream
      const autoMemories: any[] = [];
      
      // 🎯 STEP 3: CHECK FOR LEARNING/COURSE CONTEXT
      // Use intent analysis to properly distinguish COURSE queries from CANVAS DOCUMENT queries
      // Courses are in Learning Central, canvas documents are workspace artifacts
      const isCourseQuery = this.isCourseQuery(message, intentAnalysis);
      
      if (isCourseQuery) {
        console.log('📚 ChatHandler: Course/learning query detected (NOT canvas documents)');
        
        try {
          const { unifiedLearningContextService } = await import('../../services/UnifiedLearningContextService');
          const learningContext = await unifiedLearningContextService.getContext(userId, message);
          
          // 🎯 FIX: Only trigger if user has COURSES, not just canvas documents
          // Canvas documents are handled separately in the normal chat flow
          if (learningContext.currentCourse || (learningContext.courseList && learningContext.courseList.length > 0)) {
            const relevantMemories = await memoryOperations.getRelevantMemories(message, sessionId, userId);
            const response = await responseGenerators.generateLearningContextResponse(
              message,
              learningContext, 
              relevantMemories
            );
            
            return {
              success: true,
              response,
              metadata: {
                sessionId,
                executionTime: Date.now() - startTime,
                toolsExecuted: 0,
                mode: 'chat'
              }
            };
          }
        } catch (learningError) {
          console.warn('⚠️ ChatHandler: Failed to get learning context:', learningError);
        }
      }
      
      // 🎯 STEP 4: HANDLE MEMORY OPERATIONS
      // 🏗️ ARCHITECTURAL FIX: Auto-extraction in AIRouter handles ALL implicit storage
      // handleMemoryOperation is only for ACTIVE operations: recall, forget, update
      // For "store" type: auto-extraction already did it - just continue to chat
      const isActiveMemoryOperation = memoryContext.type === 'recall' || memoryContext.type === 'forget' || memoryContext.type === 'update';
      
      if (isActiveMemoryOperation && memoryContext.confidence > 0.7) {
        const memoryResult = await this.handleMemoryOperation(
          memoryContext, 
          message, 
          sessionId, 
          userId,
          intentAnalysis
        );
        
        if (memoryResult) {
          return memoryResult;
        }
      }
      
      // "store" type is handled by auto-extraction in AIRouter - no need to route here
      // This prevents ALL categories (emotion, location, family, etc.) from hitting extraction errors
      
      // 🧠 STEP 5: EMOTIONAL INTELLIGENCE
      let emotionalState: any = null;
      let emotionalCheckIn: string | null = null;
      
      try {
        emotionalState = await emotionalIntelligenceService.extractEmotionFromMessage(message);
        
        if (emotionalState && userId !== 'anonymous') {
          await emotionalIntelligenceService.storeEmotionalState(userId, sessionId, emotionalState);
          const emotionalPattern = await emotionalIntelligenceService.analyzeEmotionalPattern(userId) as any;
          
          if (emotionalPattern?.shouldCheckIn && emotionalPattern?.encouragement) {
            emotionalCheckIn = emotionalPattern.encouragement;
          }
        }
      } catch (emotionError) {
        console.warn('⚠️ Emotional intelligence failed:', emotionError);
      }
      
      // 🎯 STEP 6: CAPTURE LEARNING MOMENT
      await this.captureLearningMomentIfApplicable(userId, sessionId, message, emotionalState);

      // 🎯 STEP 7: GET RELEVANT MEMORIES
      // 🔥 CRITICAL FIX: Pass the LLM-analyzed memoryContext to retrieval
      // This allows retrieval to use the LLM's understanding instead of regex
      const relevantMemories = await memoryOperations.getRelevantMemories(message, sessionId, userId, memoryContext);
      console.log(`🧠 ChatHandler: Retrieved ${relevantMemories.length} memories`);
      
      // 🎯 STEP 8: CHECK FOR TOOL REQUESTS
      const toolMapping = await this.detectToolRequests(message, intentAnalysis);
      if (toolMapping) {
        console.log('🔧 ChatHandler: Executing tool:', toolMapping.tool);
        
        try {
          const toolResult = await toolRegistry.execute(toolMapping.tool, toolMapping.params, {
            sessionId,
            startTime: Date.now()
          });
          
          const sessionContext = await this.getEnhancedSessionContext(sessionId, userId);
          const toolResponse = await responseGenerators.buildToolAwareResponse(
            message,
            toolResult,
            relevantMemories,
            sessionContext?.messages?.slice(-3)?.map((m: any) => m.content).join('\n') || '',
            toolMapping.reasoning
          );
          
          return {
            success: true,
            response: toolResponse,
            toolResults: [toolResult],
            metadata: {
              sessionId,
              executionTime: Date.now() - startTime,
              toolsExecuted: 1,
              mode: 'chat'
            }
          };
        } catch (toolError) {
          console.error('Tool execution failed:', toolError);
        }
      }
      
      // 🎯 STEP 9: GET SEARCH CONTEXT
      const conversationTexts = request.conversationHistory?.map(msg => msg.content) || [];
      const searchContext = await searchChatIntegration.getSearchContextForChat(userId, message, conversationTexts);
      
      // 🎯 STEP 10: CHECK FOR GREETING/FIRST MESSAGE
      const sessionContext = await this.getEnhancedSessionContext(sessionId, userId);
      
      // 🔧 SIMPLIFIED: Trigger greeting when chat is empty (first message in session)
      // OR when user has no memories (indicates fresh start after delete_all)
      const hasNoRecentMessages = !sessionContext?.messages || sessionContext.messages.length === 0;
      const hasNoMemories = relevantMemories.length === 0;
      
      // Show greeting if first message OR if user has no memories (fresh start)
      const shouldShowGreeting = hasNoRecentMessages || hasNoMemories;
      
      let personalizedGreeting = null;
      
      if (shouldShowGreeting) {
        console.log('🎯 ChatHandler: Greeting path triggered', { hasNoRecentMessages, memoriesCount: relevantMemories.length });
        const supersessionedMemories = memoryOperations.applySupersessionScoring(relevantMemories, 10);
        console.log('🎯 ChatHandler: Supersessioned memories:', supersessionedMemories.length);
        
        try {
          personalizedGreeting = await greetingService.generatePersonalizedGreeting(message, supersessionedMemories, userId, sessionId);
          console.log('🎯 ChatHandler: Greeting result:', personalizedGreeting ? personalizedGreeting.substring(0, 100) + '...' : 'NULL');
        } catch (greetingError) {
          console.error('❌ ChatHandler: Greeting generation FAILED:', greetingError);
        }
        
        if (!personalizedGreeting) {
          console.log('⚠️ ChatHandler: Using fallback greeting');
          personalizedGreeting = this.buildFallbackGreeting(supersessionedMemories, userId);
        }
        
        // 🎯 ALWAYS return greeting if we got one, don't fall through to LLM
        if (personalizedGreeting && personalizedGreeting.length > 5) {
            // 🔒 Sanitize greeting to prevent any UUID leakage
            const sanitizedGreeting = this.sanitizeResponse(personalizedGreeting);
            console.log('✅ ChatHandler: Returning greeting:', sanitizedGreeting.substring(0, 50) + '...');
            return {
              success: true,
              response: sanitizedGreeting,
              metadata: {
                sessionId,
                executionTime: Date.now() - startTime,
                toolsExecuted: 0,
                mode: 'chat'
              }
            };
        } else {
          console.warn('⚠️ ChatHandler: Greeting was empty, falling through to LLM');
        }
      }
      
      // 🎯 STEP 11: BUILD CONVERSATION-AWARE PROMPT AND CALL LLM
      const languageContext = request.context?.language;
      
      // Include search results in custom instructions if available
      let searchInstructions = '';
      if (searchContext.relevantArticles?.length > 0) {
        searchInstructions = `\n\n🔍 RELEVANT SEARCH CONTEXT:\n${searchContext.relevantArticles.slice(0, 3).map((a: any) => `- ${a.title}: ${a.excerpt || a.content?.substring(0, 200) || ''}`).join('\n')}`;
      }
      
      // 🎯 CANVAS AWARENESS: Tell LLM about documents with LAST-OPENED PRIORITY
      let canvasInstructions = '';
      try {
        const { useCanvasStore } = await import('../../stores/canvasStore');
        const { conversationService } = await import('../../services/ConversationService');
        const { canvasAccessTracker } = await import('../../services/CanvasAccessTracker');
        
        // Get canvas elements from store or conversation
        const storeElements = useCanvasStore.getState().canvasElementsByConversation[sessionId] || [];
        const convElements = conversationService.getConversation(sessionId)?.canvasElements || [];
        const canvasElements = storeElements.length > 0 ? storeElements : convElements;
        
        if (canvasElements.length > 0) {
          // 🎯 NEW: Use CanvasAccessTracker for priority ordering
          const canvasContext = canvasAccessTracker.getCanvasContextForAssistant(10);
          const lastOpened = canvasContext.lastOpened;
          const hasActiveCanvas = canvasContext.hasActiveCanvas;
          
          // Build document list with priority indicators
          const documentList = canvasElements.map((el: any) => {
            const title = el.content?.title || el.title || 'Untitled';
            const type = el.type || 'document';
            const preview = el.content?.content?.substring(0, 150) || el.content?.description || '';
            const isLastOpened = lastOpened?.elementId === el.id;
            const priorityMarker = isLastOpened && hasActiveCanvas ? '⭐ CURRENTLY ACTIVE: ' : 
                                   isLastOpened ? '📌 LAST OPENED: ' : '';
            return `${priorityMarker}- ${type.toUpperCase()}: "${title}" ${preview ? `(Preview: ${preview}...)` : ''}`;
          }).join('\n');
          
          // 🎯 PRIORITY INSTRUCTION: Tell LLM which document to reference by default
          let priorityInstruction = '';
          if (lastOpened && hasActiveCanvas) {
            priorityInstruction = `\n\n⭐ IMPORTANT: The user is actively working on "${lastOpened.title}". When they refer to "the document", "my document", "this", or "it" - ALWAYS assume they mean "${lastOpened.title}" unless they explicitly specify otherwise.`;
          } else if (lastOpened) {
            priorityInstruction = `\n\n📌 The most recently opened document is "${lastOpened.title}". Default to this when user mentions "the document".`;
          }
          
          canvasInstructions = `\n\n📄 CANVAS DOCUMENTS IN THIS CONVERSATION:\n${documentList}${priorityInstruction}\n\nYou CAN see and reference these documents. If the user asks about "the document" or "my document", refer to these.`;
          console.log('📄 ChatHandler: Injected canvas awareness for', canvasElements.length, 'elements, lastOpened:', lastOpened?.title || 'none');
        }
      } catch (canvasErr) {
        console.warn('⚠️ ChatHandler: Could not load canvas context:', canvasErr);
      }
      
      // 🎯 STEP 12: PROACTIVE MEMORY CONTEXT (Claude-like strategic memory injection)
      // Uses the ALREADY-FETCHED memories from STEP 7 - NO duplicate vector search!
      // Just adds topic-based scoring and strategic formatting on top
      let proactiveContextInstructions = '';
      if (userId !== 'anonymous' && proactiveMemoryContextService.shouldApplyProactiveContext(message)) {
        try {
          const proactiveContext = await proactiveMemoryContextService.getProactiveContext(
            message,
            userId,
            {
              maxMemories: 5,
              minRelevanceScore: 0.35,
              includeUseCase: true
            },
            relevantMemories  // 🎯 PASS PRE-FETCHED MEMORIES - no duplicate search!
          );
          
          if (proactiveContext.memoriesIncluded > 0) {
            proactiveContextInstructions = proactiveContext.contextBlock;
            console.log(`🎯 ChatHandler: Proactive memory injection - ${proactiveContext.memoriesIncluded} memories (strength: ${proactiveContext.injectionStrength}, topics: ${proactiveContext.topTopics.join(', ')})`);
          }
        } catch (proactiveErr) {
          console.warn('⚠️ ChatHandler: Proactive memory context failed:', proactiveErr);
        }
      }
      
      // 🔥 FIX: Correct argument order - (message, sessionId, userId, options)
      // 🎯 CONTEXT OPTIONS: Respect skipPersonalMemories for focused requests like news summarization
      const basePrompt = await conversationMemoryService.buildConversationAwarePrompt(
        message,     // 1st: the user message
        sessionId,   // 2nd: session ID (NOT exposed to LLM)
        userId,      // 3rd: user ID
        {
          includePersonalMemories: !skipPersonalMemories,  // Respect contextOptions
          includeLearningContext: !skipLearningContext,    // Respect contextOptions
          customInstructions: skipPersonalMemories 
            ? '' // For focused requests, don't add personal instructions
            : this.buildCustomInstructions(undefined, '', autoMemories, languageContext, emotionalState) + searchInstructions + canvasInstructions + proactiveContextInstructions,
          prefetchedMemories: skipPersonalMemories ? [] : relevantMemories  // Skip memories for focused requests
        }
      );
      
      const llmResult = await toolRegistry.execute('llm-completion', {
        prompt: basePrompt,
        model: 'accounts/fireworks/models/gpt-oss-120b',
        temperature: 0.6,
        maxTokens: 2000
      }, {
        sessionId,
        startTime: Date.now()
      });

      if (!llmResult.success) {
        console.error('📍 ChatHandler: LLM tool failed:', llmResult.error);
        return {
          success: true,
          response: "I'm having some trouble processing that right now. Could you try rephrasing?",
          metadata: { sessionId, executionTime: Date.now() - startTime, toolsExecuted: 0, mode: 'chat' }
        };
      }

      const actualData = llmResult.data.data || llmResult.data;
      let responseText = actualData.completion || actualData.response || actualData.message || 'AI response received...';

      // Prepend emotional check-in if generated
      if (emotionalCheckIn) {
        responseText = `${emotionalCheckIn}\n\n${responseText}`;
      }
      
      // 🔒 FINAL SAFETY NET: Sanitize any leaked UUIDs
      responseText = this.sanitizeResponse(responseText);

      return {
        success: true,
        response: responseText,
        toolResults: actualData.toolResults || [],
        metadata: {
          sessionId,
          executionTime: Date.now() - startTime,
          toolsExecuted: actualData.toolResults?.length || 0,
          mode: 'chat',
          memoriesUsed: relevantMemories.length,
          autoMemoriesStored: autoMemories.length
        }
      };

    } catch (error) {
      throw new Error(`Chat mode failed: ${(error as Error).message}`);
    }
  }

  // ========== PRIVATE HELPER METHODS ==========

  /**
   * 🎯 Detect if user is asking about COURSES (Learning Central)
   * NOT canvas documents - those are handled separately in the normal chat flow
   * 
   * BEST PRACTICE: Use LLM intent analysis as PRIMARY source, not regex
   * The UnifiedCognitiveAnalyzer already analyzed the message - use its output
   */
  private isCourseQuery(_message: string, intentAnalysis?: any): boolean {
    // 🎯 PRIMARY: Use LLM intent analysis (already computed by UnifiedCognitiveAnalyzer)
    if (!intentAnalysis) {
      console.log('⚠️ ChatHandler.isCourseQuery: No intent analysis available');
      return false;
    }
    
    // Extract intent signals from LLM analysis
    const domain = (intentAnalysis.domain || intentAnalysis.primaryDomain || '').toLowerCase();
    const primaryIntent = (intentAnalysis.primaryIntent || '').toLowerCase();
    const secondaryIntent = (intentAnalysis.secondaryIntent || '').toLowerCase();
    const characteristics = intentAnalysis.characteristics || {};
    
    // 🎯 SIGNAL 1: LLM detected cognitive domain (includes learning/education queries)
    // Note: UnifiedCognitiveAnalyzer uses "cognitive" for learning queries
    const isLearningDomain = domain === 'cognitive';
    
    // 🎯 SIGNAL 2: LLM detected query/recall intent about learning content
    const isQueryIntent = primaryIntent === 'query' || primaryIntent === 'recall' || primaryIntent === 'information';
    
    // 🎯 SIGNAL 3: LLM secondary intent mentions courses/lessons/study
    const hasCourseSecondaryIntent = 
      secondaryIntent.includes('course') || 
      secondaryIntent.includes('lesson') || 
      secondaryIntent.includes('study') ||
      secondaryIntent.includes('learning') ||
      secondaryIntent.includes('progress');
    
    // 🚫 EXCLUSION: If it's about documents/canvas, it's NOT a course query
    const isDocumentRelated = 
      secondaryIntent.includes('document') || 
      secondaryIntent.includes('canvas') ||
      secondaryIntent.includes('write') ||
      secondaryIntent.includes('create') ||
      characteristics.isDocumentRequest === true;
    
    // Decision: Course query if learning domain + query intent, or explicit course secondary intent
    const isCourse = (isLearningDomain && isQueryIntent && !isDocumentRelated) || 
                     (hasCourseSecondaryIntent && !isDocumentRelated);
    
    console.log('📚 ChatHandler.isCourseQuery:', {
      domain,
      primaryIntent,
      secondaryIntent: secondaryIntent.substring(0, 50),
      isLearningDomain,
      isQueryIntent,
      hasCourseSecondaryIntent,
      isDocumentRelated,
      result: isCourse
    });
    
    return isCourse;
  }
  
  // Legacy method for backward compatibility - now delegates to isCourseQuery
  private isLearningQuery(message: string): boolean {
    // Without intent analysis, we can't properly detect - return false to use normal chat flow
    return false;
  }

  private async handleMemoryOperation(
    context: MemoryContext,
    message: string,
    sessionId: string,
    userId: string,
    intentAnalysis?: any
  ): Promise<AIResponse | null> {
    const { memoryDatabaseBridge } = await import('../../services/MemoryDatabaseBridge');
    
    if (context.type === 'store') {
      // 🏗️ ARCHITECTURAL NOTE: "store" operations are now handled by auto-extraction in AIRouter
      // This code path is kept for explicit "remember X" commands that need acknowledgment
      // If we can't extract structured data, return null to fall through to normal chat
      // (auto-extraction already stored the info - user just needs a conversational response)
      const extractedData = context.extractedData || memoryOperations.extractMemoryData(message, context.category);
      
      if (!extractedData.value) {
        // Don't return error - fall through to normal chat
        // Auto-extraction in AIRouter already handled the storage
        console.log('📝 handleMemoryOperation: No structured data extracted, falling through to chat');
        return null;
      }
      
      // Handle supersession
      if (context.supersessionBehavior === 'replace_conflicts') {
        await this.handleSupersession(userId, context.category, extractedData.value);
      }
      
      const result = await memoryDatabaseBridge.storeMemory({
        userId,
        key: extractedData.key,
        value: extractedData.value,
        metadata: {
          category: context.category,
          source: 'explicit_statement',
          supersessionBehavior: context.supersessionBehavior,
          sessionId,
          storedAt: new Date().toISOString()
        }
      });
      
      if (result.success) {
        const naturalResponse = await responseGenerators.generateStoreResponse(extractedData.value, context.category, message);
        return {
          success: true,
          response: naturalResponse,
          toolResults: [result],
          metadata: { sessionId, executionTime: 0, toolsExecuted: 1, mode: 'chat', autoMemoriesStored: 1 }
        };
      }
    } else if (context.type === 'recall') {
      const conversationHistory = this.conversationMemory.get(sessionId) || [];
      // 🔥 CRITICAL FIX: Pass memoryContext to getRelevantMemories for intelligent category-aware retrieval!
      const relevantMemories = await memoryOperations.getRelevantMemories(message, sessionId, userId, context);
      
      if (relevantMemories.length > 0) {
        const memoriesWithDecay = memoryOperations.applySupersessionScoring(relevantMemories, 10);
        
        const response = await responseGenerators.generateNaturalRecallResponse(
          relevantMemories, 
          context.category, 
          message, 
          message,
          conversationHistory.slice(-7)
        );
        
        return {
          success: true,
          response,
          toolResults: [{ memories: memoriesWithDecay }],
          metadata: { sessionId, executionTime: 0, toolsExecuted: 0, mode: 'chat', memoriesUsed: memoriesWithDecay.length }
        };
      } else {
        const recentContext = conversationHistory.slice(-7);
        
        if (recentContext.length > 0) {
          const response = await responseGenerators.generateContextualRecallResponse(message, recentContext);
          return {
            success: true,
            response,
            metadata: { sessionId, executionTime: 0, toolsExecuted: 0, mode: 'chat', memoriesUsed: 0 }
          };
        }
        
        return {
          success: true,
          response: this.buildNewUserResponse(message),
          metadata: { sessionId, executionTime: 0, toolsExecuted: 0, mode: 'chat', memoriesUsed: 0 }
        };
      }
    } else if (context.type === 'update') {
      const extractedData = context.extractedData;
      const updateKey = extractedData?.key || memoryOperations.extractUpdateData(message)?.key;
      const updateValue = extractedData?.value || memoryOperations.extractUpdateData(message)?.value;
      
      if (updateKey && updateValue) {
        const result = await memoryDatabaseBridge.storeMemory({
          userId,
          key: updateKey,
          value: updateValue,
          metadata: { 
            category: context.category, 
            source: 'update_correction',
            sessionId,
            updatedAt: new Date().toISOString()
          }
        });
        
        if (result.success) {
          return {
            success: true,
            response: `Got it! I've updated my memory. I'll remember that!`,
            toolResults: [result],
            metadata: { sessionId, executionTime: 0, toolsExecuted: 1, mode: 'chat', autoMemoriesStored: 1 }
          };
        }
      }
    } else if (context.type === 'forget') {
      return await this.handleForgetOperation(message, context, userId);
    }
    
    return null;
  }

  private async handleSupersession(userId: string, category: string, newValue: string): Promise<void> {
    try {
      const { memoryDatabaseBridge } = await import('../../services/MemoryDatabaseBridge');
      const { vectorSearchService } = await import('../../services/VectorSearchService');
      const { apiService } = await import('../../services/APIService');
      
      // 🔧 FIX: Singleton categories - user can only have ONE value, delete ALL old entries
      const singletonCategories = ['name', 'identity', 'user_name', 'location', 'profession', 'age', 'birthday'];
      const isSingleton = singletonCategories.includes(category.toLowerCase());
      
      if (isSingleton) {
        console.log(`🗑️ Supersession: Singleton category "${category}" - deleting ALL old entries`);
        
        // Use direct database query to delete ALL memories with this category pattern
        try {
          const deleteResult = await apiService.makeRequest({
            endpoint: '/api/memory',
            method: 'POST',
            data: {
              action: 'delete_by_category',
              userId: userId,
              category: category
            }
          });
          
          const deletedCount = deleteResult?.data?.deleted || 0;
          if (deletedCount > 0) {
            console.log(`🗑️ Superseded ${deletedCount} old ${category} memories`);
          }
        } catch (deleteError) {
          console.warn('⚠️ Singleton supersession delete failed, trying key pattern:', deleteError);
          
          // Fallback: Search and delete by key pattern
          const existing = await memoryDatabaseBridge.searchMemories({
            userId,
            query: `user_${category} ${category}`,
            limit: 50
          });
          
          if (existing.success && existing.memories) {
            for (const mem of existing.memories) {
              const memKey = mem.memory_key || mem.id;
              const memCategory = mem.metadata?.category?.toLowerCase() || '';
              
              // Delete if it's the same category type (e.g., user_name, name, identity)
              if (memCategory === category.toLowerCase() || 
                  memKey.includes(`user_${category}`) || 
                  memKey.includes(`_${category}_`)) {
                await memoryDatabaseBridge.deleteMemory(userId, memKey);
                console.log(`🗑️ Superseded memory: ${memKey}`);
              }
            }
          }
        }
        return;
      }
      
      // Non-singleton: Use similarity-based supersession
      const newEmbedding = await vectorSearchService.generateEmbedding(newValue);
      
      const existing = await memoryDatabaseBridge.searchMemories({
        userId,
        query: category,
        limit: 20
      });
      
      if (existing.success && existing.memories) {
        for (const mem of existing.memories) {
          if (mem.metadata?.category === category && 
              mem.metadata?.supersessionBehavior === 'replace_conflicts') {
            const existingEmbedding = await vectorSearchService.generateEmbedding(mem.memory_value);
            const similarity = memoryOperations.cosineSimilarity(newEmbedding, existingEmbedding);
            
            if (similarity > 0.85) {
              await memoryDatabaseBridge.deleteMemory(userId, mem.memory_key);
              console.log(`🗑️ Superseded memory: ${mem.memory_key}`);
            }
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Supersession check failed:', error);
    }
  }

  private async handleForgetOperation(message: string, context: MemoryContext, userId: string): Promise<AIResponse | null> {
    const { memoryDatabaseBridge } = await import('../../services/MemoryDatabaseBridge');
    
    const isDeleteAll = message.toLowerCase().match(/\b(all|everything|every)\b.*(memor|info|data)/i);
    
    if (isDeleteAll) {
        try {
          console.log(`🔥 DELETE ALL: Using direct database deletion for user ${userId}`);
          
          // 🔧 FIX: Use direct API call to delete_all action instead of semantic search
          const { apiService } = await import('../../services/APIService');
          
          const deleteResult = await apiService.makeRequest({
            endpoint: '/api/memory',
            method: 'POST',
            data: {
              action: 'delete_all',
              userId: userId
            }
          });
          
          const deletedCount = deleteResult?.data?.deleted || 0;
          console.log(`🔥 DELETE ALL complete: ${deletedCount} records deleted from database`);
          
          // 🔥 ALSO CLEAR LOCAL STATE: Canvas store, localStorage, AND in-memory context services
          try {
            const { useCanvasStore } = await import('../../stores/canvasStore');
            const canvasState = useCanvasStore.getState();
            
            // Clear all canvas elements using the clearCanvas method
            canvasState.clearCanvas();
            console.log(`🔥 Cleared all canvas elements`);
            
            // 🔥 Clear in-memory context services (prevents stale course data from appearing)
            try {
              const { dashboardContextService } = await import('../../services/DashboardContextService');
              dashboardContextService.clearContext(userId);
              console.log(`🔥 Cleared DashboardContextService in-memory cache`);
            } catch (e) { console.warn('⚠️ Could not clear DashboardContextService:', e); }
            
            try {
              const { unifiedLearningContextService } = await import('../../services/UnifiedLearningContextService');
              // Clear by forcing a fresh context on next access
              (unifiedLearningContextService as any).contextCache?.delete?.(userId);
              console.log(`🔥 Cleared UnifiedLearningContextService cache`);
            } catch (e) { console.warn('⚠️ Could not clear UnifiedLearningContextService:', e); }
            
            // 🔥 Clear more in-memory learning services
            try {
              const { learningMomentCapture } = await import('../../services/LearningMomentCapture');
              (learningMomentCapture as any).momentCache?.clear?.();
              console.log(`🔥 Cleared LearningMomentCapture cache`);
            } catch (e) { /* optional service */ }
            
            try {
              const { unifiedLearningAnalytics } = await import('../../services/UnifiedLearningAnalytics');
              (unifiedLearningAnalytics as any).analyticsCache?.clear?.();
              console.log(`🔥 Cleared UnifiedLearningAnalytics cache`);
            } catch (e) { /* optional service */ }
            
            // Clear relevant localStorage keys BUT preserve auth
            const authKeys = ['neuraplay_user', 'currentUser', 'auth_token', 'user_id', 'token'];
            const keysToRemove = Object.keys(localStorage).filter(key => {
              // Skip auth keys - don't log user out!
              if (authKeys.some(authKey => key.includes(authKey))) return false;
              // Clear ALL neuraplay, learning, course, canvas, chat, session related keys
              return key.includes('neuraplay') || 
                     key.includes('canvas') || 
                     key.includes('course') || 
                     key.includes('chat') || 
                     key.includes('conversation') ||
                     key.includes('learning') ||
                     key.includes('progress') ||
                     key.includes('session') ||
                     key.includes('memory') ||
                     key.includes('bookmark');
            });
            keysToRemove.forEach(key => localStorage.removeItem(key));
            console.log(`🔥 Cleared ${keysToRemove.length} localStorage keys (preserved auth): ${keysToRemove.slice(0, 5).join(', ')}...`);
          } catch (localError) {
            console.warn('⚠️ Could not clear local state:', localError);
          }
          
          return {
            success: true,
            response: deletedCount > 0 
              ? `I've removed all ${deletedCount} memories. The page will refresh to give you a completely fresh start!`
              : `I've cleared all local data. The page will refresh for a fresh start!`,
            toolResults: [{ success: true, deletedCount, details: deleteResult?.data?.details }],
            metadata: { sessionId: '', executionTime: 0, toolsExecuted: deletedCount, mode: 'chat', shouldRefresh: true }
          };
        } catch (error) {
          console.error('❌ DELETE ALL failed:', error);
          return {
            success: true,
            response: `I tried to remove all my memories, but encountered an error. Let me try again later.`,
            toolResults: [],
            metadata: { sessionId: '', executionTime: 0, toolsExecuted: 0, mode: 'chat' }
          };
        }
      }
      
    // Delete specific memory
    const forgetData = await memoryOperations.extractForgetData(message, context.extractedData);
      if (forgetData && forgetData.targetMemory) {
          const searchResult = await memoryDatabaseBridge.searchMemories({
            userId,
            query: forgetData.targetMemory,
            limit: 10
          });
          
      if (searchResult.success && searchResult.memories?.length > 0) {
        const targetMemory = searchResult.memories[0];
        await memoryDatabaseBridge.deleteMemory(userId, targetMemory.memory_key);
        
            return {
              success: true,
          response: `I've removed that information.`,
          toolResults: [],
          metadata: { sessionId: '', executionTime: 0, toolsExecuted: 1, mode: 'chat' }
            };
          }
      
          return {
            success: true,
            response: `I couldn't find that specific information. Could you be more specific?`,
        toolResults: [],
        metadata: { sessionId: '', executionTime: 0, toolsExecuted: 0, mode: 'chat' }
          };
    }
    
    return null;
  }

  private buildNewUserResponse(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('name')) {
      return "I don't think we've been introduced yet! What's your name?";
    } else if (lowerMessage.includes('location') || lowerMessage.includes('where')) {
      return "I don't have any location info for you yet. Where are you located?";
    } else if (lowerMessage.includes('favorite') || lowerMessage.includes('like')) {
      return "I'm just getting to know you! Tell me more about your preferences.";
    }
    
    return "Hey there! I don't have any memories about you yet. Tell me about yourself!";
  }

  private buildFallbackGreeting(memories: any[], userId: string): string {
    const personalInfo = greetingService.extractPersonalInfo(memories);
    
    const greetingParts = [];
    
    if (personalInfo.userName) {
      greetingParts.push(`Welcome back, ${personalInfo.userName}! 👋`);
        } else {
      greetingParts.push(`Hey there! 👋`);
    }
    
    greetingParts.push(`How can I help you today?`);
    
    return greetingParts.join(' ');
  }

  private async detectToolRequests(message: string, _intentAnalysis: any): Promise<{ tool: string; params: any; reasoning: string } | null> {
    const messageLower = message.toLowerCase();
    
    // 🎯 Course navigation requests (e.g., "open my greek course", "go to my arabic course")
    const coursePatterns = [
      /(?:open|go to|take me to|start|continue|resume)\s+(?:my\s+)?(?:the\s+)?([a-zA-Z\s]+?)\s+course/i,
      /course\s+(?:called\s+)?["']?([a-zA-Z\s]+?)["']?/i,
      /(?:open|go to|start)\s+["']?([a-zA-Z\s]+?)["']?\s+(?:in\s+)?learning\s+central/i
    ];
    
    for (const pattern of coursePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const courseName = match[1].trim();
        return {
          tool: 'navigate_to_page',
          params: { 
            page: 'dashboard',
            course: courseName  // 🎯 Add course param for auto-opening
          },
          reasoning: `Opening course: ${courseName}`
        };
      }
    }
    
    // Learning Central / Dashboard navigation
    if (messageLower.includes('learning central') || 
        (messageLower.includes('go to') && messageLower.includes('course')) ||
        messageLower.includes('my courses') ||
        (messageLower.includes('open') && messageLower.includes('dashboard'))) {
      return {
        tool: 'navigate_to_page',
        params: { page: 'dashboard' },
        reasoning: 'Navigation to Learning Central requested'
      };
    }
    
    // Weather requests
    if (messageLower.includes('weather') || messageLower.includes('temperature') || 
        messageLower.includes('forecast') || messageLower.includes('climate')) {
      const location = responseGenerators.extractLocation(message);
      return {
        tool: 'get-weather',
        params: { 
          location: location || undefined,
          autoDetectLocation: !location
        },
        reasoning: 'Weather information requested'
      };
    }
    
    // Search requests
    if ((messageLower.includes('search') || messageLower.includes('find') || messageLower.includes('look up')) &&
        !messageLower.includes('memory') && !messageLower.includes('remember')) {
      const searchQuery = responseGenerators.extractSearchQuery(message);
      if (searchQuery) {
      return {
          tool: 'web-search',
          params: { query: searchQuery },
          reasoning: 'Web search requested'
        };
      }
    }
    
    return null;
  }

  private async getEnhancedSessionContext(sessionId: string, userId?: string): Promise<any> {
    try {
      const { serviceContainer } = await import('../../services/ServiceContainer');
      await serviceContainer.waitForReady();
      
      try {
        const tokenAwareContextManager = serviceContainer.get('tokenAwareContextManager') as any;
        const optimizedContext = await tokenAwareContextManager.getOptimizedContext(sessionId, userId);
        
        return {
          messages: optimizedContext.messages,
          conversationDepth: optimizedContext.messages.length,
          sessionId,
          systemPrompt: optimizedContext.systemPrompt,
          tokenCount: optimizedContext.totalTokens
        };
        
      } catch (tokenManagerError) {
        const basicContext = await this.contextManager.getSessionContext(sessionId);
        
        if (userId) {
          await chatMemoryService.initializeForUser(userId);
        }
        
        const chatTab = chatMemoryService.getChat(sessionId);
        const conversationHistory = chatTab?.messages || [];
        
        return {
          ...basicContext,
          messages: conversationHistory,
          conversationDepth: conversationHistory.length,
          sessionId
        };
      }
      
    } catch (error) {
      console.warn('⚠️ Failed to get enhanced session context:', error);
      return { messages: [], conversationDepth: 0, sessionId };
    }
  }

  private buildCustomInstructions(
    intentAnalysis?: any,
    visionContext?: string,
    autoMemories?: any[],
    languageContext?: any,
    emotionalState?: any,
    emotionalPattern?: any
  ): string {
    let instructions = '';
    
    // Language instructions
    if (languageContext?.code && languageContext.code !== 'auto' && languageContext.code !== 'en') {
      const languageMap: Record<string, string> = {
        'sv': 'Swedish', 'ru': 'Russian', 'ar': 'Arabic', 'es': 'Spanish',
        'fr': 'French', 'de': 'German', 'zh': 'Chinese', 'ja': 'Japanese'
      };
      const languageName = languageMap[languageContext.code] || languageContext.code.toUpperCase();
      instructions += `🌍 RESPOND ENTIRELY IN ${languageName.toUpperCase()}!\n\n`;
    }
    
    instructions += `You are NeuraPlay, a warm and passionate AI teacher who loves education and helping people learn! 🌟

🎓 YOUR PERSONALITY:
- Enthusiastic Educator - genuinely excited about learning
- Caring Mentor - remember students and care about their journey
- Encouraging Guide - make learning feel safe and inspiring
- Memory-Enhanced Friend - use personal details to create connections

🧠 YOUR MEMORY SYSTEM:
- You have permanent PostgreSQL memory storage
- When users share info, you automatically store it
- Memories persist across all sessions
- NEVER claim you can't remember long-term - you absolutely can`;

    // Emotional intelligence
    if (emotionalState) {
      instructions += `\n\n💙 USER'S EMOTIONAL STATE: ${emotionalState.emotion} (${emotionalState.category})`;
    }

    // Auto-extracted memories
    if (autoMemories && autoMemories.length > 0) {
      const extractedInfo = autoMemories
        .filter(m => m.category !== 'cognitive')
        .map(m => `${m.category}: ${m.value}`)
        .join(', ');
      
      if (extractedInfo) {
        instructions += `\n\n✨ JUST LEARNED: ${extractedInfo}`;
      }
    }

    // Vision context
    if (visionContext) {
      instructions += `\n\n👁️ VISUAL CONTENT:\n${visionContext}`;
    }

    instructions += `\n\n💡 MEMORY USAGE GUIDELINES:
- Use personal details naturally in conversation
- NEVER say "I found this in my memory" - just use the info naturally
- When asked "what is my name?", answer directly from context

🚫 CRITICAL - CANVAS DOCUMENT RULES:
- You CANNOT update, modify, add to, or change canvas documents in chat mode
- NEVER claim "I've updated the document" or "I've added the section" - only the canvas tool can do this
- If user asks to add/update a document, say: "I'll add that to the document now" and the system will route to the canvas tool
- If you already said you'd update something but it didn't happen, apologize and offer to try again
- NEVER hallucinate that you performed a canvas action - be honest if you don't see confirmation`;

    return instructions;
  }

  private async captureLearningMomentIfApplicable(
    userId: string,
    sessionId: string,
    message: string,
    emotionalState: any
  ): Promise<void> {
    try {
      const lowerMessage = message.toLowerCase();
      
      // 🎯 STRICT CHECK: Only capture learning moments when message is ABOUT the course content
      // NOT for general chat, personal questions, or unrelated queries
      
      // 1️⃣ MUST contain course-related keywords to be a learning moment
      const courseRelatedKeywords = [
        'lesson', 'section', 'module', 'chapter', 'exercise', 'quiz', 'test',
        'explain', 'teach', 'learn', 'study', 'practice', 'review',
        'next', 'previous', 'continue', 'start', 'finish', 'complete',
        'arabic', 'language', 'vocabulary', 'grammar', 'pronunciation', // Course-specific
        'don\'t understand', 'confused about', 'help with this', 'what does this mean',
        'can you explain', 'how do i', 'show me how'
      ];
      
      const isCourseRelated = courseRelatedKeywords.some(kw => lowerMessage.includes(kw));
      
      // 2️⃣ MUST NOT be a personal/general question
      const isPersonalOrGeneral = 
        lowerMessage.includes('my name') ||
        lowerMessage.includes('who am i') ||
        lowerMessage.includes('my family') ||
        lowerMessage.includes('my wife') ||
        lowerMessage.includes('my husband') ||
        lowerMessage.includes('my uncle') ||
        lowerMessage.includes('remember') ||
        lowerMessage.includes('know about me') ||
        lowerMessage.includes('hello') ||
        lowerMessage.includes('hi ') ||
        lowerMessage.includes('hey') ||
        lowerMessage.includes('how are you') ||
        lowerMessage.includes('thank') ||
        lowerMessage.includes('bye') ||
        lowerMessage.includes('good morning') ||
        lowerMessage.includes('good night');
      
      // 3️⃣ REJECT if not course-related OR is personal/general
      if (!isCourseRelated || isPersonalOrGeneral) {
        // Don't log for every message - only if it would have been captured before
        return;
      }
      
      // 4️⃣ CHECK if user is actually in Learning Central
      const { unifiedLearningContextService } = await import('../../services/UnifiedLearningContextService');
      const context = await unifiedLearningContextService.getContext(userId, message);
      
      // Must be ACTIVELY in a course AND in Learning Central
      if (!context.currentCourse?.id || !context.isInLearningCentral) {
        return;
      }
      
      // 5️⃣ FINALLY: Capture the learning moment
      const { learningMomentCapture } = await import('../../services/LearningMomentCapture');
      
      let interactionType: 'progress' | 'question' | 'struggle' | 'success' | 'emotional' | 'quiz' = 'progress';
      
      if (lowerMessage.includes('?') || lowerMessage.includes('how') || lowerMessage.includes('what')) {
        interactionType = 'question';
      }
      if (emotionalState?.category === 'negative' || lowerMessage.includes('stuck') || lowerMessage.includes('confused')) {
        interactionType = 'struggle';
      }
      if (emotionalState?.category === 'positive' || lowerMessage.includes('got it') || lowerMessage.includes('understand')) {
        interactionType = 'success';
      }
      
      const course = context.currentCourse;
      
      console.log(`📚 ChatHandler: Capturing learning moment for course "${course.name}"`);
      
      await learningMomentCapture.captureMoment({
        userId,
        sessionId,
        courseId: course.id,
        courseTitle: course.name,
        sectionIndex: course.currentStep,
        sectionTitle: course.currentStepTitle || `Step ${course.currentStep + 1}`,
        userMessage: message,
        interactionType,
        emotionalState,
        comprehensionLevel: context.progress.comprehensionLevel,
        knowledgeGaps: context.struggles.knowledgeGaps
      });
      
    } catch (error) {
      console.warn('⚠️ Failed to capture learning moment:', error);
    }
  }
}


