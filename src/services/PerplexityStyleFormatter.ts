/**
 * PERPLEXITY-STYLE RESPONSE FORMATTER
 * 
 * Features:
 * - Professional markdown formatting with inline citations
 * - Source integration with numbered references [1], [2], etc.
 * - Clean, scannable presentation
 * - Link previews embedded in response
 * - Professional summary with sources
 * - LLM-POWERED article synthesis for coherent summaries
 */

import { SearchResult, SearchContext } from './WebSearchEngine';

export interface PerplexityResponse {
  markdown: string;
  sources: CitationSource[];
  summary: string;
  confidence: number;
}

export interface CitationSource {
  id: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  synthesizedSummary?: string; // NEW: LLM-generated coherent summary
  relevanceScore: number;
}

export class PerplexityStyleFormatter {
  private static instance: PerplexityStyleFormatter;
  private isReady: boolean = false;

  static getInstance(): PerplexityStyleFormatter {
    if (!PerplexityStyleFormatter.instance) {
      PerplexityStyleFormatter.instance = new PerplexityStyleFormatter();
      PerplexityStyleFormatter.instance.initialize();
    }
    return PerplexityStyleFormatter.instance;
  }

  /**
   * Initialize formatter (uses direct API calls, no dependency on toolRegistry)
   */
  private initialize() {
    this.isReady = true;
    console.log('✅ PerplexityStyleFormatter initialized with LLM synthesis support');
  }

  /**
   * MAIN FORMATTER - Converts search results into Perplexity-style response
   * NOW WITH LLM-POWERED SYNTHESIS for coherent article summaries
   */
  async formatSearchResponse(
    query: string,
    searchContext: SearchContext,
    conversationContext?: string[]
  ): Promise<PerplexityResponse> {
    console.log('🎨 PerplexityStyleFormatter: Creating professional response with LLM synthesis');

    // Step 1: Prepare citations from search results WITH LLM SYNTHESIS
    const sources = await this.prepareCitations(searchContext.results, query);
    console.log('📝 Citations prepared with synthesis:', sources.length, 'sources');

    // Step 2: Generate contextual markdown response
    const markdown = this.generateSynthesizedMarkdown(query, sources);

    // Step 3: Create executive summary from synthesized content
    const summary = this.generateSynthesizedSummary(query, sources);

    return {
      markdown,
      sources,
      summary,
      confidence: this.calculateConfidence(searchContext.results)
    };
  }

  /**
   * SYNTHESIZED MARKDOWN GENERATION
   * Creates well-formatted response using LLM-synthesized summaries
   */
  private generateSynthesizedMarkdown(query: string, sources: CitationSource[]): string {
    if (sources.length === 0) {
      return `No results found for "${query}".`;
    }

    // Opening comprehensive summary from top sources
    const topSources = sources.slice(0, 4);
    const synthesizedContent = topSources
      .map(s => s.synthesizedSummary || s.snippet)
      .filter(s => s && s.length > 20)
      .join(' ');

    // Create a longer, more detailed summary (no arbitrary truncation)
    const comprehensiveSummary = `Based on current sources, ${synthesizedContent} ${topSources.map((_, i) => `[${i + 1}]`).join('')}`;

    return comprehensiveSummary;
  }

  /**
   * SYNTHESIZED SUMMARY GENERATION
   * Creates summary from top sources' synthesized content
   */
  private generateSynthesizedSummary(query: string, sources: CitationSource[]): string {
    if (sources.length === 0) {
      return `No results found for "${query}".`;
    }

    // Use top 2-3 sources for a comprehensive summary
    const topSummaries = sources.slice(0, 3)
      .map(s => s.synthesizedSummary || s.snippet)
      .filter(s => s && s.length > 20)
      .join(' ');
    
    return topSummaries || sources[0].snippet;
  }

  /**
   * CITATION PREPARATION
   * Creates numbered citation sources for inline referencing
   * NOW WITH LLM-POWERED SYNTHESIS for coherent summaries
   */
  private async prepareCitations(results: SearchResult[], query: string): Promise<CitationSource[]> {
    const citations = results.slice(0, 8).map((result, index) => ({
      id: index + 1,
      title: this.truncateTitle(result.title),
      url: result.url,
      domain: this.extractDomain(result.url),
      snippet: result.snippet, // Keep full snippet for synthesis
      relevanceScore: result.relevanceScore
    }));

    // CRITICAL: Synthesize snippets into coherent summaries using LLM
    try {
      const synthesized = await this.synthesizeArticleSummaries(citations, query);
      return synthesized;
    } catch (error) {
      console.warn('⚠️ Article synthesis failed, using raw snippets:', error);
      // Fallback: truncate snippets if synthesis fails
      return citations.map(c => ({
        ...c,
        snippet: this.truncateSnippet(c.snippet)
      }));
    }
  }

