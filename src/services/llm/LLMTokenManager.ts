/**
 * LLM Token Manager
 * 
 * Calculates appropriate token limits based on complexity,
 * request type, and content requirements.
 */

export interface TokenConfig {
  maxTokens: number;
  reason: string;
}

export class LLMTokenManager {
  // LENGTH-BASED TOKENS: Primary factor is lengthRequirement from LLM
  // TOKEN REFERENCE: ~500 tokens = 1 page of text (for markdown)
  // These are BASE tokens for markdown content, JSON format will multiply by 1.4x
  private static readonly LENGTH_TOKENS = {
    brief: 800,          // ~1 page (increased from 600 for better completion)
    standard: 1200,      // ~2 pages (increased from 1000)
    comprehensive: 2500, // ~4 pages (increased from 2000)
    extensive: 4500      // ~7 pages (increased from 4000)
  };
  
  // DEPRECATED: Old complexity-based tokens (kept for fallback only)
  // Updated to match new LENGTH_TOKENS for consistency
  private static readonly DOCUMENT_TOKENS = {
    simple: 800,      // Matches 'brief'
    moderate: 1200,   // Matches 'standard'
    complex: 2500,    // Matches 'comprehensive'
    expert: 4500      // Matches 'extensive'
  };

  private static readonly TABLE_BUFFER_MULTIPLIER = 1.4; // 40% extra for tables
  private static readonly MAX_TOKENS = 8000; // Hard cap to prevent excessive generation
  private static readonly COMPLETION_BUFFER = 300; // Reserve tokens for wrapping up sentences

  /**
   * LLM-BASED: Calculate token limit using lengthRequirement from UnifiedCognitiveAnalyzer
   * @param complexityLevel - Content sophistication: 'simple' | 'moderate' | 'complex' | 'expert' (DEPRECATED - kept for fallback)
   * @param hasTable - Whether content includes tables
   * @param lengthRequirement - LLM-detected length: 'brief' | 'standard' | 'comprehensive' | 'extensive'
   */
  static calculateTokenLimit(
    complexityLevel: string | undefined,
    hasTable: boolean,
    lengthRequirement?: string
  ): TokenConfig {
    let baseTokens: number;
    let reason: string;

    // PRIMARY: Use LLM-detected lengthRequirement
    if (lengthRequirement && lengthRequirement in this.LENGTH_TOKENS) {
      const length = lengthRequirement as keyof typeof this.LENGTH_TOKENS;
      baseTokens = this.LENGTH_TOKENS[length];
      reason = `LLM-detected length: ${lengthRequirement}`;
      console.log(`📏 Using LLM length detection: ${lengthRequirement} = ${baseTokens} tokens`);
    } 
    // FALLBACK: Use old complexity-based system
    else {
      const complexity = (complexityLevel || 'simple') as keyof typeof this.DOCUMENT_TOKENS;
      baseTokens = this.DOCUMENT_TOKENS[complexity] || this.DOCUMENT_TOKENS.simple;
      reason = `Fallback to complexity: ${complexity}`;
      console.log(`⚠️ No length detected, using complexity fallback: ${complexity} = ${baseTokens} tokens`);
    }

    // Add buffer for tables/structured content
    if (hasTable) {
      const bufferedTokens = Math.ceil(baseTokens * this.TABLE_BUFFER_MULTIPLIER);
      const contentTokens = Math.min(bufferedTokens, this.MAX_TOKENS - this.COMPLETION_BUFFER);
      const finalTokens = contentTokens + this.COMPLETION_BUFFER;
      
      return {
        maxTokens: finalTokens,
        reason: `${reason} (${baseTokens} base) + table buffer + ${this.COMPLETION_BUFFER} completion = ${finalTokens}`
      };
    }

    // Calculate tokens without artificial cap
    const contentTokens = Math.min(baseTokens, this.MAX_TOKENS - this.COMPLETION_BUFFER);
    const finalTokens = contentTokens + this.COMPLETION_BUFFER;
    
    return {
      maxTokens: finalTokens,
      reason: `${reason} (${baseTokens} content) + ${this.COMPLETION_BUFFER} completion = ${finalTokens}`
    };
  }

  /**
   * Detect if request contains table requirements
   */
  static requestHasTable(request: string | undefined): boolean {
    if (!request) return false;
    
    const lowerRequest = request.toLowerCase();
    return lowerRequest.includes('table') ||
           lowerRequest.includes('comparison') ||
           lowerRequest.includes('vs ') ||
           lowerRequest.includes('versus');
  }

  /**
   * Get base token limit for specific complexity level (without buffers)
   */
  static getBaseTokens(complexity: string | undefined): number {
    const level = (complexity || 'simple') as keyof typeof this.DOCUMENT_TOKENS;
    return this.DOCUMENT_TOKENS[level] || this.DOCUMENT_TOKENS.simple;
  }

