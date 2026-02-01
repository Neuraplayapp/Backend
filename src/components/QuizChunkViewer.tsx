// Quiz Chunk Viewer - Displays quiz questions with actual answer validation
// Provides real comprehension checking with immediate feedback
// NOW INTEGRATES WITH: FlashcardGeneratorService for failed questions
// NOW INTEGRATES WITH: ChunkActivityTracker for comprehensive activity tracking

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Lightbulb,
  Trophy,
  Volume2,
  Layers
} from 'lucide-react';
import type { ChunkQuizQuestion, CourseChunk } from '../types/LearningModule.types';
import { flashcardGeneratorService } from '../services/FlashcardGeneratorService';
import { quizAudioService } from '../services/QuizAudioService';
import { chunkActivityTracker } from '../services/ChunkActivityTracker';

interface QuizChunkViewerProps {
  chunk: CourseChunk;
  isDarkMode: boolean;
  onComplete: (score: number, totalQuestions: number) => void;
  onBack: () => void;
  // Optional: for flashcard generation & activity tracking
  userId?: string;
  moduleId?: string;
  moduleName?: string;
  // For activity tracking
  sectionIndex?: number;
  sectionTitle?: string;
  chunkIndex?: number;
}

interface QuestionState {
  answered: boolean;
  selectedAnswer: string | null;
  isCorrect: boolean | null;
  isCloseAnswer: boolean; // 🎯 NEW: For "close but not exact" answers
  showHint: boolean;
  showExplanation: boolean;
}

// 🎯 PEDAGOGICAL ANSWER VALIDATION
// Handles transliteration variations, slight spelling errors, and script differences

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Extract romanized part from answers like "شكراً (shukran)"
 */
function extractRomanized(text: string): string {
  // Match content in parentheses
  const parenMatch = text.match(/\(([^)]+)\)/);
  if (parenMatch) return parenMatch[1].toLowerCase().trim();
  
  // If no parens, check if it's already romanized (Latin chars)
  const latinChars = text.match(/[a-zA-Z]+/g);
  if (latinChars) return latinChars.join(' ').toLowerCase().trim();
  
  return text.toLowerCase().trim();
}

/**
 * Normalize for comparison - remove common transliteration variations
 */
