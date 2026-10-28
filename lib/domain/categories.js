/**
 * Domínio de categorias de posts (ADR-0024).
 *
 * A tabela `categories` tem apenas `id, name, slug` — sem `position`/`created_at`
 * — por isso a paginação usa `orderBy: 'name ASC'` em vez do default do paginate
 * (`position ASC, created_at DESC`).
 *
 * @module domain/categories
 */
import { query } from '../infra/db.js';
import { createRecord, updateRecords, deleteRecords } from '../crud/crud.js';
import { paginate } from './shared-pagination.js';

/**
 * Converte um nome em slug: lowercase, sem acentos (NFD), não-alfanuméricos
 * viram hífen, hífens colapsados e aparados nas pontas.
 * @param {string} name - Texto de origem.
 * @returns {string} Slug normalizado (pode ser vazio se o nome não tiver alfanuméricos).
 */
export function slugify(name) {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Lista categorias paginadas com busca em `name`/`slug`.
 * @param {number} [page=1] - Número da página (base 1).
 * @param {number} [limit=10] - Itens por página.
 * @param {string} [search=''] - Termo de busca opcional.
 * @returns {Promise<Object>} Categorias paginadas com metadados.
 */
export async function getPaginatedCategories(page = 1, limit = 10, search = '') {
  return paginate('categories', {
    page,
    limit,
    search,
    orderBy: 'name ASC',
    searchOptions: { fields: ['name', 'slug'] },
  });
}

/**
 * Retorna todas as categorias em ordem alfabética (para selects de seleção).
 * @returns {Promise<Array>} Lista completa de categorias.
 */
export async function getAllCategories() {
  // Teto rígido: endpoint sem paginação (consumido pelo select do painel);
  // sem LIMIT o payload cresceria sem limite junto com a tabela (revisão P4, A2)
  const res = await query('SELECT id, name, slug FROM categories ORDER BY name ASC LIMIT 500');
  return res.rows;
}

/**
 * Cria uma categoria. O slug é gerado do nome quando não informado (ou vazio)
 * e é único na tabela — violação UNIQUE (23505) vira erro com
 * `error.code = 'DUPLICATE_SLUG'`.
 * @param {object} category - Dados da categoria.
 * @param {string} category.name - Nome exibido.
 * @param {string} [category.slug] - Slug explícito (opcional).
 * @returns {Promise<object>} A categoria criada (id, name, slug).
 */
export async function createCategory({ name, slug } = {}) {
  const finalSlug = slug ? slugify(slug) : slugify(name);
  if (!finalSlug) {
    const invalid = new Error('Não foi possível gerar um slug a partir do nome informado');
    invalid.code = 'INVALID_SLUG';
    throw invalid;
  }

  try {
    return await createRecord('categories', { name, slug: finalSlug });
  } catch (error) {
    if (error && error.code === '23505') {
      const duplicate = new Error('Já existe uma categoria com esse slug');
      duplicate.code = 'DUPLICATE_SLUG';
      duplicate.cause = error;
      throw duplicate;
    }
    throw error;
  }
}

/**
 * Atualiza uma categoria (campos parciais). Quando `slug` não é informado,
 * ele é regenerado a partir do `name` (mesma regra da criação); sem nenhum
 * campo atualizável lança `NO_DATA_TO_UPDATE`. Violação UNIQUE vira
 * `error.code = 'DUPLICATE_SLUG'` (mesmo tratamento da criação).
 * @param {number} id - ID da categoria.
 * @param {object} data - Campos a atualizar.
 * @param {string} [data.name] - Novo nome.
 * @param {string} [data.slug] - Novo slug (normalizado com `slugify`).
 * @returns {Promise<object|undefined>} A linha atualizada (undefined se não existir).
 */
export async function updateCategory(id, { name, slug } = {}) {
  const data = {};
  if (name !== undefined) data.name = name;
  if (slug !== undefined && slug !== '') {
    data.slug = slugify(slug);
  } else if (name !== undefined) {
    data.slug = slugify(name);
  }

  if (Object.keys(data).length === 0) {
    throw new Error('NO_DATA_TO_UPDATE');
  }
  if (data.slug === '') {
    const invalid = new Error('Não foi possível gerar um slug a partir do nome informado');
    invalid.code = 'INVALID_SLUG';
    throw invalid;
  }

  try {
    const [updatedRecord] = await updateRecords('categories', data, { id });
    return updatedRecord;
  } catch (error) {
    if (error && error.code === '23505') {
      const duplicate = new Error('Já existe uma categoria com esse slug');
      duplicate.code = 'DUPLICATE_SLUG';
      duplicate.cause = error;
      throw duplicate;
    }
    throw error;
  }
}

/**
 * Remove uma categoria. Os vínculos em `post_categories` caem junto
 * (ON DELETE CASCADE).
 * @param {number} id - ID da categoria.
 * @returns {Promise<object|undefined>} A linha removida (undefined se não existir).
 */
export async function deleteCategory(id) {
  const [deletedRecord] = await deleteRecords('categories', { id });
  return deletedRecord;
}

/**
 * Substitui os vínculos de categorias de um post (DELETE + INSERTs).
 * Lista vazia/null faz só o DELETE. Deve rodar dentro da transação do post
 * (via `client`); sem client usa a conexão do pool.
 * @param {number} postId - ID do post.
 * @param {number[]|null} [categoryIds] - IDs das categorias (substituição total).
 * @param {object} [client] - Client de transação opcional.
 * @returns {Promise<number[]>} IDs persistidos (vazio quando só houve DELETE).
 */
export async function setPostCategories(postId, categoryIds, client = null) {
  await query('DELETE FROM post_categories WHERE post_id = $1', [postId], { client });

  const ids = [...new Set(Array.isArray(categoryIds) ? categoryIds : [])];
  if (ids.length === 0) return [];

  // Valida existência ANTES do INSERT: id inexistente violaria a FK de
  // post_categories (23503) e viraria 500 genérico — erro do cliente merece 400
  // (revisão P4, A1). Roda na mesma transação via `client`.
  const countRes = await query(
    'SELECT COUNT(*) FROM categories WHERE id = ANY($1)',
    [ids],
    { client },
  );
  const found = parseInt(countRes?.rows?.[0]?.count || '0', 10);
  if (found !== ids.length) {
    const invalid = new Error('Uma ou mais categorias informadas não existem');
    invalid.code = 'INVALID_CATEGORY_ID';
    throw invalid;
  }

  const placeholders = ids.map((_, index) => `($1, $${index + 2})`).join(', ');
  await query(
    `INSERT INTO post_categories (post_id, category_id) VALUES ${placeholders}`,
    [postId, ...ids],
    { client },
  );
  return ids;
}

/**
 * Anexa `categories: [{id, name, slug}]` a cada linha de posts (query
 * complementar pós-paginate — sem alterar o paginate genérico). Sem vínculos
 * o array fica vazio.
 * @param {Object[]} rows - Linhas de posts (mutadas in place).
 * @returns {Promise<Object[]>} As mesmas linhas com `categories` preenchido.
 */
export async function attachCategoriesToPosts(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return rows ?? [];

  const postIds = rows.map((row) => row.id);
  const res = await query(
    'SELECT pc.post_id, c.id, c.name, c.slug FROM post_categories pc JOIN categories c ON c.id = pc.category_id WHERE pc.post_id = ANY($1)',
    [postIds],
  );

  const categoriesByPost = new Map();
  for (const item of res.rows) {
    const { post_id: postId, ...category } = item;
    if (!categoriesByPost.has(postId)) categoriesByPost.set(postId, []);
    categoriesByPost.get(postId).push(category);
  }

  for (const row of rows) {
    row.categories = categoriesByPost.get(row.id) ?? [];
  }
  return rows;
}