  /**
   * Get completion buffer size
   */
  static getCompletionBuffer(): number {
    return this.COMPLETION_BUFFER;
  }

  /**
   * Check if content appears truncated - AGGRESSIVE detection
   * Not just mid-sentence, but incomplete sections
   */
  static isTruncated(content: string): boolean {
    if (!content || content.length < 100) return false;
    
    const trimmed = content.trim();
    const lastChars = trimmed.slice(-100);
    const last300 = trimmed.slice(-300);
    
    // 0. IMMUTABLE RULE: Check for malformed punctuation endings (e.g., ",." or ", .")
    // This is a clear sign of LLM cutoff mid-sentence
    if (/,\.?\s*$/.test(trimmed) || /,\s*\.$/.test(trimmed)) {
      console.warn('⚠️ Truncation detected: Ends with comma (mid-sentence cutoff)');
      return true;
    }
    
    // 0b. Check for incomplete sentence ending with comma, semicolon, or colon
    if (/[,;:]\s*$/.test(trimmed)) {
      console.warn('⚠️ Truncation detected: Ends with incomplete punctuation');
      return true;
    }
    
    // 0c. Check for "and", "or", "but", "the", "a", "to" at the very end (mid-clause cutoff)
    // REFINED: Only flag if it's truly dangling (no period, and no preceding context)
    const danglingMatch = trimmed.match(/\b(and|or|but|the|a|an|to|for|with|in|on|at|by|of)\s*$/i);
    if (danglingMatch && !trimmed.endsWith('.') && !trimmed.match(/\.\s+\w+\s*$/)) {
      // Additional check: ensure it's actually incomplete (no complete sentence before it)
      const lastSentence = trimmed.split(/[.!?]\s+/).pop() || '';
      if (lastSentence.split(/\s+/).length < 5) { // Less than 5 words suggests incompleteness
        console.warn('⚠️ Truncation detected: Ends with dangling conjunction/article');
        return true;
      }
    }
    
    // 1. Check for mid-word cutoff (obvious truncation)
    const endsWithPartialWord = /[a-zA-Z]{4,}$/.test(lastChars) && !/[.!?:;]$/.test(lastChars);
    if (endsWithPartialWord) return true;
    
    // 2. Check for incomplete markdown (unclosed code blocks)
    const hasUnclosedMarkdown = (content.match(/```/g) || []).length % 2 !== 0;
    if (hasUnclosedMarkdown) return true;
    
    // 3. Check for incomplete table (odd number of | rows without closing)
    const tableRows = content.match(/^\|.+\|$/gm) || [];
    if (tableRows.length > 0) {
      const lastLine = trimmed.split('\n').pop() || '';
      if (lastLine.includes('|') && !lastLine.endsWith('|')) return true;
    }
    
    // 4. Check if section started but has very little content after heading
    // Find last heading
    const headingMatches = [...content.matchAll(/^#{1,4}\s+.+$/gm)];
    if (headingMatches.length > 0) {
      const lastHeading = headingMatches[headingMatches.length - 1];
      const contentAfterLastHeading = content.slice(lastHeading.index! + lastHeading[0].length).trim();
      
      // If less than 200 chars after the last heading, likely truncated mid-section
      if (contentAfterLastHeading.length < 200 && contentAfterLastHeading.length > 20) {
        console.warn('⚠️ Truncation detected: Section started but barely any content after heading');
        return true;
      }
    }
    
    // 5. Check if ends with a very short paragraph (< 50 chars on last line)
    const lines = trimmed.split('\n').filter(l => l.trim().length > 0);
    if (lines.length > 2) {
      const lastLine = lines[lines.length - 1].trim();
      const secondLastLine = lines[lines.length - 2].trim();
      
      // Short last line that's not a list item or heading
      if (lastLine.length < 60 && 
          !lastLine.startsWith('#') && 
          !lastLine.startsWith('-') && 
          !lastLine.startsWith('*') &&
          !lastLine.startsWith('|') &&
          !lastLine.match(/^\d+\./) &&
          secondLastLine.length > 100) {
        // Previous line was substantial but this one is short - likely cut off
        console.warn('⚠️ Truncation detected: Very short final paragraph after substantial content');
        return true;
      }
    }
    
    // 6. Check for list that started but didn't finish (only 1-2 items)
    const listItemMatches = last300.match(/^[-*•]\s+.+$/gm) || [];
    if (listItemMatches.length === 1 || listItemMatches.length === 2) {
      // Started a list but only got 1-2 items - likely truncated
      const afterList = content.slice(content.lastIndexOf(listItemMatches[listItemMatches.length - 1]));
      if (afterList.length < 100) {
        console.warn('⚠️ Truncation detected: List started but only 1-2 items');
        return true;
      }
    }
    
    return false;
  }
}

