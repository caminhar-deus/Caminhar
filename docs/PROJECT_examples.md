# Análise da Pasta `/examples`

## Visão Geral

A pasta `/examples` contém **4 arquivos JavaScript** que funcionam como **documentação viva** e referência de implementação do SEO Toolkit do projeto. Cada arquivo demonstra, na prática, como aplicar componentes de SEO (meta tags), dados estruturados (JSON-LD / Schema.org) e otimizações de performance (imagens LCP, iframes com lazy loading, preload de recursos críticos) em páginas específicas do site.

**Características gerais:**

- Os arquivos **não são páginas executáveis** — são componentes React de demonstração que ilustram o padrão de uso esperado.
- Todos seguem o mesmo esqueleto arquitetural: `SEOHead` + schemas estruturados + componentes de performance + URL canônica + tratamento de erro com fallback visual.
- Todos documentam a origem esperada dos dados (props vindas de `getStaticProps`, `getServerSideProps` ou API).
- Todos aderem ao padrão ES Modules (`import`/`export`).
- Não existem subpastas, arquivos de configuração ou outros conteúdos além dos 4 arquivos analisados.

---

## Agrupamento por Contexto

| Contexto | Arquivos | Característica comum |
|---|---|---|
| **Páginas de conteúdo textual** | `blog-post-seo-example.js`, `homepage-seo-example.js` | Uso de `ImageOptimized` (foco em LCP), `OrganizationSchema` e monitoramento de performance |
| **Páginas de mídia** | `musicas-seo-example.js`, `videos-seo-example.js` | Uso de `LazyIframe` (Spotify/YouTube), `BreadcrumbSchema` e schema específico de mídia |

---

## 1. `blog-post-seo-example.js` — Página de Post do Blog

**Localização:** `/examples/blog-post-seo-example.js` (224 linhas)

**Propósito:** Exemplo mais completo e abrangente de implementação de SEO em uma página de post do blog. Serve como referência principal de boas práticas, pois integra todos os componentes de SEO, performance, acessibilidade e compartilhamento social disponíveis no projeto.

**Funcionalidades demonstradas:**

- **Meta tags avançadas:** `SEOHead` com título, descrição, imagem (via `getImageUrl`), tipo `article`, datas de publicação/atualização, autor, tags, keywords, URL canônica (via `getCanonicalUrl`), seção/categoria e locale `pt_BR`.
- **Dados estruturados (JSON-LD):** `ArticleSchema` (título, descrição, imagem, autor, URL do autor, datas, URL canônica, tags, categoria, contagem de palavras e corpo do artigo), `OrganizationSchema` e `BreadcrumbSchema` (somente JSON-LD, sem breadcrumb HTML redundante).
- **Imagem otimizada (LCP):** `ImageOptimized` com `critical`, `priority`, `placeholder="blur"` e `blurDataUrl` — com comentário de alerta sobre a necessidade de gerar o base64 real em produção.
- **Carregamento lazy de vídeo:** `LazyIframe` para YouTube com fallback para link direto caso o embed falhe.
- **Monitoramento de performance:** `usePerformance` via contexto (consome o `PerformanceProvider`).
- **Fallback de dados:** Dados mockados para ambiente de desenvolvimento quando a prop `post` não é fornecida (`initialPost || { ... }`).
- **Tratamento de erros:** Fallback visual para imagem quebrada (`onError` + estado `imageError`), embed de vídeo com falha (`onError` + estado `iframeError`) e dados ausentes (`post` nulo/indefinido, com link de retorno).
- **Microdados Schema.org inline:** `itemProp`, `itemScope` e `itemType` no HTML (`BlogPosting`, `Person`) para complementar o JSON-LD.
- **Compartilhamento social:** Links para Facebook, Twitter e WhatsApp com `aria-label`, `rel="noopener noreferrer"` e texto descritivo explícito ("Compartilhar no Facebook", etc.), usando a URL canônica como alvo.

