import React, { useState, useEffect, useRef } from 'react';
import { X, RotateCcw, Settings, Trophy, Brain, Target, MessageCircle } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { useAIAgent } from '../../contexts/AIAgentContext';
import GameModal from '../GameModal';
import { 
  CubeMove, 
  CubeSolveSession, 
  createSolveSession, 
  generateCubeAnalysisPrompt,
  CUBE_NEUROPSYCHOLOGICAL_CONCEPTS 
} from '../../utils/cubeTracker';

interface TheCubeGameProps {
  onClose?: () => void;
}

const TheCubeGame: React.FC<TheCubeGameProps> = ({ onClose }) => {
  const { user, addXP, addStars, updateGameProgress, recordGameSession } = useUser();
  const { triggerAgent, updateContext } = useAIAgent();
  const [isLoading, setIsLoading] = useState(true);
  const [gameUrl, setGameUrl] = useState('');
  const [currentSession, setCurrentSession] = useState<CubeSolveSession | null>(null);
  const [moveHistory, setMoveHistory] = useState<CubeMove[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisReport, setAnalysisReport] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Set the game URL to the cube game's index.html
    setGameUrl('/imports/the-cube/dist/index.html');
    setIsLoading(false);
  }, []);

  // Listen for messages from the cube game
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Accept messages from the cube game iframe
      if (event.origin !== window.location.origin && !event.data.source) return;

      const { type, data, source } = event.data;

      // Handle cube game messages
      if (source === 'cube-game' || type?.startsWith('CUBE_')) {
        switch (type) {
          case 'CUBE_SESSION_START':
            console.log('Cube session started:', data);
            setMoveHistory([]);
            setCurrentProgress(0);
            setSessionStartTime(Date.now());
            
            // Update AI agent context
            updateContext({
              gameId: 'the-cube',
              gameState: 'playing',
              currentProgress: 0,
              moveHistory: [],
              timeSpent: 0
            });
            break;

          case 'CUBE_MOVE_MADE':
            console.log('Cube move made:', data);
            setMoveHistory(prev => [...prev, data]);
            
            // Update AI agent context with new move
            updateContext({
              gameId: 'the-cube',
              moveHistory: [...moveHistory, data],
              lastAction: data.move,
              timeSpent: Date.now() - sessionStartTime
            });
            
            // Enhanced AI agent triggering
            const updatedMoveHistory = [...moveHistory, data];
            const timeSpent = Date.now() - sessionStartTime;
            
            // Check for rapid moves (frustration detection)
            if (updatedMoveHistory.length >= 5) {
              const recentMoves = updatedMoveHistory.slice(-5);
              const timeSpan = recentMoves[recentMoves.length - 1].timestamp - recentMoves[0].timestamp;
              if (timeSpan < 2000 && currentProgress < 50) {
                triggerAgent('rapid', {
                  gameId: 'the-cube',
                  moveHistory: updatedMoveHistory,
                  currentProgress,
                  timeSpent
                });
              }
            }
            
            // Check for stuck patterns
            if (updatedMoveHistory.length >= 10) {
              const recentMoves = updatedMoveHistory.slice(-10);
              const uniqueMoves = new Set(recentMoves.map(move => move.move));
              if (uniqueMoves.size < 4 && currentProgress < 40) {
                triggerAgent('stuck', {
                  gameId: 'the-cube',
                  moveHistory: updatedMoveHistory,
                  currentProgress,
                  timeSpent
                });
              }
            }
            
            // Original struggle detection
            if (updatedMoveHistory.length > 15 && currentProgress < 25) {
              triggerAgent('struggle', {
                gameId: 'the-cube',
                moveHistory: updatedMoveHistory,
                currentProgress,
                timeSpent
              });
            }
            break;

          case 'CUBE_PROGRESS_UPDATE':
            console.log('Progress update:', data);
            setCurrentProgress(data.progress);
            
            // Update AI agent context with progress
            updateContext({
              gameId: 'the-cube',
              currentProgress: data.progress,
              timeSpent: Date.now() - sessionStartTime
            });
            
            // Trigger AI agent for milestones
            if (data.progress === 25 || data.progress === 50 || data.progress === 75) {
              triggerAgent('milestone', {
                gameId: 'the-cube',
                currentProgress: data.progress,
                moveHistory,
                timeSpent: Date.now() - sessionStartTime
              });
            }
            
            // Trigger AI agent for achievements
            if (data.progress > 80) {
              triggerAgent('achievement', {
                gameId: 'the-cube',
                currentProgress: data.progress,
                moveHistory,
                timeSpent: Date.now() - sessionStartTime
              });
            }
            break;

          case 'CUBE_SESSION_END':
            console.log('Cube session ended:', data);
            handleSessionComplete(data);
            break;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleSessionComplete = async (sessionData: any) => {
    // Create a simple session from available data
    const sessionId = sessionData?.sessionId || `session_${Date.now()}`;
    const session = {
      sessionId,
      startTime: Date.now() - (sessionData?.solveTime || 60000),
      endTime: Date.now(),
      totalMoves: moveHistory.length,
      solveTime: sessionData?.solveTime || 60000,
      progressCurve: [],
      neuropsychologicalConcepts: CUBE_NEUROPSYCHOLOGICAL_CONCEPTS.slice(0, 5), // Top 5 concepts
      finalScore: (() => {
        const baseScore = 100 - (moveHistory.length * 2);
        const timeBonus = sessionData?.solveTime ? Math.max(0, 60 - (sessionData.solveTime / 1000)) : 0;
        return Math.min(100, Math.max(0, baseScore + timeBonus));
      })()
    };
    
    setCurrentSession(session);

    // Award XP and stars based on performance
    const xpEarned = Math.floor(session.finalScore * 2); // 2 XP per point
    const starsEarned = Math.floor(session.finalScore / 20); // 1 star per 20 points

    if (user) {
      await addXP(xpEarned);
      await addStars(starsEarned);
      await updateGameProgress('the-cube', {
        sessionsCompleted: (user.profile.gameProgress['the-cube']?.sessionsCompleted || 0) + 1,
        totalMoves: (user.profile.gameProgress['the-cube']?.totalMoves || 0) + session.totalMoves,
        averageScore: session.finalScore,
        neuropsychologicalConcepts: session.neuropsychologicalConcepts
      });
    }

    // Generate AI analysis
    await generateAnalysis(session);
  };

  const generateAnalysis = async (session: any) => {
    if (!user) return;

    setIsAnalyzing(true);
    setShowAnalysis(true);

    try {
      // Create a simple analysis prompt
      const prompt = `Analyze this Rubik's Cube solving session for ${user.username}:
      
      Session Details:
      - Total Moves: ${session.totalMoves}
      - Solve Time: ${((session.solveTime || 0) / 1000).toFixed(1)} seconds
      - Final Score: ${session.finalScore}/100
      - Cognitive Skills Demonstrated: ${session.neuropsychologicalConcepts.join(', ')}
      
      Please provide an encouraging analysis of their cognitive development and problem-solving skills.`;

      const response = await fetch('/.netlify/functions/api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task_type: 'chat',
          input_data: {
            messages: [
              {
                role: 'system',
                content: 'You are an educational psychologist specializing in cognitive development. Analyze Rubik\'s Cube solving performance and provide encouraging insights about cognitive skills development.'
              },
              {
                role: 'user',
                content: prompt
              }
            ]
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to get response' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      let generatedReport = '';
      console.log('AI Report result:', result);
      
      if (result[0] && result[0].generated_text) {
        generatedReport = result[0].generated_text;
      } else if (result[0] && result[0].summary_text) {
        generatedReport = result[0].summary_text;
      } else if (typeof result === 'string') {
        generatedReport = result;
      } else if (result && result.generated_text) {
        generatedReport = result.generated_text;
      } else if (result && result.summary_text) {
        generatedReport = result.summary_text;
      } else if (result && result.error) {
        throw new Error(result.error);
      } else {
        console.log('Fallback analysis - result:', result);
        generatedReport = `Great job solving the cube! You completed it in ${((session.solveTime || 0) / 1000).toFixed(1)} seconds with ${session.totalMoves} moves. This shows excellent spatial reasoning and problem-solving skills!`;
      }

      setAnalysisReport(generatedReport);
    } catch (error) {
      console.error('Error generating analysis:', error);
      setAnalysisReport(`Excellent work on the cube! You demonstrated strong problem-solving and spatial reasoning skills. Keep practicing to improve your speed and efficiency!`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const injectTrackingScript = () => {
    // Since cross-origin restrictions prevent direct script injection,
    // we'll handle tracking through postMessage communication
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        // Send a message to the cube game to initialize tracking
        iframeRef.current.contentWindow.postMessage({
          type: 'INIT_TRACKING',
          source: 'neuraplay'
        }, '*');
      } catch (error) {
        console.error('Failed to send tracking initialization message:', error);
      }
    }
  };

  // Handle fullscreen toggle for iframe
  const handleFullscreenToggle = () => {
    setIsFullscreen(!isFullscreen);
    
    // If going fullscreen, try to make the iframe fullscreen
    if (!isFullscreen && iframeRef.current) {
      try {
        if (iframeRef.current.requestFullscreen) {
          iframeRef.current.requestFullscreen();
        } else if ((iframeRef.current as any).webkitRequestFullscreen) {
          (iframeRef.current as any).webkitRequestFullscreen();
        } else if ((iframeRef.current as any).mozRequestFullScreen) {
          (iframeRef.current as any).mozRequestFullScreen();
        } else if ((iframeRef.current as any).msRequestFullscreen) {
          (iframeRef.current as any).msRequestFullscreen();
        }
      } catch (error) {
        console.error('Failed to make iframe fullscreen:', error);
      }
    }
  };

  return (
    <GameModal
      isOpen={true}
      onClose={onClose}
      title="The Cube"
      subtitle="3D Rubik's Cube Puzzle"
      gameIcon={<Trophy className="w-5 h-5" />}
      showProgress={true}
      progressValue={currentProgress}
      progressLabel="Solve Progress"
      showControls={true}
      onReset={() => {
        // Reset game logic
        setMoveHistory([]);
        setCurrentProgress(0);
        setShowAnalysis(false);
      }}
      maxWidth="max-w-8xl"
      maxHeight="max-h-[98vh]"
      showVolumeSlider={false}
      showGameControls={true}
      showSkipControls={false}
      isFullscreen={isFullscreen}
      onFullscreenToggle={handleFullscreenToggle}
      customControls={
        <button
          onClick={() => {
            console.log('Manual AI trigger clicked');
            triggerAgent('manual', {
              gameId: 'the-cube',
              currentProgress,
              moveHistory,
              timeSpent: Date.now() - sessionStartTime
            });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg"
        >
          <MessageCircle className="w-4 h-4" />
          Ask AI
        </button>
      }
    >
      {/* Game Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-full bg-gradient-to-br from-indigo-50 to-purple-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-6"></div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Loading The Cube</h3>
            <p className="text-gray-600">Preparing your 3D puzzle experience...</p>
          </div>
        </div>
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-purple-50">
          <iframe
            ref={iframeRef}
            src={gameUrl}
            className="w-full h-full border-0"
            title="The Cube Game"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={injectTrackingScript}
          />
        </div>
      )}

      {/* Analysis Modal */}
      {showAnalysis && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-30">
          <div className="bg-white rounded-2xl p-8 max-w-4xl max-h-[90vh] overflow-y-auto mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                <Brain className="w-6 h-6 mr-3 text-purple-600" />
                Cognitive Analysis
              </h3>
              <button
                onClick={() => setShowAnalysis(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {isAnalyzing ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-6"></div>
                <h4 className="text-xl font-bold text-gray-800 mb-2">Analyzing Performance</h4>
                <p className="text-gray-600">Generating your cognitive development report...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {currentSession && (
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
                    <h4 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                      <Trophy className="w-5 h-5 mr-2 text-purple-600" />
                      Session Summary
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="bg-white rounded-lg p-3">
                        <span className="text-gray-600 block">Total Moves</span>
                        <span className="font-bold text-lg text-gray-900">{currentSession.totalMoves}</span>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <span className="text-gray-600 block">Final Score</span>
                        <span className="font-bold text-lg text-gray-900">{currentSession.finalScore}/100</span>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <span className="text-gray-600 block">Solve Time</span>
                        <span className="font-bold text-lg text-gray-900">{((currentSession.solveTime || 0) / 1000).toFixed(1)}s</span>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <span className="text-gray-600 block">Concepts</span>
                        <span className="font-bold text-lg text-gray-900">{currentSession.neuropsychologicalConcepts.length}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="prose prose-lg max-w-none">
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">{analysisReport}</div>
                </div>
                
                <div className="flex justify-end pt-6">
                  <button
                    onClick={() => setShowAnalysis(false)}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg"
                  >
                    Continue Playing
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </GameModal>
  );
};

export default TheCubeGame; 