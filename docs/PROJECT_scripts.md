# 📁 Scripts do Projeto — Análise Completa

> **Projeto:** Caminhar  
> **Diretório:** `/scripts`  
> **Objetivo deste documento:** Descrever a finalidade, localização e funcionamento de cada script disponível no diretório `scripts/` e seus subdiretórios.

---

## 📂 Estrutura do Diretório `scripts/`

```
scripts/
├── backup.js
├── check-db-status.js
├── check-env.js
├── check-sql-injection.js
├── check-server.js
├── clean-k6-reports.js
├── clean-load-test-posts.js
├── clean-orphaned-images.js
├── clean-test-db.js
├── clear-cache.js
├── clear-db.js
├── clear-musicas.js
├── consolidate-k6-reports.js
├── create-backup.js
├── cron-backup.js
├── db-shell.js
├── generate-load-report.js
├── init-backup.js
├── init-dicas.js
├── init-musicas.js
├── init-posts.js
├── init-server.js
├── init-videos.js
├── monitor-disk-space.js
├── reset-admin-password.js
├── restore-backup.js
├── run-all-load-tests.js
├── run-load-tests.sh
├── seed-all.js
├── seed-musicas.js
├── seed-posts.js
├── seed-products.js
├── seed-videos.js
├── validate-schema.js
├── auth/
│   └── reset-password.js
├── db/
│   ├── verify-db-functions.js
│   └── verify-migration.js
├── diagnostics/
│   ├── check-musicas-schema.js
│   ├── check-videos-schema.js
│   ├── count-posts.js
│   ├── diagnose-hero.js
│   └── list-last-posts.js
├── maintenance/
│   ├── add-thumbnail-to-videos.js
│   ├── backup-posts.js
│   ├── clean-k6-videos.js
│   ├── fix-hero-key.js
│   ├── populate-video-thumbnails.js
│   └── restore-posts.js
├── migrations/
│   ├── 001-add-views-to-posts.js
│   ├── 002-create-products-table.js
│   ├── 003-add-position-to-products.js
│   ├── 004-add-published-to-products.js
│   ├── 005-add-last-login-to-users.js
│   ├── 006-create-activity-logs.js
│   ├── 007-add-position-to-musicas.js
│   ├── 008-add-position-to-videos.js
│   └── 009-add-position-to-posts.js
├── tests/
│   ├── manual-api-test.js
│   └── manual-rate-limit.js
└── utils/
    ├── cleanup-test-data.js
    ├── list-settings.js
    ├── list-table-columns.js
    └── update-setting.js
```

---

## 📄 Raiz (`scripts/`)

### `scripts/backup.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/backup.js`
- **Propósito:** Módulo principal de backup/restore do banco de dados PostgreSQL. Suporta compressão gzip, criptografia AES-256-GCM, verificação de integridade SHA-256, gerenciamento de retenção (mantém os 10 backups mais recentes) e um agendador interno baseado em cron. Oferece funções exportadas para `createBackup()`, `restoreBackup()`, `cleanupOldBackups()`, `getAvailableBackups()`, `getBackupLogs()`, `initializeBackupSystem()` e `startBackupScheduler()`.
- **Segurança:** Utiliza `spawn()` com argumentos em array (sem shell) para executar `pg_dump` e `psql`, eliminando risco de command injection. Compressão/descompressão gzip via streams nativas (`zlib.createGzip`/`zlib.createGunzip`). Hash SHA-256 calculado via stream (`fs.createReadStream`) sem carregar arquivo inteiro na RAM. I/O assíncrono com `fs.promises` em todas as operações de arquivo. Log otimizado com buffer em memória (apenas append ao arquivo, sem re-escrita).
- **Dependências:** `fs`, `path`, `date-fns`, `zlib`, `child_process` (apenas `spawn`), `crypto`

### `scripts/create-backup.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/create-backup.js`
- **Propósito:** Script de entrada para criar um backup manual. Carrega variáveis de ambiente (priorizando `.env.local`), faz import dinâmico do módulo `backup.js` e chama `createBackup()`. Função wrapper simples para encapsular a execução.
- **Dependências:** `fs`, `dotenv`, `backup.js` (local)

