/**
 * 🎯 Canvas Element Renderer
 * 
 * Routes canvas elements to the correct specialized component based on type.
 * 
 * Supports:
 * - Document Canvas
 * - Code Canvas
 * - Chart Canvas
 */

import React from 'react';
import { type CanvasElement } from '../stores/canvasStore';
import NeuraPlayDocumentCanvas from './NeuraPlayDocumentCanvas';
import NeuraPlayCodeCanvas from './NeuraPlayCodeCanvas';
import NeuraPlayChartCanvas from './NeuraPlayChartCanvas';

interface CanvasElementRendererProps {
  element: CanvasElement;
  conversationId: string;
  onClose?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const CanvasElementRenderer: React.FC<CanvasElementRendererProps> = (props) => {
  const { element } = props;

  // DEFENSIVE GUARD: Check if element exists before accessing properties
  if (!element) {
    console.warn('[CanvasElementRenderer] Element is undefined, showing loading state');
    return (
      <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg">
        <div className="text-center text-white">
          <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm opacity-70">Loading canvas...</p>
        </div>
      </div>
    );
  }

  // Route to correct canvas component based on type
  switch (element.type) {
    case 'document':
      return <NeuraPlayDocumentCanvas {...props} />;
      
    case 'code':
      return <NeuraPlayCodeCanvas {...props} />;
      
    case 'chart':
      return <NeuraPlayChartCanvas {...props} />;
      
    // Fallback to document canvas for unknown types
    default:
      console.warn(`Unknown canvas element type: ${element.type}, falling back to document canvas`);
      return <NeuraPlayDocumentCanvas {...props} />;
  }
};

export default CanvasElementRenderer;

