import { describe, it, expect } from '@jest/globals';
import siteConfig, {
  getCanonicalUrl,
  getImageUrl,
  formatSchemaDate,
  truncateDescription,
  extractKeywords,
  shouldIndex,
  generateBreadcrumb
} from '../../../../lib/seo/config.js';

describe('SEO Config Utilities (lib/seo/config.js)', () => {
  describe('siteConfig object', () => {
    it('deve ter as propriedades principais definidas', () => {
      expect(siteConfig).toHaveProperty('name');
      expect(siteConfig).toHaveProperty('url');
      expect(siteConfig).toHaveProperty('seo');
    });
  });

  describe('getCanonicalUrl', () => {
    it('deve concatenar corretamente a URL base com o caminho', () => {
      const url = getCanonicalUrl('blog/post-1');
      expect(url).toMatch(/http:\/\/localhost:3000\/blog\/post-1/);
    });

    it('deve tratar caminhos que já começam com barra', () => {
      const url = getCanonicalUrl('/sobre');
      expect(url).toMatch(/http:\/\/localhost:3000\/sobre/);
    });
  });

  describe('getImageUrl', () => {
    it('deve retornar a imagem padrão se não for fornecido caminho', () => {
      expect(getImageUrl(null)).toMatch(/\/default-og\.jpg/);
    });

    it('deve manter a URL intacta se já for absoluta (http)', () => {
      expect(getImageUrl('https://external.com/img.jpg')).toBe('https://external.com/img.jpg');
    });

    it('deve tratar caminhos com e sem barra no início', () => {
      expect(getImageUrl('/minha-img.png')).toMatch(/http:\/\/localhost:3000\/minha-img\.png/);
      expect(getImageUrl('minha-img.png')).toMatch(/http:\/\/localhost:3000\/minha-img\.png/);
    });
  });

  describe('formatSchemaDate', () => {
    it('deve retornar null se a data for inválida ou não fornecida', () => {
      expect(formatSchemaDate(null)).toBeNull();
      expect(formatSchemaDate('data-invalida')).toBeNull();
    });

    it('deve formatar datas válidas para o padrão ISO 8601', () => {
      const iso = formatSchemaDate('2026-04-04T12:00:00Z');
      expect(iso).toBe('2026-04-04T12:00:00.000Z');
    });
  });

  describe('truncateDescription', () => {
    it('deve retornar string vazia se não houver texto', () => {
      expect(truncateDescription(null)).toBe('');
    });

    it('deve retornar o texto intacto se for menor que o limite', () => {
      expect(truncateDescription('Curto', 10)).toBe('Curto');
    });

    it('deve truncar o texto e adicionar reticências', () => {
      const result = truncateDescription('Um texto muito longo que precisa ser cortado', 20);
      expect(result.length).toBeLessThanOrEqual(23); // 20 + 3 (...)
      expect(result).toMatch(/\.\.\.$/);
    });
  });

  describe('extractKeywords', () => {
    it('deve retornar array vazio se entrada não for array', () => {
      expect(extractKeywords(null)).toEqual([]);
    });

    it('deve formatar tags (minúsculas e sem espaços) e respeitar o limite máximo', () => {
      const tags = [' FÉ ', 'ESPERANÇA', 'Amor', 'Deus', 'Jesus'];
      const result = extractKeywords(tags, 3);
      expect(result).toEqual(['fé', 'esperança', 'amor']);
    });
  });

  describe('shouldIndex', () => {
    it('deve retornar true para páginas normais', () => {
      expect(shouldIndex('/blog/meu-post')).toBe(true);
      expect(shouldIndex('/sobre')).toBe(true);
    });

    it('deve retornar false para padrões configurados no noindexPaths (ex: /api/*, /admin)', () => {
      expect(shouldIndex('/admin')).toBe(false);
      expect(shouldIndex('/api/v1/posts')).toBe(false);
      expect(shouldIndex('/500')).toBe(false);
    });
  });

  describe('generateBreadcrumb', () => {
    it('deve sempre adicionar o Início (homepage) na raiz do breadcrumb', () => {
      const items = [{ name: 'Blog', url: '/blog' }];
      const result = generateBreadcrumb(items);
      expect(result[0].name).toBe('Início');
      expect(result[1].name).toBe('Blog');
      expect(result.length).toBe(2);
    });
  });
});