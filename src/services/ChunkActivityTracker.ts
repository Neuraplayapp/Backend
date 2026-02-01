/**
 * 🎯 CHUNK ACTIVITY TRACKER
 * 
 * Tracks ALL user activities INSIDE course chunks:
 * - Quiz answers (correct/incorrect, time per question)
 * - Vocabulary learning (cards viewed, pronunciation listened)
 * - Reading progress (time spent, scroll depth)
 * - Hints used
 * - TTS usage
 * 
 * FEEDS INTO:
 * - SM2SpacedRepetitionService (scheduling)
 * - FlashcardGeneratorService (card generation)
 * - LearningModuleTracker (comprehension)
 * - UnifiedLearningAnalytics (aggregated insights)
 * 
 * This is the missing piece that connects WHAT user does to HOW AI responds.
 */

import { storageManager } from '../utils/storageManager';

export type ChunkActivityType = 
  | 'quiz_answer'
  | 'vocabulary_view'
  | 'vocabulary_pronunciation'
  | 'reading_progress'
  | 'hint_used'
  | 'tts_used'
  | 'key_point_viewed'
  | 'chunk_started'
  | 'chunk_completed'
  | 'image_generated'
  | 'example_explored';

export interface ChunkActivity {
  id: string;
  userId: string;
  moduleId: string;
  moduleName: string;
  sectionIndex: number;
  sectionTitle: string;
  chunkIndex: number;
  chunkId: string;
  chunkTitle: string;
  chunkType: string;
  
  activityType: ChunkActivityType;
  timestamp: Date;
  
  // Activity-specific data
  data: {
    // Quiz answers
    questionId?: string;
    questionText?: string;
    correctAnswer?: string;
    userAnswer?: string;
    isCorrect?: boolean;
    timeSpentMs?: number;
    hintsUsed?: number;
    
    // Vocabulary
    vocabularyTerm?: string;
    vocabularyMeaning?: string;
    
    // Reading
    readProgress?: number; // 0-100
    scrollDepth?: number;
    readingTimeMs?: number;
    
    // General
    conceptCovered?: string;
    difficultyRating?: 'easy' | 'medium' | 'hard';
  };
}

export interface ChunkPerformanceSummary {
  chunkId: string;
  chunkTitle: string;
  chunkType: string;
  moduleId: string;
  sectionIndex: number;
  chunkIndex: number;
  
  // Quiz performance
  quizAttempts: number;
  quizCorrect: number;
  quizAccuracy: number;
  averageQuizTimeMs: number;
  
  // Reading engagement
  totalReadingTimeMs: number;
  maxReadProgress: number;
  ttsUsed: boolean;
  
  // Vocabulary
  vocabularyTermsLearned: number;
  
  // Overall
  hintsUsed: number;
  completedAt?: Date;
  
  // Concepts for SM2
  conceptsStruggled: string[];
  conceptsMastered: string[];
}

export interface LearningAnalytics {
  userId: string;
  moduleId: string;
  
  // Aggregated across all chunks
  totalTimeSpentMs: number;
  totalQuizQuestions: number;
  totalCorrectAnswers: number;
  overallAccuracy: number;
  
  // Weak areas (for dynamic quiz generation)
  weakConcepts: Array<{
    concept: string;
    accuracy: number;
    attempts: number;
    lastAttempt: Date;
  }>;
  
  // Strong areas
  strongConcepts: Array<{
    concept: string;
    accuracy: number;
    attempts: number;
  }>;
  
  // Engagement metrics
  averageChunkCompletionRate: number;
  hintsUsedPerChunk: number;
  prefersTTS: boolean;
  
  // Learning velocity
  questionsPerMinute: number;
  readingSpeedWPM: number;
}

const STORAGE_KEY = 'neuraplay_chunk_activities';
const ANALYTICS_KEY = 'neuraplay_learning_analytics';

