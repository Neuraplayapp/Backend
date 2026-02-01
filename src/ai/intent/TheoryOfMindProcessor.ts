// Theory of Mind Processor - Neuropsychological Equivalent: Temporoparietal Junction (TPJ)
// ChatGPT Equivalent: Intention Understanding System / Mental State Modeling
// Understands user intentions, beliefs, and mental states behind their words

export interface MentalStateModel {
  intendedMeaning: string;
  expressedMeaning: string;
  beliefState: {
    userBeliefs: string[];
    userAssumptions: string[];
    knowledgeGaps: string[];
  };
  intentionalStance: {
    primaryGoal: string;
    secondaryGoals: string[];
    emotionalState: string;
    cognitiveLoad: number;
  };
  communicativeIntent: {
    directSpeechAct: string;
    indirectSpeechAct?: string;
    pragmaticImplicature?: string;
  };
}

export interface CorrectionAnalysis {
  isCorrection: boolean;
  correctionType: 'factual' | 'interpretive' | 'contextual' | 'emotional';
  originalIntention: string;
  correctedIntention: string;
  mentalModelMismatch: {
    aiMisunderstood: string;
    userActuallyMeant: string;
    gapInUnderstanding: string;
  };
}

export class TheoryOfMindProcessor {
  private static instance: TheoryOfMindProcessor;

  static getInstance(): TheoryOfMindProcessor {
    if (!this.instance) {
      this.instance = new TheoryOfMindProcessor();
    }
    return this.instance;
  }

  /**
   * STATE-OF-THE-ART: Model user's mental state and intentions
   * Mimics temporoparietal junction theory of mind processing
   */
  async analyzeUserMentalState(
    currentMessage: string,
    conversationHistory: any[],
    errorSignals: any[]
  ): Promise<MentalStateModel> {
    console.log('🧠 Theory of Mind Processor: Analyzing user mental state');

    // COGNITIVE LAYER 1: Intention Recognition
    const intentionalAnalysis = await this.recognizeIntentions(currentMessage, conversationHistory);
    
    // COGNITIVE LAYER 2: Belief State Modeling
    const beliefState = this.modelBeliefState(currentMessage, conversationHistory);
    
    // COGNITIVE LAYER 3: Communicative Intent Extraction
    const communicativeIntent = this.extractCommunicativeIntent(currentMessage, errorSignals);
    
    // COGNITIVE LAYER 4: Mental Model Integration
    const mentalState = this.integrateMentalModel(
      currentMessage,
      intentionalAnalysis,
      beliefState,
      communicativeIntent
    );

    console.log('🧠 Mental State Analysis:', {
      primaryGoal: mentalState.intentionalStance.primaryGoal,
      emotionalState: mentalState.intentionalStance.emotionalState,
      hasImplicature: !!mentalState.communicativeIntent.pragmaticImplicature,
      knowledgeGaps: mentalState.beliefState.knowledgeGaps.length
    });

    return mentalState;
  }

  /**
   * NEUROLOGICAL EQUIVALENT: Detect and analyze correction intentions
   */
  async processCorrectionMentalState(
    currentMessage: string,
    errorSignals: any[],
    conversationHistory: any[]
  ): Promise<CorrectionAnalysis> {
    console.log('🔧 Processing correction mental state...');

    const correctionSignals = errorSignals.filter(signal => 
      ['correction', 'contradiction', 'misunderstanding'].includes(signal.errorType)
    );

    if (correctionSignals.length === 0) {
      return {
        isCorrection: false,
        correctionType: 'factual',
        originalIntention: '',
        correctedIntention: '',
        mentalModelMismatch: {
          aiMisunderstood: '',
          userActuallyMeant: '',
          gapInUnderstanding: ''
        }
      };
    }

    // NEURAL PROCESSING: Understand the correction type and intention
    const correctionType = this.classifyCorrectionType(currentMessage, correctionSignals);
    const intentionMapping = await this.mapOriginalToCorrectedIntention(
      currentMessage,
      conversationHistory
    );
    const mentalModelMismatch = this.analyzeMentalModelMismatch(
      currentMessage,
      correctionSignals,
      conversationHistory
    );

    return {
      isCorrection: true,
      correctionType,
      originalIntention: intentionMapping.original,
      correctedIntention: intentionMapping.corrected,
      mentalModelMismatch
    };
  }

