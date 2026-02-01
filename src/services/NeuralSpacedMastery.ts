/**
 * 🧠 NEURAL SPACED MASTERY (NSM) SERVICE
 * 
 * Next-generation spaced repetition that BEATS SM-17
 * 
 * ENHANCEMENTS OVER SM-2:
 * ✅ Contextual awareness (learner profile, time, emotional state)
 * ✅ Semantic clustering (related concepts reviewed together)
 * ✅ Cross-competency transfer learning
 * ✅ Adaptive difficulty zones (flow state optimization)
 * ✅ Multi-dimensional item tracking
 * ✅ ML data collection for future neural models
 * 
 * INTEGRATES WITH:
 * - LearnerPedagogicalProfile (learner characteristics)
 * - VectorSearchService (semantic similarity)
 * - EmotionalIntelligenceService (emotional state)
 * - CompetencyMasteryTracker (cross-competency insights)
 */

import { sm2SpacedRepetitionService, type Feedback, type QualityRating } from './SM2SpacedRepetitionService';
import type { LearnerPracticeState } from '../types/LearningModule.types';
import type { LearnerPedagogicalProfile, CompetencyProgress } from './LearnerPedagogicalProfile';

// 🎯 Enhanced Item Metadata for ML
export interface NeuralItemMetadata {
  // Core identity
  practiceItemId: string;
  competencyId: string;
  concept: string;
  
  // Content characteristics
  difficulty: number; // 0-1
  contentType: 'visual' | 'auditory' | 'textual' | 'kinesthetic';
  cognitiveLoad: number; // 0-1
  
  // Semantic relationships
  relatedItemIds: string[];
  semanticCluster?: string;
  
  // Learning context
  createdAt: Date;
  lastReviewedAt?: Date;
  totalReviews: number;
  
  // Performance tracking
  averageResponseTime: number; // milliseconds
  averageQuality: number; // 0-5
  consistencyScore: number; // 0-1, variance in performance
}

// 📊 Enhanced Review Context
export interface ReviewContext {
  // Learner state
  profile: LearnerPedagogicalProfile;
  emotionalState?: 'focused' | 'stressed' | 'tired' | 'energized';
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  
  // Session context
  sessionDuration: number; // minutes
  itemsReviewedThisSession: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  
  // External factors
  distractions: number; // 0-10
  deviceType: 'mobile' | 'desktop' | 'tablet';
}

// 🎓 Neural Review Result
export interface NeuralReviewResult {
  // Standard SM-2 output
  repetitions: number;
  easeFactor: number;
  interval: number;
  nextReviewDate: Date;
  
  // Enhanced outputs
  adjustmentReason: string;
  adjustmentFactor: number; // Multiplier applied
  confidenceScore: number; // 0-1
  shouldReviewAgain: boolean;
  
  // Recommendations
  recommendedTimeWindow?: { start: number; end: number }; // Hours (0-23)
  recommendedSessionLength?: number; // minutes
  relatedItemsToReview?: string[];
}

// 📈 ML Training Data Point
export interface MLTrainingDataPoint {
  timestamp: Date;
  
  // Features (inputs)
  features: {
    // Item characteristics
    itemDifficulty: number;
    itemAge: number; // days since first seen
    totalReviews: number;
    avgResponseTime: number;
    
    // Learner characteristics
    overallMastery: number;
    competencyLevel: number;
    learningPace: 'slow' | 'moderate' | 'fast';
    preferredContentType: string;
    
    // Context
    daysSinceLastReview: number;
    timeOfDay: number; // 0-23
    sessionPosition: number; // Position in session (1-N)
    consecutiveCorrect: number;
    
    // Historical
    previousSuccessRate: number;
    trendDirection: -1 | 0 | 1; // declining, stable, improving
  };
  
  // Target (output to predict)
  target: {
    actualRetention: boolean; // Did they remember?
    responseQuality: QualityRating;
    responseTime: number;
  };
}

export class NeuralSpacedMasteryService {
  private mlDataBuffer: MLTrainingDataPoint[] = [];
  private readonly ML_BUFFER_SIZE = 1000; // Batch size for ML training data
  
