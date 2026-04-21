# Documentação Módulos Core /lib

**Arquivo gerado em: 20/04/2026**  
**Versão: 1.0**

---

## 📋 Sumário
Este documento contém a análise técnica e funcional de todos os módulos core da camada `/lib` do projeto Caminhar. Cada módulo é descrito com seu propósito, responsabilidades, funcionalidades e pontos importantes.

---

## 🔗 Diagrama de Dependências
```
redis.js
    ↓
cache.js    auth.js
    ↓         ↓
crud.js → db.js
    ↓         ↓
     middleware.js
```

---

---

## 📁 /lib/redis.js
**Tamanho: 8 linhas | Responsabilidade: Inicialização Cliente Redis**

### ✅ Propósito
Módulo mínimo responsável exclusivamente pela inicialização condicional do cliente Redis Upstash. É o ponto único de configuração do cache distribuído.

### 🔧 Funcionalidades
| Funcionalidade | Descrição |
|---|---|
| Inicialização Lazy | Cria instância do Redis **apenas se ambas variáveis de ambiente existirem** |
| Fallback Seguro | Retorna `null` quando não configurado, permitindo funcionamento sem cache |
| Zero Logica | Não contém nenhuma lógica de negócio, somente inicialização |

### 📤 Exportado
- `redis` - Instância configurada do cliente Upstash Redis ou `null`

### ℹ️ Observações
- Utiliza cliente REST do Upstash (não cliente nativo TCP)
- Funciona perfeitamente em ambientes serverless
- Não causa erros em ambientes de desenvolvimento sem Redis configurado

---

## 📁 /lib/db.js
**Tamanho: 178 linhas | Responsabilidade: Camada de Acesso ao Banco de Dados PostgreSQL**

### ✅ Propósito
Abstração de baixo nível para conexão e execução de consultas no PostgreSQL. Implementa Pool de conexões, transações e utilitários de banco.

### 🔧 Funcionalidades Principais
| Funcionalidade | Descrição |
|---|---|
| Pool de Conexões | Gerenciamento inteligente de conexões com configurações otimizadas |
| Lazy Initialization | Pool é criado apenas na primeira utilização (compatível com Jest) |
| Query Wrapper | Função `query()` com logging, tratamento de erros e suporte a clientes externos |
| Transações Automáticas | Função `transaction()` com rollback automático em caso de erro |
| Health Check | Verificação de saúde da conexão |
| Métricas | Coleta de informações sobre status, conexões ativas e tamanho do banco |

### 📤 Funções Exportadas
| Função | Descrição |
|---|---|
| `query(text, params, options)` | Executa consulta SQL parametrizada |
| `transaction(callback)` | Executa bloco dentro de transação atômica |
| `healthCheck()` | Verifica se conexão está ativa |
| `getDatabaseInfo()` | Retorna métricas e informações do banco |
| `resetPool()` | Reseta pool (apenas para testes) |
| `closeDatabase()` | Fecha todas as conexões do pool |

### ℹ️ Observações Importantes
- Pool configurado com **max 20 conexões**, min 2
- Timeout de conexão: 2 segundos
- Timeout conexão ociosa: 30 segundos
- SSL habilitado automaticamente em produção
- Todos os erros são logados com detalhes de tempo de execução

---

## 📁 /lib/crud.js
**Tamanho: 180 linhas | Responsabilidade: Camada CRUD Genérica e Segura**

### ✅ Propósito
Implementa operações CRUD genéricas 100% seguras contra SQL Injection. Não requer escrita manual de SQL para operações comuns.

### 🔧 Funcionalidades Principais
| Funcionalidade | Descrição |
|---|---|
| Validação de Identificadores | Verifica que nomes de tabelas e colunas contém apenas caracteres permitidos |
| Suporte a SQL Raw | Marcação segura para valores SQL estáticos (ex: `CURRENT_TIMESTAMP`) |
| Operações Padronizadas | Create, Update, Delete, Upsert com interface uniforme |
| Suporte a Transações | Aceita cliente externo para execução dentro de transações |
| Retorno Configurável | Possibilidade de definir campos retornados em cada operação |

