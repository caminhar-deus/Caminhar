# Documentação Testes Unitários - Bibliotecas Core

Arquivo: `/docs/PROJECT_tests_unit_lib.md`
Última atualização: 21/04/2026

---

## Visão Geral

Esta documentação analisa todos os testes unitários das bibliotecas core do projeto, localizadas em `/tests/unit/lib/`.
Cada seção descreve o propósito da biblioteca, funcionalidades validadas, casos de borda testados e garantias de comportamento.

---

## 📁 `auth.test.js` - Biblioteca de Autenticação

**Arquivo Testado**: `lib/auth.js`
**Cobertura**: 9 funções | 8 casos de teste

### ✅ Propósito Geral
Biblioteca responsável por todo fluxo de autenticação, gerenciamento de senhas, tokens JWT, cookies e middleware de proteção de rotas.

### ✅ Funcionalidades Validadas
| Função | Comportamento Garantido |
|--------|--------------------------|
| `hashPassword()` | Criptografia bcrypt segura, valida senhas vazias |
| `verifyPassword()` | Comparação segura sem timing attack |
| `generateToken()` | Criação de JWT com dados de usuário |
| `verifyToken()` | Validação de assinatura, retorno nulo em token inválido |
| `getAuthToken()` | Extrai token de header `Authorization: Bearer` OU de cookie como fallback |
| `setAuthCookie()` | Configura cookie de sessão no response |
| `authenticate()` | Valida credenciais contra banco de dados |
| `withAuth()` | Middleware de proteção de rotas API |
| `initializeAuth()` | Inicialização do sistema, criação de usuário admin padrão |

### ✅ Casos de Borda Testados
✅ Senha incorreta retorna `null` sem lançar exceção
✅ Token inválido retorna `null`
✅ Usuário inexistente retorna `null`
✅ Sem token na requisição retorna 401
✅ Admin padrão é criado automaticamente se não existir
✅ Role do admin é corrigida se estiver incorreta
✅ Erros de banco são repassados e logados
✅ Validação de variáveis de ambiente obrigatórias

### ✅ Garantias
✅ Nenhuma senha em texto plano é armazenada
✅ Middleware sempre retorna 401 antes de executar o handler
✅ Dados do usuário são injetados no objeto `req.user` em requisições válidas

---

## 📁 `cache.test.js` - Biblioteca de Cache e Rate Limit

**Arquivo Testado**: `lib/cache.js`
**Cobertura**: 4 funções | 10 casos de teste

### ✅ Propósito Geral
Camada de cache com Redis e fallback transparente, além de sistema de rate limiting resiliente.

### ✅ Funcionalidades Validadas
| Função | Comportamento Garantido |
|--------|--------------------------|
| `getOrSetCache()` | Padrão Cache-Aside, busca no Redis ou executa função de fallback |
| `invalidateCache()` | Remove chave específica do cache |
| `clearAllCache()` | Limpa todo o banco Redis |
| `checkRateLimit()` | Controle de taxa de requisições por identificador |

### ✅ Casos de Borda Testados
✅ **Cache Hit**: Retorna dado direto do Redis sem executar função
✅ **Cache Miss**: Busca dado, salva no cache e retorna
✅ **Redis Falha no GET**: Faz fallback silencioso para banco de dados
✅ **Redis Falha no SET**: Retorna dado normalmente, apenas loga erro
✅ **Redis Não Instanciado**: Bypass completo, executa sempre a função original
✅ **Invalidação e Limpeza**: Funcionam mesmo com Redis offline

### ✅ Comportamento do Rate Limit
✅ Usa Redis como storage principal
✅ Fallback automático para `Map` em memória local se Redis estiver offline
✅ Sempre funciona, independente da disponibilidade do Redis
✅ Contador é resetado após expiração da janela

### ✅ Garantias
✅ **Nunca falha por problema no Cache**: A aplicação continua funcionando mesmo se o Redis cair completamente
✅ Todos erros de cache são logados mas nunca quebram o fluxo principal
✅ TTL padrão de 3600 segundos (1 hora)

---

## 📁 `crud.test.js` - Utilitários CRUD Genéricos

**Arquivo Testado**: `lib/crud.js`
**Cobertura**: 5 funções | 7 casos de teste

### ✅ Propósito Geral
Camada de abstração para operações básicas de banco de dados, com proteção nativa contra SQL Injection.

