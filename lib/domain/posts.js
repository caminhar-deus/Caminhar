import { query, transaction } from '../infra/db.js';
import { createRecord, updateRecords, deleteRecords, raw } from '../crud/crud.js';
import { logActivity } from './audit.js';
import { paginate } from './shared-pagination.js';
import { attachCategoriesToPosts, setPostCategories } from './categories.js';

/**
 * Retorna posts publicados com paginação e busca full-text (título e conteúdo).
 * Cada post recebe `categories` anexado pós-paginate (ADR-0024).
 * @param {number} [limit=10] - Número de posts por página.
 * @param {number} [page=1] - Número da página.
 * @param {string} [search=''] - Termo de busca (título e conteúdo).
 * @returns {Promise<Object>} Posts paginados com metadados.
 */
export async function getRecentPosts(limit = 10, page = 1, search = '') {
  const result = await paginate('posts', {
    page,
    limit,
    search,
    publishedOnly: true,
    publishedField: 'published',
    searchOptions: {
      tsvector: "to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(content, ''))",
    },
  });
  await attachCategoriesToPosts(result.data);
  return result;
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
 * Cada post recebe `categories` anexado pós-paginate (ADR-0024).
 * @param {number} page - Número da página (base 1).
 * @param {number} limit - Itens por página.
 * @param {string} [search] - Termo de busca opcional no título.
 * @returns {Promise<Object>} Posts paginados com metadados.
 */
export async function getPaginatedPosts(page = 1, limit = 10, search = '') {
  const result = await paginate('posts', {
    page,
    limit,
    search,
    publishedOnly: false,
    publishedField: 'published',
    searchOptions: { fields: ['title'] },
  });
  await attachCategoriesToPosts(result.data);
  return result;
}

/**
 * Cria um novo post. Quando `category_ids` é informado, os vínculos em
 * `post_categories` são gravados na mesma transação do post (se houver
 * `options.client`) ou em transação própria.
 * @param {object} post - Dados do post.
 * @param {number[]} [post.category_ids] - IDs das categorias (substituição total).
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

  const { category_ids: categoryIds } = post;
  if (categoryIds === undefined) {
    return createRecord('posts', postData, options);
  }

  const persist = async (client) => {
    const newPost = await createRecord('posts', postData, { ...options, client });
    await setPostCategories(newPost.id, categoryIds, client);
    return newPost;
  };

  if (options.client) return persist(options.client);
  return transaction(persist);
}

/**
 * Atualiza um post existente. Quando `category_ids` é informado, os vínculos
 * em `post_categories` são SEMPRE substituídos (nunca mesclados); sem ele os
 * vínculos existentes são mantidos. A troca de vínculos compartilha a
 * transação do chamador (se houver `options.client`) ou abre uma própria.
 * @param {number} id - ID do post a ser atualizado.
 * @param {object} post - Dados para atualização.
 * @param {number[]} [post.category_ids] - IDs das categorias (substituição total).
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

  const { category_ids: categoryIds } = post;
  const hasCategoryIds = categoryIds !== undefined;

  // Só adiciona updated_at se houver pelo menos um campo para atualizar ou
  // se os vínculos de categoria forem substituídos (a linha muda de fato).
  if (Object.keys(postData).length > 0 || hasCategoryIds) {
    postData.updated_at = raw('CURRENT_TIMESTAMP');
  }

  const persist = async (client) => {
    const opts = client ? { ...options, client } : options;
    const [updatedRecord] = await updateRecords('posts', postData, { id }, opts);
    // Sem post atualizado não há vínculos a gravar (evita FK em post inexistente).
    if (hasCategoryIds && updatedRecord) {
      await setPostCategories(id, categoryIds, client);
    }
    return updatedRecord;
  };

  if (hasCategoryIds && !options.client) {
    return transaction(persist);
  }
  return persist(options.client);
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

