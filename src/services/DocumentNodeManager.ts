/**
 * EMERGENCY FIX: DocumentNodeManager
 * 
 * Manages structured document nodes similar to Tiptap/Lexical
 * Enables evolution from string-based to node-based document model
 * Maintains compatibility with existing event sourcing system
 */

export interface DocumentNode {
  type: string;
  attrs?: Record<string, any>;
  content?: DocumentNode[];
  marks?: Mark[];
  text?: string;
}

export interface Mark {
  type: string;
  attrs?: Record<string, any>;
}

export interface DocumentSchema {
  nodes: Record<string, NodeSpec>;
  marks: Record<string, MarkSpec>;
}

export interface NodeSpec {
  content?: string;
  marks?: string;
  group?: string;
  inline?: boolean;
  atom?: boolean;
  attrs?: Record<string, any>;
}

export interface MarkSpec {
  attrs?: Record<string, any>;
  inclusive?: boolean;
  excludes?: string;
  group?: string;
}

/**
 * Basic document schema compatible with markdown and HTML
 */
export const DEFAULT_SCHEMA: DocumentSchema = {
  nodes: {
    doc: { content: "block+" },
    paragraph: { content: "inline*", group: "block" },
    text: { group: "inline" },
    heading: { 
      content: "inline*", 
      group: "block",
      attrs: { level: { default: 1 } }
    },
    code_block: { content: "text*", group: "block", marks: "" },
    blockquote: { content: "block+", group: "block" },
    horizontal_rule: { group: "block", atom: true },
    bullet_list: { content: "list_item+", group: "block" },
    ordered_list: { content: "list_item+", group: "block" },
    list_item: { content: "paragraph block*" },
    hard_break: { inline: true, group: "inline", atom: true },
    code: { group: "inline", marks: "" },
    image: { 
      inline: true, 
      group: "inline", 
      atom: true,
      attrs: { src: {}, alt: { default: null }, title: { default: null } }
    },
    link: { 
      inline: true, 
      group: "inline",
      attrs: { href: {}, title: { default: null } }
    }
  },
  marks: {
    strong: {},
    em: {},
    code: { excludes: "_" },
    strikethrough: {},
    underline: {}
  }
};

export class DocumentNodeManager {
  private schema: DocumentSchema;

  constructor(schema: DocumentSchema = DEFAULT_SCHEMA) {
    this.schema = schema;
  }

  /**
   * EMERGENCY FIX: Parse markdown string into structured nodes
   */
  parseMarkdownToNodes(markdown: string): DocumentNode {
    const lines = markdown.split('\n');
    const nodes: DocumentNode[] = [];
    let currentNode: DocumentNode | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed === '') {
        if (currentNode) {
          nodes.push(currentNode);
          currentNode = null;
        }
        continue;
      }

