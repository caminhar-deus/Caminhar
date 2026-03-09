# 📚 Exemplo de lib/db.js - Boas Práticas de Arquitetura

## 🚀 Visão Geral

Este documento descreve o arquivo `lib/db-example.js`, que serve como exemplo de implementação de um módulo de banco de dados seguindo as boas práticas de arquitetura estabelecidas no projeto.

## 📁 Localização

- **Arquivo:** `lib/db-example.js`
- **Propósito:** Exemplo de implementação de banco de dados
- **Referência:** `lib/db.js` (implementação real)

## 🎯 Boas Práticas Implementadas

### 1. **Connection Pool Otimizado**

```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false // Permite conexão com certificados auto-assinados
  } : undefined,
  // Configurações de performance
  max: 20,              // Máximo de conexões no pool
  min: 2,               // Mínimo de conexões no pool
  idleTimeoutMillis: 30000, // Tempo de timeout de conexões ociosas
  connectionTimeoutMillis: 2000, // Tempo de timeout de conexão
});
```

**Benefícios:**
- **Performance**: Pool de conexões reutilizáveis
- **Escalabilidade**: Configurações ajustáveis para diferentes ambientes
- **Segurança**: SSL configurado para produção
- **Monitoramento**: Timeouts para evitar conexões pendentes

### 2. **Logging Estruturado**

```javascript
import { logger } from './middleware.js';

// Exemplo de logging de consulta
logger.info('Executando consulta SQL', {
  query: text.replace(/\s+/g, ' ').trim(),
  params: params.length > 0 ? params : undefined,
  timestamp: new Date().toISOString()
});
```

**Benefícios:**
- **Debug**: Rastreamento completo de consultas
- **Performance**: Medição de tempo de execução
- **Monitoramento**: Logs estruturados para análise
- **Auditoria**: Histórico de operações

### 3. **Tratamento de Erros Robusto**

```javascript
/**
 * Interface de Erro de Banco de Dados
 * @typedef {Object} DatabaseError
 * @property {string} code - Código do erro (ex: '23505' para unique_violation)
 * @property {string} message - Mensagem de erro detalhada
 * @property {string} detail - Detalhes adicionais do erro
 * @property {string} hint - Sugestão de correção
 */
```

**Benefícios:**
- **Tipagem**: Interfaces TypeScript para melhor desenvolvimento
- **Detalhamento**: Informações completas sobre erros
- **Recuperação**: Dados para tratamento de falhas específicas
- **Monitoramento**: Códigos de erro para alertas

### 4. **Transações Seguras**

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
- **Atomicidade**: Operações completas ou nada
- **Consistência**: Rollback automático em falhas
- **Logging**: Registro de falhas de transação
- **Recursos**: Liberação correta de conexões

### 5. **Operações CRUD Genéricas**

```javascript
/**
 * Cria um registro em uma tabela.
 * @param {string} table - Nome da tabela
 * @param {Object} data - Dados a serem inseridos
 * @param {Array} returning - Campos a serem retornados (default: ['*'])
 * @returns {Promise<Object>} Registro criado
 */
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
- **Reutilização**: Operações genéricas para qualquer tabela
- **Flexibilidade**: Campos retornados configuráveis
- **Performance**: Consultas preparadas com placeholders
- **Consistência**: Padrão uniforme de operações

### 6. **Paginação Inteligente**

```javascript
export async function readRecords(table, options = {}) {
  const {
    where = {},
    orderBy = [],
    limit = 10,
    offset = 0,
    select = ['*']
  } = options;

  // ... lógica de construção da consulta

  const result = await query(text, params);
  
  // Contagem total para paginação
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
- **Performance**: Consultas otimizadas com LIMIT/OFFSET
- **UX**: Informações completas de paginação
- **Flexibilidade**: Filtros, ordenação e seleção configuráveis
- **Eficiência**: Contagem separada para melhor performance

### 7. **Health Check e Monitoramento**

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
- **Monitoramento**: Verificação de saúde do banco
- **Performance**: Métricas de conexões e tamanho
- **Debug**: Informações detalhadas para troubleshooting
- **Alertas**: Dados para sistemas de monitoramento

## 🔧 Como Usar

### Importação

```javascript
// Importar funções específicas
import { query, transaction, createRecord } from '../lib/db-example.js';

// Importar objeto db completo
import { db } from '../lib/db-example.js';
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

## 📊 Comparação com Implementação Atual

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

## 🎯 Próximos Passos

### 1. **Migrar para a Nova Estrutura**
```bash
# Copiar funcionalidades do exemplo para o arquivo real
cp lib/db-example.js lib/db.js
# Ajustar imports e configurações específicas
```

### 2. **Adicionar Testes**
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

### 3. **Integrar com Cache**
```javascript
// Integrar com lib/cache.js
import { getOrSetCache } from './cache.js';

export async function getCachedPosts(limit = 10, page = 1) {
  const cacheKey = `posts:${limit}:${page}`;
  return await getOrSetCache(cacheKey, () => getRecentPosts(limit, page), 3600);
}
```

### 4. **Adicionar Métricas**
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

## 📚 Documentação Relacionada

- [Arquitetura do Projeto](ARCHITECTURE.md)
- [Cache & Performance](CACHE.md)
- [API Standardizer](API.md)
- [Test Infrastructure](TESTING.md)

## 🤝 Contribuição

Para contribuir com melhorias no módulo de banco de dados:

1. **Teste as mudanças** com a infraestrutura de testes
2. **Atualize a documentação** conforme necessário
3. **Siga os padrões** de tipagem e logging
4. **Considere a performance** em todas as operações

---

**Exemplo criado com base na arquitetura v1.7.0** 🏗️