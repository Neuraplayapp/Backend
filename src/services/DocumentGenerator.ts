// Document Generator Service - Creates structured documents through NPU
// Integrates with NeuraPlayAssistant following NeuraPlay architecture patterns

import { serviceContainer } from './ServiceContainer';
import { getLanguageInstruction, getCurrentLanguageName, getFullLanguageContext } from '../utils/languageUtils';

export interface DocumentGenerationRequest {
  type: 'essay' | 'report' | 'article' | 'manual' | 'proposal' | 'directive' | 'memo';
  prompt: string;
  length: 'short' | 'medium' | 'long';
  style: 'academic' | 'business' | 'casual' | 'technical' | 'formal';
  tone: 'professional' | 'friendly' | 'authoritative' | 'informative';
  sections?: string[]; // Optional section structure
  metadata?: {
    author?: string;
    organization?: string;
    date?: string;
    audience?: string;
  };
}

export interface DocumentGenerationResult {
  success: boolean;
  content: string;
  title: string;
  metadata: {
    wordCount: number;
    readingTime: number;
    sections: string[];
    generatedAt: number;
    type: string;
    style: string;
  };
  exportFormats: string[];
  error?: string;
}

class DocumentGenerator {
  private static instance: DocumentGenerator;

  static getInstance(): DocumentGenerator {
    if (!DocumentGenerator.instance) {
      DocumentGenerator.instance = new DocumentGenerator();
    }
    return DocumentGenerator.instance;
  }

