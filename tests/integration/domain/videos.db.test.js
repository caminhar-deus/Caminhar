/**
 * Testes de Integração com Banco Real (PostgreSQL) — Vídeos.
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
 * Helper para criar um vídeo de teste usando query direta.
 */
async function insertTestVideo(overrides = {}) {
  const defaults = {
    titulo: 'Vídeo de Teste',
    url_youtube: `https://youtube.com/watch?v=${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    descricao: 'Descrição do vídeo de teste.',
    publicado: true,
    position: 0,
  };
  const data = { ...defaults, ...overrides };

  const result = await tx.query(
    `INSERT INTO videos (titulo, url_youtube, descricao, publicado, position)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.titulo, data.url_youtube, data.descricao, data.publicado, data.position]
  );
  return result.rows[0];
}

/**
 * describeIf condicional: só executa testes se Docker estiver disponível.
 */
const describeIf = isDockerAvailable() ? describe : describe.skip;

describeIf('Vídeos — Integração com PostgreSQL Real', () => {
  it('deve criar um vídeo e retornar o registro com ID gerado', async () => {
    const video = await insertTestVideo({
      titulo: 'Novo Vídeo',
      url_youtube: `https://youtube.com/watch?v=new-${Date.now()}`,
    });

    expect(video).toHaveProperty('id');
    expect(video.id).toEqual(expect.any(Number));
    expect(video.titulo).toBe('Novo Vídeo');
    expect(video.publicado).toBe(true);
    expect(video.created_at).toBeTruthy();
    expect(video.updated_at).toBeTruthy();
  });

  it('deve criar vídeo com valores padrão para campos opcionais', async () => {
    const video = await insertTestVideo({
      titulo: 'Vídeo Mínimo',
      url_youtube: `https://youtube.com/watch?v=min-${Date.now()}`,
    });

    expect(video.descricao).toBe('Descrição do vídeo de teste.');
    expect(video.position).toBe(0);
  });

  it('deve ler um vídeo por ID após criar', async () => {
    const created = await insertTestVideo({
      titulo: 'Vídeo para Leitura',
      url_youtube: `https://youtube.com/watch?v=read-${Date.now()}`,
    });

    const result = await tx.query('SELECT * FROM videos WHERE id = $1', [created.id]);
    const found = result.rows[0];

    expect(found).toBeTruthy();
    expect(found.titulo).toBe('Vídeo para Leitura');
    expect(found.id).toBe(created.id);
  });

  it('deve listar vídeos com paginação', async () => {
    for (let i = 1; i <= 5; i++) {
      await insertTestVideo({
        titulo: `Vídeo Paginado ${i}`,
        url_youtube: `https://youtube.com/watch?v=pag-${i}-${Date.now()}`,
      });
    }

    const page1 = await tx.query('SELECT * FROM videos ORDER BY id LIMIT 2 OFFSET 0');
    expect(page1.rows).toHaveLength(2);

    const page2 = await tx.query('SELECT * FROM videos ORDER BY id LIMIT 2 OFFSET 2');
    expect(page2.rows).toHaveLength(2);
    expect(page2.rows[0].id).toBe(page1.rows[1].id + 1);
  });

  it('deve atualizar campos de um vídeo', async () => {
    const created = await insertTestVideo({
      titulo: 'Vídeo Original',
      url_youtube: `https://youtube.com/watch?v=upd-${Date.now()}`,
    });

    await tx.query(
      'UPDATE videos SET titulo = $1, descricao = $2 WHERE id = $3',
      ['Vídeo Atualizado', 'Descrição atualizada', created.id]
    );

    const result = await tx.query('SELECT * FROM videos WHERE id = $1', [created.id]);
    const updated = result.rows[0];

    expect(updated.titulo).toBe('Vídeo Atualizado');
    expect(updated.descricao).toBe('Descrição atualizada');
    expect(updated.url_youtube).toBe(created.url_youtube);
  });

  it('deve deletar um vídeo', async () => {
    const created = await insertTestVideo({
      titulo: 'Vídeo para Deletar',
      url_youtube: `https://youtube.com/watch?v=del-${Date.now()}`,
    });

    await tx.query('DELETE FROM videos WHERE id = $1', [created.id]);

    const result = await tx.query('SELECT * FROM videos WHERE id = $1', [created.id]);
    expect(result.rows).toHaveLength(0);
  });

  it('deve rejeitar inserção sem título (NOT NULL)', async () => {
    await expect(
      tx.query(
        'INSERT INTO videos (url_youtube) VALUES ($1) RETURNING *',
        [`https://youtube.com/watch?v=no-title-${Date.now()}`]
      )
    ).rejects.toThrow();
  });

  it('deve rejeitar inserção sem url_youtube (NOT NULL)', async () => {
    await expect(
      tx.query(
        'INSERT INTO videos (titulo) VALUES ($1) RETURNING *',
        ['Sem URL']
      )
    ).rejects.toThrow();
  });

  it('deve retornar lista vazia para página acima do total', async () => {
    const result = await tx.query('SELECT * FROM videos ORDER BY id LIMIT 10 OFFSET 100');
    expect(result.rows).toHaveLength(0);
  });

  it('deve aceitar LIMIT 0 (sem resultados)', async () => {
    const result = await tx.query('SELECT * FROM videos ORDER BY id LIMIT 0 OFFSET 0');
    expect(result.rows).toHaveLength(0);
  });

  it('deve buscar vídeos por termo no título (ILIKE)', async () => {
    await insertTestVideo({
      titulo: 'JavaScript Tutorial',
      url_youtube: `https://youtube.com/watch?v=js-${Date.now()}`,
    });
    await insertTestVideo({
      titulo: 'Python Tutorial',
      url_youtube: `https://youtube.com/watch?v=py-${Date.now()}`,
    });

    const result = await tx.query(
      'SELECT * FROM videos WHERE titulo ILIKE $1 ORDER BY id',
      ['%javascript%']
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].titulo).toBe('JavaScript Tutorial');
  });

  it('deve buscar vídeos por termo na descrição (ILIKE)', async () => {
    await insertTestVideo({
      titulo: 'Vídeo A',
      descricao: 'Aprenda React do zero',
      url_youtube: `https://youtube.com/watch?v=react-${Date.now()}`,
    });
    await insertTestVideo({
      titulo: 'Vídeo B',
      descricao: 'Aprenda Vue.js do zero',
      url_youtube: `https://youtube.com/watch?v=vue-${Date.now()}`,
    });

    const result = await tx.query(
      'SELECT * FROM videos WHERE descricao ILIKE $1 ORDER BY id',
      ['%react%']
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].descricao).toBe('Aprenda React do zero');
  });

  it('deve ordenar vídeos por created_at DESC', async () => {
    await insertTestVideo({
      titulo: 'Primeiro',
      url_youtube: `https://youtube.com/watch?v=prim-${Date.now()}`,
    });
    await insertTestVideo({
      titulo: 'Segundo',
      url_youtube: `https://youtube.com/watch?v=seg-${Date.now()}`,
    });
    await insertTestVideo({
      titulo: 'Terceiro',
      url_youtube: `https://youtube.com/watch?v=terc-${Date.now()}`,
    });

    const result = await tx.query('SELECT * FROM videos ORDER BY created_at DESC');
    const titles = result.rows.map(r => r.titulo);
    expect(titles.indexOf('Terceiro')).toBeLessThan(titles.indexOf('Primeiro'));
  });

  it('deve contar o total de registros corretamente', async () => {
    await insertTestVideo({
      titulo: 'Contagem 1',
      url_youtube: `https://youtube.com/watch?v=c1-${Date.now()}`,
    });
    await insertTestVideo({
      titulo: 'Contagem 2',
      url_youtube: `https://youtube.com/watch?v=c2-${Date.now()}`,
    });

    const result = await tx.query('SELECT COUNT(*) FROM videos');
    expect(parseInt(result.rows[0].count, 10)).toBe(2);
  });

  it('deve executar ROLLBACK em caso de erro no meio da transação', async () => {
    await insertTestVideo({
      titulo: 'Vídeo Válido',
      url_youtube: `https://youtube.com/watch?v=val-${Date.now()}`,
    });

    // Tenta inserir com NOT NULL violado
    await expect(
      tx.query(
        'INSERT INTO videos (titulo, url_youtube) VALUES ($1, $2) RETURNING *',
        ['Vídeo sem URL', null]
      )
    ).rejects.toThrow();

    const countResult = await tx.query("SELECT COUNT(*) FROM videos WHERE titulo LIKE 'Vídeo%'");
    expect(parseInt(countResult.rows[0].count, 10)).toBe(1);
  });
});