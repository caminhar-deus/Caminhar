# 📁 Scripts do Projeto — Análise Consolidada

> **Projeto:** Caminhar  
> **Diretório analisado:** `/scripts`  
> **Objetivo:** Descrever a finalidade, localização e funcionamento de cada script e subpasta.  
> **Data da análise:** 23/09/2026  
> **Última atualização:** 19/10/2026 — `scripts/bench/orchestrator/` (bench do papel do `orchestrator`: `rodar.js` abre sessão real por modelo e grava em streaming, `conferir.js` mede delegação, citações e contaminação, mais `tarefa.md`, `gabarito.md` e `rubrica.md`); scripts `bench:orch:rodar` e `bench:orch:conferir` no `package.json`

---

## 📂 Visão Geral da Estrutura

A pasta `/scripts` contém **95 arquivos versionados** (96 no disco, contando o
`.ndjson` de uma execução do bench, que o `.gitignore` exclui):

```text
scripts/
├── [raiz]           → 36 scripts executáveis/manutenção
├── bench/           → 1 subpasta: bench do orchestrator
├── cli/             → entry points CLI
├── db/              → conexão e verificação de banco
├── diagnostics/     → diagnósticos pontuais
├── lib/             → módulos de biblioteca (parsing de saída do k6)
├── maintenance/     → manutenção de dados
├── migrations/      → migrações de schema (000-018)
├── schemas/         → definições JSON de tabelas
├── tests/           → testes manuais
└── utils/           → módulos compartilhados
```

---

## 🧰 Módulos Compartilhados (`scripts/utils/`)

Base de apoio reutilizada por diversos scripts. Concentram a lógica comum e evitam duplicação.

| Arquivo | Funcionalidade |
|---------|----------------|
| `utils/load-env.js` | Função `loadEnv()` — carrega variáveis de ambiente priorizando `.env.local` sobre `.env`. Função `requireDatabaseUrl()` — valida presença de `DATABASE_URL`, lança erro se ausente. |
| `utils/constants.js` | Centraliza constantes de configuração (máx. backups, portas, thresholds, diretórios, retenção de logs/k6, etc.), eliminando números mágicos. Exporta: `MAX_BACKUPS`, `DEFAULT_LIST_LIMIT`, `ENCRYPTION_KEY_LENGTH`, `MAX_LOG_LINES`, `SERVER_CHECK_TIMEOUT`, `POST_ALERT_THRESHOLD`, `DEFAULT_BATCH_SIZE`, `REPORTS_DIR`, `K6_SUMMARY_DIR`, `LOAD_TESTS_DIR`, `MIGRATIONS_TABLE`, `K6_RETENTION_DAYS`, `LOG_RETENTION_DAYS`, `LOG_MAX_SIZE_BYTES`, `DISK_THRESHOLD_PERCENT`, `DISK_PATH_DEFAULT`. |
| `utils/date-format.js` | Funções `formatISODate()` (padrão ISO com `:` substituídos por `-`) e `formatLogDate()` (`YYYY-MM-DD HH:mm:ss`) — formatação de datas com APIs nativas, usado por `backup.js`. |
| `utils/init-table-utils.js` | Funções puras para `init-table.js`: `getTableName()`, `loadSchemaFromDir()`, `buildCreateTableSQL()`, `getSeedValues()`, `buildSeedSQL()`, `validateIdentifier()` (proteção contra SQL injection em identificadores via regex `/^[a-zA-Z_][a-zA-Z0-9_]*$/`). |
| `utils/cleanup.js` | Módulo compartilhado de limpeza: reexporta `loadEnv()` de `load-env.js` e define `cleanTableByPattern()` — DELETE genérico por padrões LIKE com pool via `db/connection.js`. Suporta múltiplos padrões e `showDeleted` para exibir registros removidos. |
| `utils/cleanup-test-data.js` | Removedor de posts de teste com slug `post-carga-%` na tabela `posts`. Usa `cleanTableByPattern()` de `cleanup.js`. |
| `utils/list-settings.js` | Lista todas as configurações da tabela `settings` (chave, valor, tipo, descrição, updated_at) via `information_schema`. Usa pool direto com dotenv. |
| `utils/list-table-columns.js` | Lista colunas das tabelas `videos` e `posts` via `information_schema` (nome, tipo, nulabilidade). Usa pool direto com dotenv. |
| `utils/update-setting.js` | Insere/atualiza configuração na tabela `settings` via CLI, com validação completa de chave (regex `/^[a-z][a-z0-9_]*$/`), tipo (`string`, `number`, `boolean`, `json`) e valor. Usa UPSERT (`ON CONFLICT (key) DO UPDATE`). |

---

## 📚 Biblioteca (`scripts/lib/`)

Diretório novo, criado em 08/10/2026 junto com a captura de saída do orquestrador de carga (ver item W de `docs/PENDENCIAS_scripts_testes.md`).

| Arquivo | Funcionalidade |
|---------|----------------|
| `lib/k6-output-parser.js` | **Parser da saída do k6 para o relatório de falhas do orquestrador (237 linhas).** Extrai, de cada script reprovado: *checks que falharam* (com a linha `↳` de contagem), *thresholds violados* e *erros de console* (`level=error`/`fatal`). `BoundedTailBuffer` mantém os **últimos 5 MB** da saída (`MAX_CAPTURE_BYTES = 5 * 1024 * 1024`), que é onde ficam resumo, thresholds e mensagens do k6; deduplicação por texto, porque o k6 redesenha a mesma linha com `\r`; limite de `MAX_DETAILS_PER_GROUP = 100` ocorrências por tipo (com `omittedCount`). **Não decide pass/fail** — é chamado só no caminho de falha e dentro de `try/catch`. Exporta `MAX_CAPTURE_BYTES`, `MAX_DETAILS_PER_GROUP`, `BoundedTailBuffer` e `extractFailureDetails()`, consumidos por `scripts/run-all-load-tests-sequentially.js`. |

