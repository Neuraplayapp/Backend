/**
 * WEB SEARCH ENGINE - Comprehensive Search Intelligence System
 * 
 * Features:
 * 1. Natural language search explanations
 * 2. LLM-generated contextual suggestions 
 * 3. Search context memory for conversation continuity
 * 4. Small suggestion cards with follow-up searches
 * 5. Multi-modal search orchestration
 */

import { UnifiedMemoryManager } from './UnifiedMemoryManager';
import { perplexityStyleFormatter, PerplexityResponse } from './PerplexityStyleFormatter';
import { dynamicSuggestionEngine, DynamicSuggestion } from './DynamicSuggestionEngine';
import { apiService } from './APIService';

export interface SearchContext {
  originalQuery: string;
  searchType: 'web' | 'semantic' | 'intelligent' | 'news';
  results: SearchResult[];
  timestamp: Date;
  userId: string;
  sessionId: string;
  explanation: string;
  suggestions: SearchSuggestion[];
  perplexityResponse?: PerplexityResponse;
  images?: Array<{ title: string; imageUrl: string; link: string; source: string }>;
}

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  source: string;
  relevanceScore: number;
  contentType: 'article' | 'news' | 'academic' | 'reference' | 'discussion';
}

export interface SearchSuggestion {
  query: string;
  reasoning: string;
  type: 'follow_up' | 'related' | 'deeper' | 'broader';
  confidence: number;
}

export interface SearchExplanation {
  whatSearched: string;
  whySearched: string;
  resultsFound: number;
  searchStrategy: string;
  nextSteps: string[];
}

export class WebSearchEngine {
  private static instance: WebSearchEngine;
  private memoryManager: UnifiedMemoryManager;
  private searchHistory: Map<string, SearchContext[]> = new Map();

  private constructor() {
    this.memoryManager = UnifiedMemoryManager.getInstance();
  }

  static getInstance(): WebSearchEngine {
    if (!WebSearchEngine.instance) {
      WebSearchEngine.instance = new WebSearchEngine();
    }
    return WebSearchEngine.instance;
  }

  /**
   * MAIN SEARCH ORCHESTRATOR
   * Executes search with full context awareness and suggestion generation
   */
  async executeSearch(params: {
    query: string;
    userId: string;
    sessionId: string;
    searchType?: 'auto' | 'web' | 'semantic' | 'intelligent';
    conversationContext?: string[];
  }): Promise<SearchContext> {
    console.log('🔍 WebSearchEngine: Executing contextual search:', params);

    // Step 1: Analyze search intent and generate explanation
    const searchAnalysis = await this.analyzeSearchIntent(params.query, params.conversationContext);
    
    // Step 2: Determine optimal search strategy
    const searchType = params.searchType === 'auto' 
      ? await this.determineSearchStrategy(params.query, searchAnalysis)
      : params.searchType || 'web';

    // Step 3: Execute the search
    const searchResponse = await this.performSearchWithImages(params.query, searchType);

    // Step 4: Generate smart, interest-based suggestions
    const suggestions = await dynamicSuggestionEngine.generateDynamicSuggestions(
      params.userId,
      params.query,
      searchResponse.results,
      params.conversationContext || []
    );

    // Step 5: Create search context
    const searchContext: SearchContext = {
      originalQuery: params.query,
      searchType,
      results: searchResponse.results,
      timestamp: new Date(),
      userId: params.userId,
      sessionId: params.sessionId,
      explanation: searchAnalysis.explanation,
      suggestions,
      images: searchResponse.images
    };

    // Step 6: Generate professional Perplexity-style response
    if (searchResponse.results.length > 0) {
      try {
        const perplexityResponse = await perplexityStyleFormatter.formatSearchResponse(
          params.query,
          searchContext,
          params.conversationContext
        );
        searchContext.perplexityResponse = perplexityResponse;
      } catch (error) {
        console.error('🚨 Perplexity formatting failed:', error);
      }
    }

    // Step 7: Store in memory for conversation continuity
    await this.storeSearchContext(searchContext);

    return searchContext;
  }

