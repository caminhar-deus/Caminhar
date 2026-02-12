/**
 * Exemplo de implementação completa de SEO em página de blog
 * 
 * Este arquivo demonstra como usar todos os componentes do SEO Toolkit
 * em uma página de post do blog.
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
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function BlogPostExample() {
  const router = useRouter();
  const { slug } = router.query;
  
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

  // Dados do post (normalmente viriam da API)
  const [post, setPost] = useState({
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
  });

  // URLs
  const canonicalUrl = getCanonicalUrl(`/blog/${post.slug}`);
  const imageUrl = getImageUrl(post.image_url);

  // Breadcrumb items
  const breadcrumbItems = [
    { name: 'Blog', url: '/blog' },
    { name: post.title, url: `/blog/${post.slug}` },
  ];

  return (
    <>
      {/* SEO Head completo */}
      <SEOHead
        title={post.title}
        description={post.excerpt}
        image={post.image_url}
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
        image={post.image_url}
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
        {/* Breadcrumb visual */}
        <nav aria-label="Breadcrumb" className="breadcrumb">
          <ol itemScope itemType="https://schema.org/BreadcrumbList">
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <a itemProp="item" href="/">
                <span itemProp="name">Início</span>
              </a>
              <meta itemProp="position" content="1" />
            </li>
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <a itemProp="item" href="/blog">
                <span itemProp="name">Blog</span>
              </a>
              <meta itemProp="position" content="2" />
            </li>
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <span itemProp="name" aria-current="page">{post.title}</span>
              <meta itemProp="position" content="3" />
            </li>
          </ol>
        </nav>

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

          {/* Imagem otimizada - Critical (LCP) */}
          <ImageOptimized
            src={post.image_url}
            alt={post.title}
            width={1200}
            height={630}
            critical={true}
            priority={true}
            placeholder="blur"
            blurDataUrl="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."
          />

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
          <LazyIframe
            src="https://www.youtube.com/embed/VIDEO_ID"
            title="Mensagem de encorajamento"
            thumbnail="/uploads/video-thumb.jpg"
            provider="youtube"
            placeholderText="▶ Assistir vídeo"
          />
        </section>

        {/* Botões de compartilhamento otimizados */}
        <div className="share-buttons">
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonicalUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Compartilhar no Facebook"
          >
            Facebook
          </a>
          <a
            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(canonicalUrl)}&text=${encodeURIComponent(post.title)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Compartilhar no Twitter"
          >
            Twitter
          </a>
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${post.title} - ${canonicalUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Compartilhar no WhatsApp"
          >
            WhatsApp
          </a>
        </div>
      </main>
    </>
  );
}

// Export para Next.js getStaticProps/getServerSideProps
export async function getStaticProps({ params }) {
  // Buscar post no banco de dados
  // const post = await getPostBySlug(params.slug);
  
  return {
    props: {
      // post,
    },
    // Revalidate para ISR (Incremental Static Regeneration)
    revalidate: 60, // 60 segundos
  };
}

export async function getStaticPaths() {
  // Buscar todos os posts
  // const posts = await getAllPosts();
  
  return {
    paths: [
      // ...posts.map(post => ({ params: { slug: post.slug } })),
    ],
    fallback: 'blocking', // ou true para loading state
  };
}
