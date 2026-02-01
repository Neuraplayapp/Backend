/**
 * 🎯 ADAPTIVE REVIEW SCHEDULER
 * 
 * Intelligent wrapper that chooses between SM-2 and Neural Spaced Mastery
 * based on available context and data
 * 
 * STRATEGY:
 * - Use NSM when we have rich context (profile, metadata, etc.)
 * - Fall back to SM-2 for simple cases or when data is missing
 * - Gradually migrate all reviews to NSM as we collect more data
 * 
 * BENEFITS:
 * - Backwards compatible with existing SM-2 code
 * - Graceful degradation
 * - Easy to A/B test NSM vs SM-2
 */

import { sm2SpacedRepetitionService, type Feedback } from './SM2SpacedRepetitionService';
import { neuralSpacedMasteryService, type ReviewContext, type NeuralItemMetadata, type NeuralReviewResult } from './NeuralSpacedMastery';
import { semanticClusteringService } from './SemanticClusteringService';
import type { LearnerPracticeState } from '../types/LearningModule.types';
import type { LearnerPedagogicalProfile } from './LearnerPedagogicalProfile';

export interface ReviewInput {
  // Required
  state: LearnerPracticeState;
  feedback: Feedback;
  responseTime: number;
  
  // Optional (enables NSM)
  profile?: LearnerPedagogicalProfile;
  metadata?: Partial<NeuralItemMetadata>;
  context?: Partial<ReviewContext>;
}

export interface UnifiedReviewResult {
  // Standard output
  state: LearnerPracticeState;
  
  // Enhanced output (when NSM used)
  enhanced?: NeuralReviewResult;
  method: 'sm2' | 'nsm';
  confidence: number;
}

export class AdaptiveReviewScheduler {
  private useNSMByDefault = true; // Feature flag
  private nsmUsageCount = 0;
  private sm2UsageCount = 0;
  
  /**
   * 🎯 MAIN: Schedule next review intelligently
   */
  async scheduleReview(input: ReviewInput): Promise<UnifiedReviewResult> {
    // Determine which algorithm to use
    const shouldUseNSM = this.shouldUseNeuralSM(input);
    
    if (shouldUseNSM && input.profile) {
      return await this.scheduleWithNSM(input);
    } else {
      return this.scheduleWithSM2(input);
    }
  }
  
  /**
   * 🧠 Schedule with Neural Spaced Mastery (Server-Side)
   */
  private async scheduleWithNSM(input: ReviewInput): Promise<UnifiedReviewResult> {
    this.nsmUsageCount++;
    
    try {
      // Build complete context
      const context = this.buildCompleteContext(input);
      
      // Call backend ML API
      const response = await fetch('/api/ml/schedule-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: input.profile!.learnerId,
          itemId: input.state.practiceItemId || `item_${Date.now()}`,
          courseId: input.state.courseId || 'unknown',
          competencyId: input.metadata?.competencyId || 'general',
          feedback: input.feedback,
          responseTime: input.responseTime,
          context: {
            deviceType: context.deviceType,
            timeOfDay: context.timeOfDay
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('Backend ML API failed');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'ML scheduling failed');
      }
      
      const result = data.result;
      
      // Update state with backend result
      const updatedState: LearnerPracticeState = {
        ...input.state,
        repetitions: result.repetitions,
        easeFactor: result.easeFactor,
        interval: result.interval,
        nextReviewDate: new Date(result.nextReviewDate),
        reviewHistory: [
          ...input.state.reviewHistory,
          {
            date: new Date(),
            quality: sm2SpacedRepetitionService.feedbackToQuality(input.feedback),
            responseTime: input.responseTime
          }
        ]
      };
      
      console.log(`🧠 [NSM] Scheduled review: ${result.adjustmentReason} (${result.interval} days)`);
      console.log(`📊 [NSM] Stats:`, result.stats);
      
      return {
        state: updatedState,
        enhanced: {
          repetitions: result.repetitions,
          easeFactor: result.easeFactor,
          interval: result.interval,
          nextReviewDate: new Date(result.nextReviewDate),
          adjustmentReason: result.adjustmentReason,
          adjustmentFactor: parseFloat(result.adjustmentFactor),
          confidenceScore: result.confidence,
          shouldReviewAgain: sm2SpacedRepetitionService.feedbackToQuality(input.feedback) < 3
        },
        method: 'nsm',
        confidence: result.confidence
      };
    } catch (error) {
      console.error('❌ [NSM] Failed, falling back to SM-2:', error);
      return this.scheduleWithSM2(input);
    }
  }
  
  /**
   * 📚 Schedule with classic SM-2
   */
  private scheduleWithSM2(input: ReviewInput): UnifiedReviewResult {
    this.sm2UsageCount++;
    
    const updatedState = sm2SpacedRepetitionService.updatePracticeState(
      input.state,
      input.feedback,
      input.responseTime
    );
    
    console.log(`📚 [SM-2] Scheduled review (${updatedState.interval} days)`);
    
    return {
      state: updatedState,
      method: 'sm2',
      confidence: 0.7 // SM-2 has moderate confidence
    };
  }
  