---

## 🔌 Conexão e Verificação de Banco (`scripts/db/`)

| Arquivo | Funcionalidade |
|---------|----------------|
| `db/connection.js` | **Módulo central de conexão PostgreSQL.** Pool singleton: `getPool()`, `closePool()`, `resetPool()`, `query(text, params)`. Valida presença de `DATABASE_URL` antes de criar o pool. Usado por ~15 scripts e 10 migrações. |

> **Removidos em 12/10/2026** (`git rm`, código morto): `db/verify-db-functions.js` importava `./db.js`, inexistente, e checava `getSetting` — que nunca foi exportado por `lib/infra/db.js` (está em `lib/domain/settings.js`, já coberto por `tests/unit/lib/db/settings.test.js`). `db/verify-migration.js` era um handler Next.js (`withAuth`) fora de `pages/api/`; a verificação pós-migração é feita por `migrations/verify-applied.js` (cobre 001-018) e `validate-schema.js`. Ver `docs/UPGRADE_scripts.md` §"Implementações Aplicadas".

---

## 💾 Sistema de Backup (`scripts/` raiz)

| Arquivo | Funcionalidade |
|---------|----------------|
| `backup.js` | **Módulo central (731 linhas).** Criação de backup via `pg_dump` + gzip streaming, hash SHA-256 streaming, criptografia AES-256-GCM opcional (via `BACKUP_ENCRYPTION_KEY`), restauração via `psql` com gunzip streaming, backup de segurança pré-restore, rotação de logs (por tamanho ou mês), retenção (10 backups / 30 dias logs), verificação de espaço em disco (`df` via spawn + fallback `fs.promises.statfs`). Seguro contra command injection (spawn sem shell). Sanitização de logs (mascara senhas, tokens, secrets). Exporta: `createBackup`, `restoreBackup`, `cleanupOldBackups`, `getAvailableBackups`, `getBackupLogs`, `initializeBackupSystem`, `checkDiskBeforeBackup`, `rotateLogIfNeeded`, `cleanupOldLogs`. |
| `create-backup.js` | Entry point para backup manual. Carrega env via `loadEnv()` e chama `createBackup()`. |
| `init-backup.js` | Inicializa o sistema de backup (cria backup inicial via `initializeBackupSystem()`). Documenta agendamento via cron do SO (diário às 2 AM). |
| `restore-backup.js` | Restaura um backup. Lista os disponíveis se nenhum argumento for passado; suporta `.enc` e `.sql.gz`; cria backup de segurança pré-restore. |
| `view-backup-logs.js` | Exibe registros do log de backup. Suporta `--all` para incluir logs rotacionados. |

---

## 🗄️ Migrações (`scripts/migrations/`)

### Executor e utilidades

| Arquivo | Funcionalidade |
|---------|----------------|
| `migrate.js` (raiz) | **Executor central de migrações (257 linhas).** Cria tabela `_migrations`, lista pendentes vs aplicadas, executa dentro de transação, suporta `--status`, `--revert`, `--help`. Filtra apenas arquivos `.js` com padrão `NNN-*.js`. Exporta funções reutilizáveis: `ensureMigrationTable`, `getAppliedMigrations`, `listMigrationFiles`, `applyMigration`, `revertLastMigration`, `listStatus`, `run`. |
| `migrations/seed-migrations-table.js` | Registra retroativamente na tabela `_migrations` as migrações já aplicadas antes do sistema de controle (lista alinhada a 000-016, sem 017 **nem 018** — confirmado por grep: o último item da lista é `016-create-refresh-tokens-table`). Idempotente. |
| `migrations/verify-applied.js` | Verifica no `information_schema` se cada migração (**001-018**, sem 010, que nunca existiu — 17 entradas) foi aplicada (coluna existe, tabela existe, tipo correto). Gera resumo final com contagem de aplicadas/pendentes. |

### Migrações de estrutura (padrão `.js` — exportam `up(pool)`/`down(pool)`)

