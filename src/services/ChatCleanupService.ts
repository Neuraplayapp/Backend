/**
 * CHAT CLEANUP SERVICE
 * 
 * Intelligent cleanup system that:
 * - Removes phantom/empty chats
 * - Archives old conversations
 * - Maintains database performance
 * - Prevents accumulation of ghost data
 */

import { serviceContainer } from './ServiceContainer';

export interface CleanupStats {
  phantomChatsDeleted: number;
  oldChatsArchived: number;
  totalChatsBefore: number;
  totalChatsAfter: number;
  spaceSavedMB: number;
}

export class ChatCleanupService {
  private static instance: ChatCleanupService;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  private constructor() {
    console.log('🧹 ChatCleanupService: Initialized');
  }

  public static getInstance(): ChatCleanupService {
    if (!ChatCleanupService.instance) {
      ChatCleanupService.instance = new ChatCleanupService();
    }
    return ChatCleanupService.instance;
  }

  /**
   * Start automatic cleanup (runs daily)
   */
  public startAutomaticCleanup() {
    if (this.cleanupInterval) {
      return; // Already running
    }

    // Run cleanup daily at 2 AM
    const runDaily = () => {
      const now = new Date();
      const next2AM = new Date();
      next2AM.setHours(2, 0, 0, 0);
      
      if (next2AM < now) {
        next2AM.setDate(next2AM.getDate() + 1);
      }
      
      const msUntil2AM = next2AM.getTime() - now.getTime();
      
      setTimeout(() => {
        this.runFullCleanup();
        // Set daily interval
        this.cleanupInterval = setInterval(() => {
          this.runFullCleanup();
        }, 24 * 60 * 60 * 1000);
      }, msUntil2AM);
    };

    runDaily();
    console.log('🕐 ChatCleanupService: Scheduled daily cleanup at 2 AM');
  }

