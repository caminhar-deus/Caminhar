import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// 1. Mocks
jest.mock('../../../../lib/cache.js', () => ({
  getOrSetCache: jest.fn(),
  invalidateCache: jest.fn(),
}));

jest.mock('../../../../lib/db.js', () => ({
  getSetting: jest.fn(),
  setSetting: jest.fn(),
  getAllSettings: jest.fn(),
}));

jest.mock('../../../../lib/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn(),
}));

// 2. Importações
import handler from '../../../../pages/api/v1/settings.js';
import { getOrSetCache, invalidateCache } from '../../../../lib/cache.js';
import * as db from '../../../../lib/db.js';
import { getAuthToken, verifyToken } from '../../../../lib/auth.js';

describe('API V1 - Configurações (/api/v1/settings)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Implementação padrão para o wrapper de cache
    getOrSetCache.mockImplementation(async (key, fetchFunction) => await fetchFunction());
    
    // Simula um usuário 'admin' logado por padrão
    getAuthToken.mockReturnValue('fake-token');
    verifyToken.mockReturnValue({ userId: 1, role: 'admin' });
  });

  describe('Autenticação e Autorização Geral', () => {
    it('deve retornar 401 se o token não for enviado', async () => {
      getAuthToken.mockReturnValue(null);
      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(401);
    });

    it('deve retornar 401 se o token for inválido', async () => {
      verifyToken.mockReturnValue(null);
      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(401);
    });
  });

  describe('GET - Buscar Configurações', () => {
    it('deve retornar 403 se o usuário não for admin ou editor', async () => {
      verifyToken.mockReturnValue({ userId: 1, role: 'user' });
      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(403);
    });

    it('deve retornar 200 e uma configuração específica quando "key" for solicitada', async () => {
      db.getSetting.mockResolvedValueOnce('dark');
      const { req, res } = createMocks({ method: 'GET', query: { key: 'theme' } });
      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data).toEqual({ key: 'theme', value: 'dark' });
    });

    it('deve retornar 404 se a configuração específica não for encontrada', async () => {
      db.getSetting.mockResolvedValueOnce(null); // Simula o fallback de quando a key não existe
      const { req, res } = createMocks({ method: 'GET', query: { key: 'not_exists' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(404);
    });

    it('deve retornar 200 e a lista completa de configurações quando "key" for omitida', async () => {
      const mockAllSettings = [{ key: 'theme', value: 'dark' }];
      db.getAllSettings.mockResolvedValueOnce(mockAllSettings);
      
      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.data).toEqual(mockAllSettings);
    });
  });

  describe('POST/PUT - Manipular Configuração', () => {
    it('deve retornar 403 se não for admin em operações de escrita (editor não pode gravar)', async () => {
      verifyToken.mockReturnValue({ userId: 1, role: 'editor' });
      const { req, res } = createMocks({ method: 'POST' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(403);
    });

    it('deve retornar 403 se não for admin em operações de atualização (PUT)', async () => {
      verifyToken.mockReturnValue({ userId: 1, role: 'editor' });
      const { req, res } = createMocks({ method: 'PUT' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(403);
    });

    it('deve retornar 400 se key ou value estiverem ausentes no body (PUT)', async () => {
      const { req, res } = createMocks({ method: 'PUT', body: { value: 'dark' } }); // key ausente
      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    it('deve retornar 400 se key ou value estiverem ausentes no body (POST)', async () => {
      const { req, res } = createMocks({ method: 'POST', body: { key: 'theme' } }); // value ausente
      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    it('deve processar a criação (POST), invalidar ambos os caches e retornar 201', async () => {
      db.setSetting.mockResolvedValueOnce('dark');
      
      const { req, res } = createMocks({ 
        method: 'POST', 
        body: { key: 'theme', value: 'dark', type: 'string', description: 'Tema do Sistema' } 
      });
      
      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(201);
      expect(db.setSetting).toHaveBeenCalledWith('theme', 'dark', 'string', 'Tema do Sistema');
      
      // Validações essenciais do controle de cache: "Todos" e "Chave especifica" invalidados
      expect(invalidateCache).toHaveBeenCalledWith('settings:v1:all');
      expect(invalidateCache).toHaveBeenCalledWith('settings:v1:theme');
    });

    it('deve processar a atualização (PUT), invalidar ambos os caches e retornar 200', async () => {
      db.setSetting.mockResolvedValueOnce('light');
      
      const { req, res } = createMocks({ 
        method: 'PUT', 
        body: { key: 'theme', value: 'light', type: 'string', description: 'Tema Atualizado' } 
      });
      
      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(200);
      expect(db.setSetting).toHaveBeenCalledWith('theme', 'light', 'string', 'Tema Atualizado');
      
      // Validações de invalidação de cache para o PUT
      expect(invalidateCache).toHaveBeenCalledWith('settings:v1:all');
      expect(invalidateCache).toHaveBeenCalledWith('settings:v1:theme');
    });
  });

  describe('Erros de Status Code HTTP', () => {
    it('deve retornar 405 (Method Not Allowed) para métodos não implementados (ex: DELETE)', async () => {
      const { req, res } = createMocks({ method: 'DELETE' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(405);
    });

    it('deve retornar 500 caso ocorra erro interno no servidor (ex: banco offline)', async () => {
      db.getAllSettings.mockRejectedValueOnce(new Error('Falha no banco'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      
      expect(res._getStatusCode()).toBe(500);
      consoleSpy.mockRestore();
    });
  });
});