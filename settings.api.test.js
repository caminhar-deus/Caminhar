import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mock do módulo de banco de dados
jest.mock('./lib/db', () => ({
  getSettings: jest.fn(),
  updateSetting: jest.fn(),
}));

const db = jest.requireMock('./lib/db');

// Simulação do middleware de autenticação `withAuth`
const withAuth = (handler) => async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Não autenticado' });
  }

  // Em um cenário real, verificaríamos o token aqui.
  // Para o teste, a presença do header é suficiente para simular autenticação.
  return handler(req, res);
};

// Simulação do handler da API de settings
const settingsHandler = async (req, res) => {
  const { method, body } = req;

  if (method === 'GET') {
    try {
      const settings = await db.getSettings();
      return res.status(200).json(settings);
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao buscar configurações' });
    }
  }

  if (method === 'POST' || method === 'PUT') {
    const { key, value, type, description } = body;

    if (!key || value === undefined) {
      return res.status(400).json({ message: 'Chave e valor são obrigatórios' });
    }

    try {
      const updated = await db.updateSetting(key, value, type, description);
      return res.status(200).json(updated);
    } catch (error) {
      return res.status(500).json({ message: 'Erro ao atualizar configuração' });
    }
  }

  return res.status(405).json({ message: 'Método não permitido' });
};

// Rota protegida
const protectedSettingsHandler = withAuth(settingsHandler);

describe('API de Configurações (/api/settings)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar todas as configurações (GET)', async () => {
    const mockSettings = {
      site_title: 'Meu Site',
      site_description: 'Descrição do site'
    };
    
    db.getSettings.mockResolvedValue(mockSettings);

    const { req, res } = createMocks({
      method: 'GET',
      headers: { 'Authorization': 'Bearer valid.token' },
    });

    await protectedSettingsHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual(mockSettings);
    expect(db.getSettings).toHaveBeenCalled();
  });

  it('deve atualizar uma configuração (POST)', async () => {
    const newSetting = {
      key: 'site_title',
      value: 'Novo Título',
      type: 'string',
      description: 'Título do site'
    };

    db.updateSetting.mockResolvedValue(newSetting);

    const { req, res } = createMocks({
      method: 'POST',
      headers: { 'Authorization': 'Bearer valid.token' },
      body: newSetting
    });

    await protectedSettingsHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual(newSetting);
    expect(db.updateSetting).toHaveBeenCalledWith(
      newSetting.key, 
      newSetting.value, 
      newSetting.type, 
      newSetting.description
    );
  });

  it('deve retornar 401 se não autenticado', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await protectedSettingsHandler(req, res);

    expect(res._getStatusCode()).toBe(401);
  });

  it('deve retornar 400 se dados inválidos no update', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: { 'Authorization': 'Bearer valid.token' },
      body: { key: 'only_key' } // valor faltando
    });

    await protectedSettingsHandler(req, res);

    expect(res._getStatusCode()).toBe(400);
  });
});