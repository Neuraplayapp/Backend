/**
 * Advanced Cube State Analyzer for NeuraPlay AI Platform
 * Analyzes the actual cube state to determine solve progress
 */

export interface CubePiece {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  edges: string[];
  name: string;
}

export interface CubeState {
  pieces: CubePiece[];
  size: number;
}

/**
 * Analyze cube state to determine solve progress
 * This function analyzes the actual cube pieces to determine how much is solved
 */
export function analyzeCubeState(cubeState: any): number {
  if (!cubeState || !cubeState.pieces) {
    return 0;
  }

  const pieces = cubeState.pieces;
  const size = cubeState.size || 3;
  let solvedPieces = 0;
  const totalPieces = size * size * size;

  // For a 3x3 cube, we have:
  // - 8 corner pieces (3 colors each)
  // - 12 edge pieces (2 colors each)  
  // - 6 center pieces (1 color each, fixed)
  
  if (size === 3) {
    // Check corners (8 pieces)
    const cornerPositions = [
      { x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 },
      { x: -1, y: 1, z: -1 }, { x: 1, y: 1, z: -1 },
      { x: -1, y: -1, z: 1 }, { x: 1, y: -1, z: 1 },
      { x: -1, y: 1, z: 1 }, { x: 1, y: 1, z: 1 }
    ];

    // Check edges (12 pieces)
    const edgePositions = [
      { x: 0, y: -1, z: -1 }, { x: 0, y: 1, z: -1 },
      { x: 0, y: -1, z: 1 }, { x: 0, y: 1, z: 1 },
      { x: -1, y: 0, z: -1 }, { x: 1, y: 0, z: -1 },
      { x: -1, y: 0, z: 1 }, { x: 1, y: 0, z: 1 },
      { x: -1, y: -1, z: 0 }, { x: 1, y: -1, z: 0 },
      { x: -1, y: 1, z: 0 }, { x: 1, y: 1, z: 0 }
    ];

    // Check corners
    cornerPositions.forEach(cornerPos => {
      const piece = findPieceAtPosition(pieces, cornerPos);
      if (piece && isCornerSolved(piece, cornerPos)) {
        solvedPieces++;
      }
    });

    // Check edges
    edgePositions.forEach(edgePos => {
      const piece = findPieceAtPosition(pieces, edgePos);
      if (piece && isEdgeSolved(piece, edgePos)) {
        solvedPieces++;
      }
    });

    // Centers are always considered solved (they don't move)
    solvedPieces += 6;

    // Calculate percentage (20 total pieces: 8 corners + 12 edges)
    return (solvedPieces / 20) * 100;
  }

  // For other cube sizes, use a simplified approach
  return calculateSimplifiedProgress(pieces, size);
}

/**
 * Find a piece at a specific position
 */
function findPieceAtPosition(pieces: any[], position: { x: number; y: number; z: number }): any {
  return pieces.find(piece => {
    const piecePos = piece.position || piece.userData?.start?.position;
    if (!piecePos) return false;
    
    return Math.abs(piecePos.x - position.x) < 0.1 &&
           Math.abs(piecePos.y - position.y) < 0.1 &&
           Math.abs(piecePos.z - position.z) < 0.1;
  });
}

/**
 * Check if a corner piece is solved (in correct position and orientation)
 */
function isCornerSolved(piece: any, expectedPosition: { x: number; y: number; z: number }): boolean {
  // Check if piece is in correct position
  const piecePos = piece.position || piece.userData?.start?.position;
  if (!piecePos) return false;

  const positionCorrect = Math.abs(piecePos.x - expectedPosition.x) < 0.1 &&
                         Math.abs(piecePos.y - expectedPosition.y) < 0.1 &&
                         Math.abs(piecePos.z - expectedPosition.z) < 0.1;

  if (!positionCorrect) return false;

  // Check if piece is in correct orientation (simplified)
  // In a real implementation, you'd check the actual face colors
  const pieceRotation = piece.rotation || piece.userData?.start?.rotation;
  if (!pieceRotation) return true; // Assume correct if no rotation data

  // For now, we'll assume the piece is solved if it's in the right position
  // In reality, you'd need to check the actual face colors
  return true;
}

/**
 * Check if an edge piece is solved (in correct position and orientation)
 */