### 📤 Funções Exportadas
| Função | Descrição |
|---|---|
| `createRecord(table, data, options)` | Cria um novo registro |
| `updateRecords(table, data, where, options)` | Atualiza registros correspondentes ao filtro |
| `deleteRecords(table, where, options)` | Remove registros correspondentes ao filtro |
| `upsertRecord(table, insert, conflict, update, options)` | Create ou Update com conflito |
| `raw(value)` | Marca string como SQL bruto seguro |

### ✅ Segurança
✅ **100% imune a SQL Injection**  
✅ Todas as consultas são parametrizadas  
✅ Nenhuma concatenação de string com entrada de usuário  
✅ Validação estrita de todos os identificadores SQL

---

## 📁 /lib/auth.js
**Tamanho: 172 linhas | Responsabilidade: Sistema Completo de Autenticação**

### ✅ Propósito
Módulo completo de autenticação com JWT, senhas seguras, cookies HTTP Only e middleware de proteção.

### 🔧 Funcionalidades Principais
| Funcionalidade | Descrição |
|---|---|
| Hash de Senhas | bcrypt com 10 rounds de salt |
| JWT Tokens | Geração e verificação de tokens com expiração de 1 hora |
| Cookies Seguros | HTTP Only, Secure em produção, SameSite Strict |
| Autenticação Flexível | Suporte tanto a Header Bearer quanto Cookies |
| Middleware Proteção | Função `withAuth()` para rotas protegidas |
| Inicialização Automática | Cria usuário admin padrão na primeira execução |
| Migração Automática | Adiciona coluna `role` caso tabela exista sem ela |

### 📤 Funções Exportadas
| Função | Descrição |
|---|---|
| `hashPassword(password)` | Cria hash seguro da senha |
| `verifyPassword(password, hash)` | Verifica correspondência de senha |
| `generateToken(user)` | Gera token JWT válido |
| `authenticate(username, password)` | Autentica usuário e retorna objeto |
| `withAuth(handler)` | Wrapper para rotas protegidas |
| `initializeAuth()` | Inicializa sistema e usuário admin |
| `getAuthToken(req)` | Extrai token de header ou cookie |

### ℹ️ Observações
- Token expira automaticamente após 1 hora
- Senha admin é lida exclusivamente de variáveis de ambiente
- Todos os erros de autenticação são logados
- Compatível tanto com browser quanto com clients API externos

---

## 📁 /lib/cache.js
**Tamanho: 122 linhas | Responsabilidade: Cache Distribuído e Rate Limit**

### ✅ Propósito
Abstração de cache com padrão Cache-Aside e Rate Limit distribuído com fallback seguro.

### 🔧 Funcionalidades Principais
| Funcionalidade | Descrição |
|---|---|
| Cache-Aside Pattern | Implementação padrão `getOrSetCache()` com TTL |
| Fallback Graceful | Se Redis falhar ou não existir, funciona normalmente sem cache |
| Tolerante a Falhas | Erros no Redis nunca quebram a requisição, somente geram log |
| Rate Limit Distribuído | Contagem de requisições compartilhada entre todas as instâncias |
| Rate Limit Fallback | Se Redis falhar, automaticamente cai para limite em memória |
| Whitelist IP | IPs locais nunca são limitados |
| Proteção Memory Leak | Limpa estrutura automaticamente se exceder 5000 entradas |

### 📤 Funções Exportadas
| Função | Descrição |
|---|---|
| `getOrSetCache(key, fetchFn, ttl)` | Busca do cache ou executa função e salva |
| `invalidateCache(key)` | Invalida chave específica do cache |
| `clearAllCache()` | Limpa todo o cache do Redis |
| `checkRateLimit(ip, endpoint, limit, window)` | Verifica limite de requisições |