**Dependências:** `components/SEO/Head` (`SEOHead`), `components/SEO/StructuredData` (`ArticleSchema`, `BreadcrumbSchema`, `OrganizationSchema`), `components/Performance` (`ImageOptimized`, `LazyIframe`), `lib/seo/config` (`siteConfig`, `getCanonicalUrl`, `getImageUrl`), `hooks` (`usePerformance`), `react` (`useState`).

**Observações técnicas:**

- O fallback de dados ausentes (`if (!post || !post.title)`) é **inalcançável na prática**, pois o mock (`initialPost || { ... }`) sempre preenche `post` com um objeto válido — o fallback só seria acionado se `initialPost` fosse um objeto sem `title`.
- O `blurDataUrl` contém um valor placeholder **inválido** (`/9j/4AAQSkZJRgABAQAAAQ...`) — o comentário no código alerta que não deve ser copiado para produção sem gerar o base64 correto via `plaiceholder` ou `next/blur`.
- As `keywords` são **estáticas** (`['fé cristã', 'espiritualidade', 'devocional']`), enquanto o post possui `tags` dinâmicas — em produção, keywords devem refletir o conteúdo real.
- A imagem da página usa `post.image_url` diretamente como `src`, enquanto o SEO/meta usa `imageUrl` (resultado de `getImageUrl(post.image_url)`) — há uma leve inconsistência entre o caminho bruto e o caminho tratado.
- O link HTML do autor usa `post.authorUrl` diretamente, enquanto o `ArticleSchema` concatena `${siteConfig.url}${post.authorUrl}` — caminhos com/ sem domínio completo em locais distintos.
- As tags são renderizadas com `key={index}` — aceitável em exemplo estático, mas não é a prática ideal para listas dinâmicas.
- O embed do YouTube usa `youtube.com` (não `youtube-nocookie.com`).

---

## 2. `homepage-seo-example.js` — Página Inicial (Home)

**Localização:** `/examples/homepage-seo-example.js` (75 linhas)

**Propósito:** Exemplo simplificado e enxuto de SEO para a página inicial do site. Demonstra a configuração essencial de SEO com foco em performance de carregamento inicial (preload de recursos críticos e imagem LCP).

**Funcionalidades demonstradas:**

- **Meta tags:** `SEOHead` com nome e descrição do site (via `siteConfig`).
- **Dados estruturados:** `OrganizationSchema` e `WebsiteSchema`.
- **Pré-carregamento de recursos críticos:** `PreloadResources` com imagens e domínios obtidos via `getCriticalResources('home')` (retorno documentado no cabeçalho: `{ images: string[], domains: string[] }`).
- **Imagem hero otimizada (LCP):** `ImageOptimized` com `fill`, `critical`, `priority` e `sizes="100vw"`.
- **Monitoramento de performance:** `usePerformance` via contexto.
- **Tratamento de erro:** Fallback visual para hero image não carregada (`onError` + estado `heroError`).

**Dependências:** `components/SEO/Head` (`SEOHead`), `components/SEO/StructuredData` (`OrganizationSchema`, `WebsiteSchema`), `components/Performance` (`ImageOptimized`, `PreloadResources`, `getCriticalResources`), `hooks` (`usePerformance`), `lib/seo/config` (`siteConfig`), `react` (`useState`).

**Observações técnicas:**

- É o exemplo mais direto, ideal para entender a configuração mínima de SEO.
- O caminho da hero image (`/hero-image.jpg`) é **hardcoded** — não passa por `getImageUrl` nem por `getCriticalResources` (que é usado apenas para o `PreloadResources`).
- Não possui fallback de dados para `siteConfig` indisponível — aceitável, pois configs de site são tipicamente injetadas em build time.

---

## 3. `musicas-seo-example.js` — Página de Música

**Localização:** `/examples/musicas-seo-example.js` (95 linhas)

**Propósito:** Exemplo de implementação de SEO específica para a seção de músicas, com foco no schema `MusicSchema` e integração com player de áudio do Spotify.

**Funcionalidades demonstradas:**

