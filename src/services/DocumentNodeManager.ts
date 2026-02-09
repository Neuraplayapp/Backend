/**
 * EMERGENCY FIX: DocumentNodeManager
 * 
 * Manages structured document nodes similar to Tiptap/Lexical
 * Enables evolution from string-based to node-based document model
 * Maintains compatibility with existing event sourcing system
 */

import { llmService } from './LLMHelper';

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

export const DEFAULT_SCHEMA: DocumentSchema = {
  nodes: {
    doc: { content: "block+" },
    paragraph: { content: "inline*", group: "block" },
    text: { group: "inline" },
    heading: { content: "inline*", group: "block", attrs: { level: { default: 1 } } },
    code_block: { content: "text*", group: "block", marks: "" },
    blockquote: { content: "block+", group: "block" },
    horizontal_rule: { group: "block", atom: true },
    bullet_list: { content: "list_item+", group: "block" },
    ordered_list: { content: "list_item+", group: "block" },
    list_item: { content: "paragraph block*" },
    hard_break: { inline: true, group: "inline", atom: true },
    code: { group: "inline", marks: "" },
    image: { inline: true, group: "inline", atom: true, attrs: { src: {}, alt: { default: null }, title: { default: null } } },
    link: { inline: true, group: "inline", attrs: { href: {}, title: { default: null } } },
  },
  marks: {
    strong: {},
    em: {},
    code: { excludes: "_" },
    strikethrough: {},
    underline: {},
  },
};

export class DocumentNodeManager {
  private schema: DocumentSchema;
  public useLLM: boolean = true;

  constructor(schema: DocumentSchema = DEFAULT_SCHEMA) {
    this.schema = schema;
  }

  // ─────────────────────────────────────────
  // TIER 1: Structural Parsing (No Regex)
  // ─────────────────────────────────────────

  /**
   * Parse header structurally: count leading '#' chars followed by space
   * Replaces: /^(#{1,6})\s+(.+)$/
   */
  parseHeaderStructurally(trimmed: string): { level: number; content: string } | null {
    if (!trimmed || trimmed[0] !== '#') return null;

    let level = 0;
    for (let i = 0; i < trimmed.length && trimmed[i] === '#'; i++) {
      level++;
    }

    if (level === 0 || level > 6) return null;
    if (trimmed.length <= level || trimmed[level] !== ' ') return null;

    const content = trimmed.substring(level + 1).trim();
    if (!content) return null;

    return { level, content };
  }

  /**
   * Parse bullet list item: starts with -, *, or + followed by space
   * Replaces: /^[-*+]\s+(.+)$/
   */
  parseBulletListStructurally(trimmed: string): { content: string } | null {
    if (!trimmed || trimmed.length < 3) return null;

    const firstChar = trimmed[0];
    if (firstChar !== '-' && firstChar !== '*' && firstChar !== '+') return null;
    if (trimmed[1] !== ' ') return null;

    const content = trimmed.substring(2).trim();
    if (!content) return null;

    return { content };
  }

  /**
   * Parse ordered list item: starts with digits followed by ". "
   * Replaces: /^\d+\.\s+(.+)$/
   */
  parseOrderedListStructurally(trimmed: string): { content: string; number: number } | null {
    if (!trimmed) return null;

    let i = 0;
    while (i < trimmed.length && trimmed[i] >= '0' && trimmed[i] <= '9') {
      i++;
    }

    if (i === 0) return null; // no digits
    if (i >= trimmed.length - 1) return null; // no room for ". content"
    if (trimmed[i] !== '.' || trimmed[i + 1] !== ' ') return null;

    const content = trimmed.substring(i + 2).trim();
    if (!content) return null;

    return { content, number: parseInt(trimmed.substring(0, i), 10) };
  }

  /**
   * Check if line is a horizontal rule: 3+ of same char (-, *, _)
   * Replaces: /^[-*_]{3,}$/
   */
  isHorizontalRule(trimmed: string): boolean {
    if (!trimmed || trimmed.length < 3) return false;

    const char = trimmed[0];
    if (char !== '-' && char !== '*' && char !== '_') return false;

    for (let i = 1; i < trimmed.length; i++) {
      if (trimmed[i] !== char) return false;
    }

    return true;
  }

