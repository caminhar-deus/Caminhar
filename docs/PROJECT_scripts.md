# 📁 Scripts do Projeto — Análise Consolidada

> **Projeto:** Caminhar  
> **Diretório analisado:** `/scripts`  
> **Objetivo:** Descrever a finalidade, localização e funcionamento de cada script e subpasta.  
> **Data da análise:** 02/08/2026

---

## 📂 Visão Geral da Estrutura

A pasta `/scripts` contém **~80 arquivos** organizados por responsabilidade:

```
scripts/
├── [raiz]           → 34 scripts executáveis/manutenção
├── cli/             → entry points CLI
├── db/              → conexão e verificação de banco
├── diagnostics/     → diagnósticos pontuais
├── maintenance/     → manutenção de dados
├── migrations/      → migrações de schema (001-016)
├── schemas/         → definições JSON de tabelas
├── tests/           → testes manuais
└── utils/           → módulos compartilhados
```

---

## 🧰 Módulos Compartilhados (`scripts/utils/`)

Base de apoio reutilizada por diversos scripts. Concentram a lógica comum e evitam duplicação.

| Arquivo | Funcionalidade |
|---------|----------------|
| `utils/load-env.js` | Função `loadEnv()` — carrega variáveis de ambiente priorizando `.env.local`; `requireDatabaseUrl()` — valida presença de `DATABASE_URL`. |
| `utils/constants.js` | Centraliza constantes de configuração (máx. backups, portas, thresholds, diretórios, retenção de logs/k6, etc.), eliminando números mágicos. |
| `utils/date-format.js` | Funções `formatISODate()` e `formatLogDate()` — formatação de datas com APIs nativas (usado por `backup.js`). |
| `utils/init-table-utils.js` | Funções puras para `init-table.js`: `getTableName()`, `loadSchemaFromDir()`, `buildCreateTableSQL()`, `getSeedValues()`, `buildSeedSQL()`, `validateIdentifier()` (proteção contra SQL injection em identificadores). |
| `utils/cleanup.js` | Módulo compartilhado de limpeza: reexporta `loadEnv()` e define `cleanTableByPattern()` — DELETE genérico por padrões LIKE, com pool via `db/connection.js`. |
| `utils/cleanup-test-data.js` | Removedor de posts de teste com slug `post-carga-%` na tabela `posts`. **Duplicata funcional de `clean-load-test-posts.js`.** |
| `utils/list-settings.js` | Lista todas as configurações da tabela `settings` (chave, valor, tipo, descrição, updated_at). |
| `utils/list-table-columns.js` | Lista colunas das tabelas `videos` e `posts` via `information_schema` (nome, tipo, nulabilidade). |
| `utils/update-setting.js` | Insere/atualiza configuração na tabela `settings` via CLI, com validação completa de chave, tipo (`string`, `number`, `boolean`, `json`) e valor. |

---

## 🔌 Conexão e Verificação de Banco (`scripts/db/`)

| Arquivo | Funcionalidade |
|---------|----------------|
| `db/connection.js` | **Módulo central de conexão PostgreSQL.** Pool singleton: `getPool()`, `closePool()`, `resetPool()`, `query(text, params)`. Usado por ~13 scripts e 10 migrações. |
| `db/verify-db-functions.js` | Verifica funções exportadas por `lib/infra/db.js`. **⚠️ Importa `./db.js` que não existe — referência quebrada (ver UPGRADE).** |
| `db/verify-migration.js` | Verifica integridade pós-migração (contagens de users/posts/settings/images + últimos posts). **⚠️ Não é um script executável: é um handler de página Next.js (`withAuth`) no local errado (ver UPGRADE).** |

---

## 💾 Sistema de Backup (`scripts/` raiz)

