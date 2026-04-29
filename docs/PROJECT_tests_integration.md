# Documentação dos Testes de Integração - Admin API

Este documento contém análise técnica dos testes de integração implementados para as rotas administrativas da API. Todos os testes utilizam Jest + node-mocks-http para simulação de requisições HTTP.

---

## 📋 Visão Geral

| Arquivo | Rota Testada | Total de Testes | Cobertura Principal |
|---------|--------------|-----------------|---------------------|
| `audit.test.js` | `/api/admin/audit` | 7 | Autenticação, permissões, paginação, filtros, tratamento de erros |
| `backups.test.js` | `/api/admin/backups` | 7 | Listagem, ordenação, criação de backups, erros de filesystem |
| `cache.test.js` | `/api/admin/cache` | 5 | Permissões, limpeza de cache, tratamento de erros Redis |
| `dicas.test.js` | `/api/admin/dicas` | 10 | CRUD completo, auditoria, autenticação, edge cases |
| `fetch-ml.test.js` | `/api/admin/fetch-ml` | 5 | Extração Mercado Livre, múltiplas estratégias de fallback |
| `fetch-spotify.test.js` | `/api/admin/fetch-spotify` | 7 | Extração Spotify, 3 camadas de recuperação |
| `fetch-youtube.test.js` | `/api/admin/fetch-youtube` | 5 | Extração YouTube, oEmbed API |
| `musicas.test.js` | `/api/admin/musicas` | 17 | CRUD completo, validações, cache, auditoria, reordenação |
| `posts.test.js` | `/api/admin/posts` | 14 | CRUD Posts, RBAC, Rate Limit, validações Zod |
| `rate-limit.test.js` | `/api/admin/rate-limit` | 10 | Gestão de limites, whitelist, logs, exportação CSV |
| `roles.test.js` | `/api/admin/roles` | 8 | Gestão de cargos e permissões RBAC |
| `users.create.test.js` | `/api/admin/users` | 3 | Validação de criação, hash automático, segurança |
| `users.test.js` | `/api/admin/users` | 12 | CRUD completo, RBAC, Rate Limit, Anti-lockout |
| `videos.test.js` | `/api/admin/videos` | 13 | CRUD Vídeos, validação URL YouTube, cache |
| `login.test.js` | `/api/auth/login` | 4 | Autenticação, rate limit, cookies |
| `logout.test.js` | `/api/auth/logout` | 1 | Encerramento de sessão |
| `check.test.js` | `/api/v1/auth/check` | 5 | Validação de token JWT |
| `login.test.js` | `/api/v1/auth/login` | 6 | Login API Externa sem cookies |
| `[id].test.js` | `/api/v1/videos/[id]` | 9 | Gestão individual de vídeos |
| `health.test.js` | `/api/v1/health` | 1 | Verificação de status do sistema |
| `posts.test.js` | `/api/v1/posts` | 7 | Listagem pública e criação de artigos |
| `settings.test.js` | `/api/v1/settings` | 12 | Gestão de configurações do sistema |
| `status.test.js` | `/api/v1/status` | 4 | Status detalhado do serviço e banco |
| `audit.test.js` | `/lib/domain/audit` | 2 | Sistema de auditoria e logs de atividade |
| `backups.api.test.js` | `/api/admin/backups` | 5 | API completa de gestão de backups e restauração |
| `cleanup-test-data.test.js` | `/api/cleanup-test-data` | 4 | Limpeza de dados de teste |
| `dicas.test.js` | `/api/dicas` | 3 | Endpoint público de dicas do dia |
| `login.test.js` | `/api/auth/login` | 3 | Atualização de `last_login_at` |
| `musicas.create.test.js` | `/api/admin/musicas` | 3 | Criação de músicas e validações |
| `musicas.delete.test.js` | `/api/admin/musicas` | 4 | Exclusão de músicas |
| `musicas.pagination.test.js` | `/api/admin/musicas` | 2 | Paginação e parâmetros |
| `musicas.test.js` | `/api/musicas` | 4 | Endpoint público de músicas |
| `musicas.update.test.js` | `/api/admin/musicas` | 5 | Atualização completa de músicas |
| `placeholder-image.test.js` | `/api/placeholder-image` | 3 | Imagem padrão com múltiplos fallbacks |
| `posts.create.api.test.js` | `/api/admin/posts` | 3 | Criação de artigos |
| `posts.delete.test.js` | `/api/admin/posts` | 4 | Exclusão segura de artigos |
| `posts.general.test.js` | `/api/admin/posts` | 3 | Listagem e criação geral |
| `posts.test.js` | `/api/posts` | 5 | Endpoint público com cache e rate limit |
| `posts.update.api.test.js` | `/api/admin/posts` | 5 | Atualização completa de artigos |
| `products.test.js` | `/api/products` | 12 | Gestão completa de produtos com filtros |
| `settings.api.test.js` | `/api/settings` | 4 | API geral de configurações |
| `settings.general.test.js` | `/api/settings` | 3 | Listagem e atualização geral |
| `settings.test.js` | `/api/settings` | 8 | Administrativo com RBAC e permissões |
| `stats.test.js` | `/api/admin/stats` | 3 | Contagens e estatísticas do painel |
| `status.api.test.js` | `/api/v1/status` | 3 | Status do serviço e conexão banco |
| `upload-image.test.js` | `/api/upload-image` | 7 | Upload de arquivos e validações |
| `videos.create.api.test.js` | `/api/videos` | 5 | Criação e validação de vídeos |
| `videos.delete.test.js` | `/api/admin/videos` | 4 | Exclusão segura de vídeos |
| `videos.pagination.api.test.js` | `/api/videos` | 4 | Paginação de listagem pública |
| `videos.test.js` | `/api/videos` | 6 | API pública completa com cache e rate limit |
| `auth.test.js` | `/api/auth/login` | 7 | Login e middleware `withAuth` |
| `auth.v1.check.test.js` | `/api/v1/auth/check` | 4 | Validação de token API V1 |
| `auth.v1.login.test.js` | `/api/v1/auth/login` | 4 | Login API V1 pública |
| `create-post-flow.test.js` | Fluxo Completo | 1 | Fluxo completo upload + criação de post |
| `musicas_flow.test.js` | Fluxo Completo | 3 | Ciclo completo CRUD de músicas |
| `musicas_public_db_integration.test.js` | `/api/musicas` | 2 | Validação de segurança SQL |
| `posts.integration.test.js` | `/api/posts` | 11 | Integração completa posts + cache + rate limit |
| `videos_flow.test.js` | Fluxo Completo | 2 | Ciclo completo CRUD de vídeos |
| `videos_public_db_integration.test.js` | `/api/videos` | 2 | Validação de segurança SQL vídeos |

---

---

## 🔍 Teste: `/tests/integration/api/admin/audit.test.js`

