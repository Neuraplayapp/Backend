/**
 * 🎓 LEARNER PEDAGOGICAL PROFILE SERVICE
 * 
 * CRITICAL: This is the UNIFIED source of truth for learner's pedagogical state
 * Used by: Profile page, Dashboard, AI assistants, progress tracking
 * 
 * Aggregates:
 * - Competency mastery levels
 * - Knowledge gaps and strengths
 * - SM-2 review schedule
 * - Current learning position
 * - Learning patterns and recommendations
 */

import { sm2SpacedRepetitionService } from './SM2SpacedRepetitionService';
import { competencyMasteryTracker } from './CompetencyMasteryTracker';
import { unifiedProgressCalculator } from './UnifiedProgressCalculator';
import type { UnifiedProgressMetrics } from './UnifiedProgressCalculator';
import type { CompetencyProgress } from './CompetencyMasteryTracker';
import type { LearnerPracticeState } from '../types/LearningModule.types';

export interface LearnerPedagogicalProfile {
  learnerId: string;
  
  // COMPETENCY STATE
  competencies: CompetencyProgress[];
  overallMastery: number; // 0-100
  masteredCount: number; // Competencies >= 80%
  knowledgeGaps: string[]; // Competencies < 60%
  strengthAreas: string[]; // Competencies >= 80%
  
  // SPACED REPETITION STATE
  itemsDueToday: number;
  itemsReviewedToday: number;
  reviewStreak: number; // Days in a row
  upcomingReviews: Map<string, number>; // Next 7 days forecast
  
  // COURSE PROGRESS
  coursesInProgress: Array<{
    moduleId: string;
    title: string;
    overallProgress: number;
    competencyMastery: number;
    lastAccessed: Date;
  }>;
  coursesCompleted: number;
  
  // RECOMMENDATIONS
  nextAction: string;
  needsReview: string[]; // Competencies needing attention
  
  // METADATA
  lastUpdated: Date;
}

export class LearnerPedagogicalProfileService {
  private cache: Map<string, { profile: LearnerPedagogicalProfile; expiry: number }> = new Map();
  private readonly CACHE_TTL = 60000; // 60 seconds

  /**
   * Get comprehensive pedagogical profile for a learner
   * This is THE source of truth for all UI displays
   */
  async getProfile(learnerId: string): Promise<LearnerPedagogicalProfile> {
    // Check cache first
    const cached = this.cache.get(learnerId);
    if (cached && cached.expiry > Date.now()) {
      return cached.profile;
    }

    // Build fresh profile
    const profile = await this.buildProfile(learnerId);
    
    // Cache it
    this.cache.set(learnerId, {
      profile,
      expiry: Date.now() + this.CACHE_TTL
    });

    return profile;
  }

  /**
   * Invalidate cache for a learner (call after updates)
   */
  invalidateCache(learnerId: string): void {
    this.cache.delete(learnerId);
  }

  /**
   * Build profile from localStorage and UserContext
   * TODO: Eventually move to database queries
   */
  private async buildProfile(learnerId: string): Promise<LearnerPedagogicalProfile> {
    // Get learning modules from localStorage (UserContext stores here)
    const userDataKey = 'neuraplay_user_data';
    let learningModules: any = {};
    
    try {
      const userData = localStorage.getItem(userDataKey);
      if (userData) {
        const parsed = JSON.parse(userData);
        learningModules = parsed.assessment?.learningModules || {};
      }
    } catch (err) {
      console.warn('Could not load user data:', err);
    }

    // Extract competencies from learning modules
    const competencies = this.extractCompetencies(learningModules);
    
    // Get practice states (for SM-2)
    const practiceStates = this.loadPracticeStates(learnerId);
    
    // Calculate SM-2 stats
    const sm2Stats = sm2SpacedRepetitionService.calculateStats(practiceStates);
    const upcomingReviews = sm2SpacedRepetitionService.getReviewForecast(practiceStates);

    // Calculate mastery metrics
    const masteryData = competencyMasteryTracker.formatForDashboard(competencies);

    // Get courses in progress
    const coursesInProgress = Object.entries(learningModules)
      .filter(([_, data]: [string, any]) => data.status === 'in_progress')
      .map(([moduleId, data]: [string, any]) => ({
        moduleId,
        title: moduleId.replace(/-/g, ' '),
        overallProgress: data.overallComprehension || 0,
        competencyMastery: data.overallComprehension || 0,
        lastAccessed: data.lastAccessed ? new Date(data.lastAccessed) : new Date()
      }));

    const coursesCompleted = Object.values(learningModules)
      .filter((data: any) => data.status === 'completed').length;

    // Get next action
    const nextAction = competencyMasteryTracker.getNextAction(competencies);

    const profile = {
      learnerId,
      competencies,
      overallMastery: masteryData.overallMastery,
      masteredCount: masteryData.masteredCount,
      knowledgeGaps: masteryData.gaps,
      strengthAreas: masteryData.strengths,
      itemsDueToday: sm2Stats.dueToday,
      itemsReviewedToday: sm2Stats.reviewedToday,
      reviewStreak: sm2Stats.streak,
      upcomingReviews,
      coursesInProgress,
      coursesCompleted,
      nextAction,
      needsReview: masteryData.gaps,
      lastUpdated: new Date()
    };
    
    console.log('📊 [PedagogicalProfile] Generated profile:', {
      competenciesCount: competencies.length,
      knowledgeGapsCount: masteryData.gaps.length,
      strengthAreasCount: masteryData.strengths.length,
      overallMastery: masteryData.overallMastery,
      coursesInProgress: coursesInProgress.length
    });
    
    return profile;
  }

