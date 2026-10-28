import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { suppressConsoleError } from '../../../helpers/console.js';

// Mock do DB para controlar as queries do RBAC (createAdminHandler) e do domínio
jest.mock('../../../../lib/infra/db.js', () => require('../../../mocks/db-module').mockDb());

// Mock do log de auditoria
jest.mock('../../../../lib/domain/audit.js', () => ({
  logActivity: jest.fn(),
}));

// Mock do cache (rate limit das mutações + invalidação automática de posts:* )
jest.mock('../../../../lib/cache/cache.js', () => ({
  invalidateCache: jest.fn(),
  checkRateLimit: jest.fn(),
}));

// Mock da autenticação (interceptando o middleware withAuth)
jest.mock('../../../../lib/auth/auth.js', () => ({
  withAuth: jest.fn((handler) => async (req, res) => {
    if (req.headers.authorization !== 'Bearer valid-token') {
      return res.status(401).json({ message: 'Não autenticado' });
    }
    req.user = req._userOverride || { userId: 1, username: 'admin', role: 'admin' };
    return handler(req, res);
  }),
}));

import handler from '../../../../pages/api/admin/categories.js';
import { query } from '../../../../lib/infra/db.js';
import { logActivity } from '../../../../lib/domain/audit.js';
import { invalidateCache, checkRateLimit } from '../../../../lib/cache/cache.js';

