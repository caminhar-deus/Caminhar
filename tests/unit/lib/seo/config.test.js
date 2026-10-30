import { describe, it, expect } from '@jest/globals';
import siteConfig, { siteUrl } from '../../../../lib/seo/config.js';

// As funções utilitárias (getCanonicalUrl, getImageUrl, formatSchemaDate,
// truncateDescription, extractKeywords, sanitizeJsonLd, shouldIndex,
// generateBreadcrumb) foram removidas junto com `components/SEO/` (código
// morto sem importadores) em 2026-10-30. O config segue vivo: `_document.js`
// usa `siteConfig` e o blog usa `siteConfig.name` como fallback do
// `site_title` do painel (ADR-0032).
describe('SEO Config (lib/seo/config.js)', () => {
  describe('siteConfig object', () => {
    it('deve ter as propriedades principais definidas', () => {
      expect(siteConfig).toHaveProperty('name');
      expect(siteConfig).toHaveProperty('url');
      expect(siteConfig).toHaveProperty('language');
      expect(siteConfig).toHaveProperty('shortName');
      expect(siteConfig).toHaveProperty('description');
    });

    it('deve expor siteUrl (fallback localhost sem SITE_URL)', () => {
      expect(siteUrl).toMatch(/^https?:\/\//);
    });
  });
});
