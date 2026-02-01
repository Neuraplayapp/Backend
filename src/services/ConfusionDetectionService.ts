/**
 * 🧠 CONFUSION DETECTION SERVICE
 * 
 * Focused service for detecting learning confusion and knowledge gaps.
 * Extracted from IntentAnalysisService monolith for clean separation of concerns.
 * 
 * SINGLE RESPONSIBILITY: Analyze user messages to detect confusion and determine
 * if Socratic engagement is appropriate.
 */

export interface ConfusionAnalysis {
  hasConfusionMarkers: boolean;
  confusionLevel: number;
  knowledgeGaps: string[];
  enableSocraticMode: boolean;
  emotionalState: string;
  domainContext: string;
  cognitiveInsights: string[];
}

export interface SocraticEngagement {
  shouldEngage: boolean;
  engagementLevel: number;
  hasUncertainty: boolean;
  reason: string;
}

export interface LearningContext {
  emotionalState: string;
  insights: string[];
}

export interface EnhancedAnalysis {
  primaryDomain: 'cognitive' | 'creative' | 'emotional' | 'social' | 'technical' | 'personal' | 'professional' | 'wellness';
  primaryIntent: 'creation' | 'informational' | 'conversational' | 'complex_workflow' | 'navigation' | 'modification' | 'analysis' | 'instructional' | 'evaluation' | 'clarification_request';
  complexityLevel: 'simple' | 'moderate' | 'complex' | 'expert';
  interactionStyle: 'formal' | 'casual' | 'supportive' | 'directive' | 'explorative' | 'playful';
  confidence: number;
  characteristics?: {
    isUrgent?: boolean;
    requiresEmpathy?: boolean;
    isAnalytical?: boolean;
    isCreative?: boolean;
    isExperimental?: boolean;
  };
}

class ConfusionDetectionService {
  private static instance: ConfusionDetectionService;

  static getInstance(): ConfusionDetectionService {
    if (!ConfusionDetectionService.instance) {
      ConfusionDetectionService.instance = new ConfusionDetectionService();
    }
    return ConfusionDetectionService.instance;
  }

  /**
   * MAIN ENTRY POINT: Detect confusion and determine Socratic engagement
   */
  async detectConfusion(message: string, enhancedAnalysis: EnhancedAnalysis): Promise<ConfusionAnalysis> {
    console.log('🎯 ConfusionDetectionService: Analyzing message for confusion markers');
    
    // 1. DETERMINE SOCRATIC ENGAGEMENT BASED ON EXISTING ANALYSIS
    const shouldEngageSocratically = await this.determineSocraticEngagement(enhancedAnalysis, message);
    
    // 2. EXTRACT LEARNING INSIGHTS FROM ENHANCED ANALYSIS
    const learningContext = this.extractLearningContext(enhancedAnalysis, message);
    
    // 3. IDENTIFY KNOWLEDGE GAPS BASED ON DOMAIN & COMPLEXITY
    const knowledgeGaps = this.identifyKnowledgeGapsFromAnalysis(enhancedAnalysis, message);
    
    // 4. BUILD COHERENT CONFUSION DETECTION
    return {
      hasConfusionMarkers: shouldEngageSocratically.hasUncertainty,
      confusionLevel: shouldEngageSocratically.engagementLevel,
      knowledgeGaps,
      enableSocraticMode: shouldEngageSocratically.shouldEngage,
      emotionalState: learningContext.emotionalState,
      domainContext: enhancedAnalysis.primaryDomain,
      cognitiveInsights: learningContext.insights
    };
  }

