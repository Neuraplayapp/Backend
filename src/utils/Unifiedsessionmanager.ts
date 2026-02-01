// Unified Session Manager - Single source of truth for session management
// Bridges ConversationService, ChatMemoryService, and ContextManager

import { conversationService } from '../services/ConversationService';
import { chatMemoryService } from '../services/ChatMemoryService';
import { ContextManager } from '../services/ContextManager';

export interface SessionContext {
  sessionId: string;
  userId: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    metadata?: any;
  }>;
  contextData: any;
  tokenCount: number;
  lastActivity: Date;
}

export class UnifiedSessionManager {
  private static instance: UnifiedSessionManager;
  private contextManager: ContextManager;
  private activeSessions = new Map<string, SessionContext>();

  constructor() {
    this.contextManager = new ContextManager();
  }

  static getInstance(): UnifiedSessionManager {
    if (!UnifiedSessionManager.instance) {
      UnifiedSessionManager.instance = new UnifiedSessionManager();
    }
    return UnifiedSessionManager.instance;
  }

  /**
   * CRITICAL FIX: Ensure ConversationService is using the correct conversation for this session
   */
  private ensureCorrectSessionConversation(sessionId: string): void {
    try {
      // Use the new streamlined method to get or create conversation for session
      const conversation = conversationService.getOrCreateConversationForSession(sessionId);
      
      console.log('✅ UnifiedSessionManager: Session conversation ensured', {
        sessionId,
        conversationId: conversation.id,
        messageCount: conversation.messages.length,
        matched: sessionId === conversation.id
      });
      
    } catch (error) {
      console.error('❌ UnifiedSessionManager: Failed to ensure correct session conversation:', error);
      // Continue with current conversation - better than crashing
    }
  }

  /**
   * Get unified session context - combines all data sources
   */
  async getSessionContext(sessionId: string, userId?: string): Promise<SessionContext> {
    try {
      // 1. CRITICAL FIX: Ensure we get conversation history for the correct session
      // First, check if we need to switch to the conversation matching this sessionId
      this.ensureCorrectSessionConversation(sessionId);
      
      const conversationHistory = conversationService.getConversationHistory(30);
      console.log('🔍 UnifiedSessionManager: Raw conversation history for session', sessionId, {
        type: typeof conversationHistory,
        isArray: Array.isArray(conversationHistory),
        length: conversationHistory?.length,
        sample: conversationHistory?.slice?.(0, 2),
        currentConversationId: conversationService.getSessionId()
      });
      
      // 2. Get context data from ContextManager
      const contextData = await this.contextManager.getSessionContext(sessionId);
      
      // 3. Initialize ChatMemoryService if needed
      if (userId) {
        await chatMemoryService.initializeForUser(userId);
        
        // Sync conversation to ChatMemoryService if not already there
        const chatTab = chatMemoryService.getChat(sessionId);
        if (!chatTab && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
          await this.syncConversationToMemoryService(sessionId, conversationHistory);
        }
      }
      
      // 4. Ensure conversationHistory is an array
      const normalizedHistory = Array.isArray(conversationHistory) ? conversationHistory : [];
      console.log('🔍 UnifiedSessionManager: Normalized conversation history', {
        originalLength: conversationHistory?.length || 0,
        normalizedLength: normalizedHistory.length,
        firstMessage: normalizedHistory[0]
      });
      
      // 5. Calculate token count
      const tokenCount = this.calculateTokenCount(normalizedHistory);
      
      const sessionContext: SessionContext = {
        sessionId,
        userId: userId || 'anonymous',
        conversationHistory: normalizedHistory,
        contextData,
        tokenCount,
        lastActivity: new Date()
      };
      
      // Cache for performance
      this.activeSessions.set(sessionId, sessionContext);
      
      console.log('🔄 UnifiedSessionManager: Retrieved session context', {
        sessionId,
        messageCount: conversationHistory.length,
        tokenCount,
        hasContextData: Object.keys(contextData).length > 0
      });
      
      return sessionContext;
      
    } catch (error) {
      console.error('❌ UnifiedSessionManager: Failed to get session context:', error);
      return {
        sessionId,
        userId: userId || 'anonymous',
        conversationHistory: [],
        contextData: {},
        tokenCount: 0,
        lastActivity: new Date()
      };
    }
  }