| Arquivo | Alteração |
|---------|-----------|
| `000-create-base-schema.js` | **Baseline de schema.** Cria o schema base em banco vazio (`CREATE TABLE IF NOT EXISTS`): posts, videos, musicas e dicas reaproveitando `scripts/schemas/*.json` via `buildCreateTableSQL()`, + users, settings, images, categories, tags, post_categories, post_tags, roles inline. Executa primeiro na ordem numérica. Rollback completo com `DROP TABLE ... CASCADE`. |
| `001-add-views-to-posts.js` | Adiciona coluna `views INTEGER DEFAULT 0 NOT NULL` em `posts` (`ADD COLUMN IF NOT EXISTS` — idempotente). |
| `002-create-products-table.js` | Cria tabela `products` (schema original: title, price, images, description, link_ml/shopee/amazon). |
| `003-add-position-to-products.js` | Adiciona coluna `position INTEGER DEFAULT 9999` em `products`. |
| `004-add-published-to-products.js` | Adiciona coluna `published BOOLEAN DEFAULT true` em `products`. |
| `005-add-last-login-to-users.js` | Adiciona coluna `last_login_at TIMESTAMP WITH TIME ZONE` em `users`. |
| `006-create-activity-logs.js` | Cria tabela `activity_logs` (auditoria de ações administrativas: username, action, entity_type, entity_id, details, ip_address). |
| `007-add-position-to-musicas.js` | Adiciona coluna `position INTEGER DEFAULT 9999` em `musicas`. |
| `008-add-position-to-videos.js` | Adiciona coluna `position INTEGER DEFAULT 9999` em `videos`. |
| `009-add-position-to-posts.js` | Adiciona coluna `position INTEGER DEFAULT 9999` em `posts`. |
| `011-fix-entity-id-type.js` | Altera `entity_id` de `INTEGER` para `BIGINT` em `activity_logs` (evita overflow com `Date.now()`). Verifica tipo atual antes de alterar; cria tabela com BIGINT se não existir. |
| `012-add-performance-indexes.js` | Índices: GIN full-text (posts em português), composto de paginação (posts/musicas/videos/products), `LOWER(title)`, `settings.key` (2 índices), `ANALYZE`. Executada via `client.query()` pelo runner. |
| `013-add-trgm-indexes.js` | Habilita `pg_trgm` e cria índices GIN trigram para buscas `ILIKE` em musicas (titulo, artista), videos (titulo, descricao) e posts (title). |
| `014-add-dicas-index.js` | Índice composto `(published, id ASC)` para paginação eficiente em `dicas`. |
| `015-align-products-schema.js` | Alinha schema de `products` ao esperado pelo código: renomeia `title→name`, `images→image_url`, adiciona `category`, unifica links em `link` (prioridade ML > Shopee > Amazon). |
| `016-create-refresh-tokens-table.js` | Cria tabela `refresh_tokens` (suporte a refresh token no login: user_id, token UNIQUE, expires_at, revoked) + índices. |
| `017-add-thumbnail-to-videos.js` | Adiciona coluna `thumbnail VARCHAR(255)` em `videos` (`ADD COLUMN IF NOT EXISTS` — idempotente). |
| `018-seed-default-roles.js` | **Última migração (04/10/2026).** Garante o índice único `idx_roles_name` em `roles(name)` (idempotente, pré-requisito do `ON CONFLICT (name)` — sem ele o Postgres responde `42P10`) e faz upsert dos cargos padrão `admin` (com as permissões de `lib/domain/permissions.js`) e `user`. Fecha a lacuna deixada pela 000, que cria a tabela `roles` vazia. |

---

## 📐 Schemas de Tabelas (`scripts/schemas/`)

Definições JSON consumidas por `init-table.js` (nome da tabela, colunas, flag `dropBeforeCreate`, `seedData`).

| Arquivo | Tabela | Particularidade |
|---------|--------|-----------------|
| `schemas/posts.json` | `posts` | `dropBeforeCreate: true`; colunas: id (SERIAL PK), title, slug (UNIQUE NOT NULL), excerpt, content, image_url, published (DEFAULT false), views (DEFAULT 0 NOT NULL), timestamps. |
| `schemas/musicas.json` | `musicas` | `dropBeforeCreate: true`; colunas: id, titulo (NOT NULL), artista, url_spotify (NOT NULL), descricao, publicado (DEFAULT false), timestamps. |
| `schemas/videos.json` | `videos` | `dropBeforeCreate: true`; colunas: id, titulo (NOT NULL), url_youtube (NOT NULL), descricao, thumbnail, publicado (DEFAULT false), timestamps. |
| `schemas/dicas.json` | `dicas` | `dropBeforeCreate: false` (preserva dados); colunas: id, name (NOT NULL), content (NOT NULL), published (DEFAULT true), timestamps (WITHOUT TIME ZONE); **sem `seedData`** (tabela criada vazia — registros dependem exclusivamente do Painel Administrativo). |

---

## 🌱 Seeds e Inicialização (`scripts/` raiz)

| Arquivo | Funcionalidade |
|---------|----------------|
| `init-table.js` | Script unificado de criação de tabelas (92 linhas). Lê schema JSON de `schemas/`, valida identificador da tabela, faz DROP (se `dropBeforeCreate`), cria tabela, adiciona colunas faltantes (se não drop) e popula seedData se vazio. Suporta `node init-table.js <tabela>`, `--table=`, `--help`. Importa funções de `utils/init-table-utils.js`. |
| `init-server.js` | Inicializa autenticação e banco via `lib/auth/auth.js` (`initializeAuth`) e `closeDatabase`. Idempotente (flag `isInitialized`). Exports: `initializeServer()`, `cleanupServer()`. Executa automaticamente se chamado diretamente. |
| `seed-all.js` | Orquestrador de seeds: verifica conexão (`SELECT 1`), opcionalmente reseta banco (`--clean` via `npm run db:reset`), executa `seed-posts.js`, `seed-musicas.js`, `seed-videos.js`, `seed-settings.js` via import dinâmico e **aguarda a função exportada por cada um** (falha explícita se o módulo não exportar `default`/`run`). Fecha o pool uma única vez, ao final. Não executa `seed-products.js`. **Importável e testado (12/10/2026):** exporta `checkDatabaseReady()`, `runSeed(scriptName, seedsDir)`, `seedAll({ seedsDir })` e `main()`, com a execução CLI atrás de `main()` + guarda (ver nota após a tabela de seeds). O diretório dos seeds virou o parâmetro `seedsDir`, com default `path.join(process.cwd(), 'scripts')` — o `fileURLToPath(import.meta.url)` anterior foi eliminado porque o `import.meta` sobrevive à compilação CommonJS do Babel e o Jest 30 recusava o módulo com `ERR_REQUIRE_ESM`; o default é seguro porque as três invocações reais (`npm run seed:all`, `setup-db/action.yml` e `scripts/setup-test-db.js`) rodam da raiz do projeto. |
| `seed-posts.js` | Insere 8 posts de exemplo (7 publicados + 1 rascunho), com `ON CONFLICT (slug) DO NOTHING`. URLs de imagem do Unsplash. |
| `seed-musicas.js` | Insere 6 músicas de exemplo (títulos, artistas, URLs do Spotify). |
| `seed-videos.js` | Insere 6 vídeos de exemplo (títulos, URLs do YouTube). |
| `seed-products.js` | Insere 30 produtos religiosos com `@faker-js/faker` (nomes, preços, descrições, 1-3 imagens via LoremFlickr, link ML com 70% de chance, categoria aleatória). |
| `seed-settings.js` | Cria 5 configurações padrão (`site_name`, `site_description`, `posts_per_page`, `videos_per_page`, `musicas_per_page`). Idempotente — verifica existência antes de inserir. Falha de um item não é engolida: as chaves que derem certo ficam populadas e, ao fim, um único erro é lançado com a contagem e a lista das que falharam. |

