/**
 * 🎓 SM-2 SPACED REPETITION SERVICE
 * 
 * Implements the SuperMemo-2 algorithm for optimal review scheduling
 * INTEGRATES WITH: Existing LearningModuleTracker and UserContext
 * 
 * SM-2 Algorithm:
 * - Tracks repetitions, ease factor, interval
 * - Schedules reviews at optimal times for retention
 * - Adapts to learner performance (hard/easy feedback)
 */

import type { LearnerPracticeState } from '../types/LearningModule.types';

export type QualityRating = 0 | 1 | 2 | 3 | 4 | 5;
export type Feedback = 'forgot' | 'hard' | 'good' | 'easy';

export interface SM2Item {
  repetitions: number;      // Times correctly recalled
  easeFactor: number;       // 1.3-2.5, difficulty multiplier
  interval: number;         // Days until next review
  nextReviewDate: Date;
}

export interface SM2ReviewResult {
  item: SM2Item;
  shouldReviewAgain: boolean; // If quality < 3
}

export class SM2SpacedRepetitionService {
  /**
   * Create a new practice item with initial SM-2 state
   */
  createItem(): SM2Item {
    return {
      repetitions: 0,
      easeFactor: 2.5, // Default ease factor
      interval: 1, // Start with 1 day
      nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
    };
  }

  /**
   * Convert user feedback to SM-2 quality rating
   */
  feedbackToQuality(feedback: Feedback): QualityRating {
    switch (feedback) {
      case 'forgot': return 0; // Complete blackout
      case 'hard': return 3;   // Recalled with difficulty
      case 'good': return 4;   // Recalled with hesitation
      case 'easy': return 5;   // Perfect recall
      default: return 3;
    }
  }

  /**
   * Review an item and calculate next interval
   * Core SM-2 algorithm
   */
  review(item: SM2Item, quality: QualityRating): SM2ReviewResult {
    let { repetitions, easeFactor, interval } = item;

    // Update ease factor
    easeFactor = Math.max(
      1.3,
      easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );

    // If quality < 3, reset repetitions and interval
    if (quality < 3) {
      repetitions = 0;
      interval = 1;
    } else {
      repetitions += 1;

      // Calculate next interval
      if (repetitions === 1) {
        interval = 1;
      } else if (repetitions === 2) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
    }

    // Calculate next review date
    const nextReviewDate = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);