### ℹ️ Observações
- TTL padrão: 1 hora
- Rate Limit padrão: 30 requisições / minuto
- Erros no Redis são sempre logados mas nunca propagados
- É o único ponto do sistema que implementa proteção DDoS básica

---

## 📁 /lib/middleware.js
**Tamanho: 219 linhas | Responsabilidade: Middlewares Compostos para API**

### ✅ Propósito
Conjunto de middlewares reutilizáveis e compostos para todas as rotas da API. Implementa preocupações transversais.

### 🔧 Funcionalidades Principais
| Funcionalidade | Descrição |
|---|---|
| CORS Configurado | Headers padrão, origens permitidas, tratamento preflight |
| Logger Estruturado | Logs padronizados com timestamp e metadados |
| Middleware Composição | Wrappers compostos para autenticação + CORS + tratamento de erros |
| Tratamento de Erros | Mapeamento automático de tipos de erro para códigos HTTP corretos |
| Rate Limit Básico | Limite em memória para endpoints sem proteção Redis |
| Headers Padrão | Adiciona headers comuns em todas as respostas |

### 📤 Middlewares Exportados
| Middleware | Descrição |
|---|---|
| `apiMiddleware(handler)` | Aplica CORS + tratamento de erros + headers padrão |
| `authenticatedApiMiddleware(handler)` | API Middleware + autenticação obrigatória |
| `externalAuthMiddleware(handler)` | Autenticação para APIs externas |
| `rateLimitMiddleware(handler)` | Limite de 100 requisições / 15 minutos |
| `errorHandlingMiddleware(handler)` | Tratamento centralizado de erros |

### 📤 Outros
- `logger` - Instância do logger padrão para uso em outros módulos

### ℹ️ Observações
- Stack trace é retornado apenas em ambiente de desenvolvimento
- Todos os erros retornam timestamp para facilitar debug
- CORS suporta múltiplas origens configuradas via variável de ambiente

---

---

## 📁 /lib/api/errors.js
**Tamanho: 291 linhas | Responsabilidade: Classes de Erro Customizadas Padronizadas**

### ✅ Propósito
Implementa hierarquia completa de erros customizados para toda a API. Todos os erros são tipados, possuem código HTTP correto, identificador único e formato padronizado.

### 🔧 Funcionalidades Principais
| Funcionalidade | Descrição |
|---|---|
| Hierarquia Completa | 9 classes de erro específicas para cada caso de uso |
| Request ID Único | Todo erro recebe um UUID v4 automaticamente para rastreabilidade |
| Formato Padronizado | Método `toJSON()` que converte erro para formato de resposta API |
| Stack Trace Preservado | Mantém stack trace original para debug |
| Metadados Customizados | Suporte a anexar dados adicionais em todos os erros |

### 📤 Classes Exportadas
| Classe | Código HTTP | Código Erro |
|---|---|---|
| `ApiError` | 500 | `INTERNAL_ERROR` |
| `ValidationError` | 400 | `VALIDATION_ERROR` |
| `AuthenticationError` | 401 | `AUTHENTICATION_ERROR` |
| `ForbiddenError` | 403 | `FORBIDDEN_ERROR` |
| `NotFoundError` | 404 | `NOT_FOUND_ERROR` |
| `ConflictError` | 409 | `CONFLICT_ERROR` |
| `RateLimitError` | 429 | `RATE_LIMIT_ERROR` |
| `ServerError` | 500 | `SERVER_ERROR` |
| `ServiceUnavailableError` | 503 | `SERVICE_UNAVAILABLE` |
| `MethodNotAllowedError` | 405 | `METHOD_NOT_ALLOWED` |

### ℹ️ Observações
- Todas as classes estendem a classe nativa `Error`
- Compatível 100% com `instanceof`
- Nenhuma informação sensível é retornada por padrão
- Inclui exemplo de uso na documentação de cada método

---

