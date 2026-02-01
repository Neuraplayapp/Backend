/**
 * 🎴 FLASHCARD GENERATOR SERVICE
 * 
 * Generates flashcards from multiple sources:
 * - Quiz questions where user performed poorly
 * - Knowledge gaps identified by LearningModuleTracker
 * - SM2 items due for review
 * - Competency areas marked for "review"
 * 
 * INTEGRATES WITH:
 * - SM2SpacedRepetitionService (scheduling & feedback)
 * - CompetencyMasteryTracker (mastery updates)
 * - LearningModuleTracker (quiz results)
 * 
 * BIDIRECTIONAL:
 * Quiz failures → Generate flashcards
 * Flashcard reviews → Update mastery tracking
 */

import { sm2SpacedRepetitionService, type SM2Item, type Feedback } from './SM2SpacedRepetitionService';
import { competencyMasteryTracker, type CompetencyAssessment } from './CompetencyMasteryTracker';
import { storageManager } from '../utils/storageManager';

export interface Flashcard {
  id: string;
  userId: string;
  
  // Content
  front: string;           // Question or concept
  back: string;            // Answer or explanation
  hint?: string;           // Optional hint
  
  // Source tracking
  source: {
    type: 'quiz_failure' | 'knowledge_gap' | 'competency_review' | 'manual' | 'ai_generated';
    moduleId?: string;
    moduleName?: string;
    sectionId?: string;
    questionId?: string;
    competencyId?: string;
  };
  
  // Tags for filtering/grouping
  tags: string[];
  category?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  
  // SM2 scheduling data
  sm2: SM2Item;
  
  // Stats
  timesReviewed: number;
  timesCorrect: number;
  averageResponseTime: number;
  lastReviewedAt?: Date;
  createdAt: Date;
  
  // State
  isActive: boolean;
  isMastered: boolean;  // When ease factor is high and many correct reviews
}

export interface FlashcardDeck {
  id: string;
  name: string;
  description?: string;
  userId: string;
  cardIds: string[];
  createdAt: Date;
  updatedAt: Date;
  color?: string;
  icon?: string;
}

export interface FlashcardStudySession {
  sessionId: string;
  userId: string;
  deckId?: string;
  startedAt: Date;
  endedAt?: Date;
  cardsReviewed: number;
  cardsCorrect: number;
  averageResponseTime: number;
  cardResults: Array<{
    cardId: string;
    feedback: Feedback;
    responseTime: number;
    wasCorrect: boolean;
  }>;
}

export interface FlashcardStats {
  totalCards: number;
  dueToday: number;
  dueThisWeek: number;
  mastered: number;
  struggling: number;
  averageRetention: number;
  streakDays: number;
  totalReviews: number;
}

const STORAGE_KEY = 'neuraplay_flashcards';
const DECKS_KEY = 'neuraplay_flashcard_decks';
const SESSIONS_KEY = 'neuraplay_flashcard_sessions';

class FlashcardGeneratorService {
  private cards: Map<string, Flashcard> = new Map();
  private decks: Map<string, FlashcardDeck> = new Map();
  private initialized = false;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const cardsData = storageManager.get<Record<string, Flashcard>>(STORAGE_KEY);
      if (cardsData) {
        Object.entries(cardsData).forEach(([id, card]) => {
          // Restore Date objects
          card.createdAt = new Date(card.createdAt);
          card.sm2.nextReviewDate = new Date(card.sm2.nextReviewDate);
          if (card.lastReviewedAt) card.lastReviewedAt = new Date(card.lastReviewedAt);
          this.cards.set(id, card);
        });
      }

      const decksData = storageManager.get<Record<string, FlashcardDeck>>(DECKS_KEY);
      if (decksData) {
        Object.entries(decksData).forEach(([id, deck]) => {
          deck.createdAt = new Date(deck.createdAt);
          deck.updatedAt = new Date(deck.updatedAt);
          this.decks.set(id, deck);
        });
      }

