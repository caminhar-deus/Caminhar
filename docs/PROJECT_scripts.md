# 📁 Scripts do Projeto — Análise Completa

> **Projeto:** Caminhar  
> **Diretório:** `/scripts`  
> **Objetivo deste documento:** Descrever a finalidade, localização e funcionamento de cada script disponível no diretório `scripts/` e seus subdiretórios.  
> **Última atualização:** 28/06/2026

---

## 📂 Estrutura do Diretório `scripts/`

```
scripts/
├── backup.js                         # Módulo principal de backup/restore (criptografia, integridade, rotação)
├── check-db-status.js                # Verifica conectividade e status do PostgreSQL
├── check-env.js                      # Valida presença de variáveis de ambiente obrigatórias/opcionais
├── check-server.js                   # Verifica se servidor Next.js está rodando localmente
├── check-sql-injection.js            # Escaneia código por vulnerabilidades de SQL injection
├── clean-k6-reports.js               # Remove relatórios antigos de testes k6
├── clean-load-test-posts.js          # Remove posts de teste criados durante testes de carga
├── clean-orphaned-images.js          # Remove imagens órfãs do sistema de arquivos
├── clean-test-db.js                  # Limpa bancos SQLite locais de teste
├── clear-cache.js                    # Limpa cache da aplicação (Redis ou memória local)
├── clear-db.js                       # Limpa todas as tabelas do banco PostgreSQL
├── clear-musicas.js                  # Limpa a tabela de músicas
├── clear-test-auth-locks.js          # Desbloqueia IPs bloqueados por testes de segurança
├── create-backup.js                  # Entry point para criar backup manual
├── db-shell.js                       # Abre shell psql interativo
├── generate-load-report.js           # Orquestrador de testes de carga k6 com relatório HTML
├── init-backup.js                    # Entry point para inicializar sistema de backup
├── init-server.js                    # Inicialização completa do servidor
├── init-table.js                     # Cria tabelas a partir de schemas JSON
├── migrate.js                        # Executor central de migrações do banco
├── monitor-disk-space.js             # Monitora espaço em disco com alertas
├── reset-password.js                 # Reseta/cria senha de usuário admin
├── restore-backup.js                 # Entry point para restaurar backup
├── run-all-load-tests-sequentially.js # Executa todos os 29 testes k6 sequencialmente
├── run-load-tests.sh                 # Shell script que verifica servidor e dispara testes k6
├── seed-all.js                       # Orquestrador de seeds (executa todos em ordem)
├── seed-musicas.js                   # Popula tabela de músicas com dados de exemplo
├── seed-posts.js                     # Popula tabela de posts com dados de exemplo
├── seed-products.js                  # Popula tabela de produtos com dados de exemplo
├── seed-settings.js                  # Inicializa configurações padrão do sistema
├── seed-videos.js                    # Popula tabela de vídeos com dados de exemplo
├── validate-schema.js                # Módulo funcional de validação de schema do banco
├── view-backup-logs.js               # Entry point para visualizar logs de backup
├── warm-routes.js                    # Pré-aquece rotas dinâmicas Next.js (workaround Turbopack)
│
├── cli/
│   └── validate-schema.js            # Entry point CLI para validação de schema
│
├── db/
│   ├── connection.js                 # Módulo compartilhado de conexão PostgreSQL (Pool singleton)
│   ├── verify-db-functions.js        # [!] IRRELEVANTE — verifica exportações de lib/db.js (desatualizado)
│   └── verify-migration.js           # [!] FORA DE LUGAR — handler de API Next.js, não é script de migração
│
├── diagnostics/
│   ├── check-musicas-schema.js       # Diagnóstico do schema da tabela musicas
│   ├── check-videos-schema.js        # Diagnóstico do schema da tabela videos
│   ├── count-posts.js                # Conta total de posts no banco
│   ├── diagnose-hero.js              # Diagnostica configuração da seção Hero
│   └── list-last-posts.js            # Lista os últimos posts criados
│
├── maintenance/
│   ├── backup-posts.js               # Backup específico da tabela de posts
│   ├── clean-k6-videos.js            # Remove vídeos de teste criados por k6
│   ├── fix-hero-key.js               # Corrige chaves da seção Hero nas settings
│   ├── restore-posts.js              # Restaura posts a partir de backup JSON
│   └── video-thumbnails.js           # Gerencia coluna thumbnail e popula thumbnails do YouTube
│
├── migrations/
│   ├── 001-add-views-to-posts.js     # Adiciona coluna views à tabela posts
│   ├── 002-create-products-table.js  # Cria tabela de products
│   ├── 003-add-position-to-products.js  # Adiciona coluna position a products
│   ├── 004-add-published-to-products.js # Adiciona coluna published a products
│   ├── 005-add-last-login-to-users.js   # Adiciona coluna last_login_at a users
│   ├── 006-create-activity-logs.js   # Cria tabela activity_logs
│   ├── 007-add-position-to-musicas.js   # Adiciona coluna position a musicas
│   ├── 008-add-position-to-videos.js    # Adiciona coluna position a videos
│   ├── 009-add-position-to-posts.js     # Adiciona coluna position a posts
│   ├── 011-fix-entity-id-type.js     # Altera entity_id de INTEGER para BIGINT
│   ├── 012-add-performance-indexes.sql # Adiciona índices de performance (SQL puro)
│   ├── 013-add-trgm-indexes.js       # Adiciona índices TRGM para busca textual
│   ├── seed-migrations-table.js      # Popula tabela _migrations retroativamente
│   └── verify-applied.js             # Verifica se cada migração foi aplicada no banco
│
├── schemas/
│   ├── dicas.json                    # Schema da tabela dicas (com seedData)
│   ├── musicas.json                  # Schema da tabela musicas
│   ├── posts.json                    # Schema da tabela posts
│   └── videos.json                   # Schema da tabela videos
│
├── tests/
│   ├── manual-api-test.js            # Teste manual de API (requisições HTTP)
│   └── manual-rate-limit.js          # Testa manualmente o rate limiting
│
└── utils/
    ├── cleanup.js                    # Módulo compartilhado de limpeza de dados de teste
    ├── cleanup-test-data.js          # Remove posts de teste (delega a cleanup.js)
    ├── constants.js                  # Centraliza constantes de configuração do projeto
    ├── date-format.js                # Formatação de datas com APIs nativas (sem date-fns)
    ├── init-table-utils.js           # Funções puras de schema para init-table.js
    ├── list-settings.js              # Lista configurações da tabela settings
    ├── list-table-columns.js         # Lista colunas de uma tabela no banco
    ├── load-env.js                   # Módulo compartilhado de carregamento de variáveis de ambiente
    └── update-setting.js             # Atualiza/insere configuração na tabela settings
```

