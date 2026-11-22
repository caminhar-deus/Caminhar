import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mocks declarados ANTES da importação do handler para garantir interceptação
jest.mock('../../../lib/infra/db.js', () => require('../../mocks/db-module').mockDb());

jest.mock('../../../lib/domain/audit.js', () => ({
  logActivity: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../../lib/auth/auth', () => {
  const mockGetAuthToken = jest.fn();
  const mockVerifyToken = jest.fn();
  return {
    getAuthToken: mockGetAuthToken,
    verifyToken: mockVerifyToken,
    withAuth: jest.fn((handler) => async (req, res) => {
      const token = mockGetAuthToken(req);
      if (!token) return res.status(401).json({ message: 'Não autenticado' });
      const user = mockVerifyToken(token);
      if (!user) return res.status(401).json({ message: 'Token inválido' });
      req.user = user;
      return handler(req, res);
    }),
  };
});

jest.mock('../../../lib/domain/settings.js', () => ({
  getSettings: jest.fn(),
  getSetting: jest.fn(),
  getAllSettingsRaw: jest.fn(),
  updateSetting: jest.fn(),
}));

// Importa o handler da API
import handler from '../../../pages/api/settings.js';

// Importa os mocks para controle das asserções e retornos simulados
import { query } from '../../../lib/infra/db.js';
import { logActivity } from '../../../lib/domain/audit.js';
import { getAuthToken, verifyToken } from '../../../lib/auth/auth';
import { getSettings, updateSetting } from '../../../lib/domain/settings.js';
import { clearAppMemoryCache } from '../../../lib/cache/cache.js';

describe('API Administrativa de Configurações (/api/settings)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearAppMemoryCache();

    // Configuração padrão de RBAC no banco simulado
    query.mockImplementation(async (sql, params) => {
      if (sql.includes('SELECT permissions FROM roles')) {
        const roleName = params?.[0];
        if (roleName === 'admin' || roleName === 'designer') {
          return { rows: [{ permissions: ['Configuração de Cabeçalho'] }] };
        }
        return { rows: [{ permissions: ['Dashboard'] }] };
      }
      return { rows: [], rowCount: 0 };
    });

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

    it('deve retornar 403 (Forbidden) no PUT se o usuário não tiver permissão Configuração de Cabeçalho', async () => {
      verifyToken.mockReturnValue({
        userId: 2,
        username: 'user_comum',
        role: 'editor' // Papel sem Configuração de Cabeçalho no mock de roles
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

    it('deve retornar 403 (Forbidden) no POST se o usuário não tiver permissão Configuração de Cabeçalho', async () => {
      verifyToken.mockReturnValue({
        userId: 2,
        username: 'user_comum',
        role: 'editor'
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: { key: 'site_title', value: 'Novo Título' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(403);
      expect(updateSetting).not.toHaveBeenCalled();
    });

    it('deve permitir PUT e registrar auditoria quando papel não-admin possui Configuração de Cabeçalho', async () => {
      verifyToken.mockReturnValue({
        userId: 3,
        username: 'designer_user',
        role: 'designer'
      });
      updateSetting.mockResolvedValueOnce('Novo Título');

      const { req, res } = createMocks({
        method: 'PUT',
        body: { key: 'site_title', value: 'Novo Título' },
        socket: { remoteAddress: '203.0.113.10' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(updateSetting).toHaveBeenCalledWith('site_title', 'Novo Título', undefined, undefined);
      expect(logActivity).toHaveBeenCalledWith(
        'designer_user',
        'ATUALIZAR CONFIGURAÇÃO',
        'SETTINGS',
        null,
        'Configuração atualizada: site_title',
        '203.0.113.10'
      );
    });

    it('deve retornar 429 quando exceder o rate limit em mutação PUT', async () => {
      updateSetting.mockResolvedValue('ok');
      const clientIp = '203.0.113.77';

      for (let i = 0; i < 30; i++) {
        const { req, res } = createMocks({
          method: 'PUT',
          body: { key: 'site_name', value: `Valor ${i}` },
          socket: { remoteAddress: clientIp },
        });
        await handler(req, res);
        expect(res._getStatusCode()).toBe(200);
      }

      const { req, res } = createMocks({
        method: 'PUT',
        body: { key: 'site_name', value: 'Excedido' },
        socket: { remoteAddress: clientIp },
      });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(429);
    });

    it('deve retornar 429 no GET público quando exceder o rate limit em cache miss', async () => {
      getSettings.mockResolvedValue({ site_title: 'Caminhar' });
      const clientIp = '203.0.113.88';

      for (let i = 0; i < 600; i++) {
        clearAppMemoryCache();
        const { req, res } = createMocks({
          method: 'GET',
          socket: { remoteAddress: clientIp },
        });
        await handler(req, res);
        expect(res._getStatusCode()).toBe(200);
      }

      clearAppMemoryCache();
      const { req, res } = createMocks({
        method: 'GET',
        socket: { remoteAddress: clientIp },
      });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(429);
    });

    it('deve retornar 400 se os parâmetros forem inválidos', async () => {
      const { req, res } = createMocks({ method: 'PUT', body: {} }); // Corpo vazio
      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    it('deve retornar 400 se site_title for salvo vazio (cabeçalho não pode ficar sem título)', async () => {
      const { req, res } = createMocks({ method: 'PUT', body: { key: 'site_title', value: '   ' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData()).errors).toHaveProperty('value');
      expect(updateSetting).not.toHaveBeenCalled();
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