**Contrato comum aos 4 seeds do orquestrador (`seed-posts`, `seed-musicas`, `seed-videos`, `seed-settings`):** exportam a função de seed como `default`, não se auto-invocam no topo do módulo, não chamam `process.exit` e não fecham o pool — quem executa é o `seed-all.js`, dono do ciclo de vida. O uso como CLI (`node scripts/seed-X.js`) continua funcionando por uma guarda `process.argv[1]`, e só nesse caminho o pool é fechado. Antes de 09/10/2026 nenhum deles exportava função: o `seed-all.js` logava "concluído" sem aguardar nada e o `process.exit(0)` final abortava os `INSERT` em voo — foi o que reprovou o `cache-performance-test` na CI com a tabela `settings` vazia.

**Padrão CLI/testabilidade dos 4 scripts destravados para teste (12/10/2026 — `clear-db.js`, `clear-musicas.js`, `reset-password.js` e `seed-all.js`):** em todos, o corpo da execução principal mora em `main()` **exportada**, atrás da guarda `if (process.argv[1] && process.argv[1].endsWith('<arquivo>.js')) { main(); }` **sem `await`**. O `await` ficou de fora porque o Babel do Jest compila esses scripts como CommonJS e top-level `await` ali é `SyntaxError`; o `main()` é exportado (a invocação assíncrona anterior da guarda não devolvia a promise) para o teste fazer `await main()` determinístico, sem poll de microtasks. Nenhum comportamento de CLI foi alterado — detalhes e contagens em cada linha da tabela de "Limpeza e Segurança" e em `docs/UPGRADE_scripts.md` (§9.5, §9.27, §9.38 e §9.52).

---

## 🔍 Diagnósticos (`scripts/diagnostics/`)

| Arquivo | Funcionalidade |
|---------|----------------|
| `check-musicas-schema.js` | Verifica o valor default de `created_at` na tabela `musicas` via `information_schema`. |
| `check-videos-schema.js` | Idêntico ao anterior, porém para `videos`. |
| `count-posts.js` | Conta total de posts. Alerta se passar de `POST_ALERT_THRESHOLD` (10), indicando possível paginação. |
| `diagnose-hero.js` | Diagnostica a imagem principal (hero): consulta chaves `hero_image`, `header_image`, `site_logo`, `logo` e qualquer chave contendo `image` na tabela `settings`, verifica se o arquivo físico existe e exibe tamanho. Procura em **os dois** diretórios de upload, na mesma ordem da aplicação: o ativo (`UPLOADS_DIR` ou `<raiz>/uploads`) e o legado `public/uploads`. Carrega o `.env` da raiz via `dotenv.config({ path: path.resolve(__dirname, '../../.env') })`. **Correções de caminho (08/10/2026):** os dois caminhos tinham um `..` a menos e **não funcionavam** — `../public/uploads` resolvia para `scripts/public/uploads` e `../.env` para `scripts/.env`, **ambos inexistentes**; o segundo bug deixava o `UPLOADS_DIR` do `.env` da raiz invisível para o diagnóstico (ver `docs/UPGRADE_scripts.md` §1.4 e o item U de `docs/PENDENCIAS_scripts_testes.md`). |
| `list-last-posts.js` | Lista os 5 posts mais recentes (id, title, slug, published, created_at) ordenados por `created_at DESC`. |
| `lint-workflows.sh` | Lint dos arquivos do GitHub Actions com **actionlint** 1.7.12. Resolve o binário por `ACTIONLINT_BIN`, PATH ou cache em `node_modules/.cache/actionlint-<versão>`, baixando a release oficial com SHA-256 conferido quando necessário. Sem argumentos, o actionlint descobre sozinho `.github/workflows/` e `.github/actions/**/action.y{a,}ml`; o script não acrescenta caminho nenhum — termina em `exec "$bin" "$@"` e repassa intactos os argumentos recebidos (arquivos fora desses diretórios só entram se forem passados na chamada). Executado por `npm run lint:workflows`. |
| `lsp-reusable-workflow.js` | Sobe o language server empacotado da extensão `github.vscode-github-actions` por stdio e valida um workflow que chama outro por caminho local, imprimindo quais arquivos o server pediu para ler e os diagnósticos recebidos. `--no-repos` reproduz o falso positivo `Unable to find reusable workflow`. Requer o VS Code com a extensão instalada; comando: `npm run diag:lsp`. |
| `repro-reusable-workflow.js` | Valida o workflow com o mesmo motor do language server (`@actions/languageservice`) em 4 cenários de contexto de repositório. O cenário com `workspaceUri` é asserção: reprova o comando quando o arquivo tem diagnóstico real (schema, expressão, input inexistente). Executado como `npm run diag:reusable-workflow`, que empacota com esbuild antes de rodar — o `@actions/workflow-parser` importa JSON sem `with { type: 'json' }` e o Node 22+ recusa o módulo. |