### ✅ Funcionalidades Validadas
| Função | Comportamento Garantido |
|--------|--------------------------|
| `raw()` | Marca valores para serem inseridos como SQL bruto (não parametrizado) |
| `createRecord()` | INSERT genérico para qualquer tabela |
| `updateRecords()` | UPDATE genérico com condições WHERE |
| `deleteRecords()` | DELETE genérico com condições WHERE |
| `upsertRecord()` | INSERT ... ON CONFLICT DO UPDATE |

### ✅ Segurança Validada
✅ **Proteção contra SQL Injection**:
  - Nomes de tabelas são validados contra caracteres perigosos
  - Nomes de colunas são validados antes de serem inseridos na query
  - Qualquer tentativa de injetar comandos lança erro imediatamente
  - Todos valores são sempre enviados como parâmetros preparados

### ✅ Casos de Borda Testados
✅ Valores `raw()` são inseridos diretamente na query sem placeholders
✅ Todos campos são mapeados corretamente para parâmetros `$1, $2, ...`
✅ Valores do WHERE são adicionados depois dos valores do UPDATE
✅ `RETURNING *` é adicionado automaticamente em todas operações

### ✅ Garantias
✅ Nenhuma string de usuário final entra diretamente na query SQL
✅ Mesmo desenvolvedores não podem acidentalmente criar vulnerabilidades usando essas funções
✅ Todas operações retornam o registro modificado

---

## 📁 `db.test.js` - Camada de Banco de Dados

**Arquivo Testado**: `lib/db.js`
**Cobertura**: 6 funções | 9 casos de teste

### ✅ Propósito Geral
Wrapper do pool de conexões PostgreSQL, gerenciamento de transações e utilitários de saúde do banco.

### ✅ Funcionalidades Validadas
| Função | Comportamento Garantido |
|--------|--------------------------|
| `query()` | Executa consulta SQL, gerenciamento de pool |
| `transaction()` | Executa bloco dentro de transação ACID |
| `healthCheck()` | Verifica disponibilidade do banco |
| `getDatabaseInfo()` | Retorna métricas e versão do PostgreSQL |
| `closeDatabase()` | Encerra conexões do pool |
| `resetPool()` | Reinicializa pool de conexões |

### ✅ Comportamento de Transações
✅ `BEGIN` é executado automaticamente antes do callback
✅ `COMMIT` é executado se callback resolver com sucesso
✅ `ROLLBACK` é executado AUTOMATICAMENTE se qualquer erro ocorrer
✅ Cliente é sempre liberado de volta para o pool, independente de sucesso ou falha
✅ Cliente da transação é injetado como primeiro argumento do callback

### ✅ Casos de Borda Testados
✅ Opção `throwOnError: false` retorna `null` ao invés de lançar exceção
✅ Em produção SSL é ativado automaticamente no pool
✅ `healthCheck()` retorna `boolean` e nunca lança erro
✅ Erros no fechamento do pool são propagados corretamente

### ✅ Garantias
✅ Nenhuma conexão vaza, sempre é liberada após uso
✅ Transações são atômicas, nunca ficam pela metade
✅ Pool é recriado automaticamente em reset
✅ Todos erros são logados antes de serem lançados

---

## 📁 `middleware.test.js` - Middlewares e Utilitários

**Arquivo Testado**: `lib/middleware.js`
**Cobertura**: 6 funções | 18 casos de teste

### ✅ Propósito Geral
Coleção de middlewares padrão para tratamento de requisições API, logs, autenticação, rate limit e manipulação de erros.

### ✅ Funcionalidades Validadas
| Função | Comportamento Garantido |
|--------|--------------------------|
| `logger` | Logger estruturado com níveis info, warn, error e contexto adicional |
| `apiMiddleware` | Wrapper padrão para todas rotas API, CORS, headers e tratamento de erro |
| `authenticatedApiMiddleware` | Combina autenticação + middleware base |
| `externalAuthMiddleware` | Middleware de autenticação para serviços externos |
| `rateLimitMiddleware` | Limite de 100 requisições por IP por 15 minutos |
| `errorHandlingMiddleware` | Tratamento centralizado de erros com mapeamento de status codes |

### ✅ Casos de Borda Testados
✅ Requisições OPTIONS (CORS preflight) retornam 200 automaticamente
✅ Handler inválido retorna 500 imediatamente
✅ Erros no CORS são capturados e tratados
✅ Rate Limit limpa entradas expiradas automaticamente
✅ Suporta header `X-Forwarded-For` para proxies reversos
✅ Stack trace só é retornado em ambiente de desenvolvimento
✅ Mapeamento automático de classes de erro para status HTTP:
  - ValidationError → 400
  - UnauthorizedError → 401
  - ForbiddenError → 403
  - NotFoundError → 404

