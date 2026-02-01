/**
 * 🎓 LEARNING PROGRESS CONTEXT SERVICE
 * 
 * Provides AI with awareness of user's learning module progress
 * Integrates localStorage (fast) + database (historical) for comprehensive context
 */

import { learningModuleTracker } from './LearningModuleTracker';
import { dataCollectionService } from './DataCollectionService';
import type { LearningModuleProgress, LearningModuleSession } from '../types/LearningModule.types';

export interface LearningContextData {
  userId: string;
  modules: {
    [moduleId: string]: {
      progress: LearningModuleProgress;
      recentSessions: LearningModuleSession[];
      historicalStats: {
        totalTimeSpent: number;
        totalQuestions: number;
        averageAccuracy: number;
        completionRate: number;
        lastAccessed: Date;
      };
    };
  };
  overallStats: {
    totalModulesStarted: number;
    totalModulesCompleted: number;
    totalLearningTime: number; // minutes
    averageComprehension: number;
    strongestAreas: string[];
    strugglingAreas: string[];
  };
  currentSession: LearningModuleSession | null;
}

export interface LearningPattern {
  userId: string;
  patterns: {
    learningSpeed: 'fast' | 'moderate' | 'slow';
    preferredContentType: 'visual' | 'textual' | 'interactive';
    retentionStrength: 'high' | 'medium' | 'low';
    strugglePatterns: string[];
    strengthPatterns: string[];
    optimalLearningTime: string; // e.g., "morning", "afternoon"
  };
  recommendations: string[];
}

class LearningProgressContextService {
  private static instance: LearningProgressContextService;

  static getInstance(): LearningProgressContextService {
    if (!LearningProgressContextService.instance) {
      LearningProgressContextService.instance = new LearningProgressContextService();
    }
    return LearningProgressContextService.instance;
  }

  /**
   * Get comprehensive learning context for a user
   * Combines localStorage (fast) + database (historical)
   */
  async getUserLearningContext(userId: string, moduleId?: string): Promise<LearningContextData> {
    try {
      // Get localStorage data (user context - fast access)
      const localStorageData = this.getLocalStorageLearningData(userId);
      
      // Get active session data from LearningModuleTracker
      const activeSessionData = this.getActiveSessionData(userId, moduleId);
      
      // Get historical data from database (comprehensive)
      const historicalData = await this.getHistoricalLearningData(userId, moduleId);

      // Merge all data sources
      const context: LearningContextData = {
        userId,
        modules: {},
        overallStats: {
          totalModulesStarted: 0,
          totalModulesCompleted: 0,
          totalLearningTime: 0,
          averageComprehension: 0,
          strongestAreas: [],
          strugglingAreas: []
        },
        currentSession: activeSessionData
      };

      // Combine localStorage and historical data
      const allModuleIds = new Set([
        ...Object.keys(localStorageData.modules || {}),
        ...Object.keys(historicalData.modules || {})
      ]);

      allModuleIds.forEach(modId => {
        const localStorage = localStorageData.modules?.[modId];
        const historical = historicalData.modules?.[modId];

        if (localStorage || historical) {
          context.modules[modId] = {
            progress: localStorage || historical?.progress || this.getDefaultProgress(),
            recentSessions: historical?.recentSessions || [],
            historicalStats: historical?.historicalStats || this.getDefaultHistoricalStats()
          };
        }
      });

      // Calculate overall statistics
      context.overallStats = this.calculateOverallStats(context.modules);

      return context;
    } catch (error) {
      console.error('❌ Failed to get learning context:', error);
      return this.getEmptyContext(userId);
    }
  }

