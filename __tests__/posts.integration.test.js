import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { Pool } from 'pg';

// Mock do módulo 'pg'
// Definimos o objeto de mock internamente para evitar erros de referência devido ao hoisting
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
    connect: jest.fn(),
  };
  return {
    Pool: jest.fn(() => mPool),
  };
});

import { getRecentPosts, getAllPosts } from '../lib/db.js';
import handler from '../pages/api/posts.js';

// Captura a função 'query' do mock da instância do Pool criada ao importar db.js
const mockQuery = Pool.mock.results[0].value.query;

describe('Integração de Posts (API/DB)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
    // Resposta padrão do banco
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('getRecentPosts deve retornar apenas posts publicados (published = true)', async () => {
    // Executa a função que alimenta a API pública
    await getRecentPosts();

    // Verifica se a query foi executada
    expect(mockQuery).toHaveBeenCalledTimes(1);
    
    // Obtém o SQL executado e verifica o filtro de segurança
    const sql = mockQuery.mock.calls[0][0];
    expect(sql).toMatch(/WHERE\s+published\s*=\s*true/i);
  });

  it('getRecentPosts deve suportar paginação (limit e offset)', async () => {
    const limit = 5;
    const page = 2;
    await getRecentPosts(limit, page);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const sql = mockQuery.mock.calls[0][0];
    const params = mockQuery.mock.calls[0][1];

    expect(sql).toMatch(/LIMIT \$1 OFFSET \$2/i);
    expect(params).toEqual([limit, 5]); // offset = (2-1)*5 = 5
  });

  it('getAllPosts deve permitir visualizar rascunhos (sem filtro de published)', async () => {
    // Executa a função usada pelo painel administrativo
    await getAllPosts();

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const sql = mockQuery.mock.calls[0][0];

    // Verifica que NÃO existe filtro de publicação (deve trazer tudo)
    expect(sql).not.toMatch(/WHERE\s+published\s*=\s*true/i);
  });

  it('Endpoint API /api/posts deve retornar 200 e JSON de posts', async () => {
    // Simula uma requisição HTTP GET
    const { req, res } = createMocks({
      method: 'GET',
    });

    // Executa o handler da API
    await handler(req, res);

    // Verifica o status HTTP
    expect(res._getStatusCode()).toBe(200);
    
    // Verifica se a função de banco correta foi chamada
    expect(mockQuery).toHaveBeenCalled();
  });

  it('Endpoint API /api/posts deve aceitar parâmetros de paginação', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { page: '2', limit: '5' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(mockQuery).toHaveBeenCalled();
    const params = mockQuery.mock.calls[0][1];
    expect(params).toEqual([5, 5]); // limit 5, offset 5
  });

  it('Endpoint API /api/posts deve rejeitar métodos não GET', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
  });
});