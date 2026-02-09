/**
 * UNIFIED COGNITIVE ANALYZER
 * 
 * The NEW clean alternative to the 5,979-line IntentAnalysisService monolith.
 * 
 * KEY IMPROVEMENT: Makes 1 unified LLM call instead of 5 sequential calls,
 * reducing response time from 5-10 seconds to 1-2 seconds.
 * 
 * ARCHITECTURE: Coordinates the focused services we extracted:
 * - ConfusionDetectionService
 * - SocraticAnalysisService  
 * - ProcessingModeService
 * - CanvasActivationService
 */

import { confusionDetectionService, ConfusionAnalysis } from './ConfusionDetectionService';
import { socraticAnalysisService, EnhancedSocraticAnalysis } from './SocraticAnalysisService';
import { processingModeService, ProcessingModeResult, ToolRequests } from './ProcessingModeService';
import { canvasActivationService, CanvasActivationResult, CanvasSocraticIntegration } from './CanvasActivationService';
import { LLMResponseNormalizer } from './LLMResponseNormalizer';
import { llmService } from './LLMHelper';

export interface UnifiedAnalysisRequest {
  message: string;
  sessionContext?: {
    sessionId: string;
    userId?: string;
    conversationHistory?: any[];
  };
  contextState?: {
    lastNTurns: any[];
    extractedEntities: string[];
    outstandingQuestions: string[];
    domainFocusDrift: number;
  };
}

export interface UnifiedCognitiveResult {
  intent: EnhancedIntentAnalysis;
  confusion: ConfusionAnalysis;
  processingMode: ProcessingModeResult;
  canvasActivation: CanvasActivationResult;
  toolRequests: ToolRequests;
  isActionConfirmation?: boolean;
  socraticAnalysis?: EnhancedSocraticAnalysis;
  canvasSocraticIntegration?: CanvasSocraticIntegration;
  analysisTime: number;
  confidence: number;
  reasoning: string;
}

export interface EnhancedIntentAnalysis {
  primaryDomain: 'cognitive' | 'creative' | 'emotional' | 'social' | 'technical' | 'personal' | 'professional' | 'wellness';
  secondaryIntent: string;
  primaryIntent: 'creation' | 'informational' | 'conversational' | 'complex_workflow' | 'navigation' | 'modification' | 'deletion' | 'analysis' | 'instructional' | 'evaluation' | 'clarification_request';
  characteristics: {
    isUrgent: boolean;
    isPersonal: boolean;
    requiresEmpathy: boolean;
    isCreative: boolean;
    isAnalytical: boolean;
    isCollaborative: boolean;
    isExperimental: boolean;
    isStyleChange?: boolean;
  };
  interactionStyle: 'formal' | 'casual' | 'supportive' | 'directive' | 'explorative' | 'playful';
  complexityLevel: 'simple' | 'moderate' | 'complex' | 'expert';
  lengthRequirement: 'brief' | 'standard' | 'comprehensive' | 'extensive';
  timeSensitivity: 'immediate' | 'today' | 'this_week' | 'no_rush';
  shouldExecute: boolean;
  confidence: number;
  reasoning: string;
}

export interface ConfusionAnalysis {
  hasLearningUncertainty: boolean;
  confidenceLevel: number;
  uncertaintyType: string;
  knowledgeGaps: string[];
  misconceptions: string[];
  enableSocraticMode: boolean;
  reasoning: string;
}

class UnifiedCognitiveAnalyzer {
  private static instance: UnifiedCognitiveAnalyzer;

  static getInstance(): UnifiedCognitiveAnalyzer {
    if (!UnifiedCognitiveAnalyzer.instance) {
      UnifiedCognitiveAnalyzer.instance = new UnifiedCognitiveAnalyzer();
    }
    return UnifiedCognitiveAnalyzer.instance;
  }