  /**
   * INTENTION RECOGNITION: What does the user actually want?
   */
  private async recognizeIntentions(message: string, _history: any[]): Promise<any> {
    // STATE-OF-THE-ART: Multi-layered intention analysis
    const intentionMarkers = {
      correction: /\b(actually|really|meant|intended|trying to say)\b/gi,
      clarification: /\b(clarify|explain|be clear|make sure)\b/gi,
      frustration: /\b(frustrated|confused|not understanding)\b/gi,
      continuation: /\b(also|additionally|furthermore|by the way)\b/gi,
      emphasis: /\b(important|key|critical|essential|main)\b/gi
    };

    let primaryGoal = 'communicate';
    let secondaryGoals: string[] = [];
    let emotionalState = 'neutral';
    let cognitiveLoad = 0;

    // Analyze intention markers
    Object.entries(intentionMarkers).forEach(([intent, pattern]) => {
      const matches = message.match(pattern);
      if (matches) {
        if (intent === 'correction' && matches.length > 0) {
          primaryGoal = 'correct_misunderstanding';
          emotionalState = 'focused';
        }
        secondaryGoals.push(intent);
        cognitiveLoad += matches.length;
      }
    });

    // Analyze message complexity for cognitive load
    const wordCount = message.split(' ').length;
    const complexityScore = this.calculateComplexityScore(message);
    cognitiveLoad += Math.floor(wordCount / 20) + complexityScore;

    // Detect emotional state from language patterns
    emotionalState = this.detectEmotionalState(message);

    return {
      primaryGoal,
      secondaryGoals,
      emotionalState,
      cognitiveLoad: Math.min(cognitiveLoad, 10) // Cap at 10
    };
  }

