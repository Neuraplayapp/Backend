/**
 * 🎯 COMPETENCY HELP MODAL
 * 
 * Displays targeted remediation content for struggling competencies
 * Shows: Explanation, Examples, Practice Questions, Study Plan
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, CheckCircle, AlertCircle, Target, Trophy, Lightbulb, ChevronRight } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { competencyRemediationService } from '../services/CompetencyRemediationService';
import type { RemediationContent } from '../services/CompetencyRemediationService';
import type { Question, UserResponse } from '../types/LearningModule.types';

interface CompetencyHelpModalProps {
  competencyName: string;
  currentLevel: number;
  courseContext: string;
  strengthAreas: string[];
  onClose: () => void;
  onComplete?: (improvement: number) => void;
}

export const CompetencyHelpModal: React.FC<CompetencyHelpModalProps> = ({
  competencyName,
  currentLevel,
  courseContext,
  strengthAreas,
  onClose,
  onComplete
}) => {
  const { isDarkMode } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<RemediationContent | null>(null);
  const [currentSection, setCurrentSection] = useState<'overview' | 'practice' | 'results'>('overview');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<UserResponse[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    loadRemediationContent();
  }, []);

  const loadRemediationContent = async () => {
    setLoading(true);
    try {
      const remediation = await competencyRemediationService.generateRemediation(
        competencyName,
        currentLevel,
        courseContext,
        strengthAreas
      );
      setContent(remediation);
    } catch (error) {
      console.error('Failed to load remediation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    if (!content || showResults) return;

    const currentQuestion = content.practiceQuestions[currentQuestionIndex];
    const isCorrect = answer === currentQuestion.correctAnswer;

    const response: UserResponse = {
      questionId: currentQuestion.id,
      userAnswer: answer,
      isCorrect,
      timestamp: new Date(),
      timeSpent: 0
    };

    setResponses([...responses, response]);
    setShowResults(true);

    // Auto-advance after 2 seconds
    setTimeout(() => {
      if (currentQuestionIndex < content.practiceQuestions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setShowResults(false);
      } else {
        // All questions done
        const score = responses.filter(r => r.isCorrect).length + (isCorrect ? 1 : 0);
        const improvement = Math.round((score / content.practiceQuestions.length) * 30); // Up to 30% improvement
        setCurrentSection('results');
        if (onComplete) {
          onComplete(improvement);
        }
      }
    }, 2500);
  };

  if (loading || !content) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-8`}>
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
            <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>Generating personalized help...</p>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = content.practiceQuestions[currentQuestionIndex];
  const correctCount = responses.filter(r => r.isCorrect).length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-violet-600 to-purple-600 p-6 rounded-t-2xl flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Targeted Help</h2>
              <p className="text-violet-100">{competencyName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Progress indicator */}
          <div className={`px-6 py-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between text-sm">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                Current Level: <span className="font-bold text-orange-500">{currentLevel}%</span>
              </span>
              {currentSection === 'practice' && (
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Question {currentQuestionIndex + 1} of {content.practiceQuestions.length}
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {currentSection === 'overview' && (
              <div className="space-y-6">
                {/* Encouragement */}
                <div className={`p-4 rounded-xl border-2 border-violet-500/30 ${isDarkMode ? 'bg-violet-500/10' : 'bg-violet-50'}`}>
                  <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{content.encouragement}</p>
                </div>

                {/* Explanation */}
                <div>
                  <h3 className={`text-lg font-bold mb-3 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    <BookOpen className="w-5 h-5 text-violet-500" />
                    Understanding {competencyName}
                  </h3>
                  <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                    {content.explanation}
                  </p>
                </div>

                {/* Key Points */}
                <div>
                  <h3 className={`text-lg font-bold mb-3 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    <Target className="w-5 h-5 text-blue-500" />
                    Key Concepts
                  </h3>
                  <ul className="space-y-2">
                    {content.keyPoints.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Examples */}
                <div>
                  <h3 className={`text-lg font-bold mb-3 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                    Examples
                  </h3>
                  <div className="space-y-3">
                    {content.examples.map((example, idx) => (
                      <div key={idx} className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{example}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Study Plan */}
                <div>
                  <h3 className={`text-lg font-bold mb-3 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    <ChevronRight className="w-5 h-5 text-purple-500" />
                    Your Study Plan
                  </h3>
                  <div className="space-y-3">
                    {content.studyPlan.map((step) => (
                      <div key={step.step} className={`p-4 rounded-lg border ${isDarkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-white'}`}>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                            {step.step}
                          </div>
                          <div className="flex-1">
                            <h4 className={`font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {step.title}
                            </h4>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {step.description}
                            </p>
                            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                              ~{step.estimatedMinutes} minutes
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Start Practice Button */}
                {content.practiceQuestions.length > 0 && (
                  <button
                    onClick={() => setCurrentSection('practice')}
                    className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg"
                  >
                    Start Practice Questions ({content.practiceQuestions.length} questions)
                  </button>
                )}
              </div>
            )}

            {currentSection === 'practice' && currentQuestion && (
              <div className="space-y-6">
                <div>
                  <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {currentQuestion.text}
                  </h3>
                  <div className="space-y-3">
                    {currentQuestion.options?.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAnswerSelect(option[0])}
                        disabled={showResults}
                        className={`w-full p-4 rounded-xl text-left transition-all ${
                          showResults
                            ? option[0] === currentQuestion.correctAnswer
                              ? 'bg-green-500/20 border-2 border-green-500'
                              : responses[responses.length - 1]?.userAnswer === option[0]
                              ? 'bg-red-500/20 border-2 border-red-500'
                              : isDarkMode
                              ? 'bg-gray-700 opacity-50'
                              : 'bg-gray-100 opacity-50'
                            : isDarkMode
                            ? 'bg-gray-700 hover:bg-gray-600 border-2 border-transparent'
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                        }`}
                      >
                        <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{option}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {showResults && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl ${
                      responses[responses.length - 1]?.isCorrect
                        ? 'bg-green-500/20 border-2 border-green-500'
                        : 'bg-red-500/20 border-2 border-red-500'
                    }`}
                  >
                    <p className={`font-semibold mb-2 ${
                      responses[responses.length - 1]?.isCorrect ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {responses[responses.length - 1]?.isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                    </p>
                    <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                      {currentQuestion.explanation}
                    </p>
                  </motion.div>
                )}

                <div className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Score: {correctCount} / {responses.length}
                </div>
              </div>
            )}

            {currentSection === 'results' && (
              <div className="space-y-6 text-center">
                <div className="flex justify-center">
                  <Trophy className="w-24 h-24 text-yellow-500" />
                </div>
                <h3 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Practice Complete!
                </h3>
                <div className={`text-4xl font-bold ${
                  correctCount >= content.practiceQuestions.length * 0.8 ? 'text-green-500' :
                  correctCount >= content.practiceQuestions.length * 0.6 ? 'text-yellow-500' :
                  'text-orange-500'
                }`}>
                  {correctCount} / {content.practiceQuestions.length}
                </div>
                <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                  {correctCount >= content.practiceQuestions.length * 0.8
                    ? `Excellent work! You've improved your understanding of ${competencyName}!`
                    : correctCount >= content.practiceQuestions.length * 0.6
                    ? `Good progress! Keep practicing ${competencyName} to reach mastery.`
                    : `Keep going! ${competencyName} takes practice. Review the concepts and try again.`}
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setCurrentSection('overview');
                      setCurrentQuestionIndex(0);
                      setResponses([]);
                      setShowResults(false);
                    }}
                    className={`flex-1 py-3 rounded-xl font-semibold ${
                      isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    Review Concepts
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CompetencyHelpModal;

