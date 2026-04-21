# Documentação Diretório /data
Armazenamento persistente e dados da aplicação

---

## 📋 Resumo Geral
| Item | Detalhe |
|---|---|
| **Diretório Principal** | `/data/` |
| **Finalidade** | Armazenamento de banco de dados, logs e backups |
| **Tipo de Dados** | Persistente, crítica |
| **Backup Automático** | Habilitado |
| **Retenção** | Configurada via scripts |

---

## 📁 Arquivos e Diretórios Analisados

---

### 1. 📄 `/data/caminhar.db`
#### Propósito
Arquivo principal do banco de dados SQLite da aplicação. É o banco primário utilizado no ambiente de desenvolvimento e ambientes single node.

#### Características:
✅ Banco de dados relacional SQLite
✅ Armazena TODOS os dados da aplicação: usuários, posts, músicas, vídeos, auditoria, logs
✅ Único ponto de verdade em ambientes não clusterizados
✅ Persistente entre reinicios da aplicação
✅ Migrações aplicadas diretamente neste arquivo

#### Observações:
- Este arquivo **NÃO** deve ser commitado no git
- Possui rotina automática de backup diário
- Tamanho aumenta conforme uso da aplicação
- Deve ter permissões de leitura e escrita para o usuário da aplicação

---

### 2. 📂 Diretório `/data/backups/`
#### Propósito
Armazenamento de todos os backups gerados automaticamente e manualmente pela aplicação. Todos os arquivos de backup seguem padrão de nomenclatura com timestamp.

#### Padrão de Nomenclatura:
| Tipo | Padrão |
|---|---|
| Backup Completo PostgreSQL | `caminhar-pg-backup_YYYY-MM-DD_HH-MM-SS.sql.gz` |
| Backup Parcial Posts | `posts-backup-YYYY-MM-DDTHH-MM-SS-SSSZ.json` |
| Log de Operações | `backup.log` |

---

### 3. 🗃️ `/data/backups/caminhar-pg-backup_2026-03-07_11-20-04.sql.gz`
#### Propósito
Backup completo e consistente do banco de dados PostgreSQL. Gerado via script oficial de backup.

#### Características:
✅ Dump completo do banco com todas as tabelas, índices e dados
✅ Compactado com gzip para economia de espaço
✅ Contém timestamp exato da geração no nome do arquivo
✅ Pronto para restauração imediata
✅ Integridade verificada após geração

#### Formato:
- Arquivo SQL puro dentro do pacote gzip
- Pode ser restaurado com ferramentas padrão do PostgreSQL
- Contém todas as permissões e propriedades do banco original

---

### 4. 📑 `/data/backups/posts-backup-2026-02-16T01-34-56-945Z.json`
#### Propósito
Backup parcial e exportável da tabela de posts. Gerado para exportação rápida e recuperação granular.

#### Características:
✅ Formato JSON legível por humanos
✅ Contém somente registros da tabela `posts`
✅ Backup incremental ou pontual
✅ Pode ser importado diretamente novamente ou analisado com ferramentas de texto
✅ Timestamp ISO 8601 padrão UTC

#### Uso:
- Recuperação de posts individuais
- Migração de dados entre ambientes
- Análise histórica
- Exportação para sistemas externos

---

### 5. 📜 `/data/backups/backup.log`
#### Propósito
Log completo de todas as operações de backup realizadas na aplicação.

#### Conteúdo registrado:
✅ Data e hora de inicio/fim de cada backup
✅ Tipo de backup executado
✅ Tamanho do arquivo gerado
✅ Status de sucesso ou falha
✅ Mensagens de erro detalhadas em caso de falha
✅ Tempo total de execução

#### Observação:
- Arquivo com rotação automática
- Mantém histórico dos ultimos 30 dias de operações
- Utilizado para auditoria e debug de falhas de backup

---

## ⚙️ Políticas e Regras
| Regra | Valor |
|---|---|
| Retenção Backups Completos | 30 dias |
| Retenção Backups Parciais | 7 dias |
| Frequência Backup Completo | Diário as 03:00 AM |
| Frequência Backup Posts | A cada 4 horas |
| Verificação de Integridade | Habilitada após cada backup |
| Criptografia | Aplicada em backups externos |

---

## 📌 Pontos Importantes
1. 🚨 O diretório `/data/` **nunca** deve ser montado em armazenamento volátil
2. 🔒 Permissões padrão: `700` para diretório, `600` para arquivos
3. 💾 É recomendado manter replicação deste diretório em local externo
4. ⚠️ Não editar manualmente nenhum arquivo dentro deste diretório
5. ✅ Todos os scripts de manutenção operam exclusivamente nesta estrutura

---

## 🛠️ Scripts Relacionados
| Script | Função |
|---|---|
| `/scripts/create-backup.js` | Cria backup completo manual |
| `/scripts/restore-backup.js` | Restaura backup existente |
| `/scripts/cron-backup.js` | Executado automaticamente pelo agendador |
| `/scripts/check-db-status.js` | Verifica integridade do banco |
| `/scripts/clean-backups.js` | Remove backups antigos conforme política de retenção |