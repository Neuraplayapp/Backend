import React from 'react';
import { CheckCircle } from 'lucide-react';
import { FeatureCardProps } from '../../types/component.types';
import { useTheme } from '../../contexts/ThemeContext';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';

/**
 * Reusable feature card component
 */
const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description, benefits }) => {
  const { isDarkMode } = useTheme();
  const { ref, isVisible } = useScrollAnimation();

  return (
    <div
      ref={ref}
      className={`p-6 sm:p-8 rounded-2xl transition-all duration-500 hover:-translate-y-1 ${
        isDarkMode
          ? 'bg-purple-950/40 backdrop-blur-xl border border-purple-500/20 hover:border-purple-400/40'
          : 'bg-white/70 backdrop-blur-xl border border-purple-200/50 hover:border-purple-300/70 shadow-lg hover:shadow-xl'
      } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ transition: 'all 0.5s ease-out' }}
    >
      <div className="flex items-center gap-4 mb-5">
        <div
          className={`p-3 rounded-xl ${
            isDarkMode ? 'bg-purple-500/20 border border-purple-400/30' : 'bg-purple-100 border border-purple-200'
          }`}
        >
          <Icon className={`w-6 h-6 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
        </div>
        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
      </div>
      <p className={`mb-5 leading-relaxed text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        {description}
      </p>
      <div className="space-y-2.5">
        {benefits.map((benefit, index) => (
          <div key={index} className="flex items-start gap-3">
            <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{benefit}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeatureCard;

