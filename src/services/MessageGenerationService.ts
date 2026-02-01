/**
 * 📨 MESSAGE GENERATION SERVICE
 * 
 * Extracted from NeuraPlayAssistantLite.tsx to reduce component size and
 * centralize all message creation, formatting, and persistence logic.
 * 
 * RESPONSIBILITIES:
 * - Message creation and formatting
 * - Conversation service integration
 * - Message type handling (user, AI, system, error, canvas)
 * - State synchronization with UI components
 */

import { conversationService, type Conversation } from './ConversationService';

export interface MessageData {
  text: string;
  isUser: boolean;
  timestamp: Date;
  toolResults?: any[];
  visionAnalysis?: any;
  processedDocuments?: any;
  combinedInsights?: any;
  metadata?: any;
}

export interface MessageOptions {
  type?: 'user' | 'ai' | 'system' | 'error' | 'canvas' | 'test';
  autoFormat?: boolean;
  includeTimestamp?: boolean;
  priority?: 'low' | 'normal' | 'high';
}

export class MessageGenerationService {
  private static instance: MessageGenerationService;
  private messageCallbacks: Array<(conversation: Conversation) => void> = [];

  static getInstance(): MessageGenerationService {
    if (!MessageGenerationService.instance) {
      MessageGenerationService.instance = new MessageGenerationService();
    }
    return MessageGenerationService.instance;
  }

  /**
   * Register callback for when messages are added (for UI updates)
   */
  onMessageAdded(callback: (conversation: Conversation) => void): void {
    this.messageCallbacks.push(callback);
  }

  /**
   * Remove message callback
   */
  removeMessageCallback(callback: (conversation: Conversation) => void): void {
    this.messageCallbacks = this.messageCallbacks.filter(cb => cb !== callback);
  }

  /**
   * CORE MESSAGE CREATION
   * Centralized message creation with conversation service integration
   */
  addMessage(message: MessageData, options: MessageOptions = {}): any {
    const messageType = options.type || (message.isUser ? 'user' : 'ai');
    
    console.log(`📨 MessageGenerationService: Adding ${messageType} message:`, 
      message.text.substring(0, 50) + '...');
    
    // Add to conversation service (primary source of truth)
    const newMessage = conversationService.addMessage(message);
    
    // Get updated conversation for state synchronization
    const updatedConversation = conversationService.getActiveConversation();
    
    // Notify all registered callbacks (typically UI components)
    this.messageCallbacks.forEach(callback => {
      try {
        callback(updatedConversation);
      } catch (error) {
        console.error('❌ MessageGenerationService: Callback error:', error);
      }
    });
    
    console.log(`✅ MessageGenerationService: Message added, conversation now has ${updatedConversation.messages.length} messages`);
    return newMessage;
  }

  /**
   * USER MESSAGE CREATION
   * For messages sent by the user
   */
  createUserMessage(text: string, options: MessageOptions = {}): any {
    return this.addMessage({
      text: text.trim(),
      isUser: true,
      timestamp: new Date()
    }, { ...options, type: 'user' });
  }

  /**
   * AI RESPONSE CREATION
   * For messages sent by the AI assistant
   */
  createAIResponse(text: string, toolResults: any[] = [], options: MessageOptions = {}): any {
    return this.addMessage({
      text,
      isUser: false,
      timestamp: new Date(),
      toolResults
    }, { ...options, type: 'ai' });
  }

  /**
   * SYSTEM MESSAGE CREATION
   * For system notifications, errors, status updates
   */
  createSystemMessage(text: string, messageType: 'info' | 'warning' | 'error' | 'success' = 'info'): any {
    const prefixes = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '🚫', 
      success: '✅'
    };

