import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mocks declarados ANTES da importação do handler para garantir interceptação
jest.mock('../../../lib/auth', () => {
  const mockGetAuthToken = jest.fn();
  const mockVerifyToken = jest.fn();
  return {
    getAuthToken: mockGetAuthToken,
    verifyToken: mockVerifyToken,
    withAuth: jest.fn((handler) => async (req, res) => {
      const token = mockGetAuthToken(req);
      if (!token) return res.status(401).json({ message: 'Não autenticado' });
      const user = mockVerifyToken(token);
      if (!user || user.role !== 'admin') return res.status(403).json({ message: 'Acesso negado' });
      req.user = user;
      return handler(req, res);
    }),
  };
});

jest.mock('../../../lib/domain/settings.js', () => ({
  getSettings: jest.fn(),
  updateSetting: jest.fn(),
}));

// Importa o handler da API
import handler from '../../../pages/api/settings.js';

// Importa os mocks para controle das asserções e retornos simulados
import { getAuthToken, verifyToken } from '../../../lib/auth';
import { getSettings, updateSetting } from '../../../lib/domain/settings.js';

describe('API Administrativa de Configurações (/api/settings)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Configuração padrão de sucesso: Simula usuário 'admin' logado
    getAuthToken.mockReturnValue('fake-jwt-token');
    verifyToken.mockReturnValue({
      userId: 1,
      username: 'admin',
      role: 'admin'
    });
  });

  describe('GET - Buscar Configurações', () => {
    it('deve retornar 200 e os dados de configuração com sucesso', async () => {
      const mockSettings = { site_name: 'Projeto Caminhar', theme: 'light' };
      // Simula o retorno de configurações do domínio
      getSettings.mockResolvedValueOnce(mockSettings);

      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      
      const data = JSON.parse(res._getData());
      expect(data).toEqual(mockSettings);
    });

    it('deve retornar 200 (rota pública) mesmo se o usuário não estiver autenticado', async () => {
      getAuthToken.mockReturnValue(null); // Retira o token

      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);

      // Como a rota GET não usa withAuth, ela é pública e retorna 200
      expect(res._getStatusCode()).toBe(200); 
    });

    it('deve retornar 500 se houver erro ao buscar configurações', async () => {
      getSettings.mockRejectedValueOnce(new Error('Erro DB'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(500);
      consoleSpy.mockRestore();
    });
  });

  describe('POST/PUT - Atualizar Configurações', () => {
    it('deve atualizar as configurações com sucesso e retornar 200', async () => {
      const newSettings = { key: 'site_name', value: 'Caminhar Atualizado' };
      updateSetting.mockResolvedValueOnce(true); // Simula o update bem-sucedido no domínio

      const { req, res } = createMocks({
        method: 'PUT', // O handler da API explicitamente aguarda o método PUT
        body: newSettings
      });
      
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(updateSetting).toHaveBeenCalledWith('site_name', 'Caminhar Atualizado', undefined, undefined);
    });

    it('deve retornar 403 (Forbidden) se o usuário não tiver permissão de admin', async () => {
      // Simula um usuário comum autenticado, porém sem os privilégios corretos
      verifyToken.mockReturnValue({
        userId: 2,
        username: 'user_comum',
        role: 'editor' // Papel diferente de admin
      });

      const { req, res } = createMocks({
        method: 'PUT',
        body: { key: 'site_name', value: 'Nome Hackeado' }
      });
      
      await handler(req, res);

      expect(res._getStatusCode()).toBe(403);
      // Garante que a atualização não foi chamada
      expect(updateSetting).not.toHaveBeenCalled();
    });

    it('deve retornar 400 se os parâmetros forem inválidos', async () => {
      const { req, res } = createMocks({ method: 'PUT', body: {} }); // Corpo vazio
      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    it('deve retornar 500 se ocorrer um erro interno ao atualizar', async () => {
      updateSetting.mockRejectedValueOnce(new Error('Erro interno'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { req, res } = createMocks({ method: 'PUT', body: { key: 'site_name', value: 'Teste' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(500);
      consoleSpy.mockRestore();
    });
  });

  describe('Erros Gerais', () => {
    it('deve retornar 405 se o método for inválido (ex: DELETE)', async () => {
      const { req, res } = createMocks({ method: 'DELETE' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(405);
    });
  });
});