# 📚 SEO & Performance Toolkit - O Caminhar com Deus

> Kit completo de SEO e Performance para Next.js, otimizado para Core Web Vitals e ranqueamento orgânico.

## 🚀 Versão: v1.4.0

**Última Atualização:** 07/03/2026
**Projeto:** O Caminhar com Deus

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

### 1. Instalar dependências
```bash
npm install web-vitals @vercel/og
```

### Dependências Necessárias
- web-vitals: ^3.5.0
- next: ^16.1.6
- react: ^19.2.4
- @vercel/og: ^0.6.1 (Gerador de imagens)

### 2. Configurar variável de ambiente
```bash
# .env.local
SITE_URL=https://caminharcomdeus.com
```

### 3. Configurar testes de carga
```javascript
// load-tests/seo-performance-test.js
import { check } from 'k6';
import http from 'k6/http';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'],
    'http_req_failed': ['rate<0.1'],
  },
};

export default function() {
  const res = http.get('https://caminhar.com');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'LCP < 2.5s': (r) => r.timings.duration < 2500,
    'CLS < 0.1': (r) => r.timings.duration < 1000,
  });
}
```

### 4. Executar testes de carga
```bash
# Testes de performance SEO
npm run test:seo-performance

# Testes de carga geral
npm run test:load

# Testes de Core Web Vitals
npm run test:web-vitals
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

Veja `SEO_TOOLKIT.md` para:
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

## 📝 Notas de Versão

### v1.4.0
- ✅ SEOHead completo com todas meta tags
- ✅ 6 tipos de Schema.org
- ✅ Performance components (ImageOptimized, LazyIframe)
- ✅ Core Web Vitals monitoring
- ✅ Critical CSS inline
- ✅ Preload resources
- ✅ Documentação completa
- ✅ Spotify Integration: Sistema completo de integração com Spotify para reprodução de músicas
- ✅ YouTube Integration: Sistema completo de integração com YouTube para reprodução de vídeos
- ✅ Sistema de Upload de Imagens: Sistema robusto com validação de tipos MIME e tamanho de arquivos
- ✅ Sistema de Backup Automático: Backup diário com compressão, rotação e interface administrativa
- ✅ API RESTful v1.4.0: Endpoints organizados e documentados para consumo externo
- ✅ Polimento Visual e Técnico: Animações, transições e tratamento de erros aprimorados
- ✅ Testes de Integrações Externas: Validação completa de integrações com Spotify, YouTube e Redis
- ✅ Testes de Documentação: Verificação da qualidade e completude da documentação
- ✅ Modernização ESM + Turbopack: Projeto totalmente compatível com ES modules sem flags experimentais
- ✅ Testes de Performance: Métricas de performance monitoradas e validadas
- ✅ Testes de Segurança: Validação de segurança do sistema e proteções
- ✅ Testes de Cross-Browser: Compatibilidade verificada em diferentes navegadores
- ✅ Testes de Mobile: Responsividade e usabilidade validadas em dispositivos móveis