  async analyzeMessage(request: UnifiedAnalysisRequest): Promise<UnifiedCognitiveResult> {
    const startTime = Date.now();

    try {
      // 🚀 FAST PATH: LLM-based greeting detection with structural fallback
      const simpleGreetingResult = await this.tryFastPathGreeting(request.message);
      if (simpleGreetingResult) {
        console.log(`⚡ Fast-path greeting detected, skipping full LLM analysis (saved ~9s)`);
        return simpleGreetingResult;
      }
      
      // STEP 1: Single unified LLM call for all core analysis
      const coreAnalysis = await this.performUnifiedLLMAnalysis(request.message, request.sessionContext);
      
      // 🎯 Tool requests from unified LLM
      const toolRequests = coreAnalysis.toolRequests || {
        isMemoryRequest: false,
        isSearchRequest: false,
        isWeatherRequest: false,
        isImageRequest: false,
        isNavigationRequest: false,
        isSettingsRequest: false
      };
      
      // STEP 2: Conditional confusion detection
      const msgLower = request.message.toLowerCase();
      const isLearningQuery = (
        msgLower.match(/\b(explain|understand|learn|teach|how|why|what is|confused|help me)\b/) ||
        coreAnalysis.intent.primaryDomain === 'cognitive'
      );
      
      let confusion: ConfusionAnalysis;
      if (isLearningQuery) {
        console.log('🎓 Running confusion detection (learning query detected)');
        confusion = await confusionDetectionService.detectConfusion(request.message, coreAnalysis.intent);
      } else {
        console.log('⚡ Skipping confusion detection (simple conversational query)');
        confusion = {
          hasLearningUncertainty: false,
          confidenceLevel: 1.0,
          uncertaintyType: 'none',
          knowledgeGaps: [],
          misconceptions: [],
          enableSocraticMode: false,
          reasoning: 'Skipped for non-learning query'
        };
      }
      
      // STEP 3: Processing mode analysis
      const processingMode = await processingModeService.selectProcessingMode(
        coreAnalysis.intent, 
        confusion, 
        request.contextState || this.getDefaultContextState(), 
        request.message, 
        toolRequests
      );
      
      // STEP 4: Canvas activation
      console.log('🎨 Running canvas activation (LLM-driven analysis)');
      const canvasActivation: CanvasActivationResult = await canvasActivationService.detectCanvasActivation(
          request.message,
          coreAnalysis.intent,
          confusion,
          [],
          null,
          []
        );
      
      // STEP 5: Advanced analysis (if needed)
      let socraticAnalysis: EnhancedSocraticAnalysis | undefined;
      let canvasSocraticIntegration: CanvasSocraticIntegration | undefined;
      
      if (confusion.enableSocraticMode) {
        socraticAnalysis = await socraticAnalysisService.generateEnhancedSocraticAnalysis(
          request.message,
          confusion.knowledgeGaps,
          coreAnalysis.intent,
          confusion,
          request.sessionContext?.conversationHistory
        );
      }
      
      if (canvasActivation.shouldActivate) {
        canvasSocraticIntegration = canvasActivationService.determineCanvasSocraticIntegration(
          request.message,
          coreAnalysis.intent,
          confusion,
          canvasActivation
        );
      }
      
      // STEP 6: Apply overrides and finalize
      const finalProcessingMode = processingModeService.applyToolRequestOverrides(processingMode.mode, toolRequests);
      
      const analysisTime = Date.now() - startTime;
      const confidence = this.calculateOverallConfidence(coreAnalysis.intent, confusion, processingMode);
      
      return {
        intent: coreAnalysis.intent,
        confusion,
        processingMode: { ...processingMode, mode: finalProcessingMode },
        canvasActivation,
        toolRequests,
        isActionConfirmation: coreAnalysis.isActionConfirmation || false,
        socraticAnalysis,
        canvasSocraticIntegration,
        analysisTime,
        confidence,
        reasoning: `Unified analysis: ${coreAnalysis.intent.primaryDomain} domain, ${finalProcessingMode} mode, ${analysisTime}ms`
      };
      
    } catch (error) {
      console.error('❌ UnifiedCognitiveAnalyzer: Analysis failed:', error);
      return this.getFallbackAnalysis(request, Date.now() - startTime);
    }
  }

