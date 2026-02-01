import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  X, Send, Mic, MicOff, Volume2, VolumeX, Maximize2, Trash2, Globe, ChevronDown, Camera, Paperclip, Image as ImageIcon
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
// OLD: Removed ConversationContext import - now using ConversationService
import { serviceContainer } from '../services/ServiceContainer';
import { conversationService } from '../services/ConversationService';
import { chatMemoryService } from '../services/ChatMemoryService';
import { memoryDatabaseBridge } from '../services/MemoryDatabaseBridge';
import { useCanvasStore } from '../stores/canvasStore';
import { getTTSConfig, getModelId } from '../config/elevenlabs';
import NeuraPlayDocumentFormatter from './NeuraPlayDocumentFormatter';
import AdvancedToolResultsRenderer from './AdvancedToolResultsRenderer';
import PlasmaBall from './PlasmaBall';

// Import centralized language service
import { type LanguageCode, SUPPORTED_LANGUAGES, languageService } from '../services/LanguageService';

// Coordination with fullscreen assistant
import { useAssistantCoordination } from '../stores/assistantCoordinationStore';

interface TTSSettings {
  enabled: boolean;
  isSpeaking: boolean;
}

interface STTSettings {
  isRecording: boolean;
  language: LanguageCode;
}

// Props for variant control - defaults preserve existing behavior
interface AIAssistantSmallProps {
  /** 
   * 'floating' (default): Current behavior - PlasmaBall button + fixed corner panel
   * 'slideUp': Bottom sheet for mobile - full-width, external control
   */
  variant?: 'floating' | 'slideUp';
  /** External open state - only used when variant='slideUp' */
  isOpen?: boolean;
  /** Callback when user closes - only used when variant='slideUp' */
  onClose?: () => void;
}

