/**
 * TOOL RESULTS RENDERER - Advanced Architecture Component
 * 
 * Renders tool results using the ContentRenderer and RendererOrchestrator
 * according to YOUR advanced architecture patterns.
 */

import React from 'react';
import { CanvasStateAdapter } from '../services/CanvasStateAdapter';
import { ContentRenderer } from '../services/ContentRenderer';
import { RendererOrchestrator, RenderingContext } from '../services/RendererOrchestrator';

interface ToolResultsRendererProps {
  toolResults: any[];
  context: RenderingContext;
  isDarkMode: boolean;
  onOpenFullscreen: () => void;
}

const ToolResultsRenderer: React.FC<ToolResultsRendererProps> = ({
  toolResults,
  context,
  isDarkMode,
  onOpenFullscreen
}) => {
  const contentRenderer = ContentRenderer.getInstance();

  const renderToolResult = (result: any, index: number) => {
    // Only log for debugging when needed (removed spam)
    // Ignore frontend-side validation error stubs that do not contain usable data
    if (result.success === false && (!result.data || Object.keys(result.data).length === 0)) {
      if (typeof result.error === 'string' && result.error.includes('Parameter validation failed')) {
        return null;
      }
    }

    // Weather Results - Use YOUR ContentRenderer
    if (result.data?.location && result.data?.temperature) {
      const renderedWeather = contentRenderer.renderWeather(result.data);
      
      return (
        <div key={index} className={`p-3 rounded-lg border ${
          isDarkMode ? 'bg-blue-900/20 border-blue-700/30' : 'bg-blue-50 border-blue-200'
        }`}>
          <div 
            className="text-xs prose prose-sm"
            dangerouslySetInnerHTML={{ 
              __html: renderedWeather.formattedMessage.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            }}
          />
        </div>
      );
    }

    // Web Search Results OR Semantic Search Results - Card Preview Context
    if (result.results && Array.isArray(result.results)) {
      const isSemanticSearch = result.data?.source === 'semantic_search';
      const bgColor = isSemanticSearch 
        ? (isDarkMode ? 'bg-purple-900/20 border-purple-700/30' : 'bg-purple-50 border-purple-200')
        : (isDarkMode ? 'bg-green-900/20 border-green-700/30' : 'bg-green-50 border-green-200');
      const badgeColor = isSemanticSearch ? 'bg-purple-600' : 'bg-green-600';
      
      return (
        <div key={index} className={`p-3 rounded-lg border ${bgColor}`}>
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">{isSemanticSearch ? '🧠' : '🔍'}</span>
            <span className="font-medium text-sm">{isSemanticSearch ? 'Semantic Search' : 'Search Results'}</span>
            <span className={`text-xs ${badgeColor} text-white px-2 py-1 rounded`}>
              {result.results.length} found
            </span>
          </div>
          <div className="space-y-2">
            {result.results.slice(0, context === 'small-chat' ? 2 : 5).map((searchResult: any, idx: number) => (
              <div key={idx} className={`text-xs space-y-1 border-l-2 ${isSemanticSearch ? 'border-purple-400' : 'border-green-400'} pl-2`}>
                <a href={searchResult.url} target="_blank" rel="noopener noreferrer" 
                   className="font-medium text-blue-600 hover:underline line-clamp-2 block">
                  {searchResult.title}
                </a>
                <p className="text-gray-600 line-clamp-2">{searchResult.snippet || searchResult.content}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">{searchResult.displayLink || searchResult.url}</span>
                  {isSemanticSearch && searchResult.similarity && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-1 rounded">
                      {Math.round(searchResult.similarity * 100)}% match
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {result.results.length > (context === 'small-chat' ? 2 : 5) && (
            <button
              onClick={onOpenFullscreen}
              className={`mt-2 text-xs ${isSemanticSearch ? 'bg-purple-600 hover:bg-purple-700' : 'bg-green-600 hover:bg-green-700'} text-white px-2 py-1 rounded transition-colors`}
            >
              View All {result.results.length} Results
            </button>
          )}
        </div>
      );
    }

    // Canvas Content (Charts/Documents ONLY) - Canvas Activation Cards
    if (result.chartData || result.documentData || result.code || result.data?.code || result.canvasActivation === true) {
      const isChart = result.chartData || result.message?.includes('chart') || result.message?.includes('Chart');
      const isDocument = result.documentData || result.data?.style === 'canvas_document' || result.message?.includes('document');
      const isCode = result.code || result.data?.code || result.message?.includes('code');

      // Dispatch code element to canvas (state-based). Do not auto-activate canvas.
      React.useEffect(() => {
        if (isCode && (result.code || result.data?.code)) {
          CanvasStateAdapter.addCode({
            code: result.code || result.data?.code,
            language: result.language || result.data?.language || 'python',
            title: result.title || 'Generated Code',
            description: result.description || '',
            position: { x: 120, y: 120 },
            size: { width: 800, height: 600 }
          });
          console.log('💻 ToolResultsRenderer: Added code to canvas via state');
        }
      }, [isCode, result.code, result.data?.code]);

      // Dispatch document element to canvas when detected (state-based). Do not auto-activate canvas.
      React.useEffect(() => {
        if (isDocument && (result.documentData || result.data?.text)) {
          const docContent = result.documentData || {
            title: result.data?.title || 'Generated Document',
            text: result.data?.text || '',
            metadata: { created: Date.now() }
          };
          CanvasStateAdapter.addDocument({
            title: (docContent as any).title || 'Generated Document',
            content: (docContent as any).content || (docContent as any).text || '',
            metadata: (docContent as any).metadata,
            position: { x: 140, y: 140 },
            size: { width: 800, height: 600 }
          });
          console.log('📄 ToolResultsRenderer: Added document to canvas via state');
        }
      }, [isDocument, result.documentData, result.data?.text]);
      // Dispatch chart element to canvas. Do not auto-activate canvas.
      const chartPayload = result.chartData || result.data?.chartData || (isChart ? chartPayloadFromLegacy(result) : null);
      function chartPayloadFromLegacy(r:any){
        if(r.data && r.data.title && r.data.series){return r.data;}
        return null;
      }
      if (chartPayload) {
        CanvasStateAdapter.addChart({
          title: chartPayload.title || 'Chart',
          chartType: chartPayload.chartType || chartPayload.type || 'bar',
          series: chartPayload.series || chartPayload.data || [],
          position: { x: 120, y: 120 },
          size: { width: 600, height: 400 }
        });
        console.log('📊 ToolResultsRenderer: Added chart to canvas via state');
      }
      return (
        <div key={index} className={`p-3 rounded-lg border ${
          isDarkMode ? 'bg-purple-900/20 border-purple-700/30' : 'bg-white border-gray-300'
        }`}>
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">{isChart ? '📊' : isDocument ? '📄' : isCode ? '💻' : '🎨'}</span>
            <span className="font-medium text-sm">
              {isChart ? 'Chart Generated' : isDocument ? 'Document Created' : isCode ? 'Code Snippet' : 'Canvas Content Ready'}
            </span>
            <span className={`text-xs px-2 py-1 rounded ${
              isDarkMode ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700 border border-purple-300'
            }`}>
              Canvas
            </span>
          </div>
          <p className="text-xs text-gray-600 mb-2">
            {result.message || (isChart ? 'Interactive chart ready to view' : isDocument ? 'Document ready for editing' : 'Content created and displayed on canvas')}
          </p>
          <button
            onClick={onOpenFullscreen}
            className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 transition-colors"
          >
            Open in Canvas
          </button>
        </div>
      );
    }

    // Image Generation
    if (result.image_url) {
      return (
        <div key={index} className={`p-3 rounded-lg border ${
          isDarkMode ? 'bg-pink-900/20 border-pink-700/30' : 'bg-pink-50 border-pink-200'
        }`}>
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">🎨</span>
            <span className="font-medium text-sm">Image Generated</span>
          </div>
          <img 
            src={result.image_url} 
            alt="Generated image"
            className="w-full h-32 object-cover rounded-lg mb-2"
          />
          <button
            onClick={onOpenFullscreen}
            className="text-xs bg-pink-600 text-white px-2 py-1 rounded hover:bg-pink-700 transition-colors"
          >
            View Full Size
          </button>
        </div>
      );
    }

    // Memory Storage
    if (result.memoryStored || result.success === true && result.message?.includes('memory')) {
      return (
        <div key={index} className={`p-2 rounded-lg border ${
          isDarkMode ? 'bg-yellow-900/20 border-yellow-700/30' : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center space-x-2">
            <span className="text-sm">💾</span>
            <span className="text-xs">Memory saved</span>
          </div>
        </div>
      );
    }

    // Generic Success/Error Messages
    if (result.message) {
      return (
        <div key={index} className={`p-2 rounded-lg border ${
          result.success === false 
            ? (isDarkMode ? 'bg-red-900/20 border-red-700/30' : 'bg-red-50 border-red-200')
            : (isDarkMode ? 'bg-gray-800/50 border-gray-600/30' : 'bg-gray-50 border-gray-200')
        }`}>
          <div className="flex items-center space-x-2">
            <span className="text-sm">{result.success === false ? '❌' : '✅'}</span>
            <span className="text-xs">{result.message}</span>
          </div>
        </div>
      );
    }

    return null;
  };

  // Handle document addition in useEffect to avoid render-time hook violations
  React.useEffect(() => {
    toolResults.forEach((result) => {
      if (result.documentData) {
        CanvasStateAdapter.addDocument({
          title: result.documentData.title || 'Generated Document',
          content: result.documentData.content || result.documentData.text || '',
          metadata: result.documentData.metadata,
          position: { x: 100, y: 100 },
          size: { width: 800, height: 600 }
        });
        console.log('📄 ToolResultsRenderer: Added document to canvas via state');
      }
    });
  }, [toolResults]);

  return (
    <div className="space-y-2 mt-3">
      {toolResults.map((result, index) => renderToolResult(result, index))}
    </div>
  );
};

export default ToolResultsRenderer;
