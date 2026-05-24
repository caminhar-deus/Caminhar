# 📊 Análise dos Arquivos de Teste de Carga — `/load-tests`

> **Propósito:** Documentação detalhada de todos os arquivos da pasta `load-tests/`, descrevendo o que cada um faz, seu propósito, estrutura e endpoints utilizados. Os scripts estão organizados em 3 subpastas: `performance/`, `functional/` e `security/`.

---

## Sumário

1. [Visão Geral](#visão-geral)
2. [Subpasta performance/](#subpasta-performance)
   - [authenticated-flow-test.js](#authenticated-flow-testjs)
   - [cache-performance-test.js](#cache-performance-testjs)
   - [create-post-flow.js](#create-post-flowjs)
   - [musicas-crud-test.js](#musicas-crud-testjs)
   - [musicas-filter-test.js](#musicas-filter-testjs)
   - [musicas-load-test.js](#musicas-load-testjs)
   - [musicas-pagination-test.js](#musicas-pagination-testjs)
   - [musicas-search-test.js](#musicas-search-testjs)
   - [musicas-sort-test.js](#musicas-sort-testjs)
   - [pagination-test.js](#pagination-testjs)
   - [stress-test-combined.js](#stress-test-combinedjs)
   - [videos-crud-test.js](#videos-crud-testjs)
   - [videos-filter-test.js](#videos-filter-testjs)
   - [videos-load-test.js](#videos-load-testjs)
   - [videos-pagination-test.js](#videos-pagination-testjs)
   - [videos-sort-test.js](#videos-sort-testjs)
3. [Subpasta functional/](#subpasta-functional)
   - [backup-verification-test.js](#backup-verification-testjs)
   - [cache-headers-test.js](#cache-headers-testjs)
   - [health-check.js](#health-checkjs)
   - [posts-cursor-pagination-test.js](#posts-cursor-pagination-testjs)
   - [posts-tags-test.js](#posts-tags-testjs)
   - [recovery-test.js](#recovery-testjs)
   - [search-content-test.js](#search-content-testjs)
   - [upload-flow-test.js](#upload-flow-testjs)
   - [video-validation-test.js](#video-validation-testjs)
4. [Subpasta security/](#subpasta-security)
   - [ddos-search-test.js](#ddos-search-testjs)
   - [ip-spoofing-deteccao-test.js](#ip-spoofing-deteccao-testjs)
   - [ip-spoofing-test.js](#ip-spoofing-testjs)
   - [login-negative-test.js](#login-negative-testjs)
   - [rate-limit-test.js](#rate-limit-testjs)
5. [Arquivos de Configuração e Workflow](#arquivos-de-configuração-e-workflow)
   - [env-config.json](#env-configjson)
   - [load-tests.yml (CI)](#load-testsyml-ci)
   - [helpers/config.js](#helpersconfigjs)
   - [helpers/network.js](#helpersnetworkjs)
   - [helpers/profiles.js](#helpersprofilesjs)
   - [helpers/report.js](#helpersreportjs)
   - [helpers/resource-test-runner.js](#helpersresource-test-runnerjs)
6. [Padrões e Convenções Comuns](#padrões-e-convenções-comuns)

---

## Visão Geral

A pasta `load-tests/` contém **36 arquivos** (29 scripts de teste em k6 + 1 configuração JSON + 1 workflow CI + 5 módulos helpers) que compõem a suíte de testes de carga, stress, performance e segurança do projeto **Caminhar**. Os scripts estão organizados em 3 subpastas: `performance/`, `functional/` e `security/`. Todos os scripts utilizam a ferramenta [k6](https://k6.io/) da Grafana Labs.

Os testes estão organizados por subpasta:

| Subpasta | Qtd | Descrição |
|----------|-----|-----------|
| **performance/** | 16 | Testes de carga, stress, performance e fluxos combinados |
| **functional/** | 9 | Testes funcionais e de validação |
| **security/** | 5 | Testes de segurança (rate limit, spoofing, DDoS) |
| **helpers/** | 6 | Módulos compartilhados (auth, config, network, profiles, report, resource-test-runner) |
| **raiz** | 2 | env-config.json + load-tests.yml (CI/CD na raiz do projeto) |

---

## Subpasta performance/

Contém 16 scripts de teste de carga, stress e performance.

---

### `authenticated-flow-test.js`

**Localização:** `/load-tests/performance/authenticated-flow-test.js`

**O que faz:** Testa o fluxo completo de autenticação: login com credenciais de admin, obtenção de token JWT e acesso a uma rota protegida.

**Propósito:** Validar que o fluxo de autenticação funciona corretamente sob carga, garantindo que o login e o acesso a rotas protegidas não apresentem degradação com 5 usuários simultâneos.

**Estrutura:**
- `default()` — Login → extrai token → acessa rota protegida `/api/admin/settings` (sem `setup()` — health check removido em 24/05/2026)
- Thresholds: perfil `medium` do `helpers/profiles.js` (p(95) < 300ms, failed < 1%)
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `GET /api/admin/settings` — Rota protegida (requer token Bearer)

**Configuração de carga:** Perfil `medium` (5 VUs, 20s)

---

### `cache-performance-test.js`

**Localização:** `/load-tests/performance/cache-performance-test.js`

**O que faz:** Teste comparativo de performance entre requisições cacheadas e não cacheadas.

**Propósito:** Medir a eficácia do cache, comparando tempos de resposta com e sem headers de cache, validando que respostas cacheadas são significativamente mais rápidas.

**Estrutura:**
- Configuração: perfil `medium` do `helpers/profiles.js`
- Requisição inicial (sem cache) → armazena headers → requisição com `If-None-Match` (cache)
- Compara `http_req_duration` entre os dois cenários
- Usa `getRandomIP()` do módulo `helpers/network.js` para evitar rate limit

**Endpoints chamados:**
- `GET /api/posts` — Endpoint público (2 requisições: sem cache e com ETag)

**Configuração de carga:** Perfil `medium` (5 VUs, 20s)

---

### `create-post-flow.js`

**Localização:** `/load-tests/performance/create-post-flow.js`

**O que faz:** Testa o fluxo completo de criação de posts no blog: login → criação → limpeza.

**Propósito:** Validar o processo de criação de posts no blog, garantindo que o endpoint `POST /api/posts` funcione corretamente sob carga e que dados de teste sejam limpos após a execução.

**Estrutura:**
- `setup()` — Login via `helpers/auth.js` (centralizado)
- `default()` — Cria post com título único contendo prefixo `K6`, valida status 201
- `teardown()` — Lista posts com `K6` no título e os remove via DELETE, evitando poluição do banco
- Configuração: estágios customizados (10s/15s/5s, 3 VUs)
- Usa `BASE_URL` de `helpers/config.js`

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `POST /api/posts` — Criação de post
- `GET /api/posts?limit=100` — Listar posts (teardown)
- `DELETE /api/posts` — Deletar post (teardown)

**Configuração de carga:** 3 VUs, estágios 10s/15s/5s, threshold `p(95)<800` para operações de escrita

**Observação:** Refatorado em 24/05/2026 — `setup()` e `BASE_URL` agora usam módulos compartilhados. Adicionado `teardown()` com identificador `K6`. A rota de criação é `/api/posts` (pública autenticada), não `/api/admin/posts`.

---

### `musicas-crud-test.js`

**Localização:** `/load-tests/performance/musicas-crud-test.js`

**O que faz:** Testa as operações CRUD (Create, Read, Update, Delete) para o recurso de músicas via runner genérico.

**Propósito:** Validar o ciclo de vida completo de uma música na API administrativa: criar, atualizar e deletar.

**Estrutura:**
- `setup()` — Login via `helpers/auth.js`
- `default()` — Via `createCrudTest()` do `helpers/resource-test-runner.js`: POST (criar) → PUT (atualizar) → DELETE
- `teardown()` — Limpa músicas K6 fantasmas deixadas por VUs interrompidos (adicionado em 24/05/2026)
- Valida IDs e status codes em cada etapa
- `handleSummary()` — Gera relatório via `helpers/report.js`
- Usa `BASE_URL` de `helpers/config.js`

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `POST /api/admin/musicas` — Criar música
- `PUT /api/admin/musicas` — Atualizar música
- `DELETE /api/admin/musicas` — Deletar música
- `GET /api/admin/musicas?limit=100` — Listar músicas (teardown)

**Configuração de carga:** Perfil `light` customizado (5 VUs, estágios 10s/20s/10s)

**Observação:** Implementado via `createCrudTest()` do módulo `helpers/resource-test-runner.js`.

---

### `musicas-filter-test.js`

**Localização:** `/load-tests/performance/musicas-filter-test.js`

**O que faz:** Testa o filtro de músicas por termo de busca (artista) via runner genérico.

**Propósito:** Validar que o endpoint público de músicas filtra corretamente os resultados com base no parâmetro `search`.

**Estrutura:**
- Rota pública (sem autenticação) — GET `/api/musicas?search={artista}`
- Array de artistas: `['Aline Barros', 'Fernandinho', 'Gabriela Rocha', 'Diante do Trono', 'Preto no Branco']`
- Valida que todos os itens retornados contêm o termo buscado
- Soft pass com warning se termo não encontrado visualmente
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Endpoints chamados:**
- `GET /api/musicas?search={termo}` — Listar com filtro

**Observação:** Implementado via `createFilterTest()` do módulo `helpers/resource-test-runner.js`.

---

### `musicas-load-test.js`

**Localização:** `/load-tests/performance/musicas-load-test.js`

**O que faz:** Teste de carga que simula múltiplos usuários acessando a listagem admin de músicas simultaneamente, via runner genérico.

**Propósito:** Validar o comportamento da API `/api/admin/musicas` sob carga progressiva, garantindo thresholds de performance (p95 < 300ms) e taxa de erro (< 1%).

**Estrutura:**
- Configuração: perfil `medium` do `helpers/profiles.js`
- `setup()` — Login com validação de Content-Type (health check desativado em 24/05/2026)
- Usa `getRandomIP()` do módulo `helpers/network.js` para evitar rate limit
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `GET /api/admin/musicas` — Listar músicas (rota admin)

**Observação:** Implementado via `createLoadTest()` do módulo `helpers/resource-test-runner.js`.

---

### `musicas-pagination-test.js`

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

**Observação:** Implementado via `createPaginationTest()` do módulo `helpers/resource-test-runner.js`.

---

### `musicas-search-test.js`

**Localização:** `/load-tests/performance/musicas-search-test.js`

**O que faz:** Testa a busca textual no endpoint de músicas com diferentes termos.

**Propósito:** Garantir que a busca por título retorne resultados relevantes e respeite os limites de paginação.

**Estrutura:**
- `setup()` — Login via `helpers/auth.js`
- Array de termos de busca pré-definidos
- Requisições GET com `?search={termo}`
- Valida status, estrutura de resposta e resultados

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `GET /api/admin/musicas?search={termo}` — Buscar músicas

---

### `musicas-sort-test.js`

**Localização:** `/load-tests/performance/musicas-sort-test.js`

**O que faz:** Testa a ordenação dos resultados de músicas por `created_at DESC` via runner genérico.

**Propósito:** Validar que o endpoint público de músicas ordena corretamente os resultados por data de criação.

**Estrutura:**
- Rota pública (sem autenticação) — `sort=created_at&order=desc`
- Valida que as datas estão em ordem decrescente
- Soft pass se poucos dados no banco (inconclusivo)
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Endpoints chamados:**
- `GET /api/musicas?sort=created_at&order=desc` — Listar ordenado

**Observação:** Implementado via `createSortTest()` do módulo `helpers/resource-test-runner.js`.

---

### `pagination-test.js`

**Localização:** `/load-tests/performance/pagination-test.js`

**O que faz:** Teste funcional de paginação baseada em page/offset para posts públicos.

**Propósito:** Validar o funcionamento do sistema de paginação offset-based (page + limit), verificando que páginas diferentes retornam IDs distintos.

**Estrutura:**
- Rota pública (sem autenticação) — GET `/api/posts?page=1&limit=5` e `page=2&limit=5`
- Validação cruzada: IDs da página 1 vs página 2 (não devem se repetir)
- Soft pass se página 2 estiver vazia (poucos dados no banco)
- `handleSummary()` — Gera relatório via `helpers/report.js`
- Configuração: perfil `light` do `helpers/profiles.js`

**Endpoints chamados:**
- `GET /api/posts?page={n}&limit={n}` — Paginação offset-based

**Observação:** Usa rota `/api/posts` (sem `/v1`), rota pública sem autenticação.

---

### `stress-test-combined.js`

**Localização:** `/load-tests/performance/stress-test-combined.js`

**O que faz:** Teste de estresse combinado com múltiplos cenários executados simultaneamente. É o teste mais robusto e completo da suíte.

**Propósito:** Simular cenário realista de produção com:
- CRUD de vídeos sob carga crescente (20 → 50 → 100 VUs)
- Monitoramento de memória do Node.js durante todo o teste

**Estrutura:**
- **2 cenários paralelos** via `scenarios` do k6:
  1. `stress_test` — Ramp-up progressivo (20, 50, 100 VUs), executa CRUD completo de vídeos
  2. `memory_monitor` — 1 VU constante por 5 min monitorando memória do Node.js
- `setup()` — Login via `helpers/auth.js` (centralizado)
- `teardown()` — Limpa dados de teste com paginação completa e identificador robusto `[TEST-K6]`
- `handleSummary()` — Gera relatório via `helpers/report.js`
- Usa `getRandomIP()` do módulo `helpers/network.js`
- Usa `BASE_URL` de `helpers/config.js`
- Identificador único: `TEST_PREFIX = '[TEST-K6]'` para facilitar limpeza no teardown

**Métricas customizadas:**
- `nodejs_memory_rss_bytes` — Memória RSS
- `nodejs_memory_heap_total_bytes` — Heap total
- `nodejs_memory_heap_used_bytes` — Heap usado (threshold: max < 1GB)

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `POST /api/admin/videos` — Criar vídeo
- `PUT /api/admin/videos` — Atualizar vídeo
- `DELETE /api/admin/videos` — Deletar vídeo
- `GET /api/status?mode=health` — Status do servidor (monitoramento de memória)
- `GET /api/admin/videos?limit=100&page={n}` — Listar vídeos com paginação (teardown)

**Melhorias em 24/05/2026:**
- Substituídas declarações manuais de `BASE_URL`, `USERNAME`, `PASSWORD` por import de `helpers/config.js`
- Substituído `setup()` manual por import de `helpers/auth.js`
- Adicionado `TEST_PREFIX = '[TEST-K6]'` como identificador robusto para dados de teste
- Teardown agora usa paginação via loop `while` com `page`, garantindo captura de todos os registros
- Adicionado `check()` na operação DELETE dentro do `stressTestFlow` para verificar exclusão
- Adicionado log com contagem de vídeos removidos no teardown

---

### `videos-crud-test.js`

**Localização:** `/load-tests/performance/videos-crud-test.js`

**O que faz:** Testa as operações CRUD para o recurso de vídeos via runner genérico.

**Propósito:** Validar o ciclo de vida completo de um vídeo: criar, atualizar e deletar.

**Estrutura:**
- `setup()` — Login via `helpers/auth.js`
- `default()` — Via `createCrudTest()` do `helpers/resource-test-runner.js`: POST (criar) → PUT (atualizar) → DELETE
- Valida IDs e status codes em cada etapa
- `teardown()` — Limpa vídeos K6 fantasmas deixados por VUs interrompidos
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `POST /api/admin/videos` — Criar vídeo
- `PUT /api/admin/videos` — Atualizar vídeo
- `DELETE /api/admin/videos` — Deletar vídeo
- `GET /api/admin/videos?limit=100` — Listar vídeos (teardown)

**Observação:** Implementado via `createCrudTest()` do módulo `helpers/resource-test-runner.js`.

---

### `videos-filter-test.js`

**Localização:** `/load-tests/performance/videos-filter-test.js`

**O que faz:** Testa o filtro de vídeos por termo de busca (título/descrição) via runner genérico.

**Propósito:** Validar que o endpoint público de vídeos filtra corretamente os resultados com base no parâmetro `search`.

**Estrutura:**
- Rota pública (sem autenticação) — GET `/api/videos?search={termo}`
- Array de termos: `['louvor', 'adoração', 'testemunho', 'pregação', 'estudo']`
- Valida que todos os itens retornados contêm o termo buscado
- Soft pass com warning se termo não encontrado visualmente
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Endpoints chamados:**
- `GET /api/videos?search={termo}` — Listar com filtro

**Observação:** Implementado via `createFilterTest()` do módulo `helpers/resource-test-runner.js`. Corrigido em 23/05/2026: anteriormente testava paginação (não filtro).

---

### `videos-load-test.js`

**Localização:** `/load-tests/performance/videos-load-test.js`

**O que faz:** Teste de carga que simula múltiplos usuários acessando a listagem pública de vídeos, com 2 requisições por iteração (páginas 1 e 2), via runner genérico.

**Propósito:** Validar a performance da API de vídeos sob carga progressiva, com thresholds de p(95) < 300ms.

**Estrutura:**
- Configuração: perfil `medium` do `helpers/profiles.js`
- `setup()` — Login via `helpers/auth.js`
- `default()` — GET `/api/videos` (página 1) + GET `/api/videos?page=2&limit=5` (página 2)
- Usa `getRandomIP()` do módulo `helpers/network.js` para evitar rate limit
- Valida metadados de paginação (page=2, limit=5)
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `GET /api/videos` — Listar vídeos (página 1)
- `GET /api/videos?page=2&limit=5` — Listar vídeos (página 2)

**Observação:** Implementado via `createLoadTest()` do módulo `helpers/resource-test-runner.js`. Corrigido em 23/05/2026: `BASE_URL` agora lê de `__ENV` (não mais hardcoded).

---

### `videos-pagination-test.js`

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

**Observação:** Implementado via `createPaginationTest()` do módulo `helpers/resource-test-runner.js`.

---

### `videos-sort-test.js`

**Localização:** `/load-tests/performance/videos-sort-test.js`

**O que faz:** Testa a ordenação padrão dos resultados de vídeos (sempre por `created_at DESC`) via runner genérico.

**Propósito:** Validar que o endpoint público de vídeos ordena corretamente os resultados por data de criação decrescente (comportamento padrão da API).

**Estrutura:**
- Rota pública (sem autenticação) — GET `/api/videos?page=1&limit=10` (sem parâmetros de ordenação)
- Check extra: `'API ignora parâmetros de ordenação'` — valida que parâmetros extras (`sort=created_at&order=desc`) não quebram a resposta
- Valida que as datas estão em ordem decrescente
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Endpoints chamados:**
- `GET /api/videos?page=1&limit=10` — Listar (sem ordenação explícita)
- `GET /api/videos?page=1&limit=5&sort=created_at&order=desc` — Check de compatibilidade

**Observação:** Implementado via `createSortTest()` do módulo `helpers/resource-test-runner.js`.

---

## Subpasta functional/

Contém 9 scripts de teste funcional e validação.

---

### `backup-verification-test.js`

**Localização:** `/load-tests/functional/backup-verification-test.js`

**O que faz:** Teste funcional para verificar a listagem de backups, validando a estrutura JSON de resposta.

**Propósito:** Garantir que o endpoint de backups retorne a estrutura esperada com campos como `id`, `filename`, `size`, `created_at`.

**Estrutura:**
- `setup()` — Login via `helpers/auth.js`
- `default()` — GET `/api/admin/backups` com token, valida resposta
- `handleSummary()` — Gera relatório via `helpers/report.js` (com sanitização automática do token JWT)
- Configuração: perfil `light` do `helpers/profiles.js`

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `GET /api/admin/backups` — Listagem de backups

**Configuração de carga:** Perfil `light` (1 VU, 5 iterações)

---

### `cache-headers-test.js`

**Localização:** `/load-tests/functional/cache-headers-test.js`

**O que faz:** Verifica a presença e corretude dos headers de cache HTTP (`Cache-Control`, `s-maxage`, `stale-while-revalidate`).

**Propósito:** Garantir que as respostas da API incluam headers de cache apropriados para otimização de performance.

**Estrutura:**
- Rota pública (sem autenticação) — GET `/api/posts`
- Testa `Cache-Control`, `s-maxage`, `stale-while-revalidate`
- Soft checks com warnings em vez de falhas
- `handleSummary()` — Gera relatório via `helpers/report.js`
- Configuração: perfil `light` do `helpers/profiles.js`

**Endpoints chamados:**
- `GET /api/posts` — Listagem pública de posts (verifica headers de resposta)

**Configuração de carga:** Perfil `light` (1 VU, 5 iterações)

---

### `health-check.js`

**Localização:** `/load-tests/functional/health-check.js`

**O que faz:** Teste de carga específico para o endpoint de health check da API.

**Propósito:** Verificar se o endpoint `GET /api/status?mode=health` responde corretamente sob carga crescente (até 20 usuários) e respeita SLAs rigorosos de tempo de resposta (p95 < 100ms).

**Estrutura:**
- Configuração: perfil `health` do `helpers/profiles.js`
- Rota pública (sem autenticação) — GET `/api/status?mode=health`
- Valida status 200 e body com `status === 'ok'`
- **Não possui `handleSummary()`** (teste leve sem geração de relatório)

**Endpoints chamados:**
- `GET /api/status?mode=health` — Health check

**Configuração de carga:** Perfil `health` (20 VUs, 20s, p(95) < 100ms)

---

### `posts-cursor-pagination-test.js`

**Localização:** `/load-tests/functional/posts-cursor-pagination-test.js`

**O que faz:** Testa a paginação baseada em cursor para o recurso de posts.

**Propósito:** Validar o funcionamento da paginação por cursor (diferente de page/offset), que é mais eficiente para grandes conjuntos de dados.

**Estrutura:**
- Rota pública (sem autenticação) — GET `/api/posts?limit=5`
- Pega o ID do último post como cursor → requisição com `?cursor={id}`
- Valida que resultados são distintos entre páginas
- Soft pass se dados insuficientes
- `handleSummary()` — Gera relatório via `helpers/report.js`
- Configuração: perfil `light` do `helpers/profiles.js`

**Endpoints chamados:**
- `GET /api/posts?cursor={id}&limit={n}` — Posts com paginação por cursor

**Observação:** Usa rota `/api/posts` (sem `/v1`), rota pública sem autenticação.

---

### `posts-tags-test.js`

**Localização:** `/load-tests/functional/posts-tags-test.js`

**O que faz:** Testa o filtro de posts por tag na API pública.

**Propósito:** Verificar se a rota `/api/posts?tag=...` retorna corretamente posts filtrados por uma tag específica.

**Estrutura:**
- Rota pública (sem autenticação) — GET `/api/posts?tag={tag}`
- Tags fixas: `['fé', 'oração', 'bíblia', 'vida', 'espiritualidade']`
- Valida se posts retornados contêm a tag buscada
- Soft pass com warning se tag não encontrada visualmente (pode ser normalização diferente)
- `handleSummary()` — Gera relatório via `helpers/report.js` (sem token para sanitizar, é rota pública)
- Configuração: perfil `light` do `helpers/profiles.js`

**Endpoints chamados:**
- `GET /api/posts?tag={tag}` — Posts filtrados por tag

**Observação:** Usa rota `/api/posts` (sem `/v1`), rota pública sem autenticação.

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
- Valida estrutura de resposta, status 200 e match do termo no título/conteúdo/tags
- Soft pass com warning se termo não encontrado visualmente
- `handleSummary()` — Gera relatório via `helpers/report.js`
- Configuração: perfil `light` do `helpers/profiles.js`

**Endpoints chamados:**
- `GET /api/posts?search={termo}` — Busca textual em posts

**Observação:** Usa rota `/api/posts` (sem `/v1`), rota pública sem autenticação.

---

### `upload-flow-test.js`

**Localização:** `/load-tests/functional/upload-flow-test.js`

**O que faz:** Testa o fluxo de upload de arquivos para a aplicação.

**Propósito:** Validar que o endpoint de upload de arquivos funciona sob carga e respeita limites de tamanho e tipo de arquivo.

**Estrutura:**
- `setup()` — Login via `helpers/auth.js` (centralizado, refatorado em 24/05/2026)
- Simula upload de GIF 1x1 transparente via multipart/form-data usando `http.file()`
- Valida status 200 e presença de URL na resposta
- Verificação adicional: tenta baixar a imagem recém-criada para garantir persistência no disco
- Usa `BASE_URL` de `helpers/config.js` (removido hardcoded em 24/05/2026)
- Nome do arquivo contém prefixo `k6` para identificação

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `POST /api/upload-image` — Upload de arquivo
- `GET {imageUrl}` — Verificação de persistência no disco

---

### `video-validation-test.js`

**Localização:** `/load-tests/functional/video-validation-test.js`

**O que faz:** Teste funcional que valida as regras de validação de URL do YouTube na criação de vídeos.

**Propósito:** Garantir que o endpoint de criação `/api/admin/videos` tenha validações corretas para URLs do YouTube, rejeitando domínios inválidos e URLs malformadas.

**Estrutura:**
- `setup()` — Login via `helpers/auth.js`
- `default()` — 3 cenários de validação:
  1. URL válida do YouTube (deve passar)
  2. URL de domínio inválido — Vimeo (deve rejeitar)
  3. URL malformada (deve rejeitar)
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `POST /api/admin/videos` — Criação de vídeo (3x)

---

## Subpasta security/

Contém 5 scripts de teste de segurança.

---

### `ddos-search-test.js`

**Localização:** `/load-tests/security/ddos-search-test.js`

**O que faz:** Simula um cenário de busca massiva (tipo DDoS) no endpoint de busca de posts.

**Propósito:** Verificar a resiliência do sistema sob alta frequência de requisições de busca, validando thresholds de performance e taxa de erro.

**Estrutura:**
- Gera busca aleatória com termos fixos
- Cache busting via timestamp (`_t=${Date.now()}`)
- Métrica `ErrorRate500` para abortar se erros 5xx > 10%
- Intencionalmente **sem `sleep()`** para máxima taxa de requisições
- `handleSummary()` — Gera relatório via `helpers/report.js`
- Configuração: perfil `heavy` customizado com estágios 10s/30s/10s e 100→500 VUs

**Endpoints chamados:**
- `GET /api/posts?search={termo}` — Busca de posts

**Configuração de carga:** 100→500 VUs, 50s de duração, threshold `errors_500 rate<0.10`

---

### `ip-spoofing-deteccao-test.js`

**Localização:** `/load-tests/security/ip-spoofing-deteccao-test.js`

**O que faz:** Teste de proteção (Opção B) que valida se o sistema detecta e rejeita ativamente requisições com headers `X-Forwarded-For` falsificados.

**Propósito:** Garantir que o sistema tenha detecção ativa de IP spoofing, bloqueando requisições com headers falsificados.

**Estrutura:**
- Perfil de carga: `rateLimit` do `helpers/profiles.js`
- Gera IPs aleatórios via `getRandomIP()` do módulo `helpers/network.js`
- Envia requisições com múltiplos headers falsificados (`X-Forwarded-For`, `X-Real-IP`, `CF-Connecting-IP`)
- **Sem `sleep()`** para máxima taxa de requisições
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Interpretação dos resultados:**
- `403` (Forbidden) ou `400` (Bad Request) → ✅ Protegido — spoofing detectado e bloqueado ativamente
- `429` (Too Many Requests) → ✅ Protegido — rate limit global bloqueou (mas não houve detecção específica)
- `401` (Unauthorized) → ❌ Vulnerável — spoofing não foi detectado

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação (com headers falsificados)

**Configuração de carga:** Perfil `rateLimit` (ramp 0→50 VUs, 50s)

**Observação:** Criado em 23/05/2026 como parte da resolução da seção 2.2 do UPGRADE_load-tests.md. Complementa o `ip-spoofing-test.js` testando detecção ativa em vez de evasão de rate limit.

---

### `ip-spoofing-test.js`

**Localização:** `/load-tests/security/ip-spoofing-test.js`

**O que faz:** Teste de vulnerabilidade (Opção A) que verifica se o rate limit do sistema pode ser burlado via rotação do header `X-Forwarded-For`.

**Propósito:** Detectar se o rate limit é global ou baseado em IP confiável, revelando vulnerabilidade de evasão.

**Estrutura:**
- Perfil de carga: `rateLimit` do `helpers/profiles.js`
- Gera IPs aleatórios via `getRandomIP()` do módulo `helpers/network.js`
- Envia requisições com `X-Forwarded-For` falsificado e senha inválida
- **Sem `sleep()`** para máxima taxa de requisições
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Interpretação dos resultados:**
- `429` (Too Many Requests) → ✅ Protegido — rate limit global ignorou IP falso
- `401` (Unauthorized) → ❌ Vulnerável — rate limit foi burlado pelo IP falso

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação (com `X-Forwarded-For` falsificado)

**Configuração de carga:** Perfil `rateLimit` (ramp 0→50 VUs, 50s)

**Observação:** Criado em substituição ao teste anterior que era contraditório (validava spoofing mas também o utilizava). Agora tem propósito claro de teste de vulnerabilidade.

---

### `login-negative-test.js`

**Localização:** `/load-tests/security/login-negative-test.js`

**O que faz:** Teste negativo de autenticação que envia credenciais inválidas.

**Propósito:** Garantir que o endpoint de login rejeite corretamente credenciais inválidas com status 401 e não vaze informações sobre usuários existentes.

**Estrutura:**
- Envia requisições POST com credenciais aleatórias
- Valida status 401 e mensagem de erro genérica
- Verifica que não há vazamento de informações

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação (com credenciais inválidas)

**Configuração de carga:** Perfil `light` customizado (3 VUs, 20 iterações)

---

### `rate-limit-test.js`

**Localização:** `/load-tests/security/rate-limit-test.js`

**O que faz:** Testa o mecanismo de rate limiting da API, enviando requisições em alta frequência.

**Propósito:** Garantir que o sistema limite corretamente requisições excessivas, retornando status 429 (Too Many Requests) quando o limite é excedido.

**Estrutura:**
- Configuração: perfil `rateLimit` do `helpers/profiles.js`
- Payload com username/password aleatórios (evita whitelist)
- Headers `X-Forwarded-For`, `X-Real-IP`, `CF-Connecting-IP`, `True-Client-IP` para simular IP externo
- Métrica `RateLimitHits` para contar bloqueios por rate limit
- Intencionalmente **sem `sleep()`** para máxima taxa de requisições
- Warning se nenhum rate limit foi acionado
- `handleSummary()` — Gera relatório via `helpers/report.js`

**Endpoints chamados:**
- `POST /api/auth/login` — Login (rota mais protegida por rate limit)

---

## Arquivos de Configuração e Workflow

---

### `env-config.json`

**Localização:** `/load-tests/env-config.json`

**O que faz:** Arquivo de configuração de ambiente centralizado para os testes de carga.

**Propósito:** Definir valores padrão de ambiente usados pelos scripts k6, permitindo reconfiguração sem alterar código.

**Conteúdo:**
```json
{
  "BASE_URL": "http://localhost:3000",
  "ADMIN_USERNAME": "CHANGE_ME",
  "ADMIN_PASSWORD": "CHANGE_ME"
}
```

**Observações:**
- Define URL base como `http://localhost:3000`
- Credenciais de admin definidas como `CHANGE_ME` para forçar configuração explícita via variáveis de ambiente
- O valor é referenciado via módulo `helpers/config.js`, que também tenta ler de `__ENV`
- **Nota de segurança:** As credenciais reais não devem ser armazenadas neste arquivo. Devem ser configuradas via variáveis de ambiente (`__ENV.ADMIN_USERNAME` e `__ENV.ADMIN_PASSWORD`) ou GitHub Secrets no CI

---

### `load-tests.yml` (CI/CD)

**Localização:** `/load-tests.yml` (raiz do projeto)

**O que faz:** Workflow do GitHub Actions que executa a suíte de testes de carga em CI.

**Propósito:** Automatizar a execução dos testes de carga em ambiente isolado com PostgreSQL e Redis, executando testes das 3 subpastas em etapas separadas.

**Estrutura do workflow:**
1. **Schedule:** Execução automática diária às 03:00 UTC
2. **Triggers manuais:** via `workflow_dispatch`
3. **Serviços:**
   - PostgreSQL 15 (banco de dados isolado)
   - Redis 7 (rate limiting/cache)
4. **Passos:**
   - Checkout do repositório
   - Setup Node.js com cache
   - Instalação de dependências (`npm ci`)
   - Restauração do cache de build do Next.js
   - Criação de diretórios de relatório
   - Setup do banco de dados de teste + seed
   - Build da aplicação
   - Inicialização da aplicação em background
   - Setup do k6
   - **Etapa 1:** Performance tests (`load-tests/performance/`)
   - **Etapa 2:** Functional tests (`load-tests/functional/`)
   - **Etapa 3:** Security tests (`load-tests/security/`)
   - Upload dos relatórios como artefato (retidos por 30 dias)

**Melhoria (24/05/2026):** O workflow foi expandido de 1 teste (`stress-test-combined.js`) para 7+ testes distribuídos em 3 etapas, conforme reorganização da seção 5.3.

---

### `helpers/auth.js`

**Localização:** `/load-tests/helpers/auth.js`

**O que faz:** Módulo compartilhado que centraliza a lógica de autenticação para todos os scripts de teste administrativos.

**Propósito:** Eliminar a duplicação da função `setup()` com POST `/api/auth/login` que existia em ~18 arquivos.

**Exports:**
- `setup(options)` — Realiza login com credenciais e retorna `{ token }`. Valida estrutura da resposta e lança erro descritivo se o formato for inesperado.

**Uso:**
```javascript
import { setup } from '../helpers/auth.js';
export function setup() {
  return setup(); // Re-exporta para o k6
}
```

**Validações:**
- Verifica se `loginRes.status === 200` antes de processar
- Verifica se `body`, `body.data` e `body.data.token` existem
- Lança `Error` com mensagem descritiva em caso de falha

---

### `helpers/config.js`

**Localização:** `/load-tests/helpers/config.js`

**O que faz:** Módulo compartilhado que centraliza a configuração de ambiente para todos os scripts de teste.

**Propósito:** Eliminar a duplicação de declarações `BASE_URL`, `USERNAME` e `PASSWORD` que existiam em cada script individualmente.

**Exports:**
- `BASE_URL` — Lê de `__ENV.BASE_URL` com fallback para `'http://localhost:3000'`
- `USERNAME` — Lê de `__ENV.ADMIN_USERNAME` com fallback para `'CHANGE_ME'` (força falha se não configurado)
- `PASSWORD` — Lê de `__ENV.ADMIN_PASSWORD` com fallback para `'CHANGE_ME'` (força falha se não configurado)
- `getConfig()` — Função que retorna objeto com todas as configurações

**Uso:**
```javascript
import { BASE_URL } from '../helpers/config.js';
```

**Nota de segurança (23/05/2026):** Os fallbacks de `USERNAME` e `PASSWORD` foram alterados de valores reais (`'admin'` / `'123456'`) para `'CHANGE_ME'` para evitar que credenciais reais sejam expostas no código-fonte. Agora é obrigatório configurar `__ENV.ADMIN_USERNAME` e `__ENV.ADMIN_PASSWORD` para executar os testes que requerem autenticação.

---

### `helpers/network.js`

**Localização:** `/load-tests/helpers/network.js`

**O que faz:** Módulo compartilhado com funções utilitárias de rede para os testes.

**Propósito:** Centralizar a função `getRandomIP()` que estava duplicada em 5 arquivos.

**Exports:**
- `getRandomIP()` — Gera um endereço IPv4 aleatório no formato `x.x.x.x`

**Uso:**
```javascript
import { getRandomIP } from '../helpers/network.js';
```

**Observação:** IP spoofing é usado nos testes para evitar rate limit. Consulte a seção 2.2 do UPGRADE_load-tests.md para discussão sobre segurança disso.

---

### `helpers/profiles.js`

**Localização:** `/load-tests/helpers/profiles.js`

**O que faz:** Módulo compartilhado que define perfis de carga padronizados para os testes.

**Propósito:** Garantir thresholds consistentes e configurações de carga reutilizáveis, eliminando declarações inline espalhadas.

**Perfis disponíveis:**

| Perfil | VUs | Duração | Thresholds | Uso Típico |
|--------|-----|---------|-----------|------------|
| `light` | 1 | 5 iterações | checks=100%, p(95)<500ms | Testes funcionais |
| `medium` | 5 | 20s (5+10+5) | p(95)<300ms, failed<1% | Carga moderada |
| `heavy` | 50 | 50s (10+30+10) | p(95)<2000ms, failed<5% | Estresse |
| `health` | 20 | 20s (5+10+5) | p(95)<100ms, failed<1% | Health check |
| `recovery` | 1 | 2min constante | Nenhum (thresholds vazios) | Monitoramento |
| `rateLimit` | 0→50 | 50s (10+30+10) | Nenhum (thresholds vazios) | Brute force |

**Exports:**
- `PROFILES` — Objeto com todos os perfis
- `getProfile(profileName, overrides)` — Retorna perfil mesclado com sobrescritas

**Uso:**
```javascript
import { getProfile } from '../helpers/profiles.js';
export const options = getProfile('light', { iterations: 10 });
```

---

### `helpers/report.js`

**Localização:** `/load-tests/helpers/report.js`

**O que faz:** Módulo compartilhado para geração padronizada de relatórios de teste k6.

**Propósito:** Centralizar a lógica de `handleSummary()` que estava duplicada em ~18 arquivos, e atualizar a versão do `k6-summary` de `0.0.2` para `latest`.

**Exports:**
- `generateReport(data, testName)` — Gera objeto de saída com `stdout` (textSummary) e arquivo JSON, com sanitização automática do token JWT em `data.setup_data.token`

**Segurança:**
- A função interna `sanitizeToken()` é chamada automaticamente dentro de `generateReport()`, substituindo o token JWT por `*** TOKEN OCULTO ***` antes de exportar os dados para o relatório JSON e saída padrão
- Isso garante que todos os ~22 arquivos que usam `generateReport()` sanitizem automaticamente o token, sem necessidade de chamada manual em cada teste

**Uso:**
```javascript
import { generateReport } from '../helpers/report.js';
export function handleSummary(data) {
  return generateReport(data, 'meu_teste');
}
```

**Observação:** Utiliza `https://jslib.k6.io/k6-summary/latest/index.js` em vez da versão fixa `0.0.2`.

---

### `helpers/resource-test-runner.js`

**Localização:** `/load-tests/helpers/resource-test-runner.js`

**O que faz:** Módulo genérico que elimina a duplicação de código entre pares de testes de músicas e vídeos (CRUD, filtro, paginação, ordenação, carga). Cada arquivo de teste (~20-30 linhas) passa a ser apenas configuração que invoca as funções do runner.

**Propósito:** Eliminar ~80% de código duplicado entre os 10 arquivos de teste de músicas e vídeos, centralizando a lógica comum e mantendo apenas a configuração específica de cada recurso.

**Exports:**
- `createCrudTest(config)` — Gera options + default() para teste CRUD (create/update/delete) com métricas de erro e sleep entre operações
- `createFilterTest(config)` — Gera options + default() para teste de filtro por termo de busca com validação de match
- `createPaginationTest(config)` — Gera options + default() para teste de paginação com validação cruzada de IDs entre páginas
- `createSortTest(config)` — Gera options + default() para teste de ordenação (explícita ou comportamento padrão) com verificação de datas
- `createLoadTest(config)` — Gera options + setup() + default() para teste de carga com suporte a health check, IP spoofing e requisições extras
- `sanitizeToken(data)` — Oculta token JWT em relatórios
- `generateReport(data, testName)` — Re-export de `helpers/report.js`

**Configurações aceitas por cada função:**

| Função | Configurações Principais |
|--------|-------------------------|
| `createCrudTest` | `adminEndpoint`, `payloadTemplate` (função), `resourceName`, `uniqueIdGenerator`, `profileName` |
| `createFilterTest` | `publicEndpoint`, `searchField`, `searchValues[]`, `itemsPath`, `responsePath` |
| `createPaginationTest` | `publicEndpoint`, `itemsPath`, `responsePath`, `resourceName`, `limit` |
| `createSortTest` | `publicEndpoint`, `sortField`, `sortOrder`, `itemsPath`, `dateField`, `useExplicitSort` |
| `createLoadTest` | `endpoint`, `requireAuth`, `useSpoofIP`, `healthCheck`, `checkResponse`, `extraRequests[]` |

**Uso:**
```javascript
import { createCrudTest, sanitizeToken, generateReport } from '../helpers/resource-test-runner.js';
import { setup } from '../helpers/auth.js';

const crudTest = createCrudTest({
  adminEndpoint: '/api/admin/musicas',
  payloadTemplate: () => ({ titulo: `Teste ${Date.now()}`, artista: 'K6', ... }),
  resourceName: 'musicas',
});

export const options = crudTest.options;
export { setup };
export default crudTest.default;
export function handleSummary(data) {
  return generateReport(sanitizeToken(data), crudTest.reportName);
}
```

**Criado em:** 23/05/2026

---

## Padrões e Convenções Comuns

### Padrões Estruturais

1. **`setup()` + `default()`** — A maioria dos scripts segue o padrão de função `setup()` para autenticação e `default()` para execução dos testes. A autenticação é centralizada via `helpers/auth.js`.

2. **Autenticação via JWT** — Praticamente todos os testes administrativos fazem login via `POST /api/auth/login` e extraem o token JWT de `data.token` no corpo da resposta, usando `helpers/auth.js`.

3. **Configuração centralizada** — Todos os scripts importam `BASE_URL` de `helpers/config.js` em vez de declarar localmente.

4. **Perfis de carga padronizados** — Os scripts usam `getProfile()` de `helpers/profiles.js` para definir VUs, duração e thresholds, garantindo consistência.

5. **Relatórios padronizados** — Os scripts usam `generateReport()` de `helpers/report.js` para gerar relatórios JSON em `./reports/k6-summaries/`.

6. **IP Spoofing** — Os testes de carga que precisam evitar rate limit usam `getRandomIP()` de `helpers/network.js`.

7. **Tags de métricas** — Uso de `tags` para categorizar requisições e filtrar thresholds por fluxo específico.

8. **Organização em subpastas** — Os scripts estão organizados em 3 subpastas (`performance/`, `functional/`, `security/`), e os helpers em `helpers/`.

### Endpoints Utilizados

| Categoria | Endpoints |
|-----------|-----------|
| **Autenticação** | `POST /api/auth/login` |
| **Saúde/Monitoramento** | `GET /api/status?mode=health` |
| **Músicas (Admin)** | `GET/POST/PUT/DELETE /api/admin/musicas` |
| **Vídeos (Admin)** | `GET/POST/PUT/DELETE /api/admin/videos` |
| **Posts (Admin)** | `POST /api/admin/posts` |
| **Posts (Público)** | `GET /api/posts` |
| **Backup** | `GET /api/admin/backups` |
| **Upload** | `POST /api/admin/upload` |

### Thresholds por Perfil

| Perfil | Threshold | Onde é usado |
|--------|-----------|-------------|
| `health` | `p(95) < 100ms` | Health check |
| `medium` | `p(95) < 300ms`, `failed < 1%` | Testes de carga de músicas e vídeos |
| `light` | `p(95) < 500ms`, `checks == 100%` | Testes funcionais e CRUD |
| `heavy` | `p(95) < 2000ms`, `failed < 5%` | Testes de estresse e DDoS |

### Módulos Compartilhados

| Módulo | Localização | Função |
|--------|-------------|--------|
| `auth.js` | `helpers/auth.js` | Autenticação centralizada (login + extração de token) |
| `config.js` | `helpers/config.js` | Configuração de ambiente centralizada |
| `network.js` | `helpers/network.js` | Utilitários de rede (`getRandomIP()`) |
| `profiles.js` | `helpers/profiles.js` | Perfis de carga padronizados |
| `report.js` | `helpers/report.js` | Geração de relatórios padronizados |
| `resource-test-runner.js` | `helpers/resource-test-runner.js` | Runner genérico para testes CRUD, filtro, paginação, ordenação e carga |

---

> **Data da análise:** 13/05/2026
> **Última atualização:** 24/05/2026
> **Total de scripts analisados:** 30 scripts k6 (16 performance + 9 functional + 5 security) + 1 env-config.json + 1 load-tests.yml + 6 módulos helpers + 1 sleep.js