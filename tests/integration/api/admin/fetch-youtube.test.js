import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mocks de autenticação
jest.mock('../../../../lib/auth/auth.js', () => {
  const mockGetAuthToken = jest.fn();
  const mockVerifyToken = jest.fn();
  return {
    getAuthToken: mockGetAuthToken,
    verifyToken: mockVerifyToken,
    withAuth: jest.fn((handler) => (req, res) => {
      const token = mockGetAuthToken(req);
      if (!token) {
        return res.status(401).json({ message: 'Não autenticado' });
      }
      const decoded = mockVerifyToken(token);
      if (!decoded) {
        return res.status(401).json({ message: 'Token inválido' });
      }
      req.user = decoded;
      return handler(req, res);
    }),
  };
});

// Mock do logger para não imprimir o erro de handler intencional (caminho de 500) na saída do Jest
jest.mock('../../../../lib/infra/logger.js', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    success: jest.fn(),
  },
}));

// Mock do DB para controlar a query de roles do RBAC (createAdminHandler)
jest.mock('../../../../lib/infra/db.js', () => require('../../../mocks/db-module').mockDb());

import handler from '../../../../pages/api/admin/fetch-youtube.js';
import { query } from '../../../../lib/infra/db.js';
import { getAuthToken, verifyToken } from '../../../../lib/auth/auth.js';
import { logger } from '../../../../lib/infra/logger.js';
import { mockGlobalFetch } from '../../../helpers/index.js';

describe('API Admin - Fetch YouTube (/api/admin/fetch-youtube)', () => {
  let fetchMock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Simula usuário logado
    getAuthToken.mockReturnValue('fake-token');
    verifyToken.mockReturnValue({ userId: 1, role: 'admin' });

    // createAdminHandler consulta roles.permissions (RBAC) antes do handler:
    // devolve a permissão exigida pelo recurso para o caminho padrão ser de
    // PERMISSÃO CONCEDIDA (admin ignora, não-admin é autorizado).
    query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT permissions FROM roles')) {
        return { rows: [{ permissions: ['Gestão de Vídeos'] }] };
      }
      return { rows: [], rowCount: 0 };
    });

    // Moca a função fetch global do Node.js
    fetchMock = mockGlobalFetch();
  });

  afterEach(() => {
    // Restaura o fetch original para não quebrar outros testes
    fetchMock?.mockRestore();
  });

  describe('Segurança e Validações', () => {
    it('deve retornar 405 se o método não for POST', async () => {
      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(405);
    });

    it('deve retornar 401 se não estiver autenticado', async () => {
      getAuthToken.mockReturnValue(null);
      const { req, res } = createMocks({ method: 'POST', body: { url: 'https://youtube.com/watch?v=123' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(401);
    });

    it('deve retornar 400 se a URL não for fornecida', async () => {
      const { req, res } = createMocks({ method: 'POST', body: {} });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    it('deve retornar 403 se o usuário não for admin e não tiver permissão', async () => {
      // O catch do adminCrudHandler também devolve 403 quando a query de roles
      // FALHA (fail-closed) — por isso este teste vem em par com o "allow"
      // logo abaixo: só o par prova que a negação aqui é por FALTA DE PERMISSÃO
      // e não por mock de banco no caminho errado.
      query.mockResolvedValueOnce({ rows: [{ permissions: ['Dashboard'] }] });
      verifyToken.mockReturnValue({ userId: 2, username: 'editor', role: 'comum' });

      const { req, res } = createMocks({ method: 'POST', body: { url: 'https://youtu.be/12345' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(403);
      // `error` é igual nos dois caminhos de 403 (falta de permissão ×
      // fail-closed por falha de banco): só o `message` exigindo a permissão discrimina.
      const body = JSON.parse(res._getData());
      expect(body.error).toContain('Acesso negado');
      expect(body.message).toContain('Requer permissão');
      // O RBAC roda ANTES do handler: o deny não deve nem chegar no fetch
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('não deve retornar 403 se o usuário não-admin tiver a permissão exigida', async () => {
      // Companheiro do teste acima: mesmo cargo 'comum', mas COM 'Gestão de Vídeos'.
      // Se o mock do banco estiver errado (query falhando/undefined), o fail-closed
      // devolveria 403 aqui e o teste quebraria — é isso que o par garante.
      query.mockResolvedValueOnce({ rows: [{ permissions: ['Gestão de Vídeos'] }] });
      verifyToken.mockReturnValue({ userId: 2, username: 'editor', role: 'comum' });
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ title: 'Vídeo Permitido' })
      });

      const { req, res } = createMocks({ method: 'POST', body: { url: 'https://youtu.be/12345' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData()).title).toBe('Vídeo Permitido');
    });
  });

  describe('Busca de Dados (oEmbed)', () => {
    it('deve retornar 200 e o título do vídeo em caso de sucesso', async () => {
      // Simula a resposta de sucesso da API do Youtube
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ title: 'Vídeo Muito Legal' })
      });

      const { req, res } = createMocks({ method: 'POST', body: { url: 'https://youtu.be/12345' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({ title: 'Vídeo Muito Legal' });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://www.youtube.com/oembed'),
        expect.objectContaining({})
      );
    });

    it('deve retornar 500 se o fetch falhar (ex: vídeo privado, apagado ou erro de rede)', async () => {
      global.fetch.mockResolvedValueOnce({ ok: false }); // Resposta não-ok

      const { req, res } = createMocks({ method: 'POST', body: { url: 'https://youtu.be/privado' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      expect(logger.error).toHaveBeenCalledWith('AdminCrudHandler', 'Erro no handler YouTube:', expect.any(Error));
      expect(JSON.parse(res._getData()).message).toContain('Não foi possível encontrar o vídeo');
    });
  });
});