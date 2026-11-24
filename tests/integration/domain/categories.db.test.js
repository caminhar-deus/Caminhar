/**
 * Testes de Integração com Banco Real (PostgreSQL) — Categorias e Vínculos (`categories`, `post_categories`).
 *
 * Valida queries SQL reais de `lib/domain/categories.js` (paginação por `name ASC`,
 * slug UNIQUE, vínculo N:N com `posts` e ON DELETE CASCADE) contra PostgreSQL via Testcontainers.
 *
 * Para executar: npm run test:db:container
 * Requer: Docker disponível
 */
import { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { createTestDb, applyMigrations, withTransaction, isDockerAvailable } from '../../helpers/db-test.js';
import {
  getPaginatedCategories,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  setPostCategories,
  attachCategoriesToPosts,
} from '../../../lib/domain/categories.js';

let mockDbQuery = null;

jest.mock('../../../lib/infra/db.js', () => ({
  query: (text, params, options = {}) => {
    if (options?.client && typeof options.client.query === 'function') {
      return options.client.query(text, params);
    }
    if (typeof mockDbQuery !== 'function') {
      return Promise.reject(new Error('mockDbQuery não configurado para este teste'));
    }
    return mockDbQuery(text, params);
  },
}));

let pool;
let tx;

beforeAll(async () => {
  if (!isDockerAvailable()) return;
  pool = createTestDb();
  await applyMigrations();
});

afterAll(async () => {
  if (tx && typeof tx.rollback === 'function') {
    try { await tx.rollback(); } catch { /* rollback de segurança */ }
  }
  if (pool) await pool.end();
});

beforeEach(async () => {
  if (!pool) return;
  tx = await withTransaction(pool);
  mockDbQuery = (text, params) => tx.query(text, params);
});

afterEach(async () => {
  mockDbQuery = null;
  if (tx) await tx.rollback();
});

const describeIf = isDockerAvailable() ? describe : describe.skip;

describeIf('Categorias (categories / post_categories) — Integração com PostgreSQL Real', () => {
  it('createCategory persiste com slug normalizado e rejeita duplicidade UNIQUE (DUPLICATE_SLUG)', async () => {
    const suffix = Date.now();
    const created = await createCategory({ name: `Oração Diária ${suffix}` });
    expect(created).toEqual({
      id: expect.any(Number),
      name: `Oração Diária ${suffix}`,
      slug: `oracao-diaria-${suffix}`,
    });

    await tx.query('SAVEPOINT sp_dup_cat_create');
    try {
      await expect(
        createCategory({ name: 'Outra', slug: created.slug })
      ).rejects.toMatchObject({ code: 'DUPLICATE_SLUG' });
    } finally {
      await tx.query('ROLLBACK TO SAVEPOINT sp_dup_cat_create');
    }

    await expect(createCategory({ name: '---' })).rejects.toMatchObject({ code: 'INVALID_SLUG' });
  });

  it('getAllCategories e getPaginatedCategories ordenam alfabeticamente e filtram via ILIKE', async () => {
    const tag = Date.now();
    await createCategory({ name: `Zelo ${tag}`, slug: `zelo-${tag}` });
    await createCategory({ name: `Amor ${tag}`, slug: `amor-${tag}` });
    await createCategory({ name: `Esperança ${tag}`, slug: `esperanca-${tag}` });

    const all = await getAllCategories();
    const filtered = all.filter((c) => c.slug.endsWith(`-${tag}`));
    expect(filtered.map((c) => c.name)).toEqual([
      `Amor ${tag}`,
      `Esperança ${tag}`,
      `Zelo ${tag}`,
    ]);

    const searched = await getPaginatedCategories(1, 10, `esperanca-${tag}`);
    expect(searched.data).toHaveLength(1);
    expect(searched.data[0].slug).toBe(`esperanca-${tag}`);
    expect(searched.pagination.total).toBe(1);
  });

  it('updateCategory atualiza nome/slug e protege constraint UNIQUE com DUPLICATE_SLUG', async () => {
    const tag = Date.now();
    const catA = await createCategory({ name: `Cat A ${tag}`, slug: `cat-a-${tag}` });
    const catB = await createCategory({ name: `Cat B ${tag}`, slug: `cat-b-${tag}` });

    const updated = await updateCategory(catA.id, { name: `Cat A Editada ${tag}` });
    expect(updated.slug).toBe(`cat-a-editada-${tag}`);

    await tx.query('SAVEPOINT sp_dup_cat_update');
    try {
      await expect(
        updateCategory(catB.id, { slug: updated.slug })
      ).rejects.toMatchObject({ code: 'DUPLICATE_SLUG' });
    } finally {
      await tx.query('ROLLBACK TO SAVEPOINT sp_dup_cat_update');
    }
  });

  it('setPostCategories, attachCategoriesToPosts e deleteCategory respeitam FK e ON DELETE CASCADE', async () => {
    const tag = Date.now();
    const cat1 = await createCategory({ name: `Liturgia ${tag}`, slug: `liturgia-${tag}` });
    const cat2 = await createCategory({ name: `Santos ${tag}`, slug: `santos-${tag}` });

    const postRes = await tx.query(
      `INSERT INTO posts (title, slug, content, published, position)
       VALUES ($1, $2, $3, true, 0) RETURNING id, title`,
      [`Post Cat ${tag}`, `post-cat-${tag}`, 'Conteúdo de teste']
    );
    const post = postRes.rows[0];

    await expect(
      setPostCategories(post.id, [999999999], tx)
    ).rejects.toMatchObject({ code: 'INVALID_CATEGORY_ID' });

    const savedIds = await setPostCategories(post.id, [cat1.id, cat2.id, cat1.id], tx);
    expect(savedIds).toEqual([cat1.id, cat2.id]);

    const [postWithCats] = await attachCategoriesToPosts([{ id: post.id, title: post.title }]);
    expect(postWithCats.categories.map((c) => c.id).sort((a, b) => a - b)).toEqual(
      [cat1.id, cat2.id].sort((a, b) => a - b)
    );

    const deleted = await deleteCategory(cat1.id);
    expect(deleted.id).toBe(cat1.id);

    const remainingLinks = await tx.query('SELECT category_id FROM post_categories WHERE post_id = $1', [post.id]);
    expect(remainingLinks.rows.map((r) => r.category_id)).toEqual([cat2.id]);

    await setPostCategories(post.id, [], tx);
    const afterClear = await tx.query('SELECT category_id FROM post_categories WHERE post_id = $1', [post.id]);
    expect(afterClear.rows).toHaveLength(0);
  });
});
