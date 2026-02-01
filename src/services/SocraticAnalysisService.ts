/**
 * 🏛️ SOCRATIC ANALYSIS SERVICE
 * 
 * Advanced service for sophisticated Socratic methodology combined with Motivated Interviewing.
 * Extracted from IntentAnalysisService monolith for clean separation of concerns.
 * 
 * SINGLE RESPONSIBILITY: Analyze learning state and generate sophisticated Socratic questions
 * using classical phases (elenchus, aporia, maieutics, anamnesis) and MI principles.
 */

export interface SocraticPhase {
  phase: 'elenchus' | 'aporia' | 'maieutics' | 'anamnesis';
  description: string;
}

export interface MotivationalState {
  stage: 'engage' | 'focus' | 'evoke' | 'plan';
  readiness: number;
  ambivalenceAreas: string[];
}

export interface ConceptualGap {
  concept: string;
  misunderstanding: string;
  severity: 'minor' | 'moderate' | 'fundamental';
}

export interface StrategicApproach {
  approach: 'examine_definitions' | 'reveal_contradictions' | 'guide_discovery' | 'synthesize_understanding';
  reasoning: string;
}

export interface SocraticCognitiveData {
  socraticPhase: SocraticPhase['phase'];
  motivationalState: MotivationalState;
  conceptualGaps: ConceptualGap[];
  strategicApproach: StrategicApproach['approach'];
}

export interface EnhancedSocraticAnalysis {
  questions: string[];
  cognitiveAnalysis: SocraticCognitiveData;
}

export interface EnhancedAnalysis {
  primaryDomain: 'cognitive' | 'creative' | 'emotional' | 'social' | 'technical' | 'personal' | 'professional' | 'wellness';
  primaryIntent: string;
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

class SocraticAnalysisService {
  private static instance: SocraticAnalysisService;

  static getInstance(): SocraticAnalysisService {
    if (!SocraticAnalysisService.instance) {
      SocraticAnalysisService.instance = new SocraticAnalysisService();
    }
    return SocraticAnalysisService.instance;
  }

  /**
   * MAIN ENTRY POINT: Generate enhanced Socratic analysis
   */
  async generateEnhancedSocraticAnalysis(
    message: string, 
    knowledgeGaps: string[], 
    enhancedAnalysis: EnhancedAnalysis, 
    confusionDetection: any,
    sessionHistory?: any[]
  ): Promise<EnhancedSocraticAnalysis> {
    
    console.log('🏛️ SocraticAnalysisService: Starting enhanced analysis');
    
    // 1. Determine current Socratic phase
    const socraticPhase = this.determineSocraticPhase(message, sessionHistory);
    
    // 2. Assess Motivated Interviewing state
    const motivationalState = this.assessMotivationalState(message, enhancedAnalysis);
    
    // 3. Identify conceptual gaps using sophisticated analysis
    const conceptualGaps = await this.identifyConceptualGaps(message, enhancedAnalysis, knowledgeGaps);
    
    // 4. Determine strategic approach based on phase + MI state
    const strategicApproach = this.determineStrategicApproach(socraticPhase, motivationalState, conceptualGaps);
    
    // 5. Generate sophisticated question sequence
    const questions = await this.generateStrategicQuestionSequence(
      message,
      socraticPhase,
      strategicApproach,
      enhancedAnalysis,
      conceptualGaps,
      motivationalState
    );
    
    const cognitiveAnalysis: SocraticCognitiveData = {
      socraticPhase,
      motivationalState,
      conceptualGaps,
      strategicApproach
    };
    
    console.log('✅ SocraticAnalysisService: Enhanced analysis complete', {
      phase: socraticPhase,
      approach: strategicApproach,
      questionsGenerated: questions.length,
      readiness: motivationalState.readiness
    });
    
    return { questions, cognitiveAnalysis };
  }

