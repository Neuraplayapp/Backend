import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Volume2, VolumeX, Bot, Globe, Mic, MicOff } from 'lucide-react';

interface Message {
  text: string;
  isUser: boolean;
  timestamp: Date;
  language: string;
}

interface AITeachingAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AITeachingAssistantModal: React.FC<AITeachingAssistantModalProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "🌟 Hello! I'm your AI Teaching Assistant! I can help you learn in multiple languages. Choose your preferred language and let's start learning! 🚀",
      isUser: false,
      timestamp: new Date(),
      language: 'english'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('english');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechAnimationRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'english', name: 'English', flag: '🇺🇸' },
    { code: 'russian', name: 'Русский', flag: '🇷🇺' },
    { code: 'arabic', name: 'العربية', flag: '🇸🇦' }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      text: inputMessage,
      isUser: true,
      timestamp: new Date(),
      language: selectedLanguage
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = {
        english: "Great question! I'm here to help you learn. What would you like to explore today?",
        russian: "Отличный вопрос! Я здесь, чтобы помочь вам учиться. Что бы вы хотели изучить сегодня?",
        arabic: "سؤال رائع! أنا هنا لمساعدتك في التعلم. ماذا تريد أن تستكشف اليوم؟"
      };

      const assistantMessage: Message = {
        text: responses[selectedLanguage as keyof typeof responses] || responses.english,
        isUser: false,
        timestamp: new Date(),
        language: selectedLanguage
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const speakMessage = async (text: string, language: string) => {
    if ('speechSynthesis' in window) {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set language based on selection
      const languageMap = {
        english: 'en-US',
        russian: 'ru-RU',
        arabic: 'ar-SA'
      };
      
      utterance.lang = languageMap[language as keyof typeof languageMap] || 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      speechSynthesis.speak(utterance);
    }
  };

  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsListening(true);
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = selectedLanguage === 'english' ? 'en-US' : 
                       selectedLanguage === 'russian' ? 'ru-RU' : 'ar-SA';
      recognition.continuous = false;
      recognition.interimResults = false;
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
        setIsListening(false);
      };
      
      recognition.onerror = () => {
        setIsListening(false);
      };
      
      recognition.start();
    }
  };

  const stopListening = () => {
    setIsListening(false);
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.stop();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="w-full h-full max-w-4xl max-h-[90vh] relative">
        {/* Main modal window */}
        <div className="w-full h-full bg-slate-900/50 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bot className="w-6 h-6" />
                <h2 className="text-xl font-bold">AI Teaching Assistant</h2>
              </div>
              
              {/* Language Selection */}
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5" />
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="bg-white/20 text-white border border-white/30 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code} className="text-gray-800">
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.isUser
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-gray-200 border border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {!message.isUser && (
                      <div className="flex items-center gap-1">
                        <Bot className="w-4 h-4" />
                        <span className="text-xs opacity-70">AI Assistant</span>
                      </div>
                    )}
                    {message.isUser && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs opacity-70">You</span>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm leading-relaxed">{message.text}</p>
                  
                  {!message.isUser && (
                    <button
                      onClick={() => speakMessage(message.text, message.language)}
                      disabled={isSpeaking}
                      className="mt-2 text-xs opacity-70 hover:opacity-100 transition-opacity flex items-center gap-1"
                    >
                      {isSpeaking ? (
                        <>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                          </div>
                          Speaking...
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3 h-3" />
                          Listen
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 text-gray-200 border border-white/20 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    <span className="text-xs opacity-70">AI Assistant</span>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-white/20">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="w-full bg-white/10 text-white border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-gray-400"
                />
                
                {/* Speech Animation */}
                {isSpeaking && (
                  <div 
                    ref={speechAnimationRef}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1"
                  >
                    <div className="w-1 h-3 bg-purple-400 rounded-full animate-pulse"></div>
                    <div className="w-1 h-5 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-4 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1 h-6 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                    <div className="w-1 h-3 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                )}
              </div>
              
              <button
                onClick={isListening ? stopListening : startListening}
                className={`p-3 rounded-xl transition-colors ${
                  isListening 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {isListening ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
              </button>
              
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed p-3 rounded-xl transition-colors"
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-[-10px] right-[-10px] bg-white text-slate-800 p-2 rounded-full shadow-lg hover:bg-slate-200 transition-transform hover:scale-110"
          aria-label="Close AI Assistant"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

export default AITeachingAssistantModal; 