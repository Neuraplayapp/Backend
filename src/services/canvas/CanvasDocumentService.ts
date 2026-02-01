/**
 * Canvas Document Service
 * 
 * Handles all document generation logic for canvas, including:
 * - Document creation
 * - Document revisions/additions  
 * - Version management
 * - Integration with LLM services
 */

import { LLMPromptBuilder } from '../llm/LLMPromptBuilder';
import { LLMResponseParser } from '../llm/LLMResponseParser';
import { LLMTokenManager } from '../llm/LLMTokenManager';

export interface DocumentGenerationParams {
  request: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  activateCanvas?: boolean;
  conversationContext?: string;  // 🎯 Recent chat for back-references
  personalMemories?: string;     // 🧠 User's personal memories (family, preferences, etc.)
  intentAnalysis?: any;          // Intent analysis from cognitive analyzer
}

export interface DocumentRevisionParams {
  request: string;
  activateCanvas?: boolean;
  conversationContext?: string; // 🎯 CRITICAL: What the AI proposed to add (from conversation history)
}

export class CanvasDocumentService {
  private unifiedAPIRouter: any;

  constructor(unifiedAPIRouter: any) {
    this.unifiedAPIRouter = unifiedAPIRouter;
  }

  /**
   * Generate a new document
   */
  async generateDocument(
    params: DocumentGenerationParams,
    intentAnalysis: any = null // Simple: just pass the intent analysis from UnifiedCognitiveAnalyzer
  ): Promise<{ title: string; content: string }> {
    console.log('📄 CanvasDocumentService: Generating new document');
    
    // CRITICAL DEBUG: Log what we received
    console.log('📄 CanvasDocumentService: Intent analysis received:', {
      hasIntentAnalysis: !!intentAnalysis,
      lengthRequirement: intentAnalysis?.lengthRequirement,
      complexityLevel: intentAnalysis?.complexityLevel,
      primaryIntent: intentAnalysis?.primaryIntent,
      hasConversationContext: !!params.conversationContext,
      hasPersonalMemories: !!params.personalMemories
    });

    // 🎯 Pass conversation context AND personal memories for personalized documents
    // 🐛 DEBUG: Log exactly what's being passed
    console.log('📄 CanvasDocumentService: CONTEXT DEBUG:', {
      conversationContextLength: params.conversationContext?.length || 0,
      conversationContextPreview: params.conversationContext?.substring(0, 200) || 'EMPTY',
      personalMemoriesLength: params.personalMemories?.length || 0,
      personalMemoriesPreview: params.personalMemories?.substring(0, 200) || 'EMPTY'
    });
    
    const prompt = LLMPromptBuilder.buildDocumentCreationPrompt(
      params, 
      intentAnalysis ? { intent: intentAnalysis } : null,
      params.conversationContext,
      params.personalMemories
    );

    // Calculate token limit - pass lengthRequirement directly from intent
    const hasTable = LLMTokenManager.requestHasTable(params.request);
    const tokenConfig = LLMTokenManager.calculateTokenLimit(
      intentAnalysis?.complexityLevel,
      hasTable,
      intentAnalysis?.lengthRequirement // Direct from UnifiedCognitiveAnalyzer
    );

    // CRITICAL FIX: JSON format requires SIGNIFICANTLY more tokens than markdown
    // JSON overhead breakdown:
    // 1. Escape sequences: \n, \t, \", \\ (each char becomes 2 chars)
    // 2. JSON structure: {"title":"...","content":"..."} adds ~100-150 tokens
    // 3. LLM verbosity: Models tend to be more verbose in JSON format
    // Real-world data: 800-token markdown → 1800-2000 token JSON (2.25x multiplier needed)
    const JSON_FORMAT_MULTIPLIER = 2.2; // JSON needs 120% MORE tokens than markdown
    let adjustedMaxTokens = Math.ceil(tokenConfig.maxTokens * JSON_FORMAT_MULTIPLIER);
    
    // SAFETY: Cap at Fireworks GPT-OSS-120B's limit (8k context)
    // Leave room for prompt (~500-1000 tokens) = use max 7000 for response
    const MAX_TOKENS = 7000;
    adjustedMaxTokens = Math.min(adjustedMaxTokens, MAX_TOKENS);

    console.log('📄 Token config:', {
      requestedMarkdown: tokenConfig.maxTokens,
      requestedJSON: adjustedMaxTokens,
      reason: tokenConfig.reason,
      overhead: JSON_FORMAT_MULTIPLIER
    });

    // 🔥 STREAMING: Generate content in real-time, no token limit truncation
    console.log('📄 Using STREAMING for document generation');
    
    let documentContent = '';
    const streamResult = await this.unifiedAPIRouter.streamCompletion(
      [{ role: 'user', content: prompt }],
      'accounts/fireworks/models/gpt-oss-120b',
      {
        temperature: 0.7,
        max_tokens: adjustedMaxTokens,
        onChunk: (chunk: string) => {
          // Chunks arrive in real-time, build content incrementally
          documentContent += chunk;
        },
        onComplete: (fullText: string) => {
          console.log('📄 Streaming complete, total length:', fullText.length);
        },
        onError: (error: Error) => {
          console.error('❌ Streaming error:', error);
        }
      }
    );

    // Check if streaming was successful
    if (!streamResult.success) {
      console.error('❌ CanvasDocumentService: Streaming failed:', streamResult.error);
      return {
        title: 'Generated Document',
        content: `# ${params.request}\n\n*Content generation encountered an issue: ${streamResult.error || 'Unknown error'}. Please try again.*`
      };
    }

    // Parse JSON response (same as V2 revision logic)
    let parsedTitle = 'Generated Document';
    let parsedContent = '';
    
    try {
      // Clean the response (remove any markdown code fences if LLM added them)
      let cleanedResponse = documentContent.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }
      
      const jsonResponse = JSON.parse(cleanedResponse);
      parsedTitle = jsonResponse.title || 'Generated Document';
      parsedContent = jsonResponse.content || '';
      
      console.log('✅ Parsed JSON document successfully:', {
        title: parsedTitle,
        contentLength: parsedContent.length,
        contentPreview: parsedContent.substring(0, 200)
      });
    } catch (jsonError) {
      // Fallback: Try to extract content from partial/truncated JSON or use raw text
      console.warn('⚠️ JSON parsing failed, attempting fallback extraction:', jsonError.message);
      
      // Try to extract title from JSON (usually complete since it's first)
      const titleMatch = documentContent.match(/"title"\s*:\s*"([^"]*)"/);
      if (titleMatch) {
        parsedTitle = titleMatch[1];
      }
      
