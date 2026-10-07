import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/admin/stats';

// Mock das dependências
jest.mock('../../../lib/infra/db', () => ({
  query: jest.fn(),
}));
jest.mock('../../../lib/auth/auth', () => {
  const getAuthToken = jest.fn();
  const verifyToken = jest.fn();
  return {
    getAuthToken,
    verifyToken,
    withAuth: jest.fn((handler) => async (req, res) => {
      const token = getAuthToken(req);
      if (!token) {
        return res.status(401).json({ error: 'Não autenticado' });
      }
      const decoded = verifyToken(token);
      if (!decoded) {
        return res.status(401).json({ error: 'Token inválido' });
      }
      req.user = decoded;
      return handler(req, res);
    }),
  };
});

import { query } from '../../../lib/infra/db';
import { getAuthToken, verifyToken } from '../../../lib/auth/auth';

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

  it('deve retornar 403 se o usuário não for admin e não tiver permissão', async () => {
    // O catch do adminCrudHandler também devolve 403 quando a query de roles
    // FALHA (fail-closed) — por isso este teste vem em par com o "allow"
    // logo abaixo: só o par prova que a negação aqui é por FALTA DE PERMISSÃO
    // e não por mock de banco no caminho errado.
    getAuthToken.mockReturnValue('valid-token');
    verifyToken.mockReturnValue({ userId: 2, username: 'editor', role: 'comum' });
    query.mockResolvedValueOnce({ rows: [{ permissions: ['Dashboard'] }] });

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(403);
    const body = res._getJSONData();
    expect(body.error).toContain('Acesso negado');
    expect(body.message).toContain('Requer permissão');
  });

  it('não deve retornar 403 se o usuário não-admin tiver a permissão exigida', async () => {
    // Companheiro do teste acima: mesmo cargo 'comum', mas COM 'Visão Geral'.
    // Se o mock do banco estiver errado (query falhando/undefined), o fail-closed
    // devolveria 403 aqui e o teste quebraria — é isso que o par garante.
    getAuthToken.mockReturnValue('valid-token');
    verifyToken.mockReturnValue({ userId: 2, username: 'editor', role: 'comum' });

    // A query de roles é a PRIMEIRA do request; as demais são as contagens do
    // endpoint — por isso o mock ramifica por SQL em vez de devolver tudo igual.
    query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT permissions FROM roles')) {
        return { rows: [{ permissions: ['Visão Geral'] }] };
      }
      return { rows: [{ count: '4' }] };
    });

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const stats = res._getJSONData();
    expect(stats.posts).toBe(4);
    expect(stats.usersToday).toBe(4);
    expect(stats.dicas).toBe(4);
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