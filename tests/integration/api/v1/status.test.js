import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../../pages/api/v1/status.js';
import { query } from '../../../../lib/db.js';

jest.mock('../../../../lib/db.js', () => ({
  query: jest.fn()
}));

describe('API Status (/api/v1/status)', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('deve retornar 405 para métodos diferentes de GET', async () => {
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });

  it('deve retornar 200 e database conectada se a query de health funcionar', async () => {
    query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(data.data.database.status).toBe('connected');
  });

  it('deve retornar 200 mas com erro no database se a query falhar', async () => {
    query.mockRejectedValueOnce(new Error('DB Offline'));
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = res._getJSONData();
    expect(data.data.database.status).toBe('error');
  });

  it('deve usar development como ambiente fallback caso NODE_ENV não esteja definido', async () => {
    const originalEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV; // Apaga temporariamente para forçar o fallback
    
    query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    
    expect(res._getJSONData().data.api.environment).toBe('development');
    process.env.NODE_ENV = originalEnv; // Restaura
  });
});