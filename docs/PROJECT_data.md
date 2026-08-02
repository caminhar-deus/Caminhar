# Documentação de Análise — Pasta `/data`

## Visão Geral

A pasta `/data` contém exclusivamente os **backups do banco de dados PostgreSQL** da aplicação. Sua estrutura é simples: um único subdiretório `backups/` que armazena os dumps criptografados, seus hashes de verificação e o log de operações.

O banco de dados principal do projeto **Caminhar** é acessado via `lib/infra/db.js` utilizando `pg.Pool` com a variável de ambiente `DATABASE_URL`.

---

## Estrutura de Arquivos

```
data/
└── backups/
    ├── backup.log                                    (bloqueado pelo .clineignore)
    ├── caminhar-pg-backup_2026-05-21T19-56-57Z.sql.gz.enc
    ├── caminhar-pg-backup_2026-05-21T19-56-57Z.sql.gz.sha256
    ├── caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.enc
    └── caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.sha256
```

---

## 1. Subdiretório `backups/`

**Localização:** `/data/backups/`

**Propósito:** Centraliza todos os arquivos gerados pelo sistema de backup do banco de dados PostgreSQL, garantindo organização e rastreabilidade.

**Arquivos atuais (4 + 1 log):**

| # | Arquivo | Tipo | Propósito Principal | Relevância |
|---|---------|------|---------------------|------------|
| 1 | `backup.log` | Log | Registro sanitizado das operações de backup | 🟡 Importante |
| 2 | `caminhar-pg-backup_2026-05-21T19-56-57Z.sql.gz.enc` | Backup | Dump criptografado do banco (21/mai) | 🔴 Essencial |
| 3 | `caminhar-pg-backup_2026-05-21T19-56-57Z.sql.gz.sha256` | Hash | Verificação de integridade (21/mai) | 🟡 Importante |
| 4 | `caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.enc` | Backup | Dump criptografado do banco (22/mai) | 🔴 Essencial |
| 5 | `caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.sha256` | Hash | Verificação de integridade (22/mai) | 🟡 Importante |

**Legenda:** 🔴 Essencial · 🟡 Importante · ⚪ Acessório

---

## 2. Arquivos de Backup

### 2.1 `backup.log`

**Localização:** `/data/backups/backup.log` (arquivo bloqueado pelo `.clineignore`)

**Propósito:** Registro sanitizado das operações de backup realizadas. Contém metadados das execuções sem dados sensíveis (senhas, tokens ou chaves).

**Funcionalidades:**
- Registra operações com status: `SUCCESS`, `ERROR`, `INFO`, `WARNING`, `RESTORE_SUCCESS`, `RESTORE_ERROR`
- Sanitização automática de mensagens (remove senhas, tokens, chaves, `DATABASE_URL`, `JWT_SECRET`, `BACKUP_ENCRYPTION_KEY`)
- Rotação automática por tamanho (10 MB) ou por mudança de mês, renomeando para `backup-<timestamp>.log`
- Retenção configurável: logs rotacionados com mais de 30 dias são removidos automaticamente
- Buffer em memória com máximo de 100 linhas para consultas rápidas

**Observação:** Arquivo não acessível diretamente pela análise. Sua existência está confirmada pela estrutura do diretório e referenciada nos scripts e documentos de backup do projeto.

---

### 2.2 `caminhar-pg-backup_2026-05-21T19-56-57Z.sql.gz.enc`

**Localização:** `/data/backups/caminhar-pg-backup_2026-05-21T19-56-57Z.sql.gz.enc`

**Propósito:** Backup completo do banco PostgreSQL realizado em **21 de maio de 2026 às 19:56:57 UTC**. O arquivo segue o padrão:

- `caminhar-pg-backup_` — prefixo fixo identificando o projeto
- `2026-05-21T19-56-57Z` — timestamp ISO 8601 do momento do backup
- `.sql.gz` — dump SQL comprimido com gzip
- `.enc` — indicador de criptografia AES-256-GCM aplicada

**Principais funcionalidades:**
- Armazena dump completo do banco PostgreSQL via `pg_dump`
- Comprimido com gzip para redução de tamanho
- Criptografado com AES-256-GCM usando a chave definida em `BACKUP_ENCRYPTION_KEY` (64 caracteres hexadecimais exigidos)
- Restauração via `gunzip` + `psql` (após descriptografia)