### `scripts/restore-backup.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/restore-backup.js`
- **Propósito:** Script de restauração de backup. Aceita um nome de arquivo como argumento, faz validações, cria um backup de segurança antes de restaurar, suporta descriptografia se o backup estiver criptografado e verifica integridade via hash SHA-256.
- **Dependências:** `fs`, `path`, `dotenv`, `backup.js` (local)

### `scripts/init-backup.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/init-backup.js`
- **Propósito:** Script de inicialização do sistema de backup. Carrega variáveis de ambiente e delega para `initializeBackupSystem()` do módulo `backup.js`. Garante que o diretório de backups existe e cria um backup inicial.
- **Dependências:** `dotenv`, `backup.js` (local)

### `scripts/cron-backup.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/cron-backup.js`
- **Propósito:** Shell script Bash para agendamento via cron no Linux. Executa `npm run create-backup` e redireciona a saída para um arquivo de log. Destinado a ser configurado como tarefa cron direta no sistema operacional.
- **Dependências:** Nenhuma (shell script puro)

### `scripts/check-db-status.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/check-db-status.js`
- **Propósito:** Verifica o status da conexão com o banco de dados. Executa `SELECT 1` e conta o número de tabelas no schema `public`. Também exibe informações do PostgreSQL (versão, tempo de atividade, conexões ativas). Uso: diagnóstico rápido de conectividade.
- **Dependências:** `dotenv`, `pg`

### `scripts/check-sql-injection.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/check-sql-injection.js`
- **Propósito:** Script de verificação de segurança que escaneia arquivos .js do projeto em busca de interpolação de variáveis em queries SQL sem prepared statements (vulnerável a SQL injection). Foca em padrões como `pool.query(...)` com 1 argumento contendo interpolação e `query(...${...}...)` sem array de parâmetros. Ignora falsos positivos como comentários de código, identificadores protegidos por `_validateIdentifier()` e whitelists fixas de tabelas/colunas.
- **Dependências:** Nenhuma (usa APIs nativas do Node.js: `fs`, `path`, `url`)
- **Uso:** `node scripts/check-sql-injection.js` (diretórios principais) ou `node scripts/check-sql-injection.js --all` (projeto completo) ou via npm: `npm run security:check-sql`
- **Exit codes:** `0` (sem vulnerabilidades), `1` (vulnerabilidades encontradas)
- **Criado em:** 13/05/2026

