/** @type {import('next-sitemap').IConfig} */

import { logger } from './lib/infra/logger.js';

export default {
  siteUrl: process.env.SITE_URL || 'http://localhost:3000',
  
  // Gera robots.txt automaticamente
  generateRobotsTxt: true,
  
  // Robots.txt configuração
  robotsTxtOptions: {
    // Sem sitemap-musicas/sitemap-videos: não há rota de detalhe para essas
    // entidades (pages/ só tem /blog/[slug]) e nenhum XML é gerado — anunciar
    // os dois só mandaria o rastreador para 404. Ver comentário em additionalPaths.
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
    const { query, closeDatabase } = await import('./lib/infra/db.js');

    try {
      // ✅ Buscar todos os posts publicados (rota de detalhe existe: /blog/[slug])
      const posts = await query('SELECT slug, updated_at FROM posts WHERE published = true');
      posts.rows.forEach(post => {
        result.push({
          loc: `/blog/${post.slug}`,
          changefreq: 'weekly',
          priority: 0.8,
          lastmod: new Date(post.updated_at).toISOString(),
        });
      });

      // musicas e videos NÃO geram entradas aqui, e não é só a query que estava
      // errada (a tabela não tem `slug` — a coluna é `publicado`, não `published`):
      // pages/ não tem rota de detalhe para elas (só pages/blog/[slug].js). Sem
      // rota, não há URL de detalhe legítima — gerar `/musicas/<algo>` seria
      // publicar 404 no sitemap. Criar essas rotas é trabalho de produto
      // (docs/PENDENCIAS_scripts_testes.md, item P), não de pipeline.
    } catch (error) {
      // TODO: Integrar com sistema de notificação (e-mail/Slack/webhook) em produção
      logger.error('Sitemap', 'Falha ao gerar sitemap dinâmico:', error.message);
    } finally {
      // O pool do pg mantém o event loop vivo: sem fechar, o processo do
      // next-sitemap nunca termina e o `npm run build` trava no postbuild.
      try {
        await closeDatabase();
      } catch (closeError) {
        logger.warn('Sitemap', `Falha ao fechar o pool do banco: ${closeError.message}`);
      }
    }
    
    return result;
  },
  
  // Callback após gerar sitemap
  onComplete: (sitemapConfig) => {
    console.log(`✅ Sitemap gerado: ${sitemapConfig.siteUrl}/sitemap.xml`);
    console.log(`✅ Robots.txt gerado: ${sitemapConfig.siteUrl}/robots.txt`);
  },
};
