/**
 * Application configuration
 */

export const APP_CONFIG = {
  name: 'Neuraplay',
  version: '1.0.0',
  description: 'AI-powered educational platform for children',
  url: process.env.VITE_APP_URL || 'https://neuraplay.com',
  apiUrl: process.env.VITE_API_URL || 'https://api.neuraplay.com',
  
  // Feature flags
  features: {
    serviceWorker: process.env.NODE_ENV === 'production',
    analytics: process.env.VITE_ENABLE_ANALYTICS === 'true',
    errorTracking: process.env.VITE_ENABLE_ERROR_TRACKING === 'true',
  },

  // Performance settings
  performance: {
    enableLazyLoading: true,
    enableCodeSplitting: true,
    enableImageOptimization: true,
    imageQuality: 80,
    imageFormats: ['webp', 'jpeg'] as const,
  },

  // SEO settings
  seo: {
    defaultTitle: 'Neuraplay - AI-Powered Educational Platform',
    defaultDescription: 'AI-powered educational platform for children',
    defaultKeywords: 'education, AI, children, learning, tutoring, cognitive development',
    twitterHandle: '@neuraplay',
  },
} as const;

