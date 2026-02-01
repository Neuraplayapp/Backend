/**
 * ChatMemoryService - Manages persistent cross-chat memory and context
 * Ensures all open chats are stored in database and can reference each other
 */

interface ChatMessage {
  text: string;
  isUser: boolean;
  timestamp: Date;
  toolResults?: any[];
}

interface ChatTab {
  id: string;
  title: string;
  messages: ChatMessage[];
  mode: string;
  canvasMode: boolean;
  createdAt: Date;
  lastActive: Date;
  context?: any;
}

interface CrossChatContext {
  [tabId: string]: {
    title: string;
    recentMessages: ChatMessage[];
    lastActivity: Date;
    summary?: string; // For historical chats
    isActive?: boolean; // Whether chat is currently open
    isHistorical?: boolean; // Whether this is from database
  };
}

class ChatMemoryService {
  private static instance: ChatMemoryService;
  private activeChats: Map<string, ChatTab> = new Map();
  private userId: string | null = null;

  static getInstance(): ChatMemoryService {
    if (!ChatMemoryService.instance) {
      ChatMemoryService.instance = new ChatMemoryService();
    }
    return ChatMemoryService.instance;
  }

  // Initialize for a specific user
  async initializeForUser(userId: string): Promise<void> {
    this.userId = userId;
    console.log('🧠 ChatMemoryService initializing for user:', userId);
    
    // Load all active chats from database
    await this.loadAllChatsFromDatabase();
  }

  // Load all user's chats from database into memory
  private async loadAllChatsFromDatabase(): Promise<void> {
    if (!this.userId) return;

    try {
      console.log('📚 Loading all chats from database for user:', this.userId);
      const response = await fetch(`/api/tabs/${this.userId}`);
      const result = await response.json();

      if (result.success && result.tabs) {
        this.activeChats.clear();
        
        result.tabs.forEach((dbTab: any) => {
          const tab: ChatTab = {
            id: dbTab.id,
            title: dbTab.title,
            messages: Array.isArray(dbTab.messages) ? dbTab.messages.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            })) : [],
            mode: dbTab.mode || 'chat',
            canvasMode: dbTab.canvas_mode || false,
            createdAt: new Date(dbTab.created_at),
            lastActive: new Date(dbTab.last_active),
            context: dbTab.context || {}
          };
          
          this.activeChats.set(tab.id, tab);
        });

