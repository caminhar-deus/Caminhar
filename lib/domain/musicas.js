import { query } from '../db.js';
import { createRecord, updateRecords, deleteRecords, raw } from '../crud.js';

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
export async function createMusica(musica, options = {}) {
  const musicaData = {
    titulo: musica.titulo ?? null,
    artista: musica.artista ?? null,
    descricao: musica.descricao ?? null,
    url_spotify: musica.url_spotify ?? null,
    publicado: musica.publicado ?? false,
    created_at: raw('CURRENT_TIMESTAMP'),
  };
  return createRecord('musicas', musicaData, options);
}

/**
 * Updates an existing musica.
 */
export async function updateMusica(id, musica, options = {}) {
  const musicaData = {
    titulo: musica.titulo ?? null,
    artista: musica.artista ?? null,
    descricao: musica.descricao ?? null,
    url_spotify: musica.url_spotify ?? null,
    publicado: musica.publicado ?? false,
    updated_at: raw('CURRENT_TIMESTAMP'),
  };
  const [updatedRecord] = await updateRecords('musicas', musicaData, { id }, options);
  return updatedRecord;
}

/**
 * Deletes a musica by ID.
 */
export async function deleteMusica(id, options = {}) {
  const [deletedRecord] = await deleteRecords('musicas', { id }, options);
  return deletedRecord;
}

/**
 * Retrieves musicas with pagination for the admin panel.
 * @param {number} page - The page number (1-based).
 * @param {number} limit - The number of items per page.
 * @param {string} [search] - Optional search term for title or artist.
 * @param {boolean} [publishedOnly=false] - Flag to filter for public-facing results.
 * @returns {Promise<Object>} The paginated musicas and metadata.
 */
export async function getPaginatedMusicas(page = 1, limit = 10, search = '', publishedOnly = false) {
  const offset = (page - 1) * limit;

  const conditions = [];
  const searchParams = [];

  if (publishedOnly) {
    conditions.push('publicado = true');
  }

  if (search) {
    const searchTerm = `%${search.toLowerCase()}%`;
    conditions.push(`(LOWER(titulo) LIKE $${searchParams.length + 1} OR LOWER(artista) LIKE $${searchParams.length + 1})`);
    searchParams.push(searchTerm);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataParams = [...searchParams, limit, offset];
  const limitIndex = searchParams.length + 1;
  const offsetIndex = searchParams.length + 2;

  const text = `
    SELECT * FROM musicas
    ${whereClause}
    ORDER BY position ASC, created_at DESC
    LIMIT $${limitIndex} OFFSET $${offsetIndex}
  `;

  const countText = `SELECT COUNT(*) FROM musicas ${whereClause}`;

  const [musicasRes, countRes] = await Promise.all([
    query(text, dataParams),
    query(countText, searchParams)
  ]);

  const total = parseInt(countRes.rows[0]?.count || '0', 10);
  const totalPages = Math.ceil(total / limit);

  return { 
    musicas: musicasRes.rows, 
    data: musicasRes.rows, // Alias para compatibilidade com componentes genéricos (AdminCrudBase)
    pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total, totalPages } 
  };
}