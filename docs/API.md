# API Caminhar com Deus

Documentação da API RESTful para consumo externo.

## Visão Geral

A API Caminhar fornece acesso programático aos recursos do sistema. Projetada para consumo externo por aplicativos clientes e sistemas integrados.

## Configuração

### URL Base
```
https://seu-dominio.com/api/v1/
```

### Headers Requeridos
```
Authorization: Bearer SEU_TOKEN_JWT
Content-Type: application/json
```

### Respostas Padrão

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

## Endpoints Principais

### Autenticação

**POST /api/v1/auth/login**
- Autentica usuário e retorna token JWT
- Corpo: `{ "username": "admin", "password": "senha" }`
- Resposta: `{ "token": "eyJ...", "expires_in": 3600 }`

**GET /api/v1/auth/check**
- Valida token JWT
- Headers: `Authorization: Bearer SEU_TOKEN_JWT`
- Resposta: `{ "authenticated": true, "user": { "userId": 1 } }`

### Status

**GET /api/v1/status**
- Retorna status da API e sistema
- Resposta: `{ "api": { "version": "1.0", "status": "operational" } }`

### Posts

**GET /api/v1/posts**
- Lista todos os posts publicados
- Headers: `Authorization: Bearer SEU_TOKEN_JWT` (opcional)
- Resposta: `{ "data": [{ "id": 1, "title": "Título", "slug": "titulo" }] }`

**POST /api/v1/posts**
- Cria novo post (requer autenticação)
- Headers: `Authorization: Bearer SEU_TOKEN_JWT`
- Corpo: `{ "title": "Título", "content": "Conteúdo", "published": true }`

### Vídeos

**GET /api/v1/videos**
- Lista vídeos com paginação
- Parâmetros: `page=1&limit=10`
- Resposta: `{ "data": { "videos": [...], "pagination": { "page": 1, "total": 50 } } }`

**POST /api/v1/videos**
- Cria novo vídeo (requer autenticação)
- Corpo: `{ "titulo": "Título", "url_youtube": "https://...", "publicado": true }`

**PUT /api/v1/videos/{id}**
- Atualiza vídeo existente
- Corpo: `{ "titulo": "Novo Título", "publicado": false }`

**DELETE /api/v1/videos/{id}**
- Deleta vídeo existente
- Resposta: `{ "message": "Vídeo deletado com sucesso" }`

### Configurações

**GET /api/v1/settings**
- Lista todas as configurações
- Headers: `Authorization: Bearer SEU_TOKEN_JWT`
- Parâmetro: `key=chave_específica` (opcional)

**POST /api/v1/settings**
- Cria nova configuração
- Corpo: `{ "key": "chave", "value": "valor", "type": "string" }`

**PUT /api/v1/settings**
- Atualiza configuração existente
- Corpo: `{ "key": "chave", "value": "novo_valor" }`

## Códigos de Status

| Código | Descrição |
|--------|-----------|
| 200 | OK - Requisição bem-sucedida |
| 201 | Created - Recurso criado |
| 400 | Bad Request - Dados inválidos |
| 401 | Unauthorized - Autenticação requerida |
| 403 | Forbidden - Permissões insuficientes |
| 404 | Not Found - Recurso não encontrado |
| 429 | Too Many Requests - Limite excedido |
| 500 | Internal Server Error - Erro no servidor |

## Rate Limiting

- Limite: 100 requisições por 15 minutos por endpoint
- Header: `Retry-After` quando limite excedido
- Status: 429 Too Many Requests

## Exemplos de Uso

### JavaScript
```javascript
// Login
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'senha' })
});
const { token } = await response.json();

// Acessar endpoint protegido
const posts = await fetch('/api/v1/posts', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### cURL
```bash
# Login
curl -X POST /api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"senha"}'

# Acessar endpoint protegido
curl -X GET /api/v1/settings \
  -H "Authorization: Bearer SEU_TOKEN_JWT"
```

## Segurança

- HTTPS obrigatório
- Tokens JWT expiram após 1 hora
- CORS configurável
- Rate limiting para proteção contra abuso
- Validação de entrada em todos os endpoints

## Cache

- Sistema de cache Redis para endpoints de leitura
- Cache hit rate: >80% para configurações
- Response time: <100ms (cache hit), <500ms (cache miss)
- Dados públicos apenas em cache

## Versões

- **v1.0**: Autenticação, settings, status
- **v1.2.0**: Posts, vídeos, cache avançado
- **v1.7.0**: Testes completos, arquitetura de testes

## Suporte

- Email: suporte@caminhar.com
- GitHub: https://github.com/caminhar-deus/Caminhar