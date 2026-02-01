// Core AIRouter (The Dispatcher)
// The AIRouter class is slimmed down to its essential function: receiving requests and dispatching them to the correct handler.

// IntentAnalysisService removed - using UnifiedCognitiveAnalyzer instead
import { SafetyService } from './safety/SafetyService';
import { ModeHandlerFactory } from './handlers/ModeHandlerFactory';
import { ContextManager } from '../services/ContextManager';
import { EventBus, serviceContainer } from '../services/ServiceContainer';
import { logger } from '../services/LoggingService';
// CRITICAL: Static import for canvas store to avoid hydration race condition
import { useCanvasStore } from '../stores/canvasStore';

export interface AIRequest {
  message: string;
  sessionId: string;
  userId?: string;
  context?: any;
  conversationHistory?: Array<{role: string, content: string}>;
  mode?: 'chat' | 'agent' | 'tool-calling' | 'socratic_chat';
  constraints?: {
    maxTokens?: number;
    temperature?: number;
    allowedTools?: string[];
    timeoutMs?: number;
  };
  // 🎯 CONTEXT OPTIONS: Control what context is injected into the prompt
  // Useful for specialized requests like news summarization that shouldn't include personal memories
  contextOptions?: {
    skipPersonalMemories?: boolean;      // Don't inject user's personal memories
    skipConversationHistory?: boolean;   // Don't include chat history
    skipLearningContext?: boolean;       // Don't include course/learning context
    customSystemPrompt?: string;         // Override the system prompt entirely
  };
  // 🎯 SPATIAL CONTEXT: Where is the user in the app?
  // Critical for distinguishing between canvas modification vs agentic creation
  locationContext?: {
    currentPage: string;           // e.g., '/dashboard', '/canvas', '/learning'
    isCanvasVisible: boolean;      // Is the canvas panel currently visible/open?
    isCanvasFullscreen: boolean;   // Is canvas in fullscreen mode?
    activeCanvasType?: string;     // 'document' | 'code' | 'chart' | null
    assistantType?: 'small' | 'fullscreen' | 'mobile';  // Which assistant is the user interacting with?
  };
  // Multimodal support
  attachments?: {
    images?: File[] | string[];
    documents?: File[];
    metadata?: {
      totalFiles: number;
      totalSize: number;
      types: string[];
    };
  };
  visionContext?: {
    hasVisualContent: boolean;
    requiresVisionAnalysis: boolean;
    cacheKey?: string;
  };
}

export interface AIResponse {
  success: boolean;
  response: string;
  toolResults?: any[];
  metadata: {
    sessionId: string;
    executionTime: number;
    tokensUsed?: number;
    toolsExecuted: number;
    mode: string;
    activateCanvas?: boolean;
    memoriesUsed?: number;
    autoMemoriesStored?: number;
    memoryCategory?: string;
    cognitiveState?: any;
    shouldRefresh?: boolean; // 🔄 Signal UI to perform full page refresh (e.g., after delete all memories)
  };
  error?: string;
  // Vision-specific response data
  visionAnalysis?: {
    description?: string;
    objects?: string[];
    text?: string;
    scene?: string;
    emotions?: string;
    colors?: string[];
    composition?: string;
    confidence?: number;
  };
  processedDocuments?: {
    filename: string;
    content: string;
    type: string;
  }[];
  combinedInsights?: string;
}

export class AIRouter {
  private static instance: AIRouter;
  // Legacy IntentAnalysisService removed - using UnifiedCognitiveAnalyzer
  private safetyService: SafetyService;
  private modeHandlerFactory: ModeHandlerFactory;
  private contextManager: ContextManager; // Keeping for backward compatibility
  private eventBus: EventBus;
  private initialized = false;

  constructor() {
    // Legacy IntentAnalysisService removed - using UnifiedCognitiveAnalyzer instead
    this.safetyService = new SafetyService();
    this.modeHandlerFactory = new ModeHandlerFactory();
    this.contextManager = new ContextManager(); // Fallback
    this.eventBus = EventBus.getInstance();
  }