  /**
   * SEARCH INTENT ANALYSIS
   * Uses LLM to understand what user wants and explain the search strategy
   */
  private async analyzeSearchIntent(query: string, context?: string[]): Promise<{
    explanation: string;
    intent: 'factual' | 'current_events' | 'research' | 'comparison' | 'how_to' | 'definition';
    complexity: 'simple' | 'moderate' | 'complex';
    domain: string;
  }> {
    const contextString = context ? context.slice(-3).join('\n') : '';
    
    const prompt = `You are a search intelligence expert. Analyze this search query and provide a natural explanation.

CONTEXT (last 3 messages):
${contextString}

SEARCH QUERY: "${query}"

Return JSON with:
{
  "explanation": "Natural language explanation of what I'm searching for and why",
  "intent": "factual|current_events|research|comparison|how_to|definition", 
  "complexity": "simple|moderate|complex",
  "domain": "technology|science|news|entertainment|business|general|etc"
}

Example explanations:
- "I'm searching for current information about Trump and Israel in 2025 to understand recent political developments"
- "Looking up technical documentation about React hooks to help with development questions"
- "Finding comprehensive research on climate change to provide detailed analysis"`;

    // SIMPLIFIED: Skip LLM analysis and use heuristic approach
    console.log('🚨 Using fallback search intent analysis');
    
    return {
      explanation: `I'm searching for information about "${query}" to help answer your question.`,
      intent: query.toLowerCase().includes('news') || query.toLowerCase().includes('2025') || query.toLowerCase().includes('recent') ? 'current_events' : 'factual',
      complexity: query.length > 50 || query.split(' ').length > 8 ? 'complex' : 'simple',
      domain: this.detectDomain(query)
    };
  }

  /**
   * SEARCH STRATEGY DETERMINATION
   * Decides the best search approach based on intent analysis
   */
  private async determineSearchStrategy(query: string, analysis: any): Promise<'web' | 'semantic' | 'intelligent'> {
    // Deep research triggers
    if (analysis.complexity === 'complex' || 
        /\b(research|analyze|investigate|study|comprehensive)\b/i.test(query)) {
      return 'intelligent';
    }
    
    // Current events and news
    if (analysis.intent === 'current_events' || 
        /\b(news|latest|current|recent|2025|today|breaking)\b/i.test(query)) {
      return 'web';
    }
    
    // Default to web search for most queries
    return 'web';
  }

  /**
   * SEARCH EXECUTION WITH IMAGES
   * Performs the actual search using the determined strategy and includes images
   */
  private async performSearchWithImages(query: string, searchType: string): Promise<{ results: SearchResult[]; images: Array<{ title: string; imageUrl: string; link: string; source: string }> }> {
    try {
      // Use the existing tool registry with proper context
      const { toolRegistry } = await import('./ToolRegistry');
      let searchResponse;
      
      // Create proper execution context
      const executionContext = {
        userId: 'search-engine',
        sessionId: 'search-session',
        startTime: Date.now(),
        timestamp: new Date().toISOString()
      };
      
      switch (searchType) {
        case 'intelligent':
          // Use IntelligentSearchService for deep research
          try {
            searchResponse = await toolRegistry.execute('intelligent-search', {
              query,
              depth: 'comprehensive'
            }, executionContext);
          } catch (intelligentError) {
            console.warn('🚨 Intelligent search failed, falling back to web search:', intelligentError);
            searchResponse = await toolRegistry.execute('web-search', {
              query,
              numResults: 8
            }, executionContext);
          }
          break;
          
        case 'web':
        default:
          // Use web search for real-time results
          searchResponse = await toolRegistry.execute('web-search', {
            query,
            numResults: 8
          }, executionContext);
          break;
      }

      // Extract results and images from the response
      const responseData = searchResponse.data || searchResponse;
      const results = this.transformSearchResults(responseData);
      const images = this.extractImages(responseData);

      console.log(`🔍 WebSearchEngine: Found ${results.length} results and ${images.length} images`);
      console.log(`🖼️ WebSearchEngine: Image extraction from response data`, { 
        hasImages: images.length > 0, 
        sampleImage: images[0],
        responseDataKeys: Object.keys(responseData || {})
      });

      return { results, images };
      
    } catch (error) {
      console.error('🚨 Search execution failed:', error);
      return { results: [], images: [] };
    }
  }

