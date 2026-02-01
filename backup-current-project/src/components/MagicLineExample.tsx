import React, { useState } from 'react';
import MagicLine from './MagicLine';

const MagicLineExample: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-20 p-8">
      {/* Basic magic line */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Basic Magic Line</h2>
        <MagicLine 
          text="Hello World"
          className="text-4xl font-bold text-white"
        />
      </div>

      {/* Different blur amounts */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Different Blur Amounts</h2>
        <div className="space-y-4">
          <MagicLine 
            text="Light Blur (8px)"
            className="text-2xl font-bold text-green-400"
            blurAmount={8}
            delay={0}
          />
          <MagicLine 
            text="Medium Blur (15px)"
            className="text-2xl font-bold text-blue-400"
            blurAmount={15}
            delay={0.5}
          />
          <MagicLine 
            text="Heavy Blur (25px)"
            className="text-2xl font-bold text-purple-400"
            blurAmount={25}
            delay={1}
          />
        </div>
      </div>

      {/* Different durations */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Different Durations</h2>
        <div className="space-y-4">
          <MagicLine 
            text="Fast Reveal (0.8s)"
            className="text-2xl font-bold text-yellow-400"
            duration={0.8}
            delay={0}
          />
          <MagicLine 
            text="Normal Reveal (1.2s)"
            className="text-2xl font-bold text-orange-400"
            duration={1.2}
            delay={0.5}
          />
          <MagicLine 
            text="Slow Reveal (2.0s)"
            className="text-2xl font-bold text-red-400"
            duration={2.0}
            delay={1}
          />
        </div>
      </div>

      {/* Gradient text */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Gradient Text</h2>
        <MagicLine 
          text="Beautiful Gradient Text"
          className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent"
          delay={0.5}
        />
      </div>

      {/* Scroll triggered */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Scroll Triggered</h2>
        <MagicLine 
          text="Scroll to reveal this text"
          className="text-3xl font-bold text-cyan-400"
          triggerOnScroll={true}
          delay={0}
        />
      </div>

      {/* Modal demo */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Modal Demo</h2>
        <button 
          onClick={() => setShowModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300"
        >
          Open Magic Modal
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-3xl p-8 max-w-2xl w-full border border-white/20 shadow-2xl">
            <div className="text-center space-y-6">
              <MagicLine 
                text="✨ Magic Line Modal ✨"
                className="text-3xl font-bold text-white mb-4"
                delay={0.3}
                duration={1.5}
                blurAmount={15}
              />
              
              <MagicLine 
                text="This text appears with a soft blur transition"
                className="text-xl text-white/80 mb-4"
                delay={0.8}
                duration={1.2}
                blurAmount={12}
              />
              
              <MagicLine 
                text="Perfect for modals and overlays"
                className="text-lg text-white/60 mb-6"
                delay={1.3}
                duration={1.0}
                blurAmount={10}
              />
              
              <div className="space-y-4">
                <MagicLine 
                  text="🌟 Soft and elegant"
                  className="text-lg text-purple-300"
                  delay={1.8}
                  duration={0.8}
                  blurAmount={8}
                />
                
                <MagicLine 
                  text="🎨 Beautiful transitions"
                  className="text-lg text-blue-300"
                  delay={2.1}
                  duration={0.8}
                  blurAmount={8}
                />
                
                <MagicLine 
                  text="✨ Magical effects"
                  className="text-lg text-pink-300"
                  delay={2.4}
                  duration={0.8}
                  blurAmount={8}
                />
              </div>
              
              <button 
                onClick={() => setShowModal(false)}
                className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300"
              >
                Close Magic
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MagicLineExample; 