  /**
   * LLM-POWERED ARTICLE SYNTHESIS
   * Transforms raw Serper snippets into coherent, readable summaries
   */
  private async synthesizeArticleSummaries(citations: CitationSource[], query: string): Promise<CitationSource[]> {
    // Build a context with all articles
    const articlesContext = citations.map(c => 
      `[${c.id}] "${c.title}" (${c.domain}): ${c.snippet}`
    ).join('\n\n');

    const prompt = `You are a professional news analyst. Rewrite these search result snippets into clear, coherent summaries for each article. The user searched for: "${query}"

ARTICLES:
${articlesContext}

For EACH article, provide a 2-3 sentence summary that:
1. Clearly explains the main point/news
2. Is grammatically correct and readable
3. Removes SEO junk, incomplete sentences, and formatting artifacts
4. Maintains factual accuracy from the original

Respond in this exact JSON format:
{
  "summaries": [
    {"id": 1, "summary": "Clear, coherent 2-3 sentence summary of article 1"},
    {"id": 2, "summary": "Clear, coherent 2-3 sentence summary of article 2"}
  ]
}

Only return valid JSON, no other text.`;

    try {
      // Use direct fetch to backend API (bypasses nested tool registry issues)
      const response = await fetch('/api/unified-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'fireworks',
          endpoint: 'llm-completion',
          data: {
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1500,
            temperature: 0.3,
            model: 'accounts/fireworks/models/gpt-oss-120b'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`LLM API returned ${response.status}`);
      }

      const result = await response.json();
      
      // Handle multiple response formats from unified-route
      let content = null;
      
      // Format 1: Direct Fireworks response
      if (result.choices?.[0]?.message?.content) {
        content = result.choices[0].message.content;
      }
      // Format 2: Wrapped data with choices
      else if (result.data?.choices?.[0]?.message?.content) {
        content = result.data.choices[0].message.content;
      }
      // Format 3: Unified-route format with generated_text
      else if (Array.isArray(result.data) && result.data[0]?.generated_text) {
        content = result.data[0].generated_text;
      }
      // Format 4: Direct generated_text
      else if (result.generated_text) {
        content = result.generated_text;
      }
      // Format 5: Nested data.data response
      else if (result.data?.data?.[0]?.generated_text) {
        content = result.data.data[0].generated_text;
      }

      console.log('🔍 LLM Response parsing:', {
        hasContent: !!content,
        contentPreview: content?.substring(0, 100),
        resultKeys: Object.keys(result || {})
      });
      
      if (!content) {
        console.error('❌ No content found in LLM response. Full result:', JSON.stringify(result).substring(0, 500));
        throw new Error('No content in LLM response');
      }

      // Clean up content - remove markdown code blocks if present
      let cleanedContent = content.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }

      // Parse the JSON response
      const parsed = JSON.parse(cleanedContent);
      
      // Apply synthesized summaries back to citations
      return citations.map(citation => {
        const synthesized = parsed.summaries?.find((s: any) => s.id === citation.id);
        return {
          ...citation,
          synthesizedSummary: synthesized?.summary || undefined,
          snippet: synthesized?.summary || this.truncateSnippet(citation.snippet)
        };
      });

    } catch (error) {
      console.error('❌ Article synthesis LLM call failed:', error);
      throw error;
    }
  }

  /**
   * UTILITY METHODS
   */
  private truncateTitle(title: string): string {
    return title.length > 80 ? title.substring(0, 77) + '...' : title;
  }

  private truncateSnippet(snippet: string): string {
    return snippet.length > 200 ? snippet.substring(0, 197) + '...' : snippet;
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'Unknown source';
    }
  }

  private calculateConfidence(results: SearchResult[]): number {
    if (results.length === 0) return 0;
    const avgRelevance = results.reduce((sum, r) => sum + r.relevanceScore, 0) / results.length;
    const sourceCount = Math.min(results.length / 5, 1); // More sources = higher confidence
    return Math.min(avgRelevance * sourceCount, 0.95);
  }
}

export const perplexityStyleFormatter = PerplexityStyleFormatter.getInstance();