---

### 2.3 `caminhar-pg-backup_2026-05-21T19-56-57Z.sql.gz.sha256`

**Localização:** `/data/backups/caminhar-pg-backup_2026-05-21T19-56-57Z.sql.gz.sha256`

**Propósito:** Arquivo contendo o hash SHA-256 do backup correspondente, utilizado para verificação de integridade do arquivo antes de operações de restore.

**Funcionalidade:** Permite confirmar que o arquivo de backup não foi corrompido ou adulterado desde sua geração. O hash é calculado via stream (sem carregar o arquivo inteiro na RAM).

---

### 2.4 `caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.enc`

**Localização:** `/data/backups/caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.enc`

**Propósito:** Backup completo do banco PostgreSQL realizado em **22 de maio de 2026 às 10:18:54 UTC**. Mesmo formato e características do backup anterior.

---

### 2.5 `caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.sha256`

**Localização:** `/data/backups/caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.sha256`

**Propósito:** Hash SHA-256 do backup do dia 22 de maio de 2026, seguindo o mesmo padrão de verificação de integridade.

---

## 3. Sistema de Backup — Módulo Central

### 3.1 `scripts/backup.js` (módulo central)

**Localização:** `/scripts/backup.js`

**Propósito:** Módulo central que gerencia todo o ciclo de vida dos backups. Define o diretório `data/backups` como destino padrão e exporta funções reutilizáveis.

**Funcionalidades principais:**
- **`createBackup()`** — Cria backup via `pg_dump` + gzip, gera hash SHA-256, aplica criptografia opcional AES-256-GCM, registra no log e limpa backups antigos
- **`restoreBackup()`** — Restaura banco a partir de backup, criando backup de segurança pré-restore, verificando integridade via hash e descriptografando quando necessário
- **`cleanupOldBackups()`** — Remove backups que excedem o limite máximo (10), incluindo arquivos `.enc` e `.sha256` associados
- **`getAvailableBackups()`** — Lista backups disponíveis com metadados (nome, timestamp, tamanho)
- **`getBackupLogs()`** — Consulta logs de backup (atual e rotacionados)
- **`initializeBackupSystem()`** — Inicializa o sistema criando o primeiro backup
- **`checkDiskBeforeBackup()`** — Verifica espaço em disco antes do backup (via `df` com fallback `statfs`)
- **`rotateLogIfNeeded()`** — Rotaciona o log por tamanho (10 MB) ou mudança de mês
- **`cleanupOldLogs()`** — Remove logs rotacionados com mais de 30 dias

**Pontos técnicos relevantes:**
- Usa `spawn` sem shell para `pg_dump`/`psql` (seguro contra command injection)
- Usa streams para hash e compressão (sem carregar arquivos inteiros na RAM)
- Usa `fs.promises` para operações assíncronas
- Sanitiza mensagens de log para não expor dados sensíveis
- Remove duplicatas `.enc` → nome base na listagem

---

## 4. Scripts Wrapper (Entry Points CLI)

### 4.1 `scripts/create-backup.js`

**Localização:** `/scripts/create-backup.js`

**Propósito:** Ponto de entrada para criar um backup manual do banco PostgreSQL.

**Funcionalidades:**
- Carrega variáveis de ambiente via `loadEnv()` (prioriza `.env.local`, depois `.env`)
- Chama `createBackup()` do módulo central
- Em caso de erro, loga mensagem e sai com `process.exit(1)`

**Comando:** `npm run backup:create`

---

### 4.2 `scripts/restore-backup.js`

**Localização:** `/scripts/restore-backup.js`

**Propósito:** Ponto de entrada para restaurar o banco a partir de um backup.

**Funcionalidades:**
- Se nenhum arquivo for passado, lista os backups disponíveis em `data/backups`
- Chama `restoreBackup()` do módulo central
- Exibe mensagem de sucesso do backup de segurança pré-restore

**Comando:** `npm run backup:restore <nome-do-arquivo.sql.gz>`

---

### 4.3 `scripts/init-backup.js`

**Localização:** `/scripts/init-backup.js`

**Propósito:** Inicializa o sistema de backup criando o primeiro backup.

**Funcionalidades:**
- Chama `initializeBackupSystem()` do módulo central
- Exibe instruções para configuração de cron job (backup diário às 2 AM)