  /**
   * Determine if Socratic engagement is appropriate based on Enhanced Analysis
   */
  private async determineSocraticEngagement(enhancedAnalysis: EnhancedAnalysis, message: string): Promise<SocraticEngagement> {
    // CRITICAL FIX: Emotional support should NEVER use Socratic questioning
    const isEmotional = enhancedAnalysis.primaryDomain === 'emotional' || 
                       enhancedAnalysis.characteristics?.requiresEmpathy;
    
    if (isEmotional) {
      return {
        shouldEngage: false,
        engagementLevel: 0,
        hasUncertainty: false,
        reason: 'emotional_support_uses_empathetic_chat_not_socratic'
      };
    }
    
    // PRIMARY INDICATORS from Enhanced Analysis (excluding emotional)
    const isLearningOriented = enhancedAnalysis.primaryDomain === 'cognitive' || 
                              enhancedAnalysis.primaryIntent === 'clarification_request' ||
                              enhancedAnalysis.primaryIntent === 'instructional';
    
    const isExplorative = enhancedAnalysis.interactionStyle === 'explorative' || 
                         enhancedAnalysis.interactionStyle === 'supportive';
    
    const isComplex = enhancedAnalysis.complexityLevel === 'complex' || 
                     enhancedAnalysis.complexityLevel === 'expert';
    
    // 🧠 LLM-POWERED UNCERTAINTY DETECTION - NO REGEX PATTERNS!
    const hasLearningUncertainty = await this.detectLearningUncertaintyWithLLM(message, enhancedAnalysis);
    
    // CALCULATE ENGAGEMENT LEVEL (0.0 - 1.0) - ONLY for learning scenarios
    let engagementLevel = 0;
    
    if (isLearningOriented) engagementLevel += 0.4;
    if (isExplorative && !isEmotional) engagementLevel += 0.3; // Only if not emotional
    if (hasLearningUncertainty) engagementLevel += 0.4;
    if (isComplex && hasLearningUncertainty) engagementLevel += 0.2; // Only if confused about complexity
    
    // REDUCE engagement for simple greetings or urgent requests
    if (enhancedAnalysis.complexityLevel === 'simple' && enhancedAnalysis.confidence > 0.8) {
      engagementLevel *= 0.3;
    }
    if (enhancedAnalysis.characteristics?.isUrgent) {
      engagementLevel *= 0.5;
    }
    
    engagementLevel = Math.min(1.0, engagementLevel);
    
    // 🛡️ CRITICAL FIX: Never engage Socratic mode for casual conversation
    const isCasualConversation = enhancedAnalysis.primaryDomain === 'social' || 
                                enhancedAnalysis.primaryDomain === 'personal' ||
                                enhancedAnalysis.primaryIntent === 'conversational';
    
    // DECISION LOGIC - Only engage for learning scenarios with confusion, NEVER for casual conversation
    const shouldEngage = !isCasualConversation && 
                        ((engagementLevel > 0.4 && hasLearningUncertainty) || 
                         (isLearningOriented && hasLearningUncertainty));
    
    let reason = 'standard_response';
    if (isCasualConversation) {
      reason = 'casual_conversation_detected';
    } else if (shouldEngage) {
      if (isLearningOriented && hasLearningUncertainty) reason = 'learning_with_uncertainty';
      else if (isExplorative && hasLearningUncertainty) reason = 'explorative_learning_dialogue';
      else reason = 'complex_topic_guidance';
    }
    
    return {
      shouldEngage,
      engagementLevel,
      hasUncertainty: hasLearningUncertainty,
      reason
    };
    }
  
  /**
   * 🧠 LLM-POWERED Learning Uncertainty Detection - Replaces regex patterns with intelligence
   */
  private async detectLearningUncertaintyWithLLM(message: string, enhancedAnalysis: EnhancedAnalysis): Promise<boolean> {
    // 🔧 AGGRESSIVE ANTI-REASONING PROMPT
    const uncertaintyAnalysisPrompt = `OUTPUT ONLY JSON. NO EXPLANATIONS. START WITH {

Message: "${message}"
Domain: ${enhancedAnalysis.primaryDomain}

{"hasLearningUncertainty":false,"confidenceLevel":0.9,"uncertaintyType":"none","reasoning":""}

RULES:
- Casual chat/greetings = false
- Personal info sharing = false
- Educational confusion = true
- Technical questions = true

JSON ONLY:`;

    try {
      // Use ServiceContainer for API access
      const { serviceContainer } = await import('./ServiceContainer');
      const toolRegistry = serviceContainer.get('toolRegistry');
      
      if (!toolRegistry || typeof (toolRegistry as any).execute !== 'function') {
        // Fallback: Use Enhanced Analysis characteristics
        return enhancedAnalysis.primaryIntent === 'clarification_request' || 
               enhancedAnalysis.interactionStyle === 'explorative' ||
               enhancedAnalysis.complexityLevel === 'complex';
      }
      
      // 🎯 CRITICAL FIX from commit f4cc092: temperature 0.0 = NO reasoning tokens!
      const result = await (toolRegistry as any).execute('llm-completion', {
        prompt: `You are an uncertainty detection expert. Return ONLY valid JSON with no additional text, explanations, or reasoning.\n\n${uncertaintyAnalysisPrompt}`,
        model: 'accounts/fireworks/models/gpt-oss-20b',
        temperature: 0.0, // CRITICAL: Deterministic = no reasoning tokens
        maxTokens: 200
      }, { sessionId: '', userId: '', startTime: Date.now() });
      
      if (result?.success && result.data?.completion) {
        const responseText = result.data.completion;
        const match = responseText.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            const analysis = JSON.parse(match[0]);
            return analysis?.hasLearningUncertainty || false;
          } catch (e) {
            console.warn('⚠️ JSON parse failed in uncertainty detection');
          }
        }
      }
      
