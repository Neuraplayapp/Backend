/**
 * INTELLIGENT SEARCH TOOL - Master Orchestrator
 * 
 * Combines all 4 layers of the agentic search architecture:
 * 1. SearchOrchestrator (Planning)
 * 2. SearchExecutor (Execution) 
 * 3. ContentAnalyzer (Analysis)
 * 4. SynthesisAgent (Synthesis)
 * 
 * Plus ContentRenderer for category-specific formatting
 */

import { searchOrchestrator, SearchPlan, SearchIntent } from './agents/SearchOrchestrator';
import { searchExecutor, SearchResult } from './agents/SearchExecutor';
import { contentAnalyzer, ContentAnalysis } from './agents/ContentAnalyzer';
import { synthesisAgent, SynthesizedResponse } from './agents/SynthesisAgent';
import { contentRenderer, RenderedContent, WeatherData } from './ContentRenderer';
import { apiService } from './APIService';

export interface IntelligentSearchRequest {
  query: string;
  intent?: Partial<SearchIntent>;
  options?: {
    maxResults?: number;
    deepAnalysis?: boolean;
    includeSpecializedSources?: boolean;
    renderResponse?: boolean;
  };
}

export interface IntelligentSearchResponse {
  query: string;
  plan: SearchPlan;
  searchResults: SearchResult[];
  contentAnalyses: ContentAnalysis[];
  synthesis: SynthesizedResponse;
  renderedContent?: RenderedContent;
  metadata: {
    totalExecutionTime: number;
    layerTimings: {
      orchestration: number;
      execution: number;
      analysis: number;
      synthesis: number;
      rendering?: number;
    };
    sourcesProcessed: number;
    confidence: number;
  };
}

export class IntelligentSearchTool {
  private static instance: IntelligentSearchTool;

  static getInstance(): IntelligentSearchTool {
    if (!IntelligentSearchTool.instance) {
      IntelligentSearchTool.instance = new IntelligentSearchTool();
    }
    return IntelligentSearchTool.instance;
  }

  /**
   * MAIN INTELLIGENT SEARCH METHOD
   * Orchestrates the complete 4-layer agentic search process
   */
  async search(request: IntelligentSearchRequest): Promise<IntelligentSearchResponse> {
    const totalStartTime = Date.now();
    console.log(`🚀 IntelligentSearchTool: Starting comprehensive search for "${request.query}"`);

    const {
      maxResults = 10,
      deepAnalysis = true,
      includeSpecializedSources = true,
      renderResponse = true
    } = request.options || {};

    const layerTimings = {
      orchestration: 0,
      execution: 0,
      analysis: 0,
      synthesis: 0,
      rendering: undefined as number | undefined
    };

    // LAYER 1: ORCHESTRATION & PLANNING
    console.log('🧠 Layer 1: Orchestration & Planning...');
    const orchestrationStart = Date.now();
    const plan = await searchOrchestrator.createSearchPlan(request.query);
    layerTimings.orchestration = Date.now() - orchestrationStart;

    // LAYER 2: SEARCH EXECUTION & ADAPTATION
    console.log('🔍 Layer 2: Search Execution & Adaptation...');
    const executionStart = Date.now();
    const searchResults = await searchExecutor.executeSearchPlan(plan);
    layerTimings.execution = Date.now() - executionStart;

    // LAYER 3: CONTENT ANALYSIS & VETTING
    console.log('🔬 Layer 3: Content Analysis & Vetting...');
    const analysisStart = Date.now();
    const contentAnalyses = deepAnalysis 
      ? await contentAnalyzer.analyzeSearchResults(searchResults, Math.min(maxResults, 5))
      : [];
    layerTimings.analysis = Date.now() - analysisStart;

    // LAYER 4: SYNTHESIS & RESPONSE
    console.log('🎯 Layer 4: Synthesis & Response...');
    const synthesisStart = Date.now();
    const synthesis = await synthesisAgent.synthesizeResponse(plan, searchResults, contentAnalyses);
    layerTimings.synthesis = Date.now() - synthesisStart;

    // OPTIONAL: CONTENT RENDERING
    let renderedContent: RenderedContent | undefined;
    if (renderResponse && contentAnalyses.length > 0) {
      console.log('🎨 Rendering with category-specific formatting...');
      const renderingStart = Date.now();
      
      // Use the highest-confidence analysis for rendering
      const bestAnalysis = contentAnalyses.sort((a, b) => b.reliabilityScore - a.reliabilityScore)[0];
      renderedContent = contentRenderer.renderContent(bestAnalysis);
      
      layerTimings.rendering = Date.now() - renderingStart;
    }

    const totalExecutionTime = Date.now() - totalStartTime;

    console.log(`✅ IntelligentSearchTool: Complete! Total time: ${totalExecutionTime}ms`);
    console.log(`📊 Layer timings:`, layerTimings);

    return {
      query: request.query,
      plan,
      searchResults,
      contentAnalyses,
      synthesis,
      renderedContent,
      metadata: {
        totalExecutionTime,
        layerTimings,
        sourcesProcessed: searchResults.reduce((sum, result) => sum + result.results.length, 0),
        confidence: synthesis.confidence
      }
    };
  }

