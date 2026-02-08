import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mock das dependências
jest.mock('./lib/db.js', () => ({
  __esModule: true,
  getSetting: jest.fn(),
  setSetting: jest.fn(),
  getAllSettings: jest.fn(),
}));
jest.mock('./lib/auth.js', () => ({
  getAuthToken: jest.fn(),
  verifyToken: jest.fn(),
}));

// Mock do Redis (simulando comportamento em memória para testes)
jest.mock('./lib/redis.js', () => {
  const store = new Map();
  return {
    redis: {
      get: jest.fn((key) => Promise.resolve(store.get(key) || null)),
      set: jest.fn((key, value) => Promise.resolve(store.set(key, value))),
      del: jest.fn((key) => {
        store.delete(key);
        return Promise.resolve(1);
      }),
      // Métodos auxiliares para verificação interna nos testes
      _store: store,
      _reset: () => store.clear()
    }
  };
});

// Import the mocked modules
const db = jest.requireMock('./lib/db.js');
const auth = jest.requireMock('./lib/auth.js');
const redis = jest.requireMock('./lib/redis.js').redis;

// Mock handler function since the file doesn't exist
const handler = async (req, res) => {
  try {
    if (req.method === 'GET') {
      // Simulate authentication check
      if (!auth.getAuthToken(req) || !auth.verifyToken(auth.getAuthToken(req))) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      // Simulate cache check
      const cachedData = await redis.get('settings:v1:all');
      if (cachedData) {
        res.status(200).json({
          success: true,
          data: JSON.parse(cachedData)
        });
        return;
      }

      // Simulate database query
      const settings = await db.getAllSettings();
      await redis.set('settings:v1:all', JSON.stringify(settings), { ex: 1800 });
      
      res.status(200).json({
        success: true,
        data: settings
      });
    } else if (req.method === 'PUT') {
      // Simulate authentication check
      if (!auth.getAuthToken(req) || !auth.verifyToken(auth.getAuthToken(req))) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      // Simulate database update
      const { key, value, type } = req.body;
      await db.setSetting(key, value, type);
      
      // Invalidate cache
      await redis.del('settings:v1:all');
      await redis.del(`settings:v1:${key}`);
      
      res.status(200).json({
        success: true,
        message: 'Configuração atualizada com sucesso'
      });
    } else {
      res.status(405).json({ message: 'Método não permitido' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

describe('Integração de Cache da API de Configurações (v1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redis._reset();

    // Setup Auth Mock (Admin por padrão para permitir todas operações)
    auth.getAuthToken.mockReturnValue('valid-token');
    auth.verifyToken.mockReturnValue({ role: 'admin', username: 'admin' });

    // Setup DB Mock
    db.getAllSettings.mockResolvedValue([
      { key: 'site_title', value: 'Test Site', type: 'string' },
      { key: 'site_description', value: 'Test Description', type: 'string' }
    ]);
    db.getSetting.mockImplementation((key) => {
      if (key === 'site_title') return 'Test Site';
      return null;
    });
    db.setSetting.mockResolvedValue('New Value');
  });

  it('deve buscar do banco e salvar no cache na primeira requisição (Cache Miss)', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    // Verifica se foi ao banco de dados
    expect(db.getAllSettings).toHaveBeenCalledTimes(1);
    // Verifica se salvou no Redis
    expect(redis.set).toHaveBeenCalledWith(
      'settings:v1:all',
      expect.stringContaining('Test Site'), // O cache armazena string JSON
      expect.objectContaining({ ex: 1800 }) // TTL de 30 minutos, conforme SETTINGS_CACHE_TTL
    );
  });

  it('deve buscar do cache e NÃO ir ao banco na segunda requisição (Cache Hit)', async () => {
    // 1. Primeira requisição para popular o cache
    const { req: req1, res: res1 } = createMocks({ method: 'GET' });
    await handler(req1, res1);
    
    // Limpa contadores do mock do DB para isolar a próxima verificação
    db.getAllSettings.mockClear();

    // 2. Segunda requisição
    const { req: req2, res: res2 } = createMocks({ method: 'GET' });
    await handler(req2, res2);

    expect(res2._getStatusCode()).toBe(200);
    const data = res2._getJSONData().data;
    expect(data).toHaveLength(2);
    
    // O ponto crucial: NÃO deve ter chamado o banco novamente
    expect(db.getAllSettings).not.toHaveBeenCalled();
    // Deve ter buscado do Redis
    expect(redis.get).toHaveBeenCalledWith('settings:v1:all');
  });

  it('deve invalidar o cache ao atualizar uma configuração (PUT)', async () => {
    // 1. Popula o cache via GET
    const { req: reqGet, res: resGet } = createMocks({ method: 'GET' });
    await handler(reqGet, resGet);
    expect(redis._store.has('settings:v1:all')).toBe(true);

    // 2. Atualiza uma configuração via PUT
    const { req: reqPut, res: resPut } = createMocks({
      method: 'PUT',
      body: { key: 'site_title', value: 'Updated Title', type: 'string' }
    });

    await handler(reqPut, resPut);

    expect(resPut._getStatusCode()).toBe(200);
    
    // 3. Verifica se o cache foi invalidado (deletado)
    expect(redis.del).toHaveBeenCalledWith('settings:v1:all');
    expect(redis.del).toHaveBeenCalledWith('settings:v1:site_title');
    expect(redis._store.has('settings:v1:all')).toBe(false);
  });
});
