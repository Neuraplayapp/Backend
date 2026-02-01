import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, ChevronDown, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAvailableLanguages, changeLanguage, getLanguageDisplayName } from '../i18n';
import { languageService } from '../services/LanguageService';

interface GlobalLanguageButtonProps {
  className?: string;
  style?: 'floating' | 'header' | 'compact' | 'hero';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'inline';
  showLabel?: boolean;
}

const GlobalLanguageButton: React.FC<GlobalLanguageButtonProps> = ({ 
  className = '', 
  style = 'floating',
  position = 'top-right',
  showLabel = true
}) => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  // Get available languages with display info
  const availableLanguages = getAvailableLanguages();
  
  // Get current language info
  const currentLanguage = languageService.getLanguage(i18n.language) || {
    code: i18n.language,
    name: i18n.language,
    flag: '🌍'
  };
  
  // Initialize language system once
  React.useEffect(() => {
    // Only log on first load or language changes
    if (availableLanguages.length === 0) {
      console.error('🚨 No languages available!');
    }
  }, [availableLanguages.length]);

  const handleLanguageChange = async (languageCode: string) => {
    try {
      await changeLanguage(languageCode);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  const handleButtonClick = () => {
    setIsOpen(!isOpen);
  };

  // Style variants to match your NeuraPlay design
  const getButtonStyles = () => {
    const baseStyles = "relative transition-all duration-300 ease-out group";
    
    switch (style) {
      case 'floating':
        return `${baseStyles} 
          bg-gradient-to-br from-purple-600/90 to-violet-700/90 
          backdrop-blur-xl border border-purple-400/30 
          hover:from-purple-500/95 hover:to-violet-600/95
          hover:border-purple-300/50 hover:shadow-2xl hover:shadow-purple-500/25
          rounded-2xl px-4 py-3 shadow-lg
          hover:scale-105 active:scale-95
          pulse-glow`;
      
      case 'header':
        return `${baseStyles}
          bg-white/10 dark:bg-gray-900/20 
          backdrop-blur-md border border-white/20 dark:border-gray-700/30
          hover:bg-white/20 dark:hover:bg-gray-800/30
          hover:border-white/30 dark:hover:border-gray-600/40
          rounded-xl px-3 py-2 shadow-md
          hover:shadow-lg
          text-gray-700 dark:text-white`;
      
      case 'compact':
        return `${baseStyles}
          bg-purple-100/80 dark:bg-purple-900/20 
          hover:bg-purple-200/90 dark:hover:bg-purple-800/30
          border border-purple-300/50 dark:border-purple-600/30
          rounded-lg px-2 py-1.5 text-sm`;
      
      case 'hero':
        return `${baseStyles}
          bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600
          hover:from-violet-500 hover:via-purple-500 hover:to-indigo-500
          text-white shadow-xl hover:shadow-2xl
          rounded-2xl px-6 py-4 text-lg font-semibold
          border-2 border-white/20 hover:border-white/40
          hover:scale-110 active:scale-95
          transform transition-all duration-200`;
      
      default:
        return baseStyles;
    }
  };

  const getDropdownStyles = () => {
    switch (style) {
      case 'floating':
      case 'hero':
        return `
          bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl
          border border-purple-200/50 dark:border-purple-700/50
          shadow-2xl shadow-purple-500/20 rounded-2xl
          min-w-[280px] max-h-80 overflow-y-auto`;
      
      default:
        return `
          bg-white dark:bg-gray-800 
          border border-gray-300 dark:border-gray-600
          shadow-lg rounded-xl
          min-w-[240px] max-h-64 overflow-y-auto`;
    }
  };

  const getPositionStyles = () => {
    if (position === 'inline') return '';
    
    const basePosition = 'fixed z-50';
    
    switch (position) {
      case 'top-right':
        return `${basePosition} top-6 right-6`;
      case 'top-left':
        return `${basePosition} top-6 left-6`;
      case 'bottom-right':
        return `${basePosition} bottom-6 right-6`;
      case 'bottom-left':
        return `${basePosition} bottom-6 left-6`;
      default:
        return basePosition;
    }
  };

  const buttonContent = (
    <div className="flex items-center space-x-2">
      {style !== 'compact' && <Globe size={style === 'hero' ? 24 : 20} className="group-hover:rotate-12 transition-transform duration-300" />}
      
      <div className="flex items-center space-x-2">
        <span className={`text-${style === 'hero' ? '2xl' : 'lg'}`}>{currentLanguage.flag}</span>
        {showLabel && (
          <span className={`font-medium ${style === 'compact' ? 'text-sm' : ''}`}>
            {style === 'compact' ? currentLanguage.code.toUpperCase() : currentLanguage.name}
          </span>
        )}
      </div>
      
      <ChevronDown 
        size={style === 'hero' ? 20 : 16} 
        className={`transition-all duration-300 group-hover:text-purple-200 ${
          isOpen ? 'rotate-180' : ''
        }`} 
      />
    </div>
  );

  return (
    <div className={`${getPositionStyles()} ${className}`}>
      {/* Main Language Button */}
      <motion.button
        onClick={handleButtonClick}
        className={getButtonStyles()}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.95 }}
        aria-label={t('language.change') || 'Change Language'}
      >
        {buttonContent}
      </motion.button>

      {/* Language Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />
            
            {/* Dropdown Menu */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`absolute ${position === 'inline' || position?.includes('top') ? 'top-full mt-2' : 'bottom-full mb-2'} 
                ${position === 'inline' || position?.includes('right') ? 'right-0' : 'left-0'} z-[9999] ${getDropdownStyles()}`}
            >
              <div className="p-3">
                {/* Header */}
                <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <Languages size={18} className="text-purple-600 dark:text-purple-400" />
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {t('language.select') || 'Select Language'}
                  </span>
                </div>
                
                {/* Language Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {availableLanguages.map((language) => (
                    <motion.button
                      key={language.code}
                      onClick={() => handleLanguageChange(language.code)}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      className={`
                        flex items-center space-x-3 px-3 py-2.5 rounded-xl text-left
                        transition-all duration-200 group
                        ${i18n.language === language.code 
                          ? 'bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/50 dark:to-violet-900/50 text-purple-700 dark:text-purple-300 border-2 border-purple-300 dark:border-purple-600' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300 border-2 border-transparent'
                        }
                      `}
                      aria-current={i18n.language === language.code ? 'true' : 'false'}
                    >
                      <span className="text-xl group-hover:scale-110 transition-transform">
                        {language.flag}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{language.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                          {language.code}
                        </div>
                      </div>
                      {i18n.language === language.code && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="text-purple-600 dark:text-purple-400"
                        >
                          ✓
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
                
                {/* Footer */}
                <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                🌍 {availableLanguages.length} {availableLanguages.length === 1 ? 'language' : 'languages'} available
              </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add the pulse-glow CSS if floating style */}
      {style === 'floating' && (
        <style jsx>{`
          .pulse-glow {
            animation: pulseGlow 3s ease-in-out infinite alternate;
          }
          
          @keyframes pulseGlow {
            from { box-shadow: 0 0 20px rgba(147, 51, 234, 0.3); }
            to { box-shadow: 0 0 40px rgba(147, 51, 234, 0.6); }
          }
        `}</style>
      )}
    </div>
  );
};

export default GlobalLanguageButton;
