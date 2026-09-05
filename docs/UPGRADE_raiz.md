# Documento de Melhorias — Arquivos da Raiz do Projeto (`/`)

> **Data da análise:** 02/08/2026
> **Objetivo:** Levantamento analítico de possíveis melhorias identificadas nos 31 arquivos atuais da raiz do projeto. **Nenhuma correção deve ser aplicada** — apenas documentar.
> **Baseado em:** Análise profunda dos arquivos atuais da raiz (02/08/2026), com apoio dos documentos anteriores em `/docs/antigos/` e `/docs/resolvidos/` apenas quando relevantes. Em caso de divergência, prevalece a análise atual.

---

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

**Problema:** O README informa "28 arquivos" na raiz e "53 arquivos" em páginas, mas a análise atual identifica **31 arquivos** na raiz e **42** em páginas. O README também cita `generateTokensCSS.js` e Design Tokens (11 arquivos) que foram **removidos** do projeto.

**Impacto:** Documentação desatualizada que induz a erro novos desenvolvedores sobre a estrutura real do projeto.

**Sugestão:** Atualizar o README com as contagens corretas (31 raiz, 42 páginas) e remover referências a arquivos que não existem mais (`generateTokensCSS.js`, tokens JS).

---

### 3.2 `proxy.js` — lógica de IP duplicada com `lib/api/helpers.js`

**Arquivo:** `/proxy.js`

**Problema:** O `proxy.js` reimplementa a lógica de extração de IP (`x-forwarded-for` + `request.ip` + normalização de localhost) que já existe em `lib/api/helpers.js` (`getClientIP`/`detectSpoofedIP`).

**Impacto:** Duplicidade de lógica de segurança; se a estratégia de detecção de IP evoluir (ex: confiar em `request.ip` em produção), o proxy pode divergir dos endpoints.

**Sugestão:** Avaliar se o `proxy.js` pode reutilizar a lógica de `lib/api/helpers.js` (respeitando as limitações do ambiente Edge/Middleware do Next.js, que pode não ter acesso a todas as funções da lib).

---

## 4. Duplicidade de Código e Arquivos

### 4.1 Arquivos `estrutura.*` redundantes na raiz

**Arquivos:** `/estrutura.html`, `/estrutura_extras.html`, `/estrutura.txt`, `/estrutura_extras.txt`

**Problema:** São 4 artefatos de análise estática do `dependency-cruiser` (~1.1 MB cada HTML, ~340 linhas cada TXT) que não fazem parte do código-fonte nem do build. `estrutura_extras.txt` é quase idêntico a `estrutura.txt` (diferença: inclui `backups.js → scripts/backup.js` e sub-dependências).

**Impacto:** Poluem a raiz, aumentam o tamanho do repositório e podem desatualizar. `estrutura_extras.txt` é redundante com `estrutura.txt`.

**Sugestão:** Remover os 4 arquivos ou movê-los para `reports/` (que já é ignorado pelo ESLint e pelo Git). Manter apenas um formato (HTML ou TXT) se necessário.

---

### 4.2 `tree.txt` — snapshot estático desatualizado

**Arquivo:** `/tree.txt`

**Problema:** Snapshot da estrutura de diretórios (1253 linhas, 194 diretórios, 1057 arquivos) que tende a desatualizar rapidamente.

**Impacto:** Informação desatualizada; o arquivo já difere da estrutura real (ex: lista `coverage/` e `logs/` que são gerados).

**Sugestão:** Remover ou adicionar um script para gerá-lo dinamicamente (`npm run generate-tree`), ou documentar que é um snapshot de referência.

---

### 4.3 `schema.knip.json` — schema local grande

**Arquivo:** `/schema.knip.json` (1113 linhas)

**Problema:** Schema JSON do Knip embutido localmente, usado apenas como `$schema` do `knip.json` para validação no editor.

**Impacto:** Arquivo grande na raiz que pode ser substituído pela referência ao schema oficial online.

**Sugestão:** Substituir `"$schema": "./schema.knip.json"` por `"$schema": "https://json.schemastore.org/knip.json"` e remover o arquivo local.

---

## 5. Manutenibilidade e Padronização

### 5.1 Proliferação de arquivos grandes na raiz

**Arquivos:** `schema.knip.json` (1113 linhas), `skills-lock.json` (945 linhas), `tree.txt` (1253 linhas), `package-lock.json` (~602 KB), `estrutura.html`/`estrutura_extras.html` (~1.1 MB cada)

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

### 5.3 `GEMINI.md` — caminhos relativos frágeis

**Arquivo:** `/GEMINI.md`

**Problema:** Referencia `.agents/skills/...` com caminhos relativos que funcionam apenas quando o diretório de trabalho é a raiz.

