import { Pool } from 'pg';

// Use a connection pool for better performance and connection management.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false // Permite conexão com certificados auto-assinados (comum em cloud)
  } : undefined,
  // Configurações de performance
  max: 20,              // Máximo de conexões no pool
  min: 2,               // Mínimo de conexões no pool
  idleTimeoutMillis: 30000, // Tempo de timeout de conexões ociosas
  connectionTimeoutMillis: 2000, // Tempo de timeout de conexão
});

/**
 * Executes a query against the database.
 * @param {string} text The SQL query text.
 * @param {Array} params The parameters for the query.
 * @param {Object} options Options like logging and error handling.
 * @returns {Promise<QueryResult>} The result from the database.
 */
export async function query(text, params = [], options = {}) {
  const { log = false, throwOnError = true } = options; // Log set to false by default for backwards compatibility
  const start = Date.now();
  
  try {
    if (log) {
      console.log('Executando consulta SQL', {
        query: text.replace(/\s+/g, ' ').trim(),
        params: params.length > 0 ? params : undefined,
        timestamp: new Date().toISOString()
      });
    }

    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    if (log) {
      console.log('Consulta SQL executada com sucesso', {
        duration: `${duration}ms`,
        rowCount: res?.rowCount || 0,
        timestamp: new Date().toISOString()
      });
    }

    return res;
  } catch (error) {
    const duration = Date.now() - start;
    
    const errorDetails = {
      code: error.code,
      message: error.message,
      query: text.replace(/\s+/g, ' ').trim(),
      duration: `${duration}ms`
    };

    console.error('Erro ao executar consulta SQL', errorDetails);

    if (throwOnError) {
      throw error;
    }

    return null;
  }
}

/**
 * Closes the database connection pool.
 */
