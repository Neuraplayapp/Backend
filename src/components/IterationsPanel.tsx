import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Edit3, Trash2, Copy, X,
  Calendar, Clock, Tag, FileText
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface Iteration {
  id: string;
  title: string;
  content: string;
  version: string; // rev.1, rev.2, etc.
  chatId: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  type: 'directive' | 'plan' | 'chart' | 'analysis' | 'other';
}

interface IterationsPanelProps {
  chatId: string;
  isVisible: boolean;
  onClose: () => void;
  className?: string;
}

const IterationsPanel: React.FC<IterationsPanelProps> = ({
  chatId,
  isVisible,
  onClose,
  className = ''
}) => {
  const { isDarkMode } = useTheme();
  const [iterations, setIterations] = useState<Iteration[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [newIteration, setNewIteration] = useState({
    title: '',
    content: '',
    type: 'directive' as Iteration['type'],
    tags: [] as string[]
  });

  // Load iterations for current chat
  useEffect(() => {
    if (chatId && isVisible) {
      loadIterations();
    }
  }, [chatId, isVisible]);

  const loadIterations = async () => {
    try {
      // TODO: Replace with actual database call
      const mockIterations: Iteration[] = [
        {
          id: '1',
          title: 'Project Roadmap',
          content: '## Q1 2024 Development Plan\n\n**Phase 1: Foundation**\n- Set up infrastructure\n- Core features development\n\n**Phase 2: Enhancement**\n- UI/UX improvements\n- Performance optimization',
          version: 'rev.1',
          chatId,
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15'),
          tags: ['planning', 'roadmap'],
          type: 'directive'
        },
        {
          id: '2',
          title: 'User Analytics Chart',
          content: 'Interactive chart showing user growth over time',
          version: 'rev.1',
          chatId,
          createdAt: new Date('2024-01-16'),
          updatedAt: new Date('2024-01-16'),
          tags: ['analytics', 'visualization'],
          type: 'chart'
        }
      ];
      setIterations(mockIterations);
    } catch (error) {
      console.error('Failed to load iterations:', error);
    }
  };

  const createIteration = async () => {
    if (!newIteration.title.trim()) return;

    const nextVersion = `rev.${iterations.filter(i => i.chatId === chatId).length + 1}`;
    
    const iteration: Iteration = {
      id: Date.now().toString(),
      title: newIteration.title,
      content: newIteration.content,
      version: nextVersion,
      chatId,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: newIteration.tags,
      type: newIteration.type
    };

    try {
      // TODO: Save to database
      setIterations(prev => [iteration, ...prev]);
      setNewIteration({ title: '', content: '', type: 'directive', tags: [] });
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create iteration:', error);
    }
  };

  const deleteIteration = async (id: string) => {
    try {
      // TODO: Delete from database
      setIterations(prev => prev.filter(i => i.id !== id));
    } catch (error) {
      console.error('Failed to delete iteration:', error);
    }
  };

  const duplicateIteration = async (iteration: Iteration) => {
    const nextVersion = `rev.${iterations.filter(i => i.chatId === chatId).length + 1}`;
    
    const duplicated: Iteration = {
      ...iteration,
      id: Date.now().toString(),
      title: `${iteration.title} (Copy)`,
      version: nextVersion,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      // TODO: Save to database
      setIterations(prev => [duplicated, ...prev]);
    } catch (error) {
      console.error('Failed to duplicate iteration:', error);
    }
  };

  const filteredIterations = iterations.filter(iteration => {
    const matchesSearch = iteration.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         iteration.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         iteration.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = selectedType === 'all' || iteration.type === selectedType;
    const matchesChat = iteration.chatId === chatId;
    
    return matchesSearch && matchesType && matchesChat;
  });

  const typeColors = {
    directive: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    plan: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    chart: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    analysis: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
  };

  if (!isVisible) return null;

    return (
      <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className={`fixed right-0 top-0 h-full w-96 ${
        isDarkMode 
          ? 'bg-gray-900/95 border-l border-gray-700' 
          : 'bg-white/95 border-l border-gray-200'
      } backdrop-blur-sm z-50 flex flex-col ${className}`}
    >
      {/* Header */}
      <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Canvas Iterations
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'hover:bg-gray-800 text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
            }`}
          >
            <X className="w-5 h-5" />
                </button>
        </div>

        {/* Search and Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              placeholder="Search iterations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            <option value="all">All Types</option>
            <option value="directive">Directives</option>
            <option value="plan">Plans</option>
            <option value="chart">Charts</option>
            <option value="analysis">Analysis</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Create Button */}
                <button
          onClick={() => setIsCreating(true)}
          className="w-full mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Iteration
                </button>
              </div>
              
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`mb-4 p-4 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-800/50 border-gray-600' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <input
                type="text"
                placeholder="Iteration title..."
                value={newIteration.title}
                onChange={(e) => setNewIteration(prev => ({ ...prev, title: e.target.value }))}
                className={`w-full mb-3 px-3 py-2 rounded border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
              
              <select
                value={newIteration.type}
                onChange={(e) => setNewIteration(prev => ({ ...prev, type: e.target.value as Iteration['type'] }))}
                className={`w-full mb-3 px-3 py-2 rounded border ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="directive">Directive</option>
                <option value="plan">Plan</option>
                <option value="chart">Chart</option>
                <option value="analysis">Analysis</option>
                <option value="other">Other</option>
              </select>

              <div className="flex gap-2">
                <button
                  onClick={createIteration}
                  className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => setIsCreating(false)}
                  className={`flex-1 px-3 py-2 rounded transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Iterations List */}
        <div className="space-y-3">
          {filteredIterations.map((iteration) => (
            <motion.div
              key={iteration.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-800/30 border-gray-700 hover:bg-gray-800/50' 
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              } transition-colors group cursor-pointer`}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {iteration.title}
                </h3>
                <span className={`text-xs px-2 py-1 rounded ${typeColors[iteration.type]}`}>
                  {iteration.version}
                </span>
              </div>

              <p className={`text-sm mb-3 line-clamp-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {iteration.content}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {iteration.createdAt.toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                    {iteration.updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
            </div>
            
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                    onClick={() => duplicateIteration(iteration)}
                    className={`p-1.5 rounded transition-colors ${
                      isDarkMode 
                        ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                        : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                    }`}
                title="Duplicate"
              >
                <Copy className="w-3 h-3" />
              </button>
                  <button
                    onClick={() => {/* TODO: Edit functionality */}}
                    className={`p-1.5 rounded transition-colors ${
                      isDarkMode 
                        ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                        : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                    }`}
                    title="Edit"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
              <button
                    onClick={() => deleteIteration(iteration.id)}
                    className={`p-1.5 rounded transition-colors ${
                      isDarkMode 
                        ? 'hover:bg-red-900/50 text-gray-400 hover:text-red-400' 
                        : 'hover:bg-red-100 text-gray-500 hover:text-red-600'
                    }`}
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
          
              {iteration.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {iteration.tags.map((tag, index) => (
                    <span
                      key={index}
                      className={`text-xs px-2 py-1 rounded-full ${
                        isDarkMode 
                          ? 'bg-gray-700 text-gray-300' 
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      #{tag}
                    </span>
                  ))}
                    </div>
                  )}
            </motion.div>
          ))}

          {filteredIterations.length === 0 && (
            <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No iterations found</p>
              <p className="text-sm">Create your first iteration to get started</p>
                    </div>
                  )}
        </div>
      </div>
    </motion.div>
  );
};

export default IterationsPanel;
