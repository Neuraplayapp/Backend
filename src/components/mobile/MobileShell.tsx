import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '../../contexts/UserContext';

// USE EXISTING MOBILE COMPONENTS
import MobileCanvasInterface from '../MobileCanvasInterface';
import MobileChatHistory from '../MobileChatHistory';
import NeuraPlayDocumentFormatter from '../NeuraPlayDocumentFormatter';
import AIAssistantSmall from '../AIAssistantSmall';

// NEW MOBILE-NATIVE COMPONENTS
import MobileDashboard from './MobileDashboard';
import MobileNewsPage from './MobileNewsPage';
import MobileSettings from './MobileSettings';

import { useAssistantCoordination } from '../../stores/assistantCoordinationStore';
import { useCanvasStore } from '../../stores/canvasStore';
import { conversationService, type Conversation } from '../../services/ConversationService';
import { serviceContainer } from '../../services/ServiceContainer';
import { Send, FileText, Settings, Menu, Mic, MicOff, Paperclip, X, Image as ImageIcon, FileIcon } from 'lucide-react';
import { apiService } from '../../services/APIService';

// ===== LONG PRESS HOOK =====
function useLongPress(callback: () => void, ms = 1000) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const start = () => {
    timerRef.current = setTimeout(() => {
      navigator.vibrate?.(50);
      callback();
    }, ms);
  };
  const clear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  return { onTouchStart: start, onTouchEnd: clear, onTouchMove: clear };
}