---

## 📄 Scripts da Raiz (`scripts/`)

### 🔐 Sistema de Backup (5 scripts)

Este grupo forma o subsistema completo de backup e restauração do banco de dados PostgreSQL.

#### `scripts/backup.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/backup.js`
- **Propósito:** Módulo central de backup/restore do banco PostgreSQL. Não é executável diretamente como CLI — suas funções são importadas pelos entry points `create-backup.js`, `restore-backup.js`, `init-backup.js` e `view-backup-logs.js`.
- **Funcionalidades:**
  - Criação de backup via `pg_dump` com compressão gzip via streams nativas (`zlib`)
  - Restauração via `psql` com descompressão gzip
  - Criptografia AES-256-GCM em repouso (chave via `BACKUP_ENCRYPTION_KEY`)
  - Verificação de integridade SHA-256 via stream (sem carregar arquivo inteiro na RAM)
  - Verificação de espaço em disco antes do backup (via `df` com fallback `statfs`)
  - Rotação automática de backups antigos (mantém os N mais recentes, configurável)
  - Backup de segurança automático antes de qualquer restauração
  - Listagem de backups disponíveis com metadados
  - Log otimizado com buffer em memória (append-only, sem re-escrita)
  - Logging sanitizado (remove credenciais das mensagens)
- **Funções exportadas:** `createBackup()`, `restoreBackup()`, `cleanupOldBackups()`, `getAvailableBackups(maxFiles)`, `getBackupLogs()`, `initializeBackupSystem()`, `checkDiskBeforeBackup()`
- **Dependências:** `fs`, `path`, `zlib`, `crypto`, `child_process` (spawn), `./utils/date-format.js`, `./utils/constants.js`

