/**
 * 🎴 FLASHCARD STUDY COMPONENT
 * 
 * Interactive flashcard study interface with:
 * - Card flip animation
 * - SM2 feedback buttons (Forgot | Hard | Good | Easy)
 * - Progress tracking
 * - Session stats
 * 
 * INTEGRATES WITH: FlashcardGeneratorService for data & review recording
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  RotateCcw,
  Lightbulb,
  ChevronRight,
  Trophy,
  Brain,
  Clock,
  Flame,
  Target,
  Volume2,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { flashcardGeneratorService, type Flashcard, type FlashcardStudySession } from '../services/FlashcardGeneratorService';
import type { Feedback } from '../services/SM2SpacedRepetitionService';
import { useTheme } from '../contexts/ThemeContext';

interface FlashcardStudyComponentProps {
  userId: string;
  onClose: () => void;
  deckId?: string;
  category?: string;
}

const FlashcardStudyComponent: React.FC<FlashcardStudyComponentProps> = ({
  userId,
  onClose,
  deckId,
  category
}) => {
  const { isDarkMode, isDarkGradient } = useTheme();
  const dark = isDarkMode || isDarkGradient;

  // State
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [session, setSession] = useState<FlashcardStudySession | null>(null);
  const [cardStartTime, setCardStartTime] = useState<number>(Date.now());
  const [sessionComplete, setSessionComplete] = useState(false);
  const [cardsToReviewAgain, setCardsToReviewAgain] = useState<Flashcard[]>([]);

  // Load cards
  useEffect(() => {
    let loadedCards: Flashcard[];
    
    if (category) {
      loadedCards = flashcardGeneratorService.getCardsByCategory(userId, category);
    } else {
      loadedCards = flashcardGeneratorService.getDueCards(userId, 30);
    }

    // Shuffle cards
    loadedCards = [...loadedCards].sort(() => Math.random() - 0.5);
    
    setCards(loadedCards);
    
    // Start session
    const newSession = flashcardGeneratorService.startStudySession(userId, deckId);
    setSession(newSession);
    setCardStartTime(Date.now());

    console.log(`🎴 Started study session with ${loadedCards.length} cards`);
  }, [userId, deckId, category]);

  const currentCard = cards[currentIndex];

  const handleFlip = useCallback(() => {
    setIsFlipped(!isFlipped);
  }, [isFlipped]);

  const handleFeedback = useCallback((feedback: Feedback) => {
    if (!currentCard || !session) return;

    const responseTime = Date.now() - cardStartTime;
    
    // Record review
    const result = flashcardGeneratorService.recordReview(
      currentCard.id,
      feedback,
      responseTime
    );

    // Update session
    session.cardResults.push({
      cardId: currentCard.id,
      feedback,
      responseTime,
      wasCorrect: feedback === 'good' || feedback === 'easy'
    });

    // If should show again (quality < 3), add to review-again queue
    if (result?.shouldShowAgain) {
      setCardsToReviewAgain(prev => [...prev, currentCard]);
    }

    // Move to next card
    moveToNextCard();
  }, [currentCard, session, cardStartTime]);

  const moveToNextCard = useCallback(() => {
    setIsFlipped(false);
    setShowHint(false);
    setCardStartTime(Date.now());

    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (cardsToReviewAgain.length > 0) {
      // Review failed cards again
      setCards(cardsToReviewAgain);
      setCardsToReviewAgain([]);
      setCurrentIndex(0);
    } else {
      // Session complete
      if (session) {
        flashcardGeneratorService.endStudySession(session);
      }
      setSessionComplete(true);
    }
  }, [currentIndex, cards.length, cardsToReviewAgain, session]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (sessionComplete) return;
    
    switch (e.key) {
      case ' ':
      case 'Enter':
        e.preventDefault();
        handleFlip();
        break;
      case '1':
        if (isFlipped) handleFeedback('forgot');
        break;
      case '2':
        if (isFlipped) handleFeedback('hard');
        break;
      case '3':
        if (isFlipped) handleFeedback('good');
        break;
      case '4':
        if (isFlipped) handleFeedback('easy');
        break;
      case 'h':
        if (!isFlipped) setShowHint(true);
        break;
      case 'Escape':
        onClose();
        break;
    }
  }, [isFlipped, sessionComplete, handleFlip, handleFeedback, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Calculate session stats
  const correctCount = session?.cardResults.filter(r => r.wasCorrect).length || 0;
  const totalReviewed = session?.cardResults.length || 0;
  const accuracy = totalReviewed > 0 ? Math.round((correctCount / totalReviewed) * 100) : 0;

  const getCardClasses = () => dark
    ? 'bg-slate-800/90 border border-white/10'
    : 'bg-white/95 border border-gray-200';

  const getTextColor = (type: 'primary' | 'secondary') => {
    if (type === 'primary') return dark ? 'text-white' : 'text-gray-900';
    return dark ? 'text-gray-400' : 'text-gray-600';
  };

  // Empty state
  if (cards.length === 0 && !sessionComplete) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: dark ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.5)' }}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className={`${getCardClasses()} rounded-2xl p-8 max-w-md text-center`}
        >
          <Sparkles className="w-16 h-16 text-violet-500 mx-auto mb-4" />
          <h2 className={`text-2xl font-bold mb-2 ${getTextColor('primary')}`}>
            All Caught Up! 🎉
          </h2>
          <p className={`mb-6 ${getTextColor('secondary')}`}>
            No flashcards due for review right now. Keep learning and new cards will appear!
          </p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl hover:from-violet-600 hover:to-purple-700 transition-all font-medium"
          >
            Back to Dashboard
          </button>
        </motion.div>
      </motion.div>
    );
  }

  // Session complete
  if (sessionComplete) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: dark ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.5)' }}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className={`${getCardClasses()} rounded-2xl p-8 max-w-lg w-full text-center`}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
          >
            <Trophy className="w-20 h-20 text-amber-500 mx-auto mb-4" />
          </motion.div>
          
          <h2 className={`text-3xl font-bold mb-2 ${getTextColor('primary')}`}>
            Session Complete! 🎉
          </h2>
          <p className={`mb-8 ${getTextColor('secondary')}`}>
            Great job reviewing your flashcards!
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className={`${dark ? 'bg-slate-700/50' : 'bg-gray-100'} rounded-xl p-4`}>
              <div className="text-3xl font-bold text-violet-500">{totalReviewed}</div>
              <div className={`text-sm ${getTextColor('secondary')}`}>Cards Reviewed</div>
            </div>
            <div className={`${dark ? 'bg-slate-700/50' : 'bg-gray-100'} rounded-xl p-4`}>
              <div className="text-3xl font-bold text-green-500">{correctCount}</div>
              <div className={`text-sm ${getTextColor('secondary')}`}>Remembered</div>
            </div>
            <div className={`${dark ? 'bg-slate-700/50' : 'bg-gray-100'} rounded-xl p-4`}>
              <div className="text-3xl font-bold text-amber-500">{accuracy}%</div>
              <div className={`text-sm ${getTextColor('secondary')}`}>Accuracy</div>
            </div>
          </div>

          {/* Encouragement based on accuracy */}
          <div className={`${dark ? 'bg-violet-500/20 border-violet-500/30' : 'bg-violet-50 border-violet-200'} border rounded-xl p-4 mb-6`}>
            <p className={`${dark ? 'text-violet-300' : 'text-violet-700'}`}>
              {accuracy >= 80 ? '🌟 Excellent retention! Your memory is on fire!' :
               accuracy >= 60 ? '👍 Good progress! Keep practicing for better recall.' :
               '💪 Every review strengthens your memory. You\'ve got this!'}
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={onClose}
              className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all ${
                dark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              Done
            </button>
            <button
              onClick={() => {
                setSessionComplete(false);
                setCurrentIndex(0);
                setCards(flashcardGeneratorService.getDueCards(userId, 30).sort(() => Math.random() - 0.5));
                setSession(flashcardGeneratorService.startStudySession(userId, deckId));
              }}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl hover:from-violet-600 hover:to-purple-700 transition-all font-medium"
            >
              Study More
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex flex-col"
      style={{ backgroundColor: dark ? '#0f0f1a' : '#f5f5f7' }}
    >
      {/* Header */}
      <div className={`flex items-center justify-between p-4 border-b ${dark ? 'border-white/10' : 'border-gray-200'}`}>
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className={`p-2 rounded-full hover:bg-white/10 transition-colors ${getTextColor('secondary')}`}
          >
            <X className="w-6 h-6" />
          </button>
          <div>
            <h1 className={`text-lg font-semibold ${getTextColor('primary')}`}>
              Flashcard Study
            </h1>
            <p className={`text-sm ${getTextColor('secondary')}`}>
              {currentIndex + 1} of {cards.length} {cardsToReviewAgain.length > 0 ? `(+${cardsToReviewAgain.length} to review)` : ''}
            </p>
          </div>
        </div>

        {/* Session stats */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-green-500" />
            <span className={getTextColor('primary')}>{correctCount}/{totalReviewed}</span>
          </div>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className={getTextColor('primary')}>{accuracy}%</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-gray-200 dark:bg-gray-800">
        <motion.div
          className="h-full bg-gradient-to-r from-violet-500 to-purple-600"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Card Area */}
      <div className="flex-1 flex items-center justify-center p-8">
        {currentCard && (
          <motion.div
            key={currentCard.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-2xl perspective-1000"
          >
            {/* Flip Card Container */}
            <div
              className="relative w-full cursor-pointer"
              style={{ transformStyle: 'preserve-3d', minHeight: '400px' }}
              onClick={handleFlip}
            >
              <motion.div
                className="absolute inset-0"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Front of card */}
                <div
                  className={`absolute inset-0 ${getCardClasses()} rounded-3xl p-8 flex flex-col items-center justify-center backface-hidden shadow-2xl`}
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  {/* Category badge */}
                  {currentCard.category && (
                    <span className={`absolute top-4 left-4 text-xs px-3 py-1 rounded-full ${
                      dark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-700'
                    }`}>
                      {currentCard.category}
                    </span>
                  )}

                  {/* Difficulty badge */}
                  <span className={`absolute top-4 right-4 text-xs px-3 py-1 rounded-full ${
                    currentCard.difficulty === 'hard' ? 'bg-red-500/20 text-red-400' :
                    currentCard.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                    'bg-amber-500/20 text-amber-400'
                  }`}>
                    {currentCard.difficulty}
                  </span>

                  <Brain className={`w-12 h-12 mb-6 ${dark ? 'text-violet-400' : 'text-violet-600'}`} />
                  
                  <p className={`text-2xl text-center font-medium leading-relaxed ${getTextColor('primary')}`}>
                    {currentCard.front}
                  </p>

                  {/* Hint */}
                  {currentCard.hint && (
                    <div className="mt-8">
                      {showHint ? (
                        <motion.p
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`text-center ${dark ? 'text-amber-400' : 'text-amber-600'}`}
                        >
                          💡 {currentCard.hint}
                        </motion.p>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowHint(true); }}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                            dark ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 
                            'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          } transition-colors`}
                        >
                          <Lightbulb className="w-4 h-4" />
                          Show Hint
                        </button>
                      )}
                    </div>
                  )}

                  <p className={`absolute bottom-6 text-sm ${getTextColor('secondary')}`}>
                    Tap or press Space to reveal answer
                  </p>
                </div>

                {/* Back of card */}
                <div
                  className={`absolute inset-0 ${getCardClasses()} rounded-3xl p-8 flex flex-col items-center justify-center backface-hidden shadow-2xl`}
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <Sparkles className={`w-12 h-12 mb-6 ${dark ? 'text-green-400' : 'text-green-600'}`} />
                  
                  <p className={`text-2xl text-center font-medium leading-relaxed ${getTextColor('primary')}`}>
                    {currentCard.back}
                  </p>

                  {/* Source info */}
                  {currentCard.source.moduleName && (
                    <p className={`mt-4 text-sm ${getTextColor('secondary')}`}>
                      From: {currentCard.source.moduleName}
                    </p>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Feedback Buttons */}
      <AnimatePresence>
        {isFlipped && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`p-6 border-t ${dark ? 'border-white/10 bg-slate-900/50' : 'border-gray-200 bg-white/50'}`}
          >
            <p className={`text-center text-sm mb-4 ${getTextColor('secondary')}`}>
              How well did you remember this?
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              <button
                onClick={() => handleFeedback('forgot')}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg hover:shadow-red-500/25"
              >
                <AlertCircle className="w-5 h-5" />
                Forgot (1)
              </button>
              <button
                onClick={() => handleFeedback('hard')}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg hover:shadow-amber-500/25"
              >
                <Clock className="w-5 h-5" />
                Hard (2)
              </button>
              <button
                onClick={() => handleFeedback('good')}
                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg hover:shadow-green-500/25"
              >
                <Target className="w-5 h-5" />
                Good (3)
              </button>
              <button
                onClick={() => handleFeedback('easy')}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg hover:shadow-blue-500/25"
              >
                <Sparkles className="w-5 h-5" />
                Easy (4)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard shortcuts hint */}
      <div className={`text-center py-2 text-xs ${getTextColor('secondary')}`}>
        Space: Flip • 1-4: Rate • H: Hint • Esc: Close
      </div>
    </motion.div>
  );
};

export default FlashcardStudyComponent;

