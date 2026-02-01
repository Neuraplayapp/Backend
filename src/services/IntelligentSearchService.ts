/**
 * INTELLIGENT SEARCH SERVICE
 * 
 * Advanced search orchestrator that combines:
 * 1. SERPER for fast, low-cost Google results
 * 2. Jina AI for deep content analysis 
 * 3. Specialized sources to avoid single-engine bias
 * 4. Expert-level information aggregation
 */

import { apiService, APIResponse } from './APIService';

export interface SearchIntent {
  type: 'academic' | 'technical' | 'news' | 'general' | 'code' | 'research' | 'market';
  depth: 'surface' | 'detailed' | 'comprehensive';
  timeframe?: 'recent' | 'historical' | 'any';
  expertLevel: 'beginner' | 'intermediate' | 'expert';
}

export interface ContentAnalysis {
  credibility: number;
  expertise: number;
  recency: number;
  depth: number;
  bias: number;
  summary: string;
  keyPoints: string[];
  sourceType: string;
  contentQuality: 'high' | 'medium' | 'low';
}

export interface EnrichedSearchResult {
  position: number;
  title: string;
  link: string;
  snippet: string;
  domain: string;
  content?: string;
  analysis?: ContentAnalysis;
  readSuccess: boolean;
  sourceCategory: string;
  relevanceScore: number;
}

export interface IntelligentSearchResponse {
  query: string;
  intent: SearchIntent;
  sources: {
    serper: EnrichedSearchResult[];
    academic?: any[];
    news?: any[];
    technical?: any[];
    code?: any[];
  };
  synthesis: {
    summary: string;
    keyFindings: string[];
    expertRecommendations: string[];
    credibilityAssessment: string;
    gapsIdentified: string[];
  };
  metadata: {
    totalSources: number;
    analyzedPages: number;
    executionTime: number;
    confidence: number;
  };
}

class IntelligentSearchService {
  private static instance: IntelligentSearchService;

  static getInstance(): IntelligentSearchService {
    if (!IntelligentSearchService.instance) {
      IntelligentSearchService.instance = new IntelligentSearchService();
    }
    return IntelligentSearchService.instance;
  }

  /**
   * MAIN INTELLIGENT SEARCH METHOD
   * Orchestrates multi-source search with deep content analysis
   */
  async search(
    query: string, 
    intent: Partial<SearchIntent> = {},
    options: {
      maxResults?: number;
      deepAnalysis?: boolean;
      includeSpecializedSources?: boolean;
    } = {}
  ): Promise<IntelligentSearchResponse> {
    const startTime = Date.now();
    const { maxResults = 10, deepAnalysis = true, includeSpecializedSources = true } = options;
    
    console.log(`🧠 IntelligentSearch: Starting comprehensive search for "${query}"`);
    
    // 1. Analyze search intent
    const searchIntent = await this.analyzeIntent(query, intent);
    console.log(`🎯 Intent analyzed:`, searchIntent);

    // 2. Execute multi-source search strategy
    const searchResults = await this.executeMultiSourceSearch(query, searchIntent, {
      maxResults,
      includeSpecializedSources
    });

    // 3. Deep content analysis of top results
    let enrichedResults: EnrichedSearchResult[] = [];
    if (deepAnalysis && searchResults.serper.length > 0) {
      enrichedResults = await this.performDeepContentAnalysis(
        searchResults.serper.slice(0, Math.min(5, searchResults.serper.length)),
        searchIntent
      );
    }

    // 4. Synthesize findings from all sources
    const synthesis = await this.synthesizeFindings(enrichedResults, searchResults, searchIntent);

    const executionTime = Date.now() - startTime;

    return {
      query,
      intent: searchIntent,
      sources: {
        serper: enrichedResults.length > 0 ? enrichedResults : searchResults.serper,
        academic: searchResults.academic,
        news: searchResults.news,
        technical: searchResults.technical,
        code: searchResults.code
      },
      synthesis,
      metadata: {
        totalSources: this.countTotalSources(searchResults),
        analyzedPages: enrichedResults.length,
        executionTime,
        confidence: this.calculateConfidence(enrichedResults, searchResults)
      }
    };
  }

