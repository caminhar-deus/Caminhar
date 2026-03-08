# Caminhar API v1.4.0 - Documentação

Bem-vindo à documentação da API RESTful do Caminhar para consumo externo.

## 🚀 Versão: v1.4.0

## Visão Geral

A API Caminhar v1 fornece acesso programático aos recursos do sistema Caminhar. Esta API é projetada para consumo externo por aplicativos clientes, sistemas integrados e parceiros.

### Recursos Principais

- **Autenticação JWT**: Segurança baseada em tokens
- **CORS habilitado**: Acesso de domínios externos
- **Versionamento**: Estrutura clara de versionamento (/v1/)
- **Rate Limiting**: Proteção contra abuso
- **Respostas consistentes**: Formato padronizado de respostas
- **Documentação completa**: Exemplos e especificações

## Configuração Base

### Dependências da API
- express: ^4.18.0
- jsonwebtoken: ^9.0.0
- bcryptjs: ^2.4.3
- cors: ^2.8.5
- express-rate-limit: ^7.1.5
- redis: ^4.6.10
- @upstash/redis: ^1.36.2 (para cache avançado)

### URL Base

```
https://seu-dominio.com/api/v1/
```

### Headers Requeridos

Para endpoints autenticados, inclua o header de autorização:

```
Authorization: Bearer SEU_TOKEN_JWT
Content-Type: application/json
```

### Respostas Padrão

Todas as respostas seguem este formato:

**Sucesso:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Mensagem descritiva",
  "timestamp": "2026-01-27T00:00:00.000Z"
}
```

**Erro:**
```json
{
  "error": "Tipo de erro",
  "message": "Mensagem de erro",
  "timestamp": "2026-01-27T00:00:00.000Z"
}
```

## Autenticação

### Login (Obter Token)

**Endpoint:** `POST /api/v1/auth/login`

**Descrição:** Autentica um usuário e retorna um token JWT para acesso à API.

**Corpo da Requisição:**
```json
{
  "username": "seu_usuario",
  "password": "sua_senha"
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "user": {
      "userId": 1,
      "username": "admin",
      "role": "admin"
    }
  },
  "message": "Autenticação bem-sucedida",
  "timestamp": "2026-01-27T00:00:00.000Z"
}
```

**Respostas de Erro:**
- `400 Bad Request`: Credenciais ausentes
- `401 Unauthorized`: Credenciais inválidas
- `429 Too Many Requests`: Limite de tentativas excedido

### Verificar Autenticação

**Endpoint:** `GET /api/v1/auth/check`

**Descrição:** Valida um token JWT e retorna informações do usuário.

**Headers Requeridos:**
```
Authorization: Bearer SEU_TOKEN_JWT
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "user": {
      "userId": 1,
      "username": "admin",
      "role": "admin"
    }
  },
  "message": "Autenticação válida",
  "timestamp": "2026-01-27T00:00:00.000Z"
}
```

**Respostas de Erro:**
- `401 Unauthorized`: Token ausente ou inválido
- `405 Method Not Allowed`: Método diferente de GET

## Status da API

**Endpoint:** `GET /api/v1/status`

**Descrição:** Retorna informações sobre o status da API e do sistema.

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "api": {
      "version": "1.0",
      "status": "operational",
      "timestamp": "2026-01-27T00:00:00.000Z",
      "environment": "production"
    },
    "database": {
      "status": "connected",
      "details": {
        "type": "sqlite",
        "connected": true,
        "version": "3.x"
      }
    },
    "system": {
      "nodeVersion": "v18.x.x",
      "platform": "linux",
      "uptime": 12345.67
    }
  },
  "message": "API está operacional",
  "timestamp": "2026-01-27T00:00:00.000Z"
}
```

## Configurações (Settings)

### Listar Configurações

**Endpoint:** `GET /api/v1/settings`

**Descrição:** Retorna todas as configurações do sistema.

**Headers Requeridos:**
```
Authorization: Bearer SEU_TOKEN_JWT
```

