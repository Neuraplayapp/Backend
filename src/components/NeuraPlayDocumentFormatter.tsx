import React, { useEffect, useState, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';

// Checkbox component for interactive checkboxes - FIXED: Use unique key and proper state management
const CheckboxComponent: React.FC<{ initialChecked: boolean; id: string }> = ({ initialChecked, id }) => {
  const [isChecked, setIsChecked] = useState(initialChecked);
  
  return (
    <span className="inline-flex items-center">
      <input
        id={id}
        type="checkbox"
        checked={isChecked}
        onChange={(e) => setIsChecked(e.target.checked)}
        style={{
          cursor: 'pointer',
          width: '16px',
          height: '16px',
          accentColor: '#8B5CF6',
          marginRight: '4px'
        }}
        className="inline-block"
      />
    </span>
  );
};

/**
 * NeuraPlay Advanced Document Formatter
 * Swedish-inspired professional document system integrated with existing design
 * Seamlessly works with existing typewriter and maintains current functionality
 */

// ============================================================================
// DOCUMENT ELEMENT TYPES
// ============================================================================

type DocumentElement = 
  | HeaderElement 
  | ParagraphElement 
  | ListElement 
  | TableElement 
  | QuoteElement 
  | CodeElement
  | DividerElement
  | SpacerElement
  | InteractiveCardElement;

interface HeaderElement {
  type: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  content: string;
  align?: 'left' | 'center' | 'right';
  marginTop?: number;
  marginBottom?: number;
}

interface ParagraphElement {
  type: 'paragraph';
  content: string;
  indent?: boolean;
  doubleIndent?: boolean;
  align?: 'left' | 'center' | 'right' | 'justify';
  dropCap?: boolean;
  isItalic?: boolean; // For Notes sections
}

interface ListElement {
  type: 'list';
  style: 'bullet' | 'number' | 'letter' | 'roman' | 'dash' | 'arrow';
  items: (string | ListElement)[];
  indent?: number;
}

interface TableElement {
  type: 'table';
  headers?: string[];
  rows: string[][];
  borderStyle?: 'none' | 'minimal' | 'full' | 'neuraplay';
  cellPadding?: number;
  alternateRows?: boolean;
}

interface QuoteElement {
  type: 'quote';
  content: string;
  author?: string;
  style?: 'block' | 'inline' | 'pullquote';
}

interface CodeElement {
  type: 'code';
  content: string;
  language?: string;
  lineNumbers?: boolean;
}

interface DividerElement {
  type: 'divider';
  style?: 'line' | 'dots' | 'neuraplay' | 'space';
  width?: number;
}

interface SpacerElement {
  type: 'spacer';
  height: number;
}

interface InteractiveCardElement {
  type: 'card';
  title: string;
  content: string;
  metric?: string | number;
  trend?: 'up' | 'down' | 'neutral';
  action?: () => void;
  style?: 'minimal' | 'bordered' | 'elevated';
}

// ============================================================================
// NEURAPLAY DESIGN SYSTEM (CSS Variables + Theme Integration)
// ============================================================================

class NeuraPlayDesignSystem {
  // Color palette with explicit light/dark mode values
  static readonly colors = {
    // Primary text colors
    text: {
      primary: '#1e293b',
      secondary: '#64748b',
      tertiary: '#94a3b8',
      inverse: '#ffffff'
    },
    // Background colors - LIGHT MODE
    background: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
      accent: '#e0f2fe'
    },
    // Background colors - DARK MODE
    backgroundDark: {
      primary: '#0f172a',
      secondary: '#1e293b',
      tertiary: '#334155',
      accent: '#1e3a5f'
    },
    // Accent colors from existing NeuraPlay theme
    accent: {
      primary: '#8b5cf6', // Purple from theme
      secondary: '#a855f7',
      tertiary: '#c084fc',
      blue: '#3b82f6',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444'
    },
    // UI colors - LIGHT MODE
    ui: {
      border: '#e2e8f0',
      divider: '#cbd5e1',
      shadow: 'rgba(0, 0, 0, 0.06)'
    },
    // UI colors - DARK MODE
    uiDark: {
      border: '#475569',
      divider: '#64748b',
      shadow: 'rgba(0, 0, 0, 0.3)'
    }
  };

  // Typography scale using refined design principles
  static readonly typography = {
    h1: { size: 48, weight: 700, spacing: -0.02, lineHeight: 1.2 },
    h2: { size: 36, weight: 600, spacing: -0.01, lineHeight: 1.3 },
    h3: { size: 27, weight: 500, spacing: 0, lineHeight: 1.4 },
    h4: { size: 20, weight: 500, spacing: 0.01, lineHeight: 1.5 },
    h5: { size: 16, weight: 600, spacing: 0.02, lineHeight: 1.6 },
    h6: { size: 14, weight: 600, spacing: 0.03, lineHeight: 1.6 },
    body: { size: 16, weight: 400, spacing: 0, lineHeight: 1.618 },
    small: { size: 14, weight: 400, spacing: 0.01, lineHeight: 1.5 },
    caption: { size: 12, weight: 400, spacing: 0.02, lineHeight: 1.4 },
    code: { size: 14, weight: 400, spacing: 0, lineHeight: 1.5 }
  };

  // Spacing system using 8px grid
  static readonly spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
    paragraphGap: 24,
    indent: 32,
    doubleIndent: 64,
    sectionGap: 48,
    headerMargin: {
      h1: { top: 64, bottom: 32 },
      h2: { top: 48, bottom: 24 },
      h3: { top: 32, bottom: 16 },
      h4: { top: 24, bottom: 12 },
      h5: { top: 16, bottom: 8 },
      h6: { top: 16, bottom: 8 }
    }
  };
}