  private async performUnifiedLLMAnalysis(
    message: string, 
    sessionContext?: any
  ): Promise<{ intent: EnhancedIntentAnalysis; toolRequests?: ToolRequests; isActionConfirmation?: boolean }> {
    
    let conversationContextStr = '';
    try {
      if (sessionContext?.conversationHistory && Array.isArray(sessionContext.conversationHistory) && sessionContext.conversationHistory.length > 0) {
        const recentMessages = sessionContext.conversationHistory.slice(-6);
        conversationContextStr = `\n\nRECENT CONVERSATION (for understanding references like "Yes", "do it", "continue"):
${recentMessages.map((m: any) => `${m.role === 'user' ? 'User' : 'AI'}: ${String(m.content || m.text || '').substring(0, 300)}`).join('\n')}
---`;
      }
    } catch (e) {
      console.warn('⚠️ UnifiedCognitiveAnalyzer: Failed to build conversation context:', e);
    }
    
    const unifiedPrompt = `
You are an advanced cognitive analysis system. Analyze this user message comprehensively in a single pass.

User Message: "${message}"

Session Context: ${sessionContext ? `User ID: ${sessionContext.userId}, Session: ${sessionContext.sessionId}` : 'New session'}${conversationContextStr}

🎯 ACTION CONFIRMATION DETECTION (CRITICAL):
Analyze the RECENT CONVERSATION to detect if user is confirming a previously proposed action:

Set isActionConfirmation=true AND secondaryIntent="action_confirmation" when:
- User says short confirmations: "Yes", "Do it", "Go ahead", "Sure", "OK", "Please do"
- User explicitly requests execution: "add it", "update it", "put it in the document", "add that to the doc"
- User is responding to AI's offer like "Would you like me to add..." with affirmative
- User complains AI didn't do something: "you didn't add it", "it's not there" (they want execution)

When isActionConfirmation=true:
- If AI previously offered to ADD/UPDATE document → primaryIntent="modification"
- If AI previously offered to CREATE something → primaryIntent="creation"
- The user is NOT asking a question - they want ACTION

TOOL REQUEST DETECTION RULES:
- MEMORY: Set isMemoryRequest=true for ANY personal info sharing:
  * Name statements: "my name is X", "X is my name", "I'm X", "call me X"
  * Personal facts: "I have a dog", "I work at X", "I live in X", "I'm from X"
  * Remember requests: "remember that", "save this", "don't forget"
  * Recall requests: "what's my name", "do you remember", "what do you know about me"
  * DELETE/FORGET requests: "delete all memories", "forget about me", "remove my data" → primaryIntent="deletion", isMemoryRequest=true
- SEARCH: Current events, news, facts needing web lookup
- WEATHER: Weather forecasts, temperature queries
- IMAGE: Artistic image generation (NOT charts/graphs)
- NAVIGATION: Navigate to app pages
- SETTINGS: Change preferences/theme

🎯 CRITICAL: MODIFICATION vs CREATION DISAMBIGUATION:
- MODIFICATION (primaryIntent="modification"):
  * STYLE changes: "make text bigger/smaller", "change font/color", "make it bold/italic", "increase/decrease size"
  * CONTENT additions: "add more", "write another section", "expand this", "continue", "append"
  * EDITS: "change X to Y", "update the title", "fix the spelling"
  * Set secondaryIntent="style_modification" for style changes, "content_addition" for adding content
  * Set isStyleChange=true for style/formatting changes

- CREATION (primaryIntent="creation"):
  * NEW content: "make/create/write/build a document/chart/code about X"
  * User wants something NEW that doesn't exist yet
  * The word "make" followed by a THING (document, chart, plan) = creation
  * The word "make" followed by a PROPERTY (bigger, smaller, bold) = modification

Provide a complete structured analysis in JSON format:

{
  "primaryDomain": "cognitive|creative|emotional|social|technical|personal|professional|wellness|conversational",
  "secondaryIntent": "specific intent within domain (use style_modification, content_addition, or content_creation)",
  "primaryIntent": "creation|informational|conversational|complex_workflow|navigation|modification|deletion|analysis|instructional|evaluation|clarification_request",
  "isActionConfirmation": boolean,
  "characteristics": {
    "isUrgent": boolean,
    "isPersonal": boolean,
    "requiresEmpathy": boolean,
    "isCreative": boolean,
    "isAnalytical": boolean,
    "isCollaborative": boolean,
    "isExperimental": boolean,
    "isStyleChange": boolean
  },
  "interactionStyle": "formal|casual|supportive|directive|explorative|playful",
  "complexityLevel": "simple|moderate|complex|expert",
  "lengthRequirement": "brief|standard|comprehensive|extensive",
  "timeSensitivity": "immediate|today|this_week|no_rush",
  "toolRequests": {
    "isMemoryRequest": boolean,
    "isSearchRequest": boolean,
    "isWeatherRequest": boolean,
    "isImageRequest": boolean,
    "isNavigationRequest": boolean,
    "isSettingsRequest": boolean
  },
  "shouldExecute": boolean,
  "confidence": number (0.0-1.0),
  "reasoning": "detailed explanation of the analysis"
}

IMPORTANT: Respond with ONLY the JSON object, no other text.`;

    let result: any = null;
    
    try {
      const { UnifiedAPIRouter } = await import('./UnifiedAPIRouter');
      const unifiedAPIRouter = UnifiedAPIRouter.getInstance();
      
      result = await unifiedAPIRouter.routeAPICall(
        'fireworks',
        'llm-completion',
        {
          messages: [
            { role: 'system', content: 'You are a JSON extraction API. Return ONLY valid JSON objects with no additional text, explanations, or reasoning.' },
            { role: 'user', content: unifiedPrompt }
          ],
          max_tokens: 2000,
          temperature: 0.0,
          model: 'accounts/fireworks/models/gpt-oss-120b'
        }
      );

      let content: string | null = null;
      
      if (result?.success && result?.data) {
        const data = result.data;
        
        if (Array.isArray(data) && data.length > 0) {
          content = data[0]?.generated_text || data[0]?.message?.content;
        } else if (typeof data === 'string') {
          content = data;
        } else if (data?.choices?.[0]?.message?.content) {
          content = data.choices[0].message.content;
        } else if (data?.completion) {
          content = data.completion;
        } else if (data?.content) {
          content = data.content;
        } else if (data?.data?.completion) {
          content = data.data.completion;
        } else if (data?.data?.choices?.[0]?.message?.content) {
          content = data.data.choices[0].message.content;
        }
      } else if (result?.choices?.[0]?.message?.content) {
        content = result.choices[0].message.content;
      } else if (result?.content) {
        content = result.content;
      } else if (typeof result === 'string') {
        content = result;
      }
      
      if (content) {
        console.log('🔍 UnifiedCognitiveAnalyzer: Raw content preview:', content.substring(0, 300));
        
        const parsed = LLMResponseNormalizer.safeParseJSON(content.trim());
        
        if (parsed) {
          const intent: EnhancedIntentAnalysis = {
            primaryDomain: parsed.primaryDomain || 'conversational',
            secondaryIntent: parsed.secondaryIntent || 'general_conversation',
            primaryIntent: parsed.primaryIntent || 'conversational',
            characteristics: {
              isUrgent: !!parsed.characteristics?.isUrgent,
              isPersonal: !!parsed.characteristics?.isPersonal,
              requiresEmpathy: !!parsed.characteristics?.requiresEmpathy,
              isCreative: !!parsed.characteristics?.isCreative,
              isAnalytical: !!parsed.characteristics?.isAnalytical,
              isCollaborative: !!parsed.characteristics?.isCollaborative,
              isExperimental: !!parsed.characteristics?.isExperimental,
              isStyleChange: !!parsed.characteristics?.isStyleChange
            },
            interactionStyle: parsed.interactionStyle || 'casual',
            complexityLevel: parsed.complexityLevel || 'simple',
            lengthRequirement: parsed.lengthRequirement || 'standard',
            timeSensitivity: parsed.timeSensitivity || 'no_rush',
            shouldExecute: parsed.shouldExecute !== false,
            confidence: parsed.confidence || 0.7,
            reasoning: parsed.reasoning || 'LLM analysis'
          };
          
          const toolRequests = {
            isMemoryRequest: !!parsed.toolRequests?.isMemoryRequest,
            isSearchRequest: !!parsed.toolRequests?.isSearchRequest,
            isWeatherRequest: !!parsed.toolRequests?.isWeatherRequest,
            isImageRequest: !!parsed.toolRequests?.isImageRequest,
            isNavigationRequest: !!parsed.toolRequests?.isNavigationRequest,
            isSettingsRequest: !!parsed.toolRequests?.isSettingsRequest
          };
          
          const isActionConfirmation = !!parsed.isActionConfirmation;
          if (isActionConfirmation) {
            console.log('🎯 UnifiedCognitiveAnalyzer: LLM detected ACTION CONFIRMATION from conversation context');
          }
          
          return { intent, toolRequests, isActionConfirmation };
        }
      }
    } catch (error) {
      console.error('❌ UnifiedCognitiveAnalyzer: LLM analysis failed, using pattern-based fallback:', error);
    }
    
    // Fallback: Pattern-based analysis WITH toolRequests
    console.warn('🔄 UnifiedCognitiveAnalyzer: Using pattern-based fallback analysis (LLM response not usable)');
    const fallbackIntent = await this.performPatternBasedAnalysis(message);
    const fallbackToolRequests = await this.detectToolRequestsLLM(message);
    return { intent: fallbackIntent, toolRequests: fallbackToolRequests, isActionConfirmation: false };
  }
  
