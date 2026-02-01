import { Howl } from 'howler';

export interface ElevenLabsConfig {
    agentId: string;
    voices: {
        // Primary multilingual voices that work with eleven_multilingual_v2
        multilingual: string;
        english: string;
        russian: string;
        arabic: string;
        swedish: string;
        kazakh: string;  // Kazakh language support
    };
    models: {
        turbo: string;
        multilingual: string;  // Use for non-English languages
        standard: string;
    };
    apiKey: string;
}

export const elevenLabsConfig: ElevenLabsConfig = {
    agentId: 'agent_3801kd7q9ar1et7tp7srd31739z9', // Updated agent ID
    voices: {
        // Rachel - ElevenLabs default multilingual voice (works great with all languages)
        multilingual: '21m00Tcm4TlvDq8ikWAM',
        english: '8LVfoRdkh4zgjr8v5ObE',
        russian: 'RUB3PhT3UqHowKru61Ns',
        arabic: 'mRdG9GYEjJmIzqbYTidv',
        // Swedish voice with proper Swedish pronunciation
        swedish: 'LcBivrWPNJfG7tkEwHPJ',
        // Kazakh - using multilingual voice with good Kazakh support
        kazakh: '21m00Tcm4TlvDq8ikWAM'
    },
    models: {
        turbo: 'eleven_turbo_v2_5',          // Fast, English-optimized
        multilingual: 'eleven_multilingual_v2', // Supports 29 languages
        standard: 'eleven_multilingual_v2'
    },
    apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY || ''
};

// Check for any ElevenLabs API key at build time
const isElevenLabsConfigured = !!import.meta.env.VITE_ELEVENLABS_API_KEY;

// Log the availability of the key during development for debugging purposes
if (import.meta.env.DEV) {
  console.log('ElevenLabs API key configured:', isElevenLabsConfigured);
  console.log('Checked variables: VITE_ELEVENLABS_API_KEY');
}

const audioCache = new Map<string, Howl>();

// Debug: Log available environment variables (development only)
if (import.meta.env.DEV) {
  console.log('Available env vars:', Object.keys(import.meta.env));
  console.log('ElevenLabs API Key available:', isElevenLabsConfigured);
  console.log('⚠️ IMPORTANT: Frontend needs VITE_ELEVENLABS_API_KEY in environment variables');
}

// ElevenLabs Multilingual v2 supported languages (29 languages)
export const ELEVENLABS_SUPPORTED_LANGUAGES = [
  'en', // English
  'ja', // Japanese
  'zh', // Chinese
  'de', // German
  'hi', // Hindi
  'fr', // French
  'ko', // Korean
  'pt', // Portuguese
  'it', // Italian
  'es', // Spanish
  'id', // Indonesian
  'nl', // Dutch
  'tr', // Turkish
  'fil', // Filipino
  'pl', // Polish
  'sv', // Swedish
  'bg', // Bulgarian
  'ro', // Romanian
  'ar', // Arabic
  'cs', // Czech
  'el', // Greek
  'fi', // Finnish
  'hr', // Croatian
  'ms', // Malay
  'sk', // Slovak
  'da', // Danish
  'ta', // Tamil
  'uk', // Ukrainian
  'ru', // Russian
];

/**
 * Check if a language is natively supported by ElevenLabs Multilingual v2
 */
export const isLanguageSupported = (languageCode: string): boolean => {
  const code = languageCode.toLowerCase().split('-')[0]; // Handle en-US -> en
  return ELEVENLABS_SUPPORTED_LANGUAGES.includes(code);
};

/**
 * Get the appropriate voice ID based on language
 * Uses multilingual voice for non-English to ensure proper accent/pronunciation
 */
export const getVoiceId = (language: string = 'english'): string => {
    // For specific languages with dedicated voices, use those
    if (language === 'russian') return elevenLabsConfig.voices.russian;
    if (language === 'arabic') return elevenLabsConfig.voices.arabic;
    if (language === 'english') return elevenLabsConfig.voices.english;
    if (language === 'swedish') return elevenLabsConfig.voices.swedish;
    if (language === 'kazakh') return elevenLabsConfig.voices.kazakh;
    
    // For all other languages, use the multilingual voice
    return elevenLabsConfig.voices.multilingual;
};

/**
 * Get the appropriate model based on language
 * Uses multilingual model for non-English languages
 */
export const getModelForLanguage = (languageCode: string): string => {
    const code = languageCode.toLowerCase().split('-')[0];
    
    // Use turbo model for English only (faster)
    if (code === 'en') {
        return elevenLabsConfig.models.turbo;
    }
    
    // Use multilingual model for all other languages (including auto)
    return elevenLabsConfig.models.multilingual;
};

export const getAgentId = (): string => {
    const agentId = elevenLabsConfig.agentId;
    
    // Validate agent ID format (only log errors, not debug info)
    if (!agentId) {
        console.error('❌ ElevenLabs agent ID is empty or undefined');
        return '';
    }
    
    if (!agentId.startsWith('agent_')) {
        console.error('❌ ElevenLabs agent ID does not have proper format (should start with "agent_")');
        console.error('❌ Current agent ID:', agentId);
    }
    
    return agentId;
};

export const getApiKey = (): string => {
    const apiKey = elevenLabsConfig.apiKey;
    
    // Validate API key format (only log errors, not debug info)
    if (!apiKey) {
        console.error('❌ ElevenLabs API key is missing');
        console.error('❌ Please set VITE_ELEVENLABS_API_KEY in your environment variables');
        return '';
    }
    
    if (!apiKey.startsWith('sk_')) {
        console.warn('⚠️ ElevenLabs API key format may be incorrect (should start with "sk_")');
        console.warn('⚠️ Current API key starts with:', apiKey.substring(0, 5) + '...');
    }
    
    return apiKey;
};

export const getModelId = (model: 'turbo' | 'standard' | 'multilingual' = 'turbo'): string => {
    return elevenLabsConfig.models[model];
};

// Map language codes to voice types (for backward compatibility)
export type VoiceLanguage = 'english' | 'russian' | 'arabic' | 'swedish' | 'kazakh' | 'multilingual';

/**
 * Map language codes to voice selection
 * IMPORTANT: For multilingual support, we return 'multilingual' for most languages
 * The actual language is determined by the model, not the voice
 */
export const mapLanguageToVoice = (languageCode: string): VoiceLanguage => {
    const code = languageCode.toLowerCase().split('-')[0];
    
    switch (code) {
        case 'ar':
            return 'arabic';
        case 'ru':
            return 'russian';
        case 'sv':
            return 'swedish';
        case 'kk':
            return 'kazakh';
        case 'en':
            return 'english';
        case 'auto':
            return 'multilingual'; // Use multilingual voice for auto (will be overridden by detected language)
        default:
            // For all other languages, use multilingual voice
            return 'multilingual';
    }
};

/**
 * Get TTS configuration for a specific language
 * Returns optimal voice, model, and settings for the language
 */
export interface TTSConfig {
    voiceId: string;
    modelId: string;
    languageCode: string;
    isMultilingual: boolean;
}

export const getTTSConfig = (languageCode: string): TTSConfig => {
    const code = languageCode.toLowerCase().split('-')[0];
    const isEnglish = code === 'en'; // Auto is NOT treated as English anymore
    const voiceType = mapLanguageToVoice(code);
    
    return {
        voiceId: getVoiceId(voiceType),
        modelId: isEnglish ? elevenLabsConfig.models.turbo : elevenLabsConfig.models.multilingual,
        languageCode: code, // Keep original code, don't force auto to 'en'
        isMultilingual: !isEnglish
    };
};