// ============================================================================
// MAIN DOCUMENT FORMATTER COMPONENT
// ============================================================================

interface NeuraPlayDocumentFormatterProps {
  content: string;
  isTyping?: boolean;
  typewriterSpeed?: number;
  enableAdvancedFormatting?: boolean;
  className?: string;
  onComplete?: () => void;
}

const NeuraPlayDocumentFormatter: React.FC<NeuraPlayDocumentFormatterProps> = ({
  content,
  isTyping = false,
  enableAdvancedFormatting = true,
  className = ''
}) => {
  const { isDarkMode } = useTheme();

  // Add CSS for header sizes with !important and rendering optimizations
  useEffect(() => {
    const styleId = 'neuraplay-header-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .neuraplay-h1 { font-size: 48px !important; }
        .neuraplay-h2 { font-size: 36px !important; }
        .neuraplay-h3 { font-size: 27px !important; }
        .neuraplay-h4 { font-size: 20px !important; }
        .neuraplay-h5 { font-size: 16px !important; }
        .neuraplay-h6 { font-size: 14px !important; }
        
        /* Prevent rendering artifacts during PDF export */
        .neuraplay-document-formatter {
          transform: translateZ(0);
          backface-visibility: hidden;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        /* Optimize table rendering */
        .neuraplay-document-formatter table {
          border-collapse: separate;
          border-spacing: 0;
        }
        
        /* Prevent text rendering issues */
        .neuraplay-document-formatter * {
          text-rendering: optimizeLegibility;
        }
      `;
      document.head.appendChild(style);
    }
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle && existingStyle.parentNode) {
        existingStyle.parentNode.removeChild(existingStyle);
      }
    };
  }, []);
  const [displayedText, setDisplayedText] = useState('');
  const [isTypingState, setIsTypingState] = useState(isTyping);
  const [elements, setElements] = useState<DocumentElement[]>([]);
  
  // Fonts from existing system
  const fonts = {
    primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    secondary: 'Georgia, "Times New Roman", serif',
    mono: 'Monaco, Consolas, "Courier New", monospace'
  };

  // ============================================================================
  // TYPEWRITER INTEGRATION (Compatible with existing system)
  // ============================================================================

  // Don't handle typewriter here if parent is already doing it
  useEffect(() => {
    // If parent is handling typewriter, just display the content as-is
    setDisplayedText(content);
  }, [content]);

  // Just track typing state from parent
  useEffect(() => {
    setIsTypingState(isTyping);
  }, [isTyping]);

  // ============================================================================
  // DOCUMENT PARSING AND RENDERING
  // ============================================================================

  const parseDocument = useCallback((text: string): DocumentElement[] => {
    const lines = text.split('\n');
    const parsedElements: DocumentElement[] = [];
    
    let i = 0;
    let inNotesSection = false; // Track if we're in a Notes section
    
    while (i < lines.length) {
      const line = lines[i].trim();
      
      if (!line) {
        parsedElements.push({ type: 'spacer', height: NeuraPlayDesignSystem.spacing.sm });
        i++;
        continue;
      }

      // Headers - DEFENSIVE: Check for ## at start of line
      // 🔧 FIXED: Also match headers without space (##Heading) to prevent ## from showing in text
      const headerMatch = line.match(/^(#{1,6})\s*(.+)$/);
      if (headerMatch) {
        const level = Math.min(headerMatch[1].length, 6);
        const headerText = headerMatch[2].trim();
        
        // Check if this is a Notes section header
        inNotesSection = headerText.toLowerCase().includes('notes');
        
        parsedElements.push({
          type: `h${level}` as any,
          content: headerText
        });
        i++;
        continue;
      }

      // Dividers (---, ***, ___)
      if (line.match(/^[-*_]{3,}$/)) {
        parsedElements.push({
          type: 'divider',
          style: 'line'
        });
        i++;
        continue;
      }

      // Code blocks
      if (line.startsWith('```')) {
        const language = line.substring(3).trim();
        let codeContent = '';
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeContent += lines[i] + '\n';
          i++;
        }
        parsedElements.push({
          type: 'code',
          content: codeContent.trim(),
          language: language || 'text'
        });
        i++;
        continue;
      }

      // Tables (simple | syntax)
      if (line.includes('|') && (line.match(/\|/g) || []).length >= 2) {
        const tableLines = [];
        let j = i;
        while (j < lines.length && lines[j].includes('|')) {
          tableLines.push(lines[j]);
          j++;
        }
        
        if (tableLines.length > 0) {
          const headers = tableLines[0].split('|').map(h => h.trim()).filter(h => h);
          const rows = tableLines.slice(1)
            .filter(line => !line.match(/^[\s\|\-]+$/)) // Skip separator rows
            .map(line => line.split('|').map(c => c.trim()).filter(c => c));
          
          if (rows.length > 0) {
            parsedElements.push({
              type: 'table',
              headers,
              rows,
              borderStyle: 'neuraplay',
              alternateRows: true
            });
          }
        }
        i = j;
        continue;
      }

      // Quotes
      if (line.startsWith('> ')) {
        const quoteText = line.substring(2);
        parsedElements.push({
          type: 'quote',
          content: quoteText,
          style: 'block'
        });
        i++;
        continue;
      }

      // Lists
      if (line.match(/^[-*+]\s+/) || line.match(/^\d+\.\s+/)) {
        const isNumbered = line.match(/^\d+\.\s+/);
        const items = [];
        let j = i;
        
        while (j < lines.length) {
          const listLine = lines[j].trim();
          if (isNumbered && listLine.match(/^\d+\.\s+/)) {
            items.push(listLine.replace(/^\d+\.\s+/, ''));
          } else if (!isNumbered && listLine.match(/^[-*+]\s+/)) {
            items.push(listLine.replace(/^[-*+]\s+/, ''));
          } else if (listLine) {
            break;
          }
          j++;
        }
        
        parsedElements.push({
          type: 'list',
          style: isNumbered ? 'number' : 'bullet',
          items
        });
        i = j;
        continue;
      }

      // Regular paragraphs
      // 🔧 FIXED: Strip incomplete markdown syntax that appears during typewriter
      // This prevents ## from showing when heading is partially typed (e.g., "##" or "## He...")
      let paragraphContent = line;
      
      // If line starts with # but isn't a complete header, strip the # symbols
      if (line.match(/^#{1,6}\s*$/) || line.match(/^#{1,6}\s+\w{1,3}$/)) {
        // Incomplete header (just ## or ## He) - skip it during typewriter
        i++;
        continue;
      }
      
      parsedElements.push({
        type: 'paragraph',
        content: paragraphContent,
        isItalic: inNotesSection // Apply italic if in Notes section
      });
      i++;
    }

    return parsedElements;
  }, []);

  // Parse content when it changes
  useEffect(() => {
    if (enableAdvancedFormatting) {
      const textToDisplay = isTypingState ? displayedText : content;
      setElements(parseDocument(textToDisplay));
    }
  }, [displayedText, content, enableAdvancedFormatting, isTypingState, parseDocument]);

  // ============================================================================
  // RENDERING METHODS
  // ============================================================================

  const renderElement = (element: DocumentElement, index: number): JSX.Element => {
    const baseStyle: React.CSSProperties = {
      fontFamily: fonts.primary,
      color: isDarkMode ? NeuraPlayDesignSystem.colors.text.inverse : NeuraPlayDesignSystem.colors.text.primary
    };

    switch (element.type) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        return renderHeader(element, index, baseStyle);
      
      case 'paragraph':
        return renderParagraph(element, index, baseStyle);
      
      case 'list':
        return renderList(element, index, baseStyle);
      
      case 'table':
        return renderTable(element, index, baseStyle);
      
      case 'quote':
        return renderQuote(element, index);
      
      case 'code':
        return renderCode(element, index);
      
      case 'divider':
        return renderDivider(element, index);
      
      case 'spacer':
        return <div key={`spacer-${index}`} style={{ height: element.height }} />;
      
      default:
        return <div key={`unknown-${index}`} />;
    }
  };

  const renderHeader = (element: HeaderElement, index: number, baseStyle: React.CSSProperties): JSX.Element => {
    const level = parseInt(element.type.substring(1));
    const style = NeuraPlayDesignSystem.typography[element.type as keyof typeof NeuraPlayDesignSystem.typography];
    const margin = NeuraPlayDesignSystem.spacing.headerMargin[element.type as keyof typeof NeuraPlayDesignSystem.spacing.headerMargin];

    // Use semantic HTML tags (h1, h2, h3, etc.) for proper rendering
    const Tag = element.type as keyof JSX.IntrinsicElements;
    
    return React.createElement(
      Tag,
      {
        key: `header-${index}`,
        className: `neuraplay-${element.type}`, // Add CSS class for !important font size
        style: {
          ...baseStyle,
          fontSize: `${style.size}px`, // Base font size (overridden by CSS class with !important)
          fontWeight: 700, // ALWAYS BOLD for all headers (h1-h6)
          lineHeight: style.lineHeight,
          marginTop: element.marginTop ?? margin.top,
          marginBottom: element.marginBottom ?? margin.bottom,
          textAlign: element.align || 'left'
        }
      },
      renderInlineFormatting(element.content)
    );
  };

  const renderParagraph = (element: ParagraphElement, index: number, baseStyle: React.CSSProperties): JSX.Element => {
    return (
      <div
        key={`paragraph-${index}`}
        style={{
          ...baseStyle,
          marginBottom: NeuraPlayDesignSystem.spacing.paragraphGap,
          paddingLeft: element.indent ? NeuraPlayDesignSystem.spacing.indent : 
                      element.doubleIndent ? NeuraPlayDesignSystem.spacing.doubleIndent : 0,
          textAlign: element.align || 'left',
          lineHeight: NeuraPlayDesignSystem.typography.body.lineHeight,
          fontStyle: element.isItalic ? 'italic' : 'normal' // Apply italic for Notes sections
        }}
      >
        {renderInlineFormatting(element.content)}
      </div>
    );
  };

  const renderList = (element: ListElement, index: number, baseStyle: React.CSSProperties): JSX.Element => {
    return (
      <div key={`list-${index}`} style={{ marginBottom: NeuraPlayDesignSystem.spacing.md }}>
        {element.items.map((item, itemIndex) => (
          <div
            key={`list-item-${itemIndex}`}
            style={{
              ...baseStyle,
              display: 'flex',
              marginBottom: NeuraPlayDesignSystem.spacing.sm,
              paddingLeft: (element.indent || 0) * NeuraPlayDesignSystem.spacing.indent
            }}
          >
            <span
              style={{
                color: NeuraPlayDesignSystem.colors.accent.primary,
                marginRight: NeuraPlayDesignSystem.spacing.sm,
                fontWeight: 600,
                minWidth: '20px'
              }}
            >
              {getListMarker(element.style, itemIndex)}
            </span>
            <span>{typeof item === 'string' ? renderInlineFormatting(item) : String(item)}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderTable = (element: TableElement, index: number, baseStyle: React.CSSProperties): JSX.Element => {
    // Use explicit dark/light mode colors
    const bgColors = isDarkMode ? NeuraPlayDesignSystem.colors.backgroundDark : NeuraPlayDesignSystem.colors.background;
    const uiColors = isDarkMode ? NeuraPlayDesignSystem.colors.uiDark : NeuraPlayDesignSystem.colors.ui;
    
    return (
      <div
        key={`table-${index}`}
        style={{
          marginBottom: NeuraPlayDesignSystem.spacing.lg,
          border: `1px solid ${uiColors.border}`,
          borderRadius: 8,
          overflow: 'hidden',
          // Prevent rendering artifacts
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          isolation: 'isolate'
        }}
      >
        {/* Headers */}
        {element.headers && (
          <div
            style={{
              display: 'flex',
              backgroundColor: bgColors.tertiary,
              borderBottom: `1px solid ${uiColors.border}`
            }}
          >
            {element.headers.map((header, headerIndex) => (
              <div
                key={`header-${headerIndex}`}
                style={{
                  ...baseStyle,
                  flex: 1,
                  padding: NeuraPlayDesignSystem.spacing.sm,
                  fontWeight: 600,
                  borderRight: headerIndex < element.headers!.length - 1 ? `1px solid ${uiColors.border}` : 'none'
                }}
              >
                {renderInlineFormatting(header, true)}
              </div>
            ))}
          </div>
        )}
        
        {/* Rows */}
        {element.rows.map((row, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            style={{
              display: 'flex',
              backgroundColor: element.alternateRows && rowIndex % 2 === 1 
                ? bgColors.secondary
                : 'transparent'
            }}
          >
            {row.map((cell, cellIndex) => (
              <div
                key={`cell-${cellIndex}`}
                style={{
                  ...baseStyle,
                  flex: 1,
                  padding: NeuraPlayDesignSystem.spacing.sm,
                  borderRight: cellIndex < row.length - 1 ? `1px solid ${uiColors.border}` : 'none',
                  borderBottom: rowIndex < element.rows.length - 1 ? `1px solid ${uiColors.border}` : 'none'
                }}
              >
                {renderInlineFormatting(cell, true)}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  const renderQuote = (element: QuoteElement, index: number): JSX.Element => {
    return (
      <div
        key={`quote-${index}`}
        style={{
          borderLeft: `4px solid ${NeuraPlayDesignSystem.colors.accent.primary}`,
          paddingLeft: NeuraPlayDesignSystem.spacing.md,
          marginLeft: NeuraPlayDesignSystem.spacing.sm,
          marginBottom: NeuraPlayDesignSystem.spacing.lg,
          fontStyle: 'italic',
          color: isDarkMode ? NeuraPlayDesignSystem.colors.text.secondary : NeuraPlayDesignSystem.colors.text.secondary
        }}
      >
        <div>"{element.content}"</div>
        {element.author && (
          <div style={{ marginTop: NeuraPlayDesignSystem.spacing.sm, fontSize: '0.9em' }}>
            — {element.author}
          </div>
        )}
      </div>
    );
  };

  const renderCode = (element: CodeElement, index: number): JSX.Element => {
    const bgColors = isDarkMode ? NeuraPlayDesignSystem.colors.backgroundDark : NeuraPlayDesignSystem.colors.background;
    const uiColors = isDarkMode ? NeuraPlayDesignSystem.colors.uiDark : NeuraPlayDesignSystem.colors.ui;
    
    return (
      <div
        key={`code-${index}`}
        style={{
          backgroundColor: bgColors.tertiary,
          border: `1px solid ${uiColors.border}`,
          borderRadius: 8,
          padding: NeuraPlayDesignSystem.spacing.md,
          marginBottom: NeuraPlayDesignSystem.spacing.lg,
          overflow: 'auto'
        }}
      >
        {element.language && (
          <div
            style={{
              fontSize: '0.8em',
              color: NeuraPlayDesignSystem.colors.text.tertiary,
              marginBottom: NeuraPlayDesignSystem.spacing.sm
            }}
          >
            {element.language}
          </div>
        )}
        <pre
          style={{
            fontFamily: fonts.mono,
            fontSize: NeuraPlayDesignSystem.typography.code.size,
            margin: 0,
            color: isDarkMode ? NeuraPlayDesignSystem.colors.text.inverse : NeuraPlayDesignSystem.colors.text.primary
          }}
        >
          {element.content}
        </pre>
      </div>
    );
  };

  const renderDivider = (element: DividerElement, index: number): JSX.Element => {
    const width = element.width || '100%';
    
    return (
      <div
        key={`divider-${index}`}
        style={{
          display: 'flex',
          justifyContent: 'center',
          margin: `${NeuraPlayDesignSystem.spacing.lg}px 0`
        }}
      >
        {element.style === 'dots' ? (
          <div style={{ display: 'flex', gap: NeuraPlayDesignSystem.spacing.sm }}>
            {[1, 2, 3].map(i => (
              <div
                key={i}
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  backgroundColor: '#8B5CF6' // Purple color
                }}
              />
            ))}
          </div>
        ) : (
          <div
            style={{
              width,
              height: 2, // Make it slightly thicker for visibility
              backgroundColor: '#8B5CF6', // Purple color
              borderRadius: 1 // Slightly rounded edges
            }}
          />
        )}
      </div>
    );
  };

  // Helper functions
  const renderInlineFormatting = (text: string, allowCheckboxes: boolean = false): JSX.Element => {
    const parts = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Interactive checkboxes (only in tables)
      if (allowCheckboxes) {
        const checkboxMatch = remaining.match(/^(.*?)(☐|☑)(.*)/);
        if (checkboxMatch) {
          const [, before, checkbox, after] = checkboxMatch;
          if (before) parts.push(<span key={`text-${key++}`}>{renderInlineFormatting(before, false)}</span>);
          
          const isChecked = checkbox === '☑';
          parts.push(
            <CheckboxComponent
              key={`checkbox-${key++}`}
              id={`checkbox-${Date.now()}-${key}`}
              initialChecked={isChecked}
            />
          );
          remaining = after;
          continue;
        }
      }

      // Bold AND Italic: ***text***
      const boldItalicMatch = remaining.match(/^(.*?)\*\*\*(.+?)\*\*\*(.*)/s);
      if (boldItalicMatch) {
        const [, before, text, after] = boldItalicMatch;
        if (before) parts.push(<span key={`text-${key++}`}>{renderInlineFormatting(before, allowCheckboxes)}</span>);
        parts.push(
          <strong key={`bolditalic-${key++}`} style={{ fontWeight: 700, fontStyle: 'italic' }}>
            {text}
          </strong>
        );
        remaining = after;
        continue;
      }

      // Bold: **text**
      const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)/s);
      if (boldMatch) {
        const [, before, boldText, after] = boldMatch;
        if (before) parts.push(<span key={`text-${key++}`}>{renderInlineFormatting(before, allowCheckboxes)}</span>);
        parts.push(
          <strong key={`bold-${key++}`} style={{ fontWeight: 700 }}>
            {boldText}
          </strong>
        );
        remaining = after;
        continue;
      }

      // Italic: *text* or _text_ (single asterisk/underscore, not double)
      const italicMatch = remaining.match(/^(.*?)(?:\*([^*\s][^*]*?[^*\s]|[^*\s])\*|_([^_\s][^_]*?[^_\s]|[^_\s])_)(.*)/s);
      if (italicMatch) {
        const [, before, italicText1, italicText2, after] = italicMatch;
        const italicText = italicText1 || italicText2;
        if (before) parts.push(<span key={`text-${key++}`}>{renderInlineFormatting(before, allowCheckboxes)}</span>);
        parts.push(
          <em key={`italic-${key++}`} style={{ fontStyle: 'italic' }}>
            {italicText}
          </em>
        );
        remaining = after;
        continue;
      }

      // Code: `text`
      const codeMatch = remaining.match(/^(.*?)`(.*?)`(.*)/);
      if (codeMatch) {
        const [, before, codeText, after] = codeMatch;
        const bgColors = isDarkMode ? NeuraPlayDesignSystem.colors.backgroundDark : NeuraPlayDesignSystem.colors.background;
        if (before) parts.push(<span key={`text-${key++}`}>{renderInlineFormatting(before, allowCheckboxes)}</span>);
        parts.push(
          <code
            key={`code-${key++}`}
            style={{
              backgroundColor: bgColors.tertiary,
              padding: '2px 6px',
              borderRadius: 4,
              fontFamily: fonts.mono,
              fontSize: '0.9em'
            }}
          >
            {codeText}
          </code>
        );
        remaining = after;
        continue;
      }

      // Markdown Links: [text](url)
      const linkMatch = remaining.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)(.*)/s);
      if (linkMatch) {
        const [, before, linkText, linkUrl, after] = linkMatch;
        if (before) parts.push(<span key={`text-${key++}`}>{renderInlineFormatting(before, allowCheckboxes)}</span>);
        parts.push(
          <a
            key={`link-${key++}`}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: isDarkMode ? '#A78BFA' : '#7C3AED',
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
              cursor: 'pointer',
              fontWeight: 500
            }}
            onClick={(e) => {
              e.stopPropagation();
              window.open(linkUrl, '_blank', 'noopener,noreferrer');
            }}
          >
            {linkText}
          </a>
        );
        remaining = after;
        continue;
      }

      // Nothing matched, add remaining text
      parts.push(<span key={`text-${key++}`}>{remaining}</span>);
      break;
    }

    return <>{parts}</>;
  };

  const getListMarker = (style: ListElement['style'], index: number): string => {
    switch (style) {
      case 'number': return `${index + 1}.`;
      case 'letter': return `${String.fromCharCode(97 + index)}.`;
      case 'roman': return `${toRoman(index + 1)}.`;
      case 'dash': return '—';
      case 'arrow': return '→';
      default: return '•';
    }
  };

  const toRoman = (num: number): string => {
    const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
    const syms = ['m', 'cm', 'd', 'cd', 'c', 'xc', 'l', 'xl', 'x', 'ix', 'v', 'iv', 'i'];
    let roman = '';
    for (let i = 0; i < vals.length; i++) {
      while (num >= vals[i]) {
        roman += syms[i];
        num -= vals[i];
      }
    }
    return roman;
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  const textToRender = isTypingState ? displayedText : content;
  const cursorRef = React.useRef<HTMLSpanElement>(null);

  return (
    <div 
      className={`neuraplay-document-formatter ${className}`}
      style={{
        fontFamily: fonts.primary,
        maxWidth: '100%',
        wordWrap: 'break-word'
      }}
    >
      {enableAdvancedFormatting ? (
        <div>
          {elements.map((element, index) => {
            const renderedElement = renderElement(element, index);
            // Attach cursor INLINE after the last element
            if (isTypingState && index === elements.length - 1) {
              return (
                <React.Fragment key={index}>
                  {renderedElement}
                  <span
                    ref={cursorRef}
                    style={{
                      display: 'inline',
                      width: '2px',
                      height: '1.2em',
                      backgroundColor: NeuraPlayDesignSystem.colors.accent.primary,
                      marginLeft: '2px',
                      animation: 'neuraplay-blink 1s infinite',
                      verticalAlign: 'baseline'
                    }}
                  />
                </React.Fragment>
              );
            }
            return renderedElement;
          })}
        </div>
      ) : (
        <div
          style={{
            color: isDarkMode ? NeuraPlayDesignSystem.colors.text.inverse : NeuraPlayDesignSystem.colors.text.primary,
            lineHeight: NeuraPlayDesignSystem.typography.body.lineHeight,
            whiteSpace: 'pre-wrap'
          }}
        >
          {textToRender}
          {isTypingState && (
            <span
              ref={cursorRef}
              style={{
                display: 'inline',
                width: '2px',
                height: '1.2em',
                backgroundColor: NeuraPlayDesignSystem.colors.accent.primary,
                marginLeft: '2px',
                animation: 'neuraplay-blink 1s infinite',
                verticalAlign: 'baseline'
              }}
            />
          )}
        </div>
      )}
      
      <style>{`
        @keyframes neuraplay-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default NeuraPlayDocumentFormatter;
