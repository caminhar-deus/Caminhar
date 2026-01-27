# Caminhar API v1 - Documentação

Bem-vindo à documentação da API RESTful do Caminhar para consumo externo.

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

## Notas de Versão

### v1.0 (27/01/2026)
- Lançamento inicial da API RESTful
- Suporte completo a autenticação JWT
- Endpoints para configurações e status
- Documentação completa
- Rate limiting e CORS configuráveis