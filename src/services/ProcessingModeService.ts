/**
 * 🎯 PROCESSING MODE SERVICE
 * 
 * Focused service for determining the appropriate processing mode and detecting tool requests.
 * Extracted from IntentAnalysisService monolith for clean separation of concerns.
 * 
 * SINGLE RESPONSIBILITY: Route user requests to the correct handler based on analysis
 */

export interface ProcessingModeResult {
  mode: 'tool-calling' | 'agent' | 'chat' | 'socratic_chat' | 'vision';
  reasoning: string;
  confidence: number;
  toolRequests?: ToolRequests;
}

export interface ToolRequests {
  isMemoryRequest: boolean;
  isSearchRequest: boolean;
  isWeatherRequest: boolean;
  isImageRequest: boolean;
  isNavigationRequest: boolean;
  isSettingsRequest: boolean;
}

export interface EnhancedAnalysis {
  primaryDomain: 'cognitive' | 'creative' | 'emotional' | 'social' | 'technical' | 'personal' | 'professional' | 'wellness';
  primaryIntent: 'creation' | 'informational' | 'conversational' | 'complex_workflow' | 'navigation' | 'modification' | 'analysis' | 'instructional' | 'evaluation' | 'clarification_request';
  complexityLevel: 'simple' | 'moderate' | 'complex' | 'expert';
  interactionStyle: 'formal' | 'casual' | 'supportive' | 'directive' | 'explorative' | 'playful';
  confidence: number;
  shouldExecute: boolean;
  requiresEmpathy?: boolean;
  characteristics?: {
    isUrgent?: boolean;
    requiresEmpathy?: boolean;
    isAnalytical?: boolean;
    isCreative?: boolean;
    isCollaborative?: boolean;
    isExperimental?: boolean;
  };
}

export interface ConfusionDetection {
  hasConfusionMarkers: boolean;
  confusionLevel: number;
  knowledgeGaps: string[];
  enableSocraticMode: boolean;
  emotionalState: string;
  domainContext: string;
  cognitiveInsights: string[];
}

export interface ContextState {
  lastNTurns: any[];
  extractedEntities: string[];
  outstandingQuestions: string[];
  domainFocusDrift: number;
}

class ProcessingModeService {
  private static instance: ProcessingModeService;

  static getInstance(): ProcessingModeService {
    if (!ProcessingModeService.instance) {
      ProcessingModeService.instance = new ProcessingModeService();
    }
    return ProcessingModeService.instance;
  }

