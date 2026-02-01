/**
 * NEURAPLAY SEARCH RESULTS - Google-Style Professional Search Interface
 * 
 * Features matching Google's sophisticated design:
 * - Clean markdown-style summary with structured content
 * - Tabbed interface (Answer, Images, Sources, Steps)
 * - Structured sections (Recent Events, Context, Main Findings)
 * - Source attribution throughout
 * - Related questions
 * - Integrated images
 * - Clean, minimal typography
 */

import React, { useState, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { ExternalLink, Image as ImageIcon, FileText, Navigation, Clock, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import PerplexityMarkdownRenderer from './PerplexityMarkdownRenderer';
import SearchSuggestionCards from './SearchSuggestionCards';

interface SearchResult {
  title: string;
  snippet: string;
  url?: string;
  link?: string;
  displayLink?: string;
  source?: string;
  timestamp?: string;
}

interface NeuraPlaySearchResultsProps {
  query: string;
  results: SearchResult[];
  isDarkMode?: boolean;
  perplexityResponse?: any;
  suggestions?: any[];
  images?: Array<{ title: string; imageUrl: string; link: string; source: string }>;
  chatContext?: {
    assistantType?: 'lite' | 'small';
    sessionId?: string;
    onNewSearch?: (query: string) => void;
  };
}

interface ProcessedContent {
  summary: string;
  recentEvents: string[];
  context: string[];
  mainFindings: string[];
  sources: Array<{ name: string; count: number; icon: string }>;
  relatedQuestions: string[];
  images: Array<{ title: string; imageUrl: string; link: string; source: string }>;
}

const NeuraPlaySearchResults: React.FC<NeuraPlaySearchResultsProps> = ({
  query,
  results,
  isDarkMode: propIsDarkMode,
  perplexityResponse,
  suggestions = [],
  images: propImages = [],
  chatContext
}) => {
  const { isDarkMode: contextIsDarkMode } = useTheme();
  const isDarkMode = propIsDarkMode ?? contextIsDarkMode;
  
  const [activeTab, setActiveTab] = useState<'answer' | 'images' | 'sources' | 'steps'>('answer');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']));

  // Process search results into structured content
  const processedContent = useMemo((): ProcessedContent => {
    const summary = generateSummary(query, results);
    const recentEvents = extractRecentEvents(results);
    const context = extractContext(results);
    const mainFindings = extractMainFindings(results);
    const sources = extractSources(results);
    const relatedQuestions = generateRelatedQuestions(query, results);
    // Use propImages first, fallback to extractImages
    const images = propImages.length > 0 ? propImages : extractImages(results);
    
    console.log('🖼️ NeuraPlaySearchResults: Processing', images.length, 'images');
    console.log('🖼️ NeuraPlaySearchResults: propImages length:', propImages.length);
    console.log('🖼️ NeuraPlaySearchResults: Sample image:', images[0]);
    console.log('🖼️ NeuraPlaySearchResults: All image URLs:', images.map(img => img?.imageUrl).filter(Boolean));

    return {
      summary,
      recentEvents,
      context,
      mainFindings,
      sources,
      relatedQuestions,
      images
    };
  }, [query, results, propImages]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Handle Related Question Clicks - Generate LLM-powered contextual search
  const handleRelatedQuestionClick = async (question: string) => {
    try {
      console.log('🧠 Generating LLM-powered contextual search for:', question);
      
      // Generate contextual search query using LLM
      const contextualQuery = await generateContextualSearchQuery(question, query, results);
      
      console.log('🔍 Generated contextual query:', contextualQuery);
      
      // Trigger new search with the LLM-generated query
      console.log('🚀 Triggering new search:', contextualQuery);
      
      // Check if we have a chat context with a callback function
      if (chatContext?.onNewSearch) {
        console.log('✅ Using chat context callback for search injection');
        chatContext.onNewSearch(contextualQuery);
        return;
      }
      
      // Fallback: Try to find and use the specific chat input field based on context
      let chatInput: HTMLInputElement | HTMLTextAreaElement | null = null;
      
      if (chatContext?.assistantType === 'lite') {
        // Look for NeuraPlayAssistantLite specific selectors
        chatInput = document.querySelector('.neuraplay-lite input, .assistant-lite input, .lite-chat input') as HTMLInputElement | HTMLTextAreaElement;
      } else if (chatContext?.assistantType === 'small') {
        // Look for AIAssistantSmall specific selectors
        chatInput = document.querySelector('.ai-assistant-small input, .assistant-small input, .small-chat input') as HTMLInputElement | HTMLTextAreaElement;
      }
      
      // If no specific chat found, try generic selectors
      if (!chatInput) {
        chatInput = document.querySelector('input[placeholder*="Ask"], input[placeholder*="message"], textarea[placeholder*="Ask"], textarea[placeholder*="message"]') as HTMLInputElement | HTMLTextAreaElement;
      }
      
      if (chatInput) {
        // Set the value and trigger input events
        chatInput.value = contextualQuery;
        chatInput.dispatchEvent(new Event('input', { bubbles: true }));
        chatInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Try to find and click the send button within the same chat context
        let sendButton: HTMLButtonElement | null = null;
        
        if (chatContext?.assistantType) {
          // Look for send button within the specific chat component
          const chatContainer = chatInput.closest('.neuraplay-lite, .assistant-lite, .ai-assistant-small, .assistant-small');
          if (chatContainer) {
            sendButton = chatContainer.querySelector('button[type="submit"], button:has(svg):last-of-type, .send-button') as HTMLButtonElement;
          }
        }
        
        // Fallback to global send button search
        if (!sendButton) {
          sendButton = document.querySelector('button[type="submit"], button:has(svg):last-of-type, .send-button, [data-testid="send-button"]') as HTMLButtonElement;
        }
        
        if (sendButton) {
          // Small delay to ensure the input is processed
          setTimeout(() => {
            sendButton!.click();
          }, 100);
        } else {
          // If no send button found, try triggering Enter key
          chatInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        }
        
        console.log('✅ Search query injected into specific chat interface:', chatContext?.assistantType || 'generic');
      } else {
        console.warn('🚨 Could not find chat input field for search injection');
        
        // Fallback: dispatch the custom event anyway for any listeners
        if (window.dispatchEvent) {
          const searchEvent = new CustomEvent('neuraplay-search', {
            detail: {
              query: contextualQuery,
              source: 'related-question',
              originalQuery: query,
              relatedQuestion: question,
              assistantType: chatContext?.assistantType,
              sessionId: chatContext?.sessionId
            }
          });
          window.dispatchEvent(searchEvent);
        }
      }
      
    } catch (error) {
      console.error('🚨 Failed to generate contextual search:', error);
      
      // Fallback to direct search with the question using context-aware injection
      if (chatContext?.onNewSearch) {
        console.log('✅ Using fallback with chat context callback');
        chatContext.onNewSearch(question);
      } else {
        console.warn('🚨 No chat context available for fallback search injection');
        
        // Ultimate fallback: Try DOM injection
        const chatInput = document.querySelector('input[placeholder*="Ask"], input[placeholder*="message"], textarea[placeholder*="Ask"], textarea[placeholder*="message"]') as HTMLInputElement | HTMLTextAreaElement;
        if (chatInput) {
          chatInput.value = question;
          chatInput.dispatchEvent(new Event('input', { bubbles: true }));
          
          const sendButton = document.querySelector('button[type="submit"], button:has(svg):last-of-type, .send-button, [data-testid="send-button"]') as HTMLButtonElement;
          if (sendButton) {
            setTimeout(() => sendButton.click(), 100);
          } else {
            chatInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          }
          console.log('✅ Ultimate fallback: DOM injection used');
        }
      }
      
      // Final fallback: dispatch custom event
      if (window.dispatchEvent) {
        const searchEvent = new CustomEvent('neuraplay-search', {
          detail: {
            query: question,
            source: 'related-question-fallback'
          }
        });
        window.dispatchEvent(searchEvent);
      }
    }
  };

  const tabs = [
    { id: 'answer' as const, label: 'Answer', icon: FileText },
    { id: 'images' as const, label: 'Images', icon: ImageIcon },
    { id: 'sources' as const, label: 'Sources', count: results.length },
    { id: 'steps' as const, label: 'Steps', icon: Navigation }
  ];

  return (
    <div className={`${
      isDarkMode ? 'bg-[#1a1a2e] border border-white/10' : 'bg-white border border-gray-200/50'
    } rounded-b-2xl shadow-lg overflow-hidden`}>
      
      {/* Search Query Header */}
      <div className={`px-6 py-4 border-b ${
        isDarkMode ? 'border-white/10 bg-black/10' : 'border-gray-200/50 bg-gray-50/50'
      }`}>
        <h2 className={`text-lg font-medium ${isDarkMode ? 'text-white/90' : 'text-gray-900'}`}>
          {query}
        </h2>
      </div>

      {/* Tab Navigation */}
      <div className={`flex border-b ${isDarkMode ? 'border-white/10' : 'border-gray-200/50'}`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? isDarkMode 
                    ? 'text-blue-300 border-b-2 border-blue-300' 
                    : 'text-blue-600 border-b-2 border-blue-600'
                  : isDarkMode
                    ? 'text-white/60 hover:text-white/80'
                    : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {tab.label}
              {tab.count && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  isDarkMode ? 'bg-white/10 text-white/70' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'answer' && (
          <AnswerTab 
            content={processedContent} 
            isDarkMode={isDarkMode}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
            perplexityResponse={perplexityResponse}
            suggestions={suggestions}
            onRelatedQuestionClick={handleRelatedQuestionClick}
          />
        )}
        {activeTab === 'images' && (
          <ImagesTab 
            results={results} 
            isDarkMode={isDarkMode}
            images={processedContent.images}
          />
        )}
        {activeTab === 'sources' && (
          <SourcesTab 
            results={results} 
            isDarkMode={isDarkMode} 
            perplexityResponse={perplexityResponse}
          />
        )}
        {activeTab === 'steps' && (
          <StepsTab query={query} isDarkMode={isDarkMode} />
        )}
      </div>
    </div>
  );
};

// Answer Tab Component
const AnswerTab: React.FC<{
  content: ProcessedContent;
  isDarkMode: boolean;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
  perplexityResponse?: any;
  suggestions?: any[];
  onRelatedQuestionClick: (question: string) => void;
}> = ({ content, isDarkMode, expandedSections, toggleSection, perplexityResponse, suggestions = [], onRelatedQuestionClick }) => (
  <div className="space-y-6">
    {/* Perplexity Response (if available) */}
    {perplexityResponse && (
      <>
        <div className="mb-6">
          <PerplexityMarkdownRenderer response={perplexityResponse} />
        </div>
        
        {/* Inline Images Gallery - After Perplexity Response */}
        {content.images && content.images.length > 0 && (
          <div className="my-6">
            <h3 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>
              Related Images
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
              {content.images.slice(0, 8).map((image, index) => (
                <div
                  key={index}
                  className={`group cursor-pointer rounded-lg overflow-hidden ${
                    isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'
                  } transition-all duration-200 shadow-md hover:shadow-lg`}
                  onClick={() => window.open(image.link, '_blank')}
                >
                  <div className="aspect-square relative">
                    <img
                      src={image.imageUrl}
                      alt={image.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className={`hidden absolute inset-0 flex items-center justify-center ${
                      isDarkMode ? 'bg-gray-800' : 'bg-gray-200'
                    }`}>
                      <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Image unavailable
                      </span>
                    </div>
                    {/* Hover overlay with title */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-2">
                      <span className="text-white text-xs line-clamp-2">{image.title}</span>
                    </div>
                  </div>
                  <div className={`p-2 ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <p className={`text-xs truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {image.source}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    )}
    
    {/* Main Summary (fallback if no Perplexity response) */}
    {!perplexityResponse && (
      <div className={`prose prose-lg max-w-none ${isDarkMode ? 'prose-invert' : ''}`}>
        <div 
          className={`text-base leading-relaxed ${isDarkMode ? 'text-white/80' : 'text-gray-700'}`}
          dangerouslySetInnerHTML={{ __html: content.summary }}
        />
      </div>
    )}

    {/* Inline Images Gallery - Integrated with Answer */}
    {content.images && content.images.length > 0 && (
      <div className="my-6">
        <h3 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>
          Related Images
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
          {content.images.slice(0, 8).map((image, index) => (
            <div
              key={index}
              className={`group cursor-pointer rounded-lg overflow-hidden ${
                isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'
              } transition-all duration-200 shadow-md hover:shadow-lg`}
              onClick={() => window.open(image.link, '_blank')}
            >
              <div className="aspect-square relative">
                <img
                  src={image.imageUrl}
                  alt={image.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className={`hidden absolute inset-0 flex items-center justify-center ${
                  isDarkMode ? 'bg-gray-800' : 'bg-gray-200'
                }`}>
                  <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Image unavailable
                  </span>
                </div>
                {/* Hover overlay with title */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-2">
                  <span className="text-white text-xs line-clamp-2">{image.title}</span>
                </div>
              </div>
              <div className={`p-2 ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                <p className={`text-xs truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {image.source}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Recent Events Section */}
    {content.recentEvents.length > 0 && (
      <CollapsibleSection
        title="Recent Events"
        isExpanded={expandedSections.has('events')}
        onToggle={() => toggleSection('events')}
        isDarkMode={isDarkMode}
      >
        <ul className="space-y-3">
          {content.recentEvents.map((event, index) => (
            <li key={index} className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                isDarkMode ? 'bg-blue-400' : 'bg-blue-600'
              }`} />
              <span className={`text-sm leading-relaxed ${
                isDarkMode ? 'text-white/70' : 'text-gray-600'
              }`}>
                {event}
              </span>
            </li>
          ))}
        </ul>
      </CollapsibleSection>
    )}

    {/* Main Findings */}
    {content.mainFindings.length > 0 && (
      <CollapsibleSection
        title="Key Findings"
        isExpanded={expandedSections.has('findings')}
        onToggle={() => toggleSection('findings')}
        isDarkMode={isDarkMode}
      >
        <ul className="space-y-2">
          {content.mainFindings.map((finding, index) => (
            <li key={index} className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                isDarkMode ? 'bg-purple-400' : 'bg-purple-600'
              }`} />
              <span className={`text-sm leading-relaxed ${
                isDarkMode ? 'text-white/70' : 'text-gray-600'
              }`}>
                {finding}
              </span>
            </li>
          ))}
        </ul>
      </CollapsibleSection>
    )}

    {/* Broader Context */}
    {content.context.length > 0 && (
      <CollapsibleSection
        title="Broader Context"
        isExpanded={expandedSections.has('context')}
        onToggle={() => toggleSection('context')}
        isDarkMode={isDarkMode}
      >
        <ul className="space-y-2">
          {content.context.map((item, index) => (
            <li key={index} className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                isDarkMode ? 'bg-purple-400' : 'bg-purple-600'
              }`} />
              <span className={`text-sm leading-relaxed ${
                isDarkMode ? 'text-white/70' : 'text-gray-600'
              }`}>
                {item}
              </span>
            </li>
          ))}
        </ul>
      </CollapsibleSection>
    )}

    {/* Search Suggestions */}
    {suggestions && suggestions.length > 0 && (
      <div className="mt-8">
        <h3 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-white/90' : 'text-gray-900'}`}>
          Suggested Searches
        </h3>
        <SearchSuggestionCards 
          suggestions={suggestions}
          onSuggestionClick={(query) => {
            console.log('🔍 Suggestion clicked:', query);
            // TODO: Implement search execution
          }}
        />
      </div>
    )}

    {/* Related Questions - Clickable LLM-Generated Contextual Searches */}
    {content.relatedQuestions.length > 0 && (
      <div className="mt-8">
        <h3 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-white/90' : 'text-gray-900'}`}>
          Related
        </h3>
        <div className="space-y-2">
          {content.relatedQuestions.map((question, index) => (
            <button
              key={index}
              onClick={() => onRelatedQuestionClick(question)}
              className={`w-full text-left p-3 rounded-lg border transition-all duration-200 group ${
                isDarkMode 
                  ? 'border-white/10 hover:bg-white/5 hover:border-white/20 text-white/70 hover:text-white/90' 
                  : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{question}</span>
                <div className={`transition-transform duration-200 group-hover:translate-x-1 ${
                  isDarkMode ? 'text-blue-300' : 'text-blue-600'
                }`}>
                  <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    )}
  </div>
);

// Collapsible Section Component
const CollapsibleSection: React.FC<{
  title: string;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  isDarkMode: boolean;
}> = ({ title, children, isExpanded, onToggle, isDarkMode }) => (
  <div>
    <button
      onClick={onToggle}
      className={`flex items-center justify-between w-full text-left mb-3 ${
        isDarkMode ? 'text-white/90 hover:text-white' : 'text-gray-900 hover:text-black'
      }`}
    >
      <h3 className="text-lg font-medium">{title}</h3>
      {isExpanded ? (
        <ChevronUp className="w-5 h-5 opacity-60" />
      ) : (
        <ChevronDown className="w-5 h-5 opacity-60" />
      )}
    </button>
    {isExpanded && children}
  </div>
);

// Images Tab Component
const ImagesTab: React.FC<{ 
  results: SearchResult[]; 
  isDarkMode: boolean;
  images?: Array<{ title: string; imageUrl: string; link: string; source: string }>;
}> = ({ results, isDarkMode, images = [] }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    {images.length > 0 ? (
      images.map((image, index) => (
        <div
          key={index}
          className={`group cursor-pointer rounded-lg overflow-hidden ${
            isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'
          } transition-all duration-200`}
          onClick={() => window.open(image.link, '_blank')}
        >
          <div className="aspect-square relative">
            <img
              src={image.imageUrl}
              alt={image.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to placeholder on image load error
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className={`hidden w-full h-full flex items-center justify-center ${
              isDarkMode ? 'bg-white/10' : 'bg-gray-100'
            }`}>
              <ImageIcon className={`w-8 h-8 ${isDarkMode ? 'text-white/40' : 'text-gray-400'}`} />
            </div>
            
            {/* Overlay with title */}
            <div className={`absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-3`}>
              <div className="text-white text-xs font-medium line-clamp-2">
                {image.title}
              </div>
            </div>
          </div>
          
          {/* Source info */}
          <div className="p-2">
            <div className={`text-xs truncate ${isDarkMode ? 'text-white/60' : 'text-gray-600'}`}>
              {image.source}
            </div>
          </div>
        </div>
      ))
    ) : (
      // Fallback placeholder when no images available
      [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div
          key={i}
          className={`aspect-square rounded-lg ${
            isDarkMode ? 'bg-white/10' : 'bg-gray-100'
          } flex items-center justify-center`}
        >
          <ImageIcon className={`w-8 h-8 ${isDarkMode ? 'text-white/40' : 'text-gray-400'}`} />
        </div>
      ))
    )}
  </div>
);

// Sources Tab Component
const SourcesTab: React.FC<{ 
  results: SearchResult[]; 
  isDarkMode: boolean; 
  perplexityResponse?: any;
}> = ({ results, isDarkMode, perplexityResponse }) => (
  <div className="space-y-4">
    {/* Perplexity Sources (if available) */}
    {perplexityResponse?.sources && perplexityResponse.sources.map((source: any) => (
      <div
        key={source.id}
        className={`p-4 rounded-lg border ${
          isDarkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50/50'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-600'
          }`}>
            <span className="text-sm font-medium">{source.id}</span>
          </div>
          <div className="flex-1">
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`font-medium hover:underline ${
                isDarkMode ? 'text-blue-300' : 'text-blue-600'
              }`}
            >
              {source.title}
            </a>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-white/60' : 'text-gray-600'}`}>
              {source.snippet}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs ${isDarkMode ? 'text-white/50' : 'text-gray-500'}`}>
                {source.domain}
              </span>
              <ExternalLink className="w-3 h-3 opacity-50" />
            </div>
          </div>
        </div>
      </div>
    ))}
    
    {/* Regular search results (fallback) */}
    {(!perplexityResponse?.sources || perplexityResponse.sources.length === 0) && results.map((result, index) => (
      <div
        key={index}
        className={`p-4 rounded-lg border ${
          isDarkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50/50'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isDarkMode ? 'bg-blue-500/20' : 'bg-blue-50'
          }`}>
            <Globe className={`w-4 h-4 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`} />
          </div>
          <div className="flex-1">
            <a
              href={result.url || result.link}
              target="_blank"
              rel="noopener noreferrer"
              className={`font-medium hover:underline ${
                isDarkMode ? 'text-blue-300' : 'text-blue-600'
              }`}
            >
              {result.title}
            </a>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-white/60' : 'text-gray-600'}`}>
              {result.snippet}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs ${isDarkMode ? 'text-white/50' : 'text-gray-500'}`}>
                {result.displayLink || (result.url ? new URL(result.url).hostname : 'Unknown source')}
              </span>
              <ExternalLink className="w-3 h-3 opacity-50" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Steps Tab Component
const StepsTab: React.FC<{ query: string; isDarkMode: boolean }> = ({ query, isDarkMode }) => (
  <div className="space-y-4">
    <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
      <h3 className={`font-medium mb-2 ${isDarkMode ? 'text-white/90' : 'text-gray-900'}`}>
        Search Process
      </h3>
      <ol className="space-y-2">
        <li className={`text-sm flex items-center gap-2 ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>
          <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
            isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-600'
          }`}>1</span>
          Analyzed search query: "{query}"
        </li>
        <li className={`text-sm flex items-center gap-2 ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>
          <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
            isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-600'
          }`}>2</span>
          Retrieved relevant sources from multiple databases
        </li>
        <li className={`text-sm flex items-center gap-2 ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>
          <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
            isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-600'
          }`}>3</span>
          Synthesized information into structured response
        </li>
      </ol>
    </div>
  </div>
);

// Helper Functions
function generateSummary(query: string, results: SearchResult[]): string {
  if (results.length === 0) return `No results found for "${query}".`;
  
  const firstResult = results[0];
  const sources = [...new Set(results.map(r => r.displayLink || (r.url ? new URL(r.url).hostname : 'source')))];
  
  return `${firstResult.snippet} According to reports from <strong>${sources.slice(0, 3).join(', ')}</strong> and other sources, this topic involves multiple perspectives and recent developments.`;
}

function extractRecentEvents(results: SearchResult[]): string[] {
  return results.slice(0, 3).map(result => 
    `${result.snippet.substring(0, 150)}...`
  );
}

function extractContext(results: SearchResult[]): string[] {
  return results.slice(1, 4).map(result => 
    result.snippet.split('.')[0] + '.'
  );
}

function extractMainFindings(results: SearchResult[]): string[] {
  return results.slice(0, 4).map(result => {
    const sentences = result.snippet.split('.');
    return sentences[0] + (sentences[1] ? '. ' + sentences[1] : '') + '.';
  });
}

function extractSources(results: SearchResult[]): Array<{ name: string; count: number; icon: string }> {
  const sourceMap = new Map<string, number>();
  
  results.forEach(result => {
    const source = result.displayLink || (result.url ? new URL(result.url).hostname : 'Unknown');
    sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
  });
  
  return Array.from(sourceMap.entries()).map(([name, count]) => ({
    name,
    count,
    icon: getSourceIcon(name)
  }));
}

function getSourceIcon(source: string): string {
  if (source.includes('aljazeera')) return '🌍';
  if (source.includes('reuters')) return '📰';
  if (source.includes('bbc')) return '📺';
  if (source.includes('cnn')) return '📡';
  return '🌐';
}

function generateRelatedQuestions(query: string, results: SearchResult[]): string[] {
  const topics = extractTopicsFromQuery(query);
  const mainTopic = topics[0] || 'this topic';
  const secondaryTopic = topics[1] || 'related areas';
  
  // Generate natural language suggestions based on query context
  const suggestions = [];
  
  // Check if query is about politics/diplomacy
  if (query.toLowerCase().includes('trump') || query.toLowerCase().includes('president') || 
      query.toLowerCase().includes('diplomatic') || query.toLowerCase().includes('meeting')) {
    suggestions.push(
      `Show latest timeline of meetings between ${mainTopic} leaders`,
      `What did ${mainTopic} discuss about recent negotiations`,
      `How did regional governments react to the ${secondaryTopic}`,
      `Provide statements from ${mainTopic} about the recent developments`,
      `How could the meeting affect international relations`
    );
  }
  // Check if query is about technology
  else if (query.toLowerCase().includes('ai') || query.toLowerCase().includes('technology') ||
           query.toLowerCase().includes('tech') || query.toLowerCase().includes('software')) {
    suggestions.push(
      `Show latest developments in ${mainTopic} technology`,
      `What are the implications of ${mainTopic} for ${secondaryTopic}`,
      `How are companies implementing ${mainTopic}`,
      `What do experts predict about ${mainTopic} future`,
      `Compare ${mainTopic} with alternative approaches`
    );
  }
  // Check if query is about health/medical
  else if (query.toLowerCase().includes('health') || query.toLowerCase().includes('medical') ||
           query.toLowerCase().includes('disease') || query.toLowerCase().includes('treatment')) {
    suggestions.push(
      `Show latest research on ${mainTopic} treatments`,
      `What are the symptoms and causes of ${mainTopic}`,
      `How effective are current ${mainTopic} therapies`,
      `What do medical experts recommend for ${mainTopic}`,
      `Compare different approaches to treating ${mainTopic}`
    );
  }
  // Generic suggestions for other topics
  else {
    suggestions.push(
      `Show latest timeline of ${mainTopic} developments`,
      `What are the key factors affecting ${mainTopic}`,
      `How might ${mainTopic} impact ${secondaryTopic}`,
      `What do experts say about ${mainTopic}`,
      `Compare different perspectives on ${mainTopic}`
    );
  }
  
  return suggestions.slice(0, 5);
}

function extractTopicsFromQuery(query: string): string[] {
  const words = query.toLowerCase().split(' ');
  return words.filter(word => word.length > 3 && !['and', 'the', 'with', 'for'].includes(word));
}

function extractImages(results: SearchResult[]): Array<{ title: string; imageUrl: string; link: string; source: string }> {
  // Check multiple possible locations for images in the search results
  console.log('🖼️ Extracting images from results:', results);
  
  // FIXED: Check if images are in the data object (correct API response structure)
  const resultsData = (results as any).data;
  if (resultsData && resultsData.images && Array.isArray(resultsData.images)) {
    console.log('🖼️ Found images in data.images:', resultsData.images);
    return resultsData.images;
  }
  
  // Check if images are in the first result
  const firstResult = results[0] as any;
  if (firstResult && firstResult.images && Array.isArray(firstResult.images)) {
    console.log('🖼️ Found images in first result:', firstResult.images);
    return firstResult.images;
  }
  
  // Check if images are at the root level of results
  const rootImages = (results as any).images;
  if (rootImages && Array.isArray(rootImages)) {
    console.log('🖼️ Found images at root level:', rootImages);
    return rootImages;
  }
  
  // Check if any result has images property
  for (const result of results) {
    const resultWithImages = result as any;
    if (resultWithImages.images && Array.isArray(resultWithImages.images)) {
      console.log('🖼️ Found images in result:', resultWithImages.images);
      return resultWithImages.images;
    }
  }
  
  console.log('🖼️ No images found in results');
  return [];
}

// Helper function to generate LLM-powered contextual search queries
async function generateContextualSearchQuery(
  relatedQuestion: string, 
  originalQuery: string, 
  searchResults: SearchResult[]
): Promise<string> {
  try {
    // Extract context from search results
    const searchContext = searchResults.slice(0, 3).map(result => ({
      title: result.title,
      snippet: result.snippet?.substring(0, 200) + '...',
      source: result.source || result.displayLink
    }));

    // Use ToolRegistry to call LLM for contextual query generation
    const { toolRegistry } = await import('../services/ToolRegistry');
    
    const prompt = `Based on the user's original search and results, generate a specific, actionable search query for the related question.

ORIGINAL SEARCH: "${originalQuery}"

SEARCH RESULTS CONTEXT:
${searchContext.map(r => `- ${r.title}: ${r.snippet} (${r.source})`).join('\n')}

RELATED QUESTION: "${relatedQuestion}"

REQUIREMENTS:
1. Generate a specific search query that builds on the search results context
2. Make it actionable and focused, not generic
3. Include specific entities, dates, or topics from the results when relevant
4. Keep it concise but comprehensive
5. Focus on deeper exploration of the topic

EXAMPLES:
- If original was "Trump Qatar meeting" and question is "latest developments", generate: "Trump Qatar diplomatic meeting January 2025 latest developments outcomes"
- If original was "AI technology" and question is "implications for healthcare", generate: "AI artificial intelligence healthcare applications 2025 medical implications"

Generate a specific search query now (return only the query, no explanation):`;

    const llmResult = await toolRegistry.execute('llm-completion', {
      prompt,
      model: 'accounts/fireworks/models/gpt-oss-120b',
      temperature: 0.7,
      maxTokens: 100
    }, {
      sessionId: 'contextual-search',
      userId: 'system',
      startTime: Date.now()
    });

    if (llmResult.success && llmResult.data) {
      const generatedQuery = (llmResult.data.text || llmResult.data.content || llmResult.data.response || '').trim();
      
      // Clean up the response (remove quotes, extra text)
      const cleanQuery = generatedQuery
        .replace(/^["']|["']$/g, '') // Remove quotes
        .replace(/^Query:\s*/i, '') // Remove "Query:" prefix
        .replace(/\n.*$/s, '') // Remove everything after first line
        .trim();
      
      return cleanQuery || relatedQuestion; // Fallback to original question
    }
    
    return relatedQuestion; // Fallback if LLM fails
    
  } catch (error) {
    console.error('🚨 LLM contextual query generation failed:', error);
    return relatedQuestion; // Fallback to original question
  }
}

export default NeuraPlaySearchResults;



