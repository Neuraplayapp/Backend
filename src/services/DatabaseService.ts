import { openDB, IDBPDatabase } from 'idb';

// Database configuration
const DB_CONFIG = {
  RENDER_POSTGRES_URL: import.meta.env.VITE_RENDER_POSTGRES_URL || '',
  RENDER_REDIS_URL: import.meta.env.VITE_RENDER_REDIS_URL || '',
  LOCAL_DB_NAME: 'NeuraPlayDB',
  LOCAL_STORES: ['users', 'gameProgress', 'analytics', 'posts', 'conversations', 'aiLogs', 'canvasSessions', 'chartData', 'userPatterns']
};

// Types for database entities
export interface UserData {
  id: string;
  username: string;
  email?: string;
  profile: {
    level: number;
    xp: number;
    stars: number;
    gameProgress: Record<string, GameProgress>;
    preferences: UserPreferences;
    createdAt: Date;
    lastActive: Date;
  };
}

export interface GameProgress {
  gameId: string;
  level: number;
  stars: number;
  bestScore: number;
  timesPlayed: number;
  playTime: number;
  lastPlayed: Date;
  achievements: string[];
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  accessibility: {
    colorBlindness?: 'protanopia' | 'deuteranopia' | 'tritanopia';
    highContrast?: boolean;
    largeText?: boolean;
  };
  notifications: {
    email: boolean;
    push: boolean;
    gameReminders: boolean;
  };
}

export interface AnalyticsData {
  id: string;
  userId: string;
  eventType: 'game_session' | 'ai_interaction' | 'navigation' | 'error' | 'achievement' | 'canvas_session' | 'chart_creation' | 'hypothesis_detection' | 'user_pattern';
  eventData: any;
  timestamp: Date;
  sessionId: string;
  userAgent: string;
  platform: string;
}

export interface PostData {
  id: string;
  userId: string;
  channel: string;
  title: string;
  content: string;
  votes: number;
  replies: ReplyData[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ReplyData {
  id: string;
  userId: string;
  content: string;
  votes: number;
  createdAt: Date;
}

export interface ConversationData {
  id: string;
  userId: string;
  messages: MessageData[];
  metadata: {
    mode: string;
    toolsUsed: string[];
    sessionDuration: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageData {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    toolCalls?: any[];
    toolResults?: any[];
    imageUrl?: string;
  };
}

export interface AILogData {
  id: string;
  userId: string;
  interactionType: 'tool_call' | 'conversation' | 'image_generation' | 'search' | 'weather' | 'chart_creation' | 'canvas_interaction';
  input: string;
  output: string;
  toolsUsed: string[];
  responseTime: number;
  timestamp: Date;
  sessionId: string;
}

// Canvas-specific data interfaces that integrate with existing system
export interface CanvasSessionData {
  id: string;
  userId: string;
  sessionName: string;
  elements: any[]; // CanvasElement[]
  hypotheses: any[]; // Hypothesis[]
  suggestions: any[]; // SuggestionCard[]
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    version: string;
    theme: 'light' | 'dark' | 'auto';
    splitRatio: number;
    totalTime: number;
    elementsCreated: number;
    toolsUsed: string[];
  };
}

export interface ChartCreationData {
  id: string;
  elementId: string;
  sessionId: string;
  userId: string;
  chartType: string;
  library: 'plotly' | 'threejs' | 'observable' | 'chartjs';
  config: any;
  data: any;
  metadata: {
    title: string;
    is3D: boolean;
    interactive: boolean;
    theme: string;
    createdAt: Date;
    performance: {
      renderTime: number;
      dataSize: number;
      complexity: 'low' | 'medium' | 'high';
    };
  };
}

// Database Service Class
export class DatabaseService {
  private localDB: IDBPDatabase | null = null;
  private isOnline: boolean = true;

  constructor() {
    this.checkConnectivity();
  }

  private async checkConnectivity() {
    try {
      const response = await fetch('/api/health');
      this.isOnline = response.ok;
    } catch (error) {
      this.isOnline = false;
      console.log('Database: Using local storage mode');
    }
  }

  // Initialize local IndexedDB
  private async initLocalDB() {
    if (this.localDB) return this.localDB;
    
    this.localDB = await openDB(DB_CONFIG.LOCAL_DB_NAME, 1, {
      upgrade(db) {
        // Create object stores for each data type
        DB_CONFIG.LOCAL_STORES.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        });
      },
    });
    return this.localDB;
  }

  // User Management
  async saveUser(userData: UserData): Promise<void> {
    try {
      if (this.isOnline) {
        await this.syncToRemote('users', userData);
      }
      await this.saveToLocal('users', userData);
    } catch (error) {
      console.error('Error saving user:', error);
      await this.saveToLocal('users', userData);
    }
  }

