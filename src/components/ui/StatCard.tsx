import React from 'react';
import { StatCardProps } from '../../types/component.types';
import { useTheme } from '../../contexts/ThemeContext';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';

/**
 * Reusable stat card component
 */
const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, description }) => {
  const { isDarkMode } = useTheme();
  const { ref, isVisible } = useScrollAnimation();

  return (
    <div
      ref={ref}
      className={`p-10 lg:p-12 text-center rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-700 hover:scale-[1.02] hover:-translate-y-1 will-change-transform ${
        isDarkMode
          ? 'bg-purple-950/30 backdrop-blur-md border-2 border-purple-300/20 shadow-lg shadow-purple-500/10 hover:shadow-xl hover:shadow-purple-500/20'
          : 'bg-white/90 backdrop-blur-md border-2 border-purple-200/30 shadow-lg hover:shadow-xl'
      } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      style={{ transform: 'translateZ(0)', transition: 'all 0.7s ease-out' }}
    >
      <div className="flex justify-center mb-8">
        <div
          className={`p-5 rounded-full border ${
            isDarkMode ? 'bg-purple-500/40 border-purple-400/60' : 'bg-purple-200 border-purple-400'
          }`}
        >
          <Icon className={`w-12 h-12 ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`} />
        </div>
      </div>
      <h3 className={`text-4xl lg:text-5xl font-bold mb-5 ${isDarkMode ? 'text-purple-50' : 'text-gray-900'}`}>
        {value}
      </h3>
      <p className={`text-xl lg:text-2xl font-semibold mb-4 ${isDarkMode ? 'text-purple-100/90' : 'text-gray-800'}`}>
        {title}
      </p>
      <p className={`text-base lg:text-lg ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>{description}</p>
    </div>
  );
};

export default StatCard;