  /**
   * 🎯 PATTERN-BASED MEMORY DETECTION - Direct like canvas, no LLM gatekeeping
   * This ensures memory extraction runs even if LLM fails to detect it
   */
  private isMemoryRequestByPattern(message: string): boolean {
    const messageLower = message.toLowerCase();
    
    // Name patterns (most critical for personalization)
    const namePatterns = [
      /\b(my name is|i'm|i am|call me|im)\s+\w+/i,      // "my name is X", "I'm X"
      /\b\w+\s+(is my name)\b/i,                         // "X is my name"
    ];
    
    // Personal info patterns
    const personalPatterns = [
      /\b(i have a|i own|my)\s+(dog|cat|pet|car|house|apartment)/i,
      /\b(i work|i'm working|working)\s+(at|for|in)/i,
      /\b(i live|i'm from|living in|from)\s+\w+/i,
      /\b(i study|studying|i'm a student)/i,
      /\b(my (wife|husband|partner|girlfriend|boyfriend|mom|dad|brother|sister|son|daughter))/i,
      /\b(i like|i love|i enjoy|i hate|my favorite|my hobby)/i,
    ];
    
    // Explicit memory commands
    const memoryCommands = [
      /\b(remember|save|store|memorize|don't forget|note that)\b/i,
      /\b(what do you know about me|do you remember|what's my|tell me about myself)\b/i,
    ];
    
    const allPatterns = [...namePatterns, ...personalPatterns, ...memoryCommands];
    const isMatch = allPatterns.some(pattern => pattern.test(messageLower));
    
    if (isMatch) {
      console.log('🔍 AIRouter: Pattern-based memory detection TRIGGERED for:', message.substring(0, 50));
    }
    
    return isMatch;
  }

  static getInstance(): AIRouter {
    if (!AIRouter.instance) {
      AIRouter.instance = new AIRouter();
    }
    return AIRouter.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🤖 Initializing AI Router...');
    
    // Legacy IntentAnalysisService.initialize() removed
    await this.safetyService.initialize();
    await this.modeHandlerFactory.initialize();
    
    this.initialized = true;
    console.log('✅ AI Router initialized');
  }

  async processRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    logger.info('AIRouter', `processRequest: message="${request.message?.substring(0, 50)}", session=${request.sessionId}`);
    
    try {
      // CRITICAL FIX: Validate request message early to prevent downstream errors
      if (!request.message || typeof request.message !== 'string') {
        console.error('❌ AIRouter - Invalid message in request:', {
          message: request.message,
          messageType: typeof request.message,
          sessionId: request.sessionId,
          mode: request.mode
        });
        return {
          success: false,
          response: 'I need a message to process. Please try sending your request again.',
          toolResults: [],
          metadata: {
            sessionId: request.sessionId,
            executionTime: Date.now() - startTime,
            toolsExecuted: 0,
            mode: 'error',
            error: 'Invalid message parameter'
          }
        };
      }
      
      await this.initialize();

      // 1. Get enhanced session context using UnifiedSessionManager for better integration
      await serviceContainer.waitForReady();
      let sessionContext;
      
      try {
        const unifiedSessionManager = serviceContainer.get('unifiedSessionManager') as any;
        
        // Pass request.userId as-is to session manager (already set by NeuraPlayAssistantLite)
        sessionContext = await unifiedSessionManager.getSessionContext(request.sessionId, request.userId);
        console.log('🔄 AIRouter: Using UnifiedSessionManager for session context');
      } catch (error) {
        console.warn('⚠️ AIRouter: UnifiedSessionManager not available, using fallback:', error);
        // Fallback to direct ContextManager
        sessionContext = await this.contextManager.getSessionContext(request.sessionId);
        // Ensure sessionContext includes userId from request
        sessionContext = {
          ...sessionContext,
          sessionId: request.sessionId,
          userId: request.userId
        };
      }
      
      // 🎯 NEW: Use clean UnifiedCognitiveAnalyzer instead of 5,979-line monolith
      let intentAnalysis;
      try {
        const cognitiveAnalyzer = serviceContainer.get('unifiedCognitiveAnalyzer');
        if (cognitiveAnalyzer) {
          console.log('🧠 AIRouter: Using NEW UnifiedCognitiveAnalyzer (5x faster)');
          // 🧠 CRITICAL: Pass conversation history for context understanding
          // This allows "Yes!" to be understood as confirmation of previous proposal
          const enrichedSessionContext = sessionContext ? {
            ...sessionContext,
            conversationHistory: request.conversationHistory || sessionContext.conversationHistory || []
          } : {
            sessionId: request.sessionId,
            userId: request.userId,
            conversationHistory: request.conversationHistory || []
          };
          const cognitiveResult = await cognitiveAnalyzer.analyzeMessage({
            message: request.message || '',
            sessionContext: enrichedSessionContext
          });
          
          // Convert new format to legacy format for backward compatibility
          // CRITICAL FIX: Include ALL intent fields at top level for easy access
          intentAnalysis = {
            primaryIntent: cognitiveResult.intent.primaryIntent,
            primaryDomain: cognitiveResult.intent.primaryDomain,
            secondaryIntent: cognitiveResult.intent.secondaryIntent,
            characteristics: cognitiveResult.intent.characteristics,
            interactionStyle: cognitiveResult.intent.interactionStyle,
            complexityLevel: cognitiveResult.intent.complexityLevel,
            lengthRequirement: cognitiveResult.intent.lengthRequirement, // CRITICAL: For long document generation
            timeSensitivity: cognitiveResult.intent.timeSensitivity,
            processingMode: cognitiveResult.processingMode.mode,
            confidence: cognitiveResult.confidence,
            reasoning: cognitiveResult.reasoning,
            shouldExecute: cognitiveResult.intent.shouldExecute,
            toolRequests: cognitiveResult.toolRequests,
            canvasActivation: cognitiveResult.canvasActivation,
            confusionDetection: cognitiveResult.confusion,
            socraticQuestions: cognitiveResult.socraticAnalysis?.questions || [],
            socraticCognitiveData: cognitiveResult.socraticAnalysis?.cognitiveAnalysis,
            // Legacy fields for handlers that expect them
            layer2_intent: cognitiveResult.intent,
            layer4_confusion: cognitiveResult.confusion,
            // 🎯 LLM-detected action confirmation (user confirming a proposed action)
            isActionConfirmation: cognitiveResult.isActionConfirmation || false,
            // Optional fields that may be added later
            isCanvasRevision: undefined as boolean | undefined,
            targetDocumentId: undefined as string | undefined
          } as any; // Use 'any' to allow dynamic properties
          
        } else {
          throw new Error('UnifiedCognitiveAnalyzer not available');
        }
      } catch (error) {
        console.error('❌ AIRouter: UnifiedCognitiveAnalyzer failed, no fallback available');
        throw new Error('Analysis failed: UnifiedCognitiveAnalyzer unavailable');
      }

      // 2. SafetyService for intent-aware safety checks
      const inputSafety = await this.safetyService.validateInputWithIntent(request.message, intentAnalysis, {
        sessionId: request.sessionId,
        userId: request.userId
      });

      if (!inputSafety.isSafe) {
        return this.safetyService.handleSafetyViolation(request, inputSafety);
      }

      // 3. Check for vision content and route appropriately
      // PRIORITY ORDER: Canvas revision > Canvas activation > Tool requests > Frontend mode
      // 🔧 FIX: Robust mode extraction - handle both string and object forms
      let mode: string = 'chat'; // Default
      if (typeof intentAnalysis.processingMode === 'string' && intentAnalysis.processingMode) {
        mode = intentAnalysis.processingMode;
      } else if (typeof intentAnalysis.processingMode === 'object' && intentAnalysis.processingMode?.mode) {
        mode = intentAnalysis.processingMode.mode;
      } else if (typeof request.mode === 'string' && request.mode) {
        mode = request.mode;
      }
      
      console.log('🔍 AIRouter Mode Resolution:', {
        intentProcessingMode: intentAnalysis.processingMode,
        requestMode: request.mode,
        resolvedMode: mode
      });
      
      // PURE LLM-BASED CANVAS REVISION DETECTION
      const hasModificationIntent = intentAnalysis.primaryIntent === 'modification';
      const messageLower = request.message.toLowerCase();
      
      // 🚨 CRITICAL: Memory deletion requests MUST bypass canvas revision detection!
      const hasDeleteWord = messageLower.includes('delete') || messageLower.includes('forget') || messageLower.includes('remove') || messageLower.includes('clear') || messageLower.includes('wipe');
      const hasMemoryWord = messageLower.includes('memor') || messageLower.includes('about me');
      if (hasDeleteWord && hasMemoryWord) {
        console.log('🔥 AIRouter: MEMORY DELETION detected - bypassing canvas, routing to chat handler');
        const chatHandler = this.modeHandlerFactory.getHandler('chat');
        if (chatHandler) {
          return await chatHandler.handle(request, intentAnalysis);
        }
      }
      
      // Check for existing canvas elements in current session
      // CRITICAL: Use static import (at top of file) to avoid zustand persist hydration race condition
      let hasExistingCanvasElement = false;
      let existingDocumentId: string | undefined;
      try {
        const canvasState = useCanvasStore.getState();
        
        // Canvas state available
        
        // Sync conversation ID first
        if (request.sessionId && canvasState.currentConversationId !== request.sessionId) {
          console.log('🔄 AIRouter: Syncing conversation ID from', canvasState.currentConversationId, 'to', request.sessionId);
          canvasState.setCurrentConversation(request.sessionId);
        }
        
        // Get elements for current conversation - ALSO check by sessionId directly
        let currentElements = canvasState.getCurrentCanvasElements();
        
        // CRITICAL FIX: If no elements found via getCurrentCanvasElements, check directly by sessionId
        if (currentElements.length === 0 && request.sessionId) {
          const directElements = canvasState.canvasElementsByConversation[request.sessionId] || [];
          if (directElements.length > 0) {
            console.log('🔍 AIRouter: Found elements via direct lookup:', directElements.length);
            currentElements = directElements;
          }
        }
        
        hasExistingCanvasElement = currentElements.length > 0;
        
        // Find the most recent document for revision
        const documentElements = currentElements.filter(el => el.type === 'document');
        if (documentElements.length > 0) {
          // Sort by timestamp (newest first) and get the first one
          const sortedDocs = [...documentElements].sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          existingDocumentId = sortedDocs[0].id;
          console.log('📄 AIRouter: Found document for revision:', existingDocumentId);
        }
        
        if (hasExistingCanvasElement) {
          console.log('📄 AIRouter: Found', currentElements.length, 'existing canvas element(s) in conversation', request.sessionId, 
            '| Document count:', documentElements.length);
        } else {
          console.log('📄 AIRouter: No canvas elements found in conversation', request.sessionId, 
            '| All conversation IDs with elements:', Object.entries(canvasState.canvasElementsByConversation)
              .filter(([_, els]) => (els as CanvasElement[]).length > 0)
              .map(([id, els]) => `${id}(${(els as CanvasElement[]).length})`).join(', '));
        }
      } catch (error) {
        console.warn('⚠️ AIRouter: Could not check canvas elements:', error);
      }
      
      // CANVAS REVISION: Route to tool-calling if LLM-detected modification + existing canvas
      console.log('🔄 AIRouter: Canvas revision check', {
        hasModificationIntent,
        hasExistingCanvasElement,
        existingDocumentId,
        primaryIntent: intentAnalysis?.primaryIntent,
        messageLower: messageLower.substring(0, 50) + '...'
      });
      
      // 🎯 SPATIAL CONTEXT: Is user currently viewing the canvas?
      // CRITICAL: Only treat as modification if user CAN SEE the canvas
      const locationContext = request.locationContext || {
        currentPage: '',
        isCanvasVisible: false,
        isCanvasFullscreen: false,
        activeCanvasType: null,
        assistantType: undefined
      };
      
      // 🚫 CRITICAL: Small/mobile assistant should NEVER create or modify canvas documents
      // Canvas operations are ONLY allowed in fullscreen NeuraPlayAssistantLite
      const isSmallAssistant = locationContext.assistantType === 'small' || 
                               locationContext.assistantType === 'mobile';
      
      // Canvas is only considered "viewable" if user is in fullscreen assistant AND canvas is visible
      const isUserViewingCanvas = !isSmallAssistant && (
                                   locationContext.isCanvasVisible || 
                                   locationContext.isCanvasFullscreen ||
                                   locationContext.currentPage?.includes('/canvas') ||
                                   locationContext.currentPage?.includes('/document')
                                 );
      
      if (isSmallAssistant) {
        console.log('🚫 AIRouter: Small assistant detected - canvas operations DISABLED');
      }
      
      // 🧠 LLM-BASED STYLE MODIFICATION DETECTION (not regex!)
      // Check if LLM detected style modification intent
      const isStyleModification = intentAnalysis.primaryIntent === 'modification' && 
        (intentAnalysis.secondaryIntent?.includes('style') || 
         intentAnalysis.secondaryIntent?.includes('format') ||
         intentAnalysis.characteristics?.isStyleChange);
      
      // 🎯 LLM-BASED ACTION CONFIRMATION DETECTION
      // The LLM should detect this from conversation context, not regex
      const isCanvasActionConfirmation = intentAnalysis.isActionConfirmation === true ||
        intentAnalysis.secondaryIntent?.includes('confirm') ||
        intentAnalysis.secondaryIntent?.includes('execute') ||
        intentAnalysis.secondaryIntent?.includes('action_confirmation');
      
      // 🔧 ENHANCED REVISION DETECTION: LLM-based, with spatial context
      const hasContentAdditionIntent = (intentAnalysis.primaryIntent === 'modification' || isCanvasActionConfirmation) && 
        !isStyleModification; // Content addition, not just styling
      
      // CRITICAL: Detect "chart/table IN document" vs "standalone chart canvas"
      // If user says "part that shows a chart" or "section with a table", it's a DOCUMENT REVISION, not chart creation
      const isDocumentChartRequest = /\b(part|section|paragraph|page)\b.*\b(show|shows|showing|display|displays|contain|contains|include|includes|with|about)\b.*\b(chart|table|list|comparison)\b/i.test(messageLower);
      
      // 🎯 CONTEXT-AWARE REVISION DETECTION (LLM-BASED):
      // - Style modification: ONLY if user is VIEWING canvas
      // - Content addition: ONLY if user is VIEWING canvas  
      // - If on Dashboard with canvas existing: Treat as NEW creation (agentic flow)
      // - Action confirmation: LLM detects from conversation context (no regex!)
      const shouldTreatAsRevision = hasExistingCanvasElement && (
        // User viewing canvas + modification intent
        (isUserViewingCanvas && (hasModificationIntent || hasContentAdditionIntent || isStyleModification || isDocumentChartRequest)) ||
        // OR: LLM-detected action confirmation (user confirming proposed action from conversation)
        isCanvasActionConfirmation
      );
      
      if (isCanvasActionConfirmation) {
        console.log('🎯 AIRouter: LLM detected action confirmation from conversation context');
      }
      
      console.log('🎯 AIRouter: Spatial context check', {
        isUserViewingCanvas,
        currentPage: locationContext.currentPage,
        isCanvasVisible: locationContext.isCanvasVisible,
        hasExistingCanvasElement,
        willTreatAsRevision: shouldTreatAsRevision
      });
      
      if (shouldTreatAsRevision) {
        mode = 'tool-calling';
        // Mark this as a revision request for ToolCallingHandler
        intentAnalysis.isCanvasRevision = true;
        intentAnalysis.targetDocumentId = existingDocumentId;
        intentAnalysis.isStyleModification = isStyleModification; // 🎨 Pass style flag
        intentAnalysis.characteristics = {
          ...intentAnalysis.characteristics,
          isRevision: true,
          isAppend: !isStyleModification, // Only append for content additions
          isStyleChange: isStyleModification,
          hasExistingContext: true
        };
        console.log('📝 AIRouter: Canvas MODIFICATION detected (LLM + spatial context)', {
          targetDocumentId: existingDocumentId,
          sessionId: request.sessionId,
          primaryIntent: intentAnalysis?.primaryIntent,
          isStyleModification,
          isUserViewingCanvas,
          currentPage: locationContext.currentPage,
          detectionMethod: 'LLM-intent + spatial awareness (no regex)'
        });
      }
      // CANVAS ACTIVATION: Force tool-calling mode when canvas should activate
      // 🚫 But ONLY if NOT in small assistant - small assistant cannot create canvas
      // 🎯 AND ONLY for creation/modification - informational (Q&A) stays in chat for context injection
      else if (intentAnalysis.canvasActivation?.shouldActivate && !isSmallAssistant && 
               intentAnalysis.primaryIntent !== 'informational') {
        mode = 'tool-calling';
        console.log('🎯 AIRouter: Canvas activation detected - switching to tool-calling mode');
      }
      else if (intentAnalysis.canvasActivation?.shouldActivate && isSmallAssistant) {
        // Canvas would activate but user is in small assistant - skip it
        console.log('🚫 AIRouter: Canvas would activate but BLOCKED (small assistant)');
        console.log('💡 Hint: Open the fullscreen assistant to create documents');
        // Fall through to chat mode instead
      }
      else if (intentAnalysis.canvasActivation?.shouldActivate && 
               intentAnalysis.primaryIntent === 'informational') {
        // User asking ABOUT canvas (Q&A) - stay in chat mode for canvas context injection
        console.log('📄 AIRouter: Canvas Q&A detected - staying in chat mode for context injection');
        mode = 'chat';
      }
      // 🔧 CRITICAL: MEMORY REQUESTS FIRST - Must extract before anything else!
      // Check memory requests BEFORE other tools so auto-extraction always runs
      // 🎯 PATTERN-BASED FALLBACK: Don't rely solely on LLM - use patterns like canvas does!
      else if (intentAnalysis.toolRequests?.isMemoryRequest || this.isMemoryRequestByPattern(request.message)) {
        // 🔧 FIX: ChatHandler handles BOTH extraction AND retrieval
        // Auto-extraction runs for ALL messages, regardless of question marks
        mode = 'chat';
        
        const message = request.message.toLowerCase();
        const hasPersonalInfo = /\b(my|i'm|i am|im)\b/i.test(message);
        const isQuestion = message.includes('?') || /^(what|who|where|when|how|do|did|can|could|would|should|is|are|was|were)\b/i.test(message);
        
        const detectedBy = intentAnalysis.toolRequests?.isMemoryRequest ? 'LLM' : 'PATTERN';
        if (hasPersonalInfo && isQuestion) {
          console.log(`🧠 AIRouter: HYBRID memory request (storage + recall) detected by ${detectedBy}`);
        } else if (hasPersonalInfo) {
          console.log(`🧠 AIRouter: Memory STORAGE detected by ${detectedBy} - ChatHandler will auto-extract`);
        } else if (isQuestion) {
          console.log(`🧠 AIRouter: Memory RETRIEVAL detected by ${detectedBy} - ChatHandler will recall`);
        } else {
          console.log(`🧠 AIRouter: Memory request detected by ${detectedBy} - ChatHandler will handle`);
        }
      }
      // OTHER TOOL REQUESTS: Force tool-calling mode for non-memory tools
      else if (intentAnalysis.toolRequests?.isSearchRequest ||
               intentAnalysis.toolRequests?.isWeatherRequest ||
               intentAnalysis.toolRequests?.isImageRequest ||
               intentAnalysis.toolRequests?.isNavigationRequest ||
               intentAnalysis.toolRequests?.isSettingsRequest) {
        mode = 'tool-calling';
        console.log('🎯 AIRouter: Tool request detected - switching to tool-calling mode', {
          isSearchRequest: intentAnalysis.toolRequests?.isSearchRequest,
          isWeatherRequest: intentAnalysis.toolRequests?.isWeatherRequest,
          isImageRequest: intentAnalysis.toolRequests?.isImageRequest,
          isNavigationRequest: intentAnalysis.toolRequests?.isNavigationRequest,
          isSettingsRequest: intentAnalysis.toolRequests?.isSettingsRequest
        });
      }
      // Only use request.mode if no special handling is detected
      else if (request.mode) {
        mode = request.mode;
      }
      
      console.log('🎯 Mode Selection:', {
        requestMode: request.mode,
        intentAnalysisMode: intentAnalysis.processingMode,
        canvasActivation: intentAnalysis.canvasActivation?.shouldActivate,
        toolRequests: intentAnalysis.toolRequests,
        finalMode: mode
      });
      
      // VISION ROUTING: Override to vision mode if explicitly needed
      const hasVisualContent = !!(request.attachments?.images?.length || request.attachments?.documents?.length);
      if (hasVisualContent) {
        console.log('👁️ AIRouter: Visual content detected');
        
        // Update vision context for all modes
        if (!request.visionContext) {
          request.visionContext = {
            hasVisualContent: true,
            requiresVisionAnalysis: true,
            cacheKey: `vision_${request.sessionId}_${Date.now()}`
          };
        }
        
        // PRIORITY 1: Frontend explicitly requested vision mode (e.g., file upload with attachments)
        if (request.mode === 'vision') {
          mode = 'vision';
          console.log('👁️ AIRouter: Explicit vision mode requested from frontend, routing to vision handler');
        }
        // PRIORITY 2: Message indicates vision analysis needed
        else {
          const needsVisionMode = /\b(analyze|describe|what.*see|what.*image|what.*picture|explain.*visual|look at|what.*document|what.*file|what.*pdf)\b/i.test(request.message);
          if (needsVisionMode) {
            console.log('👁️ AIRouter: Vision analysis keywords detected, routing to vision handler');
            mode = 'vision';
          } else {
            console.log('👁️ AIRouter: Visual content will be processed in', mode, 'mode');
          }
        }
      }
      
      const handler = this.modeHandlerFactory.getHandler(mode);

      if (!handler) {
        throw new Error(`No handler found for mode: ${mode}`);
      }

      console.log(`🎯 AIRouter - Processing in ${mode} mode:`, {
        sessionId: request.sessionId,
        messageLength: request.message?.length || 0,
        userId: request.userId,
        requestedMode: request.mode,
        determinedMode: mode
      });

      // 🚫 REMOVED: Message persistence - AIRouter is a ROUTER, not a persistence layer!
      // Message saving is handled by NeuraPlayAssistantLite and UnifiedSessionManager

      // 🎯 UNIVERSAL MEMORY EXTRACTION - Like canvas vectorization, runs on EVERY request!
      // This ensures ALL 20+ categories are checked regardless of routing
      try {
        const { memoryOperations } = await import('./handlers/MemoryOperations');
        logger.info('AIRouter', 'Running universal memory extraction');
        
        const conversationContext = {
          conversationHistory: request.conversationHistory || [],
          recentMessages: request.conversationHistory || [],
          sessionId: request.sessionId,
          userId: request.userId
        };
        
        // 🐛 CRITICAL FIX: Do NOT extract memories from DELETION/CORRECTION requests!
        // "Forget my name is Ahmed" should DELETE, not STORE "Ahmed"
        // Use LLM intent analysis - check if this is a memory deletion/correction
        const memoryContext = await memoryOperations.analyzeMemoryContext(request.message, intentAnalysis);
        const isDeletionRequest = memoryContext.type === 'forget' || 
                                  memoryContext.type === 'correction' ||
                                  memoryContext.action === 'delete';
        
        if (isDeletionRequest) {
          logger.info('AIRouter', `🚫 Skipping memory extraction - LLM detected ${memoryContext.type || 'deletion'} request`);
        } else {
          const autoMemories = await memoryOperations.extractAutoMemories(
            request.message,
            request.sessionId,
            request.userId || 'anonymous',
            intentAnalysis,
            conversationContext
          );
          
          if (autoMemories.length > 0) {
            logger.info('AIRouter', `Extracted ${autoMemories.length} memories: ${autoMemories.map(m => m.key).join(', ')}`);
            await memoryOperations.storeAutoMemories(autoMemories, request.sessionId, request.userId || 'anonymous');
            logger.info('AIRouter', 'Memories stored successfully');
          } else {
            logger.debug('AIRouter', 'No extractable memories in this message');
          }
        }
      } catch (extractError) {
        logger.warn('AIRouter', `Universal extraction failed: ${extractError}`);
      }

      // 4. HYBRID REQUEST HANDLING: Memory extraction + Tool execution
      // If request has BOTH memory and tool needs, run BOTH handlers sequentially
      const hasMemoryRequest = intentAnalysis.toolRequests?.isMemoryRequest;
      const hasOtherToolRequest = intentAnalysis.toolRequests?.isSearchRequest ||
                                  intentAnalysis.toolRequests?.isWeatherRequest ||
                                  intentAnalysis.toolRequests?.isImageRequest ||
                                  intentAnalysis.toolRequests?.isNavigationRequest ||
                                  intentAnalysis.toolRequests?.isSettingsRequest;
      
      let result: any;
      
      if (hasMemoryRequest && hasOtherToolRequest && mode === 'chat') {
        console.log('🔄 AIRouter: HYBRID REQUEST detected - running ChatHandler for extraction, then checking for tools');
        
        // STEP 1: Run ChatHandler for extraction + memory recall
        const chatResult = await handler.handle(request, intentAnalysis);
        
        // STEP 2: Check if we also need to execute tools
        console.log('🔍 AIRouter: Chat complete, checking if tool execution needed...');
        
        // Get ToolCallingHandler
        const { ToolCallingHandler } = await import('./handlers/ToolCallingHandler');
        const toolHandler = new ToolCallingHandler();
        
        // Execute tools
        const toolResult = await toolHandler.handle(request, intentAnalysis);
        
        // STEP 3: Merge results
        if (toolResult.toolResults && toolResult.toolResults.length > 0) {
          console.log('✅ AIRouter: Merging chat response with tool results');
          result = {
            success: true,
            response: chatResult.response, // Keep chat response (has extraction + recall)
            toolResults: toolResult.toolResults, // Add tool results
            metadata: {
              ...chatResult.metadata,
              toolsExecuted: toolResult.metadata?.toolsExecuted || 0,
              mode: 'hybrid-chat-tools'
            }
          };
        } else {
          // No tools executed, use chat result only
          result = chatResult;
        }
      } else {
        // Single handler execution (normal path)
        result = await handler.handle(request, intentAnalysis);
      }

      // 🚫 REMOVED: AI response persistence - AIRouter is a ROUTER, not a persistence layer!
      // Response saving is handled by NeuraPlayAssistantLite and UnifiedSessionManager

      // 5. SafetyService for output validation
      const safeResult = await this.safetyService.validateOutput(result.response, {
        sessionId: request.sessionId,
        userId: request.userId
      });

      if (!safeResult.isSafe && safeResult.sanitizedResponse) {
        result.response = safeResult.sanitizedResponse;
      }

      // Update context with the interaction
      await this.contextManager.updateContext(
        request.sessionId,
        'last_interaction',
        {
          request: request.message,
          response: result.response,
          mode,
          timestamp: Date.now()
        },
        ['interaction', mode]
      );

      // Emit completion event
      this.eventBus.emitAsync('request-completed', {
        request,
        response: result,
        intentAnalysis,
        executionTime: Date.now() - startTime
      });

      return {
        ...result,
        metadata: {
          ...result.metadata,
          executionTime: Date.now() - startTime
        }
      };

    } catch (error) {
      console.error('❌ AIRouter - Main error caught:', error);
      console.error('❌ AIRouter - Error stack:', (error as Error).stack);

      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.eventBus.emitAsync('request-failed', {
        request,
        error: errorMessage,
        executionTime: Date.now() - startTime
      });

      return {
        success: false,
        response: `I apologize, but I encountered an error: ${errorMessage}`,
        metadata: {
          sessionId: request.sessionId,
          executionTime: Date.now() - startTime,
          toolsExecuted: 0,
          mode: request.mode || 'error'
        },
        error: errorMessage
      };
    }
  }

  // Session management
  async closeSession(sessionId: string): Promise<void> {
    await this.contextManager.clearSession(sessionId);
  }

  // Statistics
  getStats(): any {
    const contextStats = this.contextManager.getContextStats();
    return {
      activeSessions: contextStats.sessionsInMemory || 0,
      registeredHandlers: this.modeHandlerFactory.getAvailableModes().length,
      // Legacy intentAnalysisStats removed - using UnifiedCognitiveAnalyzer
      safetyStats: this.safetyService.getStats()
    };
  }
}

// Export singleton instance
export const aiRouter = AIRouter.getInstance();
