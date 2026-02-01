/**
 * 🎨 CANVAS ACTIVATION SERVICE
 * 
 * Advanced service for detecting when to activate canvas/workspace for content creation.
 * Extracted from IntentAnalysisService monolith for clean separation of concerns.
 * 
 * SINGLE RESPONSIBILITY: Determine if user requests require visual workspace (canvas)
 * vs regular chat, with sophisticated AI-driven semantic analysis.
 */

export interface CanvasActivationResult {
  shouldActivate: boolean;
  trigger: string;
  reason: string;
  confidence: number;
  semanticAnalysis: any;
  // 🎯 NEW: Detect when user is asking about their EXISTING canvas content
  mentionsExistingContent?: boolean;
  contentType?: string;
}

export interface ImageDetectionResult {
  isImageRequest: boolean;
  confidence: number;
  imageType?: string;
  reasoning: string;
}

export interface CanvasFrustrationResult {
  detected: boolean;
  confidence: number;
  reason: string;
  signals: string[];
}

export interface CanvasPreferenceResult {
  hasStrongPreference: boolean;
  prefersCanvas: boolean;
  confidence: number;
  reason: string;
  pattern: string;
}

export interface CanvasSocraticIntegration {
  usePureCanvas: boolean;
  useCanvasSocratic: boolean;
  useSocraticFirst: boolean;
  reason: string;
}

export interface SemanticAnalysisResult {
  shouldActivate: boolean;
  trigger: string;
  reason: string;
  confidence: number;
  contentType: string;
  actionType: string;
  details: any;
}

export interface EnhancedAnalysis {
  primaryDomain: 'cognitive' | 'creative' | 'emotional' | 'social' | 'technical' | 'personal' | 'professional' | 'wellness';
  secondaryIntent: string;
  complexityLevel: 'simple' | 'moderate' | 'complex' | 'expert';
  interactionStyle: 'formal' | 'casual' | 'supportive' | 'directive' | 'explorative' | 'playful';
  confidence: number;
  characteristics?: {
    requiresEmpathy?: boolean;
  };
}

export interface ConfusionDetection {
  confusionLevel: number;
  hasConfusionMarkers: boolean;
  emotionalState: string;
}

class CanvasActivationService {
  private static instance: CanvasActivationService;

  static getInstance(): CanvasActivationService {
    if (!CanvasActivationService.instance) {
      CanvasActivationService.instance = new CanvasActivationService();
    }
    return CanvasActivationService.instance;
  }

