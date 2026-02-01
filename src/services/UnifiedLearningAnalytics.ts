/**
 * 🎯 UNIFIED LEARNING ANALYTICS
 * 
 * Central aggregation point for ALL learning data across the system.
 * Provides comprehensive insights for:
 * - AI assistants (NeuraPlayAssistantLite, AIAssistantSmall)
 * - Dashboard displays
 * - Pedagogical profile generation
 * - Spaced repetition scheduling
 * 
 * DATA SOURCES:
 * - ChunkActivityTracker: Quiz performance, reading progress inside chunks
 * - FlashcardGeneratorService: Flashcard creation and review history
 * - DynamicQuizGenerator: Dynamic quiz results and statistics
 * - SM2SpacedRepetitionService: Spaced repetition schedules
 * - CompetencyMasteryTracker: Competency levels
 * - LearningModuleTracker: Course progress and session data
 * - DashboardContextService: Real-time dashboard activity
 */

import { storageManager } from '../utils/storageManager';

export interface LearningSnapshot {
  userId: string;
  timestamp: Date;
  
  // Overall progress
  coursesCompleted: number;
  coursesInProgress: number;
  totalLearningTimeMinutes: number;
  
  // Quiz & Assessment performance
  quizPerformance: {
    totalQuestionsAnswered: number;
    correctAnswers: number;
    overallAccuracy: number;
    averageTimePerQuestionMs: number;
    streakDays: number;
  };
  
  // Spaced Repetition State
  spacedRepetition: {
    totalItems: number;
    itemsDueToday: number;
    averageRetention: number;
    upcomingReviews: number;
    overdueItems: number;
  };
  
  // Flashcard Stats
  flashcards: {
    totalCards: number;
    mastered: number;
    struggling: number;
    dueToday: number;
    totalReviews: number;
  };
  
  // Competency levels
  competencies: Array<{
    name: string;
    level: number;
    trend: 'improving' | 'stable' | 'declining';
  }>;
  
  // Knowledge gaps & strengths
  knowledgeState: {
    gaps: string[];
    strengths: string[];
    recommendedFocus: string[];
  };
  
  // Engagement metrics
  engagement: {
    averageSessionMinutes: number;
    sessionsThisWeek: number;
    prefersTTS: boolean;
    hintsUsedPerSession: number;
    completionRate: number;
  };
  
  // Recent activity summary
  recentActivity: {
    lastSessionDate: Date | null;
    lastCourseAccessed: string | null;
    lastQuizScore: number | null;
    activeDaysThisWeek: number;
  };
}

export interface LearningTrend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  changePercent: number;
  timeframeDescription: string;
}

const ANALYTICS_CACHE_KEY = 'neuraplay_unified_analytics_cache';
const CACHE_TTL_MS = 60000; // 1 minute cache

class UnifiedLearningAnalyticsService {
  private static instance: UnifiedLearningAnalyticsService;
  private cache: Map<string, { snapshot: LearningSnapshot; timestamp: number }> = new Map();

  static getInstance(): UnifiedLearningAnalyticsService {
    if (!UnifiedLearningAnalyticsService.instance) {
      UnifiedLearningAnalyticsService.instance = new UnifiedLearningAnalyticsService();
    }
    return UnifiedLearningAnalyticsService.instance;
  }

  /**
   * 🎯 GET COMPREHENSIVE LEARNING SNAPSHOT
   * Main entry point - aggregates ALL learning data for a user
   */
  async getLearningSnapshot(userId: string, forceRefresh: boolean = false): Promise<LearningSnapshot> {
    // Check cache
    if (!forceRefresh) {
      const cached = this.cache.get(userId);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.snapshot;
      }
    }