    return {
      item: {
        repetitions,
        easeFactor,
        interval,
        nextReviewDate
      },
      shouldReviewAgain: quality < 3
    };
  }

  /**
   * Get items due for review (on or before today)
   */
  getDueItems(items: LearnerPracticeState[]): LearnerPracticeState[] {
    const now = new Date();
    return items.filter(item => item.nextReviewDate <= now);
  }

  /**
   * Sort items by priority (most overdue first, then by ease factor)
   */
  sortByPriority(items: LearnerPracticeState[]): LearnerPracticeState[] {
    const now = new Date();
    return [...items].sort((a, b) => {
      // More overdue = higher priority
      const overdueDiff = a.nextReviewDate.getTime() - b.nextReviewDate.getTime();
      if (overdueDiff !== 0) return overdueDiff;

      // Lower ease factor = more difficult = higher priority
      return a.easeFactor - b.easeFactor;
    });
  }

  /**
   * Estimate current retention probability
   * Based on time since last review and ease factor
   */
  estimateRetention(item: SM2Item, lastReviewDate?: Date): number {
    if (!lastReviewDate) return 1.0;

    const now = new Date();
    const daysSinceReview = (now.getTime() - lastReviewDate.getTime()) / (24 * 60 * 60 * 1000);
    const expectedInterval = item.interval;

    // Simple exponential decay model
    // Retention = e^(-days_overdue / (interval * ease_factor))
    const daysOverdue = Math.max(0, daysSinceReview - expectedInterval);
    const decayRate = 1 / (expectedInterval * item.easeFactor);
    const retention = Math.exp(-daysOverdue * decayRate);

    return Math.max(0, Math.min(1, retention));
  }

  /**
   * Create interleaved practice session
   * Mixes topics to improve retention
   */
  createInterleavedSession(
    items: LearnerPracticeState[],
    maxItems: number = 15
  ): LearnerPracticeState[] {
    // Group by concept
    const byTopic = new Map<string, LearnerPracticeState[]>();
    items.forEach(item => {
      const concept = (item as any).concept || 'general';
      const existing = byTopic.get(concept) || [];
      existing.push(item);
      byTopic.set(concept, existing);
    });

    // Interleave: take one from each topic in rotation
    const interleaved: LearnerPracticeState[] = [];
    const topics = Array.from(byTopic.keys());
    let added = 0;

    while (added < maxItems && added < items.length && topics.length > 0) {
      for (const topic of [...topics]) {
        const topicItems = byTopic.get(topic)!;
        if (topicItems.length > 0) {
          interleaved.push(topicItems.shift()!);
          added++;
          if (added >= maxItems) break;
        }
        if (topicItems.length === 0) {
          topics.splice(topics.indexOf(topic), 1);
        }
      }
    }

    return interleaved;
  }

  /**
   * Get review forecast for next N days
   */
  getReviewForecast(
    items: LearnerPracticeState[],
    days: number = 7
  ): Map<string, number> {
    const forecast = new Map<string, number>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];

      const dueCount = items.filter(item => {
        const reviewDate = new Date(item.nextReviewDate);
        reviewDate.setHours(0, 0, 0, 0);
        return reviewDate.toISOString().split('T')[0] === dateKey;
      }).length;

      forecast.set(dateKey, dueCount);
    }

    return forecast;
  }

  /**
   * Update practice state with review result
   * FEEDS INTO: LearningModuleTracker and UserContext
   */
  updatePracticeState(
    state: LearnerPracticeState,
    feedback: Feedback,
    responseTime: number
  ): LearnerPracticeState {
    const quality = this.feedbackToQuality(feedback);
    const result = this.review(
      {
        repetitions: state.repetitions,
        easeFactor: state.easeFactor,
        interval: state.interval,
        nextReviewDate: state.nextReviewDate
      },
      quality
    );

    return {
      ...state,
      repetitions: result.item.repetitions,
      easeFactor: result.item.easeFactor,
      interval: result.item.interval,
      nextReviewDate: result.item.nextReviewDate,
      reviewHistory: [
        ...state.reviewHistory,
        { date: new Date(), quality, responseTime }
      ]
    };
  }

  /**
   * Calculate statistics for dashboard display
   */
  calculateStats(items: LearnerPracticeState[]): {
    totalItems: number;
    dueToday: number;
    reviewedToday: number;
    streak: number;
    avgRetention: number;
  } {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const dueToday = this.getDueItems(items).length;

    const reviewedToday = items.filter(item =>
      item.reviewHistory.some(
        review => review.date.toISOString().split('T')[0] === today
      )
    ).length;

    const streak = this.calculateStreak(items);

    const avgRetention =
      items.length > 0
        ? items.reduce((sum, item) => {
            const lastReview = item.reviewHistory[item.reviewHistory.length - 1];
            const retention = this.estimateRetention(item, lastReview?.date);
            return sum + retention;
          }, 0) / items.length
        : 1.0;

    return {
      totalItems: items.length,
      dueToday,
      reviewedToday,
      streak,
      avgRetention
    };
  }

  /**
   * Calculate review streak (consecutive days with reviews)
   */
  private calculateStreak(items: LearnerPracticeState[]): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];

      const hadReview = items.some(item =>
        item.reviewHistory.some(
          review => review.date.toISOString().split('T')[0] === dateStr
        )
      );

      if (hadReview) {
        streak++;
      } else if (i > 0) {
        // Streak broken (skip today since it might not be over yet)
        break;
      }
    }

    return streak;
  }
}

export const sm2SpacedRepetitionService = new SM2SpacedRepetitionService();

