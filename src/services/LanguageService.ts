// Language Service - Centralized language support for NeuraPlay AI Platform
// Supports 50+ languages for TTS, STT, and multilingual AI processing

export interface LanguageOption {
  code: string;
  name: string;
  flag: string;
  region?: string;
  accuracy?: 'high' | 'medium' | 'good';
}

// Complete language support (50+ languages)
export const SUPPORTED_LANGUAGES: Record<string, LanguageOption> = {
  // Auto-detect
  'auto': { code: 'auto', name: 'Auto-Detect', flag: '🌍' },
  
  // High-accuracy languages (Primary)
  'en': { code: 'en', name: 'English', flag: '🇺🇸', accuracy: 'high' },
  'es': { code: 'es', name: 'Spanish', flag: '🇪🇸', accuracy: 'high' },
  'fr': { code: 'fr', name: 'French', flag: '🇫🇷', accuracy: 'high' },
  'de': { code: 'de', name: 'German', flag: '🇩🇪', accuracy: 'high' },
  'it': { code: 'it', name: 'Italian', flag: '🇮🇹', accuracy: 'high' },
  'pt': { code: 'pt', name: 'Portuguese', flag: '🇵🇹', accuracy: 'high' },
  'ru': { code: 'ru', name: 'Russian', flag: '🇷🇺', accuracy: 'high' },
  'ja': { code: 'ja', name: 'Japanese', flag: '🇯🇵', accuracy: 'high' },
  'ko': { code: 'ko', name: 'Korean', flag: '🇰🇷', accuracy: 'high' },
  'zh': { code: 'zh', name: 'Chinese (Mandarin)', flag: '🇨🇳', accuracy: 'high' },
  
  // Major international languages
  'ar': { code: 'ar', name: 'Arabic', flag: '🇸🇦', accuracy: 'high' },
  'hi': { code: 'hi', name: 'Hindi', flag: '🇮🇳', accuracy: 'good' },
  'th': { code: 'th', name: 'Thai', flag: '🇹🇭', accuracy: 'good' },
  'vi': { code: 'vi', name: 'Vietnamese', flag: '🇻🇳', accuracy: 'good' },
  'tr': { code: 'tr', name: 'Turkish', flag: '🇹🇷', accuracy: 'good' },
  
  // European languages
  'pl': { code: 'pl', name: 'Polish', flag: '🇵🇱', accuracy: 'good' },
  'nl': { code: 'nl', name: 'Dutch', flag: '🇳🇱', accuracy: 'good' },
  'sv': { code: 'sv', name: 'Swedish', flag: '🇸🇪', accuracy: 'high' },
  'da': { code: 'da', name: 'Danish', flag: '🇩🇰', accuracy: 'good' },
  'no': { code: 'no', name: 'Norwegian', flag: '🇳🇴', accuracy: 'good' },
  'fi': { code: 'fi', name: 'Finnish', flag: '🇫🇮', accuracy: 'good' },
  'cs': { code: 'cs', name: 'Czech', flag: '🇨🇿', accuracy: 'good' },
  'sk': { code: 'sk', name: 'Slovak', flag: '🇸🇰', accuracy: 'good' },
  'hu': { code: 'hu', name: 'Hungarian', flag: '🇭🇺', accuracy: 'good' },
  'ro': { code: 'ro', name: 'Romanian', flag: '🇷🇴', accuracy: 'good' },
  'bg': { code: 'bg', name: 'Bulgarian', flag: '🇧🇬', accuracy: 'good' },
  'hr': { code: 'hr', name: 'Croatian', flag: '🇭🇷', accuracy: 'good' },
  'sl': { code: 'sl', name: 'Slovenian', flag: '🇸🇮', accuracy: 'good' },
  'et': { code: 'et', name: 'Estonian', flag: '🇪🇪', accuracy: 'medium' },
  'lv': { code: 'lv', name: 'Latvian', flag: '🇱🇻', accuracy: 'medium' },
  'lt': { code: 'lt', name: 'Lithuanian', flag: '🇱🇹', accuracy: 'medium' },
  'uk': { code: 'uk', name: 'Ukrainian', flag: '🇺🇦', accuracy: 'good' },
  'be': { code: 'be', name: 'Belarusian', flag: '🇧🇾', accuracy: 'medium' },
  'mk': { code: 'mk', name: 'Macedonian', flag: '🇲🇰', accuracy: 'medium' },
  'sr': { code: 'sr', name: 'Serbian', flag: '🇷🇸', accuracy: 'good' },
  'bs': { code: 'bs', name: 'Bosnian', flag: '🇧🇦', accuracy: 'medium' },
  'sq': { code: 'sq', name: 'Albanian', flag: '🇦🇱', accuracy: 'medium' },
  'mt': { code: 'mt', name: 'Maltese', flag: '🇲🇹', accuracy: 'medium' },
  'is': { code: 'is', name: 'Icelandic', flag: '🇮🇸', accuracy: 'medium' },
  'ga': { code: 'ga', name: 'Irish', flag: '🇮🇪', accuracy: 'medium' },
  'cy': { code: 'cy', name: 'Welsh', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', accuracy: 'medium' },
  'eu': { code: 'eu', name: 'Basque', flag: '🇪🇸', region: 'Basque Country', accuracy: 'medium' },
  'ca': { code: 'ca', name: 'Catalan', flag: '🇪🇸', region: 'Catalonia', accuracy: 'good' },
  'gl': { code: 'gl', name: 'Galician', flag: '🇪🇸', region: 'Galicia', accuracy: 'medium' },
  
  // Asian and Pacific languages
  'id': { code: 'id', name: 'Indonesian', flag: '🇮🇩', accuracy: 'good' },
  'ms': { code: 'ms', name: 'Malay', flag: '🇲🇾', accuracy: 'good' },
  'tl': { code: 'tl', name: 'Filipino', flag: '🇵🇭', accuracy: 'good' },
  'sw': { code: 'sw', name: 'Swahili', flag: '🇰🇪', accuracy: 'medium' },
  'zu': { code: 'zu', name: 'Zulu', flag: '🇿🇦', accuracy: 'medium' },
  'af': { code: 'af', name: 'Afrikaans', flag: '🇿🇦', accuracy: 'medium' },
  'he': { code: 'he', name: 'Hebrew', flag: '🇮🇱', accuracy: 'good' },
  'fa': { code: 'fa', name: 'Persian (Farsi)', flag: '🇮🇷', accuracy: 'good' },
  'ur': { code: 'ur', name: 'Urdu', flag: '🇵🇰', accuracy: 'good' },
  'bn': { code: 'bn', name: 'Bengali', flag: '🇧🇩', accuracy: 'good' },
  'ta': { code: 'ta', name: 'Tamil', flag: '🇮🇳', region: 'Tamil Nadu', accuracy: 'good' },
  'te': { code: 'te', name: 'Telugu', flag: '🇮🇳', region: 'Andhra Pradesh', accuracy: 'medium' },
  'ml': { code: 'ml', name: 'Malayalam', flag: '🇮🇳', region: 'Kerala', accuracy: 'medium' },
  'kn': { code: 'kn', name: 'Kannada', flag: '🇮🇳', region: 'Karnataka', accuracy: 'medium' },
  'gu': { code: 'gu', name: 'Gujarati', flag: '🇮🇳', region: 'Gujarat', accuracy: 'medium' },
  
  // Central Asian languages
  'kk': { code: 'kk', name: 'Kazakh', flag: '🇰🇿', accuracy: 'good' }
};

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

export class LanguageService {
  private static instance: LanguageService;
  
  static getInstance(): LanguageService {
    if (!LanguageService.instance) {
      LanguageService.instance = new LanguageService();
    }
    return LanguageService.instance;
  }

  /**
   * Get all supported languages
   */
  getAllLanguages(): LanguageOption[] {
    return Object.values(SUPPORTED_LANGUAGES);
  }

  /**
   * Get languages grouped by accuracy/usage
   */
  getLanguagesByCategory(): {
    primary: LanguageOption[];
    popular: LanguageOption[];
    additional: LanguageOption[];
  } {
    const languages = this.getAllLanguages();
    
    return {
      primary: languages.filter(lang => lang.accuracy === 'high' || lang.code === 'auto'),
      popular: languages.filter(lang => lang.accuracy === 'good'),
      additional: languages.filter(lang => lang.accuracy === 'medium')
    };
  }

  /**
   * Get top 10 most commonly used languages
   */
  getTopLanguages(): LanguageOption[] {
    const topCodes = ['auto', 'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'zh'];
    return topCodes.map(code => SUPPORTED_LANGUAGES[code]).filter(Boolean);
  }

  /**
   * Get language by code
   */
  getLanguage(code: string): LanguageOption | null {
    return SUPPORTED_LANGUAGES[code] || null;
  }

  /**
   * Get language display name with flag
   */
  getDisplayName(code: string): string {
    const lang = this.getLanguage(code);
    if (!lang) return code;
    
    return `${lang.flag} ${lang.name}`;
  }

  /**
   * Check if language is supported
   */
  isSupported(code: string): boolean {
    return code in SUPPORTED_LANGUAGES;
  }

  /**
   * Get language codes for AssemblyAI (STT)
   */
  getSTTSupportedLanguages(): LanguageOption[] {
    // AssemblyAI supports most major languages
    return this.getAllLanguages().filter(lang => 
      lang.accuracy === 'high' || lang.accuracy === 'good' || lang.code === 'auto'
    );
  }

  /**
   * Get language codes for ElevenLabs (TTS)
   */
  getTTSSupportedLanguages(): LanguageOption[] {
    // ElevenLabs supports all our languages
    return this.getAllLanguages();
  }

  /**
   * Search languages by name or code
   */
  searchLanguages(query: string): LanguageOption[] {
    const searchTerm = query.toLowerCase();
    return this.getAllLanguages().filter(lang =>
      lang.name.toLowerCase().includes(searchTerm) ||
      lang.code.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Get the current user language from i18n or localStorage
   */
  getCurrentLanguage(): LanguageOption | null {
    try {
      // Try i18n first
      const i18nLang = (window as any).i18n?.language;
      if (i18nLang && this.isSupported(i18nLang)) {
        return this.getLanguage(i18nLang);
      }
      
      // Fallback to localStorage
      const storedLang = localStorage.getItem('neuraplay-language');
      if (storedLang && this.isSupported(storedLang)) {
        return this.getLanguage(storedLang);
      }
      
      // Default to English
      return this.getLanguage('en');
    } catch (error) {
      console.warn('⚠️ LanguageService: Error getting current language:', error);
      return this.getLanguage('en');
    }
  }

  /**
   * Get current language code (simple string)
   */
  getCurrentLanguageCode(): string {
    const lang = this.getCurrentLanguage();
    return lang?.code || 'en';
  }
}

// Export singleton instance
export const languageService = LanguageService.getInstance();

// Export legacy format for backward compatibility
export const SUPPORTED_LANGUAGES_LEGACY = Object.fromEntries(
  Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => [code, lang.name])
);
