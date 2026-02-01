/**
 * 🎯 UNIFIED PROGRESS CALCULATOR
 * 
 * Calculates comprehensive learning progress that combines:
 * - Course completion (sections/chunks)
 * - Competency mastery (observable skills)
 * - SM-2 review adherence (retention)
 * - Three-Period lesson progress (pedagogical depth)
 * 
 * FEEDS INTO: Existing UserContext and Dashboard progress indicators
 * UX: Enhances existing progress bars, doesn't create separate widgets
 */

import type { GeneratedCourse, CourseChunk, LearnerPracticeState } from '../types/LearningModule.types';

export interface UnifiedProgressMetrics {
  // Overall progress (0-100) - feeds into existing progress bars
  overallProgress: number;
  
  // Component breakdowns
  courseCompletion: number; // 0-100 (chunks completed)
  competencyMastery: number; // 0-100 (average mastery)
  reviewAdherence: number; // 0-100 (% of due reviews completed)
  threePeriodDepth: number; // 0-100 (how deeply they've learned)
  
  // Metadata for dashboard display
  chunksCompleted: number;
  totalChunks: number;
  competenciesMastered: number; // Above 80%
  totalCompetencies: number;
  itemsDueToday: number;
  itemsReviewedToday: number;
  currentStreak: number; // Days
  
  // Status for existing indicators
  status: 'not_started' | 'in_progress' | 'completed';
  lastActivity: Date;
  
  // Pedagogical insights for AI
  knowledgeGaps: string[];
  strengthAreas: string[];
  strugglingConcepts: string[];
  nextAction: string;
}

export interface ThreePeriodProgress {
  introduction: number; // 0-100
  recognition: number; // 0-100
  recall: number; // 0-100
  overall: number; // Average of three
}

export class UnifiedProgressCalculator {
  /**
   * Calculate complete progress for a learning module
   * This feeds into UserContext.learningModules[moduleId]
   */
  calculateModuleProgress(
    course: GeneratedCourse | null,
    completedChunks: Map<number, Set<number>>, // section -> chunks
    practiceStates: LearnerPracticeState[],
    competencyLevels: Array<{ name: string; level: number; threshold: number }>,
    threePeriodData?: Map<string, ThreePeriodProgress>
  ): UnifiedProgressMetrics {
    // 1. Course Completion (40% weight)
    const courseMetrics = this.calculateCourseCompletion(course, completedChunks);
    
    // 2. Competency Mastery (30% weight)
    const competencyMetrics = this.calculateCompetencyMastery(competencyLevels);
    
    // 3. Review Adherence (20% weight)
    const reviewMetrics = this.calculateReviewAdherence(practiceStates);
    
    // 4. Three-Period Depth (10% weight)
    const depthMetrics = this.calculateThreePeriodDepth(threePeriodData);
    
    // Calculate weighted overall progress
    const overallProgress = Math.round(
      courseMetrics.completion * 0.40 +
      competencyMetrics.mastery * 0.30 +
      reviewMetrics.adherence * 0.20 +
      depthMetrics.depth * 0.10
    );
    
    // Determine status
    let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
    if (courseMetrics.chunksCompleted === 0) {
      status = 'not_started';
    } else if (courseMetrics.chunksCompleted < courseMetrics.totalChunks) {
      status = 'in_progress';
    } else {
      status = 'completed';
    }
    
    // Extract pedagogical insights
    const knowledgeGaps = competencyLevels
      .filter(c => c.level < 60)
      .map(c => c.name);
    
    const strengthAreas = competencyLevels
      .filter(c => c.level >= 80)
      .map(c => c.name);
    
    // Determine next action
    const nextAction = this.determineNextAction(
      courseMetrics,
      reviewMetrics,
      competencyMetrics,
      knowledgeGaps
    );
    
    return {
      overallProgress,
      courseCompletion: courseMetrics.completion,
      competencyMastery: competencyMetrics.mastery,
      reviewAdherence: reviewMetrics.adherence,
      threePeriodDepth: depthMetrics.depth,
      chunksCompleted: courseMetrics.chunksCompleted,
      totalChunks: courseMetrics.totalChunks,
      competenciesMastered: competencyMetrics.mastered,
      totalCompetencies: competencyMetrics.total,
      itemsDueToday: reviewMetrics.dueToday,
      itemsReviewedToday: reviewMetrics.reviewedToday,
      currentStreak: reviewMetrics.streak,
      status,
      lastActivity: new Date(),
      knowledgeGaps,
      strengthAreas,
      strugglingConcepts: [], // TODO: track declining trends
      nextAction
    };
  }
  
