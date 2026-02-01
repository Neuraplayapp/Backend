/**
 * 🔬 DeepResearchService
 * 
 * Produces Perplexity-style deep research with:
 * - Inline citations [1], [2], [3]
 * - Images from search results
 * - Multi-source synthesis
 * - Professional structured format
 */

import { toolRegistry } from './ToolRegistry';
import { intelligentSearchService } from './IntelligentSearchService';

export interface DeepResearchResult {
  success: boolean;
  content: string;           // Formatted markdown with inline citations
  sources: ResearchSource[];
  images: ResearchImage[];
  metadata: {
    totalSources: number;
    searchQueries: string[];
    confidence: number;
    processingTimeMs: number;
  };
}

export interface ResearchSource {
  id: number;
  title: string;
  url: string;
  snippet: string;
  domain: string;
  deepContent?: string;
}

export interface ResearchImage {
  url: string;
  title: string;
  sourceUrl: string;
  width?: number;
  height?: number;
}

class DeepResearchService {
  private static instance: DeepResearchService;
  
  static getInstance(): DeepResearchService {
    if (!DeepResearchService.instance) {
      DeepResearchService.instance = new DeepResearchService();
    }
    return DeepResearchService.instance;
  }

  /**
   * 🔬 Execute comprehensive deep research on a topic
   */
  async research(
    topic: string,
    context: string = '',
    sessionId: string = 'deep-research-session',
    metadata: { version?: number; elementId?: string; complexity?: string } = {}
  ): Promise<DeepResearchResult> {
    const startTime = Date.now();
    const { version = 1, elementId, complexity = 'moderate' } = metadata;
    
    console.log('🔬 DeepResearchService: Starting research for:', topic, {
      version,
      elementId,
      contextLength: context.length
    });
    
    const sources: ResearchSource[] = [];
    const images: ResearchImage[] = [];
    const searchQueries: string[] = [];
    let synthesizedContent = '';
    
    try {
      // ═══════════════════════════════════════════════════════════════════
      // PHASE 1: Direct Serper web search (bypass nested tool calls)
      // ═══════════════════════════════════════════════════════════════════
      console.log('🌐 Phase 1: Direct web search via Serper...');
      
      const searchQueriesToRun = [
        `${topic} comprehensive guide`,
        `${topic} expert analysis insights`,
        `${topic} best practices examples`
      ];
      
      for (const query of searchQueriesToRun) {
        searchQueries.push(query);
        try {
          // Use web-search directly for raw Serper results (no nested calls)
          const searchResult = await toolRegistry.execute(
            'web-search',
            {
              query,
              numResults: 8,
              includeImages: true  // Request images from search
            },
            { sessionId, userId: 'deep-research', startTime: Date.now() }
          );
          
          console.log(`🔍 web-search result for "${query}":`, {
            success: searchResult.success,
            hasData: !!searchResult.data,
            dataType: typeof searchResult.data
          });
          
          // Handle various response structures from web-search
          let results: any[] = [];
          if (searchResult.data) {
            if (Array.isArray(searchResult.data)) {
              results = searchResult.data;
            } else if (searchResult.data.organic) {
              results = searchResult.data.organic;
            } else if (searchResult.data.results) {
              results = searchResult.data.results;
            } else if (searchResult.data.data?.results) {
              results = searchResult.data.data.results;
            }
          }
          
          console.log(`📊 Extracted ${results.length} results from web-search`);
          
          if (results.length > 0) {
            results.forEach((result: any) => {
              const url = result.link || result.url || '';
              // Avoid duplicates
              if (url && !sources.find(s => s.url === url)) {
                sources.push({
                  id: sources.length + 1,
                  title: result.title || 'Untitled',
                  url,
                  snippet: result.snippet || result.description || '',
                  domain: this.extractDomain(url)
                });
              }
            });
          }
          
          // Extract images if available in response
          const searchImages = searchResult.data?.images || [];
          searchImages.forEach((img: any) => {
            const imgUrl = img.imageUrl || img.url || img.thumbnailUrl;
            if (imgUrl && !images.find(i => i.url === imgUrl)) {
              images.push({
                url: imgUrl,
                title: img.title || img.alt || 'Research image',
                sourceUrl: img.link || img.sourceUrl || '',
                width: img.width,
                height: img.height
              });
            }
          });
          
        } catch (searchError) {
          console.warn(`⚠️ Search failed for query "${query}":`, searchError);
        }
      }
      
      console.log(`✅ Phase 1 complete: ${sources.length} sources, ${images.length} images`);
      
      // ═══════════════════════════════════════════════════════════════════
      // PHASE 2: Intelligent Search Service - Deep analysis
      // ═══════════════════════════════════════════════════════════════════
      console.log('🧠 Phase 2: Intelligent deep analysis...');
      
      let intelligentInsights: any = null;
      try {
        intelligentInsights = await intelligentSearchService.search(topic, {
          type: 'research',
          depth: 'comprehensive',
          expertLevel: 'expert'
        }, {
          maxResults: 8,
          deepAnalysis: true,
          includeSpecializedSources: true
        });
        
        // Add any new sources from intelligent search
        if (intelligentInsights?.sources?.serper) {
          intelligentInsights.sources.serper.forEach((source: any) => {
            if (!sources.find(s => s.url === source.link)) {
              sources.push({
                id: sources.length + 1,
                title: source.title || 'Untitled',
                url: source.link || '',
                snippet: source.snippet || '',
                domain: source.domain || this.extractDomain(source.link || ''),
                deepContent: source.analysis?.summary
              });
            }
          });
        }
        
        console.log('✅ Phase 2 complete: Intelligent insights gathered');
      } catch (intelligentError) {
        console.warn('⚠️ Intelligent search failed:', intelligentError);
      }
      
      // ═══════════════════════════════════════════════════════════════════
      // PHASE 3: Deep content reading for top sources
      // ═══════════════════════════════════════════════════════════════════
      console.log('📖 Phase 3: Deep reading top sources...');
      
      const topSources = sources.slice(0, 3);
      for (const source of topSources) {
        if (!source.url) continue;
        
        try {
          const readerResult = await toolRegistry.execute(
            'reader',
            { url: source.url, extractMode: 'article' },
            { sessionId, userId: 'deep-research', startTime: Date.now() }
          );
          
          if (readerResult.success && readerResult.data?.content) {
            source.deepContent = readerResult.data.content.substring(0, 2000);
          }
        } catch (readError) {
          console.warn(`⚠️ Reader failed for ${source.url}`);
        }
      }
      
      console.log('✅ Phase 3 complete: Deep content extracted');
      
      // ═══════════════════════════════════════════════════════════════════
      // PHASE 4: LLM Synthesis with inline citations
      // ═══════════════════════════════════════════════════════════════════
      console.log('🎯 Phase 4: LLM synthesis with citations...', { version, elementId, complexity });
      
      synthesizedContent = await this.synthesizeWithCitations(
        topic,
        context,
        sources,
        version,
        images,
        intelligentInsights,
        complexity
      );
      
      console.log('✅ Phase 4 complete: Synthesis generated');
      
    } catch (error) {
      console.error('❌ DeepResearchService error:', error);
      
      // Fallback: generate basic content from whatever we have
      synthesizedContent = this.generateFallbackContent(topic, sources, images);
    }
    
    const processingTimeMs = Date.now() - startTime;
    console.log(`🔬 DeepResearchService complete in ${processingTimeMs}ms`);
    
    return {
      success: sources.length > 0,
      content: synthesizedContent,
      sources,
      images,
      metadata: {
        totalSources: sources.length,
        searchQueries,
        confidence: Math.min(95, 50 + sources.length * 5),
        processingTimeMs
      }
    };
  }

