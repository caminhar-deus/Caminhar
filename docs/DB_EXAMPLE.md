# Módulo de Banco de Dados: Boas Práticas

## Visão Geral

Este documento apresenta um exemplo de implementação para um módulo de banco de dados (`lib/db.js`) em Node.js com PostgreSQL. O design foca em performance, segurança e manutenibilidade, servindo como um guia de boas práticas para o projeto.

## Princípios e Funcionalidades

- **Connection Pooling:** Utiliza um pool de conexões (`pg.Pool`) para reutilizar conexões, reduzindo a latência e o overhead de estabelecer novas conexões a cada query.
- **Transações Seguras:** Oferece uma função `transaction` que garante a atomicidade das operações (ACID). Em caso de erro, um `ROLLBACK` é executado automaticamente, prevenindo inconsistências nos dados.
- **Logging Opcional:** A função `query` inclui uma opção `log: true` para imprimir detalhes da consulta, parâmetros e tempo de execução, facilitando o debug e a otimização de performance.
- **Health Check:** Expõe uma função `healthCheck` para verificar a conectividade com o banco de dados, essencial para sistemas de monitoramento.

## Implementação de Exemplo (`lib/db.js`)

Abaixo está um exemplo completo da implementação do módulo, que pode ser usado como referência.

```javascript
import { Pool } from 'pg';

// Pool de conexões para melhor performance.
let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      max: 20,
      min: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}

/**
 * Executa uma consulta SQL de forma segura e performática.
 * @param {string} text - A query SQL.
 * @param {Array} [params=[]] - Os parâmetros para a query.
 * @param {object} [options={}] - Opções como { log: boolean, client: pg.Client }.
 * @returns {Promise<QueryResult>} O resultado do banco de dados.
 */
export async function query(text, params = [], options = {}) {
  const { log = false, client } = options;
  const start = Date.now();
  
  try {
    const db = client || getPool();
    const res = await db.query(text, params);
    const duration = Date.now() - start;

    if (log) {
      console.log('Consulta SQL executada', {
        duration: `${duration}ms`,
        query: text.replace(/\s+/g, ' ').trim(),
        rows: res.rowCount,
      });
    }
    return res;
  } catch (error) {
    console.error('Erro ao executar consulta SQL', { error: error.message });
    throw error;
  }
}

/**
 * Executa uma transação com rollback automático em caso de erro.
 * @param {Function} callback - Função que recebe o client da transação.
 * @returns {Promise<*>} O resultado da transação.
 */
export async function transaction(callback) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transação falhou e foi revertida', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Verifica a saúde da conexão com o banco de dados.
 * @returns {Promise<boolean>} True se a conexão está saudável.
 */
export async function healthCheck() {
  try {
    const result = await query('SELECT 1 as health_check', [], { log: false });
    return result?.rows?.health_check === 1;
  } catch (error) {
    return false;
  }
}
```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined,
  max: 20,              // Máximo de conexões
  min: 2,               // Mínimo de conexões
  idleTimeoutMillis: 30000, // Timeout de conexões ociosas
  connectionTimeoutMillis: 2000 // Timeout de conexão
});
```

**Benefícios:**
- Performance: Pool de conexões reutilizáveis
- Escalabilidade: Configurações ajustáveis
- Segurança: SSL configurado para produção
- Monitoramento: Timeouts para evitar conexões pendentes

### 2. Logging Estruturado

```javascript
import { logger } from './middleware.js';

logger.info('Executando consulta SQL', {
  query: text.replace(/\s+/g, ' ').trim(),
  params: params.length > 0 ? params : undefined,
  timestamp: new Date().toISOString()
});
```

**Benefícios:**
- Debug: Rastreamento completo de consultas
- Performance: Medição de tempo de execução
- Monitoramento: Logs estruturados para análise

### 3. Tratamento de Erros Robusto

```javascript
/**
 * Interface de Erro de Banco de Dados
 * @typedef {Object} DatabaseError
 * @property {string} code - Código do erro
 * @property {string} message - Mensagem de erro detalhada
 * @property {string} detail - Detalhes adicionais
 * @property {string} hint - Sugestão de correção
 */
```

**Benefícios:**
- Tipagem: Interfaces para melhor desenvolvimento
- Detalhamento: Informações completas sobre erros
- Recuperação: Dados para tratamento de falhas específicas

### 4. Transações Seguras

```javascript
export async function transaction(callback) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transação falhou e foi revertida', {
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });
    throw error;
  } finally {
    client.release();
  }
}
```

**Benefícios:**
- Atomicidade: Operações completas ou nada
- Consistência: Rollback automático em falhas
- Logging: Registro de falhas de transação

### 5. Operações CRUD Genéricas

```javascript
export async function createRecord(table, data, returning = ['*']) {
  const fields = Object.keys(data);
  const values = Object.values(data);
  const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');
  const returningClause = returning.join(', ');
  
  const text = `
    INSERT INTO ${table} (${fields.join(', ')})
    VALUES (${placeholders})
    RETURNING ${returningClause}
  `;
  
  const result = await query(text, values);
  return result.rows[0];
}
```

**Benefícios:**
- Reutilização: Operações genéricas para qualquer tabela
- Flexibilidade: Campos retornados configuráveis
- Performance: Consultas preparadas com placeholders

### 6. Paginação Inteligente

```javascript
export async function readRecords(table, options = {}) {
  const {
    where = {},
    orderBy = [],
    limit = 10,
    offset = 0,
    select = ['*']
  } = options;

  const result = await query(text, params);
  const countResult = await query(countText, Object.values(where));
  const total = parseInt(countResult.rows[0].total, 10);
  const totalPages = Math.ceil(total / limit);

  return {
    data: result.rows,
    pagination: {
      page: Math.floor(offset / limit) + 1,
      limit,
      total,
      totalPages,
      hasNext: offset + limit < total,
      hasPrev: offset > 0
    }
  };
}
```

**Benefícios:**
- Performance: Consultas otimizadas com LIMIT/OFFSET
- UX: Informações completas de paginação
- Flexibilidade: Filtros, ordenação e seleção configuráveis

### 7. Health Check e Monitoramento

```javascript
export async function healthCheck() {
  try {
    const result = await query('SELECT 1 as health_check', [], { log: false });
    return result && result.rows.length > 0 && result.rows[0].health_check === 1;
  } catch (error) {
    logger.error('Health check do banco de dados falhou', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    return false;
  }
}

export async function getDatabaseInfo() {
  try {
    const [version, connections, size] = await Promise.all([
      query('SELECT version() as version', [], { log: false }),
      query('SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = \'active\'', [], { log: false }),
      query('SELECT pg_database_size(current_database()) as size_bytes', [], { log: false })
    ]);

    return {
      version: version.rows[0].version,
      activeConnections: parseInt(connections.rows[0].active_connections, 10),
      sizeBytes: parseInt(size.rows[0].size_bytes, 10),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Erro ao obter informações do banco de dados', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}
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