    const snapshot: LearningSnapshot = {
      userId,
      timestamp: new Date(),
      coursesCompleted: 0,
      coursesInProgress: 0,
      totalLearningTimeMinutes: 0,
      quizPerformance: {
        totalQuestionsAnswered: 0,
        correctAnswers: 0,
        overallAccuracy: 0,
        averageTimePerQuestionMs: 0,
        streakDays: 0
      },
      spacedRepetition: {
        totalItems: 0,
        itemsDueToday: 0,
        averageRetention: 0,
        upcomingReviews: 0,
        overdueItems: 0
      },
      flashcards: {
        totalCards: 0,
        mastered: 0,
        struggling: 0,
        dueToday: 0,
        totalReviews: 0
      },
      competencies: [],
      knowledgeState: {
        gaps: [],
        strengths: [],
        recommendedFocus: []
      },
      engagement: {
        averageSessionMinutes: 0,
        sessionsThisWeek: 0,
        prefersTTS: false,
        hintsUsedPerSession: 0,
        completionRate: 0
      },
      recentActivity: {
        lastSessionDate: null,
        lastCourseAccessed: null,
        lastQuizScore: null,
        activeDaysThisWeek: 0
      }
    };

    // Aggregate from all sources
    await Promise.all([
      this.aggregateFromChunkActivity(snapshot, userId),
      this.aggregateFromFlashcards(snapshot, userId),
      this.aggregateFromDynamicQuiz(snapshot, userId),
      this.aggregateFromSM2(snapshot, userId),
      this.aggregateFromCompetencies(snapshot, userId),
      this.aggregateFromCourseProgress(snapshot, userId)
    ]);

    // Derive insights
    this.deriveKnowledgeState(snapshot);
    this.deriveEngagementMetrics(snapshot);

    // Cache and return
    this.cache.set(userId, { snapshot, timestamp: Date.now() });
    
    console.log('📊 UnifiedLearningAnalytics: Generated snapshot for', userId, {
      quizAccuracy: snapshot.quizPerformance.overallAccuracy,
      itemsDue: snapshot.spacedRepetition.itemsDueToday,
      gaps: snapshot.knowledgeState.gaps.length
    });

