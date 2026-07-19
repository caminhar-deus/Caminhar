/** @type {import('next-sitemap').IConfig} */

import { logger } from './lib/logger.js';

export default {
  siteUrl: process.env.SITE_URL || 'http://localhost:3000',
  
  // Gera robots.txt automaticamente
  generateRobotsTxt: true,
  
  // Robots.txt configuração
  robotsTxtOptions: {
    additionalSitemaps: [
      `${process.env.SITE_URL || 'http://localhost:3000'}/sitemap-musicas.xml`,
      `${process.env.SITE_URL || 'http://localhost:3000'}/sitemap-videos.xml`,
    ],
    policies: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: [
          '/admin',
          '/admin/*',
          '/api/*',
          '/_next/*',
          '/404',
          '/500',
        ],
      },
      {
        // Googlebot tem acesso total
        userAgent: 'Googlebot',
        allow: ['/'],
        disallow: ['/admin', '/admin/*', '/api/*'],
      },
      {
        // Bingbot
        userAgent: 'Bingbot',
        allow: ['/'],
        disallow: ['/admin', '/admin/*', '/api/*'],
      },
    ],
  },
  
  // Páginas para excluir
  exclude: [
    '/admin',
    '/admin/*',
    '/api/*',
    '/404',
    '/500',
    '/_next/*',
    '/server-sitemap.xml',
  ],
  
  // Auto-detectar páginas dinâmicas (ISR/SSG)
  autoLastmod: true,
  
  // Geração de sitemap adicional para conteúdo dinâmico
  additionalPaths: async () => {
    const result = [];
    
    // Importar conexão com o banco
    const { query } = await import('./lib/db.js');

    try {
      // ✅ Buscar todos os posts publicados
      const posts = await query('SELECT slug, updated_at FROM posts WHERE published = true');
      posts.rows.forEach(post => {
        result.push({
          loc: `/blog/${post.slug}`,
          changefreq: 'weekly',
          priority: 0.8,
          lastmod: new Date(post.updated_at).toISOString(),
        });
      });

      // ✅ Buscar todas as músicas publicadas
      const musicas = await query('SELECT slug, updated_at FROM musicas WHERE published = true');
      musicas.rows.forEach(musica => {
        result.push({
          loc: `/musicas/${musica.slug}`,
          changefreq: 'weekly',
          priority: 0.7,
          lastmod: new Date(musica.updated_at).toISOString(),
        });
      });

      // ✅ Buscar todos os vídeos publicados
      const videos = await query('SELECT slug, updated_at FROM videos WHERE published = true');
      videos.rows.forEach(video => {
        result.push({
          loc: `/videos/${video.slug}`,
          changefreq: 'weekly',
          priority: 0.7,
          lastmod: new Date(video.updated_at).toISOString(),
        });
      });

    } catch (error) {
      // TODO: Integrar com sistema de notificação (e-mail/Slack/webhook) em produção
      logger.error('Sitemap', 'Falha ao gerar sitemap dinâmico:', error.message);
    }
    
    return result;
  },
  
  // Callback após gerar sitemap
  onComplete: (sitemapConfig) => {
    console.log(`✅ Sitemap gerado: ${sitemapConfig.siteUrl}/sitemap.xml`);
    console.log(`✅ Robots.txt gerado: ${sitemapConfig.siteUrl}/robots.txt`);
  },
};
