/**
 * SEARCH-CHAT INTEGRATION SERVICE
 * 
 * Makes AI contextually aware of search results for natural conversation.
 * Enables users to discuss articles and search findings directly in chat.
 */

import { SearchContext, SearchResult } from './WebSearchEngine';
import { UnifiedMemoryManager } from './UnifiedMemoryManager';

export interface ChatSearchContext {
  recentSearches: SearchContext[];
  relevantArticles: SearchResult[];
  searchSummary: string;
  conversationHooks: string[];
}

export class SearchChatIntegration {
  private static instance: SearchChatIntegration;
  private memoryManager: UnifiedMemoryManager;

  private constructor() {
    this.memoryManager = UnifiedMemoryManager.getInstance();
  }

  static getInstance(): SearchChatIntegration {
    if (!SearchChatIntegration.instance) {
      SearchChatIntegration.instance = new SearchChatIntegration();
    }
    return SearchChatIntegration.instance;
  }

  /**
   * SEARCH CONTEXT FOR CHAT
   * Retrieves relevant search context to inject into chat AI prompts
   */
  async getSearchContextForChat(
    userId: string, 
    currentMessage: string,
    conversationHistory: string[] = []
  ): Promise<ChatSearchContext> {
    try {
      // Get recent search memories with error handling
      let searchMemories: any[] = [];
      
      try {
        const memoryResult = await this.memoryManager.searchMemories({
          userId,
          query: currentMessage,
          filters: { memoryType: 'search_context' },
          limit: 5
        });
        
        // Handle both array and object responses
        if (Array.isArray(memoryResult)) {
          searchMemories = memoryResult;
        } else if (memoryResult && Array.isArray(memoryResult.memories)) {
          searchMemories = memoryResult.memories;
        } else {
          console.log('🔍 No search memories found for chat integration');
          searchMemories = [];
        }
      } catch (memoryError) {
        console.warn('🚨 Search memory retrieval failed:', memoryError);
        searchMemories = [];
      }

      // Extract relevant search contexts with ENHANCED CONTENT
      const recentSearches: SearchContext[] = [];
      const relevantArticles: SearchResult[] = [];

      for (const memory of searchMemories) {
        if (memory.metadata?.topResults) {
          relevantArticles.push(...memory.metadata.topResults.map((result: any) => ({
            title: result.title,
            url: result.url,
            snippet: result.snippet,
            source: new URL(result.url).hostname,
            relevanceScore: memory.similarity || 0.8,
            contentType: 'article' as const,
            // ENHANCED: Include full search context for richer AI awareness
            fullSearchQuery: memory.metadata?.query || '',
            searchType: memory.metadata?.searchType || 'web',
            timestamp: memory.metadata?.timestamp || new Date().toISOString(),
            // ENHANCED: Include more detailed content from memory
            detailedContent: memory.content || result.snippet,
            searchExplanation: memory.metadata?.searchExplanation || '',
            relatedTopics: this.extractTopicsFromContent(result.snippet + ' ' + result.title)
          })));
        }
        
        // ENHANCED: Also extract full search context objects
        if (memory.metadata?.searchType && memory.content) {
          // Only try to parse if content looks like JSON (starts with { or [)
          const contentStr = String(memory.content).trim();
          if (contentStr.startsWith('{') || contentStr.startsWith('[')) {
            try {
              const searchContextData = JSON.parse(contentStr);
              if (searchContextData.query && searchContextData.results) {
                recentSearches.push({
                  originalQuery: searchContextData.query,
                  searchType: memory.metadata.searchType,
                  results: searchContextData.results || [],
                  timestamp: new Date(memory.metadata.timestamp || Date.now()),
                  userId: userId,
                  sessionId: 'chat-integration',
                  explanation: memory.metadata?.searchExplanation || `Search about ${searchContextData.query}`,
                  suggestions: []
                });
              }
            } catch (parseError) {
              // Silently skip - content isn't valid JSON (likely plain text description)
            }
          }
        }
      }

      // Create conversation hooks
      const conversationHooks = this.generateConversationHooks(relevantArticles, currentMessage);

      // Generate search summary
      const searchSummary = this.generateSearchSummary(relevantArticles, searchMemories);

      return {
        recentSearches,
        relevantArticles: relevantArticles.slice(0, 5), // Limit to top 5
        searchSummary,
        conversationHooks
      };

    } catch (error) {
      console.error('🚨 Search context retrieval failed:', error);
      return {
        recentSearches: [],
        relevantArticles: [],
        searchSummary: '',
        conversationHooks: []
      };
    }
  }

