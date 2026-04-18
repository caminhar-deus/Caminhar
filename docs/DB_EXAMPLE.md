# Padrões de Banco de Dados

## Visão Geral

Este documento descreve as práticas e utilitários implementados nos módulos centrais de banco de dados (`lib/db.js` e `lib/crud.js`). A arquitetura foca em segurança (prevenção de SQL Injection), performance (Connection Pooling) e estabilidade (Transações ACID).

## Funcionalidades Principais

- **Connection Pooling:** Reutiliza conexões ativas do PostgreSQL para evitar sobrecarga no servidor.
- **Transações Automáticas:** Função `transaction` com controle de `BEGIN`, `COMMIT` e `ROLLBACK` automático em caso de erros.
- **CRUD Dinâmico:** Funções utilitárias seguras para `INSERT`, `UPDATE` e `DELETE` sem a necessidade de escrever strings SQL inteiras.
- **Health Checks:** Utilitários embutidos para checar a saúde, tamanho e conexões ativas do banco.

## Exemplos de Uso

### 1. Consulta Simples (`query`)

```javascript
import { query } from '../../lib/db.js';

// Os parâmetros são sempre passados em um array (segundo argumento) para evitar injeção de SQL.
// Você pode habilitar log para debugar a consulta definindo { log: true }.
const result = await query(
  'SELECT id, username FROM users WHERE role = $1 AND active = $2', 
  ['admin', true],
  { log: true }
);
console.log(result.rows);
```

**Benefícios:**
- Monitoramento: Verificação de saúde do banco
- Performance: Métricas de conexões e tamanho
- Debug: Informações detalhadas para troubleshooting

## Como Usar

### Importação

```javascript
// Importar funções específicas
import { query, transaction, createRecord } from '../lib/db-example.js';

// Importar objeto db completo
import db from '../lib/db-example.js'; // default export
```

### Exemplos de Uso

#### Consulta Simples
```javascript
const result = await query('SELECT * FROM users WHERE id = $1', [1]);
console.log(result.rows);
```

#### Transação
```javascript
const result = await transaction(async (client) => {
  await client.query('UPDATE accounts SET balance = balance - 100 WHERE id = $1', [1]);
  await client.query('UPDATE accounts SET balance = balance + 100 WHERE id = $2', [2]);
  return { success: true };
});
```

#### Operação CRUD Genérica
```javascript
// Criar registro
const newUser = await createRecord('users', {
  name: 'João',
  email: 'joao@example.com'
}, ['id', 'name', 'email']);

// Consultar com filtros
const users = await readRecords('users', {
  where: { active: true },
  orderBy: ['name ASC'],
  limit: 20,
  offset: 0
});
```

#### Operação de Domínio
```javascript
// Criar post
const post = await createPost({
  title: 'Título do Post',
  slug: 'titulo-do-post',
  content: 'Conteúdo do post...',
  published: true
});
```

## Comparação com Implementação Atual

| Funcionalidade | lib/db.js (Atual) | lib/db-example.js (Exemplo) |
|---------------|-------------------|---------------------------|
| **Connection Pool** | ✅ Simples | ✅ Otimizado |
| **Logging** | ❌ Ausente | ✅ Estruturado |
| **Tratamento de Erros** | ❌ Básico | ✅ Robusto |
| **Transações** | ❌ Não implementado | ✅ Implementado |
| **CRUD Genérico** | ❌ Não implementado | ✅ Implementado |
| **Paginação** | ✅ Básica | ✅ Inteligente |
| **Health Check** | ❌ Não implementado | ✅ Implementado |
| **Monitoramento** | ❌ Não implementado | ✅ Implementado |
| **Tipagem** | ❌ Não tipado | ✅ Tipado |
| **Documentação** | ❌ Limitada | ✅ Completa |

## Próximos Passos

### 1. Migrar para a Nova Estrutura
```bash
# Copiar funcionalidades do exemplo para o arquivo real
cp lib/db-example.js lib/db.js
# Ajustar imports e configurações específicas
```

### 2. Adicionar Testes
```javascript
// tests/db.test.js
import { query, transaction, healthCheck } from '../lib/db.js';

describe('Database Module', () => {
  test('health check should return true', async () => {
    const result = await healthCheck();
    expect(result).toBe(true);
  });
});
```

### 3. Integrar com Cache
```javascript
// Integrar com lib/cache.js
import { getOrSetCache } from './cache.js';

export async function getCachedPosts(limit = 10, page = 1) {
  const cacheKey = `posts:${limit}:${page}`;
  return await getOrSetCache(cacheKey, () => getRecentPosts(limit, page), 3600);
}
```

### 4. Adicionar Métricas
```javascript
// Integrar com monitoring
import { metrics } from './monitoring.js';

export async function queryWithMetrics(text, params = []) {
  const start = Date.now();
  try {
    const result = await query(text, params);
    metrics.increment('db.queries.success');
    metrics.histogram('db.queries.duration', Date.now() - start);
    return result;
  } catch (error) {
    metrics.increment('db.queries.error');
    throw error;
  }
}
```

## Documentação Relacionada

- [Arquitetura do Projeto](ARCHITECTURE.md)
- [Cache & Performance](CACHE.md)
- [API Standardizer](API.md)
- [Test Infrastructure](TESTING.md)

## Contribuição

Para contribuir com melhorias no módulo de banco de dados:

1. Teste as mudanças com a infraestrutura de testes
2. Atualize a documentação conforme necessário
3. Siga os padrões de tipagem e logging
4. Considere a performance em todas as operações