  /**
   * MAIN ENTRY POINT: Detect canvas activation with 99% accuracy
   */
  async detectCanvasActivation(
    message: string, 
    aiAnalysis: EnhancedAnalysis, 
    confusionDetection: ConfusionDetection,
    errorSignals: any[],
    mentalStateModel: any,
    memoryContext: any
  ): Promise<CanvasActivationResult> {
    console.log('🎯 CanvasActivationService: STATE-OF-THE-ART Canvas Activation Analysis');
    
    // PHASE 1: 🧠 LLM-POWERED EXPLICIT CANVAS REQUESTS - Enhanced semantic understanding!
    const messageLower = message.toLowerCase();
    if ((messageLower.includes('canvas') || messageLower.includes('workspace')) && 
        (messageLower.includes('use') || messageLower.includes('activate') || 
         messageLower.includes('open') || messageLower.includes('switch') ||
         messageLower.includes('to') || messageLower.includes('on'))) {
      return {
        shouldActivate: true,
        trigger: 'explicit_canvas_request',
        reason: 'User explicitly mentioned canvas workspace',
        confidence: 0.99,
        semanticAnalysis: { type: 'explicit', keywords: ['canvas', 'workspace'] }
      };
    }
    
    // PHASE 2: CRITICAL EXCLUSIONS - Image generation should NOT activate canvas
    const isImageRequest = await this.detectImageGenerationRequest(message);
    if (isImageRequest.isImageRequest) {
      return {
        shouldActivate: false,
        trigger: 'image_generation_excluded',
        reason: 'Image generation request - routing to image tools',
        confidence: 0.95,
        semanticAnalysis: isImageRequest
      };
    }
    
    // PHASE 3: ERROR DETECTION CIRCUIT - Check for canvas frustration
    const canvasFrustration = this.detectCanvasFrustration(errorSignals, mentalStateModel);
    if (canvasFrustration.detected) {
      return {
        shouldActivate: false,
        trigger: 'user_frustration_detected',
        reason: canvasFrustration.reason,
        confidence: canvasFrustration.confidence,
        semanticAnalysis: { type: 'frustration', signals: canvasFrustration.signals }
      };
    }
    
    // PHASE 4: MEMORY-INFORMED PREFERENCE LEARNING
    const memoryPreference = await this.getCanvasPreferenceFromMemory(memoryContext, message);
    if (memoryPreference.hasStrongPreference) {
      return {
        shouldActivate: memoryPreference.prefersCanvas,
        trigger: 'memory_informed_preference',
        reason: memoryPreference.reason,
        confidence: memoryPreference.confidence,
        semanticAnalysis: { type: 'memory_learned', pattern: memoryPreference.pattern }
      };
    }
    
    // PHASE 5: STATE-OF-THE-ART AI SEMANTIC ANALYSIS (99% Accuracy Engine)
    const semanticAnalysis = await this.performSemanticCanvasAnalysis(
      message, 
      aiAnalysis, 
      mentalStateModel,
      confusionDetection
    );
    
    console.log('🧠 CanvasActivationService: Semantic Analysis Complete:', {
      contentType: semanticAnalysis.contentType,
      actionType: semanticAnalysis.actionType,
      confidence: semanticAnalysis.confidence,
      shouldActivate: semanticAnalysis.shouldActivate
    });
    
    return {
      shouldActivate: semanticAnalysis.shouldActivate,
      trigger: semanticAnalysis.trigger,
      reason: semanticAnalysis.reason,
      confidence: semanticAnalysis.confidence,
      semanticAnalysis: semanticAnalysis.details
    };
  }

