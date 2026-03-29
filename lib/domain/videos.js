import { query } from '../db.js';
import { createRecord, updateRecords, deleteRecords, raw } from '../crud.js';

/**
 * Wraps a database operation with a retry mechanism that performs a lazy migration
 * if a specific column is missing.
 * NOTE: While this provides resilience, "lazy migrations" are not recommended for
 * production environments. Schema changes should be handled by a dedicated migration
 * tool to ensure consistency and avoid potential race conditions.
 * @param {Function} operation The database operation to execute.
 */
async function withThumbnailMigration(operation) {
  try {
    return await operation();
  } catch (error) {
    if (error.code === '42703' && error.message.includes('thumbnail')) {
      await query('ALTER TABLE videos ADD COLUMN thumbnail TEXT', [], { log: false });
      return await operation(); // Retry the original operation
    }
    throw error;
  }
}

/**
 * Creates a new video.
 */
export async function createVideo(video, options = {}) {
  const videoData = {
    titulo: video.titulo,
    url_youtube: video.url_youtube,
    descricao: video.descricao ?? null,
    publicado: video.publicado ?? false,
    thumbnail: video.thumbnail ?? null,
  };

  return withThumbnailMigration(() => createRecord('videos', videoData, options));
}

/**
 * Updates an existing video.
 */
export async function updateVideo(id, video, options = {}) {
  const videoData = {
    titulo: video.titulo,
    url_youtube: video.url_youtube,
    descricao: video.descricao ?? null,
    publicado: video.publicado ?? false,
    thumbnail: video.thumbnail ?? null,
    updated_at: raw('CURRENT_TIMESTAMP'),
  };

  return withThumbnailMigration(async () => {
    const [updatedRecord] = await updateRecords('videos', videoData, { id }, options);
    return updatedRecord;
  });
}

/**
 * Deletes a video.
 */
export async function deleteVideo(id, options = {}) {
  const [deletedRecord] = await deleteRecords('videos', { id }, options);
  return deletedRecord;
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
 * @param {boolean} [publishedOnly=false] - Flag to filter for public-facing results.
 * @returns {Promise<Object>} The paginated videos and metadata.
 */
export async function getPaginatedVideos(page = 1, limit = 10, search = '', publishedOnly = false) {
  const offset = (page - 1) * limit;

  const conditions = [];
  const searchParams = [];

  if (publishedOnly) {
    conditions.push('publicado = true');
  }

  if (search) {
    const searchTerm = `%${search.toLowerCase()}%`;
    conditions.push(`LOWER(titulo) LIKE $${searchParams.length + 1}`);
    searchParams.push(searchTerm);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

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

  const total = parseInt(countRes.rows[0].count, 10);
  const totalPages = Math.ceil(total / limit);

  return {
    videos: videosRes.rows,
    data: videosRes.rows, // Alias for consistency
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      totalPages
    }
  };
}