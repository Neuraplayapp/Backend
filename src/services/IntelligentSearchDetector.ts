// Intelligent Search Detection System
// Automatically detects when to trigger web searches for current events, recent data, etc.

interface SearchTrigger {
  pattern: RegExp;
  searchTemplate: (match: string[]) => string;
  confidence: number;
  category: 'current_events' | 'recent_data' | 'unknown_entity' | 'temporal' | 'breaking_news';
}

class IntelligentSearchDetector {
  private searchTriggers: SearchTrigger[] = [
    // Current Events & Recent Years (2024, 2025, etc.)
    {
      pattern: /\b(2024|2025|2026|2027)\b.*\b(event|news|happened|occur|election|war|crisis|breakthrough|discovery|launch|release)\b/i,
      searchTemplate: (match) => `${match[1]} ${match[2]} latest news current events`,
      confidence: 0.95,
      category: 'current_events'
    },
    
    // Breaking News Indicators
    {
      pattern: /\b(breaking|latest|recent|new|just|today|yesterday|this week|this month)\b.*\b(news|update|announcement|report|development)\b/i,
      searchTemplate: (match) => `${match[0]} latest news today`,
      confidence: 0.9,
      category: 'breaking_news'
    },
    
    // Stock Prices, Crypto, Market Data
    {
      pattern: /\b(price of|current price|stock price|crypto|bitcoin|ethereum|Tesla|Apple|Google|Microsoft)\b.*\b(today|now|current|latest)\b/i,
      searchTemplate: (match) => `${match[1]} current price today market data`,
      confidence: 0.9,
      category: 'recent_data'
    },
    
    // Weather with specific current time
    {
      pattern: /\bweather\b.*\b(today|now|current|right now|this moment)\b/i,
      searchTemplate: (match) => `${match[0]} current weather forecast today`,
      confidence: 0.85,
      category: 'recent_data'
    },
    
    // Celebrity/Public Figure Recent News
    {
      pattern: /\b(what happened to|news about|latest on)\b.*\b([A-Z][a-z]+ [A-Z][a-z]+)\b/i,
      searchTemplate: (match) => `${match[2]} latest news recent updates 2024`,
      confidence: 0.8,
      category: 'current_events'
    },
    
    // Unknown Entities (proper nouns not in knowledge base)
    {
      pattern: /\b(who is|what is|tell me about)\b.*\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*)\b.*\b(new|recent|startup|company|app|platform|influencer)\b/i,
      searchTemplate: (match) => `${match[2]} ${match[3]} latest information about`,
      confidence: 0.75,
      category: 'unknown_entity'
    },
    
    // Temporal Questions about Recent Past
    {
      pattern: /\b(since|after|during|in)\b.*\b(2023|2024|2025)\b.*\b(what|how|when|changes|updates|developments)\b/i,
      searchTemplate: (match) => `${match[0]} latest developments ${match[2]}`,
      confidence: 0.8,
      category: 'temporal'
    },
    
    // Technology/Product Releases
    {
      pattern: /\b(iPhone|Android|Windows|Mac|PlayStation|Xbox|Tesla|ChatGPT|AI|GPT)\b.*\b(latest|new|release|update|version|model)\b/i,
      searchTemplate: (match) => `${match[1]} ${match[2]} 2024 latest release news`,
      confidence: 0.85,
      category: 'recent_data'
    },
    