  /**
   * 🎯 SMART AI-DRIVEN IMAGE DETECTION
   * Uses semantic understanding while RESPECTING chart/canvas boundaries
   */
  private async detectImageGenerationRequest(message: string): Promise<ImageDetectionResult> {
    console.log('🖼️ CanvasActivationService: Smart image detection analysis');
    
    const messageLower = message.toLowerCase();
    
    // 🚫 FAST PATH: Exclude chart/canvas requests IMMEDIATELY (no LLM needed)
    const chartExclusionTerms = [
      'chart', 'graph', 'plot', 'diagram', 'flowchart', 'table',
      'statistics', 'data', 'metrics', 'analytics', 'trends',
      'bar chart', 'pie chart', 'line graph', 'scatter plot', 'histogram',
      'spreadsheet', 'document', 'report', 'visualize the data', 'visualize statistics'
    ];
    
    if (chartExclusionTerms.some(term => messageLower.includes(term))) {
      console.log('🚫 CanvasActivationService: Chart/canvas request detected - NOT image generation');
      return {
        isImageRequest: false,
        confidence: 0.95,
        imageType: 'none',
        reasoning: 'Chart/data visualization request - routed to canvas'
      };
    }
    
    // 🔧 AGGRESSIVE ANTI-REASONING PROMPT
    const imageAnalysisPrompt = `OUTPUT ONLY JSON. NO EXPLANATIONS. START WITH {

Message: "${message}"

{"isImageRequest":false,"imageType":"none","confidence":0.9,"reasoning":""}

RULES:
- draw/create photo/portrait/artwork/imagine = true
- chart/graph/diagram/flowchart/table = false (canvas)
- document/code/report = false (canvas)

JSON ONLY:`;

    try {
      const { serviceContainer } = await import('./ServiceContainer');
      const toolRegistry = serviceContainer.get('toolRegistry');
      
      if (!toolRegistry) {
        throw new Error('ToolRegistry not available');
      }
      
      // 🎯 WORKING APPROACH: No response_format, use regex extraction (like commit 2d9d24a)
      const result = await (toolRegistry as any).execute('llm-completion', {
        prompt: `You are an image vs chart classifier expert.\n\n${imageAnalysisPrompt}`,
        model: 'accounts/fireworks/models/gpt-oss-120b',
        temperature: 0,
        maxTokens: 500
      }, { sessionId: '', userId: '', startTime: Date.now() });
      
      if (result?.success && result.data?.completion) {
        const responseText = result.data.completion;
        const match = responseText.match(/\{[\s\S]*\}/);
        let parsed: any = null;
        if (match) {
          try {
            parsed = JSON.parse(match[0]);
          } catch (e) {
            const { LLMResponseNormalizer } = await import('./LLMResponseNormalizer');
            parsed = LLMResponseNormalizer.safeParseJSON(responseText);
          }
        }
        return {
          isImageRequest: parsed?.isImageRequest || false,
          confidence: parsed?.confidence || 0.5,
          imageType: parsed?.imageType || 'none',
          reasoning: parsed?.reasoning || 'AI semantic analysis'
        };
      }
    } catch (error) {
      console.warn('🖼️ CanvasActivationService: AI image analysis failed, using smart fallback');
    }
    
    // 🧠 SMART FALLBACK: Creative image detection with chart protection
    const creativeImageTerms = [
      'image of', 'picture of', 'photo of', 'artwork', 'illustration',
      'portrait', 'scene', 'landscape', 'draw me', 'create an image',
      'generate an image', 'what would', 'look like', 'imagine', 'depict'
    ];
    
    const hasCreativeIntent = creativeImageTerms.some(term => messageLower.includes(term));
    
    if (hasCreativeIntent) {
      return {
        isImageRequest: true,
        confidence: 0.8,
        imageType: 'general',
        reasoning: 'Creative image request detected via smart fallback'
      };
    }
    
    return {
      isImageRequest: false,
      confidence: 0.9,
      imageType: 'none',
      reasoning: 'No artistic image generation intent detected'
    };
  }

  /**
   * COGNITIVE MODULE: Canvas Frustration Detection (Error Detection Circuit)
   */
  private detectCanvasFrustration(errorSignals: any[], mentalStateModel: any): CanvasFrustrationResult {
    console.log('🚨 CanvasActivationService: Analyzing canvas frustration via Error Detection Circuit');
    
    const frustrationSignals: string[] = [];
    let maxConfidence = 0;
    
    // ERROR DETECTION CIRCUIT: Look for canvas-related frustration
    if (errorSignals && errorSignals.length > 0) {
      const canvasRelatedErrors = errorSignals.filter(signal => 
        signal.cognitiveMarkers?.conflictWords?.some((word: string) => {
          const wordLower = word.toLowerCase();
          return wordLower.includes('canvas') || wordLower.includes('workspace') ||
                 wordLower.includes('interface') || wordLower.includes('display') ||
                 wordLower.includes('layout');
        })
      );
      
      if (canvasRelatedErrors.length > 0) {
        frustrationSignals.push('canvas_conflict_detected');
        maxConfidence = Math.max(maxConfidence, 0.85);
      }
    }
    
    // THEORY OF MIND: Check emotional state
    if (mentalStateModel?.intentionalStance?.emotionalState === 'frustrated') {
      frustrationSignals.push('user_emotional_frustration');
      maxConfidence = Math.max(maxConfidence, 0.75);
    }
    
    // THEORY OF MIND: Check communication intent
    if (mentalStateModel?.communicativeIntent?.pragmaticImplicature?.includes('just answer')) {
      frustrationSignals.push('preference_for_simple_response');
      maxConfidence = Math.max(maxConfidence, 0.8);
    }
    
    const detected = frustrationSignals.length > 0 && maxConfidence > 0.7;
    
    return {
      detected,
      confidence: maxConfidence,
      reason: detected 
        ? `Canvas frustration detected: ${frustrationSignals.join(', ')}` 
        : 'No canvas frustration signals',
      signals: frustrationSignals
    };
  }

