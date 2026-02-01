// Error Detection Circuit - Neuropsychological Equivalent: Anterior Cingulate Cortex (ACC)
// ChatGPT Equivalent: Conflict Monitor / Error Detection System
// Detects conflicts, corrections, and misunderstandings in conversation flow

export interface ErrorSignal {
  errorType: 'conflict' | 'correction' | 'misunderstanding' | 'contradiction' | 'clarification_needed';
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  errorLocation: {
    messageIndex?: number;
    conceptMismatch?: string;
    temporalReference?: string;
  };
  cognitiveMarkers: {
    negationDetected: boolean;
    conflictWords: string[];
    emotionalTone: 'neutral' | 'frustrated' | 'confused' | 'corrective';
    urgencyLevel: number;
  };
}

export interface ConflictAnalysis {
  hasConflict: boolean;
  conflictType: string;
  involvedConcepts: string[];
  resolutionRequired: boolean;
  cognitiveLoad: number;
}

export class ErrorDetectionCircuit {
  private static instance: ErrorDetectionCircuit;

  static getInstance(): ErrorDetectionCircuit {
    if (!this.instance) {
      this.instance = new ErrorDetectionCircuit();
    }
    return this.instance;
  }

  /**
   * STATE-OF-THE-ART: Neural network-inspired error detection
   * Mimics anterior cingulate cortex conflict monitoring
   */
  async detectErrorSignals(
    currentMessage: string,
    conversationContext: any[],
    memoryContext: any[]
  ): Promise<ErrorSignal[]> {
    const errorSignals: ErrorSignal[] = [];
    
    console.log('🚨 Error Detection Circuit: Analyzing message for conflict signals');

    // COGNITIVE LAYER 1: Negation Pattern Recognition
    const negationAnalysis = this.analyzeNegationPatterns(currentMessage);
    
    // COGNITIVE LAYER 2: Semantic Conflict Detection
    const semanticConflicts = await this.detectSemanticConflicts(
      currentMessage, 
      conversationContext, 
      memoryContext
    );
    
    // COGNITIVE LAYER 3: Pragmatic Inference Analysis
    const pragmaticErrors = this.analyzePragmaticErrors(currentMessage);
    
    // COGNITIVE LAYER 4: Temporal Reference Validation
    const temporalConflicts = this.detectTemporalConflicts(currentMessage, conversationContext);

    // Combine all error signals
    errorSignals.push(...negationAnalysis);
    errorSignals.push(...semanticConflicts);
    errorSignals.push(...pragmaticErrors);
    errorSignals.push(...temporalConflicts);

    // NEURAL INTEGRATION: Weight and prioritize signals
    const prioritizedSignals = this.prioritizeErrorSignals(errorSignals);
    
    console.log('🧠 Error Detection Results:', {
      totalSignals: errorSignals.length,
      highPriority: prioritizedSignals.filter(s => s.severity === 'high' || s.severity === 'critical').length,
      conflictDetected: errorSignals.some(s => s.errorType === 'conflict')
    });

    return prioritizedSignals;
  }

  /**
   * NEUROLOGICAL EQUIVALENT: Detect negation patterns (like ACC monitors conflicts)
   */
  private analyzeNegationPatterns(message: string): ErrorSignal[] {
    const signals: ErrorSignal[] = [];
    
    // STATE-OF-THE-ART: Multi-layered negation detection
    const negationMarkers = {
      direct: /\b(no|not|never|none|nothing|nowhere|nobody)\b/gi,
      implicit: /\b(hardly|barely|scarcely|rarely|seldom)\b/gi,
      correction: /\b(instead|rather|actually|really|truly)\b/gi,
      contradiction: /\b(opposite|contrary|wrong|incorrect|false)\b/gi
    };

    const emotionalMarkers = {
      frustration: /\b(frustrated|annoyed|confused|bothered)\b/gi,
      correction: /\b(clarify|explain|correct|fix|adjust)\b/gi,
      misunderstanding: /\b(misunderstand|misunderstood|unclear|confusing)\b/gi
    };

    let negationCount = 0;
    let correctionStrength = 0;
    let emotionalTone: 'neutral' | 'frustrated' | 'confused' | 'corrective' = 'neutral';

    // Analyze negation patterns
    Object.entries(negationMarkers).forEach(([type, pattern]) => {
      const matches = message.match(pattern);
      if (matches) {
        negationCount += matches.length;
        if (type === 'correction' || type === 'contradiction') {
          correctionStrength += matches.length * 2;
        }
      }
    });

    // Analyze emotional tone
    Object.entries(emotionalMarkers).forEach(([tone, pattern]) => {
      if (pattern.test(message)) {
        emotionalTone = tone as any;
      }
    });

    // Generate error signal if significant negation detected
    if (negationCount > 0 || correctionStrength > 0) {
      signals.push({
        errorType: correctionStrength > 1 ? 'correction' : 'conflict',
        confidence: Math.min(0.95, (negationCount + correctionStrength) * 0.3),
        severity: correctionStrength > 2 ? 'high' : negationCount > 2 ? 'medium' : 'low',
        errorLocation: {
          conceptMismatch: this.extractConflictConcepts(message)
        },
        cognitiveMarkers: {
          negationDetected: negationCount > 0,
          conflictWords: this.extractConflictWords(message),
          emotionalTone,
          urgencyLevel: correctionStrength + negationCount
        }
      });
    }

    return signals;
  }

