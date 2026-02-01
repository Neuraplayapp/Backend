import React from 'react';
import { useTranslation } from 'react-i18next';
import GlobalLanguageButton from './GlobalLanguageButton';

/**
 * Showcase component showing all GlobalLanguageButton styles and placements
 * Add this temporarily to any page to see all options
 */
const LanguageButtonShowcase: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            🌍 Global Language Button Showcase
          </h1>
          <p className="text-xl text-gray-300">
            Choose your favorite style for the homepage!
          </p>
        </div>

        {/* Style Options Grid */}
        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          
          {/* 1. Floating Style */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center">
              ✨ Floating Style (Recommended)
            </h3>
            <p className="text-gray-300 mb-6">
              Modern glass-morphism design with glow effects. Always visible, doesn't interfere with content.
            </p>
            <div className="flex justify-center">
              <GlobalLanguageButton 
                style="floating"
                position="inline"
                showLabel={true}
              />
            </div>
          </div>

          {/* 2. Hero Style */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center">
              🦸 Hero Style
            </h3>
            <p className="text-gray-300 mb-6">
              Bold, prominent design for hero sections. Large and eye-catching.
            </p>
            <div className="flex justify-center">
              <GlobalLanguageButton 
                style="hero"
                position="inline"
                showLabel={true}
              />
            </div>
          </div>

          {/* 3. Header Style */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center">
              📋 Header Style
            </h3>
            <p className="text-gray-300 mb-6">
              Clean, minimal design perfect for navigation bars and headers.
            </p>
            <div className="flex justify-center">
              <GlobalLanguageButton 
                style="header"
                position="inline"
                showLabel={true}
              />
            </div>
          </div>

          {/* 4. Compact Style */}
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center">
              📦 Compact Style
            </h3>
            <p className="text-gray-300 mb-6">
              Small, space-saving design. Perfect for tight spaces or mobile.
            </p>
            <div className="flex justify-center">
              <GlobalLanguageButton 
                style="compact"
                position="inline"
                showLabel={true}
              />
            </div>
          </div>
        </div>

        {/* Placement Options */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 mb-12">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            📍 Placement Options
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-xl font-semibold text-white mb-4">Fixed Positions:</h4>
              <ul className="space-y-2 text-gray-300">
                <li>• <code className="bg-purple-900/50 px-2 py-1 rounded">top-right</code> - Floating top-right (recommended)</li>
                <li>• <code className="bg-purple-900/50 px-2 py-1 rounded">top-left</code> - Floating top-left</li>
                <li>• <code className="bg-purple-900/50 px-2 py-1 rounded">bottom-right</code> - Floating bottom-right</li>
                <li>• <code className="bg-purple-900/50 px-2 py-1 rounded">bottom-left</code> - Floating bottom-left</li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-xl font-semibold text-white mb-4">Inline Positions:</h4>
              <ul className="space-y-2 text-gray-300">
                <li>• <code className="bg-purple-900/50 px-2 py-1 rounded">inline</code> - Within component flow</li>
                <li>• Perfect for headers, hero sections</li>
                <li>• Responsive and accessible</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Language Coverage */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            🗣️ Supported Languages
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-purple-900/30 rounded-xl">
              <div className="text-3xl mb-2">🇺🇸</div>
              <div className="text-white font-medium">English</div>
            </div>
            <div className="text-center p-4 bg-purple-900/30 rounded-xl">
              <div className="text-3xl mb-2">🇪🇸</div>
              <div className="text-white font-medium">Español</div>
            </div>
            <div className="text-center p-4 bg-purple-900/30 rounded-xl">
              <div className="text-3xl mb-2">🇫🇷</div>
              <div className="text-white font-medium">Français</div>
            </div>
            <div className="text-center p-4 bg-purple-900/30 rounded-xl">
              <div className="text-3xl mb-2">🇩🇪</div>
              <div className="text-white font-medium">Deutsch</div>
            </div>
            <div className="text-center p-4 bg-purple-900/30 rounded-xl">
              <div className="text-3xl mb-2">🇸🇪</div>
              <div className="text-white font-medium">Svenska</div>
            </div>
            <div className="text-center p-4 bg-purple-900/30 rounded-xl">
              <div className="text-3xl mb-2">🇸🇦</div>
              <div className="text-white font-medium">العربية</div>
            </div>
            <div className="text-center p-4 bg-purple-900/30 rounded-xl">
              <div className="text-3xl mb-2">🇷🇺</div>
              <div className="text-white font-medium">Русский</div>
            </div>
            <div className="text-center p-4 bg-purple-900/30 rounded-xl">
              <div className="text-3xl mb-2">🇰🇿</div>
              <div className="text-white font-medium">Қазақша</div>
            </div>
          </div>
        </div>

        {/* Usage Examples */}
        <div className="mt-12 bg-gray-900/50 backdrop-blur-md rounded-3xl p-8 border border-gray-700/50">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            💻 Usage Examples
          </h2>
          
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-purple-300 mb-2">Floating Top-Right (Current):</h4>
              <pre className="bg-black/50 p-4 rounded-lg text-green-400 text-sm overflow-x-auto">
{`<GlobalLanguageButton 
  style="floating"
  position="top-right"
  showLabel={true}
/>`}
              </pre>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-purple-300 mb-2">In Header Component:</h4>
              <pre className="bg-black/50 p-4 rounded-lg text-green-400 text-sm overflow-x-auto">
{`<GlobalLanguageButton 
  style="header"
  position="inline"
  showLabel={false}
/>`}
              </pre>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-purple-300 mb-2">Hero Section:</h4>
              <pre className="bg-black/50 p-4 rounded-lg text-green-400 text-sm overflow-x-auto">
{`<GlobalLanguageButton 
  style="hero"
  position="inline"
  showLabel={true}
/>`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LanguageButtonShowcase;