  /**
   * Extract competencies from learning modules
   * NOW READS FROM STORED COURSE PROGRESS DATA
   */
  private extractCompetencies(learningModules: any): CompetencyProgress[] {
    const competencies: CompetencyProgress[] = [];
    
    console.log('🔍 [ExtractCompetencies] Starting extraction...');
    console.log('🔍 [ExtractCompetencies] LocalStorage keys:', Object.keys(localStorage).filter(k => k.startsWith('course_progress_')));

    // 🎓 NEW: Look for course_progress data with actual competencies
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('course_progress_')) {
        try {
          const progressData = JSON.parse(localStorage.getItem(key) || '{}');
          const course = progressData.generatedCourse;
          console.log(`🔍 [ExtractCompetencies] Found course_progress key: ${key}`, {
            hasCourse: !!course,
            hasCompetencies: !!course?.competencies,
            competenciesCount: course?.competencies?.length || 0
          });
          
          if (course?.competencies && Array.isArray(course.competencies)) {
            // Process each competency from the stored course
            course.competencies.forEach((comp: any) => {
              // Calculate progress based on sections/chunks completed
              const totalSections = course.sections?.length || 1;
              const completedSections = progressData.completedSteps?.length || 0;
              const progressPercent = Math.round((completedSections / totalSections) * 100);
              
              // Create assessment history
              const assessmentHistory = [{
                date: progressData.savedAt ? new Date(progressData.savedAt) : new Date(),
                score: progressPercent,
                source: key,
                confidence: 0.8
              }];

              const mastery = competencyMasteryTracker.calculateMastery(
                assessmentHistory,
                { masteryThreshold: comp.masteryThreshold || 80 }
              );

              competencies.push({
                competencyId: comp.id,
                competencyName: comp.name,
                currentLevel: progressPercent,
                masteryThreshold: comp.masteryThreshold || 80,
                trend: mastery.trend,
                confidence: mastery.confidence,
                assessmentHistory,
                indicators: comp.indicators || [],
                recommendation: mastery.recommendation,
                isBlocked: progressPercent < (comp.masteryThreshold || 80)
              });
            });
          }
        } catch (err) {
          console.warn('Could not parse course progress:', err);
        }
      }
    });

    // 🔄 FALLBACK: Also check old learning modules format
    Object.entries(learningModules).forEach(([moduleId, data]: [string, any]) => {
      // Only add if we don't already have competencies from course progress
      const existing = competencies.find(c => c.competencyId === moduleId);
      if (existing) return;

      const competencyName = moduleId.replace(/-/g, ' ');
      const level = data.overallComprehension || 0;
      
      // Create assessment history from the data we have
      const assessmentHistory = [];
      if (data.questionsAnswered > 0) {
        assessmentHistory.push({
          date: data.lastAccessed ? new Date(data.lastAccessed) : new Date(),
          score: level,
          source: moduleId,
          confidence: data.accuracyRate ? data.accuracyRate / 100 : 0.8
        });
      }

      const mastery = competencyMasteryTracker.calculateMastery(
        assessmentHistory,
        { masteryThreshold: 80 }
      );

      competencies.push({
        competencyId: moduleId,
        competencyName,
        currentLevel: level,
        masteryThreshold: 80,
        trend: mastery.trend,
        confidence: mastery.confidence,
        assessmentHistory,
        recommendation: mastery.recommendation,
        indicators: []
      });
    });

    return competencies;
  }

  /**
   * Load practice states from localStorage
   * TODO: Move to database
   */
  private loadPracticeStates(learnerId: string): LearnerPracticeState[] {
    try {
      const key = `practice_states_${learnerId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        return parsed.map((state: any) => ({
          ...state,
          nextReviewDate: new Date(state.nextReviewDate),
          reviewHistory: state.reviewHistory.map((r: any) => ({
            ...r,
            date: new Date(r.date)
          }))
        }));
      }
    } catch (err) {
      console.warn('Could not load practice states:', err);
    }
    return [];
  }

  /**
   * 🎯 Build review context for Neural Spaced Mastery
   */
  buildReviewContext(profile: LearnerPedagogicalProfile): any {
    const hour = new Date().getHours();
    const timeOfDay = 
      hour < 12 ? 'morning' as const :
      hour < 17 ? 'afternoon' as const :
      hour < 21 ? 'evening' as const : 'night' as const;
    
    return {
      profile,
      emotionalState: 'focused' as const,
      timeOfDay,
      sessionDuration: 0,
      itemsReviewedThisSession: 0,
      consecutiveCorrect: 0,
      consecutiveWrong: 0,
      distractions: 0,
      deviceType: this.detectDeviceType()
    };
  }
  
  private detectDeviceType(): 'mobile' | 'desktop' | 'tablet' {
    if (typeof window === 'undefined') return 'desktop';
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }
  
  /**
   * Format profile for AI context (injected into prompts)
   */
  formatForAI(profile: LearnerPedagogicalProfile): string {
    let context = '\n\n🎓 **LEARNER PEDAGOGICAL PROFILE:**\n\n';

    // Competency state
    context += `🧠 **COMPETENCY MASTERY:**\n`;
    context += `- Overall: ${profile.overallMastery}%\n`;
    context += `- Mastered: ${profile.masteredCount} skills\n`;

    if (profile.knowledgeGaps.length > 0) {
      context += `- ⚠️ **Knowledge Gaps**: ${profile.knowledgeGaps.slice(0, 3).join(', ')}\n`;
    }

    if (profile.strengthAreas.length > 0) {
      context += `- ✅ **Strengths**: ${profile.strengthAreas.slice(0, 3).join(', ')}\n`;
    }

    context += `\n`;

    // Spaced repetition state
    if (profile.itemsDueToday > 0) {
      context += `📚 **REVIEW QUEUE:**\n`;
      context += `- ${profile.itemsDueToday} items due for review TODAY\n`;
      if (profile.reviewStreak > 0) {
        context += `- 🔥 Current streak: ${profile.reviewStreak} days\n`;
      }
      context += `\n`;
    }

    // Top competencies
    if (profile.competencies.length > 0) {
      context += `📊 **COMPETENCY DETAILS:**\n`;
      profile.competencies.slice(0, 5).forEach(c => {
        const icon = c.currentLevel >= 80 ? '✅' : c.currentLevel >= 60 ? '🔄' : '⚠️';
        const trend = c.trend === 'improving' ? '↗️' : c.trend === 'declining' ? '↘️' : '→';
        context += `- ${icon} ${c.competencyName}: ${c.currentLevel}% ${trend}\n`;
      });
      context += `\n`;
    }

    // Next action
    context += `💡 **NEXT ACTION:** ${profile.nextAction}\n\n`;

    context += `**CRITICAL FOR AI TUTOR:**\n`;
    context += `- When answering, consider knowledge gaps: ${profile.knowledgeGaps.slice(0, 3).join(', ') || 'None'}\n`;
    context += `- Build on strengths: ${profile.strengthAreas.slice(0, 3).join(', ') || 'Building foundations'}\n`;
    if (profile.itemsDueToday > 0) {
      context += `- Encourage review of ${profile.itemsDueToday} due items\n`;
    }

    return context;
  }

  /**
   * Update profile when learner completes learning activity
   */
  async recordLearningActivity(
    learnerId: string,
    moduleId: string,
    competencyLevel: number
  ): Promise<void> {
    // Invalidate cache so next fetch rebuilds with new data
    this.invalidateCache(learnerId);
    
    console.log(`📝 Learning activity recorded: ${moduleId} at ${competencyLevel}%`);
  }
}

export const learnerPedagogicalProfileService = new LearnerPedagogicalProfileService();