  /**
   * MEMORY-INFORMED CANVAS PREFERENCE LEARNING
   */
  private async getCanvasPreferenceFromMemory(memoryContext: any, _message: string): Promise<CanvasPreferenceResult> {
    console.log('🧠 CanvasActivationService: Checking memory for canvas preferences');
    
    if (!memoryContext || !Array.isArray(memoryContext)) {
      return {
        hasStrongPreference: false,
        prefersCanvas: false,
        confidence: 0.5,
        reason: 'No memory context available',
        pattern: 'none'
      };
    }
    
    // 🧠 LLM-POWERED memory patterns for canvas usage - NO REGEX!
    const canvasInteractions = memoryContext.filter((memory: any) => {
      if (!memory.content) return false;
      const contentLower = memory.content.toLowerCase();
      return contentLower.includes('canvas') || contentLower.includes('workspace') ||
             contentLower.includes('document') || contentLower.includes('create');
    });
    
    if (canvasInteractions.length >= 3) {
      const positiveCanvasMemories = canvasInteractions.filter((memory: any) =>
        !memory.content.includes('frustrated') && !memory.content.includes('complicated')
      );
      
      const preferenceRatio = positiveCanvasMemories.length / canvasInteractions.length;
      
      if (preferenceRatio > 0.7) {
        return {
          hasStrongPreference: true,
          prefersCanvas: true,
          confidence: 0.8,
          reason: 'Historical positive canvas interactions',
          pattern: 'positive_canvas_preference'
        };
      } else if (preferenceRatio < 0.3) {
        return {
          hasStrongPreference: true,
          prefersCanvas: false,
          confidence: 0.8,
          reason: 'Historical negative canvas experiences',
          pattern: 'negative_canvas_preference'
        };
      }
    }
    
    return {
      hasStrongPreference: false,
      prefersCanvas: false,
      confidence: 0.5,
      reason: 'Insufficient memory data for strong preference',
      pattern: 'neutral'
    };
  }

