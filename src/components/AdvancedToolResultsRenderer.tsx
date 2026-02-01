/**
 * ADVANCED TOOL RESULTS RENDERER - Sophisticated State-of-the-Art Architecture
 * 
 * Advanced renderer for the large assistant using YOUR sophisticated architecture:
 * - ContentRenderer for structured content
 * - RendererOrchestrator for context-aware rendering
 * - Canvas activation integration
 * - Enhanced card layouts for large-chat context
 */

import React from 'react';
import { ContentRenderer } from '../services/ContentRenderer';
import { RendererOrchestrator, RenderingContext } from '../services/RendererOrchestrator';
import { ExternalLink, Download, Eye, Maximize2, BarChart3, FileText, Image as ImageIcon, Search } from 'lucide-react';
import SearchSuggestionCards from './SearchSuggestionCards';
import PerplexityMarkdownRenderer from './PerplexityMarkdownRenderer';
import NeuraPlaySearchResults from './NeuraPlaySearchResults';

interface AdvancedToolResultsRendererProps {
  toolResults: any[];
  context: RenderingContext;
  isDarkMode: boolean;
  onCanvasActivation: (canvasData: any) => void;
  orchestratorConfig?: any; // Optional orchestrator config for advanced rendering decisions
  chatContext?: {
    assistantType?: 'lite' | 'small';
    sessionId?: string;
    onNewSearch?: (query: string) => void;
  };
}

