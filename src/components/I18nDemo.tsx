import React from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

/**
 * Demo component showing i18n integration
 * Add this to your header, settings, or any component where you want language switching
 */
const I18nDemo: React.FC = () => {
  const { t, i18n } = useTranslation();

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('common.settings')}
        </h2>
        
        {/* Language Switcher - Add this to your header or settings */}
        <LanguageSwitcher />
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('language.current')}
          </label>
          <p className="text-gray-600 dark:text-gray-400">
            {i18n.language} - {t('navigation.home')}
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {t('assistant.capabilities.document_reader')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {t('assistant.greeting')}
          </p>
        </div>

        {/* Example of how navigation would look */}
        <div className="flex space-x-4">
          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            {t('navigation.home')}
          </button>
          <button className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg">
            {t('navigation.games')}
          </button>
          <button className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg">
            {t('navigation.about')}
          </button>
        </div>

        {/* Example of common actions */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="flex space-x-2">
            <button className="px-3 py-1 text-sm bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
              {t('common.save')}
            </button>
            <button className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded">
              {t('common.cancel')}
            </button>
            <button className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
              {t('common.delete')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default I18nDemo;

