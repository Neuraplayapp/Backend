// Canvas Preference Analyzer
// Analyzes stored canvas data to extract user preferences and patterns
// Feeds back into the automatic memory system for personalized suggestions

interface CanvasCreationPattern {
  documentTypes: { [type: string]: number };
  chartTypes: { [type: string]: number };
  codeLanguages: { [language: string]: number };
  topics: { [topic: string]: number };
  creationFrequency: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  complexityLevels: { [level: string]: number };
  preferredFormats: string[];
}

interface CanvasPreference {
  category: 'canvas_preference';
  key: string;
  value: string;
  confidence: number;
  metadata: {
    source: 'canvas_analysis';
    pattern: string;
    frequency: number;
    lastUsed: string;
  };
}

export class CanvasPreferenceAnalyzer {
  private static instance: CanvasPreferenceAnalyzer;

  static getInstance(): CanvasPreferenceAnalyzer {
    if (!CanvasPreferenceAnalyzer.instance) {
      CanvasPreferenceAnalyzer.instance = new CanvasPreferenceAnalyzer();
    }
    return CanvasPreferenceAnalyzer.instance;
  }

  /**
   * Analyze user's canvas creation patterns and store as preferences
   */
  async analyzeAndStoreCanvasPreferences(userId: string, sessionId: string): Promise<CanvasPreference[]> {
    try {
      console.log('🎨 CanvasPreferenceAnalyzer: Analyzing canvas patterns for user:', userId);

      // 1. Retrieve all canvas elements for the user
      const canvasHistory = await this.retrieveCanvasHistory(userId);
      
      if (canvasHistory.length === 0) {
        console.log('📝 No canvas history found for user');
        return [];
      }

      // 2. Analyze patterns in canvas creations
      const patterns = this.analyzeCreationPatterns(canvasHistory);
      
      // 3. Extract preferences from patterns
      const preferences = this.extractPreferencesFromPatterns(patterns, userId);
      
      // 4. Store preferences in memory system
      await this.storeCanvasPreferences(preferences, sessionId, userId);
      
      console.log(`✅ Analyzed ${canvasHistory.length} canvas items, extracted ${preferences.length} preferences`);
      return preferences;
      
    } catch (error) {
      console.error('❌ Canvas preference analysis failed:', error);
      return [];
    }
  }

  /**
   * Retrieve user's canvas creation history from database
   */
  private async retrieveCanvasHistory(userId: string): Promise<any[]> {
    try {
      // Import database manager to query canvas_elements table
      const { databaseManager } = await import('./DatabaseManager');
      
      const response = await databaseManager.executeQuery({
        action: 'get',
        collection: 'canvas_elements',
        data: { userId }
      });

      if (response.success && response.data) {
        return Array.isArray(response.data) ? response.data : [response.data];
      }

      // Fallback: Try to get from conversations table
      const convResponse = await databaseManager.executeQuery({
        action: 'get', 
        collection: 'conversations',
        data: { userId }
      });

      if (convResponse.success && convResponse.data) {
        const conversations = Array.isArray(convResponse.data) ? convResponse.data : [convResponse.data];
        const allCanvasElements: any[] = [];
        
        conversations.forEach(conv => {
          if (conv.messages) {
            conv.messages.forEach((msg: any) => {
              if (msg.canvasElements && Array.isArray(msg.canvasElements)) {
                allCanvasElements.push(...msg.canvasElements);
              }
            });
          }
        });
        
        return allCanvasElements;
      }

      return [];
    } catch (error) {
      console.error('❌ Failed to retrieve canvas history:', error);
      return [];
    }
  }

  /**
   * Analyze patterns in canvas creations
   */
  private analyzeCreationPatterns(canvasHistory: any[]): CanvasCreationPattern {
    const patterns: CanvasCreationPattern = {
      documentTypes: {},
      chartTypes: {},
      codeLanguages: {},
      topics: {},
      creationFrequency: { daily: 0, weekly: 0, monthly: 0 },
      complexityLevels: {},
      preferredFormats: []
    };

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    canvasHistory.forEach(element => {
      const type = element.type || 'unknown';
      const title = element.title || '';
      const content = element.content || '';
      const createdAt = new Date(element.createdAt || element.timestamp || Date.now());
      const age = now - createdAt.getTime();

      // Document type analysis
      if (type === 'document') {
        const docType = this.inferDocumentType(title, content);
        patterns.documentTypes[docType] = (patterns.documentTypes[docType] || 0) + 1;
      }

      // Chart type analysis  
      if (type === 'chart') {
        const chartType = this.inferChartType(content);
        patterns.chartTypes[chartType] = (patterns.chartTypes[chartType] || 0) + 1;
      }

      // Code language analysis
      if (type === 'code') {
        const language = this.inferCodeLanguage(content);
        patterns.codeLanguages[language] = (patterns.codeLanguages[language] || 0) + 1;
      }

      // Topic extraction
      const topics = this.extractTopics(title, content);
      topics.forEach(topic => {
        patterns.topics[topic] = (patterns.topics[topic] || 0) + 1;
      });

      // Frequency analysis
      if (age < oneDay) patterns.creationFrequency.daily++;
      else if (age < oneWeek) patterns.creationFrequency.weekly++;
      else if (age < oneMonth) patterns.creationFrequency.monthly++;

      // Complexity analysis
      const complexity = this.inferComplexity(content);
      patterns.complexityLevels[complexity] = (patterns.complexityLevels[complexity] || 0) + 1;
    });

    return patterns;
  }

