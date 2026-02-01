import React, { useState } from 'react';
import EnhancedTextReveal from './EnhancedTextReveal';
import EnhancedTextRevealModal from './EnhancedTextRevealModal';

const EnhancedTextRevealExample: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const examples = [
    {
      text: "Welcome to Neuraplay v5",
      className: "text-5xl font-bold text-white",
      stagger: 0.05,
      duration: 1.2,
      blurAmount: 15
    },
    {
      text: "Enhanced Text Reveal",
      className: "text-4xl font-bold text-blue-400",
      stagger: 0.08,
      duration: 1.5,
      blurAmount: 20
    },
    {
      text: "Character by Character",
      className: "text-3xl font-bold text-green-400",
      stagger: 0.03,
      duration: 1.0,
      blurAmount: 12
    },
    {
      text: "Blur to Clear",
      className: "text-6xl font-bold text-purple-400",
      stagger: 0.1,
      duration: 2.0,
      blurAmount: 25
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Enhanced Text Reveal
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Advanced text animation with blur effects and character-by-character reveal
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors duration-200"
          >
            Open Customizer
          </button>
        </div>

        {/* Examples Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {examples.map((example, index) => (
            <div
              key={index}
              className="bg-gray-800 bg-opacity-50 rounded-lg p-8 text-center border border-gray-700"
            >
              <h3 className="text-lg font-semibold text-gray-300 mb-4">
                Example {index + 1}
              </h3>
              <div className="min-h-[120px] flex items-center justify-center">
                <EnhancedTextReveal
                  text={example.text}
                  className={example.className}
                  stagger={example.stagger}
                  duration={example.duration}
                  blurAmount={example.blurAmount}
                  delay={index * 0.5}
                />
              </div>
              <div className="mt-4 text-sm text-gray-400">
                <p>Stagger: {example.stagger}s</p>
                <p>Duration: {example.duration}s</p>
                <p>Blur: {example.blurAmount}px</p>
              </div>
            </div>
          ))}
        </div>

        {/* Features Section */}
        <div className="bg-gray-800 bg-opacity-30 rounded-lg p-8 mb-8">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            Key Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔤</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Character-by-Character
              </h3>
              <p className="text-gray-300">
                Each character reveals individually with customizable stagger timing
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👁️</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Blur to Clear
              </h3>
              <p className="text-gray-300">
                Text starts blurred and gradually becomes clear as it appears
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✨</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Glow Effects
              </h3>
              <p className="text-gray-300">
                Subtle glow and emphasis effects enhance the reveal animation
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Demo */}
        <div className="bg-gray-800 bg-opacity-30 rounded-lg p-8">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            Interactive Demo
          </h2>
          <div className="text-center">
            <EnhancedTextReveal
              text="Try the Customizer Above!"
              className="text-4xl font-bold text-yellow-400"
              stagger={0.06}
              duration={1.5}
              blurAmount={18}
              autoStart={false}
            />
          </div>
          <div className="text-center mt-8">
            <p className="text-gray-300 mb-4">
              Click the "Open Customizer" button to experiment with different settings
            </p>
          </div>
        </div>
      </div>

      {/* Modal */}
      <EnhancedTextRevealModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Enhanced Text Reveal Customizer"
        text="Customize your text reveal animation"
      />
    </div>
  );
};

export default EnhancedTextRevealExample; 