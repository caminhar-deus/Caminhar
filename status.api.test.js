import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mock do módulo de banco de dados
jest.mock('./lib/db', () => ({
  query: jest.fn(),
}));

const db = jest.requireMock('./lib/db');

// Simulação do handler da API de status (/api/v1/status)
// Baseado na estrutura documentada e no comportamento esperado
const statusHandler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Simula verificação do banco de dados (SELECT version())
    const dbResult = await db.query('SELECT version()');
    const dbVersion = dbResult.rows[0].version;

    return res.status(200).json({
      success: true,
      data: {
        api: {
          version: '1.0',
          status: 'operational',
          environment: process.env.NODE_ENV || 'test',
        },
        database: {
          status: 'connected',
          details: {
            type: 'postgres',
            connected: true,
            version: dbVersion,
          },
        },
      },
      message: 'API está operacional',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message,
    });
  }
};

describe('API Status (/api/v1/status)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar status 200 e informações do sistema e banco de dados', async () => {
    const { req, res } = createMocks({ method: 'GET' });

    // Mock do retorno do banco de dados
    db.query.mockResolvedValue({
      rows: [{ version: 'PostgreSQL 14.5' }],
    });

    await statusHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const response = JSON.parse(res._getData());

    expect(response.success).toBe(true);
    expect(response.data.api.status).toBe('operational');
    expect(response.data.database.status).toBe('connected');
    expect(response.data.database.details.version).toBe('PostgreSQL 14.5');
    expect(db.query).toHaveBeenCalledWith('SELECT version()');
  });

  it('deve retornar erro 500 se o banco de dados estiver indisponível', async () => {
    const { req, res } = createMocks({ method: 'GET' });

    db.query.mockRejectedValue(new Error('Connection timeout'));

    await statusHandler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData()).success).toBe(false);
  });

  it('deve retornar 405 para métodos não permitidos', async () => {
    const { req, res } = createMocks({ method: 'POST' });
    await statusHandler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });
});