  /**
   * Generate document using NPU system
   */
  async generateDocument(request: DocumentGenerationRequest): Promise<DocumentGenerationResult> {
    try {
      console.log('📝 DocumentGenerator: Starting generation', request.type);

      // Build structured prompt for document generation
      const structuredPrompt = this.buildDocumentPrompt(request);

          // Use NPU through AIRouter (same pattern as NeuraPlayAssistant)
    const aiRouter = serviceContainer.get('aiRouter') as any;
    const response = await aiRouter.processRequest({
        message: structuredPrompt,
        sessionId: `doc-gen-${Date.now()}`,
        userId: 'system',
        context: {
          mode: 'document-generation',
          type: request.type,
          requirements: request
        },
        mode: 'chat',
        constraints: {
          maxTokens: this.getTokensForLength(request.length),
          temperature: 0.7,
          timeoutMs: 180000 // 3 minutes for long documents
        }
      });

      if (!response.success) {
        throw new Error(response.error || 'Document generation failed');
      }

      // Process and structure the generated content
      const processedContent = this.processGeneratedContent(response.response, request);
      
      return {
        success: true,
        content: processedContent.content,
        title: processedContent.title,
        metadata: {
          wordCount: this.countWords(processedContent.content),
          readingTime: this.calculateReadingTime(processedContent.content),
          sections: this.extractSections(processedContent.content),
          generatedAt: Date.now(),
          type: request.type,
          style: request.style
        },
        exportFormats: ['PDF', 'MD', 'TXT', 'DOCX']
      };

    } catch (error) {
      console.error('❌ DocumentGenerator: Generation failed', error);
      return {
        success: false,
        content: '',
        title: 'Generation Failed',
        metadata: {
          wordCount: 0,
          readingTime: 0,
          sections: [],
          generatedAt: Date.now(),
          type: request.type,
          style: request.style
        },
        exportFormats: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Build structured prompt for document generation
   */
  private buildDocumentPrompt(request: DocumentGenerationRequest): string {
    const { type, prompt, length, style, tone, sections, metadata } = request;
    
    // Get user's preferred language for content generation
    const languageContext = getFullLanguageContext();
    const languageName = languageContext.name;
    const languageInstruction = languageContext.instruction;

    let structuredPrompt = `Generate a ${length} ${type} in ${style} style with a ${tone} tone.
${languageInstruction}

TOPIC: ${prompt}

REQUIREMENTS:
- Document Type: ${type.toUpperCase()}
- Length: ${length} (${this.getLengthDescription(length)})
- Writing Style: ${style}
- Tone: ${tone}
- Language: ${languageName}`;

    if (sections && sections.length > 0) {
      structuredPrompt += `\n- Required Sections: ${sections.join(', ')}`;
    }

    if (metadata) {
      structuredPrompt += `\n\nMETADATA:`;
      if (metadata.author) structuredPrompt += `\n- Author: ${metadata.author}`;
      if (metadata.organization) structuredPrompt += `\n- Organization: ${metadata.organization}`;
      if (metadata.audience) structuredPrompt += `\n- Target Audience: ${metadata.audience}`;
    }

    structuredPrompt += `\n\nSTRUCTURE REQUIREMENTS:
- Include a clear title
- Use proper headings and subheadings
- Ensure logical flow and organization
- Include introduction, body, and conclusion
- Use appropriate formatting for ${type}
- Write ALL content in ${languageName}

Please generate the complete ${type} now:`;

    return structuredPrompt;
  }

  /**
   * Process generated content to ensure proper structure
   */
  private processGeneratedContent(content: string, request: DocumentGenerationRequest) {
    // Extract title from content or generate one
    const titleMatch = content.match(/^#\s+(.+)/m) || content.match(/^(.+)\n=+/m);
    const title = titleMatch 
      ? titleMatch[1].trim() 
      : this.generateTitle(request.type, request.prompt);

    // Clean and format content
    let processedContent = content;
    
    // Ensure proper markdown formatting
    if (!content.startsWith('#')) {
      processedContent = `# ${title}\n\n${content}`;
    }

    // Add metadata section if provided
    if (request.metadata) {
      const metadataSection = this.buildMetadataSection(request.metadata);
      processedContent = `${processedContent}\n\n${metadataSection}`;
    }

    return {
      title,
      content: processedContent
    };
  }

  /**
   * Generate title if not found in content
   */
  private generateTitle(type: string, prompt: string): string {
    const typeCapitalized = type.charAt(0).toUpperCase() + type.slice(1);
    const shortPrompt = prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt;
    return `${typeCapitalized}: ${shortPrompt}`;
  }

  /**
   * Build metadata section for document
   */
  private buildMetadataSection(metadata: DocumentGenerationRequest['metadata']): string {
    let section = '---\n\n## Document Information\n\n';
    
    if (metadata?.author) section += `**Author:** ${metadata.author}\n\n`;
    if (metadata?.organization) section += `**Organization:** ${metadata.organization}\n\n`;
    if (metadata?.date) section += `**Date:** ${metadata.date}\n\n`;
    if (metadata?.audience) section += `**Target Audience:** ${metadata.audience}\n\n`;
    
    section += `**Generated:** ${new Date().toLocaleDateString()}\n\n---`;
    
    return section;
  }

  /**
   * Get token count based on length requirement
   */
  private getTokensForLength(length: string): number {
    switch (length) {
      case 'short': return 1000;   // ~750 words
      case 'medium': return 2000;  // ~1500 words  
      case 'long': return 4000;    // ~3000 words
      default: return 2000;
    }
  }

  /**
   * Get length description for prompt
   */
  private getLengthDescription(length: string): string {
    switch (length) {
      case 'short': return '500-1000 words';
      case 'medium': return '1000-2000 words';
      case 'long': return '2000-4000 words';
      default: return '1000-2000 words';
    }
  }

  /**
   * Count words in content
   */
  private countWords(content: string): number {
    return content.trim().split(/\s+/).length;
  }

  /**
   * Calculate reading time (average 200 words per minute)
   */
  private calculateReadingTime(content: string): number {
    const wordCount = this.countWords(content);
    return Math.ceil(wordCount / 200);
  }

  /**
   * Extract section headings from content
   */
  private extractSections(content: string): string[] {
    const sections: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      // Match markdown headings (# ## ###)
      const headingMatch = line.match(/^(#+)\s+(.+)/);
      if (headingMatch) {
        sections.push(headingMatch[2].trim());
      }
    }
    
    return sections;
  }

  /**
   * Convert markdown to PDF using jsPDF (placeholder)
   */
  async generatePDF(content: string, title: string): Promise<Blob> {
    // TODO: Implement PDF generation using jsPDF
    console.log('📄 PDF Generation not yet implemented');
    return new Blob([content], { type: 'text/plain' });
  }

  /**
   * Export as markdown file
   */
  async exportMarkdown(content: string, title: string): Promise<Blob> {
    return new Blob([content], { type: 'text/markdown' });
  }

  /**
   * Export as plain text
   */
  async exportText(content: string, title: string): Promise<Blob> {
    // Strip markdown formatting for plain text
    const plainText = content
      .replace(/^#+\s+/gm, '') // Remove heading markers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove code
      .replace(/\[(.*?)\]\(.*?\)/g, '$1'); // Remove links
    
    return new Blob([plainText], { type: 'text/plain' });
  }
}

// Export singleton instance
export const documentGenerator = DocumentGenerator.getInstance();
export default DocumentGenerator;