**Parâmetros de Consulta (Opcional):**
- `key`: Chave específica da configuração a ser retornada

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": [
    {
      "key": "site_title",
      "value": "Caminhar com Deus",
      "type": "string",
      "description": "Título do site"
    },
    ...
  ],
  "count": 10,
  "timestamp": "2026-01-27T00:00:00.000Z"
}
```

**Respostas de Erro:**
- `401 Unauthorized`: Autenticação requerida
- `403 Forbidden`: Permissões insuficientes
- `404 Not Found`: Configuração não encontrada (quando key é especificada)

### Criar Configuração

**Endpoint:** `POST /api/v1/settings`

**Descrição:** Cria uma nova configuração.

**Headers Requeridos:**
```
Authorization: Bearer SEU_TOKEN_JWT
```

**Corpo da Requisição:**
```json
{
  "key": "nova_configuracao",
  "value": "valor_da_configuracao",
  "type": "string",
  "description": "Descrição da configuração"
}
```

**Resposta de Sucesso (201):**
```json
{
  "success": true,
  "data": {
    "key": "nova_configuracao",
    "value": "valor_da_configuracao"
  },
  "message": "Configuração criada com sucesso",
  "timestamp": "2026-01-27T00:00:00.000Z"
}
```

**Respostas de Erro:**
- `400 Bad Request`: Dados inválidos
- `401 Unauthorized`: Autenticação requerida
- `403 Forbidden`: Requer permissões de administrador

### Atualizar Configuração

**Endpoint:** `PUT /api/v1/settings`

**Descrição:** Atualiza uma configuração existente.

**Headers Requeridos:**
```
Authorization: Bearer SEU_TOKEN_JWT
```

**Corpo da Requisição:**
```json
{
  "key": "configuracao_existente",
  "value": "novo_valor",
  "type": "string",
  "description": "Nova descrição"
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "key": "configuracao_existente",
    "value": "novo_valor"
  },
  "message": "Configuração atualizada com sucesso",
  "timestamp": "2026-01-27T00:00:00.000Z"
}
```

**Respostas de Erro:**
- `400 Bad Request`: Dados inválidos
- `401 Unauthorized`: Autenticação requerida
- `403 Forbidden`: Requer permissões de administrador

## Códigos de Status HTTP

| Código | Descrição |
|--------|-----------|
| 200 | OK - Requisição bem-sucedida |
| 201 | Created - Recurso criado com sucesso |
| 400 | Bad Request - Dados inválidos |
| 401 | Unauthorized - Autenticação requerida |
| 403 | Forbidden - Permissões insuficientes |
| 404 | Not Found - Recurso não encontrado |
| 405 | Method Not Allowed - Método HTTP não suportado |
| 429 | Too Many Requests - Limite de requisições excedido |
| 500 | Internal Server Error - Erro no servidor |

## Endpoints da API v1.2.1

### Health Check

**Endpoint:** `GET /api/v1/health`

**Descrição:** Verifica rapidamente se a API está respondendo (sem processamento pesado).

**Resposta de Sucesso (200):**
```json
{
  "status": "ok"
}
```

### Posts

**Endpoint:** `GET /api/v1/posts`

**Descrição:** Lista todos os posts publicados, ordenados por data de criação (descendente).

**Headers Requeridos:**
```
Authorization: Bearer SEU_TOKEN_JWT (opcional para acesso público)
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Título do Post",
      "slug": "titulo-do-post",
      "summary": "Resumo do post",
      "image_url": "https://...",
      "created_at": "2026-01-27T00:00:00.000Z"
    }
  ],
  "timestamp": "2026-01-27T00:00:00.000Z"
}
```

**Endpoint:** `POST /api/v1/posts`

**Descrição:** Cria um novo post (requer autenticação).

**Headers Requeridos:**
```
Authorization: Bearer SEU_TOKEN_JWT
Content-Type: application/json
```

**Corpo da Requisição:**
```json
{
  "title": "Título do Post",
  "slug": "titulo-do-post",
  "content": "Conteúdo do post",
  "summary": "Resumo do post",
  "image_url": "https://...",
  "published": true
}
```

**Resposta de Sucesso (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Título do Post",
    "slug": "titulo-do-post",
    "content": "Conteúdo do post",
    "summary": "Resumo do post",
    "image_url": "https://...",
    "published": true,
    "created_at": "2026-01-27T00:00:00.000Z",
    "updated_at": "2026-01-27T00:00:00.000Z"
  },
  "message": "Post criado com sucesso",
  "timestamp": "2026-01-27T00:00:00.000Z"
}
```

### Videos

