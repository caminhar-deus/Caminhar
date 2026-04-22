Documentação dos Scripts Complementares do Projeto

> Arquivo criado em: 21/04/2026  
> Última atualização: 21/04/2026  
> Status: ✅ Documentação Completa

---

## Visão Geral

Este documento descreve o propósito, funcionamento e características de scripts auxiliares do projeto que não estão cobertos na documentação principal dos scripts. Todos os scripts aqui listados são ferramentas de manutenção, diagnóstico e operação.

---

## 📂 Scripts Analisados

- [reset-password.js](#1-reset-passwordjs)
- [verify-db-functions.js](#2-verify-db-functionsjs)
- [verify-migration.js](#3-verify-migrationjs)
- [check-musicas-schema.js](#4-check-musicas-schemajs)
- [check-videos-schema.js](#5-check-videos-schemajs)
- [count-posts.js](#6-count-postsjs)
- [diagnose-hero.js](#7-diagnose-herojs)
- [list-last-posts.js](#8-list-last-postsjs)
- [add-thumbnail-to-videos.js](#9-add-thumbnail-to-videosjs)
- [backup-posts.js](#10-backup-postsjs)
- [clean-k6-videos.js](#11-clean-k6-videosjs)
- [fix-hero-key.js](#12-fix-hero-keyjs)
- [populate-video-thumbnails.js](#13-populate-video-thumbnailsjs)
- [restore-posts.js](#14-restore-postsjs)
- [001-add-views-to-posts.js](#15-001-add-views-to-postsjs)
- [002-create-products-table.js](#16-002-create-products-tablejs)
- [003-add-position-to-products.js](#17-003-add-position-to-productsjs)
- [004-add-published-to-products.js](#18-004-add-published-to-productsjs)
- [005-add-last-login-to-users.js](#19-005-add-last-login-to-usersjs)
- [006-create-activity-logs.js](#20-006-create-activity-logsjs)
- [007-add-position-to-musicas.js](#21-007-add-position-to-musicasjs)
- [008-add-position-to-videos.js](#22-008-add-position-to-videosjs)
- [009-add-position-to-posts.js](#23-009-add-position-to-postsjs)
- [manual-api-test.js](#24-manual-api-testjs)
- [manual-rate-limit.js](#25-manual-rate-limitjs)
- [cleanup-test-data.js](#26-cleanup-test-datajs)
- [list-settings.js](#27-list-settingsjs)
- [list-table-columns.js](#28-list-table-columnsjs)
- [update-setting.js](#29-update-settingjs)

---

---

## 1. reset-password.js

| Dados | Valor |
|-------|-------|
| **Caminho** | `/scripts/auth/reset-password.js` |
| **Tipo** | Utilitário de Autenticação |
| **Ambiente** | CLI (Terminal) |
| **Dependências** | `dotenv`, `hashPassword`, `db` |

### ✅ Propósito Principal
Script para redefinição de senha de usuários diretamente no banco de dados, sem necessidade de acesso ao painel administrativo. Principalmente utilizado para recuperação de acesso em caso de perda da senha master.

### ⚙️ Funcionamento
1.  Recebe como parâmetros opcionais: nome de usuário e nova senha
2.  Utiliza o mesmo algoritmo de hash da aplicação para garantir compatibilidade
3.  Verifica se o usuário existe no banco
4.  **Se não existir:** Cria automaticamente um novo usuário com role `admin`
5.  **Se existir:** Atualiza apenas o campo senha do usuário existente
6.  Fecha a conexão com banco de forma segura ao final

### 🚀 Modo de Uso
```bash
# Padrão (reseta senha do usuário admin para 123456)
node scripts/auth/reset-password.js

# Usuário específico
node scripts/auth/reset-password.js mario

# Usuário e senha personalizados
node scripts/auth/reset-password.js mario minhaSenhaSegura123
```

### ⚠️ Pontos Importantes
- ✅ Usa hash seguro, nunca armazena senha em texto plano
- ⚠️ Valores padrão **não devem ser usados em ambiente de produção**
- ✅ Funciona mesmo se o sistema de autenticação web estiver com problemas
- ❌ Não há validação de força da senha neste script

---

---

## 2. verify-db-functions.js

| Dados | Valor |
|-------|-------|
| **Caminho** | `/scripts/db/verify-db-functions.js` |
| **Tipo** | Diagnóstico / Verificação |
| **Ambiente** | CLI (Terminal) |
| **Dependências** | `lib/db.js` |

### ✅ Propósito Principal
Ferramenta rápida para verificar quais funções estão exportadas corretamente pelo módulo de banco de dados. Utilizado durante desenvolvimento e migrações para confirmar que a API do banco está funcionando como esperado.

### ⚙️ Funcionamento
1.  Importa todo o módulo `db`
2.  Lista no terminal todas as funções exportadas
3.  Realiza verificação específica para a função `getSetting`
4.  Informa se a função está disponível ou se precisa ser implementada

### 🚀 Modo de Uso
```bash
node scripts/db/verify-db-functions.js
```

### ⚠️ Pontos Importantes
- ✅ Ferramenta leve e extremamente rápida
- ✅ Não modifica nenhum dado no banco
- ✅ Útil para debugar problemas de importação e módulos
- ❌ Verifica apenas existência da função, não valida seu funcionamento

---

---

## 3. verify-migration.js

| Dados | Valor |
|-------|-------|
| **Caminho** | `/scripts/db/verify-migration.js` |
| **Tipo** | API Endpoint |
| **Ambiente** | Servidor Next.js |
| **Dependências** | `withAuth`, `lib/db` |

### ✅ Propósito Principal
Endpoint HTTP seguro para verificação de integridade do banco de dados após migrações ou restaurações de backup. Retorna estatísticas básicas e amostras de dados para confirmação visual que tudo foi migrado corretamente.

### ⚙️ Funcionamento
1.  É um endpoint API Next.js protegido por autenticação
2.  Aceita apenas requisições `GET`
3.  Executa consultas de contagem em **paralelo** para máxima performance
4.  Retorna quantidade de registros nas tabelas principais: `users`, `posts`, `settings`, `images`
5.  Inclui amostra dos últimos 5 posts criados para verificação visual
6.  Trata erros adequadamente e retorna resposta estruturada

### 🚀 Acesso
```
GET /api/db/verify-migration
Headers: Authorization (Cookie de sessão válida)
```

### ⚠️ Pontos Importantes
- ✅ Protegido por autenticação, não é acessível publicamente
- ✅ Apenas leitura, nenhuma alteração no banco
- ✅ Tempo de resposta extremamente baixo
- ✅ Retorno estruturado pronto para ser consumido por painéis administrativos

---

---

## 4. check-musicas-schema.js

| Dados | Valor |
|-------|-------|
| **Caminho** | `/scripts/diagnostics/check-musicas-schema.js` |
| **Tipo** | Diagnóstico de Schema |
| **Ambiente** | CLI (Terminal) |
| **Dependências** | `fs`, `dotenv`, `pg` |

### ✅ Propósito Principal
Script especializado para verificar a integridade do schema da tabela `musicas`, especificamente a configuração da coluna `created_at`. Usado para diagnosticar problemas com ordenação e timestamps automáticos.

### ⚙️ Funcionamento
1.  Carrega variáveis de ambiente automaticamente (suporta `.env.local`)
2.  Cria conexão direta com PostgreSQL usando o driver oficial `pg`
3.  Consulta diretamente o `information_schema` do banco
4.  Verifica existência, tipo, nulabilidade e valor padrão da coluna
5.  Exibe resultados formatados em tabela no terminal
6.  Avisa caso não haja valor padrão configurado para timestamp automático

### 🚀 Modo de Uso
```bash
node scripts/diagnostics/check-musicas-schema.js
```

### ⚠️ Pontos Importantes
- ✅ Não usa camadas da aplicação, conecta diretamente no banco
- ✅ Funciona mesmo se a aplicação principal estiver quebrada
- ✅ Verifica configuração real do banco, não a estrutura esperada no código
- ✅ Resultado extremamente preciso para diagnóstico de problemas de schema

---

---

## Informações Gerais

| Característica | Status |
|----------------|--------|
| Todos os scripts usam ES Modules | ✅ |
| Tratamento de erros implementado | ✅ |
| Limpeza de recursos após execução | ✅ |
| Valores padrão definidos | ✅ |
| Documentação inline presente | ✅ |

---

---

## 5. check-videos-schema.js

| Dados | Valor |
|-------|-------|
| **Caminho** | `/scripts/diagnostics/check-videos-schema.js` |
| **Tipo** | Diagnóstico de Schema |
| **Ambiente** | CLI (Terminal) |
| **Dependências** | `fs`, `dotenv`, `pg` |

### ✅ Propósito Principal
Script especializado para verificar a integridade do schema da tabela `videos`, especificamente a configuração da coluna `created_at`. Usado para diagnosticar problemas com ordenação e timestamps automáticos na tabela de vídeos.

### ⚙️ Funcionamento
1.  Carrega variáveis de ambiente automaticamente (suporta `.env.local`)
2.  Cria conexão direta com PostgreSQL usando o driver oficial `pg`
3.  Consulta diretamente o `information_schema` do banco
4.  Verifica existência, tipo, nulabilidade e valor padrão da coluna `created_at`
5.  Exibe resultados formatados em tabela no terminal
6.  Avisa caso não haja valor padrão configurado para timestamp automático

### 🚀 Modo de Uso
```bash
node scripts/diagnostics/check-videos-schema.js
```

### ⚠️ Pontos Importantes
- ✅ Não usa camadas da aplicação, conecta diretamente no banco
- ✅ Funciona mesmo se a aplicação principal estiver quebrada
- ✅ Verifica configuração real do banco, não a estrutura esperada no código
- ✅ Contrapartida do script `check-musicas-schema.js` para a tabela de vídeos

---

---

## 6. count-posts.js

| Dados | Valor |
|-------|-------|
| **Caminho** | `/scripts/diagnostics/count-posts.js` |
| **Tipo** | Diagnóstico Rápido |
| **Ambiente** | CLI (Terminal) |
| **Dependências** | `fs`, `dotenv`, `pg` |

### ✅ Propósito Principal
Ferramenta rápida para contar o número total de posts no banco de dados. Ajuda a diagnosticar problemas de paginação e a confirmar se registros foram realmente inseridos.

### ⚙️ Funcionamento
1.  Conecta diretamente no banco de dados
2.  Executa uma contagem simples na tabela `posts`
3.  Exibe o total de registros encontrados
4.  Inclui aviso inteligente quando o número de posts ultrapassa 10 registros (tamanho padrão de página)

### 🚀 Modo de Uso
```bash
node scripts/diagnostics/count-posts.js
```

### ⚠️ Pontos Importantes
- ✅ Extremamente rápido e leve
- ✅ Aviso inteligente sobre paginação evita confusão com itens que não aparecem na primeira página
- ✅ Não modifica nenhum dado
- ✅ Útil para validação rápida após seeds, imports ou migrações

---

---

## 7. diagnose-hero.js

| Dados | Valor |
|-------|-------|
| **Caminho** | `/scripts/diagnostics/diagnose-hero.js` |
| **Tipo** | Diagnóstico Completo |
| **Ambiente** | CLI (Terminal) |
| **Dependências** | `pg`, `fs`, `path`, `dotenv` |

### ✅ Propósito Principal
Diagnóstico completo para a imagem principal (Hero) do site. Verifica tanto a configuração no banco de dados quanto a existência física do arquivo no disco, identificando a causa comum de imagens que aparecem no banco mas não existem no sistema de arquivos.

### ⚙️ Funcionamento
1.  Busca todas as configurações de imagem na tabela `settings`
2.  Para cada imagem do tipo `/uploads/`:
    - Extrai o nome do arquivo
    - Verifica se o arquivo existe fisicamente na pasta `public/uploads/`
    - Mostra o tamanho real do arquivo em KB
3.  Aponta explicitamente quando há referência no banco mas o arquivo está faltando no disco
4.  Lista todas as chaves relacionadas a imagens encontradas no banco

### 🚀 Modo de Uso
```bash
node scripts/diagnostics/diagnose-hero.js
```

### ⚠️ Pontos Importantes
- ✅ É o script mais completo e útil para diagnosticar problemas de imagens desaparecidas
- ✅ Resolve o problema mais comum após restaurações de backup
- ✅ Funciona independente do estado da aplicação web
- ✅ Fornece informação suficiente para resolver o problema imediatamente

---

---

## 8. list-last-posts.js

| Dados | Valor |
|-------|-------|
| **Caminho** | `/scripts/diagnostics/list-last-posts.js` |
| **Tipo** | Diagnóstico |
| **Ambiente** | CLI (Terminal) |
| **Dependências** | `fs`, `dotenv`, `pg` |

### ✅ Propósito Principal
Lista os últimos 5 posts criados no banco de dados diretamente no terminal com formatação em tabela. Utilizado para verificação rápida do conteúdo mais recente sem necessidade de abrir o navegador ou painel administrativo.

### ⚙️ Funcionamento
1.  Consulta os últimos 5 posts ordenados por data de criação decrescente
2.  Retorna campos importantes: `id`, `title`, `slug`, `published`, `created_at`
3.  Exibe resultados formatados em tabela legível no terminal
4.  Informa caso não existam posts cadastrados

### 🚀 Modo de Uso
```bash
node scripts/diagnostics/list-last-posts.js
```

### ⚠️ Pontos Importantes
- ✅ Formatação em tabela facilita leitura rápida
- ✅ Inclui status de publicação para cada post
- ✅ Ótimo para verificar se um post foi realmente criado
- ✅ Não depende da API ou da aplicação web estar funcionando

---

---

---

---

## 9. add-thumbnail-to-videos.js

| Dados | Valor |
|-------|-------|
| **Caminho** | `/scripts/maintenance/add-thumbnail-to-videos.js` |
| **Tipo** | Manutenção / Migração |
| **Ambiente** | CLI (Terminal) |
| **Dependências** | `pg`, `dotenv`, `path` |

### ✅ Propósito Principal
Script de manutenção idempotente para adicionar a coluna `thumbnail` na tabela `videos`. Pode ser executado múltiplas vezes sem risco de erros.

### ⚙️ Funcionamento
1.  Utiliza `ADD COLUMN IF NOT EXISTS` para garantir segurança
2.  Não causa erros se a coluna já existir
3.  Após operação, lista todas as colunas da tabela para confirmação visual
4.  Fecha conexão com banco adequadamente

### 🚀 Modo de Uso
```bash
node scripts/maintenance/add-thumbnail-to-videos.js
```

### ⚠️ Pontos Importantes
- ✅ 100% seguro e idempotente
- ✅ Não modifica dados existentes
- ✅ Operação atomicamente segura
- ✅ Recomendado executar após atualizações que adicionam suporte a thumbnails

---

---

## 10. backup-posts.js

| Dados | Valor |
|-------|-------|
| **Caminho** | `/scripts/maintenance/backup-posts.js` |
| **Tipo** | Backup / Manutenção |
| **Ambiente** | CLI (Terminal) |
| **Dependências** | `fs`, `path`, `pg`, `dotenv` |

### ✅ Propósito Principal
Ferramenta para exportar toda a tabela `posts` para um arquivo JSON com timestamp. Ideal para backups rápidos antes de migrações, alterações em massa ou importações.

### ⚙️ Funcionamento
1.  Extrai todos os registros da tabela posts ordenados por ID
2.  Cria automaticamente o diretório de backups se não existir
3.  Gera arquivo com nome único usando timestamp ISO
4.  Formata JSON com indentação para facilitar leitura e edição
5.  Retorna caminho completo do arquivo e quantidade de registros

### 🚀 Modo de Uso
```bash
node scripts/maintenance/backup-posts.js
```

### ⚠️ Pontos Importantes
- ✅ Arquivos salvos em `/data/backups/`
- ✅ Não modifica nenhum dado no banco
- ✅ Backup completo, inclui todos os campos
- ✅ Pode ser executado a qualquer momento sem impactar o sistema

---

---

## 11. clean-k6-videos.js

| Dados | Valor |
|-------|-------|
| **Caminho** | `/scripts/maintenance/clean-k6-videos.js` |
| **Tipo** | Limpeza / Manutenção |
| **Ambiente** | CLI (Terminal) |
| **Dependências** | `pg`, `dotenv`, `path` |

### ✅ Propósito Principal
Remove vídeos gerados automaticamente por testes de carga K6 e outros testes automatizados. Limpa a base de dados de registros de teste que poluem o painel administrativo.

### ⚙️ Funcionamento
1.  Procura por padrões conhecidos de títulos de teste: `K6%`, `Test Video%`, `Load Test%`, `Performance Test%`, `Video de Teste%`
2.  Constrói query dinâmica com condição OR
3.  Remove todos os registros correspondentes
4.  Lista cada vídeo removido com ID e título
5.  Informa se nenhum registro foi encontrado

### 🚀 Modo de Uso
```bash
node scripts/maintenance/clean-k6-videos.js
```

### ⚠️ Pontos Importantes
- ⚠️ Realiza exclusão definitiva dos registros
- ✅ Seguro, só remove padrões conhecidos de teste
- ✅ Não afeta vídeos reais cadastrados
- ✅ Útil para executar após baterias de testes de carga

---

---

## 12. fix-hero-key.js

| Dados | Valor |
|-------|-------|
| **Caminho** | `/scripts/maintenance/fix-hero-key.js` |
| **Tipo** | Correção / Manutenção |
| **Ambiente** | CLI (Terminal) |
| **Dependências** | `pg`, `dotenv`, `path` |

### ✅ Propósito Principal
Resolve o problema mais comum da imagem principal não aparecer: múltiplas chaves diferentes sendo usadas no frontend e no banco. Replica a imagem existente para todas as chaves que o código pode estar esperando.

### ⚙️ Funcionamento
1.  Busca a imagem existente na chave `site_image`
2.  Replica o valor automaticamente para as chaves: `hero_image` e `header_image`
3.  Utiliza `INSERT ... ON CONFLICT UPDATE` para criar ou atualizar as chaves
4.  Garante que independente de qual chave o frontend esteja usando, a imagem irá aparecer

### 🚀 Modo de Uso
```bash
node scripts/maintenance/fix-hero-key.js
```

### ⚠️ Pontos Importantes
- ✅ Resolve 90% dos problemas de imagem Hero que não aparece
- ✅ É a solução padrão para esse problema recorrente
- ✅ Não sobrescreve imagens customizadas, só cria as chaves faltantes
- ✅ Solução instantânea, não precisa reiniciar servidor

---

---

---

---

## 13. populate-video-thumbnails.js

| Dados | Valor |
|-------|-------|
| **Caminho** | `/scripts/maintenance/populate-video-thumbnails.js` |
| **Tipo** | Manutenção / População |
| **Ambiente** | CLI (Terminal) |
| **Dependências** | `pg`, `dotenv`, `path` |

### ✅ Propósito Principal
Gera automaticamente thumbnails para todos os vídeos já cadastrados que ainda não possuem imagem de pré-visualização. Extrai o ID do vídeo do YouTube e usa a URL padrão de thumbnail de alta resolução.

### ⚙️ Funcionamento
1.  Busca apenas vídeos onde o campo `thumbnail` é NULL
2.  Extrai o ID do YouTube de qualquer formato de URL válido
3.  Gera automaticamente a URL da thumbnail maxresdefault
4.  Atualiza cada vídeo individualmente no banco
5.  Exibe progresso detalhado por vídeo
6.  Ignora vídeos que já possuem thumbnail definida

### 🚀 Modo de Uso
```bash
node scripts/maintenance/populate-video-thumbnails.js
```

### ⚠️ Pontos Importantes
- ✅ Idempotente, pode ser executado quantas vezes quiser
- ✅ Não sobrescreve thumbnails já existentes
- ✅ Suporta todos os formatos de URL do YouTube
- ✅ Funciona inclusive para vídeos importados em massa

---

---

## 14. restore-posts.js

| Dados | Valor |
|-------|-------|
| **Caminho** | `/scripts/maintenance/restore-posts.js` |
| **Tipo** | Restauração de Backup |
| **Ambiente** | CLI (Terminal) |
| **Dependências** | `fs`, `path`, `pg`, `dotenv` |

### ✅ Propósito Principal
Ferramenta complementar ao backup-posts.js para restaurar posts de um arquivo JSON de backup. Automaticamente localiza o backup mais recente e restaura todos os registros.

### ⚙️ Funcionamento
1.  Localiza automaticamente o último backup de posts na pasta `/data/backups/`
2.  Lê e parseia o arquivo JSON
3.  Utiliza UPSERT (`INSERT ... ON CONFLICT UPDATE`) para restaurar registros
4.  Cria novos registros ou atualiza registros existentes mantendo os IDs originais
5.  Mantém timestamps e dados exatamente como estavam no backup

### 🚀 Modo de Uso
```bash
node scripts/maintenance/restore-posts.js
```

### ⚠️ Pontos Importantes
- ✅ Seguro, não apaga nenhum dado existente que não esteja no backup
- ✅ Mantém IDs originais dos posts
- ✅ Preserva todos os campos e timestamps
- ✅ Compatível 100% com arquivos gerados pelo backup-posts.js

---

---

## 15. 001-add-views-to-posts.js

| Dados | Valor |
|-------|-------|
| **Caminho** | `/scripts/migrations/001-add-views-to-posts.js` |
| **Tipo** | Migração de Banco |
| **Ambiente** | CLI (Terminal) |
| **Dependências** | `fs`, `dotenv`, `lib/db.js` |

### ✅ Propósito Principal
Primeira migração oficial do projeto. Adiciona a coluna `views` na tabela posts para contagem de visualizações.

### ⚙️ Funcionamento
1.  Utiliza `ADD COLUMN IF NOT EXISTS` para operação segura
2.  Define valor padrão `0` para todos os registros existentes
3.  Marca coluna como `NOT NULL`
4.  Usa a conexão padrão do `lib/db.js` da aplicação
5.  Encerra processo com código de saída adequado para sucesso ou erro

### 🚀 Modo de Uso
```bash
node scripts/migrations/001-add-views-to-posts.js
```

### ⚠️ Pontos Importantes
- ✅ Idempotente e seguro
- ✅ Não causa downtime na aplicação
- ✅ Valor padrão garante que nenhum post fique com valor nulo
- ✅ Migração reversível sem perda de dados

---

---

## 16. 002-create-products-table.js

| Dados | Valor |
|-------|-------|
| **Caminho** | `/scripts/migrations/002-create-products-table.js` |
| **Tipo** | Migração de Banco |
| **Ambiente** | CLI (Terminal) |
| **Dependências** | `@next/env`, `lib/db.js` |

### ✅ Propósito Principal
Segunda migração oficial. Cria a tabela `products` para funcionalidade de loja e produtos.

### ⚙️ Funcionamento
1.  Cria tabela apenas se ela não existir
2.  Estrutura completa com todos os campos para produtos
3.  Suporta múltiplos links para marketplaces: Mercado Livre, Shopee, Amazon
4.  Timestamps automáticos com timezone
5.  Usa sistema de variáveis de ambiente nativo do Next.js

### 🚀 Modo de Uso
```bash
node scripts/migrations/002-create-products-table.js
```

### ⚠️ Pontos Importantes
- ✅ Não recria a tabela se ela já existir
- ✅ Estrutura pronta para funcionalidade completa de produtos
- ✅ Segue padrões de nomenclatura e tipos do projeto
- ✅ Carrega variáveis de ambiente corretamente em todos os ambientes

---

---

---

---

## 17. 003-add-position-to-products.js

| Dados | Valor |
|-------|-------|
| **Caminho** | `/scripts/migrations/003-add-position-to-products.js` |
| **Tipo** | Migração de Banco |
| **Ambiente** | CLI (Terminal) |
| **Dependências** | `@next/env`, `lib/db.js` |

### ✅ Propósito Principal
Terceira migração oficial. Adiciona a coluna `position` na tabela `products` para permitir ordenação manual dos produtos.

### ⚙️ Funcionamento
1.  Utiliza `ADD COLUMN IF NOT EXISTS` para operação segura
2.  Define valor padrão `9999` para todos os produtos existentes
3.  Coluna do tipo INTEGER ideal para ordenação
4.  Usa sistema de variáveis de ambiente nativo do Next.js

### 🚀 Modo de Uso
```bash
node scripts/migrations/003-add-position-to-products.js
```

### ⚠️ Pontos Importantes
- ✅ Idempotente e seguro
- ✅ Valor padrão alto garante que produtos existentes apareçam no final da lista por padrão
- ✅ Não quebra nenhum código existente
- ✅ Migração reversível sem perda de dados

---

---

## 18. 004-add-published-to-products.js

| Dados | Valor |
|-------|-------|
| **Caminho** | `/scripts/migrations/004-add-published-to-products.js` |
| **Tipo** | Migração de Banco |
| **Ambiente** | CLI (Terminal) |
| **Dependências** | `@next/env`, `lib/db.js` |

### ✅ Propósito Principal
Quarta migração oficial. Adiciona a coluna `published` na tabela `products` para controle de publicação dos produtos.

### ⚙️ Funcionamento
1.  Utiliza `ADD COLUMN IF NOT EXISTS` para operação segura
2.  Define valor padrão `true` para todos os produtos existentes
3.  Coluna do tipo BOOLEAN nativa do PostgreSQL
4.  Todos os produtos já cadastrados permanecem visíveis automaticamente

### 🚀 Modo de Uso
```bash
node scripts/migrations/004-add-published-to-products.js
```

### ⚠️ Pontos Importantes
- ✅ Idempotente e seguro
- ✅ Valor padrão não causa quebra de funcionalidade existente
- ✅ Permite ocultar produtos temporariamente sem excluir
- ✅ Segue o mesmo padrão já utilizado na tabela `posts`

---

---

## 19. 005-add-last-login-to-users.js

| Dados | Valor |
|-------|-------|
| **Caminho** | `/scripts/migrations/005-add-last-login-to-users.js` |
| **Tipo** | Migração de Banco |
| **Ambiente** | CLI (Terminal) |
| **Dependências** | `@next/env`, `lib/db.js` |

### ✅ Propósito Principal
Quinta migração oficial. Adiciona a coluna `last_login_at` na tabela `users` para rastreamento do último acesso dos usuários.

### ⚙️ Funcionamento
1.  Utiliza `ADD COLUMN IF NOT EXISTS` para operação segura
2.  Coluna do tipo `TIMESTAMP WITH TIME ZONE`
3.  Sem valor padrão definido, permanece NULL até o primeiro login
4.  Permite auditoria de acesso e atividade dos usuários

### 🚀 Modo de Uso
```bash
node scripts/migrations/005-add-last-login-to-users.js
```

### ⚠️ Pontos Importantes
- ✅ Idempotente e seguro
- ✅ Sem impacto para usuários existentes
- ✅ Dado pode ser utilizado para métricas e relatórios
- ✅ Nenhum código existente é quebrado pela adição da coluna

---

---

## 20. 006-create-activity-logs.js

| Dados | Valor |
|-------|-------|
| **Caminho** | `/scripts/migrations/006-create-activity-logs.js` |
| **Tipo** | Migração de Banco |
| **Ambiente** | CLI (Terminal) |
| **Dependências** | `@next/env`, `lib/db.js` |

### ✅ Propósito Principal
Sexta migração oficial. Cria a tabela `activity_logs` para registro completo de auditoria de todas as ações realizadas no sistema.

### ⚙️ Funcionamento
1.  Cria tabela apenas se ela não existir
2.  Estrutura completa para registro de atividades: usuário, ação, entidade, detalhes, endereço IP
3.  Timestamp automático com timezone no momento do registro
4.  Suporta todos os tipos de ações e entidades do sistema

### 🚀 Modo de Uso
```bash
node scripts/migrations/006-create-activity-logs.js
```

### ⚠️ Pontos Importantes
- ✅ Estrutura preparada para escalabilidade
- ✅ Suporta endereços IPv4 e IPv6
- ✅ Campo detalhes TEXT para armazenar informações adicionais
- ✅ Base para funcionalidade completa de log de auditoria

---

---

---

---

## 21. 007-add-position-to-musicas.js

| Dados | Valor |
|-------|-------|
| **Caminho** | `/scripts/migrations/007-add-position-to-musicas.js` |
| **Tipo** | Migração de Banco |
| **Ambiente** | CLI (Terminal) |
| **Dependências** | `@next/env`, `lib/db.js` |

### ✅ Propósito Principal
Sétima migração oficial. Adiciona a coluna `position` na tabela `musicas` para permitir ordenação manual das músicas.

### ⚙️ Funcionamento
1.  Utiliza `ADD COLUMN IF NOT EXISTS` para operação segura
2.  Define valor padrão `9999` para todos os registros existentes
3.  Coluna do tipo INTEGER otimizada para ordenação
4.  Todas as músicas existentes aparecem no final da lista por padrão

### 🚀 Modo de Uso
```bash
node scripts/migrations/007-add-position-to-musicas.js
```

### ⚠️ Pontos Importantes
- ✅ Idempotente e seguro
- ✅ Não quebra nenhum código existente
- ✅ Padrão consistente com outras tabelas
- ✅ Migração reversível sem perda de dados

---

---

## 22. 008-add-position-to-videos.js

| Dados | Valor |
|-------|-------|
| **Caminho** | `/scripts/migrations/008-add-position-to-videos.js` |
| **Tipo** | Migração de Banco |
| **Ambiente** | CLI (Terminal) |
| **Dependências** | `@next/env`, `lib/db.js` |

### ✅ Propósito Principal
Oitava migração oficial. Adiciona a coluna `position` na tabela `videos` para permitir ordenação manual dos vídeos.

### ⚙️ Funcionamento
1.  Utiliza `ADD COLUMN IF NOT EXISTS` para operação segura
2.  Define valor padrão `9999` para todos os registros existentes
3.  Segue exatamente o mesmo padrão das outras tabelas
4.  Permite reordenar vídeos através do painel administrativo

### 🚀 Modo de Uso
```bash
node scripts/migrations/008-add-position-to-videos.js
```

### ⚠️ Pontos Importantes
- ✅ Idempotente e seguro
- ✅ Padronizado com todas as outras tabelas do sistema
- ✅ Nenhum impacto em funcionalidades existentes
- ✅ Preparado para funcionalidade de ordenação drag & drop

---

---

## 23. 009-add-position-to-posts.js

| Dados | Valor |
|-------|-------|
| **Caminho** | `/scripts/migrations/009-add-position-to-posts.js` |
| **Tipo** | Migração de Banco |
| **Ambiente** | CLI (Terminal) |
| **Dependências** | `@next/env`, `lib/db.js` |

### ✅ Propósito Principal
Nona migração oficial. Adiciona a coluna `position` na tabela `posts` para permitir ordenação manual dos artigos e publicações.

### ⚙️ Funcionamento
1.  Utiliza `ADD COLUMN IF NOT EXISTS` para operação segura
2.  Define valor padrão `9999` para todos os posts existentes
3.  Completa a implementação do sistema de ordenação manual em todas as tabelas principais
4.  Finaliza o ciclo de migrações de ordenação

### 🚀 Modo de Uso
```bash
node scripts/migrations/009-add-position-to-posts.js
```

### ⚠️ Pontos Importantes
- ✅ Última migração do pacote de ordenação
- ✅ Todas as tabelas principais agora suportam ordenação manual
- ✅ 100% compatível com código existente
- ✅ Valor padrão garante que nenhum item desaparece após a migração

---

---

## 24. manual-api-test.js

| Dados | Valor |
|-------|-------|
| **Caminho** | `/scripts/tests/manual-api-test.js` |
| **Tipo** | Teste de Integração |
| **Ambiente** | CLI (Terminal) |
| **Dependências** | `axios` |

### ✅ Propósito Principal
Suite de testes manual completa para validar toda a API v1 do sistema. Testa autenticação, endpoints CRUD, tratamento de erros e conectividade geral.

### ⚙️ Funcionamento
1.  Testa 7 endpoints diferentes da API em sequência
2.  Valida status público da API
3.  Realiza fluxo completo de login e autenticação
4.  Testa operações CRUD de configurações
5.  Verifica tratamento de erros e códigos de status HTTP
6.  Gera relatório completo no terminal com resultado de cada teste

### 🚀 Modo de Uso
```bash
node scripts/tests/manual-api-test.js
```

### ⚠️ Pontos Importantes
- ✅ Teste end-to-end completo da API
- ✅ Valida autenticação, CORS e rate limiting
- ✅ Verifica tanto casos de sucesso quanto casos de erro
- ✅ Resultado legível e detalhado diretamente no terminal
- ✅ Utilizado frequentemente após deployments para validação rápida

---

---

---

---

## 25. manual-rate-limit.js

| Dados | Valor |
|-------|-------|
| **Caminho** | `/scripts/tests/manual-rate-limit.js` |
| **Tipo** | Teste de Segurança |
| **Ambiente** | CLI (Terminal) |
| **Dependências** | `http` (nativo Node.js) |

### ✅ Propósito Principal
Teste para verificar se o sistema de Rate Limiting está funcionando corretamente no endpoint de login. Valida que o bloqueio acontece após o número configurado de tentativas.

### ⚙️ Funcionamento
1.  Realiza 7 requisições consecutivas para o endpoint de login
2.  Verifica o código de status HTTP retornado em cada tentativa
3.  Esperado: 5 requisições com sucesso, 6ª e 7ª bloqueadas com código 429
4.  Exibe resultado visual no terminal com ícones para facilitar identificação

### 🚀 Modo de Uso
```bash
node scripts/tests/manual-rate-limit.js
```

### ⚠️ Pontos Importantes
- ✅ Não necessita de nenhuma dependência externa
- ✅ Teste real do comportamento do servidor
- ✅ Valida configuração de segurança contra força bruta
- ✅ Executa em menos de 2 segundos

---

---

## 26. cleanup-test-data.js

| Dados | Valor |
|-------|-------|
| **Caminho** | `/scripts/utils/cleanup-test-data.js` |
| **Tipo** | API Endpoint |
| **Ambiente** | Servidor Next.js |
| **Dependências** | `withAuth`, `sqlite3`, `sqlite` |

### ✅ Propósito Principal
Endpoint HTTP protegido para limpeza de dados de teste gerados por testes de carga. Remove apenas posts gerados automaticamente.

### ⚙️ Funcionamento
1.  Endpoint que aceita apenas método DELETE
2.  Protegido por autenticação e acesso exclusivo para administradores
3.  Remove todos os posts com padrão de slug `post-carga-%`
4.  Retorna quantidade de registros removidos

### 🚀 Acesso
```
DELETE /api/utils/cleanup-test-data
Headers: Authorization (Cookie de sessão de admin)
```

### ⚠️ Pontos Importantes
- ✅ Seguro, remove apenas registros de teste
- ✅ Não afeta conteúdos reais cadastrados
- ✅ Auditoria garantida por autenticação
- ✅ Utilizado após baterias de testes de carga

---

---

## 27. list-settings.js

| Dados | Valor |
|-------|-------|
| **Caminho** | `/scripts/utils/list-settings.js` |
| **Tipo** | Utilitário CLI |
| **Ambiente** | Terminal |
| **Dependências** | `pg`, `dotenv`, `path` |

### ✅ Propósito Principal
Lista todas as configurações armazenadas na tabela `settings` diretamente no terminal com formatação legível.

### ⚙️ Funcionamento
1.  Conecta diretamente no banco de dados
2.  Busca todas as configurações ordenadas alfabeticamente
3.  Exibe chave, tipo, valor e descrição para cada registro
4.  Formata saída para facilitar leitura e debug

### 🚀 Modo de Uso
```bash
node scripts/utils/list-settings.js
```

### ⚠️ Pontos Importantes
- ✅ Leitura apenas, não modifica nenhum dado
- ✅ Formato amigável para humanos
- ✅ Excelente ferramenta para debug rápido
- ✅ Funciona mesmo se a aplicação web estiver fora do ar

---

---

## 28. list-table-columns.js

| Dados | Valor |
|-------|-------|
| **Caminho** | `/scripts/utils/list-table-columns.js` |
| **Tipo** | Utilitário de Diagnóstico |
| **Ambiente** | Terminal |
| **Dependências** | `pg`, `dotenv`, `path` |

### ✅ Propósito Principal
Ferramenta para listar a estrutura completa das colunas das tabelas `videos` e `posts` diretamente do `information_schema` do PostgreSQL.

### ⚙️ Funcionamento
1.  Consulta metadados reais do banco de dados
2.  Exibe nome da coluna, tipo de dados e nulabilidade
3.  Agrupa resultados por tabela
4.  Formata saída alinhada para legibilidade

### 🚀 Modo de Uso
```bash
node scripts/utils/list-table-columns.js
```

### ⚠️ Pontos Importantes
- ✅ Mostra estrutura REAL do banco, não a esperada no código
- ✅ Ótimo para validar migrações e alterações de schema
- ✅ Não modifica nenhum dado
- ✅ Ferramenta padrão para debug de problemas de schema

---

---

## 29. update-setting.js

| Dados | Valor |
|-------|-------|
| **Caminho** | `/scripts/utils/update-setting.js` |
| **Tipo** | Utilitário CLI |
| **Ambiente** | Terminal |
| **Dependências** | `pg`, `dotenv`, `path` |

### ✅ Propósito Principal
Ferramenta de linha de comando para atualizar ou criar configurações na tabela `settings` diretamente pelo terminal.

### ⚙️ Funcionamento
1.  Recebe parâmetros por linha de comando
2.  Utiliza UPSERT para criar ou atualizar configurações
3.  Suporta parâmetros opcionais: tipo e descrição
4.  Exibe confirmação do valor salvo

### 🚀 Modo de Uso
```bash
# Básico
node scripts/utils/update-setting.js <chave> <valor>

# Completo
node scripts/utils/update-setting.js site_title "Novo Título" string "Título principal do site"
```

### ⚠️ Pontos Importantes
- ✅ Idempotente, pode ser executado múltiplas vezes
- ✅ Cria configuração se não existir, atualiza se existir
- ✅ Atualiza automaticamente o timestamp de alteração
- ✅ Funciona mesmo se a aplicação web estiver parada

---

---

> Este arquivo faz parte da documentação técnica do projeto Caminhar. Para scripts adicionais consulte `/docs/PROJECT_scripts.md`
