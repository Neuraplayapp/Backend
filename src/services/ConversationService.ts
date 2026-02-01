// Unified Conversation Service - Failsafe Chat + Canvas Memory
// Handles both chat messages and canvas elements in unified threads
import { DatabaseManager } from './DatabaseManager';
import { logger } from '../utils/Logger';
import type { ConversationData } from './DatabaseService';
import { EventBus } from './ServiceContainer';
import { storageManager } from '../utils/storageManager';

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  toolResults?: any[];
  canvasElements?: string[]; // IDs of canvas elements created
}

export interface CanvasElement {
  id: string;
  type: 'chart' | 'document' | 'code';
  title: string;
  content: any;
  createdAt: Date;
  conversationId: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  canvasElements: CanvasElement[];
  createdAt: Date;
  updatedAt: Date;
  isPinned?: boolean;
  // NEW: Smart categorization for UI
  isRecent?: boolean;        // Within last 7 days
  isMeaningful?: boolean;    // Has substantial content (3+ messages)
  hasCanvas?: boolean;       // Contains canvas elements
  chatAge?: 'new' | 'recent' | 'old';
  messageCount?: number;
}

class ConversationService {
  private conversations: Map<string, Conversation> = new Map();
  private activeConversationId: string | null = null;
  private storageKey = 'neuraplay_conversations';
  private databaseManager: DatabaseManager;
  private currentUserId: string | null = null;
  private syncTimeout: NodeJS.Timeout | null = null;
  private lastSyncAttempt: number = 0;
  private syncCooldown: number = 5000; // 5 second cooldown between sync attempts
  private isCreatingConversation: boolean = false; // ADDED: Prevent creation loops
  private lastFullSyncTime: number = 0; // Track when we last did a full sync
  private eventBus: EventBus; // Event emission for reactive UI updates

