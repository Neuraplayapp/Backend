import React, { useState, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { X, Phone, PhoneOff, BookOpen, Brain, Lightbulb, GraduationCap, Sparkles, Globe } from 'lucide-react';
import VoiceConversationWidget from './VoiceConversationWidget';

// Language options for the Teachers Room
const TEACHER_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'kk', name: 'Қазақша', flag: '🇰🇿' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
];

interface TeachersRoomProps {
  onClose: () => void;
}

const TeachersRoom: React.FC<TeachersRoomProps> = ({ onClose }) => {
  const { isDarkMode, isDarkGradient } = useTheme();
  const [conversationHistory, setConversationHistory] = useState<Array<{ text: string; isUser: boolean; timestamp: Date }>>([]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  const handleConversationStart = useCallback(() => {
    setIsCallActive(true);
    setConversationHistory(prev => [...prev, {
      text: "Hello! I'm your AI teacher. What would you like to learn about today?",
      isUser: false,
      timestamp: new Date()
    }]);
  }, []);

  const handleConversationEnd = useCallback(() => {
    setIsCallActive(false);
    setConversationHistory(prev => [...prev, {
      text: "Great session! Feel free to call me again anytime.",
      isUser: false,
      timestamp: new Date()
    }]);
  }, []);

  const handleMessage = useCallback((message: { text: string; isUser: boolean; timestamp: Date }) => {
    setConversationHistory(prev => [...prev, message]);
  }, []);

  const handleError = useCallback((error: string) => {
    setConversationHistory(prev => [...prev, {
      text: `Issue: ${error}`,
      isUser: false,
      timestamp: new Date()
    }]);
  }, []);

  const getBackgroundClasses = () => {
    if (isDarkMode || isDarkGradient) {
      return "bg-gradient-to-br from-indigo-950 via-purple-950 to-indigo-950";
    }
    return "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50";
  };

  const getCardClasses = () => {
    if (isDarkMode || isDarkGradient) {
      return "bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-xl border border-purple-500/20";
    }
    return "bg-white/90 backdrop-blur-xl border border-indigo-200 shadow-2xl";
  };

  const getTextClass = (variant: 'primary' | 'secondary' | 'accent' = 'primary') => {
    if (isDarkMode || isDarkGradient) {
      if (variant === 'accent') return 'text-purple-300';
      if (variant === 'secondary') return 'text-gray-300';
      return 'text-white';
    }
    if (variant === 'accent') return 'text-indigo-600';
    if (variant === 'secondary') return 'text-gray-600';
    return 'text-gray-900';
  };

  return (
    <div className={`${getBackgroundClasses()} min-h-screen p-4 md:p-8`}>
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className={`${getCardClasses()} rounded-3xl p-6 md:p-8 mb-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl blur-lg opacity-50 animate-pulse"></div>
                <div className="relative w-16 h-16 bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <GraduationCap className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className={`text-3xl font-bold ${getTextClass('primary')} flex items-center gap-2`}>
                  Teachers Room
                  <Sparkles className={`w-5 h-5 ${getTextClass('accent')}`} />
                </h1>
                <p className={`text-sm ${getTextClass('secondary')} mt-1`}>
                  Live conversation with your personal AI teacher
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Language Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                  disabled={isCallActive}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${
                    isDarkMode 
                      ? 'bg-white/10 hover:bg-white/20 border border-white/10' 
                      : 'bg-gray-100 hover:bg-gray-200 border border-gray-200'
                  } ${isCallActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-lg">
                    {TEACHER_LANGUAGES.find(l => l.code === selectedLanguage)?.flag}
                  </span>
                  <span className={`text-sm font-medium ${getTextClass('primary')}`}>
                    {TEACHER_LANGUAGES.find(l => l.code === selectedLanguage)?.name}
                  </span>
                </button>
                
                {/* Dropdown */}
                {showLanguageDropdown && !isCallActive && (
                  <div className={`absolute right-0 mt-2 w-48 rounded-xl shadow-2xl z-50 overflow-hidden ${
                    isDarkMode 
                      ? 'bg-gray-800 border border-gray-700' 
                      : 'bg-white border border-gray-200'
                  }`}>
                    {TEACHER_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setSelectedLanguage(lang.code);
                          setShowLanguageDropdown(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                          selectedLanguage === lang.code
                            ? isDarkMode
                              ? 'bg-purple-500/30 text-white'
                              : 'bg-indigo-100 text-indigo-900'
                            : isDarkMode
                            ? 'hover:bg-white/10 text-gray-200'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <span className="text-xl">{lang.flag}</span>
                        <span className="font-medium">{lang.name}</span>
                        {selectedLanguage === lang.code && (
                          <span className="ml-auto text-green-500">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Close Button */}
              <button
                onClick={onClose}
                className={`p-3 rounded-xl transition-all ${
                  isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Voice Area */}
          <div className="lg:col-span-2">
            <div className={`${getCardClasses()} rounded-3xl p-8 md:p-12`}>
              
              {/* Status Banner */}
              {isCallActive && (
                <div className={`mb-8 p-4 rounded-2xl ${
                  isDarkMode ? 'bg-green-500/20 border border-green-500/30' : 'bg-green-50 border border-green-200'
                }`}>
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className={`font-medium ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
                      Live Session Active - Your teacher is listening
                    </span>
                  </div>
                </div>
              )}
              
              {/* Voice Widget */}
              <VoiceConversationWidget
                onConversationStart={handleConversationStart}
                onConversationEnd={handleConversationEnd}
                onMessage={handleMessage}
                onError={handleError}
                className="w-full"
                language={selectedLanguage}
              />
              
              {/* Instructions */}
              <div className={`mt-8 p-6 rounded-2xl ${
                isDarkMode ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-indigo-50 border border-indigo-200'
              }`}>
                <h3 className={`font-semibold mb-3 flex items-center gap-2 ${getTextClass('primary')}`}>
                  <Lightbulb className="w-5 h-5" />
                  How it works
                </h3>
                <ul className={`space-y-2 ${getTextClass('secondary')} text-sm`}>
                  <li className="flex items-start gap-2">
                    <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Click the button to start a live conversation with your AI teacher</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Brain className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>Speak naturally - ask questions, discuss topics, or learn new concepts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <PhoneOff className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>End the call anytime by clicking the button again</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Conversation History */}
            <div className={`${getCardClasses()} rounded-3xl p-6`}>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className={`w-5 h-5 ${getTextClass('accent')}`} />
                <h3 className={`font-semibold ${getTextClass('primary')}`}>Conversation</h3>
              </div>
              
              {conversationHistory.length > 0 ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {conversationHistory.map((message, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-xl transition-all ${
                        message.isUser
                          ? isDarkMode
                            ? 'bg-violet-500/20 border border-violet-500/30 ml-4'
                            : 'bg-violet-100 border border-violet-200 ml-4'
                          : isDarkMode
                          ? 'bg-gray-700/30 border border-gray-600/30 mr-4'
                          : 'bg-gray-100 border border-gray-200 mr-4'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className={`text-sm flex-1 ${getTextClass('primary')}`}>
                          {message.isUser && <span className="font-semibold">You: </span>}
                          {!message.isUser && <span className="font-semibold">Teacher: </span>}
                          {message.text}
                        </p>
                        <span className={`text-xs ${getTextClass('secondary')} whitespace-nowrap`}>
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-12 ${getTextClass('secondary')}`}>
                  <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">
                    Start a conversation to see your chat history here
                  </p>
                </div>
              )}
            </div>
            
            {/* Learning Topics */}
            <div className={`${getCardClasses()} rounded-3xl p-6`}>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className={`w-5 h-5 ${getTextClass('accent')}`} />
                <h3 className={`font-semibold ${getTextClass('primary')}`}>Suggested Topics</h3>
              </div>
              <div className="space-y-2">
                {[
                  { icon: '🔬', topic: 'Science & Discovery' },
                  { icon: '📐', topic: 'Math & Logic' },
                  { icon: '📚', topic: 'Literature & Writing' },
                  { icon: '🌍', topic: 'History & Geography' },
                  { icon: '💡', topic: 'Problem Solving' }
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl transition-all cursor-pointer ${
                      isDarkMode
                        ? 'bg-white/5 hover:bg-white/10 border border-white/10'
                        : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <span className="text-sm">
                      <span className="mr-2">{item.icon}</span>
                      <span className={getTextClass('primary')}>{item.topic}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeachersRoom;