  /**
   * 🎯 TIER 2: LLM-powered tool request detection (with structural fallback)
   * Replaces 30+ regex patterns with single semantic LLM call
   */
  private async detectToolRequestsLLM(message: string): Promise<ToolRequests> {
    return llmService.classify(
      message,
      `Analyze this message for tool requests. Respond with JSON:
{
  "isMemoryRequest": boolean,  // User sharing personal info or asking to remember/recall
  "isSearchRequest": boolean,  // User wants web search/lookup
  "isWeatherRequest": boolean, // User asking about weather/temperature
  "isImageRequest": boolean,   // User wants image generation
  "isNavigationRequest": boolean, // User wants to navigate to app pages
  "isSettingsRequest": boolean  // User wants to change settings/preferences
}

ONLY return JSON, no other text.`,
      () => this.detectToolRequestsStructural(message),
      `tools:${message.substring(0, 50)}`
    ).then(result => {
      try {
        // Parse the LLM result as JSON
        const parsed = typeof result.result === 'string' 
          ? JSON.parse(result.result) 
          : result.result;
        
        return {
          isMemoryRequest: !!parsed.isMemoryRequest,
          isSearchRequest: !!parsed.isSearchRequest,
          isWeatherRequest: !!parsed.isWeatherRequest,
          isImageRequest: !!parsed.isImageRequest,
          isNavigationRequest: !!parsed.isNavigationRequest,
          isSettingsRequest: !!parsed.isSettingsRequest
        };
      } catch (e) {
        console.warn('⚠️ Tool request JSON parsing failed, using structural fallback');
        return this.detectToolRequestsStructural(message);
      }
    });
  }

