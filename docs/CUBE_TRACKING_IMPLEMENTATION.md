# Cube Tracking Implementation for NeuraPlay AI Platform

## Overview

This implementation provides comprehensive tracking and analysis of Rubik's Cube solving sessions, mapping them to 22 specific neuropsychological concepts. The system captures move data, calculates solve progress, and generates AI-powered analysis reports.

## Architecture

### 1. Core Components

#### `src/utils/cubeTracker.ts`
- **Purpose**: Main tracking logic and data structures
- **Key Functions**:
  - `calculateSolvePercentage()`: Determines solve progress
  - `analyzeMoveConcepts()`: Maps moves to neuropsychological concepts
  - `generateProgressCurve()`: Creates progress milestones
  - `createSolveSession()`: Compiles complete session data
  - `generateCubeAnalysisPrompt()`: Creates AI analysis prompts

#### `src/utils/cubeStateAnalyzer.ts`
- **Purpose**: Advanced cube state analysis
- **Key Functions**:
  - `analyzeCubeState()`: Sophisticated progress calculation
  - `extractCubeState()`: Extracts data from game instance
  - `getDetailedCubeAnalysis()`: Face-by-face progress analysis

#### `public/imports/the-cube/dist/cube-tracker.js`
- **Purpose**: Injected script that captures move data from the cube game
- **Features**:
  - Intercepts game moves via function overriding
  - Sends data to parent window via postMessage
  - Tracks session start/end events

#### `src/components/games/TheCubeGame.tsx`
- **Purpose**: React component that integrates tracking with the game
- **Features**:
  - Listens for messages from the cube game
  - Manages session data and progress
  - Generates AI analysis reports
  - Awards XP and stars based on performance

## 2. The 22 Neuropsychological Concepts

The Rubik's Cube specifically targets these 22 concepts:

1. **Working Memory** - Remembering cube state and algorithms
2. **Executive Function** - Coordinating multiple cognitive processes
3. **Attention Control** - Sustained focus during solving
4. **Cognitive Flexibility** - Adapting strategies to new configurations
5. **Inhibitory Control** - Suppressing incorrect moves
6. **Planning** - Strategic approach to solving
7. **Problem Solving** - Logical analysis of cube state
8. **Decision Making** - Choosing optimal moves
9. **Spatial Reasoning** - 3D spatial manipulation
10. **Visual Memory** - Remembering patterns and positions
11. **Sequential Processing** - Executing move sequences
12. **Fluid Reasoning** - Adapting to novel situations
13. **Processing Efficiency** - Speed and accuracy improvement
14. **Cognitive Load** - Managing multiple pieces of information
15. **Sustained Attention** - Maintaining focus over time
16. **Selective Attention** - Focusing on relevant pieces
17. **Response Inhibition** - Avoiding impulsive moves
18. **Task Switching** - Moving between different solving phases
19. **Goal Setting** - Setting sub-goals (faces, layers)
20. **Self-Monitoring** - Tracking progress and errors
21. **Error Detection** - Identifying and correcting mistakes
22. **Motor Skills** - Precise finger movements

## 3. Data Flow

```
Cube Game → cube-tracker.js → postMessage → TheCubeGame.tsx → cubeTracker.ts → AI Report
```

1. **Move Capture**: `cube-tracker.js` intercepts moves via function overriding
2. **Data Transmission**: Move data sent via `postMessage` to parent window
3. **Session Management**: `TheCubeGame.tsx` collects and processes move data
4. **Progress Analysis**: `cubeTracker.ts` calculates progress and maps to concepts
5. **AI Integration**: Session data sent to AI report system for analysis

## 4. Progress Calculation

### For 3x3 Cube:
- **20 Total Pieces**: 8 corners + 12 edges (centers are fixed)
- **Progress Formula**: `(solvedPieces / 20) * 100`
- **Piece Analysis**: Checks position and orientation of each piece

### For Other Sizes:
- **Simplified Approach**: Distance-based analysis from solved positions
- **Progress Formula**: `(solvedPieces / totalPieces) * 100`

## 5. Session Data Structure

```typescript
interface CubeSolveSession {
  sessionId: string;
  startTime: number;
  endTime?: number;
  totalMoves: number;
  solveTime?: number;
  progressCurve: CubeProgressPoint[];
  neuropsychologicalConcepts: string[];
  finalScore: number;
}
```