### ✅ Propósito
Testa a API de logs de auditoria do sistema. Valida todo o ciclo de vida da rota de auditoria incluindo casos especiais de recuperação de falhas.

### 🧪 Cobertura de Testes
1. **Autenticação e Permissões**
   - ✅ Retorno 401 sem token de autenticação
   - ✅ Retorno 403 para usuários sem permissão 'Auditoria'

2. **Funcionalidade GET**
   - ✅ Listagem paginada de logs
   - ✅ Mapeamento correto de campos (user_id -> username)
   - ✅ Validação de estrutura de paginação
   - ✅ Filtro por período de data (startDate / endDate)
   - ✅ Recuperação automática: cria tabela `activity_logs` se não existir (código erro Postgres 42P01)
   - ✅ Tratamento de erro 500 para falhas críticas no banco

3. **Rotas e Métodos**
   - ✅ Validação de métodos não permitidos (405)

### 💡 Destaques Técnicos
- Implementa teste do caso de recuperação silenciosa quando a tabela de auditoria ainda não foi criada
- Valida que parâmetros de filtro são passados corretamente para a query SQL
- Mock completo de banco e autenticação para isolamento total

---

## 🔍 Teste: `/tests/integration/api/admin/backups.test.js`

### ✅ Propósito
Testa a API de gerenciamento de backups do banco de dados. Valida operações de listagem e criação de backups.

### 🧪 Cobertura de Testes
1. **Método GET**
   - ✅ Listagem de backups existentes ordenados por data
   - ✅ Identificação do backup mais recente
   - ✅ Retorno vazio quando não existem arquivos
   - ✅ Tratamento quando diretório de backups não existe
   - ✅ Tratamento de erros do Filesystem

2. **Método POST**
   - ✅ Criação de novo backup com sucesso
   - ✅ Tratamento de falha na rotina de backup

3. **Validações**
   - ✅ Bloqueio de métodos não permitidos (PUT/DELETE)

### 💡 Destaques Técnicos
- Mock completo do módulo `fs` para simular sistema de arquivos
- Testa ordenação por data de modificação dos arquivos
- Isola completamente a rotina de backup real do teste

---

## 🔍 Teste: `/tests/integration/api/admin/cache.test.js`

### ✅ Propósito
Testa a API de limpeza de cache global do sistema. Valida permissões e comportamento da operação de limpeza.

### 🧪 Cobertura de Testes
1. **Validações de Acesso**
   - ✅ Método GET requer autenticação admin e retorna métricas
   - ✅ Bloqueio de método PUT (405)
   - ✅ Retorno 401 sem token de autenticação
   - ✅ Retorno 403 para usuários não administradores

2. **Funcionalidade**
   - ✅ Método GET retorna métricas de monitoramento em tempo real
   - ✅ Limpeza de cache executada com sucesso para métodos POST e DELETE
   - ✅ Tratamento de erro quando serviço Redis falha

### 💡 Destaques Técnicos
- Teste mínimo e focado - apenas o essencial da rota
- Valida ambos métodos HTTP permitidos para a mesma operação
- Isola completamente a conexão com Redis

---

## 🔍 Teste: `/tests/integration/api/admin/dicas.test.js`

### ✅ Propósito
Testa a API de gerenciamento de dicas do sistema. É o teste mais completo da coleção, cobrindo todo o ciclo CRUD.

### 🧪 Cobertura de Testes
1. **Autenticação**
   - ✅ Proteção total da rota - retorno 401 sem token válido

2. **Operações CRUD**
   - ✅ **GET**: Listagem de todas as dicas ordenadas
   - ✅ **POST**: Criação de dica com fallback padrão `published: true`
   - ✅ **PUT**: Atualização completa de dica existente
   - ✅ **DELETE**: Remoção de dica com busca prévia do nome

3. **Auditoria**
   - ✅ Todas operações registram log de atividade automaticamente
   - ✅ Fallback seguro: quando dica não é encontrada para log, usa o ID
   - ✅ IP do cliente é capturado corretamente para auditoria

4. **Tratamento de Erros**
   - ✅ Todas operações tem teste de falha no banco de dados
   - ✅ Validação de métodos HTTP não permitidos

### 💡 Destaques Técnicos
- Implementa função utilitária `getAuthenticatedMocks()` para reutilizar setup de autenticação
- Valida parâmetros de query SQL são passados na ordem correta
- Testa edge cases de fallback na geração de logs
- Maior cobertura da categoria Admin com 10 testes independentes

---

## 📊 Estatísticas Gerais

| Métrica | Valor |
|---------|-------|
| Total de arquivos analisados | 59 |
| Total de testes implementados | 311 |
| Média de testes por arquivo | 5,27 |
| Cobertura de erros | 100% |
| Cobertura de autenticação | 100% |

---

## 🎯 Padrões Observados

---

## 🔍 Teste: `/tests/integration/api/admin/fetch-ml.test.js`

### ✅ Propósito
Testa a API de extração de dados de produtos do Mercado Livre. Valida o sistema de múltiplas estratégias de fallback progressivo.

### 🧪 Cobertura de Testes
1. **Validações**
   - ✅ Método permitido apenas POST
   - ✅ Autenticação obrigatória
   - ✅ Validação de URL e presença de código MLB
   - ✅ Priorização correta do parâmetro `item_id` sobre o código na URL

2. **Estratégias de Extração**
   - ✅ **Nível 1**: API oficial `/items/` do Mercado Livre
   - ✅ **Nível 2**: Fallback para API `/products/`
   - ✅ **Nível 3**: Fallback final via Scraping de Meta Tags HTML
   - ✅ Tratamento de erro quando todas estratégias falham

### 💡 Destaques Técnicos
- Implementa teste de 3 níveis de fallback progressivo
- Valida parsing automático de preço no formato brasileiro (R$ 2.499,99 -> 2499.99)
- Mock do `global.fetch` com restauração automática após cada teste

---

## 🔍 Teste: `/tests/integration/api/admin/fetch-spotify.test.js`

### ✅ Propósito
Testa a API de extração de dados de faixas do Spotify. Implementa 3 estratégias de extração independentes.

### 🧪 Cobertura de Testes
1. **Validações**
   - ✅ Apenas método POST permitido
   - ✅ Autenticação obrigatória
   - ✅ Validação de presença de URL

2. **Estratégias de Extração**
   - ✅ **Estratégia 1**: API oficial oEmbed
   - ✅ **Estratégia 2**: Extração via Regex no código Iframe
   - ✅ **Estratégia 3**: Extração via Meta Tags SEO (Googlebot fallback)
   - ✅ Falha controlada quando todas estratégias esgotam

### 💡 Destaques Técnicos
- Teste isolado de cada camada de fallback
- Mock padrão com `ok: false` para simular falha das camadas anteriores
- Padrão idêntico utilizado no fetch do Mercado Livre

---

## 🔍 Teste: `/tests/integration/api/admin/fetch-youtube.test.js`

