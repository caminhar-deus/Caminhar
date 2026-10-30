# ADR-0032: Nome do site unificado no blog (settings do painel) e remoção do SEO morto

- **Status:** Aceito
- **Data:** 2026-10-30
- **Decisores:** dono do projeto (escopo aprovado na sessão)
- **Relacionados:** ADR-0031 (mesma sessão), `docs/ARQUITETURA_SITE_PUBLICO.md` §7 itens 14–15; arquivos: `pages/blog/index.js`, `pages/blog/[slug].js`, `pages/_document.js`, `lib/seo/config.js`, `pages/api/settings.js`

## Contexto

O nome do site tinha quatro fontes, com cobertura parcial:

| Fonte | Valor | Consumidores antes |
|---|---|---|
| `settings.site_title` (painel → banco) | configurável | home (`pages/index.js`) e título do próprio painel — **só** |
| `lib/seo/config.js` → `siteConfig.name` | hardcoded `'O Caminhar com Deus'` | blog `/blog` e `/blog/[slug]` (`<title>`, `og:site_name`) |
| Hardcoded nos arquivos do blog | mesma string | idem (antes do caso anterior) |
| Chave `site_name` (seed + fallback `DEFAULT_VALUES`) | `'Caminhar'` | **zero** consumidores de runtime |

Consequência: trocar o título no Cabeçalho do painel não afetava o blog — o `<title>` das páginas do blog e o `og:site_name` continuavam com o valor hardcoded. Além disso, `components/SEO/` (Head, StructuredData, index — 10 arquivos) **não tinha nenhum importador** (confirmado por grep em 2026-10-30; `_document.js` usa o Head nativo do Next), e as 8 funções utilitárias de `lib/seo/config.js` só eram usadas por esse diretório morto. O caso anterior (2026-10-30) já havia alinhado o fallback da API a `site_title` e removido o hardcoded do blog, deixando estas duas pendências registradas no doc público §7.

## Decisão

Vamos tornar `settings.site_title` a fonte do nome do site em **todo o site público que renderiza por request**, sem introduzir config de SEO assíncrona global:

- `pages/blog/index.js` e `pages/blog/[slug].js` passam a ler `site_title` no `getServerSideProps` via `getOrSetCache('settings:site_title', () => getSetting('site_title'), 7200)` — **a mesma chave de cache da API `/api/settings`**, que o PUT do painel invalida (`pages/api/settings.js:150`); o SSR reflete a troca sem esperar o TTL. Fallback em `siteConfig.name` quando o setting não existe/vem vazio.
- `pages/_document.js` permanece estático (`application-name`, `apple-mobile-web-app-title`, `canonical`, `lang`): `_document` renderiza uma vez, sem dados por request, e são metadados de app/PWA, não SEO de página — exceção registrada.
- `lib/seo/config.js` mantém `siteUrl` e `siteConfig` (usados por `_document.js` e como fallback do blog).
- Remoção do código morto: `components/SEO/` inteiro (10 arquivos) e as 8 funções utilitárias de `lib/seo/config.js` (`getCanonicalUrl`, `getImageUrl`, `formatSchemaDate`, `truncateDescription`, `extractKeywords`, `sanitizeJsonLd`, `shouldIndex`, `generateBreadcrumb`), com seus testes (9 arquivos de teste + snapshots; poda de `tests/unit/lib/seo/config.test.js`). Os 4 exemplos de uso do SEO Toolkit (`examples/*-seo-example.js`) foram removidos junto: documentavam componentes que deixaram de existir e ficariam com imports quebrados (não são referenciados por `package.json`/`jest.config`).

## Alternativas consideradas

- **Config de SEO assíncrona global** (um provider/camada que resolvesse settings para todos os componentes): descartada — custo desproporcional; os únicos pontos vivos por request eram os dois arquivos do blog, ambos com `getServerSideProps`.
- **Ler `site_title` no client (fetch na hidratação)**: descartada — causaria flash de título e atrasaria metadados sociais (`og:site_name`) que crawlers leem do HTML inicial.
- **Manter `components/SEO/` "para uso futuro"**: descartada — código sem importadores apodrece sem cobertura; o histórico fica no git se necessário.
- **Remover apenas `components/SEO/` e manter as funções de `lib/seo/config.js`**: descartada — ficariam sem consumidores (código morto com testes que dão falsa cobertura).

## Consequências

### Positivas

- Trocar o título no Cabeçalho do painel passa a refletir no blog (títulos e `og:site_name`) imediatamente após a invalidação de cache do PUT.
- Uma única fonte do nome do site em todo o conteúdo renderizado por request; `siteConfig.name` vira apenas fallback.
- ~19 arquivos mortos removidos (código + testes), reduzindo superfície de manutenção e ruído na suíte.

### Negativas e riscos

- `_document.js` continua com o nome estático para metadados de app/PWA — divergência residual aceita e documentada (o `<title>` de página e `og:site_name` não vêm dali).
- O blog agora depende de `lib/domain/settings` no SSR: se a tabela `settings` falhar, o `try/catch` do `getServerSideProps` responde `notFound`/`fetchError` — comportamento igual ao restante do SSR em falha de banco.
- Os testes antigos de tempos de render do blog não cobrem o valor do `<title>` (next/head não aplica head em teste) — a cobertura nova está nas props (`siteTitle`) do `getServerSideProps`.

## Revisão

Reavaliar se: (a) o site ganhar páginas públicas renderizadas estaticamente (`getStaticProps`) que exibam o nome do site — exigiria revalidação por webhook ou ISR; (b) o dono quiser também unificar os metadados de app do `_document.js` — exigiria mover essas metas para um Head por request; (c) novas funcionalidades de SEO (JSON-LD, sitemap) forem reintroduzidas — devem nascer lendo `settings`, não hardcoded.
