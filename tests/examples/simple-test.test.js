/**
 * Teste Simples - Demonstração da Arquitetura
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Factories
import { postFactory, createPostInput, resetPostIdCounter } from '../factories/post.js';
import { musicFactory, resetMusicIdCounter } from '../factories/music.js';
import { videoFactory, resetVideoIdCounter } from '../factories/video.js';
import { userFactory, adminFactory, resetUserIdCounter } from '../factories/user.js';

// Helpers
import {
  createApiMocks,
  createGetRequest,
  createPostRequest,
  expectStatus,
  expectJson,
  expectArray,
} from '../helpers/api.js';

import {
  createAuthToken,
  mockAuthenticatedUser,
  mockAuthenticatedAdmin,
} from '../helpers/auth.js';

// Mocks
import { mockQuery, mockFetchSuccess } from '../mocks/index.js';

describe('Test Suite Architecture - Demonstração', () => {
  beforeEach(() => {
    resetPostIdCounter();
    resetMusicIdCounter();
    resetVideoIdCounter();
    resetUserIdCounter();
    jest.clearAllMocks();
  });

  describe('Factories', () => {
    it('postFactory deve criar posts', () => {
      const post = postFactory();
      
      expect(post).toHaveProperty('id');
      expect(post).toHaveProperty('title');
      expect(post).toHaveProperty('slug');
      expect(post).toHaveProperty('content');
      expect(post).toHaveProperty('published');
      expect(post).toHaveProperty('created_at');
    });

    it('postFactory deve suportar overrides', () => {
      const post = postFactory({ title: 'Título Customizado' });
      
      expect(post.title).toBe('Título Customizado');
      expect(post.published).toBe(true); // default
    });

    it('postFactory.list deve criar múltiplos posts', () => {
      const posts = postFactory.list(5);
      
      expect(posts).toHaveLength(5);
      expect(posts[0].id).toBe(1);
      expect(posts[4].id).toBe(5);
    });

    it('createPostInput deve criar dados para criação', () => {
      const input = createPostInput({ title: 'Novo Post' });
      
      expect(input).toHaveProperty('title', 'Novo Post');
      expect(input).toHaveProperty('slug');
      expect(input).not.toHaveProperty('id');
      expect(input).not.toHaveProperty('created_at');
    });

    it('musicFactory deve criar músicas', () => {
      const music = musicFactory();
      
      expect(music).toHaveProperty('titulo');
      expect(music).toHaveProperty('artista');
      expect(music).toHaveProperty('url_spotify');
      expect(music.url_spotify).toMatch(/open\.spotify\.com/);
    });

    it('videoFactory deve criar vídeos', () => {
      const video = videoFactory();
      
      expect(video).toHaveProperty('titulo');
      expect(video).toHaveProperty('url_youtube');
      expect(video.url_youtube).toMatch(/youtube\.com/);
    });

    it('userFactory deve criar usuários', () => {
      const user = userFactory();
      
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('username');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('role');
    });

    it('adminFactory deve criar admins', () => {
      const admin = adminFactory();
      
      expect(admin.role).toBe('admin');
    });
  });

  describe('API Helpers', () => {
    it('createApiMocks deve criar req/res', () => {
      const { req, res } = createApiMocks({ method: 'GET' });
      
      expect(req.method).toBe('GET');
      expect(res._getStatusCode()).toBe(200);
    });

    it('createPostRequest deve criar POST', () => {
      const body = { title: 'Test' };
      const { req, res } = createPostRequest(body);
      
      expect(req.method).toBe('POST');
      expect(req.body).toEqual(body);
    });

    it('expectStatus deve verificar status', () => {
      const { res } = createGetRequest();
      res.statusCode = 201;
      
      expect(res).toHaveStatus(201);
    });

    it('expectJson deve verificar JSON', () => {
      const { res } = createGetRequest();
      res.statusCode = 200;
      res._getData = () => JSON.stringify({ id: 1, name: 'Test' });
      
      const data = expectJson(res);
      expect(data).toEqual({ id: 1, name: 'Test' });
    });
  });

  describe('Auth Helpers', () => {
    it('createAuthToken deve criar JWT', () => {
      const token = createAuthToken({ id: 1, username: 'test' });
      
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT tem 3 partes
    });

    it('mockAuthenticatedUser deve retornar dados completos', () => {
      const auth = mockAuthenticatedUser({ username: 'testuser' });
      
      expect(auth.user.username).toBe('testuser');
      expect(auth.token).toBeTruthy();
      expect(auth.headers.authorization).toMatch(/^Bearer /);
    });

    it('mockAuthenticatedAdmin deve criar admin', () => {
      const auth = mockAuthenticatedAdmin();
      
      expect(auth.user.role).toBe('admin');
    });
  });

  describe('Matchers Customizados', () => {
    it('toBeISODate deve verificar formato de data', () => {
      expect('2024-01-15T10:30:00Z').toBeISODate();
      expect('2024-01-15T10:30:00.000Z').toBeISODate();
    });

    it('toHaveHeader deve verificar headers', () => {
      const { res } = createGetRequest();
      res.setHeader('content-type', 'application/json');
      
      expect(res).toHaveHeader('content-type');
      expect(res).toHaveHeader('content-type', 'application/json');
    });
  });

  describe('Mocks', () => {
    it('mockQuery deve simular query do DB', async () => {
      const queryMock = mockQuery([{ id: 1, name: 'Test' }]);
      
      const result = await queryMock('SELECT * FROM test');
      
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe('Test');
      expect(queryMock).toHaveBeenCalled();
    });

    it('mockFetchSuccess deve simular fetch', async () => {
      global.fetch = mockFetchSuccess({ data: 'test' });
      
      const response = await fetch('/api/test');
      const data = await response.json();
      
      expect(data).toEqual({ data: 'test' });
      expect(response.ok).toBe(true);
    });
  });
});

// Teste integrado
describe('Teste Integrado - Fluxo Completo', () => {
  it('deve criar post e verificar resposta', async () => {
    // 1. Criar usuário admin
    const { headers } = mockAuthenticatedAdmin();
    
    // 2. Gerar dados do post
    const postData = createPostInput({
      title: 'Meu Post de Teste',
      published: true,
    });
    
    // 3. Criar request
    const { req, res } = createPostRequest(postData, headers);
    
    // 4. Simular handler
    res.statusCode = 201;
    res._getData = () => JSON.stringify({
      id: 1,
      ...postData,
      created_at: new Date().toISOString(),
    });
    
    // 5. Verificar resposta
    expect(res).toHaveStatus(201);
    
    const data = expectJson(res);
    expect(data.title).toBe('Meu Post de Teste');
    expect(data.published).toBe(true);
    expect(data.created_at).toBeISODate();
  });
});