  /**
   * LEGACY SEARCH EXECUTION (kept for compatibility)
   * Performs the actual search using the determined strategy
   */
  private async performSearch(query: string, searchType: string): Promise<SearchResult[]> {
    try {
      // Use the existing tool registry with proper context
      const { toolRegistry } = await import('./ToolRegistry');
      let searchResponse;
      
      // Create proper execution context
      const executionContext = {
        userId: 'search-engine',
        sessionId: 'search-session',
        startTime: Date.now(),
        timestamp: new Date().toISOString()
      };
      
      switch (searchType) {
        case 'intelligent':
          // Use IntelligentSearchService for deep research
          try {
            searchResponse = await toolRegistry.execute('intelligent-search', {
              query,
              depth: 'comprehensive'
            }, executionContext);
          } catch (intelligentError) {
            console.warn('🚨 Intelligent search failed, falling back to web search:', intelligentError);
            searchResponse = await toolRegistry.execute('web-search', {
              query,
              numResults: 8
            }, executionContext);
          }
          break;
          
        case 'web':
        default:
          // Use web search for real-time results
          searchResponse = await toolRegistry.execute('web-search', {
            query,
            numResults: 8
          }, executionContext);
          break;
      }

      // Transform tool response to standardized format
      return this.transformSearchResults(searchResponse.data || searchResponse);
      
    } catch (error) {
      console.error('🚨 Search execution failed:', error);
      return [];
    }
  }

  /**
   * SUGGESTION GENERATION
   * Creates contextual follow-up search suggestions using LLM
   */
  private async generateSearchSuggestions(
    originalQuery: string, 
    results: SearchResult[], 
    searchHistory: SearchContext[]
  ): Promise<SearchSuggestion[]> {
    const recentSearches = searchHistory.slice(-3).map(ctx => ctx.originalQuery).join(', ');
    const resultSummary = results.slice(0, 3).map(r => r.title).join('; ');

    const prompt = `You are a search suggestion expert. Generate helpful follow-up searches.

ORIGINAL SEARCH: "${originalQuery}"
RECENT SEARCHES: ${recentSearches}
TOP RESULTS FOUND: ${resultSummary}

Generate 3-4 smart follow-up search suggestions as JSON array:
[
  {
    "query": "specific search query",
    "reasoning": "why this search would be helpful",
    "type": "follow_up|related|deeper|broader",
    "confidence": 0.8
  }
]

Types:
- follow_up: Natural next question based on results
- related: Connected topics of interest  
- deeper: More detailed investigation
- broader: Wider context or comparison

Make suggestions SHORT (2-5 words) and actionable.`;

    try {
      // Use dynamic import with multiple fallback patterns
      const apiServiceInstance = apiService || await import('./APIService').then(m => m.apiService);
      if (!apiServiceInstance || typeof apiServiceInstance.post !== 'function') {
        console.warn('🚨 APIService not properly initialized, using fallback for suggestions');
        return this.generateFallbackSuggestions(originalQuery);
      }
      
      const response = await apiServiceInstance.post('/api/unified-route', {
        service: 'fireworks',
        endpoint: 'llm-completion',
        data: {
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 300,
          temperature: 0.7,
          model: 'accounts/fireworks/models/gpt-oss-120b'
        }
      });

      return JSON.parse(response.data.choices[0].message.content);
    } catch (error) {
      console.error('🚨 Suggestion generation failed:', error);
      return this.generateFallbackSuggestions(originalQuery);
    }
  }

