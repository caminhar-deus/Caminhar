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
Define a constante `PROFILES` com 7 perfis de carga: `light`, `medium`, `heavy`, `health`, `recovery`, `stress`, `rateLimit`. Exporta a função `getProfile(profileName, overrides)` que retorna configuração mesclada. **O merge de thresholds é chave a chave: por padrão o perfil base é preservado** e só as chaves repetidas são substituídas pelo `overrides.thresholds` — a semântica antiga (substituição total) continua disponível, mas só de forma explícita, via `overrides.replaceThresholds: true`, que é consumida dentro da função e não vaza para o `options` do k6.

---

#### `load-tests/helpers/report.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/resource-test-runner.js` (re-exporta apenas `generateReport`)
- Importado diretamente por: `musicas-search-test.js`, `pagination-test.js`, `create-post-flow.js`, `authenticated-flow-test.js`, `cache-performance-test.js`, `stress-test-combined.js`, `login-negative-test.js`, `ip-spoofing-test.js`, `rate-limit-test.js`, `ddos-search-test.js`, `health-check.js`, `search-content-test.js`, `posts-cursor-pagination-test.js`, `posts-tags-test.js`, `cache-headers-test.js`, `backup-verification-test.js`, `upload-flow-test.js`, `video-validation-test.js`, `recovery-test.js`

**Resumo do arquivo:**
Centraliza a geração de relatórios k6. Importa `textSummary` da jslib `k6-summary` versão `0.0.4`. Define a função interna `sanitizeToken(data)` que substitui o token JWT por `*** TOKEN OCULTO ***`, cobrindo os dois formatos de `setup_data`: o objeto `{ token: "..." }` e a string crua que `createLoadSetup` retorna (`loginRes.json('data.token')`). Exporta `generateReport(data, testName)` que sanitiza o token e retorna objeto com `stdout` (texto formatado) e arquivo JSON em `./reports/k6-summaries/{testName}.json`.

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

Possui implementação completa de login automático (lazy login) dentro do `createCrudDefault`, extração de ID com suporte a múltiplos formatos de resposta, e contadores customizados para erros de create/update/delete. Re-exporta `generateReport` de `report.js`, que é o **único** símbolo re-exportado.

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
Teste de warm-up de cache. Executa 1 VU com 1 iteração (cenário `per-vu-iterations`). Realiza 5 rounds de requisições para 4 endpoints (`/api/posts`, `/api/posts?page=1&limit=10`, `/api/posts?page=2&limit=5`, `/api/settings`). Inclui função `verifyCachePopulated()` que confirma se resposta é < 200ms. Threshold `http_req_failed: ['rate<0.50']`. **Possui `handleSummary()` desde 17/10/2026** e grava `reports/k6-summaries/{cache_warmup_test,cache_performance_test,health_check}.json`.

---

#### `load-tests/performance/cache-performance-test.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/sleep.js` (importa `randomSleep`)
- `load-tests/helpers/config.js` (importa `BASE_URL`, `USERNAME`, `PASSWORD`)
- `k6/execution` (importa `exec`)

**Resumo do arquivo:**
Teste de performance de cache com 4 estágios (1 VU warm-up → 5 VUs → 50 VUs high load → ramp-down). Testa endpoint `/api/settings` (autenticado) e `/api/posts` (público). Login manual na função `setup()`. Thresholds específicos por tag (`cached_settings`, `cached_posts`) com p(95)<500, avg<200. Checks de cache hit com threshold `rate>0.90`. **Possui `handleSummary()` desde 17/10/2026** e grava `reports/k6-summaries/{cache_warmup_test,cache_performance_test,health_check}.json`.

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