function normalizeTransliteration(text: string): string {
  return text
    .toLowerCase()
    .replace(/[''`ʿʾ]/g, '') // Remove Arabic transliteration marks
    .replace(/[āàáâä]/g, 'a')
    .replace(/[ēèéêë]/g, 'e')
    .replace(/[īìíîï]/g, 'i')
    .replace(/[ōòóôö]/g, 'o')
    .replace(/[ūùúûü]/g, 'u')
    .replace(/[ḥ]/g, 'h')
    .replace(/[ṭ]/g, 't')
    .replace(/[ṣ]/g, 's')
    .replace(/[ḍ]/g, 'd')
    .replace(/[ż]/g, 'z')
    .replace(/q/g, 'k') // q/k variation
    .replace(/kh/g, 'x') // kh sound
    .replace(/sh/g, 'ş') // sh sound
    .replace(/th/g, 'þ') // th sound
    .replace(/[^a-z]/g, ''); // Remove non-letters
}

interface AnswerValidation {
  isCorrect: boolean;
  isClose: boolean;
  similarity: number;
  feedback: string;
}

/**
 * Validate answer with fuzzy matching for language learning
 */
function validateAnswer(userAnswer: string, correctAnswer: string): AnswerValidation {
  const userClean = userAnswer.toLowerCase().trim();
  const correctClean = correctAnswer.toLowerCase().trim();
  
  // Exact match
  if (userClean === correctClean) {
    return { isCorrect: true, isClose: false, similarity: 1, feedback: '' };
  }
  
  // Extract romanized versions for comparison
  const userRoman = extractRomanized(userClean);
  const correctRoman = extractRomanized(correctClean);
  
  // Check romanized exact match
  if (userRoman === correctRoman) {
    return { isCorrect: true, isClose: false, similarity: 1, feedback: '' };
  }
  
  // Normalize and compare
  const userNorm = normalizeTransliteration(userRoman);
  const correctNorm = normalizeTransliteration(correctRoman);
  
  if (userNorm === correctNorm) {
    return { isCorrect: true, isClose: false, similarity: 1, feedback: '' };
  }
  
  // Calculate similarity
  const maxLen = Math.max(userNorm.length, correctNorm.length);
  if (maxLen === 0) {
    return { isCorrect: false, isClose: false, similarity: 0, feedback: '' };
  }
  
  const distance = levenshteinDistance(userNorm, correctNorm);
  const similarity = 1 - (distance / maxLen);
  
  // Very close (80%+ similar) = accept as correct with note
  if (similarity >= 0.8) {
    return { 
      isCorrect: true, 
      isClose: true, 
      similarity, 
      feedback: `Close enough! The standard spelling is "${correctRoman}".`
    };
  }
  
  // Somewhat close (60%+ similar) = wrong but encouraging
  if (similarity >= 0.6) {
    return { 
      isCorrect: false, 
      isClose: true, 
      similarity, 
      feedback: `Almost! The correct answer is "${correctRoman}".`
    };
  }
  
  // Not close
  return { isCorrect: false, isClose: false, similarity, feedback: '' };
}

/**
 * 🎲 Shuffle array using Fisher-Yates algorithm
 * Creates a new shuffled array, doesn't mutate original
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const QuizChunkViewer: React.FC<QuizChunkViewerProps> = ({
  chunk,
  isDarkMode,
  onComplete,
  onBack,
  userId,
  moduleId,
  moduleName,
  sectionIndex = 0,
  sectionTitle = 'Quiz Section',
  chunkIndex = 0
}) => {
  // 🎲 Shuffle options for each question to prevent pattern recognition
  // 🎯 FIX: Filter out empty/invalid options and questions
  const questions = React.useMemo(() => {
    return (chunk.quizQuestions || [])
      .filter(q => {
        // Filter out questions with incomplete data
        if (!q.question || q.question.trim().length < 5) return false;
        if (!q.correctAnswer || q.correctAnswer.trim().length === 0) return false;
        return true;
      })
      .map(q => {
        // Filter out empty options and ensure we have valid choices
        const validOptions = (q.options || []).filter(opt => opt && opt.trim().length > 0);
        
        // If we don't have enough options, add the correct answer if missing
        if (validOptions.length < 2 && q.correctAnswer && !validOptions.includes(q.correctAnswer)) {
          validOptions.push(q.correctAnswer);
        }
        
        return {
          ...q,
          options: validOptions.length > 0 ? shuffleArray(validOptions) : undefined
        };
      });
  }, [chunk.quizQuestions]);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionStates, setQuestionStates] = useState<Map<number, QuestionState>>(new Map());
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [flashcardsGenerated, setFlashcardsGenerated] = useState(0);
  
  // 📊 Activity tracking refs
  const questionStartTimeRef = useRef<number>(Date.now());
  const hintsUsedRef = useRef<number>(0);

  const currentQuestion = questions[currentQuestionIndex];
  
  // 📊 Track quiz start on mount
  useEffect(() => {
    if (userId && moduleId) {
      chunkActivityTracker.trackActivity({
        userId,
        moduleId,
        moduleName: moduleName || 'Course',
        sectionIndex,
        sectionTitle,
        chunkIndex,
        chunkId: chunk.id || `quiz_${moduleId}_${sectionIndex}_${chunkIndex}`,
        chunkTitle: chunk.title || 'Quiz',
        chunkType: 'quiz',
        activityType: 'chunk_started',
        data: {
          conceptCovered: chunk.title
        }
      }).catch(console.warn);
    }
  }, [userId, moduleId, chunk.id]);

  // Initialize question states
  useEffect(() => {
    const states = new Map<number, QuestionState>();
    questions.forEach((_, idx) => {
      states.set(idx, {
        answered: false,
        selectedAnswer: null,
        isCorrect: null,
        isCloseAnswer: false,
        showHint: false,
        showExplanation: false
      });
    });
    setQuestionStates(states);
  }, [questions.length]);

  const getCurrentState = (): QuestionState => {
    return questionStates.get(currentQuestionIndex) || {
      answered: false,
      selectedAnswer: null,
      isCorrect: null,
      isCloseAnswer: false,
      showHint: false,
      showExplanation: false
    };
  };

  const handleAnswerSelect = (answer: string) => {
    const state = getCurrentState();
    if (state.answered) return; // Already answered

    // 🎯 Use pedagogical validation with fuzzy matching
    const validation = validateAnswer(answer, currentQuestion.correctAnswer);
    const timeSpentMs = Date.now() - questionStartTimeRef.current;
    
    const newStates = new Map(questionStates);
    newStates.set(currentQuestionIndex, {
      ...state,
      answered: true,
      selectedAnswer: answer,
      isCorrect: validation.isCorrect,
      isCloseAnswer: validation.isClose,
      showExplanation: true
    });
    setQuestionStates(newStates);

    if (validation.isCorrect) {
      setScore(prev => prev + 1);
    }
    
    // 📊 Track quiz answer activity
    if (userId && moduleId) {
      chunkActivityTracker.trackActivity({
        userId,
        moduleId,
        moduleName: moduleName || 'Course',
        sectionIndex,
        sectionTitle,
        chunkIndex,
        chunkId: chunk.id || `quiz_${moduleId}_${sectionIndex}_${chunkIndex}`,
        chunkTitle: chunk.title || 'Quiz',
        chunkType: 'quiz',
        activityType: 'quiz_answer',
        data: {
          questionId: currentQuestion.id || `q_${currentQuestionIndex}`,
          questionText: currentQuestion.question,
          correctAnswer: currentQuestion.correctAnswer,
          userAnswer: answer,
          isCorrect: validation.isCorrect,
          isCloseAnswer: validation.isClose,
          similarity: validation.similarity,
          timeSpentMs,
          hintsUsed: state.showHint ? 1 : 0,
          conceptCovered: chunk.title || currentQuestion.concept
        }
      }).catch(console.warn);
      
      // Reset for next question
      questionStartTimeRef.current = Date.now();
    }
  };

  const handleShowHint = () => {
    const state = getCurrentState();
    const newStates = new Map(questionStates);
    newStates.set(currentQuestionIndex, { ...state, showHint: true });
    setQuestionStates(newStates);
    hintsUsedRef.current++;
    
    // 📊 Track hint usage
    if (userId && moduleId) {
      chunkActivityTracker.trackActivity({
        userId,
        moduleId,
        moduleName: moduleName || 'Course',
        sectionIndex,
        sectionTitle,
        chunkIndex,
        chunkId: chunk.id || `quiz_${moduleId}_${sectionIndex}_${chunkIndex}`,
        chunkTitle: chunk.title || 'Quiz',
        chunkType: 'quiz',
        activityType: 'hint_used',
        data: {
          questionText: currentQuestion?.question,
          conceptCovered: chunk.title
        }
      }).catch(console.warn);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      questionStartTimeRef.current = Date.now(); // Reset timer for next question
    } else {
      // Quiz complete - generate flashcards for wrong answers
      generateFlashcardsFromWrongAnswers();
      setQuizCompleted(true);
      onComplete(score, questions.length);
      
      // 📊 Track quiz completion
      if (userId && moduleId) {
        chunkActivityTracker.trackActivity({
          userId,
          moduleId,
          moduleName: moduleName || 'Course',
          sectionIndex,
          sectionTitle,
          chunkIndex,
          chunkId: chunk.id || `quiz_${moduleId}_${sectionIndex}_${chunkIndex}`,
          chunkTitle: chunk.title || 'Quiz',
          chunkType: 'quiz',
          activityType: 'chunk_completed',
          data: {
            conceptCovered: chunk.title,
            hintsUsed: hintsUsedRef.current
          }
        }).catch(console.warn);
      }
    }
  };

  // 🎴 Generate flashcards from questions the user got wrong
  const generateFlashcardsFromWrongAnswers = () => {
    if (!userId) return; // Need userId for flashcards
    
    const wrongQuestions: Array<{
      question: string;
      correctAnswer: string;
      userAnswer: string;
      explanation?: string;
      hint?: string;
      concept?: string;
    }> = [];

    questionStates.forEach((state, idx) => {
      if (state.answered && !state.isCorrect) {
        const q = questions[idx];
        wrongQuestions.push({
          question: q.question,
          correctAnswer: q.correctAnswer,
          userAnswer: state.selectedAnswer || '',
          explanation: q.explanation,
          hint: q.hint,
          concept: chunk.title
        });
      }
    });

    if (wrongQuestions.length > 0) {
      const generated = flashcardGeneratorService.generateFromQuizFailures(
        userId,
        moduleId || chunk.id || 'unknown',
        moduleName || chunk.title || 'Quiz',
        wrongQuestions
      );
      setFlashcardsGenerated(generated.length);
      console.log(`🎴 Generated ${generated.length} flashcards from quiz failures`);
    }
  };

  const handleRetry = () => {
    setCurrentQuestionIndex(0);
    setScore(0);
    setQuizCompleted(false);
    const states = new Map<number, QuestionState>();
    questions.forEach((_, idx) => {
      states.set(idx, {
        answered: false,
        selectedAnswer: null,
        isCorrect: null,
        isCloseAnswer: false,
        showHint: false,
        showExplanation: false
      });
    });
    setQuestionStates(states);
  };

  const speakQuestion = () => {
    if (currentQuestion?.question) {
      // Use ElevenLabs TTS (turbo model - cheapest) with Web Speech fallback
      quizAudioService.speak(currentQuestion.question, 'en').catch(console.warn);
    }
  };

  if (questions.length === 0) {
    return (
      <div className={`p-6 rounded-xl text-center ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
        <HelpCircle className={`w-12 h-12 mx-auto mb-4 ${isDarkMode ? 'text-stone-500' : 'text-stone-400'}`} />
        <p className={`mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          No quiz questions available for this section.
        </p>
        {/* 🎯 FIX: Always provide a continue button so users aren't stuck */}
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90"
        >
          <span>Continue</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // Quiz completed view
  if (quizCompleted) {
    const percentage = Math.round((score / questions.length) * 100);
    const passed = percentage >= 70;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`p-8 rounded-2xl text-center ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}
      >
        <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
          passed ? 'bg-green-500' : 'bg-orange-500'
        }`}>
          {passed ? (
            <Trophy className="w-10 h-10 text-white" />
          ) : (
            <RefreshCw className="w-10 h-10 text-white" />
          )}
        </div>

        <h3 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {passed ? 'Great Job!' : 'Keep Practicing!'}
        </h3>

        <p className={`text-lg mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          You scored <span className="font-bold">{score}</span> out of <span className="font-bold">{questions.length}</span> ({percentage}%)
        </p>

        {/* Flashcards generated notification */}
        {flashcardsGenerated > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
              isDarkMode ? 'bg-violet-500/20 border border-violet-500/30' : 'bg-violet-50 border border-violet-200'
            }`}
          >
            <Layers className={`w-6 h-6 ${isDarkMode ? 'text-violet-400' : 'text-violet-600'}`} />
            <div className="text-left">
              <p className={`font-medium ${isDarkMode ? 'text-violet-300' : 'text-violet-700'}`}>
                {flashcardsGenerated} Flashcard{flashcardsGenerated > 1 ? 's' : ''} Created!
              </p>
              <p className={`text-sm ${isDarkMode ? 'text-violet-400' : 'text-violet-600'}`}>
                Review them in Study Help to strengthen your memory
              </p>
            </div>
          </motion.div>
        )}

        <div className="flex items-center justify-center space-x-4">
          {!passed && (
            <button
              onClick={handleRetry}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium ${
                isDarkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              <RefreshCw className="w-5 h-5" />
              <span>Try Again</span>
            </button>
          )}
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90"
          >
            <span>Continue</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    );
  }

  const state = getCurrentState();

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-4">
        <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Question {currentQuestionIndex + 1} of {questions.length}
        </span>
        <div className="flex items-center space-x-1">
          {questions.map((_, idx) => (
            <div
              key={idx}
              className={`w-3 h-3 rounded-full transition-colors ${
                idx < currentQuestionIndex
                  ? questionStates.get(idx)?.isCorrect
                    ? 'bg-green-500'
                    : 'bg-red-500'
                  : idx === currentQuestionIndex
                    ? 'bg-violet-500'
                    : isDarkMode ? 'bg-white/20' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question */}
      <motion.div
        key={currentQuestionIndex}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className={`p-6 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}
      >
        <div className="flex items-start justify-between mb-4">
          <h4 className={`text-xl font-semibold flex-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {currentQuestion.question}
          </h4>
          <button
            onClick={speakQuestion}
            className={`p-2 rounded-lg ml-4 ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}
            title="Read aloud"
          >
            <Volume2 className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>
        </div>

        {/* Target word display for language questions */}
        {currentQuestion.targetWord && (
          <div className={`mb-4 p-4 rounded-lg ${isDarkMode ? 'bg-violet-500/20' : 'bg-violet-50'}`}>
            <div className="text-center">
              <p className={`text-2xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {currentQuestion.targetWord}
              </p>
              {currentQuestion.transliteration && (
                <p className={`text-lg ${isDarkMode ? 'text-violet-300' : 'text-violet-600'}`}>
                  {currentQuestion.transliteration}
                </p>
              )}
              {currentQuestion.pronunciation && (
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  [{currentQuestion.pronunciation}]
                </p>
              )}
            </div>
          </div>
        )}

        {/* Multiple choice options */}
        {currentQuestion.options && (
          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = state.selectedAnswer === option;
              const isCorrectAnswer = option.toLowerCase().trim() === currentQuestion.correctAnswer.toLowerCase().trim();
              const showResult = state.answered;

              let optionStyle = isDarkMode ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-white hover:bg-gray-50 border-gray-200';
              
              if (showResult) {
                if (isCorrectAnswer) {
                  optionStyle = 'bg-green-500/20 border-green-500 text-green-500';
                } else if (isSelected && !isCorrectAnswer) {
                  optionStyle = 'bg-red-500/20 border-red-500 text-red-500';
                }
              } else if (isSelected) {
                optionStyle = 'bg-violet-500/20 border-violet-500';
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={state.answered}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${optionStyle} ${
                    state.answered ? 'cursor-default' : 'cursor-pointer'
                  }`}
                >
                  <span className={`font-medium ${
                    showResult && (isCorrectAnswer || (isSelected && !isCorrectAnswer))
                      ? ''
                      : isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {String.fromCharCode(65 + idx)}. {option}
                  </span>
                  {showResult && isCorrectAnswer && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {showResult && isSelected && !isCorrectAnswer && <XCircle className="w-5 h-5 text-red-500" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Fill in the blank / translate */}
        {!currentQuestion.options && (
          <div className="mt-4">
            <input
              type="text"
              placeholder="Type your answer..."
              disabled={state.answered}
              className={`w-full p-4 rounded-xl border-2 ${
                isDarkMode 
                  ? 'bg-white/5 border-white/20 text-white placeholder-gray-500' 
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
              } focus:outline-none focus:border-violet-500`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAnswerSelect((e.target as HTMLInputElement).value);
                }
              }}
            />
            {!state.answered && (
              <button
                onClick={() => {
                  const input = document.querySelector('input') as HTMLInputElement;
                  if (input?.value) handleAnswerSelect(input.value);
                }}
                className="mt-3 px-6 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600"
              >
                Submit Answer
              </button>
            )}
          </div>
        )}

        {/* Hint button */}
        {currentQuestion.hint && !state.answered && !state.showHint && (
          <button
            onClick={handleShowHint}
            className={`mt-4 flex items-center space-x-2 text-sm ${
              isDarkMode ? 'text-violet-400 hover:text-violet-300' : 'text-violet-600 hover:text-violet-700'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Need a hint?</span>
          </button>
        )}

        {/* Hint display */}
        {state.showHint && currentQuestion.hint && (
          <div className={`mt-4 p-4 rounded-lg ${isDarkMode ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-yellow-50 border border-yellow-200'}`}>
            <p className={`text-sm flex items-start space-x-2 ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
              <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{currentQuestion.hint}</span>
            </p>
          </div>
        )}

        {/* Explanation after answering */}
        {state.showExplanation && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-4 p-4 rounded-lg ${
              state.isCorrect
                ? state.isCloseAnswer
                  ? isDarkMode ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-yellow-50 border border-yellow-200'
                  : isDarkMode ? 'bg-green-500/10 border border-green-500/30' : 'bg-green-50 border border-green-200'
                : state.isCloseAnswer
                  ? isDarkMode ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-orange-50 border border-orange-200'
                  : isDarkMode ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
            }`}
          >
            <p className={`text-sm ${
              state.isCorrect
                ? state.isCloseAnswer
                  ? isDarkMode ? 'text-yellow-300' : 'text-yellow-700'
                  : isDarkMode ? 'text-green-300' : 'text-green-700'
                : state.isCloseAnswer
                  ? isDarkMode ? 'text-orange-300' : 'text-orange-700'
                  : isDarkMode ? 'text-blue-300' : 'text-blue-700'
            }`}>
              <strong>
                {state.isCorrect 
                  ? state.isCloseAnswer 
                    ? '✓ Close enough!' 
                    : '✓ Correct!' 
                  : state.isCloseAnswer
                    ? '⚡ Almost there!'
                    : '✗ Not quite.'}
              </strong>{' '}
              {state.isCloseAnswer && state.isCorrect && (
                <span>The standard spelling is <strong>"{extractRomanized(currentQuestion.correctAnswer)}"</strong>. </span>
              )}
              {state.isCloseAnswer && !state.isCorrect && (
                <span>The correct answer is <strong>"{extractRomanized(currentQuestion.correctAnswer)}"</strong>. </span>
              )}
              {currentQuestion.explanation}
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Next button */}
      {state.answered && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={handleNextQuestion}
          className="w-full py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 flex items-center justify-center space-x-2"
        >
          <span>{currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'See Results'}</span>
          <ArrowRight className="w-5 h-5" />
        </motion.button>
      )}
    </div>
  );
};

export default QuizChunkViewer;