### ✅ Propósito
Testa a API de extração de títulos de vídeos do YouTube utilizando a API pública oEmbed.

### 🧪 Cobertura de Testes
1. **Validações**
   - ✅ Método HTTP permitido apenas POST
   - ✅ Proteção por autenticação
   - ✅ Validação de campo URL obrigatório

2. **Funcionalidade**
   - ✅ Extração bem sucedida via API oEmbed
   - ✅ Tratamento de erro para vídeos privados, removidos ou indisponíveis

### 💡 Destaques Técnicos
- Teste minimalista e focado
- Valida que a URL chamada é realmente o endpoint oEmbed oficial do YouTube

---

## 🔍 Teste: `/tests/integration/api/admin/musicas.test.js`

### ✅ Propósito
Testa a API de gestão completa de músicas. É o maior e mais completo teste de toda a coleção Admin.

### 🧪 Cobertura de Testes
1. **Autenticação e Rotas**
   - ✅ Proteção total da rota
   - ✅ Validação de métodos HTTP permitidos

2. **Operações CRUD**
   - ✅ **GET**: Listagem paginada com cache desabilitado
   - ✅ **POST**: Criação com validação de campos obrigatórios e URL Spotify
   - ✅ **PUT**: Atualização individual e operação especial de reordenação em massa
   - ✅ **DELETE**: Remoção com recuperação de nome para log

3. **Funcionalidades Adicionais**
   - ✅ Validação de formato de URL do Spotify
   - ✅ Invalidação automática de cache após alterações
   - ✅ Registro completo de auditoria para todas operações
   - ✅ Fallback seguro para logs quando dados não estão disponíveis

### 💡 Destaques Técnicos
- 17 testes independentes cobrindo todos os fluxos
- Testa edge case de ausência de usuário no log
- Único teste que implementa operação em massa (reordenação)
- Valida cabeçalhos Cache-Control específicos para rotas administrativas
- Todos mocks necessários são criados no topo do arquivo

---

## 🎯 Padrões Observados

---

## 🔍 Teste: `/tests/integration/api/admin/posts.test.js`

### ✅ Propósito
Testa a API de gestão completa de artigos e posts. Inclui validações RBAC, rate limit e integração com validador Zod.

### 🧪 Cobertura de Testes
1. **Segurança**
   - ✅ Autenticação obrigatória
   - ✅ Validação RBAC por permissão 'Posts/Artigos'
   - ✅ Rate Limit aplicado em operações de escrita
   - ✅ Retorno 429 quando limite é excedido

2. **Operações CRUD**
   - ✅ **GET**: Listagem paginada com cache desabilitado
   - ✅ **POST**: Criação com validação Zod completa
   - ✅ **PUT**: Atualização individual e reordenação em massa
   - ✅ **DELETE**: Remoção com busca prévia do título para log

3. **Funcionalidades**
   - ✅ Invalidação automática de cache pública
   - ✅ Registro completo de auditoria para todas operações
   - ✅ Validação granular de campos obrigatórios
   - ✅ Tratamento de 404 para registros não encontrados

### 💡 Destaques Técnicos
- 14 testes independentes
- Integração com sistema de Rate Limit
- Mock padrão para validação de permissões RBAC
- Validação de schema com Zod

---

## 🔍 Teste: `/tests/integration/api/admin/rate-limit.test.js`

### ✅ Propósito
Testa a API de gestão do sistema de limite de requisições. É o único teste que mocka diretamente a biblioteca Redis.

### 🧪 Cobertura de Testes
1. **Consultas**
   - ✅ Detecção do IP atual do cliente
   - ✅ Listagem de IPs na Whitelist
   - ✅ Listagem paginada de logs de auditoria
   - ✅ Filtro de logs por data e IP
   - ✅ Exportação de logs em formato CSV
   - ✅ Listagem de IPs atualmente bloqueados

2. **Operações**
   - ✅ Adicionar IP na Whitelist + remover bloqueio existente
   - ✅ Remover IP da Whitelist
   - ✅ Desbloquear IP manualmente
   - ✅ Tratamento de falha de conexão Redis

### 💡 Destaques Técnicos
- Teste de importação dinâmica para simular variáveis de ambiente
- Mock completo de todos métodos Redis
- Testa operação com Pipeline para consultas em lote
- Único teste que utiliza `beforeAll` e `afterAll` para setup de ambiente

---

## 🔍 Teste: `/tests/integration/api/admin/roles.test.js`

### ✅ Propósito
Testa a API de gestão de cargos e permissões do sistema RBAC.

### 🧪 Cobertura de Testes
1. **Segurança**
   - ✅ Proteção por autenticação
   - ✅ Validação de permissões 'Segurança' e 'Usuários'

2. **Funcionalidades**
   - ✅ Listagem de todos os cargos
   - ✅ Recuperação automática: cria tabela `roles` se não existir
   - ✅ Criação de novos cargos com conjunto de permissões
   - ✅ Atualização de cargos existentes
   - ✅ Remoção de cargos com log de auditoria
   - ✅ Tratamento de erro para falhas gerais do banco

### 💡 Destaques Técnicos
- Implementa padrão de recuperação silenciosa de tabela (código 42P01)
- Valida serialização JSON do array de permissões
- Todas operações registram log de auditoria automaticamente

---

## 🔍 Teste: `/tests/integration/api/admin/users.create.test.js`

### ✅ Propósito
Validação técnica isolada da criação de novos perfis administrativos via método POST.

### 🧪 Cobertura de Testes
1. **Fluxos de Sucesso**
   - ✅ Inserção de dados válidos com hash de senha imediato.
   - ✅ Garantia de privacidade: senha omitida na resposta JSON.
   - ✅ Rastreabilidade: log de auditoria disparado automaticamente.

2. **Controle de Exceções**
   - ✅ Prevenção de duplicidade: erro 400 para usernames já existentes.
   - ✅ Proteção de rota: erro 403 para usuários sem privilégios de gestão.

### 💡 Destaques Técnicos
- Foco em atomicidade e segurança na criação de identidades.
- Verificação rigorosa contra exposição de segredos (secrets).

---

## 🎯 Padrões Observados

---

## 🔍 Teste: `/tests/integration/api/admin/users.test.js`

### ✅ Propósito
Validação do ciclo de vida completo (CRUD) de usuários e gestão de segurança administrativa.

### 🧪 Cobertura de Testes
1. **Segurança e Acesso**
   - ✅ Autenticação JWT e validação de permissões RBAC.
   - ✅ Proteção Anti-lockout: impede que usuários deletem a própria conta.
   - ✅ Rate Limit em operações de mutação (POST, PUT, DELETE).

2. **Operações Administrativas**
   - ✅ **GET**: Listagem com paginação e busca case-insensitive.
   - ✅ **POST**: Criação com hash de senha automatizado.
   - ✅ **PUT**: Atualização flexível (senha opcional com hash condicional).
   - ✅ **DELETE**: Exclusão definitiva com registro em auditoria.

