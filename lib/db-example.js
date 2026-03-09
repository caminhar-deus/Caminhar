/**
 * Exemplo de lib/db.js seguindo as boas práticas de arquitetura
 * 
 * Este arquivo demonstra como implementar um módulo de banco de dados
 * seguindo os padrões estabelecidos na arquitetura do projeto.
 * 
 * @author Arquitetura do Projeto
 * @version 1.7.0
 */

import { Pool } from 'pg';
import { logger } from './middleware.js';

// Configuração do connection pool
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

/**
 * Interface de Resultado de Consulta
 * @typedef {Object} QueryResult
 * @property {Array} rows - Linhas retornadas pela consulta
 * @property {number} rowCount - Número de linhas afetadas
 * @property {Object} fields - Metadados dos campos
 */

/**
 * Interface de Erro de Banco de Dados
 * @typedef {Object} DatabaseError
 * @property {string} code - Código do erro (ex: '23505' para unique_violation)
 * @property {string} message - Mensagem de erro detalhada
 * @property {string} detail - Detalhes adicionais do erro
 * @property {string} hint - Sugestão de correção
 */

/**
 * Executa uma consulta SQL com tratamento de erros e logging.
 * 
 * @param {string} text - Texto SQL da consulta
 * @param {Array} params - Parâmetros da consulta
 * @param {Object} options - Opções de configuração
 * @param {boolean} options.log - Habilita logging da consulta (default: true)
 * @param {boolean} options.throwOnError - Lança erro em caso de falha (default: true)
 * @returns {Promise<QueryResult>} Resultado da consulta
 * @throws {DatabaseError} Erro de banco de dados
 */
export async function query(text, params = [], options = {}) {
  const { log = true, throwOnError = true } = options;
  const start = Date.now();
  
  try {
    if (log) {
      logger.info('Executando consulta SQL', {
        query: text.replace(/\s+/g, ' ').trim(),
        params: params.length > 0 ? params : undefined,
        timestamp: new Date().toISOString()
      });
    }

    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    if (log) {
      logger.info('Consulta SQL executada com sucesso', {
        duration: `${duration}ms`,
        rowCount: result.rowCount,
        timestamp: new Date().toISOString()
      });
    }

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    
    const errorDetails = {
      code: error.code,
      message: error.message,
      detail: error.detail,
      hint: error.hint,
      query: text.replace(/\s+/g, ' ').trim(),
      params: params.length > 0 ? params : undefined,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    };

    if (log) {
      logger.error('Erro ao executar consulta SQL', errorDetails);
    }

    if (throwOnError) {
      throw error;
    }

    return null;
  }
}

/**
 * Executa uma transação com rollback automático em caso de erro.
 * 
 * @param {Function} callback - Função que recebe o client da transação
 * @returns {Promise<*>} Resultado da transação
 * @throws {DatabaseError} Erro de banco de dados
 */
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

/**
 * Fecha o connection pool.
 * 
 * @returns {Promise<void>}
 */
