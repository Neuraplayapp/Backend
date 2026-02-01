/**
 * CHAT LIFECYCLE MANAGER
 * 
 * Complete chat lifecycle system with user-configurable settings:
 * 
 * LIFECYCLE STAGES:
 * 1. ACTIVE (current chats, always visible)
 * 2. COLD STORAGE (inactive but retrievable) 
 * 3. ARCHIVED (compressed, searchable)
 * 4. AUTO-DELETION (permanent removal)
 * 
 * USER CONFIGURABLE:
 * - Days until cold storage
 * - Days until archive  
 * - Days until deletion
 * - Maximum active chats (you said 5)
 */

export interface ChatLifecycleSettings {
  userId: string;
  maxActiveChats: number;          // Default: 5 (as you requested)
  daysToColdStorage: number;       // Default: 7 days
  daysToArchive: number;          // Default: 30 days  
  daysToDeletion: number;         // Default: 365 days
  enableAutoCleanup: boolean;     // Default: true
}

export interface ChatState {
  id: string;
  userId: string;
  title: string;
  messages: any[];
  lifecycle: 'active' | 'cold' | 'archived' | 'scheduled_deletion';
  lastActive: Date;
  createdAt: Date;
  movedToColdAt?: Date;
  archivedAt?: Date;
  scheduledDeletionAt?: Date;
  messageCount: number;
  hasCanvas: boolean;
  retrievalCount: number;  // How many times retrieved from cold storage
}

export class ChatLifecycleManager {
  private static instance: ChatLifecycleManager;
  private defaultSettings: ChatLifecycleSettings = {
    userId: '',
    maxActiveChats: 10,     // YOUR REQUEST: Updated to 10
    daysToColdStorage: 7,   // 1 week inactive → cold storage
    daysToArchive: 30,      // 1 month cold → archived
    daysToDeletion: 365,    // 1 year archived → deletion
    enableAutoCleanup: true
  };

  private constructor() {}

  public static getInstance(): ChatLifecycleManager {
    if (!ChatLifecycleManager.instance) {
      ChatLifecycleManager.instance = new ChatLifecycleManager();
    }
    return ChatLifecycleManager.instance;
  }

  /**
   * Get user's lifecycle settings (user-configurable!)
   */
  async getUserSettings(userId: string): Promise<ChatLifecycleSettings> {
    try {
      const databaseManager = await this.getDatabaseManager();
      
      const result = await databaseManager.executeQuery('custom', {
        query: 'SELECT * FROM chat_lifecycle_settings WHERE user_id = $1',
        params: [userId]
      });

      if (result?.data?.[0]) {
        return {
          userId,
          ...this.defaultSettings,
          ...result.data[0]
        };
      }

      // Return defaults for new users
      return { ...this.defaultSettings, userId };

    } catch (error) {
      console.error('❌ Failed to get user settings:', error);
      return { ...this.defaultSettings, userId };
    }
  }