**Comando:** `npm run backup:init`

---

### 4.4 `scripts/view-backup-logs.js`

**Localização:** `/scripts/view-backup-logs.js`

**Propósito:** Exibe os logs do sistema de backup.

**Funcionalidades:**
- Suporta flag `--all` para incluir logs de arquivos rotacionados
- Formata cada registro como `[timestamp] [status] mensagem`

**Comandos:** `npm run backup:logs` (atual) · `npm run backup:logs:all` (inclui rotacionados)

---

## 5. Scripts de Manutenção Específica

### 5.1 `scripts/maintenance/backup-posts.js`

**Localização:** `/scripts/maintenance/backup-posts.js`

**Propósito:** Cria backup específico da tabela `posts` em formato JSON, focado em conteúdo editorial.

**Funcionalidades:**
- Conecta ao PostgreSQL via `pg.Pool` próprio
- Executa `SELECT * FROM posts ORDER BY id ASC`
- Gera arquivo `posts-backup-<timestamp>.json`
- Usa I/O síncrono (`fs.writeFileSync`)

**Observação:** Este script gera um backup JSON redundante, pois o backup PostgreSQL (`pg_dump`) já cobre a tabela `posts`. O backup JSON anterior foi removido do diretório por duplicidade (ver `docs/resolvidos/UPGRADE_data.md`).

**⚠️ Inconsistência de caminho:** O script usa `path.resolve(__dirname, '../data/backups')`, que a partir de `scripts/maintenance/` resolve para `scripts/data/backups` — **não** para `data/backups` na raiz do projeto. O diretório `scripts/data/` não existe atualmente. Ao executar, o script criaria um diretório `scripts/data/backups` separado, fora do diretório de backups oficial.

---

### 5.2 `scripts/maintenance/restore-posts.js`

**Localização:** `/scripts/maintenance/restore-posts.js`

**Propósito:** Restaura a tabela `posts` a partir do backup JSON mais recente.

**Funcionalidades:**
- Busca o arquivo `posts-backup-*.json` mais recente
- Usa UPSERT (`ON CONFLICT (id) DO UPDATE`) para evitar erros de ID duplicado
- Processa posts um a um

**Observação:** Complementa o `backup-posts.js` e compartilha a mesma redundância de estratégia.

**⚠️ Inconsistência de caminho:** Assim como o `backup-posts.js`, usa `path.resolve(__dirname, '../data/backups')`, que resolve para `scripts/data/backups`. Como esse diretório não existe, o script retornaria "Diretório de backups não encontrado" e encerraria sem restaurar nada.

---

## 6. Monitoramento de Disco

### 6.1 `scripts/monitor-disk-space.js`

**Localização:** `/scripts/monitor-disk-space.js`

**Propósito:** Verifica o uso de disco em um ou mais mount points e alerta quando o uso ultrapassa o threshold configurado.

**Funcionalidades:**
- Verifica via `df` (spawn, seguro) com fallback `fs.promises.statfs`
- Suporta flags: `--dry-run`, `--json`, `--help`
- Integrado ao `backup.js` (verifica disco antes de cada backup)
- Recomenda limpeza de backups antigos em `data/backups` quando o disco está cheio

**Variáveis de ambiente:** `DISK_THRESHOLD` (default 85%) · `DISK_PATH` (default `/`)

---

## 7. Constantes e Utilitários

### 7.1 `scripts/utils/constants.js`

**Localização:** `/scripts/utils/constants.js`

**Propósito:** Centraliza valores de configuração que antes estavam espalhados como números mágicos.

**Constantes de backup:**
- `MAX_BACKUPS` = 10 (número máximo de backups a manter)
- `DEFAULT_LIST_LIMIT` = 50 (limite de listagem)
- `PRE_RESTORE_PREFIX` = `pre-restore_` (prefixo de backups de segurança)
- `BACKUP_INTERVAL_MS` = 24h (intervalo entre backups)
- `ENCRYPTION_KEY_LENGTH` = 32 bytes (chave AES-256)
- `MAX_LOG_LINES` = 100 (buffer de log em memória)
- `LOG_RETENTION_DAYS` = 30 (retenção de logs rotacionados)
- `LOG_MAX_SIZE_BYTES` = 10 MB (rotação por tamanho)
- `DISK_THRESHOLD_PERCENT` = 85 (alerta de disco)
- `DISK_PATH_DEFAULT` = `/` (mount point padrão)