  /**
   * INJECT SEARCH CONTEXT INTO AI PROMPT
   * Enhances AI prompts with relevant search context
   */
  injectSearchContext(
    originalPrompt: string,
    searchContext: ChatSearchContext,
    userMessage: string
  ): string {
    if (searchContext.relevantArticles.length === 0 && searchContext.recentSearches.length === 0) {
      return originalPrompt;
    }

    const searchContextSection = `

**🔍 COMPREHENSIVE SEARCH KNOWLEDGE BASE** (for intelligent conversation):

**SEARCH OVERVIEW:**
${searchContext.searchSummary}

**DETAILED ARTICLE KNOWLEDGE:**
${searchContext.relevantArticles.map((article, index) => {
  const detailedInfo = `
${index + 1}. **"${article.title}"**
   📍 Source: ${article.source} (${(article as any).timestamp ? new Date((article as any).timestamp).toLocaleDateString() : 'Recent'})
   🔍 Original Query: "${(article as any).fullSearchQuery || 'N/A'}"
   📝 Content Summary: ${article.snippet}
   ${(article as any).detailedContent && (article as any).detailedContent !== article.snippet ? 
     `📖 Additional Context: ${(article as any).detailedContent.substring(0, 300)}...` : ''}
   🏷️ Related Topics: ${(article as any).relatedTopics?.join(', ') || 'General'}
   🔗 URL: ${article.url}
   ⭐ Relevance: ${Math.round((article.relevanceScore || 0.8) * 100)}%`;
  return detailedInfo;
}).join('\n')}

**RECENT SEARCH CONTEXTS:**
${searchContext.recentSearches.map((search, index) => 
  `${index + 1}. Query: "${search.originalQuery}" (${search.searchType}) - ${search.explanation}`
).join('\n')}

**CONVERSATION CAPABILITIES:**
${searchContext.conversationHooks.join(' • ')}

**🤖 AI INSTRUCTIONS FOR NATURAL SEARCH INTEGRATION:**
- You have FULL ACCESS to all the above search content and context
- Reference specific articles, quotes, and findings naturally in conversation
- You can discuss details from the articles as if you've read them completely
- Compare information across different sources when relevant
- Ask intelligent follow-up questions based on the search findings
- Mention specific facts, statistics, or insights from the articles
- Connect search results to the user's current question or interest
- Be conversational and engaging - treat this as knowledge you possess
- Only reference search content when it's genuinely relevant to the user's message
- You can quote directly from articles and provide source attribution

**CURRENT USER MESSAGE:** "${userMessage}"

`;

    return originalPrompt + searchContextSection;
  }

  /**
   * GENERATE CONVERSATION HOOKS
   * Creates natural conversation starters based on search results
   */
  private generateConversationHooks(articles: SearchResult[], currentMessage: string): string[] {
    const hooks: string[] = [];
    
    if (articles.length === 0) return hooks;

    // Topic-based hooks
    const topics = this.extractTopics(articles);
    topics.forEach(topic => {
      hooks.push(`Ask about ${topic}`);
      hooks.push(`Discuss ${topic} further`);
    });

    // Source-based hooks
    const sources = [...new Set(articles.map(a => a.source))];
    if (sources.length > 1) {
      hooks.push(`Compare perspectives from different sources`);
    }

    // Time-based hooks
    if (currentMessage.includes('2025') || currentMessage.includes('recent')) {
      hooks.push(`Discuss latest developments`);
      hooks.push(`Compare with historical context`);
    }

    return hooks.slice(0, 4); // Limit to 4 hooks
  }

