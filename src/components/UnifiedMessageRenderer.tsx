/**
 * UNIFIED MESSAGE RENDERER
 * 
 * Consolidates all message rendering functionality into a single, 
 * state-of-the-art component that replaces:
 * - ExpandableMessageCard.tsx
 * - RefinedMessageRenderer.tsx  
 * - IntelligentMessageRenderer.tsx
 * - MessageCard.tsx
 * 
 * Features:
 * - NPU-powered intelligent rendering
 * - Adaptive expansion and interaction
 * - Mobile-first responsive design
 * - Semantic context awareness
 * - Performance-optimized virtualization
 * - Unified interface for all contexts
 */

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, ChevronUp, Copy, Share2, 
  Bookmark, Pin, Brain
} from 'lucide-react';
import { useMessageRendering } from '../hooks/useMessageRendering';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import NeuraPlayDocumentFormatter from './NeuraPlayDocumentFormatter';
import AdvancedToolResultsRenderer from './AdvancedToolResultsRenderer';
import { messageCardOrchestrator, type ChatContext } from '../services/MessageCardOrchestrator';

// Unified message data interface
export interface UnifiedMessageData {
  id?: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  toolResults?: any[];
  visionAnalysis?: any;
  processedDocuments?: any;
  combinedInsights?: any;
  metadata?: any;
  confusionLevel?: number;
  semanticSimilarity?: number;
  canvasActivation?: boolean;
}

// Rendering context types
export type RenderingContext = 
  | 'small-chat'      // Compact mobile chat
  | 'big-chat'        // Full desktop chat  
  | 'focus-mode'      // Distraction-free reading
  | 'card-view'       // Card-based layout
  | 'card-expanded'   // Detailed expanded view
  | 'feed'            // Social media style feed
  | 'archive';        // Historical archive view

// Expansion states
export type ExpansionState = 'collapsed' | 'preview' | 'expanded' | 'focus';

export interface UnifiedMessageRendererProps {
  message: UnifiedMessageData;
  context: RenderingContext;
  
  // Appearance
  isDarkMode?: boolean;
  initialExpansion?: ExpansionState;
  maxCollapsedHeight?: number;
  
  // Behavior
  enableAutoExpansion?: boolean;
  enableNPUOrchestration?: boolean;
  enableSemanticExpansion?: boolean;
  enableInteractions?: boolean;
  
  // Callbacks
  onExpansionChange?: (state: ExpansionState) => void;
  onInteraction?: (type: string, data: any) => void;
  onCanvasActivation?: (data: any) => void;
  onCopy?: (text: string) => void;
  onShare?: (data: any) => void;
  onBookmark?: (messageId: string) => void;
  onPin?: (messageId: string) => void;
}

