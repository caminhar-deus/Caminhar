# Documentação da Pasta `/data`

## 1. Nome do documento

**Documentação técnica da pasta `/data` e subdiretórios** — Projeto Caminhar

## 2. Descrição geral

Este documento apresenta a análise completa e individual de todos os arquivos existentes na pasta `/data` do projeto Caminhar, incluindo finalidade, relações entre arquivos, problemas identificados, melhorias recomendadas, duplicidades e possíveis códigos mortos.

**Objetivo:** Documentar fielmente o conteúdo e a estrutura da pasta `/data`, servindo como referência para manutenção, auditoria e evolução do sistema de backups.

**Escopo:** Análise estática dos 5 arquivos presentes em `/data/backups/`, incluindo logs, backups PostgreSQL criptografados e seus respectivos hashes SHA-256.

## 3. Estrutura de arquivos e pastas

```
/data/
└── backups/
    ├── backup.log
    ├── caminhar-pg-backup_2026-05-21T19-56-57Z.sql.gz.enc
    ├── caminhar-pg-backup_2026-05-21T19-56-57Z.sql.gz.sha256
    ├── caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.enc
    └── caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.sha256
```

**Caminhos relevantes:**
- Pasta raiz: `/data/`
- Subdiretório: `/data/backups/`
- Scripts relacionados: `/scripts/backup.js` (módulo central de backup)
- API relacionada: `/pages/api/admin/backups.js` (endpoint de listagem de backups)
- Log de sistema: `/data/backups/backup.log`

**Relação entre os arquivos:**
- Cada backup PostgreSQL (`.enc`) possui um arquivo de hash (`.sha256`) correspondente
- O arquivo `.enc` é gerado a partir do `.sql.gz` original, que é removido após criptografia bem-sucedida
- O `.sha256` armazena o hash do arquivo **original** (`.sql.gz`), não do arquivo criptografado (`.enc`)
- O `backup.log` registra operações de backup e restore executadas pelo módulo central

## 4. Análise individual de cada arquivo

---

### Arquivo 1: `backup.log`

**Caminho completo:** `/data/backups/backup.log`

**Arquivos acionados ou relacionados:**
- `/scripts/backup.js` — módulo que escreve neste log durante operações de backup/restore
- Diretamente relacionado a todos os demais arquivos do diretório (registra operações sobre eles)

**Resumo do arquivo:**
Arquivo de log que registra operações de backup e restore executadas pelo módulo central (`scripts/backup.js`). Formato: `[TIMESTAMP] [TIPO] Mensagem`.

**Conteúdo atual (2 entradas):**
- `[2026-09-04 18:44:05] [RESTORE_ERROR] Falha ao criar o backup de segurança. Restauração abortada.`
- `[2026-09-04 18:45:07] [RESTORE_ERROR] Falha ao criar o backup de segurança. Restauração abortada.`

**Observações:**
- Ambas as entradas são erros de restore ocorridos no mesmo dia, com 1 minuto de intervalo
- Não há nenhum registro de backup bem-sucedido no log
- O arquivo é pequeno (202 bytes), indicando que foi limpo recentemente ou o sistema está em uso há pouco tempo
- As entradas de erro sugerem que o backup de segurança (criado automaticamente antes de um restore) falhou, causando aborto da restauração

---

### Arquivo 2: `caminhar-pg-backup_2026-05-21T19-56-57Z.sql.gz.enc`

**Caminho completo:** `/data/backups/caminhar-pg-backup_2026-05-21T19-56-57Z.sql.gz.enc`

**Arquivos acionados ou relacionados:**
- `/data/backups/caminhar-pg-backup_2026-05-21T19-56-57Z.sql.gz.sha256` — hash SHA-256 correspondente
- `/scripts/backup.js` — script que gera e criptografa este arquivo
- `/scripts/restore.js` (se existir) — script que descriptografa e restaura este backup
- `/pages/api/admin/backups.js` — API que lista este arquivo como backup disponível
- `.env` / `.env.local` — contém `BACKUP_ENCRYPTION_KEY` necessário para descriptografia

**Resumo do arquivo:**
Backup PostgreSQL criptografado com AES-256-GCM, gerado em 21 de maio de 2026 às 19:56:57 UTC. Contém dump completo do banco de dados na data de geração. Formato: arquivo binário criptografado.