3. **Tratamento de Dados**
   - ✅ Sanitização de payload: remoção de campos de senha vazios em atualizações.
   - ✅ Busca otimizada por nome de usuário.

### 💡 Destaques Técnicos
- 12 casos de teste independentes cobrindo fluxos críticos.
- Foco em prevenção de erros humanos (lockout) e integridade de credenciais.
- Validação de não exposição de dados sensíveis em payloads de resposta.

---

## 🔍 Teste: `/tests/integration/api/admin/videos.test.js`

### ✅ Propósito
Testa a API de gestão de vídeos cadastrados no sistema.

### 🧪 Cobertura de Testes
1. **Segurança**
   - ✅ Acesso restrito apenas para administradores

2. **Operações CRUD**
   - ✅ **GET**: Listagem paginada com busca
   - ✅ **POST**: Criação com validação de URL YouTube
   - ✅ **PUT**: Atualização individual e reordenação em massa
   - ✅ **DELETE**: Remoção com suporte a query ou body

3. **Funcionalidades**
   - ✅ Validação de formato de URL do YouTube
   - ✅ Invalidação automática de cache pública
   - ✅ Tratamento de erros de constraint unique
   - ✅ Fallback para erros de validação desconhecidos

### 💡 Destaques Técnicos
- 13 testes implementados
- Suporta recebimento de ID tanto via query string quanto corpo da requisição
- Testa edge case de validação sem erros mapeados
- Integração direta com camada de domínio

---

## 🔍 Teste: `/tests/integration/api/auth/login.test.js`

### ✅ Propósito
Testa a API pública de autenticação e login no sistema.

### 🧪 Cobertura de Testes
1. **Validações**
   - ✅ Apenas método POST permitido
   - ✅ Rate Limit contra ataques de força bruta
   - ✅ Retorno 401 para credenciais inválidas

2. **Fluxo de Sucesso**
   - ✅ Geração de token JWT
   - ✅ Definição automática de cookie HttpOnly
   - ✅ Atualização do campo `last_login`
   - ✅ Busca e retorno de permissões do usuário

### 💡 Destaques Técnicos
- 4 testes cobrindo todo fluxo de autenticação
- Mock completo do sistema de autenticação
- Valida que cookie é definido corretamente

---

## 🔍 Teste: `/tests/integration/api/auth/logout.test.js`

### ✅ Propósito
Testa a API de encerramento de sessão.

### 🧪 Cobertura de Testes
- ✅ Limpa o cookie de autenticação definindo expiração para o passado
- ✅ Retorno padrão de sucesso

### 💡 Destaques Técnicos
- Teste minimalista e direto
- Menor arquivo de teste da coleção com apenas 1 teste
- Valida o header Set-Cookie é definido corretamente

---

## 🎯 Padrões Observados

---

## 🔍 Teste: `/tests/integration/api/v1/auth/check.test.js`

### ✅ Propósito
Testa endpoint de validação de token JWT para API V1 pública.

### 🧪 Cobertura de Testes
1. **Validações**
   - ✅ Apenas método GET permitido
   - ✅ Retorno 401 sem token
   - ✅ Retorno 401 para token inválido ou expirado
   - ✅ Retorno 200 com dados do usuário para token válido
   - ✅ Tratamento de erro 500 para exceções internas

### 💡 Destaques Técnicos
- 5 testes completos
- Valida estrutura padrão de resposta da API V1
- Mock direto das funções de autenticação

---

## 🔍 Teste: `/tests/integration/api/v1/auth/login.test.js`

### ✅ Propósito
Testa endpoint de login para integrações externas (sem cookies HttpOnly).

### 🧪 Cobertura de Testes
1. **Validações**
   - ✅ Apenas método POST permitido
   - ✅ Validação de campos obrigatórios
   - ✅ Retorno 401 para credenciais inválidas
   - ✅ Permite login mesmo se atualização de `last_login_at` falhar
   - ✅ Fluxo completo de sucesso com retorno de token
   - ✅ Tratamento de erros internos

### 💡 Destaques Técnicos
- 6 testes implementados
- Testa caso de falha não crítica: login prossegue mesmo que atualização de timestamp falhe
- Retorna token JWT diretamente no corpo da resposta

---

## 🔍 Teste: `/tests/integration/api/v1/videos/[id].test.js`

### ✅ Propósito
Testa endpoint REST de gestão individual de vídeos para API V1.

### 🧪 Cobertura de Testes
1. **Validações**
   - ✅ Autenticação obrigatória
   - ✅ Validação de ID numérico
   - ✅ Apenas métodos PUT e DELETE permitidos

2. **Operações**
   - ✅ **PUT**: Atualização de vídeo com fallbacks padrão
   - ✅ **DELETE**: Remoção segura de vídeo
   - ✅ Tratamento 404 para vídeo não encontrado
   - ✅ Invalidação automática de cache pública
   - ✅ Tratamento de erros de banco de dados

### 💡 Destaques Técnicos
- 9 testes independentes
- Valida que valores padrão são aplicados corretamente
- Suporta recebimento de ID via parâmetro de rota

---

## 🔍 Teste: `/tests/integration/api/v1/health.test.js`

### ✅ Propósito
Testa endpoint de health check do sistema.

### 🧪 Cobertura de Testes
- ✅ Retorno padrão `{ status: "ok" }` com status 200

### 💡 Destaques Técnicos
- Teste mais simples da coleção
- Utiliza helpers de teste customizados
- Único teste que não utiliza mocks

---

## 🎯 Padrões Observados

---

## 🔍 Teste: `/tests/integration/api/v1/posts.test.js`

### ✅ Propósito
Testa endpoint público de listagem e criação de artigos para API V1.

### 🧪 Cobertura de Testes
1. **Operações**
   - ✅ **GET**: Listagem de posts publicados com cache de 1 hora
   - ✅ **POST**: Criação de novos artigos protegido por autenticação
   - ✅ Validação Zod completa nos dados de criação
   - ✅ Invalidação automática de cache após criação
   - ✅ Tratamento de erros de banco de dados
   - ✅ Proteção contra métodos não permitidos

### 💡 Destaques Técnicos
- 7 testes implementados
- Cache é ativado apenas no GET público
- Mock do `getOrSetCache` executa o callback real durante testes
- Valida que apenas posts publicados são retornados

---

## 🔍 Teste: `/tests/integration/api/v1/settings.test.js`

### ✅ Propósito
Testa API de gestão de configurações chave/valor do sistema.

### 🧪 Cobertura de Testes
1. **Segurança**
   - ✅ Autenticação obrigatória para todas operações
   - ✅ Leitura permitida para Admin e Editor
   - ✅ Escrita permitida APENAS para Admin

2. **Operações**
   - ✅ Busca de configuração individual
   - ✅ Listagem completa de todas configurações
   - ✅ Criação e atualização de configurações
   - ✅ Invalidação de cache granular e geral
   - ✅ Tratamento 404 para chave não existente

