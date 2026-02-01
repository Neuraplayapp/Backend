// Document Canvas Renderer - Converts generated documents to canvas elements
// Integrates with AdvancedCanvasBoard following NeuraPlay architecture

import { DocumentGenerationResult } from './DocumentGenerator';

export interface DocumentElement {
  id: string;
  type: 'heading' | 'paragraph' | 'section' | 'metadata' | 'list' | 'codeblock' | 'quote';
  content: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: {
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
    padding?: number;
    marginBottom?: number;
    fontFamily?: string;
    textAlign?: 'left' | 'center' | 'right';
    lineHeight?: number;
  };
  metadata: {
    level?: number; // For headings (1-6)
    sectionId?: string;
    exportable?: boolean;
    interactive?: boolean;
  };
}

export interface DocumentCanvasLayout {
  elements: DocumentElement[];
  totalHeight: number;
  totalWidth: number;
  metadata: {
    title: string;
    sections: string[];
    wordCount: number;
    readingTime: number;
  };
}

export class DocumentCanvasRenderer {
  private static instance: DocumentCanvasRenderer;
  
  // Layout constants
  private readonly CANVAS_WIDTH = 800;
  private readonly CANVAS_PADDING = 40;
  private readonly CONTENT_WIDTH = this.CANVAS_WIDTH - (this.CANVAS_PADDING * 2);
  private readonly LINE_HEIGHT = 1.6;
  private readonly SECTION_SPACING = 40;
  private readonly PARAGRAPH_SPACING = 20;

  static getInstance(): DocumentCanvasRenderer {
    if (!DocumentCanvasRenderer.instance) {
      DocumentCanvasRenderer.instance = new DocumentCanvasRenderer();
    }
    return DocumentCanvasRenderer.instance;
  }