// ===== ASSISTANT PAGE (CENTER) =====
const MobileAssistantPage: React.FC<{
  onCanvasOpen: () => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  hasCanvasContent: boolean;
}> = ({ onCanvasOpen, onOpenHistory, onOpenSettings, hasCanvasContent }) => {
  const { isDarkMode } = useTheme();
  const { user } = useUser();
  const [inputMessage, setInputMessage] = useState('');
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // File attachment state
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; type: string; data: string; size: number }[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<Conversation>(() => 
    conversationService.getActiveConversation()
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Canvas elements
  const canvasElements = useCanvasStore(state => 
    state.canvasElementsByConversation[state.currentConversationId] || []
  );
  
  // Open canvas fullscreen when content exists
  useEffect(() => {
    if (canvasElements.length > 0) {
      onCanvasOpen();
    }
  }, [canvasElements.length, onCanvasOpen]);
  
  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation.messages]);
  
  // Refresh conversation
  useEffect(() => {
    const interval = setInterval(() => {
      const active = conversationService.getActiveConversation();
      if (active.messages.length !== currentConversation.messages.length) {
        setCurrentConversation(active);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [currentConversation.messages.length]);

  // ===== VOICE RECORDING =====
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await processVoiceInput(audioBlob);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      navigator.vibrate?.(30);
    } catch (error) {
      console.error('Microphone access error:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      navigator.vibrate?.(30);
    }
  };

  const processVoiceInput = async (audioBlob: Blob) => {
    setIsProcessingVoice(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      const audioBase64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]);
        };
      });

      // Send to STT API
      const response = await apiService.makeRequest({
        endpoint: '/api/stt',
        method: 'POST',
        data: { audio: audioBase64, language: 'auto' }
      });

      if (response.success && response.data?.text) {
        setInputMessage(prev => prev + (prev ? ' ' : '') + response.data.text);
      }
    } catch (error) {
      console.error('Voice processing failed:', error);
    } finally {
      setIsProcessingVoice(false);
    }
  };

  // ===== FILE ATTACHMENT =====
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (file.size > maxSize) {
      console.warn('File too large');
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setAttachedFiles(prev => [...prev, {
        name: file.name,
        type: type === 'image' ? 'image' : 'document',
        data: base64,
        size: file.size
      }]);
    };
    reader.readAsDataURL(file);
    
    setShowAttachMenu(false);
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!inputMessage.trim() && attachedFiles.length === 0) || isLoading) return;
    
    const message = inputMessage.trim();
    const files = [...attachedFiles];
    setInputMessage('');
    setAttachedFiles([]);
    setIsLoading(true);
    
    // Build display message
    const displayText = files.length > 0 
      ? `${message}${message ? '\n' : ''}📎 ${files.map(f => f.name).join(', ')}`
      : message;
    
    conversationService.addMessage({ text: displayText, isUser: true, timestamp: new Date() });
    setCurrentConversation(conversationService.getActiveConversation());
    
    try {
      await serviceContainer.waitForReady();
      const aiRouter = await serviceContainer.getAsync('aiRouter') as any;
      if (!aiRouter) throw new Error('AI Router not available');
      
      // Prepare attachments for AI
      const attachments = files.length > 0 ? {
        images: files.filter(f => f.type === 'image').map(f => f.data),
        documents: files.filter(f => f.type === 'document').map(f => ({
          name: f.name,
          data: f.data,
          size: f.size
        })),
        metadata: {
          totalFiles: files.length,
          types: [...new Set(files.map(f => f.type))]
        }
      } : undefined;
      
      const response = await aiRouter.processRequest({
        message: message || 'Please analyze the attached file(s).',
        sessionId: currentConversation.id,
        userId: user?.id || 'anonymous',
        mode: 'chat',
        conversationHistory: currentConversation.messages.slice(-10).map(m => ({
          role: m.isUser ? 'user' : 'assistant',
          content: m.text
        })),
        attachments,
        locationContext: {
          currentPage: '/mobile',
          isCanvasVisible: false,
          isCanvasFullscreen: false,
          activeCanvasType: null,
          assistantType: 'mobile'
        }
      });
      
      conversationService.addMessage({
        text: response.response || 'I received your message.',
        isUser: false,
        timestamp: new Date(),
        metadata: response.metadata
      });
      setCurrentConversation(conversationService.getActiveConversation());
    } catch (error) {
      console.error('Send failed:', error);
      conversationService.addMessage({
        text: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date()
      });
      setCurrentConversation(conversationService.getActiveConversation());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-stone-900' : 'bg-stone-50'}`}>
      {/* Header - Unified with News styling */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${isDarkMode ? 'border-stone-800' : 'border-stone-200'}`}>
        <div className="flex items-center space-x-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('📱 Menu clicked');
              onOpenHistory();
            }}
            className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-stone-800 active:bg-stone-700' : 'hover:bg-stone-100 active:bg-stone-200'}`}
          >
            <Menu size={20} className={isDarkMode ? 'text-stone-400' : 'text-stone-600'} />
          </button>
          <div className="flex items-center space-x-2">
            <img src="/assets/images/favicon.png" alt="NeuraPlay" className="w-6 h-6 drop-shadow-lg" />
            <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>NeuraPlay</span>
          </div>
        </div>
        
        {/* Right side buttons */}
        <div className="flex items-center space-x-2">
          {/* Open Canvas button - visible when canvas content exists */}
          {hasCanvasContent && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCanvasOpen();
              }}
              className="flex items-center space-x-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <FileText size={16} />
              <span>Canvas</span>
            </button>
          )}
          {/* Settings button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenSettings();
            }}
            className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-stone-800 active:bg-stone-700' : 'hover:bg-stone-100 active:bg-stone-200'}`}
            aria-label="Settings"
          >
            <Settings size={20} className={isDarkMode ? 'text-stone-400' : 'text-stone-600'} />
          </button>
        </div>
      </div>
      
      {/* Messages - Unified styling with News */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {currentConversation.messages.length === 0 ? (
          <div className={`text-center py-12 ${isDarkMode ? 'text-stone-400' : 'text-stone-500'}`}>
            <img src="/assets/images/Mascot.png" alt="NeuraPlay" className="w-16 h-16 mx-auto mb-4 object-contain" />
            <p className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-stone-800'}`}>
              Hello{user?.username ? `, ${user.username}` : ''}!
            </p>
            <p className="text-sm">Ask me anything or request a document, chart, or code.</p>
          </div>
        ) : (
          currentConversation.messages.map((message, index) => (
            <div key={index} className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-2xl ${
                message.isUser 
                  ? 'bg-purple-600 text-white rounded-br-sm'
                  : isDarkMode ? 'bg-stone-800 text-stone-100 rounded-bl-sm border border-stone-700/50' : 'bg-white text-stone-800 rounded-bl-sm border border-stone-200 shadow-sm'
              }`}>
                {message.isUser ? (
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                ) : (
                  <NeuraPlayDocumentFormatter content={message.text} />
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className={`px-4 py-3 rounded-2xl ${isDarkMode ? 'bg-stone-800 border border-stone-700/50' : 'bg-white border border-stone-200 shadow-sm'}`}>
              <div className="flex items-center space-x-1.5">
                <div className="w-2 h-2 bg-purple-500 rounded-full chat-loading-dot" />
                <div className="w-2 h-2 bg-purple-500 rounded-full chat-loading-dot" />
                <div className="w-2 h-2 bg-purple-500 rounded-full chat-loading-dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.md"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'file')}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e, 'image')}
      />

      {/* Attached files preview */}
      {attachedFiles.length > 0 && (
        <div className={`px-4 pt-2 ${isDarkMode ? 'bg-stone-900' : 'bg-stone-50'}`}>
          <div className="flex flex-wrap gap-2">
            {attachedFiles.map((file, idx) => (
              <div
                key={idx}
                className={`flex items-center space-x-2 px-2 py-1 rounded-lg text-xs ${
                  isDarkMode ? 'bg-stone-800 text-stone-300' : 'bg-stone-200 text-stone-600'
                }`}
              >
                {file.type === 'image' ? (
                  <ImageIcon size={12} className="text-purple-500" />
                ) : (
                  <FileIcon size={12} className="text-blue-500" />
                )}
                <span className="max-w-[100px] truncate">{file.name}</span>
                <button
                  onClick={() => removeAttachment(idx)}
                  className="p-0.5 rounded hover:bg-stone-700/50"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input - Streamlined with voice and attachment */}
      <div className={`p-4 border-t ${isDarkMode ? 'border-stone-800' : 'border-stone-200'}`}>
        <div className={`flex items-center space-x-1 p-1.5 rounded-2xl ${isDarkMode ? 'bg-stone-800 border border-stone-700' : 'bg-white border border-stone-200 shadow-sm'}`}>
          
          {/* LEFT SIDE: Voice + Attach (streamlined transparent) */}
          <div className="flex items-center">
            {/* Voice recording button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessingVoice || isLoading}
              className={`p-2 rounded-xl transition-all ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : isProcessingVoice
                    ? 'text-purple-500'
                    : isDarkMode 
                      ? 'text-stone-500 hover:text-stone-300 hover:bg-stone-700/50' 
                      : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'
              }`}
            >
              {isRecording ? <MicOff size={18} /> : isProcessingVoice ? (
                <div className="w-4.5 h-4.5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Mic size={18} />
              )}
            </button>
            
            {/* Attachment button with menu */}
            <div className="relative">
              <button
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                disabled={isLoading}
                className={`p-2 rounded-xl transition-all ${
                  showAttachMenu
                    ? isDarkMode ? 'bg-stone-700 text-purple-400' : 'bg-stone-100 text-purple-500'
                    : isDarkMode 
                      ? 'text-stone-500 hover:text-stone-300 hover:bg-stone-700/50' 
                      : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Paperclip size={18} />
              </button>
              
              {/* Attach menu */}
              <AnimatePresence>
                {showAttachMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className={`absolute bottom-full left-0 mb-2 p-2 rounded-xl shadow-lg ${
                      isDarkMode 
                        ? 'bg-stone-800/95 border border-stone-700 backdrop-blur-lg' 
                        : 'bg-white/95 border border-stone-200 backdrop-blur-lg'
                    }`}
                  >
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      className={`flex items-center space-x-2 w-full px-3 py-2 rounded-lg text-sm ${
                        isDarkMode ? 'hover:bg-stone-700 text-stone-300' : 'hover:bg-stone-100 text-stone-600'
                      }`}
                    >
                      <ImageIcon size={16} className="text-purple-500" />
                      <span>Image</span>
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex items-center space-x-2 w-full px-3 py-2 rounded-lg text-sm ${
                        isDarkMode ? 'hover:bg-stone-700 text-stone-300' : 'hover:bg-stone-100 text-stone-600'
                      }`}
                    >
                      <FileIcon size={16} className="text-blue-500" />
                      <span>Document</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Input field */}
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={isRecording ? 'Listening...' : 'Ask anything...'}
            disabled={isRecording}
            className={`flex-1 bg-transparent px-2 py-2 text-sm outline-none ${
              isDarkMode ? 'text-white placeholder-stone-500' : 'text-stone-800 placeholder-stone-400'
            } ${isRecording ? 'opacity-50' : ''}`}
          />
          
          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={(inputMessage.trim() === '' && attachedFiles.length === 0) || isLoading}
            className={`p-2 rounded-xl transition-colors ${
              (inputMessage.trim() || attachedFiles.length > 0) && !isLoading
                ? 'bg-purple-600 text-white hover:bg-purple-500'
                : isDarkMode ? 'bg-stone-700 text-stone-500' : 'bg-stone-200 text-stone-400'
            }`}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ===== PAGE INDICATOR =====
const PageIndicator: React.FC<{ currentPage: number; totalPages: number }> = ({ currentPage, totalPages }) => {
  const { isDarkMode } = useTheme();
  return (
    <div className="flex justify-center items-center space-x-2 py-2">
      {Array.from({ length: totalPages }).map((_, index) => (
        <div
          key={index}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            currentPage === index ? 'bg-purple-500 w-6' : isDarkMode ? 'bg-stone-700 w-1.5' : 'bg-stone-300 w-1.5'
          }`}
        />
      ))}
    </div>
  );
};

