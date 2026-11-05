import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import postsHandler from '../../../../../pages/api/admin/posts.js';
import dicasHandler from '../../../../../pages/api/admin/dicas.js';
import musicasHandler from '../../../../../pages/api/admin/musicas.js';
import videosHandler from '../../../../../pages/api/admin/videos.js';
import * as db from '../../../../../lib/infra/db.js';
import * as cacheModule from '../../../../../lib/cache/cache.js';
import * as posts from '../../../../../lib/domain/posts.js';
import * as musicas from '../../../../../lib/domain/musicas.js';
import * as videos from '../../../../../lib/domain/videos.js';

jest.mock('../../../../../lib/auth/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn(),
  withAuth: jest.fn((handler) => handler)
}));

jest.mock('../../../../../lib/infra/db.js', () => require('../../../../mocks/db-module').mockDb());

jest.mock('../../../../../lib/cache/cache.js', () => ({
  checkRateLimit: jest.fn(),
  invalidateCache: jest.fn()
}));

jest.mock('../../../../../lib/domain/posts.js', () => ({
  getPaginatedPosts: jest.fn(),
  createPost: jest.fn(),
  updatePost: jest.fn(),
  deletePost: jest.fn()
}));

jest.mock('../../../../../lib/domain/dicas.js', () => ({
  getPaginatedDicas: jest.fn(),
  createDica: jest.fn(),
  updateDica: jest.fn(),
  deleteDica: jest.fn()
}));

jest.mock('../../../../../lib/domain/musicas.js', () => ({
  getPaginatedMusicas: jest.fn(),
  createMusica: jest.fn(),
  updateMusica: jest.fn(),
  deleteMusica: jest.fn()
}));

jest.mock('../../../../../lib/domain/videos.js', () => ({
  getPaginatedVideos: jest.fn(),
  createVideo: jest.fn(),
  updateVideo: jest.fn(),
  deleteVideo: jest.fn(),
  reorderVideos: jest.fn()
}));

jest.mock('../../../../../lib/crud/crud.js', () => ({
  updateRecords: jest.fn()
}));

jest.mock('../../../../../lib/domain/audit.js', () => ({
  logActivity: jest.fn()
}));

describe('API - Admin - Null Tolerance & Schema Resilience', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    cacheModule.checkRateLimit.mockResolvedValue(false);
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
    jest.clearAllMocks();
  });

  const setupAdminReq = (method, body = {}) => {
    const { req, res } = createMocks({
      method,
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
      body,
      query: {}
    });
    req.user = { role: 'admin', username: 'admin' };
    return { req, res };
  };

  describe('Posts Admin Handler', () => {
    it('deve retornar 400 com payload vazio ou nulo sem lançar exceção 500', async () => {
      const { req, res } = setupAdminReq('POST', {});
      await postsHandler(req, res);
      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.errors).toBeDefined();
    });

    it('deve retornar 400 quando campos obrigatórios forem explicitamente null', async () => {
      const { req, res } = setupAdminReq('POST', { title: null, slug: null });
      await postsHandler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    it('deve aceitar campos opcionais como null sem rejeitar a criação', async () => {
      posts.createPost.mockResolvedValueOnce({ id: 1, title: 'Post Teste' });
      const { req, res } = setupAdminReq('POST', {
        title: 'Post Teste',
        slug: 'post-teste',
        excerpt: null,
        content: null,
        image_url: null,
        published: false
      });
      await postsHandler(req, res);
      expect(res._getStatusCode()).toBe(201);
      expect(posts.createPost).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Post Teste',
        slug: 'post-teste',
        excerpt: null,
        content: null,
        image_url: null
      }));
    });
  });

  describe('Dicas Admin Handler', () => {
    it('deve retornar 400 com campos obrigatórios vazios ou nulos', async () => {
      const { req, res } = setupAdminReq('POST', { name: '', content: null });
      await dicasHandler(req, res);
      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.errors).toBeDefined();
    });

    it('deve processar criação com sucesso quando dados válidos forem fornecidos', async () => {
      // 1ª query: RBAC check no createAdminHandler
      db.query.mockResolvedValueOnce({ rows: [{ permissions: ['Gestão de Dicas'] }] });
      // 2ª query: INSERT da dica
      db.query.mockResolvedValueOnce({ rows: [{ id: 10, name: 'Dica do Dia', content: 'Oração e Fé' }] });
      const { req, res } = setupAdminReq('POST', {
        name: 'Dica do Dia',
        content: 'Oração e Fé',
        published: true
      });
      await dicasHandler(req, res);
      expect(res._getStatusCode()).toBe(201);
    });
  });

  describe('Músicas Admin Handler', () => {
    it('deve retornar 400 quando campos obrigatórios forem null ou vazios', async () => {
      const { req, res } = setupAdminReq('POST', { titulo: null, artista: '', url_spotify: null });
      await musicasHandler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    it('deve tolerar descricao como null quando campos obrigatórios forem válidos', async () => {
      musicas.createMusica.mockResolvedValueOnce({ id: 2, titulo: 'Música 1' });
      const { req, res } = setupAdminReq('POST', {
        titulo: 'Música 1',
        artista: 'Artista 1',
        url_spotify: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
        descricao: null,
        published: true
      });
      await musicasHandler(req, res);
      expect(res._getStatusCode()).toBe(201);
    });
  });

  describe('Vídeos Admin Handler', () => {
    it('deve retornar 400 quando campos obrigatórios de vídeo forem null', async () => {
      const { req, res } = setupAdminReq('POST', { titulo: null, url_youtube: null });
      await videosHandler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    it('deve tolerar thumbnail e descricao como null', async () => {
      videos.createVideo.mockResolvedValueOnce({ id: 3, titulo: 'Vídeo 1' });
      const { req, res } = setupAdminReq('POST', {
        titulo: 'Vídeo 1',
        url_youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        descricao: null,
        thumbnail: null,
        published: true
      });
      await videosHandler(req, res);
      expect(res._getStatusCode()).toBe(201);
    });
  });
});
