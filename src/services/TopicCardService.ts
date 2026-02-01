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

import { getUniversalCanvasService } from './UniversalCanvasService';

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

    // Analyze content
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
   * Analyze content (in production, this would call an LLM API)
   */
  private async analyzeContent(content: string, contentType: 'document' | 'code' | 'chart'): Promise<CanvasAnalysis> {
    // Extract keywords (simple implementation - in production use NLP/LLM)
    const keywords = this.extractKeywords(content);
    const mainTopic = this.inferMainTopic(content, keywords);
    
    // Generate suggestions based on content type and keywords
    const suggestedAdditions = this.generateSuggestions(mainTopic, keywords, contentType);
    
    return {
      mainTopic,
      keywords,
      contentType,
      currentLength: content.length,
      suggestedAdditions
    };
  }

  /**
   * Extract keywords from content (simplified - in production use LLM)
   */
  private extractKeywords(content: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'are', 'was', 'were']);
    
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));
    
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
   * Infer main topic (simplified - in production use LLM)
   */
  private inferMainTopic(content: string, keywords: string[]): string {
    // Look for title in markdown headers
    const headerMatch = content.match(/^#\s+(.+)$/m);
    if (headerMatch) {
      return headerMatch[1];
    }
    
    // Use top keyword
    if (keywords.length > 0) {
      return keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1);
    }
    
    return 'Topic';
  }

  /**
   * Generate suggestions based on topic and keywords
   */
  private generateSuggestions(
    mainTopic: string,
    keywords: string[],
    contentType: 'document' | 'code' | 'chart'
  ): CanvasAnalysis['suggestedAdditions'] {
    const suggestions: CanvasAnalysis['suggestedAdditions'] = [];
    
    // Document-specific suggestions
    if (contentType === 'document') {
      // Add section suggestions
      if (keywords.includes('neurobiology') || keywords.includes('neural') || keywords.includes('brain')) {
        suggestions.push({
          type: 'section',
          title: 'Add section: Neural Mechanisms',
          preview: 'Detailed explanation of neural mechanisms underlying ' + mainTopic + ', including synaptic connections and neurotransmitter pathways.',
          relevance: 95
        });
        
        suggestions.push({
          type: 'code',
          title: 'Add code: Brain Activity Visualization',
          preview: 'Python code for visualizing neural activity patterns using matplotlib and numpy.',
          relevance: 85
        });
        
        suggestions.push({
          type: 'chart',
          title: 'Add chart: Learning Curve Analysis',
          preview: 'Visual representation of learning progress over time with retention metrics.',
          relevance: 80
        });
      }
      
      if (keywords.includes('learning') || keywords.includes('education') || keywords.includes('cognitive')) {
        suggestions.push({
          type: 'section',
          title: 'Add section: Cognitive Load Theory',
          preview: 'Explanation of cognitive load principles and their application to ' + mainTopic + '.',
          relevance: 90
        });
        
        suggestions.push({
          type: 'concept',
          title: 'Add concept: Working Memory',
          preview: 'Overview of working memory capacity and its role in learning processes.',
          relevance: 85
        });
      }
      
      // Always add general expansions
      suggestions.push({
        type: 'expand',
        title: 'Expand on: ' + (keywords[0] || mainTopic),
        preview: 'Add more detailed information and examples related to ' + (keywords[0] || mainTopic) + '.',
        relevance: 75
      });
    }
    
    // Code-specific suggestions
    if (contentType === 'code') {
      suggestions.push({
        type: 'code',
        title: 'Add tests: Unit Testing',
        preview: 'Comprehensive unit tests for the code above with edge cases and assertions.',
        relevance: 90
      });
      
      suggestions.push({
        type: 'section',
        title: 'Add documentation: API Reference',
        preview: 'Detailed API documentation with parameters, return values, and usage examples.',
        relevance: 85
      });
    }
    
    // Chart-specific suggestions
    if (contentType === 'chart') {
      suggestions.push({
        type: 'chart',
        title: 'Add related chart: Comparative View',
        preview: 'Additional chart showing comparative analysis or alternative visualization.',
        relevance: 85
      });
      
      suggestions.push({
        type: 'section',
        title: 'Add analysis: Data Insights',
        preview: 'Written analysis explaining patterns and insights from the chart data.',
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
    // In production, this would call an LLM API to generate full content
    // For now, return expanded preview
    
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
        // Add as new version to existing element
        await canvasService.addVersion(elementId, content, card.title);
      } else {
        // Create new element
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
    // Keep pinned cards
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

