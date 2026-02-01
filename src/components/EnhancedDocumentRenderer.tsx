/**
 * EMERGENCY FIX: EnhancedDocumentRenderer
 * 
 * Replaces NeuraPlayDocumentFormatter with Tiptap-level performance
 * Uses structured nodes for better efficiency and extensibility
 * Maintains backwards compatibility with string-based content
 * Keeps existing typewriter effects
 */

import React, { useState, useEffect, useMemo } from 'react';
import { DocumentNodeManager, DocumentNode } from '../services/DocumentNodeManager';

interface EnhancedDocumentRendererProps {
  content: string;
  isTyping?: boolean;
  typewriterSpeed?: number;
  enableAdvancedFormatting?: boolean;
}

interface RenderContext {
  isTyping: boolean;
  currentCharIndex: number;
  totalChars: number;
}

const documentManager = new DocumentNodeManager();

const EnhancedDocumentRenderer: React.FC<EnhancedDocumentRendererProps> = ({
  content,
  isTyping = false,
  typewriterSpeed = 10,
  enableAdvancedFormatting = true
}) => {
  const [displayedCharCount, setDisplayedCharCount] = useState(0);
  const [typewriterComplete, setTypewriterComplete] = useState(!isTyping);

  // Parse content into structured nodes for better performance
  const documentNodes = useMemo(() => {
    try {
      return documentManager.parseMarkdownToNodes(content);
    } catch (error) {
      console.warn('Failed to parse document nodes, falling back to plain text:', error);
      return {
        type: 'doc',
        content: [{
          type: 'paragraph',
          content: [{ type: 'text', text: content }]
        }]
      };
    }
  }, [content]);

  // Calculate total character count for typewriter effect
  const totalCharCount = useMemo(() => {
    return calculateCharCount(documentNodes);
  }, [documentNodes]);

  // Typewriter effect
  useEffect(() => {
    if (!isTyping) {
      setDisplayedCharCount(totalCharCount);
      setTypewriterComplete(true);
      return;
    }

    setTypewriterComplete(false);
    setDisplayedCharCount(0);

    const interval = setInterval(() => {
      setDisplayedCharCount(prev => {
        const next = prev + 1;
        if (next >= totalCharCount) {
          setTypewriterComplete(true);
          clearInterval(interval);
          return totalCharCount;
        }
        return next;
      });
    }, typewriterSpeed);

    return () => clearInterval(interval);
  }, [isTyping, totalCharCount, typewriterSpeed]);

  const renderContext: RenderContext = {
    isTyping,
    currentCharIndex: displayedCharCount,
    totalChars: totalCharCount
  };

  return (
    <div className="enhanced-document-renderer">
      {documentNodes.content?.map((node, index) => (
        <NodeRenderer 
          key={index} 
          node={node} 
          context={renderContext}
          pathIndex={index}
        />
      ))}
      {isTyping && !typewriterComplete && (
        <span className="typewriter-cursor animate-pulse">|</span>
      )}
    </div>
  );
};

/**
 * Character count calculator for typewriter effect
 */
function calculateCharCount(node: DocumentNode): number {
  if (node.type === 'text') {
    return node.text?.length || 0;
  }
  
  if (node.content) {
    return node.content.reduce((total, child) => total + calculateCharCount(child), 0);
  }
  
  return 0;
}

/**
 * Individual node renderer with typewriter support
 */
interface NodeRendererProps {
  node: DocumentNode;
  context: RenderContext;
  pathIndex: number;
  charOffset?: number;
}