  /**
   * Add message to session and update all services
   */
  async addMessage(sessionId: string, message: {
    role: 'user' | 'assistant';
    content: string;
    metadata?: any;
  }, userId?: string): Promise<void> {
    try {
      // CRITICAL FIX: Ensure we're adding to the correct conversation for this session
      this.ensureCorrectSessionConversation(sessionId);
      
      // 1. Add to ConversationService (primary source)
      conversationService.addMessage({
        text: message.content,
        isUser: message.role === 'user',
        timestamp: new Date(),
        toolResults: message.metadata?.toolResults || []
      });
      
      // 2. Add to ChatMemoryService if user exists
      if (userId) {
        await chatMemoryService.initializeForUser(userId);
        await chatMemoryService.addMessage(sessionId, {
          text: message.content,
          isUser: message.role === 'user',
          timestamp: new Date(),
          toolResults: message.metadata?.toolResults || []
        });
      }
      
      // 3. Update cached session
      const cached = this.activeSessions.get(sessionId);
      if (cached) {
        cached.conversationHistory.push({
          role: message.role,
          content: message.content,
          timestamp: new Date(),
          metadata: message.metadata
        });
        cached.tokenCount = this.calculateTokenCount(cached.conversationHistory);
        cached.lastActivity = new Date();
      }
      
      console.log('✅ UnifiedSessionManager: Message added to all services');
      
    } catch (error) {
      console.error('❌ UnifiedSessionManager: Failed to add message:', error);
    }
  }

  /**
   * DEBUG: Test conversation memory continuity for a specific session
   */
  async debugSessionMemory(sessionId: string, userId?: string): Promise<{
    success: boolean;
    sessionId: string;
    currentConversationId: string;
    messageCount: number;
    messages: Array<{role: string, preview: string, timestamp: string}>;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    try {
      console.log('🔍 DEBUG: Testing session memory continuity for', sessionId);
      
      // Ensure correct conversation is active
      this.ensureCorrectSessionConversation(sessionId);
      
      // Get current conversation info
      const currentConversationId = conversationService.getSessionId();
      const sessionContext = await this.getSessionContext(sessionId, userId);
      
      // Check if sessionId matches conversationId
      if (sessionId !== currentConversationId) {
        issues.push(`Session ID mismatch: session=${sessionId}, conversation=${currentConversationId}`);
      }
      
      // Check conversation history
      const messages = sessionContext.conversationHistory.map(msg => ({
        role: msg.role,
        preview: (msg.content || '').substring(0, 50) + '...',
        timestamp: msg.timestamp.toISOString()
      }));
      
      if (messages.length === 0) {
        issues.push('No conversation history found');
      }
      
      // Check if UnifiedSessionManager and ConversationService have same count
      const directHistory = conversationService.getConversationHistory(30);
      if (directHistory.length !== messages.length) {
        issues.push(`Message count mismatch: unified=${messages.length}, direct=${directHistory.length}`);
      }
      
      console.log('🔍 DEBUG: Session memory analysis complete', {
        sessionId,
        currentConversationId,
        messageCount: messages.length,
        issuesFound: issues.length
      });
      
      return {
        success: issues.length === 0,
        sessionId,
        currentConversationId,
        messageCount: messages.length,
        messages,
        issues
      };
      
    } catch (error) {
      console.error('❌ DEBUG: Session memory test failed:', error);
      issues.push(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        success: false,
        sessionId,
        currentConversationId: 'unknown',
        messageCount: 0,
        messages: [],
        issues
      };
    }
  }

