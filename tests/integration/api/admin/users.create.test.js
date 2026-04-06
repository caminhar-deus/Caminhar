import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mock das dependências para isolar o teste na lógica do handler da API
// IMPORTANTE: Os mocks devem ser declarados ANTES da importação do handler
jest.mock('../../../../lib/db', () => ({
  query: jest.fn(),
  createRecord: jest.fn(),
  logActivity: jest.fn(),
}));

jest.mock('../../../../lib/auth', () => ({
  getAuthToken: jest.fn().mockReturnValue('fake-token'),
  verifyToken: jest.fn(),
  hashPassword: jest.fn().mockResolvedValue('hashed_password_string'),
}));

jest.mock('../../../../lib/cache', () => ({
  checkRateLimit: jest.fn().mockResolvedValue(false),
}));

// Agora, importa o handler que usará as dependências mockadas
import handler from '../../../../pages/api/admin/users.js';

// Importa os mocks para poder usá-los nos testes
import { query, createRecord, logActivity } from '../../../../lib/db';
import { verifyToken, getAuthToken, hashPassword } from '../../../../lib/auth';

describe('API de Usuários - Criação (POST /api/admin/users)', () => {
  beforeEach(() => {
    // Limpa todos os mocks antes de cada teste para garantir o isolamento
    jest.clearAllMocks();

    // Re-estabelece o mock para getAuthToken, pois jest.clearAllMocks() limpa a implementação
    // definida no jest.mock() no topo do arquivo.
    getAuthToken.mockReturnValue('fake-token');

    // Re-estabelece o mock para hashPassword pelo mesmo motivo
    hashPassword.mockResolvedValue('hashed_password_string');

    // Configuração padrão: simula um usuário com cargo 'admin' logado
    verifyToken.mockReturnValue({
      userId: 1,
      username: 'test-admin',
      role: 'admin',
    });
  });

  it('deve criar um novo usuário com sucesso quando os dados são válidos', async () => {
    const newUserPayload = {
      username: 'novo_usuario',
      password: 'senha_forte_123',
      role: 'editor',
    };

    const { req, res } = createMocks({
      method: 'POST',
      body: newUserPayload,
      headers: {
        'x-forwarded-for': '127.0.0.1',
      },
    });

    // Mock 1: Simula a busca de permissões do usuário admin (executada incondicionalmente)
    query.mockResolvedValueOnce({ rows: [{ permissions: ['Segurança', 'Usuários'] }] });
    // Mock 2: Simula que o usuário ainda não existe no banco
    query.mockResolvedValueOnce({ rows: [] });
    // Mock: Simula o retorno do banco de dados, retornando apenas os campos que a API deve expor.
    createRecord.mockResolvedValueOnce({ id: 2, username: 'novo_usuario', role: 'editor' });

    await handler(req, res);

    // Asserções da Resposta
    expect(res._getStatusCode()).toBe(201);
    const responseData = JSON.parse(res._getData());
    
    expect(responseData).toHaveProperty('id', 2);
    expect(responseData).toHaveProperty('username', 'novo_usuario');
    expect(responseData).toHaveProperty('role', 'editor');
    expect(responseData).not.toHaveProperty('password'); // Garante que a senha não é exposta

    // Asserções das Chamadas
    expect(createRecord).toHaveBeenCalledWith('users', 
      expect.objectContaining({
        username: 'novo_usuario',
        password: 'hashed_password_string', // Garante que a senha foi hasheada
        role: 'editor',
      }),
      expect.any(Array)
    );
    expect(logActivity).toHaveBeenCalledWith('test-admin', 'CRIAR USUÁRIO', 'USER', 2, expect.any(String), '127.0.0.1');
  });

  it('deve retornar 400 se o nome de usuário já estiver em uso', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { username: 'usuario_existente', password: '123' },
    });

    // Mock 1: Simula a busca de permissões do usuário admin
    query.mockResolvedValueOnce({ rows: [{ permissions: ['Segurança', 'Usuários'] }] });
    // Mock 2: Simula que a busca por usuário existente encontrou um resultado
    query.mockResolvedValueOnce({ rows: [{ id: 1, username: 'usuario_existente' }] });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({ error: 'Este nome de usuário já está em uso.' });
    expect(createRecord).not.toHaveBeenCalled();
  });

  it('deve retornar 403 se o usuário autenticado não tiver permissão', async () => {
    // Simula um usuário com cargo 'editor' sem a permissão necessária
    verifyToken.mockReturnValue({
      userId: 2,
      username: 'test-editor',
      role: 'editor',
    });
    // Mock: Simula que as permissões do cargo 'editor' não incluem 'Segurança' ou 'Usuários'
    query.mockResolvedValueOnce({ rows: [{ permissions: ['Posts/Artigos'] }] });

    const { req, res } = createMocks({
      method: 'POST',
      body: { username: 'novo_usuario', password: '123' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(403);
    expect(JSON.parse(res._getData())).toEqual({ error: 'Acesso negado. Requer permissão de Usuários ou Segurança.' });
  });
});