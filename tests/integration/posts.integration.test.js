import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mock da camada de domínio para isolar o teste da API da lógica de banco de dados.
// Usamos uma implementação de mock customizada para ter controle direto sobre a função
// e evitar problemas de referência com `jest.spyOn` em módulos ES.
const getRecentPostsMock = jest.fn();
jest.mock('../../lib/domain/posts.js', () => ({
  getRecentPosts: getRecentPostsMock,
}));

// Mock do módulo de cache para evitar o erro de parsing de ESM do @upstash/redis
jest.mock('../../lib/cache.js', () => ({
  getOrSetCache: jest.fn((key, fetchFunction) => fetchFunction()),
  invalidateCache: jest.fn(),
  checkRateLimit: jest.fn().mockResolvedValue(false),
}));

import handler from '../../pages/api/posts.js';

describe('Integração de Posts (API/DB)', () => {
  beforeEach(() => {
    // Limpa o mock específico antes de cada teste
    getRecentPostsMock.mockClear();
  });

  it('Endpoint API /api/posts deve retornar 200 e JSON de posts', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    // Configura o mock da função de domínio para este teste
    getRecentPostsMock.mockResolvedValue({
      data: [{ id: 1, title: 'Post de Teste' }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(getRecentPostsMock).toHaveBeenCalledWith(10, 1); // Verifica se foi chamado com os defaults
  });

  it('Endpoint API /api/posts deve aceitar parâmetros de paginação', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { page: '2', limit: '5' }
    });

    // Configura o mock da função de domínio para este teste
    getRecentPostsMock.mockResolvedValue({
      data: [],
      pagination: { page: 2, limit: 5, total: 10, totalPages: 2 },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(getRecentPostsMock).toHaveBeenCalledWith(5, 2); // Verifica se foi chamado com os parâmetros da query
  });

  it('Endpoint API /api/posts deve rejeitar métodos não GET', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });
});