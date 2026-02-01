/**
 * EDUCATIONAL MARKDOWN RENDERER
 * 
 * Purpose-built for learning content with:
 * - Clear typography for readability
 * - Highlighted definitions and key terms
 * - Visual distinction for examples
 * - Callout boxes for tips and warnings
 * - Code blocks with syntax highlighting
 * - Clean, focused educational design
 */

import React from 'react';
import { Lightbulb, BookOpen, AlertCircle, Code, Quote } from 'lucide-react';

// Syntax highlighting for code blocks
const highlightSyntax = (code: string, language: string): React.ReactNode[] => {
  // Keywords for various languages
  const pythonKeywords = ['import', 'from', 'def', 'class', 'return', 'if', 'else', 'elif', 'for', 'while', 'in', 'not', 'and', 'or', 'True', 'False', 'None', 'try', 'except', 'finally', 'with', 'as', 'lambda', 'yield', 'pass', 'break', 'continue', 'raise', 'assert', 'global', 'nonlocal', 'async', 'await'];
  const jsKeywords = ['import', 'export', 'from', 'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'class', 'extends', 'new', 'this', 'super', 'async', 'await', 'true', 'false', 'null', 'undefined', 'typeof', 'instanceof'];
  
  const keywords = language === 'python' || language === 'py' ? pythonKeywords : jsKeywords;
  
  const lines = code.split('\n');
  const elements: React.ReactNode[] = [];
  
  lines.forEach((line, lineIdx) => {
    const lineElements: React.ReactNode[] = [];
    let remaining = line;
    let charIdx = 0;
    
    while (remaining.length > 0) {
      // Comments
      const commentMatch = remaining.match(/^(#.*|\/\/.*)$/);
      if (commentMatch) {
        lineElements.push(
          <span key={`${lineIdx}-${charIdx}`} className="text-gray-500 italic">{commentMatch[0]}</span>
        );
        break;
      }
      
      // Strings (single or double quotes)
      const stringMatch = remaining.match(/^(["'`])(?:\\.|(?!\1)[^\\])*\1/);
      if (stringMatch) {
        lineElements.push(
          <span key={`${lineIdx}-${charIdx++}`} className="text-amber-400">{stringMatch[0]}</span>
        );
        remaining = remaining.slice(stringMatch[0].length);
        continue;
      }
      
      // Numbers
      const numMatch = remaining.match(/^\b\d+\.?\d*\b/);
      if (numMatch) {
        lineElements.push(
          <span key={`${lineIdx}-${charIdx++}`} className="text-orange-400">{numMatch[0]}</span>
        );
        remaining = remaining.slice(numMatch[0].length);
        continue;
      }
      
      // Keywords
      const keywordPattern = new RegExp(`^\\b(${keywords.join('|')})\\b`);
      const keywordMatch = remaining.match(keywordPattern);
      if (keywordMatch) {
        lineElements.push(
          <span key={`${lineIdx}-${charIdx++}`} className="text-purple-400 font-medium">{keywordMatch[0]}</span>
        );
        remaining = remaining.slice(keywordMatch[0].length);
        continue;
      }
      
      // Function calls
      const funcMatch = remaining.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
      if (funcMatch) {
        lineElements.push(
          <span key={`${lineIdx}-${charIdx++}`} className="text-cyan-400">{funcMatch[1]}</span>
        );
        remaining = remaining.slice(funcMatch[1].length);
        continue;
      }
      
      // Operators and punctuation
      const opMatch = remaining.match(/^[=+\-*/<>!&|%^~.,;:(){}\[\]]+/);
      if (opMatch) {
        lineElements.push(
          <span key={`${lineIdx}-${charIdx++}`} className="text-gray-400">{opMatch[0]}</span>
        );
        remaining = remaining.slice(opMatch[0].length);
        continue;
      }
      
      // Identifiers and other text
      const identMatch = remaining.match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
      if (identMatch) {
        lineElements.push(
          <span key={`${lineIdx}-${charIdx++}`} className="text-emerald-400">{identMatch[0]}</span>
        );
        remaining = remaining.slice(identMatch[0].length);
        continue;
      }
      
      // Whitespace and other characters
      const wsMatch = remaining.match(/^\s+/);
      if (wsMatch) {
        lineElements.push(<span key={`${lineIdx}-${charIdx++}`}>{wsMatch[0]}</span>);
        remaining = remaining.slice(wsMatch[0].length);
        continue;
      }
      
      // Single character fallback
      lineElements.push(<span key={`${lineIdx}-${charIdx++}`} className="text-gray-300">{remaining[0]}</span>);
      remaining = remaining.slice(1);
    }
    
    elements.push(
      <div key={`line-${lineIdx}`} className="leading-6">
        {lineElements.length > 0 ? lineElements : '\n'}
      </div>
    );
  });
  
  return elements;
};

interface EducationalMarkdownRendererProps {
  content: string;
  isDarkMode: boolean;
  className?: string;
}

// Parse inline markdown (bold, italic, code, links)
const parseInlineMarkdown = (text: string, isDarkMode: boolean): React.ReactNode[] => {
  const elements: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold: **text** or __text__
    const boldMatch = remaining.match(/^(\*\*|__)(.+?)\1/);
    if (boldMatch) {
      elements.push(
        <strong key={key++} className={`font-bold ${isDarkMode ? 'text-violet-300' : 'text-violet-700'}`}>
          {boldMatch[2]}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic: *text* or _text_
    const italicMatch = remaining.match(/^(\*|_)([^*_]+?)\1/);
    if (italicMatch) {
      elements.push(
        <em key={key++} className={`italic ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
          {italicMatch[2]}
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Inline code: `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      elements.push(
        <code 
          key={key++} 
          className={`px-1.5 py-0.5 mx-0.5 rounded font-mono text-sm font-medium ${
            isDarkMode 
              ? 'bg-slate-800 text-emerald-400 border border-slate-700' 
              : 'bg-slate-100 text-emerald-600 border border-slate-200'
          }`}
        >
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Regular text - find next special character or end
    const nextSpecial = remaining.search(/[*_`]/);
    if (nextSpecial === -1) {
      elements.push(<span key={key++}>{remaining}</span>);
      break;
    } else if (nextSpecial === 0) {
      // Special char at start but didn't match pattern - treat as regular text
      elements.push(<span key={key++}>{remaining[0]}</span>);
      remaining = remaining.slice(1);
    } else {
      elements.push(<span key={key++}>{remaining.slice(0, nextSpecial)}</span>);
      remaining = remaining.slice(nextSpecial);
    }
  }

  return elements;
};

// Detect special callout blocks
const detectCalloutType = (line: string): { type: string; content: string } | null => {
  const patterns = [
    { regex: /^>\s*💡\s*(.+)$/, type: 'tip' },
    { regex: /^>\s*📝\s*(.+)$/, type: 'note' },
    { regex: /^>\s*⚠️\s*(.+)$/, type: 'warning' },
    { regex: /^>\s*📖\s*(.+)$/, type: 'definition' },
    { regex: /^>\s*🔑\s*(.+)$/, type: 'key' },
    { regex: /^>\s*📌\s*(.+)$/, type: 'important' },
    { regex: /^>\s*🎯\s*(.+)$/, type: 'goal' },
    { regex: /^>\s*(.+)$/, type: 'quote' },
  ];

  for (const { regex, type } of patterns) {
    const match = line.match(regex);
    if (match) {
      return { type, content: match[1] };
    }
  }
  return null;
};

/**
 * 🎯 FIX MALFORMED TABLES
 * Detects and fixes tables where each cell is on a separate line:
 * 
 * WRONG:           FIXED:
 * | Term           | Term | Meaning |
 * | Meaning        |------|---------|
 * ------           | Psychology | The study... |
 * | Psychology
 * | The study...
 */
const fixMalformedTables = (content: string): string => {
  const lines = content.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Detect potential malformed table: line starts with | but doesn't end with |
    // AND next line also starts with |
    if (line.startsWith('|') && !line.endsWith('|') && 
        i + 1 < lines.length && lines[i + 1].trim().startsWith('|')) {
      
      // Collect all consecutive single-pipe lines
      const tableCells: string[] = [];
      let j = i;
      
      while (j < lines.length) {
        const currentLine = lines[j].trim();
        
        // Single pipe line (malformed cell)
        if (currentLine.startsWith('|') && !currentLine.endsWith('|') && !currentLine.match(/^\|[-:\s]+$/)) {
          const cellContent = currentLine.substring(1).trim();
          if (cellContent) {
            tableCells.push(cellContent);
          }
          j++;
        }
        // Separator line (------ or |---|)
        else if (currentLine.match(/^[-:\s|]+$/) && currentLine.includes('-')) {
          // Skip separator, we'll add a proper one
          j++;
        }
        // Proper table row - stop collecting
        else if (currentLine.startsWith('|') && currentLine.endsWith('|')) {
          break;
        }
        // Non-table line - stop
        else {
          break;
        }
      }
      
      // If we collected cells, convert to proper table rows
      if (tableCells.length >= 2) {
        // First row is header
        const headerCells = tableCells.slice(0, 2); // Assume 2 columns (Term, Meaning pattern)
        const isKeyTermTable = tableCells[0].toLowerCase().includes('term') || 
                               tableCells[1].toLowerCase().includes('meaning') ||
                               tableCells[1].toLowerCase().includes('definition');
        
        if (isKeyTermTable) {
          // Build proper table
          result.push(`| ${headerCells.join(' | ')} |`);
          result.push(`|${'------|'.repeat(headerCells.length)}`);
          
          // Remaining cells are data rows (pairs)
          for (let k = 2; k < tableCells.length; k += 2) {
            if (k + 1 < tableCells.length) {
              result.push(`| ${tableCells[k]} | ${tableCells[k + 1]} |`);
            } else {
              // Odd cell - just add with empty second column
              result.push(`| ${tableCells[k]} | |`);
            }
          }
        } else {
          // Not a key-term table, just convert to list
          tableCells.forEach(cell => {
            if (cell && !cell.match(/^[-:\s]+$/)) {
              result.push(`- ${cell}`);
            }
          });
        }
        
        i = j;
        continue;
      }
    }
    
    // Regular line - keep as is
    result.push(lines[i]);
    i++;
  }
  
  return result.join('\n');
};

const EducationalMarkdownRenderer: React.FC<EducationalMarkdownRendererProps> = ({
  content,
  isDarkMode,
  className = ''
}) => {
  // 🎯 FIX: Pre-process content to ensure proper newlines for markdown parsing
  // Sometimes LLM outputs everything on one line or without proper spacing
  let normalizedContent = content
    // Fix escaped newlines from JSON
    .replace(/\\n/g, '\n');
  
  // 🎯 FIX MALFORMED TABLES: Detect single-pipe lines and combine them into proper table rows
  // Pattern: Lines like "| Term" followed by "| Meaning" should become "| Term | Meaning |"
  normalizedContent = fixMalformedTables(normalizedContent);
  
  normalizedContent = normalizedContent
    // Add newlines before markdown headings
    .replace(/([^\n])(#{1,6}\s)/g, '$1\n\n$2')
    // Add newlines before markdown tables (lines starting with |)
    .replace(/([^\n])(\|\s*[A-Za-z])/g, '$1\n$2')
    // Add newline after headings if followed by table
    .replace(/(#{1,6}\s[^\n]+)(\|)/g, '$1\n$2')
    // Split semicolon-separated table rows into newlines
    .replace(/;\s*(\|)/g, '\n$1')
    // Ensure table separator rows are on their own line
    .replace(/(\|[-:|\s]+\|)/g, '\n$1\n')
    // 🎯 NEW: Add newlines before numbered lists (1. 2. 3.)
    .replace(/([^\n])(\d+\.\s+\*\*)/g, '$1\n\n$2')
    // 🎯 NEW: Add newlines before bullet points
    .replace(/([^\n])([-*]\s+\*\*)/g, '$1\n$2')
    // 🎯 NEW: Add newlines after bold terms with colons (common in frameworks)
    .replace(/(\*\*[^*]+\*\*\s*[-:])([^\n])/g, '$1\n$2')
    // 🎯 NEW: Split run-on bold terms that should be separate items
    .replace(/(\*\*[^*]+\*\*)(\s*)(\*\*[^*]+\*\*)/g, '$1\n\n$3')
    // Fix colon-separated data that should be tables (e.g., "Term: definition; Term2: def2")
    .replace(/^([^:\n|]+):\s*([^;\n]+)(?:;\s*([^:\n]+):\s*([^;\n]+))+$/gm, (match) => {
      // Convert colon-separated pairs to a simple list if detected
      const pairs = match.split(';').map(p => p.trim());
      if (pairs.length >= 2) {
        return pairs.map(p => `- ${p}`).join('\n');
      }
      return match;
    })
    // Clean up multiple consecutive newlines
    .replace(/\n{3,}/g, '\n\n')
    // Remove any leftover JSON artifacts
    .replace(/^\s*\{|\}\s*$/g, '')
    .replace(/^\s*\[|\]\s*$/g, '')
    .replace(/"content"\s*:\s*"/g, '')
    .replace(/",?\s*"type"\s*:/g, '');

  const lines = normalizedContent.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Empty line - add spacing
    if (!line) {
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
      
      const headingStyles: Record<number, string> = {
        1: `text-2xl font-bold mt-6 mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`,
        2: `text-xl font-bold mt-5 mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'} border-b pb-2 ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`,
        3: `text-lg font-semibold mt-4 mb-2 ${isDarkMode ? 'text-violet-300' : 'text-violet-700'}`,
        4: `text-base font-semibold mt-3 mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`,
        5: `text-sm font-semibold mt-2 mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`,
        6: `text-sm font-medium mt-2 mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`,
      };

      elements.push(
        <HeadingTag key={key++} className={headingStyles[level]}>
          {parseInlineMarkdown(text, isDarkMode)}
        </HeadingTag>
      );
      i++;
      continue;
    }

    // Code blocks
    if (line.startsWith('```')) {
      const language = line.slice(3).trim().toLowerCase();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```

      const codeContent = codeLines.join('\n');

      elements.push(
        <div key={key++} className="my-5 rounded-xl overflow-hidden shadow-lg border border-gray-700/50">
          {/* Code header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 border-b border-gray-700/50">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-gray-300 font-mono uppercase tracking-wide">
                {language || 'code'}
              </span>
            </div>
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
          </div>
          {/* Code content with syntax highlighting */}
          <pre className="p-4 overflow-x-auto bg-slate-900">
            <code className="text-sm font-mono leading-relaxed">
              {highlightSyntax(codeContent, language)}
            </code>
          </pre>
        </div>
      );
      continue;
    }

    // Callout/Quote blocks
    const callout = detectCalloutType(line);
    if (callout) {
      const calloutStyles: Record<string, { bg: string; border: string; icon: React.ReactNode }> = {
        tip: {
          bg: isDarkMode ? 'bg-yellow-500/10' : 'bg-yellow-50',
          border: 'border-yellow-500',
          icon: <Lightbulb className="w-5 h-5 text-yellow-500" />
        },
        note: {
          bg: isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50',
          border: 'border-blue-500',
          icon: <BookOpen className="w-5 h-5 text-blue-500" />
        },
        warning: {
          bg: isDarkMode ? 'bg-red-500/10' : 'bg-red-50',
          border: 'border-red-500',
          icon: <AlertCircle className="w-5 h-5 text-red-500" />
        },
        definition: {
          bg: isDarkMode ? 'bg-violet-500/10' : 'bg-violet-50',
          border: 'border-violet-500',
          icon: <BookOpen className="w-5 h-5 text-violet-500" />
        },
        key: {
          bg: isDarkMode ? 'bg-emerald-500/10' : 'bg-emerald-50',
          border: 'border-emerald-500',
          icon: <Lightbulb className="w-5 h-5 text-emerald-500" />
        },
        important: {
          bg: isDarkMode ? 'bg-orange-500/10' : 'bg-orange-50',
          border: 'border-orange-500',
          icon: <AlertCircle className="w-5 h-5 text-orange-500" />
        },
        goal: {
          bg: isDarkMode ? 'bg-purple-500/10' : 'bg-purple-50',
          border: 'border-purple-500',
          icon: <Lightbulb className="w-5 h-5 text-purple-500" />
        },
        quote: {
          bg: isDarkMode ? 'bg-gray-500/10' : 'bg-gray-50',
          border: 'border-gray-400',
          icon: <Quote className="w-5 h-5 text-gray-400" />
        }
      };

      const style = calloutStyles[callout.type] || calloutStyles.quote;

      elements.push(
        <div 
          key={key++} 
          className={`my-4 p-4 rounded-lg border-l-4 ${style.bg} ${style.border} flex gap-3`}
        >
          <div className="flex-shrink-0 mt-0.5">{style.icon}</div>
          <div className={`flex-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
            {parseInlineMarkdown(callout.content, isDarkMode)}
          </div>
        </div>
      );
      i++;
      continue;
    }

    // Unordered lists
    const ulMatch = line.match(/^[-*•]\s+(.+)$/);
    if (ulMatch) {
      const listItems: string[] = [ulMatch[1]];
      i++;
      while (i < lines.length) {
        const nextLine = lines[i].trim();
        const nextMatch = nextLine.match(/^[-*•]\s+(.+)$/);
        if (nextMatch) {
          listItems.push(nextMatch[1]);
          i++;
        } else {
          break;
        }
      }

      elements.push(
        <ul key={key++} className="my-3 space-y-2">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className={`mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                isDarkMode ? 'bg-violet-400' : 'bg-violet-600'
              }`} />
              <span className={`${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                {parseInlineMarkdown(item, isDarkMode)}
              </span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered lists
    const olMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      const listItems: { num: string; text: string }[] = [{ num: olMatch[1], text: olMatch[2] }];
      i++;
      while (i < lines.length) {
        const nextLine = lines[i].trim();
        const nextMatch = nextLine.match(/^(\d+)\.\s+(.+)$/);
        if (nextMatch) {
          listItems.push({ num: nextMatch[1], text: nextMatch[2] });
          i++;
        } else {
          break;
        }
      }

      elements.push(
        <ol key={key++} className="my-3 space-y-2">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                isDarkMode 
                  ? 'bg-violet-500/20 text-violet-400' 
                  : 'bg-violet-100 text-violet-700'
              }`}>
                {item.num}
              </span>
              <span className={`flex-1 pt-0.5 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                {parseInlineMarkdown(item.text, isDarkMode)}
              </span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Horizontal rule
    if (line.match(/^[-*_]{3,}$/)) {
      elements.push(
        <hr key={key++} className={`my-6 border-t ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`} />
      );
      i++;
      continue;
    }

    // Markdown tables - detect by | at start and end
    if (line.startsWith('|') && line.endsWith('|')) {
      const tableRows: string[][] = [];
      let isHeader = true;
      
      // Collect all table rows
      while (i < lines.length) {
        const currentLine = lines[i].trim();
        if (!currentLine.startsWith('|') || !currentLine.endsWith('|')) break;
        
        // Parse cells from line (split by | and filter empty)
        const cells = currentLine
          .slice(1, -1) // Remove leading/trailing |
          .split('|')
          .map(cell => cell.trim());
        
        // Skip separator row (contains only dashes and colons)
        if (cells.every(c => /^[-:]+$/.test(c))) {
          i++;
          continue;
        }
        
        tableRows.push(cells);
        i++;
      }

      if (tableRows.length > 0) {
        const headerRow = tableRows[0];
        const bodyRows = tableRows.slice(1);

        elements.push(
          <div key={key++} className="my-5 overflow-x-auto rounded-xl">
            <table className={`w-full text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              <thead>
                <tr className={`${isDarkMode ? 'bg-violet-500/20' : 'bg-violet-50'}`}>
                  {headerRow.map((cell, cellIdx) => (
                    <th 
                      key={cellIdx} 
                      className={`px-4 py-3 text-left font-semibold ${
                        isDarkMode ? 'text-violet-300 border-b border-violet-500/30' : 'text-violet-700 border-b border-violet-200'
                      }`}
                    >
                      {parseInlineMarkdown(cell, isDarkMode)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, rowIdx) => (
                  <tr 
                    key={rowIdx} 
                    className={`${
                      rowIdx % 2 === 0 
                        ? isDarkMode ? 'bg-white/5' : 'bg-gray-50/50'
                        : isDarkMode ? 'bg-white/[0.02]' : 'bg-white'
                    } hover:${isDarkMode ? 'bg-white/10' : 'bg-violet-50/50'} transition-colors`}
                  >
                    {row.map((cell, cellIdx) => (
                      <td 
                        key={cellIdx} 
                        className={`px-4 py-3 ${
                          isDarkMode ? 'border-b border-white/10' : 'border-b border-gray-100'
                        } ${cellIdx === 0 ? 'font-medium' : ''}`}
                      >
                        {parseInlineMarkdown(cell, isDarkMode)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // 🆕 Semicolon-separated table format (LLM sometimes outputs this)
    // Format: "Alphabet table with Letter | Name | Sound | Example; A | a | ah | amigo; B | be | beh | bueno; ..."
    const semicolonTableMatch = line.match(/^(.+?)\s*(?:with|:)?\s*([^;]+\|[^;]+);(.+)$/i);
    if (semicolonTableMatch && line.includes(';') && line.includes('|')) {
      // Count pipes and semicolons to verify it's a table
      const pipeCount = (line.match(/\|/g) || []).length;
      const semicolonCount = (line.match(/;/g) || []).length;
      
      // Should have multiple rows (semicolons) with consistent pipes per row
      if (semicolonCount >= 3 && pipeCount >= 6) {
        try {
          // Parse header and rows
          const segments = line.split(';').map(s => s.trim()).filter(s => s.length > 0);
          
          // First segment might be "Alphabet table with Letter | Name | Sound | Example"
          // Or just "Letter | Name | Sound | Example"
          let headerSegment = segments[0];
          const dataSegments = segments.slice(1);
          
          // Remove prefix like "Alphabet table with" or "Vocabulary:"
          const prefixMatch = headerSegment.match(/^(.+?)\s*(?:with|:)\s*(.+)$/i);
          if (prefixMatch) {
            headerSegment = prefixMatch[2];
          }
          
          // Parse header cells
          const headerCells = headerSegment.split('|').map(c => c.trim()).filter(c => c.length > 0);
          
          // Parse data rows
          const dataRows = dataSegments.map(seg => 
            seg.split('|').map(c => c.trim()).filter(c => c.length > 0)
          ).filter(row => row.length === headerCells.length);
          
          if (headerCells.length >= 2 && dataRows.length >= 2) {
            elements.push(
              <div key={key++} className="my-5 overflow-x-auto rounded-xl">
                <table className={`w-full text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  <thead>
                    <tr className={`${isDarkMode ? 'bg-violet-500/20' : 'bg-violet-50'}`}>
                      {headerCells.map((cell, cellIdx) => (
                        <th 
                          key={cellIdx} 
                          className={`px-4 py-3 text-left font-semibold ${
                            isDarkMode ? 'text-violet-300 border-b border-violet-500/30' : 'text-violet-700 border-b border-violet-200'
                          }`}
                        >
                          {cell}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dataRows.map((row, rowIdx) => (
                      <tr 
                        key={rowIdx} 
                        className={`${
                          rowIdx % 2 === 0 
                            ? isDarkMode ? 'bg-white/5' : 'bg-gray-50/50'
                            : isDarkMode ? 'bg-white/[0.02]' : 'bg-white'
                        } hover:${isDarkMode ? 'bg-white/10' : 'bg-violet-50/50'} transition-colors`}
                      >
                        {row.map((cell, cellIdx) => (
                          <td 
                            key={cellIdx} 
                            className={`px-4 py-3 ${
                              isDarkMode ? 'border-b border-white/10' : 'border-b border-gray-100'
                            } ${cellIdx === 0 ? 'font-medium' : ''}`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
            i++;
            continue;
          }
        } catch (e) {
          // Failed to parse as table, fall through to regular paragraph
        }
      }
    }

    // Regular paragraph
    elements.push(
      <p 
        key={key++} 
        className={`my-3 leading-relaxed text-lg ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}
      >
        {parseInlineMarkdown(line, isDarkMode)}
      </p>
    );
    i++;
  }

  return (
    <div className={`educational-markdown ${className}`}>
      {elements}
    </div>
  );
};

export default EducationalMarkdownRenderer;