#### `scripts/create-backup.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/create-backup.js`
- **Propósito:** Entry point para criação manual de backup. Carrega ambiente via `loadEnv()` e chama `createBackup()` do módulo `backup.js`.
- **Dependências:** `./utils/load-env.js`, `./backup.js`

#### `scripts/restore-backup.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/restore-backup.js`
- **Propósito:** Entry point para restauração de backup. Aceita nome de arquivo como argumento, lista backups disponíveis se nenhum for informado, cria backup de segurança antes de restaurar, suporta descriptografia e verificação de integridade.
- **Dependências:** `./utils/load-env.js`, `./backup.js`

#### `scripts/init-backup.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/init-backup.js`
- **Propósito:** Inicializa o sistema de backup. Garante que o diretório de backups existe, cria um backup inicial e exibe instruções para configurar o agendamento via cron do SO.
- **Dependências:** `./utils/load-env.js`, `./backup.js`

#### `scripts/view-backup-logs.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/view-backup-logs.js`
- **Propósito:** Entry point para visualizar logs do sistema de backup. Chama `getBackupLogs()` e exibe registros formatados com timestamp e status.
- **Dependências:** `./utils/load-env.js`, `./backup.js`

---

### 🌱 Sistema de Seed / Dados de Exemplo (5 scripts)

#### `scripts/seed-all.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/seed-all.js`
- **Propósito:** Orquestrador de seeds. Verifica conectividade com o banco, executa em ordem os seeds de posts, músicas e vídeos. Suporta flag `--clean` que reseta o banco antes de semear. Usa import dinâmico dos módulos ao invés de subprocesso shell.
- **Dependências:** `./utils/load-env.js`, `./db/connection.js`, `path`, `url`, `child_process` (condicional)

#### `scripts/seed-musicas.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/seed-musicas.js`
- **Propósito:** Popula a tabela `musicas` com dados fictícios de exemplo (títulos, artistas, URLs do Spotify) para ambiente de desenvolvimento/testes.
- **Dependências:** `./utils/load-env.js`, `./db/connection.js`

#### `scripts/seed-posts.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/seed-posts.js`
- **Propósito:** Popula a tabela `posts` com dados de exemplo (slugs, conteúdos, imagens, metadados) para ambiente de desenvolvimento/testes.
- **Dependências:** `./utils/load-env.js`, `./db/connection.js`

#### `scripts/seed-products.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/seed-products.js`
- **Propósito:** Popula a tabela `products` com 30 produtos religiosos fictícios via `@faker-js/faker`. Gera preços entre R$20-R$350, múltiplas URLs de imagem por produto e simula links de venda externa (Mercado Livre, Shopee, Amazon).
- **Dependências:** `./utils/load-env.js`, `./db/connection.js`, `@faker-js/faker`

#### `scripts/seed-videos.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/seed-videos.js`
- **Propósito:** Popula a tabela `videos` com dados de exemplo (URLs do YouTube e metadados) para ambiente de desenvolvimento/testes.
- **Dependências:** `./utils/load-env.js`, `./db/connection.js`

---

### ⚙️ Inicialização e Configuração (3 scripts)

#### `scripts/init-table.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/init-table.js`
- **Propósito:** Script unificado de criação de tabelas. Substitui 4 scripts antigos. Aceita nome da tabela como argumento e carrega definição de um arquivo JSON em `scripts/schemas/`. Suporta `DROP IF EXISTS` controlado por flag no schema, `ALTER TABLE ADD COLUMN IF NOT EXISTS` para schemas sem drop, e seed de dados inicial apenas se tabela estiver vazia.
- **Uso:** `node scripts/init-table.js musicas|posts|videos|dicas`
- **Dependências:** `./utils/load-env.js`, `./db/connection.js`, `./utils/init-table-utils.js`, `fs`, `path`

#### `scripts/init-server.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/init-server.js`
- **Propósito:** Script abrangente de inicialização do servidor. Executa em sequência: validação de ambiente, verificação de conexão com banco, criação de tabelas, verificação de dados existentes, seed se necessário e inicia verificação periódica de saúde.
- **Dependências:** `dotenv`, `../lib/db.js`, `child_process`