describe('API Admin - Categorias (/api/admin/categories)', () => {
  let consoleErrorSpy;
  // Simula a violação UNIQUE do INSERT/UPDATE (o domínio converte em DUPLICATE_SLUG)
  let failNextWrite;

  beforeEach(() => {
    consoleErrorSpy = suppressConsoleError();
    jest.clearAllMocks();
    checkRateLimit.mockResolvedValue(false);
    failNextWrite = false;

    // createAdminHandler consulta roles.permissions (RBAC) antes do handler —
    // implementação dirigida por SQL evita depender da ordem das queries.
    query.mockReset();
    query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT permissions FROM roles')) {
        return { rows: [{ permissions: ['Posts/Artigos'] }] };
      }
      if (sql.includes('INSERT INTO categories')) {
        if (failNextWrite) {
          throw Object.assign(new Error('duplicate key value violates unique constraint "categories_slug_key"'), { code: '23505' });
        }
        return { rows: [{ id: 5, name: 'Aviso', slug: 'aviso' }] };
      }
      if (sql.includes('UPDATE categories')) {
        return { rows: [{ id: 1, name: 'Editada', slug: 'editada' }] };
      }
      if (sql.includes('SELECT name FROM categories')) {
        return { rows: [{ name: 'Aviso' }] };
      }
      if (sql.includes('DELETE FROM categories')) {
        return { rows: [{ id: 1 }] };
      }
      if (sql.includes('COUNT(*)')) {
        return { rows: [{ count: '0' }] };
      }
      return { rows: [], rowCount: 0 };
    });
  });
  afterEach(() => { consoleErrorSpy?.mockRestore(); });

  // Função utilitária para gerar os mocks HTTP já autenticados
  const getAuthenticatedMocks = (options = {}, userOverride = null) => {
    const { req, res } = createMocks({
      ...options,
      headers: { ...options.headers, authorization: 'Bearer valid-token' },
    });
    if (userOverride) req._userOverride = userOverride;
    // Socket falso para o IP do log de auditoria não explodir
    req.socket = { remoteAddress: '127.0.0.1' };
    return { req, res };
  };

  describe('Autenticação e Proteção da Rota', () => {
    it('deve retornar 401 se o usuário não estiver autenticado', async () => {
      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(401);
    });

    it('deve retornar 405 para métodos HTTP não permitidos', async () => {
      const { req, res } = getAuthenticatedMocks({ method: 'PATCH' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(405);
    });

    it('deve retornar 403 se o usuário não for admin e não tiver permissão Posts/Artigos', async () => {
      // O catch do adminCrudHandler também devolve 403 quando a query de roles
      // FALHA (fail-closed) — o par com o teste "allow" logo abaixo prova que a
      // negação aqui é por FALTA DE PERMISSÃO.
      query.mockResolvedValueOnce({ rows: [{ permissions: ['Dashboard'] }] });

      const { req, res } = getAuthenticatedMocks({ method: 'GET' }, { userId: 2, username: 'editor', role: 'comum' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(403);
      const body = JSON.parse(res._getData());
      expect(body.error).toContain('Acesso negado');
      expect(body.message).toContain('Requer permissão');
    });

    it('não deve retornar 403 se o usuário não-admin tiver a permissão Posts/Artigos', async () => {
      query.mockResolvedValueOnce({ rows: [{ permissions: ['Posts/Artigos'] }] });

      const { req, res } = getAuthenticatedMocks({ method: 'GET' }, { userId: 2, username: 'editor', role: 'comum' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
    });
  });

  describe('GET - Listar Categorias', () => {
    it('deve retornar 200, cabeçalho no-store e a paginação com busca', async () => {
      const { req, res } = getAuthenticatedMocks({
        method: 'GET',
        query: { page: '2', limit: '5', search: 'avis' },
      });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(res.getHeader('Cache-Control')).toBe('no-store, max-age=0, must-revalidate');
      const body = res._getJSONData();
      expect(body.pagination).toEqual({ page: 2, limit: 5, total: 0, totalPages: 0 });
      expect(body.data).toEqual([]);
      // categories não tem position/created_at — orderBy explícito 'name ASC'
      expect(query).toHaveBeenCalledWith(expect.stringContaining('ORDER BY name ASC'), ['%avis%', 5, 5]);
    });

    it('deve retornar a lista completa sem paginação quando ?all=1', async () => {
      const { req, res } = getAuthenticatedMocks({
        method: 'GET',
        query: { all: '1' },
      });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(res.getHeader('Cache-Control')).toBe('no-store, max-age=0, must-revalidate');
      const body = res._getJSONData();
      // Formato { data: [...] } sem paginação — consumido pelo CategorySelectField
      expect(body.pagination).toBeUndefined();
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  describe('POST - Criar Categoria', () => {
    it('deve retornar 400 se a validação do Zod falhar (sem name)', async () => {
      const { req, res } = getAuthenticatedMocks({ method: 'POST', body: { slug: 'aviso' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData()).errors).toHaveProperty('name');
    });

    it('deve retornar 400 se o slug for inválido', async () => {
      const { req, res } = getAuthenticatedMocks({
        method: 'POST',
        body: { name: 'Aviso', slug: 'Slug Inválido!' },
      });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData()).errors).toHaveProperty('slug');
    });

    it('deve retornar 400 quando o nome não gera slug (sem alfanuméricos → INVALID_SLUG)', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const { req, res } = getAuthenticatedMocks({ method: 'POST', body: { name: '!!!' } });
        await handler(req, res);

        expect(res._getStatusCode()).toBe(400);
        const body = JSON.parse(res._getData());
        expect(body.message).toContain('slug');
        expect(body.errors).toHaveProperty('slug');
        // Nada foi inserido nem auditado
        expect(query).not.toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO categories'),
          expect.anything(),
          expect.anything(),
        );
        expect(logActivity).not.toHaveBeenCalled();
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it('deve criar a categoria, registrar auditoria, invalidar cache e retornar 201', async () => {
      const { req, res } = getAuthenticatedMocks({ method: 'POST', body: { name: 'Aviso' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      expect(res._getJSONData()).toEqual({ id: 5, name: 'Aviso', slug: 'aviso' });
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO categories'),
        ['Aviso', 'aviso'],
        expect.objectContaining({}),
      );
      expect(logActivity).toHaveBeenCalledWith('admin', 'CRIAR CATEGORIA', 'CATEGORIA', 5, 'Criou a categoria: Aviso', '127.0.0.1');
      expect(invalidateCache).toHaveBeenCalledWith('posts:*');
    });

    it('deve retornar 409 quando o slug já existe (DUPLICATE_SLUG)', async () => {
      failNextWrite = true;

      const { req, res } = getAuthenticatedMocks({ method: 'POST', body: { name: 'Aviso' } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(409);
      expect(res._getJSONData().message).toBe('Já existe uma categoria com esse slug');
      // 409 não invalida cache (só status < 400)
      expect(invalidateCache).not.toHaveBeenCalled();
    });
  });

  describe('PUT - Atualizar Categoria', () => {
    it('deve retornar 400 se o ID não for fornecido ou for inválido', async () => {
      const semId = getAuthenticatedMocks({ method: 'PUT', body: { name: 'X' } });
      await handler(semId.req, semId.res);
      expect(semId.res._getStatusCode()).toBe(400);

      const idInvalido = getAuthenticatedMocks({ method: 'PUT', body: { id: 'abc', name: 'X' } });
      await handler(idInvalido.req, idInvalido.res);
      expect(idInvalido.res._getStatusCode()).toBe(400);
    });

    it('deve retornar 400 se não houver dados reais para atualizar além do ID', async () => {
      const { req, res } = getAuthenticatedMocks({ method: 'PUT', body: { id: 1 } });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    it('deve atualizar a categoria e retornar 200 com auditoria e invalidação de cache', async () => {
      const { req, res } = getAuthenticatedMocks({
        method: 'PUT',
        body: { id: 1, name: 'Editada', slug: 'editada' },
      });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(res._getJSONData()).toEqual({ id: 1, name: 'Editada', slug: 'editada' });
      expect(logActivity).toHaveBeenCalledWith('admin', 'ATUALIZAR CATEGORIA', 'CATEGORIA', 1, 'Atualizou a categoria: Editada', '127.0.0.1');
      expect(invalidateCache).toHaveBeenCalledWith('posts:*');
    });

    it('deve retornar 404 se a categoria não existir', async () => {
      query.mockImplementation(async (sql) => {
        if (sql.includes('SELECT permissions FROM roles')) {
          return { rows: [{ permissions: ['Posts/Artigos'] }] };
        }
        if (sql.includes('UPDATE categories')) {
          return { rows: [] };
        }
        return { rows: [], rowCount: 0 };
      });

      const { req, res } = getAuthenticatedMocks({
        method: 'PUT',
        body: { id: 99, name: 'Inexistente' },
      });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(404);
    });

    it('deve retornar 409 quando o novo slug já pertence a outra categoria', async () => {
      query.mockImplementation(async (sql) => {
        if (sql.includes('SELECT permissions FROM roles')) {
          return { rows: [{ permissions: ['Posts/Artigos'] }] };
        }
        if (sql.includes('UPDATE categories')) {
          throw Object.assign(new Error('duplicate key value violates unique constraint "categories_slug_key"'), { code: '23505' });
        }
        return { rows: [], rowCount: 0 };
      });

      const { req, res } = getAuthenticatedMocks({
        method: 'PUT',
        body: { id: 1, slug: 'aviso' },
      });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(409);
      expect(res._getJSONData().message).toBe('Já existe uma categoria com esse slug');
    });
  });

  describe('DELETE - Excluir Categoria', () => {
    it('deve retornar 400 se o ID não for fornecido', async () => {
      const { req, res } = getAuthenticatedMocks({ method: 'DELETE', body: {} });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    it('deve excluir, buscar o nome para auditoria e retornar 200', async () => {
      const { req, res } = getAuthenticatedMocks({ method: 'DELETE', body: { id: 1 } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(res._getJSONData()).toEqual({ success: true });
      expect(query).toHaveBeenCalledWith(expect.stringContaining('SELECT name FROM categories'), [1]);
      expect(logActivity).toHaveBeenCalledWith('admin', 'EXCLUIR CATEGORIA', 'CATEGORIA', 1, 'Removeu a categoria: Aviso', '127.0.0.1');
      expect(invalidateCache).toHaveBeenCalledWith('posts:*');
    });

    it('deve retornar 404 se a categoria não for encontrada para exclusão', async () => {
      query.mockImplementation(async (sql) => {
        if (sql.includes('SELECT permissions FROM roles')) {
          return { rows: [{ permissions: ['Posts/Artigos'] }] };
        }
        if (sql.includes('SELECT name FROM categories')) {
          return { rows: [] };
        }
        if (sql.includes('DELETE FROM categories')) {
          return { rows: [] };
        }
        return { rows: [], rowCount: 0 };
      });

      const { req, res } = getAuthenticatedMocks({ method: 'DELETE', body: { id: 99 } });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(404);
    });
  });
});
