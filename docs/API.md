# Padrões da API

Guia rápido sobre a padronização de respostas, tratamento de erros, validações e middlewares para a API do projeto.

## 📁 Estrutura (`lib/api/`)
- `errors.js`: Classes de erro customizadas (ex: `NotFoundError`).
- `response.js`: Funções de formatação de resposta HTTP (ex: `success()`, `badRequest()`).
- `validate.js`: Middlewares de validação de dados utilizando Zod.
- `middleware.js`: Funções de composição de rotas (`publicApi`, `protectedApi`).

## 🚀 Uso Rápido

### API Pública (GET)

```javascript
import { success } from '../../lib/api/response.js';
import { publicApi } from '../../lib/api/middleware.js';

export default publicApi(async (req, res) => {
  const data = await getData();
  return success(res, data);
});
```

### API Protegida (autenticação + CRUD)

```javascript
import { protectedApi } from '../../lib/api/middleware.js';
import { created, success, noContent } from '../../lib/api/response.js';

async function handler(req, res) {
  switch (req.method) {
    case 'POST':
      const item = await createItem(req.body);
      return created(res, item, `/api/items/${item.id}`);
    
    case 'GET':
      return success(res, await getItems());
    
    case 'DELETE':
      await deleteItem(req.query.id);
      return noContent(res);
  }
}

export default protectedApi(handler, {
  roles: ['admin'],
  methods: ['GET', 'POST', 'DELETE'],
});
```

## 📦 Módulos

### `errors.js` - Classes de Erro

```javascript
import { 
  ValidationError, 
  NotFoundError, 
  AuthenticationError,
  ForbiddenError,
  ConflictError 
} from '../../lib/api/errors.js';

// No código
if (!user) {
  throw new NotFoundError('Usuário', userId);
}

if (!isValid) {
  throw new ValidationError('Dados inválidos', [
    { field: 'email', message: 'Email inválido' }
  ]);
}

// O middleware withErrorHandler converte automaticamente para resposta HTTP
```

### `response.js` - Respostas Padronizadas

#### Sucesso

```javascript
import { success, paginated, created, noContent } from '../../lib/api/response.js';

// 200 OK
success(res, { id: 1, nome: 'Item' });

// 200 OK com paginação
paginated(res, items, { page: 1, limit: 10, total: 100 });

// 201 Created
created(res, newItem, '/api/items/123');

// 204 No Content
noContent(res);
```

#### Erros

```javascript
import { 
  badRequest, 
  unauthorized, 
  forbidden, 
  notFound,
  conflict,
  serverError 
} from '../../lib/api/response.js';

badRequest(res, 'Dados inválidos', errors);
unauthorized(res, 'Token expirado');
forbidden(res);
notFound(res, 'Música', 123);
conflict(res, 'Email já existe');
serverError(res);
```

### `validate.js` - Validação com Zod

```javascript
import { z } from 'zod';
import { 
  validateBody, 
  validateQuery,
  createPaginationSchema 
} from '../../lib/api/validate.js';

// Schema de paginação padrão
const querySchema = createPaginationSchema({ defaultLimit: 20 });

// Schema customizado
const bodySchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
  email: z.string().email('Email inválido'),
  idade: z.number().min(18).optional(),
});

// Uso com composeMiddleware
export default composeMiddleware(
  validateQuery(querySchema),
  validateBody(bodySchema),
  handler
);
```

### `middleware.js` - Composição de Middlewares

```javascript
import { 
  composeMiddleware,
  withAuth,
  withRateLimit,
  withMethod,
  withCors,
  withCache,
  withErrorHandler,
} from '../../lib/api/middleware.js';

export default composeMiddleware(
  withErrorHandler({ includeStack: process.env.NODE_ENV === 'development' }),
  withCache(60),                    // Cache 1 minuto
  withRateLimit({ maxRequests: 100 }),
  withCors({ origins: ['*'] }),
  withMethod(['GET', 'POST']),
  withAuth({ roles: ['admin'] }),   // Opcional: controle de roles
  handler
);
```

## 📝 Formatos de Resposta

### Sucesso

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-02-12T10:00:00.000Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Sucesso Paginado

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "timestamp": "2026-02-12T10:00:00.000Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Erro

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos",
    "details": [
      { "field": "email", "message": "Email inválido" }
    ]
  },
  "meta": {
    "timestamp": "2026-02-12T10:00:00.000Z",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

## 🧪 Testes

```bash
# Executar testes da API
npm test -- lib/api/__tests__/

# Com cobertura
npm run test:ci -- lib/api/__tests__/
```

## 🔗 Exemplo Completo

Veja `pages/api/musicas.js` para uma implementação completa usando todos os padrões.

## 📚 Códigos HTTP

| Código | Função | Uso |
|--------|--------|-----|
| 200 | `success()`, `paginated()`, `updated()` | GET, PUT, DELETE com dados |
| 201 | `created()` | POST sucesso |
| 204 | `noContent()`, `deleted()`, `updated()` | DELETE/PUT sem dados |
| 400 | `badRequest()`, `validationError()` | Dados inválidos |
| 401 | `unauthorized()` | Não autenticado |
| 403 | `forbidden()` | Sem permissão |
| 404 | `notFound()` | Recurso não encontrado |
| 405 | `methodNotAllowed()` | Método não permitido |
| 409 | `conflict()` | Conflito de dados |
| 429 | `tooManyRequests()` | Rate limit excedido |
| 500 | `serverError()` | Erro interno |
| 503 | `serviceUnavailable()` | Serviço indisponível |

---

**Versão:** 1.0.0  
**Autor:** API Standardizer Team  
**Licença:** ISC