| Arquivo | Funcionalidade |
|---------|----------------|
| `backup.js` | **Módulo central (731 linhas).** Criação de backup via `pg_dump` + gzip, hash SHA-256 streaming, criptografia AES-256-GCM opcional, restauração via `psql`, backup de segurança pré-restore, rotação de logs, retenção (10 backups / 30 dias logs), verificação de espaço em disco (df/statfs). Seguro contra command injection (`spawn` sem shell). Exporta: `createBackup`, `restoreBackup`, `cleanupOldBackups`, `getAvailableBackups`, `getBackupLogs`, `initializeBackupSystem`, `checkDiskBeforeBackup`, `rotateLogIfNeeded`, `cleanupOldLogs`. |
| `create-backup.js` | Entry point para backup manual. Carrega env via `loadEnv()` e chama `createBackup()`. |
| `init-backup.js` | Inicializa o sistema de backup (cria backup inicial). Documenta agendamento via cron do SO. |
| `restore-backup.js` | Restaura um backup. Lista os disponíveis se nenhum argumento for passado; suporta `.enc` e `.sql.gz`; cria backup de segurança pré-restore. |
| `view-backup-logs.js` | Exibe registros do log de backup. Suporta `--all` para incluir logs rotacionados. |

---

## 🗄️ Migrações (`scripts/migrations/`)

### Executor e utilidades

| Arquivo | Funcionalidade |
|---------|----------------|
| `migrate.js` (raiz) | **Executor central de migrações (257 linhas).** Cria tabela `_migrations`, lista pendentes vs aplicadas, executa dentro de transação, suporta `--status`, `--revert`, `--help`. Filtra apenas arquivos `.js` com padrão `NNN-*.js`. |
| `migrations/seed-migrations-table.js` | Registra retroativamente na tabela `_migrations` as migrações já aplicadas antes do sistema de controle. Idempotente. |
| `migrations/verify-applied.js` | Verifica no `information_schema` se cada migração (001-011) foi aplicada (coluna existe, tabela existe, tipo correto). |

### Migrações de estrutura (padrão `.js` — exportam `up(pool)`/`down(pool)`)

| Arquivo | Alteração |
|---------|-----------|
| `001-add-views-to-posts.js` | Adiciona coluna `views INTEGER DEFAULT 0 NOT NULL` em `posts`. |
| `002-create-products-table.js` | Cria tabela `products` (schema original: title, images, link_ml/shopee/amazon). |
| `003-add-position-to-products.js` | Adiciona coluna `position INTEGER DEFAULT 9999` em `products`. |
| `004-add-published-to-products.js` | Adiciona coluna `published BOOLEAN DEFAULT true` em `products`. |
| `005-add-last-login-to-users.js` | Adiciona coluna `last_login_at TIMESTAMP` em `users`. |
| `006-create-activity-logs.js` | Cria tabela `activity_logs` (auditoria de ações administrativas). |
| `007-add-position-to-musicas.js` | Adiciona coluna `position` em `musicas`. |
| `008-add-position-to-videos.js` | Adiciona coluna `position` em `videos`. |
| `009-add-position-to-posts.js` | Adiciona coluna `position` em `posts`. |
| `011-fix-entity-id-type.js` | Altera `entity_id` de `INTEGER` para `BIGINT` em `activity_logs` (evita overflow com `Date.now()`). |
| `015-align-products-schema.js` | Alinha schema de `products` ao esperado pelo código: renomeia `title→name`, `images→image_url`, adiciona `category`, unifica links em `link` (prioridade ML > Shopee > Amazon). |
| `016-create-refresh-tokens-table.js` | Cria tabela `refresh_tokens` (suporte a refresh token no login). |

### Migrações de performance/índices

| Arquivo | Alteração |
|---------|-----------|
| `012-add-performance-indexes.sql` | **Arquivo SQL puro.** Índices: GIN full-text (posts), composto de paginação (posts/musicas/videos/products), `LOWER(title)`, `settings.key`, `ANALYZE`. **⚠️ Não é executado pelo `migrate.js` por não ser `.js` (ver UPGRADE).** |
| `013-add-trgm-indexes.js` | Habilita `pg_trgm` e cria índices GIN trigram para buscas `ILIKE` em musicas/videos/posts. |
| `014-add-dicas-index.js` | Índice composto `(published, id ASC)` para paginação eficiente em `dicas`. |

---

