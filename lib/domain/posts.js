import { query, transaction } from '../db.js';
import { createRecord, updateRecords, deleteRecords, raw } from '../crud.js';
import { logActivity } from './audit.js';
import { logger } from '../logger.js';
import { paginate } from './shared-pagination.js';

/**
 * Retorna posts publicados com paginação e busca full-text (título e conteúdo).
 * @param {number} [limit=10] - Número de posts por página.
 * @param {number} [page=1] - Número da página.
 * @param {string} [search=''] - Termo de busca (título e conteúdo).
 * @returns {Promise<Object>} Posts paginados com metadados.
 */
export async function getRecentPosts(limit = 10, page = 1, search = '') {
  return paginate('posts', {
    page,
    limit,
    search,
    publishedOnly: true,
    publishedField: 'published',
    searchOptions: {
      tsvector: "to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(content, ''))",
    },
  });
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
  return paginate('posts', {
    page,
    limit,
    search,
    publishedOnly: false,
    publishedField: 'published',
    searchOptions: { fields: ['title'] },
  });
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
    position: post.position ?? 0,
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
  // Constroi o objeto de dados apenas com os campos explicitamente fornecidos,
  // permitindo atualizações parciais (ex: toggle de status sem reenviar titulo/slug).
  const postData = {};

  if (post.title !== undefined) postData.title = post.title;
  if (post.slug !== undefined) postData.slug = post.slug;
  if (post.excerpt !== undefined) postData.excerpt = post.excerpt;
  if (post.content !== undefined) postData.content = post.content;
  if (post.image_url !== undefined) postData.image_url = post.image_url;
  if (post.published !== undefined) postData.published = post.published;

  // Só adiciona updated_at se houver pelo menos um campo para atualizar
  if (Object.keys(postData).length > 0) {
    postData.updated_at = raw('CURRENT_TIMESTAMP');
  }

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
        logger.error('Posts', 'Erro ao atualizar posição do post ID ' + item.id + ' para posição ' + item.position + ':', result.reason);
      });
      // Relança o erro da primeira falha para acionar o ROLLBACK da transação
      throw failures[0].result.reason;
    }
  });
}