  async getUser(userId: string): Promise<UserData | null> {
    try {
      if (this.isOnline) {
        const remoteData = await this.getFromRemote('users', userId);
        if (remoteData) {
          await this.saveToLocal('users', remoteData);
          return remoteData;
        }
      }
      return await this.getFromLocal('users', userId);
    } catch (error) {
      console.error('Error getting user:', error);
      return await this.getFromLocal('users', userId);
    }
  }

  // Game Progress Management
  async saveGameProgress(userId: string, gameProgress: GameProgress): Promise<void> {
    try {
      const user = await this.getUser(userId);
      if (user) {
        user.profile.gameProgress[gameProgress.gameId] = gameProgress;
        await this.saveUser(user);
      }
    } catch (error) {
      console.error('Error saving game progress:', error);
    }
  }

  async getGameProgress(userId: string, gameId: string): Promise<GameProgress | null> {
    try {
      const user = await this.getUser(userId);
      return user?.profile.gameProgress[gameId] || null;
    } catch (error) {
      console.error('Error getting game progress:', error);
      return null;
    }
  }

  // Analytics Management
  async logAnalytics(analyticsData: AnalyticsData): Promise<void> {
    try {
      // 🛡️ CRITICAL FIX: Validate userId before sending to database
      const cleanedData = { ...analyticsData };
      
      // Check if userId is valid (UUID or string-based like admin_2025)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const isUUID = cleanedData.userId && uuidRegex.test(cleanedData.userId);
      const isStringUserId = cleanedData.userId && typeof cleanedData.userId === 'string' && cleanedData.userId.length > 0;
      
      if (!isStringUserId) {
        console.warn('⚠️ DatabaseService: Skipping analytics sync - invalid userId:', cleanedData.userId);
        // Only save locally if userId is invalid
        await this.saveToLocal('analytics', cleanedData);
        return;
      }
      
      if (this.isOnline) {
        await this.syncToRemote('analytics', cleanedData);
      }
      await this.saveToLocal('analytics', cleanedData);
    } catch (error) {
      console.error('Error logging analytics:', error);
      // Always save locally as fallback
      await this.saveToLocal('analytics', analyticsData);
    }
  }

  async getAnalytics(userId: string, eventType?: string): Promise<AnalyticsData[]> {
    try {
      if (this.isOnline) {
        const remoteData = await this.getFromRemote('analytics', userId, { eventType });
        if (remoteData) {
          await this.saveToLocal('analytics', remoteData);
          return Array.isArray(remoteData) ? remoteData : [remoteData];
        }
      }
      return await this.getFromLocal('analytics', userId);
    } catch (error) {
      console.error('Error getting analytics:', error);
      return await this.getFromLocal('analytics', userId);
    }
  }

  // Posts Management
  async savePost(postData: PostData): Promise<void> {
    try {
      if (this.isOnline) {
        await this.syncToRemote('posts', postData);
      }
      await this.saveToLocal('posts', postData);
    } catch (error) {
      console.error('Error saving post:', error);
      await this.saveToLocal('posts', postData);
    }
  }

  async getPosts(channel?: string): Promise<PostData[]> {
    try {
      if (this.isOnline) {
        const remoteData = await this.getFromRemote('posts', null, { channel });
        if (remoteData) {
          await this.saveToLocal('posts', remoteData);
          return Array.isArray(remoteData) ? remoteData : [remoteData];
        }
      }
      return await this.getFromLocal('posts');
    } catch (error) {
      console.error('Error getting posts:', error);
      return await this.getFromLocal('posts');
    }
  }

  // Conversations Management
  async saveConversation(conversationData: ConversationData): Promise<void> {
    try {
      if (this.isOnline) {
        await this.syncToRemote('conversations', conversationData);
      }
      await this.saveToLocal('conversations', conversationData);
    } catch (error) {
      console.error('Error saving conversation:', error);
      await this.saveToLocal('conversations', conversationData);
    }
  }

  async getConversations(userId: string): Promise<ConversationData[]> {
    try {
      if (this.isOnline) {
        const remoteData = await this.getFromRemote('conversations', userId);
        if (remoteData) {
          await this.saveToLocal('conversations', remoteData);
          return Array.isArray(remoteData) ? remoteData : [remoteData];
        }
      }
      return await this.getFromLocal('conversations', userId);
    } catch (error) {
      console.error('Error getting conversations:', error);
      return await this.getFromLocal('conversations', userId);
    }
  }