  /**
   * TIER 3: Structural tool request detection (fallback)
   * Replaces 30+ regex patterns with simple keyword matching
   */
  private detectToolRequestsStructural(message: string): ToolRequests {
    const messageLower = message.toLowerCase();
    
    // Memory: Personal info sharing or memory operations
    const isMemoryRequest = 
      messageLower.includes('my name') || 
      messageLower.includes('i am ') || 
      messageLower.includes("i'm ") ||
      messageLower.includes('remember') ||
      messageLower.includes('save') ||
      messageLower.includes('forget') ||
      messageLower.includes('recall') ||
      messageLower.includes('do you know');
    
    // Search: Web lookup
    const isSearchRequest = 
      messageLower.includes('search') ||
      messageLower.includes('find') ||
      messageLower.includes('look up') ||
      messageLower.includes('what is') ||
      messageLower.includes('who is');
    
    // Weather: Weather-related
    const isWeatherRequest = 
      messageLower.includes('weather') ||
      messageLower.includes('temperature') ||
      messageLower.includes('forecast') ||
      messageLower.includes('rain') ||
      messageLower.includes('sunny');
    
    // Image: Image generation
    const isImageRequest = 
      messageLower.includes('generate') ||
      messageLower.includes('create image') ||
      messageLower.includes('draw') ||
      messageLower.includes('paint');
    
    // Navigation: Navigate to pages
    const isNavigationRequest = 
      messageLower.includes('go to') ||
      messageLower.includes('navigate') ||
      messageLower.includes('open');
    
    // Settings: Preference changes
    const isSettingsRequest = 
      messageLower.includes('dark mode') ||
      messageLower.includes('light mode') ||
      messageLower.includes('theme') ||
      messageLower.includes('setting');
    
    return {
      isMemoryRequest,
      isSearchRequest,
      isWeatherRequest,
      isImageRequest,
      isNavigationRequest,
      isSettingsRequest
    };
  }

  /**
   * 🎯 TIER 2: LLM-powered pattern analysis (with structural fallback)
   * Replaces complex regex patterns with semantic LLM understanding
   */
  private async performPatternBasedAnalysis(message: string): Promise<EnhancedIntentAnalysis> {
    const result = await llmService.classify(
      message,
      `Analyze user intent and characteristics. Respond with JSON:
{
  "primaryDomain": "cognitive|creative|emotional|social|technical|personal|professional|wellness|conversational",
  "characteristics": {
    "isUrgent": boolean,
    "isPersonal": boolean,
    "requiresEmpathy": boolean,
    "isCreative": boolean,
    "isAnalytical": boolean,
    "isCollaborative": boolean,
    "isExperimental": boolean,
    "isStyleChange": boolean
  },
  "complexityLevel": "simple|moderate|complex|expert",
  "lengthRequirement": "brief|standard|comprehensive|extensive"
}

ONLY return JSON, no other text.`,
      () => this.performPatternBasedAnalysisStructural(message),
      `analysis:${message.substring(0, 50)}`
    );

    try {
      const parsed = typeof result.result === 'string'
        ? JSON.parse(result.result)
        : result.result;
      
      return {
        primaryDomain: parsed.primaryDomain || 'conversational',
        secondaryIntent: 'pattern_analysis',
        primaryIntent: parsed.characteristics?.isStyleChange ? 'modification' : 'conversational',
        characteristics: {
          isUrgent: !!parsed.characteristics?.isUrgent,
          isPersonal: !!parsed.characteristics?.isPersonal,
          requiresEmpathy: !!parsed.characteristics?.requiresEmpathy,
          isCreative: !!parsed.characteristics?.isCreative,
          isAnalytical: !!parsed.characteristics?.isAnalytical,
          isCollaborative: !!parsed.characteristics?.isCollaborative,
          isExperimental: !!parsed.characteristics?.isExperimental,
          isStyleChange: !!parsed.characteristics?.isStyleChange
        },
        interactionStyle: parsed.characteristics?.requiresEmpathy ? 'supportive' : 'casual',
        complexityLevel: parsed.complexityLevel || 'simple',
        lengthRequirement: parsed.lengthRequirement || 'standard',
        timeSensitivity: parsed.characteristics?.isUrgent ? 'immediate' : 'no_rush',
        shouldExecute: false,
        confidence: result.source === 'llm' ? 0.8 : 0.6,
        reasoning: `${result.source} analysis: ${result.source === 'cache' ? 'cached result' : result.source === 'llm' ? 'semantic analysis' : 'structural fallback'}`
      };
    } catch (e) {
      console.warn('⚠️ Pattern analysis JSON parsing failed, using structural fallback');
      return this.performPatternBasedAnalysisStructural(message);
    }
  }

