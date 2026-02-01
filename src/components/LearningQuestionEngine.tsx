/**
 * LEARNING QUESTION ENGINE
 * 
 * Professional assessment interface for course evaluations
 * Features:
 * - Clean, minimal design
 * - Clear progress tracking
 * - Thoughtful feedback without childish elements
 * - Smooth transitions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ArrowRight, Clock, HelpCircle, BarChart2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import type { Question, UserResponse, EvaluationResult } from '../types/LearningModule.types';

// 🌍 TRANSLITERATION SUPPORT - Accept phonetic spellings for language learning
// Extract romanized text from mixed content (e.g., "مرحبا (marhaba)" → "marhaba")
function extractRomanized(text: string): string {
  const parenMatch = text.match(/\(([^)]+)\)/);
  if (parenMatch) return parenMatch[1].toLowerCase().trim();
  // If no parentheses, try to extract Latin characters only
  const latinOnly = text.replace(/[^\x00-\x7F]/g, '').trim();
  return latinOnly.length > 0 ? latinOnly.toLowerCase() : text.toLowerCase();
}

// Normalize transliteration variations (q/k, aa/a, gh/g, etc.)
function normalizeTransliteration(text: string): string {
  return text
    .toLowerCase()
    .replace(/[''`ʿʾ]/g, '') // Remove glottal stops
    .replace(/aa/g, 'a')     // Long vowels
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/ou/g, 'u')
    .replace(/kh/g, 'x')     // Common variations
    .replace(/gh/g, 'g')
    .replace(/dh/g, 'd')
    .replace(/th/g, 't')
    .replace(/sh/g, 's')
    .replace(/ch/g, 'c')
    .replace(/q/g, 'k')      // q → k (common in Arabic transliteration)
    .replace(/[^a-z0-9]/g, ''); // Remove non-alphanumeric
}

// Levenshtein distance for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

// Validate answer with transliteration support
function validateWithTransliteration(userAnswer: string, correctAnswer: string): { isCorrect: boolean; isClose: boolean; feedback: string } {
  const userClean = userAnswer.toLowerCase().trim();
  const correctClean = correctAnswer.toLowerCase().trim();
  
  // Exact match
  if (userClean === correctClean) {
    return { isCorrect: true, isClose: false, feedback: '' };
  }
  
  // Check if user answer contains correct answer
  if (userClean.includes(correctClean) || correctClean.includes(userClean)) {
    return { isCorrect: true, isClose: false, feedback: '' };
  }
  
  // Extract and compare romanized versions
  const userRoman = extractRomanized(userClean);
  const correctRoman = extractRomanized(correctClean);
  
  if (userRoman === correctRoman) {
    return { isCorrect: true, isClose: false, feedback: '' };
  }
  
  // Normalize and compare
  const userNorm = normalizeTransliteration(userRoman);
  const correctNorm = normalizeTransliteration(correctRoman);
  
  if (userNorm === correctNorm) {
    return { isCorrect: true, isClose: false, feedback: '' };
  }
  
  // Calculate similarity for fuzzy matching
  const maxLen = Math.max(userNorm.length, correctNorm.length);
  if (maxLen === 0) {
    return { isCorrect: false, isClose: false, feedback: '' };
  }
  
  const distance = levenshteinDistance(userNorm, correctNorm);
  const similarity = 1 - (distance / maxLen);
  
  // 80%+ similar = accept as correct
  if (similarity >= 0.8) {
    return { isCorrect: true, isClose: true, feedback: `Good! Standard spelling: "${correctRoman}"` };
  }
  
  // 60%+ similar = close but wrong
  if (similarity >= 0.6) {
    return { isCorrect: false, isClose: true, feedback: `Almost! The answer is "${correctRoman}"` };
  }
  
  return { isCorrect: false, isClose: false, feedback: '' };
}

interface LearningQuestionEngineProps {
  questions: Question[];
  onResponseSubmit: (questionId: string, answer: string, response: UserResponse) => void;
  onComplete: () => void;
  isDarkMode?: boolean;
}

export const LearningQuestionEngine: React.FC<LearningQuestionEngineProps> = ({
  questions,
  onResponseSubmit,
  onComplete,
  isDarkMode: darkModeProp
}) => {
  const { isDarkMode: themeDark } = useTheme();
  const isDarkMode = darkModeProp !== undefined ? darkModeProp : themeDark;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  // Timer
  useEffect(() => {
    if (evaluation) return;
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, evaluation]);

  useEffect(() => {
    // Reset for new question
    setUserAnswer('');
    setSelectedOption(null);
    setEvaluation(null);
    setShowHint(false);
    setStartTime(Date.now());
    setElapsedTime(0);
    setIsSubmitting(false);
  }, [currentQuestionIndex]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const handleSubmit = async () => {
    if (!currentQuestion || isSubmitting) return;

    const answer = currentQuestion.type === 'multiple_choice' ? selectedOption || '' : userAnswer;
    if (!answer.trim()) return;

    setIsSubmitting(true);
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    // Create user response
    const response: UserResponse = {
      questionId: currentQuestion.id,
      userAnswer: answer,
      isCorrect: false,
      timeSpent,
      timestamp: new Date(),
      concept: currentQuestion.concept
    };

    // 🌍 EVALUATION with transliteration support for ALL languages
    let isCorrect = false;
    let closeFeedback = '';
    
    if (currentQuestion.type === 'multiple_choice') {
      // Multiple choice - exact match on option
      isCorrect = currentQuestion.options?.find(opt => opt.text === answer)?.isCorrect === true;
    } else {
      // Text/open-ended - use fuzzy matching with transliteration support
      const validation = validateWithTransliteration(answer, currentQuestion.correctAnswer || '');
      isCorrect = validation.isCorrect;
      closeFeedback = validation.feedback;
    }

    response.isCorrect = isCorrect;

    const evalResult: EvaluationResult = {
      isCorrect,
      score: isCorrect ? 100 : 0,
      feedback: closeFeedback || currentQuestion.explanation || '',
      conceptUnderstanding: isCorrect ? 100 : 30,
      needsReinforcement: !isCorrect
    };

    setEvaluation(evalResult);
    onResponseSubmit(currentQuestion.id, answer, response);
  };

  const handleNext = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      onComplete();
    }
  }, [currentQuestionIndex, questions.length, onComplete]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        if (evaluation) {
          handleNext();
        } else if (selectedOption || userAnswer.trim()) {
          handleSubmit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [evaluation, selectedOption, userAnswer, handleNext]);

  // 🎨 Purple/Pastel Purple Theme
  const cardClasses = isDarkMode
    ? 'bg-purple-950/80 backdrop-blur-md border border-purple-800/50'
    : 'bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200';

  const textPrimary = isDarkMode ? 'text-white' : 'text-purple-900';
  const textSecondary = isDarkMode ? 'text-purple-300' : 'text-purple-600';

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className={`animate-pulse ${textSecondary}`}>Preparing assessment...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header with Progress - Single unified progress bar */}
      <div className="px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <span className={`text-sm font-semibold ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <div className={`flex items-center gap-1.5 text-sm ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
              <Clock className="w-4 h-4" />
              <span className="font-mono">{formatTime(elapsedTime)}</span>
            </div>
          </div>
          <div className={`flex items-center gap-2 text-sm font-semibold ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>
            <BarChart2 className="w-4 h-4" />
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
        
        {/* Single unified progress bar - Purple gradient */}
        <div className="flex gap-1.5">
          {questions.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                idx < currentQuestionIndex
                  ? 'bg-gradient-to-r from-purple-500 to-violet-500'
                  : idx === currentQuestionIndex
                    ? 'bg-gradient-to-r from-purple-400 to-violet-400'
                    : isDarkMode ? 'bg-purple-900/30' : 'bg-purple-100'
              }`}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="flex-1 flex flex-col px-4 sm:px-6 pb-4 sm:pb-6 min-h-0"
        >
          {/* Question Card - Full height with flex, scrollable content */}
          <div className={`${cardClasses} rounded-2xl shadow-xl flex flex-col flex-1 min-h-0`}>
            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {/* Question Header - Responsive padding */}
              <div className="p-4 sm:p-6 pb-3 sm:pb-4">
              <div className="flex items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="flex-1">
                  {currentQuestion.concept && (
                    <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full mb-2 sm:mb-3 ${
                      isDarkMode ? 'bg-purple-800/50 text-purple-300' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {currentQuestion.concept}
                    </span>
                  )}
                  <h2 className={`text-base sm:text-lg md:text-xl font-semibold leading-relaxed ${textPrimary}`}>
                    {currentQuestion.text}
                  </h2>
                </div>
              </div>
            </div>

            {/* Answer Section - Responsive padding */}
            <div className={`px-4 sm:px-6 pb-4 sm:pb-6 flex-1 ${evaluation ? 'opacity-60 pointer-events-none' : ''}`}>
              {currentQuestion.type === 'multiple_choice' && currentQuestion.options ? (
                <div className="space-y-2 sm:space-y-3">
                  {currentQuestion.options.map((option, idx) => {
                    const isSelected = selectedOption === option.text;
                    const showResult = evaluation && isSelected;
                    const isCorrectOption = evaluation && option.isCorrect;
                    
                    return (
                      <button
                        key={option.id}
                        onClick={() => !evaluation && setSelectedOption(option.text)}
                        disabled={!!evaluation}
                        className={`w-full text-left p-3 sm:p-4 rounded-xl transition-all flex items-center gap-3 sm:gap-4 ${
                          showResult
                            ? evaluation.isCorrect
                              ? isDarkMode ? 'bg-emerald-500/20 border-2 border-emerald-500' : 'bg-emerald-50 border-2 border-emerald-400'
                              : isDarkMode ? 'bg-red-500/20 border-2 border-red-500' : 'bg-red-50 border-2 border-red-400'
                            : isCorrectOption && evaluation
                              ? isDarkMode ? 'bg-emerald-500/15 border-2 border-emerald-500/50' : 'bg-emerald-50 border-2 border-emerald-300'
                              : isSelected
                                ? isDarkMode
                                  ? 'bg-purple-700/50 border-2 border-purple-400'
                                  : 'bg-purple-100 border-2 border-purple-400'
                                : isDarkMode
                                  ? 'bg-purple-900/30 border-2 border-purple-700/50 hover:bg-purple-800/40 hover:border-purple-600'
                                  : 'bg-white border-2 border-purple-200 hover:bg-purple-50 hover:border-purple-300'
                        }`}
                      >
                        <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-mono text-xs sm:text-sm flex-shrink-0 ${
                          isSelected
                            ? isDarkMode ? 'bg-purple-500 text-white' : 'bg-purple-500 text-white'
                            : isDarkMode ? 'bg-purple-800 text-purple-300' : 'bg-purple-100 text-purple-600'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className={`flex-1 text-sm sm:text-base ${textPrimary}`}>{option.text}</span>
                        {showResult && (
                          <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                            evaluation.isCorrect ? 'bg-emerald-500' : 'bg-red-500'
                          }`}>
                            {evaluation.isCorrect ? <Check className="w-4 h-4 text-white" /> : <X className="w-4 h-4 text-white" />}
                          </span>
                        )}
                        {isCorrectOption && evaluation && !isSelected && (
                          <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-emerald-500">
                            <Check className="w-4 h-4 text-white" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Enter your answer..."
                  rows={4}
                  className={`w-full p-3 sm:p-4 rounded-xl border-2 resize-none focus:outline-none transition-all ${
                    isDarkMode
                      ? 'bg-purple-900/30 border-purple-700 text-white placeholder-purple-400 focus:border-purple-500'
                      : 'bg-white border-purple-200 text-purple-900 placeholder-purple-400 focus:border-purple-400'
                  }`}
                />
              )}
            </div>

            {/* Feedback Section - Responsive */}
            {evaluation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
                className={`mx-4 sm:mx-6 mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl ${
                  evaluation.isCorrect
                    ? isDarkMode ? 'bg-emerald-900/30 border border-emerald-700' : 'bg-emerald-50 border border-emerald-200'
                    : isDarkMode ? 'bg-amber-900/30 border border-amber-700' : 'bg-amber-50 border border-amber-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    evaluation.isCorrect 
                      ? isDarkMode ? 'bg-emerald-500/30 text-emerald-400' : 'bg-emerald-100 text-emerald-600'
                      : isDarkMode ? 'bg-amber-500/30 text-amber-400' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {evaluation.isCorrect ? <Check className="w-4 h-4" /> : <HelpCircle className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-sm font-medium mb-1 ${
                      evaluation.isCorrect
                        ? isDarkMode ? 'text-emerald-300' : 'text-emerald-700'
                        : isDarkMode ? 'text-amber-300' : 'text-amber-700'
                    }`}>
                      {evaluation.isCorrect ? 'Correct!' : 'Review needed'}
                    </h4>
                    {evaluation.feedback && (
                      <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                        {evaluation.feedback}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Hint - Responsive */}
            {currentQuestion.hint && !evaluation && (
              <div className="px-4 sm:px-6 pb-3 sm:pb-4">
                <button
                  onClick={() => setShowHint(!showHint)}
                  className={`flex items-center gap-2 text-xs font-medium transition-colors ${
                    showHint
                      ? isDarkMode ? 'text-purple-300' : 'text-purple-600'
                      : isDarkMode ? 'text-purple-400 hover:text-purple-300' : 'text-purple-500 hover:text-purple-600'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  {showHint ? 'Hide hint' : 'Need a hint?'}
                </button>
                <AnimatePresence>
                  {showHint && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`mt-3 p-3 rounded-lg text-sm ${
                        isDarkMode ? 'bg-purple-900/50 border border-purple-700 text-purple-200' : 'bg-purple-50 border border-purple-200 text-purple-700'
                      }`}
                    >
                      {currentQuestion.hint}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            </div>
            {/* End scrollable content area */}

            {/* Action Footer - Fixed at bottom */}
            <div className={`flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t flex items-center justify-between ${
              isDarkMode ? 'border-purple-800 bg-purple-950/50' : 'border-purple-100 bg-purple-50/80'
            } rounded-b-2xl`}>
              <span className={`text-xs hidden sm:inline ${textSecondary}`}>
                {evaluation ? 'Press Enter to continue' : 'Ctrl+Enter to submit'}
              </span>
              
              {evaluation ? (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 font-semibold rounded-xl transition-all bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white shadow-lg shadow-purple-500/25 ml-auto"
                >
                  <span>{currentQuestionIndex < questions.length - 1 ? 'Next' : 'Complete'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={(!userAnswer.trim() && !selectedOption) || isSubmitting}
                  className={`px-4 sm:px-6 py-2.5 sm:py-3 font-semibold rounded-xl transition-all ml-auto ${
                    (!userAnswer.trim() && !selectedOption) || isSubmitting
                      ? isDarkMode ? 'bg-purple-900/50 text-purple-500 cursor-not-allowed' : 'bg-purple-100 text-purple-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white shadow-lg shadow-purple-500/25'
                  }`}
                >
                  {isSubmitting ? 'Checking...' : 'Submit'}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default LearningQuestionEngine;
