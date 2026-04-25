/** @type {import('next-sitemap').IConfig} */
import { siteConfig } from './lib/seo/config.js';

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
  
  // Frequência de mudança por path
  changefreq: {
    '/': 'daily',
    '/blog': 'daily',
    '/blog/*': 'weekly',
    '/musicas': 'weekly',
    '/videos': 'weekly',
  },
  
  // Prioridade por path
  priority: {
    '/': 1.0,
    '/blog': 0.9,
    '/blog/*': 0.8,
    '/musicas': 0.7,
    '/videos': 0.7,
  },
  
  // Transformar config de cada URL
  transform: async (config, path) => {
    // Configurações específicas por tipo de página
    const customConfigs = {
      '/': {
        changefreq: 'daily',
        priority: 1.0,
        lastmod: new Date().toISOString(),
      },
      '/blog': {
        changefreq: 'daily',
        priority: 0.9,
        lastmod: new Date().toISOString(),
      },
    };

    // Default config
    const defaultConfig = {
      loc: path,
      changefreq: config.changefreq[path] || 'weekly',
      priority: config.priority[path] || 0.5,
      lastmod: new Date().toISOString(),
    };

    // Retorna config customizada ou default
    return customConfigs[path] || defaultConfig;
  },
  
  // Auto-detectar páginas dinâmicas (ISR/SSG)
  autoLastmod: true,
  
  // Geração de sitemap adicional para conteúdo dinâmico
  additionalPaths: async (config) => {
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
      console.warn('⚠️ Aviso ao gerar sitemap dinâmico:', error.message);
    }
    
    return result;
  },
  
  // Callback após gerar sitemap
  onComplete: (config) => {
    console.log(`✅ Sitemap gerado: ${config.siteUrl}/sitemap.xml`);
    console.log(`✅ Robots.txt gerado: ${config.siteUrl}/robots.txt`);
  },
};