      // Headers
      const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        if (currentNode) {
          nodes.push(currentNode);
        }
        currentNode = {
          type: 'heading',
          attrs: { level: headerMatch[1].length },
          content: this.parseInlineContent(headerMatch[2])
        };
        continue;
      }

      // Code blocks
      if (trimmed.startsWith('```')) {
        if (currentNode?.type === 'code_block') {
          // End code block
          nodes.push(currentNode);
          currentNode = null;
        } else {
          // Start code block
          if (currentNode) {
            nodes.push(currentNode);
          }
          currentNode = {
            type: 'code_block',
            content: []
          };
        }
        continue;
      }

      // Inside code block
      if (currentNode?.type === 'code_block') {
        currentNode.content?.push({
          type: 'text',
          text: line
        });
        continue;
      }

      // Blockquotes
      if (trimmed.startsWith('> ')) {
        if (currentNode?.type !== 'blockquote') {
          if (currentNode) {
            nodes.push(currentNode);
          }
          currentNode = {
            type: 'blockquote',
            content: []
          };
        }
        currentNode.content?.push({
          type: 'paragraph',
          content: this.parseInlineContent(trimmed.substring(2))
        });
        continue;
      }

      // Lists
      const bulletMatch = trimmed.match(/^[-*+]\s+(.+)$/);
      const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
      
      if (bulletMatch) {
        if (currentNode?.type !== 'bullet_list') {
          if (currentNode) {
            nodes.push(currentNode);
          }
          currentNode = {
            type: 'bullet_list',
            content: []
          };
        }
        currentNode.content?.push({
          type: 'list_item',
          content: [{
            type: 'paragraph',
            content: this.parseInlineContent(bulletMatch[1])
          }]
        });
        continue;
      }

      if (orderedMatch) {
        if (currentNode?.type !== 'ordered_list') {
          if (currentNode) {
            nodes.push(currentNode);
          }
          currentNode = {
            type: 'ordered_list',
            content: []
          };
        }
        currentNode.content?.push({
          type: 'list_item',
          content: [{
            type: 'paragraph',
            content: this.parseInlineContent(orderedMatch[1])
          }]
        });
        continue;
      }

      // Horizontal rule
      if (trimmed.match(/^[-*_]{3,}$/)) {
        if (currentNode) {
          nodes.push(currentNode);
          currentNode = null;
        }
        nodes.push({ type: 'horizontal_rule' });
        continue;
      }

      // Regular paragraph
      if (currentNode?.type !== 'paragraph') {
        if (currentNode) {
          nodes.push(currentNode);
        }
        currentNode = {
          type: 'paragraph',
          content: []
        };
      }

      const inlineContent = this.parseInlineContent(trimmed);
      if (currentNode.content) {
        currentNode.content.push(...inlineContent);
      }
    }

    if (currentNode) {
      nodes.push(currentNode);
    }

    return {
      type: 'doc',
      content: nodes
    };
  }

  /**
   * Parse inline content with marks (bold, italic, etc.)
   */
  private parseInlineContent(text: string): DocumentNode[] {
    const nodes: DocumentNode[] = [];
    let currentPos = 0;

    // Simple regex-based parsing for emergency fix
    const patterns = [
      { regex: /\*\*(.*?)\*\*/g, mark: 'strong' },
      { regex: /\*(.*?)\*/g, mark: 'em' },
      { regex: /`(.*?)`/g, mark: 'code' },
      { regex: /~~(.*?)~~/g, mark: 'strikethrough' }
    ];

    let matches: Array<{ start: number; end: number; content: string; mark: string }> = [];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          content: match[1],
          mark: pattern.mark
        });
      }
    });

    // Sort matches by position
    matches = matches.sort((a, b) => a.start - b.start);

    matches.forEach(match => {
      // Add text before match
      if (currentPos < match.start) {
        const beforeText = text.substring(currentPos, match.start);
        if (beforeText) {
          nodes.push({ type: 'text', text: beforeText });
        }
      }

      // Add marked text
      nodes.push({
        type: 'text',
        text: match.content,
        marks: [{ type: match.mark }]
      });

      currentPos = match.end;
    });

    // Add remaining text
    if (currentPos < text.length) {
      const remainingText = text.substring(currentPos);
      if (remainingText) {
        nodes.push({ type: 'text', text: remainingText });
      }
    }

    // If no matches found, return plain text
    if (nodes.length === 0) {
      nodes.push({ type: 'text', text });
    }

    return nodes;
  }

  /**
   * EMERGENCY FIX: Convert nodes back to markdown for compatibility
   */
  nodesToMarkdown(doc: DocumentNode): string {
    if (doc.type !== 'doc' || !doc.content) {
      return '';
    }

    return doc.content.map(node => this.nodeToMarkdown(node)).join('\n\n');
  }

  private nodeToMarkdown(node: DocumentNode): string {
    switch (node.type) {
      case 'paragraph':
        return node.content ? node.content.map(n => this.inlineNodeToMarkdown(n)).join('') : '';
      
      case 'heading':
        const level = node.attrs?.level || 1;
        const headingText = node.content ? node.content.map(n => this.inlineNodeToMarkdown(n)).join('') : '';
        return '#'.repeat(level) + ' ' + headingText;
      
      case 'code_block':
        const codeContent = node.content ? node.content.map(n => n.text || '').join('\n') : '';
        return '```\n' + codeContent + '\n```';
      
      case 'blockquote':
        return node.content ? node.content.map(n => '> ' + this.nodeToMarkdown(n)).join('\n') : '';
      
      case 'bullet_list':
        return node.content ? node.content.map(n => this.listItemToMarkdown(n, '- ')).join('\n') : '';
      
      case 'ordered_list':
        return node.content ? node.content.map((n, i) => this.listItemToMarkdown(n, `${i + 1}. `)).join('\n') : '';
      
      case 'horizontal_rule':
        return '---';
      
      default:
        return '';
    }
  }

  private listItemToMarkdown(node: DocumentNode, prefix: string): string {
    if (node.type !== 'list_item' || !node.content) {
      return '';
    }
    
    const content = node.content.map(n => this.nodeToMarkdown(n)).join('\n');
    return prefix + content;
  }

  private inlineNodeToMarkdown(node: DocumentNode): string {
    if (node.type !== 'text') {
      return '';
    }

    let text = node.text || '';
    
    if (node.marks) {
      node.marks.forEach(mark => {
        switch (mark.type) {
          case 'strong':
            text = `**${text}**`;
            break;
          case 'em':
            text = `*${text}*`;
            break;
          case 'code':
            text = `\`${text}\``;
            break;
          case 'strikethrough':
            text = `~~${text}~~`;
            break;
        }
      });
    }

    return text;
  }

  /**
   * EMERGENCY FIX: Path-based node operations for updates
   */
  getNodeAtPath(doc: DocumentNode, path: number[]): DocumentNode | null {
    let current = doc;
    
    for (const index of path) {
      if (!current.content || !current.content[index]) {
        return null;
      }
      current = current.content[index];
    }
    
    return current;
  }

  updateNodeAtPath(doc: DocumentNode, path: number[], updater: (node: DocumentNode) => DocumentNode): DocumentNode {
    if (path.length === 0) {
      return updater(doc);
    }

    const newDoc = { ...doc };
    newDoc.content = [...(doc.content || [])];
    
    const [index, ...restPath] = path;
    if (newDoc.content[index]) {
      newDoc.content[index] = this.updateNodeAtPath(newDoc.content[index], restPath, updater);
    }
    
    return newDoc;
  }

  /**
   * EMERGENCY FIX: Append content to document
   */
  appendContent(doc: DocumentNode, newContent: string): DocumentNode {
    const newNodes = this.parseMarkdownToNodes(newContent);
    
    return {
      ...doc,
      content: [...(doc.content || []), ...(newNodes.content || [])]
    };
  }
}
