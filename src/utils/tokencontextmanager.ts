// Token-Aware Context Manager - Intelligent context compression and management
// Handles token limits, importance scoring, and progressive summarization

import { unifiedSessionManager, SessionContext } from './Unifiedsessionmanager';
import { toolRegistry } from '../services/ToolRegistry';

// Tiktoken for accurate tokenization
type Tiktoken = any; // Will be imported dynamically to avoid build issues

export interface TokenConfig {
  maxTokens: number;
  reservedTokens: number;
  summaryThreshold: number;
  importanceThreshold: number;
}

export interface MessageImportance {
  score: number;
  reasons: string[];
  category: 'critical' | 'high' | 'medium' | 'low';
}

export interface ContextWindow {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    importance: MessageImportance;
    tokens: number;
  }>;
  systemPrompt: string;
  totalTokens: number;
  compressionApplied: boolean;
  summary?: string;
}

export class TokenAwareContextManager {
  private static instance: TokenAwareContextManager;
  private config: TokenConfig;
  private tokenizer: Tiktoken | null = null;
  private vectorDB: any = null; // Will be initialized dynamically

  constructor(config: Partial<TokenConfig> = {}) {
    this.config = {
      maxTokens: config.maxTokens || 4096,
      reservedTokens: config.reservedTokens || 1000,
      summaryThreshold: config.summaryThreshold || 20,
      importanceThreshold: config.importanceThreshold || 0.6,
      ...config
    };
    
    this.initializeTokenizer();
    this.initializeVectorDB();
  }

  /**
   * Initialize tiktoken for accurate tokenization
   */
  private async initializeTokenizer(): Promise<void> {
    // Always use fallback estimation for now to avoid build issues
    console.log('🌐 TokenAwareContextManager: Using improved fallback token estimation');
    this.tokenizer = null;
    return;
    
    // TODO: Implement tiktoken when WASM build issues are resolved
    // This would require vite-plugin-wasm or similar
    /*
    try {
      // Dynamic import to avoid build issues
      const { encoding_for_model } = await import('tiktoken');
      this.tokenizer = encoding_for_model('gpt-4');
      console.log('✅ TokenAwareContextManager: Tiktoken initialized');
    } catch (error) {
      console.warn('⚠️ TokenAwareContextManager: Tiktoken not available, using estimation:', error);
      this.tokenizer = null;
    }
    */
  }

  /**
   * Initialize vector database connection
   */
  private async initializeVectorDB(): Promise<void> {
    try {
      const { VectorSearchService } = await import('../services/VectorSearchService');
      this.vectorDB = VectorSearchService.getInstance();
      console.log('✅ TokenAwareContextManager: Vector DB initialized');
    } catch (error) {
      console.warn('⚠️ TokenAwareContextManager: Vector DB not available:', error);
      this.vectorDB = null;
    }
  }

  static getInstance(): TokenAwareContextManager {
    if (!TokenAwareContextManager.instance) {
      TokenAwareContextManager.instance = new TokenAwareContextManager();
    }
    return TokenAwareContextManager.instance;
  }

  /**
   * Get optimized context window for AI processing
   */
  async getOptimizedContext(sessionId: string, userId?: string, newMessage?: string): Promise<ContextWindow> {
    try {
      const sessionContext = await unifiedSessionManager.getSessionContext(sessionId, userId);
      
      // Calculate tokens for new message
      const newMessageTokens = newMessage ? this.estimateTokens(newMessage) : 0;
      const availableTokens = this.config.maxTokens - this.config.reservedTokens - newMessageTokens;
      
      console.log('🧮 TokenAwareContextManager: Token analysis', {
        maxTokens: this.config.maxTokens,
        reservedTokens: this.config.reservedTokens,
        newMessageTokens,
        availableTokens,
        currentMessages: sessionContext.conversationHistory.length
      });
      
      // Score message importance
      const scoredMessages = await this.scoreMessageImportance(sessionContext.conversationHistory);
      
      // Check if compression is needed
      let contextWindow: ContextWindow;
      
      if (sessionContext.tokenCount > availableTokens || 
          sessionContext.conversationHistory.length > this.config.summaryThreshold) {
        
        console.log('🗜️ Context compression needed');
        contextWindow = await this.compressContext(scoredMessages, availableTokens, sessionContext);
      } else {
        // No compression needed
        contextWindow = {
          messages: scoredMessages,
          systemPrompt: this.buildSystemPrompt(),
          totalTokens: sessionContext.tokenCount,
          compressionApplied: false
        };
      }
      
      // Enrich with cross-session memories if user is authenticated
      if (userId && userId !== 'anonymous' && newMessage) {
        contextWindow = await this.enrichWithCrossSessionContext(userId, contextWindow, newMessage);
      }
      
      return contextWindow;
      
    } catch (error) {
      console.error('❌ TokenAwareContextManager: Failed to get optimized context:', error);
      
      // Fallback context
      return {
        messages: [],
        systemPrompt: this.buildSystemPrompt(),
        totalTokens: 0,
        compressionApplied: false
      };
    }
  }

