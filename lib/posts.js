import { query } from './db.js';

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
 * Retrieves posts with pagination.
 * @param {number} page - The page number (1-based).
 * @param {number} limit - The number of items per page.
 * @param {string} [search] - Optional search term for title.
 * @returns {Promise<Object>} The paginated posts and total count.
 */
export async function getPaginatedPosts(page = 1, limit = 10, search = '') {
  const offset = (page - 1) * limit;

  let text = 'SELECT * FROM posts';
  let countText = 'SELECT COUNT(*) FROM posts';

  const values = [limit, offset];
  const countValues = [];

  if (search) {
    const searchTerm = `%${search.toLowerCase()}%`;
    // $1 is limit, $2 is offset, so search term is $3 for the main query
    text += ' WHERE LOWER(title) LIKE $3';
    // For count query, search term is the only parameter ($1)
    countText += ' WHERE LOWER(title) LIKE $1';
    values.push(searchTerm);
    countValues.push(searchTerm);
  }

  text += ' ORDER BY created_at DESC LIMIT $1 OFFSET $2';

  const [postsRes, countRes] = await Promise.all([
    query(text, values),
    query(countText, countValues)
  ]);

  const total = parseInt(countRes.rows[0].count, 10);

  return {
    posts: postsRes.rows,
    total
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