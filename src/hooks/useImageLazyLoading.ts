import { useState, useEffect, useRef, RefObject } from 'react';

interface UseImageLazyLoadingOptions {
  rootMargin?: string;
  threshold?: number;
}

/**
 * Custom hook for lazy loading images
 * Returns loading state and image source ready for use
 */
export const useImageLazyLoading = (
  src: string,
  options: UseImageLazyLoadingOptions = {}
): { ref: RefObject<HTMLImageElement>; isLoaded: boolean; imageSrc: string } => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>('');
  const ref = useRef<HTMLImageElement>(null);
  const { rootMargin = '50px', threshold = 0.01 } = options;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoaded) {
          setImageSrc(src);
          setIsLoaded(true);
          if (ref.current) {
            observer.unobserve(ref.current);
          }
        }
      },
      {
        rootMargin,
        threshold,
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
  }, [src, isLoaded, rootMargin, threshold]);

  return { ref, isLoaded, imageSrc };
};

