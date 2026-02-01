import { databaseService, AnalyticsData, AILogData, UserData, GameProgress } from './DatabaseService';

// Data Collection Service for comprehensive analytics
export class DataCollectionService {
  private sessionId: string;
  private userId: string | null = null;
  private userAgent: string;
  private platform: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.userAgent = navigator.userAgent;
    this.platform = this.detectPlatform();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private detectPlatform(): string {
    if (navigator.userAgent.includes('Mobile')) return 'mobile';
    if (navigator.userAgent.includes('Tablet')) return 'tablet';
    return 'desktop';
  }

  // Set user ID for tracking
  setUserId(userId: string) {
    this.userId = userId;
  }

  // Game Session Analytics
  async logGameSession(gameId: string, sessionData: {
    score: number;
    level?: number;
    starsEarned?: number;
    xpEarned?: number;
    playTime?: number;
    success?: boolean;
    moves?: number;
    errors?: number;
    completionRate?: number;
  }) {
    if (!this.userId) return;

    const analyticsData: AnalyticsData = {
      id: `game_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      userId: this.userId,
      eventType: 'game_session',
      eventData: {
        gameId,
        ...sessionData,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      sessionId: this.sessionId,
      userAgent: this.userAgent,
      platform: this.platform
    };

    await databaseService.logAnalytics(analyticsData);
  }

  // AI Interaction Analytics
  async logAIInteraction(interactionData: {
    interactionType: AILogData['interactionType'];
    input: string;
    output: string;
    toolsUsed: string[];
    responseTime: number;
  }) {
    if (!this.userId) return;

    const aiLogData: AILogData = {
      id: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      userId: this.userId,
      ...interactionData,
      timestamp: new Date(),
      sessionId: this.sessionId
    };

    await databaseService.logAIInteraction(aiLogData);
  }

  // Navigation Analytics
  async logNavigation(page: string, fromPage?: string) {
    if (!this.userId) return;

    const analyticsData: AnalyticsData = {
      id: crypto.randomUUID(), // ✅ FIX: Generate proper UUID instead of nav_ format
      userId: this.userId,
      eventType: 'navigation',
      eventData: {
        page,
        fromPage,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      sessionId: this.sessionId,
      userAgent: this.userAgent,
      platform: this.platform
    };

    await databaseService.logAnalytics(analyticsData);
  }

  // Error Analytics
  async logError(error: Error, context?: string) {
    if (!this.userId) return;

    const analyticsData: AnalyticsData = {
      id: crypto.randomUUID(), // ✅ FIX: Generate proper UUID
      userId: this.userId,
      eventType: 'error',
      eventData: {
        message: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      sessionId: this.sessionId,
      userAgent: this.userAgent,
      platform: this.platform
    };

    await databaseService.logAnalytics(analyticsData);
  }

  // Achievement Analytics
  async logAchievement(achievementId: string, achievementData: {
    title: string;
    description: string;
    category: string;
    difficulty: string;
  }) {
    if (!this.userId) return;

    const analyticsData: AnalyticsData = {
      id: crypto.randomUUID(), // ✅ FIX: Generate proper UUID
      userId: this.userId,
      eventType: 'achievement',
      eventData: {
        achievementId,
        ...achievementData,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      sessionId: this.sessionId,
      userAgent: this.userAgent,
      platform: this.platform
    };

    await databaseService.logAnalytics(analyticsData);
  }

  // User Progress Tracking
  async updateUserProgress(userData: Partial<UserData>) {
    if (!this.userId) return;

    try {
      const existingUser = await databaseService.getUser(this.userId);
      const updatedUser: UserData = {
        ...existingUser,
        ...userData,
        id: this.userId,
        profile: {
          ...existingUser?.profile,
          ...userData.profile,
          lastActive: new Date()
        }
      } as UserData;

      await databaseService.saveUser(updatedUser);
    } catch (error) {
      console.error('Error updating user progress:', error);
    }
  }

  // Game Progress Tracking
  async updateGameProgress(gameId: string, progress: Partial<GameProgress>) {
    if (!this.userId) return;

    try {
      const existingProgress = await databaseService.getGameProgress(this.userId, gameId);
      const updatedProgress: GameProgress = {
        gameId,
        level: 1,
        stars: 0,
        bestScore: 0,
        timesPlayed: 0,
        playTime: 0,
        achievements: [],
        ...existingProgress,
        ...progress,
        lastPlayed: new Date()
      };

      await databaseService.saveGameProgress(this.userId, updatedProgress);
    } catch (error) {
      console.error('Error updating game progress:', error);
    }
  }

  // Performance Analytics
  async logPerformance(metric: string, value: number, context?: any) {
    if (!this.userId) return;

    const analyticsData: AnalyticsData = {
      id: `perf_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      userId: this.userId,
      eventType: 'analytics',
      eventData: {
        metric,
        value,
        context,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      sessionId: this.sessionId,
      userAgent: this.userAgent,
      platform: this.platform
    };

    await databaseService.logAnalytics(analyticsData);
  }

  // Learning Analytics
  async logLearningActivity(activityData: {
    subject: string;
    topic: string;
    difficulty: string;
    timeSpent: number;
    questionsAnswered: number;
    correctAnswers: number;
    learningMethod: string;
  }) {
    if (!this.userId) return;

    const analyticsData: AnalyticsData = {
      id: `learning_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      userId: this.userId,
      eventType: 'learning_activity',
      eventData: {
        ...activityData,
        accuracy: activityData.correctAnswers / activityData.questionsAnswered,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      sessionId: this.sessionId,
      userAgent: this.userAgent,
      platform: this.platform
    };

    await databaseService.logAnalytics(analyticsData);
  }

  // Accessibility Analytics
  async logAccessibilityUsage(accessibilityData: {
    feature: string;
    enabled: boolean;
    userType: string;
    impact: 'positive' | 'negative' | 'neutral';
  }) {
    if (!this.userId) return;

    const analyticsData: AnalyticsData = {
      id: `accessibility_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      userId: this.userId,
      eventType: 'accessibility',
      eventData: {
        ...accessibilityData,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      sessionId: this.sessionId,
      userAgent: this.userAgent,
      platform: this.platform
    };

    await databaseService.logAnalytics(analyticsData);
  }

  // Get Analytics Summary
  async getAnalyticsSummary(): Promise<{
    totalSessions: number;
    totalPlayTime: number;
    favoriteGames: string[];
    learningProgress: any;
    recentAchievements: any[];
  }> {
    if (!this.userId) return {
      totalSessions: 0,
      totalPlayTime: 0,
      favoriteGames: [],
      learningProgress: {},
      recentAchievements: []
    };

    try {
      const analytics = await databaseService.getAnalytics(this.userId);
      
      const gameSessions = analytics.filter(a => a.eventType === 'game_session');
      const achievements = analytics.filter(a => a.eventType === 'achievement');
      const learningActivities = analytics.filter(a => a.eventType === 'learning_activity');

      // Calculate favorite games
      const gameCounts: Record<string, number> = {};
      gameSessions.forEach(session => {
        const gameId = session.eventData.gameId;
        gameCounts[gameId] = (gameCounts[gameId] || 0) + 1;
      });

      const favoriteGames = Object.entries(gameCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([gameId]) => gameId);

      // Calculate total play time
      const totalPlayTime = gameSessions.reduce((total, session) => {
        return total + (session.eventData.playTime || 0);
      }, 0);

      // Recent achievements
      const recentAchievements = achievements
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10)
        .map(a => a.eventData);

      // Learning progress
      const learningProgress = learningActivities.reduce((progress, activity) => {
        const subject = activity.eventData.subject;
        if (!progress[subject]) {
          progress[subject] = {
            totalTime: 0,
            totalQuestions: 0,
            correctAnswers: 0,
            sessions: 0
          };
        }
        
        progress[subject].totalTime += activity.eventData.timeSpent;
        progress[subject].totalQuestions += activity.eventData.questionsAnswered;
        progress[subject].correctAnswers += activity.eventData.correctAnswers;
        progress[subject].sessions += 1;
        
        return progress;
      }, {} as Record<string, any>);

      return {
        totalSessions: gameSessions.length,
        totalPlayTime,
        favoriteGames,
        learningProgress,
        recentAchievements
      };
    } catch (error) {
      console.error('Error getting analytics summary:', error);
      return {
        totalSessions: 0,
        totalPlayTime: 0,
        favoriteGames: [],
        learningProgress: {},
        recentAchievements: []
      };
    }
  }

  // Canvas Session Analytics
  async logCanvasSession(canvasData: {
    sessionId: string;
    elementsCreated: number;
    chartsGenerated: number;
    hypothesesDetected: number;
    toolsUsed: string[];
    sessionDuration: number;
    interactionPattern: 'creation' | 'editing' | 'exploration' | 'analysis';
  }) {
    if (!this.userId) return;

    const analyticsData: AnalyticsData = {
      id: `canvas_session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      userId: this.userId,
      eventType: 'canvas_session',
      eventData: {
        ...canvasData,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      sessionId: this.sessionId,
      userAgent: this.userAgent,
      platform: this.platform
    };

    await databaseService.logAnalytics(analyticsData);
  }

  // Chart Creation Analytics
  async logChartCreation(chartData: {
    chartType: string;
    library: string;
    is3D: boolean;
    interactive: boolean;
    dataSize: number;
    renderTime: number;
    complexity: 'low' | 'medium' | 'high';
    userModifications: number;
  }) {
    if (!this.userId) return;

    const analyticsData: AnalyticsData = {
      id: `chart_creation_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      userId: this.userId,
      eventType: 'chart_creation',
      eventData: {
        ...chartData,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      sessionId: this.sessionId,
      userAgent: this.userAgent,
      platform: this.platform
    };

    await databaseService.logAnalytics(analyticsData);
  }

  // Hypothesis Detection Analytics
  async logHypothesisDetection(hypothesisData: {
    hypothesisType: 'binary_choice' | 'multi_option' | 'user_preference';
    detectedFrom: string;
    confidence: number;
    resolved: boolean;
    chosenOption?: string;
    responseTime?: number;
  }) {
    if (!this.userId) return;

    const analyticsData: AnalyticsData = {
      id: `hypothesis_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      userId: this.userId,
      eventType: 'hypothesis_detection',
      eventData: {
        ...hypothesisData,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      sessionId: this.sessionId,
      userAgent: this.userAgent,
      platform: this.platform
    };

    await databaseService.logAnalytics(analyticsData);
  }

  // User Pattern Learning Analytics
  async logUserPatternLearning(patternData: {
    context: string;
    patternType: 'navigation' | 'preference' | 'workflow' | 'decision';
    confidence: number;
    frequency: number;
    learningWeight: number;
    impact: 'positive' | 'negative' | 'neutral';
  }) {
    if (!this.userId) return;

    const analyticsData: AnalyticsData = {
      id: `pattern_learning_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      userId: this.userId,
      eventType: 'user_pattern',
      eventData: {
        ...patternData,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      sessionId: this.sessionId,
      userAgent: this.userAgent,
      platform: this.platform
    };

    await databaseService.logAnalytics(analyticsData);
  }

  // Canvas Performance Analytics
  async logCanvasPerformance(performanceData: {
    operation: 'render' | 'interaction' | 'animation' | 'data_load';
    duration: number;
    elementsCount: number;
    memoryUsage?: number;
    errorCount: number;
    optimizationLevel: 'low' | 'medium' | 'high';
  }) {
    if (!this.userId) return;

    await this.logPerformance('canvas_performance', performanceData.duration, performanceData);
  }

  // Health check
  async healthCheck() {
    return await databaseService.healthCheck();
  }
}

// Export singleton instance
export const dataCollectionService = new DataCollectionService(); 