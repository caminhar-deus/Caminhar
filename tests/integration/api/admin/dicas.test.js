import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mocks para DB
jest.mock('../../../../lib/db.js', () => ({
  query: jest.fn(),
  logActivity: jest.fn(),
}));

// Mocks para Auth (interceptando o middleware withAuth)
jest.mock('../../../../lib/auth.js', () => ({
  withAuth: jest.fn((handler) => async (req, res) => {
    // Simula a injeção do usuário logado na requisição, validando via Header para testarmos os fluxos 401 e de Sucesso
    if (req.headers.authorization !== 'Bearer valid-token') {
      return res.status(401).json({ message: 'Não autenticado' });
    }
    req.user = { userId: 1, username: 'admin_user', role: 'admin' };
    return handler(req, res);
  }),
}));

import handler from '../../../../pages/api/admin/dicas.js';
import { query, logActivity } from '../../../../lib/db.js';

describe('API Admin - Dicas (/api/admin/dicas)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Função utilitária para gerar os mocks HTTP já autenticados
  const getAuthenticatedMocks = (options = {}) => {
    const { req, res } = createMocks({
      ...options,
      headers: {
        ...options.headers,
        authorization: 'Bearer valid-token',
      },
    });
    // Define um socket falso para o IP do Log de Auditoria não explodir
    req.socket = { remoteAddress: '127.0.0.1' };
    return { req, res };
  };

  describe('Autenticação e Proteção da Rota', () => {
    it('deve retornar 401 se o usuário não estiver autenticado (sem o token correto)', async () => {
      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(401);
    });
  });

  describe('GET - Listar Dicas', () => {
    it('deve retornar 200 e a lista de dicas', async () => {
      const mockDicas = [{ id: 1, name: 'Dica 1', content: 'Conteúdo 1' }];
      query.mockResolvedValueOnce({ rows: mockDicas });

      const { req, res } = getAuthenticatedMocks({ method: 'GET' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(JSON.parse(res._getData())).toEqual({ data: mockDicas });
      expect(query).toHaveBeenCalledWith('SELECT * FROM dicas ORDER BY id ASC');
    });

    it('deve retornar 500 se ocorrer um erro no banco de dados', async () => {
      query.mockRejectedValueOnce(new Error('Erro no DB'));

      const { req, res } = getAuthenticatedMocks({ method: 'GET' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
    });
  });

  describe('POST - Criar Dica', () => {
    const body = { name: 'Nova Dica', content: 'Texto da dica' }; // 'published' ausente (testando fallback = true)

    it('deve retornar 201, criar a dica com o fallback published=true e registrar log', async () => {
      const mockResult = { id: 10, ...body, published: true };
      query.mockResolvedValueOnce({ rows: [mockResult] });

      const { req, res } = getAuthenticatedMocks({ method: 'POST', body });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      expect(JSON.parse(res._getData())).toEqual(mockResult);
      
      // Garante que o array de parametros sanou o 'published' recebendo TRUE no terceiro lugar
      expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO dicas'), ['Nova Dica', 'Texto da dica', true]);
      expect(logActivity).toHaveBeenCalledWith('admin_user', 'CRIAR DICA', 'POST', 10, 'Criou a dica: Nova Dica', '127.0.0.1');
    });

    it('deve retornar 500 se ocorrer um erro ao criar', async () => {
      query.mockRejectedValueOnce(new Error('Erro DB'));
      const { req, res } = getAuthenticatedMocks({ method: 'POST', body });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(500);
    });
  });

  describe('PUT - Atualizar Dica', () => {
    const body = { id: 10, name: 'Dica Editada', content: 'Texto', published: false };

    it('deve retornar 200, atualizar a dica e registrar log', async () => {
      query.mockResolvedValueOnce({ rows: [body] });

      const { req, res } = getAuthenticatedMocks({ method: 'PUT', body });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE dicas'), ['Dica Editada', 'Texto', false, 10]);
      expect(logActivity).toHaveBeenCalledWith('admin_user', 'ATUALIZAR DICA', 'PUT', 10, 'Atualizou a dica: Dica Editada', '127.0.0.1');
    });

    it('deve retornar 500 se ocorrer um erro no banco de dados ao atualizar', async () => {
      query.mockRejectedValueOnce(new Error('Erro DB'));
      const { req, res } = getAuthenticatedMocks({ method: 'PUT', body });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(500);
    });
  });

  describe('DELETE - Excluir Dica', () => {
    const body = { id: 10 };

    it('deve retornar 200, excluir a dica e registrar log pegando o nome da dica original', async () => {
      query.mockResolvedValueOnce({ rows: [{ name: 'Dica Para Excluir' }] }); // Consulta prévia do nome
      query.mockResolvedValueOnce({ rowCount: 1 }); // A deleção em si

      const { req, res } = getAuthenticatedMocks({ method: 'DELETE', body });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('DELETE'), [10]);
      expect(logActivity).toHaveBeenCalledWith('admin_user', 'EXCLUIR DICA', 'DELETE', 10, 'Removeu a dica: Dica Para Excluir', '127.0.0.1');
    });

    it('deve excluir e registrar log mesmo se a dica não for encontrada no SELECT prévio (fallback pro ID no Log)', async () => {
      query.mockResolvedValueOnce({ rows: [] }); // Dica já não existe, o fallback do nome vai ser o '10'
      query.mockResolvedValueOnce({ rowCount: 1 });

      const { req, res } = getAuthenticatedMocks({ method: 'DELETE', body });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(logActivity).toHaveBeenCalledWith('admin_user', 'EXCLUIR DICA', 'DELETE', 10, 'Removeu a dica: 10', '127.0.0.1');
    });

    it('deve retornar 500 se ocorrer um erro no banco de dados ao excluir', async () => {
      query.mockRejectedValueOnce(new Error('Erro DB'));
      const { req, res } = getAuthenticatedMocks({ method: 'DELETE', body });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(500);
    });
  });

  describe('Tratamento de Erros e Rotas', () => {
    it('deve retornar 405 para métodos HTTP não permitidos', async () => {
      const { req, res } = getAuthenticatedMocks({ method: 'PATCH' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(405);
    });
  });
});