    return snapshot;
  }

  /**
   * 📊 AGGREGATE FROM CHUNK ACTIVITY TRACKER
   */
  private async aggregateFromChunkActivity(snapshot: LearningSnapshot, userId: string): Promise<void> {
    try {
      const { chunkActivityTracker } = await import('./ChunkActivityTracker');
      
      // Get recent activities
      const activities = chunkActivityTracker.getRecentActivities(userId, 100);
      
      // Quiz performance
      const quizAnswers = activities.filter(a => a.activityType === 'quiz_answer');
      if (quizAnswers.length > 0) {
        snapshot.quizPerformance.totalQuestionsAnswered = quizAnswers.length;
        snapshot.quizPerformance.correctAnswers = quizAnswers.filter(a => a.data?.isCorrect).length;
        snapshot.quizPerformance.overallAccuracy = Math.round(
          (snapshot.quizPerformance.correctAnswers / snapshot.quizPerformance.totalQuestionsAnswered) * 100
        );
        
        // Average time per question
        const totalTime = quizAnswers.reduce((sum, a) => sum + (a.data?.timeSpentMs || 0), 0);
        snapshot.quizPerformance.averageTimePerQuestionMs = Math.round(totalTime / quizAnswers.length);
      }
      
      // Get SM2 items due
      const sm2Due = chunkActivityTracker.getSM2ItemsDue(userId);
      snapshot.spacedRepetition.itemsDueToday = sm2Due.length;
      snapshot.spacedRepetition.overdueItems = sm2Due.filter(i => i.daysOverdue > 0).length;
      
      // Get weak concepts
      const weakConcepts = chunkActivityTracker.getWeakConceptsForQuiz(userId, 10);
      snapshot.knowledgeState.gaps = weakConcepts.map(c => c.concept);
      
      // Session data
      const chunkStarts = activities.filter(a => a.activityType === 'chunk_started');
      if (chunkStarts.length > 0) {
        snapshot.recentActivity.lastSessionDate = chunkStarts[0].timestamp;
        snapshot.recentActivity.lastCourseAccessed = chunkStarts[0].moduleName;
      }
      
      // TTS preference
      const ttsUsage = activities.filter(a => a.activityType === 'tts_used').length;
      snapshot.engagement.prefersTTS = ttsUsage > 5;
      
      // Hints used
      const hintsUsed = activities.filter(a => a.activityType === 'hint_used').length;
      snapshot.engagement.hintsUsedPerSession = Math.round(hintsUsed / Math.max(1, chunkStarts.length));
      
    } catch (e) {
      console.warn('⚠️ ChunkActivity aggregation failed:', e);
    }
  }

  /**
   * 🎴 AGGREGATE FROM FLASHCARDS
   */
  private async aggregateFromFlashcards(snapshot: LearningSnapshot, userId: string): Promise<void> {
    try {
      const { flashcardGeneratorService } = await import('./FlashcardGeneratorService');
      const stats = flashcardGeneratorService.getStats(userId);
      
      if (stats) {
        snapshot.flashcards = {
          totalCards: stats.totalCards,
          mastered: stats.mastered,
          struggling: stats.struggling,
          dueToday: stats.dueToday,
          totalReviews: stats.totalReviews
        };
        
        // Update streak
        snapshot.quizPerformance.streakDays = Math.max(
          snapshot.quizPerformance.streakDays,
          stats.streakDays
        );
        
        // Average retention from flashcards
        if (stats.averageRetention) {
          snapshot.spacedRepetition.averageRetention = stats.averageRetention;
        }
      }
    } catch (e) {
      console.warn('⚠️ Flashcard aggregation failed:', e);
    }
  }

  /**
   * 🧠 AGGREGATE FROM DYNAMIC QUIZ
   */
  private async aggregateFromDynamicQuiz(snapshot: LearningSnapshot, userId: string): Promise<void> {
    try {
      const { dynamicQuizGenerator } = await import('./DynamicQuizGenerator');
      const stats = dynamicQuizGenerator.getQuizStats(userId);
      
      if (stats) {
        // Add to quiz performance
        snapshot.quizPerformance.totalQuestionsAnswered += stats.questionsAnswered;
        snapshot.quizPerformance.streakDays = Math.max(
          snapshot.quizPerformance.streakDays,
          stats.streakDays
        );
        
        // Last quiz score
        if (stats.averageScore > 0) {
          snapshot.recentActivity.lastQuizScore = stats.averageScore;
        }
        
        // Weak areas
        if (stats.weakAreas && stats.weakAreas.length > 0) {
          stats.weakAreas.forEach(area => {
            if (!snapshot.knowledgeState.gaps.includes(area)) {
              snapshot.knowledgeState.gaps.push(area);
            }
          });
        }
      }
    } catch (e) {
      console.warn('⚠️ DynamicQuiz aggregation failed:', e);
    }
  }

  /**
   * 📅 AGGREGATE FROM SM2 SPACED REPETITION
   */
  private async aggregateFromSM2(snapshot: LearningSnapshot, userId: string): Promise<void> {
    try {
      const key = `sm2_items_${userId}`;
      const items = storageManager.get<Record<string, any>>(key) || {};
      const now = new Date();
      
      let totalItems = 0;
      let dueCount = 0;
      let upcomingCount = 0;
      let totalEase = 0;
      
      Object.values(items).forEach((item: any) => {
        totalItems++;
        totalEase += item.easeFactor || 2.5;
        
        const nextReview = new Date(item.nextReviewDate);
        if (nextReview <= now) {
          dueCount++;
        } else {
          // Check if within next 7 days
          const daysUntilReview = Math.ceil((nextReview.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilReview <= 7) {
            upcomingCount++;
          }
        }
      });
      
      snapshot.spacedRepetition.totalItems = totalItems;
      snapshot.spacedRepetition.itemsDueToday = Math.max(snapshot.spacedRepetition.itemsDueToday, dueCount);
      snapshot.spacedRepetition.upcomingReviews = upcomingCount;
      
      if (totalItems > 0) {
        const avgEase = totalEase / totalItems;
        snapshot.spacedRepetition.averageRetention = Math.round(((avgEase - 1.3) / 1.7) * 100);
      }
      
    } catch (e) {
      console.warn('⚠️ SM2 aggregation failed:', e);
    }
  }

  /**
   * 🎯 AGGREGATE FROM COMPETENCY TRACKER
   */
  private async aggregateFromCompetencies(snapshot: LearningSnapshot, userId: string): Promise<void> {
    try {
      const { competencyMasteryTracker } = await import('./CompetencyMasteryTracker');
      const profile = competencyMasteryTracker.getUserProfile(userId);
      
      if (profile && profile.competencies) {
        snapshot.competencies = Object.entries(profile.competencies).map(([name, data]: [string, any]) => ({
          name,
          level: data.level || 0,
          trend: this.determineTrend(data.history || [])
        }));
        
        // Identify strengths (> 70%)
        snapshot.competencies
          .filter(c => c.level >= 70)
          .forEach(c => {
            if (!snapshot.knowledgeState.strengths.includes(c.name)) {
              snapshot.knowledgeState.strengths.push(c.name);
            }
          });
        
        // Identify gaps (< 50%)
        snapshot.competencies
          .filter(c => c.level < 50)
          .forEach(c => {
            if (!snapshot.knowledgeState.gaps.includes(c.name)) {
              snapshot.knowledgeState.gaps.push(c.name);
            }
          });
      }
    } catch (e) {
      console.warn('⚠️ Competency aggregation failed:', e);
    }
  }

  /**
   * 📚 AGGREGATE FROM COURSE PROGRESS
   */
  private async aggregateFromCourseProgress(snapshot: LearningSnapshot, userId: string): Promise<void> {
    try {
      // Check localStorage for custom courses
      const storedCourses = localStorage.getItem('neuraplay_custom_courses');
      if (storedCourses) {
        const courses = JSON.parse(storedCourses);
        
        courses.forEach((course: any) => {
          const progressKey = `course_progress_${course.id}`;
          const progress = localStorage.getItem(progressKey);
          
          if (progress) {
            const progressData = JSON.parse(progress);
            if (progressData.progressPercent >= 100) {
              snapshot.coursesCompleted++;
            } else if (progressData.progressPercent > 0) {
              snapshot.coursesInProgress++;
            }
          }
        });
      }
      
      // Get time from learning module tracker
      const { learningModuleTracker } = await import('./LearningModuleTracker');
      const sessions = learningModuleTracker.getActiveSessions();
      
      let totalTimeMinutes = 0;
      Object.values(sessions).forEach((session: any) => {
        if (session.sessionDuration) {
          totalTimeMinutes += session.sessionDuration / 60000; // Convert ms to minutes
        }
      });
      
      snapshot.totalLearningTimeMinutes = Math.round(totalTimeMinutes);
      
    } catch (e) {
      console.warn('⚠️ Course progress aggregation failed:', e);
    }
  }

  /**
   * 🧠 DERIVE KNOWLEDGE STATE
   */
  private deriveKnowledgeState(snapshot: LearningSnapshot): void {
    // Recommend focus areas (prioritize gaps with low accuracy)
    const prioritized = [...snapshot.knowledgeState.gaps];
    
    // Also add overdue SM2 items as focus areas
    if (snapshot.spacedRepetition.overdueItems > 0) {
      if (!prioritized.includes('Overdue reviews')) {
        prioritized.unshift('Overdue spaced repetition items');
      }
    }
    
    snapshot.knowledgeState.recommendedFocus = prioritized.slice(0, 3);
  }

  /**
   * 📊 DERIVE ENGAGEMENT METRICS
   */
  private deriveEngagementMetrics(snapshot: LearningSnapshot): void {
    // Calculate completion rate from quiz accuracy and course progress
    const quizContribution = snapshot.quizPerformance.overallAccuracy * 0.4;
    const courseContribution = 
      (snapshot.coursesCompleted / Math.max(1, snapshot.coursesCompleted + snapshot.coursesInProgress)) * 100 * 0.6;
    
    snapshot.engagement.completionRate = Math.round(quizContribution + courseContribution);
    
    // Estimate sessions this week based on streak
    snapshot.engagement.sessionsThisWeek = Math.min(7, snapshot.quizPerformance.streakDays);
    snapshot.recentActivity.activeDaysThisWeek = snapshot.engagement.sessionsThisWeek;
    
    // Average session length (rough estimate)
    if (snapshot.quizPerformance.totalQuestionsAnswered > 0) {
      const avgTimePerQuestion = snapshot.quizPerformance.averageTimePerQuestionMs / 60000;
      snapshot.engagement.averageSessionMinutes = Math.round(
        avgTimePerQuestion * 10 // Assume ~10 questions per session
      );
    }
  }

  /**
   * Determine trend from history
   */
  private determineTrend(history: Array<{ score: number; date: Date }>): 'improving' | 'stable' | 'declining' {
    if (history.length < 2) return 'stable';
    
    const recent = history.slice(-5);
    if (recent.length < 2) return 'stable';
    
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, h) => sum + h.score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, h) => sum + h.score, 0) / secondHalf.length;
    
    const diff = secondAvg - firstAvg;
    if (diff > 5) return 'improving';
    if (diff < -5) return 'declining';
    return 'stable';
  }

  /**
   * 📈 GET LEARNING TRENDS
   * Compare current snapshot to previous periods
   */
  async getLearningTrends(userId: string): Promise<LearningTrend[]> {
    const trends: LearningTrend[] = [];
    const snapshot = await this.getLearningSnapshot(userId);
    
    // Quiz accuracy trend
    if (snapshot.quizPerformance.overallAccuracy > 0) {
      trends.push({
        metric: 'Quiz Accuracy',
        direction: snapshot.quizPerformance.overallAccuracy >= 70 ? 'up' : 'down',
        changePercent: snapshot.quizPerformance.overallAccuracy,
        timeframeDescription: 'Recent performance'
      });
    }
    
    // Retention trend
    if (snapshot.spacedRepetition.averageRetention > 0) {
      trends.push({
        metric: 'Memory Retention',
        direction: snapshot.spacedRepetition.averageRetention >= 60 ? 'up' : 'down',
        changePercent: snapshot.spacedRepetition.averageRetention,
        timeframeDescription: 'Based on SM2 ease factors'
      });
    }
    
    // Engagement trend
    trends.push({
      metric: 'Learning Streak',
      direction: snapshot.quizPerformance.streakDays > 0 ? 'up' : 'stable',
      changePercent: snapshot.quizPerformance.streakDays * 10,
      timeframeDescription: `${snapshot.quizPerformance.streakDays} day streak`
    });
    
    return trends;
  }

  /**
   * 🎯 FORMAT FOR AI ASSISTANT
   * Creates a comprehensive context string for AI consumption
   */
  async formatForAIAssistant(userId: string): Promise<string> {
    const snapshot = await this.getLearningSnapshot(userId);
    const parts: string[] = [];
    
    parts.push('📊 **COMPREHENSIVE LEARNING PROFILE:**');
    
    // Progress overview
    parts.push(`\n📚 **PROGRESS:** ${snapshot.coursesCompleted} courses completed, ${snapshot.coursesInProgress} in progress`);
    parts.push(`⏱️ Total learning time: ${snapshot.totalLearningTimeMinutes} minutes`);
    
    // Quiz performance
    if (snapshot.quizPerformance.totalQuestionsAnswered > 0) {
      parts.push(`\n🎯 **QUIZ PERFORMANCE:**`);
      parts.push(`- ${snapshot.quizPerformance.correctAnswers}/${snapshot.quizPerformance.totalQuestionsAnswered} correct (${snapshot.quizPerformance.overallAccuracy}%)`);
      parts.push(`- 🔥 ${snapshot.quizPerformance.streakDays} day streak`);
    }
    
    // Spaced repetition
    if (snapshot.spacedRepetition.itemsDueToday > 0 || snapshot.spacedRepetition.totalItems > 0) {
      parts.push(`\n🧠 **SPACED REPETITION:**`);
      parts.push(`- ${snapshot.spacedRepetition.itemsDueToday} items due for review`);
      parts.push(`- ${snapshot.spacedRepetition.averageRetention}% average retention`);
    }
    
    // Knowledge state
    if (snapshot.knowledgeState.gaps.length > 0) {
      parts.push(`\n⚠️ **FOCUS AREAS:** ${snapshot.knowledgeState.gaps.slice(0, 3).join(', ')}`);
    }
    if (snapshot.knowledgeState.strengths.length > 0) {
      parts.push(`✅ **STRENGTHS:** ${snapshot.knowledgeState.strengths.slice(0, 3).join(', ')}`);
    }
    
    // Recent activity
    if (snapshot.recentActivity.lastCourseAccessed) {
      parts.push(`\n📖 Last studying: "${snapshot.recentActivity.lastCourseAccessed}"`);
    }
    
    return parts.join('\n');
  }

  /**
   * Clear cache (call when significant learning activity occurs)
   */
  clearCache(userId: string): void {
    this.cache.delete(userId);
  }
}

// Export singleton
export const unifiedLearningAnalytics = UnifiedLearningAnalyticsService.getInstance();
export default unifiedLearningAnalytics;

