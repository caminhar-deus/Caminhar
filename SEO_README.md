# 📚 SEO & Performance Toolkit - O Caminhar com Deus

> Kit completo de SEO e Performance para Next.js, otimizado para Core Web Vitals e ranqueamento orgânico.

## 🎯 Objetivo

Alcançar mais pessoas através de excelente SEO técnico e experiência de usuário rápida.

## 📦 Estrutura

```
components/
├── SEO/
│   ├── Head.js                    # Componente de meta tags completo
│   ├── StructuredData/
│   │   ├── OrganizationSchema.js  # Schema.org Organization
│   │   ├── WebsiteSchema.js       # Schema.org WebSite
│   │   ├── ArticleSchema.js       # Schema.org Article/BlogPosting
│   │   ├── BreadcrumbSchema.js    # Schema.org BreadcrumbList
│   │   ├── MusicSchema.js         # Schema.org MusicRecording
│   │   ├── VideoSchema.js         # Schema.org VideoObject
│   │   └── index.js               # Exports
│   └── index.js                   # Main exports
├── Performance/
│   ├── ImageOptimized.js          # Wrapper next/image otimizado
│   ├── LazyIframe.js              # Lazy loading para iframes
│   ├── PreloadResources.js        # Preconnect/preload de recursos
│   ├── CriticalCSS.js             # CSS crítico inline
│   └── index.js                   # Exports
lib/
└── seo/
    └── config.js                  # Configurações SEO centralizadas
hooks/
└── usePerformanceMetrics.js       # Hook Core Web Vitals
pages/
└── _document.js                   # Document HTML customizado

examples/
├── blog-post-seo-example.js       # Exemplo página de blog
├── homepage-seo-example.js        # Exemplo homepage
├── musicas-seo-example.js         # Exemplo página de música
└── videos-seo-example.js          # Exemplo página de vídeo
```

## 🚀 Instalação Rápida

### 1. Instalar dependência
```bash
npm install web-vitals
```

### 2. Configurar variável de ambiente
```bash
# .env.local
SITE_URL=https://caminharcomdeus.com
```

### 3. Usar em páginas

#### Página de Blog
```javascript
import SEOHead from '../components/SEO/Head';
import { ArticleSchema, BreadcrumbSchema } from '../components/SEO/StructuredData';

export default function BlogPost({ post }) {
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
      
      <ArticleSchema {...post} />
      <BreadcrumbSchema items={[{ name: 'Blog', url: '/blog' }, { name: post.title }]} />
      
      {/* conteúdo */}
    </>
  );
}
```

#### Página de Música
```javascript
import SEOHead from '../components/SEO/Head';
import { MusicSchema } from '../components/SEO/StructuredData';
import { LazyIframe } from '../components/Performance';

export default function MusicaPage({ musica }) {
  return (
    <>
      <SEOHead
        title={`${musica.titulo} - ${musica.artista}`}
        description={`Ouça ${musica.titulo} de ${musica.artista}`}
        image={musica.capa}
      />
      
      <MusicSchema
        title={musica.titulo}
        artist={musica.artista}
        spotifyId={musica.spotify_id}
      />
      
      <LazyIframe
        src={`https://open.spotify.com/embed/track/${musica.spotify_id}`}
        provider="spotify"
      />
    </>
  );
}
```

## 📊 Core Web Vitals

O toolkit monitora automaticamente:
- **LCP** - Largest Contentful Paint (imagem/texto maior visível)
- **FID** - First Input Delay (resposta à primeira interação)
- **CLS** - Cumulative Layout Shift (estabilidade visual)
- **FCP** - First Contentful Paint (primeiro elemento visível)
- **TTFB** - Time to First Byte (tempo de resposta do servidor)

### Monitorar métricas
```javascript
import usePerformanceMetrics from '../hooks/usePerformanceMetrics';

function App() {
  usePerformanceMetrics({
    reportToAnalytics: true,
    onReport: (metric) => {
      // Enviar para Google Analytics
      gtag('event', metric.name, {
        value: metric.value,
        metric_rating: metric.rating,
      });
    },
  });
}
```

## 🎨 Componentes de Performance

### ImageOptimized
```javascript
<ImageOptimized
  src="/hero.jpg"
  alt="Descrição"
  width={1200}
  height={630}
  critical={true}      // Marca como LCP
  priority={true}      // Preload
  placeholder="blur" // Placeholder animado
/>
```

### LazyIframe
```javascript
<LazyIframe
  src="https://www.youtube.com/embed/ID"
  title="Vídeo"
  provider="youtube"   // youtube | spotify | generic
  thumbnail="/thumb.jpg"
  placeholderText="▶ Assistir"
/>
```

## 🗂️ Structured Data (Schema.org)

Cada tipo de conteúdo tem seu schema:

- `OrganizationSchema` - Dados da organização
- `WebsiteSchema` - Dados do site
- `ArticleSchema` - Posts do blog
- `BreadcrumbSchema` - Navegação
- `MusicSchema` - Músicas com Spotify
- `VideoSchema` - Vídeos com YouTube

## 📖 Documentação Completa

Veja `SEO_TOOLKIT_DOCUMENTATION.md` para:
- Lista completa de meta tags
- Todas as props de cada componente
- Exemplos de uso avançados
- Checklist de SEO
- Testes e ferramentas recomendadas

## ✅ Checklist de Implementação

- [ ] Substituir `next/head` por `SEOHead` em todas as páginas
- [ ] Adicionar `OrganizationSchema` no layout principal
- [ ] Adicionar `ArticleSchema` em posts do blog
- [ ] Usar `ImageOptimized` em todas as imagens
- [ ] Usar `LazyIframe` para YouTube/Spotify
- [ ] Implementar `usePerformanceMetrics` no _app.js
- [ ] Configurar `SITE_URL` no .env
- [ ] Criar imagens OG padrão (1200x630)
- [ ] Gerar favicons multi-resolução
- [ ] Testar no Google Search Console

## 🧪 Testar

```bash
# Build de produção
npm run build

# Testar local
npm start

# Verificar Core Web Vitals
npx lighthouse http://localhost:3000
```

## 📈 Ferramentas de Teste

1. [Google PageSpeed Insights](https://pagespeed.web.dev)
2. [Schema.org Validator](https://validator.schema.org)
3. [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug)
4. [Twitter Card Validator](https://cards-dev.twitter.com/validator)
5. [Google Rich Results Test](https://search.google.com/test/rich-results)

## 🤝 Contribuição

Para adicionar novos schemas ou melhorias:
1. Criar arquivo em `components/SEO/StructuredData/`
2. Adicionar export em `components/SEO/StructuredData/index.js`
3. Documentar props no `SEO_TOOLKIT_DOCUMENTATION.md`
4. Criar exemplo em `examples/`

---

**Criado com ❤️ para O Caminhar com Deus**
