/**
 * 🎯 DYNAMIC QUIZ WIDGET
 * 
 * Dashboard widget that displays personalized quizzes based on:
 * - SM2 spaced repetition items due for review
 * - Weak concepts from past quiz performance
 * - Knowledge gaps identified during learning
 * 
 * This is the missing piece that connects all learning tracking
 * to actionable review sessions on the dashboard.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Sparkles,
  Clock,
  Target,
  CheckCircle,
  XCircle,
  ArrowRight,
  RefreshCw,
  Trophy,
  Flame,
  AlertCircle,
  HelpCircle,
  Lightbulb,
  BarChart3,
  X
} from 'lucide-react';
import { dynamicQuizGenerator, type DynamicQuiz, type DynamicQuizQuestion } from '../services/DynamicQuizGenerator';

interface DynamicQuizWidgetProps {
  userId: string;
  isDarkMode: boolean;
  onClose?: () => void;
  compact?: boolean; // For embedded widget view
}

type WidgetState = 'preview' | 'quiz' | 'results';

export const DynamicQuizWidget: React.FC<DynamicQuizWidgetProps> = ({
  userId,
  isDarkMode,
  onClose,
  compact = false
}) => {
  const [state, setState] = useState<WidgetState>('preview');
  const [quiz, setQuiz] = useState<DynamicQuiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, { answer: string; correct: boolean; timeMs: number }>>(new Map());
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [showHint, setShowHint] = useState(false);

  // Load quiz stats on mount
  useEffect(() => {
    const quizStats = dynamicQuizGenerator.getQuizStats(userId);
    setStats(quizStats);
  }, [userId]);

  const generateQuiz = useCallback(async () => {
    setLoading(true);
    try {
      const newQuiz = await dynamicQuizGenerator.generateDailyReviewQuiz(userId, {
        maxQuestions: compact ? 5 : 10,
        includeSpacedRepetition: true,
        includeWeakConcepts: true,
        includeKnowledgeGaps: true
      });
      setQuiz(newQuiz);
      setState('quiz');
      setCurrentQuestionIndex(0);
      setAnswers(new Map());
      setQuestionStartTime(Date.now());
    } catch (e) {
      console.error('Failed to generate quiz:', e);
    } finally {
      setLoading(false);
    }
  }, [userId, compact]);

  const currentQuestion = quiz?.questions[currentQuestionIndex];

  const handleAnswer = (answer: string) => {
    if (!currentQuestion) return;
    
    const timeMs = Date.now() - questionStartTime;
    const isCorrect = answer.toLowerCase().trim() === currentQuestion.correctAnswer.toLowerCase().trim();
    
    setAnswers(prev => new Map(prev).set(currentQuestion.id, {
      answer,
      correct: isCorrect,
      timeMs
    }));

    // Auto-advance after a delay to show feedback
    setTimeout(() => {
      if (currentQuestionIndex < (quiz?.questions.length || 0) - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setQuestionStartTime(Date.now());
        setShowHint(false);
      } else {
        finishQuiz();
      }
    }, 1500);
  };

  const finishQuiz = async () => {
    if (!quiz) return;

    const results = Array.from(answers.entries()).map(([questionId, data]) => ({
      questionId,
      userAnswer: data.answer,
      isCorrect: data.correct,
      timeSpentMs: data.timeMs
    }));

    await dynamicQuizGenerator.recordQuizResults(quiz, results);
    
    // Update stats
    const newStats = dynamicQuizGenerator.getQuizStats(userId);
    setStats(newStats);
    
    setState('results');
  };

  const score = quiz ? Array.from(answers.values()).filter(a => a.correct).length : 0;
  const totalQuestions = quiz?.questions.length || 0;
  const scorePercent = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

  // PREVIEW STATE - Show quiz stats and start button
  if (state === 'preview') {
    return (
      <div className={`rounded-2xl p-6 ${isDarkMode ? 'bg-gradient-to-br from-violet-900/50 to-purple-900/50 border border-violet-500/20' : 'bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600`}>
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Daily Review Quiz
              </h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Personalized for your learning
              </p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-200'}`}>
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className={`p-3 rounded-xl text-center ${isDarkMode ? 'bg-white/5' : 'bg-white'}`}>
              <Flame className={`w-5 h-5 mx-auto mb-1 ${stats.streakDays > 0 ? 'text-orange-500' : isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              <div className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {stats.streakDays}
              </div>
              <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                Day Streak
              </div>
            </div>
            <div className={`p-3 rounded-xl text-center ${isDarkMode ? 'bg-white/5' : 'bg-white'}`}>
              <Trophy className={`w-5 h-5 mx-auto mb-1 text-yellow-500`} />
              <div className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {stats.averageScore}%
              </div>
              <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                Avg Score
              </div>
            </div>
            <div className={`p-3 rounded-xl text-center ${isDarkMode ? 'bg-white/5' : 'bg-white'}`}>
              <Target className={`w-5 h-5 mx-auto mb-1 text-green-500`} />
              <div className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {stats.conceptsReviewed}
              </div>
              <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                Concepts
              </div>
            </div>
          </div>
        )}

        {/* Weak areas alert */}
        {stats?.weakAreas && stats.weakAreas.length > 0 && (
          <div className={`p-3 rounded-xl mb-4 ${isDarkMode ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-orange-50 border border-orange-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className={`w-4 h-4 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} />
              <span className={`text-sm font-medium ${isDarkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                Areas to strengthen:
              </span>
            </div>
            <p className={`text-sm ${isDarkMode ? 'text-orange-400/80' : 'text-orange-600'}`}>
              {stats.weakAreas.slice(0, 3).join(', ')}
            </p>
          </div>
        )}

        <button
          onClick={generateQuiz}
          disabled={loading}
          className="w-full py-4 rounded-xl font-semibold bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Start Review Quiz
            </>
          )}
        </button>
      </div>
    );
  }

  // QUIZ STATE - Show questions
  if (state === 'quiz' && quiz && currentQuestion) {
    const currentAnswer = answers.get(currentQuestion.id);
    const isAnswered = !!currentAnswer;

    return (
      <div className={`rounded-2xl overflow-hidden ${isDarkMode ? 'bg-slate-900 border border-white/10' : 'bg-white border border-gray-200'}`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-white/10 bg-violet-900/30' : 'border-gray-100 bg-violet-50'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </span>
            <div className="flex items-center gap-1">
              {quiz.questions.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx < currentQuestionIndex
                      ? answers.get(quiz.questions[idx].id)?.correct
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
          
          {/* Source indicator */}
          <div className={`mt-2 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {currentQuestion.source.type === 'sm2_review' && '📅 Scheduled Review'}
            {currentQuestion.source.type === 'weak_concept' && '💪 Strengthening'}
            {currentQuestion.source.type === 'knowledge_gap' && '🧠 Knowledge Gap'}
            {currentQuestion.source.type === 'flashcard' && '🎴 Flashcard'}
            {currentQuestion.source.moduleName && ` • ${currentQuestion.source.moduleName}`}
          </div>
        </div>

        {/* Question */}
        <div className="p-6">
          <h4 className={`text-xl font-semibold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {currentQuestion.question}
          </h4>

          {/* Multiple choice options */}
          {currentQuestion.options ? (
            <div className="space-y-3">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = currentAnswer?.answer === option;
                const isCorrect = option.toLowerCase().trim() === currentQuestion.correctAnswer.toLowerCase().trim();
                
                let optionStyle = isDarkMode 
                  ? 'bg-white/5 hover:bg-white/10 border-white/10' 
                  : 'bg-gray-50 hover:bg-gray-100 border-gray-200';
                
                if (isAnswered) {
                  if (isCorrect) {
                    optionStyle = 'bg-green-500/20 border-green-500';
                  } else if (isSelected && !isCorrect) {
                    optionStyle = 'bg-red-500/20 border-red-500';
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => !isAnswered && handleAnswer(option)}
                    disabled={isAnswered}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${optionStyle} ${isAnswered ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                      {option}
                    </span>
                    {isAnswered && isCorrect && <CheckCircle className="w-5 h-5 text-green-500" />}
                    {isAnswered && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500" />}
                  </button>
                );
              })}
            </div>
          ) : (
            // Short answer
            <div>
              <input
                type="text"
                placeholder="Type your answer..."
                disabled={isAnswered}
                className={`w-full p-4 rounded-xl border-2 ${isDarkMode ? 'bg-white/5 border-white/20 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isAnswered) {
                    handleAnswer((e.target as HTMLInputElement).value);
                  }
                }}
              />
            </div>
          )}

          {/* Hint button */}
          {currentQuestion.hint && !isAnswered && !showHint && (
            <button
              onClick={() => setShowHint(true)}
              className={`mt-4 flex items-center gap-2 text-sm ${isDarkMode ? 'text-violet-400' : 'text-violet-600'}`}
            >
              <HelpCircle className="w-4 h-4" />
              Need a hint?
            </button>
          )}

          {/* Hint display */}
          {showHint && currentQuestion.hint && (
            <div className={`mt-4 p-4 rounded-xl ${isDarkMode ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-yellow-50 border border-yellow-200'}`}>
              <div className="flex items-start gap-2">
                <Lightbulb className={`w-4 h-4 mt-0.5 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                <p className={`text-sm ${isDarkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                  {currentQuestion.hint}
                </p>
              </div>
            </div>
          )}

          {/* Explanation after answering */}
          {isAnswered && currentQuestion.explanation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 p-4 rounded-xl ${
                currentAnswer?.correct
                  ? isDarkMode ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-200'
                  : isDarkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'
              }`}
            >
              <p className={`text-sm ${
                currentAnswer?.correct
                  ? isDarkMode ? 'text-green-300' : 'text-green-700'
                  : isDarkMode ? 'text-blue-300' : 'text-blue-700'
              }`}>
                <strong>{currentAnswer?.correct ? '✓ Correct!' : '✗ Not quite.'}</strong>{' '}
                {currentQuestion.explanation}
              </p>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // RESULTS STATE - Show final score
  if (state === 'results' && quiz) {
    const passed = scorePercent >= 70;

    return (
      <div className={`rounded-2xl p-8 text-center ${isDarkMode ? 'bg-slate-900 border border-white/10' : 'bg-white border border-gray-200'}`}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
            passed ? 'bg-gradient-to-br from-green-400 to-emerald-600' : 'bg-gradient-to-br from-orange-400 to-amber-600'
          }`}
        >
          {passed ? (
            <Trophy className="w-12 h-12 text-white" />
          ) : (
            <RefreshCw className="w-12 h-12 text-white" />
          )}
        </motion.div>

        <h3 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {passed ? 'Great Job!' : 'Keep Practicing!'}
        </h3>

        <p className={`text-lg mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          You scored <span className="font-bold">{score}</span> out of <span className="font-bold">{totalQuestions}</span> ({scorePercent}%)
        </p>

        {/* Progress breakdown */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-green-500/10' : 'bg-green-50'}`}>
            <CheckCircle className="w-6 h-6 mx-auto mb-1 text-green-500" />
            <div className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{score}</div>
            <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Correct</div>
          </div>
          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-red-500/10' : 'bg-red-50'}`}>
            <XCircle className="w-6 h-6 mx-auto mb-1 text-red-500" />
            <div className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{totalQuestions - score}</div>
            <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>To Review</div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setState('preview');
              setQuiz(null);
            }}
            className={`flex-1 py-3 rounded-xl font-medium ${isDarkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
          >
            Done
          </button>
          <button
            onClick={generateQuiz}
            className="flex-1 py-3 rounded-xl font-medium bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            New Quiz
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default DynamicQuizWidget;

