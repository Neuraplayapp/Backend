// Chunk Content Viewer - Displays a single bite-sized learning chunk
// Features: Content display, TTS narration, progress tracking, visual illustrations
// Enhanced: Quiz and Vocabulary chunk rendering with comprehension checking
// NOW INTEGRATES WITH: ChunkActivityTracker for comprehensive activity tracking

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Clock,
  Target,
  Lightbulb,
  Eye,
  PenTool,
  RefreshCw,
  Sparkles,
  BookOpen,
  Loader2,
  HelpCircle,
  Lock,
  Image as ImageIcon
} from 'lucide-react';
import type { CourseChunk, CourseSection } from '../types/LearningModule.types';
import { languageService } from '../services/LanguageService';
import QuizChunkViewer from './QuizChunkViewer';
import EducationalMarkdownRenderer from './EducationalMarkdownRenderer';
import VocabularyChunkViewer from './VocabularyChunkViewer';
import KeyTermsViewer from './KeyTermsViewer';
import VerticalCardQuiz from './VerticalCardQuiz';
import { chunkActivityTracker } from '../services/ChunkActivityTracker';
import { getTTSConfig } from '../config/elevenlabs';

interface ChunkContentViewerProps {
  chunk: CourseChunk;
  chunkIndex: number;
  totalChunks: number;
  sectionTitle: string;
  isDarkMode: boolean;
  onComplete: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onBack: () => void;
  isCompleted: boolean;
  canGoNext: boolean;
  canGoPrevious: boolean;
  // For flashcard generation from quizzes & activity tracking
  userId?: string;
  moduleId?: string;
  moduleName?: string;
  // For activity tracking
  sectionIndex?: number;
}

// Get icon for chunk type
const getChunkIcon = (type: CourseChunk['type']) => {
  switch (type) {
    case 'hook': return Sparkles;
    case 'concept': return Lightbulb;
    case 'example': return Target;
    case 'visual': return Eye;
    case 'practice': return PenTool;
    case 'recap': return RefreshCw;
    case 'quiz': return HelpCircle;
    case 'vocabulary': return BookOpen;
    default: return BookOpen;
  }
};

// Get gradient for chunk type
const getChunkGradient = (type: CourseChunk['type']) => {
  switch (type) {
    case 'hook': return 'from-amber-500 to-orange-500';
    case 'concept': return 'from-violet-500 to-purple-500';
    case 'example': return 'from-green-500 to-emerald-500';
    case 'visual': return 'from-cyan-500 to-blue-500';
    case 'practice': return 'from-pink-500 to-rose-500';
    case 'recap': return 'from-indigo-500 to-violet-500';
    default: return 'from-gray-500 to-slate-500';
  }
};

// Get friendly name for chunk type
const getChunkTypeName = (type: CourseChunk['type']) => {
  switch (type) {
    case 'hook': return 'Introduction';
    case 'concept': return 'Core Concept';
    case 'example': return 'Example';
    case 'visual': return 'Visualization';
    case 'practice': return 'Practice';
    case 'recap': return 'Review';
    case 'quiz': return 'Comprehension Check';
    case 'vocabulary': return 'Vocabulary';
    default: return 'Learn';
  }
};