**Observação (RESOLVIDO em 17/10/2026):** esta análise descrevia o `handleSummary` chamando `generateReport` sem segundo argumento, o que geraria relatório com nome `undefined`. Na versão atual o script tem `handleSummary` e chama `generateReport(data, 'create_post_flow')` explicitamente, gravando `reports/k6-summaries/create_post_flow.json`; a decisão de nomenclatura está em §4.5.

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
Teste de estresse combinado com 2 cenários paralelos definidos no perfil `stress`: `stress_test` (CRUD de vídeos com ramping-vus até 100 VUs) e `memory_monitor` (monitora métricas de memória via `/api/status`) — **ambos apenas na intenção do código, ainda não verificados em execução nos runs #9 e #10 por bug corrigido em 13/10/2026 (ver item 4.8)**. Define métricas customizadas (`nodejs_memory_rss_bytes`, `nodejs_memory_heap_total_bytes`, `nodejs_memory_heap_used_bytes`, `stress_iterations`). Constante `TEST_PREFIX = '[TEST-K6]'`. Função `default()` está vazia — **até 13/10/2026 os cenários do perfil `stress` não tinham `exec:`, então era a `default()` que o k6 executava e o script não testava nada (bug corrigido com a adição de `exec:` nos dois cenários, ver item 4.8; a versão anterior deste texto dizia que "os cenários executam via funções nomeadas", premissa errada)**. Possui `teardown(data)` paginado que remove vídeos com prefixo `[TEST-K6]`, 'K6' ou 'Estresse'. Gera relatório JSON e HTML (`stress-test-combined.html`).

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
Teste consolidado de IP spoofing e evasão de rate limit. Usa perfil `rateLimit`. Gera IP único por iteração via `getRandomIP()`. Dois checks **mutuamente exclusivos** por status HTTP: `EVASÃO BLOQUEADA` (429) e `EVASÃO CONFIRMADA` (401) — checks em 50% é o valor esperado. Threshold `ip_rotation_evasion_rate` `rate<0.05` desde 09/10/2026. Gera relatório `ip_spoofing_consolidado_test`. (Descrição dos checks e thresholds atualizada em 09/10/2026 — o texto anterior citava um check de 403 e um estado "vulnerável" que não existem mais no arquivo.)

---

#### `load-tests/security/ddos-search-test.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/config.js` (importa `BASE_URL`)
- `load-tests/helpers/profiles.js` (importa `getProfile`)
- `load-tests/helpers/report.js` (importa `generateReport`)
- `k6/http`, `k6/check`, `k6/metrics` (Rate)

**Resumo do arquivo:**
Teste de carga massiva (DDoS) em endpoint de busca. Usa perfil `heavy` com estágios customizados (100 VUs → 500 VUs → ramp-down). Gera relatório `ddos_search_test`.

**Correção 09/10/2026 — o teste não media o que prometia.** A versão anterior era verde (100% de 200) sem nunca exercitar a proteção, por dois bloqueios independentes: (1) o termo de busca era constante e o rate limit de `pages/api/posts.js` roda dentro do callback de cache, então só havia ~10 verificações contra um limite de 100/min — e o `_t=${Date.now()}` não fazia parte da chave de cache; (2) sem `X-Forwarded-For`, o app resolvia o socket (`127.0.0.1` na CI, `TRUST_PROXY: 'true'`), que está na whitelist permanente de `lib/cache/cache.js` e nunca é limitado. Agora cada iteração usa termo único (`` `${termo}-${__VU}-${__ITER}` ``) e envia `X-Forwarded-For: 203.0.113.10` constante (este teste mede bloqueio; evasão por rotação é do `ip-spoofing-test`). Acrescida a métrica `search_block_rate` com threshold `rate>0.50`, que dá poder de reprovação quando a proteção não atua — antes isso era impossível. A métrica `errors_500` (`rate<0.50`, sem `abortOnFail`) segue sendo medida de resiliência, e as duas taxas são reportadas no `handleSummary`. Efeito colateral: ~15.000 chaves de cache em ~50 s (~11 MB no L1), perdido no fim do job.

---

### 3.4 Functional (9 arquivos)

---

#### `load-tests/functional/health-check.js`

**Arquivos acionados ou relacionados:**
- `load-tests/helpers/config.js` (importa `BASE_URL`)
- `load-tests/helpers/profiles.js` (importa `getProfile`)
- `k6/http`, `k6/check`

**Resumo do arquivo:**
Verificação de saúde do servidor. Endpoint: `/api/status?mode=health`. Usa perfil `health`. Valida status 200 e `body.status === 'ok'`. **Possui `handleSummary()` desde 17/10/2026** e grava `reports/k6-summaries/{cache_warmup_test,cache_performance_test,health_check}.json`.

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

### 4.4 `report.js` — `sanitizeToken` duplicado em `resource-test-runner.js` — **RESOLVIDO em 17/10/2026**

