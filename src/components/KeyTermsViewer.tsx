// Key Terms Viewer - Displays terminology for soft skills, technical, and academic courses
// Uses: term, definition, example, category (NOT native/romanized/pronunciation like vocabulary)
// NOTE: NO internal navigation - parent ChunkContentViewer handles all navigation

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  BookOpen,
  Lightbulb,
  Tag,
  List,
  LayoutGrid,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { CourseChunk } from '../types/LearningModule.types';

interface KeyTerm {
  term: string;
  definition: string;
  example?: string;
  category?: string;
}

interface KeyTermsViewerProps {
  chunk: CourseChunk;
  isDarkMode: boolean;
  onComplete: () => void;
}

export const KeyTermsViewer: React.FC<KeyTermsViewerProps> = ({
  chunk,
  isDarkMode,
  onComplete
}) => {
  // Support both keyTerms (new) and vocabularyItems (legacy) fields
  const keyTerms: KeyTerm[] = (chunk as any).keyTerms || chunk.vocabularyItems?.map((v: any) => ({
    term: v.term || v.native || v.concept || '',
    definition: v.definition || v.meaning || v.output || '',
    example: v.example || v.usage || '',
    category: v.category || ''
  })) || [];
  
  const [learnedItems, setLearnedItems] = useState<Set<number>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Get unique categories
  const categories = ['all', ...new Set(keyTerms.map(t => t.category).filter(Boolean))];

  // Filtered terms
  const filteredTerms = filterCategory === 'all' 
    ? keyTerms 
    : keyTerms.filter(t => t.category === filterCategory);

  // Auto-complete when all items learned
  useEffect(() => {
    if (keyTerms.length > 0 && learnedItems.size === keyTerms.length) {
      onComplete();
    }
  }, [learnedItems.size, keyTerms.length, onComplete]);

  const toggleLearned = (index: number) => {
    const newLearned = new Set(learnedItems);
    if (newLearned.has(index)) {
      newLearned.delete(index);
    } else {
      newLearned.add(index);
    }
    setLearnedItems(newLearned);
  };

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  if (keyTerms.length === 0) {
    return (
      <div className={`p-6 rounded-xl text-center ${isDarkMode ? 'bg-stone-800/50 text-stone-400' : 'bg-stone-100 text-stone-600'}`}>
        <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No key terms available for this section.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className={`w-5 h-5 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
          <span className={`font-medium ${isDarkMode ? 'text-stone-200' : 'text-stone-700'}`}>
            {keyTerms.length} Key Terms
          </span>
          <span className={`text-sm ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
            ({learnedItems.size} mastered)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Category filter */}
          {categories.length > 2 && (
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                isDarkMode 
                  ? 'bg-stone-800 border-stone-700 text-stone-300' 
                  : 'bg-white border-stone-300 text-stone-700'
              }`}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          )}

          {/* View mode toggle */}
          <div className={`flex rounded-lg p-1 ${isDarkMode ? 'bg-stone-800' : 'bg-stone-200'}`}>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded ${viewMode === 'cards' 
                ? (isDarkMode ? 'bg-amber-600 text-white' : 'bg-amber-500 text-white')
                : (isDarkMode ? 'text-stone-400' : 'text-stone-600')
              }`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list'
                ? (isDarkMode ? 'bg-amber-600 text-white' : 'bg-amber-500 text-white')
                : (isDarkMode ? 'text-stone-400' : 'text-stone-600')
              }`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-stone-700' : 'bg-stone-200'}`}>
        <motion.div
          className="h-full bg-gradient-to-r from-amber-500 to-green-500"
          initial={{ width: 0 }}
          animate={{ width: `${(learnedItems.size / keyTerms.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Cards View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTerms.map((term, index) => {
            const actualIndex = keyTerms.indexOf(term);
            const isLearned = learnedItems.has(actualIndex);
            const isExpanded = expandedItems.has(actualIndex);

            return (
              <motion.div
                key={actualIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`rounded-xl border overflow-hidden transition-all ${
                  isLearned
                    ? (isDarkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-300')
                    : (isDarkMode ? 'bg-stone-800/50 border-stone-700' : 'bg-white border-stone-200')
                }`}
              >
                {/* Card Header */}
                <div 
                  className={`p-4 cursor-pointer ${isDarkMode ? 'hover:bg-stone-700/30' : 'hover:bg-stone-50'}`}
                  onClick={() => toggleExpanded(actualIndex)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {term.category && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            isDarkMode ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {term.category}
                          </span>
                        )}
                      </div>
                      <h4 className={`font-semibold text-lg ${
                        isDarkMode ? 'text-stone-100' : 'text-stone-800'
                      }`}>
                        {term.term}
                      </h4>
                      <p className={`text-sm mt-1 ${
                        isDarkMode ? 'text-stone-400' : 'text-stone-600'
                      } ${!isExpanded && 'line-clamp-2'}`}>
                        {term.definition}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isLearned && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      {isExpanded ? (
                        <ChevronUp className={`w-5 h-5 ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`} />
                      ) : (
                        <ChevronDown className={`w-5 h-5 ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className={`px-4 pb-4 border-t ${isDarkMode ? 'border-stone-700' : 'border-stone-200'}`}
                  >
                    {term.example && (
                      <div className="mt-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Lightbulb className={`w-4 h-4 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                          <span className={`text-xs font-medium uppercase ${
                            isDarkMode ? 'text-stone-400' : 'text-stone-500'
                          }`}>
                            Example
                          </span>
                        </div>
                        <p className={`text-sm italic ${
                          isDarkMode ? 'text-stone-300' : 'text-stone-700'
                        }`}>
                          "{term.example}"
                        </p>
                      </div>
                    )}

                    {/* Mark as learned button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLearned(actualIndex);
                      }}
                      className={`mt-4 w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                        isLearned
                          ? (isDarkMode 
                              ? 'bg-stone-700 text-stone-300 hover:bg-stone-600' 
                              : 'bg-stone-200 text-stone-600 hover:bg-stone-300')
                          : (isDarkMode 
                              ? 'bg-green-600 text-white hover:bg-green-500' 
                              : 'bg-green-500 text-white hover:bg-green-600')
                      }`}
                    >
                      {isLearned ? 'Mark as Unlearned' : 'I Got It! ✓'}
                    </button>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className={`rounded-xl border overflow-hidden ${
          isDarkMode ? 'border-stone-700' : 'border-stone-200'
        }`}>
          <table className="w-full">
            <thead>
              <tr className={isDarkMode ? 'bg-stone-800' : 'bg-stone-100'}>
                <th className={`px-4 py-3 text-left text-sm font-medium ${
                  isDarkMode ? 'text-stone-300' : 'text-stone-600'
                }`}>Term</th>
                <th className={`px-4 py-3 text-left text-sm font-medium ${
                  isDarkMode ? 'text-stone-300' : 'text-stone-600'
                }`}>Definition</th>
                {keyTerms.some(t => t.example) && (
                  <th className={`px-4 py-3 text-left text-sm font-medium hidden md:table-cell ${
                    isDarkMode ? 'text-stone-300' : 'text-stone-600'
                  }`}>Example</th>
                )}
                <th className={`px-4 py-3 text-center text-sm font-medium w-20 ${
                  isDarkMode ? 'text-stone-300' : 'text-stone-600'
                }`}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTerms.map((term, index) => {
                const actualIndex = keyTerms.indexOf(term);
                const isLearned = learnedItems.has(actualIndex);

                return (
                  <tr
                    key={actualIndex}
                    className={`border-t cursor-pointer transition-colors ${
                      isDarkMode 
                        ? `border-stone-700 ${isLearned ? 'bg-green-900/10' : 'hover:bg-stone-800/50'}` 
                        : `border-stone-200 ${isLearned ? 'bg-green-50' : 'hover:bg-stone-50'}`
                    }`}
                    onClick={() => toggleLearned(actualIndex)}
                  >
                    <td className={`px-4 py-3 ${isDarkMode ? 'text-stone-200' : 'text-stone-800'}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{term.term}</span>
                        {term.category && (
                          <Tag className={`w-3 h-3 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                        )}
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-stone-400' : 'text-stone-600'}`}>
                      {term.definition}
                    </td>
                    {keyTerms.some(t => t.example) && (
                      <td className={`px-4 py-3 text-sm italic hidden md:table-cell ${
                        isDarkMode ? 'text-stone-500' : 'text-stone-500'
                      }`}>
                        {term.example || '-'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-center">
                      {isLearned ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <div className={`w-5 h-5 rounded-full border-2 mx-auto ${
                          isDarkMode ? 'border-stone-600' : 'border-stone-300'
                        }`} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick complete button */}
      {learnedItems.size < keyTerms.length && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => {
              const allIndices = new Set(keyTerms.map((_, i) => i));
              setLearnedItems(allIndices);
            }}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              isDarkMode 
                ? 'text-stone-400 hover:text-stone-200 hover:bg-stone-800' 
                : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100'
            }`}
          >
            Mark all as learned
          </button>
        </div>
      )}
    </div>
  );
};

export default KeyTermsViewer;