---

## 🛠️ Manutenção (`scripts/maintenance/`)

| Arquivo | Funcionalidade |
|---------|----------------|
| `backup-posts.js` | Gera backup JSON da tabela `posts` em `data/backups/posts-backup-<timestamp>.json`. |
| `restore-posts.js` | Restaura posts do backup JSON mais recente via UPSERT (`ON CONFLICT (id) DO UPDATE`). Busca automaticamente o arquivo mais recente. |
| `clean-k6-videos.js` | Remove vídeos de teste k6 (títulos com padrões `K6%`, `Test Video%`, `Load Test%`, `Performance Test%`, `Video de Teste%`), exibindo os removidos (`showDeleted: true`). Usa `cleanTableByPattern()`. |
| `fix-hero-key.js` | Corrige chaves de imagem do hero: copia valor de `site_image` para `hero_image` e `header_image` via UPSERT. |
| `video-thumbnails.js` | **Script unificado de thumbnails (178 linhas).** Verifica/adiciona coluna `thumbnail` em `videos` e popula com URL `img.youtube.com/vi/<id>/maxresdefault.jpg` (extrai ID via regex de diversos formatos de URL). Flags: `--schema-only`, `--force`, `--batch-size=N` (default 50), `--dry-run`, `--help`. |

---

## 🧪 Testes Manuais (`scripts/tests/`)

| Arquivo | Funcionalidade |
|---------|----------------|
| `manual-rate-limit.js` | Testa manualmente o rate limit do login: faz 7 tentativas HTTP para `/api/auth/login` e verifica se a 6ª é bloqueada (HTTP 429). |

> **Removido em 12/10/2026** (`git rm`): `manual-api-test.js` apontava para `/api/v1`, versão que não existe no projeto (não há `pages/api/v1/`), então falhava no primeiro teste sem nunca alcançar o login. Além disso importava `axios`, que não é dependência declarada (existia apenas por hoisting de `wait-on`) e acessava o token no body sem `?response=body`, que é o contrato real de `pages/api/auth/login.js`. A cobertura equivalente está em `tests/integration/api/{status,login,auth/check,settings}`.

---

## 🧪 Bench do Orchestrator (`scripts/bench/`)

Instrumentação de medição de modelo, não manutenção. Existe porque **nenhuma outra
bateria do projeto mede o papel do `orchestrator`**: ele é o agente primário da sessão,
não existe como subagente, e a tool `subagent` não o alcança — as baterias de 15/10 e
16/10/2026 o exercitaram por proxy. O `docs/adr/0008` §"Ordem do orchestrator" registra
isso como a evidência que faltava para trocar o primário.

| Arquivo | Funcionalidade |
|---------|----------------|
| `bench/orchestrator/rodar.js` | Executa a mesma tarefa em um ou mais modelos via `opencode run --model ... --format json --auto`, e grava `resultados/<modelo>-<n>.ndjson` (em **streaming**, para que execução morta ou interrompida por timeout deixe evidência) e `<modelo>-<n>.meta.json` (sessionID, código de saída, duração, stderr). Confere cada id contra `opencode models` antes de rodar: id fora do catálogo falha em silêncio no spawn e pareceria falha do modelo. Opções: `-m/--modelo`, `-n/--repeticoes`, `--timeout-min`, `--sobrescrever`, `--dry-run`. |
| `bench/orchestrator/conferir.js` | Camada A da rubrica, sem juízo: houve delegação (a saída cita a tool `subagent`), cada citação `arquivo:linha` existe de verdade, e a execução foi contaminada por leitura do gabarito. Gera `resultados/conferencia.md`. **Não** julga o conteúdo — isso é humano, contra o gabarito. |
| `bench/orchestrator/tarefa.md` | O prompt enviado ao modelo. Não editar durante uma série: muda a tarefa, invalida a comparação. |
| `bench/orchestrator/gabarito.md` | Resposta conferida em `arquivo:linha`, linha a linha, com os erros típicos anotados. **Proibido ao modelo**: a tarefa e o runner pedem para não ler `scripts/bench/`, e o `conferir.js` marca a execução como contaminada. |
| `bench/orchestrator/rubrica.md` | Como pontuar: Camada A (automática), Camada B (acerto contra o gabarito) e Camada C (orquestração — quem conduz, não quem acerta). Registra também o que o bench **não** mede. |
| `bench/orchestrator/LEIA-ME.md` | Porta de entrada: como rodar, o que cada arquivo é, e a fraqueza conhecida (contaminação). |

**Comandos:**

```bash
npm run bench:orch:rodar -- --dry-run                # confere sem gastar cota
npm run bench:orch:rodar -- --repeticoes 1           # 1 execução por modelo
npm run bench:orch:conferir                          # Camada A
```

Executa-se por `npm run`, nunca por chamada direta: `rodar.js` usa `import.meta.dirname`
para achar a raiz do repositório e o `package.json` precisa estar como `"type": "module"`.

**Sem `OPENCODE_API_KEY`.** A execução passa pelo host do OpenCode, que já tem credencial
guardada. O bench de 16/10/2026 exigia chave porque chamava a API do Zen de fora — caminho
que o free tier recusa (*"can only be used from within OpenCode"*).

**Os artefatos de execução não são versionados.** `resultados/` está no `.gitignore`
(exceção para o `.gitkeep`): são transcripts crus de sessão, pesados e específicos de cada
máquina e momento.