#### `scripts/seed-settings.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/seed-settings.js`
- **Propósito:** Inicializa configurações padrão na tabela `settings`. Cria 5 configurações iniciais (`site_name`, `site_description`, `posts_per_page`, `videos_per_page`, `music_per_page`) se não existirem. Idempotente — não sobrescreve configurações existentes.
- **Dependências:** `./utils/load-env.js`, `./db/connection.js`

---

### 🗄️ Migrações (2 scripts + 14 arquivos de migração)

#### `scripts/migrate.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/migrate.js`
- **Propósito:** Executor central de migrações. Substitui a execução manual de cada script de migração. Cria automaticamente a tabela `_migrations`, compara migrações aplicadas vs pendentes, executa cada migração pendente dentro de transação, registra cada sucesso.
- **Flags:** `--status` (exibe status), `--revert` (reverte última), `--help`
- **Funções exportadas:** `ensureMigrationTable()`, `getAppliedMigrations()`, `listMigrationFiles()`, `applyMigration()`, `revertLastMigration()`, `listStatus()`, `run()`
- **Dependências:** `fs`, `path`, `./utils/load-env.js`, `./db/connection.js`

#### `scripts/migrations/` (14 arquivos)
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/migrations/`
- **Propósito:** Conjunto de migrações numeradas (001 a 013 + utilitários) que evoluem o schema do banco PostgreSQL de forma controlada. Cada migração exporta `up(pool)` e `down(pool)`. São executadas pelo `migrate.js`.

| Arquivo | Descrição |
|---------|-----------|
| `001-add-views-to-posts.js` | Adiciona coluna `views` a `posts` |
| `002-create-products-table.js` | Cria tabela `products` |
| `003-add-position-to-products.js` | Adiciona `position` a `products` |
| `004-add-published-to-products.js` | Adiciona `published` a `products` |
| `005-add-last-login-to-users.js` | Adiciona `last_login_at` a `users` |
| `006-create-activity-logs.js` | Cria tabela `activity_logs` |
| `007-add-position-to-musicas.js` | Adiciona `position` a `musicas` |
| `008-add-position-to-videos.js` | Adiciona `position` a `videos` |
| `009-add-position-to-posts.js` | Adiciona `position` a `posts` |
| `011-fix-entity-id-type.js` | Altera `entity_id` de INTEGER para BIGINT |
| `012-add-performance-indexes.sql` | Adiciona índices de performance (SQL puro) |
| `013-add-trgm-indexes.js` | Adiciona índices TRGM para busca textual |
| `seed-migrations-table.js` | Popula `_migrations` retroativamente |
| `verify-applied.js` | Verifica se cada migração foi aplicada via `information_schema` |

- **Nota:** As migrações `010-sync-sqlite-pg-schemas` e `012-migrate-sqlite-to-pg` (.js) foram removidas por envolverem operações SQLite, fora do escopo PostgreSQL do projeto.

---

### 🎯 Schemas JSON (4 arquivos)

- **Localização:** `/home/qa/Projeto/Caminhar/scripts/schemas/`
- **Propósito:** Definições de schema das tabelas usadas pelo `init-table.js`. Contêm nome da tabela, flag `dropBeforeCreate`, definição de colunas e `seedData` opcional.

| Arquivo | Tabela | dropBeforeCreate | seedData |
|---------|--------|:----------------:|:--------:|
| `dicas.json` | dicas | false | 3 registros (Palavra do dia, Oração do Dia, Anjos do Dia) |
| `musicas.json` | musicas | true | Vazio |
| `posts.json` | posts | true | Vazio |
| `videos.json` | videos | true | Vazio |

---

### 🧹 Scripts de Limpeza (8 scripts)

Agrupados por escopo de atuação:

#### Limpeza de dados de teste no PostgreSQL (delegam ao módulo `cleanup.js`)

| Arquivo | Localização | O que limpa |
|---------|-------------|-------------|
| `clean-load-test-posts.js` | `scripts/clean-load-test-posts.js` | Posts com slug `post-carga-%` |
| `maintenance/clean-k6-videos.js` | `scripts/maintenance/clean-k6-videos.js` | Vídeos com título padrão k6 (`K6%`, `Test Video%`, etc.) |
| `utils/cleanup-test-data.js` | `scripts/utils/cleanup-test-data.js` | Posts com slug `post-carga-%` (mesmo filtro de `clean-load-test-posts.js`) |

#### Limpeza geral do banco PostgreSQL

| Arquivo | Localização | Descrição |
|---------|-------------|-----------|
| `clear-db.js` | `scripts/clear-db.js` | Limpa todas as tabelas com `TRUNCATE CASCADE` + remove arquivos em `public/uploads/`. Requer confirmação do usuário. |
| `clear-musicas.js` | `scripts/clear-musicas.js` | Executa `DELETE FROM musicas`. Requer confirmação. |

#### Limpeza de arquivos e cache

| Arquivo | Localização | Descrição |
|---------|-------------|-----------|
| `clean-k6-reports.js` | `scripts/clean-k6-reports.js` | Remove relatórios k6 antigos (cleanup por data). Suporta `--dry-run`. |
| `clean-orphaned-images.js` | `scripts/clean-orphaned-images.js` | Remove imagens órfãs em `public/uploads/` sem referência na tabela `images`. |
| `clean-test-db.js` | `scripts/clean-test-db.js` | Remove bancos SQLite locais (`test.db`, `caminhar-test.db`) em `data/`. Opera exclusivamente em arquivos. |
| `clear-cache.js` | `scripts/clear-cache.js` | Limpa cache Redis (`flushall`) ou timestamp de cache em memória local. |
| `clear-test-auth-locks.js` | `scripts/clear-test-auth-locks.js` | Remove bloqueios de rate limit no Redis para IPs de teste (`203.0.113.1`, `127.0.0.1`, `::1`). |

---

### 🔍 Diagnóstico e Validação (4 scripts na raiz + 5 em `diagnostics/`)

#### Na raiz `scripts/`

| Arquivo | Localização | Descrição |
|---------|-------------|-----------|
| `check-db-status.js` | `scripts/check-db-status.js` | Verifica conexão PostgreSQL (`SELECT 1`), conta tabelas no schema `public`, exibe versão do PostgreSQL e conexões ativas. |
| `check-env.js` | `scripts/check-env.js` | Valida presença de variáveis de ambiente obrigatórias (`DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `NODE_ENV`) e opcionais. |
| `check-server.js` | `scripts/check-server.js` | Verifica se servidor Next.js responde em `localhost:PORT`. Usa timeout configurável. Exit code 0 se OK, 1 se falhar. |
| `validate-schema.js` | `scripts/validate-schema.js` | Módulo funcional que valida schema do banco contra schema esperado (tabelas `posts`, `videos`, `musicas`, `users`, `settings`, `images`). Exporta `validateSchema()` sem side effects de top-level. |

