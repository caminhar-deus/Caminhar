import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

jest.mock('../../../../lib/db.js', () => ({
  query: jest.fn(),
}));

jest.mock('../../../../lib/domain/musicas.js', () => ({
  getPaginatedMusicas: jest.fn(),
  createMusica: jest.fn(),
  updateMusica: jest.fn(),
  deleteMusica: jest.fn(),
}));

jest.mock('../../../../lib/crud.js', () => ({
  updateRecords: jest.fn(),
}));

jest.mock('../../../../lib/domain/audit.js', () => ({
  logActivity: jest.fn(),
}));

jest.mock('../../../../lib/cache.js', () => ({
  invalidateCache: jest.fn(),
}));

jest.mock('../../../../lib/auth.js', () => ({
  withAuth: jest.fn((handler) => async (req, res) => {
    if (req.headers.authorization !== 'Bearer valid-token') {
      return res.status(401).json({ message: 'Não autenticado' });
    }
    req.user = req._userOverride !== undefined ? req._userOverride : { userId: 1, username: 'admin', role: 'admin' };
    return handler(req, res);
  }),
}));

import handler from '../../../../pages/api/admin/musicas.js';
import { getPaginatedMusicas, createMusica, updateMusica, deleteMusica } from '../../../../lib/domain/musicas.js';
import { updateRecords } from '../../../../lib/crud.js';
import { logActivity } from '../../../../lib/domain/audit.js';
import { invalidateCache } from '../../../../lib/cache.js';