    // Sports/Entertainment Current Events
    {
      pattern: /\b(Olympics|World Cup|Super Bowl|Oscars|Grammy|Nobel Prize)\b.*\b(2024|2025|winner|results|latest)\b/i,
      searchTemplate: (match) => `${match[1]} ${match[2]} latest results news`,
      confidence: 0.9,
      category: 'current_events'
    }
  ];

  /**
   * Analyzes user input to determine if a web search should be triggered
   * Enhanced with pedagogical intelligence for educational contexts
   */
  public shouldTriggerSearch(userInput: string, pedagogicalContext?: any): {
    shouldSearch: boolean;
    searchQuery?: string;
    confidence: number;
    category?: string;
    reasoning?: string;
    pedagogicalIntent?: 'concept_building' | 'current_context' | 'verification' | 'exploration';
  } {
    const cleanInput = userInput.trim();
    
    // Check against all search triggers
    for (const trigger of this.searchTriggers) {
      const match = cleanInput.match(trigger.pattern);
      if (match) {
        const searchQuery = trigger.searchTemplate(match);
        
        console.log('🔍 Intelligent Search Detected:', {
          input: cleanInput,
          trigger: trigger.category,
          confidence: trigger.confidence,
          generatedQuery: searchQuery
        });
        
        const result = {
          shouldSearch: true,
          searchQuery,
          confidence: trigger.confidence,
          category: trigger.category,
          reasoning: `Detected ${trigger.category} query with ${(trigger.confidence * 100).toFixed(0)}% confidence`,
          pedagogicalIntent: this.determinePedagogicalIntent(userInput, pedagogicalContext)
        };
        
        // Enhance search query based on pedagogical intent
        if (result.pedagogicalIntent === 'concept_building') {
          result.searchQuery = `${result.searchQuery} educational explanation beginner friendly`;
        } else if (result.pedagogicalIntent === 'verification') {
          result.searchQuery = `${result.searchQuery} verified sources facts`;
        }
        
        return result;
      }
    }

    // Fallback: Check for general "unknown" indicators
    const unknownIndicators = [
      /\b(I don't know|never heard of|what's|who's)\b.*\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/i,
      /\b(can you search|look up|find information)\b/i
    ];

    for (const pattern of unknownIndicators) {
      const match = cleanInput.match(pattern);
      if (match) {
        return {
          shouldSearch: true,
          searchQuery: cleanInput,
          confidence: 0.6,
          category: 'unknown_entity',
          reasoning: 'User explicitly requested search or mentioned unknown entity'
        };
      }
    }

    return {
      shouldSearch: false,
      confidence: 0
    };
  }

  private determinePedagogicalIntent(input: string, context?: any): 'concept_building' | 'current_context' | 'verification' | 'exploration' {
    const inputLower = input.toLowerCase();
    
    if (inputLower.includes('explain') || inputLower.includes('what is') || inputLower.includes('help me understand')) {
      return 'concept_building';
    }
    if (inputLower.includes('current') || inputLower.includes('latest') || inputLower.includes('recent')) {
      return 'current_context';
    }
    if (inputLower.includes('verify') || inputLower.includes('check') || inputLower.includes('is it true')) {
      return 'verification';
    }
    return 'exploration';
  }

  /**
   * Enhanced search query generation with context
   */
  public generateEnhancedQuery(userInput: string, conversationContext?: string[]): string {
    const detection = this.shouldTriggerSearch(userInput);
    
    if (!detection.shouldSearch) {
      return userInput;
    }

    let enhancedQuery = detection.searchQuery || userInput;

    // Add temporal context for current events
    if (detection.category === 'current_events' || detection.category === 'breaking_news') {
      enhancedQuery += ' latest news 2024 2025';
    }

    // Add verification context for unknown entities
    if (detection.category === 'unknown_entity') {
      enhancedQuery += ' official information verified sources';
    }

    // Add recent context for market data
    if (detection.category === 'recent_data') {
      enhancedQuery += ' current real-time data today';
    }

    return enhancedQuery;
  }

  /**
   * Get smart follow-up suggestions based on search category
   */
  public getFollowUpSuggestions(category: string, searchQuery: string): string[] {
    const suggestions: Record<string, string[]> = {
      'current_events': [
        'What are the implications?',
        'How does this affect the future?',
        'What do experts think about this?'
      ],
      'recent_data': [
        'Show me a chart of this data',
        'Compare this to historical trends',
        'What factors influence this?'
      ],
      'unknown_entity': [
        'Tell me more about their background',
        'What are they known for?',
        'Show me related topics'
      ],
      'breaking_news': [
        'What are people saying about this?',
        'How reliable is this source?',
        'What happens next?'
      ]
    };

    return suggestions[category] || [
      'Tell me more about this',
      'Show me related information',
      'What should I know about this?'
    ];
  }
}

// Export the class
export { IntelligentSearchDetector };

// Export a factory function to avoid initialization issues
export function createIntelligentSearchDetector(): IntelligentSearchDetector {
  return new IntelligentSearchDetector();
}

// Export a lazy-loaded singleton
let _instance: IntelligentSearchDetector | null = null;
export function getIntelligentSearchDetector(): IntelligentSearchDetector {
  if (!_instance) {
    _instance = new IntelligentSearchDetector();
  }
  return _instance;
}
