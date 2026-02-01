import { useState, useEffect, useRef, useCallback, RefObject } from 'react';

export interface TouchGesture {
  type: 'tap' | 'swipe' | 'pinch' | 'longpress' | 'edge-swipe';
  direction?: 'left' | 'right' | 'up' | 'down';
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  duration: number;
  distance: number;
  velocity: number;
  scale?: number;
  isEdgeSwipe?: boolean;
}

export interface GestureConfig {
  swipeThreshold: number;
  swipeVelocityThreshold: number;
  longPressDelay: number;
  tapThreshold: number;
  pinchThreshold: number;
  edgeSwipeWidth: number;
  preventScrollOnHorizontalSwipe: boolean;
}

const defaultConfig: GestureConfig = {
  swipeThreshold: 30, // REDUCED from 50 for better responsiveness
  swipeVelocityThreshold: 0.3, // pixels per ms - faster swipes need less distance
  longPressDelay: 500,
  tapThreshold: 10,
  pinchThreshold: 0.1,
  edgeSwipeWidth: 30, // Edge zone for edge swipes (sidebar triggers)
  preventScrollOnHorizontalSwipe: true,
};

export function useMobileGestures(
  config: Partial<GestureConfig> = {},
  onGesture?: (gesture: TouchGesture) => void,
  elementRef?: RefObject<HTMLElement>
) {
  const mergedConfig = { ...defaultConfig, ...config };
  const [isGesturing, setIsGesturing] = useState(false);
  const [lastGesture, setLastGesture] = useState<TouchGesture | null>(null);
  
  // Touch state tracking
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialDistanceRef = useRef<number | null>(null);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);
  const touchHistoryRef = useRef<Array<{ x: number; y: number; time: number }>>([]);
  
  // Check if touch starts at edge
  const isEdgeTouch = useCallback((x: number): boolean => {
    if (typeof window === 'undefined') return false;
    return x < mergedConfig.edgeSwipeWidth || x > window.innerWidth - mergedConfig.edgeSwipeWidth;
  }, [mergedConfig.edgeSwipeWidth]);
  
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    
    // Reset horizontal swipe detection
    isHorizontalSwipeRef.current = null;
    touchHistoryRef.current = [];
    
    setIsGesturing(true);
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    
    // Record touch for velocity calculation
    touchHistoryRef.current.push({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    });
    
    // Start long press detection for single touch
    if (e.touches.length === 1) {
      longPressTimeoutRef.current = setTimeout(() => {
        if (touchStartRef.current) {
          const gesture: TouchGesture = {
            type: 'longpress',
            startPosition: { x: touchStartRef.current.x, y: touchStartRef.current.y },
            endPosition: { x: touch.clientX, y: touch.clientY },
            duration: Date.now() - touchStartRef.current.time,
            distance: 0,
            velocity: 0
          };
          onGesture?.(gesture);
          setLastGesture(gesture);
        }
      }, mergedConfig.longPressDelay);
    }
    
    // Initialize pinch detection for multi-touch
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      initialDistanceRef.current = distance;
    }
  }, [mergedConfig.longPressDelay, onGesture]);
  
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const touch = e.touches[0];
    if (!touch) return;
    
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    
    // Record touch for velocity calculation
    touchHistoryRef.current.push({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    });
    // Keep only last 5 touches for velocity
    if (touchHistoryRef.current.length > 5) {
      touchHistoryRef.current.shift();
    }
    
    // Determine if this is a horizontal or vertical swipe (first time)
    if (isHorizontalSwipeRef.current === null && Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      isHorizontalSwipeRef.current = Math.abs(deltaX) > Math.abs(deltaY);
    }
    
    // CRITICAL: Prevent scroll for horizontal swipes to enable view switching
    if (mergedConfig.preventScrollOnHorizontalSwipe && 
        isHorizontalSwipeRef.current && 
        Math.abs(deltaX) > 15) {
      e.preventDefault();
    }
    
    // Clear long press if movement detected
    if (longPressTimeoutRef.current && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    
    // Handle pinch gesture
    if (e.touches.length === 2 && initialDistanceRef.current) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      const scale = currentDistance / initialDistanceRef.current;
      
      if (Math.abs(scale - 1) > mergedConfig.pinchThreshold) {
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;
        
        const gesture: TouchGesture = {
          type: 'pinch',
          startPosition: { x: centerX, y: centerY },
          endPosition: { x: centerX, y: centerY },
          duration: Date.now() - touchStartRef.current.time,
          distance: currentDistance,
          velocity: 0,
          scale
        };
        onGesture?.(gesture);
        setLastGesture(gesture);
      }
    }
  }, [mergedConfig.pinchThreshold, mergedConfig.preventScrollOnHorizontalSwipe, onGesture]);
  
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchStartRef.current) return;
    
    setIsGesturing(false);
    
    // Clear long press timeout
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    
    const touch = e.changedTouches[0];
    if (!touch) return;
    
    const endTime = Date.now();
    const duration = endTime - touchStartRef.current.time;
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Calculate velocity from touch history
    let velocity = 0;
    if (touchHistoryRef.current.length >= 2) {
      const recent = touchHistoryRef.current.slice(-3);
      const first = recent[0];
      const last = recent[recent.length - 1];
      const timeDiff = last.time - first.time;
      if (timeDiff > 0) {
        const distDiff = Math.sqrt(
          Math.pow(last.x - first.x, 2) + Math.pow(last.y - first.y, 2)
        );
        velocity = distDiff / timeDiff;
      }
    }
    
    // Determine gesture type based on movement, duration, and velocity
    if (distance < mergedConfig.tapThreshold && duration < 300) {
      // Tap gesture
      const gesture: TouchGesture = {
        type: 'tap',
        startPosition: { x: touchStartRef.current.x, y: touchStartRef.current.y },
        endPosition: { x: touch.clientX, y: touch.clientY },
        duration,
        distance,
        velocity
      };
      onGesture?.(gesture);
      setLastGesture(gesture);
    } else if (
      // IMPROVED: Accept swipe if distance OR velocity threshold is met
      distance >= mergedConfig.swipeThreshold || 
      (velocity >= mergedConfig.swipeVelocityThreshold && distance >= 20)
    ) {
      // Swipe gesture - use the dominant direction
      let direction: 'left' | 'right' | 'up' | 'down';
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }
      
      // Check if it's an edge swipe
      const startedAtEdge = isEdgeTouch(touchStartRef.current.x);
      const isEdgeSwipe = startedAtEdge && (direction === 'left' || direction === 'right');
      
      const gesture: TouchGesture = {
        type: isEdgeSwipe ? 'edge-swipe' : 'swipe',
        direction,
        startPosition: { x: touchStartRef.current.x, y: touchStartRef.current.y },
        endPosition: { x: touch.clientX, y: touch.clientY },
        duration,
        distance,
        velocity,
        isEdgeSwipe
      };
      
      console.log('📱 Gesture detected:', gesture.type, gesture.direction, 'velocity:', velocity.toFixed(2));
      onGesture?.(gesture);
      setLastGesture(gesture);
    }
    
    // Reset touch state
    touchStartRef.current = null;
    initialDistanceRef.current = null;
    isHorizontalSwipeRef.current = null;
    touchHistoryRef.current = [];
  }, [mergedConfig.tapThreshold, mergedConfig.swipeThreshold, mergedConfig.swipeVelocityThreshold, isEdgeTouch, onGesture]);
  
  // Set up event listeners
  useEffect(() => {
    // Use the provided element or fall back to document
    const element = elementRef?.current || document.documentElement;
    
    // Use passive: false to allow preventDefault for horizontal swipes
    const options = { passive: false };
    
    element.addEventListener('touchstart', handleTouchStart, options);
    element.addEventListener('touchmove', handleTouchMove, options);
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, elementRef]);
  
  return {
    isGesturing,
    lastGesture,
    enableGestures: true,
  };
}

export default useMobileGestures;
