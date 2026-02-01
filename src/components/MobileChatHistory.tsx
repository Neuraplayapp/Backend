/**
 * STATE-OF-THE-ART MOBILE CHAT HISTORY UX
 * 
 * Features:
 * - Swipe-based navigation
 * - Smooth animations
 * - Quick search with predictive text
 * - Smart grouping by date/topic
 * - Infinite scroll with virtualization
 * - Touch-optimized interactions
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  Search, X, Clock, MessageSquare, Archive, 
  ChevronRight, Calendar, Hash, User,
  ArrowLeft, MoreVertical, Trash2, Pin, FileText, Plus
} from 'lucide-react';

import { useCanvasStore } from '../stores/canvasStore';

import { useTheme } from '../contexts/ThemeContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { conversationService } from '../services/ConversationService';

interface ChatHistoryItem {
  id: string;
  title: string;
  preview: string;
  timestamp: Date | undefined;
  messageCount: number;
  isActive: boolean;
  isPinned?: boolean;
  category?: 'chat' | 'canvas' | 'socratic' | 'tool';
  hasUnread?: boolean;
  hasCanvasContent?: boolean; // Track if conversation has canvas documents
}

interface MobileChatHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onChatSelect: (chatId: string) => void;
  onNewChat?: () => void; // 🎯 NEW: Callback to create a new chat
  chatHistory: ChatHistoryItem[];
  currentChatId?: string;
}

const MobileChatHistory: React.FC<MobileChatHistoryProps> = ({
  isOpen,
  onClose,
  onChatSelect,
  onNewChat,
  chatHistory,
  currentChatId
}) => {
  const { isDarkMode } = useTheme();
  const responsive = useResponsiveLayout();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocus, setSearchFocus] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [groupBy, setGroupBy] = useState<'date' | 'category' | 'none'>('date');
  const [showArchived, setShowArchived] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'chat' | 'canvas'>('all');
  const [swipedChatId, setSwipedChatId] = useState<string | null>(null); // Track which chat is swiped open
  
  // Get canvas store to check for canvas documents
  const canvasElementsByConversation = useCanvasStore(state => state.canvasElementsByConversation);
  
  // Refs
  const parentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Enhance chat history with canvas content info
  const enhancedChatHistory = useMemo(() => {
    return chatHistory.map(chat => ({
      ...chat,
      hasCanvasContent: (canvasElementsByConversation[chat.id] || []).length > 0
    }));
  }, [chatHistory, canvasElementsByConversation]);

  // Smart search with fuzzy matching and relevance scoring
  const filteredAndGroupedChats = useMemo(() => {
    let filtered = enhancedChatHistory;
    
    // Apply filter type (all, chat, canvas)
    if (filterType === 'canvas') {
      filtered = filtered.filter(chat => chat.hasCanvasContent);
    } else if (filterType === 'chat') {
      filtered = filtered.filter(chat => !chat.hasCanvasContent);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = chatHistory.filter(chat => 
        chat.title.toLowerCase().includes(query) ||
        chat.preview.toLowerCase().includes(query) ||
        chat.category?.toLowerCase().includes(query)
      ).sort((a, b) => {
        // Relevance scoring: title matches score higher
        const aScore = a.title.toLowerCase().includes(query) ? 2 : 1;
        const bScore = b.title.toLowerCase().includes(query) ? 2 : 1;
        return bScore - aScore;
      });
    }
    
    // Apply grouping
    if (groupBy === 'date') {
      const groups = new Map<string, ChatHistoryItem[]>();
      
      filtered.forEach(chat => {
        // FIXED: Defensive programming for undefined timestamps
        const timestamp = chat.timestamp || new Date();
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        
        let groupKey: string;
        if (date.toDateString() === today.toDateString()) {
          groupKey = 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
          groupKey = 'Yesterday';
        } else if (date.getTime() > today.getTime() - 7 * 24 * 60 * 60 * 1000) {
          groupKey = 'This Week';
        } else if (date.getTime() > today.getTime() - 30 * 24 * 60 * 60 * 1000) {
          groupKey = 'This Month';
        } else {
          groupKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        }
        
        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(chat);
      });
      
      return Array.from(groups.entries()).map(([group, items]) => ({
        group,
        items: items.sort((a, b) => {
          // FIXED: Safe timestamp comparison with fallbacks
          const aTime = (a.timestamp || new Date()).getTime();
          const bTime = (b.timestamp || new Date()).getTime();
          return bTime - aTime;
        })
      }));
    } else if (groupBy === 'category') {
      const groups = new Map<string, ChatHistoryItem[]>();
      
      filtered.forEach(chat => {
        const category = chat.category || 'chat';
        if (!groups.has(category)) {
          groups.set(category, []);
        }
        groups.get(category)!.push(chat);
      });
      
      return Array.from(groups.entries()).map(([group, items]) => ({
        group: group.charAt(0).toUpperCase() + group.slice(1),
        items: items.sort((a, b) => {
          // FIXED: Safe timestamp comparison with fallbacks
          const aTime = (a.timestamp || new Date()).getTime();
          const bTime = (b.timestamp || new Date()).getTime();
          return bTime - aTime;
        })
      }));
    }
    
    return [{
      group: '',
      items: filtered.sort((a, b) => {
        // Pinned items first
        if (a.isPinned !== b.isPinned) {
          return a.isPinned ? -1 : 1;
        }
        // FIXED: Safe timestamp comparison with fallbacks
        const aTime = (a.timestamp || new Date()).getTime();
        const bTime = (b.timestamp || new Date()).getTime();
        return bTime - aTime;
      })
    }];
  }, [enhancedChatHistory, searchQuery, groupBy, filterType]);

  // Simple flat items for rendering (virtualization removed to fix crash)
  const flatItems = useMemo(() => {
    const items: Array<{ type: 'group' | 'chat'; data: any; id: string }> = [];
    
    filteredAndGroupedChats.forEach(({ group, items: groupItems }) => {
      if (group) {
        items.push({ type: 'group', data: { title: group }, id: `group-${group}` });
      }
      groupItems.forEach(chat => {
        items.push({ type: 'chat', data: chat, id: chat.id });
      });
    });
    
    return items;
  }, [filteredAndGroupedChats]);

  // 🎯 SWIPE-TO-DELETE: Show delete action on left swipe
  const handleSwipe = (chatId: string, direction: 'left' | 'right', offset: number) => {
    if (direction === 'left' && Math.abs(offset) > 80) {
      // Show delete action - reveal the red delete button
      setSwipedChatId(chatId);
    } else if (direction === 'right') {
      // Reset swiped state
      setSwipedChatId(null);
    }
  };

  // Pan gesture handling with swipe threshold
  const handlePan = (event: any, info: PanInfo, chatId: string) => {
    const { offset } = info;
    handleSwipe(chatId, offset.x > 0 ? 'right' : 'left', offset.x);
  };
  
  // 🎯 CREATE a new conversation
  const handleNewChat = () => {
    console.log('➕ MobileChatHistory: Creating new chat');
    const newConv = conversationService.createNewConversation();
    
    // Also sync canvas store to new conversation
    useCanvasStore.getState().setCurrentConversation(newConv.id);
    
    // Call the callback if provided, otherwise just select the new chat
    if (onNewChat) {
      onNewChat();
    }
    
    // Select the new chat and close history
    onChatSelect(newConv.id);
    onClose();
  };
  
  // 🎯 DELETE a single conversation
  const handleDeleteConversation = (chatId: string) => {
    if (window.confirm('Delete this conversation? This cannot be undone.')) {
      console.log('🗑️ MobileChatHistory: Deleting single conversation:', chatId);
      
      // Also delete canvas elements for this conversation
      const { canvasElementsByConversation, permanentlyDeleteCanvasElement } = useCanvasStore.getState();
      const canvasElements = canvasElementsByConversation[chatId] || [];
      canvasElements.forEach(el => {
        console.log('🗑️ Deleting canvas element:', el.id);
        permanentlyDeleteCanvasElement(el.id);
      });
      
      const success = conversationService.deleteConversation(chatId);
      if (success) {
        console.log('✅ MobileChatHistory: Deleted conversation:', chatId);
        setSwipedChatId(null);
      } else {
        console.error('❌ MobileChatHistory: Failed to delete conversation:', chatId);
      }
    }
  };

  // Quick search focus
  const handleSearchFocus = () => {
    setSearchFocus(true);
    searchInputRef.current?.focus();
  };

  // Category icons - now considers canvas content
  const getCategoryIcon = (item: ChatHistoryItem) => {
    if (item.hasCanvasContent) {
      return <FileText size={16} className="text-purple-500" />;
    }
    switch (item.category) {
      case 'canvas': return <Hash size={16} className="text-purple-500" />;
      case 'socratic': return <User size={16} className="text-blue-500" />;
      case 'tool': return <MoreVertical size={16} className="text-green-500" />;
      default: return <MessageSquare size={16} className="text-gray-500" />;
    }
  };

  // Format time display
  const formatTime = (date: Date | undefined) => {
    if (!date) return 'Unknown time';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  // Auto-focus search when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Slide-in Panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`fixed inset-y-0 left-0 w-full max-w-sm z-50 ${
              isDarkMode ? 'bg-gray-900' : 'bg-white'
            } shadow-2xl flex flex-col`}
          >
            {/* Header */}
            <div className={`px-4 py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={onClose}
                  className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                  style={{ 
                    minWidth: responsive.getTouchTargetSize('recommended'),
                    minHeight: responsive.getTouchTargetSize('recommended')
                  }}
                >
                  <ArrowLeft size={20} />
                </button>
                
                <div className="flex items-center space-x-2">
                <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Chat History
                </h2>
                  
                  {/* 🎯 NEW CHAT BUTTON */}
                  <button
                    onClick={handleNewChat}
                    className={`p-1.5 rounded-full bg-purple-500 text-white hover:bg-purple-600 transition-colors shadow-lg`}
                    title="New Chat"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                
                <button
                  onClick={() => setSelectionMode(!selectionMode)}
                  className={`p-2 rounded-lg ${
                    selectionMode 
                      ? 'bg-purple-500 text-white' 
                      : isDarkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
                  }`}
                  style={{ 
                    minWidth: responsive.getTouchTargetSize('recommended'),
                    minHeight: responsive.getTouchTargetSize('recommended')
                  }}
                >
                  <MoreVertical size={20} />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <div className={`flex items-center rounded-xl border ${
                  searchFocus 
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                    : isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-50'
                } transition-colors`}>
                  <Search size={18} className={`ml-3 ${
                    searchFocus ? 'text-purple-500' : 'text-gray-400'
                  }`} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocus(true)}
                    onBlur={() => setSearchFocus(false)}
                    className="flex-1 px-3 py-3 bg-transparent outline-none text-sm placeholder-gray-400"
                    style={{ fontSize: '16px' }} // Prevents zoom on iOS
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mr-3 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Filters */}
              <div className="flex items-center space-x-2 mt-3">
                {/* Filter Type Tabs */}
                <button
                  onClick={() => setFilterType('all')}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs ${
                    filterType === 'all'
                      ? 'bg-purple-500 text-white'
                      : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  <MessageSquare size={12} />
                  <span>All</span>
                </button>
                
                <button
                  onClick={() => setFilterType('canvas')}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs ${
                    filterType === 'canvas'
                      ? 'bg-purple-500 text-white'
                      : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  <FileText size={12} />
                  <span>Canvas</span>
                </button>
                
                <div className="w-px h-5 bg-gray-600" />
                
                <button
                  onClick={() => setGroupBy(groupBy === 'date' ? 'none' : 'date')}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs ${
                    groupBy === 'date'
                      ? 'bg-purple-500 text-white'
                      : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  <Calendar size={12} />
                  <span>Date</span>
                </button>
              </div>
            </div>

            {/* Chat List */}
            <div 
              ref={parentRef}
              className="flex-1 overflow-auto"
              style={{ height: '100%' }}
            >
              <div className="space-y-1">
                {flatItems.map((item) => {
                  const isGroup = item.type === 'group';
                  
                  return (
                    <div
                      key={item.id}
                      className="w-full"
                    >
                      {isGroup ? (
                        /* Group Header */
                        <div className={`px-4 py-2 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                          <h3 className={`text-xs font-semibold uppercase tracking-wider ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {item.data.title}
                          </h3>
                        </div>
                      ) : (
                        /* Chat Item with Swipe-to-Delete */
                        <div className="relative overflow-hidden">
                          {/* 🎯 DELETE BUTTON - Revealed on swipe left */}
                          <motion.div
                            initial={false}
                            animate={{ 
                              opacity: swipedChatId === item.data.id ? 1 : 0,
                              x: swipedChatId === item.data.id ? 0 : 80
                            }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center bg-red-500 z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteConversation(item.data.id);
                            }}
                          >
                            <div className="flex flex-col items-center text-white">
                              <Trash2 size={20} />
                              <span className="text-xs mt-1">Delete</span>
                            </div>
                          </motion.div>
                          
                          {/* Chat Item Content - Slides on swipe */}
                        <motion.div
                          drag={!selectionMode ? "x" : false}
                            dragConstraints={{ left: -80, right: 0 }}
                          dragElastic={0.1}
                          onDragEnd={(e, info) => handlePan(e, info, item.data.id)}
                            animate={{ x: swipedChatId === item.data.id ? -80 : 0 }}
                          whileDrag={{ scale: 0.98 }}
                            className={`relative px-4 py-3 border-b cursor-pointer ${
                              isDarkMode ? 'border-gray-700 bg-gray-900 hover:bg-gray-800' : 'border-gray-100 bg-white hover:bg-gray-50'
                          } ${
                            currentChatId === item.data.id 
                              ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700' 
                              : ''
                          } ${
                            selectedItems.has(item.data.id) 
                              ? 'bg-purple-50 dark:bg-purple-900/20' 
                              : ''
                          }`}
                          onClick={() => {
                              // If swiped, close the swipe first
                              if (swipedChatId === item.data.id) {
                                setSwipedChatId(null);
                                return;
                              }
                              
                            if (selectionMode) {
                              const newSelected = new Set(selectedItems);
                              if (newSelected.has(item.data.id)) {
                                newSelected.delete(item.data.id);
                              } else {
                                newSelected.add(item.data.id);
                              }
                              setSelectedItems(newSelected);
                            } else {
                              onChatSelect(item.data.id);
                              onClose();
                            }
                          }}
                        >
                          <div className="flex items-start space-x-3">
                            {/* Selection Checkbox */}
                            {selectionMode && (
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                selectedItems.has(item.data.id)
                                  ? 'bg-purple-500 border-purple-500'
                                  : 'border-gray-300 dark:border-gray-600'
                              }`}>
                                {selectedItems.has(item.data.id) && (
                                  <div className="w-2 h-2 bg-white rounded-full" />
                                )}
                              </div>
                            )}

