// Service Container - Dependency Injection for AI System
// Seamlessly integrates with existing architecture

import { logger } from '../utils/Logger';

// Simple EventEmitter implementation for browser compatibility
class SimpleEventEmitter {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  emit(event: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(...args));
    }
  }

  off(event: string, listener: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }
}

const EventEmitter = SimpleEventEmitter;
import { preloadChunks } from './lazyChunks';

// Import existing services that will be integrated
import { toolRegistry } from './ToolRegistry';
import { ContextManager } from './ContextManager';

// New service interfaces
export interface IntentAnalysis {
  linguisticComponents: any;
  primaryIntent: 'creation' | 'informational' | 'conversational' | 'complex_workflow' | 'navigation' | 'modification' | 'analysis' | 'instructional' | 'evaluation' | 'clarification_request' | 'creative_writing';
  shouldExecute: boolean;
  confidence: number;
  reasoning: string;
  contextState: any;
  confusionDetection: any;
  socraticQuestions?: string[];
  processingMode: 'tool-calling' | 'agent' | 'chat' | 'socratic_chat' | 'creative_writing';
  safetyViolation?: any;
}

export interface ModeHandler {
  process(request: any, intent: IntentAnalysis): Promise<any>;
}

export interface SafetyResult {
  isSafe: boolean;
  violation?: string;
  riskLevel: 'safe' | 'moderate' | 'high';
  reasoning: string;
  sanitizedResponse?: string;
}

// Event Bus for service communication
export class EventBus extends EventEmitter {
  private static instance: EventBus;
  
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  async emitAsync(event: string, data: any): Promise<void> {
    logger.debug(`Event: ${event}`, 'EventBus', data);
    this.emit(event, data);
  }

  // Type-safe event handlers for AI system
  onIntentAnalyzed(handler: (data: { intent: IntentAnalysis; requestId: string }) => void): void {
    this.on('intent-analyzed', handler);
  }

  onCanvasActivationNeeded(handler: (data: any) => void): void {
    this.on('canvas-activation-needed', handler);
  }

  onSafetyViolation(handler: (data: any) => void): void {
    this.on('safety-violation', handler);
  }

  onRequestCompleted(handler: (data: any) => void): void {
    this.on('request-completed', handler);
  }

  onRequestFailed(handler: (data: any) => void): void {
    this.on('request-failed', handler);
  }

  onMemoryOperation(handler: (data: any) => void): void {
    this.on('memory-operation', handler);
  }
}

// Configuration service
export class ConfigService {
  private config: any = {};

  async load(): Promise<void> {
    // Load configuration from environment or config files
    this.config = {
      fireworksApiKey: import.meta.env.Neuraplay || import.meta.env.VITE_FIREWORKS_API_KEY || import.meta.env.VITE_API_KEY || 'dummy-key',
      maxTokens: 2000,
      temperature: 0.7,
      safetyEnabled: true,
      eventLogging: true
    };
    logger.info('Configuration loaded', 'ConfigService');
  }

  get(key: string, defaultValue?: any): any {
    return this.config[key] || defaultValue;
  }

  set(key: string, value: any): void {
    this.config[key] = value;
  }

  getAll(): any {
    return { ...this.config };
  }
}

// Service Container with Dependency Injection
export class ServiceContainer {
  private static instance: ServiceContainer;
  private services = new Map<string, any>();
  private initialized = false;

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure important dynamically imported chunks are preloaded so they are emitted during build
    preloadChunks();

    logger.info('Initializing services...', 'ServiceContainer');