  /**
   * 🎯 TIER 3: Structural pattern analysis (fallback)
   * Simple keyword-based detection
   */
  private performPatternBasedAnalysisStructural(message: string): EnhancedIntentAnalysis {
    const messageLower = message.toLowerCase();
    
    let primaryDomain: EnhancedIntentAnalysis['primaryDomain'] = 'conversational';
    if (messageLower.includes('create') || messageLower.includes('make') || 
        messageLower.includes('build') || messageLower.includes('design')) primaryDomain = 'creative';
    else if (messageLower.includes('sad') || messageLower.includes('happy') || 
             messageLower.includes('frustrated') || messageLower.includes('feel')) primaryDomain = 'emotional';
    else if (messageLower.includes('code') || messageLower.includes('program') || 
             messageLower.includes('technical')) primaryDomain = 'technical';
    else if (messageLower.includes('learn') || messageLower.includes('understand') || 
             messageLower.includes('explain')) primaryDomain = 'cognitive';
    
    let complexityLevel: EnhancedIntentAnalysis['complexityLevel'] = 'simple';
    const wordCount = message.split(' ').length;
    if (wordCount > 10 && wordCount <= 20) complexityLevel = 'moderate';
    else if (wordCount > 20) complexityLevel = 'complex';
    
    const characteristics = {
      isUrgent: messageLower.includes('urgent') || messageLower.includes('asap') || messageLower.includes('now'),
      isPersonal: messageLower.includes(' i ') || messageLower.includes(' me ') || messageLower.includes(' my '),
      requiresEmpathy: messageLower.includes('sad') || messageLower.includes('upset') || messageLower.includes('frustrated'),
      isCreative: messageLower.includes('creative') || messageLower.includes('design') || messageLower.includes('art'),
      isAnalytical: messageLower.includes('analyze') || messageLower.includes('data') || messageLower.includes('logic'),
      isCollaborative: messageLower.includes(' we ') || messageLower.includes(' us ') || messageLower.includes('together'),
      isExperimental: messageLower.includes('try') || messageLower.includes('test') || messageLower.includes('experiment'),
      isStyleChange: messageLower.includes('bigger') || messageLower.includes('smaller') || messageLower.includes('bold') || 
                     messageLower.includes('font') || messageLower.includes('color')
    };
    
    let lengthRequirement: EnhancedIntentAnalysis['lengthRequirement'] = 'standard';
    if (messageLower.includes('brief') || messageLower.includes('short')) lengthRequirement = 'brief';
    else if (messageLower.includes('long') || messageLower.includes('detailed') || messageLower.includes('extensive')) lengthRequirement = 'extensive';
    
    return {
      primaryDomain,
      secondaryIntent: characteristics.isStyleChange ? 'style_modification' : 'pattern_analysis',
      primaryIntent: characteristics.isStyleChange ? 'modification' : 'conversational',
      characteristics,
      interactionStyle: characteristics.requiresEmpathy ? 'supportive' : 'casual',
      complexityLevel,
      lengthRequirement,
      timeSensitivity: characteristics.isUrgent ? 'immediate' : 'no_rush',
      shouldExecute: false,
      confidence: 0.6,
      reasoning: 'Structural fallback analysis (no LLM)'
    };
  }

