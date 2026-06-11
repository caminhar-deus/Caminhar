import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

jest.mock('../../../lib/db.js', () => require('../../mocks/db-module').mockDb());

import handler from '../../../pages/api/dicas.js';
import { query } from '../../../lib/db.js';
import { invalidateCache } from '../../../lib/cache.js';

describe('API Pública - Dicas do Dia (/api/dicas)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Limpa o cache entre testes para evitar que o resultado de um teste
    // influencie o outro (getOrSetCache mantém estado em memória)
    await invalidateCache('dicas:public:published:*');
  });

  it('deve retornar 200 e a lista de dicas publicadas paginada', async () => {
    const mockDicas = [{ id: 1, name: 'Dica 1', content: 'Conteúdo' }];

    // A API executa duas queries simultâneas via Promise.all:
    //   1. SELECT COUNT(*) FROM dicas WHERE published = true
    //   2. SELECT id, name, content FROM dicas WHERE published = true LIMIT $1 OFFSET $2
    query.mockResolvedValueOnce({ rows: [{ count: '1' }] }); // COUNT
    query.mockResolvedValueOnce({ rows: mockDicas });         // SELECT

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);

    const response = JSON.parse(res._getData());
    expect(response.success).toBe(true);
    expect(response.data).toEqual(mockDicas);
    expect(response.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
  });

  it('deve retornar 500 se ocorrer um erro no banco', async () => {
    query.mockRejectedValueOnce(new Error('Erro DB'));

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
  });

  it('deve retornar 405 se o método não for GET', async () => {
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });
});