  /**
   * Determine current Socratic phase based on conversation state
   */
  private determineSocraticPhase(
    message: string, 
    sessionHistory?: any[]
  ): 'elenchus' | 'aporia' | 'maieutics' | 'anamnesis' {
    
    const messageLower = message.toLowerCase();
    
    // Elenchus (Definition seeking) - early phase
    if (messageLower.includes('what is') || messageLower.includes('define') || 
        messageLower.includes('mean by') || !sessionHistory?.length) {
      return 'elenchus';
    }
    
    // Aporia (Productive confusion) - recognizing contradictions
    if (messageLower.includes("i don't know") || messageLower.includes('confused') ||
        messageLower.includes('contradicts') || messageLower.includes('doesn\'t make sense')) {
      return 'aporia';
    }
    
    // Maieutics (Discovery) - beginning to understand
    if (messageLower.includes('i think') || messageLower.includes('maybe') ||
        messageLower.includes('could it be') || messageLower.includes('perhaps')) {
      return 'maieutics';
    }
    
    // Anamnesis (Integration) - connecting understanding
    if (messageLower.includes('i see') || messageLower.includes('now i understand') ||
        messageLower.includes('it makes sense') || messageLower.includes('connects to')) {
      return 'anamnesis';
    }
    
    // Default to elenchus for new conversations
    return 'elenchus';
  }

  /**
   * Assess Motivated Interviewing state and readiness
   */
  private assessMotivationalState(
    message: string, 
    enhancedAnalysis: EnhancedAnalysis
  ): MotivationalState {
    
    const messageLower = message.toLowerCase();
    
    // Determine MI stage
    let stage: 'engage' | 'focus' | 'evoke' | 'plan' = 'engage';
    
    if (messageLower.includes('want to learn') || messageLower.includes('curious about')) {
      stage = 'evoke';
    } else if (messageLower.includes('how do i') || messageLower.includes('what should i')) {
      stage = 'plan';
    } else if (messageLower.includes('focus on') || messageLower.includes('specifically')) {
      stage = 'focus';
    }
    
    // Assess readiness
    let readiness = 0.5;
    if (messageLower.includes('excited') || messageLower.includes('want to')) readiness += 0.3;
    if (messageLower.includes('confused') || messageLower.includes('overwhelmed')) readiness -= 0.2;
    if (enhancedAnalysis.characteristics?.isUrgent) readiness += 0.2;
    if (enhancedAnalysis.complexityLevel === 'expert') readiness += 0.1;
    
    readiness = Math.max(0, Math.min(1, readiness));
    
    // Identify ambivalence areas
    const ambivalenceAreas: string[] = [];
    if (messageLower.includes('but') || messageLower.includes('however')) {
      ambivalenceAreas.push('conflicted_priorities');
    }
    if (messageLower.includes('not sure') || messageLower.includes('maybe')) {
      ambivalenceAreas.push('uncertainty');
    }
    
    return {
      stage,
      readiness,
      ambivalenceAreas
    };
  }