  // ─────────────────────────────────────────
  // Inline Content Parsing (No Regex)
  // ─────────────────────────────────────────

  // Parse inline marks using character-by-character scanning.
  // Replaces all 4 inline regex patterns for: strong, em, code, strikethrough
  private parseInlineContent(text: string): DocumentNode[] {
    if (!text) return [{ type: 'text', text: '' }];

    const nodes: DocumentNode[] = [];
    let i = 0;
    let plainText = '';

    const flushPlainText = () => {
      if (plainText) {
        nodes.push({ type: 'text', text: plainText });
        plainText = '';
      }
    };

    while (i < text.length) {
      // Check for ** (strong)
      if (text[i] === '*' && i + 1 < text.length && text[i + 1] === '*') {
        const end = this.findClosingDelimiter(text, i + 2, '**');
        if (end !== -1) {
          flushPlainText();
          nodes.push({
            type: 'text',
            text: text.substring(i + 2, end),
            marks: [{ type: 'strong' }],
          });
          i = end + 2;
          continue;
        }
      }

      // Check for ~~ (strikethrough)
      if (text[i] === '~' && i + 1 < text.length && text[i + 1] === '~') {
        const end = this.findClosingDelimiter(text, i + 2, '~~');
        if (end !== -1) {
          flushPlainText();
          nodes.push({
            type: 'text',
            text: text.substring(i + 2, end),
            marks: [{ type: 'strikethrough' }],
          });
          i = end + 2;
          continue;
        }
      }

      // Check for * (em) — only if not **
      if (text[i] === '*' && !(i + 1 < text.length && text[i + 1] === '*')) {
        const end = this.findClosingDelimiter(text, i + 1, '*');
        if (end !== -1) {
          flushPlainText();
          nodes.push({
            type: 'text',
            text: text.substring(i + 1, end),
            marks: [{ type: 'em' }],
          });
          i = end + 1;
          continue;
        }
      }

      // Check for ` (code)
      if (text[i] === '`') {
        const end = this.findClosingDelimiter(text, i + 1, '`');
        if (end !== -1) {
          flushPlainText();
          nodes.push({
            type: 'text',
            text: text.substring(i + 1, end),
            marks: [{ type: 'code' }],
          });
          i = end + 1;
          continue;
        }
      }

      // Regular character
      plainText += text[i];
      i++;
    }

    flushPlainText();

    if (nodes.length === 0) {
      return [{ type: 'text', text }];
    }

    return nodes;
  }

  /**
   * Find closing delimiter starting from position
   */
  private findClosingDelimiter(text: string, start: number, delimiter: string): number {
    const len = delimiter.length;
    for (let i = start; i <= text.length - len; i++) {
      if (text.substring(i, i + len) === delimiter) {
        return i;
      }
    }
    return -1;
  }

  // ─────────────────────────────────────────
  // Main Parser (Zero Regex)
  // ─────────────────────────────────────────

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

      // Headers (structural)
      const headerResult = this.parseHeaderStructurally(trimmed);
      if (headerResult) {
        if (currentNode) nodes.push(currentNode);
        currentNode = {
          type: 'heading',
          attrs: { level: headerResult.level },
          content: this.parseInlineContent(headerResult.content),
        };
        continue;
      }

      // Code blocks (structural — starts with ```)
      if (trimmed.length >= 3 && trimmed[0] === '`' && trimmed[1] === '`' && trimmed[2] === '`') {
        if (currentNode?.type === 'code_block') {
          nodes.push(currentNode);
          currentNode = null;
        } else {
          if (currentNode) nodes.push(currentNode);
          currentNode = { type: 'code_block', content: [] };
        }
        continue;
      }

      // Inside code block
      if (currentNode?.type === 'code_block') {
        currentNode.content?.push({ type: 'text', text: line });
        continue;
      }

      // Blockquotes (structural — starts with "> ")
      if (trimmed.length >= 2 && trimmed[0] === '>' && trimmed[1] === ' ') {
        if (currentNode?.type !== 'blockquote') {
          if (currentNode) nodes.push(currentNode);
          currentNode = { type: 'blockquote', content: [] };
        }
        currentNode.content?.push({
          type: 'paragraph',
          content: this.parseInlineContent(trimmed.substring(2)),
        });
        continue;
      }

