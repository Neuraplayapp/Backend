import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, Brain, TrendingUp } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useEffect, useState } from 'react';
const HowItWorksSection: React.FC = () => {
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

  const steps = [
    {
      number: '01',
      icon: UserPlus,
      title: t('parentHome.howItWorks.step1.title'),
      description: t('parentHome.howItWorks.step1.description'),
    },
    {
      number: '02',
      icon: Brain,
      title: t('parentHome.howItWorks.step2.title'),
      description: t('parentHome.howItWorks.step2.description'),
    },
    {
      number: '03',
      icon: TrendingUp,
      title: t('parentHome.howItWorks.step3.title'),
      description: t('parentHome.howItWorks.step3.description'),
    },
  ];

  return (
    <section
      className={`py-24 relative overflow-hidden ${
        isDarkMode
          ? 'bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a]'
          : 'bg-gradient-to-b from-gray-50 to-purple-100/50'
      }`}
    >
      {/* Decorative Orb */}
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
      <div className="relative z-10 container mx-auto px-6">

        {/* Section Header */}
        <div className="text-center mb-14 sm:mb-18">
          <h2
            className={`text-4xl sm:text-5xl font-bold mb-3 tracking-tight ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            {t('parentHome.howItWorks.title')}
          </h2>

          <p
            className={`text-lg max-w-2xl mx-auto leading-relaxed ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            {t('parentHome.howItWorks.subtitle')}
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">

          {/* Connecting Line (Desktop) */}
          <div
            className="hidden lg:block absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-400/30 to-transparent"
            style={{ top: '48px' }}
          />

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

            {steps.map((step, index) => (
              <div
                key={index}
                id={`howitworks-step-${index}`}
                data-animate
                className={`relative flex flex-col items-center text-center ${visibleSections.has(`howitworks-step-${index}`) ? 'visible' : ''}`}
              >

                {/* Number */}
                <div className="relative mb-6 z-10">
                  <div
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-lg bg-gradient-to-br from-purple-500 to-purple-600"
                  >
                    {step.number}
                  </div>

                  {/* Line Between Steps */}
                  {index < steps.length - 1 && (
                    <div
                      className={`hidden lg:block absolute top-1/2 left-full w-12 xl:w-24 h-0.5 ${
                        isDarkMode
                          ? 'bg-purple-400/30'
                          : 'bg-purple-300/40'
                      }`}
                      style={{ transform: 'translateY(-50%)' }}
                    />
                  )}
                </div>

                {/* Icon */}
                <div className="mb-4 p-2.5 rounded-xl">
              <step.icon
              className={`w-7 h-7 sm:w-8 sm:h-8 ${
              isDarkMode
        ? 'text-purple-400'
        : 'text-purple-600'
    }`}
  />
</div>


                {/* Title */}
                <h3
                  className={`text-lg sm:text-xl font-semibold mb-2 tracking-tight ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {step.title}
                </h3>

                {/* Description */}
                <p
                  className={`text-sm leading-relaxed max-w-xs ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  {step.description}
                </p>

              </div>
            ))}

          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;