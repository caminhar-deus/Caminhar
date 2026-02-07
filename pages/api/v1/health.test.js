import { describe, test, expect } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/v1/health.js';

describe('API Health Check (/api/v1/health)', () => {
  test('Deve retornar 200 OK', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({ status: 'ok' });
  });
});