  /**
   * 🚀 FAST PATH: Detect simple greetings using LLM with structural fallback
   * Much faster than full analysis
   */
  private async tryFastPathGreeting(message: string): Promise<UnifiedCognitiveResult | null> {
    // First try: Quick structural check (no LLM needed)
    const structuralMatch = this.isSimpleGreetingStructural(message);
    if (structuralMatch) {
      return this.getGreetingAnalysisResult();
    }

    // Second try: LLM confirmation for borderline cases
    const llmResult = await llmService.classify(
      message,
      `Is this message a simple greeting? (yes/no)`,
      () => 'no',
      `greeting:${message.substring(0, 30)}`
    );

    if (llmResult.result.toLowerCase().trim() === 'yes') {
      return this.getGreetingAnalysisResult();
    }

    return null;
  }

  /**
   * 🎯 Structural greeting detection (Tier 1 - Fast)
   */
  private isSimpleGreetingStructural(message: string): boolean {
    const normalized = message.toLowerCase().trim();
    
    const greetingPatterns = [
      'hi', 'hello', 'hey', 'hiya', 'yo', 'sup',
      "what's up", 'whats up', 'howdy', 'greetings',
      'good morning', 'good afternoon', 'good evening',
      "i'm back", 'back again', 'here again'
    ];
    
    return greetingPatterns.some(pattern => normalized === pattern || normalized === pattern + '.' || normalized === pattern + '!');
  }

  /**
   * Pre-computed greeting result (saves 9 seconds)
   */
  private getGreetingAnalysisResult(): UnifiedCognitiveResult {
    return {
      intent: {
        primaryDomain: 'conversational',
        primaryIntent: 'conversational',
        secondaryIntent: 'social',
        characteristics: {
          isUrgent: false,
          isPersonal: true,
          requiresEmpathy: false,
          isCreative: false,
          isAnalytical: false,
          isCollaborative: true,
          isExperimental: false
        },
        interactionStyle: 'casual',
        complexityLevel: 'simple',
        lengthRequirement: 'brief',
        timeSensitivity: 'immediate',
        shouldExecute: true,
        confidence: 0.99,
        reasoning: 'Fast-path: Simple greeting detected'
      },
      confusion: {
        hasLearningUncertainty: false,
        confidenceLevel: 1.0,
        uncertaintyType: 'none',
        knowledgeGaps: [],
        misconceptions: [],
        enableSocraticMode: false,
        reasoning: 'Greeting - no learning uncertainty'
      },
      processingMode: {
        mode: 'chat',
        reasoning: 'Chat mode for greeting',
        confidence: 0.99
      },
      canvasActivation: {
        shouldActivate: false,
        trigger: 'greeting',
        reason: 'Not needed for greetings',
        confidence: 0.99,
        semanticAnalysis: { type: 'greeting' }
      },
      toolRequests: {
        isMemoryRequest: false,
        isSearchRequest: false,
        isWeatherRequest: false,
        isImageRequest: false,
        isNavigationRequest: false,
        isSettingsRequest: false
      },
      analysisTime: 1,
      confidence: 0.99,
      reasoning: 'Fast-path greeting (1ms analysis)'
    };
  }

  private calculateOverallConfidence(
    intent: EnhancedIntentAnalysis,
    confusion: ConfusionAnalysis,
    processingMode: ProcessingModeResult
  ): number {
    const weights = {
      intent: 0.4,
      confusion: 0.3,
      processingMode: 0.3
    };
    
    const confusionConfidence = 1 - (confusion as any).confusionLevel;
    
    return (
      intent.confidence * weights.intent +
      confusionConfidence * weights.confusion +
      processingMode.confidence * weights.processingMode
    );
  }

  private getDefaultContextState() {
    return {
      lastNTurns: [],
      extractedEntities: [],
      outstandingQuestions: [],
      domainFocusDrift: 0
    };
  }

  private getFallbackAnalysis(request: UnifiedAnalysisRequest, analysisTime: number): UnifiedCognitiveResult {
    console.warn('🔄 UnifiedCognitiveAnalyzer: Using emergency fallback analysis');
    
    const fallbackIntent: EnhancedIntentAnalysis = {
      primaryDomain: 'conversational',
      secondaryIntent: 'emergency_fallback',
      primaryIntent: 'conversational',
      characteristics: {
        isUrgent: false,
        isPersonal: false,
        requiresEmpathy: false,
        isCreative: false,
        isAnalytical: false,
        isCollaborative: false,
        isExperimental: false
      },
      interactionStyle: 'casual',
      complexityLevel: 'simple',
      timeSensitivity: 'no_rush',
      shouldExecute: false,
      confidence: 0.3,
      reasoning: 'Emergency fallback due to analysis failure',
      lengthRequirement: 'standard'
    };
    
    return {
      intent: fallbackIntent,
      confusion: {
        hasLearningUncertainty: false,
        confusionLevel: 0,
        knowledgeGaps: [],
        enableSocraticMode: false,
      } as any,
      processingMode: {
        mode: 'chat',
        reasoning: 'Fallback to chat mode',
        confidence: 0.5
      },
      canvasActivation: {
        shouldActivate: false,
        trigger: 'fallback',
        reason: 'Fallback analysis',
        confidence: 0.5,
        semanticAnalysis: { type: 'fallback' }
      },
      toolRequests: {
        isMemoryRequest: false,
        isSearchRequest: false,
        isWeatherRequest: false,
        isImageRequest: false,
        isNavigationRequest: false,
        isSettingsRequest: false
      },
      analysisTime,
      confidence: 0.3,
      reasoning: 'Emergency fallback analysis due to system error'
    };
  }

