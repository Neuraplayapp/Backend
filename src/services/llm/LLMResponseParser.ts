/**
 * LLM Response Parser
 * 
 * Handles parsing LLM responses, extracting content from different API formats,
 * and recovering from truncated/malformed JSON.
 */

export interface ParsedLLMResponse {
  title: string;
  content: string;
  success: boolean;
  isPartial: boolean;
}

export class LLMResponseParser {
  /**
   * Parse LLM response, handling multiple API formats
   */
  static parseResponse(response: any, fallbackTitle: string): ParsedLLMResponse {
    console.log('📄 LLMResponseParser: RAW LLM Response:', {
      success: response.success,
      hasContent: !!response.content,
      hasData: !!response.data,
      dataIsArray: Array.isArray(response.data),
      contentType: typeof response.content
    });

    // Extract raw content from different API formats
    let rawContent = this.extractRawContent(response);
    
    console.log('📄 LLMResponseParser: Extracted raw content:', {
      length: rawContent.length,
      preview: rawContent.substring(0, 300)
    });

    // Try to parse as JSON
    let deltaData: any = {};
    let isPartial = false;
    
    try {
      deltaData = JSON.parse(rawContent || '{}');
      console.log('✅ Successfully parsed LLM JSON response:', {
        hasTitle: !!deltaData.title,
        hasContent: !!deltaData.content,
        contentLength: deltaData.content?.length || 0,
        contentPreview: deltaData.content?.substring?.(0, 200)
      });
    } catch (parseError) {
      console.warn('⚠️ Failed to parse LLM JSON, attempting partial extraction:', parseError);
      
      // Try to extract content from incomplete JSON
      const partialContent = this.extractPartialContent(rawContent);
      
      if (partialContent) {
        deltaData = { content: partialContent, title: fallbackTitle };
        isPartial = true;
        console.log('✅ Extracted partial content from incomplete JSON:', {
          length: partialContent.length,
          preview: partialContent.substring(0, 200)
        });
      } else {
        // Last resort: use empty content (will trigger fallback later)
        deltaData = { content: '', title: fallbackTitle };
        console.warn('⚠️ Could not extract any content');
      }
    }

    return {
      title: String(deltaData?.title || fallbackTitle),
      content: String(deltaData?.content || ''),
      success: !!deltaData.content,
      isPartial
    };
  }

  /**
   * Extract raw content from different API response formats
   */
  private static extractRawContent(response: any): string {
    // Direct content field
    if (response.content) {
      return response.content;
    }
    
    // Fireworks format: { data: [{ generated_text: "..." }] }
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      return response.data[0].generated_text || response.data[0].content || '';
    }
    
    // Alternative format: { data: { generated_text: "..." } }
    if (response.data && typeof response.data === 'object') {
      return response.data.generated_text || response.data.content || '';
    }
    
    return '';
  }

  /**
   * Extract content from truncated/incomplete JSON
   */
  private static extractPartialContent(rawJson: string): string {
    try {
      // Look for "content": "..." pattern and extract what we can
      const contentMatch = rawJson.match(/"content"\s*:\s*"([\s\S]*?)(?:"|$)/);
      if (contentMatch && contentMatch[1]) {
        // Unescape JSON string (\\n -> \n, \\" -> ", etc)
        return contentMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\')
          .replace(/\\t/g, '\t');
      }
    } catch (extractError) {
      console.error('❌ Partial extraction failed:', extractError);
    }
    
    return '';
  }

  /**
   * Check if content should trigger fallback
   */
  static shouldUseFallback(content: string): boolean {
    if (!content || content.trim().length < 20) {
      console.warn('⚠️ Fallback triggered: Content too short or empty', {
        length: content?.length || 0,
        content: content?.substring(0, 50)
      });
      return true;
    }
    
    // CRITICAL FIX: Only trigger on API errors, not the word "error" in content
    // Check for actual error messages (starting with error indicators)
    const trimmed = content.trim();
    const startsWithError = /^(error|failed|exception|invalid)/i.test(trimmed);
    const isApologyMessage = /^(i apologize|sorry|unfortunately|i'm unable|i can't)/i.test(trimmed);
    
    if (startsWithError || isApologyMessage) {
      console.warn('⚠️ Fallback triggered: LLM returned error/apology message', {
        preview: content.substring(0, 100)
      });
      return true;
    }
    
    // Check if content is malformed JSON (starts with { or ")
    if (trimmed.startsWith('{') || trimmed.startsWith('"')) {
      console.warn('⚠️ Fallback triggered: Content is raw JSON', {
        preview: content.substring(0, 50)
      });
      return true;
    }
    
    return false;
  }

  /**
   * Generate fallback content when LLM fails
   */
  static generateFallback(documentTitle: string): string {
    return `## Addition to ${documentTitle}\n\n*Content generation encountered an issue. Please try rephrasing your request or providing more details about what you'd like to add to the document about ${documentTitle}.*`;
  }
}

