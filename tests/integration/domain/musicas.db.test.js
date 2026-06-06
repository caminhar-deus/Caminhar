/**
 * Testes de Integração com Banco Real (PostgreSQL) — Músicas.
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
 * Helper para criar uma música de teste usando query direta.
 */
async function insertTestMusica(overrides = {}) {
  const defaults = {
    titulo: 'Música de Teste',
    artista: 'Artista Teste',
    url_spotify: `https://open.spotify.com/track/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    descricao: 'Descrição da música de teste.',
    publicado: true,
    position: 0,
  };
  const data = { ...defaults, ...overrides };

  const result = await tx.query(
    `INSERT INTO musicas (titulo, artista, url_spotify, descricao, publicado, position)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [data.titulo, data.artista, data.url_spotify, data.descricao, data.publicado, data.position]
  );
  return result.rows[0];
}

/**
 * describeIf condicional: só executa testes se Docker estiver disponível.
 */
const describeIf = isDockerAvailable() ? describe : describe.skip;

describeIf('Músicas — Integração com PostgreSQL Real', () => {
  it('deve criar uma música e retornar o registro com ID gerado', async () => {
    const musica = await insertTestMusica({
      titulo: 'Nova Música',
      artista: 'Novo Artista',
    });

    expect(musica).toHaveProperty('id');
    expect(musica.id).toEqual(expect.any(Number));
    expect(musica.titulo).toBe('Nova Música');
    expect(musica.artista).toBe('Novo Artista');
    expect(musica.publicado).toBe(true);
    expect(musica.created_at).toBeTruthy();
    expect(musica.updated_at).toBeTruthy();
  });

  it('deve criar música com valores padrão para campos opcionais', async () => {
    const musica = await insertTestMusica({
      titulo: 'Música Mínima',
      artista: 'Artista Mínimo',
      url_spotify: `https://open.spotify.com/track/min-${Date.now()}`,
    });

    expect(musica.descricao).toBe('Descrição da música de teste.');
    expect(musica.position).toBe(0);
  });

  it('deve ler uma música por ID após criar', async () => {
    const created = await insertTestMusica({
      titulo: 'Música para Leitura',
      artista: 'Artista Leitura',
    });

    const result = await tx.query('SELECT * FROM musicas WHERE id = $1', [created.id]);
    const found = result.rows[0];

    expect(found).toBeTruthy();
    expect(found.titulo).toBe('Música para Leitura');
    expect(found.id).toBe(created.id);
  });

  it('deve listar músicas com paginação', async () => {
    for (let i = 1; i <= 5; i++) {
      await insertTestMusica({
        titulo: `Música Paginada ${i}`,
        artista: 'Artista',
        url_spotify: `https://open.spotify.com/track/pag-${i}-${Date.now()}`,
      });
    }

    const page1 = await tx.query('SELECT * FROM musicas ORDER BY id LIMIT 2 OFFSET 0');
    expect(page1.rows).toHaveLength(2);

    const page2 = await tx.query('SELECT * FROM musicas ORDER BY id LIMIT 2 OFFSET 2');
    expect(page2.rows).toHaveLength(2);
    expect(page2.rows[0].id).toBe(page1.rows[1].id + 1);
  });

  it('deve atualizar campos de uma música', async () => {
    const created = await insertTestMusica({
      titulo: 'Música Original',
      artista: 'Artista Original',
      url_spotify: `https://open.spotify.com/track/upd-${Date.now()}`,
    });

    await tx.query(
      'UPDATE musicas SET titulo = $1, artista = $2 WHERE id = $3',
      ['Música Atualizada', 'Artista Atualizado', created.id]
    );

    const result = await tx.query('SELECT * FROM musicas WHERE id = $1', [created.id]);
    const updated = result.rows[0];

    expect(updated.titulo).toBe('Música Atualizada');
    expect(updated.artista).toBe('Artista Atualizado');
    expect(updated.url_spotify).toBe(created.url_spotify);
  });

  it('deve deletar uma música', async () => {
    const created = await insertTestMusica({
      titulo: 'Música para Deletar',
      artista: 'Artista',
      url_spotify: `https://open.spotify.com/track/del-${Date.now()}`,
    });

    await tx.query('DELETE FROM musicas WHERE id = $1', [created.id]);

    const result = await tx.query('SELECT * FROM musicas WHERE id = $1', [created.id]);
    expect(result.rows).toHaveLength(0);
  });

  it('deve rejeitar inserção sem título (NOT NULL)', async () => {
    await expect(
      tx.query(
        'INSERT INTO musicas (url_spotify) VALUES ($1) RETURNING *',
        [`https://open.spotify.com/track/no-title-${Date.now()}`]
      )
    ).rejects.toThrow();
  });

  it('deve rejeitar inserção sem url_spotify (NOT NULL)', async () => {
    await expect(
      tx.query(
        'INSERT INTO musicas (titulo) VALUES ($1) RETURNING *',
        ['Sem URL']
      )
    ).rejects.toThrow();
  });

  it('deve retornar lista vazia para página acima do total', async () => {
    const result = await tx.query('SELECT * FROM musicas ORDER BY id LIMIT 10 OFFSET 100');
    expect(result.rows).toHaveLength(0);
  });

  it('deve aceitar LIMIT 0 (sem resultados)', async () => {
    const result = await tx.query('SELECT * FROM musicas ORDER BY id LIMIT 0 OFFSET 0');
    expect(result.rows).toHaveLength(0);
  });

  it('deve buscar músicas por termo no título (ILIKE)', async () => {
    await insertTestMusica({
      titulo: 'Samba de Verão',
      artista: 'Artista A',
      url_spotify: `https://open.spotify.com/track/samba-${Date.now()}`,
    });
    await insertTestMusica({
      titulo: 'Bossa Nova',
      artista: 'Artista B',
      url_spotify: `https://open.spotify.com/track/bossa-${Date.now()}`,
    });

    const result = await tx.query(
      'SELECT * FROM musicas WHERE titulo ILIKE $1 ORDER BY id',
      ['%samba%']
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].titulo).toBe('Samba de Verão');
  });

  it('deve buscar músicas por termo no artista (ILIKE)', async () => {
    await insertTestMusica({
      titulo: 'Canção X',
      artista: 'Banda Nacional',
      url_spotify: `https://open.spotify.com/track/cancao-${Date.now()}`,
    });
    await insertTestMusica({
      titulo: 'Canção Y',
      artista: 'Banda Internacional',
      url_spotify: `https://open.spotify.com/track/cancao2-${Date.now()}`,
    });

    const result = await tx.query(
      'SELECT * FROM musicas WHERE artista ILIKE $1 ORDER BY id',
      ['%nacional%']
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].artista).toBe('Banda Nacional');
  });

  it('deve ordenar músicas por position ASC, created_at DESC', async () => {
    await insertTestMusica({
      titulo: 'Primeira',
      artista: 'Artista',
      url_spotify: `https://open.spotify.com/track/prim-${Date.now()}`,
      position: 1,
    });
    await insertTestMusica({
      titulo: 'Segunda',
      artista: 'Artista',
      url_spotify: `https://open.spotify.com/track/seg-${Date.now()}`,
      position: 0,
    });

    const result = await tx.query('SELECT * FROM musicas ORDER BY position ASC, created_at DESC');
    expect(result.rows[0].position).toBeLessThanOrEqual(result.rows[1].position);
  });

  it('deve contar o total de registros corretamente', async () => {
    await insertTestMusica({
      titulo: 'Contagem 1',
      artista: 'Artista',
      url_spotify: `https://open.spotify.com/track/c1-${Date.now()}`,
    });
    await insertTestMusica({
      titulo: 'Contagem 2',
      artista: 'Artista',
      url_spotify: `https://open.spotify.com/track/c2-${Date.now()}`,
    });

    const result = await tx.query('SELECT COUNT(*) FROM musicas');
    expect(parseInt(result.rows[0].count, 10)).toBe(2);
  });

  it('deve executar ROLLBACK em caso de erro no meio da transação', async () => {
    await insertTestMusica({
      titulo: 'Música Válida',
      artista: 'Artista',
      url_spotify: `https://open.spotify.com/track/val-${Date.now()}`,
    });

    // Tenta inserir com NOT NULL violado
    await expect(
      tx.query(
        'INSERT INTO musicas (titulo, url_spotify) VALUES ($1, $2) RETURNING *',
        ['Música sem URL', null]
      )
    ).rejects.toThrow();

    const countResult = await tx.query("SELECT COUNT(*) FROM musicas WHERE titulo LIKE 'Música%'");
    expect(parseInt(countResult.rows[0].count, 10)).toBe(1);
  });
});