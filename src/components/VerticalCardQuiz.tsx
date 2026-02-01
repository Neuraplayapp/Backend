// Vertical Card Quiz System - Quiz gate that must be passed before progressing
// Features: Vertical swipeable cards, retention testing, no skipping allowed

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Lock,
  Trophy,
  RefreshCw,
  Volume2,
  Lightbulb,
  ArrowRight,
  Star,
  Target
} from 'lucide-react';
import { quizAudioService } from '../services/QuizAudioService';

interface QuizQuestion {
  id: string;
  type: 'concept_intro' | 'multiple_choice' | 'image_match' | 'translate';
  // For concept intro cards
  conceptTitle?: string;
  conceptContent?: string;
  conceptImage?: string;
  conceptNative?: string;
  conceptRomanized?: string;
  conceptPronunciation?: string;
  // For quiz questions
  question?: string;
  options?: string[];
  correctAnswer?: string;
  imageUrl?: string;
  explanation?: string;
  hint?: string;
}

interface VerticalCardQuizProps {
  sectionTitle: string;
  cards: QuizQuestion[];
  isDarkMode: boolean;
  requiredScore: number; // Percentage needed to pass (e.g., 70)
  onComplete: (passed: boolean, score: number) => void;
  onGenerateImage?: (prompt: string, style: 'pixar' | 'educational') => Promise<string>;
  targetAudience?: 'child' | 'adult';
}