#### Em `scripts/diagnostics/`

| Arquivo | Localização | Descrição |
|---------|-------------|-----------|
| `check-musicas-schema.js` | `scripts/diagnostics/check-musicas-schema.js` | Diagnóstico do schema da tabela `musicas`: lista colunas, tipos e constraints. |
| `check-videos-schema.js` | `scripts/diagnostics/check-videos-schema.js` | Análogo ao anterior para a tabela `videos`. |
| `count-posts.js` | `scripts/diagnostics/count-posts.js` | Conta total de posts e alerta se ultrapassar threshold. |
| `diagnose-hero.js` | `scripts/diagnostics/diagnose-hero.js` | Verifica configuração da imagem Hero/header no banco e valida se arquivo físico existe. |
| `list-last-posts.js` | `scripts/diagnostics/list-last-posts.js` | Lista os últimos N posts criados, exibindo ID, título, slug, status e data. |

---

### 🔬 Testes de Carga e Performance (3 scripts + 1 shell)

| Arquivo | Localização | Descrição |
|---------|-------------|-----------|
| `generate-load-report.js` | `scripts/generate-load-report.js` | Orquestrador que executa 6 testes k6 pré-definidos e gera relatório HTML com métricas (P95, média, taxa de erro). |
| `run-all-load-tests-sequentially.js` | `scripts/run-all-load-tests-sequentially.js` | Executa todos os 29 scripts de teste de carga (k6) sequencialmente em 3 categorias: performance (16), functional (9), security (5). Agrega resultados em JSON. |
| `run-load-tests.sh` | `scripts/run-load-tests.sh` | Shell script que verifica servidor via `curl` e dispara o orquestrador de testes. |
| `warm-routes.js` | `scripts/warm-routes.js` | Pré-aquece rotas dinâmicas do Next.js como workaround para bug do Turbopack que causa falsos 404 em rotas `[slug].js`. |

