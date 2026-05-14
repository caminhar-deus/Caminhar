# Análise da Pasta `/data`

## Visão Geral

A pasta `/data` contém o banco de dados principal da aplicação e seus backups. É o repositório central de dados persistentes do projeto **Caminhar**.

---

## 1. `caminhar.db`

**Localização:** `/data/caminhar.db`

**Tipo:** Banco de dados SQLite

**Propósito:** Armazena todos os dados operacionais da aplicação.

**Estrutura (9 tabelas):**

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

**Schema detalhado:**

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  path TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL
);

CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL
);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT,
  image_url TEXT,
  published BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE post_categories (
  post_id INTEGER,
  category_id INTEGER,
  FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);

CREATE TABLE post_tags (
  post_id INTEGER,
  tag_id INTEGER,
  FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE musicas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  artista TEXT NOT NULL,
  url_imagem TEXT,
  url_spotify TEXT NOT NULL,
  publicado BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Observação:** É um banco SQLite local, o que significa que os dados residem em arquivo único e não requerem servidor de banco externo.

---

## 2. `backups/`

**Localização:** `/data/backups/`

**Tipo:** Diretório

**Propósito:** Centraliza todos os arquivos de backup do sistema.

**Arquivos atuais:**
- `backup.log` — Log das operações de backup realizadas (sanitizado, sem dados sensíveis)
- `caminhar-pg-backup_2026-03-07_11-20-04.sql.gz` — Backup PostgreSQL (legado, formato antigo)
- `caminhar-sqlite-backup_*.sql.gz` — Backup SQLite (gerado via `scripts/backup-sqlite.js`)
- `caminhar-pg-backup_*.sql.gz` — Backup PostgreSQL (gerado via `scripts/backup.js`)

**Backups removidos/movidos:**
- `posts-backup-2026-02-16T01-34-56-945Z.json` — Backup JSON redundante com dados de teste, movido para `/tmp/` (arquivo morto)

---

## 3. Estratégia de Backup

### Backup Combinado (recomendado)

O script principal `scripts/backup.js` agora executa backups de **ambos** os bancos (PostgreSQL e SQLite) em uma única chamada:

```bash
npm run backup
# ou
node scripts/backup.js
```

### Backup Apenas SQLite

```bash
node scripts/backup-sqlite.js
```

### Formato de Nomenclatura Padronizado

Todos os backups utilizam o formato ISO 8601:

```
caminhar-pg-backup_2026-03-10T02-00-00Z.sql.gz
caminhar-sqlite-backup_2026-03-10T02-00-00Z.sql.gz
```

### Funcionalidades Implementadas

| Funcionalidade | PostgreSQL (`backup.js`) | SQLite (`backup-sqlite.js`) |
|----------------|--------------------------|-----------------------------|
| Backup | `pg_dump` + gzip | `sqlite3 .dump` + gzip |
| Restore | `gunzip` + `psql` | `sqlite3` + input |
| Hash SHA-256 | ✅ | ✅ |
| Criptografia AES-256-GCM | ✅ (via env `BACKUP_ENCRYPTION_KEY`) | ❌ |
| Cleanup automático | ✅ (máx. 10 backups) | ✅ (máx. 10 backups) |
| Backup de segurança pré-restore | ✅ | ✅ |
| Log sanitizado | ✅ | ✅ |
| Listagem de backups | ✅ | ✅ |

---

## 4. Schema Sincronizado com PostgreSQL

Para garantir consistência entre ambientes, foi criada a migração `scripts/migrations/010-sync-sqlite-pg-schemas.js` que adiciona ao PostgreSQL todas as tabelas presentes no SQLite:

- `settings` — Configurações globais
- `categories` — Categorias para posts
- `tags` — Tags para posts
- `post_categories` — Relacionamento N:N posts ↔ categorias
- `post_tags` — Relacionamento N:N posts ↔ tags
- `musicas` — Músicas cadastradas

Além disso, o campo `uploaded_by` da tabela `images` foi padronizado para `user_id` em ambos os bancos.

---

## 5. Schemas no CRUD (`lib/crud.js`)

O arquivo `lib/crud.js` contém a definição dos campos permitidos para cada tabela, garantindo validação em operações de insert/update. As seguintes tabelas foram adicionadas/atualizadas:

| Tabela | Campos |
|--------|--------|
| `images` | id, filename, path, type, size, user_id, uploaded_at |
| `categories` | id, name, slug |
| `tags` | id, name, slug |
| `post_categories` | post_id, category_id |
| `post_tags` | post_id, tag_id |
| `users` | id, username, password, role, last_login_at, created_at, updated_at |

---

## Resumo da Arquitetura de Dados

| Aspecto | Descrição |
|---------|-----------|
| **Banco principal** | SQLite (`caminhar.db`) para desenvolvimento/local |
| **Banco secundário** | PostgreSQL (produção) |
| **Estratégia de backup** | Combinada: PostgreSQL + SQLite em formato SQL comprimido |
| **Formato de data** | ISO 8601 (padronizado) |
| **Integridade** | Hash SHA-256 para todos os backups |
| **Segurança** | Logs sanitizados (sem senhas, tokens ou chaves) |
| **Tipo de dados** | Posts, usuários, músicas, imagens, configurações, categorias, tags |
| **Relacionamentos** | Posts ↔ Categorias (N:N), Posts ↔ Tags (N:N), Imagens ↔ Usuários (N:1) |