/**
 * 🎯 Code Formatter Service
 * 
 * Language-specific code formatting parallel to DocumentFormatter.
 * 
 * Features:
 * - Language-specific formatting
 * - Indentation and bracket matching
 * - Syntax validation
 * - Works with CodeMirror service
 */

export type FormattableLanguage = 'javascript' | 'typescript' | 'python' | 'html' | 'css' | 'json' | 'markdown';

export interface FormatOptions {
  tabSize?: number;
  useTabs?: boolean;
  insertSpaces?: boolean;
  trimTrailingWhitespace?: boolean;
  insertFinalNewline?: boolean;
}

export class CodeFormatterService {
  
  /**
   * Format code based on language
   */
  format(code: string, language: FormattableLanguage, options: FormatOptions = {}): string {
    const {
      tabSize = 2,
      useTabs = false,
      insertSpaces = true,
      trimTrailingWhitespace = true,
      insertFinalNewline = true
    } = options;

    let formatted = code;

    // Apply language-specific formatting
    switch (language) {
      case 'javascript':
      case 'typescript':
        formatted = this.formatJavaScript(code, tabSize, useTabs);
        break;
      case 'python':
        formatted = this.formatPython(code, tabSize);
        break;
      case 'html':
        formatted = this.formatHTML(code, tabSize, useTabs);
        break;
      case 'css':
        formatted = this.formatCSS(code, tabSize, useTabs);
        break;
      case 'json':
        formatted = this.formatJSON(code, tabSize);
        break;
      case 'markdown':
        formatted = this.formatMarkdown(code);
        break;
      default:
        formatted = code;
    }

    // Apply common formatting options
    if (trimTrailingWhitespace) {
      formatted = this.trimTrailingWhitespace(formatted);
    }

    if (insertFinalNewline && !formatted.endsWith('\n')) {
      formatted += '\n';
    }

    return formatted;
  }

  /**
   * Format JavaScript/TypeScript
   */
  private formatJavaScript(code: string, tabSize: number, useTabs: boolean): string {
    const indent = useTabs ? '\t' : ' '.repeat(tabSize);
    let formatted = '';
    let indentLevel = 0;
    let inString = false;
    let stringChar = '';
    let inComment = false;

    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();

      // Skip empty lines
      if (!line) {
        formatted += '\n';
        continue;
      }

      // Handle comments
      if (line.startsWith('//')) {
        formatted += indent.repeat(indentLevel) + line + '\n';
        continue;
      }

      if (line.startsWith('/*')) {
        inComment = true;
      }

      if (inComment) {
        formatted += indent.repeat(indentLevel) + line + '\n';
        if (line.endsWith('*/')) {
          inComment = false;
        }
        continue;
      }

      // Decrease indent for closing braces
      if (line.startsWith('}') || line.startsWith(']') || line.startsWith(')')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      // Add indentation
      formatted += indent.repeat(indentLevel) + line + '\n';

      // Increase indent for opening braces
      if (line.endsWith('{') || line.endsWith('[') || line.endsWith('(')) {
        indentLevel++;
      }

      // Decrease indent if line has closing brace but doesn't start with it
      if ((line.includes('}') || line.includes(']') || line.includes(')')) && 
          !line.startsWith('}') && !line.startsWith(']') && !line.startsWith(')')) {
        const opens = (line.match(/[{[(]/g) || []).length;
        const closes = (line.match(/[}\])]/g) || []).length;
        indentLevel = Math.max(0, indentLevel + opens - closes);
      }
    }

    return formatted;
  }

  /**
   * Format Python
   */
  private formatPython(code: string, tabSize: number): string {
    const indent = ' '.repeat(tabSize);
    let formatted = '';
    let indentLevel = 0;

    const lines = code.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) {
        formatted += '\n';
        continue;
      }

