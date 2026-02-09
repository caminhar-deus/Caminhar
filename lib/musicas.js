import { query } from './db.js';

/**
 * Retrieves all musicas from the database.
 * @returns {Promise<Array>} The list of all musicas.
 */
export async function getAllMusicas() {
  const text = 'SELECT * FROM musicas ORDER BY created_at DESC';
  const res = await query(text);
  return res.rows;
}

/**
 * Creates a new musica.
 * @param {Object} musica - The musica object with titulo, artista, url_imagem, url_spotify.
 * @returns {Promise<Object>} The created musica record.
 */
export async function createMusica(musica) {
  const { titulo, artista, url_imagem, url_spotify } = musica;
  const text = `
    INSERT INTO musicas (titulo, artista, url_imagem, url_spotify)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const values = [titulo, artista, url_imagem, url_spotify];
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
  const { titulo, artista, url_imagem, url_spotify } = musica;
  const text = `
    UPDATE musicas
    SET titulo = $1, artista = $2, url_imagem = $3, url_spotify = $4, updated_at = CURRENT_TIMESTAMP
    WHERE id = $5
    RETURNING *
  `;
  const values = [titulo, artista, url_imagem, url_spotify, id];
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