/**
 * Helper compartilhado de paginação com busca textual.
 * 
 * Centraliza a lógica de paginação que estava duplicada em:
 * - lib/domain/musicas.js
 * - lib/domain/videos.js
 * - lib/domain/posts.js
 * 
 * Suporta dois modos de busca:
 * 1. ILIKE com índice trigram: para buscas com wildcard duplo (%termo%)
 * 2. Full-text search com tsvector: para busca semântica em português
 *
 * @module shared-pagination
 */

import { query } from '../db.js';

/**
 * Constrói a cláusula WHERE de busca com base na estratégia escolhida.
 *
 * @param {string} search - Termo de busca
 * @param {number} paramIndex - Índice do parâmetro na query (1-based)
 * @param {Object} [options]
 * @param {string[]} [options.fields] - Campos para busca ILIKE (ex: ['titulo', 'artista'])
 * @param {string} [options.tsvector] - Expressão tsvector para full-text search (ex: "to_tsvector('portuguese', coalesce(title,'') || ' ' || coalesce(content,''))")
 * @returns {{ clause: string, params: string[] } | null}
 */
function buildSearchClause(search, paramIndex, options = {}) {
  if (!search) return null;

  const { fields, tsvector } = options;

  if (tsvector) {
    // Full-text search com tsvector (posts com searchContent=true)
    return {
      clause: `${tsvector} @@ plainto_tsquery('portuguese', $${paramIndex})`,
      params: [search.toLowerCase().trim()],
    };
  }

  if (fields && fields.length > 0) {
    // ILIKE com índice trigram para busca com wildcard duplo
    const searchTerm = `%${search}%`;
    const conditions = fields.map(f => `${f} ILIKE $${paramIndex}`);
    return {
      clause: `(${conditions.join(' OR ')})`,
      params: [searchTerm],
    };
  }

  return null;
}

/**
 * Executa paginação com busca em uma tabela.
 *
 * @param {string} tableName - Nome da tabela (ex: 'musicas', 'videos', 'posts')
 * @param {Object} params
 * @param {number} [params.page=1] - Número da página
 * @param {number} [params.limit=10] - Itens por página
 * @param {string} [params.search=''] - Termo de busca
 * @param {boolean} [params.publishedOnly=false] - Filtrar apenas registros publicados
 * @param {string} [params.publishedField='publicado'] - Nome do campo booleano de publicação
 * @param {string} [params.orderBy='position ASC, created_at DESC'] - Cláusula ORDER BY
 * @param {Object} [params.searchOptions] - Opções de busca (ver buildSearchClause)
 * @param {string[]} [params.searchOptions.fields] - Campos para busca ILIKE
 * @param {string} [params.searchOptions.tsvector] - Expressão tsvector para full-text search
 * @returns {Promise<{ data: Object[], pagination: { page: number, limit: number, total: number, totalPages: number } }>}
 */
export async function paginate(tableName, params = {}) {
  const {
    page = 1,
    limit = 10,
    search = '',
    publishedOnly = false,
    publishedField = 'publicado',
    orderBy = 'position ASC, created_at DESC',
    searchOptions = { fields: ['titulo'] },
  } = params;

  const offset = (page - 1) * limit;
  const conditions = [];
  const searchParams = [];

  if (publishedOnly) {
    conditions.push(`${publishedField} = true`);
  }

  if (search) {
    const searchResult = buildSearchClause(search, searchParams.length + 1, searchOptions);
    if (searchResult) {
      conditions.push(searchResult.clause);
      searchParams.push(...searchResult.params);
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const dataParams = [...searchParams, limit, offset];
  const limitIndex = searchParams.length + 1;
  const offsetIndex = searchParams.length + 2;

  const text = `
    SELECT * FROM ${tableName}
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT $${limitIndex} OFFSET $${offsetIndex}
  `;

  const countText = `SELECT COUNT(*) FROM ${tableName} ${whereClause}`;

  const [dataRes, countRes] = await Promise.all([
    query(text, dataParams),
    query(countText, searchParams),
  ]);

  const total = parseInt(countRes.rows[0]?.count || '0', 10);
  const totalPages = Math.ceil(total / limit);

  return {
    data: dataRes.rows,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      totalPages,
    },
  };
}