      // Fallback: Use Enhanced Analysis characteristics
      return enhancedAnalysis.primaryIntent === 'clarification_request' || 
             enhancedAnalysis.interactionStyle === 'explorative' ||
             enhancedAnalysis.complexityLevel === 'complex';
      
    } catch (error) {
      console.error('❌ ConfusionDetectionService: Uncertainty detection error:', error);
      // Fallback: Use Enhanced Analysis characteristics
      return enhancedAnalysis.primaryIntent === 'clarification_request' || 
             enhancedAnalysis.interactionStyle === 'explorative' ||
             enhancedAnalysis.complexityLevel === 'complex';
    }
  }
  
  /**
   * Extract learning context insights from enhanced analysis
   */
  private extractLearningContext(enhancedAnalysis: EnhancedAnalysis, _message: string): LearningContext {
    // USE ENHANCED ANALYSIS CHARACTERISTICS
    const insights: string[] = [];
    let emotionalState = 'neutral';
    
    if (enhancedAnalysis.characteristics?.requiresEmpathy) {
      emotionalState = 'needs_support';
      insights.push('requires empathetic approach');
    }
    
    if (enhancedAnalysis.characteristics?.isAnalytical) {
      insights.push('prefers systematic analysis');
    }
    
    if (enhancedAnalysis.characteristics?.isCreative) {
      insights.push('values creative exploration');
      emotionalState = 'curious';
    }
    
    if (enhancedAnalysis.interactionStyle === 'explorative') {
      emotionalState = 'curious';
      insights.push('ready for discovery-based learning');
    }
    
    if (enhancedAnalysis.complexityLevel === 'expert') {
      insights.push('capable of advanced concepts');
    }
    
    return {
      emotionalState,
      insights
    };
  }

  /**
   * Identify knowledge gaps based on domain and complexity analysis
   */
  private identifyKnowledgeGapsFromAnalysis(enhancedAnalysis: EnhancedAnalysis, _message: string): string[] {
    const gaps: string[] = [];
    
    // DOMAIN-SPECIFIC GAPS
    switch (enhancedAnalysis.primaryDomain) {
      case 'cognitive':
        gaps.push('concept_understanding', 'logical_reasoning');
        break;
      case 'technical':
        gaps.push('process_steps', 'systematic_approach');
        break;
      case 'creative':
        gaps.push('creative_process', 'ideation_methods');
        break;
      case 'emotional':
        gaps.push('emotional_awareness', 'coping_strategies');
        break;
      default:
        gaps.push('fundamental_understanding');
    }
    
    // COMPLEXITY-BASED GAPS
    if (enhancedAnalysis.complexityLevel === 'expert') {
      gaps.push('advanced_application');
    } else if (enhancedAnalysis.complexityLevel === 'simple') {
      gaps.push('basic_concepts');
    }
    
    // INTENT-BASED GAPS
    if (enhancedAnalysis.primaryIntent === 'clarification_request') {
      gaps.push('terminology', 'concept_clarity');
    }
    
    return gaps;
  }

  /**
   * 🚫 DEPRECATED: Use detectConfusion() with LLM intelligence instead of regex patterns
   */
  hasConfusionIndicators(message: string): boolean {
    console.warn('⚠️ hasConfusionIndicators() is deprecated - use detectConfusion() with LLM intelligence');
    // Fallback to simple heuristic - avoid regex patterns
    return message.includes('?') || message.includes('confused') || message.includes('understand');
  }

  /**
   * 🚫 DEPRECATED: Use detectConfusion() with LLM intelligence instead of regex patterns
   */
  calculateConfusionLevel(message: string): number {
    console.warn('⚠️ calculateConfusionLevel() is deprecated - use detectConfusion() with LLM intelligence');
    // Fallback to simple heuristic - avoid complex regex patterns
    return message.includes('confused') ? 0.7 : message.includes('?') ? 0.3 : 0.1;
  }
}

// Export singleton instance
export const confusionDetectionService = ConfusionDetectionService.getInstance();
export { ConfusionDetectionService };

