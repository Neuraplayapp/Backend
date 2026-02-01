import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { useUser } from '../../contexts/UserContext';
import { Star, Trophy } from 'lucide-react';

export interface StackerGameData {
  score: number;
  reactionTimes: number[];
}

interface StackerGameProps {
  onClose: () => void;
  onGameEnd: (data: StackerGameData) => void;
}

const StackerGame: React.FC<StackerGameProps> = ({ onClose, onGameEnd }) => {
  const { user, addXP, addStars, updateGameProgress, recordGameSession } = useUser();
  const mountRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<'instructions' | 'playing' | 'gameOver' | 'success'>('instructions');
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);

  const endGame = (finalScore: number) => {
    const isSuccess = finalScore >= 50;
    setGameState(isSuccess ? 'success' : 'gameOver');
    
    if (isSuccess) {
      // Use standardized analytics function
      recordGameSession('stacker', {
        score: finalScore,
        level: level,
        starsEarned: Math.floor(finalScore / 25),
        xpEarned: 20 + (level * 5),
        success: true
      });
    }
    
    onGameEnd({ score: finalScore, reactionTimes });
  };

  const resetGame = () => {
    setScore(0);
    setLevel(1);
    setGameState('instructions');
    setReactionTimes([]);
  };

  useEffect(() => {
    // Minimal effect for mounting
    return () => {
      // Cleanup if needed
    };
  }, []);

  return (
    <div ref={mountRef} className="w-full h-full cursor-pointer bg-slate-800">
      {gameState === 'instructions' && (
        <div className="absolute inset-0 bg-black/75 flex items-center justify-center text-center text-white p-8">
          <div>
            <p className="text-2xl font-bold">Stack the Blocks</p>
            <p className="mt-4">Click, tap, or press Space when the moving block is above the stack.</p>
            <p className="mt-8 text-xl animate-pulse">Click anywhere to start</p>
            <button 
              onClick={() => setGameState('playing')} 
              className="mt-4 bg-green-500 px-6 py-2 rounded-full font-bold hover:bg-green-600 transition-all"
            >
              Start Game
            </button>
          </div>
        </div>
      )}
      
      {gameState === 'playing' && (
        <div className="absolute inset-0 bg-black/75 flex items-center justify-center text-center text-white p-8">
          <div>
            <p className="text-2xl font-bold">Game in Progress</p>
            <p className="mt-4">Score: {score}</p>
            <p className="mt-4">Level: {level}</p>
            <button 
              onClick={() => endGame(score)} 
              className="mt-4 bg-red-500 px-6 py-2 rounded-full font-bold hover:bg-red-600 transition-all"
            >
              End Game
            </button>
          </div>
        </div>
      )}
      
      {gameState === 'success' && (
        <div className="absolute inset-0 bg-black/75 flex items-center justify-center text-center text-white p-8">
          <div>
            <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <p className="text-3xl font-bold text-green-600">Excellent Stacking!</p>
            <p className="mt-2 text-xl">Your final score is {score}.</p>
            <div className="flex justify-center items-center gap-2 mt-4">
              <Star className="w-6 h-6 text-yellow-400 fill-current" />
              <span className="text-xl font-bold text-yellow-500">Stars earned this session!</span>
            </div>
            <div className="flex justify-center gap-4 mt-6">
              <button onClick={resetGame} className="bg-green-500 px-6 py-2 rounded-full font-bold hover:bg-green-600 transition-all">Play Again</button>
              <button onClick={onClose} className="bg-violet-600 px-6 py-2 rounded-full font-bold hover:bg-violet-700 transition-all">Close</button>
            </div>
          </div>
        </div>
      )}
      
      {gameState === 'gameOver' && (
        <div className="absolute inset-0 bg-black/75 flex items-center justify-center text-center text-white p-8">
          <div>
            <p className="text-3xl font-bold text-red-400">Game Over</p>
            <p className="mt-2 text-xl">Your final score is {score}.</p>
            <div className="flex justify-center gap-4 mt-6">
              <button onClick={resetGame} className="bg-green-500 px-6 py-2 rounded-full font-bold hover:bg-green-600 transition-all">Play Again</button>
              <button onClick={onClose} className="bg-violet-600 px-6 py-2 rounded-full font-bold hover:bg-violet-700 transition-all">Close</button>
            </div>
          </div>
        </div>
      )}
      
      <div className="absolute top-5 right-5 text-white text-4xl font-black select-none pointer-events-none">{score}</div>
    </div>
  );
};

export default StackerGame; 