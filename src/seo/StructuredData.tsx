import { useEffect } from 'react';
import {
  generateOrganizationSchema,
  generateWebSiteSchema,
  generateSoftwareApplicationSchema,
} from '../utils/seo';

interface StructuredDataProps {
  type?: 'organization' | 'website' | 'softwareApplication' | 'all';
}

/**
 * Component for injecting structured data (JSON-LD) into the page
 */
const StructuredData: React.FC<StructuredDataProps> = ({ type = 'all' }) => {
  useEffect(() => {
    const schemas: Array<{ id: string; schema: any }> = [];

    if (type === 'all' || type === 'organization') {
      schemas.push({
        id: 'organization-schema',
        schema: generateOrganizationSchema(),
      });
    }

    if (type === 'all' || type === 'website') {
      schemas.push({
        id: 'website-schema',
        schema: generateWebSiteSchema(),
      });
    }

    if (type === 'all' || type === 'softwareApplication') {
      schemas.push({
        id: 'software-application-schema',
        schema: generateSoftwareApplicationSchema(),
      });
    }

    // Inject JSON-LD scripts
    schemas.forEach(({ id, schema }) => {
      let script = document.getElementById(id) as HTMLScriptElement;
      if (!script) {
        script = document.createElement('script');
        script.id = id;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(schema, null, 2);
    });

    // Cleanup function
    return () => {
      schemas.forEach(({ id }) => {
        const script = document.getElementById(id);
        if (script) {
          script.remove();
        }
      });
    };
  }, [type]);

  return null; // This component doesn't render anything
};

export default StructuredData;

