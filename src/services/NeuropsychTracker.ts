/**
 * Neuropsychological Performance Tracking Service
 * Maps user interactions, game performance, and learning activities to 41 neuropsych concepts
 */

export interface NeuropsychConcept {
  id: string;
  name: string;
  category: 'cognitive' | 'learning' | 'performance' | 'social_emotional';
  description: string;
  measurementCriteria: string[];
  relatedConcepts: string[];
}

export interface PerformanceMetric {
  conceptId: string;
  score: number; // 0-100
  confidence: number; // 0-1
  timestamp: Date;
  activityType: string;
  activityId: string;
  rawData: any;
  context: {
    age: number;
    difficulty: 'easy' | 'medium' | 'hard';
    duration: number;
    environment: 'game' | 'lesson' | 'assessment' | 'conversation';
  };
}

export interface NeuropsychProfile {
  userId: string;
  overallScores: Record<string, number>;
  strengths: string[];
  growthAreas: string[];
  recommendations: string[];
  lastUpdated: Date;
  progressTrend: 'improving' | 'stable' | 'declining';
  detailedMetrics: PerformanceMetric[];
}

export class NeuropsychTracker {
  private static instance: NeuropsychTracker;
  private concepts: Map<string, NeuropsychConcept>;
  private userProfiles: Map<string, NeuropsychProfile>;

  private constructor() {
    this.concepts = new Map();
    this.userProfiles = new Map();
    this.initializeConcepts();
  }

  static getInstance(): NeuropsychTracker {
    if (!NeuropsychTracker.instance) {
      NeuropsychTracker.instance = new NeuropsychTracker();
    }
    return NeuropsychTracker.instance;
  }