  /**
   * Run comprehensive cleanup
   */
  public async runFullCleanup(): Promise<CleanupStats> {
    if (this.isRunning) {
      console.log('⚠️ Cleanup already in progress, skipping...');
      return {
        phantomChatsDeleted: 0,
        oldChatsArchived: 0,
        totalChatsBefore: 0,
        totalChatsAfter: 0,
        spaceSavedMB: 0
      };
    }

    this.isRunning = true;
    console.log('🧹 ChatCleanupService: Starting comprehensive cleanup...');

    try {
      const databaseManager = serviceContainer.get('databaseManager') as any;
      
      if (!databaseManager) {
        console.error('❌ DatabaseManager not available');
        return this.getEmptyStats();
      }

      // Get initial count
      const initialCount = await this.getTotalChatCount();

      // 1. Remove completely empty chats (no messages)
      const phantomResult = await this.removePhantomChats();

      // 2. Remove test/debug chats (very short, low engagement)
      const testResult = await this.removeTestChats();

      // 3. Archive very old chats (older than 6 months, unless meaningful)
      const archiveResult = await this.archiveOldChats();

      // 4. Compress large message histories (keep only recent messages)
      const compressionResult = await this.compressLargeHistories();

      // Get final count
      const finalCount = await this.getTotalChatCount();

      const stats: CleanupStats = {
        phantomChatsDeleted: phantomResult.deleted + testResult.deleted,
        oldChatsArchived: archiveResult.archived,
        totalChatsBefore: initialCount,
        totalChatsAfter: finalCount,
        spaceSavedMB: this.estimateSpaceSaved(
          phantomResult.deleted + testResult.deleted,
          compressionResult.messagesCompressed
        )
      };

      console.log('✅ ChatCleanupService: Cleanup completed', stats);
      return stats;

    } catch (error) {
      console.error('❌ ChatCleanupService: Cleanup failed:', error);
      return this.getEmptyStats();
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Remove completely empty chats
   */
  private async removePhantomChats(): Promise<{ deleted: number }> {
    try {
      const databaseManager = serviceContainer.get('databaseManager') as any;
      
      const result = await databaseManager.executeQuery('custom', {
        query: `
          DELETE FROM chat_tabs 
          WHERE (
            messages = '[]'::jsonb OR 
            messages IS NULL OR 
            jsonb_array_length(messages) = 0
          ) AND created_at < NOW() - INTERVAL '24 hours'
        `,
        params: []
      });

      console.log(`🗑️ Removed ${result?.affectedRows || 0} phantom chats`);
      return { deleted: result?.affectedRows || 0 };

    } catch (error) {
      console.error('❌ Failed to remove phantom chats:', error);
      return { deleted: 0 };
    }
  }

  /**
   * Remove test/debug chats (very short, low engagement)
   */
  private async removeTestChats(): Promise<{ deleted: number }> {
    try {
      const databaseManager = serviceContainer.get('databaseManager') as any;
      
      const result = await databaseManager.executeQuery('custom', {
        query: `
          DELETE FROM chat_tabs 
          WHERE (
            jsonb_array_length(messages) = 1 AND
            created_at < NOW() - INTERVAL '7 days' AND
            (title ILIKE '%test%' OR title ILIKE '%debug%' OR title = 'Untitled Chat')
          )
        `,
        params: []
      });

      console.log(`🧪 Removed ${result?.affectedRows || 0} test/debug chats`);
      return { deleted: result?.affectedRows || 0 };

    } catch (error) {
      console.error('❌ Failed to remove test chats:', error);
      return { deleted: 0 };
    }
  }

  /**
   * Archive very old chats (move to archive table)
   */
  private async archiveOldChats(): Promise<{ archived: number }> {
    try {
      const databaseManager = serviceContainer.get('databaseManager') as any;

      // Create archive table if it doesn't exist
      await databaseManager.executeQuery('custom', {
        query: `
          CREATE TABLE IF NOT EXISTS chat_tabs_archive AS TABLE chat_tabs WITH NO DATA;
          ALTER TABLE chat_tabs_archive ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP DEFAULT NOW();
        `,
        params: []
      });

      // Move old, non-meaningful chats to archive
      const archiveResult = await databaseManager.executeQuery('custom', {
        query: `
          WITH old_chats AS (
            SELECT * FROM chat_tabs 
            WHERE last_active < NOW() - INTERVAL '6 months'
            AND jsonb_array_length(messages) < 3
            AND canvas_mode = false
          ),
          inserted AS (
            INSERT INTO chat_tabs_archive 
            SELECT *, NOW() as archived_at FROM old_chats
            RETURNING id
          )
          DELETE FROM chat_tabs 
          WHERE id IN (SELECT id FROM old_chats)
        `,
        params: []
      });

      console.log(`📦 Archived ${archiveResult?.affectedRows || 0} old chats`);
      return { archived: archiveResult?.affectedRows || 0 };

    } catch (error) {
      console.error('❌ Failed to archive old chats:', error);
      return { archived: 0 };
    }
  }

  /**
   * Compress large message histories
   */
  private async compressLargeHistories(): Promise<{ messagesCompressed: number }> {
    try {
      const databaseManager = serviceContainer.get('databaseManager') as any;

      // Find chats with excessive message histories (>200 messages)
      const largeChats = await databaseManager.executeQuery('custom', {
        query: `
          SELECT id, messages 
          FROM chat_tabs 
          WHERE jsonb_array_length(messages) > 200
        `,
        params: []
      });

      if (!largeChats?.data || largeChats.data.length === 0) {
        return { messagesCompressed: 0 };
      }

      let totalCompressed = 0;

      for (const chat of largeChats.data) {
        const messages = JSON.parse(chat.messages);
        const originalCount = messages.length;
        
        // Keep only the last 100 messages
        const compressedMessages = messages.slice(-100);
        
        await databaseManager.executeQuery('custom', {
          query: `
            UPDATE chat_tabs 
            SET messages = $1::jsonb 
            WHERE id = $2
          `,
          params: [JSON.stringify(compressedMessages), chat.id]
        });

        totalCompressed += originalCount - compressedMessages.length;
      }

      console.log(`🗜️ Compressed ${totalCompressed} messages from ${largeChats.data.length} chats`);
      return { messagesCompressed: totalCompressed };

    } catch (error) {
      console.error('❌ Failed to compress message histories:', error);
      return { messagesCompressed: 0 };
    }
  }

  /**
   * Get total chat count
   */
  private async getTotalChatCount(): Promise<number> {
    try {
      const databaseManager = serviceContainer.get('databaseManager') as any;
      
      const result = await databaseManager.executeQuery('custom', {
        query: 'SELECT COUNT(*) as total FROM chat_tabs',
        params: []
      });

      return parseInt(result?.data?.[0]?.total || '0');

    } catch (error) {
      console.error('❌ Failed to get chat count:', error);
      return 0;
    }
  }

  /**
   * Estimate space saved in MB
   */
  private estimateSpaceSaved(chatsDeleted: number, messagesCompressed: number): number {
    // Rough estimates:
    // - Average chat: 50KB
    // - Average message: 500 bytes
    const chatSpace = chatsDeleted * 0.05; // MB
    const messageSpace = messagesCompressed * 0.0005; // MB
    return Math.round((chatSpace + messageSpace) * 100) / 100;
  }

  private getEmptyStats(): CleanupStats {
    return {
      phantomChatsDeleted: 0,
      oldChatsArchived: 0,
      totalChatsBefore: 0,
      totalChatsAfter: 0,
      spaceSavedMB: 0
    };
  }

  /**
   * Manual cleanup for specific user
   */
  public async cleanupUserChats(userId: string): Promise<CleanupStats> {
    console.log(`🧹 Running manual cleanup for user: ${userId}`);
    
    try {
      const databaseManager = serviceContainer.get('databaseManager') as any;
      
      const result = await databaseManager.executeQuery('custom', {
        query: `
          DELETE FROM chat_tabs 
          WHERE user_id = $1 
          AND (
            messages = '[]'::jsonb OR 
            messages IS NULL OR 
            (created_at < NOW() - INTERVAL '30 days' AND jsonb_array_length(messages) < 2)
          )
        `,
        params: [userId]
      });

      const stats: CleanupStats = {
        phantomChatsDeleted: result?.affectedRows || 0,
        oldChatsArchived: 0,
        totalChatsBefore: 0,
        totalChatsAfter: 0,
        spaceSavedMB: this.estimateSpaceSaved(result?.affectedRows || 0, 0)
      };

      console.log(`✅ User cleanup completed for ${userId}:`, stats);
      return stats;

    } catch (error) {
      console.error(`❌ User cleanup failed for ${userId}:`, error);
      return this.getEmptyStats();
    }
  }

  public stopAutomaticCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    console.log('🛑 ChatCleanupService: Automatic cleanup stopped');
  }
}

// Export singleton instance
export const chatCleanupService = ChatCleanupService.getInstance();