## 📁 /lib/api/response.js
**Tamanho: 493 linhas | Responsabilidade: Padronizador de Respostas da API**

### ✅ Propósito
Camada padrão para TODAS as respostas da API. Garante 100% de consistência no formato de retorno, headers HTTP e códigos de status.

### 🔧 Funcionalidades Principais
| Funcionalidade | Descrição |
|---|---|
| Respostas de Sucesso | `success()`, `created()`, `updated()`, `deleted()`, `paginated()`, `accepted()` |
| Respostas de Erro | Todas as respostas de erro padronizadas correspondentes as classes de erro |
| Paginação Automática | Cálculo automático de páginas, hasNext, hasPrev e totalPages |
| Headers Automáticos | Adiciona Location, Allow, Retry-After automaticamente quando aplicável |
| Tratamento Genérico | Função `handleError()` que detecta classes de erro customizadas automaticamente |
| Request ID | Todo retorno recebe UUID único para rastreabilidade |

### 📤 Funções Exportadas
✅ 12 funções de resposta de sucesso  
✅ 9 funções de resposta de erro  
✅ Função genérica de tratamento de erros

### ℹ️ Observações
- Todo retorno segue exatamente o mesmo formato: `{ success: boolean, data/error: {}, meta: {} }`
- Stack trace é adicionado automaticamente apenas em ambiente de desenvolvimento
- Headers HTTP padrão são adicionados conforme especificação HTTP/1.1
- Todos os exemplos estão documentados na função

---

## 📁 /lib/api/validate.js
**Tamanho: 311 linhas | Responsabilidade: Middlewares de Validação com Zod**

### ✅ Propósito
Sistema completo de validação de entrada integrado com Zod. Valida automaticamente body, query params, route params e headers.

### 🔧 Funcionalidades Principais
| Funcionalidade | Descrição |
|---|---|
| Validação Body | Aplicado automaticamente apenas em métodos POST/PUT/PATCH |
| Validação Query Params | Suporte a transformações e valores padrão |
| Validação Route Params | Para rotas dinâmicas do Next.js |
| Validação Headers | Suporte a case insensitive |
| Validação Completa | Valida múltiplas partes da requisição de uma única vez e retorna todos os erros |
| Formato Padronizado | Converte erros do Zod para formato padrão da API |
| Schemas Prontos | Helpers para criar rapidamente schemas de paginação e busca |

### 📤 Middlewares Exportados
| Middleware | Descrição |
|---|---|
| `validateBody(schema)` | Valida corpo da requisição |
| `validateQuery(schema)` | Valida parâmetros da URL |
| `validateParams(schema)` | Valida parâmetros de rota |
| `validateHeaders(schema)` | Valida headers |
| `validateRequest({ body, query, params })` | Valida tudo de uma vez |

### ℹ️ Observações
- Não requer verificação manual no handler
- Dados já vem convertidos e sanitizados no objeto `req`
- Todos os erros são retornados de uma só vez (não falha no primeiro erro)
- Inclui helpers para paginação padrão já configurados

---

## 📁 /lib/api/middleware.js
**Tamanho: 486 linhas | Responsabilidade: Sistema de Composição de Middlewares**

### ✅ Propósito
Sistema de composição de middlewares para Next.js API Routes com padrões pré-configurados e prontos para uso.

### 🔧 Funcionalidades Principais
| Funcionalidade | Descrição |
|---|---|
| Composição Funcional | Função `composeMiddleware()` que combina múltiplos middlewares |
| Controle de Métodos | Verifica automaticamente métodos HTTP permitidos |
| Autenticação | Middleware `withAuth()` com suporte a roles e opcional |
| Rate Limiting | Limite de requisições com suporte a limites dinâmicos baseado no usuário |
| CORS Padronizado | Configuração completa de CORS com origens permitidas |
| Tratamento de Erros | Captura todos os erros e retorna resposta padronizada |
| Logging Estruturado | Log automático de todas as requisições com tempo de execução |
| Timeout | Protege contra requisições que demoram muito tempo |
| Presets Prontos | `publicApi()` e `protectedApi()` com combinação padrão de middlewares |