    try {
      // Register services in dependency order
      await this.registerCoreServices();
      await this.registerAnalysisServices();
      await this.registerHandlerServices();
      await this.registerOrchestratorServices();

      this.initialized = true;
      logger.servicesSummary(this.getRegisteredServices());
    } catch (error) {
      logger.error('Critical initialization error:', 'ServiceContainer', error);
      // Set as initialized with fallback services to prevent blocking
      this.initialized = true;
      logger.warn('Running in fallback mode', 'ServiceContainer');
    }
  }

  isReady(): boolean {
    return this.initialized;
  }

  async waitForReady(): Promise<void> {
    if (this.initialized) return;
    
    // Wait for initialization with extended timeout for complex service initialization
    const timeout = 45000; // 45 seconds to handle complex service dependencies
    const startTime = Date.now();
    
    while (!this.initialized && (Date.now() - startTime) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!this.initialized) {
      logger.error('Failed to initialize within 45 seconds', 'ServiceContainer');
      logger.error('Available services:', 'ServiceContainer', Array.from(this.services.keys()));
      throw new Error('ServiceContainer initialization timeout - check service dependencies');
    }
  }

  private async registerCoreServices(): Promise<void> {
    // Level 0: Core infrastructure services
    this.services.set('eventBus', EventBus.getInstance());
    this.services.set('configService', new ConfigService());
    
    // Load configuration
    await this.get<ConfigService>('configService').load();

    // Register APIService - centralized API handling (singleton pattern)
    try {
      const { APIService } = await import('./APIService');
      const apiService = APIService.getInstance(); // Use explicit getInstance for proper initialization
      this.services.set('apiService', apiService);
      logger.debug('APIService registered', 'ServiceContainer');

      // Register State-of-the-Art NPU Services (with circular dependency fixes)
      const { languageService } = await import('./LanguageService');
      const { npuDatabaseIntegration } = await import('./NPUDatabaseIntegration');
      const { vectorSearchService } = await import('./VectorSearchService');
      const { locationService } = await import('./LocationService');
      
      this.services.set('languageService', languageService);
      this.services.set('npuDatabaseIntegration', npuDatabaseIntegration);
      this.services.set('vectorSearchService', vectorSearchService);
      this.services.set('locationService', locationService);
      
      // Register Vision Service for multimodal AI capabilities
      const { visionService } = await import('./VisionService');
      this.services.set('visionService', visionService);
      
      // Register VoiceManager after ServiceContainer is fully initialized to avoid circular deps
      try {
        const { VoiceManager } = await import('./VoiceManager');
        this.services.set('voiceManager', VoiceManager.getInstance()); // Use singleton pattern
        logger.debug('VoiceManager registered', 'ServiceContainer');
      } catch (voiceError) {
        logger.warn('VoiceManager registration failed, using fallback', 'ServiceContainer', voiceError);
        this.services.set('voiceManager', { 
          processVoiceInput: async () => ({ transcription: '', processingTime: 0 })
        });
      }
      
      // Register DatabaseManager for cross-chat knowledge
      const { databaseManager } = await import('./DatabaseManager');
      this.services.set('databaseManager', databaseManager);
      logger.debug('NPU services registered', 'ServiceContainer');

      // Initialize vector search service with better error handling
      try {
        await vectorSearchService.initialize();
        logger.debug('Vector search service initialized', 'ServiceContainer');
      } catch (error) {
        logger.warn('Vector search initialization failed, continuing without vector search', 'ServiceContainer', (error as Error).message);
        // Don't fail the entire initialization for vector search issues
      }

      // Note: HNSW services are backend-only and initialized separately in server.cjs
      logger.info('Frontend ServiceContainer initialized - HNSW acceleration available via backend APIs', 'ServiceContainer');

      // Register Intelligent Search Services
      const { intelligentSearchService } = await import('./IntelligentSearchService');
      const { searchOrchestrator } = await import('./agents/SearchOrchestrator');
      const { getIntelligentSearchDetector } = await import('./IntelligentSearchDetector');
      
      this.services.set('intelligentSearchService', intelligentSearchService);
      this.services.set('searchOrchestrator', searchOrchestrator);
      this.services.set('intelligentSearchDetector', getIntelligentSearchDetector());
      logger.debug('Intelligent Search Services registered', 'ServiceContainer');

      // Register Content Analysis Services
      const { contentAnalyzer } = await import('./agents/ContentAnalyzer');
      const { contentRenderer } = await import('./ContentRenderer'); // Import instance directly
      const { rendererOrchestrator } = await import('./RendererOrchestrator');
      
      this.services.set('contentAnalyzer', contentAnalyzer);
      this.services.set('contentRenderer', contentRenderer); // Use instance directly
      this.services.set('rendererOrchestrator', rendererOrchestrator);
      logger.debug('Content Analysis and Rendering Services registered', 'ServiceContainer');
    } catch (error) {
      logger.error('APIService and related services registration failed', 'ServiceContainer', error);
    }

    // Integrate existing services - use try-catch to isolate issues
    try {
      this.services.set('toolRegistry', toolRegistry);
      logger.debug('ToolRegistry registered', 'ServiceContainer');
      
      // CRITICAL: Register core tools!
      const { registerCoreTools } = await import('./CoreTools');
      registerCoreTools();
      logger.debug('Core tools registered', 'ServiceContainer');
      
      // Register modular canvas tools (proper architecture)
      const { registerCanvasTools, verifyCanvasTools } = await import('./tools/ToolRegistration');
      registerCanvasTools();
      await verifyCanvasTools();
      logger.debug('Canvas tools registered and verified', 'ServiceContainer');
    } catch (error) {
      logger.error('ToolRegistry registration failed', 'ServiceContainer', error);
    }
    
    try {
      this.services.set('contextManager', new ContextManager());
      logger.debug('ContextManager registered', 'ServiceContainer');
      
      // Register UserIdService for consistent user identification
      try {
        const { userIdService } = await import('./UserIdService');
        this.services.set('userIdService', userIdService);
        logger.debug('UserIdService registered', 'ServiceContainer');
      } catch (userIdError) {
        logger.error('UserIdService registration failed', 'ServiceContainer', userIdError);
      }
      
      // Register ChatMemoryService for user memory with enhanced error handling
      try {
        const { chatMemoryService } = await import('./ChatMemoryService');
        this.services.set('chatMemoryService', chatMemoryService);
        logger.debug('ChatMemoryService registered', 'ServiceContainer');
      } catch (chatMemError) {
        logger.error('ChatMemoryService registration failed, creating fallback', 'ServiceContainer', chatMemError);
        // Create comprehensive fallback service with ALL required methods
        this.services.set('chatMemoryService', {
          initializeForUser: async () => {},
          getCrossChatContext: async () => ({}),
          saveCurrentChat: async () => {},
          loadUserContext: async () => ({}),
          updateChat: async () => {},
          getAllChats: async () => ([]),
          addMessage: async () => {}, // MISSING: Used by UnifiedSessionManager
          getChat: () => undefined, // MISSING: Used by ChatHandler and UnifiedSessionManager  
          searchAcrossChats: () => [], // MISSING: Used by useMessageRendering
          createNewChat: async () => ({ id: 'fallback', title: 'Fallback', messages: [], context: {} })
        });
        logger.debug('ChatMemoryService COMPREHENSIVE fallback registered', 'ServiceContainer');
      }
      
      // Register ConversationMemoryService separately to avoid cascading failures
      try {
        const { conversationMemoryService } = await import('./ConversationMemoryService');
        this.services.set('conversationMemoryService', conversationMemoryService);
        logger.debug('ConversationMemoryService registered', 'ServiceContainer');
      } catch (convMemError) {
        logger.error('ConversationMemoryService registration failed', 'ServiceContainer', convMemError);
      }

      // Register advanced session and context managers
      try {
        const { unifiedSessionManager } = await import('../utils/Unifiedsessionmanager');
        const { tokenAwareContextManager } = await import('../utils/tokencontextmanager');
        
        this.services.set('unifiedSessionManager', unifiedSessionManager);
        this.services.set('tokenAwareContextManager', tokenAwareContextManager);
        logger.debug('Session managers registered', 'ServiceContainer');
        
        // Register NEW unified management services
        try {
          const { unifiedMemoryManager } = await import('./UnifiedMemoryManager');
          const { unifiedPreferenceManager } = await import('./UnifiedPreferenceManager');
          const { unifiedStateManager } = await import('./UnifiedStateManager');
          
          this.services.set('unifiedMemoryManager', unifiedMemoryManager);
          this.services.set('unifiedPreferenceManager', unifiedPreferenceManager);
          this.services.set('unifiedStateManager', unifiedStateManager);
          
          // Initialize the unified systems
          await unifiedMemoryManager.initialize();
          await unifiedPreferenceManager.initialize();
          await unifiedStateManager.initialize();
          
          logger.debug('Unified management services registered and initialized', 'ServiceContainer');
        } catch (unifiedError) {
          logger.error('Unified services registration failed', 'ServiceContainer', unifiedError);
          // Create fallback implementations
          this.services.set('unifiedMemoryManager', {
            initialize: async () => {},
            searchMemories: async () => ({ success: false, memories: [], count: 0, sources: [], sessionId: '', message: 'Service unavailable' }),
            storeMemory: async () => ({ success: false, memories: [], count: 0, sources: [], sessionId: '', message: 'Service unavailable' }),
            healthCheck: async () => ({ status: 'critical', systems: {}, message: 'Service unavailable' })
          });
          this.services.set('unifiedPreferenceManager', {
            initialize: async () => {},
            getUserPreferences: async () => [],
            updateUserPreference: async () => false,
            healthCheck: async () => ({ status: 'critical', systems: {}, message: 'Service unavailable' })
          });
          this.services.set('unifiedStateManager', {
            initialize: async () => {},
            getUnifiedState: async () => ({ id: '', userId: '', sessionId: '', timestamp: '', state: {} }),
            updateState: async () => false,
            healthCheck: async () => ({ status: 'critical', systems: {}, message: 'Service unavailable' })
          });
          logger.debug('Unified services fallback registered', 'ServiceContainer');
        }
      } catch (sessionManagerError) {
        logger.error('Session managers registration failed', 'ServiceContainer', sessionManagerError);
        // Create fallback implementations
        this.services.set('unifiedSessionManager', {
          getSessionContext: async (sessionId: string, userId?: string) => ({
            sessionId,
            userId: userId || 'anonymous',
            conversationHistory: [],
            contextData: {},
            tokenCount: 0,
            lastActivity: new Date()
          }),
          addMessage: async () => {},
          updateContext: async () => {},
          cleanup: () => {}
        });
        this.services.set('tokenAwareContextManager', {
          getOptimizedContext: async (_sessionId: string, _userId?: string, _newMessage?: string) => ({
            messages: [],
            systemPrompt: 'You are NeuraPlay AI.',
            totalTokens: 0,
            compressionApplied: false
          }),
          updateConfig: () => {}
        });
        logger.debug('Session managers fallback registered', 'ServiceContainer');
      }
    } catch (error) {
      logger.error('ContextManager/ChatMemoryService registration failed', 'ServiceContainer', error);
    }

    logger.debug('Core services registered', 'ServiceContainer');
  }

  private async registerAnalysisServices(): Promise<void> {
    try {
      // PHASE 1: Register the NEW clean cognitive services (replacement for monolith)
      await this.registerCognitiveServices();
      
      // 🚫 REMOVED: No longer register legacy IntentAnalysisService to prevent dual processing
      // PHASE 2: Register safety service only
      const { SafetyService } = await import('../ai/safety/SafetyService');
      this.services.set('safetyService', new SafetyService());
      
      // Legacy aliases redirect to UnifiedCognitiveAnalyzer
      const cognitiveAnalyzer = this.services.get('unifiedCognitiveAnalyzer');
      if (cognitiveAnalyzer) {
        // Create wrapper that converts new format to legacy format
        const legacyWrapper = {
          analyzeIntentHierarchy: async (message: string, context: any) => {
            console.warn('⚠️ Legacy intentAnalyzer called, redirecting to UnifiedCognitiveAnalyzer');
            const result = await cognitiveAnalyzer.analyzeMessage({
              message,
              sessionContext: context
            });
            return {
              primaryIntent: result.intent.primaryIntent,
              processingMode: result.processingMode.mode,
              confidence: result.confidence,
              shouldExecute: result.intent.shouldExecute,
              toolRequests: result.toolRequests,
              canvasActivation: result.canvasActivation,
              confusionDetection: result.confusion,
              socraticQuestions: result.socraticAnalysis?.questions || [],
              layer2_intent: result.intent,
              layer4_confusion: result.confusion
            };
          }
        };
        
        this.services.set('intentAnalyzer', legacyWrapper); // Backward compatibility alias
        this.services.set('intentAnalysisService', legacyWrapper); // Canvas compatibility alias
        this.services.set('IntentAnalysisService', legacyWrapper); // Direct class reference alias
      }

      logger.debug('Analysis services registered', 'ServiceContainer');
    } catch (error) {
      logger.error('Failed to load analysis services', 'ServiceContainer', error);
      // Fallback to stub services
      this.services.set('intentAnalyzer', {
        analyzeIntentHierarchy: async () => ({
          primaryIntent: 'conversational',
          confidence: 0.8,
          processingMode: 'chat',
          shouldExecute: true,
          reasoning: 'Fallback analysis'
        })
      });
      this.services.set('safetyService', {
        validateInput: async () => ({ isSafe: true }),
        validateOutput: async () => ({ isSafe: true }),
        handleSafetyViolation: async (request: any) => ({
          success: false,
          response: 'Safety check failed',
          metadata: { sessionId: request.sessionId, executionTime: 0, toolsExecuted: 0, mode: 'safety' }
        })
      });
    }

    // Keep simple prompt service for now (can be enhanced later)
    this.services.set('promptService', {
      buildPrompt: (message: string, _context: any) => message
    });
  }

  private async registerCognitiveServices(): Promise<void> {
    try {
      logger.debug('Registering NEW cognitive services...', 'ServiceContainer');
      
      // Import the new focused services
      const { confusionDetectionService } = await import('./ConfusionDetectionService');
      const { socraticAnalysisService } = await import('./SocraticAnalysisService');
      const { processingModeService } = await import('./ProcessingModeService');
      const { canvasActivationService } = await import('./CanvasActivationService');
      const { unifiedCognitiveAnalyzer } = await import('./UnifiedCognitiveAnalyzer');
      
      // Register all the new cognitive services
      this.services.set('confusionDetectionService', confusionDetectionService);
      this.services.set('socraticAnalysisService', socraticAnalysisService);
      this.services.set('processingModeService', processingModeService);
      this.services.set('canvasActivationService', canvasActivationService);
      this.services.set('unifiedCognitiveAnalyzer', unifiedCognitiveAnalyzer);
      
      // NEW: Primary alias for the clean unified analyzer
      this.services.set('cognitiveAnalyzer', unifiedCognitiveAnalyzer);
      
      logger.info('✅ NEW cognitive services registered successfully', 'ServiceContainer', {
        services: [
          'confusionDetectionService',
          'socraticAnalysisService', 
          'processingModeService',
          'canvasActivationService',
          'unifiedCognitiveAnalyzer (primary)',
          'cognitiveAnalyzer (alias)'
        ]
      });
    } catch (error) {
      logger.error('Failed to register cognitive services', 'ServiceContainer', error);
      // Create minimal fallback services
      this.services.set('confusionDetectionService', {
        detectConfusion: async () => ({
          hasConfusionMarkers: false,
          confusionLevel: 0,
          knowledgeGaps: [],
          enableSocraticMode: false,
          emotionalState: 'neutral',
          domainContext: 'conversational',
          cognitiveInsights: []
        })
      });
      this.services.set('processingModeService', {
        selectProcessingMode: () => ({
          mode: 'chat',
          reasoning: 'Fallback mode',
          confidence: 0.5
        })
      });
      this.services.set('unifiedCognitiveAnalyzer', {
        analyzeMessage: async (_request: any) => ({
          intent: {
            primaryDomain: 'conversational',
            primaryIntent: 'conversational',
            confidence: 0.5,
            reasoning: 'Fallback analysis'
          },
          processingMode: { mode: 'chat', reasoning: 'Fallback', confidence: 0.5 },
          analysisTime: 0,
          confidence: 0.5,
          reasoning: 'Fallback cognitive analysis'
        })
      });
      logger.warn('Cognitive services fallback registered', 'ServiceContainer');
    }
  }

  private async registerHandlerServices(): Promise<void> {
    try {
      // Import and register the REAL handlers
      const { ChatHandler } = await import('../ai/handlers/ChatHandler');
      const { ToolCallingHandler } = await import('../ai/handlers/ToolCallingHandler');
      const { AgentHandler } = await import('../ai/handlers/AgentHandler');
      const { SocraticHandler } = await import('../ai/handlers/SocraticHandler');

      this.services.set('chatModeHandler', new ChatHandler());
      this.services.set('toolCallingModeHandler', new ToolCallingHandler());
      this.services.set('agentModeHandler', new AgentHandler());
      this.services.set('socraticModeHandler', new SocraticHandler());

      logger.debug('Handler services registered', 'ServiceContainer');
    } catch (error) {
      logger.error('Failed to load handler services', 'ServiceContainer', error);
      // Fallback to stub handlers
      const fallbackHandler = {
        handle: async (request: any, _intent: any) => ({
          success: true,
          response: "AI processing temporarily using fallback mode.",
          metadata: {
            sessionId: request.sessionId,
            executionTime: 0,
            toolsExecuted: 0,
            mode: _intent?.processingMode || 'fallback'
          }
        })
      };

      this.services.set('chatModeHandler', fallbackHandler);
      this.services.set('toolCallingModeHandler', fallbackHandler);
      this.services.set('agentModeHandler', fallbackHandler);
      this.services.set('socraticModeHandler', fallbackHandler);
    }

    // Keep a simple stub for creative writing until we create that handler
    this.services.set('creativeWritingModeHandler', {
      handle: async (request: any, _intent: any) => ({
        success: true,
        response: "Creative writing mode coming soon!",
        metadata: {
          sessionId: request.sessionId,
          executionTime: 0,
          toolsExecuted: 0,
          mode: 'creative_writing'
        }
      })
    });
  }

  private async registerOrchestratorServices(): Promise<void> {
    try {
      // Import and register the REAL AIRouter with proper error handling
      logger.debug('Loading AIRouter...', 'ServiceContainer');
      const aiRouterModule = await import('../ai/AIRouter');
      
      let aiRouter;
      if (aiRouterModule.aiRouter) {
        aiRouter = aiRouterModule.aiRouter;
      } else if (aiRouterModule.AIRouter) {
        aiRouter = new aiRouterModule.AIRouter();
      } else if ('default' in aiRouterModule && aiRouterModule.default) {
        aiRouter = aiRouterModule.default;
      } else {
        throw new Error('AIRouter not found in module exports');
      }
      
      // Initialize the router
      if (aiRouter && typeof aiRouter === 'object' && 'initialize' in aiRouter && typeof aiRouter.initialize === 'function') {
        await aiRouter.initialize();
      }
      
      this.services.set('aiRouter', aiRouter);
      logger.info('AIRouter registered and initialized', 'ServiceContainer');
    } catch (error) {
      logger.error('Failed to load AIRouter', 'ServiceContainer', error);
      logger.warn('Creating enhanced fallback AIRouter', 'ServiceContainer');
      
      // Enhanced fallback router that uses the backend API directly
      const fallbackRouter = {
        async processRequest(request: any) {
          logger.debug('Using enhanced fallback AIRouter', 'ServiceContainer', { message: request.message });
          
          try {
            // Use the backend API directly as fallback
            const response = await fetch('/api', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                task_type: 'chat',
                input_data: {
                  messages: [{ role: 'user', content: request.message }],
                  max_tokens: request.constraints?.maxTokens || 800,
                  temperature: request.constraints?.temperature || 0.7
                }
              })
            });
            
            if (!response.ok) {
              throw new Error(`API call failed: ${response.status}`);
            }
            
            const result = await response.json();
            const firstResponse = Array.isArray(result) ? result[0] : result;
            const responseText = firstResponse.generated_text || firstResponse.content || firstResponse.message || 'I apologize, but I\'m having trouble processing your request right now.';
            
            return {
              success: true,
              response: responseText,
              toolResults: firstResponse.tool_results || [],
              metadata: {
                sessionId: request.sessionId || 'fallback',
                executionTime: 0,
                toolsExecuted: (firstResponse.tool_results || []).length,
                mode: 'fallback'
              }
            };
          } catch (apiError) {
            logger.error('Fallback API call failed', 'ServiceContainer', apiError);
            return {
              success: false,
              response: "I'm temporarily experiencing technical difficulties. Please try again in a moment.",
              metadata: {
                sessionId: request.sessionId || 'fallback',
                executionTime: 0,
                toolsExecuted: 0,
                mode: 'fallback-error'
              },
              error: apiError instanceof Error ? apiError.message : 'Unknown error'
            };
          }
        },
        initialize: async () => {
          logger.debug('Fallback AIRouter initialized', 'ServiceContainer');
        },
        closeSession: async () => {},
        getStats: () => ({ status: 'fallback', initialized: true })
      };
      
      this.services.set('aiRouter', fallbackRouter);
      logger.info('Enhanced fallback AIRouter registered', 'ServiceContainer');
    }
  }

  get<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      logger.error(`Service not found: ${serviceName}`, 'ServiceContainer', { availableServices: this.getRegisteredServices() });
      throw new Error(`Service not found: ${serviceName}`);
    }
    return service;
  }

  async getAsync<T>(serviceName: string): Promise<T> {
    // Wait for initialization if needed
    await this.waitForReady();
    return this.get<T>(serviceName);
  }

  has(serviceName: string): boolean {
    return this.services.has(serviceName);
  }

  // For debugging and monitoring
  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  getServiceStats(): any {
    return {
      totalServices: this.services.size,
      initialized: this.initialized,
      services: this.getRegisteredServices()
    };
  }
}

