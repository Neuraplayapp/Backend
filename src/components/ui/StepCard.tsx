import React from 'react';
import { CheckCircle } from 'lucide-react';
import { StepCardProps } from '../../types/component.types';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Reusable step card component
 */
const StepCard: React.FC<StepCardProps> = ({ step }) => {
  const { isDarkMode } = useTheme();

  return (
    <div
      className={`group p-8 lg:p-10 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.03] hover:-translate-y-2 will-change-transform ${
        isDarkMode
          ? 'bg-gradient-to-br from-purple-900/40 to-purple-950/40 backdrop-blur-xl border border-purple-400/20 hover:border-purple-400/40'
          : 'bg-white/95 backdrop-blur-xl border border-purple-200/50 hover:border-purple-400/60'
      }`}
    >
      {/* Number Badge */}
      <div className="flex justify-center mb-8">
        <div className="relative">
          <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-3xl lg:text-4xl font-bold shadow-xl group-hover:shadow-2xl group-hover:shadow-purple-500/50 transition-all duration-500 group-hover:scale-110">
            {step.number}
          </div>
          {/* Glow effect */}
          <div className="absolute inset-0 rounded-full bg-purple-500/30 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        </div>
      </div>

      {/* Title */}
      <h3 className={`text-2xl lg:text-2xl font-bold mb-4 text-center ${isDarkMode ? 'text-purple-50' : 'text-gray-900'}`}>
        {step.title}
      </h3>

      {/* Description */}
      <p className={`mb-6 text-center text-base lg:text-lg leading-relaxed ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>
        {step.description}
      </p>

      {/* Bullet Points */}
      <div className="space-y-3">
        {step.points.map((point, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className={`p-1 rounded-full mt-0.5 ${isDarkMode ? 'bg-green-500/20' : 'bg-green-100'}`}>
              <CheckCircle className={`w-5 h-5 flex-shrink-0 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            <span className={`text-sm lg:text-base ${isDarkMode ? 'text-white/80' : 'text-gray-700'}`}>{point}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StepCard;

