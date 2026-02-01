/**
 * Language Utilities for Dynamic Content Generation
 * Provides current language context to AI generation services
 */
import i18n from '../i18n';
import { languageService, SUPPORTED_LANGUAGES } from '../services/LanguageService';

/**
 * Get the current language code
 */
export function getCurrentLanguage(): string {
  return i18n.language || localStorage.getItem('neuraplay-language') || 'en';
}

/**
 * Get the full language name for prompts
 */
export function getCurrentLanguageName(): string {
  const code = getCurrentLanguage();
  const lang = languageService.getLanguage(code);
  return lang?.name || 'English';
}

/**
 * Check if RTL language (Arabic, Hebrew, etc.)
 */
export function isRTLLanguage(code?: string): boolean {
  const langCode = code || getCurrentLanguage();
  const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
  return rtlLanguages.includes(langCode);
}

/**
 * Build language instruction for AI prompts
 * This tells the AI to generate content in the user's language
 */
export function getLanguageInstruction(): string {
  const code = getCurrentLanguage();
  const name = getCurrentLanguageName();
  
  // Don't add instruction for English (default)
  if (code === 'en') {
    return '';
  }
  
  return `

IMPORTANT: Generate ALL content in ${name} (${code.toUpperCase()}). 
The user's preferred language is ${name}. All text, titles, descriptions, explanations, and key points MUST be written in ${name}.
Do NOT write in English unless the user explicitly requests it.`;
}

/**
 * Build a language-aware system prompt prefix
 */
export function getLanguageSystemPrompt(): string {
  const code = getCurrentLanguage();
  const name = getCurrentLanguageName();
  
  if (code === 'en') {
    return '';
  }
  
  return `You are an AI assistant that communicates in ${name}. All your responses must be in ${name}. `;
}

/**
 * Get language-specific formatting instructions
 */
export function getLanguageFormattingHints(): string {
  const code = getCurrentLanguage();
  
  const hints: Record<string, string> = {
    'ar': 'Use right-to-left formatting conventions. Arabic numerals are acceptable.',
    'he': 'Use right-to-left formatting conventions.',
    'zh': 'Use simplified Chinese characters.',
    'ja': 'Use appropriate mix of hiragana, katakana, and kanji.',
    'ko': 'Use Hangul script throughout.',
    'ru': 'Use Cyrillic script throughout.',
    'kk': 'Use Cyrillic script (Kazakh variant).',
  };
  
  return hints[code] || '';
}

/**
 * Complete language context for AI generation
 */
export function getFullLanguageContext(): {
  code: string;
  name: string;
  instruction: string;
  isRTL: boolean;
  formattingHints: string;
} {
  const code = getCurrentLanguage();
  return {
    code,
    name: getCurrentLanguageName(),
    instruction: getLanguageInstruction(),
    isRTL: isRTLLanguage(code),
    formattingHints: getLanguageFormattingHints()
  };
}

export default {
  getCurrentLanguage,
  getCurrentLanguageName,
  isRTLLanguage,
  getLanguageInstruction,
  getLanguageSystemPrompt,
  getLanguageFormattingHints,
  getFullLanguageContext
};