// Global service container instance - with error protection
let serviceContainer: ServiceContainer;
try {
  serviceContainer = ServiceContainer.getInstance();
  // Initialize asynchronously without blocking
  serviceContainer.initialize().catch(error => {
    logger.error('ServiceContainer async initialization failed', 'ServiceContainer', error);
  });
} catch (error) {
  logger.error('ServiceContainer creation failed', 'ServiceContainer', error);
  // Create a minimal fallback container
  serviceContainer = {
    get: (serviceName: string) => {
      logger.warn(`ServiceContainer fallback: Requested ${serviceName}`, 'ServiceContainer');
      if (serviceName === 'aiRouter') {
        return {
          processRequest: async (request: any) => ({
            success: true,
            response: "AI system is temporarily unavailable. Please refresh the page.",
            metadata: { sessionId: request.sessionId || 'emergency', executionTime: 0, toolsExecuted: 0, mode: 'emergency' }
          })
        };
      }
      return {};
    },
    has: () => false,
    initialize: async () => {},
    getRegisteredServices: () => [],
    getServiceStats: () => ({ status: 'emergency_fallback' })
  } as any;
}

// Ensure dynamic chunks reuse the same singleton across the whole tab
try {
  const g = window as any;
  if (!g.__NP_SERVICE_CONTAINER__) {
    g.__NP_SERVICE_CONTAINER__ = serviceContainer;
  } else {
    // Reuse existing one to prevent double initialisation
    serviceContainer = g.__NP_SERVICE_CONTAINER__;
  }
} catch { /* SSR / Node */ }

export { serviceContainer };


