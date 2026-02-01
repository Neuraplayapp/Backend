/**
 * DYNAMIC SUGGESTION ENGINE
 * 
 * LLM-powered adaptive suggestion cards that learn from user behavior
 * and dynamically suggest relevant searches based on interests and context.
 */

import { SearchSuggestion, SearchContext } from './WebSearchEngine';
import { UnifiedMemoryManager } from './UnifiedMemoryManager';

export interface DynamicSuggestion extends SearchSuggestion {
  category: string;
  urgency: 'low' | 'medium' | 'high';
  personalization: number; // 0-1 score
  trendingScore: number; // 0-1 score
  source: 'user_behavior' | 'trending' | 'contextual' | 'llm_generated';
}

export interface UserInterestProfile {
  topics: Map<string, number>; // topic -> interest score
  searchPatterns: string[];
  preferredSources: string[];
  timePreferences: {
    recentEvents: number;
    historicalContent: number;
    futureProjections: number;
  };
}

export class DynamicSuggestionEngine {
  private static instance: DynamicSuggestionEngine;
  private memoryManager: UnifiedMemoryManager;
  private userProfiles: Map<string, UserInterestProfile> = new Map();

  private constructor() {
    this.memoryManager = UnifiedMemoryManager.getInstance();
  }

  static getInstance(): DynamicSuggestionEngine {
    if (!DynamicSuggestionEngine.instance) {
      DynamicSuggestionEngine.instance = new DynamicSuggestionEngine();
    }
    return DynamicSuggestionEngine.instance;
  }

  /**
   * GENERATE DYNAMIC SUGGESTIONS
   * Creates personalized, contextual suggestions ONLY if relevant to user's interests
   */
  async generateDynamicSuggestions(
    userId: string,
    currentQuery: string,
    searchResults: any[],
    conversationContext: string[] = []
  ): Promise<DynamicSuggestion[]> {
    try {
      console.log('🧠 DynamicSuggestionEngine: Checking user interests for relevance');

      // Get or build user profile
      const userProfile = await this.getUserProfile(userId);

      // CRITICAL: Only proceed if user has established interests
      if (userProfile.topics.size === 0 || userProfile.searchPatterns.length < 3) {
        console.log('🚨 User has insufficient interest history, showing no dynamic suggestions');
        return [];
      }

      // Check if current search is relevant to user's interests
      const isRelevantToUserInterests = this.isSearchRelevantToUserInterests(currentQuery, userProfile);
      
      if (!isRelevantToUserInterests) {
        console.log('🚨 Current search not relevant to user interests, showing no suggestions');
        return [];
      }

      console.log('✅ Search is relevant to user interests, generating personalized suggestions');

      // Generate LLM-powered contextual suggestions based on actual search content
      const llmSuggestions = await this.generateLLMContextualSuggestions(
        currentQuery,
        searchResults,
        userProfile,
        conversationContext
      );

      // Fallback to heuristic suggestions if LLM fails
      let allSuggestions = llmSuggestions.length > 0 ? llmSuggestions : [
        ...this.generateBehaviorBasedSuggestions(userProfile, currentQuery),
        ...this.generateContextualSuggestions(searchResults, conversationContext, userProfile)
      ];

      // STRICT FILTERING: Only keep suggestions that match user interests
      allSuggestions = this.filterByUserInterests(allSuggestions, userProfile);

      if (allSuggestions.length === 0) {
        console.log('🚨 No suggestions match user interests after filtering');
        return [];
      }

      // Apply personalization scoring
      const personalizedSuggestions = this.applyPersonalizationScoring(allSuggestions, userProfile);

      // Update user profile based on current search
      await this.updateUserProfile(userId, currentQuery, searchResults);

      return personalizedSuggestions.slice(0, 4); // Return max 4 highly relevant suggestions

    } catch (error) {
      console.error('🚨 Dynamic suggestion generation failed:', error);
      return []; // Return empty array instead of fallback if user has no interests
    }
  }