  /**
   * SEMANTIC CONFLICT DETECTION: Compare current message with conversation history
   */
  private async detectSemanticConflicts(
    message: string, 
    conversationContext: any[], 
    _memoryContext: any[]
  ): Promise<ErrorSignal[]> {
    const signals: ErrorSignal[] = [];

    // Extract key concepts from current message
    const currentConcepts = this.extractKeyConcepts(message);
    
    // Compare with recent conversation context
    const recentMessages = conversationContext.slice(-10); // Last 10 messages
    
    for (const concept of currentConcepts) {
      // Check for contradictory statements
      const contradictions = recentMessages.filter(msg => 
        this.detectConceptualContradiction(concept, msg.content || msg.text || '')
      );

      if (contradictions.length > 0) {
        signals.push({
          errorType: 'contradiction',
          confidence: 0.85,
          severity: 'high',
          errorLocation: {
            conceptMismatch: concept,
            messageIndex: contradictions[0].index
          },
          cognitiveMarkers: {
            negationDetected: true,
            conflictWords: [concept],
            emotionalTone: 'corrective',
            urgencyLevel: contradictions.length
          }
        });
      }
    }

    return signals;
  }

  /**
   * PRAGMATIC ERROR ANALYSIS: Detect conversational implicature violations
   */
  private analyzePragmaticErrors(message: string): ErrorSignal[] {
    const signals: ErrorSignal[] = [];

    // Gricean Maxims Violation Detection
    const maxViolations = {
      quantity: this.detectQuantityViolation(message),
      quality: this.detectQualityViolation(message),
      relation: this.detectRelevanceViolation(message),
      manner: this.detectMannerViolation(message)
    };

    Object.entries(maxViolations).forEach(([maxim, violation]) => {
      if (violation.detected) {
        signals.push({
          errorType: 'misunderstanding',
          confidence: violation.confidence,
          severity: violation.severity,
          errorLocation: {
            conceptMismatch: `Pragmatic violation: ${maxim}`
          },
          cognitiveMarkers: {
            negationDetected: false,
            conflictWords: violation.markers,
            emotionalTone: 'confused',
            urgencyLevel: violation.severity === 'high' ? 3 : 1
          }
        });
      }
    });

    return signals;
  }

  /**
   * TEMPORAL CONFLICT DETECTION: Validate time references
   */
  private detectTemporalConflicts(message: string, conversationContext: any[]): ErrorSignal[] {
    const signals: ErrorSignal[] = [];

    const temporalRefs = message.match(/\b(yesterday|today|last week|before|when you said|earlier)\b/gi);
    
    if (temporalRefs) {
      // Check if temporal references are valid given conversation history
      const conversationAge = conversationContext.length;
      const hasInvalidRefs = temporalRefs.some(ref => 
        this.validateTemporalReference(ref, conversationAge)
      );

      if (hasInvalidRefs) {
        signals.push({
          errorType: 'clarification_needed',
          confidence: 0.75,
          severity: 'medium',
          errorLocation: {
            temporalReference: temporalRefs.join(', ')
          },
          cognitiveMarkers: {
            negationDetected: false,
            conflictWords: temporalRefs,
            emotionalTone: 'confused',
            urgencyLevel: 2
          }
        });
      }
    }

    return signals;
  }

  // Helper methods for cognitive processing
  private extractConflictConcepts(message: string): string {
    const concepts = message.match(/\b[A-Z][a-z]+\b/g) || [];
    return concepts.slice(0, 3).join(', ');
  }