**Impacto:** Se o assistente de IA for invocado de outro diretório, os caminhos quebram.

**Sugestão:** Documentar que os caminhos são relativos à raiz, ou usar caminhos absolutos/instruções de contexto.

---

### 5.4 `knip.json` — entradas obsoletas em `ignoreDependencies` corrigidas

**Arquivo:** `/knip.json`

**Problema:** As dependências `@babel/preset-env` e `@babel/preset-react` estavam em `ignoreDependencies`, mas passaram a ser detectadas como usadas pelo Knip (configuração Babel referenciada pelo transformer `babel-jest` em `jest.config.base.js`), gerando avisos de "Configuration hints" na execução do `npm run knip`.

**Impacto:** Configuração com entradas desnecessárias e avisos recorrentes na ferramenta de análise.

**Sugestão:** Remover as duas entradas de `ignoreDependencies` e adicionar `treatConfigHintsAsErrors: true` para que dicas de configuração pendentes façam o Knip falhar (exit code 1) — **aplicada** no `knip.json` atual.

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

**Problema:** O `test-base.yml` é referenciado pelos workflows da raiz (`pr-coverage.yml`, `load-tests.yml`, `security-tests.yml`) mas está em `.github/workflows/` (subpasta), fora do escopo desta análise de raiz.

**Impacto:** Nenhum — apenas nota de escopo. Os workflows da raiz dependem dele, mas ele não é um arquivo da raiz.

**Sugestão:** Nenhuma ação necessária; apenas registro para contexto.

---

## Resumo das Recomendações

| Prioridade | Item | Arquivo(s) | Descrição |
|:----------:|:----:|:----------:|-----------|
| 🔴 Alta | 1.1 | `package.json` | Chave de projeto Cypress exposta no script `test:e2e:record` |
| 🔴 Alta | 2.1 | `proxy.js` + endpoints | Divergência de limites de rate limit entre proxy e endpoints |
| 🟠 Média | 1.2 | `package.json`, `README.md` | Inconsistência de versão do Node.js (24.18.0 vs 24.16.0) |
| 🟠 Média | 1.3 | `jest.setup.js` | `console.log` de debug polui a saída dos testes |
| 🟠 Média | 2.2 | `next.config.js` | CORS inconsistente entre grupos de endpoints |
| 🟠 Média | 2.3 | `next.config.js` | `Access-Control-Allow-Origin` vazio quando `ALLOWED_ORIGINS` ausente |
| 🟠 Média | 3.1 | `README.md` | Contagens desatualizadas (28 vs 31 raiz; 53 vs 42 páginas) + refs a arquivos removidos |
| 🟠 Média | 3.2 | `proxy.js` | Lógica de IP duplicada com `lib/api/helpers.js` |
| 🟠 Média | 4.1 | `estrutura.*` (4 arquivos) | Artefatos de análise estática redundantes na raiz |
| 🟠 Média | 4.2 | `tree.txt` | Snapshot estático desatualizado |
| 🟠 Média | 4.3 | `schema.knip.json` | Schema local grande; usar schema oficial online |
| 🟠 Média | 5.1 | Múltiplos | Proliferação de arquivos grandes na raiz |
| 🟠 Média | 5.2 | `skills-lock.json` | Lockfile de IA na raiz; mover para `.agents/` |
| 🟡 Baixa | 5.3 | `GEMINI.md` | Caminhos relativos frágeis |
| 🟡 Baixa | 6.1 | `next-sitemap.config.js` | Queries ao banco no `additionalPaths` (dependência no build) |
| 🟡 Baixa | 6.2 | `proxy.js` | Rate limit em todas as requisições (latência em cache hits) |
| 🟢 Observação | 7.1 | `rate-limit-proxy.js` | Arquivo removido — não recriar (usar `proxy.js`) |
| 🟢 Observação | 7.2 | `test-base.yml` | Fora do escopo da raiz (subpasta `.github/workflows/`) |

---

## Pontos de Atenção Técnica para Revisão Futura (Resumo Rápido)

1. **`package.json`** — chave Cypress exposta — **correção prioritária** (mover para env + rotacionar).
2. **`proxy.js` vs endpoints** — limites de rate limit divergentes (30 vs 60/100/300 req/min) — precisa de política única.
3. **`next.config.js`** — CORS com comportamento diferente entre `/api/*` e `/api/admin|auth|helper/*`.
4. **`README.md`** — contagens e referências desatualizadas (arquivos removidos).
5. **`jest.setup.js`** — logs de debug na saída dos testes.
6. **Arquivos `estrutura.*`** — 4 artefatos redundantes de análise estática na raiz.
7. **`schema.knip.json` / `skills-lock.json` / `tree.txt`** — arquivos grandes que poluem a raiz.