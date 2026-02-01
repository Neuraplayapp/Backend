import React from 'react';
import ModalReveal from './ModalReveal';
import { useTheme } from '../contexts/ThemeContext';
import { Crown, Users, Star, Zap, Brain, Trophy, Gift, ArrowRight } from 'lucide-react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface SignUpChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPremiumSignUp: () => void;
  onRegularSignUp: () => void;
  onShowLogin?: () => void;
}

const SignUpChoiceModal: React.FC<SignUpChoiceModalProps> = ({
  isOpen,
  onClose,
  onPremiumSignUp,
  onRegularSignUp,
  onShowLogin
}) => {
  const { isDarkMode } = useTheme();

  const premiumFeatures = [
    { icon: <Brain className="w-6 h-6 text-purple-400" />, title: "AI-Powered Learning", description: "Personalized cognitive development plans" },
    { icon: <Trophy className="w-6 h-6 text-yellow-400" />, title: "Advanced Games", description: "Access to premium cognitive training games" },
    { icon: <Zap className="w-6 h-6 text-blue-400" />, title: "Real-time Analytics", description: "Detailed progress tracking and insights" },
    { icon: <Star className="w-6 h-6 text-pink-400" />, title: "Expert Support", description: "Direct access to child development experts" }
  ];

  return (
    <ModalReveal
      isOpen={isOpen}
      onClose={onClose}
      title="Choose Your Journey"
      revealType="letter"
      typewriterEffect
      cursorBlink
      stagger={0.08}
      duration={1.2}
      delay={0.3}
    >
      <div className="space-y-3 sm:space-y-4 md:space-y-6 max-h-[75vh] overflow-y-auto">
        {/* Header with mascot */}
        <div className="text-center mb-3 sm:mb-4 md:mb-6">
          <div className="flex items-center justify-center mb-2 sm:mb-3 md:mb-4">
            <img
              src="/assets/images/Mascot.png"
              alt="NeuraPlay Mascot"
              className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 object-contain"
            />
          </div>
          <h2 className={`text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Welcome to NeuraPlay
          </h2>
          <p className={`text-xs sm:text-sm md:text-base ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>
            Choose your path to unlock your child's potential
          </p>
        </div>

        {/* Premium Options */}
        <div className="space-y-2 sm:space-y-3 md:space-y-4">
          {/* Monthly Premium */}
          <div className="bg-gradient-to-r from-indigo-500/10 to-violet-500/10 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 border border-indigo-300/20">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 md:mb-4">
              <Crown className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-yellow-400 flex-shrink-0" />
              <div>
                <h3 className={`text-base sm:text-lg md:text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Premium Journey - Monthly
                </h3>
                <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>
                  Full access to all features and personalized learning
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-6">
              {premiumFeatures.map((feature, index) => (
                <div key={index} className="flex items-start gap-1.5 sm:gap-2">
                  <div className="flex-shrink-0 mt-0.5">{feature.icon}</div>
                  <div>
                    <div className={`font-medium text-xs sm:text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{feature.title}</div>
                    <div className={`text-[10px] sm:text-xs leading-tight ${isDarkMode ? 'text-white/60' : 'text-gray-600'}`}>
                      {feature.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-2 sm:p-2.5 md:p-3 border border-yellow-400/30 mb-2 sm:mb-3 md:mb-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Gift className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />
                <span className={`font-semibold text-xs sm:text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  7-Day Free Trial
                </span>
              </div>
              <p className={`text-[10px] sm:text-xs mt-0.5 sm:mt-1 ${isDarkMode ? 'text-white/80' : 'text-gray-600'}`}>
                Start free, cancel anytime
              </p>
            </div>

            <button
              onClick={onPremiumSignUp}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg hover:from-violet-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg text-xs sm:text-sm md:text-base flex items-center justify-center gap-1.5 sm:gap-2"
            >
              Begin Monthly Premium <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Yearly Premium */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 border border-emerald-300/20 relative">
            <div className="absolute -top-1.5 sm:-top-2 -right-1.5 sm:-right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
              20% OFF
            </div>
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 md:mb-4">
              <Crown className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-emerald-400 flex-shrink-0" />
              <div>
                <h3 className={`text-base sm:text-lg md:text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Premium Journey - Yearly
                </h3>
                <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>
                  Full access to all features and personalized learning
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4 md:mb-6">
              {premiumFeatures.map((feature, index) => (
                <div key={index} className="flex items-start gap-1.5 sm:gap-2">
                  <div className="flex-shrink-0 mt-0.5">{feature.icon}</div>
                  <div>
                    <div className={`font-medium text-xs sm:text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{feature.title}</div>
                    <div className={`text-[10px] sm:text-xs leading-tight ${isDarkMode ? 'text-white/60' : 'text-gray-600'}`}>
                      {feature.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-lg p-2 sm:p-2.5 md:p-3 border border-emerald-400/30 mb-2 sm:mb-3 md:mb-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Gift className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400" />
                <span className="text-theme-primary font-semibold text-xs sm:text-sm">7-Day Free Trial + 20% Discount</span>
              </div>
              <p className="text-theme-secondary text-[10px] sm:text-xs mt-0.5 sm:mt-1">Best value - Save 20% with yearly plan</p>
            </div>

            <button
              onClick={onPremiumSignUp}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all duration-300 transform hover:scale-105 shadow-lg text-xs sm:text-sm md:text-base flex items-center justify-center gap-1.5 sm:gap-2"
            >
              Begin Yearly Premium <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Regular Option */}
        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 border border-blue-300/20">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 md:mb-4">
            <Users className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-blue-400 flex-shrink-0" />
            <div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-theme-primary">Community Access</h3>
              <p className="text-theme-secondary text-xs sm:text-sm">Join our community and start your learning journey</p>
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4 md:mb-6">
            {['Access to community forum', 'Basic learning games', 'AI avatar generation', 'Free forever'].map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0"></div>
                <span className="text-theme-primary text-xs sm:text-sm">{item}</span>
              </div>
            ))}
          </div>

          <button
            onClick={onRegularSignUp}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105 shadow-lg text-xs sm:text-sm md:text-base flex items-center justify-center gap-1.5 sm:gap-2"
          >
            Join Community <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Additional Info */}
        <div className="text-center pt-2">
          <p className="text-theme-secondary text-xs sm:text-sm">
            Already have an account?{' '}
            <button
              onClick={() => {
                onClose();
                onShowLogin?.();
              }}
              className="text-violet-400 hover:text-violet-300 font-semibold transition-colors"
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </ModalReveal>
  );
};

export default SignUpChoiceModal;