**O que foi encontrado:** Cópia local de `sanitizeToken()` em `resource-test-runner.js` idêntica à versão em `report.js`.
**Onde foi encontrado:** `load-tests/helpers/resource-test-runner.js:24-29`
**Qual é o problema:** Viola o princípio DRY. O `resource-test-runner.js` já importa `generateReport` de `report.js`, mas mantém sua própria cópia da função de sanitização.
**Ajuste aplicado:** a cópia local foi **removida** e o `export` do módulo passou a ser apenas `export { generateReport }`. A remoção é segura porque a função **não era importada por ninguém**: ela só existia no export do módulo, e o grep em todo o repositório não encontrou nenhum consumidor — o único caller real é `generateReport()` dentro do próprio `report.js`. Manter o símbolo no export de outro arquivo só perpetuava a chance de alguém importar a versão errada.

### 4.5 `create-post-flow.js` — Nome de relatório possivelmente indefinido — **RESOLVIDO em 17/10/2026**

**O que foi encontrado (na versão deste documento de 14/10/2026):** `handleSummary` chamava `generateReport(data, 'create_post_flow')` com o nome hardcoded em vez de usar constante ou seguir o padrão `{recurso}_{tipo}_test` dos factories.
**Onde foi encontrado:** `load-tests/performance/create-post-flow.js`
**Qual é o problema:** o nome não vinha de uma constante nem de um `reportName` de factory, o que levantava a dúvida de o relatório ser ou não gravado.
**Estado real do repositório (medido em 17/10/2026):** a premissa estava desatualizada — `create-post-flow.js` **não tinha** `handleSummary` algum e portanto **não gravava relatório nenhum**; era uma das 4 lacunas de observabilidade encontradas nos artifacts dos runs #12–#14 (28 arquivos para 30 scripts na bateria). A dúvida da seção estava certa por outro motivo.
**Ajuste aplicado:** `handleSummary` foi adicionado com `'create_post_flow'`, e a decisão de nomenclatura fica **documentada**: scripts que não usam as funções-fábrica adotam `snake_case` do nome do arquivo (`health_check`, `cache_warmup_test`, `cache_performance_test`, `create_post_flow`), enquanto os factories geram o nome via `reportName(testType, resourceName)`. Mudança estritamente aditiva.

### 4.6 `posts-tags-test.js` — Checks redundantes

**O que foi encontrado:** Dois checks validam exatamente a mesma condição.
**Onde foi encontrado:** `load-tests/functional/posts-tags-test.js:26-43`
**Qual é o problema:** Os checks 'Retornou lista de posts' (linha 26) e 'Filtro por tag retornou resultados' (linha 35) executam `Array.isArray(posts)` com a mesma lógica de extração. Um deles é completamente redundante.
**Ajuste necessário:** Remover um dos checks duplicados.

### 4.7 GitHub Actions desatualizadas — annotation "Uh oh! Node.js 20 is deprecated"

