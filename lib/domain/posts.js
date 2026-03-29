import { query, transaction } from '../db.js';
import { createRecord, updateRecords, deleteRecords, raw } from '../crud.js';
import { logActivity } from './audit.js';

/**
 * Retrieves recent published posts.
 * @param {number} limit The number of posts to retrieve.
 * @returns {Promise<Array>} The list of recent posts.
 */
export async function getRecentPosts(limit = 10, page = 1, search = '') {
    const offset = (page - 1) * limit;
    const searchParams = [];
    let whereClause = 'WHERE published = true';

    if (search) {
        const searchTerm = `%${search.toLowerCase()}%`;
        // Busca no título ou no conteúdo do post
        whereClause += ` AND (LOWER(title) LIKE $${searchParams.length + 1} OR LOWER(content) LIKE $${searchParams.length + 1})`;
        searchParams.push(searchTerm);
    }

    const dataParams = [...searchParams, limit, offset];
    const limitIndex = searchParams.length + 1;
    const offsetIndex = searchParams.length + 2;

    const postsQuery = `
        SELECT * FROM posts
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;
    const countQuery = `SELECT COUNT(*) FROM posts ${whereClause}`;

    const [postsRes, countRes] = await Promise.all([
        query(postsQuery, dataParams),
        query(countQuery, searchParams)
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
 * Retrieves all posts (including drafts) for admin.
 * @returns {Promise<Array>} The list of all posts.
 */
export async function getAllPosts() {
  const text = 'SELECT * FROM posts ORDER BY created_at DESC';
  const res = await query(text);
  return res.rows;
}

/**
 * Retrieves posts with pagination for the admin panel.
 * @param {number} page - The page number (1-based).
 * @param {number} limit - The number of items per page.
 * @param {string} [search] - Optional search term for title.
 * @returns {Promise<Object>} The paginated posts and metadata.
 */
export async function getPaginatedPosts(page = 1, limit = 10, search = '') {
  const offset = (page - 1) * limit;
  const searchParams = [];
  let whereClause = '';

  if (search) {
    const searchTerm = `%${search.toLowerCase()}%`;
    // O índice do placeholder é baseado no tamanho do array de parâmetros de busca.
    whereClause = `WHERE LOWER(title) LIKE $${searchParams.length + 1}`;
    searchParams.push(searchTerm);
  }

  // Parâmetros para a query de dados (inclui paginação)
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
    query(countText, searchParams) // A query de contagem não precisa de limit/offset
  ]);

  const total = parseInt(countRes.rows[0]?.count || '0', 10);
  const totalPages = Math.ceil(total / limit);

  return {
    // A chave 'data' é o novo padrão para compatibilidade com o hook useAdminCrud.
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
 * Creates a new post.
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
 * Updates an existing post.
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
 * Deletes a post.
 */
export async function deletePost(id, options = {}) {
  const [deletedRecord] = await deleteRecords('posts', { id }, options);
  return deletedRecord;
}

/**
 * Creates a new post and logs the action in a single transaction.
 * @param {object} postData - The data for the new post.
 * @param {object} auditData - Data for the audit log (e.g., username, ipAddress).
 * @returns {Promise<object>} The newly created post.
 */
export async function createPostWithAudit(postData, auditData) {
  return transaction(async (client) => {
    // Pass the client to the domain function via the options object.
    const newPost = await createPost(postData, { client });

    // The audit log function also needs to be part of the same transaction.
    // (Assuming logActivity is also updated to accept an options object with a client).
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