# Documentação dos Endpoints API /pages/api/

> Documentação técnica dos endpoints da API do projeto Caminhar.
> Arquivos analisados: 4 endpoints públicos e administrativos.

---

## 📑 Índice
1. [`/api/cleanup-test-data.js`](#apicleanup-test-datajs)
2. [`/api/dicas.js`](#apidicasjs)
3. [`/api/musicas.js`](#apimusicasjs)
4. [`/api/placeholder-image.js`](#apiplaceholder-imagejs)
5. [`/api/posts.js`](#apipostsjs)
6. [`/api/products.js`](#apiproductsjs)
7. [`/api/settings.js`](#apisettingsjs)
8. [`/api/upload-image.js`](#apiupload-imagejs)
9. [`/api/videos.js`](#apivideosjs)
10. [`/api/auth/login.js`](#apiauthloginjs)
11. [`/api/auth/logout.js`](#apiauthlogoutjs)
12. [`/api/v1/health.js`](#apiv1healthjs)
13. [`/api/v1/status.js`](#apiv1statusjs)
14. [`/api/v1/posts.js`](#apiv1postsjs)
15. [`/api/v1/settings.js`](#apiv1settingsjs)
16. [`/api/v1/auth/check.js`](#apiv1authcheckjs)
17. [`/api/v1/auth/login.js`](#apiv1authloginjs)
18. [`/api/v1/videos/[id].js`](#apiv1videosidjs)
19. [`/api/admin/audit.js`](#apiadminauditjs)
20. [`/api/admin/backups.js`](#apiadminbackupsjs)
21. [`/api/admin/cache.js`](#apiadmincachejs)
22. [`/api/admin/dicas.js`](#apiadmindicasjs)
23. [`/api/admin/fetch-ml.js`](#apiadminfetch-mljs)
24. [`/api/admin/fetch-spotify.js`](#apiadminfetch-spotifyjs)
25. [`/api/admin/fetch-youtube.js`](#apiadminfetch-youtubejs)
26. [`/api/admin/musicas.js`](#apiadminmusicasjs)
27. [`/api/admin/posts.js`](#apiadminpostsjs)
28. [`/api/admin/rate-limit.js`](#apiadminrate-limitjs)
29. [`/api/admin/roles.js`](#apiadminrolesjs)
30. [`/api/admin/stats.js`](#apiadminstatsjs)
31. [`/api/admin/users.js`](#apiadminusersjs)
32. [`/api/admin/videos.js`](#apiadminvideosjs)

---

## 🔒 `/api/cleanup-test-data.js`

### Propósito Geral
Endpoint administrativo exclusivo para limpeza de dados de teste gerados durante os testes de carga e desenvolvimento.

### Características
| Item | Detalhe |
|------|---------|
| Método HTTP permitido | `DELETE` |
| Autenticação | ✅ Obrigatória (middleware `withAuth`) |
| Permissão | Apenas usuário Administrador |
| Cache | ❌ Sem cache |

### Funcionamento
1.  Valida que a requisição é do tipo `DELETE`
2.  Dupla verificação de segurança: confirma que o usuário autenticado é administrador
3.  Remove todos os posts de teste com padrão de slug `post-carga-%`
4.  Retorna quantidade de registros excluídos

### Respostas
| Status | Descrição |
|--------|-----------|
| 200 OK | Dados limpos com sucesso, retorna contagem de linhas alteradas |
| 403 Forbidden | Usuário não tem permissão administrativa |
| 405 Method Not Allowed | Método HTTP diferente de DELETE |
| 500 Internal Error | Falha na execução da exclusão no banco |

> ℹ️  Este endpoint é utilizado exclusivamente nos pipelines de teste e ambientes de desenvolvimento. **Nunca deve ser chamado em produção.**

---

## 📌 `/api/dicas.js`

### Propósito Geral
Endpoint público que retorna todas as dicas publicadas no sistema.

### Características
| Item | Detalhe |
|------|---------|
| Método HTTP permitido | `GET` |
| Autenticação | ❌ Não requerida |
| Cache | ❌ Sem cache definido |

### Funcionamento
1.  Aceita apenas requisições `GET`
2.  Consulta tabela `dicas` filtrando apenas registros publicados (`published = true`)
3.  Ordena resultados por ID em ordem crescente
4.  Retorna campos: `id`, `name`, `content`

### Respostas
| Status | Descrição |
|--------|-----------|
| 200 OK | Retorna array com todas as dicas publicadas |
| 405 Method Not Allowed | Método HTTP diferente de GET |
| 500 Internal Error | Falha ao consultar banco de dados |

> ℹ️  Este endpoint é utilizado na página inicial para exibição das dicas do dia.

---

## 🎵 `/api/musicas.js`

### Propósito Geral
Endpoint público com paginação, filtro e busca para listagem de músicas publicadas. É o endpoint mais utilizado da API.

### Características
| Item | Detalhe |
|------|---------|
| Método HTTP permitido | `GET` |
| Autenticação | ❌ Não requerida |
| Cache | ✅ Cache Server-side: 60 segundos + stale-while-revalidate 300s |
| Validação | ✅ Validação de parâmetros com Zod |

### Parâmetros aceitos
| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `page` | Inteiro positivo | `1` | Número da página |
| `limit` | Inteiro positivo | `10` | Quantidade de registros por página |
| `search` | String | *opcional* | Termo para busca no título/descrição das músicas |

### Funcionamento
1.  Valida e sanitiza todos os parâmetros de entrada utilizando schema Zod
2.  Aplica política de cache otimizada para performance
3.  Chama função de domínio `getPaginatedMusicas()` que retorna apenas músicas publicadas
4.  Retorna resposta padronizada com dados e metadados de paginação

### Respostas
| Status | Descrição |
|--------|-----------|
| 200 OK | Retorna objeto estruturado com `success: true`, `data` e `pagination` |
| 400 Bad Request | Parâmetros inválidos, retorna erros detalhados por campo |
| 405 Method Not Allowed | Método HTTP diferente de GET |
| 500 Internal Error | Falha interna no servidor |

> ℹ️  Este é o endpoint com maior tráfego e foi otimizado com cache inteligente, validação rigorosa e tratamento de erros padronizado.

---

## 🖼️ `/api/placeholder-image.js`

### Propósito Geral
Endpoint dinâmico que serve a imagem principal da página inicial com sistema de fallback inteligente.

### Características
| Item | Detalhe |
|------|---------|
| Método HTTP permitido | `GET` |
| Autenticação | ❌ Não requerida |
| Cache | ✅ Cache agressivo: 24 horas imutável |
| Fallback | ✅ 3 níveis de fallback |

### Funcionamento (ordem de prioridade)
1.  **Primeiro tenta**: Busca URL da imagem definida na configuração do banco de dados (`home_image_url`)
2.  **Segundo fallback**: Se não encontrar no banco, procura a imagem mais recente na pasta `/public/uploads` com padrão `hero-image-*`
3.  **Terceiro fallback**: Se nenhuma imagem for encontrada, gera e retorna um SVG placeholder padrão com instruções

### Funcionalidades adicionais
- Detecção automática de tipo de conteúdo (PNG, WebP, JPEG)
- Headers de cache otimizados para performance máxima
- Tratamento de falhas silenciosas (avisos apenas no log do servidor)
- ETag e Last-Modified para validação de cache no navegador

### Respostas
| Status | Descrição |
|--------|-----------|
| 200 OK | Retorna binário da imagem ou SVG com headers corretos |
| 500 Internal Error | Falha crítica no carregamento |

> ℹ️  Este endpoint resolve o problema de imagem padrão sempre retornando algo para o frontend, nunca ficando vazio. É utilizado na página inicial como hero image.

---

## ✅ `/api/v1/status.js`

### Propósito Geral
Endpoint de Status completo da API v1 com diagnóstico de conectividade com banco de dados.

### Características
| Item | Detalhe |
|------|---------|
| Método HTTP permitido | `GET` |
| Autenticação | ❌ Público |
| Diagnósticos | ✅ API, ✅ Banco de Dados, ✅ Sistema |

### Dados retornados
✅ Versão da API e ambiente de execução
✅ Status e detalhes da conexão com PostgreSQL
✅ Versão do Node.js, plataforma e tempo de uptime do processo
✅ Timestamp ISO 8601 em todas as respostas

---

## 🔑 `/api/v1/auth/check.js`

### Propósito Geral
Endpoint de validação de token para integrações externas da API v1.

### Características
| Item | Detalhe |
|------|---------|
| Método HTTP permitido | `GET` |
| Autenticação | ✅ Token JWT no Header ou Cookie |
| Funcionamento | Valida token e retorna dados do usuário autenticado |

### Funcionamento
- Busca token automaticamente no Header Authorization ou Cookie
- Valida assinatura e expiração do token
- Retorna informações básicas do usuário: userId, username e role
- Respostas padronizadas com timestamp para integrações

---

## 🔐 `/api/v1/auth/login.js`

### Propósito Geral
Endpoint de autenticação oficial para a API v1 externa.

### Características
| Item | Detalhe |
|------|---------|
| Método HTTP permitido | `POST` |
| Autenticação | ❌ Público |
| Retorno | Token JWT direto no corpo da resposta |
| Expiração Token | ✅ 1 hora |

### Funcionamento
1.  Valida credenciais utilizando a mesma função `authenticate()` do login administrativo
2.  Atualiza timestamp de último login do usuário
3.  Retorna token no formato Bearer padrão com dados do usuário
4.  Não define cookie, ideal para integrações externas e aplicações third-party

---

## 🎬 `/api/v1/videos/[id].js`

### Propósito Geral
Endpoint REST dinâmico da API v1 para gerenciamento individual de vídeos.

### Características
| Item | Detalhe |
|------|---------|
| Métodos HTTP permitidos | `PUT`, `DELETE` |
| Autenticação | ✅ Obrigatória |
| Parâmetro Dinâmico | `id` numérico do vídeo |

### Funcionamento
- `PUT`: Atualiza dados de um vídeo específico
- `DELETE`: Remove um vídeo permanentemente
- Validação automática do ID numérico
- Invalida cache público automaticamente após alterações

---

## 🚪 `/api/auth/logout.js`

### Propósito Geral
Endpoint público de desautenticação que encerra a sessão do usuário.

### Características
| Item | Detalhe |
|------|---------|
| Método HTTP permitido | `GET` / `POST` |
| Autenticação | ❌ Público |
| Funcionamento | Limpa cookie de autenticação definindo expiração para o passado |
| Segurança | ✅ SameSite Strict, HttpOnly |

### Funcionamento
- Remove o cookie `token` definindo data de expiração para 01 Jan 1970
- Funciona com qualquer método HTTP
- Sempre retorna sucesso independentemente do estado anterior

---

## ✅ `/api/v1/health.js`

### Propósito Geral
Endpoint de Health Check público para monitoramento e load balancers.

### Características
| Item | Detalhe |
|------|---------|
| Método HTTP permitido | `GET` |
| Autenticação | ❌ Público |
| Performance | ✅ Zero processamento, retorno imediato |
| Latência | < 1ms |

### Funcionamento
- Retorna imediatamente status 200 OK sem nenhuma operação no banco ou cache
- Utilizado por serviços de monitoramento, Uptime Robot e load balancers
- Serve para confirmar que a aplicação está rodando e respondendo

---

## 📝 `/api/v1/posts.js`

### Propósito Geral
Endpoint API pública v1 para integrações externas e gerenciamento de posts.

### Características
| Item | Detalhe |
|------|---------|
| Métodos HTTP permitidos | `GET`, `POST` |
| Autenticação | ✅ Apenas para método POST |
| Cache | ✅ GET: 1 hora |
| Validação | ✅ Zod schema completo |

### Funcionamento
- `GET`: Retorna todos os posts publicados com cache de 3600 segundos
- `POST`: Cria novo post, requer autenticação e validação completa
- Invalida cache automaticamente após criação de novos posts

---

## ⚙️ `/api/v1/settings.js`

### Propósito Geral
Endpoint API pública v1 para gerenciamento das configurações do sistema para integrações externas.

### Características
| Item | Detalhe |
|------|---------|
| Métodos HTTP permitidos | `GET`, `POST`, `PUT` |
| Autenticação | ✅ Obrigatória para todos os métodos |
| Permissões | GET: Admin / Editor; POST/PUT: Apenas Admin |
| Cache | ✅ 30 minutos |

### Funcionalidades
✅ Consulta de configurações individuais ou todas de uma vez
✅ Criação e atualização de configurações
✅ Invalidação automática de cache após alterações
✅ Validação de permissões por operação
✅ Respostas padronizadas com timestamp para integrações

---

## 📝 `/api/posts.js`

### Propósito Geral
Endpoint público para listagem de posts com paginação, busca, cache inteligente e rate limit.

### Características
| Item | Detalhe |
|------|---------|
| Método HTTP permitido | `GET` |
| Autenticação | ❌ Não requerida |
| Cache | ✅ Cache Redis inteligente por chave dinâmica |
| Rate Limit | ✅ Aplicado apenas em cache miss |

### Parâmetros aceitos
| Parâmetro | Tipo | Padrão | Validação | Descrição |
|-----------|------|--------|-----------|-----------|
| `page` | Inteiro | `1` | Mínimo 1 | Número da página |
| `limit` | Inteiro | `10` | 1 até 100 | Quantidade de registros por página |
| `search` | String | `''` | *opcional* | Termo para busca nos posts |

### Funcionamento
1.  Valida e sanitiza parâmetros de paginação corrigindo bug com valor `0`
2.  Gera chave de cache dinâmica incluindo termo de busca apenas quando presente
3.  Aplica Rate Limit **somente** quando ocorre miss no cache, evitando penalizar requisições rápidas
4.  Padroniza resposta com flag `success` para compatibilidade com frontend

### Respostas
| Status | Descrição |
|--------|-----------|
| 200 OK | Retorna posts com dados de paginação |
| 400 Bad Request | Parâmetros de paginação inválidos |
| 405 Method Not Allowed | Método diferente de GET |
| 429 Too Many Requests | Rate Limit excedido |
| 500 Internal Error | Falha interna |

> ℹ️  Este endpoint implementa uma otimização única onde o rate limit não é aplicado para requisições que são servidas diretamente do cache, melhorando muito a performance geral.

---

## 📦 `/api/products.js`

### Propósito Geral
Endpoint completo CRUD para gerenciamento de produtos, com filtros avançados, autenticação condicional e log de auditoria.

### Características
| Item | Detalhe |
|------|---------|
| Métodos HTTP permitidos | `GET`, `POST`, `PUT`, `DELETE` |
| Autenticação | ✅ Apenas para operações de escrita |
| Cache | ❌ Sem cache (sempre atualizado) |
| Rate Limit | ✅ 30 requisições/minuto para escrita |
| Auditoria | ✅ Log completo de todas as alterações |

### Funcionalidades
✅ Listagem pública com filtros por preço mínimo/máximo e busca
✅ Visualização condicional de rascunhos apenas para administradores
✅ Formatação automática de moeda com padrão `R$`
✅ Reordenação em massa via drag & drop
✅ Invalidação automática de cache após alterações
✅ Log completo de todas as operações com IP e usuário

### Respostas
| Status | Descrição |
|--------|-----------|
| 200 OK | Dados retornados com sucesso |
| 201 Created | Produto criado com sucesso |
| 401 Unauthorized | Sem autenticação para escrita |
| 405 Method Not Allowed | Método não suportado |
| 429 Too Many Requests | Rate Limit excedido |
| 500 Internal Error | Falha interna |

> ℹ️  Este é o endpoint mais complexo da API, suportando tanto uso público pela vitrine quanto administrativo pelo painel de gestão.

---

## ⚙️ `/api/settings.js`

### Propósito Geral
Endpoint para consulta e atualização das configurações globais do sistema.

### Características
| Item | Detalhe |
|------|---------|
| Métodos HTTP permitidos | `GET`, `PUT` |
| Autenticação | ✅ Apenas para método PUT |
| Cache | ✅ GET: 60s + stale-while-revalidate 300s |
| Validação | ✅ Zod schema para atualizações |

### Funcionamento
- `GET`: Retorna todas as configurações públicas do sistema com cache otimizado
- `PUT`: Atualiza uma configuração específica, requer autenticação administrativa e validação de schema

### Respostas
| Status | Descrição |
|--------|-----------|
| 200 OK | Configurações retornadas ou atualizadas |
| 400 Bad Request | Dados inválidos na atualização |
| 401 Unauthorized | Sem permissão para alterar |
| 405 Method Not Allowed | Método não suportado |
| 500 Internal Error | Falha interna |

---

## 📤 `/api/upload-image.js`

### Propósito Geral
Endpoint seguro para upload de imagens com validação e processamento automático.

### Características
| Item | Detalhe |
|------|---------|
| Método HTTP permitido | `POST` |
| Autenticação | ✅ Middleware `externalAuthMiddleware` |
| Tamanho máximo | 5 MB |
| Formatos permitidos | JPEG, PNG, WebP, GIF |

### Funcionamento
1.  Cria diretório de upload automaticamente se não existir
2.  Valida tipo e tamanho do arquivo antes de processar
3.  Remove arquivos inválidos imediatamente para não ocupar espaço
4.  Renomeia arquivo com timestamp e prefixo adequado
5.  Atualiza automaticamente configuração da imagem principal quando solicitado
6.  Retorna caminho público acessível da imagem

### Respostas
| Status | Descrição |
|--------|-----------|
| 200 OK | Upload realizado com sucesso, retorna URL da imagem |
| 400 Bad Request | Arquivo inválido, formato não suportado ou tamanho excedido |
| 405 Method Not Allowed | Método diferente de POST |
| 500 Internal Error | Falha no processamento do upload |

> ℹ️  Este endpoint desativa o body parser padrão do Next.js para funcionar corretamente com uploads multipart/form-data.

---

## 🎬 `/api/videos.js`

### Propósito Geral
Endpoint público para listagem de vídeos publicados com paginação, busca e cache inteligente.

### Características
| Item | Detalhe |
|------|---------|
| Método HTTP permitido | `GET` |
| Autenticação | ❌ Não requerida |
| Cache | ✅ Cache Redis por chave dinâmica |
| Rate Limit | ✅ Aplicado apenas em cache miss |

### Parâmetros aceitos
| Parâmetro | Tipo | Padrão | Validação | Descrição |
|-----------|------|--------|-----------|-----------|
| `page` | Inteiro | `1` | Mínimo 1 | Número da página |
| `limit` | Inteiro | `10` | 1 até 100 | Quantidade de registros por página |
| `search` | String | `''` | *opcional* | Termo para busca nos vídeos |

### Funcionamento
1.  Valida parâmetros de paginação
2.  Utiliza função de domínio dedicada `getPublicPaginatedVideos()` que retorna apenas vídeos publicados
3.  Aplica Rate Limit somente quando não há cache disponível
4.  Padroniza resposta com flag `success`

### Respostas
| Status | Descrição |
|--------|-----------|
| 200 OK | Retorna vídeos com dados de paginação |
| 400 Bad Request | Parâmetros inválidos |
| 405 Method Not Allowed | Método diferente de GET |
| 429 Too Many Requests | Rate Limit excedido |
| 500 Internal Error | Falha interna |

---

## 🔍 `/api/admin/audit.js`

### Propósito Geral
Endpoint administrativo para consulta do log de auditoria de todas as ações realizadas no sistema.

### Características
| Item | Detalhe |
|------|---------|
| Método HTTP permitido | `GET` |
| Autenticação | ✅ Obrigatória |
| Permissões | Administrador, Auditoria ou Segurança |
| Cache | ❌ Sem cache |

### Funcionamento
1.  Verifica autenticação e permissões do usuário
2.  Suporta filtros por período (data inicial e final)
3.  Cria automaticamente tabela de logs se não existir (instalação limpa)
4.  Retorna registros ordenados por data decrescente

### Respostas
| Status | Descrição |
|--------|-----------|
| 200 OK | Retorna logs de auditoria com paginação |
| 401 Unauthorized | Sem autenticação |
| 403 Forbidden | Sem permissão de acesso |
| 405 Method Not Allowed | Método diferente de GET |
| 500 Internal Error | Falha interna |

> ℹ️  Este endpoint registra absolutamente todas as alterações realizadas no sistema por qualquer usuário administrador.

---

## 📌 `/api/admin/dicas.js`

### Propósito Geral
Endpoint administrativo CRUD completo para gerenciamento das dicas do sistema.

### Características
| Item | Detalhe |
|------|---------|
| Métodos HTTP permitidos | `GET`, `POST`, `PUT`, `DELETE` |
| Autenticação | ✅ Obrigatória (middleware `withAuth`) |
| Cache | ❌ Sem cache |
| Auditoria | ✅ Todas as alterações são logadas |

### Funcionamento
- `GET`: Retorna TODAS as dicas (incluindo as não publicadas) para administração
- `POST`: Cria uma nova dica, padrão publicado = true
- `PUT`: Atualiza dica existente
- `DELETE`: Remove dica permanentemente

> ℹ️  Diferente do endpoint público `/api/dicas.js`, este retorna também dicas em rascunho e permite edição completa.

---

## 🛒 `/api/admin/fetch-ml.js`

### Propósito Geral
Endpoint inteligente para extrair automaticamente dados de produtos do Mercado Livre a partir de qualquer link.

### Características
| Item | Detalhe |
|------|---------|
| Método HTTP permitido | `POST` |
| Autenticação | ✅ Apenas Administradores |
| Estratégias de extração | ✅ 3 níveis de fallback |

### Funcionamento (ordem de prioridade)
1.  **Extrai ID MLB** da URL, trata múltiplos formatos e remove duplicatas
2.  **Primeira tentativa**: API Oficial do Mercado Livre Items
3.  **Segunda tentativa**: API Oficial do Mercado Livre Products
4.  **Terceiro fallback**: Scraping HTML completo com User-Agent navegador real
5.  Extrai automaticamente título, preço, imagens e descrição

> ℹ️  Este endpoint utiliza uma lógica robusta com múltiplos fallbacks que garantem sucesso mesmo quando a API oficial bloqueia requisições.

---

## 🎵 `/api/admin/fetch-spotify.js`

### Propósito Geral
Endpoint para extrair informações de músicas do Spotify a partir de links públicos.

### Características
| Item | Detalhe |
|------|---------|
| Método HTTP permitido | `POST` |
| Autenticação | ✅ Apenas Administradores |
| Estratégias de extração | ✅ 3 camadas independentes |

### Funcionamento (ordem de prioridade)
1.  **API oEmbed Oficial**: Retorna título com 100% de precisão
2.  **Iframe Embed**: Extrai nome do artista diretamente do código fonte
3.  **Scraping Meta Tags**: Usa User-Agent Googlebot para contornar bloqueios

> ℹ️  Não requer nenhuma chave de API do Spotify, funciona 100% com endpoints públicos.

---

## 🔑 `/api/auth/login.js`

### Propósito Geral
Endpoint público de autenticação para login de usuários administradores.

### Características
| Item | Detalhe |
|------|---------|
| Método HTTP permitido | `POST` |
| Autenticação | ❌ Público |
| Rate Limit | ✅ 5 tentativas por minuto por IP |
| Segurança | ✅ Hash bcrypt, Cookie HttpOnly |

### Funcionamento
1.  Verifica rate limit para prevenir brute force
2.  Valida credenciais utilizando função `authenticate()`
3.  Atualiza timestamp de último login
4.  Busca permissões do cargo do usuário
5.  Gera token JWT e define cookie seguro HttpOnly

---

## 📊 `/api/admin/stats.js`

### Propósito Geral
Endpoint administrativo que retorna estatísticas gerais do painel administrativo.

### Características
| Item | Detalhe |
|------|---------|
| Método HTTP permitido | `GET` |
| Autenticação | ✅ Obrigatória |
| Performance | ✅ Todas as consultas executadas em paralelo |

### Dados retornados
✅ Contagem total e publicados de: posts, músicas, vídeos, produtos e dicas
✅ Estatísticas de usuários logados hoje, mês e ano
✅ Separação entre publicados e rascunhos para todos os tipos de conteúdo

---

## 👥 `/api/admin/users.js`

### Propósito Geral
Endpoint CRUD administrativo completo para gerenciamento de usuários do sistema.

### Características
| Item | Detalhe |
|------|---------|
| Métodos HTTP permitidos | `GET`, `POST`, `PUT`, `DELETE` |
| Autenticação | ✅ Obrigatória |
| Permissões | Administrador, Segurança ou Usuários |
| Segurança | ✅ Nunca retorna senhas mesmo em hash |

### Funcionalidades
✅ Listagem paginada com busca
✅ Criação de usuários com senha hashada automaticamente
✅ Atualização de usuários com tratamento especial para senha
✅ Proteção contra exclusão da própria conta
✅ Log completo de auditoria

---

## 🎬 `/api/admin/videos.js`

### Propósito Geral
Endpoint CRUD administrativo completo para gerenciamento de vídeos do sistema.

### Características
| Item | Detalhe |
|------|---------|
| Métodos HTTP permitidos | `GET`, `POST`, `PUT`, `DELETE` |
| Autenticação | ✅ Obrigatória |
| Validação | ✅ Zod schema + Regex para URL YouTube |

### Funcionalidades
✅ Listagem completa incluindo vídeos não publicados
✅ Validação rigorosa de URL do YouTube
✅ Reordenação em massa via drag & drop
✅ Invalidação automática do cache público após alterações

---

## 🎵 `/api/admin/musicas.js`

### Propósito Geral
Endpoint administrativo CRUD completo para gerenciamento das músicas do sistema.

### Características
| Item | Detalhe |
|------|---------|
| Métodos HTTP permitidos | `GET`, `POST`, `PUT`, `DELETE` |
| Autenticação | ✅ Obrigatória |
| Cache | ❌ Desabilitado completamente (sempre atualizado) |
| Auditoria | ✅ Todas as alterações são logadas |

### Funcionalidades
✅ Listagem completa incluindo músicas não publicadas
✅ Validação automática de URL do Spotify
✅ Reordenação em massa via drag & drop
✅ Invalidação automática do cache público após qualquer alteração

---

## 📝 `/api/admin/posts.js`

### Propósito Geral
Endpoint administrativo CRUD completo para gerenciamento de artigos e posts com RBAC e validação rigorosa.

### Características
| Item | Detalhe |
|------|---------|
| Métodos HTTP permitidos | `GET`, `POST`, `PUT`, `DELETE` |
| Autenticação | ✅ Obrigatória |
| Permissões | Administrador ou permissão "Posts/Artigos" |
| Validação | ✅ Zod schema completo para todas as operações |
| Rate Limit | ✅ 30 requisições/minuto para operações de escrita |

### Funcionalidades
✅ Controle de acesso baseado em permissões
✅ Validação de URL de imagem
✅ Reordenação em massa
✅ Log completo de auditoria com detalhes da alteração

---

## 🚦 `/api/admin/rate-limit.js`

### Propósito Geral
Painel administrativo completo para gestão e monitoramento do sistema de Rate Limit.

### Características
| Item | Detalhe |
|------|---------|
| Métodos HTTP permitidos | `GET`, `POST`, `DELETE` |
| Autenticação | ✅ Obrigatória |
| Dependência | ✅ Requer Redis configurado |

### Funcionalidades
✅ Lista de IPs atualmente bloqueados
✅ Gerenciamento de Whitelist
✅ Logs de auditoria completos com filtros
✅ Exportação de logs para CSV
✅ Desbloqueio manual de IPs

---

## 👥 `/api/admin/roles.js`

### Propósito Geral
Endpoint para gerenciamento de cargos e permissões do sistema (RBAC).

### Características
| Item | Detalhe |
|------|---------|
| Métodos HTTP permitidos | `GET`, `POST`, `PUT`, `DELETE` |
| Autenticação | ✅ Obrigatória |
| Permissões | Administrador, Segurança ou Usuários |

### Funcionalidades
✅ Criação, edição e exclusão de cargos
✅ Gerenciamento de permissões por cargo
✅ Cria automáticamente tabela e cargos padrão na primeira execução
✅ Log completo de todas as alterações

---

## ▶️ `/api/admin/fetch-youtube.js`

### Propósito Geral
Endpoint simples e confiável para extrair título de vídeos do YouTube.

### Características
| Item | Detalhe |
|------|---------|
| Método HTTP permitido | `POST` |
| Autenticação | ✅ Apenas Administradores |
| Método | API oEmbed pública oficial |

### Funcionamento
- Utiliza a API oEmbed pública do YouTube que não requer autenticação
- Retorna apenas o título do vídeo formatado corretamente
- Funciona com qualquer link público do YouTube

---

## 💾 `/api/admin/backups.js`

### Propósito Geral
Endpoint administrativo para listagem e criação de backups do banco de dados.

### Características
| Item | Detalhe |
|------|---------|
| Métodos HTTP permitidos | `GET`, `POST` |
| Autenticação | ✅ Obrigatória (middleware `withAuth`) |
| Cache | ❌ Sem cache |

### Funcionamento
- `GET`: Lista todos os backups existentes ordenados por data, retorna também o último backup criado
- `POST`: Executa imediatamente um novo backup completo do banco de dados

### Respostas
| Status | Descrição |
|--------|-----------|
| 200 OK | Lista de backups ou confirmação de criação |
| 405 Method Not Allowed | Método não suportado |
| 500 Internal Error | Falha na operação de backup |

---

## 🗑️ `/api/admin/cache.js`

### Propósito Geral
Endpoint administrativo para limpeza completa do cache Redis.

### Características
| Item | Detalhe |
|------|---------|
| Métodos HTTP permitidos | `POST`, `DELETE` |
| Autenticação | ✅ Obrigatória |
| Permissão | Apenas Administrador |
| Ação | Executa `FLUSHDB` no Redis |

### Funcionamento
1.  Valida autenticação e confirma que o usuário é administrador
2.  Executa limpeza completa de todas as chaves no cache Redis
3.  Retorna confirmação com timestamp da operação

### Respostas
| Status | Descrição |
|--------|-----------|
| 200 OK | Cache limpo com sucesso |
| 401 Unauthorized | Sem autenticação |
| 403 Forbidden | Apenas administradores podem limpar cache |
| 405 Method Not Allowed | Método não suportado |
| 500 Internal Error | Falha na limpeza do cache |

---

## 📊 Resumo Geral dos Endpoints

| Endpoint | Tipo | Autenticação | Cache | Uso principal |
|----------|------|--------------|-------|---------------|
| `cleanup-test-data` | Administrativo | ✅ Sim | ❌ Não | Testes / Desenvolvimento |
| `dicas` | Público | ❌ Não | ❌ Não | Página inicial |
| `musicas` | Público | ❌ Não | ✅ Sim | Galeria de músicas |
| `placeholder-image` | Público | ❌ Não | ✅ Sim | Imagem hero da home |
| `posts` | Público | ❌ Não | ✅ Sim | Listagem de artigos |
| `products` | Misto | ✅ Apenas escrita | ❌ Não | Vitrine e administração de produtos |
| `settings` | Misto | ✅ Apenas escrita | ✅ Sim | Configurações do sistema |
| `upload-image` | Administrativo | ✅ Sim | ❌ Não | Upload de imagens |
| `videos` | Público | ❌ Não | ✅ Sim | Galeria de vídeos |
| `admin/audit` | Administrativo | ✅ Sim | ❌ Não | Log de auditoria |
| `admin/backups` | Administrativo | ✅ Sim | ❌ Não | Gestão de backups |
| `admin/cache` | Administrativo | ✅ Sim | ❌ Não | Limpeza de cache Redis |
| `admin/dicas` | Administrativo | ✅ Sim | ❌ Não | Gerenciamento CRUD de dicas |
| `admin/fetch-ml` | Administrativo | ✅ Sim | ❌ Não | Extração automática de dados Mercado Livre |
| `admin/fetch-spotify` | Administrativo | ✅ Sim | ❌ Não | Extração de dados de músicas Spotify |
| `admin/fetch-youtube` | Administrativo | ✅ Sim | ❌ Não | Extração de título de vídeos YouTube |
| `admin/musicas` | Administrativo | ✅ Sim | ❌ Não | Gerenciamento completo de músicas |
| `admin/posts` | Administrativo | ✅ Sim | ❌ Não | Gerenciamento completo de artigos |
| `admin/rate-limit` | Administrativo | ✅ Sim | ❌ Não | Gestão e monitoramento do Rate Limit |
| `admin/roles` | Administrativo | ✅ Sim | ❌ Não | Gestão de cargos e permissões |
| `admin/stats` | Administrativo | ✅ Sim | ❌ Não | Estatísticas gerais do painel |
| `admin/users` | Administrativo | ✅ Sim | ❌ Não | Gerenciamento de usuários |
| `admin/videos` | Administrativo | ✅ Sim | ❌ Não | Gerenciamento completo de vídeos |
| `auth/login` | Público | ❌ Não | ❌ Não | Autenticação de usuários |
| `auth/logout` | Público | ❌ Não | ❌ Não | Encerramento de sessão |
| `v1/health` | Público | ❌ Não | ❌ Não | Health Check de monitoramento |
| `v1/posts` | API Externa | ✅ Apenas escrita | ✅ Sim | Integrações externas de posts |
| `v1/settings` | API Externa | ✅ Sim | ✅ Sim | Integrações externas de configurações |
| `v1/status` | API Externa | ❌ Não | ❌ Não | Status e diagnóstico da API |
| `v1/auth/check` | API Externa | ✅ Sim | ❌ Não | Validação de token JWT |
| `v1/auth/login` | API Externa | ❌ Não | ❌ Não | Autenticação para integrações externas |
| `v1/videos/[id]` | API Externa | ✅ Sim | ❌ Não | Gerenciamento individual de vídeos |

---

*Documentação gerada em: 21/04/2026*  
*Arquivos analisados: 32 endpoints da pasta /pages/api/*