  /**
   * Sync conversation history to ChatMemoryService
   */
  private async syncConversationToMemoryService(sessionId: string, history: any[]): Promise<void> {
    try {
      // Create new chat tab with all required fields
      const now = new Date();
      const chatTab = {
        id: sessionId,
        title: (history[0]?.content || history[0]?.text || history[0]?.message || 'New Chat').substring(0, 50) + '...',
        messages: history.map(msg => ({
          text: msg.content || msg.text || msg.message || '',
          isUser: msg.role === 'user',
          timestamp: msg.timestamp || new Date(),
          metadata: msg.metadata
        })),
        createdAt: now,
        lastActive: now,
        isHistorical: false,
        mode: 'chat',
        canvasMode: false,
        context: {}
      };
      
      await chatMemoryService.updateChat(sessionId, chatTab);
      console.log('🔄 Synced conversation to ChatMemoryService');
      
    } catch (error) {
      console.error('❌ Failed to sync to ChatMemoryService:', error);
    }
  }

  /**
   * Calculate total token count for conversation
   */
  private calculateTokenCount(messages: any[]): number {
    if (!messages || !Array.isArray(messages)) {
      console.warn('⚠️ UnifiedSessionManager: Invalid messages array for token calculation', { messages });
      return 0;
    }
    
          return messages.reduce((total, msg) => {
        if (!msg) {
          console.warn('⚠️ UnifiedSessionManager: Null message in token calculation');
          return total;
        }
        
              // Handle ConversationService format: {role, content, timestamp}
      // ChatMessage uses 'text', some APIs use 'content'
      const content = msg.content || msg.text || msg.message || '';
      if (!content || typeof content !== 'string') {
        // Log only in development to find the source of empty messages
        if (process.env.NODE_ENV === 'development') {
          console.debug('[SessionManager] Empty message:', { keys: Object.keys(msg), type: typeof msg });
        }
        return total;
      }
        
        return total + Math.ceil(content.length / 4);
      }, 0);
  }

  /**
   * Update context data
   */
  async updateContext(sessionId: string, key: string, data: any, tags?: string[]): Promise<void> {
    await this.contextManager.updateContext(sessionId, key, data, tags);
    
    // Update cached session
    const cached = this.activeSessions.get(sessionId);
    if (cached) {
      cached.contextData[key] = data;
    }
  }

  /**
   * Clear old sessions from cache
   */
  cleanup(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.lastActivity.getTime() < oneHourAgo) {
        this.activeSessions.delete(sessionId);
      }
    }
  }
}

export const unifiedSessionManager = UnifiedSessionManager.getInstance();

// DEBUG: Add to global window for easy testing
if (typeof window !== 'undefined') {
  (window as any).debugSessionMemory = async (sessionId?: string, userId?: string) => {
    const testSessionId = sessionId || 'test-session-' + Date.now();
    console.log('🔍 Testing session memory for:', testSessionId);
    
    const result = await unifiedSessionManager.debugSessionMemory(testSessionId, userId);
    
    console.log('📊 Memory continuity test results:', result);
    if (result.success) {
      console.log('✅ Memory continuity working correctly!');
    } else {
      console.log('❌ Memory continuity issues found:', result.issues);
    }
    
    return result;
  };
  
  (window as any).testMemoryFlow = async () => {
    const sessionId = 'test-memory-' + Date.now();
    console.log('🧪 Testing complete memory flow...');
    
    // Test 1: Add a message
    await unifiedSessionManager.addMessage(sessionId, {
      role: 'user',
      content: 'Hello, this is a test message!'
    });
    
    // Test 2: Check if message persists
    const result1 = await unifiedSessionManager.debugSessionMemory(sessionId);
    
    // Test 3: Add another message
    await unifiedSessionManager.addMessage(sessionId, {
      role: 'assistant',
      content: 'Hello! I remember your previous message.'
    });
    
    // Test 4: Check if both messages persist
    const result2 = await unifiedSessionManager.debugSessionMemory(sessionId);
    
    console.log('🧪 Memory flow test complete:', {
      afterFirstMessage: result1,
      afterSecondMessage: result2,
      memoryWorking: result2.messageCount === 2 && result2.success
    });
    
    return {
      sessionId,
      tests: [result1, result2],
      success: result2.messageCount === 2 && result2.success
    };
  };
  
  console.log('🔧 Debug tools loaded: window.debugSessionMemory() and window.testMemoryFlow()');
}
