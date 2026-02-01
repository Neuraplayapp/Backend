import { useState, useCallback } from 'react';
import { PanInfo } from 'framer-motion';

interface UseSwipePagesOptions {
  initialPage?: number;
  totalPages?: number;
  swipeThreshold?: number;
  velocityThreshold?: number;
}

interface UseSwipePagesReturn {
  currentPage: number;
  direction: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  dragHandlers: {
    drag: 'x';
    dragConstraints: { left: number; right: number };
    dragElastic: number;
    onDragEnd: (event: any, info: PanInfo) => void;
  };
  getPageOffset: () => string;
}

/**
 * Hook for managing swipeable page navigation
 * @param options - Configuration options
 */
export function useSwipePages(options: UseSwipePagesOptions = {}): UseSwipePagesReturn {
  const {
    initialPage = 1,
    totalPages = 3,
    swipeThreshold = 50,
    velocityThreshold = 500,
  } = options;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [direction, setDirection] = useState(0);

  const goToPage = useCallback((page: number) => {
    if (page >= 0 && page < totalPages) {
      setDirection(page > currentPage ? 1 : -1);
      setCurrentPage(page);
    }
  }, [currentPage, totalPages]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      setDirection(1);
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > 0) {
      setDirection(-1);
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  const handleDragEnd = useCallback((event: any, info: PanInfo) => {
    const { offset, velocity } = info;
    
    // Calculate swipe power (combination of distance and velocity)
    const swipePower = Math.abs(offset.x) * Math.abs(velocity.x);
    
    if (Math.abs(offset.x) > swipeThreshold || Math.abs(velocity.x) > velocityThreshold) {
      if (offset.x < 0 && currentPage < totalPages - 1) {
        // Swiped left -> go to next page (right)
        nextPage();
      } else if (offset.x > 0 && currentPage > 0) {
        // Swiped right -> go to previous page (left)
        prevPage();
      }
    }
  }, [currentPage, totalPages, swipeThreshold, velocityThreshold, nextPage, prevPage]);

  const getPageOffset = useCallback(() => {
    return `translateX(-${currentPage * 100}%)`;
  }, [currentPage]);

  return {
    currentPage,
    direction,
    goToPage,
    nextPage,
    prevPage,
    dragHandlers: {
      drag: 'x',
      dragConstraints: { left: 0, right: 0 },
      dragElastic: 0.2,
      onDragEnd: handleDragEnd,
    },
    getPageOffset,
  };
}

export default useSwipePages;




