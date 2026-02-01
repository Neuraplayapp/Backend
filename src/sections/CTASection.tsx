import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Tablet, Trophy, Shield, Clock, ArrowRight } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface CTASectionProps {
  onLoginClick: () => void;
}

const CTASection: React.FC<CTASectionProps> = ({ onLoginClick }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  return (
    <section
      className={`py-8 sm:py-12 relative overflow-hidden ${
        isDarkMode ? 'bg-[#0f0f1a]' : 'bg-gray-50'
      }`}
    >
      <div className="relative z-12 max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main CTA Card */}
        <div className="relative py-6 px-6 sm:px-10 rounded-3xl bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600 shadow-2xl">
          
          {/* Content */}
          <div className="text-center space-y-5">
  
            {/* Title */}
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight text-white tracking-tight">
              {t('parentHome.cta.title')}
            </h2>
  
            {/* Subtitle */}
            <p className="text-sm sm:text-base max-w-xl mx-auto text-white/90 leading-relaxed">
              {t('parentHome.cta.subtitle')}
            </p>
  
            {/* Coming Soon Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
              <Smartphone className="w-4 h-4 text-white" />
              <span className="text-xs font-medium text-white">
                {t('parentHome.cta.comingSoon')}
              </span>
              <Tablet className="w-4 h-4 text-white" />
            </div>
  
            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
  
              {/* Login Button */}
              <button
                onClick={onLoginClick}
                className="group px-5 py-2.5 rounded-full font-semibold transition-all duration-300 min-w-[130px] bg-white text-purple-600 hover:bg-white/90 shadow-lg"
              >
                <span className="flex items-center justify-center gap-2">
                  {t('navigation.login')}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>
  
              {/* Learn More Button */}
              <button
                onClick={() => navigate('/about')}
                className="group px-5 py-2.5 rounded-full font-semibold transition-all duration-300 min-w-[130px] bg-white/10 backdrop-blur-sm border border-white/30 text-white hover:bg-white/20 shadow-lg"
              >
                <span className="flex items-center justify-center gap-2">
                  {t('parentHome.hero.learnMore')}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>
  
            </div>
  
            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-4 pt-4 mt-4 border-t border-white/20">
  
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-300" />
                <span className="text-xs font-medium text-white/90">
                  {t('parentHome.cta.noCard')}
                </span>
              </div>
  
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-300" />
                <span className="text-xs font-medium text-white/90">
                  {t('parentHome.cta.safe')}
                </span>
              </div>
  
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-300" />
                <span className="text-xs font-medium text-white/90">
                  {t('parentHome.cta.cancel')}
                </span>
              </div>
  
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};  

export default CTASection;