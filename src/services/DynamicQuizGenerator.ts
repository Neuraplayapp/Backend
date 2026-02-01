/**
 * 🎯 DYNAMIC QUIZ GENERATOR
 * 
 * Generates personalized quizzes based on:
 * - SM2 items due for review (spaced repetition)
 * - Weak concepts from ChunkActivityTracker
 * - Knowledge gaps from LearningModuleTracker
 * - Competency areas needing reinforcement
 * 
 * This creates the "dynamic quizzes" on the dashboard that
 * adapt to user performance over time.
 */

import { chunkActivityTracker } from './ChunkActivityTracker';
import { sm2SpacedRepetitionService, type Feedback } from './SM2SpacedRepetitionService';
import { flashcardGeneratorService } from './FlashcardGeneratorService';
import { storageManager } from '../utils/storageManager';

export interface DynamicQuizQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  hint?: string;
  
  // Source tracking
  source: {
    type: 'sm2_review' | 'weak_concept' | 'knowledge_gap' | 'flashcard' | 'ai_generated';
    conceptId?: string;
    moduleId?: string;
    moduleName?: string;
    daysOverdue?: number;
    easeFactor?: number;
  };
  
  // Difficulty based on performance history
  difficulty: 'easy' | 'medium' | 'hard';
  priority: number; // Higher = more important to review
}

export interface DynamicQuiz {
  id: string;
  userId: string;
  title: string;
  description: string;
  questions: DynamicQuizQuestion[];
  createdAt: Date;
  
  // Performance tracking
  startedAt?: Date;
  completedAt?: Date;
  score?: number;
  results?: Array<{
    questionId: string;
    userAnswer: string;
    isCorrect: boolean;
    timeSpentMs: number;
  }>;
  
  // Quiz type
  type: 'daily_review' | 'weak_areas' | 'spaced_repetition' | 'knowledge_check' | 'mixed';
}

export interface QuizGenerationOptions {
  maxQuestions?: number;
  includeSpacedRepetition?: boolean;
  includeWeakConcepts?: boolean;
  includeKnowledgeGaps?: boolean;
  moduleIds?: string[]; // Filter by specific modules
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
}

const QUIZ_HISTORY_KEY = 'neuraplay_dynamic_quiz_history';

class DynamicQuizGeneratorService {
  
