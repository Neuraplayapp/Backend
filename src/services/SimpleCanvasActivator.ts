/**
 * EMERGENCY FIX: SimpleCanvasActivator
 * 
 * Replaces the failing NPU semantic analysis with a reliable, fast activator
 * Designed to work immediately while the NPU system is being optimized
 */

interface ActivationResult {
  shouldActivate: boolean;
  reason: string;
  confidence: number;
  contentType?: string;
  suggestedTitle?: string;
}

export class SimpleCanvasActivator {
  private static readonly CREATION_VERBS = [
    'create', 'write', 'generate', 'make', 'build', 'design', 'draft', 
    'compose', 'develop', 'plan', 'outline', 'prepare', 'craft'
  ];

  private static readonly CONTENT_TYPES = [
    'document', 'article', 'report', 'essay', 'story', 'letter', 'email',
    'proposal', 'analysis', 'summary', 'guide', 'tutorial', 'manual',
    'blog', 'post', 'content', 'text', 'paper', 'book', 'chapter',
    'presentation', 'slides', 'notes', 'memo', 'brief', 'specification'
  ];

  private static readonly EXCLUSION_PATTERNS = [
    /\b(image|picture|photo|chart|graph|visualization)\b/i,
    /\b(search|find|look up|google)\b/i,
    /\b(weather|temperature|forecast)\b/i,
    /^(hi|hello|hey|ok|yes|no|thanks|thank you|bye|goodbye)$/i
  ];

  /**
   * EMERGENCY FIX: Fast, reliable canvas activation analysis
   */
  static analyzeMessage(message: string, userId?: string): ActivationResult {
    const normalizedMessage = message.toLowerCase().trim();
    
    // PHASE 1: Quick exclusions
    if (normalizedMessage.length < 10) {
      return {
        shouldActivate: false,
        reason: 'Message too short for document creation',
        confidence: 0.9
      };
    }

    for (const pattern of this.EXCLUSION_PATTERNS) {
      if (pattern.test(message)) {
        return {
          shouldActivate: false,
          reason: 'Message matches exclusion pattern',
          confidence: 0.85
        };
      }
    }

    // PHASE 2: Positive activation signals
    const hasCreationVerb = this.CREATION_VERBS.some(verb => 
      normalizedMessage.includes(verb)
    );

    const hasContentType = this.CONTENT_TYPES.some(type => 
      normalizedMessage.includes(type)
    );

    const hasLongFormIndicators = [
      'detailed', 'comprehensive', 'thorough', 'complete', 'full',
      'step by step', 'in depth', 'explain', 'describe', 'analyze'
    ].some(indicator => normalizedMessage.includes(indicator));

    const isLongMessage = message.split(' ').length > 15;
    const hasStructuralWords = /\b(sections?|chapters?|parts?|steps?|points?)\b/i.test(message);

    // PHASE 3: Decision logic
    let shouldActivate = false;
    let confidence = 0.5;
    let reason = 'Standard chat message';
    let contentType = 'conversation';

    if (hasCreationVerb && hasContentType) {
      shouldActivate = true;
      confidence = 0.95;
      reason = 'Direct creation request with content type';
      contentType = this.extractContentType(message) || 'document';
    } else if (hasCreationVerb && hasLongFormIndicators) {
      shouldActivate = true;
      confidence = 0.88;
      reason = 'Creation verb with long-form indicators';
      contentType = 'document';
    } else if (hasLongFormIndicators && isLongMessage) {
      shouldActivate = true;
      confidence = 0.75;
      reason = 'Complex request requiring structured output';
      contentType = 'analysis';
    } else if (hasStructuralWords && isLongMessage) {
      shouldActivate = true;
      confidence = 0.7;
      reason = 'Structural indicators suggest document format';
      contentType = 'guide';
    }

    const suggestedTitle = shouldActivate ? this.generateTitle(message, contentType) : undefined;

    return {
      shouldActivate,
      reason,
      confidence,
      contentType,
      suggestedTitle
    };
  }

  /**
   * Extract the most likely content type from the message
   */
  private static extractContentType(message: string): string | null {
    const normalizedMessage = message.toLowerCase();
    
    for (const type of this.CONTENT_TYPES) {
      if (normalizedMessage.includes(type)) {
        return type;
      }
    }
    return null;
  }

  /**
   * Generate a suggested title based on the message and content type
   */
  private static generateTitle(message: string, contentType: string): string {
    // Extract key phrases from the message
    const words = message.split(' ').filter(word => word.length > 3);
    const keyWords = words.slice(0, 6).join(' ');
    
    if (keyWords.length > 50) {
      return keyWords.substring(0, 47) + '...';
    }
    
    return keyWords || `New ${contentType}`;
  }

  /**
   * EMERGENCY FIX: Batch analyze multiple messages for efficiency
   */
  static batchAnalyze(messages: string[], userId?: string): ActivationResult[] {
    return messages.map(message => this.analyzeMessage(message, userId));
  }
}

