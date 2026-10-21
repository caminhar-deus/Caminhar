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
| `stress` | 2 cenários paralelos: `stress_test` (executor `ramping-vus`, 0→20→50→100→0 VUs, estágios 30s/1m/30s/1m/30s/1m/20s, `gracefulRampDown: 30s`, `exec: 'stress_test'` — **correção de 13/10/2026**) e `memory_monitor` (executor `constant-vus`, 1 VU constante por 5min, `exec: 'memory_monitor'` — **correção de 13/10/2026**) | p(95) < 3000ms, failed < 10% e checks > 95% (todos com tag `{scenario:stress_test}`) e `nodejs_memory_heap_used_bytes` max < 1GB (1073741824 bytes) | Stress test combinado — bug comprovado em 13/10/2026 (runs #9 e #10), **corrigido em 13/10/2026 e validado em CI em 14/10/2026 pelo run `38543197931` (cron nº 11)** — ver advertência abaixo |
| `rateLimit` | Cenário `brute_force`: executor `ramping-vus`, 0→20→50→0 VUs, estágios 10s/30s/10s (50s), `gracefulRampDown: 10s` | Nenhum (thresholds vazios) | Brute force / rate limit |

> **⚠️ ADVERTÊNCIA (13/10/2026) — perfil `stress`: bug comprovado, CORRIGIDO EM 13/10/2026 E VALIDADO EM CI EM 14/10/2026 (run `38543197931`, cron nº 11).**
>
> **Registro histórico do bug (runs #9 e #10, código sem `exec:`).** Até a correção de 13/10/2026, os três perfis que usam `scenarios:` — `recovery` (linha 56), `stress` (linha 68) e `rateLimit` (linha 99) — **nenhum declarava** a chave `exec:`. Sem `exec`, o k6 executa em **todo** cenário a função `default` exportada pelo script. Em `performance/stress-test-combined.js` a lógica **não** está na `default()` (que é um no-op explícito), então os cenários `stress_test` e `memory_monitor` executavam a função vazia: no run [`38246676774`](https://github.com/caminhar-deus/Caminhar/actions/runs/38246676774) (12/10/2026, nº 9) o script rodou 4m50s, consumiu **319.813.516 iterações sem fazer absolutamente nada** e ainda assim reportou `✅ stress-test-combined: PASS` — e o run [`38393117376`](https://github.com/caminhar-deus/Caminhar/actions/runs/38393117376) (13/10/2026, nº 10, sha `7590120`, ainda no código antigo) **reproduziu o bug de forma idêntica** (196.425.737 iterações, mesmas métricas zeradas/ausentes), provando que é determinístico — dois SHAs, dois dias. Os quatro thresholds do perfil passavam **por falta de amostras, não por desempenho** — no k6, threshold sobre métrica sem dados não reprova (mesmo mecanismo do gotcha `gotchas/k6-check-nao-altera-exit-code.md`). Evidência completa (métricas do artifact) na seção [`stress-test-combined.js`](#stress-test-combinedjs).
>
> **Contraste que isola a causa:** o perfil `rateLimit` também usa `scenarios:` sem `exec:`, mas `security/rate-limit-test.js` tem a lógica na `export default function()` (linha 17) — por isso aquele teste **funciona**. Perfis sem `exec:` são inofensivos enquanto a lógica estiver na `default()` e silenciosamente destrutivos quando não estiver. A diferença não é o perfil, é **onde** a lógica está no arquivo.
>
> **Status: ~~corrigido em 13/10/2026, ainda não exercitado em CI~~ corrigido em 13/10/2026 e VALIDADO EM PRODUÇÃO EM 14/10/2026 pelo run [`38543197931`](https://github.com/caminhar-deus/Caminhar/actions/runs/38543197931) (cron nº 11, sha `e50de03`, `success`, bateria 30/30).** O perfil `stress` agora declara `exec: 'stress_test'` no cenário `stress_test` e `exec: 'memory_monitor'` no cenário `memory_monitor` (correção aplicada em `load-tests/helpers/profiles.js`, ~~**working tree — só entra em vigor após commit e push**; o próximo cron é o primeiro run que a exercita~~ em vigor a partir do run nº 11, que foi o primeiro a exercitá-la). **A correção foi deliberadamente NÃO replicada** a `recovery` (`chaos_monitor`) e `rateLimit` (`brute_force`): a lógica deles está na `export default function()` de `functional/recovery-test.js` (linha 20) e `security/rate-limit-test.js` (linha 17), então o cenário já executa a função certa; declarar `exec:` ali passaria a procurar funções que não existem e o k6 abortaria o teste. Pendência fechada em `docs/PENDENCIAS_scripts_testes.md`, item Z, ~~com o critério de verificação do próximo run~~ — **critério cumprido no run nº 11: os 4 itens resolveram no estado esperado (o 3º `stress_iterations` segue `ausente`, por ser o estado saudável) e os 4 thresholds do perfil passaram com amostras reais** (ver "Validação" na seção [`stress-test-combined.js`](#stress-test-combinedjs)).

**Exports:**
- `PROFILES` — Objeto com todos os perfis
- `getProfile(profileName, overrides)` — Retorna perfil mesclado com sobrescritas. **`thresholds` é MESCLADO por padrão, chave a chave**: a chave repetida é substituída pelo `overrides.thresholds` e a que só existe no perfil base é preservada. O escape hatch `overrides.replaceThresholds: true` descarta os thresholds do base por inteiro (semântica antiga, agora explícita) e **não vaza** para o objeto devolvido, que é o `options` do k6. Lança `Error` com mensagem descritiva se o perfil solicitado não existir.

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
- A função interna `sanitizeToken()` (não exportada por este módulo) substitui o token JWT por `*** TOKEN OCULTO ***` antes de exportar os dados, garantindo que todos os arquivos que usam `generateReport()` sanitizem automaticamente. Ela cobre **dois formatos de `setup_data`**: o objeto `{ token: "..." }` (só o campo `token` é ocultado) e a **string crua** — a forma que `createLoadSetup` produz ao retornar `loginRes.json('data.token')` direto, que é o que os scripts de carga (`musicas-load-test`, `videos-load-test`) produzem. **Correção de 17/10/2026:** até então só o primeiro formato era tratado, e esses dois scripts publicavam o JWT do admin em texto claro no artifact — medido nos runs #12–#14, em que 2 dos 9 JSON com `setup_data` vazavam o token.

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
- `helpers/report.js` (import de `generateReport`, o único re-export deste módulo)
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
| `generateReport(data, testName)` | — | Re-export de `helpers/report.js` (único símbolo re-exportado; a cópia local de `sanitizeToken` foi removida em 17/10/2026 por ser código morto — ver `UPGRADE_load-tests.md` §4.4) |

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
- Configuração: perfil `light` com override de thresholds — `checks: rate>0.85`, que substitui a chave `checks` do perfil base; o `http_req_duration: p(95)<500` do base é preservado (merge chave a chave), que **substitui** a chave `checks` do perfil base (que exigia `checks rate==1.0`); o `http_req_duration: p(95)<500ms` do base é **preservado**, porque o merge é chave a chave

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

- Configuração: perfil `medium` com override de thresholds — `http_req_duration{name:ListMusicas}` p(95)<500ms, que é uma **chave distinta** do `http_req_duration` do perfil base: o base é preservado, e o script fica com `http_req_duration: p(95)<1000` e `http_req_failed: rate<0.05` **além** do threshold taggeado
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
- Configuração: perfil `light` com override de thresholds — `checks: rate>0.85`, que substitui a chave `checks` do perfil base; o `http_req_duration: p(95)<500` do base é preservado (merge chave a chave), que substitui a chave `checks` do perfil base; o `http_req_duration: p(95)<500ms` do base é preservado (merge chave a chave)

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

- Configuração: perfil `medium` com override de thresholds — `http_req_duration{name:ListVideos_Page1}` e `{name:ListVideos_Page2}` p(95)<500ms e `checks` rate>0.95; o perfil base é preservado (merge chave a chave), o que devolve `http_req_duration: p(95)<1000` e `http_req_failed: rate<0.05` do perfil `medium`
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
- Configuração: perfil `light` com override de thresholds — `checks: rate>0.85`, que substitui a chave `checks` do perfil base; o `http_req_duration: p(95)<500` do base é preservado (merge chave a chave)

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
- Configuração: perfil `light` com override de thresholds — `checks: rate>0.85`, que substitui a chave `checks` do perfil base; o `http_req_duration: p(95)<500` do base é preservado (merge chave a chave)

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
- Configuração: perfil `light` com override — `iterations: 1` e thresholds explícitos `checks: rate==1.0`, que substituem a chave `checks` do perfil base; o `http_req_duration: p(95)<500` do base é preservado (merge chave a chave)

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
- **`handleSummary()` adicionado em 17/10/2026** — antes não existia e o script não gerava relatório JSON, o que explicava parte da diferença entre 28 arquivos no artifact e 30 scripts na bateria. Grava `reports/k6-summaries/create_post_flow.json`. A mudança é estritamente aditiva: nenhuma opção, threshold, cenário, `setup` ou `teardown` foi alterado. O nome `'create_post_flow'` segue o padrão snake_case dos scripts que não usam as funções-fábrica (decisão registrada em `UPGRADE_load-tests.md` §4.5)

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

**O que faz:** Teste de estresse combinado com múltiplos cenários executados simultaneamente. É o teste mais robusto e completo da suíte **em intenção de projeto** — nos runs [`38246676774`](https://github.com/caminhar-deus/Caminhar/actions/runs/38246676774) e [`38393117376`](https://github.com/caminhar-deus/Caminhar/actions/runs/38393117376) nenhum dos dois cenários chegou a executar (bug corrigido em 13/10/2026, ver a advertência datada abaixo), e **o run [`38543197931`](https://github.com/caminhar-deus/Caminhar/actions/runs/38543197931) (14/10/2026) foi o primeiro a executar os dois cenários de verdade** — validação datada na seção "Validação" abaixo.

**Propósito (intenção do código — ~~ainda NÃO verificada em execução, mesmo após a correção de 13/10/2026 que só vigora após commit~~ VERIFICADO EM EXECUÇÃO NO RUN `38543197931` DE 14/10/2026):** Simular cenário realista de produção com:
- CRUD de vídeos sob carga crescente (20 → 50 → 100 VUs) — **intenção**: os runs de 12/10 e 13/10/2026 não realizaram nenhuma operação de CRUD; **medido no run nº 11**: 8189 iterações de CRUD com 32756 checks, 0 falhas
- Monitoramento de memória do Node.js durante todo o teste — **intenção**: os mesmos runs não registraram nenhuma leitura de memória; **medido no run nº 11**: `nodejs_memory_rss_bytes` (max 371200000, avg 277641789) e `nodejs_memory_heap_used_bytes` (max 204032264, avg 97267187) presentes no artifact

**Estrutura:**
- **2 cenários paralelos** via `scenarios` do k6. **Correção factual (13/10/2026):** a versão anterior deste documento dizia que "o k6 executa as funções exportadas com os mesmos nomes dos cenários" — isso só acontece quando o cenário declara `exec: '<função>'`. Até 13/10/2026 os cenários do perfil `stress` **não declaravam `exec`** e, sem `exec`, o k6 roda em todo cenário a função `default` exportada pelo script (foi o que causou o bug, corrigido com a adição de `exec:` — ver advertência abaixo):
  1. `stress_test()` — Ramp-up progressivo (20, 50, 100 VUs), executa CRUD completo de vídeos com prefixo `[TEST-K6]` (URL do YouTube com ID de 11 caracteres `st${__VU}x${__ITER}` preenchido com zeros). Se o token do setup não estiver disponível, encerra a iteração silenciosamente (o monitoramento continua). **Não executado nos runs #9 e #10** (bug); **executado de verdade no run #11 (`38543197931`, 14/10/2026)**, com `exec: 'stress_test'` declarado no cenário
  2. `memory_monitor()` — 1 VU constante por 5 min: GET `/api/status`, extrai `body.data.system` e registra as métricas de memória; `sleep(1)` entre leituras. **Não executado nos runs #9 e #10** (bug); **executado de verdade no run #11**, com `exec: 'memory_monitor'` declarado no cenário (300 iterações = 1 VU × `sleep(1)` × 5 min)
- `default()` — Vazia, e **foi exatamente essa vacuidade que fez o script não exercitar nada**: sem `exec:` nos cenários do perfil `stress`, o k6 executava esta `default()` em ambos. A versão anterior afirmava que ela era vazia "porque os cenários nomeados executam via `stress_test()` e `memory_monitor()`" — suposição factualmente errada, e justamente a que escondeu o bug documentado abaixo
- `setup()` — Chama `authSetup()` de `helpers/auth.js`
- `teardown()` — Limpa dados de teste com paginação completa (loop de páginas com `limit=100` até esvaziar), removendo vídeos cujo título contenha `[TEST-K6]`, `K6` ou `Estresse`
- `handleSummary()` — Gera relatório via `generateReport()` com nome `stress-test-combined` + relatório HTML via `htmlReport` (biblioteca `benc-uk/k6-reporter`) em `./reports/k6-summaries/stress-test-combined.html`

> **⚠️ ADVERTÊNCIA (13/10/2026) — BUG COMPROVADO EM 13/10/2026, CORRIGIDO EM 13/10/2026 E VALIDADO EM CI EM 14/10/2026 (este script não testava nada; a partir do run `38543197931` testa).**
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
> **Sem relação com este bug:** os `checks` em 50% (`ip-spoofing-test`) e 33,33% (`ddos-search-test`) são comportamento correto e documentado no próprio código — checks mutuamente exclusivos por status HTTP, em que cada requisição satisfaz exatamente um (o cabeçalho do `ddos-search-test.js` diz que "a soma é 100% e a leitura de um percentual isolado não significa falha"). Os thresholds `ip_rotation_evasion_rate` (0,00%) e `search_block_rate` (99,95%) passaram, e `errors_500` ficou em 0,00%. A regra que vale para toda a suíte está no [ADR-0012](adr/0012-gate-da-suite-k6-por-metrica-propria.md).
>
> **Correção aplicada em 13/10/2026, ~~ainda não exercitada em CI~~ VALIDADA EM CI EM 14/10/2026 PELO RUN [`38543197931`](https://github.com/caminhar-deus/Caminhar/actions/runs/38543197931):** o perfil `stress` de `load-tests/helpers/profiles.js` agora declara `exec: 'stress_test'` no cenário `stress_test` e `exec: 'memory_monitor'` no cenário `memory_monitor` (duas linhas; sem mudança de thresholds nem estágios). ~~A correção está no **working tree — só entra em vigor após commit e push**, então o próximo cron é o primeiro run que a exercita.~~ A correção entrou em vigor antes do run nº 11 (sha `e50de03`), que foi o primeiro run a exercitá-la. Pendência fechada em `docs/PENDENCIAS_scripts_testes.md` (item Z), que traz também o **critério de verificação objetivo** no artifact do próximo run (`checks.passes > 0`; `http_reqs` na casa das dezenas de milhares, hoje eram 3; `stress_iterations` presente, hoje ausente; `nodejs_memory_rss_bytes` presente, hoje ausente) — **cumprido em 14/10/2026 (ver "Validação" logo abaixo)**. Com ela, o teste passa a exercitar de fato 100 VUs contra a app por ~5 min e o cron **pode reprovar legitimamente pela primeira vez** — reprovação de capacidade, não de defeito (previsão detalhada no item Z; no run nº 11 o cron **não** reprovou, porque os thresholds passaram com folga grande).

**✅ VALIDAÇÃO (14/10/2026) — o run [`38543197931`](https://github.com/caminhar-deus/Caminhar/actions/runs/38543197931) foi o run que validou a correção.**

Resultado medido: os 4 critérios do item Z resolveram no estado esperado (o 3º, `stress_iterations`, segue `ausente` — por ser o estado saudável) e os 4 thresholds do perfil `stress` passaram pela primeira vez com amostras de verdade — `checks` **rate 1** (33056 passes / 0 fails), `http_reqs` **24870**, p(95) **3,46 ms** contra limite de 3000 ms, heap usado máx **204 MB** contra 1 GB; a aritmética interna fecha exata (8489 = 300 + 8189 iterações de CRUD) e o cron **não** reprovou. **Fonte primária da evidência** — metadados do run, tabelas dos 4 critérios, dos 4 thresholds, da aritmética interna e os 2 pontos de não-regressão: `docs/PROJECT_load-tests.md`, seção **"Registro de execução — run `38543197931` (cron "Load Tests (k6)" nº 11, 14/10/2026)"**, mais abaixo nesta mesma página. `docs/UPGRADE_load-tests.md` (§4.8) e `docs/PENDENCIAS_scripts_testes.md` (item Z) apenas referenciam esse registro.

**Métricas customizadas:**
- `nodejs_memory_rss_bytes` — Memória RSS (Trend)
- `nodejs_memory_heap_total_bytes` — Heap total (Trend)
- `nodejs_memory_heap_used_bytes` — Heap usado (Trend; threshold: max < 1GB)
- `stress_iterations` — Counter incrementado quando a criação do vídeo falha em uma iteração do cenário de estresse

> **Registro (13/10/2026):** nenhuma dessas métricas teve amostra registrada nos runs [`38246676774`](https://github.com/caminhar-deus/Caminhar/actions/runs/38246676774) e [`38393117376`](https://github.com/caminhar-deus/Caminhar/actions/runs/38393117376) — `stress_iterations` e `nodejs_memory_rss_bytes` nem aparecem nos artifacts, e `nodejs_memory_heap_used_bytes` veio todo em `0` (ver advertência acima). Naqueles runs elas existiam só como declaração no código, não como medição observada. Com a correção de 13/10/2026 (que só vigora após commit), espera-se que passem a registrar de verdade no próximo cron — `pages/api/status.js` devolve `data.system.{rss, heapTotal, heapUsed}`, que é exatamente o que `memory_monitor()` lê, e o threshold `nodejs_memory_heap_used_bytes: ['max<1073741824']` deixa de passar trivialmente por métrica vazia.
>
> **Registro (14/10/2026, run `38543197931` — a expectativa acima se confirmou):** `nodejs_memory_rss_bytes` **presente** (max `371200000`, avg `277641789`) e `nodejs_memory_heap_used_bytes` **presente** (max `204032264`, avg `97267187`) — pela primeira vez com amostras de verdade, e o threshold `max<1073741824` passou com 204 MB de pico. `stress_iterations` **continua ausente**, mas por motivo oposto ao dos runs #9/#10: o `Counter` só incrementa em criação falhada e houve 0 falhas em 32756 checks (ver não-regressão (1) na seção "Registro de execução — run `38543197931`" abaixo). Detalhes e tabelas completas: mesma seção, que é a fonte primária da evidência deste run.

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
- **`handleSummary()` adicionado em 17/10/2026** — antes não gerava relatório JSON; agora grava `reports/k6-summaries/cache_warmup_test.json`. Mudança estritamente aditiva (import + função), sem alterar opções, cenário, thresholds ou `setup()`

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
- Não importa `helpers/auth.js` nem `helpers/profiles.js`
- `helpers/report.js` — `generateReport` (importado em 17/10/2026, com a adição do `handleSummary()`; ver "O que faz" abaixo)

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
- **Não usa `helpers/profiles.js`** — `options` inline. **`handleSummary()` adicionado em 17/10/2026**: grava `reports/k6-summaries/cache_performance_test.json`; mudança estritamente aditiva (import + função), sem alterar opções, thresholds ou `setup()`

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
- **`handleSummary()` adicionado em 17/10/2026** — antes não gerava relatório JSON (o doc o descrevia como "teste leve sem geração de relatório"); agora grava `reports/k6-summaries/health_check.json`. Mudança estritamente aditiva (import + função), sem alterar perfil, VUs ou thresholds

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
- Configuração: perfil `light` com override — `iterations: 1` e thresholds `checks: rate==1.0`, que substituem a chave `checks` do perfil base; o `http_req_duration: p(95)<500` do base é preservado (merge chave a chave)

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
- Monitora rota `/api/posts` que depende estritamente do banco de dados, com `responseCallback: http.expectedStatuses({ min: 200, max: 599 })` (qualquer status conta, sem marcar `http_req_failed`)
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
- Configuração: perfil `light` com override — `iterations: 10` e thresholds `checks` rate==1.0 e `http_req_duration{name:SearchPosts}` p(95)<500ms, avg<200ms. A chave taggeada é distinta do `http_req_duration` do perfil base, então o merge preserva o `p(95)<500` **do perfil** — que é o que o comentário do script pretendia ("complementar, não substitui")
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

Os dois checks são **mutuamente exclusivos** por status HTTP — uma resposta tem um único status, então exatamente um dos dois passa por iteração. **Checks em 50% é o valor esperado**, não sintoma de falha. A regra que vale para toda a suíte está no [ADR-0012](adr/0012-gate-da-suite-k6-por-metrica-propria.md).

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
- Requisição usa `responseCallback: http.expectedStatuses(200, 429)` (status 429 não é computado como falha `http_req_failed`) e tags `{type: ddos_search, name: DDoS_Search}`
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

Os três checks são **mutuamente exclusivos por status HTTP** (uma resposta tem um único status), então a soma é 100% e a leitura de um percentual isolado não significa falha — leia os três juntos. Antes da correção de 09/10/2026, `🛡️ BLOQUEADO` era **inalcançável**; agora é o check que indica a proteção funcionando. A regra que vale para toda a suíte está no [ADR-0012](adr/0012-gate-da-suite-k6-por-metrica-propria.md).

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
1. **Schedule:** execução automática diária agendada para as **04:17 UTC** (`cron: '17 4 * * *'` — o minuto 17 é deliberado, para não disputar o pico de todos os crons de minuto 0; o valor do cron foi **mantido**). **A execução observada não começa nesse horário:** nas 15 execuções agendadas medidas (05–19/10/2026) o atraso foi de +4h19 a +7h46, mediana +6h34 — horas, nunca minutos, e nenhuma execução teve pontualidade aceitável. A causa raiz (fila de agendamento do próprio GitHub) **não foi confirmada**, apenas delimitada por essa evidência. **A tabela completa das 15 execuções e o critério de medição estão no comentário do próprio `.github/workflows/load-tests.yml`, que é a fonte deste dado** — não são replicados aqui.
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
| Bug descoberto na análise (13/10/2026) | A análise do artifact `reports/k6-summaries/stress-test-combined.json` e do log deste run revelou que o script `stress-test-combined` **não executou nenhum teste**: os cenários do perfil `stress` (`stress_test` e `memory_monitor`) não tinham `exec:`, então rodavam a `default()` vazia — 4m50s, **319.813.516 iterações instantâneas**, `checks` com `rate 0 / passes 0 / fails 0`, só 3 `http_reqs` (todas do `setup()`/`teardown()`, todas falhando), métricas `stress_iterations` e `nodejs_memory_rss_bytes` ausentes do artifact e `nodejs_memory_heap_used_bytes` todo em `0`. Ou seja, **o verde deste run (e o `✅ stress-test-combined: PASS`) não cobre o que o nome do script sugere** — os thresholds passaram por falta de amostras, não por desempenho. **Reprodução idêntica no run [`38393117376`](https://github.com/caminhar-deus/Caminhar/actions/runs/38393117376)** (cron nº 10, 13/10/2026, sha `7590120`, ainda no código antigo): mesmas métricas zeradas/ausentes, 196.425.737 iterações em 4m50s, bateria 30/30 passed — dois SHAs e dois dias com o mesmo resultado prova que o defeito é determinístico. **Bug corrigido em 13/10/2026** (`exec:` adicionado aos dois cenários do perfil `stress`), ~~**ainda não exercitado em CI**~~ **validado em CI em 14/10/2026 pelo run [`38543197931`](https://github.com/caminhar-deus/Caminhar/actions/runs/38543197931) (cron nº 11, sha `e50de03`, `success`, bateria 30/30) — ver a seção "Registro de execução — run `38543197931`" logo abaixo (fonte primária da evidência)** — e `docs/PENDENCIAS_scripts_testes.md` (item Z, **fechado e confirmado**). |

---

### Registro de execução — run [`38543197931`](https://github.com/caminhar-deus/Caminhar/actions/runs/38543197931) (cron "Load Tests (k6)" nº 11, 14/10/2026)

Registro datado da execução que **validou a correção do `stress-test-combined`** (item 4.8 do `docs/UPGRADE_load-tests.md` e item Z de `docs/PENDENCIAS_scripts_testes.md`):

| Campo | Valor medido |
|-------|--------------|
| Run / SHA | `38543197931` / `e50de03` |
| Event / conclusion | `schedule` (cron `17 4 * * *`) / **`success`** |
| Job `load-tests / run-tests` | `09:33:18Z` → `09:51:19Z` = **18m01s** |
| Bateria | **30/30 passed, 0 failed, 0 skipped** (Performance 17/17, Functional 9/9, Security 4/4) — recorte da época: a partir do próximo run o corte por categoria é **16/9/4/1**, com o `stress-test-combined` em categoria própria (`🔥 Stress Tests`), ver "Ordem de execução" abaixo |
| Início vs cron | `created_at` `09:33:18Z` = **06:33 BRT**, **+5h16** após o cron de 04:17 UTC — o menor atraso medido **até este run** (a faixa completa, medida nos 13 runs agendados de #1 a #14, está no registro dos runs #12–#14 abaixo e no comentário de `.github/workflows/load-tests.yml`); **ainda não é madrugada e a decisão de manter o cron não muda** (ver item 1 da seção `load-tests.yml` acima) |
| O que validou | Primeiro run com `exec: 'stress_test'` e `exec: 'memory_monitor'` em vigor: os 4 critérios de verificação do item Z resolvidos no estado esperado (o 3º, `stress_iterations`, segue `ausente` — por ser o estado saudável) e os 4 thresholds do perfil `stress` passaram com **amostras reais** — tabelas, aritmética e não-regressão **nesta mesma seção, logo abaixo** |
| Observação registrada | Diferença de p95 entre o run #9 e o #11 nos scripts posteriores ao `stress-test-combined` — **hipótese NÃO confirmada**; tabela completa, contraprova e o experimento **aplicado em 14/10/2026** (stress movido para o fim, agora #30) na observação datada da seção do orquestrador abaixo; registro da pendência em `docs/PENDENCIAS_scripts_testes.md`, **item AB** |

**Evidência do run (fonte primária — `docs/UPGRADE_load-tests.md` §4.8 e `docs/PENDENCIAS_scripts_testes.md` item Z trazem só status + 1 linha de resultado e apontam para cá):** dados medidos do artifact `reports/k6-summaries/stress-test-combined.json`, não estimados.

**Os 4 critérios de verificação — runs #9/#10 (bug) contra o run #11 (corrigido):**

| # | Critério | Runs #9/#10 (bug) | Run #11 (corrigido) | Resultado |
|---|---|---|---|---|
| 1 | `checks.passes > 0` | `rate: 0`, `passes: 0`, `fails: 0` | **`rate: 1`, `passes: 33056`, `fails: 0`** | ✅ atendido |
| 2 | `http_reqs.count` na casa das dezenas de milhares | `count: 3` | **`count: 24870`** | ✅ atendido |
| 3 | `stress_iterations` presente | ausente | **ausente** | ✅ atendido na essência — **com correção do critério original** (o `Counter` só incrementa em criação falhada), ver não-regressão (1) |
| 4 | `nodejs_memory_rss_bytes` presente | ausente | **presente**: max `371200000`, avg `277641789` | ✅ atendido |
| — | `nodejs_memory_heap_used_bytes` (sinal adicional, fora dos 4 critérios) | todo `0` | **presente**: max `204032264`, avg `97267187` | ✅ |

**Os 4 thresholds do perfil `stress` — pela primeira vez avaliaram amostras de verdade:**

| Threshold | Medido no run #11 | Limite | ok |
|---|---|---|---|
| `checks{scenario:stress_test}` `rate>0.95` | `1` (32756 passes, 0 fails) | 0,95 | ✅ |
| `http_req_duration{scenario:stress_test}` `p(95)<3000` | **3,46 ms** — completo: avg 2,39 ms, med 2,29 ms, p(90) 3,08 ms, p(95) 3,46 ms, max 37,29 ms (100 VUs de CRUD contra a app) | 3000 ms | ✅ |
| `http_req_failed{scenario:stress_test}` `rate<0.10` | `0` (24567 requisições, todas OK) | 0,10 | ✅ |
| `nodejs_memory_heap_used_bytes` `max<1073741824` | **204 MB** (max `204032264`) | 1 GB | ✅ |

**Aritmética interna — os números batem exatamente (argumento de que o script rodou de verdade):** `iterations` total **8489** = 300 do `memory_monitor` (1 VU × `sleep(1)` × 5 min) + **8189** do `stress_test`; 8189 × 4 checks/iteração (CREATE status, CREATE id, UPDATE, DELETE) = **32756** = `checks{scenario:stress_test}`; 300 × 1 check = 300, e 32756 + 300 = **33056** = `checks`; requisições 8189 × 3 (POST/PUT/DELETE) + 300 (GET `/api/status`) + 1 (login do `setup()`) + 2 (paginação do `teardown()`) = **24870** = `http_reqs`; contagem de `http_req_failed{scenario:stress_test}` = **24567** = 8189 × 3.

**Dois pontos de não-regressão (estados que nos runs #9/#10 eram sintoma do bug e agora são os saudáveis):**
1. **`stress_iterations` ausente = saudável, não regressão.** O `Counter` só incrementa quando a criação do vídeo falha (`if (!createCheckPassed || !videoId) { StressIterations.add(1); return; }`, `load-tests/performance/stress-test-combined.js:91-94`); com 32756 checks e **0 falhas** o caminho de erro nunca foi alcançado. Nos runs defeituosos a ausência era sintoma do bug (função vazia); no run corrigido ela significa que **todas as criações passaram** — quem comparar apenas "ausente = ausente" entre os dois artefacts chega à conclusão errada. Por isso o critério original (3) foi **reescrito**: ele previa a métrica como se contasse iterações, mas ela conta **falhas de criação**.
2. **`teardown` sem a linha `🧹 Teardown: N vídeos removidos` = correto.** O log do run #11 não tem nenhuma linha desse tipo, e não é problema: o `stress_test` faz DELETE dentro de cada iteração (CREATE → UPDATE → DELETE, com os 3 checks passando), então não sobra resíduo com prefixo `[TEST-K6]` para o `teardown` apagar. A função só loga quando `totalDeleted > 0` (`stress-test-combined.js:188-190`); as 2 `http_reqs` de paginação correspondem à página 1 (vídeos que não casaram os prefixos de teste) e à página 2 (vazia — o loop quebra em `videos.length === 0`).

**Também medido:** o cron **não** reprovou. A "reprovação legítima" prevista em 13/10/2026 (pela whitelist de loopback do `checkRateLimit`, que deixaria as mutações ilimitadas na CI) é possibilidade futura, não o que ocorreu: os quatro thresholds passaram com dados reais e folga grande (p95 de 3,46 ms contra limite de 3000 ms; 0 falhas em 24567 requisições de mutação).

### Registro de execução — runs [`38711048683`](https://github.com/caminhar-deus/Caminhar/actions/runs/38711048683), [`38877864558`](https://github.com/caminhar-deus/Caminhar/actions/runs/38877864558) e [`39017995354`](https://github.com/caminhar-deus/Caminhar/actions/runs/39017995354) (cron "Load Tests (k6)" nº 12, 13 e 14, 15–17/10/2026)

Os três runs são homogêneos — 30/30 passed, nenhum step falho — e estão registrados juntos porque o que eles prodzem de novo é a **primeira amostra de 3 execuções** do experimento do **item AB** (o `stress-test-combined` movido para o fim da bateria em 14/10/2026). Valores medidos nos artifacts `k6-load-test-reports` (IDs 11961428110, 12037400326 e 12095977407) e na API pública do GitHub; nada aqui é estimado.

| Campo | Run #12 | Run #13 | Run #14 |
|-------|---------|---------|---------|
| Run / SHA | `38711048683` / `0e912d3` | `38877864558` / `1d9a24f` | `39017995354` / `646ac92` |
| Event / conclusion | `schedule` / **`success`** | `schedule` / **`success`** | `schedule` / **`success`** |
| Job `load-tests / run-tests` | `09:10:59Z` → `09:28:59Z` = **18m00s** | `09:03:47Z` → `09:21:45Z` = **17m58s** | `08:36:26Z` → `08:54:34Z` = **18m08s** |
| Bateria (step `Run Tests`) | **16m29s** | **16m37s** | **16m39s** |
| Bateria | **30/30 passed**, 0 failed, 0 skipped — Performance 16 + Functional 9 + Security 4 + **Stress 1** | idem | idem |
| Artifact | 43.660 B, 28 arquivos | 43.704 B, 28 arquivos | 43.638 B, 28 arquivos |
| Steps `skipped` | `Audit Dependencies`, `Upload Coverage Output/HTML` | idem | idem |
| `created_at` vs cron `04:17` UTC | **+4h53** (06:10 BRT) | **+4h46** (06:03 BRT) | **+4h19** (05:36 BRT) — **menor atraso já medido** |

O timeout de 60 min seguiu folgado: o job mais longo (#14, 18m08s) usou **30%** dele. Nenhum run teve step `failure`, e `security:check-sql`, `setup-db`, `build-app` e `setup-k6` saíram verdes nos três.

**Experimento do item AB — 3 amostras pós-mudança (o critério de decisão declarado era "se a degradação dos scripts seguintes sumir, a hipótese do banco se sustenta"):**

Comparação do p95 de cada script contra o run #11 (baseline, quando o `stress-test-combined` ainda era o #17 e contaminava tudo que vinha depois), nos 3 runs em que ele já é o #30. Grupo "tratado" = scripts que no #11 rodavam **depois** dele; grupo "controle" = scripts que rodavam **antes** (não são afetados pela hipótese e servem de referência de ruído do runner).

| Grupo | n | mediana | faixa |
|---|---|---|---|
| Tratado (rodavam depois do stress no #11) | 30 | **−5%** | −50% .. +30% |
| Controle (rodavam antes no #11) | 39 | **+8%** | −14% .. +58% |

**Leitura — evidência parcial, NÃO fecha o item como confirmado.** A separação vai na direção que a hipótese previa (tratado ~13 pontos melhor que controle), mas o critério declarado era "a degradação **sumiu**", e ela não sumiu: 9 das 30 medidas do grupo tratado continuam positivas, e o próprio grupo controle **subiu** de mediana (+8%), o que indica deriva de runner entre execuções e não apenas efeito do stress. Com 3 amostras e ruído por script de −50% a +58%, efeito de ~13 pontos não separa experimento de ruído. **A mudança de ordem permanece aplicada** (é a ordem correta independentemente do resultado — o script destrutivo não deveria contaminar a medição dos outros) e o **item AB continua ABERTO**, aguardando mais amostras. As 2 execuções que eram contraprova na versão de 14/10/2026 agora são 5.

**Outlier do run #14 — p95 do `stress-test-combined` de 3,40 ms para 24,91 ms, e NÃO é atribuível ao código.** Os três runs fizeram o mesmo trabalho (8432–8510 iterações, 32828–33140 checks, 100% de aprovação, zero erro de rede) e o checkout é o mesmo `ubuntu24/20261012.334`. A assinatura do outlier é de cauda, não de geral: no #14 a **mediana ficou mais rápida** (1,82 ms contra 2,24 ms) e o p90 ficou igual (3,29 contra 3,03), enquanto `avg` saltou de 2,34 para 8,34 e o `max` de 90 para 850 ms. Duas hipóteses foram testadas e **descartadas por medição**: (a) *stall de checkpoint do Postgres* — os dois runs têm um checkpoint longo caindo dentro da janela do stress (#13: 46,6 s; #14: 51,5 s), então a duração dele não distingue os casos; (b) *regressão de código do commit `646ac92`* — o commit toca `lib/infra/storage.js`, `pages/api/upload-image.js` e `pages/api/uploads/[...path].js`, nenhum deles no caminho do stress (CRUD de vídeos). **O fator de confusão que sobra é o runner: o #13 rodou em `Region: eastus` e o #14 em `Region: mexicocentral`** (mesma imagem, provedor Azure diferente), que é causa conhecida de cauda de latência em runner hospedado compartilhado. Conclusão registrada: **atribuição inconclusiva, sem regressão estabelecida** — o próximo cron que rodar em `eastus` é o que fecha a questão, e o critério é p95 do stress abaixo de 5 ms.

### Achados de observação nos runs #12–#14 (não são falha funcional; 2 foram corrigidos em 17/10/2026)

1. **`checks` agregado não é interpretável em 2 scripts de segurança.** `ip-spoofing-test` fecha em **50,00%** (126868 passes / 126868 fails) e `ddos-search-test` em **33,33%**, porque declaram checks *inversos* entre si — um afirma "🛡️ BLOQUEADO (429)" e o outro "EVASÃO CONFIRMADA: não bloqueou (401)" —, de modo que exatamente um dos dois pode passar por iteração. **Não é falso verde:** os dois scripts não declaram threshold `checks` justamente por isso, e o veredito vem de métricas próprias, que passaram com folga — `search_block_rate` 99,92% / 99,94% / 99,94% (limite `rate>0.50`) e `ip_rotation_evasion_rate` 0,0052% / 0,0041% / 0,0039% (limite `rate<0.05`). O risco é prospectivo: quem adicionasse `checks: ['rate==1.0']` a qualquer um dos dois reprovaria para sempre.
2. **4 dos 30 scripts não gravavam relatório** — `cache-warmup-test`, `cache-performance-test`, `create-post-flow` e `health-check` não tinham `handleSummary`, o que explica 28 arquivos para 30 scripts: os números deles existiam só no log do job, que expira junto com o run. **Corrigido em 17/10/2026.**
3. **JWT do admin semeado vazando no artifact** — 9 dos 27 JSON por artifact carregavam `setup_data`; 7 vinham saneados (`{"token": "*** TOKEN OCULTO ***"}`) e **2 vazavam o token em texto claro** (`musicas_load_test.json` e `videos_load_test.json`). Causa: `sanitizeToken` (`load-tests/helpers/report.js:14`) só cobre o caminho `data.setup_data.token`, mas `createLoadSetup` (`load-tests/helpers/resource-test-runner.js:536`) retorna `loginRes.json('data.token')` — uma **string crua**, forma que o sanitizador nunca alcançava. Risco prático baixo (o `JWT_SECRET` é secret do repo e o Postgres do runner é efêmero), mas é credencial em artefato baixável por qualquer pessoa durante a retenção de 30 dias. **Corrigido em 17/10/2026.**
4. **23 dos 30 scripts não têm threshold efetivo de `http_req_failed`** (contagem por artifact, não por código: 7 têm, 23 não). O silêncio vem de `checks`, que cobre as requisições verificadas, mas uma requisição **sem check** passa em branco. Caso medido: `musicas-search-test` fez 7 requisições, 1 falhou (14,28% de `http_req_failed`) e nenhum check cobre aquela requisição — o threshold `checks: ['rate==1.0']` passou mesmo assim. Em `video-validation-test` os 50% de `http_req_failed` são as duas respostas 400 intencionais (`Domínio Inválido`, `URL Malformada`), ou seja, corretos. **A causa-raiz e o plano de correção estão no item AD** de `docs/PENDENCIAS_scripts_testes.md` — a contagem e a lista de scripts não se repetem aqui.

### Registro de execução — runs [`39113170891`](https://github.com/caminhar-deus/Caminhar/actions/runs/39113170891) e [`39233955292`](https://github.com/caminhar-deus/Caminhar/actions/runs/39233955292) (cron "Load Tests (k6)" nº 15 e 16, 18–19/10/2026)

Os dois runs são a **validação em produção da Fase 0** do plano de gates: o #15 reprovou por um erro de configuração, e o #16 é a primeira execução que exercita a correção. Registrados juntos porque o que o #16 prova só se entende contra o #15.

| Campo | Run #15 | Run #16 |
|-------|---------|---------|
| Run / SHA | `39113170891` / `b370773` | `39233955292` / `27dc56d` |
| Event / conclusion | `schedule` / **`failure`** | `schedule` / **`success`** |
| Job `load-tests / run-tests` | `08:53:08Z` → `08:54:30Z` = **1m22s** | `09:57:50Z` → `10:16:06Z` = **18m16s** |
| Onde parou | Step 9 `grafana/setup-k6-action` → **`failure`**; step 10 `Run Tests` → `skipped` | Todos os steps verdes |
| Bateria | **não executou** — nenhum script rodou | **30/30 passed**, 0 failed, 0 skipped (16 + 9 + 4 + 1), **16m36s** |
| Artifact | **vazio** (0 arquivos) | `k6-load-test-reports`, 49.940 B, **32 arquivos** (antes 28) |
| `created_at` vs cron | `2026-10-18T08:53:05Z` = 05:53 BRT = **+4h36** | `2026-10-19T09:57:47Z` = 06:57 BRT = **+5h40** |
| Região do runner | `westus3` | `westus` |

**O #15 reprovou por um erro de um caractere, e ele é instructive.** O step 9 recebeu `k6-version: 'v2.3.0'`, mas a action **prefixa `v`**: montou `releases/download/vv2.3.0/k6-vv2.3.0-linux-amd64.tar.gz` e recebeu `##[error]Unexpected HTTP response: 404`. A correção é `'2.3.0'`, que é o formato do próprio README da action (`k6-version: '0.49.0'`). O run durou 1m22s porque reprovou no setup: **`Run Tests` ficou `skipped` e o artifact veio vazio**, ou seja, nenhuma das correções da Fase 0 chegou a ser exercitada. O valor correto está confirmado nos logs dos runs #13 e #14, que imprimem `Downloading k6 version 2.3.0` — pinar em `2.3.0` não altera nenhum comportamento já medido.

**O #16 validou a Fase 0 nos três critérios de pronto**, medidos no artifact (não no código):

| Critério | Esperado | Medido no #16 |
|---|---|---|
| `ddos_search_test.json` → `http_req_failed` | perto de 0 | **0,00%** — 117231 amostras, 0 falhas (era **99,94%**) |
| `recovery_test.json` → `recovery_unhealthy_rate` | presente, `ok: true` | presente, rate **0,00%** em 144 iterações, threshold `rate<0.10` → `ok: true` |
| `orchestrator-results.json` | 30/30 | 30/30, 0 failed, 0 skipped |

**A causa do 99,94%** foi a chave `expectedStatuses`, que não é válida no k6 e era descartada em silêncio, fazendo os 429 — o sinal de que a proteção funcionou — contarem como falha. Diagnóstico e decisão: [`adr/0012`](adr/0012-gate-da-suite-k6-por-metrica-propria.md).

**Footprint exato da Fase 0, verificado por comparação de thresholds:** o campo `metrics.*.thresholds` do #14 e do #16 difere em **um único arquivo** — `recovery_test.json` passou de `[]` para `['rate<0.10']`. Nenhum outro threshold foi alterado, adicionado ou perdido em toda a suíte.

**Ganhos colaterais confirmados no mesmo run:**
- **JWT não vaza mais.** 12 arquivos com `setup_data`, todos com o marcador `*** TOKEN OCULTO ***` — incluindo `musicas_load_test.json` e `videos_load_test.json`, que eram exatamente os 2 que publicavam o token em texto claro, e mais `cache_performance_test.json`.
- **Os 4 `handleSummary` novos gravaram relatório** — `cache_warmup_test.json`, `cache_performance_test.json`, `create_post_flow.json` e `health_check.json`. É a razão de 28 → 32 arquivos.
- **k6 pinado e instalado**: `Downloading k6 version 2.3.0`.
- **Gates de segurança verdes**: `search_block_rate` 99,91% (limite 50%), `errors_500` 0,00% (limite 50%), `ip_rotation_evasion_rate` 0,0055% (limite 5%).
- **Demais workflows no mesmo SHA**: 4 workflows, 6 check runs, todos `success`.

---

### Registro de execução — run [`39400845626`](https://github.com/caminhar-deus/Caminhar/actions/runs/39400845626) (cron "Load Tests (k6)" nº 17, 20/10/2026)

Segunda medição da Fase 0, com o **mesmo código** do run #16 — o único commit entre os dois (`4fa0d25`) trata de catálogo de modelos e não toca a suíte k6. O objetivo era confirmar que o estado validado no #16 é **estável**, e não apenas verde uma vez.

| Campo | Valor medido |
|-------|--------------|
| Run / SHA | `39400845626` / `4fa0d25` |
| Event / conclusion | `schedule` (cron `17 4 * * *`) / **`success`** |
| Job `load-tests / run-tests` | `09:27:53Z` → `09:46:08Z` = **18m15s** |
| Bateria | **30/30 passed**, 0 failed, 0 skipped (16 + 9 + 4 + 1), **16m38s** |
| Steps | todos verdes; nenhum `failure` e **nenhum warning** no job |
| Artifact | `k6-load-test-reports`, 49.913 B, **32 arquivos** |
| `created_at` vs cron | `2026-10-20T09:27:50Z` = 06:27 BRT = **+5h10** |
| Região do runner | **`westus2`** — quinta região em cinco runs medidos |
| k6 | `Downloading k6 version 2.3.0` — o pin do run #15 está correto em produção |

**Os três critérios da Fase 0, reconfirmados no artifact:**

| Critério | #16 | #17 |
|---|---|---|
| `ddos_search_test.json` → `http_req_failed` | 0,00% (117231 amostras) | **0,00%** (121143 amostras) |
| `recovery_test.json` → `recovery_unhealthy_rate` | 0,00% em 144 iterações, `ok: true` | **0,00%** em 156 iterações, `ok: true` |
| `orchestrator-results.json` | 30/30 | **30/30** |

Gates de segurança: `search_block_rate` 99,92% (limite 50%), `errors_500` 0,00% (limite 50%), `ip_rotation_evasion_rate` 0,0053% (limite 5%). Sanitização do token: 12 arquivos com `setup_data`, **nenhum** vazando. Thresholds efetivos de `http_req_failed`: **7 de 30** — exatamente os mesmos 7 do #16, o que confirma que nada foi alterado nem perdido entre as duas execuções.

**Estabilidade medida (#16 → #17):** p95 mediano **−11%**, spread mediano de **1,12x** (faixa 1,01x–1,41x) entre os dois runs, contra 1,08x–1,83x na série de 4 runs anterior. Nenhum check falhou em nenhum dos 26 scripts de ambos os runs, e o `stress-test-combined` ficou em 3,73 ms — colado nos 3,24/3,40/3,85 ms dos runs normais e longe dos 24,91 ms do outlier do #14.


---

### Registro de execução — run [`39576629604`](https://github.com/caminhar-deus/Caminhar/actions/runs/39576629604) (cron "Load Tests (k6)" nº 18, 21/10/2026)

**Primeira execução com a Fase 1 do item AD no ar** — este run é o que valida em produção a correção do `getProfile` (merge de thresholds) e, principalmente, o **piloto** do gate de `http_req_failed` que a Fase 2 usou para calibrar limites — desfecho que divergiu do plano original (ver "Fase 2 do item AD" abaixo).

| Campo | Valor medido |
|-------|--------------|
| Run / SHA | `39576629604` / `8790444` (commit da Fase 1) |
| Event / conclusion | `schedule` (cron `17 4 * * *`) / **`success`** |
| Job `load-tests / run-tests` | `09:23:53Z` → `09:41:52Z` = **17m59s** |
| Bateria | **30/30 passed**, 0 failed, 0 skipped, **16m35s** |
| Artifact | `k6-load-test-reports`, 50.010 B, **32 arquivos** |
| `created_at` vs cron | `2026-10-21T09:23:51Z` = 06:23 BRT = **+5h06** |
| Região do runner | **`westus3`** — sexta região em seis runs medidos |
| k6 | `Downloading k6 version 2.3.0` |
| Steps | todos verdes; **nenhum warning** e nenhum erro no job |

**O piloto — os 2 gates novos de `http_req_failed`, herdados do perfil `medium`:**

| Script | `http_req_failed` medido | Threshold | ok |
|---|---|---|---|
| `musicas_load_test` | **0,00%** (68 requisições) | `rate<0.05` | **true** |
| `videos_load_test` | **0,00%** (133 requisições) | `rate<0.05` | **true** |

Estes são os **primeiros gates de taxa de erro sobre requisições** que esses dois scripts tiveram: antes herdavam apenas o threshold taggeado de latência. Passaram com folga total, o que é o dado que a Fase 2 usou para calibrar o gate sem copiá-lo de um perfil — e o dado que faz o gate ser **medido** em vez de presumido. (O desfecho da Fase 2 não foi "escalar o gate aos outros 22 scripts": ver a seção da Fase 2 abaixo.)

**Todos os thresholds da suíte, avaliados um a um no artifact: 80 no total, 80 `ok`, 0 falharam.** O footprint da Fase 1 em produção é exatamente o previsto: os **13 thresholds recuperados** estão presentes e passaram, nenhum threshold foi removido, e a contagem de scripts com `http_req_failed` efetivo saiu de **7 para 9 de 30** (os 2 de carga), com 21 sem.

| Verificação | Resultado |
|---|---|
| `ddos_search_test` → `http_req_failed` | 0,00% (130175 amostras), sem threshold (o `replaceThresholds: true` mantém o comportamento) |
| `ddos_search_test` → `search_block_rate` / `errors_500` | 99,92% (limite 50%) / 0,00% (limite 50%) — ambos `ok` |
| `recovery_test` → `recovery_unhealthy_rate` | 0,00% em 151 iterações, `ok: true` |
| `ip_spoofing` → `ip_rotation_evasion_rate` | 0,0052% (limite 5%) |
| Sanitização do token | 12 arquivos com `setup_data`, **nenhum** vazando |
| Checks falhos | 0 em todos os scripts, exceto os 2 de estado exclusivo (`ddos-search` 33,33% e `ip-spoofing` 50% por construção) |

**Estabilidade (#17 → #18):** p95 mediano **−1%**, spread mediano **1,04x** (faixa 1,00x–2,18x) — a maior estabilidade já observada. O `stress-test-combined` ficou em 3,71 ms (de 3,85), colado na série normal. **Um único outlier, e é benigno:** `search_content_test` teve o p95 de 3,11 para 6,77 ms (+118%), mas a **mediana ficou em 1,20 ms** (era 1,14) e o p90 em 2,36 ms (era 2,78) — a assinatura de **uma requisição isolada** de 13,4 ms, não de degradação geral, e 74x abaixo do limite de 500 ms.

---

### Fase 2 do item AD — aplicada em 21/10/2026, aguardando o cron #19

**O que mudou no código (5 arquivos) e por quê.** A auditoria dos 30 scripts mostrou que a premissa do plano original da Fase 2 ("um gate de `http_req_failed` por script, calibrado por volume") estava errada: **dos 20 scripts que ficam sem gate de taxa, 6 esperam 4xx por desenho e 14 têm `check` de status** — o instrumento certo para "a resposta foi a esperada?". O que faltava na maioria **não era gate de taxa, era `check` onde havia ponto cego** (warm-up e teardown).

| Arquivo | Mudança | Por quê |
|---|---|---|
| `load-tests/performance/musicas-search-test.js` | URL do warm-up com `encodeURIComponent()`; 2 warm-ups com `check` de status | **Bug real e determinístico**: `?search=Graça` mandava o byte UTF-8 cru no request target, e o parser HTTP do Node respondia **400 Bad Request antes de a aplicação** — `http_req_failed` = 0,142857 (1 de 7), **idêntico** nos runs #15, #17 e #18, com a suíte reportando PASS |
| `load-tests/functional/search-content-test.js` | 3 warm-ups capturados + `check` de status | mesmo furo: warm-up sem `check` é invisível para `checks: ['rate==1.0']` |
| `load-tests/performance/musicas-crud-test.js` | `check` na listagem do teardown e em cada delete (200 ou 404) | limpeza que falha deixa lixo "K6" no banco **sem** reprovar a execução |
| `load-tests/performance/videos-crud-test.js` | idem | idem |
| `load-tests/functional/posts-tags-test.js` | `http_req_failed: ['rate<0.20']` | **único script que precisava de gate de taxa**: cada requisição roda 3 checks e, numa resposta 500, só 1 falha (o check de "lista de posts" cai no fallback `[]`, que passa no `Array.isArray`) — até 2 das 5 (40%) poderiam falhar e a execução ainda passaria com `checks: ['rate>0.80']`; com `rate<0.20` a **primeira** falha já reprova (1/5 = 20%) |

**O `http_req_failed` do `musicas-search` era um bug, não ruído.** A taxa de 0,142857 (1 de 7 requisições) medida nos runs #15, #17 e #18 não era variação de runner: era **a mesma requisição** — o warm-up com `?search=Graça` — respondendo 400 antes da aplicação, três runs seguidos. Reproduzido localmente: a URL crua devolve **400**, `Gra%C3%A7a` devolve **200** e `Santo` devolve **200**.

**Calibragem de `http_req_failed` é sempre por taxa — a "contagem absoluta" não existe.** Uma recomendação anterior de calibrar por contagem absoluta (`count<…`) é **impossível**: no k6 v2.3.0, `js/modules/k6/metrics/metric_type.go` devolve `[]string{tokenRate}` para o tipo `Rate` — a métrica `Rate` **só** aceita o token `rate`, e `count` é token de `Counter`. Um `count<` ali **não produziria gate nenhum**, em vez de medir o que se propunha.

**Cobertura travada por teste.** `tests/unit/load-tests/error-gate-coverage.test.js` (11 testes) fixa: (a) a parte estática de toda URL de requisição da suíte é ASCII; (b) os 6 scripts que esperam 4xx por desenho **não** declaram `http_req_failed`; (c) os 4 marcadores de `check` do warm-up/teardown existem nos 4 scripts; (d) o `posts-tags` declara `rate<0.20`; (e) quem declara `http_req_failed` entre os perfis (`light`/`recovery`/`rateLimit` não; `medium`/`heavy`/`health` sim); (f) o inventário tem 30 scripts. **Prova de mutação executada:** as 5 mudanças revertidas uma a uma reprovaram o teste correspondente (5/5), com a suíte restaurada ao final.

**O que esperar no cron #19 (22/10/2026).** `http_req_failed` **com threshold** em **10 dos 30** scripts (os 9 da Fase 1 + `posts_tags`); `musicas_search` com `http_req_failed` = 0/7 (o warm-up agora responde 200); `posts_tags` com 0,00% e 15/15 checks; 30/30 passed. **Conferir no artifact, não no código** — é onde a Fase 1 mostrou que a mentira mora. O registro do #19 fica nesta seção, com o número de thresholds avaliados.

---

### O p95 do `stress-test-combined` era o runner, não o código — questão fechada

O registro dos runs #12–#14 deixou o outlier do #14 como **atribuição inconclusiva**, com duas hipóteses descartadas por medição (stall de checkpoint do Postgres e regressão de código) e um fator de confusão remanescente: a região do runner. O #16 fecha a questão, e o #17 confirma:

| Run | Região | p95 do `stress-test-combined` | avg | max |
|-----|--------|---------------------------|-----|-----|
| #12 | — | 3,24 ms | 2,27 ms | 75,6 ms |
| #13 | `eastus` | 3,40 ms | 2,34 ms | 90,1 ms |
| **#14** | **`mexicocentral`** | **24,91 ms** | 8,34 ms | 849,8 ms |
| #16 | `westus` | 3,85 ms | 2,64 ms | 95,6 ms |
| #17 | `westus2` | 3,73 ms | 2,53 ms | 93,9 ms |
| #18 | `westus3` | 3,71 ms | 2,64 ms | 84,6 ms |

Mesmo código e mesmo número de iterações, −85% no p95 quando a região muda. **Conclusão: o outlier do #14 foi o runner, e não o `stress-test-combined`.** A assinatura era de cauda, não de geral — no #14 a mediana ficou *mais rápida* (1,82 ms contra 2,24 ms) e o p90 ficou igual, enquanto `avg` e `max` dispararam.

**Seis regiões diferentes em seis runs medidos** — `eastus` (#13), `mexicocentral` (#14), `westus3` (#15), `westus` (#16), `westus2` (#17), `westus3` (#18) — e o GitHub não oferece escolha de região em runners hospedados. Consequência operacional que vale para todo o resto da suíte: **latência entre runs deste projeto não é comparável sem anotar a região.** Fora o `stress-test-combined`, o p95 do #16 ficou +5% a +42% sobre o #14 e o do #17 ficou −29% a +10% sobre o #16 (medianas de −11% e spread mediano de 1,12x, faixa 1,01x–1,41x), o que é compatível com a variação de runner — e nenhum check falhou em nenhum dos scripts, em nenhum dos dois runs.

---

### `scripts/run-all-load-tests-sequentially.js`

**Localização:** `/scripts/run-all-load-tests-sequentially.js`

**O que faz:** Script orquestrador que executa TODOS os scripts de teste de carga (k6) sequencialmente, incluindo verificação de thresholds e agregação de resultados.

**Propósito:** Automatizar a execução de todos os 30 scripts em 4 categorias (performance, functional, security, stress), com verificação de servidor, agregação de resultados e limpeza de dados de teste.

**Estrutura:**
- **Verificação de servidor** — Requisição HTTP para `BASE_URL` com timeout de 5s
- **4 categorias:**
  - `🧪 Performance Tests` — 16 scripts
  - `🔍 Functional Tests` — 9 scripts
  - `🔒 Security Tests` — 4 scripts
  - `🔥 Stress Tests` — 1 script (`stress-test-combined`), categoria criada em 14/10/2026 quando o script saiu da Performance para virar o último da bateria (ver "Ordem de execução" abaixo)
- **Cleanup pós-categoria:**
  - Após performance: `node scripts/clean-load-test-posts.js`
  - Após security: `node scripts/clear-test-auth-locks.js`
  - Após stress: **nenhum** — os cleanups são condicionados ao *nome* da categoria (só Performance e Security), e Stress é a última; não há o que limpar depois dela, porque o próprio script apaga os vídeos que cria, iteração a iteração (CREATE → UPDATE → DELETE)
- **Resultados** — Salva em `reports/k6-summaries/orchestrator-results.json`
- **Captura de saída (tee)** — Cada script roda com `stdio: ['inherit', 'pipe', 'pipe']`: a saída é ecoada ao vivo para o terminal (o log do CI não perde nada) e guardada em buffer limitado a **5 MB por script**, com timeout de **10 min** por script; ao estourar o limite, imprime `[⚠️ saída truncada: limite de <N> bytes por script — o restante não é ecoado]`
- **Relatório de falhas** — Só para scripts reprovados: `extractFailureDetails()` de `scripts/lib/k6-output-parser.js` (em `try/catch`, **nunca** decide pass/fail) extrai checks reprovados (com a contagem `↳`), thresholds violados e erros de console; a seção `❌ DETALHES DOS ERROS` é impressa **depois** do banner de totais, apenas se houver falha, e os mesmos detalhes vão para o campo `details` de cada script falho no JSON (scripts aprovados seguem sem `details`)
- **Exit code** — Não-zero se houver falhas
- **Ordem de execução (medição de 14/10/2026 — recorte da época):** ~~os 17 Performance rodam primeiro e o `stress-test-combined` é o **#17 dos 30 scripts** (último da Performance, `scripts/run-all-load-tests-sequentially.js:204`), logo **antes** dos 9 Functional e dos 4 Security~~ **a partir de 14/10/2026 o `stress-test-combined` saiu da categoria Performance e virou o #30 (último dos 30)**, numa 4ª categoria própria: a bateria roda **16 Performance → 9 Functional → 4 Security → 1 Stress**. Motivo (comentário de fonte primária no próprio código, `scripts/run-all-load-tests-sequentially.js:232-267`): o script é o mais destrutivo da bateria — 8189 iterações de CRUD completo, ~24.500 mutações na tabela de vídeos — e rodando no meio dela deixava os scripts seguintes medindo um possivelmente degradado banco. Categoria própria (e não o fim da lista de Security) para não rotular um teste de estresse como "Security" no log nem no relatório. **Preço aceito:** o stress passa a rodar sobre banco já sujo pelos outros 29, então os números *dele* ficam piores — aceitável, porque a medição que importa é a dos outros 29. **Experimento ainda não confirmado** (a hipótese do `autovacuum` segue NÃO confirmada): o próximo run decide — ver a observação datada abaixo e `docs/PENDENCIAS_scripts_testes.md`, item AB

> **⚠️ OBSERVAÇÃO (14/10/2026) — ordem da bateria e p95 dos scripts seguintes: hipótese NÃO confirmada; experimento APLICADO em 14/10/2026. ENCERRADA em 21/10/2026 — degradação não reproduzida em 5 amostras pós-mudança; o encerramento está no fim deste bloco.**
>
> **Medição (fonte primária da evidência — `docs/PENDENCIAS_scripts_testes.md` item AB só registra status e ponteiro):** comparando o p95 do run [`38543197931`](https://github.com/caminhar-deus/Caminhar/actions/runs/38543197931) (#11, primeiro com o stress test de fato executando) com o do run [`38246676774`](https://github.com/caminhar-deus/Caminhar/actions/runs/38246676774) (#9, em que ele não exercitava nada) — ambos medidos quando o `stress-test-combined` **ainda era o #17** da bateria:
>
> | Script (posição na bateria da época) | p95 run #9 | p95 run #11 | Variação |
> |---|---|---|---|
> | `login-negative-test` (depois) | 63,46 ms | 141,67 ms | **+123%** |
> | `ddos-search-test` (depois) | 102,99 ms | 161,26 ms | **+57%** |
> | `rate-limit-test` (depois) | 18,09 ms | 27,55 ms | **+52%** |
> | `ip-spoofing-test` (depois) | 17,83 ms | 27,11 ms | **+52%** |
> | `video-validation-test` (depois) | 48,52 ms | 71,87 ms | **+48%** |
> | `backup-verification-test` (depois) | 57,17 ms | 82,25 ms | **+44%** |
>
> Os 6 acima são todos **posteriores** ao `stress-test-combined` na ordem da bateria da época (4 Security e 2 Functional); os que rodam **antes** dele variaram de **−11% a +12%**, em direção misturada, compatível com ruído de runner compartilhado — o corte na posição #17 é nítido.
>
> **Hipótese (NÃO confirmada):** as 24.567 mutações do stress test deixam tuples mortos / páginas de índice sujas no Postgres sem tempo para o `autovacuum`, e os scripts seguintes medem um banco degradado. **Contraprova que impede tratar isto como defeito confirmado:** são apenas **2 execuções**, em **runner hospedado compartilhado**, e o `login-negative-test` (maior salto) é um teste de login sob carga alta, cujo p95 é naturalmente instável — duas amostras não separam efeito de ruído. Nenhum run reprovou (bateria 30/30 no #11).
>
> **Experimento APLICADO em 14/10/2026 (não é mais "proposto"):** o `stress-test-combined` foi movido para uma **4ª categoria própria** (`🔥 Stress Tests`) no **fim** da bateria e é agora o **#30 dos 30** — os outros 29 passam a medir um banco limpo, e o próximo run é o experimento: se a degradação dos scripts finais **sumir**, a hipótese do banco se sustenta; se **persistir**, era ruído de runner. **A hipótese segue NÃO confirmada até esse run** — encerramento em 21/10/2026, no bloco seguinte. Esta observação é medição + experimento, não defeito estabelecido. Registro da pendência (status, hipótese em resumo e critério de decisão): `docs/PENDENCIAS_scripts_testes.md`, **item AB (RESOLVIDA em 21/10/2026)**. Nenhuma mudança em `load-tests/` nem nos thresholds foi feita — mexeu-se **só** na ordem/categorias do orquestrador.

> **✅ ENCERRAMENTO (21/10/2026) — 5 amostras pós-mudança (#12 a #17): a degradação NÃO foi reproduzida.**
>
> **Medições do experimento** (p95 de cada script contra o run #11, baseline em que o `stress-test-combined` ainda era o #17 da bateria):
>
> | Amostra | Runs | Grupo tratado (rodavam **depois** do stress) | Grupo controle (rodavam **antes**, não afetados pela hipótese) | Separação |
> |---|---|---|---|---|
> | 3 primeiros runs pós-mudança | #12, #13, #14 (15–17/10/2026) — 3 verdes, 30/30 passed | n=30, mediana **−5%**, faixa −50%..+30% | n=39, mediana **+8%**, faixa −14%..+58% | ~13 pontos |
> | 5ª amostra | #17 (20/10/2026) | n=50, mediana **−1%** (30 de 50 medições mais rápidas) | n=65, mediana **+7%** (21 de 65) | 8 pontos |
>
> **Por que isso encerra o item, em quatro pontos:**
>
> 1. **O grupo tratado ficou na mediana do ruído** (−1% na 5ª amostra) — não há degradação mensurável nos scripts que rodam depois do stress.
> 2. **O controle, que a hipótese não atinge, piorou mais** (+7%) que o grupo tratado. Se a degradação viesse das mutações do stress, o controle não poderia piorar: ele roda **antes** delas.
> 3. **A separação encolheu** de ~13 para 8 pontos entre as amostras, na direção esperada se o efeito for ruído.
> 4. **A escala do ruído engole o efeito:** ±50%..+58% por script, em runner hospedado compartilhado — 6 regiões medidas em 6 runs, com o p95 do `stress-test-combined` indo de 3,40 ms a 24,91 ms com o **mesmo código** e o **mesmo número de iterações**.
>
> **Nenhum run reprovou** — as 6 baterias medidas fecharam 30/30 passed; nunca houve impacto funcional, só uma diferença de latência não explicada.
>
> **A 6ª amostra (run #18, 21/10/2026) não repete a comparação tratado/controle** — ela exigiria o baseline do #11 de novo —, mas corrobora o encerramento: p95 mediano da bateria **−1%** contra o #17, spread mediano **1,04x** (faixa 1,00x–2,18x), a maior estabilidade já observada, e o `stress-test-combined` em 3,71 ms, colado na série normal.
>
> **A mudança de ordem PERMANECE APLICADA** (o `stress-test-combined` é o #30 dos 30, na categoria própria `🔥 Stress Tests`), mantida por princípio — um script destrutivo não deve contaminar a medição dos outros 29 — e sem custo medido. Status da pendência: `docs/PENDENCIAS_scripts_testes.md`, item AB (**RESOLVIDA**).

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

5. **Relatórios padronizados** — Todos os 30 scripts da bateria usam `generateReport()` de `helpers/report.js` (direta ou indiretamente via `resource-test-runner.js`) para gerar relatórios JSON em `./reports/k6-summaries/`, com sanitização automática do token JWT. **Até 17/10/2026 isso não era verdade:** 4 scripts (`performance/create-post-flow.js`, `performance/cache-warmup-test.js`, `performance/cache-performance-test.js` e `functional/health-check.js`) não tinham `handleSummary()` e não gravavam relatório nenhum — o que explicava o artifact de 28 arquivos para 30 scripts. O `performance/stress-test-combined.js` é o único que gera também um relatório HTML adicional.

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