## 📐 Schemas de Tabelas (`scripts/schemas/`)

Definições JSON consumidas por `init-table.js` (nome da tabela, colunas, flag `dropBeforeCreate`, `seedData`).

| Arquivo | Tabela | Particularidade |
|---------|--------|-----------------|
| `schemas/posts.json` | `posts` | `dropBeforeCreate: true`; colunas title, slug (UNIQUE), excerpt, content, image_url, published, views, timestamps. |
| `schemas/musicas.json` | `musicas` | `dropBeforeCreate: true`; colunas titulo, artista, url_spotify (NOT NULL), descricao, publicado, timestamps. |
| `schemas/videos.json` | `videos` | `dropBeforeCreate: true`; colunas titulo, url_youtube (NOT NULL), descricao, publicado, timestamps. |
| `schemas/dicas.json` | `dicas` | `dropBeforeCreate: false` (preserva dados); colunas name, content (NOT NULL), published; **contém seedData com 3 registros iniciais.** |

---

## 🌱 Seeds e Inicialização (`scripts/` raiz)

| Arquivo | Funcionalidade |
|---------|----------------|
| `init-table.js` | Script unificado de criação de tabelas. Lê schema JSON de `schemas/`, faz DROP (se `dropBeforeCreate`), cria tabela, adiciona colunas faltantes e popula seedData se vazio. Suporta `node init-table.js <tabela>`, `--table=`, `--help`. |
| `init-server.js` | Inicializa autenticação e banco via `lib/auth/auth.js` (`initializeAuth`) e `closeDatabase`. Idempotente. Exports: `initializeServer()`, `cleanupServer()`. |
| `seed-all.js` | Orquestrador de seeds: verifica conexão, opcionalmente reseta banco (`--clean` via `npm run db:reset`), executa `seed-posts`, `seed-musicas`, `seed-videos` via import dinâmico. |
| `seed-posts.js` | Insere 7 posts de exemplo (6 publicados + 1 rascunho), com `ON CONFLICT (slug) DO NOTHING`. |
| `seed-musicas.js` | Insere 6 músicas de exemplo (títulos, artistas, URLs do Spotify). |
| `seed-videos.js` | Insere 6 vídeos de exemplo (títulos, URLs do YouTube). |
| `seed-products.js` | Insere 30 produtos religiosos com `@faker-js/faker` (nomes, preços, descrições, 1-3 imagens, link ML, categoria). |
| `seed-settings.js` | Cria 5 configurações padrão (`site_name`, `site_description`, `posts_per_page`, `videos_per_page`, `musicas_per_page`). Idempotente. |

---

## 🔍 Diagnósticos (`scripts/diagnostics/`)

| Arquivo | Funcionalidade |
|---------|----------------|
| `check-musicas-schema.js` | Verifica o valor default de `created_at` na tabela `musicas` via `information_schema`. |
| `check-videos-schema.js` | Idêntico ao anterior, porém para `videos`. **Duplicidade de código (ver UPGRADE).** |
| `count-posts.js` | Conta total de posts. Alerta se passar de `POST_ALERT_THRESHOLD` (10), indicando possível paginação. |
| `diagnose-hero.js` | Diagnostica a imagem principal (hero): consulta chaves `hero_image`, `site_logo`, etc. na tabela `settings` e verifica se o arquivo físico existe em `public/uploads`. |
| `list-last-posts.js` | Lista os 5 posts mais recentes (id, title, slug, published, created_at). |

---

## 🛠️ Manutenção (`scripts/maintenance/`)

| Arquivo | Funcionalidade |
|---------|----------------|
| `backup-posts.js` | Gera backup JSON da tabela `posts` em `data/backups/posts-backup-<timestamp>.json`. |
| `restore-posts.js` | Restaura posts do backup JSON mais recente via UPSERT (`ON CONFLICT (id) DO UPDATE`). |
| `clean-k6-videos.js` | Remove vídeos de teste k6 (títulos com padrões `K6%`, `Test Video%`, `Load Test%`, etc.), exibindo os removidos. Usa `cleanTableByPattern()`. |
| `fix-hero-key.js` | Corrige chaves de imagem do hero: copia valor de `site_image` para `hero_image` e `header_image`. |
| `video-thumbnails.js` | **Script unificado de thumbnails (178 linhas).** Verifica/adiciona coluna `thumbnail` em `videos` e popula com URL `img.youtube.com/vi/<id>/maxresdefault.jpg` (extrai ID de diversos formatos de URL). Flags: `--schema-only`, `--force`, `--batch-size=N`, `--dry-run`, `--help`. |