  constructor() {
    this.databaseManager = DatabaseManager.getInstance();
    this.eventBus = EventBus.getInstance();
    
    // CRITICAL: Load deletion blacklist FIRST
    this.loadDeletedList();
    
    // CRITICAL: Clear old conversation format to prevent UUID validation errors
    this.migrateOldConversationData();
    
    // EMERGENCY: Detect corrupted state and clear immediately
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data?.conversations && Array.isArray(data.conversations)) {
          // Check for excessive conversations
          if (data.conversations.length > 50) {
            console.warn('🚨 ConversationService: Detected excessive conversations (>50), clearing corrupted data');
            this.emergencyClearAndStart();
            return;
          }
          
          // Check for excessive messages in any conversation
          const hasExcessiveMessages = data.conversations.some(([id, conv]: [string, any]) => {
            return conv?.messages?.length > 1000; // If any conversation has >1000 messages, clear
          });
          
          if (hasExcessiveMessages) {
            console.warn('🚨 ConversationService: Detected conversation with excessive messages (>1000), clearing corrupted data');
            this.emergencyClearAndStart();
            return;
          }
        }
      } catch (e) {
        console.warn('🚨 ConversationService: Corrupted localStorage detected, clearing');
        this.emergencyClearAndStart();
        return;
      }
    }
    
    // PREVENTIVE CHECK: Validate localStorage before any component can try to read it
    this.validateAndCleanLocalStorage();
    
    try {
      this.loadFromStorage();
    } catch (error) {
      console.error('❌ ConversationService: Constructor failed to load from storage, clearing all and starting fresh:', error);
      this.emergencyClearAndStart();
    }

    // Additional safety: Set up error listener for future localStorage corruption
    window.addEventListener('error', (event) => {
      if (event.message && event.message.includes('Cannot read properties of undefined') && event.message.includes('map')) {
        console.error('🚨 ConversationService: Detected localStorage corruption, emergency clearing...');
        this.emergencyClearAndStart();
      }
    });

    // 🔧 FIX: Sync to database before user navigates away
    window.addEventListener('beforeunload', () => {
      if (this.currentUserId && this.activeConversationId) {
        console.log('💾 ConversationService: Syncing before page unload...');
        this.syncWithDatabase();
      }
    });

    // 🔧 FIX: Also sync on visibility change (tab switch, minimize)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this.currentUserId && this.activeConversationId) {
        console.log('💾 ConversationService: Syncing on visibility hidden...');
        this.syncWithDatabase();
      }
    });
  }

  // CRITICAL: AGGRESSIVE migration to clear ALL old conversation data
  private migrateOldConversationData(): void {
    try {
      console.log('🧹 ConversationService: Starting AGGRESSIVE migration to clear old conv_ format data...');
      
      // STEP 1: Clear ALL conversation-related localStorage keys
      const keysToCheck = [
        'neuraplay_conversations',
        'neuraplay-conversations', 
        'conversations',
        'neuraplay_active_conversation',
        'neuraplay-active-conversation',
        'neuraplay_chat_memory',
        'neuraplay-chat-memory',
        'activeConversationId',
        'currentConversation'
      ];
      
      let foundOldData = false;
      
      // Check and clear all potential storage keys
      keysToCheck.forEach(key => {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            // Check if it contains old conv_ format
            if (stored.includes('conv_') && !this.isValidUUID(stored.replace(/["']/g, ''))) {
              console.warn(`🧹 Found old conversation data in ${key}:`, stored.substring(0, 100) + '...');
              localStorage.removeItem(key);
              foundOldData = true;
            }
          }
        } catch (e) {
          // If parsing fails, clear it anyway
          localStorage.removeItem(key);
          foundOldData = true;
        }
      });
      
      // STEP 2: Check this.storageKey specifically 
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        try {
          const data = JSON.parse(stored);
          let hasOldFormat = false;
          
          // Check conversations object
          if (data.conversations) {
            Object.keys(data.conversations).forEach((id: string) => {
              if (id.startsWith('conv_') && !this.isValidUUID(id)) {
                console.warn(`🧹 Found old conversation ID: ${id}`);
                hasOldFormat = true;
              }
            });
          }
          
          // Check active conversation ID
          if (data.activeConversationId && data.activeConversationId.startsWith('conv_')) {
            console.warn(`🧹 Found old active conversation ID: ${data.activeConversationId}`);
            hasOldFormat = true;
          }
          
          // Check for any conv_ strings in the entire storage
          if (stored.includes('conv_')) {
            console.warn('🧹 Found conv_ references in storage data');
            hasOldFormat = true;
          }
          
          if (hasOldFormat) {
            console.log('🧹 Clearing main conversation storage due to old format detection');
            localStorage.removeItem(this.storageKey);
            foundOldData = true;
          }
          
        } catch (error) {
          console.error('🧹 Error parsing stored data, clearing:', error);
          localStorage.removeItem(this.storageKey);
          foundOldData = true;
        }
      }
      
      // STEP 3: Force cache version update to ensure fresh start
      const cacheVersion = localStorage.getItem('neuraplay_cache_version');
      const requiredVersion = '2025.01.31.uuid.fix';
      
      if (cacheVersion !== requiredVersion) {
        console.log('🔄 Cache version mismatch, forcing complete localStorage reset...');
        // Clear ALL neuraplay-related localStorage
        Object.keys(localStorage).forEach(key => {
          if (key.toLowerCase().includes('neuraplay') || key.toLowerCase().includes('conv_')) {
            localStorage.removeItem(key);
          }
        });
        localStorage.setItem('neuraplay_cache_version', requiredVersion);
        foundOldData = true;
      }
      
      if (foundOldData) {
        console.log('✅ ConversationService: Aggressive migration completed - all old conversation data cleared');
        // Force page reload after clearing to ensure fresh state
        setTimeout(() => {
          console.log('🔄 ConversationService: Scheduling page reload to ensure fresh state...');
          if (typeof window !== 'undefined' && window.location) {
            // Only reload if we're in browser environment
            window.location.reload();
          }
        }, 1000);
      } else {
        console.log('✅ ConversationService: No old conversation data found - migration not needed');
      }
      
    } catch (error) {
      console.error('🚨 ConversationService: Critical error during migration, emergency clear:', error);
      // Emergency: Clear everything
      Object.keys(localStorage).forEach(key => {
        if (key.toLowerCase().includes('neuraplay') || key.toLowerCase().includes('conv_')) {
          localStorage.removeItem(key);
        }
      });
    }
  }

  // Helper to validate UUID format
  private isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  // EMERGENCY: Immediate corruption check and clear
  private emergencyLocalStorageCheck(): void {
    try {
      const keys = ['neuraplay_conversations', 'neuraplay-conversations', 'conversations'];
      for (const key of keys) {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const data = JSON.parse(stored);
            // Check for patterns that cause map() errors
            if (data && data.conversations) {
              if (typeof data.conversations === 'object' && !Array.isArray(data.conversations)) {
                const entries = Object.values(data.conversations);
                for (const entry of entries) {
                  if (entry && typeof entry === 'object' && 'messages' in entry) {
                    if (!Array.isArray((entry as any).messages)) {
                      logger.warn('Found corrupted messages in localStorage, clearing', 'ConversationService');
                      localStorage.removeItem(key);
                      break;
                    }
                  }
                }
              }
            }
          } catch (parseError) {
            logger.warn('Corrupted localStorage JSON, clearing', 'ConversationService');
            localStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('🚨 ConversationService: Emergency check failed, clearing all localStorage');
      localStorage.clear();
    }
  }

  // PREVENTIVE validation to catch corruption before components try to read
  private validateAndCleanLocalStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return; // No data, nothing to validate
      
      const data = JSON.parse(stored);
      if (!data || typeof data !== 'object') {
        logger.warn('Preventive clear - invalid data structure', 'ConversationService');
        this.emergencyClearAndStart();
        return;
      }
      
      // Check conversations structure
      if (data.conversations) {
        let conversationsArray: Array<[string, any]> = [];
        
        if (Array.isArray(data.conversations)) {
          conversationsArray = data.conversations;
        } else if (typeof data.conversations === 'object') {
          conversationsArray = Object.entries(data.conversations);
        } else {
          logger.warn('Preventive clear - invalid conversations format', 'ConversationService');
          this.emergencyClearAndStart();
          return;
        }
        
        // Validate each conversation has required structure
        for (const [id, conv] of conversationsArray) {
          if (!conv || typeof conv !== 'object') {
            logger.warn('Preventive clear - invalid conversation object', 'ConversationService');
            this.emergencyClearAndStart();
            return;
          }
          
          // Check messages structure - this is where the map error happens
          if (conv.messages !== undefined && !Array.isArray(conv.messages)) {
            logger.warn('Preventive clear - messages is not an array', 'ConversationService');
            this.emergencyClearAndStart();
            return;
          }
          
          // Check canvasElements structure  
          if (conv.canvasElements !== undefined && !Array.isArray(conv.canvasElements)) {
            logger.warn('Preventive clear - canvasElements is not an array', 'ConversationService');
            this.emergencyClearAndStart();
            return;
          }
        }
      }
      
      logger.debug('Preventive validation passed', 'ConversationService');
    } catch (error) {
      logger.warn('Preventive validation failed, clearing localStorage', 'ConversationService');
      this.emergencyClearAndStart();
    }
  }

  private emergencyClearAndStart(): void {
    logger.warn('Emergency localStorage clear', 'ConversationService');
    try {
      // Clear all related localStorage items
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem('neuraplay-conversations');
      localStorage.removeItem('neuraplay_conversations');
      localStorage.removeItem('conversations');
      
      // Nuclear option: Clear all localStorage if corruption persists
      logger.warn('Clearing ALL localStorage as safety measure', 'ConversationService');
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
    
    this.conversations.clear();
    this.activeConversationId = null;
    this.createDefaultConversation();
  }

  // Set current user for database operations
  setCurrentUser(userId: string) {
    this.currentUserId = userId;
    logger.debug('Set user', 'ConversationService', { userId });
    
    // FIXED: Debounced database sync to prevent spam
    this.debouncedSyncWithDatabase();
  }

  // Debounced sync to prevent spam
  private debouncedSyncWithDatabase() {
    // Clear any existing timeout
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    
    // Check cooldown period to prevent rapid-fire syncs
    const now = Date.now();
    if (now - this.lastSyncAttempt < this.syncCooldown) {
      logger.verbose('Sync on cooldown, scheduling for later', 'ConversationService');
      this.syncTimeout = setTimeout(() => this.syncWithDatabase(), this.syncCooldown);
      return;
    }
    
    // Schedule sync after a short delay to batch multiple changes
    this.syncTimeout = setTimeout(() => this.syncWithDatabase(), 1000);
  }

  // Sync conversations with database
  private async syncWithDatabase() {
    if (!this.currentUserId) return;
    
    this.lastSyncAttempt = Date.now();
    
    try {
      logger.verbose('Syncing with database', 'ConversationService');
      
      // Check if database is available first
      const dbStatus = await this.checkDatabaseAvailability();
      if (!dbStatus.available) {
        logger.warn('Database unavailable, using localStorage only', 'ConversationService');
        return;
      }
      
      // SMART SYNC: Priority-based conversation syncing
      let syncCount = 0;
      const maxSyncPerBatch = 10; // EMERGENCY FIX: Increase batch size to reduce chatter
      const totalConversations = this.conversations.size;
      const now = Date.now();
      const FULL_SYNC_INTERVAL = 5 * 60 * 1000; // Full sync every 5 minutes
      
      // Determine if we need a full sync or just recent changes
      const needsFullSync = (now - this.lastFullSyncTime) > FULL_SYNC_INTERVAL;
      
      if (needsFullSync) {
        logger.debug('Performing full sync', 'ConversationService');
        this.lastFullSyncTime = now;
      }
      
      // Get conversations sorted by recency (most recently updated first)
      const sortedConversations = Array.from(this.conversations.values())
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      
      // SMART SYNC: Only sync recently changed or if full sync needed
      const recentChangeThreshold = now - (10 * 60 * 1000); // 10 minutes
      
      for (const conversation of sortedConversations) {
        if (syncCount >= maxSyncPerBatch) {
          // EMERGENCY FIX: More informative logging
          const remaining = sortedConversations.length - syncCount;
          if (remaining > 5) { // Only log if significant backlog
            logger.verbose(`Batch complete (${syncCount} synced, ${remaining} remaining for next batch)`, 'ConversationService');
          }
          break;
        }
        
        // SMART SYNC: Skip old conversations unless doing full sync
        const isRecentlyUpdated = conversation.updatedAt.getTime() > recentChangeThreshold;
        if (!needsFullSync && !isRecentlyUpdated) {
          continue; // Skip old conversations during incremental sync
        }
        
        await this.saveConversationToDatabase(conversation);
        syncCount++;
      }
      
      // EMERGENCY FIX: Cleaner logging
      if (syncCount > 0) {
        const syncType = needsFullSync ? 'full' : 'incremental';
        logger.debug(`${syncType} sync completed (${syncCount}/${totalConversations} conversations)`, 'ConversationService');
      }
      
      // Load any conversations from database that we don't have locally
      await this.loadConversationsFromDatabase();
      
      logger.verbose('Database sync complete', 'ConversationService');
    } catch (error) {
      console.error('❌ ConversationService: Database sync failed', error);
      // Don't retry immediately - let the cooldown handle it
    }
  }

  // Check database availability without spamming
  private async checkDatabaseAvailability(): Promise<{ available: boolean; reason?: string }> {
    try {
      // Simple ping to database without full sync
      await this.databaseManager.executeQuery({
        action: 'get',
        collection: 'conversations',
        data: { limit: 1 }
      });
      
      return { available: true };
    } catch (error) {
      return { 
        available: false, 
        reason: error instanceof Error ? error.message : 'Unknown database error'
      };
    }
  }

  // === CONVERSATION MANAGEMENT ===
  
  // ADDED: Manual clear method for recovery from corruption
  clearAllConversations(): void {
    logger.info('Manually clearing all conversations', 'ConversationService');
    this.conversations.clear();
    this.activeConversationId = null;
    this.isCreatingConversation = false;
    
    // Clear ALL conversation-related localStorage keys
    const keysToRemove = [
      this.storageKey,
      'neuraplay-conversations', 
      'conversations',
      'neuraplay_active_conversation',
      'neuraplay_session'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      logger.debug(`Cleared localStorage key: ${key}`, 'ConversationService');
    });
    
    this.createNewConversation('Fresh Start');
  }
  
  createNewConversation(title?: string): Conversation {
    // ADDED: Prevent creation loops
    if (this.isCreatingConversation) {
      console.warn('🚨 ConversationService: Conversation creation already in progress, returning first available');
      const firstConv = Array.from(this.conversations.values())[0];
      if (firstConv) return firstConv;
    }

    this.isCreatingConversation = true;
    
    // Generate proper UUID v4 format for database compatibility
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    
    const conversation: Conversation = {
      id: generateUUID(),
      title: title || 'New Chat',
      messages: [],
      canvasElements: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.conversations.set(conversation.id, conversation);
    this.activeConversationId = conversation.id;
    this.saveToStorage();
    
    this.isCreatingConversation = false; // Reset flag
    
    logger.debug('Created new conversation', 'ConversationService', { id: conversation.id });
    
    // 🌟 Emit event for proactive greeting system
    console.log('🔔 ConversationService: DISPATCHING conversation-created EVENT', {
      conversationId: conversation.id,
      title: conversation.title
    });
    
    window.dispatchEvent(new CustomEvent('conversation-created', {
      detail: { conversationId: conversation.id }
    }));
    
    console.log('✅ ConversationService: conversation-created event dispatched');
    
    return conversation;
  }

  getActiveConversation(): Conversation {
    // FIXED: Don't create conversations during getter calls - this caused render loops
    if (!this.activeConversationId || !this.conversations.has(this.activeConversationId)) {
      // If no conversations exist at all, create a default one
      if (this.conversations.size === 0) {
        logger.debug('No conversations exist, creating first conversation', 'ConversationService');
        return this.createNewConversation('Welcome Chat');
      }
      
      // Otherwise, use the first available conversation
      const firstConversation = Array.from(this.conversations.values())[0];
      this.activeConversationId = firstConversation.id;
      logger.debug('Using first available conversation', 'ConversationService', { id: firstConversation.id });
      return firstConversation;
    }
    return this.conversations.get(this.activeConversationId)!;
  }

  switchToConversation(conversationId: string): Conversation | null {
    if (this.conversations.has(conversationId)) {
      this.activeConversationId = conversationId;
      logger.debug('Switched to conversation', 'ConversationService', { conversationId });
      return this.conversations.get(conversationId)!;
    }
    return null;
  }

  // Get conversation by ID without switching active context
  getConversation(conversationId: string): Conversation | null {
    return this.conversations.get(conversationId) || null;
  }

  getAllConversations(): Conversation[] {
    return Array.from(this.conversations.values())
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  deleteConversation(conversationId: string): boolean {
    if (this.conversations.has(conversationId)) {
      console.log('🗑️ ConversationService: Deleting conversation:', conversationId);
      
      // STEP 1: Remove from memory
      this.conversations.delete(conversationId);
      
      // STEP 2: Add to deletion blacklist to prevent database resurrection
      this.addToDeletedList(conversationId);
      
      // STEP 3: If we deleted the active conversation, create a new one
      if (this.activeConversationId === conversationId) {
        this.activeConversationId = null; // Clear first
        this.createNewConversation();
      }
      
      // STEP 4: Save to localStorage immediately
      this.saveToStorage();
      
      // STEP 5: Force database sync to remove from database
      if (this.currentUserId) {
        this.deleteFromDatabase(conversationId);
      }
      
      console.log('✅ ConversationService: Conversation deletion completed');
      return true;
    }
    console.warn('⚠️ ConversationService: Attempted to delete non-existent conversation:', conversationId);
    return false;
  }

  // FIXED: Track deleted conversations to prevent resurrection
  private deletedConversations: Set<string> = new Set();
  
  private addToDeletedList(conversationId: string): void {
    this.deletedConversations.add(conversationId);
    // Persist the deletion list
    try {
      const deletedList = Array.from(this.deletedConversations);
      localStorage.setItem('neuraplay_deleted_conversations', JSON.stringify(deletedList));
      console.log('🗑️ Added to deletion blacklist:', conversationId);
    } catch (error) {
      console.error('❌ Failed to save deletion blacklist:', error);
    }
  }
  
  private loadDeletedList(): void {
    try {
      const stored = localStorage.getItem('neuraplay_deleted_conversations');
      if (stored) {
        const deletedList = JSON.parse(stored);
        this.deletedConversations = new Set(deletedList);
        console.log('📋 Loaded deletion blacklist:', deletedList.length, 'entries');
      }
    } catch (error) {
      console.error('❌ Failed to load deletion blacklist:', error);
      this.deletedConversations = new Set();
    }
  }
  
  private async deleteFromDatabase(conversationId: string): Promise<void> {
    try {
      await this.databaseManager.executeQuery({
        action: 'delete',
        collection: 'conversations',
        key: conversationId,
        filters: { userId: this.currentUserId }
      });
      console.log('🗄️ Deleted from database:', conversationId);
    } catch (error) {
      console.error('❌ Failed to delete from database:', error);
    }
  }

  // === MESSAGE MANAGEMENT ===

  addMessage(message: Omit<ChatMessage, 'id'>): ChatMessage {
    const conversation = this.getActiveConversation();
    
    const fullMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...message
    };

    conversation.messages.push(fullMessage);
    conversation.updatedAt = new Date();
    
    // Auto-update title based on first user message
    if (message.isUser && conversation.messages.length === 1) {
      conversation.title = this.generateConversationTitle(message.text);
    }
    
    // Also update if it's still the default title (handles both "New Chat" and "Session {id}" formats)
    if (message.isUser && message.text.trim() && 
        (conversation.title === 'New Chat' || conversation.title.startsWith('Session '))) {
      conversation.title = this.generateConversationTitle(message.text);
    }

    // 🔧 FIX: Use immediate sync for messages - critical data that must not be lost
    this.saveToStorage(true);
    logger.verbose('Added message', 'ConversationService', { conversationId: conversation.id, totalMessages: conversation.messages.length });
    
    // CRITICAL FIX: Verify the message was actually saved
    const savedConversation = this.getActiveConversation();
    if (savedConversation.messages.length !== conversation.messages.length) {
      console.error('❌ ConversationService: Message save verification failed!');
    }
    
    // REACTIVE FIX: Emit event for immediate UI updates
    this.eventBus.emitAsync('conversation-updated', {
      conversationId: conversation.id,
      message: fullMessage,
      totalMessages: conversation.messages.length,
      timestamp: Date.now()
    });
    // Emitted conversation-updated event
    
    return fullMessage;
  }

  // === CANVAS INTEGRATION ===

  addCanvasElement(element: Omit<CanvasElement, 'id' | 'conversationId' | 'createdAt'>): CanvasElement {
    const conversation = this.getActiveConversation();
    
    const fullElement: CanvasElement = {
      id: `canvas_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId: conversation.id,
      createdAt: new Date(),
      ...element
    };

    conversation.canvasElements.push(fullElement);
    conversation.updatedAt = new Date();

    // DON'T auto-add message - ToolCallingHandler creates LLM-generated message

    this.saveToStorage();
    logger.debug('Added canvas element + message', 'ConversationService', { conversationId: conversation.id });
    return fullElement;
  }

  private createCanvasMessage(element: CanvasElement): ChatMessage {
    const icons = { chart: '📊', document: '📄', code: '💻' };
    const types = { chart: 'chart', document: 'document', code: 'code editor' };
    
    return {
      id: `msg_canvas_${element.id}`,
      text: `${icons[element.type]} **${element.title}**\n\nCreated ${types[element.type]} - visible in canvas panel.`,
      isUser: false,
      timestamp: element.createdAt,
      canvasElements: [element.id]
    };
  }

  getCanvasElements(): CanvasElement[] {
    const conversation = this.getActiveConversation();
    return conversation.canvasElements;
  }

  // === SEARCH FUNCTIONALITY ===

  searchConversations(query: string): Conversation[] {
    const lowercaseQuery = query.toLowerCase();
    
    return this.getAllConversations().filter(conv => {
      // Search in title
      if (conv.title.toLowerCase().includes(lowercaseQuery)) return true;
      
      // Search in messages
      const hasMessageMatch = conv.messages.some(msg => 
        msg.text.toLowerCase().includes(lowercaseQuery)
      );
      if (hasMessageMatch) return true;
      
      // Search in canvas elements
      const hasCanvasMatch = conv.canvasElements.some(el => 
        el.title.toLowerCase().includes(lowercaseQuery) ||
        JSON.stringify(el.content).toLowerCase().includes(lowercaseQuery)
      );
      
      return hasCanvasMatch;
    });
  }

  // === DATABASE INTEGRATION ===

  private async saveConversationToDatabase(conversation: Conversation): Promise<void> {
    if (!this.currentUserId) return;

    try {
      // Convert to database format
      const conversationData: ConversationData = {
        id: conversation.id,
        userId: this.currentUserId,
        messages: conversation.messages.map(msg => ({
          id: msg.id,
          content: msg.text,
          role: msg.isUser ? 'user' : 'assistant',
          timestamp: msg.timestamp,
          toolResults: msg.toolResults,
          canvasElements: msg.canvasElements
        })),
        metadata: {
          mode: 'unified',
          toolsUsed: conversation.canvasElements.map(el => el.type),
          sessionDuration: conversation.updatedAt.getTime() - conversation.createdAt.getTime()
        },
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      };

      await this.databaseManager.executeQuery({
        action: 'save',
        collection: 'conversations',
        data: conversationData
      });

      // Canvas elements are already saved within conversations table (no separate table needed)

      logger.verbose('Saved to database', 'ConversationService', { conversationId: conversation.id });
    } catch (error) {
      console.error('❌ ConversationService: Failed to save to database', error);
    }
  }

  private async loadConversationsFromDatabase(): Promise<void> {
    if (!this.currentUserId) return;

    try {
      const response = await this.databaseManager.executeQuery({
        action: 'get',
        collection: 'conversations',
        data: { userId: this.currentUserId }
      });

      if (response.success && response.data) {
        const conversations = Array.isArray(response.data) ? response.data : [response.data];
        
        for (const conv of conversations) {
          // CRITICAL FIX: Skip deleted conversations to prevent resurrection
          if (this.deletedConversations.has(conv.id)) {
            console.log('🗑️ Skipping deleted conversation from database:', conv.id);
            continue;
          }
          
          if (!this.conversations.has(conv.id)) {
            // Convert from database format with MESSAGE LIMITING to prevent browser freeze
            const allMessages = conv.messages || [];
            const MESSAGE_LIMIT = 50; // Only load recent 50 messages to prevent performance issues
            const limitedMessages = allMessages.slice(-MESSAGE_LIMIT); // Get the most recent messages
            
            if (allMessages.length > MESSAGE_LIMIT) {
              console.warn(`🚨 ConversationService: Conversation ${conv.id} has ${allMessages.length} messages, limiting to ${MESSAGE_LIMIT} for performance`);
            }
            
            // SMART CATEGORIZATION
            const now = new Date();
            const createdAt = new Date(conv.createdAt);
            const updatedAt = new Date(conv.updatedAt);
            const daysSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
            const messageCount = allMessages.length;
            const hasCanvas = (conv.canvasElements && conv.canvasElements.length > 0);

            let chatAge: 'new' | 'recent' | 'old' = 'old';
            if (daysSinceUpdate <= 1) chatAge = 'new';
            else if (daysSinceUpdate <= 7) chatAge = 'recent';

            const conversation: Conversation = {
              id: conv.id,
              title: conv.messages[0]?.content.slice(0, 50) + '...' || 'Database Chat',
              messages: limitedMessages.map((msg: any) => ({
                id: msg.id,
                text: msg.content,
                isUser: msg.role === 'user',
                timestamp: new Date(msg.timestamp),
                toolResults: msg.toolResults,
                canvasElements: msg.canvasElements
              })),
              canvasElements: [], // Will be loaded separately
              createdAt,
              updatedAt,
              // Smart categorization metadata
              isRecent: daysSinceUpdate <= 7,
              isMeaningful: messageCount >= 3,
              hasCanvas,
              chatAge,
              messageCount
            };

            this.conversations.set(conversation.id, conversation);
          }
        }

        logger.debug('Loaded from database', 'ConversationService', { count: conversations.length });
      }
    } catch (error) {
      console.error('❌ ConversationService: Failed to load from database', error);
    }
  }

  // === PERSISTENCE ===

  private saveToStorage(immediate: boolean = false): void {
    try {
      const data = {
        conversations: Array.from(this.conversations.entries()),
        activeConversationId: this.activeConversationId,
        savedAt: new Date().toISOString()
      };
      
      // 🔧 FIX: Use storageManager for quota-safe saves
      const success = storageManager.setItem(this.storageKey, JSON.stringify(data));
      if (!success) {
        console.warn('⚠️ ConversationService: localStorage save failed (quota), relying on database');
      } else {
        logger.verbose('Saved to localStorage', 'ConversationService');
      }
      
      // FIXED: Smart database sync
      if (this.currentUserId && this.activeConversationId) {
        if (immediate) {
          // 🔧 FIX: Immediate sync for critical operations (message add)
          this.syncWithDatabase();
        } else {
          this.debouncedSyncWithDatabase();
        }
      }
    } catch (error) {
      console.error('❌ ConversationService: Failed to save', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        logger.debug('No stored data, starting fresh', 'ConversationService');
        this.createDefaultConversation();
        return;
      }

      let data;
      try {
        data = JSON.parse(stored);
      } catch (parseError) {
        console.error('📂 ConversationService: Failed to parse stored data, clearing and starting fresh');
        this.clearStorageAndStart();
        return;
      }
      
      // Additional validation: Check if data structure is valid
      if (!data || typeof data !== 'object' || 
          (data.conversations !== undefined && !Array.isArray(data.conversations) && typeof data.conversations !== 'object')) {
        console.error('📂 ConversationService: Invalid data structure detected, clearing and starting fresh');
        this.clearStorageAndStart();
        return;
      }
      
      // Check for legacy format or invalid data
      if (!data || typeof data !== 'object') {
        logger.warn('Invalid data format, clearing and starting fresh', 'ConversationService');
        this.clearStorageAndStart();
        return;
      }

      // Handle both old and new data formats
      let conversationsData: Array<[string, any]> = [];
      
      if (Array.isArray(data.conversations)) {
        // New format: { conversations: [[id, conv], ...], activeConversationId: string }
        conversationsData = data.conversations;
      } else if (data.conversations && typeof data.conversations === 'object') {
        // Migration: Convert object format to array format
        try {
          conversationsData = Object.entries(data.conversations);
          logger.debug('Migrating old conversation format', 'ConversationService');
        } catch (entryError) {
          console.error('📂 ConversationService: Failed to convert conversations object, clearing and starting fresh');
          this.clearStorageAndStart();
          return;
        }
      } else {
        // No valid conversations data
        logger.debug('No valid conversations found, starting fresh', 'ConversationService');
        this.createDefaultConversation();
        return;
      }
      
      // Restore conversations with robust error handling
      this.conversations = new Map();
      let validConversations = 0;
      
      // Ensure conversationsData is actually an array and has valid entries
      if (!Array.isArray(conversationsData) || conversationsData.length === 0) {
        logger.debug('No valid conversation data, starting fresh', 'ConversationService');
        this.createDefaultConversation();
        return;
      }
      
      for (const entry of conversationsData) {
        let entryId = 'unknown';
        try {
          // Ensure entry is an array with 2 elements [id, conv]
          if (!Array.isArray(entry) || entry.length !== 2) {
            console.warn('📂 ConversationService: Skipping malformed entry:', entry);
            continue;
          }
          
          const [id, conv] = entry;
          entryId = id;
          
          // CRITICAL FIX: Skip deleted conversations
          if (this.deletedConversations.has(id)) {
            console.log('🗑️ Skipping deleted conversation from localStorage:', id);
            continue;
          }
          
          if (!conv || typeof conv !== 'object' || !id) {
            console.warn('📂 ConversationService: Skipping invalid conversation:', id);
            continue;
          }

          // ULTRA-SAFE conversation restoration with extensive validation + MESSAGE LIMITING
          let safeMessages: any[] = [];
          if (conv.messages && Array.isArray(conv.messages)) {
            try {
              const MESSAGE_LIMIT = 50; // Limit localStorage messages too
              const allMessages = conv.messages;
              const limitedMessages = allMessages.slice(-MESSAGE_LIMIT); // Get most recent messages
              
              if (allMessages.length > MESSAGE_LIMIT) {
                console.warn(`🚨 ConversationService: localStorage conversation ${id} has ${allMessages.length} messages, limiting to ${MESSAGE_LIMIT} for performance`);
              }
              
              safeMessages = limitedMessages.map((msg: any) => {
                if (!msg || typeof msg !== 'object') return null;
                
                // 🧠 CRITICAL: Handle both old (.content) and new (.text) message formats
                // Also recover from empty text by checking content field
                const messageText = msg.text || msg.content || msg.message || '';
                
                // 🔥 Skip messages with empty content - they cause importance scoring issues
                if (!messageText || messageText.trim() === '') {
                  console.warn('⚠️ ConversationService: Skipping empty message during load');
                  return null;
                }
                
                return {
                  id: msg.id || `msg_${Date.now()}_${Math.random()}`,
                  text: messageText,
                  isUser: Boolean(msg.isUser),
                  timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
                  toolResults: Array.isArray(msg.toolResults) ? msg.toolResults : [],
                  canvasElements: Array.isArray(msg.canvasElements) ? msg.canvasElements : []
                };
              }).filter((msg): msg is NonNullable<typeof msg> => msg !== null);
            } catch (msgMapError) {
              console.warn('📂 ConversationService: Failed to map messages, using empty array:', msgMapError);
              safeMessages = [];
            }
          }
          
          let safeCanvasElements: any[] = [];
          if (conv.canvasElements && Array.isArray(conv.canvasElements)) {
            try {
              safeCanvasElements = conv.canvasElements.map((el: any) => {
                if (!el || typeof el !== 'object') return null;
                
                // Restore versions array with proper structure
                let versions = [];
                if (Array.isArray(el.versions)) {
                  versions = el.versions.map((v: any) => ({
                    version: v.version || 1,
                    content: v.content || '',
                    state: v.state || 'displayed',
                    request: v.request || '',
                    timestamp: v.timestamp ? new Date(v.timestamp) : new Date()
                  }));
                }
                
                // Restore completedVersions Set from array
                let completedVersions = new Set<number>();
                if (Array.isArray(el.completedVersions)) {
                  completedVersions = new Set(el.completedVersions);
                } else if (el.completedVersions instanceof Set) {
                  completedVersions = el.completedVersions;
                }
                
                return {
                  id: el.id || `canvas_${Date.now()}_${Math.random()}`,
                  type: el.type || 'document',
                  title: el.title || 'Untitled',
                  content: el.content || '',
                  createdAt: el.createdAt ? new Date(el.createdAt) : new Date(),
                  conversationId: el.conversationId || id,
                  state: el.state || 'displayed',
                  versions: versions,
                  currentVersion: el.currentVersion || versions.length,
                  completedVersions: completedVersions,
                  timestamp: el.timestamp ? new Date(el.timestamp) : new Date()
                };
              }).filter((el): el is NonNullable<typeof el> => el !== null);
            } catch (canvasMapError) {
              console.warn('📂 ConversationService: Failed to map canvas elements, using empty array:', canvasMapError);
              safeCanvasElements = [];
            }
          }

          const safeConversation = {
            id: id,
            title: conv.title || 'Untitled Chat',
            createdAt: conv.createdAt ? new Date(conv.createdAt) : new Date(),
            updatedAt: conv.updatedAt ? new Date(conv.updatedAt) : new Date(),
            isPinned: conv.isPinned || false,
            messages: safeMessages,
            canvasElements: safeCanvasElements
          };

          this.conversations.set(id, safeConversation);
          validConversations++;
        } catch (convError) {
          console.warn('📂 ConversationService: Failed to restore conversation:', entryId, convError);
        }
      }

      // Set active conversation
      if (data.activeConversationId && this.conversations.has(data.activeConversationId)) {
        this.activeConversationId = data.activeConversationId;
      } else if (validConversations > 0) {
        // Set first valid conversation as active
        this.activeConversationId = Array.from(this.conversations.keys())[0];
      } else {
        // No valid conversations, create default
        this.createDefaultConversation();
        return;
      }
      
      logger.debug(`Loaded ${validConversations} conversations from localStorage`, 'ConversationService');
    } catch (error) {
      console.error('❌ ConversationService: Failed to load from localStorage', error);
      this.clearStorageAndStart();
    }
  }

  private clearStorageAndStart(): void {
    logger.debug('Clearing localStorage and starting fresh', 'ConversationService');
    localStorage.removeItem(this.storageKey);
    this.conversations.clear();
    this.activeConversationId = null;
    this.createDefaultConversation();
  }

  private createDefaultConversation(): void {
    logger.debug('Creating default conversation', 'ConversationService');
    this.createNewConversation('Welcome Chat');
  }

  private generateConversationTitle(firstMessage: string): string {
    // Temporary title - will be updated after conversation develops
    return 'New Chat';
  }

  /**
   * 🎯 INTELLIGENT CONVERSATION TITLE GENERATOR
   * Analyzes conversation after 3-5 messages to extract core theme
   */
  async generateIntelligentTitle(conversationId: string): Promise<string> {
    try {
      const conversation = this.conversations.get(conversationId);
      if (!conversation || conversation.messages.length < 3) {
        return 'New Chat'; // Too early to determine theme
      }

      // Get first 5 messages to understand the conversation
      const recentMessages = conversation.messages.slice(0, 5);
      const conversationText = recentMessages
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');

      // Use LLM to extract the core theme
      const { UnifiedAPIRouter } = await import('./UnifiedAPIRouter');
      const unifiedAPIRouter = UnifiedAPIRouter.getInstance();

      const titlePrompt = `Analyze this conversation and generate a SHORT, MEANINGFUL title (3-5 words max) that captures the CORE TOPIC being discussed.

Conversation:
${conversationText}

RULES:
1. Extract the MAIN SUBJECT (not the question style)
2. Be SPECIFIC (not "Help with Task" but "Arabic Document Creation")
3. Use NOUN PHRASES (not full sentences)
4. NO articles (the, a, an)
5. Capitalize Important Words

BAD EXAMPLES:
- "Can you help me" ❌
- "User asks about" ❌
- "Help with studying" ❌

GOOD EXAMPLES:
- "Health Informatics Study" ✅
- "Arabic Text Introduction" ✅
- "Family Tree Discussion" ✅
- "Python Coding Tutorial" ✅

Generate ONLY the title, nothing else:`;

      const response = await unifiedAPIRouter.routeAPICall(
        'fireworks',
        'llm-completion',
        {
          messages: [{ role: 'user', content: titlePrompt }],
          max_tokens: 30,
          temperature: 0.3,
          model: 'accounts/fireworks/models/gpt-oss-120b'
        }
      );

      if (response?.success && response?.data?.[0]?.generated_text) {
        let title = response.data[0].generated_text.trim();
        
        // Strip quotes if LLM added them
        title = title.replace(/^["']|["']$/g, '');
        
        // Limit length
        if (title.length > 50) {
          title = title.substring(0, 47) + '...';
        }
        
        console.log('🎯 Generated intelligent title:', title);
        return title;
      }

      // Fallback: extract key entities from messages
      const words = conversationText
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 4 && !['hello', 'could', 'would', 'please', 'thanks'].includes(w));
      
      const uniqueWords = [...new Set(words)].slice(0, 3);
      return uniqueWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'New Chat';
      
    } catch (error) {
      console.warn('⚠️ Intelligent title generation failed:', error);
      return 'New Chat';
    }
  }

  // === CONVERSATION HISTORY FOR AI CONTEXT ===

  getConversationHistory(maxMessages = 30): Array<{role: 'user' | 'assistant', content: string, timestamp: Date}> {
    const conversation = this.getActiveConversation();
    const messages = conversation.messages
      .slice(-maxMessages)
      .map(msg => ({
        role: msg.isUser ? 'user' as const : 'assistant' as const,
        content: msg.text,
        timestamp: msg.timestamp
      }));
    
    logger.debug('Retrieved messages for AI context', 'ConversationService', { messageCount: messages.length, maxMessages });
    return messages;
  }

  getSessionId(): string {
    return this.getActiveConversation().id;
  }

  getOrCreateConversationForSession(sessionId: string): Conversation {
    // Check if we already have a conversation with this ID
    if (this.conversations.has(sessionId)) {
      const conversation = this.conversations.get(sessionId)!;
      this.activeConversationId = sessionId;
      
      // FIX: Update generic title if conversation has messages
      this.ensureMeaningfulTitle(conversation);
      
      this.saveToStorage();
      return conversation;
    }

    // Check if the current active conversation has this sessionId
    if (this.activeConversationId === sessionId) {
      const conversation = this.getActiveConversation();
      this.ensureMeaningfulTitle(conversation);
      return conversation;
    }

    // Create a new conversation with the specific sessionId
    const conversation: Conversation = {
      id: sessionId,
      title: `Session ${sessionId.slice(0, 8)}`,
      messages: [],
      canvasElements: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.conversations.set(sessionId, conversation);
    this.activeConversationId = sessionId;
    this.saveToStorage();

    logger.debug('Created conversation for session', 'ConversationService', { sessionId });
    return conversation;
  }

  /**
   * CRITICAL FIX: Ensure conversation has a meaningful title (not generic "Session {id}")
   * This runs whenever we access/switch to a conversation
   */
  private ensureMeaningfulTitle(conversation: Conversation): void {
    // Only update if title is generic AND we have user messages
    if (conversation.title.startsWith('Session ') || conversation.title === 'New Chat') {
      const firstUserMessage = conversation.messages.find(m => m.isUser && m.text?.trim());
      if (firstUserMessage) {
        const newTitle = this.generateConversationTitle(firstUserMessage.text);
        console.log(`📝 ConversationService: Updating generic title "${conversation.title}" → "${newTitle}"`);
        conversation.title = newTitle;
        this.saveToStorage();
      }
    }
  }

  /**
   * Public method to force title update - can be called from components
   */
  updateConversationTitleFromContent(conversationId?: string): string {
    const conversation = conversationId 
      ? this.conversations.get(conversationId)
      : this.getActiveConversation();
    
    if (!conversation) return 'New Chat';
    
    this.ensureMeaningfulTitle(conversation);
    return conversation.title;
  }

  // DEBUG: Method to verify conversation persistence
  debugPersistence(): void {
    console.log('🔍 CONVERSATION PERSISTENCE DEBUG:');
    console.log('Total conversations:', this.conversations.size);
    console.log('Active conversation ID:', this.activeConversationId);
    
    const active = this.getActiveConversation();
    console.log('Active conversation messages:', active.messages.length);
    console.log('Recent messages:', active.messages.slice(-5).map(m => ({
      role: m.isUser ? 'user' : 'assistant',
      preview: m.text.substring(0, 50) + '...',
      timestamp: m.timestamp
    })));
    
    // Check localStorage
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log('localStorage status:', {
          hasData: true,
          conversationsCount: parsed.conversations?.length || 0,
          activeId: parsed.activeConversationId,
          savedAt: parsed.savedAt
        });
      } catch (e) {
        console.log('localStorage status: corrupted data');
      }
    } else {
      console.log('localStorage status: no data');
    }
  }
}

// Singleton instance
export const conversationService = new ConversationService();

// EMERGENCY: Global method for browser console access
if (typeof window !== 'undefined') {
  (window as any).clearNeuraPlayConversations = () => {
    console.log('🧹 Emergency conversation clear initiated from console');
    conversationService.clearAllConversations();
    window.location.reload();
  };
  
  (window as any).debugConversations = () => {
    console.log('🔍 Conversation Debug Info:');
    console.log('Total conversations:', conversationService.getAllConversations().length);
    console.log('Active conversation:', conversationService.getActiveConversation().id);
    console.log('localStorage keys:', Object.keys(localStorage).filter(k => k.includes('conversation') || k.includes('neuraplay')));
  };
  
  // NEW: Enhanced debug function for persistence testing
  (window as any).debugPersistence = () => {
      conversationService.debugPersistence();
};
}

// EMERGENCY: Global method for browser console access
if (typeof window !== 'undefined') {
  (window as any).clearNeuraPlayConversations = () => {
    console.log('🧹 Emergency conversation clear initiated from console');
    conversationService.clearAllConversations();
    window.location.reload();
  };
  
  (window as any).debugConversations = () => {
    console.log('🔍 Conversation Debug Info:');
    console.log('Total conversations:', conversationService.getAllConversations().length);
    console.log('Active conversation:', conversationService.getActiveConversation().id);
    console.log('localStorage keys:', Object.keys(localStorage).filter(k => k.includes('conversation') || k.includes('neuraplay')));
  };
  
  // NEW: Enhanced debug function for persistence testing
  (window as any).debugPersistence = () => {
    conversationService.debugPersistence();
  };
}