import { query } from './db.js';

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
 * Retrieves musicas with pagination.
 * @param {number} page - The page number (1-based).
 * @param {number} limit - The number of items per page.
 * @param {string} [search] - Optional search term for title or artist.
 * @returns {Promise<Object>} The paginated musicas and total count.
 */
export async function getPaginatedMusicas(page = 1, limit = 10, search = '') {
  const offset = (page - 1) * limit;

  let text = 'SELECT * FROM musicas';
  let countText = 'SELECT COUNT(*) FROM musicas';

  const values = [limit, offset];
  const countValues = [];

  if (search) {
    const searchTerm = `%${search.toLowerCase()}%`;
    // $1 is limit, $2 is offset, so search term is $3 for the main query
    text += ' WHERE (LOWER(titulo) LIKE $3 OR LOWER(artista) LIKE $3)';
    // For count query, search term is the only parameter ($1)
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

  return {
    musicas: musicasRes.rows,
    total
  };
}

/**
 * Retrieves only published musicas from the database.
 * @param {string} [search] - Optional search term for title or artist.
 * @returns {Promise<Array>} The list of published musicas.
 */
export async function getPublishedMusicas(search) {
  let text = 'SELECT * FROM musicas WHERE publicado = true';
  const values = [];

  if (search) {
    text += ' AND (LOWER(titulo) LIKE $1 OR LOWER(artista) LIKE $1)';
    values.push(`%${search.toLowerCase()}%`);
  }

  text += ' ORDER BY created_at DESC';
  const res = await query(text, values);
  return res.rows;
}

/**
 * Creates a new musica.
 * @param {Object} musica - The musica object with titulo, artista, url_imagem, url_spotify.
 * @returns {Promise<Object>} The created musica record.
 */
export async function createMusica(musica) {
  const { titulo, artista, url_imagem, url_spotify, publicado } = musica;
  const text = `
    INSERT INTO musicas (titulo, artista, url_imagem, url_spotify, publicado)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const values = [titulo, artista, url_imagem, url_spotify, publicado];
  const res = await query(text, values);
  return res.rows[0];
}

/**
 * Updates an existing musica.
 * @param {number} id - The ID of the musica to update.
 * @param {Object} musica - The updated musica object.
 * @returns {Promise<Object>} The updated musica record.
 */
export async function updateMusica(id, musica) {
  const { titulo, artista, url_imagem, url_spotify, publicado } = musica;
  const text = `
    UPDATE musicas
    SET titulo = $1, artista = $2, url_imagem = $3, url_spotify = $4, publicado = $5, updated_at = CURRENT_TIMESTAMP
    WHERE id = $6
    RETURNING *
  `;
  const values = [titulo, artista, url_imagem, url_spotify, publicado, id];
  const res = await query(text, values);
  return res.rows[0];
}

/**
 * Deletes a musica by ID.
 * @param {number} id - The ID of the musica to delete.
 * @returns {Promise<Object>} The deleted musica record.
 */
export async function deleteMusica(id) {
  const text = 'DELETE FROM musicas WHERE id = $1 RETURNING id';
  const res = await query(text, [id]);
  return res.rows[0];
}