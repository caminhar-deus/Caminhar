import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import handler from '../../../../../pages/api/admin/dicas.js';
import * as db from '../../../../../lib/infra/db.js';
import { logActivity } from '../../../../../lib/domain/audit.js';
import { getPaginatedDicas } from '../../../../../lib/domain/dicas.js';

jest.mock('../../../../../lib/infra/db.js', () => require('../../../../mocks/db-module').mockDb());

jest.mock('../../../../../lib/auth/auth.js', () => ({
  withAuth: jest.fn((h) => h) // Ignora o middleware de auth para focar na lógica interna
}));

jest.mock('../../../../../lib/domain/audit.js', () => ({
  logActivity: jest.fn()
}));

// Mock do domínio: sem isso o GET chamaria o banco real para paginar (o
// beforeEach já enfileira a resposta do RBAC para db.query).
jest.mock('../../../../../lib/domain/dicas.js', () => ({
  getPaginatedDicas: jest.fn()
}));

describe('API - Admin - Dicas (Edge Cases)', () => {
  let req;
  let res;

  beforeEach(() => {
    const mocks = createMocks({
      method: 'GET',
      headers: {},
      socket: {}, // Sem remoteAddress: getClientIP cai no fallback 'unknown'
      body: {}
    });
    req = mocks.req;
    res = mocks.res;
    req.user = { username: 'admin' }; // Garante que logActivity seja acionado

    // RBAC: createAdminHandler queries roles.permissions before the handler runs,
    // so this must be queued before each test's mockResolvedValueOnce.
    db.query.mockResolvedValueOnce({ rows: [{ permissions: ['Gestão de Dicas'] }] });
  });

  it('deve paginar e buscar no GET via domínio (page/limit/search repassados)', async () => {
    req.method = 'GET';
    req.query = { page: '2', limit: '5', search: 'fé' };

    const paginated = {
      data: [{ id: 3, name: 'Mensagem de fé', content: 'Confie em Deus.' }],
      pagination: { page: 2, limit: 5, total: 12, totalPages: 3 },
    };
    getPaginatedDicas.mockResolvedValueOnce(paginated);

    await handler(req, res);

    expect(getPaginatedDicas).toHaveBeenCalledWith(2, 5, 'fé');
    expect(res._getStatusCode()).toBe(200);
    const body = res._getJSONData();
    expect(body.data).toEqual(paginated.data);
    expect(body.pagination).toEqual(paginated.pagination);
  });

  it('deve usar o IP unknown e valor padrão de published (false, ADR-0029) no POST', async () => {
    req.method = 'POST';
    req.body = { name: 'Dica Nova', content: 'Conteúdo da Dica' }; // Sem enviar 'published'
    
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Dica Nova' }] });
    await handler(req, res);

    expect(db.query).toHaveBeenCalledWith(expect.any(String), ['Dica Nova', 'Conteúdo da Dica', false]);
    expect(logActivity).toHaveBeenCalledWith('admin', 'CRIAR DICA', 'DICA', 1, 'Criou a dica: Dica Nova', 'unknown');
  });

  it('deve usar o IP unknown e valor padrão de published (true) no PUT', async () => {
    req.method = 'PUT';
    req.body = { id: 99, name: 'Dica Atualizada', content: 'Atualizado' }; // Sem enviar 'published'

    db.query.mockResolvedValueOnce({ rows: [{ id: 99, name: 'Dica Atualizada', published: true }] });
    await handler(req, res);

    expect(db.query).toHaveBeenCalledWith(expect.any(String), ['Dica Atualizada', 'Atualizado', true, 99]);
    expect(logActivity).toHaveBeenCalledWith('admin', 'ATUALIZAR DICA', 'DICA', 99, 'Atualizou a dica: Dica Atualizada', 'unknown');
  });
});
