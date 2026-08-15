# 📊 Análise dos Arquivos de Teste de Carga — `/load-tests`

> **Propósito:** Documentação detalhada de todos os arquivos da pasta `load-tests/`, descrevendo o que cada um faz, seu propósito, estrutura e endpoints utilizados. Os scripts estão organizados em 4 subpastas: `helpers/`, `performance/`, `functional/` e `security/`.

---

## Sumário

1. [Visão Geral](#visão-geral)
2. [Subpasta helpers/ — Módulos Compartilhados](#subpasta-helpers--módulos-compartilhados)
3. [Subpasta performance/ — Carga, Stress e Performance](#subpasta-performance--carga-stress-e-performance)
4. [Subpasta functional/ — Validação Funcional](#subpasta-functional--validação-funcional)
5. [Subpasta security/ — Segurança](#subpasta-security--segurança)
6. [Arquivos Relacionados Fora da Pasta `load-tests/`](#arquivos-relacionados-fora-da-pasta-load-tests)
7. [Padrões e Convenções Comuns](#padrões-e-convenções-comuns)

---

## Visão Geral

A pasta `load-tests/` contém **37 arquivos** (30 scripts de teste k6 + 7 módulos helpers) que compõem a suíte de testes de carga, stress, performance e segurança do projeto **Caminhar**. Todos os scripts utilizam a ferramenta [k6](https://k6.io/) da Grafana Labs.

| Subpasta | Qtd | Descrição |
|----------|-----|-----------|
| **helpers/** | 7 | Módulos compartilhados (auth, config, network, profiles, report, resource-test-runner, sleep) |
| **performance/** | 17 | Testes de carga, stress, performance e fluxos combinados |
| **functional/** | 9 | Testes funcionais e de validação |
| **security/** | 4 | Testes de segurança (rate limit, spoofing, DDoS, login negativo) |

**Arquivos fora da pasta** que integram o ecossistema de load tests:
- `load-tests.yml` — Workflow CI/CD do GitHub Actions
- `scripts/run-all-load-tests-sequentially.js` — Orquestrador que executa todos os 30 scripts
- `scripts/run-load-tests.sh` — Wrapper bash do orquestrador
- `scripts/clean-load-test-posts.js` — Limpeza de posts de teste no banco
- `scripts/clear-test-auth-locks.js` — Limpeza de bloqueios de autenticação no Redis
- `scripts/generate-load-report.js` — Geração de relatório HTML consolidado
- `scripts/clean-k6-reports.js` — Limpeza de relatórios k6 antigos
- `scripts/clean-test-db.js` — Limpeza de bancos de dados de teste
- `scripts/utils/cleanup.js` — Utilitário de limpeza por padrão LIKE
- `scripts/utils/constants.js` — Constantes compartilhadas
- `scripts/utils/load-env.js` — Carregamento de variáveis de ambiente
- `scripts/check-sql-injection.js` — Verificação de SQL injection (apoio à segurança)

---

## Subpasta helpers/ — Módulos Compartilhados

Contém 7 módulos que centralizam lógica comum, eliminando duplicação entre os scripts de teste.

### `config.js`

**Localização:** `/load-tests/helpers/config.js`

**O que faz:** Centraliza a leitura de variáveis de ambiente com fallback para os testes k6.

**Propósito:** Eliminar a duplicação de declarações `BASE_URL`, `USERNAME` e `PASSWORD` que existiam em cada script individualmente.

**Exports:**
- `getConfig()` — Retorna objeto `{ BASE_URL, USERNAME, PASSWORD }`
- `BASE_URL` — Lê de `__ENV.BASE_URL` com fallback para `'http://localhost:3000'`
- `USERNAME` — Lê de `__ENV.ADMIN_USERNAME` com fallback para `'admin'`
- `PASSWORD` — Lê de `__ENV.ADMIN_PASSWORD` com fallback para `'123456'`

> **Nota:** O fallback de senha permanece como `'123456'` intencionalmente para facilitar desenvolvimento local. Em CI, as credenciais são fornecidas via secrets.

---

### `auth.js`

**Localização:** `/load-tests/helpers/auth.js`

**O que faz:** Centraliza a lógica de autenticação (login + extração de token JWT) para todos os scripts administrativos.

**Propósito:** Eliminar a duplicação da função `setup()` com POST `/api/auth/login` que existia em ~18 arquivos.

**Exports:**
- `setup(options)` — Realiza login com credenciais e retorna `{ token }`. Aceita `baseUrl`, `username` e `password` como opções. Valida estrutura da resposta e lança erro descritivo se o formato for inesperado.

**Validações:**
- Verifica se `loginRes.status === 200` antes de processar
- Verifica se `body`, `body.data` e `body.data.token` existem
- Lança `Error` com mensagem descritiva em caso de falha

---

### `network.js`

**Localização:** `/load-tests/helpers/network.js`

**O que faz:** Módulo compartilhado com funções utilitárias de rede.

**Propósito:** Centralizar a função `getRandomIP()` que estava duplicada em 5 arquivos.

**Exports:**
- `getRandomIP()` — Gera um endereço IPv4 aleatório no formato `x.x.x.x`

> **Nota:** IP spoofing é usado nos testes para evitar rate limit. Consulte o UPGRADE_load-tests.md para discussão sobre segurança disso.

---

### `profiles.js`

**Localização:** `/load-tests/helpers/profiles.js`

**O que faz:** Define perfis de carga padronizados com thresholds consistentes.

**Propósito:** Garantir thresholds consistentes e configurações de carga reutilizáveis, eliminando declarações inline espalhadas.

**Perfis disponíveis:**

| Perfil | VUs | Duração | Thresholds | Uso Típico |
|--------|-----|---------|-----------|------------|
| `light` | 1 | 5 iterações | checks=100%, p(95)<500ms | Testes funcionais e CRUD |
| `medium` | 5 | 20s (5+10+5) | p(95)<1000ms, failed<5% | Carga moderada |
| `heavy` | 50 | 50s (10+30+10) | p(95)<3000ms, failed<10% | Estresse |
| `health` | 20 | 20s (5+10+5) | p(95)<500ms, failed<2% | Health check |
| `recovery` | 1 | 2min constante | Nenhum (thresholds vazios) | Monitoramento de recuperação |
| `stress` | 0→20→50→100 | 4m50s (ramp-up/estabilização) | p(95)<3000ms, failed<10%, checks>95%, heap<1GB | Stress test combinado com 2 cenários paralelos |
| `rateLimit` | 0→50 | 50s (10+30+10) | Nenhum (thresholds vazios) | Brute force |

**Exports:**
- `PROFILES` — Objeto com todos os perfis
- `getProfile(profileName, overrides)` — Retorna perfil mesclado com sobrescritas. Se `overrides.thresholds` for fornecido explicitamente, substitui completamente os thresholds do perfil base.

---

### `report.js`

**Localização:** `/load-tests/helpers/report.js`

**O que faz:** Centraliza a geração padronizada de relatórios de teste k6.

**Propósito:** Eliminar a duplicação da lógica de `handleSummary()` que existia em ~18 arquivos.

**Exports:**
- `generateReport(data, testName)` — Gera objeto de saída com `stdout` (textSummary) e arquivo JSON em `./reports/k6-summaries/<testName>.json`, com sanitização automática do token JWT.

**Segurança:**
- A função interna `sanitizeToken()` substitui o token JWT por `*** TOKEN OCULTO ***` antes de exportar os dados, garantindo que todos os arquivos que usam `generateReport()` sanitizem automaticamente.

> **Nota:** Utiliza versão fixa `https://jslib.k6.io/k6-summary/0.0.4/index.js` — versão fixa é mais segura que `latest` para evitar breaking changes.

---

### `sleep.js`

**Localização:** `/load-tests/helpers/sleep.js`

**O que faz:** Fornece função de sleep randomizado para simular comportamento real de usuário.

**Propósito:** Substituir `sleep()` com valores fixos por intervalos aleatórios que simulam melhor o comportamento real de usuários (tempo de pensamento e ação variáveis).

**Exports:**
- `randomSleep(min = 0.5, max = 3)` — Executa `sleep()` com duração aleatória entre `min` e `max`.

---

### `resource-test-runner.js`

**Localização:** `/load-tests/helpers/resource-test-runner.js`

**O que faz:** Módulo genérico que elimina a duplicação de código entre pares de testes de músicas e vídeos (CRUD, filtro, paginação, ordenação, carga).

**Propósito:** Eliminar ~80% de código duplicado entre os 10 arquivos de teste de músicas e vídeos, centralizando a lógica comum e mantendo apenas a configuração específica de cada recurso.

**Exports:**

| Função | Configurações Principais | Descrição |
|--------|-------------------------|-----------|
| `createCrudTest(config)` | `adminEndpoint`, `payloadTemplate`, `resourceName`, `uniqueIdGenerator`, `profileName` | Gera options + default() para teste CRUD (create/update/delete) com métricas de erro e sleep entre operações |
| `createFilterTest(config)` | `publicEndpoint`, `searchField`, `searchValues[]`, `responsePath`, `resourceName` | Gera options + default() para teste de filtro por termo de busca com validação de match |
| `createPaginationTest(config)` | `publicEndpoint`, `itemsPath`, `responsePath`, `resourceName`, `limit` | Gera options + default() para teste de paginação com validação cruzada de IDs entre páginas |
| `createSortTest(config)` | `publicEndpoint`, `sortMode`/`sortField`+`sortOrder`, `itemsPath`, `dateField` | Gera options + default() para teste de ordenação (explícita ou comportamento padrão) com verificação de datas |
| `createLoadTest(config)` | `endpoint`, `requireAuth`, `useSpoofIP`, `healthCheck`, `checkResponse`, `extraRequests[]` | Gera options + setup() + default() para teste de carga com suporte a health check, IP spoofing e requisições extras |
| `sanitizeToken(data)` | — | Oculta token JWT em relatórios (re-export de `report.js`) |
| `generateReport(data, testName)` | — | Re-export de `helpers/report.js` |

**Funcionalidades internas:**
- `createCrudDefault` — Implementa lazy login com cache de token, extração de ID com suporte a múltiplos formatos de resposta (`{id}`, `{data:{id}}`, `{data:{resource:{id}}}`), e geração de payload com placeholders.
- `createFilterDefault` — Suporta caminhos aninhados de resposta (`data.musicas`), validação de match do termo no título/artista.
- `createPaginationDefault` — Validação cruzada de IDs entre páginas 1 e 2, soft pass se página 2 vazia.
- `createSortDefault` — Suporta dois formatos de URL: `sort=<mode>` (API músicas) e `sort=<field>&order=<order>` (API vídeos).
- `createLoadSetup` — Health check opcional + login com validação de Content-Type.
- `createLoadDefault` — Requisição principal com tags nomeadas + requisições extras (ex: página 2).

---

## Subpasta performance/ — Carga, Stress e Performance

Contém 17 scripts de teste de carga, stress e performance.

### Testes de Músicas (6 arquivos)

#### `musicas-crud-test.js`

**Localização:** `/load-tests/performance/musicas-crud-test.js`

**O que faz:** Testa as operações CRUD (Create, Update, Delete) para o recurso de músicas via runner genérico.

**Propósito:** Validar o ciclo de vida completo de uma música na API administrativa.

**Estrutura:**
- `setup()` — Login via `helpers/auth.js`
- `default()` — Via `createCrudTest()`: POST (criar) → PUT (atualizar) → DELETE
- `teardown()` — Limpa músicas K6 fantasmas deixadas por VUs interrompidos
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `POST /api/admin/musicas` — Criar música
- `PUT /api/admin/musicas` — Atualizar música
- `DELETE /api/admin/musicas` — Deletar música
- `GET /api/admin/musicas?limit=100` — Listar músicas (teardown)

**Configuração de carga:** Perfil `light` customizado (5 VUs, estágios 10s/20s/10s)

---

#### `musicas-filter-test.js`

**Localização:** `/load-tests/performance/musicas-filter-test.js`

**O que faz:** Testa o filtro de músicas por termo de busca (artista) via runner genérico.

**Propósito:** Validar que o endpoint público de músicas filtra corretamente os resultados com base no parâmetro `search`.

**Estrutura:**
- Rota pública (sem autenticação) — GET `/api/musicas?search={artista}`
- Array de artistas: `['Aline Barros', 'Fernandinho', 'Gabriela Rocha', 'Diante do Trono', 'Preto no Branco']`
- Valida que os itens retornados contêm o termo buscado
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Endpoints chamados:**
- `GET /api/musicas?search={termo}` — Listar com filtro

---

#### `musicas-load-test.js`

**Localização:** `/load-tests/performance/musicas-load-test.js`

**O que faz:** Teste de carga que simula múltiplos usuários acessando a listagem admin de músicas simultaneamente, via runner genérico.

**Propósito:** Validar o comportamento da API `/api/admin/musicas` sob carga progressiva, garantindo thresholds de performance.

**Estrutura:**
- Configuração: perfil `medium` do `helpers/profiles.js`
- `setup()` — Login com validação de Content-Type (health check desativado)
- `checkResponse` — Valida lista de músicas (array) e tempo de resposta < 300ms
- Threshold específico: `http_req_duration{name:ListMusicas}` p(95)<500ms
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `GET /api/admin/musicas` — Listar músicas (rota admin)

---

#### `musicas-pagination-test.js`

**Localização:** `/load-tests/performance/musicas-pagination-test.js`

**O que faz:** Testa a paginação do endpoint público de músicas via runner genérico.

**Propósito:** Validar que a paginação funciona corretamente, retornando IDs distintos entre páginas.

**Estrutura:**
- Rota pública (sem autenticação)
- 1 VU, 1 iteração: Página 1 → sleep → Página 2
- Validação cruzada: IDs da página 1 vs página 2 (não devem se repetir)
- Soft pass se página 2 estiver vazia (poucos dados no banco)
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Endpoints chamados:**
- `GET /api/musicas?page=1&limit=5` — Listar página 1
- `GET /api/musicas?page=2&limit=5` — Listar página 2

---

#### `musicas-search-test.js`

**Localização:** `/load-tests/performance/musicas-search-test.js`

**O que faz:** Testa a busca textual no endpoint de músicas com diferentes termos.

**Propósito:** Garantir que a busca por título retorne resultados relevantes.

**Estrutura:**
- Rota pública (sem autenticação) — GET `/api/musicas?search={termo}`
- Termos de busca: `['Graça', 'Santo', 'Amor', 'Vida', 'Caminho', 'Luz']`
- Warm-up na primeira iteração para aquecer cache do servidor
- Valida status 200, estrutura de resposta e match do termo no título
- Threshold específico: `http_req_duration{name:SearchMusicas}` p(95)<800ms, avg<500ms
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Endpoints chamados:**
- `GET /api/musicas?search={termo}` — Buscar músicas

---

#### `musicas-sort-test.js`

**Localização:** `/load-tests/performance/musicas-sort-test.js`

**O que faz:** Testa a ordenação dos resultados de músicas via runner genérico.

**Propósito:** Validar que o endpoint público de músicas ordena corretamente os resultados.

**Estrutura:**
- Rota pública (sem autenticação) — `sort=recent` (novo formato da API músicas)
- Valida que as datas estão em ordem decrescente
- Soft pass se poucos dados no banco (inconclusivo)
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Endpoints chamados:**
- `GET /api/musicas?sort=recent` — Listar ordenado

---

### Testes de Vídeos (5 arquivos)

#### `videos-crud-test.js`

**Localização:** `/load-tests/performance/videos-crud-test.js`

**O que faz:** Testa as operações CRUD para o recurso de vídeos via runner genérico.

**Propósito:** Validar o ciclo de vida completo de um vídeo: criar, atualizar e deletar.

**Estrutura:**
- `setup()` — Login via `helpers/auth.js`
- `default()` — Via `createCrudTest()`: POST (criar) → PUT (atualizar) → DELETE
- `teardown()` — Limpa vídeos K6 fantasmas deixados por VUs interrompidos
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `POST /api/admin/videos` — Criar vídeo
- `PUT /api/admin/videos` — Atualizar vídeo
- `DELETE /api/admin/videos` — Deletar vídeo
- `GET /api/admin/videos?limit=100` — Listar vídeos (teardown)

**Configuração de carga:** Perfil `light` customizado (3 VUs, estágios 10s/20s/5s)

---

#### `videos-filter-test.js`

**Localização:** `/load-tests/performance/videos-filter-test.js`

**O que faz:** Testa o filtro de vídeos por termo de busca (título/descrição) via runner genérico.

**Propósito:** Validar que o endpoint público de vídeos filtra corretamente os resultados com base no parâmetro `search`.

**Estrutura:**
- Rota pública (sem autenticação) — GET `/api/videos?search={termo}`
- Array de termos: `['louvor', 'adoração', 'testemunho', 'pregação', 'estudo']`
- Valida que os itens retornados contêm o termo buscado
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Endpoints chamados:**
- `GET /api/videos?search={termo}` — Listar com filtro

---

#### `videos-load-test.js`

**Localização:** `/load-tests/performance/videos-load-test.js`

**O que faz:** Teste de carga que simula múltiplos usuários acessando a listagem pública de vídeos, com 2 requisições por iteração (páginas 1 e 2), via runner genérico.

**Propósito:** Validar a performance da API de vídeos sob carga progressiva.

**Estrutura:**
- Configuração: perfil `medium` do `helpers/profiles.js`
- Exporta `setup()` — executa login com validação de Content-Type (health check desativado)
- `default()` — GET `/api/videos` (página 1) + GET `/api/videos?page=2&limit=5` (página 2)
- Valida metadados de paginação (page=2, limit=5)
- Thresholds específicos: `http_req_duration{name:ListVideos_Page1}` e `{name:ListVideos_Page2}` p(95)<500ms, `checks` rate>0.95
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Endpoints chamados:**
- `GET /api/videos` — Listar vídeos (página 1)
- `GET /api/videos?page=2&limit=5` — Listar vídeos (página 2)

> **Nota técnica:** O arquivo define `requireAuth: true` na configuração e agora exporta `setup()`, portanto o login é executado e o header `Authorization` é enviado. Embora `/api/videos` seja um endpoint público, a autenticação é aplicada de forma consistente com os demais testes de carga.

---

#### `videos-pagination-test.js`

**Localização:** `/load-tests/performance/videos-pagination-test.js`

**O que faz:** Testa a paginação do endpoint público de vídeos via runner genérico.

**Propósito:** Validar que a paginação funciona corretamente, retornando IDs distintos entre páginas.

**Estrutura:**
- Rota pública (sem autenticação)
- 1 VU, 1 iteração: Página 1 → sleep → Página 2
- Validação cruzada: IDs da página 1 vs página 2 (não devem se repetir)
- Soft pass se página 2 estiver vazia
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Endpoints chamados:**
- `GET /api/videos?page=1&limit=5` — Listar página 1
- `GET /api/videos?page=2&limit=5` — Listar página 2

---

#### `videos-sort-test.js`

**Localização:** `/load-tests/performance/videos-sort-test.js`

**O que faz:** Testa a ordenação padrão dos resultados de vídeos via runner genérico.

**Propósito:** Validar que o endpoint público de vídeos ordena corretamente os resultados por data de criação decrescente.

**Estrutura:**
- Rota pública (sem autenticação) — `sort=created_at&order=desc` (formato antigo da API vídeos)
- Valida que as datas estão em ordem decrescente
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Endpoints chamados:**
- `GET /api/videos?sort=created_at&order=desc` — Listar ordenado

---

### Testes de Posts e Fluxos (4 arquivos)

#### `pagination-test.js`

**Localização:** `/load-tests/performance/pagination-test.js`

**O que faz:** Teste funcional de paginação baseada em page/offset para posts públicos.

**Propósito:** Validar o funcionamento do sistema de paginação offset-based (page + limit), verificando que páginas diferentes retornam IDs distintos.

**Estrutura:**
- Rota pública (sem autenticação) — GET `/api/posts?page=1&limit=5` e `page=2&limit=5`
- Helper `extractArray()` suporta múltiplos formatos de resposta: `{data: [...]}`, `{success, data, pagination}`, array direto, `{rows: [...]}`
- Validação cruzada ES5.1-compatible (k6/goja não suporta `.some()`/`.includes()`)
- Soft pass se página 2 estiver vazia
- `handleSummary()` — Gera relatório via `helpers/report.js`
- Configuração: perfil `light` do `helpers/profiles.js`

**Endpoints chamados:**
- `GET /api/posts?page={n}&limit={n}` — Paginação offset-based

---

#### `authenticated-flow-test.js`

**Localização:** `/load-tests/performance/authenticated-flow-test.js`

**O que faz:** Testa o fluxo completo de autenticação: login com credenciais de admin, obtenção de token JWT e acesso a uma rota protegida.

**Propósito:** Validar que o fluxo de autenticação funciona corretamente sob carga.

**Estrutura:**
- `setup()` — Login via `helpers/auth.js`
- `default()` — Acessa rota protegida `/api/settings?key=site_name` com token Bearer
- Thresholds: p(95)<2000ms, checks{flow:get_settings}>95%, http_req_failed<10%
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `GET /api/settings?key=site_name` — Rota protegida (requer token Bearer)

**Configuração de carga:** 3 VUs, estágios 10s/20s/5s

---

#### `create-post-flow.js`

**Localização:** `/load-tests/performance/create-post-flow.js`

**O que faz:** Testa o fluxo completo de criação de posts no blog: login → criação → limpeza.

**Propósito:** Validar o processo de criação de posts no blog, garantindo que o endpoint `POST /api/admin/posts` funcione corretamente sob carga e que dados de teste sejam limpos após a execução.

**Estrutura:**
- `setup()` — Login via `helpers/auth.js`
- `default()` — Cria post com título e slug únicos (com sufixo aleatório `Math.random().toString(36).substr(2, 9)` para garantir unicidade absoluta)
- `teardown()` — Lista posts com `K6` no título e os remove via DELETE, evitando poluição do banco
- Thresholds: p(95)<2000ms para create_post, checks{flow:create_post}>95%, http_req_failed<10%
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `POST /api/admin/posts` — Criação de post
- `GET /api/admin/posts?limit=100` — Listar posts (teardown)
- `DELETE /api/admin/posts?id={id}` — Deletar post (teardown)

**Configuração de carga:** 3 VUs, estágios 10s/15s/5s

---

#### `stress-test-combined.js`

**Localização:** `/load-tests/performance/stress-test-combined.js`

**O que faz:** Teste de estresse combinado com múltiplos cenários executados simultaneamente. É o teste mais robusto e completo da suíte.

**Propósito:** Simular cenário realista de produção com:
- CRUD de vídeos sob carga crescente (20 → 50 → 100 VUs)
- Monitoramento de memória do Node.js durante todo o teste

**Estrutura:**
- **2 cenários paralelos** via `scenarios` do k6:
  1. `stress_test` — Ramp-up progressivo (20, 50, 100 VUs), executa CRUD completo de vídeos
  2. `memory_monitor` — 1 VU constante por 5 min monitorando memória do Node.js
- `setup()` — Login via `helpers/auth.js`
- `teardown()` — Limpa dados de teste com paginação completa e identificador robusto `[TEST-K6]`
- `handleSummary()` — Gera relatório via `helpers/report.js` + relatório HTML via `htmlReport`

**Métricas customizadas:**
- `nodejs_memory_rss_bytes` — Memória RSS
- `nodejs_memory_heap_total_bytes` — Heap total
- `nodejs_memory_heap_used_bytes` — Heap usado (threshold: max < 1GB)
- `stress_iterations` — Contador de iterações de estresse

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `POST /api/admin/videos` — Criar vídeo
- `PUT /api/admin/videos` — Atualizar vídeo
- `DELETE /api/admin/videos` — Deletar vídeo
- `GET /api/status` — Status do servidor (monitoramento de memória)
- `GET /api/admin/videos?limit=100&page={n}` — Listar vídeos com paginação (teardown)

**Configuração de carga:** Perfil `stress` do `helpers/profiles.js`

---

### Testes de Cache (2 arquivos)

#### `cache-warmup-test.js`

**Localização:** `/load-tests/performance/cache-warmup-test.js`

**O que faz:** Teste de warm-up do cache que popula o cache (Redis e/ou memória) com dados antes dos testes de performance principais.

**Propósito:** Garantir que o cache esteja quente antes do `cache-performance-test`, para que as métricas reflitam o comportamento com cache populado.

**Estrutura:**
- 1 VU, 1 iteração, cenário `per-vu-iterations`
- 4 endpoints aquecidos (posts, posts paginados, settings) × 5 rounds cada
- `verifyCachePopulated()` — Requisição extra de confirmação (status 200 e duração < 200ms)
- Thresholds: apenas `http_req_failed rate<0.50` (sem thresholds de latência agressivos)

**Endpoints chamados:**
- `GET /api/posts` — Listagem pública de posts
- `GET /api/posts?page=1&limit=10` — Posts paginados
- `GET /api/posts?page=2&limit=5` — Posts paginados
- `GET /api/settings` — Configurações (requer auth)

---

#### `cache-performance-test.js`

**Localização:** `/load-tests/performance/cache-performance-test.js`

**O que faz:** Teste comparativo de performance entre requisições cacheadas e não cacheadas.

**Propósito:** Medir a eficácia do cache, validando que respostas cacheadas são significativamente mais rápidas.

**Estrutura:**
- `setup()` — Health check + login com validação de Content-Type
- `default()` — 2 cenários:
  1. Settings (autenticado + cache) — GET `/api/settings`
  2. Posts (público + cache) — GET `/api/posts`
- Checks de cache hit: duração < 100ms
- Thresholds específicos por tipo:
  - `http_req_duration{type:cached_settings}` p(95)<500ms, avg<200ms
  - `http_req_duration{type:cached_posts}` p(95)<500ms, avg<200ms
  - `checks{check:posts cache hit (<100ms)}` rate>0.999
  - `checks{check:settings cache hit (<100ms)}` rate>0.990
- **Não usa spoofing de IP** — comentário explica que IP local está na whitelist de rate limit e testes de cache devem testar cache, não evasão de rate limit

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `GET /api/settings` — Configurações (autenticado + cache)
- `GET /api/posts` — Posts (público + cache)

**Configuração de carga:** Estágios 5s/5s/10s/5s (1→5→50 VUs)

---

## Subpasta functional/ — Validação Funcional

Contém 9 scripts de teste funcional e validação.

### `health-check.js`

**Localização:** `/load-tests/functional/health-check.js`

**O que faz:** Teste de carga específico para o endpoint de health check da API.

**Propósito:** Verificar se o endpoint `GET /api/status?mode=health` responde corretamente sob carga crescente (até 20 usuários) e respeita SLAs rigorosos de tempo de resposta.

**Estrutura:**
- Configuração: perfil `health` do `helpers/profiles.js`
- Rota pública (sem autenticação) — GET `/api/status?mode=health`
- Valida status 200 e body com `status === 'ok'`
- **Não possui `handleSummary()`** (teste leve sem geração de relatório)

**Endpoints chamados:**
- `GET /api/status?mode=health` — Health check

---

### `backup-verification-test.js`

**Localização:** `/load-tests/functional/backup-verification-test.js`

**O que faz:** Teste funcional para verificar a listagem de backups, validando a estrutura JSON de resposta.

**Propósito:** Garantir que o endpoint de backups retorne a estrutura esperada com campos como `backups` e `latest`.

**Estrutura:**
- `setup()` — Login via `helpers/auth.js`
- `default()` — GET `/api/admin/backups` com token, valida resposta
- Suporta formato direto (`body.backups`) e aninhado (`body.data.backups`)
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `GET /api/admin/backups` — Listagem de backups

**Configuração de carga:** 1 VU, 1 iteração, thresholds p(95)<5000ms

---

### `cache-headers-test.js`

**Localização:** `/load-tests/functional/cache-headers-test.js`

**O que faz:** Verifica a presença e corretude dos headers de cache HTTP (`Cache-Control`, `s-maxage`, `stale-while-revalidate`).

**Propósito:** Garantir que as respostas da API incluam headers de cache apropriados para otimização de performance.

**Estrutura:**
- Rota pública (sem autenticação) — GET `/api/posts`
- Testa `Cache-Control`, `s-maxage`, `stale-while-revalidate`
- Soft checks com warnings em vez de falhas (apenas na primeira iteração)
- `handleSummary()` — Gera relatório via `helpers/report.js`
- Configuração: perfil `light` do `helpers/profiles.js`

**Endpoints chamados:**
- `GET /api/posts` — Listagem pública de posts (verifica headers de resposta)

---

### `posts-cursor-pagination-test.js`

**Localização:** `/load-tests/functional/posts-cursor-pagination-test.js`

**O que faz:** Testa a paginação baseada em cursor para o recurso de posts.

**Propósito:** Validar o funcionamento da paginação por cursor (diferente de page/offset), que é mais eficiente para grandes conjuntos de dados.

**Estrutura:**
- Rota pública (sem autenticação) — GET `/api/posts?limit=5`
- Pega o ID do último post como cursor → requisição com `?cursor={id}`
- Valida que resultados são distintos entre páginas (o primeiro post da página 2 não pode ser igual ao cursor)
- `handleSummary()` — Gera relatório via `helpers/report.js`
- Configuração: perfil `light` do `helpers/profiles.js`

**Endpoints chamados:**
- `GET /api/posts?limit=5` — Listar posts (página 1)
- `GET /api/posts?limit=5&cursor={id}` — Listar posts (página 2 via cursor)

---

### `posts-tags-test.js`

**Localização:** `/load-tests/functional/posts-tags-test.js`

**O que faz:** Testa o filtro de posts por tag na API pública.

**Propósito:** Verificar se a rota `/api/posts?tag=...` retorna corretamente posts filtrados por uma tag específica.

**Estrutura:**
- Rota pública (sem autenticação) — GET `/api/posts?tag={tag}`
- Tags fixas: `['fé', 'oração', 'bíblia', 'vida', 'espiritualidade']`
- Valida se posts retornados contêm a tag buscada
- `handleSummary()` — Gera relatório via `helpers/report.js`
- Configuração: perfil `light` do `helpers/profiles.js`

**Endpoints chamados:**
- `GET /api/posts?tag={tag}` — Posts filtrados por tag

---

### `recovery-test.js`

**Localização:** `/load-tests/functional/recovery-test.js`

**O que faz:** Testa a capacidade de recuperação do sistema após uma falha (banco de dados offline).

**Propósito:** Validar que o sistema detecta falhas e se recupera automaticamente, medindo o tempo de recuperação (TTR).

**Estrutura:**
- Configuração: perfil `recovery` do `helpers/profiles.js` (1 VU constante por 2 minutos)
- Monitora rota `/api/posts` que depende estritamente do banco de dados
- Estado `isSystemDown` para rastrear início/fim de quedas
- Métricas: `recovery_time_ms` (Trend) e `recovery_count` (Counter)
- Mensagem de estabilidade se nenhuma falha detectada
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Endpoints chamados:**
- `GET /api/posts` — Listagem pública de posts (dependente do banco)

---

### `search-content-test.js`

**Localização:** `/load-tests/functional/search-content-test.js`

**O que faz:** Testa a busca de conteúdo textual nos posts públicos.

**Propósito:** Validar que o mecanismo de busca retorna resultados consistentes e performáticos para diferentes termos de busca.

**Estrutura:**
- Rota pública (sem autenticação) — GET `/api/posts?search={termo}&page=1&limit=10`
- Termos de busca: `['Deus', 'Jesus', 'amor', 'fé', 'vida', 'caminho', 'luz']`
- Warm-up na primeira iteração para aquecer cache do servidor
- Valida estrutura de resposta, status 200 e match do termo no título/excerpt/conteúdo
- Threshold específico: `http_req_duration{name:SearchPosts}` p(95)<500ms, avg<200ms
- `handleSummary()` — Gera relatório via `helpers/report.js`
- Configuração: perfil `light` do `helpers/profiles.js`

**Endpoints chamados:**
- `GET /api/posts?search={termo}&page=1&limit=10` — Busca textual em posts

---

### `upload-flow-test.js`

**Localização:** `/load-tests/functional/upload-flow-test.js`

**O que faz:** Testa o fluxo de upload de arquivos para a aplicação.

**Propósito:** Validar que o endpoint de upload de arquivos funciona sob carga e respeita limites de tamanho e tipo de arquivo.

**Estrutura:**
- `setup()` — Login via `helpers/auth.js`
- Simula upload de GIF 1x1 transparente via multipart/form-data usando `http.file()`
- Valida status 200 e presença de URL na resposta
- Verificação adicional: tenta baixar a imagem recém-criada para garantir persistência no disco
- Nome do arquivo contém prefixo `post-image-load-k6-` para compatibilidade com scripts de limpeza
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `POST /api/upload-image` — Upload de arquivo
- `GET {imageUrl}` — Verificação de persistência no disco

**Configuração de carga:** 5 VUs, estágios 10s/30s/10s, p(95)<2000ms, failed<1%

---

### `video-validation-test.js`

**Localização:** `/load-tests/functional/video-validation-test.js`

**O que faz:** Teste funcional que valida as regras de validação de URL do YouTube na criação de vídeos.

**Propósito:** Garantir que o endpoint de criação `/api/admin/videos` tenha validações corretas para URLs do YouTube, rejeitando domínios inválidos e URLs malformadas.

**Estrutura:**
- `setup()` — Login via `helpers/auth.js`
- `default()` — 3 cenários de validação:
  1. URL válida do YouTube (deve passar — status 201)
  2. URL de domínio inválido — Vimeo (deve rejeitar — status 400)
  3. URL malformada (deve rejeitar — status 400)
- Checks usam `console.warn` + `return false` (não abortam o teste, mas registram falha)
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `POST /api/admin/videos` — Criação de vídeo (3x)

**Configuração de carga:** 1 VU, 1 iteração, thresholds p(95)<5000ms

---

## Subpasta security/ — Segurança

Contém 4 scripts de teste de segurança.

### `rate-limit-test.js`

**Localização:** `/load-tests/security/rate-limit-test.js`

**O que faz:** Testa o mecanismo de rate limiting da API, enviando requisições em alta frequência.

**Propósito:** Garantir que o sistema limite corretamente requisições excessivas, retornando status 429 (Too Many Requests) quando o limite é excedido.

**Estrutura:**
- Configuração: perfil `rateLimit` do `helpers/profiles.js`
- Payload com username/password aleatórios (evita whitelist)
- Headers `X-Forwarded-For`, `X-Real-IP`, `CF-Connecting-IP`, `True-Client-IP` para simular IP externo
- Métrica `RateLimitHits` (Counter) para contar bloqueios por rate limit
- Checks por status:
  - 429 → `🛡️ BLOQUEADO: Rate limit ativo (429)` + validação de mensagem de erro no body
  - 403 → `🛡️ BLOQUEADO: Spoofing detection bloqueou (403)`
  - 401 → `ℹ️ PERMITIDO: Requisição autenticada (401)`
- Intencionalmente **sem `sleep()`** para máxima taxa de requisições
- Warning se nenhum rate limit foi acionado (verifica se Redis está configurado)
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Endpoints chamados:**
- `POST /api/auth/login` — Login (rota mais protegida por rate limit)

---

### `ip-spoofing-test.js`

**Localização:** `/load-tests/security/ip-spoofing-test.js`

**O que faz:** Teste consolidado de IP spoofing que mescla os propósitos dos antigos testes separados (evasão de rate limit + detecção de spoofing) em um único script.

**Propósito:** Validar se o sistema está protegido contra evasão de rate limit via rotação do header `X-Forwarded-For` e se detecta/bloqueia ativamente IPs falsificados.

**Estrutura:**
- Perfil de carga: `rateLimit` do `helpers/profiles.js`
- Gera IPs aleatórios via `getRandomIP()` do módulo `helpers/network.js`
- Envia requisições com `X-Forwarded-For` falsificado e senha inválida
- **Sem `sleep()`** para máxima taxa de requisições
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Interpretação dos resultados:**
- `🛡️ BLOQUEADO:*` (403 ou 429) → Sistema protegido — spoofing foi rejeitado ou rate limit global atuou
- `⚠️ VULNERÁVEL:*` (401) → Sistema vulnerável — spoofing não foi detectado / rate limit foi burlado

**Checks disponíveis:**
| Check | Status HTTP | Significado |
|-------|------------|-------------|
| `🛡️ BLOQUEADO: Spoofing detectado e rejeitado` | 403 | Proteção ativa contra spoofing |
| `🛡️ BLOQUEADO: Rate limit global ignorou IP falso` | 429 | Rate limit global (não há detecção específica) |
| `⚠️ VULNERÁVEL: Rate limit foi burlado por IP falso` | 401 | Evasão de rate limit por spoofing |
| `⚠️ VULNERÁVEL: Spoofing não foi detectado` | 401 | Spoofing não foi bloqueado ativamente |

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação (com `X-Forwarded-For` falsificado)

---

### `ddos-search-test.js`

**Localização:** `/load-tests/security/ddos-search-test.js`

**O que faz:** Simula um cenário de busca massiva (tipo DDoS) no endpoint de busca de posts.

**Propósito:** Verificar a resiliência do sistema sob alta frequência de requisições de busca, validando thresholds de performance e taxa de erro.

**Estrutura:**
- Gera busca aleatória com termos fixos: `['amor', 'paz', 'fé', 'luz', 'vida', 'caminho', 'verdade', 'esperança', 'coração', 'espírito']`
- Cache busting via timestamp (`_t=${Date.now()}`)
- Métrica `ErrorRate500` (Rate) para abortar se erros 5xx > 10%
- Intencionalmente **sem `sleep()`** para máxima taxa de requisições
- `handleSummary()` — Gera relatório via `helpers/report.js`
- Configuração: perfil `heavy` customizado com estágios 10s/30s/10s e 100→500 VUs

**Interpretação dos resultados:**
| Cenário | Checks que PASSAM | Significado |
|---------|-------------------|-------------|
| Sistema resiliente | `🛡️ BLOQUEADO: Rate limit atuou (429)` (alta taxa) | Proteção contra DDoS funcionando |
| Sistema subdimensionado | `⚠️ VULNERÁVEL: Servidor caiu (5xx)` (taxa > 10%) | Servidor não suporta a carga |
| Sistema estável | `✅ RESISTIU: Servidor respondeu (200)` (alta taxa) | Servidor aguenta carga sem proteção |

**Endpoints chamados:**
- `GET /api/posts?search={termo}&_t={timestamp}` — Busca de posts com cache busting

---

### `login-negative-test.js`

**Localização:** `/load-tests/security/login-negative-test.js`

**O que faz:** Teste negativo de autenticação que envia credenciais inválidas.

**Propósito:** Garantir que o endpoint de login rejeite corretamente credenciais inválidas com status 401 e não vaze informações sobre usuários existentes.

**Estrutura:**
- **Cenário 1:** Usuário existente (`admin`) com senha incorreta — espera 401/400/429
- **Cenário 2:** Usuário inexistente (`usuario_fantasma_k6`) — espera 401/429
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação (com credenciais inválidas)

**Configuração de carga:** 10 VUs, estágios 10s/30s/10s, p(95)<1000ms, checks>95%

---

## Arquivos Relacionados Fora da Pasta `load-tests/`

### `load-tests.yml` (CI/CD)

**Localização:** `/load-tests.yml` (raiz do projeto)

**O que faz:** Workflow do GitHub Actions que executa a suíte completa de testes de carga em CI.

**Propósito:** Automatizar a execução de todos os 30 scripts de teste de carga em ambiente isolado com PostgreSQL e Redis, com validação de thresholds e cache de dependências.

**Estrutura do workflow:**
1. **Schedule:** Execução automática diária às 03:00 UTC
2. **Triggers manuais:** via `workflow_dispatch`
3. **Job `call-test-base`:** Reutiliza workflow `test-base.yml` com `test-type: load` e comando `node scripts/run-all-load-tests-sequentially.js`
4. **Job `validate-and-report`:**
   - **Validate Thresholds** — Lê `orchestrator-results.json` e lista testes que falharam
   - **Upload Test Reports** — Upload dos relatórios como artefato (retidos por 30 dias)
   - **Notify Threshold Violation** — Exibe resumo detalhado se thresholds foram violados

---

### `scripts/run-all-load-tests-sequentially.js`

**Localização:** `/scripts/run-all-load-tests-sequentially.js`

**O que faz:** Script orquestrador que executa TODOS os scripts de teste de carga (k6) sequencialmente, incluindo verificação de thresholds e agregação de resultados.

**Propósito:** Automatizar a execução de todos os 30 scripts em 3 categorias (performance, functional, security), com verificação de servidor, agregação de resultados e limpeza de dados de teste.

**Estrutura:**
- **Verificação de servidor** — Requisição HTTP para `BASE_URL` com timeout de 5s
- **3 categorias:**
  - `🧪 Performance Tests` — 17 scripts
  - `🔍 Functional Tests` — 9 scripts
  - `🔒 Security Tests` — 4 scripts
- **Cleanup pós-categoria:**
  - Após performance: `node scripts/clean-load-test-posts.js`
  - Após security: `node scripts/clear-test-auth-locks.js`
- **Resultados** — Salva em `reports/k6-summaries/orchestrator-results.json`
- **Exit code** — Não-zero se houver falhas

**Variáveis de ambiente necessárias:**
- `ADMIN_USERNAME` — Nome do usuário admin (obrigatório)
- `ADMIN_PASSWORD` — Senha do admin (obrigatório para testes autenticados)

---

### `scripts/run-load-tests.sh`

**Localização:** `/scripts/run-load-tests.sh`

**O que faz:** Wrapper bash que verifica se o servidor está online e executa o orquestrador.

**Propósito:** Fornecer uma interface simples para executar a suíte completa de testes de carga.

**Estrutura:**
- Verifica servidor via `curl` (timeout de 1s)
- Executa `node scripts/run-all-load-tests-sequentially.js`

---

### `scripts/clean-load-test-posts.js`

**Localização:** `/scripts/clean-load-test-posts.js`

**O que faz:** Limpa posts de teste criados pelos load tests no banco de dados.

**Propósito:** Remover posts com padrões `post-carga-%` e `k6-%` na coluna `slug` da tabela `posts`.

**Estrutura:**
- Usa `loadEnv()` para carregar variáveis de ambiente
- Usa `cleanTableByPattern()` do `scripts/utils/cleanup.js`

---

### `scripts/clear-test-auth-locks.js`

**Localização:** `/scripts/clear-test-auth-locks.js`

**O que faz:** Script de cleanup para desbloquear IPs que foram bloqueados pelos testes de segurança (rate limit, IP spoofing).

**Propósito:** Remover as chaves do Redis usadas durante os testes para que o acesso do usuário não fique bloqueado após a execução.

**Estrutura:**
- IPs limpos: `203.0.113.1` (IP fixo do rate-limit-test), `127.0.0.1`, `::1`
- Remove chaves `rate_limit:{ip}` e `rate_limit:block_count:{ip}` do Redis
- Remove chaves de cache `api:auth:login:*`
- Exibe dica para reiniciar servidor se persistirem bloqueios

---

### `scripts/generate-load-report.js`

**Localização:** `/scripts/generate-load-report.js`

**O que faz:** Executa uma bateria de 6 testes de carga selecionados e gera um relatório HTML consolidado.

**Propósito:** Fornecer um relatório visual de performance com métricas de latência, taxa de erro e requisições por segundo.

**Estrutura:**
- Validação de `ADMIN_PASSWORD` obrigatória
- Verifica se k6 está instalado
- Executa 6 testes: authenticated-flow, create-post-flow, videos-load, videos-crud, musicas-crud, musicas-load
- Gera HTML em `reports/load-report-{timestamp}.html`
- Tabela com: status, p95, média, requisições, taxa de erro

---

### `scripts/clean-k6-reports.js`

**Localização:** `/scripts/clean-k6-reports.js`

**O que faz:** Remove relatórios k6 antigos (mais de 7 dias) do diretório `reports/k6-summaries/`.

**Propósito:** Manter o diretório de relatórios limpo, evitando acúmulo de arquivos.

**Estrutura:**
- Retenção: 7 dias (constante `K6_RETENTION_DAYS`)
- Remove arquivos `.json` e `.html` mais antigos que o período de retenção

---

### `scripts/clean-test-db.js`

**Localização:** `/scripts/clean-test-db.js`

**O que faz:** Remove bancos de dados de teste (`test.db`, `caminhar-test.db`) do diretório `data/`.

**Propósito:** Limpar bancos de dados de teste antes de execuções de testes.

---

### `scripts/utils/cleanup.js`

**Localização:** `/scripts/utils/cleanup.js`

**O que faz:** Módulo compartilhado de limpeza de dados de teste no PostgreSQL.

**Propósito:** Fornecer função genérica `cleanTableByPattern()` que remove registros de uma tabela com base em padrões LIKE em uma coluna.

**Exports:**
- `cleanTableByPattern({ table, column, patterns, showDeleted })` — Remove registros com query OR dinâmica

---

### `scripts/utils/constants.js`

**Localização:** `/scripts/utils/constants.js`

**O que faz:** Constantes compartilhadas entre os scripts do projeto.

**Propósito:** Centralizar valores de configuração que antes estavam espalhados como números mágicos.

**Constantes relevantes para load tests:**
- `REPORTS_DIR = 'reports'`
- `K6_SUMMARY_DIR = 'reports/k6-summaries'`
- `LOAD_TESTS_DIR = 'load-tests'`
- `K6_RETENTION_DAYS = 7`

---

### `scripts/utils/load-env.js`

**Localização:** `/scripts/utils/load-env.js`

**O que faz:** Carrega variáveis de ambiente priorizando `.env.local`.

**Propósito:** Única fonte de verdade para carregamento de env em scripts.

**Exports:**
- `loadEnv()` — Carrega `.env.local` e depois `.env`
- `requireDatabaseUrl()` — Valida se `DATABASE_URL` está definida

---

### `scripts/check-sql-injection.js`

**Localização:** `/scripts/check-sql-injection.js`

**O que faz:** Script de verificação de segurança que escaneia arquivos `.js` em busca de chamadas `query()` ou `pool.query()` com interpolação de variáveis sem prepared statements.

**Propósito:** Detectar vulnerabilidades de SQL injection no código-fonte.

**Estrutura:**
- 4 regras de detecção (interpolação direta, template literal sem array, detecção indireta, pool.query indireto)
- Ignora falsos positivos conhecidos (comentários, whitelists, `validateIdentifier()`)
- Exit codes: 0 (nenhuma vulnerabilidade), 1 (vulnerabilidades encontradas)

---

## Padrões e Convenções Comuns

### Padrões Estruturais

1. **`setup()` + `default()`** — A maioria dos scripts segue o padrão de função `setup()` para autenticação e `default()` para execução dos testes. A autenticação é centralizada via `helpers/auth.js`.

2. **Autenticação via JWT** — Praticamente todos os testes administrativos fazem login via `POST /api/auth/login` e extraem o token JWT de `data.token` no corpo da resposta, usando `helpers/auth.js`.

3. **Configuração centralizada** — Todos os scripts importam `BASE_URL` de `helpers/config.js` em vez de declarar localmente.

4. **Perfis de carga padronizados** — Os scripts usam `getProfile()` de `helpers/profiles.js` para definir VUs, duração e thresholds, garantindo consistência.

5. **Relatórios padronizados** — Os scripts usam `generateReport()` de `helpers/report.js` para gerar relatórios JSON em `./reports/k6-summaries/`, com sanitização automática do token JWT.

6. **Sleep randomizado** — Os scripts usam `randomSleep()` de `helpers/sleep.js` para simular comportamento real de usuário, com faixas distintas por tipo de operação:
   - Consulta leve (GET pública): 0.5s – 3s
   - Escrita (POST/PUT/DELETE): 0.5s – 2s
   - Upload: 1s – 3s
   - Estresse: 0.3s – 1.5s
   - Validação funcional: 0.3s – 1.3s

7. **Tags de métricas** — Uso de `tags` para categorizar requisições e filtrar thresholds por fluxo específico (ex: `{flow: create_post}`, `{name: SearchMusicas}`, `{type: cached_settings}`).

8. **Teardown para limpeza** — Testes que criam dados (CRUD, create-post, stress) implementam `teardown()` para limpar dados de teste com prefixo `K6` ou `[TEST-K6]`.

9. **Warm-up de cache** — Testes de busca (`musicas-search-test`, `search-content-test`) e o `cache-warmup-test` aquecem o cache do servidor na primeira iteração para evitar que cold start distorça as métricas.

### Endpoints Utilizados

| Categoria | Endpoints |
|-----------|-----------|
| **Autenticação** | `POST /api/auth/login` |
| **Saúde/Monitoramento** | `GET /api/status?mode=health`, `GET /api/status` |
| **Músicas (Admin)** | `GET/POST/PUT/DELETE /api/admin/musicas` |
| **Músicas (Público)** | `GET /api/musicas` |
| **Vídeos (Admin)** | `GET/POST/PUT/DELETE /api/admin/videos` |
| **Vídeos (Público)** | `GET /api/videos` |
| **Posts (Admin)** | `POST /api/admin/posts`, `GET/DELETE /api/admin/posts` |
| **Posts (Público)** | `GET /api/posts` |
| **Settings** | `GET /api/settings` |
| **Backup** | `GET /api/admin/backups` |
| **Upload** | `POST /api/upload-image` |

### Thresholds por Perfil

| Perfil | Threshold | Onde é usado |
|--------|-----------|-------------|
| `health` | `p(95) < 500ms`, `failed < 2%` | Health check |
| `medium` | `p(95) < 1000ms`, `failed < 5%` | Testes de carga de músicas e vídeos |
| `light` | `p(95) < 500ms`, `checks == 100%` | Testes funcionais e CRUD |
| `heavy` | `p(95) < 3000ms`, `failed < 10%` | Testes de estresse e DDoS |
| `stress` | `p(95) < 3000ms`, `failed < 10%`, `checks > 95%`, `heap < 1GB` | Stress test combinado |

### Módulos Compartilhados

| Módulo | Localização | Função |
|--------|-------------|--------|
| `auth.js` | `helpers/auth.js` | Autenticação centralizada (login + extração de token) |
| `config.js` | `helpers/config.js` | Configuração de ambiente centralizada |
| `network.js` | `helpers/network.js` | Utilitários de rede (`getRandomIP()`) |
| `profiles.js` | `helpers/profiles.js` | Perfis de carga padronizados |
| `report.js` | `helpers/report.js` | Geração de relatórios padronizados com sanitização de token |
| `resource-test-runner.js` | `helpers/resource-test-runner.js` | Runner genérico para testes CRUD, filtro, paginação, ordenação e carga |
| `sleep.js` | `helpers/sleep.js` | Sleep randomizado (`randomSleep()`) |

---

> **Data da análise:** 01/08/2026
> **Total de scripts analisados:** 37 arquivos na pasta `load-tests/` (30 scripts k6 + 7 helpers) + 12 arquivos relacionados fora da pasta