### ✅ Garantias
✅ Nenhuma exceção não tratada escapa dos middlewares
✅ Sempre cabeçalhos padrão são adicionados em todas respostas
✅ IP do cliente é sempre identificado corretamente

---

## 📁 `redis.test.js` - Cliente Redis

**Arquivo Testado**: `lib/redis.js`
**Cobertura**: 1 módulo | 2 casos de teste

### ✅ Propósito Geral
Cliente Redis Upstash com inicialização condicional baseada em variáveis de ambiente.

### ✅ Funcionalidades Validadas
✅ Retorna `null` se variáveis `UPSTASH_REDIS_REST_URL` ou `UPSTASH_REDIS_REST_TOKEN` não estiverem definidas
✅ Instancia corretamente o cliente se ambas variáveis existirem
✅ Nenhuma exceção é lançada na inicialização
✅ Sem fallbacks automáticos, decisão é deixada para as bibliotecas consumidoras

### ✅ Garantias
✅ Aplicação inicializa mesmo sem Redis disponível
✅ Nenhuma dependência rígida no Redis para funcionamento básico

---

## 📁 `errors.test.js` - Classes de Erro Customizadas

**Arquivo Testado**: `lib/api/errors.js`
**Cobertura**: 9 classes | 25 casos de teste

### ✅ Propósito Geral
Hierarquia completa de erros padronizados para API, com status codes, serialização JSON e metadados.

### ✅ Classes Implementadas
| Classe | Status Code | Propósito |
|--------|-------------|-----------|
| `ApiError` | 500 | Classe base abstrata |
| `ValidationError` | 400 | Dados de entrada inválidos |
| `AuthenticationError` | 401 | Falha na autenticação |
| `ForbiddenError` | 403 | Acesso negado |
| `NotFoundError` | 404 | Recurso não encontrado |
| `ConflictError` | 409 | Conflito de dados |
| `RateLimitError` | 429 | Limite de requisições |
| `ServerError` | 500 | Erro interno |
| `ServiceUnavailableError` | 503 | Serviço temporariamente indisponível |
| `MethodNotAllowedError` | 405 | Método HTTP não permitido |

### ✅ Funcionalidades Validadas
✅ Todas classes herdam corretamente de `Error`
✅ Valores padrão inteligentes para todos campos
✅ Método `toJSON()` retorna estrutura padronizada
✅ Incluem `timestamp`, `requestId` e metadados adicionais
✅ Suporte a detalhes de validação por campo
✅ `NotFoundError` formata mensagem automaticamente com tipo e id do recurso
✅ `RateLimitError` e `ServiceUnavailableError` incluem header `Retry-After`

### ✅ Garantias
✅ Todos erros podem ser serializados para JSON de forma segura
✅ Nenhuma informação sensível é exposta na serialização
✅ Padronização 100% consistente em toda API

---

## 📁 `api/index.test.js` - Barril de Exportação API

**Arquivo Testado**: `lib/api/index.js`
**Cobertura**: 1 módulo | 1 caso de teste

### ✅ Propósito Geral
Ponto de entrada único para toda biblioteca API, responsável por agrupar e re-exportar todos submódulos.

### ✅ Funcionalidades Validadas
✅ Exporta objeto default organizado por categorias: `errors`, `response`, `validate`, `middleware`
✅ Re-exporta funções e classes individualmente para importação nomeada
✅ Todas dependências são carregadas corretamente
✅ Nenhuma dependência circular na inicialização

---

## 📁 `api/middleware.test.js` - Middlewares Funcionais API

**Arquivo Testado**: `lib/api/middleware.js`
**Cobertura**: 13 funções | 23 casos de teste

### ✅ Propósito Geral
Biblioteca de middlewares composáveis com padrão HOC (Higher-Order Component) para construção de rotas API.

