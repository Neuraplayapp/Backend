/**
 * NEWS ORCHESTRATOR - Systematic Multi-Category News Discovery
 * 
 * Features:
 * - Detects generic news requests ("what's the news", "give me the news")
 * - Searches multiple high-priority news categories systematically
 * - Aggregates and ranks stories by relevance and recency
 * - Provides comprehensive news overview with diverse perspectives
 */

import { webSearchEngine, SearchContext } from './WebSearchEngine';
import { perplexityStyleFormatter, PerplexityResponse } from './PerplexityStyleFormatter';

export interface NewsCategory {
  name: string;
  searchQueries: string[];
  priority: number;
  description: string;
}

export interface ComprehensiveNewsResponse {
  categories: NewsCategory[];
  stories: NewsStory[];
  summary: string;
  totalResults: number;
  searchTime: number;
  perplexityResponse?: PerplexityResponse;
  images: Array<{ title: string; imageUrl: string; link: string; source: string }>; // Always included, even if empty array
}

export interface NewsStory {
  title: string;
  snippet: string;
  url: string;
  source: string;
  category: string;
  timestamp?: string;
  relevanceScore: number;
  isBreaking: boolean;
}

export class NewsOrchestrator {
  private static instance: NewsOrchestrator;

  // High-priority news categories for systematic search
  private readonly NEWS_CATEGORIES: NewsCategory[] = [
    {
      name: 'Breaking News',
      searchQueries: ['breaking news today', 'urgent news latest'],
      priority: 10,
      description: 'Urgent and developing stories'
    },
    {
      name: 'World Politics',
      searchQueries: ['world politics news today', 'international diplomatic news'],
      priority: 9,
      description: 'Global political developments and diplomacy'
    },
    {
      name: 'US Politics',
      searchQueries: ['US politics news today', 'Washington political news'],
      priority: 9,
      description: 'American political news and policy'
    },
    {
      name: 'Climate & Environment',
      searchQueries: ['climate change news today', 'environmental crisis news'],
      priority: 8,
      description: 'Environmental developments and climate action'
    },
    {
      name: 'Technology',
      searchQueries: ['technology news today', 'AI tech developments news'],
      priority: 8,
      description: 'Tech innovation and AI developments'
    },
    {
      name: 'Global Economy',
      searchQueries: ['global economy news today', 'financial markets news'],
      priority: 7,
      description: 'Economic trends and market developments'
    },
    {
      name: 'Health & Science',
      searchQueries: ['health science news today', 'medical research breakthrough'],
      priority: 7,
      description: 'Medical advances and scientific discoveries'
    },
    {
      name: 'Social Issues',
      searchQueries: ['social justice news today', 'human rights developments'],
      priority: 6,
      description: 'Social movements and human rights'
    }
  ];

  static getInstance(): NewsOrchestrator {
    if (!NewsOrchestrator.instance) {
      NewsOrchestrator.instance = new NewsOrchestrator();
    }
    return NewsOrchestrator.instance;
  }

  /**
   * MAIN NEWS ORCHESTRATION
   * Detects news intent and executes systematic multi-category search
   */
  async orchestrateNewsSearch(params: {
    query: string;
    userId: string;
    sessionId: string;
    conversationContext?: string[];
  }): Promise<ComprehensiveNewsResponse> {
    const startTime = Date.now();
    console.log('📰 NewsOrchestrator: Starting systematic news search for:', params.query);

    // Determine if this is a generic news request
    const isGenericNewsRequest = this.isGenericNewsRequest(params.query);
    
    if (isGenericNewsRequest) {
      console.log('📰 Detected generic news request - executing multi-category search');
      return await this.executeComprehensiveNewsSearch(params, startTime);
    } else {
      console.log('📰 Specific news query - using targeted search');
      return await this.executeTargetedNewsSearch(params, startTime);
    }
  }

