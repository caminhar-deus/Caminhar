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
import { getSettings, getSetting, getAllSettingsRaw, updateSetting } from '../../../lib/domain/settings.js';
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

    it('deve retornar formato v1 em GET ?response=v1 sem key', async () => {
      const rawSettings = [{ key: 'site_title', value: 'O Caminhar com Deus' }];
      getAllSettingsRaw.mockResolvedValueOnce(rawSettings);

      const { req, res } = createMocks({ method: 'GET', query: { response: 'v1' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data).toEqual(rawSettings);
      expect(data.count).toBe(1);
      expect(typeof data.timestamp).toBe('string');
    });

    it('deve retornar 401 no GET ?key= quando sem token ou token inválido', async () => {
      getAuthToken.mockReturnValueOnce(null);
      const { req: req1, res: res1 } = createMocks({ method: 'GET', query: { key: 'site_title' } });
      await handler(req1, res1);
      expect(res1._getStatusCode()).toBe(401);

      getAuthToken.mockReturnValueOnce('bad-token');
      verifyToken.mockReturnValueOnce(null);
      const { req: req2, res: res2 } = createMocks({ method: 'GET', query: { key: 'site_title' } });
      await handler(req2, res2);
      expect(res2._getStatusCode()).toBe(401);
    });

    it('deve retornar 403 no GET ?key= quando cargo não for admin/editor nem possuir Configuração de Cabeçalho', async () => {
      verifyToken.mockReturnValueOnce({ userId: 2, username: 'viewer', role: 'viewer' });

      const { req, res } = createMocks({ method: 'GET', query: { key: 'site_title' } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(403);
      expect(getSetting).not.toHaveBeenCalled();
    });

    it('deve permitir GET ?key= para cargo com permissão Configuração de Cabeçalho e retornar 200 (v1)', async () => {
      verifyToken.mockReturnValueOnce({ userId: 3, username: 'designer', role: 'designer' });
      getSetting.mockResolvedValueOnce('Título Personalizado');

      const { req, res } = createMocks({
        method: 'GET',
        query: { key: 'site_title', response: 'v1' },
      });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data).toEqual({ key: 'site_title', value: 'Título Personalizado' });
      expect(typeof data.timestamp).toBe('string');
    });

    it('deve retornar fallback padrão (fromDefault: true) quando setting conhecida não existir no banco', async () => {
      getSetting.mockResolvedValueOnce(null);

      const { req, res } = createMocks({ method: 'GET', query: { key: 'site_title' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toEqual({
        success: true,
        data: { key: 'site_title', value: 'O Caminhar com Deus' },
        fromDefault: true,
      });
    });

    it('deve retornar 404 no GET ?key= quando chave desconhecida não existir no banco nem no fallback', async () => {
      getSetting.mockResolvedValueOnce(null);

      const { req, res } = createMocks({ method: 'GET', query: { key: 'chave_inexistente' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(404);
    });

    it('deve retornar 500 no GET ?key= se ocorrer erro ao consultar o banco', async () => {
      getSetting.mockRejectedValueOnce(new Error('Falha de leitura'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { req, res } = createMocks({ method: 'GET', query: { key: 'site_title' } });
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

    it('deve criar configuração via POST com sucesso (201) e registrar log de auditoria', async () => {
      updateSetting.mockResolvedValueOnce('Novo Título');

      const { req, res } = createMocks({
        method: 'POST',
        body: { key: 'site_title', value: 'Novo Título', type: 'string', description: 'Título' },
        socket: { remoteAddress: '203.0.113.11' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      expect(updateSetting).toHaveBeenCalledWith('site_title', 'Novo Título', 'string', 'Título');
      expect(logActivity).toHaveBeenCalledWith(
        'admin',
        'CRIAR CONFIGURAÇÃO',
        'SETTINGS',
        null,
        'Configuração criada: site_title',
        '203.0.113.11'
      );
    });

    it('deve retornar 400 no POST quando payload for inválido', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { key: '', value: '' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(updateSetting).not.toHaveBeenCalled();
    });

    it('deve retornar 500 no POST quando updateSetting falhar', async () => {
      updateSetting.mockRejectedValueOnce(new Error('Falha ao gravar'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { req, res } = createMocks({
        method: 'POST',
        body: { key: 'site_title', value: 'Título Válido' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      consoleSpy.mockRestore();
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