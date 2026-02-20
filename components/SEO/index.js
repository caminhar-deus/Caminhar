// SEO Components - Main exports

export { default as SEOHead } from './Head';
export { 
  OrganizationSchema, 
  WebsiteSchema, 
  ArticleSchema, 
  BreadcrumbSchema, 
  MusicSchema, 
  VideoSchema 
} from './StructuredData';

// Re-export config for convenience
export { siteConfig, getCanonicalUrl, getImageUrl } from '../../lib/seo/config';

// Default export
export { default } from './Head';