## 6. AI Analysis Integration

### Prompt Structure:
```
Analyze this Rubik's Cube solving session and provide insights on the child's cognitive development:

Child: [username]
Session Duration: [time] seconds
Total Moves: [count]
Final Score: [score]/100

Neuropsychological Concepts Demonstrated:
[list of concepts]

Progress Milestones:
[detailed progress curve]

Please provide:
1. Cognitive strengths demonstrated
2. Areas for improvement
3. Specific neuropsychological insights
4. Encouraging feedback for the child
5. Suggestions for continued development
```

## 7. Performance Scoring

### Score Calculation:
- **Time Score**: `Math.max(0, 100 - (solveTime / 1000))`
- **Efficiency Bonus**: `Math.max(0, 50 - moves.length)`
- **Final Score**: `Math.min(100, timeScore + efficiencyBonus)`

### XP/Stars Award:
- **XP**: `Math.floor(finalScore * 2)` (2 XP per point)
- **Stars**: `Math.floor(finalScore / 20)` (1 star per 20 points)

## 8. Implementation Steps

### Step 1: Inject Tracking Script
```javascript
// In TheCubeGame.tsx
const injectTrackingScript = () => {
  const script = document.createElement('script');
  script.src = '/imports/the-cube/dist/cube-tracker.js';
  iframeRef.current.contentWindow.document.head.appendChild(script);
};
```

### Step 2: Listen for Messages
```javascript
// Listen for cube game messages
window.addEventListener('message', (event) => {
  if (event.data.source !== 'cube-game') return;
  
  const { type, data } = event.data;
  switch (type) {
    case 'CUBE_MOVE_MADE':
      setMoveHistory(prev => [...prev, data]);
      break;
    case 'CUBE_SESSION_END':
      handleSessionComplete(data);
      break;
  }
});
```

### Step 3: Generate Analysis
```javascript
const handleSessionComplete = async (sessionData) => {
  const session = createSolveSession(moveHistory, sessionData.sessionId);
  const prompt = generateCubeAnalysisPrompt(session, user.username);
  
  // Send to AI for analysis
  const response = await fetch('/.netlify/functions/api', {
    method: 'POST',
    body: JSON.stringify({
      task_type: 'summarization',
      input_data: prompt
    })
  });
};
```

## 9. Integration with AI Report

The cube game data is automatically included in AI reports:

```javascript
// In AIReportPage.tsx
const cubeGameData = performanceData.gameProgress['the-cube'];
if (cubeGameData) {
  cubeAnalysis = `
Cube Game Performance:
- Sessions Completed: ${cubeGameData.sessionsCompleted}
- Total Moves Made: ${cubeGameData.totalMoves}
- Average Score: ${cubeGameData.averageScore}/100
- Neuropsychological Concepts: ${cubeGameData.neuropsychologicalConcepts.join(', ')}
`;
}
```

## 10. Future Enhancements

### Planned Improvements:
1. **Real-time Progress**: Live progress updates during solving
2. **Advanced Analytics**: Detailed move pattern analysis
3. **Difficulty Adaptation**: Adjust cube size based on performance
4. **Multi-session Tracking**: Long-term progress analysis
5. **Parent Dashboard**: Detailed progress visualization
6. **Concept Mapping**: More granular concept analysis

### Technical Enhancements:
1. **Better State Analysis**: More accurate cube state detection
2. **Move Validation**: Verify move legality and efficiency
3. **Performance Optimization**: Reduce tracking overhead
4. **Error Handling**: Robust error recovery
5. **Data Persistence**: Long-term session storage

## 11. Usage Example

```javascript
// Complete workflow example
const cubeGame = new TheCubeGame({ onClose: handleClose });

// Game automatically tracks:
// - Move history
// - Progress milestones
// - Neuropsychological concepts
// - Session completion

// AI analysis automatically generated
// XP and stars automatically awarded
// Data integrated into AI reports
```

This implementation provides a comprehensive, scientifically-backed tracking system that maps Rubik's Cube solving to specific neuropsychological concepts, enabling detailed cognitive development analysis and personalized learning insights. 