  // AI Logs Management
  async logAIInteraction(aiLogData: AILogData): Promise<void> {
    try {
      if (this.isOnline) {
        await this.syncToRemote('aiLogs', aiLogData);
      }
      await this.saveToLocal('aiLogs', aiLogData);
    } catch (error) {
      console.error('Error logging AI interaction:', error);
      await this.saveToLocal('aiLogs', aiLogData);
    }
  }

  async getAILogs(userId: string, interactionType?: string): Promise<AILogData[]> {
    try {
      if (this.isOnline) {
        const remoteData = await this.getFromRemote('aiLogs', userId, { interactionType });
        if (remoteData) {
          await this.saveToLocal('aiLogs', remoteData);
          return Array.isArray(remoteData) ? remoteData : [remoteData];
        }
      }
      return await this.getFromLocal('aiLogs', userId);
    } catch (error) {
      console.error('Error getting AI logs:', error);
      return await this.getFromLocal('aiLogs', userId);
    }
  }

  // Local Storage Methods
  private async saveToLocal(storeName: string, data: any): Promise<void> {
    const db = await this.initLocalDB();
    await db.put(storeName, data);
  }

  private async getFromLocal(storeName: string, key?: string): Promise<any> {
    const db = await this.initLocalDB();
    if (key) {
      return await db.get(storeName, key);
    } else {
      return await db.getAll(storeName);
    }
  }

