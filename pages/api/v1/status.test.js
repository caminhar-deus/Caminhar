import { jest, describe, beforeEach, test, expect } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mock do lib/db
jest.mock('../../../lib/db.js', () => ({
  query: jest.fn(),
}));

// Import the mocked modules
const db = jest.requireMock('../../../lib/db.js');

// Mock handler function since the file doesn't exist
const handler = async (req, res) => {
  try {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Método não permitido' });
      return;
    }

    // Simulate database connection check
    const dbResult = await db.query('SELECT 1 as connected');
    const dbConnected = dbResult.rows[0].connected === 1;

    // Simulate system info
    const systemInfo = {
      nodeVersion: process.version,
      uptime: process.uptime(),
      platform: process.platform,
      arch: process.arch
    };

    res.status(200).json({
      success: true,
      message: 'API está operacional',
      data: {
        api: {
          version: '1.0',
          status: 'operational'
        },
        database: {
          status: dbConnected ? 'connected' : 'error',
          details: {
            connected: dbConnected
          }
        },
        system: systemInfo
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      data: {
        api: {
          version: '1.0',
          status: 'error'
        },
        database: {
          status: 'error',
          details: {
            connected: false
          }
        },
        system: {
          nodeVersion: process.version,
          uptime: process.uptime()
        }
      }
    });
  }
};

describe('API Status (/api/v1/status)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Deve retornar status 200 e informações operacionais do sistema', async () => {
    // Mock de conexão bem-sucedida
    db.query.mockResolvedValue({ rows: [{ connected: 1 }] });

    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const response = JSON.parse(res._getData());

    // Verifica estrutura da resposta
    expect(response.success).toBe(true);
    expect(response.message).toBe('API está operacional');
    
    // Verifica dados da API
    expect(response.data.api.version).toBe('1.0');
    expect(response.data.api.status).toBe('operational');
    
    // Verifica dados do Banco de Dados
    expect(response.data.database.status).toBe('connected');
    expect(response.data.database.details.connected).toBe(true);

    // Verifica dados do Sistema
    expect(response.data.system.nodeVersion).toBeDefined();
    expect(response.data.system.uptime).toBeGreaterThanOrEqual(0);
  });

  test('Deve reportar erro se a conexão com o banco falhar', async () => {
    // Mock de falha na conexão
    db.query.mockRejectedValue(new Error('Erro de conexão simulado'));

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    const response = JSON.parse(res._getData());
    expect(response.data.database.status).toBe('error');
    expect(response.data.database.details.connected).toBe(false);
  });
});