  /**
   * MAIN ENTRY POINT: Select the appropriate processing mode
   */
  async selectProcessingMode(
    enhancedAnalysis: EnhancedAnalysis, 
    confusionDetection: ConfusionDetection, 
    contextState: ContextState,
    originalMessage?: string,
    preComputedToolRequests?: ToolRequests // PERFORMANCE: Accept pre-computed result to avoid duplicate LLM call
  ): Promise<ProcessingModeResult> {
    
    console.log('🎯 ProcessingModeService: Analyzing message for processing mode');
    
    // Defensive guard – if analysis failed, fall back to chat mode
    if (!enhancedAnalysis || !enhancedAnalysis.characteristics) {
      return { 
        mode: 'chat', 
        reasoning: 'Analysis failed, using fallback mode',
        confidence: 0.3
      };
    }

    const message = (originalMessage || '').toLowerCase();
    
    // 🧠 LLM-POWERED TOOL-CALLING DETECTION for search, weather, and other API services
    // PERFORMANCE: Use pre-computed result if available to avoid duplicate LLM call
    const toolRequests = preComputedToolRequests || await this.detectToolRequests(originalMessage || '');
    
    if (toolRequests.isSearchRequest || toolRequests.isWeatherRequest || 
        toolRequests.isMemoryRequest || toolRequests.isImageRequest ||
        toolRequests.isNavigationRequest || toolRequests.isSettingsRequest) {
      console.log('🔧 ProcessingModeService: EXPLICIT TOOL DETECTION ->', toolRequests);
      return { 
        mode: 'tool-calling',
        reasoning: 'Explicit tool request detected',
        confidence: 0.9,
        toolRequests
      };
    }

    // Socratic mode override for confusion
    if (confusionDetection.enableSocraticMode) {
      return { 
        mode: 'socratic_chat',
        reasoning: 'Confusion detected, using Socratic methodology',
        confidence: 0.8
      };
    }
    
    // 🧠 LLM-POWERED SIMPLE GREETING DETECTION - Enhanced Analysis provides better context
    const isSimpleGreeting = enhancedAnalysis.complexityLevel === 'simple' && 
                             enhancedAnalysis.primaryIntent === 'conversational' &&
                             enhancedAnalysis.confidence > 0.8;
    if (isSimpleGreeting && enhancedAnalysis.complexityLevel === 'simple') {
      return { 
        mode: 'chat',
        reasoning: 'Simple greeting, using casual chat',
        confidence: 0.9
      };
    }
    
    // Emotional support mode -> map to CHAT for empathetic responses (not Socratic questioning)
    if ((enhancedAnalysis.primaryDomain === 'emotional' || enhancedAnalysis.requiresEmpathy) && !isSimpleGreeting) {
      return { 
        mode: 'chat',
        reasoning: 'Emotional support required, using empathetic chat',
        confidence: 0.85
      };
    }
    
    // Creative mode -> map to chat with creative characteristics
    if (enhancedAnalysis.primaryDomain === 'creative' || enhancedAnalysis.characteristics?.isCreative) {
      return { 
        mode: 'chat',
        reasoning: 'Creative request, using conversational approach',
        confidence: 0.8
      };
    }
    
    // Analytical mode -> map to tool-calling for systematic analysis
    if (enhancedAnalysis.characteristics?.isAnalytical || enhancedAnalysis.complexityLevel === 'expert') {
      return { 
        mode: 'tool-calling',
        reasoning: 'Analytical or expert-level request, using tools',
        confidence: 0.8
      };
    }
    
    // Collaborative mode -> map to chat for interactive collaboration
    if (enhancedAnalysis.characteristics?.isCollaborative) {
      return { 
        mode: 'chat',
        reasoning: 'Collaborative request, using interactive chat',
        confidence: 0.75
      };
    }
    
    // Technical/Professional domains with high confidence
    if ((enhancedAnalysis.primaryDomain === 'technical' || enhancedAnalysis.primaryDomain === 'professional') 
        && enhancedAnalysis.confidence > 0.7) {
      return { 
        mode: 'tool-calling',
        reasoning: 'High-confidence technical/professional request',
        confidence: 0.8
      };
    }
    
    // Complex workflows or urgent requests
    if (enhancedAnalysis.primaryIntent === 'complex_workflow' || enhancedAnalysis.characteristics?.isUrgent) {
      return { 
        mode: 'agent',
        reasoning: 'Complex workflow or urgent request, using agent orchestration',
        confidence: 0.85
      };
    }
    
    // High-confidence actionable intents
    if (enhancedAnalysis.shouldExecute && enhancedAnalysis.confidence > 0.7) {
      return { 
        mode: 'tool-calling',
        reasoning: 'High-confidence actionable intent',
        confidence: 0.8
      };
    }
    
    // Medium confidence actionable intents
    if (enhancedAnalysis.shouldExecute && enhancedAnalysis.confidence > 0.4) {
      return { 
        mode: 'tool-calling',
        reasoning: 'Medium-confidence actionable intent',
        confidence: 0.6
      };
    }
    
    // Default to chat
    return { 
      mode: 'chat',
      reasoning: 'Default conversational mode',
      confidence: 0.5
    };
  }

