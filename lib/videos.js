import { query } from './db.js';

/**
 * Retrieves all videos from the database.
 * @returns {Promise<Array>} The list of all videos.
 */
export async function getVideos() {
  const text = 'SELECT * FROM videos ORDER BY id DESC';
  const res = await query(text);
  return res.rows;
}

/**
 * Retrieves all videos from the database.
 * @returns {Promise<Array>} The list of all videos.
 */
export async function getAllVideos() {
  const text = 'SELECT * FROM videos ORDER BY created_at DESC';
  const res = await query(text);
  return res.rows;
}

/**
 * Retrieves videos with pagination.
 * @param {number} page - The page number (1-based).
 * @param {number} limit - The number of items per page.
 * @returns {Promise<Object>} The paginated videos and metadata.
 */
export async function getPaginatedVideos(page = 1, limit = 10) {
  const offset = (page - 1) * limit;
  const text = 'SELECT * FROM videos ORDER BY created_at DESC LIMIT $1 OFFSET $2';
  const countText = 'SELECT COUNT(*) FROM videos';
  
  const values = [limit, offset];
  const [videosRes, countRes] = await Promise.all([
    query(text, values),
    query(countText)
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
 * Creates a new video.
 * @param {Object} video - The video object with titulo, url_youtube, descricao.
 * @returns {Promise<Object>} The created video record.
 */
export async function createVideo(video) {
  const { titulo, url_youtube, descricao, publicado } = video;
  const text = `
    INSERT INTO videos (titulo, url_youtube, descricao, publicado)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const values = [titulo, url_youtube, descricao, publicado];
  const res = await query(text, values);
  return res.rows[0];
}

/**
 * Updates an existing video.
 * @param {number} id - The ID of the video to update.
 * @param {Object} video - The updated video object.
 * @returns {Promise<Object>} The updated video record.
 */
export async function updateVideo(id, video) {
  const { titulo, url_youtube, descricao, publicado } = video;
  const text = `
    UPDATE videos
    SET titulo = $1, url_youtube = $2, descricao = $3, publicado = $4, updated_at = CURRENT_TIMESTAMP
    WHERE id = $5
    RETURNING *
  `;
  const values = [titulo, url_youtube, descricao, publicado, id];
  const res = await query(text, values);
  return res.rows[0];
}

/**
 * Deletes a video by ID.
 * @param {number} id - The ID of the video to delete.
 * @returns {Promise<Object>} The deleted video record.
 */
export async function deleteVideo(id) {
  const text = 'DELETE FROM videos WHERE id = $1 RETURNING id';
  const res = await query(text, [id]);
  return res.rows[0];
}