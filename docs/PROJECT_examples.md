# Análise da Pasta `/examples`

## Visão Geral

A pasta `/examples` contém **4 arquivos** que funcionam como documentação viva e referência de implementação para o SEO Toolkit do projeto. Cada arquivo demonstra, na prática, como aplicar os componentes de SEO, dados estruturados (JSON-LD) e otimizações de performance em páginas específicas do site.

Os exemplos não são páginas executáveis diretamente — são componentes React que ilustram o padrão de uso esperado, incluindo tratamento de erros, fallbacks visuais e boas práticas de acessibilidade.

---

## Arquivos

### 1. `blog-post-seo-example.js`

**Localização:** `/examples/blog-post-seo-example.js` (237 linhas)

**Propósito:** Exemplo mais completo e abrangente de implementação de SEO em uma página de post do blog. Serve como referência principal de boas práticas, pois integra todos os componentes de SEO, performance e acessibilidade disponíveis no projeto.

**Funcionalidades demonstradas:**

- **Meta tags avançadas:** `SEOHead` com título, descrição, imagem, tipo `article`, autor, tags, palavras-chave, URL canônica, locale `pt_BR` e seção/categoria.
- **Dados estruturados (JSON-LD):** `ArticleSchema` (com título, descrição, imagem, autor, datas de publicação/atualização, tags, categoria, contagem de palavras e corpo do artigo), `OrganizationSchema` e `BreadcrumbSchema`.
- **Imagem otimizada (LCP):** `ImageOptimized` com `critical={true}`, `priority={true}`, `placeholder="blur"` e `blurDataUrl` (com alerta sobre geração em produção).
- **Carregamento lazy de vídeo:** `LazyIframe` para YouTube com fallback para link direto caso o embed falhe.
- **Monitoramento de performance:** `usePerformance` via contexto (consome o `PerformanceProvider` de `_app.js`).
- **Fallback de dados:** Dados mockados para ambiente de desenvolvimento quando a prop `post` não é fornecida.
- **Tratamento de erros:** Fallback visual para imagem quebrada (`onError` + estado `imageError`), embed de vídeo com falha (`onError` + estado `iframeError`) e dados ausentes (`post` nulo/indefinido).
- **Microdados Schema.org inline:** `itemProp`, `itemScope` e `itemType` no HTML para complementar o JSON-LD.
- **Compartilhamento social:** Links para Facebook, Twitter e WhatsApp com `aria-label`, `rel="noopener noreferrer"` e texto descritivo explícito.

**Observações técnicas:**
- O `blurDataUrl` contém um valor placeholder (`/9j/4AAQSkZJRgABAQAAAQ...`). O comentário no código alerta que esse valor **não deve ser copiado para produção** sem gerar o base64 correto via `plaiceholder` ou `next/blur`.
- As palavras-chave em `keywords` são estáticas (`['fé cristã', 'espiritualidade', 'devocional']`) e poderiam ser dinâmicas a partir das `tags` do post.

---

### 2. `homepage-seo-example.js`

**Localização:** `/examples/homepage-seo-example.js` (77 linhas)

**Propósito:** Exemplo simplificado de SEO para a página inicial do site. Demonstra a configuração essencial de SEO com foco em performance de carregamento inicial.

**Funcionalidades demonstradas:**

- **Meta tags:** `SEOHead` com nome e descrição do site (via `siteConfig`).
- **Dados estruturados:** `OrganizationSchema` e `WebsiteSchema` para dados organizacionais e do site.
- **Pré-carregamento de recursos críticos:** `PreloadResources` com imagens e domínios obtidos via `getCriticalResources('home')`.
- **Imagem hero otimizada (LCP):** `ImageOptimized` com `fill`, `critical={true}`, `priority={true}` e `sizes="100vw"`.
- **Monitoramento de performance:** `usePerformance` via contexto (consome o `PerformanceProvider` de `_app.js`).
- **Tratamento de erro:** Fallback visual para hero image não carregada (`onError` + estado `heroError`).

**Observações técnicas:**
- É o exemplo mais enxuto e direto, ideal para entender a configuração mínima de SEO.
- A função `getCriticalResources('home')` é documentada no cabeçalho do arquivo: retorna `{ images: string[], domains: string[] }`.

---

### 3. `musicas-seo-example.js`

**Localização:** `/examples/musicas-seo-example.js` (95 linhas)

**Propósito:** Exemplo de implementação de SEO específica para a seção de músicas, com foco no schema `MusicSchema` e integração com player do Spotify.

**Funcionalidades demonstradas:**

