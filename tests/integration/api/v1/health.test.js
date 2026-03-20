import { describe, test, expect } from '@jest/globals';
import { createGetRequest, executeHandler } from '@tests/helpers/api.js';
import handler from '../../../../pages/api/v1/health.js';

describe('API Health Check (/api/v1/health)', () => {
  test('Deve retornar 200 OK', async () => {
    const { req, res } = createGetRequest();

    await executeHandler(handler, req, res);

    expect(res).toHaveStatus(200);
    expect(res).toBeValidJSON({ status: 'ok' });
  });
});