  /**
   * 🎯 GENERATE DAILY REVIEW QUIZ
   * Main method for dashboard - creates personalized quiz for today
   */
  async generateDailyReviewQuiz(
    userId: string,
    options: QuizGenerationOptions = {}
  ): Promise<DynamicQuiz> {
    const maxQuestions = options.maxQuestions || 10;
    const questions: DynamicQuizQuestion[] = [];

    // 1. Get SM2 items due for review (highest priority)
    if (options.includeSpacedRepetition !== false) {
      const sm2Questions = await this.generateSM2ReviewQuestions(userId, Math.ceil(maxQuestions * 0.5));
      questions.push(...sm2Questions);
    }

    // 2. Get questions from weak concepts
    if (options.includeWeakConcepts !== false) {
      const weakQuestions = await this.generateWeakConceptQuestions(userId, Math.ceil(maxQuestions * 0.3));
      questions.push(...weakQuestions);
    }

    // 3. Fill remaining with knowledge gap questions
    if (options.includeKnowledgeGaps !== false && questions.length < maxQuestions) {
      const gapQuestions = await this.generateKnowledgeGapQuestions(userId, maxQuestions - questions.length);
      questions.push(...gapQuestions);
    }

    // 4. Add flashcard-based questions if still not enough
    if (questions.length < maxQuestions) {
      const flashcardQuestions = await this.generateFlashcardQuestions(userId, maxQuestions - questions.length);
      questions.push(...flashcardQuestions);
    }

    // Sort by priority (highest first)
    questions.sort((a, b) => b.priority - a.priority);

    // Take only maxQuestions
    const finalQuestions = questions.slice(0, maxQuestions);

    // Shuffle for variety (but keep rough priority ordering)
    this.shuffleWithPriorityBias(finalQuestions);

    const quiz: DynamicQuiz = {
      id: `quiz_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId,
      title: this.generateQuizTitle(finalQuestions),
      description: this.generateQuizDescription(finalQuestions),
      questions: finalQuestions,
      createdAt: new Date(),
      type: this.determineQuizType(finalQuestions)
    };

    console.log(`🎯 Generated dynamic quiz: ${finalQuestions.length} questions`);
    return quiz;
  }

  /**
   * 📅 GENERATE SM2 REVIEW QUESTIONS
   * Questions from items due for spaced repetition review
   */
  private async generateSM2ReviewQuestions(
    userId: string,
    maxCount: number
  ): Promise<DynamicQuizQuestion[]> {
    const questions: DynamicQuizQuestion[] = [];
    
    try {
      // Get SM2 items due from chunk activity tracker
      const dueItems = chunkActivityTracker.getSM2ItemsDue(userId);
      
      for (const item of dueItems.slice(0, maxCount)) {
        questions.push({
          id: `sm2_${item.conceptId}_${Date.now()}`,
          type: 'short_answer',
          question: item.questionText,
          correctAnswer: item.correctAnswer,
          source: {
            type: 'sm2_review',
            conceptId: item.conceptId,
            moduleId: item.moduleId,
            moduleName: item.moduleName,
            daysOverdue: item.daysOverdue,
            easeFactor: item.easeFactor
          },
          difficulty: this.easeToDifficulty(item.easeFactor),
          priority: this.calculateSM2Priority(item)
        });
      }
    } catch (e) {
      console.warn('⚠️ Failed to generate SM2 questions:', e);
    }

    return questions;
  }

  /**
   * 📉 GENERATE WEAK CONCEPT QUESTIONS
   * Questions targeting areas where user performed poorly
   */
  private async generateWeakConceptQuestions(
    userId: string,
    maxCount: number
  ): Promise<DynamicQuizQuestion[]> {
    const questions: DynamicQuizQuestion[] = [];
    
    try {
      const weakConcepts = chunkActivityTracker.getWeakConceptsForQuiz(userId, maxCount);
      
      for (const concept of weakConcepts) {
        // Generate a question for this weak concept
        const question = await this.generateQuestionForConcept(concept);
        if (question) {
          questions.push({
            ...question,
            source: {
              type: 'weak_concept',
              conceptId: concept.concept,
              moduleId: concept.moduleId,
              moduleName: concept.moduleName
            },
            difficulty: 'medium',
            priority: this.calculateWeakConceptPriority(concept)
          });
        }
      }
    } catch (e) {
      console.warn('⚠️ Failed to generate weak concept questions:', e);
    }

    return questions;
  }

  /**
   * 🧠 GENERATE KNOWLEDGE GAP QUESTIONS
   * Questions for identified knowledge gaps from learning sessions
   */
  private async generateKnowledgeGapQuestions(
    userId: string,
    maxCount: number
  ): Promise<DynamicQuizQuestion[]> {
    const questions: DynamicQuizQuestion[] = [];
    
    try {
      // Get knowledge gaps from learning module tracker
      const { learningModuleTracker } = await import('./LearningModuleTracker');
      const sessions = learningModuleTracker.getActiveSessions();
      
      const knowledgeGaps: string[] = [];
      Object.values(sessions).forEach((session: any) => {
        if (session.cognitiveMarkers?.knowledgeGaps) {
          knowledgeGaps.push(...session.cognitiveMarkers.knowledgeGaps);
        }
      });

      // Generate questions for each gap
      for (const gap of [...new Set(knowledgeGaps)].slice(0, maxCount)) {
        const question = await this.generateQuestionForConcept({ concept: gap });
        if (question) {
          questions.push({
            ...question,
            source: {
              type: 'knowledge_gap',
              conceptId: gap
            },
            difficulty: 'hard', // Gaps are challenging by nature
            priority: 80 // High priority
          });
        }
      }
    } catch (e) {
      console.warn('⚠️ Failed to generate knowledge gap questions:', e);
    }

    return questions;
  }

  /**
   * 🎴 GENERATE FLASHCARD QUESTIONS
   * Convert due flashcards into quiz questions
   */
  private async generateFlashcardQuestions(
    userId: string,
    maxCount: number
  ): Promise<DynamicQuizQuestion[]> {
    const questions: DynamicQuizQuestion[] = [];
    
    try {
      const dueCards = flashcardGeneratorService.getDueCards(userId, maxCount);
      
      for (const card of dueCards) {
        questions.push({
          id: `fc_${card.id}_${Date.now()}`,
          type: 'short_answer',
          question: card.front,
          correctAnswer: card.back.split('\n')[0], // First line is the answer
          hint: card.hint,
          explanation: card.back,
          source: {
            type: 'flashcard',
            conceptId: card.id,
            moduleId: card.source.moduleId,
            moduleName: card.source.moduleName
          },
          difficulty: card.difficulty,
          priority: this.calculateFlashcardPriority(card)
        });
      }
    } catch (e) {
      console.warn('⚠️ Failed to generate flashcard questions:', e);
    }

    return questions;
  }

  /**
   * 🤖 GENERATE QUESTION FOR CONCEPT
   * Uses LLM to create a question about a specific concept
   */
  private async generateQuestionForConcept(
    concept: { concept: string; sampleQuestion?: string; moduleName?: string }
  ): Promise<Partial<DynamicQuizQuestion> | null> {
    try {
      // If we have a sample question, use it directly
      if (concept.sampleQuestion) {
        return {
          id: `gen_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          type: 'short_answer',
          question: concept.sampleQuestion,
          correctAnswer: '' // Will need to be filled
        };
      }