**Detalhes técnicos:**
- **Tamanho:** 4.3 MB (4.472.125 bytes)
- **Data de criação:** 25 de agosto de 2026 (data do arquivo no filesystem, diferente do timestamp no nome que indica 21 de maio de 2026)
- **Criptografia:** AES-256-GCM (conforme implementação em `scripts/backup.js`)
- **Estrutura do arquivo criptografado:** IV (12 bytes) + dados criptografados + Auth Tag (16 bytes)

**⚠️ Ponto de atenção — Divergência de datas:**
O nome do arquivo indica `2026-05-21T19-56-57Z`, mas a data de modificação no filesystem é 25 de agosto de 2026. Possíveis explicações:
- O backup foi gerado em 21 de maio e o arquivo foi recriado/recriptografado em 25 de agosto
- O nome reflete a data do dump original, mas o arquivo foi copiado/movido posteriormente
- O arquivo foi regenerado em 25 de agosto a partir de outra fonte

---

### Arquivo 3: `caminhar-pg-backup_2026-05-21T19-56-57Z.sql.gz.sha256`

**Caminho completo:** `/data/backups/caminhar-pg-backup_2026-05-21T19-56-57Z.sql.gz.sha256`

**Arquivos acionados ou relacionados:**
- `/data/backups/caminhar-pg-backup_2026-05-21T19-56-57Z.sql.gz.enc` — arquivo ao qual este hash se refere
- `/scripts/backup.js` — calcula e escreve este hash durante o processo de backup

**Resumo do arquivo:**
Armazena o hash SHA-256 do arquivo original (`.sql.gz` antes da criptografia) para verificação de integridade.

**Conteúdo:** `c022450d55c1f800656a668575f48a747342d49b6612042352c9ae3440479c58`

**⚠️ Ponto de atenção — Verificação de integridade:**
- O hash armazenedo (`c02245...`) **NÃO** corresponde ao hash do arquivo `.enc` atual (`a66666...`)
- Isso é **esperado**: o hash refere-se ao conteúdo **original** (`.sql.gz`) antes da criptografia
- Para verificar a integridade do backup atual, seria necessário:
  1. Descriptografar o `.enc` usando `BACKUP_ENCRYPTION_KEY`
  2. Calcular o hash do resultado
  3. Comparar com o hash armazenado no `.sha256`
- O formato do arquivo contém apenas o hash puro (sem nome de arquivo), o que impede o uso direto de `sha256sum -c`

---

### Arquivo 4: `caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.enc`

**Caminho completo:** `/data/backups/caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.enc`

**Arquivos acionados ou relacionados:**
- `/data/backups/caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.sha256` — hash SHA-256 correspondente
- `/scripts/backup.js` — script que gera e criptografa este arquivo
- `/scripts/restore.js` (se existir) — script que descriptografa e restaura este backup
- `/pages/api/admin/backups.js` — API que lista este arquivo como backup disponível

**Resumo do arquivo:**
Backup PostgreSQL criptografado com AES-256-GCM, gerado em 22 de maio de 2026 às 10:18:54 UTC. É o backup mais recente entre os dois disponíveis.

**Detalhes técnicos:**
- **Tamanho:** 4.3 MB (4.472.128 bytes — 3 bytes maior que o backup anterior)
- **Data de criação:** 25 de agosto de 2026 (data do filesystem)
- **Criptografia:** AES-256-GCM

**Comparativo com backup anterior:**
- Diferença de tamanho: +3 bytes (crescimento mínimo entre 21 e 22 de maio)
- Diferença de timestamp: ~14 horas entre os dois backups

---

### Arquivo 5: `caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.sha256`

**Caminho completo:** `/data/backups/caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.sha256`

**Arquivos acionados ou relacionados:**
- `/data/backups/caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.enc` — arquivo ao qual este hash se refere
- `/scripts/backup.js` — calcula e escreve este hash durante o processo de backup

**Resumo do arquivo:**
Armazena o hash SHA-256 do backup PostgreSQL mais recente, referente ao arquivo `.sql.gz` antes da criptografia.

**Conteúdo:** `2399e61f5b5b6f28f40dddb8979d47564824144e7781450200538ab57197ea40`

**Observações:**
- Mesmo formato do hash anterior (hash puro, sem nome de arquivo)
- Mesma limitação: requer descriptografia prévia do `.enc` para verificação