export const ChunkContentViewer: React.FC<ChunkContentViewerProps> = ({
  chunk,
  chunkIndex,
  totalChunks,
  sectionTitle,
  isDarkMode,
  onComplete,
  onNext,
  onPrevious,
  onBack,
  isCompleted,
  canGoNext,
  canGoPrevious,
  userId,
  moduleId,
  moduleName,
  sectionIndex = 0
}) => {
  // 🐛 DEBUG: Log chunk data to diagnose quiz display issues
  console.log(`📦 ChunkContentViewer rendering:`, {
    chunkId: chunk.id,
    chunkType: chunk.type,
    hasQuizQuestions: !!chunk.quizQuestions,
    quizQuestionsCount: chunk.quizQuestions?.length || 0,
    quizQuestionsPreview: chunk.quizQuestions?.slice(0, 1)
  });
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingTTS, setIsLoadingTTS] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const [hasMarkedComplete, setHasMarkedComplete] = useState(isCompleted);
  const [generatedImages, setGeneratedImages] = useState<Map<string, string>>(new Map());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const [quizGatePassed, setQuizGatePassed] = useState(!chunk.quizGate?.enabled);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const readTimerRef = useRef<NodeJS.Timeout | null>(null);
  const chunkStartTimeRef = useRef<number>(Date.now());
  
  // 📊 Track chunk start on mount
  useEffect(() => {
    chunkStartTimeRef.current = Date.now();
    if (userId && moduleId) {
      chunkActivityTracker.trackActivity({
        userId,
        moduleId,
        moduleName: moduleName || 'Course',
        sectionIndex,
        sectionTitle,
        chunkIndex,
        chunkId: chunk.id || `chunk_${moduleId}_${sectionIndex}_${chunkIndex}`,
        chunkTitle: chunk.title || 'Chunk',
        chunkType: chunk.type || 'content',
        activityType: 'chunk_started',
        data: {
          conceptCovered: chunk.keyPoint || chunk.title
        }
      }).catch(console.warn);
    }
  }, [userId, moduleId, chunk.id, chunkIndex]);

  // Generate inline images for vocabulary items with visual concepts
  const generateInlineImage = useCallback(async (vocabItem: any, itemKey: string) => {
    if (!vocabItem.imagePrompt || !vocabItem.isVisualConcept) return;
    if (generatedImages.has(itemKey) || loadingImages.has(itemKey)) return;
    
    setLoadingImages(prev => new Set(prev).add(itemKey));
    
    try {
      // Use the ToolRegistry to generate image
      const { toolRegistry } = await import('../services/ToolRegistry');
      const response = await toolRegistry.execute('generate-image', {
        prompt: vocabItem.imagePrompt,
        style: 'digital-art',
        size: '512x512'
      }, {});
      
      if (response?.imageUrl) {
        setGeneratedImages(prev => new Map(prev).set(itemKey, response.imageUrl));
      }
    } catch (error) {
      console.error('Failed to generate inline image:', error);
    } finally {
      setLoadingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  }, [generatedImages, loadingImages]);

  // Generate images for vocabulary items on mount
  useEffect(() => {
    if (chunk.vocabularyItems) {
      chunk.vocabularyItems.forEach((item, idx) => {
        if (item.isVisualConcept && item.imagePrompt) {
          generateInlineImage(item, `vocab_${chunk.id}_${idx}`);
        }
      });
    }
  }, [chunk.id, chunk.vocabularyItems, generateInlineImage]);

  const Icon = getChunkIcon(chunk.type);
  const gradient = getChunkGradient(chunk.type);
  const estimatedMinutes = Math.ceil((chunk.estimatedSeconds || 90) / 60);

  // Auto-progress timer for reading
  useEffect(() => {
    const duration = (chunk.estimatedSeconds || 90) * 1000;
    const interval = 100; // Update every 100ms
    const increment = 100 / (duration / interval);
    
    readTimerRef.current = setInterval(() => {
      setReadProgress(prev => {
        if (prev >= 100) {
          if (readTimerRef.current) clearInterval(readTimerRef.current);
          return 100;
        }
        return prev + increment;
      });
    }, interval);

    return () => {
      if (readTimerRef.current) clearInterval(readTimerRef.current);
    };
  }, [chunk.id, chunk.estimatedSeconds]);

  // Mark as complete when read progress hits threshold
  useEffect(() => {
    if (readProgress >= 80 && !hasMarkedComplete) {
      setHasMarkedComplete(true);
      onComplete();
      
      // 📊 Track chunk completion
      if (userId && moduleId) {
        const readingTimeMs = Date.now() - chunkStartTimeRef.current;
        chunkActivityTracker.trackActivity({
          userId,
          moduleId,
          moduleName: moduleName || 'Course',
          sectionIndex,
          sectionTitle,
          chunkIndex,
          chunkId: chunk.id || `chunk_${moduleId}_${sectionIndex}_${chunkIndex}`,
          chunkTitle: chunk.title || 'Chunk',
          chunkType: chunk.type || 'content',
          activityType: 'chunk_completed',
          data: {
            readProgress,
            readingTimeMs,
            conceptCovered: chunk.keyPoint || chunk.title
          }
        }).catch(console.warn);
      }
    }
  }, [readProgress, hasMarkedComplete, onComplete, userId, moduleId, chunk]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  // Get language-appropriate voice
  const getVoiceForLanguage = (): SpeechSynthesisVoice | null => {
    const currentLang = languageService.getCurrentLanguage();
    const langCode = currentLang?.code || 'en';
    
    const voices = window.speechSynthesis.getVoices();
    
    // Map language codes to BCP 47 tags
    const langMapping: Record<string, string[]> = {
      'ar': ['ar-SA', 'ar-EG', 'ar'],
      'es': ['es-ES', 'es-MX', 'es'],
      'fr': ['fr-FR', 'fr-CA', 'fr'],
      'de': ['de-DE', 'de'],
      'zh': ['zh-CN', 'zh-TW', 'zh'],
      'ja': ['ja-JP', 'ja'],
      'ko': ['ko-KR', 'ko'],
      'en': ['en-US', 'en-GB', 'en']
    };

    const targetLangs = langMapping[langCode] || langMapping['en'];
    
    // Try to find a voice matching the language
    for (const targetLang of targetLangs) {
      const voice = voices.find(v => v.lang.startsWith(targetLang));
      if (voice) return voice;
    }
    
    // Fallback to any matching base language
    const baseVoice = voices.find(v => v.lang.startsWith(langCode));
    if (baseVoice) return baseVoice;
    
    // Default to first available voice
    return voices[0] || null;
  };

  // Toggle TTS
  const toggleTTS = async () => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      await startSpeaking();
      
      // 📊 Track TTS usage
      if (userId && moduleId) {
        chunkActivityTracker.trackActivity({
          userId,
          moduleId,
          moduleName: moduleName || 'Course',
          sectionIndex,
          sectionTitle,
          chunkIndex,
          chunkId: chunk.id || `chunk_${moduleId}_${sectionIndex}_${chunkIndex}`,
          chunkTitle: chunk.title || 'Chunk',
          chunkType: chunk.type || 'content',
          activityType: 'tts_used',
          data: {
            conceptCovered: chunk.keyPoint || chunk.title
          }
        }).catch(console.warn);
      }
    }
  };

  // Start TTS - ElevenLabs with browser fallback
  const startSpeaking = async () => {
    setIsLoadingTTS(true);
    
    try {
      // Detect language from content
      const cyrillicPattern = /[\u0400-\u04FF]/;
      const arabicPattern = /[\u0600-\u06FF]/;
      const chinesePattern = /[\u4E00-\u9FFF]/;
      const japanesePattern = /[\u3040-\u309F\u30A0-\u30FF]/;
      const hebrewPattern = /[\u0590-\u05FF]/;
      const koreanPattern = /[\uAC00-\uD7AF]/;
      
      let languageCode = 'en';
      if (cyrillicPattern.test(chunk.content)) languageCode = 'ru';
      else if (arabicPattern.test(chunk.content)) languageCode = 'ar';
      else if (chinesePattern.test(chunk.content)) languageCode = 'zh';
      else if (japanesePattern.test(chunk.content)) languageCode = 'ja';
      else if (hebrewPattern.test(chunk.content)) languageCode = 'he';
      else if (koreanPattern.test(chunk.content)) languageCode = 'ko';
      
      // Get optimal TTS config (EXACT same as VocabularyChunkViewer which works)
      const ttsConfig = getTTSConfig(languageCode as any);
      
      // Limit content length for TTS to save credits (~1 credit per char)
      // 500 chars = ~30 seconds of speech, ~500 credits
      const maxChars = 500;
      const textToSpeak = chunk.content.length > maxChars 
        ? chunk.content.substring(0, maxChars) + '... (content truncated for TTS)'
        : chunk.content;
      
      console.log('🔊 ChunkContentViewer TTS: Using ElevenLabs', { 
        languageCode, 
        voiceId: ttsConfig.voiceId,
        modelId: ttsConfig.modelId,
        contentLength: textToSpeak.length 
      });
      
      // EXACT same request as AIAssistantSmall which IMMUTABLY works
      const response = await fetch('/api/elevenlabs-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSpeak,
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
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };
      
      audio.onerror = (error) => {
        console.error('🔊 Audio playback error, falling back to browser TTS:', error);
        setIsSpeaking(false);
        setIsLoadingTTS(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
        // Fallback to browser TTS
        fallbackToWebSpeech(textToSpeak);
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
      fallbackToWebSpeech(chunk.content);
    }
  };
  
  // Browser Web Speech API fallback
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
    };
    
    utterance.onerror = () => {
      setIsSpeaking(false);
    };
    
    speechSynthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Stop TTS
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
  };

  // Handle next/complete
  const handleNext = () => {
    stopSpeaking();
    if (!hasMarkedComplete) {
      setHasMarkedComplete(true);
      onComplete();
    }
    if (canGoNext) {
      onNext();
    } else {
      // Last chunk - redirect to course overview
      onBack();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header - Fixed at top */}
      <div className={`flex-shrink-0 p-3 lg:p-4 border-b ${isDarkMode ? 'border-white/10 bg-slate-900' : 'border-gray-200 bg-white'}`}>
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <button
            onClick={() => {
              stopSpeaking();
              onBack();
            }}
            className={`flex items-center space-x-2 px-3 py-2 lg:px-4 lg:py-2.5 rounded-lg lg:rounded-xl transition-colors ${
              isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back to Section</span>
            <span className="sm:hidden">Back</span>
          </button>
          
          <div className={`text-sm lg:text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <span className="hidden lg:inline">{sectionTitle} • </span>
            Part {chunkIndex + 1} of {totalChunks}
          </div>
        </div>

        {/* Progress bar - Section progress */}
        <div className="mt-2 lg:mt-3 flex items-center space-x-1.5 lg:space-x-2 max-w-5xl mx-auto">
          {Array.from({ length: totalChunks }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                i < chunkIndex
                  ? 'bg-green-500'
                  : i === chunkIndex
                    ? `bg-gradient-to-r ${gradient}`
                    : isDarkMode ? 'bg-white/10' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main Content - Scrollable area between fixed header/footer */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-3xl lg:max-w-4xl mx-auto p-4 lg:p-6">
          {/* Chunk Type Header - Compact spacing */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-3 lg:space-x-4 mb-4 lg:mb-6"
          >
            <div className={`w-12 h-12 lg:w-16 lg:h-16 rounded-xl lg:rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
              <Icon className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
            </div>
            <div>
              <span className={`px-2.5 py-1 lg:px-3 lg:py-1 rounded-full text-xs lg:text-sm font-medium bg-gradient-to-r ${gradient} text-white`}>
                {getChunkTypeName(chunk.type)}
              </span>
              <h2 className={`text-xl lg:text-2xl font-bold mt-1.5 lg:mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {chunk.title}
              </h2>
            </div>
            
            {/* Completed badge */}
            {(isCompleted || hasMarkedComplete) && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="ml-auto flex items-center space-x-2 px-3 py-1 bg-green-500/20 text-green-500 rounded-full"
              >
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Completed</span>
              </motion.div>
            )}
          </motion.div>

          {/* QUIZ CHUNK - Render quiz questions with answer validation */}
          {chunk.type === 'quiz' && chunk.quizQuestions && chunk.quizQuestions.length > 0 && (
            <QuizChunkViewer
              chunk={chunk}
              isDarkMode={isDarkMode}
              onComplete={(score, total) => {
                console.log(`Quiz completed: ${score}/${total}`);
                setHasMarkedComplete(true);
                onComplete();
              }}
              onBack={onBack}
              userId={userId}
              moduleId={moduleId}
              moduleName={moduleName}
              sectionIndex={sectionIndex}
              sectionTitle={sectionTitle}
              chunkIndex={chunkIndex}
            />
          )}

          {/* VOCABULARY CARDS - Language courses only (native, romanized, pronunciation, meaning) */}
          {chunk.vocabularyItems && chunk.vocabularyItems.length > 0 && (
            <VocabularyChunkViewer
              chunk={chunk}
              isDarkMode={isDarkMode}
              onComplete={() => {
                setHasMarkedComplete(true);
                onComplete();
              }}
            />
          )}

          {/* KEY TERMS CARDS - Soft skills/technical/academic (term, definition, example, category) */}
          {(chunk as any).keyTerms && (chunk as any).keyTerms.length > 0 && (
            <KeyTermsViewer
              chunk={chunk}
              isDarkMode={isDarkMode}
              onComplete={() => {
                setHasMarkedComplete(true);
                onComplete();
              }}
            />
          )}

          {/* REGULAR CONTENT CHUNKS - Reading content with TTS */}
          {/* Only show if NOT a quiz AND has no vocabulary items AND has no key terms (specialized viewers handle those) */}
          {chunk.type !== 'quiz' && 
           (!chunk.vocabularyItems || chunk.vocabularyItems.length === 0) && 
           (!(chunk as any).keyTerms || (chunk as any).keyTerms.length === 0) && (
            <>
              {/* Image (if available) */}
              {chunk.imageUrl && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="mb-6 rounded-xl overflow-hidden shadow-lg"
                >
                  <img 
                    src={chunk.imageUrl} 
                    alt={chunk.title}
                    className="w-full h-auto max-h-80 object-contain bg-gray-100"
                  />
                </motion.div>
              )}

              {/* Content with TTS */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className={`relative p-6 rounded-xl mb-6 ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}
              >
                {/* TTS Button - Read Aloud */}
                <button
                  onClick={toggleTTS}
                  disabled={isLoadingTTS}
                  className={`absolute top-4 right-4 p-3 rounded-full transition-all ${
                    isSpeaking
                      ? 'bg-violet-500 text-white animate-pulse'
                      : isDarkMode 
                        ? 'bg-white/10 hover:bg-white/20 text-gray-300' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                  }`}
                  title={isSpeaking ? 'Stop reading' : '🔊 Read aloud'}
                >
                  {isLoadingTTS ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isSpeaking ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>

                {/* Inline vocabulary items with generated images */}
                {chunk.vocabularyItems && chunk.vocabularyItems.length > 0 && (
                  <div className={`mb-4 p-4 rounded-xl ${isDarkMode ? 'bg-violet-500/10' : 'bg-violet-50'}`}>
                    <h5 className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-violet-300' : 'text-violet-700'}`}>
                      📚 Vocabulary in this section:
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {chunk.vocabularyItems.map((item, idx) => {
                        const imageKey = `vocab_${chunk.id}_${idx}`;
                        const generatedImage = generatedImages.get(imageKey) || item.imageUrl;
                        const isLoading = loadingImages.has(imageKey);
                        
                        return (
                          <div 
                            key={idx} 
                            className={`flex items-center p-3 rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-white'} border ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}
                          >
                            {/* Generated/Loaded Image for Visual Concepts */}
                            {item.isVisualConcept && (
                              <div className="flex-shrink-0 mr-3">
                                {generatedImage ? (
                                  <img 
                                    src={generatedImage} 
                                    alt={item.meaning}
                                    className="w-16 h-16 rounded-lg object-cover"
                                  />
                                ) : isLoading ? (
                                  <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-white/10' : 'bg-gray-100'}`}>
                                    <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                                  </div>
                                ) : item.imagePrompt ? (
                                  <div 
                                    className={`w-16 h-16 rounded-lg flex items-center justify-center cursor-pointer ${isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'}`}
                                    onClick={() => generateInlineImage(item, imageKey)}
                                  >
                                    <ImageIcon className={`w-6 h-6 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                                  </div>
                                ) : null}
                              </div>
                            )}
                            
                            {/* Text Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {item.native}
                                </span>
                                <button
                                  onClick={() => {
                                    const utterance = new SpeechSynthesisUtterance(item.native);
                                    utterance.rate = 0.7;
                                    window.speechSynthesis.speak(utterance);
                                  }}
                                  className={`p-1 rounded ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                                >
                                  🔊
                                </button>
                              </div>
                              <div className="flex items-center space-x-2 text-sm">
                                <span className={isDarkMode ? 'text-violet-400' : 'text-violet-600'}>
                                  {item.romanized}
                                </span>
                                <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>
                                  [{item.pronunciation}]
                                </span>
                              </div>
                              <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                = {item.meaning}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Content Text - Educational Markdown Renderer */}
                <div className="pr-16">
                  <EducationalMarkdownRenderer 
                    content={chunk.content}
                    isDarkMode={isDarkMode}
                  />
                </div>

                {/* Reading progress indicator */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <div className={`flex items-center space-x-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Clock className="w-4 h-4" />
                      <span>~{estimatedMinutes} min read</span>
                    </div>
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                      {Math.round(readProgress)}% read
                    </span>
                  </div>
                  <div className={`h-1.5 rounded-full ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}>
                    <motion.div
                      className={`h-1.5 rounded-full bg-gradient-to-r ${gradient}`}
                      style={{ width: `${readProgress}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            </>
          )}

          {/* Key Point Highlight (for non-quiz/vocab chunks) */}
          {chunk.type !== 'quiz' && chunk.type !== 'vocabulary' && chunk.keyPoint && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`p-5 rounded-xl border-l-4 mb-6 ${
                isDarkMode 
                  ? 'bg-violet-500/10 border-violet-500' 
                  : 'bg-violet-50 border-violet-500'
              }`}
            >
              <div className="flex items-start space-x-3">
                <Lightbulb className={`w-6 h-6 flex-shrink-0 ${isDarkMode ? 'text-violet-400' : 'text-violet-600'}`} />
                <div>
                  <h4 className={`font-semibold mb-1 ${isDarkMode ? 'text-violet-300' : 'text-violet-800'}`}>
                    Key Takeaway
                  </h4>
                  <p className={`${isDarkMode ? 'text-violet-200' : 'text-violet-700'}`}>
                    {chunk.keyPoint}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Quiz Gate - Must pass to proceed */}
      {chunk.quizGate?.enabled && !quizGatePassed && chunk.quizQuestions && chunk.quizQuestions.length > 0 && (
        <div className={`flex-shrink-0 p-4 border-t ${isDarkMode ? 'border-yellow-500/30 bg-yellow-500/10' : 'border-yellow-200 bg-yellow-50'}`}>
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Lock className={`w-6 h-6 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                <div>
                  <p className={`font-semibold ${isDarkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                    📝 Comprehension Check Required
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-yellow-400/70' : 'text-yellow-700'}`}>
                    Pass the quiz ({chunk.quizGate.requiredScore}% required) to continue
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  // Show quiz modal or inline quiz
                  setQuizGatePassed(false); // Will be set to true on quiz completion
                }}
                className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-xl font-medium hover:opacity-90"
              >
                Take Quiz →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Footer - Fixed at bottom */}
      {/* Hide for quiz chunks since QuizChunkViewer has its own navigation */}
      {chunk.type !== 'quiz' && (
      <div className={`flex-shrink-0 p-3 lg:p-4 border-t ${isDarkMode ? 'border-white/10 bg-slate-900' : 'border-gray-200 bg-white'}`}>
        <div className="max-w-3xl lg:max-w-4xl mx-auto flex items-center justify-between">
          {/* Previous button */}
          <button
            onClick={() => {
              stopSpeaking();
              onPrevious();
            }}
            disabled={!canGoPrevious}
            className={`flex items-center space-x-2 px-3 py-2 lg:px-5 lg:py-3 rounded-lg lg:rounded-xl transition-all ${
              canGoPrevious
                ? isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-200 text-gray-700'
                : 'opacity-50 cursor-not-allowed'
            }`}
          >
            <ArrowLeft className="w-5 h-5 lg:w-6 lg:h-6" />
            <span className="hidden lg:inline">Previous</span>
          </button>

          {/* Status indicator */}
          <div className={`text-sm lg:text-base ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {chunk.quizGate?.enabled && !quizGatePassed ? (
              <span className="text-yellow-500 flex items-center space-x-1">
                <Lock className="w-4 h-4" />
                <span className="hidden sm:inline">Pass quiz to continue</span>
                <span className="sm:hidden">Quiz required</span>
              </span>
            ) : hasMarkedComplete || isCompleted ? (
              <span className="text-green-500 flex items-center space-x-1 lg:space-x-2">
                <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5" />
                <span>Progress saved</span>
              </span>
            ) : (
              <span className="hidden sm:inline">Keep reading to mark complete</span>
            )}
          </div>

          {/* Next/Complete button */}
          <button
            onClick={handleNext}
            disabled={chunk.quizGate?.enabled && !quizGatePassed}
            className={`flex items-center space-x-2 px-5 py-2.5 lg:px-8 lg:py-3 rounded-xl lg:rounded-2xl font-medium lg:text-lg transition-all ${
              chunk.quizGate?.enabled && !quizGatePassed
                ? 'opacity-50 cursor-not-allowed bg-gray-400 text-gray-200'
                : canGoNext
                  ? `bg-gradient-to-r ${gradient} text-white hover:opacity-90 shadow-lg lg:shadow-xl`
                  : hasMarkedComplete || isCompleted
                    ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg'
                    : isDarkMode ? 'bg-white/10 text-gray-300' : 'bg-gray-200 text-gray-700'
            }`}
          >
            {chunk.quizGate?.enabled && !quizGatePassed ? (
              <>
                <Lock className="w-5 h-5" />
                <span className="hidden sm:inline">Locked</span>
              </>
            ) : (
              <>
                <span>{canGoNext ? 'Continue' : 'Complete'}</span>
                <ArrowRight className="w-5 h-5 lg:w-6 lg:h-6" />
              </>
            )}
          </button>
        </div>
      </div>
      )}
    </div>
  );
};

export default ChunkContentViewer;

