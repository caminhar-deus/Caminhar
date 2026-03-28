import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { mockQuery, restorePoolImplementation } from 'pg';
import { getRecentPosts, getAllPosts, resetPool } from '../../lib/db.js';

// Usa o __mocks__/pg.js compartilhado (mesmo padrão dos testes unitários).
// A fábrica inline foi removida pois causava incompatibilidade com ESM:
// o Jest não conseguia expor Pool como named export sem __esModule:true,
// fazendo getPool().query falhar com "is not a function".
jest.mock('pg');

// Mock do módulo de cache para evitar o erro de parsing de ESM do @upstash/redis
jest.mock('../../lib/cache.js', () => ({
  getOrSetCache: jest.fn((key, fetchFunction) => fetchFunction()),
  invalidateCache: jest.fn(),
  checkRateLimit: jest.fn().mockResolvedValue(false),
}));

import handler from '../../pages/api/posts.js';

describe('Integração de Posts (API/DB)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    restorePoolImplementation();
    resetPool();
    process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
  });

  it('getRecentPosts deve retornar apenas posts publicados (published = true)', async () => {
    mockQuery.mockImplementation((sql) => {
      if (sql.startsWith('SELECT COUNT(*)')) {
        return Promise.resolve({ rows: [{ count: '1' }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [{ id: 1, title: 'Test Post' }], rowCount: 1 });
    });

    await getRecentPosts();

    expect(mockQuery).toHaveBeenCalledTimes(2);

    const dataCall = mockQuery.mock.calls.find(call => call[0].includes('LIMIT'));
    const countCall = mockQuery.mock.calls.find(call => call[0].includes('COUNT'));

    expect(dataCall[0]).toMatch(/WHERE\s+published\s*=\s*true/i);
    expect(countCall[0]).toMatch(/WHERE\s+published\s*=\s*true/i);
  });

  it('getRecentPosts deve suportar paginação (limit e offset)', async () => {
    const limit = 5;
    const page = 2;

    mockQuery.mockImplementation((sql) => {
      if (sql.startsWith('SELECT COUNT(*)')) {
        return Promise.resolve({ rows: [{ count: '10' }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await getRecentPosts(limit, page);

    expect(mockQuery).toHaveBeenCalledTimes(2);
    const dataCall = mockQuery.mock.calls.find(call => call[0].includes('LIMIT'));
    const sql = dataCall[0];
    const params = dataCall[1];

    expect(sql).toMatch(/LIMIT \$1 OFFSET \$2/i);
    expect(params).toEqual([limit, 5]); // offset = (2-1)*5 = 5
  });

  it('getAllPosts deve permitir visualizar rascunhos (sem filtro de published)', async () => {
    mockQuery.mockImplementation(() => Promise.resolve({ rows: [{ id: 1, title: 'Draft Post' }], rowCount: 1 }));

    await getAllPosts();

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const sql = mockQuery.mock.calls[0][0];

    expect(sql).not.toMatch(/WHERE\s+published\s*=\s*true/i);
  });

  it('Endpoint API /api/posts deve retornar 200 e JSON de posts', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    mockQuery.mockImplementation((sql) => {
      if (sql.includes('COUNT')) {
        return Promise.resolve({ rows: [{ count: '0' }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(mockQuery).toHaveBeenCalled();
  });

  it('Endpoint API /api/posts deve aceitar parâmetros de paginação', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { page: '2', limit: '5' }
    });

    mockQuery.mockImplementation((sql) => {
      if (sql.includes('COUNT')) {
        return Promise.resolve({ rows: [{ count: '10' }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(mockQuery).toHaveBeenCalled();
    const dataCall = mockQuery.mock.calls.find(call => call[0].includes('LIMIT'));
    const params = dataCall[1];
    expect(params).toEqual([5, 5]); // limit 5, offset 5
  });

  it('Endpoint API /api/posts deve rejeitar métodos não GET', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });
});