## 5. Ajustes e correções

### 5.1. Log contém apenas erros — ausência de registros de sucesso

**O que foi encontrado:** O `backup.log` possui apenas 2 entradas, ambas de erro (`RESTORE_ERROR`), sem nenhum registro de operação bem-sucedida.

**Onde foi encontrado:** `/data/backups/backup.log`

**Problema:** A ausência de logs de sucesso impede auditoria completa do histórico de backups. Não é possível confirmar pela análise do log se backups foram criados com sucesso em algum momento.

**Ajuste necessário:** Investigar o motivo da ausência de logs de sucesso:
- O log foi limpo manualmente ou por rotação?
- O sistema está em uso há pouco tempo?
- Houve falha em todas as tentativas de backup?

**Prioridade:** Média — Impacta auditoria e rastreabilidade

### 5.2. Divergência entre data no nome do arquivo e data do filesystem

**O que foi encontrado:** Os arquivos `.enc` e `.sha256` possuem datas no nome indicando maio de 2026, mas a data de modificação no filesystem é agosto de 2026.

**Onde foi encontrado:** `/data/backups/caminhar-pg-backup_2026-05-21T19-56-57Z.sql.gz.enc` e `/data/backups/caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.enc`

**Problema:** A divergência dificulta a identificação precisa de quando os arquivos foram realmente criados ou modificados.

**Ajuste necessário:** Verificar o processo de backup/restore para entender se:
- Os arquivos são renomeados após criação
- O backup é gerado em outro local e copiado depois
- Há recriptografia periódica que atualiza a data do filesystem

**Prioridade:** Baixa — Não afeta funcionalidade, apenas rastreabilidade

### 5.3. Hash SHA-256 não verificável diretamente

**O que foi encontrado:** O `.sha256` contém o hash do arquivo original (`.sql.gz`), não do arquivo criptografado (`.enc`). Além disso, o formato contém apenas o hash puro, sem nome de arquivo, impedindo o uso de `sha256sum -c`.

**Onde foi encontrado:** `/data/backups/*.sha256` e `/data/backups/*.enc`

**Problema:** Não é possível verificar a integridade dos backups criptografados sem:
1. Ter a chave `BACKUP_ENCRYPTION_KEY`
2. Descriptografar o `.enc`
3. Calcular o hash do resultado
4. Comparar manualmente com o `.sha256`

**Ajuste necessário:** Implementar script de verificação de integridade que realize o fluxo completo automaticamente, ou documentar o procedimento manual necessário.

**Prioridade:** Média — Impacta capacidade de verificar integridade dos backups

## 6. Melhorias

### 6.1. Implementar verificação de integridade automatizada

**Justificativa:** A verificação manual de integridade requer múltiplos passos e conhecimento da chave de criptografia. Um script automatizdo permitiria validação rápida e segura.

**Sugestão:** Criar script `scripts/verify-backup.js` que:
- Localiza o par `.enc` + `.sha256`
- Usa `BACKUP_ENCRYPTION_KEY` para descriptografar
- Calcula o hash do conteúdo descriptografado
- Compara com o hash armazenado
- Reporta resultado (válido/inválido)

### 6.2. Incluir metadados de tamanho e duração no log

**Justificativa:** O log atual não registra informações operacionais como tamanho do backup ou duração da operação, dificultando monitoramento e planejamento de capacidade.

**Sugestão:** Estender o formato do log para incluir:
- Tamanho do arquivo gerado
- Duração da operação
- Tipo de operação (backup/restore)

### 6.3. Documentar procedimento de verificação de integridade

**Justificativa:** O formato do `.sha256` (hash puro, sem nome de arquivo) não é imediatamente compreensível e impede uso de ferramentas padrão.

**Sugestão:** Adicionar documentação explicando:
- Por que o hash refere-se ao conteúdo original, não ao criptografado
- Como realizar verificação manual
- Limitações do formato atual

### 6.4. Avaliar retenção de backups

**Justificativa:** Apenas 2 backups disponíveis, ambos de maio de 2026. Se o sistema está ativo desde então, há janela de cobertura pequena.

**Sugestão:** Avaliar aumento do limite de retenção além dos 10 backups configurados, ou implementar backup incremental para reduzir espaço.

### 6.5. Implementar backup automatizado

