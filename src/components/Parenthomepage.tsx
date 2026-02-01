import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Brain, Target, Heart, Trophy, Zap, Users, BookOpen,
  ChevronDown, ChevronRight, UserPlus, Shield, Award, Clock,
  GraduationCap, TrendingUp, Lock, Eye,
  Smartphone, Tablet, CheckCircle, ArrowRight
} from 'lucide-react';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import SignUpChoiceModal from '../components/SignUpChoiceModal';
import RegularSignUpModal from '../components/RegularSignUpModal';
import LoginModal from '../components/LoginModal';
import { useTheme } from '../contexts/ThemeContext';

// Custom hook for parallax scroll effect
const useParallax = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return scrollY;
};

// Custom hook for scroll-triggered animations
const useScrollAnimation = () => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return { ref, isVisible };
};

const StatCard = ({ icon: Icon, title, value, description }: {
  icon: any;
  title: string;
  value: string;
  description: string;
}) => {
  const { isDarkMode } = useTheme();
  const { ref, isVisible } = useScrollAnimation();

  return (
    <div
      ref={ref}
      className={`p-10 lg:p-12 text-center rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-700 hover:scale-[1.02] hover:-translate-y-1 will-change-transform ${isDarkMode
        ? 'bg-purple-950/30 backdrop-blur-md border-2 border-purple-300/20 shadow-lg shadow-purple-500/10 hover:shadow-xl hover:shadow-purple-500/20'
        : 'bg-white/90 backdrop-blur-md border-2 border-purple-200/30 shadow-lg hover:shadow-xl'
        } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      style={{ transform: 'translateZ(0)', transition: 'all 0.7s ease-out' }}
    >
      <div className="flex justify-center mb-8">
        <div className={`p-5 rounded-full border ${isDarkMode
          ? 'bg-purple-500/40 border-purple-400/60'
          : 'bg-purple-200 border-purple-400'
          }`}>
          <Icon className={`w-12 h-12 ${isDarkMode ? 'text-purple-300' : 'text-purple-600'
            }`} />
        </div>
      </div>
      <h3 className={`text-4xl lg:text-5xl font-bold mb-5 ${isDarkMode ? 'text-purple-50' : 'text-gray-900'
        }`}>{value}</h3>
      <p className={`text-xl lg:text-2xl font-semibold mb-4 ${isDarkMode ? 'text-purple-100/90' : 'text-gray-800'
        }`}>{title}</p>
      <p className={`text-base lg:text-lg ${isDarkMode ? 'text-white/70' : 'text-gray-600'
        }`}>{description}</p>
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, description, benefits }: {
  icon: any;
  title: string;
  description: string;
  benefits: string[];
}) => {
  const { isDarkMode } = useTheme();
  const { ref, isVisible } = useScrollAnimation();

  return (
    <div
      ref={ref}
      className={`p-6 sm:p-8 rounded-2xl transition-all duration-500 hover:-translate-y-1 ${isDarkMode
        ? 'bg-purple-950/40 backdrop-blur-xl border border-purple-500/20 hover:border-purple-400/40'
        : 'bg-white/70 backdrop-blur-xl border border-purple-200/50 hover:border-purple-300/70 shadow-lg hover:shadow-xl'
        } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ transition: 'all 0.5s ease-out' }}
    >
      <div className="flex items-center gap-4 mb-5">
        <div className={`p-3 rounded-xl ${isDarkMode
          ? 'bg-purple-500/20 border border-purple-400/30'
          : 'bg-purple-100 border border-purple-200'
          }`}>
          <Icon className={`w-6 h-6 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
        </div>
        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
      </div>
      <p className={`mb-5 leading-relaxed text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{description}</p>
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

const ParentHomePage: React.FC = () => {
  const { t } = useTranslation();
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [showRegularSignUpModal, setShowRegularSignUpModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const scrollY = useParallax();

  const stats = [
    {
      icon: Heart,
      title: t('parentHome.stats.understanding.title'),
      value: t('parentHome.stats.understanding.value'),
      description: t('parentHome.stats.understanding.description')
    },
    {
      icon: Brain,
      title: t('parentHome.stats.memory.title'),
      value: t('parentHome.stats.memory.value'),
      description: t('parentHome.stats.memory.description')
    },
    {
      icon: TrendingUp,
      title: t('parentHome.stats.growth.title'),
      value: t('parentHome.stats.growth.value'),
      description: t('parentHome.stats.growth.description')
    }
  ];

  const topFeatures = [
    {
      icon: BookOpen,
      title: t('parentHome.features.courses.title'),
      description: t('parentHome.features.courses.description'),
      benefits: [
        t('parentHome.features.courses.benefit1'),
        t('parentHome.features.courses.benefit2'),
        t('parentHome.features.courses.benefit3'),
        t('parentHome.features.courses.benefit4')
      ]
    },
    {
      icon: Brain,
      title: t('parentHome.features.memory.title'),
      description: t('parentHome.features.memory.description'),
      benefits: [
        t('parentHome.features.memory.benefit1'),
        t('parentHome.features.memory.benefit2'),
        t('parentHome.features.memory.benefit3'),
        t('parentHome.features.memory.benefit4')
      ]
    }
  ];

  const safetyFeatures = [
    {
      icon: Lock,
      title: t('parentHome.safety.encryption.title'),
      description: t('parentHome.safety.encryption.description')
    },
    {
      icon: Shield,
      title: t('parentHome.safety.content.title'),
      description: t('parentHome.safety.content.description')
    },
    {
      icon: Eye,
      title: t('parentHome.safety.privacy.title'),
      description: t('parentHome.safety.privacy.description')
    },
    {
      icon: Users,
      title: t('parentHome.safety.control.title'),
      description: t('parentHome.safety.control.description')
    }
  ];

  const globalStyles = `
    .dark-hero-gradient {
      background: linear-gradient(to bottom, #0f0f23 0%, #1a1a2e 60%, #1a1a2e 100%);
    }
    
    .light-hero-gradient {
      background: linear-gradient(to bottom, #faf5ff 0%, #f3e8ff 60%, #f3e8ff 100%);
    }
    
    .floating {
      animation: float 6s ease-in-out infinite;
    }
    
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
    }

    .floating-slow {
      animation: floatSlow 8s ease-in-out infinite;
    }
    
    @keyframes floatSlow {
      0%, 100% { transform: translateY(0px) translateX(0px); }
      50% { transform: translateY(-30px) translateX(10px); }
    }

    .rotate-slow {
      animation: rotateSlow 20s linear infinite;
    }

    @keyframes rotateSlow {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .parallax-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(40px);
      opacity: 0.3;
      pointer-events: none;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.3; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.1); }
    }

    .pulse-slow {
      animation: pulse 4s ease-in-out infinite;
    }

    .monkey-sway {
      animation: monkeySway 3s ease-in-out infinite;
      transform-origin: bottom center;
    }

    @keyframes monkeySway {
      0%, 100% { transform: rotate(-5deg) translateY(0px); }
      50% { transform: rotate(5deg) translateY(-5px); }
    }

    .tail-swing {
      animation: tailSwing 2s ease-in-out infinite;
      transform-origin: top left;
    }

    @keyframes tailSwing {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(15deg); }
    }

    .monkey-wave {
      animation: wave 2.5s ease-in-out infinite;
      transform-origin: bottom center;
    }

    @keyframes wave {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(-15deg); }
      75% { transform: rotate(15deg); }
    }
  `;

  return (
    <>
      <style>{globalStyles}</style>

      {/* Navigation Bar */}
      <Navbar />

      <div className="font-sf">
        {/* Hero Section - Premium Design with Animated Background */}
        <section className={`min-h-screen relative overflow-hidden pt-20 ${isDarkMode ? 'dark-hero-gradient' : 'light-hero-gradient'
          }`}>

          {/* Animated Grid Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: isDarkMode
                  ? `linear-gradient(rgba(139, 92, 246, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.03) 1px, transparent 1px)`
                  : `linear-gradient(rgba(139, 92, 246, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.05) 1px, transparent 1px)`,
                backgroundSize: '60px 60px',
                transform: `translateY(${scrollY * 0.1}px)`,
              }}
            />
          </div>

          {/* Gradient Mesh Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Top-left gradient blob */}
            <div
              className="absolute w-[600px] h-[600px] rounded-full blur-3xl animate-pulse"
              style={{
                background: isDarkMode
                  ? 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(196, 181, 253, 0.4) 0%, transparent 70%)',
                top: '-10%',
                left: '-5%',
                transform: `translate(${scrollY * 0.05}px, ${scrollY * 0.1}px)`,
              }}
            />
            {/* Top-right gradient blob */}
            <div
              className="absolute w-[500px] h-[500px] rounded-full blur-3xl"
              style={{
                background: isDarkMode
                  ? 'radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(233, 213, 255, 0.5) 0%, transparent 70%)',
                top: '5%',
                right: '-10%',
                transform: `translate(${scrollY * -0.03}px, ${scrollY * 0.08}px)`,
                animation: 'pulse 6s ease-in-out infinite',
              }}
            />
            {/* Center gradient blob */}
            <div
              className="absolute w-[800px] h-[800px] rounded-full blur-3xl"
              style={{
                background: isDarkMode
                  ? 'radial-gradient(circle, rgba(124, 58, 237, 0.08) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(216, 180, 254, 0.3) 0%, transparent 70%)',
                top: '30%',
                left: '20%',
                transform: `translateY(${scrollY * -0.05}px)`,
                animation: 'pulse 8s ease-in-out infinite 2s',
              }}
            />
            {/* Bottom gradient blob */}
            <div
              className="absolute w-[700px] h-[700px] rounded-full blur-3xl"
              style={{
                background: isDarkMode
                  ? 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(199, 210, 254, 0.35) 0%, transparent 70%)',
                bottom: '-15%',
                right: '10%',
                transform: `translateY(${scrollY * -0.12}px)`,
                animation: 'pulse 7s ease-in-out infinite 1s',
              }}
            />
          </div>

          {/* Floating Glass Orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Large floating orb - top left */}
            <div
              className="absolute w-32 h-32 md:w-48 md:h-48 rounded-full floating-slow"
              style={{
                background: isDarkMode
                  ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(233, 213, 255, 0.3) 100%)',
                backdropFilter: 'blur(10px)',
                border: isDarkMode ? '1px solid rgba(168, 85, 247, 0.2)' : '1px solid rgba(233, 213, 255, 0.5)',
                top: '15%',
                left: '8%',
                animationDelay: '0s',
              }}
            />
            {/* Medium floating orb - top right */}
            <div
              className="absolute w-20 h-20 md:w-32 md:h-32 rounded-full floating"
              style={{
                background: isDarkMode
                  ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(124, 58, 237, 0.04) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.5) 0%, rgba(216, 180, 254, 0.25) 100%)',
                backdropFilter: 'blur(8px)',
                border: isDarkMode ? '1px solid rgba(139, 92, 246, 0.15)' : '1px solid rgba(216, 180, 254, 0.4)',
                top: '25%',
                right: '12%',
                animationDelay: '1s',
              }}
            />
            {/* Small floating orb - bottom left */}
            <div
              className="absolute w-16 h-16 md:w-24 md:h-24 rounded-full floating"
              style={{
                background: isDarkMode
                  ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.12) 0%, rgba(99, 102, 241, 0.06) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(199, 210, 254, 0.35) 100%)',
                backdropFilter: 'blur(6px)',
                border: isDarkMode ? '1px solid rgba(124, 58, 237, 0.2)' : '1px solid rgba(199, 210, 254, 0.5)',
                bottom: '25%',
                left: '15%',
                animationDelay: '2s',
              }}
            />
            {/* Tiny floating orbs */}
            <div
              className="absolute w-8 h-8 md:w-12 md:h-12 rounded-full floating-slow"
              style={{
                background: isDarkMode
                  ? 'rgba(168, 85, 247, 0.15)'
                  : 'rgba(255, 255, 255, 0.8)',
                bottom: '40%',
                right: '20%',
                animationDelay: '0.5s',
              }}
            />
            <div
              className="absolute w-6 h-6 md:w-10 md:h-10 rounded-full floating"
              style={{
                background: isDarkMode
                  ? 'rgba(139, 92, 246, 0.2)'
                  : 'rgba(233, 213, 255, 0.6)',
                top: '45%',
                left: '25%',
                animationDelay: '1.5s',
              }}
            />
          </div>


          {/* Hero Content */}
          <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 lg:pt-32 pb-16">
            {/* Main Hero Content - No box, direct on gradient */}
            <div className="text-center">
              {/* Badge */}


              {/* Title - Refined sizing */}
              <h1 className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {t('parentHome.hero.title')}
                <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600">
                  {t('parentHome.hero.titleHighlight')}
                </span>
              </h1>

              {/* Subtitle - Refined sizing */}
              <p className={`text-base sm:text-lg md:text-xl max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {t('parentHome.hero.subtitle')}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 sm:mb-16">
                {/* Primary CTA */}
                <button
                  onClick={() => setShowSignUpModal(true)}
                  className="group relative w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-white overflow-hidden transition-all duration-500 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)',
                    boxShadow: '0 10px 40px rgba(139, 92, 246, 0.3)',
                  }}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></span>
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {t('parentHome.hero.cta')}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </span>
                </button>

                {/* Secondary CTA - Login */}
                <button
                  onClick={() => setShowLoginModal(true)}
                  className={`group relative w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold overflow-hidden transition-all duration-500 transform hover:scale-105 ${isDarkMode
                    ? 'text-white border border-purple-500/50 hover:border-purple-400'
                    : 'text-gray-900 border border-gray-300 hover:border-purple-500'
                    }`}
                  style={{
                    background: isDarkMode
                      ? 'rgba(139, 92, 246, 0.1)'
                      : 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <span className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${isDarkMode
                    ? 'bg-gradient-to-r from-purple-600/20 to-purple-500/20'
                    : 'bg-gradient-to-r from-purple-50 to-purple-100'
                    }`}></span>
                  <span className="relative z-10">{t('navigation.login')}</span>
                </button>

                {/* Learn More */}
                <button
                  onClick={() => navigate('/about')}
                  className={`group flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-300 ${isDarkMode
                    ? 'text-purple-300 hover:text-purple-200'
                    : 'text-purple-600 hover:text-purple-700'
                    }`}
                >
                  <span>{t('parentHome.hero.learnMore')}</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </button>
              </div>

              {/* Animated Robot Character - Desktop */}
              <div className="hidden lg:flex justify-center mb-12">
                <div className="monkey-sway">
                  <svg width="120" height="150" viewBox="0 0 80 105" xmlns="http://www.w3.org/2000/svg">
                    <line x1="40" y1="8" x2="40" y2="0" stroke="#9333ea" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="40" cy="0" r="4" fill="#c084fc" />
                    <rect x="12" y="8" width="56" height="42" rx="10" fill="#a855f7" />
                    <rect x="18" y="14" width="44" height="30" rx="6" fill="#1f2937" />
                    <circle cx="30" cy="29" r="8" fill="#c084fc" />
                    <circle cx="50" cy="29" r="8" fill="#c084fc" />
                    <circle cx="32" cy="27" r="3" fill="white" />
                    <circle cx="52" cy="27" r="3" fill="white" />
                    <path d="M32 38 Q40 44 48 38" stroke="#c084fc" strokeWidth="3" strokeLinecap="round" fill="none" />
                    <rect x="4" y="20" width="8" height="20" rx="3" fill="#9333ea" />
                    <rect x="68" y="20" width="8" height="20" rx="3" fill="#9333ea" />
                    <rect x="16" y="52" width="48" height="35" rx="8" fill="#a855f7" />
                    <circle cx="40" cy="68" r="8" fill="#9333ea" />
                    <circle cx="40" cy="68" r="5" fill="#c084fc" className="pulse-slow" />
                    <rect x="4" y="55" width="12" height="24" rx="5" fill="#9333ea" />
                    <rect x="64" y="52" width="12" height="26" rx="5" fill="#9333ea" />
                    <rect x="22" y="87" width="14" height="18" rx="5" fill="#9333ea" />
                    <rect x="44" y="87" width="14" height="18" rx="5" fill="#9333ea" />
                  </svg>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
                {stats.map((stat, index) => (
                  <div
                    key={index}
                    className={`p-6 sm:p-8 rounded-2xl transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 ${isDarkMode
                      ? 'bg-purple-950/40 backdrop-blur-xl border border-purple-500/20 hover:border-purple-400/40'
                      : 'bg-white/70 backdrop-blur-xl border border-purple-200/50 hover:border-purple-300/70 shadow-lg hover:shadow-xl'
                      }`}
                    style={{
                      animationDelay: `${index * 0.15}s`,
                    }}
                  >
                    <div className="flex justify-center mb-4">
                      <div className={`p-3 rounded-xl ${isDarkMode
                        ? 'bg-purple-500/20 border border-purple-400/30'
                        : 'bg-purple-100 border border-purple-200'
                        }`}>
                        <stat.icon className={`w-8 h-8 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                      </div>
                    </div>
                    <h3 className={`text-2xl sm:text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {stat.value}
                    </h3>
                    <p className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                      {stat.title}
                    </p>
                    <p className={`text-xs sm:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {stat.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
            <ChevronDown className={`w-6 h-6 ${isDarkMode ? 'text-purple-400/60' : 'text-purple-500/60'}`} />
          </div>
        </section>

        {/* The Science Section - What makes us different */}
        <section
          className={`py-20 sm:py-24 relative overflow-hidden ${isDarkMode
            ? 'bg-gradient-to-b from-[#0f0f1a] via-[#1a1a2e] to-[#1a1a2e]'
            : 'bg-gradient-to-b from-white via-purple-50/30 to-purple-50/50'
            }`}
        >
          {/* Subtle gradient orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute w-[400px] h-[400px] rounded-full blur-3xl opacity-50"
              style={{
                background: isDarkMode
                  ? 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(196, 181, 253, 0.4) 0%, transparent 70%)',
                top: '10%',
                right: '-5%',
              }}
            />
            <div
              className="absolute w-[300px] h-[300px] rounded-full blur-3xl opacity-50"
              style={{
                background: isDarkMode
                  ? 'radial-gradient(circle, rgba(124, 58, 237, 0.12) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(233, 213, 255, 0.5) 0%, transparent 70%)',
                bottom: '20%',
                left: '-3%',
              }}
            />
          </div>

          {/* Content */}
          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section Header */}
            <div className="text-center mb-12 sm:mb-16">
              <h2 className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-4 tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {t('parentHome.science.title')}
              </h2>
              <p className={`text-base sm:text-lg max-w-2xl mx-auto ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('parentHome.science.subtitle')}
              </p>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid md:grid-cols-2 gap-5 sm:gap-6">
              {topFeatures.map((feature, index) => (
                <FeatureCard key={index} {...feature} />
              ))}
            </div>
          </div>
        </section>

        {/* The Tutor Section */}
        <section
          className={`py-20 sm:py-24 relative overflow-hidden ${isDarkMode
            ? 'bg-gradient-to-b from-[#1a1a2e] via-[#0f0f1a] to-[#0f0f1a]'
            : 'bg-gradient-to-b from-purple-50/50 via-white to-white'
            }`}
        >
          {/* Subtle gradient orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute w-[350px] h-[350px] rounded-full blur-3xl opacity-50"
              style={{
                background: isDarkMode
                  ? 'radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(233, 213, 255, 0.4) 0%, transparent 70%)',
                top: '30%',
                left: '-5%',
              }}
            />
            <div
              className="absolute w-[300px] h-[300px] rounded-full blur-3xl opacity-50"
              style={{
                background: isDarkMode
                  ? 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(196, 181, 253, 0.35) 0%, transparent 70%)',
                bottom: '10%',
                right: '-3%',
              }}
            />
          </div>

          {/* Content */}
          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section Header */}
            <div className="text-center mb-12 sm:mb-16">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className={`p-2.5 rounded-xl ${isDarkMode
                  ? 'bg-purple-500/20 border border-purple-400/30'
                  : 'bg-purple-100 border border-purple-200'
                  }`}>
                  <GraduationCap className={`w-6 h-6 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                </div>
                <h2 className={`text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {t('parentHome.tutor.title')}
                </h2>
              </div>
              <p className={`text-base sm:text-lg max-w-2xl mx-auto ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('parentHome.tutor.subtitle')}
              </p>
            </div>

            {/* Tutor Feature Cards Grid */}
            <div className="grid sm:grid-cols-2 gap-5 sm:gap-6 mb-10">
              {/* Card 1 - Remembers */}
              <div
                className={`p-6 sm:p-7 rounded-2xl transition-all duration-300 hover:-translate-y-1 ${isDarkMode
                  ? 'bg-purple-950/40 backdrop-blur-xl border border-purple-500/20 hover:border-purple-400/40'
                  : 'bg-white/70 backdrop-blur-xl border border-purple-200/50 hover:border-purple-300/70 shadow-lg hover:shadow-xl'
                  }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-xl flex-shrink-0 ${isDarkMode
                    ? 'bg-purple-500/20 border border-purple-400/30'
                    : 'bg-purple-100 border border-purple-200'
                    }`}>
                    <Brain className={`w-5 h-5 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <div>
                    <h3 className={`text-base font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {t('parentHome.tutor.remembers.title')}
                    </h3>
                    <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {t('parentHome.tutor.remembers.description')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 2 - Patient */}
              <div
                className={`p-6 sm:p-7 rounded-2xl transition-all duration-300 hover:-translate-y-1 ${isDarkMode
                  ? 'bg-purple-950/40 backdrop-blur-xl border border-purple-500/20 hover:border-purple-400/40'
                  : 'bg-white/70 backdrop-blur-xl border border-purple-200/50 hover:border-purple-300/70 shadow-lg hover:shadow-xl'
                  }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-xl flex-shrink-0 ${isDarkMode
                    ? 'bg-purple-500/20 border border-purple-400/30'
                    : 'bg-purple-100 border border-purple-200'
                    }`}>
                    <Heart className={`w-5 h-5 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <div>
                    <h3 className={`text-base font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {t('parentHome.tutor.patient.title')}
                    </h3>
                    <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {t('parentHome.tutor.patient.description')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 3 - Celebrates */}
              <div
                className={`p-6 sm:p-7 rounded-2xl transition-all duration-300 hover:-translate-y-1 ${isDarkMode
                  ? 'bg-purple-950/40 backdrop-blur-xl border border-purple-500/20 hover:border-purple-400/40'
                  : 'bg-white/70 backdrop-blur-xl border border-purple-200/50 hover:border-purple-300/70 shadow-lg hover:shadow-xl'
                  }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-xl flex-shrink-0 ${isDarkMode
                    ? 'bg-purple-500/20 border border-purple-400/30'
                    : 'bg-purple-100 border border-purple-200'
                    }`}>
                    <Award className={`w-5 h-5 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <div>
                    <h3 className={`text-base font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {t('parentHome.tutor.celebrates.title')}
                    </h3>
                    <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {t('parentHome.tutor.celebrates.description')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 4 - Adapts */}
              <div
                className={`p-6 sm:p-7 rounded-2xl transition-all duration-300 hover:-translate-y-1 ${isDarkMode
                  ? 'bg-purple-950/40 backdrop-blur-xl border border-purple-500/20 hover:border-purple-400/40'
                  : 'bg-white/70 backdrop-blur-xl border border-purple-200/50 hover:border-purple-300/70 shadow-lg hover:shadow-xl'
                  }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-xl flex-shrink-0 ${isDarkMode
                    ? 'bg-purple-500/20 border border-purple-400/30'
                    : 'bg-purple-100 border border-purple-200'
                    }`}>
                    <Target className={`w-5 h-5 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                  </div>
                  <div>
                    <h3 className={`text-base font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {t('parentHome.tutor.adapts.title')}
                    </h3>
                    <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {t('parentHome.tutor.adapts.description')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quote */}
            <div
              className={`p-5 sm:p-6 rounded-xl border-l-4 ${isDarkMode
                ? 'bg-purple-950/30 border-purple-500/50'
                : 'bg-purple-50/70 border-purple-400'
                }`}
            >
              <p className={`text-sm sm:text-base italic leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('parentHome.tutor.quote')}
              </p>
            </div>
          </div>
        </section>

        {/* Safety & Security Section */}
        <section
          className={`py-20 sm:py-24 relative overflow-hidden ${isDarkMode
            ? 'bg-gradient-to-b from-[#0f0f1a] via-[#1a1a2e] to-[#1a1a2e]'
            : 'bg-gradient-to-b from-white via-gray-50/50 to-gray-50'
            }`}
        >
          {/* Subtle gradient orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute w-[350px] h-[350px] rounded-full blur-3xl opacity-50"
              style={{
                background: isDarkMode
                  ? 'radial-gradient(circle, rgba(34, 197, 94, 0.1) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(187, 247, 208, 0.4) 0%, transparent 70%)',
                top: '20%',
                right: '-5%',
              }}
            />
          </div>

          {/* Content */}
          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section Header */}
            <div className="text-center mb-12 sm:mb-16">
              <h2 className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-4 tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {t('parentHome.safety.title')}
              </h2>
              <p className={`text-base sm:text-lg max-w-2xl mx-auto ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('parentHome.safety.subtitle')}
              </p>
            </div>

            {/* Safety Cards Grid */}
            <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
              {safetyFeatures.map((feature, index) => (
                <div
                  key={index}
                  className={`p-6 sm:p-7 rounded-2xl transition-all duration-300 hover:-translate-y-1 ${isDarkMode
                    ? 'bg-purple-950/40 backdrop-blur-xl border border-purple-500/20 hover:border-purple-400/40'
                    : 'bg-white/70 backdrop-blur-xl border border-purple-200/50 hover:border-purple-300/70 shadow-lg hover:shadow-xl'
                    }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-xl flex-shrink-0 ${isDarkMode
                      ? 'bg-green-500/15 border border-green-400/30'
                      : 'bg-green-100 border border-green-200'
                      }`}>
                      <feature.icon className={`w-5 h-5 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                    </div>
                    <div>
                      <h3 className={`text-base font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {feature.title}
                      </h3>
                      <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className={`py-20 sm:py-24 relative overflow-hidden ${isDarkMode
          ? 'bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a]'
          : 'bg-gradient-to-b from-gray-50 to-purple-100/50'
          }`}>
          {/* Decorative orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
              className="absolute w-[400px] h-[400px] rounded-full blur-3xl opacity-40"
              style={{
                background: isDarkMode
                  ? 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)'
                  : 'radial-gradient(circle, rgba(216, 180, 254, 0.4) 0%, transparent 70%)',
                top: '20%',
                right: '10%',
              }}
            />
          </div>

          {/* Content */}
          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section Header */}
            <div className="text-center mb-12 sm:mb-16">
              <h2 className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-4 tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {t('parentHome.howItWorks.title')}
              </h2>
              <p className={`text-base sm:text-lg max-w-2xl mx-auto ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('parentHome.howItWorks.subtitle')}
              </p>
            </div>

            {/* Grid with cards - Clean modern design */}
            <div className="grid md:grid-cols-3 gap-6 lg:gap-8 w-full">
              {/* Step 1 */}
              <div className={`group p-8 lg:p-10 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.03] hover:-translate-y-2 will-change-transform ${isDarkMode
                ? 'bg-gradient-to-br from-purple-900/40 to-purple-950/40 backdrop-blur-xl border border-purple-400/20 hover:border-purple-400/40'
                : 'bg-white/95 backdrop-blur-xl border border-purple-200/50 hover:border-purple-400/60'
                }`}>
                {/* Number Badge */}
                <div className="flex justify-center mb-8">
                  <div className="relative">
                    <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-3xl lg:text-4xl font-bold shadow-xl group-hover:shadow-2xl group-hover:shadow-purple-500/50 transition-all duration-500 group-hover:scale-110">
                      1
                    </div>
                    {/* Glow effect */}
                    <div className="absolute inset-0 rounded-full bg-purple-500/30 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>
                </div>

                {/* Title */}
                <h3 className={`text-2xl lg:text-2xl font-bold mb-4 text-center ${isDarkMode ? 'text-purple-50' : 'text-gray-900'
                  }`}>{t('parentHome.howItWorks.step1.title')}</h3>

                {/* Description */}
                <p className={`mb-6 text-center text-base lg:text-lg leading-relaxed ${isDarkMode ? 'text-white/70' : 'text-gray-600'
                  }`}>
                  {t('parentHome.howItWorks.step1.description')}
                </p>

                {/* Bullet Points */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-1 rounded-full mt-0.5 ${isDarkMode ? 'bg-green-500/20' : 'bg-green-100'}`}>
                      <CheckCircle className={`w-5 h-5 flex-shrink-0 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                    </div>
                    <span className={`text-sm lg:text-base ${isDarkMode ? 'text-white/80' : 'text-gray-700'}`}>
                      {t('parentHome.howItWorks.step1.point1')}
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className={`p-1 rounded-full mt-0.5 ${isDarkMode ? 'bg-green-500/20' : 'bg-green-100'}`}>
                      <CheckCircle className={`w-5 h-5 flex-shrink-0 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                    </div>
                    <span className={`text-sm lg:text-base ${isDarkMode ? 'text-white/80' : 'text-gray-700'}`}>
                      {t('parentHome.howItWorks.step1.point2')}
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className={`p-1 rounded-full mt-0.5 ${isDarkMode ? 'bg-green-500/20' : 'bg-green-100'}`}>
                      <CheckCircle className={`w-5 h-5 flex-shrink-0 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                    </div>
                    <span className={`text-sm lg:text-base ${isDarkMode ? 'text-white/80' : 'text-gray-700'}`}>
                      {t('parentHome.howItWorks.step1.point3')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className={`group p-8 lg:p-10 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.03] hover:-translate-y-2 will-change-transform ${isDarkMode
                ? 'bg-gradient-to-br from-purple-900/40 to-purple-950/40 backdrop-blur-xl border border-purple-400/20 hover:border-purple-400/40'
                : 'bg-white/95 backdrop-blur-xl border border-purple-200/50 hover:border-purple-400/60'
                }`}>
                {/* Number Badge */}
                <div className="flex justify-center mb-8">
                  <div className="relative">
                    <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-3xl lg:text-4xl font-bold shadow-xl group-hover:shadow-2xl group-hover:shadow-purple-500/50 transition-all duration-500 group-hover:scale-110">
                      2
                    </div>
                    {/* Glow effect */}
                    <div className="absolute inset-0 rounded-full bg-purple-500/30 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>
                </div>

                {/* Title */}
                <h3 className={`text-2xl lg:text-2xl font-bold mb-4 text-center ${isDarkMode ? 'text-purple-50' : 'text-gray-900'
                  }`}>{t('parentHome.howItWorks.step2.title')}</h3>

                {/* Description */}
                <p className={`mb-6 text-center text-base lg:text-lg leading-relaxed ${isDarkMode ? 'text-white/70' : 'text-gray-600'
                  }`}>
                  {t('parentHome.howItWorks.step2.description')}
                </p>

                {/* Bullet Points */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-1 rounded-full mt-0.5 ${isDarkMode ? 'bg-green-500/20' : 'bg-green-100'}`}>
                      <CheckCircle className={`w-5 h-5 flex-shrink-0 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                    </div>
                    <span className={`text-sm lg:text-base ${isDarkMode ? 'text-white/80' : 'text-gray-700'}`}>
                      {t('parentHome.howItWorks.step2.point1')}
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className={`p-1 rounded-full mt-0.5 ${isDarkMode ? 'bg-green-500/20' : 'bg-green-100'}`}>
                      <CheckCircle className={`w-5 h-5 flex-shrink-0 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                    </div>
                    <span className={`text-sm lg:text-base ${isDarkMode ? 'text-white/80' : 'text-gray-700'}`}>
                      {t('parentHome.howItWorks.step2.point2')}
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className={`p-1 rounded-full mt-0.5 ${isDarkMode ? 'bg-green-500/20' : 'bg-green-100'}`}>
                      <CheckCircle className={`w-5 h-5 flex-shrink-0 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                    </div>
                    <span className={`text-sm lg:text-base ${isDarkMode ? 'text-white/80' : 'text-gray-700'}`}>
                      {t('parentHome.howItWorks.step2.point3')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className={`group p-8 lg:p-10 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.03] hover:-translate-y-2 will-change-transform ${isDarkMode
                ? 'bg-gradient-to-br from-purple-900/40 to-purple-950/40 backdrop-blur-xl border border-purple-400/20 hover:border-purple-400/40'
                : 'bg-white/95 backdrop-blur-xl border border-purple-200/50 hover:border-purple-400/60'
                }`}>
                {/* Number Badge */}
                <div className="flex justify-center mb-8">
                  <div className="relative">
                    <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-3xl lg:text-4xl font-bold shadow-xl group-hover:shadow-2xl group-hover:shadow-purple-500/50 transition-all duration-500 group-hover:scale-110">
                      3
                    </div>
                    {/* Glow effect */}
                    <div className="absolute inset-0 rounded-full bg-purple-500/30 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>
                </div>

                {/* Title */}
                <h3 className={`text-2xl lg:text-2xl font-bold mb-4 text-center ${isDarkMode ? 'text-purple-50' : 'text-gray-900'
                  }`}>{t('parentHome.howItWorks.step3.title')}</h3>

                {/* Description */}
                <p className={`mb-6 text-center text-base lg:text-lg leading-relaxed ${isDarkMode ? 'text-white/70' : 'text-gray-600'
                  }`}>
                  {t('parentHome.howItWorks.step3.description')}
                </p>

                {/* Bullet Points */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-1 rounded-full mt-0.5 ${isDarkMode ? 'bg-green-500/20' : 'bg-green-100'}`}>
                      <CheckCircle className={`w-5 h-5 flex-shrink-0 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                    </div>
                    <span className={`text-sm lg:text-base ${isDarkMode ? 'text-white/80' : 'text-gray-700'}`}>
                      {t('parentHome.howItWorks.step3.point1')}
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className={`p-1 rounded-full mt-0.5 ${isDarkMode ? 'bg-green-500/20' : 'bg-green-100'}`}>
                      <CheckCircle className={`w-5 h-5 flex-shrink-0 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                    </div>
                    <span className={`text-sm lg:text-base ${isDarkMode ? 'text-white/80' : 'text-gray-700'}`}>
                      {t('parentHome.howItWorks.step3.point2')}
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className={`p-1 rounded-full mt-0.5 ${isDarkMode ? 'bg-green-500/20' : 'bg-green-100'}`}>
                      <CheckCircle className={`w-5 h-5 flex-shrink-0 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                    </div>
                    <span className={`text-sm lg:text-base ${isDarkMode ? 'text-white/80' : 'text-gray-700'}`}>
                      {t('parentHome.howItWorks.step3.point3')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className={`py-16 sm:py-20 relative overflow-hidden ${isDarkMode
          ? 'bg-gradient-to-b from-[#0f0f1a] to-[#1a1a2e]'
          : 'bg-gradient-to-b from-purple-50/50 to-white'
          }`}>

          {/* Subtle background orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className={`absolute top-0 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-40 ${isDarkMode ? 'bg-purple-500/20' : 'bg-purple-200/50'}`} />
            <div className={`absolute bottom-0 right-1/4 w-48 h-48 rounded-full blur-3xl opacity-40 ${isDarkMode ? 'bg-blue-500/15' : 'bg-blue-200/40'}`} />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Main CTA Card */}
            <div className={`relative p-8 sm:p-10 rounded-2xl ${isDarkMode
              ? 'bg-purple-950/50 backdrop-blur-xl border border-purple-500/20'
              : 'bg-white/80 backdrop-blur-xl border border-purple-200/50 shadow-xl'
              }`}>

              {/* Content */}
              <div className="text-center">
                {/* Title */}
                <h2 className={`text-xl sm:text-2xl md:text-3xl font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <span>{t('parentHome.cta.title').split(' ').slice(0, 2).join(' ')} </span>
                  <span className={`bg-gradient-to-r ${isDarkMode
                    ? 'from-purple-400 to-purple-300'
                    : 'from-purple-600 to-purple-500'
                    } bg-clip-text text-transparent`}>
                    {t('parentHome.cta.title').split(' ').slice(2).join(' ')}
                  </span>
                </h2>

                {/* Subtitle */}
                <p className={`text-sm sm:text-base mb-6 max-w-xl mx-auto ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {t('parentHome.cta.subtitle')}
                </p>

                {/* Coming Soon Badge */}
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 ${isDarkMode
                  ? 'bg-purple-500/15 border border-purple-400/30'
                  : 'bg-purple-100 border border-purple-200'
                  }`}>
                  <Smartphone className={`w-4 h-4 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                    {t('parentHome.cta.comingSoon')}
                  </span>
                  <Tablet className={`w-4 h-4 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                </div>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-8">
                  {/* Login Button */}
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-300 ${isDarkMode
                      ? 'border border-purple-400/40 text-purple-300 hover:bg-purple-500/10 hover:border-purple-400/60'
                      : 'border border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400'
                      }`}
                  >
                    <span className="flex items-center gap-2">
                      {t('navigation.login')}
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </button>

                  {/* Learn More Button */}
                  <button
                    onClick={() => navigate('/about')}
                    className="px-6 py-2.5 rounded-lg font-medium bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <span className="flex items-center gap-2">
                      {t('parentHome.hero.learnMore')}
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </button>
                </div>

                {/* Trust Badges */}
                <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                  <div className="flex items-center gap-2">
                    <Trophy className={`w-4 h-4 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
                    <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t('parentHome.cta.noCard')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className={`w-4 h-4 ${isDarkMode ? 'text-green-400' : 'text-green-500'}`} />
                    <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t('parentHome.cta.safe')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className={`w-4 h-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                    <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t('parentHome.cta.cancel')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Footer />

        {/* Sign Up Choice Modal */}
        <SignUpChoiceModal
          isOpen={showSignUpModal}
          onClose={() => setShowSignUpModal(false)}
          onPremiumSignUp={() => {
            setShowSignUpModal(false);
            navigate('/registration');
          }}
          onRegularSignUp={() => {
            setShowSignUpModal(false);
            setShowRegularSignUpModal(true);
          }}
          onShowLogin={() => {
            setShowSignUpModal(false);
            setShowLoginModal(true);
          }}
        />

        {/* Regular Sign Up Modal */}
        <RegularSignUpModal
          isOpen={showRegularSignUpModal}
          onClose={() => setShowRegularSignUpModal(false)}
          onSuccess={() => {
            console.log('Regular sign up successful!');
          }}
          onShowLogin={() => {
            setShowRegularSignUpModal(false);
            setShowLoginModal(true);
          }}
        />

        {/* Login Modal */}
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => {
            console.log('Login successful!');
          }}
          redirectTo="/dashboard"
        />
      </div >
    </>
  );
};

export default ParentHomePage;