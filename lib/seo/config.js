/**
 * Configurações SEO do site "O Caminhar com Deus"
 * Centraliza todas as configurações de SEO para fácil manutenção
 */

// URL base do site
export const siteUrl = process.env.SITE_URL || 'http://localhost:3000';

// Configurações principais do site
export const siteConfig = {
  name: 'O Caminhar com Deus',
  shortName: 'Caminhar',
  description: 'Reflexões, ensinamentos e inspiração sobre a fé cristã, espiritualidade e a jornada de caminhar com Deus no dia a dia.',
  shortDescription: 'Reflexões e ensinamentos sobre a fé cristã',
  url: siteUrl,
  language: 'pt-BR',
  locale: 'pt_BR',
  timezone: 'America/Sao_Paulo',
  
  // Branding
  logo: `${siteUrl}/logo.png`,
  defaultImage: '/default-og.jpg',
  favicon: '/favicon.ico',
  
  // Autor padrão
  author: {
    name: 'O Caminhar com Deus',
    email: 'contato@caminharcomdeus.com',
    url: siteUrl,
  },
  
  // Redes Sociais
  social: {
    twitter: '@caminhar',
    twitterUrl: 'https://twitter.com/caminhar',
    facebook: 'https://facebook.com/caminharcomdeus',
    instagram: 'https://instagram.com/caminharcomdeus',
    youtube: 'https://youtube.com/caminharcomdeus',
    spotify: 'https://open.spotify.com/artist/caminhar',
  },
  
  // Contato
  contact: {
    email: 'contato@caminharcomdeus.com',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Brasil',
    },
  },
  
  // Categorias/Seções do site
  sections: {
    blog: {
      name: 'Blog',
      description: 'Reflexões e ensinamentos sobre a fé cristã',
      slug: 'blog',
    },
    musicas: {
      name: 'Músicas',
      description: 'Músicas gospel e cristãs para edificar sua fé',
      slug: 'musicas',
    },
    videos: {
      name: 'Vídeos',
      description: 'Vídeos cristãos, pregações e testemunhos',
      slug: 'videos',
    },
  },
  
  // Configurações de RSS
  feed: {
    title: 'O Caminhar com Deus - Feed RSS',
    description: 'Últimas reflexões e ensinamentos',
    copyright: `© ${new Date().getFullYear()} O Caminhar com Deus. Todos os direitos reservados.`,
  },
  
  // Configurações de SEO técnico
  seo: {
    // Páginas para não indexar
    noindexPaths: [
      '/admin',
      '/admin/*',
      '/api/*',
      '/test/*',
      '/_next/*',
      '/404',
      '/500',
    ],
    
    // Sitemap config
    sitemap: {
      changefreq: {
        homepage: 'daily',
        blog: 'weekly',
        musicas: 'weekly',
        videos: 'weekly',
      },
      priority: {
        homepage: 1.0,
        blog: 0.8,
        musicas: 0.7,
        videos: 0.7,
      },
    },
    
    // OG Image defaults
    ogImage: {
      width: 1200,
      height: 630,
      type: 'image/jpeg',
    },
  },
  
  // Schema.org - Organization
  organization: {
    '@type': 'Organization',
    name: 'O Caminhar com Deus',
    alternateName: 'Caminhar',
    url: siteUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${siteUrl}/logo.png`,
      width: 512,
      height: 512,
    },
    sameAs: [
      'https://facebook.com/caminharcomdeus',
      'https://instagram.com/caminharcomdeus',
      'https://twitter.com/caminhar',
      'https://youtube.com/caminharcomdeus',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'contato@caminharcomdeus.com',
      availableLanguage: 'Portuguese',
    },
  },
  
  // Schema.org - Website
  website: {
    '@type': 'WebSite',
    name: 'O Caminhar com Deus',
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/blog?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  },
};

// Funções utilitárias

/**
 * Gera URL canônica completa
 * @param {string} path - Caminho da página (ex: /blog/post-slug)
 * @returns {string} URL completa
 */
export function getCanonicalUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${siteUrl}${cleanPath}`;
}

/**
 * Gera URL absoluta para imagem
 * @param {string} imagePath - Caminho da imagem
 * @returns {string} URL completa da imagem
 */
export function getImageUrl(imagePath) {
  if (!imagePath) return `${siteUrl}${siteConfig.defaultImage}`;
  if (imagePath.startsWith('http')) return imagePath;
  if (imagePath.startsWith('/')) return `${siteUrl}${imagePath}`;
  return `${siteUrl}/${imagePath}`;
}

/**
 * Formata data para Schema.org (ISO 8601)
 * @param {string|Date} date - Data
 * @returns {string} Data formatada
 */
export function formatSchemaDate(date) {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * Trunca texto para meta description
 * @param {string} text - Texto original
 * @param {number} maxLength - Tamanho máximo (padrão: 160)
 * @returns {string} Texto truncado
 */
export function truncateDescription(text, maxLength = 160) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
}

/**
 * Extrai keywords de tags
 * @param {string[]} tags - Array de tags
 * @param {number} max - Máximo de keywords (padrão: 10)
 * @returns {string[]} Keywords limitadas
 */
export function extractKeywords(tags, max = 10) {
  if (!Array.isArray(tags)) return [];
  return tags.slice(0, max).map(tag => tag.toLowerCase().trim());
}

/**
 * Verifica se uma página deve ser indexada
 * @param {string} path - Caminho da página
 * @returns {boolean} Se deve indexar
 */
export function shouldIndex(path) {
  const noindexPatterns = siteConfig.seo.noindexPaths;
  
  return !noindexPatterns.some(pattern => {
    if (pattern.endsWith('/*')) {
      const base = pattern.replace('/*', '');
      return path === base || path.startsWith(`${base}/`);
    }
    return path === pattern;
  });
}

/**
 * Gera breadcrumb para página
 * @param {Array} items - Array de {name, url}
 * @returns {Array} Breadcrumb formatado
 */
export function generateBreadcrumb(items) {
  return [
    { name: 'Início', url: siteUrl },
    ...items,
  ];
}

// Export default para import fácil
export default siteConfig;