  /**
   * Update user's lifecycle settings
   */
  async updateUserSettings(settings: ChatLifecycleSettings): Promise<boolean> {
    try {
      const databaseManager = await this.getDatabaseManager();
      
      // Create settings table if not exists
      await databaseManager.executeQuery('custom', {
        query: `
          CREATE TABLE IF NOT EXISTS chat_lifecycle_settings (
            user_id VARCHAR PRIMARY KEY,
            max_active_chats INTEGER DEFAULT 10,
            days_to_cold_storage INTEGER DEFAULT 7,
            days_to_archive INTEGER DEFAULT 30,
            days_to_deletion INTEGER DEFAULT 365,
            enable_auto_cleanup BOOLEAN DEFAULT true,
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `,
        params: []
      });

      // Upsert user settings
      await databaseManager.executeQuery('custom', {
        query: `
          INSERT INTO chat_lifecycle_settings 
          (user_id, max_active_chats, days_to_cold_storage, days_to_archive, days_to_deletion, enable_auto_cleanup)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (user_id) DO UPDATE SET
            max_active_chats = $2,
            days_to_cold_storage = $3, 
            days_to_archive = $4,
            days_to_deletion = $5,
            enable_auto_cleanup = $6,
            updated_at = NOW()
        `,
        params: [
          settings.userId,
          settings.maxActiveChats,
          settings.daysToColdStorage,
          settings.daysToArchive,
          settings.daysToDeletion,
          settings.enableAutoCleanup
        ]
      });

      console.log(`✅ Updated lifecycle settings for user ${settings.userId}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to update user settings:', error);
      return false;
    }
  }

  /**
   * Get ACTIVE chats (respecting user's maxActiveChats limit)
   */
  async getActiveChats(userId: string): Promise<ChatState[]> {
    const settings = await this.getUserSettings(userId);
    
    try {
      const databaseManager = await this.getDatabaseManager();
      
      const result = await databaseManager.executeQuery('custom', {
        query: `
          SELECT *, 'active' as lifecycle
          FROM chat_tabs 
          WHERE user_id = $1 
          AND (lifecycle IS NULL OR lifecycle = 'active')
          ORDER BY last_active DESC 
          LIMIT $2
        `,
        params: [userId, settings.maxActiveChats]
      });

      return this.mapToCharState(result?.data || []);

    } catch (error) {
      console.error('❌ Failed to get active chats:', error);
      return [];
    }
  }

  /**
   * COLD STORAGE RETRIEVAL - Get inactive but retrievable chats
   */
  async getColdStorageChats(userId: string): Promise<ChatState[]> {
    try {
      const databaseManager = await this.getDatabaseManager();
      
      const result = await databaseManager.executeQuery('custom', {
        query: `
          SELECT *, 'cold' as lifecycle
          FROM chat_tabs_cold_storage 
          WHERE user_id = $1 
          ORDER BY moved_to_cold_at DESC
        `,
        params: [userId]
      });

      console.log(`🧊 Found ${result?.data?.length || 0} chats in cold storage for user ${userId}`);
      return this.mapToCharState(result?.data || []);

    } catch (error) {
      console.error('❌ Failed to get cold storage chats:', error);
      return [];
    }
  }

  /**
   * RETRIEVE FROM COLD STORAGE - Move chat back to active
   */
  async retrieveFromColdStorage(userId: string, chatId: string): Promise<boolean> {
    console.log(`🔥 Retrieving chat ${chatId} from cold storage for user ${userId}`);
    
    try {
      const databaseManager = await this.getDatabaseManager();
      
      // Start transaction
      await databaseManager.executeQuery('custom', {
        query: 'BEGIN',
        params: []
      });

      // Move from cold storage back to active
      await databaseManager.executeQuery('custom', {
        query: `
          INSERT INTO chat_tabs 
          SELECT 
            id, user_id, title, messages, mode, canvas_mode, context, 
            created_at, NOW() as last_active, 'active' as lifecycle,
            retrieval_count + 1
          FROM chat_tabs_cold_storage 
          WHERE user_id = $1 AND id = $2
        `,
        params: [userId, chatId]
      });

      // Remove from cold storage
      await databaseManager.executeQuery('custom', {
        query: 'DELETE FROM chat_tabs_cold_storage WHERE user_id = $1 AND id = $2',
        params: [userId, chatId]
      });

      // Commit transaction
      await databaseManager.executeQuery('custom', {
        query: 'COMMIT',
        params: []
      });

      console.log(`✅ Successfully retrieved chat ${chatId} from cold storage`);
      return true;

    } catch (error) {
      console.error('❌ Failed to retrieve from cold storage:', error);
      
      // Rollback on error
      try {
        const databaseManager = await this.getDatabaseManager();
        await databaseManager.executeQuery('custom', {
          query: 'ROLLBACK',
          params: []
        });
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError);
      }
      
      return false;
    }
  }

  /**
   * LIFECYCLE MANAGEMENT - Move chats through lifecycle stages
   */
  async processLifecycleTransitions(userId: string): Promise<{
    movedToCold: number;
    archived: number;
    deleted: number;
  }> {
    const settings = await this.getUserSettings(userId);
    
    if (!settings.enableAutoCleanup) {
      console.log(`⏸️ Auto cleanup disabled for user ${userId}`);
      return { movedToCold: 0, archived: 0, deleted: 0 };
    }

    console.log(`🔄 Processing lifecycle transitions for user ${userId} with settings:`, settings);

    try {
      const databaseManager = await this.getDatabaseManager();
      
      // Create cold storage table if not exists
      await this.ensureColdStorageTable();

      // 1. ACTIVE → COLD STORAGE
      const coldResult = await databaseManager.executeQuery('custom', {
        query: `
          WITH chats_to_cold AS (
            SELECT * FROM chat_tabs 
            WHERE user_id = $1 
            AND last_active < NOW() - INTERVAL '${settings.daysToColdStorage} days'
            AND (lifecycle IS NULL OR lifecycle = 'active')
          )
          INSERT INTO chat_tabs_cold_storage 
          SELECT *, NOW() as moved_to_cold_at, 0 as retrieval_count FROM chats_to_cold;
          
          DELETE FROM chat_tabs 
          WHERE user_id = $1 
          AND last_active < NOW() - INTERVAL '${settings.daysToColdStorage} days'
          AND (lifecycle IS NULL OR lifecycle = 'active')
        `,
        params: [userId]
      });

      // 2. COLD → ARCHIVED  
      const archiveResult = await databaseManager.executeQuery('custom', {
        query: `
          INSERT INTO chat_tabs_archive
          SELECT *, NOW() as archived_at FROM chat_tabs_cold_storage
          WHERE user_id = $1 
          AND moved_to_cold_at < NOW() - INTERVAL '${settings.daysToArchive} days';
          
          DELETE FROM chat_tabs_cold_storage
          WHERE user_id = $1 
          AND moved_to_cold_at < NOW() - INTERVAL '${settings.daysToArchive} days'
        `,
        params: [userId]
      });

      // 3. ARCHIVED → DELETION
      const deleteResult = await databaseManager.executeQuery('custom', {
        query: `
          DELETE FROM chat_tabs_archive
          WHERE user_id = $1 
          AND archived_at < NOW() - INTERVAL '${settings.daysToDeletion} days'
        `,
        params: [userId]
      });

      const results = {
        movedToCold: coldResult?.affectedRows || 0,
        archived: archiveResult?.affectedRows || 0,
        deleted: deleteResult?.affectedRows || 0
      };

      console.log(`✅ Lifecycle processing completed for user ${userId}:`, results);
      return results;

    } catch (error) {
      console.error('❌ Lifecycle processing failed:', error);
      return { movedToCold: 0, archived: 0, deleted: 0 };
    }
  }

  /**
   * SEARCH ACROSS ALL LIFECYCLE STAGES
   */
  async searchAllChats(userId: string, query: string): Promise<{
    active: ChatState[];
    cold: ChatState[];
    archived: ChatState[];
  }> {
    console.log(`🔍 Searching all chats for user ${userId} with query: "${query}"`);
    
    try {
      const databaseManager = await this.getDatabaseManager();
      
      // Search active chats
      const activeResult = await databaseManager.executeQuery('custom', {
        query: `
          SELECT *, 'active' as lifecycle FROM chat_tabs 
          WHERE user_id = $1 AND (title ILIKE $2 OR messages::text ILIKE $2)
        `,
        params: [userId, `%${query}%`]
      });

      // Search cold storage
      const coldResult = await databaseManager.executeQuery('custom', {
        query: `
          SELECT *, 'cold' as lifecycle FROM chat_tabs_cold_storage 
          WHERE user_id = $1 AND (title ILIKE $2 OR messages::text ILIKE $2)
        `,
        params: [userId, `%${query}%`]
      });

      // Search archived (compressed search)
      const archivedResult = await databaseManager.executeQuery('custom', {
        query: `
          SELECT *, 'archived' as lifecycle FROM chat_tabs_archive 
          WHERE user_id = $1 AND title ILIKE $2
        `,
        params: [userId, `%${query}%`]
      });

      return {
        active: this.mapToCharState(activeResult?.data || []),
        cold: this.mapToCharState(coldResult?.data || []),
        archived: this.mapToCharState(archivedResult?.data || [])
      };

    } catch (error) {
      console.error('❌ Search failed:', error);
      return { active: [], cold: [], archived: [] };
    }
  }

  // Helper methods
  private async ensureColdStorageTable() {
    try {
      const databaseManager = await this.getDatabaseManager();
      
      await databaseManager.executeQuery('custom', {
        query: `
          CREATE TABLE IF NOT EXISTS chat_tabs_cold_storage AS TABLE chat_tabs WITH NO DATA;
          ALTER TABLE chat_tabs_cold_storage ADD COLUMN IF NOT EXISTS moved_to_cold_at TIMESTAMP DEFAULT NOW();
          ALTER TABLE chat_tabs_cold_storage ADD COLUMN IF NOT EXISTS retrieval_count INTEGER DEFAULT 0;
        `,
        params: []
      });

    } catch (error) {
      console.error('❌ Failed to ensure cold storage table:', error);
    }
  }

  private mapToCharState(rows: any[]): ChatState[] {
    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      messages: Array.isArray(row.messages) ? row.messages : JSON.parse(row.messages || '[]'),
      lifecycle: row.lifecycle || 'active',
      lastActive: new Date(row.last_active),
      createdAt: new Date(row.created_at),
      movedToColdAt: row.moved_to_cold_at ? new Date(row.moved_to_cold_at) : undefined,
      archivedAt: row.archived_at ? new Date(row.archived_at) : undefined,
      messageCount: row.message_count || 0,
      hasCanvas: row.canvas_mode || false,
      retrievalCount: row.retrieval_count || 0
    }));
  }

  private async getDatabaseManager() {
    const { serviceContainer } = await import('./ServiceContainer');
    return serviceContainer.get('databaseManager');
  }
}

// Export singleton
export const chatLifecycleManager = ChatLifecycleManager.getInstance();
