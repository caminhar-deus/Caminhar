import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// 1. Mocks do Banco de Dados
jest.mock('../../../../../lib/db.js', () => ({
  updateVideo: jest.fn(),
  deleteVideo: jest.fn(),
}));

// 2. Mocks do Cache
jest.mock('../../../../../lib/cache.js', () => ({
  invalidateCache: jest.fn(),
}));

// 3. Mocks da Autenticação
jest.mock('../../../../../lib/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn(),
}));

import handler from '../../../../../pages/api/v1/videos/[id].js';
import { updateVideo, deleteVideo } from '../../../../../lib/db.js';
import { invalidateCache } from '../../../../../lib/cache.js';
import { getAuthToken, verifyToken } from '../../../../../lib/auth.js';

describe('API V1 - Gerenciamento de Vídeo Específico (/api/v1/videos/[id])', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Simula autenticação para evitar erros ao ler headers/cookies na lib/auth.js real
    getAuthToken.mockReturnValue('fake-token');
    verifyToken.mockReturnValue({ userId: 1, role: 'admin' });
  });

  describe('Autenticação e Validação', () => {
    it('deve retornar 401 se o token não for enviado', async () => {
      getAuthToken.mockReturnValue(null);
      const { req, res } = createMocks({ method: 'PUT', query: { id: '1' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(401);
    });

    it('deve retornar 401 se o token for inválido', async () => {
      verifyToken.mockReturnValue(null);
      const { req, res } = createMocks({ method: 'DELETE', query: { id: '1' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(401);
    });

    it('deve retornar 400 se o ID estiver ausente ou for inválido (não numérico)', async () => {
      const { req, res } = createMocks({ method: 'PUT', query: { id: 'abc' } }); // req.query.id inválido
      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    it('deve retornar 405 se o método não for PUT ou DELETE', async () => {
      const { req, res } = createMocks({ method: 'GET', query: { id: '1' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(405);
    });
  });

  describe('PUT - Atualizar Vídeo', () => {
    const bodyData = { titulo: 'Vídeo Editado', url_youtube: 'https://youtu.be/123' };

    it('deve retornar 404 se o vídeo a ser atualizado não existir', async () => {
      updateVideo.mockResolvedValueOnce(null); // DB não encontrou
      const { req, res } = createMocks({ method: 'PUT', query: { id: '99' }, body: bodyData });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(404);
    });

    it('deve processar os dados, preencher fallbacks, atualizar o banco e invalidar o cache', async () => {
      const mockUpdated = { id: 1, ...bodyData, descricao: null, publicado: false };
      updateVideo.mockResolvedValueOnce(mockUpdated);

      const { req, res } = createMocks({ method: 'PUT', query: { id: '1' }, body: bodyData });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      // Garante que "descricao" e "publicado" assumiram o fallback definido na sua API
      expect(updateVideo).toHaveBeenCalledWith(1, { ...bodyData, descricao: null, publicado: false });
      expect(invalidateCache).toHaveBeenCalledWith('videos:public:*');
    });

    it('deve retornar 500 caso ocorra um erro inesperado ao atualizar', async () => {
      updateVideo.mockRejectedValueOnce(new Error('Erro interno no DB'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const { req, res } = createMocks({ method: 'PUT', query: { id: '1' }, body: bodyData });
      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(500);
      
      consoleSpy.mockRestore();
    });
  });

  describe('DELETE - Excluir Vídeo', () => {
    it('deve retornar 404 se o vídeo a ser deletado não existir', async () => {
      deleteVideo.mockResolvedValueOnce(null);
      const { req, res } = createMocks({ method: 'DELETE', query: { id: '99' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(404);
    });

    it('deve retornar 200, excluir do banco e invalidar o cache', async () => {
      deleteVideo.mockResolvedValueOnce({ id: 1 });

      const { req, res } = createMocks({ method: 'DELETE', query: { id: '1' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(deleteVideo).toHaveBeenCalledWith(1);
      expect(invalidateCache).toHaveBeenCalledWith('videos:public:*');
    });

    it('deve retornar 500 caso ocorra um erro inesperado ao deletar', async () => {
      deleteVideo.mockRejectedValueOnce(new Error('Erro interno no DB'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const { req, res } = createMocks({ method: 'DELETE', query: { id: '1' } });
      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(500);
      
      consoleSpy.mockRestore();
    });
  });
});