- **Meta tags:** `SEOHead` com tipo `music.song`, título composto (`título - artista`), descrição, imagem (capa), tags incluindo o gênero.
- **Dados estruturados:** `MusicSchema` com título, artista, álbum, imagem, URL canônica, URL do áudio (Spotify), gênero, ID do Spotify e data de lançamento.
- **Navegação estrutural:** `BreadcrumbSchema` com links para listagem e música atual.
- **Player lazy loading:** `LazyIframe` para embed do Spotify com fallback para link direto (abertura no Spotify).
- **Tratamento de erro:** Fallback visual para dados ausentes (`musica` nulo/indefinido) com link de retorno, e fallback para embed do Spotify não carregado com link direto.

**Observações técnicas:**
- A prop `musica` é esperada de `getServerSideProps` ou de uma API.
- O `aspectRatio` do LazyIframe é configurado como `"100/152"` para o formato do embed do Spotify.
- Diferente do `blog-post-seo-example.js`, **não possui** dados mockados de fallback nem monitoramento de performance (`usePerformanceMetrics`).

---

### 4. `videos-seo-example.js`

**Localização:** `/examples/videos-seo-example.js` (99 linhas)

**Propósito:** Exemplo de implementação de SEO para a seção de vídeos, com foco no schema `VideoSchema` e integração com player do YouTube.

**Funcionalidades demonstradas:**

- **Meta tags:** `SEOHead` com tipo `video.other`, título, descrição, imagem (thumbnail) e tags.
- **Dados estruturados:** `VideoSchema` com título, descrição, thumbnail, URL canônica, embed URL, data de publicação, canal/autor, tags, ID do YouTube e contagem de visualizações.
- **Navegação estrutural:** `BreadcrumbSchema` com links para listagem e vídeo atual.
- **Player lazy loading:** `LazyIframe` para embed do YouTube com fallback para link direto (abertura no YouTube).
- **Metadados do vídeo:** Exibição de canal, data de publicação e contagem de visualizações formatada com locale `pt-BR`.
- **Tratamento de erro:** Fallback visual para dados ausentes (`video` nulo/indefinido) com link de retorno, e fallback para embed do YouTube não carregado com link direto.

**Observações técnicas:**
- A prop `video` é esperada de `getServerSideProps` ou de uma API.
- A URL do embed usa o domínio `youtube.com` (não `youtube-nocookie.com`), que é o padrão.
- Diferente do `blog-post-seo-example.js`, **não possui** dados mockados de fallback nem monitoramento de performance (`usePerformanceMetrics`).

---

## Análise Consolidada

### Padrão Arquitetural Comum

Todos os exemplos seguem a mesma estrutura:

1. **Imports** — `SEOHead`, componentes de `StructuredData` específicos, componentes de Performance, utilitários de SEO (`getCanonicalUrl`, `siteConfig`), hooks e `useState`.
2. **Função do componente** — recebe dados via props (ex.: `{ post }`, `{ video }`, `{ musica }`).
3. **URL canônica** — construída via `getCanonicalUrl()`.
4. **Estados de erro** — `useState(false)` para imagem, iframe, etc.
5. **Renderização condicional (dados ausentes)** — fallback visual com mensagem e link de retorno.
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
| usePerformanceMetrics | ✅ | ✅ | — | — |
| Dados mockados (fallback) | ✅ | — | ⚠️ Ausente | ⚠️ Ausente |
| Microdados Schema.org inline | ✅ | — | — | — |
| Botões de compartilhamento | ✅ | — | — | — |
| Tratamento de erro (dados) | ✅ | — | ✅ | ✅ |
| Tratamento de erro (embed) | ✅ | — | ✅ | ✅ |
| Tratamento de erro (imagem) | ✅ | ✅ | — | — |

### Agrupamento por Contexto

| Contexto | Arquivos |
|---|---|
| **Páginas de conteúdo textual** | `blog-post-seo-example.js`, `homepage-seo-example.js` |
| **Páginas de mídia** | `musicas-seo-example.js`, `videos-seo-example.js` |

### Dependências Compartilhadas

Todos os exemplos dependem de:

- `components/SEO/Head` (`SEOHead`)
- `components/SEO/StructuredData` (schemas específicos)
- `lib/seo/config` — `siteConfig` (blog-post, homepage), `getCanonicalUrl` (blog-post, musicas, videos), `getImageUrl` (apenas blog-post)
- `components/Performance/LazyIframe` (exceto homepage)
- `react` (`useState`)

### Arquivos Inexistentes

Não há outros arquivos na pasta `/examples` além dos 4 analisados. Não há subpastas, arquivos de configuração, dados mockados avulsos ou documentação adicional.