  /**
   * 🧠 LLM-POWERED Tool Request Detection - SMART SEMANTIC ANALYSIS
   */
  async detectToolRequests(message: string): Promise<ToolRequests> {
    console.log('🎯 ProcessingModeService: LLM-powered tool detection analysis');
    
    const toolDetectionPrompt = `Analyze user message and classify tool requirements.

Message: "${message}"

Tool categories:
1. SEARCH: Real-time info (news, stocks, weather, events) or explicit "search/google" requests. NOT general knowledge.
2. WEATHER: Weather/forecast/climate
3. MEMORY: Store/recall personal info (explicit: "remember my name" OR implicit: "I'm a teacher")
4. IMAGE: ARTISTIC/CREATIVE visuals ONLY
   ✓ TRUE: "draw cat", "create sunset image", "what would dragon look like", "portrait", "artwork"
   ✗ FALSE: "chart", "graph", "plot", "diagram", "visualize data", "flowchart", "table"
5. NAVIGATION: Navigate to app pages
6. SETTINGS: Change preferences/theme/settings

Return JSON:
{
  "isSearchRequest": boolean,
  "isWeatherRequest": boolean,
  "isMemoryRequest": boolean,
  "isImageRequest": boolean,
  "isNavigationRequest": boolean,
  "isSettingsRequest": boolean,
  "reasoning": "brief explanation"
}`;

    try {
      // ✅ FIXED: Use working UnifiedAPIRouter pattern with explicit JSON formatting
      const { UnifiedAPIRouter } = await import('./UnifiedAPIRouter');
      const unifiedAPIRouter = UnifiedAPIRouter.getInstance();
      
      const response = await unifiedAPIRouter.routeAPICall(
        'fireworks',
        'llm-completion',
        {
          messages: [
            { role: 'system', content: 'You are a classifier. Respond ONLY with valid JSON. No markdown, no explanations, no reasoning.' },
            { role: 'user', content: toolDetectionPrompt }
          ],
          max_tokens: 400,
          temperature: 0.0, // CRITICAL: Deterministic = no reasoning tokens
          model: 'accounts/fireworks/models/gpt-oss-20b'
          // REMOVED response_format - Fireworks doesn't support it properly, causes prompt echo/truncation
        }
      );
      
      if (response?.success && response?.data) {
        let responseText = '';
        
        // Handle different response formats (following CoreTools pattern)
        if (typeof response.data === 'string') {
          responseText = response.data;
        } else if (response.data?.choices?.[0]?.message?.content) {
          responseText = response.data.choices[0].message.content;
        } else if (response.data?.completion) {
          responseText = response.data.completion;
        } else if (Array.isArray(response.data) && response.data.length > 0) {
          // Handle backend success format with data array (from CoreTools pattern)
          const firstItem = response.data[0];
          responseText = firstItem.generated_text || firstItem.content || firstItem.message || '';
        } else if (response.response) {
          // Handle backend error fallback format
          responseText = response.response;
        }
        
        if (responseText) {
          // ENHANCED: Try multiple JSON extraction strategies
          let jsonString = null;
          
          // Strategy 1: Direct parse (for clean JSON responses)
          try {
            const parsed = JSON.parse(responseText);
            if (parsed && typeof parsed === 'object') {
              jsonString = responseText;
            }
          } catch (e) {
            // Continue to other strategies
          }
          
          // Strategy 2: Extract from markdown code blocks
          if (!jsonString) {
            const codeBlockMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
            if (codeBlockMatch) {
              jsonString = codeBlockMatch[1];
            }
          }
          
          // Strategy 3: Find JSON object in text
          if (!jsonString) {
          const match = responseText.match(/\{[\s\S]*\}/);
          if (match) {
              jsonString = match[0];
            }
          }
          
          // Strategy 4: If starts with '{ ' due to priming, complete it
          if (!jsonString && responseText.trim().startsWith('{')) {
            jsonString = responseText.trim();
          }
          
          if (jsonString) {
            try {
              const analysis = JSON.parse(jsonString);
              
              const toolRequests: ToolRequests = {
                isSearchRequest: analysis.isSearchRequest || false,
                isWeatherRequest: analysis.isWeatherRequest || false,
                isMemoryRequest: analysis.isMemoryRequest || false,
                isImageRequest: analysis.isImageRequest || false,
                isNavigationRequest: analysis.isNavigationRequest || false,
                isSettingsRequest: analysis.isSettingsRequest || false
              };
              
              console.log('✅ ProcessingModeService: LLM tool detection result:', toolRequests);
              return toolRequests;
            } catch (jsonError) {
              console.warn('⚠️ ProcessingModeService: JSON parse error after extraction:', jsonError);
              console.warn('⚠️ ProcessingModeService: Attempted to parse:', jsonString.substring(0, 200));
            }
          } else {
            console.warn('⚠️ ProcessingModeService: No JSON found in response:', responseText.substring(0, 200));
          }
        } else {
          console.warn('⚠️ ProcessingModeService: No response text received');
        }
      } else {
        console.warn('⚠️ ProcessingModeService: Invalid response format:', { success: response?.success, hasData: !!response?.data });
      }
      
      console.warn('🎯 ProcessingModeService: LLM analysis failed, using fallback');
      return this.getFallbackToolDetection(message);
      
    } catch (error) {
      console.error('❌ ProcessingModeService: Tool detection error:', error);
      console.warn('🎯 ProcessingModeService: LLM analysis failed, using fallback');
      return this.getFallbackToolDetection(message);
    }
  }
  
