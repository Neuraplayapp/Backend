/**
 * LAYER 2: SEARCH EXECUTION & ADAPTATION AGENT
 * 
 * This agent executes the search plan from the orchestrator.
 * It crafts dynamic queries and adapts the search process.
 */

import { apiService } from '../APIService';
import { SearchPlan, SearchStep, ConditionalStep } from './SearchOrchestrator';

export interface SearchResult {
  query: string;
  source: 'serper' | 'weather' | 'fallback';
  results: RawSearchResult[];
  metadata: {
    totalResults: number;
    executionTime: number;
    queryVariations: string[];
    adaptations: string[];
  };
}

export interface RawSearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  position: number;
  rawData: any;
}

export class SearchExecutor {
  /**
   * MAIN EXECUTION METHOD
   * Executes the complete search plan from orchestrator
   */
  async executeSearchPlan(plan: SearchPlan): Promise<SearchResult[]> {
    console.log('🔍 SearchExecutor: Executing search plan...');
    
    const results: SearchResult[] = [];
    
    // Execute initial search
    console.log('🎯 Executing initial search...');
    const initialResult = await this.executeSearchStep(plan.strategy.initialSearch);
    results.push(initialResult);
    
    // Execute parallel searches
    if (plan.strategy.parallelSearches) {
      console.log('⚡ Executing parallel searches...');
      const parallelResults = await Promise.all(
        plan.strategy.parallelSearches.map(step => this.executeSearchStep(step))
      );
      results.push(...parallelResults);
    }
    
    // Check for conditional search triggers
    if (plan.strategy.conditionalSearches) {
      console.log('🔀 Checking conditional search triggers...');
      const triggeredSearches = this.evaluateConditionalTriggers(
        plan.strategy.conditionalSearches,
        results
      );
      
      if (triggeredSearches.length > 0) {
        console.log(`🚨 Executing ${triggeredSearches.length} triggered conditional searches...`);
        const conditionalResults = await Promise.all(
          triggeredSearches.map(step => this.executeSearchStep(step))
        );
        results.push(...conditionalResults);
      }
    }
    
    return results;
  }

  /**
   * DYNAMIC QUERY FORMULATION
   * Generates multiple, diverse queries to avoid bias
   */
  private async executeSearchStep(step: SearchStep): Promise<SearchResult> {
    console.log(`🔍 Executing search: "${step.query}"`);
    
    const startTime = Date.now();
    const queryVariations = this.generateQueryVariations(step.query);
    const adaptations: string[] = [];
    
    // Try primary query first
    let searchResult = await this.performSingleSearch(step.query);
    
    // If results are insufficient, try variations
    if (this.areResultsInsufficient(searchResult)) {
      console.log('📊 Primary query insufficient, trying variations...');
      adaptations.push('Tried query variations due to insufficient results');
      
      for (const variation of queryVariations) {
        const variationResult = await this.performSingleSearch(variation);
        if (this.areResultsBetter(variationResult, searchResult)) {
          searchResult = variationResult;
          adaptations.push(`Improved results with variation: "${variation}"`);
          break;
        }
      }
    }
    
    const executionTime = Date.now() - startTime;
    
    return {
      query: step.query,
      source: 'serper',
      results: this.formatRawResults(searchResult.data?.results || []),
      metadata: {
        totalResults: searchResult.data?.results?.length || 0,
        executionTime,
        queryVariations,
        adaptations
      }
    };
  }

  /**
   * MULTI-ENGINE QUERY VARIATIONS
   * Creates diverse queries using advanced search operators
   */
  private generateQueryVariations(baseQuery: string): string[] {
    const variations: string[] = [];
    
    // 1. Exact phrase variations
    const keyTerms = this.extractKeyTerms(baseQuery);
    if (keyTerms.length > 1) {
      variations.push(`"${keyTerms.join(' ')}"`);
    }
    
    // 2. Synonym variations
    const synonyms = this.generateSynonyms(baseQuery);
    variations.push(...synonyms);
    
    // 3. Search operator variations
    variations.push(...this.addSearchOperators(baseQuery));
    
    // 4. Specificity variations
    variations.push(this.makeMoreSpecific(baseQuery));
    variations.push(this.makeBroader(baseQuery));
    
    return variations.slice(0, 5); // Limit to 5 variations
  }