  private initializeConcepts() {
    const concepts: NeuropsychConcept[] = [
      // Cognitive Functions (Core Learning)
      {
        id: 'working_memory',
        name: 'Working Memory',
        category: 'cognitive',
        description: 'Holding and manipulating information temporarily',
        measurementCriteria: ['digit_span', 'n_back_accuracy', 'dual_task_performance'],
        relatedConcepts: ['attention_control', 'cognitive_load_management']
      },
      {
        id: 'long_term_memory',
        name: 'Long-term Memory',
        category: 'cognitive',
        description: 'Storing and retrieving information permanently',
        measurementCriteria: ['recall_accuracy', 'recognition_speed', 'retention_over_time'],
        relatedConcepts: ['declarative_learning', 'transfer_learning']
      },
      {
        id: 'attention_control',
        name: 'Attention Control',
        category: 'cognitive',
        description: 'Focusing cognitive resources selectively',
        measurementCriteria: ['sustained_focus_time', 'distraction_resistance', 'task_switching_speed'],
        relatedConcepts: ['sustained_attention', 'selective_attention', 'divided_attention']
      },
      {
        id: 'processing_speed',
        name: 'Processing Speed',
        category: 'cognitive',
        description: 'Speed of cognitive operations',
        measurementCriteria: ['reaction_time', 'completion_speed', 'accuracy_under_time_pressure'],
        relatedConcepts: ['cognitive_flexibility', 'response_monitoring']
      },
      {
        id: 'executive_planning',
        name: 'Executive Planning',
        category: 'cognitive',
        description: 'Planning and organizing complex tasks',
        measurementCriteria: ['strategy_complexity', 'goal_achievement', 'resource_allocation'],
        relatedConcepts: ['strategy_formation', 'cognitive_flexibility', 'inhibitory_control']
      },
      {
        id: 'cognitive_flexibility',
        name: 'Cognitive Flexibility',
        category: 'cognitive',
        description: 'Switching between different mental tasks',
        measurementCriteria: ['task_switching_cost', 'adaptation_speed', 'rule_change_response'],
        relatedConcepts: ['executive_planning', 'task_switching', 'concept_formation']
      },
      {
        id: 'inhibitory_control',
        name: 'Inhibitory Control',
        category: 'cognitive',
        description: 'Suppressing inappropriate responses',
        measurementCriteria: ['stroop_interference', 'go_no_go_accuracy', 'impulse_resistance'],
        relatedConcepts: ['impulse_control', 'response_monitoring', 'emotional_regulation']
      },
      {
        id: 'pattern_recognition',
        name: 'Pattern Recognition',
        category: 'cognitive',
        description: 'Identifying regularities in information',
        measurementCriteria: ['sequence_completion', 'visual_pattern_accuracy', 'rule_extraction'],
        relatedConcepts: ['concept_formation', 'spatial_reasoning', 'rule_learning']
      },
      {
        id: 'spatial_reasoning',
        name: 'Spatial Reasoning',
        category: 'cognitive',
        description: 'Understanding spatial relationships',
        measurementCriteria: ['mental_rotation_accuracy', '3d_visualization', 'spatial_memory'],
        relatedConcepts: ['visual_spatial_working_memory', 'mental_rotation', 'perceptual_organization']
      },
      {
        id: 'sequential_processing',
        name: 'Sequential Processing',
        category: 'cognitive',
        description: 'Processing information in order',
        measurementCriteria: ['sequence_accuracy', 'temporal_ordering', 'step_by_step_completion'],
        relatedConcepts: ['procedural_learning', 'working_memory', 'phonological_processing']
      },
      {
        id: 'simultaneous_processing',
        name: 'Simultaneous Processing',
        category: 'cognitive',
        description: 'Processing multiple pieces of information at once',
        measurementCriteria: ['parallel_task_accuracy', 'holistic_pattern_recognition', 'gestalt_processing'],
        relatedConcepts: ['divided_attention', 'perceptual_organization', 'cognitive_load_management']
      },
      {
        id: 'verbal_reasoning',
        name: 'Verbal Reasoning',
        category: 'cognitive',
        description: 'Understanding and using language logically',
        measurementCriteria: ['analogical_reasoning', 'verbal_comprehension', 'logical_deduction'],
        relatedConcepts: ['semantic_processing', 'concept_formation', 'transfer_learning']
      },
      {
        id: 'perceptual_organization',
        name: 'Perceptual Organization',
        category: 'cognitive',
        description: 'Organizing visual information meaningfully',
        measurementCriteria: ['visual_closure', 'figure_ground_discrimination', 'visual_synthesis'],
        relatedConcepts: ['spatial_reasoning', 'pattern_recognition', 'visual_spatial_working_memory']
      },

      // Learning & Adaptation
      {
        id: 'procedural_learning',
        name: 'Procedural Learning',
        category: 'learning',
        description: 'Learning motor and cognitive skills',
        measurementCriteria: ['skill_acquisition_rate', 'automation_development', 'motor_learning'],
        relatedConcepts: ['sequential_processing', 'strategy_formation', 'transfer_learning']
      },
      {
        id: 'declarative_learning',
        name: 'Declarative Learning',
        category: 'learning',
        description: 'Learning facts and events',
        measurementCriteria: ['fact_retention', 'episodic_memory', 'semantic_knowledge'],
        relatedConcepts: ['long_term_memory', 'semantic_processing', 'concept_formation']
      },
      {
        id: 'transfer_learning',
        name: 'Transfer Learning',
        category: 'learning',
        description: 'Applying knowledge to new situations',
        measurementCriteria: ['generalization_accuracy', 'analogical_transfer', 'far_transfer_success'],
        relatedConcepts: ['concept_formation', 'cognitive_flexibility', 'verbal_reasoning']
      },
      {
        id: 'metacognition',
        name: 'Metacognition',
        category: 'learning',
        description: 'Awareness of one\'s own thinking processes',
        measurementCriteria: ['self_monitoring_accuracy', 'strategy_awareness', 'confidence_calibration'],
        relatedConcepts: ['response_monitoring', 'strategy_formation', 'error_detection']
      },
      {
        id: 'error_detection',
        name: 'Error Detection',
        category: 'learning',
        description: 'Identifying and correcting mistakes',
        measurementCriteria: ['error_recognition_rate', 'self_correction_frequency', 'monitoring_sensitivity'],
        relatedConcepts: ['response_monitoring', 'metacognition', 'inhibitory_control']
      },
      {
        id: 'strategy_formation',
        name: 'Strategy Formation',
        category: 'learning',
        description: 'Developing approaches to solve problems',
        measurementCriteria: ['strategy_diversity', 'strategy_effectiveness', 'adaptive_strategy_use'],
        relatedConcepts: ['executive_planning', 'metacognition', 'cognitive_flexibility']
      },
      {
        id: 'concept_formation',
        name: 'Concept Formation',
        category: 'learning',
        description: 'Building abstract representations',
        measurementCriteria: ['category_learning_speed', 'abstraction_level', 'concept_generalization'],
        relatedConcepts: ['pattern_recognition', 'category_learning', 'transfer_learning']
      },
      {
        id: 'category_learning',
        name: 'Category Learning',
        category: 'learning',
        description: 'Grouping items based on similarities',
        measurementCriteria: ['classification_accuracy', 'category_boundary_learning', 'prototype_formation'],
        relatedConcepts: ['concept_formation', 'pattern_recognition', 'perceptual_organization']
      },
      {
        id: 'rule_learning',
        name: 'Rule Learning',
        category: 'learning',
        description: 'Understanding and applying rules',
        measurementCriteria: ['rule_extraction_speed', 'rule_application_accuracy', 'rule_generalization'],
        relatedConcepts: ['pattern_recognition', 'cognitive_flexibility', 'concept_formation']
      },
      {
        id: 'associative_learning',
        name: 'Associative Learning',
        category: 'learning',
        description: 'Linking different pieces of information',
        measurementCriteria: ['association_strength', 'pairing_accuracy', 'conditioning_rate'],
        relatedConcepts: ['long_term_memory', 'pattern_recognition', 'transfer_learning']
      },

      // Performance & Monitoring
      {
        id: 'response_monitoring',
        name: 'Response Monitoring',
        category: 'performance',
        description: 'Tracking the accuracy of responses',
        measurementCriteria: ['error_related_negativity', 'confidence_accuracy', 'post_error_adjustment'],
        relatedConcepts: ['metacognition', 'error_detection', 'cognitive_load_management']
      },
      {
        id: 'cognitive_load_management',
        name: 'Cognitive Load Management',
        category: 'performance',
        description: 'Managing mental effort and resources',
        measurementCriteria: ['task_complexity_handling', 'resource_allocation', 'fatigue_resistance'],
        relatedConcepts: ['working_memory', 'attention_control', 'divided_attention']
      },
      {
        id: 'task_switching',
        name: 'Task Switching',
        category: 'performance',
        description: 'Changing between different activities',
        measurementCriteria: ['switch_cost', 'preparation_time', 'mixing_cost'],
        relatedConcepts: ['cognitive_flexibility', 'executive_planning', 'attention_control']
      },
      {
        id: 'sustained_attention',
        name: 'Sustained Attention',
        category: 'performance',
        description: 'Maintaining focus over time',
        measurementCriteria: ['vigilance_decrement', 'time_on_task', 'mind_wandering_frequency'],
        relatedConcepts: ['attention_control', 'cognitive_load_management', 'response_monitoring']
      },
      {
        id: 'selective_attention',
        name: 'Selective Attention',
        category: 'performance',
        description: 'Focusing on relevant information',
        measurementCriteria: ['filtering_efficiency', 'distractor_resistance', 'target_detection'],
        relatedConcepts: ['attention_control', 'inhibitory_control', 'perceptual_organization']
      },
      {
        id: 'divided_attention',
        name: 'Divided Attention',
        category: 'performance',
        description: 'Managing multiple tasks simultaneously',
        measurementCriteria: ['dual_task_cost', 'resource_sharing', 'priority_management'],
        relatedConcepts: ['cognitive_load_management', 'simultaneous_processing', 'task_switching']
      },
      {
        id: 'mental_rotation',
        name: 'Mental Rotation',
        category: 'performance',
        description: 'Rotating objects mentally in space',
        measurementCriteria: ['rotation_accuracy', 'angular_disparity_effect', 'rotation_speed'],
        relatedConcepts: ['spatial_reasoning', 'visual_spatial_working_memory', 'perceptual_organization']
      },
      {
        id: 'visual_spatial_working_memory',
        name: 'Visual-Spatial Working Memory',
        category: 'performance',
        description: 'Temporarily holding spatial information',
        measurementCriteria: ['spatial_span', 'location_memory', 'visual_pattern_maintenance'],
        relatedConcepts: ['working_memory', 'spatial_reasoning', 'mental_rotation']
      },
      {
        id: 'phonological_processing',
        name: 'Phonological Processing',
        category: 'performance',
        description: 'Processing speech sounds',
        measurementCriteria: ['phoneme_awareness', 'rhyme_detection', 'sound_blending'],
        relatedConcepts: ['verbal_reasoning', 'sequential_processing', 'working_memory']
      },
      {
        id: 'semantic_processing',
        name: 'Semantic Processing',
        category: 'performance',
        description: 'Understanding meaning of words/concepts',
        measurementCriteria: ['semantic_fluency', 'word_comprehension', 'conceptual_knowledge'],
        relatedConcepts: ['verbal_reasoning', 'concept_formation', 'declarative_learning']
      },

      // Social & Emotional Intelligence
      {
        id: 'theory_of_mind',
        name: 'Theory of Mind',
        category: 'social_emotional',
        description: 'Understanding others\' mental states',
        measurementCriteria: ['false_belief_understanding', 'mental_state_attribution', 'social_reasoning'],
        relatedConcepts: ['perspective_taking', 'social_cognition', 'empathy']
      },
      {
        id: 'emotional_regulation',
        name: 'Emotional Regulation',
        category: 'social_emotional',
        description: 'Managing emotional responses',
        measurementCriteria: ['emotional_control', 'mood_regulation', 'stress_management'],
        relatedConcepts: ['impulse_control', 'inhibitory_control', 'decision_making']
      },
      {
        id: 'social_cognition',
        name: 'Social Cognition',
        category: 'social_emotional',
        description: 'Understanding social situations',
        measurementCriteria: ['social_cue_recognition', 'social_context_understanding', 'interpersonal_skills'],
        relatedConcepts: ['theory_of_mind', 'perspective_taking', 'empathy']
      },
      {
        id: 'empathy',
        name: 'Empathy',
        category: 'social_emotional',
        description: 'Understanding and sharing others\' emotions',
        measurementCriteria: ['emotional_contagion', 'perspective_taking_accuracy', 'empathic_concern'],
        relatedConcepts: ['theory_of_mind', 'emotional_regulation', 'social_cognition']
      },
      {
        id: 'perspective_taking',
        name: 'Perspective Taking',
        category: 'social_emotional',
        description: 'Seeing situations from others\' viewpoints',
        measurementCriteria: ['viewpoint_flexibility', 'other_perspective_accuracy', 'spatial_perspective'],
        relatedConcepts: ['theory_of_mind', 'cognitive_flexibility', 'empathy']
      },
      {
        id: 'decision_making',
        name: 'Decision Making',
        category: 'social_emotional',
        description: 'Choosing between alternatives',
        measurementCriteria: ['choice_accuracy', 'decision_speed', 'option_evaluation'],
        relatedConcepts: ['risk_assessment', 'executive_planning', 'cognitive_flexibility']
      },
      {
        id: 'risk_assessment',
        name: 'Risk Assessment',
        category: 'social_emotional',
        description: 'Evaluating potential outcomes',
        measurementCriteria: ['risk_estimation_accuracy', 'probability_judgment', 'outcome_prediction'],
        relatedConcepts: ['decision_making', 'executive_planning', 'metacognition']
      },
      {
        id: 'impulse_control',
        name: 'Impulse Control',
        category: 'social_emotional',
        description: 'Resisting immediate temptations',
        measurementCriteria: ['delay_of_gratification', 'impulse_inhibition', 'self_control'],
        relatedConcepts: ['inhibitory_control', 'emotional_regulation', 'decision_making']
      }
    ];

    concepts.forEach(concept => {
      this.concepts.set(concept.id, concept);
    });
  }