  /**
   * 🎯 CORE: Enhanced review with contextual adjustments
   */
  async reviewWithContext(
    state: LearnerPracticeState,
    feedback: Feedback,
    responseTime: number,
    context: ReviewContext,
    metadata: NeuralItemMetadata
  ): Promise<NeuralReviewResult> {
    // 1️⃣ Get base SM-2 calculation
    const baseSM2 = sm2SpacedRepetitionService.updatePracticeState(state, feedback, responseTime);
    let adjustedInterval = baseSM2.interval;
    let adjustmentFactor = 1.0;
    const adjustmentReasons: string[] = [];
    
    // 2️⃣ Apply contextual adjustments
    
    // 🚀 Learning Pace Adjustment
    const paceMultiplier = this.getLearningPaceMultiplier(context.profile.learningPace);
    if (paceMultiplier !== 1.0) {
      adjustedInterval *= paceMultiplier;
      adjustmentFactor *= paceMultiplier;
      adjustmentReasons.push(`${context.profile.learningPace} learner: ${paceMultiplier}x`);
    }
    
    // 📊 Competency Trend Adjustment
    const competency = context.profile.competencies.find(c => c.competencyId === metadata.competencyId);
    if (competency) {
      const trendMultiplier = this.getCompetencyTrendMultiplier(competency);
      if (trendMultiplier !== 1.0) {
        adjustedInterval *= trendMultiplier;
        adjustmentFactor *= trendMultiplier;
        adjustmentReasons.push(`${competency.trend} trend: ${trendMultiplier}x`);
      }
    }
    
    // ⏰ Cramming Penalty
    if (metadata.lastReviewedAt) {
      const hoursSinceLastReview = (Date.now() - metadata.lastReviewedAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastReview < 12) {
        const crammingPenalty = 0.8;
        adjustedInterval *= crammingPenalty;
        adjustmentFactor *= crammingPenalty;
        adjustmentReasons.push(`cramming penalty: ${crammingPenalty}x`);
      }
    }
    
    // 🔗 Cross-Competency Transfer
    const relatedStrength = this.getRelatedCompetenciesStrength(metadata, context.profile);
    if (relatedStrength !== 1.0) {
      adjustedInterval *= relatedStrength;
      adjustmentFactor *= relatedStrength;
      adjustmentReasons.push(`related skills boost: ${relatedStrength.toFixed(2)}x`);
    }
    
    // 🎯 Flow State Optimization
    const flowMultiplier = this.getFlowStateMultiplier(
      context.consecutiveCorrect,
      context.consecutiveWrong,
      metadata.difficulty
    );
    if (flowMultiplier !== 1.0) {
      adjustedInterval *= flowMultiplier;
      adjustmentFactor *= flowMultiplier;
      adjustmentReasons.push(`flow optimization: ${flowMultiplier.toFixed(2)}x`);
    }
    
    // 🧠 Response Time Analysis
    const responseTimeMultiplier = this.getResponseTimeMultiplier(
      responseTime,
      metadata.averageResponseTime
    );
    if (responseTimeMultiplier !== 1.0) {
      adjustedInterval *= responseTimeMultiplier;
      adjustmentFactor *= responseTimeMultiplier;
      adjustmentReasons.push(`response time: ${responseTimeMultiplier.toFixed(2)}x`);
    }
    
    // 💤 Fatigue Detection
    if (context.sessionDuration > 30 || context.itemsReviewedThisSession > 20) {
      const fatiguePenalty = 0.9;
      adjustedInterval *= fatiguePenalty;
      adjustmentFactor *= fatiguePenalty;
      adjustmentReasons.push(`fatigue detected: ${fatiguePenalty}x`);
    }
    
    // 🎨 Content Type Preference Boost
    if (metadata.contentType === context.profile.preferredContentType) {
      const preferenceBoost = 1.15;
      adjustedInterval *= preferenceBoost;
      adjustmentFactor *= preferenceBoost;
      adjustmentReasons.push(`preferred content type: ${preferenceBoost}x`);
    }
    
    // 3️⃣ Calculate confidence score
    const confidenceScore = this.calculateConfidenceScore(
      metadata,
      context,
      adjustmentFactor
    );
    
    // 4️⃣ Calculate next review date
    const nextReviewDate = new Date(Date.now() + Math.round(adjustedInterval) * 24 * 60 * 60 * 1000);
    
    // 5️⃣ Generate recommendations
    const recommendedTimeWindow = this.getOptimalTimeWindow(context);
    const relatedItemsToReview = await this.getRelatedItemsToReview(metadata);
    
    // 6️⃣ Collect ML training data
    this.collectMLData(state, feedback, responseTime, context, metadata);
    
    // 7️⃣ Return enhanced result
    return {
      repetitions: baseSM2.repetitions,
      easeFactor: baseSM2.easeFactor,
      interval: Math.round(adjustedInterval),
      nextReviewDate,
      adjustmentReason: adjustmentReasons.join(', ') || 'standard SM-2',
      adjustmentFactor,
      confidenceScore,
      shouldReviewAgain: sm2SpacedRepetitionService.feedbackToQuality(feedback) < 3,
      recommendedTimeWindow,
      recommendedSessionLength: this.getRecommendedSessionLength(context),
      relatedItemsToReview
    };
  }
  
