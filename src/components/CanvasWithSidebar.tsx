/**
 * 🎯 Canvas With Sidebar
 * 
 * Complete integrated layout with clean UI:
 * - Main canvas area (70% width)
 * - Right sidebar (30% width) with:
 *   - Revision History (top)
 *   - Topic Cards (bottom)
 * 
 * Features:
 * - Clean, uncluttered design
 * - Progressive disclosure
 * - Single red thread from canvas → history → suggestions
 * - Responsive layout
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { type CanvasElement } from '../stores/canvasStore';
import CanvasElementRenderer from './CanvasElementRenderer';
import CanvasRevisionHistory from './CanvasRevisionHistory';
import TopicCardsPanel from './TopicCardsPanel';

interface CanvasWithSidebarProps {
  element: CanvasElement;
  conversationId: string;
  onClose?: () => void;
}

const CanvasWithSidebar: React.FC<CanvasWithSidebarProps> = ({
  element,
  conversationId,
  onClose
}) => {
  const { isDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'history' | 'suggestions'>('suggestions');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Get content for topic cards
  const elementContent = typeof element.content === 'string' 
    ? element.content 
    : JSON.stringify(element.content);

  return (
    <div
      className={`
        h-screen flex
        ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}
      `}
    >
      {/* Main Canvas Area (70% width) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Clean Canvas Container */}
        <div className="flex-1 p-4 overflow-hidden">
          <CanvasElementRenderer
            element={element}
            conversationId={conversationId}
            onClose={onClose}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          />
        </div>
      </div>

      {/* Sidebar Toggle Button */}
      <AnimatePresence>
        {!sidebarOpen && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={() => setSidebarOpen(true)}
            className={`
              fixed right-0 top-1/2 -translate-y-1/2 z-40
              p-3 rounded-l-lg shadow-lg
              ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'}
              transition-colors
            `}
            title="Show sidebar"
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Right Sidebar (30% width) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '30%', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`
              flex flex-col border-l overflow-hidden
              ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
            `}
            style={{ minWidth: '320px', maxWidth: '500px' }}
          >
            {/* Sidebar Header */}
            <div className={`
              flex items-center justify-between p-4 border-b
              ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}
            `}>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSidebarTab('history')}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    ${sidebarTab === 'history'
                      ? 'bg-purple-500 text-white'
                      : isDarkMode
                      ? 'hover:bg-gray-700'
                      : 'hover:bg-gray-100'
                    }
                  `}
                >
                  History
                </button>
                <button
                  onClick={() => setSidebarTab('suggestions')}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    ${sidebarTab === 'suggestions'
                      ? 'bg-purple-500 text-white'
                      : isDarkMode
                      ? 'hover:bg-gray-700'
                      : 'hover:bg-gray-100'
                    }
                  `}
                >
                  Suggestions
                </button>
              </div>
              
              <button
                onClick={() => setSidebarOpen(false)}
                className={`
                  p-2 rounded-lg transition-colors
                  ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}
                `}
                title="Hide sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                {sidebarTab === 'history' ? (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="h-full"
                  >
                    <CanvasRevisionHistory
                      elementId={element.id}
                      sessionId={conversationId}
                      onRestore={(versionId) => {
                        console.log('Restored version:', versionId);
                      }}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="suggestions"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="h-full"
                  >
                    <TopicCardsPanel
                      elementId={element.id}
                      content={elementContent}
                      contentType={element.type as 'document' | 'code' | 'chart'}
                      sessionId={conversationId}
                      onCardAdded={(cardId) => {
                        console.log('Card added:', cardId);
                        // Optionally switch to history tab to see the new addition
                        // setSidebarTab('history');
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CanvasWithSidebar;