### 📤 Middlewares Exportados
✅ 11 middlewares individuais  
✅ 2 presets compostos prontos para uso

### ℹ️ Observações
- Ordem de execução é garantida (da esquerda para direita)
- Todos os middlewares são async/await compatíveis
- Headers de Rate Limit são adicionados automaticamente
- Preflight OPTIONS é respondido automaticamente

---

## 📁 /lib/api/index.js
**Tamanho: 87 linhas | Responsabilidade: Ponto de Entrada Centralizado**

### ✅ Propósito
Arquivo barrel que exporta todos os módulos do API Standardizer de forma centralizada. Único ponto de importação para todo o sistema.

### 🔧 Funcionalidades Principais
| Funcionalidade | Descrição |
|---|---|
| Exportação Named | Todos os itens são exportados individualmente para tree shaking |
| Exportação Default | Objeto agrupado por categoria para importação fácil |
| Sem Duplicação | Todo o ecossistema API é importado de um único lugar |
| Versão Centralizada | Versão do Standardizer é definida aqui |

### 📤 Exportado
- Todas as classes de erro
- Todas as funções de resposta
- Todos os middlewares de validação
- Todos os middlewares de composição
- Objeto padrão agrupado por módulos

---

---

## 📁 /lib/domain/audit.js
**Tamanho: 19 linhas | Responsabilidade: Sistema de Log de Auditoria**

### ✅ Propósito
Módulo mínimo para registro de atividades de usuário no sistema. Todas as alterações em dados são rastreadas através deste módulo.

### 🔧 Funcionalidades Principais
| Funcionalidade | Descrição |
|---|---|
| Log de Atividades | Registra todas as ações CREATE/UPDATE/DELETE no sistema |
| Suporte a Transações | Aceita cliente externo para execução dentro de transações atômicas |
| Dados Rastreados | Usuário, ação, entidade, ID, detalhes e IP da requisição |

### 📤 Funções Exportadas
| Função | Descrição |
|---|---|
| `logActivity(username, action, entityType, entityId, details, ipAddress, options)` | Registra atividade no log de auditoria |

### ℹ️ Observações
- Log é gravado de forma assíncrona sem bloquear a requisição
- Não retorna erro em caso de falha no log para não quebrar a operação principal
- Dados são armazenados na tabela `activity_logs`

---

## 📁 /lib/domain/images.js
**Tamanho: 37 linhas | Responsabilidade: Gerenciamento de Metadados de Imagens**

### ✅ Propósito
Valida e armazena metadados de imagens carregadas no sistema. Utiliza Zod para validação estrita antes de persistir no banco.

### 🔧 Funcionalidades Principais
| Funcionalidade | Descrição |
|---|---|
| Validação Zod | Schema completo para todos os campos de metadados |
| Sanitização Automática | Todos os dados são validados antes de chegar no banco |
| Suporte a Transações | Compatível com operações transacionais |

### 📤 Funções Exportadas
| Função | Descrição |
|---|---|
| `saveImage(filename, relativePath, type, fileSize, userId, options)` | Salva metadados da imagem após validação |

### ℹ️ Observações
- Valida tipo, tamanho e integridade dos dados
- É chamado automaticamente após upload físico do arquivo
- Retorna o registro completo criado

---

## 📁 /lib/domain/musicas.js
**Tamanho: 114 linhas | Responsabilidade: Domínio Módulo Músicas**

### ✅ Propósito
Camada de domínio para o recurso Músicas. Implementa todas as operações de negócio para gerenciamento de músicas.