  /**
   * GENERIC NEWS REQUEST DETECTION
   * Identifies broad news requests that should trigger comprehensive search
   */
  private isGenericNewsRequest(query: string): boolean {
    const genericPatterns = [
      /^(what'?s|give\s+me|show\s+me|tell\s+me)\s+(the\s+)?news\s*$/i,
      /^(any\s+)?news\s*(today|update|updates)?\s*$/i,
      /^(latest\s+)?(world\s+|global\s+)?news\s*$/i,
      /^(current\s+)?(events?|happenings?)\s*$/i,
      /^what'?s\s+(happening|going\s+on)\s*(today|now)?\s*$/i,
      /^(daily\s+)?news\s+(brief|summary|overview)\s*$/i,
      /^(morning\s+|evening\s+)?news\s+(roundup|digest)\s*$/i
    ];

    return genericPatterns.some(pattern => pattern.test(query.trim()));
  }

  /**
   * COMPREHENSIVE NEWS SEARCH
   * Searches multiple categories and aggregates results
   */
  private async executeComprehensiveNewsSearch(
    params: { query: string; userId: string; sessionId: string; conversationContext?: string[] },
    startTime: number
  ): Promise<ComprehensiveNewsResponse> {
    console.log('📰 Executing comprehensive multi-category news search');

    const allStories: NewsStory[] = [];
    const allImages: Array<{ title: string; imageUrl: string; link: string; source: string }> = [];
    const searchPromises: Promise<void>[] = [];

    // Search top priority categories in parallel
    const topCategories = this.NEWS_CATEGORIES
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 6); // Top 6 categories

    for (const category of topCategories) {
      // Use primary search query for each category
      const searchQuery = category.searchQueries[0];
      
      const searchPromise = this.searchCategoryNewsWithImages(searchQuery, category, params)
        .then(({ stories, images }) => {
          allStories.push(...stories);
          allImages.push(...images);
          console.log(`📰 ${category.name}: Found ${stories.length} stories and ${images.length} images`);
        })
        .catch(error => {
          console.error(`📰 ${category.name} search failed:`, error);
        });

      searchPromises.push(searchPromise);
    }

    // Wait for all searches to complete
    await Promise.allSettled(searchPromises);

    // Rank and deduplicate stories
    const rankedStories = this.rankAndDeduplicateStories(allStories);
    const topStories = rankedStories.slice(0, 20); // Top 20 stories

    // Generate comprehensive summary
    const summary = await this.generateNewsOverviewSummary(topStories, topCategories);

    // Generate Perplexity-style response for the news overview
    let perplexityResponse: PerplexityResponse | undefined;
    try {
      // Create mock search context for Perplexity formatting
      const mockSearchContext = {
        originalQuery: params.query,
        searchType: 'news' as const,
        results: topStories.map(story => ({
          title: story.title,
          snippet: story.snippet,
          url: story.url,
          source: story.source,
          relevanceScore: story.relevanceScore,
          contentType: 'news' as const
        })),
        timestamp: new Date(),
        userId: params.userId,
        sessionId: params.sessionId,
        explanation: 'Comprehensive news overview from multiple categories',
        suggestions: []
      };

      perplexityResponse = await perplexityStyleFormatter.formatSearchResponse(
        'Latest news overview across major categories',
        mockSearchContext,
        params.conversationContext
      );
    } catch (error) {
      console.error('📰 Perplexity formatting failed for news overview:', error);
    }

    // Deduplicate images - ensure allImages is a valid array
    const validImages = Array.isArray(allImages) ? allImages : [];
    const uniqueImages = validImages.filter((img, index, array) => 
      img && img.imageUrl && !array.slice(0, index).some(existing => existing.imageUrl === img.imageUrl)
    ).slice(0, 12); // Top 12 unique images

    console.log('📰 NewsOrchestrator: Returning response with', uniqueImages.length, 'unique images from', validImages.length, 'total');
    console.log('🖼️ NewsOrchestrator: Image sample:', uniqueImages.slice(0, 2));

    return {
      categories: topCategories,
      stories: topStories,
      summary,
      totalResults: allStories.length,
      searchTime: Date.now() - startTime,
      perplexityResponse,
      images: uniqueImages // Images at top level of response
    };
  }

  /**
   * TARGETED NEWS SEARCH
   * For specific news queries
   */
  private async executeTargetedNewsSearch(
    params: { query: string; userId: string; sessionId: string; conversationContext?: string[] },
    startTime: number
  ): Promise<ComprehensiveNewsResponse> {
    console.log('📰 Executing targeted news search for:', params.query);

    // Use WebSearchEngine for targeted search
    const searchContext = await webSearchEngine.executeSearch({
      query: params.query,
      userId: params.userId,
      sessionId: params.sessionId,
      searchType: 'web',
      conversationContext: params.conversationContext || []
    });

    // Convert to news stories
    const stories: NewsStory[] = searchContext.results.map((result, index) => ({
      title: result.title,
      snippet: result.snippet,
      url: result.url,
      source: result.source,
      category: 'Targeted Search',
      relevanceScore: (searchContext.results.length - index) / searchContext.results.length,
      isBreaking: this.isBreakingNews(result.title, result.snippet),
      timestamp: (result as any).timestamp || new Date().toISOString() // Fallback if timestamp not available
    }));

    // Extract images from search context
    const images = Array.isArray(searchContext.images) ? searchContext.images : [];
    
    console.log('📰 NewsOrchestrator (targeted): Returning response with', images.length, 'images');

    return {
      categories: [{ name: 'Targeted Search', searchQueries: [params.query], priority: 10, description: 'User-specified news search' }],
      stories,
      summary: searchContext.explanation,
      totalResults: stories.length,
      searchTime: Date.now() - startTime,
      perplexityResponse: searchContext.perplexityResponse,
      images // Include images in targeted search response
    };
  }

