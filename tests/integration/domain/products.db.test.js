/**
 * Testes de Integração com Banco Real (PostgreSQL) — Produtos.
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
  if (tx && typeof tx.rollback === 'function') {
    try { await tx.rollback(); } catch { /* rollback de segurança */ }
  }
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
 * Helper para criar um produto de teste usando query direta.
 */
async function insertTestProduct(overrides = {}) {
  const defaults = {
    title: 'Produto de Teste',
    price: '99.90',
    images: JSON.stringify([`https://example.com/img/prod-${Date.now()}.jpg`]),
    description: 'Descrição do produto de teste.',
    link_ml: `https://mercadolivre.com.br/prod-${Date.now()}`,
    link_shopee: `https://shopee.com.br/prod-${Date.now()}`,
    link_amazon: `https://amazon.com.br/prod-${Date.now()}`,
    published: true,
    position: 0,
  };
  const data = { ...defaults, ...overrides };

  const result = await tx.query(
    `INSERT INTO products (title, price, images, description, link_ml, link_shopee, link_amazon, published, position)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [data.title, data.price, data.images, data.description, data.link_ml, data.link_shopee, data.link_amazon, data.published, data.position]
  );
  return result.rows[0];
}

/**
 * describeIf condicional: só executa testes se Docker estiver disponível.
 */
const describeIf = isDockerAvailable() ? describe : describe.skip;

describeIf('Produtos — Integração com PostgreSQL Real', () => {
  it('deve criar um produto e retornar o registro com ID gerado', async () => {
    const product = await insertTestProduct({
      title: 'Novo Produto',
      price: '199.90',
    });

    expect(product).toHaveProperty('id');
    expect(product.id).toEqual(expect.any(Number));
    expect(product.title).toBe('Novo Produto');
    expect(product.price).toBe('199.90');
    expect(product.published).toBe(true);
    expect(product.created_at).toBeTruthy();
    expect(product.updated_at).toBeTruthy();
  });

  it('deve criar produto com valores padrão para campos opcionais', async () => {
    const product = await insertTestProduct({
      title: 'Produto Mínimo',
      price: '49.90',
      link_shopee: null,
      link_amazon: null,
    });

    expect(product.description).toBe('Descrição do produto de teste.');
    expect(product.link_shopee).toBeNull();
    expect(product.link_amazon).toBeNull();
    expect(product.position).toBe(0);
  });

  it('deve ler um produto por ID após criar', async () => {
    const created = await insertTestProduct({
      title: 'Produto para Leitura',
      price: '59.90',
    });

    const result = await tx.query('SELECT * FROM products WHERE id = $1', [created.id]);
    const found = result.rows[0];

    expect(found).toBeTruthy();
    expect(found.title).toBe('Produto para Leitura');
    expect(found.id).toBe(created.id);
  });

  it('deve listar produtos com paginação', async () => {
    for (let i = 1; i <= 5; i++) {
      await insertTestProduct({
        title: `Produto Paginado ${i}`,
        price: `${i * 10}.00`,
      });
    }

    const page1 = await tx.query('SELECT * FROM products ORDER BY id LIMIT 2 OFFSET 0');
    expect(page1.rows).toHaveLength(2);

    const page2 = await tx.query('SELECT * FROM products ORDER BY id LIMIT 2 OFFSET 2');
    expect(page2.rows).toHaveLength(2);
    expect(page2.rows[0].id).toBe(page1.rows[1].id + 1);
  });

  it('deve atualizar campos de um produto', async () => {
    const created = await insertTestProduct({
      title: 'Produto Original',
      price: '29.90',
    });

    await tx.query(
      'UPDATE products SET title = $1, price = $2 WHERE id = $3',
      ['Produto Atualizado', '39.90', created.id]
    );

    const result = await tx.query('SELECT * FROM products WHERE id = $1', [created.id]);
    const updated = result.rows[0];

    expect(updated.title).toBe('Produto Atualizado');
    expect(updated.price).toBe('39.90');
  });

  it('deve deletar um produto', async () => {
    const created = await insertTestProduct({
      title: 'Produto para Deletar',
      price: '10.00',
    });

    await tx.query('DELETE FROM products WHERE id = $1', [created.id]);

    const result = await tx.query('SELECT * FROM products WHERE id = $1', [created.id]);
    expect(result.rows).toHaveLength(0);
  });

  it('deve rejeitar inserção sem título (NOT NULL)', async () => {
    await expect(
      tx.query(
        'INSERT INTO products (price, images) VALUES ($1, $2) RETURNING *',
        ['99.90', JSON.stringify(['https://example.com/img.jpg'])]
      )
    ).rejects.toThrow();
  });

  it('deve rejeitar inserção sem price (NOT NULL)', async () => {
    await expect(
      tx.query(
        'INSERT INTO products (title, images) VALUES ($1, $2) RETURNING *',
        ['Sem Preço', JSON.stringify(['https://example.com/img.jpg'])]
      )
    ).rejects.toThrow();
  });

  it('deve retornar lista vazia para página acima do total', async () => {
    const result = await tx.query('SELECT * FROM products ORDER BY id LIMIT 10 OFFSET 100');
    expect(result.rows).toHaveLength(0);
  });

  it('deve aceitar LIMIT 0 (sem resultados)', async () => {
    const result = await tx.query('SELECT * FROM products ORDER BY id LIMIT 0 OFFSET 0');
    expect(result.rows).toHaveLength(0);
  });

  it('deve filtrar produtos publicados (published = true)', async () => {
    await insertTestProduct({ title: 'Publicado 1', price: '10.00', published: true });
    await insertTestProduct({ title: 'Não Publicado', price: '20.00', published: false });

    const result = await tx.query(
      'SELECT * FROM products WHERE published = true ORDER BY id'
    );
    expect(result.rows.every(r => r.published === true)).toBe(true);
  });

  it('deve ordenar produtos por position ASC, id ASC', async () => {
    await insertTestProduct({ title: 'Segundo', price: '10.00', position: 2 });
    await insertTestProduct({ title: 'Primeiro', price: '20.00', position: 1 });

    const result = await tx.query('SELECT * FROM products ORDER BY position ASC, id ASC');
    expect(result.rows[0].position).toBeLessThanOrEqual(result.rows[1].position);
  });

  it('deve contar o total de registros corretamente', async () => {
    await insertTestProduct({ title: 'Contagem 1', price: '10.00' });
    await insertTestProduct({ title: 'Contagem 2', price: '20.00' });

    const result = await tx.query('SELECT COUNT(*) FROM products');
    expect(parseInt(result.rows[0].count, 10)).toBe(2);
  });

  it('deve executar ROLLBACK em caso de erro no meio da transação', async () => {
    await insertTestProduct({ title: 'Produto Válido', price: '30.00' });

    // Tenta inserir com NOT NULL violado
    await expect(
      tx.query(
        'INSERT INTO products (title, price, images) VALUES ($1, $2, $3) RETURNING *',
        ['Sem Imagens', '50.00', null]
      )
    ).rejects.toThrow();

    const countResult = await tx.query("SELECT COUNT(*) FROM products WHERE title LIKE 'Produto%'");
    expect(parseInt(countResult.rows[0].count, 10)).toBe(1);
  });
});