- **Meta tags:** `SEOHead` com tipo `music.song`, título composto (`título - artista`), descrição, imagem (capa) e tags incluindo o gênero.
- **Dados estruturados:** `MusicSchema` com título, artista, álbum, imagem, URL canônica, URL do áudio (Spotify), gênero, ID do Spotify e data de lançamento.
- **Navegação estrutural:** `BreadcrumbSchema` com links para listagem e música atual.
- **Player lazy loading:** `LazyIframe` para embed do Spotify com `aspectRatio="100/152"` e fallback para link direto (abertura no Spotify).
- **Tratamento de erro:** Fallback visual para dados ausentes (`musica` nulo/indefinido) e para embed do Spotify não carregado.

**Dependências:** `components/SEO/Head` (`SEOHead`), `components/SEO/StructuredData` (`MusicSchema`, `BreadcrumbSchema`), `components/Performance` (`LazyIframe`), `lib/seo/config` (`getCanonicalUrl`), `react` (`useState`).

**Observações técnicas:**

- A prop `musica` é esperada de `getServerSideProps` ou de uma API (documentado no cabeçalho com exemplo de código).
- **Ponto de atenção (bug latente):** o acesso a `musica.id` na construção da URL canônica (linha 20) ocorre **antes** da verificação `if (!musica || !musica.titulo)` (linha 26). Se a prop não for fornecida, o fallback de "dados ausentes" nunca é alcançado — um `TypeError` é lançado antes.
- **Não possui** fallback de dados mockados para desenvolvimento (diferente do `blog-post-seo-example.js`).
- **Não utiliza** monitoramento de performance (`usePerformance`).

---

## 4. `videos-seo-example.js` — Página de Vídeo

**Localização:** `/examples/videos-seo-example.js` (99 linhas)

**Propósito:** Exemplo de implementação de SEO para a seção de vídeos, com foco no schema `VideoSchema` e integração com player do YouTube.

**Funcionalidades demonstradas:**

- **Meta tags:** `SEOHead` com tipo `video.other`, título, descrição, imagem (thumbnail) e tags.
- **Dados estruturados:** `VideoSchema` com título, descrição, thumbnail, URL canônica, embed URL, data de publicação, canal/autor, tags, ID do YouTube e contagem de visualizações.
- **Navegação estrutural:** `BreadcrumbSchema` com links para listagem e vídeo atual.
- **Player lazy loading:** `LazyIframe` para embed do YouTube com fallback para link direto (abertura no YouTube).
- **Metadados do vídeo:** Exibição de canal, data de publicação e contagem de visualizações formatada com locale `pt-BR` (`view_count?.toLocaleString('pt-BR')`).
- **Tratamento de erro:** Fallback visual para dados ausentes (`video` nulo/indefinido) e para embed do YouTube não carregado.

**Dependências:** `components/SEO/Head` (`SEOHead`), `components/SEO/StructuredData` (`VideoSchema`, `BreadcrumbSchema`), `components/Performance` (`LazyIframe`), `lib/seo/config` (`getCanonicalUrl`), `react` (`useState`).

**Observações técnicas:**

- A prop `video` é esperada de `getServerSideProps` ou de uma API (documentado no cabeçalho com exemplo de código).
- **Ponto de atenção (bug latente):** o acesso a `video.id` na construção da URL canônica (linha 20) ocorre **antes** da verificação `if (!video || !video.titulo)` (linha 26). Mesmo problema do `musicas-seo-example.js`.
- O embed usa `youtube.com` (não `youtube-nocookie.com`), sem comentário sobre implicações de privacidade.
- **Não possui** fallback de dados mockados para desenvolvimento.
- **Não utiliza** monitoramento de performance (`usePerformance`).

---

## Análise Consolidada

### Padrão Arquitetural Comum

Todos os exemplos seguem a mesma estrutura:

