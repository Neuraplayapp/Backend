/**
 * Performance utility functions
 */

/**
 * Defer non-critical code execution
 */
export const deferExecution = (
  callback: () => void,
  delay: number = 0
): number => {
  if (typeof window.requestIdleCallback === 'function') {
    return window.requestIdleCallback(callback, { timeout: delay });
  }

  return window.setTimeout(callback, delay);
};

/**
 * Preload resource
 */
export const preloadResource = (href: string, as: string, crossOrigin?: string): void => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  if (crossOrigin) {
    link.crossOrigin = crossOrigin;
  }
  document.head.appendChild(link);
};

/**
 * Prefetch resource
 */
export const prefetchResource = (href: string): void => {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  document.head.appendChild(link);
};

/**
 * Measure performance metric
 */
export const measurePerformance = (name: string, callback: () => void): void => {
  if ('performance' in window && 'mark' in window.performance) {
    const startMark = `${name}-start`;
    const endMark = `${name}-end`;

    performance.mark(startMark);
    callback();
    performance.mark(endMark);

    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name)[0];
      console.log(`${name} took ${measure.duration}ms`);
    } catch (error) {
      console.error('Performance measurement error:', error);
    }
  } else {
    callback();
  }
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

