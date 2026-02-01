import React, { useEffect } from 'react';

interface RichMessageRendererProps {
  text: string;
  isUser?: boolean;
  isDarkMode?: boolean;
  compact?: boolean;
  toolResults?: any[];
}

  interface RichContent {
  type: 'text' | 'image' | 'math_diagram' | 'chart' | 'table' | 'formula' | 'weather_table' | 'tool_result' | 'chart_request' | 'wiki_card' | 'news_card' | 'web_results';
  content: string;
  metadata?: any;
}

const RichMessageRenderer: React.FC<RichMessageRendererProps> = ({ 
  text, 
  isUser, 
  isDarkMode, 
  compact = false,
  toolResults = [] 
}) => {

  // 🔍 COMPREHENSIVE FRONTEND IMAGE DEBUGGING
  useEffect(() => {
    if (toolResults && toolResults.length > 0) {
      console.log('🔍 RichMessageRenderer received toolResults:', {
        count: toolResults.length,
        toolResults: toolResults.map((result, index) => ({
          index,
          success: result?.success,
          hasData: !!result?.data,
          hasImageUrl: !!(result?.data?.image_url),
          imageUrlLength: result?.data?.image_url?.length || 0,
          imageUrlType: typeof result?.data?.image_url,
          imageUrlPreview: result?.data?.image_url?.substring(0, 100) + '...',
          message: result?.message,
          dataKeys: result?.data ? Object.keys(result.data) : []
        }))
      });

      // Check if any images should be displayed
      const imageResults = toolResults.filter(result => result?.data?.image_url);
      if (imageResults.length > 0) {
        console.log('🔍 Found image results that should be displayed:', imageResults.length);
        imageResults.forEach((result, index) => {
          console.log(`🔍 Image Result ${index}:`, {
            imageUrl: result.data.image_url.substring(0, 100) + '...',
            isDataUrl: result.data.image_url.startsWith('data:'),
            isHttpUrl: result.data.image_url.startsWith('http'),
            hasTitle: !!result.data.title,
            hasCaption: !!result.message
          });
        });
      } else {
        console.log('🔍 No image URLs found in tool results');
      }
    }
  }, [toolResults]);

  // Handle clickable searches
  const handleConceptClick = (concept: string) => {
    // Trigger search for the concept
    const searchEvent = new CustomEvent('triggerAISearch', { 
      detail: { query: `Explain ${concept} in detail` } 
    });
    window.dispatchEvent(searchEvent);
  };
  
  // Parse message for rich mathematical and visual content
  const parseRichContent = (text: string, toolResults: any[]): RichContent[] => {
    const content: RichContent[] = [];
    let processedText = text;
    
    console.log('🔍 parseRichContent called with:', {
      text: text.substring(0, 100) + '...',
      toolResultsCount: toolResults.length
    });
    
    // Handle tool results (server-generated diagrams and data)
    // Support both summarized server content (result.content string) and full client content (result.data)
    toolResults.forEach((result, index) => {
      let normalized: any = result;
      try {
        if (typeof result?.content === 'string') {
          normalized = JSON.parse(result.content);
        }
      } catch (e) {
        // keep original if JSON parse fails
      }
      console.log(`🔍 Processing tool result ${index}:`, {
        hasImageUrl: !!(result.data?.image_url),
        hasDiagramType: !!(result.data?.diagram_type),
        success: result.success,
        hasData: !!result.data
      });

      // Handle math diagrams (specific type)
      const data = normalized?.data || result?.data;
      const message = normalized?.message || result?.message;
      if (data?.type === 'wiki_card') {
        content.push({ type: 'wiki_card', content: data.title || 'Wikipedia', metadata: data });
      } else if (data?.type === 'news_card') {
        content.push({ type: 'news_card', content: 'News', metadata: data });
      } else if (data?.type === 'web_results') {
        content.push({ type: 'web_results', content: 'Web Results', metadata: data });
      } else if (data?.image_url && data?.diagram_type) {
        console.log(`🔍 Adding math_diagram for result ${index}`);
        content.push({
          type: 'math_diagram',
          content: data.image_url,
          metadata: {
            title: data.title || 'Mathematical Diagram',
            diagramType: data.diagram_type,
            style: data.style || 'colorful'
          }
        });
      }
      // Handle general images (from generate_image tool)
      else if (data?.image_url) {
        console.log(`🔍 Adding general image for result ${index}`);
        content.push({
          type: 'image',
          content: data.image_url,
          metadata: {
            title: data.title || 'Generated Image',
            caption: message || 'Image generated successfully',
            style: data.style || 'default'
          }
        });
      }
      // Handle other successful tool results
      else if ((normalized?.success || result?.success) && (data)) {
        console.log(`🔍 Adding tool_result for result ${index}`);
        content.push({
          type: 'tool_result',
          content: message || 'Tool executed successfully',
          metadata: data
        });
      } else {
        console.log(`🔍 Skipping result ${index} - no matching conditions`);
      }
    });
    
    console.log('🔍 parseRichContent created content items:', {
      totalItems: content.length,
      itemTypes: content.map(item => item.type),
      hasImages: content.some(item => item.type === 'image' || item.type === 'math_diagram')
    });
    
    // Parse IMAGE_GENERATED format
    const imageRegex = /IMAGE_GENERATED:([^:]+):(.+)/g;
    let match;
    while ((match = imageRegex.exec(processedText)) !== null) {
      content.push({
        type: 'image',
        content: match[1], // base64 data URL
        metadata: { caption: match[2] }
      });
      processedText = processedText.replace(match[0], '');
    }
    
    // Parse mathematical formulas $$...$$
    const formulaRegex = /\$\$([\s\S]+?)\$\$/g;
    while ((match = formulaRegex.exec(processedText)) !== null) {
      content.push({
        type: 'formula',
        content: match[1],
        metadata: { inline: false }
      });
      processedText = processedText.replace(match[0], '');
    }
    
    // Parse weather tables and structured data
    const tableRegex = /\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/g;
    while ((match = tableRegex.exec(processedText)) !== null) {
      content.push({
        type: 'table',
        content: match[0],
        metadata: { 
          headers: match[1].split('|').filter(h => h.trim()),
          isWeatherTable: match[0].includes('°C') || match[0].includes('Temperature') || match[0].includes('Humidity')
        }
      });
      processedText = processedText.replace(match[0], '');
    }
    
    // Add formatted text as final content
    if (processedText.trim()) {
      content.push({
        type: 'text',
        content: formatText(processedText)
      });
    }
    
    return content;
  };
  const renderWikiCard = (metadata: any) => {
    const container = isDarkMode ? 'bg-[#1a1a2e] border-white/10' : 'bg-white border-gray-200';
    return (
      <div className={`my-3 sm:my-4 p-3 sm:p-4 rounded-xl border ${container}`}>
        <div className="flex items-start gap-3">
          {metadata.thumbnail && (
            <img src={metadata.thumbnail} alt={metadata.title} className="w-12 h-12 sm:w-16 sm:h-16 rounded-md object-cover flex-shrink-0" />
          )}
          <div className="flex-1">
            <h4 className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold text-sm sm:text-base`}>{metadata.title}</h4>
            {metadata.description && (
              <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-xs sm:text-sm`}>{metadata.description}</p>
            )}
          </div>
        </div>
        {metadata.extract_html && (
          <div className={`${isDarkMode ? 'text-gray-200' : 'text-gray-800'} mt-2 sm:mt-3 text-xs sm:text-sm leading-relaxed`} dangerouslySetInnerHTML={{ __html: metadata.extract_html }} />
        )}
        <div className="mt-2 sm:mt-3 flex flex-wrap gap-2">
          {metadata.canonical_url && (
            <a href={metadata.canonical_url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs sm:text-sm ${isDarkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-black/5 text-gray-800 hover:bg-black/10'}`}>Read on Wikipedia</a>
          )}

        </div>
      </div>
    );
  };

  const renderNewsCard = (metadata: any) => {
    const container = isDarkMode ? 'bg-[#1a1a2e] border-white/10' : 'bg-white border-gray-200';
    const items = metadata.items || [];
    return (
      <div className={`my-3 sm:my-4 p-3 sm:p-4 rounded-xl border ${container}`}>
        <h4 className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold mb-2 sm:mb-3 text-sm sm:text-base`}>Latest News</h4>
        <div className="grid grid-cols-1 gap-3">
          {items.map((n: any, i: number) => (
            <a key={i} href={n.link} target="_blank" rel="noopener noreferrer" className={`rounded-lg p-2 sm:p-3 border ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'} transition-colors`}>
              <div className="flex items-start gap-2 sm:gap-3">
                {n.imageUrl && <img src={n.imageUrl} alt="" className="w-12 h-12 sm:w-16 sm:h-16 rounded-md object-cover flex-shrink-0" />}
                <div className="flex-1">
                  <div className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-medium text-sm sm:text-base`}>{n.title}</div>
                  <div className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-xs sm:text-sm`}>{n.snippet}</div>
                  <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-[10px] sm:text-xs mt-1`}>{n.source} • {n.date}</div>
                </div>
              </div>
            </a>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <button className={`inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs sm:text-sm ${isDarkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-black/5 text-gray-800 hover:bg-black/10'}`}
            onClick={() => window.dispatchEvent(new CustomEvent('triggerAISearch', { detail: { query: 'Show more recent news' } }))}
          >More News</button>
        </div>
      </div>
    );
  };

  const renderWebResults = (metadata: any) => {
    const container = isDarkMode ? 'bg-[#1a1a2e] border-white/10' : 'bg-white border-gray-200';
    const results = metadata.results || [];
    return (
      <div className={`my-3 sm:my-4 p-3 sm:p-4 rounded-xl border ${container}`}>
        <h4 className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold mb-2 sm:mb-3 text-sm sm:text-base`}>Top Results</h4>
        <div className="space-y-3">
          {results.map((r: any, i: number) => (
            <a key={i} href={r.link} target="_blank" rel="noopener noreferrer" className={`block rounded-lg p-2 sm:p-3 border ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-black/10 hover:bg-black/5'} transition-colors`}>
              <div className={`${isDarkMode ? 'text-blue-300' : 'text-blue-700'} font-medium text-sm sm:text-base`}>{r.title}</div>
              <div className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-xs sm:text-sm mt-1`}>{r.snippet}</div>
              <div className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-[10px] sm:text-xs mt-1`}>{r.source || new URL(r.link).hostname}</div>
            </a>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button className={`inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs sm:text-sm ${isDarkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-black/5 text-gray-800 hover:bg-black/10'}`}
            onClick={() => window.dispatchEvent(new CustomEvent('triggerAISearch', { detail: { query: 'Search images for this topic' } }))}
          >Images</button>
          <button className={`inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs sm:text-sm ${isDarkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-black/5 text-gray-800 hover:bg-black/10'}`}
            onClick={() => window.dispatchEvent(new CustomEvent('triggerAISearch', { detail: { query: 'Search videos for this topic' } }))}
          >Videos</button>

        </div>
      </div>
    );
  };

  // Render mathematical diagrams with refined, interactive UI
  const renderMathDiagram = (content: string, metadata: any) => {
    const containerClass = isDarkMode 
      ? 'bg-gradient-to-br from-gray-800/60 via-gray-900/40 to-gray-800/60 border-gray-600/40' 
      : 'bg-gradient-to-br from-gray-50 via-white to-gray-50/80 border-gray-200/60';
    
    const headerClass = isDarkMode 
      ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300'
      : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600';
    
    const subtitleClass = isDarkMode ? 'text-gray-400' : 'text-gray-600';
    const contentBg = isDarkMode ? 'bg-black/20' : 'bg-white/60';
    const contentBorder = isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50';
    const footerClass = isDarkMode ? 'text-gray-500' : 'text-gray-500';

    // Get appropriate icon based on chart type
    const getChartIcon = (type: string) => {
      const lowerType = type?.toLowerCase() || '';
      if (lowerType.includes('pie')) return '🥧';
      if (lowerType.includes('bar') || lowerType.includes('histogram')) return '📊';
      if (lowerType.includes('line') || lowerType.includes('spending')) return '📈';
      if (lowerType.includes('scatter')) return '🎯';
      if (lowerType.includes('area')) return '⛰️';
      if (lowerType.includes('moon') || lowerType.includes('distance') || lowerType.includes('orbital')) return '🌙';
      return '📊';
    };

    const chartIcon = getChartIcon(metadata.diagramType);

    const handleOpen = () => window.open(content, '_blank');
    const handleDownload = () => {
      const a = document.createElement('a');
      a.href = content;
      a.download = `${(metadata.title || 'diagram').replace(/\s+/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    const handleCopy = async () => {
      try { await navigator.clipboard.writeText(content); } catch {}
    };



    return (
      <div className={`math-diagram-container my-6 md:my-8 p-4 md:p-6 ${containerClass} rounded-2xl border shadow-xl backdrop-blur-sm overflow-hidden`}> 
        <div className="flex items-center justify-between mb-4 md:mb-6 gap-2">
          <div>
            <h3 className={`text-lg md:text-2xl font-semibold ${headerClass} flex items-center flex-wrap`}>
              <span className="mr-2 md:mr-3 text-xl md:text-3xl">{chartIcon}</span>
              <span className="break-words flex-1">{metadata.title}</span>
            </h3>
            <p className={`text-xs md:text-sm ${subtitleClass} capitalize mt-1 flex items-center flex-wrap`}>
              <span className="mr-2">🎯</span>
              <span className="break-words">{metadata.diagramType} • {metadata.style} style • Educational chart</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleOpen} className={`px-2 py-1 rounded-md text-xs border ${isDarkMode ? 'bg-gray-800/50 border-gray-600 text-gray-200 hover:bg-gray-700/60' : 'bg-white/80 border-gray-300 text-gray-700 hover:bg-gray-100'}`}>View</button>
            <button onClick={handleDownload} className={`px-2 py-1 rounded-md text-xs border ${isDarkMode ? 'bg-gray-800/50 border-gray-600 text-gray-200 hover:bg-gray-700/60' : 'bg-white/80 border-gray-300 text-gray-700 hover:bg-gray-100'}`}>Download</button>
            <button onClick={handleCopy} className={`px-2 py-1 rounded-md text-xs border ${isDarkMode ? 'bg-gray-800/50 border-gray-600 text-gray-200 hover:bg-gray-700/60' : 'bg-white/80 border-gray-300 text-gray-700 hover:bg-gray-100'}`}>Copy</button>

          </div>
        </div>

        <div className={`relative ${contentBg} rounded-xl p-2 md:p-4 border ${contentBorder} backdrop-blur-sm`}> 
          <img
            src={content}
            alt={metadata.title}
            className="w-full max-w-full mx-auto rounded-lg shadow-lg cursor-zoom-in"
            style={{
              imageRendering: 'crisp-edges',
              filter: isDarkMode ? 'drop-shadow(0 6px 18px rgba(0,0,0,0.35)) brightness(1.04)' : 'drop-shadow(0 6px 18px rgba(0,0,0,0.12)) brightness(0.99)',
              maxHeight: '640px',
              objectFit: 'contain'
            }}
            onClick={handleOpen}
          />
        </div>

        <div className={`diagram-footer mt-3 md:mt-4 text-xs ${footerClass} text-center break-words`}>
          ✨ Tap image to open in a new tab • Use toolbar to download or copy
        </div>
      </div>
    );
  };

  // Render generated images - clean, minimal presentation
  const renderImage = (content: string, metadata: any) => {
    const captionClass = isDarkMode ? 'text-gray-400' : 'text-gray-600';

    const handleOpen = () => window.open(content, '_blank');
    const handleDownload = () => {
      const a = document.createElement('a');
      a.href = content;
      a.download = `image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    return (
      <div className="image-container my-4">
        {/* Caption/prompt above image */}
        {metadata.caption && (
          <p className={`text-sm mb-2 ${captionClass}`}>
            {metadata.caption}
          </p>
        )}
        
        {/* Image with hover actions */}
        <div className="relative group">
          <img 
            src={content} 
            alt={metadata.caption || 'Generated image'}
            className="w-full max-w-2xl rounded-xl cursor-pointer"
            onClick={handleOpen}
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3">
            <button 
              onClick={handleOpen}
              className="py-2 px-4 bg-white/90 text-black rounded-lg text-sm font-medium hover:bg-white transition-colors"
            >
              View Full
            </button>
            <button 
              onClick={handleDownload}
              className="py-2 px-4 bg-pink-500 text-white rounded-lg text-sm font-medium hover:bg-pink-600 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render mathematical formulas with beautiful, theme-aware styling
  const renderFormula = (content: string, metadata: any) => {
    const containerClass = metadata.inline 
      ? (isDarkMode 
          ? 'inline-block bg-slate-700/60 border border-slate-500/40' 
          : 'inline-block bg-slate-100/80 border border-slate-300/60')
      : (isDarkMode 
          ? 'bg-gradient-to-r from-indigo-800/40 via-purple-800/40 to-indigo-800/40 border border-indigo-500/30 shadow-lg' 
          : 'bg-gradient-to-r from-indigo-50/80 via-purple-50/80 to-indigo-50/80 border border-indigo-200/60 shadow-lg');
    
    const textClass = isDarkMode 
      ? 'text-yellow-200' 
      : 'text-yellow-800';
    
    const footerClass = isDarkMode ? 'text-gray-400' : 'text-gray-600';

    return (
      <div className={`formula-container my-4 md:my-6 p-4 md:p-6 rounded-xl md:rounded-2xl ${containerClass} break-words overflow-hidden`}>
        <div className="formula-content text-center">
          <div className={`text-lg md:text-2xl ${textClass} font-mono font-semibold leading-relaxed break-words`}>
            {content}
          </div>
        </div>
        {!metadata.inline && (
          <div className={`formula-footer text-xs text-center ${footerClass} mt-2 md:mt-3 flex items-center justify-center flex-wrap`}>
            <span className="mr-2">📐</span>
            <span className="break-words">Mathematical Expression</span>
          </div>
        )}
      </div>
    );
  };

  // Render beautiful interactive tables with theme-aware styling
  const renderTable = (content: string, metadata: any) => {
    const lines = content.trim().split('\n');
    const headers = lines[0].split('|').filter(h => h.trim()).map(h => h.trim());
    const rows = lines.slice(2).map(line => 
      line.split('|').filter(cell => cell.trim()).map(cell => cell.trim())
    );

    const isWeatherTable = metadata.isWeatherTable;
    
    const containerClass = isWeatherTable
      ? (isDarkMode 
          ? 'bg-gradient-to-br from-blue-800/40 via-cyan-800/30 to-blue-800/40 border border-cyan-500/30' 
          : 'bg-gradient-to-br from-blue-50/80 via-cyan-50/60 to-blue-50/80 border border-cyan-200/60')
      : (isDarkMode 
          ? 'bg-gradient-to-br from-slate-800/60 via-slate-900/40 to-slate-800/60 border border-slate-600/40' 
          : 'bg-gradient-to-br from-slate-50/80 via-white/60 to-slate-50/80 border border-slate-200/60');
    
    const headerClass = isDarkMode 
      ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300'
      : 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600';
    
    const contentBg = isDarkMode ? 'bg-black/20' : 'bg-white/50';
    const contentBorder = isDarkMode ? 'border-slate-700/50' : 'border-slate-200/50';
    const headerRowBorder = isDarkMode ? 'border-slate-600/50' : 'border-slate-300/50';
    const headerCellBg = isDarkMode ? 'bg-slate-800/40' : 'bg-slate-100/60';
    const headerCellText = isDarkMode ? 'text-cyan-300' : 'text-cyan-700';
    const rowBorder = isDarkMode ? 'border-slate-700/30' : 'border-slate-200/60';
    const rowHover = isDarkMode ? 'hover:bg-slate-800/20' : 'hover:bg-slate-100/40';
    const cellText = isDarkMode ? 'text-gray-200' : 'text-gray-700';

    return (
      <div className={`table-container ${compact ? 'my-3 p-2 rounded-lg' : 'my-6 md:my-8 p-4 md:p-6 rounded-xl md:rounded-2xl'} shadow-lg ${containerClass} overflow-hidden`}>
        <div className={`${compact ? 'mb-2' : 'mb-3 md:mb-4'} table-header`}>
          <h4 className={`${compact ? 'text-sm' : 'text-base md:text-lg'} font-medium ${headerClass} flex items-center flex-wrap`}>
            <span className={`${compact ? 'mr-1 text-base' : 'mr-2 text-xl md:text-2xl'}`}>{isWeatherTable ? '☀️☁️' : '📊'}</span>
            <span className="break-words">{isWeatherTable ? 'Weather Data' : 'Data Table'}</span>
          </h4>
        </div>
        <div className={`table-content ${contentBg} ${compact ? 'rounded-md p-2' : 'rounded-lg md:rounded-xl p-3 md:p-4'} border ${contentBorder} backdrop-blur-sm overflow-x-auto`}>
          <table className={`w-full ${compact ? 'text-[11px]' : 'text-xs md:text-sm'} min-w-full`}>
            <thead>
              <tr className={`border-b ${headerRowBorder}`}>
                {headers.map((header, i) => (
                  <th key={i} className={`${compact ? 'px-2 py-1' : 'px-2 md:px-4 py-2 md:py-3'} text-left font-medium ${headerCellText} ${headerCellBg} break-words`}>
                    <span className="break-words">{header}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className={`border-b ${rowBorder} ${rowHover} transition-colors`}>
                  {row.map((cell, j) => (
                    <td key={j} className={`${compact ? 'px-2 py-1' : 'px-2 md:px-4 py-2 md:py-3'} ${cellText} break-words max-w-0`}>
                      {/* Highlight numbers and units with theme-aware colors */}
                      <span className="break-words" dangerouslySetInnerHTML={{
                        __html: cell.replace(/(\d+(?:\.\d+)?)\s*(°C|°F|%|kph|mph)/g,
                          isDarkMode 
                            ? '<span class="px-2 py-1 bg-green-800/40 border border-green-600/50 rounded text-green-300 font-semibold">$1</span><span class="text-green-400 text-xs ml-1">$2</span>'
                            : '<span class="px-2 py-1 bg-green-200/60 border border-green-400/50 rounded text-green-700 font-semibold">$1</span><span class="text-green-600 text-xs ml-1">$2</span>'
                        )
                      }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Enhanced text formatting with mathematical and visual enhancements
  const formatText = (text: string) => {
    // Minimal HTML/attribute escaping helpers to prevent broken markup
    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const escapeAttr = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    // Theme-aware color classes
    const themeClasses = {
      // Mathematical concepts
      mathConcepts: isDarkMode 
        ? 'bg-blue-800/30 border-blue-600/50 text-blue-300' 
        : 'bg-blue-200/50 border-blue-400/50 text-blue-800',
      
      // Numbers and units
      numbersBg: isDarkMode 
        ? 'bg-emerald-800/30 border-emerald-600/50 text-emerald-300' 
        : 'bg-emerald-200/50 border-emerald-400/50 text-emerald-800',
      numbersUnit: isDarkMode ? 'text-emerald-400' : 'text-emerald-600',
      
      // Weather conditions  
      weather: isDarkMode 
        ? 'bg-sky-800/30 border-sky-600/50 text-sky-300' 
        : 'bg-sky-200/50 border-sky-400/50 text-sky-800',
      
      // Math expressions
      mathExpr: isDarkMode 
        ? 'bg-gradient-to-r from-yellow-900 to-orange-900 text-yellow-200 border-yellow-600/50' 
        : 'bg-gradient-to-r from-yellow-200 to-orange-200 text-yellow-900 border-yellow-500/50',
      
      // Code blocks
      codeBlock: isDarkMode 
        ? 'bg-gray-900 border-gray-700 text-green-400' 
        : 'bg-gray-100 border-gray-300 text-green-700',
      
      // Inline code
      inlineCode: isDarkMode 
        ? 'bg-gray-800 border-gray-600 text-cyan-300' 
        : 'bg-gray-200 border-gray-400 text-cyan-700',
      
      // List items - BLACK text for readability
      listText: isDarkMode ? 'text-white' : 'text-black',
      listBullet: isDarkMode ? 'text-blue-400' : 'text-black'
    };

    return text
      // Clean up asterisks and markdown remnants FIRST
      .replace(/\*\*\*/g, '') // Remove triple asterisks
      .replace(/\*\*/g, '')   // Remove remaining double asterisks  
      .replace(/\*/g, '')     // Remove single asterisks
      .replace(/_{2,}/g, '')  // Remove multiple underscores
      
      // Special greeting phrases - refined Apple-like styling
      .replace(/\b(Here you go!|There you go!|Perfect!|Excellent!|Amazing!|Wonderful!|Great job!|Well done!|Fantastic!|Awesome!|Outstanding!)\b/gi, 
        `<div class="text-2xl md:text-4xl font-semibold my-4 md:my-6 text-center p-3 md:p-4 rounded-xl md:rounded-2xl ${isDarkMode ? 'bg-gradient-to-r from-indigo-600/80 to-purple-600/80 text-white' : 'bg-gradient-to-r from-indigo-500/90 to-purple-500/90 text-white'} shadow-lg transform hover:scale-105 transition-all duration-300 backdrop-blur-sm border ${isDarkMode ? 'border-indigo-400/30' : 'border-indigo-300/40'}">✨ $& ✨</div>`)
      
      // Convert bold text properly
      .replace(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b(?=:)/g, 
        `<strong class="font-bold ${isDarkMode ? 'text-white' : 'text-black'} break-words">$1</strong>`)
      
      // CLICKABLE Mathematical concepts - make cards interactive! (exclude chart/diagram to avoid overlapping replacements)
      .replace(/\b(distance|formula|equation|theorem|proof|calculate|temperature|humidity|weather|climate)\b/gi, (match) => {
        const query = `Explain ${match} in detail`;
        return `<button onclick=\"window.dispatchEvent(new CustomEvent('triggerAISearch', { detail: { query: '${escapeAttr(query)}' } }))\" class=\"inline-block px-2 py-1 ${themeClasses.mathConcepts} rounded font-semibold cursor-pointer hover:scale-105 transition-all duration-200 border-2 border-transparent hover:border-blue-400\">📚 ${escapeHtml(match)}</button>`;
      })
      
      // Numbers and units - theme-aware formatting
      .replace(/(\d+(?:\.\d+)?)\s*(km|miles|°C|°F|%|kph|mph|meters|feet|seconds|minutes|hours)/g,
        `<span class="px-2 py-1 ${themeClasses.numbersBg} rounded font-bold">$1</span><span class="${themeClasses.numbersUnit} text-sm ml-1 font-medium">$2</span>`)
      
      // CLEAN HEADERS - BLACK text, responsive sizing, better spacing
      .replace(/^### (.*$)/gim, 
        `<h3 class="text-lg md:text-xl font-bold ${isDarkMode ? 'text-white' : 'text-black'} mt-4 md:mt-6 mb-2 md:mb-3 flex items-center flex-wrap border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} pb-2"><span class="mr-2 text-base md:text-lg">📐</span><span class="break-words">$1</span></h3>`)
      .replace(/^## (.*$)/gim, 
        `<h2 class="text-xl md:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-black'} mt-5 md:mt-7 mb-3 md:mb-4 flex items-center flex-wrap border-b-2 ${isDarkMode ? 'border-gray-600' : 'border-gray-300'} pb-2"><span class="mr-2 md:mr-3 text-lg md:text-xl">🧮</span><span class="break-words">$1</span></h2>`)
      .replace(/^# (.*$)/gim, 
        `<h1 class="text-2xl md:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-black'} mt-6 md:mt-8 mb-4 md:mb-6 flex items-center flex-wrap border-b-2 ${isDarkMode ? 'border-gray-500' : 'border-gray-400'} pb-3"><span class="mr-2 md:mr-3 text-xl md:text-2xl">🌟</span><span class="break-words">$1</span></h1>`)
      
      // Mathematical expressions with theme-aware styling
      .replace(/\$(.*?)\$/g, 
        `<span class="inline-block ${themeClasses.mathExpr} px-3 md:px-4 py-1 md:py-2 rounded-lg md:rounded-xl font-mono border shadow-lg backdrop-blur-sm text-sm md:text-base">$1</span>`)
      
      // Code blocks with theme-aware syntax highlighting
      .replace(/```([\s\S]*?)```/g, 
        `<pre class="${themeClasses.codeBlock} border-2 rounded-xl md:rounded-2xl p-4 md:p-6 my-6 md:my-8 overflow-x-auto shadow-2xl backdrop-blur-sm"><code class="font-mono text-xs md:text-sm leading-relaxed">$1</code></pre>`)
      
      // Inline code with theme-aware styling
      .replace(/`([^`]+)`/g, 
        `<code class="${themeClasses.inlineCode} px-2 md:px-3 py-1 rounded-md md:rounded-lg font-mono border text-sm">$1</code>`)
      
      // Enhanced lists with theme-aware bullets and mobile-friendly spacing
      .replace(/^[\s]*-[\s]+(.*$)/gim, 
        `<li class="ml-4 md:ml-8 mb-2 md:mb-3 ${themeClasses.listText} flex items-start"><span class="${themeClasses.listBullet} mr-2 md:mr-3 mt-1 text-base md:text-lg">●</span><span class="flex-1 break-words">$1</span></li>`)
      
      // CLICKABLE Weather conditions - make interactive!
      .replace(/\b(Clear|Sunny|Cloudy|Rainy|Stormy|Snowy)\b/g,
        (match) => {
          const query = `What causes ${match} weather conditions?`;
          return `<button onclick=\"window.dispatchEvent(new CustomEvent('triggerAISearch', { detail: { query: '${escapeAttr(query)}' } }))\" class=\"inline-block px-2 py-1 ${themeClasses.weather} rounded font-medium cursor-pointer hover:scale-105 transition-all duration-200 border-2 border-transparent hover:border-sky-400\">🌤️ ${escapeHtml(match)}</button>`;
        }
      )
      
      // CLICKABLE Chart and visualization keywords - make interactive! (safe replacement)
      .replace(/\b(pie chart|bar chart|histogram|line chart|scatter plot|area chart|graph|visualization|chart|diagram)\b/gi,
        (match) => {
          const query = `Create a ${match} showing data visualization`;
          const btnClasses = isDarkMode ? 'bg-purple-800/30 border-purple-600/50 text-purple-300 hover:bg-purple-700/40' : 'bg-purple-200/50 border-purple-400/50 text-purple-800 hover:bg-purple-300/60';
          return `<button onclick=\"window.dispatchEvent(new CustomEvent('triggerAISearch', { detail: { query: '${escapeAttr(query)}' } }))\" class=\"inline-block px-2 py-1 ${btnClasses} rounded font-medium cursor-pointer hover:scale-105 transition-all duration-200 border-2 border-transparent hover:border-purple-400\">📊 ${escapeHtml(match)}</button>`;
        }
      )
      
      // Remove any remaining placeholder text patterns
      .replace(/\[.*?RENDERED\]/g, '')
      .replace(/\[.*?COMPLETE\]/g, '')
      .replace(/\[IMAGE_.*?\]/g, '')
      .replace(/\[TABLE_.*?\]/g, '')
      .replace(/\[FORMULA_.*?\]/g, '')
      .replace(/\[COMPUTATION.*?\]/g, '')
      .replace(/\[MATH_.*?\]/g, '')
      .replace(/\[DIAGRAM_.*?\]/g, '')
      
      // Line breaks
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
  };

  // Parse content and render all components
  const richContent = parseRichContent(text, toolResults);
  
    return (
      <div className={`rich-message-content ${compact ? 'prose-sm' : ''} prose prose-invert max-w-none break-words overflow-hidden`}>
      {richContent.map((item, index) => {
        switch (item.type) {
          case 'wiki_card':
            return <div key={index}>{renderWikiCard(item.metadata)}</div>;
          case 'news_card':
            return <div key={index}>{renderNewsCard(item.metadata)}</div>;
          case 'web_results':
            return <div key={index}>{renderWebResults(item.metadata)}</div>;
          case 'math_diagram':
            return <div key={index}>{renderMathDiagram(item.content, item.metadata)}</div>;
          case 'image':
            return <div key={index}>{renderImage(item.content, item.metadata)}</div>;
          case 'formula':
            return <div key={index}>{renderFormula(item.content, item.metadata)}</div>;
          case 'table':
            return <div key={index}>{renderTable(item.content, item.metadata)}</div>;
          case 'tool_result':
            return (
              <div key={index} className="tool-result my-4 p-4 bg-green-900/20 border border-green-600/50 rounded-xl">
                <div className="flex items-center mb-2">
                  <span className="mr-2 text-green-400">✅</span>
                  <span className="text-green-300 font-medium">Tool Executed Successfully</span>
                </div>
                <div className="text-gray-300">{item.content}</div>
              </div>
            );
          case 'text':
          default:
            return (
              <div 
                key={index}
                className="break-words overflow-hidden"
                dangerouslySetInnerHTML={{ __html: item.content }}
              />
            );
        }
      })}
    </div>
  );
};

export default RichMessageRenderer;