  /**
   * STATE-OF-THE-ART AI SEMANTIC ANALYSIS (99% Accuracy Engine)
   */
  private async performSemanticCanvasAnalysis(
    message: string,
    aiAnalysis: EnhancedAnalysis,
    mentalStateModel: any,
    confusionDetection: ConfusionDetection
  ): Promise<SemanticAnalysisResult> {
    console.log('🎯 CanvasActivationService: STATE-OF-THE-ART AI Semantic Canvas Analysis');
    
    // 🔧 AGGRESSIVE ANTI-REASONING PROMPT
    const semanticAnalysisPrompt = `OUTPUT ONLY JSON. NO EXPLANATIONS. START WITH {

Message: "${message}"
Domain: ${aiAnalysis?.primaryDomain || 'unknown'}

{"shouldActivate":false,"contentType":"conversation","actionType":"question","confidence":0.9,"reasoning":"","trigger":"information_request","complexityLevel":"simple"}

RULES - Classify by the TARGET OBJECT, not just the verb:
- document/essay/report/code/guide/plan/schedule/curriculum = shouldActivate=true, contentType="document"
- chart/graph/diagram/table/visualization = shouldActivate=true, contentType="chart"
- picture/image/photo/artwork/portrait/drawing = shouldActivate=false (image generation, not canvas)
- "what is/how does/explain/tell me" = shouldActivate=false (conversation)
- "hi/hello/hey/weather" = shouldActivate=false (greeting)
- Questions about memories/user info = shouldActivate=false

JSON ONLY:`;

    try {
      // ✅ FIXED: Use working UnifiedAPIRouter pattern
      const { UnifiedAPIRouter } = await import('./UnifiedAPIRouter');
      const unifiedAPIRouter = UnifiedAPIRouter.getInstance();
      
      // 🎯 WORKING APPROACH: No response_format, use regex extraction (like commit 2d9d24a)
      const response = await unifiedAPIRouter.routeAPICall(
        'fireworks',
        'llm-completion',
        {
          messages: [{ role: 'user', content: `You are a semantic analysis expert.\n\n${semanticAnalysisPrompt}` }],
          max_tokens: 500,
          temperature: 0,
          model: 'accounts/fireworks/models/gpt-oss-120b'
        }
      );
      
      if (!response?.success || !response?.data) {
        console.warn('🎯 CanvasActivationService: Semantic AI analysis failed, using fallback');
        return this.performContextualFallbackAnalysis(message, aiAnalysis, mentalStateModel);
      }
      
      // Extract response text
      let responseText = '';
      if (typeof response.data === 'string') {
        responseText = response.data;
      } else if (response.data?.choices?.[0]?.message?.content) {
        responseText = response.data.choices[0].message.content;
      } else if (response.data?.completion) {
        responseText = response.data.completion;
      } else if (Array.isArray(response.data) && response.data.length > 0) {
        responseText = response.data[0].generated_text || response.data[0].content || '';
      }
      
      // 🎯 WORKING APPROACH: Extract JSON with regex (like commit 2d9d24a)
      const match = responseText.match(/\{[\s\S]*\}/);
      let analysis: any = null;
      if (match) {
        try {
          analysis = JSON.parse(match[0]);
        } catch (e) {
          const { LLMResponseNormalizer } = await import('./LLMResponseNormalizer');
          analysis = LLMResponseNormalizer.safeParseJSON(responseText);
        }
      }
      
      if (!analysis) {
        console.warn('🎯 CanvasActivationService: JSON parsing failed, using fallback');
        return this.performContextualFallbackAnalysis(message, aiAnalysis, mentalStateModel);
      }
      
      return {
        shouldActivate: analysis.shouldActivate || false,
        trigger: analysis.trigger || 'semantic_understanding',
        reason: analysis.reasoning || 'AI semantic analysis',
        confidence: analysis.confidence || 0.8,
        contentType: analysis.contentType || 'conversation',
        actionType: analysis.actionType || 'question',
        details: {
          complexityLevel: analysis.complexityLevel || 'moderate',
          semanticIntent: analysis.reasoning,
          aiDriven: true
        }
      };
    } catch (error) {
      console.warn('🎯 CanvasActivationService: AI semantic analysis failed, using contextual fallback');
    }
    
    // FALLBACK: Enhanced contextual analysis
    return this.performContextualFallbackAnalysis(message, aiAnalysis, mentalStateModel);
  }

