import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// 1. Mocks declarados ANTES da importação
jest.mock('../../../../lib/cache', () => ({
  getOrSetCache: jest.fn(),
  invalidateCache: jest.fn(),
}));

jest.mock('../../../../lib/db', () => ({
  query: jest.fn(),
  createPost: jest.fn(),
}));

jest.mock('../../../../lib/auth', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn(),
}));

// 2. Importa o handler e as dependências para controle
import handler from '../../../../pages/api/v1/posts.js';
import { getOrSetCache, invalidateCache } from '../../../../lib/cache';
import * as db from '../../../../lib/db';
import { getAuthToken, verifyToken } from '../../../../lib/auth';

describe('API V1 - Posts Públicos (/api/v1/posts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reestabelece a execução real do callback de cache
    getOrSetCache.mockImplementation(async (key, fetchFunction) => await fetchFunction());
  });

  describe('GET - Listar Posts', () => {
    it('deve retornar 200 e a lista de posts publicados do banco/cache', async () => {
      const mockPosts = [{ id: 1, title: 'Post V1', slug: 'post-v1' }];
      db.query.mockResolvedValueOnce({ rows: mockPosts });

      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockPosts);
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('WHERE published = true'));
      expect(getOrSetCache).toHaveBeenCalledWith('posts:public:all', expect.any(Function), 3600);
    });

    it('deve retornar 500 caso ocorra algum erro na busca', async () => {
      getOrSetCache.mockRejectedValueOnce(new Error('Simulação de falha no DB'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      expect(JSON.parse(res._getData()).error).toBe('Internal Server Error');
      
      consoleSpy.mockRestore();
    });
  });

  describe('POST - Criar Post (Protegido)', () => {
    const validPayload = { title: 'Novo Título', slug: 'novo-titulo', content: 'Conteúdo V1' };

    beforeEach(() => {
      // Simula usuário logado por padrão para os testes de sucesso
      getAuthToken.mockReturnValue('fake-token');
      verifyToken.mockReturnValue({ userId: 1, role: 'admin' });
    });

    it('deve criar o post, invalidar o cache e retornar 201 com dados válidos', async () => {
      db.createPost.mockResolvedValueOnce({ id: 10, ...validPayload });

      const { req, res } = createMocks({ method: 'POST', body: validPayload });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      
      expect(data.success).toBe(true);
      expect(db.createPost).toHaveBeenCalledWith(validPayload);
      expect(invalidateCache).toHaveBeenCalledWith('posts:public:all');
    });

    it('deve retornar 400 se os dados não passarem na validação do Zod', async () => {
      // Faltando o campo "content" obrigatório
      const { req, res } = createMocks({ method: 'POST', body: { title: 'A', slug: 'a' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.message).toBe('Dados inválidos para criação de post');
      expect(data.errors).toHaveProperty('content'); // Zod deve apontar erro em content
    });

    it('deve retornar 401 se o token não for enviado', async () => {
      getAuthToken.mockReturnValue(null);
      const { req, res } = createMocks({ method: 'POST', body: validPayload });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(401);
    });

    it('deve retornar 401 se o token for enviado, mas for inválido ou expirado', async () => {
      getAuthToken.mockReturnValue('fake-token');
      verifyToken.mockReturnValue(null); // Simula que a decodificação do JWT falhou
      const { req, res } = createMocks({ method: 'POST', body: validPayload });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(401);
      expect(JSON.parse(res._getData()).message).toBe('Token inválido');
    });

    it('deve retornar 500 se ocorrer um erro ao criar o post', async () => {
      db.createPost.mockRejectedValueOnce(new Error('Erro interno'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { req, res } = createMocks({ method: 'POST', body: validPayload });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(500);
      consoleSpy.mockRestore();
    });
  });

  describe('Outros Métodos HTTP', () => {
    it('deve retornar 405 (Method Not Allowed) para PUT, DELETE, etc.', async () => {
      const { req, res } = createMocks({ method: 'PUT' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(405);
    });
  });
});