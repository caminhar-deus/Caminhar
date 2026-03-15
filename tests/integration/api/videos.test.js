import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import jwt from 'jsonwebtoken';

// Mock das dependências externas antes de qualquer importação
jest.mock('../../../lib/db.js');
jest.mock('cookie', () => ({
  // Fornecemos funções de mock vazias que serão implementadas no beforeEach
  parse: jest.fn(),
  serialize: jest.fn(),
}));
jest.mock('jsonwebtoken');

import videosHandler from '../../../pages/api/admin/videos.js';
import { createVideo, updateVideo, deleteVideo } from '../../../lib/db.js';
import * as cookie from 'cookie';

describe('API de Vídeos (/api/admin/videos)', () => {
  beforeEach(() => {
    // Limpa todos os mocks antes de cada teste para garantir isolamento
    jest.clearAllMocks();

    // Restaura a implementação do mock de 'cookie' que é limpa pelo `resetMocks: true`.
    // Isso garante que o `lib/auth.js` real possa chamar `parse` e `serialize` sem erro.
    cookie.parse.mockImplementation((str = '') => {
      if (!str) return {};
      return str.split(';').filter(Boolean).reduce((acc, c) => {
        const [key, val] = c.trim().split('=');
        acc[key] = val;
        return acc;
      }, {});
    });
    cookie.serialize.mockImplementation((name, val) => `${name}=${val}`);

    // Configuração padrão de autenticação bem-sucedida para a maioria dos testes
    jwt.verify.mockReturnValue({ role: 'admin' });
  });

  it('deve retornar 401 Unauthorized se a autenticação falhar', async () => {
    // Sobrescreve o mock para simular falha na verificação do token
    jwt.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'Authorization': 'Bearer invalid-token',
      },
      body: { titulo: 'Vídeo Teste' },
    });

    await videosHandler(req, res);

    expect(res._getStatusCode()).toBe(401);
    expect(res._getJSONData().message).toContain('Token inválido');
  });

  describe('POST', () => {
    it('deve criar um novo vídeo com sucesso', async () => {
      const videoData = {
        titulo: 'Novo Vídeo',
        url_youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        descricao: 'Descrição do vídeo',
        publicado: true,
      };
      const mockVideoCriado = { id: 1, ...videoData };

      // Configura o mock do DB para retornar o vídeo criado
      createVideo.mockResolvedValue(mockVideoCriado);

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
        body: videoData,
      });

      await videosHandler(req, res);

      expect(res._getStatusCode()).toBe(201);
      expect(res._getJSONData()).toEqual(mockVideoCriado);
      expect(createVideo).toHaveBeenCalledWith(videoData);
    });

    it('deve retornar 400 se campos obrigatórios estiverem faltando', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
        body: { titulo: 'Vídeo sem URL' }, // url_youtube faltando
      });

      await videosHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(res._getJSONData().message).toContain('obrigatórios');
      expect(createVideo).not.toHaveBeenCalled();
    });

    it('deve retornar 400 para uma URL do YouTube inválida', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
        body: {
          titulo: 'URL Inválida',
          url_youtube: 'https://google.com',
        },
      });

      await videosHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(res._getJSONData().message).toBe('URL do YouTube inválida');
    });
  });

  describe('PUT', () => {
    it('deve atualizar um vídeo existente com sucesso', async () => {
      const videoUpdateData = {
        id: 1,
        titulo: 'Vídeo Atualizado',
        url_youtube: 'https://www.youtube.com/watch?v=updated1234',
        publicado: false,
      };
      updateVideo.mockResolvedValue(videoUpdateData);

      const { req, res } = createMocks({
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
        body: videoUpdateData,
      });

      await videosHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(res._getJSONData()).toEqual(videoUpdateData);
      expect(updateVideo).toHaveBeenCalledWith(videoUpdateData.id, expect.any(Object));
    });

    it('deve retornar 404 se o vídeo a ser atualizado não for encontrado', async () => {
      // Mock para simular que o vídeo não foi encontrado no DB
      updateVideo.mockResolvedValue(null);

      const { req, res } = createMocks({
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
        body: { id: 999, titulo: 'Inexistente', url_youtube: 'https://www.youtube.com/watch?v=fakeid12345' },
      });

      await videosHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
      expect(res._getJSONData().message).toBe('Vídeo não encontrado');
    });

    it('deve retornar 400 se o ID não for fornecido na atualização', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
        body: { titulo: 'Vídeo sem ID', url_youtube: 'https://youtube.com/no-id' },
      });

      await videosHandler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(res._getJSONData().message).toBe('ID é obrigatório');
    });
  });

  describe('DELETE', () => {
    it('deve excluir um vídeo com sucesso', async () => {
      // Mock para simular que o delete retornou o item deletado
      deleteVideo.mockResolvedValue({ id: 1 });

      const { req, res } = createMocks({
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
        body: { id: 1 },
      });

      await videosHandler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(res._getJSONData().message).toBe('Vídeo excluído com sucesso');
      expect(deleteVideo).toHaveBeenCalledWith(1);
    });

    it('deve retornar 404 se o vídeo a ser excluído não for encontrado', async () => {
      // Mock para simular que o vídeo não foi encontrado
      deleteVideo.mockResolvedValue(null);

      const { req, res } = createMocks({
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer valid-token',
        },
        body: { id: 999 },
      });

      await videosHandler(req, res);

      expect(res._getStatusCode()).toBe(404);
      expect(res._getJSONData().message).toBe('Vídeo não encontrado');
    });
  });
});