---

## 🤖 Testes E2E — Cypress (`scripts/` raiz)

| Arquivo | Funcionalidade |
|---------|----------------|
| `warm-routes.js` | **Pré-aquecimento de rotas (333 linhas).** Força compilação das rotas dinâmicas `/blog/[slug]` do Next.js/Turbopack (contorna bug "PageNotFoundError/ENOENT", que só ocorre em `next dev` — rotas dinâmicas compiladas preguiçosamente; em `next build` tudo é compilado antes). 6 fases: páginas estáticas (`/`, `/blog`, `/admin`), rotas de dados SSR (`/_next/data/<BUILD_ID>/blog/<slug>.json`, com o build ID lido de `.next/BUILD_ID` e fallback `development` — caso do `next dev`, que não grava `BUILD_ID`; em build de produção o path `development` não existe e respondia `{}` com HTTP 404), HTML completas, verificação final dos slugs de teste e, no modo `--api`, rotas de API públicas: `/api/settings`, `/api/placeholder-image`, `/api/dicas?page=1&limit=6`, `/api/posts`, `/api/videos`, `/api/musicas`, `/api/products?public=true`, `/api/status`. No modo `--api` aguarda o servidor subir (`waitForServer`, via `/api/status?mode=health`, timeout 2 min). Flags: `--slugs=`, `--base-url=`, `--retries=`, `--api`. Executado automaticamente pelo hook `precypress:run` antes de `npm run cypress:run` (hook que **não** roda no E2E isolado, pois `scripts/e2e-isolated.js` chama `npx cypress run` direto). Os slugs continuam fixos — pendência restante do item 5.4 de `docs/UPGRADE_scripts.md`. |
| `e2e-isolated.js` | **Orquestrador do E2E isolado (574 linhas).** Executa o Cypress contra dados reais em um Postgres descartável (Testcontainers `postgres:15`, sem `.withReuse(true)`), tudo em `try/finally`: sobe o container → `migrate.js` apontado para o container → semeia 4 posts publicados (`mulher-virtuosa` com imagem fixture em `public/` + 3 sem imagem, mínimo para o link "ver mais" da home com `limit={3}`) → reaproveita `.next/BUILD_ID` ou roda `next build` → `next start -p 3000` → espera HTTP 200 → `npx cypress run` propagando o exit code → derruba filhos, para o container e limpa `cypress/videos/` e `cypress/screenshots/` **apenas em execução local** — na CI (`isCI()`) a limpeza é pulada para preservar os artefatos do upload do `e2e.yml`. `DATABASE_URL` sempre sobrescrito com a URL do container (o banco de desenvolvimento nunca é referenciado). Executado por `npm run test:e2e:isolated` e pelo workflow `.github/workflows/e2e.yml`. Ver `docs/PROJECT_cypress.md` (seção "Execução Isolada"). |

---

## 🚀 Testes de Carga e Performance (`scripts/` raiz)

| Arquivo | Funcionalidade |
|---------|----------------|
| `check-server.js` | Verifica se o servidor está respondendo em `http://localhost:PORT` (timeout 2s via `utils/constants.js`). Exit 0 se OK, 1 se falhar. |
| `generate-load-report.js` | Orquestra 6 testes k6 (authenticated-flow, create-post, videos-load, videos-crud, musicas-crud, musicas-load) e gera relatório HTML em `reports/load-report-<timestamp>.html`. Exige `ADMIN_PASSWORD`. Usa `--summary-export` do k6 para capturar métricas. |
| `run-all-load-tests-sequentially.js` | **Orquestrador completo (521 linhas).** Executa 30 scripts k6 em 4 categorias (Performance: 16, Functional: 9, Security: 4, Stress: 1) — o `stress-test-combined` saiu da Performance em 14/10/2026 e roda **por último**, como o **#30 dos 30**, numa categoria própria `🔥 Stress Tests`: ele gera ~24.500 mutações na tabela de vídeos e, no meio da bateria (era #17), deixava os scripts seguintes medindo um possivelmente degradado banco; o preço aceito é ele rodar sobre banco já sujo pelos outros 29 (experimento ainda não confirmado — fonte primária: `docs/PROJECT_load-tests.md`, seção do orquestrador; pendência: `docs/PENDENCIAS_scripts_testes.md`, item AB), verifica servidor via HTTP, verifica disponibilidade do k6 (fail-fast com mensagem orientativa), executa seed de posts antes dos testes de performance (garante dados para paginação), executa cleanups pós-categoria (`clean-load-test-posts.js` e `clear-test-auth-locks.js` — só após Performance e Security; Stress é a última categoria e o próprio script apaga o que cria), salva resultados em `reports/k6-summaries/orchestrator-results.json`. Continua após falhas; exit != 0 se houver falha. **Captura de saída com tee** (`runWithCapture()`, `stdio: ['inherit', 'pipe', 'pipe']`): ecoa cada script ao vivo para o terminal (o log do CI não perde nada) enquanto guarda buffer limitado a 5 MB por script, com timeout de 10 min por script (idêntico ao anterior). **Só no caminho de falha**, passa a saída por `extractFailureDetails()` (`scripts/lib/k6-output-parser.js`, em `try/catch`) e imprime a seção `❌ DETALHES DOS ERROS` ao final do relatório — depois do banner de totais e apenas se houver script reprovado — com exit code, checks reprovados, thresholds violados e erros de console; os mesmos detalhes vão para o campo `details` de cada script falho no `orchestrator-results.json` (scripts aprovados continuam `{name, status:'pass'}`, sem `details`). A extração nunca decide pass/fail: semântica, `overallExitCode` e contagens por categoria são os mesmos de antes. |
| `run-load-tests.sh` | Wrapper bash: verifica servidor via curl e executa o orquestrador Node. |
| `clean-k6-reports.js` | Remove relatórios k6 antigos (> 7 dias — `K6_RETENTION_DAYS`) em `reports/k6-summaries/`. Exporta `cleanOldReports()`. |

