import { query, transaction } from '../db.js';
import { createRecord, updateRecords, deleteRecords } from '../crud.js';

/**
 * Função interna para centralizar a lógica de paginação de vídeos.
 * @param {Object} params - Parâmetros de paginação.
 * @param {number} params.page - Número da página.
 * @param {number} params.limit - Itens por página.
 * @param {string} params.search - Termo de busca.
 * @param {boolean} params.publishedOnly - Se deve filtrar apenas publicados.
 * @returns {Promise<Object>} Dados paginados com metadados.
 */
async function _paginateVideos({ page = 1, limit = 10, search = '', publishedOnly = false } = {}) {
  const offset = (page - 1) * limit;
  const searchParams = [];
  const conditions = [];

  if (publishedOnly) {
    conditions.push('publicado = true');
  }

  if (search) {
    const searchTerm = `%${search.toLowerCase()}%`;
    conditions.push(`(LOWER(titulo) LIKE $${searchParams.length + 1} OR LOWER(descricao) LIKE $${searchParams.length + 1})`);
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

  const total = parseInt(countRes.rows[0]?.count || '0', 10);
  const totalPages = Math.ceil(total / limit);

  return {
    data: videosRes.rows,
    pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total, totalPages }
  };
}

/**
 * Retorna vídeos paginados.
 * @param {number} page - Número da página.
 * @param {number} limit - Itens por página.
 * @param {string} [search] - Termo de busca no título ou descrição.
 * @param {boolean} [publishedOnly=false] - Se deve filtrar apenas vídeos publicados.
 * @returns {Promise<Object>} Vídeos paginados com metadados.
 */
export async function getPaginatedVideos(page = 1, limit = 10, search = '', publishedOnly = false) {
  return _paginateVideos({ page, limit, search, publishedOnly });
}

/**
 * Retorna vídeos públicos paginados (alias para getPaginatedVideos com publishedOnly=true).
 * @param {number} page - Número da página.
 * @param {number} limit - Itens por página.
 * @param {string} [search] - Termo de busca no título ou descrição.
 * @returns {Promise<Object>} Vídeos paginados com metadados.
 */
export async function getPublicPaginatedVideos(page = 1, limit = 10, search = '') {
  return getPaginatedVideos(page, limit, search, true);
}

/**
 * Cria um novo vídeo.
 * @param {object} videoData - Dados do vídeo.
 * @param {object} [options] - Opções adicionais (ex: { client } para transações).
 * @returns {Promise<object>} O vídeo recém-criado.
 */
export async function createVideo(videoData, options = {}) {
  const dataToInsert = {
    titulo: videoData.titulo,
    url_youtube: videoData.url_youtube,
    descricao: videoData.descricao ?? null,
    thumbnail: videoData.thumbnail ?? null,
    publicado: videoData.publicado ?? false,
  };

  // Usa transação para evitar race condition na leitura de MAX(position)
  // entre chamadas concorrentes a createVideo
  return transaction(async (client) => {
    const maxPositionRes = await query('SELECT MAX(position) as max_pos FROM videos', [], { client });
    const maxPosition = maxPositionRes.rows[0]?.max_pos || 0;
    dataToInsert.position = maxPosition + 1;

    // Repassa options mescladas com o client da transação
    return createRecord('videos', dataToInsert, { ...options, client });
  });
}

/**
 * Atualiza um vídeo existente.
 * @param {number} id - ID do vídeo a ser atualizado.
 * @param {object} videoData - Dados para atualização.
 * @returns {Promise<object>} O vídeo atualizado.
 */
export async function updateVideo(id, videoData) {
  const [updatedRecord] = await updateRecords('videos', videoData, { id });
  return updatedRecord;
}

/**
 * Remove um vídeo pelo ID.
 * @param {number} id - ID do vídeo a ser removido.
 * @returns {Promise<object>} O vídeo removido.
 */
export async function deleteVideo(id) {
  const [deletedRecord] = await deleteRecords('videos', { id });
  return deletedRecord;
}

/**
 * Reordena uma lista de vídeos atualizando o campo 'position' em transação.
 * @param {Array<{id: number, position: number}>} items - Itens a reordenar.
 */
export async function reorderVideos(items) {
  if (!items || items.length === 0) return;

  return transaction(async (client) => {
    const results = await Promise.allSettled(
      items.map(item =>
        query('UPDATE videos SET position = $1 WHERE id = $2', [item.position, item.id], { client })
      )
    );

    // Identifica falhas parciais para logging preciso
    const failures = results
      .map((result, index) => ({ result, item: items[index] }))
      .filter(({ result }) => result.status === 'rejected');

    if (failures.length > 0) {
      failures.forEach(({ result, item }) => {
        console.error('[Videos] ❌ Erro ao atualizar posição do vídeo ID ' + item.id + ' para posição ' + item.position + ':', result.reason);
      });
      // Relança o erro da primeira falha para acionar o ROLLBACK da transação
      throw failures[0].result.reason;
    }
  });
}
