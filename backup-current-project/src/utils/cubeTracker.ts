/**
 * Cube Progress Tracker for NeuraPlay AI Platform
 * Tracks solve progress and maps to neuropsychological concepts
 */

export interface CubeMove {
  timestamp: number;
  move: string;
  layer: string;
  direction: string;
}

export interface CubeProgressPoint {
  move: number;
  time: string;
  percentSolved: number;
  neuropsychologicalConcepts: string[];
}

export interface CubeSolveSession {
  sessionId: string;
  startTime: number;
  endTime?: number;
  totalMoves: number;
  solveTime?: number;
  progressCurve: CubeProgressPoint[];
  neuropsychologicalConcepts: string[];
  finalScore: number;
}

// The 22 neuropsychological concepts targeted by Rubik's Cube solving
export const CUBE_NEUROPSYCHOLOGICAL_CONCEPTS = [
  'Working Memory',
  'Executive Function', 
  'Attention Control',
  'Cognitive Flexibility',
  'Inhibitory Control',
  'Planning',
  'Problem Solving',
  'Decision Making',
  'Spatial Reasoning',
  'Visual Memory',
  'Sequential Processing',
  'Fluid Reasoning',
  'Processing Efficiency',
  'Cognitive Load',
  'Sustained Attention',
  'Selective Attention',
  'Response Inhibition',
  'Task Switching',
  'Goal Setting',
  'Self-Monitoring',
  'Error Detection',
  'Motor Skills'
];

import { analyzeCubeState } from './cubeStateAnalyzer';

/**
 * Calculate solve percentage based on cube state
 * This uses the advanced cube state analyzer
 */
export function calculateSolvePercentage(cubeState: any): number {
  // Use the sophisticated analysis
  return analyzeCubeState(cubeState);
}

/**
 * Analyze a move and determine which neuropsychological concepts are engaged
 */
export function analyzeMoveConcepts(move: CubeMove, previousProgress: number, currentProgress: number): string[] {
  const concepts: string[] = [];
  
  // Always engaged concepts
  concepts.push('Working Memory'); // Remembering cube state
  concepts.push('Motor Skills'); // Physical manipulation
  concepts.push('Decision Making'); // Choosing which move to make
  
  // Progress-based concepts
  if (currentProgress > previousProgress) {
    concepts.push('Problem Solving'); // Making progress
    concepts.push('Planning'); // Strategic thinking
  }
  
  // Move complexity analysis
  if (move.move.includes('2')) {
    concepts.push('Sequential Processing'); // Double moves
  }
  
  if (move.layer !== 'cube') {
    concepts.push('Spatial Reasoning'); // Layer-specific moves
  }
  
  // Time-based concepts
  const moveTime = move.timestamp;
  if (moveTime > 30000) { // 30 seconds
    concepts.push('Sustained Attention');
  }
  
  // Error detection (if progress decreased)
  if (currentProgress < previousProgress) {
    concepts.push('Error Detection');
    concepts.push('Self-Monitoring');
  }
  
  return [...new Set(concepts)]; // Remove duplicates
}

/**
 * Generate progress curve from move history
 */
export function generateProgressCurve(moves: CubeMove[]): CubeProgressPoint[] {
  const progressCurve: CubeProgressPoint[] = [];
  let lastReportedPercent = -1;
  
  for (let i = 0; i < moves.length; i++) {
    const currentMove = moves[i];
    const previousProgress = i > 0 ? progressCurve[i - 1]?.percentSolved || 0 : 0;
    
    // Calculate current progress (simplified)
    const currentProgress = calculateSolvePercentage({}); // You'd pass actual cube state
    
    // Analyze concepts for this move
    const concepts = analyzeMoveConcepts(currentMove, previousProgress, currentProgress);
    
    // Only log milestone progress (every 10%)
    if (Math.floor(currentProgress / 10) > Math.floor(lastReportedPercent / 10)) {
      const timeInSeconds = ((currentMove.timestamp - moves[0].timestamp) / 1000).toFixed(2);
      
      progressCurve.push({
        move: i + 1,
        time: timeInSeconds,
        percentSolved: Math.round(currentProgress * 10) / 10,
        neuropsychologicalConcepts: concepts
      });
      
      lastReportedPercent = currentProgress;
    }
  }
  
  return progressCurve;
}

/**
 * Create a complete solve session from move history
 */
export function createSolveSession(moves: CubeMove[], sessionId: string): CubeSolveSession {
  const startTime = moves[0]?.timestamp || Date.now();
  const endTime = moves[moves.length - 1]?.timestamp || Date.now();
  const solveTime = endTime - startTime;
  
  const progressCurve = generateProgressCurve(moves);
  
  // Calculate final score based on efficiency
  const finalScore = calculateFinalScore(moves, solveTime);
  
  // Collect all unique concepts from the session
  const allConcepts = new Set<string>();
  progressCurve.forEach(point => {
    point.neuropsychologicalConcepts.forEach(concept => allConcepts.add(concept));
  });
  
  return {
    sessionId,
    startTime,
    endTime,
    totalMoves: moves.length,
    solveTime,
    progressCurve,
    neuropsychologicalConcepts: Array.from(allConcepts),
    finalScore
  };
}

/**
 * Calculate final score based on efficiency and performance
 */
function calculateFinalScore(moves: CubeMove[], solveTime: number): number {
  // Base score from solve time (faster = higher score)
  const timeScore = Math.max(0, 100 - (solveTime / 1000)); // 100 points for solving in 0 seconds
  
  // Efficiency bonus (fewer moves = higher score)
  const moveEfficiency = Math.max(0, 50 - moves.length); // 50 points for 0 moves
  
  // Combined score
  return Math.min(100, Math.max(0, timeScore + moveEfficiency));
}

/**
 * Generate AI analysis prompt for cube solve session
 */
export function generateCubeAnalysisPrompt(session: CubeSolveSession, username: string): string {
  return `Analyze this Rubik's Cube solving session and provide insights on the child's cognitive development:

Child: ${username}
Session Duration: ${(session.solveTime || 0) / 1000} seconds
Total Moves: ${session.totalMoves}
Final Score: ${session.finalScore}/100

Neuropsychological Concepts Demonstrated:
${session.neuropsychologicalConcepts.join(', ')}

Progress Milestones:
${session.progressCurve.map(point => 
  `- Move ${point.move} (${point.time}s): ${point.percentSolved}% solved`
).join('\n')}

Please provide:
1. Cognitive strengths demonstrated
2. Areas for improvement
3. Specific neuropsychological insights
4. Encouraging feedback for the child
5. Suggestions for continued development

Focus on the child's problem-solving approach, spatial reasoning, and executive function development.`;
} 