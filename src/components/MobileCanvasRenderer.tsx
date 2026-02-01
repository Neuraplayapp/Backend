'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import CanvasElementRenderer from './CanvasElementRenderer';
import { useCanvasStore } from '../stores/canvasStore';
import useResponsiveLayout from '../hooks/useResponsiveLayout';
import useMobileGestures, { TouchGesture } from '../hooks/useMobileGestures';

interface MobileCanvasRendererProps {
  onFullscreenToggle?: () => void;
  isFullscreen?: boolean;
}

// Fix 1: Stable empty array reference to prevent new [] on every render
const EMPTY_CANVAS_ELEMENTS: never[] = [];

const MobileCanvasRenderer: React.FC<MobileCanvasRendererProps> = ({
  onFullscreenToggle,
  isFullscreen = false
}) => {
  const responsive = useResponsiveLayout();
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Fix 2: Single store subscription with stable empty fallback
  const canvasElements = useCanvasStore(state => 
    state.canvasElementsByConversation[state.currentConversationId] ?? EMPTY_CANVAS_ELEMENTS
  );
  const currentConversationId = useCanvasStore(state => state.currentConversationId);

  // Mobile-specific canvas state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Fix 3: Use refs for values accessed in gesture callbacks to avoid re-render loops
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPanningRef = useRef(isPanning);

  // Reset controls timer
  const resetControlsTimer = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  // Fix 4: Synchronize isPanning ref to stay in sync with state
  // This prevents stale references in gesture callbacks
  useEffect(() => {
    isPanningRef.current = isPanning;
  }, [isPanning]);

  // Gesture handling with safe value checks
  useMobileGestures(
    {
      swipeThreshold: 30,
      pinchThreshold: 0.05,
    },
    useCallback((gesture: TouchGesture) => {
      if (!canvasContainerRef.current) return;
      resetControlsTimer();

      switch (gesture.type) {
        case 'pinch': {
          // Fix 5: Safe check for gesture.scale before updating state
          const gestureScale = gesture.scale;
          if (gestureScale !== undefined && gestureScale !== null && gestureScale !== 0) {
            setScale(prev => Math.max(0.5, Math.min(3, prev * gestureScale)));
          }
          break;
        }

        case 'swipe':
          // Use ref to check panning state without causing re-renders
          if (!isPanningRef.current) {
            const sensitivity = 2;
            const deltaX = gesture.endPosition.x - gesture.startPosition.x;
            const deltaY = gesture.endPosition.y - gesture.startPosition.y;

            setPosition(prev => ({
              x: prev.x + deltaX * sensitivity,
              y: prev.y + deltaY * sensitivity
            }));
          }
          break;

        case 'tap':
          setShowControls(prev => !prev);
          break;
      }
    }, [resetControlsTimer])
  );

  // Zoom & reset handlers
  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(3, prev * 1.2));
    resetControlsTimer();
  }, [resetControlsTimer]);

  const handleZoomOut = useCallback(() => {
    setScale(prev => Math.max(0.5, prev / 1.2));
    resetControlsTimer();
  }, [resetControlsTimer]);

  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    resetControlsTimer();
  }, [resetControlsTimer]);

  const handlePanToggle = useCallback(() => {
    setIsPanning(prev => !prev);
    resetControlsTimer();
  }, [resetControlsTimer]);

  // Initialize controls timer on mount
  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [resetControlsTimer]);

  // Canvas transform styles
  const canvasStyles = {
    transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
    transformOrigin: 'center center',
    transition: isPanning ? 'none' : 'transform 0.2s ease-out',
  };

  return (
    <div
      ref={canvasContainerRef}
      className="relative w-full h-full overflow-hidden bg-gray-50 dark:bg-gray-900"
    >
      <div className="w-full h-full" style={canvasStyles}>
        {canvasElements.length > 0 ? (
          <CanvasElementRenderer
            element={canvasElements[0]}
            conversationId={currentConversationId}
            isFullscreen={isFullscreen}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
            <p>No canvas elements yet</p>
          </div>
        )}
      </div>

      {responsive.isMobile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: showControls ? 1 : 0, y: showControls ? 0 : 20 }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-4 left-4 right-4"
        >
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg">
            <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
              <div>• <strong>Pinch</strong> to zoom in/out</div>
              <div>• <strong>Drag</strong> to pan around</div>
              <div>• <strong>Tap</strong> to show/hide controls</div>
              <div>• <strong>Double-tap</strong> to reset view</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default MobileCanvasRenderer;