  /**
   * CATEGORY-SPECIFIC NEWS SEARCH
   */
  private async searchCategoryNews(
    searchQuery: string,
    category: NewsCategory,
    params: { userId: string; sessionId: string }
  ): Promise<NewsStory[]> {
    try {
      const searchContext = await webSearchEngine.executeSearch({
        query: searchQuery,
        userId: params.userId,
        sessionId: params.sessionId,
        searchType: 'web'
      });

      return searchContext.results.slice(0, 5).map((result, index) => ({
        title: result.title,
        snippet: result.snippet,
        url: result.url,
        source: result.source,
        category: category.name,
        relevanceScore: (searchContext.results.length - index) / searchContext.results.length,
        isBreaking: this.isBreakingNews(result.title, result.snippet),
        timestamp: (result as any).timestamp || new Date().toISOString() // Fallback if timestamp not available
      }));
    } catch (error) {
      console.error(`📰 Category search failed for ${category.name}:`, error);
      return [];
    }
  }

  /**
   * CATEGORY-SPECIFIC NEWS SEARCH WITH IMAGES
   */
  private async searchCategoryNewsWithImages(
    searchQuery: string,
    category: NewsCategory,
    params: { userId: string; sessionId: string }
  ): Promise<{ stories: NewsStory[]; images: Array<{ title: string; imageUrl: string; link: string; source: string }> }> {
    try {
      const searchContext = await webSearchEngine.executeSearch({
        query: searchQuery,
        userId: params.userId,
        sessionId: params.sessionId,
        searchType: 'web'
      });

      const stories = searchContext.results.slice(0, 5).map((result, index) => ({
        title: result.title,
        snippet: result.snippet,
        url: result.url,
        source: result.source,
        category: category.name,
        relevanceScore: (searchContext.results.length - index) / searchContext.results.length,
        isBreaking: this.isBreakingNews(result.title, result.snippet),
        timestamp: (result as any).timestamp || new Date().toISOString() // Fallback if timestamp not available
      }));

      // CRITICAL: Extract images from searchContext.images, not from individual results
      // WebSearchEngine.executeSearch returns images at searchContext.images
      const categoryImages = searchContext.images || [];
      console.log(`📰 NewsOrchestrator: ${category.name} returned ${categoryImages.length} images`);
      console.log(`📰 NewsOrchestrator: Sample image from ${category.name}:`, categoryImages[0]);
      console.log(`📰 NewsOrchestrator: All image URLs from ${category.name}:`, categoryImages.map(img => img.imageUrl));

      return { stories, images: categoryImages };
    } catch (error) {
      console.error(`📰 Category search with images failed for ${category.name}:`, error);
      return { stories: [], images: [] };
    }
  }

  /**
   * STORY RANKING AND DEDUPLICATION
   */
  private rankAndDeduplicateStories(stories: NewsStory[]): NewsStory[] {
    // Remove duplicates based on title similarity
    const uniqueStories = stories.filter((story, index, array) => {
      return !array.slice(0, index).some(existingStory => 
        this.calculateTitleSimilarity(story.title, existingStory.title) > 0.8
      );
    });

    // Rank by breaking news, then relevance, then recency
    return uniqueStories.sort((a, b) => {
      if (a.isBreaking && !b.isBreaking) return -1;
      if (!a.isBreaking && b.isBreaking) return 1;
      
      // Category priority
      const categoryA = this.NEWS_CATEGORIES.find(cat => cat.name === a.category);
      const categoryB = this.NEWS_CATEGORIES.find(cat => cat.name === b.category);
      const priorityDiff = (categoryB?.priority || 0) - (categoryA?.priority || 0);
      if (priorityDiff !== 0) return priorityDiff;
      
      // Relevance score
      return b.relevanceScore - a.relevanceScore;
    });
  }

  /**
   * NEWS OVERVIEW SUMMARY GENERATION
   */
  private async generateNewsOverviewSummary(stories: NewsStory[], categories: NewsCategory[]): Promise<string> {
    const breakingStories = stories.filter(s => s.isBreaking).length;
    const categoryCount = new Set(stories.map(s => s.category)).size;
    const topSources = [...new Set(stories.slice(0, 10).map(s => s.source))].slice(0, 5);

    const overview = `Today's comprehensive news overview covers ${categoryCount} major categories with ${stories.length} stories from leading sources including ${topSources.join(', ')}. ${breakingStories > 0 ? `${breakingStories} breaking news items require immediate attention.` : 'No urgent breaking news at this time.'} Key focus areas include ${categories.slice(0, 4).map(c => c.name.toLowerCase()).join(', ')}.`;

    return overview;
  }

  /**
   * UTILITY METHODS
   */
  private isBreakingNews(title: string, snippet: string): boolean {
    const breakingKeywords = [
      'breaking', 'urgent', 'developing', 'just in', 'live', 'update',
      'emergency', 'crisis', 'alert', 'happening now'
    ];
    
    const text = (title + ' ' + snippet).toLowerCase();
    return breakingKeywords.some(keyword => text.includes(keyword));
  }

  private calculateTitleSimilarity(title1: string, title2: string): number {
    const words1 = title1.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    const words2 = title2.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    
    return intersection.length / union.length;
  }
}

export const newsOrchestrator = NewsOrchestrator.getInstance();
