# 📁 Scripts — Levantamento Analítico de Melhorias

> **Projeto:** Caminhar  
> **Diretório analisado:** `/scripts`  
> **Data da análise:** 02/08/2026  
> **Natureza:** Apenas levantamento analítico. Nenhuma alteração foi aplicada neste documento.

---

## Índice

1. [Correções de Código Necessárias](#1-correções-de-código-necessárias)
2. [Duplicidade de Código](#2-duplicidade-de-código)
3. [Duplicidade de Textos e Conteúdos](#3-duplicidade-de-textos-e-conteúdos)
4. [Ajustes Estruturais e Organizacionais](#4-ajustes-estruturais-e-organizacionais)
5. [Melhorias de Ferramenta, Manutenção e Performance](#5-melhorias-de-ferramenta-manutenção-e-performance)
6. [Pontos de Atenção Técnicos](#6-pontos-de-atenção-técnicos)
7. [Arquivos Irrelevantes ou Legados](#7-arquivos-irrelevantes-ou-legados)
8. [Matriz de Prioridade](#8-matriz-de-prioridade)

---

## 1. Correções de Código Necessárias

### 1.1. Referência quebrada em `scripts/db/verify-db-functions.js`
- **Arquivo:** `scripts/db/verify-db-functions.js`
- **Problema:** A linha 2 faz `import * as db from './db.js'`, mas **não existe `scripts/db/db.js`** — apenas `connection.js`.
- **Impacto:** O script falha com `ERR_MODULE_NOT_FOUND` ao ser executado.
- **Sugestão:** Importar de `../utils/load-env.js` (para `loadEnv`) e verificar as funções do módulo real `lib/infra/db.js` (conforme o propósito declarado), ou remover o script se desnecessário.

### 1.2. Script `scripts/db/verify-migration.js` é um handler Next.js, não um script CLI
- **Arquivo:** `scripts/db/verify-migration.js`
- **Problema:** O arquivo exporta `withAuth(handler)` como default export (padrão de API route do Next.js) e importa de `../../../lib/auth/auth` e `../../../lib/infra/db` **sem extensão `.js`** — incompatível com ES Modules estrito. Localizado em `scripts/db/`, onde se esperam scripts executáveis.
- **Impacto:** Não pode ser executado via `node`; se executado, quebra por falta de extensão nos imports.
- **Sugestão:** Mover para `pages/api/` (ex: `pages/api/verify-migration.js`) se for um endpoint, ou reescrever como script CLI usando `db/connection.js`. Remover do diretório `scripts/db/` para evitar confusão.

### 1.3. Credenciais hardcoded em `scripts/tests/manual-api-test.js`
- **Arquivo:** `scripts/tests/manual-api-test.js`
- **Problema:** Linha 26-27 usa `username: 'admin'` e `password: 'password'` fixos.
- **Risco:** Vazamento de credenciais se o repositório for exposto; teste falha se a senha real for diferente.
- **Sugestão:** Ler de variáveis de ambiente (`ADMIN_USERNAME`, `ADMIN_PASSWORD`) com fallback, seguindo o padrão já usado em `generate-load-report.js`.

### 1.4. Caminho `.env` incorreto em vários scripts de subpastas
- **Arquivos afetados:**
  - `scripts/utils/list-settings.js`, `list-table-columns.js`, `update-setting.js`
  - `scripts/diagnostics/diagnose-hero.js`
  - `scripts/maintenance/backup-posts.js`, `restore-posts.js`, `fix-hero-key.js`
- **Problema:** Todos usam `dotenv.config({ path: path.resolve(__dirname, '../.env') })`. Como `__dirname` aponta para `scripts/<subpasta>/`, o caminho resolve para `scripts/.env` — **que não existe**. O `.env` fica na raiz do projeto.
- **Impacto:** Variáveis de ambiente não são carregadas nesses scripts quando executados diretamente; dependem de variáveis já exportadas no shell.
- **Sugestão:** Usar `loadEnv()` de `scripts/utils/load-env.js` (que usa `process.cwd()`, correto) — o mesmo padrão já adotado nos demais scripts. Para `maintenance/`, o caminho correto seria `../../.env`.

### 1.5. Interpolação direta em SQL em `scripts/clean-orphaned-images.js`
- **Arquivo:** `scripts/clean-orphaned-images.js` (linha 34)
- **Problema:** `SELECT ${column} FROM ${table}` interpola nomes diretamente. Embora venham de whitelist fixa interna, é o mesmo padrão que o projeto evita em outros lugares.
- **Sugestão:** Adicionar validação com `validateIdentifier()` (já existente em `scripts/utils/init-table-utils.js`) antes da interpolação, ou manter whitelist explícita com verificação em runtime.

### 1.6. Terceiro argumento ignorado em `seed-products.js`
- **Arquivo:** `scripts/seed-products.js` (linha 36)
- **Problema:** `query(sql, params, { log: false })` — a `query()` de `scripts/db/connection.js` aceita apenas `(text, params)`. O terceiro argumento `{ log: false }` é **silenciosamente ignorado**.
- **Impacto:** Falso controle de log; o comportamento real não é o esperado pelo autor.
- **Sugestão:** Remover o terceiro argumento ou estender `query()` para suportar opções (se o objetivo for controlar logging).

### 1.7. Caminho de backup incorreto em `scripts/maintenance/backup-posts.js` e `restore-posts.js`
- **Arquivos:** `scripts/maintenance/backup-posts.js`, `scripts/maintenance/restore-posts.js`
- **Problema:** Usam `path.resolve(__dirname, '../data/backups')` → resolve para `scripts/data/backups`, mas o diretório real de backups é `data/backups` na raiz (usado por `backup.js`, `create-backup.js` etc.).
- **Impacto:** Backups de posts são gravados/lidos em local diferente do sistema de backup principal — inconsistência de dados.
- **Sugestão:** Usar `path.resolve(process.cwd(), 'data', 'backups')` alinhado ao `backup.js`.

### 1.8. `req.abort()` obsoleto em `scripts/check-server.js`
- **Arquivo:** `scripts/check-server.js` (linha 21)
- **Problema:** `req.abort()` está marcado como deprecated nas versões recentes do Node.js.
- **Sugestão:** Substituir por `req.destroy()`.

---

## 2. Duplicidade de Código

### 2.1. `scripts/utils/cleanup-test-data.js` duplicata funcional de `scripts/clean-load-test-posts.js`
- **Arquivos:** `scripts/utils/cleanup-test-data.js` e `scripts/clean-load-test-posts.js`
- **Problema:** Ambos removem posts com slug `post-carga-%` da tabela `posts`, usando o mesmo módulo `cleanup.js`. O primeiro usa apenas `['post-carga-%']`; o segundo usa `['post-carga-%', 'k6-%']`.
- **Sugestão:** Unificar em um único entry point (ex: manter apenas `clean-load-test-posts.js` com os dois padrões) e remover o duplicado, ou fazer um chamar o outro.

### 2.2. `scripts/diagnostics/check-musicas-schema.js` e `check-videos-schema.js` praticamente idênticos
- **Arquivos:** `scripts/diagnostics/check-musicas-schema.js`, `scripts/diagnostics/check-videos-schema.js`
- **Problema:** Código idêntico (52 linhas cada), diferindo apenas no nome da tabela consultada (`musicas` vs `videos`).
- **Sugestão:** Unificar em um único script parametrizável `check-table-schema.js <tabela>`, ou um módulo compartilhado com a query.

### 2.3. Padrões conflitantes de conexão com o banco
- **Arquivos:** `scripts/db/connection.js` (padrão oficial) versus vários scripts que criam `new Pool({ connectionString: ... })` próprio.
- **Ocorrências do padrão antigo:** `clean-orphaned-images.js`, `utils/list-settings.js`, `utils/list-table-columns.js`, `utils/update-setting.js`, `diagnostics/check-musicas-schema.js`, `diagnostics/check-videos-schema.js`, `diagnostics/count-posts.js`, `diagnostics/diagnose-hero.js`, `diagnostics/list-last-posts.js`, `maintenance/backup-posts.js`, `maintenance/fix-hero-key.js`, `maintenance/restore-posts.js`, `maintenance/video-thumbnails.js`.
- **Sugestão:** Migrar todos para `getPool()`/`closePool()` de `scripts/db/connection.js`, como já feito em ~13 scripts. Isso também padroniza o fechamento de conexão.

### 2.4. Duplicidade de orquestração de testes k6
- **Arquivos:** `scripts/generate-load-report.js` (6 testes) e `scripts/run-all-load-tests-sequentially.js` (30 testes)
- **Problema:** O primeiro roda um subconjunto dos testes do segundo (authenticated-flow, create-post-flow, videos/musicas CRUD e load se sobrepõem). Duas fontes de verdade para "como rodar testes de carga".
- **Sugestão:** Fazer `generate-load-report.js` consumir a lista do orquestrador principal, ou extrair um catálogo de testes compartilhado.

---

## 3. Duplicidade de Textos e Conteúdos

### 3.1. Comentários de cabeçalho duplicados em diagnósticos
- **Arquivos:** `scripts/diagnostics/check-musicas-schema.js` e `check-videos-schema.js`
- **Problema:** Header/docstrings idênticos (mesma descrição, mesmos avisos), trocando apenas o nome da tabela.
- **Sugestão:** Eliminados naturalmente pela unificação proposta em 2.2.

### 3.2. Documentação de cron repetida
- **Arquivos:** `scripts/init-backup.js`, `scripts/monitor-disk-space.js`
- **Problema:** O mesmo padrão de instrução de crontab (backup diário às 2AM, monitor a cada hora) aparece em comentários de múltiplos arquivos.
- **Sugestão:** Centralizar a documentação de agendamento em um único lugar (ex: `README.md` ou seção única no código) para evitar divergência.

### 3.3. Constantes de diretórios definidas em local e também no `constants.js`
- **Arquivo:** `scripts/clean-k6-reports.js` (linha 7)
- **Problema:** Define `const REPORTS_DIR = path.join(process.cwd(), 'reports', 'k6-summaries')` **apesar de `K6_SUMMARY_DIR` já existir** em `scripts/utils/constants.js`.
- **Sugestão:** Reutilizar `K6_SUMMARY_DIR` do módulo compartilhado (DRY).

---

## 4. Ajustes Estruturais e Organizacionais

### 4.1. `scripts/db/verify-migration.js` no local errado
- Ref.: item 1.2. Deveria ser endpoint de API em `pages/api/` ou reescrito como script. A pasta `scripts/db/` deveria conter apenas ferramentas de banco.

### 4.2. `scripts/db/verify-db-functions.js` órfão quebrado
- Ref.: item 1.1. Ou é consertado (importando `lib/infra/db.js`) ou removido — atualmente é código morto que falha.

### 4.3. Migração `012-add-performance-indexes.sql` fora do fluxo do executor
- **Arquivo:** `scripts/migrations/012-add-performance-indexes.sql`
- **Problema:** `migrate.js` filtra apenas `NNN-*.js` (`/^\d{3}-.+\.js$/`). O arquivo `.sql` **nunca é executado** pelo executor central — fica dependente de aplicação manual.
- **Sugestão:** Converter para `.js` exportando `up(client)`/`down(client)` (padrão das demais), ou estender o executor para suportar `.sql`.

### 4.4. `validate-schema.js` e `verify-applied.js` desatualizados em relação às migrações
- **Arquivos:** `scripts/validate-schema.js`, `scripts/migrations/verify-applied.js`
- **Problema:**
  - `EXPECTED_SCHEMA` em `validate-schema.js` não inclui `products`, `dicas`, `activity_logs`, `refresh_tokens` — tabelas criadas pelas migrações 002, 006, 014-016.
  - `verify-applied.js` cobre apenas migrações 001-011; ignora 012-016.
- **Sugestão:** Ampliar ambos para refletir o schema atual completo.

### 4.5. `seed-migrations-table.js` não registra migrações de índice (012-014)
- **Arquivo:** `scripts/migrations/seed-migrations-table.js`
- **Problema:** A lista `MIGRATIONS` contém 001-009, 011, 015, 016 — mas omite 012, 013, 014 (índices). Se essas migrações foram aplicadas manualmente, ficarão como "pendentes" no `--status`.
- **Sugestão:** Revisar a lista para incluir todas as migrações existentes (após converter 012 para `.js`).

---

## 5. Melhorias de Ferramenta, Manutenção e Performance

### 5.1. Padronizar carregamento de ambiente em TODOS os scripts
- **Problema:** O projeto adotou `loadEnv()` de `scripts/utils/load-env.js` como fonte única, mas ainda há scripts com `dotenv.config()` manual (alguns com caminho errado — item 1.4) e `check-env.js` usa `@next/env`.
- **Sugestão:** Migrar os remanescentes para `loadEnv()` e, no caso de `check-env.js`, avaliar se `@next/env` é realmente necessário.

### 5.2. Substituir `execSync`/`exec` por `spawn` nos orquestradores de teste
- **Arquivos:** `scripts/run-all-load-tests-sequentially.js` (`execSync` com `shell: true`), `scripts/generate-load-report.js` (`execAsync` com concatenação)
- **Problema:** Uso de shell com concatenação de string para comandos que incluem variáveis de ambiente (`ADMIN_PASSWORD` etc.). Se uma senha contiver `$`, `;`, aspas, etc., há risco de quebra ou injeção de comando.
- **Sugestão:** Usar `spawn('k6', ['run', ...], { env })` com array de argumentos — mesmo padrão seguro já usado em `backup.js`.

### 5.3. `seed-all.js` executa `npm run db:reset` via shell
- **Arquivo:** `scripts/seed-all.js` (linha 52)
- **Problema:** Invocar `npm` para resetar o banco acopla o seed ao gerenciador de pacotes (lento, dependente de npm instalado, frágil em CI).
- **Sugestão:** Importar e chamar as funções de reset diretamente (ex: `init-table.js` para as tabelas), ou documentar explicitamente a pré-condição.

### 5.4. `warm-routes.js` com valores hardcoded sensíveis
- **Arquivo:** `scripts/warm-routes.js`
- **Problema:**
  - Slugs de teste/seed fixos (`mulher-virtuosa`, `post-inexistente`, slugs de seed) — desatualizam se os seeds mudarem.
  - Rota de dados SSR hardcoded como `/_next/data/development/...` — o build pode usar `_next/data/<buildId>` (diferente de "development") em produção.
- **Sugestão:** Tornar slugs configuráveis via args/env e detectar o buildId real (ou rodar apenas contra dev).

### 5.5. `monitor-disk-space.js` — recomendação desatualizada
- **Arquivo:** `scripts/monitor-disk-space.js` (linha 264)
- **Problema:** Quando o disco está cheio, sugere `npm run find-unused` — comando que não existe no `package.json` (não verificado na análise). Verificar se o alias existe; caso contrário, atualizar a mensagem.
- **Sugestão:** Confirmar no `package.json` qual script npm de limpeza realmente existe (ex: limpeza de relatórios k6, backups antigos) e ajustar a dica para apontar o comando correto.

### 5.6. `manual-api-test.js` assume estrutura fixa de resposta
- **Arquivo:** `scripts/tests/manual-api-test.js`
- **Problema:** Acessa `response.data.data.api.status`, `.data.data.database.status`, etc. — estrutura frágil; qualquer mudança na API quebra o teste sem mensagem clara.
- **Sugestão:** Adicionar validação de campos antes do acesso, com mensagens descritivas.

---

## 6. Pontos de Atenção Técnicos

### 6.1. `check-sql-injection.js` — arquivos de referência desatualizados
- **Arquivo:** `scripts/check-sql-injection.js`
- **Problema:** `IGNORE_FILES` referencia `rate-limit-proxy.js`, mas o arquivo real na raiz é `proxy.js`. Os comentários em `clear-test-auth-locks.js` também citam `rate-limit-proxy.js`.
- **Impacto:** Se `rate-limit-proxy.js` não existe, a entrada é inócua; mas `proxy.js` (que faz rate limiting) não está na lista de ignore e será escaneado — possivelmente gerando falso positivo.
- **Sugestão:** Atualizar a lista de ignore para refletir os arquivos reais (`proxy.js`).

### 6.2. `clean-db.js` TRUNCATE com lista de tabelas fixa
- **Arquivo:** `scripts/clear-db.js`
- **Problema:** `TRUNCATE TABLE posts, videos, musicas, images, settings, users` — não inclui `products`, `dicas`, `activity_logs`, `refresh_tokens`. Novas tabelas ficam de fora da limpeza "completa".
- **Sugestão:** Usar `TRUNCATE ... CASCADE` com `information_schema` dinâmico ou manter a lista atualizada.

### 6.3. `backup.js` — `try/catch` vazio mascarando erros de descriptografia
- **Arquivo:** `scripts/backup.js` (restoreBackup, bloco de descriptografia)
- **Problema:** O `try` que tenta descriptografar captura qualquer erro e cai no `catch` que silenciosamente verifica se o arquivo plano existe — se existir, assume que "já está descriptografado". Isso pode mascarar falhas reais de descriptografia (chave errada, arquivo corrompido).
- **Sugestão:** Distinguir "arquivo `.enc` não encontrado" de "falha na descriptografia" (ex: `ERR_OSSL_WRONG_FINAL_BLOCK_LENGTH`), logando o erro no segundo caso.

### 6.4. `seed-products.js` — dependência de API externa (`faker.image.urlLoremFlickr`)
- **Arquivo:** `scripts/seed-products.js`
- **Problema:** URLs de imagem são geradas com chamada à API LoremFlickr (`faker.image.urlLoremFlickr`) — requer internet e pode gerar imagens não relacionadas ao contexto religioso.
- **Sugestão:** Usar URLs locais (`/uploads/...`) ou imagens estáticas de placeholder no projeto, mantendo o seed offline.

### 6.5. `db-shell.js` — argumento posicional para `psql`
- **Arquivo:** `scripts/db-shell.js`
- **Problema:** `spawn('psql', [dbUrl])` — funciona, mas é frágil; o idioma padrão é `psql -d <dbUrl>`. Algumas versões do `psql` interpretam o primeiro argumento posicional como nome de database, não como connection string.
- **Sugestão:** Usar `spawn('psql', ['-d', dbUrl])` para compatibilidade explícita.

### 6.6. `init-table.js` — resolução de caminho via `URL.pathname`
- **Arquivo:** `scripts/init-table.js` (linha 24)
- **Problema:** `new URL('./schemas', import.meta.url).pathname` pode produzir caminhos com prefixo `/` em Windows (ex: `/C:/projeto/...`), quebrando `readFileSync`.
- **Sugestão:** Usar `fileURLToPath(new URL('./schemas', import.meta.url))` para portabilidade.

### 6.7. `run-all-load-tests-sequentially.js` — comando shell para teste negativo
- **Arquivo:** `scripts/run-all-load-tests-sequentially.js` (linha 112)
- **Problema:** `-e ADMIN_USERNAME= -e ADMIN_PASSWORD=` é embutido na string de comando com `shell: true`. Se o shell interpretar os espaços/vazios de forma diferente, o teste pode não rodar como esperado.
- **Sugestão:** Definir env vars vazias no `env` do `spawn` em vez de concatenar na string.

---

## 7. Arquivos Irrelevantes ou Legados

### 7.1. `scripts/clean-test-db.js`
- **Problema:** Remove bancos SQLite locais (`data/test.db`, `caminhar-test.db`), mas o projeto usa PostgreSQL. Sem referências ativas identificadas na análise.
- **Classificação:** Provável legado de fase anterior do projeto; pode ser mantido para compatibilidade ou removido após confirmação.

### 7.2. `scripts/db/verify-db-functions.js`
- **Problema:** Quebrado (item 1.1) sem função útil atualmente.
- **Classificação:** Código morto; consertar ou remover.

### 7.3. `scripts/db/verify-migration.js`
- **Problema:** Handler de API fora do lugar (item 1.2).
- **Classificação:** Deslocado; mover para `pages/api/` ou remover de `scripts/`.

---

## 8. Matriz de Prioridade

| # | Problema | Gravidade | Esforço | Prioridade |
|---|----------|:---------:|:-------:|:----------:|
| 1.1 | Referência quebrada `verify-db-functions.js` | 🔴 Alta | Baixo | **Crítica** |
| 1.3 | Credenciais hardcoded em `manual-api-test.js` | 🔴 Alta | Baixo | **Crítica** |
| 1.4 | Caminho `.env` incorreto em scripts de subpastas | 🟡 Média | Baixo | Alta |
| 4.3 | Migração 012 `.sql` fora do executor | 🟡 Média | Médio | Alta |
| 6.2 | `clear-db.js` sem tabelas novas (products, dicas, etc.) | 🟡 Média | Baixo | Alta |
| 2.2 | `check-musicas-schema`/`check-videos-schema` duplicados | 🟢 Baixa | Baixo | Média |
| 2.1 | `cleanup-test-data.js` duplicata de `clean-load-test-posts.js` | 🟢 Baixa | Baixo | Média |
| 1.2 | `verify-migration.js` no local errado | 🟡 Média | Médio | Média |
| 1.5 | Interpolação SQL em `clean-orphaned-images.js` | 🟡 Média | Baixo | Média |
| 5.2 | `execSync`/`exec` com shell nos orquestradores | 🟡 Média | Médio | Média |
| 4.4 | `validate-schema`/`verify-applied` desatualizados | 🟢 Baixa | Baixo | Média |
| 2.3 | Padrões conflitantes de conexão (Pool próprio vs `connection.js`) | 🟢 Baixa | Médio | Média |
| 6.6 | `URL.pathname` em `init-table.js` (Windows) | 🟢 Baixa | Baixo | Baixa |
| 5.4 | `warm-routes.js` hardcoded (slugs e `_next/data/development`) | 🟢 Baixa | Médio | Baixa |
| 2.4 | Orquestradores k6 duplicados | 🟢 Baixa | Médio | Baixa |
| 7.x | Arquivos legados/deslocados (`clean-test-db`, `db/*`) | 🟢 Baixa | Baixo | Baixa |

---

## Implementações Aplicadas

### `warm-routes.js` — `API_ROUTES` ampliada

**Descrição:** As rotas de API aquecidas no modo `--api` foram ampliadas com `/api/settings` e `/api/placeholder-image`, passando a cobrir também as rotas que apareciam como `[Performance] Slow resource` no primeiro carregamento em dev.

---

### `scripts/migrations/000-create-base-schema.js` — baseline de schema em banco vazio

**Descrição:** Nova migração `000` (executa primeiro na ordem numérica) cria o schema base completo em instalações limpas: `posts`, `videos`, `musicas` e `dicas` reaproveitando `scripts/schemas/*.json` via `buildCreateTableSQL`/`loadSchemaFromDir`, e `users`, `settings`, `images`, `categories`, `tags`, `post_categories`, `post_tags`, `roles` definidas inline — todas com `CREATE TABLE IF NOT EXISTS` (idempotente). Resolve o erro `relation "posts" does not exist` ao executar `npm run migrate` em banco recém-criado.

---

### `scripts/migrations/012-add-performance-indexes.js` — conversão de `.sql` para `.js`

**Descrição:** Item 4.3 resolvido: `012-add-performance-indexes.sql` (ignorado pelo executor por não seguir o padrão `NNN-*.js`) foi convertido para `012-add-performance-indexes.js`, no padrão das demais migrações (`SQL`/`ROLLBACK_SQL` + `up(client)`/`down(client)`). Agora é executado pelo `migrate.js` e aparece no `--status`. O arquivo `.sql` foi removido.

---

### `scripts/migrations/verify-applied.js` — cobertura estendida para 012-016

**Descrição:** Item 4.4 (parcial): os `CHECKS` de `verify-applied.js` foram ampliados para cobrir 012 (índice full-text em `posts`), 013 (índice trigram em `musicas`), 014 (índice composto em `dicas`), 015 (coluna `name` em `products`) e 016 (tabela `refresh_tokens`). O `validate-schema.js` permanece inalterado.

---

### `scripts/migrations/seed-migrations-table.js` — lista alinhada a 000-016

**Descrição:** Item 4.5 resolvido: a lista `MIGRATIONS` foi atualizada para incluir `000-create-base-schema`, `012-add-performance-indexes`, `013-add-trgm-indexes` e `014-add-dicas-index`, alinhada às 16 migrações existentes.

---

> 📝 Este documento é analítico — as seções 1–8 servem como guia para futuras refatorações e correções; a seção "Implementações Aplicadas" registra as implementações realizadas após a elaboração deste relatório.