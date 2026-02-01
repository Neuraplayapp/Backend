import React from 'react';
import { SafetyFeatureCardProps } from '../../types/component.types';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Reusable safety feature card component
 */
const SafetyFeatureCard: React.FC<SafetyFeatureCardProps> = ({ icon: Icon, title, description }) => {
  const { isDarkMode } = useTheme();

  return (
    <div
      className={`p-6 sm:p-7 rounded-2xl transition-all duration-300 hover:-translate-y-1 ${
        isDarkMode
          ? 'bg-purple-950/40 backdrop-blur-xl border border-purple-500/20 hover:border-purple-400/40'
          : 'bg-white/70 backdrop-blur-xl border border-purple-200/50 hover:border-purple-300/70 shadow-lg hover:shadow-xl'
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`p-2.5 rounded-xl flex-shrink-0 ${
            isDarkMode ? 'bg-green-500/15 border border-green-400/30' : 'bg-green-100 border border-green-200'
          }`}
        >
          <Icon className={`w-5 h-5 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
        </div>
        <div>
          <h3 className={`text-base font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
          <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SafetyFeatureCard;