  /**
   * 🧠 SMART FALLBACK - When LLM unavailable, uses semantic keyword analysis
   * Respects chart/canvas boundaries while detecting creative image requests
   */
  private getFallbackToolDetection(message: string): ToolRequests {
    const messageLower = message.toLowerCase().trim();
    
    console.log('🛡️ ProcessingModeService: Using smart fallback (LLM preferred)');
    
    // Navigation patterns - for agentic control
    const navigationPatterns = [
      'go to', 'take me to', 'navigate to', 'open ', 'show me the ', 
      'bring me to', 'visit ', 'head to', 'switch to'
    ];
    const isNavigation = navigationPatterns.some(p => messageLower.includes(p)) ||
      /\b(go|take|navigate|open|show|bring|visit|head|switch)\s+(to\s+)?(the\s+)?(home|homepage|dashboard|forum|profile|playground|settings|registration|signin|about)/i.test(messageLower);
    
    // Settings patterns - for agentic control (comprehensive)
    const settingsPatterns = [
      'change my', 'set my', 'update my', 'turn on', 'turn off',
      'enable', 'disable', 'switch to dark', 'switch to light',
      'change theme', 'set theme', 'toggle', 'make it dark', 'make it light',
      'dark mode', 'light mode', 'bright mode', 'dark theme', 'light theme',
      'go dark', 'go light', 'use dark', 'use light'
    ];
    const isSettings = settingsPatterns.some(p => messageLower.includes(p));
    
    // 🔍 SEARCH/NEWS DETECTION - Comprehensive patterns
    const searchPatterns = [
      'search', 'google', 'find', 'lookup', 'look up',
      'research', 'investigate', 'what is', 'who is', 'tell me about'
    ];
    const newsPatterns = [
      'news', 'latest', 'current events', 'breaking', 'recent',
      'happening', 'update on', 'updates on', 'what\'s happening',
      'whats happening', 'today\'s', 'todays', 'this week'
    ];
    const isSearchOrNews = searchPatterns.some(p => messageLower.includes(p)) ||
                           newsPatterns.some(p => messageLower.includes(p));
    
    // 🎯 SMART IMAGE DETECTION - Respects chart/canvas boundaries
    // Step 1: Check for CHART/DATA exclusions FIRST (these NEVER go to image)
    const chartExclusionTerms = [
      'chart', 'graph', 'plot', 'diagram', 'flowchart', 'table', 
      'statistics', 'data', 'metrics', 'analytics', 'trends',
      'bar chart', 'pie chart', 'line graph', 'scatter plot', 'histogram',
      'visualization of data', 'visualize the data', 'visualize statistics',
      'spreadsheet', 'document', 'report', 'essay', 'write'
    ];
    const isChartOrCanvasRequest = chartExclusionTerms.some(term => messageLower.includes(term));
    
    // Step 2: Check for CREATIVE image indicators
    const creativeImageTerms = [
      'draw', 'image of', 'picture of', 'photo of', 'artwork',
      'illustration', 'portrait', 'scene', 'landscape', 'create an image',
      'generate an image', 'make an image', 'show me what', 'look like',
      'imagine', 'depict', 'render', 'artistic', 'creative visual'
    ];
    const hasCreativeImageIntent = creativeImageTerms.some(term => messageLower.includes(term));
    
    // Step 3: Final image decision - creative intent AND NOT chart/canvas
    const isImageRequest = hasCreativeImageIntent && !isChartOrCanvasRequest;
    
    console.log('🔍 ProcessingModeService: Fallback detection:', {
      isSearchOrNews,
      isImageRequest,
      isNavigation,
      isSettings,
      message: messageLower.substring(0, 50)
    });
    
    return {
      isSearchRequest: isSearchOrNews,
      isWeatherRequest: messageLower.includes('weather') || messageLower.includes('temperature') || messageLower.includes('forecast'),
      isMemoryRequest: messageLower.includes('my name') || messageLower.includes('is my name') || messageLower.includes('remember') || messageLower.includes('recall'),
      isImageRequest: isImageRequest,
      isNavigationRequest: isNavigation,
      isSettingsRequest: isSettings
    };
  }