1. **Imports** — `SEOHead`, componentes de `StructuredData` específicos, componentes de Performance, utilitários de SEO (`getCanonicalUrl`, `siteConfig`, `getImageUrl`), hooks e `useState`.
2. **Função do componente** — recebe dados via props (`{ post }`, `{ video }`, `{ musica }`).
3. **URL canônica** — construída via `getCanonicalUrl()`.
4. **Estados de erro** — `useState(false)` para imagem, iframe, etc.
5. **Renderização condicional (dados ausentes)** — fallback visual com mensagem e link de retorno (exceto homepage).
6. **JSX principal** — `SEOHead` + `Schemas` + conteúdo da página + componentes de performance.
7. **Tratamento de erro em componentes** — `onError` + fallback visual.

### Comparativo de Recursos

| Funcionalidade | blog-post | homepage | musicas | videos |
|---|---|---|---|---|
| Meta tags (SEOHead) | ✅ Completo | ✅ Básico | ✅ Específico | ✅ Específico |
| ArticleSchema | ✅ | — | — | — |
| MusicSchema | — | — | ✅ | — |
| VideoSchema | — | — | — | ✅ |
| OrganizationSchema | ✅ | ✅ | — | — |
| WebsiteSchema | — | ✅ | — | — |
| BreadcrumbSchema | ✅ | — | ✅ | ✅ |
| ImageOptimized | ✅ | ✅ | — | — |
| LazyIframe | ✅ (YouTube) | — | ✅ (Spotify) | ✅ (YouTube) |
| PreloadResources | — | ✅ | — | — |
| Monitoramento de performance (`usePerformance`) | ✅ | ✅ | — | — |
| Dados mockados (fallback dev) | ✅ | — | ⚠️ Ausente | ⚠️ Ausente |
| Microdados Schema.org inline | ✅ | — | — | — |
| Botões de compartilhamento | ✅ | — | — | — |
| Tratamento de erro (dados) | ✅ | — | ✅* | ✅* |
| Tratamento de erro (embed) | ✅ | — | ✅ | ✅ |
| Tratamento de erro (imagem) | ✅ | ✅ | — | — |

*\* Em `musicas`/`videos`, o fallback de dados ausentes é ineficaz devido ao acesso a `id` antes da validação de nulidade (ver observações técnicas).*

### Dependências Compartilhadas

- **Todos os arquivos:** `components/SEO/Head` (`SEOHead`), `components/SEO/StructuredData` (schemas específicos), `react` (`useState`).
- **`lib/seo/config`:** `siteConfig` (blog-post, homepage), `getCanonicalUrl` (blog-post, musicas, videos), `getImageUrl` (apenas blog-post).
- **`components/Performance`:** `LazyIframe` (blog-post, musicas, videos), `ImageOptimized` (blog-post, homepage), `PreloadResources`/`getCriticalResources` (apenas homepage).
- **`hooks`:** `usePerformance` (blog-post, homepage).

### Relação com a Pasta `/tests/examples`

A pasta `tests/examples/` (`component-example.test.js` e `simple-test.test.js`) contém **exemplos genéricos de como escrever testes** (demonstração da arquitetura de factories, helpers, mocks e matchers), e **não** contém testes automatizados específicos para os arquivos de `/examples`. Ou seja, os exemplos de SEO do projeto **não possuem cobertura de testes** atualmente.

### Arquivos Irrelevantes

Não há. Todos os 4 arquivos são relevantes e cumprem função de documentação viva do SEO Toolkit. Não existem subpastas ou arquivos de apoio na pasta `/examples`.

---

## Verificação de Duplicidades

- O documento anterior de `/docs/antigos/PROJECT_examples.md` foi consolidado nesta versão, com correções de contagem de linhas (blog-post: 237→224; homepage: 77→75) e correção da nomenclatura do hook (`usePerformanceMetrics` → `usePerformance`, conforme o barrel `hooks/index.js`).
- As informações equivalentes entre arquivos (padrão de imports, estrutura de fallback, uso de `getCanonicalUrl`) foram agrupadas na seção "Análise Consolidada" para evitar repetição.