### 🔧 Funcionalidades Principais
| Funcionalidade | Descrição |
|---|---|
| CRUD Completo | Create, Read, Update, Delete padronizados |
| Paginação | Consulta paginada com busca e filtros |
| Busca Fulltext | Busca em título e artista |
| Ordenação Padrão | Ordem por posição + data de criação |
| Suporte a Rascunhos | Filtro para publicados / não publicados |
| Alias Compatibilidade | Suporta ambos formatos de retorno para compatibilidade com componentes genéricos |

### 📤 Funções Exportadas
| Função | Descrição |
|---|---|
| `getAllMusicas(search)` | Retorna todas as músicas com busca opcional |
| `getPaginatedMusicas(page, limit, search, publishedOnly)` | Consulta paginada |
| `createMusica(musica, options)` | Cria nova música |
| `updateMusica(id, musica, options)` | Atualiza música existente |
| `deleteMusica(id, options)` | Remove música |

### ℹ️ Observações
- Utiliza as funções genéricas do CRUD base
- Possui `raw('CURRENT_TIMESTAMP')` para datas automáticas
- Ordenação manual por posição é suportada

---

## 📁 /lib/domain/posts.js
**Tamanho: 186 linhas | Responsabilidade: Domínio Módulo Posts / Artigos**

### ✅ Propósito
Camada de domínio para o recurso Posts / Artigos. É o primeiro módulo domínio implementado com padrões completos e transação com auditoria.

### 🔧 Funcionalidades Principais
| Funcionalidade | Descrição |
|---|---|
| CRUD Completo | Operações padrão |
| Multi Visualização | Consultas separadas para público e administração |
| Paginação | Paginação completa com busca |
| Transação Atômica | Operação que combina criação de post + log de auditoria na mesma transação |
| Padrão Novo | Implementa o padrão de retorno com chave `data` para compatibilidade com `useAdminCrud` |

### 📤 Funções Exportadas
| Função | Descrição |
|---|---|
| `getRecentPosts(limit, page, search)` | Posts públicos recentes para frontend |
| `getAllPosts()` | Todos os posts para admin |
| `getPaginatedPosts(page, limit, search)` | Consulta paginada administrativa |
| `createPost(post, options)` | Cria novo post |
| `updatePost(id, post, options)` | Atualiza post |
| `deletePost(id, options)` | Remove post |
| `createPostWithAudit(postData, auditData)` | Cria post + log de auditoria em transação única |

### ℹ️ Observações
- É o módulo referência para implementação de novos domínios
- Demonstra o padrão correto de utilização de transações entre múltiplos módulos
- Busca funciona tanto no título quanto no conteúdo completo do artigo
- Mantém compatibilidade com versões antigas e novas interfaces

---

---

## 📁 /lib/domain/settings.js
**Tamanho: 65 linhas | Responsabilidade: Sistema de Configurações Dinâmicas**

### ✅ Propósito
Gerenciamento de configurações dinâmicas armazenadas no banco de dados. Permite alterar configurações do sistema sem deploy de código.

### 🔧 Funcionalidades Principais
| Funcionalidade | Descrição |
|---|---|
| Chave Valor | Armazenamento genérico no formato key/value |
| Upsert Automático | Cria ou atualiza configuração automaticamente |
| Valor Padrão | Suporte a valor padrão quando configuração não existe |
| JSON Nativo | Suporta qualquer tipo de dado serializável em JSON |

### 📤 Funções Exportadas
| Função | Descrição |
|---|---|
| `getSetting(key, defaultValue)` | Retorna valor de uma configuração específica |
| `getSettings()` | Retorna todas as configurações como objeto |
| `getAllSettings()` | Retorna todas as configurações com metadados |
| `updateSetting(key, value, type, description)` | Cria ou atualiza configuração |
| `setSetting` | Alias para `updateSetting` |

### ℹ️ Observações
- Utiliza a função `upsertRecord()` do CRUD genérico
- Datas de atualização são definidas automaticamente com `CURRENT_TIMESTAMP`
- Consultas são executadas sem log para não poluir os logs

---

## 📁 /lib/domain/videos.js
**Tamanho: 153 linhas | Responsabilidade: Domínio Módulo Vídeos**

