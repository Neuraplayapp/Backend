import React from 'react';

interface SimpleTextRendererProps {
  text: string;
  isDarkMode?: boolean;
  className?: string;
}

const SimpleTextRenderer: React.FC<SimpleTextRendererProps> = ({ 
  text, 
  isDarkMode = false, 
  className = '' 
}) => {
  // Simple, reliable text processing without complex regex
  const processText = (text: string) => {
    // Split by paragraphs (double line breaks)
    const paragraphs = text.split(/\n\s*\n/);
    
    return paragraphs.map((paragraph, index) => {
      if (!paragraph.trim()) return null;
      
      // Split by single line breaks for line handling
      const lines = paragraph.split('\n');
      
      return (
        <div key={index} className="mb-4">
          {lines.map((line, lineIndex) => {
            if (!line.trim()) return null;
            
            // Handle different line types
            if (line.startsWith('# ')) {
              return (
                <h1 key={lineIndex} className={`text-2xl font-bold mb-4 mt-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {line.substring(2)}
                </h1>
              );
            }
            
            if (line.startsWith('## ')) {
              return (
                <h2 key={lineIndex} className={`text-xl font-bold mb-3 mt-5 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {line.substring(3)}
                </h2>
              );
            }
            
            if (line.startsWith('### ')) {
              return (
                <h3 key={lineIndex} className={`text-lg font-bold mb-2 mt-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {line.substring(4)}
                </h3>
              );
            }
            
            if (line.startsWith('- ') || line.startsWith('* ')) {
              return (
                <div key={lineIndex} className={`flex items-start mb-2 ml-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <span className="text-purple-500 mr-2 text-sm">•</span>
                  <span className="flex-1">{line.substring(2)}</span>
                </div>
              );
            }
            
            // Regular paragraph text
            return (
              <p key={lineIndex} className={`leading-relaxed mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {formatInlineText(line)}
              </p>
            );
          })}
        </div>
      );
    }).filter(Boolean);
  };
  
  // Clean inline formatting by removing asterisk markers
  const formatInlineText = (text: string) => {
    // Remove ** bold markers - keep the text, remove the asterisks
    let cleanText = text.replace(/\*\*(.*?)\*\*/g, '$1');
    
    // Remove * italic markers - keep the text, remove the asterisks  
    cleanText = cleanText.replace(/\*(.*?)\*/g, '$1');
    
    return cleanText;
  };
  
  return (
    <div className={`simple-text-renderer ${className}`}>
      {processText(text)}
    </div>
  );
};

export default SimpleTextRenderer;