---

### 🛠️ Manutenção (5 scripts em `maintenance/`)

| Arquivo | Localização | Descrição |
|---------|-------------|-----------|
| `backup-posts.js` | `scripts/maintenance/backup-posts.js` | Cria backup específico da tabela `posts` em formato JSON. |
| `restore-posts.js` | `scripts/maintenance/restore-posts.js` | Restaura posts a partir de arquivo JSON criado por `backup-posts.js`. |
| `fix-hero-key.js` | `scripts/maintenance/fix-hero-key.js` | Corrige chaves/valores da seção Hero na tabela `settings`. |
| `video-thumbnails.js` | `scripts/maintenance/video-thumbnails.js` | Gerencia coluna `thumbnail` em `videos`: adiciona/verifica coluna e popula com URLs de thumbnails do YouTube. Suporta `--schema-only`, `--force`, `--batch-size`, `--dry-run`. |
| `clean-k6-videos.js` | `scripts/maintenance/clean-k6-videos.js` | Remove vídeos de teste k6 (descrito na seção de limpeza). |

---

### 🧪 Testes Manuais (2 scripts em `tests/`)

| Arquivo | Localização | Descrição |
|---------|-------------|-----------|
| `manual-api-test.js` | `scripts/tests/manual-api-test.js` | Faz requisições HTTP para endpoints da aplicação e valida respostas. Para debug sem levantar servidor de testes automatizados. |
| `manual-rate-limit.js` | `scripts/tests/manual-rate-limit.js` | Testa manualmente o rate limiting fazendo múltiplas requisições em sequência para verificar bloqueio. |

---

### 🔌 CLI (1 script em `cli/`)

| Arquivo | Localização | Descrição |
|---------|-------------|-----------|
| `cli/validate-schema.js` | `scripts/cli/validate-schema.js` | Entry point CLI puro para validação de schema. Importa `validateSchema()` e executa com top-level await + `process.exit()`. Separado do módulo funcional para permitir testes unitários. |

---

### 🔐 Utility e Conexão DB (3 scripts em `db/`)

#### `scripts/db/connection.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/db/connection.js`
- **Propósito:** Módulo compartilhado de conexão PostgreSQL. Centraliza a criação do `pg.Pool` em singleton, evitando que cada script crie seu próprio pool.
- **Funções exportadas:** `getPool()`, `closePool()`, `resetPool()`, `query(text, params)`
- **Dependências:** `pg`

#### `scripts/db/verify-db-functions.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/db/verify-db-functions.js`
- **Propósito:** [!] **IRRELEVANTE / DESATUALIZADO.** Verifica exportações de `lib/db.js` (importa de `./db.js`, que não é mais usado como fonte de conexão para scripts — todos foram migrados para `connection.js`). Script de verificação transitória, sem utilidade atual no fluxo de trabalho.

#### `scripts/db/verify-migration.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/db/verify-migration.js`
- **Propósito:** [!] **FORA DE LUGAR.** Este arquivo é um handler de API do Next.js (exporta `withAuth(handler)` e responde a requisições HTTP com contagens de tabelas), não um script de verificação de migração. Foi erroneamente colocado em `scripts/db/` quando deveria estar em `pages/api/`. Sua localização atual é enganosa.

---

### 🧰 Utilitários (9 scripts em `utils/`)

