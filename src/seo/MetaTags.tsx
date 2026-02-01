import { useEffect } from 'react';
import { SEOProps } from '../types';
import { generateMetaTags, updateDocumentTitle, getCanonicalUrl } from '../utils/seo';

/**
 * Component for managing meta tags and SEO
 */
const MetaTags: React.FC<SEOProps & { path?: string }> = ({
  title,
  description,
  keywords,
  ogTitle,
  ogDescription,
  ogImage,
  ogUrl,
  twitterCard,
  canonicalUrl,
  path,
}) => {
  useEffect(() => {
    // Update document title
    if (title) {
      updateDocumentTitle(title);
    }

    // Generate and update meta tags
    const tags = generateMetaTags({
      title,
      description,
      keywords,
      ogTitle,
      ogDescription,
      ogImage,
      ogUrl,
      twitterCard,
      canonicalUrl,
    });

    // Update or create meta tags
    tags.forEach((tag) => {
      let element: HTMLMetaElement | null = null;

      if (tag.name) {
        element = document.querySelector(`meta[name="${tag.name}"]`) as HTMLMetaElement;
        if (!element) {
          element = document.createElement('meta');
          element.setAttribute('name', tag.name);
          document.head.appendChild(element);
        }
      } else if (tag.property) {
        element = document.querySelector(`meta[property="${tag.property}"]`) as HTMLMetaElement;
        if (!element) {
          element = document.createElement('meta');
          element.setAttribute('property', tag.property);
          document.head.appendChild(element);
        }
      }

      if (element) {
        element.setAttribute('content', tag.content);
      }
    });

    // Update canonical URL
    const canonical = canonicalUrl || getCanonicalUrl(path);
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonical);

    // Cleanup function (optional, as we're updating existing tags)
    return () => {
      // Meta tags persist, so no cleanup needed
    };
  }, [title, description, keywords, ogTitle, ogDescription, ogImage, ogUrl, twitterCard, canonicalUrl, path]);

  return null; // This component doesn't render anything
};

export default MetaTags;

