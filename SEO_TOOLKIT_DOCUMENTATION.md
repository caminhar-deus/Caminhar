# 🚀 SEO & Performance Toolkit

Kit completo de SEO e Performance para Next.js - Otimizado para Core Web Vitals e ranqueamento orgânico.

## 📦 Componentes

### 1. SEOHead (`components/SEO/Head.js`)

Componente principal para meta tags SEO.

#### Props:

```javascript
<SEOHead
  title="Título da Página"           // Obrigatório
  description="Descrição"            // Obrigatório
  image="/imagem.jpg"               // Imagem OG (opcional)
  type="website|article"            // Tipo de conteúdo
  publishedAt="2026-02-12"          // Data publicação (article)
  modifiedAt="2026-02-12"           // Data modificação
  author="Nome do Autor"            // Autor (article)
  tags={['tag1', 'tag2']}           // Tags/keywords
  canonical="https://..."           // URL canônica
  noindex={false}                   // Evita indexação
  locale="pt_BR"                    // Locale
  section="Blog"                   // Seção do site
  keywords={['kw1', 'kw2']}         // Keywords extras
  twitterHandle="@caminhar"         // Twitter handle
/>
```

#### Meta Tags Incluídas:
- ✅ Title (com nome do site)
- ✅ Meta Description
- ✅ Meta Keywords
- ✅ Canonical URL
- ✅ Robots (index/follow, noindex)
- ✅ Viewport otimizado
- ✅ Theme Color
- ✅ Favicons (multi-plataforma)
- ✅ Open Graph (title, description, image, type, url)
- ✅ Open Graph Article (published_time, modified_time, author, section, tags)
- ✅ Twitter Cards (card, site, creator, title, description, image)
- ✅ Twitter Labels (para artigos)
- ✅ Preconnect (Google Fonts, YouTube, Spotify)
- ✅ DNS Prefetch
- ✅ Apple Mobile Web App
- ✅ Microsoft Tile
- ✅ Geo Tags
- ✅ Manifest

---

### 2. Structured Data (Schema.org)

#### OrganizationSchema
```javascript
import { OrganizationSchema } from '../components/SEO/StructuredData';

<OrganizationSchema
  name="O Caminhar com Deus"
  description="Reflexões cristãs..."
  logo="/logo.png"
  sameAs={['https://facebook.com/...', 'https://instagram.com/...']}
/>
```

#### WebsiteSchema
```javascript
import { WebsiteSchema } from '../components/SEO/StructuredData';

<WebsiteSchema
  name="O Caminhar com Deus"
  searchUrl="https://caminhar.com/blog?q={search}"
/>
```

#### ArticleSchema (Blog)
```javascript
import { ArticleSchema } from '../components/SEO/StructuredData';

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

#### BreadcrumbSchema
```javascript
import { BreadcrumbSchema } from '../components/SEO/StructuredData';

<BreadcrumbSchema
  items={[
    { name: 'Blog', url: '/blog' },
    { name: 'Título do Post', url: '/blog/slug' },
  ]}
/>
```

#### MusicSchema
```javascript
import { MusicSchema } from '../components/SEO/StructuredData';

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
import { VideoSchema } from '../components/SEO/StructuredData';

<VideoSchema
  title="Título do Vídeo"
  description="Descrição"
  thumbnail="/thumb.jpg"
  url="https://caminhar.com/videos/123"
  youtubeId="YOUTUBE_ID"
  views={10000}
/>
```

---

### 3. Performance Components

#### ImageOptimized
Wrapper otimizado para `next/image` com fallbacks e skeleton loading.

```javascript
import { ImageOptimized } from '../components/Performance';

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
  blurDataUrl="data:image/jpeg;base64,..."
/>

// Imagem com fallback
<ImageOptimized
  src="/imagem.jpg"
  alt="Descrição"
  width={800}
  height={600}
  fallbackSrc="/default-image.jpg"
/>
```

#### LazyIframe
Lazy loading para iframes (YouTube, Spotify) com placeholder.

```javascript
import { LazyIframe } from '../components/Performance';

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

// Genérico
<LazyIframe
  src="https://example.com/embed"
  title="Conteúdo"
  provider="generic"
  loadOnVisible={true}
