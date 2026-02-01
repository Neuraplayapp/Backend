/**
 * QUIZ AUDIO SERVICE
 * 
 * Uses ElevenLabs TTS for high-quality quiz audio
 * Falls back to Web Speech API if ElevenLabs unavailable
 * 
 * COST OPTIMIZATION:
 * - Uses turbo model (eleven_turbo_v2_5) for English - cheapest & fastest
 * - Uses multilingual only when needed for other languages
 * - Caches audio to avoid repeated API calls
 */

import { getTTSConfig } from '../config/elevenlabs';

interface AudioCacheEntry {
  audioUrl: string;
  timestamp: number;
}

class QuizAudioService {
  private static instance: QuizAudioService;
  private audioCache = new Map<string, AudioCacheEntry>();
  private currentAudio: HTMLAudioElement | null = null;
  private cacheMaxAge = 5 * 60 * 1000; // 5 minutes

  static getInstance(): QuizAudioService {
    if (!QuizAudioService.instance) {
      QuizAudioService.instance = new QuizAudioService();
    }
    return QuizAudioService.instance;
  }

  /**
   * Speak text using ElevenLabs (with Web Speech API fallback)
   * Uses the cheapest option: turbo model for English
   */
  async speak(text: string, language: string = 'en'): Promise<void> {
    if (!text || text.trim().length === 0) return;

    // Stop any current audio
    this.stop();

    // Check cache first
    const cacheKey = `${language}:${text.substring(0, 100)}`;
    const cached = this.audioCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheMaxAge) {
      console.log('🔊 QuizAudio: Using cached audio');
      return this.playAudioUrl(cached.audioUrl);
    }

    // Try ElevenLabs first (better quality)
    try {
      const audioUrl = await this.elevenLabsTTS(text, language);
      if (audioUrl) {
        // Cache for future use
        this.audioCache.set(cacheKey, { audioUrl, timestamp: Date.now() });
        return this.playAudioUrl(audioUrl);
      }
    } catch (error) {
      console.warn('⚠️ QuizAudio: ElevenLabs failed, falling back to Web Speech API', error);
    }

    // Fallback to Web Speech API
    return this.webSpeechTTS(text, language);
  }

  /**
   * ElevenLabs TTS - Uses getTTSConfig for proper voice/model selection
   * (EXACT same pattern as VocabularyChunkViewer which works reliably)
   */
  private async elevenLabsTTS(text: string, language: string): Promise<string | null> {
    // Use relative URLs in production, VITE_API_BASE only for local dev
    const envBase = import.meta.env.VITE_API_BASE || '';
    const apiBase = (typeof window !== 'undefined' && !window.location.hostname.includes('localhost'))
      ? '' // Production: use relative URLs
      : envBase.replace(/\/$/, '');
    
    // Get optimal TTS config (EXACT same as VocabularyChunkViewer which works)
    const ttsConfig = getTTSConfig(language as any);

    console.log(`🔊 QuizAudio: ElevenLabs TTS [${ttsConfig.modelId}] for "${text.substring(0, 30)}..."`);

    // EXACT same request as AIAssistantSmall which IMMUTABLY works
    const response = await fetch(`${apiBase}/api/elevenlabs-tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text.substring(0, 500), // Limit to save costs
        voiceId: ttsConfig.voiceId,
        modelId: ttsConfig.modelId,
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs error: ${response.status}`);
    }

    // API returns raw MP3 audio, not JSON - get as blob directly
    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
  }

  /**
   * Web Speech API fallback - free but lower quality
   */
  private webSpeechTTS(text: string, language: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85;
      utterance.lang = language;
      
      // Try to find a voice for the language
      const voices = window.speechSynthesis.getVoices();
      const langVoice = voices.find(v => v.lang.startsWith(language));
      if (langVoice) {
        utterance.voice = langVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(e);
      
      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Play audio from URL
   */
  private playAudioUrl(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.currentAudio = new Audio(url);
      this.currentAudio.onended = () => resolve();
      this.currentAudio.onerror = (e) => reject(e);
      this.currentAudio.play().catch(reject);
    });
  }

  /**
   * Stop current audio
   */
  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Convert base64 to Blob
   */
  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  /**
   * Clear audio cache
   */
  clearCache(): void {
    // Revoke blob URLs to free memory
    this.audioCache.forEach(entry => {
      if (entry.audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(entry.audioUrl);
      }
    });
    this.audioCache.clear();
  }
}

export const quizAudioService = QuizAudioService.getInstance();
export default QuizAudioService;

