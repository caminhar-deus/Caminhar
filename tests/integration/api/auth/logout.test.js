import { describe, it, expect } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../../pages/api/auth/logout.js';

describe('API Auth - Logout (/api/auth/logout)', () => {
  it('deve limpar o cookie de token definindo a expiração para o passado e retornar sucesso', async () => {
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('token=;')])
    );
    expect(res._getJSONData()).toEqual({ success: true, message: 'Deslogado com sucesso' });
  });
});