  /**
   * GENERATE LLM CONTEXTUAL SUGGESTIONS
   * Uses LLM to create intelligent, contextual suggestions based on actual search content
   */
  private async generateLLMContextualSuggestions(
    currentQuery: string,
    searchResults: any[],
    userProfile: UserInterestProfile,
    conversationContext: string[] = []
  ): Promise<DynamicSuggestion[]> {
    try {
      console.log('🧠 Generating LLM-powered contextual suggestions');
      
      // Extract key information from search results
      const searchContent = this.extractSearchContent(searchResults);
      const userInterests = Array.from(userProfile.topics.keys()).slice(0, 5);
      
      // Use ToolRegistry to call LLM for suggestion generation
      const { toolRegistry } = await import('./ToolRegistry');
      
      const prompt = this.buildSuggestionPrompt(
        currentQuery,
        searchContent,
        userInterests,
        conversationContext
      );
      
      const llmResult = await toolRegistry.execute('llm-completion', {
        prompt,
        model: 'accounts/fireworks/models/gpt-oss-120b',
        temperature: 0.8,
        maxTokens: 500
      }, {
        sessionId: 'suggestion-engine',
        userId: 'system',
        startTime: Date.now(),
        timestamp: new Date().toISOString()
      });
      
      if (llmResult.success && llmResult.data) {
        const suggestions = this.parseLLMSuggestions(llmResult.data, userProfile);
        console.log('✅ Generated', suggestions.length, 'LLM-powered suggestions');
        return suggestions;
      }
      
      console.warn('🚨 LLM suggestion generation failed, using fallback');
      return [];
      
    } catch (error) {
      console.error('🚨 LLM contextual suggestion generation failed:', error);
      return [];
    }
  }

  /**
   * GENERATE LLM SUGGESTIONS (Legacy method)
   * Uses LLM to create intelligent, contextual suggestions
   */
  private async generateLLMSuggestions(
    query: string,
    results: any[],
    userProfile: UserInterestProfile
  ): Promise<DynamicSuggestion[]> {
    try {
      // Use dynamic import with multiple fallback patterns
      let apiService;
      try {
        const imported = await import('./APIService');
        apiService = imported.apiService || imported.default;
      } catch (importError) {
        console.warn('🚨 APIService import failed for LLM suggestions, using fallback');
        return [];
      }

      if (!apiService || typeof apiService.post !== 'function') {
        return [];
      }

      const userInterests = Array.from(userProfile.topics.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([topic]) => topic)
        .join(', ');

      const resultTopics = results.slice(0, 3).map(r => r.title).join('; ');

      const prompt = `You are an intelligent search suggestion expert. Generate 4 smart follow-up searches.

CURRENT SEARCH: "${query}"
TOP RESULTS FOUND: ${resultTopics}
USER INTERESTS: ${userInterests}

Generate suggestions that are:
1. Highly relevant to current search
2. Personalized to user interests
3. Diverse in perspective
4. Actionable and specific

Return JSON array:
[
  {
    "query": "specific search query (2-6 words)",
    "reasoning": "why this is valuable",
    "type": "follow_up|related|deeper|broader|trending",
    "confidence": 0.8,
    "category": "politics|technology|business|health|etc",
    "urgency": "low|medium|high"
  }
]

Make queries SHORT, SPECIFIC, and ENGAGING.`;

      const response = await apiService.post('/api/unified-route', {
        service: 'fireworks',
        endpoint: 'llm-completion',
        data: {
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 400,
          temperature: 0.7,
          model: 'accounts/fireworks/models/gpt-oss-120b'
        }
      });

      const llmSuggestions = JSON.parse(response.data.choices[0].message.content);

      return llmSuggestions.map((suggestion: any) => ({
        ...suggestion,
        personalization: 0.8, // High personalization from LLM
        trendingScore: 0.6,
        source: 'llm_generated' as const
      }));

    } catch (error) {
      console.error('🚨 LLM suggestion generation failed:', error);
      return [];
    }
  }

