/**
 * 📱 MOBILE SETTINGS - Scandinavian Minimalist Design
 * 
 * Features:
 * - Theme selection
 * - Memory management (view/delete)
 * - Voice settings
 * - Privacy controls
 * - Account info
 * 
 * Memory deletion works via:
 * 1. Direct UI buttons in this component
 * 2. AI prompts ("delete my memories", "forget my name", etc.)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';
import {
  Settings, X, Sun, Moon, Smartphone, Trash2, Database,
  ChevronRight, Search, AlertTriangle, CheckCircle, User,
  Shield, Globe, Volume2, ArrowLeft, RefreshCw, Brain
} from 'lucide-react';

// ===== TYPES =====
interface MobileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Memory {
  id?: string;
  memory_key?: string;
  key?: string;
  memory_value?: string;
  value?: string;
  content?: string;
  category?: string;
  created_at?: string;
}

type SettingsTab = 'main' | 'theme' | 'memories' | 'privacy' | 'about';

// ===== MAIN COMPONENT =====
const MobileSettings: React.FC<MobileSettingsProps> = ({ isOpen, onClose }) => {
  const { isDarkMode, setTheme, theme } = useTheme();
  const { user } = useUser();
  
  // State
  const [activeTab, setActiveTab] = useState<SettingsTab>('main');
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Get user ID
  const getUserId = () => {
    if (user?.username) return user.username;
    if (user?.id) return user.id;
    if (user?.name) return user.name;
    if (user?.email) return user.email.split('@')[0];
    return 'anonymous';
  };

  // Load memories
  const loadMemories = async () => {
    setLoadingMemories(true);
    try {
      const response = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search',
          userId: getUserId(),
          query: '',
          limit: 100
        })
      });

      const result = await response.json();
      if (result.success && result.memories) {
        setMemories(result.memories);
      }
    } catch (error) {
      console.error('Failed to load memories:', error);
    }
    setLoadingMemories(false);
  };

  // Delete a specific memory
  const deleteMemory = async (memory: Memory) => {
    const memoryKey = memory.memory_key || memory.key || '';
    
    try {
      const response = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          userId: getUserId(),
          key: memoryKey
        })
      });

      const result = await response.json();
      if (result.success) {
        setMemories(prev => prev.filter(m => 
          (m.memory_key || m.key) !== memoryKey
        ));
        setActionFeedback({ type: 'success', message: 'Memory deleted' });
        setTimeout(() => setActionFeedback(null), 2000);
      } else {
        throw new Error(result.error || 'Failed to delete');
      }
    } catch (error) {
      setActionFeedback({ type: 'error', message: 'Failed to delete memory' });
      setTimeout(() => setActionFeedback(null), 3000);
    }
    setDeleteConfirm(null);
  };

  // Delete ALL memories
  const deleteAllMemories = async () => {
    try {
      // Delete each memory individually
      for (const memory of memories) {
        await fetch('/api/memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete',
            userId: getUserId(),
            key: memory.memory_key || memory.key
          })
        });
      }
      
      setMemories([]);
      setActionFeedback({ type: 'success', message: 'All memories deleted' });
      setTimeout(() => setActionFeedback(null), 2000);
    } catch (error) {
      setActionFeedback({ type: 'error', message: 'Failed to delete all memories' });
      setTimeout(() => setActionFeedback(null), 3000);
    }
    setDeleteConfirm(null);
  };

  // Load memories when tab opens
  useEffect(() => {
    if (activeTab === 'memories' && memories.length === 0) {
      loadMemories();
    }
  }, [activeTab]);

  // Filter memories
  const filteredMemories = memories.filter(memory => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const content = (memory.content || memory.value || memory.memory_value || '').toLowerCase();
    const key = (memory.memory_key || memory.key || '').toLowerCase();
    return content.includes(q) || key.includes(q);
  });

  // Theme options
  const themeOptions = [
    { id: 'system', label: 'System', icon: Smartphone, description: 'Match device settings' },
    { id: 'light', label: 'Light', icon: Sun, description: 'Bright background' },
    { id: 'dark', label: 'Dark', icon: Moon, description: 'Dark background' },
  ];

  // ===== RENDER MAIN MENU =====
  const renderMainMenu = () => (
    <div className="space-y-2">
      {[
        { id: 'theme' as const, icon: Sun, label: 'Appearance', desc: theme || 'System' },
        { id: 'memories' as const, icon: Brain, label: 'My Memories', desc: `${memories.length} stored` },
        { id: 'privacy' as const, icon: Shield, label: 'Privacy', desc: 'Data & permissions' },
        { id: 'about' as const, icon: User, label: 'About', desc: 'App info' },
      ].map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
            isDarkMode 
              ? 'bg-stone-800/50 hover:bg-stone-800' 
              : 'bg-white hover:bg-stone-50 border border-stone-200'
          }`}
        >
          <div className="flex items-center space-x-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'
            }`}>
              <item.icon className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-left">
              <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                {item.label}
              </p>
              <p className={`text-xs ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                {item.desc}
              </p>
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 ${isDarkMode ? 'text-stone-500' : 'text-stone-400'}`} />
        </button>
      ))}

      {/* User Info */}
      {user && (
        <div className={`mt-6 p-4 rounded-2xl ${
          isDarkMode ? 'bg-stone-800/30' : 'bg-stone-50'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'
            }`}>
              <User className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                {user.username || user.name || 'User'}
              </p>
              <p className={`text-xs ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                {user.email || 'No email'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Tip */}
      <div className={`mt-4 p-4 rounded-2xl ${
        isDarkMode ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-200'
      }`}>
        <p className={`text-xs ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>
          💡 <strong>Tip:</strong> You can also manage memories by asking the AI:
        </p>
        <ul className={`text-xs mt-2 space-y-1 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
          <li>• "Forget my name"</li>
          <li>• "Delete what you know about my pets"</li>
          <li>• "Clear all my memories"</li>
        </ul>
      </div>
    </div>
  );

  // ===== RENDER THEME TAB =====
  const renderThemeTab = () => (
    <div className="space-y-3">
      {themeOptions.map((option) => (
        <button
          key={option.id}
          onClick={() => setTheme(option.id as any)}
          className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
            theme === option.id
              ? isDarkMode 
                ? 'bg-purple-500/20 border-2 border-purple-500' 
                : 'bg-purple-50 border-2 border-purple-500'
              : isDarkMode 
                ? 'bg-stone-800/50 border-2 border-transparent' 
                : 'bg-white border-2 border-stone-200'
          }`}
        >
          <div className="flex items-center space-x-4">
            <option.icon className={`w-6 h-6 ${
              theme === option.id ? 'text-purple-500' : isDarkMode ? 'text-stone-400' : 'text-stone-500'
            }`} />
            <div className="text-left">
              <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                {option.label}
              </p>
              <p className={`text-xs ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                {option.description}
              </p>
            </div>
          </div>
          {theme === option.id && (
            <CheckCircle className="w-5 h-5 text-purple-500" />
          )}
        </button>
      ))}
    </div>
  );

  // ===== RENDER MEMORIES TAB =====
  const renderMemoriesTab = () => (
    <div className="space-y-4">
      {/* Search */}
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-xl ${
        isDarkMode ? 'bg-stone-800' : 'bg-stone-100'
      }`}>
        <Search className={`w-5 h-5 ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`} />
        <input
          type="text"
          placeholder="Search memories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`flex-1 bg-transparent text-sm outline-none ${
            isDarkMode ? 'text-white placeholder-stone-500' : 'text-stone-800 placeholder-stone-400'
          }`}
          style={{ fontSize: '16px' }}
        />
      </div>

      {/* Actions */}
      <div className="flex space-x-2">
        <button
          onClick={loadMemories}
          disabled={loadingMemories}
          className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl text-sm font-medium ${
            isDarkMode ? 'bg-stone-800 text-stone-300' : 'bg-stone-100 text-stone-600'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${loadingMemories ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
        <button
          onClick={() => setDeleteConfirm('all')}
          disabled={memories.length === 0}
          className="flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl text-sm font-medium bg-red-500/10 text-red-500 disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete All</span>
        </button>
      </div>

      {/* Memory List */}
      {loadingMemories ? (
        <div className="text-center py-8">
          <RefreshCw className={`w-8 h-8 mx-auto mb-3 animate-spin ${
            isDarkMode ? 'text-purple-400' : 'text-purple-500'
          }`} />
          <p className={`text-sm ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
            Loading memories...
          </p>
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className="text-center py-8">
          <Brain className={`w-12 h-12 mx-auto mb-3 opacity-50 ${
            isDarkMode ? 'text-stone-600' : 'text-stone-300'
          }`} />
          <p className={`${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
            {searchQuery ? 'No matching memories' : 'No memories stored yet'}
          </p>
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-stone-500' : 'text-stone-400'}`}>
            The AI stores things you tell it about yourself
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {filteredMemories.map((memory, index) => {
            const key = memory.memory_key || memory.key || `memory-${index}`;
            const value = memory.content || memory.value || memory.memory_value || '';
            const isDeleting = deleteConfirm === key;
            
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`p-3 rounded-xl ${
                  isDarkMode ? 'bg-stone-800/50' : 'bg-white border border-stone-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${
                      isDarkMode ? 'text-purple-400' : 'text-purple-600'
                    }`}>
                      {key}
                    </p>
                    <p className={`text-sm ${isDarkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                      {value}
                    </p>
                    {memory.category && (
                      <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs ${
                        isDarkMode ? 'bg-stone-700 text-stone-400' : 'bg-stone-100 text-stone-500'
                      }`}>
                        {memory.category}
                      </span>
                    )}
                  </div>
                  
                  {isDeleting ? (
                    <div className="flex space-x-1">
                      <button
                        onClick={() => deleteMemory(memory)}
                        className="p-2 rounded-lg bg-red-500 text-white"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className={`p-2 rounded-lg ${
                          isDarkMode ? 'bg-stone-700 text-stone-300' : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(key)}
                      className={`p-2 rounded-lg ${
                        isDarkMode ? 'hover:bg-stone-700 text-stone-500' : 'hover:bg-stone-100 text-stone-400'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Delete All Confirmation */}
      <AnimatePresence>
        {deleteConfirm === 'all' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`p-4 rounded-2xl ${
              isDarkMode ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-50 border border-red-200'
            }`}
          >
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className={`font-medium ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                  Delete all memories?
                </p>
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                  This will permanently erase everything the AI knows about you.
                </p>
                <div className="flex space-x-2 mt-3">
                  <button
                    onClick={deleteAllMemories}
                    className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium"
                  >
                    Delete All
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium ${
                      isDarkMode ? 'bg-stone-700 text-stone-300' : 'bg-stone-200 text-stone-600'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  // ===== RENDER PRIVACY TAB =====
  const renderPrivacyTab = () => (
    <div className="space-y-4">
      <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-stone-800/50' : 'bg-white border border-stone-200'}`}>
        <h3 className={`font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
          Data Storage
        </h3>
        <p className={`text-sm ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
          Your conversations and memories are stored securely. Canvas documents are saved locally.
        </p>
      </div>

      <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-stone-800/50' : 'bg-white border border-stone-200'}`}>
        <h3 className={`font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
          AI Memory
        </h3>
        <p className={`text-sm mb-3 ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
          The AI remembers information you share to personalize your experience.
        </p>
        <button
          onClick={() => setActiveTab('memories')}
          className="text-sm text-purple-500 font-medium"
        >
          Manage memories →
        </button>
      </div>

      <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-purple-500/10' : 'bg-purple-50'}`}>
        <p className={`text-sm ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>
          You can ask the AI to forget specific information at any time. Just say things like:
        </p>
        <ul className={`text-sm mt-2 space-y-1 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
          <li>• "Forget my location"</li>
          <li>• "Delete my hobbies from memory"</li>
          <li>• "Forget everything about me"</li>
        </ul>
      </div>
    </div>
  );

  // ===== RENDER ABOUT TAB =====
  const renderAboutTab = () => (
    <div className="space-y-4">
      <div className="text-center py-6">
        <img 
          src="/assets/images/Mascot.png" 
          alt="NeuraPlay" 
          className="w-20 h-20 mx-auto mb-4"
        />
        <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
          NeuraPlay
        </h2>
        <p className={`text-sm ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
          AI-Powered Learning Platform
        </p>
      </div>

      <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-stone-800/50' : 'bg-white border border-stone-200'}`}>
        <div className="flex justify-between items-center">
          <span className={isDarkMode ? 'text-stone-400' : 'text-stone-500'}>Version</span>
          <span className={isDarkMode ? 'text-white' : 'text-stone-800'}>1.0.0</span>
        </div>
      </div>

      <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-stone-800/50' : 'bg-white border border-stone-200'}`}>
        <p className={`text-sm ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
          © 2025 NeuraPlay. All rights reserved.
        </p>
        <p className={`text-xs mt-2 ${isDarkMode ? 'text-stone-500' : 'text-stone-400'}`}>
          For support: support@neuraplay.biz
        </p>
      </div>
    </div>
  );

  // ===== TAB HEADER =====
  const getTabTitle = () => {
    switch (activeTab) {
      case 'theme': return 'Appearance';
      case 'memories': return 'My Memories';
      case 'privacy': return 'Privacy';
      case 'about': return 'About';
      default: return 'Settings';
    }
  };

  // ===== MAIN RENDER =====
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed inset-x-0 bottom-0 z-50 rounded-t-3xl max-h-[85vh] ${
              isDarkMode ? 'bg-stone-900' : 'bg-white'
            }`}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className={`w-10 h-1 rounded-full ${
                isDarkMode ? 'bg-stone-700' : 'bg-stone-300'
              }`} />
            </div>

            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${
              isDarkMode ? 'border-stone-800' : 'border-stone-200'
            }`}>
              {activeTab !== 'main' ? (
                <button
                  onClick={() => setActiveTab('main')}
                  className={`p-2 rounded-xl ${
                    isDarkMode ? 'hover:bg-stone-800 text-stone-300' : 'hover:bg-stone-100 text-stone-600'
                  }`}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              ) : (
                <div className="w-9" />
              )}
              
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                {getTabTitle()}
              </h2>
              
              <button
                onClick={onClose}
                className={`p-2 rounded-xl ${
                  isDarkMode ? 'hover:bg-stone-800 text-stone-300' : 'hover:bg-stone-100 text-stone-600'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 100px)' }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.15 }}
                >
                  {activeTab === 'main' && renderMainMenu()}
                  {activeTab === 'theme' && renderThemeTab()}
                  {activeTab === 'memories' && renderMemoriesTab()}
                  {activeTab === 'privacy' && renderPrivacyTab()}
                  {activeTab === 'about' && renderAboutTab()}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Action Feedback Toast */}
            <AnimatePresence>
              {actionFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className={`fixed bottom-20 left-4 right-4 p-3 rounded-xl flex items-center space-x-2 ${
                    actionFeedback.type === 'success'
                      ? 'bg-green-500 text-white'
                      : 'bg-red-500 text-white'
                  }`}
                >
                  {actionFeedback.type === 'success' 
                    ? <CheckCircle className="w-5 h-5" />
                    : <AlertTriangle className="w-5 h-5" />
                  }
                  <span className="text-sm font-medium">{actionFeedback.message}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileSettings;

