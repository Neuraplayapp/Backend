// Learning Module Progress Tracking Service
import { dataCollectionService } from './DataCollectionService';
import type {
  LearningModuleProgress,
  LearningModuleSession,
  ProgressUpdatePayload,
  CognitiveMarkers,
  UserResponse,
  Question,
  GeneratedCourse
} from '../types/LearningModule.types';

export class LearningModuleTracker {
  private activeSessions: Map<string, LearningModuleSession> = new Map();
  private userId: string | null = null;

  setUserId(userId: string) {
    this.userId = userId;
    dataCollectionService.setUserId(userId);
  }

  getUserId(): string | null {
    return this.userId;
  }

  /**
   * Get all active sessions as an object (for UnifiedLearningContextService)
   */
  getActiveSessions(): Record<string, LearningModuleSession> {
    const sessions: Record<string, LearningModuleSession> = {};
    this.activeSessions.forEach((session, id) => {
      sessions[id] = session;
    });
    return sessions;
  }

  /**
   * Start a new learning module session
   */
  startSession(moduleId: string): string {
    const sessionId = this.generateSessionId();
    
    const session: LearningModuleSession = {
      moduleId,
      sessionId,
      startTime: new Date(),
      sessionDuration: 0,
      questionsAsked: [],
      userResponses: [],
      comprehensionLevel: 0,
      contentGenerated: {
        moduleId,
        sections: [],
        totalEstimatedMinutes: 0,
        targetedConcepts: [],
        adaptedForLevel: 'beginner',
        generatedAt: new Date()
      },
      cognitiveMarkers: {
        conceptUnderstanding: {},
        knowledgeGaps: [],
        strengthAreas: [],
        learningPatterns: {
          respondsWellTo: [],
          strugglessWith: [],
          preferredPace: 'moderate'
        }
      },
      completed: false
    };

    this.activeSessions.set(sessionId, session);
    console.log('✅ Learning session started:', { moduleId, sessionId });
    
    return sessionId;
  }

