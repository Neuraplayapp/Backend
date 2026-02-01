import React from 'react';
// import StreamingConversationAssistant from '../components/legacy/StreamingConversationAssistant';

const StreamingDemoPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            🚀 Streaming Conversation Demo
          </h1>
          <p className="text-xl text-gray-300 mb-6">
            Test the complete streaming flow: Speech → LLM → TTS
          </p>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 max-w-2xl mx-auto">
            <h2 className="text-2xl font-semibold text-white mb-4">
              How it works:
            </h2>
            <div className="text-left space-y-3 text-gray-300">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">1</span>
                <span><strong>User Input:</strong> Speak or type your message</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">2</span>
                <span><strong>AssemblyAI:</strong> Converts speech to text (if voice input)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">3</span>
                <span><strong>LLM API:</strong> Processes your message and generates response</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">4</span>
                <span><strong>ElevenLabs:</strong> Converts response to speech</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">5</span>
                <span><strong>Audio Output:</strong> Plays the response</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-gray-400 mb-4">
            Click the AI assistant button in the bottom right to start the conversation!
          </p>
          <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-yellow-300 text-sm">
              💡 <strong>Tip:</strong> Try both voice and text input to test the complete pipeline!
            </p>
          </div>
        </div>
      </div>

      {/* The streaming conversation assistant */}
      {/* <StreamingConversationAssistant /> */}
    </div>
  );
};

export default StreamingDemoPage; 