  /**
   * 🤔 Should we use Neural SM?
   */
  private shouldUseNeuralSM(input: ReviewInput): boolean {
    // Feature flag check
    if (!this.useNSMByDefault) return false;
    
    // Need profile for NSM
    if (!input.profile) return false;
    
    // Need minimum competency data
    if (input.profile.competencies.length === 0) return false;
    
    // Need item to have been reviewed at least once before (to establish baseline)
    if (input.state.reviewHistory.length < 1) return false;
    
    return true;
  }
  
  /**
   * 🏗️ Build complete metadata
   */
  private buildCompleteMetadata(input: ReviewInput): NeuralItemMetadata {
    const partial = input.metadata || {};
    const state = input.state;
    
    // Calculate average response time
    const avgResponseTime = state.reviewHistory.length > 0
      ? state.reviewHistory.reduce((sum, r) => sum + r.responseTime, 0) / state.reviewHistory.length
      : input.responseTime;
    
    // Calculate average quality
    const avgQuality = state.reviewHistory.length > 0
      ? state.reviewHistory.reduce((sum, r) => sum + r.quality, 0) / state.reviewHistory.length
      : sm2SpacedRepetitionService.feedbackToQuality(input.feedback);
    
    // Calculate consistency (lower variance = more consistent)
    const consistencyScore = this.calculateConsistency(state.reviewHistory);
    
    return {
      practiceItemId: partial.practiceItemId || state.practiceItemId || `item_${Date.now()}`,
      competencyId: partial.competencyId || 'general',
      concept: partial.concept || 'general_practice',
      
      difficulty: partial.difficulty || this.estimateDifficulty(state),
      contentType: partial.contentType || 'textual',
      cognitiveLoad: partial.cognitiveLoad || 0.5,
      
      relatedItemIds: partial.relatedItemIds || [],
      semanticCluster: partial.semanticCluster,
      
      createdAt: partial.createdAt || new Date(),
      lastReviewedAt: state.reviewHistory.length > 0 
        ? state.reviewHistory[state.reviewHistory.length - 1].date
        : undefined,
      totalReviews: state.reviewHistory.length,
      
      averageResponseTime: avgResponseTime,
      averageQuality: avgQuality,
      consistencyScore
    };
  }
  
  /**
   * 🏗️ Build complete context
   */
  private buildCompleteContext(input: ReviewInput): ReviewContext {
    const partial = input.context || {};
    const profile = input.profile!;
    
    const hour = new Date().getHours();
    const timeOfDay = 
      hour < 12 ? 'morning' :
      hour < 17 ? 'afternoon' :
      hour < 21 ? 'evening' : 'night';
    
    return {
      profile,
      emotionalState: partial.emotionalState || 'focused',
      timeOfDay: partial.timeOfDay || timeOfDay,
      
      sessionDuration: partial.sessionDuration || 0,
      itemsReviewedThisSession: partial.itemsReviewedThisSession || 0,
      consecutiveCorrect: partial.consecutiveCorrect || 0,
      consecutiveWrong: partial.consecutiveWrong || 0,
      
      distractions: partial.distractions || 0,
      deviceType: partial.deviceType || this.detectDeviceType()
    };
  }
  
  /**
   * 📊 Estimate item difficulty from performance
   */
  private estimateDifficulty(state: LearnerPracticeState): number {
    if (state.reviewHistory.length === 0) return 0.5;
    
    // Lower success rate = higher difficulty
    const successRate = state.reviewHistory.filter(r => r.quality >= 3).length / state.reviewHistory.length;
    return 1 - successRate;
  }
  
  /**
   * 📊 Calculate consistency score
   */
  private calculateConsistency(history: Array<{ quality: number }>): number {
    if (history.length < 2) return 1.0;
    
    const qualities = history.map(r => r.quality);
    const mean = qualities.reduce((sum, q) => sum + q, 0) / qualities.length;
    const variance = qualities.reduce((sum, q) => sum + Math.pow(q - mean, 2), 0) / qualities.length;
    
    // Normalize variance to 0-1 (lower variance = higher consistency)
    const maxVariance = 25; // Max possible variance with quality 0-5
    return Math.max(0, 1 - (variance / maxVariance));
  }
  
  /**
   * 📱 Detect device type
   */
  private detectDeviceType(): 'mobile' | 'desktop' | 'tablet' {
    if (typeof window === 'undefined') return 'desktop';
    
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }
  
  /**
   * 📊 Get usage statistics
   */
  getStats(): {
    nsmUsage: number;
    sm2Usage: number;
    nsmPercentage: number;
    totalReviews: number;
  } {
    const total = this.nsmUsageCount + this.sm2UsageCount;
    return {
      nsmUsage: this.nsmUsageCount,
      sm2Usage: this.sm2UsageCount,
      nsmPercentage: total > 0 ? (this.nsmUsageCount / total) * 100 : 0,
      totalReviews: total
    };
  }
  
  /**
   * 🎛️ Enable/disable NSM
   */
  setNSMEnabled(enabled: boolean): void {
    this.useNSMByDefault = enabled;
    console.log(`🎛️ [AdaptiveScheduler] NSM ${enabled ? 'enabled' : 'disabled'}`);
  }
}

export const adaptiveReviewScheduler = new AdaptiveReviewScheduler();

