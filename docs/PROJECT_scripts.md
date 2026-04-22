# Documentação dos Scripts do Projeto Caminhar

> Análise técnica e funcional dos scripts solicitados, com descrição objetiva, propósito e características principais.

---

## 📑 Sumário
- [scripts/backup.js](#scriptsbackupjs)
- [scripts/check-db-status.js](#scriptscheck-db-statusjs)
- [scripts/check-env.js](#scriptscheck-envjs)
- [scripts/check-server.js](#scriptscheck-serverjs)
- [scripts/clean-k6-reports.js](#scriptsclean-k6-reportsjs)
- [scripts/clean-load-test-posts.js](#scriptsclean-load-test-postsjs)
- [scripts/clean-orphaned-images.js](#scriptsclean-orphaned-imagesjs)
- [scripts/clean-test-db.js](#scriptsclean-test-dbjs)
- [scripts/clear-cache.js](#scriptsclear-cachejs)
- [scripts/clear-db.js](#scriptsclear-dbjs)
- [scripts/clear-musicas.js](#scriptsclear-musicasjs)
- [scripts/consolidate-k6-reports.js](#scriptsconsolidate-k6-reportsjs)
- [scripts/create-backup.js](#scriptscreate-backupjs)
- [scripts/cron-backup.sh](#scriptscron-backupsh)
- [scripts/db-shell.js](#scriptsdb-shelljs)
- [scripts/generate-load-report.js](#scriptsgenerate-load-reportjs)
- [scripts/init-backup.js](#scriptsinit-backupjs)
- [scripts/init-dicas.js](#scriptsinit-dicasjs)
- [scripts/init-musicas.js](#scriptsinit-musicasjs)
- [scripts/init-posts.js](#scriptsinit-postsjs)
- [scripts/init-server.js](#scriptsinit-serverjs)
- [scripts/init-videos.js](#scriptsinit-videosjs)
- [scripts/monitor-disk-space.js](#scriptsmonitor-disk-spacejs)
- [scripts/reset-admin-password.js](#scriptsreset-admin-passwordjs)
- [scripts/restore-backup.js](#scriptsrestore-backupjs)
- [scripts/run-load-tests.sh](#scriptsrun-load-testssh)
- [scripts/seed-all.js](#scriptsseed-alljs)
- [scripts/seed-musicas.js](#scriptsseed-musicasjs)
- [scripts/seed-posts.js](#scriptsseed-postsjs)
- [scripts/seed-products.js](#scriptsseed-productsjs)
- [scripts/seed-videos.js](#scriptsseed-videosjs)
- [scripts/validate-schema.js](#scriptsvalidate-schemajs)

---

---

## 📦 scripts/backup.js

### ✅ Propósito Principal
Sistema completo de backup e restauração do banco de dados PostgreSQL. Gerencia ciclos de backup, retenção, logs e recuperação segura.

### 🔑 Funcionalidades Principais
| Funcionalidade | Descrição |
|---|---|
| `createBackup()` | Cria backup comprimido do banco usando `pg_dump` + `gzip` |
| `restoreBackup()` | Restaura banco a partir de arquivo de backup **com segurança: cria backup automático do estado atual antes de sobrescrever** |
| `cleanupOldBackups()` | Manutenção automática: mantém somente os últimos 10 backups mais recentes |
| `getAvailableBackups()` | Lista todos backups disponíveis com dados de data e tamanho |
| `getBackupLogs()` | Consulta histórico de operações de backup |
| `startBackupScheduler()` | Agendador automático com execução diária às 2h da manhã |
| Sistema de Logs | Registra todas operações com timestamp e status, mantendo histórico de últimos 100 entradas |

### ⚙️ Configurações Padrão
- Localização dos backups: `/data/backups/`
- Arquivo de log: `/data/backups/backup.log`
- Retenção máxima: 10 backups
- Agendamento: Diariamente às 02:00 AM

### 📌 Pontos Importantes
✅ **Segurança**: Antes de qualquer restauração é criado automaticamente um backup de segurança do estado atual do banco
✅ Compressão nativa com gzip reduz significativamente espaço em disco
✅ Todos erros são capturados e logados
✅ Funciona como módulo importável ou pode ser executado diretamente

### 📚 Dependências
`date-fns`, `pg_dump` (necessário estar instalado no sistema)

---

---

## 🔍 scripts/check-db-status.js

### ✅ Propósito Principal
Ferramenta de diagnóstico para verificar conectividade e status operacional do banco de dados PostgreSQL.

### 🔑 Funcionalidades Principais
1. Carrega automaticamente variáveis de ambiente (prioriza `.env.local`)
2. Exibe `DATABASE_URL` com **senha mascarada** para segurança no log
3. Testa conexão real com o banco de dados
4. Mostra versão do PostgreSQL
5. Realiza contagem de registros nas tabelas principais:
   - `posts`
   - `videos` 
   - `musicas`
   - `users`
6. Fecha conexão adequadamente independente do resultado

### 📌 Pontos Importantes
✅ Útil para debug rápido de problemas de conexão
✅ Não expõe senhas no terminal
✅ Valida também se o banco está respondendo a consultas
✅ Pode ser executado a qualquer momento sem afetar a aplicação

### 📚 Dependências
`dotenv`, módulo `/lib/db.js`

---

---

## ✅ scripts/check-env.js

### ✅ Propósito Principal
Validador obrigatório de variáveis de ambiente. Garante que todas configurações necessárias existam antes do servidor iniciar.

### 🔑 Funcionalidades Princip Usa a **mesma lógica de carregamento de variáveis do Next.js** (garante compatibilidade)
2. Verifica variáveis **OBRIGATÓRIAS**:
   - `DATABASE_URL` (conexão com banco)
   - `JWT_SECRET` (segurança autenticação)
3. Verifica variáveis **OPCIONAIS**:
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - Configurações Redis
4. Se qualquer variável obrigatória faltar:
   ✗ Exibe mensagem de erro clara
   ✗ Encerra o processo com código de erro 1
   ✗ Impede o servidor de inicializar
5. Usa códigos de cor ANSI para melhor legibilidade no terminal

### 📌 Pontos Importantes
✅ **Executado AUTOMATICAMENTE** antes do servidor Next.js iniciar
✅ É a primeira linha de defesa contra erros de configuração
✅ Segue exatamente a mesma lógica de ambiente que a própria aplicação
✅ Não permite inicialização com configuração incompleta

### 📚 Dependências
`@next/env`

---

---

## 🚀 scripts/check-server.js

### ✅ Propósito Principal
Verificador rápido para confirmar que o servidor da aplicação está online e respondendo. Usado principalmente antes da execução de testes de carga.

### 🔑 Funcionalidades Principais
1. Tenta conectar no servidor na porta configurada (padrão 3000)
2. Suporta HTTP e HTTPS automaticamente
3. Timeout configurado de 2 segundos
4. Se servidor responder: processo encerra com código 0 (sucesso)
5. Se servidor NÃO responder:
   ✗ Exibe mensagem de erro explicativa
   ✗ Sugere iniciar a aplicação com `npm run dev` ou `npm start`
   ✗ Encerra com código 1 (erro)

### 📌 Pontos Importantes
✅ Usado pelos scripts de teste de carga para validar que a aplicação está rodando
✅ Verifica somente conectividade básica, não valida funcionalidades
✅ Extremamente leve e rápido
✅ Pode ser usado em scripts de CI/CD

### 📚 Dependências
Nenhuma dependência externa, usa somente módulos nativos Node.js `http` / `https`

---

---

---

---

## 🧹 scripts/clean-k6-reports.js

### ✅ Propósito Principal
Limpeza automática de relatórios antigos de testes de carga gerados pelo k6.

### 🔑 Funcionalidades Principais
1. Remove relatórios com mais de 7 dias de idade
2. Apenas arquivos `.json` e `.html` são verificados
3. Verifica existência do diretório antes de operar
4. Conta e exibe quantidade de arquivos removidos
5. Funciona tanto como módulo importável quanto executável diretamente

### ⚙️ Configurações Padrão
- Diretório alvo: `/reports/k6-summaries/`
- Período de retenção: 7 dias

### 📌 Pontos Importantes
✅ Seguro: somente arquivos de relatórios são afetados
✅ Não remove relatórios recentes
✅ Protege contra erros caso diretório não exista

---

---

## 🧹 scripts/clean-load-test-posts.js

### ✅ Propósito Principal
Remove posts de teste criados automaticamente durante execução de testes de carga.

### 🔑 Funcionalidades Principais
1. Conecta diretamente ao banco de dados PostgreSQL
2. Remove todos posts que possuem slug iniciando com `post-carga-%`
3. Exibe contagem exata de registros removidos
4. Carrega variáveis de ambiente usando padrão Next.js

### 📌 Pontos Importantes
✅ Seguro: somente posts gerados por testes de carga são removidos
✅ Não afeta conteúdo real do site
✅ Rápido e eficiente

---

---

## 🧹 scripts/clean-orphaned-images.js

### ✅ Propósito Principal
Limpeza de arquivos de imagem órfãos deixados por testes que não foram removidos corretamente.

### 🔑 Funcionalidades Principais
1. Primeiro consulta banco de dados para identificar TODOS arquivos de imagem em uso ativo
2. Extrai nomes de arquivos de URLs salvos no banco
3. Lista arquivos presentes no diretório `/public/uploads/`
4. Remove somente arquivos que seguem padrão de teste e NÃO estão referenciados em nenhum lugar do banco
5. Trata erros de tabelas/colunas inexistentes com avisos amigáveis

### 📌 Pontos Importantes
✅ **Muito seguro**: nunca apaga arquivos que estão sendo usados
✅ Apenas apaga arquivos que correspondem aos padrões `post-image-*` e `hero-image-*`
✅ Antes de apagar verifica duas vezes a existência no banco
✅ Exibe progresso detalhado durante execução
✅ Fecha conexão com banco adequadamente

---

---

## 🧹 scripts/clean-test-db.js

### ✅ Propósito Principal
Remove arquivos de banco de dados SQLite utilizados somente para testes automatizados.

### 🔑 Funcionalidades Principais
1. Localiza e exclui arquivos de banco de teste
2. Não afeta banco de dados principal da aplicação
3. Verifica existência do arquivo antes de tentar remover

### ⚙️ Arquivos Alvo
- `test.db`
- `caminhar-test.db`

### 📌 Pontos Importantes
✅ NUNCA toca no banco de dados principal de produção/desenvolvimento
✅ Limpa arquivos temporários gerados pelos testes unitários e de integração
✅ Ideal para rodar antes de suites de teste para garantir estado limpo

---

---

---

---

## 🧹 scripts/clear-cache.js

### ✅ Propósito Principal
Limpa todo cache armazenado no Redis (Upstash).

### 🔑 Funcionalidades Principais
1. Verifica se as credenciais do Redis estão configuradas nas variáveis de ambiente
2. Se não configurado, exibe aviso explicativo informando que cache local em memória precisa de reinício do servidor
3. Realiza operação `FLUSHDB` que apaga todas chaves do banco Redis
4. Simples e direto

### 📌 Pontos Importantes
✅ Nenhuma dependência externa além do cliente oficial Upstash Redis
✅ Não causa erro se Redis não estiver configurado
✅ Apenas limpa cache, não afeta nenhum dado persistente

---

---

## 🗑️ scripts/clear-db.js

### ✅ Propósito Principal
**⚠️  SCRIPT PERIGOSO**: Apaga TODOS dados do banco de dados, mantendo somente a estrutura das tabelas.

### 🔑 Funcionalidades Principais
1. Utiliza `TRUNCATE` (muito mais rápido que `DELETE`) com `RESTART IDENTITY` para resetar contadores de IDs
2. Usa `CASCADE` para apagar também dados em tabelas dependentes
3. Além do banco, também limpa TODO conteúdo do diretório `/public/uploads/`
4. Preserva arquivos de controle como `.gitkeep`
5. Fecha conexão com banco adequadamente

### 📌 Pontos Importantes
⚠️ **IRREVERSÍVEL**: Todos dados são perdidos permanentemente
✅ Trata corretamente relacionamentos entre tabelas
✅ Não apaga a estrutura do banco, somente os dados
✅ Limpa também arquivos físicos de upload

---

---

## 🗑️ scripts/clear-musicas.js

### ✅ Propósito Principal
Remove todos registros da tabela `musicas` do banco de dados.

### 🔑 Funcionalidades Principais
1. Operação segura e focada em somente uma tabela
2. Não afeta nenhum outro dado do sistema
3. Não reseta contador de ID automático

### 📌 Pontos Importantes
✅ Ideal para teste de importação e seed de dados
✅ Seguro: não afeta posts, vídeos, usuários ou configurações
✅ Extremamente rápido

---

---

## 📊 scripts/consolidate-k6-reports.js

### ✅ Propósito Principal
Gera resumo consolidado visual de todos testes de carga k6 executados.

### 🔑 Funcionalidades Principais
1. Lê todos arquivos JSON de relatório no diretório `/reports/k6-summaries/`
2. Extrai métricas principais de cada teste:
   - Quantidade máxima de usuários simulados
   - Total de requisições
   - Quantidade e percentual de falhas
   - Tempo médio de resposta
   - Tempo de resposta percentil 95
3. Calcula totais gerais de todos testes combinados
4. Exibe resultado formatado para leitura humana no terminal
5. Calcula taxa de sucesso global

### 📌 Pontos Importantes
✅ Nenhuma dependência externa
✅ Formata saída de forma legível e organizada
✅ Útil para comparação rápida entre múltiplos testes
✅ Não modifica nenhum arquivo, somente lê e exibe dados

---

---

---

---

## 📦 scripts/create-backup.js

### ✅ Propósito Principal
Wrapper executável direto para criação de backup manual do banco de dados.

### 🔑 Funcionalidades Principais
1. Carrega corretamente as variáveis de ambiente (prioriza `.env.local`)
2. Importa e executa a função `createBackup()` do módulo principal `backup.js`
3. Trata erros e retorna código de saída apropriado

### 📌 Pontos Importantes
✅ É o script que deve ser chamado pelo usuário final e pelo agendador cron
✅ Não contém lógica de backup própria, somente é um ponto de entrada executável
✅ Mantém toda a segurança e funcionalidades do sistema principal de backup

---

---

## ⏰ scripts/cron-backup.sh

### ✅ Propósito Principal
Script auxiliar Bash para agendamento automático de backup via CRON no Linux.

### 🔑 Funcionalidades Principais
1. Garante que execução acontece dentro do diretório correto do projeto
2. Cria diretório de logs caso não exista
3. Executa o backup e registra TODA saída em arquivo de log `cron.log`
4. Configurado para execução diária às 3h da manhã

### 📌 Pontos Importantes
✅ Resolve o problema comum do cron não encontrar node / npm no PATH
✅ Mantém histórico completo de todas execuções agendadas
✅ Já vem com exemplo de configuração para crontab incluso no próprio arquivo

---

---

## 🔌 scripts/db-shell.js

### ✅ Propósito Principal
Abre um shell interativo do PostgreSQL (`psql`) diretamente com as credenciais do projeto.

### 🔑 Funcionalidades Principais
1. Carrega automaticamente `DATABASE_URL` dos arquivos de ambiente
2. Valida existência da variável antes de prosseguir
3. Inicia o processo `psql` com acesso total ao terminal (input/output interativo)
4. Repassa código de saída do psql para o processo principal

### 📌 Pontos Importantes
✅ Não precisa lembrar ou digitar senha ou string de conexão
✅ Entra diretamente no shell do banco com um único comando
✅ Funciona exatamente como se tivesse executado psql manualmente

---

---

## 📊 scripts/generate-load-report.js

### ✅ Propósito Principal
Executa bateria completa de testes de carga e gera relatório HTML consolidado com resultados.

### 🔑 Funcionalidades Principais
1. Executa sequencialmente 6 cenários diferentes de teste de carga com k6
2. Cada teste exporta sumário JSON automaticamente
3. Scripts de limpeza são executados automaticamente após cada teste quando necessário
4. Gera relatório HTML visual com tabela, cores e métricas:
   - Status do teste (Aprovado / Falhou)
   - Latência P95
   - Tempo médio de resposta
   - Total de requisições e requisições por segundo
   - Taxa de erro

### 📌 Pontos Importantes
✅ Automatiza todo processo de teste de carga
✅ Relatório é salvo em arquivo HTML pronto para visualização no navegador
✅ Cada teste executa em ambiente limpo
✅ Não precisa de nenhuma dependência externa além do k6

---

---

---

---

## ⚙️ scripts/init-backup.js

### ✅ Propósito Principal
Ponto de entrada para inicializar e iniciar o sistema automático de backup em modo serviço.

### 🔑 Funcionalidades Principais
1. Executa inicialização completa do sistema de backup (cria primeiro backup inicial)
2. Inicia o agendador automático de backups diários
3. Mantém processo rodando em background
4. Trata erros de inicialização e finaliza processo com código de erro apropriado

### 📌 Pontos Importantes
✅ Deve ser executado quando o servidor inicia para ativar backups automáticos
✅ Não é necessário para backups manuais
✅ Todo o log e funcionalidade continua sendo gerenciado pelo módulo `backup.js`

---

---

## ⚙️ scripts/init-dicas.js

### ✅ Propósito Principal
Inicializador da tabela "Dicas do Dia" com dados padrão.

### 🔑 Funcionalidades Principais
1. Cria a tabela `dicas` se não existir
2. Adiciona colunas faltantes caso a tabela já exista em versão antiga (migração segura)
3. Verifica se a tabela está vazia antes de inserir dados padrão
4. Popula com 3 dicas iniciais pré-definidas

### 📌 Pontos Importantes
✅ **Idempotente**: pode ser executado múltiplas vezes sem causar duplicação ou erros
✅ Funciona como migração e seed ao mesmo tempo
✅ Não apaga dados existentes

---

---

## ⚙️ scripts/init-musicas.js

### ✅ Propósito Principal
Recria a tabela de músicas do zero com schema atualizado.

### 🔑 Funcionalidades Principais
1. **⚠️  APAGA a tabela `musicas` completamente se existir**
2. Cria a tabela novamente com a estrutura de schema mais recente
3. Reseta todos contadores e índices

### 📌 Pontos Importantes
⚠️ **DESTRUTIVO**: todos dados existentes na tabela de músicas são PERDIDOS
✅ Usado durante desenvolvimento para resetar schema após alterações
✅ Não deve ser executado em ambiente de produção com dados reais

---

---

## ⚙️ scripts/init-posts.js

### ✅ Propósito Principal
Recria a tabela de artigos/posts do zero com schema atualizado.

### 🔑 Funcionalidades Principais
1. **⚠️  APAGA a tabela `posts` completamente se existir**
2. Cria a tabela novamente com a estrutura de schema mais recente
3. Valida existência de `DATABASE_URL` antes de prosseguir

### 📌 Pontos Importantes
⚠️ **DESTRUTIVO**: todos dados existentes na tabela de artigos são PERDIDOS
✅ Usado durante desenvolvimento para resetar schema após alterações
✅ Não deve ser executado em ambiente de produção com dados reais

---

---

---

---

## ⚙️ scripts/init-server.js

### ✅ Propósito Principal
Inicializador principal do servidor, responsável por preparar todos sistemas antes da aplicação iniciar.

### 🔑 Funcionalidades Principais
1. Proteção contra inicialização duplicada
2. Inicializa o sistema de autenticação
3. Inicializa conexão com banco de dados
4. Exporta também função de limpeza para desligamento seguro do servidor
5. Funciona tanto como módulo importado quanto executável diretamente

### 📌 Pontos Importantes
✅ É executado automaticamente antes do servidor Next.js iniciar
✅ Garante que todos subsistemas estejam prontos antes da aplicação aceitar requisições
✅ Seguro para chamar múltiplas vezes

---

---

## ⚙️ scripts/init-videos.js

### ✅ Propósito Principal
Recria a tabela de vídeos do zero com schema atualizado.

### 🔑 Funcionalidades Principais
1. **⚠️  APAGA a tabela `videos` completamente se existir**
2. Cria a tabela novamente com a estrutura de schema mais recente
3. Reseta todos contadores e índices

### 📌 Pontos Importantes
⚠️ **DESTRUTIVO**: todos dados existentes na tabela de vídeos são PERDIDOS
✅ Usado durante desenvolvimento para resetar schema após alterações
✅ Não deve ser executado em ambiente de produção com dados reais

---

---

## 📊 scripts/monitor-disk-space.js

### ✅ Propósito Principal
Monitoramento de espaço em disco com alerta de limite.

### 🔑 Funcionalidades Principais
1. Verifica uso do disco através do comando nativo `df`
2. Limite padrão de alerta: 85% de utilização
3. Permite configurar ponto de montagem e limite via variáveis de ambiente
4. Retorna código de erro 1 quando limite é ultrapassado (compatível com sistemas de monitoramento e cron)
5. Exibe recomendações de ação quando alerta é acionado

### 📌 Pontos Importantes
✅ Leve, sem dependências externas
✅ Pode ser agendado no cron para monitoramento contínuo
✅ Funciona em qualquer sistema Linux/Unix

---

---

## 🔐 scripts/reset-admin-password.js

### ✅ Propósito Principal
Ferramenta segura para resetar senha de usuário administrador diretamente no banco de dados.

### 🔑 Funcionalidades Principais
1. Aceita nome de usuário e nova senha por linha de comando
2. Usa a mesma função de hash de senha da aplicação
3. Se usuário não existir, cria automaticamente um novo usuário com permissão de admin
4. Fecha conexão com banco adequadamente

### 📌 Pontos Importantes
✅ Seguro: nunca exibe ou loga a senha em texto limpo
✅ Útil para recuperar acesso quando senha é perdida
✅ Funciona mesmo que a aplicação esteja fora do ar
✅ Nenhuma dependência externa além dos módulos internos da aplicação

---

---

---

---

## 📦 scripts/restore-backup.js

### ✅ Propósito Principal
Interface amigável para restauração de backup com listagem automática de backups disponíveis.

### 🔑 Funcionalidades Principais
1. Se nenhum arquivo for informado, lista automaticamente todos backups disponíveis no diretório
2. Mostra data e horário de cada backup
3. Recebe nome do arquivo por linha de comando
4. Chama a função principal de restauração do módulo `backup.js` mantendo toda segurança

### 📌 Pontos Importantes
✅ É o script que deve ser usado pelo usuário final para restauração
✅ Não contém lógica própria, somente interface de usuário
✅ Mantém todo o sistema de segurança e backup prévio antes da restauração

---

---

## 🚀 scripts/run-load-tests.sh

### ✅ Propósito Principal
Wrapper seguro para execução da bateria completa de testes de carga.

### 🔑 Funcionalidades Principais
1. Verifica se o servidor da aplicação está online antes de iniciar os testes
2. Usa `curl` com timeout de 1 segundo para verificação rápida
3. Exibe mensagem de ajuda clara caso servidor não esteja rodando
4. Executa o comando completo `npm run test:load:all`

### 📌 Pontos Importantes
✅ Previne erros comuns de executar testes com servidor parado
✅ Verificação opcional se curl não estiver disponível
✅ Extremamente leve e rápido

---

---

## 🌱 scripts/seed-all.js

### ✅ Propósito Principal
Orquestrador de seed completo do banco de dados com dados de exemplo.

### 🔑 Funcionalidades Principais
1. Suporta flag `--clean` que reseta todo banco antes de popular
2. Verifica conectividade com banco antes de prosseguir
3. Executa scripts de seed em ordem correta: posts → músicas → vídeos
4. Executa cada script importando diretamente, não via sub-processo
5. Trata erros individualmente e para execução na primeira falha

### 📌 Pontos Importantes
✅ Idempotente: pode ser executado múltiplas vezes
✅ Opção de limpeza completa para ambiente de desenvolvimento
✅ Ordem de execução garante que dependências entre tabelas são respeitadas

---

---

## 🌱 scripts/seed-musicas.js

### ✅ Propósito Principal
Popula a tabela de músicas com dados de exemplo pré-definidos.

### 🔑 Funcionalidades Principais
1. Insere 2 músicas de exemplo com dados reais
2. Todas músicas são marcadas como publicadas
3. Inclui URLs válidas do Spotify, título, artista e descrição

### 📌 Pontos Importantes
✅ Dados prontos para uso em ambiente de desenvolvimento
✅ Funciona em conjunto com `seed-all.js` ou pode ser executado separadamente
✅ Não apaga dados existentes, somente adiciona novos registros

---

---

---

---

## 🌱 scripts/seed-posts.js

### ✅ Propósito Principal
Popula a tabela de artigos/posts com dados de exemplo pré-definidos.

### 🔑 Funcionalidades Principais
1. Insere 3 artigos de exemplo: 2 publicados e 1 rascunho
2. Inclui conteúdo real, imagens, slug e descrição
3. Usa `ON CONFLICT` para não duplicar registros se já existirem

### 📌 Pontos Importantes
✅ Idempotente: pode ser executado múltiplas vezes sem problemas
✅ Dados prontos para visualização no ambiente de desenvolvimento
✅ Não apaga dados existentes

---

---

## 🌱 scripts/seed-products.js

### ✅ Propósito Principal
Gera e insere produtos de exemplo automaticamente usando dados falsos realistas.

### 🔑 Funcionalidades Principais
1. Cria 30 produtos com dados gerados pela biblioteca faker em português
2. Inclui títulos, preços, descrições e imagens reais
3. Adiciona links de venda para Mercado Livre, Shopee e Amazon
4. Exibe progresso a cada 5 produtos inseridos

### 📌 Pontos Importantes
✅ Gera volume de dados para teste de performance e paginação
✅ Todos valores são realistas e seguem padrão brasileiro
✅ Dados variados permitem testar filtros e buscas

---

---

## 🌱 scripts/seed-videos.js

### ✅ Propósito Principal
Popula a tabela de vídeos com dados de exemplo pré-definidos.

### 🔑 Funcionalidades Principais
1. Insere 2 vídeos de exemplo com URLs reais do Youtube
2. Ambos vídeos são marcados como publicados
3. Inclui título e descrição

### 📌 Pontos Importantes
✅ Dados prontos para uso em ambiente de desenvolvimento
✅ Funciona em conjunto com `seed-all.js` ou pode ser executado separadamente
✅ Não apaga dados existentes

---

---

## 🔍 scripts/validate-schema.js

### ✅ Propósito Principal
Validador de consistência entre o banco de dados e o schema esperado pelo código.

### 🔑 Funcionalidades Principais
1. Verifica existência de todas tabelas esperadas
2. Verifica existência de todas colunas em cada tabela
3. Compara com schema definido no próprio script mantido de acordo com o código
4. Exibe relatório completo com inconsistências encontradas
5. Retorna código de erro 1 se qualquer problema for encontrado

### 📌 Pontos Importantes
✅ Ótimo para execução em CI/CD e deploy
✅ Detecta problemas de migração não executada ou banco desatualizado
✅ Não modifica nenhum dado, somente verifica
✅ Funciona em qualquer ambiente

---

---

## 📋 Informações Gerais
✅ Todos scripts (exceto shell script) utilizam padrão ES Modules (`import` / `export`)
✅ Todos possuem tratamento de erros adequado
✅ Todos podem ser executados diretamente via linha de comando:
```bash
node scripts/nome-do-arquivo.js
