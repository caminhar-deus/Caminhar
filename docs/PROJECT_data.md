# Documentação de Análise — Arquivos da Pasta `/data`

## Visão Geral

A pasta `/data` contém exclusivamente os **backups do banco de dados PostgreSQL** da aplicação. Sua estrutura é simples: um único subdiretório `backups/` que armazena os dumps criptografados e seus hashes de verificação.

O banco de dados principal do projeto **Caminhar** é acessado via `lib/db.js` utilizando `pg.Pool` com a variável de ambiente `DATABASE_URL`.

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

---

## 2. Arquivos de Backup

### 2.1 `backup.log`

**Localização:** `/data/backups/backup.log` (arquivo bloqueado pelo `.clineignore`)

**Propósito:** Registro sanitizado das operações de backup realizadas. Contém metadados das execuções sem dados sensíveis (senhas, tokens ou chaves).

**Observação:** Arquivo não acessível diretamente pela análise. Sua existência está confirmada pela estrutura do diretório e referenciada nos documentos de backup do projeto.

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

**Funcionalidade:** Permite confirmar que o arquivo de backup não foi corrompido ou adulterado desde sua geração.

---

### 2.4 `caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.enc`

**Localização:** `/data/backups/caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.enc`

**Propósito:** Backup completo do banco PostgreSQL realizado em **22 de maio de 2026 às 10:18:54 UTC**. Mesmo formato e características do backup anterior.

---

### 2.5 `caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.sha256`

**Localização:** `/data/backups/caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.sha256`

**Propósito:** Hash SHA-256 do backup do dia 22 de maio de 2026, seguindo o mesmo padrão de verificação de integridade.

---

## 3. Estratégia de Backup

O sistema de backup é gerenciado pelo script `scripts/backup.js` e oferece as seguintes funcionalidades:

| Funcionalidade | Descrição |
|---------------|-----------|
| **Backup** | `pg_dump` com compressão gzip |
| **Restore** | `gunzip` + `psql` |
| **Hash SHA-256** | Geração automática para cada backup |
| **Criptografia AES-256-GCM** | Opcional, ativada via `BACKUP_ENCRYPTION_KEY` |
| **Validação de chave** | Exige 64 caracteres hexadecimais |
| **Cleanup automático** | Mantém no máximo 10 backups recentes |
| **Backup pré-restore** | Cria backup de segurança antes de restaurar |
| **Log sanitizado** | Registra operações sem dados sensíveis |
| **Listagem de backups** | Comando para listar backups disponíveis |
| **Verificação de disco** | Checa espaço disponível antes do backup |

---

## 4. Estrutura do Banco de Dados (Contexto)

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

## 5. Migrações Aplicadas

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

## 6. Formato de Nomenclatura Padronizado

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

## Resumo dos Arquivos Analisados

| # | Arquivo | Tipo | Propósito Principal | Relevância |
|---|---------|------|---------------------|------------|
| 1 | `backup.log` | Log | Registro sanitizado das operações de backup | 🟡 Importante |
| 2 | `caminhar-pg-backup_2026-05-21T19-56-57Z.sql.gz.enc` | Backup | Dump criptografado do banco (21/mai) | 🔴 Essencial |
| 3 | `caminhar-pg-backup_2026-05-21T19-56-57Z.sql.gz.sha256` | Hash | Verificação de integridade (21/mai) | 🟡 Importante |
| 4 | `caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.enc` | Backup | Dump criptografado do banco (22/mai) | 🔴 Essencial |
| 5 | `caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.sha256` | Hash | Verificação de integridade (22/mai) | 🟡 Importante |

**Legenda:** 🔴 Essencial · 🟡 Importante · ⚪ Acessório

---

## Observações Finais

- A pasta `/data` contém **apenas backups do PostgreSQL**, sem arquivos de dados brutos, exports intermediários ou arquivos de configuração de banco.
- Os backups são nomeados e organizados de forma padronizada, facilitando a identificação e o gerenciamento.
- O sistema de criptografia AES-256-GCM é opcional e depende da variável `BACKUP_ENCRYPTION_KEY` estar configurada.
- Os hashes SHA-256 acompanham cada backup, permitindo verificação de integridade antes de operações de restore.
- O log `backup.log` não pôde ser analisado diretamente por estar bloqueado pelo `.clineignore`, mas sua finalidade está documentada no script `scripts/backup.js`.