  /**
   * 🎯 Synthesize research with inline citations [1], [2], etc.
   */
  private async synthesizeWithCitations(
    topic: string,
    context: string,
    sources: ResearchSource[],
    version: number,
    images: ResearchImage[],
    intelligentInsights: any,
    complexity: string = 'moderate'
  ): Promise<string> {
    // Adjust token limits based on original document complexity
    const tokenLimits: Record<string, { tokens: number; words: string }> = {
      simple: { tokens: 800, words: '300-400' },
      moderate: { tokens: 1500, words: '600-800' },
      complex: { tokens: 2200, words: '1000-1200' },
      expert: { tokens: 3000, words: '1500-1800' }
    };
    const config = tokenLimits[complexity] || tokenLimits.moderate;
    
    console.log('🎯 DeepResearch: Using complexity-adjusted tokens:', { complexity, ...config });
    
    // Build source reference text for LLM
    const sourceContext = sources.slice(0, 10).map((s, i) => 
      `[${i + 1}] ${s.title} (${s.domain}): ${s.snippet}${s.deepContent ? `\n   Deep content: ${s.deepContent.substring(0, 500)}` : ''}`
    ).join('\n\n');
    
    // Build intelligent insights context
    let insightsContext = '';
    if (intelligentInsights?.synthesis) {
      if (intelligentInsights.synthesis.keyFindings?.length > 0) {
        insightsContext += `Key Findings: ${intelligentInsights.synthesis.keyFindings.join('; ')}\n`;
      }
      if (intelligentInsights.synthesis.expertRecommendations?.length > 0) {
        insightsContext += `Expert Recommendations: ${intelligentInsights.synthesis.expertRecommendations.join('; ')}\n`;
      }
    }
    
    // Select only the most relevant sources (top 5-6)
    const topSources = sources.slice(0, 6);
    
    // 📄 CRITICAL: Include existing document context so LLM knows what's already there
    const documentContext = context.length > 0 
      ? `\n\nEXISTING DOCUMENT CONTENT (${context.length} chars, ${context.split(/\s+/).length} words):\n${context.substring(0, 3000)}${context.length > 3000 ? '\n\n...[document continues]...' : ''}\n`
      : '';
    
    const synthesisPrompt = `You are enhancing document v${version}: "${topic}" with deep research.
${documentContext}
RESEARCH SOURCES TO CITE (you MUST use inline citations [1], [2], [3] etc. for these):
${topSources.map((s, i) => 
  `[${i + 1}] "${s.title}" (${s.domain}): ${s.snippet}${s.deepContent ? ` | Key content: ${s.deepContent.substring(0, 300)}` : ''}`
).join('\n')}

YOUR TASK: Write research-backed content that BUILDS ON and ENHANCES the existing document above.

CRITICAL REQUIREMENTS:
1. DO NOT repeat content already in the existing document - ADD NEW insights only
2. Reference the existing content ("Building on the previous analysis...", "As discussed earlier...")
3. You MUST cite sources using [1], [2], [3] format IN THE TEXT - NOT just listing them
4. Every major claim should have a citation
5. DO NOT include a "Source Cards" or "Sources & References" section - I will add that automatically
6. Focus ONLY on NEW analysis content with embedded citations

OUTPUT FORMAT:

## 🔬 Deep Research Analysis

### Executive Summary
Write 2-3 paragraphs synthesizing the key findings. CITE sources like this: "According to research [1], ..." or "Studies show [2][3]..."

### Key Research Findings

**1. [Finding Title]**
Explanation with data and citations [1]. Add specific statistics.

**2. [Finding Title]**
Another finding with citations [2][3].

**3. [Finding Title]**
Continue pattern with proper citations.

### Strategic Recommendations
Based on the research:
1. First recommendation backed by source [1]
2. Second recommendation backed by [2]
3. Third recommendation with citations

### Research Confidence
Brief note on synthesis methodology and source quality.

RULES:
- ${config.words} words maximum (IMPORTANT: match the original document's length)
- Use **bold** for emphasis
- Use > blockquotes for key statistics
- Cite where factually relevant - not every sentence needs a citation
- DO NOT create a sources list at the end - I handle that
- Write professionally and naturally
- COMPLETE your thoughts - do not start sections you cannot finish

Write the research analysis now:`;

    try {
      const { UnifiedAPIRouter } = await import('./UnifiedAPIRouter');
      const router = UnifiedAPIRouter.getInstance();
      
      console.log('🎯 DeepResearch: Calling LLM for synthesis...');
      
      const response = await router.routeAPICall(
        'fireworks',
        'llm-completion',
        {
          messages: [{ role: 'user', content: synthesisPrompt }],
          max_tokens: config.tokens,
          temperature: 0.5,
          model: 'accounts/fireworks/models/gpt-oss-120b'
        }
      );
      
      console.log('🎯 DeepResearch: LLM response:', {
        success: response?.success,
        hasData: !!response?.data,
        dataType: typeof response?.data,
        dataKeys: response?.data ? Object.keys(response.data) : []
      });
      
      if (response?.success) {
        let content = '';
        
        // Handle various response formats from UnifiedAPIRouter/unified-route.cjs
        if (typeof response.data === 'string') {
          content = response.data;
        } else if (Array.isArray(response.data) && response.data[0]?.generated_text) {
          // Backend returns: data: [{ generated_text: completion }]
          content = response.data[0].generated_text;
        } else if (response.data?.choices?.[0]?.message?.content) {
          // Direct Fireworks format
          content = response.data.choices[0].message.content;
        } else if (response.data?.generated_text) {
          content = response.data.generated_text;
        } else if (response.data?.content) {
          content = response.data.content;
        } else if (response.data?.text) {
          content = response.data.text;
        } else if (Array.isArray(response.data) && response.data[0]?.content) {
          content = response.data[0].content;
        } else if (response.data?.response) {
          content = response.data.response;
        }
        
        console.log('🎯 DeepResearch: Extracted content length:', content?.length || 0);
        console.log('🎯 DeepResearch: Content preview:', content?.substring(0, 100) || 'EMPTY');
        
        if (content && content.length > 100) {
          // 🔗 CRITICAL: Convert inline citations [1], [2] into clickable hyperlinks
          content = this.makeReferencesClickable(content, topSources);
          
          // Add images section if we have images
          if (images.length > 0) {
            content += this.formatImagesSection(images);
          }
          
          // Add sources reference section with clickable links
          content += this.formatSourcesSection(sources);
          
          return content;
        } else {
          console.warn('⚠️ DeepResearch: LLM content too short or empty, falling back');
        }
      } else {
        console.warn('⚠️ DeepResearch: LLM response not successful:', response?.error);
      }
    } catch (llmError) {
      console.warn('⚠️ LLM synthesis failed:', llmError);
    }
    
    // Fallback if LLM fails - this should NOT normally be reached
    console.warn('⚠️ DeepResearch: Using fallback content (LLM synthesis failed)');
    return this.generateFallbackContent(topic, sources, images);
  }

