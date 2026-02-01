import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Mic, MicOff, Send, Square, History, 
  Download, ChevronLeft, ChevronRight, Trash2, X, Paperclip
} from 'lucide-react';
import CanvasElementRenderer from './CanvasElementRenderer';
import { useCanvasStore } from '../stores/canvasStore';
import { useTheme } from '../contexts/ThemeContext';
import useMobileGestures from '../hooks/useMobileGestures';
import { exportMarkdownToPDF } from '../utils/pdfExport';

export interface MobileCanvasInterfaceProps {
  onClose: () => void;
  onSendMessage: (message: string, language?: string) => Promise<void>;
  isLoading: boolean;
  onCancelRequest?: () => void;
  // STT integration
  onStartRecording: () => Promise<void>;
  onStopRecording: () => void;
  isRecording: boolean;
  // File attachment support (same as mobile chat)
  uploadedFiles?: any[];
  onFilesSelected?: (files: any[]) => void;
  onFilesRemoved?: (fileIds: string[]) => void;
  uploadLimits?: { maxFileSize: number; maxFiles: number };
  // Detected language from STT
  detectedLanguage?: string;
}

const MobileCanvasInterface: React.FC<MobileCanvasInterfaceProps> = ({
  onClose,
  onSendMessage,
  isLoading,
  onCancelRequest,
  onStartRecording,
  onStopRecording,
  isRecording,
  uploadedFiles = [],
  onFilesSelected,
  onFilesRemoved,
  uploadLimits = { maxFileSize: 10, maxFiles: 3 },
  detectedLanguage
}) => {
  const { isDarkMode } = useTheme();
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Canvas store
  const currentConversationId = useCanvasStore(state => state.currentConversationId) || 'default';
  const canvasElements = useCanvasStore(
    state => state.canvasElementsByConversation[state.currentConversationId] || []
  );
  
  // Local state
  const [inputMessage, setInputMessage] = useState('');
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Swipe navigation state
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  // Get current element
  const currentElement = canvasElements[0];
  const currentVersion = currentElement?.currentVersion || 1;
  const totalVersions = currentElement?.versions?.length || 1;

  // Version navigation and deletion
  const { updateCanvasElement, deleteCanvasVersion, permanentlyDeleteCanvasElement } = useCanvasStore();
  
  // Swipe handlers for navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only track horizontal swipes starting from edges
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    setIsSwiping(false);
  }, []);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const diffX = touch.clientX - touchStartX.current;
    const diffY = touch.clientY - touchStartY.current;
    
    // Only track horizontal swipes (not vertical scrolling)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 20) {
      setIsSwiping(true);
      // Only allow swipe right (to go back/left pane)
      if (diffX > 0) {
        setSwipeOffset(Math.min(diffX, 150));
      }
    }
  }, []);
  
  const handleTouchEnd = useCallback(() => {
    if (isSwiping && swipeOffset > 80) {
      // Close canvas and navigate back
      onClose();
    }
    setSwipeOffset(0);
    setIsSwiping(false);
  }, [isSwiping, swipeOffset, onClose]);
  
  const goToPreviousVersion = () => {
    if (currentElement && currentVersion > 1) {
      updateCanvasElement(currentElement.id, {
        currentVersion: currentVersion - 1
      });
    }
  };

  const goToNextVersion = () => {
    if (currentElement && currentVersion < totalVersions) {
      updateCanvasElement(currentElement.id, {
        currentVersion: currentVersion + 1
      });
    }
  };

  // Handle send - matches mobile chat input behavior
  const handleSend = async () => {
    // Allow sending if there's either a message OR uploaded files (same as mobile chat)
    if (!inputMessage.trim() && uploadedFiles.length === 0 && !isRecording) return;
    
    if (isRecording) {
      // Stop recording - STT will process and auto-send
      onStopRecording();
    } else {
      // Send message with detected language (same as mobile chat)
      await onSendMessage(inputMessage, detectedLanguage);
      setInputMessage('');
    }
  };

  // Handle recording toggle
  const toggleRecording = async () => {
    if (isRecording) {
      onStopRecording();
    } else {
      await onStartRecording();
    }
  };

  // File handling - matches mobile chat input
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onFilesSelected) return;
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      if (uploadedFiles.length + selectedFiles.length > uploadLimits.maxFiles) {
        console.warn(`Maximum ${uploadLimits.maxFiles} files allowed`);
        return;
      }

      const processedFiles = selectedFiles.map((file) => {
        let normalizedType: 'image' | 'document' = 'document';
        if (file.type.startsWith('image/')) {
          normalizedType = 'image';
        }
        return {
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          name: file.name,
          size: file.size,
          type: normalizedType,
          mimeType: file.type
        };
      });
      
      onFilesSelected(processedFiles);
    }
    e.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (!onFilesSelected) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      if (uploadedFiles.length + droppedFiles.length > uploadLimits.maxFiles) {
        console.warn(`Maximum ${uploadLimits.maxFiles} files allowed`);
        return;
      }

      const processedFiles = droppedFiles.map((file) => {
        let normalizedType: 'image' | 'document' = 'document';
        if (file.type.startsWith('image/')) {
          normalizedType = 'image';
        }
        return {
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          name: file.name,
          size: file.size,
          type: normalizedType,
          mimeType: file.type
        };
      });
      
      onFilesSelected(processedFiles);
    }
  };

  // DISABLED: Touch gestures for zoom/pan
  // The canvas container should remain fixed in place
  // Only document content should scroll naturally with overflow-y
  /*
  useMobileGestures({
    swipeThreshold: 30,
    pinchThreshold: 0.05,
  }, (gesture) => {
    if (!canvasContainerRef.current) return;
    
    switch (gesture.type) {
      case 'pinch':
        if (gesture.scale !== undefined) {
          const newScale = Math.max(0.5, Math.min(3, scale * gesture.scale));
          setScale(newScale);
        }
        break;
        
      case 'swipe':
        const sensitivity = 1.5;
        const deltaX = gesture.endPosition.x - gesture.startPosition.x;
        const deltaY = gesture.endPosition.y - gesture.startPosition.y;
        
        setPosition(prev => ({
          x: prev.x + (deltaX * sensitivity),
          y: prev.y + (deltaY * sensitivity)
        }));
        break;
    }
  });
  */

  // Removed: zoom and reset functions - canvas is now fixed, only document scrolls

  // Export current version
  const handleExport = async () => {
    if (!currentElement) return;
    
    try {
      const version = currentElement.versions?.[currentVersion - 1];
      if (!version) return;
      
      const content = version.content;
      const title = currentElement.content?.title || 'document';
      const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_v${currentVersion}.pdf`;
      
      await exportMarkdownToPDF(content, filename, `${title} (Version ${currentVersion})`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  return (
    <motion.div 
      className={`fixed inset-0 z-50 flex flex-col ${isDarkMode ? 'bg-stone-900' : 'bg-stone-50'}`}
      style={{ 
        transform: swipeOffset > 0 ? `translateX(${swipeOffset}px)` : 'none',
        opacity: swipeOffset > 0 ? 1 - (swipeOffset / 300) : 1
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe indicator */}
      {swipeOffset > 20 && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-50 flex items-center">
          <div className={`w-1 h-24 rounded-r-full ${swipeOffset > 80 ? 'bg-purple-500' : 'bg-stone-500'} transition-colors`} />
          <span className={`ml-2 text-xs ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
            {swipeOffset > 80 ? 'Release to close' : 'Swipe to close'}
          </span>
        </div>
      )}
      
      {/* Header - Simplified */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        isDarkMode ? 'border-stone-800 bg-stone-900' : 'border-stone-200 bg-white'
      }`}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onClose}
            className={`p-2 rounded-xl ${
              isDarkMode ? 'hover:bg-stone-800 text-stone-400' : 'hover:bg-stone-100 text-stone-600'
            }`}
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex-1 min-w-0">
            <h2 className={`text-sm font-semibold truncate ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
              {currentElement?.content?.title || 'Canvas Document'}
            </h2>
            <p className={`text-xs ${isDarkMode ? 'text-stone-500' : 'text-stone-500'}`}>
              Swipe right to navigate back
            </p>
          </div>
        </div>
      </div>

      {/* Canvas Content - Fixed container with natural scrolling */}
      <div ref={canvasContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden relative bg-transparent">
        {currentElement && currentConversationId ? (
          <div className="w-full h-full">
            <CanvasElementRenderer
              element={currentElement}
              conversationId={currentConversationId}
              isFullscreen={false}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className={`text-sm ${isDarkMode ? 'text-stone-400' : 'text-stone-600'}`}>
              No canvas content yet
            </p>
          </div>
        )}
      </div>

      {/* Bottom Action Bar - Version Navigation + Actions */}
      <div className={`flex items-center justify-between px-3 py-2 border-t ${
        isDarkMode ? 'border-stone-800 bg-stone-900' : 'border-stone-200 bg-white'
      }`}>
        {/* Left: Version Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={goToPreviousVersion}
            disabled={currentVersion === 1 || totalVersions <= 1}
            className={`p-2 rounded-xl disabled:opacity-30 ${
              isDarkMode ? 'hover:bg-stone-800 text-stone-400' : 'hover:bg-stone-100 text-stone-600'
            }`}
          >
            <ChevronLeft size={18} />
          </button>
          
          <span className={`text-xs font-medium min-w-[40px] text-center ${
            isDarkMode ? 'text-stone-400' : 'text-stone-600'
          }`}>
            {currentVersion}/{totalVersions}
          </span>
          
          <button
            onClick={goToNextVersion}
            disabled={currentVersion === totalVersions || totalVersions <= 1}
            className={`p-2 rounded-xl disabled:opacity-30 ${
              isDarkMode ? 'hover:bg-stone-800 text-stone-400' : 'hover:bg-stone-100 text-stone-600'
            }`}
          >
            <ChevronRight size={18} />
          </button>
        </div>
        
        {/* Right: Action Buttons */}
        <div className="flex items-center gap-1">
          {/* History */}
          <button
            onClick={() => setShowVersionHistory(!showVersionHistory)}
            className={`p-2 rounded-xl ${
              showVersionHistory
                ? 'bg-purple-500/20 text-purple-500'
                : isDarkMode ? 'hover:bg-stone-800 text-stone-400' : 'hover:bg-stone-100 text-stone-600'
            }`}
            title="Version History"
          >
            <History size={18} />
          </button>
          
          {/* Export */}
          <button
            onClick={handleExport}
            className={`p-2 rounded-xl ${
              isDarkMode ? 'hover:bg-stone-800 text-stone-400' : 'hover:bg-stone-100 text-stone-600'
            }`}
            title="Export PDF"
          >
            <Download size={18} />
          </button>
          
          {/* Delete */}
          <button
            onClick={() => {
              if (currentElement && window.confirm('Delete this entire canvas document? This cannot be undone.')) {
                permanentlyDeleteCanvasElement(currentElement.id);
                onClose();
              }
            }}
            className={`p-2 rounded-xl ${
              isDarkMode ? 'hover:bg-red-900/20 text-stone-500 hover:text-red-400' : 'hover:bg-red-50 text-stone-400 hover:text-red-500'
            }`}
            title="Delete Document"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Hidden file input - same as mobile chat */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.txt,.doc,.docx,.md"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Input Area - Unified with mobile chat styling */}
      <div className={`px-4 py-3 border-t ${
        isDarkMode ? 'border-stone-800 bg-stone-900' : 'border-stone-200 bg-white'
      }`}>
        {/* File preview area - same as mobile chat */}
        {uploadedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {uploadedFiles.map((file) => (
              <div 
                key={file.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-stone-800 border-stone-600 text-stone-300' 
                    : 'bg-stone-100 border-stone-300 text-stone-700'
                }`}
              >
                <Paperclip size={14} />
                <span className="text-sm truncate max-w-[120px]">{file.name}</span>
                {onFilesRemoved && (
                  <button
                    onClick={() => onFilesRemoved([file.id])}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div 
          className={`flex items-end gap-2 p-2 rounded-2xl ${
            isDarkMode ? 'bg-stone-800 border border-stone-700' : 'bg-stone-50 border border-stone-200'
          } ${isDragActive ? 'ring-2 ring-purple-500 ring-opacity-50' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Microphone Button */}
          <button
            onClick={toggleRecording}
            disabled={isLoading}
            className={`p-2.5 rounded-xl transition-colors ${
              isRecording
                ? 'bg-red-500 text-white animate-pulse'
                : isDarkMode
                  ? 'bg-stone-700 text-stone-400 hover:bg-stone-600 hover:text-stone-300'
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-600'
            } disabled:opacity-50`}
          >
            {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {/* Input Field with attachment button - same as mobile chat */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isRecording ? "Listening..." : "Add to canvas or revise..."}
              rows={1}
              disabled={isRecording || isLoading}
              className={`w-full px-3 py-2.5 pr-10 bg-transparent text-sm resize-none outline-none ${
                isDarkMode 
                  ? 'text-white placeholder-stone-500' 
                  : 'text-stone-800 placeholder-stone-400'
              } disabled:opacity-50 ${isDragActive ? 'bg-purple-50 dark:bg-purple-900/20' : ''}`}
              style={{
                minHeight: '40px',
                maxHeight: '100px',
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 100) + 'px';
              }}
            />
            {/* File attachment button - same as mobile chat */}
            {onFilesSelected && (
              <button
                onClick={triggerFileSelect}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'text-stone-400 hover:text-stone-200 hover:bg-stone-700' 
                    : 'text-stone-500 hover:text-stone-700 hover:bg-stone-200'
                }`}
                title={`Attach files (${uploadLimits.maxFileSize}MB max, ${uploadLimits.maxFiles} files max)`}
              >
                <Paperclip size={16} />
              </button>
            )}
          </div>

          {/* Send/Stop Button */}
          <button
            onClick={isLoading ? onCancelRequest : handleSend}
            disabled={!isLoading && !inputMessage.trim() && !isRecording && uploadedFiles.length === 0}
            className={`p-2.5 rounded-xl transition-colors disabled:opacity-40 ${
              isLoading
                ? 'bg-red-500 text-white hover:bg-red-600'
                : inputMessage.trim() || isRecording || uploadedFiles.length > 0
                  ? 'bg-purple-600 text-white hover:bg-purple-500'
                  : isDarkMode ? 'bg-stone-700 text-stone-500' : 'bg-stone-200 text-stone-400'
            }`}
          >
            {isLoading ? <Square size={18} /> : <Send size={18} />}
          </button>
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="mt-3 flex items-center justify-center gap-1.5">
            <div className="w-2 h-2 bg-purple-500 rounded-full chat-loading-dot" />
            <div className="w-2 h-2 bg-purple-500 rounded-full chat-loading-dot" />
            <div className="w-2 h-2 bg-purple-500 rounded-full chat-loading-dot" />
            <span className={`text-xs ml-2 ${isDarkMode ? 'text-stone-500' : 'text-stone-500'}`}>
              Generating...
            </span>
          </div>
        )}
      </div>

      {/* Version History Sidebar - Unified styling */}
      <AnimatePresence>
        {showVersionHistory && currentElement?.versions && Array.isArray(currentElement.versions) && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`absolute top-0 right-0 bottom-0 w-4/5 shadow-2xl ${
              isDarkMode ? 'bg-stone-900 border-l border-stone-800' : 'bg-white border-l border-stone-200'
            }`}
          >
            <div className="flex flex-col h-full">
              <div className={`flex items-center justify-between px-4 py-3 border-b ${
                isDarkMode ? 'border-stone-800' : 'border-stone-200'
              }`}>
                <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
                  Version History
                </h3>
                <button
                  onClick={() => setShowVersionHistory(false)}
                  className={`p-2 rounded-xl ${
                    isDarkMode ? 'hover:bg-stone-800 text-stone-400' : 'hover:bg-stone-100 text-stone-600'
                  }`}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {currentElement?.versions?.filter((v: any) => v && v.id && v.state !== 'deleted').map((version) => (
                  <div
                    key={version.id}
                    className={`px-4 py-3 rounded-xl ${
                      version.version === currentVersion
                        ? isDarkMode
                          ? 'bg-purple-500/20 border border-purple-500/30'
                          : 'bg-purple-50 border border-purple-200'
                        : isDarkMode
                          ? 'bg-stone-800/50 border border-stone-700/50 hover:bg-stone-800'
                          : 'bg-stone-50 border border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      {/* Version Info - Clickable */}
                      <button
                        onClick={() => {
                          if (currentElement?.id && version?.version) {
                            // Scroll to the version in the document
                            const versionElement = document.getElementById(`version-${version.version}`);
                            if (versionElement) {
                              versionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                            
                            // Update current version in store
                            updateCanvasElement(currentElement.id, {
                              currentVersion: version.version
                            });
                            
                            // Close the sidebar after scrolling
                            setTimeout(() => setShowVersionHistory(false), 300);
                          }
                        }}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-medium ${
                            isDarkMode ? 'text-white' : 'text-stone-900'
                          }`}>
                            Version {version.version || '?'}
                          </span>
                          <span className={`text-xs ${
                            isDarkMode ? 'text-stone-400' : 'text-stone-600'
                          }`}>
                            {version.timestamp ? new Date(version.timestamp).toLocaleDateString() : 'Unknown'}
                          </span>
                        </div>
                        <p className={`text-xs ${
                          isDarkMode ? 'text-stone-400' : 'text-stone-600'
                        } truncate`}>
                          {version.request || 'Initial version'}
                        </p>
                      </button>
                      
                      {/* Delete Button - Only show if more than 1 version */}
                      {totalVersions > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete version ${version.version}? This cannot be undone.`)) {
                              if (currentElement?.id && version?.version) {
                                deleteCanvasVersion(currentElement.id, version.version);
                                
                                // If deleted current version, switch to another
                                if (version.version === currentVersion) {
                                  const nextVersion = version.version > 1 ? version.version - 1 : version.version + 1;
                                  updateCanvasElement(currentElement.id, {
                                    currentVersion: Math.min(nextVersion, totalVersions - 1)
                                  });
                                }
                              }
                            }
                          }}
                          className={`ml-2 p-2 rounded-lg transition-colors ${
                            isDarkMode 
                              ? 'hover:bg-red-900/30 text-stone-500 hover:text-red-400' 
                              : 'hover:bg-red-100 text-stone-400 hover:text-red-500'
                          }`}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MobileCanvasInterface;