  /**
   * SEARCH OPERATORS ENHANCEMENT
   * Adds advanced search operators based on query type
   */
  private addSearchOperators(query: string): string[] {
    const operators: string[] = [];
    
    // Site-specific searches
    if (query.includes('recipe') || query.includes('cooking')) {
      operators.push(`${query} (site:allrecipes.com OR site:foodnetwork.com)`);
      operators.push(`${query} -ads -"sponsored"`);
    }
    
    if (query.includes('code') || query.includes('programming')) {
      operators.push(`${query} (site:stackoverflow.com OR site:github.com)`);
      operators.push(`${query} "example" OR "tutorial"`);
    }
    
    if (query.includes('research') || query.includes('study')) {
      operators.push(`${query} (site:edu OR filetype:pdf)`);
      operators.push(`${query} "peer reviewed" OR "research study"`);
    }
    
    // Temporal operators
    if (query.includes('latest') || query.includes('recent')) {
      operators.push(`${query} after:2023`);
    }
    
    // Exclusion operators for cleaner results
    operators.push(`${query} -pinterest -ads`);
    
    return operators;
  }

  /**
   * CONDITIONAL TRIGGER EVALUATION
   * Determines which conditional searches should be executed
   */
  private evaluateConditionalTriggers(
    conditionalSearches: ConditionalStep[],
    currentResults: SearchResult[]
  ): ConditionalStep[] {
    const triggeredSearches: ConditionalStep[] = [];
    
    for (const conditionalStep of conditionalSearches) {
      let shouldTrigger = false;
      
      switch (conditionalStep.trigger) {
        case 'unusual_ingredients':
          shouldTrigger = this.hasUnusualIngredients(currentResults);
          break;
          
        case 'conflicting_info':
          shouldTrigger = this.hasConflictingInformation(currentResults);
          break;
          
        case 'insufficient_depth':
          shouldTrigger = this.hasInsufficientDepth(currentResults);
          break;
          
        case 'credibility_concerns':
          shouldTrigger = this.hasCredibilityConcerns(currentResults);
          break;
      }
      
      if (shouldTrigger) {
        console.log(`🚨 Triggered conditional search: ${conditionalStep.trigger}`);
        triggeredSearches.push(conditionalStep);
      }
    }
    
    return triggeredSearches;
  }

  /**
   * SINGLE SEARCH EXECUTION
   * Performs actual API call to search service
   */
  private async performSingleSearch(query: string): Promise<any> {
    try {
      // Use APIService for pure API call
      return await apiService.webSearch(query, {
        type: 'search',
        num: 10
      });
    } catch (error) {
      console.error(`❌ Search failed for query "${query}":`, error);
      return {
        success: false,
        data: { results: [] },
        error: error instanceof Error ? error.message : 'Search failed'
      };
    }
  }

  /**
   * RESULT QUALITY ASSESSMENT
   */
  private areResultsInsufficient(result: any): boolean {
    const results = result.data?.results || [];
    return results.length < 3 || this.hasLowQualityResults(results);
  }

  private areResultsBetter(newResult: any, currentResult: any): boolean {
    const newResults = newResult.data?.results || [];
    const currentResults = currentResult.data?.results || [];
    
    // More results is generally better
    if (newResults.length > currentResults.length) return true;
    
    // Check for higher quality indicators
    return this.hasHigherQualityResults(newResults, currentResults);
  }

  private hasLowQualityResults(results: any[]): boolean {
    // Check for signs of low quality results
    const lowQualityIndicators = results.filter(result => 
      result.title?.includes('ads') ||
      result.snippet?.length < 50 ||
      result.domain?.includes('pinterest') ||
      result.domain?.includes('spam')
    );
    
    return lowQualityIndicators.length > results.length * 0.5;
  }

  private hasHigherQualityResults(newResults: any[], currentResults: any[]): boolean {
    // Simple quality scoring based on snippet length and domain authority
    const newQuality = this.calculateAverageQuality(newResults);
    const currentQuality = this.calculateAverageQuality(currentResults);
    
    return newQuality > currentQuality;
  }

  private calculateAverageQuality(results: any[]): number {
    if (results.length === 0) return 0;
    
    const totalQuality = results.reduce((sum, result) => {
      let quality = 0;
      
      // Longer snippets usually indicate more content
      if (result.snippet?.length > 100) quality += 20;
      if (result.snippet?.length > 200) quality += 20;
      
      // Domain authority indicators
      if (result.domain?.includes('.edu')) quality += 30;
      if (result.domain?.includes('.gov')) quality += 30;
      if (result.domain?.includes('.org')) quality += 20;
      
      // Avoid low-quality domains
      if (result.domain?.includes('pinterest')) quality -= 20;
      if (result.domain?.includes('spam')) quality -= 30;
      
      return sum + Math.max(0, quality);
    }, 0);
    
    return totalQuality / results.length;
  }