  /**
   * INTENT ANALYSIS - Determines search strategy
   */
  private async analyzeIntent(query: string, userIntent: Partial<SearchIntent>): Promise<SearchIntent> {
    // AI-powered intent analysis
    const defaultIntent: SearchIntent = {
      type: 'general',
      depth: 'detailed',
      timeframe: 'any',
      expertLevel: 'intermediate'
    };

    // Enhanced intent detection based on query patterns
    const intentPatterns = {
      academic: /research|study|paper|journal|university|academic|thesis|dissertation/i,
      technical: /api|documentation|implementation|architecture|system|protocol|specification/i,
      news: /news|latest|recent|breaking|update|announcement|report/i,
      code: /code|github|stackoverflow|programming|syntax|example|tutorial|how to/i,
      research: /analysis|data|statistics|findings|results|methodology/i,
      market: /market|business|industry|competitor|pricing|revenue|growth/i
    };

    let detectedType: SearchIntent['type'] = userIntent.type || 'general';
    for (const [type, pattern] of Object.entries(intentPatterns)) {
      if (pattern.test(query)) {
        detectedType = type as SearchIntent['type'];
        break;
      }
    }

    // Depth analysis
    const depthIndicators = {
      comprehensive: /comprehensive|complete|thorough|detailed analysis|in-depth/i,
      detailed: /explain|how|why|details|specifics|implementation/i,
      surface: /quick|brief|summary|overview|what is/i
    };

    let detectedDepth: SearchIntent['depth'] = userIntent.depth || 'detailed';
    for (const [depth, pattern] of Object.entries(depthIndicators)) {
      if (pattern.test(query)) {
        detectedDepth = depth as SearchIntent['depth'];
        break;
      }
    }

    // Expert level detection
    const expertLevelIndicators = {
      expert: /advanced|expert|professional|enterprise|production|complex/i,
      beginner: /beginner|basic|simple|introduction|getting started|tutorial/i
    };

    let detectedExpertLevel: SearchIntent['expertLevel'] = userIntent.expertLevel || 'intermediate';
    for (const [level, pattern] of Object.entries(expertLevelIndicators)) {
      if (pattern.test(query)) {
        detectedExpertLevel = level as SearchIntent['expertLevel'];
        break;
      }
    }

    return {
      ...defaultIntent,
      ...userIntent,
      type: detectedType,
      depth: detectedDepth,
      expertLevel: detectedExpertLevel
    };
  }