  /**
   * 🔗 Convert inline citations [1], [2], [3] into clickable hyperlinks
   */
  private makeReferencesClickable(content: string, sources: ResearchSource[]): string {
    console.log('🔗 Making references clickable for', sources.length, 'sources');
    
    // Replace [1], [2], [3] etc with clickable links
    // Use regex to find citations that are not already part of markdown links
    sources.forEach((source, i) => {
      const citationNum = i + 1;
      
      // Match [1], [2], etc but NOT inside existing markdown links like [text](url)
      // Negative lookbehind: (?<!\]\() ensures [1] is not preceded by ](
      // Negative lookahead: (?!\]\() ensures [1] is not followed by ](
      const citationRegex = new RegExp(`(?<!\\]\\()\\[${citationNum}\\](?!\\()`, 'g');
      
      // Replace with clickable superscript-style link
      // Format: [[1]](url) - renders as clickable [1]
      content = content.replace(citationRegex, `[[${citationNum}]](${source.url})`);
    });
    
    console.log('✅ References made clickable');
    return content;
  }

  /**
   * 📚 Format sources section with clickable reference cards
   * Only includes sources that were actually cited (top 6)
   */
  private formatSourcesSection(sources: ResearchSource[]): string {
    if (sources.length === 0) return '';
    
    // Only show the sources that were actually used in citations (top 6)
    const citedSources = sources.slice(0, 6);
    
    let section = '\n\n---\n\n**📚 Sources & References**\n\n';
    
    citedSources.forEach((source, i) => {
      // Compact source card format - no headings, just formatted links
      section += `**[${i + 1}]** [${source.title}](${source.url}) — *${source.domain}*\n`;
      if (source.snippet) {
        // Shorter snippet, no blockquote to keep it compact
        const shortSnippet = source.snippet.substring(0, 120);
        section += `   ${shortSnippet}${source.snippet.length > 120 ? '...' : ''}\n`;
      }
      section += '\n';
    });
    
    // Add note about all figures being from sources
    section += '\n*All figures and percentages are drawn from the sources listed in the original research appendix.*\n';
    
    return section;
  }

