import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, ChevronDown } from 'lucide-react';
import { getAvailableLanguages, changeLanguage, getLanguageDisplayName } from '../i18n';
import { languageService } from '../services/LanguageService';

interface LanguageSwitcherProps {
  className?: string;
  compact?: boolean;
  showFlag?: boolean;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  className = '', 
  compact = false,
  showFlag = true 
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

  const handleLanguageChange = async (languageCode: string) => {
    try {
      await changeLanguage(languageCode);
      setIsOpen(false);
      
      // Optional: Show success message
      console.log(`Language changed to: ${getLanguageDisplayName(languageCode)}`);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Current Language Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center space-x-2 px-3 py-2 rounded-lg
          bg-gray-100 dark:bg-gray-800 
          hover:bg-gray-200 dark:hover:bg-gray-700
          border border-gray-300 dark:border-gray-600
          text-gray-700 dark:text-gray-300
          transition-colors duration-200
          ${compact ? 'px-2 py-1 text-sm' : ''}
        `}
        aria-label={t('language.current')}
      >
        {!compact && <Languages size={16} />}
        {showFlag && <span>{currentLanguage.flag}</span>}
        {!compact && <span>{currentLanguage.name}</span>}
        <ChevronDown 
          size={14} 
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Language Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Dropdown Menu */}
          <div className={`
            absolute top-full mt-1 right-0 z-50
            bg-white dark:bg-gray-800 
            border border-gray-300 dark:border-gray-600
            rounded-lg shadow-lg
            min-w-[200px] max-h-64 overflow-y-auto
            ${compact ? 'min-w-[160px]' : ''}
          `}>
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-2">
                {t('language.select')}
              </div>
              
              {/* Language Options */}
              {availableLanguages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`
                    w-full flex items-center space-x-3 px-3 py-2 rounded-md
                    text-left text-sm
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    transition-colors duration-150
                    ${i18n.language === language.code 
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' 
                      : 'text-gray-700 dark:text-gray-300'
                    }
                  `}
                  aria-current={i18n.language === language.code ? 'true' : 'false'}
                >
                  <span className="text-lg">{language.flag}</span>
                  <span className="flex-1">{language.name}</span>
                  {i18n.language === language.code && (
                    <span className="text-xs text-purple-600 dark:text-purple-400">
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
            
            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-600 p-2">
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {availableLanguages.length} {t('language.available', { defaultValue: 'languages available' })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher;

