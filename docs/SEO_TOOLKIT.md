# SEO & Performance Toolkit - Documentação Completa

Kit completo de SEO e Performance para Next.js - Otimizado para Core Web Vitals e ranqueamento orgânico.

## Visão Geral

Componentes e hooks para implementação completa de SEO técnico e performance em aplicações Next.js.

## Componentes Principais

### SEOHead
Componente principal para meta tags SEO.

```javascript
<SEOHead
  title="Título da Página"           // Obrigatório
  description="Descrição"            // Obrigatório
  image="/imagem.jpg"               // Imagem OG (opcional)
  type="website|article"            // Tipo de conteúdo
  publishedAt="2026-02-12"          // Data publicação (article)
  author="Nome do Autor"            // Autor (article)
  tags={['tag1', 'tag2']}           // Tags/keywords
  canonical="https://..."           // URL canônica
  noindex={false}                   // Evita indexação
  locale="pt_BR"                    // Locale
  twitterHandle="@caminhar"         // Twitter handle
/>
```

**Meta Tags Incluídas:**
- Title (com nome do site)
- Meta Description
- Meta Keywords
- Canonical URL
- Robots (index/follow, noindex)
- Open Graph completo
- Twitter Cards
- Preconnect (Google Fonts, YouTube, Spotify)
- Favicons (multi-plataforma)

### Structured Data (Schema.org)

#### OrganizationSchema
```javascript
<OrganizationSchema
  name="O Caminhar com Deus"
  description="Reflexões cristãs..."
  logo="/logo.png"
  sameAs={['https://facebook.com/...', 'https://instagram.com/...']}
/>
```

#### ArticleSchema (Blog)
```javascript
<ArticleSchema
  title="Título do Post"
  description="Resumo do post"
  image="/imagem.jpg"
  author="Autor"
  publishedAt="2026-02-12"
  url="https://caminhar.com/blog/slug"
  tags={['fé', 'oração']}
  wordCount={1200}
/>
```

#### MusicSchema
```javascript
<MusicSchema
  title="Nome da Música"
  artist="Artista"
  album="Álbum"
  image="/capa.jpg"
  url="https://caminhar.com/musicas/123"
  spotifyId="SPOTIFY_ID"
  genre="Gospel"
/>
```

#### VideoSchema
```javascript
<VideoSchema
  title="Título do Vídeo"
  description="Descrição"
  thumbnail="/thumb.jpg"
  url="https://caminhar.com/videos/123"
  youtubeId="YOUTUBE_ID"
  views={10000}
/>
```

## Performance Components

### ImageOptimized
Wrapper otimizado para `next/image` com fallbacks e skeleton loading.

```javascript
// Imagem normal
<ImageOptimized
  src="/imagem.jpg"
  alt="Descrição"
  width={800}
  height={600}
/>

// Imagem crítica (LCP)
<ImageOptimized
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={630}
  critical={true}
  priority={true}
  placeholder="blur"
/>
```

### LazyIframe
Lazy loading para iframes (YouTube, Spotify) com placeholder.

```javascript
// YouTube
<LazyIframe
  src="https://www.youtube.com/embed/VIDEO_ID"
  title="Vídeo"
  provider="youtube"
  thumbnail="/thumb.jpg"
  placeholderText="▶ Assistir vídeo"
/>

// Spotify
<LazyIframe
  src="https://open.spotify.com/embed/track/ID"
  title="Música"
  provider="spotify"
  aspectRatio="100/152"
/>
```

### PreloadResources
Preconnect e preload de recursos críticos.

```javascript
<PreloadResources
  images={['/hero.jpg', '/logo.png']}
  fonts={['/fonts/main.woff2']}
  domains={['https://api.example.com']}
/>
```

## Core Web Vitals Hook

### usePerformanceMetrics

```javascript
const { reportMetric, getMetrics, metrics } = usePerformanceMetrics({
  onReport: (metric) => {
    // Enviar para Google Analytics
    gtag('event', metric.name, {
      event_category: 'Web Vitals',
      value: metric.value,
      metric_rating: metric.rating,
    });
  },
  reportToAnalytics: true,
  debug: true, // Logs no console em desenvolvimento
});
```

**Métricas disponíveis:**
- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)
- INP (Interaction to Next Paint)
- FCP (First Contentful Paint)
- TTFB (Time to First Byte)
- TBT (Total Blocking Time)

## Configuração

### lib/seo/config.js

