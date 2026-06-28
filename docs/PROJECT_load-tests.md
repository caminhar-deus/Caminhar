# 📊 Análise da Pasta `/load-tests` — Testes de Carga com k6

> **Propósito:** Documentação consolidada e detalhada de todos os arquivos da pasta `load-tests/`, organizados por contexto e responsabilidade. Todos os scripts utilizam a ferramenta [k6](https://k6.io/) da Grafana Labs.

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Helpers — Módulos Compartilhados](#2-helpers--módulos-compartilhados)
   - 2.1 [sleep.js](#21-sleepjs)
   - 2.2 [config.js](#22-configjs)
   - 2.3 [auth.js](#23-authjs)
   - 2.4 [network.js](#24-networkjs)
   - 2.5 [profiles.js](#25-profilesjs)
   - 2.6 [report.js](#26-reportjs)
   - 2.7 [resource-test-runner.js](#27-resource-test-runnerjs)
3. [Testes Funcionais](#3-testes-funcionais)
   - 3.1 [health-check.js](#31-health-checkjs)
   - 3.2 [cache-headers-test.js](#32-cache-headers-testjs)
   - 3.3 [search-content-test.js](#33-search-content-testjs)
   - 3.4 [posts-tags-test.js](#34-posts-tags-testjs)
   - 3.5 [posts-cursor-pagination-test.js](#35-posts-cursor-pagination-testjs)
   - 3.6 [backup-verification-test.js](#36-backup-verification-testjs)
   - 3.7 [video-validation-test.js](#37-video-validation-testjs)
   - 3.8 [upload-flow-test.js](#38-upload-flow-testjs)
   - 3.9 [recovery-test.js](#39-recovery-testjs)
4. [Testes de Performance](#4-testes-de-performance)
   - 4.1 [cache-warmup-test.js](#41-cache-warmup-testjs)
   - 4.2 [cache-performance-test.js](#42-cache-performance-testjs)
   - 4.3 [authenticated-flow-test.js](#43-authenticated-flow-testjs)
   - 4.4 [create-post-flow.js](#44-create-post-flowjs)
   - 4.5 [pagination-test.js](#45-pagination-testjs)
   - 4.6 [stress-test-combined.js](#46-stress-test-combinedjs)
   - 4.7 [musicas-crud-test.js](#47-musicas-crud-testjs)
   - 4.8 [musicas-load-test.js](#48-musicas-load-testjs)
   - 4.9 [musicas-filter-test.js](#49-musicas-filter-testjs)
   - 4.10 [musicas-search-test.js](#410-musicas-search-testjs)
   - 4.11 [musicas-pagination-test.js](#411-musicas-pagination-testjs)
   - 4.12 [musicas-sort-test.js](#412-musicas-sort-testjs)
   - 4.13 [videos-crud-test.js](#413-videos-crud-testjs)
   - 4.14 [videos-load-test.js](#414-videos-load-testjs)
   - 4.15 [videos-filter-test.js](#415-videos-filter-testjs)
   - 4.16 [videos-pagination-test.js](#416-videos-pagination-testjs)
   - 4.17 [videos-sort-test.js](#417-videos-sort-testjs)
5. [Testes de Segurança](#5-testes-de-segurança)
   - 5.1 [login-negative-test.js](#51-login-negative-testjs)
   - 5.2 [rate-limit-test.js](#52-rate-limit-testjs)
   - 5.3 [ip-spoofing-test.js](#53-ip-spoofing-testjs)
   - 5.4 [ddos-search-test.js](#54-ddos-search-testjs)

---

## 1. Visão Geral

A pasta `load-tests/` contém **30 arquivos** (17 performance + 9 functional + 4 security + 7 helpers) que compõem a suíte de testes de carga, stress, performance e segurança do projeto. Os scripts estão organizados em 3 subpastas temáticas:

| Subpasta | Quantidade | Descrição |
|----------|-----------|-----------|
| **helpers/** | 7 | Módulos compartilhados e reutilizáveis (config, auth, profiles, report, sleep, network, resource-test-runner) |
| **functional/** | 9 | Testes funcionais e de validação de comportamento |
| **performance/** | 17 | Testes de carga, stress, performance e fluxos combinados |
| **security/** | 4 | Testes de segurança (rate limit, spoofing, DDoS, login negativo) |

**Total de scripts de teste executáveis:** 30 (9 + 17 + 4)

**Padrões comuns identificados em toda a suíte:**
- Uso do padrão `setup()` para autenticação → `default()` para execução do teste
- Token JWT extraído de `body.data.token` via `helpers/auth.js`
- Configuração de ambiente centralizada via `helpers/config.js`
- Perfis de carga padronizados via `helpers/profiles.js`
- Relatórios JSON gerados via `helpers/report.js` em `./reports/k6-summaries/`
- IP Spoofing via `helpers/network.js` para evitar rate limit em testes de carga
- Sanitização automática de token JWT nos relatórios

---

## 2. Helpers — Módulos Compartilhados

Módulos que centralizam lógica reutilizável e eliminam duplicação entre os scripts de teste.

### 2.1 `sleep.js`

**Localização:** `load-tests/helpers/sleep.js`

**Propósito:** Fornecer uma função de pausa aleatória que simula o comportamento humano real (tempo de pensamento e ação variáveis), substituindo `sleep()` com valores fixos.

**Funcionalidades:**
- `randomSleep(min = 0.5, max = 3)` — Executa `sleep()` com duração aleatória entre `min` e `max` segundos

**Uso:** Importado por 14 arquivos de teste. Fornece intervalos realistas entre requisições.

---

### 2.2 `config.js`

**Localização:** `load-tests/helpers/config.js`

**Propósito:** Centralizar a leitura de variáveis de ambiente com fallback para valores padrão.

**Funcionalidades:**
- `BASE_URL` — `__ENV.BASE_URL` ou `'http://localhost:3000'`
- `USERNAME` — `__ENV.ADMIN_USERNAME` ou `'admin'`
- `PASSWORD` — `__ENV.ADMIN_PASSWORD` ou `'123456'`
- `getConfig()` — Função que retorna objeto com todas as configurações (não utilizada por nenhum outro módulo — código morto)

**Observações:**
- As constantes são avaliadas uma vez na carga do módulo (não reavaliam `__ENV` dinamicamente)
- `getConfig()` é código morto — nenhum arquivo a chama

---

### 2.3 `auth.js`

**Localização:** `load-tests/helpers/auth.js`

**Propósito:** Centralizar a lógica de autenticação (login) para todos os testes administrativos.

**Funcionalidades:**
- `setup(options?)` — Realiza POST em `${url}/api/auth/login?response=body` com `{ username, password }` e retorna `{ token: body.data.token }`. Aceita override opcional de `baseUrl`, `username`, `password`

**Validações:**
- Verifica `loginRes.status === 200`
- Verifica estrutura `body.data.token` — lança `Error` descritivo se ausente

**Uso:** Importado por ~10 scripts de teste. Substituiu declarações manuais de `setup()` que estavam duplicadas.

---

### 2.4 `network.js`

**Localização:** `load-tests/helpers/network.js`

**Propósito:** Fornecer utilitário de geração de IP aleatório para evasão de rate limit.

**Funcionalidades:**
- `getRandomIP()` — Retorna string no formato `x.x.x.x` com 4 octetos aleatórios (0-254)

**Uso:** Importado por `resource-test-runner.js` e por `ip-spoofing-test.js`.

**Observação:** O arquivo contém um comentário referenciando uma seção 2.2 do `UPGRADE_load-tests.md` que não existe mais — documentação desatualizada.

---

### 2.5 `profiles.js`

**Localização:** `load-tests/helpers/profiles.js`

**Propósito:** Definir perfis de carga padronizados com thresholds consistentes para toda a suíte.

**Perfis disponíveis:**

| Perfil | Configuração | Thresholds | Uso Típico |
|--------|-------------|-----------|------------|
| `light` | 1 VU, 5 iterações | checks=100%, p(95)<500ms | Testes funcionais e CRUD |
| `medium` | 3 estágios (5s/10s/5s), 5 VUs | p(95)<1000ms, failed<5% | Carga moderada |
| `heavy` | 3 estágios (10s/30s/10s), 50 VUs | p(95)<3000ms, failed<10% | Estresse |
| `health` | 3 estágios (5s/10s/5s), 20 VUs | p(95)<500ms, failed<2% | Health check |
| `recovery` | 1 VU constante, 2min | thresholds vazios | Monitoramento de recuperação |
| `stress` | Ramp 0→20→50→100 VUs, ~4min | p(95)<3000ms, failed<10%, checks>95%, heap<1GB | Stress test combinado com 2 cenários paralelos |
| `rateLimit` | Ramp 0→20→50 VUs, 50s | thresholds vazios | Brute force / rate limit |

**Funcionalidades:**
- `PROFILES` — Objeto com todos os perfis
- `getProfile(profileName, overrides)` — Retorna perfil mesclado com sobrescritas. Gerencia conflitos entre `iterations`/`vus` e `stages`

---

### 2.6 `report.js`

**Localização:** `load-tests/helpers/report.js`

**Propósito:** Centralizar a geração padronizada de relatórios de teste k6.

**Funcionalidades:**
- `generateReport(data, testName)` — Gera objeto de saída com:
  - `stdout`: saída formatada via `textSummary` (da biblioteca `k6-summary` 0.0.4)
  - `./reports/k6-summaries/{testName}.json`: relatório JSON completo

**Segurança:**
- Sanitiza automaticamente o token JWT em `data.setup_data.token`, substituindo por `*** TOKEN OCULTO ***`
- Isso protege a exposição de credenciais nos relatórios de saída

---

### 2.7 `resource-test-runner.js`

**Localização:** `load-tests/helpers/resource-test-runner.js` (636 linhas)

**Propósito:** Módulo genérico que elimina a duplicação de código entre pares de testes de recursos (músicas e vídeos). Cada arquivo de teste (~20-30 linhas) passa a ser apenas configuração que invoca as funções do runner.

**Funcionalidades exportadas:**
- `createCrudTest(config)` — Gera `options` + `default()` para teste CRUD completo (POST → PUT → DELETE). Inclui métricas de erro (`*_create_errors`, `*_update_errors`, `*_delete_errors`) e lazy login automático como fallback
- `createFilterTest(config)` — Gera `options` + `default()` para teste de filtro por termo de busca com validação de match nos campos `titulo`/`title`/`artista`/`artist`
- `createPaginationTest(config)` — Gera `options` + `default()` para teste de paginação (página 1 + página 2) com validação cruzada de IDs
- `createSortTest(config)` — Gera `options` + `default()` para teste de ordenação, validando ordem decrescente/crescente por data
- `createLoadTest(config)` — Gera `options` + `setup()` + `default()` para teste de carga, com suporte a health check, IP spoofing e requisições extras
- `sanitizeToken(data)` — Oculta token JWT (cópia local, idêntica à de `report.js`)
- `generateReport(data, testName)` — Re-export do módulo `report.js`

**Detalhes técnicos relevantes:**
- Suporta múltiplos formatos de resposta da API: `{ id }`, `{ data: { id } }`, `{ data: { resourceName: { id } } }` (função `extractResourceId`)
- Suporta caminhos aninhados para extração de itens: `data.musicas`, `data.videos`, etc.
- CRUD implementa lazy login automático (tenta login se `setup()` não forneceu token)
- Limpa conflitos entre `iterations`/`vus` e `stages` (k6 não permite ambos simultaneamente)

---

## 3. Testes Funcionais

Testes de validação comportamental, geralmente com 1 VU e poucas iterações.

### 3.1 `health-check.js`

**Localização:** `load-tests/functional/health-check.js`

**Propósito:** Verificar se a API está operacional através do endpoint de health check.

**Funcionalidades:**
- Faz GET em `${BASE_URL}/api/status?mode=health`
- Valida status 200 e body `{ status: "ok" }`
- Usa perfil `health` (20 VUs, 20s, p95 < 500ms)
- **Não gera relatório JSON** (único teste sem `handleSummary()`)

**Observação:** É o teste mais simples e independente da suíte — sem autenticação, sem dependências.

---

### 3.2 `cache-headers-test.js`

**Localização:** `load-tests/functional/cache-headers-test.js`

**Propósito:** Validar a presença e corretude dos headers de cache HTTP no endpoint público de posts.

**Funcionalidades:**
- Faz GET em `${BASE_URL}/api/posts`
- Verifica header `Cache-Control` — presença, diretiva `s-maxage` e diretiva `stale-while-revalidate`
- Soft checks com `console.warn()` em vez de falha — avisa se header estiver ausente

**Observação:** 5 iterações com `randomSleep(0.5, 3)` entre requisições.

---

### 3.3 `search-content-test.js`

**Localização:** `load-tests/functional/search-content-test.js`

**Propósito:** Validar que o mecanismo de busca textual em posts retorna resultados consistentes e performáticos.

**Funcionalidades:**
- Faz GET em `${BASE_URL}/api/posts?search={termo}&page=1&limit=10`
- Termos de busca: `['Deus', 'Jesus', 'amor', 'fé', 'vida', 'caminho', 'luz']`
- Valida status 200, estrutura de array e match do termo no título/conteúdo/tags (case insensitive)
- **Warm-up automático** na primeira iteração: 3 requisições iniciais para aquecer cache e evitar cold start do Next.js
- Tag `SearchPosts` para thresholds específicos: p(95) < 500ms, avg < 200ms

---

### 3.4 `posts-tags-test.js`

**Localização:** `load-tests/functional/posts-tags-test.js`

**Propósito:** Validar que o filtro por tag no endpoint de posts funciona corretamente.

**Funcionalidades:**
- Faz GET em `${BASE_URL}/api/posts?tag={tag}`
- Tags: `['fé', 'oração', 'bíblia', 'vida', 'espiritualidade']`
- Valida status 200 e que retorna array de posts
- **Duplicidade interna:** O check `'Filtro por tag retornou resultados'` e `'Retornou lista de posts'` validam exatamente a mesma condição — um é redundante

---

### 3.5 `posts-cursor-pagination-test.js`

**Localização:** `load-tests/functional/posts-cursor-pagination-test.js`

**Propósito:** Validar a paginação baseada em cursor (diferente de page/offset) para posts.

**Funcionalidades:**
- Faz GET em `${BASE_URL}/api/posts?limit=5` para obter a primeira página
- Extrai o ID do último post como cursor
- Faz GET em `${BASE_URL}/api/posts?limit=5&cursor={id}` para a segunda página
- Valida que os resultados entre páginas são distintos (o primeiro item da página 2 não deve ser igual ao cursor)

**Observação:** Teste mais específico que `pagination-test.js` (performance) — testa cursor-based pagination em vez de offset-based.

---

### 3.6 `backup-verification-test.js`

**Localização:** `load-tests/functional/backup-verification-test.js`

**Propósito:** Validar que o endpoint de listagem de backups retorna a estrutura JSON esperada.

**Funcionalidades:**
- Requer autenticação JWT (admin)
- Faz GET em `${BASE_URL}/api/admin/backups`
- Suporta dois formatos de resposta: `{ backups: [...], latest: ... }` e `{ data: { backups: [...], latest: ... } }`
- Valida status 200, parse JSON e estrutura de `backups` (array) e `latest` (null ou objeto com `name`)

**Configuração:** 1 VU, 1 iteração. Thresholds: p(95) < 5000ms e checks > 80%.

---

### 3.7 `video-validation-test.js`

**Localização:** `load-tests/functional/video-validation-test.js`

**Propósito:** Validar as regras de validação de URL do YouTube na criação de vídeos administrativos.

**Funcionalidades:**
- Requer autenticação JWT (admin)
- **Cenário 1 — URL Válida:** POST com URL real do YouTube — espera status 201 e retorno de ID
- **Cenário 2 — Domínio Inválido:** POST com URL do Vimeo — espera status 400 e mensagem contendo "YouTube"
- **Cenário 3 — URL Malformada:** POST com URL sem protocolo e sem ID — espera status 400

**Observação:** Os cenários 2 e 3 exibem `console.warn()` se a API aceitar a URL inválida (validação desativada).

---

### 3.8 `upload-flow-test.js`

**Localização:** `load-tests/functional/upload-flow-test.js`

**Propósito:** Validar o fluxo completo de upload de arquivos — desde o envio até a persistência em disco.

**Funcionalidades:**
- Requer autenticação JWT (admin)
- Gera um GIF 1x1 transparente a partir de Base64 inline (sem dependência externa)
- Envia via multipart/form-data usando `http.file()` para `${BASE_URL}/api/upload-image`
- Valida status 200 e presença de URL (`data.url`, `url` ou `path`)
- **Verificação adicional:** Faz GET na URL retornada para confirmar que o arquivo foi persistido em disco

**Configuração:** Ramp-up 0→5 VUs em 10s, sustain 30s, ramp-down 10s. Threshold: p(95) < 2000ms (uploads envolvem I/O de disco/rede).

---

### 3.9 `recovery-test.js`

**Localização:** `load-tests/functional/recovery-test.js`

**Propósito:** Testar a capacidade de detecção e recuperação automática do sistema após uma falha (ex: banco de dados offline).

**Funcionalidades:**
- Monitora `${BASE_URL}/api/posts` continuamente por 2 minutos (1 VU constante)
- Rastreia estado `isSystemDown` para detectar transições saudável ↔ falha
- Métricas customizadas: `recovery_time_ms` (Trend) e `recovery_count` (Counter)
- Mensagem de estabilidade se nenhuma falha for detectada

**Configuração:** Perfil `recovery` — executor `constant-vus`, 1 VU, 2 minutos. Thresholds vazios.

---

## 4. Testes de Performance

Testes de carga, stress e performance para endpoints críticos.

### 4.1 `cache-warmup-test.js`

**Localização:** `load-tests/performance/cache-warmup-test.js`

**Propósito:** Pré-aquecer o cache (Redis e/ou memória) antes dos testes de performance principais, garantindo que as métricas reflitam comportamento com cache quente.

**Funcionalidades:**
- Requer autenticação JWT (admin)
- Executa 5 rounds de requisições para 4 endpoints:
  - `GET /api/posts` (público)
  - `GET /api/posts?page=1&limit=10` (público)
  - `GET /api/posts?page=2&limit=5` (público)
  - `GET /api/settings` (autenticado)
- Verifica se o cache foi populado (`response.timings.duration < 200ms`)

**Configuração:** 1 VU, 1 iteração, max 30s. Threshold: `http_req_failed < 50%`.

**Observação:** Deve ser executado **antes** do `cache-performance-test.js`.

---

### 4.2 `cache-performance-test.js`

**Localização:** `load-tests/performance/cache-performance-test.js`

**Propósito:** Medir a eficácia do cache comparando tempos de resposta em cenários com cache quente.

**Funcionalidades:**
- Setup próprio: health check + login manual (não usa `helpers/auth.js`)
- **Teste Settings (autenticado):** GET `${BASE_URL}/api/settings` — rota usa `getOrSetCache` com chave `settings:v1:all`
- **Teste Posts (público):** GET `${BASE_URL}/api/posts` — rota usa `getOrSetCache` com chave `posts:public:all`
- Verifica status 200, validade do body e latência < 100ms (cache hit)

**Configuração:** 4 estágios (warm-up 1 VU → 5 VUs → 50 VUs → 0). Thresholds rigorosos:
- `posts cache hit (<100ms)`: rate > 99.9%
- `settings cache hit (<100ms)`: rate > 99.0%
- p(95) < 500ms e avg < 200ms para requisições cacheadas

**Observação:** Explicitamente **não** utiliza IP spoofing — o IP local (127.0.0.1) está na whitelist de rate limit.

---

### 4.3 `authenticated-flow-test.js`

**Localização:** `load-tests/performance/authenticated-flow-test.js`

**Propósito:** Validar que rotas protegidas por autenticação funcionam sob carga moderada.

**Funcionalidades:**
- Setup via `helpers/auth.js`
- GET em `${BASE_URL}/api/settings?key=site_name` com token Bearer
- Valida status 200

**Configuração:** 3 VUs, 3 estágios (10s/20s/5s). Thresholds: p(95) < 2000ms, checks > 95%, failed < 10%.

---

### 4.4 `create-post-flow.js`

**Localização:** `load-tests/performance/create-post-flow.js`

**Propósito:** Testar a criação de posts no blog sob carga, com limpeza automática de dados de teste.

**Funcionalidades:**
- Setup via `helpers/auth.js`
- Gera payload único por iteração (title + slug com timestamp + random) para evitar violação de constraints UNIQUE
- POST em `${BASE_URL}/api/admin/posts` com token Bearer
- **Teardown:** Lista posts com "K6" no título e deleta todos, evitando poluição do banco de dados

**Configuração:** 3 VUs, 3 estágios (10s/15s/5s). Thresholds: p(95) < 2000ms, checks > 95%, failed < 10%.

---

### 4.5 `pagination-test.js`

**Localização:** `load-tests/performance/pagination-test.js`

**Propósito:** Validar a paginação offset-based (page + limit) para posts públicos.

**Funcionalidades:**
- GET em `${BASE_URL}/api/posts?page=1&limit=5` e `${BASE_URL}/api/posts?page=2&limit=5`
- Helper `extractArray()` que suporta 3 formatos de resposta: `{ data }`, `{ rows }`, array direto
- Validação cruzada de IDs entre páginas usando loops ES5.1 (compatível com goja/k6)
- Soft pass se página 2 estiver vazia

**Observação:** Usa sintaxe ES5.1 (`for` loops, `var`, `function()`) por compatibilidade com o runtime goja do k6. Difere do `posts-cursor-pagination-test.js` que testa cursor-based pagination.

---

### 4.6 `stress-test-combined.js`

**Localização:** `load-tests/performance/stress-test-combined.js`

**Propósito:** Teste de estresse mais robusto da suíte, com múltiplos cenários executados simultaneamente.

**Funcionalidades:**
- **2 cenários paralelos** via `scenarios` do k6:
  1. `stress_test` — Ramp-up progressivo (20 → 50 → 100 VUs) executando CRUD completo de vídeos
  2. `memory_monitor` — 1 VU constante por 5 minutos monitorando métricas de memória do Node.js
- Setup via `helpers/auth.js`
- Teardown com paginação completa e loop `while` para capturar todos os registros de teste por prefixo `[TEST-K6]`
- Gera relatório JSON + HTML (via `k6-reporter`)

**Métricas customizadas:**
- `nodejs_memory_rss_bytes` — Memória RSS do Node.js
- `nodejs_memory_heap_total_bytes` — Heap total
- `nodejs_memory_heap_used_bytes` — Heap usado (threshold: max < 1GB)
- `stress_iterations` — Contador de iterações de estresse

**Configuração:** Perfil `stress` — ~5 minutos de duração total.

---

### 4.7 a 4.12 — Testes de Músicas

Conjunto de 6 testes para o recurso de músicas, todos implementados via `resource-test-runner.js` (factory pattern).

#### 4.7 `musicas-crud-test.js`

**Localização:** `load-tests/performance/musicas-crud-test.js`

**Propósito:** Testar ciclo CRUD completo de músicas (POST → PUT → DELETE).

**Funcionalidades:**
- Setup via `helpers/auth.js`
- Cria música com dados únicos, atualiza título, deleta
- Teardown: limpa músicas com "K6" no título
- Métricas: `musicas_create_errors`, `musicas_update_errors`, `musicas_delete_errors`

#### 4.8 `musicas-load-test.js`

**Localização:** `load-tests/performance/musicas-load-test.js`

**Propósito:** Testar listagem administrativa de músicas sob carga progressiva.

**Funcionalidades:**
- Setup com health check + login
- GET em `${BASE_URL}/api/admin/musicas`
- Valida retorno de array e latência < 300ms

#### 4.9 `musicas-filter-test.js`

**Localização:** `load-tests/performance/musicas-filter-test.js`

**Propósito:** Testar filtro de músicas por artista.

**Funcionalidades:**
- GET em `${BASE_URL}/api/musicas?search={artista}`
- Artistas: `['Aline Barros', 'Fernandinho', 'Gabriela Rocha', 'Diante do Trono', 'Preto no Branco']`

#### 4.10 `musicas-search-test.js`

**Localização:** `load-tests/performance/musicas-search-test.js`

**Propósito:** Testar busca textual em músicas por título.

**Funcionalidades:**
- GET em `${BASE_URL}/api/musicas?search={termo}`
- Termos: `['Graça', 'Santo', 'Amor', 'Vida', 'Caminho', 'Luz']`
- Validação de match no campo `titulo`/`title`

**⚠️ Duplicidade com `musicas-filter-test.js`:** Ambos testam o mesmo endpoint (`/api/musicas?search=`) com a mesma lógica de filtro por termo. A única diferença são os valores de busca (artistas vs. termos genéricos). Poderiam ser unificados em um único teste com lista combinada de search values.

#### 4.11 `musicas-pagination-test.js`

**Localização:** `load-tests/performance/musicas-pagination-test.js`

**Propósito:** Testar paginação do endpoint público de músicas.

**Funcionalidades:**
- GET em `${BASE_URL}/api/musicas?page=1&limit=5` e `page=2&limit=5`
- Response path: `data`

#### 4.12 `musicas-sort-test.js`

**Localização:** `load-tests/performance/musicas-sort-test.js`

**Propósito:** Testar ordenação de músicas por data de criação (recentes primeiro).

**Funcionalidades:**
- GET em `${BASE_URL}/api/musicas?sort=recent`
- Valida ordem decrescente por `created_at`

---

### 4.13 a 4.17 — Testes de Vídeos

Conjunto de 5 testes para o recurso de vídeos (análogos aos de músicas, exceto sem teste de search).

#### 4.13 `videos-crud-test.js`

**Localização:** `load-tests/performance/videos-crud-test.js`

**Propósito:** Testar ciclo CRUD completo de vídeos.

**Funcionalidades:**
- Análogo a `musicas-crud-test.js`, porém para endpoint `/api/admin/videos`
- Gera URL do YouTube aleatória como payload

#### 4.14 `videos-load-test.js`

**Localização:** `load-tests/performance/videos-load-test.js`

**Propósito:** Testar listagem pública de vídeos sob carga, com 2 requisições por iteração (páginas 1 e 2).

**Funcionalidades:**
- GET em `${BASE_URL}/api/videos` (página 1) + `${BASE_URL}/api/videos?page=2&limit=5` (página 2)
- Valida metadados de paginação (`pagination.page === 2`, `pagination.limit === 5`)

**⚠️ Sobreposição com `videos-pagination-test.js`:** `videos-load-test.js` já testa paginação como parte de sua execução (requisições para página 1 e 2), o que sobrepõe parcialmente o propósito do `videos-pagination-test.js`.

#### 4.15 `videos-filter-test.js`

**Localização:** `load-tests/performance/videos-filter-test.js`

**Propósito:** Testar filtro de vídeos por termo de busca.

**Funcionalidades:**
- GET em `${BASE_URL}/api/videos?search={termo}`
- Termos: `['louvor', 'adoração', 'testemunho', 'pregação', 'estudo']`

#### 4.16 `videos-pagination-test.js`

**Localização:** `load-tests/performance/videos-pagination-test.js`

**Propósito:** Testar paginação de vídeos.

**Funcionalidades:**
- GET em `${BASE_URL}/api/videos?page=1&limit=5` e `page=2&limit=5`
- Items path: `data`

#### 4.17 `videos-sort-test.js`

**Localização:** `load-tests/performance/videos-sort-test.js`

**Propósito:** Testar ordenação de vídeos por data de criação.

**Funcionalidades:**
- GET em `${BASE_URL}/api/videos?sort=created_at&order=desc`
- Items path: `data`

---

## 5. Testes de Segurança

Testes focados em vulnerabilidades e mecanismos de proteção da API.

### 5.1 `login-negative-test.js`

**Localização:** `load-tests/security/login-negative-test.js`

**Propósito:** Garantir que credenciais inválidas sejam rejeitadas e que não haja vazamento de informações sobre usuários existentes.

**Funcionalidades:**
- **Cenário 1 — Senha incorreta:** POST com usuário existente e senha errada
- **Cenário 2 — Usuário inexistente:** POST com credenciais totalmente inválidas
- Valida status 401, 400 ou 429 (rejeição)

**Configuração:** 3 estágios (10s/30s/10s), 10 VUs. Thresholds: p(95) < 1000ms, checks > 95%.

---

### 5.2 `rate-limit-test.js`

**Localização:** `load-tests/security/rate-limit-test.js`

**Propósito:** Verificar se o mecanismo de rate limit da API está funcionando, retornando 429 quando o limite é excedido.

**Funcionalidades:**
- POST em `${BASE_URL}/api/auth/login` com credenciais aleatórias
- Headers simulando IP externo: `X-Forwarded-For`, `X-Real-IP`, `CF-Connecting-IP`, `True-Client-IP`
- Métrica `RateLimitHits` (Counter) para contar bloqueios
- Sem `sleep()` para maximizar taxa de requisições
- Exibe aviso se nenhum rate limit foi acionado durante o teste

**Observação:** Atualmente usa IP fixo `203.0.113.1` para todos os VUs, o que pode não ser suficiente para evitar whitelist de localhost.

---

### 5.3 `ip-spoofing-test.js`

**Localização:** `load-tests/security/ip-spoofing-test.js`

**Propósito:** Validar se o sistema está protegido contra evasão de rate limit via rotação do header `X-Forwarded-For`.

**Funcionalidades:**
- Gera IP aleatório via `getRandomIP()` a cada iteração
- POST em `${BASE_URL}/api/auth/login` com `X-Forwarded-For` falsificado e senha inválida
- **Duas categorias de checks:**
  - **Proteção:** `403` (spoofing detectado) ou `429` (rate limit global)
  - **Vulnerabilidade:** `401` (spoofing burlou rate limit)

**Estado atual documentado:** Sistema está **VULNERÁVEL** — 66.67% das respostas indicam que o spoofing não foi detectado.

---

### 5.4 `ddos-search-test.js`

**Localização:** `load-tests/security/ddos-search-test.js`

**Propósito:** Testar resiliência contra ataques de busca massiva no endpoint de posts.

**Funcionalidades:**
- GET em `${BASE_URL}/api/posts?search={termo}&_t={timestamp}` com cache busting
- 500 VUs simultâneos sem `sleep()` para máxima taxa de requisições
- Métrica `ErrorRate500` com `abortOnFail: true` (delay 5s) se erros 5xx > 10%
- Três checks documentados: RESISTIU (200), BLOQUEADO (429), VULNERÁVEL (5xx)

**Estado atual documentado:** Servidor **NÃO** aciona rate limit para buscas, mesmo com 500 VUs.

---

> **Data da análise:** 28/06/2026
> **Total de arquivos analisados:** 30 scripts k6 (9 functional + 17 performance + 4 security) + 7 módulos helpers