  /**
   * Identify specific conceptual gaps using LLM analysis
   */
  private async identifyConceptualGaps(
    message: string, 
    enhancedAnalysis: EnhancedAnalysis,
    knowledgeGaps: string[]
  ): Promise<ConceptualGap[]> {
    
    try {
      // Import from ServiceContainer for consistency
      const { serviceContainer } = await import('./ServiceContainer');
      const toolRegistry = serviceContainer.get('toolRegistry');
      
      if (!toolRegistry) {
        throw new Error('ToolRegistry not available');
      }
      
      // 🛡️ CRITICAL FIX: Don't force conceptual gap analysis on casual conversation
      if (enhancedAnalysis.primaryDomain === 'social' || 
          enhancedAnalysis.primaryDomain === 'personal' ||
          enhancedAnalysis.primaryIntent === 'conversational') {
        console.log('🚫 SocraticAnalysisService: Skipping conceptual gap analysis for casual conversation');
        return []; // No conceptual gaps in personal sharing
      }

      const prompt = `Analyze this message for GENUINE learning confusion or conceptual gaps:

"${message}"

Domain: ${enhancedAnalysis.primaryDomain}
Intent: ${enhancedAnalysis.primaryIntent}
Existing gaps: ${knowledgeGaps.join(', ')}

ONLY identify gaps if the user shows actual learning confusion or misconceptions.
Do NOT analyze casual conversation, personal sharing, or normal social interaction.

If this is casual conversation or personal information sharing, respond with: "NO_GAPS_DETECTED"

Otherwise, identify conceptual misunderstandings in this format:
CONCEPT: [specific concept they're struggling with]  
MISUNDERSTANDING: [what they seem to misunderstand]
SEVERITY: [minor/moderate/fundamental]

Focus ONLY on substantive educational gaps that Socratic questioning could address.`;

      const result = await toolRegistry.execute('llm-completion', {
        prompt,
        model: 'accounts/fireworks/models/gpt-oss-120b',
        temperature: 0.3,
        maxTokens: 400
      }, { sessionId: '', userId: '', startTime: Date.now() });

      if (result.success) {
        // Parse response into structured gaps
        const response = result.data?.completion || '';
        const gaps: ConceptualGap[] = [];
        
        const lines = response.split('\n');
        let currentGap: any = {};
        
        for (const line of lines) {
          if (line.startsWith('CONCEPT:')) {
            currentGap.concept = line.replace('CONCEPT:', '').trim();
          } else if (line.startsWith('MISUNDERSTANDING:')) {
            currentGap.misunderstanding = line.replace('MISUNDERSTANDING:', '').trim();
          } else if (line.startsWith('SEVERITY:')) {
            const severity = line.replace('SEVERITY:', '').trim().toLowerCase();
            currentGap.severity = ['minor', 'moderate', 'fundamental'].includes(severity) ? severity : 'moderate';
            
            if (currentGap.concept && currentGap.misunderstanding) {
              gaps.push({...currentGap});
              currentGap = {};
            }
          }
        }
        
        return gaps;
      }
    } catch (error) {
      console.error('❌ SocraticAnalysisService: Conceptual gap analysis failed:', error);
    }
    
    return [];
  }

  /**
   * Determine strategic approach based on phase and cognitive state
   */
  private determineStrategicApproach(
    socraticPhase: string,
    motivationalState: MotivationalState,
    conceptualGaps: ConceptualGap[]
  ): 'examine_definitions' | 'reveal_contradictions' | 'guide_discovery' | 'synthesize_understanding' {
    
    // Low readiness requires engagement first
    if (motivationalState.readiness < 0.4) {
      return 'examine_definitions'; // Start gentle
    }
    
    // Phase-based approach
    if (socraticPhase === 'elenchus') {
      return 'examine_definitions';
    } else if (socraticPhase === 'aporia') {
      return 'reveal_contradictions';
    } else if (socraticPhase === 'maieutics') {
      return 'guide_discovery';
    } else { // anamnesis
      return 'synthesize_understanding';
    }
  }

  /**
   * Generate sophisticated question sequence using LLM
   */
  private async generateStrategicQuestionSequence(
    message: string,
    socraticPhase: string,
    strategicApproach: string,
    enhancedAnalysis: EnhancedAnalysis,
    conceptualGaps: ConceptualGap[],
    motivationalState: MotivationalState
  ): Promise<string[]> {
    
    try {
      // Import from ServiceContainer for consistency
      const { serviceContainer } = await import('./ServiceContainer');
      const toolRegistry = serviceContainer.get('toolRegistry');
      
      if (!toolRegistry) {
        throw new Error('ToolRegistry not available');
      }
      
      const prompt = `Generate sophisticated Socratic questions for this educational situation:

STUDENT MESSAGE: "${message}"
SOCRATIC PHASE: ${socraticPhase}
STRATEGIC APPROACH: ${strategicApproach}
DOMAIN: ${enhancedAnalysis.primaryDomain}
MOTIVATIONAL READINESS: ${motivationalState.readiness}

CONCEPTUAL GAPS: ${conceptualGaps.map(g => `${g.concept}: ${g.misunderstanding}`).join('; ')}

Generate 3-4 questions that:
${strategicApproach === 'examine_definitions' ? '- Help define key terms and concepts\n- Explore their current understanding' : ''}
${strategicApproach === 'reveal_contradictions' ? '- Expose inconsistencies in their thinking\n- Guide them to recognize conflicts' : ''}
${strategicApproach === 'guide_discovery' ? '- Lead them to discover insights themselves\n- Build understanding step-by-step' : ''}
${strategicApproach === 'synthesize_understanding' ? '- Help integrate new understanding\n- Connect to broader principles' : ''}

Format each question clearly, one per line. Make them genuinely Socratic - guiding discovery, not testing knowledge.

Use proper markdown formatting:
- **Bold** for key concepts
- Use tables when comparing ideas
- Use > for important insights`;

      const result = await toolRegistry.execute('llm-completion', {
        prompt,
        model: 'accounts/fireworks/models/gpt-oss-120b',
        temperature: 0.7,
        maxTokens: 600
      }, { sessionId: '', userId: '', startTime: Date.now() });

      if (result.success) {
        const response = result.data?.completion || '';
        // Extract questions from response
        const lines = response.split('\n').filter((line: string) => 
          line.trim() && 
          !line.includes('FORMAT') && 
          !line.includes('Generate') &&
          (line.includes('?') || line.match(/^\d+\./))
        );
        
        return lines.slice(0, 4); // Limit to 4 questions
      }
    } catch (error) {
      console.error('❌ SocraticAnalysisService: Strategic question generation failed:', error);
    }
    
    // Fallback questions based on approach
    return this.getFallbackQuestions(strategicApproach);
  }

