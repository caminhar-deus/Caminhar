# 📁 Scripts do Projeto — Análise de Melhorias, Correções e Duplicidades

> **Data:** 20/05/2026 (atualizado)
> **Projeto:** Caminhar  
> **Diretório:** `/scripts`  
> **Objetivo deste documento:** Reportar problemas identificados, sugestões de melhoria, oportunidades de performance, código duplicado e más práticas encontradas nos scripts. Correções aplicadas estão marcadas com ✅.

---

## Índice

1. [Problemas Críticos de Segurança](#1-problemas-críticos-de-segurança)
2. [Duplicidade de Código](#2-duplicidade-de-código)
3. [Problemas de Performance](#3-problemas-de-performance)
4. [Tratamento de Erros Inconsistente](#4-tratamento-de-erros-inconsistente)
5. [Padrões de Código e Boas Práticas](#5-padrões-de-código-e-boas-práticas)
6. [Scripts Órfãos ou Subutilizados](#6-scripts-órfãos-ou-subutilizados)
7. [Problemas de Manutenibilidade](#7-problemas-de-manutenibilidade)
8. [Sugestões de Arquitetura](#8-sugestões-de-arquitetura)

---

## 1. Problemas Críticos de Segurança

### 1.1. Senha admin hardcoded em `scripts/generate-load-report.js` ✅ Corrigido
- **Arquivo:** `scripts/generate-load-report.js`
- **Problema:** A senha do administrador (`123456`) estava hardcoded em 6 definições de teste dentro do array `TESTS`.
- **Risco:** Vazamento de credenciais de produção caso o repositório fosse público ou acessado por pessoas não autorizadas.
- **Correção aplicada (20/05/2026):**
  - Substituídas as 6 ocorrências de `ADMIN_PASSWORD: '123456'` por `ADMIN_PASSWORD: process.env.ADMIN_PASSWORD`.
  - Substituídas as 6 ocorrências de `ADMIN_USERNAME: 'admin'` por `ADMIN_USERNAME: process.env.ADMIN_USERNAME`.
  - Adicionada validação no início da execução que impede o script de rodar sem a variável `ADMIN_PASSWORD` configurada.
  - **Uso correto agora:** `ADMIN_USERNAME=admin ADMIN_PASSWORD=sua_senha node scripts/generate-load-report.js`

### 1.2. Comando shell com concatenação de string em `scripts/backup.js` ✅ Corrigido
- **Arquivo:** `scripts/backup.js`
- **Problema:** Três ocorrências de `exec()` com concatenação de string em comandos shell (`pg_dump`, `psql`) — linhas 59, 214 e 276 (versão original). A variável `DATABASE_URL` era interpolada diretamente, possibilitando command injection indireto.
- **Risco:** Se a `DATABASE_URL` fosse comprometida, um atacante poderia injetar comandos arbitrários via shell.
- **Correção aplicada (20/05/2026):**
  - Substituído `exec()` por `spawn()` em todas as 3 ocorrências, eliminando a passagem pela shell.
  - Criada função `runPgDumpToFile()` que usa `spawn('pg_dump', ['-d', dbUrl])` com pipe para `zlib.createGzip()` stream.
  - Criada função `runPsqlFromFile()` que usa `spawn('psql', ['-d', dbUrl])` com pipe do `zlib.createGunzip()` stream.
  - A compressão/descompressão gzip agora é feita via streams nativas (`zlib.createGzip`/`zlib.createGunzip`) em vez de pipes shell.

### 1.3. Ausência de validação de entrada em `scripts/utils/update-setting.js` ✅ Corrigido
- **Arquivo:** `scripts/utils/update-setting.js`
- **Problema:** Aceitava chave/valor como argumento de linha de comando sem validação de tipos ou sanitização. Poderia corromper a tabela `settings`.
- **Correção aplicada (20/05/2026):**
  - Adicionada validação de chave (`key`) com regex `^[a-z][a-z0-9_]*$` — rejeita chaves vazias, com espaços ou caracteres especiais.
  - Adicionada função `validateAndConvertValue()` que converte e valida o valor conforme o tipo: `string` (não vazia), `number` (isNaN check), `boolean` (true/false/1/0), `json` (JSON.parse).
  - Adicionada constante `ALLOWED_TYPES` com conjunto fixo de tipos permitidos (`string`, `number`, `boolean`, `json`), rejeitando tipos desconhecidos.
  - Corrigido path na mensagem de ajuda: de `lib/update-setting.js` para `scripts/utils/update-setting.js`.
  - Melhorado tratamento de erro: erros de validação exibem mensagem clara e saem com `process.exit(1)`; erros de sistema (banco) são tratados separadamente no `catch`.
  - Valor convertido é serializado adequadamente (JSON.stringify para objetos, String para primitivos) antes de ser armazenado no banco.

---

## 2. Duplicidade de Código

### 2.1. Dois scripts de reset de senha
- **Arquivos:**
  - `scripts/reset-admin-password.js` — específico para usuário admin
  - `scripts/auth/reset-password.js` — genérico, aceita qualquer username
- **Problema:** Funcionalidade essencialmente a mesma, com implementações duplicadas. O primeiro é mais restrito, o segundo mais flexível.
- **Sugestão:** Unificar em um único script que aceite username como parâmetro opcional (default: 'admin').

### 2.2. Múltiplos scripts de limpeza com lógica similar
- **Arquivos:**
  - `scripts/clean-load-test-posts.js`
  - `scripts/clean-test-db.js`
  - `scripts/maintenance/clean-k6-videos.js`
  - `scripts/utils/cleanup-test-data.js`
- **Problema:** Todos fazem essencialmente a mesma coisa — remover dados de teste do banco — mas cada um tem sua própria implementação de conexão, query e lógica.
- **Sugestão:** Criar um módulo compartilhado de limpeza (`scripts/utils/cleanup.js`) com funções reutilizáveis, e fazer os scripts específicos delegarem para este módulo.

### 2.3. Dois scripts para popular thumbnails de vídeos
- **Arquivos:**
  - `scripts/maintenance/add-thumbnail-to-videos.js`
  - `scripts/maintenance/populate-video-thumbnails.js`
- **Problema:** Mesmo propósito (adicionar thumbnails a vídeos que não possuem), provavelmente com implementações muito similares. Diferença de nomenclatura não deixa claro qual é a diferença real.
- **Sugestão:** Unificar em um único script com flags (ex: `--force` para sobrescrever existentes, `--batch-size` para controle de lote).

### 2.4. Quatro scripts de init com estrutura idêntica
- **Arquivos:**
  - `scripts/init-musicas.js`
  - `scripts/init-posts.js`
  - `scripts/init-videos.js`
  - `scripts/init-dicas.js`
- **Problema:** Todos seguem o mesmo padrão: carregar dotenv, importar `lib/db.js`, fazer `DROP TABLE IF EXISTS CASCADE`, criar tabela com CREATE TABLE. Código quase idêntico, mudando apenas o nome da tabela e colunas.
- **Sugestão:** Criar um único script parametrizável (`scripts/init-table.js`) que aceite o nome da tabela como argumento, e manter arquivos de schema separados (JSON/YAML) para cada tabela.

### 2.5. Nove scripts de migração com estrutura repetitiva
- **Arquivos:** `scripts/migrations/001-*.js` a `009-*.js`
- **Problema:** Cada migração é um arquivo independente que importa `lib/db.js`, define uma função `up()` e executa SQL. Não há um sistema de versionamento ou rastreamento de quais migrações já foram aplicadas.
- **Sugestão:** Implementar um sistema simples de migrações com tabela de controle (`_migrations`) e um executor central que aplique apenas migrações pendentes.

### 2.6. Caminho `.env.local` e `dotenv.config()` repetido em ~20 arquivos
- **Problema:** Praticamente todos os scripts começam com o mesmo bloco de 4 linhas para carregar variáveis de ambiente. Isso é código duplicado que viola DRY.
- **Sugestão:** Extrair para um módulo compartilhado (`scripts/utils/load-env.js`) e importar esse módulo em todos os scripts.

### 2.7. Lógica de filtro de arquivos duplicada em `backup.js` ✅ Corrigido
- **Arquivo:** `scripts/backup.js`
- **Problema:** As funções `cleanupOldBackups()` e `getAvailableBackups()` possuíam a mesma lógica de filtro de arquivos (`filter`, `map`, `sort`) praticamente idêntica.
- **Correção aplicada (20/05/2026):**
  - Extraída a lógica para uma função utilitária `getBackupFiles()` que centraliza filtro, remoção de duplicatas (`.enc`) e ordenação por timestamp.
  - Ambas as funções (`cleanupOldBackups()` e `getAvailableBackups()`) agora delegam para `getBackupFiles()`.

---

## 3. Problemas de Performance

### 3.1. Escrita do log sobrescreve o arquivo inteiro ✅ Corrigido
- **Arquivo:** `scripts/backup.js`
- **Problema:** A função `logBackupOperation()` primeiro fazia append (`appendFileSync`), depois lia o arquivo inteiro (`readFileSync`), mantinha só as últimas 100 linhas, e reescrevia o arquivo completo (`writeFileSync`). Para cada operação de log, o arquivo inteiro era lido e escrito.
- **Impacto:** Ineficiente para muitos backups. Risco de perda de dados se o processo falhasse entre o append e o rewrite.
- **Correção aplicada (20/05/2026):**
  - Removida a leitura+reescrita do arquivo a cada operação de log.
  - Implementado buffer em memória (`logBuffer`) que mantém as últimas 100 entradas.
  - O log agora faz apenas `appendFileSync` (agora `fs.promises.appendFile`) puro no arquivo.
  - Função `getBackupLogs()` lê o arquivo completo para retornar dados históricos.

### 3.2. Uso excessivo de I/O síncrono ✅ Corrigido
- **Arquivo:** `scripts/backup.js`
- **Problema:** Múltiplas chamadas a `fs.existsSync()`, `fs.readFileSync()`, `fs.writeFileSync()`, `fs.unlinkSync()`, `fs.readdirSync()`, `fs.statSync()`, `fs.mkdirSync()` — praticamente todas as operações de arquivo eram síncronas.
- **Impacto:** Bloqueava o event loop do Node.js durante operações de I/O.
- **Correção aplicada (20/05/2026):**
  - Migradas todas as operações de I/O para `fs.promises` (assíncronas com `async/await`).
  - Exceto `fs.readdirSync()` em `getBackupFiles()` que permanece síncrono por ser uma função utilitária chamada internamente, sem `await` no escopo de chamada.

### 3.3. Leitura completa do arquivo para calcular hash ✅ Corrigido
- **Arquivo:** `scripts/backup.js`
- **Problema:** `fs.readFileSync(backupPath)` carregava o arquivo de backup inteiro na memória para calcular o hash SHA-256. Backups de bancos grandes podiam consumir muita RAM.
- **Correção aplicada (20/05/2026):**
  - Criada função `calculateFileHash()` que usa `crypto.createHash()` com `fs.createReadStream()` para processar o hash em chunks, sem carregar o arquivo inteiro na RAM.

### 3.4. Carregamento de todo o diretório de backups para listar
- **Arquivo:** `scripts/backup.js` (funções `cleanupOldBackups` e `getAvailableBackups`)
- **Problema:** `fs.readdirSync(BACKUP_DIR)` lê todo o diretório, mesmo quando só precisa dos primeiros N arquivos.
- **Sugestão:** Para diretórios com muitos arquivos, considerar limitar a leitura.

---

## 4. Tratamento de Erros Inconsistente

### 4.1. Mistura de `process.exit(1)` com `throw`
- **Problema:** Alguns scripts usam `process.exit(1)` para indicar falha (ex: `init-musicas.js` linha 35, `validate-schema.js` linha 83), outros lançam exceções com `throw`, outros apenas logam o erro. Não há um padrão consistente.
- **Sugestão:** Definir um padrão: scripts de linha de comando devem fazer `process.exit(1)` em caso de erro; funções exportadas devem lançar exceções para quem as chamou.

### 4.2. `clear-musicas.js` não pede confirmação
- **Arquivo:** `scripts/clear-musicas.js`
- **Problema:** Ao contrário de `clear-db.js` que pede confirmação do usuário antes de limpar, `clear-musicas.js` executa `DELETE FROM musicas` sem nenhuma confirmação.
- **Risco:** Perda acidental de dados.
- **Sugestão:** Adicionar prompt de confirmação ou flag `--force` para execução silenciosa.

### 4.3. Erro no `cleanupOldBackups` com `.enc` e `.sha256` ✅ Corrigido
- **Arquivo:** `scripts/backup.js`
- **Problema:** O código tentava deletar arquivos `.enc` e `.sha256` baseado no nome base, mas a lógica de matching entre backup e seus arquivos auxiliares podia quebrar se o nome base não correspondesse exatamente.
- **Correção aplicada (20/05/2026):**
  - Revisada a lógica de deleção para usar `try/catch` em cada arquivo individualmente (`access` + `unlink`), garantindo que a falha ao remover um arquivo auxiliar não interrompa a remoção dos demais.
  - A função `getBackupFiles()` agora centraliza o mapeamento entre nomes base e arquivos `.enc`, garantindo consistência na correspondência.

---

## 5. Padrões de Código e Boas Práticas

### 5.1. Ausência de `shebang` nos scripts
- **Problema:** Nenhum dos scripts `.js` possui shebang (`#!/usr/bin/env node`). Embora sejam executados via `node script.js`, isso impede execução direta como `./script.js`.
- **Sugestão:** Adicionar shebang nos scripts que podem ser executados diretamente.

### 5.2. Constantes mágicas espalhadas
- **Problema:** Valores como `10` (limite de backups), `3000` (porta), `100` (limite de linhas do log) aparecem como números literais sem nome explicativo.
- **Sugestão:** Extrair para constantes nomeadas no topo dos arquivos ou em um arquivo de configuração compartilhado.

### 5.3. Nomenclatura inconsistente de funções
- **Problema:** Mistura de português e inglês nos nomes:
  - `ensureBackupDirectory`, `generateBackupFilename` (inglês)
  - `logBackupOperation`, `cleanupOldBackups` (inglês)
  - Comentários em português misturados com código em inglês.
- **Sugestão:** Padronizar em um idioma (recomendado: inglês para código, português para comentários de contexto local).

### 5.4. Ausência de testes automatizados para scripts
- **Problema:** Os scripts em `scripts/` não possuem testes unitários. Scripts críticos como backup, migrações e seeds não têm garantia de funcionamento correto.
- **Sugestão:** Adicionar testes para scripts de infraestrutura crítica (backup, restore, migrações).

### 5.5. Comentários em português misturados com inglês
- **Problema:** Código mistura comentários em português (ex: `// Carrega variáveis de ambiente`) com comentários em inglês (`// Ensure backup directory exists`). Não há padronização.
- **Sugestão:** Adotar inglês para todo o código, ou português consistente se for a preferência do time.

### 5.6. Import dinâmico para crypto ✅ Corrigido
- **Arquivo:** `scripts/backup.js`
- **Problema:** `const crypto = await import('crypto')` — `crypto` é um módulo nativo do Node.js e poderia ser importado estaticamente no topo do arquivo. O import dinâmico aqui era desnecessário e adicionava complexidade.
- **Correção aplicada (20/05/2026):**
  - Movido `import crypto from 'crypto'` para o topo do arquivo, junto com os demais imports estáticos.
  - Removidas as 2 ocorrências de `await import('crypto')`.

---

## 6. Scripts Órfãos ou Subutilizados

### 6.1. Função `restoreBackup` em `backup.js` sem script de entrada
- **Arquivo:** `scripts/backup.js` (função exportada)
- **Problema:** Existe `create-backup.js` como entry point para `createBackup()`, e `restore-backup.js` para `restoreBackup()`. Porém `restore-backup.js` não foi analisado em detalhe, mas se existirem outras funções exportadas sem entry point, elas podem ser subutilizadas.
- **Sugestão:** Verificar se todas as funções exportadas têm entry points correspondentes ou são usadas em outros lugares.

### 6.2. `scripts/monitor-disk-space.js` sem integração
- **Problema:** Script de monitoramento de disco que parece não estar integrado a nenhum sistema de alerta ou agendamento. Se não está no cron, não está sendo executado.
- **Sugestão:** Documentar como configurar no cron, ou integrar com o sistema de backup scheduler.

### 6.3. `scripts/consolidate-k6-reports.js` — relatório não utilizado
- **Problema:** O `generate-load-report.js` gera relatório HTML individual. O `consolidate-k6-reports.js` gera um JSON consolidado de múltiplos reports, mas não está claro se este JSON é consumido por algum processo.
- **Sugestão:** Verificar se o consolidado é usado; se não, considerar remover ou integrar no pipeline de relatório.

---

## 7. Problemas de Manutenibilidade

### 7.1. Agendador de backup com cron implementado manualmente
- **Arquivo:** `scripts/backup.js` (função `startBackupScheduler`)
- **Problema:** O scheduler implementa parsing de cron manual que só trata minutos e horas. Não suporta expressões complexas (ex: `*/15`, dias da semana, meses). Além disso, o `setTimeout` + `setInterval` acumula drift ao longo do tempo (o delay não compensa o tempo de execução).
- **Sugestão:** Usar uma biblioteca como `node-cron` ou `bull` para agendamento confiável, ou manter apenas o script e delegar o agendamento para o cron do sistema operacional (que já tem o `cron-backup.js` para isso).

### 7.2. Nove migrações sem sistema de versionamento
- **Arquivo:** `scripts/migrations/001-*.js` a `009-*.js`
- **Problema:** Não há uma tabela de controle no banco que registre quais migrações foram aplicadas. Não há um executor central que aplique migrações pendentes automaticamente. O desenvolvedor precisa saber quais migrações já rodou.
- **Sugestão:** Implementar um framework de migrações simples com:
  - Tabela `_migrations` no banco
  - Script `scripts/migrate.js` que executa migrações pendentes
  - Cada migração com timestamp ou número sequencial

### 7.3. Dependência de `date-fns` apenas para formatação de data
- **Arquivo:** `scripts/backup.js`
- **Problema:** A única função usada de `date-fns` é `format()`, que poderia ser facilmente substituída por `Intl.DateTimeFormat` nativo ou uma função simples de formatação.
- **Sugestão:** Avaliar se vale a pena manter a dependência ou substituir por código nativo.

---

## 8. Sugestões de Arquitetura

### 8.1. Criar módulo `scripts/utils/load-env.js`
Extrair a lógica repetida de carregamento de ambiente para um módulo compartilhado:
```javascript
// scripts/utils/load-env.js
import fs from 'fs';
import dotenv from 'dotenv';

export function loadEnv() {
  if (fs.existsSync('.env.local')) {
    dotenv.config({ path: '.env.local' });
  }
  dotenv.config();
}
```

### 8.2. Criar módulo `scripts/db/connection.js`
Centralizar a criação de conexão com o banco usando `pg.Pool` em vez de cada script importar `lib/db.js` ou criar seu próprio pool:
```javascript
// scripts/db/connection.js
import pg from 'pg';
const { Pool } = pg;

let pool = null;
export function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}
```

### 8.3. Unificar scripts de init em um executor parametrizável
Criar um único `scripts/init-table.js` que recebe o nome da tabela como argumento e carrega o schema de um arquivo JSON:
```bash
node scripts/init-table.js --table=musicas --schema=schemas/musicas.json
```

### 8.4. Implementar gerenciador de migrações
Criar um sistema simples de migrações:
- Script `scripts/migrate.js` como executor central
- Tabela `_migrations` no banco para rastrear estado
- Cada migração exporta `up()` e `down()`

### 8.5. Padronizar tratamento de erros
Definir e documentar um padrão:
- Scripts de CLI: `console.error()` + `process.exit(1)`
- Funções exportadas: `throw new Error()`
- Sempre incluir mensagens descritivas em português (já que o público é BR)

---

## 📊 Matriz de Prioridade

| # | Problema | Gravidade | Esforço Est. | Prioridade | Status |
|---|----------|:---------:|:------------:|:----------:|:------:|
| 1.1 | Senha hardcoded | 🔴 Alta | Baixo | **Crítico** | ✅ Corrigido |
| 1.2 | Command injection potencial | 🔴 Alta | Médio | **Crítico** | ✅ Corrigido |
| 1.3 | Ausência de validação de entrada em update-setting.js | 🔴 Alta | Médio | **Crítico** | ✅ Corrigido |
| 3.1 | Log sobrescreve arquivo | 🟡 Média | Baixo | Alta | ✅ Corrigido |
| 3.3 | Hash carrega arquivo inteiro na RAM | 🟡 Média | Baixo | Alta | ✅ Corrigido |
| 5.6 | Import dinâmico crypto | 🟢 Baixa | Muito Baixo | Alta | ✅ Corrigido |
| 2.7 | Lógica de filtro duplicada | 🟢 Baixa | Baixo | Alta | ✅ Corrigido |
| 3.2 | I/O síncrono | 🟢 Baixa | Baixo | Média | ✅ Corrigido |
| 4.3 | Deleção de arquivos auxiliares inconsistente | 🟡 Média | Baixo | Média | ✅ Corrigido |
| 2.2 | Múltiplos scripts de limpeza | 🟡 Média | Médio | Alta | Pendente |
| 8.4 | Migrações sem versionamento | 🟡 Média | Alto | Alta | Pendente |
| 2.6 | Carga de ambiente duplicada | 🟢 Baixa | Baixo | Média | Pendente |
| 2.4 | Init scripts duplicados | 🟢 Baixa | Médio | Média | Pendente |
| 4.2 | clear-musicas sem confirmação | 🟡 Média | Baixo | Média | Pendente |
| 7.1 | Scheduler caseiro | 🟢 Baixa | Médio | Baixa | Pendente |
| 5.1 | Shebang ausente | 🟢 Baixa | Muito Baixo | Baixa | Pendente |

---

> 📝 **Nota:** Este documento é analítico. Correções aplicadas estão marcadas com ✅. As demais sugestões servem como guia para futuras refatorações e melhorias.