const UnifiedMessageRenderer: React.FC<UnifiedMessageRendererProps> = ({
  message,
  context,
  isDarkMode = false,
  initialExpansion = 'expanded', // Always show full messages by default
  maxCollapsedHeight = 120,
  enableAutoExpansion = true,
  enableNPUOrchestration = false, // Hidden by default for production users
  enableSemanticExpansion = true,
  enableInteractions = true,
  onExpansionChange,
  onInteraction,
  onCanvasActivation,
  onCopy,
  onShare,
  onBookmark,
  onPin
}) => {
  // Hooks
  const responsive = useResponsiveLayout();
  const { isDarkMode: themeIsDark } = useTheme();
  const actualIsDarkMode = isDarkMode || themeIsDark;
  const { user } = useUser();
  
  // 🔑 Get actual userId - priority: user.id (UUID) > user.username > fallback
  const actualUserId = user?.id || user?.username || user?.email || 'current-user';
  
  // ONLY show NPU debugging if explicitly enabled via props - NEVER by default
  const showNPUDebugging = enableNPUOrchestration === true;
  
  // State
  const [expansionState, setExpansionState] = useState<ExpansionState>(initialExpansion);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  
  // Refs
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Message ID
  const messageId = useMemo(() => 
    message.id || `msg-${message.timestamp.getTime()}-${Math.random().toString(36).substr(2, 9)}`,
    [message.id, message.timestamp]
  );

  // Initialize card orchestrator context
  const [orchestratorConfig, setOrchestratorConfig] = useState<any>(null);
  
  useEffect(() => {
    // Map UnifiedMessageRenderer context to ChatContext
    const chatContext: ChatContext = context === 'small-chat' ? 'small-chat' : 'big-chat';
    
    // Analyze context for optimal card rendering
    const config = messageCardOrchestrator.analyzeContext(
      chatContext,
      { width: window.innerWidth, height: window.innerHeight },
      navigator.userAgent
    );
    
    setOrchestratorConfig(config);
  }, [context]);

  // MEMOIZED options to prevent infinite re-render loop
  const messageRenderingOptions = useMemo(() => ({
    enableNPUAnalysis: showNPUDebugging,
    enableSemanticSearch: enableSemanticExpansion,
    enableAdaptiveRendering: true,
    context: context,
    userId: actualUserId  // 🔑 FIXED: Use actual UUID instead of hardcoded placeholder
  }), [showNPUDebugging, enableSemanticExpansion, context, actualUserId]);

  // NPU-powered message analysis
  const { 
    result: renderingResult,
    isAnalyzing,
    enhancedMessage,
    shouldActivateCanvas,
    confusionLevel,
    semanticSimilarity
  } = useMessageRendering(message, messageRenderingOptions);

  // Context-aware styling
  const getContextStyles = useCallback(() => {
    const baseStyles = {
      padding: responsive.getSpacing('md'),
      borderRadius: '12px',
      fontSize: responsive.isMobile ? '14px' : '16px'
    };

    switch (context) {
      case 'small-chat':
        return {
          ...baseStyles,
          padding: responsive.getSpacing('sm'),
          borderRadius: '16px',
          maxWidth: message.isUser 
            ? (responsive.isMobile ? '90%' : '88%')  // FIXED: More breathing room for user messages
            : (responsive.isMobile ? '92%' : '90%')
        };
        
      case 'big-chat':
        return {
          ...baseStyles,
          padding: responsive.getSpacing('lg'),
          borderRadius: '12px',
          maxWidth: message.isUser 
            ? (responsive.isMobile ? '88%' : responsive.isTablet ? '88%' : '90%')  // FIXED: More space for user messages
            : (responsive.isMobile ? '90%' : responsive.isTablet ? '85%' : '85%')
        };
        
      case 'focus-mode':
        return {
          ...baseStyles,
          padding: responsive.getSpacing('lg'),
          borderRadius: '8px',
          fontSize: '18px',
          lineHeight: '1.8'
        };
        
      case 'card-view':
      case 'card-expanded':
        return {
          ...baseStyles,
          padding: responsive.getSpacing('lg'),
          borderRadius: '16px',
          boxShadow: actualIsDarkMode 
            ? '0 4px 6px rgba(0, 0, 0, 0.3)' 
            : '0 4px 6px rgba(0, 0, 0, 0.1)'
        };
        
      case 'feed':
        return {
          ...baseStyles,
          borderRadius: '12px',
          border: actualIsDarkMode 
            ? '1px solid rgba(255, 255, 255, 0.1)' 
            : '1px solid rgba(0, 0, 0, 0.1)'
        };
        
      default:
        return baseStyles;
    }
  }, [context, responsive, actualIsDarkMode]);

  // Intelligent expansion logic
  const shouldAutoExpand = useMemo(() => {
    if (!enableAutoExpansion) return false;
    
    // Auto-expand for high confusion levels
    if (confusionLevel && confusionLevel > 0.7) return true;
    
    // Auto-expand for canvas activation
    if (shouldActivateCanvas) return true;
    
    // Auto-expand for tool results
    if (message.toolResults && message.toolResults.length > 0) return true;
    
    // Auto-expand for short messages in focus mode
    if (context === 'focus-mode' && message.text.length < 200) return true;
    
    return false;
  }, [enableAutoExpansion, confusionLevel, shouldActivateCanvas, message.toolResults, context, message.text.length]);

  // Handle expansion changes
  const handleExpansionChange = useCallback((newState: ExpansionState) => {
    setExpansionState(newState);
    onExpansionChange?.(newState);
    
    // Track interaction
    onInteraction?.('expansion', { messageId, from: expansionState, to: newState });
  }, [expansionState, onExpansionChange, onInteraction, messageId]);

  // Toggle expansion
  const toggleExpansion = useCallback(() => {
    const nextState = expansionState === 'expanded' ? 'collapsed' : 'expanded';
    handleExpansionChange(nextState);
  }, [expansionState, handleExpansionChange]);

  // Action handlers
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.text);
    onCopy?.(message.text);
    onInteraction?.('copy', { messageId, text: message.text });
  }, [message.text, onCopy, onInteraction, messageId]);

  const handleShare = useCallback(() => {
    const shareData = {
      title: `Message from ${message.isUser ? 'User' : 'Assistant'}`,
      text: message.text,
      url: window.location.href
    };
    
    if (navigator.share) {
      navigator.share(shareData);
    } else {
      navigator.clipboard.writeText(`${shareData.title}\n\n${shareData.text}`);
    }
    
    onShare?.(shareData);
    onInteraction?.('share', { messageId, data: shareData });
  }, [message, onShare, onInteraction, messageId]);

  const handleBookmark = useCallback(() => {
    setIsBookmarked(!isBookmarked);
    onBookmark?.(messageId);
    onInteraction?.('bookmark', { messageId, bookmarked: !isBookmarked });
  }, [isBookmarked, onBookmark, onInteraction, messageId]);

  const handlePin = useCallback(() => {
    setIsPinned(!isPinned);
    onPin?.(messageId);
    onInteraction?.('pin', { messageId, pinned: !isPinned });
  }, [isPinned, onPin, onInteraction, messageId]);

  const handleCanvasActivation = useCallback(() => {
    onCanvasActivation?.(enhancedMessage || message);
    onInteraction?.('canvas_activation', { messageId });
  }, [enhancedMessage, message, onCanvasActivation, onInteraction, messageId]);

  // Auto-expansion effect
  useEffect(() => {
    if (shouldAutoExpand && expansionState === 'collapsed') {
      handleExpansionChange('expanded');
    }
  }, [shouldAutoExpand, expansionState, handleExpansionChange]);

  // Format timestamp
  const formatTimestamp = useCallback((date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }, []);

  // Render NPU insights
  const renderNPUInsights = useCallback(() => {
    if (!showNPUDebugging || !renderingResult) return null;
    
    return (
      <div className={`mt-3 p-3 rounded-lg border ${
        actualIsDarkMode 
          ? 'bg-purple-900/20 border-purple-700/50' 
          : 'bg-purple-50 border-purple-200'
      }`}>
        <div className="flex items-center space-x-2 mb-2">
          <Brain size={14} className="text-purple-500" />
          <span className={`text-xs font-medium ${
            actualIsDarkMode ? 'text-purple-300' : 'text-purple-700'
          }`}>
            NPU Analysis
          </span>
        </div>
        
        <div className="space-y-1 text-xs">
          {confusionLevel !== undefined && (
            <div className={actualIsDarkMode ? 'text-gray-300' : 'text-gray-600'}>
              Confusion Level: {Math.round(confusionLevel * 100)}%
            </div>
          )}
          
          {semanticSimilarity !== undefined && (
            <div className={actualIsDarkMode ? 'text-gray-300' : 'text-gray-600'}>
              Semantic Relevance: {Math.round(Number(semanticSimilarity || 0) * 100)}%
            </div>
          )}
          
          {shouldActivateCanvas && (
            <button
              onClick={handleCanvasActivation}
              className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                actualIsDarkMode 
                  ? 'bg-purple-700 hover:bg-purple-600 text-white' 
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              <Brain size={12} />
              <span>Activate Canvas</span>
            </button>
          )}
        </div>
      </div>
    );
  }, [showNPUDebugging, renderingResult, confusionLevel, semanticSimilarity, shouldActivateCanvas, actualIsDarkMode, handleCanvasActivation]);

  // Main render
  return (
    <div
      className="group relative w-full"
      style={getContextStyles()}
      onMouseEnter={() => setIsInteractive(true)}
      onMouseLeave={() => setIsInteractive(false)}
    >
      {/* Message Bubble */}
      <div
        className={`relative ${
          message.isUser
            ? `bg-purple-600 text-white ${
                context === 'small-chat' ? 'rounded-l-2xl rounded-tr-2xl rounded-br-md' : 'rounded-2xl'
              }`
            : `${
                actualIsDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'
              } ${
                context === 'small-chat' ? 'rounded-r-2xl rounded-tl-2xl rounded-bl-md' : 'rounded-2xl'
              }`
        } ${
          expansionState === 'focus' ? 'border-2 border-purple-500' : ''
        }`}
      >
        {/* Content */}
        <div 
          ref={contentRef}
          className={`${
            expansionState === 'collapsed' ? 'overflow-hidden' : ''
          }`}
          style={{
            maxHeight: expansionState === 'collapsed' ? `${maxCollapsedHeight}px` : 'none'
          }}
        >
          {/* Message Text */}
          <div className={`whitespace-pre-wrap break-words ${
            context === 'focus-mode' ? 'leading-relaxed' : 'leading-normal'
          }`}>
            {isAnalyzing ? (
              <div className="inline-flex items-center gap-1.5 py-0.5">
                <span className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-[pulse_1s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-[pulse_1s_ease-in-out_infinite]" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-[pulse_1s_ease-in-out_infinite]" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            ) : (
              <NeuraPlayDocumentFormatter 
                content={message.text}
                isTyping={false}
                typewriterSpeed={8}
                enableAdvancedFormatting={true}
                className="text-sm"
              />
            )}
          </div>

          {/* Tool Results - Use Advanced Card System with Orchestrator */}
          {/* FIXED: No wrapper padding to prevent black frame effect */}
          {message.toolResults && message.toolResults.length > 0 && (
            <div className="mt-3 -mx-1">
              <AdvancedToolResultsRenderer 
                toolResults={message.toolResults}
                context={context as any}
                isDarkMode={actualIsDarkMode}
                onCanvasActivation={handleCanvasActivation}
                orchestratorConfig={orchestratorConfig}
              />
            </div>
          )}

          {/* NPU Insights */}
          {renderNPUInsights()}
        </div>

        {/* Expansion Controls - REMOVED: Chats should show full messages by default */}

        {/* Timestamp - Hidden for cleaner UX */}
        {false && (
          <div className={`mt-2 text-xs opacity-60`}>
            {formatTimestamp(message.timestamp)}
          </div>
        )}
      </div>

      {/* Action Menu */}
      <AnimatePresence>
        {enableInteractions && isInteractive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`absolute top-0 ${
              message.isUser ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'
            } flex items-center space-x-1 px-2`}
          >
            <button
              onClick={handleCopy}
              className={`p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
              title="Copy message"
            >
              <Copy size={14} />
            </button>
            
            <button
              onClick={handleShare}
              className={`p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
              title="Share message"
            >
              <Share2 size={14} />
            </button>
            
            <button
              onClick={handleBookmark}
              className={`p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                isBookmarked ? 'text-yellow-500' : ''
              }`}
              title="Bookmark message"
            >
              <Bookmark size={14} />
            </button>
            
            <button
              onClick={handlePin}
              className={`p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                isPinned ? 'text-purple-500' : ''
              }`}
              title="Pin message"
            >
              <Pin size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UnifiedMessageRenderer;
