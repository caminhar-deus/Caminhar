import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import handler from '../../../../../pages/api/admin/dicas.js';
import * as db from '../../../../../lib/db.js';
import * as auth from '../../../../../lib/auth.js';

jest.mock('../../../../../lib/db.js', () => ({
  query: jest.fn(),
  logActivity: jest.fn()
}));

jest.mock('../../../../../lib/auth.js', () => ({
  withAuth: jest.fn((h) => h) // Ignora o middleware de auth para focar na lógica interna
}));

describe('API - Admin - Dicas (Edge Cases)', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      method: 'GET',
      headers: {},
      socket: {}, // Força o fallback de IP para 'unknown' (linha 6)
      body: {},
      user: { username: 'admin' } // Garante que logActivity seja acionado
    };
    res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      end: jest.fn()
    };
  });

  it('deve usar o IP unknown e valor padrão de published (true) no POST (linhas 6 e 24)', async () => {
    req.method = 'POST';
    req.body = { name: 'Dica Nova', content: 'Conteúdo da Dica' }; // Sem enviar 'published'
    
    db.query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Dica Nova' }] });
    await handler(req, res);

    expect(db.query).toHaveBeenCalledWith(expect.any(String), ['Dica Nova', 'Conteúdo da Dica', true]);
    expect(db.logActivity).toHaveBeenCalledWith('admin', 'CRIAR DICA', 'POST', 1, 'Criou a dica: Dica Nova', 'unknown');
  });

  it('deve usar o IP unknown e valor padrão de published (true) no PUT (linhas 6 e 38)', async () => {
    req.method = 'PUT';
    req.body = { id: 99, name: 'Dica Atualizada', content: 'Atualizado' }; // Sem enviar 'published'

    db.query.mockResolvedValueOnce({ rows: [{ id: 99, name: 'Dica Atualizada' }] });
    await handler(req, res);

    expect(db.query).toHaveBeenCalledWith(expect.any(String), ['Dica Atualizada', 'Atualizado', true, 99]);
    expect(db.logActivity).toHaveBeenCalledWith('admin', 'ATUALIZAR DICA', 'PUT', 99, 'Atualizou a dica: Dica Atualizada', 'unknown');
  });
});