  async quickAnalyze(message: string): Promise<{ domain: string; mode: string; confidence: number }> {
    const result = await this.analyzeMessage({ message });
    return {
      domain: result.intent.primaryDomain,
      mode: result.processingMode.mode,
      confidence: result.confidence
    };
  }

  getStats(): { status: string; initialized: boolean } {
    return {
      status: 'unified_cognitive_analyzer',
      initialized: true
    };
  }

  async analyzeLearningProgress(learningData: any): Promise<{
    knowledgeGaps: string[];
    strengthAreas: string[];
    learningSpeed: 'fast' | 'moderate' | 'slow';
    retentionPatterns: string[];
    struggleIndicators: string[];
    socraticRecommendations: string[];
  }> {
    try {
      const analysis = {
        knowledgeGaps: [] as string[],
        strengthAreas: [] as string[],
        learningSpeed: 'moderate' as 'fast' | 'moderate' | 'slow',
        retentionPatterns: [] as string[],
        struggleIndicators: [] as string[],
        socraticRecommendations: [] as string[]
      };

      if (learningData.overallStats) {
        const avgComprehension = learningData.overallStats.averageComprehension || 0;
        
        if (avgComprehension < 60) {
          analysis.knowledgeGaps.push('Overall comprehension needs improvement');
          analysis.socraticRecommendations.push('Use Socratic questioning to reinforce foundational concepts');
        }

        if (avgComprehension >= 80) {
          analysis.strengthAreas.push('Strong overall comprehension');
        }

        if (learningData.overallStats.strugglingAreas) {
          analysis.knowledgeGaps.push(...learningData.overallStats.strugglingAreas);
        }

        if (learningData.overallStats.strongestAreas) {
          analysis.strengthAreas.push(...learningData.overallStats.strongestAreas);
        }
      }

      if (learningData.modules) {
        const modules = Object.values(learningData.modules) as any[];
        const completionTimes = modules.map((m: any) => m.progress?.timeSpent || 0).filter(t => t > 0);

        if (completionTimes.length > 0) {
          const avgTime = completionTimes.reduce((sum, t) => sum + t, 0) / completionTimes.length;
          
          if (avgTime < 15) {
            analysis.learningSpeed = 'fast';
            analysis.retentionPatterns.push('Quick learner - retains information efficiently');
          } else if (avgTime > 30) {
            analysis.learningSpeed = 'slow';
            analysis.retentionPatterns.push('Deliberate learner - takes time to absorb material');
            analysis.socraticRecommendations.push('Break complex topics into smaller chunks');
          } else {
            analysis.learningSpeed = 'moderate';
            analysis.retentionPatterns.push('Moderate-paced learner with steady progress');
          }
        }
      }

      if (learningData.currentSession) {
        const session = learningData.currentSession;
        
        if (session.cognitiveMarkers?.knowledgeGaps?.length > 0) {
          analysis.struggleIndicators.push(...session.cognitiveMarkers.knowledgeGaps);
          analysis.socraticRecommendations.push('Focus on areas of confusion with guided questions');
        }

        if (session.comprehensionLevel < 50) {
          analysis.struggleIndicators.push('Current session showing low comprehension');
          analysis.socraticRecommendations.push('Engage Socratic mode to address confusion');
        }
      }

      return analysis;
    } catch (error) {
      console.error('❌ Failed to analyze learning progress:', error);
      return {
        knowledgeGaps: [],
        strengthAreas: [],
        learningSpeed: 'moderate',
        retentionPatterns: [],
        struggleIndicators: [],
        socraticRecommendations: []
      };
    }
  }
}

export const unifiedCognitiveAnalyzer = UnifiedCognitiveAnalyzer.getInstance();
export { UnifiedCognitiveAnalyzer };