/**
 * 💡 MOBILE NEWS PAGE - Unified AI-Driven Discovery
 * 
 * ARCHITECTURE:
 * - ONE unified news session (not per-topic)
 * - ONE command bar at bottom (always visible)
 * - Topics are filters within the same session
 * - Expandable source cards (top 2 + expand)
 * - Single persistence entry per session
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';
import { 
  Newspaper, RefreshCw, Globe,
  Zap, Leaf, Cpu,
  ExternalLink, ArrowLeft, 
  Compass, Briefcase,
  Lightbulb, Send, FlaskConical, ChevronDown, ChevronUp
} from 'lucide-react';
import { serviceContainer } from '../../services/ServiceContainer';
import { MEMORY_CATEGORIES } from '../../services/MemoryCategoryRegistry';

import { newsOrchestrator, type NewsStory, type ComprehensiveNewsResponse } from '../../services/NewsOrchestrator';

// ===== NEWS SESSION KEY - One per day =====
const getNewsSessionKey = () => {
  const today = new Date().toISOString().split('T')[0];
  return `news_session_${today}`;
};

// ===== EXPLORATION CARDS =====
interface ExplorationCard {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  query: string;
  gradient: string;
  iconColor: string;
}

const EXPLORATION_CARDS: ExplorationCard[] = [
  {
    id: 'comprehensive',
    icon: Compass,
    title: 'Today\'s Headlines',
    description: 'AI-curated overview of what matters globally',
    query: 'whats the news',
    gradient: 'from-violet-500/20 to-purple-500/20',
    iconColor: '#8B5CF6'
  },
  {
    id: 'breaking',
    icon: Zap,
    title: 'Breaking Now',
    description: 'Urgent stories developing right now',
    query: 'breaking news today urgent',
    gradient: 'from-red-500/20 to-orange-500/20',
    iconColor: '#EF4444'
  },
  {
    id: 'tech',
    icon: Cpu,
    title: 'Tech & AI',
    description: 'Latest in technology and artificial intelligence',
    query: 'technology AI news latest developments',
    gradient: 'from-cyan-500/20 to-blue-500/20',
    iconColor: '#06B6D4'
  },
  {
    id: 'world',
    icon: Globe,
    title: 'World Affairs',
    description: 'International politics and diplomacy',
    query: 'world politics international news today',
    gradient: 'from-blue-500/20 to-indigo-500/20',
    iconColor: '#3B82F6'
  },
  {
    id: 'climate',
    icon: Leaf,
    title: 'Climate & Environment',
    description: 'Environmental news and sustainability',
    query: 'climate environment sustainability news',
    gradient: 'from-green-500/20 to-emerald-500/20',
    iconColor: '#10B981'
  },
  {
    id: 'business',
    icon: Briefcase,
    title: 'Business & Markets',
    description: 'Economy, finance and market trends',
    query: 'business economy markets financial news',
    gradient: 'from-amber-500/20 to-yellow-500/20',
    iconColor: '#F59E0B'
  },
];

// Quick filter chips
const QUICK_FILTERS = [
  { id: 'all', label: 'All', icon: Newspaper },
  { id: 'breaking', label: 'Breaking', icon: Zap },
  { id: 'tech', label: 'Tech', icon: Cpu },
  { id: 'world', label: 'World', icon: Globe },
  { id: 'climate', label: 'Climate', icon: Leaf },
];

// ===== PERSISTENCE =====
const NEWS_CACHE_KEY = 'neuraplay_mobile_news_cache';
const NEWS_CACHE_EXPIRY = 15 * 60 * 1000;

const loadCachedNews = (): { data: ComprehensiveNewsResponse | null; filter: string; query: string; aiSummary: string } => {
  try {
    const cached = localStorage.getItem(NEWS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.timestamp && Date.now() - parsed.timestamp < NEWS_CACHE_EXPIRY) {
        return { 
          data: parsed.data, 
          filter: parsed.filter || 'all', 
          query: parsed.query || '',
          aiSummary: parsed.aiSummary || ''  // 🎯 Cache AI summary too
        };
      }
    }
  } catch (e) {
    console.warn('📰 Failed to load cached news');
  }
  return { data: null, filter: 'all', query: '', aiSummary: '' };
};

const saveNewsToCache = (data: ComprehensiveNewsResponse, filter: string, query: string, aiSummary: string = '') => {
  try {
    localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({
      data, filter, query, aiSummary, timestamp: Date.now()  // 🎯 Include AI summary
    }));
  } catch (e) {
    console.warn('📰 Failed to save news to cache');
  }
};

// ===== TYPEWRITER HOOK =====
const useTypewriter = (text: string, speed: number = 12) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  
  React.useEffect(() => {
    if (!text) {
      setDisplayedText('');
      setIsComplete(true);
      return;
    }
    
    setDisplayedText('');
    setIsComplete(false);
    let i = 0;
    
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, speed);
    
    return () => clearInterval(interval);
  }, [text, speed]);
  
  return { displayedText, isComplete };
};

// ===== SOURCE CARD COMPONENT =====
interface SourceCardProps {
  story: NewsStory;
  index: number;
  isDarkMode: boolean;
}

const SourceCard: React.FC<SourceCardProps> = ({ story, index, isDarkMode }) => (
  <motion.a
    href={story.url}
    target="_blank"
    rel="noopener noreferrer"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className={`block p-3 rounded-xl transition-all ${
      isDarkMode 
        ? 'bg-stone-800/60 hover:bg-stone-800 border border-stone-700/50' 
        : 'bg-white/80 hover:bg-white border border-stone-200 shadow-sm'
    }`}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
            isDarkMode ? 'bg-purple-500/30 text-purple-300' : 'bg-purple-100 text-purple-600'
          }`}>
            {index + 1}
          </span>
          <span className={`text-xs font-medium truncate ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
            {story.source}
          </span>
          {story.isBreaking && (
            <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white">
              LIVE
            </span>
          )}
        </div>
        <p className={`text-sm font-medium line-clamp-2 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
          {story.title}
        </p>
      </div>
      <ExternalLink className={`flex-shrink-0 w-4 h-4 mt-1 ${isDarkMode ? 'text-stone-500' : 'text-stone-400'}`} />
    </div>
  </motion.a>
);

// ===== MAIN COMPONENT =====
const MobileNewsPage: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { user } = useUser();
  
  const cachedNews = loadCachedNews();
  
  // Unified state
  const [isLoading, setIsLoading] = useState(false);
  const [newsData, setNewsData] = useState<ComprehensiveNewsResponse | null>(cachedNews.data);
  const [activeFilter, setActiveFilter] = useState<string>(cachedNews.filter);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string>(cachedNews.query);
  const [inputValue, setInputValue] = useState('');
  
  // AI summary state - 🎯 Load from cache to prevent regeneration on navigation
  const [aiSummary, setAiSummary] = useState<string>(cachedNews.aiSummary || '');
  const [isDeepResearch, setIsDeepResearch] = useState(false);
  
  // Expandable sources
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  
  // User name for personalization
  const [userName, setUserName] = useState<string>('');
  
  // Session tracking for unified persistence
  const sessionQueriesRef = useRef<string[]>([]);
  const sessionStoredRef = useRef(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Typewriter
  const { displayedText: typedSummary, isComplete: summaryComplete } = useTypewriter(aiSummary);

  // Fetch user name on mount - ONLY name category
  React.useEffect(() => {
    const fetchUserName = async () => {
      try {
        const { memoryDatabaseBridge } = await import('../../services/MemoryDatabaseBridge');
        const userId = user?.id || 'anonymous';
        // Use searchMemories with name category filter
        const result = await memoryDatabaseBridge.searchMemories({
          userId,
          query: 'user name',
          categories: ['name'],
          limit: 1
        });
        if (result.success && result.memories && result.memories.length > 0) {
          const nameMemory = result.memories[0];
          const name = nameMemory.memory_value || '';
          if (name && name.length > 1 && name.length < 50) {
            setUserName(name);
          }
        }
      } catch (err) {
        console.warn('📰 Could not fetch user name');
      }
    };
    fetchUserName();
  }, [user?.id]);

  // ===== UNIFIED SESSION PERSISTENCE =====
  // Store once per session when user leaves or after significant interaction
  const storeSessionToMemory = useCallback(async () => {
    if (sessionStoredRef.current || sessionQueriesRef.current.length === 0) return;
    
    try {
      const { memoryDatabaseBridge } = await import('../../services/MemoryDatabaseBridge');
      
      const sessionContent = `
NEWS SESSION: ${new Date().toLocaleDateString()}
Topics explored: ${sessionQueriesRef.current.join(', ')}
Total queries: ${sessionQueriesRef.current.length}
      `.trim();
      
      await memoryDatabaseBridge.storeMemory({
        userId: user?.id || 'anonymous',
        key: getNewsSessionKey(),
        value: sessionContent,
        metadata: {
          category: MEMORY_CATEGORIES.NEWS_DISCOVERY,
          type: 'news_session',
          queries: sessionQueriesRef.current,
          queryCount: sessionQueriesRef.current.length,
          timestamp: new Date().toISOString()
        }
      });
      
      sessionStoredRef.current = true;
      console.log('💾 News session stored');
    } catch (err) {
      console.warn('⚠️ Failed to store news session');
    }
  }, [user?.id]);

  // Store session on unmount
  React.useEffect(() => {
    return () => {
      storeSessionToMemory();
    };
  }, [storeSessionToMemory]);

  // ===== GENERATE AI SUMMARY =====
  const generateAISummary = useCallback(async (stories: NewsStory[], query: string, isDeep: boolean = false) => {
    if (!stories || stories.length === 0) return;
    
    setAiSummary(isDeep ? 'Synthesizing research...' : 'Analyzing sources...');
    
    try {
      await serviceContainer.waitForReady();
      const aiRouter = await serviceContainer.getAsync('aiRouter') as any;
      
      const storyContext = stories.slice(0, 8).map((s, i) => 
        `[${i + 1}] ${s.title} (${s.source}): ${s.snippet || ''}`
      ).join('\n');
      
      const personalTouch = userName ? `for ${userName}` : '';
      
      const prompt = isDeep 
        ? `Synthesize these sources ${personalTouch} about "${query}" with inline citations (1), (2), etc.

Sources:
${storyContext}

Write 2-3 flowing paragraphs with citations. Be insightful.`
        : `Summarize these articles ${personalTouch} about "${query}" with inline citations (1), (2), etc.

Articles:
${storyContext}

Write a 2-paragraph summary with citations. Be engaging.`;

      if (!aiRouter) {
        setAiSummary(stories.slice(0, 3).map((s, i) => `${s.title} (${i + 1})`).join('. '));
        return;
      }
      
      const response = await aiRouter.processRequest({
        message: prompt,
        sessionId: crypto.randomUUID(),
        userId: user?.id || 'anonymous',
        mode: 'chat',
        constraints: { maxTokens: isDeep ? 500 : 350, temperature: 0.7 },
        // 🎯 NEWS-SPECIFIC: Skip personal memories - we only want news summarization
        contextOptions: {
          skipPersonalMemories: true,
          skipLearningContext: true,
          skipConversationHistory: true
        }
      });
      
      const summary = response.response || 'Unable to generate summary.';
      setAiSummary(summary);
      
      // 🎯 Save to cache so it persists when user navigates away
      const currentCache = loadCachedNews();
      if (currentCache.data) {
        saveNewsToCache(currentCache.data, currentCache.filter, currentCache.query, summary);
      }
      
    } catch (err) {
      console.error('AI Summary failed:', err);
      const fallback = `${query}: ${stories.slice(0, 3).map((s, i) => `${s.title} (${i + 1})`).join('. ')}`;
      setAiSummary(fallback);
    }
  }, [user?.id, userName]);

  // ===== FETCH NEWS =====
  const fetchNews = useCallback(async (query: string, filterId?: string, deepResearch: boolean = false) => {
    // Instant transition - show results view immediately
    setNewsData({ stories: [], images: [], categories: [], summary: '', totalResults: 0, searchTime: 0 });
    setIsLoading(true);
    setError(null);
    setLastQuery(query);
    setActiveFilter(filterId || 'all');
    setIsDeepResearch(deepResearch);
    setSourcesExpanded(false);
    
    // Track in session
    sessionQueriesRef.current.push(query);
    
    setAiSummary(deepResearch ? 'Initiating deep research...' : 'Discovering insights...');
    
    try {
      let response;
      if (deepResearch) {
        const { deepResearchService } = await import('../../services/DeepResearchService');
        const researchResult = await deepResearchService.research(query, '', crypto.randomUUID());
        
        response = {
          stories: researchResult.sources.map((s) => ({
            title: s.title,
            url: s.url,
            snippet: s.snippet || s.deepContent?.slice(0, 200) || '',
            source: s.domain,
            category: 'research' as const,
            isBreaking: false,
            timestamp: new Date().toISOString(),
            relevanceScore: 0.9
          })),
          images: researchResult.images.map(img => ({
            imageUrl: img.url,
            title: img.title,
            link: img.sourceUrl,
            source: 'Research'
          })),
          categories: [],
          summary: researchResult.content,
          totalResults: researchResult.sources.length,
          searchTime: researchResult.metadata.processingTimeMs
        } as ComprehensiveNewsResponse;
        
        setAiSummary(researchResult.content);
      } else {
        response = await newsOrchestrator.orchestrateNewsSearch({
          query,
          userId: user?.id || 'anonymous',
          sessionId: crypto.randomUUID()
        });
      }
      
      setNewsData(response);
      saveNewsToCache(response, filterId || 'all', query);
      
      if (!deepResearch && response.stories && response.stories.length > 0) {
        await generateAISummary(response.stories, query, false);
      }
    } catch (err) {
      console.error('Fetch failed:', err);
      setError('Unable to load content. Please try again.');
      setNewsData(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, generateAISummary]);

  // ===== HANDLE SEARCH =====
  const handleSearch = () => {
    if (!inputValue.trim()) return;
    fetchNews(inputValue.trim(), 'custom', isDeepResearch);
    setInputValue('');
  };

  // ===== RENDER CITATION =====
  const renderSummaryWithCitations = () => {
    const parts = typedSummary.split(/\((\d+)\)/g);
    
    return parts.map((part, idx) => {
      if (/^\d+$/.test(part)) {
        const sourceIndex = parseInt(part) - 1;
        if (sourceIndex >= 0 && sourceIndex < (newsData?.stories?.length || 0)) {
          return (
            <a
              key={idx}
              href={newsData?.stories[sourceIndex]?.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full mx-0.5 transition-colors ${
                isDarkMode 
                  ? 'bg-purple-500/30 text-purple-300 hover:bg-purple-500/50' 
                  : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
              }`}
            >
              {sourceIndex + 1}
            </a>
          );
        }
      }
      return <span key={idx}>{part}</span>;
    });
  };

  // ===== RENDER EXPLORATION VIEW =====
  const renderExplorationView = () => (
    <div className="space-y-6 pb-24">
      {/* Hero */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-4"
      >
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Lightbulb className={`w-6 h-6 ${isDarkMode ? 'text-purple-400' : 'text-purple-500'}`} />
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
            Inspiration
          </h1>
        </div>
        <p className={`text-sm ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
          AI-powered discovery
        </p>
      </motion.div>

      {/* Topic Cards */}
      <div className="grid grid-cols-2 gap-3">
        {EXPLORATION_CARDS.map((card, index) => (
          <motion.button
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + index * 0.03 }}
            onClick={() => fetchNews(card.query, card.id)}
            className={`p-4 rounded-2xl text-left transition-all active:scale-95 ${
              isDarkMode 
                ? `bg-gradient-to-br ${card.gradient} border border-white/5` 
                : `bg-gradient-to-br ${card.gradient} border border-stone-200/50`
            }`}
          >
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ backgroundColor: `${card.iconColor}20` }}
            >
              <card.icon className="w-5 h-5" style={{ color: card.iconColor }} />
            </div>
            <p className={`font-semibold text-sm mb-1 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
              {card.title}
            </p>
            <p className={`text-xs line-clamp-2 ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
              {card.description}
            </p>
          </motion.button>
        ))}
      </div>

      {/* Deep Research */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        onClick={() => {
          const query = inputValue.trim() || 'latest research developments';
          fetchNews(query, 'academic', true);
        }}
        className={`w-full p-4 rounded-2xl flex items-center justify-between ${
          isDarkMode 
            ? 'bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border border-emerald-500/20' 
            : 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200'
        } transition-all`}
      >
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isDarkMode ? 'bg-emerald-500/20' : 'bg-emerald-100'
          }`}>
            <FlaskConical className={`w-5 h-5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
          </div>
          <div className="text-left">
            <p className={`font-semibold text-sm ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
              Deep Research Mode
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-emerald-400/70' : 'text-emerald-600/70'}`}>
              Academic & empirical sources
            </p>
          </div>
        </div>
      </motion.button>
    </div>
  );

  // ===== RENDER RESULTS VIEW =====
  const renderResultsView = () => {
    if (!newsData) return null;

    const hasImages = newsData.images && newsData.images.length > 0;
    const stories = newsData.stories || [];
    const visibleSources = sourcesExpanded ? stories : stories.slice(0, 2);

    return (
      <div className="space-y-4 pb-24">
        {/* Header with back + filters */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setNewsData(null)}
            className={`flex items-center space-x-2 ${isDarkMode ? 'text-stone-300' : 'text-stone-600'}`}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
          <button
            onClick={() => fetchNews(lastQuery, activeFilter, isDeepResearch)}
            disabled={isLoading}
            className={`p-2 rounded-xl ${isDarkMode ? 'hover:bg-stone-800' : 'hover:bg-stone-100'}`}
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''} ${
              isDarkMode ? 'text-stone-400' : 'text-stone-500'
            }`} />
          </button>
        </div>

        {/* Quick Filters */}
        <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
          {QUICK_FILTERS.map((filter) => (
            <button
              key={filter.id}
              onClick={() => {
                const card = EXPLORATION_CARDS.find(c => c.id === filter.id);
                fetchNews(card?.query || 'whats the news', filter.id);
              }}
              className={`flex-shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                activeFilter === filter.id
                  ? 'bg-purple-500 text-white'
                  : isDarkMode ? 'bg-stone-800 text-stone-300' : 'bg-stone-100 text-stone-600'
              }`}
            >
              <filter.icon className="w-3.5 h-3.5" />
              <span>{filter.label}</span>
            </button>
          ))}
        </div>

        {/* Images at TOP */}
        {hasImages && (
          <div className="space-y-2">
            {newsData.images[0] && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative aspect-video rounded-2xl overflow-hidden"
              >
                <img 
                  src={newsData.images[0].imageUrl} 
                  alt={newsData.images[0].title}
                  className="w-full h-full object-cover"
                  loading="eager"
                  onError={(e) => { (e.target as HTMLElement).parentElement!.style.display = 'none'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white text-sm font-medium line-clamp-2">{newsData.images[0].title}</p>
                </div>
              </motion.div>
            )}
            
            {newsData.images.length > 1 && (
              <div className="grid grid-cols-2 gap-2">
                {newsData.images.slice(1, 3).map((img, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.05 * (index + 1) }}
                    className="relative aspect-video rounded-xl overflow-hidden"
                  >
                    <img 
                      src={img.imageUrl} 
                      alt={img.title}
                      className="w-full h-full object-cover"
                      loading="eager"
                      onError={(e) => { (e.target as HTMLElement).parentElement!.style.display = 'none'; }}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Summary */}
        {aiSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`p-4 rounded-2xl ${
              isDeepResearch
                ? isDarkMode 
                  ? 'bg-emerald-900/20 border border-emerald-500/20' 
                  : 'bg-emerald-50/50 border border-emerald-200/50'
                : isDarkMode 
                  ? 'bg-purple-900/20 border border-purple-500/20' 
                  : 'bg-purple-50/50 border border-purple-200/50'
            }`}
          >
            <div className={`text-sm leading-relaxed ${
              isDarkMode ? 'text-stone-200' : 'text-stone-700'
            }`}>
              {renderSummaryWithCitations()}
              {!summaryComplete && (
                <span className={`inline-block w-0.5 h-4 ml-0.5 animate-pulse ${
                  isDeepResearch ? 'bg-emerald-500' : 'bg-purple-500'
                }`} />
              )}
            </div>
          </motion.div>
        )}

        {/* EXPANDABLE SOURCE CARDS */}
        {stories.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium uppercase tracking-wider ${
                isDarkMode ? 'text-stone-500' : 'text-stone-400'
              }`}>
                Sources ({stories.length})
              </span>
            </div>
            
            {/* Source cards */}
            <div className="space-y-2">
              {visibleSources.map((story, index) => (
                <SourceCard key={index} story={story} index={index} isDarkMode={isDarkMode} />
              ))}
            </div>
            
            {/* Expand/Collapse */}
            {stories.length > 2 && (
              <button
                onClick={() => setSourcesExpanded(!sourcesExpanded)}
                className={`w-full py-2 rounded-xl flex items-center justify-center space-x-2 text-sm font-medium transition-colors ${
                  isDarkMode 
                    ? 'bg-stone-800/50 text-stone-400 hover:bg-stone-800' 
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                }`}
              >
                {sourcesExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    <span>Show less</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    <span>Show all {stories.length} sources</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Loading */}
        {isLoading && stories.length === 0 && (
          <div className="flex justify-center py-8">
            <div className={`w-8 h-8 rounded-full border-2 border-t-purple-500 animate-spin ${
              isDarkMode ? 'border-stone-700' : 'border-stone-200'
            }`} />
          </div>
        )}
      </div>
    );
  };

  // ===== RENDER ERROR =====
  const renderError = () => (
    <div className="text-center py-12">
      <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
        isDarkMode ? 'bg-red-500/20' : 'bg-red-100'
      }`}>
        <Newspaper className={`w-8 h-8 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`} />
      </div>
      <p className={`text-sm mb-4 ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>{error}</p>
      <div className="flex justify-center space-x-3">
        <button
          onClick={() => { setError(null); setNewsData(null); }}
          className={`px-4 py-2 rounded-xl text-sm ${isDarkMode ? 'bg-stone-800 text-stone-300' : 'bg-stone-100 text-stone-600'}`}
        >
          Go Back
        </button>
        <button
          onClick={() => fetchNews(lastQuery || 'whats the news')}
          className="px-4 py-2 bg-purple-500 text-white rounded-xl text-sm"
        >
          Retry
        </button>
      </div>
    </div>
  );

  // ===== MAIN RENDER =====
  return (
    <div className={`h-full flex flex-col ${
      isDarkMode ? 'bg-stone-900' : 'bg-gradient-to-br from-purple-50/30 via-white to-stone-50'
    }`}>
      {/* Header */}
      {!newsData && !error && (
        <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-stone-800' : 'border-stone-200/50'}`}>
          <div className="flex items-center space-x-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'
            }`}>
              <Newspaper className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h1 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>News</h1>
              <p className={`text-xs ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>AI-powered discovery</p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {error ? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {renderError()}
            </motion.div>
          ) : newsData ? (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {renderResultsView()}
            </motion.div>
          ) : (
            <motion.div key="explore" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {renderExplorationView()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ===== ONE UNIFIED COMMAND BAR - Always visible ===== */}
      <div className={`flex-shrink-0 p-3 border-t ${
        isDarkMode ? 'border-stone-800 bg-stone-900' : 'border-stone-200 bg-white'
      }`}>
        <div className={`flex items-center space-x-2 p-2 rounded-2xl ${
          isDarkMode ? 'bg-stone-800 border border-stone-700' : 'bg-stone-50 border border-stone-200'
        }`}>
          {/* Deep research toggle */}
          <button
            onClick={() => setIsDeepResearch(!isDeepResearch)}
            className={`p-2 rounded-xl flex-shrink-0 transition-colors ${
              isDeepResearch 
                ? 'bg-emerald-500/20 text-emerald-500' 
                : isDarkMode ? 'bg-stone-700 text-stone-400' : 'bg-stone-100 text-stone-500'
            }`}
            title={isDeepResearch ? 'Deep research mode' : 'Quick search'}
          >
            <FlaskConical className="w-4 h-4" />
          </button>
          
          {/* Input */}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={isDeepResearch ? "Deep research any topic..." : "Search any news topic..."}
            className={`flex-1 px-3 py-2 rounded-xl text-sm outline-none ${
              isDarkMode 
                ? 'bg-transparent text-white placeholder-stone-500' 
                : 'bg-transparent text-stone-800 placeholder-stone-400'
            }`}
          />
          
          {/* Send */}
          <button
            onClick={handleSearch}
            disabled={!inputValue.trim() || isLoading}
            className={`p-2 rounded-xl flex-shrink-0 transition-all ${
              inputValue.trim() && !isLoading
                ? isDeepResearch 
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                  : 'bg-purple-600 hover:bg-purple-500 text-white'
                : isDarkMode ? 'bg-stone-700 text-stone-500' : 'bg-stone-200 text-stone-400'
            }`}
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileNewsPage;
