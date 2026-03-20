import { jest, describe, beforeEach, test, expect } from '@jest/globals';
import { createGetRequest, executeHandler } from '@tests/helpers/api.js';
import handler from '../../../../pages/api/v1/status.js';

// Mock do lib/db
jest.mock('../../../../lib/db.js', () => ({
  query: jest.fn(),
}));

// Import the mocked modules
const db = jest.requireMock('../../../../lib/db.js');

describe('API Status (/api/v1/status)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Deve retornar status 200 e informações operacionais do sistema', async () => {
    // Mock de conexão bem-sucedida
    db.query.mockResolvedValue({ rows: [{ connected: 1 }] });

    const { req, res } = createGetRequest();

    await executeHandler(handler, req, res);

    expect(res).toHaveStatus(200);
    
    // Validação flexível para campos adicionais
    const response = JSON.parse(res._getData());
    
    expect(response.success).toBe(true);
    expect(response.message).toBe('API está operacional');
    expect(response.data.api.version).toBe('1.0');
    expect(response.data.api.status).toBe('operational');
    expect(response.data.database.status).toBe('connected');
    expect(response.data.database.details.connected).toBe(true);
    expect(response.data.system.nodeVersion).toBeDefined();
    expect(response.data.system.uptime).toBeGreaterThanOrEqual(0);
    
    // Verifica campos adicionais que podem existir
    expect(response.data.api).toHaveProperty('timestamp');
    expect(response.data.api).toHaveProperty('environment');
    expect(response.data.database.details).toHaveProperty('type');
    expect(response.data.system).toHaveProperty('platform');
    expect(response).toHaveProperty('timestamp');
  });

  test('Deve reportar erro se a conexão com o banco falhar', async () => {
    // Mock de falha na conexão
    db.query.mockRejectedValue(new Error('Erro de conexão simulado'));

    const { req, res } = createGetRequest();
    await executeHandler(handler, req, res);

    expect(res).toHaveStatus(200); // API continua operacional mesmo com erro de banco
    
    // Validação flexível para campos adicionais
    const response = JSON.parse(res._getData());
    
    expect(response.success).toBe(true);
    expect(response.message).toBe('API está operacional');
    expect(response.data.api.version).toBe('1.0');
    expect(response.data.api.status).toBe('operational');
    expect(response.data.database.status).toBe('error');
    expect(response.data.database.details.connected).toBe(false);
    expect(response.data.database.details.error).toBe('Erro de conexão simulado');
    expect(response.data.system.nodeVersion).toBeDefined();
    expect(response.data.system.uptime).toBeGreaterThanOrEqual(0);
    
    // Verifica campos adicionais que podem existir
    expect(response.data.api).toHaveProperty('timestamp');
    expect(response.data.api).toHaveProperty('environment');
    expect(response.data.database.details).toHaveProperty('type');
    expect(response.data.system).toHaveProperty('platform');
    expect(response).toHaveProperty('timestamp');
  });
});