      // Decrease indent for dedent keywords
      if (trimmed.startsWith('else:') || trimmed.startsWith('elif ') || 
          trimmed.startsWith('except ') || trimmed.startsWith('finally:')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      // Add indentation
      formatted += indent.repeat(indentLevel) + trimmed + '\n';

      // Increase indent after colons
      if (trimmed.endsWith(':')) {
        indentLevel++;
      }

      // Detect dedent (line doesn't start with space and previous line had indent)
      if (indentLevel > 0 && !trimmed.startsWith(' ')) {
        const nextLine = lines[lines.indexOf(line) + 1];
        if (nextLine && !nextLine.trim().startsWith(' ')) {
          indentLevel = Math.max(0, indentLevel - 1);
        }
      }
    }

    return formatted;
  }

  /**
   * Format HTML
   */
  private formatHTML(code: string, tabSize: number, useTabs: boolean): string {
    const indent = useTabs ? '\t' : ' '.repeat(tabSize);
    let formatted = '';
    let indentLevel = 0;

    const lines = code.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        formatted += '\n';
        continue;
      }

      // Decrease indent for closing tags
      if (trimmed.startsWith('</')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      formatted += indent.repeat(indentLevel) + trimmed + '\n';

      // Increase indent for opening tags (not self-closing)
      if (trimmed.startsWith('<') && !trimmed.startsWith('</') && 
          !trimmed.endsWith('/>') && !trimmed.includes('</')) {
        indentLevel++;
      }

      // Handle tags that close on the same line
      if (trimmed.includes('</')) {
        const opens = (trimmed.match(/<(?!\/)[\w]+/g) || []).length;
        const closes = (trimmed.match(/<\//g) || []).length;
        indentLevel = Math.max(0, indentLevel + opens - closes);
      }
    }

    return formatted;
  }

  /**
   * Format CSS
   */
  private formatCSS(code: string, tabSize: number, useTabs: boolean): string {
    const indent = useTabs ? '\t' : ' '.repeat(tabSize);
    let formatted = '';
    let indentLevel = 0;

    const lines = code.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        formatted += '\n';
        continue;
      }

      // Decrease indent for closing braces
      if (trimmed.startsWith('}')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      formatted += indent.repeat(indentLevel) + trimmed + '\n';

      // Increase indent for opening braces
      if (trimmed.endsWith('{')) {
        indentLevel++;
      }
    }

    return formatted;
  }

  /**
   * Format JSON
   */
  private formatJSON(code: string, tabSize: number): string {
    try {
      const parsed = JSON.parse(code);
      return JSON.stringify(parsed, null, tabSize);
    } catch (error) {
      console.error('Invalid JSON, returning original:', error);
      return code;
    }
  }

  /**
   * Format Markdown
   */
  private formatMarkdown(code: string): string {
    // Basic markdown formatting
    let formatted = code;

    // Ensure proper spacing around headers
    formatted = formatted.replace(/^(#{1,6})\s*(.+)$/gm, '$1 $2');

    // Ensure proper spacing around lists
    formatted = formatted.replace(/^([*+-])\s+/gm, '$1 ');

    // Ensure blank lines around code blocks
    formatted = formatted.replace(/```/g, '\n```\n');

    return formatted;
  }

  /**
   * Trim trailing whitespace from each line
   */
  private trimTrailingWhitespace(code: string): string {
    return code.split('\n').map(line => line.trimEnd()).join('\n');
  }

  /**
   * Validate syntax (basic checks)
   */
  validate(code: string, language: FormattableLanguage): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (language) {
      case 'json':
        try {
          JSON.parse(code);
        } catch (error: any) {
          errors.push(`Invalid JSON: ${error.message}`);
        }
        break;

      case 'javascript':
      case 'typescript':
        // Basic bracket matching
        const openBrackets = (code.match(/[{[(]/g) || []).length;
        const closeBrackets = (code.match(/[}\])]/g) || []).length;
        if (openBrackets !== closeBrackets) {
          errors.push('Mismatched brackets');
        }
        break;

      case 'python':
        // Check for common Python syntax errors
        if (code.includes('\t') && code.includes('    ')) {
          errors.push('Mixed tabs and spaces');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get recommended tab size for language
   */
  getRecommendedTabSize(language: FormattableLanguage): number {
    switch (language) {
      case 'python':
        return 4;
      case 'html':
      case 'css':
        return 2;
      default:
        return 2;
    }
  }
}

// Singleton instance
export const codeFormatterService = new CodeFormatterService();

