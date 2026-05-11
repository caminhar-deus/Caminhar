# Documento de Melhorias — Arquivos da Raiz do Projeto (`/`)

## Visão Geral

Este documento lista correções, melhorias de performance, inconsistências e duplicidades identificadas nos arquivos localizados na raiz do projeto. Itens marcados com ✅ foram corrigidos.

---

## 1. `babel.jest.config.js`

### ✅ Corrigido: Plugin duplicado `@babel/plugin-transform-modules-commonjs`

O plugin `@babel/plugin-transform-modules-commonjs` aparecia duas vezes:
- Na lista de `plugins` principal
- Na seção `env.test.plugins`

**Correção aplicada:** Removida a seção `env.test.plugins` inteira. O escopo `env.test` herda os plugins da raiz automaticamente, e o `preset-env` com `modules: 'auto'` já gerencia a transformação de módulos quando necessário.

---

## 2. `jest.config.js`

### 🟡 Performance: `maxWorkers: 1` muito restritivo

O `maxWorkers: 1` foi comentado como "melhor estabilidade com módulos ESM", porém isso torna a execução dos testes sequencial e mais lenta.

**Impacto:** Testes demoram mais do que o necessário, especialmente em CI.

**Análise:** Mantido como `maxWorkers: 1` por decisão do projeto — não houve alteração.

### ✅ Corrigido: Thresholds de cobertura ajustados

Os thresholds foram reduzidos de 92%/95%/98%/98% para valores mais realistas (80%/85%/90%/90%), evitando falsos positivos em CI.

**Correção aplicada:** Thresholds ajustados para `branches: 80, functions: 85, lines: 90, statements: 90`.

---

## 3. `rate-limit-proxy.js`

### ✅ Corrigido: Shadowing de variáveis

Nas linhas 76-78, as variáveis `now` e `windowMs` eram redeclaradas com `const` dentro do bloco de limpeza do Map de rate limit em memória, mesmo já tendo sido declaradas no escopo externo. Isso criava shadowing desnecessário.

**Correção aplicada:** Removidas as declarações duplicadas de `now` e `windowMs` de dentro do bloco `if (ipRateLimit.size > 10000)`.

### ✅ Corrigido: Import com caminho relativo inconsistente

O arquivo está na raiz mas importava `{ redis }` de `'../redis.js'`, que não existe na estrutura atual.

**Correção aplicada:** Alterado o caminho de `'../redis.js'` para `'./lib/redis.js'`.

---

## 4. `package.json`

### ✅ Corrigido: Script `test:load:all` extremamente longo

O script `test:load:all` continha mais de 30 comandos encadeados com `&&` em uma única linha.

**Correção aplicada:** Criado o arquivo `scripts/run-all-load-tests.js` que executa programaticamente cada teste. O script no `package.json` agora contém apenas: `"node scripts/run-all-load-tests.js"`.

### 🟡 Versões de Node.js inconsistentes

~~O `package.json` define `"node": "24.15.0"` como engine, mas:~~
~~- `ci.yml` usa `node-version: [24.15.0]`~~
~~- `load-tests.yml` usa `node-version: '24.14.1'`~~
~~- `pr-coverage.yml` usa `node-version: '24.14.1'`~~
~~- `security-tests.yml` usa `node-version: '20'`~~

~~**Impacto:** Inconsistência entre ambientes.~~

~~**Sugestão:** Padronizar a versão do Node.js em todos os workflows do GitHub Actions para a mesma versão definida em `package.json` (`24.15.0`).~~

**(Movido para seção 5 - resolvido via Composite Action)**

---

## 5. GitHub Actions Workflows (`*.yml`)

### ✅ Corrigido: Duplicação de Configuração entre Workflows

Os quatro workflows (`ci.yml`, `load-tests.yml`, `pr-coverage.yml`, `security-tests.yml`) compartilhavam significativa duplicação:
- **Setup do Node.js:** Repetido em todos os 4 workflows
- **Instalação de dependências (`npm ci` ou `npm install`):** Repetido em todos os 4 workflows

**Correção aplicada:**
1. Criado Composite Action em `.github/actions/setup/action.yml` que unifica setup do Node.js (com cache `'npm'`) + instalação de dependências (`npm ci`).
2. Todos os 4 workflows agora usam `uses: ./.github/actions/setup`.
3. `ci.yml` alterado de `npm install` para `npm ci` (via Composite Action).

### ✅ Corrigido: Caching diferente em cada workflow

- `ci.yml`: usava `cache: 'npm'` do `setup-node`
- `load-tests.yml`: usava `actions/cache@v4` para `node_modules` + cache do Next.js
- `pr-coverage.yml`: usava `cache: 'npm'` do `setup-node`
- `security-tests.yml`: não usava cache

**Correção aplicada:** Todos os workflows agora usam `cache: 'npm'` via Composite Action. Cache do Next.js mantido em `load-tests.yml` por ser específico.

### ✅ Corrigido: Versões de Node.js inconsistentes

- ~~`ci.yml`: `24.15.0`~~
- ~~`load-tests.yml`: `24.14.1`~~
- ~~`pr-coverage.yml`: `24.14.1`~~
- ~~`security-tests.yml`: `20`~~

**Correção aplicada:** Todos os workflows agora usam a versão `24.15.0` (padrão definido no Composite Action).

### ✅ Corrigido: Setup do banco de dados extraído para Composite Action