  /**
   * Format learning context for AI consumption
   */
  formatLearningContextForAI(learningContext: LearningContextData): string {
    if (!learningContext || Object.keys(learningContext.modules).length === 0) {
      return '';
    }

    let formatted = '\n\n🎓 **LEARNING PROGRESS:**\n';

    // Current session info (most important)
    if (learningContext.currentSession) {
      const session = learningContext.currentSession;
      formatted += `• Currently learning: ${session.moduleId}\n`;
      formatted += `• Comprehension level: ${session.comprehensionLevel}%\n`;
      formatted += `• Questions answered: ${session.userResponses.length}\n`;
      
      if (session.cognitiveMarkers.knowledgeGaps.length > 0) {
        formatted += `• Struggling with: ${session.cognitiveMarkers.knowledgeGaps.slice(0, 3).join(', ')}\n`;
      }
      
      if (session.cognitiveMarkers.strengthAreas.length > 0) {
        formatted += `• Strong in: ${session.cognitiveMarkers.strengthAreas.slice(0, 3).join(', ')}\n`;
      }
    }

    // Overall progress summary
    const stats = learningContext.overallStats;
    if (stats.totalModulesStarted > 0) {
      formatted += `\n📊 **Overall Learning Stats:**\n`;
      formatted += `• Modules started: ${stats.totalModulesStarted}\n`;
      formatted += `• Modules completed: ${stats.totalModulesCompleted}\n`;
      formatted += `• Total learning time: ${stats.totalLearningTime} minutes\n`;
      formatted += `• Average comprehension: ${stats.averageComprehension}%\n`;

      if (stats.strongestAreas.length > 0) {
        formatted += `• Strongest areas: ${stats.strongestAreas.slice(0, 3).join(', ')}\n`;
      }

      if (stats.strugglingAreas.length > 0) {
        formatted += `• Areas needing help: ${stats.strugglingAreas.slice(0, 3).join(', ')}\n`;
      }
    }

    formatted += '\n⚠️ IMPORTANT: Use this learning context to provide personalized help. If user is struggling, offer encouragement and Socratic guidance.';

    return formatted;
  }

  /**
   * Determine if learning progress should be mentioned
   */
  shouldMentionProgress(message: string, learningContext: LearningContextData): boolean {
    const messageLower = message.toLowerCase();

    // Mention if user asks about progress/learning
    const progressPatterns = [
      /progress/i,
      /how am i doing/i,
      /my learning/i,
      /module/i,
      /course/i,
      /lesson/i,
      /study/i,
      /learn/i
    ];

    if (progressPatterns.some(pattern => pattern.test(messageLower))) {
      return true;
    }

    // Mention if user references a specific module
    for (const moduleId of Object.keys(learningContext.modules)) {
      if (messageLower.includes(moduleId.toLowerCase())) {
        return true;
      }
    }

    return false;
  }

  /**
   * Analyze learning patterns using cognitive analysis
   */
  async analyzeLearningPatterns(userId: string): Promise<LearningPattern> {
    const context = await this.getUserLearningContext(userId);
    
    const patterns: LearningPattern = {
      userId,
      patterns: {
        learningSpeed: 'moderate',
        preferredContentType: 'interactive',
        retentionStrength: 'medium',
        strugglePatterns: [],
        strengthPatterns: [],
        optimalLearningTime: 'afternoon'
      },
      recommendations: []
    };

    // Analyze learning speed from session data
    const sessions = Object.values(context.modules).flatMap(m => m.recentSessions);
    if (sessions.length > 0) {
      const avgTimePerQuestion = sessions.reduce((sum, s) => {
        const responses = s.userResponses || [];
        return sum + (responses.reduce((rSum, r) => rSum + (r.timeSpent || 0), 0) / Math.max(responses.length, 1));
      }, 0) / sessions.length;

      if (avgTimePerQuestion < 20) {
        patterns.patterns.learningSpeed = 'fast';
      } else if (avgTimePerQuestion > 40) {
        patterns.patterns.learningSpeed = 'slow';
      }
    }

    // Analyze retention from accuracy rates
    if (context.overallStats.averageComprehension >= 80) {
      patterns.patterns.retentionStrength = 'high';
    } else if (context.overallStats.averageComprehension < 60) {
      patterns.patterns.retentionStrength = 'low';
    }

    // Collect struggle and strength patterns
    patterns.patterns.strugglePatterns = context.overallStats.strugglingAreas;
    patterns.patterns.strengthPatterns = context.overallStats.strongestAreas;

    // Generate recommendations
    if (patterns.patterns.learningSpeed === 'slow') {
      patterns.recommendations.push('Try breaking learning sessions into shorter, focused intervals');
    }
    if (patterns.patterns.retentionStrength === 'low') {
      patterns.recommendations.push('Regular review sessions can help improve retention');
    }
    if (patterns.patterns.strugglePatterns.length > 2) {
      patterns.recommendations.push('Consider using Socratic guidance for challenging concepts');
    }

    return patterns;
  }