/>
```

#### PreloadResources
Preconnect e preload de recursos críticos.

```javascript
import { PreloadResources, getCriticalResources } from '../components/Performance';

// Recursos manuais
<PreloadResources
  images={['/hero.jpg', '/logo.png']}
  fonts={['/fonts/main.woff2']}
  domains={['https://api.example.com']}
/>

// Recursos automáticos por página
const resources = getCriticalResources('home'); // 'home' | 'blog' | 'musicas' | 'videos'
<PreloadResources {...resources} />
```

#### CriticalCSS
CSS crítico inline para renderização rápida.

```javascript
import { CriticalCSS, extractCriticalCSS, removeCriticalCSS } from '../components/Performance';

// No _document.js
<CriticalCSS css={extractCriticalCSS()} />

// Remover após carregamento (no _app.js useEffect)
useEffect(() => {
  removeCriticalCSS();
}, []);
```

---

## 📊 Core Web Vitals Hook

### usePerformanceMetrics

```javascript
import usePerformanceMetrics from '../hooks/usePerformanceMetrics';

function MyPage() {
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
    analyticsEndpoint: '/api/analytics/web-vitals',
    debug: true, // Logs no console em desenvolvimento
  });

  // Métricas disponíveis:
  // - LCP (Largest Contentful Paint)
  // - FID (First Input Delay)
  // - CLS (Cumulative Layout Shift)
  // - INP (Interaction to Next Paint)
  // - FCP (First Contentful Paint)
  // - TTFB (Time to First Byte)
  // - TBT (Total Blocking Time)

  return <div>...</div>;
}
```

---

## ⚙️ Configuração

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

// Funções utilitárias
import { 
  getCanonicalUrl, 
  getImageUrl, 
  formatSchemaDate, 
  truncateDescription 
} from '../lib/seo/config';
```

---

## 🎯 Exemplos de Uso

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

---

## 📋 Checklist SEO

### Meta Tags
- [x] Title único e descritivo (< 60 chars)
- [x] Meta description única (< 160 chars)
- [x] Canonical URL
- [x] Robots meta (index/follow)
- [x] Open Graph completo
- [x] Twitter Cards
- [x] Favicon multi-resolução

### Performance
- [x] LCP otimizado (imagens críticas com priority)
- [x] CLS mínimo (aspect-ratio em imagens)
- [x] FID baixo (code splitting, lazy loading)
- [x] Preconnect para domínios externos
- [x] Font display swap

### Structured Data
- [x] Organization
- [x] Website
- [x] Article (para posts)
- [x] BreadcrumbList
- [x] MusicRecording (para músicas)
- [x] VideoObject (para vídeos)

### Acessibilidade
- [x] Skip links
- [x] Alt text em imagens
- [x] ARIA labels
- [x] Contraste adequado

---

## 🔧 Instalação

1. **Instale a dependência web-vitals:**
```bash
npm install web-vitals
```

2. **Copie todos os arquivos do toolkit para seu projeto**

3. **Configure variáveis de ambiente:**
```bash
SITE_URL=https://caminhar.com
```

4. **Atualize next.config.js para gerar sitemap:**
```javascript
const { withSitemap } = require('next-sitemap');
module.exports = withSitemap({
  // config
});
```

---

## 🧪 Teste SEO

### Ferramentas Recomendadas:
1. **Google Search Console** - Verificação de indexação
2. **Google PageSpeed Insights** - Core Web Vitals
3. **Schema.org Validator** - Structured data
4. **Facebook Sharing Debugger** - Open Graph
5. **Twitter Card Validator** - Twitter Cards
6. **Lighthouse** - Auditoria completa

### Teste Local:
```bash
# Build de produção
npm run build

# Iniciar servidor
npm start

# Rodar Lighthouse
npx lighthouse http://localhost:3000 --output=html
```

---

## 📈 Métricas de Sucesso

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

---

## 📝 Notas de Versão

### v1.0.0
- ✅ SEOHead completo com todas meta tags
- ✅ 6 tipos de Schema.org
- ✅ Performance components (ImageOptimized, LazyIframe)
- ✅ Core Web Vitals monitoring
- ✅ Critical CSS inline
- ✅ Preload resources
- ✅ Documentação completa