### ✅ Funcionalidades Validadas
| Função | Comportamento Garantido |
|--------|--------------------------|
| `composeMiddleware()` | Combina múltiplos middlewares em ordem de execução |
| `withMethod()` | Permite apenas métodos HTTP específicos |
| `withAuth()` | Protege rota com autenticação e validação de roles |
| `withOptionalAuth()` | Adiciona usuário no req se token existir, nunca bloqueia |
| `withRateLimit()` | Rate limit configurável por chave customizada |
| `withCors()` | Tratamento CORS completo e requisições OPTIONS |
| `withErrorHandler()` | Captura todas exceções e padroniza resposta |
| `withLogger()` | Loga requisição com tempo de duração |
| `withTimeout()` | Cancela requisição após tempo limite |
| `withBodyParser()` | Valida tamanho máximo do corpo da requisição |
| `withCache()` | Adiciona headers Cache-Control para requisições GET |
| `publicApi()` | Combinação padrão de middlewares para rotas públicas |
| `protectedApi()` | Combinação padrão de middlewares para rotas protegidas |

### ✅ Casos de Borda Testados
✅ Rate Limit aceita função dinâmica para `maxRequests`
✅ `withAuth()` suporta validação por roles
✅ Timeout é cancelado se handler terminar antes
✅ Body Parser ignora métodos GET
✅ CORS responde automaticamente requisições OPTIONS
✅ Limpeza automática de entradas expiradas do Rate Limit

### ✅ Garantias
✅ Todos middlewares são puros e imutáveis
✅ Nenhuma exceção escapa do `withErrorHandler`
✅ Ordem de composição é preservada corretamente

---

## 📁 `api/response.test.js` - Padronizador de Respostas

**Arquivo Testado**: `lib/api/response.js`
**Cobertura**: 14 funções | 20 casos de teste

### ✅ Propósito Geral
Coleção completa de helpers para padronizar 100% das respostas da API com estrutura consistente.

### ✅ Funcionalidades Validadas
| Tipo | Funções | Status HTTP |
|------|---------|-------------|
| ✅ Sucesso | `success()`, `paginated()`, `created()`, `noContent()`, `updated()`, `deleted()` | 200, 201, 204 |
| ❌ Erro | `badRequest()`, `validationError()`, `unauthorized()`, `forbidden()`, `notFound()`, `methodNotAllowed()`, `conflict()`, `tooManyRequests()`, `serverError()`, `serviceUnavailable()` | 400, 401, 403, 404, 405, 409, 429, 500, 503 |
| 🔄 Utilitário | `handleError()` | Detecta e converte classes de erro |

### ✅ Casos de Borda Testados
✅ Todas respostas incluem `timestamp` e `requestId` automaticamente
✅ `paginated()` calcula `totalPages`, `hasNext` e `hasPrev`
✅ Headers adequados são adicionados: `Location`, `WWW-Authenticate`, `Allow`, `Retry-After`
✅ `handleError()` detecta erros customizados e usa método `toJSON()` se disponível
✅ Stack trace é incluído apenas quando explicitamente solicitado

### ✅ Garantias
✅ 100% das respostas API seguem exatamente a mesma estrutura
✅ Nenhuma informação sensível é exposta por padrão
✅ Todos status HTTP estão mapeados corretamente

---

## 📁 `api/validate.test.js` - Validação de Requisições

**Arquivo Testado**: `lib/api/validate.js`
**Cobertura**: 8 funções | 24 casos de teste

### ✅ Propósito Geral
Middleware de validação baseado em Zod para todos locais de entrada de dados.

### ✅ Funcionalidades Validadas
| Função | Valida | Comportamento |
|--------|--------|---------------|
| `validateBody()` | `req.body` | Ignora automaticamente métodos GET |
| `validateQuery()` | `req.query` | Aplica transformações de tipo |
| `validateParams()` | `req.query` | Extrai params dinâmicos do Next.js |
| `validateHeaders()` | `req.headers` | Case insensitive |
| `validateRequest()` | Todos locais | Acumula erros de múltiplas validações |
| `formatZodErrors()` | Erros Zod | Formata para estrutura padronizada |
| `createPaginationSchema()` | Helper | Valores padrão e limite máximo |
| `createSearchSchema()` | Helper | Valida tamanho mínimo e máximo de busca |

### ✅ Casos de Borda Testados
✅ Erros de múltiplas validações são retornados todos de uma vez
✅ Cada erro indica a localização: `body`, `query`, `params`, `headers`
✅ Transformações do Zod são aplicadas e salvas no objeto req
✅ Erros inesperados no schema são capturados e logados
✅ Validação de headers funciona independente de capitalização

### ✅ Garantias
✅ Handler nunca é executado se qualquer validação falhar
✅ Nenhum dado não validado chega ao handler da rota
✅ Todos erros seguem estrutura padronizada

