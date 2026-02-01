// Vocabulary Chunk Viewer - Displays vocabulary with native, romanized, pronunciation, and meaning
// Features: TTS for pronunciation (ElevenLabs with browser fallback), table/list display
// NOTE: NO internal navigation - parent ChunkContentViewer handles all navigation
// TTS logic copied from ChunkContentViewer which works in introduction

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Volume2,
  VolumeX,
  CheckCircle,
  Loader2,
  List,
  LayoutGrid
} from 'lucide-react';
import type { CourseChunk } from '../types/LearningModule.types';
import { getTTSConfig } from '../config/elevenlabs';

interface VocabularyChunkViewerProps {
  chunk: CourseChunk;
  isDarkMode: boolean;
  onComplete: () => void;
}

export const VocabularyChunkViewer: React.FC<VocabularyChunkViewerProps> = ({
  chunk,
  isDarkMode,
  onComplete
}) => {
  const vocabularyItems = chunk.vocabularyItems || [];
  const [learnedItems, setLearnedItems] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // 🔊 TTS state - matching ChunkContentViewer exactly
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingTTS, setIsLoadingTTS] = useState(false);
  const [speakingItemIndex, setSpeakingItemIndex] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Auto-complete when all items learned
  useEffect(() => {
    if (vocabularyItems.length > 0 && learnedItems.size === vocabularyItems.length) {
      onComplete();
    }
  }, [learnedItems.size, vocabularyItems.length, onComplete]);

  // Get voice for browser TTS fallback
  const getVoiceForLanguage = () => {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    // Try to find a Spanish voice first (common case), then any available
    return voices.find(v => v.lang.startsWith('es')) || 
           voices.find(v => v.lang.startsWith('en')) || 
           voices[0];
  };

  // Browser Web Speech API fallback - copied from ChunkContentViewer
  const fallbackToWebSpeech = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = getVoiceForLanguage();
    
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }
    
    utterance.rate = 0.9;
    utterance.pitch = 1;
    
    utterance.onstart = () => {
      setIsSpeaking(true);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingItemIndex(null);
    };
    
    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingItemIndex(null);
    };
    
    speechSynthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // 🔊 ElevenLabs TTS - EXACT same logic as ChunkContentViewer (which works in intro)
  const speakWord = async (text: string, itemIndex?: number) => {
    // Stop any current playback first
    stopSpeaking();
    
    setIsLoadingTTS(true);
      if (itemIndex !== undefined) setSpeakingItemIndex(itemIndex);
      
    try {
      // Detect language for proper voice selection
      const cyrillicPattern = /[\u0400-\u04FF]/;
      const arabicPattern = /[\u0600-\u06FF]/;
      const chinesePattern = /[\u4E00-\u9FFF]/;
      const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF]/;
      const hebrewPattern = /[\u0590-\u05FF]/;
      const koreanPattern = /[\uAC00-\uD7AF]/;
      
      let languageCode = 'en';
      if (cyrillicPattern.test(text)) languageCode = 'ru';
      else if (arabicPattern.test(text)) languageCode = 'ar';
      else if (chinesePattern.test(text)) languageCode = 'zh';
      else if (japanesePattern.test(text)) languageCode = 'ja';
      else if (hebrewPattern.test(text)) languageCode = 'he';
      else if (koreanPattern.test(text)) languageCode = 'ko';
      
      // Get optimal TTS config
      const ttsConfig = getTTSConfig(languageCode as any);
      
      console.log('🔊 VocabularyChunkViewer TTS: Using ElevenLabs', { 
        languageCode, 
        voiceId: ttsConfig.voiceId,
        textLength: text.length 
      });
      
      // EXACT same request as AIAssistantSmall which IMMUTABLY works
      const response = await fetch('/api/elevenlabs-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
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
        throw new Error(`ElevenLabs TTS failed: ${response.status}`);
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      // Set up event handlers BEFORE playing (matching AIAssistantSmall pattern)
      audio.onended = () => {
        setIsSpeaking(false);
        setIsLoadingTTS(false);
        setSpeakingItemIndex(null);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };
      
      audio.onerror = (error) => {
        console.error('🔊 Audio playback error, falling back to browser TTS:', error);
        setIsSpeaking(false);
        setIsLoadingTTS(false);
        setSpeakingItemIndex(null);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        // Fallback to browser TTS
        fallbackToWebSpeech(text);
      };
      
      // Play directly (don't wait for oncanplaythrough - matches AIAssistantSmall)
      setIsSpeaking(true);
      setIsLoadingTTS(false);
      await audio.play();
      
    } catch (error) {
      console.error('🔊 ElevenLabs TTS failed, using browser fallback:', error);
      setIsSpeaking(false);
      setIsLoadingTTS(false);
      // Fallback to browser TTS
      fallbackToWebSpeech(text);
    }
  };
  
  // Stop TTS - matching ChunkContentViewer exactly
  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
    setIsLoadingTTS(false);
    setSpeakingItemIndex(null);
  };

  const toggleLearned = (idx: number) => {
    setLearnedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(idx)) newSet.delete(idx);
      else newSet.add(idx);
      return newSet;
    });
  };

  if (vocabularyItems.length === 0) {
    return (
      <div className={`p-6 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
          No vocabulary items in this section.
        </p>
      </div>
    );
  }

    return (
      <div className="space-y-4">
      {/* Header with view toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {chunk.title || 'Vocabulary'}
          </h4>
          <span className={`text-sm px-2 py-0.5 rounded-full ${
            isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
          }`}>
            {learnedItems.size}/{vocabularyItems.length} learned
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'table'
                ? isDarkMode ? 'bg-violet-500/30 text-violet-300' : 'bg-violet-100 text-violet-700'
                : isDarkMode ? 'text-gray-400 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-100'
            }`}
            title="Table View"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'cards'
                ? isDarkMode ? 'bg-violet-500/30 text-violet-300' : 'bg-violet-100 text-violet-700'
                : isDarkMode ? 'text-gray-400 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-100'
            }`}
            title="Card View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TABLE VIEW - Clean pedagogical table like the vocabulary screenshot */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto rounded-xl">
          <table className={`w-full text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
            <thead>
              <tr className={`${isDarkMode ? 'bg-violet-500/20' : 'bg-violet-50'}`}>
                <th className={`px-4 py-3 text-left font-semibold ${isDarkMode ? 'text-violet-300' : 'text-violet-700'}`}>
                  Word
                </th>
                <th className={`px-4 py-3 text-left font-semibold ${isDarkMode ? 'text-violet-300' : 'text-violet-700'}`}>
                  Romanized
                </th>
                <th className={`px-4 py-3 text-left font-semibold ${isDarkMode ? 'text-violet-300' : 'text-violet-700'}`}>
                  Pronunciation
                </th>
                <th className={`px-4 py-3 text-left font-semibold ${isDarkMode ? 'text-violet-300' : 'text-violet-700'}`}>
                  Meaning
                </th>
                <th className={`px-4 py-3 text-center font-semibold ${isDarkMode ? 'text-violet-300' : 'text-violet-700'}`}>
                  🔊
                </th>
                <th className={`px-4 py-3 text-center font-semibold ${isDarkMode ? 'text-violet-300' : 'text-violet-700'}`}>
                  ✓
                </th>
              </tr>
            </thead>
            <tbody>
              {vocabularyItems.map((item, idx) => (
                <motion.tr
                  key={idx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`${
                    learnedItems.has(idx)
                      ? isDarkMode ? 'bg-green-500/10' : 'bg-green-50'
                      : idx % 2 === 0
                        ? isDarkMode ? 'bg-white/5' : 'bg-gray-50/50'
                        : isDarkMode ? 'bg-white/[0.02]' : 'bg-white'
                  } hover:${isDarkMode ? 'bg-white/10' : 'bg-violet-50/50'} transition-colors`}
                >
                  <td className={`px-4 py-3 font-medium ${isDarkMode ? 'border-b border-white/10' : 'border-b border-gray-100'}`}>
                    {item.native}
                  </td>
                  <td className={`px-4 py-3 ${isDarkMode ? 'text-violet-400 border-b border-white/10' : 'text-violet-600 border-b border-gray-100'}`}>
                    {item.romanized}
                  </td>
                  <td className={`px-4 py-3 ${isDarkMode ? 'text-gray-400 border-b border-white/10' : 'text-gray-500 border-b border-gray-100'}`}>
                    [{item.pronunciation}]
                  </td>
                  <td className={`px-4 py-3 ${isDarkMode ? 'border-b border-white/10' : 'border-b border-gray-100'}`}>
                    {item.meaning}
                  </td>
                  <td className={`px-4 py-3 text-center ${isDarkMode ? 'border-b border-white/10' : 'border-b border-gray-100'}`}>
                    <button
                      onClick={() => speakingItemIndex === idx && isSpeaking ? stopSpeaking() : speakWord(item.native, idx)}
                      disabled={isLoadingTTS && speakingItemIndex !== idx}
                      className={`p-1.5 rounded-lg transition-colors ${
                        speakingItemIndex === idx && (isSpeaking || isLoadingTTS)
                          ? 'bg-violet-500 text-white'
                          : isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                      } ${isLoadingTTS && speakingItemIndex !== idx ? 'opacity-50' : ''}`}
                    >
                      {speakingItemIndex === idx && isLoadingTTS ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : speakingItemIndex === idx && isSpeaking ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                  <td className={`px-4 py-3 text-center ${isDarkMode ? 'border-b border-white/10' : 'border-b border-gray-100'}`}>
                    <button
                      onClick={() => toggleLearned(idx)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        learnedItems.has(idx)
                          ? 'text-green-500'
                          : isDarkMode ? 'text-gray-500 hover:bg-white/10' : 'text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CARD VIEW - Simple grid of cards, NO navigation */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vocabularyItems.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`p-4 rounded-xl border transition-colors ${
                learnedItems.has(idx)
                  ? isDarkMode ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'
                  : isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {item.native}
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-violet-400' : 'text-violet-600'}`}>
                      {item.romanized}
                  </p>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => speakingItemIndex === idx && isSpeaking ? stopSpeaking() : speakWord(item.native, idx)}
                    disabled={isLoadingTTS && speakingItemIndex !== idx}
                    className={`p-1.5 rounded-lg ${
                      speakingItemIndex === idx && (isSpeaking || isLoadingTTS)
                        ? 'bg-violet-500 text-white'
                        : isDarkMode ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                    }`}
                  >
                    {speakingItemIndex === idx && isLoadingTTS ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : speakingItemIndex === idx && isSpeaking ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => toggleLearned(idx)}
                    className={`p-1.5 rounded-lg ${
                      learnedItems.has(idx) ? 'text-green-500' : isDarkMode ? 'text-gray-500 hover:bg-white/10' : 'text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className={`text-xs mb-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                [{item.pronunciation}]
              </p>
              <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                = {item.meaning}
              </p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Success message when all learned */}
      {learnedItems.size === vocabularyItems.length && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl text-center ${isDarkMode ? 'bg-green-500/20' : 'bg-green-50'}`}
        >
          <p className={`font-medium ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
            🎉 Great job! You've learned all {vocabularyItems.length} words!
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default VocabularyChunkViewer;
