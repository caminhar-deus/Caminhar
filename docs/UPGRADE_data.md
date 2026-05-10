# Relatório de Correções e Melhorias — Pasta `/data`

## 1. Inconsistência de Schema: SQLite vs PostgreSQL

**Localização:** `/data/caminhar.db` vs `/data/backups/caminhar-pg-backup_2026-03-07_11-20-04.sql.gz`

**Problema:** Os schemas do SQLite e do PostgreSQL são diferentes. O SQLite possui 9 tabelas, enquanto o backup PostgreSQL contém apenas 6 `CREATE TABLE`. Tabelas como `settings`, `categories`, `tags`, `post_categories`, `post_tags` e `musicas` estão ausentes no backup PostgreSQL.

**Impacto:** Em um eventual restore do backup PostgreSQL, dados importantes seriam perdidos (categorias, tags, configurações, músicas).

**Sugestão:** Sincronizar os schemas, garantindo que o backup PostgreSQL cubra todas as tabelas existentes no SQLite.

---

## 2. Diferença na Estrutura da Tabela `images`

**Localização:** `/data/caminhar.db` (SQLite) e `/data/backups/caminhar-pg-backup_2026-03-07_11-20-04.sql.gz` (PostgreSQL)

**Problema:**
- **SQLite:** campo `uploaded_by` (FOREIGN KEY para users)
- **PostgreSQL:** campo `user_id` (sem FK explícita)

**Impacto:** Entre os dois bancos, o mesmo campo de relacionamento tem nomes diferentes, o que pode quebrar migrações ou syncs entre ambientes.

**Sugestão:** Padronizar o nome do campo (ex.: `uploaded_by` ou `user_id`) em ambos os bancos.

---

## 3. Dados de Teste no Backup JSON

**Localização:** `/data/backups/posts-backup-2026-02-16T01-34-56-945Z.json`

**Problema:** O backup contém registros com dados claramente de teste (títulos como `"TESTE 02"`, `"Teste 10"`, conteúdo repetitivo). Esses dados não deveriam estar em um backup de produção ou definitivo.

**Impacto:** Poluição do dataset; em caso de restore, dados de teste seriam inseridos no ambiente.

**Sugestão:** Limpar dados de teste antes de gerar backups; ou segregar backups de testes em diretório separado.

---

## 4. Backup JSON Redundante

**Localização:** `/data/backups/posts-backup-2026-02-16T01-34-56-945Z.json`

**Problema:** O backup PostgreSQL já cobre todos os dados, incluindo a tabela `posts`. Ter um backup JSON específico de posts cria redundância e duplicidade na estratégia de backup.

**Impacto:** Maior consumo de espaço em disco; confusão sobre qual backup é o oficial.

**Sugestão:** Remover o backup JSON duplicado ou unificar a estratégia de backup em um único formato (SQL ou JSON).

---

## 5. Formato de Data Inconsistente nos Backups

**Localização:** `/data/backups/`

**Problema:**
- Backup PostgreSQL: `2026-03-07_11-20-04` (underscore entre data e hora)
- Backup JSON: `2026-02-16T01-34-56-945Z` (formato ISO 8601 com timezone)

**Impacto:** Dificulta a ordenação cronológica e automação de scripts que manipulam backups.

**Sugestão:** Padronizar o formato de data nos nomes dos arquivos (ISO 8601 ou timestamp Unix).

---

## 6. Sem Backup do Banco SQLite

**Localização:** `/data/` (ausente)

**Problema:** Existe backup do PostgreSQL e backup JSON de posts, mas não há backup do banco SQLite (`caminhar.db`), que é o banco principal utilizado.

**Impacto:** Em caso de corrupção do arquivo SQLite, não há recovery point disponível para restaurar o banco atual.

**Sugestão:** Incluir o `caminhar.db` na rotina de backup (ex.: cópia do arquivo ou dump SQL).

---

## 7. Backup PostgreSQL sem Tabela `musicas`

**Localização:** `/data/backups/caminhar-pg-backup_2026-03-07_11-20-04.sql.gz`

**Problema:** A tabela `musicas` existe no SQLite (com campos: id, titulo, artista, url_imagem, url_spotify, publicado, created_at, updated_at), mas não consta no backup PostgreSQL.

**Impacto:** Perda total dos dados de músicas ao migrar para PostgreSQL.

**Sugestão:** Adicionar a tabela `musicas` ao schema PostgreSQL e incluí-la nos backups.

---

## 8. Arquivo `backup.log` Inacessível

**Localização:** `/data/backups/backup.log`

**Problema:** O arquivo está bloqueado pelo `.clineignore`, indicando que pode conter informações sensíveis. Não é possível auditar seu conteúdo.

**Impacto:** Falta de transparência sobre a rotina de backups (sucessos, falhas, horários).

**Sugestão:** Revisar permissões e conteúdo; se contiver dados sensíveis, considerar log centralizado ou rotação segura de logs.

---

## Resumo das Ações Recomendadas

| # | Categoria | Item | Prioridade |
|---|-----------|------|------------|
| 1 | **Duplicidade** | Inconsistência de schema SQLite vs PostgreSQL | Alta |
| 2 | **Duplicidade** | Nome do campo `uploaded_by` vs `user_id` | Média |
| 3 | **Qualidade** | Dados de teste no backup JSON | Alta |
| 4 | **Performance** | Backup JSON redundante | Baixa |
| 5 | **Padronização** | Formato de data inconsistente | Baixa |
| 6 | **Correção** | Ausência de backup do SQLite | Alta |
| 7 | **Correção** | Tabela `musicas` ausente no PostgreSQL | Alta |
| 8 | **Segurança** | Arquivo `backup.log` inacessível | Média |