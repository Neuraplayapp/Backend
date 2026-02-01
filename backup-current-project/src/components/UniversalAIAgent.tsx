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
import './UniversalAIAgent.css';

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

const UniversalAIAgent: React.FC = () => {
  const { isVisible, hideAgent, currentContext, triggerAgent } = useAIAgent();
  const [position] = useState<'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center'>('top-right');
  const { user } = useUser();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [agentPersonality, setAgentPersonality] = useState<'coach' | 'mentor' | 'friend' | 'analyst'>('coach');
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debug logging
  useEffect(() => {
    console.log('UniversalAIAgent mounted, isVisible:', isVisible, 'currentContext:', currentContext);
  }, [isVisible, currentContext]);

  // Game-specific knowledge bases
  const gameKnowledge = {
    'the-cube': {
      name: 'The Cube',
      description: 'A 3D puzzle game that challenges spatial reasoning and problem-solving skills',
      concepts: [
        'Spatial Reasoning',
        'Pattern Recognition',
        'Sequential Thinking',
        'Problem Decomposition',
        'Visual Memory',
        'Motor Planning',
        'Cognitive Flexibility'
      ],
      tips: [
        'Start with one face and work systematically',
        'Look for patterns and sequences',
        'Practice finger tricks for speed',
        'Break down complex moves into simpler steps',
        'Use the cross method for beginners'
      ],
      milestones: [
        { name: 'First Face', description: 'Complete one face of the cube' },
        { name: 'Cross Pattern', description: 'Form a cross pattern on one face' },
        { name: 'Two Layers', description: 'Complete two layers of the cube' },
        { name: 'Full Solve', description: 'Solve the entire cube' }
      ],
      cognitiveBenefits: [
        'Improves spatial visualization',
        'Enhances problem-solving skills',
        'Develops pattern recognition',
        'Builds patience and persistence',
        'Strengthens working memory'
      ]
    }
  };

  // Initialize agent based on context
  useEffect(() => {
    if (isVisible && currentContext?.gameId) {
      initializeAgent();
    }
  }, [isVisible, currentContext]);

  const initializeAgent = useCallback(async () => {
    if (!currentContext?.gameId) return;

    const game = gameKnowledge[currentContext.gameId as keyof typeof gameKnowledge];
    if (!game) return;

    setIsTyping(true);
    
    // Generate contextual greeting
    const greeting = generateContextualGreeting(currentContext, game);
    
    setTimeout(() => {
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: greeting,
          timestamp: new Date(),
          type: 'text',
          gameSpecific: true
        }
      ]);
      setIsTyping(false);
    }, 1000);
  }, [currentContext]);

  const generateContextualGreeting = (context: AIAgentContext, game: any) => {
    const { gameId, currentProgress, moveHistory, sessionData } = context;
    
    if (gameId === 'the-cube') {
      if (currentProgress && currentProgress > 80) {
        return `🎉 Amazing progress! You're so close to solving the cube! Your spatial reasoning skills are really shining through. Keep up this excellent work!`;
      } else if (currentProgress && currentProgress > 50) {
        return `🌟 Great work! You're making excellent progress on the cube. I can see your problem-solving skills developing nicely. Would you like some tips to help you advance further?`;
      } else if (moveHistory && moveHistory.length > 10) {
        return `🧩 I can see you're working hard on the cube! You've made ${moveHistory.length} moves so far. Remember, every move is a learning opportunity. How can I help you today?`;
      } else {
        return `👋 Hello! I'm your AI assistant for The Cube. I'm here to help you develop your spatial reasoning and problem-solving skills. What would you like to know about solving the cube?`;
      }
    }
    
    return `👋 Hello! I'm your AI learning assistant. I'm here to help you with your learning journey. How can I assist you today?`;
  };

  const generateGameSpecificResponse = async (userMessage: string, context: AIAgentContext) => {
    const { gameId, currentProgress, moveHistory, sessionData } = context;
    
    // Try API call first for dynamic responses
    try {
      const game = gameKnowledge[gameId as keyof typeof gameKnowledge];
      const intent = analyzeIntent(userMessage);
      
      const response = await fetch('/.netlify/functions/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_type: 'chat',
          input_data: {
            prompt: `You are an AI assistant for a learning platform. The user is playing "${game?.name || 'a game'}" and asks: "${userMessage}". 
            
            Context:
            - Game: ${game?.name || 'Unknown'}
            - Current Progress: ${currentProgress || 0}%
            - User Intent: ${intent}
            - Game Description: ${game?.description || 'A learning game'}
            
            Provide a helpful, encouraging response that is specific to this game and the user's current situation. Keep it concise but informative.`,
            max_tokens: 200,
            temperature: 0.7
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.response) {
          return data.response;
        }
      }
    } catch (error) {
      console.error('API call failed, falling back to static responses:', error);
    }
    
    // Fallback to static responses
    if (gameId === 'the-cube') {
      const game = gameKnowledge['the-cube'];
      
      // Analyze user message for intent
      const intent = analyzeIntent(userMessage);
      
      switch (intent) {
        case 'help':
          return `Here are some helpful tips for The Cube:\n\n${game.tips.slice(0, 3).map(tip => `• ${tip}`).join('\n')}\n\nWould you like me to explain any of these in more detail?`;
        
        case 'progress':
          const progressMsg = currentProgress 
            ? `You're currently at ${currentProgress}% completion! That's excellent progress. `
            : 'You\'re making great progress! ';
          return `${progressMsg}Keep practicing and you'll see your skills improve rapidly.`;
        
        case 'technique':
          return `For The Cube, focus on these key techniques:\n\n• Start with one face and work systematically\n• Look for patterns and sequences\n• Practice finger tricks for speed\n• Break down complex moves into simpler steps`;
        
        case 'motivation':
          return `🎯 You're doing fantastic! Remember, every expert was once a beginner. Your persistence and willingness to learn are your greatest strengths. Keep pushing forward!`;
        
        default:
          return `I'm here to help you with The Cube! You can ask me about:\n\n• Tips and techniques\n• Your progress\n• Cognitive benefits\n• Problem-solving strategies\n\nWhat would you like to know?`;
      }
    }
    
    return `I'm here to help you with your learning! What would you like to know about?`;
  };

  const analyzeIntent = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('help') || lowerMessage.includes('tip') || lowerMessage.includes('how')) {
      return 'help';
    } else if (lowerMessage.includes('progress') || lowerMessage.includes('how am i doing')) {
      return 'progress';
    } else if (lowerMessage.includes('technique') || lowerMessage.includes('method') || lowerMessage.includes('strategy')) {
      return 'technique';
    } else if (lowerMessage.includes('motivation') || lowerMessage.includes('encourage') || lowerMessage.includes('stuck')) {
      return 'motivation';
    }
    
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

    try {
      const response = await generateGameSpecificResponse(message, currentContext || {});
      
      const aiMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        type: 'text',
        gameSpecific: true
      };

      setTimeout(() => {
        setMessages(prev => [...prev, aiMessage]);
        setIsTyping(false);
      }, 1000);

    } catch (error) {
      console.error('Error generating AI response:', error);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputRef.current) {
      handleSendMessage(inputRef.current.value);
      inputRef.current.value = '';
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getPositionClasses = () => {
    // Dynamic positioning based on context
    if (currentContext?.gameId === 'the-cube') {
      // For The Cube game, position it on the left side to avoid conflicts
      return 'bottom-4 left-4';
    }
    
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'center':
        return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
      default:
        return 'bottom-4 left-4';
    }
  };

    return (
    <>
      {/* Floating AI Assistant Button - Always visible */}
      <div className="fixed bottom-4 left-4 z-[9998]">
        <button
          onClick={() => {
            console.log('Floating AI button clicked');
            triggerAgent('manual', {
              gameId: currentContext?.gameId || 'general',
              currentProgress: currentContext?.currentProgress || 0,
              moveHistory: currentContext?.moveHistory || [],
              timeSpent: currentContext?.timeSpent || 0
            });
          }}
          className="group relative w-16 h-16 bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500 rounded-full shadow-2xl hover:shadow-purple-500/50 transition-all duration-500 ease-in-out ai-living-button"
        >
          {/* Breathing glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-blue-400 to-pink-400 rounded-full animate-pulse opacity-75"></div>
          
          {/* Shimmering effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full animate-shimmer"></div>
          
          {/* Parallax moving dots */}
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div className="absolute top-2 left-2 w-1 h-1 bg-white/60 rounded-full animate-float-1"></div>
            <div className="absolute top-3 right-3 w-1 h-1 bg-white/60 rounded-full animate-float-2"></div>
            <div className="absolute bottom-3 left-3 w-1 h-1 bg-white/60 rounded-full animate-float-3"></div>
          </div>
          
          {/* Brain icon */}
          <div className="relative z-10 flex items-center justify-center w-full h-full">
            <Brain className="w-6 h-6 text-white animate-breathe" />
          </div>
          
          {/* Hover effect */}
          <div className="absolute inset-0 bg-white/20 rounded-full scale-0 group-hover:scale-100 transition-transform duration-300"></div>
        </button>
        
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-black/80 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
          AI Assistant
        </div>
      </div>

      {/* Main Modal - Only visible when isVisible is true */}
      {isVisible && (
        <div className={`fixed ${getPositionClasses()} z-[9999] transition-all duration-500 ease-in-out ai-agent-container`}>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm ai-backdrop"
            onClick={hideAgent}
          />
      
      {/* Main Modal */}
      <div className={`
        relative w-96 h-[500px] rounded-2xl shadow-2xl ai-agent-modal
        overflow-hidden transition-all duration-300 ai-minimize-animation
        ${isMinimized ? 'h-16 minimized' : ''}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 ai-agent-header">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center ai-agent-icon">
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
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            >
              {isMinimized ? <MessageCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto h-[380px] ai-messages-container">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`
                      max-w-[80%] p-3 rounded-2xl
                      ${message.role === 'user' 
                        ? 'ai-message-user text-white' 
                        : 'ai-message-assistant text-slate-800'
                      }
                    `}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="ai-message-assistant p-3 rounded-2xl">
                      <div className="flex items-center gap-2">
                        <div className="flex space-x-1 ai-typing-indicator">
                          <div className="w-2 h-2 bg-blue-500 rounded-full dot"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full dot"></div>
                          <div className="w-2 h-2 bg-blue-500 rounded-full dot"></div>
                        </div>
                        <span className="text-xs text-slate-600">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/20">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ask me anything..."
                  className="flex-1 px-3 py-2 rounded-lg text-sm ai-input-field"
                  onKeyPress={handleKeyPress}
                />
                <button
                  onClick={() => {
                    if (inputRef.current) {
                      handleSendMessage(inputRef.current.value);
                      inputRef.current.value = '';
                    }
                  }}
                  className="p-2 text-white rounded-lg ai-send-button"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-16 right-0 w-64 rounded-lg shadow-xl p-4 ai-settings-panel">
          <h4 className="font-semibold text-slate-800 mb-3">AI Assistant Settings</h4>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-600 mb-1 block">Personality</label>
              <select
                value={agentPersonality}
                onChange={(e) => setAgentPersonality(e.target.value as any)}
                className="w-full px-2 py-1 text-sm bg-white/80 rounded border border-white/20"
              >
                <option value="coach">Learning Coach</option>
                <option value="mentor">Educational Mentor</option>
                <option value="friend">Learning Friend</option>
                <option value="analyst">Cognitive Analyst</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">Auto-suggestions</span>
              <input type="checkbox" className="rounded" />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600">Sound effects</span>
              <input 
                type="checkbox" 
                checked={!isMuted}
                onChange={(e) => setIsMuted(!e.target.checked)}
                className="rounded" 
              />
            </div>
          </div>
        </div>
      )}
    </div>
      )}
    </>
  );
};

export default UniversalAIAgent; 