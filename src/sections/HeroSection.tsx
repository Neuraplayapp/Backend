import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface HeroSectionProps {
  onSignUp: () => void;
  onLogin: () => void;
  onLearnMore: () => void;
  scrollY: number;
}

/**
 * Hero Section Component
 * Extracted from ParentHomePage for code splitting and lazy loading
 */
const HeroSection: React.FC<HeroSectionProps> = ({ onSignUp, onLogin, onLearnMore, scrollY }) => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();

  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -100px 0px' }
    );

    const sections = document.querySelectorAll('[data-animate]');
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  const globalStyles = `
    .fade-in-section {
      opacity: 0;
      transform: translateY(40px);
      transition: opacity 1s ease-out, transform 1s ease-out;
    }

    .fade-in-section.visible {
      opacity: 1;
      transform: translateY(0);
    }

    .stagger-1 { transition-delay: 0.1s; }
    .stagger-2 { transition-delay: 0.2s; }
    .stagger-3 { transition-delay: 0.3s; }
    .stagger-4 { transition-delay: 0.4s; }
  `;

  return (
    <>
      <style>{globalStyles}</style>
    <section
      id="hero-section"
      data-animate
      className={`min-h-screen relative overflow-hidden pt-20 sm:pt-24 lg:pt-28 fade-in-section ${
        visibleSections.has('hero-section') ? 'visible' : ''
      } ${
        isDarkMode ? 'dark-hero-gradient' : 'light-hero-gradient'
      }`}
    >
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
          }}
        />
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
          }}
        />
      </div>


      {/* Hero Content */}
      <div className="relative z-10 w-full container mx-auto px-6">
        <div className="text-center">
          {/* Title */}
          <div
            id="hero-title"
            data-animate
            className={`fade-in-section ${visibleSections.has('hero-title') ? 'visible' : ''}`}
          >
            <h1 className={`text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {t('parentHome.hero.title')}
              <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600">
                {t('parentHome.hero.titleHighlight')}
              </span>
            </h1>
          </div>

          {/* Subtitle */}
          <div
            id="hero-subtitle"
            data-animate
            className={`fade-in-section ${visibleSections.has('hero-subtitle') ? 'visible' : ''}`}
          >
            <p className={`text-xl md:text-2xl max-w-2xl mx-auto mb-12 leading-relaxed ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              {t('parentHome.hero.subtitle')}
            </p>
          </div>

          {/* CTA Buttons */}
          <div
            id="hero-cta"
            data-animate
            className={`fade-in-section ${visibleSections.has('hero-cta') ? 'visible' : ''}`}
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              {/* Primary CTA */}
              <button
                onClick={onSignUp}
                className="stagger-1 group relative w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold text-white overflow-hidden transition-all duration-500 transform hover:scale-105 shadow-lg hover:shadow-xl"
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
                onClick={onLogin}
                className={`stagger-2 group relative w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold overflow-hidden transition-all duration-500 transform hover:scale-105 ${
                  isDarkMode
                    ? 'text-white border border-purple-500/50 hover:border-purple-400'
                    : 'text-gray-900 border border-gray-300 hover:border-purple-500'
                }`}
                style={{
                  background: isDarkMode ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <span className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                  isDarkMode ? 'bg-gradient-to-r from-purple-600/20 to-purple-500/20' : 'bg-gradient-to-r from-purple-50 to-purple-100'
                }`}></span>
                <span className="relative z-10">{t('navigation.login')}</span>
              </button>

              {/* Learn More */}
              <button
                onClick={onLearnMore}
                className={`stagger-3 group flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-300 ${
                  isDarkMode ? 'text-purple-300 hover:text-purple-200' : 'text-purple-600 hover:text-purple-700'
                }`}
              >
                <span>{t('parentHome.hero.learnMore')}</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </button>
            </div>
          </div>

          {/* Popular Courses */}
          <div
            id="hero-courses"
            data-animate
            className={`fade-in-section ${visibleSections.has('hero-courses') ? 'visible' : ''}`}
          >
            <div className="mt-8 text-center">
              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Popular courses:</span>
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                {[
                  { name: 'Introductory English', link: '/courses/introductory-english' },
                  { name: 'Geography', link: '/courses/geography' },
                  { name: 'AI-Machine Learning', link: '/courses/ai-machine-learning' },
                  { name: 'Psychology and Philosophy', link: '/courses/psychology-philosophy' },
                  { name: 'Saudi History', link: '/courses/saudi-history' },
                  { name: 'Business Management', link: '/courses/business-management' },
                  { name: 'Business Administration', link: '/courses/business-administration' },
                  { name: 'Project Management', link: '/courses/project-management' },
                ].map((course, index) => (
                  <a
                    key={index}
                    href={course.link}
                    className={`stagger-${Math.min(index + 1, 4)} px-3 py-1 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-700 text-sm transition-colors duration-300`}
                  >
                    {course.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
    </>
  );
};

export default HeroSection;