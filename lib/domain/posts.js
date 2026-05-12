import { query, transaction } from '../db.js';
import { createRecord, updateRecords, deleteRecords, raw } from '../crud.js';
import { logActivity } from './audit.js';

// Função interna para centralizar a lógica de paginação de posts
async function _paginatePosts({ page = 1, limit = 10, search = '', publishedOnly = false, searchContent = false } = {}) {
  const offset = (page - 1) * limit;
  const searchParams = [];
  const conditions = [];

  if (publishedOnly) {
    conditions.push('published = true');
  }

  if (search) {
    const searchTerm = `%${search.toLowerCase()}%`;
    // Busca no título (e opcionalmente no conteúdo)
    const searchClauses = [`LOWER(title) LIKE $${searchParams.length + 1}`];
    if (searchContent) {
      searchClauses.push(`LOWER(content) LIKE $${searchParams.length + 1}`);
    }
    conditions.push(`(${searchClauses.join(' OR ')})`);
    searchParams.push(searchTerm);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataParams = [...searchParams, limit, offset];
  const limitIndex = searchParams.length + 1;
  const offsetIndex = searchParams.length + 2;

  const text = `
    SELECT * FROM posts
    ${whereClause}
    ORDER BY position ASC, created_at DESC
    LIMIT $${limitIndex} OFFSET $${offsetIndex}
  `;

  const countText = `SELECT COUNT(*) FROM posts ${whereClause}`;

  const [postsRes, countRes] = await Promise.all([
    query(text, dataParams),
    query(countText, searchParams)
  ]);

  const total = parseInt(countRes.rows[0]?.count || '0', 10);
  const totalPages = Math.ceil(total / limit);

  return {
    data: postsRes.rows,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      totalPages
    }
  };
}

/**
 * Retorna posts publicados com paginação e busca (título e conteúdo).
 * @param {number} [limit=10] - Número de posts por página.
 * @param {number} [page=1] - Número da página.
 * @param {string} [search=''] - Termo de busca (título e conteúdo).
 * @returns {Promise<Object>} Posts paginados com metadados.
 */
export async function getRecentPosts(limit = 10, page = 1, search = '') {
  return _paginatePosts({ page, limit, search, publishedOnly: true, searchContent: true });
}

/**
 * Retorna todos os posts (incluindo rascunhos) para admin.
 * @returns {Promise<Array>} Lista de todos os posts.
 */
export async function getAllPosts() {
  const text = 'SELECT * FROM posts ORDER BY created_at DESC';
  const res = await query(text);
  return res.rows;
}

/**
 * Retorna posts paginados para o painel admin.
 * @param {number} page - Número da página (base 1).
 * @param {number} limit - Itens por página.
 * @param {string} [search] - Termo de busca opcional no título.
 * @returns {Promise<Object>} Posts paginados com metadados.
 */
export async function getPaginatedPosts(page = 1, limit = 10, search = '') {
  return _paginatePosts({ page, limit, search, publishedOnly: false, searchContent: false });
}

/**
 * Cria um novo post.
 * @param {object} post - Dados do post.
 * @param {object} [options] - Opções adicionais (ex: { client } para transações).
 * @returns {Promise<object>} O post recém-criado.
 */
export async function createPost(post, options = {}) {
  // Prepara o objeto de dados para garantir que valores nulos sejam tratados.
  const postData = {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? null,
    content: post.content,
    image_url: post.image_url ?? null,
    published: post.published ?? false,
  };
  return createRecord('posts', postData, options);
}

/**
 * Atualiza um post existente.
 * @param {number} id - ID do post a ser atualizado.
 * @param {object} post - Dados para atualização.
 * @param {object} [options] - Opções adicionais (ex: { client } para transações).
 * @returns {Promise<object>} O post atualizado.
 */
export async function updatePost(id, post, options = {}) {
  // Prepara o objeto de dados, garantindo que valores nulos sejam tratados
  // e usando o helper `raw` para funções SQL como CURRENT_TIMESTAMP.
  const postData = {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? null,
    content: post.content,
    image_url: post.image_url ?? null,
    published: post.published ?? false,
    updated_at: raw('CURRENT_TIMESTAMP'),
  };

  // Delega a operação para a função genérica `updateRecords`.
  const [updatedRecord] = await updateRecords('posts', postData, { id }, options);
  return updatedRecord;
}

/**
 * Remove um post pelo ID.
 * @param {number} id - ID do post a ser removido.
 * @param {object} [options] - Opções adicionais (ex: { client } para transações).
 * @returns {Promise<object>} O post removido.
 */
export async function deletePost(id, options = {}) {
  const [deletedRecord] = await deleteRecords('posts', { id }, options);
  return deletedRecord;
}

/**
 * Cria um novo post e registra auditoria em uma única transação.
 * @param {object} postData - Dados do novo post.
 * @param {object} auditData - Dados para o log de auditoria (ex: username, ipAddress).
 * @returns {Promise<object>} O post recém-criado.
 */
export async function createPostWithAudit(postData, auditData) {
  return transaction(async (client) => {
    // Repassa o client para a função de domínio via objeto de opções.
    const newPost = await createPost(postData, { client });

    // A função de log de auditoria também precisa fazer parte da mesma transação.
    await logActivity(
      auditData.username,
      'CREATE',
      'POST',
      newPost.id,
      `Post created: ${newPost.title}`,
      auditData.ipAddress,
      { client }
    );

    return newPost;
  });
}

/**
 * Reordena uma lista de posts atualizando o campo 'position' em transação.
 * @param {Array<{id: number, position: number}>} items - Itens a reordenar.
 */
export async function reorderPosts(items) {
  if (!items || items.length === 0) return;

  return transaction(async (client) => {
    const results = await Promise.allSettled(
      items.map(item =>
        query('UPDATE posts SET position = $1 WHERE id = $2', [item.position, item.id], { client })
      )
    );

    // Identifica falhas parciais para logging preciso
    const failures = results
      .map((result, index) => ({ result, item: items[index] }))
      .filter(({ result }) => result.status === 'rejected');

    if (failures.length > 0) {
      failures.forEach(({ result, item }) => {
        console.error('[Posts] ❌ Erro ao atualizar posição do post ID ' + item.id + ' para posição ' + item.position + ':', result.reason);
      });
      // Relança o erro da primeira falha para acionar o ROLLBACK da transação
      throw failures[0].result.reason;
    }
  });
}
