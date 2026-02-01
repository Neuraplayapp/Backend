import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Brain, 
  X, 
  MessageCircle, 
  Sparkles, 
  Target, 
  TrendingUp, 
  Lightbulb,
  RotateCcw,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Settings,
  HelpCircle,
  Zap,
  Award,
  Star,
  Clock,
  BarChart3,
  Activity
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useAIAgent } from '../contexts/AIAgentContext';
import './DynamicIslandAIAgent.css';

interface AIAgentContext {
  gameId?: string;
  gameState?: any;
  playerActions?: any[];
  currentProgress?: number;
  sessionData?: any;
  moveHistory?: any[];
  cognitiveMetrics?: any;
}

interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type: 'text' | 'suggestion' | 'analysis' | 'encouragement' | 'hint';
  gameSpecific?: boolean;
}

const DynamicIslandAIAgent: React.FC = () => {
  const { isVisible, hideAgent, currentContext, triggerAgent } = useAIAgent();
  const { user } = useUser();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [agentPersonality, setAgentPersonality] = useState<'coach' | 'mentor' | 'friend' | 'analyst'>('coach');
  const [showSettings, setShowSettings] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const islandRef = useRef<HTMLDivElement>(null);

  // Debug logging
  useEffect(() => {
    console.log('DynamicIslandAIAgent mounted, isVisible:', isVisible, 'currentContext:', currentContext);
  }, [isVisible, currentContext]);

  // Handle expansion animation
  useEffect(() => {
    if (isVisible && !isExpanding) {
      setIsExpanding(true);
    } else if (!isVisible && isExpanding) {
      setIsExpanding(false);
    }
  }, [isVisible, isExpanding]);

  const gameKnowledge = {
    'the-cube': {
      name: 'Cube',
      description: 'Rubik\'s Cube solving assistant',
      tips: ['Start with the white cross', 'Learn F2L algorithms', 'Practice finger tricks']
    },
    'memory-sequence': {
      name: 'Memory',
      description: 'Memory and sequence training',
      tips: ['Focus on patterns', 'Use chunking techniques', 'Practice regularly']
    },
    'general': {
      name: 'Learning',
      description: 'General learning assistant',
      tips: ['Take breaks', 'Stay hydrated', 'Practice consistently']
    }
  };

  const generateContextualGreeting = (context: AIAgentContext, game: any) => {
    const gameName = game?.name || 'Learning';
    const progress = context.currentProgress || 0;
    
    if (progress > 80) {
      return `🌟 Amazing progress on ${gameName}! You're doing fantastic! Keep up the great work! 🚀`;
    } else if (progress > 50) {
      return `🎯 Great work on ${gameName}! You're making excellent progress. Let's keep going! 💪`;
    } else if (progress > 20) {
      return `✨ Good start on ${gameName}! You're building a solid foundation. Ready for more? 🌟`;
    } else {
      return `🌟 Welcome to ${gameName}! I'm here to help you learn and grow. Let's start this adventure! 🚀`;
    }
  };

  const generateGameSpecificResponse = async (userMessage: string, context: AIAgentContext) => {
    const gameId = context.gameId || 'general';
    const game = gameKnowledge[gameId as keyof typeof gameKnowledge];
    
    // Simple response generation (in a real app, this would call an AI API)
    const responses = [
      `That's a great question about ${game?.name || 'learning'}! Let me help you with that.`,
      `I can see you're working on ${game?.name || 'your skills'}. Here's what I suggest...`,
      `For ${game?.name || 'this activity'}, try focusing on the fundamentals first.`,
      `Great progress! For ${game?.name || 'this'}, remember to take your time and practice regularly.`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const analyzeIntent = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('help') || lowerMessage.includes('stuck')) return 'help';
    if (lowerMessage.includes('tip') || lowerMessage.includes('advice')) return 'tip';
    if (lowerMessage.includes('progress') || lowerMessage.includes('how am i')) return 'progress';
    if (lowerMessage.includes('explain') || lowerMessage.includes('what')) return 'explain';
    return 'general';
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    // Simulate AI response
    setTimeout(async () => {
      const intent = analyzeIntent(message);
      const response = await generateGameSpecificResponse(message, currentContext || {});
      
      const aiMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        type: intent as any
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const input = inputRef.current;
      if (input && input.value.trim()) {
        handleSendMessage(input.value);
        input.value = '';
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getPositionClasses = () => {
    // Position the island at the top center of the screen
    return 'top-6 left-1/2 transform -translate-x-1/2';
  };

  return (
    <>
      {/* Dynamic Island - Always visible */}
      <div className={`fixed ${getPositionClasses()} z-[9998] transition-all duration-700 ease-in-out`}>
        <div
          ref={islandRef}
          className={`
            dynamic-island-base group
            ${isVisible ? 'dynamic-island-expanded' : 'dynamic-island-collapsed'}
            ${isExpanding ? 'dynamic-island-expanding' : ''}
          `}
        >
          {/* Island Content */}
          <div className="dynamic-island-content">
            {!isVisible ? (
              // Collapsed state - pill with brain icon and subtle animations
              <div className="flex items-center justify-center w-full h-full relative">
                {/* Breathing glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-blue-400 to-pink-400 rounded-full animate-pulse opacity-75"></div>
                
                {/* Shimmering effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full animate-shimmer"></div>
                
                {/* Parallax moving dots */}
                <div className="absolute inset-0 rounded-full overflow-hidden">
                  <div className="absolute top-1 left-2 w-1 h-1 bg-white/60 rounded-full animate-float-1"></div>
                  <div className="absolute top-2 right-2 w-1 h-1 bg-white/60 rounded-full animate-float-2"></div>
                  <div className="absolute bottom-2 left-3 w-1 h-1 bg-white/60 rounded-full animate-float-3"></div>
                </div>
                
                {/* Brain icon */}
                <div className="relative z-10 flex items-center justify-center w-full h-full">
                  <Brain className="w-5 h-5 text-white animate-breathe" />
                </div>
                
                {/* Hover effect */}
                <div className="absolute inset-0 bg-white/20 rounded-full scale-0 group-hover:scale-100 transition-transform duration-300"></div>
              </div>
            ) : (
              // Expanded state - full modal content
              <div className="w-full h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 dynamic-island-header">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center dynamic-island-icon">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        {currentContext?.gameId ? gameKnowledge[currentContext.gameId as keyof typeof gameKnowledge]?.name : 'AI'} Assistant
                      </h3>
                      <p className="text-xs text-slate-600">
                        {agentPersonality === 'coach' ? 'Learning Coach' : 
                         agentPersonality === 'mentor' ? 'Educational Mentor' :
                         agentPersonality === 'friend' ? 'Learning Friend' : 'Cognitive Analyst'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      onClick={hideAgent}
                      className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 dynamic-island-messages">
                  {messages.length === 0 && (
                    <div className="text-center text-slate-600 text-sm">
                      {currentContext?.gameId ? 
                        generateContextualGreeting(currentContext, gameKnowledge[currentContext.gameId as keyof typeof gameKnowledge]) :
                        "🌟 Hi! I'm your AI learning assistant. How can I help you today?"
                      }
                    </div>
                  )}
                  
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`mb-3 ${
                        message.role === 'user' ? 'text-right' : 'text-left'
                      }`}
                    >
                      <div
                        className={`inline-block max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                          message.role === 'user'
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                            : 'bg-white/90 backdrop-blur-sm text-slate-800 border border-white/30'
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                  
                  {isTyping && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm">AI is thinking...</span>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 dynamic-island-input">
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Ask me anything..."
                      onKeyPress={handleKeyPress}
                      className="flex-1 px-4 py-2 rounded-full bg-white/90 backdrop-blur-sm border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800"
                    />
                    <button
                      onClick={() => {
                        const input = inputRef.current;
                        if (input && input.value.trim()) {
                          handleSendMessage(input.value);
                          input.value = '';
                        }
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trigger Button - Hidden when island is expanded */}
      {!isVisible && (
        <div className="fixed bottom-4 left-4 z-[9997]">
          <button
            onClick={() => {
              console.log('Dynamic Island trigger clicked');
              triggerAgent('manual', {
                gameId: currentContext?.gameId || 'general',
                currentProgress: currentContext?.currentProgress || 0,
                moveHistory: currentContext?.moveHistory || [],
                timeSpent: currentContext?.timeSpent || 0
              });
            }}
            className="group relative w-12 h-12 bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500 rounded-full shadow-2xl hover:shadow-purple-500/50 transition-all duration-500 ease-in-out"
          >
            <Brain className="w-5 h-5 text-white animate-breathe" />
          </button>
        </div>
      )}
    </>
  );
};

export default DynamicIslandAIAgent; 