  // Remote Database Methods
  private async syncToRemote(collection: string, data: any): Promise<void> {
    if (!this.isOnline) return;

    try {
      const response = await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          collection,
          data
        })
      });

      if (!response.ok) {
        // Parse response to get error details
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        
        // For non-critical collections (analytics, logs), just warn
        if (collection === 'analytics' || collection === 'aiLogs') {
          console.warn(`⚠️ Remote sync skipped for ${collection}:`, errorData.error || errorData.details);
          // Don't set isOnline to false for analytics failures
          return;
        }
        
        throw new Error(`Remote sync failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }
      
      // Parse response to check for warnings
      const result = await response.json().catch(() => ({ success: true }));
      if (result.warning) {
        console.warn(`⚠️ Remote sync warning for ${collection}:`, result.warning);
      }
    } catch (error) {
      // Only log as error for critical collections
      if (collection === 'analytics' || collection === 'aiLogs') {
        console.debug(`Analytics sync skipped:`, error.message);
      } else {
        console.error('Remote sync error:', error);
        this.isOnline = false;
      }
    }
  }

  private async getFromRemote(collection: string, key?: string, filters?: any): Promise<any> {
    if (!this.isOnline) return null;

    try {
      const response = await fetch('/api/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get',
          collection,
          key,
          filters
        })
      });

      if (!response.ok) {
        throw new Error(`Remote get failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Remote get error:', error);
      this.isOnline = false;
      return null;
    }
  }

  // Sync local data to remote when online
  async syncLocalToRemote(): Promise<void> {
    if (!this.isOnline) return;

    try {
      const db = await this.initLocalDB();
      
      for (const storeName of DB_CONFIG.LOCAL_STORES) {
        const localData = await db.getAll(storeName);
        
        for (const data of localData) {
          await this.syncToRemote(storeName, data);
        }
      }
    } catch (error) {
      console.error('Sync to remote error:', error);
    }
  }

  // Canvas Session Management - Integrated with existing system
  async saveCanvasSession(canvasData: CanvasSessionData): Promise<void> {
    try {
      if (this.isOnline) {
        await this.syncToRemote('canvasSessions', canvasData);
      }
      await this.saveToLocal('canvasSessions', canvasData);
      
      // Log analytics
      await this.logAnalytics({
        id: `canvas_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        userId: canvasData.userId,
        eventType: 'canvas_session',
        eventData: {
          sessionId: canvasData.id,
          elementsCount: canvasData.elements.length,
          hypothesesCount: canvasData.hypotheses.length,
          sessionDuration: canvasData.metadata.totalTime,
          toolsUsed: canvasData.metadata.toolsUsed
        },
        timestamp: new Date(),
        sessionId: canvasData.id,
        userAgent: navigator.userAgent,
        platform: 'desktop'
      });
    } catch (error) {
      console.error('Error saving canvas session:', error);
      await this.saveToLocal('canvasSessions', canvasData);
    }
  }

  async getCanvasSession(sessionId: string): Promise<CanvasSessionData | null> {
    try {
      if (this.isOnline) {
        const remoteData = await this.getFromRemote('canvasSessions', sessionId);
        if (remoteData) {
          await this.saveToLocal('canvasSessions', remoteData);
          return remoteData;
        }
      }
      return await this.getFromLocal('canvasSessions', sessionId);
    } catch (error) {
      console.error('Error getting canvas session:', error);
      return await this.getFromLocal('canvasSessions', sessionId);
    }
  }

  async getUserCanvasSessions(userId: string): Promise<CanvasSessionData[]> {
    try {
      if (this.isOnline) {
        const remoteData = await this.getFromRemote('canvasSessions', userId);
        if (remoteData) {
          await this.saveToLocal('canvasSessions', remoteData);
          return Array.isArray(remoteData) ? remoteData : [remoteData];
        }
      }
      const allSessions = await this.getFromLocal('canvasSessions');
      return Array.isArray(allSessions) ? allSessions.filter(s => s.userId === userId) : [];
    } catch (error) {
      console.error('Error getting user canvas sessions:', error);
      return [];
    }
  }

  // Chart Creation Management - Integrated with existing system
  async saveChartCreation(chartData: ChartCreationData): Promise<void> {
    try {
      if (this.isOnline) {
        await this.syncToRemote('chartData', chartData);
      }
      await this.saveToLocal('chartData', chartData);
      
      // Log analytics
      await this.logAnalytics({
        id: `chart_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        userId: chartData.userId,
        eventType: 'chart_creation',
        eventData: {
          chartType: chartData.chartType,
          library: chartData.library,
          is3D: chartData.metadata.is3D,
          interactive: chartData.metadata.interactive,
          renderTime: chartData.metadata.performance.renderTime,
          complexity: chartData.metadata.performance.complexity
        },
        timestamp: new Date(),
        sessionId: chartData.sessionId,
        userAgent: navigator.userAgent,
        platform: 'desktop'
      });
      
      // Log AI interaction
      await this.logAIInteraction({
        id: `chart_ai_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        userId: chartData.userId,
        interactionType: 'chart_creation',
        input: `Create ${chartData.chartType} chart using ${chartData.library}`,
        output: `Generated ${chartData.metadata.is3D ? '3D ' : ''}${chartData.chartType} chart`,
        toolsUsed: ['create-chart', chartData.library],
        responseTime: chartData.metadata.performance.renderTime,
        timestamp: new Date(),
        sessionId: chartData.sessionId
      });
    } catch (error) {
      console.error('Error saving chart creation:', error);
      await this.saveToLocal('chartData', chartData);
    }
  }

  async getChartData(chartId: string): Promise<ChartCreationData | null> {
    try {
      if (this.isOnline) {
        const remoteData = await this.getFromRemote('chartData', chartId);
        if (remoteData) {
          await this.saveToLocal('chartData', remoteData);
          return remoteData;
        }
      }
      return await this.getFromLocal('chartData', chartId);
    } catch (error) {
      console.error('Error getting chart data:', error);
      return await this.getFromLocal('chartData', chartId);
    }
  }

  async getSessionCharts(sessionId: string): Promise<ChartCreationData[]> {
    try {
      const allCharts = await this.getFromLocal('chartData');
      return Array.isArray(allCharts) ? allCharts.filter(c => c.sessionId === sessionId) : [];
    } catch (error) {
      console.error('Error getting session charts:', error);
      return [];
    }
  }

  // User Pattern Learning - Integrated with existing system
  async saveUserPattern(patternData: any): Promise<void> {
    try {
      if (this.isOnline) {
        await this.syncToRemote('userPatterns', patternData);
      }
      await this.saveToLocal('userPatterns', patternData);
      
      // Log analytics
      await this.logAnalytics({
        id: `pattern_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        userId: patternData.userId,
        eventType: 'user_pattern',
        eventData: {
          context: patternData.context,
          confidence: patternData.confidence,
          learningWeight: patternData.learningWeight,
          choicesCount: patternData.choices?.length || 0
        },
        timestamp: new Date(),
        sessionId: 'pattern_learning',
        userAgent: navigator.userAgent,
        platform: 'desktop'
      });
    } catch (error) {
      console.error('Error saving user pattern:', error);
      await this.saveToLocal('userPatterns', patternData);
    }
  }

  async getUserPatterns(userId: string): Promise<any[]> {
    try {
      const allPatterns = await this.getFromLocal('userPatterns');
      return Array.isArray(allPatterns) ? allPatterns.filter(p => p.userId === userId) : [];
    } catch (error) {
      console.error('Error getting user patterns:', error);
      return [];
    }
  }

  // Health check
  async healthCheck(): Promise<{ online: boolean; localData: number; remoteData: number }> {
    const db = await this.initLocalDB();
    let localDataCount = 0;
    
    for (const storeName of DB_CONFIG.LOCAL_STORES) {
      const data = await db.getAll(storeName);
      localDataCount += data.length;
    }

    return {
      online: this.isOnline,
      localData: localDataCount,
      remoteData: this.isOnline ? 0 : 0 // Would implement remote count
    };
  }
}

// Export singleton instance
export const databaseService = new DatabaseService(); 