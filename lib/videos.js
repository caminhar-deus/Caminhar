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
 * Retrieves only published videos from the database.
 * @param {string} [search] - Optional search term for title.
 * @returns {Promise<Array>} The list of published videos.
 */
export async function getPublishedVideos(search) {
  let text = 'SELECT * FROM videos WHERE publicado = true';
  const values = [];

  if (search) {
    text += ' AND LOWER(titulo) LIKE $1';
    values.push(`%${search.toLowerCase()}%`);
  }

  text += ' ORDER BY created_at DESC';
  const res = await query(text, values);
  return res.rows;
}

/**
 * Creates a new video.
 * @param {Object} video - The video object with titulo, url_youtube, descricao.
 * @returns {Promise<Object>} The created video record.
 */
export async function createVideo(video) {
  const { titulo, url_youtube, descricao, publicado, thumbnail } = video;
  const text = `
    INSERT INTO videos (titulo, url_youtube, descricao, publicado, thumbnail)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const values = [titulo, url_youtube, descricao, publicado, thumbnail];
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
  const { titulo, url_youtube, descricao, publicado = false, thumbnail } = video;
  const text = `
    UPDATE videos
    SET titulo = $1, url_youtube = $2, descricao = $3, publicado = $4, thumbnail = $5, updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING *
  `;
  const values = [titulo, url_youtube, descricao || null, publicado, thumbnail, id];
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