  /**
   * BELIEF STATE MODELING: What does the user believe and assume?
   */
  private modelBeliefState(message: string, _history: any[]): any {
    const userBeliefs: string[] = [];
    const userAssumptions: string[] = [];
    const knowledgeGaps: string[] = [];

    // Extract explicit beliefs
    const beliefMarkers = message.match(/\b(i think|i believe|i assume|i know|i'm sure)\s+(.+?)(?:[.!?]|$)/gi);
    if (beliefMarkers) {
      beliefMarkers.forEach(marker => {
        const belief = marker.replace(/^(i think|i believe|i assume|i know|i'm sure)\s+/i, '').trim();
        userBeliefs.push(belief);
      });
    }

    // Extract assumptions
    const assumptionMarkers = message.match(/\b(obviously|clearly|of course|naturally)\b/gi);
    if (assumptionMarkers) {
      assumptionMarkers.forEach(assumption => {
        userAssumptions.push(`User assumes ${assumption} is evident`);
      });
    }

    // Detect knowledge gaps
    const gapMarkers = message.match(/\b(don't understand|unclear|confused|not sure|don't know)\s+(.+?)(?:[.!?]|$)/gi);
    if (gapMarkers) {
      gapMarkers.forEach(gap => {
        const gapContent = gap.replace(/^(don't understand|unclear|confused|not sure|don't know)\s+/i, '').trim();
        knowledgeGaps.push(gapContent);
      });
    }

    return {
      userBeliefs,
      userAssumptions,
      knowledgeGaps
    };
  }

  /**
   * COMMUNICATIVE INTENT EXTRACTION: Speech act analysis
   */
  private extractCommunicativeIntent(message: string, _errorSignals: any[]): any {
    let directSpeechAct = 'statement';
    let indirectSpeechAct: string | undefined;
    let pragmaticImplicature: string | undefined;

    // Classify direct speech act
    if (message.includes('?')) {
      directSpeechAct = 'question';
    } else if (/\b(please|can you|could you|would you)\b/i.test(message)) {
      directSpeechAct = 'request';
    } else if (/\b(no|not|wrong|incorrect)\b/i.test(message)) {
      directSpeechAct = 'negation';
    } else if (/\b(sorry|apologize|my fault)\b/i.test(message)) {
      directSpeechAct = 'apology';
    }

    // Detect indirect speech acts
    if (directSpeechAct === 'statement' && message.includes('would be nice')) {
      indirectSpeechAct = 'request';
    } else if (directSpeechAct === 'question' && message.includes('why don\'t you')) {
      indirectSpeechAct = 'suggestion';
    }

    // Extract pragmatic implicature from error signals
    const correctionSignals = _errorSignals.filter((s: any) => s.errorType === 'correction');
    if (correctionSignals.length > 0) {
      pragmaticImplicature = 'I need you to understand my actual meaning, not what you interpreted';
    }

    return {
      directSpeechAct,
      indirectSpeechAct,
      pragmaticImplicature
    };
  }

  /**
   * MENTAL MODEL INTEGRATION: Combine all cognitive layers
   */
  private integrateMentalModel(
    message: string,
    intentionalAnalysis: any,
    beliefState: any,
    communicativeIntent: any
  ): MentalStateModel {
    // Infer intended vs expressed meaning
    const intendedMeaning = this.inferIntendedMeaning(message, intentionalAnalysis, communicativeIntent);
    const expressedMeaning = message.trim();

    return {
      intendedMeaning,
      expressedMeaning,
      beliefState,
      intentionalStance: intentionalAnalysis,
      communicativeIntent
    };
  }

  /**
   * CORRECTION TYPE CLASSIFICATION
   */
  private classifyCorrectionType(message: string, _signals: any[]): 'factual' | 'interpretive' | 'contextual' | 'emotional' {
    if (/\b(fact|correct|actual|true|false)\b/i.test(message)) {
      return 'factual';
    } else if (/\b(meant|intended|trying to say|what i really)\b/i.test(message)) {
      return 'interpretive';
    } else if (/\b(context|situation|when|where|how)\b/i.test(message)) {
      return 'contextual';
    } else if (/\b(feel|emotion|upset|frustrated|happy)\b/i.test(message)) {
      return 'emotional';
    }
    return 'interpretive';
  }

  /**
   * MAP ORIGINAL TO CORRECTED INTENTION
   */
  private async mapOriginalToCorrectedIntention(
    message: string,
    history: any[]
  ): Promise<{ original: string; corrected: string }> {
    // Extract what user is correcting
    const correctionPatterns = [
      /when you said (.+?), i meant (.+)/i,
      /not (.+?), (.+)/i,
      /actually (.+)/i,
      /what i meant was (.+)/i
    ];

    let original = '';
    let corrected = '';

    for (const pattern of correctionPatterns) {
      const match = message.match(pattern);
      if (match) {
        if (match.length === 3) {
          original = match[1].trim();
          corrected = match[2].trim();
        } else if (match.length === 2) {
          corrected = match[1].trim();
          // Try to find original from history
          original = this.findOriginalFromHistory(corrected, history);
        }
        break;
      }
    }

    return { original, corrected };
  }

  /**
   * ANALYZE MENTAL MODEL MISMATCH
   */
  private analyzeMentalModelMismatch(
    message: string,
    signals: any[],
    _history: any[]
  ): { aiMisunderstood: string; userActuallyMeant: string; gapInUnderstanding: string } {
    // Extract what AI misunderstood
    const misunderstandingPatterns = [
      /you misunderstood (.+)/i,
      /you thought (.+) but (.+)/i,
      /not what i said about (.+)/i
    ];

    let aiMisunderstood = '';
    let userActuallyMeant = '';
    let gapInUnderstanding = '';

    for (const pattern of misunderstandingPatterns) {
      const match = message.match(pattern);
      if (match) {
        aiMisunderstood = match[1]?.trim() || '';
        userActuallyMeant = match[2]?.trim() || message;
        break;
      }
    }

    // Analyze the gap in understanding
    if (signals.some(s => s.errorType === 'contradiction')) {
      gapInUnderstanding = 'Semantic contradiction detected';
    } else if (signals.some(s => s.errorType === 'misunderstanding')) {
      gapInUnderstanding = 'Pragmatic misinterpretation';
    } else {
      gapInUnderstanding = 'Context misalignment';
    }

    return {
      aiMisunderstood: aiMisunderstood || 'Previous interpretation',
      userActuallyMeant: userActuallyMeant || message,
      gapInUnderstanding
    };
  }

  // Helper methods
  private calculateComplexityScore(message: string): number {
    const subordinateClauses = (message.match(/\b(because|since|although|while|if|when)\b/gi) || []).length;
    const longWords = (message.match(/\b\w{8,}\b/g) || []).length;
    const technicalTerms = (message.match(/\b[A-Z]{2,}|\w+(?:ing|tion|ness|ment)\b/g) || []).length;
    
    return subordinateClauses + longWords + Math.floor(technicalTerms / 2);
  }

  private detectEmotionalState(message: string): string {
    const emotionPatterns = {
      frustrated: /\b(frustrated|annoyed|irritated|bothered)\b/i,
      confused: /\b(confused|unclear|don't understand|puzzled)\b/i,
      satisfied: /\b(good|great|perfect|excellent|satisfied)\b/i,
      urgent: /\b(urgent|quickly|asap|immediate|now)\b/i,
      neutral: /\b(ok|fine|sure|yes|no)\b/i
    };

    for (const [emotion, pattern] of Object.entries(emotionPatterns)) {
      if (pattern.test(message)) {
        return emotion;
      }
    }

    return 'neutral';
  }

  private inferIntendedMeaning(message: string, intentions: any, communicative: any): string {
    // If it's a correction, the intended meaning is what they're trying to clarify
    if (intentions.primaryGoal === 'correct_misunderstanding') {
      const clarificationMatch = message.match(/what i (meant|intended) was (.+)/i);
      if (clarificationMatch) {
        return clarificationMatch[2].trim();
      }
    }

    // If there's pragmatic implicature, that's likely the intended meaning
    if (communicative.pragmaticImplicature) {
      return communicative.pragmaticImplicature;
    }

    // Otherwise, intended meaning is the expressed meaning
    return message;
  }

  private findOriginalFromHistory(corrected: string, history: any[]): string {
    // Simple heuristic to find what might have been misunderstood
    const recentMessages = history.slice(-5);
    
    for (const msg of recentMessages) {
      const content = msg.content || msg.text || '';
      if (content.toLowerCase().includes(corrected.toLowerCase())) {
        return content;
      }
    }

    return 'Previous AI response';
  }
}

export const theoryOfMindProcessor = TheoryOfMindProcessor.getInstance();