  /**
   * SPECIALIZED WEATHER SEARCH
   * Optimized flow for weather queries
   */
  async searchWeather(location: string, units: 'metric' | 'imperial' = 'metric'): Promise<RenderedContent> {
    console.log(`🌤️ IntelligentSearchTool: Weather search for ${location}`);

    try {
      // Use APIService for weather data
      const weatherResponse = await apiService.getWeather(location, { units });

      if (!weatherResponse.success) {
        throw new Error(weatherResponse.error || 'Weather API failed');
      }

      // Transform API response to WeatherData format
      const weatherData: WeatherData = {
        location: weatherResponse.data?.location || location,
        temperature: weatherResponse.data?.temperature || 0,
        description: weatherResponse.data?.description || 'No data',
        humidity: weatherResponse.data?.humidity || 0,
        windSpeed: weatherResponse.data?.windSpeed || 0,
        units,
        forecast: weatherResponse.data?.forecast || undefined
      };

      // Render with specialized weather template
      return contentRenderer.renderWeather(weatherData);

    } catch (error) {
      console.error('❌ Weather search failed:', error);
      
      // Fallback to regular search
      const fallbackResult = await this.search({
        query: `weather in ${location}`,
        intent: { type: 'general', depth: 'surface' },
        options: { maxResults: 3, deepAnalysis: false }
      });

      return fallbackResult.renderedContent || {
        category: 'reference',
        formattedMessage: `Unable to get current weather for ${location}. Please check the location or try again.`,
        metadata: {
          renderTime: 0,
          templateUsed: 'error',
          interactiveElements: [],
          accessibility: {
            hasHeadings: false,
            hasLists: false,
            hasEmphasis: false,
            readingLevel: 'beginner',
            estimatedReadTime: '10 seconds'
          }
        }
      };
    }
  }

  /**
   * QUICK SEARCH MODE
   * Faster search with reduced analysis for simple queries
   */
  async quickSearch(query: string): Promise<string> {
    console.log(`⚡ IntelligentSearchTool: Quick search for "${query}"`);

    // Skip orchestration for simple queries
    const searchResults = await searchExecutor.executeSearchPlan({
      intent: {
        goal: query,
        concepts: query.split(' '),
        complexity: 'simple',
        domain: 'general'
      },
      strategy: {
        initialSearch: {
          query,
          rationale: 'Quick search',
          expectedSources: ['general'],
          priority: 'high'
        },
        synthesisApproach: 'combine'
      },
      expectedOutcome: 'Quick information retrieval'
    });

    // Simple synthesis without deep analysis
    const topResult = searchResults[0];
    if (topResult && topResult.results.length > 0) {
      const bestResult = topResult.results[0];
      return `**${bestResult.title}**\n\n${bestResult.snippet}\n\n*Source: ${bestResult.domain}*`;
    }

    return `No results found for "${query}". Please try a more specific search.`;
  }

