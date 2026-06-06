/**
 * Testes de Integração com Banco Real (PostgreSQL) — Posts.
 * 
 * Valida queries SQL reais, constraints, transações e comportamento
 * das funções de domínio em um container PostgreSQL via Testcontainers.
 * 
 * Para executar: npm run test:db:container
 * Requer: Docker disponível
 */
import { createTestDb, applyMigrations, withTransaction, isDockerAvailable } from '../../helpers/db-test.js';

let pool;
let tx;

beforeAll(async () => {
  if (!isDockerAvailable()) {
    return;
  }
  pool = createTestDb();
  await applyMigrations();
});

afterAll(async () => {
  if (pool) {
    await pool.end();
  }
});

beforeEach(async () => {
  if (!pool) return;
  tx = await withTransaction(pool);
});

afterEach(async () => {
  if (tx) {
    await tx.rollback();
  }
});

/**
 * Helper para criar um post de teste usando query direta.
 */
async function insertTestPost(overrides = {}) {
  const defaults = {
    title: 'Post de Teste',
    slug: `post-teste-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    content: 'Conteúdo do post de teste para validação de banco real.',
    published: true,
    position: 0,
  };
  const data = { ...defaults, ...overrides };

  const result = await tx.query(
    `INSERT INTO posts (title, slug, content, published, position)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.title, data.slug, data.content, data.published, data.position]
  );
  return result.rows[0];
}

/**
 * describeIf condicional: só executa testes se Docker estiver disponível.
 */
const describeIf = isDockerAvailable() ? describe : describe.skip;

