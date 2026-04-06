import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

jest.mock('../../../lib/db.js', () => ({
  query: jest.fn(),
}));

import handler from '../../../pages/api/dicas.js';
import { query } from '../../../lib/db.js';

describe('API Pública - Dicas do Dia (/api/dicas)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar 200 e a lista de dicas publicadas', async () => {
    const mockDicas = [{ id: 1, name: 'Dica 1', content: 'Conteúdo' }];
    query.mockResolvedValueOnce({ rows: mockDicas });

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual(mockDicas);
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