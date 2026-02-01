// Document Canvas Bridge - Integrates document generation with canvas placement
// Bridges DocumentGenerator and AdvancedCanvasBoard following NeuraPlay architecture

import { DocumentGenerationResult } from './DocumentGenerator';
import { documentCanvasRenderer, DocumentCanvasLayout, DocumentElement } from './DocumentCanvasRenderer';
import { CanvasStateAdapter } from './CanvasStateAdapter';

export interface CanvasPlacement {
  success: boolean;
  elementIds: string[];
  layout: DocumentCanvasLayout;
  canvasActivated: boolean;
  error?: string;
}

export interface DocumentCanvasOptions {
  autoActivateCanvas?: boolean;
  startPosition?: { x: number; y: number };
  maxWidth?: number;
  interactive?: boolean;
  showMetadata?: boolean;
  enableExport?: boolean;
}

export class DocumentCanvasBridge {
  private static instance: DocumentCanvasBridge;

  static getInstance(): DocumentCanvasBridge {
    if (!DocumentCanvasBridge.instance) {
      DocumentCanvasBridge.instance = new DocumentCanvasBridge();
    }
    return DocumentCanvasBridge.instance;
  }

  /**
   * Place document on canvas with intelligent positioning
   */
  async placeDocumentOnCanvas(
    document: DocumentGenerationResult,
    options: DocumentCanvasOptions = {}
  ): Promise<CanvasPlacement> {
    try {
      console.log('🌉 DocumentCanvasBridge: Placing document on canvas');

      const {
        autoActivateCanvas = true,
        startPosition = { x: 100, y: 100 },
        interactive = true,
        showMetadata = true,
        enableExport = true
      } = options;

      // Convert document to canvas layout
      const layout = await documentCanvasRenderer.renderDocumentToCanvas(
        document,
        startPosition
      );

      // Convert canvas elements to AdvancedCanvasBoard format
      const canvasElements = this.convertToCanvasElements(layout.elements, {
        interactive,
        showMetadata,
        enableExport
      });

      // Do not auto-open AdvancedCanvasBoard here. Right pane canvases are state-driven.
      // Add a single DocumentCanvas element via state.
      const createdId = CanvasStateAdapter.addDocument({
        title: document.title || 'Document',
        content: (document as any).content || (document as any).text || '',
        metadata: document.metadata,
        position: startPosition,
        size: { width: options.maxWidth || 800, height: 600 }
      });

      return {
        success: true,
        elementIds: [createdId],
        layout,
        canvasActivated: autoActivateCanvas
      };

    } catch (error) {
      console.error('❌ DocumentCanvasBridge: Failed to place document', error);
      return {
        success: false,
        elementIds: [],
        layout: await documentCanvasRenderer.renderDocumentToCanvas(document),
        canvasActivated: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Convert DocumentElements to AdvancedCanvasBoard CanvasElement format
   */
  private convertToCanvasElements(
    documentElements: DocumentElement[],
    options: { interactive: boolean; showMetadata: boolean; enableExport: boolean }
  ): any[] {
    console.groupCollapsed('%c[DEBUG] convertToCanvasElements','color:lightgreen');
    console.log('documentElements', documentElements);
    console.log('options', options);
    return documentElements
      .filter(el => {
        // Filter based on options
        if (!options.showMetadata && el.type === 'metadata') return false;
        if (!options.enableExport && el.metadata.interactive && el.content.includes('Export:')) return false;
        return true;
      })
      .map(el => ({
        id: el.id,
        type: 'text' as const,
        content: {
          text: el.content,
          elementType: el.type,
          level: el.metadata.level
        },
        position: el.position,
        size: el.size,
        style: {
          ...el.style,
          interactive: options.interactive && el.metadata.interactive
        },
        metadata: {
          created: Date.now(),
          modified: Date.now(),
          author: 'ai',
          version: 1,
          documentElement: true,
          elementType: el.type,
          exportable: el.metadata.exportable
        }
      }));
    console.groupEnd();
  }

  /**
   * Activate canvas with document context
   */
  private activateCanvasWithDocument(
    document: DocumentGenerationResult,
    layout: DocumentCanvasLayout
  ): void {
    // Click-only behavior: no auto activation events dispatched.
    console.log('🎨 DocumentCanvasBridge: Skipping auto-activation (click-only board)');
  }

  /**
   * Add elements to canvas via custom event
   */
  private addElementsToCanvas(canvasElements: any[]): void {
    // Deprecated in state-driven flow. Kept for compatibility (no-op).
    console.log('📄 DocumentCanvasBridge: addElementsToCanvas is deprecated in state-driven mode');
  }

  /**
   * Create document from canvas elements (reverse operation)
   */
  async createDocumentFromCanvas(
    canvasElements: any[],
    documentType: 'essay' | 'report' | 'article' = 'article'
  ): Promise<DocumentGenerationResult> {
    try {
      console.log('📝 DocumentCanvasBridge: Creating document from canvas elements');

      // Filter document elements
      const documentElements = canvasElements.filter(el => 
        el.metadata?.documentElement && el.metadata?.exportable
      );

      // Sort by position (top to bottom)
      documentElements.sort((a, b) => a.position.y - b.position.y);

      // Convert elements back to markdown
      const markdown = this.convertElementsToMarkdown(documentElements);

      // Extract title (first heading element)
      const titleElement = documentElements.find(el => 
        el.content?.elementType === 'heading' && el.content?.level === 1
      );
      const title = titleElement?.content?.text || 'Untitled Document';

      // Create document result
      const result: DocumentGenerationResult = {
        success: true,
        content: markdown,
        title,
        metadata: {
          wordCount: this.countWords(markdown),
          readingTime: this.calculateReadingTime(markdown),
          sections: this.extractSections(documentElements),
          generatedAt: Date.now(),
          type: documentType,
          style: 'canvas-generated'
        },
        exportFormats: ['PDF', 'MD', 'TXT', 'DOCX']
      };

      return result;

    } catch (error) {
      console.error('❌ DocumentCanvasBridge: Failed to create document from canvas', error);
      throw error;
    }
  }

  /**
   * Convert canvas elements back to markdown
   */
  private convertElementsToMarkdown(elements: any[]): string {
    const lines: string[] = [];

    for (const element of elements) {
      const content = element.content?.text || '';
      const elementType = element.content?.elementType || 'paragraph';
      const level = element.content?.level || 1;

      switch (elementType) {
        case 'heading':
          lines.push(`${'#'.repeat(level)} ${content}`);
          lines.push('');
          break;
        case 'paragraph':
          lines.push(content);
          lines.push('');
          break;
        case 'list':
          lines.push(content); // Already has bullet
          break;
        case 'codeblock':
          lines.push('```');
          lines.push(content);
          lines.push('```');
          lines.push('');
          break;
        case 'quote':
          lines.push(`> ${content}`);
          lines.push('');
          break;
        default:
          if (content && !content.includes('Export:')) {
            lines.push(content);
            lines.push('');
          }
      }
    }

    return lines.join('\n').trim();
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Calculate reading time (assuming 200 words per minute)
   */
  private calculateReadingTime(text: string): number {
    const wordCount = this.countWords(text);
    return Math.ceil(wordCount / 200);
  }

  /**
   * Extract section headings from canvas elements
   */
  private extractSections(elements: any[]): string[] {
    return elements
      .filter(el => el.content?.elementType === 'heading')
      .map(el => el.content?.text || '')
      .filter(text => text.length > 0);
  }

  /**
   * Update document in canvas (for editing)
   */
  async updateDocumentInCanvas(
    documentId: string,
    updatedDocument: DocumentGenerationResult,
    options: DocumentCanvasOptions = {}
  ): Promise<CanvasPlacement> {
    console.log('🔄 DocumentCanvasBridge: Updating document in canvas');

    // Place updated document
    return await this.placeDocumentOnCanvas(updatedDocument, options);
  }

  /**
   * Export document from canvas
   */
  async exportDocumentFromCanvas(
    canvasElements: any[],
    format: 'PDF' | 'MD' | 'TXT' | 'DOCX' = 'MD'
  ): Promise<{ success: boolean; data?: string; url?: string; error?: string }> {
    try {
      console.log(`📤 DocumentCanvasBridge: Exporting document as ${format}`);

      const document = await this.createDocumentFromCanvas(canvasElements);

      switch (format) {
        case 'MD':
          return {
            success: true,
            data: document.content
          };
        case 'TXT':
          // Strip markdown formatting
          const plainText = document.content
            .replace(/#{1,6}\s+/g, '') // Remove headers
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
            .replace(/\*(.*?)\*/g, '$1') // Remove italic
            .replace(/`(.*?)`/g, '$1') // Remove code
            .replace(/>\s+/g, '') // Remove quotes
            .replace(/^\s*[-*]\s+/gm, '• '); // Convert lists
          return {
            success: true,
            data: plainText
          };
        default:
          return {
            success: false,
            error: `Export format ${format} not yet implemented`
          };
      }

    } catch (error) {
      console.error('❌ DocumentCanvasBridge: Export failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }
}

export const documentCanvasBridge = DocumentCanvasBridge.getInstance();