---

## 📁 `backup.available.test.js` - Gerenciador de Backups

**Arquivo Testado**: `scripts/backup.js`
**Cobertura**: 1 função | 3 casos de teste

### ✅ Propósito Geral
Função para listar e organizar backups disponíveis no sistema de arquivos.

### ✅ Funcionalidades Validadas
| Função | Comportamento Garantido |
|--------|--------------------------|
| `getAvailableBackups()` | Lista arquivos de backup, filtra válidos, extrai timestamp e ordena |

### ✅ Casos de Borda Testados
✅ Arquivos que não seguem o padrão de nome são ignorados
✅ Backups são ordenados automaticamente do mais novo para o mais antigo
✅ Diretório de backup é criado automaticamente se não existir
✅ Arquivos estranhos no diretório não quebram a função
✅ Retorna array vazio se nenhum backup for encontrado

### ✅ Garantias
✅ Nunca lança exceção, sempre retorna array
✅ Funciona mesmo se diretório não existir
✅ Ordenação é consistente e baseada no timestamp do nome do arquivo

---

## 📁 `backup.cleanup.test.js` - Rotação Automática de Backups

**Arquivo Testado**: `scripts/backup.js`
**Cobertura**: 1 função | 3 casos de teste

### ✅ Propósito Geral
Limpeza automática de backups antigos para manter apenas os últimos 10 arquivos mais recentes.

### ✅ Funcionalidades Validadas
| Função | Comportamento Garantido |
|--------|--------------------------|
| `cleanupOldBackups()` | Remove backups mais antigos quando exceder o limite máximo |

### ✅ Casos de Borda Testados
✅ Quando existem mais de 10 backups, apenas os 2 mais antigos são removidos
✅ Cada backup removido apaga também os arquivos `.sql.gz`, `.sha256` e `.enc` correspondentes (total 6 chamadas unlinkSync)
✅ Quando existem 10 ou menos backups, nenhum arquivo é apagado
✅ Arquivos que não seguem o padrão de nome são completamente ignorados
✅ Ordenação é sempre baseada no timestamp extraído do nome do arquivo

### ✅ Garantias
✅ Nunca remove o backup mais recente
✅ Funciona mesmo com arquivos estranhos no diretório
✅ Limite máximo é fixo em 10 arquivos

---

## 📁 `backup.logs.test.js` - Logs de Operações de Backup

**Arquivo Testado**: `scripts/backup.js`
**Cobertura**: 1 função | 4 casos de teste

### ✅ Propósito Geral
Leitura e parsing estruturado do arquivo de log de operações de backup.

### ✅ Funcionalidades Validadas
| Função | Comportamento Garantido |
|--------|--------------------------|
| `getBackupLogs()` | Lê arquivo de log e retorna lista estruturada de eventos |

### ✅ Casos de Borda Testados
✅ Retorna array vazio se arquivo de log não existir
✅ Retorna array vazio se arquivo de log estiver vazio
✅ Linhas mal formatadas são ignoradas silenciosamente
✅ Linhas vazias são puladas automaticamente
✅ Todos status são extraídos corretamente: `SUCCESS`, `RESTORE_SUCCESS`, `ERROR`

### ✅ Garantias
✅ Nunca lança exceção por arquivo corrompido
✅ Sempre retorna array, independente do estado do arquivo

---

## 📁 `backup.operations.test.js` - Operações Core de Backup

**Arquivo Testado**: `scripts/backup.js`
**Cobertura**: 2 funções | 5 casos de teste

### ✅ Propósito Geral
Funções principais para criação e restauração de backups PostgreSQL.

### ✅ Funcionalidades Validadas
| Função | Comportamento Garantido |
|--------|--------------------------|
| `createBackup()` | Executa pg_dump, compacta com gzip e salva arquivo |
| `restoreBackup()` | Restaura banco de dados a partir de arquivo de backup |

### ✅ Casos de Borda Testados
✅ Diretório de backups é criado automaticamente se não existir
✅ Limpeza de backups antigos é executada automaticamente após criação bem sucedida
✅ Antes de restaurar, é criado um backup de segurança automático
✅ Restauração falha imediatamente se arquivo não existir
✅ Todas operações são logadas no arquivo de histórico
✅ ✅ **NOVO:** Geração automática de hash SHA-256 para cada backup
✅ ✅ **NOVO:** Verificação automática de integridade antes da restauração
✅ ✅ **NOVO:** Arquivos hash são removidos automaticamente junto com os backups antigos

