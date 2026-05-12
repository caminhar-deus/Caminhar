import { query } from '../db.js';
import { createRecord, updateRecords, deleteRecords, raw } from '../crud.js';

/**
 * Retorna todas as músicas do banco de dados.
 * @param {string} [search] - Termo de busca opcional por título ou artista.
 * @returns {Promise<Array>} Lista de todas as músicas.
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
 * Cria uma nova música.
 * @param {object} musica - Dados da música.
 * @param {object} [options] - Opções adicionais (ex: { client } para transações).
 * @returns {Promise<object>} A música recém-criada.
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
 * Atualiza uma música existente.
 * @param {number} id - ID da música a ser atualizada.
 * @param {object} musica - Dados para atualização.
 * @param {object} [options] - Opções adicionais (ex: { client } para transações).
 * @returns {Promise<object>} A música atualizada.
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
 * Remove uma música pelo ID.
 * @param {number} id - ID da música a ser removida.
 * @param {object} [options] - Opções adicionais (ex: { client } para transações).
 * @returns {Promise<object>} A música removida.
 */
export async function deleteMusica(id, options = {}) {
  const [deletedRecord] = await deleteRecords('musicas', { id }, options);
  return deletedRecord;
}

/**
 * Retorna músicas paginadas.
 * @param {number} page - Número da página (base 1).
 * @param {number} limit - Itens por página.
 * @param {string} [search] - Termo de busca opcional por título ou artista.
 * @param {boolean} [publishedOnly=false] - Se deve filtrar apenas músicas publicadas.
 * @returns {Promise<Object>} Músicas paginadas com metadados.
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