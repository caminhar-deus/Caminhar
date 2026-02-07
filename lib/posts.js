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