      this.initialized = true;
      console.log(`🎴 FlashcardGenerator loaded: ${this.cards.size} cards, ${this.decks.size} decks`);
    } catch (e) {
      console.warn('⚠️ Failed to load flashcards from storage:', e);
    }
  }

  private saveToStorage(): void {
    try {
      const cardsObj: Record<string, Flashcard> = {};
      this.cards.forEach((card, id) => {
        cardsObj[id] = card;
      });
      storageManager.set(STORAGE_KEY, cardsObj);

      const decksObj: Record<string, FlashcardDeck> = {};
      this.decks.forEach((deck, id) => {
        decksObj[id] = deck;
      });
      storageManager.set(DECKS_KEY, decksObj);
    } catch (e) {
      console.warn('⚠️ Failed to save flashcards:', e);
    }
  }

  /**
   * 🎯 GENERATE FLASHCARDS FROM QUIZ FAILURES
   * Called after a quiz where user got questions wrong
   */
  generateFromQuizFailures(
    userId: string,
    moduleId: string,
    moduleName: string,
    wrongQuestions: Array<{
      question: string;
      correctAnswer: string;
      userAnswer: string;
      explanation?: string;
      hint?: string;
      concept?: string;
    }>
  ): Flashcard[] {
    const generatedCards: Flashcard[] = [];

    for (const q of wrongQuestions) {
      // Check if we already have a card for this question
      const existingCard = Array.from(this.cards.values()).find(
        c => c.source.questionId === `${moduleId}_${q.question.substring(0, 50)}`
      );

      if (existingCard) {
        // Card exists - it will naturally come up in SM2 schedule
        console.log('🎴 Card already exists for question, skipping:', q.question.substring(0, 40));
        continue;
      }

      const card: Flashcard = {
        id: `fc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        userId,
        front: q.question,
        back: q.correctAnswer + (q.explanation ? `\n\n💡 ${q.explanation}` : ''),
        hint: q.hint,
        source: {
          type: 'quiz_failure',
          moduleId,
          moduleName,
          questionId: `${moduleId}_${q.question.substring(0, 50)}`
        },
        tags: q.concept ? [q.concept] : [moduleName],
        category: moduleName,
        difficulty: 'medium',
        sm2: sm2SpacedRepetitionService.createItem(),
        timesReviewed: 0,
        timesCorrect: 0,
        averageResponseTime: 0,
        createdAt: new Date(),
        isActive: true,
        isMastered: false
      };

      this.cards.set(card.id, card);
      generatedCards.push(card);
      console.log('🎴 Generated flashcard from quiz failure:', q.question.substring(0, 40));
    }

    if (generatedCards.length > 0) {
      this.saveToStorage();
      console.log(`✅ Generated ${generatedCards.length} flashcards from quiz failures`);
    }

    return generatedCards;
  }

  /**
   * 🧠 GENERATE FLASHCARDS FROM KNOWLEDGE GAPS
   * Called when system detects struggling areas
   */
  async generateFromKnowledgeGaps(
    userId: string,
    gaps: Array<{
      concept: string;
      category?: string;
      suggestedQuestions?: Array<{ front: string; back: string }>;
    }>
  ): Promise<Flashcard[]> {
    const generatedCards: Flashcard[] = [];

    for (const gap of gaps) {
      // Generate flashcard content using LLM if no suggestions provided
      let questions = gap.suggestedQuestions;
      
      if (!questions || questions.length === 0) {
        // Use LLM to generate flashcard content
        questions = await this.generateFlashcardContentWithLLM(gap.concept, gap.category);
      }

      for (const q of questions) {
        const card: Flashcard = {
          id: `fc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          userId,
          front: q.front,
          back: q.back,
          source: {
            type: 'knowledge_gap',
            competencyId: gap.concept
          },
          tags: [gap.concept, gap.category || 'general'].filter(Boolean) as string[],
          category: gap.category || 'Knowledge Gaps',
          difficulty: 'medium',
          sm2: sm2SpacedRepetitionService.createItem(),
          timesReviewed: 0,
          timesCorrect: 0,
          averageResponseTime: 0,
          createdAt: new Date(),
          isActive: true,
          isMastered: false
        };

        this.cards.set(card.id, card);
        generatedCards.push(card);
      }
    }

    if (generatedCards.length > 0) {
      this.saveToStorage();
    }

    return generatedCards;
  }

  /**
   * 🤖 Use LLM to generate flashcard content for a concept
   */
  private async generateFlashcardContentWithLLM(
    concept: string,
    category?: string
  ): Promise<Array<{ front: string; back: string }>> {
    try {
      const { toolRegistry } = await import('./ToolRegistry');
      
      const prompt = `Generate 3 flashcard question-answer pairs for learning about: "${concept}"${category ? ` in the context of ${category}` : ''}.

Return JSON array:
[
  {"front": "Question about the concept", "back": "Clear, concise answer"},
  {"front": "Another question", "back": "Another answer"},
  {"front": "Third question", "back": "Third answer"}
]

Make questions test understanding, not just memorization. Answers should be 1-3 sentences.

JSON ONLY:`;

      const result = await toolRegistry.execute('llm-completion', {
        prompt,
        model: 'accounts/fireworks/models/gpt-oss-20b',
        temperature: 0.4,
        maxTokens: 500
      }, { sessionId: '', userId: '', startTime: Date.now() });

      if (result.success && result.data?.completion) {
        const match = result.data.completion.match(/\[[\s\S]*\]/);
        if (match) {
          return JSON.parse(match[0]);
        }
      }
    } catch (e) {
      console.warn('⚠️ LLM flashcard generation failed:', e);
    }

    // Fallback: simple default
    return [{
      front: `What is ${concept}?`,
      back: `${concept} is a key concept you need to review. Check your course materials for details.`
    }];
  }

  /**
   * 📝 RECORD FLASHCARD REVIEW
   * Updates SM2 scheduling and feeds into competency tracking
   */
  recordReview(
    cardId: string,
    feedback: Feedback,
    responseTimeMs: number
  ): { card: Flashcard; shouldShowAgain: boolean } | null {
    const card = this.cards.get(cardId);
    if (!card) {
      console.warn('⚠️ Card not found:', cardId);
      return null;
    }

    // Update SM2
    const quality = sm2SpacedRepetitionService.feedbackToQuality(feedback);
    const reviewResult = sm2SpacedRepetitionService.review(card.sm2, quality);
    
    card.sm2 = reviewResult.item;
    card.timesReviewed++;
    card.lastReviewedAt = new Date();
    
    if (feedback === 'good' || feedback === 'easy') {
      card.timesCorrect++;
    }
    
    // Update average response time
    const totalTime = card.averageResponseTime * (card.timesReviewed - 1) + responseTimeMs;
    card.averageResponseTime = totalTime / card.timesReviewed;

    // Check if mastered (high ease factor + many correct reviews)
    card.isMastered = card.sm2.easeFactor >= 2.3 && card.timesCorrect >= 5 && card.sm2.repetitions >= 3;

    this.cards.set(cardId, card);
    this.saveToStorage();

    // 🎯 Feed into Competency Mastery Tracker
    this.updateCompetencyFromFlashcard(card, feedback);

    console.log(`🎴 Recorded review: ${feedback}, next review: ${card.sm2.interval} days`);

    return {
      card,
      shouldShowAgain: reviewResult.shouldReviewAgain
    };
  }

  /**
   * 🎯 Update competency mastery based on flashcard review
   * This is the key integration - flashcard reviews affect overall mastery
   */
  private updateCompetencyFromFlashcard(card: Flashcard, feedback: Feedback): void {
    if (!card.source.competencyId && !card.category) return;

    const competencyId = card.source.competencyId || card.category || 'general';
    
    // Map feedback to score
    const score = {
      'forgot': 20,
      'hard': 50,
      'good': 75,
      'easy': 95
    }[feedback];

    // Create assessment for competency tracker
    const assessment: CompetencyAssessment = {
      date: new Date(),
      score,
      source: `flashcard:${card.id}`,
      confidence: 0.7  // Flashcards are moderately reliable indicators
    };

    // Note: CompetencyMasteryTracker would store this
    // For now, we log it and can integrate with database
    console.log(`📊 Competency update for ${competencyId}:`, assessment);
  }

  /**
   * 📅 GET CARDS DUE FOR REVIEW
   */
  getDueCards(userId: string, limit: number = 20): Flashcard[] {
    const now = new Date();
    const userCards = Array.from(this.cards.values())
      .filter(c => c.userId === userId && c.isActive && !c.isMastered);

    const dueCards = userCards.filter(c => c.sm2.nextReviewDate <= now);

    // Sort by priority: most overdue first, then by difficulty
    return sm2SpacedRepetitionService.sortByPriority(
      dueCards.map(c => ({
        ...c,
        conceptId: c.id,
        nextReviewDate: c.sm2.nextReviewDate,
        easeFactor: c.sm2.easeFactor,
        repetitions: c.sm2.repetitions,
        interval: c.sm2.interval
      } as any))
    ).slice(0, limit).map(c => this.cards.get(c.conceptId)!);
  }

  /**
   * 📊 GET FLASHCARD STATS
   */
  getStats(userId: string): FlashcardStats {
    const userCards = Array.from(this.cards.values())
      .filter(c => c.userId === userId);
    
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const dueToday = userCards.filter(c => c.isActive && c.sm2.nextReviewDate <= now).length;
    const dueThisWeek = userCards.filter(c => c.isActive && c.sm2.nextReviewDate <= weekFromNow).length;
    const mastered = userCards.filter(c => c.isMastered).length;
    const struggling = userCards.filter(c => c.sm2.easeFactor < 2.0 && c.timesReviewed >= 2).length;

    // Average retention based on ease factors
    const activeCards = userCards.filter(c => c.isActive);
    const avgEase = activeCards.length > 0
      ? activeCards.reduce((sum, c) => sum + c.sm2.easeFactor, 0) / activeCards.length
      : 2.5;
    const averageRetention = Math.round(((avgEase - 1.3) / 1.7) * 100);

    const totalReviews = userCards.reduce((sum, c) => sum + c.timesReviewed, 0);

    // Calculate streak (simplified - would need session tracking for accurate)
    const streakDays = this.calculateStreak(userId);

    return {
      totalCards: userCards.filter(c => c.isActive).length,
      dueToday,
      dueThisWeek,
      mastered,
      struggling,
      averageRetention: Math.max(0, Math.min(100, averageRetention)),
      streakDays,
      totalReviews
    };
  }

  private calculateStreak(userId: string): number {
    try {
      const sessionsData = storageManager.get<FlashcardStudySession[]>(SESSIONS_KEY) || [];
      const userSessions = sessionsData.filter(s => s.userId === userId);
      
      if (userSessions.length === 0) return 0;

      // Sort by date descending
      userSessions.sort((a, b) => 
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );

      let streak = 0;
      let currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      for (const session of userSessions) {
        const sessionDate = new Date(session.startedAt);
        sessionDate.setHours(0, 0, 0, 0);
        
        const dayDiff = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (24 * 60 * 60 * 1000));
        
        if (dayDiff === 0 || dayDiff === 1) {
          streak++;
          currentDate = sessionDate;
        } else {
          break;
        }
      }

      return streak;
    } catch {
      return 0;
    }
  }

  /**
   * 📚 GET ALL USER CARDS
   */
  getUserCards(userId: string): Flashcard[] {
    return Array.from(this.cards.values())
      .filter(c => c.userId === userId);
  }

  /**
   * 📚 GET CARDS BY CATEGORY/TAG
   */
  getCardsByCategory(userId: string, category: string): Flashcard[] {
    return Array.from(this.cards.values())
      .filter(c => c.userId === userId && (c.category === category || c.tags.includes(category)));
  }

  /**
   * 🗑️ DELETE CARD
   */
  deleteCard(cardId: string): boolean {
    const deleted = this.cards.delete(cardId);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  /**
   * ✏️ UPDATE CARD
   */
  updateCard(cardId: string, updates: Partial<Pick<Flashcard, 'front' | 'back' | 'hint' | 'tags' | 'difficulty'>>): Flashcard | null {
    const card = this.cards.get(cardId);
    if (!card) return null;

    Object.assign(card, updates);
    this.cards.set(cardId, card);
    this.saveToStorage();
    return card;
  }

  /**
   * 📁 CREATE DECK
   */
  createDeck(userId: string, name: string, description?: string, cardIds: string[] = []): FlashcardDeck {
    const deck: FlashcardDeck = {
      id: `deck_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name,
      description,
      userId,
      cardIds,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.decks.set(deck.id, deck);
    this.saveToStorage();
    return deck;
  }

  /**
   * 📁 GET USER DECKS
   */
  getUserDecks(userId: string): FlashcardDeck[] {
    return Array.from(this.decks.values())
      .filter(d => d.userId === userId);
  }

  /**
   * 🎮 START STUDY SESSION
   */
  startStudySession(userId: string, deckId?: string): FlashcardStudySession {
    const session: FlashcardStudySession = {
      sessionId: `study_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId,
      deckId,
      startedAt: new Date(),
      cardsReviewed: 0,
      cardsCorrect: 0,
      averageResponseTime: 0,
      cardResults: []
    };

    return session;
  }

  /**
   * 💾 END STUDY SESSION
   */
  endStudySession(session: FlashcardStudySession): void {
    session.endedAt = new Date();
    
    // Calculate stats
    if (session.cardResults.length > 0) {
      session.cardsReviewed = session.cardResults.length;
      session.cardsCorrect = session.cardResults.filter(r => r.wasCorrect).length;
      session.averageResponseTime = 
        session.cardResults.reduce((sum, r) => sum + r.responseTime, 0) / session.cardResults.length;
    }

    // Save session
    try {
      const sessions = storageManager.get<FlashcardStudySession[]>(SESSIONS_KEY) || [];
      sessions.push(session);
      // Keep last 100 sessions
      if (sessions.length > 100) {
        sessions.splice(0, sessions.length - 100);
      }
      storageManager.set(SESSIONS_KEY, sessions);
    } catch (e) {
      console.warn('⚠️ Failed to save study session:', e);
    }

    console.log(`✅ Study session completed: ${session.cardsReviewed} cards, ${session.cardsCorrect} correct`);
  }

  /**
   * 🎴 CREATE MANUAL CARD
   */
  createCard(
    userId: string,
    front: string,
    back: string,
    options: {
      hint?: string;
      tags?: string[];
      category?: string;
      difficulty?: 'easy' | 'medium' | 'hard';
    } = {}
  ): Flashcard {
    const card: Flashcard = {
      id: `fc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId,
      front,
      back,
      hint: options.hint,
      source: { type: 'manual' },
      tags: options.tags || [],
      category: options.category,
      difficulty: options.difficulty || 'medium',
      sm2: sm2SpacedRepetitionService.createItem(),
      timesReviewed: 0,
      timesCorrect: 0,
      averageResponseTime: 0,
      createdAt: new Date(),
      isActive: true,
      isMastered: false
    };

    this.cards.set(card.id, card);
    this.saveToStorage();
    return card;
  }
}

// Export singleton
export const flashcardGeneratorService = new FlashcardGeneratorService();
export default flashcardGeneratorService;