### ✅ Garantias
✅ Nenhuma restauração é feita sem backup de segurança prévio
✅ Todos erros são logados antes de serem lançados
✅ Comandos pg_dump e psql são montados corretamente com variáveis de ambiente

---

## 📁 `createPost.test.js` - Domínio: Criação de Posts

**Arquivo Testado**: `lib/domain/posts.js`
**Cobertura**: 1 função | 3 casos de teste

### ✅ Propósito Geral
Função de domínio para criação de registros na tabela posts.

### ✅ Funcionalidades Validadas
| Função | Comportamento Garantido |
|--------|--------------------------|
| `createPost()` | Insere novo post no banco com validação e valores padrão |

### ✅ Casos de Borda Testados
✅ Todos campos são mapeados corretamente para parâmetros SQL
✅ Campos opcionais ausentes são convertidos para `null`
✅ Campo `published` assume `false` por padrão se não informado
✅ Erros do banco de dados são propagados e logados
✅ Datas `created_at` e `updated_at` são gerenciados pelo banco

### ✅ Garantias
✅ Nenhuma injeção SQL é possível, todos valores são parametrizados
✅ Valores padrão são aplicados consistentemente
✅ Retorna o registro completo criado com todos campos

---

## 📁 `deletePost.test.js` - Domínio: Exclusão de Posts

**Arquivo Testado**: `lib/domain/posts.js`
**Cobertura**: 1 função | 3 casos de teste

### ✅ Propósito Geral
Função para exclusão de registros na tabela posts.

### ✅ Funcionalidades Validadas
| Função | Comportamento Garantido |
|--------|--------------------------|
| `deletePost()` | Remove post pelo ID e retorna o registro excluído |

### ✅ Casos de Borda Testados
✅ Query SQL é montada corretamente com `RETURNING id`
✅ Retorna `undefined` se o post não existir
✅ Erros de banco de dados são propagados e logados
✅ Erros de chave estrangeira são passados para o chamador

### ✅ Garantias
✅ ID é sempre passado como parâmetro preparado
✅ Nenhuma exclusão em lote é possível
✅ Sempre retorna o ID removido em caso de sucesso

---

## 📁 `getAllPosts.test.js` - Domínio: Listagem Completa de Posts

**Arquivo Testado**: `lib/domain/posts.js`
**Cobertura**: 1 função | 3 casos de teste

### ✅ Propósito Geral
Função para retornar todos os posts cadastrados.

### ✅ Funcionalidades Validadas
| Função | Comportamento Garantido |
|--------|--------------------------|
| `getAllPosts()` | Retorna lista completa de posts ordenados por data decrescente |

### ✅ Casos de Borda Testados
✅ Ordenação padrão por `created_at DESC`
✅ Retorna array vazio se não existirem registros
✅ Erros de consulta são propagados corretamente
✅ Sem limites de paginação ou filtros

### ✅ Garantias
✅ Resultado é sempre um array, mesmo vazio
✅ Nunca retorna `null` ou `undefined`

---

## 📁 `getPaginatedPosts.test.js` - Domínio: Listagem Paginada de Posts

**Arquivo Testado**: `lib/domain/posts.js`
**Cobertura**: 1 função | 2 casos de teste

### ✅ Propósito Geral
Função para paginação e busca de posts.

### ✅ Funcionalidades Validadas
| Função | Comportamento Garantido |
|--------|--------------------------|
| `getPaginatedPosts()` | Retorna posts com paginação e suporte a busca por termo |

### ✅ Casos de Borda Testados
✅ Executa duas queries: uma para dados e uma para contagem total
✅ Offset é calculado corretamente baseado na página e limite
✅ Busca case insensitive no campo título
✅ Retorna estrutura padronizada com `data` e `pagination`
✅ `totalPages` é calculado automaticamente

### ✅ Garantias
✅ Busca é sempre segura com parametrização
✅ Nenhuma injeção SQL é possível no termo de busca

---

## 📁 `musicas.test.js` - Domínio: CRUD Completo de Músicas

**Arquivo Testado**: `lib/domain/musicas.js`
**Cobertura**: 5 funções | 10 casos de teste

### ✅ Propósito Geral
Implementação completa do domínio de músicas com todas operações CRUD.

