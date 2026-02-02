import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Square, Menu, Paperclip, Mic, MicOff, Volume2, VolumeX, Search, Trash2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { getTTSConfig, getModelId } from '../config/elevenlabs';
import { type LanguageCode, SUPPORTED_LANGUAGES } from '../services/LanguageService';
import useResponsiveLayout from '../hooks/useResponsiveLayout';
// OLD: Removed ConversationContext import - now using ConversationService
import NeuraPlayDocumentFormatter from './NeuraPlayDocumentFormatter';
import AdvancedToolResultsRenderer from './AdvancedToolResultsRenderer';
import MobileCanvasRenderer from './MobileCanvasRenderer';
import MobileCanvasInterface from './MobileCanvasInterface';
import ConversationSidebar from './ConversationSidebar';
import MobileChatHistory from './MobileChatHistory';
import UnifiedMessageRenderer from './UnifiedMessageRenderer';

import useMobileGestures from '../hooks/useMobileGestures';

import { serviceContainer } from '../services/ServiceContainer';
import { conversationService, type Conversation } from '../services/ConversationService';
import { messageGenerationService } from '../services/MessageGenerationService';

import { useCanvasStore } from '../stores/canvasStore';
import { useAssistantCoordination } from '../stores/assistantCoordinationStore';
import { shallow } from 'zustand/shallow';

// Fix 1: Stable empty array reference to prevent new [] on every render
const EMPTY_CANVAS_ELEMENTS: never[] = [];

// Enhanced greeting system with timezone awareness and cultural context
const getTimeBasedGreeting = (username: string): string => {
  // Use user's local timezone instead of server timezone
  const now = new Date();
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localTime = new Date(now.toLocaleString("en-US", {timeZone: userTimezone}));
  
  const hour = localTime.getHours();
  const minutes = localTime.getMinutes();
  const dayOfWeek = localTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const month = localTime.getMonth(); // 0 = January, 11 = December
  const date = localTime.getDate();
  
  // Check for holidays and special occasions
  const isNewYear = month === 0 && date === 1;
  const isChristmasEve = month === 11 && date === 24;
  const isChristmas = month === 11 && date === 25;
  const isNewYearEve = month === 11 && date === 31;
  const isValentines = month === 1 && date === 14;
  const isHalloween = month === 9 && date === 31;
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  // Holiday greetings take priority
  if (isNewYear) return `🎊 Happy New Year ${username}! Ready for a fresh start?`;
  if (isChristmasEve) return `🎄 Good Christmas Eve ${username}! The magic is in the air`;
  if (isChristmas) return `🎅 Merry Christmas ${username}! Hope your day is filled with joy`;
  if (isNewYearEve) return `🥳 Happy New Year's Eve ${username}! Almost time to celebrate`;
  if (isValentines) return `💝 Happy Valentine's Day ${username}! Spreading the love`;
  if (isHalloween) return `🎃 Happy Halloween ${username}! Ready for some spooky fun?`;
  
  // Weekend vs weekday context
  const isMonday = dayOfWeek === 1;
  const isFriday = dayOfWeek === 5;
  
  // Enhanced time-based greetings with more nuanced periods
  let timeGreeting = '';
  
  if (hour >= 4 && hour < 6) {
    timeGreeting = 'Good early morning'; // Very early
  } else if (hour >= 6 && hour < 12) {
    timeGreeting = 'Good morning';
  } else if (hour === 12 && minutes < 30) {
    timeGreeting = 'Good noon'; // Around lunchtime
  } else if (hour === 12 && minutes >= 30 || hour === 13) {
    timeGreeting = 'Good day'; // Your specific request - mid-day greeting!
  } else if (hour >= 14 && hour < 17) {
    timeGreeting = 'Good afternoon';
  } else if (hour >= 17 && hour < 19) {
    timeGreeting = 'Good early evening';
  } else if (hour >= 19 && hour < 22) {
    timeGreeting = 'Good evening';
  } else if (hour >= 22 || hour < 4) {
    timeGreeting = isWeekend ? 'Good night' : 'Working late'; // Context-aware late night
  }
  
  // Add day-specific context
  let dayContext = '';
  if (isMonday && hour < 12) {
    dayContext = ' Hope your Monday is starting well!';
  } else if (isFriday && hour >= 15) {
    dayContext = ' Almost weekend time!';
  } else if (isWeekend && hour >= 10) {
    dayContext = ' Enjoying your weekend?';
  } else {
    dayContext = ', nice to see you';
  }
  
  return `${timeGreeting} ${username}${dayContext}`;
};

