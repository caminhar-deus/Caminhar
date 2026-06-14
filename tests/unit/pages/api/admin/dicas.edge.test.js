import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../../../pages/api/admin/dicas.js';
import * as db from '../../../../../lib/db.js';
import * as auth from '../../../../../lib/auth.js';
import { logActivity } from '../../../../../lib/domain/audit.js';

jest.mock('../../../../../lib/db.js', () => require('../../../../mocks/db-module').mockDb());

jest.mock('../../../../../lib/auth.js', () => ({
  withAuth: jest.fn((h) => h) // Ignora o middleware de auth para focar na lógica interna
}));

jest.mock('../../../../../lib/domain/audit.js', () => ({
  logActivity: jest.fn()
}));

describe('API - Admin - Dicas (Edge Cases)', () => {
  let req;
  let res;

  beforeEach(() => {
    const mocks = createMocks({
      method: 'GET',
      headers: {},
      socket: {}, // Força o fallback de IP para 'unknown' (linha 6)
      body: {}
    });
    req = mocks.req;
    res = mocks.res;
    req.user = { username: 'admin' }; // Garante que logActivity seja acionado
  });

  it('deve usar o IP 127.0.0.1 e valor padrão de published (true) no POST', async () => {
    req.method = 'POST';
    req.body = { name: 'Dica Nova', content: 'Conteúdo da Dica' }; // Sem enviar 'published'
    
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Dica Nova' }] });
    await handler(req, res);

    expect(db.query).toHaveBeenCalledWith(expect.any(String), ['Dica Nova', 'Conteúdo da Dica', true]);
    expect(logActivity).toHaveBeenCalledWith('admin', 'CRIAR DICA', 'DICA', 1, 'Criou a dica: Dica Nova', '127.0.0.1');
  });

  it('deve usar o IP 127.0.0.1 e valor padrão de published (true) no PUT', async () => {
    req.method = 'PUT';
    req.body = { id: 99, name: 'Dica Atualizada', content: 'Atualizado' }; // Sem enviar 'published'

    db.query.mockResolvedValueOnce({ rows: [{ id: 99, name: 'Dica Atualizada', published: true }] });
    await handler(req, res);

    expect(db.query).toHaveBeenCalledWith(expect.any(String), ['Dica Atualizada', 'Atualizado', true, 99]);
    expect(logActivity).toHaveBeenCalledWith('admin', 'ATUALIZAR DICA', 'DICA', 99, 'Atualizou a dica: Dica Atualizada', '127.0.0.1');
  });
});
