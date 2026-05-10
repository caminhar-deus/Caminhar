# 📊 Análise dos Arquivos de Teste de Carga — `/load-tests`

> **Propósito:** Documentação detalhada de todos os arquivos da pasta `load-tests/`, descrevendo o que cada um faz, seu propósito, estrutura e endpoints utilizados.

---

## Sumário

1. [Visão Geral](#visão-geral)
2. [Arquivos de Teste](#arquivos-de-teste)
   - [authenticated-flow.js](#authenticated-flowjs)
   - [backup-verification-test.js](#backup-verification-testjs)
   - [cache-headers-test.js](#cache-headers-testjs)
   - [cache-performance-test.js](#cache-performance-testjs)
   - [create-post-flow.js](#create-post-flowjs)
   - [ddos-search-test.js](#ddos-search-testjs)
   - [health-check.js](#health-checkjs)
   - [ip-spoofing-test.js](#ip-spoofing-testjs)
   - [login-negative-test.js](#login-negative-testjs)
   - [musicas-crud-test.js](#musicas-crud-testjs)
   - [musicas-filter-test.js](#musicas-filter-testjs)
   - [musicas-load-test.js](#musicas-load-testjs)
   - [musicas-pagination-test.js](#musicas-pagination-testjs)
   - [musicas-search-test.js](#musicas-search-testjs)
   - [musicas-sort-test.js](#musicas-sort-testjs)
   - [pagination-test.js](#pagination-testjs)
   - [posts-cursor-pagination-test.js](#posts-cursor-pagination-testjs)
   - [posts-tags-test.js](#posts-tags-testjs)
   - [rate-limit-test.js](#rate-limit-testjs)
   - [recovery-test.js](#recovery-testjs)
   - [search-content-test.js](#search-content-testjs)
   - [stress-test-combined.js](#stress-test-combinedjs)
   - [upload-flow.js](#upload-flowjs)
   - [video-validation-test.js](#video-validation-testjs)
   - [videos-crud-test.js](#videos-crud-testjs)
   - [videos-filter-test.js](#videos-filter-testjs)
   - [videos-load-test.js](#videos-load-testjs)
   - [videos-pagination-test.js](#videos-pagination-testjs)
   - [videos-sort-test.js](#videos-sort-testjs)
3. [Arquivos de Configuração e Workflow](#arquivos-de-configuração-e-workflow)
   - [env-config.json](#env-configjson)
   - [load-tests.yml (CI)](#load-testsyml-ci)
4. [Padrões e Convenções Comuns](#padrões-e-convenções-comuns)

---

## Visão Geral

A pasta `load-tests/` contém **29 arquivos** (28 scripts de teste em k6 + 1 configuração JSON) que compõem a suíte de testes de carga, stress, performance e segurança do projeto **Caminhar**. Todos os scripts utilizam a ferramenta [k6](https://k6.io/) da Grafana Labs.

Os testes estão organizados em categorias funcionais:

| Categoria | Quantidade | Descrição |
|-----------|-----------|-----------|
| **Músicas** | 6 | CRUD, filtro, paginação, busca, ordenação, carga |
| **Vídeos** | 6 | CRUD, filtro, paginação, validação, ordenação, carga |
| **Posts/Blog** | 4 | Paginação com cursor, tags, busca de conteúdo, criação de post |
| **Autenticação/Segurança** | 4 | Login negativo, rate limit, IP spoofing, DDoS |
| **Saúde/Recuperação** | 3 | Health check, backup, recovery |
| **Cache** | 2 | Headers de cache, performance de cache |
| **Fluxos Combinados** | 2 | Stress test combinado, upload flow |
| **Configuração** | 1 | env-config.json |
| **CI/CD** | 1 | load-tests.yml (workflow) |

---

## Arquivos de Teste

---

### `authenticated-flow.js`

**Localização:** `/load-tests/authenticated-flow.js`

**O que faz:** Testa o fluxo completo de autenticação: login com credenciais de admin, obtenção de token JWT e acesso a uma rota protegida.

**Propósito:** Validar que o fluxo de autenticação funciona corretamente sob carga, garantindo que o login e o acesso a rotas protegidas não apresentem degradação com 5 usuários simultâneos.

**Estrutura:**
- `setup()` — Health check em `GET /` para verificar servidor
- `default()` — Login → extrai token → acessa rota protegida `/api/v1/settings`
- Thresholds: `p(95) < 1000ms`, taxa de sucesso > 99% para login e settings

**Endpoints chamados:**
- `GET /` — Health check do servidor
- `POST /api/v1/auth/login` — Autenticação
- `GET /api/v1/settings` — Rota protegida (requer token Bearer)

**Configuração de carga:** 3 estágios — ramp-up para 5 VUs (10s), manter 5 VUs (20s), ramp-down (5s)

---

### `backup-verification-test.js`

**Localização:** `/load-tests/backup-verification-test.js`

**O que faz:** Teste funcional para verificar a listagem de backups, validando a estrutura JSON de resposta.

**Propósito:** Garantir que o endpoint de backups retorne a estrutura esperada com campos como `id`, `filename`, `size`, `created_at`.

**Estrutura:**
- `setup()` — Login como admin, retorna token
- `default()` — GET `/api/admin/backups` com token, valida resposta
- `handleSummary()` — Gera relatório JSON

**Endpoints chamados:**
- `POST /api/v1/auth/login` — Autenticação
- `GET /api/admin/backups` — Listagem de backups

**Configuração de carga:** Apenas 1 VU, 3 iterações (teste funcional, não de carga)

---

### `cache-headers-test.js`

**Localização:** `/load-tests/cache-headers-test.js`

**O que faz:** Verifica a presença e corretude dos headers de cache HTTP (`Cache-Control`, `ETag`, `Last-Modified`).

**Propósito:** Garantir que as respostas da API incluam headers de cache apropriados para otimização de performance.

**Estrutura:**
- `setup()` — Login como admin
- `default()` — GET em rota pública, valida headers de cache
- Testa `Cache-Control`, `ETag`, `Last-Modified`

**Endpoints chamados:**
- `POST /api/v1/auth/login` — Autenticação
- Rota pública da API (verifica headers de resposta)

**Configuração de carga:** 1 VU, 10 iterações

---

### `cache-performance-test.js`

**Localização:** `/load-tests/cache-performance-test.js`

**O que faz:** Teste comparativo de performance entre requisições cacheadas e não cacheadas.

**Propósito:** Medir a eficácia do cache, comparando tempos de resposta com e sem headers de cache, validando que respostas cacheadas são significativamente mais rápidas.

**Estrutura:**
- Configuração com 2 estágios (ramp-up para 10 VUs, manter 30s)
- Requisição inicial (sem cache) → armazena headers → requisição com `If-None-Match` (cache)
- Compara `http_req_duration` entre os dois cenários

**Endpoints chamados:**
- Endpoint público da API (2 requisições: sem cache e com ETag)

**Configuração de carga:** 10 VUs, 30s de duração

---

### `create-post-flow.js`

**Localização:** `/load-tests/create-post-flow.js`

**O que faz:** Testa o fluxo completo de criação de posts no blog: login → criação → verificação.

**Propósito:** Validar o processo de criação de posts no blog, garantindo que o endpoint `POST /api/admin/posts` funcione corretamente sob carga.

**Estrutura:**
- `setup()` — Login como admin
- `default()` — Cria post com título único, valida status 201 e ID retornado
- Gera conteúdo aleatório para simular dados reais

**Endpoints chamados:**
- `POST /api/v1/auth/login` — Autenticação
- `POST /api/admin/posts` — Criação de post

**Configuração de carga:** 3 VUs, 10 iterações

---

### `ddos-search-test.js`

**Localização:** `/load-tests/ddos-search-test.js`

**O que faz:** Simula um cenário de busca massiva (tipo DDoS) no endpoint de busca de músicas.

**Propósito:** Verificar a resiliência do sistema sob alta frequência de requisições de busca, validando thresholds de performance e taxa de erro.

**Estrutura:**
- Gera busca aleatória com termos fixos
- Headers com IP aleatório para evitar rate limit
- Thresholds agressivos: `p(95) < 2000ms`, taxa de falha < 5%

**Endpoints chamados:**
- `GET /api/musicas?search={termo}` — Busca de músicas

**Configuração de carga:** 15 VUs, 3 minutos de duração

---

### `health-check.js`

**Localização:** `/load-tests/health-check.js`

**O que faz:** Teste de carga específico para o endpoint de health check da API.

**Propósito:** Verificar se o endpoint `GET /api/v1/health` responde corretamente sob carga crescente (até 20 usuários) e respeita SLAs rigorosos de tempo de resposta (p95 < 100ms).

**Estrutura:**
- 3 estágios de carga: ramp-up (10s, 20 VUs), manter (30s), ramp-down (10s)
- `setup()` — Verifica conectividade básica
- `default()` — GET `/api/v1/health`, valida status 200
- `handleSummary()` — Gera relatório JSON e HTML

**Endpoints chamados:**
- `GET /api/v1/health` — Health check

**Configuração de carga:** 20 VUs no pico

---

### `ip-spoofing-test.js`

**Localização:** `/load-tests/ip-spoofing-test.js`

**O que faz:** Testa se o sistema é vulnerável a ataque de IP spoofing via header `X-Forwarded-For`.

**Propósito:** Validar que o sistema não aceita requisições com IPs falsificados como autênticas para burlar rate limiting.

**Estrutura:**
- `setup()` — Login como admin
- Gera IPs aleatórios no header `X-Forwarded-For`
- Verifica se o sistema trata corretamente ou é enganado pelo spoofing

**Endpoints chamados:**
- `POST /api/v1/auth/login` — Autenticação
- Endpoints protegidos com headers de IP falsificados

---

### `login-negative-test.js`

**Localização:** `/load-tests/login-negative-test.js`

**O que faz:** Teste negativo de autenticação que envia credenciais inválidas.

**Propósito:** Garantir que o endpoint de login rejeite corretamente credenciais inválidas com status 401 e não vaze informações sobre usuários existentes.

**Estrutura:**
- Envia requisições POST com credenciais aleatórias
- Valida status 401 e mensagem de erro genérica
- Verifica que não há vazamento de informações

**Endpoints chamados:**
- `POST /api/v1/auth/login` — Autenticação (com credenciais inválidas)

**Configuração de carga:** 3 VUs, 20 iterações

---

### `musicas-crud-test.js`

**Localização:** `/load-tests/musicas-crud-test.js`

**O que faz:** Testa as operações CRUD (Create, Read, Update, Delete) para o recurso de músicas.

**Propósito:** Validar o ciclo de vida completo de uma música na API administrativa: criar, listar, atualizar e deletar.

**Estrutura:**
- `setup()` — Login como admin
- `default()` — POST (criar) → GET/listar → PUT (atualizar) → DELETE
- Valida IDs e status codes em cada etapa

**Endpoints chamados:**
- `POST /api/v1/auth/login` — Autenticação
- `POST /api/admin/musicas` — Criar música
- `GET /api/admin/musicas` — Listar músicas
- `PUT /api/admin/musicas` — Atualizar música
- `DELETE /api/admin/musicas` — Deletar música

**Configuração de carga:** 5 VUs, 8 iterações

---

### `musicas-filter-test.js`

**Localização:** `/load-tests/musicas-filter-test.js`

**O que faz:** Testa o filtro de músicas por campo `publicado` (true/false).

**Propósito:** Validar que o endpoint de músicas filtra corretamente os resultados com base no parâmetro `publicado`.

**Estrutura:**
- Login como admin
- Requisições GET com query parameter `?publicado=true` e `?publicado=false`
- Valida que todos os itens retornados respeitam o filtro

**Endpoints chamados:**
- `POST /api/v1/auth/login` — Autenticação
- `GET /api/admin/musicas?publicado={true|false}` — Listar com filtro

---

### `musicas-load-test.js`

**Localização:** `/load-tests/musicas-load-test.js`

**O que faz:** Teste de carga (stress/performance) que simula múltiplos usuários acessando a listagem de músicas simultaneamente.

**Propósito:** Validar o comportamento da API `/api/admin/musicas` sob carga progressiva, garantindo thresholds de performance (p95 < 300ms) e taxa de erro (< 1%).

**Estrutura:**
- 3 estágios: ramp-up (5s, 5 VUs), manter (10s), ramp-down (5s)
- `setup()` — Login, retorna token
- Função `getRandomIP()` — Gera IP aleatório para evitar rate limit
- `handleSummary()` — Gera relatório JSON

**Endpoints chamados:**
- `GET /` — Health check
- `POST /api/v1/auth/login` — Autenticação
- `GET /api/admin/musicas` — Listar músicas

---

### `musicas-pagination-test.js`

**Localização:** `/load-tests/musicas-pagination-test.js`

**O que faz:** Testa a paginação do endpoint de músicas com diferentes valores de `page` e `limit`.

**Propósito:** Validar que a paginação funciona corretamente, retornando o número esperado de itens por página e os metadados de paginação.

**Estrutura:**
- 1 VU, itera com diferentes combinações de `page` e `limit`
- Valida `total`, `page`, `limit` e quantidade de itens retornados

**Endpoints chamados:**
- `POST /api/v1/auth/login` — Autenticação
- `GET /api/admin/musicas?page={n}&limit={n}` — Listar com paginação

---

### `musicas-search-test.js`

**Localização:** `/load-tests/musicas-search-test.js`

**O que faz:** Testa a busca textual no endpoint de músicas com diferentes termos.

**Propósito:** Garantir que a busca por título retorne resultados relevantes e respeite os limites de paginação.

**Estrutura:**
- Array de termos de busca pré-definidos
- Requisições GET com `?search={termo}`
- Valida status, estrutura de resposta e resultados

**Endpoints chamados:**
- `POST /api/v1/auth/login` — Autenticação
- `GET /api/admin/musicas?search={termo}` — Buscar músicas

---

### `musicas-sort-test.js`

**Localização:** `/load-tests/musicas-sort-test.js`

**O que faz:** Testa a ordenação dos resultados de músicas por diferentes campos (`titulo`, `created_at`).

**Propósito:** Validar que o endpoint de músicas ordena corretamente os resultados de acordo com o campo e direção especificados.

**Estrutura:**
- Testa ordenação ASC e DESC para cada campo
- Valida que a ordem dos resultados corresponde ao esperado

**Endpoints chamados:**
- `POST /api/v1/auth/login` — Autenticação
- `GET /api/admin/musicas?sort={campo}&order={asc|desc}` — Listar ordenado

---

### `pagination-test.js`

**Localização:** `/load-tests/pagination-test.js`

**O que faz:** Teste genérico de paginação (não específico de um recurso).

**Propósito:** Validar o comportamento geral do sistema de paginação da API, testando diferentes tamanhos de página e navegação.

**Estrutura:**
- Requisições com diferentes valores de `limit` (5, 10, 20, 50)
- Verifica limites máximos e comportamento em páginas vazias

**Endpoints chamados:**
- `GET /api/{recurso}?page={n}&limit={n}` — Paginação genérica

---

### `posts-cursor-pagination-test.js`

**Localização:** `/load-tests/posts-cursor-pagination-test.js`

**O que faz:** Testa a paginação baseada em cursor para o recurso de posts.

**Propósito:** Validar o funcionamento da paginação por cursor (diferente de page/offset), que é mais eficiente para grandes conjuntos de dados.

**Estrutura:**
- Requisição inicial para obter primeiro cursor
- Navegação pelas páginas seguintes usando o cursor retornado
- Valida estrutura de resposta com `cursor` e `hasMore`

**Endpoints chamados:**
- `GET /api/posts?cursor={id}&limit={n}` — Posts com paginação por cursor

---

### `posts-tags-test.js`

**Localização:** `/load-tests/posts-tags-test.js`

**O que faz:** Testa o filtro de posts por tag na API pública.

**Propósito:** Verificar se a rota `/api/posts?tag=...` retorna corretamente posts filtrados por uma tag específica.

**Estrutura:**
- 1 VU, 5 iterações
- Tags fixas: `['fé', 'oração', 'bíblia', 'vida', 'espiritualidade']`
- Valida se posts retornados contêm a tag buscada
- `handleSummary()` — Gera relatório JSON

**Endpoints chamados:**
- `GET /api/posts?tag={tag}` — Posts filtrados por tag

**Observação:** Usa rota `/api/posts` (sem `/v1`), indicando ser rota pública sem autenticação.

---

### `rate-limit-test.js`

**Localização:** `/load-tests/rate-limit-test.js`

**O que faz:** Testa o mecanismo de rate limiting da API, enviando requisições em alta frequência.

**Propósito:** Garantir que o sistema limite corretamente requisições excessivas, retornando status 429 (Too Many Requests) quando o limite é excedido.

**Estrutura:**
- 5 estágios: ramp-up para 20 VUs, manter, aumentar para 50 VUs, manter, ramp-down
- Verifica presença de headers `X-RateLimit-Remaining` e `Retry-After`
- Valida status 429 em requisições que excedem o limite

**Endpoints chamados:**
- Endpoint público (provavelmente `/api/v1/health` ou similar)

**Configuração de carga:** Até 50 VUs

---

### `recovery-test.js`

**Localização:** `/load-tests/recovery-test.js`

**O que faz:** Testa a capacidade de recuperação do sistema após um período de alta carga.

**Propósito:** Validar que o sistema se recupera adequadamente (sem vazamento de recursos, sem degradação permanente) após um pico de estresse.

**Estrutura:**
- Fase 1: Carga intensa (muitas requisições concorrentes)
- Fase 2: Período de descanso (sem requisições)
- Fase 3: Verificação se o sistema voltou ao estado normal

**Endpoints chamados:**
- Múltiplos endpoints durante a fase de estresse
- `GET /api/v1/health` — Verificação de recuperação

---

### `search-content-test.js`

**Localização:** `/load-tests/search-content-test.js`

**O que faz:** Testa a busca de conteúdo textual em toda a aplicação.

**Propósito:** Validar que o mecanismo de busca retorna resultados consistentes e performáticos para diferentes termos de busca.

**Estrutura:**
- Requisições com termos de busca variados
- Valida estrutura de resposta e relevância dos resultados
- Mede tempo de resposta da busca

**Endpoints chamados:**
- `GET /api/search?q={termo}` — Busca geral de conteúdo

---

### `stress-test-combined.js`

**Localização:** `/load-tests/stress-test-combined.js`

**O que faz:** Teste de estresse combinado com múltiplos cenários executados simultaneamente. É o teste mais robusto e completo da suíte.

**Propósito:** Simular cenário realista de produção com:
- CRUD de vídeos sob carga crescente (20 → 50 → 100 VUs)
- Monitoramento de memória do Node.js durante todo o teste

**Estrutura:**
- **2 cenários paralelos** via `scenarios` do k6:
  1. `stress_test` — Ramp-up progressivo (20, 50, 100 VUs), executa CRUD completo de vídeos
  2. `memory_monitor` — 1 VU constante por 5 min monitorando memória do Node.js
- `setup()` — Login global (token compartilhado entre cenários)
- `stressTestFlow()` — Cria, atualiza e deleta vídeo por iteração
- `memoryMonitorFlow()` — Coleta métricas de memória (RSS, heapTotal, heapUsed)
- `teardown()` — Limpa dados de teste criados (deleta vídeos com "K6" ou "Estresse")
- `handleSummary()` — Gera relatório em texto, JSON e HTML

**Métricas customizadas:**
- `nodejs_memory_rss_bytes` — Memória RSS
- `nodejs_memory_heap_total_bytes` — Heap total
- `nodejs_memory_heap_used_bytes` — Heap usado (threshold: max < 1GB)

**Endpoints chamados:**
- `POST /api/v1/auth/login` — Autenticação
- `POST /api/admin/videos` — Criar vídeo
- `PUT /api/admin/videos` — Atualizar vídeo
- `DELETE /api/admin/videos` — Deletar vídeo
- `GET /api/v1/status` — Status do servidor (monitoramento de memória)
- `GET /api/admin/videos?limit=100` — Listar vídeos (teardown)

---

### `upload-flow.js`

**Localização:** `/load-tests/upload-flow.js`

**O que faz:** Testa o fluxo de upload de arquivos para a aplicação.

**Propósito:** Validar que o endpoint de upload de arquivos funciona sob carga e respeita limites de tamanho e tipo de arquivo.

**Estrutura:**
- `setup()` — Login como admin
- Simula upload de arquivo (provavelmente imagem) usando multipart/form-data
- Valida status code e resposta

**Endpoints chamados:**
- `POST /api/v1/auth/login` — Autenticação
- `POST /api/admin/upload` — Upload de arquivo

---

### `video-validation-test.js`

**Localização:** `/load-tests/video-validation-test.js`

**O que faz:** Teste funcional que valida as regras de validação de URL do YouTube na criação de vídeos.

**Propósito:** Garantir que o endpoint de criação `/api/admin/videos` tenha validações corretas para URLs do YouTube, rejeitando domínios inválidos e URLs malformadas.

**Estrutura:**
- `setup()` — Login como admin
- `default()` — 3 cenários de validação:
  1. URL válida do YouTube (deve passar)
  2. URL de domínio inválido — Vimeo (deve rejeitar)
  3. URL malformada (deve rejeitar)
- `handleSummary()` — Gera relatório JSON

**Endpoints chamados:**
- `POST /api/v1/auth/login` — Autenticação
- `POST /api/admin/videos` — Criação de vídeo (3x)

---

### `videos-crud-test.js`

**Localização:** `/load-tests/videos-crud-test.js`

**O que faz:** Testa as operações CRUD para o recurso de vídeos, similar ao `musicas-crud-test.js`.

**Propósito:** Validar o ciclo de vida completo de um vídeo: criar, listar, atualizar e deletar.

**Estrutura:**
- `setup()` — Login como admin
- `default()` — POST (criar) → GET (listar) → PUT (atualizar) → DELETE
- Valida IDs, status codes e conteúdo da resposta

**Endpoints chamados:**
- `POST /api/v1/auth/login` — Autenticação
- `POST /api/admin/videos` — Criar vídeo
- `GET /api/admin/videos` — Listar vídeos
- `PUT /api/admin/videos` — Atualizar vídeo
- `DELETE /api/admin/videos` — Deletar vídeo

---

### `videos-filter-test.js`

**Localização:** `/load-tests/videos-filter-test.js`

**O que faz:** Testa o filtro de vídeos por campo `publicado` (true/false).

**Propósito:** Validar que o endpoint de vídeos filtra corretamente com base no parâmetro `publicado`.

**Estrutura:**
- Login como admin
- Requisições GET com `?publicado=true` e `?publicado=false`
- Valida que todos os itens respeitam o filtro aplicado

**Endpoints chamados:**
- `POST /api/v1/auth/login` — Autenticação
- `GET /api/admin/videos?publicado={true|false}` — Listar com filtro

---

### `videos-load-test.js`

**Localização:** `/load-tests/videos-load-test.js`

**O que faz:** Teste de carga específico para o endpoint de listagem de vídeos.

**Propósito:** Validar a performance da API de vídeos sob carga progressiva, com thresholds de p(95) < 300ms.

**Estrutura:**
- 3 estágios: ramp-up (5s, 5 VUs), manter (10s), ramp-down (5s)
- `setup()` — Login como admin
- `getRandomIP()` — Evita rate limit por IP
- `handleSummary()` — Gera relatório JSON

**Endpoints chamados:**
- `POST /api/v1/auth/login` — Autenticação
- `GET /api/admin/videos` — Listar vídeos

---

### `videos-pagination-test.js`

**Localização:** `/load-tests/videos-pagination-test.js`

**O que faz:** Testa a paginação do endpoint de vídeos com diferentes valores de `page` e `limit`.

**Propósito:** Validar que a paginação retorna a quantidade correta de itens e metadados (total, page, limit).

**Estrutura:**
- Requisições com combinações de `page` e `limit`
- Valida estrutura de paginação e contagem de itens

**Endpoints chamados:**
- `POST /api/v1/auth/login` — Autenticação
- `GET /api/admin/videos?page={n}&limit={n}` — Listar com paginação

---

### `videos-sort-test.js`

**Localização:** `/load-tests/videos-sort-test.js`

**O que faz:** Testa a ordenação dos resultados de vídeos por diferentes campos.

**Propósito:** Validar que o endpoint ordena corretamente os resultados de acordo com campo e direção especificados.

**Estrutura:**
- Testa ordenação ASC e DESC para campos como `titulo`, `created_at`
- Valida sequência dos resultados

**Endpoints chamados:**
- `POST /api/v1/auth/login` — Autenticação
- `GET /api/admin/videos?sort={campo}&order={asc|desc}` — Listar ordenado

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
  "ADMIN_USERNAME": "admin",
  "ADMIN_PASSWORD": "123456"
}
```

**Observações:**
- Define URL base como `http://localhost:3000`
- Credenciais de admin em texto plano (aceitável apenas para ambiente local/teste)
- Cada script tem fallback próprio no código para estes valores

---

### `load-tests.yml` (CI/CD)

**Localização:** `/load-tests.yml`

**O que faz:** Workflow do GitHub Actions que executa a suíte de testes de carga em CI.

**Propósito:** Automatizar a execução dos testes de carga em ambiente isolado com PostgreSQL e Redis, executando o teste de estresse combinado.

**Estrutura do workflow:**
1. **Schedule:** Execução automática diária às 03:00 UTC
2. **Triggers manuais:** via `workflow_dispatch`
3. **Serviços:**
   - PostgreSQL 15 (banco de dados isolado)
   - Redis 7 (rate limiting/cache)
4. **Passos:**
   - Checkout do repositório
   - Setup Node.js 24.14.1 com cache
   - Instalação de dependências (`npm ci`)
   - Restauração do cache de build do Next.js
   - Criação de diretórios de relatório
   - Setup do banco de dados de teste
   - Seed do banco com dados de teste
   - Build da aplicação
   - Inicialização da aplicação em background
   - Setup do k6
   - Execução do `stress-test-combined.js`
   - Upload dos relatórios como artefato (retidos por 30 dias)

---

## Padrões e Convenções Comuns

### Padrões Estruturais

1. **`setup()` + `default()`** — A maioria dos scripts segue o padrão de função `setup()` para autenticação e `default()` para execução dos testes.

2. **Autenticação via JWT** — Praticamente todos os testes administrativos fazem login via `POST /api/v1/auth/login` e extraem o token JWT de `data.token` no corpo da resposta.

3. **IP Spoofing** — Vários testes de carga usam `getRandomIP()` para gerar IPs aleatórios e evitar rate limit baseado em IP, enviando header `X-Forwarded-For`.

4. **Relatórios** — Múltiplos scripts implementam `handleSummary()` gerando relatórios em `./reports/k6-summaries/`.

5. **Tags de métricas** — Uso de `tags` para categorizar requisições e filtrar thresholds por fluxo específico.

### Endpoints Utilizados

| Categoria | Endpoints |
|-----------|-----------|
| **Autenticação** | `POST /api/v1/auth/login` |
| **Saúde/Monitoramento** | `GET /`, `GET /api/v1/health`, `GET /api/v1/status` |
| **Músicas (Admin)** | `GET/POST/PUT/DELETE /api/admin/musicas` |
| **Vídeos (Admin)** | `GET/POST/PUT/DELETE /api/admin/videos` |
| **Posts (Admin)** | `POST /api/admin/posts` |
| **Posts (Público)** | `GET /api/posts` |
| **Backup** | `GET /api/admin/backups` |
| **Configurações** | `GET /api/v1/settings` |
| **Busca** | `GET /api/musicas?search=`, `GET /api/search?q=` |
| **Upload** | `POST /api/admin/upload` |

### Thresholds Comuns

| Threshold | Valor | Onde é usado |
|-----------|-------|-------------|
| `p(95) < 300ms` | Performance | Testes de carga de músicas e vídeos |
| `p(95) < 500ms` | Performance | Testes combinados e CRUD |
| `p(95) < 100ms` | Performance crítica | Health check |
| `rate < 0.01` | Taxa de erro < 1% | Testes de carga |
| `rate > 0.99` | Taxa de sucesso > 99% | Testes de autenticação |

---

> **Data da análise:** 10/05/2026
> **Total de scripts analisados:** 28 scripts k6 + 1 arquivo de configuração + 1 workflow CI