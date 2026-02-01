import { useState, useEffect, useRef } from 'react';

interface UseScrollAnimationReturn {
  ref: React.RefObject<HTMLDivElement>;
  isVisible: boolean;
}

/**
 * Custom hook for scroll-triggered animations using Intersection Observer
 * Returns a ref to attach to elements and a visibility state
 */
export const useScrollAnimation = (
  threshold: number = 0.1,
  rootMargin: string = '0px 0px -100px 0px'
): UseScrollAnimationReturn => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold, rootMargin]);

  return { ref, isVisible };
};

