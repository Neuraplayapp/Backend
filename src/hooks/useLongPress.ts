import { useRef, useCallback } from 'react';

interface UseLongPressOptions {
  threshold?: number;
  onStart?: () => void;
  onCancel?: () => void;
}

interface UseLongPressReturn {
  onTouchStart: () => void;
  onTouchEnd: () => void;
  onTouchMove: () => void;
  onMouseDown: () => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
}

/**
 * Hook for detecting long-press gestures
 * @param callback - Function to call when long-press is detected
 * @param ms - Duration in milliseconds (default: 1000ms)
 * @param options - Additional options
 */
export function useLongPress(
  callback: () => void,
  ms: number = 1000,
  options: UseLongPressOptions = {}
): UseLongPressReturn {
  const { threshold = 10, onStart, onCancel } = options;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const start = useCallback(() => {
    onStart?.();
    timerRef.current = setTimeout(() => {
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      callback();
    }, ms);
  }, [callback, ms, onStart]);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      onCancel?.();
    }
  }, [onCancel]);

  return {
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchMove: clear,
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
  };
}

export default useLongPress;