**Justificativa:** Os backups existentes são de maio de 2026, e os erros no log são de setembro de 2026. Sem automação, há risco de janelas sem backup.

**Sugestão:** Configurar cron job ou agendamento automático para execução diária de backups.

### 6.6. Backup em nuvem ou off-site

**Justificativa:** Backups apenas locais ficam vulneráveis a falha de disco ou desastre físico.

**Sugestão:** Implementar envio automático para armazenamento externo (S3, GCS) após geração local.

## 7. Duplicidades

### 7.1. Estratégia paralela de backup JSON de posts

**O que foi encontrado:** Os scripts `/scripts/maintenance/backup-posts.js` e `/scripts/maintenance/restore-posts.js` implementam backup JSON específico da tabela `posts`, paralelo ao backup PostgreSQL central.

**Problema:** Duplicidade de código e conteúdo — o backup PostgreSQL (`scripts/backup.js`) já cobre integralmente a tabela `posts`.

**Evidência:** Análise dos scripts de manutenção mostra lógica de backup/restore JSON que não participa da rotação automática, criptografia ou log central.

### 7.2. API admin de backups com lógica de listagem duplicada

**O que foi encontrado:** O endpoint GET de `/pages/api/admin/backups.js` implementa sua própria lógica de listagem, em vez de reutilizar `getAvailableBackups()` do módulo central.

**Problema:** Duas implementações de listagem com filtros diferentes, podendo retornar resultados inconsistentes.

**Evidência:** O filtro da API (`.sql`, `.gz`, `.enc`) difere do filtro do módulo central (prefixo `caminhar-pg-backup`).

## 8. Código morto

### 8.1. Constante `BACKUP_INTERVAL_MS` não utilizada

**O que foi encontrada:** Constante definida em `/scripts/utils/constants.js` (24 horas em ms) mas não utilizada em nenhum script.

**Evidência:** Análise do código mostra que o agendamento é feito via cron do sistema operacional.

**Sugestão:** Remover a constante ou documentar propósito futuro.

### 8.2. Possível código morto nos scripts de manutenção de posts

**O que foi encontrada:** Os scripts `backup-posts.js` e `restore-posts.js` possuem problemas de caminho (diretorio errado) e carregamento de `.env` inconsistente, sugerindo que podem não estar em uso ativo.

**Evidência:**
- Caminho `path.resolve(__dirname, '../data/backups')` resolve para `scripts/data/backups` (não existe)
- Carregamento de `.env` via `path.resolve(__dirname, '../.env')` aponta para `scripts/.env` (deveria ser raiz)

**Sugestão:** Verificar se esses scripts são chamados em algum fluxo. Se não forem, considerar remoção.

### 8.3. Duplicidade de carregamento de variáveis de ambiente

**O que foi encontrada:** Os scripts de manutenção usam `dotenv.config()` direto, enquanto o módulo central usa `loadEnv()` compartilhado.

**Problema:** Inconsistência que pode causar falhas silenciosas se `DATABASE_URL` estiver apenas na raiz.

**Evidência:** Análise do código de `backup-posts.js` e `restore-posts.js`.

## Resumo do processamento

| # | Arquivo | Tipo | Tamanho | Data filesystem | Status |
|---|---------|------|---------|-----------------|--------|
| 1 | `backup.log` | Log | 202 bytes | 04/09/2026 | 2 erros, 0 sucessos |
| 2 | `caminhar-pg-backup_2026-05-21T19-56-57Z.sql.gz.enc` | Backup criptografado | 4.3 MB | 25/08/2026 | Hash não verificável diretamente |
| 3 | `caminhar-pg-backup_2026-05-21T19-56-57Z.sql.gz.sha256` | Hash SHA-256 | 64 bytes | 25/08/2026 | Hash do original, não do .enc |
| 4 | `caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.enc` | Backup criptografado | 4.3 MB | 25/08/2026 | Hash não verificável diretamente |
| 5 | `caminhar-pg-backup_2026-05-22T10-18-54Z.sql.gz.sha256` | Hash SHA-256 | 64 bytes | 25/08/2026 | Hash do original, não do .enc |

**Total de arquivos analisados:** 5/5
**Total de problemas identificados:** 3
**Total de melhorias recomendadas:** 6
**Total de duplicidades identificadas:** 2
<longcat_arg_value>
