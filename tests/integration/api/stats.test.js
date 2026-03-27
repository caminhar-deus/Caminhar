import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/admin/stats';

// Mock das dependências
jest.mock('../../../lib/db', () => ({
  query: jest.fn(),
}));
jest.mock('../../../lib/auth', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn(),
}));

import { query } from '../../../lib/db';
import { getAuthToken, verifyToken } from '../../../lib/auth';

describe('API de Estatísticas (/api/admin/stats)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar 401 se o usuário não estiver autenticado', async () => {
    // Simula uma requisição sem token válido
    getAuthToken.mockReturnValue(null);

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
    expect(res._getJSONData()).toEqual({ error: 'Não autenticado' });
    expect(query).not.toHaveBeenCalled(); // Garante que nenhuma query foi feita
  });

  it('deve retornar as contagens corretas de usuários logados e outras estatísticas', async () => {
    // Simula um usuário autenticado
    getAuthToken.mockReturnValue('valid-token');
    verifyToken.mockReturnValue({ userId: 1, role: 'admin' });

    // Mock da função query para retornar valores específicos para cada contagem
    query.mockImplementation(async (sql) => {
      // Foco nas contagens de usuários
      if (sql.includes('WHERE last_login_at >= CURRENT_DATE')) {
        return { rows: [{ count: '5' }] }; // 5 usuários logados hoje
      }
      if (sql.includes("date_trunc('month', CURRENT_DATE)")) {
        return { rows: [{ count: '22' }] }; // 22 usuários logados no mês
      }
      if (sql.includes("date_trunc('year', CURRENT_DATE)")) {
        return { rows: [{ count: '150' }] }; // 150 usuários logados no ano
      }
      // Retorno padrão para as outras queries de contagem
      if (sql.includes('SELECT COUNT(*)')) {
        return { rows: [{ count: '10' }] };
      }
      return { rows: [] };
    });

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    // Verifica o status da resposta
    expect(res._getStatusCode()).toBe(200);

    // Verifica se a função query foi chamada várias vezes (devido ao Promise.all)
    expect(query).toHaveBeenCalled();

    const stats = res._getJSONData();

    // Asserções cruciais para as contagens de usuários
    expect(stats.usersToday).toBe(5);
    expect(stats.usersMonth).toBe(22);
    expect(stats.usersYear).toBe(150);

    // Asserção para uma outra estatística para garantir que o resto funciona
    expect(stats.posts).toBe(10);
  });

  it('deve retornar 0 se as contagens de usuários não retornarem resultados', async () => {
    getAuthToken.mockReturnValue('valid-token');
    verifyToken.mockReturnValue({ userId: 1, role: 'admin' });

    // Mock da query para retornar um resultado vazio ou nulo
    query.mockResolvedValue({ rows: [] });

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const stats = res._getJSONData();

    // Garante que o fallback para 0 funciona corretamente
    expect(stats.usersToday).toBe(0);
    expect(stats.usersMonth).toBe(0);
    expect(stats.usersYear).toBe(0);
  });
});