import React, { useState } from 'react';
import EnhancedTextReveal from './EnhancedTextReveal';

interface EnhancedTextRevealModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  text?: string;
}

const EnhancedTextRevealModal: React.FC<EnhancedTextRevealModalProps> = ({
  isOpen,
  onClose,
  title = "Enhanced Text Reveal",
  text = "Welcome to Neuraplay v5"
}) => {
  const [customText, setCustomText] = useState(text);
  const [stagger, setStagger] = useState(0.05);
  const [duration, setDuration] = useState(1.2);
  const [blurAmount, setBlurAmount] = useState(15);
  const [autoStart, setAutoStart] = useState(true);
  const [fontSize, setFontSize] = useState('text-4xl');

  if (!isOpen) return null;

  const fontSizeOptions = [
    { value: 'text-2xl', label: 'Small' },
    { value: 'text-3xl', label: 'Medium' },
    { value: 'text-4xl', label: 'Large' },
    { value: 'text-5xl', label: 'Extra Large' },
    { value: 'text-6xl', label: 'Huge' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Text Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Text to Reveal
              </label>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white resize-none"
                rows={3}
                placeholder="Enter text to reveal..."
              />
            </div>

            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Font Size
              </label>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
              >
                {fontSizeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Stagger */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Stagger Delay: {stagger}s
              </label>
              <input
                type="range"
                min="0.01"
                max="0.2"
                step="0.01"
                value={stagger}
                onChange={(e) => setStagger(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Animation Duration: {duration}s
              </label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={duration}
                onChange={(e) => setDuration(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Blur Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Blur Amount: {blurAmount}px
              </label>
              <input
                type="range"
                min="5"
                max="30"
                step="1"
                value={blurAmount}
                onChange={(e) => setBlurAmount(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Auto Start */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoStart"
                checked={autoStart}
                onChange={(e) => setAutoStart(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="autoStart" className="ml-2 text-sm font-medium text-gray-300">
                Auto Start Animation
              </label>
            </div>
          </div>

          {/* Preview Area */}
          <div className="bg-gray-800 rounded-lg p-8 min-h-[200px] flex items-center justify-center">
            <div className="text-center">
              <EnhancedTextReveal
                text={customText}
                className={`${fontSize} font-bold text-white`}
                stagger={stagger}
                duration={duration}
                blurAmount={blurAmount}
                autoStart={autoStart}
                delay={autoStart ? 0.5 : 0}
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-900 bg-opacity-20 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-300 mb-2">How it works:</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Each character starts blurred and invisible</li>
              <li>• Characters reveal one by one with a stagger effect</li>
              <li>• Blur gradually clears as characters appear</li>
              <li>• Subtle glow effect adds emphasis</li>
              <li>• Final bounce effect completes the animation</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedTextRevealModal; 