      // Bullet lists (structural)
      const bulletResult = this.parseBulletListStructurally(trimmed);
      if (bulletResult) {
        if (currentNode?.type !== 'bullet_list') {
          if (currentNode) nodes.push(currentNode);
          currentNode = { type: 'bullet_list', content: [] };
        }
        currentNode.content?.push({
          type: 'list_item',
          content: [{ type: 'paragraph', content: this.parseInlineContent(bulletResult.content) }],
        });
        continue;
      }

      // Ordered lists (structural)
      const orderedResult = this.parseOrderedListStructurally(trimmed);
      if (orderedResult) {
        if (currentNode?.type !== 'ordered_list') {
          if (currentNode) nodes.push(currentNode);
          currentNode = { type: 'ordered_list', content: [] };
        }
        currentNode.content?.push({
          type: 'list_item',
          content: [{ type: 'paragraph', content: this.parseInlineContent(orderedResult.content) }],
        });
        continue;
      }

      // Horizontal rule (structural)
      if (this.isHorizontalRule(trimmed)) {
        if (currentNode) {
          nodes.push(currentNode);
          currentNode = null;
        }
        nodes.push({ type: 'horizontal_rule' });
        continue;
      }

      // Regular paragraph
      if (currentNode?.type !== 'paragraph') {
        if (currentNode) nodes.push(currentNode);
        currentNode = { type: 'paragraph', content: [] };
      }
      const inlineContent = this.parseInlineContent(trimmed);
      if (currentNode.content) {
        currentNode.content.push(...inlineContent);
      }
    }

    if (currentNode) nodes.push(currentNode);

    return { type: 'doc', content: nodes };
  }

  // ─────────────────────────────────────────
  // Node → Markdown (unchanged, no regex needed)
  // ─────────────────────────────────────────

  nodesToMarkdown(doc: DocumentNode): string {
    if (doc.type !== 'doc' || !doc.content) return '';
    return doc.content.map(node => this.nodeToMarkdown(node)).join('\n\n');
  }

  private nodeToMarkdown(node: DocumentNode): string {
    switch (node.type) {
      case 'paragraph':
        return node.content ? node.content.map(n => this.inlineNodeToMarkdown(n)).join('') : '';
      case 'heading': {
        const level = node.attrs?.level || 1;
        const text = node.content ? node.content.map(n => this.inlineNodeToMarkdown(n)).join('') : '';
        return '#'.repeat(level) + ' ' + text;
      }
      case 'code_block': {
        const code = node.content ? node.content.map(n => n.text || '').join('\n') : '';
        return '```\n' + code + '\n```';
      }
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
    if (node.type !== 'list_item' || !node.content) return '';
    return prefix + node.content.map(n => this.nodeToMarkdown(n)).join('\n');
  }

  private inlineNodeToMarkdown(node: DocumentNode): string {
    if (node.type !== 'text') return '';
    let text = node.text || '';
    if (node.marks) {
      node.marks.forEach(mark => {
        switch (mark.type) {
          case 'strong': text = `**${text}**`; break;
          case 'em': text = `*${text}*`; break;
          case 'code': text = `\`${text}\``; break;
          case 'strikethrough': text = `~~${text}~~`; break;
        }
      });
    }
    return text;
  }

  // ─────────────────────────────────────────
  // Path-based operations (no regex needed)
  // ─────────────────────────────────────────

  getNodeAtPath(doc: DocumentNode, path: number[]): DocumentNode | null {
    let current = doc;
    for (const index of path) {
      if (!current.content || !current.content[index]) return null;
      current = current.content[index];
    }
    return current;
  }

  updateNodeAtPath(doc: DocumentNode, path: number[], updater: (node: DocumentNode) => DocumentNode): DocumentNode {
    if (path.length === 0) return updater(doc);
    const newDoc = { ...doc, content: [...(doc.content || [])] };
    const [index, ...restPath] = path;
    if (newDoc.content[index]) {
      newDoc.content[index] = this.updateNodeAtPath(newDoc.content[index], restPath, updater);
    }
    return newDoc;
  }

  appendContent(doc: DocumentNode, newContent: string): DocumentNode {
    const newNodes = this.parseMarkdownToNodes(newContent);
    return { ...doc, content: [...(doc.content || []), ...(newNodes.content || [])] };
  }
}