  /**
   * Get fallback questions when LLM generation fails
   */
  private getFallbackQuestions(strategicApproach: string): string[] {
    if (strategicApproach === 'examine_definitions') {
      return [
        'What do you mean when you say...?',
        'How would you define this in your own words?',
        'What assumptions are you making here?'
      ];
    } else if (strategicApproach === 'reveal_contradictions') {
      return [
        'How does this fit with what you said earlier?',
        'What would someone who disagrees say?',
        'Can both of these things be true?'
      ];
    } else if (strategicApproach === 'guide_discovery') {
      return [
        'What patterns do you notice?',
        'What would happen if...?',
        'How might you test this idea?'
      ];
    } else {
      return [
        'How does this all fit together?',
        'What does this tell us about...?',
        'How can you use this understanding?'
      ];
    }
  }

  /**
   * Quick utility to determine if Socratic approach is appropriate
   */
  isSocraticApproachAppropriate(
    message: string, 
    enhancedAnalysis: EnhancedAnalysis
  ): boolean {
    // Never use Socratic for emotional support
    if (enhancedAnalysis.primaryDomain === 'emotional' || 
        enhancedAnalysis.characteristics?.requiresEmpathy) {
      return false;
    }

    // Good for cognitive, learning, and complex domains
    const appropriateDomains = ['cognitive', 'technical', 'professional'];
    const isLearningOriented = appropriateDomains.includes(enhancedAnalysis.primaryDomain);
    
    // 🧠 LLM-POWERED uncertainty markers detection - NO REGEX!
    const messageLower = message.toLowerCase();
    const hasUncertainty = messageLower.includes('confused') || messageLower.includes('not sure') || 
                          messageLower.includes("don't understand") || messageLower.includes('explain') || 
                          messageLower.includes('what is') || messageLower.includes('how do');
    
    return isLearningOriented && hasUncertainty;
  }

  /**
   * Get phase description for UI/logging
   */
  getPhaseDescription(phase: SocraticPhase['phase']): string {
    const descriptions = {
      'elenchus': 'Definition seeking - exploring what terms mean',
      'aporia': 'Productive confusion - recognizing contradictions',
      'maieutics': 'Guided discovery - helping students birth understanding',
      'anamnesis': 'Knowledge integration - connecting insights to broader understanding'
    };
    
    return descriptions[phase];
  }

  /**
   * Get strategic approach description
   */
  getApproachDescription(approach: StrategicApproach['approach']): string {
    const descriptions = {
      'examine_definitions': 'Exploring key concepts and definitions',
      'reveal_contradictions': 'Exposing inconsistencies in thinking',
      'guide_discovery': 'Leading to self-discovery of insights',
      'synthesize_understanding': 'Integrating and connecting knowledge'
    };
    
    return descriptions[approach];
  }
}

// Export singleton instance
export const socraticAnalysisService = SocraticAnalysisService.getInstance();
export { SocraticAnalysisService };