---

## 🧪 Testes Manuais (`scripts/tests/`)

| Arquivo | Funcionalidade |
|---------|----------------|
| `manual-api-test.js` | Testa manualmente 7 endpoints da API v1 (`/status`, login, auth check, settings CRUD, erro 401). **⚠️ Contém credenciais `admin`/`password` hardcoded (ver UPGRADE).** |
| `manual-rate-limit.js` | Testa manualmente o rate limit do login: faz 7 tentativas e verifica se a 6ª é bloqueada (HTTP 429). |

---

## 🚀 Testes de Carga e Performance (`scripts/` raiz)

| Arquivo | Funcionalidade |
|---------|----------------|
| `check-server.js` | Verifica se o servidor está respondendo em `http://localhost:PORT` (timeout 2s). Exit 0 se OK, 1 se falhar. |
| `warm-routes.js` | **Pré-aquecimento de rotas (310 linhas).** Força compilação das rotas dinâmicas `/blog/[slug]` do Next.js/Turbopack (contorna bug "PageNotFoundError/ENOENT"). 6 fases: páginas estáticas, rotas de dados SSR, rotas SSR data, HTML completas, verificação final e, no modo `--api`, rotas de API públicas (reduzem o cold-compile/cold start do 1º acesso real): `/api/settings`, `/api/placeholder-image`, `/api/dicas?page=1&limit=6`, `/api/posts`, `/api/videos`, `/api/musicas`, `/api/products?public=true` e `/api/status`. No modo `--api` aguarda o servidor subir (`waitForServer`, via `/api/status?mode=health`). Flags: `--slugs=`, `--base-url=`, `--retries=`, `--api`. |
| `generate-load-report.js` | Orquestra 6 testes k6 (autenticado, criação de posts, vídeos/músicas CRUD e carga) e gera relatório HTML em `reports/load-report-<timestamp>.html`. Exige `ADMIN_PASSWORD`. |
| `run-all-load-tests-sequentially.js` | **Orquestrador completo (252 linhas).** Executa 30 scripts k6 em 3 categorias (Performance 17, Functional 9, Security 4), verifica servidor, executa cleanups pós-categoria, salva resultados em `reports/k6-summaries/orchestrator-results.json`. Continua após falhas; exit != 0 se houver falha. |
| `run-load-tests.sh` | Wrapper bash: verifica servidor via curl e executa o orquestrador Node. |
| `clean-k6-reports.js` | Remove relatórios k6 antigos (> 7 dias — `K6_RETENTION_DAYS`) em `reports/k6-summaries/`. Exporta `cleanOldReports()`. |

---

## 🧹 Limpeza e Segurança (`scripts/` raiz)