  /**
   * Extract preferences from analyzed patterns
   */
  private extractPreferencesFromPatterns(patterns: CanvasCreationPattern, userId: string): CanvasPreference[] {
    const preferences: CanvasPreference[] = [];

    // Document type preferences
    const topDocumentType = this.getMostFrequent(patterns.documentTypes);
    if (topDocumentType.key && topDocumentType.count > 1) {
      preferences.push({
        category: 'canvas_preference',
        key: 'preferred_document_type',
        value: `Prefers creating ${topDocumentType.key} documents (created ${topDocumentType.count} times)`,
        confidence: Math.min(topDocumentType.count / 10, 0.95),
        metadata: {
          source: 'canvas_analysis',
          pattern: 'document_type_frequency',
          frequency: topDocumentType.count,
          lastUsed: new Date().toISOString()
        }
      });
    }

    // Chart type preferences
    const topChartType = this.getMostFrequent(patterns.chartTypes);
    if (topChartType.key && topChartType.count > 1) {
      preferences.push({
        category: 'canvas_preference',
        key: 'preferred_chart_type',
        value: `Prefers ${topChartType.key} charts (created ${topChartType.count} times)`,
        confidence: Math.min(topChartType.count / 5, 0.9),
        metadata: {
          source: 'canvas_analysis',
          pattern: 'chart_type_frequency',
          frequency: topChartType.count,
          lastUsed: new Date().toISOString()
        }
      });
    }

    // Code language preferences
    const topLanguage = this.getMostFrequent(patterns.codeLanguages);
    if (topLanguage.key && topLanguage.count > 1) {
      preferences.push({
        category: 'canvas_preference',
        key: 'preferred_programming_language',
        value: `Frequently codes in ${topLanguage.key} (${topLanguage.count} projects)`,
        confidence: Math.min(topLanguage.count / 3, 0.9),
        metadata: {
          source: 'canvas_analysis',
          pattern: 'language_frequency',
          frequency: topLanguage.count,
          lastUsed: new Date().toISOString()
        }
      });
    }

    // Topic interests
    const topTopics = this.getTopN(patterns.topics, 3);
    topTopics.forEach(({ key, count }) => {
      if (count > 1) {
        preferences.push({
          category: 'canvas_preference',
          key: `topic_interest_${key.toLowerCase().replace(/\s+/g, '_')}`,
          value: `Shows interest in ${key} (worked on ${count} related projects)`,
          confidence: Math.min(count / 5, 0.85),
          metadata: {
            source: 'canvas_analysis',
            pattern: 'topic_interest',
            frequency: count,
            lastUsed: new Date().toISOString()
          }
        });
      }
    });

    // Creation frequency patterns
    const totalCreations = patterns.creationFrequency.daily + patterns.creationFrequency.weekly + patterns.creationFrequency.monthly;
    if (totalCreations > 0) {
      let frequencyPattern = 'occasional';
      if (patterns.creationFrequency.daily > 2) frequencyPattern = 'daily';
      else if (patterns.creationFrequency.weekly > 3) frequencyPattern = 'regular';
      
      preferences.push({
        category: 'canvas_preference',
        key: 'creation_frequency',
        value: `${frequencyPattern} canvas creator (${totalCreations} total creations)`,
        confidence: 0.8,
        metadata: {
          source: 'canvas_analysis',
          pattern: 'creation_frequency',
          frequency: totalCreations,
          lastUsed: new Date().toISOString()
        }
      });
    }

    // Complexity preferences
    const topComplexity = this.getMostFrequent(patterns.complexityLevels);
    if (topComplexity.key && topComplexity.count > 1) {
      preferences.push({
        category: 'canvas_preference',
        key: 'preferred_complexity',
        value: `Tends to create ${topComplexity.key} complexity content (${topComplexity.count} instances)`,
        confidence: Math.min(topComplexity.count / 8, 0.85),
        metadata: {
          source: 'canvas_analysis',
          pattern: 'complexity_preference',
          frequency: topComplexity.count,
          lastUsed: new Date().toISOString()
        }
      });
    }

    return preferences;
  }