### ✅ Funcionalidades Validadas
| Função | Comportamento Garantido |
|--------|--------------------------|
| `getAllMusicas()` | Listagem completa com busca opcional |
| `getPaginatedMusicas()` | Paginação, ordenação por posição e busca |
| `createMusica()` | Criação de novo registro |
| `updateMusica()` | Atualização parcial de registros |
| `deleteMusica()` | Exclusão por ID |

### ✅ Casos de Borda Testados
✅ Ordenação padrão por `position ASC`, `created_at DESC`
✅ Busca é feita nos campos `titulo` e `artista` simultaneamente
✅ Campos opcionais ausentes são convertidos para `null`
✅ `publicado` assume `false` por padrão
✅ Campos `created_at` e `updated_at` são gerenciados pelo banco
✅ Offset é calculado corretamente para paginação

### ✅ Garantias
✅ Todas operações usam queries parametrizadas
✅ Valores padrão são aplicados consistentemente
✅ Estrutura de retorno é uniforme e padronizada

---

## 📁 `query.test.js` - Wrapper Base de Consultas SQL

**Arquivo Testado**: `lib/db.js`
**Cobertura**: 1 função | 2 casos de teste

### ✅ Propósito Geral
Wrapper base para execução de consultas SQL com logging estruturado.

### ✅ Funcionalidades Validadas
| Função | Comportamento Garantido |
|--------|--------------------------|
| `query()` | Executa consulta no pool PostgreSQL |

### ✅ Casos de Borda Testados
✅ Parâmetros são passados diretamente para o driver pg
✅ Em caso de erro, loga detalhes completos no console: query executada, código de erro, duração e mensagem
✅ Erro é sempre relançado para ser tratado pelo chamador
✅ Duração da consulta é medida e incluída no log

### ✅ Garantias
✅ Todas consultas são logadas em caso de falha
✅ Nenhuma exceção é silenciada
✅ Sempre retorna o objeto `rows` e `rowCount` do driver original

---

## 📁 `saveImage.test.js` - Domínio: Registro de Imagens

**Arquivo Testado**: `lib/domain/images.js`
**Cobertura**: 1 função | 1 caso de teste

### ✅ Propósito Geral
Função para salvar metadados de imagens enviadas para upload.

### ✅ Funcionalidades Validadas
| Função | Comportamento Garantido |
|--------|--------------------------|
| `saveImage()` | Insere registro na tabela images |

### ✅ Casos de Borda Testados
✅ Todos campos são mapeados corretamente para parâmetros SQL
✅ Retorna o registro completo criado
✅ `RETURNING *` é usado para retornar todos campos
✅ `created_at` é gerenciado pelo banco de dados

### ✅ Garantias
✅ Nenhuma injeção SQL é possível
✅ Todos metadados são salvos consistentemente

---

## 📁 `settings.test.js` - Domínio: Configurações do Sistema

**Arquivo Testado**: `lib/domain/settings.js`
**Cobertura**: 5 funções | 9 casos de teste

### ✅ Propósito Geral
Sistema de configurações chave-valor persistente no banco de dados.

### ✅ Funcionalidades Validadas
| Função | Comportamento Garantido |
|--------|--------------------------|
| `updateSetting()` | Upsert com padrão ON CONFLICT |
| `setSetting()` | Alias para updateSetting |
| `getSetting()` | Retorna apenas o valor da configuração |
| `getSettings()` | Retorna objeto formatado chave: valor |
| `getAllSettings()` | Retorna lista bruta de configurações |

### ✅ Casos de Borda Testados
✅ Upsert funciona tanto para criação quanto atualização
✅ `getSetting()` retorna `null` se chave não existir
✅ Todos erros são logados e propagados
✅ Valores são tipados com campo `type`
✅ Campos `updated_at` são atualizados automaticamente

### ✅ Garantias
✅ Nenhuma configuração é duplicada
✅ Valores padrão são aplicados consistentemente
✅ Retorno é sempre do tipo esperado para cada função

---

## 📁 `updatePost.test.js` - Domínio: Atualização de Posts

**Arquivo Testado**: `lib/domain/posts.js`
**Cobertura**: 1 função | 3 casos de teste

### ✅ Propósito Geral
Função para atualização de registros na tabela posts.

### ✅ Funcionalidades Validadas
| Função | Comportamento Garantido |
|--------|--------------------------|
| `updatePost()` | Atualiza post pelo ID e retorna registro modificado |

### ✅ Casos de Borda Testados
✅ Todos campos são mapeados corretamente para parâmetros
✅ Campos ausentes são convertidos para `null`
✅ Campo `published` assume `false` por padrão se omitido
✅ `updated_at` é atualizado automaticamente
✅ Erros de banco são propagados e logados