      // Try to extract content - handle both complete and truncated strings
      // Pattern 1: Complete string with closing quote
      let contentMatch = documentContent.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
      
      if (!contentMatch) {
        // Pattern 2: Truncated string (no closing quote) - extract everything after "content":"
        contentMatch = documentContent.match(/"content"\s*:\s*"(.*)$/s);
      }
      
      if (contentMatch) {
        parsedContent = contentMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\')
          .replace(/\\r/g, '\r');
        console.log('✅ Extracted content from partial JSON:', parsedContent.length, 'chars');
      } else {
        // Last resort: Strip JSON markers and use everything as markdown
        parsedContent = documentContent
          .replace(/^\s*\{?\s*"title"\s*:\s*"[^"]*"\s*,?\s*/s, '')
          .replace(/^\s*"content"\s*:\s*"/s, '')
          .replace(/"\s*\}?\s*$/s, '')
          .trim();
        
        if (!parsedContent || parsedContent.length < 20) {
          parsedContent = documentContent; // Use raw response
        }
        console.warn('⚠️ Using stripped/raw response as markdown fallback');
      }
    }

    // Check if content is valid
    if (!parsedContent || parsedContent.trim().length < 20) {
      console.warn('⚠️ LLM returned empty content, using fallback');
      return {
        title: parsedTitle,
        content: `# ${params.request}\n\n*Content generation encountered an issue. Please try a different request.*`
      };
    }

    // IMPROVED: More lenient truncation detection
    // Only flag as truncated if there are CLEAR signs of incomplete content
    const isTruncated = LLMTokenManager.isTruncated(parsedContent);
    const hasUnmatchedCodeBlocks = (parsedContent.match(/```/g)?.length || 0) % 2 !== 0;
    const endsWithComma = /,\s*$/.test(parsedContent.trim());
    const isVeryLongWithoutEnding = parsedContent.length > 2000 && !/[.!?]\s*$/.test(parsedContent.trim());
    
    const truncationCount = [isTruncated, hasUnmatchedCodeBlocks, endsWithComma && isVeryLongWithoutEnding].filter(Boolean).length;
    
    if (truncationCount >= 2) {
      console.warn('⚠️ Document appears truncated, adding graceful completion', {
        isTruncated,
        hasUnmatchedCodeBlocks,
        endsWithComma,
        isVeryLongWithoutEnding,
        contentLength: parsedContent.length,
        indicators: truncationCount
      });
      
      parsedContent = this.addGracefulCompletion(parsedContent);
    } else if (truncationCount === 1) {
      console.log('ℹ️ Minor truncation indicator detected, but content appears acceptable', {
        isTruncated,
        hasUnmatchedCodeBlocks,
        endsWithComma,
        contentLength: parsedContent.length
      });
    }

    console.log('✅ Document generation complete:', {
      title: parsedTitle,
      contentLength: parsedContent.length,
      hadTruncationIssues: truncationCount >= 2
    });

    return { title: parsedTitle, content: parsedContent };
  }

  /**
   * Generate document revision/addition
   */
  async generateRevision(
    params: DocumentRevisionParams,
    existingDoc: any,
    intentAnalysis: any = null,
    isAppend: boolean
  ): Promise<{ title: string; content: string }> {
    console.log('📄 CanvasDocumentService: Generating document revision', {
      isAppend,
      existingTitle: existingDoc.content?.title
    });

    const existingTitle = existingDoc.content?.title || 'Document';
    const latestVersion = existingDoc.versions?.[existingDoc.versions.length - 1];
    const existingContent = latestVersion?.content || existingDoc.content?.content || '';

    console.log('📄 Existing content stats:', {
      length: existingContent.length,
      words: existingContent.split(/\s+/).length,
      preview: existingContent.substring(0, 200)
    });

    // Build prompt
    const prompt = LLMPromptBuilder.buildDocumentRevisionPrompt(
      params,
      existingTitle,
      existingContent,
      intentAnalysis ? { intent: intentAnalysis } : null,
      isAppend
    );
    
    console.log('📄 Generated prompt stats:', {
      length: prompt.length,
      estimatedTokens: Math.ceil(prompt.length * 0.75),
      preview: prompt.substring(0, 300)
    });

    // Calculate token limit
    const hasTable = LLMTokenManager.requestHasTable(params.request);
    const tokenConfig = LLMTokenManager.calculateTokenLimit(
      intentAnalysis?.complexityLevel,
      hasTable,
      intentAnalysis?.lengthRequirement
    );

    console.log('📄 Token config for revision:', tokenConfig);

    // Calculate actual available tokens with increased limit (8192)
    // Approximate prompt size: ~0.75 tokens per character
    const promptTokens = Math.ceil(prompt.length * 0.75);
    const MAX_TOTAL_TOKENS = 8192;
    
    // CRITICAL FIX: JSON format requires SIGNIFICANTLY more tokens (2.2x multiplier)
    // Real-world data shows JSON needs 120% MORE space than markdown
    const JSON_FORMAT_MULTIPLIER = 2.2;
    const SAFETY_BUFFER = 300; // Additional safety margin
    
    const availableTokens = Math.max(1000, MAX_TOTAL_TOKENS - promptTokens - SAFETY_BUFFER);
    const requestedInMarkdown = tokenConfig.maxTokens; // This is already in markdown tokens
    const requestedInJSON = Math.ceil(requestedInMarkdown * JSON_FORMAT_MULTIPLIER); // Convert to JSON tokens needed
    const finalMaxTokens = Math.min(requestedInJSON, availableTokens);
    
    console.log(`📊 Token calculation: prompt=${promptTokens}, available=${availableTokens}, requestedMarkdown=${requestedInMarkdown}, requestedJSON=${requestedInJSON}, using=${finalMaxTokens}`);

    // 🔥 STREAMING: Generate revision content in real-time
    console.log('📄 Using STREAMING for revision generation');
    
    let revisionContent = '';
    const streamResult = await this.unifiedAPIRouter.streamCompletion(
      [{ role: 'user', content: prompt }],
      'accounts/fireworks/models/gpt-oss-120b',
      {
        temperature: 0.7,
        max_tokens: finalMaxTokens,
        onChunk: (chunk: string) => {
          revisionContent += chunk;
        },
        onComplete: (fullText: string) => {
          console.log('📄 Revision streaming complete, total length:', fullText.length);
        },
        onError: (error: Error) => {
          console.error('❌ Revision streaming error:', error);
        }
      }
    );

    if (!streamResult.success) {
      console.error('❌ Revision streaming failed:', streamResult.error);
      return {
        title: existingTitle,
        content: existingContent + `\n\n*Revision failed: ${streamResult.error}*`
      };
    }

    // Parse JSON response properly
    let parsedTitle = existingTitle;
    let parsedContent = '';
    
    try {
      // Clean the response (remove any markdown code fences if LLM added them)
      let cleanedResponse = revisionContent.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }
      
      const jsonResponse = JSON.parse(cleanedResponse);
      parsedTitle = jsonResponse.title || existingTitle;
      parsedContent = jsonResponse.content || '';
      
      console.log('✅ Parsed JSON revision successfully:', {
        title: parsedTitle,
        contentLength: parsedContent.length,
        contentPreview: parsedContent.substring(0, 200)
      });
    } catch (jsonError) {
      // Fallback: Try to extract content from partial/truncated JSON or use raw text
      console.warn('⚠️ JSON parsing failed, attempting fallback extraction:', jsonError.message);
      
      // Try to extract title from JSON (usually complete since it's first)
      const titleMatch = revisionContent.match(/"title"\s*:\s*"([^"]*)"/);
      if (titleMatch) {
        parsedTitle = titleMatch[1];
      }
      
      // Try to extract content - handle both complete and truncated strings
      // Pattern 1: Complete string with closing quote
      let contentMatch = revisionContent.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
      
      if (!contentMatch) {
        // Pattern 2: Truncated string (no closing quote) - extract everything after "content":"
        contentMatch = revisionContent.match(/"content"\s*:\s*"(.*)$/s);
      }
      
      if (contentMatch) {
        parsedContent = contentMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\')
          .replace(/\\r/g, '\r');
        console.log('✅ Extracted content from partial JSON:', parsedContent.length, 'chars');
      } else {
        // Last resort: Strip JSON markers and use everything as markdown
        parsedContent = revisionContent
          .replace(/^\s*\{?\s*"title"\s*:\s*"[^"]*"\s*,?\s*/s, '')
          .replace(/^\s*"content"\s*:\s*"/s, '')
          .replace(/"\s*\}?\s*$/s, '')
          .trim();
        
        if (!parsedContent || parsedContent.length < 20) {
          parsedContent = revisionContent; // Use raw response
        }
        console.warn('⚠️ Using stripped/raw response as markdown fallback');
      }
    }

    // Build final cumulative content for this version
    let finalContent = '';
    if (isAppend) {
      finalContent = existingContent + (existingContent.endsWith('\n') ? '\n' : '\n\n') + parsedContent;
    } else {
      finalContent = parsedContent || existingContent;
    }

    return {
      title: parsedTitle,
      content: finalContent
    };
  }

  /**
   * Parse LLM response with fallback handling
   */
  private parseDocumentResponse(llmResponse: any, fallbackTitle: string): { title: string; content: string } {
    const parsed = LLMResponseParser.parseResponse(llmResponse, fallbackTitle);

    // CRITICAL DEBUG: Log what we actually parsed
    console.log('📄 CanvasDocumentService: Parsed response details:', {
      hasTitle: !!parsed.title,
      hasContent: !!parsed.content,
      contentLength: parsed.content?.length || 0,
      contentPreview: parsed.content?.substring(0, 200),
      isPartial: parsed.isPartial,
      success: parsed.success
    });

    // Check if fallback is needed
    if (LLMResponseParser.shouldUseFallback(parsed.content)) {
      console.warn('⚠️ LLM returned empty or error content, using fallback', {
        parsedContentLength: parsed.content?.length || 0,
        parsedContentPreview: parsed.content?.substring(0, 100)
      });
      return {
        title: fallbackTitle,
        content: LLMResponseParser.generateFallback(fallbackTitle)
      };
    }

    return {
      title: parsed.title,
      content: parsed.content
    };
  }

  /**
   * Fix malformed tables in LLM output
   * Detects patterns like "1. Text | Column | Column" and converts to proper markdown tables
   */
  private fixMalformedTables(content: string): string {
    // Pattern: Numbered list items that contain multiple pipes (trying to be table rows)
    // Example: "1. Define vision | Write description | Increases attachment"
    const lines = content.split('\n');
    let fixed = '';
    let inPotentialTable = false;
    let tableRows: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^\d+\.\s+(.+\|.+\|.+)$/);
      
      if (match && (line.match(/\|/g) || []).length >= 2) {
        // This looks like a malformed table row (numbered list with pipes)
        if (!inPotentialTable) {
          inPotentialTable = true;
          tableRows = [];
        }
        // Extract the pipe-separated content
        tableRows.push(match[1]);
      } else {
        // Not a malformed table line
        if (inPotentialTable && tableRows.length >= 2) {
          // We had accumulated table rows, convert them to proper table
          const cells = tableRows[0].split('|').map(c => c.trim());
          const headerRow = '| ' + cells.join(' | ') + ' |';
          const separatorRow = '|' + cells.map(() => '------').join('|') + '|';
          
          fixed += headerRow + '\n';
          fixed += separatorRow + '\n';
          
          // Add remaining rows
          for (let j = 1; j < tableRows.length; j++) {
            const rowCells = tableRows[j].split('|').map(c => c.trim());
            fixed += '| ' + rowCells.join(' | ') + ' |\n';
          }
          fixed += '\n';
          
          tableRows = [];
          inPotentialTable = false;
        }
        fixed += line + '\n';
      }
    }
    
    return fixed;
  }

  /**
   * Add graceful completion to truncated content
   * IMMUTABLE RULES for clean document endings
   */
  private addGracefulCompletion(content: string): string {
    // FIRST: Fix malformed tables
    let cleanedContent = this.fixMalformedTables(content);
    
    // Remove incomplete trailing content
    cleanedContent = cleanedContent.trim();
    
    // IMMUTABLE: Remove malformed punctuation endings (e.g., ",." or ",.") 
    cleanedContent = cleanedContent.replace(/,\.?\s*$/, '');
    cleanedContent = cleanedContent.replace(/,\s*\.\s*$/, '');
    
    // IMMUTABLE: Remove trailing incomplete punctuation (comma, semicolon, colon at end)
    cleanedContent = cleanedContent.replace(/[,;:]\s*$/, '');
    
    // IMMUTABLE: Remove dangling conjunctions/articles at the end
    cleanedContent = cleanedContent.replace(/\s+(and|or|but|the|a|an|to|for|with|in|on|at|by|of)\s*\.?\s*$/i, '');
    
    // If ends with incomplete word, remove it
    cleanedContent = cleanedContent.replace(/\s+\w{1,3}$/, '');
    
    // If ends with incomplete list item, remove it
    cleanedContent = cleanedContent.replace(/\n\s*[-*•]\s+[^\n]*$/, '');
    
    // Remove incomplete sentence after last complete sentence
    const sentences = cleanedContent.split(/(?<=[.!?])\s+/);
    if (sentences.length > 1) {
      const lastSentence = sentences[sentences.length - 1];
      // If last "sentence" doesn't end with proper punctuation, remove it
      if (!/[.!?]\s*$/.test(lastSentence) && lastSentence.length < 100) {
        sentences.pop();
        cleanedContent = sentences.join(' ');
      }
    }
    
    // Close any unclosed code blocks
    const codeBlockCount = (cleanedContent.match(/```/g) || []).length;
    if (codeBlockCount % 2 !== 0) {
      cleanedContent += '\n```';
    }
    
    // Ensure ends with sentence punctuation
    if (!/[.!?]\s*$/.test(cleanedContent)) {
      cleanedContent += '.';
    }
    
    // Add continuation indicator
    cleanedContent += '\n\n*[Content continues in next section...]*';
    
    return cleanedContent;
  }
}