  /**
   * SEARCH CONTEXT STORAGE
   * Stores search context for conversation continuity
   */
  private async storeSearchContext(context: SearchContext): Promise<void> {
    try {
      // Validate required fields for memory storage
      if (!context.userId || !context.originalQuery || !context.results) {
        console.warn('🚨 Invalid context for memory storage, skipping...');
        return;
      }

      // FIXED: Store in memory for AI context with proper validation and error handling
      const userId = String(context.userId || 'anonymous');
      const sessionId = String(context.sessionId || 'default');
      const contentStr = `Searched for "${context.originalQuery}". Found ${context.results.length} results about ${context.explanation || 'the topic'}. Top results: ${context.results.slice(0, 3).map(r => r.title || 'Untitled').join(', ')}. Suggestions: ${(context.suggestions || []).map(s => s.query || 'suggestion').join(', ')}`;
      
      // Build proper UnifiedMemoryRequest structure
      const memoryRequest = {
        userId,
        sessionId,
        query: context.originalQuery,
        action: 'store' as const,
        data: {
          key: `search_${Date.now()}_${userId}`,
          content: contentStr,
          memoryType: 'search_context',
          importance: 0.7,
          metadata: {
            searchType: String(context.searchType || 'web'),
            resultCount: Number(context.results?.length || 0),
            timestamp: context.timestamp?.toISOString() || new Date().toISOString(),
            query: String(context.originalQuery || ''),
            topResults: (context.results || []).slice(0, 3).map(r => ({
              title: String(r?.title || 'Untitled'),
              url: String(r?.url || ''),
              snippet: String(r?.snippet || '').substring(0, 100)
            }))
          }
        }
      };

      // Additional validation before storage
      if (!memoryRequest.data?.content || !memoryRequest.userId) {
        console.error('🚨 Memory data validation failed - missing required fields');
        return;
      }

      await this.memoryManager.storeMemory(memoryRequest);
      console.log('✅ Search context stored in memory for AI awareness');
    } catch (error) {
      console.error('🚨 Search context storage failed:', error);
      // Don't throw error - this is optional functionality
    }

    // Store in local cache for quick access
    if (!this.searchHistory.has(context.userId)) {
      this.searchHistory.set(context.userId, []);
    }
    
    const userHistory = this.searchHistory.get(context.userId)!;
    userHistory.push(context);
    
    // Keep only last 10 searches per user
    if (userHistory.length > 10) {
      userHistory.shift();
    }
  }

  /**
   * CONVERSATION CONTEXT INTEGRATION
   * Retrieves search context for AI conversation continuity
   */
  async getSearchContextForConversation(userId: string, query?: string): Promise<{
    recentSearches: SearchContext[];
    relevantContext: string;
    suggestions: SearchSuggestion[];
  }> {
    const recentSearches = this.getSearchHistory(userId).slice(-3);
    
    let relevantContext = '';
    let suggestions: SearchSuggestion[] = [];
    
    if (recentSearches.length > 0) {
      const lastSearch = recentSearches[recentSearches.length - 1];
      relevantContext = `Recent search context: ${lastSearch.explanation}. Found ${lastSearch.results.length} results.`;
      suggestions = lastSearch.suggestions;
    }

    return { recentSearches, relevantContext, suggestions };
  }

  /**
   * DOMAIN DETECTION
   * Simple heuristic domain detection
   */
  private detectDomain(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('trump') || lowerQuery.includes('election') || lowerQuery.includes('politics')) return 'politics';
    if (lowerQuery.includes('tech') || lowerQuery.includes('ai') || lowerQuery.includes('software')) return 'technology';
    if (lowerQuery.includes('health') || lowerQuery.includes('medical') || lowerQuery.includes('covid')) return 'health';
    if (lowerQuery.includes('business') || lowerQuery.includes('economy') || lowerQuery.includes('market')) return 'business';
    if (lowerQuery.includes('sports') || lowerQuery.includes('game') || lowerQuery.includes('team')) return 'sports';
    if (lowerQuery.includes('science') || lowerQuery.includes('research') || lowerQuery.includes('study')) return 'science';
    