  /**
   * Store canvas preferences in memory system
   */
  private async storeCanvasPreferences(preferences: CanvasPreference[], sessionId: string, userId: string): Promise<void> {
    const { memoryDatabaseBridge } = await import('./MemoryDatabaseBridge');
    
    for (const preference of preferences) {
      try {
        await memoryDatabaseBridge.storeMemory(
          userId,
          preference.key,
          preference.value,
          {
            ...preference.metadata,
            category: preference.category,
            confidence: preference.confidence,
            autoExtracted: true,
            sessionId
          }
        );
        
        console.log(`✅ Stored canvas preference: ${preference.key}`);
      } catch (error) {
        console.warn(`⚠️ Failed to store canvas preference: ${preference.key}`, error);
      }
    }
  }

  // Helper methods for pattern analysis

  private inferDocumentType(title: string, content: any): string {
    const titleLower = title.toLowerCase();
    const contentStr = JSON.stringify(content).toLowerCase();
    
    if (titleLower.includes('schedule') || titleLower.includes('calendar')) return 'schedule';
    if (titleLower.includes('plan') || titleLower.includes('roadmap')) return 'plan';
    if (titleLower.includes('report') || titleLower.includes('analysis')) return 'report';
    if (titleLower.includes('guide') || titleLower.includes('tutorial')) return 'guide';
    if (titleLower.includes('note') || titleLower.includes('memo')) return 'note';
    if (contentStr.includes('todo') || contentStr.includes('task')) return 'task_list';
    if (contentStr.includes('meeting') || contentStr.includes('agenda')) return 'meeting';
    
    return 'general_document';
  }

  private inferChartType(content: any): string {
    if (typeof content === 'object' && content.chartType) {
      return content.chartType;
    }
    
    const contentStr = JSON.stringify(content).toLowerCase();
    if (contentStr.includes('bar')) return 'bar';
    if (contentStr.includes('line')) return 'line';
    if (contentStr.includes('pie')) return 'pie';
    if (contentStr.includes('scatter')) return 'scatter';
    if (contentStr.includes('area')) return 'area';
    
    return 'unknown_chart';
  }

  private inferCodeLanguage(content: any): string {
    const contentStr = JSON.stringify(content).toLowerCase();
    
    if (contentStr.includes('python') || contentStr.includes('def ') || contentStr.includes('import ')) return 'python';
    if (contentStr.includes('javascript') || contentStr.includes('function') || contentStr.includes('const ')) return 'javascript';
    if (contentStr.includes('typescript') || contentStr.includes('interface ')) return 'typescript';
    if (contentStr.includes('java') || contentStr.includes('public class')) return 'java';
    if (contentStr.includes('c++') || contentStr.includes('#include')) return 'cpp';
    if (contentStr.includes('html') || contentStr.includes('<div>')) return 'html';
    if (contentStr.includes('css') || contentStr.includes('style')) return 'css';
    
    return 'general_code';
  }

  private extractTopics(title: string, content: any): string[] {
    const text = `${title} ${JSON.stringify(content)}`.toLowerCase();
    const topics: string[] = [];
    
    // Common topic keywords
    const topicKeywords = [
      'business', 'marketing', 'finance', 'education', 'technology', 'science',
      'health', 'fitness', 'travel', 'food', 'entertainment', 'sports',
      'programming', 'design', 'analytics', 'project management', 'research'
    ];
    
    topicKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        topics.push(keyword);
      }
    });
    
    return topics;
  }

  private inferComplexity(content: any): string {
    const contentStr = JSON.stringify(content);
    const length = contentStr.length;
    
    if (length < 200) return 'simple';
    if (length < 1000) return 'moderate';
    if (length < 3000) return 'complex';
    return 'advanced';
  }

  private getMostFrequent(obj: { [key: string]: number }): { key: string; count: number } {
    let maxKey = '';
    let maxCount = 0;
    
    Object.entries(obj).forEach(([key, count]) => {
      if (count > maxCount) {
        maxKey = key;
        maxCount = count;
      }
    });
    
    return { key: maxKey, count: maxCount };
  }

  private getTopN(obj: { [key: string]: number }, n: number): { key: string; count: number }[] {
    return Object.entries(obj)
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, n);
  }
}

// Export singleton
export const canvasPreferenceAnalyzer = CanvasPreferenceAnalyzer.getInstance();