  /**
   * GENERATE BEHAVIOR-BASED SUGGESTIONS
   * Creates suggestions based on user's search history and interests
   */
  private generateBehaviorBasedSuggestions(
    userProfile: UserInterestProfile,
    currentQuery: string
  ): DynamicSuggestion[] {
    const suggestions: DynamicSuggestion[] = [];
    
    // Find related topics from user interests
    const topInterests = Array.from(userProfile.topics.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    topInterests.forEach(([topic, score]) => {
      if (currentQuery.toLowerCase().includes(topic.toLowerCase())) return; // Skip if already searched

      suggestions.push({
        query: `${topic} ${new Date().getFullYear()}`,
        reasoning: `Based on your interest in ${topic}`,
        type: 'related',
        confidence: score,
        category: this.categorizeQuery(`${topic} news`),
        urgency: score > 0.7 ? 'medium' : 'low',
        personalization: score,
        trendingScore: 0.3,
        source: 'user_behavior'
      });
    });

    return suggestions;
  }

  /**
   * CHECK IF SEARCH IS RELEVANT TO USER INTERESTS
   * Returns true only if the search relates to user's established interests
   */
  private isSearchRelevantToUserInterests(query: string, userProfile: UserInterestProfile): boolean {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);

    // Check direct topic matches
    for (const [topic, score] of userProfile.topics.entries()) {
      if (score > 0.3) { // Only consider significant interests
        if (queryLower.includes(topic.toLowerCase()) || 
            queryWords.some(word => topic.toLowerCase().includes(word))) {
          console.log(`✅ Query matches user interest: ${topic} (score: ${score})`);
          return true;
        }
      }
    }

    // Check similarity to past search patterns
    const similarPatterns = userProfile.searchPatterns.filter(pattern => {
      const patternWords = pattern.toLowerCase().split(/\s+/);
      const commonWords = queryWords.filter(word => 
        patternWords.some(pWord => pWord.includes(word) || word.includes(pWord))
      );
      return commonWords.length >= 2; // At least 2 words in common
    });

    if (similarPatterns.length > 0) {
      console.log(`✅ Query similar to past searches: ${similarPatterns[0]}`);
      return true;
    }

    console.log(`🚨 Query "${query}" not relevant to user interests`);
    return false;
  }

  /**
   * FILTER SUGGESTIONS BY USER INTERESTS
   * Only keeps suggestions that align with user's established interests
   */
  private filterByUserInterests(
    suggestions: DynamicSuggestion[], 
    userProfile: UserInterestProfile
  ): DynamicSuggestion[] {
    const userTopics = Array.from(userProfile.topics.keys())
      .filter(topic => userProfile.topics.get(topic)! > 0.3); // Only significant interests

    if (userTopics.length === 0) return [];

    return suggestions.filter(suggestion => {
      const suggestionLower = suggestion.query.toLowerCase();
      
      // Check if suggestion relates to any user topic
      const isRelevant = userTopics.some(topic => 
        suggestionLower.includes(topic.toLowerCase()) ||
        topic.toLowerCase().includes(suggestionLower.split(' ')[0]) // First word match
      );

      if (isRelevant) {
        console.log(`✅ Keeping suggestion "${suggestion.query}" - matches interest`);
        return true;
      }

      console.log(`🚨 Filtering out "${suggestion.query}" - not relevant to user interests`);
      return false;
    });
  }

  /**
   * GENERATE CONTEXTUAL SUGGESTIONS
   * Creates suggestions based on current search results
   */
  private generateContextualSuggestions(
    results: any[],
    conversationContext: string[],
    userProfile: UserInterestProfile
  ): DynamicSuggestion[] {
    const suggestions: DynamicSuggestion[] = [];

    if (results.length === 0) return suggestions;

    // Extract entities and topics from results
    const entities = this.extractEntities(results);
    const recentContext = conversationContext.slice(-2).join(' ');

    entities.slice(0, 3).forEach(entity => {
      suggestions.push({
        query: `${entity} analysis`,
        reasoning: `Dive deeper into ${entity}`,
        type: 'deeper',
        confidence: 0.7,
        category: this.categorizeQuery(entity),
        urgency: 'medium',
        personalization: 0.5,
        trendingScore: 0.7,
        source: 'contextual'
      });
    });

    return suggestions;
  }

  // REMOVED: generateTrendingSuggestions - we only want user-interest relevant suggestions

  /**
   * EXTRACT SEARCH CONTENT
   * Extracts key information from search results for LLM processing
   */
  private extractSearchContent(searchResults: any[]): string {
    if (!searchResults || searchResults.length === 0) return '';
    
    return searchResults.slice(0, 3).map(result => {
      const title = result.title || '';
      const snippet = result.snippet || '';
      const source = result.source || result.displayLink || '';
      return `Title: ${title}\nContent: ${snippet}\nSource: ${source}`;
    }).join('\n\n');
  }