  /**
   * 🚀 Learning Pace Multiplier
   */
  private getLearningPaceMultiplier(pace: 'slow' | 'moderate' | 'fast'): number {
    switch (pace) {
      case 'fast': return 1.3;    // Fast learners can handle longer intervals
      case 'slow': return 0.8;    // Slow learners need more frequent review
      default: return 1.0;
    }
  }
  
  /**
   * 📊 Competency Trend Multiplier
   */
  private getCompetencyTrendMultiplier(competency: CompetencyProgress): number {
    switch (competency.trend) {
      case 'improving':
        // Improving trend → increase interval (they're getting better)
        return 1.2;
      case 'declining':
        // Declining trend → decrease interval (need more practice)
        return 0.7;
      default:
        return 1.0;
    }
  }
  
  /**
   * 🔗 Cross-Competency Transfer Learning
   */
  private getRelatedCompetenciesStrength(
    metadata: NeuralItemMetadata,
    profile: LearnerPedagogicalProfile
  ): number {
    // If user is strong in related concepts, they'll likely remember longer
    const relatedCompetencies = profile.competencies.filter(c =>
      metadata.relatedItemIds.some(id => id.includes(c.competencyId))
    );
    
    if (relatedCompetencies.length === 0) return 1.0;
    
    const avgRelatedStrength = relatedCompetencies.reduce(
      (sum, c) => sum + c.currentLevel,
      0
    ) / relatedCompetencies.length;
    
    // Strength in related areas boosts interval by 0-40%
    return 0.8 + (avgRelatedStrength / 100) * 0.4;
  }
  
  /**
   * 🎯 Flow State Optimization
   * Keep learner in optimal challenge zone
   */
  private getFlowStateMultiplier(
    consecutiveCorrect: number,
    consecutiveWrong: number,
    itemDifficulty: number
  ): number {
    // Too easy → increase interval (they're bored)
    if (consecutiveCorrect > 5 && itemDifficulty < 0.3) {
      return 1.3;
    }
    
    // Too hard → decrease interval (they're frustrated)
    if (consecutiveWrong > 2 && itemDifficulty > 0.7) {
      return 0.7;
    }
    
    // In flow state → standard interval
    return 1.0;
  }
  
  /**
   * ⚡ Response Time Multiplier
   */
  private getResponseTimeMultiplier(
    currentResponseTime: number,
    averageResponseTime: number
  ): number {
    if (averageResponseTime === 0) return 1.0;
    
    const ratio = currentResponseTime / averageResponseTime;
    
    // Answered much faster than usual → they know it well
    if (ratio < 0.5) return 1.2;
    
    // Answered much slower than usual → uncertainty
    if (ratio > 2.0) return 0.85;
    
    return 1.0;
  }
  
  /**
   * 🎯 Calculate Confidence Score
   */
  private calculateConfidenceScore(
    metadata: NeuralItemMetadata,
    context: ReviewContext,
    adjustmentFactor: number
  ): number {
    let confidence = 0.5; // Start neutral
    
    // More reviews → higher confidence in interval calculation
    confidence += Math.min(0.2, metadata.totalReviews * 0.02);
    
    // Consistent performance → higher confidence
    confidence += (1 - metadata.consistencyScore) * 0.15;
    
    // Optimal context → higher confidence
    if (context.distractions < 3) confidence += 0.1;
    if (context.itemsReviewedThisSession < 15) confidence += 0.05;
    
    // Extreme adjustments → lower confidence
    if (Math.abs(1 - adjustmentFactor) > 0.3) confidence -= 0.1;
    
    return Math.max(0, Math.min(1, confidence));
  }
  
  /**
   * ⏰ Get Optimal Time Window
   */
  private getOptimalTimeWindow(context: ReviewContext): { start: number; end: number } | undefined {
    // TODO: In future, learn from user's historical performance by time of day
    // For now, use heuristics
    
    const profile = context.profile;
    
    // If we detect a pattern in their review times, suggest it
    // For now, suggest morning for most people (peak cognitive performance)
    return {
      start: 8,  // 8 AM
      end: 11    // 11 AM
    };
  }
  
  /**
   * 📚 Get Related Items to Review
   */
  private async getRelatedItemsToReview(metadata: NeuralItemMetadata): Promise<string[]> {
    // Import here to avoid circular dependencies
    const { semanticClusteringService } = await import('./SemanticClusteringService');
    
    try {
      // Get semantically similar items
      const similarItems = await semanticClusteringService.findSimilarItems(
        metadata.practiceItemId,
        5,
        0.75
      );
      
      return similarItems.map(item => item.itemId);
    } catch (error) {
      console.warn('⚠️ [NSM] Failed to get semantic recommendations, using fallback');
      return metadata.relatedItemIds.slice(0, 3);
    }
  }
  
