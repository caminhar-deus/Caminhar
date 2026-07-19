# Relatório de Melhorias Potenciais — Pasta `/data`

## Contexto

Este documento apresenta o levantamento analítico de possíveis melhorias para a estrutura e organização da pasta `/data`, com base na análise atual dos arquivos existentes.

**Estado atual da pasta:** contém apenas o subdiretório `backups/` com 2 backups criptografados (.enc), seus respectivos hashes SHA-256 e um arquivo de log (.log). Todos os problemas identificados anteriormente (inconsistência SQLite vs PostgreSQL, backup JSON redundante, formato de datas, erro de criptografia, entity_id, etc.) já foram resolvidos e documentados em `/docs/resolvidos/UPGRADE_data.md`. O item 2 (backup de segurança pré-restore visível) também já foi implementado — ver detalhes na seção correspondente.

---

## 1. Ausência de Backup Não Criptografado para Troubleshooting

**Localização:** `/data/backups/`

**Problema:** Todos os backups atuais estão no formato `.enc` (criptografados com AES-256-GCM). Em situações de emergência onde a chave `BACKUP_ENCRYPTION_KEY` não esteja disponível (troca de ambiente, perda de credenciais, CI sem acesso à chave), os backups tornam-se inutilizáveis.

**Sugestão:** Manter também um backup não criptografado no mesmo diretório (ou em um diretório separado), permitindo restore mesmo sem a chave de criptografia. Alternativamente, documentar explicitamente a localização segura da chave.

**Prioridade:** Média
**Impacto:** Segurança vs. Recuperabilidade

---

## 2. Ausência de Backup de Segurança Pré-Restore Visível

**Localização:** `/data/backups/`

**Problema:** Embora o script `scripts/backup.js` realize um backup de segurança antes de operações de restore, não há um backup explícito no diretório que represente o "estado atual" do banco antes de qualquer alteração manual.

**Sugestão:** Criar um snapshot nomeado como `caminhar-pg-backup_current_state.sql.gz` (atualizado a cada execução de alteração significativa) ou manter um backup rotativo com a data da última alteração de schema.

**Prioridade:** Baixa
**Impacto:** Rastreabilidade operacional

---

## 3. Log de Backup sem Rotações ou Retenção Configurável

**Localização:** `/data/backups/backup.log`

**Problema:** O log de backup é mantido com no máximo 100 linhas recentes, mas não há um mecanismo explícito de rotação de logs (log rotation) ou definição clara de retenção. Em operações frequentes, informações históricas úteis podem ser perdidas.

**Sugestão:** Implementar rotação de logs baseada em data (ex.: manter logs dos últimos 30 dias em arquivos separados por mês) ou exportar logs para um sistema externo (ex.: arquivo JSON com timestamp no nome, enviado para armazenamento de logs).

**Prioridade:** Baixa
**Impacto:** Rastreabilidade e auditoria

---

## 4. Ausência de Backup Automático em Intervalo Regular

**Localização:** `/data/backups/`

**Problema:** Atualmente existem apenas 2 backups manuais (datados de 21 e 22 de maio de 2026). Não há evidência de um cron job ou agendamento automático que garanta backups periódicos sem intervenção manual.

**Sugestão:** Configurar um cron job ou GitHub Action agendado para executar `npm run backup` diariamente, garantindo que o diretório sempre contenha backups recentes e reduzindo o risco de perda de dados.

**Prioridade:** Alta
**Impacto:** Continuidade e segurança dos dados

---

## 5. Número Reduzido de Backups no Diretório

**Localização:** `/data/backups/`

**Problema:** O script de backup realiza cleanup automático mantendo no máximo 10 backups. Entretanto, o diretório atualmente contém apenas 2 backups. Isso pode indicar que:
- O cleanup foi executado recentemente e removeu backups mais antigos
- Backup não está sendo executado com frequência
- O diretório foi limpo manualmente

**Sugestão:** Verificar a frequência de execução do backup e considerar aumentar o limite de retenção para 15-20 backups se o volume de dados permitir, ou implementar backup diferencial/incremental para reduzir o espaço ocupado.

**Prioridade:** Média
**Impacto:** Disponibilidade de pontos de restauração

---

## 6. Sem Teste Automatizado de Restore

**Localização:** `/data/backups/`

**Problema:** Os hashes SHA-256 permitem verificar a integridade dos arquivos de backup, mas não há um teste automatizado que execute um restore em um ambiente isolado (ex.: container temporário) para validar que o backup pode ser restaurado com sucesso.

**Sugestão:** Implementar um script ou etapa em CI que:
1. Copie o backup mais recente para um container PostgreSQL temporário
2. Execute o restore
3. Verifique a integridade das tabelas (contagem de registros, existência de schemas)
4. Destrua o container
Isso garantiria que os backups são válidos e restauráveis.

**Prioridade:** Média
**Impacto:** Confiabilidade e resiliência

---

## 7. Sem Métricas de Tamanho e Crescimento do Banco

**Localização:** `/data/backups/`

**Problema:** Não há registro visível do tamanho de cada backup ou do banco de dados ao longo do tempo. Isso dificulta o planejamento de armazenamento e a identificação de crescimento anômalo.