---

## 🧹 Limpeza e Segurança (`scripts/` raiz)

| Arquivo | Funcionalidade |
|---------|----------------|
| `check-env.js` | Valida variáveis de ambiente obrigatórias (`DATABASE_URL`, `JWT_SECRET`) e opcionais (`ADMIN_USERNAME`, `ADMIN_PASSWORD`), e verifica a conectividade com o PostgreSQL via `healthCheck()` de `lib/infra/db.js` (aviso não-bloqueante quando o banco está inacessível). Usa `@next/env` (`loadEnvConfig`). |
| `check-db-status.js` | Verifica conexão com o banco (versão PostgreSQL via `SELECT version()`) e conta registros nas tabelas `posts`, `videos`, `musicas`, `users`. Usa `lib/infra/db.js` via import dinâmico. |
| `check-sql-injection.js` | **Scanner de segurança (496 linhas).** Varre arquivos `.js` do projeto em busca de interpolação direta de variáveis em queries SQL sem prepared statements. 4 regras de detecção: `pool.query()` com template literal + interpolação, `query()` com template literal sem array de params, detecção indireta via variáveis construídas com template literal, e `pool.query(variavel)` com interpolação. Falsos positivos controlados (constantes, `validateIdentifier`, etc.). `--all` e `--path=` para escopo. |
| `clean-orphaned-images.js` | **Varre imagens órfãs nos dois diretórios de upload — o ativo (`UPLOADS_DIR` ou `<cwd>/uploads`) e o legado `public/uploads/` — não só fixtures de teste.** Os prefixos `post-image-*` e `hero-image-*` são os mesmos que `pages/api/upload-image.js:98` gera em produção. Consulta 6 colunas de referência: `posts.image_url`, `settings.value`, `products.image_url`, `videos.thumbnail`, `images.path`, `images.filename`. Quatro salvaguardas: (1) **fail-closed** — qualquer erro de banco que não seja coluna/tabela inexistente aborta antes de tocar em arquivo; (2) **modo relatório por padrão**, sem escrita em disco — usar `npm run clean:images -- --delete` para executar; (3) **idade mínima de 24h** por `mtime` (fecha a janela entre upload e o save do post); (4) **lixeira** — move para `data/uploads-trash/` via `renameSync`, nunca `unlink`; restaurar movendo cada arquivo de volta para o **diretório de origem** dele (o resumo final imprime `arquivo ← origem`). **Varredura dupla (08/10/2026):** os diretórios inexistentes são ignorados, o caminho repetido (`UPLOADS_DIR` apontando para o legado) é considerado **uma única vez** (dedup por índice) e um mesmo `filename` existente nos dois diretórios também conta uma vez — a lixeira é plana e o segundo `rename` sobrescreveria o primeiro. Usa pool criado sob demanda com dotenv. |
| `clean-load-test-posts.js` | Remove posts de teste (`post-carga-%`, `k6-%`) via `cleanTableByPattern()`. |
| `clean-test-db.js` | Remove bancos SQLite locais de teste (`data/test.db`, `data/caminhar-test.db`). |
| `clear-cache.js` | Limpa cache Redis (Upstash) via `flushdb`. Se não configurado, avisa para reiniciar servidor. |
| `clear-db.js` | Esvazia todas as tabelas (`TRUNCATE posts, videos, musicas, images, settings, users RESTART IDENTITY CASCADE`) e limpa **os dois** diretórios de upload — o ativo (`UPLOADS_DIR` ou `<cwd>/uploads`) e o legado `public/uploads`, com dedup por índice (o mesmo caminho conta uma vez) — preservando `.gitkeep` e ignorando diretórios inexistentes. Requer confirmação interativa. Usa `db/connection.js`. **Importável e testado:** `askConfirmation`, `clearDatabase` e `clearUploadsDir` são **exportadas** e a execução principal mora em `main()` exportada, atrás da guarda `if (process.argv[1] && process.argv[1].endsWith('clear-db.js')) { main(); }` **sem `await`** (12/10/2026, mesmo padrão de `clear-musicas.js`, `reset-password.js` e `seed-all.js`). Top-level `await` ali seria `SyntaxError` porque o Babel do Jest compila o script como CommonJS — daí a guarda sem `await`; e `main()` é exportada (a invocação assíncrona anterior da guarda não devolvia a promise) para o teste fazer `await main()` determinístico, sem poll de microtasks. Foi o Babel/CommonJS que, historicamente, impediu importar o arquivo em teste. Importar o módulo não dispara prompt nem banco — `tests/unit/scripts/clear-db.test.js` faz import estático, mocka `scripts/db/connection.js` (o módulo que o script importa) e `readline`, e tem **16 testes** (6 de `clearUploadsDir`, com fs real e temp dirs). Análise: `docs/UPGRADE_scripts.md` §9.27. |
| `clear-musicas.js` | Remove todos os registros de `musicas` (`DELETE FROM musicas`) via `db/connection.js`. Requer confirmação interativa. **Importável e testado (12/10/2026):** `askConfirmation` e `clearMusicRecords` são **exportadas**, a execução principal mora em `main()` exportada atrás da guarda `process.argv[1].endsWith('clear-musicas.js')` **sem `await`** (mesmo padrão de `clear-db.js`), e `tests/unit/scripts/clear-musicas.test.js` passou a importar o script com mock de `scripts/db/connection.js` e `readline` — **11 testes** (a suíte antiga mockava `lib/infra/db.js`, módulo que o script não importa). Análise: `docs/UPGRADE_scripts.md` §9.52. |
| `clear-test-auth-locks.js` | Remove chaves Redis de bloqueio de rate limit dos IPs de teste (`203.0.113.1`, `127.0.0.1`, `::1`) e caches `api:auth:login:*`. Usa `lib/infra/redis.js` (`getRedisInstance`). |
| `reset-password.js` | Reseta/define senha de usuário (hash bcrypt via `lib/auth/auth.js`). Se o usuário não existir, cria um novo como admin. Uso: `node scripts/reset-password.js <usuario> <nova_senha>`. **Importável e testado (12/10/2026):** `resetPassword(targetUser = process.argv[2] \|\| 'admin', newPassword = process.argv[3])` é **exportada** com defaults idênticos ao comportamento anterior (testável sem `process.argv`), a execução principal mora em `main()` exportada atrás da guarda `process.argv[1].endsWith('reset-password.js')` **sem `await`** (mesmo padrão de `clear-db.js`), e `tests/unit/scripts/reset-password.test.js` passou a importar o script com mock de `scripts/db/connection.js` e `lib/auth/auth.js` — **7 testes**. Análise: `docs/UPGRADE_scripts.md` §9.5. |