### ✅ Propósito
Camada de domínio para gerenciamento de vídeos. Implementa padrão completo de domínio com ordenação manual e separação de consultas públicas/administrativas.

### 🔧 Funcionalidades Principais
| Funcionalidade | Descrição |
|---|---|
| CRUD Completo | Operações padrão Create/Read/Update/Delete |
| Separação de Acesso | Consultas diferentes para público e admin |
| Busca | Pesquisa em título e descrição |
| Ordenação Manual | Sistema de posicionamento com atualização em lote transacional |
| Paginação | Consulta paginada com metadados completos |

### 📤 Funções Exportadas
| Função | Descrição |
|---|---|
| `getPaginatedVideos(page, limit, search)` | Consulta administrativa completa |
| `getPublicPaginatedVideos(page, limit, search)` | Consulta pública somente com vídeos publicados |
| `createVideo(videoData)` | Cria novo vídeo com posição automática |
| `updateVideo(id, videoData)` | Atualiza vídeo existente |
| `deleteVideo(id)` | Remove vídeo |
| `reorderVideos(items)` | Atualiza posições em transação atômica |

### ℹ️ Observações
- É o primeiro módulo a implementar o padrão de ordenação manual
- Demonstra o uso correto de transações para operações em lote
- Posição é calculada automaticamente na criação de novos registros
- Garante que somente vídeos publicados sejam retornados na API pública

---

## 📁 /lib/seo/config.js
**Tamanho: 249 linhas | Responsabilidade: Configurações Centralizadas SEO**

### ✅ Propósito
Ponto único de verdade para todas as configurações de SEO, metadados e marca do projeto. Centraliza configurações que são usadas em múltiplos locais da aplicação.

### 🔧 Funcionalidades Principais
| Funcionalidade | Descrição |
|---|---|
| Configuração Global | Dados do site, autor, redes sociais e contato |
| Schema.org | Estruturas completas de Organization e WebSite |
| Sitemap Config | Parâmetros de frequência e prioridade para sitemap |
| Caminhos NoIndex | Lista de rotas que não devem ser indexadas |
| Funções Utilitárias | Helpers para URL canônica, imagens, datas, truncamento de texto |

### 📤 Exportado
| Item | Descrição |
|---|---|
| `siteUrl` | URL base do site |
| `siteConfig` | Objeto completo com todas as configurações |
| `getCanonicalUrl(path)` | Gera URL canônica completa |
| `getImageUrl(path)` | Normaliza URL de imagens |
| `formatSchemaDate(date)` | Formata data para padrão ISO 8601 |
| `truncateDescription(text, max)` | Trunca texto para meta description |
| `extractKeywords(tags, max)` | Extrai keywords de tags |
| `shouldIndex(path)` | Verifica se rota deve ser indexada |
| `generateBreadcrumb(items)` | Gera estrutura de breadcrumb |

### ℹ️ Observações
- Todas as URLs são geradas dinamicamente baseado na variável de ambiente `SITE_URL`
- Funciona corretamente tanto em desenvolvimento quanto em produção
- É a fonte de verdade para dados que aparecem em múltiplas páginas
- Inclui todos os padrões recomendados para SEO moderno

---

## 📌 Observações Gerais da Arquitetura

✅ **Padrões Utilizados:**
- Todas as camadas tem responsabilidade única
- Dependências são unidirecionais
- Nenhuma camada conhece detalhes de implementação da camada superior
- Todos os módulos tem fallback seguro
- Tratamento de erro consistente em toda a camada
- Logs padronizados com contexto

✅ **Pontos Fortes:**
- Baixo acoplamento entre módulos
- Alta testabilidade (todos os módulos suportam mocking)
- Tolerante a falhas em componentes externos
- Segurança por padrão em todas as operações
- Compatibilidade total com ambientes serverless

✅ **Versão Atual:** Todos os módulos estão em versão estável e utilizados em produção.