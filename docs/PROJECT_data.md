# Análise da Pasta `/data`

## Visão Geral

A pasta `/data` contém os backups do banco de dados da aplicação. O banco de dados principal do projeto **Caminhar** é o **PostgreSQL**, acessado via `lib/db.js`.

---

## 1. Banco de Dados

**Tipo:** PostgreSQL

**Acesso:** Via `lib/db.js` utilizando `pg.Pool` com `DATABASE_URL`

**Schema (9+ tabelas):**

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

---

## 2. `backups/`

**Localização:** `/data/backups/`

**Tipo:** Diretório

**Propósito:** Centraliza todos os arquivos de backup do sistema.

**Arquivos atuais:**
- `backup.log` — Log das operações de backup realizadas (sanitizado, sem dados sensíveis)
- `caminhar-pg-backup_*.sql.gz` — Backup PostgreSQL (gerado via `scripts/backup.js`)

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
| Cleanup automático | ✅ (máx. 10 backups) |
| Backup de segurança pré-restore | ✅ |
| Log sanitizado | ✅ |
| Listagem de backups | ✅ |

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

## Histórico de Migrações

- `010-sync-sqlite-pg-schemas.js` — Sincronizou schemas entre SQLite (descontinuado) e PostgreSQL
- `011-fix-entity-id-type.js` — Alterou `entity_id` de `INTEGER` para `BIGINT` em `activity_logs`
- `012-migrate-sqlite-to-pg.js` — Migrou dados remanescentes do SQLite para PostgreSQL e removeu o SQLite

---

## Resumo da Arquitetura de Dados

| Aspecto | Descrição |
|---------|-----------|
| **Banco** | PostgreSQL (único) |
| **Estratégia de backup** | Dump SQL comprimido via `pg_dump` |
| **Formato de data** | ISO 8601 (padronizado) |
| **Integridade** | Hash SHA-256 para todos os backups |
| **Segurança** | Logs sanitizados (sem senhas, tokens ou chaves) |
| **Tipo de dados** | Posts, usuários, músicas, vídeos, produtos, imagens, configurações, categorias, tags |
| **Relacionamentos** | Posts ↔ Categorias (N:N), Posts ↔ Tags (N:N), Imagens ↔ Usuários (N:1) |