| Arquivo | Funcionalidade |
|---------|----------------|
| `check-env.js` | Valida variáveis de ambiente obrigatórias (`DATABASE_URL`, `JWT_SECRET`) e opcionais. Usa `@next/env`. |
| `check-db-status.js` | Verifica conexão com o banco (versão PostgreSQL) e conta registros nas tabelas `posts`, `videos`, `musicas`, `users`. |
| `check-sql-injection.js` | **Scanner de segurança (496 linhas).** Varre arquivos `.js` do projeto em busca de interpolação direta de variáveis em queries SQL sem prepared statements. Falsos positivos controlados (constantes, `validateIdentifier`, etc.). `--all` e `--path=` para escopo. |
| `clean-orphaned-images.js` | Remove imagens órfãs de teste (`post-image-*`, `hero-image-*`) em `public/uploads/` não referenciadas no banco (`posts.image_url`, `settings.value`). |
| `clean-load-test-posts.js` | Remove posts de teste (`post-carga-%`, `k6-%`) via `cleanTableByPattern()`. |
| `clean-test-db.js` | Remove bancos SQLite locais de teste (`data/test.db`, `data/caminhar-test.db`). |
| `clear-cache.js` | Limpa cache Redis (Upstash) via `flushdb`. Se não configurado, avisa para reiniciar servidor. |
| `clear-db.js` | Esvazia todas as tabelas (`TRUNCATE ... RESTART IDENTITY CASCADE`) e limpa `public/uploads/`. Requer confirmação interativa. |
| `clear-musicas.js` | Remove todos os registros de `musicas`. Requer confirmação interativa. |
| `clear-test-auth-locks.js` | Remove chaves Redis de bloqueio de rate limit dos IPs de teste (`203.0.113.1`, `127.0.0.1`, `::1`) e caches `api:auth:login:*`. |
| `reset-password.js` | Reseta/define senha de usuário (hash bcrypt via `lib/auth/auth.js`). Se o usuário não existir, cria um novo como admin. |

---

## 🖥️ Outros (`scripts/` raiz)

| Arquivo | Funcionalidade |
|---------|----------------|
| `db-shell.js` | Abre terminal interativo `psql` usando `DATABASE_URL`. |
| `monitor-disk-space.js` | **Monitor de disco (281 linhas).** Verifica um ou mais mount points via `df` (spawn) com fallback `fs.promises.statfs`. Alerta se uso ≥ threshold (85%). Flags: `--json`, `--dry-run`, `--help`. Integrado ao `backup.js` (checkDiskBeforeBackup). |
| `validate-schema.js` | Valida se o schema do banco corresponde ao esperado (tabelas posts, videos, musicas, users, settings, images). Retorna `boolean`; exportado para o entry point CLI. |
| `cli/validate-schema.js` | Entry point CLI puro: importa `validateSchema()` e faz `process.exit(success ? 0 : 1)`. |

---

## 📊 Resumo por Categoria

| Categoria | Quantidade | Arquivos |
|-----------|:----------:|----------|
| Backup | 5 | `backup.js`, `create-backup.js`, `restore-backup.js`, `init-backup.js`, `view-backup-logs.js` |
| Migrações | 18 | `migrate.js` + `migrations/` (15) + `seed-migrations-table.js` + `verify-applied.js` |
| Schemas | 4 | `schemas/*.json` |
| Seeds | 6 | `seed-all.js`, `seed-posts.js`, `seed-musicas.js`, `seed-videos.js`, `seed-products.js`, `seed-settings.js` |
| Inicialização | 2 | `init-server.js`, `init-table.js` |
| Diagnósticos | 5 | `diagnostics/*` |
| Manutenção | 5 | `maintenance/*` |
| Testes de Carga | 4 | `generate-load-report.js`, `run-all-load-tests-sequentially.js`, `run-load-tests.sh`, `warm-routes.js` |
| Limpeza | 10 | `clean-*.js`, `clear-*.js` (raiz) + `cleanup.js`, `cleanup-test-data.js` (utils) |
| Segurança/Validação | 6 | `check-env.js`, `check-db-status.js`, `check-sql-injection.js`, `check-server.js`, `validate-schema.js`, `reset-password.js` |
| Banco | 4 | `db/connection.js`, `db/verify-db-functions.js`, `db/verify-migration.js` + `db-shell.js` |
| Utilidades | 7 | `load-env.js`, `constants.js`, `date-format.js`, `init-table-utils.js`, `list-settings.js`, `list-table-columns.js`, `update-setting.js` |
| Testes Manuais | 2 | `tests/*` |
| CLI | 1 | `cli/validate-schema.js` |
| Monitoramento | 1 | `monitor-disk-space.js` |
| **Total** | **80** | — |

---

> 📝 Este documento é descritivo. Para levantamento analítico de melhorias, correções e duplicidades, consulte o documento complementar [`UPGRADE_scripts.md`](UPGRADE_scripts.md).