```javascript
export const siteConfig = {
  name: 'O Caminhar com Deus',
  description: '...',
  url: 'https://caminhar.com',
  
  author: {
    name: 'O Caminhar com Deus',
    email: 'contato@caminhar.com',
  },
  
  social: {
    twitter: '@caminhar',
    facebook: 'https://facebook.com/caminhar',
    instagram: 'https://instagram.com/caminhar',
  },
  
  defaultImage: '/default-og.jpg',
  
  sections: {
    blog: { name: 'Blog', description: '...' },
    musicas: { name: 'Músicas', description: '...' },
    videos: { name: 'Vídeos', description: '...' },
  },
};
```

## Exemplos de Uso

### Página de Blog Completa

```javascript
import SEOHead from '../components/SEO/Head';
import { ArticleSchema, BreadcrumbSchema, OrganizationSchema } from '../components/SEO/StructuredData';
import { ImageOptimized, LazyIframe } from '../components/Performance';
import usePerformanceMetrics from '../hooks/usePerformanceMetrics';

export default function BlogPost({ post }) {
  usePerformanceMetrics({ reportToAnalytics: true });
  
  return (
    <>
      <SEOHead
        title={post.title}
        description={post.excerpt}
        image={post.image}
        type="article"
        publishedAt={post.createdAt}
        author={post.author}
        tags={post.tags}
      />
      
      <OrganizationSchema />
      <ArticleSchema {...post} />
      <BreadcrumbSchema items={[{ name: 'Blog', url: '/blog' }, { name: post.title }]} />
      
      <main>
        <ImageOptimized src={post.image} alt={post.title} critical priority />
        <h1>{post.title}</h1>
        <div>{post.content}</div>
        
        {post.videoUrl && (
          <LazyIframe src={post.videoUrl} provider="youtube" />
        )}
      </main>
    </>
  );
}
```

### Página de Música Completa

```javascript
import SEOHead from '../components/SEO/Head';
import { MusicSchema, OrganizationSchema } from '../components/SEO/StructuredData';
import { ImageOptimized, LazyIframe } from '../components/Performance';
import usePerformanceMetrics from '../hooks/usePerformanceMetrics';

export default function MusicaPage({ musica }) {
  usePerformanceMetrics({ reportToAnalytics: true });
  
  return (
    <>
      <SEOHead
        title={`${musica.titulo} - ${musica.artista}`}
        description={`Ouça ${musica.titulo} de ${musica.artista}`}
        image={musica.capa}
      />
      
      <OrganizationSchema />
      <MusicSchema
        title={musica.titulo}
        artist={musica.artista}
        album={musica.album}
        image={musica.capa}
        url={`https://caminhar.com/musicas/${musica.id}`}
        spotifyId={musica.spotify_id}
        genre={musica.genero}
      />
      
      <main>
        <ImageOptimized src={musica.capa} alt={musica.titulo} critical priority />
        <h1>{musica.titulo}</h1>
        <p>Artista: {musica.artista}</p>
        <p>Álbum: {musica.album}</p>
        
        <LazyIframe
          src={`https://open.spotify.com/embed/track/${musica.spotify_id}`}
          provider="spotify"
          aspectRatio="100/152"
        />
      </main>
    </>
  );
}
```

### Página de Vídeo Completa

```javascript
import SEOHead from '../components/SEO/Head';
import { VideoSchema, OrganizationSchema } from '../components/SEO/StructuredData';
import { ImageOptimized, LazyIframe } from '../components/Performance';
import usePerformanceMetrics from '../hooks/usePerformanceMetrics';

export default function VideoPage({ video }) {
  usePerformanceMetrics({ reportToAnalytics: true });
  
  return (
    <>
      <SEOHead
        title={video.titulo}
        description={video.descricao}
        image={video.thumbnail}
      />
      
      <OrganizationSchema />
      <VideoSchema
        title={video.titulo}
        description={video.descricao}
        thumbnail={video.thumbnail}
        url={`https://caminhar.com/videos/${video.id}`}
        youtubeId={video.youtube_id}
        views={video.visualizacoes}
      />
      
      <main>
        <ImageOptimized src={video.thumbnail} alt={video.titulo} critical priority />
        <h1>{video.titulo}</h1>
        <p>{video.descricao}</p>
        
        <LazyIframe
          src={`https://www.youtube.com/embed/${video.youtube_id}`}
          provider="youtube"
          thumbnail={video.thumbnail}
          placeholderText="▶ Assistir vídeo"
        />
      </main>
    </>
  );
}
```

## Checklist SEO

### Meta Tags
- [x] Title único e descritivo (< 60 chars)
- [x] Meta description única (< 160 chars)
- [x] Canonical URL
- [x] Open Graph completo
- [x] Twitter Cards
- [x] Favicon multi-resolução

### Performance
- [x] LCP otimizado (imagens críticas com priority)
- [x] CLS mínimo (aspect-ratio em imagens)
- [x] FID baixo (code splitting, lazy loading)
- [x] Preconnect para domínios externos

### Structured Data
- [x] Organization
- [x] Website
- [x] Article (para posts)
- [x] BreadcrumbList
- [x] MusicRecording (para músicas)
- [x] VideoObject (para vídeos)

## Instalação

### Dependências Necessárias
- web-vitals: ^3.5.0
- next: ^16.1.6
- react: ^19.2.4
- @vercel/og: ^0.6.1

1. **Instale as dependências:**
```bash
npm install web-vitals @vercel/og
```

2. **Configure variáveis de ambiente:**
```bash
SITE_URL=https://caminhar.com
```

3. **Execute testes de carga:**
```bash
# Testes de performance SEO
npm run test:seo-performance