  /**
   * Calculate course completion metrics
   */
  private calculateCourseCompletion(
    course: GeneratedCourse | null,
    completedChunks: Map<number, Set<number>>
  ): {
    completion: number;
    chunksCompleted: number;
    totalChunks: number;
  } {
    if (!course || !course.sections) {
      return { completion: 0, chunksCompleted: 0, totalChunks: 0 };
    }
    
    let totalChunks = 0;
    let chunksCompleted = 0;
    
    course.sections.forEach((section, sIdx) => {
      const sectionChunks = section.chunks?.length || 1;
      totalChunks += sectionChunks;
      
      const completed = completedChunks.get(sIdx)?.size || 0;
      chunksCompleted += completed;
    });
    
    const completion = totalChunks > 0
      ? Math.round((chunksCompleted / totalChunks) * 100)
      : 0;
    
    return { completion, chunksCompleted, totalChunks };
  }
  
  /**
   * Calculate competency mastery metrics
   */
  private calculateCompetencyMastery(
    competencyLevels: Array<{ name: string; level: number; threshold: number }>
  ): {
    mastery: number;
    mastered: number;
    total: number;
  } {
    if (competencyLevels.length === 0) {
      return { mastery: 0, mastered: 0, total: 0 };
    }
    
    const avgMastery = Math.round(
      competencyLevels.reduce((sum, c) => sum + c.level, 0) / competencyLevels.length
    );
    
    const mastered = competencyLevels.filter(c => c.level >= c.threshold).length;
    
    return {
      mastery: avgMastery,
      mastered,
      total: competencyLevels.length
    };
  }
  
  /**
   * Calculate review adherence (SM-2 completion rate)
   */
  private calculateReviewAdherence(
    practiceStates: LearnerPracticeState[]
  ): {
    adherence: number;
    dueToday: number;
    reviewedToday: number;
    streak: number;
  } {
    if (practiceStates.length === 0) {
      return { adherence: 100, dueToday: 0, reviewedToday: 0, streak: 0 };
    }
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Items due today
    const dueToday = practiceStates.filter(
      state => state.nextReviewDate.toISOString().split('T')[0] <= today
    ).length;
    
    // Items reviewed today
    const reviewedToday = practiceStates.filter(
      state => state.reviewHistory.some(
        review => review.date.toISOString().split('T')[0] === today
      )
    ).length;
    
    // Adherence rate
    const adherence = dueToday > 0
      ? Math.round((reviewedToday / dueToday) * 100)
      : 100; // No reviews due = perfect adherence
    
    // Calculate streak (simplified)
    const streak = this.calculateReviewStreak(practiceStates);
    
    return { adherence, dueToday, reviewedToday, streak };
  }
  
  /**
   * Calculate Three-Period depth (how thoroughly they're learning)
   */
  private calculateThreePeriodDepth(
    threePeriodData?: Map<string, ThreePeriodProgress>
  ): {
    depth: number;
  } {
    if (!threePeriodData || threePeriodData.size === 0) {
      return { depth: 100 }; // No data = assume full depth
    }
    
    const averages = Array.from(threePeriodData.values());
    const avgDepth = Math.round(
      averages.reduce((sum, p) => sum + p.overall, 0) / averages.length
    );
    
    return { depth: avgDepth };
  }
  
  /**
   * Calculate review streak
   */
  private calculateReviewStreak(practiceStates: LearnerPracticeState[]): number {
    if (practiceStates.length === 0) return 0;
    
    const today = new Date();
    let streak = 0;
    
    // Check each day backwards
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const hadReview = practiceStates.some(
        state => state.reviewHistory.some(
          review => review.date.toISOString().split('T')[0] === dateStr
        )
      );
      
      if (hadReview) {
        streak++;
      } else {
        break; // Streak broken
      }
    }
    