  /**
   * Record a performance measurement for a specific neuropsych concept
   */
  recordPerformance(userId: string, metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: new Date()
    };

    if (!this.userProfiles.has(userId)) {
      this.initializeUserProfile(userId);
    }

    const profile = this.userProfiles.get(userId)!;
    profile.detailedMetrics.push(fullMetric);
    
    this.updateOverallScores(userId);
    this.updateRecommendations(userId);
    
    profile.lastUpdated = new Date();
  }

  /**
   * Analyze game performance and extract neuropsych metrics
   */
  analyzeGamePerformance(userId: string, gameData: {
    gameType: string;
    score: number;
    timeSpent: number;
    moves: any[];
    errors: number;
    hints: number;
    difficulty: 'easy' | 'medium' | 'hard';
    completed: boolean;
  }): void {
    const conceptMappings = this.getGameConceptMappings(gameData.gameType);
    
    conceptMappings.forEach(({ conceptId, extractorFunction }) => {
      const score = extractorFunction(gameData);
      const confidence = this.calculateConfidence(gameData, conceptId);
      
      this.recordPerformance(userId, {
        conceptId,
        score,
        confidence,
        activityType: 'game',
        activityId: gameData.gameType,
        rawData: gameData,
        context: {
          age: this.getUserAge(userId),
          difficulty: gameData.difficulty,
          duration: gameData.timeSpent,
          environment: 'game'
        }
      });
    });
  }

  /**
   * Analyze conversation/assistant interaction for neuropsych insights
   */
  analyzeConversation(userId: string, conversationData: {
    messages: any[];
    topics: string[];
    questionsAsked: number;
    responseTime: number;
    comprehensionIndicators: any[];
    frustrationSignals: string[];
    tools_used: string[];
  }): void {
    // Analyze metacognition based on self-reflection questions
    if (conversationData.questionsAsked > 2) {
      this.recordPerformance(userId, {
        conceptId: 'metacognition',
        score: Math.min(conversationData.questionsAsked * 15, 100),
        confidence: 0.7,
        activityType: 'conversation',
        activityId: 'ai_assistant',
        rawData: conversationData,
        context: {
          age: this.getUserAge(userId),
          difficulty: 'medium',
          duration: conversationData.responseTime,
          environment: 'conversation'
        }
      });
    }

    // Analyze cognitive flexibility based on topic switching
    if (conversationData.topics.length > 1) {
      this.recordPerformance(userId, {
        conceptId: 'cognitive_flexibility',
        score: Math.min(conversationData.topics.length * 20, 100),
        confidence: 0.6,
        activityType: 'conversation',
        activityId: 'topic_switching',
        rawData: conversationData,
        context: {
          age: this.getUserAge(userId),
          difficulty: 'medium',
          duration: conversationData.responseTime,
          environment: 'conversation'
        }
      });
    }

    // Analyze emotional regulation based on frustration signals
    if (conversationData.frustrationSignals.length > 0) {
      const regulationScore = Math.max(100 - (conversationData.frustrationSignals.length * 25), 0);
      this.recordPerformance(userId, {
        conceptId: 'emotional_regulation',
        score: regulationScore,
        confidence: 0.8,
        activityType: 'conversation',
        activityId: 'frustration_handling',
        rawData: conversationData,
        context: {
          age: this.getUserAge(userId),
          difficulty: 'medium',
          duration: conversationData.responseTime,
          environment: 'conversation'
        }
      });
    }
  }

  /**
   * Analyze canvas/drawing activity for spatial and creative skills
   */
  analyzeCanvasActivity(userId: string, canvasData: {
    drawingComplexity: number;
    spatialAccuracy: number;
    timeToComplete: number;
    revisions: number;
    toolsUsed: string[];
    patternRecognition: boolean;
  }): void {
    // Spatial reasoning from drawing accuracy
    this.recordPerformance(userId, {
      conceptId: 'spatial_reasoning',
      score: canvasData.spatialAccuracy,
      confidence: 0.85,
      activityType: 'canvas',
      activityId: 'drawing',
      rawData: canvasData,
      context: {
        age: this.getUserAge(userId),
        difficulty: 'medium',
        duration: canvasData.timeToComplete,
        environment: 'lesson'
      }
    });

    // Visual-spatial working memory from complexity handling
    this.recordPerformance(userId, {
      conceptId: 'visual_spatial_working_memory',
      score: Math.min(canvasData.drawingComplexity * 20, 100),
      confidence: 0.75,
      activityType: 'canvas',
      activityId: 'complexity_handling',
      rawData: canvasData,
      context: {
        age: this.getUserAge(userId),
        difficulty: 'medium',
        duration: canvasData.timeToComplete,
        environment: 'lesson'
      }
    });

    // Error detection and correction from revisions
    if (canvasData.revisions > 0) {
      this.recordPerformance(userId, {
        conceptId: 'error_detection',
        score: Math.min(canvasData.revisions * 25, 100),
        confidence: 0.7,
        activityType: 'canvas',
        activityId: 'revision_behavior',
        rawData: canvasData,
        context: {
          age: this.getUserAge(userId),
          difficulty: 'medium',
          duration: canvasData.timeToComplete,
          environment: 'lesson'
        }
      });
    }
  }

  /**
   * Get current neuropsych profile for a user
   */
  getProfile(userId: string): NeuropsychProfile | null {
    return this.userProfiles.get(userId) || null;
  }

  /**
   * Get performance trends over time for specific concepts
   */
  getPerformanceTrends(userId: string, conceptIds: string[], timeRange: number = 30): any {
    const profile = this.userProfiles.get(userId);
    if (!profile) return null;

    const cutoffDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
    
    return conceptIds.map(conceptId => {
      const relevantMetrics = profile.detailedMetrics
        .filter(m => m.conceptId === conceptId && m.timestamp > cutoffDate)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      return {
        conceptId,
        conceptName: this.concepts.get(conceptId)?.name,
        dataPoints: relevantMetrics.map(m => ({
          timestamp: m.timestamp,
          score: m.score,
          confidence: m.confidence,
          activity: m.activityType
        })),
        trend: this.calculateTrend(relevantMetrics),
        averageScore: relevantMetrics.length > 0 
          ? relevantMetrics.reduce((sum, m) => sum + m.score, 0) / relevantMetrics.length 
          : 0
      };
    });
  }

  /**
   * Get personalized learning recommendations based on neuropsych profile
   */
  getPersonalizedRecommendations(userId: string): string[] {
    const profile = this.userProfiles.get(userId);
    if (!profile) return [];

    const recommendations: string[] = [];
    
    // Identify growth areas (bottom 25% of scores)
    const sortedScores = Object.entries(profile.overallScores)
      .sort(([,a], [,b]) => a - b);
    
    const growthAreas = sortedScores.slice(0, Math.ceil(sortedScores.length * 0.25));
    
    growthAreas.forEach(([conceptId, score]) => {
      const concept = this.concepts.get(conceptId);
      if (concept) {
        recommendations.push(...this.getConceptRecommendations(conceptId, score));
      }
    });

    // Leverage strengths (top 25% of scores)
    const strengths = sortedScores.slice(-Math.ceil(sortedScores.length * 0.25));
    
    strengths.forEach(([conceptId, score]) => {
      const concept = this.concepts.get(conceptId);
      if (concept && score > 75) {
        recommendations.push(`Leverage your strength in ${concept.name} to tackle more challenging problems`);
      }
    });

    return recommendations.slice(0, 8); // Limit to top 8 recommendations
  }

  private initializeUserProfile(userId: string): void {
    const profile: NeuropsychProfile = {
      userId,
      overallScores: {},
      strengths: [],
      growthAreas: [],
      recommendations: [],
      lastUpdated: new Date(),
      progressTrend: 'stable',
      detailedMetrics: []
    };

    // Initialize all concept scores to neutral
    this.concepts.forEach((concept, conceptId) => {
      profile.overallScores[conceptId] = 50; // Neutral starting point
    });

    this.userProfiles.set(userId, profile);
  }

  private updateOverallScores(userId: string): void {
    const profile = this.userProfiles.get(userId)!;
    
    // Calculate weighted average for each concept (recent measurements weighted more heavily)
    this.concepts.forEach((concept, conceptId) => {
      const relevantMetrics = profile.detailedMetrics
        .filter(m => m.conceptId === conceptId)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10); // Use last 10 measurements
      
      if (relevantMetrics.length > 0) {
        let weightedSum = 0;
        let totalWeight = 0;
        
        relevantMetrics.forEach((metric, index) => {
          const weight = Math.pow(0.9, index) * metric.confidence; // Recent and confident measurements weighted more
          weightedSum += metric.score * weight;
          totalWeight += weight;
        });
        
        profile.overallScores[conceptId] = totalWeight > 0 ? weightedSum / totalWeight : 50;
      }
    });
  }

  private updateRecommendations(userId: string): void {
    const profile = this.userProfiles.get(userId)!;
    profile.recommendations = this.getPersonalizedRecommendations(userId);
    
    // Update strengths and growth areas
    const sortedScores = Object.entries(profile.overallScores)
      .sort(([,a], [,b]) => b - a);
    
    profile.strengths = sortedScores
      .slice(0, 5)
      .filter(([, score]) => score > 65)
      .map(([conceptId]) => this.concepts.get(conceptId)?.name || conceptId);
    
    profile.growthAreas = sortedScores
      .slice(-5)
      .filter(([, score]) => score < 55)
      .map(([conceptId]) => this.concepts.get(conceptId)?.name || conceptId);
  }

  private getGameConceptMappings(gameType: string): Array<{conceptId: string, extractorFunction: (data: any) => number}> {
    const mappings: Record<string, Array<{conceptId: string, extractorFunction: (data: any) => number}>> = {
      'memory_game': [
        {
          conceptId: 'working_memory',
          extractorFunction: (data) => Math.min((data.score / 100) * 100, 100)
        },
        {
          conceptId: 'pattern_recognition',
          extractorFunction: (data) => Math.min(((100 - data.errors) / 100) * 100, 100)
        }
      ],
      'puzzle_game': [
        {
          conceptId: 'spatial_reasoning',
          extractorFunction: (data) => Math.min((data.score / 100) * 100, 100)
        },
        {
          conceptId: 'executive_planning',
          extractorFunction: (data) => Math.min(((100 - data.hints * 10) / 100) * 100, 100)
        }
      ],
      'attention_game': [
        {
          conceptId: 'sustained_attention',
          extractorFunction: (data) => Math.min((data.timeSpent / 300) * 100, 100) // 5 minutes = 100%
        },
        {
          conceptId: 'selective_attention',
          extractorFunction: (data) => Math.min(((100 - data.errors * 5) / 100) * 100, 100)
        }
      ]
      // Add more game type mappings as needed
    };

    return mappings[gameType] || [];
  }

  private calculateConfidence(gameData: any, conceptId: string): number {
    // Base confidence on data quality indicators
    let confidence = 0.5;
    
    if (gameData.completed) confidence += 0.2;
    if (gameData.timeSpent > 30) confidence += 0.1; // Sufficient time spent
    if (gameData.moves && gameData.moves.length > 5) confidence += 0.1;
    if (gameData.errors < 5) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private getUserAge(userId: string): number {
    // In a real implementation, this would fetch from user profile
    return 10; // Default age for now
  }

  private calculateTrend(metrics: PerformanceMetric[]): 'improving' | 'stable' | 'declining' {
    if (metrics.length < 3) return 'stable';
    
    const recent = metrics.slice(-3);
    const older = metrics.slice(-6, -3);
    
    if (older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, m) => sum + m.score, 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + m.score, 0) / older.length;
    
    const difference = recentAvg - olderAvg;
    
    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  }

  private getConceptRecommendations(conceptId: string, score: number): string[] {
    const concept = this.concepts.get(conceptId);
    if (!concept) return [];

    const recommendations: Record<string, string[]> = {
      'working_memory': [
        'Practice N-back games to strengthen working memory',
        'Try dual-task activities like counting while walking',
        'Use memory palace techniques for better information retention'
      ],
      'attention_control': [
        'Practice mindfulness exercises to improve focus',
        'Try attention training games with increasing difficulty',
        'Use the Pomodoro technique for sustained attention practice'
      ],
      'spatial_reasoning': [
        'Work with 3D puzzles and building blocks',
        'Practice mental rotation exercises',
        'Engage in map reading and navigation activities'
      ],
      'executive_planning': [
        'Break complex tasks into smaller, manageable steps',
        'Practice goal-setting and timeline creation',
        'Use planning tools and visual organizers'
      ]
      // Add more concept-specific recommendations
    };

    return recommendations[conceptId] || [`Focus on activities that strengthen ${concept.name}`];
  }

  /**
   * Export user profile data for analysis or backup
   */
  exportUserData(userId: string): any {
    const profile = this.userProfiles.get(userId);
    if (!profile) return null;

    return {
      profile,
      concepts: Array.from(this.concepts.values()),
      exportDate: new Date(),
      version: '1.0'
    };
  }

  /**
   * Get all available neuropsych concepts
   */
  getAllConcepts(): NeuropsychConcept[] {
    return Array.from(this.concepts.values());
  }

  /**
   * Get concepts by category
   */
  getConceptsByCategory(category: 'cognitive' | 'learning' | 'performance' | 'social_emotional'): NeuropsychConcept[] {
    return Array.from(this.concepts.values()).filter(concept => concept.category === category);
  }
}