      // Generate with LLM
      const { toolRegistry } = await import('./ToolRegistry');
      
      const prompt = `Generate a quiz question to test understanding of: "${concept.concept}"${concept.moduleName ? ` in the context of ${concept.moduleName}` : ''}.

Return JSON:
{
  "question": "Clear question text",
  "correctAnswer": "The correct answer",
  "options": ["A) option", "B) option", "C) option", "D) option"],
  "explanation": "Brief explanation of why this is correct"
}

JSON ONLY:`;

      const result = await toolRegistry.execute('llm-completion', {
        prompt,
        model: 'accounts/fireworks/models/gpt-oss-20b',
        temperature: 0.5,
        maxTokens: 300
      }, { sessionId: '', userId: '', startTime: Date.now() });

      if (result.success && result.data?.completion) {
        const match = result.data.completion.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          return {
            id: `gen_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            type: parsed.options ? 'multiple_choice' : 'short_answer',
            question: parsed.question,
            correctAnswer: parsed.correctAnswer,
            options: parsed.options,
            explanation: parsed.explanation
          };
        }
      }
    } catch (e) {
      console.warn('⚠️ LLM question generation failed:', e);
    }

    return null;
  }

  /**
   * 📊 RECORD QUIZ RESULTS
   * Updates SM2, competency tracking, and chunk activity based on quiz performance
   */
  async recordQuizResults(
    quiz: DynamicQuiz,
    results: Array<{
      questionId: string;
      userAnswer: string;
      isCorrect: boolean;
      timeSpentMs: number;
    }>
  ): Promise<void> {
    quiz.results = results;
    quiz.completedAt = new Date();
    quiz.score = results.filter(r => r.isCorrect).length / results.length * 100;

    // Update each question's source system
    for (const result of results) {
      const question = quiz.questions.find(q => q.id === result.questionId);
      if (!question) continue;

      const feedback: Feedback = result.isCorrect ? 'good' : 'hard';

      // Update based on source type
      switch (question.source.type) {
        case 'sm2_review':
          await this.updateSM2FromQuiz(quiz.userId, question, feedback);
          break;
          
        case 'flashcard':
          if (question.source.conceptId) {
            flashcardGeneratorService.recordReview(
              question.source.conceptId,
              feedback,
              result.timeSpentMs
            );
          }
          break;
          
        case 'weak_concept':
        case 'knowledge_gap':
          // Record in chunk activity tracker
          await chunkActivityTracker.trackActivity({
            userId: quiz.userId,
            moduleId: question.source.moduleId || 'dynamic_quiz',
            moduleName: question.source.moduleName || 'Dynamic Quiz',
            sectionIndex: 0,
            sectionTitle: 'Review',
            chunkIndex: 0,
            chunkId: `quiz_${quiz.id}`,
            chunkTitle: 'Dynamic Review Quiz',
            chunkType: 'quiz',
            activityType: 'quiz_answer',
            data: {
              questionText: question.question,
              correctAnswer: question.correctAnswer,
              userAnswer: result.userAnswer,
              isCorrect: result.isCorrect,
              timeSpentMs: result.timeSpentMs,
              conceptCovered: question.source.conceptId
            }
          });
          break;
      }
    }

    // Save quiz history
    this.saveQuizToHistory(quiz);

    console.log(`📊 Quiz results recorded: ${quiz.score?.toFixed(1)}%`);
  }

  /**
   * 📅 UPDATE SM2 FROM QUIZ
   */
  private async updateSM2FromQuiz(
    userId: string,
    question: DynamicQuizQuestion,
    feedback: Feedback
  ): Promise<void> {
    try {
      const key = `sm2_items_${userId}`;
      const items = storageManager.get<Record<string, any>>(key) || {};
      const conceptId = question.source.conceptId;
      
      if (conceptId && items[conceptId]) {
        const quality = sm2SpacedRepetitionService.feedbackToQuality(feedback);
        const result = sm2SpacedRepetitionService.review(items[conceptId], quality);
        items[conceptId] = {
          ...result.item,
          metadata: items[conceptId].metadata,
          updatedAt: new Date()
        };
        storageManager.set(key, items);
      }
    } catch (e) {
      console.warn('⚠️ Failed to update SM2 from quiz:', e);
    }
  }

  /**
   * 💾 SAVE QUIZ TO HISTORY
   */
  private saveQuizToHistory(quiz: DynamicQuiz): void {
    try {
      const history = storageManager.get<DynamicQuiz[]>(QUIZ_HISTORY_KEY) || [];
      history.push(quiz);
      
      // Keep last 50 quizzes
      if (history.length > 50) {
        history.splice(0, history.length - 50);
      }
      
      storageManager.set(QUIZ_HISTORY_KEY, history);
    } catch (e) {
      console.warn('⚠️ Failed to save quiz history:', e);
    }
  }

  /**
   * 📊 GET QUIZ HISTORY
   */
  getQuizHistory(userId: string, limit: number = 10): DynamicQuiz[] {
    try {
      const history = storageManager.get<DynamicQuiz[]>(QUIZ_HISTORY_KEY) || [];
      return history
        .filter(q => q.userId === userId)
        .slice(-limit)
        .reverse();
    } catch {
      return [];
    }
  }

  /**
   * 📊 GET QUIZ STATISTICS
   */
  getQuizStats(userId: string): {
    totalQuizzes: number;
    averageScore: number;
    questionsAnswered: number;
    conceptsReviewed: number;
    streakDays: number;
    weakAreas: string[];
  } {
    try {
      const history = storageManager.get<DynamicQuiz[]>(QUIZ_HISTORY_KEY) || [];
      const userQuizzes = history.filter(q => q.userId === userId && q.completedAt);
      
      const totalQuizzes = userQuizzes.length;
      const averageScore = totalQuizzes > 0
        ? userQuizzes.reduce((sum, q) => sum + (q.score || 0), 0) / totalQuizzes
        : 0;
      
      const questionsAnswered = userQuizzes.reduce(
        (sum, q) => sum + (q.results?.length || 0), 0
      );
      
      // Count unique concepts
      const concepts = new Set<string>();
      const weakConcepts = new Map<string, { correct: number; total: number }>();
      
      userQuizzes.forEach(q => {
        q.questions.forEach(question => {
          if (question.source.conceptId) {
            concepts.add(question.source.conceptId);
            
            const result = q.results?.find(r => r.questionId === question.id);
            if (result) {
              const existing = weakConcepts.get(question.source.conceptId) || { correct: 0, total: 0 };
              existing.total++;
              if (result.isCorrect) existing.correct++;
              weakConcepts.set(question.source.conceptId, existing);
            }
          }
        });
      });

      // Identify weak areas (< 60% accuracy)
      const weakAreas = Array.from(weakConcepts.entries())
        .filter(([_, data]) => data.total >= 2 && (data.correct / data.total) < 0.6)
        .map(([concept]) => concept)
        .slice(0, 5);

      return {
        totalQuizzes,
        averageScore: Math.round(averageScore),
        questionsAnswered,
        conceptsReviewed: concepts.size,
        streakDays: this.calculateQuizStreak(userQuizzes),
        weakAreas
      };
    } catch {
      return {
        totalQuizzes: 0,
        averageScore: 0,
        questionsAnswered: 0,
        conceptsReviewed: 0,
        streakDays: 0,
        weakAreas: []
      };
    }
  }

  /**
   * 🔥 CALCULATE QUIZ STREAK
   */
  private calculateQuizStreak(quizzes: DynamicQuiz[]): number {
    if (quizzes.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    let currentDate = today;

    const quizDates = quizzes
      .filter(q => q.completedAt)
      .map(q => {
        const d = new Date(q.completedAt!);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      });

    const uniqueDates = [...new Set(quizDates)].sort((a, b) => b - a);

    for (const dateTime of uniqueDates) {
      const dayDiff = Math.floor((currentDate.getTime() - dateTime) / (24 * 60 * 60 * 1000));
      
      if (dayDiff === 0 || dayDiff === 1) {
        streak++;
        currentDate = new Date(dateTime);
      } else {
        break;
      }
    }

    return streak;
  }

  // Helper methods
  private easeToDifficulty(easeFactor: number): 'easy' | 'medium' | 'hard' {
    if (easeFactor >= 2.3) return 'easy';
    if (easeFactor >= 1.8) return 'medium';
    return 'hard';
  }

  private calculateSM2Priority(item: any): number {
    // Higher priority for:
    // - More overdue items
    // - Lower ease factor (harder items)
    const overdueFactor = Math.min(item.daysOverdue * 10, 50);
    const easeFactor = (2.5 - item.easeFactor) * 20;
    return Math.round(50 + overdueFactor + easeFactor);
  }

  private calculateWeakConceptPriority(concept: any): number {
    // Lower accuracy = higher priority
    const accuracyFactor = 100 - concept.accuracy;
    return Math.round(accuracyFactor);
  }

  private calculateFlashcardPriority(card: any): number {
    // Based on SM2 state
    const easeFactor = (2.5 - card.sm2.easeFactor) * 15;
    const reviewsFactor = Math.min(card.timesReviewed * 2, 20);
    return Math.round(40 + easeFactor + reviewsFactor);
  }

  private shuffleWithPriorityBias(questions: DynamicQuizQuestion[]): void {
    // Light shuffle - swap adjacent items occasionally
    for (let i = 0; i < questions.length - 1; i++) {
      if (Math.random() < 0.3) {
        [questions[i], questions[i + 1]] = [questions[i + 1], questions[i]];
      }
    }
  }

  private generateQuizTitle(questions: DynamicQuizQuestion[]): string {
    const sources = new Set(questions.map(q => q.source.type));
    
    if (sources.has('sm2_review')) return '📅 Daily Review Quiz';
    if (sources.has('weak_concept')) return '💪 Strengthening Quiz';
    if (sources.has('knowledge_gap')) return '🧠 Knowledge Gap Quiz';
    return '🎯 Personalized Quiz';
  }

  private generateQuizDescription(questions: DynamicQuizQuestion[]): string {
    const sm2Count = questions.filter(q => q.source.type === 'sm2_review').length;
    const weakCount = questions.filter(q => q.source.type === 'weak_concept').length;
    const gapCount = questions.filter(q => q.source.type === 'knowledge_gap').length;

    const parts: string[] = [];
    if (sm2Count > 0) parts.push(`${sm2Count} scheduled reviews`);
    if (weakCount > 0) parts.push(`${weakCount} weak areas`);
    if (gapCount > 0) parts.push(`${gapCount} knowledge gaps`);

    return parts.length > 0 
      ? `Personalized for you: ${parts.join(', ')}`
      : 'Review and strengthen your knowledge';
  }

  private determineQuizType(questions: DynamicQuizQuestion[]): DynamicQuiz['type'] {
    const types = questions.map(q => q.source.type);
    const counts = {
      sm2: types.filter(t => t === 'sm2_review').length,
      weak: types.filter(t => t === 'weak_concept').length,
      gap: types.filter(t => t === 'knowledge_gap').length,
      flash: types.filter(t => t === 'flashcard').length
    };

    const maxType = Object.entries(counts).reduce((a, b) => b[1] > a[1] ? b : a);
    
    if (maxType[0] === 'sm2') return 'spaced_repetition';
    if (maxType[0] === 'weak') return 'weak_areas';
    if (maxType[0] === 'gap') return 'knowledge_check';
    return 'mixed';
  }
}

// Export singleton
export const dynamicQuizGenerator = new DynamicQuizGeneratorService();
export default dynamicQuizGenerator;

