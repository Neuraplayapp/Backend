import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import { SUPPORTED_LANGUAGES, languageService } from '../services/LanguageService';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import sv from './locales/sv.json';
import ar from './locales/ar.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  sv: { translation: sv },
  ar: { translation: ar }
};
const supportedLanguages = Object.keys(resources);

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: supportedLanguages,
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'neuraplay-language'
    },
    backend: {
      loadPath: '/locales/{{lng}}.json',
      crossDomain: true
    },
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'em']
    },
    interpolation: { escapeValue: false },
    debug: import.meta.env.DEV,
    resources: import.meta.env.DEV ? resources : undefined
  });

export const getLanguageDisplayName = (code: string) => languageService.getDisplayName(code);

export const getAvailableLanguages = () =>
  supportedLanguages.map(code => ({
    code,
    name: languageService.getLanguage(code)?.name || code,
    flag: languageService.getLanguage(code)?.flag || '🌍',
    displayName: getLanguageDisplayName(code)
  }));

export const changeLanguage = (languageCode: string) =>
  supportedLanguages.includes(languageCode)
    ? i18n.changeLanguage(languageCode)
    : Promise.resolve(console.warn(`Language ${languageCode} not supported`));

export default i18n;