| Arquivo | Localização | Descrição |
|---------|-------------|-----------|
| `cleanup.js` | `scripts/utils/cleanup.js` | Módulo compartilhado de limpeza de dados de teste. Exporta `cleanTableByPattern()` (função genérica que deleta registros por padrões LIKE) e reexporta `loadEnv()` de `load-env.js`. |
| `cleanup-test-data.js` | `scripts/utils/cleanup-test-data.js` | Remove posts de teste com slug `post-carga-%`. Delega execução a `cleanup.js`. **Duplicata funcional de `clean-load-test-posts.js`.** |
| `constants.js` | `scripts/utils/constants.js` | Centraliza todas as constantes de configuração do projeto: `MAX_BACKUPS`, `DEFAULT_PORT`, `DISK_THRESHOLD_PERCENT`, `POST_ALERT_THRESHOLD`, `K6_RETENTION_DAYS`, `DEFAULT_BATCH_SIZE` (13 constantes no total). Elimina números mágicos. |
| `date-format.js` | `scripts/utils/date-format.js` | Formatação de datas com APIs nativas JS. Exporta `formatISODate()` e `formatLogDate()`. Substitui uso de `date-fns/format` em `backup.js`. |
| `init-table-utils.js` | `scripts/utils/init-table-utils.js` | Funções puras de schema extraídas de `init-table.js`: `getTableName()`, `loadSchemaFromDir()`, `buildCreateTableSQL()`, `getSeedValues()`, `buildSeedSQL()`. Permite testes unitários sem dependência de `import.meta.url`. |
| `list-settings.js` | `scripts/utils/list-settings.js` | Lista todas as configurações da tabela `settings`. |
| `list-table-columns.js` | `scripts/utils/list-table-columns.js` | Lista colunas de uma tabela com tipos e constraints. Aceita nome da tabela como argumento. |
| `load-env.js` | `scripts/utils/load-env.js` | Módulo compartilhado de carregamento de ambiente. Exporta `loadEnv()` (carrega `.env.local` com fallback `.env`) e `requireDatabaseUrl()` (valida `DATABASE_URL`). Substitui blocos repetidos em ~20 scripts. |
| `update-setting.js` | `scripts/utils/update-setting.js` | Atualiza ou insere configuração na tabela `settings`. Valida chave (regex), tipo (string/number/boolean/json) e valor. |

---

### 💻 `scripts/db-shell.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/db-shell.js`
- **Propósito:** Abre terminal interativo `psql` conectado ao banco via `DATABASE_URL`. Carrega `.env.local` e `.env` sequencialmente.
- **Dependências:** `dotenv`, `child_process`

### 🔄 `scripts/monitor-disk-space.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/monitor-disk-space.js`
- **Propósito:** Monitora espaço em disco em um ou mais mount points. Alerta se uso > threshold (85%). Usa `spawn('df')` com fallback `statfs`. Suporta `--json`, `--dry-run`, `--help` e múltiplos mount points. Integrado ao sistema de backup (verificado antes de cada `createBackup()`).
- **Dependências:** `fs`, `child_process` (spawn), `./utils/constants.js`

### 🔑 `scripts/reset-password.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/reset-password.js`
- **Propósito:** Reseta ou cria senha de usuário. Aceita username (opcional, default: `admin`) e nova senha (obrigatório). Gera hash bcrypt e atualiza no banco. Se usuário não existir, cria com role `admin`.
- **Uso:** `node scripts/reset-password.js [usuario] <nova_senha>`
- **Dependências:** `./utils/load-env.js`, `./db/connection.js`, `../lib/auth.js`

### 🔬 `scripts/check-sql-injection.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/check-sql-injection.js`
- **Propósito:** Escaneia código-fonte em busca de interpolação de variáveis em queries SQL sem prepared statements. Foca em `pool.query(...)` com 1 argumento contendo interpolação. Ignora falsos positivos (comentários, `_validateIdentifier()`, whitelists).
- **Uso:** `node scripts/check-sql-injection.js` (diretórios principais) ou `--all` (projeto completo)
- **Dependências:** Nenhuma (APIs nativas: `fs`, `path`, `url`)

---

## 📊 Resumo por Categoria