  /**
   * MULTI-SOURCE SEARCH EXECUTION
   * Combines SERPER with specialized sources
   */
  private async executeMultiSourceSearch(
    query: string,
    intent: SearchIntent,
    options: { maxResults: number; includeSpecializedSources: boolean }
  ): Promise<{
    serper: EnrichedSearchResult[];
    academic?: any[];
    news?: any[];
    technical?: any[];
    code?: any[];
  }> {
    const searches: Promise<any>[] = [];

    // 1. Primary SERPER search via APIService
    console.log('🔍 Executing SERPER search...');
    searches.push(
      apiService.webSearch(query, {
        type: intent.type === 'news' ? 'news' : 'search',
        num: options.maxResults
      }).then(result => ({ source: 'serper', data: result }))
    );

    // 2. Specialized sources based on intent
    if (options.includeSpecializedSources) {
      if (intent.type === 'academic' || intent.type === 'research') {
        console.log('📚 Adding academic sources...');
        searches.push(this.searchAcademicSources(query).then(data => ({ source: 'academic', data })));
      }

      if (intent.type === 'technical' || intent.type === 'code') {
        console.log('⚙️ Adding technical sources...');
        searches.push(this.searchTechnicalSources(query).then(data => ({ source: 'technical', data })));
        searches.push(this.searchCodeSources(query).then(data => ({ source: 'code', data })));
      }

      if (intent.type === 'news' || intent.timeframe === 'recent') {
        console.log('📰 Adding news sources...');
        searches.push(this.searchNewsSources(query).then(data => ({ source: 'news', data })));
      }
    }

    // Execute all searches in parallel
    const results = await Promise.allSettled(searches);
    
    const processedResults: any = { serper: [] };
    
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        const { source, data } = result.value;
        if (source === 'serper' && data.success) {
          // CRITICAL: Handle double-wrapped response from APIService
          // Backend returns { success, data: { results } }
          // APIService wraps it as { success, data: { success, data: { results } } }
          const actualData = data.data?.data || data.data;
          const resultsArray = actualData?.results || [];
          console.log(`🔍 SERPER results parsed: ${resultsArray.length} results`);
          processedResults.serper = this.formatSerperResults(resultsArray);
        } else if (data) {
          processedResults[source] = data;
        }
      }
    });

    return processedResults;
  }

  /**
   * DEEP CONTENT ANALYSIS PIPELINE
   * Uses Jina AI to extract and analyze content from URLs
   */
  private async performDeepContentAnalysis(
    results: EnrichedSearchResult[],
    intent: SearchIntent
  ): Promise<EnrichedSearchResult[]> {
    console.log(`🔬 Performing deep content analysis on ${results.length} URLs...`);

    const analysisPromises = results.map(async (result, index) => {
      try {
        // Read content using Jina AI
        const urlContent = await apiService.readURL(result.link, {
          format: 'markdown',
          includeImages: false,
          includeLinks: true
        });

        if (urlContent.success && urlContent.data?.content) {
          // Analyze content quality and relevance
          const analysis = await this.analyzeContent(
            urlContent.data.content,
            result,
            intent
          );

          return {
            ...result,
            content: urlContent.data.content,
            analysis,
            readSuccess: true,
            sourceCategory: this.categorizeSource(result.domain),
            relevanceScore: analysis.credibility * 0.3 + analysis.expertise * 0.3 + analysis.depth * 0.4
          };
        } else {
          return {
            ...result,
            readSuccess: false,
            sourceCategory: this.categorizeSource(result.domain),
            relevanceScore: result.position ? Math.max(0, 100 - (result.position * 10)) : 50
          };
        }
      } catch (error) {
        console.error(`❌ Content analysis failed for ${result.link}:`, error);
        return {
          ...result,
          readSuccess: false,
          sourceCategory: this.categorizeSource(result.domain),
          relevanceScore: result.position ? Math.max(0, 100 - (result.position * 10)) : 50
        };
      }
    });

    const enrichedResults = await Promise.all(analysisPromises);
    
    // Sort by relevance score
    return enrichedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * CONTENT ANALYSIS - Evaluates quality, credibility, and relevance
   */
  private async analyzeContent(
    content: string,
    result: EnrichedSearchResult,
    intent: SearchIntent
  ): Promise<ContentAnalysis> {
    // Content length and structure analysis
    const wordCount = content.split(/\s+/).length;
    const hasCodeBlocks = /```|<code>|<pre>/.test(content);
    const hasCitations = /\[[0-9]+\]|\([0-9]{4}\)|doi:|arxiv:/i.test(content);
    const hasTimestamps = /\b(20[0-9]{2}|19[0-9]{2})\b/.test(content);

    // Domain credibility scoring
    const credibilityScore = this.assessCredibility(result.domain);
    
    // Expertise indicators
    const expertiseIndicators = [
      /technical|implementation|architecture|algorithm/i,
      /research|study|analysis|methodology/i,
      /documentation|specification|protocol/i,
      hasCodeBlocks,
      hasCitations
    ];
    const expertiseScore = expertiseIndicators.filter(indicator => 
      typeof indicator === 'boolean' ? indicator : indicator.test(content)
    ).length * 20;

    // Content depth assessment
    const depthScore = Math.min(100, (wordCount / 50) + (hasCodeBlocks ? 20 : 0) + (hasCitations ? 20 : 0));

    // Recency assessment
    const recencyScore = hasTimestamps ? 80 : 60;

    // Bias assessment (lower is better)
    const biasIndicators = /definitely|absolutely|clearly|obviously|without doubt/gi;
    const biasMatches = content.match(biasIndicators) || [];
    const biasScore = Math.max(0, 100 - (biasMatches.length * 10));

    // Generate summary and key points
    const summary = this.extractSummary(content, 200);
    const keyPoints = this.extractKeyPoints(content);

    return {
      credibility: credibilityScore,
      expertise: Math.min(100, expertiseScore),
      recency: recencyScore,
      depth: depthScore,
      bias: biasScore,
      summary,
      keyPoints,
      sourceType: this.categorizeSource(result.domain),
      contentQuality: this.assessContentQuality(credibilityScore, expertiseScore, depthScore)
    };
  }

  /**
   * SPECIALIZED SOURCE SEARCHES
   */
  private async searchAcademicSources(query: string): Promise<any[]> {
    console.log('📚 Searching academic sources for:', query);
    
    try {
      // Use enhanced academic search through SERPER with academic operators
      const academicQuery = `${query} (site:arxiv.org OR site:pubmed.ncbi.nlm.nih.gov OR site:scholar.google.com OR site:edu OR "peer reviewed" OR "research study" OR "academic paper")`;
      
      const academicResults = await apiService.webSearch(academicQuery, {
        type: 'search',
        num: 5,
        gl: 'us',
        hl: 'en'
      });

      // Handle double-wrapped response
      const academicData = academicResults.data?.data || academicResults.data;
      if (academicResults.success && academicData?.results) {
        return academicData.results.map((result: any, index: number) => ({
          position: index + 1,
          title: result.title,
          link: result.link,
          snippet: result.snippet,
          domain: this.extractDomain(result.link),
          sourceType: 'academic',
          credibilityScore: this.assessCredibility(this.extractDomain(result.link))
        }));
      }
    } catch (error) {
      console.error('❌ Academic search failed:', error);
    }
    
    return [];
  }

  private async searchTechnicalSources(query: string): Promise<any[]> {
    console.log('⚙️ Searching technical sources for:', query);
    
    try {
      // Use enhanced technical search through SERPER
      const techQuery = `${query} (site:stackoverflow.com OR site:github.com OR site:docs.microsoft.com OR site:developer.mozilla.org OR "documentation" OR "API reference" OR "technical specification")`;
      
      const techResults = await apiService.webSearch(techQuery, {
        type: 'search',
        num: 5,
        gl: 'us',
        hl: 'en'
      });

      // Handle double-wrapped response
      const techData = techResults.data?.data || techResults.data;
      if (techResults.success && techData?.results) {
        return techData.results.map((result: any, index: number) => ({
          position: index + 1,
          title: result.title,
          link: result.link,
          snippet: result.snippet,
          domain: this.extractDomain(result.link),
          sourceType: 'technical',
          credibilityScore: this.assessCredibility(this.extractDomain(result.link))
        }));
      }
    } catch (error) {
      console.error('❌ Technical search failed:', error);
    }
    
    return [];
  }

  private async searchCodeSources(query: string): Promise<any[]> {
    console.log('💻 Searching code sources for:', query);
    
    try {
      // Enhanced code search with specific programming sites
      const codeQuery = `${query} (site:github.com OR site:stackoverflow.com OR site:codepen.io OR site:jsfiddle.net OR "code example" OR "implementation" OR "tutorial")`;
      
      const codeResults = await apiService.webSearch(codeQuery, {
        type: 'search',
        num: 5,
        gl: 'us',
        hl: 'en'
      });

      // Handle double-wrapped response
      const codeData = codeResults.data?.data || codeResults.data;
      if (codeResults.success && codeData?.results) {
        return codeData.results.map((result: any, index: number) => ({
          position: index + 1,
          title: result.title,
          link: result.link,
          snippet: result.snippet,
          domain: this.extractDomain(result.link),
          sourceType: 'code',
          credibilityScore: this.assessCredibility(this.extractDomain(result.link))
        }));
      }
    } catch (error) {
      console.error('❌ Code search failed:', error);
    }
    
    return [];
  }

  private async searchNewsSources(query: string): Promise<any[]> {
    console.log('📰 Searching news sources for:', query);
    
    try {
      // Use SERPER's news search specifically
      const newsResults = await apiService.webSearch(query, {
        type: 'news',
        num: 5,
        gl: 'us',
        hl: 'en',
        tbm: 'nws'
      });

      // Handle double-wrapped response
      const newsData = newsResults.data?.data || newsResults.data;
      if (newsResults.success && newsData?.news) {
        return newsData.news.map((result: any, index: number) => ({
          position: index + 1,
          title: result.title,
          link: result.link,
          snippet: result.snippet,
          domain: this.extractDomain(result.link),
          sourceType: 'news',
          publishDate: result.date,
          credibilityScore: this.assessCredibility(this.extractDomain(result.link))
        }));
      }
    } catch (error) {
      console.error('❌ News search failed:', error);
    }
    
    return [];
  }

  /**
   * HELPER METHODS
   */
  private formatSerperResults(results: any[]): EnrichedSearchResult[] {
    return results.map((result, index) => ({
      position: index + 1,
      title: result.title || 'No title',
      link: result.link || result.url || '#',
      snippet: result.snippet || result.description || 'No description available',
      domain: this.extractDomain(result.link || result.url),
      readSuccess: false,
      sourceCategory: 'general',
      relevanceScore: Math.max(0, 100 - (index * 10))
    }));
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  private categorizeSource(domain: string): string {
    const categories = {
      academic: ['edu', 'arxiv.org', 'pubmed.ncbi.nlm.nih.gov', 'scholar.google.com'],
      technical: ['docs.', 'developer.', 'api.', 'github.com', 'stackoverflow.com'],
      news: ['news', 'reuters.com', 'bbc.com', 'cnn.com', 'techcrunch.com'],
      reference: ['wikipedia.org', 'mozilla.org', 'w3.org']
    };

    for (const [category, domains] of Object.entries(categories)) {
      if (domains.some(d => domain.includes(d))) {
        return category;
      }
    }
    return 'general';
  }

  private assessCredibility(domain: string): number {
    const credibilityMap: { [key: string]: number } = {
      'edu': 95,
      'gov': 95,
      'org': 80,
      'arxiv.org': 95,
      'pubmed.ncbi.nlm.nih.gov': 95,
      'stackoverflow.com': 85,
      'github.com': 80,
      'mozilla.org': 90,
      'w3.org': 95,
      'wikipedia.org': 75
    };

    for (const [pattern, score] of Object.entries(credibilityMap)) {
      if (domain.includes(pattern)) {
        return score;
      }
    }
    return 60; // Default credibility
  }

  private extractSummary(content: string, maxLength: number): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    let summary = '';
    for (const sentence of sentences) {
      if (summary.length + sentence.length <= maxLength) {
        summary += sentence.trim() + '. ';
      } else {
        break;
      }
    }
    return summary.trim();
  }

  private extractKeyPoints(content: string): string[] {
    const lines = content.split('\n').filter(line => line.trim().length > 10);
    const keyPoints: string[] = [];
    
    for (const line of lines) {
      if (line.match(/^[-*•]\s+/) || line.match(/^\d+\.\s+/)) {
        keyPoints.push(line.trim());
        if (keyPoints.length >= 5) break;
      }
    }
    
    return keyPoints;
  }

  private assessContentQuality(credibility: number, expertise: number, depth: number): 'high' | 'medium' | 'low' {
    const average = (credibility + expertise + depth) / 3;
    if (average >= 80) return 'high';
    if (average >= 60) return 'medium';
    return 'low';
  }

  private async synthesizeFindings(
    enrichedResults: EnrichedSearchResult[],
    allResults: any,
    intent: SearchIntent
  ): Promise<any> {
    const highQualityResults = enrichedResults.filter(r => r.analysis?.contentQuality === 'high');
    
    return {
      summary: `Analysis of ${enrichedResults.length} sources with ${highQualityResults.length} high-quality results.`,
      keyFindings: highQualityResults.slice(0, 3).map(r => r.analysis?.summary || r.snippet),
      expertRecommendations: [`Focus on high-credibility sources`, `Cross-reference findings`],
      credibilityAssessment: `${highQualityResults.length}/${enrichedResults.length} sources show high credibility`,
      gapsIdentified: [`More recent data needed`, `Additional technical depth required`]
    };
  }

  private countTotalSources(results: any): number {
    return Object.values(results).reduce((count: number, sourceResults: any) => 
      count + (Array.isArray(sourceResults) ? sourceResults.length : 0), 0
    );
  }

  private calculateConfidence(enrichedResults: EnrichedSearchResult[], allResults: any): number {
    const avgRelevance = enrichedResults.reduce((sum, r) => sum + r.relevanceScore, 0) / enrichedResults.length;
    const sourceCount = this.countTotalSources(allResults);
    return Math.min(100, avgRelevance * 0.7 + (sourceCount > 5 ? 30 : sourceCount * 6));
  }
}

export const intelligentSearchService = IntelligentSearchService.getInstance();
export default intelligentSearchService;