    return streak;
  }
  
  /**
   * Determine next recommended action
   */
  private determineNextAction(
    courseMetrics: { completion: number; chunksCompleted: number; totalChunks: number },
    reviewMetrics: { adherence: number; dueToday: number },
    competencyMetrics: { mastery: number; mastered: number; total: number },
    knowledgeGaps: string[]
  ): string {
    // Priority 1: Overdue reviews
    if (reviewMetrics.dueToday > 5 && reviewMetrics.adherence < 50) {
      return `Complete ${reviewMetrics.dueToday} overdue reviews`;
    }
    
    // Priority 2: Knowledge gaps
    if (knowledgeGaps.length > 0 && competencyMetrics.mastery < 60) {
      return `Review ${knowledgeGaps[0]} (needs reinforcement)`;
    }
    
    // Priority 3: Continue course
    if (courseMetrics.chunksCompleted < courseMetrics.totalChunks) {
      return `Continue learning (${courseMetrics.chunksCompleted}/${courseMetrics.totalChunks} chunks)`;
    }
    
    // Priority 4: Mastery improvement
    if (competencyMetrics.mastered < competencyMetrics.total) {
      return `Practice to improve mastery (${competencyMetrics.mastered}/${competencyMetrics.total} mastered)`;
    }
    
    // All done!
    return 'Course completed! Ready for new challenges';
  }
  
  /**
   * Format progress for existing dashboard display
   * Returns data that fits into current UserContext structure
   */
  formatForUserContext(metrics: UnifiedProgressMetrics): {
    overallComprehension: number; // Maps to competencyMastery
    timeSpent: number; // Calculate separately
    questionsAnswered: number; // From practice states
    accuracyRate: number; // From practice states
    status: 'not_started' | 'in_progress' | 'completed';
  } {
    return {
      overallComprehension: metrics.competencyMastery,
      timeSpent: 0, // TODO: track from session data
      questionsAnswered: metrics.itemsReviewedToday,
      accuracyRate: metrics.reviewAdherence,
      status: metrics.status
    };
  }
  
  /**
   * Enhance existing progress bar data with Montessori insights
   * This enriches the existing module.progress value
   */
  enhanceProgressBarData(
    existingProgress: number,
    metrics: UnifiedProgressMetrics
  ): {
    progress: number; // Main progress (use overallProgress)
    breakdown: {
      label: string;
      value: number;
      color: string;
    }[];
    badge?: {
      text: string;
      color: string;
    };
  } {
    // Use the unified progress instead of just completion
    const progress = metrics.overallProgress;
    
    // Breakdown for tooltip or expanded view
    const breakdown = [
      {
        label: 'Course Progress',
        value: metrics.courseCompletion,
        color: 'from-blue-500 to-cyan-500'
      },
      {
        label: 'Skill Mastery',
        value: metrics.competencyMastery,
        color: 'from-violet-500 to-purple-500'
      },
      {
        label: 'Review Adherence',
        value: metrics.reviewAdherence,
        color: 'from-green-500 to-emerald-500'
      },
      {
        label: 'Learning Depth',
        value: metrics.threePeriodDepth,
        color: 'from-orange-500 to-amber-500'
      }
    ];
    
    // Badge for items needing attention
    let badge: { text: string; color: string } | undefined;
    
    if (metrics.itemsDueToday > 0) {
      badge = {
        text: `${metrics.itemsDueToday} due`,
        color: 'bg-red-500'
      };
    } else if (metrics.knowledgeGaps.length > 0) {
      badge = {
        text: 'Needs review',
        color: 'bg-yellow-500'
      };
    } else if (metrics.status === 'completed') {
      badge = {
        text: 'Mastered',
        color: 'bg-green-500'
      };
    }
    
    return { progress, breakdown, badge };
  }
}

export const unifiedProgressCalculator = new UnifiedProgressCalculator();