// ===== MAIN MOBILE SHELL =====
const MobileShell: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { user } = useUser(); // 🔧 FIX: Get user for canvas operations
  const setFullscreenAssistantOpen = useAssistantCoordination(s => s.setFullscreenAssistantOpen);
  
  // Page state - 0=News, 1=Assistant, 2=Dashboard
  const [currentPage, setCurrentPage] = useState(1);
  
  // Chat history state - LIFTED TO SHELL LEVEL
  const [showChatHistory, setShowChatHistory] = useState(false);
  
  // Canvas fullscreen state
  const [showCanvasFullscreen, setShowCanvasFullscreen] = useState(false);
  const canvasElements = useCanvasStore(state => 
    state.canvasElementsByConversation[state.currentConversationId] || []
  );
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isCanvasLoading, setIsCanvasLoading] = useState(false);
  
  // Slide-up assistant
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  
  // Settings panel
  const [showSettings, setShowSettings] = useState(false);
  
  // Touch tracking
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);
  const touchOnInteractive = useRef(false);
  
  // Sync fullscreen state
  useEffect(() => {
    setFullscreenAssistantOpen(showCanvasFullscreen);
  }, [showCanvasFullscreen, setFullscreenAssistantOpen]);
  
  // 🎨 CANVAS ACTIVATION EVENT LISTENER - Critical for mobile canvas routing
  useEffect(() => {
    const handleCanvasActivation = (event: CustomEvent) => {
      console.log('📱 MobileShell: Canvas activation event received', event.detail);
      
      // Open canvas fullscreen when content is created
      if (event.detail?.type === 'document_created' || 
          event.detail?.type === 'chart_created' ||
          event.detail?.type === 'code_created') {
        console.log('📱 MobileShell: Opening canvas fullscreen for new content');
        setShowCanvasFullscreen(true);
        setCurrentPage(1); // Switch to assistant page to see the canvas
      }
    };
    
    window.addEventListener('activateCanvas', handleCanvasActivation as EventListener);
    
    return () => {
      window.removeEventListener('activateCanvas', handleCanvasActivation as EventListener);
    };
  }, []);
  
  // Long press
  const longPressHandlers = useLongPress(() => {
    setIsLongPressing(false);
    setAssistantOpen(true);
  }, 1000);
  
  // Canvas open handler
  const handleCanvasOpen = useCallback(() => {
    if (canvasElements.length > 0) {
      setShowCanvasFullscreen(true);
    }
  }, [canvasElements.length]);
  
  // Canvas message handler - Uses canvas store ID (reflects which conversation owns this canvas)
  const handleCanvasSendMessage = async (message: string) => {
    setIsCanvasLoading(true);
    try {
      const aiRouter = await serviceContainer.getAsync('aiRouter') as any;
      if (aiRouter) {
        // 🎯 Use canvas store's conversation ID - this is the conversation that OWNS the canvas content
        // The canvas store ID is set when: 1) chat is selected, 2) canvas is opened from a document
        const canvasConvId = useCanvasStore.getState().currentConversationId;
        
        // Fallback to conversation service if canvas store has no ID (shouldn't happen)
        const sessionId = canvasConvId || conversationService.getActiveConversation().id;
        
        // Get conversation history for context
        const conversation = conversationService.getConversation(sessionId) || conversationService.getActiveConversation();
        
        console.log('📱 MobileShell: Canvas message for session:', sessionId);
        
        await aiRouter.processRequest({
          message,
          sessionId,
          userId: user?.id || 'mobile-user',
          mode: 'tool-calling', // Canvas operations use tool-calling
          conversationHistory: conversation.messages.slice(-5).map(m => ({
            role: m.isUser ? 'user' : 'assistant',
            content: m.text
          })),
          locationContext: {
            currentPage: '/canvas',
            isCanvasVisible: true,
            isCanvasFullscreen: true,
            assistantType: 'mobile'
          }
        });
      }
    } finally {
      setIsCanvasLoading(false);
    }
  };
  
  // Recording handlers
  const handleStartRecording = async () => setIsRecording(true);
  const handleStopRecording = () => setIsRecording(false);
  
  // Chat history items
  const chatHistoryItems = conversationService.getAllConversations().map(conv => ({
    id: conv.id,
    title: conv.title || 'New Conversation',
    preview: conv.messages[conv.messages.length - 1]?.text?.substring(0, 50) || 'No messages',
    timestamp: conv.messages[conv.messages.length - 1]?.timestamp,
    messageCount: conv.messages.length,
    isActive: conv.id === conversationService.getActiveConversation().id,
    category: 'chat' as const
  }));
  
  const handleChatSelect = (chatId: string) => {
    // 🎯 FIX: Use switchToConversation instead of non-existent setActiveConversation
    conversationService.switchToConversation(chatId);
    useCanvasStore.getState().setCurrentConversation(chatId);
    
    // Close chat history - the MobileAssistantPage will handle refreshing the conversation
    setShowChatHistory(false);
  };
  
  // Touch handlers with balanced swipe detection
  // 🎯 FIX: Allow navigation from ANYWHERE on screen, not just edges
  // Only block on actual clickable elements, NOT on scrollable containers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = false;
    
    // 🔧 FIX: Only detect truly interactive elements - NOT scrollable containers
    // Scrollable content should still allow swipe navigation
    const target = e.target as HTMLElement;
    const interactiveSelectors = [
      'button', 'a', 'input', 'textarea', 'select',
      '[role="button"]', '[onclick]',
      'form', // Forms should not trigger swipe
    ].join(', ');
    
    touchOnInteractive.current = !!target.closest(interactiveSelectors);
    
    // Only long press if not on interactive element
    if (!touchOnInteractive.current) {
      longPressHandlers.onTouchStart();
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    // 🔧 FIX: Always cancel long press on move
    longPressHandlers.onTouchMove();
    
    // If touch started on interactive element, don't process as swipe
    if (touchOnInteractive.current) return;
    
    const deltaX = Math.abs(e.touches[0].clientX - touchStartX.current);
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current);
    
    // 🎯 FIX: More forgiving swipe detection - prioritize horizontal movement
    // Allow swipe if horizontal movement is > vertical movement AND > 30px
    if (deltaX > 30 && deltaX > deltaY * 1.5) {
      isDragging.current = true;
    } else if (deltaY > 30 && deltaY > deltaX * 1.5) {
      // Clear vertical scroll detected - definitely not a swipe
      isDragging.current = false;
    }
    // Note: We no longer mark touchOnInteractive=true for vertical scroll
    // This allows diagonal gestures to still be evaluated at touchEnd
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    longPressHandlers.onTouchEnd();
    
    // If touch started on interactive element, don't navigate
    if (touchOnInteractive.current) {
      touchOnInteractive.current = false;
      isDragging.current = false;
      touchStartX.current = 0;
      touchStartY.current = 0;
      return;
    }
    
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    
    // 🎯 FIX: More forgiving navigation threshold
    // Navigate if horizontal swipe >60px AND horizontal movement is greater than vertical
    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > deltaY) {
      if (deltaX > 0) {
        setCurrentPage(prev => Math.max(prev - 1, 0));
      } else {
        setCurrentPage(prev => Math.min(prev + 1, 2));
      }
    }
    
    isDragging.current = false;
    touchOnInteractive.current = false;
    touchStartX.current = 0;
    touchStartY.current = 0;
  };

  // Pages - Using new native mobile components for News and Dashboard
  const pages = [
    <MobileNewsPage key="news" />,
    <MobileAssistantPage 
      key="assistant" 
      onCanvasOpen={handleCanvasOpen}
      onOpenHistory={() => {
        console.log('📱 Opening chat history from shell');
        setShowChatHistory(true);
      }}
      onOpenSettings={() => setShowSettings(true)}
      hasCanvasContent={canvasElements.length > 0}
    />,
    <MobileDashboard key="dashboard" />,
  ];

  return (
    <div 
      className={`fixed inset-0 flex flex-col ${isDarkMode ? 'bg-stone-900' : 'bg-stone-50'}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipeable Pages */}
      <div className="flex-1 overflow-hidden relative">
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${currentPage * 100}vw)`, width: '300vw' }}
        >
          {pages.map((page, index) => (
            <div key={index} className="h-full flex-shrink-0" style={{ width: '100vw' }}>
              {page}
            </div>
          ))}
        </div>
      </div>
      
      {/* Page indicator */}
      <div className={`${isDarkMode ? 'bg-stone-900' : 'bg-stone-50'} pb-safe`}>
        <PageIndicator currentPage={currentPage} totalPages={3} />
      </div>
      
      {/* CHAT HISTORY - Rendered at shell level for proper z-index */}
      <MobileChatHistory
        isOpen={showChatHistory}
        onClose={() => setShowChatHistory(false)}
        onChatSelect={handleChatSelect}
        chatHistory={chatHistoryItems}
        currentChatId={conversationService.getActiveConversation().id}
      />
      
      {/* Long press hint */}
      <AnimatePresence>
        {isLongPressing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
          >
            <div className="bg-purple-600/90 text-white px-6 py-3 rounded-full shadow-lg">
              Hold to open assistant...
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Canvas Fullscreen */}
      <AnimatePresence>
        {showCanvasFullscreen && canvasElements.length > 0 && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50"
          >
            <MobileCanvasInterface
              onClose={() => setShowCanvasFullscreen(false)}
              onSendMessage={handleCanvasSendMessage}
              isLoading={isCanvasLoading}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              isRecording={isRecording}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Slide-up Quick Assistant */}
      <AnimatePresence>
        {assistantOpen && !showCanvasFullscreen && (
          <AIAssistantSmall
            variant="slideUp"
            isOpen={assistantOpen}
            onClose={() => setAssistantOpen(false)}
          />
        )}
      </AnimatePresence>
      
      {/* Mobile Settings Panel */}
      <MobileSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
};

export default MobileShell;


