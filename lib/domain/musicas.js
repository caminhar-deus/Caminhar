import { query, transaction } from '../infra/db.js';
import { createRecord, updateRecords, deleteRecords, raw } from '../crud/crud.js';
import { paginate, buildAlphaOrderSql } from './shared-pagination.js';

const TITULO_ORDEM = buildAlphaOrderSql('titulo');

/**
 * Retorna todas as músicas do banco de dados.
 * @param {string} [search] - Termo de busca opcional por título ou artista.
 * @returns {Promise<Array>} Lista de todas as músicas.
 */
export async function getAllMusicas(search) {
  let text = 'SELECT * FROM musicas';
  const values = [];

  if (search) {
    text += ' WHERE titulo ILIKE $1 OR artista ILIKE $1';
    values.push(`%${search}%`);
  }

  text += ' ORDER BY position ASC, id ASC';
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
  return transaction(async (client) => {
    // Define posição como último item (similar a createVideo e createProduct)
    const maxPosRes = await query('SELECT COALESCE(MAX(position), 0) as max_pos FROM musicas', [], { client });
    const nextPosition = maxPosRes.rows[0]?.max_pos + 1 || 1;

    const musicaData = {
      titulo: musica.titulo ?? null,
      artista: musica.artista ?? null,
      descricao: musica.descricao ?? null,
      url_spotify: musica.url_spotify ?? null,
      published: musica.published ?? false,
      position: musica.position ?? nextPosition,
      created_at: raw('CURRENT_TIMESTAMP'),
    };
    return createRecord('musicas', musicaData, { ...options, client });
  });
}

/**
 * Atualiza uma música existente.
 * @param {number} id - ID da música a ser atualizada.
 * @param {object} musica - Dados para atualização.
 * @param {object} [options] - Opções adicionais (ex: { client } para transações).
 * @returns {Promise<object>} A música atualizada.
 */
export async function updateMusica(id, musica, options = {}) {
  // Constroi o objeto de dados apenas com os campos explicitamente fornecidos,
  // permitindo atualizações parciais (ex: toggle de status sem enviar titulo/artista).
  const musicaData = {};
  
  if (musica.titulo !== undefined) musicaData.titulo = musica.titulo;
  if (musica.artista !== undefined) musicaData.artista = musica.artista;
  if (musica.descricao !== undefined) musicaData.descricao = musica.descricao;
  if (musica.url_spotify !== undefined) musicaData.url_spotify = musica.url_spotify;
  if (musica.published !== undefined) musicaData.published = musica.published;
  
  // Só adiciona updated_at se houver pelo menos um campo para atualizar
  if (Object.keys(musicaData).length > 0) {
    musicaData.updated_at = raw('CURRENT_TIMESTAMP');
  }
  
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
 * @param {string} [sort] - Ordenação ('default' | 'positioned' | 'oldest' | 'alpha' | 'alpha_desc'). Padrão: 'default' na vitrine pública (publishedOnly=true) e 'positioned' no painel/uso interno (publishedOnly=false).
 * @returns {Promise<Object>} Músicas paginadas com metadados.
 */
export async function getPaginatedMusicas(
  page = 1,
  limit = 10,
  search = '',
  publishedOnly = false,
  sort = publishedOnly ? 'default' : 'positioned'
) {
  // Público (publishedOnly=true): "Padrão" = Mais recentes (created_at DESC, id DESC) e
  // a curadoria manual vira a opção explícita "Posicionados" (position ASC, id ASC).
  // Painel/interno (publishedOnly=false): sem sort explícito, mantém a ordem de curadoria
  // (position ASC, id ASC) exigida pelo Drag & Drop 1-based — ADR-0014.
  // A-Z / Z-A usam `lower(unaccent(titulo))` (ADR-0033 / item AF) e todas as
  // cláusulas desempatam por `id` na mesma direção da coluna principal.
  const orderByMap = {
    default: 'created_at DESC, id DESC',
    positioned: 'position ASC, id ASC',
    oldest: 'created_at ASC, id ASC',
    alpha: `${TITULO_ORDEM} ASC, id ASC`,
    alpha_desc: `${TITULO_ORDEM} DESC, id DESC`,
  };

  const fallbackOrder = publishedOnly ? orderByMap.default : orderByMap.positioned;
  const orderBy = orderByMap[sort] || fallbackOrder;

  const result = await paginate('musicas', {
    page,
    limit,
    search,
    publishedOnly,
    publishedField: 'published',
    orderBy,
    searchOptions: { fields: ['titulo', 'artista'] },
  });

  return {
    musicas: result.data, // Alias para compatibilidade com componentes genéricos (AdminCrudBase)
    data: result.data,
    pagination: result.pagination,
  };
}