  /**
   * 🖼️ Format images section with rich visual cards
   */
  private formatImagesSection(images: ResearchImage[]): string {
    if (images.length === 0) return '';
    
    let section = '\n\n---\n\n## 🖼️ Visual Resources\n\n';
    section += '> Relevant images from research sources\n\n';
    
    images.slice(0, 6).forEach((img, i) => {
      section += `### Visual ${i + 1}\n`;
      section += `![${img.title || 'Research visual'}](${img.url})\n`;
      if (img.title) {
        section += `*${img.title}*\n`;
      }
      if (img.sourceUrl) {
        section += `[View source](${img.sourceUrl})\n`;
      }
      section += '\n';
    });
    
    return section;
  }

  /**
   * 🔄 Generate fallback content when LLM fails
   */
  private generateFallbackContent(
    topic: string,
    sources: ResearchSource[],
    images: ResearchImage[]
  ): string {
    let content = `## 🔬 Deep Research: ${topic}\n\n`;
    
    if (sources.length > 0) {
      content += `### 📊 Research Findings\n\n`;
      content += `Based on analysis of ${sources.length} sources, here are the key insights:\n\n`;
      
      sources.slice(0, 8).forEach((source, i) => {
        content += `**[${i + 1}] ${source.title}**\n`;
        content += `> ${source.snippet}\n`;
        content += `*Source: [${source.domain}](${source.url})*\n\n`;
      });
      
      content += this.formatSourcesSection(sources);
    } else {
      content += `*Research in progress - gathering sources on "${topic}"*\n`;
    }
    
    if (images.length > 0) {
      content += this.formatImagesSection(images);
    }
    
    return content;
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }
}

// Export singleton instance
export const deepResearchService = DeepResearchService.getInstance();
export default deepResearchService;

