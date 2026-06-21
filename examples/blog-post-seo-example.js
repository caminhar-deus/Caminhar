/**
 * Exemplo de implementação completa de SEO em página de blog
 * 
 * Este arquivo demonstra como usar todos os componentes do SEO Toolkit
 * em uma página de post do blog.
 * 
 * Nota: Os dados do post normalmente viriam de getStaticProps ou getServerSideProps.
 * Exemplo:
 *   export async function getStaticProps({ params }) {
 *     const post = await getPostBySlug(params.slug);
 *     return { props: { post }, revalidate: 60 };
 *   }
 */

import SEOHead from '../components/SEO/Head';
import {
  ArticleSchema,
  BreadcrumbSchema,
  OrganizationSchema,
} from '../components/SEO/StructuredData';
import { ImageOptimized } from '../components/Performance';
import { LazyIframe } from '../components/Performance';
import { siteConfig, getCanonicalUrl, getImageUrl } from '../lib/seo/config';
import usePerformanceMetrics from '../hooks/usePerformanceMetrics';
import { useState } from 'react';

export default function BlogPostExample({ post: initialPost }) {
  // Inicializa monitoramento de performance
  usePerformanceMetrics({
    onReport: (metric) => {
      // Enviar para analytics (Google Analytics, Mixpanel, etc)
      if (typeof gtag !== 'undefined') {
        gtag('event', metric.name, {
          event_category: 'Web Vitals',
          value: Math.round(metric.value),
          metric_rating: metric.rating,
        });
      }
    },
    reportToAnalytics: true,
    debug: process.env.NODE_ENV === 'development',
  });

  // Fallback para dados mockados em ambiente de desenvolvimento
  const post = initialPost || {
    title: 'Encontrando Paz nas Tempestades da Vida',
    slug: 'encontrando-paz-nas-tempestades',
    excerpt: 'Como manter a fé e encontrar paz interior mesmo nos momentos mais difíceis da nossa jornada cristã.',
    content: 'Conteúdo completo do artigo aqui...',
    image_url: '/uploads/paz-tempestade.jpg',
    author: 'Pastor João Silva',
    authorUrl: '/autores/joao-silva',
    created_at: '2026-02-12T10:00:00Z',
    updated_at: '2026-02-12T14:30:00Z',
    tags: ['fé', 'paz', 'oração', 'adversidade', 'confiança em Deus'],
    category: 'Reflexões',
    wordCount: 1250,
  };

  // Estado de erro para componentes
  const [imageError, setImageError] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  // URLs
  const canonicalUrl = getCanonicalUrl(`/blog/${post.slug}`);
  const imageUrl = getImageUrl(post.image_url);

  // Breadcrumb items
  const breadcrumbItems = [
    { name: 'Blog', url: '/blog' },
    { name: post.title, url: `/blog/${post.slug}` },
  ];

  // Fallback visual para dados ausentes
  if (!post || !post.title) {
    return (
      <main id="main-content" className="container">
        <div className="error-state" role="alert">
          <h1>Conteúdo não disponível</h1>
          <p>O post solicitado não pôde ser carregado. Tente novamente mais tarde.</p>
          <a href="/blog" className="btn">Voltar para o Blog</a>
        </div>
      </main>
    );
  }

  return (
    <>
      {/* SEO Head completo */}
      <SEOHead
        title={post.title}
        description={post.excerpt}
        image={imageUrl}
        type="article"
        publishedAt={post.created_at}
        modifiedAt={post.updated_at}
        author={post.author}
        tags={post.tags}
        canonical={canonicalUrl}
        section={post.category}
        keywords={['fé cristã', 'espiritualidade', 'devocional']}
        locale="pt_BR"
      />

      {/* Structured Data - Schema.org */}
      <OrganizationSchema />
      <ArticleSchema
        title={post.title}
        description={post.excerpt}
        image={imageUrl}
        author={post.author}
        authorUrl={`${siteConfig.url}${post.authorUrl}`}
        publishedAt={post.created_at}
        modifiedAt={post.updated_at}
        url={canonicalUrl}
        tags={post.tags}
        category={post.category}
        wordCount={post.wordCount}
        articleBody={post.content}
      />
      <BreadcrumbSchema items={breadcrumbItems} />

      {/* Conteúdo da página */}
      <main id="main-content" className="container">
        <article itemScope itemType="https://schema.org/BlogPosting">
          <header>
            <h1 itemProp="headline">{post.title}</h1>
            <div className="meta">
              <span itemProp="author" itemScope itemType="https://schema.org/Person">
                Por <a href={post.authorUrl} itemProp="url">
                  <span itemProp="name">{post.author}</span>
                </a>
              </span>
              <time itemProp="datePublished" dateTime={post.created_at}>
                {new Date(post.created_at).toLocaleDateString('pt-BR')}
              </time>
              <time itemProp="dateModified" dateTime={post.updated_at}>
                (Atualizado: {new Date(post.updated_at).toLocaleDateString('pt-BR')})
              </time>
            </div>
          </header>

          {/* 
            Imagem otimizada - Critical (LCP)
            ATENÇÃO: Em produção, gere o blurDataUrl real usando ferramentas como:
            - plaiceholder (https://github.com/joe-bell/plaiceholder)
            - next/blur (via sharp ou @img/sharp)
            Nunca copie o placeholder de exemplo sem gerar o base64 correto para a imagem.
          */}
          {imageError ? (
            <div className="image-fallback" style={{ width: 1200, height: 630, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span>Imagem não disponível</span>
            </div>
          ) : (
            <ImageOptimized
              src={post.image_url}
              alt={post.title}
              width={1200}
              height={630}
              critical={true}
              priority={true}
              placeholder="blur"
              blurDataUrl="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
              onError={() => setImageError(true)}
            />
          )}

          <div itemProp="articleBody" className="content">
            {post.content}
          </div>

          {/* Tags */}
          <footer>
            <div className="tags">
              Tags: 
              {post.tags.map((tag, index) => (
                <a key={index} href={`/tag/${tag}`} rel="tag">
                  #{tag}
                </a>
              ))}
            </div>
          </footer>
        </article>

        {/* Vídeo relacionado com lazy loading */}
        <section className="related-video">
          <h2>Vídeo Relacionado</h2>
          {iframeError ? (
            <div className="fallback-content" role="alert">
              <p>O vídeo não pôde ser carregado. Você pode assisti-lo diretamente no YouTube.</p>
              <a href="https://www.youtube.com/embed/VIDEO_ID" target="_blank" rel="noopener noreferrer">
                Abrir no YouTube
              </a>
            </div>
          ) : (
            <LazyIframe
              src="https://www.youtube.com/embed/VIDEO_ID"
              title="Mensagem de encorajamento"
              thumbnail="/uploads/video-thumb.jpg"
              provider="youtube"
              placeholderText="▶ Assistir vídeo"
              onError={() => setIframeError(true)}
            />
          )}
        </section>

        {/* Botões de compartilhamento otimizados */}
        <div className="share-buttons">
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonicalUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Compartilhar no Facebook"
          >
            Compartilhar no Facebook
          </a>
          <a
            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(canonicalUrl)}&text=${encodeURIComponent(post.title)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Compartilhar no Twitter"
          >
            Compartilhar no Twitter
          </a>
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${post.title} - ${canonicalUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Compartilhar no WhatsApp"
          >
            Compartilhar no WhatsApp
          </a>
        </div>
      </main>
    </>
  );
}