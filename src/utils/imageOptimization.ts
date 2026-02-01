/**
 * Image optimization utilities
 */

/**
 * Get optimized image src with WebP support fallback
 */
export const getOptimizedImageSrc = (
  src: string,
  format: 'webp' | 'jpeg' | 'png' = 'webp',
  width?: number,
  quality: number = 80
): string => {
  // If using a CDN or image service, append optimization parameters
  // For now, return the original src
  // In production, integrate with your image CDN/service
  const params = new URLSearchParams();
  if (format) params.append('format', format);
  if (width) params.append('w', width.toString());
  params.append('q', quality.toString());

  return params.toString() ? `${src}?${params.toString()}` : src;
};

/**
 * Generate responsive image srcset
 */
export const generateSrcSet = (
  baseSrc: string,
  widths: number[] = [400, 800, 1200, 1600],
  format: 'webp' | 'jpeg' = 'webp'
): string => {
  return widths.map((width) => `${getOptimizedImageSrc(baseSrc, format, width)} ${width}w`).join(', ');
};

/**
 * Check if browser supports WebP
 */
export const supportsWebP = (): boolean => {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
};

/**
 * Get image loading attribute based on viewport
 */
export const getImageLoading = (priority: 'high' | 'low' = 'low'): 'lazy' | 'eager' => {
  return priority === 'high' ? 'eager' : 'lazy';
};

