import pg from 'pg';
const { Pool } = pg;

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
export async function getRecentPosts(limit = 10) {
  const text = 'SELECT * FROM posts WHERE published = true ORDER BY created_at DESC LIMIT $1';
  const res = await query(text, [limit]);
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
  const values = [title, slug, excerpt, content, image_url, published];
  const res = await query(text, values);
  return res.rows[0];
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
  const values = [title, slug, excerpt, content, image_url, published, id];
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