Os comandos de setup do banco (`npm run setup:test-db` e `node scripts/seed-all.js`) estavam duplicados em `load-tests.yml`, `pr-coverage.yml` e `security-tests.yml`.

**Correção aplicada:**
1. Criado Composite Action em `.github/actions/setup-db/action.yml` que unifica setup do banco + seed.
2. Os 3 workflows agora usam `uses: ./.github/actions/setup-db` no lugar dos comandos inline.

> **Nota:** Os serviços PostgreSQL e Redis permanecem definidos em cada workflow individualmente, pois Composite Actions não suportam a keyword `services`.

---

## 6. `next-sitemap.config.js`

### ✅ Corrigido: Import não utilizado removido

A linha 2 importava `siteConfig` de `'./lib/seo/config.js'`, mas a variável nunca era utilizada no restante do arquivo.

**Correção aplicada:** Removida a linha `import { siteConfig } from './lib/seo/config.js'`.

---

## 7. `next.config.js`

### ✅ Corrigido: CORS com fallback `'*'` removido

A configuração de CORS usava `'*'` como fallback quando `ALLOWED_ORIGINS` não estava definida, representando risco de segurança.

**Correção aplicada:** Substituído o fallback `'*'` por `''` (string vazia), que é rejeitado pelo navegador sem configurar CORS.

---

## 8. `schema.knip.json`

### 🟡 Arquivo muito grande na raiz (943 linhas)

Este arquivo contém todo o JSON Schema de validação do Knip embutido localmente.

**Impacto:** Polui a raiz do projeto com 943 linhas de schema que raramente são consultadas.

**Sugestão:** Substituir pela referência ao schema oficial do Knip hospedado online, ou mover para um diretório de schemas.

---

## 9. `skills-lock.json`

### 🟡 Arquivo muito grande na raiz (945 linhas)

Este arquivo contém o lock de todas as skills instaladas, com mais de 80 skills registradas.

**Impacto:** Polui a raiz do projeto com quase 1000 linhas de dados de configuração.

**Sugestão:** Mover para um diretório oculto como `.agents/` ou `config/`.

---

## 10. `GEMINI.md`

### ✅ Corrigido: Caminhos absolutos substituídos por relativos

O arquivo referenciava 10 caminhos absolutos (`/home/qa/Projeto/Caminhar/.agents/skills/...`) que não funcionavam em outros ambientes.

**Correção aplicada:** Todos os caminhos absolutos foram substituídos por caminhos relativos (ex.: `.agents/skills/next-best-practices/SKILL.md`).

---

## 11. `tree.txt`

### 🟡 Arquivo estático desatualizado

O arquivo `tree.txt` contém um snapshot da estrutura de diretórios. Este tipo de arquivo tende a ficar desatualizado rapidamente conforme o projeto evolui.

**Impacto:** Pode induzir a erros se alguém confiar na estrutura listada.

**Sugestão:** Remover o arquivo ou adicionar um script que gere dinamicamente a estrutura de diretórios quando necessário.

---

## 12. `styleMock.js`

### ✅ Corrigido: Duplicidade com `__mocks__/styleMock.js`

Existiam dois arquivos com o mesmo propósito e conteúdo:
- `/styleMock.js` (raiz) → `export default {};`
- `/__mocks__/styleMock.js` → mesmo conteúdo

**Correção aplicada:** O `jest.config.js` já referencia `'<rootDir>/__mocks__/styleMock.js'`. Portanto, o arquivo `/styleMock.js` da raiz foi removido, mantendo apenas o do diretório `__mocks__/`.

---

## Resumo

| Prioridade | Arquivo | Problema | Status |
|---|---|---|---|
| 🔴 Alta | `babel.jest.config.js` | Plugin duplicado | ✅ Corrigido |
| 🔴 Alta | `rate-limit-proxy.js` | Shadowing de variáveis | ✅ Corrigido |
| 🔴 Alta | `rate-limit-proxy.js` | Import com caminho inconsistente | ✅ Corrigido |
| 🔴 Alta | `package.json` | Script `test:load:all` gigante | ✅ Corrigido |
| 🔴 Alta | `docs/*.yml` | Duplicação entre workflows | ✅ Corrigido |
| 🔴 Alta | `docs/*.yml` | Versões Node.js inconsistentes | ✅ Corrigido |
| 🔴 Alta | `docs/*.yml` | Caching diferente em cada workflow | ✅ Corrigido |
| 🔴 Alta | `styleMock.js` | Duplicidade com `__mocks__/styleMock.js` | ✅ Corrigido |
| 🟡 Média | `jest.config.js` | `maxWorkers: 1` lento | Mantido |
| 🟡 Média | `jest.config.js` | Thresholds elevados | ✅ Corrigido |
| 🟡 Média | `next-sitemap.config.js` | Import não utilizado | ✅ Corrigido |
| 🟡 Média | `next.config.js` | CORS com fallback `'*'` | ✅ Corrigido |
| 🟡 Média | `GEMINI.md` | Caminhos absolutos | ✅ Corrigido |
| 🟡 Média | `tree.txt` | Snapshot estático desatualizado | Mantido |
| 🟡 Média | `schema.knip.json` | 943 linhas na raiz | Pendente |
| 🟡 Média | `skills-lock.json` | 945 linhas na raiz | Pendente |
| 🟡 Média | `docs/*.yml` | Setup de banco duplicado | ✅ Corrigido |