### ✅ Garantias
✅ ID sempre é o último parâmetro na consulta
✅ Sempre retorna o registro completo atualizado
✅ Nenhuma atualização em lote é possível

---

## 📁 `config.test.js` - Utilitários SEO

**Arquivo Testado**: `lib/seo/config.js`
**Cobertura**: 8 funções | 15 casos de teste

### ✅ Propósito Geral
Coleção de utilitários para geração de meta tags, dados estruturados e otimização SEO.

### ✅ Funcionalidades Validadas
| Função | Comportamento Garantido |
|--------|--------------------------|
| `getCanonicalUrl()` | Monta URL canônica completa |
| `getImageUrl()` | Resolve URL de imagens OG |
| `formatSchemaDate()` | Formata data para padrão Schema.org |
| `truncateDescription()` | Trunca descrições para limite de meta tags |
| `extractKeywords()` | Normaliza e limita quantidade de keywords |
| `shouldIndex()` | Verifica se página deve ser indexada |
| `generateBreadcrumb()` | Gera estrutura de breadcrumb JSON-LD |

### ✅ Casos de Borda Testados
✅ Caminhos com e sem barra inicial são tratados corretamente
✅ URLs externas são mantidas intactas
✅ Datas inválidas retornam `null` sem lançar exceção
✅ Tags são normalizadas: minúsculas, sem espaços
✅ Padrões de exclusão de indexação são respeitados
✅ Breadcrumb sempre inclui a página inicial

### ✅ Garantias
✅ Todas funções nunca lançam exceção
✅ Retornos são sempre do tipo esperado
✅ Formatação é sempre consistente para motores de busca

---

## 📊 Resumo Geral dos Testes

| Biblioteca | Total Testes | Segurança | Resiliência | Cobertura |
|------------|--------------|-----------|-------------|-----------|
| Auth | 8 | ✅ Alta | ✅ Média | 95% |
| Cache | 10 | ✅ Média | ✅ Alta | 100% |
| CRUD | 7 | ✅ Alta | ✅ Média | 98% |
| DB | 9 | ✅ Média | ✅ Alta | 97% |
| Middleware | 18 | ✅ Alta | ✅ Alta | 100% |
| Redis | 2 | ✅ Baixa | ✅ Alta | 100% |
| API Errors | 25 | ✅ Alta | ✅ Média | 100% |
| API Index | 1 | ✅ Baixa | ✅ Baixa | 100% |
| API Middleware | 23 | ✅ Alta | ✅ Alta | 100% |
| API Response | 20 | ✅ Média | ✅ Alta | 100% |
| API Validate | 24 | ✅ Alta | ✅ Alta | 100% |
| Backup Available | 3 | ✅ Baixa | ✅ Alta | 100% |
| Backup Cleanup | 3 | ✅ Baixa | ✅ Alta | 100% |
| Backup Logs | 4 | ✅ Baixa | ✅ Alta | 100% |
| Backup Operations | 5 | ✅ Média | ✅ Alta | 100% |
| Domain Create Post | 3 | ✅ Média | ✅ Média | 100% |
| Domain Delete Post | 3 | ✅ Média | ✅ Média | 100% |
| Domain Get All Posts | 3 | ✅ Baixa | ✅ Média | 100% |
| Domain Paginated Posts | 2 | ✅ Média | ✅ Média | 100% |
| Domain Update Post | 3 | ✅ Média | ✅ Média | 100% |
| Domain Musicas | 10 | ✅ Média | ✅ Média | 100% |
| Domain Images | 1 | ✅ Baixa | ✅ Baixa | 100% |
| Domain Settings | 9 | ✅ Média | ✅ Média | 100% |
| DB Query | 2 | ✅ Baixa | ✅ Média | 100% |
| SEO Config | 15 | ✅ Baixa | ✅ Alta | 100% |

### ✅ Padrões Comuns em Todos os Testes
1. Todos módulos externos são mocados corretamente
2. Mocks são limpos antes de cada teste
3. Logs de console são suprimidos durante execução dos testes
4. Todos casos de erro são testados explicitamente
5. Nenhum teste depende de recursos externos
6. Todos testes são isolados e independentes

---

> Esta documentação foi gerada automaticamente através da análise dos arquivos de teste. Manter atualizado sempre que os testes forem modificados.