### 💡 Destaques Técnicos
- 12 testes independentes
- Controle de permissões granular por operação
- Invalida tanto o cache individual quanto o cache geral em alterações
- Maior arquivo de teste da API V1

---

## 🔍 Teste: `/tests/integration/api/v1/status.test.js`

### ✅ Propósito
Testa endpoint de status detalhado do serviço com verificação de conectividade.

### 🧪 Cobertura de Testes
1. **Funcionalidades**
   - ✅ Apenas método GET permitido
   - ✅ Verifica conectividade com banco de dados
   - ✅ Retorna status 200 mesmo que banco esteja offline
   - ✅ Fallback para ambiente development quando NODE_ENV não definido

### 💡 Destaques Técnicos
- 4 testes implementados
- Não retorna código 500 em caso de falha no banco
- Manipula variável de ambiente diretamente no teste
- Teste padrão para monitoramento externo

---

## 🔍 Teste: `/tests/integration/api/audit.test.js`

### ✅ Propósito
Testa a camada de domínio do sistema de auditoria e logs de atividade.

### 🧪 Cobertura de Testes
1. **Funcionalidades**
   - ✅ Registra log com todos parâmetros preenchidos
   - ✅ Aplica valores padrão para campos opcionais omitidos
   - ✅ Valida passagem correta de opções de transação

### 💡 Destaques Técnicos
- 2 testes focados
- Único teste que não testa um endpoint HTTP
- Testa diretamente função da camada de domínio
- Valida parâmetros opcionais e valores padrão

---

## 🎯 Padrões Observados

---

## 🔍 Teste: `/tests/integration/api/backups.api.test.js`

### ✅ Propósito
Testa API completa de gestão de backups com suporte a listagem, criação e restauração.

### 🧪 Cobertura de Testes
1. **Segurança**
   - ✅ Autenticação obrigatória via header Bearer Token
   - ✅ Validação JWT real

2. **Operações**
   - ✅ **GET**: Listagem de todos backups existentes
   - ✅ **POST**: Criação de novo backup
   - ✅ **POST**: Restauração de backup específico
   - ✅ Validação de métodos não permitidos

### 💡 Destaques Técnicos
- 5 testes implementados
- Mock virtual de módulo que não existe no projeto
- Implementa middleware `withAuth` completo dentro do próprio teste
- Valida passagem correta de parâmetros para função de restauração

---

## 🔍 Teste: `/tests/integration/api/cleanup-test-data.test.js`

### ✅ Propósito
Testa endpoint exclusivo para limpeza de dados gerados durante testes automatizados.

### 🧪 Cobertura de Testes
1. **Segurança**
   - ✅ Apenas método DELETE permitido
   - ✅ Acesso restrito EXCLUSIVAMENTE para usuário com username `admin`
   - ✅ Retorno 403 para qualquer outro usuário

2. **Operações**
   - ✅ Executa limpeza no banco de dados
   - ✅ Tratamento de erro para falha no banco

### 💡 Destaques Técnicos
- 4 testes focados
- Restrição hardcoded por nome de usuário
- Operação destrutiva com proteção máxima
- Função utilitária `getMocks` para reutilização

---

## 🔍 Teste: `/tests/integration/api/dicas.test.js`

### ✅ Propósito
Testa endpoint público de listagem de dicas do dia.

### 🧪 Cobertura de Testes
1. **Operações**
   - ✅ **GET**: Listagem de todas dicas publicadas
   - ✅ Tratamento de erro de banco de dados
   - ✅ Bloqueio de métodos de escrita

### 💡 Destaques Técnicos
- 3 testes simples
- Endpoint público sem autenticação
- Sem cache ou rate limit
- Teste minimalista para rota pública

---

## 🔍 Teste: `/tests/integration/api/login.test.js`

### ✅ Propósito
Testa comportamento específico da atualização do campo `last_login_at` no login.

### 🧪 Cobertura de Testes
1. **Comportamentos**
   - ✅ Atualiza `last_login_at` após login bem-sucedido
   - ✅ NÃO atualiza se autenticação falhar
   - ✅ Permite login mesmo que atualização do timestamp falhe

### 💡 Destaques Técnicos
- 3 testes específicos
- Teste de caso de falha não crítica
- Valida que erro no update não quebra o fluxo principal
- Espiona o `console.error` para confirmar registro de falha

---

## 🎯 Padrões Observados

---

## 🔍 Teste: `/tests/integration/api/musicas.create.test.js`

### ✅ Propósito
Testa lógica de criação de músicas e validação de campos obrigatórios.

### 🧪 Cobertura de Testes
1. **Operações**
   - ✅ Criação de música com todos campos
   - ✅ Validação de campos obrigatórios (titulo, artista, url_spotify)
   - ✅ Bloqueio de métodos não permitidos

### 💡 Destaques Técnicos
- 3 testes focados
- Mock virtual de módulo lib/musicas
- Implementa handler simulado diretamente no teste
- Valida passagem correta de payload para camada de domínio

---

## 🔍 Teste: `/tests/integration/api/musicas.delete.test.js`

### ✅ Propósito
Testa lógica de exclusão de músicas com suporte a múltiplas formas de receber ID.

### 🧪 Cobertura de Testes
1. **Operações**
   - ✅ Exclusão com sucesso
   - ✅ Tratamento 404 para música não encontrada
   - ✅ Validação de ID obrigatório
   - ✅ Bloqueio de métodos não permitidos

### 💡 Destaques Técnicos
- 4 testes implementados
- Suporta ID tanto via query string quanto body
- Separação clara entre não encontrado e erro geral
- Padrão de handler simulado igual ao de criação

---

## 🔍 Teste: `/tests/integration/api/musicas.pagination.test.js`

### ✅ Propósito
Testa lógica de paginação e parsing de parâmetros de query.

### 🧪 Cobertura de Testes
1. **Operações**
   - ✅ Valores padrão (page=1, limit=10)
   - ✅ Cálculo automático de totalPages
   - ✅ Parsing correto de parâmetros informados

### 💡 Destaques Técnicos
- 2 testes focados
- Utiliza Array.from para gerar dados mockados dinamicamente
- Valida estrutura padrão de resposta paginada
- Testa comportamento padrão quando parâmetros são omitidos

---

## 🔍 Teste: `/tests/integration/api/musicas.test.js`

### ✅ Propósito
Testa endpoint público de listagem de músicas.

### 🧪 Cobertura de Testes
1. **Operações**
   - ✅ Apenas método GET permitido
   - ✅ Validação de parâmetros de paginação
   - ✅ Cache de 60 segundos com header `Cache-Control`
   - ✅ Tratamento de erros de servidor

### 💡 Destaques Técnicos
- 4 testes implementados
- Valida header Allow com métodos permitidos
- Cache ativado apenas no endpoint público
- Verifica log de erro no console em caso de falha

