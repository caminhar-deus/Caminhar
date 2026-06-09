# Análise da Pasta `/data`

## Visão Geral

A pasta `/data` contém os backups do banco de dados da aplicação. O banco de dados principal do projeto **Caminhar** é o **PostgreSQL**, acessado via `lib/db.js`.

---

## 1. Banco de Dados

**Tipo:** PostgreSQL (único banco — SQLite foi removido)

**Acesso:** Via `lib/db.js` utilizando `pg.Pool` com `DATABASE_URL`

**Schema (15 tabelas):**

| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários do sistema (autenticação e roles) |
| `settings` | Configurações globais da aplicação (chave/valor) |
| `images` | Metadados de imagens enviadas (campo `user_id` FK para users) |
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

## 2. `backups/`

**Localização:** `/data/backups/`

**Tipo:** Diretório

**Propósito:** Centraliza todos os arquivos de backup do sistema.

**Arquivos atuais:**
- `backup.log` — Log das operações de backup realizadas (sanitizado, sem dados sensíveis)
- `caminhar-pg-backup_*.sql.gz` — Backup PostgreSQL (gerado via `scripts/backup.js`)
- `caminhar-pg-backup_*.sql.gz.sha256` — Hash SHA-256 para verificação de integridade
- `caminhar-pg-backup_*.sql.gz.enc` — Backup criptografado (AES-256-GCM, opcional)

---

## 3. Estratégia de Backup

### Backup (recomendado)

```bash
npm run backup
# ou
node scripts/backup.js
```

### Formato de Nomenclatura Padronizado

Todos os backups utilizam o formato ISO 8601:

```
caminhar-pg-backup_2026-03-10T02-00-00Z.sql.gz
```

### Funcionalidades Implementadas

| Funcionalidade | PostgreSQL (`backup.js`) |
|----------------|--------------------------|
| Backup | `pg_dump` + gzip |
| Restore | `gunzip` + `psql` |
| Hash SHA-256 | ✅ |
| Criptografia AES-256-GCM | ✅ (via env `BACKUP_ENCRYPTION_KEY`) |
| Validação de chave de criptografia | ✅ (64 chars hex exigidos) |
| Cleanup automático | ✅ (máx. 10 backups) |
| Backup de segurança pré-restore | ✅ |
| Log sanitizado | ✅ |
| Listagem de backups | ✅ |
| Verificação de espaço em disco | ✅ |

---

## 4. Schemas no CRUD (`lib/crud.js`)

O arquivo `lib/crud.js` contém a definição dos campos permitidos para cada tabela, garantindo validação em operações de insert/update.

| Tabela | Campos |
|--------|--------|
| `images` | id, filename, path, type, size, user_id, uploaded_at |
| `categories` | id, name, slug |
| `tags` | id, name, slug |
| `post_categories` | post_id, category_id |
| `post_tags` | post_id, tag_id |
| `users` | id, username, password, role, last_login_at, created_at, updated_at |

---

## 5. Histórico de Migrações

Migrations registradas na tabela `_migrations` do banco PostgreSQL:

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

**Observação:** As migrations `010-sync-sqlite-pg-schemas` e `012-migrate-sqlite-to-pg` foram criadas durante o processo de unificação SQLite → PostgreSQL, mas seus arquivos foram posteriormente removidos. As alterações de schema que elas contemplavam já estavam presentes no banco PostgreSQL.

---

## Resumo da Arquitetura de Dados

| Aspecto | Descrição |
|---------|-----------|
| **Banco** | PostgreSQL (único, 15 tabelas) |
| **Estratégia de backup** | Dump SQL comprimido via `pg_dump` |
| **Formato de data** | ISO 8601 (padronizado) |
| **Integridade** | Hash SHA-256 para todos os backups |
| **Segurança** | Logs sanitizados (sem senhas, tokens ou chaves) |
| **Criptografia** | AES-256-GCM opcional via `BACKUP_ENCRYPTION_KEY` |
| **Tipos de dados** | Posts, usuários, músicas, vídeos, produtos, imagens, configurações, categorias, tags, dicas |
| **Relacionamentos** | Posts ↔ Categorias (N:N), Posts ↔ Tags (N:N), Imagens ↔ Usuários (N:1) |
| **Migrações** | 11 migrações registradas via `scripts/migrations/` + `scripts/migrate.js` |