  /**
   * GENERATE SEARCH SUMMARY
   * Creates a concise summary of relevant search findings
   */
  private generateSearchSummary(articles: SearchResult[], memories: any[]): string {
    if (articles.length === 0) return '';

    const topics = this.extractTopics(articles);
    const sources = [...new Set(articles.map(a => a.source))];
    
    return `You have access to ${articles.length} relevant articles covering ${topics.join(', ')} from sources like ${sources.slice(0, 3).join(', ')}. You can naturally reference and discuss these findings in conversation.`;
  }

  /**
   * EXTRACT TOPICS FROM CONTENT
   * Enhanced topic extraction for individual content pieces
   */
  private extractTopicsFromContent(content: string): string[] {
    const text = content.toLowerCase();
    const topics: string[] = [];
    
    // Enhanced keyword patterns for better topic extraction
    const topicPatterns = [
      /\b(artificial intelligence|ai|machine learning|ml)\b/g,
      /\b(climate change|global warming|environment)\b/g,
      /\b(cryptocurrency|bitcoin|blockchain)\b/g,
      /\b(technology|tech|innovation)\b/g,
      /\b(politics|government|policy)\b/g,
      /\b(health|medical|healthcare)\b/g,
      /\b(business|economy|financial)\b/g,
      /\b(science|research|study)\b/g,
      /\b(education|learning|school)\b/g,
      /\b(sports|entertainment|culture)\b/g
    ];
    
    const topicNames = [
      'AI & Technology', 'Climate & Environment', 'Cryptocurrency', 'Technology',
      'Politics & Policy', 'Health & Medicine', 'Business & Economy', 'Science & Research',
      'Education', 'Sports & Culture'
    ];
    
    topicPatterns.forEach((pattern, index) => {
      if (pattern.test(text)) {
        topics.push(topicNames[index]);
      }
    });
    
    // Fallback: extract capitalized words as potential topics
    if (topics.length === 0) {
      const capitalizedWords = content.match(/\b[A-Z][a-z]+\b/g) || [];
      topics.push(...capitalizedWords.slice(0, 3));
    }
    
    return [...new Set(topics)]; // Remove duplicates
  }

  /**
   * EXTRACT TOPICS
   * Extracts main topics from article titles and snippets
   */
  private extractTopics(articles: SearchResult[]): string[] {
    const text = articles.map(a => a.title + ' ' + a.snippet).join(' ').toLowerCase();
    
    // Simple keyword extraction (could be enhanced with NLP)
    const commonTopics = [
      'trump', 'israel', 'qatar', 'politics', 'economy', 'technology', 
      'climate', 'health', 'sports', 'entertainment', 'business', 'science'
    ];
    
    const foundTopics = commonTopics.filter(topic => text.includes(topic));
    
    // Add title-based topics
    articles.forEach(article => {
      const titleWords = article.title.toLowerCase().split(' ');
      titleWords.forEach(word => {
        if (word.length > 4 && !foundTopics.includes(word)) {
          foundTopics.push(word);
        }
      });
    });

    return foundTopics.slice(0, 3); // Top 3 topics
  }

  /**
   * MARK ARTICLE AS DISCUSSED
   * Tracks which articles have been discussed in conversation
   */
  async markArticleDiscussed(userId: string, articleUrl: string, conversationContext: string): Promise<void> {
    try {
      await this.memoryManager.storeMemory({
        userId,
        key: `discussed_${Date.now()}`,
        content: `Discussed article: ${articleUrl}. Context: ${conversationContext}`,
        memoryType: 'article_discussion',
        importance: 0.6,
        metadata: {
          articleUrl,
          discussedAt: new Date().toISOString(),
          context: conversationContext
        }
      });
    } catch (error) {
      console.error('🚨 Failed to mark article as discussed:', error);
    }
  }
}

export const searchChatIntegration = SearchChatIntegration.getInstance();
