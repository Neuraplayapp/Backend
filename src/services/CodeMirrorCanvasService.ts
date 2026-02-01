/**
 * 🎯 CodeMirror Canvas Service
 * 
 * Actual CodeMirror 6 implementation for code canvas.
 * 
 * Features:
 * - Full CodeMirror 6 integration
 * - Language support (JavaScript, Python, HTML, CSS, Markdown, JSON)
 * - Syntax highlighting
 * - Line numbers, autocomplete, linting
 * - Theme integration (light/dark)
 * - Export with syntax preservation
 */

import { EditorState, Extension } from '@codemirror/state';
import { EditorView, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { foldGutter, indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldKeymap } from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint';

// Language support
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';

// Theme
import { oneDark } from '@codemirror/theme-one-dark';

export type SupportedLanguage = 'javascript' | 'typescript' | 'python' | 'html' | 'css' | 'json' | 'markdown' | 'text';

export interface CodeMirrorConfig {
  language: SupportedLanguage;
  theme: 'light' | 'dark';
  readOnly?: boolean;
  lineNumbers?: boolean;
  lineWrapping?: boolean;
  tabSize?: number;
  onChange?: (content: string) => void;
}

export class CodeMirrorCanvasService {
  private editors: Map<string, EditorView> = new Map();
  private configs: Map<string, CodeMirrorConfig> = new Map();

  /**
   * Get language extension for CodeMirror
   */
  private getLanguageExtension(language: SupportedLanguage): Extension | null {
    switch (language) {
      case 'javascript':
      case 'typescript':
        return javascript({ typescript: language === 'typescript' });
      case 'python':
        return python();
      case 'html':
        return html();
      case 'css':
        return css();
      case 'json':
        return json();
      case 'markdown':
        return markdown();
      default:
        return null;
    }
  }

  /**
   * Create base extensions
   */
  private createBaseExtensions(config: CodeMirrorConfig): Extension[] {
    const extensions: Extension[] = [
      history(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        ...lintKeymap
      ])
    ];

    // Line numbers
    if (config.lineNumbers !== false) {
      extensions.push(lineNumbers());
      extensions.push(foldGutter());
    }

    // Line wrapping
    if (config.lineWrapping) {
      extensions.push(EditorView.lineWrapping);
    }

    // Read-only
    if (config.readOnly) {
      extensions.push(EditorState.readOnly.of(true));
    }

    // Tab size
    if (config.tabSize) {
      extensions.push(EditorState.tabSize.of(config.tabSize));
    }

    // Theme
    if (config.theme === 'dark') {
      extensions.push(oneDark);
    }

    // Language support
    const languageExt = this.getLanguageExtension(config.language);
    if (languageExt) {
      extensions.push(languageExt);
    }

    // Change listener
    if (config.onChange) {
      extensions.push(
        EditorView.updateListener.of((update) => {
          if (update.docChanged && config.onChange) {
            config.onChange(update.state.doc.toString());
          }
        })
      );
    }

    return extensions;
  }

  /**
   * Create a CodeMirror editor instance
   */
  createEditor(
    editorId: string,
    container: HTMLElement,
    initialContent: string,
    config: CodeMirrorConfig
  ): EditorView {
    // Clean up existing editor
    if (this.editors.has(editorId)) {
      this.destroyEditor(editorId);
    }

    const extensions = this.createBaseExtensions(config);

    const state = EditorState.create({
      doc: initialContent,
      extensions
    });

    const view = new EditorView({
      state,
      parent: container
    });

    this.editors.set(editorId, view);
    this.configs.set(editorId, config);

    console.log(`[np] codemirror:create ${editorId} lang=${config.language}`);
    return view;
  }

  /**
   * Get editor instance
   */
  getEditor(editorId: string): EditorView | undefined {
    return this.editors.get(editorId);
  }

  /**
   * Update editor content
   */
  setContent(editorId: string, content: string): void {
    const editor = this.editors.get(editorId);
    if (editor) {
      editor.dispatch({
        changes: {
          from: 0,
          to: editor.state.doc.length,
          insert: content
        }
      });
      console.log(`[np] codemirror:set-content ${editorId}`);
    }
  }

  /**
   * Get editor content
   */
  getContent(editorId: string): string {
    const editor = this.editors.get(editorId);
    return editor ? editor.state.doc.toString() : '';
  }

  /**
   * Update language
   */
  setLanguage(editorId: string, language: SupportedLanguage): void {
    const editor = this.editors.get(editorId);
    const config = this.configs.get(editorId);
    
    if (editor && config) {
      config.language = language;
      
      // Recreate editor with new language
      const content = this.getContent(editorId);
      const container = editor.dom.parentElement;
      
      if (container) {
        this.destroyEditor(editorId);
        this.createEditor(editorId, container, content, config);
      }
      
      console.log(`[np] codemirror:set-language ${editorId} -> ${language}`);
    }
  }

  /**
   * Update theme
   */
  setTheme(editorId: string, theme: 'light' | 'dark'): void {
    const editor = this.editors.get(editorId);
    const config = this.configs.get(editorId);
    
    if (editor && config) {
      config.theme = theme;
      
      // Recreate editor with new theme
      const content = this.getContent(editorId);
      const container = editor.dom.parentElement;
      
      if (container) {
        this.destroyEditor(editorId);
        this.createEditor(editorId, container, content, config);
      }
      
      console.log(`[np] codemirror:set-theme ${editorId} -> ${theme}`);
    }
  }

  /**
   * Focus editor
   */
  focus(editorId: string): void {
    const editor = this.editors.get(editorId);
    if (editor) {
      editor.focus();
    }
  }

  /**
   * Detect language from filename or content
   */
  detectLanguage(filename?: string, content?: string): SupportedLanguage {
    if (filename) {
      const ext = filename.split('.').pop()?.toLowerCase();
      switch (ext) {
        case 'js':
        case 'jsx':
        case 'mjs':
          return 'javascript';
        case 'ts':
        case 'tsx':
          return 'typescript';
        case 'py':
        case 'pyw':
          return 'python';
        case 'html':
        case 'htm':
          return 'html';
        case 'css':
          return 'css';
        case 'json':
          return 'json';
        case 'md':
        case 'markdown':
          return 'markdown';
      }
    }

    if (content) {
      const firstLine = content.split('\n')[0].toLowerCase();
      
      // Check shebangs
      if (firstLine.startsWith('#!')) {
        if (firstLine.includes('python')) return 'python';
        if (firstLine.includes('node') || firstLine.includes('javascript')) return 'javascript';
      }

      // Check HTML
      if (content.includes('<!DOCTYPE html>') || content.includes('<html')) {
        return 'html';
      }

      // Check JSON
      if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        try {
          JSON.parse(content);
          return 'json';
        } catch (e) {
          // Not valid JSON
        }
      }

      // Check common patterns
      if (content.includes('def ') && content.includes('import ')) return 'python';
      if (content.includes('function ') && content.includes('var ')) return 'javascript';
      if (content.includes('interface ') && content.includes('type ')) return 'typescript';
    }

    return 'text';
  }

  /**
   * Export code with proper file extension
   */
  exportCode(editorId: string, filename?: string): { filename: string; content: string; language: SupportedLanguage } {
    const content = this.getContent(editorId);
    const config = this.configs.get(editorId);
    const language = config?.language || 'text';
    
    let defaultFilename = `code-${Date.now()}`;
    switch (language) {
      case 'javascript':
        defaultFilename += '.js';
        break;
      case 'typescript':
        defaultFilename += '.ts';
        break;
      case 'python':
        defaultFilename += '.py';
        break;
      case 'html':
        defaultFilename += '.html';
        break;
      case 'css':
        defaultFilename += '.css';
        break;
      case 'json':
        defaultFilename += '.json';
        break;
      case 'markdown':
        defaultFilename += '.md';
        break;
      default:
        defaultFilename += '.txt';
    }

    return {
      filename: filename || defaultFilename,
      content,
      language
    };
  }

  /**
   * Destroy editor instance
   */
  destroyEditor(editorId: string): void {
    const editor = this.editors.get(editorId);
    if (editor) {
      editor.destroy();
      this.editors.delete(editorId);
      this.configs.delete(editorId);
      console.log(`[np] codemirror:destroy ${editorId}`);
    }
  }

  /**
   * Destroy all editors
   */
  destroyAll(): void {
    this.editors.forEach((editor) => {
      editor.destroy();
    });
    this.editors.clear();
    this.configs.clear();
    console.log('[np] codemirror:destroy-all');
  }
}

// Singleton instance
export const codeMirrorCanvasService = new CodeMirrorCanvasService();