  private extractConflictWords(message: string): string[] {
    const conflictPattern = /\b(not|no|wrong|incorrect|misunderstand|actually|really)\b/gi;
    return message.match(conflictPattern) || [];
  }

  private extractKeyConcepts(message: string): string[] {
    // Simple concept extraction - could be enhanced with NER
    const concepts = message.match(/\b[A-Z][a-z]+\b/g) || [];
    const importantWords = message.match(/\b(is|was|will|can|should|must|have|had)\s+(\w+)/gi) || [];
    return [...concepts, ...importantWords.map(w => w.split(' ')[1])].slice(0, 5);
  }

  private detectConceptualContradiction(concept: string, previousMessage: string): boolean {
    // Simple contradiction detection - could be enhanced with semantic embeddings
    const negatedConcept = new RegExp(`not\\s+${concept}|no\\s+${concept}|${concept}\\s+is\\s+wrong`, 'i');
    return negatedConcept.test(previousMessage);
  }

  private detectQuantityViolation(message: string): { detected: boolean; confidence: number; severity: 'low' | 'medium' | 'high'; markers: string[] } {
    // Too little or too much information
    const tooVague = message.length < 10 && /\b(yes|no|ok|sure)\b/i.test(message);
    const tooVerbose = message.length > 500;
    
    return {
      detected: tooVague || tooVerbose,
      confidence: tooVague ? 0.6 : tooVerbose ? 0.4 : 0,
      severity: tooVague ? 'medium' : 'low',
      markers: tooVague ? ['insufficient_detail'] : tooVerbose ? ['excessive_detail'] : []
    };
  }

  private detectQualityViolation(message: string): { detected: boolean; confidence: number; severity: 'low' | 'medium' | 'high'; markers: string[] } {
    // False or unsupported statements
    const uncertaintyMarkers = /\b(maybe|perhaps|might|could|possibly)\b/gi;
    const certaintyConflict = /\b(definitely|certainly|absolutely)\b/gi;
    
    const hasUncertainty = uncertaintyMarkers.test(message);
    const hasCertainty = certaintyConflict.test(message);
    
    return {
      detected: hasUncertainty && hasCertainty,
      confidence: 0.7,
      severity: 'low',
      markers: hasUncertainty && hasCertainty ? ['certainty_conflict'] : []
    };
  }

  private detectRelevanceViolation(message: string): { detected: boolean; confidence: number; severity: 'low' | 'medium' | 'high'; markers: string[] } {
    // Off-topic or irrelevant responses
    const topicShiftMarkers = /\b(by the way|speaking of|anyway|incidentally)\b/gi;
    const hasTopicShift = topicShiftMarkers.test(message);
    
    return {
      detected: hasTopicShift,
      confidence: 0.5,
      severity: 'low',
      markers: hasTopicShift ? ['topic_shift'] : []
    };
  }

  private detectMannerViolation(message: string): { detected: boolean; confidence: number; severity: 'low' | 'medium' | 'high'; markers: string[] } {
    // Unclear or ambiguous statements
    const ambiguityMarkers = /\b(that|it|this|stuff|thing|whatever)\b/gi;
    const ambiguityCount = (message.match(ambiguityMarkers) || []).length;
    
    return {
      detected: ambiguityCount > 2,
      confidence: Math.min(0.8, ambiguityCount * 0.2),
      severity: ambiguityCount > 4 ? 'medium' : 'low',
      markers: ambiguityCount > 2 ? ['excessive_ambiguity'] : []
    };
  }

  private validateTemporalReference(ref: string, conversationAge: number): boolean {
    // Validate if temporal reference makes sense given conversation length
    if (ref.toLowerCase().includes('yesterday') && conversationAge < 5) return false;
    if (ref.toLowerCase().includes('last week') && conversationAge < 20) return false;
    return true;
  }

  private prioritizeErrorSignals(signals: ErrorSignal[]): ErrorSignal[] {
    // Neural integration: prioritize by severity and confidence
    return signals
      .sort((a, b) => {
        const severityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
        const scoreA = severityWeight[a.severity] * a.confidence;
        const scoreB = severityWeight[b.severity] * b.confidence;
        return scoreB - scoreA;
      })
      .slice(0, 5); // Limit to top 5 signals to prevent cognitive overload
  }
}

export const errorDetectionCircuit = ErrorDetectionCircuit.getInstance();




