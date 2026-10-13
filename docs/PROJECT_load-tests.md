# 📊 Análise dos Arquivos de Teste de Carga — `/load-tests`

## Sumário

1. [Nome do Documento](#1-nome-do-documento)
2. [Descrição Geral](#2-descrição-geral)
3. [Estrutura de Arquivos e Pastas](#3-estrutura-de-arquivos-e-pastas)
4. [Análise de Cada Arquivo](#4-análise-de-cada-arquivo)
   - [Subpasta helpers/ — Módulos Compartilhados](#subpasta-helpers--módulos-compartilhados)
   - [Subpasta performance/ — Carga, Stress e Performance](#subpasta-performance--carga-stress-e-performance)
   - [Subpasta functional/ — Validação Funcional](#subpasta-functional--validação-funcional)
   - [Subpasta security/ — Segurança](#subpasta-security--segurança)
5. [Arquivos Relacionados Fora da Pasta `load-tests/`](#arquivos-relacionados-fora-da-pasta-load-tests)
6. [Padrões e Convenções Comuns](#padrões-e-convenções-comuns)

---

## 1. Nome do Documento

**`PROJECT_load-tests.md`** — Análise dos Arquivos de Teste de Carga da pasta `load-tests` do projeto **Caminhar**.

## 2. Descrição Geral

Documentação detalhada de todos os arquivos da pasta `load-tests/`, descrevendo o que cada um faz, seu propósito, estrutura, arquivos acionados/relacionados e endpoints utilizados. Os scripts estão organizados em 4 subpastas: `helpers/`, `performance/`, `functional/` e `security/`.

A pasta `load-tests/` contém **37 arquivos** (30 scripts de teste k6 + 7 módulos helpers) que compõem a suíte de testes de carga, stress, performance e segurança do projeto **Caminhar**. Todos os scripts utilizam a ferramenta [k6](https://k6.io/) da Grafana Labs.

| Subpasta | Qtd | Descrição |
|----------|-----|-----------|
| **helpers/** | 7 | Módulos compartilhados (auth, config, network, profiles, report, resource-test-runner, sleep) |
| **performance/** | 17 | Testes de carga, stress, performance e fluxos combinados |
| **functional/** | 9 | Testes funcionais e de validação |
| **security/** | 4 | Testes de segurança (rate limit, spoofing, DDoS, login negativo) |

**Arquivos fora da pasta** que integram o ecossistema de load tests:
- `load-tests.yml` — Workflow CI/CD do GitHub Actions (em `.github/workflows/`)
- `scripts/run-all-load-tests-sequentially.js` — Orquestrador que executa todos os 30 scripts
- `scripts/lib/k6-output-parser.js` — Módulo novo (08/10/2026) de parsing da saída do k6 para o relatório de falhas do orquestrador (checks reprovados, thresholds violados, erros de console)
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

## 3. Estrutura de Arquivos e Pastas

```text
/load-tests
├── helpers/
│   ├── auth.js
│   ├── config.js
│   ├── network.js
│   ├── profiles.js
│   ├── report.js
│   ├── resource-test-runner.js
│   └── sleep.js
├── performance/
│   ├── authenticated-flow-test.js
│   ├── cache-performance-test.js
│   ├── cache-warmup-test.js
│   ├── create-post-flow.js
│   ├── musicas-crud-test.js
│   ├── musicas-filter-test.js
│   ├── musicas-load-test.js
│   ├── musicas-pagination-test.js
│   ├── musicas-search-test.js
│   ├── musicas-sort-test.js
│   ├── pagination-test.js
│   ├── stress-test-combined.js
│   ├── videos-crud-test.js
│   ├── videos-filter-test.js
│   ├── videos-load-test.js
│   ├── videos-pagination-test.js
│   └── videos-sort-test.js
├── functional/
│   ├── backup-verification-test.js
│   ├── cache-headers-test.js
│   ├── health-check.js
│   ├── posts-cursor-pagination-test.js
│   ├── posts-tags-test.js
│   ├── recovery-test.js
│   ├── search-content-test.js
│   ├── upload-flow-test.js
│   └── video-validation-test.js
└── security/
    ├── ddos-search-test.js
    ├── ip-spoofing-test.js
    ├── login-negative-test.js
    └── rate-limit-test.js
```

Os arquivos relacionados fora da pasta (detalhados na seção [Arquivos Relacionados Fora da Pasta `load-tests/`](#arquivos-relacionados-fora-da-pasta-load-tests)) são: `load-tests.yml` (em `.github/workflows/`) e os scripts `scripts/run-all-load-tests-sequentially.js`, `scripts/lib/k6-output-parser.js`, `scripts/run-load-tests.sh`, `scripts/clean-load-test-posts.js`, `scripts/clear-test-auth-locks.js`, `scripts/generate-load-report.js`, `scripts/clean-k6-reports.js`, `scripts/clean-test-db.js`, `scripts/utils/cleanup.js`, `scripts/utils/constants.js`, `scripts/utils/load-env.js` e `scripts/check-sql-injection.js`.

## 4. Análise de Cada Arquivo

As seções a seguir apresentam a análise individual de cada arquivo, na ordem das subpastas `helpers/`, `performance/`, `functional/` e `security/`. Para cada arquivo são informados: **nome**, **caminho completo**, **arquivos acionados/relacionados** e **resumo** com sua finalidade e funcionamento.

---

## Subpasta helpers/ — Módulos Compartilhados

Contém 7 módulos que centralizam lógica comum, eliminando duplicação entre os scripts de teste.

### `config.js`

**Nome do arquivo:** `config.js`

**Caminho:** `/load-tests/helpers/config.js`

**Arquivos acionados/relacionados:**
- Nenhum arquivo local — utiliza apenas a variável global `__ENV` do k6.
- Consumido por: `helpers/auth.js`, `helpers/resource-test-runner.js` e pela maioria dos scripts de teste das pastas `performance/`, `functional/` e `security/` (ver campo "Arquivos acionados/relacionados" de cada seção).

**Resumo:**
Centraliza a leitura de variáveis de ambiente com fallback para os testes k6, eliminando a duplicação de declarações `BASE_URL`, `USERNAME` e `PASSWORD` que existiam em cada script individualmente.

Define o objeto interno `DEFAULT_CONFIG` com os valores padrão (`BASE_URL: 'http://localhost:3000'`, `ADMIN_USERNAME: 'admin'`, `ADMIN_PASSWORD: '123456'`) e exporta:

- `getConfig()` — Retorna objeto `{ BASE_URL, USERNAME, PASSWORD }`
- `BASE_URL` — Lê de `__ENV.BASE_URL` com fallback para `'http://localhost:3000'`
- `USERNAME` — Lê de `__ENV.ADMIN_USERNAME` com fallback para `'admin'`
- `PASSWORD` — Lê de `__ENV.ADMIN_PASSWORD` com fallback para `'123456'`

> **Nota:** O fallback de senha permanece como `'123456'` intencionalmente para facilitar desenvolvimento local. Em CI, as credenciais são fornecidas via secrets.

> **Observação não confirmada:** o comentário de cabeçalho do arquivo menciona "Utiliza env-config.json se disponível, caso contrário usa `__ENV`", porém o código lê exclusivamente `__ENV` e o arquivo `env-config.json` não existe na raiz do projeto (verificado em 23/09/2026). O comentário aparenta ser resquício de uma implementação anterior; nenhuma leitura de `env-config.json` pôde ser confirmada pela análise do código.

---

### `auth.js`

**Nome do arquivo:** `auth.js`

**Caminho:** `/load-tests/helpers/auth.js`

**Arquivos acionados/relacionados:**
- `helpers/config.js` — importa `BASE_URL`, `USERNAME` e `PASSWORD`
- Módulo k6: `k6/http`
- Endpoint da API: `POST /api/auth/login?response=body`
- Consumido por (scripts que reexportam seu `setup()` como setup do teste): `performance/cache-warmup-test.js`, `performance/videos-crud-test.js`, `performance/create-post-flow.js`, `performance/stress-test-combined.js`, `performance/authenticated-flow-test.js`, `performance/musicas-crud-test.js`, `functional/upload-flow-test.js`, `functional/backup-verification-test.js`, `functional/video-validation-test.js`

**Resumo:**
Centraliza a lógica de autenticação (login + extração de token JWT) para todos os scripts administrativos, eliminando a duplicação da função `setup()` com POST `/api/auth/login` que existia em ~18 arquivos.

Exporta `setup(options)` — Realiza login com credenciais e retorna `{ token }`. Aceita `baseUrl`, `username` e `password` como opções, com fallback para os valores de `helpers/config.js`. A requisição é enviada para `POST /api/auth/login?response=body` com header `Content-Type: application/json`.

Validações realizadas:
- Verifica se `loginRes.status === 200` antes de processar
- Verifica se `body`, `body.data` e `body.data.token` existem
- Lança `Error` com mensagem descritiva em caso de falha

---

### `network.js`

**Nome do arquivo:** `network.js`

**Caminho:** `/load-tests/helpers/network.js`

**Arquivos acionados/relacionados:**
- Nenhum arquivo local.
- Consumido por: `helpers/resource-test-runner.js` (gera IP para a opção `useSpoofIP`) e `security/ip-spoofing-test.js`

**Resumo:**
Módulo compartilhado com funções utilitárias de rede. Centraliza a função `getRandomIP()` que estava duplicada em 5 arquivos.

Exporta `getRandomIP()` — Gera um endereço IPv4 aleatório no formato `x.x.x.x`, com cada octeto calculado como `Math.floor(Math.random() * 255)` (valores de 0 a 254).

> **Nota:** IP spoofing é usado nos testes para evitar rate limit. Consulte a seção 2.2 do `docs/UPGRADE_load-tests.md` para a discussão sobre a segurança dessa prática.

---

### `profiles.js`

**Nome do arquivo:** `profiles.js`

**Caminho:** `/load-tests/helpers/profiles.js`

**Arquivos acionados/relacionados:**
- Nenhum arquivo local — módulo puro de definição de perfis.
- Consumido por: `helpers/resource-test-runner.js` e por scripts que definem `options` via perfil (`performance/pagination-test.js`, `performance/stress-test-combined.js`, `functional/health-check.js`, `functional/posts-cursor-pagination-test.js`, `functional/posts-tags-test.js`, `functional/search-content-test.js`, `functional/cache-headers-test.js`, `functional/recovery-test.js`, `security/rate-limit-test.js`, `security/ip-spoofing-test.js`, `security/ddos-search-test.js`)

**O que faz:** Define perfis de carga padronizados com thresholds consistentes.

**Propósito:** Garantir thresholds consistentes e configurações de carga reutilizáveis, eliminando declarações inline espalhadas.

**Perfis disponíveis:**

| Perfil | Configuração de carga | Thresholds | Uso Típico |
|--------|----------------------|------------|------------|
| `light` | 1 VU, 5 iterações (`vus` + `iterations`) | checks = 100%, p(95) < 500ms | Testes funcionais e CRUD |
| `medium` | 5 VUs, estágios 5s/10s/5s (20s) | p(95) < 1000ms, failed < 5% | Carga moderada |
| `heavy` | 50 VUs, estágios 10s/30s/10s (50s) | p(95) < 3000ms, failed < 10% | Estresse |
| `health` | 20 VUs, estágios 5s/10s/5s (20s) | p(95) < 500ms, failed < 2% | Health check |
| `recovery` | Cenário `chaos_monitor`: executor `constant-vus`, 1 VU constante por 2min | Nenhum (thresholds vazios) | Monitoramento de recuperação |
| `stress` | 2 cenários paralelos: `stress_test` (executor `ramping-vus`, 0→20→50→100→0 VUs, estágios 30s/1m/30s/1m/30s/1m/20s, `gracefulRampDown: 30s`, `exec: 'stress_test'` — **correção de 13/10/2026**) e `memory_monitor` (executor `constant-vus`, 1 VU constante por 5min, `exec: 'memory_monitor'` — **correção de 13/10/2026**) | p(95) < 3000ms, failed < 10% e checks > 95% (todos com tag `{scenario:stress_test}`) e `nodejs_memory_heap_used_bytes` max < 1GB (1073741824 bytes) | Stress test combinado — bug comprovado em 13/10/2026 (runs #9 e #10), **corrigido em 13/10/2026, ainda não exercitado em CI** — ver advertência abaixo |
| `rateLimit` | Cenário `brute_force`: executor `ramping-vus`, 0→20→50→0 VUs, estágios 10s/30s/10s (50s), `gracefulRampDown: 10s` | Nenhum (thresholds vazios) | Brute force / rate limit |

> **⚠️ ADVERTÊNCIA (13/10/2026) — perfil `stress`: bug comprovado, CORRIGIDO EM 13/10/2026, AINDA NÃO EXERCITADO EM CI.**
>
> **Registro histórico do bug (runs #9 e #10, código sem `exec:`).** Até a correção de 13/10/2026, os três perfis que usam `scenarios:` — `recovery` (linha 56), `stress` (linha 68) e `rateLimit` (linha 99) — **nenhum declarava** a chave `exec:`. Sem `exec`, o k6 executa em **todo** cenário a função `default` exportada pelo script. Em `performance/stress-test-combined.js` a lógica **não** está na `default()` (que é um no-op explícito), então os cenários `stress_test` e `memory_monitor` executavam a função vazia: no run [`38246676774`](https://github.com/caminhar-deus/Caminhar/actions/runs/38246676774) (12/10/2026, nº 9) o script rodou 4m50s, consumiu **319.813.516 iterações sem fazer absolutamente nada** e ainda assim reportou `✅ stress-test-combined: PASS` — e o run [`38393117376`](https://github.com/caminhar-deus/Caminhar/actions/runs/38393117376) (13/10/2026, nº 10, sha `7590120`, ainda no código antigo) **reproduziu o bug de forma idêntica** (196.425.737 iterações, mesmas métricas zeradas/ausentes), provando que é determinístico — dois SHAs, dois dias. Os quatro thresholds do perfil passavam **por falta de amostras, não por desempenho** — no k6, threshold sobre métrica sem dados não reprova (mesmo mecanismo do gotcha `gotchas/k6-check-nao-altera-exit-code.md`). Evidência completa (métricas do artifact) na seção [`stress-test-combined.js`](#stress-test-combinedjs).
>
> **Contraste que isola a causa:** o perfil `rateLimit` também usa `scenarios:` sem `exec:`, mas `security/rate-limit-test.js` tem a lógica na `export default function()` (linha 17) — por isso aquele teste **funciona**. Perfis sem `exec:` são inofensivos enquanto a lógica estiver na `default()` e silenciosamente destrutivos quando não estiver. A diferença não é o perfil, é **onde** a lógica está no arquivo.
>
> **Status: corrigido em 13/10/2026, ainda não exercitado em CI.** O perfil `stress` agora declara `exec: 'stress_test'` no cenário `stress_test` e `exec: 'memory_monitor'` no cenário `memory_monitor` (correção aplicada em `load-tests/helpers/profiles.js`, **working tree — só entra em vigor após commit e push**; o próximo cron é o primeiro run que a exercita). **A correção foi deliberadamente NÃO replicada** a `recovery` (`chaos_monitor`) e `rateLimit` (`brute_force`): a lógica deles está na `export default function()` de `functional/recovery-test.js` (linha 20) e `security/rate-limit-test.js` (linha 17), então o cenário já executa a função certa; declarar `exec:` ali passaria a procurar funções que não existem e o k6 abortaria o teste. Pendência fechada em `docs/PENDENCIAS_scripts_testes.md`, item Z, com o critério de verificação do próximo run.

**Exports:**
- `PROFILES` — Objeto com todos os perfis
- `getProfile(profileName, overrides)` — Retorna perfil mesclado com sobrescritas. Se `overrides.thresholds` for fornecido explicitamente, substitui completamente os thresholds do perfil base; caso contrário, faz merge dos thresholds do perfil base com os informados. Lança `Error` com mensagem descritiva se o perfil solicitado não existir.

---

### `report.js`

**Nome do arquivo:** `report.js`

**Caminho:** `/load-tests/helpers/report.js`

**Arquivos acionados/relacionados:**
- Biblioteca externa: `https://jslib.k6.io/k6-summary/0.0.4/index.js` (import de `textSummary`)
- Consumido por: `helpers/resource-test-runner.js` (que o re-exporta) e pela maioria dos scripts de teste, que o chamam dentro de suas funções `handleSummary()`

**Resumo:**
Centraliza a geração padronizada de relatórios de teste k6, eliminando a duplicação da lógica de `handleSummary()` que existia em ~18 arquivos. O módulo não exporta `handleSummary` — cada teste exporta a sua própria `handleSummary()` e chama `generateReport()` dentro dela para montar o objeto de saída.

Exporta `generateReport(data, testName)` — Sanitiza os dados e retorna o objeto de saída com:
- `stdout` — resumo textual gerado via `textSummary()`
- `./reports/k6-summaries/<testName>.json` — arquivo JSON com os dados completos do teste

**Segurança:**
- A função interna `sanitizeToken()` (não exportada por este módulo; re-exportada via `helpers/resource-test-runner.js`) substitui o token JWT de `setup_data.token` por `*** TOKEN OCULTO ***` antes de exportar os dados, garantindo que todos os arquivos que usam `generateReport()` sanitizem automaticamente.

> **Nota:** Utiliza versão fixa `https://jslib.k6.io/k6-summary/0.0.4/index.js` — versão fixa é mais segura que `latest` para evitar breaking changes.

---

### `sleep.js`

**Nome do arquivo:** `sleep.js`

**Caminho:** `/load-tests/helpers/sleep.js`

**Arquivos acionados/relacionados:**
- Módulo k6: `k6` (import de `sleep`)
- Consumido por: `helpers/resource-test-runner.js` e pela maioria dos scripts de teste (ver seções individuais)

**Resumo:**
Fornece função de sleep randomizado para simular comportamento real de usuário, substituindo `sleep()` com valores fixos por intervalos aleatórios que representam melhor o tempo de pensamento e ação variáveis dos usuários.

Exporta `randomSleep(min = 0.5, max = 3)` — Executa `sleep()` com duração aleatória entre `min` e `max` segundos (padrão: 0.5s a 3s).

---

### `resource-test-runner.js`

**Nome do arquivo:** `resource-test-runner.js`

**Caminho:** `/load-tests/helpers/resource-test-runner.js`

**Arquivos acionados/relacionados:**
- `helpers/sleep.js` (import de `randomSleep`)
- `helpers/network.js` (import de `getRandomIP`, usado pela opção `useSpoofIP`)
- `helpers/config.js` (import de `BASE_URL`, `USERNAME`, `PASSWORD`)
- `helpers/profiles.js` (import de `getProfile`)
- `helpers/report.js` (import de `generateReport`, re-exportado junto com `sanitizeToken`)
- Módulos k6: `k6/http`, `k6` (`check`), `k6/metrics` (`Counter`), `k6/execution` (`exec`, usado nos aborts do setup)
- Consumido por: todos os 10 scripts de teste de músicas e vídeos que usam as funções-fábrica (CRUD, filtro, paginação, ordenação e carga de músicas e vídeos)

**O que faz:** Módulo genérico que elimina a duplicação de código entre pares de testes de músicas e vídeos (CRUD, filtro, paginação, ordenação, carga).

**Propósito:** Eliminar ~80% de código duplicado entre os 10 arquivos de teste de músicas e vídeos, centralizando a lógica comum e mantendo apenas a configuração específica de cada recurso.

**Exports:**

Todas as funções-fábrica retornam um objeto `{ options, default, reportName }` — e `setup` adicionalmente no caso de `createLoadTest` —, onde `reportName` é o nome padronizado de relatório no formato `<recurso>_<tipo>_test`:

| Função | Configurações Principais | Descrição |
|--------|-------------------------|-----------|
| `createCrudTest(config)` | `adminEndpoint`, `payloadTemplate`, `resourceName`, `uniqueIdGenerator`, `profileName` | Gera options + default() para teste CRUD (create/update/delete) com métricas de erro e sleep entre operações |
| `createFilterTest(config)` | `publicEndpoint`, `searchField`, `searchValues[]`, `responsePath`, `resourceName` | Gera options + default() para teste de filtro por termo de busca |
| `createPaginationTest(config)` | `publicEndpoint`, `itemsPath`, `responsePath`, `resourceName`, `limit` | Gera options + default() para teste de paginação com validação cruzada de IDs entre páginas |
| `createSortTest(config)` | `publicEndpoint`, `sortMode`/`sortField`+`sortOrder`, `itemsPath`, `dateField` | Gera options + default() para teste de ordenação (explícita ou comportamento padrão) com verificação de datas |
| `createLoadTest(config)` | `endpoint`, `requireAuth`, `useSpoofIP`, `healthCheck`, `checkResponse`, `extraRequests[]`, `customSetup` | Gera options + setup() + default() para teste de carga com suporte a health check, IP spoofing e requisições extras |
| `sanitizeToken(data)` | — | Oculta token JWT em relatórios (re-export de `report.js`) |
| `generateReport(data, testName)` | — | Re-export de `helpers/report.js` |

**Funcionalidades internas:**
- `createCrudOptions` — Mescla o perfil base com `optionsOverrides`; se os overrides definirem `stages`, remove `iterations` e `vus` do perfil base (o k6 não permite ambos simultaneamente). Acrescenta thresholds `<prefixo>_create_errors`, `_update_errors` e `_delete_errors` com `count==0` (prefixo definido por `metricsPrefix` ou `resourceName`).
- `createCrudDefault` — Implementa lazy login com cache de token (fallback quando o token do `setup()` não está disponível), extração de ID com suporte a múltiplos formatos de resposta (`{id}`, `{data:{id}}`, `{data:{resource:{id}}}`), e geração de payload a partir de `payloadTemplate` (função que recebe o ID único, ou objeto copiado). O UPDATE acrescenta o sufixo `" - Updated"` ao campo `titulo`; o DELETE envia `{ [idField]: resourceId }`.
- `createFilterDefault` — Suporta caminhos aninhados de resposta (`data.musicas`). O check "Filtro funcionou (termo encontrado)" é uma validação suave: se o termo não for encontrado nos campos `titulo`/`title`/`artista`/`artist` dos itens, registra warning no console, mas o check ainda passa.
- `createPaginationDefault` — Validação cruzada de IDs entre páginas 1 e 2; se a página 1 estiver vazia, encerra a iteração com warning; se a página 2 estiver vazia, apenas registra warning (soft pass).
- `createSortDefault` — Suporta dois formatos de URL: `sort=<mode>` (API músicas) e `sort=<field>&order=<order>` (API vídeos). Verifica datas em ordem crescente/decrescente com fallback para o campo `createdAt`; soft pass se houver menos de 2 itens.
- `createLoadSetup` — Health check opcional (GET na raiz de `BASE_URL`; aborta via `exec.test.abort` se a conexão for recusada, status 0) + login com validação de status 200 e de Content-Type JSON (aborta em caso de falha). Retorna o token JWT como string direta (`loginRes.json('data.token')`), não como objeto.
- `createLoadDefault` — Requisição principal com tags nomeadas (padrão `List<Recurso>`) + requisições extras (ex: página 2) com seus próprios tags e checks; sleep randomizado de 0.5s a 2s ao final.

---

## Subpasta performance/ — Carga, Stress e Performance

Contém 17 scripts de teste de carga, stress e performance.

### Testes de Músicas (6 arquivos)

#### `musicas-crud-test.js`

**Nome do arquivo:** `musicas-crud-test.js`

**Caminho:** `/load-tests/performance/musicas-crud-test.js`

**Arquivos acionados/relacionados:**
- `helpers/resource-test-runner.js` — `createCrudTest()` (gera `options` + `default`) e `generateReport()`
- `helpers/auth.js` — reexporta `setup()` (login)
- `helpers/config.js` — `BASE_URL` (usado no teardown)
- Módulo k6: `k6/http` (requisições do teardown)

**Resumo:**
Testa as operações CRUD (Create, Update, Delete) para o recurso de músicas via runner genérico. Valida o ciclo de vida completo de uma música na API administrativa.

- `setup()` — Login via `helpers/auth.js`
- `default()` — Via `createCrudTest()`: POST (criar) → PUT (atualizar) → DELETE. O payload é gerado por `payloadTemplate` com título `Música Load Test K6 ${uniqueId}` (artista `Artista K6`, URL Spotify de teste, `publicado: true`) e ID único gerado por `${__VU}-${__ITER}-${Date.now()}`
- `teardown()` — Lista músicas admin e remove músicas com `K6` no título (fantasmas deixadas por VUs interrompidos); suporta respostas nos formatos `body.musicas` e `body.data`
- `handleSummary()` — Gera relatório via `generateReport()` com nome `musicas_crud_test`

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `POST /api/admin/musicas` — Criar música
- `PUT /api/admin/musicas` — Atualizar música
- `DELETE /api/admin/musicas` — Deletar música
- `GET /api/admin/musicas?limit=100` — Listar músicas (teardown)

**Configuração de carga:** Perfil `light` customizado (5 VUs, estágios 10s/20s/10s)

---

#### `musicas-filter-test.js`

**Nome do arquivo:** `musicas-filter-test.js`

**Caminho:** `/load-tests/performance/musicas-filter-test.js`

**Arquivos acionados/relacionados:**
- `helpers/resource-test-runner.js` — `createFilterTest()` (gera `options` + `default`) e `generateReport()`

**Resumo:**
Testa o filtro de músicas por termo de busca (artista) via runner genérico. Valida que o endpoint público de músicas filtra corretamente os resultados com base no parâmetro `search`.

- Rota pública (sem autenticação) — GET `/api/musicas?search={artista}` com termo escolhido aleatoriamente
- Array de artistas: `['Aline Barros', 'Fernandinho', 'Gabriela Rocha', 'Diante do Trono', 'Preto no Branco']`
- Valida que os itens retornados contêm o termo buscado (validação suave — ver `createFilterDefault` no runner)
- `handleSummary()` — Gera relatório via `generateReport()` com nome `musicas_filter_test`
- Configuração: perfil `light` com override de thresholds — `checks: rate>0.85` (substitui completamente os thresholds do perfil base, que exigiam `checks rate==1.0` e `p(95)<500ms`)

**Endpoints chamados:**
- `GET /api/musicas?search={termo}` — Listar com filtro

---

#### `musicas-load-test.js`

**Nome do arquivo:** `musicas-load-test.js`

**Caminho:** `/load-tests/performance/musicas-load-test.js`

**Arquivos acionados/relacionados:**
- `helpers/resource-test-runner.js` — `createLoadTest()` (gera `options` + `setup` + `default`) e `generateReport()`

**Resumo:**
Teste de carga que simula múltiplos usuários acessando a listagem admin de músicas simultaneamente, via runner genérico. Valida o comportamento da API `/api/admin/musicas` sob carga progressiva, garantindo thresholds de performance.

- Configuração: perfil `medium` com override de thresholds — `http_req_duration{name:ListMusicas}` p(95)<500ms (substitui completamente os thresholds do perfil `medium`)
- `setup()` — Wrapper local que chama o setup gerado pelo runner: login com validação de Content-Type (health check desativado — `healthCheck: false`)
- `checkResponse` — Valida Content-Type JSON, lista de músicas como array (`r.json('musicas')`) e tempo de resposta < 300ms
- `requireAuth: true`, `useSpoofIP: false`
- `handleSummary()` — Gera relatório via `generateReport()` com nome `musicas_load_test`

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `GET /api/admin/musicas` — Listar músicas (rota admin)

---

#### `musicas-pagination-test.js`

**Nome do arquivo:** `musicas-pagination-test.js`

**Caminho:** `/load-tests/performance/musicas-pagination-test.js`

**Arquivos acionados/relacionados:**
- `helpers/resource-test-runner.js` — `createPaginationTest()` (gera `options` + `default`) e `generateReport()`

**Resumo:**
Testa a paginação do endpoint público de músicas via runner genérico. Valida que a paginação funciona corretamente, retornando IDs distintos entre páginas.

- Rota pública (sem autenticação), `limit: 5`, resposta em `data`
- 1 VU, 1 iteração: Página 1 → sleep → Página 2
- Validação cruzada: IDs da página 1 vs página 2 (não devem se repetir)
- Soft pass se página 2 estiver vazia (poucos dados no banco)
- `handleSummary()` — Gera relatório via `generateReport()` com nome `musicas_pagination_test`

**Endpoints chamados:**
- `GET /api/musicas?page=1&limit=5` — Listar página 1
- `GET /api/musicas?page=2&limit=5` — Listar página 2

---

#### `musicas-search-test.js`

**Nome do arquivo:** `musicas-search-test.js`

**Caminho:** `/load-tests/performance/musicas-search-test.js`

**Arquivos acionados/relacionados:**
- `helpers/sleep.js` — `randomSleep(0.5, 3)`
- `helpers/report.js` — `generateReport()`
- `helpers/config.js` — `BASE_URL`
- Módulos k6: `k6/http`, `k6` (`check`)

**Resumo:**
Testa a busca textual no endpoint de músicas com diferentes termos. Garante que a busca por título retorne resultados relevantes.

- Rota pública (sem autenticação) — GET `/api/musicas?search={termo}` com termo escolhido aleatoriamente
- Termos de busca: `['Graça', 'Santo', 'Amor', 'Vida', 'Caminho', 'Luz']`
- Warm-up na primeira iteração (2 requisições com tag `WarmUp`: `Graça` e `Santo`) para aquecer o cache do servidor Next.js e evitar que o cold start distorça as métricas
- Valida status 200, estrutura de resposta e match do termo no título (soft pass se o termo não for encontrado visualmente — apenas registra warning)
- Configuração: `options` inline (não usa `helpers/profiles.js`) — 1 VU, 5 iterações, thresholds `checks rate==1.0` e `http_req_duration{name:SearchMusicas}` p(95)<800ms, avg<500ms
- `handleSummary()` — Gera relatório via `generateReport()` com nome `musicas_search_test`

**Endpoints chamados:**
- `GET /api/musicas?search={termo}` — Buscar músicas

---

#### `musicas-sort-test.js`

**Nome do arquivo:** `musicas-sort-test.js`

**Caminho:** `/load-tests/performance/musicas-sort-test.js`

**Arquivos acionados/relacionados:**
- `helpers/resource-test-runner.js` — `createSortTest()` (gera `options` + `default`) e `generateReport()`

**Resumo:**
Testa a ordenação dos resultados de músicas via runner genérico. Valida que o endpoint público de músicas ordena corretamente os resultados.

- Rota pública (sem autenticação) — `sort=recent` (novo formato da API músicas), `dateField: created_at`, resposta em `data`
- Valida que as datas (`created_at`, com fallback para `createdAt`) estão em ordem decrescente
- Soft pass se poucos dados no banco (menos de 2 itens — inconclusivo)
- Configuração: perfil `light` com 1 iteração (imposto pelo runner)
- `handleSummary()` — Gera relatório via `generateReport()` com nome `musicas_sort_test`

**Endpoints chamados:**
- `GET /api/musicas?sort=recent` — Listar ordenado

---

### Testes de Vídeos (5 arquivos)

#### `videos-crud-test.js`

**Nome do arquivo:** `videos-crud-test.js`

**Caminho:** `/load-tests/performance/videos-crud-test.js`

**Arquivos acionados/relacionados:**
- `helpers/resource-test-runner.js` — `createCrudTest()` (gera `options` + `default`) e `generateReport()`
- `helpers/auth.js` — reexporta `setup()` (login)
- `helpers/config.js` — `BASE_URL` (usado no teardown)
- Módulo k6: `k6/http` (requisições do teardown)

**Resumo:**
Testa as operações CRUD para o recurso de vídeos via runner genérico. Valida o ciclo de vida completo de um vídeo: criar, atualizar e deletar.

- `setup()` — Login via `helpers/auth.js`
- `default()` — Via `createCrudTest()`: POST (criar) → PUT (atualizar) → DELETE. O payload é gerado por `payloadTemplate` com URL do YouTube aleatória de 11 caracteres (`https://www.youtube.com/watch?v=...`), título `Video de Teste K6 ${uniqueId}` e `publicado: false`; ID único gerado por `${__VU}-${__ITER}-${Date.now()}`
- `teardown()` — Lista vídeos admin e remove vídeos com `K6` no título (fantasmas deixadas por VUs interrompidos); suporta respostas nos formatos `body.data` (schema real da API admin) e `body.videos`
- `handleSummary()` — Gera relatório via `generateReport()` com nome `videos_crud_test`

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `POST /api/admin/videos` — Criar vídeo
- `PUT /api/admin/videos` — Atualizar vídeo
- `DELETE /api/admin/videos` — Deletar vídeo
- `GET /api/admin/videos?limit=100` — Listar vídeos (teardown)

**Configuração de carga:** Perfil `light` customizado (3 VUs, estágios 10s/20s/5s)

---

#### `videos-filter-test.js`

**Nome do arquivo:** `videos-filter-test.js`

**Caminho:** `/load-tests/performance/videos-filter-test.js`

**Arquivos acionados/relacionados:**
- `helpers/resource-test-runner.js` — `createFilterTest()` (gera `options` + `default`) e `generateReport()`

**Resumo:**
Testa o filtro de vídeos por termo de busca via runner genérico. Valida que o endpoint público de vídeos filtra corretamente os resultados com base no parâmetro `search`.

- Rota pública (sem autenticação) — GET `/api/videos?search={termo}` com termo escolhido aleatoriamente
- Array de termos: `['louvor', 'adoração', 'testemunho', 'pregação', 'estudo']`
- Valida que os itens retornados contêm o termo buscado (validação suave — ver `createFilterDefault` no runner)
- `handleSummary()` — Gera relatório via `generateReport()` com nome `videos_filter_test`
- Configuração: perfil `light` com override de thresholds — `checks: rate>0.85` (substitui completamente os thresholds do perfil base)

**Endpoints chamados:**
- `GET /api/videos?search={termo}` — Listar com filtro

---

#### `videos-load-test.js`

**Nome do arquivo:** `videos-load-test.js`

**Caminho:** `/load-tests/performance/videos-load-test.js`

**Arquivos acionados/relacionados:**
- `helpers/resource-test-runner.js` — `createLoadTest()` (gera `options` + `setup` + `default`) e `generateReport()`

**Resumo:**
Teste de carga que simula múltiplos usuários acessando a listagem pública de vídeos, com 2 requisições por iteração (páginas 1 e 2), via runner genérico. Valida a performance da API de vídeos sob carga progressiva.

- Configuração: perfil `medium` com override de thresholds — `http_req_duration{name:ListVideos_Page1}` e `{name:ListVideos_Page2}` p(95)<500ms e `checks` rate>0.95 (substituem completamente os thresholds do perfil `medium`)
- `setup()` — Wrapper local que chama o setup gerado pelo runner: login com validação de Content-Type (health check desativado)
- `default()` — GET `/api/videos` (página 1, tag `ListVideos_Page1`) + requisição extra GET `/api/videos?page=2&limit=5` (tag `ListVideos_Page2`)
- `checkResponse` — Valida objeto com vídeos (aceita `body.data`, `body.videos` ou array direto), metadados de paginação (`body.pagination`) e tempo da página 1 < 1000ms
- Requisição extra valida: status 200, `pagination.page === 2` e `pagination.limit === 5`
- `requireAuth: true`, `useSpoofIP: false`
- `handleSummary()` — Gera relatório via `generateReport()` com nome `videos_load_test`

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `GET /api/videos` — Listar vídeos (página 1)
- `GET /api/videos?page=2&limit=5` — Listar vídeos (página 2)

> **Nota técnica:** O arquivo define `requireAuth: true` na configuração e exporta `setup()`, portanto o login é executado e o header `Authorization` é enviado. Embora `/api/videos` seja um endpoint público, a autenticação é aplicada de forma consistente com os demais testes de carga.

---

#### `videos-pagination-test.js`

**Nome do arquivo:** `videos-pagination-test.js`

**Caminho:** `/load-tests/performance/videos-pagination-test.js`

**Arquivos acionados/relacionados:**
- `helpers/resource-test-runner.js` — `createPaginationTest()` (gera `options` + `default`) e `generateReport()`

**Resumo:**
Testa a paginação do endpoint público de vídeos via runner genérico. Valida que a paginação funciona corretamente, retornando IDs distintos entre páginas.

- Rota pública (sem autenticação), `limit: 5`, itens em `data` (`itemsPath: 'data'`)
- 1 VU, 1 iteração: Página 1 → sleep → Página 2
- Validação cruzada: IDs da página 1 vs página 2 (não devem se repetir)
- Soft pass se página 2 estiver vazia
- `handleSummary()` — Gera relatório via `generateReport()` com nome `videos_pagination_test`
- Configuração: perfil `light` com override de thresholds — `checks: rate>0.85`

**Endpoints chamados:**
- `GET /api/videos?page=1&limit=5` — Listar página 1
- `GET /api/videos?page=2&limit=5` — Listar página 2

---

#### `videos-sort-test.js`

**Nome do arquivo:** `videos-sort-test.js`

**Caminho:** `/load-tests/performance/videos-sort-test.js`

**Arquivos acionados/relacionados:**
- `helpers/resource-test-runner.js` — `createSortTest()` (gera `options` + `default`) e `generateReport()`

**Resumo:**
Testa a ordenação dos resultados de vídeos via runner genérico. Valida que o endpoint público de vídeos ordena corretamente os resultados por data de criação decrescente.

- Rota pública (sem autenticação) — `sort=created_at&order=desc` (formato `sort` + `order` da API vídeos), `dateField: created_at` (padrão), itens em `data` (`itemsPath: 'data'`)
- Valida que as datas estão em ordem decrescente (soft pass com menos de 2 itens)
- `handleSummary()` — Gera relatório via `generateReport()` com nome `videos_sort_test`
- Configuração: perfil `light` com override de thresholds — `checks: rate>0.85`

> **Observação não confirmada:** o `resourceConfig` define `useExplicitSort: true`, porém essa chave **não é consumida** por `createSortTest()`/`createSortDefault()` no `helpers/resource-test-runner.js` (a função lê apenas `publicEndpoint`, `sortMode`, `sortField`, `sortOrder`, `dateField`, `itemsPath`, `responsePath`, `resourceName` e `sleepDuration`). A chave aparenta ser resquício de versão anterior do runner e não tem efeito no comportamento do teste.

**Endpoints chamados:**
- `GET /api/videos?sort=created_at&order=desc` — Listar ordenado

---

### Testes de Posts e Fluxos (4 arquivos)

#### `pagination-test.js`

**Nome do arquivo:** `pagination-test.js`

**Caminho:** `/load-tests/performance/pagination-test.js`

**Arquivos acionados/relacionados:**
- `helpers/sleep.js` — `randomSleep(0.5, 3)`
- `helpers/config.js` — `BASE_URL`
- `helpers/profiles.js` — `getProfile('light', ...)`
- `helpers/report.js` — `generateReport()`
- Módulos k6: `k6/http`, `k6` (`check`)

**Resumo:**
Teste funcional de paginação baseada em page/offset para posts públicos. Valida o funcionamento do sistema de paginação offset-based (page + limit), verificando que páginas diferentes retornam IDs distintos.

- Rota pública (sem autenticação) — GET `/api/posts?page=1&limit=5` e `page=2&limit=5`
- Helper interno `extractArray()` suporta múltiplos formatos de resposta: `{data: [...]}`, `{success, data, pagination}`, array direto, `{rows: [...]}`
- Validação cruzada ES5.1-compatible (k6/goja não suporta `.some()`/`.includes()`)
- Soft pass se página 2 estiver vazia
- `handleSummary()` — Gera relatório via `generateReport()` com nome `pagination_test`
- Configuração: perfil `light` com override — `iterations: 1` e thresholds explícitos `checks: rate==1.0` (substituem completamente os thresholds do perfil base)

**Endpoints chamados:**
- `GET /api/posts?page={n}&limit={n}` — Paginação offset-based

---

#### `authenticated-flow-test.js`

**Nome do arquivo:** `authenticated-flow-test.js`

**Caminho:** `/load-tests/performance/authenticated-flow-test.js`

**Arquivos acionados/relacionados:**
- `helpers/auth.js` — reexporta `setup()` (login)
- `helpers/config.js` — `BASE_URL`
- `helpers/report.js` — `generateReport()`
- `helpers/sleep.js` — `randomSleep(0.5, 3)`
- Módulos k6: `k6/http`, `k6` (`check`)

**Resumo:**
Testa o fluxo completo de autenticação: login com credenciais de admin, obtenção de token JWT e acesso a uma rota protegida. Valida que o fluxo de autenticação funciona corretamente sob carga.

- `setup()` — Login via `helpers/auth.js`
- `default()` — Verifica disponibilidade do token (loga erro e encerra a iteração se ausente) e acessa rota protegida `/api/settings?key=site_name` com header `Authorization: Bearer {token}` e tag `{flow: get_settings}`
- Configuração: `options` inline (não usa `helpers/profiles.js`) — 3 VUs, estágios 10s/20s/5s
- Thresholds: `http_req_duration` p(95)<2000ms, `checks{flow:get_settings}` rate>0.95, `http_req_failed` rate<0.10
- `handleSummary()` — Gera relatório via `generateReport()` com nome `authenticated_flow_test`

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `GET /api/settings?key=site_name` — Rota protegida (requer token Bearer)

---

#### `create-post-flow.js`

**Nome do arquivo:** `create-post-flow.js`

**Caminho:** `/load-tests/performance/create-post-flow.js`

**Arquivos acionados/relacionados:**
- `helpers/auth.js` — reexporta `setup()` (login)
- `helpers/config.js` — `BASE_URL`
- `helpers/sleep.js` — `randomSleep(1, 3)`
- Módulos k6: `k6/http`, `k6` (`check`)

**Resumo:**
Testa o fluxo completo de criação de posts no blog: login → criação → limpeza. Valida o processo de criação de posts no blog, garantindo que o endpoint `POST /api/admin/posts` funcione corretamente sob carga e que dados de teste sejam limpos após a execução.

- `setup()` — Login via `helpers/auth.js`
- `default()` — Cria post com título `Post de Carga K6 ${uniqueId}` e slug `post-carga-k6-${uniqueId}-${randomSuffix}` (sufixo aleatório `Math.random().toString(36).substr(2, 9)` para garantir unicidade absoluta e evitar erro de constraint `UNIQUE`), `published: false`
- `teardown()` — Lista posts admin e remove posts com `K6` no título; suporta formatos `body.data.posts`, `body.posts` e `body.data`
- Configuração: `options` inline (não usa `helpers/profiles.js`) — 3 VUs, estágios 10s/15s/5s
- Thresholds: `http_req_duration{flow:create_post}` p(95)<2000ms, `checks{flow:create_post}` rate>0.95, `http_req_failed` rate<0.10 (comentário no código registra que o limite foi reduzido de 80% para 10% porque o threshold anterior mascarava 71,94% de falhas reais)
- **Não possui `handleSummary()`** — não importa `helpers/report.js` e não gera relatório JSON (correção: versões anteriores deste documento afirmavam que gerava)

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `POST /api/admin/posts` — Criação de post
- `GET /api/admin/posts?limit=100` — Listar posts (teardown)
- `DELETE /api/admin/posts?id={id}` — Deletar post (teardown)

---

#### `stress-test-combined.js`

**Nome do arquivo:** `stress-test-combined.js`

**Caminho:** `/load-tests/performance/stress-test-combined.js`

**Arquivos acionados/relacionados:**
- `helpers/auth.js` — `authSetup()` (login no setup)
- `helpers/profiles.js` — `getProfile('stress')`
- `helpers/report.js` — `generateReport()`
- `helpers/config.js` — `BASE_URL`
- `helpers/sleep.js` — `randomSleep(0.3, 1.5)`
- Biblioteca externa: `https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js` (import de `htmlReport`)
- Módulos k6: `k6/http`, `k6` (`check`, `sleep`), `k6/metrics` (`Trend`, `Counter`)

**O que faz:** Teste de estresse combinado com múltiplos cenários executados simultaneamente. É o teste mais robusto e completo da suíte **em intenção de projeto** — em execução real (runs [`38246676774`](https://github.com/caminhar-deus/Caminhar/actions/runs/38246676774) e [`38393117376`](https://github.com/caminhar-deus/Caminhar/actions/runs/38393117376)) nenhum dos dois cenários chegou a executar, por bug corrigido em 13/10/2026, ver a advertência datada abaixo.

**Propósito (intenção do código — ainda NÃO verificada em execução, mesmo após a correção de 13/10/2026 que só vigora após commit):** Simular cenário realista de produção com:
- CRUD de vídeos sob carga crescente (20 → 50 → 100 VUs) — **intenção**: os runs de 12/10 e 13/10/2026 não realizaram nenhuma operação de CRUD
- Monitoramento de memória do Node.js durante todo o teste — **intenção**: os mesmos runs não registraram nenhuma leitura de memória

**Estrutura:**
- **2 cenários paralelos** via `scenarios` do k6. **Correção factual (13/10/2026):** a versão anterior deste documento dizia que "o k6 executa as funções exportadas com os mesmos nomes dos cenários" — isso só acontece quando o cenário declara `exec: '<função>'`. Até 13/10/2026 os cenários do perfil `stress` **não declaravam `exec`** e, sem `exec`, o k6 roda em todo cenário a função `default` exportada pelo script (foi o que causou o bug, corrigido com a adição de `exec:` — ver advertência abaixo):
  1. `stress_test()` — Ramp-up progressivo (20, 50, 100 VUs), executa CRUD completo de vídeos com prefixo `[TEST-K6]` (URL do YouTube com ID de 11 caracteres `st${__VU}x${__ITER}` preenchido com zeros). Se o token do setup não estiver disponível, encerra a iteração silenciosamente (o monitoramento continua). **Não executado nos runs #9 e #10** (bug); a partir do próximo run pós-commit, com `exec: 'stress_test'`, volta a ser a função do cenário
  2. `memory_monitor()` — 1 VU constante por 5 min: GET `/api/status`, extrai `body.data.system` e registra as métricas de memória; `sleep(1)` entre leituras. **Não executado nos runs #9 e #10** (bug); a partir do próximo run pós-commit, com `exec: 'memory_monitor'`, volta a ser a função do cenário
- `default()` — Vazia, e **foi exatamente essa vacuidade que fez o script não exercitar nada**: sem `exec:` nos cenários do perfil `stress`, o k6 executava esta `default()` em ambos. A versão anterior afirmava que ela era vazia "porque os cenários nomeados executam via `stress_test()` e `memory_monitor()`" — suposição factualmente errada, e justamente a que escondeu o bug documentado abaixo
- `setup()` — Chama `authSetup()` de `helpers/auth.js`
- `teardown()` — Limpa dados de teste com paginação completa (loop de páginas com `limit=100` até esvaziar), removendo vídeos cujo título contenha `[TEST-K6]`, `K6` ou `Estresse`
- `handleSummary()` — Gera relatório via `generateReport()` com nome `stress-test-combined` + relatório HTML via `htmlReport` (biblioteca `benc-uk/k6-reporter`) em `./reports/k6-summaries/stress-test-combined.html`

> **⚠️ ADVERTÊNCIA (13/10/2026) — BUG COMPROVADO, CORRIGIDO EM 13/10/2026, AINDA NÃO EXERCITADO EM CI (este script não testava nada).**
>
> **Causa (registro histórico — runs #9 e #10, código sem `exec:`).** Até a correção de 13/10/2026, `helpers/profiles.js` definia os cenários `stress_test` (linha 69) e `memory_monitor` (linha 83) dentro do perfil `stress` (linha 68) **sem a chave `exec:`**. Um cenário k6 sem `exec` executa a função `default` exportada pelo script — e aqui a `default()` é um no-op explícito. Os dois cenários, portanto, executavam a função vazia: no run 38246676774 (12/10/2026, nº 9) o script rodou 4m50s e consumiu **319.813.516 iterações sem fazer absolutamente nada**, reportando `✅ stress-test-combined: PASS` — e o run [`38393117376`](https://github.com/caminhar-deus/Caminhar/actions/runs/38393117376) (13/10/2026, nº 10, sha `7590120`, ainda no código antigo) **reproduziu o bug de forma idêntica** (196.425.737 iterações em 4m50s, mesmas métricas zeradas/ausentes), confirmando que o defeito é **determinístico** — dois SHAs, dois dias — e não flakiness nem estado de ambiente.
>
> **Evidência bruta** — artifact `reports/k6-summaries/stress-test-combined.json` do run [`38246676774`](https://github.com/caminhar-deus/Caminhar/actions/runs/38246676774) (12/10/2026), lida do `metrics` do k6:
>
> | Métrica no artifact | Valor | O que prova |
> |---|---|---|
> | `checks` | `rate: 0`, `passes: 0`, `fails: 0` | nenhum check executou — nem um único `check()` do `stress_test()` rodou |
> | `http_reqs` | `count: 3`, `rate: 0.01` | 3 requisições no teste **inteiro**, e `http_req_failed` é `fails: 3 / passes: 0` — as 3 falharam e são as de `setup()`/`teardown()`, fora dos cenários |
> | `stress_iterations` | **AUSENTE** das métricas | o `Counter` `StressIterations.add(1)` nunca foi alcançado — prova de que o corpo de `stress_test()` não executou |
> | `nodejs_memory_rss_bytes` | **AUSENTE** | nenhuma leitura de memória RSS foi registrada |
> | `nodejs_memory_heap_used_bytes` | todos os valores `0` | o corpo de `memory_monitor()` também não executou |
> | `iteration_duration` | `avg 0.0007s` (~700 ns) | iterações instantâneas, coerente com função vazia |
> | `setup_data.token` | presente (mascarado como `*** TOKEN OCULTO ***`) | o `setup()` rodou e devolveu token — a causa **não** é token ausente, é função não executada |
>
> **Por que o job ficou verde.** O perfil `stress` declara os thresholds `http_req_duration{scenario:stress_test}`, `http_req_failed{scenario:stress_test}`, `checks{scenario:stress_test}` e `nodejs_memory_heap_used_bytes`. No k6, threshold sobre métrica **sem amostras** não reprova — logo os quatro passaram **por falta de dados, não por desempenho**. É o mesmo mecanismo do gotcha já registrado em `gotchas/k6-check-nao-altera-exit-code.md`.
>
> **Contraste que prova a causa.** `security/rate-limit-test.js` usa o perfil `rateLimit`, que **também** usa `scenarios:` sem `exec:` — mas a lógica dele está na `export default function()` (linha 17), então o cenário `brute_force` executa a `default`, que é a função certa, e aquele teste **funciona**. A diferença não é o perfil, é **onde** a lógica está no arquivo: perfis sem `exec:` são inofensivos enquanto a lógica estiver na `default()` e silenciosamente destrutivos quando não estiver.
>
> **Sem relação com este bug:** os `checks` em 50% (`ip-spoofing-test`) e 33,33% (`ddos-search-test`) são comportamento correto e documentado no próprio código — checks mutuamente exclusivos por status HTTP, em que cada requisição satisfaz exatamente um (o cabeçalho do `ddos-search-test.js` diz que "a soma é 100% e a leitura de um percentual isolado não significa falha"). Os thresholds `ip_rotation_evasion_rate` (0,00%) e `search_block_rate` (99,95%) passaram, e `errors_500` ficou em 0,00%.
>
> **Correção aplicada em 13/10/2026, ainda não exercitada em CI:** o perfil `stress` de `load-tests/helpers/profiles.js` agora declara `exec: 'stress_test'` no cenário `stress_test` e `exec: 'memory_monitor'` no cenário `memory_monitor` (duas linhas; sem mudança de thresholds nem estágios). A correção está no **working tree — só entra em vigor após commit e push**, então o próximo cron é o primeiro run que a exercita. Pendência fechada em `docs/PENDENCIAS_scripts_testes.md` (item Z), que traz também o **critério de verificação objetivo** no artifact do próximo run (`checks.passes > 0`; `http_reqs` na casa das dezenas de milhares, hoje eram 3; `stress_iterations` presente, hoje ausente; `nodejs_memory_rss_bytes` presente, hoje ausente). Com ela, o teste passa a exercitar de fato 100 VUs contra a app por ~5 min e o cron **pode reprovar legitimamente pela primeira vez** — reprovação de capacidade, não de defeito (ver previsão detalhada no item Z).

**Métricas customizadas:**
- `nodejs_memory_rss_bytes` — Memória RSS (Trend)
- `nodejs_memory_heap_total_bytes` — Heap total (Trend)
- `nodejs_memory_heap_used_bytes` — Heap usado (Trend; threshold: max < 1GB)
- `stress_iterations` — Counter incrementado quando a criação do vídeo falha em uma iteração do cenário de estresse

> **Registro (13/10/2026):** nenhuma dessas métricas teve amostra registrada nos runs [`38246676774`](https://github.com/caminhar-deus/Caminhar/actions/runs/38246676774) e [`38393117376`](https://github.com/caminhar-deus/Caminhar/actions/runs/38393117376) — `stress_iterations` e `nodejs_memory_rss_bytes` nem aparecem nos artifacts, e `nodejs_memory_heap_used_bytes` veio todo em `0` (ver advertência acima). Naqueles runs elas existiam só como declaração no código, não como medição observada. Com a correção de 13/10/2026 (que só vigora após commit), espera-se que passem a registrar de verdade no próximo cron — `pages/api/status.js` devolve `data.system.{rss, heapTotal, heapUsed}`, que é exatamente o que `memory_monitor()` lê, e o threshold `nodejs_memory_heap_used_bytes: ['max<1073741824']` deixa de passar trivialmente por métrica vazia.

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `POST /api/admin/videos` — Criar vídeo
- `PUT /api/admin/videos` — Atualizar vídeo
- `DELETE /api/admin/videos` — Deletar vídeo
- `GET /api/status` — Status do servidor (monitoramento de memória)
- `GET /api/admin/videos?limit=100&page={n}` — Listar vídeos com paginação (teardown)

**Configuração de carga:** Perfil `stress` do `helpers/profiles.js` (via `getProfile('stress')`)

---

### Testes de Cache (2 arquivos)

#### `cache-warmup-test.js`

**Nome do arquivo:** `cache-warmup-test.js`

**Caminho:** `/load-tests/performance/cache-warmup-test.js`

**Arquivos acionados/relacionados:**
- `helpers/auth.js` — reexporta `setup()` (login)
- `helpers/config.js` — `BASE_URL`
- `helpers/sleep.js` — `randomSleep(0.05, 0.2)`
- Módulos k6: `k6/http`, `k6` (`check`)

**O que faz:** Teste de warm-up do cache que popula o cache (Redis e/ou memória) com dados antes dos testes de performance principais.

**Propósito:** Garantir que o cache esteja quente antes do `cache-performance-test`, para que as métricas reflitam o comportamento com cache populado.

**Estrutura:**
- `setup()` — Login via `helpers/auth.js` (reexportado)
- 1 VU, 1 iteração, cenário `warmup` com executor `per-vu-iterations` e `maxDuration: 30s`
- 4 endpoints aquecidos (posts, posts paginados ×2, settings autenticado) × 5 rounds cada (20 requisições no total; comentário no código registra aumento de 3 para 5 rounds para assegurar TTL estável)
- `verifyCachePopulated()` — Requisição extra de confirmação em `/api/posts` (status 200 e duração < 200ms); exibe aviso se o cache não estiver confirmado como quente
- Thresholds: apenas `http_req_failed rate<0.50` (sem thresholds de latência agressivos)
- **Não possui `handleSummary()`** — não gera relatório JSON

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `GET /api/posts` — Listagem pública de posts
- `GET /api/posts?page=1&limit=10` — Posts paginados
- `GET /api/posts?page=2&limit=5` — Posts paginados
- `GET /api/settings` — Configurações (requer auth)

---

#### `cache-performance-test.js`

**Nome do arquivo:** `cache-performance-test.js`

**Caminho:** `/load-tests/performance/cache-performance-test.js`

**Arquivos acionados/relacionados:**
- `helpers/config.js` — `BASE_URL`, `USERNAME`, `PASSWORD`
- `helpers/sleep.js` — `randomSleep(0.5, 3)`
- Módulos k6: `k6/http`, `k6` (`check`), `k6/execution` (`exec`, usado nos aborts do setup)
- Não importa `helpers/auth.js`, `helpers/profiles.js` nem `helpers/report.js`

**O que faz:** Teste comparativo de performance entre requisições cacheadas e não cacheadas.

**Propósito:** Medir a eficácia do cache, validando que respostas cacheadas são significativamente mais rápidas.

**Estrutura:**
- `setup()` — Inline (não usa `helpers/auth.js`): health check via GET na raiz de `BASE_URL` (aborta via `exec.test.abort` se conexão recusada, status 0) + login em `POST /api/auth/login?response=body` (aborta se status ≠ 200), retornando o token como string. **Não realiza validação de Content-Type** (correção: versão anterior deste documento afirmava que validava)
- `default()` — 2 blocos por iteração:
  1. Settings (autenticado + cache) — GET `/api/settings` com Bearer token e tag `{type: cached_settings}`
  2. Posts (público + cache) — GET `/api/posts` com tag `{type: cached_posts}`
- Checks: status 200, cache hit (duração < 200ms) e validade do body para cada endpoint
- Thresholds específicos por tipo:
  - `http_req_duration{type:cached_settings}` p(95)<500ms, avg<200ms
  - `http_req_duration{type:cached_posts}` p(95)<500ms, avg<200ms
  - `checks{check:posts cache hit (<200ms)}` rate>0.90
  - `checks{check:settings cache hit (<200ms)}` rate>0.90
  - `http_req_failed` rate<0.05 e `checks` rate>0.95 (genéricos)
- **Não usa spoofing de IP** — comentário explica que IP local está na whitelist de rate limit, que a detecção de spoofing bloquearia requisições com `X-Forwarded-For` divergente do socket e que testes de cache devem testar cache, não evasão de rate limit
- **Não usa `helpers/profiles.js` nem `helpers/report.js`** — `options` inline e sem `handleSummary()` (não gera relatório JSON)

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `GET /api/settings` — Configurações (autenticado + cache)
- `GET /api/posts` — Posts (público + cache)

**Configuração de carga:** Estágios 10s/5s/10s/5s (1→5→50 VUs) — warm-up estendido para garantir cache L1 quente; comentários citam cache L1 (memória, <5ms) e L2 Redis remoto (~175ms, Upstash)

---

## Subpasta functional/ — Validação Funcional

Contém 9 scripts de teste funcional e validação.

### `health-check.js`

**Nome do arquivo:** `health-check.js`

**Caminho:** `/load-tests/functional/health-check.js`

**Arquivos acionados/relacionados:**
- `helpers/config.js` — `BASE_URL`
- `helpers/profiles.js` — `getProfile('health')` (sem overrides)
- Módulos k6: `k6/http`, `k6` (`check`)

**Resumo:**
Teste de carga específico para o endpoint de health check da API. Verifica se o endpoint `GET /api/status?mode=health` responde corretamente sob carga crescente (até 20 VUs) e respeita SLAs rigorosos de tempo de resposta.

- Configuração: perfil `health` do `helpers/profiles.js` (20 VUs, estágios 5s/10s/5s, thresholds p(95)<500ms e failed<2%)
- Rota pública (sem autenticação) — GET `/api/status?mode=health`
- Valida status 200 e body com `status === 'ok'` (via `r.json('status')`)
- Não usa `randomSleep` (requisições contínuas)
- **Não possui `handleSummary()`** (teste leve sem geração de relatório)

**Endpoints chamados:**
- `GET /api/status?mode=health` — Health check

---

### `backup-verification-test.js`

**Nome do arquivo:** `backup-verification-test.js`

**Caminho:** `/load-tests/functional/backup-verification-test.js`

**Arquivos acionados/relacionados:**
- `helpers/auth.js` — reexporta `setup()` (login)
- `helpers/config.js` — `BASE_URL`
- `helpers/report.js` — `generateReport()`
- Módulos k6: `k6/http`, `k6` (`check`)

**Resumo:**
Teste funcional para verificar a listagem de backups, validando a estrutura JSON de resposta. Garante que o endpoint de backups retorne a estrutura esperada com campos `backups` e `latest`.

- `setup()` — Login via `helpers/auth.js`
- `default()` — GET `/api/admin/backups` com token Bearer e tag `{type: backup_list}`
- Checks: status 200, resposta é JSON válido, retornou lista de backups (array) e estrutura de `latest` válida (aceita `null` ou objeto com campo `name`)
- Suporta formato direto (`body.backups`) e aninhado (`body.data.backups`), o mesmo para `latest`
- Loga a quantidade de backups encontrados e o nome do último, ou detalhes da falha
- `handleSummary()` — Gera relatório via `generateReport()` com nome `backup_verification_test`

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `GET /api/admin/backups` — Listagem de backups

**Configuração de carga:** `options` inline — 1 VU, 1 iteração, thresholds `checks` rate>0.80 e `http_req_duration` p(95)<5000ms

---

### `cache-headers-test.js`

**Nome do arquivo:** `cache-headers-test.js`

**Caminho:** `/load-tests/functional/cache-headers-test.js`

**Arquivos acionados/relacionados:**
- `helpers/sleep.js` — `randomSleep(0.5, 3)`
- `helpers/config.js` — `BASE_URL`
- `helpers/profiles.js` — `getProfile('light', ...)`
- `helpers/report.js` — `generateReport()`
- Módulos k6: `k6/http`, `k6` (`check`)

**Resumo:**
Verifica a presença e corretude dos headers de cache HTTP (`Cache-Control`, `s-maxage`, `stale-while-revalidate`). Garante que as respostas da API incluam headers de cache apropriados para otimização de performance.

- Rota pública (sem autenticação) — GET `/api/posts`
- Checks: header `Cache-Control` existe, contém diretiva `s-maxage` (cache compartilhado CDN/proxy) e contém `stale-while-revalidate` (revalidação em segundo plano)
- Warnings via `console.warn` apenas na primeira iteração (`__ITER === 0`) — os checks em si falham normalmente caso o header esteja ausente
- Loga o valor de `Cache-Control` de cada iteração para debug visual
- `handleSummary()` — Gera relatório via `generateReport()` com nome `cache_headers_test`
- Configuração: perfil `light` com override de thresholds — `http_req_duration` p(95)<2000ms e `checks` rate==1.0 (substituem os thresholds do perfil base); 5 iterações

**Endpoints chamados:**
- `GET /api/posts` — Listagem pública de posts (verifica headers de resposta)

---

### `posts-cursor-pagination-test.js`

**Nome do arquivo:** `posts-cursor-pagination-test.js`

**Caminho:** `/load-tests/functional/posts-cursor-pagination-test.js`

**Arquivos acionados/relacionados:**
- `helpers/sleep.js` — `randomSleep(0.5, 3)`
- `helpers/config.js` — `BASE_URL`
- `helpers/profiles.js` — `getProfile('light', ...)`
- `helpers/report.js` — `generateReport()`
- Módulos k6: `k6/http`, `k6` (`check`)

**Resumo:**
Testa a paginação baseada em cursor para o recurso de posts. Valida o funcionamento da paginação por cursor (diferente de page/offset), que é mais eficiente para grandes conjuntos de dados.

- Rota pública (sem autenticação) — GET `/api/posts?limit=5`
- Pega o ID do último post da página 1 como cursor → requisição com `?cursor={id}`
- Valida que resultados são distintos entre páginas (o primeiro post da página 2 não pode ser igual ao cursor — caso contrário, loga erro indicando que a API pode estar incluindo o cursor no retorno)
- Se a página 1 estiver vazia, encerra com warning ("Adicione dados ao banco"); lista vazia na página 2 passa como válida
- Aceita respostas em `body.data` ou array direto
- `handleSummary()` — Gera relatório via `generateReport()` com nome `posts_cursor_pagination_test`
- Configuração: perfil `light` com override — `iterations: 1` e thresholds `checks: rate==1.0`

**Endpoints chamados:**
- `GET /api/posts?limit=5` — Listar posts (página 1)
- `GET /api/posts?limit=5&cursor={id}` — Listar posts (página 2 via cursor)

---

### `posts-tags-test.js`

**Nome do arquivo:** `posts-tags-test.js`

**Caminho:** `/load-tests/functional/posts-tags-test.js`

**Arquivos acionados/relacionados:**
- `helpers/sleep.js` — `randomSleep(0.5, 3)`
- `helpers/config.js` — `BASE_URL`
- `helpers/profiles.js` — `getProfile('light', ...)`
- `helpers/report.js` — `generateReport()`
- Módulos k6: `k6/http`, `k6` (`check`)

**Resumo:**
Testa o filtro de posts por tag na API pública. Verifica se a rota `/api/posts?tag=...` responde corretamente ao filtro por tag.

- Rota pública (sem autenticação) — GET `/api/posts?tag={tag}` com tag escolhida aleatoriamente
- Tags fixas: `['fé', 'oração', 'bíblia', 'vida', 'espiritualidade']`
- Checks: status 200 e retorno de lista de posts — aceita `body.data.posts`, `body.posts`, `body.data` ou array vazio (correção: versões anteriores deste documento afirmavam que o teste validava se os posts retornados contêm a tag buscada; na realidade os dois checks do arquivo apenas verificam que a resposta contém um array, sem inspecionar o conteúdo das tags)
- `handleSummary()` — Gera relatório via `generateReport()` com nome `posts_tags_test`
- Configuração: perfil `light` com override — `iterations: 5` e thresholds `checks` rate>0.80 e `http_req_duration` p(95)<2000ms

**Endpoints chamados:**
- `GET /api/posts?tag={tag}` — Posts filtrados por tag

---

### `recovery-test.js`

**Nome do arquivo:** `recovery-test.js`

**Caminho:** `/load-tests/functional/recovery-test.js`

**Arquivos acionados/relacionados:**
- `helpers/sleep.js` — `randomSleep(0.3, 1.3)`
- `helpers/config.js` — `BASE_URL`
- `helpers/profiles.js` — `getProfile('recovery')` (sem overrides)
- `helpers/report.js` — `generateReport()`
- Módulos k6: `k6/http`, `k6` (`check`), `k6/metrics` (`Trend`, `Counter`)

**Resumo:**
Testa a capacidade de recuperação do sistema após uma falha (banco de dados offline). Valida que o sistema detecta falhas e se recupera automaticamente, medindo o tempo de recuperação (TTR).

- Configuração: perfil `recovery` do `helpers/profiles.js` (cenário `chaos_monitor`: 1 VU constante por 2 minutos, sem thresholds)
- Monitora rota `/api/posts` que depende estritamente do banco de dados, com `expectedStatuses: { min: 200, max: 599 }` (qualquer status conta, sem marcar `http_req_failed`)
- Estados `isSystemDown`/`failureStartTime` (escopo do VU) para rastrear início/fim de quedas — ao detectar retorno do 200 após uma queda, loga o tempo de downtime
- Métricas: `recovery_time_ms` (Trend, variável `RecoveryTime`) e `recovery_count` (Counter, variável `RecoveryCount`)
- `handleSummary()` — Se nenhuma recuperação ocorreu e todos os checks passaram, loga mensagem de estabilidade; gera relatório via `generateReport()` com nome `recovery_test`

**Endpoints chamados:**
- `GET /api/posts` — Listagem pública de posts (dependente do banco)

---

### `search-content-test.js`

**Nome do arquivo:** `search-content-test.js`

**Caminho:** `/load-tests/functional/search-content-test.js`

**Arquivos acionados/relacionados:**
- `helpers/sleep.js` — `randomSleep(0.5, 3)`
- `helpers/config.js` — `BASE_URL`
- `helpers/profiles.js` — `getProfile('light', ...)`
- `helpers/report.js` — `generateReport()`
- Módulos k6: `k6/http`, `k6` (`check`)

**Resumo:**
Testa a busca de conteúdo textual nos posts públicos. Valida que o mecanismo de busca retorna resultados consistentes e performáticos para diferentes termos de busca.

- Rota pública (sem autenticação) — GET `/api/posts?search={termo}&page=1&limit=10` com termo escolhido aleatoriamente
- Termos de busca: `['Deus', 'Jesus', 'amor', 'fé', 'vida', 'caminhar', 'oração']` — escolhidos por existirem literalmente nos posts de seed (a busca usa full-text search com stemming em português, `plainto_tsquery`, que pode retornar variações morfológicas)
- Warm-up na primeira iteração (3 requisições com tag `WarmUp`: `Deus`, `Jesus`, `amor`) para aquecer o cache do servidor Next.js
- Checks: status 200, estrutura válida (array em `body.data` ou direto) e **match rígido** do termo no `title`/`excerpt`/`content` de pelo menos um post (falha o check se não encontrar; a API pública retorna `content` truncado em 2000 caracteres justamente para permitir esta validação)
- Configuração: perfil `light` com override — `iterations: 10` e thresholds `checks` rate==1.0 e `http_req_duration{name:SearchPosts}` p(95)<500ms, avg<200ms
- `handleSummary()` — Gera relatório via `generateReport()` com nome `search_content_test`

**Endpoints chamados:**
- `GET /api/posts?search={termo}&page=1&limit=10` — Busca textual em posts

---

### `upload-flow-test.js`

**Nome do arquivo:** `upload-flow-test.js`

**Caminho:** `/load-tests/functional/upload-flow-test.js`

**Arquivos acionados/relacionados:**
- `helpers/auth.js` — reexporta `setup()` (login)
- `helpers/config.js` — `BASE_URL`
- `helpers/sleep.js` — `randomSleep(1, 3)`
- `helpers/report.js` — `generateReport()`
- Módulos k6: `k6/http`, `k6` (`check`), `k6/encoding` (`b64decode`), `k6/execution` (`exec`, usado no abort por token ausente)

**Resumo:**
Testa o fluxo de upload de arquivos para a aplicação. Valida que o endpoint de upload de arquivos funciona sob carga e respeita limites de tamanho e tipo de arquivo.

- `setup()` — Login via `helpers/auth.js`; se o token não estiver disponível, aborta o teste via `exec.test.abort`
- Simula upload de GIF 1x1 transparente embutido em Base64 (decodificado via `b64decode`) como multipart/form-data via `http.file()`, com payload `{ image, type: 'post' }` e tag `{flow: upload_image}`
- Valida status 200 e presença de URL na resposta (aceita `data.url`, `url` ou `path`)
- Verificação adicional: tenta baixar a imagem recém-criada (GET) para garantir persistência no disco, com warning se não acessível
- Nome do arquivo contém prefixo `post-image-load-k6-${__VU}-${__ITER}.gif` para compatibilidade com scripts de limpeza
- `handleSummary()` — Gera relatório via `generateReport()` com nome `upload-flow-summary` (único relatório da suíte com nome no formato kebab-case sem sufixo `_test`)

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `POST /api/upload-image` — Upload de arquivo
- `GET {imageUrl}` — Verificação de persistência no disco

**Configuração de carga:** `options` inline (não usa `helpers/profiles.js`) — 5 VUs, estágios 10s/30s/10s, thresholds `http_req_duration` p(95)<2000ms e `http_req_failed` rate<0.01

---

### `video-validation-test.js`

**Nome do arquivo:** `video-validation-test.js`

**Caminho:** `/load-tests/functional/video-validation-test.js`

**Arquivos acionados/relacionados:**
- `helpers/auth.js` — reexporta `setup()` (login)
- `helpers/config.js` — `BASE_URL`
- `helpers/sleep.js` — `randomSleep(0.3, 1.3)` entre cenários
- `helpers/report.js` — `generateReport()`
- Módulos k6: `k6/http`, `k6` (`check`)

**Resumo:**
Teste funcional que valida as regras de validação de URL do YouTube na criação de vídeos. Garante que o endpoint de criação `/api/admin/videos` tenha validações corretas para URLs do YouTube, rejeitando domínios inválidos e URLs malformadas.

- `setup()` — Login via `helpers/auth.js`
- `default()` — 3 cenários de validação:
  1. URL válida do YouTube (`https://www.youtube.com/watch?v=dQw4w9WgXcQ`) — espera 201 + ID no root ou em `data.id`
  2. URL de domínio inválido — Vimeo (`https://vimeo.com/123456789`) — espera 400 + mensagem de erro contendo "YouTube"
  3. URL malformada (`youtube.com/watch?v=`, sem protocolo e sem ID) — espera 400
- Checks de rejeição usam `console.warn` + `return false` (não abortam o teste, mas registram falha no check e avisam que a validação pode estar desativada)
- `handleSummary()` — Gera relatório via `generateReport()` com nome `video_validation_test`

**Endpoints chamados:**
- `POST /api/auth/login` — Autenticação
- `POST /api/admin/videos` — Criação de vídeo (3x)

**Configuração de carga:** `options` inline (não usa `helpers/profiles.js`) — 1 VU, 1 iteração, thresholds `checks` rate>0.60 e `http_req_duration` p(95)<5000ms

---

## Subpasta security/ — Segurança

Contém 4 scripts de teste de segurança.

### `rate-limit-test.js`

**Nome do arquivo:** `rate-limit-test.js`

**Caminho:** `/load-tests/security/rate-limit-test.js`

**Arquivos acionados/relacionados:**
- `helpers/config.js` — `BASE_URL`
- `helpers/profiles.js` — `getProfile('rateLimit', ...)`
- `helpers/report.js` — `generateReport()`
- Módulos k6: `k6/http`, `k6` (`check`), `k6/metrics` (`Counter`)

**Resumo:**
Testa o mecanismo de rate limiting da API, enviando requisições de login em alta frequência (brute force). Garante que o sistema limite corretamente requisições excessivas, retornando status 429 (Too Many Requests) quando o limite é excedido.

- Configuração: perfil `rateLimit` com override de thresholds — `http_req_duration` p(95)<5000ms (acrescentado aos thresholds vazios do perfil)
- Payload com username (`user_test_{random}`) e password (`senha_aleatoria_{random}`) aleatórios (evita whitelist)
- Headers `X-Forwarded-For`, `X-Real-IP`, `CF-Connecting-IP` e `True-Client-IP`, todos com o IP fixo `203.0.113.1` (documentado no `scripts/clear-test-auth-locks.js` para limpeza posterior), para simular IP externo e evitar whitelist de localhost
- Métrica `rate_limit_hits` (Counter, variável `RateLimitHits`) para contar bloqueios por rate limit
- Checks por status:
  - 429 → `🛡️ BLOQUEADO: Rate limit ativo (429)` + check `📝 Mensagem de erro no body` (valida presença de `message`/`error`/`description` no JSON)
  - 403 → `🛡️ BLOQUEADO: Spoofing detection bloqueou (403)` (proteção válida alternativa)
  - 401 → `ℹ️ PERMITIDO: Requisição autenticada (401)`
- Intencionalmente **sem `sleep()`** para máxima taxa de requisições
- `handleSummary()` — Lê `data.metrics.rate_limit_hits` e loga aviso para verificar se o Redis está configurado caso nenhum bloqueio tenha ocorrido; gera relatório via `generateReport()` com nome `rate_limit_test`

**Endpoints chamados:**
- `POST /api/auth/login` — Login (rota mais protegida por rate limit)

---

### `ip-spoofing-test.js`

**Nome do arquivo:** `ip-spoofing-test.js`

**Caminho:** `/load-tests/security/ip-spoofing-test.js`

**Arquivos acionados/relacionados:**
- `helpers/network.js` — `getRandomIP()`
- `helpers/config.js` — `BASE_URL`
- `helpers/profiles.js` — `getProfile('rateLimit', ...)`
- `helpers/report.js` — `generateReport()`
- Módulos k6: `k6/http`, `k6` (`check`)

**Resumo:**
Teste consolidado de IP spoofing que mescla os propósitos dos antigos testes separados (evasão de rate limit + detecção de spoofing) em um único script. Valida se o sistema está protegido contra evasão de rate limit via rotação do header `X-Forwarded-For` e se detecta/bloqueia ativamente IPs falsificados.

- Perfil de carga: `rateLimit` com override de thresholds — `http_req_duration` p(95)<5000ms **e `ip_rotation_evasion_rate` `rate<0.05`** (adicionado em 09/10/2026: sem ele o script imprimia o achado de evasão no log e saía com exit 0)
- Gera um IP aleatório único por iteração via `getRandomIP()` do módulo `helpers/network.js`
- Envia login com username `admin` e senha propositalmente errada (`wrong_password`), header `X-Forwarded-For` falsificado
- **Sem `sleep()`** para máxima taxa de requisições
- `handleSummary()` — Gera relatório via `generateReport()` com nome `ip_spoofing_consolidado_test`; desde 09/10/2026 reporta a **taxa** de evasão com diagnóstico explícito, em vez da contagem bruta

**Interpretação dos resultados:**

Os dois checks são **mutuamente exclusivos** por status HTTP — uma resposta tem um único status, então exatamente um dos dois passa por iteração. **Checks em 50% é o valor esperado**, não sintoma de falha.

| Check | Status | Significado |
|-------|--------|-------------|
| `EVASÃO BLOQUEADA: rate limit por IP real (429)` | 429 | Rotação do IP falso **não** evitou o bloqueio — proteção funcionando |
| `EVASÃO CONFIRMADA: rotação lida, não bloqueou (401)` | 401 | App leu a entrada **esquerda** do `X-Forwarded-For`; cada IP falso virou um bucket novo |

**Métricas próprias:**
- `ip_rotation_evasion_rate` (`Rate`) — proporção de respostas 401. **É esta que tem threshold** (`rate<0.05`); evasão sustentada reprova o job. Taxa, e não contagem, porque com senha errada de propósito os 401 do warm-up não são evasão.
- `ip_rotation_evasions` (`Counter`) — contagem bruta de 401, mantida apenas para relatório.

> **Nota (09/10/2026):** a verificação da cadeia mostrou que a proteção por IP está **correta** — `lib/api/helpers.js:142` resolve `chain[chain.length - hops]`, pegando a entrada **real** (direita) e ignorando a falsificada (esquerda). `pages/api/auth/login.js` mantém três camadas de rate limit (`:50-58`, `:64-67`, `:82-88`). Um 401 isolado é "credencial rejeitada", não evasão — daí a medição por taxa. Ver item V de `docs/PENDENCIAS_scripts_testes.md`.

**Endpoints chamados:**
- `POST /api/auth/login?response=body` — Autenticação (com `X-Forwarded-For` falsificado)

---

### `ddos-search-test.js`

**Nome do arquivo:** `ddos-search-test.js`

**Caminho:** `/load-tests/security/ddos-search-test.js`

**Arquivos acionados/relacionados:**
- `helpers/config.js` — `BASE_URL`
- `helpers/profiles.js` — `getProfile('heavy', ...)`
- `helpers/report.js` — `generateReport()`
- Módulos k6: `k6/http`, `k6` (`check`), `k6/metrics` (`Rate`)

**Resumo:**
Simula um cenário de busca massiva (tipo DDoS) no endpoint de busca de posts. Verifica a resiliência do sistema sob alta frequência de requisições de busca, validando thresholds de performance e taxa de erro.

- Gera busca aleatória com termos fixos: `['amor', 'paz', 'fé', 'luz', 'vida', 'caminho', 'verdade', 'esperança', 'coração', 'espírito']`, acrescidos de **sufixo único por iteração** (`` `${termo}-${__VU}-${__ITER}` ``) — ver "Correção 09/10/2026" abaixo
- Requisição usa `expectedStatuses: [200, 429]` (status 429 não é computado como falha `http_req_failed`) e tags `{type: ddos_search, name: DDoS_Search}`
- Envia `X-Forwarded-For: 203.0.113.10` (RFC 5737, faixa de documentação), **constante** — este teste mede bloqueio; a evasão por rotação é de `ip-spoofing-test`
- Métrica `errors_500` (Rate, variável `ErrorRate500`) — alimentada com `true` para respostas 5xx; threshold `rate<0.50` **sem** `abortOnFail`/`delayAbortEval` (os 5xx são resultado a medir num teste de resiliência): taxa parcial é achado de capacidade reportado no resumo, ≥50% reprova o teste
- Métrica `search_block_rate` (Rate, variável `SearchBlockRate`) — alimentada com `true` para respostas 429; threshold **`rate>0.50`**, que dá poder de reprovação quando a proteção não atua
- Intencionalmente **sem `sleep()`** para máxima taxa de requisições
- `handleSummary()` — Gera relatório via `generateReport()` com nome `ddos_search_test`; reporta **duas** taxas: `errors_500` (resiliência) e `search_block_rate` (proteção da busca)
- Configuração: perfil `heavy` com stages e thresholds totalmente sobrescritos — estágios 10s/30s/10s com 100→500→0 VUs

**Correção 09/10/2026 — o teste passou a medir o que promete:**

A versão anterior **não conseguia** exercitar a proteção, por duas causas independentes, ambas invisíveis porque o teste saía verde (100% de 200) enquanto prometia validar DDoS:

1. **Termo de busca constante.** O cache de `pages/api/posts.js:46` é indexado pelo termo (TTL 30 min, `:51`) e o rate limit (`:58`) roda **dentro** do callback de cache — logo, só em cache miss. Com 10 termos e ~16.000 requisições havia ~10 verificações de rate limit contra um limite de 100/min: o limite era **estruturalmente inalcançável** e o check de 429 nunca podia passar. O `_t=${Date.now()}` que o teste enviava **não** fazia parte da chave de cache e não bustava nada.
2. **IP resolvido era loopback.** A CI sobe o app com `TRUST_PROXY: 'true'` (1 hop) e o k6 roda no mesmo container, então sem `X-Forwarded-For` o app resolve o socket (`127.0.0.1`), que está na whitelist permanente de `lib/cache/cache.js:331` e **nunca** é rate-limited.

Verificado por simulação: com termo fixo, 15.000 requisições produzem 4 chaves de cache (4 verificações de rate limit); com termo único, 15.000 chaves (15.000 verificações). E `resolveClientIP` (`lib/api/helpers.js:141`) resolve `127.0.0.1` sem header e `203.0.113.10` com header.

**Efeito colateral conhecido:** termo único cria ~15.000 chaves de cache em ~50 s (antes: 10). TTL de 30 min com limpeza periódica de 60 s que só remove expiradas (`lib/cache/cache.js:73`) — nada é liberado durante o teste. Estimativa de **~11 MB** no cache L1 do processo, perdido no fim do job (CI é descartável). Se o teste passar a rodar fora de ambiente descartável, limitar o número de iterações.

**Interpretação dos resultados:**
| Cenário | Checks que PASSAM | Significado |
|---------|-------------------|-------------|
| Sistema resiliente | `🛡️ BLOQUEADO: Rate limit atuou (429)` (alta taxa) | Proteção contra DDoS funcionando |
| Sistema subdimensionado | `⚠️ VULNERÁVEL: Servidor caiu (5xx)` (taxa parcial) | Servidor não suporta a carga |
| Sistema estável | `✅ RESISTIU: Servidor respondeu (200)` (alta taxa) | **Rate limit NÃO limitou a busca: falha de proteção** |

Os três checks são **mutuamente exclusivos por status HTTP** (uma resposta tem um único status), então a soma é 100% e a leitura de um percentual isolado não significa falha — leia os três juntos. Antes da correção de 09/10/2026, `🛡️ BLOQUEADO` era **inalcançável**; agora é o check que indica a proteção funcionando.

**Endpoints chamados:**
- `GET /api/posts?search={termo}-{VU}-{ITER}` — Busca de posts com termo único por iteração (garante cache miss, logo verificação de rate limit) e header `X-Forwarded-For`

---

### `login-negative-test.js`

**Nome do arquivo:** `login-negative-test.js`

**Caminho:** `/load-tests/security/login-negative-test.js`

**Arquivos acionados/relacionados:**
- `helpers/sleep.js` — `randomSleep(0.5, 3)`
- `helpers/report.js` — `generateReport()`
- `helpers/config.js` — `BASE_URL`
- Módulos k6: `k6/http`, `k6` (`check`)

**Resumo:**
Teste negativo de autenticação que envia credenciais inválidas. Garante que o endpoint de login rejeite corretamente credenciais inválidas com status 401 e não vaze informações sobre usuários existentes.

- **Cenário 1:** Usuário existente (`admin`) com senha incorreta (`senha_incorreta_proposital`) — espera 401/400/429 (tag `{type: wrong_password}`)
- **Cenário 2:** Usuário inexistente (`usuario_fantasma_k6`) — espera 401/429 (tag `{type: non_existent_user}`)
- Configuração: `options` inline (não usa `helpers/profiles.js`) — 10 VUs, estágios 10s/30s/10s, thresholds `http_req_duration` p(95)<1000ms e `checks` rate>0.95
- `handleSummary()` — Gera relatório via `generateReport()` com nome `login_negative_test`

**Endpoints chamados:**
- `POST /api/auth/login?response=body` — Autenticação (com credenciais inválidas)

---

## Arquivos Relacionados Fora da Pasta `load-tests/`

### `load-tests.yml` (CI/CD)

**Localização:** `.github/workflows/load-tests.yml` (fora da pasta `load-tests/`, em `.github/workflows/`)

**O que faz:** Workflow do GitHub Actions que executa a suíte completa de testes de carga em CI.

**Propósito:** Automatizar a execução de todos os 30 scripts de teste de carga em ambiente isolado com PostgreSQL e Redis, com validação de thresholds e cache de dependências.

**Estrutura do workflow:**
1. **Schedule:** Execução automática diária agendada para as 04:17 UTC (`cron: '17 4 * * *'` — o minuto 17 é deliberado: o GitHub agenda todos os crons de minuto 0 no mesmo instante e o pico do topo da hora atrasa a execução; o valor do cron foi **mantido**). **A execução observada, porém, não começa nesse horário:** nas execuções agendadas medidas via API pública do GitHub até o run `38246676774` (12/10/2026), o início real saiu de **+6,4 h a +19,1 h** após o horário do cron, concentrando-se em torno de **+7 h** — o run #9 começou às `2026-10-12T12:03:57Z` = **09:03 BRT**, dentro do horário comercial. O `created_at` do run já nasce atrasado (o run é criado ~7 h depois do horário do cron, antes de qualquer step deste workflow), o que aponta para a fila de agendamento do próprio GitHub — e **não** para o `concurrency` group nem para a fila de runners do repositório; a causa raiz não foi confirmada, apenas delimitada por essa evidência. Consequência: o horário do cron **não** é garantia de janela noturna (a versão anterior deste documento afirmava "madrugada, fora do horário comercial", o que a medição desmente). Ver o comentário no próprio `.github/workflows/load-tests.yml`, que é a fonte atual.
2. **Triggers manuais:** via `workflow_dispatch`
3. **Job `load-tests`:** único job do workflow. Ele **chama** o workflow reutilizável `test-base.yml` (`uses: ./.github/workflows/test-base.yml`) com `test-type: load`, `run-command: npm run test:load:safe`, `skip-k6: false`, `timeout-minutes: 60`, `seed-db` e as credenciais do admin — todos repassados por `with:`, porque um job que chama workflow reutilizável não pode declarar `steps` nem `timeout-minutes`. É o `test-base.yml` que sobe Postgres/Redis, faz o `npm ci`, o setup do banco, o build/boot da app, roda a bateria e publica o artifact `Upload k6 Reports` (`retention-days` + `if-no-files-found: ignore`).
   - **Não existe mais o job `validate-and-report`** (nem os steps `Validate Thresholds` e `Notify Threshold Violation` que a versão anterior deste documento descrevia): a validação de thresholds e a publicação dos relatórios são feitas pelo `test-base.yml` e pelos scripts k6 eles próprios. A versão anterior também atribuía a este job um comando `node scripts/run-all-load-tests-sequentially.js` direto — o comando passou a ser o `npm run test:load:safe`.
4. **`concurrency`:** `group: ${{ github.workflow }}` com `cancel-in-progress: false` — dois runs de carga nunca rodam simultâneos (contaminariam latência/throughput e os seeds de um apagariam os dados do outro), e um run em andamento nunca é morto no meio. Efeito medido: no dia 12/10/2026 um `workflow_dispatch` manual (run #8, 11:59:43Z → 12:17:43Z) rodou antes do agendado (run #9), e o job do #9 ficou ~14 min na fila do grupo até 12:17:46Z, quando o #8 liberou.

---

### Registro de execução — run [`38246676774`](https://github.com/caminhar-deus/Caminhar/actions/runs/38246676774) (cron "Load Tests (k6)" nº 9, 12/10/2026)

Registro datado da execução agendada usada como base de medição para as decisões sobre o `cron`, o `timeout-minutes` e o bump das GitHub Actions (nenhum dos dois arquivos deste documento tinha seção de runs — esta é a primeira entrada):

| Campo | Valor medido |
|-------|--------------|
| Run / SHA | `38246676774` / `82e0ed5` |
| Event / conclusion | `schedule` / `success` |
| Job `load-tests / run-tests` | `12:17:46Z` → `12:36:16Z` = **18m30s** |
| Step mais lento | `Run Tests` (`npm run test:load:safe`, 30 scripts k6) = **16m39s** (~33 s por script); o resto do setup soma ~1m45s (`Initialize containers` 35s, `npm ci` 59s, checkout 2s, `setup-db` 1s, build 5s, k6 1s; `Audit Dependencies` skipped; upload 1s) |
| Início vs cron | `run_started_at` = `2026-10-12T12:03:57Z` = **09:03 BRT**, +7h47 após o horário do cron de 04:17 UTC (horário comercial — ver item 1 da seção `load-tests.yml` acima) |
| Annotation no log | **"Uh oh! Node.js 20 is deprecated ... forced to run on Node.js 24"** para `actions/checkout@v4`, `actions/setup-node@v4` e `actions/upload-artifact@v4` (e, no `test-coverage.yml`, também `actions/download-artifact@v4` e `actions/github-script@v7`) |
| Ação tomada (12/10/2026) | Bump das actions oficiais em `.github/`: `checkout`/`setup-node`/`upload-artifact` → **v7**, `download-artifact` → **v8**, `github-script` → **v9**. Breaking changes das release notes conferidas contra o uso deste repo (nenhuma se aplica) — ver o comentário no topo dos steps de `test-base.yml`. `grafana/setup-k6-action@v1` e as actions locais `./.github/actions/*` ficaram fora do bump (não emitiram a annotation). Efeito esperado: sumir a annotation e voltar a rodar em Node.js suportado, sem mudança de inputs. |
| Decisões derivadas | `cron` mantido em `17 4 * * *` (comentário corrigido: a execução não roda na madrugada); `timeout-minutes` de 180 → **60** (18m30s medidos × 3.6 de folga) |
| Bug descoberto na análise (13/10/2026) | A análise do artifact `reports/k6-summaries/stress-test-combined.json` e do log deste run revelou que o script `stress-test-combined` **não executou nenhum teste**: os cenários do perfil `stress` (`stress_test` e `memory_monitor`) não tinham `exec:`, então rodavam a `default()` vazia — 4m50s, **319.813.516 iterações instantâneas**, `checks` com `rate 0 / passes 0 / fails 0`, só 3 `http_reqs` (todas do `setup()`/`teardown()`, todas falhando), métricas `stress_iterations` e `nodejs_memory_rss_bytes` ausentes do artifact e `nodejs_memory_heap_used_bytes` todo em `0`. Ou seja, **o verde deste run (e o `✅ stress-test-combined: PASS`) não cobre o que o nome do script sugere** — os thresholds passaram por falta de amostras, não por desempenho. **Reprodução idêntica no run [`38393117376`](https://github.com/caminhar-deus/Caminhar/actions/runs/38393117376)** (cron nº 10, 13/10/2026, sha `7590120`, ainda no código antigo): mesmas métricas zeradas/ausentes, 196.425.737 iterações em 4m50s, bateria 30/30 passed — dois SHAs e dois dias com o mesmo resultado prova que o defeito é determinístico. **Bug corrigido em 13/10/2026** (`exec:` adicionado aos dois cenários do perfil `stress`), **ainda não exercitado em CI** — ver a seção [`stress-test-combined.js`](#stress-test-combinedjs) e `docs/PENDENCIAS_scripts_testes.md` (item Z, com o critério de verificação do próximo run). |

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
- **Captura de saída (tee)** — Cada script roda com `stdio: ['inherit', 'pipe', 'pipe']`: a saída é ecoada ao vivo para o terminal (o log do CI não perde nada) e guardada em buffer limitado a **5 MB por script**, com timeout de **10 min** por script; ao estourar o limite, imprime `[⚠️ saída truncada: limite de <N> bytes por script — o restante não é ecoado]`
- **Relatório de falhas** — Só para scripts reprovados: `extractFailureDetails()` de `scripts/lib/k6-output-parser.js` (em `try/catch`, **nunca** decide pass/fail) extrai checks reprovados (com a contagem `↳`), thresholds violados e erros de console; a seção `❌ DETALHES DOS ERROS` é impressa **depois** do banner de totais, apenas se houver falha, e os mesmos detalhes vão para o campo `details` de cada script falho no JSON (scripts aprovados seguem sem `details`)
- **Exit code** — Não-zero se houver falhas

**Variáveis de ambiente necessárias:**
- `ADMIN_USERNAME` — Nome do usuário admin (obrigatório)
- `ADMIN_PASSWORD` — Senha do admin (obrigatório para testes autenticados)

---

### `scripts/lib/k6-output-parser.js`

**Localização:** `/scripts/lib/k6-output-parser.js` (diretório `scripts/lib/` novo, 08/10/2026)

**O que faz:** Extrai os erros estruturados da saída do k6 para o relatório de falhas do orquestrador — *checks que falharam* (com a linha `↳` de contagem), *thresholds violados* e *erros de console* (`level=error`/`fatal`).

**Propósito:** Dar motivo visível a cada reprovação, sem obrigar ninguém a vasculhar o log bruto do job.

**Estrutura:**
- `BoundedTailBuffer` — buffer deslizante com os **últimos 5 MB** da saída (`MAX_CAPTURE_BYTES`), que é onde ficam resumo, thresholds e mensagens do k6; deduplica por texto, porque o k6 redesenha a mesma linha com `\r`
- `MAX_DETAILS_PER_GROUP = 100` — teto de ocorrências por tipo, com contador `omittedCount`
- `extractFailureDetails()` — consumido por `scripts/run-all-load-tests-sequentially.js` **só** no caminho de falha e dentro de `try/catch`: **nunca** decide pass/fail

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

4. **Perfis de carga padronizados** — A maioria dos scripts usa `getProfile()` de `helpers/profiles.js` para definir VUs, duração e thresholds, garantindo consistência. Exceções que definem `options` inline: `performance/musicas-search-test.js`, `performance/authenticated-flow-test.js`, `performance/create-post-flow.js`, `performance/cache-performance-test.js`, `functional/backup-verification-test.js`, `functional/upload-flow-test.js`, `functional/video-validation-test.js` e `security/login-negative-test.js`. Atenção: quando um perfil é usado com `thresholds` explícitos em `overrides`, os thresholds do perfil base são **substituídos por completo** (comportamento de `getProfile()`).

5. **Relatórios padronizados** — Os scripts que geram relatório usam `generateReport()` de `helpers/report.js` (direta ou indiretamente via `resource-test-runner.js`) para gerar relatórios JSON em `./reports/k6-summaries/`, com sanitização automática do token JWT. Não geram relatório (sem `handleSummary()`): `performance/create-post-flow.js`, `performance/cache-warmup-test.js`, `performance/cache-performance-test.js` e `functional/health-check.js`. O `performance/stress-test-combined.js` é o único que gera também um relatório HTML adicional.

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

| Perfil | Threshold base | Onde é usado |
|--------|----------------|--------------|
| `health` | `p(95) < 500ms`, `failed < 2%` | `functional/health-check.js` (sem overrides) |
| `medium` | `p(95) < 1000ms`, `failed < 5%` | `performance/musicas-load-test.js` e `performance/videos-load-test.js` (ambos substituem os thresholds por completo via override) |
| `light` | `p(95) < 500ms`, `checks == 100%` | Testes funcionais e CRUD (vários com overrides que substituem os thresholds; ver seções individuais) |
| `heavy` | `p(95) < 3000ms`, `failed < 10%` | `security/ddos-search-test.js` (substitui stages e thresholds por completo) |
| `stress` | `p(95) < 3000ms`, `failed < 10%`, `checks > 95%` (tag `scenario:stress_test`), `heap < 1GB` | `performance/stress-test-combined.js` (sem overrides) |
| `recovery` | Nenhum (thresholds vazios) | `functional/recovery-test.js` |
| `rateLimit` | Nenhum (thresholds vazios) | `security/rate-limit-test.js` (acrescenta apenas `http_req_duration` p(95)<5000ms) e `security/ip-spoofing-test.js` (acrescenta `http_req_duration` p(95)<5000ms **e** `ip_rotation_evasion_rate` `rate<0.05`, desde 09/10/2026) |

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

> **Data da análise:** 23/09/2026 (análise anterior: 01/08/2026)
> **Total de scripts analisados:** 37 arquivos na pasta `load-tests/` (30 scripts k6 + 7 helpers) + 13 arquivos relacionados fora da pasta
> **Processo:** cada arquivo foi analisado individualmente e validado por releitura (análise → atualização → releitura → validação), conforme processo obrigatório de auditoria
