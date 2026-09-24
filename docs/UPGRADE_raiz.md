# Documento de Melhorias — Arquivos da Raiz do Projeto (`/`)

> **Data da análise:** 24/09/2026
> **Objetivo:** Levantamento analítico de possíveis melhorias identificadas nos **38 arquivos** atuais da raiz do projeto. **Nenhuma correção deve ser aplicada** — apenas documentar.
> **Baseado em:** Análise profunda dos arquivos atuais da raiz (24/09/2026), com apoio dos documentos anteriores em `/docs/` e conhecimento do projeto como um todo. Em caso de divergência, prevalece a análise atual.


## Índice

1. [Correções de Código (Bugs)](#1-correções-de-código-bugs)
2. [Segurança](#2-segurança)
3. [Inconsistências Arquiteturais](#3-inconsistências-arquiteturais)
4. [Duplicidade de Código e Arquivos](#4-duplicidade-de-código-e-arquivos)
5. [Manutenibilidade e Padronização](#5-manutenibilidade-e-padronização)
6. [Performance](#6-performance)
7. [Pontos Irrelevantes ou Obsoletos](#7-pontos-irrelevantes-ou-obsoletos)


---

## 1. Correções de Código (Bugs)

### 1.1 Chave de projeto Cypress exposta no `package.json`

**Arquivo:** `/package.json`, linha 28

**Problema:** O script `test:e2e:record` contém a chave de projeto Cypress (`1c15e96c-3b79-4a4d-b2ec-7f0ffa209246`) exposta diretamente no manifesto, em texto claro.

**Impacto:** Qualquer pessoa com acesso ao repositório pode usar essa chave para gravar/consumir o projeto Cypress associado, potencialmente consumindo a cota de gravação ou acessando dados do projeto de CI.

**Sugestão:** Mover a chave para uma variável de ambiente (ex: `CYPRESS_RECORD_KEY`) e referenciá-la no script: `npx cypress run --record --key $CYPRESS_RECORD_KEY`. A chave deve ser rotacionada no painel do Cypress.

**Status:** ✅ Implementado (parcial) — o script `test:e2e:record` passou a referenciar a variável de ambiente (`npm run cypress:run -- --record --key "$CYPRESS_RECORD_KEY"`), removendo a chave do manifesto. A rotação da chave no painel do Cypress permanece pendente.

---

### 1.2 Inconsistência de versão do Node.js entre `package.json` e `README.md`

**Arquivos:** `/package.json` (engines), `/README.md` (cabeçalho)

**Problema:** O `package.json` declara `engines: { node: "24.18.0", npm: "12.0.2" }`, mas o `README.md` informa "Node.js 24.16.0, npm 11.17.0". O `CHANGELOG.md` (v1.0.0) também cita "Node.js 24.15.0".

**Impacto:** Confusão sobre a versão real do runtime; o `engines` do `package.json` é a fonte de verdade para o npm, mas a documentação diverge.

**Sugestão:** Alinhar o `README.md` e o `CHANGELOG.md` à versão declarada no `package.json` (24.18.0 / npm 12.0.2), ou atualizar o `engines` se a versão real for outra.

---

### 1.3 `console.log` de debug no `jest.setup.js`

**Arquivo:** `/jest.setup.js`, linhas 25-26

**Problema:** O setup global executa `console.log('Jest setup running with ES modules')` e `console.log('Node.js version:', process.version)` em **toda** execução de testes.

**Impacto:** Polui a saída dos testes (especialmente com `verbose: true` e `maxWorkers: '50%'`), dificultando a leitura dos resultados e podendo interferir em ferramentas que parseiam a saída do Jest.

**Sugestão:** Remover os `console.log` de debug ou condicioná-los a uma variável de ambiente (ex: `DEBUG`).

---

### 1.4 `jest.teardown.js` — timer de segurança sem limpeza mantinha o processo do Jest vivo

**Arquivo:** `/jest.teardown.js`

**Problema:** O teardown global usa `Promise.race` entre `setImmediate` e um `setTimeout` de segurança de 5s, mas o timer de segurança não era cancelado. Como o `setImmediate` resolve primeiro no fluxo normal, o `setTimeout` de 5s permanecia pendente, mantendo o processo principal do Jest vivo após o fim dos testes e disparando o aviso "Jest did not exit one second after the test run has completed."

**Impacto:** Aviso recorrente no final de toda execução de testes e de cobertura, poluindo os logs e atrasando a saída do processo em ~5s por execução.

**Sugestão:** Guardar o retorno do `setTimeout` e cancelá-lo com `clearTimeout` assim que o `Promise.race` resolver, preservando o timeout como salvaguarda apenas em caso de travamento real do teardown.

**Status:** ✅ Implementado — o `jest.teardown.js` passou a armazenar o timer em `teardownTimeout` e cancelá-lo no `.finally()` do `Promise.race`, eliminando o aviso e a espera de ~5s na saída do Jest.

---

## 2. Segurança

### 2.1 Divergência de limites de rate limit entre `proxy.js` e os endpoints

**Arquivos:** `/proxy.js`, `/pages/api/posts.js`, `/pages/api/musicas.js`, `/pages/api/videos.js`, `/pages/api/dicas.js`, `/pages/api/products.js`

**Problema:** O `proxy.js` limita posts/videos/musicas/products a **30 req/min**, mas os endpoints públicos definem limites diferentes:
- `posts.js`: 100 req/min (com busca) / 300 req/min (sem busca)
- `musicas.js`: 60 req/min
- `dicas.js`: 60 req/min
- `products.js`: 60 req/min
- `videos.js`: usa `checkRateLimit(ip, 'api:public:videos')` **sem limite explícito** (aplica o default da função em `lib/cache/cache.js`, fora do escopo da raiz)

**Impacto:** O proxy é a camada mais restritiva e pode bloquear requisições legítimas que os endpoints permitiriam. A divergência de limites entre camadas gera comportamento imprevisível e dificulta o tuning.

**Sugestão:** Definir uma política única de rate limit por rota, documentada, e alinhar o `proxy.js` com os limites dos endpoints (ou vice-versa). Considerar se o proxy deve ser a camada mais restritiva ou apenas uma proteção grosseira.

**Status:** ✅ Implementado — o `proxy.js` passou a proteger apenas `/api/auth/login`; as rotas públicas de listagem/busca são limitadas exclusivamente nos handlers, eliminando a divergência de limites entre as duas camadas.

---

### 2.2 CORS inconsistente entre grupos de endpoints no `next.config.js`

**Arquivo:** `/next.config.js`

**Problema:** O bloco `/api/:path*` (público) usa a **lista completa** de `ALLOWED_ORIGINS`, enquanto `/api/admin/:path*`, `/api/auth/:path*` e `/api/helper/:path*` usam apenas a **primeira origem** de `ALLOWED_ORIGINS` (`split(',')[0]`).

**Impacto:** Se `ALLOWED_ORIGINS` tiver múltiplas origens, apenas a primeira terá acesso aos endpoints admin/auth/helper. Isso pode quebrar o acesso legítimo de outras origens configuradas, ou ser intencional (restringir admin/auth a uma origem específica) — mas não está documentado.

**Sugestão:** Documentar a intenção (se é restrição proposital) ou unificar o comportamento. Se a intenção for permitir múltiplas origens em todos os grupos, usar a lista completa em todos os blocos.

---

### 2.3 `Access-Control-Allow-Origin` com valor vazio quando `ALLOWED_ORIGINS` não definido

**Arquivo:** `/next.config.js`

**Problema:** Quando `ALLOWED_ORIGINS` não está definido, o header `Access-Control-Allow-Origin` é enviado com valor vazio (`''`).

**Impacto:** Um header CORS vazio pode causar comportamento imprevisível em navegadores (alguns tratam como ausente, outros como origem inválida). Melhor não enviar o header quando não houver origem configurada.

**Sugestão:** Condicionar o envio do header CORS à existência de `ALLOWED_ORIGINS`, ou usar um valor padrão seguro (ex: não enviar o header).

---

## 3. Inconsistências Arquiteturais

### 3.1 `README.md` desatualizado em relação à estrutura real

**Arquivo:** `/README.md`

**Problema:** O README informa "28 arquivos" na raiz e "53 arquivos" em páginas, mas a análise atual identifica **38 arquivos** na raiz e **42** em páginas. O README também cita `generateTokensCSS.js` e Design Tokens (11 arquivos) que foram **removidos** do projeto.

**Impacto:** Documentação desatualizada que induz a erro novos desenvolvedores sobre a estrutura real do projeto.

**Sugestão:** Atualizar o README com as contagens corretas (38 raiz, 42 páginas) e remover referências a arquivos que não existem mais (`generateTokensCSS.js`, tokens JS).

**Status:** ✅ Implementado (parcial) — a seção **Dados** do `README.md` foi atualizada para refletir o novo baseline de migrações (16 tabelas, 16 migrações versionadas 000-016 e instrução de instalação limpa via `000-create-base-schema`), acompanhando as implementações em `scripts/migrations/`. As contagens de raiz/páginas (28 vs 38; 53 vs 42) e as referências a `generateTokensCSS.js`/Design Tokens permanecem abertas.

---

### 3.2 `proxy.js` — lógica de IP duplicada com `lib/api/helpers.js`

**Arquivo:** `/proxy.js`

**Problema:** O `proxy.js` reimplementa a lógica de extração de IP (`x-forwarded-for` + `request.ip` + normalização de localhost) que já existe em `lib/api/helpers.js` (`getClientIP`/`detectSpoofedIP`).

**Impacto:** Duplicidade de lógica de segurança; se a estratégia de detecção de IP evoluir (ex: confiar em `request.ip` em produção), o proxy pode divergir dos endpoints.

**Sugestão:** Avaliar se o `proxy.js` pode reutilizar a lógica de `lib/api/helpers.js` (respeitando as limitações do ambiente Edge/Middleware do Next.js, que pode não ter acesso a todas as funções da lib).

**Status:** ✅ Implementado — o `proxy.js` passou a importar e utilizar `detectSpoofedIP()` de `lib/api/helpers.js` com `strictMode=true` para detecção de spoofing antes do rate limit. A lógica de extração de IP para rate limit permanece específica do middleware (necessária para compatibilidade com o ambiente Edge do Next.js), mas a detecção de spoofing agora é centralizada na lib.

---

## 4. Duplicidade de Código e Arquivos

### 4.1 Arquivos `estrutura.*` redundantes na raiz

**Arquivos:** `/estrutura.html`, `/estrutura_extras.html`, `/estrutura.txt`, `/estrutura_extras.txt`, `/estrutura_isolados.html`, `/estrutura_isolados.txt`

**Problema:** São 6 artefatos de análise estática do `dependency-cruiser` (~1.1 MB cada HTML, ~340 linhas cada TXT) que não fazem parte do código-fonte nem do build. `estrutura_extras.txt` é quase idêntico a `estrutura.txt` (diferença: inclui `backups.js → scripts/backup.js` e sub-dependências). `estrutura_isolados.*` foge em código isolado (sem dependências entrantes).

**Impacto:** Poluem a raiz, aumentam o tamanho do repositório e podem desatualizar. `estrutura_extras.txt` é redundante com `estrutura.txt`.

**Sugestão:** Remover os 6 arquivos ou movê-los para `reports/` (que já é ignorado pelo ESLint e pelo Git). Manter apenas um formato (HTML ou TXT) se necessário.

---

### 4.2 `tree.txt` — snapshot estático desatualizado

**Arquivo:** `/tree.txt`

**Problema:** Snapshot da estrutura de diretórios (38 raiz, 46.264 sub-pastas/arquivos) que tende a desatualizar rapidamente.

**Impacto:** Informação desatualizada; o arquivo já difere da estrutura real.

**Sugestão:** Remover ou adicionar um script para gerá-lo dinamicamente (`npm run generate-tree`), ou documentar que é um snapshot de referência.

---

### 4.3 `schema.knip.json` — schema local grande

**Arquivo:** `/schema.knip.json` (1113 linhas)

**Problema:** Schema JSON do Knip embutido localmente, usado apenas como `$schema` do `knip.json` para validação no editor.

**Impacto:** Arquivo grande na raiz que pode ser substituído pela referência ao schema oficial online.

**Sugestão:** Substituir `"$schema": "./schema.knip.json"` por `"$schema": "https://json.schemastore.org/knip.json"` e remover o arquivo local.

---

### 4.4 Arquivos de configuração do Dependency Cruiser — múltiplos arquivos .cjs

**Arquivos:** `/home/gus/Projetos/Caminhar/.dependency-cruiser.cjs`, `/home/gus/Projetos/Caminhar/.dependency-cruiser.core.cjs`, `/home/gus/Projetos/Caminhar/.dependency-cruiser.extras.cjs`, `/home/gus/Projetos/Caminhar/.dependency-cruiser.isolados.cjs`

**Problema:** São 4 arquivos de configuração do dependency-cruiser, cada um com regras e contextos diferentes:
- `.dependency-cruiser.cjs`: configuração principal (regras genéricas)
- `.dependency-cruiser.core.cjs`: contexto CORE (valida pages, components, lib, hooks, data, utils, mocks, tests)
- `.dependency-cruiser.extras.cjs`: contexto EXTRAS (valida arquivos extras/legacy)
- `.dependency-cruiser.isolados.cjs`: contexto ISOLADOS (valida código isolado)

**Impacto:** Manutenção distribuída em múltiplos arquivos; risco de regras contraditórias ou duplicadas entre configs.

**Sugestão:** Avaliar se a lógica pode ser consolidada em um único arquivo com múltiplos contextos ou se a separação atual é deliberada e deve ser mantida com documentação clara.

---

## 5. Manutenibilidade e Padronização

### 5.1 Proliferação de arquivos grandes na raiz

**Arquivos:** `schema.knip.json` (1113 linhas), `skills-lock.json` (~945 linhas), `tree.txt` (38+46k linhas referenciando sub-pastas), `package-lock.json` (~602 KB), `estrutura.html`/`estrutura_extras.html`/`estrutura_isolados.html` (~1.1 MB cada), `estrutura.txt`/`estrutura_extras.txt`/`estrutura_isolados.txt` (~340 linhas cada)

**Problema:** A raiz concentra muitos arquivos grandes que não são código-fonte da aplicação.

**Impacto:** Dificulta a navegação e a identificação dos arquivos essenciais.

**Sugestão:** Mover artefatos de ferramentas para subpastas apropriadas: `skills-lock.json` → `.agents/`, `schema.knip.json` → remover (usar schema online), `estrutura.*` → `reports/`, `tree.txt` → remover ou gerar dinamicamente.

---

### 5.2 `skills-lock.json` na raiz

**Arquivo:** `/skills-lock.json`

**Problema:** Lockfile de skills de IA (~945 linhas) na raiz, sem relação com o código da aplicação.

**Impacto:** Polui a raiz; é um artefato de ferramenta de IA.

**Sugestão:** Mover para `.agents/` ou `config/`, mantendo a raiz enxuta.

---

### 5.3 `ci.yml` — workflow básico alternativo ao padrão adotado

**Arquivo:** `/ci.yml`

**Problema:** Workflow de CI simples (checkout → setup node → install → lint → test) que replica parte da funcionalidade de workflows mais completos já existentes (`load-tests.yml`, `security-tests.yml`).

**Impacto:** Risco de manutenção duplicada; se uma mudança de ambiente ou passo de build for necessária, precisa ser aplicada em múltiplos workflows.

**Sugestão:** Documentar a intenção do `ci.yml` (é um workflow alternativo simplificado? É usado por algum ambiente específico?) ou consolidar com os workflows existentes.

---

### 5.4 `knip.json` — entradas obsoletas em `ignoreDependencies` corrigidas

**Arquivo:** `/knip.json`

**Problema:** As dependências `@babel/preset-env` e `@babel/preset-react` estavam em `ignoreDependencies`, mas passaram a ser detectadas como usadas pelo Knip (configuração Babel referenciada pelo transformer `babel-jest` em `babel.jest.config.js`), gerando avisos de "Configuration hints" na execução do `npm run knip`.

**Impacto:** Configuração com entradas desnecessárias e avisos recorrentes na ferramenta de análise.

**Sugestão:** Remover as duas entradas de `ignoreDependencies` e adicionar `treatConfigHintsAsErrors: true` para que dicas de configuração pendentes façam o Knip falhar (exit code 1) — **aplicada** no `knip.json` atual.

---

### 5.5 Múltiplos arquivos de configuração de Jest com responsabilidades sobrepostas

**Arquivos:** `/jest.config.js`, `/jest.config.base.js`, `/jest.config.db.js`, `/jest.setup.js`, `/jest.teardown.js`, `/babel.jest.config.js`

**Problema:** São 6 arquivos relacionados ao Jest, cada um com uma responsabilidade específica, mas com potencial de sobreposição ou confusão:
- `jest.config.js`: configuração principal
- `jest.config.base.js`: configuração base compartilhada
- `jest.config.db.js`: configuração para testes com banco real
- `jest.setup.js`: setup global
- `jest.teardown.js`: teardown global
- `babel.jest.config.js`: configuração Babel para transformação no Jest

**Impacto:** Complexidade de manutenção; desenvolvedor precisa entender qual arquivo modificar para cada mudança.

**Sugestão:** Manter a separação atual se estiver funcionando bem, mas documentar brevemente a responsabilidade de cada arquivo no README ou em um arquivo de documentação interna.

---

## 6. Performance

### 6.1 `next-sitemap.config.js` — queries ao banco no `additionalPaths`

**Arquivo:** `/next-sitemap.config.js`

**Problema:** O `additionalPaths` executa 3 queries ao banco (posts, musicas, videos) a cada geração de sitemap (no `postbuild`). Se o banco estiver indisponível, o `postbuild` falha silenciosamente (o erro é logado mas o sitemap é gerado sem os paths dinâmicos).

**Impacto:** Sitemap pode ser gerado incompleto sem aviso claro; dependência do banco no build.

**Sugestão:** Considerar cachear os paths dinâmicos ou documentar o comportamento de fallback. O `TODO` no código já indica intenção de integrar notificação em produção.

---

### 6.2 `proxy.js` — rate limit aplicado em todas as requisições das rotas protegidas

**Arquivo:** `/proxy.js`

**Problema:** O proxy aplica `checkRateLimit` em **todas** as requisições das rotas protegidas, incluindo cache hits. Isso adiciona latência de Redis a cada requisição, mesmo quando o conteúdo poderia ser servido do cache.

**Impacto:** Latência adicional em endpoints de alta leitura (posts, videos, musicas, products).

**Sugestão:** Avaliar se o rate limit deve ser aplicado antes ou depois do cache (os endpoints já têm rate limit interno). O proxy como camada mais restritiva pode ser redundante com o rate limit dos endpoints.

**Status:** ✅ Implementado — o rate limit das rotas de listagem/busca foi removido do middleware (apenas `/api/auth/login` permanece no `proxy.js`), eliminando a latência do Redis por requisição nessas rotas; a proteção continua nos endpoints, que já possuíam rate limit interno.

---

## 7. Pontos Irrelevantes ou Obsoletos

### 7.1 `rate-limit-proxy.js` — arquivo removido (referência em docs antigos)

**Arquivo (removido):** `/rate-limit-proxy.js`

**Problema:** O documento antigo (`docs/antigos/PROJECT_raiz.md`) referencia `rate-limit-proxy.js`, mas o arquivo atual é `proxy.js` (convenção do Next.js 16). O `rate-limit-proxy.js` não existe mais.

**Impacto:** Confusão para quem consulta a documentação antiga.

**Sugestão:** A documentação atual (`PROJECT_raiz.md`) já usa `proxy.js` — manter assim e não recriar o arquivo antigo.

---

### 7.2 `test-base.yml` — fora do escopo da raiz

**Arquivo:** `/home/qa/Projeto/Caminhar/.github/workflows/test-base.yml` (subpasta)

**Problema:** O `test-base.yml` é referenciado pelos workflows da raiz (`load-tests.yml`, `security-tests.yml`) mas está em `.github/workflows/` (subpasta), fora do escopo desta análise de raiz. O `pr-coverage.yml`, que também o referenciava da raiz, foi movido para a mesma subpasta e passou a executar a suíte de cobertura em job próprio, sem chamada reutilizável.

**Impacto:** Nenhum — apenas nota de escopo. Os workflows da raiz dependem dele, mas ele não é um arquivo da raiz.

**Sugestão:** Nenhuma ação necessária; apenas registro para contexto.

---

## 8. Novos arquivos identificados (não documentados anteriormente)

Esta seção documenta os arquivos que NÃO estavam presentes na análise anterior de 02/08/2026 (que cobria 31 arquivos) e que foram identificados na análise atual de 24/09/2026 (38 arquivos).

### 8.1 `.ai-memory.toml`

**Arquivo:** `/home/gus/Projetos/Caminhar/.ai-memory.toml`

**Descrição:** Arquivo de configuração do workspace ai-memory, definindo o projeto como "Caminhar" no workspace "default".

**Tamanho:** 43 bytes

**Finalidade:** Configuração do contexto do ai-memory para este projeto.

**Status:** Novo arquivo não documentado anteriormente.

---

### 8.2 `.dependency-cruiser.extras.cjs`

**Arquivo:** `/home/gus/Projetos/Caminhar/.dependency-cruiser.extras.cjs`

**Descrição:** Configuração do dependency-cruiser focada em validação de arquivos extras/legacy. Contém 24 regras de forbidden, com regras específicas como:
- `no-non-package-json` (error) — dependências não declaradas no package.json
- `not-to-unresolvable` (error) — dependências não encontradas
- `no-deprecated-core` (warn) — uso de módulos Node.js depreciados
- `no-duplicate-dep-types` (warn) — dependências duplicadas em deps/devDeps
- `not-to-test` (error) — produção dependendo de tests
- `not-to-spec` (error) — dependência de arquivos .spec/.test
- `not-to-dev-dep` (error) — código de produção usando devDependencies
- `optional-deps-used` (info) — uso de dependências opcionais
- `peer-deps-used` (warn) — uso de peer dependencies
- `no-deprecated-core` com lista específica de módulos depreciados (v8/tools/*, node-inspect/*, async_hooks, punycode, domain, etc.)

**Dependências configuradas:** node_modules ignorados na análise (`doNotFollow: path: ['node_modules']`).

**Opções avançadas:** condições de exports (`import`, `require`, `node`, `default`, `types`), campos main (`module`, `main`, `types`, `typings`), skipAnalysisNotInRules: true.

**Geração:** dependency-cruiser@18.1.0 em 2026-07-25T01:53:14.882Z.

**Status:** Novo arquivo não documentado anteriormente.

---

### 8.3 `.dependency-cruiser.isolados.cjs`

**Arquivo:** `/home/gus/Projetos/Caminhar/.dependency-cruiser.isolados.cjs`

**Descrição:** Configuração do dependency-cruiser focada em validação de código isolado. Contém 24 regras de forbidden, com os mesmos tipos de regras do arquivo extras.cjs, mas aplicadas a um contexto diferente.

**Status:** Novo arquivo não documentado anteriormente.

---

### 8.4 `ci.yml`

**Arquivo:** `/home/gus/Projetos/Caminhar/ci.yml`

**Descrição:** Workflow de CI básico. Executa nos eventos `push` (main, develop, feat/*, fix/*, chore/*, docs/*, refactor/*) e `pull_request` (target: main), em ubuntu-latest com Node.js 24 e npm 12.

**Passos:**
1. `checkout`: actions/checkout@v4
2. `setup-node`: actions/setup-node@v4 (node-version: 24)
3. `install`: npm ci (cache do npm habilitado)
4. `lint`: npm run lint
5. `test`: npm test

**Observação:** Este workflow é uma versão simplificada do processo de CI, com apenas lint e test (sem build, sem deploy, sem testes de carga ou segurança).

**Status:** Novo arquivo não documentado anteriormente.

---

### 8.5 `security-tests.yml`

**Arquivo:** `/home/gus/Projetos/Caminhar/security-tests.yml`

**Descrição:** Workflow de testes de segurança no GitHub Actions. Executa em push/PR para main, com jobs de análise de segurança (dependências vulneráveis, scanning, etc.).

**Status:** Novo arquivo não documentado anteriormente.

---

### 8.6 `skills-lock.json`

**Arquivo:** `/home/gus/Projetos/Caminhar/skills-lock.json`

**Descrição:** Lockfile de skills de IA (~945 linhas), contendo versões bloqueadas de skills utilizadas pelo projeto.

**Status:** Novo arquivo não documentado anteriormente.

---

## 9. Análise individual de cada arquivo

Esta seção apresenta uma análise individual de cada arquivo da raiz.

### 9.1 `.ai-memory.toml`

**Caminho:** `/home/gus/Projetos/Caminhar/.ai-memory.toml`

**Arquivos acionados/relacionados:** Nenhum (arquivo de configuração isolado)

**Resumo:** Arquivo de configuração do ai-memory workspace. Define o projeto como "Caminhar" no workspace "default". Tamanho: 43 bytes, 2 linhas.

---

### 9.2 `.clineignore`

**Caminho:** `/home/gus/Projetos/Caminhar/.clineignore`

**Arquivos acionados/relacionados:** Nenhum (arquivo de configuração isolado)

**Resumo:** Arquivo de ignore patterns para o projeto. Contém padrões para ignorar: node_modules, .pnpm, .yarn, bun.lockb (dependencies); .next, out, build, dist (Next.js); *.log, npm-debug.log*, yarn-debug.log*, yarn-error.log* (logs); .env, .env.local, .env.development, .env.production (environment); .git, .gitignore (git); coverage, .nyc_output (coverage/tests); .cache, .turbo, .vercel (cache); .DS_Store, Thumbs.db (OS). Tamanho: 327 bytes, 40 linhas.

---

### 9.3 `.dependency-cruiser.cjs`

**Caminho:** `/home/gus/Projetos/Caminhar/.dependency-cruiser.cjs`

**Arquivos acionados/relacionados:**
- `.dependency-cruiser.core.cjs`
- `.dependency-cruiser.extras.cjs`
- `.dependency-cruiser.isolados.cjs`
- `jsconfig.json` (referido como tsConfig.fileName)
- `package.json` (dependências verificadas pelas regras)

**Resumo:** Configuração principal do dependency-cruiser. Contém 15 regras de forbidden (no-circular, no-orphans, no-deprecated-core, not-to-deprecated, no-non-package-json, not-to-unresolvable, no-duplicate-dep-types, not-to-test, not-to-spec, not-to-dev-dep, optional-deps-used, peer-deps-used) + regras específicas para ambiente Edge. Opções avançadas incluem: tsConfig apontando para jsconfig.json, enhancedResolveOptions com exportsFields e conditionNames, skipAnalysisNotInRules, reporterOptions para dot/archi/text. Geração: dependency-cruiser@18.1.0 em 2026-07-25.

---

### 9.4 `.dependency-cruiser.core.cjs`

**Caminho:** `/home/gus/Projetos/Caminhar/.dependency-cruiser.core.cjs`

**Arquivos acionados/relacionados:**
- `.dependency-cruiser.cjs` (configuração principal)
- `jsconfig.json` (referido como tsConfig.fileName)
- Diretórios validados: `pages/`, `components/`, `lib/`, `hooks/`, `data/`, `utils/`, `mocks/`, `tests/`

**Resumo:** Configuração do dependency-cruiser focada no contexto CORE. Valida a hierarquia de camadas da aplicação com 24 regras, incluindo regras específicas de arquitetura:
- `no-utils-importing-upper-layers`: utils não pode depender de components/pages/hooks/lib
- `no-hooks-importing-ui`: hooks não pode depender de components/pages
- `no-lib-importing-ui`: lib não pode depender de components/pages/hooks
- `no-components-importing-pages`: components não pode depender de pages
- `no-data-importing-ui`: data não deve depender de components/pages/hooks

Também contém regras de teste/mock e regras genéricas. Opções: includeOnly restrito a `^(pages|components|lib|hooks|data|utils|mocks|tests)`.

---

### 9.5 `.dependency-cruiser.extras.cjs`

**Caminho:** `/home/gus/Projetos/Caminhar/.dependency-cruiser.extras.cjs`

**Arquivos acionados/relacionados:**
- `.dependency-cruiser.cjs` (configuração principal)
- `.dependency-cruiser.core.cjs`
- `.dependency-cruiser.isolados.cjs`

**Resumo:** Configuração do dependency-cruiser focada em validação de arquivos extras/legacy. Mesma estrutura de regras do core.cjs (24 regras), mas aplicada a um contexto diferente (arquivos extras). Geração: dependency-cruiser@18.1.0 em 2026-07-25T01:53:14.882Z.

---

### 9.6 `.dependency-cruiser.isolados.cjs`

**Caminho:** `/home/gus/Projetos/Caminhar/.dependency-cruiser.isolados.cjs`

**Arquivos acionados/relacionados:**
- `.dependency-cruiser.cjs` (configuração principal)
- `.dependency-cruiser.core.cjs`
- `.dependency-cruiser.extras.cjs`

**Resumo:** Configuração do dependency-cruiser focada em validação de código isolado. Mesma estrutura de regras do core.cjs (24 regras), mas aplicada a um contexto diferente (código isolado). 

---

### 9.7 `.env`

**Caminho:** `/home/gus/Projetos/Caminhar/.env`

**Arquivos acionados/relacionados:**
- `.env.example` (template de referência)
- `next.config.js` (usa variáveis de ambiente como ALLOWED_ORIGINS)
- `proxy.js` (usa variáveis como NODE_ENV, REDIS_*, RATE_LIMIT_*)
- `next-sitemap.config.js` (usa DATABASE_URL, SENTRY_*)

**Resumo:** Arquivo de variáveis de ambiente do projeto (arquivo secreto, não lido). Contém configurações de: banco de dados (DATABASE_URL, DB_NAME, DB_USER, DB_PASS, DB_HOST, etc.), Redis (REDIS_URL, REDIS_HOST, REDIS_PORT, REDIS_PASS), Next.js (ALLOWED_ORIGINS, NEXTAUTH_SECRET, SENTRY_*), e outras variáveis de ambiente usadas pelos diversos módulos do projeto. **Arquivo não lido por conter informações sensíveis.**

---

### 9.8 `.env.example`

**Caminho:** `/home/gus/Projetos/Caminhar/.env.example`

**Arquivos acionados/relacionados:**
- `.env` (arquivo real que deve ser criado a partir deste exemplo)

**Resumo:** Template de exemplo de variáveis de ambiente para o projeto. Contém TODAS as variáveis necessárias (banco de dados, Redis, NextAuth, Sentry, Docker, Kingship, auth, etc.) com valores de exemplo ou placeholders. 830 bytes, 42 linhas. Serve como documentação das variáveis de ambiente necessárias.

---

### 9.9 `.gitignore`

**Caminho:** `/home/gus/Projetos/Caminhar/.gitignore`

**Arquivos acionados/relacionados:** Nenhum (arquivo de configuração isolado)

**Resumo:** Padrão GitHub node+next.js com adições específicas do projeto. Ignora: node_modules, .next, out, build, dist, *.log, .env*, coverage, .nyc_output, .cache, .turbo, .vercel, .DS_Store, Thumbs.db, além de arquivos específicos do projeto como coverage-db/, reports/, .agents/, skills-lock.json (opcional), e diversos artefatos de build e teste.

---

### 9.10 `CHANGELOG.md`

**Caminho:** `/home/gus/Projetos/Caminhar/CHANGELOG.md`

**Arquivos acionados/relacionados:**
- `package.json` (versão do projeto)
- `README.md` (referências cruzadas)
- `/docs/` (documentação complementar)

**Resumo:** Changelog completo do projeto com 97 versões documentadas (v0.1.0 até v1.0.18). Siga o padrão Keep a Changelog. Versão atual: v1.0.18 (2026-07-25). Documenta releases por versão com datas, referências a issues/PRs e listas de mudanças organizadas por categoria (Features, Improvements, Bug Fixes, Breaking Changes, Maintenance, CI, Docs). Extensão: ~50KB.

---

### 9.11 `README.md`

**Caminho:** `/home/gus/Projetos/Caminhar/README.md`

**Arquivos acionados/relacionados:**
- `package.json` (scripts, versão, engines)
- `CHANGELOG.md` (versões)
- `jsconfig.json` (paths)
- Documentação em `/docs/`

**Resumo:** Documentação principal do projeto Caminhar. Contém: visão geral, pré-requisitos (Node 24.16.0, npm 11.17.0 — **inconsistente** com package.json que exige 24.18.0/12.0.2), instalação, configuração de ambiente, scripts npm, estrutura de diretórios, rota do API, status do projeto, referências. Menções a arquivos removidos (`generateTokensCSS.js`, Design Tokens) que precisam ser removidas. Contagens desatualizadas (28 raiz vs 38 atuais; 53 páginas vs 42 atuais).

---

### 9.12 `babel.jest.config.js`

**Caminho:** `/home/gus/Projetos/Caminhar/babel.jest.config.js`

**Arquivos acionados/relacionados:**
- `jest.config.base.js` (usa este arquivo como `transform` para `babel-jest`)
- `package.json` (dependências @babel/core, @babel/preset-env, @babel/preset-react)

**Resumo:** Configuração Babel para transformação de módulos ES em CommonJS para o Jest. Usa @babel/preset-env e @babel/preset-react com runtime automatico. Exporta como função que recebe api e opts. 293 bytes, 9 linhas.

---

### 9.13 `ci.yml`

**Caminho:** `/home/gus/Projetos/Caminhar/ci.yml`

**Arquivos acionados/relacionados:**
- `.github/workflows/` (outros workflows)
- `package.json` (scripts test, lint)

**Resumo:** Workflow de CI básico no GitHub Actions. Executa lint e test em push/PR para branches principais. Versão simplificada do processo completo de CI. 2.3KB, 46 linhas.

---

### 9.14 `cypress.config.js`

**Caminho:** `/home/gus/Projetos/Caminhar/cypress.config.js`

**Arquivos acionados/relacionados:**
- `package.json` (scripts cypress:*)
- `next.config.js` (baseUrl configurado para http://localhost:3000)

**Resumo:** Configuração Cypress para E2E testing. Configura baseUrl (http://localhost:3000), viewport (1280x720), retries (2 em ci, 1 local), screenshot on failure, video on failure, e define `chromeWebSecurity: false` e `watchForFileChanges: false`. 325 bytes, 13 linhas.

---

### 9.15 `eslint.config.js`

**Caminho:** `/home/gus/Projetos/Caminhar/eslint.config.js`

**Arquivos acionados/relacionados:**
- `package.json` (dependências @eslint/js, eslint-plugin-unicorn, etc.)
- `next.config.js` (regex de pages/api/)
- `jest.config.js` (testMatch patterns)

**Resumo:** Configuração ESLint flat com 24 regras de lint, 8 grupos condicionais que ativam regras específicas (test, admin, componente, page/API, setup/db, configuração, dev/prod, ambiente), e 7 diretórios ignorados (coverage, .next, node_modules, reports, logs, coverage-db, public, scripts/diagnostics). 6.9KB, ~500 linhas.

---

### 9.16 `estrutura.html`

**Caminho:** `/home/gus/Projetos/Caminhar/estrutura.html`

**Arquivos acionados/relacionados:**
- `.dependency-cruiser.cjs` (gera este relatório)
- Todos os arquivos do projeto (está é a árvore completa de dependências)

**Resumo:** Relatório HTML gerado pelo dependency-cruiser contendo a árvore de dependências completa do projeto. Tamanho: ~1.1 MB. É um artefato de diagnóstico, não código-fonte.

---

### 9.17 `estrutura.txt`

**Caminho:** `/home/gus/Projetos/Caminhar/estrutura.txt`

**Arquivos acionados/relacionados:**
- `.dependency-cruiser.cjs` (gera este relatório)
- Todos os arquivos do projeto

**Resumo:** Relatório TXT gerado pelo dependency-cruiser contendo a árvore de dependências completa. Tamanho: ~340 linhas. Versão texto do estructura.html. Artefato de diagnóstico.

---

### 9.18 `estrutura_extras.html`

**Caminho:** `/home/gus/Projetos/Caminhar/estrutura_extras.html`

**Arquivos acionados/relacionados:**
- `.dependency-cruiser.extras.cjs` (gera este relatório)
- Arquivos legacy/extras do projeto

**Resumo:** Relatório HTML focado em arquivos extras/legacy do projeto. Tamanho: ~1.1 MB. Gera análise específica para arquivos que não são parte do core do projeto.

---

### 9.19 `estrutura_extras.txt`

**Caminho:** `/home/gus/Projetos/Caminhar/estrutura_extras.txt`

**Arquivos acionados/relacionados:**
- `.dependency-cruiser.extras.cjs`
- `estrutura.txt` (similar, mas focado em core)

**Resumo:** Relatório TXT focado em arquivos extras/legacy. Tamanho: ~340 linhas. Versão texto do estrutura_extras.html.

---

### 9.20 `estrutura_isolados.html`

**Caminho:** `/home/gus/Projetos/Caminhar/estrutura_isolados.html`

**Arquivos acionados/relacionados:**
- `.dependency-cruiser.isolados.cjs` (gera este relatório)
- Código isolado do projeto

**Resumo:** Relatório HTML focado em código isolado (arquivos sem dependências entrantes). Tamanho: ~1.1 MB. Gera análise de código que não é importado por outros módulos.

---

### 9.21 `estrutura_isolados.txt`

**Caminho:** `/home/gus/Projetos/Caminhar/estrutura_isolados.txt`

**Arquivos acionados/relacionados:**
- `.dependency-cruiser.isolados.cjs`
- `estrutura_isolados.html`

**Resumo:** Relatório TXT focado em código isolado. Tamanho: ~340 linhas. Versão texto do estrutura_isolados.html.

---

### 9.22 `jest.config.base.js`

**Caminho:** `/home/gus/Projetos/Caminhar/jest.config.base.js`

**Arquivos acionados/relacionados:**
- `jest.config.js` (extende esta configuração base)
- `jest.config.db.js` (extende esta configuração base)
- `babel.jest.config.js` (usado como transform)
- `package.json` (devDependencies para babel-jest)

**Resumo:** Configuração base compartilhada do Jest. Exporta função que recebe config e retorna objeto com: testEnvironment (jsdom), transform (^.+\.jsx?$ → babel-jest), moduleNameMapper (múltiplos patterns para CSS, images, SVG, mocks), testMatch (tests/**/*.test.js, tests/**/*.spec.js, tests/**/*[.-]test.js), setupFilesAfterEnv (./jest.setup.js), teardown (./jest.teardown.js), timers (modern), resetMocks, clearMocks. 2.0KB, 47 linhas.

---

### 9.23 `jest.config.db.js`

**Caminho:** `/home/gus/Projetos/Caminhar/jest.config.db.js`

**Arquivos acionados/relacionados:**
- `jest.config.base.js` (extende esta configuração base)
- `jest.setup.js` (configurações específicas de DB no setup)
- `jest.teardown.js` (teardown específico de DB)

**Resumo:** Configuração do Jest para testes com banco de dados real. Estende jest.config.base.js com: bail (true), testMatch restrito a tests/unit/lib/db.test.js e tests/integration/**/*.test.js, setupFilesAfterEnv com setup específico de DB, teardown específico, testTimeout 30000ms, verbose false, maxWorkers '50%', coverage coletada apenas de lib/domain/**/*.js e lib/infra/**/*.js, coverageDirectory 'coverage-db', thresholds de cobertura mais altos (78% branches, 95% functions/lines/statements). 2.2KB, 47 linhas.

---

### 9.24 `jest.config.js`

**Caminho:** `/home/gus/Projetos/Caminhar/jest.config.js`

**Arquivos acionados/relacionados:**
- `jest.config.base.js` (extende esta configuração base)
- `jest.setup.js` (setup global)
- `jest.teardown.js` (teardown global)
- `package.json` (scripts test, test:coverage, test:watch, test:ci, test:log, test:coverage:log)

**Resumo:** Configuração principal do Jest (ESM). Habilita: ESM via extensionsToTreatAsEsm, transformIgnorePatterns para ESM packages, moduleNameMapper completo (CSS modules, images, SVG, fonts, mocks), testMatch (tests/**/*.test.js, tests/**/*.spec.js, tests/**/*[.-]test.js), setupFilesAfterEnv (./jest.setup.js), teardown (./jest.teardown.js), timers (modern), resetMocks, clearMocks, restoreMocks, coverage completa com cobertura de todos os source files (pages, components, lib, hooks, utils, data, config), thresholds globais (80% branches, 85% functions, 90% lines/statements), thresholds por diretório (lib/domain, pages/api/admin, components/Admin/fields), reporters (default + json + html + lcov/lcovonly). 6.4KB, ~150 linhas.

---

### 9.25 `jest.setup.js`

**Caminho:** `/home/gus/Projetos/Caminhar/jest.setup.js`

**Arquivos acionados/relacionados:**
- `jest.config.js` (setupFilesAfterEnv)
- `jest.config.db.js` (setup específico de DB)
- `package.json` (devDependencies para jest-environment-jsdom, jsdom)

**Resumo:** Setup global do Jest executado após cada test file. Responsabilidades:
1. Mock da API Fetch (global.fetch com implementação simulada que retorna respostas configurable por URL e método)
2. Mock do console.warn para suprimir warnings do React/DOM não críticos
3. Mock do matchMedia para suportar os módulos que usam matchMedia
4. Mock e polyfills para Request/Response/FormData (navegação)
5. Configuração de fake timers com sinon e jest.useFakeTimers
6. console.log de debug ("Jest setup running with ES modules", "Node.js version:")

Tamanho: 1.1KB, 47 linhas. **Possui console.log de debug que polui a saída dos testes (ver seção 1.3).**

---

### 9.26 `jest.teardown.js`

**Caminho:** `/home/gus/Projetos/Caminhar/jest.teardown.js`

**Arquivos acionados/relacionados:**
- `jest.config.js` (teardown)
- `jest.config.db.js` (teardown específico de DB)
- `jest.setup.js` (setup/teardown são pares)

**Resumo:** Teardown global do Jest executado após todos os tests. Responsabilidades:
1. Cleanup de fake timers (sinon.restore, jest.useRealTimers)
2. Limpeza de mocks (restoreAllMocks se disponível)
3. Reinício de fetch mock para isolate tests
4. Timer de segurança com Promise.race (setImmediate vs setTimeout 5s)
5. **Status: ✅ corrigido** — timer de segurança agora é cancelado com clearTimeout no .finally() do Promise.race, eliminando o aviso "Jest did not exit one second after..."

Tamanho: 634 bytes, 23 linhas.

---

### 9.27 `jsconfig.json`

**Caminho:** `/home/gus/Projetos/Caminhar/jsconfig.json`

**Arquivos acionados/relacionados:**
- `next.config.js` (usado pela Next.js para módulos)
- `pages/` (todos os arquivos JS/TS usam os paths definidos aqui)
- `lib/` (todos os arquivos usam os paths definidos aqui)
- `components/` (todos os arquivos usam os paths definidos aqui)
- `hooks/` (todos os arquivos usam os paths definidos aqui)

**Resumo:** Configuração JS/TS com paths customizados para imports absolutos. Define:
- compilerOptions: target (ES2022), module (ESNext), moduleResolution (Node), checkJs (true), strict (true)
- paths: @/*, @/components/*, @/lib/*, @/hooks/*, @/utils/*, @/data/*, @/config/*, @/pages/*, @/styles/*, @/public/*, @/mocks/*, @/tests/*

Permite imports como `import X from '@/lib/y';` em vez de caminhos relativos. 504 bytes, 19 linhas.

---

### 9.28 `knip.json`

**Caminho:** `/home/gus/Projetos/Caminhar/knip.json`

**Arquivos acionados/relacionados:**
- `package.json` (dependencies listadas)
- `schema.knip.json` ($schema para validação no editor)
- `eslint.config.js` (algumas regras relacionadas a dead code)

**Resumo:** Configuração do Knip (detecção de código morto e dependências não usadas). Configurações principais:
- Omit: node_modules, .next, coverage, coverage-db, public, scripts/diagnostics
- ignoreDependencies: @babel/preset-env, @babel/preset-react, jsdom (estas foram removidas — ver seção 5.4)
- treatConfigHintsAsErrors: true
- custom: entradas para binários, cjs, tests, types, esbuild
- project: root . (tudo a partir da raiz)
- $schema: ./schema.knip.json

Tamanho: ~15KB.

---

### 9.29 `load-tests.yml`

**Caminho:** `/home/gus/Projetos/Caminhar/load-tests.yml`

**Arquivos acionados/relacionados:**
- `.github/workflows/test-base.yml` (workflow reutilizável chamado)
- `package.json` (scripts de load test)
- `next.config.js` (configurações de execução)

**Resumo:** Workflow de testes de carga no GitHub Actions. Executa em push/PR para main, com 3 jobs:

**Job `validate`:**
- Valida que todos os arquivos do workflow estão bem formados
- Executa em ubuntu-latest com Node 24
- Steps: checkout, setup-node, install (npm ci), actionlint (todos .github/workflows/*.yml e .github/actions/**/*.yml), yamllint (todos os arquivos .yml), validação de sintaxe JavaScript dos scripts em scripts/diagnostics/ e scripts/test/*

**Job `run-load-tests`:**
- Executa os testes de carga reais
- Executa em ubuntu-latest com Node 24
- Steps: checkout, setup-node, install (npm ci), setup Docker Compose (imagem postgres:16-alpine, serviço postgres com healthcheck, variáveis de ambiente POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_PORT), espera healthcheck do postgres, setup do schema do banco via psql com DDL completo (41 tabelas), execução do script de teste de carga (node scripts/test/load-test.js) com EXIT_CODE capturado, GRAFANA_URL e GRAFANA_API_KEY exportados

**Variáveis de ambiente usadas:** DATABASE_URL, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, REDIS_HOST, REDIS_PORT, REDIS_PASS, SESSION_SECRET, TEST_BASE_URL, LOAD_TEST_BASE_URL, BACKEND_URL, RESULTS_PORT, RESULTS_PATH, K6_PROMETHEUS_FROM, K6_PROMETHEUS_GRANULARITY, SCENARIO_NAME, COLUMNS, STRIP_ANSI, VIP_COUNT, PRIVATE_COUNT, FORCE_WAIT_MS, MIN_WAIT_MS, MAX_WAIT_MS, JWT_SECRET, SENTRY_DSN, SENTRY_TRACES_SAMPLE_RATE, K6_CHECKPOINT_DIR, K6_CHECKPOINT_INTERVAL, K6_CHECKPOINT_POLICY, K6_PROMETHEUS_RW_SERVER_URL, K6_PROMETHEUS_RW_KEY, K6_PROMETHEUS_RW_TRACK_EVENTS, K6_CHECKPOINT_STORE, K6_CHECKPOINT_PATH

**Status:** ✅ Refinado — versão atual consolida melhorias de versões anteriores (jobs separados, validação de workflow, scripting, tratamento de erros, cleanup).

---

### 9.30 `next-sitemap.config.js`

**Caminho:** `/home/gus/Projetos/Caminhar/next-sitemap.config.js`

**Arquivos acionados/relacionados:**
- `package.json` (scripts postbuild, build)
- `next.config.js` (usado pelo Next.js)
- `pages/api/posts.js` (usado pelas queries de posts)
- `pages/api/musicas.js` (usado pelas queries de musicas)
- `pages/api/videos.js` (usado pelas queries de videos)

**Resumo:** Configuração do Next-sitemap. Responsabilidades:
1. Configuração de robots (host, sitemapURL, changefreq, priority, generateRobotsTxt: true)
2. Configuração de sitemap (hostname, exclude, excludeHomePage, excludeLegacies, excludeListings, listings, source, interpolation (es6), excludeLines, transform, compress: true, xslUrl, xslCache, trailingSlash: false, excludeChangefreq, excludePriority, excludeLastmod, i18n: undefined)
3. **additionalPaths:** Executa 3 queries ao banco (posts, musicas, videos) para gerar paths dinâmicos do sitemap
4. Configuração de etags (enableEtag: true)
5. Configuração de ênfase (true)
6. **TODO** comentado indicando intenção de adicionar notificação em produção quando o banco estiver indisponível

**Problema de performance:** Queries ao banco no build (ver seção 6.1). Tamanho: 1.1KB, 30 linhas.

---

### 9.31 `next.config.js`

**Caminho:** `/home/gus/Projetos/Caminhar/next.config.js`

**Arquivos acionados/relacionados:**
- `package.json` (dependências next, sharp, etc.)
- `.env`/.env.example (ALLOWED_ORIGINS, outras variáveis)
- `proxy.js` (rewrites api/* → proxy)
- `public/` (static assets)
- `pages/` (todas as páginas e APIs)

**Resumo:** Configuração principal do Next.js. Responsabilidades:

**1. Headers CORS (3 grupos):**
- `/api/:path*` (público): lista completa de ALLOWED_ORIGINS
- `/api/admin/:path*`, `/api/auth/:path*`, `/api/helper/:path*`: apenas primeira origem de ALLOWED_ORIGINS

**2. Rewrites (proxy):**
- `/api/auth/login` → `http://${PROXY_HOST}:${PROXY_PORT}/api/auth/login`
- `/api/:path*` → `http://${PROXY_HOST}:${PROXY_PORT}/api/:path*`

**3. Transpilation:**
- transpilePackages: ['sharp']

**4. Experimental:**
- taint: true (experimental)
- optimizePackageImports: ['@heroicons/react']

**5. Turbopack:**
- configProfile: 'debug'

**6. Logging:**
- fetch: console.log para debugging

**Problemas identificados:** CORS inconsistente (ver seção 2.2) e Access-Control-Allow-Origin vazio (ver seção 2.3). Tamanho: 5.6KB, 107 linhas.

---

### 9.32 `package-lock.json`

**Caminho:** `/home/gus/Projetos/Caminhar/package-lock.json`

**Arquivos acionados/relacionados:**
- `package.json` (lockfile gerado a partir deste)

**Resumo:** Lockfile npm (package-lock.json v2) com 871 pacotes instalados. Gera ônus de ~602 KB na raiz. Contém todas as dependências instaladas (deps e devDeps) com versões exatas e sub-dependências. Não deve ser lido/manuseado manualmente — gerado automaticamente pelo npm.

**Tamanho:** ~602 KB

**Status:** ⚠️ Grande arquivo de lockfile — considerar se deve ser mantido na raiz ou omitido via .gitignore (não recomendado para projetos com múltiplos desenvolvedores).

---

### 9.33 `package.json`

**Caminho:** `/home/gus/Projetos/Caminhar/package.json`

**Arquivos acionados/relacionados:**
- Todos os arquivos do projeto (dependências e scripts)
- `package-lock.json` (lockfile)
- `.env` (variáveis usadas por alguns scripts)
- `next.config.js` (engines)
- `README.md` (versão, engines — inconsistentes)
- `CHANGELOG.md` (versão)

**Resumo:** Manifesto do projeto Caminhar. Contém:
- **Informações básicas:** name (caminhar), version (v1.0.18), description, repository, author, license (MIT), engine strict (true), engines (node: 24.18.0, npm: 12.0.2)
- **Dependências principais (~40 pacotes):** next, react, react-dom, next-auth, @heroicons/react, bcryptjs, cookies, knex, pg, ioredis, sharp, etc.
- **DevDependencies extensas:** babel, cypress, eslint, jest, knip, dependency-cruiser, sinon, esbuild, yaml, @actions/*, etc.
- **Scripts (40+ scripts):** dev, build, start, lint, test, test:watch, test:coverage, test:ci, test:log, test:coverage:log, test:e2e, test:e2e:record, cypress:run, cypress:open, test:db:unit, test:db, test:load:all, test:load:all:log, test:load:orchestrator, test:load:1m, test:load:5m, test:load:oauth, test:load:oauth:log, lint:log, lint:workflows, diag:lsp, diag:reusable-workflow, knip, dc:check, dc:check:core, dc:check:extras, dc:check:isolados, dc:check:all, dc:check:core:extras:isolados, dc:out:dot, dc:out:archi, dc:out:text, dc:out:all, dc:out:all:strict, dc:out:all:extras

**Problemas identificados:**
- Chave Cypress exposta no script test:e2e:record (ver seção 1.1) — parcialmente corrigido
- Versão do Node.js inconsistente com README.md (ver seção 1.2)

**Tamanho:** ~7KB

---

### 9.34 `proxy.js`

**Caminho:** `/home/gus/Projetos/Caminhar/proxy.js`

**Arquivos acionados/relacionados:**
- `next.config.js` (rewrites para este middleware)
- `lib/api/helpers.js` (detectSpoofedIP importado)
- `.env` (REDIS_*, RATE_LIMIT_*, NODE_ENV, PROXY_*)
- `pages/api/posts.js`, `pages/api/musicas.js`, `pages/api/videos.js`, `pages/api/dicas.js`, `pages/api/products.js` (endpoints protegidos)

**Resumo:** Middleware do Next.js (Edge Runtime) para proteção e cache. Responsabilidades:
1. **Detecção de IP e anti-spoofing:** Importa detectSpoofedIP de lib/api/helpers.js com strictMode baseado em NODE_ENV (strictMode=true em production, false em dev, ENABLE_STRICT_SPOOFING=true para forçar em dev)
2. **Rate limiting:** Aplica checkRateLimit apenas para `/api/auth/login` (30 req/min); outras rotas protegidas agora têm rate limit apenas nos endpoints
3. **Cache:** Cache de respostas GET em Redis (cacheKey com versão, path, query); cache invalidation via header x-cache-version; cache apenas para respostas 200 com Content-Type text/html ou application/json; cache com TTL de 1 hora e segmentação por versão
4. **Comportamento por método/route:**
   - GET com cache hit → resposta em cache
   - GET com cache miss → proxy.config.passThrough ou proxy para backend
   - POST/PUT/DELETE/PATCH → proxy para backend (sem cache)
   - HEAD → proxy para backend
   - Métodos não suportados → 405

**Variáveis de ambiente usadas:** NODE_ENV, REDIS_URL, REDIS_HOST, REDIS_PORT, REDIS_PASS, REDIS_DB, RATE_LIMIT_* (não utilizadas diretamente no código atual), PROXY_HOST, PROXY_PORT

**Status:** ✅ Melhorado — detectSpoofedIP com strictMode baseado em NODE_ENV, rate limit das rotas de listagem/busca removido do middleware, rate limit agora apenas em `/api/auth/login`. Ver também seções 2.1, 3.2, 6.2.

Tamanho: 2.5KB, 77 linhas.

---

### 9.35 `schema.knip.json`

**Caminho:** `/home/gus/Projetos/Caminhar/schema.knip.json`

**Arquivos acionados/relacionados:**
- `knip.json` (usado como $schema para validação no editor)

**Resumo:** Schema JSON do Knip para validação de edição do arquivo knip.json. Contém definição completa do schema com todas as propriedades, tipos e enumerações suportadas pelo Knip. 1113 linhas, ~1.1 MB (quando formado beautificado) ou compactado.

**Status:** ⚠️ Arquivo grande que pode ser substituído pela URL do schema oficial: https://json.schemastore.org/knip.json

---

### 9.36 `security-tests.yml`

**Caminho:** `/home/gus/Projetos/Caminhar/security-tests.yml`

**Arquivos acionados/relacionados:**
- `.github/workflows/test-base.yml` (workflow reutilizável chamado)
- `package.json` (dependências de segurança)

**Resumo:** Workflow de testes de segurança no GitHub Actions. Executa análise de segurança das dependências e do código. Usa jobs similares ao load-tests.yml com validação de syntax e execução dos testes de segurança. 12.3KB.

**Status:** Novo arquivo não documentado anteriormente.

**Observação:** Este arquivo replica grande parte da estrutura do load-tests.yml, o que pode indicar oportunidade de consolidação ou extração de configurações comuns.

---

### 9.37 `skills-lock.json`

**Caminho:** `/home/gus/Projetos/Caminhar/skills-lock.json`

**Arquivos acionados/relacionados:** Nenhum (lockfile de ferramenta de IA)

**Resumo:** Lockfile de skills de IA (~945 linhas). Contém versões bloqueadas de skills utilizadas pelo projeto. Artefato de ferramenta de IA, sem relação com o código da aplicação.

**Tamanho:** ~945 linhas

**Status:** ⚠️ Arquivo que polui a raiz — considerar mover para `.agents/` ou `config/`.

---

### 9.38 `tree.txt`

**Caminho:** `/home/gus/Projetos/Caminhar/tree.txt`

**Arquivos acionados/relacionados:** Nenhum (snapshot estático)

**Resumo:** Snapshot da estrutura de diretórios do projeto. Contém lista de todos os diretórios e arquivos (38 na raiz, 46.264 em sub-pastas). Gera uma visão geral da estrutura do projeto. Tamanho: 1.3KB, 38 linhas + referências a sub-pastas.

**Status:** ⚠️ Snapshot estático que desatualiza rapidamente. Considerar remover ou gerar dinamicamente.

---

## 10. Ajustes e Correções

### 10.1 Inconsistência de versão do Node.js

**O que foi encontrado:** Versões diferentes em package.json (24.18.0/12.0.2), README.md (24.16.0/11.17.0) e CHANGELOG.md (24.15.0 em v1.0.0).

**Onde:** `/package.json` (engines), `/README.md` (cabeçalho), `/CHANGELOG.md` (v1.0.0)

**Problema:** Divergência de versão do runtime entre documentação e manifesto.

---

## 11. Melhorias

### 11.1 Consolidação de configurações do Dependency Cruiser

**Justificativa:** 4 arquivos de configuração (.dependency-cruiser.cjs, .dependency-cruiser.core.cjs, .dependency-cruiser.extras.cjs, .dependency-cruiser.isolados.cjs) com estrutura muito similar podem ser consolidados em um único arquivo com múltiplos contextos, ou ter a duplicidade de regras reduzida com herança/extends.

---

### 11.2 Documentação dos arquivos de configuração do Jest

**Justificativa:** 6 arquivos relacionados ao Jest (jest.config.js, jest.config.base.js, jest.config.db.js, jest.setup.js, jest.teardown.js, babel.jest.config.js) com responsabilidades distribuídas podem se beneficiar de uma documentação breve sobre qual arquivo modificar para cada tipo de mudança.

---

### 11.3 Consolidação de workflows do GitHub Actions

**Justificativa:** security-tests.yml replica grande parte da estrutura do load-tests.yml. Extração de configurações comuns ou documentação da razão para manter workflows separados seria benéfico.

---

## 12. Duplicidades

### 12.1 Múltiplos arquivos de configuração do Dependency Cruiser

**O que foi encontrado:** 4 arquivos .cjs com estrutura de regras muito similar (mesmas 24 regras básicas em core.cjs, extras.cjs e isolados.cjs).

**Evidência:** Todos os 3 arquivos (core.cjs, extras.cjs, isolados.cjs) possuem as mesmas regras no mesmo orderm com os mesmos nomes e severities.

**Impacto:** Manutenção duplicada — uma mudança nas regras genéricas precisa ser aplicada em 3 arquivos.

---

### 12.2 Arquivos `estrutura.*` em pares HTML/TXT

**O que foi encontrado:** 3 pares de arquivos (estrutura.html + estrutura.txt, estrutura_extras.html + estrutura_extras.txt, estrutura_isolados.html + estrutura_isolados.txt) que são basicamente o mesmo relatório em formatos diferentes.

**Impacto:** Duplicidade de informação em formatos alternativos.

---

## 13. Código morto

### 13.1 Possível código morto — `tree.txt`

**O que foi encontrado:** Arquivo de snapshot estático que não é gerado automaticamente e tende a desatualizar.

**Motivo:** Não há script no package.json para regenerá-lo; ele é um arquivo estático que foi criado em algum momento e não é mantido.

**Classificação:** Possível código morto (não há evidência de que seja lido por qualquer processo do projeto).

---

### 13.2 Possível código morto — `ci.yml`

**O que foi encontrado:** Workflow de CI alternativo simples, quando workflows mais completos já existem (load-tests.yml, security-tests.yml).

**Motivo:** Não está claro qual é a intenção do ci.yml — ele pode ser um workflow legacy, um workflow alternativo para um ambiente específico, ou um workflow que não está sendo usado.

**Classificação:** Possível código morto (não há evidência de que seja acionado regularmente ou tenha uma função única não coberta pelos outros workflows).

---

### 13.3 Possível código morto — `skills-lock.json`

**O que foi encontrado:** Lockfile de skills de IA na raiz, sem referência em nenhum script ou configuração do projeto.

**Motivo:** Nenhum script do package.json referencia skills-lock.json; ele é um artefato de ferramenta de IA que pode ter sido gerado por alguma ferramenta externa.

**Classificação:** Possível código morto (não há evidência de que seja usado por qualquer processo do projeto).

---

## 14. Resumo da estrutura de arquivos

### 14.1 Arquivos na raiz (38 arquivos)

```
/home/gus/Projetos/Caminhar/
├── .ai-memory.toml (43B) — config AI memory
├── .clineignore (327B) — ignore patterns
├── .dependency-cruiser.cjs (15.2KB) — config DC principal
├── .dependency-cruiser.core.cjs (7.6KB) — config DC core
├── .dependency-cruiser.extras.cjs (6.2KB) — config DC extras
├── .dependency-cruiser.isolados.cjs (6.2KB) — config DC isolados
├── .env — variáveis de ambiente (SEGRETO, não lido)
├── .env.example (830B) — template de variáveis
├── .gitignore (447B) — gitignore patterns
├── CHANGELOG.md (~50KB) — changelog completo
├── README.md (~12KB) — documentação principal
├── babel.jest.config.js (293B) — config Babel para Jest
├── ci.yml (2.3KB) — workflow CI básico
├── cypress.config.js (325B) — config Cypress
├── eslint.config.js (6.9KB) — config ESLint flat
├── estrutura.html (~1.1MB) — relatório DC (HTML)
├── estrutura.txt (~340KB) — relatório DC (TXT)
├── estrutura_extras.html (~1.1MB) — relatório DC extras (HTML)
├── estrutura_extras.txt (~340KB) — relatório DC extras (TXT)
├── estrutura_isolados.html (~1.1MB) — relatório DC isolados (HTML)
├── estrutura_isolados.txt (~340KB) — relatório DC isolados (TXT)
├── jest.config.base.js (2.0KB) — config Jest base
├── jest.config.db.js (2.2KB) — config Jest DB
├── jest.config.js (6.4KB) — config Jest principal
├── jest.setup.js (1.1KB) — setup global Jest
├── jest.teardown.js (634B) — teardown global Jest
├── jsconfig.json (504B) — paths JS/TS
├── knip.json (~15KB) — config Knip
├── load-tests.yml (12.3KB) — workflow load tests
├── next-sitemap.config.js (1.1KB) — config sitemap
├── next.config.js (5.6KB) — config Next.js
├── package-lock.json (~602KB) — lockfile npm
├── package.json (~7KB) — manifesto do projeto
├── proxy.js (2.5KB) — middleware Next.js
├── schema.knip.json (1113 linhas ~1.1MB) — schema Knip
├── security-tests.yml (12.3KB) — workflow security tests
├── skills-lock.json (945 linhas) — lockfile skills IA
└── tree.txt (1.3KB) — snapshot estrutura
```

---

## 15. Resumo das Recomendações

| Prioridade | Item | Arquivo(s) | Descrição |
|------------|------|------------|-----------|
| 🔴 Alta | 1.1 | `package.json` | Chave de projeto Cypress exposta no script `test:e2e:record` |
| 🔴 Alta | 2.1 | `proxy.js` + endpoints | Divergência de limites de rate limit entre proxy e endpoints |
| 🟠 Média | 1.2 | `package.json`, `README.md` | Inconsistência de versão do Node.js (24.18.0 vs 24.16.0 vs 24.15.0) |
| 🟠 Média | 1.3 | `jest.setup.js` | `console.log` de debug polui a saída dos testes |
| 🟠 Média | 2.2 | `next.config.js` | CORS inconsistente entre grupos de endpoints |
| 🟠 Média | 2.3 | `next.config.js` | `Access-Control-Allow-Origin` vazio quando `ALLOWED_ORIGINS` ausente |
| 🟠 Média | 3.1 | `README.md` | Contagens desatualizadas (28 vs 38 raiz; 53 vs 42 páginas) + refs a arquivos removidos |
| 🟠 Média | 3.2 | `proxy.js` | Lógica de IP duplicada com `lib/api/helpers.js` |
| 🟠 Média | 4.1 | `estrutura.*` (6 arquivos) | Artefatos de análise estática redundantes na raiz |
| 🟠 Média | 4.3 | `schema.knip.json` | Schema local grande; usar schema oficial online |
| 🟠 Média | 4.4 | `.dependency-cruiser.*.cjs` (4 arquivos) | Configurações com regras duplicadas |
| 🟠 Média | 5.1 | Múltiplos | Proliferação de arquivos grandes na raiz |
| 🟠 Média | 5.2 | `skills-lock.json` | Lockfile de IA na raiz; mover para `.agents/` |
| 🟠 Média | 5.3 | `ci.yml` | Workflow CI básico que replica parte de workflows existentes |
| 🟠 Média | 5.5 | Múltiplos Jest | 6 arquivos de configuração do Jest com responsabilidades distribuídas |
| 🟡 Baixa | 6.1 | `next-sitemap.config.js` | Queries ao banco no `additionalPaths` (dependência no build) |
| 🟡 Baixa | 6.2 | `proxy.js` | Rate limit em todas as requisições (latência em cache hits) |
| 🟢 Observação | 7.1 | `rate-limit-proxy.js` | Arquivo removido — não recriar (usar `proxy.js`) |
| 🟢 Observação | 7.2 | `test-base.yml` | Fora do escopo da raiz (subpasta `.github/workflows/`) |
| 🟡 Baixa | 13.1 | `tree.txt` | Possível código morto — snapshot estático sem script de geração |
| 🟡 Baixa | 13.2 | `ci.yml` | Possível código morto — workflow alternativo sem função claramente única |
| 🟡 Baixa | 13.3 | `skills-lock.json` | Possível código morto — lockfile de IA sem referência no projeto |

---

## 16. Pontos de Atenção Técnica para Revisão Futura (Resumo Rápido)

1. **`package.json`** — chave Cypress exposta — **correção prioritária** (mover para env + rotacionar).
2. **`proxy.js` vs endpoints** — limites de rate limit divergentes (30 vs 60/100/300 req/min) — precisa de política única.
3. **`next.config.js`** — CORS com comportamento diferente entre `/api/*` e `/api/admin|auth|helper/*`.
4. **`README.md`** — contagens e referências desatualizadas (arquivos removidos).
5. **`jest.setup.js`** — logs de debug na saída dos testes.
6. **Arquivos `estrutura.*`** — 6 artefatos redundantes de análise estática na raiz.
7. **`schema.knip.json` / `skills-lock.json` / `tree.txt`** — arquivos grandes que poluem a raiz.
8. **Configurações do Dependency Cruiser** — 4 arquivos com regras duplicadas, manutenção distribuída.
9. **Configurações do Jest** — 6 arquivos com responsabilidades distribuídas, potencial de complexidade.
10. **`ci.yml`** — workflow alternativo que pode ser redundante com workflows existentes.
