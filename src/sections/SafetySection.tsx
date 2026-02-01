import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, Shield, Eye, Users } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const SafetySection: React.FC = () => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();

  const safetyFeatures = [
    {
      icon: Lock,
      title: t('parentHome.safety.encryption.title'),
      description: t('parentHome.safety.encryption.description'),
    },
    {
      icon: Shield,
      title: t('parentHome.safety.content.title'),
      description: t('parentHome.safety.content.description'),
    },
    {
      icon: Eye,
      title: t('parentHome.safety.privacy.title'),
      description: t('parentHome.safety.privacy.description'),
    },
    {
      icon: Users,
      title: t('parentHome.safety.control.title'),
      description: t('parentHome.safety.control.description'),
    },
  ];

  return (
    <section
      className={`py-20 sm:py-24 relative overflow-hidden ${
        isDarkMode
          ? 'bg-gradient-to-b from-[#0f0f1a] via-[#1a1a2e] to-[#1a1a2e]'
          : 'bg-gradient-to-b from-white via-purple-50/30 to-purple-50/50'
      }`}
    >
      {/* Background Orb */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[350px] h-[350px] rounded-full blur-3xl opacity-50"
          style={{
            background: isDarkMode
              ? 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(196,181,253,0.4) 0%, transparent 70%)',
            top: '20%',
            right: '-5%',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2
            className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-4 tracking-tight ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            {t('parentHome.safety.title')}
          </h2>

          <p
            className={`text-sm sm:text-base max-w-2xl mx-auto leading-relaxed ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            {t('parentHome.safety.subtitle')}
          </p>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
          {safetyFeatures.map((feature, index) => (
            <div
              key={index}
              className={`p-6 sm:p-7 rounded-2xl transition-all duration-300 hover:-translate-y-1 ${
                isDarkMode
                  ? 'bg-purple-950/40 backdrop-blur-xl border border-purple-500/20 hover:border-purple-400/40'
                  : 'bg-white/70 backdrop-blur-xl border border-purple-200/50 hover:border-purple-300/70 shadow-lg hover:shadow-xl'
              }`}
            >
              <div className="flex items-start gap-4">

                {/* Icon */}
                <div className="p-2.5 rounded-xl flex-shrink-0">
                  <feature.icon
                    className={`w-5 h-5 ${
                      isDarkMode ? 'text-purple-400' : 'text-purple-600'
                    }`}
                  />
                </div>

                {/* Text */}
                <div>
                  <h3
                    className={`text-lg font-semibold mb-2 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {feature.title}
                  </h3>

                  <p
                    className={`text-sm leading-relaxed ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    {feature.description}
                  </p>
                </div>

              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default SafetySection;