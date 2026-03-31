import { query, transaction } from '../db.js';
import { createRecord, updateRecords, deleteRecords } from '../crud.js';

/**
 * Retrieves paginated videos for the admin panel.
 * @param {number} page - The page number.
 * @param {number} limit - The number of items per page.
 * @param {string} [search] - Optional search term for the title.
 * @returns {Promise<Object>} The paginated videos and metadata.
 */
export async function getPaginatedVideos(page = 1, limit = 10, search = '') {
  const offset = (page - 1) * limit;
  const searchParams = [];
  let whereClause = '';

  if (search) {
    const searchTerm = `%${search.toLowerCase()}%`;
    whereClause = `WHERE (LOWER(titulo) LIKE $${searchParams.length + 1} OR LOWER(descricao) LIKE $${searchParams.length + 1})`;
    searchParams.push(searchTerm);
  }

  const dataParams = [...searchParams, limit, offset];
  const limitIndex = searchParams.length + 1;
  const offsetIndex = searchParams.length + 2;

  const text = `
    SELECT * FROM videos
    ${whereClause}
    ORDER BY position ASC, created_at DESC
    LIMIT $${limitIndex} OFFSET $${offsetIndex}
  `;

  const countText = `SELECT COUNT(*) FROM videos ${whereClause}`;

  const [videosRes, countRes] = await Promise.all([
    query(text, dataParams),
    query(countText, searchParams)
  ]);

  const total = parseInt(countRes.rows[0]?.count || '0', 10);
  const totalPages = Math.ceil(total / limit);

  return {
    data: videosRes.rows,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      totalPages
    }
  };
}

/**
 * Retrieves PUBLIC paginated videos, ensuring only published videos are returned.
 * @param {number} page - The page number.
 * @param {number} limit - The number of items per page.
 * @param {string} [search] - Optional search term for the title.
 * @returns {Promise<Object>} The paginated videos and metadata.
 */
export async function getPublicPaginatedVideos(page = 1, limit = 10, search = '') {
  const offset = (page - 1) * limit;
  const searchParams = [];
  // FIX: Always filter for published videos in the public API.
  let whereClause = 'WHERE publicado = true';

  if (search) {
    const searchTerm = `%${search.toLowerCase()}%`;
    // FIX: Search in both title and description
    whereClause += ` AND (LOWER(titulo) LIKE $${searchParams.length + 1} OR LOWER(descricao) LIKE $${searchParams.length + 1})`;
    searchParams.push(searchTerm);
  }

  const dataParams = [...searchParams, limit, offset];
  const limitIndex = searchParams.length + 1;
  const offsetIndex = searchParams.length + 2;

  const text = `
    SELECT * FROM videos
    ${whereClause}
    ORDER BY position ASC, created_at DESC
    LIMIT $${limitIndex} OFFSET $${offsetIndex}
  `;

  const countText = `SELECT COUNT(*) FROM videos ${whereClause}`;

  const [videosRes, countRes] = await Promise.all([
    query(text, dataParams),
    query(countText, searchParams)
  ]);

  const total = parseInt(countRes.rows[0]?.count || '0', 10);
  const totalPages = Math.ceil(total / limit);

  return { data: videosRes.rows, pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total, totalPages } };
}

/**
 * Creates a new video record.
 * @param {object} videoData - The data for the new video.
 * @returns {Promise<object>} The newly created video record.
 */
export async function createVideo(videoData) {
  const dataToInsert = {
    titulo: videoData.titulo,
    url_youtube: videoData.url_youtube,
    descricao: videoData.descricao ?? null,
    thumbnail: videoData.thumbnail ?? null,
    publicado: videoData.publicado ?? false,
  };

  const maxPositionRes = await query('SELECT MAX(position) as max_pos FROM videos');
  const maxPosition = maxPositionRes.rows[0]?.max_pos || 0;
  dataToInsert.position = maxPosition + 1;

  return createRecord('videos', dataToInsert);
}

/**
 * Updates an existing video record.
 * @param {number} id - The ID of the video to update.
 * @param {object} videoData - The data to update.
 * @returns {Promise<object>} The updated video record.
 */
export async function updateVideo(id, videoData) {
  const [updatedRecord] = await updateRecords('videos', videoData, { id });
  return updatedRecord;
}

/**
 * Deletes a video record.
 * @param {number} id - The ID of the video to delete.
 * @returns {Promise<object>} The deleted video record.
 */
export async function deleteVideo(id) {
  const [deletedRecord] = await deleteRecords('videos', { id });
  return deletedRecord;
}

/**
 * Reorders a list of videos by updating their 'position' field in a transaction.
 * @param {Array<{id: number, position: number}>} items - The items to reorder.
 */
export async function reorderVideos(items) {
  if (!items || items.length === 0) return;

  return transaction(async (client) => {
    const promises = items.map(item => 
      query('UPDATE videos SET position = $1 WHERE id = $2', [item.position, item.id], { client })
    );
    await Promise.all(promises);
  });
}