---

### 7.2 `scripts/utils/date-format.js`

**Localização:** `/scripts/utils/date-format.js`

**Propósito:** Utilitário de formatação de datas usando APIs nativas do JavaScript.

**Funcionalidades:**
- `formatISODate()` — Formata data no padrão ISO usado em nomes de arquivo de backup (ex: `2026-05-21T23-00-00Z`)
- `formatLogDate()` — Formata data no padrão de log (ex: `2026-05-21 23:00:00`)

---

## 8. API Admin de Backups

### 8.1 `pages/api/admin/backups.js`

**Localização:** `/pages/api/admin/backups.js`

**Propósito:** Endpoint da API admin para gerenciar backups via interface web.

**Funcionalidades:**
- **GET** — Lista backups disponíveis em `data/backups`, ordenados por data (mais recente primeiro), retornando o mais recente
- **POST** — Cria um novo backup chamando `createBackup()` e registra atividade de auditoria
- Rate limit: máximo 10 requisições por minuto
- Protegido por `createAdminHandler` (autenticação admin)

---

## 9. Testes do Sistema de Backup

### 9.1 Testes Unitários do Módulo Central

**Localização:** `/tests/unit/lib/backup/`

**Propósito:** Testes unitários que validam as funções do módulo `scripts/backup.js`. Todos usam `jest.mock('fs')` para simular operações de sistema de arquivos sem acessar o disco real.

| Arquivo | O que testa |
|---------|-------------|
| `backup.available.test.js` | Listagem, formatação e ordenação de backups (`getAvailableBackups`) |
| `backup.cleanup.test.js` | Rotação de backups (`cleanupOldBackups`) — remoção de excedentes, limite de 10, filtro de arquivos inválidos |
| `backup.logs.test.js` | Parsing de logs (`getBackupLogs`) — linhas válidas, mal formatadas, arquivo vazio/inexistente |
| `backup.operations.test.js` | Operações de criação e restauração (`createBackup`, `restoreBackup`) — pg_dump, diretório, cleanup, log, backup de segurança |

### 9.2 Teste de Integração da API Admin

**Localização:** `/tests/integration/api/admin/backups.test.js`

**Propósito:** Teste de integração que valida o endpoint da API admin de backups (`pages/api/admin/backups.js`). Usa `node-mocks-http` e mocks de `fs` e `createBackup`.

**O que testa:**
- **GET** — Listagem de backups ordenados, diretório inexistente (retorna `latest: null`), erros de filesystem (retorna 500)
- **POST** — Criação de backup com sucesso e falha (retorna 500)
- **Métodos não permitidos** — PUT/DELETE retornam 405

**Observação:** O teste não cobre o rate limit (máximo 10 requisições por minuto) nem cenários de autenticação (o mock de `withAuth` sempre injeta um usuário admin).

---

## 10. Comandos npm Relacionados

| Comando | Script | Descrição |
|---------|--------|-----------|
| `npm run backup:init` | `scripts/init-backup.js` | Inicializa o sistema de backup |
| `npm run backup:create` | `scripts/create-backup.js` | Cria backup manual |
| `npm run backup:restore` | `scripts/restore-backup.js` | Restaura banco a partir de backup |
| `npm run backup:logs` | `scripts/view-backup-logs.js` | Exibe logs atuais |
| `npm run backup:logs:all` | `scripts/view-backup-logs.js --all` | Exibe logs atuais + rotacionados |
| `npm run db:reset:safe` | `backup:create && db:reset` | Backup antes de resetar o banco |

---

## 11. Estratégia de Backup

O sistema de backup é gerenciado pelo script `scripts/backup.js` e oferece as seguintes funcionalidades:

| Funcionalidade | Descrição |
|---------------|-----------|
| **Backup** | `pg_dump` com compressão gzip |
| **Restore** | `gunzip` + `psql` |
| **Hash SHA-256** | Geração automática para cada backup (inclusive safety backups) |
| **Criptografia AES-256-GCM** | Opcional, ativada via `BACKUP_ENCRYPTION_KEY` |
| **Validação de chave** | Exige 64 caracteres hexadecimais |
| **Cleanup automático** | Mantém no máximo 10 backups recentes (inclui safety backups) |
| **Backup pré-restore** | Cria backup de segurança antes de restaurar, com nomenclatura padronizada, hash e registro em log |
| **Log sanitizado** | Registra operações sem dados sensíveis |
| **Rotação de logs** | Rotação automática por tamanho (10 MB) ou por mudança de mês, com retenção configurável de 30 dias |
| **Consulta de histórico de logs** | `npm run backup:logs` (apenas log atual) ou `npm run backup:logs:all` (inclui logs rotacionados) |
| **Listagem de backups** | Comando para listar backups disponíveis (inclui safety backups) |
| **Verificação de disco** | Checa espaço disponível antes do backup |

