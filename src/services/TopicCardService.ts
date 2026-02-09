/**
 * 🎯 Topic Card Service
 * 
 * LLM-powered context analysis and content generation for topic cards.
 * 
 * Features:
 * - Analyze canvas content with LLM
 * - Generate contextually relevant addition cards
 * - Pre-generate content snippets for preview
 * - One-click add to canvas
 * - Learning from user actions
 */

// Browser-compatible EventEmitter

import { llmService } from './LLMHelper';
import { getUniversalCanvasService } from './UniversalCanvasService';

// Browser-compatible EventEmitter
class EventEmitter {  
  private events: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
  }

  off(event: string, listener: Function): void {
    const listeners = this.events.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(...args));
    }
  }

  removeAllListeners(): void {
    this.events.clear();
  }
}

export type CardType = 'section' | 'code' | 'chart' | 'concept' | 'expand';

export interface TopicCard {
  id: string;
  type: CardType;
  title: string;
  preview: string;
  relevanceScore: number;
  positionHint: 'below' | 'related' | 'append';
  metadata: {
    language?: string;
    chartType?: string;
    keywords?: string[];
    estimatedLength?: number;
  };
  isPinned: boolean;
  isDismissed: boolean;
  createdAt: number;
}

export interface CanvasAnalysis {
  mainTopic: string;
  keywords: string[];
  contentType: 'document' | 'code' | 'chart';
  currentLength: number;
  suggestedAdditions: Array<{
    type: CardType;
    title: string;
    preview: string;
    relevance: number;
  }>;
}

export class TopicCardService extends EventEmitter {
  private cards: Map<string, TopicCard> = new Map();
  private dismissedCards: Set<string> = new Set();
  private pinnedCards: Set<string> = new Set();
  private userActions: Array<{ cardId: string; action: 'add' | 'dismiss' | 'pin'; timestamp: number }> = [];
  private cardGenerationCount: number = 0;

  /**
   * Analyze canvas content and generate contextual cards
   */
  async analyzeAndGenerateCards(
    elementId: string,
    content: string,
    contentType: 'document' | 'code' | 'chart',
    sessionId?: string
  ): Promise<TopicCard[]> {
    console.log(`[np] topic-cards:analyze ${elementId}`);
    
    // Clear previous non-pinned cards
    this.cards.forEach((card, id) => {
      if (!this.pinnedCards.has(id)) {
        this.cards.delete(id);
      }
    });

    // Analyze content (now using LLM)
    const analysis = await this.analyzeContent(content, contentType);
    
    // Generate cards based on analysis
    const newCards = this.createCardsFromAnalysis(analysis, elementId);
    
    // Store and emit cards
    newCards.forEach(card => {
      this.cards.set(card.id, card);
    });
    
    this.emit('cards-generated', { elementId, cards: newCards });
    
    return newCards;
  }

  /**
   * 🎯 TIER 2: LLM-powered content analysis
   * Replaces regex keyword extraction and topic inference
   */
  private async analyzeContent(content: string, contentType: 'document' | 'code' | 'chart'): Promise<CanvasAnalysis> {
    // Step 1: Extract keywords using LLM
    const keywords = await this.extractKeywordsLLM(content);
    
    // Step 2: Infer main topic using LLM
    const mainTopic = await this.inferMainTopicLLM(content, keywords);
    
    // Step 3: Generate suggestions using LLM
    const suggestedAdditions = await this.generateSuggestionsLLM(mainTopic, keywords, contentType);
    
    return {
      mainTopic,
      keywords,
      contentType,
      currentLength: content.length,
      suggestedAdditions
    };
  }

  /**
   * 🎯 TIER 2: LLM keyword extraction (with structural fallback)
   */
  private async extractKeywordsLLM(content: string): Promise<string[]> {
    return llmService.classify(
      content.substring(0, 1000), // Limit for faster processing
      `Extract 5-10 most important keywords from this content. Respond with JSON: ["keyword1", "keyword2", ...]. ONLY JSON, no other text.`,
      () => this.extractKeywordsStructural(content),
      `keywords:${content.substring(0, 50)}`
    ).then(result => {
      try {
        const parsed = typeof result.result === 'string'
          ? JSON.parse(result.result)
          : result.result;
        
        return Array.isArray(parsed) 
          ? parsed.filter((k: any) => typeof k === 'string')
          : this.extractKeywordsStructural(content);
      } catch (e) {
        console.warn('⚠️ Keyword extraction JSON parsing failed, using structural fallback');
        return this.extractKeywordsStructural(content);
      }
    });
  }