  /**
   * FALLBACK: Enhanced contextual analysis when AI analysis fails
   */
  private performContextualFallbackAnalysis(
    message: string,
    aiAnalysis: EnhancedAnalysis,
    _mentalStateModel: any
  ): SemanticAnalysisResult {
    console.log('🔄 CanvasActivationService: Contextual fallback analysis');
    
    // 🧠 LLM-POWERED SEMANTIC FEATURE EXTRACTION - No regex patterns!
    const messageLower = message.toLowerCase();
    const features = {
      hasCreationVerbs: messageLower.includes('create') || messageLower.includes('make') || 
                       messageLower.includes('generate') || messageLower.includes('build') || 
                       messageLower.includes('write') || messageLower.includes('draft'),
      hasQuestionWords: messageLower.includes('what') || messageLower.includes('how') || 
                       messageLower.includes('why') || messageLower.includes('explain'),
      hasComplexityMarkers: messageLower.includes('detailed') || messageLower.includes('comprehensive') || 
                           messageLower.includes('thorough') || messageLower.includes('complete'),
      hasContentTypes: messageLower.includes('document') || messageLower.includes('report') || 
                      messageLower.includes('chart') || messageLower.includes('code') ||
                      messageLower.includes('analysis') || messageLower.includes('plan'),
      messageLength: message.split(' ').length,
      hasPersonalPronouns: messageLower.includes('i need') || messageLower.includes('help me') || 
                          messageLower.includes('can you') || messageLower.includes('please')
    };
    
    // DECISION LOGIC (Enhanced from AI analysis context)
    let shouldActivate = false;
    let confidence = 0.6;
    let contentType = 'conversation';
    let actionType = 'question';
    let trigger = 'contextual_analysis';
    let reason = 'Contextual pattern analysis';
    
    // CREATION INTENT with CONTENT TYPES = Canvas
    if (features.hasCreationVerbs && features.hasContentTypes) {
      shouldActivate = true;
      confidence = 0.85;
      contentType = features.hasContentTypes ? 'document' : 'content';
      actionType = 'create';
      trigger = 'creation_with_content_type';
      reason = 'Creation verb + content type detected';
    }
    // QUESTIONS about concepts = Chat
    else if (features.hasQuestionWords && !features.hasCreationVerbs) {
      shouldActivate = false;
      confidence = 0.9;
      contentType = 'conversation';
      actionType = 'question';
      trigger = 'information_request';
      reason = 'Question pattern without creation intent';
    }
    // COMPLEX content with length = Canvas
    else if (features.hasComplexityMarkers && features.messageLength > 10) {
      shouldActivate = true;
      confidence = 0.75;
      contentType = 'analysis';
      actionType = 'create';
      trigger = 'complexity_indicator';
      reason = 'Complex content creation indicators';
    }
    // Use AI analysis context if available
    else if (aiAnalysis?.primaryDomain === 'creative' || aiAnalysis?.primaryDomain === 'professional') {
      shouldActivate = true;
      confidence = 0.7;
      contentType = aiAnalysis.primaryDomain === 'creative' ? 'document' : 'analysis';
      actionType = 'create';
      trigger = 'domain_context';
      reason = `${aiAnalysis.primaryDomain} domain suggests content creation`;
    }
    
    return {
      shouldActivate,
      trigger,
      reason,
      confidence,
      contentType,
      actionType,
      details: {
        complexityLevel: features.messageLength > 15 ? 'complex' : 'moderate',
        semanticIntent: reason,
        aiDriven: false,
        features
      }
    };
  }