---

## 🖥️ Outros (`scripts/` raiz)

| Arquivo | Funcionalidade |
|---------|----------------|
| `db-shell.js` | Abre terminal interativo `psql` usando `DATABASE_URL`. |
| `monitor-disk-space.js` | **Monitor de disco (281 linhas).** Verifica um ou mais mount points via `df` (spawn) com fallback `fs.promises.statfs`. Alerta se uso ≥ threshold (85%). Flags: `--json`, `--dry-run`, `--help`. Integrado ao `backup.js` (checkDiskBeforeBackup). |
| `validate-schema.js` | Valida se o schema do banco corresponde ao esperado (tabelas posts, videos, musicas, users, settings, images). Verifica existência de tabelas e colunas via `information_schema`. Retorna `boolean`; exportado para o entry point CLI. Usa `db/connection.js`. |
| `cli/validate-schema.js` | Entry point CLI puro (5 linhas): importa `validateSchema()` e faz `process.exit(success ? 0 : 1)`. |

---

## 📊 Resumo por Categoria

| Categoria | Quantidade | Arquivos |
|-----------|:----------:|----------|
| Backup | 5 | `backup.js`, `create-backup.js`, `restore-backup.js`, `init-backup.js`, `view-backup-logs.js` |
| Migrações | 21 | `migrate.js` + `migrations/` (18 arquivos 000-018) + `seed-migrations-table.js` + `verify-applied.js` |
| Schemas | 4 | `schemas/*.json` |
| Seeds | 6 | `seed-all.js`, `seed-posts.js`, `seed-musicas.js`, `seed-videos.js`, `seed-products.js`, `seed-settings.js` |
| Inicialização | 3 | `init-server.js`, `init-table.js`, `setup-test-db.js` |
| Diagnósticos | 9 | `diagnostics/*` (8 `.js`, entre eles `lsp-reusable-workflow.js` e `lint-chars.js`, + 1 `.sh`) |
| Manutenção | 5 | `maintenance/*` |
| E2E (Cypress) | 1 | `e2e-isolated.js` |
| Testes de Carga | 5 | `generate-load-report.js`, `run-all-load-tests-sequentially.js`, `run-load-tests.sh`, `warm-routes.js`, `clean-k6-reports.js` |
| Limpeza | 9 | `clean-*.js` e `clear-*.js` da raiz (7 — `clean-k6-reports.js` conta em Testes de Carga) + `cleanup.js`, `cleanup-test-data.js` (utils) |
| Segurança/Validação | 6 | `check-env.js`, `check-db-status.js`, `check-sql-injection.js`, `check-server.js`, `validate-schema.js`, `reset-password.js` |
| Banco | 2 | `db/connection.js` + `db-shell.js` |
| Utilidades | 7 | `load-env.js`, `constants.js`, `date-format.js`, `init-table-utils.js`, `list-settings.js`, `list-table-columns.js`, `update-setting.js` |
| Testes Manuais | 1 | `tests/manual-rate-limit.js` |
| Bench | 7 | `bench/orchestrator/` (4 `.md` + 2 `.js` + `resultados/.gitkeep`) |
| CLI | 1 | `cli/validate-schema.js` |
| Monitoramento | 1 | `monitor-disk-space.js` |
| Biblioteca | 1 | `lib/k6-output-parser.js` |
| **Total** | **94** | — |

> **Contagens conferidas no repositório em 19/10/2026** (`find scripts -type f` = 96, sendo 1 o `.ndjson` de execução que o `.gitignore` exclui; a tabela acima é uma **partição** e soma 94). O número "90" que valia aqui até 18/10/2026 já estava defasado: entre a medição de 08/10 e hoje a pasta tinha 88 arquivos antes do bench, ou seja, **-2** de saldo líquido, e `check-hardcoded-credentials.js` segue sem linha própria nesta tabela. Não auditei de onde saiu o saldo; o que está aqui é o estado medido, e a divergência está declarada em vez de arredondada.

---

> 📝 Este documento é descritivo. Para levantamento analítico de melhorias, correções e duplicidades, consulte o documento complementar [`UPGRADE_scripts.md`](UPGRADE_scripts.md).