  /**
   * 🎯 TIER 3: Structural keyword extraction (fallback)
   * Simple word frequency analysis without regex
   */
  private extractKeywordsStructural(content: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
      'of', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has',
      'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might'
    ]);
    
    // Split by whitespace (no regex)
    const words: string[] = [];
    let currentWord = '';
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const code = char.charCodeAt(0);
      
      // Check if alphanumeric (no regex: just character codes)
      const isAlphaNum = (code >= 48 && code <= 57) ||  // 0-9
                         (code >= 65 && code <= 90) ||   // A-Z
                         (code >= 97 && code <= 122);    // a-z
      
      if (isAlphaNum) {
        currentWord += char.toLowerCase();
      } else {
        if (currentWord.length > 3 && !stopWords.has(currentWord)) {
          words.push(currentWord);
        }
        currentWord = '';
      }
    }
    
    if (currentWord.length > 3 && !stopWords.has(currentWord)) {
      words.push(currentWord);
    }
    
    // Count frequency
    const frequency: Record<string, number> = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    
    // Return top 10 keywords
    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * 🎯 TIER 2: LLM topic inference (with structural fallback)
   */
  private async inferMainTopicLLM(content: string, keywords: string[]): Promise<string> {
    return llmService.classify(
      `Content: ${content.substring(0, 500)}\n\nKeywords: ${keywords.join(', ')}`,
      `What is the main topic or title for this content? Respond with ONLY the topic name (1-5 words), no JSON, no explanation.`,
      () => this.inferMainTopicStructural(content, keywords),
      `topic:${content.substring(0, 50)}`
    ).then(result => result.result.trim());
  }

  /**
   * 🎯 TIER 3: Structural topic inference (fallback)
   * Looks for markdown headers or uses top keyword
   */
  private inferMainTopicStructural(content: string, keywords: string[]): string {
    // Look for markdown headers (# Header) without regex
    const lines = content.split('\n');
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();
      
      // Check if line starts with # (no regex)
      if (line.length > 0 && line[0] === '#') {
        let hashCount = 0;
        for (let j = 0; j < line.length && line[j] === '#'; j++) {
          hashCount++;
        }
        
        // Valid header: 1-6 hashes followed by space
        if (hashCount <= 6 && hashCount > 0 && line[hashCount] === ' ') {
          return line.substring(hashCount + 1).trim();
        }
      }
    }
    
    // Use top keyword
    if (keywords.length > 0) {
      return keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1);
    }
    
    return 'Topic';
  }

  /**
   * 🎯 TIER 2: LLM suggestion generation (with structural fallback)
   */
  private async generateSuggestionsLLM(
    mainTopic: string,
    keywords: string[],
    contentType: 'document' | 'code' | 'chart'
  ): Promise<CanvasAnalysis['suggestedAdditions']> {
    return llmService.classify(
      `Topic: ${mainTopic}\nKeywords: ${keywords.join(', ')}\nContent Type: ${contentType}`,
      `Generate 3-5 content suggestions as JSON array:
[
  { "type": "section|code|chart|concept|expand", "title": "...", "preview": "...", "relevance": 0-100 },
  ...
]
ONLY JSON array, no other text.`,
      () => this.generateSuggestionsStructural(mainTopic, keywords, contentType),
      `suggestions:${mainTopic}:${contentType}`
    ).then(result => {
      try {
        const parsed = typeof result.result === 'string'
          ? JSON.parse(result.result)
          : result.result;
        
        return Array.isArray(parsed)
          ? parsed.filter((s: any) => s.type && s.title && s.preview && typeof s.relevance === 'number')
          : this.generateSuggestionsStructural(mainTopic, keywords, contentType);
      } catch (e) {
        console.warn('⚠️ Suggestion generation JSON parsing failed, using structural fallback');
        return this.generateSuggestionsStructural(mainTopic, keywords, contentType);
      }
    });
  }

  /**
   * 🎯 TIER 3: Structural suggestion generation (fallback)
   * Simple keyword-based suggestions
   */
  private generateSuggestionsStructural(
    mainTopic: string,
    keywords: string[],
    contentType: 'document' | 'code' | 'chart'
  ): CanvasAnalysis['suggestedAdditions'] {
    const suggestions: CanvasAnalysis['suggestedAdditions'] = [];
    
    // Check for specific keywords (no regex, just includes/indexOf)
    const hasNeuroKeywords = keywords.some(k => 
      k.includes('neural') || k.includes('brain') || k.includes('neuro') || k.includes('biology')
    );
    
    const hasLearningKeywords = keywords.some(k =>
      k.includes('learn') || k.includes('education') || k.includes('cognitive') || k.includes('understand')
    );
    
    if (contentType === 'document') {
      if (hasNeuroKeywords) {
        suggestions.push({
          type: 'section',
          title: 'Add section: Neural Mechanisms',
          preview: 'Detailed explanation of neural mechanisms underlying ' + mainTopic,
          relevance: 95
        });
        
        suggestions.push({
          type: 'code',
          title: 'Add code: Brain Activity Visualization',
          preview: 'Python code for visualizing neural activity patterns',
          relevance: 85
        });
      }
      
      if (hasLearningKeywords) {
        suggestions.push({
          type: 'section',
          title: 'Add section: Cognitive Load Theory',
          preview: 'Explanation of cognitive load principles applied to ' + mainTopic,
          relevance: 90
        });
      }
      
      // Always add general expansion
      suggestions.push({
        type: 'expand',
        title: 'Expand on: ' + (keywords[0] || mainTopic),
        preview: 'Add more detailed information related to ' + (keywords[0] || mainTopic),
        relevance: 75
      });
    }
    
    if (contentType === 'code') {
      suggestions.push({
        type: 'code',
        title: 'Add tests: Unit Testing',
        preview: 'Comprehensive unit tests for the code with edge cases',
        relevance: 90
      });
      
      suggestions.push({
        type: 'section',
        title: 'Add documentation: API Reference',
        preview: 'Detailed API documentation with parameters and examples',
        relevance: 85
      });
    }
    
    if (contentType === 'chart') {
      suggestions.push({
        type: 'chart',
        title: 'Add related chart: Comparative View',
        preview: 'Additional chart showing comparative analysis',
        relevance: 85
      });
      
      suggestions.push({
        type: 'section',
        title: 'Add analysis: Data Insights',
        preview: 'Written analysis explaining patterns from chart data',
        relevance: 80
      });
    }
    
    return suggestions.sort((a, b) => b.relevance - a.relevance).slice(0, 5);
  }

  /**
   * Create card objects from analysis
   */
  private createCardsFromAnalysis(analysis: CanvasAnalysis, elementId: string): TopicCard[] {
    return analysis.suggestedAdditions.map(suggestion => ({
      id: `card-${Date.now()}-${++this.cardGenerationCount}`,
      type: suggestion.type,
      title: suggestion.title,
      preview: suggestion.preview,
      relevanceScore: suggestion.relevance,
      positionHint: 'below' as const,
      metadata: {
        keywords: analysis.keywords,
        estimatedLength: suggestion.preview.length * 3
      },
      isPinned: false,
      isDismissed: false,
      createdAt: Date.now()
    }));
  }

  /**
   * Generate actual content for a card (calls LLM in production)
   */
  async generateCardContent(card: TopicCard): Promise<string> {
    let content = card.preview;
    
    switch (card.type) {
      case 'section':
        content = `## ${card.title.replace('Add section: ', '')}\n\n${card.preview}\n\n### Key Points\n\n- Important aspect 1\n- Important aspect 2\n- Important aspect 3\n\n### Details\n\n${card.preview} This section provides comprehensive coverage of the topic with examples and references.`;
        break;
        
      case 'code':
        const language = card.metadata.language || 'python';
        content = `\`\`\`${language}\n# ${card.title.replace('Add code: ', '')}\n\nimport numpy as np\nimport matplotlib.pyplot as plt\n\ndef visualize_data():\n    # TODO: Implementation\n    pass\n\nif __name__ == "__main__":\n    visualize_data()\n\`\`\`\n\n**Description**: ${card.preview}`;
        break;
        
      case 'chart':
        content = JSON.stringify({
          type: 'chart',
          chartType: card.metadata.chartType || 'bar',
          title: card.title.replace('Add chart: ', ''),
          series: [
            { label: 'A', value: 10 },
            { label: 'B', value: 20 },
            { label: 'C', value: 15 }
          ]
        }, null, 2);
        break;
        
      case 'concept':
        content = `### ${card.title.replace('Add concept: ', '')}\n\n${card.preview}\n\n**Definition**: A detailed definition goes here.\n\n**Examples**:\n- Example 1\n- Example 2\n\n**Related Concepts**: List of related concepts.`;
        break;
        
      case 'expand':
        content = card.preview + '\n\n### Additional Information\n\nMore detailed information about this topic, including:\n\n- Detailed point 1\n- Detailed point 2\n- Detailed point 3\n\n### Conclusion\n\nSummary and takeaways.';
        break;
    }
    
    return content;
  }

  /**
   * Add card content to canvas
   */
  async addCardToCanvas(cardId: string, elementId: string, sessionId?: string): Promise<boolean> {
    const card = this.cards.get(cardId);
    if (!card || card.isDismissed) {
      return false;
    }
    
    try {
      // Generate full content
      const content = await this.generateCardContent(card);
      
      // Get canvas service
      const canvasService = getUniversalCanvasService(sessionId);
      
      // Determine element type based on card type
      const elementType = card.type === 'code' ? 'code' : card.type === 'chart' ? 'chart' : 'document';
      
      // Create new element or add version to existing
      if (card.positionHint === 'append') {
        await canvasService.addVersion(elementId, content, card.title);
      } else {
        await canvasService.createElement({
          type: elementType,
          content: elementType === 'chart' ? JSON.parse(content) : content,
          metadata: {
            sourceCard: cardId,
            addedFromSuggestion: true
          }
        });
      }
      
      // Track action
      this.userActions.push({
        cardId,
        action: 'add',
        timestamp: Date.now()
      });
      
      this.emit('card-added', { cardId, elementId });
      console.log(`[np] topic-cards:add ${cardId} -> ${elementId}`);
      
      return true;
    } catch (error) {
      console.error('Failed to add card to canvas:', error);
      return false;
    }
  }

  /**
   * Dismiss a card
   */
  dismissCard(cardId: string): void {
    const card = this.cards.get(cardId);
    if (card) {
      card.isDismissed = true;
      this.dismissedCards.add(cardId);
      
      this.userActions.push({
        cardId,
        action: 'dismiss',
        timestamp: Date.now()
      });
      
      this.emit('card-dismissed', cardId);
      console.log(`[np] topic-cards:dismiss ${cardId}`);
    }
  }

  /**
   * Pin a card
   */
  pinCard(cardId: string): void {
    const card = this.cards.get(cardId);
    if (card) {
      card.isPinned = true;
      this.pinnedCards.add(cardId);
      
      this.userActions.push({
        cardId,
        action: 'pin',
        timestamp: Date.now()
      });
      
      this.emit('card-pinned', cardId);
      console.log(`[np] topic-cards:pin ${cardId}`);
    }
  }

  /**
   * Unpin a card
   */
  unpinCard(cardId: string): void {
    const card = this.cards.get(cardId);
    if (card) {
      card.isPinned = false;
      this.pinnedCards.delete(cardId);
      
      this.emit('card-unpinned', cardId);
      console.log(`[np] topic-cards:unpin ${cardId}`);
    }
  }

  /**
   * Get all active cards (not dismissed)
   */
  getActiveCards(): TopicCard[] {
    return Array.from(this.cards.values())
      .filter(card => !card.isDismissed)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Get dismissed cards
   */
  getDismissedCards(): TopicCard[] {
    return Array.from(this.cards.values())
      .filter(card => card.isDismissed);
  }

  /**
   * Get pinned cards
   */
  getPinnedCards(): TopicCard[] {
    return Array.from(this.cards.values())
      .filter(card => card.isPinned);
  }

  /**
   * Clear all cards
   */
  clearCards(): void {
    this.cards.clear();
    this.dismissedCards.clear();
    this.emit('cards-cleared');
    console.log('[np] topic-cards:clear');
  }

  /**
   * Get user actions history
   */
  getUserActionsHistory(): Array<{ cardId: string; action: string; timestamp: number }> {
    return [...this.userActions];
  }
}

// Singleton instance
export const topicCardService = new TopicCardService();