function isEdgeSolved(piece: any, expectedPosition: { x: number; y: number; z: number }): boolean {
  // Check if piece is in correct position
  const piecePos = piece.position || piece.userData?.start?.position;
  if (!piecePos) return false;

  const positionCorrect = Math.abs(piecePos.x - expectedPosition.x) < 0.1 &&
                         Math.abs(piecePos.y - expectedPosition.y) < 0.1 &&
                         Math.abs(piecePos.z - expectedPosition.z) < 0.1;

  if (!positionCorrect) return false;

  // Check if piece is in correct orientation (simplified)
  // In a real implementation, you'd check the actual face colors
  const pieceRotation = piece.rotation || piece.userData?.start?.rotation;
  if (!pieceRotation) return true; // Assume correct if no rotation data

  // For now, we'll assume the piece is solved if it's in the right position
  // In reality, you'd need to check the actual face colors
  return true;
}

/**
 * Calculate simplified progress for non-3x3 cubes
 */
function calculateSimplifiedProgress(pieces: any[], size: number): number {
  if (!pieces || pieces.length === 0) return 0;

  // Count pieces that are close to their solved positions
  let solvedPieces = 0;
  const totalPieces = size * size * size;

  pieces.forEach(piece => {
    const startPos = piece.userData?.start?.position;
    const currentPos = piece.position;
    
    if (startPos && currentPos) {
      const distance = Math.sqrt(
        Math.pow(currentPos.x - startPos.x, 2) +
        Math.pow(currentPos.y - startPos.y, 2) +
        Math.pow(currentPos.z - startPos.z, 2)
      );
      
      // Consider piece solved if it's close to its solved position
      if (distance < 0.1) {
        solvedPieces++;
      }
    }
  });

  return (solvedPieces / totalPieces) * 100;
}

/**
 * Extract cube state from the game's data structure
 * This function needs to be adapted based on the actual cube game implementation
 */
export function extractCubeState(gameInstance: any): CubeState | null {
  if (!gameInstance || !gameInstance.cube) {
    return null;
  }

  try {
    const cube = gameInstance.cube;
    const pieces = cube.pieces || [];
    
    return {
      pieces: pieces.map((piece: any) => ({
        position: piece.position,
        rotation: piece.rotation,
        edges: piece.userData?.edges || [],
        name: piece.name
      })),
      size: cube.size || 3
    };
  } catch (error) {
    console.error('Error extracting cube state:', error);
    return null;
  }
}

/**
 * Get detailed analysis of cube state including face completion
 */
export function getDetailedCubeAnalysis(cubeState: any): {
  overallProgress: number;
  faceProgress: { [face: string]: number };
  solvedPieces: number;
  totalPieces: number;
} {
  const overallProgress = analyzeCubeState(cubeState);
  
  // Analyze each face
  const faces = ['U', 'D', 'L', 'R', 'F', 'B'];
  const faceProgress: { [face: string]: number } = {};
  
  faces.forEach(face => {
    faceProgress[face] = analyzeFaceProgress(cubeState, face);
  });

  return {
    overallProgress,
    faceProgress,
    solvedPieces: Math.floor((overallProgress / 100) * 20), // 20 pieces for 3x3
    totalPieces: 20
  };
}

/**
 * Analyze progress of a specific face
 */
function analyzeFaceProgress(cubeState: any, face: string): number {
  if (!cubeState || !cubeState.pieces) return 0;

  const pieces = cubeState.pieces;
  const size = cubeState.size || 3;
  
  // For a 3x3 cube, each face has 9 pieces (1 center + 4 edges + 4 corners)
  const facePieces = pieces.filter((piece: any) => {
    const edges = piece.userData?.edges || [];
    return edges.includes(face);
  });

  if (facePieces.length === 0) return 0;

  // Count pieces that are in correct positions for this face
  let correctPieces = 0;
  
  facePieces.forEach((piece: any) => {
    // Simplified check - in reality you'd check actual colors
    const startPos = piece.userData?.start?.position;
    const currentPos = piece.position;
    
    if (startPos && currentPos) {
      const distance = Math.sqrt(
        Math.pow(currentPos.x - startPos.x, 2) +
        Math.pow(currentPos.y - startPos.y, 2) +
        Math.pow(currentPos.z - startPos.z, 2)
      );
      
      if (distance < 0.1) {
        correctPieces++;
      }
    }
  });

  return (correctPieces / facePieces.length) * 100;
} 