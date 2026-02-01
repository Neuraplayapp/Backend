/**
 * 🧠 LEARNING MOMENT CAPTURE SERVICE
 * 
 * Captures HOLISTIC learning moments that combine:
 * - WHERE the user is (course, section, chunk)
 * - HOW LONG they've been there (time spent)
 * - HOW they're FEELING (emotional state during learning)
 * - HOW they're PERFORMING (SM2 retention, struggle indicators)
 * - WHAT they're saying (context from chat)
 * 
 * These moments are vectorized for semantic retrieval, enabling the AI to say:
 * "I remember last Tuesday you were feeling overwhelmed with the motivation section.
 *  Your retention on that topic is at 68% - would you like to do a quick review?"
 * 
 * INTEGRATES WITH:
 * - SM2SpacedRepetitionService (retention scores)
 * - EmotionalIntelligenceService (emotional state)
 * - LearnerPedagogicalProfile (competency mastery)
 * - LearningModuleTracker (course position)
 * - MemoryDatabaseBridge (vectorization)
 */

import { emotionalIntelligenceService, type EmotionalState } from './EmotionalIntelligenceService';
import { sm2SpacedRepetitionService, type Feedback } from './SM2SpacedRepetitionService';
import { learnerPedagogicalProfileService } from './LearnerPedagogicalProfile';
import { MEMORY_CATEGORIES } from './MemoryCategoryRegistry';

export interface LearningMoment {
  // IDENTITY
  momentId: string;
  userId: string;
  timestamp: Date;
  
  // LEARNING POSITION
  courseId: string;
  courseTitle: string;
  sectionIndex: number;
  sectionTitle: string;
  chunkIndex?: number;
  chunkTitle?: string;
  
  // TIME & ENGAGEMENT
  timeSpentSeconds: number;
  timeSpentOnSection: number;
  sessionStartTime: Date;
  
  // EMOTIONAL STATE
  emotionalState?: EmotionalState;
  emotionalContext?: string; // What they said that triggered the emotion
  struggleIndicators: StruggleIndicator[];
  
  // PERFORMANCE STATE
  retentionFeedback?: Feedback;
  competencyMastery?: number; // 0-100 for this section's competency
  knowledgeGaps?: string[];
  
  // CONTEXT
  userMessage?: string;
  aiResponse?: string;
  interactionType: 'progress' | 'question' | 'struggle' | 'success' | 'emotional' | 'quiz';
}

export interface StruggleIndicator {
  type: 'repeated_questions' | 'long_pause' | 'confusion_detected' | 'negative_emotion' | 'low_retention' | 'explicit_struggle';
  severity: number; // 0-1
  context?: string;
}

export interface LearningMomentSummary {
  courseId: string;
  courseTitle: string;
  totalTimeSpent: number;
  emotionalJourney: Array<{ emotion: string; timestamp: Date; context?: string }>;
  struggleAreas: Array<{ section: string; struggleCount: number; resolved: boolean }>;
  retentionScores: Array<{ section: string; score: number }>;
  overallMood: 'positive' | 'negative' | 'neutral' | 'mixed';
  needsEncouragement: boolean;
  encouragementReason?: string;
}

class LearningMomentCaptureService {
  private static instance: LearningMomentCaptureService;
  private currentMoments: Map<string, LearningMoment> = new Map(); // sessionId -> current moment
  private momentHistory: Map<string, LearningMoment[]> = new Map(); // userId -> moments

  static getInstance(): LearningMomentCaptureService {
    if (!LearningMomentCaptureService.instance) {
      LearningMomentCaptureService.instance = new LearningMomentCaptureService();
    }
    return LearningMomentCaptureService.instance;
  }

