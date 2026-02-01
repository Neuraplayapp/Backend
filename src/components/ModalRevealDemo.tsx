import React, { useState } from 'react';
import ModalReveal from './ModalReveal';
import { Sparkles, Star, Zap, Heart, Users, BookOpen } from 'lucide-react';

const ModalRevealDemo: React.FC = () => {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const modalConfigs = [
    {
      id: 'letter',
      title: 'Letter Reveal Animation',
      description: 'Each letter appears individually with typewriter effect',
      revealType: 'letter' as const,
      typewriterEffect: true,
      cursorBlink: true,
      stagger: 0.08,
      content: (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-purple-400" />
            <h3 className="text-xl font-bold text-white">Letter-by-Letter Magic</h3>
          </div>
          <p className="text-white/80 leading-relaxed">
            Watch as each character gracefully appears with a beautiful staggered animation. 
            This creates a mesmerizing typewriter effect that draws attention to your content.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-2">Features</h4>
              <ul className="text-white/70 text-sm space-y-1">
                <li>• Individual letter animation</li>
                <li>• Typewriter cursor effect</li>
                <li>• Smooth stagger timing</li>
                <li>• Bounce effect on completion</li>
              </ul>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-2">Use Cases</h4>
              <ul className="text-white/70 text-sm space-y-1">
                <li>• Welcome messages</li>
                <li>• Feature announcements</li>
                <li>• Interactive storytelling</li>
                <li>• Attention-grabbing titles</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'word',
      title: 'Word Reveal Animation',
      description: 'Words appear one by one with smooth transitions',
      revealType: 'word' as const,
      typewriterEffect: false,
      cursorBlink: false,
      stagger: 0.15,
      content: (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <Star className="w-8 h-8 text-yellow-400" />
            <h3 className="text-xl font-bold text-white">Word-by-Word Elegance</h3>
          </div>
          <p className="text-white/80 leading-relaxed">
            Experience the smooth flow of words appearing in sequence. 
            This creates a natural reading rhythm that guides the user's attention.
          </p>
          <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg p-6 border border-white/20">
            <h4 className="font-semibold text-white mb-3">Animation Benefits</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="text-purple-300 font-medium mb-2">Reading Flow</h5>
                <p className="text-white/70 text-sm">Natural progression that matches reading patterns</p>
              </div>
              <div>
                <h5 className="text-blue-300 font-medium mb-2">Visual Hierarchy</h5>
                <p className="text-white/70 text-sm">Emphasizes important words and phrases</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'line',
      title: 'Line Reveal Animation',
      description: 'Entire text appears with blur-to-clear effect',
      revealType: 'line' as const,
      typewriterEffect: false,
      cursorBlink: false,
      stagger: 0.1,
      blurAmount: 20,
      content: (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-8 h-8 text-blue-400" />
            <h3 className="text-xl font-bold text-white">Line Magic Effect</h3>
          </div>
          <p className="text-white/80 leading-relaxed">
            Watch as the entire text transforms from blurred to crystal clear. 
            This creates a dramatic reveal that's perfect for important announcements.
          </p>
          <div className="space-y-4">
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="font-semibold text-white mb-2">Effect Stages</h4>
              <div className="space-y-2 text-sm text-white/70">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span>Initial blur state</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>Gradual clarity</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Glow effect</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span>Final clear state</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'fade',
      title: 'Fade Reveal Animation',
      description: 'Simple and elegant fade-in effect',
      revealType: 'fade' as const,
      typewriterEffect: false,
      cursorBlink: false,
      stagger: 0.05,
      content: (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <Heart className="w-8 h-8 text-pink-400" />
            <h3 className="text-xl font-bold text-white">Elegant Fade</h3>
          </div>
          <p className="text-white/80 leading-relaxed">
            A clean and professional fade-in animation that's perfect for any content. 
            Simple yet effective for maintaining focus on your message.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-lg p-4 text-center">
              <Users className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <h5 className="font-medium text-white text-sm">Professional</h5>
              <p className="text-white/60 text-xs">Clean and business-ready</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4 text-center">
              <BookOpen className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <h5 className="font-medium text-white text-sm">Accessible</h5>
              <p className="text-white/60 text-xs">Works for all users</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4 text-center">
              <Star className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <h5 className="font-medium text-white text-sm">Reliable</h5>
              <p className="text-white/60 text-xs">Consistent performance</p>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Modal Reveal Demo
          </h1>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            Explore different animation types for modal reveals. Each button demonstrates a unique animation style.
          </p>
        </div>

        {/* Demo Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {modalConfigs.map((config) => (
            <div
              key={config.id}
              className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:bg-white/20 transition-all duration-300 cursor-pointer"
              onClick={() => setActiveModal(config.id)}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {config.id.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{config.title}</h3>
                  <p className="text-white/60 text-sm">{config.description}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Type:</span>
                  <span className="text-white font-medium">{config.revealType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Stagger:</span>
                  <span className="text-white font-medium">{config.stagger}s</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Typewriter:</span>
                  <span className="text-white font-medium">{config.typewriterEffect ? 'Yes' : 'No'}</span>
                </div>
              </div>

              <button
                className="w-full mt-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all duration-300"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveModal(config.id);
                }}
              >
                Try {config.title}
              </button>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="mt-12 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">How to Use</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-white mb-2">Basic Usage</h4>
              <pre className="bg-black/30 rounded-lg p-3 text-sm text-green-400 overflow-x-auto">
{`<ModalReveal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Your Title"
  revealType="letter"
>
  <p>Your content here</p>
</ModalReveal>`}
              </pre>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Advanced Props</h4>
              <ul className="text-white/70 text-sm space-y-1">
                <li>• <code className="bg-black/30 px-1 rounded">revealType</code>: letter, word, line, fade</li>
                <li>• <code className="bg-black/30 px-1 rounded">stagger</code>: Animation delay between elements</li>
                <li>• <code className="bg-black/30 px-1 rounded">duration</code>: Total animation duration</li>
                <li>• <code className="bg-black/30 px-1 rounded">blurAmount</code>: Initial blur intensity</li>
                <li>• <code className="bg-black/30 px-1 rounded">typewriterEffect</code>: Enable cursor effect</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Render Modals */}
      {modalConfigs.map((config) => (
        <ModalReveal
          key={config.id}
          isOpen={activeModal === config.id}
          onClose={() => setActiveModal(null)}
          title={config.title}
          revealType={config.revealType}
          typewriterEffect={config.typewriterEffect}
          cursorBlink={config.cursorBlink}
          stagger={config.stagger}
          blurAmount={config.blurAmount || 15}
          duration={1.2}
          delay={0.3}
        >
          {config.content}
        </ModalReveal>
      ))}
    </div>
  );
};

export default ModalRevealDemo; 