**Endpoint:** `GET /api/v1/videos`

**Descrição:** Lista vídeos com paginação.

**Headers Requeridos:**
```
Authorization: Bearer SEU_TOKEN_JWT (opcional para acesso público)
```

**Parâmetros de Consulta (Opcional):**
- `page`: Número da página (padrão: 1)
- `limit`: Quantidade de itens por página (padrão: 10)

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "videos": [
      {
        "id": 1,
        "titulo": "Título do Vídeo",
        "url_youtube": "https://...",
        "descricao": "Descrição do vídeo",
        "publicado": true,
        "created_at": "2026-01-27T00:00:00.000Z",
        "updated_at": "2026-01-27T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  },
  "timestamp": "2026-01-27T00:00:00.000Z"
}
```

**Endpoint:** `POST /api/v1/videos`

**Descrição:** Cria um novo vídeo (requer autenticação).

**Headers Requeridos:**
```
Authorization: Bearer SEU_TOKEN_JWT
Content-Type: application/json
```

**Corpo da Requisição:**
```json
{
  "titulo": "Título do Vídeo",
  "url_youtube": "https://...",
  "descricao": "Descrição do vídeo",
  "publicado": true
}
```

**Resposta de Sucesso (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "titulo": "Título do Vídeo",
    "url_youtube": "https://...",
    "descricao": "Descrição do vídeo",
    "publicado": true,
    "created_at": "2026-01-27T00:00:00.000Z",
    "updated_at": "2026-01-27T00:00:00.000Z"
  },
  "message": "Vídeo criado com sucesso",
  "timestamp": "2026-01-27T00:00:00.000Z"
}
```

**Endpoint:** `PUT /api/v1/videos/{id}`

**Descrição:** Atualiza um vídeo existente (requer autenticação).

**Headers Requeridos:**
```
Authorization: Bearer SEU_TOKEN_JWT
Content-Type: application/json
```

**Corpo da Requisição:**
```json
{
  "titulo": "Novo Título",
  "url_youtube": "https://...",
  "descricao": "Nova descrição",
  "publicado": false
}
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "titulo": "Novo Título",
    "url_youtube": "https://...",
    "descricao": "Nova descrição",
    "publicado": false,
    "created_at": "2026-01-27T00:00:00.000Z",
    "updated_at": "2026-01-27T00:00:00.000Z"
  },
  "message": "Vídeo atualizado com sucesso",
  "timestamp": "2026-01-27T00:00:00.000Z"
}
```

**Endpoint:** `DELETE /api/v1/videos/{id}`

**Descrição:** Deleta um vídeo existente (requer autenticação).

**Headers Requeridos:**
```
Authorization: Bearer SEU_TOKEN_JWT
```

**Resposta de Sucesso (200):**
```json
{
  "success": true,
  "message": "Vídeo deletado com sucesso",
  "timestamp": "2026-01-27T00:00:00.000Z"
}
```

## Rate Limiting

A API implementa rate limiting para prevenir abuso:

- **Limite:** 100 requisições por 15 minutos por endpoint
- **Header de Resposta:** `Retry-After` quando o limite é excedido
- **Código de Status:** 429 Too Many Requests

## Variáveis de Ambiente

Para configurar a API para produção:

```env
# Chave secreta para JWT (obrigatório em produção)
JWT_SECRET=sua_chave_secreta_complexa

# Origens permitidas para CORS (separadas por vírgula)
ALLOWED_ORIGINS=https://seu-dominio.com,https://outro-dominio.com

# Credenciais de administrador
ADMIN_USERNAME=admin
ADMIN_PASSWORD=sua_senha_segura
```

## Exemplos de Uso

### JavaScript (Fetch API)

```javascript
// Login
const loginResponse = await fetch('https://api.caminhar.com/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'admin',
    password: 'password'
  })
});

const { token } = await loginResponse.json();

// Usar token para acessar endpoint protegido
const settingsResponse = await fetch('https://api.caminhar.com/v1/settings', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
});

const settings = await settingsResponse.json();
console.log(settings.data);
```

### cURL

```bash
# Login
curl -X POST https://api.caminhar.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Acessar endpoint protegido
curl -X GET https://api.caminhar.com/v1/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_JWT"
```

## 🧪 Testes de API

### Testes de Integração
- **Jest**: Testes de endpoints com supertest
- **Mocking**: Mock de banco de dados e Redis
- **Performance**: Testes de carga com k6
- **Cache**: Testes de cache hit/miss e invalidação
- **Segurança**: Testes de autenticação e autorização

### Testes de Carga
```bash
# Testes de carga com k6
npm run test:load

# Testes específicos de vídeos
npm run test:load:videos:pagination
npm run test:load:videos:filter
npm run test:load:videos:sort
npm run test:load:videos:validation

# Testes específicos de posts
npm run test:load:posts:pagination
npm run test:load:posts:tags
npm run test:load:posts:cursor

# Testes específicos de músicas
npm run test:load:musicas:pagination
npm run test:load:musicas:filter
npm run test:load:musicas:search
npm run test:load:musicas:sort
```

### Testes de Integração
```bash
# Testes de integração
npm run test:integration

# Testes de cache
npm run test:cache

# Testes de performance
npm run test:performance
```

## 📋 Especificação OpenAPI

Disponível em: `/api/v1/docs` (Swagger UI)

### Endpoints Documentados
- **Autenticação**: Login, verificação de token
- **Configurações**: CRUD de settings
- **Status**: Informações do sistema
- **Cache**: Endpoints com cache habilitado

## Segurança

- **HTTPS Obrigatório**: Todas as requisições devem ser feitas via HTTPS
- **Tokens JWT**: Tokens expiram após 1 hora
- **CORS Configurável**: Restrinja origens permitidas em produção
- **Rate Limiting**: Proteção contra ataques de força bruta
- **Validação de Entrada**: Todos os dados são validados

## Suporte

Para questões técnicas ou suporte, entre em contato com:

- Email: suporte@caminhar.com
- GitHub: https://github.com/caminhar-deus/Caminhar

## Versões

- **v1.0**: Versão inicial com autenticação, settings e status
- **v1.2.0**: Versão atualizada com cache, ContentTabs e integrações
- **v1.2.1**: Versão atual com endpoints de Posts, Videos, Health Check e cache avançado

## Notas de Versão

### v1.4.0 (07/03/2026)
- ✅ **Refatoração Estrutural**: Reorganização completa de pastas de testes, scripts e componentes administrativos.
- ✅ **Limpeza**: Remoção de arquivos de teste da raiz e da pasta lib.
- ✅ **Testes de Carga Corrigidos**: Correção de endpoints e estrutura de respostas em testes de carga (videos, posts, músicas)
- ✅ **API Consistente**: Padronização de endpoints e respostas entre APIs públicas e administrativas
- ✅ **Documentação Atualizada**: Atualização da documentação para refletir versão atual e endpoints disponíveis

### v1.3.0 (22/02/2026)
- ✅ **ES Modules**: Projeto totalmente compatível com ES modules
- ✅ **Jest com ESM**: Suporte nativo a ES modules sem flags experimentais
- ✅ **Turbopack Integration**: Build ultra-rápido para desenvolvimento
- ✅ **Babel Isolado**: Configuração separada para evitar conflitos com Turbopack
- ✅ **Imports Modernos**: Extensões explícitas (.js) conforme especificação ESM
- ✅ **Build Performance**: Tempo de build otimizado com Turbopack
- ✅ **Testes de Cache**: Validação completa de Cache Miss, Cache Hit e invalidação
- ✅ **Testes de Performance**: Métricas de performance monitoradas e validadas
- ✅ **Testes de Segurança**: Validação de segurança do sistema e proteções
- ✅ **Testes de Cross-Browser**: Compatibilidade verificada em diferentes navegadores
- ✅ **Testes de Mobile**: Responsividade e usabilidade validadas em dispositivos móveis
- ✅ **Testes de Integrações Externas**: Validação completa de integrações com Spotify, YouTube e Redis
- ✅ **Testes de Documentação**: Verificação da qualidade e completude da documentação
- ✅ **Cache de API**: Sistema de cache para rotas de leitura frequente (Settings, Posts, Musicas)
- ✅ **Redis Integration**: Sistema de cache para rotas de leitura frequente
- ✅ **Performance**: Redução de 80-90% nas consultas ao banco de dados
- ✅ **Monitoramento**: Métricas de cache hit rate e performance em tempo real
- ✅ **Fallback Seguro**: Sistema continua operando se Redis falhar
- ✅ **Novos Endpoints**: Adição dos endpoints de Posts, Videos e Health Check
- ✅ **Documentação Atualizada**: Documentação completa dos novos endpoints e funcionalidades

### v1.2.0 (08/02/2026)
- ✅ **Cache de API**: Sistema de cache Redis para rotas de leitura frequente
- ✅ **ContentTabs Integration**: Endpoints para integração com sistema de navegação
- ✅ **Spotify Integration**: Suporte para integração com Spotify
- ✅ **YouTube Integration**: Suporte para integração com YouTube
- ✅ **Performance**: Otimizações de performance e métricas de monitoramento
- ✅ **Testes**: Suíte de testes completa e funcional
- ✅ **Documentação**: Documentação completa e atualizada
- ✅ **CI/CD**: Pipeline de integração contínua operacional

### v1.0 (27/01/2026)
- Lançamento inicial da API RESTful
- Suporte completo a autenticação JWT
- Endpoints para configurações e status
- Documentação completa
- Rate limiting e CORS configuráveis

## Integrações Especiais

### ContentTabs
A API v1.2.0 inclui suporte especial para o sistema de navegação ContentTabs:

- **GET /api/v1/settings**: Cache de 30 minutos para configurações
- **GET /api/v1/posts**: Cache de 1 hora para posts do blog
- **GET /api/admin/musicas**: Cache de 15 minutos para músicas (integração Spotify)
- **GET /api/admin/videos**: Cache para vídeos (integração YouTube)

### Spotify Integration
Endpoints para integração com Spotify:

- **GET /api/admin/musicas**: Lista de músicas com URLs de embed
- **Cache**: Sistema de cache para melhor performance
- **Conversão**: Conversão automática de URLs para embeds

### YouTube Integration
Endpoints para integração com YouTube:

- **GET /api/admin/videos**: Lista de vídeos com URLs de embed
- **Cache**: Sistema de cache para melhor performance
- **Conversão**: Conversão automática de URLs para embeds

## Métricas de Performance

### Cache Hit Rate
- **Settings**: >80% de cache hits
- **Posts**: >85% de cache hits
- **Musicas**: >75% de cache hits

### Response Time
- **Cache Hit**: <100ms
- **Cache Miss**: <500ms
- **Database Load**: Redução de 70-90% nas consultas

### Monitoramento
- **Logs**: Logs detalhados de operações de cache
- **Alertas**: Alertas para falhas de cache e performance
- **Métricas**: Métricas de performance em tempo real

## Segurança Avançada

### Cache Security
- **Dados Públicos**: Apenas dados públicos são armazenados em cache
- **Tokens**: Tokens de autenticação não são armazenados em cache
- **Permissões**: Verificação de permissões antes do cache

### Rate Limiting Avançado
- **Cache**: Rate limiting inteligente considerando cache hits
- **Fallback**: Fallback automático para banco de dados
- **Monitoramento**: Monitoramento de limites e bloqueios

## Próximas Versões

### v1.3.0 (Planejado)
- **CDN Integration**: Suporte para CDN para recursos estáticos
- **WebSocket**: Suporte para WebSocket para atualizações em tempo real
- **Analytics**: Integração com sistemas de analytics
- **Webhooks**: Suporte para webhooks para integrações externas

### v2.0.0 (Planejado)
- **GraphQL**: Suporte para GraphQL ao lado do REST
- **Real-time**: Sistema de mensagens em tempo real
- **AI Integration**: Integração com IA para recomendações
- **Mobile SDK**: SDKs para mobile (iOS/Android)
- **Load Testing**: Sistema avançado de testes de carga integrado
- **API Analytics**: Métricas avançadas de uso da API

## Suporte Técnico

### Monitoramento
- **Performance**: Monitoramento contínuo de performance
- **Erros**: Logs de erros e alertas automáticos
- **Cache**: Monitoramento de cache hit rate e performance

### Atualizações
- **Automáticas**: Atualizações automáticas de segurança
- **Notificações**: Notificações de novas versões e funcionalidades
- **Documentação**: Documentação sempre atualizada

### Comunidade
- **GitHub**: Issues e pull requests
- **Discord**: Comunidade de desenvolvedores
- **Blog**: Artigos e tutoriais

Parabéns pelo excelente trabalho! 🎉