class ChunkActivityTrackerService {
  private activities: Map<string, ChunkActivity[]> = new Map(); // userId -> activities
  private chunkSummaries: Map<string, ChunkPerformanceSummary> = new Map(); // chunkId -> summary
  private listeners: Map<string, ((activity: ChunkActivity) => void)[]> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const data = storageManager.get<Record<string, ChunkActivity[]>>(STORAGE_KEY);
      if (data) {
        Object.entries(data).forEach(([userId, activities]) => {
          this.activities.set(userId, activities.map(a => ({
            ...a,
            timestamp: new Date(a.timestamp)
          })));
        });
      }
      console.log('📊 ChunkActivityTracker loaded:', this.activities.size, 'users');
    } catch (e) {
      console.warn('⚠️ Failed to load chunk activities:', e);
    }
  }

  private saveToStorage(): void {
    try {
      const data: Record<string, ChunkActivity[]> = {};
      this.activities.forEach((activities, userId) => {
        data[userId] = activities;
      });
      storageManager.set(STORAGE_KEY, data);
    } catch (e) {
      console.warn('⚠️ Failed to save chunk activities:', e);
    }
  }

  /**
   * 📝 TRACK ACTIVITY
   * Main method called by chunk viewers to record user activity
   */
  async trackActivity(params: {
    userId: string;
    moduleId: string;
    moduleName: string;
    sectionIndex: number;
    sectionTitle: string;
    chunkIndex: number;
    chunkId: string;
    chunkTitle: string;
    chunkType: string;
    activityType: ChunkActivityType;
    data?: ChunkActivity['data'];
  }): Promise<void> {
    const activity: ChunkActivity = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId: params.userId,
      moduleId: params.moduleId,
      moduleName: params.moduleName,
      sectionIndex: params.sectionIndex,
      sectionTitle: params.sectionTitle,
      chunkIndex: params.chunkIndex,
      chunkId: params.chunkId,
      chunkTitle: params.chunkTitle,
      chunkType: params.chunkType,
      activityType: params.activityType,
      timestamp: new Date(),
      data: params.data || {}
    };

    // Store activity
    const userActivities = this.activities.get(params.userId) || [];
    userActivities.push(activity);
    
    // Keep last 1000 activities per user
    if (userActivities.length > 1000) {
      userActivities.splice(0, userActivities.length - 1000);
    }
    
    this.activities.set(params.userId, userActivities);
    this.saveToStorage();

    // Update chunk summary
    this.updateChunkSummary(activity);

    // Notify listeners
    const listeners = this.listeners.get(params.userId) || [];
    listeners.forEach(fn => fn(activity));

    // 🎯 CRITICAL: Feed into other systems
    await this.feedIntoLearningSystem(activity);

    console.log(`📊 Tracked: ${params.activityType} in ${params.chunkTitle}`);
  }

  /**
   * 🎯 FEED INTO LEARNING SYSTEMS
   * This is where the magic happens - activities flow into SM2, flashcards, etc.
   */
  private async feedIntoLearningSystem(activity: ChunkActivity): Promise<void> {
    const { activityType, data, userId, moduleId, moduleName, chunkTitle } = activity;

    // Quiz answers → SM2 + Flashcards
    if (activityType === 'quiz_answer' && data.questionText && data.correctAnswer) {
      await this.processQuizAnswer(activity);
    }

    // Vocabulary → SM2 scheduling
    if (activityType === 'vocabulary_view' && data.vocabularyTerm) {
      await this.processVocabularyLearning(activity);
    }

    // Chunk completion → Update module progress
    if (activityType === 'chunk_completed') {
      await this.processChunkCompletion(activity);
    }
  }

  /**
   * 🎯 PROCESS QUIZ ANSWER
   * Creates SM2 items for concepts, generates flashcards for failures
   */
  private async processQuizAnswer(activity: ChunkActivity): Promise<void> {
    const { data, userId, moduleId, moduleName, chunkTitle } = activity;
    
    if (!data.questionText || data.isCorrect === undefined) return;

    try {
      // 1. Update SM2 for this concept
      const { sm2SpacedRepetitionService } = await import('./SM2SpacedRepetitionService');
      const conceptId = data.conceptCovered || `${moduleId}_${chunkTitle}`;
      
      // Create or update SM2 item
      const quality = data.isCorrect ? 4 : 1; // Good if correct, hard if wrong
      const item = sm2SpacedRepetitionService.createItem();
      const result = sm2SpacedRepetitionService.review(item, quality);
      
      // Store this concept for future review scheduling
      this.storeSM2Item(userId, conceptId, result.item, {
        questionText: data.questionText,
        correctAnswer: data.correctAnswer,
        moduleId,
        moduleName
      });

      // 2. If wrong, generate flashcard
      if (!data.isCorrect) {
        const { flashcardGeneratorService } = await import('./FlashcardGeneratorService');
        flashcardGeneratorService.generateFromQuizFailures(
          userId,
          moduleId,
          moduleName,
          [{
            question: data.questionText,
            correctAnswer: data.correctAnswer || '',
            userAnswer: data.userAnswer || '',
            concept: data.conceptCovered
          }]
        );
        console.log('🎴 Generated flashcard from quiz failure');
      }

      // 3. Update competency tracking
      const { competencyMasteryTracker } = await import('./CompetencyMasteryTracker');
      competencyMasteryTracker.recordAssessment(
        userId,
        data.conceptCovered || chunkTitle,
        {
          date: activity.timestamp,
          score: data.isCorrect ? 90 : 30,
          source: `quiz:${activity.id}`,
          confidence: 0.8
        }
      );

    } catch (e) {
      console.warn('⚠️ Failed to process quiz answer:', e);
    }
  }

  /**
   * 📚 PROCESS VOCABULARY LEARNING
   */
  private async processVocabularyLearning(activity: ChunkActivity): Promise<void> {
    const { data, userId, moduleId, moduleName } = activity;
    
    if (!data.vocabularyTerm) return;

    try {
      // Create SM2 item for vocabulary term
      const { sm2SpacedRepetitionService } = await import('./SM2SpacedRepetitionService');
      const conceptId = `vocab_${data.vocabularyTerm}`;
      
      const item = sm2SpacedRepetitionService.createItem();
      this.storeSM2Item(userId, conceptId, item, {
        questionText: `What does "${data.vocabularyTerm}" mean?`,
        correctAnswer: data.vocabularyMeaning || '',
        moduleId,
        moduleName,
        isVocabulary: true
      });

      console.log('📚 Vocabulary term added to SM2 schedule:', data.vocabularyTerm);
    } catch (e) {
      console.warn('⚠️ Failed to process vocabulary:', e);
    }
  }

  /**
   * ✅ PROCESS CHUNK COMPLETION
   */
  private async processChunkCompletion(activity: ChunkActivity): Promise<void> {
    const { userId, moduleId, sectionIndex, chunkIndex, chunkTitle } = activity;

    try {
      // Update learning module tracker
      const { dashboardContextService } = await import('./DashboardContextService');
      
      dashboardContextService.trackDashboardActivity(userId, {
        activityType: 'module_progress',
        moduleId,
        moduleName: activity.moduleName,
        moduleCategory: 'learning',
        currentPhase: 'course',
        progressData: {
          currentStepIndex: sectionIndex,
          currentChunkIndex: chunkIndex
        },
        sessionId: `chunk_${activity.id}`
      });

      console.log('✅ Chunk completion tracked:', chunkTitle);
    } catch (e) {
      console.warn('⚠️ Failed to process chunk completion:', e);
    }
  }

  /**
   * 💾 STORE SM2 ITEM
   * Persist SM2 scheduling data for later retrieval
   */
  private storeSM2Item(
    userId: string, 
    conceptId: string, 
    sm2Item: any,
    metadata: {
      questionText: string;
      correctAnswer: string;
      moduleId: string;
      moduleName: string;
      isVocabulary?: boolean;
    }
  ): void {
    try {
      const key = `sm2_items_${userId}`;
      const items = storageManager.get<Record<string, any>>(key) || {};
      
      items[conceptId] = {
        ...sm2Item,
        metadata,
        updatedAt: new Date()
      };

      storageManager.set(key, items);
    } catch (e) {
      console.warn('⚠️ Failed to store SM2 item:', e);
    }
  }

  /**
   * 📅 GET SM2 ITEMS DUE FOR REVIEW
   * Returns concepts that need review based on SM2 schedule
   */
  getSM2ItemsDue(userId: string): Array<{
    conceptId: string;
    questionText: string;
    correctAnswer: string;
    moduleId: string;
    moduleName: string;
    daysOverdue: number;
    easeFactor: number;
  }> {
    try {
      const key = `sm2_items_${userId}`;
      const items = storageManager.get<Record<string, any>>(key) || {};
      const now = new Date();
      
      const dueItems: any[] = [];
      
      Object.entries(items).forEach(([conceptId, item]) => {
        const nextReview = new Date(item.nextReviewDate);
        if (nextReview <= now) {
          const daysOverdue = Math.floor((now.getTime() - nextReview.getTime()) / (1000 * 60 * 60 * 24));
          dueItems.push({
            conceptId,
            questionText: item.metadata.questionText,
            correctAnswer: item.metadata.correctAnswer,
            moduleId: item.metadata.moduleId,
            moduleName: item.metadata.moduleName,
            daysOverdue: Math.max(0, daysOverdue),
            easeFactor: item.easeFactor
          });
        }
      });

      // Sort by most overdue first, then by lowest ease factor
      return dueItems.sort((a, b) => {
        if (a.daysOverdue !== b.daysOverdue) return b.daysOverdue - a.daysOverdue;
        return a.easeFactor - b.easeFactor;
      });
    } catch (e) {
      console.warn('⚠️ Failed to get SM2 items due:', e);
      return [];
    }
  }

  /**
   * 📊 GET CHUNK SUMMARY
   */
  getChunkSummary(chunkId: string): ChunkPerformanceSummary | null {
    return this.chunkSummaries.get(chunkId) || null;
  }

  /**
   * 📊 UPDATE CHUNK SUMMARY
   */
  private updateChunkSummary(activity: ChunkActivity): void {
    const summary = this.chunkSummaries.get(activity.chunkId) || {
      chunkId: activity.chunkId,
      chunkTitle: activity.chunkTitle,
      chunkType: activity.chunkType,
      moduleId: activity.moduleId,
      sectionIndex: activity.sectionIndex,
      chunkIndex: activity.chunkIndex,
      quizAttempts: 0,
      quizCorrect: 0,
      quizAccuracy: 0,
      averageQuizTimeMs: 0,
      totalReadingTimeMs: 0,
      maxReadProgress: 0,
      ttsUsed: false,
      vocabularyTermsLearned: 0,
      hintsUsed: 0,
      conceptsStruggled: [],
      conceptsMastered: []
    };

    const { activityType, data } = activity;

    switch (activityType) {
      case 'quiz_answer':
        summary.quizAttempts++;
        if (data.isCorrect) {
          summary.quizCorrect++;
          if (data.conceptCovered && !summary.conceptsMastered.includes(data.conceptCovered)) {
            summary.conceptsMastered.push(data.conceptCovered);
          }
        } else {
          if (data.conceptCovered && !summary.conceptsStruggled.includes(data.conceptCovered)) {
            summary.conceptsStruggled.push(data.conceptCovered);
          }
        }
        summary.quizAccuracy = (summary.quizCorrect / summary.quizAttempts) * 100;
        if (data.timeSpentMs) {
          summary.averageQuizTimeMs = 
            (summary.averageQuizTimeMs * (summary.quizAttempts - 1) + data.timeSpentMs) / summary.quizAttempts;
        }
        break;

      case 'reading_progress':
        if (data.readingTimeMs) summary.totalReadingTimeMs += data.readingTimeMs;
        if (data.readProgress && data.readProgress > summary.maxReadProgress) {
          summary.maxReadProgress = data.readProgress;
        }
        break;

      case 'tts_used':
        summary.ttsUsed = true;
        break;

      case 'vocabulary_view':
        summary.vocabularyTermsLearned++;
        break;

      case 'hint_used':
        summary.hintsUsed++;
        break;

      case 'chunk_completed':
        summary.completedAt = activity.timestamp;
        break;
    }

    this.chunkSummaries.set(activity.chunkId, summary);
  }

  /**
   * 📊 GET LEARNING ANALYTICS
   * Aggregated learning data for a module
   */
  getLearningAnalytics(userId: string, moduleId: string): LearningAnalytics {
    const userActivities = this.activities.get(userId) || [];
    const moduleActivities = userActivities.filter(a => a.moduleId === moduleId);

    // Calculate quiz performance
    const quizActivities = moduleActivities.filter(a => a.activityType === 'quiz_answer');
    const totalQuizQuestions = quizActivities.length;
    const totalCorrectAnswers = quizActivities.filter(a => a.data.isCorrect).length;
    const overallAccuracy = totalQuizQuestions > 0 ? (totalCorrectAnswers / totalQuizQuestions) * 100 : 0;

    // Calculate weak and strong concepts
    const conceptPerformance: Record<string, { correct: number; total: number; lastAttempt: Date }> = {};
    quizActivities.forEach(a => {
      const concept = a.data.conceptCovered || 'general';
      if (!conceptPerformance[concept]) {
        conceptPerformance[concept] = { correct: 0, total: 0, lastAttempt: a.timestamp };
      }
      conceptPerformance[concept].total++;
      if (a.data.isCorrect) conceptPerformance[concept].correct++;
      if (a.timestamp > conceptPerformance[concept].lastAttempt) {
        conceptPerformance[concept].lastAttempt = a.timestamp;
      }
    });

    const weakConcepts: LearningAnalytics['weakConcepts'] = [];
    const strongConcepts: LearningAnalytics['strongConcepts'] = [];

    Object.entries(conceptPerformance).forEach(([concept, perf]) => {
      const accuracy = (perf.correct / perf.total) * 100;
      if (accuracy < 60) {
        weakConcepts.push({ concept, accuracy, attempts: perf.total, lastAttempt: perf.lastAttempt });
      } else if (accuracy >= 80) {
        strongConcepts.push({ concept, accuracy, attempts: perf.total });
      }
    });

    // Calculate time metrics
    const readingActivities = moduleActivities.filter(a => a.activityType === 'reading_progress');
    const totalReadingTimeMs = readingActivities.reduce((sum, a) => sum + (a.data.readingTimeMs || 0), 0);
    const totalTimeSpentMs = moduleActivities.reduce((sum, a) => sum + (a.data.timeSpentMs || a.data.readingTimeMs || 0), 0);

    // Calculate engagement
    const completedChunks = moduleActivities.filter(a => a.activityType === 'chunk_completed').length;
    const startedChunks = moduleActivities.filter(a => a.activityType === 'chunk_started').length;
    const hintsUsed = moduleActivities.filter(a => a.activityType === 'hint_used').length;
    const ttsUsages = moduleActivities.filter(a => a.activityType === 'tts_used').length;

    return {
      userId,
      moduleId,
      totalTimeSpentMs,
      totalQuizQuestions,
      totalCorrectAnswers,
      overallAccuracy,
      weakConcepts: weakConcepts.sort((a, b) => a.accuracy - b.accuracy),
      strongConcepts: strongConcepts.sort((a, b) => b.accuracy - a.accuracy),
      averageChunkCompletionRate: startedChunks > 0 ? (completedChunks / startedChunks) * 100 : 0,
      hintsUsedPerChunk: startedChunks > 0 ? hintsUsed / startedChunks : 0,
      prefersTTS: ttsUsages > 5,
      questionsPerMinute: totalTimeSpentMs > 0 ? (totalQuizQuestions / (totalTimeSpentMs / 60000)) : 0,
      readingSpeedWPM: 200 // Default, would need word count tracking
    };
  }

  /**
   * 🎯 GET WEAK CONCEPTS FOR DYNAMIC QUIZ
   * Returns concepts user struggles with, for generating targeted quizzes
   */
  getWeakConceptsForQuiz(userId: string, limit: number = 10): Array<{
    concept: string;
    moduleId: string;
    moduleName: string;
    accuracy: number;
    lastAttempt: Date;
    sampleQuestion?: string;
  }> {
    const userActivities = this.activities.get(userId) || [];
    
    // Group by concept
    const conceptData: Record<string, {
      correct: number;
      total: number;
      moduleId: string;
      moduleName: string;
      lastAttempt: Date;
      sampleQuestion?: string;
    }> = {};

    userActivities
      .filter(a => a.activityType === 'quiz_answer' && a.data.conceptCovered)
      .forEach(a => {
        const concept = a.data.conceptCovered!;
        if (!conceptData[concept]) {
          conceptData[concept] = {
            correct: 0,
            total: 0,
            moduleId: a.moduleId,
            moduleName: a.moduleName,
            lastAttempt: a.timestamp,
            sampleQuestion: a.data.questionText
          };
        }
        conceptData[concept].total++;
        if (a.data.isCorrect) conceptData[concept].correct++;
        if (a.timestamp > conceptData[concept].lastAttempt) {
          conceptData[concept].lastAttempt = a.timestamp;
        }
      });

    return Object.entries(conceptData)
      .map(([concept, data]) => ({
        concept,
        moduleId: data.moduleId,
        moduleName: data.moduleName,
        accuracy: (data.correct / data.total) * 100,
        lastAttempt: data.lastAttempt,
        sampleQuestion: data.sampleQuestion
      }))
      .filter(c => c.accuracy < 70) // Weak = less than 70% accuracy
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, limit);
  }

  /**
   * 🎧 SUBSCRIBE TO ACTIVITIES
   * For real-time UI updates
   */
  subscribe(userId: string, callback: (activity: ChunkActivity) => void): () => void {
    const listeners = this.listeners.get(userId) || [];
    listeners.push(callback);
    this.listeners.set(userId, listeners);

    return () => {
      const current = this.listeners.get(userId) || [];
      this.listeners.set(userId, current.filter(fn => fn !== callback));
    };
  }

  /**
   * 📤 GET RECENT ACTIVITIES
   */
  getRecentActivities(userId: string, limit: number = 50): ChunkActivity[] {
    const activities = this.activities.get(userId) || [];
    return activities.slice(-limit).reverse();
  }

  /**
   * 🗑️ CLEAR USER DATA
   */
  clearUserData(userId: string): void {
    this.activities.delete(userId);
    this.saveToStorage();
  }
}

// Export singleton
export const chunkActivityTracker = new ChunkActivityTrackerService();
export default chunkActivityTracker;