    return this.addMessage({
      text: `${prefixes[messageType]} ${text}`,
      isUser: false,
      timestamp: new Date(),
      metadata: { systemMessageType: messageType }
    }, { type: 'system' });
  }

  /**
   * CANVAS ACTIVATION MESSAGE
   * When canvas is activated for visual content
   */
  createCanvasActivationMessage(): any {
    return this.addMessage({
      text: '🎨 **Canvas Activated!** Your content is being created in the visual workspace.',
      isUser: false,
      timestamp: new Date(),
      metadata: { canvasActivation: true }
    }, { type: 'canvas' });
  }

  /**
   * ERROR MESSAGE CREATION
   * For error handling and user feedback
   */
  createErrorMessage(errorText: string, includeTestCommands: boolean = true): any {
    let message = `🚫 ${errorText}`;
    
    if (includeTestCommands) {
      message += '\n\n**Test Commands Available:**\n• "test document" - Create sample document\n• "test chart" - Create sample chart';
    }

    return this.addMessage({
      text: message,
      isUser: false,
      timestamp: new Date(),
      metadata: { isError: true }
    }, { type: 'error' });
  }

  /**
   * USAGE LIMIT MESSAGE
   * When user hits AI usage limits
   */
  createUsageLimitMessage(aiUsage: { used: number; limit: number }, isVerified: boolean): any {
    const verificationMessage = isVerified 
      ? `You've reached your AI chat limit (${aiUsage.limit} prompts/day). Upgrade to Premium for more access!` 
      : `You've used your free AI chat limit (${aiUsage.limit} prompts/day). Verify your email for more access or upgrade to Premium!`;
    
    return this.createSystemMessage(verificationMessage, 'warning');
  }

  /**
   * CANCELLATION MESSAGE
   * When user cancels a request
   */
  createCancellationMessage(): any {
    return this.addMessage({
      text: '🛑 Request cancelled by user',
      isUser: false,
      timestamp: new Date(),
      metadata: { cancelled: true }
    }, { type: 'system' });
  }

  /**
   * TEST DOCUMENT MESSAGE
   * For test document creation
   */
  createTestDocumentMessage(): any {
    return this.addMessage({
      text: '✅ **Test Document Created!**\n\nA test document has been added to the canvas. The interface has switched to split-screen mode so you can see it on the right.',
      isUser: false,
      timestamp: new Date(),
      metadata: { testContent: 'document' }
    }, { type: 'test' });
  }

  /**
   * TEST CHART MESSAGE
   * For test chart creation
   */
  createTestChartMessage(): any {
    return this.addMessage({
      text: '📊 **Test Chart Created!**\n\nA sample bar chart has been added to the canvas. You can see it in the right panel.',
      isUser: false,
      timestamp: new Date(),
      metadata: { testContent: 'chart' }
    }, { type: 'test' });
  }

  /**
   * INITIALIZATION MESSAGE
   * When AI system is starting up
   */
  createInitializationMessage(): any {
    return this.addMessage({
      text: '⚠️ **AI System Initializing**\n\nThe AI system is still starting up. Please wait a moment and try again.\n\n💡 **Quick Fix:** Refresh the page if this persists.',
      isUser: false,
      timestamp: new Date(),
      metadata: { initializing: true }
    }, { type: 'system' });
  }

  /**
   * FILE UPLOAD MESSAGE
   * When files are uploaded
   */
  createFileUploadMessage(files: any[]): any {
    const fileCount = files.length;
    const fileNames = files.map(f => f.name).join(', ');
    
    return this.createUserMessage(
      `📎 Shared ${fileCount} file${fileCount > 1 ? 's' : ''}: ${fileNames}`
    );
  }

  /**
   * Get current conversation for external access
   */
  getCurrentConversation(): Conversation {
    return conversationService.getActiveConversation();
  }

  /**
   * Get conversation statistics
   */
  getConversationStats(): { totalMessages: number; userMessages: number; aiMessages: number } {
    const conversation = conversationService.getActiveConversation();
    const userMessages = conversation.messages.filter(m => m.isUser).length;
    const aiMessages = conversation.messages.filter(m => !m.isUser).length;
    
    return {
      totalMessages: conversation.messages.length,
      userMessages,
      aiMessages
    };
  }
}

// Export singleton instance
export const messageGenerationService = MessageGenerationService.getInstance();