| Categoria | Quantidade | Descrição |
|-----------|:----------:|-----------|
| **Backup** | 5 | `backup.js` + entry points: `create-backup.js`, `restore-backup.js`, `init-backup.js`, `view-backup-logs.js` |
| **Seed** | 5 | `seed-all.js` (orquestrador) + `seed-musicas.js`, `seed-posts.js`, `seed-products.js`, `seed-videos.js` |
| **Migrações** | 16 | `migrate.js` (executor) + 14 migrações em `migrations/` |
| **Schemas JSON** | 4 | `schemas/` (dicas, musicas, posts, videos) |
| **Inicialização** | 4 | `init-table.js`, `init-server.js`, `init-backup.js`, `seed-settings.js` |
| **Limpeza (PostgreSQL)** | 5 | `clean-load-test-posts.js`, `clear-db.js`, `clear-musicas.js`, `utils/cleanup-test-data.js`, `maintenance/clean-k6-videos.js` + módulo compartilhado `cleanup.js` |
| **Limpeza (Arquivos/Cache)** | 4 | `clean-k6-reports.js`, `clean-orphaned-images.js`, `clean-test-db.js`, `clear-cache.js` |
| **Limpeza (Auth/Redis)** | 1 | `clear-test-auth-locks.js` |
| **Diagnóstico** | 8 | `check-db-status.js`, `check-env.js`, `check-server.js`, `check-sql-injection.js`, `validate-schema.js` + 5 em `diagnostics/` |
| **Testes de Carga** | 4 | `generate-load-report.js`, `run-all-load-tests-sequentially.js`, `run-load-tests.sh`, `warm-routes.js` |
| **Monitoramento** | 1 | `monitor-disk-space.js` |
| **Manutenção** | 3 | `maintenance/backup-posts.js`, `restore-posts.js`, `fix-hero-key.js`, `video-thumbnails.js` (contado apenas os exclusivos, `clean-k6-videos.js` já incluso em limpeza) |
| **Testes Manuais** | 2 | `tests/manual-api-test.js`, `tests/manual-rate-limit.js` |
| **Conexão DB** | 1 | `db/connection.js` (módulo compartilhado) |
| **Utilitários** | 9 | `utils/cleanup.js`, `cleanup-test-data.js`, `constants.js`, `date-format.js`, `init-table-utils.js`, `list-settings.js`, `list-table-columns.js`, `load-env.js`, `update-setting.js` |
| **Outros** | 3 | `db-shell.js`, `reset-password.js`, `cli/validate-schema.js` |
| **Irrelevantes/Fora de Lugar** | 2 | `db/verify-db-functions.js` (desatualizado), `db/verify-migration.js` (handler API fora de lugar) |
| **Total** | ~72 | Contando todos os scripts, schemas e módulos utilitários |

---

## ⚠️ Arquivos com Ressalvas

### `scripts/db/verify-db-functions.js`
- **Problema:** Importa de `./db.js` (caminho relativo que não corresponde a nenhum módulo atual do diretório `scripts/db/`). Provavelmente é um resquício de versão anterior onde `db.js` existia. Atualmente irrelevante.
- **Recomendação:** Pode ser removido ou atualizado para usar `./connection.js`.

### `scripts/db/verify-migration.js`
- **Problema:** Este arquivo é um handler de API Next.js (exporta `withAuth(handler)` e retorna JSON com contagens do banco). Foi colocado em `scripts/db/` por engano. Sua localização correta seria `pages/api/`. Além disso, importa de `../../../lib/auth` e `../../../lib/db`, o que sugere que deveria estar em uma subpasta de `pages/`, não em `scripts/`.
- **Recomendação:** Mover para `pages/api/verify-migration.js` ou remover se não estiver em uso.

### `scripts/utils/cleanup-test-data.js`
- **Problema:** Duplicata funcional de `scripts/clean-load-test-posts.js`. Ambos removem posts com slug `post-carga-%` usando o mesmo módulo `cleanup.js`. A existência de ambos é redundante.

---

> 📝 **Nota:** Este documento é puramente descritivo. Para sugestões de melhorias, correções e análise de duplicidades, consulte o documento complementar [`UPGRADE_scripts.md`](UPGRADE_scripts.md).
</content>
<task_progress>
- [x] Explorar estrutura completa da pasta /scripts
- [x] Analisar todos os arquivos das subpastas (cli, db, diagnostics, maintenance, migrations, schemas, tests, utils)
- [x] Consultar documentos anteriores (docs/antigos/PROJECT_scripts.md, docs/resolvidos/UPGRADE_scripts.md)
- [x] Ler arquivos adicionais para confirmar informações (seed-settings, verify-db-functions, verify-migration, check-server, connection, warm-routes)
- [ ] Criar /docs/PROJECT_scripts.md com análise consolidada
- [ ] Criar /docs/UPGRADE_scripts.md com levantamento de melhorias
</task_progress>