  /**
   * 🎯 CAPTURE A LEARNING MOMENT
   * Called whenever user interacts during a learning session
   */
  async captureMoment(params: {
    userId: string;
    sessionId: string;
    courseId: string;
    courseTitle: string;
    sectionIndex: number;
    sectionTitle: string;
    chunkIndex?: number;
    chunkTitle?: string;
    userMessage?: string;
    aiResponse?: string;
    interactionType: LearningMoment['interactionType'];
    // 🎯 NEW: Accept pre-analyzed context from UnifiedLearningContextService
    emotionalState?: EmotionalState;
    comprehensionLevel?: number;
    knowledgeGaps?: string[];
  }): Promise<LearningMoment> {
    const now = new Date();
    const momentId = `moment_${params.courseId}_${now.getTime()}`;
    
    // Use provided emotional state or extract from message
    let emotionalState: EmotionalState | undefined = params.emotionalState;
    if (!emotionalState && params.userMessage) {
      const extracted = await emotionalIntelligenceService.extractEmotionFromMessage(params.userMessage);
      if (extracted) {
        emotionalState = extracted;
      }
    }
    
    // Detect struggle indicators
    const struggleIndicators = await this.detectStruggleIndicators(
      params.userId,
      params.userMessage,
      emotionalState
    );
    
    // Get current competency mastery - use provided values or fetch from profile
    let competencyMastery: number | undefined = params.comprehensionLevel;
    let knowledgeGaps: string[] | undefined = params.knowledgeGaps;
    
    // Only fetch from profile if not provided
    if (competencyMastery === undefined || !knowledgeGaps) {
      try {
        const profile = await learnerPedagogicalProfileService.getProfile(params.userId);
        const courseProgress = profile.coursesInProgress.find(c => c.moduleId === params.courseId);
        if (competencyMastery === undefined) {
          competencyMastery = courseProgress?.competencyMastery;
        }
        if (!knowledgeGaps) {
          knowledgeGaps = profile.knowledgeGaps;
        }
      } catch (e) {
        console.warn('Could not fetch pedagogical profile:', e);
      }
    }
    
    // Calculate time spent
    const existingMoment = this.currentMoments.get(params.sessionId);
    const sessionStartTime = existingMoment?.sessionStartTime || now;
    const timeSpentSeconds = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000);
    
    const moment: LearningMoment = {
      momentId,
      userId: params.userId,
      timestamp: now,
      courseId: params.courseId,
      courseTitle: params.courseTitle,
      sectionIndex: params.sectionIndex,
      sectionTitle: params.sectionTitle,
      chunkIndex: params.chunkIndex,
      chunkTitle: params.chunkTitle,
      timeSpentSeconds,
      timeSpentOnSection: existingMoment?.sectionIndex === params.sectionIndex 
        ? (existingMoment.timeSpentOnSection + (now.getTime() - existingMoment.timestamp.getTime()) / 1000)
        : 0,
      sessionStartTime,
      emotionalState,
      emotionalContext: emotionalState ? params.userMessage : undefined,
      struggleIndicators,
      competencyMastery,
      knowledgeGaps,
      userMessage: params.userMessage,
      aiResponse: params.aiResponse,
      interactionType: params.interactionType
    };
    
    // Store current moment
    this.currentMoments.set(params.sessionId, moment);
    
    // Add to history
    const userHistory = this.momentHistory.get(params.userId) || [];
    userHistory.push(moment);
    this.momentHistory.set(params.userId, userHistory);
    
    // 🎯 VECTORIZE significant moments
    if (this.isSignificantMoment(moment)) {
      await this.vectorizeMoment(moment);
    }
    