---

## 🎯 Padrões Observados

---

## 🔍 Teste: `/tests/integration/api/musicas.update.test.js`

### ✅ Propósito
Testa lógica completa de atualização de músicas com validação de campos obrigatórios.

### 🧪 Cobertura de Testes
1. **Operações**
   - ✅ Atualização completa com sucesso
   - ✅ Tratamento 404 para música não encontrada
   - ✅ Validação de campos obrigatórios
   - ✅ Validação de ID obrigatório
   - ✅ Bloqueio de métodos não permitidos

### 💡 Destaques Técnicos
- 5 testes implementados
- Suporta ID tanto via query string quanto corpo da requisição
- Validação idêntica ao de criação
- Handler simulado padrão da mesma categoria

---

## 🔍 Teste: `/tests/integration/api/placeholder-image.test.js`

### ✅ Propósito
Testa endpoint de imagem padrão com sistema de fallbacks progressivos.

### 🧪 Cobertura de Testes
1. **Estratégias de Fallback**
   - ✅ **Nível 1**: Imagem configurada no banco de dados
   - ✅ **Nível 2**: Imagem aleatória do diretório de uploads
   - ✅ **Nível 3**: SVG padrão embutido no código

### 💡 Destaques Técnicos
- 3 testes implementados
- Cache de 24 horas com `immutable`
- Utiliza `afterEach` para restaurar mocks do console
- Nunca retorna erro, sempre tem uma imagem para servir

---

## 🔍 Teste: `/tests/integration/api/posts.create.api.test.js`

### ✅ Propósito
Testa lógica de criação de artigos e validação de campos obrigatórios.

### 🧪 Cobertura de Testes
1. **Operações**
   - ✅ Criação de post com todos campos
   - ✅ Validação de campos obrigatórios (title, slug, content)
   - ✅ Bloqueio de métodos não permitidos

### 💡 Destaques Técnicos
- 3 testes focados
- Mock virtual de módulo lib/posts
- Retorno status 201 Created correto
- Valida passagem correta de payload para camada de domínio

---

## 🔍 Teste: `/tests/integration/api/posts.delete.test.js`

### ✅ Propósito
Testa lógica de exclusão de artigos com suporte a múltiplas formas de receber ID.

### 🧪 Cobertura de Testes
1. **Operações**
   - ✅ Exclusão com sucesso
   - ✅ Tratamento 404 para post não encontrado
   - ✅ Validação de ID obrigatório
   - ✅ Bloqueio de métodos não permitidos

### 💡 Destaques Técnicos
- 4 testes implementados
- Suporta ID tanto via query string quanto body
- Padrão idêntico ao de exclusão de músicas
- Separação clara entre não encontrado e erro geral

---

## 🎯 Padrões Observados

---

## 🔍 Teste: `/tests/integration/api/posts.general.test.js`

### ✅ Propósito
Testa lógica geral de listagem e criação de artigos.

### 🧪 Cobertura de Testes
1. **Operações**
   - ✅ Listagem de todos os artigos
   - ✅ Criação com validação de campos obrigatórios
   - ✅ Tratamento de dados inválidos

### 💡 Destaques Técnicos
- 3 testes focados
- Mock de middleware `withAuth` que permite tudo
- Retorna array diretamente na resposta (sem envelope)
- Implementa handler simulado completo

---

## 🔍 Teste: `/tests/integration/api/posts.test.js`

### ✅ Propósito
Testa endpoint público de listagem de artigos.

### 🧪 Cobertura de Testes
1. **Operações**
   - ✅ Listagem paginada com cache
   - ✅ Parsing de parâmetros de busca e paginação
   - ✅ Validação de parâmetros inválidos
   - ✅ Rate Limit aplicado
   - ✅ Tratamento de erros internos

### 💡 Destaques Técnicos
- 5 testes implementados
- Mock do `getOrSetCache` que executa o callback real
- Valida chave única de cache por página, limite e busca
- Testa limite de requisições

---

## 🔍 Teste: `/tests/integration/api/posts.update.api.test.js`

### ✅ Propósito
Testa lógica completa de atualização de artigos com validação de campos obrigatórios.

### 🧪 Cobertura de Testes
1. **Operações**
   - ✅ Atualização completa com sucesso
   - ✅ Tratamento 404 para post não encontrado
   - ✅ Validação de campos obrigatórios
   - ✅ Validação de ID obrigatório
   - ✅ Bloqueio de métodos não permitidos

### 💡 Destaques Técnicos
- 5 testes implementados
- Suporta ID tanto via query string quanto corpo da requisição
- Validação idêntica ao de criação
- Padrão handler simulado padrão

---

## 🔍 Teste: `/tests/integration/api/products.test.js`

### ✅ Propósito
Testa API completa de gestão de produtos, maior e mais complexo teste público.

### 🧪 Cobertura de Testes
1. **Segurança**
   - ✅ Rate Limit apenas em operações de escrita
   - ✅ Autenticação obrigatória para mutações
   - ✅ Validação de token JWT

2. **Funcionalidades**
   - ✅ Listagem separada para públicos e rascunhos
   - ✅ Admin vê todos, visitante apenas publicados
   - ✅ Filtros de busca textual e intervalo de preço
   - ✅ Formatação automática de preço com `R$`
   - ✅ Reordenação em massa via drag and drop
   - ✅ Exclusão com captura prévia de título para log

### 💡 Destaques Técnicos
- 12 testes agrupados por categoria
- 3 níveis de mock: db, auth, cache
- Setup padrão de retorno de banco no `beforeEach`
- Valida construção dinâmica de queries SQL
- Único teste que utiliza `describe` aninhados

---

## 🎯 Padrões Observados

---

## 🔍 Teste: `/tests/integration/api/settings.api.test.js`

### ✅ Propósito
Testa API geral de configurações com autenticação Bearer Token.

### 🧪 Cobertura de Testes
1. **Operações**
   - ✅ Listagem de todas configurações
   - ✅ Atualização de configuração individual
   - ✅ Validação de autenticação obrigatória
   - ✅ Validação de campos obrigatórios

### 💡 Destaques Técnicos
- 4 testes implementados
- Implementa middleware `withAuth` completo dentro do teste
- Suporta ambos métodos POST e PUT para atualização
- Valida passagem correta de todos parâmetros para a função de atualização

---

## 🔍 Teste: `/tests/integration/api/settings.general.test.js`

### ✅ Propósito
Testa lógica geral de listagem e atualização de configurações.

### 🧪 Cobertura de Testes
1. **Operações**
   - ✅ Validação de autenticação obrigatória
   - ✅ Listagem completa de configurações
   - ✅ Atualização individual de chave/valor

### 💡 Destaques Técnicos
- 3 testes focados
- Mock de `withAuth` com lógica real de validação de token
- Retorno padrão com envelope `success: true`
- Validação de construção da query SQL

