/**
 * DatabaseManager - REFACTORED (Zero Regex)
 * 
 * MIGRATION SUMMARY:
 * ✅ new RegExp(term, 'g') for frequency counting → structural counter
 * ✅ /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i → structural UUID validator
 * 
 * Total: 2 regex patterns → 0 regex patterns
 */

export interface DatabaseQuery {
  action: 'save' | 'get' | 'delete' | 'search';
  collection: string;
  data?: any;
  key?: string;
  filters?: any;
}

export interface CrossChatSearchOptions {
  userId: string;
  query: string;
  limit?: number;
  timeRange?: string;
  includeContext?: boolean;
}

export interface KnowledgeSearchResult {
  messages: Array<{
    content: string;
    timestamp: string;
    sessionId: string;
    context?: any;
    relevanceScore?: number;
  }>;
  totalFound: number;
  searchTime: number;
}

// ─────────────────────────────────────────
// STRUCTURAL HELPERS (No Regex)
// ─────────────────────────────────────────

/**
 * Count occurrences of a substring in text (structural)
 * Replaces: (text.match(new RegExp(term, 'g')) || []).length
 */
function countOccurrences(text: string, term: string): number {
  if (!term || !text) return 0;
  let count = 0;
  let pos = 0;
  const termLower = term.toLowerCase();
  const textLower = text.toLowerCase();
  
  while (true) {
    const idx = textLower.indexOf(termLower, pos);
    if (idx === -1) break;
    count++;
    pos = idx + 1;
  }
  
  return count;
}

/**
 * Structural UUID v4 validator
 * Replaces: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
 * 
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * where x is [0-9a-f] and y is [89ab]
 */
function isValidUUID(str: string): boolean {
  if (!str || str.length !== 36) return false;
  
  // Check dashes at positions 8, 13, 18, 23
  if (str[8] !== '-' || str[13] !== '-' || str[18] !== '-' || str[23] !== '-') return false;
  
  // Check version: position 14 must be '4'
  if (str[14] !== '4') return false;
  
  // Check variant: position 19 must be 8, 9, a, or b
  const variantChar = str[19].toLowerCase();
  if (variantChar !== '8' && variantChar !== '9' && variantChar !== 'a' && variantChar !== 'b') return false;
  
  // Check all other positions are hex characters
  const hexPositions = [
    0,1,2,3,4,5,6,7,          // xxxxxxxx
    9,10,11,12,                 // xxxx
    15,16,17,                   // xxx (after 4)
    20,21,22,                   // xxx (after variant)
    24,25,26,27,28,29,30,31,32,33,34,35, // xxxxxxxxxxxx
  ];
  
  for (const pos of hexPositions) {
    const ch = str[pos].toLowerCase();
    const isHex = (ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f');
    if (!isHex) return false;
  }
  
  return true;
}

// ─────────────────────────────────────────
// Main DatabaseManager (No Regex)
// ─────────────────────────────────────────

export class DatabaseManager {
  private static instance: DatabaseManager;
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/api';
  }

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  async executeQuery(query: DatabaseQuery): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/database`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Database query failed: ${response.status} - ${errorText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('❌ DatabaseManager: Query failed:', error);
      throw error;
    }
  }

  async saveUserData(userData: any): Promise<boolean> {
    try {
      await this.executeQuery({ action: 'save', collection: 'users', data: userData });
      return true;
    } catch { return false; }
  }

  async getUserData(userId: string): Promise<any | null> {
    try {
      const result = await this.executeQuery({ action: 'get', collection: 'users', key: userId });
      return result && result.length > 0 ? result[0] : null;
    } catch { return null; }
  }

  /**
   * Cross-chat knowledge search - uses structural relevance scoring
   */
  async searchCrossChat(options: CrossChatSearchOptions): Promise<KnowledgeSearchResult> {
    const startTime = Date.now();
    try {
      const aiLogs = await this.executeQuery({
        action: 'get', collection: 'ai_logs', key: options.userId,
        filters: { interactionType: 'chat' },
      });

      const searchTerms = options.query.toLowerCase().split(' ');
      const relevantMessages: any[] = [];

      if (aiLogs && Array.isArray(aiLogs)) {
        for (const log of aiLogs) {
          const combinedText = `${(log.input || '').toLowerCase()} ${(log.output || '').toLowerCase()}`;
          const relevanceScore = this.calculateRelevance(combinedText, searchTerms);
          if (relevanceScore > 0.3) {
            relevantMessages.push({
              content: `Q: ${log.input}\nA: ${log.output}`,
              timestamp: log.timestamp,
              sessionId: log.session_id,
              relevanceScore,
              type: 'ai_interaction',
            });
          }
        }
      }

      relevantMessages.sort((a, b) => b.relevanceScore - a.relevanceScore);
      return {
        messages: relevantMessages.slice(0, options.limit || 20),
        totalFound: relevantMessages.length,
        searchTime: Date.now() - startTime,
      };
    } catch {
      return { messages: [], totalFound: 0, searchTime: Date.now() - startTime };
    }
  }

  /**
   * Relevance scoring using structural counting (no regex)
   * Replaces: (text.match(new RegExp(term, 'g')) || []).length
   */
  private calculateRelevance(text: string, searchTerms: string[]): number {
    let score = 0;
    const textWords = text.split(' ');
    
    for (const term of searchTerms) {
      if (text.includes(term)) {
        score += 0.5;
        if (textWords.includes(term)) score += 0.3;
        const frequency = countOccurrences(text, term);
        score += Math.min(frequency * 0.1, 0.2);
      }
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Sync user usage - structural UUID validation (no regex)
   */
  async syncUserUsage(userId: string, usageData: any): Promise<void> {
    let resolvedUserId = userId;
    
    if (userId && userId !== 'anonymous' && !isValidUUID(userId)) {
      try {
        const userResult = await this.executeQuery({
          action: 'get', collection: 'users', filters: { username: userId },
        });
        if (userResult && userResult.length > 0) {
          resolvedUserId = userResult[0].id;
        } else {
          return;
        }
      } catch {
        return;
      }
    }

    await this.executeQuery({
      action: 'save',
      collection: 'user_usage_sync',
      data: {
        user_id: resolvedUserId,
        ai_prompts_count: usageData.aiPrompts || 0,
        image_gen_count: usageData.imageGeneration || 0,
        voice_usage_count: usageData.voiceUsage || 0,
        last_sync: new Date().toISOString(),
        ...usageData,
      },
    });
  }

  /**
   * Helper to validate UUID format (structural, no regex)
   */
  isValidUUID(str: string): boolean {
    return isValidUUID(str);
  }

  async isConnected(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch { return false; }
  }
}

// Export structural utilities for testing
export { countOccurrences, isValidUUID };

export const databaseManager = DatabaseManager.getInstance();