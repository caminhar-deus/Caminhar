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
| `images` | Metadados de imagens enviadas |
| `categories` | Categorias para classificação de posts |
| `tags` | Tags para marcação de posts |
| `posts` | Conteúdos publicados no blog |
| `post_categories` | Relacionamento N:N entre posts e categorias |
| `post_tags` | Relacionamento N:N entre posts e tags |
| `musicas` | Músicas cadastradas (via Spotify) |

**Observação:** É um banco SQLite local, o que significa que os dados residem em arquivo único e não requerem servidor de banco externo.

---

## 2. `backups/caminhar-pg-backup_2026-03-07_11-20-04.sql.gz`

**Localização:** `/data/backups/caminhar-pg-backup_2026-03-07_11-20-04.sql.gz`

**Tipo:** Backup comprimido (gzip) no formato SQL (PostgreSQL)

**Propósito:** Backup do schema e dados em formato PostgreSQL. Indica que o projeto também possui uma versão/suporte para PostgreSQL como banco alternativo ou de produção.

**Schema contido (6 tabelas):**
- `images` - com campos: id, filename, path, type, size, user_id, created_at
- Demais tabelas seguem estrutura similar ao SQLite

**Origem:** PostgreSQL 16.13 (Ubuntu)

---

## 3. `backups/posts-backup-2026-02-16T01-34-56-945Z.json`

**Localização:** `/data/backups/posts-backup-2026-02-16T01-34-56-945Z.json`

**Tipo:** Arquivo JSON

**Propósito:** Backup específico dos posts do blog em formato JSON, contendo dados como título, slug, excerpt, conteúdo HTML, URL da imagem, status de publicação e timestamps.

**Conteúdo:** Array de objetos com os campos:
- id, title, slug, excerpt, content, image_url, published, created_at, updated_at

**Observação:** Backup pontual, provavelmente gerado por script automatizado (`scripts/backup.js` ou similar).

---

## 4. `backups/`

**Localização:** `/data/backups/`

**Tipo:** Diretório

**Propósito:** Centraliza todos os arquivos de backup do sistema.

**Arquivos presentes:**
- `backup.log` — Log das operações de backup realizadas
- `caminhar-pg-backup_2026-03-07_11-20-04.sql.gz` — Backup PostgreSQL
- `posts-backup-2026-02-16T01-34-56-945Z.json` — Backup JSON de posts

---

## Resumo da Arquitetura de Dados

| Aspecto | Descrição |
|---------|-----------|
| **Banco principal** | SQLite (`caminhar.db`) para desenvolvimento/local |
| **Banco secundário** | PostgreSQL (via backup, provavelmente produção) |
| **Estratégia de backup** | Mista: dump SQL + exportação JSON |
| **Tipo de dados** | Posts, usuários, músicas, imagens, configurações |
| **Relacionamentos** | Posts <-> Categorias (N:N), Posts <-> Tags (N:N), Imagens <-> Usuários (N:1) |