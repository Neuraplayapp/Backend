import { useState, useCallback, useEffect, useRef } from 'react';
import { AIService } from '../services/AIService';
import { NavigationService } from '../services/NavigationService';
import { SettingsService } from '../services/SettingsService';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

export interface AIMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  type: 'text' | 'command' | 'error' | 'system';
  metadata?: any;
}

export interface AIAssistantState {
  messages: AIMessage[];
  isTyping: boolean;
  isListening: boolean;
  isOnline: boolean;
  lastError: string | null;
}

export interface AIAssistantActions {
  sendMessage: (text: string) => Promise<void>;
  startVoiceInput: () => Promise<void>;
  stopVoiceInput: () => void;
  clearMessages: () => void;
  retryLastMessage: () => Promise<void>;
  getHealthStatus: () => Promise<boolean>;
}

export function useAIAssistant(): [AIAssistantState, AIAssistantActions] {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { user } = useUser();
  const aiService = AIService.getInstance();
  const navigationService = NavigationService.getInstance();
  const settingsService = SettingsService.getInstance();
  
  const lastMessageRef = useRef<AIMessage | null>(null);
  const voiceStreamRef = useRef<MediaStream | null>(null);

  // Initialize services
  useEffect(() => {
    navigationService.setNavigate(navigate);
    
    // Add initial greeting
    setMessages([{
      id: Date.now().toString(),
      text: "🌟 Hi there! I'm Synapse, your friendly AI teacher! 🚀 I can help you with learning, games, navigation, settings, and accessibility needs. What would you like to explore today? 🎮✨",
      isUser: false,
      timestamp: new Date(),
      type: 'system'
    }]);

    // Check health status
    checkHealthStatus();
  }, []);

  const checkHealthStatus = useCallback(async () => {
    const healthy = await aiService.healthCheck();
    setIsOnline(healthy);
  }, []);

  const addMessage = useCallback((message: Omit<AIMessage, 'id' | 'timestamp'>) => {
    const newMessage: AIMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
    lastMessageRef.current = newMessage;
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    addMessage({
      text,
      isUser: true,
      type: 'text'
    });

    setIsTyping(true);
    setLastError(null);

    try {
      // Get current context
      const context = {
        user,
        currentPage: window.location.pathname,
        settings: Object.fromEntries(settingsService.getAllSettings())
      };

      // Send to AI service with tool calling support
      const response = await aiService.sendMessage(text, context, true);
      
      // Parse response (could be JSON object or string)
      const responseText = typeof response === 'string' ? response : 
                          response.response || response.text || response.generated_text || 'No response received';
      
      // Add AI response
      addMessage({
        text: responseText,
        isUser: false,
        type: 'text'
      });

      // Check if response contains navigation command
      if (responseText.includes('🚀 Taking you to')) {
        const pathMatch = responseText.match(/to ([^!]+)!/);
        if (pathMatch) {
          const pageName = pathMatch[1];
          const result = await navigationService.navigateTo(`/${pageName.toLowerCase().replace(' ', '-')}`, user);
          if (!result.success) {
            addMessage({
              text: result.message,
              isUser: false,
              type: 'error'
            });
          }
        }
      }

    } catch (error) {
      console.error('AI Assistant error:', error);
      setLastError(error instanceof Error ? error.message : 'Unknown error');
      addMessage({
        text: "I'm having trouble right now. Let me try again in a moment! 🌟",
        isUser: false,
        type: 'error'
      });
    } finally {
      setIsTyping(false);
    }
  }, [addMessage, user, settingsService, navigationService]);

  const startVoiceInput = useCallback(async () => {
    try {
      setIsListening(true);
      const { stream, transcription } = await aiService.startVoiceTranscription(
        (text) => {
          addMessage({
            text,
            isUser: true,
            type: 'text'
          });
          sendMessage(text);
        },
        (error) => {
          setLastError(error);
          setIsListening(false);
        }
      );
      voiceStreamRef.current = stream;
    } catch (error) {
      setLastError('Failed to start voice input');
      setIsListening(false);
    }
  }, [addMessage, sendMessage]);

  const stopVoiceInput = useCallback(() => {
    if (voiceStreamRef.current) {
      voiceStreamRef.current.getTracks().forEach(track => track.stop());
      voiceStreamRef.current = null;
    }
    setIsListening(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([{
      id: Date.now().toString(),
      text: "🌟 Hi there! I'm Synapse, your friendly AI teacher! 🚀 I can help you with learning, games, navigation, settings, and accessibility needs. What would you like to explore today? 🎮✨",
      isUser: false,
      timestamp: new Date(),
      type: 'system'
    }]);
  }, []);

  const retryLastMessage = useCallback(async () => {
    if (lastMessageRef.current && lastMessageRef.current.isUser) {
      await sendMessage(lastMessageRef.current.text);
    }
  }, [sendMessage]);

  const getHealthStatus = useCallback(async () => {
    const healthy = await aiService.healthCheck();
    setIsOnline(healthy);
    return healthy;
  }, []);

  return [
    { messages, isTyping, isListening, isOnline, lastError },
    { sendMessage, startVoiceInput, stopVoiceInput, clearMessages, retryLastMessage, getHealthStatus }
  ];
} 