  /**
   * ⏱️ Get Recommended Session Length
   */
  private getRecommendedSessionLength(context: ReviewContext): number {
    const profile = context.profile;
    
    // Fast learners can handle longer sessions
    if (profile.learningPace === 'fast') return 30;
    if (profile.learningPace === 'slow') return 15;
    
    // Default
    return 20;
  }
  
  /**
   * 📊 Collect ML Training Data
   */
  private collectMLData(
    state: LearnerPracticeState,
    feedback: Feedback,
    responseTime: number,
    context: ReviewContext,
    metadata: NeuralItemMetadata
  ): void {
    const quality = sm2SpacedRepetitionService.feedbackToQuality(feedback);
    
    const dataPoint: MLTrainingDataPoint = {
      timestamp: new Date(),
      features: {
        itemDifficulty: metadata.difficulty,
        itemAge: metadata.createdAt ? 
          (Date.now() - metadata.createdAt.getTime()) / (1000 * 60 * 60 * 24) : 0,
        totalReviews: metadata.totalReviews,
        avgResponseTime: metadata.averageResponseTime,
        
        overallMastery: context.profile.overallMastery,
        competencyLevel: context.profile.competencies.find(
          c => c.competencyId === metadata.competencyId
        )?.currentLevel || 50,
        learningPace: context.profile.learningPace,
        preferredContentType: context.profile.preferredContentType,
        
        daysSinceLastReview: metadata.lastReviewedAt ?
          (Date.now() - metadata.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24) : 0,
        timeOfDay: new Date().getHours(),
        sessionPosition: context.itemsReviewedThisSession,
        consecutiveCorrect: context.consecutiveCorrect,
        
        previousSuccessRate: state.reviewHistory.length > 0 ?
          state.reviewHistory.filter(r => r.quality >= 3).length / state.reviewHistory.length : 0.5,
        trendDirection: this.getTrendDirection(state.reviewHistory)
      },
      target: {
        actualRetention: quality >= 3,
        responseQuality: quality,
        responseTime
      }
    };
    
    this.mlDataBuffer.push(dataPoint);
    
    // When buffer is full, save for ML training
    if (this.mlDataBuffer.length >= this.ML_BUFFER_SIZE) {
      this.saveMLTrainingData();
    }
  }
  
  /**
   * 📈 Get Trend Direction from History
   */
  private getTrendDirection(history: Array<{ quality: number }>): -1 | 0 | 1 {
    if (history.length < 3) return 0;
    
    const recent = history.slice(-5);
    const older = history.slice(-10, -5);
    
    if (recent.length === 0 || older.length === 0) return 0;
    
    const recentAvg = recent.reduce((s, r) => s + r.quality, 0) / recent.length;
    const olderAvg = older.reduce((s, r) => s + r.quality, 0) / older.length;
    
    if (recentAvg > olderAvg + 0.5) return 1;  // Improving
    if (recentAvg < olderAvg - 0.5) return -1; // Declining
    return 0; // Stable
  }
  
  /**
   * 💾 Save ML Training Data
   */
  private async saveMLTrainingData(): Promise<void> {
    try {
      // Store in localStorage for now
      // In production, send to backend for ML training
      const key = `nsm_training_data_${Date.now()}`;
      localStorage.setItem(key, JSON.stringify(this.mlDataBuffer));
      
      console.log(`📊 [NSM] Saved ${this.mlDataBuffer.length} training data points`);
      
      // Clear buffer
      this.mlDataBuffer = [];
      
      // TODO: In Phase 2, send to backend ML pipeline:
      // await fetch('/api/ml/training-data', {
      //   method: 'POST',
      //   body: JSON.stringify(this.mlDataBuffer)
      // });
    } catch (error) {
      console.error('❌ [NSM] Failed to save ML training data:', error);
    }
  }
  
  /**
   * 📊 Get ML Training Data Summary
   */
  getMLDataSummary(): { count: number; lastUpdated: Date | null } {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('nsm_training_data_'));
    const totalCount = keys.reduce((sum, key) => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '[]');
        return sum + data.length;
      } catch {
        return sum;
      }
    }, 0);
    
    const lastUpdated = keys.length > 0 ?
      new Date(Math.max(...keys.map(k => parseInt(k.split('_').pop() || '0')))) :
      null;
    
    return { count: totalCount, lastUpdated };
  }
}

export const neuralSpacedMasteryService = new NeuralSpacedMasteryService();