  /**
   * Apply tool request overrides to processing mode
   */
  applyToolRequestOverrides(
    currentMode: 'tool-calling' | 'agent' | 'chat' | 'socratic_chat' | 'vision',
    toolRequests: ToolRequests
  ): 'tool-calling' | 'agent' | 'chat' | 'socratic_chat' | 'vision' {
    
    // CONTINUITY FIX: Keep ALL conversation in chat mode
    // ChatHandler now handles ALL conversation AND tool execution
    // No more mode switching that breaks conversation continuity!
    if (currentMode === 'chat') {
      console.log('🗣️ CONTINUITY: Keeping in chat mode for unbroken conversation flow');
      return 'chat';
    }
    
    // Only allow mode switching for specific non-conversational modes
    if (currentMode === 'vision' || currentMode === 'agent' || currentMode === 'socratic_chat') {
      return currentMode;
    }

    // Default to chat for conversation continuity
    return 'chat';
  }

  /**
   * 🧠 LLM-POWERED Vision Mode Detection - Uses Enhanced Analysis instead of regex
   */
  shouldUseVisionMode(enhancedAnalysis: any, hasVisualContent: boolean = false): boolean {
    // Primary check: Has visual content attached
    if (hasVisualContent) return true;
    
    // Secondary check: Enhanced Analysis indicates visual/image domain
    return enhancedAnalysis?.primaryDomain === 'creative' && 
           enhancedAnalysis?.characteristics?.isCreative &&
           enhancedAnalysis?.primaryIntent === 'analysis';
  }

  /**
   * Get detailed explanation of mode selection
   */
  getModeExplanation(mode: 'tool-calling' | 'agent' | 'chat' | 'socratic_chat' | 'vision'): string {
    const explanations = {
      'tool-calling': 'Uses specific tools and APIs to accomplish tasks. Best for searches, weather, calculations, and concrete actions.',
      'agent': 'Orchestrates multiple tools and complex workflows. Best for multi-step tasks and urgent requests.',
      'chat': 'Conversational interaction with the AI. Best for discussions, creative work, and emotional support.',
      'socratic_chat': 'Guided learning through questioning. Best when confusion is detected and learning is needed.',
      'vision': 'Multimodal AI for visual content analysis. Best when images or visual elements are involved.'
    };
    
    return explanations[mode];
  }

  /**
   * Check if mode transition is allowed
   */
  isValidModeTransition(
    fromMode: string, 
    toMode: 'tool-calling' | 'agent' | 'chat' | 'socratic_chat' | 'vision'
  ): boolean {
    // All transitions are allowed, but some are more natural than others
    const naturalTransitions = {
      'chat': ['socratic_chat', 'tool-calling'],
      'socratic_chat': ['chat', 'tool-calling'],
      'tool-calling': ['chat', 'agent'],
      'agent': ['tool-calling', 'chat'],
      'vision': ['chat', 'tool-calling']
    };
    
    return !naturalTransitions[fromMode] || naturalTransitions[fromMode].includes(toMode);
  }

  /**
   * Get tool request summary for logging
   */
  getToolRequestSummary(toolRequests: ToolRequests): string {
    const activeTools = Object.entries(toolRequests)
      .filter(([_, isActive]) => isActive)
      .map(([tool, _]) => tool.replace('is', '').replace('Request', '').toLowerCase());
    
    return activeTools.length > 0 ? `Tools: ${activeTools.join(', ')}` : 'No tools requested';
  }

  /**
   * Calculate confidence score for mode selection
   */
  calculateModeConfidence(
    enhancedAnalysis: EnhancedAnalysis,
    confusionDetection: ConfusionDetection,
    toolRequests: ToolRequests
  ): number {
    let confidence = 0.5; // Base confidence
    
    // High confidence for explicit tool requests
    if (Object.values(toolRequests).some(Boolean)) {
      confidence = 0.9;
    }
    
    // High confidence for clear confusion
    if (confusionDetection.enableSocraticMode && confusionDetection.confusionLevel > 0.6) {
      confidence = 0.85;
    }
    
    // Use analysis confidence as baseline
    if (enhancedAnalysis.confidence) {
      confidence = Math.max(confidence, enhancedAnalysis.confidence);
    }
    
    // Reduce confidence for edge cases
    if (enhancedAnalysis.complexityLevel === 'expert' && enhancedAnalysis.confidence < 0.6) {
      confidence *= 0.7;
    }
    
    return Math.min(0.95, Math.max(0.1, confidence));
  }
}

// Export singleton instance
export const processingModeService = ProcessingModeService.getInstance();
export { ProcessingModeService };