const NeuraPlayAssistantLite: React.FC = () => {
  // Coordination with other assistants
  const setFullscreenAssistantOpen = useAssistantCoordination(state => state.setFullscreenAssistantOpen);
  
  // Core state
  const [isOpen, setIsOpen] = useState(false);
  
  // Sync open state with coordination store so AIAssistantSmall knows to hide
  useEffect(() => {
    setFullscreenAssistantOpen(isOpen);
  }, [isOpen]);
  const [showMobileChatHistory, setShowMobileChatHistory] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [savedInputMessage, setSavedInputMessage] = useState(''); // Save input for restore on cancel
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadLimits, setUploadLimits] = useState({ maxFileSize: 10, maxFiles: 3 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Voice state
  const [ttsSettings, setTtsSettings] = useState({ enabled: false, isSpeaking: false });
  const [sttSettings, setSttSettings] = useState<{ isRecording: boolean; language: LanguageCode }>({
    isRecording: false,
    language: 'auto' // ALWAYS start in auto mode for seamless language switching
  });
  const [currentlySpeakingMessageIndex, setCurrentlySpeakingMessageIndex] = useState<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // File upload handlers
  const handleFilesSelected = (files: any[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
    console.log('📁 Files selected:', files.length, 'new files, total:', uploadedFiles.length + files.length);
  };

  const handleFilesRemoved = (fileIds: string[]) => {
    setUploadedFiles(prev => prev.filter(f => !fileIds.includes(f.id)));
    console.log('🗑️ Files removed:', fileIds.length, 'files');
  };

  // Drag and drop handlers
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

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      // Validate file count
      if (uploadedFiles.length + droppedFiles.length > uploadLimits.maxFiles) {
        setError(`Maximum ${uploadLimits.maxFiles} files allowed for your account type.`);
        return;
      }

      // Validate file sizes and process
      const processedFiles: any[] = [];
      for (const file of droppedFiles) {
        if (file.size > uploadLimits.maxFileSize * 1024 * 1024) {
          setError(`File "${file.name}" exceeds ${uploadLimits.maxFileSize}MB limit for your account type.`);
          return;
        }
        
        // 🔧 FIX: Normalize file type for vision system (same as handleFileInputChange)
        let normalizedType: 'image' | 'document' = 'document';
        if (file.type.startsWith('image/')) {
          normalizedType = 'image';
        }
        
        processedFiles.push({
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          name: file.name,
          size: file.size,
          type: normalizedType,  // Use normalized type ('image' or 'document')
          mimeType: file.type    // Keep original MIME type for backend processing
        });
      }
      
      handleFilesSelected(processedFiles);
      setError(null); // Clear any previous errors
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      // Validate file count
      if (uploadedFiles.length + selectedFiles.length > uploadLimits.maxFiles) {
        setError(`Maximum ${uploadLimits.maxFiles} files allowed for your account type.`);
        return;
      }

      // Validate file sizes and process
      const processedFiles: any[] = [];
      for (const file of selectedFiles) {
        if (file.size > uploadLimits.maxFileSize * 1024 * 1024) {
          setError(`File "${file.name}" exceeds ${uploadLimits.maxFileSize}MB limit for your account type.`);
          return;
        }
        
        // Normalize file type for vision system
        let normalizedType: 'image' | 'document' = 'document';
        if (file.type.startsWith('image/')) {
          normalizedType = 'image';
        }
        
        processedFiles.push({
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          name: file.name,
          size: file.size,
          type: normalizedType, // Use normalized type
          mimeType: file.type // Keep original MIME type
        });
      }
      
      handleFilesSelected(processedFiles);
      setError(null); // Clear any previous errors
    }
    // Clear the input so the same file can be selected again
    e.target.value = '';
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };
  

  
  // Responsive layout state
  const responsive = useResponsiveLayout();
  const [isSplitScreen, setIsSplitScreen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(!responsive.isMobile);
  const [currentView, setCurrentView] = useState<'chat' | 'canvas'>('chat'); // For mobile tab switching
  const [showMobileSearch, setShowMobileSearch] = useState(false); // Mobile search/navigation modal
  
  // Unified conversation management - CRITICAL FIX
  const [currentConversation, setCurrentConversation] = useState<Conversation>(() => 
    conversationService.getActiveConversation()
  );
  
  // Fix 2: Canvas state with stable empty array fallback - MUST BE BEFORE MOBILE GESTURES
  const canvasElements = useCanvasStore((state) => 
    state.canvasElementsByConversation[state.currentConversationId] ?? EMPTY_CANVAS_ELEMENTS
  );
  
  // Fix 3: Stable store action reference - extract only the action (which is stable)
  const setCanvasConversation = useCanvasStore((state) => state.setCurrentConversation);
  
  // CRITICAL FIX: Sync canvas store with current conversation ID - FIXED INFINITE LOOP
  React.useEffect(() => {
    const currentStoreId = useCanvasStore.getState().currentConversationId;
  
    // Fix 4: Guard - Only update if it's different to prevent infinite loops
    if (currentStoreId !== currentConversation.id) {
      console.log('🔄 Syncing canvas store with conversation:', currentConversation.id);
      setCanvasConversation(currentConversation.id);
    }
  }, [currentConversation.id, setCanvasConversation]);
  
  // MESSAGE GENERATION SERVICE INTEGRATION - CLEANER AND MORE FOCUSED
  React.useEffect(() => {
    // Register callback for message updates to keep UI in sync
    const handleMessageUpdate = (updatedConversation: Conversation) => {
      setCurrentConversation(updatedConversation);
    };
    
    messageGenerationService.onMessageAdded(handleMessageUpdate);
    
    return () => {
      messageGenerationService.removeMessageCallback(handleMessageUpdate);
    };
  }, []);

  // Session continuity state - MUST be declared before the event listener that uses it
  const [transferredSessionId, setTransferredSessionId] = useState<string | null>(null);

  // CRITICAL FIX: SINGLE session transfer handler from AIAssistantSmall
  // This is the ONLY event listener for openNeuraPlayAssistant - consolidates all session transfer logic
  React.useEffect(() => {
    const handleOpenFromSmall = (event: any) => {
      try {
        console.log(
          '🔗 NeuraPlayAssistantLite: Session transfer from small assistant',
          event.detail
        );
  
        const { sessionId, conversation } = event.detail || {};
  
        if (sessionId) {
          console.log(
            '✅ CRITICAL: Setting transferredSessionId for message continuity:',
            sessionId
          );
  
          // ✅ Guarded setter to prevent infinite loops
          if (transferredSessionId !== sessionId) {
            setTransferredSessionId(sessionId);
          }
  
          // Get or create conversation
          let switchedConversation;
          try {
            switchedConversation =
              conversationService.getOrCreateConversationForSession(sessionId);
            console.log(
              '✅ Using session from small assistant:',
              sessionId,
              'messages:',
              switchedConversation.messages.length
            );
          } catch (switchError) {
            console.warn(
              '⚠️ Session retrieval failed, creating NEW conversation:',
              switchError
            );
            switchedConversation = conversationService.createNewConversation();
  
            // Guarded setter
            if (transferredSessionId !== switchedConversation.id) {
              setTransferredSessionId(switchedConversation.id);
            }
          }
  
          // Update current conversation safely
          if (currentConversation.id !== switchedConversation.id) {
            setCurrentConversation(switchedConversation);
            console.log(
              '✅ Updated currentConversation with',
              switchedConversation.messages.length,
              'messages'
            );
          }
  
          // Sync canvas store safely - use setTimeout to break render cycle
          const currentStoreId = useCanvasStore.getState().currentConversationId;
          if (currentStoreId !== switchedConversation.id) {
            setTimeout(() => {
              setCanvasConversation(switchedConversation.id);
            }, 0);
          }
  
          // Load canvas elements if necessary
          if (
            switchedConversation.canvasElements &&
            switchedConversation.canvasElements.length > 0
          ) {
            const hasMessages =
              switchedConversation.messages &&
              switchedConversation.messages.length > 0;
  
            if (hasMessages) {
              const { canvasElementsByConversation } = useCanvasStore.getState();
              const currentStoreElements =
                canvasElementsByConversation[switchedConversation.id] || [];
  
              if (
                currentStoreElements.length !==
                switchedConversation.canvasElements.length
              ) {
                console.log(
                  '📂 Loading canvas elements from transferred conversation:',
                  switchedConversation.canvasElements.length
                );
  
                // Use setTimeout to batch update and break render cycle
                setTimeout(() => {
                  useCanvasStore.setState((state) => ({
                    canvasElementsByConversation: {
                      ...state.canvasElementsByConversation,
                      [switchedConversation.id]: switchedConversation.canvasElements.map(
                        (el: any) => ({
                          ...el,
                          timestamp: el.timestamp ? new Date(el.timestamp) : new Date(),
                          completedVersions: new Set(el.completedVersions || []),
                        })
                      ),
                    },
                  }));
                  console.log(
                    '✅ Canvas elements restored for transferred session:',
                    switchedConversation.id
                  );
                }, 0);
              }
            } else {
              console.log(
                '🧹 Skipping canvas load - conversation has no messages (freshly cleared)'
              );
            }
          }
  
          // Log conversation continuity
          if (conversation?.messages?.length > 0) {
            console.log(
              '📜 Session has',
              conversation.messages.length,
              'messages to continue'
            );
          }
        }
  
        // Update UI state safely
        setShowSidebar(false);
        setIsSplitScreen(false);
        setIsOpen(true);
  
        console.log(
          '🎉 Session transfer complete - prompt and response will use same session'
        );
      } catch (error) {
        console.error('❌ Session transfer failed:', error);
        // Still open the assistant even if transfer fails
        setIsOpen(true);
      }
    };
  
    window.addEventListener('openNeuraPlayAssistant', handleOpenFromSmall);
    return () =>
      window.removeEventListener('openNeuraPlayAssistant', handleOpenFromSmall);
    // FIXED: Remove currentConversation.id from dependencies to prevent infinite loop
  }, [transferredSessionId]); // Only depend on transferredSessionId
  
  // Mobile gesture support with improved swipe detection
  // Handles sidebar toggle AND view switching for chat/canvas
  useMobileGestures({
    swipeThreshold: 30,  // Lower threshold for better responsiveness
    swipeVelocityThreshold: 0.25,
    preventScrollOnHorizontalSwipe: true,
    edgeSwipeWidth: 40,  // Edge zone for sidebar triggers
  }, (gesture) => {
    // Skip if not on mobile/tablet or if it's a foldable in unfolded mode with split screen
    if (!responsive.isMobile && !responsive.isTablet) return;
    if (responsive.isUnfoldedMode && responsive.canUseSplitScreen) return;
    
    console.log('📱 Gesture received:', gesture.type, gesture.direction);
    
    // Handle edge swipes for sidebar (works on both mobile and tablet)
    if (gesture.type === 'edge-swipe' || gesture.type === 'swipe') {
      // Right swipe from left edge - open sidebar
      if (gesture.direction === 'right' && gesture.startPosition.x < 50 && !showSidebar) {
        console.log('📱 Opening sidebar via swipe');
        setShowSidebar(true);
        return;
      }
      
      // Left swipe when sidebar is open - close it
      if (gesture.direction === 'left' && showSidebar) {
        console.log('📱 Closing sidebar via swipe');
        setShowSidebar(false);
        return;
      }
      
      // View switching when canvas elements exist
      if (canvasElements.length > 0 && !showSidebar) {
        if (gesture.direction === 'left' && currentView === 'chat') {
          console.log('📱 Switching to canvas view');
          setCurrentView('canvas');
        } else if (gesture.direction === 'right' && currentView === 'canvas') {
          console.log('📱 Switching to chat view');
          setCurrentView('chat');
        }
      }
    }
  });
  


  // Dynamic scroll management: Hide scrollbar ONLY in canvas mode (fullscreen)
  useEffect(() => {
    // Canvas mode is when we're open AND have split screen with canvas visible
    const isInCanvasMode = isOpen && isSplitScreen && canvasElements.length > 0;
    
    if (isInCanvasMode) {
      // Hide page scrollbar for canvas mode
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      console.log('📜 Canvas mode: Page scrollbar hidden');
    } else {
      // Restore scrollbar for normal pages
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      console.log('📜 Normal mode: Page scrollbar restored');
    }

    // Cleanup on unmount
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [isOpen, isSplitScreen, canvasElements.length]);
  
  // Auto-activate split-screen when canvas elements exist
  // Now properly handles foldables and all device categories
  React.useEffect(() => {
    if (canvasElements.length > 0) {
      // Desktop, tablets, and UNFOLDED foldables get split screen
      if (responsive.canUseSplitScreen || responsive.isUnfoldedMode) {
        console.log('📱 Enabling split screen for device category:', responsive.deviceCategory);
        setIsSplitScreen(true);
      } else if (responsive.isMobile || responsive.isFolded) {
        // Phones and FOLDED foldables switch to canvas view
        console.log('📱 Mobile/folded mode - switching to canvas view');
        setCurrentView('canvas');
      }
    }
  }, [canvasElements.length, responsive.canUseSplitScreen, responsive.isMobile, responsive.isUnfoldedMode, responsive.isFolded, responsive.deviceCategory]);

  // Listen for typewriting completion to clear activeRequestId and loading state
  React.useEffect(() => {
    const handleTypingComplete = () => {
      setActiveRequestId(null);
      setIsLoading(false); // CRITICAL: Clear loading state when typewriting completes
      console.log('🔄 Typing completed - cleared activeRequestId and loading state');
    };

    window.addEventListener('canvas-typing-complete', handleTypingComplete);
    return () => window.removeEventListener('canvas-typing-complete', handleTypingComplete);
  }, []);

  // CRITICAL FIX: Listen for canvas activation events from ToolCallingHandler
  React.useEffect(() => {
    const handleCanvasActivation = (_event: CustomEvent) => {
      console.log('🎨 Canvas activation event received:', _event.detail);
      
      // Force split screen mode when canvas is activated
      setIsSplitScreen(true);
      
      // On mobile, switch to canvas view
      if (responsive.isMobile) {
        setCurrentView('canvas');
      }
      
      // Add a visual indicator that canvas was activated - USING SERVICE
      messageGenerationService.createCanvasActivationMessage();
    };

    window.addEventListener('activateCanvas', handleCanvasActivation as EventListener);
    return () => window.removeEventListener('activateCanvas', handleCanvasActivation as EventListener);
  }, [responsive.isMobile]);

  // 🎨 Listen for canvas browser open events
  React.useEffect(() => {
    const handleOpenFromBrowser = (event: CustomEvent) => {
      console.log('🎨 Opening canvas from browser:', event.detail);
      
      const { elementId, conversationId, type } = event.detail || {};
      
      if (conversationId && elementId) {
        // Enable split screen to show the canvas
        setIsSplitScreen(true);
        
        // On mobile, switch to canvas view
        if (responsive.isMobile) {
          setCurrentView('canvas');
        }
        
        console.log('✅ Canvas opened from browser:', { elementId, type });
      }
    };
    
    window.addEventListener('openCanvasFromBrowser', handleOpenFromBrowser as EventListener);
    return () => window.removeEventListener('openCanvasFromBrowser', handleOpenFromBrowser as EventListener);
  }, [responsive.isMobile]);
  
  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Contexts
  const { isDarkMode } = useTheme();
  const { user: contextUser, canUseAI, recordAIUsage } = useUser();
  
  // Get user's display name for greeting
  const userName = (contextUser as any)?.name || contextUser?.email?.split('@')[0] || 'User';

  // Handle conversation switching from sidebar - useCallback to prevent recreation
  const handleConversationChange = useCallback((conversation: Conversation) => {
    console.log('🔄 Switching conversation to:', conversation.id, 'Canvas elements:', conversation.canvasElements.length);

    // CRITICAL: Clear loading state immediately when switching to existing chat - messages should appear INSTANTLY from memory
    setIsLoading(false);
    setError(null);

    setCurrentConversation(conversation);

    // CRITICAL FIX: Sync canvas elements from ConversationService to canvas store
    const { setCurrentConversation: setCanvasConv, canvasElementsByConversation } = useCanvasStore.getState();
    
    // Use setTimeout to break render cycle
    setTimeout(() => {
      setCanvasConv(conversation.id);

      // Load canvas elements from conversation if they're not already in the store
      if (conversation.canvasElements && conversation.canvasElements.length > 0) {
        const currentStoreElements = canvasElementsByConversation[conversation.id] || [];

        // Only load if store is empty or out of sync
        if (currentStoreElements.length !== conversation.canvasElements.length) {
          console.log('📂 Loading canvas elements from ConversationService:', conversation.canvasElements.length);

          // Use Zustand's setState to batch update all elements at once
          useCanvasStore.setState((state) => ({
            canvasElementsByConversation: {
              ...state.canvasElementsByConversation,
              [conversation.id]: conversation.canvasElements.map((el: any) => ({
                ...el,
                timestamp: el.timestamp ? new Date(el.timestamp) : new Date(),
                completedVersions: new Set(el.completedVersions || [])
              }))
            }
          }));
          console.log('✅ Canvas elements restored for conversation:', conversation.id);
        }

        // PERSISTENCE FIX: Keep split screen open if canvas elements exist
        if (responsive.canUseSplitScreen || responsive.isUnfoldedMode) {
          setIsSplitScreen(true);
        }
      } else {
        // No canvas elements - only close split screen if explicitly empty
        // DON'T close it if user manually opened it
      }
    }, 0);
  }, [responsive.canUseSplitScreen, responsive.isUnfoldedMode]);

  // Handle quick action buttons (Chart, Code, Document)
  const handleQuickAction = async (action: 'chart' | 'code' | 'document') => {
    // Create a new conversation for the action
    const newConv = conversationService.createNewConversation();
    setCurrentConversation(newConv);
    
    // Import CanvasStateAdapter for direct canvas creation
    const { CanvasStateAdapter } = await import('../services/CanvasStateAdapter');
    
    // Ensure canvas store has the correct conversation context
    const { setCurrentConversation: setCanvasConv } = useCanvasStore.getState();
    
    // Use setTimeout to break render cycle
    setTimeout(() => {
      setCanvasConv(newConv.id);
    }, 0);
    
    // Directly create canvas elements based on action type
    if (action === 'code') {
      // Create an empty code canvas with a starter template
      const elementId = CanvasStateAdapter.addCode({
        code: `// Welcome to the Code Editor!\n// Start typing your code here...\n\nfunction main() {\n  console.log("Hello, World!");\n}\n\nmain();`,
        language: 'javascript',
        title: 'Code Editor',
        description: 'Interactive code editor with syntax highlighting',
        position: { x: 100, y: 100 },
        size: { width: 800, height: 600 }
      });
      
      // Skip typewriter - set version state to 'displayed' for immediate editing
      const { updateCanvasElement, getCurrentCanvasElements } = useCanvasStore.getState();
      const elements = getCurrentCanvasElements();
      const element = elements.find(el => el.id === elementId);
      if (element && element.versions) {
        const updatedVersions = element.versions.map((v: any) => ({
          ...v,
          state: 'displayed' as const
        }));
        updateCanvasElement(elementId, { versions: updatedVersions });
      }
      
      // Add a helpful AI message
      conversationService.addMessage({
        text: "💻 **Code Editor Ready!**\n\nI've opened the code editor for you. You can:\n- Start typing or paste your code in the right panel\n- Change the programming language using the dropdown\n- Ask me to help you write, debug, or explain code\n\n**What would you like to code today?**",
        isUser: false,
        timestamp: new Date()
      });
      
      // Enable split screen
      setIsSplitScreen(true);
      
    } else if (action === 'chart') {
      // Create a sample chart canvas
      CanvasStateAdapter.addChart({
        title: 'Data Visualization',
        chartType: 'bar',
        series: [
          { x: 'Category A', y: 25 },
          { x: 'Category B', y: 40 },
          { x: 'Category C', y: 30 },
          { x: 'Category D', y: 55 }
        ],
        config: {},
        position: { x: 100, y: 100 },
        size: { width: 700, height: 500 }
      });
      
      // Add a helpful AI message
      conversationService.addMessage({
        text: "📊 **Chart Canvas Ready!**\n\nI've created a sample chart for you. You can:\n- Provide your own data to visualize\n- Change chart types (bar, line, pie, etc.)\n- Ask me to analyze data trends\n\n**What data would you like to visualize?**",
        isUser: false,
        timestamp: new Date()
      });
      
      // Enable split screen
      setIsSplitScreen(true);
      
    } else if (action === 'document') {
      // Create a document canvas
      const elementId = CanvasStateAdapter.addDocument({
        title: 'New Document',
        content: '# Welcome to the Document Canvas\n\nStart writing your content here. I can help you:\n\n- Draft documents and essays\n- Edit and improve existing text\n- Format content professionally\n- Summarize or expand on ideas\n\n---\n\n*Begin typing or ask me for assistance...*',
        metadata: {
          type: 'document',
          wordCount: 0,
          readingTime: 0,
          sections: []
        },
        exportFormats: ['pdf', 'docx', 'txt', 'html'],
        position: { x: 100, y: 100 },
        size: { width: 800, height: 600 }
      });
      
      // Skip typewriter - set version state to 'displayed' for immediate editing
      const { updateCanvasElement: updateDocElement, getCurrentCanvasElements: getDocElements } = useCanvasStore.getState();
      const docElements = getDocElements();
      const docElement = docElements.find(el => el.id === elementId);
      if (docElement && docElement.versions) {
        const updatedVersions = docElement.versions.map((v: any) => ({
          ...v,
          state: 'displayed' as const
        }));
        updateDocElement(elementId, { versions: updatedVersions });
      }
      
      // Add a helpful AI message
      conversationService.addMessage({
        text: "📝 **Document Canvas Ready!**\n\nI've opened the document editor for you. You can:\n- Write directly in the canvas on the right\n- Ask me to help draft, edit, or format content\n- Export to PDF, Word, or other formats\n\n**What would you like to write about?**",
        isUser: false,
        timestamp: new Date()
      });
      
      // Enable split screen
      setIsSplitScreen(true);
    }
    
    // Refresh conversation to show the new message
    setTimeout(() => {
      setCurrentConversation(conversationService.getConversation(newConv.id) || newConv);
    }, 0);
  };

  // Initialize user for database sync and fetch upload limits
  useEffect(() => {
    if (contextUser?.id) {
      conversationService.setCurrentUser(contextUser.id);
      fetchUploadLimits();
    }
  }, [contextUser?.id]);

  // CRITICAL FIX: Ensure conversation persistence on app startup
  useEffect(() => {
    // Force refresh conversation state to make sure we have the latest data
    const refreshedConversation = conversationService.getActiveConversation();
    if (refreshedConversation.id !== currentConversation.id) {
      console.log('🔄 NeuraPlayAssistantLite: Refreshing conversation state on startup');
      setCurrentConversation(refreshedConversation);
      // Canvas sync happens automatically via useEffect watching currentConversation.id
    }
  }, []); // Run once on mount

  // Greeting now handled by ChatHandler.ts when user sends first message

  // Fetch dynamic upload limits based on user role
  const fetchUploadLimits = async () => {
    try {
      const user = contextUser ? {
        role: contextUser.role || 'learner',
        subscription: contextUser.subscription || { tier: 'free' }
      } : null;
      
      const response = await fetch(`/api/vision/limits?user=${encodeURIComponent(JSON.stringify(user))}`);
      const data = await response.json();
      
      if (data.success) {
        setUploadLimits({
          maxFileSize: data.limits.maxFileSize,
          maxFiles: data.limits.maxFiles
        });
        console.log(`📋 Upload limits for ${data.limits.role} (${data.limits.tier}):`, 
          `${data.limits.maxFileSize}MB, ${data.limits.maxFiles} files`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to fetch upload limits, using defaults:', error);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation.messages]);

  // Handle responsive layout changes - FIXED INFINITE LOOP
  useEffect(() => {
    // Auto-hide sidebar on mobile
    if (responsive.isMobile) {
      setShowSidebar(false);
      setIsSplitScreen(false); // Force single pane on mobile
    } else if (!responsive.isMobile && !showSidebar) {
      // Only set to true if we're not on mobile and sidebar is currently hidden
      setShowSidebar(true);
    }
    
    // Disable split screen if viewport can't support it
    if (!responsive.canUseSplitScreen && isSplitScreen) {
      setIsSplitScreen(false);
    }
  }, [responsive.isMobile, responsive.canUseSplitScreen]); // Removed showSidebar and isSplitScreen from dependencies

  // Handle orientation changes on mobile
  useEffect(() => {
    if (responsive.isMobile && responsive.orientation === 'landscape' && canvasElements.length > 0) {
      // In landscape mode, we could enable split screen on larger mobile devices
      if (responsive.width >= 600) {
        setIsSplitScreen(true);
      }
    }
  }, [responsive.orientation, responsive.isMobile, responsive.width, canvasElements.length]);

  // NOTE: Session continuity state (transferredSessionId) is declared above near the single event listener
  // DO NOT add duplicate event listeners here - all session transfer logic is consolidated above

  // NOTE: Canvas cards now directly call CoreTools instead of going through chat
  // The send-chat-message event listener has been removed in favor of direct backend calls

  // Voice functions - STT (Speech-to-Text) and TTS (Text-to-Speech)
  const toggleRecording = async () => {
    if (sttSettings.isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        setSttSettings(prev => ({ ...prev, isRecording: false }));
      }
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await processVoiceInput(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setSttSettings(prev => ({ ...prev, isRecording: true }));
      } catch (error) {
        console.error('Microphone access error:', error);
        setError('Could not access microphone');
      }
    }
  };

  const processVoiceInput = async (audioBlob: Blob) => {
    try {
      setIsLoading(true);
      
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Process in chunks to avoid "Maximum call stack size exceeded"
      const chunkSize = 8192;
      let binaryString = '';
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        binaryString += String.fromCharCode(...chunk);
      }
      const base64Audio = btoa(binaryString);
      
      // Extended timeout for longer voice recordings (up to 3 minutes of audio)
      const response = await fetch('/api/assemblyai-transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          audio: base64Audio,
          audioType: 'webm',
          language_code: sttSettings.language === 'auto' ? 'auto' : sttSettings.language,
          speech_model: 'universal'
        }),
        signal: AbortSignal.timeout(150000) // 2.5 minute timeout for long recordings
      });
      
      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`);
      }
      
      const result = await response.json();
      const transcribedText = result.text || '';
      const detectedLanguage = result.language_code;
      
      // ENHANCED: Detailed language detection logging
      console.log('🎙️ Transcription result - FULL:', { 
        text: transcribedText, 
        detectedLanguage,
        detectedLanguageType: typeof detectedLanguage,
        originalLanguageSetting: sttSettings.language,
        isAutoMode: sttSettings.language === 'auto',
        rawResult: result
      });
      
      if (transcribedText.trim()) {
        setInputMessage(transcribedText);
        
        // CRITICAL FIX: Use detected language temporarily without changing setting
        let languageToUse: LanguageCode = sttSettings.language;
        
        // If in auto mode, use detected language for THIS response only
        if (detectedLanguage && sttSettings.language === 'auto') {
          // Normalize language code (e.g., 'sv-SE' -> 'sv')
          const normalizedLanguage = detectedLanguage.toLowerCase().split('-')[0] as LanguageCode;
          console.log('🌍 Auto-detected language:', {
            raw: detectedLanguage,
            normalized: normalizedLanguage,
            willPassToHandleSendMessage: normalizedLanguage
          });
          languageToUse = normalizedLanguage;
        }
        
        // Auto-send with detected language (pass transcribed text directly and mark as voice input)
        console.log('📤 Calling handleSendMessage with language:', languageToUse);
        await handleSendMessage(languageToUse, transcribedText, true);
      } else {
        setError('No speech detected. Please try again.');
      }
    } catch (error) {
      console.error('Voice processing error:', error);
      setError('Voice transcription failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const speakText = async (text: string, overrideLanguage?: LanguageCode, messageIndex?: number) => {
    try {
      setTtsSettings(prev => ({ ...prev, isSpeaking: true }));
      if (messageIndex !== undefined) {
        setCurrentlySpeakingMessageIndex(messageIndex);
      }
      
      let cleanText = text
        .replace(/[*#]/g, '')
        .replace(/\[.*?\]/g, '')
        .replace(/🔍|📊|💡|🤔|🎨|✅|❌|🎯|🚫/g, '')
        .replace(/\bhttps?:\/\/[^\s]+/g, '')
        .trim();
      
      if (!cleanText || cleanText.length < 3) {
        setTtsSettings(prev => ({ ...prev, isSpeaking: false }));
        return;
      }
      
      // 🎯 LIMIT TTS to save credits (~1 credit per char, 500 = ~30 sec speech)
      const maxTTSChars = 500;
      if (cleanText.length > maxTTSChars) {
        cleanText = cleanText.substring(0, maxTTSChars) + '...';
        console.log('🔊 TTS - Truncated to save credits:', maxTTSChars, 'chars');
      }
      
      // Get optimal TTS configuration for the language (supports 29+ languages via multilingual model)
      const languageToUse = overrideLanguage || sttSettings.language;
      const ttsConfig = getTTSConfig(languageToUse);
      
      // ENHANCED: Detailed logging to debug auto-mode voice switching
      console.log('🔊 TTS - Voice selection DEBUG:', { 
        overrideLanguage,
        sttSettingsLanguage: sttSettings.language,
        finalLanguageToUse: languageToUse,
        voiceId: ttsConfig.voiceId,
        modelId: ttsConfig.modelId,
        isMultilingual: ttsConfig.isMultilingual,
        isAutoMode: sttSettings.language === 'auto',
        hasOverride: !!overrideLanguage
      });

      // EXACT same request as AIAssistantSmall which IMMUTABLY works
      const response = await fetch('/api/elevenlabs-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          voiceId: ttsConfig.voiceId,
          modelId: ttsConfig.modelId, // Uses multilingual model for non-English
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        throw new Error(`TTS API failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        setTtsSettings(prev => ({ ...prev, isSpeaking: false }));
        setCurrentlySpeakingMessageIndex(null);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };
      
      audio.onerror = () => {
        setTtsSettings(prev => ({ ...prev, isSpeaking: false }));
        setCurrentlySpeakingMessageIndex(null);
      };
      
      await audio.play();
    } catch (error) {
      console.error('TTS error:', error);
      setTtsSettings(prev => ({ ...prev, isSpeaking: false }));
      setCurrentlySpeakingMessageIndex(null);
    }
  };

  const stopTTS = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      setTtsSettings(prev => ({ ...prev, isSpeaking: false }));
      setCurrentlySpeakingMessageIndex(null);
    }
  };

  // Debounce to prevent duplicate submissions
  const lastSubmissionRef = useRef<number>(0);
  
  // Handle sending messages
  const handleSendMessage = async (detectedLanguage?: LanguageCode, messageOverride?: string, isVoiceInput = false) => {
    const messageToSend = messageOverride || inputMessage;
    console.log('🔥 HANDLESENDEMESSAGE CALLED in NeuraPlayAssistantLite:', messageToSend.trim());
    
    // Allow sending if there's either a message OR uploaded files
    if ((!messageToSend.trim() && uploadedFiles.length === 0) || isLoading) {
      console.log('🚫 Early return: no message or already loading');
      return;
    }

    // CRITICAL FIX: Debounce duplicate submissions within 1 second
    const now = Date.now();
    if (now - lastSubmissionRef.current < 1000) {
      console.log('🚫 DEBOUNCE: Preventing duplicate message submission');
      return;
    }
    lastSubmissionRef.current = now;
    console.log('✅ PROCEEDING with message submission');

    // SAFETY NET: Force clear loading state after 3 minutes to support longer voice recordings
    const loadingTimeout = setTimeout(() => {
      console.warn('⚠️ Loading timeout reached (180s), forcing state reset');
      setIsLoading(false);
      setActiveRequestId(null);
      setError('Request took too long. Please try again or use shorter voice recordings.');
    }, 180000);

    const aiUsage = canUseAI();
    if (!aiUsage.allowed) {
      // Calculate used count from limit and remaining
      const usageData = {
        used: aiUsage.limit - aiUsage.remaining,
        limit: aiUsage.limit
      };
      
      messageGenerationService.createUsageLimitMessage(usageData, contextUser?.isVerified || false);
      clearTimeout(loadingTimeout);
      return;
    }

    // Save input message for restore on cancel
    setSavedInputMessage(messageToSend);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    const userMessageText = messageToSend.trim() || 
      (uploadedFiles.length > 0 ? `📎 Shared ${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''}: ${uploadedFiles.map(f => f.name).join(', ')}` : '');
    
    // IMMEDIATE FIX: Show user message in UI immediately, let AIRouter handle backend persistence
    console.log('📝 IMMEDIATE: Adding user message to UI before AIRouter processing');
    if (uploadedFiles.length > 0) {
      messageGenerationService.createFileUploadMessage(uploadedFiles);
    } else {
      const userMessage = messageGenerationService.createUserMessage(userMessageText);
      // Mark as voice input if applicable
      if (isVoiceInput && userMessage) {
        (userMessage as any).isVoiceInput = true;
      }
    }
    
    console.log('📝 USER MESSAGE BACKEND PERSISTENCE WILL BE HANDLED BY AIROUTER:', userMessageText);

    let response: any; // Declare response outside try block to access in finally
    
    try {
      // Test commands for canvas - STUB with rich content for typewriter demo
      if (messageToSend.toLowerCase().includes('test document')) {
        const { CanvasStateAdapter } = await import('../services/CanvasStateAdapter');
        
        // Rich stub content that demonstrates typewriter effect
        const stubDocumentContent = `# Welcome to NeuraPlay Canvas

This is a **demonstration document** created to showcase the canvas functionality and typewriter effect.

## Features Demonstrated

### 1. Document Rendering
The canvas system renders markdown content beautifully with proper formatting:
- **Bold text** and *italic text*
- Bullet points and numbered lists
- Headers at multiple levels

### 2. Typewriter Effect
Watch as this content appears character by character, simulating real-time AI document generation. This creates an engaging user experience.

### 3. Split-Screen Layout
The interface splits to show:
- Chat conversation on the left
- Document canvas on the right

### 4. Version History
Click the **History** button to see version tracking:
- Each edit creates a new version
- You can export individual versions as PDF
- Full revision history is preserved

## Code Example

\`\`\`javascript
// Example code block
const greeting = "Hello, NeuraPlay!";
console.log(greeting);
\`\`\`

## Table Example

| Feature | Status | Notes |
|---------|--------|-------|
| Typewriter | ✅ Working | Smooth animation |
| Markdown | ✅ Working | Full support |
| Export PDF | ✅ Working | High quality |

---

**Congratulations!** If you can see this document with proper formatting and the typewriter animation, the canvas system is working correctly.

> "The best way to predict the future is to create it." - Peter Drucker
`;

        setTimeout(() => {
          CanvasStateAdapter.addDocument({
            title: 'Welcome to NeuraPlay Canvas',
            content: stubDocumentContent,
            metadata: { wordCount: 200, readingTime: 2, sections: ['Features', 'Code Example', 'Table'], type: 'demo', style: 'technical' },
            position: { x: 100, y: 100 },
            size: { width: 800, height: 600 }
          });
          setIsSplitScreen(true);
          // Switch to canvas view on mobile
          if (responsive.isMobile) {
            setCurrentView('canvas');
          }
        }, 0);
        
        messageGenerationService.createTestDocumentMessage();
        clearTimeout(loadingTimeout);
        setIsLoading(false);
        return;
      }

      if (messageToSend.toLowerCase().includes('test chart')) {
        const { CanvasStateAdapter } = await import('../services/CanvasStateAdapter');
        setTimeout(() => {
          CanvasStateAdapter.addChart({
            title: 'Sample Chart',
            chartType: 'bar',
            series: [{
              name: 'Sample Data',
              data: [10, 20, 30, 40, 50],
              type: 'bar'
            }],
            position: { x: 100, y: 100 },
            size: { width: 500, height: 400 }
          });
          setIsSplitScreen(true);
          // Switch to canvas view on mobile
          if (responsive.isMobile) {
            setCurrentView('canvas');
          }
        }, 0);
        
        messageGenerationService.createTestChartMessage();
        clearTimeout(loadingTimeout);
        setIsLoading(false);
        return;
      }

      recordAIUsage();
      
      // Generate request ID for cancellation tracking
      const requestId = `lite-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setActiveRequestId(requestId);
      
      // Build conversation history for context awareness from unified service
      // FIXED: Increase context window for better continuity (was 10, now 30 messages)
      const recentMessages = conversationService.getConversationHistory(30);
      
      // Prepare multimodal attachments
      let attachments: any = undefined;
      if (uploadedFiles.length > 0) {
        const images = uploadedFiles.filter(f => f.type === 'image');
        const documents = uploadedFiles.filter(f => f.type === 'document');
        
        attachments = {
          images: images.length > 0 ? images : undefined,
          documents: documents.length > 0 ? documents : undefined,
          metadata: {
            totalFiles: uploadedFiles.length,
            totalSize: uploadedFiles.reduce((sum, f) => sum + f.size, 0),
            types: [...new Set(uploadedFiles.map(f => f.type))]
          }
        };
        
        console.log('👁️ NeuraPlayAssistantLite: Sending multimodal request', attachments);
      }
      
      // Context with conversation history for continuity
      // CRITICAL FIX: Use currentConversation.id as the SOURCE OF TRUTH
      // transferredSessionId should ONLY be used if it matches currentConversation.id (for first message after transfer)
      let sessionId = currentConversation.id;
      
      // Only use transferredSessionId if it matches current conversation (first message after transfer)
      if (transferredSessionId && transferredSessionId === currentConversation.id) {
        console.log('🔗 NeuraPlayAssistantLite: First message after transfer, using transferred session:', transferredSessionId);
        sessionId = transferredSessionId;
        // Clear it after first use so subsequent messages use currentConversation.id directly
        setTransferredSessionId(null);
      } else if (transferredSessionId && transferredSessionId !== currentConversation.id) {
        // Stale transferredSessionId - user has switched conversations, clear it
        console.log('🧹 Clearing stale transferredSessionId:', transferredSessionId, '-> now using:', currentConversation.id);
        setTransferredSessionId(null);
      }
      
      // SYNC CHECK: Ensure conversationService is aligned with UI state
      if (conversationService.getSessionId() !== sessionId) {
        console.warn('⚠️ Session mismatch detected! Syncing conversationService to UI state');
        console.log('  conversationService.getSessionId():', conversationService.getSessionId());
        console.log('  currentConversation.id (source of truth):', sessionId);
        conversationService.switchToConversation(sessionId);
      }
      
      // Also sync canvas store to ensure canvas elements appear in correct conversation
      const canvasCurrentId = useCanvasStore.getState().currentConversationId;
      if (canvasCurrentId !== sessionId) {
        console.warn('⚠️ Canvas store mismatch detected! Syncing canvas to UI state');
        useCanvasStore.getState().setCurrentConversation(sessionId);
      }
      
      // DEBUG: Log session being used
      console.log('🔗 NeuraPlayAssistantLite: Using session:', sessionId);
      
      const context = {
        currentPage: window.location.pathname,
        user: contextUser ? { 
          id: contextUser.id, 
          name: contextUser.username
        } : { id: 'anonymous', name: 'User' },
        session: {
          id: sessionId, // FIXED: Use transferred session ID for continuity
          startTime: new Date(),
          conversationHistory: recentMessages // ADDED: Conversation context
        }
      };
      
      console.log('🔍 NeuraPlayAssistantLite - Sending request to AIRouter');
      
      // CRITICAL FIX: Add timeout protection to prevent UI freezing
      const SERVICE_TIMEOUT = 8000; // 8 seconds max wait for services
      let aiRouter;
      
      try {
        // Race between service readiness and timeout
        await Promise.race([
          serviceContainer.waitForReady(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Service initialization timeout')), SERVICE_TIMEOUT)
          )
        ]);
        
        aiRouter = await serviceContainer.getAsync('aiRouter') as any;
        
        // DEBUG: Check if unifiedSessionManager is working properly
        const unifiedSessionManager = await serviceContainer.getAsync('unifiedSessionManager') as any;
        console.log('🔍 UNIFIED SESSION MANAGER CHECK:', {
          exists: !!unifiedSessionManager,
          hasAddMessage: typeof unifiedSessionManager?.addMessage === 'function',
          isStub: unifiedSessionManager?.addMessage?.toString().includes('{}') || unifiedSessionManager?.addMessage?.toString().length < 20
        });
        
        if (!aiRouter) {
          throw new Error('AI Router not available');
        }
      } catch (serviceError) {
        console.warn('⚠️ Services not ready, using fallback mode:', serviceError);
        
        // FALLBACK: Show informative error and clear loading state
        messageGenerationService.createInitializationMessage();
        
        setIsLoading(false);
        setActiveRequestId(null);
        return;
      }
      
      // CRITICAL FIX: Ensure conversation history is in the context object where AIService expects it
      const contextWithHistory = {
        ...context,
        conversationHistory: recentMessages // AIService.ts looks for this in context
      };

      console.log('🚀 CALLING aiRouter.processRequest with message:', userMessageText);
      
      // 🎯 SPATIAL CONTEXT: Determine if user is viewing canvas
      // 🐛 FIX: Use isSplitScreen state (reliable) instead of DOM query (fragile)
      const currentCanvasElements = useCanvasStore.getState().getCurrentCanvasElements();
      const canvasIsActuallyVisible = isSplitScreen && canvasElements.length > 0;
      const activeCanvasType = currentCanvasElements.length > 0 
        ? currentCanvasElements[currentCanvasElements.length - 1]?.type 
        : null;
      
      console.log('📍 Canvas visibility check:', {
        isSplitScreen,
        canvasElementsCount: canvasElements.length,
        storeElementsCount: currentCanvasElements.length,
        canvasIsActuallyVisible,
        activeCanvasType
      });
      
      response = await aiRouter.processRequest({
        message: userMessageText,
        sessionId: context.session.id,
        userId: context.user.id,
        mode: attachments ? 'vision' : 'chat', // Use vision mode if files uploaded
        requestId: requestId, // Add request ID for cancellation
        conversationHistory: recentMessages, // CRITICAL: Pass conversation history
        // 🎯 LOCATION CONTEXT: Critical for modification vs creation routing
        locationContext: {
          currentPage: window.location.pathname,
          isCanvasVisible: canvasIsActuallyVisible, // 🐛 FIX: Use state-based check
          isCanvasFullscreen: document.fullscreenElement !== null,
          activeCanvasType: activeCanvasType,
          assistantType: 'fullscreen' as const // Explicitly mark as fullscreen assistant
        },
        constraints: {
          maxTokens: 800,
          temperature: 0.7,
          timeoutMs: 30000
        },
        context: contextWithHistory, // Use context with history
        attachments: attachments, // Add multimodal attachments
        visionContext: attachments ? {
          hasVisualContent: true,
          requiresVisionAnalysis: true,
          cacheKey: `vision_${context.session.id}_${Date.now()}`
        } : undefined
      });
      
      console.log('✅ aiRouter.processRequest completed, response:', response.success);

      // Allow empty response strings if there are toolResults (tool results renderer will handle display)
      const hasToolResults = response?.toolResults && response.toolResults.length > 0;
      if (response.response === undefined && !hasToolResults) {
        throw new Error('AI Router failed: No response');
      }

      // Clear uploaded files after successful processing
      if (attachments) {
        setUploadedFiles([]);
      }
      
      // FIXED ARCHITECTURE: User message already in UI, only add AI response
      console.log('🤖 ADDING AI RESPONSE TO UI:', response.response?.substring(0, 50) + '...');
      messageGenerationService.createAIResponse(response.response, response.toolResults || []);
      
      // Clear saved input on successful completion (user won't need to restore it)
      setSavedInputMessage('');

      // Auto-speak response if TTS is enabled
      if (ttsSettings.enabled && !ttsSettings.isSpeaking && response.response) {
        const firstSentence = response.response.split(/[.!?]/)[0].trim();
        if (firstSentence && firstSentence.length > 10) {
          // CRITICAL: Log and ensure detected language is passed for auto-mode TTS
          console.log('🔊 AUTO-SPEAK - Language info:', {
            detectedLanguage,
            sttSettingsLanguage: sttSettings.language,
            willUse: detectedLanguage || sttSettings.language
          });
          await speakText(firstSentence, detectedLanguage);
        }
      }

    } catch (error) {
      console.error('❌ Lite AI Assistant error:', error);
      
      // Check if request was cancelled
      if (error && typeof error === 'object' && 'cancelled' in error) {
        messageGenerationService.createCancellationMessage();
      } else {
        messageGenerationService.createErrorMessage('Sorry, I encountered an error. Please try again.');
        // Log technical error details to console only, not to user
        console.error('Technical error details:', error instanceof Error ? error.message : 'Unknown error');
        setError('Please try again or refresh the page');
      }
    } finally {
      // Clear the safety timeout
      clearTimeout(loadingTimeout);
      
      // IMPROVED: More robust loading state management
      try {
        // Only keep loading state if we have successful canvas elements AND response exists
        const hasCanvasElements = response?.success && response?.toolResults?.some((result: any) => 
          result.toolName?.includes('canvas-') && result.success
        );
        
        if (!hasCanvasElements) {
          // Clear loading state immediately if no canvas elements or if there was an error
          setIsLoading(false);
          setActiveRequestId(null);
        }
        // If canvas elements exist, the typewriting completion listener will clear these states
      } catch (cleanupError) {
        // Emergency cleanup in case of any errors in the finally block
        console.warn('⚠️ Cleanup error, forcing state reset:', cleanupError);
        setIsLoading(false);
        setActiveRequestId(null);
      }
    }
  };

  // Cancel active request - COMPLETELY stops everything
  const cancelActiveRequest = async () => {
    console.log('🛑 CANCEL REQUESTED - Stopping all operations');
    
    try {
      // 1. Cancel the LLM request if active
      if (activeRequestId) {
        const { unifiedAPIRouter } = await import('../services/UnifiedAPIRouter');
        unifiedAPIRouter.cancelRequest(activeRequestId);
        console.log(`🛑 Cancelled LLM request: ${activeRequestId}`);
      }
      
      // 2. DESTROY ALL TYPEWRITERS - Nuclear option to freeze everything
      const { universalTypewriterService } = await import('../services/UniversalTypewriterService');
      universalTypewriterService.destroyAll();
      console.log('🛑 Destroyed all typewriter instances');
      
      // 3. Dispatch cancel event to all canvas components
      window.dispatchEvent(new CustomEvent('canvas-cancel-typing'));
      window.dispatchEvent(new CustomEvent('canvas-skip-typing'));
      
      // 4. Dispatch typing complete to clear any waiting states
      window.dispatchEvent(new CustomEvent('canvas-typing-complete'));
      
      // 5. Restore user's input message
      if (savedInputMessage) {
        setInputMessage(savedInputMessage);
        setSavedInputMessage('');
        console.log('🔄 Restored user input:', savedInputMessage.substring(0, 50) + '...');
      }
      
      // 6. Force clear ALL loading states
      setIsLoading(false);
      setActiveRequestId(null);
      
      // 7. Add cancellation message to chat
      messageGenerationService.createCancellationMessage();
      
      console.log('✅ Cancel complete - all operations stopped');
    } catch (error) {
      console.error('❌ Cancel error (forcing cleanup):', error);
      // Force cleanup even on error
      setIsLoading(false);
      setActiveRequestId(null);
      if (savedInputMessage) {
        setInputMessage(savedInputMessage);
        setSavedInputMessage('');
      }
    }
  };



  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`fixed inset-0 z-50 ${responsive.isMobile ? 'bg-white' : 'bg-black/50 backdrop-blur-sm'}`}
    >
      {/* Hidden file input */}
              <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.txt,.doc,.docx,.md"
          onChange={handleFileInputChange}
          className="hidden"
        />
      {/* ADAPTIVE LAYOUT: Mobile, folded foldables, and compact devices use mobile layout */}
      {(responsive.isMobile || responsive.isFolded || responsive.deviceCategory === 'compact-phone') ? (
        /* MOBILE/FOLDED LAYOUT */
        <div className={`w-full h-full flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
          {/* Mobile Header */}
          <div className={`flex items-center justify-between px-4 py-3 ${isDarkMode ? 'bg-gray-900' : 'border-b border-gray-200 bg-white shadow-sm'}`}>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowMobileSearch(true)}
                className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-100 text-black'}`}
                title="Search & Navigate"
              >
                <Search size={20} />
              </button>
              <h1 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                NeuraPlay
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              {canvasElements.length > 0 && (
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setCurrentView('chat')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      currentView === 'chat'
                        ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    Chat
                  </button>
                  <button
                    onClick={() => setCurrentView('canvas')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      currentView === 'canvas'
                        ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    Canvas ({canvasElements.length})
                  </button>
                </div>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Mobile Sidebar Overlay */}
          <AnimatePresence>
            {showSidebar && (
              <motion.div
                initial={{ x: -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute top-0 left-0 w-80 h-full bg-white dark:bg-gray-900 z-10 shadow-xl"
              >
                <div className="h-full">
                  <ConversationSidebar 
                    onConversationChange={handleConversationChange} 
                    onQuickAction={handleQuickAction}
                  />
                </div>
                {/* Backdrop */}
                <div
                  className="absolute inset-0 -z-10 bg-black/30"
                  onClick={() => setShowSidebar(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Swipe Indicator - shows when canvas elements exist */}
          {canvasElements.length > 0 && (
            <div className="flex justify-center py-1 bg-gradient-to-b from-transparent via-purple-500/10 to-transparent">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs text-gray-500 dark:text-gray-400">
                <span className="animate-pulse">←</span>
                <span>Swipe to switch views</span>
                <span className="animate-pulse">→</span>
              </div>
            </div>
          )}

          {/* Mobile Content */}
          <div className="flex-1 overflow-hidden">
            <AnimatePresence>
              {currentView === 'chat' ? (
                <div key="chat" className="h-full flex flex-col">
                  {/* Mobile Messages */}
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {currentConversation.messages.length === 0 ? (
              <div className={`text-center space-y-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <div className="flex justify-center">
                  <img 
                    src="/assets/images/Mascot.png" 
                    alt="NeuraPlay Mascot" 
                    className="w-16 h-16 object-contain"
                  />
                </div>
                <p className="text-lg font-medium">{getTimeBasedGreeting(userName)}</p>
                <p>I'm your AI assistant with canvas capabilities.</p>
                <div className="flex justify-center space-x-2 text-xs">
                  <span className="px-2 py-1 bg-purple-500/20 rounded">Document Reader</span>
                  <span className="px-2 py-1 bg-blue-500/20 rounded">Chart Creator</span>
                  <span className="px-2 py-1 bg-green-500/20 rounded">Code Editor</span>
                </div>
              </div>
            ) : (
              currentConversation.messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`flex w-full ${message.isUser ? 'justify-end' : 'justify-start'} mb-4`}
                >
                  <div className={`${
                    message.isUser 
                      ? 'max-w-[85%] sm:max-w-[80%] md:max-w-[75%] ml-auto'  // FIXED: Better user message alignment
                      : 'max-w-[92%] sm:max-w-[90%] md:max-w-[85%] mr-auto'
                  } p-3 rounded-xl ${
                    message.isUser 
                      ? 'bg-purple-600 text-white rounded-br-sm' 
                      : isDarkMode 
                        ? 'bg-gray-800 text-gray-100 rounded-bl-sm' 
                        : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                  }`}>
                    {message.isUser ? (
                      <div className="relative">
                        <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">
                          {message.text}
                        </p>
                        {/* STT indicator for voice input messages */}
                        {(message as any).isVoiceInput && (
                          <div className={`absolute -top-2 -right-2 p-1 rounded-full ${
                            isDarkMode ? 'bg-purple-600' : 'bg-purple-500'
                          }`} title="Voice input">
                            <Mic size={10} className="text-white" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 relative">
                        {/* TTS speaking indicator */}
                        {currentlySpeakingMessageIndex === index && (
                          <div className={`absolute -top-2 -right-2 p-1.5 rounded-full animate-pulse ${
                            isDarkMode ? 'bg-blue-600' : 'bg-blue-500'
                          }`} title="Currently speaking">
                            <Volume2 size={12} className="text-white" />
                          </div>
                        )}
                        <div className="text-sm break-words whitespace-pre-wrap leading-relaxed">
                          <NeuraPlayDocumentFormatter 
                            content={message.text}
                            isTyping={false}
                            typewriterSpeed={8}
                            enableAdvancedFormatting={true}
                            className="text-sm"
                          />
                        </div>
                        
                        {/* FIXED: Break out of parent padding to prevent black frame effect */}
                        {message.toolResults && message.toolResults.length > 0 && (
                          <div className="-mx-3 -mb-3 mt-2">
                            <AdvancedToolResultsRenderer 
                              toolResults={message.toolResults}
                              context={(responsive.isMobile ? "small-chat" : "big-chat") as any}
                              isDarkMode={isDarkMode}
                              onCanvasActivation={(data) => {
                                console.log('🎨 Canvas activation from mobile view:', data);
                                setIsSplitScreen(true);
                                if (responsive.isMobile) {
                                  setCurrentView('canvas');
                                }
                              }}
                              chatContext={{
                                assistantType: 'lite',
                                sessionId: currentConversation.id,
                                onNewSearch: (query: string) => {
                                  console.log('🔍 Related question search triggered in NeuraPlayAssistantLite:', query);
                                  setInputMessage(query);
                                  setTimeout(() => handleSendMessage(), 100);
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className={`px-4 py-3 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
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

                  {/* Mobile Input - Only show if NOT in desktop/split mode */}
                  {!responsive.isDesktop && (
                  <div className={`px-4 py-3 ${isDarkMode ? '' : 'border-t border-gray-200'} bg-white dark:bg-gray-900`}>
                    {/* File preview area */}
                    {uploadedFiles.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {uploadedFiles.map((file) => (
                          <div 
                            key={file.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                              isDarkMode 
                                ? 'bg-gray-800 border-gray-600 text-gray-300' 
                                : 'bg-gray-100 border-gray-300 text-gray-700'
                            }`}
                          >
                            <Paperclip size={14} />
                            <span className="text-sm truncate max-w-[120px]">{file.name}</span>
                            <button
                              onClick={() => handleFilesRemoved([file.id])}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex space-x-3">
                      <div 
                        className={`flex-1 relative ${
                          isDragActive ? 'ring-2 ring-purple-500 ring-opacity-50' : ''
                        }`}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                      >
                        <input
                          ref={inputRef}
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Ask me anything..."
                          className={`w-full px-4 py-3 pr-12 rounded-2xl text-base ${
                            isDarkMode 
                              ? 'bg-gray-800 text-white placeholder-gray-400 border-gray-700' 
                              : 'bg-gray-100 text-gray-900 placeholder-gray-500 border-gray-300'
                          } border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                            isDragActive ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                          }`}
                          style={{ minHeight: responsive.getTouchTargetSize('recommended') }}
                          disabled={isLoading}
                        />
                        <button
                          onClick={triggerFileSelect}
                          className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-colors ${
                            isDarkMode 
                              ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                          }`}
                          title={`Attach files (${uploadLimits.maxFileSize}MB max, ${uploadLimits.maxFiles} files max)`}
                        >
                          <Paperclip size={18} />
                        </button>
                      </div>
                      
                      <button
                        onClick={isLoading ? cancelActiveRequest : () => handleSendMessage()}
                        disabled={!isLoading && !inputMessage.trim() && uploadedFiles.length === 0}
                        className={`px-4 py-3 text-white rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          isLoading 
                            ? 'bg-red-600 hover:bg-red-700' 
                            : 'bg-purple-600 hover:bg-purple-700'
                        }`}
                        style={{ minHeight: responsive.getTouchTargetSize('recommended'), minWidth: responsive.getTouchTargetSize('recommended') }}
                        title={isLoading ? 'Cancel request' : 'Send message'}
                      >
                        {isLoading ? <Square size={20} /> : <Send size={20} />}
                      </button>
                    </div>
                    
                    {error && (
                      <p className="text-red-500 text-sm mt-2">{error}</p>
                    )}
                  </div>
                  )}
                </div>
              ) : (
                <motion.div
                  key="canvas"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  {/* Mobile Canvas Interface - Full takeover */}
                  {/* 🔧 FIX: Pass same input parameters as mobile chat input bar */}
                  <MobileCanvasInterface
                    onClose={() => setCurrentView('chat')}
                    onSendMessage={async (message, lang) => {
                      await handleSendMessage(lang as any, message);
                    }}
                    isLoading={isLoading}
                    onCancelRequest={cancelActiveRequest}
                    onStartRecording={async () => {
                      if (!sttSettings.isRecording) {
                        await toggleRecording();
                      }
                    }}
                    onStopRecording={() => {
                      if (sttSettings.isRecording) {
                        toggleRecording();
                      }
                    }}
                    isRecording={sttSettings.isRecording}
                    // File attachment support - same as mobile chat
                    uploadedFiles={uploadedFiles}
                    onFilesSelected={handleFilesSelected}
                    onFilesRemoved={handleFilesRemoved}
                    uploadLimits={uploadLimits}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Search & Navigation Modal */}
          <AnimatePresence>
            {showMobileSearch && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowMobileSearch(false)}
                  className="absolute inset-0 bg-black/50 z-40"
                />
                
                {/* Slide-in Panel */}
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className={`absolute top-0 left-0 bottom-0 w-4/5 shadow-2xl z-50 ${
                    isDarkMode ? 'bg-gray-800' : 'bg-white'
                  }`}
                >
                  <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className={`flex items-center justify-between px-4 py-3 ${
                      isDarkMode ? '' : 'border-b border-gray-200'
                    }`}>
                      <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Search & Navigate
                      </h3>
                      <button
                        onClick={() => setShowMobileSearch(false)}
                        className={`p-2 rounded-lg ${
                          isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        <X size={20} />
                      </button>
                    </div>

                    {/* Search Input */}
                    <div className="px-4 py-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="text"
                          placeholder="Search conversations, canvas..."
                          className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm ${
                            isDarkMode 
                              ? 'bg-gray-700 text-white placeholder-gray-400 border-gray-600' 
                              : 'bg-gray-100 text-gray-900 placeholder-gray-500 border-gray-300'
                          } border focus:outline-none focus:ring-2 focus:ring-purple-500`}
                        />
                      </div>
                    </div>

                    {/* Content Tabs */}
                    <div className="flex">
                      <button className={`flex-1 px-4 py-3 text-sm font-medium ${
                        isDarkMode 
                          ? 'text-purple-400 border-b-2 border-purple-400 bg-gray-900/50' 
                          : 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                      }`}>
                        Conversations
                      </button>
                      <button className={`flex-1 px-4 py-3 text-sm font-medium ${
                        isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'
                      }`}>
                        Canvas
                      </button>
                      <button className={`flex-1 px-4 py-3 text-sm font-medium ${
                        isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'
                      }`}>
                        Deep Search
                      </button>
                    </div>

                    {/* Conversations List */}
                    <div className="flex-1 overflow-y-auto">
                      {conversationService.getAllConversations().map((conv) => {
                        // Generate display title: use first user message if title is generic
                        const firstUserMessage = conv.messages.find(m => m.isUser)?.text || '';
                        const displayTitle = (conv.title.startsWith('Session ') || conv.title === 'New Chat')
                          ? (firstUserMessage.slice(0, 50) || conv.title) + (firstUserMessage.length > 50 ? '...' : '')
                          : conv.title;
                        
                        return (
                        <div key={conv.id} className="relative group">
                          <button
                            onClick={() => {
                              handleConversationChange(conv);
                              setShowMobileSearch(false);
                            }}
                            className={`w-full px-4 py-3 text-left border-b ${
                              conv.id === currentConversation.id
                                ? isDarkMode
                                  ? 'bg-purple-900/30 border-purple-700'
                                  : 'bg-purple-50 border-purple-200'
                                : isDarkMode
                                  ? 'border-gray-700 hover:bg-gray-700'
                                  : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-sm font-medium truncate ${
                                isDarkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                                {displayTitle}
                              </span>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {conv.canvasElements.length > 0 && (
                                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                                    isDarkMode ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-700'
                                  }`}>
                                    {conv.canvasElements.length}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className={`text-xs truncate ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {conv.messages.length} messages · {new Date(conv.updatedAt).toLocaleDateString()}
                            </p>
                          </button>
                          
                          {/* Delete button - appears on touch/hover */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('Are you sure you want to permanently delete this conversation? This action cannot be undone.')) {
                                console.log('🗑️ Mobile search: Deleting conversation:', conv.id);
                                const success = conversationService.deleteConversation(conv.id);
                                if (success) {
                                  console.log('✅ Mobile search: Conversation deleted successfully');
                                  // Force UI refresh
                                  setShowMobileSearch(false);
                                  setTimeout(() => setShowMobileSearch(true), 100);
                                  
                                  // If deleted conversation was active, reload the new active one
                                  if (conv.id === currentConversation.id) {
                                    const newActive = conversationService.getActiveConversation();
                                    handleConversationChange(newActive);
                                  }
                                } else {
                                  console.error('❌ Mobile search: Failed to delete conversation');
                                }
                              }
                            }}
                            className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${
                              isDarkMode 
                                ? 'bg-red-600 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100' 
                                : 'bg-red-500 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100'
                            } active:opacity-100`}
                            style={{ minWidth: responsive.getTouchTargetSize('min'), minHeight: responsive.getTouchTargetSize('min') }}
                            title="Delete conversation permanently"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                      })}
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Mobile Chat History */}
          <MobileChatHistory
            isOpen={showMobileChatHistory}
            onClose={() => setShowMobileChatHistory(false)}
            onChatSelect={(chatId) => {
              // Handle chat selection
              const conversation = conversationService.getAllConversations().find(c => c.id === chatId);
              if (conversation) {
                handleConversationChange(conversation);
              }
            }}
            chatHistory={conversationService.getAllConversations().map(conv => ({
              id: conv.id,
              title: conv.title || 'Untitled Chat',
              preview: conv.messages[conv.messages.length - 1]?.text.substring(0, 100) || 'No messages',
              timestamp: conv.updatedAt || conv.createdAt || new Date(),
              messageCount: conv.messages.length,
              isActive: conv.id === currentConversation?.id,
              category: conv.canvasElements.length > 0 ? 'canvas' : 'chat',
              hasUnread: false
            }))}
            currentChatId={currentConversation?.id}
          />
        </div>
      ) : (!responsive.isMobile && !responsive.isFolded) ? (
        /* DESKTOP/TABLET/UNFOLDED LAYOUT */
        <div className={`w-full h-full flex ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
          {/* Conversation Sidebar - Fixed width, no flex */}
          {showSidebar && (
            <div className="flex-shrink-0">
              <ConversationSidebar 
                onConversationChange={handleConversationChange}
                onQuickAction={handleQuickAction}
              />
            </div>
          )}
          
          {/* Chat Panel - Dynamic width based on device category */}
          <div 
            className={`flex flex-col border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} min-w-0 transition-all duration-200`}
            style={{ 
              width: isSplitScreen ? responsive.getChatWidth() : '100%',
              flex: isSplitScreen ? 'none' : '1'
            }}
          >
            
            {/* Desktop Header */}
            <div className={`flex items-center justify-between px-4 py-3 ${isDarkMode ? 'bg-gray-900' : 'border-b border-gray-200 bg-gray-50'}`}>
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                NeuraPlay Assistant {isSplitScreen && '- Split Screen'}
              </h2>
              <div className="flex items-center space-x-2">
                {!showSidebar && (
                  <button
                    onClick={() => setShowSidebar(true)}
                    className={`px-3 py-1 text-xs rounded ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}
                  >
                    <Menu size={14} />
                  </button>
                )}
                {responsive.canUseSplitScreen && (
                  <button
                    onClick={() => {
                      const newSplitState = !isSplitScreen;
                      setIsSplitScreen(newSplitState);
                      
                      // CRITICAL FIX: When enabling split screen, ensure canvas elements are loaded
                      if (newSplitState && currentConversation.canvasElements.length > 0) {
                        console.log('🔄 Split screen enabled - loading canvas elements:', currentConversation.canvasElements.length);
                        const { canvasElementsByConversation } = useCanvasStore.getState();
                        const currentStoreElements = canvasElementsByConversation[currentConversation.id] || [];
                        
                        // Only load if store is empty or out of sync
                        if (currentStoreElements.length === 0 || currentStoreElements.length !== currentConversation.canvasElements.length) {
                          console.log('📂 Loading canvas elements into store for split view');
                          useCanvasStore.setState((state) => ({
                            canvasElementsByConversation: {
                              ...state.canvasElementsByConversation,
                              [currentConversation.id]: currentConversation.canvasElements.map((el: any) => ({
                                ...el,
                                timestamp: el.timestamp ? new Date(el.timestamp) : new Date(),
                                completedVersions: new Set(el.completedVersions || [])
                              }))
                            }
                          }));
                          console.log('✅ Canvas elements restored for split view');
                        }
                      }
                    }}
                    className={`px-3 py-1 text-xs rounded ${isDarkMode ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'}`}
                  >
                    {isSplitScreen ? 'Chat Only' : 'Split Screen'}
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Desktop Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {currentConversation.messages.length === 0 ? (
                <div className={`text-center space-y-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <div className="flex justify-center">
                    <img 
                      src="/assets/images/Mascot.png" 
                      alt="NeuraPlay Mascot" 
                      className="w-16 h-16 object-contain"
                    />
                  </div>
                  <p className="text-lg font-medium">{getTimeBasedGreeting(userName)}</p>
                  <p>I'm your AI assistant with canvas capabilities.</p>
                  <div className="flex justify-center space-x-2 text-xs">
                    <span className="px-2 py-1 bg-purple-500/20 rounded">Document Reader</span>
                    <span className="px-2 py-1 bg-blue-500/20 rounded">Chart Creator</span>
                    <span className="px-2 py-1 bg-green-500/20 rounded">Code Editor</span>
                  </div>
                </div>
              ) : (
                currentConversation.messages.map((message, index) => (
                  <div 
                    key={index} 
                    className={`flex w-full ${message.isUser ? 'justify-end' : 'justify-start'} mb-4`}
                  >
                    <div className={`${
                      message.isUser 
                        ? 'max-w-[85%] sm:max-w-[80%] md:max-w-[75%] ml-auto p-3 rounded-xl bg-purple-600 text-white rounded-br-sm'  // FIXED: Consistent user message styling
                        : 'max-w-[92%] sm:max-w-[90%] md:max-w-[85%] mr-auto'
                    }`}>
                      {message.isUser ? (
                        <div className="relative">
                          <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">
                            {message.text}
                          </p>
                          {/* STT indicator for voice input messages */}
                          {(message as any).isVoiceInput && (
                            <div className={`absolute -top-2 -right-2 p-1 rounded-full ${
                              isDarkMode ? 'bg-purple-600' : 'bg-purple-500'
                            }`} title="Voice input">
                              <Mic size={10} className="text-white" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="relative">
                          {/* TTS speaking indicator */}
                          {currentlySpeakingMessageIndex === index && (
                            <div className={`absolute -top-2 -right-2 p-1.5 rounded-full animate-pulse ${
                              isDarkMode ? 'bg-blue-600' : 'bg-blue-500'
                            }`} title="Currently speaking">
                              <Volume2 size={12} className="text-white" />
                            </div>
                          )}
                          <UnifiedMessageRenderer
                            message={message}
                            context="big-chat"
                            isDarkMode={isDarkMode}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className={`px-4 py-3 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
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

            {/* Desktop Input - Only show when in desktop or tablet mode */}
            {(responsive.isDesktop || responsive.isTablet) && (
            <div className={`p-4 ${isDarkMode ? '' : 'border-t border-gray-200'}`}>
              {/* File preview area */}
              {uploadedFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {uploadedFiles.map((file) => (
                    <div 
                      key={file.id}
                      className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${
                        isDarkMode 
                          ? 'bg-gray-800 border-gray-600 text-gray-300' 
                          : 'bg-gray-100 border-gray-300 text-gray-700'
                      }`}
                    >
                      <Paperclip size={12} />
                      <span className="text-xs truncate max-w-[100px]">{file.name}</span>
                      <button
                        onClick={() => handleFilesRemoved([file.id])}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className={`flex ${isSplitScreen ? 'space-x-1' : 'space-x-2'}`}>
                {/* Microphone button */}
                <button
                  onClick={toggleRecording}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    sttSettings.isRecording
                      ? 'bg-red-500 text-white animate-pulse'
                      : isDarkMode
                        ? 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                        : 'bg-gray-200 text-gray-600 hover:text-gray-800 hover:bg-gray-300'
                  }`}
                  title={sttSettings.isRecording ? 'Stop recording' : 'Start voice input'}
                  disabled={isLoading}
                >
                  {sttSettings.isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                </button>

                <div 
                  className={`flex-1 relative ${
                    isDragActive ? 'ring-2 ring-purple-500 ring-opacity-50' : ''
                  }`}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <input
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask me anything..."
                    className={`w-full px-3 py-2 pr-10 rounded-lg text-sm ${
                      isDarkMode 
                        ? 'bg-gray-800 text-white placeholder-gray-400 border-gray-700' 
                        : 'bg-white text-gray-900 placeholder-gray-500 border-gray-300'
                    } border focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      isDragActive ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                    }`}
                    disabled={isLoading}
                  />
                  <button
                    onClick={triggerFileSelect}
                    className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded transition-colors ${
                      isDarkMode 
                        ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                    }`}
                    title={`Attach files (${uploadLimits.maxFileSize}MB max, ${uploadLimits.maxFiles} files max)`}
                  >
                    <Paperclip size={14} />
                  </button>
                </div>

                {/* TTS toggle button */}
                <button
                  onClick={async () => {
                    if (ttsSettings.isSpeaking) {
                      stopTTS();
                    } else {
                      const wasEnabled = ttsSettings.enabled;
                      setTtsSettings(prev => ({ ...prev, enabled: !prev.enabled }));
                      
                      // If enabling TTS, read the last AI message immediately
                      if (!wasEnabled) {
                        const messages = currentConversation.messages;
                        const lastAIMessageIndex = messages.length - 1 - messages.slice().reverse().findIndex(m => !m.isUser);
                        const lastAIMessage = messages[lastAIMessageIndex];
                        if (lastAIMessage?.text && !lastAIMessage.isUser) {
                          await speakText(lastAIMessage.text, undefined, lastAIMessageIndex);
                        }
                      }
                    }
                  }}
                  className={`px-3 py-2 rounded-lg transition-colors ${
                    ttsSettings.isSpeaking
                      ? 'bg-blue-500 text-white animate-pulse'
                      : ttsSettings.enabled
                        ? 'bg-green-500 text-white'
                        : isDarkMode
                          ? 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                          : 'bg-gray-200 text-gray-600 hover:text-gray-800 hover:bg-gray-300'
                  }`}
                  title={ttsSettings.isSpeaking ? 'Stop speaking' : ttsSettings.enabled ? 'TTS enabled - Click to read last message' : 'Enable TTS'}
                >
                  {ttsSettings.isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                
                <button
                  onClick={isLoading ? cancelActiveRequest : () => handleSendMessage()}
                  disabled={!isLoading && !inputMessage.trim() && uploadedFiles.length === 0}
                  className={`${isSplitScreen ? 'px-3 py-2' : 'px-4 py-2'} text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isLoading 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                  title={isLoading ? 'Cancel request' : 'Send message'}
                >
                  {isLoading ? <Square size={16} /> : <Send size={16} />}
                </button>
              </div>
              
              {error && (
                <p className="text-red-500 text-xs mt-2">{error}</p>
              )}
            </div>
            )}
          </div>

          {/* Desktop/Tablet Canvas Panel - Dynamic width based on device */}
          {isSplitScreen && (
            <div 
              className="flex flex-col transition-all duration-200"
              style={{ width: responsive.getCanvasWidth() }}
            >
              <div className={`flex items-center justify-between px-4 py-3 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                {/* Left: Canvas info */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                  
                  {canvasElements.length > 0 ? (
                    <>
                      <span className={`text-sm font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {canvasElements[0].type === 'document' && canvasElements[0].content?.title}
                        {canvasElements[0].type === 'code' && (canvasElements[0].content?.filename || canvasElements[0].content?.title || 'Untitled')}
                        {canvasElements[0].type === 'chart' && (canvasElements[0].content?.title || 'Chart')}
                      </span>
                      <span className={`text-xs flex-shrink-0 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                        v{canvasElements[0].currentVersion || 1}
                      </span>
                    </>
                  ) : (
                    <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      No elements
                    </span>
                  )}
                </div>
                
                {/* Right: Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {canvasElements.length > 0 && (
                    <>
                      {/* Skip button when typing */}
                      {canvasElements.some(el => el.versions?.some(v => v.state === 'typing')) && (
                        <button
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent('canvas-skip-typing'));
                          }}
                          className={`
                            px-2 py-1 text-xs rounded-lg transition-colors font-medium
                            ${isDarkMode ? 'hover:bg-purple-600 bg-purple-700' : 'hover:bg-purple-100 bg-purple-50 text-purple-700'}
                          `}
                          title="Skip typing"
                        >
                          Skip
                        </button>
                      )}
                      
                      <button
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('toggle-canvas-revision-history'));
                        }}
                        className={`
                          p-1.5 rounded-lg transition-colors
                          ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-700'}
                        `}
                        title="Version history"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      
                      <button
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('canvas-export'));
                        }}
                        className={`
                          p-1.5 rounded-lg transition-colors
                          ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-200 text-gray-700'}
                        `}
                        title="Export"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <MobileCanvasRenderer />
              </div>
            </div>
          )}
        </div>
      ) : (
        /* FALLBACK: Responsive state undefined */
        <div className={`w-full h-full flex items-center justify-center ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
          <div style={{position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: 'orange', color: 'black', padding: '4px', fontSize: '12px'}}>
            FALLBACK: responsive.isMobile = {String(responsive.isMobile)} (width: {responsive.width}px)
          </div>
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Loading interface...</p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default NeuraPlayAssistantLite;