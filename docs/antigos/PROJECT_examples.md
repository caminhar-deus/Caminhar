# Análise da Pasta `/examples`

## Visão Geral

A pasta `/examples` contém 4 arquivos de exemplo que demonstram a implementação de SEO (Search Engine Optimization) utilizando componentes do projeto. Servem como documentação viva e referência de boas práticas para desenvolvedores.

---

## 1. `blog-post-seo-example.js`

**Localização:** `/examples/blog-post-seo-example.js`

**Tamanho:** ~203 linhas

**Propósito:** Exemplo completo e detalhado de implementação de SEO em uma página de post do blog. Demonstra o uso integrado de todos os componentes principais de SEO do projeto.

**O que faz:**
- Configura meta tags via `SEOHead` (título, descrição, imagem, tipo article, autor, tags, keywords)
- Aplica Structured Data com schemas: `ArticleSchema`, `OrganizationSchema`, `BreadcrumbSchema` (apenas JSON-LD, sem breadcrumb HTML redundante)
- Utiliza `ImageOptimized` para imagem principal com foco em LCP (Largest Contentful Paint), com fallback em caso de erro de carregamento
- Emprega `LazyIframe` para carregamento sob demanda de vídeo do YouTube, com fallback com link direto
- Implementa monitoramento de performance via `usePerformanceMetrics`
- Inclui botões de compartilhamento social com texto descritivo (Compartilhar no Facebook, etc.)
- Recebe dados via prop `post` (getStaticProps / getServerSideProps), com fallback para dados mockados em desenvolvimento
- Tratamento de erros: fallback visual para imagem quebrada, iframe não carregado e dados ausentes

**Dependências:** SEO components (`Head`, `StructuredData`), Performance components (`ImageOptimized`, `LazyIframe`), hooks (`usePerformanceMetrics`), lib (`siteConfig`, `getCanonicalUrl`, `getImageUrl`)

---

## 2. `homepage-seo-example.js`

**Localização:** `/examples/homepage-seo-example.js`

**Tamanho:** ~72 linhas

**Propósito:** Exemplo simplificado de SEO para a página inicial (home) do site. Demonstra a implementação básica e essencial de SEO.

**O que faz:**
- Configura meta tags via `SEOHead` com nome e descrição do site
- Aplica Structured Data com `OrganizationSchema` e `WebsiteSchema`
- Utiliza `ImageOptimized` para hero image com flag critical/priority (foco em LCP), com fallback em caso de erro
- Emprega `PreloadResources` para carregamento antecipado de recursos críticos
- Implementa monitoramento de performance via `usePerformanceMetrics`
- Obtém recursos críticos via `getCriticalResources('home')`
- Tratamento de erro: fallback visual para hero image não carregada
- Inclui documentação sobre o formato esperado do retorno de `getCriticalResources`

**Dependências:** SEO components (`Head`, `StructuredData`), Performance components (`ImageOptimized`, `PreloadResources`, `getCriticalResources`), hooks (`usePerformanceMetrics`), lib (`siteConfig`)

---

## 3. `musicas-seo-example.js`

**Localização:** `/examples/musicas-seo-example.js`

**Tamanho:** ~84 linhas

**Propósito:** Exemplo de implementação de SEO específico para a seção de músicas do site, utilizando o schema `MusicSchema` para dados estruturados de música.

**O que faz:**
- Configura meta tags via `SEOHead` com tipo `music.song`
- Aplica Structured Data com `MusicSchema` (título, artista, álbum, gênero, Spotify ID, data de lançamento)
- Aplica `BreadcrumbSchema` para navegação estrutural
- Utiliza `LazyIframe` para embed do Spotify com carregamento lazy, com fallback para link direto
- Constrói URL canônica via `getCanonicalUrl`
- Inclui comentário sobre a origem esperada da prop `musica` (getServerSideProps / API)
- Tratamento de erro: fallback visual para dados ausentes e embed do Spotify não carregado

**Dependências:** SEO components (`Head`, `StructuredData`), Performance components (`LazyIframe`), lib (`siteConfig`, `getCanonicalUrl`)

---

## 4. `videos-seo-example.js`

**Localização:** `/examples/videos-seo-example.js`

**Tamanho:** ~90 linhas

**Propósito:** Exemplo de implementação de SEO para a seção de vídeos, utilizando o schema `VideoSchema` para dados estruturados de vídeo.

**O que faz:**
- Configura meta tags via `SEOHead` com tipo `video.other`
- Aplica Structured Data com `VideoSchema` (título, descrição, thumbnail, embed URL, upload date, canal, visualizações)
- Aplica `BreadcrumbSchema` para navegação estrutural
- Utiliza `LazyIframe` para embed do YouTube com carregamento lazy, com fallback para link direto
- Constrói URL canônica via `getCanonicalUrl`
- Inclui comentário sobre a origem esperada da prop `video` (getServerSideProps / API)
- Tratamento de erro: fallback visual para dados ausentes e embed do YouTube não carregado

**Dependências:** SEO components (`Head`, `StructuredData`), Performance components (`LazyIframe`), lib (`siteConfig`, `getCanonicalUrl`)

---

## Resumo

| Arquivo | Linhas | Schema Principal | Componente Principal | Seção |
|---------|--------|-----------------|---------------------|-------|
| `blog-post-seo-example.js` | ~203 | `ArticleSchema` | SEOHead + ImageOptimized + LazyIframe | Blog |
| `homepage-seo-example.js` | ~72 | `OrganizationSchema`, `WebsiteSchema` | SEOHead + ImageOptimized + PreloadResources | Home |
| `musicas-seo-example.js` | ~84 | `MusicSchema` | SEOHead + LazyIframe | Músicas |
| `videos-seo-example.js` | ~90 | `VideoSchema` | SEOHead + LazyIframe | Vídeos |

**Padrão comum:** Todos os exemplos seguem o mesmo padrão arquitetural:
1. Import de `SEOHead` para meta tags
2. Import de `StructuredData` específico para o tipo de conteúdo
3. Componente de performance (`ImageOptimized` ou `LazyIframe`) para otimização de carregamento
4. URL canônica via `getCanonicalUrl`
5. Tratamento de erro com fallback visual para dados ausentes e falhas de componentes
6. Comentário sobre a origem esperada dos dados (props de data-fetching do Next.js ou API)