  /**
   * BUILD SUGGESTION PROMPT
   * Creates a contextual prompt for LLM suggestion generation
   */
  private buildSuggestionPrompt(
    currentQuery: string,
    searchContent: string,
    userInterests: string[],
    conversationContext: string[]
  ): string {
    return `Based on the user's search query and results, generate 4 intelligent follow-up search suggestions.

USER'S SEARCH QUERY: "${currentQuery}"

SEARCH RESULTS CONTENT:
${searchContent}

USER'S INTERESTS: ${userInterests.join(', ')}

CONVERSATION CONTEXT: ${conversationContext.slice(-3).join(' ')}

REQUIREMENTS:
1. Generate suggestions that build naturally on the search content
2. Make them specific and actionable, not generic
3. Only suggest topics relevant to the user's interests
4. Use natural language that sounds conversational
5. Focus on deeper exploration of the topic

FORMAT: Return exactly 4 suggestions as a JSON array:
[
  {
    "query": "specific search suggestion",
    "reasoning": "why this follows from the search results",
    "type": "follow_up"
  }
]

EXAMPLES OF GOOD SUGGESTIONS:
- "Show latest developments in [specific topic from results]"
- "How did [specific entity] respond to [specific event]"
- "What are the implications of [specific finding] for [related area]"

Generate suggestions now:`;
  }

