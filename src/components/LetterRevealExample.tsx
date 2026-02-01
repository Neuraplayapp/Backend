import React, { useState } from 'react';
import LetterReveal from './LetterReveal';

const LetterRevealExample: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-20 p-8">
      {/* Basic letter reveal */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Basic Letter Reveal</h2>
        <LetterReveal 
          text="Hello World"
          className="text-4xl font-bold text-white"
        />
      </div>

      {/* Typewriter vs Non-typewriter */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Typewriter vs Non-typewriter</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-green-400 mb-2">Typewriter Effect (Default)</h3>
            <LetterReveal 
              text="Letters appear one by one"
              className="text-2xl font-bold text-green-400"
              typewriterEffect={true}
              cursorBlink={true}
            />
          </div>
          <div>
            <h3 className="text-lg font-bold text-blue-400 mb-2">Non-typewriter Effect</h3>
            <LetterReveal 
              text="All letters appear together"
              className="text-2xl font-bold text-blue-400"
              typewriterEffect={false}
              cursorBlink={false}
            />
          </div>
        </div>
      </div>

      {/* Different stagger speeds */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Different Stagger Speeds</h2>
        <div className="space-y-4">
          <LetterReveal 
            text="Fast Typewriter (0.05s)"
            className="text-2xl font-bold text-green-400"
            stagger={0.05}
            delay={0}
          />
          <LetterReveal 
            text="Normal Typewriter (0.1s)"
            className="text-2xl font-bold text-blue-400"
            stagger={0.1}
            delay={0.5}
          />
          <LetterReveal 
            text="Slow Typewriter (0.2s)"
            className="text-2xl font-bold text-purple-400"
            stagger={0.2}
            delay={1}
          />
        </div>
      </div>

      {/* Different durations */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Different Durations</h2>
        <div className="space-y-4">
          <LetterReveal 
            text="Fast Animation (0.3s)"
            className="text-2xl font-bold text-yellow-400"
            duration={0.3}
            delay={0}
          />
          <LetterReveal 
            text="Normal Animation (0.6s)"
            className="text-2xl font-bold text-orange-400"
            duration={0.6}
            delay={0.5}
          />
          <LetterReveal 
            text="Slow Animation (1.0s)"
            className="text-2xl font-bold text-red-400"
            duration={1.0}
            delay={1}
          />
        </div>
      </div>

      {/* Gradient text */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Gradient Text</h2>
        <LetterReveal 
          text="Beautiful Gradient Text"
          className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent"
          delay={0.5}
        />
      </div>

      {/* Scroll triggered */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Scroll Triggered</h2>
        <LetterReveal 
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
          Open Letter Modal
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-3xl p-8 max-w-2xl w-full border border-white/20 shadow-2xl">
            <div className="text-center space-y-6">
              <LetterReveal 
                text="✨ Letter Reveal Modal ✨"
                className="text-3xl font-bold text-white mb-4"
                delay={0.3}
                duration={0.8}
                stagger={0.08}
              />
              
              <LetterReveal 
                text="This text appears letter by letter"
                className="text-xl text-white/80 mb-4"
                delay={0.8}
                duration={0.6}
                stagger={0.06}
              />
              
              <LetterReveal 
                text="Perfect for typewriter effects"
                className="text-lg text-white/60 mb-6"
                delay={1.3}
                duration={0.5}
                stagger={0.05}
              />
              
              <div className="space-y-4">
                <LetterReveal 
                  text="🌟 True letter-by-letter reveal"
                  className="text-lg text-purple-300"
                  delay={1.8}
                  duration={0.4}
                  stagger={0.04}
                />
                
                <LetterReveal 
                  text="🎨 With rotation and bounce effects"
                  className="text-lg text-blue-300"
                  delay={2.1}
                  duration={0.4}
                  stagger={0.04}
                />
                
                <LetterReveal 
                  text="✨ Different from MagicLine"
                  className="text-lg text-pink-300"
                  delay={2.4}
                  duration={0.4}
                  stagger={0.04}
                />
              </div>
              
              <button 
                onClick={() => setShowModal(false)}
                className="mt-8 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300"
              >
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LetterRevealExample; 