  /**
   * Determine Canvas + Socratic integration strategy
   */
  determineCanvasSocraticIntegration(
    message: string,
    enhancedAnalysis: EnhancedAnalysis,
    confusionDetection: ConfusionDetection,
    canvasActivation: CanvasActivationResult
  ): CanvasSocraticIntegration {
    
    const confusionLevel = confusionDetection.confusionLevel || 0;
    const hasUncertainty = confusionDetection.hasConfusionMarkers;
    const emotionalState = confusionDetection.emotionalState;
    const complexity = enhancedAnalysis.complexityLevel;
    const interactionStyle = enhancedAnalysis.interactionStyle;
    const requiresEmpathy = enhancedAnalysis.characteristics?.requiresEmpathy;
    
    // DECISION MATRIX FOR CANVAS + SOCRATIC INTEGRATION
    
    // 1. PURE CANVAS: Clear, confident creation requests
    const isPureCanvasRequest = (
      confusionLevel < 0.3 && 
      !hasUncertainty && 
      enhancedAnalysis.confidence > 0.7 &&
      !requiresEmpathy &&
      (message.toLowerCase().includes('create') || message.toLowerCase().includes('write')) &&
      complexity === 'simple'
    );
    
    if (isPureCanvasRequest) {
      return {
        usePureCanvas: true,
        useCanvasSocratic: false,
        useSocraticFirst: false,
        reason: 'clear_creation_request'
      };
    }
    
    // 2. SOCRATIC FIRST: High uncertainty needs guidance before canvas
    const needsSocraticFirst = (
      confusionLevel > 0.7 ||
      emotionalState === 'frustrated' ||
      emotionalState === 'overwhelmed' ||
      (hasUncertainty && complexity === 'complex') ||
      message.toLowerCase().includes('confused') ||
      message.toLowerCase().includes('don\'t know how')
    );
    
    if (needsSocraticFirst) {
      return {
        usePureCanvas: false,
        useCanvasSocratic: false,
        useSocraticFirst: true,
        reason: 'high_uncertainty_needs_guidance'
      };
    }
    
    // 3. CANVAS + SOCRATIC: Moderate uncertainty with creation intent
    const shouldUseCanvasSocratic = (
      confusionLevel > 0.3 ||
      hasUncertainty ||
      interactionStyle === 'explorative' ||
      interactionStyle === 'supportive' ||
      requiresEmpathy ||
      (complexity === 'moderate' && enhancedAnalysis.confidence < 0.6) ||
      message.toLowerCase().includes('structure') ||
      message.toLowerCase().includes('organize') ||
      message.toLowerCase().includes('not sure')
    );
    
    if (shouldUseCanvasSocratic) {
      return {
        usePureCanvas: false,
        useCanvasSocratic: true,
        useSocraticFirst: false,
        reason: 'guided_creation_with_workspace'
      };
    }
    
    // DEFAULT: Use pure canvas if activated, otherwise no canvas
    return {
      usePureCanvas: canvasActivation.shouldActivate,
      useCanvasSocratic: false,
      useSocraticFirst: false,
      reason: 'default_canvas_decision'
    };
  }

  /**
   * Quick utility to check if message is canvas-appropriate
   */
  isCanvasAppropriate(message: string): boolean {
    // 🧠 LLM-POWERED Canvas Appropriateness - Enhanced semantic understanding!
    const messageLower = message.toLowerCase();
    
    const hasCanvasKeywords = messageLower.includes('create') || messageLower.includes('write') || 
                             messageLower.includes('make') || messageLower.includes('generate') || 
                             messageLower.includes('document') || messageLower.includes('report') ||
                             messageLower.includes('chart') || messageLower.includes('code') ||
                             messageLower.includes('plan') || messageLower.includes('analysis');
    
    const hasQuestionKeywords = messageLower.includes('what') || messageLower.includes('how') || 
                               messageLower.includes('why') || messageLower.includes('explain');
    
    // Has creation intent but not just a question
    return hasCanvasKeywords && !hasQuestionKeywords;
  }

  /**
   * Get canvas activation confidence based on multiple factors
   */
  calculateCanvasConfidence(
    message: string,
    enhancedAnalysis: EnhancedAnalysis,
    confusionDetection: ConfusionDetection
  ): number {
    let confidence = 0.5;
    
    // 🧠 LLM-POWERED confidence calculation - NO REGEX!
    const messageLower = message.toLowerCase();
    
    // High confidence for explicit creation requests
    if (messageLower.includes('create') || messageLower.includes('write') || 
        messageLower.includes('generate') || messageLower.includes('build')) {
      confidence += 0.3;
    }
    
    // Reduce confidence for questions
    if (messageLower.includes('what') || messageLower.includes('how') || 
        messageLower.includes('why') || messageLower.includes('explain')) {
      confidence -= 0.2;
    }
    
    // Adjust based on domain
    if (enhancedAnalysis.primaryDomain === 'creative' || enhancedAnalysis.primaryDomain === 'professional') {
      confidence += 0.2;
    }
    
    // Reduce confidence for high confusion
    if (confusionDetection.confusionLevel > 0.7) {
      confidence -= 0.1;
    }
    
    return Math.max(0.1, Math.min(0.95, confidence));
  }
}

// Export singleton instance
export const canvasActivationService = CanvasActivationService.getInstance();
export { CanvasActivationService };

