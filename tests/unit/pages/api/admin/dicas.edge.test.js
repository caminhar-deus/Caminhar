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

  it('deve retornar 400 se id não for enviado no PUT', async () => {
    req.method = 'PUT';
    req.body = { name: 'Sem ID', content: 'Teste' };

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData()).toEqual({ message: 'ID é obrigatório' });
  });

  it('deve retornar 404 se dica não existir no PUT', async () => {
    req.method = 'PUT';
    req.body = { id: 123, name: 'Teste', content: 'Conteúdo' };

    db.query.mockResolvedValueOnce({ rows: [] });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(404);
    expect(res._getJSONData()).toEqual({ message: 'Dica não encontrada' });
  });

  it('deve retornar 400 em caso de validação inválida no POST', async () => {
    req.method = 'POST';
    req.body = { name: '', content: '' };

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData()).toHaveProperty('message', 'Dados inválidos para criação de dica');
    expect(res._getJSONData()).toHaveProperty('errors');
  });

  it('deve retornar 400 em caso de validação inválida no PUT', async () => {
    req.method = 'PUT';
    req.body = { id: 10, name: '', content: '' };

    db.query.mockResolvedValueOnce({ rows: [{ id: 10, name: 'Antigo', content: 'Antigo', published: true }] });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData()).toHaveProperty('message', 'Dados inválidos para atualização de dica');
    expect(res._getJSONData()).toHaveProperty('errors');
  });

  it('deve excluir dica com log e invalidação de cache', async () => {
    req.method = 'DELETE';
    req.body = { id: 5 };

    db.query
      .mockResolvedValueOnce({ rows: [{ name: 'Dica X' }] }) // busca nome
      .mockResolvedValueOnce({ rows: [] }); // delete

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({ success: true });
    expect(logActivity).toHaveBeenCalledWith('admin', 'EXCLUIR DICA', 'DICA', 5, 'Removeu a dica: Dica X', 'unknown');
  });

  it('deve excluir dica mesmo sem nome encontrado (fallback para id)', async () => {
    req.method = 'DELETE';
    req.body = { id: 7 };

    db.query
      .mockResolvedValueOnce({ rows: [] }) // busca nome não encontra
      .mockResolvedValueOnce({ rows: [] }); // delete

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({ success: true });
    expect(logActivity).toHaveBeenCalledWith('admin', 'EXCLUIR DICA', 'DICA', 7, 'Removeu a dica: 7', 'unknown');
  });

  it('deve usar valores padrão no GET quando query ausente', async () => {
    req.method = 'GET';
    req.query = {};

    const paginated = {
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
    getPaginatedDicas.mockResolvedValueOnce(paginated);

    await handler(req, res);

    expect(getPaginatedDicas).toHaveBeenCalledWith(1, 10, '');
    expect(res._getStatusCode()).toBe(200);
  });

  it('deve criar dica com published true quando enviado explicitamente', async () => {
    req.method = 'POST';
    req.body = { name: 'Dica Publicada', content: 'Conteúdo', published: true };

    db.query.mockResolvedValueOnce({ rows: [{ id: 2, name: 'Dica Publicada', published: true }] });
    await handler(req, res);

    expect(db.query).toHaveBeenCalledWith(expect.any(String), ['Dica Publicada', 'Conteúdo', true]);
    expect(res._getStatusCode()).toBe(201);
  });

  it('deve atualizar dica mantendo published do existente quando não enviado', async () => {
    req.method = 'PUT';
    req.body = { id: 50, name: 'Atualizada' };

    db.query
      .mockResolvedValueOnce({ rows: [{ id: 50, name: 'Antiga', content: 'Conteúdo antigo', published: false }] })
      .mockResolvedValueOnce({ rows: [{ id: 50, name: 'Atualizada', content: 'Conteúdo antigo', published: false }] });

    await handler(req, res);

    expect(db.query).toHaveBeenCalledWith(expect.any(String), ['Atualizada', 'Conteúdo antigo', false, 50]);
    expect(res._getStatusCode()).toBe(200);
  });

  it('deve atualizar dica mantendo content do existente quando não enviado', async () => {
    req.method = 'PUT';
    req.body = { id: 51, content: 'Novo conteúdo' };

    db.query
      .mockResolvedValueOnce({ rows: [{ id: 51, name: 'Nome', content: 'Antigo', published: true }] })
      .mockResolvedValueOnce({ rows: [{ id: 51, name: 'Nome', content: 'Novo conteúdo', published: true }] });

    await handler(req, res);

    expect(db.query).toHaveBeenCalledWith(expect.any(String), ['Nome', 'Novo conteúdo', true, 51]);
    expect(res._getStatusCode()).toBe(200);
  });

  it('deve excluir dica usando fallback para id quando name for falsy', async () => {
    req.method = 'DELETE';
    req.body = { id: 9 };

    db.query
      .mockResolvedValueOnce({ rows: [{ name: null }] })
      .mockResolvedValueOnce({ rows: [] });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({ success: true });
    expect(logActivity).toHaveBeenCalledWith('admin', 'EXCLUIR DICA', 'DICA', 9, 'Removeu a dica: 9', 'unknown');
  });
});