        console.log(`✅ Loaded ${this.activeChats.size} chats into memory`);
      }
    } catch (error) {
      console.error('❌ Failed to load chats from database:', error);
    }
  }

  // Update chat in memory and database
  async updateChat(tabId: string, tab: ChatTab): Promise<void> {
    console.log('💾 Updating chat in memory and database:', tabId);
    
    // Update in memory
    this.activeChats.set(tabId, { ...tab, lastActive: new Date() });
    
    // Save to database
    await this.saveTabToDatabase(tab);
  }

  // Add new message to chat
  async addMessage(tabId: string, message: ChatMessage): Promise<void> {
    const tab = this.activeChats.get(tabId);
    if (!tab) {
      console.warn(`⚠️ Chat ${tabId} not found in memory`);
      return;
    }

    // Update messages
    tab.messages.push(message);
    tab.lastActive = new Date();
    
    // Update in memory and database
    await this.updateChat(tabId, tab);
  }

  // Get cross-chat context for a specific tab (enhanced with historical fetching)
  async getCrossChatContext(currentTabId: string, includeHistorical: boolean = true): Promise<CrossChatContext> {
    const context: CrossChatContext = {};
    
    // 1. Add active chats (in-memory)
    this.activeChats.forEach((tab, tabId) => {
      if (tabId === currentTabId || tab.messages.length === 0) return;
      
      const recentMessages = tab.messages.slice(-3);
      context[tabId] = {
        title: tab.title,
        recentMessages: recentMessages,
        lastActivity: tab.lastActive,
        isActive: true
      };
    });

    // 2. Fetch historical chats from database if requested
    if (includeHistorical && this.userId) {
      try {
        const historicalChats = await this.fetchHistoricalChats(3); // Last 3 historical chats
        
        historicalChats.forEach(chat => {
          if (chat.id === currentTabId) return; // Skip current
          
          // Add summarized historical context
          const summary = this.generateChatSummary(chat);
          context[chat.id] = {
            title: chat.title,
            recentMessages: [], // Use summary instead of full messages
            lastActivity: new Date(chat.lastActive),
            summary: summary,
            isActive: false,
            isHistorical: true
          };
        });
        
        console.log(`🔗 Enhanced cross-chat context for ${currentTabId}:`, {
          activeChats: Object.values(context).filter(c => c.isActive).length,
          historicalChats: Object.values(context).filter(c => c.isHistorical).length
        });
        
      } catch (error) {
        console.warn('⚠️ Failed to fetch historical context:', error);
      }
    }

    return context;
  }

  // Get all active chat summaries (for search)
  getAllChatSummaries(): Array<{tabId: string, title: string, messageCount: number, lastActive: Date}> {
    return Array.from(this.activeChats.entries()).map(([tabId, tab]) => ({
      tabId,
      title: tab.title,
      messageCount: tab.messages.length,
      lastActive: tab.lastActive
    }));
  }

  // Search across all chats
  searchAcrossChats(query: string): Array<{
    tabId: string;
    tabTitle: string;
    messageIndex: number;
    message: ChatMessage;
    snippet: string;
  }> {
    const results: Array<any> = [];
    const queryLower = query.toLowerCase();

    this.activeChats.forEach((tab, tabId) => {
      tab.messages.forEach((message, messageIndex) => {
        if (message.text.toLowerCase().includes(queryLower)) {
          results.push({
            tabId,
            tabTitle: tab.title,
            messageIndex,
            message,
            snippet: message.text.substring(0, 100) + '...'
          });
        }
      });
    });

    return results;
  }

  // Create new chat
  async createNewChat(title: string): Promise<ChatTab> {
    const newTab: ChatTab = {
      id: crypto.randomUUID(), // ✅ FIX: Use proper UUID format
      title,
      messages: [],
      mode: 'chat',
      canvasMode: false,
      createdAt: new Date(),
      lastActive: new Date(),
      context: {}
    };

    // Add to memory and database
    this.activeChats.set(newTab.id, newTab);
    await this.saveTabToDatabase(newTab);

    console.log('✨ Created new chat:', newTab.id, newTab.title);
    return newTab;
  }

  // Delete chat
  async deleteChat(tabId: string): Promise<void> {
    console.log('🗑️ Deleting chat from memory and database:', tabId);
    
    // Remove from memory
    this.activeChats.delete(tabId);
    
    // Delete from database
    try {
      await fetch(`/api/tabs/${tabId}`, { method: 'DELETE' });
      console.log('✅ Chat deleted from database');
    } catch (error) {
      console.error('❌ Failed to delete chat from database:', error);
    }
  }

  // Private method to save tab to database
  private async saveTabToDatabase(tab: ChatTab): Promise<void> {
    if (!this.userId) return;

    try {
      // Validate dates before calling toISOString()
      const createdAt = tab.createdAt instanceof Date && !isNaN(tab.createdAt.getTime()) 
        ? tab.createdAt.toISOString()
        : new Date().toISOString();
      
      const lastActive = tab.lastActive instanceof Date && !isNaN(tab.lastActive.getTime())
        ? tab.lastActive.toISOString()
        : new Date().toISOString();

      await fetch('/api/tabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          tabData: {
            id: tab.id,
            title: tab.title,
            messages: tab.messages,
            mode: tab.mode,
            canvasMode: tab.canvasMode,
            createdAt: createdAt,
            lastActive: lastActive,
            context: tab.context
          }
        })
      });
    } catch (error) {
      console.error('❌ Failed to save tab to database:', error);
    }
  }

  // Get specific chat
  getChat(tabId: string): ChatTab | undefined {
    return this.activeChats.get(tabId);
  }

  // Get all chats
  getAllChats(): ChatTab[] {
    return Array.from(this.activeChats.values());
  }

  // Check if chat exists
  hasChat(tabId: string): boolean {
    return this.activeChats.has(tabId);
  }

  // Update chat title
  async updateChatTitle(tabId: string, title: string): Promise<void> {
    const tab = this.activeChats.get(tabId);
    if (!tab) return;

    tab.title = title;
    tab.lastActive = new Date();
    
    await this.updateChat(tabId, tab);
  }

  // Cleanup old chats (optional - for memory management)
  async cleanupOldChats(daysOld: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const toDelete: string[] = [];
    
    this.activeChats.forEach((tab, tabId) => {
      if (tab.lastActive < cutoffDate) {
        toDelete.push(tabId);
      }
    });

    for (const tabId of toDelete) {
      await this.deleteChat(tabId);
    }

    if (toDelete.length > 0) {
      console.log(`🧹 Cleaned up ${toDelete.length} old chats`);
    }
  }

  // 🔧 NEW: Fetch historical context with semantic search capability
  async fetchHistoricalContext(searchQuery?: string, limit: number = 3): Promise<Array<{
    tabId: string;
    title: string;
    summary: string;
    relevantMessages: ChatMessage[];
    lastActive: Date;
  }>> {
    if (!this.userId) return [];

    try {
      console.log(`🔍 Fetching historical context for query: "${searchQuery}"`);
      
      // Fetch from database
      const response = await fetch(`/api/tabs/${this.userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) return [];

      const historicalChats = await response.json();
      
      // Filter out active chats and process
      const results = historicalChats
        .filter((chat: any) => !this.activeChats.has(chat.id)) // Not currently active
        .slice(0, limit)
        .map((chat: any) => ({
          tabId: chat.id,
          title: chat.title || 'Untitled Chat',
          summary: this.generateChatSummary(chat),
          relevantMessages: this.extractRelevantMessages(chat.messages || [], searchQuery),
          lastActive: new Date(chat.last_active || chat.lastActive)
        }));

      console.log(`📚 Retrieved ${results.length} historical chats`);
      return results;
        
    } catch (error) {
      console.error('❌ Error fetching historical context:', error);
      return [];
    }
  }

  // 🔧 NEW: Fetch historical chats from database
  private async fetchHistoricalChats(limit: number = 5): Promise<any[]> {
    if (!this.userId) return [];

    try {
      const response = await fetch(`/api/tabs/${this.userId}`, {
        method: 'GET'
      });

      if (!response.ok) return [];

      const chats = await response.json();
      return chats
        .filter((chat: any) => !this.activeChats.has(chat.id))
        .sort((a: any, b: any) => new Date(b.last_active || b.lastActive).getTime() - new Date(a.last_active || a.lastActive).getTime())
        .slice(0, limit);
        
    } catch (error) {
      console.error('❌ Error fetching historical chats:', error);
      return [];
    }
  }

  // 🔧 NEW: Generate chat summary for historical context
  private generateChatSummary(chat: any): string {
    const messages = chat.messages || [];
    if (messages.length === 0) return 'Empty conversation';

    // Extract key topics and user intents
    const userMessages = messages.filter((m: ChatMessage) => m.isUser);

    // Simple keyword extraction for summary
    const allText = messages.map((m: ChatMessage) => m.text).join(' ');
    const topics = this.extractKeyTopics(allText);
    
    const summary = [
      `${messages.length} messages exchanged`,
      `Topics: ${topics.slice(0, 3).join(', ')}`,
      userMessages.length > 0 ? `Last user request: ${userMessages[userMessages.length - 1].text.substring(0, 50)}...` : ''
    ].filter(Boolean).join('. ');

    return summary;
  }

  // 🔧 NEW: Extract relevant messages based on search query
  private extractRelevantMessages(messages: ChatMessage[], searchQuery?: string): ChatMessage[] {
    if (!searchQuery || messages.length === 0) {
      return messages.slice(-3); // Last 3 messages if no search query
    }

    const queryLower = searchQuery.toLowerCase();
    const relevant = messages.filter(msg => 
      msg.text.toLowerCase().includes(queryLower)
    );

    return relevant.length > 0 ? relevant.slice(-3) : messages.slice(-3);
  }

  // 🔧 NEW: Extract key topics from text (simple keyword extraction)
  private extractKeyTopics(text: string): string[] {
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their']);
    
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word));

    // Count frequency
    const frequency = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Return top topics
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }
}

export const chatMemoryService = ChatMemoryService.getInstance();
export type { ChatTab, ChatMessage, CrossChatContext };
