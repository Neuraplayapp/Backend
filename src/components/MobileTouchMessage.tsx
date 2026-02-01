import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Share2, ExternalLink } from 'lucide-react';
import NeuraPlayDocumentFormatter from './NeuraPlayDocumentFormatter';
import ToolResultsRenderer from './ToolResultsRenderer';
import useResponsiveLayout from '../hooks/useResponsiveLayout';
import useMobileGestures from '../hooks/useMobileGestures';

interface MobileTouchMessageProps {
  message: {
    text: string;
    isUser: boolean;
    timestamp: Date;
    toolResults?: any[];
  };
  isTyping?: boolean;
  isDarkMode: boolean;
  index: number;
  isLast: boolean;
}

const MobileTouchMessage: React.FC<MobileTouchMessageProps> = ({
  message,
  isTyping,
  isDarkMode,
  index,
  isLast
}) => {
  const responsive = useResponsiveLayout();
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);

  // Handle touch gestures on messages
  useMobileGestures({}, (gesture) => {
    if (!messageRef.current) return;
    
    // Long press to show actions
    if (gesture.type === 'longpress' && !message.isUser) {
      setShowActions(true);
      // Add haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }
    
    // Swipe to dismiss actions
    if (gesture.type === 'swipe' && showActions) {
      setShowActions(false);
    }
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(30);
      }
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const handleShare = async () => {
    if ('share' in navigator) {
      try {
        await navigator.share({
          title: 'NeuraPlay AI Message',
          text: message.text,
        });
      } catch (error) {
        console.error('Share failed:', error);
      }
    } else {
      // Fallback to copy
      handleCopy();
    }
  };

  const messageClasses = `
    relative max-w-[90%] p-4 rounded-2xl transition-all duration-200 
    ${message.isUser 
      ? 'bg-purple-600 text-white ml-auto' 
      : isDarkMode 
        ? 'bg-gray-800 text-gray-100 mr-auto' 
        : 'bg-gray-100 text-gray-900 mr-auto'
    }
    ${responsive.isTouchDevice ? 'touch-manipulation' : ''}
    ${showActions ? 'scale-105 shadow-lg' : ''}
  `;

  return (
    <div 
      ref={messageRef}
      className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={messageClasses}
        style={{ 
          minHeight: responsive.isMobile ? '52px' : '44px' // Touch-friendly minimum height
        }}
      >
        {message.isUser ? (
          <p 
            className="break-words whitespace-pre-wrap leading-relaxed"
            style={{ fontSize: responsive.isMobile ? '16px' : '14px' }}
          >
            {message.text}
          </p>
        ) : (
          <div className="space-y-3">
            <div 
              className="break-words whitespace-pre-wrap leading-relaxed"
              style={{ fontSize: responsive.isMobile ? '16px' : '14px' }}
            >
              <NeuraPlayDocumentFormatter 
                content={message.text}
                isTyping={false}
                typewriterSpeed={responsive.isMobile ? 12 : 8} // Slightly slower on mobile for readability
                enableAdvancedFormatting={true}
                className={responsive.isMobile ? 'text-base' : 'text-sm'}
              />
            </div>
            
            {message.toolResults && message.toolResults.length > 0 && (
              <ToolResultsRenderer 
                toolResults={message.toolResults}
                context={responsive.isMobile ? 'mobile-optimized' : 'standard-chat'}
                isDarkMode={isDarkMode}
                onOpenFullscreen={() => {}}
              />
            )}
          </div>
        )}

        {/* Mobile Action Menu */}
        {showActions && !message.isUser && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`absolute -top-12 left-0 flex items-center space-x-2 px-3 py-2 rounded-xl shadow-lg ${
              isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-white border border-gray-200'
            }`}
          >
            <button
              onClick={handleCopy}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'hover:bg-gray-600 text-gray-300' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              style={{ 
                minWidth: responsive.getTouchTargetSize('min'), 
                minHeight: responsive.getTouchTargetSize('min') 
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
            
            {navigator.share && (
              <button
                onClick={handleShare}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'hover:bg-gray-600 text-gray-300' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
                style={{ 
                  minWidth: responsive.getTouchTargetSize('min'), 
                  minHeight: responsive.getTouchTargetSize('min') 
                }}
              >
                <Share2 size={16} />
              </button>
            )}
            
            <button
              onClick={() => setShowActions(false)}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'hover:bg-gray-600 text-gray-300' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              style={{ 
                minWidth: responsive.getTouchTargetSize('min'), 
                minHeight: responsive.getTouchTargetSize('min') 
              }}
            >
              ×
            </button>
          </motion.div>
        )}
      </div>

      {/* Touch indicator for non-user messages */}
      {!message.isUser && responsive.isTouchDevice && !showActions && (
        <div className={`ml-2 mt-2 opacity-30 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
          <div className="text-xs">Hold to copy</div>
        </div>
      )}
    </div>
  );
};

export default MobileTouchMessage;