export const VerticalCardQuiz: React.FC<VerticalCardQuizProps> = ({
  sectionTitle,
  cards,
  isDarkMode,
  requiredScore = 70,
  onComplete,
  onGenerateImage,
  targetAudience = 'adult'
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, { answer: string; correct: boolean }>>(new Map());
  const [showResult, setShowResult] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<Map<string, string>>(new Map());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());

  const currentCard = cards[currentIndex];
  const totalQuestions = cards.filter(c => c.type !== 'concept_intro').length;
  const answeredQuestions = Array.from(answers.values()).length;
  const correctAnswers = Array.from(answers.values()).filter(a => a.correct).length;

  // Generate images for concept cards on mount
  useEffect(() => {
    cards.forEach(async (card, idx) => {
      if (card.type === 'concept_intro' && card.conceptTitle && !card.conceptImage && onGenerateImage) {
        const imageKey = `card_${idx}`;
        if (!generatedImages.has(imageKey) && !loadingImages.has(imageKey)) {
          setLoadingImages(prev => new Set(prev).add(imageKey));
          
          const style = targetAudience === 'child' ? 'pixar' : 'educational';
          const prompt = `${style === 'pixar' ? '3D Pixar-style character illustration' : 'Clean educational illustration'} of: ${card.conceptTitle}. ${card.conceptContent?.substring(0, 50) || ''}. No text, no letters, pure visual representation.`;
          
          try {
            const imageUrl = await onGenerateImage(prompt, style);
            setGeneratedImages(prev => new Map(prev).set(imageKey, imageUrl));
          } catch (error) {
            console.error('Failed to generate image:', error);
          } finally {
            setLoadingImages(prev => {
              const newSet = new Set(prev);
              newSet.delete(imageKey);
              return newSet;
            });
          }
        }
      }
    });
  }, [cards, onGenerateImage, targetAudience]);

  const handleAnswer = (answer: string) => {
    if (currentCard.type === 'concept_intro') return;
    
    const isCorrect = answer.toLowerCase().trim() === currentCard.correctAnswer?.toLowerCase().trim();
    
    setAnswers(prev => new Map(prev).set(currentCard.id, {
      answer,
      correct: isCorrect
    }));
    
    // Show feedback briefly, then advance
    setShowResult(true);
    setTimeout(() => {
      setShowResult(false);
      if (currentIndex < cards.length - 1) {
        goToNext();
      } else {
        // Quiz complete - check if passed
        const newCorrect = isCorrect ? correctAnswers + 1 : correctAnswers;
        const score = Math.round((newCorrect / totalQuestions) * 100);
        onComplete(score >= requiredScore, score);
      }
    }, 1500);
  };

  const goToNext = useCallback(() => {
    if (isAnimating || currentIndex >= cards.length - 1) return;
    setIsAnimating(true);
    setCurrentIndex(prev => prev + 1);
    setTimeout(() => setIsAnimating(false), 300);
  }, [currentIndex, cards.length, isAnimating]);

  const goToPrev = useCallback(() => {
    if (isAnimating || currentIndex <= 0) return;
    setIsAnimating(true);
    setCurrentIndex(prev => prev - 1);
    setTimeout(() => setIsAnimating(false), 300);
  }, [currentIndex, isAnimating]);

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.y < -threshold) {
      // Swiped up - go to next
      if (currentCard.type === 'concept_intro' || answers.has(currentCard.id)) {
        goToNext();
      }
    } else if (info.offset.y > threshold) {
      // Swiped down - go to previous
      goToPrev();
    }
  };

  const speakText = (text: string) => {
    // Use ElevenLabs TTS (turbo model - cheapest) with Web Speech fallback
    quizAudioService.speak(text, 'en').catch(console.warn);
  };

  const canProceed = currentCard.type === 'concept_intro' || answers.has(currentCard.id);

  const currentAnswer = answers.get(currentCard.id);

  // Get generated image for current card
  const getCurrentImage = () => {
    if (currentCard.conceptImage) return currentCard.conceptImage;
    if (currentCard.imageUrl) return currentCard.imageUrl;
    return generatedImages.get(`card_${currentIndex}`);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className={`flex-shrink-0 p-4 border-b ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {sectionTitle}
          </h3>
          <div className="flex items-center space-x-4">
            {/* Progress dots */}
            <div className="flex items-center space-x-1">
              {cards.map((card, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx < currentIndex
                      ? card.type === 'concept_intro'
                        ? 'bg-blue-500'
                        : answers.get(card.id)?.correct
                          ? 'bg-green-500'
                          : 'bg-red-500'
                      : idx === currentIndex
                        ? 'bg-violet-500'
                        : isDarkMode ? 'bg-white/20' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {currentIndex + 1}/{cards.length}
            </span>
          </div>
        </div>

        {/* Score indicator */}
        {totalQuestions > 0 && (
          <div className="mt-2 flex items-center space-x-2">
            <Target className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Score: {correctAnswers}/{answeredQuestions} correct • Need {requiredScore}% to pass
            </span>
          </div>
        )}
      </div>

      {/* Card Stack */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.3 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 p-4"
          >
            <div className={`h-full rounded-2xl overflow-hidden shadow-xl ${
              isDarkMode ? 'bg-gradient-to-b from-gray-800 to-gray-900' : 'bg-gradient-to-b from-white to-gray-50'
            }`}>
              {/* Card Content */}
              <div className="h-full flex flex-col p-6">
                {/* CONCEPT INTRODUCTION CARD */}
                {currentCard.type === 'concept_intro' && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    {/* Image */}
                    {getCurrentImage() ? (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-48 h-48 mb-6 rounded-2xl overflow-hidden shadow-lg"
                      >
                        <img
                          src={getCurrentImage()}
                          alt={currentCard.conceptTitle}
                          className="w-full h-full object-cover"
                        />
                      </motion.div>
                    ) : loadingImages.has(`card_${currentIndex}`) ? (
                      <div className={`w-48 h-48 mb-6 rounded-2xl flex items-center justify-center ${
                        isDarkMode ? 'bg-white/10' : 'bg-gray-100'
                      }`}>
                        <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" />
                      </div>
                    ) : null}

                    {/* Native word (for language learning) */}
                    {currentCard.conceptNative && (
                      <div className="mb-4">
                        <p className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {currentCard.conceptNative}
                        </p>
                        {currentCard.conceptRomanized && (
                          <p className={`text-xl mt-1 ${isDarkMode ? 'text-violet-400' : 'text-violet-600'}`}>
                            {currentCard.conceptRomanized}
                          </p>
                        )}
                        {currentCard.conceptPronunciation && (
                          <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            [{currentCard.conceptPronunciation}]
                          </p>
                        )}
                      </div>
                    )}

                    {/* Title */}
                    <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {currentCard.conceptTitle}
                    </h2>

                    {/* Content */}
                    <p className={`text-lg leading-relaxed max-w-md ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {currentCard.conceptContent}
                    </p>

                    {/* Listen button */}
                    {(currentCard.conceptNative || currentCard.conceptTitle) && (
                      <button
                        onClick={() => speakText(currentCard.conceptNative || currentCard.conceptTitle || '')}
                        className={`mt-6 flex items-center space-x-2 px-6 py-3 rounded-xl ${
                          isDarkMode ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-100 text-violet-700'
                        }`}
                      >
                        <Volume2 className="w-5 h-5" />
                        <span>Listen 🔊</span>
                      </button>
                    )}

                    {/* Swipe hint */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 }}
                      className={`mt-8 flex flex-col items-center ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}
                    >
                      <ChevronUp className="w-6 h-6 animate-bounce" />
                      <span className="text-sm">Swipe up to continue</span>
                    </motion.div>
                  </div>
                )}

                {/* QUIZ QUESTION CARD */}
                {currentCard.type !== 'concept_intro' && (
                  <div className="flex-1 flex flex-col">
                    {/* Question Image */}
                    {currentCard.imageUrl && (
                      <div className="w-full h-40 mb-4 rounded-xl overflow-hidden">
                        <img
                          src={currentCard.imageUrl}
                          alt="Question"
                          className="w-full h-full object-contain bg-gray-100"
                        />
                      </div>
                    )}

                    {/* Question */}
                    <div className="flex items-start space-x-2 mb-6">
                      <span className={`text-2xl ${isDarkMode ? 'text-violet-400' : 'text-violet-600'}`}>?</span>
                      <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {currentCard.question}
                      </h3>
                    </div>

                    {/* Options */}
                    <div className="flex-1 flex flex-col justify-center space-y-3">
                      {currentCard.options?.map((option, idx) => {
                        const isSelected = currentAnswer?.answer === option;
                        const isCorrect = option.toLowerCase().trim() === currentCard.correctAnswer?.toLowerCase().trim();
                        const showCorrectness = showResult || currentAnswer;

                        let optionStyle = isDarkMode 
                          ? 'bg-white/5 border-white/10 text-white' 
                          : 'bg-white border-gray-200 text-gray-900';

                        if (showCorrectness) {
                          if (isCorrect) {
                            optionStyle = 'bg-green-500/20 border-green-500 text-green-500';
                          } else if (isSelected && !isCorrect) {
                            optionStyle = 'bg-red-500/20 border-red-500 text-red-500';
                          }
                        }

                        return (
                          <motion.button
                            key={idx}
                            whileHover={!currentAnswer ? { scale: 1.02 } : undefined}
                            whileTap={!currentAnswer ? { scale: 0.98 } : undefined}
                            onClick={() => !currentAnswer && handleAnswer(option)}
                            disabled={!!currentAnswer}
                            className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${optionStyle}`}
                          >
                            <span className="flex items-center space-x-3">
                              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                isDarkMode ? 'bg-white/10' : 'bg-gray-100'
                              }`}>
                                {String.fromCharCode(65 + idx)}
                              </span>
                              <span className="font-medium">{option}</span>
                            </span>
                            {showCorrectness && isCorrect && <CheckCircle className="w-6 h-6" />}
                            {showCorrectness && isSelected && !isCorrect && <XCircle className="w-6 h-6" />}
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Hint */}
                    {currentCard.hint && !currentAnswer && (
                      <div className={`mt-4 p-3 rounded-lg flex items-start space-x-2 ${
                        isDarkMode ? 'bg-yellow-500/10' : 'bg-yellow-50'
                      }`}>
                        <Lightbulb className={`w-5 h-5 flex-shrink-0 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                        <p className={`text-sm ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                          {currentCard.hint}
                        </p>
                      </div>
                    )}

                    {/* Explanation after answering */}
                    {currentAnswer && currentCard.explanation && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`mt-4 p-4 rounded-lg ${
                          currentAnswer.correct
                            ? isDarkMode ? 'bg-green-500/10 border border-green-500/30' : 'bg-green-50 border border-green-200'
                            : isDarkMode ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
                        }`}
                      >
                        <p className={`text-sm ${
                          currentAnswer.correct
                            ? isDarkMode ? 'text-green-300' : 'text-green-700'
                            : isDarkMode ? 'text-blue-300' : 'text-blue-700'
                        }`}>
                          {currentCard.explanation}
                        </p>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Footer */}
      <div className={`flex-shrink-0 p-4 border-t ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
              currentIndex === 0
                ? 'opacity-30 cursor-not-allowed'
                : isDarkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <ChevronDown className="w-5 h-5" />
            <span>Previous</span>
          </button>

          {/* Progress indicator */}
          <div className="flex items-center space-x-2">
            {currentCard.type !== 'concept_intro' && !currentAnswer && (
              <Lock className={`w-5 h-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            )}
            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {currentCard.type === 'concept_intro' ? 'Learn this concept' : canProceed ? 'Ready to continue' : 'Answer to continue'}
            </span>
          </div>

          <button
            onClick={goToNext}
            disabled={!canProceed || currentIndex >= cards.length - 1}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
              !canProceed || currentIndex >= cards.length - 1
                ? 'opacity-30 cursor-not-allowed'
                : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white'
            }`}
          >
            <span>Next</span>
            <ChevronUp className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerticalCardQuiz;




