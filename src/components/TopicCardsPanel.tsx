/**
 * 🎯 Topic Cards Panel
 * 
 * LLM-powered contextual suggestions with one-click add to canvas.
 * 
 * Features:
 * - Context-aware cards based on canvas content
 * - Preview content before adding
 * - One-click add to canvas
 * - Pin/dismiss functionality
 * - Smart relevance ranking
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Eye, Pin, FileText, Code, BarChart, Lightbulb, ChevronRight } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { topicCardService, type TopicCard } from '../services/TopicCardService';

interface TopicCardsPanelProps {
  elementId: string;
  content: string;
  contentType: 'document' | 'code' | 'chart';
  sessionId?: string;
  onCardAdded?: (cardId: string) => void;
}

const TopicCardsPanel: React.FC<TopicCardsPanelProps> = ({
  elementId,
  content,
  contentType,
  sessionId,
  onCardAdded
}) => {
  const { isDarkMode } = useTheme();
  const [cards, setCards] = useState<TopicCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewCard, setPreviewCard] = useState<TopicCard | null>(null);
  const [previewContent, setPreviewContent] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Load cards when content changes
  useEffect(() => {
    if (content.length > 50) {
      loadCards();
    }
  }, [content, contentType]);

  // Listen to card service events
  useEffect(() => {
    const handleCardsGenerated = (data: any) => {
      if (data.elementId === elementId) {
        setCards(data.cards);
      }
    };

    const handleCardDismissed = (cardId: string) => {
      setCards(prev => prev.filter(c => c.id !== cardId));
    };

    topicCardService.on('cards-generated', handleCardsGenerated);
    topicCardService.on('card-dismissed', handleCardDismissed);

    return () => {
      topicCardService.off('cards-generated', handleCardsGenerated);
      topicCardService.off('card-dismissed', handleCardDismissed);
    };
  }, [elementId]);

  const loadCards = async () => {
    setLoading(true);
    try {
      const newCards = await topicCardService.analyzeAndGenerateCards(
        elementId,
        content,
        contentType,
        sessionId
      );
      setCards(newCards);
    } catch (error) {
      console.error('Failed to load cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async (card: TopicCard) => {
    const success = await topicCardService.addCardToCanvas(card.id, elementId, sessionId);
    if (success && onCardAdded) {
      onCardAdded(card.id);
    }
  };

  const handlePreview = async (card: TopicCard) => {
    setPreviewCard(card);
    setLoadingPreview(true);
    try {
      const content = await topicCardService.generateCardContent(card);
      setPreviewContent(content);
    } catch (error) {
      console.error('Failed to generate preview:', error);
      setPreviewContent('Failed to generate preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDismiss = (card: TopicCard) => {
    topicCardService.dismissCard(card.id);
  };

  const handlePin = (card: TopicCard) => {
    if (card.isPinned) {
      topicCardService.unpinCard(card.id);
    } else {
      topicCardService.pinCard(card.id);
    }
    setCards(prev => prev.map(c => c.id === card.id ? { ...c, isPinned: !c.isPinned } : c));
  };

  const getCardIcon = (type: TopicCard['type']) => {
    switch (type) {
      case 'section':
        return <FileText className="w-4 h-4" />;
      case 'code':
        return <Code className="w-4 h-4" />;
      case 'chart':
        return <BarChart className="w-4 h-4" />;
      case 'concept':
        return <Lightbulb className="w-4 h-4" />;
      case 'expand':
        return <ChevronRight className="w-4 h-4" />;
      default:
        return <Plus className="w-4 h-4" />;
    }
  };

  return (
    <div
      className={`h-full flex flex-col ${
        isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}
    >
      {/* Header */}
      <div
        className={`p-4 border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-semibold">Suggested Additions</h3>
        </div>
        <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Click + to add to canvas
        </p>
      </div>

      {/* Cards List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : cards.length === 0 ? (
          <div className={`text-center py-12 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No suggestions yet</p>
            <p className="text-xs mt-1">Add more content to get AI-powered suggestions</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {cards.map((card) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className={`p-4 rounded-lg border transition-all ${
                  card.isPinned
                    ? isDarkMode
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-purple-300 bg-purple-50'
                    : isDarkMode
                    ? 'border-gray-700 bg-gray-900/50 hover:border-gray-600'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-start gap-2 mb-2">
                  <div
                    className={`p-1.5 rounded ${
                      isDarkMode ? 'bg-purple-500/20' : 'bg-purple-100'
                    }`}
                  >
                    {getCardIcon(card.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold truncate">{card.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                        }`}
                      >
                        {card.relevanceScore}% relevant
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Preview */}
                <p
                  className={`text-xs line-clamp-2 mb-3 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  {card.preview}
                </p>

                {/* Card Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAddCard(card)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                  <button
                    onClick={() => handlePreview(card)}
                    className={`p-1.5 rounded transition-colors ${
                      isDarkMode
                        ? 'hover:bg-gray-700'
                        : 'hover:bg-gray-200'
                    }`}
                    title="Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handlePin(card)}
                    className={`p-1.5 rounded transition-colors ${
                      card.isPinned
                        ? 'text-purple-500'
                        : isDarkMode
                        ? 'hover:bg-gray-700'
                        : 'hover:bg-gray-200'
                    }`}
                    title={card.isPinned ? 'Unpin' : 'Pin'}
                  >
                    <Pin className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDismiss(card)}
                    className={`p-1.5 rounded transition-colors ${
                      isDarkMode
                        ? 'hover:bg-red-900/20 text-red-400'
                        : 'hover:bg-red-100 text-red-600'
                    }`}
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setPreviewCard(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`max-w-2xl w-full max-h-[80vh] rounded-lg overflow-hidden ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Preview Header */}
              <div
                className={`p-4 border-b flex items-center justify-between ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}
              >
                <h3 className="text-lg font-semibold">{previewCard.title}</h3>
                <button
                  onClick={() => setPreviewCard(null)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Preview Content */}
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                {loadingPreview ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                  </div>
                ) : (
                  <pre
                    className={`text-sm whitespace-pre-wrap font-mono ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}
                  >
                    {previewContent}
                  </pre>
                )}
              </div>

              {/* Preview Footer */}
              <div
                className={`p-4 border-t flex items-center justify-end gap-2 ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}
              >
                <button
                  onClick={() => setPreviewCard(null)}
                  className={`px-4 py-2 rounded transition-colors ${
                    isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleAddCard(previewCard);
                    setPreviewCard(null);
                  }}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded transition-colors"
                >
                  Add to Canvas
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TopicCardsPanel;
