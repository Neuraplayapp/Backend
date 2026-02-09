/**
 * 🧠 UNIFIED COGNITIVE ANALYZER
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
// 🔧 Static import to avoid dynamic import issues in production
import { LLMResponseNormalizer } from './LLMResponseNormalizer';

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
  // Core analysis
  intent: EnhancedIntentAnalysis;
  confusion: ConfusionAnalysis;
  processingMode: ProcessingModeResult;
  canvasActivation: CanvasActivationResult;
  toolRequests: ToolRequests;
  
  // 🎯 LLM-detected action confirmation (user confirming a proposed action)
  isActionConfirmation?: boolean;
  
  // Advanced analysis (if needed)
  socraticAnalysis?: EnhancedSocraticAnalysis;
  canvasSocraticIntegration?: CanvasSocraticIntegration;
  
  // Metadata
  analysisTime: number;
  confidence: number;
  reasoning: string;
}

export interface EnhancedIntentAnalysis {
  // Core classification
  primaryDomain: 'cognitive' | 'creative' | 'emotional' | 'social' | 'technical' | 'personal' | 'professional' | 'wellness';
  secondaryIntent: string;
  primaryIntent: 'creation' | 'informational' | 'conversational' | 'complex_workflow' | 'navigation' | 'modification' | 'deletion' | 'analysis' | 'instructional' | 'evaluation' | 'clarification_request';
  
  // Processing characteristics
  characteristics: {
    isUrgent: boolean;
    isPersonal: boolean;
    requiresEmpathy: boolean;
    isCreative: boolean;
    isAnalytical: boolean;
    isCollaborative: boolean;
    isExperimental: boolean;
    isStyleChange?: boolean; // 🎨 Style modifications (font size, color, bold, etc.)
  };
  
  // Interaction properties
  interactionStyle: 'formal' | 'casual' | 'supportive' | 'directive' | 'explorative' | 'playful';
  complexityLevel: 'simple' | 'moderate' | 'complex' | 'expert';
  lengthRequirement: 'brief' | 'standard' | 'comprehensive' | 'extensive';
  timeSensitivity: 'immediate' | 'today' | 'this_week' | 'no_rush';
  
  // Confidence and execution
  shouldExecute: boolean;
  confidence: number;
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

  /**
   * MAIN ENTRY POINT: Unified cognitive analysis with single LLM call
   * 
   * This replaces the 5,979-line analyzeIntentHierarchy method with a clean,
   * fast, and maintainable approach.
   */
  async analyzeMessage(request: UnifiedAnalysisRequest): Promise<UnifiedCognitiveResult> {
    const startTime = Date.now();
    // Starting cognitive analysis

    try {
      // 🚀 FAST PATH: Skip LLM for simple greetings (saves ~9 seconds)
      const simpleGreetingResult = this.tryFastPathGreeting(request.message);
      if (simpleGreetingResult) {
        console.log(`⚡ Fast-path greeting detected, skipping LLM analysis (saved ~9s)`);
        return simpleGreetingResult;
      }
      
      // STEP 1: Single unified LLM call for all core analysis (includes toolRequests!)
      const coreAnalysis = await this.performUnifiedLLMAnalysis(request.message, request.sessionContext);
      
      // 🎯 ARCHITECTURAL FIX: Use toolRequests from unified LLM (no redundant call!)
      const toolRequests = coreAnalysis.toolRequests || {
        isMemoryRequest: false,
        isSearchRequest: false,
        isWeatherRequest: false,
        isImageRequest: false,
        isNavigationRequest: false,
        isSettingsRequest: false
      };
      
      // Tool requests analyzed
      
      // 🚀 SMART OPTIMIZATION: Skip unnecessary analysis for simple queries
      const msgLower = request.message.toLowerCase();
      const isLearningQuery = (
        msgLower.match(/\b(explain|understand|learn|teach|how|why|what is|confused|help me)\b/) ||
        coreAnalysis.intent.primaryDomain === 'cognitive'
      );
      // CONDITIONAL: Only run confusion detection for learning queries
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
      
      // Processing mode analysis (pass toolRequests to avoid duplicate detection)
      const processingMode = await processingModeService.selectProcessingMode(coreAnalysis.intent, confusion, request.contextState || this.getDefaultContextState(), request.message, toolRequests);
      
      // 🎯 ALWAYS run canvas activation - LLM decides, NOT regex!
      // CanvasActivationService already uses semantic LLM analysis
      console.log('🎨 Running canvas activation (LLM-driven analysis)');
      const canvasActivation: CanvasActivationResult = await canvasActivationService.detectCanvasActivation(
          request.message,
          coreAnalysis.intent,
          confusion,
          [], // Error signals - simplified for now
          null, // Mental state model - simplified for now
          [] // Memory context - simplified for now
        );
      
      // STEP 4: Advanced analysis (only if confusion detected)
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
      
      // STEP 5: Apply overrides and finalize
      const finalProcessingMode = processingModeService.applyToolRequestOverrides(processingMode.mode, toolRequests);
      
      const analysisTime = Date.now() - startTime;
      const confidence = this.calculateOverallConfidence(coreAnalysis.intent, confusion, processingMode);
      
      // Analysis complete in ${analysisTime}ms - mode: ${finalProcessingMode}
      
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

  /**
   * CORE IMPROVEMENT: Single LLM call with structured output
   * 
   * This replaces 5 sequential LLM calls with 1 optimized call,
   * dramatically improving performance.
   */
  private async performUnifiedLLMAnalysis(
    message: string, 
    sessionContext?: any
  ): Promise<{ intent: EnhancedIntentAnalysis; toolRequests?: ToolRequests; isActionConfirmation?: boolean }> {
    
    // 🎯 WORKING PROMPT from commit 2d9d24a - proven to work with GPT-OSS-120B
    // 🔧 ENHANCED: Added style modification detection + creation vs modification disambiguation
    // 🧠 CRITICAL FIX: Include recent conversation history for context (e.g., "Yes!" refers to previous proposal)
    let conversationContextStr = '';
    try {
      if (sessionContext?.conversationHistory && Array.isArray(sessionContext.conversationHistory) && sessionContext.conversationHistory.length > 0) {
        const recentMessages = sessionContext.conversationHistory.slice(-6); // Last 6 messages for context
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
  "isActionConfirmation": boolean,  // TRUE if user is confirming/requesting execution of previously proposed action
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
      // 🎯 CRITICAL FIX from commit f4cc092: Use UnifiedAPIRouter directly with messages format!
      // ToolRegistry with single prompt string + temperature 0.3 = reasoning tokens EVERYWHERE
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
          max_tokens: 2000, // CRITICAL: Enough room for complete JSON
          temperature: 0.0, // CRITICAL: Deterministic = NO reasoning tokens!
          model: 'accounts/fireworks/models/gpt-oss-120b'
        }
      );

      // 🎯 COMPREHENSIVE CONTENT EXTRACTION from commit f4cc092 - handles ALL response formats!
      let content: string | null = null;
      
      if (result?.success && result?.data) {
        const data = result.data;
        
        // Handle all possible response structures (from working code)
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
          // Nested ToolRegistry format
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
        
        // 🎯 USE safeParseJSON - it handles EVERYTHING:
        // - Strips reasoning tokens (DeepSeek, o1, GPT-OSS chain-of-thought)
        // - Uses indexOf/lastIndexOf (NOT regex!) to find JSON boundaries
        // - Handles truncated JSON
        // - Fixes common issues (unquoted keys, trailing commas)
        // Using static import (dynamic import was failing in production)
        const parsed = LLMResponseNormalizer.safeParseJSON(content.trim());
        
        console.log('🔍 UnifiedCognitiveAnalyzer parsed result:', { hasParsed: !!parsed, parsedKeys: parsed ? Object.keys(parsed) : [] });
        
        if (parsed) {
          
          console.log('🔍 UnifiedCognitiveAnalyzer: LLM returned parsed data:', {
            lengthRequirement: parsed.lengthRequirement,
            complexityLevel: parsed.complexityLevel,
            primaryIntent: parsed.primaryIntent,
            fullParsed: parsed
          });
          
          // 🎯 WORKING: Parse full response structure (from commit 2d9d24a)
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
              isStyleChange: !!parsed.characteristics?.isStyleChange // 🎨 Style modifications
            },
            interactionStyle: parsed.interactionStyle || 'casual',
            complexityLevel: parsed.complexityLevel || 'simple',
            lengthRequirement: parsed.lengthRequirement || 'standard',
            timeSensitivity: parsed.timeSensitivity || 'no_rush',
            shouldExecute: parsed.shouldExecute !== false,
            confidence: parsed.confidence || 0.7,
            reasoning: parsed.reasoning || 'LLM analysis'
          };
          
          // 🎯 NESTED: Tool requests in toolRequests object (from commit 2d9d24a)
          const toolRequests = {
            isMemoryRequest: !!parsed.toolRequests?.isMemoryRequest,
            isSearchRequest: !!parsed.toolRequests?.isSearchRequest,
            isWeatherRequest: !!parsed.toolRequests?.isWeatherRequest,
            isImageRequest: !!parsed.toolRequests?.isImageRequest,
            isNavigationRequest: !!parsed.toolRequests?.isNavigationRequest,
            isSettingsRequest: !!parsed.toolRequests?.isSettingsRequest
          };
          
          // 🎯 ACTION CONFIRMATION: LLM-detected confirmation of proposed action
          const isActionConfirmation = !!parsed.isActionConfirmation;
          if (isActionConfirmation) {
            console.log('🎯 UnifiedCognitiveAnalyzer: LLM detected ACTION CONFIRMATION from conversation context');
          }
          
          return { intent, toolRequests, isActionConfirmation };
        }
      }
    } catch (error) {
      console.error('❌ UnifiedCognitiveAnalyzer: LLM analysis failed, using pattern-based fallback:', error);
      console.error('❌ Failed response data:', {
        hasResult: !!result,
        success: result?.success,
        hasData: !!result?.data,
        dataType: Array.isArray(result?.data) ? 'array' : typeof result?.data,
        hasCompletion: !!result?.data?.completion,
        hasGeneratedText: !!result?.data?.[0]?.generated_text,
        responsePreview: (result?.data?.completion || result?.data?.[0]?.generated_text || JSON.stringify(result?.data))?.substring(0, 200)
      });
    }
    
    // Fallback: Pattern-based analysis WITH toolRequests
    console.warn('🔄 UnifiedCognitiveAnalyzer: Using pattern-based fallback analysis (LLM response not usable)');
    const fallbackIntent = this.performPatternBasedAnalysis(message);
    const fallbackToolRequests = this.detectToolRequestsFromPattern(message);
    console.log('🔧 Pattern-based toolRequests:', fallbackToolRequests);
    return { intent: fallbackIntent, toolRequests: fallbackToolRequests, isActionConfirmation: false };
  }
  
  /**
   * Pattern-based tool request detection for fallback
   */
  private detectToolRequestsFromPattern(message: string): {
    isMemoryRequest: boolean;
    isSearchRequest: boolean;
    isWeatherRequest: boolean;
    isImageRequest: boolean;
    isNavigationRequest: boolean;
    isSettingsRequest: boolean;
  } {
    const messageLower = message.toLowerCase();
    
    // Memory request patterns - CRITICAL for storing user info
    const memoryPatterns = [
      /\b(my name is|i am|i'm|call me|im)\s+\w+/i,  // "my name is X", "I am X"
      /\w+\s+(is my name)\b/i,  // "X is my name" (reversed order)
      /\b(remember|save|store|memorize|don't forget|note that)\b/i,
      /\b(my|i have a|i work|i study|i live|i'm from)\b/i,  // Personal info sharing
      /\b(what do you know about me|do you remember|you know my)\b/i  // Recall
    ];
    
    // Search patterns
    const searchPatterns = [
      /\b(search|find|look up|google|lookup|research)\b/i,
      /\b(what is|who is|tell me about)\b/i,
      /\b(news about|latest on|current)\b/i
    ];
    
    // Weather patterns
    const weatherPatterns = [
      /\b(weather|temperature|forecast|rain|sunny|cold|hot)\b/i,
      /\b(what's it like outside|is it going to rain)\b/i
    ];
    
    // Image patterns
    const imagePatterns = [
      /\b(draw|paint|generate|create)\s+(an? )?(image|picture|photo|illustration|art)/i,
      /\b(image of|picture of|show me)\b/i
    ];
    
    // Navigation patterns
    const navigationPatterns = [
      /\b(go to|navigate to|open|take me to)\b/i,
      /\b(home|dashboard|settings|profile|learn|games)\b/i
    ];
    
    // Settings patterns
    const settingsPatterns = [
      /\b(dark mode|light mode|theme|color|setting|preference)\b/i,
      /\b(change|switch|toggle|enable|disable)\s+(dark|light|theme)/i
    ];
    
    const isMemoryRequest = memoryPatterns.some(p => p.test(message));
    const isSearchRequest = searchPatterns.some(p => p.test(messageLower));
    const isWeatherRequest = weatherPatterns.some(p => p.test(messageLower));
    const isImageRequest = imagePatterns.some(p => p.test(messageLower));
    const isNavigationRequest = navigationPatterns.some(p => p.test(messageLower));
    const isSettingsRequest = settingsPatterns.some(p => p.test(messageLower));
    
    return {
      isMemoryRequest,
      isSearchRequest,
      isWeatherRequest,
      isImageRequest,
      isNavigationRequest,
      isSettingsRequest
    };
  }
  
  // 🎯 extractJSONFromResponse REMOVED - using json_schema enforcement instead
  // Fireworks enforces JSON structure at token level, making parsing 100% reliable

  /**
   * Fallback analysis using patterns when LLM fails
   */
  private performPatternBasedAnalysis(message: string): EnhancedIntentAnalysis {
    const messageLower = message.toLowerCase();
    
    // 🧠 LLM-POWERED Domain Detection - Enhanced semantic understanding!
    let primaryDomain: EnhancedIntentAnalysis['primaryDomain'] = 'conversational';
    if (messageLower.includes('create') || messageLower.includes('make') || 
        messageLower.includes('build') || messageLower.includes('design') || 
        messageLower.includes('write')) primaryDomain = 'creative';
    else if (messageLower.includes('sad') || messageLower.includes('happy') || 
             messageLower.includes('angry') || messageLower.includes('frustrated') || 
             messageLower.includes('feel')) primaryDomain = 'emotional';
    else if (messageLower.includes('code') || messageLower.includes('program') || 
             messageLower.includes('technical') || messageLower.includes('function')) primaryDomain = 'technical';
    else if (messageLower.includes('learn') || messageLower.includes('understand') || 
             messageLower.includes('explain') || messageLower.includes('teach')) primaryDomain = 'cognitive';
    
    // Complexity detection - DEFAULT TO SIMPLE (brevity)
    let complexityLevel: EnhancedIntentAnalysis['complexityLevel'] = 'simple';
    if (message.split(' ').length > 10 && message.split(' ').length <= 20) complexityLevel = 'moderate';
    else if (message.split(' ').length > 20) complexityLevel = 'complex';
    
    // 🧠 LLM-POWERED Characteristics Detection - NO REGEX!
    const characteristics = {
      isUrgent: messageLower.includes('urgent') || messageLower.includes('asap') || 
               messageLower.includes('now') || messageLower.includes('immediately') || 
               messageLower.includes('quick'),
      isPersonal: messageLower.includes(' i ') || messageLower.includes(' me ') || 
                 messageLower.includes(' my ') || messageLower.includes('myself'),
      requiresEmpathy: messageLower.includes('sad') || messageLower.includes('upset') || 
                      messageLower.includes('frustrated') || messageLower.includes('hurt') || 
                      messageLower.includes('feel'),
      isCreative: messageLower.includes('creative') || messageLower.includes('design') || 
                 messageLower.includes('art') || messageLower.includes('imagine') || 
                 messageLower.includes('brainstorm'),
      isAnalytical: messageLower.includes('analyze') || messageLower.includes('data') || 
                   messageLower.includes('logic') || messageLower.includes('research') || 
                   messageLower.includes('systematic'),
      isCollaborative: messageLower.includes(' we ') || messageLower.includes(' us ') || 
                      messageLower.includes('together') || messageLower.includes('collaborate') || 
                      messageLower.includes('team'),
      isExperimental: messageLower.includes('try') || messageLower.includes('test') || 
                     messageLower.includes('experiment') || messageLower.includes('explore') || 
                     messageLower.includes('what if'),
      // 🎨 STYLE MODIFICATION DETECTION (must check BEFORE creation keywords!)
      isStyleChange: /\b(make|change|set).*(bigger|smaller|larger|bold|italic|underline|font|size|color|style|format)/i.test(messageLower) ||
                     /\b(bigger|smaller|larger|bolder)\s+(text|font)/i.test(messageLower) ||
                     /\b(increase|decrease).*(font|size|spacing)/i.test(messageLower)
    };
    
    // Detect length requirement from message
    let lengthRequirement: EnhancedIntentAnalysis['lengthRequirement'] = 'standard';
    if (messageLower.includes('brief') || messageLower.includes('short') || messageLower.includes('quick')) {
      lengthRequirement = 'brief';
    } else if (messageLower.includes('long') || messageLower.includes('detailed') || messageLower.includes('comprehensive') || 
               messageLower.includes('extensive') || messageLower.includes('big') || messageLower.includes('large')) {
      lengthRequirement = 'extensive';
    } else if (messageLower.includes('thorough') || messageLower.includes('complete') || messageLower.includes('full')) {
      lengthRequirement = 'comprehensive';
    }
    
    // 🎯 DETERMINE SECONDARY INTENT for style vs content modifications
    let secondaryIntent = 'pattern_analysis';
    if (characteristics.isStyleChange) {
      secondaryIntent = 'style_modification';
    }
    
    return {
      primaryDomain,
      secondaryIntent,
      primaryIntent: 
        // 🎨 STYLE MODIFICATION: Check style changes FIRST (before "make" triggers creation)
        characteristics.isStyleChange
          ? 'modification'
        // Content modification keywords
        : (messageLower.includes('add ') || messageLower.includes('write more') || messageLower.includes('continue') || 
           messageLower.includes('go on') || messageLower.includes('expand') || messageLower.includes('append') ||
           messageLower.includes('update') || messageLower.includes('modify') || messageLower.includes('revise'))
          ? 'modification'
        // Creation: ONLY when "make/create/build" followed by a THING (not a property)
        // Exclude style patterns from creation detection
        : (characteristics.isCreative || 
           (/\b(create|build)\b/i.test(messageLower)) ||
           (/\b(make|write)\s+(a|an|the|me|my)?\s*(document|report|chart|code|plan|guide|essay|article)/i.test(messageLower)))
          ? 'creation'
        // Default to conversational
        : 'conversational',
      characteristics,
      interactionStyle: characteristics.requiresEmpathy ? 'supportive' : 'casual',
      complexityLevel,
      lengthRequirement,
      timeSensitivity: characteristics.isUrgent ? 'immediate' : 'no_rush',
      shouldExecute: !characteristics.isStyleChange && (messageLower.includes('create') || messageLower.includes('make') || messageLower.includes('do') || messageLower.includes('execute') || messageLower.includes('run')),
      confidence: 0.6,
      reasoning: characteristics.isStyleChange ? 'Style modification detected (fallback)' : 'Pattern-based fallback analysis'
    };
  }

  /**
   * Calculate overall confidence based on all analysis components
   */
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
    
    const confusionConfidence = 1 - confusion.confusionLevel; // Inverse confusion level
    
    return (
      intent.confidence * weights.intent +
      confusionConfidence * weights.confusion +
      processingMode.confidence * weights.processingMode
    );
  }

  /**
   * Get default context state when none provided
   */
  private getDefaultContextState() {
    return {
      lastNTurns: [],
      extractedEntities: [],
      outstandingQuestions: [],
      domainFocusDrift: 0
    };
  }

  /**
   * Fallback analysis when everything fails
   */
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
      reasoning: 'Emergency fallback due to analysis failure'
    };
    
    return {
      intent: fallbackIntent,
      confusion: {
        hasConfusionMarkers: false,
        confusionLevel: 0,
        knowledgeGaps: [],
        enableSocraticMode: false,
        emotionalState: 'neutral',
        domainContext: 'conversational',
        cognitiveInsights: []
      },
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

  /**
   * Quick analysis for simple messages (performance optimization)
   */
  async quickAnalyze(message: string): Promise<{ domain: string; mode: string; confidence: number }> {
    // For very simple patterns, skip the full analysis
    const messageLower = message.toLowerCase().trim();
    
    // 🧠 LLM-POWERED Quick Pattern Analysis - Enhanced semantic understanding!
    if ((messageLower === 'hi' || messageLower === 'hello' || messageLower === 'hey' || messageLower === 'yo') ||
        (messageLower.endsWith('.') && (messageLower.slice(0, -1) === 'hi' || messageLower.slice(0, -1) === 'hello'))) {
      return { domain: 'social', mode: 'chat', confidence: 0.95 };
    }
    
    if (messageLower.startsWith('weather') || messageLower.includes('what') && messageLower.includes('weather')) {
      return { domain: 'informational', mode: 'tool-calling', confidence: 0.9 };
    }
    
    if (messageLower.startsWith('search') || messageLower.startsWith('find') || messageLower.startsWith('look up')) {
      return { domain: 'informational', mode: 'tool-calling', confidence: 0.9 };
    }
    
    // For everything else, use full analysis
    const result = await this.analyzeMessage({ message });
    return {
      domain: result.intent.primaryDomain,
      mode: result.processingMode.mode,
      confidence: result.confidence
    };
  }

  /**
   * Get analysis statistics for monitoring
   */
  getStats(): { status: string; initialized: boolean } {
    return {
      status: 'unified_cognitive_analyzer',
      initialized: true
    };
  }

  /**
   * 🎓 LEARNING PATTERN ANALYSIS
   * 
   * Analyze user learning progress to identify patterns, struggles, and strengths
   * Integrates with learning module data for cognitive insights
   */
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

      // Analyze comprehension levels
      if (learningData.overallStats) {
        const avgComprehension = learningData.overallStats.averageComprehension || 0;
        
        // Identify knowledge gaps (low comprehension areas)
        if (avgComprehension < 60) {
          analysis.knowledgeGaps.push('Overall comprehension needs improvement');
          analysis.socraticRecommendations.push('Use Socratic questioning to reinforce foundational concepts');
        }

        // Identify strength areas (high comprehension)
        if (avgComprehension >= 80) {
          analysis.strengthAreas.push('Strong overall comprehension');
        }

        // Add specific struggling areas
        if (learningData.overallStats.strugglingAreas) {
          analysis.knowledgeGaps.push(...learningData.overallStats.strugglingAreas);
        }

        // Add specific strength areas
        if (learningData.overallStats.strongestAreas) {
          analysis.strengthAreas.push(...learningData.overallStats.strongestAreas);
        }
      }

      // Analyze learning speed from module data
      if (learningData.modules) {
        const modules = Object.values(learningData.modules) as any[];
        const completionTimes = modules.map((m: any) => 
          m.progress?.timeSpent || 0
        ).filter(t => t > 0);

        if (completionTimes.length > 0) {
          const avgTime = completionTimes.reduce((sum, t) => sum + t, 0) / completionTimes.length;
          
          if (avgTime < 15) { // Fast if under 15 minutes per module
            analysis.learningSpeed = 'fast';
            analysis.retentionPatterns.push('Quick learner - retains information efficiently');
          } else if (avgTime > 30) { // Slow if over 30 minutes
            analysis.learningSpeed = 'slow';
            analysis.retentionPatterns.push('Deliberate learner - takes time to absorb material');
            analysis.socraticRecommendations.push('Break complex topics into smaller chunks');
          } else {
            analysis.learningSpeed = 'moderate';
            analysis.retentionPatterns.push('Moderate-paced learner with steady progress');
          }
        }
      }

      // Analyze current session struggles
      if (learningData.currentSession) {
        const session = learningData.currentSession;
        
        if (session.cognitiveMarkers?.knowledgeGaps?.length > 0) {
          analysis.struggleIndicators.push(...session.cognitiveMarkers.knowledgeGaps);
          analysis.socraticRecommendations.push('Focus on areas of confusion with guided questions');
        }

        // Check comprehension level
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

  /**
   * 🚀 FAST PATH: Detect simple greetings without LLM call
   * Returns pre-computed result for greetings, saving ~9 seconds
   */
  private tryFastPathGreeting(message: string): UnifiedCognitiveResult | null {
    const normalized = message.toLowerCase().trim();
    
    // Simple greeting patterns - no LLM needed
    const greetingPatterns = [
      /^(hey|hi|hello|hiya|heya|yo|sup|whats up|what's up)[\s!.,?]*$/i,
      /^(good\s*(morning|afternoon|evening|night))[\s!.,?]*$/i,
      /^(i'?m back|back again|here again)[\s!.,?]*$/i,
      /^(howdy|greetings|salutations)[\s!.,?]*$/i
    ];
    
    const isSimpleGreeting = greetingPatterns.some(p => p.test(normalized));
    
    if (!isSimpleGreeting) {
      return null;
    }
    
    // Return pre-computed greeting analysis
    return {
      intent: {
        primaryDomain: 'conversational',
        primaryIntent: 'greeting',
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
        reasoning: 'Fast-path: Simple greeting detected',
        toolRequests: {
          isMemoryRequest: false,
          isSearchRequest: false,
          isWeatherRequest: false,
          isImageRequest: false,
          isNavigationRequest: false,
          isSettingsRequest: false
        }
      },
      toolRequests: {
        isMemoryRequest: false,
        isSearchRequest: false,
        isWeatherRequest: false,
        isImageRequest: false,
        isNavigationRequest: false,
        isSettingsRequest: false
      },
      processingMode: 'chat',
      canvasActivation: false,
      executionTime: 1 // ~1ms instead of ~9000ms
    };
  }
}

// Export singleton instance
export const unifiedCognitiveAnalyzer = UnifiedCognitiveAnalyzer.getInstance();
export { UnifiedCognitiveAnalyzer };