  /**
   * Vectorize learning progress for semantic search
   * Creates embedding-friendly summaries
   */
  async vectorizeLearningProgress(userId: string, moduleId: string): Promise<string> {
    const context = await this.getUserLearningContext(userId, moduleId);
    const moduleData = context.modules[moduleId];

    if (!moduleData) {
      return '';
    }

    // Create natural language summary for vectorization
    const summary = `
User learning progress for module ${moduleId}:
- Comprehension level: ${moduleData.progress.overallComprehension}%
- Accuracy rate: ${moduleData.progress.accuracyRate}%
- Time spent: ${moduleData.progress.timeSpent} minutes
- Questions answered: ${moduleData.progress.questionsAnswered}
- Status: ${moduleData.progress.status}
- Knowledge gaps: ${moduleData.historicalStats ? 'struggling with foundational concepts' : 'no significant gaps'}
- Learning pattern: ${moduleData.progress.cognitiveProfile?.learningSpeed || 'moderate'} pace learner
    `.trim();

    return summary;
  }

  // Private helper methods

  private getLocalStorageLearningData(userId: string): any {
    try {
      // Try to get data from localStorage
      const userDataKey = `user_${userId}`;
      const userDataStr = localStorage.getItem(userDataKey);
      
      if (!userDataStr) {
        return { modules: {} };
      }

      const userData = JSON.parse(userDataStr);
      const learningModules = userData?.profile?.aiAssessment?.learningModules || {};

      return { modules: learningModules };
    } catch (error) {
      console.warn('⚠️ Failed to get localStorage learning data:', error);
      return { modules: {} };
    }
  }

  private getActiveSessionData(userId: string, moduleId?: string): LearningModuleSession | null {
    // Get current active session from LearningModuleTracker
    // For now, return null as we need sessionId to retrieve it
    // This will be enhanced when we track active sessions more comprehensively
    return null;
  }

  private async getHistoricalLearningData(userId: string, moduleId?: string): Promise<any> {
    try {
      // Query historical learning data from database
      // This would integrate with DatabaseService to query learning_activity events
      // For now, return empty structure
      return {
        modules: {}
      };
    } catch (error) {
      console.warn('⚠️ Failed to get historical learning data:', error);
      return { modules: {} };
    }
  }

  private calculateOverallStats(modules: any): LearningContextData['overallStats'] {
    const moduleArray = Object.values(modules);
    
    if (moduleArray.length === 0) {
      return {
        totalModulesStarted: 0,
        totalModulesCompleted: 0,
        totalLearningTime: 0,
        averageComprehension: 0,
        strongestAreas: [],
        strugglingAreas: []
      };
    }

    const totalComprehension = moduleArray.reduce((sum: number, m: any) => 
      sum + (m.progress?.overallComprehension || 0), 0);
    
    const totalTime = moduleArray.reduce((sum: number, m: any) => 
      sum + (m.progress?.timeSpent || 0), 0);

    const completedCount = moduleArray.filter((m: any) => 
      m.progress?.status === 'completed').length;

    // Collect struggle and strength areas
    const strugglingAreas = new Set<string>();
    const strongestAreas = new Set<string>();

    moduleArray.forEach((m: any) => {
      if (m.progress?.overallComprehension < 60) {
        strugglingAreas.add(m.progress?.cognitiveProfile?.preferredContentType || 'general');
      }
      if (m.progress?.overallComprehension >= 80) {
        strongestAreas.add(m.progress?.cognitiveProfile?.preferredContentType || 'general');
      }
    });

    return {
      totalModulesStarted: moduleArray.length,
      totalModulesCompleted: completedCount,
      totalLearningTime: totalTime,
      averageComprehension: Math.round(totalComprehension / moduleArray.length),
      strongestAreas: Array.from(strongestAreas),
      strugglingAreas: Array.from(strugglingAreas)
    };
  }

  private getDefaultProgress(): LearningModuleProgress {
    return {
      overallComprehension: 0,
      timeSpent: 0,
      questionsAnswered: 0,
      accuracyRate: 0,
      lastAccessed: new Date(),
      status: 'not_started',
      cognitiveProfile: {
        conceptGrasp: 1,
        retentionLevel: 0,
        learningSpeed: 'moderate',
        preferredContentType: 'interactive'
      },
      completedSections: []
    };
  }

  private getDefaultHistoricalStats(): any {
    return {
      totalTimeSpent: 0,
      totalQuestions: 0,
      averageAccuracy: 0,
      completionRate: 0,
      lastAccessed: new Date()
    };
  }

  private getEmptyContext(userId: string): LearningContextData {
    return {
      userId,
      modules: {},
      overallStats: {
        totalModulesStarted: 0,
        totalModulesCompleted: 0,
        totalLearningTime: 0,
        averageComprehension: 0,
        strongestAreas: [],
        strugglingAreas: []
      },
      currentSession: null
    };
  }
}

// Export singleton instance
export const learningProgressContextService = LearningProgressContextService.getInstance();





