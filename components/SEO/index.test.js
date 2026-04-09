import { describe, it, expect } from '@jest/globals';
import DefaultExport, {
  SEOHead,
  OrganizationSchema,
  WebsiteSchema,
  ArticleSchema,
  BreadcrumbSchema,
  MusicSchema,
  VideoSchema,
  siteConfig,
  getCanonicalUrl,
  getImageUrl
} from './index.js';

describe('Componentes SEO - Index Exports', () => {
  it('deve re-exportar todos os componentes e configurações de SEO corretamente', () => {
    // Valida se o export default é o mesmo que o SEOHead
    expect(DefaultExport).toBeDefined();
    expect(SEOHead).toBeDefined();
    expect(DefaultExport).toBe(SEOHead);
    
    // Valida se re-exportou os schemas e as configs
    expect(OrganizationSchema).toBeDefined();
    expect(WebsiteSchema).toBeDefined();
    expect(ArticleSchema).toBeDefined();
    expect(BreadcrumbSchema).toBeDefined();
    expect(MusicSchema).toBeDefined();
    expect(VideoSchema).toBeDefined();
    
    expect(siteConfig).toBeDefined();
    expect(getCanonicalUrl).toBeDefined();
    expect(getImageUrl).toBeDefined();
  });
});