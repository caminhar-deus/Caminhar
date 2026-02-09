import { query } from './db.js';

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
 * Creates a new video.
 * @param {Object} video - The video object with titulo, url_youtube.
 * @returns {Promise<Object>} The created video record.
 */
export async function createVideo(video) {
  const { titulo, url_youtube } = video;
  const text = `
    INSERT INTO videos (titulo, url_youtube)
    VALUES ($1, $2)
    RETURNING *
  `;
  const values = [titulo, url_youtube];
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
  const { titulo, url_youtube } = video;
  const text = `
    UPDATE videos
    SET titulo = $1, url_youtube = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *
  `;
  const values = [titulo, url_youtube, id];
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