export async function closeDatabase() {
  try {
    await pool.end();
    logger.info('Connection pool fechado com sucesso');
  } catch (error) {
    logger.error('Erro ao fechar connection pool', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

/**
 * Verifica a saúde da conexão com o banco de dados.
 * 
 * @returns {Promise<boolean>} True se a conexão está saudável
 */
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

/**
 * Obtém informações sobre o banco de dados.
 * 
 * @returns {Promise<Object>} Informações do banco de dados
 */
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

// === Operações CRUD Genéricas ===

/**
 * Cria um registro em uma tabela.
 * 
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

/**
 * Lê registros de uma tabela com filtros e paginação.
 * 
 * @param {string} table - Nome da tabela
 * @param {Object} options - Opções de consulta
 * @param {Object} options.where - Condições WHERE
 * @param {Array} options.orderBy - Ordenação
 * @param {number} options.limit - Limite de registros
 * @param {number} options.offset - Offset para paginação
 * @param {Array} options.select - Campos a serem selecionados
 * @returns {Promise<Object>} Resultado da consulta com paginação
 */
export async function readRecords(table, options = {}) {
  const {
    where = {},
    orderBy = [],
    limit = 10,
    offset = 0,
    select = ['*']
  } = options;

  const whereClause = Object.keys(where).length > 0 
    ? `WHERE ${Object.keys(where).map(key => `${key} = $${Object.keys(where)[Object.keys(where).indexOf(key)]}`).join(' AND ')}`
    : '';

  const orderByClause = orderBy.length > 0 
    ? `ORDER BY ${orderBy.join(', ')}`
    : '';

  const selectClause = select.join(', ');
  
  const params = Object.values(where);
  const baseParams = params.length;
  
  // Adiciona parâmetros de paginação
  params.push(limit, offset);

  const text = `
    SELECT ${selectClause}
    FROM ${table}
    ${whereClause}
    ${orderByClause}
    LIMIT $${baseParams + 1} OFFSET $${baseParams + 2}
  `;

  const result = await query(text, params);
  
  // Contagem total para paginação
  const countText = `
    SELECT COUNT(*) as total
    FROM ${table}
    ${whereClause}
  `;
  
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

/**
 * Atualiza registros em uma tabela.
 * 
 * @param {string} table - Nome da tabela
 * @param {Object} data - Dados a serem atualizados
 * @param {Object} where - Condições WHERE
 * @param {Array} returning - Campos a serem retornados
 * @returns {Promise<Array>} Registros atualizados
 */
export async function updateRecords(table, data, where, returning = ['*']) {
  const dataFields = Object.keys(data);
  const dataValues = Object.values(data);
  const whereFields = Object.keys(where);
  const whereValues = Object.values(where);
  
  const setClause = dataFields.map((field, index) => `${field} = $${index + 1}`).join(', ');
  const whereClause = whereFields.map((field, index) => `${field} = $${dataFields.length + index + 1}`).join(' AND ');
  const returningClause = returning.join(', ');
  
  const text = `
    UPDATE ${table}
    SET ${setClause}
    WHERE ${whereClause}
    RETURNING ${returningClause}
  `;
  
  const result = await query(text, [...dataValues, ...whereValues]);
  return result.rows;
}

/**
 * Deleta registros de uma tabela.
 * 
 * @param {string} table - Nome da tabela
 * @param {Object} where - Condições WHERE
 * @param {Array} returning - Campos a serem retornados
 * @returns {Promise<Array>} Registros deletados
 */
export async function deleteRecords(table, where, returning = ['*']) {
  const whereFields = Object.keys(where);
  const whereValues = Object.values(where);
  
  const whereClause = whereFields.map((field, index) => `${field} = $${index + 1}`).join(' AND ');
  const returningClause = returning.join(', ');
  
  const text = `
    DELETE FROM ${table}
    WHERE ${whereClause}
    RETURNING ${returningClause}
  `;
  
  const result = await query(text, whereValues);
  return result.rows;
}

// === Operações Específicas do Domínio ===

/**
 * Salva metadados de imagem no banco de dados.
 * 
 * @param {Object} imageData - Dados da imagem
 * @param {string} imageData.filename - Nome do arquivo
 * @param {string} imageData.relativePath - Caminho relativo
 * @param {string} imageData.type - Tipo de imagem
 * @param {number} imageData.fileSize - Tamanho do arquivo
 * @param {number|null} imageData.userId - ID do usuário (opcional)
 * @returns {Promise<Object>} Registro da imagem salvo
 */
export async function saveImage(imageData) {
  const { filename, relativePath, type, fileSize, userId } = imageData;
  
  const text = `
    INSERT INTO images (filename, path, type, size, user_id, created_at)
    VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    RETURNING *
  `;
  
  const params = [filename, relativePath, type, fileSize, userId];
  const result = await query(text, params);
  
  logger.info('Imagem salva no banco de dados', {
    filename,
    type,
    size: fileSize,
    userId: userId || 'anonymous'
  });
  
  return result.rows[0];
}

/**
 * Obtém posts recentes publicados.
 * 
 * @param {number} limit - Limite de posts
 * @param {number} page - Página
 * @returns {Promise<Object>} Posts com paginação
 */
export async function getRecentPosts(limit = 10, page = 1) {
  const offset = (page - 1) * limit;
  
  const text = `
    SELECT id, title, slug, excerpt, image_url, created_at, updated_at
    FROM posts 
    WHERE published = true 
    ORDER BY created_at DESC 
    LIMIT $1 OFFSET $2
  `;
  
  const result = await query(text, [limit, offset]);
  
  // Contagem total
  const countResult = await query('SELECT COUNT(*) as total FROM posts WHERE published = true', []);
  const total = parseInt(countResult.rows[0].total, 10);
  const totalPages = Math.ceil(total / limit);

  return {
    posts: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  };
}

/**
 * Cria um novo post.
 * 
 * @param {Object} postData - Dados do post
 * @returns {Promise<Object>} Post criado
 */
export async function createPost(postData) {
  const { title, slug, excerpt, content, image_url, published } = postData;
  
  const text = `
    INSERT INTO posts (title, slug, excerpt, content, image_url, published, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING *
  `;
  
  const values = [title, slug, excerpt ?? null, content, image_url ?? null, published ?? false];
  const result = await query(text, values);
  
  logger.info('Post criado com sucesso', {
    id: result.rows[0].id,
    title,
    slug,
    published
  });
  
  return result.rows[0];
}

/**
 * Atualiza um post existente.
 * 
 * @param {number} id - ID do post
 * @param {Object} postData - Dados atualizados do post
 * @returns {Promise<Object>} Post atualizado
 */
export async function updatePost(id, postData) {
  const { title, slug, excerpt, content, image_url, published } = postData;
  
  const text = `
    UPDATE posts
    SET title = $1, slug = $2, excerpt = $3, content = $4, image_url = $5, 
        published = $6, updated_at = CURRENT_TIMESTAMP
    WHERE id = $7
    RETURNING *
  `;
  
  const values = [title, slug, excerpt ?? null, content, image_url ?? null, published ?? false, id];
  const result = await query(text, values);
  
  if (result.rows.length > 0) {
    logger.info('Post atualizado com sucesso', {
      id,
      title,
      slug,
      published
    });
  }
  
  return result.rows[0];
}

/**
 * Deleta um post.
 * 
 * @param {number} id - ID do post
 * @returns {Promise<Object>} Post deletado
 */
export async function deletePost(id) {
  const text = 'DELETE FROM posts WHERE id = $1 RETURNING id';
  const result = await query(text, [id]);
  
  if (result.rows.length > 0) {
    logger.info('Post deletado com sucesso', { id });
  }
  
  return result.rows[0];
}

// === Exportações ===

export const db = {
  query,
  transaction,
  closeDatabase,
  healthCheck,
  getDatabaseInfo,
  createRecord,
  readRecords,
  updateRecords,
  deleteRecords,
  saveImage,
  getRecentPosts,
  createPost,
  updatePost,
  deletePost
};

export default db;