describeIf('Posts — Integração com PostgreSQL Real', () => {
  it('deve criar um post e retornar o registro com ID gerado', async () => {
    const post = await insertTestPost({ title: 'Novo Post', slug: `novo-post-${Date.now()}` });

    expect(post).toHaveProperty('id');
    expect(post.id).toEqual(expect.any(Number));
    expect(post.title).toBe('Novo Post');
    expect(post.published).toBe(true);
    expect(post.created_at).toBeTruthy();
    expect(post.updated_at).toBeTruthy();
  });

  it('deve criar post com valores padrão (null) para campos opcionais', async () => {
    const post = await insertTestPost({
      title: 'Post Mínimo',
      slug: `post-minimo-${Date.now()}`,
    });

    expect(post.excerpt).toBeNull();
    expect(post.image_url).toBeNull();
    expect(post.views).toBe(0);
  });

  it('deve ler um post por ID após criar', async () => {
    const created = await insertTestPost({ title: 'Post para Leitura', slug: `post-leitura-${Date.now()}` });

    const result = await tx.query('SELECT * FROM posts WHERE id = $1', [created.id]);
    const found = result.rows[0];

    expect(found).toBeTruthy();
    expect(found.title).toBe('Post para Leitura');
    expect(found.id).toBe(created.id);
  });

  it('deve listar posts com paginação', async () => {
    for (let i = 1; i <= 5; i++) {
      await insertTestPost({ title: `Post Paginado ${i}`, slug: `post-paginado-${i}-${Date.now()}` });
    }

    const page1 = await tx.query('SELECT * FROM posts ORDER BY id LIMIT 2 OFFSET 0');
    expect(page1.rows).toHaveLength(2);

    const page2 = await tx.query('SELECT * FROM posts ORDER BY id LIMIT 2 OFFSET 2');
    expect(page2.rows).toHaveLength(2);
    expect(page2.rows[0].id).toBe(page1.rows[1].id + 1);
  });

  it('deve atualizar campos de um post', async () => {
    const created = await insertTestPost({
      title: 'Post Original',
      slug: `post-original-${Date.now()}`,
      content: 'Conteúdo original',
    });

    await tx.query(
      'UPDATE posts SET title = $1, content = $2 WHERE id = $3',
      ['Post Atualizado', 'Conteúdo atualizado', created.id]
    );

    const result = await tx.query('SELECT * FROM posts WHERE id = $1', [created.id]);
    const updated = result.rows[0];

    expect(updated.title).toBe('Post Atualizado');
    expect(updated.content).toBe('Conteúdo atualizado');
    expect(updated.slug).toBe(created.slug);
  });

  it('deve deletar um post', async () => {
    const created = await insertTestPost({ title: 'Post para Deletar', slug: `post-deletar-${Date.now()}` });

    await tx.query('DELETE FROM posts WHERE id = $1', [created.id]);

    const result = await tx.query('SELECT * FROM posts WHERE id = $1', [created.id]);
    expect(result.rows).toHaveLength(0);
  });

  it('deve rejeitar slug duplicado (UNIQUE)', async () => {
    const slug = `slug-unico-${Date.now()}`;
    await insertTestPost({ title: 'Post 1', slug });

    await expect(
      insertTestPost({ title: 'Post 2', slug })
    ).rejects.toThrow();
  });

  it('deve rejeitar inserção sem título (NOT NULL)', async () => {
    await expect(
      tx.query(
        'INSERT INTO posts (slug, content) VALUES ($1, $2) RETURNING *',
        [`sem-titulo-${Date.now()}`, 'Conteúdo sem título']
      )
    ).rejects.toThrow();
  });

  it('deve rejeitar inserção sem slug (NOT NULL)', async () => {
    await expect(
      tx.query(
        'INSERT INTO posts (title, content) VALUES ($1, $2) RETURNING *',
        ['Sem Slug', 'Conteúdo sem slug']
      )
    ).rejects.toThrow();
  });

  it('deve retornar lista vazia para página acima do total', async () => {
    const result = await tx.query('SELECT * FROM posts ORDER BY id LIMIT 10 OFFSET 100');
    expect(result.rows).toHaveLength(0);
  });

  it('deve aceitar LIMIT 0 (sem resultados)', async () => {
    const result = await tx.query('SELECT * FROM posts ORDER BY id LIMIT 0 OFFSET 0');
    expect(result.rows).toHaveLength(0);
  });

  it('deve buscar posts por termo no título (ILIKE)', async () => {
    await insertTestPost({ title: 'JavaScript Avançado', slug: `js-avancado-${Date.now()}` });
    await insertTestPost({ title: 'Node.js Básico', slug: `node-basico-${Date.now()}` });

    const result = await tx.query(
      'SELECT * FROM posts WHERE title ILIKE $1 ORDER BY id',
      ['%javascript%']
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].title).toBe('JavaScript Avançado');
  });

  it('deve ordenar posts por created_at DESC', async () => {
    await insertTestPost({ title: 'Primeiro', slug: `primeiro-${Date.now()}` });
    await insertTestPost({ title: 'Segundo', slug: `segundo-${Date.now()}` });
    await insertTestPost({ title: 'Terceiro', slug: `terceiro-${Date.now()}` });

    const result = await tx.query('SELECT * FROM posts ORDER BY created_at DESC');
    const titles = result.rows.map(r => r.title);
    expect(titles.indexOf('Terceiro')).toBeLessThan(titles.indexOf('Primeiro'));
  });

  it('deve contar o total de registros corretamente', async () => {
    await insertTestPost({ title: 'Contagem 1', slug: `contagem-1-${Date.now()}` });
    await insertTestPost({ title: 'Contagem 2', slug: `contagem-2-${Date.now()}` });
    await insertTestPost({ title: 'Contagem 3', slug: `contagem-3-${Date.now()}` });

    const result = await tx.query('SELECT COUNT(*) FROM posts');
    expect(parseInt(result.rows[0].count, 10)).toBe(3);
  });

  it('deve executar ROLLBACK em caso de erro no meio da transação', async () => {
    await insertTestPost({ title: 'Post Válido', slug: `post-valido-${Date.now()}` });
    const slug = `slug-duplicado-${Date.now()}`;

    await insertTestPost({ title: 'Post Único', slug });

    await expect(
      insertTestPost({ title: 'Post Duplicado', slug })
    ).rejects.toThrow();

    const countResult = await tx.query(
      "SELECT COUNT(*) FROM posts WHERE title LIKE 'Post Válido%' OR title LIKE 'Post Único%' OR title LIKE 'Post Duplicado%'"
    );
    expect(parseInt(countResult.rows[0].count, 10)).toBe(2);
  });
});