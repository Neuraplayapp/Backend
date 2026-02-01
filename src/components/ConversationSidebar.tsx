// Narrow Icon Sidebar - Claude-style conversation navigation
import React, { useState, useEffect } from 'react';
import { Plus, MessageCircle, FileText, BarChart3, Code, Search, X, Trash2, Layers, ChevronRight, Eye } from 'lucide-react';
import { conversationService, type Conversation } from '../services/ConversationService';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import useResponsiveLayout from '../hooks/useResponsiveLayout';
import { canvasAccessTracker, type CanvasAccessRecord } from '../services/CanvasAccessTracker';
import { useCanvasStore } from '../stores/canvasStore';

interface ConversationSidebarProps {
  onConversationChange?: (conversation: Conversation) => void;
  onQuickAction?: (action: 'chart' | 'code' | 'document') => void;
}

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({ 
  onConversationChange,
  onQuickAction
}) => {
  const { isDarkMode } = useTheme();
  const { user } = useUser();
  const responsive = useResponsiveLayout();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(!responsive.isMobile); // Collapsed on mobile by default
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Conversation[]>([]);
  
  // 🎨 Canvas Browser State
  const [showCanvasBrowser, setShowCanvasBrowser] = useState(false);
  const [canvasRecords, setCanvasRecords] = useState<CanvasAccessRecord[]>([]);
  const [canvasFilter, setCanvasFilter] = useState<'all' | 'document' | 'code' | 'chart'>('all');

  useEffect(() => {
    loadConversations();
    loadCanvasRecords();
  }, []);
  
  // Load canvas records for browser
  const loadCanvasRecords = () => {
    try {
      // Sync with canvas store first
      canvasAccessTracker.syncWithCanvasStore();
      const records = canvasAccessTracker.getCanvasesByType(canvasFilter);
      setCanvasRecords(records);
    } catch (error) {
      console.error('Error loading canvas records:', error);
      setCanvasRecords([]);
    }
  };
  
  // Refresh canvas records when filter changes
  useEffect(() => {
    if (showCanvasBrowser) {
      loadCanvasRecords();
    }
  }, [canvasFilter, showCanvasBrowser]);

  const loadConversations = () => {
    try {
      const allConversations = conversationService.getAllConversations();
      setConversations(Array.isArray(allConversations) ? allConversations : []);
      
      // FIXED: Only get active conversation if we don't have one set
      if (!activeConversationId) {
        const active = conversationService.getActiveConversation();
        setActiveConversationId(active?.id || null);
      }
    } catch (error) {
      console.error('Error loading conversations from sidebar:', error);
      setConversations([]);
      setActiveConversationId(null);
    }
  };

  const handleNewChat = () => {
    // Create conversation IMMEDIATELY - never block UI
    const newConv = conversationService.createNewConversation();
    
    // 🎯 CRITICAL FIX: Sync canvas store to new conversation BEFORE calling onConversationChange
    // This prevents the AIRouter from finding "looming" canvas elements from old conversations
    useCanvasStore.getState().setCurrentConversation(newConv.id);
    console.log('🆕 New chat created, canvas synced to:', newConv.id);
    
    loadConversations();
    onConversationChange?.(newConv);
    
    // 🌟 PROACTIVE GREETING: Try to generate in background (fire-and-forget)
    // If it fails, who cares - conversation still works fine
    if (user?.id) {
      generateProactiveGreeting(newConv.id).catch(err => {
        console.log('⚠️ Greeting generation failed (non-critical):', err);
      });
    }
  };
  
  /**
   * 🌟 CONTEXTUAL PROACTIVE GREETING GENERATOR
   * 
   * Generates personalized greeting based on LAST CONVERSATION context:
   * 
   * Example flow:
   * - Last chat: User was stressed about math bachelor's and mother not understanding
   * - New chat opens
   * - Greeting: "Good evening Sammy! Last time you were feeling stressed about your studies 
   *   and things with your mom. How are you doing now? It's a sunny evening in UAE, 25°C."
   * 
   * NOT a memory dump - contextual check-in based on where they left off.
   */
  // Greeting now handled by ChatHandler.ts when user sends first message
  const generateProactiveGreeting = async (sessionId: string) => {
    console.log('⏭️ Skipping proactive greeting - handled by ChatHandler on first message', { sessionId });
  };

  const handleSwitchConversation = (conversationId: string) => {
    const conv = conversationService.switchToConversation(conversationId);
    if (conv) {
      setActiveConversationId(conversationId);
      onConversationChange?.(conv);
      setShowSearch(false); // Close search when switching
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      try {
        const results = conversationService.searchConversations(query);
        setSearchResults(Array.isArray(results) ? results : []);
      } catch (error) {
        console.error('Error searching conversations:', error);
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleDeleteConversation = (conversationId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent conversation switching
    
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      console.log('🗑️ ConversationSidebar: Deleting conversation:', conversationId);
      const success = conversationService.deleteConversation(conversationId);
      console.log('🗑️ ConversationSidebar: Delete result:', success);
      
      if (success) {
        // STEP 1: Clear search immediately to prevent showing deleted items
        setSearchQuery('');
        setSearchResults([]);
        
        // STEP 2: Force reload conversations from service
        loadConversations();
        
        // STEP 3: If we deleted the active conversation, switch to the new active one
        if (activeConversationId === conversationId) {
          const newActive = conversationService.getActiveConversation();
          console.log('🔄 ConversationSidebar: Switching to new active conversation:', newActive?.id);
          setActiveConversationId(newActive?.id || null);
          onConversationChange?.(newActive);
        }
        
        // STEP 4: Force UI update by clearing and reloading state
        setTimeout(() => {
          console.log('🔄 ConversationSidebar: Force refreshing conversation list');
          setConversations([]); // Clear first
          loadConversations(); // Then reload
        }, 100);
        
        console.log('✅ ConversationSidebar: Deletion UI cleanup completed');
      } else {
        console.error('❌ ConversationSidebar: Failed to delete conversation:', conversationId);
      }
    }
  };

  // 🎨 Canvas Browser Handlers
  const handleOpenCanvas = (record: CanvasAccessRecord) => {
    console.log('🎨 Opening canvas:', record.elementId, 'from conversation:', record.conversationId);
    
    // Track this access
    const canvasStore = useCanvasStore.getState();
    const elements = canvasStore.canvasElementsByConversation[record.conversationId] || [];
    const element = elements.find(el => el.id === record.elementId);
    
    if (element) {
      canvasAccessTracker.trackAccess(element, record.conversationId);
    }
    
    // Switch to the conversation containing this canvas
    const conv = conversationService.switchToConversation(record.conversationId);
    if (conv) {
      setActiveConversationId(record.conversationId);
      onConversationChange?.(conv);
      
      // Sync canvas store
      canvasStore.setCurrentConversation(record.conversationId);
      
      // Dispatch event to open canvas in split view
      window.dispatchEvent(new CustomEvent('openCanvasFromBrowser', {
        detail: {
          elementId: record.elementId,
          conversationId: record.conversationId,
          type: record.type
        }
      }));
    }
    
    // Close sidebar panel
    setShowCanvasBrowser(false);
    setShowSearch(false);
  };

  const handleDeleteCanvas = (record: CanvasAccessRecord, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (window.confirm(`Delete canvas "${record.title}"?\n\nThis will permanently remove the canvas document.`)) {
      console.log('🗑️ ConversationSidebar: Deleting canvas:', record.elementId);
      
      // Delete from canvas store
      const canvasStore = useCanvasStore.getState();
      
      // Switch to the conversation first, then delete
      canvasStore.setCurrentConversation(record.conversationId);
      canvasStore.permanentlyDeleteCanvasElement(record.elementId);
      
      // Delete from access tracker
      canvasAccessTracker.deleteRecord(record.elementId);
      
      // Refresh the list
      loadCanvasRecords();
      
      console.log('✅ Canvas deleted:', record.elementId);
    }
  };

  const getCanvasIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText size={14} />;
      case 'code': return <Code size={14} />;
      case 'chart': return <BarChart3 size={14} />;
      default: return <Layers size={14} />;
    }
  };

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getConversationIcon = (conv: Conversation) => {
    // Determine icon based on conversation content with safety checks
    if (!conv || !Array.isArray(conv.canvasElements)) {
      return <MessageCircle size={16} />;
    }
    
    const hasCharts = conv.canvasElements.some(el => el?.type === 'chart');
    const hasCode = conv.canvasElements.some(el => el?.type === 'code');
    const hasDocs = conv.canvasElements.some(el => el?.type === 'document');
    
    if (hasCharts) return <BarChart3 size={16} />;
    if (hasCode) return <Code size={16} />;
    if (hasDocs) return <FileText size={16} />;
    return <MessageCircle size={16} />;
  };

  const getConversationPreview = (conv: Conversation) => {
    if (!conv || !Array.isArray(conv.messages) || conv.messages.length === 0) {
      return 'Empty conversation';
    }
    const lastMessage = conv.messages[conv.messages.length - 1];
    return lastMessage?.text?.slice(0, 50) + '...' || 'Empty conversation';
  };

  return (
    <div className={`flex h-full ${responsive.isMobile ? '' : 'border-r'} transition-all duration-200 ${
      showSearch ? (responsive.isMobile ? 'w-80' : 'w-76') : 'w-12'
    } ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
      
      {/* Icon Column - Always Visible */}
      <div className={`w-12 flex flex-col h-full ${
        showSearch ? `border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}` : ''
      }`}>
        
        {/* Search Toggle - Fixed at top */}
        <div className={`flex-shrink-0 flex items-center justify-center py-3`}>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              showSearch 
                ? isDarkMode ? 'bg-gray-700 text-white border border-gray-600' : 'bg-gray-200 text-gray-800 border border-gray-300'
                : isDarkMode 
                  ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                  : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200'
            }`}
            title="Search Conversations"
          >
            {showSearch ? <X size={16} /> : <Search size={16} />}
          </button>
        </div>

        {/* Action Buttons - Directly under search */}
        <div className={`flex-shrink-0 flex flex-col items-center py-3 space-y-2`}>
          {/* New Chat Button */}
          <button
            onClick={handleNewChat}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              isDarkMode 
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200'
            }`}
            title="New Chat"
          >
            <Plus size={16} />
          </button>

          {/* Analysis/Chart Button - Opens chart canvas */}
          <button
            onClick={() => onQuickAction?.('chart')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              isDarkMode 
                ? 'bg-blue-900/40 hover:bg-blue-800/60 text-blue-400' 
                : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200'
            }`}
            title="Chart Analysis"
          >
            <BarChart3 size={15} />
          </button>

          {/* Code Assistant Button - Opens code canvas */}
          <button
            onClick={() => onQuickAction?.('code')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              isDarkMode 
                ? 'bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-400' 
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200'
            }`}
            title="Code Assistant"
          >
            <Code size={15} />
          </button>

          {/* Canvas Browser Button - View all canvases */}
          <button
            onClick={() => {
              setShowCanvasBrowser(!showCanvasBrowser);
              setShowSearch(true);
              loadCanvasRecords();
            }}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              showCanvasBrowser
                ? isDarkMode ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'
                : isDarkMode 
                  ? 'bg-purple-900/40 hover:bg-purple-800/60 text-purple-400' 
                  : 'bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200'
            }`}
            title="Browse All Canvases"
          >
            <Layers size={15} />
          </button>
        </div>

        {/* Scrollable Conversations Icons - Middle section */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <div className="flex flex-col space-y-2">
            {Array.isArray(conversations) && conversations.map((conv) => {
              if (!conv) return null;
              
              // Generate display title: use first user message if title is generic
              const displayTitle = (conv.title.startsWith('Session ') || conv.title === 'New Chat')
                ? (conv.messages.find(m => m.isUser)?.text.slice(0, 50) || conv.title) + (conv.messages.find(m => m.isUser)?.text.length > 50 ? '...' : '')
                : conv.title;
              
              return (
              <div key={conv.id} className="relative group">
                <button
                  onClick={() => handleSwitchConversation(conv.id)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    activeConversationId === conv.id
                      ? isDarkMode ? 'bg-gray-700 text-white border border-gray-600' : 'bg-gray-200 text-gray-800 border border-gray-300'
                      : isDarkMode 
                        ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                        : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200'
                  }`}
                  title={displayTitle}
                >
                  {getConversationIcon(conv)}
                </button>
                
                {/* Delete button - appears on hover - FIXED: Using div instead of nested button */}
                <div
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  className={`absolute -top-1 -right-1 w-4 h-4 rounded-full items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer ${
                    isDarkMode 
                      ? 'bg-red-600 hover:bg-red-500 text-white' 
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  } hidden group-hover:flex`}
                  title="Delete conversation"
                >
                  <X size={8} />
                </div>
              </div>
            );
            })}
          </div>
        </div>

      </div>

      {/* Expanded Search Panel - Constrained width */}
      {showSearch && (
        <div className={`w-64 flex flex-col h-full overflow-hidden ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          
          {/* Fixed Search Header */}
          <div className={`flex-shrink-0 border-b px-4 py-3 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            {/* Header with New Button */}
            <div className="flex items-center justify-between mb-2.5">
              <h2 className={`text-[13px] font-semibold tracking-tight ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Conversations
              </h2>
              <button
                onClick={handleNewChat}
                className={`px-2 py-1 text-[11px] rounded flex items-center gap-1 transition-all duration-150 ${
                  isDarkMode 
                    ? 'bg-gray-700/60 hover:bg-gray-600 text-gray-400 hover:text-gray-200' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                }`}
                title="New Chat"
              >
                <Plus size={11} strokeWidth={2.5} />
                <span>New</span>
              </button>
            </div>
            
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className={`w-full px-2.5 py-1.5 rounded text-[12px] ${
                isDarkMode 
                  ? 'bg-gray-900/50 border-gray-700 text-white placeholder-gray-500' 
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
              } border focus:outline-none focus:ring-1 focus:ring-gray-500/50 transition-all`}
              autoFocus
            />
          </div>

          {/* Quick Action Buttons OR Canvas Browser */}
          {!searchQuery && !showCanvasBrowser && (
            <div className={`flex-shrink-0 px-3 py-3 border-b ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="space-y-1">
                <h3 className={`text-[10px] uppercase tracking-wider font-medium ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                } mb-2`}>
                  Quick Actions
                </h3>
                <div className="space-y-0.5">
                  <button
                    onClick={() => onQuickAction?.('document')}
                    className={`w-full text-left px-2.5 py-2 rounded text-[12px] transition-all duration-150 flex items-center gap-2 ${
                      isDarkMode 
                        ? 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400' 
                        : 'bg-purple-50 hover:bg-purple-100 text-purple-600'
                    }`}
                  >
                    <FileText size={13} />
                    <span>Document Reader</span>
                  </button>
                  
                  <button
                    onClick={() => onQuickAction?.('chart')}
                    className={`w-full text-left px-2.5 py-2 rounded text-[12px] transition-all duration-150 flex items-center gap-2 ${
                      isDarkMode 
                        ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400' 
                        : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                    }`}
                  >
                    <BarChart3 size={13} />
                    <span>Chart Creator</span>
                  </button>
                  
                  <button
                    onClick={() => onQuickAction?.('code')}
                    className={`w-full text-left px-2.5 py-2 rounded text-[12px] transition-all duration-150 flex items-center gap-2 ${
                      isDarkMode 
                        ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400' 
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
                    }`}
                  >
                    <Code size={13} />
                    <span>Code Editor</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 🎨 Canvas Browser Panel */}
          {showCanvasBrowser && !searchQuery && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Canvas Browser Header */}
              <div className={`flex-shrink-0 px-3 py-3 border-b ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`text-[12px] font-semibold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    📄 Canvas Browser
                  </h3>
                  <button
                    onClick={() => setShowCanvasBrowser(false)}
                    className={`p-1 rounded transition-colors ${
                      isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
                    }`}
                  >
                    <X size={12} />
                  </button>
                </div>
                
                {/* Filter buttons */}
                <div className="flex gap-1">
                  {(['all', 'document', 'code', 'chart'] as const).map(filter => (
                    <button
                      key={filter}
                      onClick={() => setCanvasFilter(filter)}
                      className={`px-2 py-1 text-[10px] rounded transition-colors ${
                        canvasFilter === filter
                          ? isDarkMode ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'
                          : isDarkMode ? 'bg-gray-700 text-gray-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Canvas List */}
              <div className="flex-1 overflow-y-auto px-3 py-2">
                {canvasRecords.length === 0 ? (
                  <div className={`text-center py-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    <Layers size={24} className="mx-auto mb-2 opacity-50" />
                    <p className="text-[11px]">No canvases found</p>
                    <p className="text-[10px] mt-1 opacity-70">Create a document, chart, or code editor to get started</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {canvasRecords.map((record, index) => (
                      <div key={record.elementId} className="relative group">
                        <button
                          onClick={() => handleOpenCanvas(record)}
                          className={`w-full text-left px-2.5 py-2.5 rounded-lg transition-all duration-150 ${
                            index === 0 
                              ? isDarkMode 
                                ? 'bg-purple-900/30 border border-purple-700/50 hover:bg-purple-900/50' 
                                : 'bg-purple-50 border border-purple-200 hover:bg-purple-100'
                              : isDarkMode 
                                ? 'hover:bg-gray-700/50' 
                                : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className={`flex-shrink-0 mt-0.5 ${
                              record.type === 'document' ? 'text-purple-400' :
                              record.type === 'code' ? 'text-emerald-400' :
                              record.type === 'chart' ? 'text-blue-400' : 'text-gray-400'
                            }`}>
                              {getCanvasIcon(record.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                {index === 0 && (
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                                    isDarkMode ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'
                                  }`}>
                                    LAST
                                  </span>
                                )}
                                <div className={`text-[12px] font-medium truncate ${
                                  isDarkMode ? 'text-gray-200' : 'text-gray-800'
                                }`}>
                                  {record.title}
                                </div>
                              </div>
                              <div className={`text-[10px] mt-0.5 ${
                                isDarkMode ? 'text-gray-500' : 'text-gray-400'
                              }`}>
                                {formatTimeAgo(record.lastAccessedAt)} • {record.accessCount} view{record.accessCount !== 1 ? 's' : ''}
                              </div>
                              {record.preview && (
                                <div className={`text-[10px] mt-1 line-clamp-1 ${
                                  isDarkMode ? 'text-gray-600' : 'text-gray-400'
                                }`}>
                                  {record.preview}
                                </div>
                              )}
                            </div>
                            <ChevronRight size={12} className={`flex-shrink-0 mt-1 ${
                              isDarkMode ? 'text-gray-600' : 'text-gray-300'
                            }`} />
                          </div>
                        </button>
                        
                        {/* Delete button */}
                        <div
                          onClick={(e) => handleDeleteCanvas(record, e)}
                          className={`absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded cursor-pointer ${
                            isDarkMode 
                              ? 'hover:bg-red-600/80 text-gray-500 hover:text-white' 
                              : 'hover:bg-red-500 text-gray-400 hover:text-white'
                          }`}
                          title="Delete canvas"
                        >
                          <Trash2 size={11} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Scrollable Conversations List - Hidden when canvas browser is active */}
          {!showCanvasBrowser && (
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3">
            <div className="space-y-1">
              <h3 className={`text-[10px] uppercase tracking-wider font-medium ${
                isDarkMode ? 'text-gray-500' : 'text-gray-400'
              } mb-2`}>
                {searchQuery ? `Results (${searchResults.length})` : 'Recent'}
              </h3>
              
              {Array.isArray(searchQuery ? searchResults : conversations) && 
                (searchQuery ? searchResults : conversations).map((conv) => conv && (
                <div key={conv.id} className="relative group">
                  <button
                    onClick={() => handleSwitchConversation(conv.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-md transition-all duration-150 ${
                      activeConversationId === conv.id
                        ? isDarkMode ? 'bg-gray-700/80' : 'bg-gray-100'
                        : isDarkMode 
                          ? 'hover:bg-gray-700/50' 
                          : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`flex-shrink-0 ${
                        activeConversationId === conv.id
                          ? isDarkMode ? 'text-white' : 'text-gray-700'
                          : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {getConversationIcon(conv)}
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className={`text-[13px] font-medium truncate ${
                          activeConversationId === conv.id
                            ? isDarkMode ? 'text-white' : 'text-gray-900'
                            : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          {(conv.title.startsWith('Session ') || conv.title === 'New Chat')
                            ? (conv.messages.find(m => m.isUser)?.text.slice(0, 40) || conv.title)
                            : conv.title}
                        </div>
                        <div className={`text-[11px] mt-0.5 truncate ${
                          isDarkMode ? 'text-gray-500' : 'text-gray-400'
                        }`}>
                          {Array.isArray(conv.messages) ? conv.messages.length : 0} messages
                        </div>
                      </div>
                      
                      {/* Spacer for delete button that appears outside */}
                      <div className="flex-shrink-0 w-6 h-6"></div>
                    </div>
                  </button>
                  
                  {/* Delete button - FIXED: Moved outside button to prevent event conflicts */}
                  <div
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded cursor-pointer ${
                      isDarkMode 
                        ? 'hover:bg-red-600/80 text-gray-500 hover:text-white' 
                        : 'hover:bg-red-500 text-gray-400 hover:text-white'
                    }`}
                    title="Delete conversation"
                  >
                    <Trash2 size={12} />
                  </div>
                </div>
            ))}

              {searchQuery && searchResults.length === 0 && (
                <div className={`text-center py-8 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  <Search size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No conversations found</p>
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConversationSidebar;