  /**
   * RECIPE SEARCH MODE
   * Specialized flow for recipe queries
   */
  async searchRecipe(query: string): Promise<RenderedContent> {
    console.log(`🍳 IntelligentSearchTool: Recipe search for "${query}"`);

    const result = await this.search({
      query,
      intent: {
        type: 'general',
        depth: 'detailed',
        expertLevel: 'beginner'
      },
      options: {
        maxResults: 5,
        deepAnalysis: true,
        renderResponse: true
      }
    });

    // If we found recipe content, return it; otherwise create a recipe-focused response
    if (result.renderedContent && result.renderedContent.category === 'recipe') {
      return result.renderedContent;
    }

    // Create a recipe-focused summary from general results
    const recipeInfo = result.synthesis.finalAnswer;
    
    return {
      category: 'recipe',
      formattedMessage: `🍳 **Recipe Search Results for "${query}"**\n\n${recipeInfo}\n\n*Tip: For more detailed recipes, try searching for specific recipe names.*`,
      metadata: {
        renderTime: 0,
        templateUsed: 'recipe_summary',
        interactiveElements: ['recipe_finder'],
        accessibility: {
          hasHeadings: true,
          hasLists: true,
          hasEmphasis: true,
          readingLevel: 'beginner',
          estimatedReadTime: '1-2 minutes'
        }
      }
    };
  }

  /**
   * TECHNICAL SEARCH MODE
   * Specialized flow for technical/programming queries
   */
  async searchTechnical(query: string): Promise<RenderedContent> {
    console.log(`⚙️ IntelligentSearchTool: Technical search for "${query}"`);

    const result = await this.search({
      query,
      intent: {
        type: 'technical',
        depth: 'detailed',
        expertLevel: 'intermediate'
      },
      options: {
        maxResults: 7,
        deepAnalysis: true,
        includeSpecializedSources: true,
        renderResponse: true
      }
    });

    return result.renderedContent || {
      category: 'documentation',
      formattedMessage: `⚙️ **Technical Information for "${query}"**\n\n${result.synthesis.finalAnswer}`,
      metadata: {
        renderTime: 0,
        templateUsed: 'technical_summary',
        interactiveElements: ['code_examples'],
        accessibility: {
          hasHeadings: true,
          hasLists: true,
          hasEmphasis: true,
          readingLevel: 'advanced',
          estimatedReadTime: '2-3 minutes'
        }
      }
    };
  }

  /**
   * NEWS SEARCH MODE
   * Specialized flow for current events
   */
  async searchNews(query: string): Promise<RenderedContent> {
    console.log(`📰 IntelligentSearchTool: News search for "${query}"`);

    const result = await this.search({
      query,
      intent: {
        type: 'general',
        depth: 'surface',
        timeframe: 'recent'
      },
      options: {
        maxResults: 5,
        deepAnalysis: true,
        renderResponse: true
      }
    });

    return result.renderedContent || {
      category: 'news',
      formattedMessage: `📰 **Latest News on "${query}"**\n\n${result.synthesis.finalAnswer}`,
      metadata: {
        renderTime: 0,
        templateUsed: 'news_summary',
        interactiveElements: ['follow_story'],
        accessibility: {
          hasHeadings: true,
          hasLists: true,
          hasEmphasis: true,
          readingLevel: 'intermediate',
          estimatedReadTime: '1-2 minutes'
        }
      }
    };
  }

  /**
   * GET SEARCH STATISTICS
   * Returns performance and usage statistics
   */
  getStatistics(): {
    totalSearches: number;
    averageExecutionTime: number;
    averageConfidence: number;
    mostCommonCategories: string[];
  } {
    // This would be implemented with actual tracking in a real system
    return {
      totalSearches: 0,
      averageExecutionTime: 0,
      averageConfidence: 0,
      mostCommonCategories: []
    };
  }
}

export const intelligentSearchTool = IntelligentSearchTool.getInstance();
