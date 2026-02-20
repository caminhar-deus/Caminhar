import { Pool } from 'pg';

// Use a connection pool for better performance and connection management.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false // Permite conexão com certificados auto-assinados (comum em cloud)
  } : undefined
});

/**
 * Executes a query against the database.
 * @param {string} text The SQL query text.
 * @param {Array} params The parameters for the query.
 * @returns {Promise<QueryResult>} The result from the database.
 */
export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // console.log('executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Error executing query', { text });
    throw error;
  }
}

/**
 * Closes the database connection pool.
 */
export async function closeDatabase() {
  await pool.end();
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
  const { titulo, url_youtube, descricao, publicado } = video;
  const text = `
    INSERT INTO videos (titulo, url_youtube, descricao, publicado)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const values = [titulo, url_youtube, descricao ?? null, publicado ?? false];
  const res = await query(text, values);
  return res.rows[0];
}

/**
 * Updates an existing video.
 */
export async function updateVideo(id, video) {
  const { titulo, url_youtube, descricao, publicado } = video;
  const text = `
    UPDATE videos
    SET titulo = $1, url_youtube = $2, descricao = $3, publicado = $4, updated_at = CURRENT_TIMESTAMP
    WHERE id = $5
    RETURNING *
  `;
  const values = [titulo, url_youtube, descricao ?? null, publicado ?? false, id];
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

  text += ' ORDER BY created_at DESC LIMIT $1 OFFSET $2';

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

  text += ' ORDER BY created_at DESC';
  const res = await query(text, values);
  return res.rows;
}

/**
 * Creates a new musica.
 */
export async function createMusica(musica) {
  const { titulo, artista, descricao, url_spotify, publicado } = musica;
  const text = `
    INSERT INTO musicas (titulo, artista, descricao, url_spotify, publicado)
    VALUES ($1, $2, $3, $4, $5)
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
  
  let text = 'SELECT * FROM musicas';
  let countText = 'SELECT COUNT(*) FROM musicas';
  
  const values = [limit, offset];
  const countValues = [];

  if (search) {
    const searchTerm = `%${search.toLowerCase()}%`;
    text += ' WHERE (LOWER(titulo) LIKE $3 OR LOWER(artista) LIKE $3)';
    countText += ' WHERE (LOWER(titulo) LIKE $1 OR LOWER(artista) LIKE $1)';
    values.push(searchTerm);
    countValues.push(searchTerm);
  }

  text += ' ORDER BY created_at DESC LIMIT $1 OFFSET $2';

  const [musicasRes, countRes] = await Promise.all([
    query(text, values),
    query(countText, countValues)
  ]);

  const total = parseInt(countRes.rows[0].count, 10);
  const totalPages = Math.ceil(total / limit);

  return { musicas: musicasRes.rows, pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total, totalPages } };
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
