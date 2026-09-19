import { describe, it, expect } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mocks do banco
jest.mock('../../../../lib/infra/db.js', () => require('../../../mocks/db-module').mockDb());

import handler from '../../../../pages/api/auth/logout.js';
import { query } from '../../../../lib/infra/db.js';

describe('API Auth - Logout (/api/auth/logout)', () => {
  it('deve limpar o cookie de token definindo a expiração para o passado e retornar sucesso', async () => {
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()['set-cookie'])
      .toEqual(expect.arrayContaining([expect.stringContaining('refreshToken=;')]));
    expect(res._getJSONData()).toEqual({ success: true, message: 'Deslogado com sucesso' });
  });

  it('deve revogar o refresh token no banco e limpar os dois cookies quando o cookie estiver presente', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      headers: { cookie: 'refreshToken=refresh-token-teste' },
    });

    await handler(req, res);

    expect(query).toHaveBeenCalledWith(
      expect.stringMatching(/UPDATE refresh_tokens\s+SET revoked = true/),
      ['refresh-token-teste']
    );
    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()['set-cookie'])
      .toEqual(expect.arrayContaining([
        expect.stringContaining('token=;'),
        expect.stringContaining('refreshToken=;'),
      ]));
    expect(res._getJSONData()).toEqual({ success: true, message: 'Deslogado com sucesso' });
  });

  it('deve concluir o logout mesmo quando a revogação do refresh token falhar', async () => {
    query.mockRejectedValueOnce(new Error('DB indisponível'));

    const { req, res } = createMocks({
      method: 'POST',
      headers: { cookie: 'refreshToken=refresh-token-com-falha' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getHeaders()['set-cookie'])
      .toEqual(expect.arrayContaining([
        expect.stringContaining('token=;'),
        expect.stringContaining('refreshToken=;'),
      ]));
    expect(res._getJSONData()).toEqual({ success: true, message: 'Deslogado com sucesso' });
  });
});