**Sugestão:** Incluir no log (`backup.log`) ou em um arquivo separado (`/data/backups/metrics.json`) informações como:
- Tamanho do banco antes do backup
- Tamanho do arquivo `.sql.gz` gerado
- Tamanho do arquivo `.enc`
- Duração da operação de backup

**Prioridade:** Baixa
**Impacto:** Monitoramento e capacidade

---

## 8. Backup.log Inacessível por .clineignore

**Localização:** `/data/backups/backup.log`

**Problema:** O arquivo `backup.log` está bloqueado pelo `.clineignore`, impedindo que ferramentas de IA (como o Cline) possam consultar o histórico de backups durante análises. Embora o log seja sanitizado, o bloqueio impede verificações rápidas de consistência.

**Sugestão:** Avaliar se o bloqueio do `backup.log` no `.clineignore` é realmente necessário. Como o log já é sanitizado (sem senhas, tokens ou dados sensíveis), remover essa entrada permitiria consultas diretas ao histórico sem comprometer a segurança.

**Prioridade:** Baixa
**Impacto:** Acessibilidade para análise automatizada

---

## 9. Ausência de Backup em Nuvem ou Off-site

**Localização:** `/data/backups/`

**Problema:** Todos os backups estão armazenados localmente no servidor. Em caso de falha de disco, desastre físico ou corrupção do sistema de arquivos, todos os backups seriam perdidos junto com o banco de dados ativo.

**Sugestão:** Implementar envio automático dos backups para armazenamento externo (S3 compatível, Google Cloud Storage, ou até mesmo um segundo servidor via rsync/SCP) após a geração local. Isso garantiria recuperação mesmo em cenários de desastre completo.

**Prioridade:** Alta
**Impacto:** Disaster recovery e continuidade de negócios

---

## Resumo das Sugestões

| # | Sugestão | Categoria | Prioridade | Esforço Estimado |
|---|----------|-----------|------------|------------------|
| 1 | Backup não criptografado para troubleshooting | Resiliência | Média | Baixo |
| 2 | Backup de estado atual pré-restore | Operacional | Baixa | Baixo |
| 3 | Rotação de logs com retenção configurável | Manutenção | Baixa | Baixo |
| 4 | Backup automático em intervalo regular | Continuidade | **Alta** | Médio |
| 5 | Aumentar retenção de backups | Capacidade | Média | Baixo |
| 6 | Teste automatizado de restore | Confiabilidade | Média | Alto |
| 7 | Métricas de tamanho e crescimento | Monitoramento | Baixa | Médio |
| 8 | Liberar backup.log do .clineignore | Acessibilidade | Baixa | Baixo |
| 9 | Backup em nuvem ou off-site | Disaster Recovery | **Alta** | Alto |

---

## Nota sobre o Documento Anterior

O documento `/docs/resolvidos/UPGRADE_data.md` contém **11 itens** de melhorias e correções, **todos já implementados**. As melhorias anteriores incluíram:

- Remoção do SQLite e unificação em PostgreSQL
- Correção de bugs (entity_id, criptografia)
- Padronização de formatos de data
- Remoção de backups redundantes (JSON)
- Sanitização de logs

Nenhum dos problemas anteriores persiste no estado atual da pasta `/data`.

---

## Item 2 — Implementado

O backup de segurança pré-restore agora segue o mesmo padrão de nomenclatura dos backups regulares (`caminhar-pg-backup_pre-restore_<timestamp>.sql.gz`), possui hash SHA-256 gerado automaticamente, é registrado no `backup.log` com tag `[Segurança]` e participa da rotação automática (cleanup) junto com os demais backups. O nome do safety backup também é exibido na saída do comando `npm run backup:restore`.

---

## Item 3 — Implementado

O `backup.log` agora possui um sistema completo de rotação e retenção configurável:

- **Rotação por tamanho:** Quando o arquivo `backup.log` excede 10 MB (`LOG_MAX_SIZE_BYTES`), é renomeado para `backup-<timestamp>.log` e um novo arquivo vazio é criado.
- **Rotação por data:** Se a última modificação do `backup.log` for de mês anterior ao corrente, a rotação é disparada automaticamente.
- **Retenção configurável:** Logs rotacionados com mais de 30 dias (`LOG_RETENTION_DAYS`) são removidos automaticamente durante a limpeza de backups.
- **Integração automática:** A verificação de rotação ocorre antes de cada escrita no log (`logBackupOperation()` → `rotateLogIfNeeded()`). A limpeza de logs antigos ocorre junto com `cleanupOldBackups()`.
- **Consulta de histórico:** `npm run backup:logs:all` (ou `node scripts/view-backup-logs.js --all`) exibe logs atuais + rotacionados, ordenados do mais recente para o mais antigo.
- **Exportação pública:** As funções `rotateLogIfNeeded()` e `cleanupOldLogs()` estão disponíveis para importação por outros módulos.
- **Constantes adicionadas em `scripts/utils/constants.js`:** `LOG_RETENTION_DAYS` (30) e `LOG_MAX_SIZE_BYTES` (10 MB).
- **Testes atualizados:** `tests/unit/lib/backup/backup.logs.test.js` adaptado para a nova ordenação descendente dos logs.
- **22/22 testes passando** nos módulos de backup.