const NodeRenderer: React.FC<NodeRendererProps> = ({ 
  node, 
  context, 
  pathIndex,
  charOffset = 0 
}) => {
  const nodeCharCount = calculateCharCount(node);
  const shouldShow = !context.isTyping || charOffset < context.currentCharIndex;
  const visibleCharCount = Math.max(0, Math.min(nodeCharCount, context.currentCharIndex - charOffset));

  if (!shouldShow && context.isTyping) {
    return null;
  }

  switch (node.type) {
    case 'paragraph':
      return (
        <p className="mb-4 leading-relaxed">
          {renderInlineContent(node.content || [], context, charOffset)}
        </p>
      );

    case 'heading':
      const level = node.attrs?.level || 1;
      const HeadingTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;
      const headingClasses = {
        1: 'text-3xl font-bold mb-6 mt-8 text-gray-900 dark:text-white',
        2: 'text-2xl font-bold mb-4 mt-6 text-gray-800 dark:text-gray-100',
        3: 'text-xl font-bold mb-3 mt-5 text-gray-800 dark:text-gray-100',
        4: 'text-lg font-semibold mb-3 mt-4 text-gray-700 dark:text-gray-200',
        5: 'text-base font-semibold mb-2 mt-3 text-gray-700 dark:text-gray-200',
        6: 'text-sm font-semibold mb-2 mt-3 text-gray-600 dark:text-gray-300'
      }[level] || headingClasses[1];

      return (
        <HeadingTag className={headingClasses}>
          {renderInlineContent(node.content || [], context, charOffset)}
        </HeadingTag>
      );

    case 'code_block':
      const codeText = node.content?.map(n => n.text || '').join('\n') || '';
      const visibleCode = context.isTyping ? codeText.substring(0, visibleCharCount) : codeText;
      
      return (
        <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4 overflow-x-auto">
          <code className="text-sm font-mono text-gray-800 dark:text-gray-200">
            {visibleCode}
          </code>
        </pre>
      );

    case 'blockquote':
      return (
        <blockquote className="border-l-4 border-blue-500 pl-4 mb-4 italic text-gray-700 dark:text-gray-300">
          {node.content?.map((child, index) => (
            <NodeRenderer 
              key={index} 
              node={child} 
              context={context} 
              pathIndex={index}
              charOffset={charOffset}
            />
          ))}
        </blockquote>
      );

    case 'bullet_list':
      return (
        <ul className="list-disc list-inside mb-4 space-y-2">
          {node.content?.map((child, index) => (
            <NodeRenderer 
              key={index} 
              node={child} 
              context={context} 
              pathIndex={index}
              charOffset={charOffset}
            />
          ))}
        </ul>
      );

    case 'ordered_list':
      return (
        <ol className="list-decimal list-inside mb-4 space-y-2">
          {node.content?.map((child, index) => (
            <NodeRenderer 
              key={index} 
              node={child} 
              context={context} 
              pathIndex={index}
              charOffset={charOffset}
            />
          ))}
        </ol>
      );

    case 'list_item':
      return (
        <li className="text-gray-700 dark:text-gray-300">
          {node.content?.map((child, index) => (
            <NodeRenderer 
              key={index} 
              node={child} 
              context={context} 
              pathIndex={index}
              charOffset={charOffset}
            />
          ))}
        </li>
      );

    case 'horizontal_rule':
      return <hr className="my-6 border-gray-300 dark:border-gray-600" />;

    case 'hard_break':
      return <br />;

    default:
      return null;
  }
};

/**
 * Render inline content with marks and typewriter effect
 */
function renderInlineContent(
  content: DocumentNode[], 
  context: RenderContext, 
  charOffset: number
): React.ReactNode[] {
  let currentOffset = charOffset;
  
  return content.map((node, index) => {
    const nodeCharCount = calculateCharCount(node);
    const nodeStartOffset = currentOffset;
    const nodeEndOffset = currentOffset + nodeCharCount;
    
    currentOffset += nodeCharCount;

    // Skip if not yet visible in typewriter mode
    if (context.isTyping && nodeStartOffset >= context.currentCharIndex) {
      return null;
    }

    if (node.type === 'text') {
      let text = node.text || '';
      
      // Apply typewriter truncation
      if (context.isTyping && nodeEndOffset > context.currentCharIndex) {
        const visibleChars = context.currentCharIndex - nodeStartOffset;
        text = text.substring(0, visibleChars);
      }

      // Apply marks (formatting)
      let element: React.ReactNode = text;
      
      if (node.marks) {
        node.marks.forEach(mark => {
          switch (mark.type) {
            case 'strong':
              element = <strong key={`strong-${index}`} className="font-bold">{element}</strong>;
              break;
            case 'em':
              element = <em key={`em-${index}`} className="italic">{element}</em>;
              break;
            case 'code':
              element = (
                <code key={`code-${index}`} className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono">
                  {element}
                </code>
              );
              break;
            case 'strikethrough':
              element = <del key={`del-${index}`} className="line-through">{element}</del>;
              break;
            case 'underline':
              element = <u key={`u-${index}`} className="underline">{element}</u>;
              break;
          }
        });
      }

      return <React.Fragment key={index}>{element}</React.Fragment>;
    }

    // Handle nested inline nodes
    return (
      <NodeRenderer 
        key={index} 
        node={node} 
        context={context} 
        pathIndex={index}
        charOffset={nodeStartOffset}
      />
    );
  }).filter(Boolean);
}

export default EnhancedDocumentRenderer;