const AdvancedToolResultsRenderer: React.FC<AdvancedToolResultsRendererProps> = ({
  toolResults,
  context,
  isDarkMode,
  onCanvasActivation,
  orchestratorConfig,
  chatContext
}) => {
  const contentRenderer = ContentRenderer.getInstance();
  const rendererOrchestrator = RendererOrchestrator.getInstance();

  const renderAdvancedToolResult = (result: any, index: number) => {
    try {
      // console.log('🎨 RENDERER DEBUG: Processing result', { index, result });
      
      // SILENCE noisy validation errors coming from non-tool chat responses
      if (result.success === false && (!result.data || Object.keys(result.data).length === 0)) {
        // Ignore "parameter validation" errors that are not actionable tool payloads
        if (typeof result.error === 'string' && result.error.includes("Parameter validation failed")) {
          return null;
        }
      }

    // WEATHER CARD - Enhanced with YOUR ContentRenderer Architecture  
    // FIXED: Check nested weather data structure and also check for pre-formatted weather messages
    const weatherData = result.data?.data || result.data;
    const isWeatherMessage = result.data?.metadata?.templateUsed === 'weather_card' || 
                            (result.message && result.message.includes('🌤️')) ||
                            (weatherData?.location && weatherData?.temperature);
    
    // Weather card detection logic (debug logging removed for performance)
                            
    if (isWeatherMessage) {
      // If we have structured data, use ContentRenderer
      if (weatherData?.location && weatherData?.temperature) {
        const renderedWeather = contentRenderer.renderWeather(weatherData);
        
        const weatherCard = (
          <div key={index} className={`p-6 rounded-b-2xl border-t-0 border-2 shadow-lg ${
            isDarkMode ? 'bg-[#1a1a2e] border-white/20' : 'bg-white border-purple-200/50'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-500'} text-white`}>
                  <span className="text-2xl">🌤️</span>
                </div>
                <div>
                  <h3 className={`font-bold text-xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Weather Report
                  </h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Real-time data for {weatherData.location}
                  </p>
                </div>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-500 text-white'
              }`}>
                Live Data
              </span>
            </div>
            
            <div className={`prose prose-lg max-w-none ${
              isDarkMode ? 'prose-invert' : ''
            }`}>
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: renderedWeather.formattedMessage
                    .replace(/^# /gm, '<h1 class="text-2xl font-bold mb-4">')
                    .replace(/^## /gm, '<h2 class="text-xl font-semibold mb-3">')
                    .replace(/^### /gm, '<h3 class="text-lg font-medium mb-2">')
                    .replace(/\*\*(.*?)\*\*/g, `<strong class="${isDarkMode ? 'text-blue-300' : 'text-blue-600'} font-semibold">$1</strong>`)
                    .replace(/^- /gm, '<li class="mb-1">')
                    .replace(/\n\n/g, '</li></ul><br/><ul class="list-none space-y-1"><li class="mb-1">')
                    .replace(/### Current Conditions\n/, '<h3 class="text-lg font-medium mb-3">Current Conditions</h3><ul class="list-none space-y-2">')
                    .replace(/---/, '</li></ul><hr class="my-4 border-gray-300 dark:border-gray-600"/>')
                    .replace(/\*([^*]+)\*/g, `<em class="${isDarkMode ? 'text-gray-300' : 'text-gray-600'}">$1</em>`)
                    .replace(/🌤️|🌡️|☁️|💧|💨/g, '<span class="inline-block mr-2 text-lg">$&</span>')
                }}
              />
            </div>
          </div>
        );
        return weatherCard;
      } 
      // If we only have a pre-formatted message, display it as a weather card
      else if (result.message || result.data?.message) {
        const weatherMessage = result.data?.message || result.message;
        const preFormattedCard = (
          <div key={index} className={`p-6 rounded-b-2xl border-t-0 border-2 shadow-lg ${
            isDarkMode ? 'bg-[#1a1a2e] border-white/20' : 'bg-white border-purple-200/50'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-500'} text-white`}>
                  <span className="text-2xl">🌤️</span>
                </div>
                <div>
                  <h3 className={`font-bold text-xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Weather Report
                  </h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Current conditions
                  </p>
                </div>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-500 text-white'
              }`}>
                Weather
              </span>
            </div>
            
            <div className={`prose prose-lg max-w-none ${
              isDarkMode ? 'prose-invert' : ''
            }`}>
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: weatherMessage
                    .replace(/^# /gm, '<h1 class="text-2xl font-bold mb-4">')
                    .replace(/^## /gm, '<h2 class="text-xl font-semibold mb-3">')
                    .replace(/^### /gm, '<h3 class="text-lg font-medium mb-2">')
                    .replace(/\*\*(.*?)\*\*/g, `<strong class="${isDarkMode ? 'text-blue-300' : 'text-blue-600'} font-semibold">$1</strong>`)
                    .replace(/^- /gm, '<li class="mb-1">')
                    .replace(/\n\n/g, '</li></ul><br/><ul class="list-none space-y-1"><li class="mb-1">')
                    .replace(/### Current Conditions\n/, '<h3 class="text-lg font-medium mb-3">Current Conditions</h3><ul class="list-none space-y-2">')
                    .replace(/---/, '</li></ul><hr class="my-4 border-gray-300 dark:border-gray-600"/>')
                    .replace(/\*([^*]+)\*/g, `<em class="${isDarkMode ? 'text-gray-300' : 'text-gray-600'}">$1</em>`)
                    .replace(/🌤️|🌡️|☁️|💧|💨/g, '<span class="inline-block mr-2 text-lg">$&</span>')
                    .replace(/\n/g, '<br/>')
                }}
              />
            </div>
          </div>
        );
        return preFormattedCard;
      }
    }

    // WEB SEARCH RESULTS - Sophisticated Card Layout  
    const webResults = result.data?.data?.data?.results || result.data?.data?.results || result.results;
    
    // NEWS ORCHESTRATOR RESULTS - Handle news stories from NewsOrchestrator
    const newsStories = result.data?.data?.stories || result.data?.stories;
    // More robust detection for news orchestrator
    const isNewsOrchestrator = result.metadata?.toolType === 'news-orchestrator' || 
                              (newsStories && Array.isArray(newsStories) && newsStories.length > 0 && 
                               newsStories[0]?.category) || // News stories have category field
                              result.data?.data?.categories; // NewsOrchestrator returns categories
    
    // console.log('🔍 WEB RESULTS DEBUG:', { 
    //   result, 
    //   webResults, 
    //   newsStories,
    //   isNewsOrchestrator,
    //   hasWebResults: webResults && Array.isArray(webResults),
    //   hasNewsStories: newsStories && Array.isArray(newsStories),
    //   fullResultStructure: JSON.stringify(result, null, 2)
    // });
    
    // Enhanced safety check for both web results and news stories
    const resultsToRender = isNewsOrchestrator ? newsStories : webResults;
    const hasResults = resultsToRender && Array.isArray(resultsToRender) && resultsToRender.length > 0;
    
    if (hasResults) {
      // Check if we have a Perplexity-style response
      const perplexityResponse = result.data?.data?.perplexityResponse || result.data?.perplexityResponse || result.perplexityResponse;
      
      // Always use NeuraPlay Search Results with tabbed interface
      // Pass Perplexity response and suggestions as additional data

      // Use NeuraPlay Search Results for sophisticated Google-style presentation
      const searchQuery = result.data?.data?.query || result.data?.query || result.query || (isNewsOrchestrator ? 'News Results' : 'Search Results');
      const suggestions = result.data?.data?.suggestions || result.data?.suggestions || [];
      
      // ENHANCED IMAGE EXTRACTION - Check multiple possible locations for NewsOrchestrator and WebSearchEngine images
      let images: Array<{ title: string; imageUrl: string; link: string; source: string }> = [];
      
      // Check all possible image locations in the response structure
      if (result.data?.data?.images && Array.isArray(result.data.data.images)) {
        images = result.data.data.images;
      } else if (result.data?.images && Array.isArray(result.data.images)) {
        images = result.data.images;
      } else if (result.images && Array.isArray(result.images)) {
        images = result.images;
      } else if (result.data?.data?.data?.images && Array.isArray(result.data.data.data.images)) {
        images = result.data.data.data.images;
      }
      
      // Additional check: If NewsOrchestrator, also check SearchContext images
      if (isNewsOrchestrator && images.length === 0) {
        const searchContextImages = result.data?.data?.searchContext?.images || result.data?.searchContext?.images;
        if (searchContextImages && Array.isArray(searchContextImages)) {
          images = searchContextImages;
        }
      }
      
      return (
        <NeuraPlaySearchResults
          key={index}
          query={searchQuery}
          results={resultsToRender}
          isDarkMode={isDarkMode}
          perplexityResponse={perplexityResponse}
          suggestions={suggestions}
          images={images}
          chatContext={chatContext}
        />
      );
    }

    // CANVAS CONTENT - Sophisticated Canvas Integration (FIXED FOR APPROPRIATE TRIGGERING)
    // FIXED: Only trigger canvas for actual canvas content, not all successful results
    const chartData = result.chartData || result.data?.chartData;
    const documentData = result.documentData || result.data?.documentData;
    const codeData = result.codeData || result.data?.codeData;

    if (chartData || documentData || codeData || result.canvasActivation === true) {
      const isChart = !!chartData || result.message?.includes('chart') || result.message?.includes('Chart');
      const isDocument = !!documentData || result.message?.includes('document') || result.message?.includes('Document');
      const title = isChart ? 'Chart Generated' : isDocument ? 'Document Created' : 'Canvas Content Ready';
      const icon = isChart ? <BarChart3 size={20} /> : isDocument ? <FileText size={20} /> : <Maximize2 size={20} />;
      const gradientClass = isChart 
        ? (isDarkMode ? 'bg-[#1a1a2e] border-purple-600/50' : 'bg-purple-50 border-purple-300')
        : (isDarkMode ? 'bg-[#1a1a2e] border-orange-600/50' : 'bg-orange-50 border-orange-300');
      
      // Prevent infinite re-activation on every re-render
      // Build deterministic id so React re-renders don’t retrigger activation
      const computeHash = (str: string) => {
        let h = 0;
        for (let i = 0; i < str.length; i++) {
          h = (h << 5) - h + str.charCodeAt(i);
          h |= 0; // 32-bit
        }
        return (h >>> 0).toString(16); // unsigned hex string
      };

      const uniqueId =
        // explicit ids first
        (result as any).id ??
        (result as any).uuid ??
        result.metadata?.id ??
        // fallback: 32-bit hash of data
        computeHash(JSON.stringify((result as any).data ?? result));

      // DEBUG uniqueId generation
      console.debug('[DEBUG] AdvancedToolResultsRenderer uniqueId', uniqueId, 'for result', result);
      console.debug('[DEBUG] chartData?', chartData, 'codeData?', codeData);
      // Persist the id on the result so further renders reuse it
      if (!(result as any).id) {
        (result as any).id = uniqueId;
      }

      const sentRef = (AdvancedToolResultsRenderer as any)._sentRef || new Set<string>();
      (AdvancedToolResultsRenderer as any)._sentRef = sentRef;

      if (!sentRef.has(uniqueId)) {
        sentRef.add(uniqueId);
        // Do not auto-activate canvas; emit agent event if needed
        try { window.dispatchEvent(new CustomEvent('np:agent:activateCanvas')); } catch {}
      }

      return (
        <div key={index} className={`p-6 rounded-b-2xl border-t-0 border-2 shadow-lg ${gradientClass}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${isChart ? 'bg-purple-500' : 'bg-orange-500'} text-white`}>
                {icon}
              </div>
              <div>
                <h3 className="font-semibold text-lg">{title}</h3>
                <p className="text-sm opacity-70">
                  {result.message || (isChart ? 'Interactive visualization ready' : isDocument ? 'Editable document ready' : 'Canvas content generated')}
                </p>
              </div>
            </div>
            <span className={`text-xs ${isChart ? 'bg-purple-600' : 'bg-orange-600'} text-white px-2 py-1 rounded-full`}>
              Canvas
            </span>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => {
                onCanvasActivation(result);
              }}
              className={`flex-1 py-3 px-4 rounded-lg ${isChart ? 'bg-purple-600 hover:bg-purple-700' : 'bg-orange-600 hover:bg-orange-700'} text-white font-medium transition-colors flex items-center justify-center space-x-2`}
            >
              <Maximize2 size={16} />
              <span>Open in Canvas</span>
            </button>
            
            {result.metadata && (
              <button
                className={`py-3 px-4 rounded-lg border ${
                  isDarkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'
                } transition-colors flex items-center space-x-2`}
              >
                <Download size={16} />
                <span>Export</span>
              </button>
            )}
          </div>
          
          {result.metadata && (
            <div className="mt-4 pt-4 border-t border-gray-200/20">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Template: {result.metadata.templateUsed || 'default'}</span>
                <span>Render time: {result.metadata.renderTime || 0}ms</span>
              </div>
            </div>
          )}
        </div>
      );
    }

    // IMAGE GENERATION - Clean Display (just prompt + image)
    const imageUrl = result.image_url || result.data?.image_url || result.data?.imageUrl;
    if (imageUrl) {
      const promptText = result.data?.originalPrompt || result.data?.prompt || '';
      return (
        <div key={index} className={`p-4 rounded-2xl ${
          isDarkMode ? 'bg-[#1a1a2e]/50' : 'bg-white/80'
        }`}>
          {/* Prompt text */}
          {promptText && (
            <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {promptText}
            </p>
          )}
          
          {/* Image with hover actions */}
          <div className="relative group">
            <img 
              src={imageUrl} 
              alt={promptText || "Generated image"}
              className="w-full h-auto max-h-96 object-contain rounded-xl"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="%23333" width="400" height="300"/><text fill="%23fff" x="50%" y="50%" text-anchor="middle">Image failed to load</text></svg>';
              }}
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3">
              <button 
                onClick={() => window.open(imageUrl, '_blank')}
                className="py-2 px-4 bg-white/90 text-black rounded-lg text-sm font-medium hover:bg-white transition-colors"
              >
                View Full
              </button>
              <button 
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = imageUrl;
                  a.download = `image-${Date.now()}.png`;
                  a.click();
                }}
                className="py-2 px-4 bg-pink-500 text-white rounded-lg text-sm font-medium hover:bg-pink-600 transition-colors flex items-center gap-2"
              >
                <Download size={14} />
                Save
              </button>
            </div>
          </div>
        </div>
      );
    }

    // MEMORY STORAGE - Enhanced Indicator
    if (result.memoryStored || result.success === true && result.message?.includes('memory')) {
      return (
        <div key={index} className={`p-4 rounded-b-xl border-t-0 border ${
          isDarkMode ? 'bg-[#1a1a2e] border-yellow-700/50' : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-yellow-500 text-white">
              <span className="text-sm">💾</span>
            </div>
            <div>
              <span className="font-medium">Memory Saved</span>
              <p className="text-xs opacity-70">Information stored for future reference</p>
            </div>
          </div>
        </div>
      );
    }

    // GENERIC MESSAGES - Enhanced Styling
    if (result.message) {
      const isError = result.success === false;
      return (
        <div key={index} className={`p-4 rounded-b-xl border-t-0 border ${
          isError 
            ? (isDarkMode ? 'bg-[#1a1a2e] border-red-700/50' : 'bg-red-50 border-red-200')
            : (isDarkMode ? 'bg-[#1a1a2e] border-gray-600/50' : 'bg-gray-50 border-gray-200')
        }`}>
          <div className="flex items-center space-x-3">
            <span className="text-lg">{isError ? '❌' : '✅'}</span>
            <div>
              <span className="font-medium">{isError ? 'Error' : 'Success'}</span>
              <p className="text-sm opacity-70">{result.message}</p>
            </div>
          </div>
        </div>
      );
    }

    // No handler matched for this result type
    return null;
    } catch (error) {
      console.error('🚨 RENDERER ERROR:', error, { result, index });
      return (
        <div key={index} className="p-4 border border-red-500 rounded-lg bg-red-50">
          <p className="text-red-600">Error rendering result: {error instanceof Error ? error.message : String(error)}</p>
        </div>
      );
    }
  };

  return (
    <div className="space-y-4">
      {toolResults.map((result, index) => renderAdvancedToolResult(result, index))}
    </div>
  );
};

export default AdvancedToolResultsRenderer;

