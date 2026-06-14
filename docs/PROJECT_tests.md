# Análise do Projeto — Testes (`/tests/`)

> **Data:** 13/05/2026 (atualizado em 14/06/2026 — 37ª revisão)
> **Objetivo:** Documentar de forma objetiva, clara e focada todos os arquivos de teste do projeto, descrevendo localização, propósito e funcionalidade de cada um.

---

## Sumário

1. [Estrutura Geral](#1-estrutura-geral)
2. [Configuração Global](#2-configuração-global)
3. [Infraestrutura de Testes](#3-infraestrutura-de-testes)
4. [Testes de Integração](#4-testes-de-integração)
5. [Testes Unitários](#5-testes-unitários)
6. [Resumo Quantitativo](#6-resumo-quantitativo)

---

## 1. Estrutura Geral

```
tests/
├── setup.js                          # Bootstrap global de testes (jsdom)
├── setup.db.js                       # Bootstrap específico para testes com banco real (node)
├── global-setup.db.js                # GlobalSetup: container PostgreSQL (Testcontainers)
├── examples/                         # Exemplos/demonstração da arquitetura
├── factories/                        # Fábricas de dados de teste
├── helpers/                          # Utilitários auxiliares
├── matchers/                         # Matchers customizados Jest
├── mocks/                            # Mocks globais reutilizáveis
├── integration/                      # Testes de integração
│   ├── domain/                       #   Testes com PostgreSQL real (*.db.test.js)
│   ├── *.test.js                     #   Fluxos CRUD principais
│   ├── api/                          #   Testes de API endpoints
│   │   ├── *.test.js
│   │   ├── admin/                    #     Endpoints administrativos
│   │   └── auth/                     #     Endpoints de autenticação
│   └── auth/                         #   Testes de autenticação v1
└── unit/                             # Testes unitários
    ├── *.test.js                     #   Testes de páginas e utilitários
    ├── components/                   #   Testes de componentes React
    │   ├── Admin/                    #     Componentes administrativos
    │   └── Features/                 #     Componentes de funcionalidades
    ├── domain/                       #   Testes de lógica de domínio
    ├── lib/                          #   Testes de bibliotecas
    ├── pages/                        #   Testes de páginas (API routes)
    └── scripts/                      #   Testes de scripts utilitários
```

---

## 2. Configuração Global

### `tests/setup.js`
**Localização:** `/tests/setup.js`
**Propósito:** Bootstrap central executado antes de todos os testes (ambiente jsdom). Configura polyfills (TextEncoder, ReadableStream, Request/Response, localStorage, matchMedia, IntersectionObserver, ResizeObserver, crypto.randomUUID), React Testing Library (timeout 5s), filtro de warnings conhecidos do console.error, cleanup automático pós-teste (`afterEach` com `cleanup()` e `jest.clearAllMocks()`), e utilitários globais (`global.wait()`, `global.suppressWarnings()`). Importa os matchers customizados.

### `tests/setup.db.js`
**Localização:** `/tests/setup.db.js`
**Propósito:** Bootstrap específico para testes de integração com banco real (ambiente node). Versão enxuta sem polyfills DOM. Inclui apenas polyfills de ReadableStream e MessageChannel (necessários para testcontainers), filtro de console.error para warnings conhecidos da API, matchers customizados e `afterEach` com `jest.clearAllMocks()`. **Criado em 06/06/2026.**

### `jest.config.db.js`
**Localização:** `/jest.config.db.js`
**Propósito:** Configuração Jest dedicada para testes de integração com banco PostgreSQL real via Testcontainers. Usa ambiente `node` (não jsdom), `testMatch: **/*.db.test.js`, timeout 30s, `maxWorkers: 1`. **Criado em 06/06/2026.**

### `tests/global-setup.db.js`
**Localização:** `/tests/global-setup.db.js`
**Propósito:** GlobalSetup para testes com banco real. Inicializa container PostgreSQL via Testcontainers com `.withReuse(true)`. **Criado em 06/06/2026.**

### `jest.teardown.js`
**Localização:** `/jest.teardown.js`
**Propósito:** GlobalTeardown executado após todos os testes. Fecha conexões Redis e PostgreSQL. **Estendido em 06/06/2026.**

---

## 3. Infraestrutura de Testes

### 3.1 Factories (`/tests/factories/`)
`base.js` | `index.js` | `post.js` | `music.js` | `video.js` | `user.js`

### 3.2 Helpers (`/tests/helpers/`)
`index.js` | `api.js` | `auth.js` | `console.js` | `crud-test.js` | `db-test.js` | `render.js`

### 3.3 Matchers Customizados (`/tests/matchers/`)
`index.js` | `toBeISODate.js` | `toBeValidJSON.js` | `toHaveHeader.js` | `toHaveProperties.js` | `toHaveStatus.js`

### 3.4 Mocks (`/tests/mocks/`)
`index.js` | `auth.js` | `cache.js` | `db.js` | `db-module.js` | `fetch.js` | `next.js` | `next-setup.js` | `next.test.js`

### 3.5 Examples (`/tests/examples/`)
`simple-test.test.js` | `component-example.test.js`

---

## 4. Testes de Integração

### 4.1 Fluxos CRUD Principais (consolidados em `/tests/integration/api/`)

**Nota (06/06/2026):** Os arquivos de fluxo foram movidos da raiz `tests/integration/` para `tests/integration/api/` e renomeados para dot notation.

### 4.2 API Endpoints (`/tests/integration/api/`)
34 arquivos cobrindo CRUD de posts, músicas, vídeos, produtos, configurações, auditoria, login, status, upload de imagem e placeholder.

| Arquivo | Propósito | Cenários |
|---------|-----------|----------|
| `placeholder-image.test.js` | Imagem de placeholder (hero/banner) | Retornar imagem do banco (200 + `image/jpeg`); fallback com erro no banco lendo diretório (200 + `image/webp`); fallback SVG padrão sem configuração (200 + `image/svg+xml`). **Corrigido em 14/06/2026** — mock do `getSetting` apontava para `lib/db.js` em vez de `lib/domain/settings.js` |

### 4.3 API Administrativa (`/tests/integration/api/admin/`)
14 arquivos cobrindo CRUD admin, backup, cache, fetch externo, rate limit, roles e usuários.

### 4.4 Autenticação (`/tests/integration/api/auth/`)
3 arquivos: `auth/login.test.js`, `auth/logout.test.js`, `auth/check.test.js`

### 4.5 API Versão 1 — **DIRETÓRIO REMOVIDO (13/05/2026)**

---

## 5. Testes Unitários

### 5.1 Páginas e Utilitários (`/tests/unit/` — raiz)
`[slug].test.js` | `clean-test-db.test.js` | `index.test.js` | `settings.cache.test.js` | `videos.validation.test.js`

### 5.2 Componentes de Admin (`/tests/unit/components/Admin/`)
20 arquivos cobrindo AdminCrudBase, AdminDashboard, CRUDs específicos, campos de formulário, HOC de autenticação, Managers (Backup, Cache) e Tools (IntegrityCheck, RateLimitViewer).

### 5.3 Componentes de Funcionalidades (`/tests/unit/components/Features/`)
13 arquivos cobrindo Blog, ContentTabs, Music, Products, Testimonials e Video.

### 5.4 Componentes de Layout (`/tests/unit/components/Layout/`)
5 arquivos: `Container.test.js`, `Grid.test.js`, `index.test.js`, `Sidebar.test.js`, `Stack.test.js`

### 5.5 Componentes de Performance (`/tests/unit/components/Performance/`)
5 arquivos: `CriticalCSS.test.js`, `ImageOptimized.test.js`, `index.test.js`, `LazyIframe.test.js`, `PreloadResources.test.js`

### 5.6 Componentes de Produtos (`/tests/unit/components/Products/`)
2 arquivos: `ProductCard.test.js`, `ProductList.test.js`

### 5.7 Componentes de SEO (`/tests/unit/components/SEO/`)
8 arquivos: Schema.org Article/Breadcrumb/Music/Organization/Video/Website + Head + barrel

### 5.8 Componentes de UI (`/tests/unit/components/UI/`)
12 arquivos: Alert, Badge, Button, Card, Input, Modal, Select, Spinner, TextArea, Toast + barrel

### 5.9 Domínio (`/tests/unit/domain/`)
`posts.test.js` | `settings.test.js` | `videos.test.js`

### 5.10 Lib (`/tests/unit/lib/`)
`auth.test.js` | `cache.test.js` | `crud.test.js` | `db.test.js` | `middleware.test.js` | `redis.test.js`

#### Lib/API (`/tests/unit/lib/api/`)
`errors.test.js` | `index.test.js` | `middleware.test.js` | `response.test.js` | `validate.test.js`

#### Lib/Backup (`/tests/unit/lib/backup/`)
`backup.available.test.js` | `backup.cleanup.test.js` | `backup.logs.test.js` | `backup.operations.test.js`

#### Lib/DB (`/tests/unit/lib/db/`)
`createPost.test.js` | `deletePost.test.js` | `getAllPosts.test.js` | `getPaginatedPosts.test.js` | `musicas.test.js` | `settings.test.js` | `updatePost.test.js`

### 5.11 Scripts (`/tests/unit/scripts/`)

| Arquivo | Propósito | Cenários Principais |
|---------|-----------|---------------------|
| `clean-orphaned-images.test.js` | Limpeza de imagens órfãs | Identificar imagens não referenciadas, exclusão segura, dry-run |
| `cleanup.test.js` | Módulo compartilhado `scripts/utils/cleanup.js` | `loadEnv()` — carregar `.env.local` se existir, pular `.env.local` se não existir e carregar `.env`. **Criado em 13/06/2026 — 2 testes** |
| `init-table.test.js` | Utilitários de schema de tabelas (`init-table-utils.js`) | `buildCreateTableSQL`, `getSeedValues`, `buildSeedSQL`, `getTableName`. **Reescrito em 11/06/2026 — 9 testes** |
| `migrate.test.js` | Gerenciador de migrações (`migrate.js`) | `listMigrationFiles` (ordenar por prefixo, rejeitar padrão inválido), `migrationNameFromFile`, `ensureMigrationTable` (CREATE TABLE IF NOT EXISTS), `getAppliedMigrations` (Set com nomes). **Reescrito em 13/06/2026 — 5 testes** |
| `validate-schema.test.js` | Validação de schema do banco PostgreSQL | Exportação da função `validateSchema`, validação com tabelas existentes (SELECT 1 + information_schema), erro de conexão retornando `false`. **Ajustado em 11/06/2026 — 3 testes** |

### 5.12 Pages/API Edge Cases (`/tests/unit/pages/api/`)
9 arquivos cobrindo edge cases de upload, admin (dicas, fetch-ml, fetch-spotify, posts, rate-limit, roles, stats) e auth (login).

---

## 6. Resumo Quantitativo

| Categoria | Quantidade |
|-----------|:----------:|
| **Configuração Global** | 5 arquivos |
| **Factories** | 5 arquivos |
| **Helpers** | 5 arquivos |
| **Matchers** | 6 arquivos |
| **Mocks** | 8 arquivos |
| **Examples** | 2 arquivos |
| **Testes de Integração** | 34 arquivos |
| **Testes Unitários** | ~96 arquivos |
| **Total Aproximado** | **~155 arquivos** |

---

> **Nota atualizada (14/06/2026 — 37ª revisão):** Este documento reflete a estrutura completa de testes do projeto Caminhar.

> **Ajustes realizados na 28ª revisão (13/06/2026):**
> - **Testes do `CriticalCSS.test.js` corrigidos (6/6 testes passando)**: dois testes falhavam por divergirem do comportamento real do componente. (1) Teste "deve retornar null se a prop css não for fornecida" — renomeado para "deve renderizar o CSS crítico padrão quando a prop css não for fornecida" e ajustado para verificar que o componente renderiza o CSS padrão (fallback intencional) em vez de `null`. (2) Teste "removeCriticalCSS: deve remover a tag style do DOM se ela existir" — renomeado para "removeCriticalCSS: deve remover a tag style do DOM se o CSS principal estiver carregado" e ajustado para simular uma stylesheet externa no `document.styleSheets`, satisfazendo a pré-condição da função que só remove o CSS crítico quando detecta CSS principal carregado (proteção de fallback). Nenhuma alteração no componente de produção. **Total:** 1 arquivo modificado. Nenhuma regressão.
> - **Testes do `migrate.js` reescritos**: o erro `TypeError: fsMock.existsSync.mockReturnValue is not a function` ocorria porque o teste mockava o módulo `fs` (síncrono) com `existsSync`/`readdirSync`, enquanto `migrate.js` importa `fs/promises`. Além disso, a IIFE do `migrate.js` executava migrações reais do disco durante os testes. Correções: (1) `scripts/migrate.js` refatorado — todas as funções internas exportadas, IIFE movida para `run()` com CLI guard (`isMainModule`), alterado `import fs from 'fs/promises'` para `import fs from 'fs'` com `fs.promises.*`; (2) `tests/unit/scripts/migrate.test.js` reescrito — mocka `fs` via `jest.mock` com `promises: { readdir, access }`, mocka `pg` via `jest.unstable_mockModule` com pool mockado, testa funções exportadas diretamente. **5/5 testes passando.**
> - Adicionada entrada `migrate.test.js` na tabela da Seção 5.11.
> - **Total:** 3 arquivos modificados nesta data. Nenhuma regressão.


> **Ajustes realizados na 29ª revisão (13/06/2026):**
> - **Testes de busca alinhados à implementação `ILIKE` (19/19 testes passando)**: o helper `shared-pagination.js` usa o operador PostgreSQL `ILIKE` (case-insensitive nativo) em vez de `LOWER(coluna) LIKE`. Três arquivos de teste esperavam a sintaxe antiga. Correções: (1) `tests/unit/lib/db/getPaginatedPosts.test.js` — string esperada atualizada de `LOWER(title) LIKE` para `title ILIKE` e parâmetro de busca ajustado para manter o casing original; (2) `tests/unit/domain/videos.test.js` — 4 correções: `LOWER(titulo)` → `titulo ILIKE`, case dos parâmetros alinhado à implementação, `createRecord` agora recebe `{ client }` como 3º argumento; (3) `tests/unit/lib/db/musicas.test.js` — 5 correções: `LOWER(titulo) LIKE` → `titulo ILIKE` (3 ocorrências), `createMusica` ajustado para 2 chamadas (SELECT MAX + INSERT), `updateMusica` ajustado para enviar apenas campos fornecidos. Nenhuma alteração no código de produção. **Total:** 3 arquivos modificados. 19/19 testes passando. Nenhuma regressão nos demais testes.

> **Ajustes realizados na 30ª revisão (14/06/2026):**
> - **Testes de edge cases de Dicas corrigidos (2/2 testes passando)**: três problemas foram corrigidos no arquivo `tests/unit/pages/api/admin/dicas.edge.test.js`: (1) mock de `logActivity` — antes mockava `db.logActivity` (função inexistente no `db.js`), agora mocka corretamente `lib/domain/audit.js` que é a origem real da função; (2) IP esperado — o teste esperava `'unknown'` mas `getClientIP()` retorna `'127.0.0.1'` para socket vazio; (3) mock do SELECT no PUT — adicionado `published: true` ao retorno do mock para que o merge no `handlePut` resulte em `true` em vez de `undefined`. **Total:** 1 arquivo modificado. Nenhuma regressão.
> - **Bug preexistente em `adminCrudHandler.js` corrigido**: o handler quebrava com `TypeError: Cannot read properties of null (reading 'role')` quando `req.user` era `null` (teste de `posts.edge.test.js`). Adicionada verificação early-return com status 401 se `user` não existir, antes de qualquer acesso a `user.role`.
>
> **Ajustes realizados na 31ª revisão (14/06/2026):**
> - **Testes de busca alinhados ao `.toLowerCase()` do `shared-pagination.js` (19/19 testes passando)**: o helper `shared-pagination.js` aplica `.toLowerCase().trim()` sobre o termo de busca na linha 43 (`%${search.toLowerCase().trim()}%`). Três arquivos de teste esperavam o termo com capitalização original, causando falha. Correções: (1) `tests/unit/lib/db/getPaginatedPosts.test.js` (linha 70) — `'%Teste%'` → `'%teste%'`; (2) `tests/unit/lib/db/musicas.test.js` (linhas 60, 64) — `'%Teste%'` → `'%teste%'`; (3) `tests/unit/domain/videos.test.js` (linhas 57, 68) — `'%React%'` → `'%react%'`, `'%Next.js%'` → `'%next.js%'`. A função `getAllMusicas` (linha 180) **não foi alterada** porque ela **não** passa pelo `shared-pagination.js** — mantém a capitalização original, o que está correto. Nenhuma alteração no código de produção. **Total:** 3 arquivos modificados. 19/19 testes passando. Nenhuma regressão.
>
> **Ajustes realizados na 32ª revisão (14/06/2026):**
> - **Testes do `updatePost.test.js` corrigidos (4/4 testes passando)**: o teste `deve lidar com campos opcionais nulos (ex: excerpt, image_url)` falhava porque esperava valores `null`/`false` para campos omitidos (`excerpt`, `image_url`, `published`), mas o `updatePost` implementa atualização parcial — só inclui campos explicitamente fornecidos. Substituído por dois testes: (1) `deve fazer atualização parcial com apenas os campos fornecidos` — verifica que apenas `title`, `slug`, `content` e `id` são passados; (2) `deve atualizar apenas o campo published sem alterar os demais` — verifica atualização isolada de `published`. Nenhuma alteração no código de produção. **Total:** 1 arquivo modificado. Nenhuma regressão.
>
> **Ajustes realizados na 33ª revisão (14/06/2026):**
> - **Testes do `settings.test.js` corrigidos (6/6 testes passando)**: o teste `getSettings()` falhava porque o mock da `query` retornava dados no formato `SELECT key, value FROM settings` (duas linhas), enquanto a implementação real usa `json_object_agg` do PostgreSQL e espera uma única linha com coluna `settings` contendo o objeto agregado. Correção: (1) mock ajustado para retornar `rows: [{ settings: { theme: 'light', site_name: 'Projeto Caminhar' } }]`; (2) asserção `toHaveBeenCalledWith` atualizada para validar a query real com `json_object_agg`. Nenhuma alteração no código de produção. **Total:** 1 arquivo modificado. Nenhuma regressão.
>
> **Ajustes realizados na 34ª revisão (14/06/2026):**
> - **Testes do `placeholder-image.test.js` corrigidos (3/3 testes passando)**: mock do `getSetting` apontava para `lib/db.js` em vez de `lib/domain/settings.js`. O handler real importa de `lib/domain/settings.js`, portanto o `mockResolvedValueOnce`/`mockRejectedValueOnce` nunca eram interceptados. Correções: (1) adicionado `jest.mock('../../../lib/domain/settings.js')`; (2) removido `getSetting` do `mockDb({...})` de `lib/db.js`; (3) import corrigido para `from '../../../lib/domain/settings.js'`. Adicionada entrada na tabela da Seção 4.2. **Total:** 2 arquivos modificados. Nenhuma regressão.
>
> **Ajustes realizados na 35ª revisão (14/06/2026):**
> - **Testes do `settings.test.js` expandidos e corrigidos (9/9 testes passando)**: três falhas foram corrigidas. (1) Mock do `getSettings` — o teste mockava a query como `SELECT key, value FROM settings` (linhas individuais), mas a implementação usa `json_object_agg` que retorna uma única linha com coluna `settings`. Mock ajustado para `rows: [{ settings: { site_title: 'Title', admin_email: 'admin@test.com' } }]`. (2) `getAllSettings` não encontrada — a função exportada chamava-se `getAllSettingsRaw` (incompatível com o import do teste). Renomeada para `getAllSettings` em `lib/domain/settings.js`. (3) Adicionada entrada `settings.test.js` na listagem da Seção 5.10 (Lib/DB). **Total:** 2 arquivos modificados (`lib/domain/settings.js`, `tests/unit/lib/db/settings.test.js`). 9/9 testes passando. Nenhuma regressão.
>
> **Ajustes realizados na 36ª revisão (14/06/2026):**
> - **Testes do `AdminDashboard.test.js` corrigidos (3/3 testes passando)**: dois testes falhavam com `Unable to find an element with the text: Artigos`. Três problemas: (1) componente filtra estatísticas por permissões (`isAdmin=false` + `userPermissions=[]` remove todos os cards) — adicionado `isAdmin={true}` nos dois testes que esperam dados completos; (2) mock do `fetch` não incluía `headers.get()` — componente valida `content-type: application/json` antes de processar a resposta, adicionado `headers: { get: () => 'application/json' }` nos mocks; (3) cache em `sessionStorage` podia interferir entre testes — adicionado `sessionStorage.clear()` no `beforeEach`. **Total:** 1 arquivo modificado (`tests/unit/components/Admin/AdminDashboard.test.js`). Nenhuma regressão.
>
> **Ajustes realizados na 37ª revisão (14/06/2026):**
> - **Testes do `posts.test.js` alinhados à implementação full-text search (8/8 testes passando)**: duas falhas foram corrigidas. (1) Busca com `getRecentPosts('Jesus')` — o teste esperava `LIKE $1` com `['%jesus%', 5, 0]`, mas a implementação usa full-text search com `tsvector`/`plainto_tsquery` que não utiliza wildcards. Asserções atualizadas para `expect.stringContaining('plainto_tsquery')` e parâmetros `['jesus', 5, 0]`. (2) `createPost()` — o teste não incluía `position: 0` no objeto esperado, mas a implementação adiciona esse campo como default. Adicionado `position: 0` à asserção. Nenhuma alteração no código de produção. **Total:** 1 arquivo modificado. Nenhuma regressão.
>
> Para detalhes de implementação específicos, consulte `docs/UPGRADE_tests.md`.