describe('API Admin - Gestão de Músicas (/api/admin/musicas)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const getAuthenticatedMocks = (options = {}, userOverride) => {
    const { req, res } = createMocks({
      ...options,
      headers: { ...options.headers, authorization: 'Bearer valid-token' },
    });
    if (userOverride !== undefined) req._userOverride = userOverride;
    req.socket = { remoteAddress: '127.0.0.1' };
    return { req, res };
  };

  describe('Autenticação e Rota', () => {
    it('deve retornar 401 se o usuário não estiver autenticado', async () => {
      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(401);
    });

    it('deve retornar 405 para métodos HTTP não permitidos', async () => {
      const { req, res } = getAuthenticatedMocks({ method: 'PATCH' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(405);
    });
  });

  describe('GET - Listar Músicas', () => {
    it('deve retornar 200, definir o Cache-Control e listar as músicas', async () => {
      const mockResult = { musicas: [{ id: 1, titulo: 'Hino' }], pagination: { total: 1 } };
      getPaginatedMusicas.mockResolvedValueOnce(mockResult);

      const { req, res } = getAuthenticatedMocks({ method: 'GET', query: { page: '1', limit: '10' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(res.getHeader('Cache-Control')).toBe('no-store, max-age=0, must-revalidate');
      expect(JSON.parse(res._getData())).toEqual(mockResult);
    });

    it('deve retornar 500 em caso de erro na busca', async () => {
      getPaginatedMusicas.mockRejectedValueOnce(new Error('DB Error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { req, res } = getAuthenticatedMocks({ method: 'GET' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      consoleSpy.mockRestore();
    });
  });

  describe('POST - Criar Música', () => {
    const validPayload = { titulo: 'Hino', artista: 'Banda', url_spotify: 'spotify.com/track/123' };

    it('deve retornar 400 se campos obrigatórios estiverem ausentes', async () => {
      const { req, res } = getAuthenticatedMocks({ method: 'POST', body: { titulo: 'A' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    it('deve retornar 400 se a URL do Spotify for inválida', async () => {
      const { req, res } = getAuthenticatedMocks({ method: 'POST', body: { ...validPayload, url_spotify: 'google.com' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData()).message).toContain('URL do Spotify inválida');
    });

    it('deve criar a música, registrar no log, invalidar cache e retornar 201', async () => {
      const mockCreated = { id: 5, ...validPayload, publicado: true };
      createMusica.mockResolvedValueOnce(mockCreated);

      const { req, res } = getAuthenticatedMocks({ method: 'POST', body: { ...validPayload, publicado: true } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      expect(createMusica).toHaveBeenCalledWith(expect.objectContaining({ publicado: true }));
      expect(logActivity).toHaveBeenCalledWith('admin', 'CRIAR MÚSICA', 'MUSIC', 5, expect.any(String), '127.0.0.1');
      expect(invalidateCache).toHaveBeenCalledWith('musicas');
    });

    it('deve criar com publicado = false se não for enviado (fallback) e pular log se sem user', async () => {
      createMusica.mockResolvedValueOnce({ id: 6, ...validPayload, publicado: false });
      // Manda a requisição e anula req.user para cobrir a branch `if (user)`
      const { req, res } = getAuthenticatedMocks({ method: 'POST', body: validPayload }, null); 
      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      expect(createMusica).toHaveBeenCalledWith(expect.objectContaining({ publicado: false }));
      expect(logActivity).not.toHaveBeenCalled(); // Não chama logActivity pois `user` é null
    });

    it('deve retornar 500 se houver erro ao criar', async () => {
      createMusica.mockRejectedValueOnce(new Error('Erro DB'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { req, res } = getAuthenticatedMocks({ method: 'POST', body: validPayload });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(500);
      consoleSpy.mockRestore();
    });
  });

  describe('PUT - Atualizar Música', () => {
    const validPayload = { id: 1, titulo: 'Hino Editado', artista: 'Banda', url_spotify: 'spotify:track:123' };

    it('deve processar reordenação em massa e retornar 200', async () => {
      const { req, res } = getAuthenticatedMocks({ method: 'PUT', body: { action: 'reorder', items: [{ id: 1, position: 2 }] } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(updateRecords).toHaveBeenCalledWith('musicas', { position: 2 }, { id: 1 });
      expect(invalidateCache).toHaveBeenCalledWith('musicas');
    });

    it('deve retornar 400 se faltar ID', async () => {
      const { req, res } = getAuthenticatedMocks({ method: 'PUT', body: { titulo: 'A' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    it('deve retornar 400 se faltar campos obrigatórios', async () => {
      const { req, res } = getAuthenticatedMocks({ method: 'PUT', body: { id: 1, titulo: 'A' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    it('deve retornar 400 se URL do Spotify for inválida', async () => {
      const { req, res } = getAuthenticatedMocks({ method: 'PUT', body: { ...validPayload, url_spotify: 'youtube.com' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    it('deve retornar 404 se a música não for encontrada', async () => {
      updateMusica.mockResolvedValueOnce(null);
      const { req, res } = getAuthenticatedMocks({ method: 'PUT', body: validPayload });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(404);
    });

    it('deve atualizar, registrar log, invalidar cache e retornar 200', async () => {
      updateMusica.mockResolvedValueOnce({ ...validPayload });
      const { req, res } = getAuthenticatedMocks({ method: 'PUT', body: validPayload });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(logActivity).toHaveBeenCalled();
      expect(invalidateCache).toHaveBeenCalledWith('musicas');
    });

    it('deve retornar 500 se houver erro ao atualizar', async () => {
      updateMusica.mockRejectedValueOnce(new Error('Erro DB'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { req, res } = getAuthenticatedMocks({ method: 'PUT', body: validPayload });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(500);
      consoleSpy.mockRestore();
    });
  });

  describe('DELETE - Excluir Música', () => {
    it('deve retornar 400 se o ID não for fornecido', async () => {
      const { req, res } = getAuthenticatedMocks({ method: 'DELETE', body: {} });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    it('deve retornar 404 se a música não for encontrada', async () => {
      deleteMusica.mockResolvedValueOnce(null);
      const { req, res } = getAuthenticatedMocks({ method: 'DELETE', body: { id: 99 } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(404);
    });

    it('deve excluir, registrar log e retornar 200', async () => {
      deleteMusica.mockResolvedValueOnce({ id: 1, titulo: 'Hino Apagado' });
      const { req, res } = getAuthenticatedMocks({ method: 'DELETE', body: { id: 1 } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(deleteMusica).toHaveBeenCalledWith(1, { returning: ['id', 'titulo'] });
      expect(logActivity).toHaveBeenCalledWith('admin', 'EXCLUIR MÚSICA', 'MUSIC', 1, expect.stringContaining('Hino Apagado'), '127.0.0.1');
      expect(invalidateCache).toHaveBeenCalledWith('musicas');
    });

    it('deve utilizar o ID no log se o título não vier no retorno (fallback)', async () => {
      deleteMusica.mockResolvedValueOnce({ id: 1 }); // sem titulo
      const { req, res } = getAuthenticatedMocks({ method: 'DELETE', body: { id: 1 } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(logActivity).toHaveBeenCalledWith('admin', 'EXCLUIR MÚSICA', 'MUSIC', 1, expect.stringContaining('Removeu a música: 1'), '127.0.0.1');
    });

    it('deve retornar 500 se houver erro ao excluir', async () => {
      deleteMusica.mockRejectedValueOnce(new Error('Erro DB'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { req, res } = getAuthenticatedMocks({ method: 'DELETE', body: { id: 1 } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(500);
      consoleSpy.mockRestore();
    });
  });
});