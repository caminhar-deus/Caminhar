import { createMocks } from 'node-mocks-http';
import handler from '../../../../pages/api/v1/status';
import { query } from '../../../../lib/db';

// Mock do lib/db
jest.mock('../../../../lib/db', () => ({
  query: jest.fn(),
}));

describe('API Status (/api/v1/status)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Deve retornar status 200 e informações operacionais do sistema', async () => {
    // Mock de conexão bem-sucedida
    query.mockResolvedValue({ rows: [{ '?column?': 1 }] });

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
    query.mockRejectedValue(new Error('Erro de conexão simulado'));

    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);

    const response = JSON.parse(res._getData());
    expect(response.data.database.status).toBe('error');
    expect(response.data.database.details.connected).toBe(false);
  });
});