// Application constants

export const APP_NAME = 'Neuraplay';
export const APP_DESCRIPTION = 'AI-powered educational platform for children';
export const APP_URL = import.meta.env.VITE_APP_URL || 'https://neuraplay.com';

export const APP_AUTHOR = 'Neuraplay Team';

// SEO defaults
export const DEFAULT_SEO = {
  title: `${APP_NAME} - AI-Powered Educational Platform`,
  description: APP_DESCRIPTION,
  keywords: 'education, AI, children, learning, tutoring, cognitive development',
  ogImage: `${APP_URL}/og-image.jpg`,
};

// Cache configuration
export const CACHE_VERSION = 'v1';
export const CACHE_NAME = `${APP_NAME.toLowerCase()}-${CACHE_VERSION}`;

// Service worker configuration
export const SW_UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

// Image optimization
export const IMAGE_FORMATS = {
  webp: 'image/webp',
  jpeg: 'image/jpeg',
  png: 'image/png',
} as const;

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