### `scripts/check-env.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/check-env.js`
- **Propósito:** Valida a presença de variáveis de ambiente obrigatórias (`DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `NODE_ENV`) e opcionais (`REDIS_URL`, `BACKUP_ENCRYPTION_KEY`, `S3_BACKUP_BUCKET`, `SMTP_*`, `NEXT_PUBLIC_GA_ID`, `RECAPTCHA_*`, `RATE_LIMIT_*`). Exibe warnings para variáveis opcionais ausentes e falha para obrigatórias.
- **Dependências:** `dotenv`

### `scripts/check-server.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/check-server.js`
- **Propósito:** Verifica se o servidor Next.js está rodando localmente. Faz uma requisição HTTP (`fetch`) para `http://localhost:3000` e confirma se a resposta tem status 200. Retorna código de saída 0 se OK, 1 se falhar.
- **Dependências:** Nenhuma (usa `fetch` nativo do Node.js)

### `scripts/clean-k6-reports.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/clean-k6-reports.js`
- **Propósito:** Remove relatórios gerados pelo k6 (testes de carga). Limpa a pasta `reports/k6-summaries/` e também arquivos HTML de relatório em `reports/`. Oferece flag `--dry-run` para simular a limpeza sem deletar.
- **Dependências:** `fs`, `path`

### `scripts/clean-load-test-posts.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/clean-load-test-posts.js`
- **Propósito:** Remove posts de teste criados durante a bateria de testes de carga. Identifica posts com flag de "test" e os exclui do banco junto com o cache Redis correspondente. Utilizado como cleanup nos testes de carga.
- **Dependências:** `dotenv`, `../lib/db.js` (local), `path`, `fs`

### `scripts/clean-orphaned-images.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/clean-orphaned-images.js`
- **Propósito:** Remove imagens órfãs do sistema de arquivos que não estão referenciadas no banco de dados. Varre o diretório `public/uploads/` e exclui arquivos cujo registro não existe na tabela `images`.
- **Dependências:** `dotenv`, `pg`, `fs`, `path`

### `scripts/clean-test-db.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/clean-test-db.js`
- **Propósito:** Limpa dados de teste gerados no banco de dados durante os testes de carga. Remove posts criados por scripts de seed de teste, zera a tabela de músicas e limpa cache. Verbo "limpa e recria" o estado inicial.
- **Dependências:** `dotenv`, `../lib/db.js` (local)

### `scripts/clear-cache.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/clear-cache.js`
- **Propósito:** Limpa o cache da aplicação. Se Redis estiver configurado, executa `flushall` no Redis. Se não, usa um mecanismo de cache em memória local (via um arquivo de marcação de timestamp). Ideal para forçar renovação de dados cacheados.
- **Dependências:** `dotenv`, `../lib/redis.js` (local), `../lib/cache.js` (local)

### `scripts/clear-db.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/clear-db.js`
- **Propósito:** Limpa completamente todas as tabelas do banco de dados usando `TRUNCATE CASCADE` nas tabelas de conteúdo (`posts`, `videos`, `musicas`, `comments`, `images`, `settings`). Mantém a integridade referencial. Requer confirmação do usuário (prompt "Tem certeza?").
- **Dependências:** `dotenv`, `readline` (nativo), `../lib/db.js` (local)

### `scripts/clear-musicas.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/clear-musicas.js`
- **Propósito:** Script específico para limpar a tabela de músicas. Executa `DELETE FROM musicas` sem confirmação do usuário. Simples e direto.
- **Dependências:** `dotenv`, `../lib/db.js` (local)

### `scripts/consolidate-k6-reports.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/consolidate-k6-reports.js`
- **Propósito:** Consolida múltiplos relatórios JSON do k6 em um único relatório unificado. Lê todos os arquivos JSON da pasta `reports/k6-summaries/`, extrai métricas comuns (http_req_duration, http_reqs, http_req_failed, http_req_blocked, http_req_connecting, http_req_tls_handshaking, http_req_sending, http_req_waiting, http_req_receiving) e gera um arquivo consolidado.
- **Dependências:** `fs`, `path`

### `scripts/db-shell.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/db-shell.js`
- **Propósito:** Abre um terminal interativo do PostgreSQL utilizando `psql` com as credenciais da `DATABASE_URL`. Útil para acesso rápido ao banco via CLI.
- **Dependências:** `dotenv`, `child_process`

### `scripts/generate-load-report.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/generate-load-report.js`
- **Propósito:** Orquestrador de testes de carga. Executa uma bateria de 6 testes k6 pré-definidos (fluxo autenticado, criação de posts, carga de vídeos, CRUD de vídeos, CRUD de músicas, carga de músicas) e gera um relatório HTML com métricas de performance (P95, média, requisições, taxa de erro). Suporta cleanup pós-teste.
- **Dependências:** `child_process`, `fs`, `path`, `url`
- **Variáveis de ambiente:** Requer `ADMIN_PASSWORD` e opcionalmente `ADMIN_USERNAME` (default: não definido) para autenticação nos testes de carga. O script valida a presença de `ADMIN_PASSWORD` antes de executar.
- **Uso:** `ADMIN_USERNAME=admin ADMIN_PASSWORD=sua_senha node scripts/generate-load-report.js`

### `scripts/init-dicas.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/init-dicas.js`
- **Propósito:** Script de inicialização da tabela de dicas. Provavelmente cria a tabela `dicas` no banco de dados com sua estrutura inicial.
- **Dependências:** Provável dependência de `lib/db.js`

### `scripts/init-musicas.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/init-musicas.js`
- **Propósito:** Cria a tabela de músicas com schema completo: `id`, `titulo`, `artista`, `url_spotify`, `descricao`, `publicado`, `created_at`, `updated_at`. Faz `DROP TABLE IF EXISTS CASCADE` antes de criar (schema limpo).
- **Dependências:** `fs`, `dotenv`, `../lib/db.js` (local)

### `scripts/init-posts.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/init-posts.js`
- **Propósito:** Cria a tabela de posts com colunas como `id`, `title`, `slug`, `excerpt`, `content`, `image_url`, `published`, `author`, etc. Também faz `DROP TABLE IF EXISTS CASCADE` antes.
- **Dependências:** `fs`, `dotenv`, `../lib/db.js` (local)

### `scripts/init-server.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/init-server.js`
- **Propósito:** Script abrangente de inicialização do servidor. Executa em sequência: validação de ambiente, verificação de conexão com banco, criação de tabelas, verificação de dados existentes, seed se necessário e inicia uma verificação periódica de saúde.
- **Dependências:** `dotenv`, `../lib/db.js` (local), `child_process`

### `scripts/init-videos.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/init-videos.js`
- **Propósito:** Cria a tabela de vídeos com schema: `id`, `titulo`, `url_youtube`, `descricao`, `publicado`, `created_at`, `updated_at`. Também faz `DROP TABLE IF EXISTS CASCADE` antes.
- **Dependências:** `fs`, `dotenv`, `../lib/db.js` (local)

### `scripts/monitor-disk-space.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/monitor-disk-space.js`
- **Propósito:** Monitora o espaço em disco do diretório de backups. Alerta quando o uso ultrapassa thresholds configurados (ex: >80% Warning, >95% Critical). Pode ser usado em conjunto com o cron para alertas proativos.
- **Dependências:** `fs`

### `scripts/reset-admin-password.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/reset-admin-password.js`
- **Propósito:** Reseta a senha do usuário admin no banco de dados. Gera hash bcrypt da nova senha e atualiza no banco. Utilizado para recuperação de acesso.
- **Dependências:** `dotenv`, `bcryptjs`, `../lib/db.js` (local)

### `scripts/seed-all.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/seed-all.js`
- **Propósito:** Orquestrador de seeds. Verifica conectividade com o banco, e executa em ordem os scripts `seed-posts.js`, `seed-musicas.js` e `seed-videos.js`. Suporta flag `--clean` que reseta o banco antes de semear. Faz import dinâmico dos módulos ao invés de subprocesso shell.
- **Dependências:** `fs`, `dotenv`, `path`, `url`, `child_process` (condicional)

### `scripts/seed-musicas.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/seed-musicas.js`
- **Propósito:** Popula a tabela de músicas com dados fictícios de exemplo. Insere registros com títulos, artistas e URLs do Spotify para desenvolvimento/testes.
- **Dependências:** `dotenv`, `../lib/db.js` (local)

### `scripts/seed-posts.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/seed-posts.js`
- **Propósito:** Popula a tabela de posts com dados de exemplo. Cria artigos com slugs, conteúdos, imagens e metadados diversos para ambiente de desenvolvimento.
- **Dependências:** `dotenv`, `../lib/db.js` (local)

### `scripts/seed-products.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/seed-products.js`
- **Propósito:** Popula a tabela de produtos com dados de exemplo. Insere registros de produtos para desenvolvimento e testes da seção de e-commerce/produtos.
- **Dependências:** `dotenv`, `../lib/db.js` (local)

### `scripts/seed-videos.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/seed-videos.js`
- **Propósito:** Popula a tabela de vídeos com dados de exemplo. Insere registros com URLs do YouTube e metadados para ambiente de desenvolvimento.
- **Dependências:** `dotenv`, `../lib/db.js` (local)

### `scripts/validate-schema.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/validate-schema.js`
- **Propósito:** Valida se o schema do banco de dados corresponde ao esperado pelo código. Define um schema esperado para as tabelas (`posts`, `videos`, `musicas`, `users`, `settings`, `images`) com suas colunas, e verifica cada uma no PostgreSQL usando `information_schema`. Gera saída clara com `✅` para OK e `❌` para discrepâncias.
- **Dependências:** `fs`, `dotenv`, `pg`

### `scripts/run-all-load-tests.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/run-all-load-tests.js`
- **Propósito:** Orquestrador que executa todos os testes de carga (k6) sequencialmente. Substitui o script inline `test:load:all` do `package.json` que continha mais de 30 comandos encadeados. Executa cada teste npm via `execSync`, com parada em caso de falha e relatório consolidado ao final.
- **Dependências:** `child_process`

### `scripts/run-load-tests.sh`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/run-load-tests.sh`
- **Propósito:** Shell script que verifica se o servidor está online (via `curl`) e então executa `npm run test:load:all` para iniciar a bateria completa de testes de carga. Fornece feedback visual com emojis.
- **Dependências:** `curl` (requerido externamente), shell script puro

---

## 🔐 Subdiretório `scripts/auth/`

### `scripts/auth/reset-password.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/auth/reset-password.js`
- **Propósito:** Versão alternativa do reset de senha, localizada no subdiretório `auth/`. Permite resetar senha de qualquer usuário (não apenas admin) informando username e nova senha via linha de comando.
- **Dependências:** `dotenv`, `bcryptjs`, `../lib/db.js` (local)

---

## 🗄️ Subdiretório `scripts/db/`

### `scripts/db/verify-db-functions.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/db/verify-db-functions.js`
- **Propósito:** Verifica funções do banco de dados PostgreSQL. Provavelmente checa a existência e funcionamento de stored procedures ou funções customizadas criadas no banco.
- **Dependências:** Provável dependência de `pg` ou `lib/db.js`

### `scripts/db/verify-migration.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/db/verify-migration.js`
- **Propósito:** Verifica se as migrações foram aplicadas corretamente no banco. Provavelmente consulta uma tabela de controle de migrações ou o schema atual para validar consistência.
- **Dependências:** Provável dependência de `pg` ou `lib/db.js`

---

## 🔍 Subdiretório `scripts/diagnostics/`

### `scripts/diagnostics/check-musicas-schema.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/diagnostics/check-musicas-schema.js`
- **Propósito:** Diagnóstico específico para verificar o schema da tabela de músicas. Lista colunas, tipos e constraints. Útil para debug de inconsistências.
- **Dependências:** Provável dependência de `pg`

### `scripts/diagnostics/check-videos-schema.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/diagnostics/check-videos-schema.js`
- **Propósito:** Análogo ao `check-musicas-schema.js`, porém focado na tabela de vídeos. Lista colunas e tipos.
- **Dependências:** Provável dependência de `pg`

### `scripts/diagnostics/count-posts.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/diagnostics/count-posts.js`
- **Propósito:** Conta o número total de posts no banco de dados. Simples utilitário de diagnóstico.
- **Dependências:** Provável dependência de `lib/db.js`

### `scripts/diagnostics/diagnose-hero.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/diagnostics/diagnose-hero.js`
- **Propósito:** Diagnostica problemas relacionados à seção "Hero" (destaque) do site. Provavelmente verifica dados, imagens ou configurações do hero da página inicial.
- **Dependências:** Provável dependência de `lib/db.js`

### `scripts/diagnostics/list-last-posts.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/diagnostics/list-last-posts.js`
- **Propósito:** Lista os últimos posts criados no banco de dados. Útil para verificar rapidamente o conteúdo mais recente sem usar uma interface gráfica.
- **Dependências:** Provável dependência de `lib/db.js`

---

## 🛠️ Subdiretório `scripts/maintenance/`

### `scripts/maintenance/add-thumbnail-to-videos.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/maintenance/add-thumbnail-to-videos.js`
- **Propósito:** Adiciona thumbnails aos registros de vídeos que não possuem. Provavelmente extrai thumbnails da URL do YouTube ou gera imagens placeholder.
- **Dependências:** Provável dependência de `lib/db.js`

### `scripts/maintenance/backup-posts.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/maintenance/backup-posts.js`
- **Propósito:** Cria um backup específico dos posts (apenas a tabela de posts) em formato JSON ou SQL. Diferente do backup geral do banco, este é focado em conteúdo editável.
- **Dependências:** Provável dependência de `lib/db.js` e `fs`

### `scripts/maintenance/clean-k6-videos.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/maintenance/clean-k6-videos.js`
- **Propósito:** Remove vídeos de teste criados durante os testes de carga k6. Similar ao `clean-load-test-posts.js`, mas específico para vídeos.
- **Dependências:** Provável dependência de `lib/db.js`

### `scripts/maintenance/fix-hero-key.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/maintenance/fix-hero-key.js`
- **Propósito:** Corrige problemas de chave/identificador na seção Hero. Provavelmente ajusta registros na tabela `settings` ou similar para garantir que o hero funcione corretamente.
- **Dependências:** Provável dependência de `lib/db.js`

### `scripts/maintenance/populate-video-thumbnails.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/maintenance/populate-video-thumbnails.js`
- **Propósito:** Similar ao `add-thumbnail-to-videos.js`, mas em massa. Popula thumbnails para todos os vídeos que estão com esse campo vazio/nulo.
- **Dependências:** Provável dependência de `lib/db.js`

### `scripts/maintenance/restore-posts.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/maintenance/restore-posts.js`
- **Propósito:** Restaura posts a partir de um arquivo de backup JSON (criado pelo `backup-posts.js`). Específico para conteúdo editorial.
- **Dependências:** Provável dependência de `lib/db.js` e `fs`

---

## 🔄 Subdiretório `scripts/migrations/`

### `scripts/migrations/001-add-views-to-posts.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/migrations/001-add-views-to-posts.js`
- **Propósito:** Migração #001 — Adiciona a coluna `views` à tabela `posts` para contar visualizações de cada post.
- **Dependências:** Provável dependência de `lib/db.js`

### `scripts/migrations/002-create-products-table.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/migrations/002-create-products-table.js`
- **Propósito:** Migração #002 — Cria a tabela de `products` para suportar a funcionalidade de produtos/e-commerce.
- **Dependências:** Provável dependência de `lib/db.js`

### `scripts/migrations/003-add-position-to-products.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/migrations/003-add-position-to-products.js`
- **Propósito:** Migração #003 — Adiciona coluna `position` à tabela `products` para controle de ordenação.
- **Dependências:** Provável dependência de `lib/db.js`

### `scripts/migrations/004-add-published-to-products.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/migrations/004-add-published-to-products.js`
- **Propósito:** Migração #004 — Adiciona coluna `published` (booleano) à tabela `products` para controle de publicação.
- **Dependências:** Provável dependência de `lib/db.js`

### `scripts/migrations/005-add-last-login-to-users.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/migrations/005-add-last-login-to-users.js`
- **Propósito:** Migração #005 — Adiciona coluna `last_login` (timestamp) à tabela `users` para rastrear último acesso.
- **Dependências:** Provável dependência de `lib/db.js`

### `scripts/migrations/006-create-activity-logs.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/migrations/006-create-activity-logs.js`
- **Propósito:** Migração #006 — Cria a tabela `activity_logs` para auditoria de ações administrativas.
- **Dependências:** Provável dependência de `lib/db.js`

### `scripts/migrations/007-add-position-to-musicas.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/migrations/007-add-position-to-musicas.js`
- **Propósito:** Migração #007 — Adiciona coluna `position` à tabela `musicas` para ordenação manual.
- **Dependências:** Provável dependência de `lib/db.js`

### `scripts/migrations/008-add-position-to-videos.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/migrations/008-add-position-to-videos.js`
- **Propósito:** Migração #008 — Adiciona coluna `position` à tabela `videos` para ordenação manual.
- **Dependências:** Provável dependência de `lib/db.js`

### `scripts/migrations/009-add-position-to-posts.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/migrations/009-add-position-to-posts.js`
- **Propósito:** Migração #009 — Adiciona coluna `position` à tabela `posts` para ordenação manual.
- **Dependências:** Provável dependência de `lib/db.js`

---

## 🧪 Subdiretório `scripts/tests/`

### `scripts/tests/manual-api-test.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/tests/manual-api-test.js`
- **Propósito:** Script de teste manual de API. Provavelmente faz requisições HTTP para endpoints da aplicação e valida respostas. Usado para debug rápido sem levantar o servidor de testes automatizados.
- **Dependências:** Provável dependência de `fetch` nativo ou biblioteca HTTP

### `scripts/tests/manual-rate-limit.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/tests/manual-rate-limit.js`
- **Propósito:** Testa manualmente o rate limiting da aplicação. Faz múltiplas requisições em sequência para verificar se o bloqueio por excesso de requisições está funcionando corretamente.
- **Dependências:** Provável dependência de `fetch` nativo

---

## 🧰 Subdiretório `scripts/utils/`

### `scripts/utils/cleanup-test-data.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/utils/cleanup-test-data.js`
- **Propósito:** Utilitário genérico de limpeza de dados de teste. Remove registros de teste de múltiplas tabelas simultaneamente.
- **Dependências:** Provável dependência de `lib/db.js`

### `scripts/utils/list-settings.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/utils/list-settings.js`
- **Propósito:** Utilitário de administração. Lista todas as configurações armazenadas na tabela `settings` do banco de dados. Útil para inspecionar configuração atual da aplicação.
- **Dependências:** Provável dependência de `lib/db.js`

### `scripts/utils/list-table-columns.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/utils/list-table-columns.js`
- **Propósito:** Utilitário de diagnóstico. Lista todas as colunas de uma tabela específica no banco, com seus tipos e constraints. Aceita nome da tabela como argumento.
- **Dependências:** `pg`

### `scripts/utils/update-setting.js`
- **Localização:** `/home/qa/Projeto/Caminhar/scripts/utils/update-setting.js`
- **Propósito:** Utilitário de administração. Atualiza ou insere uma configuração na tabela `settings`. Aceita chave, valor, tipo e descrição como argumentos de linha de comando.
- **Segurança:** Validação completa de entrada implementada: chave validada com regex `^[a-z][a-z0-9_]*$`, tipo restrito a conjunto fixo (`string`, `number`, `boolean`, `json`), valor convertido e sanitizado conforme o tipo via função `validateAndConvertValue()`. Erros de validação exibem mensagem clara e abortam com `process.exit(1)`. Erros de banco são tratados separadamente no `catch`.
- **Uso:** `node scripts/utils/update-setting.js <chave> <valor> [tipo] [descricao]`
- **Dependências:** `pg`, `dotenv`

---

## 📊 Resumo por Categoria

| Categoria | Quantidade | Descrição |
|-----------|:----------:|-----------|
| **Backup** | 5 | `backup.js`, `create-backup.js`, `restore-backup.js`, `init-backup.js`, `cron-backup.js` |
| **Inicialização** | 5 | `init-dicas.js`, `init-musicas.js`, `init-posts.js`, `init-server.js`, `init-videos.js` |
| **Seed (Dados)** | 5 | `seed-all.js`, `seed-musicas.js`, `seed-posts.js`, `seed-products.js`, `seed-videos.js` |
| **Limpeza** | 6 | `clean-*`, `clear-*` |
| **Validação/Diagnóstico** | 3 | `check-db-status.js`, `check-env.js`, `validate-schema.js` + 5 em `diagnostics/` |
| **Migrações** | 9 | `001` a `009` em `migrations/` |
| **Testes de Carga** | 4 | `run-all-load-tests.js`, `generate-load-report.js`, `run-load-tests.sh`, `consolidate-k6-reports.js` |
| **Monitoramento** | 1 | `monitor-disk-space.js` |
| **Utilidades** | 4 | `db-shell.js`, `check-server.js`, `reset-admin-password.js` + 4 em `utils/` |
| **Manutenção** | 6 | `maintenance/` |
| **Autenticação** | 1 | `auth/reset-password.js` |
| **Testes Manuais** | 2 | `tests/` |
| **Banco de Dados** | 2 | `db/` |

---

> 📝 **Nota:** Este documento é puramente descritivo. Para sugestões de melhorias, correções e análise de duplicidades, consulte o documento complementar [`UPGRADE_scripts.md`](UPGRADE_scripts.md).