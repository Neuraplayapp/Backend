import * as React from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Brain, BookOpen, Target, Heart, Award } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

/* ----------------------------------
   Feature Card
-----------------------------------*/

const FeatureCard = ({
  icon: Icon,
  title,
  description,
  benefits,
}: {
  icon: any;
  title: string;
  description: string;
  benefits: string[];
}) => {
  const { isDarkMode } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -100px 0px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      className={`p-8 sm:p-10 rounded-2xl transition-all duration-500 hover:-translate-y-1 fade-in-section ${
        isVisible ? 'visible' : ''
      } ${
        isDarkMode
          ? 'bg-purple-950/40 backdrop-blur-xl border border-purple-500/20 hover:border-purple-400/40'
          : 'bg-white/70 backdrop-blur-xl border border-purple-200/50 hover:border-purple-300/70 shadow-lg hover:shadow-xl'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 rounded-xl">
          <Icon
            className={`w-6 h-6 ${
              isDarkMode ? 'text-purple-400' : 'text-purple-600'
            }`}
          />
        </div>

        <h3
          className={`text-lg font-semibold tracking-tight ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}
        >
          {title}
        </h3>
      </div>

      {/* Description */}
      <p
        className={`mb-4 text-sm leading-relaxed ${
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        }`}
      >
        {description}
      </p>

      {/* Benefits */}
      <div className="space-y-2">
        {benefits.map((benefit, index) => (
          <div key={index} className="flex items-start gap-3">
            <div
              className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 ${
                isDarkMode ? 'bg-purple-500/30' : 'bg-purple-200'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full m-1 ${
                  isDarkMode ? 'bg-purple-400' : 'bg-purple-600'
                }`}
              />
            </div>

            <span
              className={`text-sm ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              {benefit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ----------------------------------
   Main Section
-----------------------------------*/

const FeaturesSection: React.FC = () => {
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
      { threshold: 0, rootMargin: '0px 0px 0px 0px' }
    );

    const sections = document.querySelectorAll('[data-animate]');
    sections.forEach((section) => observer.observe(section));

    // Check if elements are already visible
    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        setVisibleSections((prev) => new Set(prev).add(section.id));
      }
    });

    return () => observer.disconnect();
  }, []);

  const topFeatures = [
    {
      icon: BookOpen,
      title: t('parentHome.features.courses.title'),
      description: t('parentHome.features.courses.description'),
      benefits: [
        t('parentHome.features.courses.benefit1'),
        t('parentHome.features.courses.benefit2'),
        t('parentHome.features.courses.benefit3'),
        t('parentHome.features.courses.benefit4'),
      ],
    },
    {
      icon: Brain,
      title: t('parentHome.features.memory.title'),
      description: t('parentHome.features.memory.description'),
      benefits: [
        t('parentHome.features.memory.benefit1'),
        t('parentHome.features.memory.benefit2'),
        t('parentHome.features.memory.benefit3'),
        t('parentHome.features.memory.benefit4'),
      ],
    },
  ];

  return (
    <>
      {/* Science Section */}
      <section
        className={`py-24 relative overflow-hidden ${
          isDarkMode
            ? 'bg-gradient-to-b from-[#0f0f1a] via-[#1a1a2e] to-[#1a1a2e]'
            : 'bg-gradient-to-b from-white via-purple-50/30 to-purple-50/50'
        }`}
      >
        {/* Background Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute w-[400px] h-[400px] rounded-full blur-3xl opacity-50"
            style={{
              background: isDarkMode
                ? 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(196,181,253,0.4) 0%, transparent 70%)',
              top: '10%',
              right: '-5%',
            }}
          />

          <div
            className="absolute w-[300px] h-[300px] rounded-full blur-3xl opacity-50"
            style={{
              background: isDarkMode
                ? 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(233,213,255,0.5) 0%, transparent 70%)',
              bottom: '20%',
              left: '-3%',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-6">

          {/* Header */}
          <div className="text-center mb-12 sm:mb-16">
            <h2
              className={`text-4xl sm:text-5xl font-bold mb-4 tracking-tight ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              {t('parentHome.science.title')}
            </h2>

            <p
              className={`text-lg max-w-2xl mx-auto leading-relaxed ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              {t('parentHome.science.subtitle')}
            </p>
          </div>

          {/* Cards */}
          <div className="grid md:grid-cols-2 gap-8">
            {topFeatures.map((feature, index) => (
              <FeatureCard key={index} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* Tutor Section */}
      <section
        className={`py-20 sm:py-24 relative overflow-hidden ${
          isDarkMode
            ? 'bg-gradient-to-b from-[#1a1a2e] via-[#0f0f1a] to-[#0f0f1a]'
            : 'bg-gradient-to-b from-purple-50/50 via-white to-white'
        }`}
      >
        {/* Content */}
        <div className="relative z-10 container mx-auto px-6">

          {/* Header */}
          <div className="text-center mb-12 sm:mb-16">
            <h2
              className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-3 tracking-tight ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              {t('parentHome.tutor.title')}
            </h2>

            <p
              className={`text-sm sm:text-base max-w-xl mx-auto leading-relaxed ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              {t('parentHome.tutor.subtitle')}
            </p>
          </div>

          {/* Tutor Cards */}
          <div className="grid sm:grid-cols-2 gap-5 sm:gap-6 mb-10">

            {[
              { icon: Brain, key: 'remembers', id: 'tutor-remembers' },
              { icon: Heart, key: 'patient', id: 'tutor-patient' },
              { icon: Award, key: 'celebrates', id: 'tutor-celebrates' },
              { icon: Target, key: 'adapts', id: 'tutor-adapts' },
            ].map(({ icon: Icon, key, id }, index) => (
              <div
                key={key}
                id={id}
                data-animate
                className={`p-6 sm:p-7 rounded-2xl transition-all duration-300 hover:-translate-y-1 fade-in-section stagger-${index + 1} ${
                  visibleSections.has(id) ? 'visible' : ''
                } ${
                  isDarkMode
                    ? 'bg-purple-950/40 backdrop-blur-xl border border-purple-500/20 hover:border-purple-400/40'
                    : 'bg-white/70 backdrop-blur-xl border border-purple-200/50 hover:border-purple-300/70 shadow-lg hover:shadow-xl'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl flex-shrink-0">
                    <Icon
                      className={`w-5 h-5 ${
                        isDarkMode
                          ? 'text-purple-400'
                          : 'text-purple-600'
                      }`}
                    />
                  </div>

                  <div>
                    <h3
                      className={`text-base font-semibold mb-1 ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}
                    >
                      {t(`parentHome.tutor.${key}.title`)}
                    </h3>

                    <p
                      className={`text-sm leading-relaxed ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}
                    >
                      {t(`parentHome.tutor.${key}.description`)}
                    </p>
                  </div>
                </div>
              </div>
            ))}

          </div>

          {/* Quote */}
          <div
            className={`p-5 sm:p-6 rounded-xl border-l-4 ${
              isDarkMode
                ? 'bg-purple-950/30 border-purple-500/50'
                : 'bg-purple-50/70 border-purple-400'
            }`}
          >
            <p
              className={`text-sm sm:text-base italic leading-relaxed ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}
            >
              {t('parentHome.tutor.quote')}
            </p>
          </div>

        </div>
      </section>
    </>
  );
};

export default FeaturesSection;