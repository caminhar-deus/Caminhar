# Análise da Pasta `/examples`

## Visão Geral

A pasta `/examples` contém 4 arquivos de exemplo que demonstram a implementação de SEO (Search Engine Optimization) utilizando componentes do projeto. Servem como documentação viva e referência de boas práticas para desenvolvedores.

---

## 1. `blog-post-seo-example.js`

**Localização:** `/examples/blog-post-seo-example.js`

**Tamanho:** 242 linhas

**Propósito:** Exemplo completo e detalhado de implementação de SEO em uma página de post do blog. Demonstra o uso integrado de todos os componentes principais de SEO do projeto.

**O que faz:**
- Configura meta tags via `SEOHead` (título, descrição, imagem, tipo article, autor, tags, keywords)
- Aplica Structured Data com schemas: `ArticleSchema`, `OrganizationSchema`, `BreadcrumbSchema`
- Renderiza breadcrumb visual com microdados Schema.org
- Utiliza `ImageOptimized` para imagem principal com foco em LCP (Largest Contentful Paint)
- Emprega `LazyIframe` para carregamento sob demanda de vídeo do YouTube
- Implementa monitoramento de performance via `usePerformanceMetrics`
- Inclui botões de compartilhamento social (Facebook, Twitter, WhatsApp)
- Define `getStaticProps` e `getStaticPaths` para SSG/ISR do Next.js

**Dependências:** SEO components (`Head`, `StructuredData`), Performance components (`ImageOptimized`, `LazyIframe`), hooks (`usePerformanceMetrics`), lib (`siteConfig`, `getCanonicalUrl`, `getImageUrl`)

---

## 2. `homepage-seo-example.js`

**Localização:** `/examples/homepage-seo-example.js`

**Tamanho:** 61 linhas

**Propósito:** Exemplo simplificado de SEO para a página inicial (home) do site. Demonstra a implementação básica e essencial de SEO.

**O que faz:**
- Configura meta tags via `SEOHead` com nome e descrição do site
- Aplica Structured Data com `OrganizationSchema` e `WebsiteSchema`
- Utiliza `ImageOptimized` para hero image com flag critical/priority (foco em LCP)
- Emprega `PreloadResources` para carregamento antecipado de recursos críticos
- Implementa monitoramento de performance via `usePerformanceMetrics`
- Obtém recursos críticos via `getCriticalResources('home')`

**Dependências:** SEO components (`Head`, `StructuredData`), Performance components (`ImageOptimized`, `PreloadResources`, `getCriticalResources`), hooks (`usePerformanceMetrics`), lib (`siteConfig`)

---

## 3. `musicas-seo-example.js`

**Localização:** `/examples/musicas-seo-example.js`

**Tamanho:** 59 linhas

**Propósito:** Exemplo de implementação de SEO específico para a seção de músicas do site, utilizando o schema `MusicSchema` para dados estruturados de música.

**O que faz:**
- Configura meta tags via `SEOHead` com tipo `music.song`
- Aplica Structured Data com `MusicSchema` (título, artista, álbum, gênero, Spotify ID, data de lançamento)
- Aplica `BreadcrumbSchema` para navegação estrutural
- Utiliza `LazyIframe` para embed do Spotify com carregamento lazy
- Constrói URL canônica via `getCanonicalUrl`

**Dependências:** SEO components (`Head`, `StructuredData`), Performance components (`LazyIframe`), lib (`siteConfig`, `getCanonicalUrl`)

---

## 4. `videos-seo-example.js`

**Localização:** `/examples/videos-seo-example.js`

**Tamanho:** 65 linhas

**Propósito:** Exemplo de implementação de SEO para a seção de vídeos, utilizando o schema `VideoSchema` para dados estruturados de vídeo.

**O que faz:**
- Configura meta tags via `SEOHead` com tipo `video.other`
- Aplica Structured Data com `VideoSchema` (título, descrição, thumbnail, embed URL, upload date, canal, visualizações)
- Aplica `BreadcrumbSchema` para navegação estrutural
- Utiliza `LazyIframe` para embed do YouTube com carregamento lazy
- Constrói URL canônica via `getCanonicalUrl`

**Dependências:** SEO components (`Head`, `StructuredData`), Performance components (`LazyIframe`), lib (`siteConfig`, `getCanonicalUrl`)

---

## Resumo

| Arquivo | Linhas | Schema Principal | Componente Principal | Seção |
|---------|--------|-----------------|---------------------|-------|
| `blog-post-seo-example.js` | 242 | `ArticleSchema` | SEOHead + ImageOptimized + LazyIframe | Blog |
| `homepage-seo-example.js` | 61 | `OrganizationSchema`, `WebsiteSchema` | SEOHead + ImageOptimized + PreloadResources | Home |
| `musicas-seo-example.js` | 59 | `MusicSchema` | SEOHead + LazyIframe | Músicas |
| `videos-seo-example.js` | 65 | `VideoSchema` | SEOHead + LazyIframe | Vídeos |

**Padrão comum:** Todos os exemplos seguem o mesmo padrão arquitetural:
1. Import de `SEOHead` para meta tags
2. Import de `StructuredData` específico para o tipo de conteúdo
3. Componente de performance (`ImageOptimized` ou `LazyIframe`) para otimização de carregamento
4. URL canônica via `getCanonicalUrl`