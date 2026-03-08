# 📚 Guia Rápido de SEO & Performance - O Caminhar com Deus

> Guia rápido para implementar SEO e Performance no Next.js.

## 🚀 Versão: v1.7.0

**Última Atualização:** 07/03/2026
**Projeto:** O Caminhar com Deus

## 🎯 Objetivo

Alcançar mais pessoas através de excelente SEO técnico e experiência de usuário rápida.

## 📦 Estrutura Básica

```
components/
├── SEO/
│   ├── Head.js                    # Componente de meta tags
│   ├── StructuredData/            # Schema.org
│   └── index.js                   # Exports
├── Performance/
│   ├── ImageOptimized.js          # Imagens otimizadas
│   ├── LazyIframe.js              # Iframes lazy loading
│   └── index.js                   # Exports
lib/
└── seo/
    └── config.js                  # Configurações
```

## 🚀 Instalação Rápida

### 1. Instalar dependências
```bash
npm install web-vitals @vercel/og
```

### 2. Configurar variável de ambiente
```bash
# .env.local
SITE_URL=https://caminharcomdeus.com
```

### 3. Executar testes de carga
```bash
# Testes de performance SEO
npm run test:seo-performance

# Testes de carga geral
npm run test:load

# Testes de Core Web Vitals
npm run test:web-vitals
```

## 🎯 Uso Básico

### Página de Blog
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

### Página de Música
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

### Métricas de Performance Alvo
- **LCP**: < 2.5s
- **FID**: < 100ms
- **CLS**: < 0.1
- **FCP**: < 1.8s
- **TTFB**: < 800ms

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

Para documentação detalhada, consulte:
- **SEO_TOOLKIT.md**: Documentação completa de todos os componentes
- **API.md**: Documentação da API RESTful
- **PERFORMANCE.md**: Guia avançado de performance

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

## 🔧 Solução de Problemas Comuns

### Problemas de SEO
- **Meta tags não aparecendo**: Verifique o build de produção
- **Schema.org não validado**: Use o validator do Google
- **Imagens não indexadas**: Verifique alt texts e lazy loading

### Problemas de Performance
- **LCP alto**: Otimizar imagens hero e critical CSS
- **CLS alto**: Definir dimensões fixas para imagens e iframes
- **FID alto**: Reduzir JavaScript bloqueante

## 🤝 Contribuição

Para adicionar novos schemas ou melhorias:
1. Criar arquivo em `components/SEO/StructuredData/`
2. Adicionar export em `components/SEO/StructuredData/index.js`
3. Documentar props no `SEO_TOOLKIT.md`
4. Criar exemplo em `examples/`

---

**Criado com ❤️ para O Caminhar com Deus**