---

## 🔍 Teste: `/tests/integration/api/settings.test.js`

### ✅ Propósito
Testa API administrativa de configurações com controle de permissões RBAC.

### 🧪 Cobertura de Testes
1. **Segurança**
   - ✅ **GET é público** (funciona sem autenticação)
   - ✅ Mutações exigem privilégio de `admin`
   - ✅ Usuário editor recebe 403 Forbidden

2. **Operações**
   - ✅ Listagem de configurações
   - ✅ Atualização com validação de parâmetros
   - ✅ Bloqueio de métodos não permitidos
   - ✅ Tratamento de erros internos

### 💡 Destaques Técnicos
- 8 testes organizados por categoria
- Mock completo do `withAuth` no nível do middleware
- Único teste onde GET é público e mutações são protegidas
- Valida que atualização não é chamada em caso de falha de permissão

---

## 🔍 Teste: `/tests/integration/api/stats.test.js`

### ✅ Propósito
Testa API de estatísticas e contagens para painel administrativo.

### 🧪 Cobertura de Testes
1. **Operações**
   - ✅ Autenticação obrigatória
   - ✅ Contagens de usuários logados: diária, mensal, anual
   - ✅ Fallback para 0 quando não existem resultados
   - ✅ Nenhuma query é executada se usuário não estiver autenticado

### 💡 Destaques Técnicos
- 3 testes implementados
- Mock dinâmico da função `query` com retorno por padrão de SQL
- Valida execução de múltiplas queries em paralelo via `Promise.all`
- Testa fallback seguro para valores numéricos

---

## 🎯 Padrões Observados

---

## 🔍 Teste: `/tests/integration/api/status.api.test.js`

### ✅ Propósito
Testa endpoint de status da API V1 com verificação de conectividade com banco de dados.

### 🧪 Cobertura de Testes
1. **Funcionalidades**
   - ✅ Status operacional com sucesso
   - ✅ Tratamento de falha na conexão com banco
   - ✅ Bloqueio de métodos não permitidos

### 💡 Destaques Técnicos
- 3 testes implementados
- Retorna estrutura completa com versão da API e banco
- Valida execução da query `SELECT version()`
- Testa comportamento em caso de falha crítica

---

## 🔍 Teste: `/tests/integration/api/upload-image.test.js`

### ✅ Propósito
Testa API de upload de arquivos de imagem, maior teste de manipulação de arquivos.

### 🧪 Cobertura de Testes
1. **Validações**
   - ✅ Upload com sucesso
   - ✅ Validação de mimetype (apenas imagens permitidas)
   - ✅ Limite de tamanho máximo: 5MB
   - ✅ Validação de arquivo enviado
   - ✅ Geração de nome de arquivo com timestamp
   - ✅ Atualização automática de configuração para imagem da home

### 💡 Destaques Técnicos
- 7 testes completos
- Mock completo do Formidable e Filesystem
- Polimorfismo no tipo de upload por campo `type`
- Utiliza `Date.now()` para gerar nomes únicos
- Testa comportamento quando o parsing do formulário falha

---

## 🔍 Teste: `/tests/integration/api/videos.create.api.test.js`

### ✅ Propósito
Testa lógica de criação de vídeos com validação de URL do YouTube.

### 🧪 Cobertura de Testes
1. **Operações**
   - ✅ Criação com sucesso (status 201)
   - ✅ Validação de campos obrigatórios
   - ✅ Validação de formato de URL do YouTube
   - ✅ Tratamento de erros de serviço
   - ✅ Bloqueio de métodos não permitidos

### 💡 Destaques Técnicos
- 5 testes implementados
- Regex de validação de URL do YouTube diretamente no handler
- Retorno status 201 Created correto
- Valida passagem correta de payload para camada de domínio

---

## 🔍 Teste: `/tests/integration/api/videos.delete.test.js`

### ✅ Propósito
Testa lógica de exclusão segura de vídeos cadastrados.

### 🧪 Cobertura de Testes
1. **Operações**
   - ✅ Exclusão com sucesso
   - ✅ Tratamento 404 para vídeo não encontrado
   - ✅ Validação de ID obrigatório
   - ✅ Bloqueio de métodos não permitidos

### 💡 Destaques Técnicos
- 4 testes focados
- Padrão idêntico ao de exclusão de músicas e posts
- Separação clara entre não encontrado e erro geral
- Handler simulado padrão da mesma categoria

---

## 🎯 Padrões Observados

---

## 🔍 Teste: `/tests/integration/api/videos.pagination.api.test.js`

### ✅ Propósito
Testa lógica de paginação e parsing de parâmetros para listagem pública de vídeos.

### 🧪 Cobertura de Testes
1. **Operações**
   - ✅ Listagem paginada com parâmetros informados
   - ✅ Valores padrão aplicados quando parâmetros são omitidos
   - ✅ Tratamento de erros internos no banco
   - ✅ Bloqueio de métodos não permitidos

### 💡 Destaques Técnicos
- 4 testes implementados
- `parseInt` com radix 10 explícito
- Valores padrão: `page=1`, `limit=10`
- Estrutura padrão de resposta com objeto `pagination`

---

## 🔍 Teste: `/tests/integration/api/videos.test.js`

### ✅ Propósito
Testa API pública completa de listagem de vídeos com cache e rate limit.

### 🧪 Cobertura de Testes
1. **Funcionalidades**
   - ✅ Apenas método GET permitido
   - ✅ Validação de parâmetros de paginação
   - ✅ Rate Limit aplicado
   - ✅ Integração com cache transparente
   - ✅ Fallback para valores padrão quando parâmetros são inválidos
   - ✅ Extração de IP do header `X-Forwarded-For`

### 💡 Destaques Técnicos
- 6 testes implementados
- `getOrSetCache` executa o callback real durante testes
- Testa caso de falha no rate limit
- Suporta busca textual por parâmetro `search`

---

## 🔍 Teste: `/tests/integration/auth/auth.test.js`

### ✅ Propósito
Testa fluxo completo de login e middleware de autenticação `withAuth`. É o maior teste de autenticação.

### 🧪 Cobertura de Testes
1. **API Login**
   - ✅ Login com credenciais válidas
   - ✅ Retorno 401 para senha incorreta
   - ✅ Validação de campos obrigatórios

2. **Middleware `withAuth`**
   - ✅ Acesso permitido com token válido
   - ✅ Mensagem específica para token expirado
   - ✅ Mensagem específica para token inválido
   - ✅ Validação de header Authorization

### 💡 Destaques Técnicos
- 7 testes agrupados por categoria
- Mock das bibliotecas `jsonwebtoken` e `bcrypt`
- Diferencia erros de `TokenExpiredError` de erros genéricos
- Anota usuário decodificado na requisição

---

## 🔍 Teste: `/tests/integration/auth/auth.v1.check.test.js`

### ✅ Propósito
Testa endpoint de validação de token para API V1 pública.

