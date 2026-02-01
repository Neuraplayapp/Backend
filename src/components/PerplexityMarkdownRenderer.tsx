/**
 * PERPLEXITY-STYLE MARKDOWN RENDERER
 * 
 * Features:
 * - Professional markdown rendering with citations
 * - Inline source previews
 * - Clean, scannable layout
 * - Citation hover previews
 * - Source reference section
 */

import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ExternalLink, FileText, Eye, ArrowUpRight } from 'lucide-react';
import { PerplexityResponse, CitationSource } from '../services/PerplexityStyleFormatter';

interface PerplexityMarkdownRendererProps {
  response: PerplexityResponse;
  className?: string;
}

const PerplexityMarkdownRenderer: React.FC<PerplexityMarkdownRendererProps> = ({
  response,
  className = ''
}) => {
  const { isDarkMode } = useTheme();
  const [hoveredCitation, setHoveredCitation] = useState<number | null>(null);

  // Process markdown to add citation hover functionality
  const processMarkdownWithCitations = (markdown: string) => {
    return markdown.replace(/\[(\d+)\]/g, (match, citationId) => {
      const id = parseInt(citationId);
      const source = response.sources.find(s => s.id === id);
      if (!source) return match;

      return `<span class="citation-ref" data-citation-id="${id}">[${id}]</span>`;
    });
  };

  // Convert markdown to JSX with proper formatting
  const renderMarkdown = (text: string) => {
    const processedText = processMarkdownWithCitations(text);
    
    // Remove the first ## heading if it exists (typically repeats the query)
    const textWithoutFirstHeading = processedText.replace(/^##\s+[^\n]+\n+/, '');
    
    // Split by sections and render
    const sections = textWithoutFirstHeading.split(/\n## /).map((section, index) => {
      if (index === 0 && !section.startsWith('## ')) {
        return section; // First section without header
      }
      return '## ' + section;
    });

    return sections.map((section, index) => renderSection(section, index));
  };

  const renderSection = (section: string, index: number) => {
    const lines = section.split('\n').filter(line => line.trim());
    if (lines.length === 0) return null;

    return (
      <div key={index} className="mb-6">
        {lines.map((line, lineIndex) => renderLine(line, `${index}-${lineIndex}`))}
      </div>
    );
  };

  const renderLine = (line: string, key: string) => {
    const trimmedLine = line.trim();
    
    // Skip ## headings entirely - they typically repeat the query
    if (trimmedLine.startsWith('## ')) {
      return null;
    }
    
    // Headers - Purple Scandinavian Minimalist Style (### only)
    if (trimmedLine.startsWith('### ')) {
      return (
        <div key={key} className="mb-6">
          <h3 className={`text-lg font-medium mb-4 ${
            isDarkMode ? 'text-purple-300' : 'text-purple-600'
          }`}>
            {renderInlineElements(trimmedLine.substring(4))}
          </h3>
        </div>
      );
    }

    // Bullet points
    if (trimmedLine.startsWith('- ')) {
      return (
        <div key={key} className={`flex items-start gap-3 mb-2 ${
          isDarkMode ? 'text-white/80' : 'text-gray-700'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${
            isDarkMode ? 'bg-blue-300' : 'bg-blue-600'
          }`} />
          <span className="leading-relaxed">
            {renderInlineElements(trimmedLine.substring(2))}
          </span>
        </div>
      );
    }

    // Bold points with **
    if (trimmedLine.includes('**')) {
      return (
        <p key={key} className={`mb-3 leading-relaxed ${
          isDarkMode ? 'text-white/80' : 'text-gray-700'
        }`}>
          {renderInlineElements(trimmedLine)}
        </p>
      );
    }

    // Regular paragraphs
    if (trimmedLine.length > 0) {
      return (
        <p key={key} className={`mb-3 leading-relaxed ${
          isDarkMode ? 'text-white/80' : 'text-gray-700'
        }`}>
          {renderInlineElements(trimmedLine)}
        </p>
      );
    }

    return null;
  };

  const renderInlineElements = (text: string) => {
    // Handle citations with hover
    const parts = text.split(/(<span class="citation-ref" data-citation-id="\d+">\[\d+\]<\/span>)/);
    
    return parts.map((part, index) => {
      // Citation reference
      const citationMatch = part.match(/data-citation-id="(\d+)">(\[\d+\])/);
      if (citationMatch) {
        const citationId = parseInt(citationMatch[1]);
        const source = response.sources.find(s => s.id === citationId);
        
        return (
          <span
            key={index}
            className={`inline-block mx-0.5 px-1.5 py-0.5 rounded text-xs font-medium cursor-pointer transition-all ${
              isDarkMode 
                ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30' 
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
            onMouseEnter={() => setHoveredCitation(citationId)}
            onMouseLeave={() => setHoveredCitation(null)}
            onClick={() => source && window.open(source.url, '_blank')}
          >
            {citationMatch[2]}
            {hoveredCitation === citationId && source && (
              <div className={`absolute z-50 mt-2 p-3 rounded-lg shadow-lg border max-w-sm ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-600 text-white' 
                  : 'bg-white border-gray-200 text-gray-900'
              }`}>
                <div className="font-medium text-sm mb-1">{source.title}</div>
                <div className="text-xs text-gray-500 mb-2">{source.domain}</div>
                <div className="text-xs leading-relaxed">{source.snippet}</div>
              </div>
            )}
          </span>
        );
      }

      // Bold text
      const boldParts = part.split(/(\*\*.*?\*\*)/);
      return boldParts.map((boldPart, boldIndex) => {
        if (boldPart.startsWith('**') && boldPart.endsWith('**')) {
          return (
            <strong key={`${index}-${boldIndex}`} className="font-semibold">
              {boldPart.slice(2, -2)}
            </strong>
          );
        }
        return boldPart;
      });
    });
  };

  return (
    <div className={`${className} relative`}>
      {/* Summary Section */}
      <div className={`${
        isDarkMode ? 'bg-blue-500/10 border border-blue-400/20' : 'bg-blue-50 border border-blue-200'
      } rounded-lg p-4 mb-6`}>
        <div className="flex items-start gap-3">
          <FileText className={`w-5 h-5 mt-0.5 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`} />
          <div>
            <h3 className={`font-medium text-sm mb-2 ${isDarkMode ? 'text-blue-200' : 'text-blue-800'}`}>
              Summary
            </h3>
            <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-blue-100' : 'text-blue-700'}`}>
              {response.summary}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="prose prose-sm max-w-none">
        {renderMarkdown(response.markdown)}
      </div>

    </div>
  );
};

export default PerplexityMarkdownRenderer;