export async function closeDatabase() {
  try {
    await pool.end();
    console.log('Connection pool fechado com sucesso');
  } catch (error) {
    console.error('Erro ao fechar connection pool', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

/**
 * Executa uma transação com rollback automático em caso de erro.
 * 
 * @param {Function} callback - Função que recebe o client da transação
 * @returns {Promise<*>} Resultado da transação
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
    console.error('Transação falhou e foi revertida', {
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
 * Verifica a saúde da conexão com o banco de dados.
 * 
 * @returns {Promise<boolean>} True se a conexão está saudável
 */
export async function healthCheck() {
  try {
    const result = await query('SELECT 1 as health_check', [], { log: false });
    return result && result.rows.length > 0 && result.rows[0].health_check === 1;
  } catch (error) {
    console.error('Health check do banco de dados falhou', {
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
    console.error('Erro ao obter informações do banco de dados', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

// === Operações CRUD Genéricas ===

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

// === Fim Operações CRUD Genéricas ===

/**
 * Registra uma atividade no log de auditoria
 * @param {string} username - Nome do usuário que realizou a ação
 * @param {string} action - 'CREATE', 'UPDATE', ou 'DELETE'
 * @param {string} entityType - Ex: 'PRODUCT', 'USER', 'POST'
 * @param {number} entityId - ID do registro modificado
 * @param {string} details - Detalhes textuais adicionais
 * @param {string} ipAddress - IP da requisição
 */
export async function logActivity(username, action, entityType, entityId, details, ipAddress = '') {
  const text = `
    INSERT INTO activity_logs (username, action, entity_type, entity_id, details, ip_address)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;
  await query(text, [username, action, entityType, entityId, details, ipAddress], { log: false });
}

/**
 * Saves image metadata to the database.
 * @param {string} filename 
 * @param {string} relativePath 
 * @param {string} type 
 * @param {number} fileSize 
 * @param {number|null} userId 
 * @returns {Promise<Object>} The saved image record.
 */
export async function saveImage(filename, relativePath, type, fileSize, userId) {
    const text = `
        INSERT INTO images(filename, path, type, size, user_id)
        VALUES($1, $2, $3, $4, $5)
        RETURNING *;
    `;
    const params = [filename, relativePath, type, fileSize, userId];
    const res = await query(text, params);
    return res.rows[0];
}

/**
 * Retrieves recent published posts.
 * @param {number} limit The number of posts to retrieve.
 * @returns {Promise<Array>} The list of recent posts.
 */
export async function getRecentPosts(limit = 10, page = 1) {
  const offset = (page - 1) * limit;
  const text = 'SELECT * FROM posts WHERE published = true ORDER BY created_at DESC LIMIT $1 OFFSET $2';
  const res = await query(text, [limit, offset]);
  return res.rows;
}

/**
 * Retrieves all posts (including drafts) for admin.
 * @returns {Promise<Array>} The list of all posts.
 */
export async function getAllPosts() {
  const text = 'SELECT * FROM posts ORDER BY created_at DESC';
  const res = await query(text);
  return res.rows;
}

/**
 * Retrieves posts with pagination for the admin panel.
 * @param {number} page - The page number (1-based).
 * @param {number} limit - The number of items per page.
 * @param {string} [search] - Optional search term for title.
 * @returns {Promise<Object>} The paginated posts and metadata.
 */
export async function getPaginatedPosts(page = 1, limit = 10, search = '') {
  const offset = (page - 1) * limit;
  const params = [];
  const countValues = [];
  let whereClause = '';

  if (search) {
    const searchTerm = `%${search.toLowerCase()}%`;
    whereClause = 'WHERE LOWER(title) LIKE $1';
    params.push(searchTerm);
    countValues.push(searchTerm);
  }

  // Adiciona os parâmetros de paginação ao final
  params.push(limit, offset);
  const limitIndex = params.length - 1;
  const offsetIndex = params.length;

  const text = `
    SELECT id, title, slug, published, created_at, updated_at FROM posts
    ${whereClause}
    ORDER BY position ASC, created_at DESC
    LIMIT $${limitIndex} OFFSET $${offsetIndex}
  `;

  const countText = `SELECT COUNT(*) FROM posts ${whereClause}`;

  const [postsRes, countRes] = await Promise.all([
    query(text, params),
    query(countText, countValues)
  ]);

  const total = parseInt(countRes.rows[0]?.count || '0', 10);
  const totalPages = Math.ceil(total / limit);

  return {
    posts: postsRes.rows,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      totalPages
    }
  };
}

/**
 * Creates a new post.
 */
export async function createPost(post) {
  const { title, slug, excerpt, content, image_url, published } = post;
  const text = `
    INSERT INTO posts (title, slug, excerpt, content, image_url, published)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const values = [title, slug, excerpt ?? null, content, image_url ?? null, published ?? false];
  const res = await query(text, values);
  return res.rows[0];
}

/**
 * Updates or inserts a setting.
 */
export async function updateSetting(key, value, type, description) {
  const text = `
    INSERT INTO settings (key, value, type, description, updated_at)
    VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    ON CONFLICT (key) 
    DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;
  const res = await query(text, [key, value, type, description]);
  return res.rows[0];
}

/**
 * Alias for updateSetting to maintain compatibility with existing code.
 */
export async function setSetting(key, value, type, description) {
  return await updateSetting(key, value, type, description);
}

/**
 * Updates an existing post.
 */
export async function updatePost(id, post) {
  const { title, slug, excerpt, content, image_url, published } = post;
  const text = `
    UPDATE posts
    SET title = $1, slug = $2, excerpt = $3, content = $4, image_url = $5, published = $6, updated_at = CURRENT_TIMESTAMP
    WHERE id = $7
    RETURNING *
  `;
  const values = [title, slug, excerpt ?? null, content, image_url ?? null, published ?? false, id];
  const res = await query(text, values);
  return res.rows[0];
}

/**
 * Deletes a post.
 */
export async function deletePost(id) {
  const text = 'DELETE FROM posts WHERE id = $1 RETURNING id';
  const res = await query(text, [id]);
  return res.rows[0];
}

/**
 * Creates a new video.
 */
export async function createVideo(video) {
  const { titulo, url_youtube, descricao, publicado, thumbnail } = video;
  const text = `
    INSERT INTO videos (titulo, url_youtube, descricao, publicado, thumbnail)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const values = [titulo, url_youtube, descricao ?? null, publicado ?? false, thumbnail ?? null];
  const res = await query(text, values);
  return res.rows[0];
}

/**
 * Updates an existing video.
 */
export async function updateVideo(id, video) {
  const { titulo, url_youtube, descricao, publicado, thumbnail } = video;
  const text = `
    UPDATE videos
    SET titulo = $1, url_youtube = $2, descricao = $3, publicado = $4, thumbnail = $5, updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING *
  `;
  const values = [titulo, url_youtube, descricao ?? null, publicado ?? false, thumbnail ?? null, id];
  const res = await query(text, values);
  return res.rows[0];
}

/**
 * Deletes a video.
 */
export async function deleteVideo(id) {
  const text = 'DELETE FROM videos WHERE id = $1 RETURNING id';
  const res = await query(text, [id]);
  return res.rows[0];
}

/**
 * Retrieves a specific video by id.
 */
export async function getVideo(id) {
  const text = 'SELECT * FROM videos WHERE id = $1';
  const res = await query(text, [id]);
  return res.rows[0];
}

/**
 * Retrieves videos with pagination.
 * @param {number} page - The page number (1-based).
 * @param {number} limit - The number of items per page.
 * @param {string} [search] - Optional search term for title.
 * @returns {Promise<Object>} The paginated videos and metadata.
 */
export async function getPaginatedVideos(page = 1, limit = 10, search = '') {
  const offset = (page - 1) * limit;
  
  let text = 'SELECT * FROM videos';
  let countText = 'SELECT COUNT(*) FROM videos';
  
  const values = [limit, offset];
  const countValues = [];

  if (search) {
    const searchTerm = `%${search.toLowerCase()}%`;
    text += ' WHERE LOWER(titulo) LIKE $3';
    countText += ' WHERE LOWER(titulo) LIKE $1';
    values.push(searchTerm);
    countValues.push(searchTerm);
  }

  text += ' ORDER BY position ASC, created_at DESC LIMIT $1 OFFSET $2';

  const [videosRes, countRes] = await Promise.all([
    query(text, values),
    query(countText, countValues)
  ]);

  const total = parseInt(countRes.rows[0].count, 10);
  const totalPages = Math.ceil(total / limit);

  return {
    videos: videosRes.rows,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      totalPages
    }
  };
}

/**
 * Retrieves all musicas from the database.
 * @param {string} [search] - Optional search term for title or artist.
 * @returns {Promise<Array>} The list of all musicas.
 */
export async function getAllMusicas(search) {
  let text = 'SELECT * FROM musicas';
  const values = [];

  if (search) {
    text += ' WHERE LOWER(titulo) LIKE $1 OR LOWER(artista) LIKE $1';
    values.push(`%${search.toLowerCase()}%`);
  }

  text += ' ORDER BY position ASC, created_at DESC';
  const res = await query(text, values);
  return res.rows;
}

/**
 * Creates a new musica.
 */
export async function createMusica(musica) {
  const { titulo, artista, descricao, url_spotify, publicado } = musica;
  const text = `
    INSERT INTO musicas (titulo, artista, descricao, url_spotify, publicado, created_at)
    VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    RETURNING *
  `;
  const values = [titulo ?? null, artista ?? null, descricao ?? null, url_spotify ?? null, publicado ?? false];
  const res = await query(text, values);
  return res.rows[0];
}

/**
 * Updates an existing musica.
 */
export async function updateMusica(id, musica) {
  const { titulo, artista, descricao, url_spotify, publicado } = musica;
  const text = `
    UPDATE musicas
    SET titulo = $1, artista = $2, descricao = $3, url_spotify = $4, publicado = $5, updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING *
  `;
  const values = [titulo ?? null, artista ?? null, descricao ?? null, url_spotify ?? null, publicado ?? false, id];
  const res = await query(text, values);
  return res.rows[0];
}

/**
 * Deletes a musica by ID.
 */
export async function deleteMusica(id) {
  const text = 'DELETE FROM musicas WHERE id = $1 RETURNING id';
  const res = await query(text, [id]);
  return res.rows[0];
}

/**
 * Retrieves musicas with pagination for the admin panel.
 * @param {number} page - The page number (1-based).
 * @param {number} limit - The number of items per page.
 * @param {string} [search] - Optional search term for title or artist.
 * @returns {Promise<Object>} The paginated musicas and metadata.
 */
export async function getPaginatedMusicas(page = 1, limit = 10, search = '') {
  const offset = (page - 1) * limit;

  const params = [];
  const countValues = [];
  let whereClause = '';

  if (search) {
    const searchTerm = `%${search.toLowerCase()}%`;
    whereClause = 'WHERE (LOWER(titulo) LIKE $1 OR LOWER(artista) LIKE $1)';
    params.push(searchTerm);
    countValues.push(searchTerm);
  }

  // Adiciona os parâmetros de paginação ao final
  params.push(limit, offset);
  const limitIndex = params.length - 1;
  const offsetIndex = params.length;

  const text = `
    SELECT * FROM musicas
    ${whereClause}
    ORDER BY position ASC, created_at DESC
    LIMIT $${limitIndex} OFFSET $${offsetIndex}
  `;

  const countText = `SELECT COUNT(*) FROM musicas ${whereClause}`;

  const [musicasRes, countRes] = await Promise.all([
    query(text, params),
    query(countText, countValues)
  ]);

  const total = parseInt(countRes.rows[0]?.count || '0', 10);
  const totalPages = Math.ceil(total / limit);

  return { 
    musicas: musicasRes.rows, 
    data: musicasRes.rows, // Alias para compatibilidade com componentes genéricos (AdminCrudBase)
    pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total, totalPages } 
  };
}

/**
 * Retrieves all settings as a key-value object.
 * @returns {Promise<Object>} The settings object.
 */
export async function getSettings() {
  const text = 'SELECT * FROM settings';
  const res = await query(text);
  return res.rows.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});
}

/**
 * Retrieves a specific setting by key.
 * @param {string} key The setting key.
 * @returns {Promise<string|null>} The setting value or null if not found.
 */
export async function getSetting(key) {
  const text = 'SELECT value FROM settings WHERE key = $1';
  const res = await query(text, [key]);
  return res.rows.length > 0 ? res.rows[0].value : null;
}

/**
 * Retrieves all settings as an array of objects.
 * @returns {Promise<Array>} The settings array.
 */
export async function getAllSettings() {
  const text = 'SELECT * FROM settings';
  const res = await query(text);
  return res.rows;
}