    return 'general';
  }

  /**
   * UTILITY METHODS
   */
  private getSearchHistory(userId: string): SearchContext[] {
    return this.searchHistory.get(userId) || [];
  }

  private transformSearchResults(apiResponse: any): SearchResult[] {
    // Handle different API response formats
    const results = apiResponse?.data?.data?.data?.results || 
                   apiResponse?.data?.data?.results || 
                   apiResponse?.data?.results || 
                   apiResponse?.results || [];

    return results.map((result: any, index: number) => ({
      title: result.title || 'Untitled',
      snippet: result.snippet || result.description || '',
      url: result.link || result.url || '',
      source: result.displayLink || result.source || 'Unknown',
      relevanceScore: (results.length - index) / results.length,
      contentType: this.detectContentType(result.title, result.snippet)
    }));
  }

  /**
   * EXTRACT IMAGES FROM SERPER RESPONSE
   * Handles nested response structures from tool registry
   */
  private extractImages(apiResponse: any): Array<{ title: string; imageUrl: string; link: string; source: string }> {
    console.log('🖼️ WebSearchEngine: Extracting images from API response');
    console.log('🖼️ Response structure:', JSON.stringify(apiResponse, null, 2).substring(0, 500));
    
    // Check multiple possible locations for images in the nested response structure
    let images: any[] = [];
    
    // Try different nesting levels (Serper response gets wrapped by tool registry)
    if (apiResponse?.data?.data?.data?.images && Array.isArray(apiResponse.data.data.data.images)) {
      images = apiResponse.data.data.data.images;
      console.log('🖼️ Found images at data.data.data.images:', images.length);
    } else if (apiResponse?.data?.data?.images && Array.isArray(apiResponse.data.data.images)) {
      images = apiResponse.data.data.images;
      console.log('🖼️ Found images at data.data.images:', images.length);
    } else if (apiResponse?.data?.images && Array.isArray(apiResponse.data.images)) {
      images = apiResponse.data.images;
      console.log('🖼️ Found images at data.images:', images.length);
    } else if (apiResponse?.images && Array.isArray(apiResponse.images)) {
      images = apiResponse.images;
      console.log('🖼️ Found images at root level:', images.length);
    }
    
    // Transform to standardized format
    return images.map((img: any) => ({
      title: img.title || img.alt || 'Image',
      imageUrl: img.imageUrl || img.image || img.url || img.link || '',
      link: img.link || img.source || img.pageUrl || '',
      source: img.source || img.domain || this.extractDomain(img.link || img.source || '')
    })).filter(img => img.imageUrl); // Filter out invalid images
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'Unknown';
    }
  }

  private detectContentType(title: string, snippet: string): 'article' | 'news' | 'academic' | 'reference' | 'discussion' {
    const text = (title + ' ' + snippet).toLowerCase();
    
    if (text.includes('breaking') || text.includes('news') || text.includes('today')) return 'news';
    if (text.includes('research') || text.includes('study') || text.includes('journal')) return 'academic';
    if (text.includes('wikipedia') || text.includes('definition') || text.includes('what is')) return 'reference';
    if (text.includes('reddit') || text.includes('forum') || text.includes('discussion')) return 'discussion';
    
    return 'article';
  }

  private generateFallbackSuggestions(query: string): SearchSuggestion[] {
    return [
      {
        query: `${query} 2025`,
        reasoning: 'Get current year information',
        type: 'follow_up',
        confidence: 0.7
      },
      {
        query: `${query} explained`,
        reasoning: 'Get detailed explanation',
        type: 'deeper',
        confidence: 0.6
      },
      {
        query: `${query} news`,
        reasoning: 'Find recent news',
        type: 'related',
        confidence: 0.8
      }
    ];
  }
}

export const webSearchEngine = WebSearchEngine.getInstance();