    return moment;
  }

  /**
   * 📊 RECORD SM2 RETENTION FEEDBACK
   * Called when user completes a quiz or review
   */
  async recordRetentionFeedback(params: {
    userId: string;
    courseId: string;
    sectionIndex: number;
    feedback: Feedback;
    conceptTested: string;
  }): Promise<void> {
    const { userId, courseId, sectionIndex, feedback, conceptTested } = params;
    
    // Convert feedback to quality and determine if struggling
    const quality = sm2SpacedRepetitionService.feedbackToQuality(feedback);
    const isStruggling = quality < 3;
    
    // Create a learning moment for this retention event
    const moment: LearningMoment = {
      momentId: `retention_${courseId}_${Date.now()}`,
      userId,
      timestamp: new Date(),
      courseId,
      courseTitle: '', // Will be filled from context
      sectionIndex,
      sectionTitle: conceptTested,
      timeSpentSeconds: 0,
      timeSpentOnSection: 0,
      sessionStartTime: new Date(),
      struggleIndicators: isStruggling ? [{
        type: 'low_retention',
        severity: quality < 2 ? 0.9 : 0.5,
        context: `User ${feedback} recalling: ${conceptTested}`
      }] : [],
      retentionFeedback: feedback,
      interactionType: 'quiz'
    };
    
    // Always vectorize retention moments - they're important for AI recall
    await this.vectorizeMoment(moment, true);
    
    console.log(`📊 Recorded retention feedback: ${feedback} for ${conceptTested}`);
  }

  /**
   * 🔍 DETECT STRUGGLE INDICATORS
   */
  private async detectStruggleIndicators(
    userId: string,
    message?: string,
    emotionalState?: EmotionalState
  ): Promise<StruggleIndicator[]> {
    const indicators: StruggleIndicator[] = [];
    
    // Check for negative emotion
    if (emotionalState && emotionalState.category === 'negative') {
      indicators.push({
        type: 'negative_emotion',
        severity: emotionalState.intensity,
        context: `User feeling ${emotionalState.emotion}: "${message?.substring(0, 100)}"`
      });
    }
    
    // Check for explicit struggle phrases
    if (message) {
      const strugglePhrases = [
        'i dont understand', "i don't understand", 'confused', 'lost', 'stuck',
        'struggling', 'hard', 'difficult', 'frustrated', 'help', "can't get it",
        'not making sense', 'too fast', 'overwhelmed', 'give up', 'giving up'
      ];
      
      const lowerMessage = message.toLowerCase();
      for (const phrase of strugglePhrases) {
        if (lowerMessage.includes(phrase)) {
          indicators.push({
            type: 'explicit_struggle',
            severity: 0.8,
            context: `User said: "${message.substring(0, 100)}"`
          });
          break;
        }
      }
    }
    
    // Check for confusion using simple heuristics (avoid deprecated methods)
    if (message) {
      const lowerMsg = message.toLowerCase();
      // Simple confusion detection without calling deprecated service
      const confusionPhrases = ['confused', 'don\'t understand', 'doesn\'t make sense', 'lost', 'what do you mean'];
      for (const phrase of confusionPhrases) {
        if (lowerMsg.includes(phrase)) {
          indicators.push({
            type: 'confusion_detected',
            severity: 0.6,
            context: 'Confusion detected in message'
          });
          break;
        }
      }
    }
    
    return indicators;
  }

  /**
   * 🎯 DETERMINE IF MOMENT IS SIGNIFICANT ENOUGH TO VECTORIZE
   */
  private isSignificantMoment(moment: LearningMoment): boolean {
    // Always vectorize emotional moments
    if (moment.emotionalState && moment.emotionalState.category !== 'neutral') {
      return true;
    }
    
    // Always vectorize struggle moments
    if (moment.struggleIndicators.length > 0) {
      return true;
    }
    
    // Vectorize questions and emotional interactions
    if (moment.interactionType === 'question' || moment.interactionType === 'emotional') {
      return true;
    }
    
    // Vectorize if user spent significant time (>5 min on a section)
    if (moment.timeSpentOnSection > 300) {
      return true;
    }
    
    return false;
  }

  /**
   * 📦 VECTORIZE A LEARNING MOMENT
   * Stores in vector database for semantic retrieval
   */
  private async vectorizeMoment(moment: LearningMoment, isRetention = false): Promise<void> {
    try {
      const { memoryDatabaseBridge } = await import('./MemoryDatabaseBridge');
      
      // Build a rich, narrative description of this learning moment
      const emotionalDescription = moment.emotionalState
        ? `User was feeling ${moment.emotionalState.emotion} (intensity: ${moment.emotionalState.intensity}). `
        : '';
      
      const struggleDescription = moment.struggleIndicators.length > 0
        ? `Struggle detected: ${moment.struggleIndicators.map(s => s.context || s.type).join('; ')}. `
        : '';
      
      const retentionDescription = moment.retentionFeedback
        ? `Retention feedback: ${moment.retentionFeedback}. `
        : '';
      
      const timeDescription = moment.timeSpentOnSection > 0
        ? `Time on section: ${Math.round(moment.timeSpentOnSection / 60)} minutes. `
        : '';
      
      const content = `
LEARNING MOMENT: ${moment.timestamp.toISOString()}
Course: ${moment.courseTitle}
Section: ${moment.sectionTitle}${moment.chunkTitle ? ` - ${moment.chunkTitle}` : ''}
${timeDescription}
${emotionalDescription}
${struggleDescription}
${retentionDescription}
${moment.userMessage ? `User said: "${moment.userMessage}"` : ''}
${moment.competencyMastery !== undefined ? `Competency mastery: ${moment.competencyMastery}%` : ''}
${moment.knowledgeGaps?.length ? `Knowledge gaps: ${moment.knowledgeGaps.join(', ')}` : ''}
      `.trim();
      
      const key = isRetention
        ? `learning_retention_${moment.courseId}_${moment.sectionIndex}_${moment.timestamp.getTime()}`
        : `learning_moment_${moment.courseId}_${moment.sectionIndex}_${moment.timestamp.getTime()}`;
      
      await memoryDatabaseBridge.storeMemory({
        userId: moment.userId,
        key,
        value: content,
        metadata: {
          type: 'learning_moment',
          category: MEMORY_CATEGORIES.LEARNING_MOMENT, // 🔒 Uses registry
          courseId: moment.courseId,
          courseTitle: moment.courseTitle,
          sectionIndex: moment.sectionIndex,
          sectionTitle: moment.sectionTitle,
          chunkIndex: moment.chunkIndex,
          emotionalState: moment.emotionalState?.emotion,
          emotionalValence: moment.emotionalState?.valence,
          hasStruggle: moment.struggleIndicators.length > 0,
          struggleTypes: moment.struggleIndicators.map(s => s.type),
          retentionFeedback: moment.retentionFeedback,
          competencyMastery: moment.competencyMastery,
          timeSpentSeconds: moment.timeSpentSeconds,
          interactionType: moment.interactionType,
          isPersonalMemory: true, // This IS personal
          isPersonalRecallable: true,
          supersessionBehavior: 'accumulate', // Keep all moments, don't replace
          timestamp: moment.timestamp.toISOString()
        }
      });
      
      console.log(`💾 Vectorized learning moment: ${moment.sectionTitle} (${moment.emotionalState?.emotion || 'neutral'})`);
      
    } catch (error) {
      console.error('❌ Failed to vectorize learning moment:', error);
    }
  }

  /**
   * 📚 GET LEARNING MOMENT SUMMARY FOR A COURSE
   * Used by AI to understand user's journey through a course
   */
  async getCourseMomentSummary(userId: string, courseId: string): Promise<LearningMomentSummary | null> {
    try {
      const { memoryDatabaseBridge } = await import('./MemoryDatabaseBridge');
      
      // Search for all learning moments for this course
      const searchResult = await memoryDatabaseBridge.searchMemories({
        userId,
        query: `learning moment course ${courseId}`,
        limit: 50,
        categories: ['education']
      });
      
      if (!searchResult.success || !searchResult.memories?.length) {
        return null;
      }
      
      const courseMoments = searchResult.memories.filter((m: any) =>
        m.metadata?.courseId === courseId && m.metadata?.type === 'learning_moment'
      );
      
      if (courseMoments.length === 0) {
        return null;
      }
      
      // Aggregate emotional journey
      const emotionalJourney: LearningMomentSummary['emotionalJourney'] = [];
      const struggleAreas = new Map<string, { count: number; lastEmotion?: string }>();
      const retentionScores: LearningMomentSummary['retentionScores'] = [];
      
      let positiveCount = 0;
      let negativeCount = 0;
      let totalTime = 0;
      
      for (const moment of courseMoments) {
        const meta = moment.metadata || {};
        
        // Track emotional journey
        if (meta.emotionalState) {
          emotionalJourney.push({
            emotion: meta.emotionalState,
            timestamp: new Date(meta.timestamp),
            context: moment.memory_value?.substring(0, 100)
          });
          
          if (meta.emotionalValence > 0) positiveCount++;
          else if (meta.emotionalValence < 0) negativeCount++;
        }
        
        // Track struggle areas
        if (meta.hasStruggle && meta.sectionTitle) {
          const existing = struggleAreas.get(meta.sectionTitle) || { count: 0 };
          struggleAreas.set(meta.sectionTitle, {
            count: existing.count + 1,
            lastEmotion: meta.emotionalState
          });
        }
        
        // Track retention
        if (meta.retentionFeedback) {
          const feedbackMap: Record<string, number> = { forgot: 0, hard: 50, good: 75, easy: 100 };
          const feedbackKey = String(meta.retentionFeedback);
          const feedbackScore = feedbackMap[feedbackKey] ?? 50;
          retentionScores.push({
            section: meta.sectionTitle || 'Unknown',
            score: feedbackScore
          });
        }
        
        totalTime += meta.timeSpentSeconds || 0;
      }
      
      // Determine overall mood
      let overallMood: LearningMomentSummary['overallMood'];
      if (positiveCount > negativeCount * 2) overallMood = 'positive';
      else if (negativeCount > positiveCount * 2) overallMood = 'negative';
      else if (positiveCount > 0 && negativeCount > 0) overallMood = 'mixed';
      else overallMood = 'neutral';
      
      // Determine if user needs encouragement
      const avgRetention = retentionScores.length > 0
        ? retentionScores.reduce((sum, r) => sum + r.score, 0) / retentionScores.length
        : 100;
      
      const needsEncouragement = overallMood === 'negative' || avgRetention < 60 || struggleAreas.size > 2;
      
      let encouragementReason: string | undefined;
      if (needsEncouragement) {
        if (overallMood === 'negative') {
          encouragementReason = `User has been feeling ${emotionalJourney[emotionalJourney.length - 1]?.emotion || 'down'} during this course`;
        } else if (avgRetention < 60) {
          encouragementReason = `Retention is at ${Math.round(avgRetention)}% - may need review`;
        } else if (struggleAreas.size > 2) {
          encouragementReason = `User has struggled in ${struggleAreas.size} different sections`;
        }
      }
      
      return {
        courseId,
        courseTitle: courseMoments[0]?.metadata?.courseTitle || 'Unknown Course',
        totalTimeSpent: totalTime,
        emotionalJourney,
        struggleAreas: Array.from(struggleAreas.entries()).map(([section, data]) => ({
          section,
          struggleCount: data.count,
          resolved: data.lastEmotion ? !['frustrated', 'confused', 'stuck'].includes(data.lastEmotion) : false
        })),
        retentionScores,
        overallMood,
        needsEncouragement,
        encouragementReason
      };
      
    } catch (error) {
      console.error('❌ Failed to get course moment summary:', error);
      return null;
    }
  }

  /**
   * 🤖 GET AI-READY CONTEXT
   * Formats learning moments into context the AI can use for empathetic responses
   */
  async getAIContext(userId: string, courseId?: string): Promise<string> {
    const lines: string[] = ['📚 LEARNING JOURNEY CONTEXT:'];
    
    if (courseId) {
      const summary = await this.getCourseMomentSummary(userId, courseId);
      if (summary) {
        lines.push(`\nCourse: ${summary.courseTitle}`);
        lines.push(`Total time: ${Math.round(summary.totalTimeSpent / 60)} minutes`);
        lines.push(`Overall mood: ${summary.overallMood}`);
        
        if (summary.emotionalJourney.length > 0) {
          const recent = summary.emotionalJourney.slice(-3);
          lines.push(`Recent emotions: ${recent.map(e => e.emotion).join(' → ')}`);
        }
        
        if (summary.struggleAreas.length > 0) {
          lines.push(`Struggled with: ${summary.struggleAreas.map(s => `${s.section} (${s.struggleCount}x)`).join(', ')}`);
        }
        
        if (summary.retentionScores.length > 0) {
          const avgRetention = Math.round(
            summary.retentionScores.reduce((sum, r) => sum + r.score, 0) / summary.retentionScores.length
          );
          lines.push(`Average retention: ${avgRetention}%`);
        }
        
        if (summary.needsEncouragement) {
          lines.push(`⚠️ ${summary.encouragementReason}`);
          lines.push(`🤗 RECOMMENDATION: Provide encouragement and support`);
        }
      }
    } else {
      // Get general learning context across all courses
      try {
        const profile = await learnerPedagogicalProfileService.getProfile(userId);
        
        lines.push(`Overall mastery: ${profile.overallMastery}%`);
        lines.push(`Items due for review: ${profile.itemsDueToday}`);
        lines.push(`Review streak: ${profile.reviewStreak} days`);
        
        if (profile.knowledgeGaps.length > 0) {
          lines.push(`Knowledge gaps: ${profile.knowledgeGaps.join(', ')}`);
        }
        
        if (profile.strengthAreas.length > 0) {
          lines.push(`Strengths: ${profile.strengthAreas.join(', ')}`);
        }
        
        if (profile.coursesInProgress.length > 0) {
          lines.push(`\nCourses in progress:`);
          for (const course of profile.coursesInProgress) {
            lines.push(`- ${course.title}: ${course.overallProgress}% complete, ${course.competencyMastery}% mastery`);
          }
        }
      } catch (e) {
        console.warn('Could not fetch pedagogical profile for AI context:', e);
      }
    }
    
    return lines.join('\n');
  }
}

// Export singleton
export const learningMomentCapture = LearningMomentCaptureService.getInstance();