  /**
   * Convert document to canvas elements with intelligent layout
   */
  async renderDocumentToCanvas(
    document: DocumentGenerationResult,
    startPosition: { x: number; y: number } = { x: 50, y: 50 }
  ): Promise<DocumentCanvasLayout> {
    try {
      console.log('📄 DocumentCanvasRenderer: Converting document to canvas elements');

      const elements: DocumentElement[] = [];
      let currentY = startPosition.y;
      let elementId = 1;

      // Parse markdown content into structured elements
      const parsedContent = this.parseMarkdownContent(document.content);

      // Add document title
      if (document.title) {
        const titleElement = this.createTitleElement(
          document.title,
          { x: startPosition.x, y: currentY },
          `doc-title-${elementId++}`
        );
        elements.push(titleElement);
        currentY += titleElement.size.height + this.SECTION_SPACING;
      }

      // Add document metadata
      const metadataElement = this.createMetadataElement(
        document.metadata,
        { x: startPosition.x, y: currentY },
        `doc-metadata-${elementId++}`
      );
      elements.push(metadataElement);
      currentY += metadataElement.size.height + this.PARAGRAPH_SPACING;

      // Process each content section
      for (const section of parsedContent) {
        const sectionElements = this.createSectionElements(
          section,
          { x: startPosition.x, y: currentY },
          elementId
        );
        
        elements.push(...sectionElements);
        
        // Update position and ID counter
        const sectionHeight = sectionElements.reduce((sum, el) => sum + el.size.height, 0);
        currentY += sectionHeight + this.SECTION_SPACING;
        elementId += sectionElements.length;
      }

      // Add export controls
      const exportElement = this.createExportElement(
        document.exportFormats,
        { x: startPosition.x, y: currentY },
        `doc-export-${elementId++}`
      );
      elements.push(exportElement);
      currentY += exportElement.size.height;

      return {
        elements,
        totalHeight: currentY - startPosition.y,
        totalWidth: this.CANVAS_WIDTH,
        metadata: {
          title: document.title,
          sections: document.metadata.sections,
          wordCount: document.metadata.wordCount,
          readingTime: document.metadata.readingTime
        }
      };

    } catch (error) {
      console.error('❌ DocumentCanvasRenderer: Conversion failed', error);
      return this.createErrorLayout(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Parse markdown content into structured sections
   */
  private parseMarkdownContent(content: string): ParsedSection[] {
    const lines = content.split('\n');
    const sections: ParsedSection[] = [];
    let currentSection: ParsedSection | null = null;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        continue;
      }

      // Detect headings
      if (trimmedLine.startsWith('#')) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }
        
        const level = (trimmedLine.match(/^#+/) || [''])[0].length;
        const text = trimmedLine.replace(/^#+\s*/, '');
        
        currentSection = {
          type: 'heading',
          level: Math.min(level, 6),
          content: text,
          elements: []
        };
      }
      // Detect lists
      else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ') || /^\d+\.\s/.test(trimmedLine)) {
        if (!currentSection) {
          currentSection = { type: 'section', content: '', elements: [] };
        }
        currentSection.elements.push({
          type: 'list-item',
          content: trimmedLine.replace(/^[-*]\s|^\d+\.\s/, ''),
          level: 1
        });
      }
      // Detect code blocks
      else if (trimmedLine.startsWith('```')) {
        if (!currentSection) {
          currentSection = { type: 'section', content: '', elements: [] };
        }
        currentSection.elements.push({
          type: 'codeblock',
          content: trimmedLine.replace(/```\w*/, ''),
          level: 1
        });
      }
      // Detect quotes
      else if (trimmedLine.startsWith('>')) {
        if (!currentSection) {
          currentSection = { type: 'section', content: '', elements: [] };
        }
        currentSection.elements.push({
          type: 'quote',
          content: trimmedLine.replace(/^>\s*/, ''),
          level: 1
        });
      }
      // Regular paragraph text
      else {
        if (!currentSection) {
          currentSection = { type: 'section', content: '', elements: [] };
        }
        currentSection.elements.push({
          type: 'paragraph',
          content: trimmedLine,
          level: 1
        });
      }
    }

    // Add final section
    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Create title element
   */
  private createTitleElement(
    title: string,
    position: { x: number; y: number },
    id: string
  ): DocumentElement {
    const fontSize = 32;
    const estimatedHeight = this.estimateTextHeight(title, fontSize, this.CONTENT_WIDTH);

    return {
      id,
      type: 'heading',
      content: title,
      position,
      size: { width: this.CONTENT_WIDTH, height: estimatedHeight },
      style: {
        fontSize,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: this.LINE_HEIGHT
      },
      metadata: {
        level: 1,
        exportable: true,
        interactive: false
      }
    };
  }

  /**
   * Create metadata element
   */
  private createMetadataElement(
    metadata: any,
    position: { x: number; y: number },
    id: string
  ): DocumentElement {
    const metadataText = [
      `Type: ${metadata.type}`,
      `Words: ${metadata.wordCount}`,
      `Reading Time: ${metadata.readingTime} min`,
      `Generated: ${new Date(metadata.generatedAt).toLocaleDateString()}`
    ].join(' • ');

    const fontSize = 14;
    const estimatedHeight = this.estimateTextHeight(metadataText, fontSize, this.CONTENT_WIDTH);

    return {
      id,
      type: 'metadata',
      content: metadataText,
      position,
      size: { width: this.CONTENT_WIDTH, height: estimatedHeight },
      style: {
        fontSize,
        color: '#9ca3af',
        textAlign: 'center',
        fontFamily: 'monospace',
        backgroundColor: 'rgba(55, 65, 81, 0.3)',
        padding: 10,
        lineHeight: this.LINE_HEIGHT
      },
      metadata: {
        exportable: false,
        interactive: false
      }
    };
  }

  /**
   * Create section elements
   */
  private createSectionElements(
    section: ParsedSection,
    startPosition: { x: number; y: number },
    startId: number
  ): DocumentElement[] {
    const elements: DocumentElement[] = [];
    let currentY = startPosition.y;
    let elementId = startId;

    // Create heading if this is a heading section
    if (section.type === 'heading') {
      const headingElement = this.createHeadingElement(
        section.content,
        section.level || 2,
        { x: startPosition.x, y: currentY },
        `heading-${elementId++}`
      );
      elements.push(headingElement);
      currentY += headingElement.size.height + this.PARAGRAPH_SPACING;
    }

    // Create elements for section content
    for (const element of section.elements) {
      const canvasElement = this.createContentElement(
        element,
        { x: startPosition.x, y: currentY },
        `content-${elementId++}`
      );
      elements.push(canvasElement);
      currentY += canvasElement.size.height + this.PARAGRAPH_SPACING;
    }

    return elements;
  }

  /**
   * Create heading element
   */
  private createHeadingElement(
    content: string,
    level: number,
    position: { x: number; y: number },
    id: string
  ): DocumentElement {
    const fontSize = Math.max(24 - (level * 2), 16);
    const estimatedHeight = this.estimateTextHeight(content, fontSize, this.CONTENT_WIDTH);

    return {
      id,
      type: 'heading',
      content,
      position,
      size: { width: this.CONTENT_WIDTH, height: estimatedHeight },
      style: {
        fontSize,
        fontWeight: level <= 2 ? 'bold' : 'semibold',
        color: '#ffffff',
        marginBottom: 15,
        lineHeight: this.LINE_HEIGHT
      },
      metadata: {
        level,
        exportable: true,
        interactive: true
      }
    };
  }

  /**
   * Create content element based on type
   */
  private createContentElement(
    element: ParsedElement['elements'][0],
    position: { x: number; y: number },
    id: string
  ): DocumentElement {
    const fontSize = 16;
    let estimatedHeight = this.estimateTextHeight(element.content, fontSize, this.CONTENT_WIDTH);

    const baseStyle = {
      fontSize,
      color: '#e5e7eb',
      lineHeight: this.LINE_HEIGHT,
      marginBottom: 12
    };

    switch (element.type) {
      case 'paragraph':
        return {
          id,
          type: 'paragraph',
          content: element.content,
          position,
          size: { width: this.CONTENT_WIDTH, height: estimatedHeight },
          style: baseStyle,
          metadata: { exportable: true, interactive: false }
        };

      case 'list-item':
        return {
          id,
          type: 'list',
          content: `• ${element.content}`,
          position: { x: position.x + 20, y: position.y },
          size: { width: this.CONTENT_WIDTH - 20, height: estimatedHeight },
          style: { ...baseStyle, color: '#d1d5db' },
          metadata: { exportable: true, interactive: false }
        };

      case 'codeblock':
        estimatedHeight += 20; // Extra padding for code blocks
        return {
          id,
          type: 'codeblock',
          content: element.content,
          position,
          size: { width: this.CONTENT_WIDTH, height: estimatedHeight },
          style: {
            ...baseStyle,
            fontFamily: 'monospace',
            backgroundColor: 'rgba(17, 24, 39, 0.8)',
            padding: 15,
            color: '#10b981'
          },
          metadata: { exportable: true, interactive: true }
        };

      case 'quote':
        return {
          id,
          type: 'quote',
          content: element.content,
          position: { x: position.x + 20, y: position.y },
          size: { width: this.CONTENT_WIDTH - 20, height: estimatedHeight },
          style: {
            ...baseStyle,
            color: '#fbbf24',
            fontStyle: 'italic',
            backgroundColor: 'rgba(251, 191, 36, 0.1)',
            padding: 10
          },
          metadata: { exportable: true, interactive: false }
        };

      default:
        return {
          id,
          type: 'paragraph',
          content: element.content,
          position,
          size: { width: this.CONTENT_WIDTH, height: estimatedHeight },
          style: baseStyle,
          metadata: { exportable: true, interactive: false }
        };
    }
  }

  /**
   * Create export controls element
   */
  private createExportElement(
    exportFormats: string[],
    position: { x: number; y: number },
    id: string
  ): DocumentElement {
    const content = `Export: ${exportFormats.join(' | ')}`;
    const fontSize = 14;
    const height = 40;

    return {
      id,
      type: 'metadata',
      content,
      position,
      size: { width: this.CONTENT_WIDTH, height },
      style: {
        fontSize,
        color: '#6366f1',
        textAlign: 'center',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        padding: 12,
        fontWeight: 'medium'
      },
      metadata: {
        exportable: false,
        interactive: true
      }
    };
  }

  /**
   * Estimate text height for layout calculations
   */
  private estimateTextHeight(text: string, fontSize: number, maxWidth: number): number {
    const charactersPerLine = Math.floor(maxWidth / (fontSize * 0.6)); // Rough estimation
    const lines = Math.ceil(text.length / charactersPerLine);
    return lines * fontSize * this.LINE_HEIGHT + 10; // Extra padding
  }

  /**
   * Create error layout for failed document conversion
   */
  private createErrorLayout(error: string): DocumentCanvasLayout {
    return {
      elements: [{
        id: 'error-1',
        type: 'paragraph',
        content: `Document rendering failed: ${error}`,
        position: { x: 50, y: 50 },
        size: { width: this.CONTENT_WIDTH, height: 60 },
        style: {
          fontSize: 16,
          color: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          padding: 15
        },
        metadata: { exportable: false, interactive: false }
      }],
      totalHeight: 60,
      totalWidth: this.CANVAS_WIDTH,
      metadata: {
        title: 'Error',
        sections: [],
        wordCount: 0,
        readingTime: 0
      }
    };
  }
}

// Helper interfaces
interface ParsedSection {
  type: 'heading' | 'section';
  content: string;
  level?: number;
  elements: Array<{
    type: 'paragraph' | 'list-item' | 'codeblock' | 'quote';
    content: string;
    level: number;
  }>;
}

export const documentCanvasRenderer = DocumentCanvasRenderer.getInstance();
