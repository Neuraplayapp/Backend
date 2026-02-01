/**
 * SEO utility functions
 */

import { SEOProps, StructuredData } from '../types';
import { APP_NAME, APP_URL, DEFAULT_SEO } from '../constants';

/**
 * Generate structured data (JSON-LD) for Organization
 */
export const generateOrganizationSchema = (): StructuredData => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: APP_NAME,
  url: APP_URL,
  description: DEFAULT_SEO.description,
  logo: `${APP_URL}/logo.png`,
  sameAs: [
    // Add social media URLs here
    // 'https://www.facebook.com/neuraplay',
    // 'https://twitter.com/neuraplay',
  ],
});

/**
 * Generate structured data for WebSite
 */
export const generateWebSiteSchema = (): StructuredData => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: APP_NAME,
  url: APP_URL,
  description: DEFAULT_SEO.description,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${APP_URL}/search?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
});

/**
 * Generate structured data for SoftwareApplication
 */
export const generateSoftwareApplicationSchema = (): StructuredData => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: APP_NAME,
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Web, iOS, Android',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '100',
  },
});

/**
 * Generate meta tags array from SEO props
 */
export const generateMetaTags = (props: SEOProps): Array<{ name?: string; property?: string; content: string }> => {
  const {
    title = DEFAULT_SEO.title,
    description = DEFAULT_SEO.description,
    keywords,
    ogTitle = title,
    ogDescription = description,
    ogImage = DEFAULT_SEO.ogImage,
    ogUrl = APP_URL,
    twitterCard = 'summary_large_image',
    canonicalUrl,
  } = props;

  const tags = [
    { name: 'description', content: description },
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
    { name: 'author', content: APP_NAME },
    { property: 'og:title', content: ogTitle },
    { property: 'og:description', content: ogDescription },
    { property: 'og:image', content: ogImage },
    { property: 'og:url', content: ogUrl },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: APP_NAME },
    { name: 'twitter:card', content: twitterCard },
    { name: 'twitter:title', content: ogTitle },
    { name: 'twitter:description', content: ogDescription },
    { name: 'twitter:image', content: ogImage },
  ];

  if (keywords) {
    tags.push({ name: 'keywords', content: keywords });
  }

  return tags;
};

/**
 * Update document title
 */
export const updateDocumentTitle = (title: string): void => {
  document.title = title;
};

/**
 * Get canonical URL
 */
export const getCanonicalUrl = (path: string = ''): string => {
  return `${APP_URL}${path}`;
};