# Testes de carga geral
npm run test:load

# Testes de Core Web Vitals
npm run test:web-vitals
```

## Teste SEO

### Ferramentas Recomendadas:
1. Google Search Console - Verificação de indexação
2. Google PageSpeed Insights - Core Web Vitals
3. Schema.org Validator - Structured data
4. Facebook Sharing Debugger - Open Graph
5. Twitter Card Validator - Twitter Cards
6. Lighthouse - Auditoria completa

### Teste Local:
```bash
# Build de produção
npm run build

# Iniciar servidor
npm start

# Rodar Lighthouse
npx lighthouse http://localhost:3000 --output=html
```

## Métricas de Sucesso

### Core Web Vitals (Good):
- **LCP** < 2.5s
- **FID** < 100ms
- **CLS** < 0.1
- **FCP** < 1.8s
- **TTFB** < 800ms

### SEO:
- 100% de páginas indexadas
- Schema.org válido
- Mobile-friendly
- HTTPS ativo

## Solução de Problemas

### Problemas de SEO
- **Meta tags não aparecendo**: Verifique o build de produção
- **Schema.org não validado**: Use o validator do Google
- **Imagens não indexadas**: Verifique alt texts e lazy loading

### Problemas de Performance
- **LCP alto**: Otimizar imagens hero e critical CSS
- **CLS alto**: Definir dimensões fixas para imagens e iframes
- **FID alto**: Reduzir JavaScript bloqueante

## Guia de Migração

### De next/head para SEOHead
1. **Substituir imports:**
```javascript
// Antigo
import Head from 'next/head';

// Novo
import SEOHead from '../components/SEO/Head';
```

2. **Mapear props equivalentes:**
```javascript
// Antigo
<Head>
  <title>{title}</title>
  <meta name="description" content={description} />
</Head>

// Novo
<SEOHead title={title} description={description} />
```

### De next/image para ImageOptimized
1. **Substituir imports:**
```javascript
// Antigo
import Image from 'next/image';

// Novo
import { ImageOptimized } from '../components/Performance';
```

2. **Atualizar props:**
```javascript
// Antigo
<Image src="/img.jpg" alt="..." width={800} height={600} />

// Novo
<ImageOptimized src="/img.jpg" alt="..." width={800} height={600} />
```

## Notas de Versão

### v1.7.0
- ✅ Documentação completa e organizada
- ✅ Guia rápido integrado
- ✅ Exemplos de uso avançados
- ✅ Configurações detalhadas
- ✅ Guia de migração completo

### v1.4.0
- ✅ SEOHead completo com todas meta tags
- ✅ 6 tipos de Schema.org
- ✅ Performance components (ImageOptimized, LazyIframe)
- ✅ Core Web Vitals monitoring
- ✅ Critical CSS inline
- ✅ Preload resources
- ✅ Documentação completa
- ✅ Spotify Integration: Sistema completo de integração com Spotify
- ✅ YouTube Integration: Sistema completo de integração com YouTube
- ✅ Sistema de Upload de Imagens: Sistema robusto com validação de tipos MIME
- ✅ Sistema de Backup Automático: Backup diário com compressão e rotação
- ✅ API RESTful v1.4.0: Endpoints organizados e documentados
- ✅ Polimento Visual e Técnico: Animações, transições e tratamento de erros
- ✅ Testes de Integrações Externas: Validação completa de integrações
- ✅ Testes de Documentação: Verificação da qualidade e completude
- ✅ Modernização ESM + Turbopack: Projeto totalmente compatível com ES modules
- ✅ Testes de Performance: Métricas de performance monitoradas e validadas
- ✅ Testes de Segurança: Validação de segurança do sistema e proteções
- ✅ Testes de Cross-Browser: Compatibilidade verificada em diferentes navegadores
- ✅ Testes de Mobile: Responsividade e usabilidade validadas em dispositivos móveis