const AIAssistantSmall: React.FC<AIAssistantSmallProps> = ({
  variant = 'floating',
  isOpen: externalOpen,
  onClose
}) => {
  // Check if fullscreen assistant is open - hide this one to avoid overlap
  const fullscreenAssistantOpen = useAssistantCoordination(state => state.fullscreenAssistantOpen);
  
  // i18n hook for translations
  const { t } = useTranslation();
  
  // Core state - internal open state for floating variant
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use external or internal open state based on variant
  const isOpen = variant === 'slideUp' ? (externalOpen ?? false) : internalOpen;
  const setIsOpen = variant === 'slideUp' 
    ? (open: boolean) => { if (!open && onClose) onClose(); }
    : setInternalOpen;
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 🎯 CRITICAL FIX: Stable session ID that persists across component remounts
  // This ensures conversation continuity when navigating (e.g., to Learning Central)
  const [sessionId] = useState(() => {
    // First, try to get existing session ID from localStorage
    const STORAGE_KEY = 'neuraplay_floating_assistant_session';
    const existingSessionId = localStorage.getItem(STORAGE_KEY);
    
    if (existingSessionId) {
      // Validate it's a proper UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(existingSessionId)) {
        console.log('🔗 AIAssistantSmall: Using existing session:', existingSessionId);
        return existingSessionId;
      }
    }
    
    // Generate new UUID only if no valid one exists
    const newSessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    
    // Store it for future use
    localStorage.setItem(STORAGE_KEY, newSessionId);
    console.log('🆕 AIAssistantSmall: Created new persistent session:', newSessionId);
    return newSessionId;
  });
  const conversationContextRef = useRef<any[]>([]);
  
  // ===== COMPREHENSIVE MEMORY INTEGRATION =====
  const [userMemories, setUserMemories] = useState<any[]>([]);
  const [assistantMemory, setAssistantMemory] = useState<any>({
    preferences: {},
    learningData: {},
    contextAwareness: {}
  });
  const [isMemoryInitialized, setIsMemoryInitialized] = useState(false);
  
  // TTS/STT state
  const [ttsSettings, setTtsSettings] = useState<TTSSettings>({
    enabled: false,
    isSpeaking: false
  });
  
  const [sttSettings, setSttSettings] = useState<STTSettings>(() => {
    // Load saved language preference from localStorage, default to 'auto'
    const savedLanguage = localStorage.getItem('neuraplay_voice_language') as LanguageCode | null;
    return {
      isRecording: false,
      language: savedLanguage && SUPPORTED_LANGUAGES[savedLanguage] ? savedLanguage : 'auto'
    };
  });
  
  // Language selector dropdown state
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
        setShowLanguageDropdown(false);
      }
    };
    
    if (showLanguageDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLanguageDropdown]);
  
  // Refs
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Listen for language setting changes from settings dropdown
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'neuraplay_voice_language' && e.newValue) {
        setSttSettings(prev => ({ ...prev, language: e.newValue as LanguageCode }));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  // Contexts
  const { isDarkMode } = useTheme();
  const { user: contextUser, canUseAI, recordAIUsage } = useUser();
  // Simple message state for small assistant (replacing old conversation context)
  const [messages, setMessages] = useState<any[]>([]);
  
  // Conversation service will be accessed dynamically
  
  // Simple message management functions
  const addMessage = (message: any) => {
    setMessages(prev => [...prev, message]);
    
    // CRITICAL FIX: Sync message to conversationService for session continuity
    try {
      // Ensure we're working with the correct session conversation
      conversationService.switchToConversation(sessionId);
      
      // Add message to conversationService (it will add to active conversation)
      conversationService.addMessage({
        text: message.text,
        isUser: message.isUser,
        timestamp: message.timestamp,
        toolResults: message.toolResults || []
      });
      console.log('✅ Synced message to conversationService for session:', sessionId);
    } catch (error) {
      console.warn('⚠️ Failed to sync message to conversationService:', error);
      // Create new conversation if switching failed
      try {
        const newConv = conversationService.createNewConversation();
        console.log('🆕 Created new conversation for small assistant:', newConv.id);
      } catch (createError) {
        console.error('❌ Failed to create conversation:', createError);
      }
    }
  };
  
  const clearConversation = () => {
    setMessages([]);
    conversationContextRef.current = [];
    
    // 🔧 FIX: Also clear from conversationService AND canvas store to maintain consistency
    try {
      // 🎨 CRITICAL FIX: Clear canvas elements for this session BEFORE deleting conversation
      // This prevents old canvas documents from appearing when maximizing to NeuraPlayAssistantLite
      useCanvasStore.setState((state) => {
        const newElements = { ...state.canvasElementsByConversation };
        delete newElements[sessionId];
        console.log('🧹 AIAssistantSmall: Cleared canvas elements for session:', sessionId);
        return { canvasElementsByConversation: newElements };
      });
      
      // Delete and recreate the conversation to clear messages
      conversationService.deleteConversation(sessionId);
      conversationService.getOrCreateConversationForSession(sessionId);
      console.log('🧹 AIAssistantSmall: Cleared conversation and canvas from both local state and services');
    } catch (error) {
      console.warn('⚠️ Failed to clear conversation from service:', error);
    }
  };
  
  const getActiveConversation = () => ({
    messages: messages
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [getActiveConversation().messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // 🔧 Initialize conversation session when component mounts
  // ✨ ARCHITECTURAL FIX: NO frontend greeting logic - ChatHandler generates greeting on first message
  // 🔧 CRITICAL FIX: RESTORE messages from conversation when component remounts!
  useEffect(() => {
    console.log('🎯 AIAssistantSmall: Initializing session:', { sessionId, hasUser: !!contextUser?.id });
    
    try {
      // 🔧 CRITICAL FIX: Use getOrCreateConversationForSession to ensure conversation exists
      // switchToConversation returns null if conversation doesn't exist, causing message loss
      const currentConv = conversationService.getOrCreateConversationForSession(sessionId);
      console.log('🔗 AIAssistantSmall: Session ready:', sessionId, {
        messageCount: currentConv?.messages?.length || 0,
        conversationId: currentConv?.id
      });
      
      // 🔧 CRITICAL FIX: RESTORE messages from conversation into local state!
      // This was missing - when component remounts (e.g., after viewing a course),
      // the messages state was reset to [] and never restored from conversationService
      if (currentConv?.messages && currentConv.messages.length > 0) {
        const restoredMessages = currentConv.messages.map((msg: any) => ({
          id: msg.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: msg.text || msg.content,
          isUser: msg.isUser ?? (msg.role === 'user'),
          timestamp: msg.timestamp || new Date().toISOString(),
          toolResults: msg.toolResults || []
        }));
        
        console.log('✅ AIAssistantSmall: RESTORED', restoredMessages.length, 'messages from conversation');
        setMessages(restoredMessages);
      } else {
        console.log('📭 AIAssistantSmall: No existing messages to restore for session:', sessionId);
      }
    } catch (error) {
      console.error('❌ AIAssistantSmall: Failed to initialize session:', error);
      // Create new conversation if all else fails
      const newConv = conversationService.createNewConversation();
      console.log('🆕 AIAssistantSmall: Created new conversation:', newConv.id);
    }
  }, [sessionId, contextUser?.id]);
  
  // ✨ ARCHITECTURAL DECISION: Greeting is generated by ChatHandler when user sends first message
  // NO frontend greeting logic - keeps code clean and centralized

  // ===== COMPREHENSIVE MEMORY INITIALIZATION =====
  useEffect(() => {
    let isInitializing = false;
    
    const initializeMemory = async () => {
      if (!contextUser?.id || isMemoryInitialized || isInitializing) return;
      isInitializing = true;
      
      try {
        // Check if user context is available
        if (!contextUser?.id) {
          setIsMemoryInitialized(true);
          return;
        }
        
        // Load user memories for context awareness (reduced limit for performance)
        const memoryResult = await memoryDatabaseBridge.searchMemories({
          userId: contextUser.id,
          query: '',
          limit: 10
        });
        const memories = memoryResult.success ? (memoryResult.memories || []) : [];
        setUserMemories(memories);
        
        setIsMemoryInitialized(true);
        
      } catch (error) {
        console.error('❌ Small Assistant: Memory initialization failed:', error);
        setIsMemoryInitialized(true);
      } finally {
        isInitializing = false;
      }
    };
    
    initializeMemory();
  }, [contextUser?.id, sessionId, isMemoryInitialized]);

  // STT: Start voice recording
  const startVoiceRecording = async () => {
    try {
      // Enhanced audio constraints for better quality
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,  // AssemblyAI recommended sample rate
          channelCount: 1,    // Mono audio
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Try multiple formats for better compatibility
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }
      
      console.log('🎙️ Using audio format:', mimeType);
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
        await processVoiceInput(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setSttSettings(prev => ({ ...prev, isRecording: true }));
    } catch (error) {
      console.error('Failed to start recording:', error);
      setError('Microphone access denied or not available');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && sttSettings.isRecording) {
      mediaRecorderRef.current.stop();
      setSttSettings(prev => ({ ...prev, isRecording: false }));
    }
  };

  // STT: Process voice input through AssemblyAI
  const processVoiceInput = async (audioBlob: Blob) => {
    try {
      setIsLoading(true);
      
      // Convert audio to base64 (chunked to avoid stack overflow)
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
      
      // Send to AssemblyAI via your existing API - extended timeout for longer recordings
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
        
        // Auto-send the transcribed message with detected language
        console.log('📤 Calling handleSendMessage with language:', languageToUse);
        await handleSendMessage(transcribedText, languageToUse);
      } else {
        // Provide more helpful error message based on the result
        const usedFallback = result.used_fallback;
        const audioDuration = result.audio_duration;
        
        if (audioDuration && audioDuration < 1) {
          setError('Audio too short. Please speak for at least 1 second.');
        } else if (usedFallback) {
          setError('Speech detected but unclear. Try speaking more clearly or closer to the microphone.');
        } else {
          setError('No speech detected. Please check your microphone and try speaking clearly.');
        }
      }
    } catch (error) {
      console.error('Voice processing error:', error);
      setError('Voice transcription failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle language selection from dropdown
  const handleLanguageSelect = (languageCode: LanguageCode) => {
    setSttSettings(prev => ({ ...prev, language: languageCode }));
    // Persist to localStorage for cross-component sync
    localStorage.setItem('neuraplay_voice_language', languageCode);
    setShowLanguageDropdown(false);
    console.log('🌍 Voice language changed to:', languageCode, SUPPORTED_LANGUAGES[languageCode]?.name);
  };

  // TTS: Speak text using ElevenLabs with FULL multilingual support
  const speakText = async (text: string, overrideLanguage?: LanguageCode) => {
    try {
      setTtsSettings(prev => ({ ...prev, isSpeaking: true }));
      
      // Clean text for speech synthesis
      let cleanText = text
        .replace(/[*#]/g, '') // Remove markdown
        .replace(/\[.*?\]/g, '') // Remove bracketed content
        .replace(/🔍|📊|💡|🤔|🎨|✅|❌|🎯|🚫/g, '') // Remove emojis
        .replace(/\bhttps?:\/\/[^\s]+/g, '') // Remove URLs
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
      
      console.log('🔊 TTS - Synthesizing:', cleanText.substring(0, 50));
      
      // Get optimal TTS configuration for the language
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
      
      // Store current audio reference
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        setTtsSettings(prev => ({ ...prev, isSpeaking: false }));
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };
      
      audio.onerror = (error) => {
        console.error('🔊 TTS - Audio playback error:', error);
        setTtsSettings(prev => ({ ...prev, isSpeaking: false }));
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };
      
      await audio.play();
      
    } catch (error) {
      console.error('🔊 TTS - Failed:', error);
      setTtsSettings(prev => ({ ...prev, isSpeaking: false }));
      setError(`TTS failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Stop TTS playback
  const stopTTS = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      setTtsSettings(prev => ({ ...prev, isSpeaking: false }));
      currentAudioRef.current = null;
    }
  };

  // Debounce to prevent duplicate submissions
  const lastSubmissionRef = useRef<number>(0);

  // CRITICAL: Session transfer to fullscreen assistant
  const openFullscreen = () => {
    try {
      console.log('🔍 AIAssistantSmall: Opening fullscreen with session transfer');
      
      // Get current conversation data for transfer
      const activeConversation = conversationService.getActiveConversation();
      
      // Dispatch event for NeuraPlayAssistantLite to handle
      const event = new CustomEvent('openNeuraPlayAssistant', {
        detail: {
          sessionId: sessionId, // Transfer the session ID
          conversationData: activeConversation, // Transfer conversation history
          transferTime: new Date().toISOString(),
          source: 'AIAssistantSmall'
        }
      });
      
      window.dispatchEvent(event);
      console.log('✅ AIAssistantSmall: Session transfer event dispatched', { sessionId, messageCount: messages.length });
      
      // Close the small assistant
      setIsOpen(false);
    } catch (error) {
      console.error('❌ AIAssistantSmall: Session transfer failed:', error);
    }
  };
  
  // Handle sending messages
  const handleSendMessage = async (messageText?: string, detectedLanguage?: LanguageCode) => {
    const textToSend = messageText || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    // CRITICAL FIX: Debounce duplicate submissions within 1 second
    const now = Date.now();
    if (now - lastSubmissionRef.current < 1000) {
      console.log('🚫 AIAssistantSmall: Preventing duplicate message submission');
      return;
    }
    lastSubmissionRef.current = now;

    // SAFETY NET: Force clear loading state after 3 minutes to support longer voice recordings
    const loadingTimeout = setTimeout(() => {
      console.warn('⚠️ Loading timeout reached (180s), forcing state reset');
      setIsLoading(false);
      setError('Request took too long. Please try again or use shorter voice recordings.');
    }, 180000);

    // Check usage limits
    const aiUsage = canUseAI();
    if (!aiUsage.allowed) {
      const verificationMessage = contextUser?.isVerified 
        ? `You've reached your AI chat limit (${aiUsage.limit} prompts/day). Upgrade to Premium for more access!` 
        : `You've used your free AI chat limit (${aiUsage.limit} prompts/day). Verify your email for more access or upgrade to Premium!`;
      
      addMessage({
        text: `🚫 ${verificationMessage}`,
        isUser: false,
        timestamp: new Date()
      });
      clearTimeout(loadingTimeout);
      return;
    }

    if (!messageText) setInputMessage('');
    setIsLoading(true);
    setError(null);

    // Add user message
    addMessage({
      text: textToSend,
      isUser: true,
      timestamp: new Date()
    });

    try {
      recordAIUsage();
      
      // Build conversation history for context awareness
      const recentMessages = messages.slice(-10).map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text,
        timestamp: msg.timestamp
      }));
      
      // Update persistent conversation context
      conversationContextRef.current = recentMessages;
      
      // Determine language for response
      const responseLanguage = detectedLanguage || sttSettings.language;
      const languageInfo = SUPPORTED_LANGUAGES[responseLanguage];
      
      console.log('🌍 AIAssistantSmall - Language determination:', {
        detectedLanguage,
        sttLanguage: sttSettings.language,
        responseLanguage,
        languageName: languageInfo?.name
      });
      
      // Context with conversation history for continuity
      const context = {
        currentPage: window.location.pathname,
        user: contextUser ? { 
          id: contextUser.id, 
          name: contextUser.username
        } : { id: 'anonymous', name: 'User' },
        session: {
          id: sessionId, // FIXED: Use persistent session ID
          startTime: new Date(),
          conversationHistory: recentMessages // ADDED: Conversation context
        },
        capabilities: {
          voiceInput: true,
          voiceOutput: ttsSettings.enabled,
          tts: ttsSettings.enabled
        },
        // CRITICAL: Language context for multilingual responses
        language: {
          code: responseLanguage,
          name: languageInfo?.name || 'Auto-Detect',
          isAuto: sttSettings.language === 'auto',
          detectedLanguage: detectedLanguage || null
        }
      };
      
      // Use AI Router consistently with fullscreen assistant (no fallback to ensure same safety system)
      let response;
      try {
        console.log('🔍 AIAssistantSmall - Sending request to AIRouter:', {
          message: textToSend,
          sessionId: context.session.id,
          userId: context.user.id,
          mode: 'chat'
        });
        
        // CRITICAL FIX: Add timeout protection to prevent UI freezing
        console.log('🔍 AIAssistantSmall - Waiting for services to be ready...');
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
          
          if (!aiRouter) {
            throw new Error('AI Router not available');
          }
        } catch (serviceError) {
          console.warn('⚠️ Services not ready, using fallback mode:', serviceError);
          throw new Error('AI system is starting up. Please wait a moment and try again.');
        }
        
        // Build message with language instruction for non-English/non-auto
        let messageWithLanguageHint = textToSend;
        if (responseLanguage !== 'auto' && responseLanguage !== 'en' && languageInfo) {
          // Add language instruction as system hint
          messageWithLanguageHint = `[Respond in ${languageInfo.name}] ${textToSend}`;
          console.log('🌍 AIAssistantSmall - Adding language hint:', languageInfo.name);
        }
        
        // 🎯 SPATIAL CONTEXT: Determine if user is viewing canvas
        const { useCanvasStore } = await import('../stores/canvasStore');
        const currentCanvasElements = useCanvasStore.getState().getCurrentCanvasElements();
        const isCanvasVisible = currentCanvasElements.length > 0;
        
        response = await aiRouter.processRequest({
          message: messageWithLanguageHint,
          sessionId: context.session.id,
          userId: context.user.id,
          mode: 'chat',
          conversationHistory: recentMessages, // CRITICAL: Pass conversation history
          // 🚫 CRITICAL: Small assistant should NOT create canvas documents
          // Canvas operations should only happen in fullscreen NeuraPlayAssistantLite
          canvasEnabled: false,
          // 🎯 LOCATION CONTEXT: Critical for modification vs creation routing
          locationContext: {
            currentPage: window.location.pathname,
            isCanvasVisible: isCanvasVisible,
            isCanvasFullscreen: false, // Small assistant never fullscreen
            activeCanvasType: currentCanvasElements.length > 0 
              ? currentCanvasElements[currentCanvasElements.length - 1]?.type 
              : null,
            assistantType: 'small' // Explicit identifier
          },
          constraints: {
            maxTokens: 800,
            temperature: 0.7,
            timeoutMs: 60000
          },
          context: context
        });
        
        console.log('🔍 AIAssistantSmall - Raw response from AIRouter:', JSON.stringify(response, null, 2));

        // Flexible response handling - check for various response formats
        // Allow empty response strings if there are toolResults (tool results renderer will handle display)
        const hasToolResults = response?.toolResults && response.toolResults.length > 0;
        if (!response || (response.response === undefined && response.success !== false && !hasToolResults)) {
          console.error('🔍 AIAssistantSmall - AI Router returned invalid response:', response);
          throw new Error('AI Router failed: Invalid response format');
        }
        
        // Handle error responses
        if (response.success === false && response.error) {
          console.error('🔍 AIAssistantSmall - AI Router returned error:', response.error);
          throw new Error(response.error);
        }
        
        // Ensure we have a response text (can be empty string if toolResults exist)
        if (typeof response.response !== 'string') {
          console.error('🔍 AIAssistantSmall - Response is not a string:', typeof response.response);
          throw new Error('AI Router failed: Response is not text');
        }
        
        console.log('🔍 AIAssistantSmall - AI Router succeeded, response length:', response.response.length);
      } catch (routerError) {
        console.error('❌ AIAssistantSmall - AI Router failed:', routerError);
        
        // Don't fall back to direct API - maintain consistency with fullscreen assistant
        // This ensures both use the same safety system and processing logic
        throw new Error('AI system temporarily unavailable. Please try again or use the fullscreen assistant.');
      }

      // Add AI response
      addMessage({
        text: response.response,
        isUser: false,
        timestamp: new Date(),
        toolResults: response.toolResults || []
      });

      // Auto-speak response if TTS is enabled
      if (ttsSettings.enabled && !ttsSettings.isSpeaking) {
        // Smart chunking: Read full response with reasonable character limit
        const fullResponse = response.response.trim();
        const MAX_TTS_LENGTH = 2000; // Prevent extremely long TTS
        const textToSpeak = fullResponse.length > MAX_TTS_LENGTH 
          ? fullResponse.substring(0, MAX_TTS_LENGTH) + '...'
          : fullResponse;
        
        if (textToSpeak && textToSpeak.length > 10) {
          // CRITICAL: Use responseLanguage (not detectedLanguage) for consistent TTS
          // This ensures TTS matches the language context sent to the AI
          console.log('🔊 AUTO-SPEAK - Smart chunking:', {
            fullLength: fullResponse.length,
            willSpeak: textToSpeak.length,
            truncated: fullResponse.length > MAX_TTS_LENGTH,
            responseLanguage,
            detectedLanguage,
            sttSettingsLanguage: sttSettings.language,
            willUseTTS: responseLanguage
          });
          await speakText(textToSpeak, responseLanguage);
        }
      }

    } catch (error) {
      console.error('❌ Small AI Assistant error:', error);
      addMessage({
        text: `🚫 Sorry, I encountered an error. Please try again. ${error instanceof Error ? `(${error.message})` : ''}`,
        isUser: false,
        timestamp: new Date()
      });
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      // Clear the safety timeout
      clearTimeout(loadingTimeout);
      setIsLoading(false);
    }
  };

  // Get last AI message for TTS
  const getLastAIMessage = () => {
    const messages = getActiveConversation().messages;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (!messages[i].isUser) {
        return messages[i];
      }
    }
    return null;
  };

  // Toggle functions
  const toggleSTT = () => {
    if (sttSettings.isRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  // Conversation state is managed internally

  // Hide floating variant when fullscreen assistant (NeuraPlayAssistantLite) is open
  // to prevent overlap/interception
  if (variant === 'floating' && fullscreenAssistantOpen) {
    return null;
  }

  // ===== FLOATING VARIANT (Default - Current Behavior) =====
  if (variant === 'floating') {
    // Floating button when closed
    if (!isOpen) {
      return (
        <motion.button
          className="fixed bottom-6 right-6 w-16 h-16 rounded-full shadow-xl flex items-center justify-center z-40 hover:scale-110 transition-transform group border-2 border-purple-500/30 bg-transparent"
          onClick={() => setIsOpen(true)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <PlasmaBall size={56} asDiv={true} />
          {ttsSettings.isSpeaking && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-400 rounded-full animate-pulse border-2 border-white"></div>
          )}
        </motion.button>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="fixed bottom-6 right-6 w-[380px] h-[500px] bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl z-40 flex flex-col overflow-hidden"
      >
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50'}`}>
        <div className="flex items-center space-x-2">
          <PlasmaBall size={20} asDiv={true} />
          <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            AI Assistant
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Language Selector Dropdown */}
          <div className="relative" ref={languageDropdownRef}>
            <button
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              className={`flex items-center space-x-1 px-2 py-1.5 rounded-lg transition-all text-xs ${
                sttSettings.language !== 'auto'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : isDarkMode 
                    ? 'hover:bg-gray-700 text-gray-400' 
                    : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Voice language (STT/TTS)"
            >
              <span>{SUPPORTED_LANGUAGES[sttSettings.language]?.flag || '🌍'}</span>
              <ChevronDown size={12} className={`transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            <AnimatePresence>
              {showLanguageDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute right-0 top-full mt-1 w-48 max-h-64 overflow-y-auto rounded-lg shadow-xl border z-50 ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-700' 
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="p-1">
                    {/* Auto option */}
                    <button
                      onClick={() => handleLanguageSelect('auto')}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md text-left text-sm transition-colors ${
                        sttSettings.language === 'auto'
                          ? 'bg-purple-500/20 text-purple-400'
                          : isDarkMode 
                            ? 'hover:bg-gray-700 text-gray-300' 
                            : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span>🌍</span>
                      <span>Auto-Detect</span>
                      {sttSettings.language === 'auto' && <span className="ml-auto text-purple-400">✓</span>}
                    </button>
                    
                    <div className={`my-1 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`} />
                    
                    {/* Top languages */}
                    <div className={`px-2 py-1 text-xs font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      Popular
                    </div>
                    {languageService.getTopLanguages().filter(l => l.code !== 'auto').map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageSelect(lang.code as LanguageCode)}
                        className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md text-left text-sm transition-colors ${
                          sttSettings.language === lang.code
                            ? 'bg-purple-500/20 text-purple-400'
                            : isDarkMode 
                              ? 'hover:bg-gray-700 text-gray-300' 
                              : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                        {sttSettings.language === lang.code && <span className="ml-auto text-purple-400">✓</span>}
                      </button>
                    ))}
                    
                    <div className={`my-1 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`} />
                    
                    {/* All other languages */}
                    <div className={`px-2 py-1 text-xs font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      All Languages
                    </div>
                    {Object.values(SUPPORTED_LANGUAGES)
                      .filter(l => l.code !== 'auto' && !['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'zh'].includes(l.code))
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(lang => (
                        <button
                          key={lang.code}
                          onClick={() => handleLanguageSelect(lang.code as LanguageCode)}
                          className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md text-left text-sm transition-colors ${
                            sttSettings.language === lang.code
                              ? 'bg-purple-500/20 text-purple-400'
                              : isDarkMode 
                                ? 'hover:bg-gray-700 text-gray-300' 
                                : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          <span>{lang.flag}</span>
                          <span className="truncate">{lang.name}</span>
                          {sttSettings.language === lang.code && <span className="ml-auto text-purple-400">✓</span>}
                        </button>
                      ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* TTS Toggle */}
          <button
            onClick={() => {
              const lastMessage = getLastAIMessage();
              if (ttsSettings.isSpeaking) {
                stopTTS();
              } else if (lastMessage) {
                speakText(lastMessage.text);
              } else {
                setTtsSettings(prev => ({ ...prev, enabled: !prev.enabled }));
              }
            }}
            className={`p-2 rounded-lg transition-all ${
              ttsSettings.isSpeaking
                ? 'bg-blue-500 text-white animate-pulse'
                : ttsSettings.enabled
                  ? 'bg-green-500 text-white'
                  : isDarkMode 
                    ? 'hover:bg-gray-700 text-gray-400' 
                    : 'hover:bg-gray-100 text-gray-600'
            }`}
            title={ttsSettings.isSpeaking ? 'Stop speaking' : getLastAIMessage() ? 'Speak last message' : 'Enable TTS'}
          >
            {ttsSettings.isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          
          {/* Fullscreen Button */}
          <button
            onClick={openFullscreen}
            className={`p-2 rounded-lg transition-all ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
            title="Open fullscreen"
          >
            <Maximize2 size={16} />
          </button>
          
          {/* Clear Button */}
          <button
            onClick={() => clearConversation()}
            className={`p-2 rounded-lg transition-all ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
            title="Clear conversation"
          >
            <Trash2 size={16} />
          </button>
          
          {/* Close Button */}
          <button
            onClick={() => setIsOpen(false)}
            className={`p-2 rounded-lg transition-all ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages - FIXED TEXT WRAPPING */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className={`text-center space-y-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <div className="flex justify-center">
              <img 
                src="/assets/images/Mascot.png" 
                alt="NeuraPlay Mascot" 
                className="w-12 h-12 object-contain"
              />
            </div>
            <p className="text-sm">{t('assistant.greeting')}</p>
            <div className="flex justify-center space-x-2 text-xs">
              <span className="px-2 py-1 bg-purple-500/20 rounded">{t('assistant.capabilities.voice_input')}</span>
              <span className="px-2 py-1 bg-blue-500/20 rounded">{t('assistant.capabilities.text_to_speech')}</span>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div 
              key={index} 
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`${
                message.isUser 
                  ? 'max-w-[90%]'  // FIXED: More breathing room for user messages
                  : 'max-w-[92%]'
              } p-3 rounded-xl ${
                message.isUser 
                  ? 'bg-purple-600 text-white' 
                  : isDarkMode 
                    ? 'bg-gray-800 text-gray-100' 
                    : 'bg-gray-100 text-gray-900'
              }`}>
                {message.isUser ? (
                  // FIXED: Proper text wrapping for user messages
                  <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">
                    {message.text}
                  </p>
                ) : (
                  // AI messages with tool results
                  <div className="space-y-2">
                    <div className="text-sm break-words whitespace-pre-wrap leading-relaxed">
                      <NeuraPlayDocumentFormatter 
                        content={message.text}
                        isTyping={false}
                        typewriterSpeed={8}
                        enableAdvancedFormatting={true}
                        className="text-sm"
                      />
                    </div>
                    
                    {/* TOOL RESULTS RENDERING - Using Advanced Card System */}
                    {/* FIXED: Break out of parent padding to prevent black frame effect */}
                    {message.toolResults && message.toolResults.length > 0 && (
                      <div className="-mx-3 -mb-3 mt-2">
                        <AdvancedToolResultsRenderer 
                          toolResults={message.toolResults}
                          context={"small-chat" as any}
                          isDarkMode={isDarkMode}
                          onCanvasActivation={() => {
                            console.log('🎨 Canvas activation from small assistant');
                            openFullscreen();
                          }}
                          chatContext={{
                            assistantType: 'small',
                            sessionId: sessionId,
                            onNewSearch: (query: string) => {
                              console.log('🔍 Related question search triggered in AIAssistantSmall:', query);
                              handleSendMessage(query);
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

      {/* Input with STT */}
      <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50'}`}>
        <div className="flex space-x-2">
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder={sttSettings.isRecording ? (t('assistant.listening') || 'Listening...') : (t('assistant.placeholder') || 'Ask me anything...')}
            rows={1}
            className={`flex-1 px-3 py-2 rounded-lg text-sm resize-none overflow-hidden min-h-[40px] max-h-[80px] ${
              isDarkMode 
                ? 'bg-gray-800 text-white placeholder-gray-400 border-gray-700' 
                : 'bg-white text-gray-900 placeholder-gray-500 border-gray-300'
            } border focus:outline-none focus:ring-2 focus:ring-purple-500`}
            disabled={isLoading || sttSettings.isRecording}
            style={{
              height: 'auto',
              minHeight: '40px',
              maxHeight: '80px'
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 80) + 'px';
            }}
          />
          
          {/* STT Button */}
          <button
            onClick={toggleSTT}
            disabled={isLoading}
            className={`px-3 py-2 rounded-lg transition-all ${
              sttSettings.isRecording
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            } disabled:opacity-50`}
            title={sttSettings.isRecording ? 'Stop recording' : 'Start voice input'}
          >
            {sttSettings.isRecording ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          
          {/* Send Button */}
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isLoading || sttSettings.isRecording}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
        
        {error && (
          <p className="text-red-500 text-xs mt-2">{error}</p>
        )}
        
        {/* Status indicators */}
        <div className="flex justify-between text-xs mt-2 text-gray-500">
          <span className="flex items-center space-x-1">
            <span>TTS: {ttsSettings.enabled ? '🔊' : '🔇'}</span>
            <span>|</span>
            <span className="flex items-center">
              {SUPPORTED_LANGUAGES[sttSettings.language]?.flag || '🌍'}
              <span className="ml-1">
                {sttSettings.language === 'auto' ? 'Auto' : SUPPORTED_LANGUAGES[sttSettings.language]?.name || sttSettings.language.toUpperCase()}
              </span>
            </span>
          </span>
          {(sttSettings.isRecording || ttsSettings.isSpeaking) && (
            <span className="text-purple-500 animate-pulse">
              {sttSettings.isRecording ? '🎙️ Recording...' : '🔊 Speaking...'}
            </span>
          )}
        </div>
      </div>
    </motion.div>
    );
  }

  // ===== SLIDEUP VARIANT (Mobile Bottom Sheet) =====
  // Only render when open (external control)
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.5 }}
      onDragEnd={(_, info) => {
        // Swipe down to close
        if (info.offset.y > 100 || info.velocity.y > 500) {
          onClose?.();
        }
      }}
      className={`fixed inset-x-0 bottom-0 h-[75vh] rounded-t-3xl shadow-2xl z-50 flex flex-col overflow-hidden ${
        isDarkMode 
          ? 'bg-gray-900 border-t border-gray-700' 
          : 'bg-white border-t border-gray-200'
      }`}
    >
      {/* Drag Handle */}
      <div className="flex justify-center py-3">
        <div className={`w-12 h-1.5 rounded-full ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
      </div>

      {/* Header */}
      <div className={`flex items-center justify-between px-4 pb-3 border-b ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50'}`}>
        <div className="flex items-center space-x-2">
          <PlasmaBall size={24} asDiv={true} />
          <span className={`font-semibold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            AI Assistant
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Language Selector Dropdown */}
          <div className="relative" ref={languageDropdownRef}>
            <button
              onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
              className={`flex items-center space-x-1 px-2 py-1.5 rounded-lg transition-all text-xs ${
                sttSettings.language !== 'auto'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : isDarkMode 
                    ? 'hover:bg-gray-700 text-gray-400' 
                    : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Voice language (STT/TTS)"
            >
              <span>{SUPPORTED_LANGUAGES[sttSettings.language]?.flag || '🌍'}</span>
              <ChevronDown size={12} className={`transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            <AnimatePresence>
              {showLanguageDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute right-0 top-full mt-1 w-48 max-h-64 overflow-y-auto rounded-lg shadow-xl border z-50 ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-700' 
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="p-1">
                    <button
                      onClick={() => handleLanguageSelect('auto')}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md text-left text-sm transition-colors ${
                        sttSettings.language === 'auto'
                          ? 'bg-purple-500/20 text-purple-400'
                          : isDarkMode 
                            ? 'hover:bg-gray-700 text-gray-300' 
                            : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span>🌍</span>
                      <span>Auto-Detect</span>
                      {sttSettings.language === 'auto' && <span className="ml-auto text-purple-400">✓</span>}
                    </button>
                    
                    <div className={`my-1 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`} />
                    
                    {languageService.getTopLanguages().filter(l => l.code !== 'auto').map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageSelect(lang.code as LanguageCode)}
                        className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md text-left text-sm transition-colors ${
                          sttSettings.language === lang.code
                            ? 'bg-purple-500/20 text-purple-400'
                            : isDarkMode 
                              ? 'hover:bg-gray-700 text-gray-300' 
                              : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                        {sttSettings.language === lang.code && <span className="ml-auto text-purple-400">✓</span>}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* TTS Toggle */}
          <button
            onClick={() => {
              const lastMessage = getLastAIMessage();
              if (ttsSettings.isSpeaking) {
                stopTTS();
              } else if (lastMessage) {
                speakText(lastMessage.text);
              } else {
                setTtsSettings(prev => ({ ...prev, enabled: !prev.enabled }));
              }
            }}
            className={`p-2 rounded-lg transition-all ${
              ttsSettings.isSpeaking
                ? 'bg-blue-500 text-white animate-pulse'
                : ttsSettings.enabled
                  ? 'bg-green-500 text-white'
                  : isDarkMode 
                    ? 'hover:bg-gray-700 text-gray-400' 
                    : 'hover:bg-gray-100 text-gray-600'
            }`}
            title={ttsSettings.isSpeaking ? 'Stop speaking' : 'Enable TTS'}
          >
            {ttsSettings.isSpeaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          
          {/* Clear Button */}
          <button
            onClick={() => clearConversation()}
            className={`p-2 rounded-lg transition-all ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
            title="Clear conversation"
          >
            <Trash2 size={18} />
          </button>
          
          {/* Close Button */}
          <button
            onClick={() => onClose?.()}
            className={`p-2 rounded-lg transition-all ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className={`text-center space-y-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <div className="flex justify-center">
              <img 
                src="/assets/images/Mascot.png" 
                alt="NeuraPlay Mascot" 
                className="w-16 h-16 object-contain"
              />
            </div>
            <p className="text-base">{t('assistant.greeting')}</p>
            <div className="flex justify-center flex-wrap gap-2 text-xs">
              <span className="px-3 py-1.5 bg-purple-500/20 rounded-full">{t('assistant.capabilities.voice_input')}</span>
              <span className="px-3 py-1.5 bg-blue-500/20 rounded-full">{t('assistant.capabilities.text_to_speech')}</span>
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div 
              key={index} 
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] p-3 rounded-2xl ${
                message.isUser 
                  ? 'bg-purple-600 text-white' 
                  : isDarkMode 
                    ? 'bg-gray-800 text-gray-100' 
                    : 'bg-gray-100 text-gray-900'
              }`}>
                {message.isUser ? (
                  <p className="text-sm break-words whitespace-pre-wrap leading-relaxed">
                    {message.text}
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="text-sm break-words whitespace-pre-wrap leading-relaxed">
                      <NeuraPlayDocumentFormatter 
                        content={message.text}
                        isTyping={false}
                        typewriterSpeed={8}
                        enableAdvancedFormatting={true}
                        className="text-sm"
                      />
                    </div>
                    
                    {message.toolResults && message.toolResults.length > 0 && (
                      <div className="-mx-3 -mb-3 mt-2">
                        <AdvancedToolResultsRenderer 
                          toolResults={message.toolResults}
                          context={"small-chat" as any}
                          isDarkMode={isDarkMode}
                          onCanvasActivation={() => {
                            console.log('🎨 Canvas activation from mobile assistant');
                            // For slideUp variant on mobile, just close - MobileShell handles canvas fullscreen
                            if (variant === 'slideUp') {
                              onClose?.();
                            } else {
                              openFullscreen();
                            }
                          }}
                          chatContext={{
                            assistantType: 'small',
                            sessionId: sessionId,
                            onNewSearch: (query: string) => {
                              handleSendMessage(query);
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
            <div className={`px-4 py-3 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
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

      {/* Input with STT - Mobile optimized */}
      <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50'}`}>
        <div className="flex space-x-2">
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder={sttSettings.isRecording ? (t('assistant.listening') || 'Listening...') : (t('assistant.placeholder') || 'Ask me anything...')}
            rows={1}
            className={`flex-1 px-4 py-3 rounded-xl text-base resize-none overflow-hidden min-h-[48px] max-h-[100px] ${
              isDarkMode 
                ? 'bg-gray-800 text-white placeholder-gray-400 border-gray-700' 
                : 'bg-gray-100 text-gray-900 placeholder-gray-500 border-gray-300'
            } border focus:outline-none focus:ring-2 focus:ring-purple-500`}
            disabled={isLoading || sttSettings.isRecording}
            style={{
              height: 'auto',
              minHeight: '48px',
              maxHeight: '100px'
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 100) + 'px';
            }}
          />
          
          {/* STT Button - Larger for mobile */}
          <button
            onClick={toggleSTT}
            disabled={isLoading}
            className={`px-4 py-3 rounded-xl transition-all ${
              sttSettings.isRecording
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            } disabled:opacity-50`}
            title={sttSettings.isRecording ? 'Stop recording' : 'Start voice input'}
          >
            {sttSettings.isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          
          {/* Send Button - Larger for mobile */}
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isLoading || sttSettings.isRecording}
            className="px-5 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
        
        {error && (
          <p className="text-red-500 text-xs mt-2">{error}</p>
        )}
        
        {/* Status indicators */}
        <div className="flex justify-between text-xs mt-2 text-gray-500">
          <span className="flex items-center space-x-1">
            <span>TTS: {ttsSettings.enabled ? '🔊' : '🔇'}</span>
            <span>|</span>
            <span className="flex items-center">
              {SUPPORTED_LANGUAGES[sttSettings.language]?.flag || '🌍'}
              <span className="ml-1">
                {sttSettings.language === 'auto' ? 'Auto' : SUPPORTED_LANGUAGES[sttSettings.language]?.name || sttSettings.language.toUpperCase()}
              </span>
            </span>
          </span>
          {(sttSettings.isRecording || ttsSettings.isSpeaking) && (
            <span className="text-purple-500 animate-pulse">
              {sttSettings.isRecording ? '🎙️ Recording...' : '🔊 Speaking...'}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default AIAssistantSmall;