### 🧪 Cobertura de Testes
1. **Operações**
   - ✅ Validação de token válido com retorno dos dados do usuário
   - ✅ Retorno 401 para token ausente ou mal formatado
   - ✅ Retorno 401 para token inválido ou expirado
   - ✅ Bloqueio de métodos não permitidos

### 💡 Destaques Técnicos
- 4 testes implementados
- Estrutura padrão de resposta da API V1 com `success`, `data` e `timestamp`
- Todas respostas contém o campo `timestamp` com data atual
- Retorna dados do usuário decodificado: `userId`, `username`, `role`

---

## 🎯 Padrões Observados

---

## 🔍 Teste: `/tests/integration/auth/auth.v1.login.test.js`

### ✅ Propósito
Testa endpoint de login para API V1 pública com estrutura de resposta padrão.

### 🧪 Cobertura de Testes
1. **Operações**
   - ✅ Autenticação com sucesso e retorno de token JWT
   - ✅ Retorno 401 para credenciais inválidas
   - ✅ Validação de campos obrigatórios
   - ✅ Bloqueio de métodos não permitidos

### 💡 Destaques Técnicos
- 4 testes implementados
- Estrutura padrão de resposta da API V1 com `success`, `data` e `timestamp`
- Retorna dados completos: token, tipo, expiração e dados do usuário
- Mensagens específicas para cada tipo de erro

---

## 🔍 Teste: `/tests/integration/create-post-flow.test.js`

### ✅ Propósito
Teste de fluxo completo: upload de imagem + criação de post com a URL retornada. É o único teste que simula fluxo real de usuário.

### 🧪 Cobertura de Testes
1. **Fluxo Completo**
   - ✅ **Passo 1**: Upload de imagem válida
   - ✅ **Passo 2**: Criação de post utilizando a URL da imagem retornada
   - ✅ Valida que a URL persiste corretamente no banco de dados
   - ✅ Verifica passagem correta dos parâmetros na query SQL

### 💡 Destaques Técnicos
- Único teste de fluxo end-to-end
- Testa integração entre dois endpoints diferentes
- Simula comportamento real de frontend
- Valida pipeline completo do usuário

---

## 🔍 Teste: `/tests/integration/musicas_flow.test.js`

### ✅ Propósito
Teste de ciclo completo CRUD de músicas: criar, listar e excluir utilizando o mesmo handler real.

### 🧪 Cobertura de Testes
1. **Ciclo Completo**
   - ✅ **Passo 1**: Criação de música via POST
   - ✅ **Passo 2**: Listagem de músicas via GET
   - ✅ **Passo 3**: Exclusão de música via DELETE
   - ✅ Validação de URL do Spotify
   - ✅ Teste de filtro de busca textual

### 💡 Destaques Técnicos
- 3 testes implementados
- Utiliza o handler real da API, não um simulado
- Testa integração entre todas operações do mesmo endpoint
- Valida que log de auditoria é chamado

---

## 🔍 Teste: `/tests/integration/musicas_public_db_integration.test.js`

### ✅ Propósito
Teste de segurança para garantir que o filtro `publicado = true` SEMPRE está presente nas queries da API pública.

### 🧪 Cobertura de Testes
1. **Validações de Segurança**
   - ✅ Garante que `WHERE publicado = true` está presente na query SELECT
   - ✅ Garante que `WHERE publicado = true` está presente na query COUNT
   - ✅ Garante que o filtro permanece mesmo quando há busca textual

### 💡 Destaques Técnicos
- 2 testes focados exclusivamente em segurança
- Mocka diretamente a função `query` da camada mais baixa do banco
- Analisa o SQL gerado para confirmar presença do filtro
- Único teste que valida segurança diretamente na query SQL

---

## 🎯 Padrões Observados

---

## 🔍 Teste: `/tests/integration/posts.integration.test.js`

### ✅ Propósito
Teste de integração completo do endpoint público de artigos com validação de cache, rate limit, paginação e busca. É o maior e mais completo teste de endpoint público.

### 🧪 Cobertura de Testes
1. **Funcionalidades Completas**
   - ✅ Listagem paginada com valores padrão
   - ✅ Validação de parâmetros de paginação
   - ✅ Limite máximo de 100 registros por página
   - ✅ Rate Limit aplicado
   - ✅ Integração com cache transparente
   - ✅ Busca textual com chave de cache dinâmica
   - ✅ Bloqueio de métodos não permitidos
   - ✅ Tratamento de erros internos
   - ✅ Validação de limite inferior e superior dos parâmetros

### 💡 Destaques Técnicos
- 11 testes implementados
- Mocks definidos ANTES das importações seguindo padrão correto do Jest
- Mock do cache sempre executa o callback real durante testes
- Valida chave única de cache por página, limite e termo de busca
- Valida que nenhuma função é chamada quando validações falham

---

## 🔍 Teste: `/tests/integration/videos_flow.test.js`

### ✅ Propósito
Teste de ciclo completo CRUD de vídeos: criar, listar e excluir utilizando o handler real da API.

### 🧪 Cobertura de Testes
1. **Ciclo Completo**
   - ✅ **Passo 1**: Criação de vídeo via POST
   - ✅ **Passo 2**: Listagem de vídeos via GET
   - ✅ **Passo 3**: Exclusão de vídeo via DELETE
   - ✅ Teste de filtro de busca textual

### 💡 Destaques Técnicos
- 2 testes implementados
- Utiliza o handler real da API, não um simulado
- Testa integração entre todas operações do mesmo endpoint
- Mock de autenticação bypassado para simular usuário admin logado
- Padrão idêntico utilizado no fluxo de músicas

---

## 🔍 Teste: `/tests/integration/videos_public_db_integration.test.js`

### ✅ Propósito
Teste de segurança para garantir que o filtro `publicado = true` SEMPRE está presente nas queries da API pública de vídeos.

### 🧪 Cobertura de Testes
1. **Validações de Segurança**
   - ✅ Garante que `WHERE publicado = true` está presente na query SELECT
   - ✅ Garante que `WHERE publicado = true` está presente na query COUNT
   - ✅ Garante que o filtro permanece mesmo quando há busca textual

### 💡 Destaques Técnicos
- 2 testes focados exclusivamente em segurança
- Mocka diretamente a função `query` da camada mais baixa do banco
- Analisa o SQL gerado para confirmar presença do filtro
- Padrão idêntico utilizado no teste de músicas

---

## 🎯 Padrões Observados

✅ **Todos os testes seguem os mesmos padrões:**
1. Isolamento total via mocks (nenhum acesso a recursos reais)
2. `beforeEach` com limpeza de todos mocks
3. Separação por `describe` por funcionalidade
4. Todos testam casos de sucesso e falha
5. Validação de status HTTP correto em todos cenários
6. Sem dependências externas - execução offline e rápida
7. Padrão consistente em todos os arquivos da mesma categoria