**Status:** **RESOLVIDO em 12/10/2026** (bump das actions oficiais aplicado em `.github/`).
**O que foi encontrado:** Annotation **"Uh oh! Node.js 20 is deprecated ... forced to run on Node.js 24"** no log do run [`38246676774`](https://github.com/caminhar-deus/Caminhar/actions/runs/38246676774) (cron "Load Tests (k6)" nº 9, sha `82e0ed5`, `conclusion: success`).
**Onde foi encontrado:** `actions/checkout@v4` (6×), `actions/setup-node@v4` (2×), `actions/upload-artifact@v4` (10×), `actions/download-artifact@v4` (2×) e `actions/github-script@v7` (2×) — 22 ocorrências em `.github/workflows/{test-base,test-coverage,test-db-coverage,e2e}.yml` e `.github/actions/setup/action.yml`.
**Qual é o problema:** As versões pinadas rodam em Node.js 20, que o GitHub marcou como depreciado e passou a forçar sob o runtime do Node 24 — execução fora do suporte, sujeita a quebrar sem aviso quando o runner remover o fallback.
**Ajuste necessário:** Bump para `checkout`/`setup-node`/`upload-artifact` → **v7**, `download-artifact` → **v8** e `github-script` → **v9**.
**Como foi resolvido (12/10/2026):** Todas as 22 ocorrências migradas. Os breaking changes das release notes foram conferidos contra o uso do repo e **nenhum se aplica**: `checkout` v5-v7 (Node 24, persistência de credenciais em arquivo separado, bloqueio de checkout de fork em `pull_request_target`/`workflow_run` — gatilhos que não existem aqui); `setup-node` v6-v7 (restrição de cache automático a npm — o repo já usa só `cache: 'npm'` com `package-lock.json`; o `NODE_AUTH_TOKEN` dummy descontinuado não era consumido); `upload-artifact`/`download-artifact` v5-v8 (inputs `name`/`path`/`retention-days`/`if-no-files-found` inalterados e downloads SEMPRE por `name:`; v8 passou a errar em hash divergente); `github-script` v8-v9 (`github-token` e `script` inalterados — uso em `test-coverage.yml` remove comentário de cobertura em `pull_request`). `grafana/setup-k6-action@v1` e as actions locais `./.github/actions/*` ficaram fora do bump: não emitiram a annotation. Efeito esperado à época (escrito em 12/10/2026): sumir a annotation e voltar a rodar em Node.js suportado, sem mudança de comportamento dos steps — **confirmado empiricamente em 13/10/2026, ver "Confirmação empírica" no fim desta seção**. Validado com `actionlint`. Registro completo do run de origem em `docs/PROJECT_load-tests.md`, seção "Registro de execução — run 38246676774".

**Incidente de 13/10/2026 — o bump estava certo, uma mudança especulativa feita POR CIMA dele é que reprovou a CI.** O commit `9569d40` levou ao `main` não só o bump, mas também uma alteração **não solicitada e desnecessária** no `Post PR Comment on Failure`: `const fs = require('fs')` → `const fs = await import('node:fs')`. A premissa era que o `github-script` v9, por ser ESM, tinha removido o `require` do escopo do script. **Não tem** — conferido no fonte do v9 (`dist/index.js`, função `run`): o script continua sendo avaliado com `require: wrapRequire` injetado, um `Proxy` sobre o `require` do bundle que resolve `fs` e `node:fs`. Os breaks reais do v9 são outros e nenhum se aplica aqui (`require('@actions/github')`; `getOctokit` redeclarado com `const`/`let`).

Consequência: o run [`38403842614`](https://github.com/caminhar-deus/Caminhar/actions/runs/38403842614) ("Lint & Test Coverage Gate" #21, `push`, sha `9569d40`) reprovou com `Test Suites: 1 failed, 188 passed` e `Tests: 10 failed, 1397 passed`. A suíte `tests/unit/github-workflows/test-coverage-comment.test.js` **lê o `script:` do step direto do próprio workflow** e o executa com `new Function`, injetando `require` e um `fs` simulado — e `import()` dinâmico dentro de `new Function` no Jest lança `TypeError: A dynamic import callback was invoked without --experimental-vm-modules`. O `require('fs')` foi restaurado e a suíte voltou a 21/21.

**Duas lições que valem mais que o bump:** (1) antes de "adaptar" um step de workflow a uma versão nova da action, **o `require` injetado é contrato, não acidente** — conferir o fonte da action, não supor pelo rótulo "ESM"; (2) um step cujo corpo é lido e executado por um teste **é uma API pública do repositório**: mudar o texto do `script:` quebra o teste mesmo quando o workflow continua sintaticamente válido e o actionlint não reclama. O sinal apareceu só no step `Run Tests with Coverage`, e a causa estava a 12 linhas do step que o havia quebrado — por isso vale ler o log inteiro antes de culpar o bump.

**Confirmação empírica (13/10/2026) — o bump cumpriu o objetivo.** A annotation "Uh oh! Node.js 20 is deprecated ... forced to run on Node.js 24", que aparecia em `Load Tests (k6)` #9 (run [`38246676774`](https://github.com/caminhar-deus/Caminhar/actions/runs/38246676774), 12/10/2026, com warnings em `actions/checkout@v4`, `actions/setup-node@v4` e `actions/upload-artifact@v4`), **sumiu**. Verificado nos runs do commit `c5c392d` (13/10/2026, todos `conclusion: success`) — `Lint & Test Coverage Gate` #22 ([`38409100656`](https://github.com/caminhar-deus/Caminhar/actions/runs/38409100656)), `Test Coverage Gate (banco real)` ([`38409100302`](https://github.com/caminhar-deus/Caminhar/actions/runs/38409100302)) e `E2E Isolated (Cypress)` ([`38409100588`](https://github.com/caminhar-deus/Caminhar/actions/runs/38409100588)): a lista de Annotations dos jobs **não contém mais nenhuma referência a Node.js 20**. O bump para `checkout`/`setup-node`/`upload-artifact` → v7, `download-artifact` → v8 e `github-script` → v9 está em produção e **sem efeito colateral observável**. Números dos runs (todos verdes): `coverage` 3m22s, **189/189 suítes e 1407 testes passados, 0 falhas**, cobertura `All files 95.69 | 88.49 | 95.09 | 95.69`; `coverage-db` 6/6 suítes e 73/73 testes; E2E isolado 5 specs e **25/25 testes**; `lint` e `coverage-report` (actionlint + knip) verdes. O efeito esperado registrado em 12/10/2026 acima está, portanto, **cumprido e medido**.

### 4.8 `stress-test-combined.js` — cenários do perfil `stress` sem `exec:` executam a `default()` vazia

**Status:** **RESOLVIDO EM 13/10/2026 e CONFIRMADO EM 14/10/2026 — validado em produção pelo run [`38543197931`](https://github.com/caminhar-deus/Caminhar/actions/runs/38543197931)** (`exec: 'stress_test'` e `exec: 'memory_monitor'` adicionados aos cenários do perfil `stress` em `load-tests/helpers/profiles.js`; ~~correção no working tree, só entra em vigor após commit e push — pendência fechada em `docs/PENDENCIAS_scripts_testes.md`, item Z, com o critério de verificação do próximo run~~ a correção entrou em vigor antes do cron nº 11 (sha `e50de03`), que a exercitou e atendeu os 4 critérios de verificação (o 3º com correção da redação: `stress_iterations` segue `ausente` e agora isso é o estado saudável) — pendência `docs/PENDENCIAS_scripts_testes.md`, item Z, **fechada e confirmada**; ver "Confirmação empírica (14/10/2026)" no fim desta seção).
**O que foi encontrado:** O artifact `reports/k6-summaries/stress-test-combined.json` do run [`38246676774`](https://github.com/caminhar-deus/Caminhar/actions/runs/38246676774) — o **mesmo run de origem do item 4.7** (bump das GitHub Actions) — mostrou um `✅ stress-test-combined: PASS` sobre um teste que **não executou nada**: `checks` `rate 0 / passes 0 / fails 0`, `http_reqs` `count 3` (as 3 falharam; são as de `setup()`/`teardown()`), métrica `stress_iterations` **ausente** do artifact, `nodejs_memory_rss_bytes` **ausente**, `nodejs_memory_heap_used_bytes` todo em `0` e `iteration_duration` `avg 0.0007s`.
**Onde foi encontrado:** `load-tests/helpers/profiles.js` — os cenários `stress_test` e `memory_monitor` do perfil `stress` não declaravam `exec:`; `load-tests/performance/stress-test-combined.js` — a lógica está em `stress_test()` e `memory_monitor()`, enquanto a `default()` (linha 27) é um no-op explícito.
**Qual é o problema:** um cenário k6 sem `exec` executa a função `default` exportada pelo script — aqui a `default()` é vazia, então os dois cenários rodavam a função vazia: 4m50s e **319.813.516 iterações sem nenhuma requisição de teste, nenhum check e nenhuma leitura de memória**. O job ficou verde porque no k6 threshold sobre métrica **sem amostras** não reprova — os quatro thresholds do perfil passaram por falta de dados, não por desempenho (mesmo mecanismo do gotcha `gotchas/k6-check-nao-altera-exit-code.md`). O `setup_data.token` presente no artifact prova que o `setup()` devolveu token: a causa não é token ausente, é função não executada. **Segunda confirmação (determinístico):** o run [`38393117376`](https://github.com/caminhar-deus/Caminhar/actions/runs/38393117376) (cron nº 10, 13/10/2026, sha `7590120`, ainda no código antigo) reproduziu o bug **de forma idêntica** — mesmas métricas zeradas/ausentes, 196.425.737 iterações em 4m50s, bateria 30/30 passed —; dois SHAs e dois dias com o mesmo resultado separam um defeito de código de uma instabilidade. **Contraste que isola a causa:** `load-tests/security/rate-limit-test.js` usa o perfil `rateLimit`, que também é `scenarios:` sem `exec:`, mas tem a lógica na `export default function()` (linha 17) — por isso funciona. Perfis sem `exec:` são inofensivos enquanto a lógica estiver na `default()` e silenciosamente destrutivos quando não estiver. (Os `checks` em 50% e 33,33% de `ip-spoofing-test`/`ddos-search-test` **não** têm relação com este bug: são checks mutuamente exclusivos por status HTTP, comportamento correto documentado no próprio código.)
**Como foi corrigido (13/10/2026):** `exec: 'stress_test'` no cenário `stress_test` e `exec: 'memory_monitor'` no cenário `memory_monitor`, no perfil `stress` de `load-tests/helpers/profiles.js` (duas linhas; sem mudança de thresholds nem de estágios). **Deliberadamente NÃO replicado** aos outros dois perfis com `scenarios:` — `recovery`/`chaos_monitor` e `rateLimit`/`brute_force`: a lógica deles está na `export default function()` de `functional/recovery-test.js` (linha 20) e `security/rate-limit-test.js` (linha 17), então o cenário já executa a função certa; declarar `exec:` ali passaria a procurar funções que não existem e o k6 abortaria o teste. ~~**A correção está no working tree — só entra em vigor após commit e push**, então o próximo cron é o primeiro run que a exercita.~~ **A correção entrou em vigor antes do run nº 11 (sha `e50de03`, 14/10/2026), que foi o primeiro run a exercitá-la.**
**Critério de verificação (próximo run)** — no artifact `reports/k6-summaries/stress-test-combined.json`, a correção pegou se: `checks.passes > 0` (nos runs defeituosos era `0`); `http_reqs.count` na casa das **dezenas de milhares** (eram `3`); `stress_iterations` **presente** (estava ausente); `nodejs_memory_rss_bytes` **presente** (estava ausente). **Resultado no run nº 11 (14/10/2026):** critérios (1), (2) e (4) atendidos com folga — `checks` `rate 1` com 33056 passes/0 fails, `http_reqs` `count 24870`, `nodejs_memory_rss_bytes` presente (max 371200000, avg 277641789); o critério (3) (`stress_iterations` presente) **não** se confirmou literalmente e **isso está certo**: o `Counter` só incrementa quando a criação do vídeo falha (`stress-test-combined.js:91-94`) e houve 0 falhas em 32756 checks — nos runs defeituosos a ausência era sintoma do bug, no run corrigido ela é sinal de que todas as criações passaram (a formulação original do critério 3 estava errada; ver também o critério (3) do item Z). **Previsão de efeito (leitura estática escrita em 13/10/2026) — parte confirmada, parte ainda não exercitada (ver "Confirmação empírica (14/10/2026)" abaixo):** como `pages/api/admin/videos.js:92` limita a 300 mutações/min e o `checkRateLimit` (`lib/cache/cache.js:331`) tem whitelist permanente de loopback — que é o IP que o `getClientIP` resolve na CI, com `TRUST_PROXY: 'true'` e k6 em `localhost` sem `X-Forwarded-For` — as mutações do stress test **não** devem ser limitadas na CI, e o teste passará a medir a capacidade real da app sob 100 VUs de CRUD: os thresholds `p(95)<3000`, `failed<10%` e `checks>95%` passam a ter amostras de verdade e o **cron pode reprovar legitimamente pela primeira vez — sinal de capacidade, não de defeito do teste**. Detalhamento completo em `docs/PROJECT_load-tests.md`, seção `stress-test-combined.js` (advertência de 13/10/2026) e nos registros de execução dos runs [`38246676774`](https://github.com/caminhar-deus/Caminhar/actions/runs/38246676774) e [`38393117376`](https://github.com/caminhar-deus/Caminhar/actions/runs/38393117376).

**Confirmação empírica (14/10/2026) — o run [`38543197931`](https://github.com/caminhar-deus/Caminhar/actions/runs/38543197931) exercitou a correção e ela pegou.** Nesta seção fica **uma linha de resultado**; a evidência completa foi consolidada numa fonte só.

O run nº 11 (sha `e50de03`, `conclusion: success`, bateria **30/30 passed**, job 18m01s, cron **+5h16**) atendeu os 4 critérios acima no estado esperado — `checks` `rate 1` (33056 passes / 0 fails), `http_reqs` `count 24870`, `nodejs_memory_rss_bytes` presente (max `371200000`), `stress_iterations` **segue `ausente` por ser o estado saudável** —, os 4 thresholds do perfil `stress` passaram com **amostras reais** (p(95) **3,46 ms** contra 3000 ms; 0 falhas em 24567 requisições; heap usado máx **204 MB** contra 1 GB), a aritmética interna fecha exata (8489 = 300 + 8189 iterações de CRUD) e o cron **não** reprovou — a "reprovação legítima" prevista acima é possibilidade futura, não o que ocorreu.

- **Fonte primária da evidência** (metadados do run, tabela dos 4 critérios, tabela dos 4 thresholds, aritmética interna e os 2 pontos de não-regressão): `docs/PROJECT_load-tests.md`, seção **"Registro de execução — run `38543197931` (cron "Load Tests (k6)" nº 11, 14/10/2026)"**.
- **Causa e histórico do bug (runs #9 e #10):** `docs/PROJECT_load-tests.md`, seção `stress-test-combined.js` (advertência datada de 13/10/2026) e o registro do run nº 9 — o resumo desta seção é recorte, não duplicata.
- **Pendência:** `docs/PENDENCIAS_scripts_testes.md`, item Z, **fechado e confirmado**.

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

### 5.4 Adicionar `handleSummary()` em 3 testes — **RESOLVIDO em 17/10/2026**

**Justificativa técnica (original):** Os testes abaixo não geravam relatórios JSON:
- `health-check.js`
- `cache-warmup-test.js`
- `cache-performance-test.js`

**Benefício:** Histórico de resultados e análise comparativa entre execuções.

**O que foi feito:** os 3 scripts receberam `handleSummary`, e um quarto que a análise não listou também — `create-post-flow.js` — foi corrigido pelo mesmo caminho, porque o motivo era o mesmo (o relatório não era gravado). Hoje **os 30 scripts da bateria gravam relatório JSON**, e o artifact do cron passou de 28 para 32 arquivos (confirmado no run nº 16, 19/10/2026). A lista de scripts e as métricas do artifact estão em `docs/PROJECT_load-tests.md`; a decisão de nomenclatura dos relatórios, em §4.5.

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

### 6.5 `resource-test-runner.js` — `sanitizeToken()` Duplicada — **RESOLVIDO em 17/10/2026** (mesma correção de §4.4)

**Arquivos:** `load-tests/helpers/resource-test-runner.js` e `load-tests/helpers/report.js`

**Evidência:** O módulo `resource-test-runner.js` possuía cópia local de `sanitizeToken()` idêntica à versão em `report.js`. **Resolvido:** cópia removida e o `export` do módulo reduzido a `export { generateReport }` — a função duplicada não tinha consumidor em lugar nenhum do repositório.

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

**Motivo:** A função `default()` contém apenas comentário. ~~Os cenários executam via funções nomeadas `stress_test()` e `memory_monitor()`. Funcionalmente correto no k6, mas pode confundir leitores.~~ **CORREÇÃO (13/10/2026): esta premissa estava errada** — até a correção de 13/10/2026 os cenários do perfil `stress` **não declaravam `exec:`, então o k6 NÃO executava `stress_test()` nem `memory_monitor()`**: rodava a `default()` vazia em ambos, e o teste não exercitava nada (bug comprovado nos runs [`38246676774`](https://github.com/caminhar-deus/Caminhar/actions/runs/38246676774) e [`38393117376`](https://github.com/caminhar-deus/Caminhar/actions/runs/38393117376), ver item **4.8** acima e `docs/PENDENCIAS_scripts_testes.md`, item Z). A vacuidade da `default()` era o que fazia o script não testar nada enquanto reportava `PASS` — e o bug foi corrigido em 13/10/2026 com a adição de `exec:` aos dois cenários (item 4.8).

**Classificação:** ~~Código intencionalmente vazio (não é código morto, mas poderia ser documentado melhor).~~ **Bug funcional (item 4.8) — não era código morto nem questão de documentação:** o que faltava era `exec:` nos cenários do perfil `stress`; com a correção de 13/10/2026 aplicada, a `default()` vazia voltou a ser inofensiva (o k6 passa a executar as funções nomeadas) — pendência de validação no próximo run pós-commit.

---

> **Total de itens identificados:** 34
> ⚠️ **Críticos:** 3 (duplicidade música-search/filter, referência quebrada em network.js, checks redundantes em posts-tags)
> 🟡 **Médios:** 24 (thresholds inconsistentes, código morto, configuração inline, nomenclatura, factory pattern incompleto, warm-up duplicado)
> 🔵 **Leves:** 7 (perfil light latência, validação de schemas, cache CI, relatório limitado, escopo limpeza, prefixos inconsistentes, HTML_REPORT)
