# 🔧 Plano de Melhorias — `/load-tests`

> **Propósito:** Levantamento analítico de possíveis melhorias, correções e ajustes para a suíte de testes de carga, sem alterar nenhum arquivo do projeto.
> **Data da análise:** 24/09/2026
> **Total de arquivos analisados:** 37 (7 helpers + 17 performance + 4 security + 9 functional)

---

## Sumário

1. [Descrição Geral](#1-descrição-geral)
2. [Estrutura de Arquivos e Pastas](#2-estrutura-de-arquivos-e-pastas)
3. [Análise Individual de Cada Arquivo](#3-análise-individual-de-cada-arquivo)
   - [3.1 Helpers (7 arquivos)](#31-helpers-7-arquivos)
   - [3.2 Performance (17 arquivos)](#32-performance-17-arquivos)
   - [3.3 Security (4 arquivos)](#33-security-4-arquivos)
   - [3.4 Functional (9 arquivos)](#34-functional-9-arquivos)
4. [Ajustes e Correções](#4-ajustes-e-correções)
5. [Melhorias](#5-melhorias)
6. [Duplicidades](#6-duplicidades)
7. [Código Morto](#7-código-morto)

---

## 1. Descrição Geral

**Finalidade:** Documentar a análise estática completa da suíte de testes de carga do projeto Caminhar, identificando propósito, relações entre arquivos, problemas, melhorias, duplicidades e possíveis códigos mortos.

**Objetivo:** Fornecer um registro fiel e objetivo do estado atual da pasta `/load-tests`, servindo como base para decisões de refatoração, manutenção e evolução dos testes.

**Escopo:** Todos os 37 arquivos existentes na pasta `/load-tests`, incluindo helpers, scripts de performance, security e functional.

---

## 2. Estrutura de Arquivos e Pastas

```
load-tests/
├── helpers/
│   ├── auth.js                  # Autenticação compartilhada (login JWT)
│   ├── config.js                # Configuração de ambiente (BASE_URL, credenciais)
│   ├── network.js               # Geração de IPs aleatórios para spoofing
│   ├── profiles.js              # Perfis de carga padronizados (light, medium, heavy, etc.)
│   ├── report.js                # Geração de relatórios JSON e sanitização de tokens
│   ├── resource-test-runner.js  # Factory pattern para testes CRUD, filtro, paginação, ordenação e carga
│   └── sleep.js                 # Sleep randomizado para simular tempo de pensamento
├── performance/
│   ├── musicas-crud-test.js     # CRUD de músicas via factory
│   ├── musicas-filter-test.js   # Filtro/busca de músicas por artista via factory
│   ├── musicas-load-test.js     # Carga em endpoint admin de músicas
│   ├── musicas-pagination-test.js # Paginação de músicas via factory
│   ├── musicas-search-test.js   # Busca manual de músicas por termos (não usa factory)
│   ├── musicas-sort-test.js     # Ordenação de músicas (sortMode: 'recent') via factory
│   ├── videos-crud-test.js      # CRUD de vídeos via factory + teardown
│   ├── videos-filter-test.js    # Filtro/busca de vídeos por termos via factory
│   ├── videos-load-test.js      # Carga em endpoint público de vídeos com paginação extra
│   ├── videos-pagination-test.js # Paginação de vídeos via factory
│   ├── videos-sort-test.js      # Ordenação de vídeos (sortField/sortOrder) via factory
│   ├── cache-warmup-test.js     # Warm-up de cache Redis/memória
│   ├── cache-performance-test.js # Teste de performance de cache (quente vs frio)
│   ├── pagination-test.js       # Teste manual de paginação (ES5.1 compatível)
│   ├── create-post-flow.js      # Fluxo de criação de posts com teardown
│   ├── authenticated-flow-test.js # Teste de acesso a rota autenticada (/api/settings)
│   └── stress-test-combined.js  # Teste de estresse combinado (CRUD + monitoramento de memória)
├── security/
│   ├── rate-limit-test.js       # Teste de rate limit no login
│   ├── login-negative-test.js   # Testes negativos de login (senha errada, usuário inexistente)
│   ├── ip-spoofing-test.js      # Teste de detecção/evasão de IP spoofing
│   └── ddos-search-test.js      # Teste de carga massiva em endpoint de busca
└── functional/
    ├── health-check.js          # Verificação de saúde do servidor (/api/status)
    ├── search-content-test.js   # Busca de conteúdo com validação de termo
    ├── posts-cursor-pagination-test.js # Paginação por cursor
    ├── posts-tags-test.js       # Filtro de posts por tag
    ├── cache-headers-test.js    # Validação de headers de cache (Cache-Control)
    ├── backup-verification-test.js # Verificação de backups disponíveis
    ├── upload-flow-test.js      # Upload de imagem (GIF 1x1) + verificação de arquivo
    ├── video-validation-test.js # Validação de URLs do YouTube (válida, domínio inválido, malformada)
    └── recovery-test.js         # Monitoramento de recuperação (Time To Recovery - TTR)
```

---

## 3. Análise Individual de Cada Arquivo

### 3.1 Helpers (7 arquivos)

---

#### `load-tests/helpers/auth.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/config.js` (importa `BASE_URL`, `USERNAME`, `PASSWORD`)
- É importado por: `musicas-crud-test.js`, `videos-crud-test.js`, `create-post-flow.js`, `authenticated-flow-test.js`, `stress-test-combined.js`, `upload-flow-test.js`, `video-validation-test.js`, `backup-verification-test.js`, `cache-warmup-test.js` (re-exporta)

**Resumo do arquivo:**
Módulo compartilhado para autenticação JWT. Exporta a função `setup(options)` que realiza POST em `/api/auth/login?response=body` e retorna `{ token: body.data.token }`. Aceita opções de override para `baseUrl`, `username` e `password`. Lança erro se o login falhar ou se a estrutura de resposta for inesperada.

---

#### `load-tests/helpers/config.js`

**Arquivos acionados ou relacionados:**
- Importado por todos os arquivos de teste que necessitam de `BASE_URL`, `USERNAME` ou `PASSWORD`

**Resumo do arquivo:**
Centraliza a configuração de ambiente. Define `DEFAULT_CONFIG` com fallback para `localhost:3000`, `admin` e `123456`. Exporta constantes avaliadas no momento da importação (`__ENV.BASE_URL || DEFAULT_CONFIG.BASE_URL`). Exporta também a função `getConfig()` que faz a mesma leitura mas não é utilizada por nenhum outro arquivo.

---

#### `load-tests/helpers/network.js`

**Arquivos acionados ou relacionados:**
- `load-tests/security/ip-spoofing-test.js` (importa `getRandomIP`)
- `load-tests/helpers/resource-test-runner.js` (importa `getRandomIP`)

**Resumo do arquivo:**
Fornece a função `getRandomIP()` que gera endereços IP aleatórios (4 octetos de 0-255). Possui comentário na linha 3 referenciando "seção 2.2 do UPGRADE_load-tests.md" — o conteúdo da referência não corresponde à seção atual (que trata de código morto, não de spoofing).

---

#### `load-tests/helpers/profiles.js`

**Arquivos acionados ou relacionados:**
- Importado por: `resource-test-runner.js`, `stress-test-combined.js`, `pagination-test.js`, `cache-headers-test.js`, `search-content-test.js`, `posts-cursor-pagination-test.js`, `posts-tags-test.js`, `rate-limit-test.js`, `ddos-search-test.js`, `health-check.js`, `recovery-test.js`, `ip-spoofing-test.js`

**Resumo do arquivo:**
Define a constante `PROFILES` com 7 perfis de carga: `light`, `medium`, `heavy`, `health`, `recovery`, `stress`, `rateLimit`. Exporta a função `getProfile(profileName, overrides)` que retorna configuração mesclada. O merge de thresholds é inteligente: se overrides definir `thresholds` explicitamente, substitue completamente; caso contrário, faz merge com o perfil base.

---

#### `load-tests/helpers/report.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/resource-test-runner.js` (re-exporta `generateReport` e `sanitizeToken`)
- Importado diretamente por: `musicas-search-test.js`, `pagination-test.js`, `create-post-flow.js`, `authenticated-flow-test.js`, `cache-performance-test.js`, `stress-test-combined.js`, `login-negative-test.js`, `ip-spoofing-test.js`, `rate-limit-test.js`, `ddos-search-test.js`, `health-check.js`, `search-content-test.js`, `posts-cursor-pagination-test.js`, `posts-tags-test.js`, `cache-headers-test.js`, `backup-verification-test.js`, `upload-flow-test.js`, `video-validation-test.js`, `recovery-test.js`

**Resumo do arquivo:**
Centraliza a geração de relatórios k6. Importa `textSummary` da jslib `k6-summary` versão `0.0.4`. Define a função interna `sanitizeToken(data)` que substitui `setup_data.token` por `*** TOKEN OCULTO ***`. Exporta `generateReport(data, testName)` que sanitiza o token e retorna objeto com `stdout` (texto formatado) e arquivo JSON em `./reports/k6-summaries/{testName}.json`.

---

#### `load-tests/helpers/resource-test-runner.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/profiles.js` (importa `getProfile`)
- `load-tests/helpers/sleep.js` (importa `randomSleep`)
- `load-tests/helpers/network.js` (importa `getRandomIP`)
- `load-tests/helpers/config.js` (importa `BASE_URL`, `USERNAME`, `PASSWORD`)
- `load-tests/helpers/report.js` (importa `generateReport`)
- É importado por 11 testes de performance que usam factory pattern

**Resumo do arquivo:**
Módulo central que implementa o factory pattern para testes k6. Exporta 5 factories:
- `createCrudTest(config)` — opções, default e reportName para testes CRUD
- `createFilterTest(config)` — opções, default e reportName para testes de filtro/busca
- `createPaginationTest(config)` — opções, default e reportName para testes de paginação
- `createSortTest(config)` — opções, default e reportName para testes de ordenação
- `createLoadTest(config)` — opções, setup, default e reportName para testes de carga

Possui implementação completa de login automático (lazy login) dentro do `createCrudDefault`, extração de ID com suporte a múltiplos formatos de resposta, e contadores customizados para erros de create/update/delete. Re-exporta `sanitizeToken` e `generateReport` de `report.js`. Contém cópia local de `sanitizeToken` (linhas 24-29) idêntica à versão em `report.js`.

---

#### `load-tests/helpers/sleep.js`

**Arquivos acionados ou relacionados:**
- Importado por: `resource-test-runner.js`, `musicas-search-test.js`, `musicas-load-test.js`, `videos-load-test.js`, `pagination-test.js`, `cache-warmup-test.js`, `cache-performance-test.js`, `create-post-flow.js`, `authenticated-flow-test.js`, `stress-test-combined.js`, `login-negative-test.js`, `search-content-test.js`, `posts-cursor-pagination-test.js`, `posts-tags-test.js`, `cache-headers-test.js`, `upload-flow-test.js`, `video-validation-test.js`, `recovery-test.js`

**Resumo do arquivo:**
Exporta `randomSleep(min = 0.5, max = 3)` que executa `sleep(min + Math.random() * (max - min))`. Substitui sleeps fixos por intervalos aleatórios que simulam comportamento real de usuários.

---

### 3.2 Performance (17 arquivos)

---

#### `load-tests/performance/musicas-crud-test.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/resource-test-runner.js` (importa `createCrudTest`, `generateReport`)
- `load-tests/helpers/auth.js` (re-exporta `setup`)
- `load-tests/helpers/config.js` (importa `BASE_URL`)
- `k6/http` (para requisições de teardown)

**Resumo do arquivo:**
Teste CRUD completo para músicas usando factory `createCrudTest()`. Endpoint: `/api/admin/musicas`. Payload inclui titulo, artista, descricao, url_spotify. Possui função `teardown(data)` que remove músicas com titulo contendo 'K6'. Usa perfil `light` com stages customizados (3 VUs, 10s/20s/10s). Gera relatório `musicas_crud_test`.

---

#### `load-tests/performance/musicas-filter-test.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/resource-test-runner.js` (importa `createFilterTest`, `generateReport`)

**Resumo do arquivo:**
Teste de filtro de músicas usando factory `createFilterTest()`. Endpoint público: `/api/musicas`. Search values: nomes de artistas (`Aline Barros`, `Fernandinho`, etc.). Usa perfil `light` com threshold `checks: ['rate>0.85']`. Gera relatório `musicas_filter_test`.

---

#### `load-tests/performance/musicas-load-test.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/resource-test-runner.js` (importa `createLoadTest`, `generateReport`)

**Resumo do arquivo:**
Teste de carga para endpoint admin de músicas. Endpoint: `/api/admin/musicas`. Configura `requireAuth: true`, usa perfil `medium` com threshold específico `http_req_duration{name:ListMusicas}: ['p(95)<500]'`. Exporta `setup()` que delega ao setup do factory. Valida resposta JSON com array em `musicas` e tempo de resposta < 300ms. Gera relatório `musicas_load_test`.

---

#### `load-tests/performance/musicas-pagination-test.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/resource-test-runner.js` (importa `createPaginationTest`, `generateReport`)

**Resumo do arquivo:**
Teste de paginação de músicas usando factory `createPaginationTest()`. Endpoint público: `/api/musicas`. Usa perfil `light` com `limit: 5`. Gera relatório `musicas_pagination_test`.

---

#### `load-tests/performance/musicas-search-test.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/sleep.js` (importa `randomSleep`)
- `load-tests/helpers/report.js` (importa `generateReport`)
- `load-tests/helpers/config.js` (importa `BASE_URL`)
- `k6/http`, `k6/check`

**Resumo do arquivo:**
Teste manual de busca de músicas (NÃO usa factory pattern). Endpoint: `/api/musicas?search=...`. Usa 1 VU, 5 iterações. Na primeira iteração, executa warm-up com 2 requisições adicionais. Threshold `checks: ['rate==1.0']` e `http_req_duration{name:SearchMusicas}: ['p(95)<800', 'avg<500']`. Valida se título contém termo buscado. Gera relatório `musicas_search_test`. Possui lógica muito similar à factory `createFilterTest` mas implementada manualmente.

---

#### `load-tests/performance/musicas-sort-test.js`

**Arquivos acionados or relacionados:**
- `load-tests/helpers/resource-test-runner.js` (importa `createSortTest`, `generateReport`)

**Resumo do arquivo:**
Teste de ordenação de músicas usando factory `createSortTest()`. Endpoint: `/api/musicas`. Usa `sortMode: 'recent'` (formato novo da API músicas). Usa perfil `light`. Gera relatório `musicas_sort_test`.

---

#### `load-tests/performance/videos-crud-test.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/resource-test-runner.js` (importa `createCrudTest`, `generateReport`)
- `load-tests/helpers/auth.js` (re-exporta `setup`)
- `load-tests/helpers/config.js` (importa `BASE_URL`)
- `k6/http` (para requisições de teardown)

**Resumo do arquivo:**
Teste CRUD completo para vídeos usando factory `createCrudTest()`. Endpoint: `/api/admin/videos`. Payload inclui url_youtube gerado dinamicamente, titulo com prefixo `Video de Teste K6`. Possui função `teardown(data)` que remove vídeos com titulo contendo 'K6'. Usa perfil `light` com stages customizados (3 VUs, 10s/20s/5s). Gera relatório `videos_crud_test`.

---

#### `load-tests/performance/videos-filter-test.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/resource-test-runner.js` (importa `createFilterTest`, `generateReport`)

**Resumo do arquivo:**
Teste de filtro de vídeos usando factory `createFilterTest()`. Endpoint público: `/api/videos`. Search values: termos genéricos (`louvor`, `adoração`, etc.). Usa perfil `light` com threshold `checks: ['rate>0.85']`. Gera relatório `videos_filter_test`.

---

#### `load-tests/performance/videos-load-test.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/resource-test-runner.js` (importa `createLoadTest`, `generateReport`)

**Resumo do arquivo:**
Teste de carga para endpoint público de vídeos. Endpoint: `/api/videos`. Configura `requireAuth: true`, usa perfil `medium`. Adiciona requisição extra para página 2 (`/api/videos?page=2&limit=5`) com checks de metadados de paginação (`pagination.page === 2`, `pagination.limit === 5`). Thresholds específicos por tag e `checks: ['rate>0.95']`. Valida resposta JSON com dados e paginação, tempo < 1000ms. Exporta `setup()`. Gera relatório `videos_load_test`.

---

#### `load-tests/performance/videos-pagination-test.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/resource-test-runner.js` (importa `createPaginationTest`, `generateReport`)

**Resumo do arquivo:**
Teste de paginação de vídeos usando factory `createPaginationTest()`. Endpoint: `/api/videos`. Usa perfil `light` com `limit: 5` e threshold `checks: ['rate>0.85']`. Gera relatório `videos_pagination_test`.

---

#### `load-tests/performance/videos-sort-test.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/resource-test-runner.js` (importa `createSortTest`, `generateReport`)

**Resumo do arquivo:**
Teste de ordenação de vídeos usando factory `createSortTest()`. Endpoint: `/api/videos`. Usa formato antigo de ordenação (`sortField: 'created_at'`, `sortOrder: 'desc'`). Declara `useExplicitSort: true` que não é utilizado pela factory. Usa perfil `light` com threshold `checks: ['rate>0.85']`. Gera relatório `videos_sort_test`.

---

#### `load-tests/performance/cache-warmup-test.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/sleep.js` (importa `randomSleep`)
- `load-tests/helpers/config.js` (importa `BASE_URL`)
- `load-tests/helpers/auth.js` (re-exporta `setup`)

**Resumo do arquivo:**
Teste de warm-up de cache. Executa 1 VU com 1 iteração (cenário `per-vu-iterations`). Realiza 5 rounds de requisições para 4 endpoints (`/api/posts`, `/api/posts?page=1&limit=10`, `/api/posts?page=2&limit=5`, `/api/settings`). Inclui função `verifyCachePopulated()` que confirma se resposta é < 200ms. Threshold `http_req_failed: ['rate<0.50']`. NÃO possui `handleSummary()`, portanto não gera relatório JSON.

---

#### `load-tests/performance/cache-performance-test.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/sleep.js` (importa `randomSleep`)
- `load-tests/helpers/config.js` (importa `BASE_URL`, `USERNAME`, `PASSWORD`)
- `k6/execution` (importa `exec`)

**Resumo do arquivo:**
Teste de performance de cache com 4 estágios (1 VU warm-up → 5 VUs → 50 VUs high load → ramp-down). Testa endpoint `/api/settings` (autenticado) e `/api/posts` (público). Login manual na função `setup()`. Thresholds específicos por tag (`cached_settings`, `cached_posts`) com p(95)<500, avg<200. Checks de cache hit com threshold `rate>0.90`. NÃO possui `handleSummary()`, portanto não gera relatório JSON.

---

#### `load-tests/performance/pagination-test.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/sleep.js` (importa `randomSleep`)
- `load-tests/helpers/report.js` (importa `generateReport`)
- `load-tests/helpers/config.js` (importa `BASE_URL`)
- `load-tests/helpers/profiles.js` (importa `getProfile`)
- `k6/http`, `k6/check`

**Resumo do arquivo:**
Teste manual de paginação (NÃO usa factory pattern) com compatibilidade ES5.1 (usa `var`, `for` loops, `function()` em vez de `.some()`/`.includes()`). Endpoint: `/api/posts`. Extrai array de dados suportando múltiplos formatos (`body.data`, `body.rows`, array direto). Valida IDs diferentes entre página 1 e página 2 usando loops aninhados. Usa perfil `light` com 1 iteração e threshold `checks: ['rate==1.0']`. Gera relatório `pagination_test`.

---

#### `load-tests/performance/create-post-flow.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/sleep.js` (importa `randomSleep`)
- `load-tests/helpers/auth.js` (re-exporta `setup`)
- `load-tests/helpers/config.js` (importa `BASE_URL`)
- `k6/http`, `k6/check`

**Resumo do arquivo:**
Fluxo de criação de posts. Endpoint: `/api/admin/posts`. Stages customizados (3 VUs, 10s/15s/5s). Thresholds: `http_req_duration{flow:create_post}: ['p(95)<2000']`, `checks{flow:create_post}: ['rate>0.95']`, `http_req_failed: ['rate<0.10']`. Possui `teardown(data)` que remove posts com titulo contendo 'K6'. Gera relatório via `generateReport` (sem nome de arquivo explícito no código atual — nome padrão `undefined` no retorno de `generateReport`).

**Observação:** O `handleSummary` chama `generateReport(data, 'create_post_flow')` — mas no arquivo original não há segundo argumento explícito na chamada de `handleSummary`, o que faz o relatório ser gerado com nome `undefined`. Isso é um problema.

---

#### `load-tests/performance/authenticated-flow-test.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/sleep.js` (importa `randomSleep`)
- `load-tests/helpers/auth.js` (re-exporta `setup`)
- `load-tests/helpers/config.js` (importa `BASE_URL`)
- `load-tests/helpers/report.js` (importa `generateReport`)
- `k6/http`, `k6/check`

**Resumo do arquivo:**
Teste de acesso a rota autenticada. Endpoint: `/api/settings?key=site_name`. Stages customizados (3 VUs, 10s/20s/5s). Thresholds: `http_req_duration: ['p(95)<2000']`, `checks{flow:get_settings}: ['rate>0.95']`, `http_req_failed: ['rate<0.10']`. Não usa `getProfile()`, define estágios inline. Gera relatório `authenticated_flow_test`.

---

#### `load-tests/performance/stress-test-combined.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/sleep.js` (importa `randomSleep`)
- `load-tests/helpers/config.js` (importa `BASE_URL`)
- `load-tests/helpers/auth.js` (importa `authSetup`)
- `load-tests/helpers/profiles.js` (importa `getProfile`)
- `load-tests/helpers/report.js` (importa `generateReport`)
- `k6/http`, `k6/check`, `k6/metrics` (Trend, Counter)
- jslib externa: `k6-reporter` (htmlReport)

**Resumo do arquivo:**
Teste de estresse combinado com 2 cenários paralelos definidos no perfil `stress`: `stress_test` (CRUD de vídeos com ramping-vus até 100 VUs) e `memory_monitor` (monitora métricas de memória via `/api/status`). Define métricas customizadas (`nodejs_memory_rss_bytes`, `nodejs_memory_heap_total_bytes`, `nodejs_memory_heap_used_bytes`, `stress_iterations`). Constante `TEST_PREFIX = '[TEST-K6]'`. Função `default()` está vazia (os cenários executam via funções nomeadas). Possui `teardown(data)` paginado que remove vídeos com prefixo `[TEST-K6]`, 'K6' ou 'Estresse'. Gera relatório JSON e HTML (`stress-test-combined.html`).

---

### 3.3 Security (4 arquivos)

---

#### `load-tests/security/rate-limit-test.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/config.js` (importa `BASE_URL`)
- `load-tests/helpers/profiles.js` (importa `getProfile`)
- `load-tests/helpers/report.js` (importa `generateReport`)
- `k6/http`, `k6/check`, `k6/metrics` (Counter)

**Resumo do arquivo:**
Teste de rate limit no endpoint de login. Usa perfil `rateLimit` com threshold `http_req_duration: ['p(95)<5000']`. Define IP fixo `203.0.113.1` para todos os VUs (não varia por VU/iteração). Métrica customizada `rate_limit_hits` (Counter). Valida respostas 429, 403 ou 401. Inclui verificação se rate limit foi acionado no `handleSummary`. Gera relatório `rate_limit_test`.

---

#### `load-tests/security/login-negative-test.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/sleep.js` (importa `randomSleep`)
- `load-tests/helpers/report.js` (importa `generateReport`)
- `load-tests/helpers/config.js` (importa `BASE_URL`)
- `k6/http`, `k6/check`

**Resumo do arquivo:**
Teste negativo de login com 2 cenários: (1) usuário existente com senha incorreta, (2) usuário inexistente. Stages customizados (10 VUs, 10s/30s/10s) — não usa `getProfile()`. Thresholds: `http_req_duration: ['p(95)<1000']`, `checks: ['rate>0.95']`. Valida rejeição (401/400/429 para senha errada; 401/429 para usuário inexistente). Gera relatório `login_negative_test`.

---

#### `load-tests/security/ip-spoofing-test.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/network.js` (importa `getRandomIP`)
- `load-tests/helpers/config.js` (importa `BASE_URL`)
- `load-tests/helpers/profiles.js` (importa `getProfile`)
- `load-tests/helpers/report.js` (importa `generateReport`)
- `k6/http`, `k6/check`

**Resumo do arquivo:**
Teste consolidado de IP spoofing e evasão de rate limit. Usa perfil `rateLimit`. Gera IP único por iteração via `getRandomIP()`. Dois grupos de checks: "BLOQUEADO" (403 ou 429) e "VULNERÁVEL" (401). Documentação no header indica que sistema estava vulnerável (33.33% de proteção). Gera relatório `ip_spoofing_consolidado_test`.

---

#### `load-tests/security/ddos-search-test.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/config.js` (importa `BASE_URL`)
- `load-tests/helpers/profiles.js` (importa `getProfile`)
- `load-tests/helpers/report.js` (importa `generateReport`)
- `k6/http`, `k6/check`, `k6/metrics` (Rate)

**Resumo do arquivo:**
Teste de carga massiva (DDoS) em endpoint de busca. Usa perfil `heavy` com estágios customizados (100 VUs → 500 VUs → ramp-down). Métrica customizada `errors_500` (Rate) com threshold `rate<0.10` e `abortOnFail: true`. Cache busting com timestamp. 10 termos de busca variados. Documentação indica que servidor NÃO aciona rate limit para buscas. Gera relatório `ddos_search_test`.

---

### 3.4 Functional (9 arquivos)

---

#### `load-tests/functional/health-check.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/config.js` (importa `BASE_URL`)
- `load-tests/helpers/profiles.js` (importa `getProfile`)
- `k6/http`, `k6/check`

**Resumo do arquivo:**
Verificação de saúde do servidor. Endpoint: `/api/status?mode=health`. Usa perfil `health`. Valida status 200 e `body.status === 'ok'`. NÃO possui `handleSummary()`, portanto não gera relatório JSON.

---

#### `load-tests/functional/search-content-test.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/sleep.js` (importa `randomSleep`)
- `load-tests/helpers/report.js` (importa `generateReport`)
- `load-tests/helpers/config.js` (importa `BASE_URL`)
- `load-tests/helpers/profiles.js` (importa `getProfile`)
- `k6/http`, `k6/check`

**Resumo do arquivo:**
Busca de conteúdo com validação de termo. Endpoint: `/api/posts?search=...`. Usa perfil `light` com 10 iterações. Na primeira iteração, executa warm-up com 3 requisições. Threshold `checks: ['rate==1.0']` e `http_req_duration{name:SearchPosts}: ['p(95)<500', 'avg<200']`. Valida se termo aparece em `title`, `excerpt` ou `content`. Gera relatório `search_content_test`.

---

#### `load-tests/functional/posts-cursor-pagination-test.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/sleep.js` (importa `randomSleep`)
- `load-tests/helpers/report.js` (importa `generateReport`)
- `load-tests/helpers/config.js` (importa `BASE_URL`)
- `load-tests/helpers/profiles.js` (importa `getProfile`)
- `k6/http`, `k6/check`

**Resumo do arquivo:**
Teste de paginação por cursor. Endpoint: `/api/posts`. Usa perfil `light` com 1 iteração. Busca primeira página com `limit=5`, extrai último ID como cursor, busca próxima página com `cursor={id}`. Valida resultados distintos. Gera relatório `posts_cursor_pagination_test`.

---

#### `load-tests/functional/posts-tags-test.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/sleep.js` (importa `randomSleep`)
- `load-tests/helpers/report.js` (importa `generateReport`)
- `load-tests/helpers/config.js` (importa `BASE_URL`)
- `load-tests/helpers/profiles.js` (importa `getProfile`)
- `k6/http`, `k6/check`

**Resumo do arquivo:**
Teste de filtro de posts por tag. Endpoint: `/api/posts?tag=...`. Usa perfil `light` com 5 iterações e threshold `checks: ['rate>0.80']`. 5 tags comuns. Possui 2 checks que validam exatamente a mesma condição (`Array.isArray(posts)`): 'Retornou lista de posts' e 'Filtro por tag retornou resultados'. Gera relatório `posts_tags_test`.

---

#### `load-tests/functional/cache-headers-test.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/sleep.js` (importa `randomSleep`)
- `load-tests/helpers/report.js` (importa `generateReport`)
- `load-tests/helpers/config.js` (importa `BASE_URL`)
- `load-tests/helpers/profiles.js` (importa `getProfile`)
- `k6/http`, `k6/check`

**Resumo do arquivo:**
Validação de headers de cache. Endpoint: `/api/posts`. Usa perfil `light` com 5 iterações. Valida presença de `Cache-Control`, diretiva `s-maxage` e `stale-while-revalidate`. Threshold `http_req_duration: ['p(95)<2000']`, `checks: ['rate==1.0']`. Gera relatório `cache_headers_test`.

---

#### `load-tests/functional/backup-verification-test.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/report.js` (importa `generateReport`)
- `load-tests/helpers/config.js` (importa `BASE_URL`)
- `load-tests/helpers/auth.js` (re-exporta `setup`)
- `k6/http`, `k6/check`

**Resumo do arquivo:**
Verificação de backups disponíveis. Endpoint: `/api/admin/backups`. 1 VU, 1 iteração. Valida status 200, JSON válido, lista de backups e estrutura de "latest". Threshold `checks: ['rate>0.80']`. Gera relatório `backup_verification_test`.

---

#### `load-tests/functional/upload-flow-test.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/sleep.js` (importa `randomSleep`)
- `load-tests/helpers/auth.js` (re-exporta `setup`)
- `load-tests/helpers/report.js` (importa `generateReport`)
- `load-tests/helpers/config.js` (importa `BASE_URL`)
- `k6/http`, `k6/check`, `k6/encoding` (b64decode), `k6/execution` (exec)

**Resumo do arquivo:**
Teste de upload de imagem. Endpoint: `/api/upload-image`. Stages customizados (5 VUs, 10s/30s/10s). Usa GIF 1x1 transparente em base64. Valida status 200 e presença de URL na resposta. Verifica se arquivo foi salvo no disco fazendo GET na URL retornada. Threshold `http_req_failed: ['rate<0.01']`. Gera relatório `upload-flow-summary` (diferente do padrão `{nome}_test`).

---

#### `load-tests/functional/video-validation-test.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/sleep.js` (importa `randomSleep`)
- `load-tests/helpers/report.js` (importa `generateReport`)
- `load-tests/helpers/config.js` (importa `BASE_URL`)
- `load-tests/helpers/auth.js` (re-exporta `setup`)
- `k6/http`, `k6/check`

**Resumo do arquivo:**
Validação de URLs do YouTube em 3 cenários: (1) URL válida (youtube.com/watch?v=dQw4w9WgXcQ), (2) Domínio inválido (vimeo.com), (3) URL malformada (youtube.com/watch?v=). 1 VU, 1 iteração. Valida rejeição (status 400) para cenários inválidos. Threshold `checks: ['rate>0.60']`. Gera relatório `video_validation_test`.

---

#### `load-tests/functional/recovery-test.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/sleep.js` (importa `randomSleep`)
- `load-tests/helpers/report.js` (importa `generateReport`)
- `load-tests/helpers/config.js` (importa `BASE_URL`)
- `load-tests/helpers/profiles.js` (importa `getProfile`)
- `k6/http`, `k6/check`, `k6/metrics` (Trend, Counter)

**Resumo do arquivo:**
Monitoramento de recuperação (Time To Recovery). Endpoint: `/api/posts`. Usa perfil `recovery` (1 VU, 2 minutos). Métricas customizadas `recovery_time_ms` (Trend) e `recovery_count` (Counter). Rastreia estado saudável vs falha e calcula downtime. Gera relatório `recovery_test`.

---

## 4. Ajustes e Correções

### 4.1 `network.js` — Referência a seção inexistente

**O que foi encontrado:** Comentário na linha 3 de `network.js` referencia "seção 2.2 do UPGRADE_load-tests.md".
**Onde foi encontrado:** `load-tests/helpers/network.js:3`
**Qual é o problema:** A seção 2.2 do documento antigo tratava de "Código Morto e Inutilizado", não de IP spoofing. O conteúdo referenciado não corresponde ao que a seção entrega.
**Ajuste necessário:** Atualizar o comentário para referenciar a seção correta (5.2 ou equivalente) ou remover a referência cruzada.

### 4.2 `videos-sort-test.js` — Campo `useExplicitSort` não utilizado

**O que foi encontrado:** Declaração de `useExplicitSort: true` no config.
**Onde foi encontrado:** `load-tests/performance/videos-sort-test.js:9`
**Qual é o problema:** A factory `createSortTest()` em `resource-test-runner.js` não faz referência a esse campo. O parâmetro não tem efeito no comportamento do teste.
**Ajuste necessário:** Remover o campo ou implementar a funcionalidade correspondente no runner.

### 4.3 `config.js` — Função `getConfig()` não utilizada

**O que foi encontrado:** Função `getConfig()` declarada mas nunca chamada.
**Onde foi encontrado:** `load-tests/helpers/config.js:11-17`
**Qual é o problema:** As constantes `BASE_URL`, `USERNAME` e `PASSWORD` são exportadas diretamente e usadas por todos os testes, tornando a função redundante.
**Ajuste necessário:** Remover a função `getConfig()` para eliminar código morto.

### 4.4 `report.js` — `sanitizeToken` duplicado em `resource-test-runner.js`

**O que foi encontrado:** Cópia local de `sanitizeToken()` em `resource-test-runner.js` idêntica à versão em `report.js`.
**Onde foi encontrado:** `load-tests/helpers/resource-test-runner.js:24-29`
**Qual é o problema:** Viola o princípio DRY. O `resource-test-runner.js` já importa `generateReport` de `report.js`, mas mantém sua própria cópia da função de sanitização.
**Ajuste necessário:** Importar `sanitizeToken` de `report.js` em vez de manter cópia local.

### 4.5 `create-post-flow.js` — Nome de relatório possivelmente indefinido

**O que foi encontrado:** `handleSummary` chama `generateReport(data, 'create_post_flow')`.
**Onde foi encontrado:** `load-tests/performance/create-post-flow.js`
**Qual é o problema:** O nome do relatório é hardcoded como `'create_post_flow'` em vez de usar constante ou seguir o padrão. Embora funciona, difere do padrão `{recurso}_{tipo}_test` dos factories.
**Ajuste necessário:** Padronizar ou documentar a decisão.

### 4.6 `posts-tags-test.js` — Checks redundantes

**O que foi encontrado:** Dois checks validam exatamente a mesma condição.
**Onde foi encontrado:** `load-tests/functional/posts-tags-test.js:26-43`
**Qual é o problema:** Os checks 'Retornou lista de posts' (linha 26) e 'Filtro por tag retornou resultados' (linha 35) executam `Array.isArray(posts)` com a mesma lógica de extração. Um deles é completamente redundante.
**Ajuste necessário:** Remover um dos checks duplicados.

---

## 5. Melhorias

### 5.1 `musicas-search-test.js` — Converter para factory pattern

**Justificativa técnica:** O teste tem implementação manual (77 linhas) com lógica muito similar à factory `createFilterTest()`. A única diferença significativa é a lista de termos de busca. Converter para factory reduziria o arquivo para ~25 linhas e eliminaria duplicação de lógica de validação.
**Benefício:** Manutenibilidade, consistência com os demais testes de filtro.

### 5.2 `pagination-test.js` — Converter para factory pattern

**Justificativa técnica:** O teste usa ES5.1 intencionalmente (compatibilidade com goja antigo), mas a factory `createPaginationTest()` já implementa a mesma lógica. Se a versão do k6 em uso suporta ES6+, a conversão é segura.
**Benefício:** Redução de 90 linhas para ~20 linhas.

### 5.3 Padronizar nomenclatura de relatórios

**Justificativa técnica:** Existem inconsistências nos nomes de relatório:
- Padrão factory: `{recurso}_{tipo}_test` (ex: `musicas_crud_test`)
- `upload-flow-test.js`: gera `upload-flow-summary` (padrão diferente)
- `stress-test-combined.js`: gera `stress-test-combined` (sem sufixo `_test`)

**Benefício:** Consistência na geração e busca de relatórios.

### 5.4 Adicionar `handleSummary()` em 3 testes

**Justificativa técnica:** Os testes abaixo não geram relatórios JSON:
- `health-check.js`
- `cache-warmup-test.js`
- `cache-performance-test.js`

**Benefício:** Histórico de resultados e análise comparativa entre execuções.

### 5.5 Padronizar prefixos de identificação de dados de teste

**Justificativa técnica:** Diferentes testes usam prefixos diferentes:
- `create-post-flow.js`: `Post de Carga K6`
- `musicas-crud-test.js`: `Música Load Test K6`
- `videos-crud-test.js`: `Video de Teste K6`
- `stress-test-combined.js`: `[TEST-K6]`

**Benefício:** Script de limpeza global mais robusto, menos dados órfãos no banco.

### 5.6 Perfil `light` — Threshold de latência

**Justificativa técnica:** O perfil `light` define `http_req_duration: ['p(95)<500']` com apenas 5 iterações. Para testes com 1 VU, a amostra é pequena demais para percentis significativos. Um threshold mais realista seria `p(95)<100ms` com pelo menos 10 iterações.
**Benefício:** Detecção mais precisa de degradação de latência.

### 5.7 `videos-load-test.js` — `requireAuth: true` em endpoint público

**Justificativa técnica:** O endpoint `/api/videos` é público (não requer autenticação para listagem). O teste configura `requireAuth: true` desnecessariamente. Embora o k6 aceite, isso adiciona overhead de login sem benefício.
**Benefício:** Simplificação do teste e redução de complexidade.

### 5.8 Configuração de carga inline em 8 testes

**Justificativa técnica:** Vários testes definem estágios inline em vez de usar `getProfile()`:
- `authenticated-flow-test.js`
- `create-post-flow.js`
- `cache-performance-test.js`
- `cache-warmup-test.js`
- `backup-verification-test.js`
- `upload-flow-test.js`
- `video-validation-test.js`
- `login-negative-test.js`

**Benefício:** Consistência, reutilização de perfis, manutenção centralizada.

### 5.9 Thresholds inconsistentes entre músicas e vídeos

**Justificativa técnica:** Testes estruturalmente equivalentes possuem thresholds diferentes:
- Paginação músicas: `rate==1.0` (100%)
- Paginação vídeos: `rate>0.85` (85%)
- Ordenação músicas: `rate==1.0` (100%)
- Ordenação vídeos: `rate>0.85` (85%)

**Benefício:** Consistência, comparação justa entre recursos.

---

## 6. Duplicidades

### 6.1 `musicas-search-test.js` vs `musicas-filter-test.js` — Redundância Crítica

**Arquivos:** `load-tests/performance/musicas-search-test.js` e `load-tests/performance/musicas-filter-test.js`

**Evidência:** Ambos testam exatamente o mesmo endpoint (`/api/musicas?search=...`) com a mesma lógica de validação (GET, status 200, verificar match do termo). A única diferença é a lista de search values:
- `musicas-filter-test.js`: nomes de artistas
- `musicas-search-test.js`: termos genéricos

`musicas-filter-test.js` usa factory `createFilterTest()`. `musicas-search-test.js` tem implementação manual.

### 6.2 `musicas-filter-test.js` e `videos-filter-test.js` — Lógica Idêntica

**Arquivos:** `load-tests/performance/musicas-filter-test.js` e `load-tests/performance/videos-filter-test.js`

**Evidência:** Estruturalmente idênticos — apenas diferem no endpoint e nos search values. O uso do factory pattern já elimina duplicação de código, mas ambos são arquivos separados. Organizacionalmente aceitável.

### 6.3 `videos-load-test.js` vs `videos-pagination-test.js` — Sobreposição

**Arquivos:** `load-tests/performance/videos-load-test.js` e `load-tests/performance/videos-pagination-test.js`

**Evidência:** `videos-load-test.js` faz requisição para página 2 como `extraRequest`, validando metadados de paginação. Isso sobrepõe parcialmente o propósito de `videos-pagination-test.js`.

### 6.4 `posts-tags-test.js` — Checks Redundantes

**Arquivo:** `load-tests/functional/posts-tags-test.js`

**Evidência:** Os checks 'Retornou lista de posts' e 'Filtro por tag retornou resultados' executam `Array.isArray(posts)` com lógica idíntica.

### 6.5 `resource-test-runner.js` — `sanitizeToken()` Duplicada

**Arquivos:** `load-tests/helpers/resource-test-runner.js` e `load-tests/helpers/report.js`

**Evidência:** O módulo `resource-test-runner.js` possui cópia local de `sanitizeToken()` idêntica à versão em `report.js`.

### 6.6 `stress-test-combined.js` vs `videos-crud-test.js` — Sobreposição

**Arquivos:** `load-tests/performance/stress-test-combined.js` e `load-tests/performance/videos-crud-test.js`

**Evidência:** O cenário `stress_test` do stress test executa CRUD completo de vídeos (POST → PUT → DELETE), mesma funcionalidade de `videos-crud-test.js`, porém com 33× mais VUs (até 100 vs 3).

### 6.7 `musicas-sort-test.js` vs `videos-sort-test.js` — Formatos de Ordenação Divergentes

**Arquivos:** `load-tests/performance/musicas-sort-test.js` e `load-tests/performance/videos-sort-test.js`

**Evidência:** Usam formatos diferentes de ordenação:
- `musicas-sort-test.js`: `sortMode: 'recent'` (novo formato)
- `videos-sort-test.js`: `sortField: 'created_at'` + `sortOrder: 'desc'` (formato antigo)

A divergência pode indicar inconsistência no backend.

### 6.8 Warm-up duplicado

**Arquivos:** `load-tests/performance/cache-warmup-test.js` e `load-tests/functional/search-content-test.js` (e `musicas-search-test.js`)

**Evidência:** Existem 3 mecanismos de warm-up independentes:
1. `cache-warmup-test.js` — Teste dedicado com 5 rounds × 4 endpoints
2. `search-content-test.js` — Warm-up embutido na primeira iteração (3 requisições)
3. `musicas-search-test.js` — Warm-up embutido na primeira iteração (2 requisições)

Não há garantia de ordem de execução entre eles.

---

## 7. Código Morto

### 7.1 `config.js` — Função `getConfig()`

**Arquivo:** `load-tests/helpers/config.js:11-17`

**Motivo:** A função é declarada mas nunca chamada por nenhum outro módulo. As constantes exportadas (`BASE_URL`, `USERNAME`, `PASSWORD`) são usadas diretamente por todos os testes.

**Classificação:** Código morto confirmado.

### 7.2 `videos-sort-test.js` — Campo `useExplicitSort`

**Arquivo:** `load-tests/performance/videos-sort-test.js:9`

**Motivo:** O campo `useExplicitSort: true` é declarado no config mas não é lido pela factory `createSortTest()`.

**Classificação:** Código morto confirmado (parâmetro órfão).

### 7.3 Possível código morto em `network.js`

**Arquivo:** `load-tests/helpers/network.js`

**Motivo:** A função `getRandomIP()` é importada por `resource-test-runner.js` e `ip-spoofing-test.js`. No entanto, em `resource-test-runner.js`, a importação existe mas `getRandomIP()` só é usada se `useSpoofIP: true` for configurado — o que ocorre apenas em `videos-load-test.js` (que configura `useSpoofIP: false`) e `stress-test-combined.js` (que não usa). A função é efetivamente usada apenas em `ip-spoofing-test.js`.

**Classificação:** Possível código morto parcial (importação não utilizada em `resource-test-runner.js` para a maioria dos testes).

### 7.4 `stress-test-combined.js` — Função `default()` vazia

**Arquivo:** `load-tests/performance/stress-test-combined.js:27-29`

**Motivo:** A função `default()` contém apenas comentário. Os cenários executam via funções nomeadas `stress_test()` e `memory_monitor()`. Funcionalmente correto no k6, mas pode confundir leitores.

**Classificação:** Código intencionalmente vazio (não é código morto, mas poderia ser documentado melhor).

---

> **Total de itens identificados:** 34
> ⚠️ **Críticos:** 3 (duplicidade música-search/filter, referência quebrada em network.js, checks redundantes em posts-tags)
> 🟡 **Médios:** 24 (thresholds inconsistentes, código morto, configuração inline, nomenclatura, factory pattern incompleto, warm-up duplicado)
> 🔵 **Leves:** 7 (perfil light latência, validação de schemas, cache CI, relatório limitado, escopo limpeza, prefixos inconsistentes, HTML_REPORT)