{/* Category Icon - shows canvas icon if has canvas content */}
                                            <div className="flex-shrink-0 mt-1">
                                              {getCategoryIcon(item.data)}
                                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className={`text-sm font-medium truncate ${
                                  isDarkMode ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {item.data.title}
                                </h4>
                                
                                <div className="flex items-center space-x-1 ml-2">
                                  {item.data.isPinned && (
                                    <Pin size={12} className="text-purple-500" />
                                  )}
                                  <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {formatTime(item.data.timestamp)}
                                  </span>
                                </div>
                              </div>
                              
                              <p className={`text-xs truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {item.data.preview}
                              </p>
                              
<div className="flex items-center justify-between mt-2">
                                                <div className="flex items-center space-x-2">
                                                  <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    {item.data.messageCount} messages
                                                  </span>
                                                  {item.data.hasCanvasContent && (
                                                    <span className={`text-xs px-1.5 py-0.5 rounded flex items-center ${
                                                      isDarkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-600'
                                                    }`}>
                                                      <FileText size={10} className="mr-1" />
                                                      Canvas
                                                    </span>
                                                  )}
                                                </div>
                                                
                                                {item.data.hasUnread && (
                                                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                                                )}
                                              </div>
                            </div>
                            
                            {!selectionMode && (
                              <ChevronRight size={16} className={`flex-shrink-0 ${
                                isDarkMode ? 'text-gray-500' : 'text-gray-400'
                              }`} />
                            )}
                          </div>
                        </motion.div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selection Actions */}
            <AnimatePresence>
              {selectionMode && selectedItems.size > 0 && (
                <motion.div
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 100, opacity: 0 }}
                  className={`px-4 py-3 border-t ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {selectedItems.size} selected
                    </span>
                    
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => {
                          // Pin functionality - could be implemented with conversationService enhancement
                          console.log('Pin conversations:', Array.from(selectedItems));
                        }}
                        className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                        style={{ 
                          minWidth: responsive.getTouchTargetSize('recommended'),
                          minHeight: responsive.getTouchTargetSize('recommended')
                        }}
                      >
                        <Pin size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          // Archive functionality - could be implemented with conversationService enhancement
                          console.log('Archive conversations:', Array.from(selectedItems));
                        }}
                        className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                        style={{ 
                          minWidth: responsive.getTouchTargetSize('recommended'),
                          minHeight: responsive.getTouchTargetSize('recommended')
                        }}
                      >
                        <Archive size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to permanently delete ${selectedItems.size} conversation${selectedItems.size > 1 ? 's' : ''}? This action cannot be undone.`)) {
                            console.log('🗑️ MobileChatHistory: Deleting conversations:', Array.from(selectedItems));
                            let deletedCount = 0;
                            
                            // Get canvas store for cleanup
                            const { canvasElementsByConversation, permanentlyDeleteCanvasElement } = useCanvasStore.getState();
                            
                            selectedItems.forEach(conversationId => {
                              // 🎯 FIX: Also delete canvas elements for this conversation
                              const canvasElements = canvasElementsByConversation[conversationId] || [];
                              canvasElements.forEach(el => {
                                console.log('🗑️ Deleting canvas element:', el.id);
                                permanentlyDeleteCanvasElement(el.id);
                              });
                              
                              const success = conversationService.deleteConversation(conversationId);
                              if (success) {
                                deletedCount++;
                              } else {
                                console.error('❌ MobileChatHistory: Failed to delete conversation:', conversationId);
                              }
                            });
                            console.log(`✅ MobileChatHistory: Successfully deleted ${deletedCount}/${selectedItems.size} conversations`);
                            
                            // Clear selection and exit selection mode
                            setSelectedItems(new Set());
                            setSelectionMode(false);
                            
                            // Close the history panel to refresh
                            onClose();
                          }
                        }}
                        className={`p-2 rounded-lg text-red-500 ${isDarkMode ? 'hover:bg-red-900/20' : 'hover:bg-red-100'}`}
                        style={{ 
                          minWidth: responsive.getTouchTargetSize('recommended'),
                          minHeight: responsive.getTouchTargetSize('recommended')
                        }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileChatHistory;