---

## 12. Estrutura do Banco de Dados (Contexto)

O banco PostgreSQL gerenciado por este sistema de backup contém **15 tabelas**:

| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários do sistema (autenticação e roles) |
| `settings` | Configurações globais da aplicação (chave/valor) |
| `images` | Metadados de imagens enviadas (FK para users) |
| `categories` | Categorias para classificação de posts |
| `tags` | Tags para marcação de posts |
| `posts` | Conteúdos publicados no blog |
| `post_categories` | Relacionamento N:N entre posts e categorias |
| `post_tags` | Relacionamento N:N entre posts e tags |
| `musicas` | Músicas cadastradas (via Spotify) |
| `videos` | Vídeos cadastrados |
| `products` | Produtos cadastrados |
| `dicas` | Dicas cadastradas |
| `activity_logs` | Log de auditoria |
| `roles` | Cargos e permissões |
| `_migrations` | Controle de versão das migrações aplicadas |

---

## 13. Migrações Aplicadas

A tabela `_migrations` registra **11 migrações** executadas no schema do banco:

| ID | Nome | Descrição |
|----|------|-----------|
| 1 | `001-add-views-to-posts` | Adiciona coluna de visualizações aos posts |
| 2 | `002-create-products-table` | Cria tabela de produtos |
| 3 | `003-add-position-to-products` | Adiciona campo de ordenação aos produtos |
| 4 | `004-add-published-to-products` | Adiciona campo de publicação aos produtos |
| 5 | `005-add-last-login-to-users` | Adiciona campo de último login aos usuários |
| 6 | `006-create-activity-logs` | Cria tabela de log de auditoria |
| 7 | `007-add-position-to-musicas` | Adiciona campo de ordenação às músicas |
| 8 | `008-add-position-to-videos` | Adiciona campo de ordenação aos vídeos |
| 9 | `009-add-position-to-posts` | Adiciona campo de ordenação aos posts |
| 10 | `011-fix-entity-id-type` | Altera `entity_id` de INTEGER para BIGINT em `activity_logs` |
| 11 | `013-add-trgm-indexes` | Adiciona índices de busca textual (pg_trgm) |

**Observação:** As migrations `010-sync-sqlite-pg-schemas` e `012-migrate-sqlite-to-pg` foram criadas durante a unificação SQLite → PostgreSQL, mas seus arquivos foram removidos posteriormente. As alterações de schema correspondentes já estão presentes no banco.

---

## 14. Formato de Nomenclatura Padronizado

Todos os backups seguem o padrão ISO 8601:

```
caminhar-pg-backup_YYYY-MM-DDTHH-MM-SSZ.sql.gz[.enc][.sha256]
```

Exemplo real:
```
caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.enc
caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.sha256
```

---

## Observações Finais

- A pasta `/data` contém **apenas backups do PostgreSQL**, sem arquivos de dados brutos, exports intermediários ou arquivos de configuração de banco.
- Os backups são nomeados e organizados de forma padronizada, facilitando a identificação e o gerenciamento.
- O sistema de criptografia AES-256-GCM é opcional e depende da variável `BACKUP_ENCRYPTION_KEY` estar configurada.
- Os hashes SHA-256 acompanham cada backup, permitindo verificação de integridade antes de operações de restore.
- O log `backup.log` não pôde ser analisado diretamente por estar bloqueado pelo `.clineignore`, mas sua finalidade está documentada no script `scripts/backup.js`.
- Os scripts `scripts/maintenance/backup-posts.js` e `scripts/maintenance/restore-posts.js` geram backups JSON redundantes, pois o backup PostgreSQL já cobre a tabela `posts`. Essa duplicidade foi identificada anteriormente e o backup JSON antigo foi removido, mas os scripts permanecem no projeto.