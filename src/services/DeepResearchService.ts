/**
 * 🔬 DeepResearchService
 * 
 * Produces Perplexity-style deep research with:
 * - Inline citations [1], [2], [3]
 * - Images from search results
 * - Multi-source synthesis
 * - Professional structured format
 */

export interface DeepResearchResult {
  success: boolean;
  content: string;
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

export class DeepResearchService {
  private static instance: DeepResearchService;

  static getInstance(): DeepResearchService {
    if (!DeepResearchService.instance) {
      DeepResearchService.instance = new DeepResearchService();
    }
    return DeepResearchService.instance;
  }

  /**
   * Make citation references clickable - STRUCTURAL (No Regex)
   * 
   * Replaces: new RegExp(`(?<!\\]\\()\\[${citationNum}\\](?!\\()`, 'g')
   * 
   * Scans the content character by character, finds [N] patterns
   * that aren't already inside markdown links, and replaces them.
   */
  makeReferencesClickable(content: string, sources: ResearchSource[]): string {
    if (!content || sources.length === 0) return content;

    let result = '';
    let i = 0;

    while (i < content.length) {
      // Check for [ which might be a citation
      if (content[i] === '[') {
        // Try to parse a citation number: [N]
        const citationResult = this.parseCitation(content, i);
        
        if (citationResult) {
          const { num, end } = citationResult;
          
          // Check if this is already part of a markdown link
          // Already linked if followed by '(' — like [[1]](url)
          const isAlreadyLinked = end < content.length && content[end] === '(';
          
          // Also check if preceded by '](' — inside a link target
          const isPrecededByLinkSyntax = i >= 2 && content[i - 1] === '(' && content[i - 2] === ']';
          
          if (!isAlreadyLinked && !isPrecededByLinkSyntax && num >= 1 && num <= sources.length) {
            const source = sources[num - 1];
            result += `[[${num}]](${source.url})`;
            i = end;
            continue;
          }
        }
      }
      
      result += content[i];
      i++;
    }

    return result;
  }

  /**
   * Parse a citation [N] starting at position
   * Returns { num, end } where end is position after ']'
   */
  private parseCitation(text: string, start: number): { num: number; end: number } | null {
    if (text[start] !== '[') return null;
    
    let numStr = '';
    let pos = start + 1;
    
    while (pos < text.length && text[pos] >= '0' && text[pos] <= '9') {
      numStr += text[pos];
      pos++;
    }
    
    if (numStr.length === 0) return null;
    if (pos >= text.length || text[pos] !== ']') return null;
    
    return { num: parseInt(numStr, 10), end: pos + 1 };
  }

  /**
   * Format sources section
   */
  formatSourcesSection(sources: ResearchSource[]): string {
    if (sources.length === 0) return '';
    const cited = sources.slice(0, 6);
    let section = '\n\n---\n\n**📚 Sources & References**\n\n';
    cited.forEach((source, i) => {
      section += `**[${i + 1}]** [${source.title}](${source.url}) — *${source.domain}*\n`;
      if (source.snippet) {
        const short = source.snippet.substring(0, 120);
        section += `   ${short}${source.snippet.length > 120 ? '...' : ''}\n`;
      }
      section += '\n';
    });
    section += '\n*All figures and percentages are drawn from the sources listed.*\n';
    return section;
  }

  /**
   * Format images section
   */
  formatImagesSection(images: ResearchImage[]): string {
    if (images.length === 0) return '';
    let section = '\n\n---\n\n## 🖼️ Visual Resources\n\n';
    images.slice(0, 6).forEach((img, i) => {
      section += `### Visual ${i + 1}\n`;
      section += `![${img.title || 'Research visual'}](${img.url})\n`;
      if (img.title) section += `*${img.title}*\n`;
      if (img.sourceUrl) section += `[View source](${img.sourceUrl})\n`;
      section += '\n';
    });
    return section;
  }

  /**
   * Generate fallback content
   */
  generateFallbackContent(topic: string, sources: ResearchSource[], images: ResearchImage[]): string {
    let content = `## 🔬 Deep Research: ${topic}\n\n`;
    if (sources.length > 0) {
      content += `### 📊 Research Findings\n\nBased on ${sources.length} sources:\n\n`;
      sources.slice(0, 8).forEach((source, i) => {
        content += `**[${i + 1}] ${source.title}**\n> ${source.snippet}\n*Source: [${source.domain}](${source.url})*\n\n`;
      });
      content += this.formatSourcesSection(sources);
    } else {
      content += `*Research in progress for "${topic}"*\n`;
    }
    if (images.length > 0) content += this.formatImagesSection(images);
    return content;
  }

  /**
   * Extract domain from URL (structural, no regex)
   */
  extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      return hostname.startsWith('www.') ? hostname.substring(4) : hostname;
    } catch {
      return 'unknown';
    }
  }
}

export const deepResearchService = DeepResearchService.getInstance();
export default deepResearchService;