/**
 * Sitemap generation utility
 */

import { APP_URL } from '../constants';

export interface SitemapEntry {
  url: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  lastmod?: string;
}

/**
 * Generate sitemap.xml content
 */
export const generateSitemap = (entries: SitemapEntry[]): string => {
  const urls = entries
    .map((entry) => {
      const url = entry.url.startsWith('http') ? entry.url : `${APP_URL}${entry.url}`;
      const lastmod = entry.lastmod || new Date().toISOString().split('T')[0];
      const changefreq = entry.changefreq || 'weekly';
      const priority = entry.priority || 0.8;

      return `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
};

/**
 * Default sitemap entries
 */
export const getDefaultSitemapEntries = (): SitemapEntry[] => {
  return [
    {
      url: '/',
      changefreq: 'daily',
      priority: 1.0,
    },
    {
      url: '/about',
      changefreq: 'weekly',
      priority: 0.8,
    },
    // Add more routes here
  ];
};

