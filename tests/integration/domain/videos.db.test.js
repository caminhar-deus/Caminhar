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
 * Helper para criar um vídeo de teste usando query direta.
 */
async function insertTestVideo(overrides = {}) {
  const defaults = {
    titulo: 'Vídeo de Teste',
    url_youtube: `https://youtube.com/watch?v=${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    descricao: 'Descrição do vídeo de teste.',
    published: true,
    position: 0,
  };
  const data = { ...defaults, ...overrides };

  // `created_at` é opcional: quando omitido mantém o DEFAULT CURRENT_TIMESTAMP
  // (que no PostgreSQL é fixo para a transação INTEIRA). Testes de ORDENAÇÃO
  // precisam passar datas explícitas, senão todas as linhas do teste nascem
  // com o mesmo valor e o ORDER BY vira não-determinístico.
  const result = await tx.query(
    `INSERT INTO videos (titulo, url_youtube, descricao, published, position, created_at)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_TIMESTAMP))
     RETURNING *`,
    [data.titulo, data.url_youtube, data.descricao, data.published, data.position, data.created_at ?? null]
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
    expect(video.published).toBe(true);
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
    // CURRENT_TIMESTAMP é o MESMO para todas as linhas de uma transação
    // (é o timestamp de início da transação), então sem datas explícitas os
    // três vídeos nasceriam empatados e o ORDER BY seria não-determinístico.
    await insertTestVideo({
      titulo: 'Primeiro',
      url_youtube: `https://youtube.com/watch?v=prim-${Date.now()}`,
      created_at: '2024-01-01T00:00:00Z',
    });
    await insertTestVideo({
      titulo: 'Segundo',
      url_youtube: `https://youtube.com/watch?v=seg-${Date.now()}`,
      created_at: '2024-01-02T00:00:00Z',
    });
    await insertTestVideo({
      titulo: 'Terceiro',
      url_youtube: `https://youtube.com/watch?v=terc-${Date.now()}`,
      created_at: '2024-01-03T00:00:00Z',
    });

    const result = await tx.query('SELECT * FROM videos ORDER BY created_at DESC');
    const titles = result.rows.map(r => r.titulo);
    // Ordem estrita decrescente (subsume a asserção original abaixo)
    expect(titles).toEqual(['Terceiro', 'Segundo', 'Primeiro']);
    expect(titles.indexOf('Terceiro')).toBeLessThan(titles.indexOf('Primeiro'));
  });

  // ── Ordenação pública de /api/videos (item AE, migration 021) ──────────────
  // As cláusulas abaixo são as de `SORT_MAP` em pages/api/videos.js (travadas
  // literalmente em tests/integration/api/videos.pagination.api.test.js).

  it('migration 021 aplicada: extensão unaccent e idx_videos_recent existem', async () => {
    const ext = await tx.query("SELECT 1 FROM pg_extension WHERE extname = 'unaccent'");
    expect(ext.rows).toHaveLength(1);

    const idx = await tx.query(
      "SELECT indexdef FROM pg_indexes WHERE tablename = 'videos' AND indexname = 'idx_videos_recent'"
    );
    expect(idx.rows).toHaveLength(1);
    expect(idx.rows[0].indexdef).toContain('(published, created_at DESC, id DESC)');
  });

  it('A-Z e Z-A por lower(unaccent(titulo)) ordenam acentos e caixa sem depender da colação do cluster', async () => {
    // Em cluster `C`/`C.UTF-8`, `ORDER BY titulo` devolveria
    // Ave, Ave Maria, Ousado Amor, Zebra, Zélia, abba, amor, ave, Ágape, Éden, ótimo…
    const titulos = ['Ave Maria', 'ótimo caminho', 'Zélia', 'amor', 'Éden', 'Ousado Amor', 'abba', 'Ágape', 'Zebra'];
    for (const [i, titulo] of titulos.entries()) {
      await insertTestVideo({ titulo, url_youtube: `https://youtube.com/watch?v=az-${i}-${Date.now()}` });
    }

    const asc = await tx.query('SELECT titulo FROM videos ORDER BY lower(unaccent(titulo)) ASC, id ASC');
    expect(asc.rows.map((r) => r.titulo)).toEqual([
      'abba', 'Ágape', 'amor', 'Ave Maria', 'Éden', 'ótimo caminho', 'Ousado Amor', 'Zebra', 'Zélia',
    ]);

    const desc = await tx.query('SELECT titulo FROM videos ORDER BY lower(unaccent(titulo)) DESC, id DESC');
    expect(desc.rows.map((r) => r.titulo)).toEqual(asc.rows.map((r) => r.titulo).reverse());
  });

  it('Posicionados ordena por position ASC e desempata por id', async () => {
    const c = await insertTestVideo({ titulo: 'C', position: 2, url_youtube: `https://youtube.com/watch?v=pc-${Date.now()}` });
    const a = await insertTestVideo({ titulo: 'A', position: 1, url_youtube: `https://youtube.com/watch?v=pa-${Date.now()}` });
    const b = await insertTestVideo({ titulo: 'B', position: 2, url_youtube: `https://youtube.com/watch?v=pb-${Date.now()}` });

    const result = await tx.query('SELECT id FROM videos ORDER BY position ASC, id ASC');
    // position 1 primeiro; entre as duas de position 2, a de menor id (c foi criada antes de b)
    expect(result.rows.map((r) => r.id)).toEqual([a.id, c.id, b.id]);
  });

  it('os índices atendem as ordens da rota: recent/oldest sem Sort explícito, positioned pelo índice de paginação', async () => {
    // Tabela minúscula + seq scan/bitmap/sort desligados: o planner só escapa do
    // Sort explícito se existir índice que entregue a ordem pedida. É prova de
    // que o índice SERVE a ordem (o ganho de tempo foi medido em 50 000 linhas
    // na migration 021).
    await tx.query('SET LOCAL enable_seqscan = off');
    await tx.query('SET LOCAL enable_bitmapscan = off');
    await tx.query('SET LOCAL enable_sort = off');

    const plan = async (orderBy) => {
      const res = await tx.query(
        `EXPLAIN SELECT id, titulo FROM videos WHERE published = true ORDER BY ${orderBy} LIMIT 12`
      );
      return res.rows.map((r) => r['QUERY PLAN']).join('\n');
    };

    const recent = await plan('created_at DESC, id DESC');
    expect(recent).toContain('idx_videos_recent');
    expect(recent).not.toMatch(/\bSort\b/);

    const oldest = await plan('created_at ASC, id ASC');
    expect(oldest).toContain('Index Scan Backward using idx_videos_recent');
    expect(oldest).not.toMatch(/\bSort\b/);

    const positioned = await plan('position ASC, id ASC');
    expect(positioned).toContain('idx_videos_pagination');
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
    //
    // O PostgreSQL aborta a transação após o primeiro erro (SQLSTATE 25P02):
    // todo comando seguinte falha com "current transaction is aborted…".
    // Savepoint desfaza APENAS o comando que falhou e permite seguir lendo o
    // estado da transação — sem ele o assert abaixo é impossível em banco real.
    await tx.query('SAVEPOINT antes_do_erro');
    await expect(
      tx.query(
        'INSERT INTO videos (titulo, url_youtube) VALUES ($1, $2) RETURNING *',
        ['Vídeo sem URL', null]
      )
    ).rejects.toThrow();
    await tx.query('ROLLBACK TO SAVEPOINT antes_do_erro');

    const countResult = await tx.query("SELECT COUNT(*) FROM videos WHERE titulo LIKE 'Vídeo%'");
    expect(parseInt(countResult.rows[0].count, 10)).toBe(1);
  });
});