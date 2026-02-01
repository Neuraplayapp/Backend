import React, { useState } from 'react';
import { Bot, MessageCircle, Globe, Sparkles } from 'lucide-react';
import AITeachingAssistantModal from './AITeachingAssistantModal';

const AITeachingAssistantCard: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className="group relative bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 rounded-2xl p-6 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 overflow-hidden"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 via-blue-400/20 to-indigo-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        {/* Floating Elements */}
        <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-40 transition-opacity duration-300">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">AI Teaching Assistant</h3>
                <p className="text-white/80 text-sm">Multilingual Learning Support</p>
              </div>
            </div>
            
            {/* Language Indicator */}
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2">
              <Globe className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-medium">EN/RU/AR</span>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span className="text-white/90 text-sm">Conversation Mode</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span className="text-white/90 text-sm">Voice Recognition</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span className="text-white/90 text-sm">Text-to-Speech</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span className="text-white/90 text-sm">Multilingual Support</span>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/80 text-sm">
              <MessageCircle className="w-4 h-4" />
              <span>Start Conversation</span>
            </div>
            
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        {/* Hover Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
      </div>

      {/* Modal */}
      <AITeachingAssistantModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};

export default AITeachingAssistantCard; 