  /**
   * TRIGGER CONDITION EVALUATORS
   */
  private hasUnusualIngredients(results: SearchResult[]): boolean {
    // Look for mentions of unusual or hard-to-find ingredients
    const unusualIngredients = [
      'nutritional yeast', 'cashew cream', 'aquafaba', 'tempeh',
      'miso paste', 'tahini', 'dulse', 'spirulina'
    ];
    
    return results.some(result =>
      result.results.some(item =>
        unusualIngredients.some(ingredient =>
          item.snippet.toLowerCase().includes(ingredient)
        )
      )
    );
  }

  private hasConflictingInformation(results: SearchResult[]): boolean {
    // Detect conflicting information across results
    // This is a simplified implementation
    const cookTimes = this.extractCookTimes(results);
    if (cookTimes.length > 1) {
      const maxTime = Math.max(...cookTimes);
      const minTime = Math.min(...cookTimes);
      return (maxTime - minTime) > 30; // More than 30-minute difference
    }
    return false;
  }

  private hasInsufficientDepth(results: SearchResult[]): boolean {
    // Check if results lack detailed information
    const avgSnippetLength = results.reduce((sum, result) => {
      const totalLength = result.results.reduce((s, r) => s + r.snippet.length, 0);
      return sum + (totalLength / result.results.length);
    }, 0) / results.length;
    
    return avgSnippetLength < 100; // Average snippet too short
  }

  private hasCredibilityConcerns(results: SearchResult[]): boolean {
    // Check for low-credibility sources
    const totalResults = results.reduce((sum, r) => sum + r.results.length, 0);
    const lowCredibilityCount = results.reduce((sum, result) =>
      sum + result.results.filter(r =>
        r.domain.includes('blogspot') ||
        r.domain.includes('wordpress') ||
        r.domain.includes('pinterest') ||
        !r.domain.includes('.')
      ).length, 0
    );
    
    return lowCredibilityCount > totalResults * 0.6; // More than 60% low credibility
  }

  /**
   * HELPER METHODS
   */
  private extractKeyTerms(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
  }

  private generateSynonyms(query: string): string[] {
    const synonymMap: { [key: string]: string[] } = {
      'recipe': ['cooking instructions', 'how to make', 'preparation'],
      'easy': ['simple', 'quick', 'beginner', 'basic'],
      'vegan': ['plant-based', 'dairy-free', 'no meat'],
      'code': ['programming', 'script', 'implementation'],
      'tutorial': ['guide', 'how-to', 'instructions', 'walkthrough']
    };
    
    let synonymQueries: string[] = [];
    
    for (const [word, synonyms] of Object.entries(synonymMap)) {
      if (query.toLowerCase().includes(word)) {
        synonyms.forEach(synonym => {
          synonymQueries.push(query.toLowerCase().replace(word, synonym));
        });
      }
    }
    
    return synonymQueries.slice(0, 3); // Limit synonyms
  }

  private makeMoreSpecific(query: string): string {
    return `${query} step by step detailed`;
  }

  private makeBroader(query: string): string {
    // Remove specificity words
    return query.replace(/\b(easy|simple|quick|detailed|step by step)\b/gi, '').trim();
  }

  private extractCookTimes(results: SearchResult[]): number[] {
    const times: number[] = [];
    const timePattern = /(\d+)\s*(?:minute|min|hour|hr)/gi;
    
    results.forEach(result => {
      result.results.forEach(item => {
        const matches = item.snippet.match(timePattern);
        if (matches) {
          matches.forEach(match => {
            const num = parseInt(match);
            if (!isNaN(num)) {
              times.push(match.includes('hour') || match.includes('hr') ? num * 60 : num);
            }
          });
        }
      });
    });
    
    return times;
  }

  private formatRawResults(results: any[]): RawSearchResult[] {
    return results.map((result, index) => ({
      title: result.title || 'No title',
      url: result.link || result.url || '#',
      snippet: result.snippet || result.description || '',
      domain: this.extractDomain(result.link || result.url || ''),
      position: index + 1,
      rawData: result
    }));
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  }
}

export const searchExecutor = new SearchExecutor();