  /**
   * Record a question asked during the session
   */
  recordQuestion(sessionId: string, question: Question) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      console.warn('Session not found:', sessionId);
      return;
    }

    session.questionsAsked.push(question);
  }

  /**
   * Record user response to a question
   */
  recordResponse(sessionId: string, response: UserResponse) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      console.warn('Session not found:', sessionId);
      return;
    }

    session.userResponses.push(response);
    
    // Update cognitive markers
    this.updateCognitiveMarkers(session, response);
    
    // Calculate comprehension level
    session.comprehensionLevel = this.calculateComprehension(session);
  }

  /**
   * Record generated course content
   */
  recordGeneratedContent(sessionId: string, course: GeneratedCourse) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      console.warn('Session not found:', sessionId);
      return;
    }

    session.contentGenerated = course;
  }

  /**
   * End a learning session and save to database
   */
  async endSession(sessionId: string): Promise<LearningModuleSession | null> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      console.warn('Session not found:', sessionId);
      return null;
    }

    session.endTime = new Date();
    session.sessionDuration = Math.floor(
      (session.endTime.getTime() - session.startTime.getTime()) / 1000
    );
    session.completed = true;

    // Save to analytics database
    await this.saveSessionToDatabase(session);

    // Remove from active sessions
    this.activeSessions.delete(sessionId);

    console.log('✅ Learning session ended:', {
      moduleId: session.moduleId,
      duration: session.sessionDuration,
      comprehension: session.comprehensionLevel
    });

    return session;
  }

  /**
   * Get active session data
   */
  getSession(sessionId: string): LearningModuleSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Get current course content for AI context
   * Returns the generated course with all lesson content for AI awareness
   */
  getCurrentCourseContent(sessionId: string): GeneratedCourse | null {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.contentGenerated) {
      return null;
    }
    return session.contentGenerated;
  }

  /**
   * Get specific step content for current viewing
   */
  getStepContent(sessionId: string, stepIndex: number): {
    title: string;
    content: string;
    keyPoints: string[];
    type: string;
  } | null {
    const course = this.getCurrentCourseContent(sessionId);
    if (!course || !course.sections || stepIndex >= course.sections.length) {
      return null;
    }
    const section = course.sections[stepIndex];
    return {
      title: section.title,
      content: section.content,
      keyPoints: section.keyPoints || [],
      type: section.type
    };
  }

  /**
   * Get active session by module ID (for dashboard context)
   */
  getActiveSessionByModule(moduleId: string): LearningModuleSession | null {
    for (const session of this.activeSessions.values()) {
      if (session.moduleId === moduleId && !session.completed) {
        return session;
      }
    }
    return null;
  }

  /**
   * Format course content for AI consumption
   * Creates a comprehensive summary the AI can use to answer questions
   */
  formatCourseForAI(sessionId: string, currentStepIndex?: number): string {
    const course = this.getCurrentCourseContent(sessionId);
    if (!course || !course.sections || course.sections.length === 0) {
      return '';
    }

    let formatted = '\n\n📚 **CURRENT COURSE CONTENT:**\n';
    formatted += `Course: "${course.courseTitle || 'Learning Course'}"\n`;
    formatted += `Description: ${course.courseDescription || 'Personalized learning course'}\n`;
    formatted += `Adapted for level: ${course.adaptedForLevel}\n`;
    formatted += `Total steps: ${course.sections.length}\n`;
    
    if (course.targetedConcepts && course.targetedConcepts.length > 0) {
      formatted += `Key concepts: ${course.targetedConcepts.join(', ')}\n`;
    }

    formatted += '\n**COURSE STEPS:**\n';
    
    course.sections.forEach((section, index) => {
      const isCurrentStep = currentStepIndex !== undefined && index === currentStepIndex;
      const stepMarker = isCurrentStep ? '👉 CURRENT STEP' : `Step ${index + 1}`;
      
      formatted += `\n--- ${stepMarker}: ${section.title} (${section.type}) ---\n`;
      
      // Include full content for current step, summary for others
      if (isCurrentStep) {
        formatted += `FULL CONTENT:\n${section.content}\n`;
        if (section.keyPoints && section.keyPoints.length > 0) {
          formatted += `Key Points:\n${section.keyPoints.map(kp => `• ${kp}`).join('\n')}\n`;
        }
      } else {
        // Include summary for other steps (first 100 chars)
        const summary = section.content.length > 150 
          ? section.content.substring(0, 150) + '...' 
          : section.content;
        formatted += `Summary: ${summary}\n`;
        if (section.keyPoints && section.keyPoints.length > 0) {
          formatted += `Key Points: ${section.keyPoints.slice(0, 2).join(', ')}...\n`;
        }
      }
    });

    formatted += '\n⚠️ IMPORTANT: You have FULL access to the course content above. When the user asks questions about any topic in the course, answer based on this content. Provide helpful explanations, elaborate on key points, and help them understand the material.\n';

    return formatted;
  }

  /**
   * Calculate overall comprehension from responses
   */
  private calculateComprehension(session: LearningModuleSession): number {
    if (session.userResponses.length === 0) return 0;

    const correctResponses = session.userResponses.filter(r => r.isCorrect).length;
    const accuracy = (correctResponses / session.userResponses.length) * 100;

    // Weight by difficulty and recency
    let weightedScore = 0;
    let totalWeight = 0;

    session.userResponses.forEach((response, index) => {
      const recencyWeight = (index + 1) / session.userResponses.length; // More recent = higher weight
      const score = response.isCorrect ? 100 : 0;
      const weight = recencyWeight;

      weightedScore += score * weight;
      totalWeight += weight;
    });

    const comprehension = totalWeight > 0 ? weightedScore / totalWeight : accuracy;
    return Math.round(comprehension);
  }

  /**
   * Update cognitive markers based on response
   */
  private updateCognitiveMarkers(session: LearningModuleSession, response: UserResponse) {
    const { cognitiveMarkers } = session;
    const { concept, isCorrect, timeSpent } = response;

    // Update concept understanding
    const currentUnderstanding = cognitiveMarkers.conceptUnderstanding[concept] || 0;
    const newUnderstanding = isCorrect
      ? Math.min(100, currentUnderstanding + 20)
      : Math.max(0, currentUnderstanding - 10);
    
    cognitiveMarkers.conceptUnderstanding[concept] = newUnderstanding;

    // Update knowledge gaps
    if (newUnderstanding < 60 && !cognitiveMarkers.knowledgeGaps.includes(concept)) {
      cognitiveMarkers.knowledgeGaps.push(concept);
    } else if (newUnderstanding >= 60) {
      cognitiveMarkers.knowledgeGaps = cognitiveMarkers.knowledgeGaps.filter(g => g !== concept);
    }

    // Update strength areas
    if (newUnderstanding >= 80 && !cognitiveMarkers.strengthAreas.includes(concept)) {
      cognitiveMarkers.strengthAreas.push(concept);
    }

    // Infer learning speed based on time spent
    const avgTimePerQuestion = session.userResponses.reduce((sum, r) => sum + r.timeSpent, 0) / session.userResponses.length;
    if (avgTimePerQuestion < 20) {
      cognitiveMarkers.learningPatterns.preferredPace = 'fast';
    } else if (avgTimePerQuestion < 40) {
      cognitiveMarkers.learningPatterns.preferredPace = 'moderate';
    } else {
      cognitiveMarkers.learningPatterns.preferredPace = 'slow';
    }
  }

  /**
   * Save session data to analytics database
   */
  private async saveSessionToDatabase(session: LearningModuleSession) {
    if (!this.userId) {
      console.warn('Cannot save session: userId not set');
      return;
    }

    try {
      // Calculate accuracy
      const correctAnswers = session.userResponses.filter(r => r.isCorrect).length;
      const accuracy = session.userResponses.length > 0
        ? (correctAnswers / session.userResponses.length) * 100
        : 0;

      // Log via DataCollectionService
      await dataCollectionService.logLearningActivity({
        subject: session.moduleId,
        topic: session.contentGenerated.targetedConcepts.join(', '),
        difficulty: session.contentGenerated.adaptedForLevel,
        timeSpent: session.sessionDuration,
        questionsAnswered: session.userResponses.length,
        correctAnswers: correctAnswers,
        learningMethod: 'generative'
      });

      console.log('✅ Session saved to database:', session.sessionId);
    } catch (error) {
      console.error('❌ Failed to save session to database:', error);
    }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `learning_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Get progress summary for a module (aggregated from past sessions)
   */
  getModuleProgressSummary(moduleId: string): Partial<LearningModuleProgress> {
    // This would typically fetch from database
    // For now, return data from active session if available
    const activeSessions = Array.from(this.activeSessions.values()).filter(
      s => s.moduleId === moduleId
    );

    if (activeSessions.length === 0) {
      return {
        overallComprehension: 0,
        timeSpent: 0,
        questionsAnswered: 0,
        accuracyRate: 0,
        status: 'not_started'
      };
    }

    const totalTime = activeSessions.reduce((sum, s) => sum + s.sessionDuration, 0);
    const totalQuestions = activeSessions.reduce((sum, s) => sum + s.userResponses.length, 0);
    const correctAnswers = activeSessions.reduce(
      (sum, s) => sum + s.userResponses.filter(r => r.isCorrect).length,
      0
    );

    return {
      overallComprehension: activeSessions[activeSessions.length - 1].comprehensionLevel,
      timeSpent: Math.floor(totalTime / 60),
      questionsAnswered: totalQuestions,
      accuracyRate: totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0,
      status: 'in_progress'
    };
  }
}

// Export singleton instance
export const learningModuleTracker = new LearningModuleTracker();