  /**
   * PARSE LLM SUGGESTIONS
   * Parses LLM response into DynamicSuggestion objects
   */
  private parseLLMSuggestions(llmData: any, userProfile: UserInterestProfile): DynamicSuggestion[] {
    try {
      let suggestions: any[] = [];
      
      // Try to extract JSON from LLM response
      const text = llmData.text || llmData.content || llmData.response || '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        console.warn('🚨 Could not parse LLM suggestions JSON');
        return [];
      }
      
      return suggestions.slice(0, 4).map((suggestion, index) => ({
        query: suggestion.query || `Follow-up ${index + 1}`,
        reasoning: suggestion.reasoning || 'Generated from search context',
        type: suggestion.type || 'follow_up',
        category: 'contextual',
        urgency: 'medium' as const,
        personalization: this.calculatePersonalizationScore(suggestion.query, userProfile),
        trendingScore: 0.7,
        source: 'llm_generated' as const
      }));
      
    } catch (error) {
      console.error('🚨 Failed to parse LLM suggestions:', error);
      return [];
    }
  }

  /**
   * CALCULATE PERSONALIZATION SCORE
   * Scores how well a suggestion matches user interests
   */
  private calculatePersonalizationScore(query: string, userProfile: UserInterestProfile): number {
    const queryLower = query.toLowerCase();
    let score = 0;
    
    for (const [topic, interest] of userProfile.topics) {
      if (queryLower.includes(topic.toLowerCase())) {
        score += interest;
      }
    }
    
    return Math.min(score / userProfile.topics.size, 1.0);
  }

  /**
   * GET USER PROFILE
   * Retrieves or builds user interest profile from search history
   */
  private async getUserProfile(userId: string): Promise<UserInterestProfile> {
    if (this.userProfiles.has(userId)) {
      return this.userProfiles.get(userId)!;
    }

    try {
      // Get search history from memory with proper error handling
      let searchMemories: any[] = [];
      
      try {
        const memoryResult = await this.memoryManager.searchMemories({
          userId,
          query: 'search',
          filters: { memoryType: 'search_context' },
          limit: 20
        });
        
        // Handle both array and object responses
        if (Array.isArray(memoryResult)) {
          searchMemories = memoryResult;
        } else if (memoryResult && Array.isArray(memoryResult.memories)) {
          searchMemories = memoryResult.memories;
        } else {
          console.log('🚨 No search memories found for user:', userId);
        }
      } catch (memoryError) {
        console.warn('🚨 Memory search failed, using empty profile:', memoryError);
      }

      const profile: UserInterestProfile = {
        topics: new Map(),
        searchPatterns: [],
        preferredSources: [],
        timePreferences: {
          recentEvents: 0.7,
          historicalContent: 0.2,
          futureProjections: 0.1
        }
      };

      // Analyze search patterns with safety checks
      if (searchMemories && searchMemories.length > 0) {
        searchMemories.forEach(memory => {
          try {
            const query = memory.metadata?.query || memory.content || '';
            if (query) {
              const topics = this.extractTopics(query);
              
              topics.forEach(topic => {
                const currentScore = profile.topics.get(topic) || 0;
                profile.topics.set(topic, currentScore + 0.1);
              });

              profile.searchPatterns.push(query);
            }
          } catch (parseError) {
            console.warn('🚨 Failed to parse memory:', parseError);
          }
        });
      }

      this.userProfiles.set(userId, profile);
      return profile;

    } catch (error) {
      console.error('🚨 Failed to build user profile:', error);
      return {
        topics: new Map(),
        searchPatterns: [],
        preferredSources: [],
        timePreferences: {
          recentEvents: 0.7,
          historicalContent: 0.2,
          futureProjections: 0.1
        }
      };
    }
  }

  /**
   * UTILITY METHODS
   */
  private extractEntities(results: any[]): string[] {
    const text = results.map(r => r.title + ' ' + r.snippet).join(' ');
    const words = text.split(/\s+/).filter(word => word.length > 3);
    
    // Simple entity extraction (could be enhanced with NLP)
    const entities = [...new Set(words)]
      .filter(word => word.charAt(0) === word.charAt(0).toUpperCase())
      .slice(0, 5);

    return entities;
  }

  private extractTopics(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const topics = words.filter(word => word.length > 4);
    return [...new Set(topics)].slice(0, 3);
  }

  private categorizeQuery(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('trump') || lowerQuery.includes('election') || lowerQuery.includes('politics')) return 'politics';
    if (lowerQuery.includes('tech') || lowerQuery.includes('ai') || lowerQuery.includes('software')) return 'technology';
    if (lowerQuery.includes('health') || lowerQuery.includes('medical') || lowerQuery.includes('covid')) return 'health';
    if (lowerQuery.includes('business') || lowerQuery.includes('economy') || lowerQuery.includes('market')) return 'business';
    if (lowerQuery.includes('sports') || lowerQuery.includes('game') || lowerQuery.includes('team')) return 'sports';
    
    return 'general';
  }

  private applyPersonalizationScoring(
    suggestions: DynamicSuggestion[], 
    userProfile: UserInterestProfile
  ): DynamicSuggestion[] {
    return suggestions
      .map(suggestion => {
        // Boost score based on user interests
        const topicMatch = Array.from(userProfile.topics.keys())
          .some(topic => suggestion.query.toLowerCase().includes(topic.toLowerCase()));
        
        if (topicMatch) {
          suggestion.personalization += 0.3;
          suggestion.confidence += 0.2;
        }

        return suggestion;
      })
      .sort((a, b) => {
        // Sort by combined score
        const scoreA = a.confidence * 0.4 + a.personalization * 0.3 + a.trendingScore * 0.3;
        const scoreB = b.confidence * 0.4 + b.personalization * 0.3 + b.trendingScore * 0.3;
        return scoreB - scoreA;
      });
  }

  private async updateUserProfile(userId: string, query: string, results: any[]): Promise<void> {
    const profile = this.userProfiles.get(userId);
    if (!profile) return;

    // Update topic interests
    const topics = this.extractTopics(query);
    topics.forEach(topic => {
      const currentScore = profile.topics.get(topic) || 0;
      profile.topics.set(topic, Math.min(currentScore + 0.1, 1.0)); // Cap at 1.0
    });

    // Update preferred sources
    results.forEach(result => {
      if (result.source && !profile.preferredSources.includes(result.source)) {
        profile.preferredSources.push(result.source);
      }
    });

    this.userProfiles.set(userId, profile);
  }

  private getFallbackSuggestions(query: string): DynamicSuggestion[] {
    return [
      {
        query: `${query} 2025`,
        reasoning: 'Get current year information',
        type: 'follow_up',
        confidence: 0.7,
        category: 'general',
        urgency: 'low',
        personalization: 0.5,
        trendingScore: 0.6,
        source: 'contextual'
      },
      {
        query: `${query} analysis`,
        reasoning: 'Get detailed analysis',
        type: 'deeper',
        confidence: 0.6,
        category: 'general',
        urgency: 'medium',
        personalization: 0.4,
        trendingScore: 0.5,
        source: 'contextual'
      }
    ];
  }
}

export const dynamicSuggestionEngine = DynamicSuggestionEngine.getInstance();
