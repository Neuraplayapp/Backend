import React, { useState, useEffect } from 'react';
import { Star, RotateCcw, Trophy, Shuffle } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';

interface PatternMatchingGameProps {
  onClose: () => void;
}

const PatternMatchingGame: React.FC<PatternMatchingGameProps> = ({ onClose }) => {
  const { user, addXP, addStars, updateGameProgress, recordGameSession } = useUser();
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'gameOver' | 'success'>('ready');
  const [currentPattern, setCurrentPattern] = useState<string[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [mistakes, setMistakes] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);

  const shapes = ['🔴', '🟦', '🟢', '🟡', '🟣', '🟤'];
  const patternTypes = ['sequence', 'missing', 'matching'];

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === 'playing' && timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      endGame();
    }
    return () => clearTimeout(timer);
  }, [gameState, timeLeft]);

  const generatePattern = () => {
    const patternType = patternTypes[Math.floor(Math.random() * patternTypes.length)];
    const patternLength = Math.min(level + 2, 6);
    
    if (patternType === 'sequence') {
      // Generate a repeating pattern
      const basePattern = shapes.slice(0, Math.min(level + 1, 3));
      const pattern = [];
      for (let i = 0; i < patternLength; i++) {
        pattern.push(basePattern[i % basePattern.length]);
      }
      
      setCurrentPattern(pattern);
      
      // Create options including the correct next item
      const correctAnswer = basePattern[patternLength % basePattern.length];
      const wrongAnswers = shapes.filter(s => s !== correctAnswer).slice(0, 3);
      const allOptions = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);
      setOptions(allOptions);
      
    } else if (patternType === 'missing') {
      // Generate pattern with missing element
      const basePattern = shapes.slice(0, Math.min(level + 1, 3));
      const fullPattern = [];
      for (let i = 0; i < patternLength; i++) {
        fullPattern.push(basePattern[i % basePattern.length]);
      }
      
      const missingIndex = Math.floor(Math.random() * fullPattern.length);
      const correctAnswer = fullPattern[missingIndex];
      fullPattern[missingIndex] = '❓';
      
      setCurrentPattern(fullPattern);
      
      const wrongAnswers = shapes.filter(s => s !== correctAnswer).slice(0, 3);
      const allOptions = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);
      setOptions(allOptions);
      
    } else {
      // Matching pairs
      const selectedShapes = shapes.slice(0, Math.min(level + 1, 4));
      const pairs = [...selectedShapes, ...selectedShapes];
      const shuffled = pairs.sort(() => Math.random() - 0.5);
      
      setCurrentPattern(shuffled.slice(0, 6));
      setOptions(selectedShapes);
    }
    
    setSelectedAnswers([]);
  };

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setMistakes(0);
    setLevel(1);
    setTimeLeft(60);
    generatePattern();
  };

  const handleOptionClick = (option: string) => {
    if (gameState !== 'playing') return;
    
    const newSelected = [...selectedAnswers, option];
    setSelectedAnswers(newSelected);
    
    // Check if answer is correct (simplified logic)
    const isCorrect = currentPattern.includes('❓') ? 
      currentPattern.find(item => item === '❓') !== undefined :
      true; // Simplified for demo
    
    if (isCorrect) {
      const points = level * 10;
      setScore(score + points);
      
      if (score + points >= level * 50) {
        setLevel(level + 1);
      }
      
      setTimeout(() => {
        generatePattern();
      }, 1000);
      
    } else {
      setMistakes(mistakes + 1);
      if (mistakes >= 2) {
        endGame();
        return;
      }
    }
  };

  const endGame = () => {
    setGameState(score >= 150 ? 'success' : 'gameOver');
    
    if (score >= 150) {
      // Use standardized analytics function
      recordGameSession('pattern-matching', {
        score: score,
        level: level,
        starsEarned: Math.floor(score / 30),
        xpEarned: 25 + (level * 8),
        success: true
      });
    }
  };

  const resetGame = () => {
    setGameState('ready');
    setScore(0);
    setLevel(1);
    setMistakes(0);
    setTimeLeft(60);
    setCurrentPattern([]);
    setOptions([]);
    setSelectedAnswers([]);
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-900 to-blue-900">
      <div className="text-center space-y-6 max-w-4xl mx-auto p-8">
        <div className="mb-6">
          <h3 className="text-3xl font-bold text-white mb-2">Pattern Detective</h3>
          <p className="text-white/80">Find the pattern and complete the sequence!</p>
        </div>

      {/* Game Stats */}
      <div className="flex justify-center gap-8 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-400">{score}</div>
          <div className="text-sm text-white/70">Score</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">{level}</div>
          <div className="text-sm text-white/70">Level</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-400">{mistakes}/3</div>
          <div className="text-sm text-white/70">Mistakes</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">{timeLeft}s</div>
          <div className="text-sm text-white/70">Time</div>
        </div>
      </div>

      {/* Pattern Display */}
      {gameState === 'playing' && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 mb-6 border border-white/20">
          <div className="text-lg font-semibold text-white mb-4">
            What comes next in this pattern?
          </div>
          <div className="flex justify-center gap-4 mb-6">
            {currentPattern.map((item, index) => (
              <div
                key={index}
                className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-lg shadow-md flex items-center justify-center text-3xl border-2 border-white/30"
              >
                {item}
              </div>
            ))}
          </div>
          
          <div className="flex justify-center gap-4">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleOptionClick(option)}
                className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-lg shadow-md flex items-center justify-center text-3xl border-2 border-purple-300 hover:border-purple-400 transition-all transform hover:scale-105"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Game Status */}
      {gameState === 'ready' && (
        <div className="space-y-4">
          <p className="text-lg text-white/80">
            Exercise your pattern recognition skills! Find the missing pieces and complete sequences.
          </p>
          <button
            onClick={startGame}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold px-8 py-4 rounded-full hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 flex items-center gap-2 mx-auto shadow-lg"
          >
            <Shuffle className="w-5 h-5" />
            Start Game
          </button>
        </div>
      )}

      {gameState === 'gameOver' && (
        <div className="space-y-4">
          <div className="text-2xl font-bold text-red-400">Game Over!</div>
          <div className="text-lg text-white/80">
            You reached level {level} with a score of {score}!
          </div>
          <p className="text-white/70">
            Great job working on pattern recognition! Keep practicing to improve your cognitive flexibility.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={resetGame}
              className="bg-blue-500 text-white font-bold px-6 py-3 rounded-full hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
            <button
              onClick={onClose}
              className="bg-slate-500 text-white font-bold px-6 py-3 rounded-full hover:bg-slate-600 transition-all shadow-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {gameState === 'success' && (
        <div className="space-y-4">
          <div className="text-center">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <div className="text-3xl font-bold text-green-400">Pattern Master!</div>
            <div className="text-lg text-white/80">
              You're amazing at finding patterns! Final score: {score}
            </div>
            <div className="flex justify-center items-center gap-2 mt-4">
              <Star className="w-6 h-6 text-yellow-400 fill-current" />
              <span className="text-xl font-bold text-yellow-400">Stars earned this session!</span>
            </div>
          </div>
          <div className="flex justify-center gap-4">
            <button
              onClick={resetGame}
              className="bg-green-500 text-white font-bold px-6 py-3 rounded-full hover:bg-green-600 transition-all shadow-lg"
            >
              Play Again
            </button>
            <button
              onClick={onClose}
              className="bg-slate-500 text-white font-bold px-6 py-3 rounded-full hover:bg-slate-600 transition-all shadow-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
  );
};

export default PatternMatchingGame;