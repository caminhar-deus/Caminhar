import Head from 'next/head';
import { useRouter } from 'next/router';
import { siteConfig } from '../../lib/seo/config';

/**
 * SEOHead - Componente completo para meta tags SEO
 * 
 * Props:
 * - title: Título da página (obrigatório)
 * - description: Descrição/meta description (obrigatório)
 * - image: URL da imagem OG (opcional, usa defaultImage)
 * - type: Tipo de conteúdo (website, article, profile) (padrão: website)
 * - publishedAt: Data de publicação (ISO 8601) - para articles
 * - modifiedAt: Data de modificação (ISO 8601)
 * - author: Nome do autor - para articles
 * - tags: Array de tags/keywords
 * - canonical: URL canônica (opcional, usa URL atual)
 * - noindex: Boolean - adiciona noindex,nofollow
 * - locale: Locale (padrão: pt_BR)
 * - section: Seção do site (ex: Blog, Músicas)
 * - keywords: Keywords adicionais
 * - twitterHandle: Handle do Twitter (ex: @caminhar)
 * - siteName: Nome do site (padrão do config)
 */

export default function SEOHead({
  title,
  description,
  image,
  type = 'website',
  publishedAt,
  modifiedAt,
  author,
  tags = [],
  canonical,
  noindex = false,
  locale = 'pt_BR',
  section,
  keywords = [],
  twitterHandle = siteConfig.social.twitter,
  siteName = siteConfig.name,
  children, // Para meta tags adicionais
}) {
  const router = useRouter();
  
  // Gera URL canônica
  const canonicalUrl = canonical 
    ? canonical 
    : `${siteConfig.url}${router.asPath === '/' ? '' : router.asPath}`;
  
  // Remove query params da URL para OG
  const ogUrl = canonicalUrl.split('?')[0];
  
  // Imagem OG
  const ogImage = image 
    ? (image.startsWith('http') ? image : `${siteConfig.url}${image}`)
    : `${siteConfig.url}${siteConfig.defaultImage}`;
  
  // Título completo (com nome do site)
  const fullTitle = title === siteName 
    ? title 
    : `${title} | ${siteName}`;
  
  // Keywords combinadas
  const allKeywords = [...new Set([...tags, ...keywords])];
  
  // Metadados de artigo
  const articleMeta = type === 'article' ? {
    'article:published_time': publishedAt,
    'article:modified_time': modifiedAt,
    'article:author': author,
    'article:section': section,
    'article:tag': tags,
  } : {};

  return (
    <Head>
      {/* Básico */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={allKeywords.join(', ')} />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Robots */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}
      
      {/* Theme Color */}
      <meta name="theme-color" content="#2c3e50" />
      <meta name="msapplication-TileColor" content="#2c3e50" />
      
      {/* Viewport */}
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      
      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={ogUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={locale} />
      
      {/* OG Article Meta */}
      {type === 'article' && publishedAt && (
        <meta property="article:published_time" content={publishedAt} />
      )}
      {type === 'article' && modifiedAt && (
        <meta property="article:modified_time" content={modifiedAt} />
      )}
      {type === 'article' && author && (
        <meta property="article:author" content={author} />
      )}
      {type === 'article' && section && (
        <meta property="article:section" content={section} />
      )}
      {tags.map((tag, index) => (
        <meta key={index} property="article:tag" content={tag} />
      ))}
      
      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={twitterHandle} />
      <meta name="twitter:creator" content={twitterHandle} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={title} />
      
      {/* Additional Twitter for Articles */}
      {type === 'article' && (
        <meta name="twitter:label1" content="Escrito por" />
        <meta name="twitter:data1" content={author || siteName} />
      )}
      {type === 'article' && publishedAt && (
        <meta name="twitter:label2" content="Publicado em" />
        <meta name="twitter:data2" content={new Date(publishedAt).toLocaleDateString('pt-BR')} />
      )}
      
      {/* Favicons */}
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      <link rel="manifest" href="/manifest.json" />
      
      {/* Preconnect para domínios externos */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://www.youtube.com" />
      <link rel="preconnect" href="https://open.spotify.com" />
      
      {/* DNS Prefetch */}
      <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      <link rel="dns-prefetch" href="https://www.youtube.com" />
      <link rel="dns-prefetch" href="https://open.spotify.com" />
      
      {/* Apple Meta Tags */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content={siteName} />
      
      {/* Format Detection */}
      <meta name="format-detection" content="telephone=no" />
      
      {/* Geo Tags */}
      <meta name="geo.region" content="BR" />
      <meta name="geo.placename" content="Brasil" />
      
      {/* Children - para meta tags adicionais customizadas */}
      {children}
    </Head>
  );
}