  /**
   * Score message importance using multiple factors
   */
  private async scoreMessageImportance(messages: any[]): Promise<Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    importance: MessageImportance;
    tokens: number;
  }>> {
    
    return messages.map((msg, index) => {
      const importance = this.calculateImportanceScore(msg, index, messages);
      const content = msg.content || msg.text || msg.message || '';
      const role = msg.role || (msg.isUser ? 'user' : 'assistant') || 'unknown';
      
      return {
        role,
        content,
        timestamp: msg.timestamp || new Date(),
        importance,
        tokens: this.estimateTokens(content)
      };
    });
  }

  /**
   * Calculate importance score for a message
   */
  private calculateImportanceScore(message: any, index: number, allMessages: any[]): MessageImportance {
    let score = 0;
    const reasons: string[] = [];
    
    // Handle different message formats
    const content = message.content || message.text || message.message || '';
    if (!content) {
      // Skip messages without content (system messages, metadata, etc.) - not an error
      return { score: 0.1, reasons: ['no-content'], category: 'low' };
    }
    
    // 1. Recency bonus (more recent = more important)
    const recencyBonus = Math.min(0.3, (allMessages.length - index) / allMessages.length);
    score += recencyBonus;
    if (recencyBonus > 0.2) reasons.push('recent');
    
    // 2. Length consideration (longer = potentially more important)
    const lengthScore = Math.min(0.2, content.length / 1000);
    score += lengthScore;
    if (lengthScore > 0.1) reasons.push('detailed');
    
    // 3. Content type analysis
    const contentLower = content.toLowerCase();
    
    // Questions are important
    if (content.includes('?') || contentLower.match(/^(what|how|why|when|where|who|which)/)) {
      score += 0.15;
      reasons.push('question');
    }
    
    // User preferences/personal info
    if (contentLower.match(/(my name is|i like|i prefer|remember that|i am)/)) {
      score += 0.25;
      reasons.push('personal_info');
    }
    
    // Tool usage/actions
    if (contentLower.match(/(create|generate|analyze|search|help|show|build)/)) {
      score += 0.2;
      reasons.push('action_request');
    }
    
    // Errors or confusion
    if (contentLower.match(/(error|problem|issue|wrong|confused|help)/)) {
      score += 0.2;
      reasons.push('problem_solving');
    }
    
    // Technical/educational content
    if (contentLower.match(/(explain|learn|understand|concept|definition)/)) {
      score += 0.15;
      reasons.push('educational');
    }
    
    // 4. Role consideration
    if (message.role === 'user') {
      score += 0.1; // User messages slightly more important
      reasons.push('user_input');
    }
    
    // 5. First/last message bonus
    if (index === 0 || index === allMessages.length - 1) {
      score += 0.1;
      reasons.push(index === 0 ? 'conversation_start' : 'conversation_end');
    }
    
    // Normalize score to 0-1
    score = Math.min(1, Math.max(0, score));
    
    // Determine category
    let category: 'critical' | 'high' | 'medium' | 'low';
    if (score >= 0.8) category = 'critical';
    else if (score >= 0.6) category = 'high';
    else if (score >= 0.4) category = 'medium';
    else category = 'low';
    
    return {
      score,
      reasons,
      category
    };
  }

  /**
   * Compress context using intelligent strategies
   */
  private async compressContext(
    scoredMessages: any[], 
    availableTokens: number, 
    sessionContext: SessionContext
  ): Promise<ContextWindow> {
    
    console.log('🗜️ Starting context compression', {
      originalMessages: scoredMessages.length,
      availableTokens,
      totalTokens: sessionContext.tokenCount
    });
    
    // Strategy 1: Keep high importance messages
    const criticalMessages = scoredMessages.filter(m => m.importance.category === 'critical');
    const highMessages = scoredMessages.filter(m => m.importance.category === 'high');
    const recentMessages = scoredMessages.slice(-5); // Always keep last 5
    
    // Combine and deduplicate
    const importantMessages = [
      ...criticalMessages,
      ...highMessages,
      ...recentMessages
    ].filter((msg, index, arr) => 
      arr.findIndex(m => m.content === msg.content && m.timestamp === msg.timestamp) === index
    );
    
    let currentTokens = importantMessages.reduce((sum, msg) => sum + msg.tokens, 0);
    
    // Strategy 2: If still too many tokens, use LLM summarization
    if (currentTokens > availableTokens && scoredMessages.length > 10) {
      console.log('🤖 Using LLM summarization for context compression');
      
      // Summarize older messages (excluding recent ones)
      const messagesToSummarize = scoredMessages.slice(0, -5);
      const summary = await this.generateContextSummary(messagesToSummarize);
      
      const contextWindow: ContextWindow = {
        messages: [
          {
            role: 'assistant',
            content: `Previous conversation summary: ${summary}`,
            timestamp: new Date(),
            importance: { score: 0.9, reasons: ['context_summary'], category: 'critical' },
            tokens: this.estimateTokens(summary)
          },
          ...recentMessages
        ],
        systemPrompt: this.buildSystemPrompt(),
        totalTokens: this.estimateTokens(summary) + recentMessages.reduce((sum, msg) => sum + msg.tokens, 0),
        compressionApplied: true,
        summary
      };
      
      return contextWindow;
    }
    
    // Strategy 3: Just use important messages if no summarization needed
    const finalMessages = importantMessages
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()) // Chronological order
      .slice(0, Math.floor(availableTokens / 100)); // Rough token limit
    
    return {
      messages: finalMessages,
      systemPrompt: this.buildSystemPrompt(),
      totalTokens: finalMessages.reduce((sum, msg) => sum + msg.tokens, 0),
      compressionApplied: true
    };
  }

  /**
   * Generate context summary using LLM
   */
  private async generateContextSummary(messages: any[]): Promise<string> {
    try {
      const conversationText = messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
      
      const summaryPrompt = `Please provide a concise summary of this conversation that preserves the most important context, user preferences, and key information discussed:

${conversationText}

Focus on:
- User's stated preferences, goals, or personal information
- Key topics discussed
- Important decisions or conclusions reached
- Any ongoing tasks or projects mentioned

Summary:`;
      
      const result = await toolRegistry.execute('llm-completion', {
        prompt: summaryPrompt,
        model: 'accounts/fireworks/models/gpt-oss-120b',
        temperature: 0.3,
        maxTokens: 300
      }, {
        sessionId: 'summary-generation',
        userId: 'system',
        startTime: Date.now()
      });
      
      if (result.success) {
        const summary = result.data?.completion || result.data?.response || 'Unable to generate summary';
        console.log('✅ Generated context summary:', summary.substring(0, 100) + '...');
        return summary;
      }
      
      throw new Error(result.error || 'LLM summarization failed');
      
    } catch (error) {
      console.error('❌ Failed to generate context summary:', error);
      
      // Fallback: Simple extractive summary
      const importantMessages = messages
        .filter(msg => msg.content.length > 50)
        .slice(-3)
        .map(msg => `${msg.role}: ${msg.content.substring(0, 100)}...`)
        .join(' | ');
      
      return `Previous conversation included: ${importantMessages}`;
    }
  }

  /**
   * Accurate token counting using tiktoken
   */
  private estimateTokens(text: string): number {
    if (!text) return 0;
    
    try {
      if (this.tokenizer) {
        // Use actual tokenizer for accurate count
        const tokens = this.tokenizer.encode(text);
        return tokens.length;
      }
    } catch (error) {
      console.warn('❌ Tokenizer failed, using estimation:', error);
    }
    
    // Fallback to improved estimation
    const words = text.trim().split(/\s+/);
    const avgTokensPerWord = 1.3; // Empirical average for English
    const punctuationTokens = (text.match(/[.,!?;:]/g) || []).length * 0.5;
    
    return Math.ceil(words.length * avgTokensPerWord + punctuationTokens);
  }

  /**
   * Enrich context with cross-session memories
   */
  async enrichWithCrossSessionContext(
    userId: string, 
    currentContext: ContextWindow,
    query: string
  ): Promise<ContextWindow> {
    try {
      if (!this.vectorDB || !userId || userId === 'anonymous') {
        return currentContext;
      }

      console.log('🔍 Enriching context with cross-session memories');

      // Retrieve relevant memories from vector DB
      const relevantMemories = await this.vectorDB.semanticSearch(query, undefined, userId, 5);
      
      if (!relevantMemories || relevantMemories.length === 0) {
        return currentContext;
      }

      // Calculate available token budget for memories
      const memoryTokenBudget = Math.min(
        500, // Max tokens for memories
        this.config.maxTokens - currentContext.totalTokens - this.config.reservedTokens
      );
      
      if (memoryTokenBudget <= 0) {
        console.log('⚠️ No token budget for cross-session memories');
        return currentContext;
      }

      // Format memories within token budget
      const memoriesText = this.formatMemories(relevantMemories, memoryTokenBudget);
      
      if (memoriesText) {
        const memoryTokens = this.estimateTokens(memoriesText);
        
        // Add memories as high-priority context
        currentContext.messages.unshift({
          role: 'assistant',
          content: `🧠 Relevant context from previous conversations: ${memoriesText}`,
          timestamp: new Date(),
          importance: { 
            score: 0.9, 
            reasons: ['cross_session_memory'], 
            category: 'critical' 
          },
          tokens: memoryTokens
        });
        
        currentContext.totalTokens += memoryTokens;
        
        console.log(`✅ Added ${relevantMemories.length} cross-session memories (${memoryTokens} tokens)`);
      }
      
      return currentContext;
      
    } catch (error) {
      console.error('❌ Failed to enrich with cross-session context:', error);
      return currentContext;
    }
  }

  /**
   * Format memories within token budget
   */
  private formatMemories(memories: any[], tokenBudget: number): string {
    if (!memories.length) return '';
    
    let formattedMemories = [];
    let currentTokens = 0;
    
    for (const memory of memories) {
      const content = memory.content || memory.value || '';
      const category = memory.knowledge_type || memory.category || 'general';
      const formatted = `• [${category}] ${content}`;
      const tokens = this.estimateTokens(formatted);
      
      if (currentTokens + tokens <= tokenBudget) {
        formattedMemories.push(formatted);
        currentTokens += tokens;
      } else {
        break;
      }
    }
    
    return formattedMemories.join('\n');
  }

  /**
   * Get tool-specific context optimization
   */
  async getToolContext(
    sessionId: string,
    toolName: string,
    _toolParams: any,
    userId?: string
  ): Promise<ContextWindow> {
    try {
      console.log(`🔧 Getting tool-specific context for: ${toolName}`);
      
      const baseContext = await this.getOptimizedContext(sessionId, userId);
      
      // Tool-specific context modifications
      switch(toolName) {
        case 'create-document':
        case 'document-canvas':
          // Keep document-related messages and user preferences
          baseContext.messages = baseContext.messages.filter(msg => 
            msg.importance.reasons.includes('document_creation') ||
            msg.content.toLowerCase().includes('document') ||
            msg.content.toLowerCase().includes('write') ||
            msg.content.toLowerCase().includes('create') ||
            msg.importance.category === 'critical' ||
            msg.importance.category === 'high'
          );
          console.log(`📄 Document context: ${baseContext.messages.length} relevant messages`);
          break;
          
        case 'web-search':
        case 'serper-search':
          // Minimize context for search - just recent queries and critical info
          baseContext.messages = baseContext.messages.filter(msg =>
            msg.importance.category === 'critical' ||
            msg.content.includes('?') || // Questions
            msg.timestamp.getTime() > Date.now() - (5 * 60 * 1000) // Last 5 minutes
          ).slice(-5);
          console.log(`🔍 Search context: ${baseContext.messages.length} relevant messages`);
          break;
          
        case 'create-chart':
        case 'chart-canvas':
          // Keep data-related messages and numerical content
          baseContext.messages = baseContext.messages.filter(msg =>
            msg.content.match(/\d+/) || // Contains numbers
            msg.content.toLowerCase().includes('data') ||
            msg.content.toLowerCase().includes('chart') ||
            msg.content.toLowerCase().includes('graph') ||
            msg.importance.reasons.includes('data_analysis') ||
            msg.importance.category === 'critical'
          );
          console.log(`📊 Chart context: ${baseContext.messages.length} relevant messages`);
          break;
          
        case 'code-execution':
        case 'python-execution':
          // Keep code-related messages
          baseContext.messages = baseContext.messages.filter(msg =>
            msg.content.includes('```') || // Code blocks
            msg.content.toLowerCase().includes('code') ||
            msg.content.toLowerCase().includes('function') ||
            msg.content.toLowerCase().includes('variable') ||
            msg.importance.category === 'critical'
          );
          console.log(`💻 Code context: ${baseContext.messages.length} relevant messages`);
          break;
          
        default:
          // For unknown tools, use full optimized context
          console.log(`🔧 Default context for ${toolName}: ${baseContext.messages.length} messages`);
          break;
      }
      
      // Recalculate tokens after filtering
      baseContext.totalTokens = baseContext.messages.reduce((sum, msg) => sum + msg.tokens, 0);
      
      return baseContext;
      
    } catch (error) {
      console.error(`❌ Failed to get tool context for ${toolName}:`, error);
      return await this.getOptimizedContext(sessionId, userId);
    }
  }

  /**
   * Stream optimized context with priority ordering
   */
  async *streamOptimizedContext(
    sessionId: string,
    userId?: string
  ): AsyncGenerator<Partial<ContextWindow>> {
    try {
      console.log('🌊 Streaming optimized context with priority ordering');
      
      // 1. Yield system prompt immediately
      yield {
        systemPrompt: this.buildSystemPrompt(),
        messages: [],
        totalTokens: 0,
        compressionApplied: false
      };
      
      // 2. Get full context
      const context = await this.getOptimizedContext(sessionId, userId);
      
      // 3. Stream critical messages first
      const criticalMessages = context.messages.filter(m => 
        m.importance.category === 'critical'
      );
      
      if (criticalMessages.length > 0) {
        yield { 
          messages: criticalMessages,
          totalTokens: criticalMessages.reduce((sum, m) => sum + m.tokens, 0)
        };
        console.log(`🚨 Streamed ${criticalMessages.length} critical messages`);
      }
      
      // 4. Then high importance
      const highMessages = context.messages.filter(m => 
        m.importance.category === 'high'
      );
      
      if (highMessages.length > 0) {
        yield { 
          messages: [...criticalMessages, ...highMessages],
          totalTokens: [...criticalMessages, ...highMessages].reduce((sum, m) => sum + m.tokens, 0)
        };
        console.log(`⚡ Streamed ${highMessages.length} high importance messages`);
      }
      
      // 5. Finally, yield complete context
      yield context;
      console.log('✅ Streaming complete');
      
    } catch (error) {
      console.error('❌ Failed to stream context:', error);
      
      // Fallback: yield minimal context
      yield {
        systemPrompt: this.buildSystemPrompt(),
        messages: [],
        totalTokens: 0,
        compressionApplied: false
      };
    }
  }

  /**
   * Build system prompt
   */
  private buildSystemPrompt(): string {
    return `You are NeuraPlay AI, an intelligent educational assistant. You have access to conversation history and context. Respond helpfully and conversationally.`;
  }

  /**
   * Update token config
   */
  updateConfig(newConfig: Partial<TokenConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('📝 TokenAwareContextManager: Config updated', this.config);
  }
}

export const tokenAwareContextManager = TokenAwareContextManager.getInstance();
