import { describe, it, expect } from '@jest/globals';
import sitemapConfig from '../../next-sitemap.config.js';

describe('Configuração SEO — next-sitemap.config.js', () => {
  const NOINDEX_ROUTES = ['/entrar', '/minha-conta', '/checkout', '/checkout/*', '/login'];
  const PROTECTED_SYSTEM_ROUTES = ['/admin', '/admin/*', '/api/*', '/design-system'];

  it('exclui todas as rotas noindex da conta do visitante, checkout e login administrativo do sitemap', () => {
    expect(Array.isArray(sitemapConfig.exclude)).toBe(true);
    for (const route of [...NOINDEX_ROUTES, ...PROTECTED_SYSTEM_ROUTES]) {
      expect(sitemapConfig.exclude).toContain(route);
    }
  });

  it('bloqueia todas as rotas noindex nas políticas de robots.txt para *, Googlebot e Bingbot', () => {
    const policies = sitemapConfig.robotsTxtOptions?.policies || [];
    expect(policies.length).toBeGreaterThanOrEqual(3);

    for (const agent of ['*', 'Googlebot', 'Bingbot']) {
      const policy = policies.find((p) => p.userAgent === agent);
      expect(policy).toBeDefined();
      for (const route of [...NOINDEX_ROUTES, ...PROTECTED_SYSTEM_ROUTES]) {
        expect(policy.disallow).toContain(route);
      }
    }
  });
});
