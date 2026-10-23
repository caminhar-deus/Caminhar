import { describe, it, expect, jest } from '@jest/globals';
import { hashPassword, verifyPassword, generateToken, verifyToken, setAuthCookie, getAuthToken, authenticate, authenticateAndGenerateToken, refreshAccessToken, withAuth, initializeAuth } from '../../../lib/auth/auth.js';
import { query } from '../../../lib/infra/db.js';
import { filterConsoleError } from '../../helpers/console.js';

jest.mock('../../../lib/infra/db.js', () => require('../../mocks/db-module').mockDb());
jest.mock('../../../lib/cache/cache.js', () => ({
  checkRateLimit: jest.fn(async () => false),
}));

describe('Library - Auth', () => {

  it('hashPassword e verifyPassword: deve encriptar e validar corretamente', async () => {
    const hash = await hashPassword('123456');
    expect(hash).toBeDefined();
    expect(await verifyPassword('123456', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
    await expect(hashPassword('')).rejects.toThrow('Senha inválida');
  });

  it('generateToken e verifyToken: deve criar e validar JWT', () => {
    const token = generateToken({ id: 1, username: 'admin', role: 'admin' });
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(1);
    expect(decoded.username).toBe('admin');
    expect(verifyToken('invalid')).toBeNull();
  });

  it('getAuthToken: extrai token do header Bearer ou do cookie fallback', () => {
    expect(getAuthToken({ headers: { authorization: 'Bearer mytoken' } })).toBe('mytoken');
    expect(getAuthToken({ headers: { cookie: 'token=cookietoken' } })).toBe('cookietoken');
    expect(getAuthToken({ headers: {} })).toBeUndefined();
  });

  it('setAuthCookie: configura o cookie de autenticação no response', () => {
    const res = { appendHeader: jest.fn() };
    setAuthCookie(res, 'mytoken');
    expect(res.appendHeader).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('token=mytoken'));
  });

  it('authenticate: valida credenciais no banco de dados', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1, username: 'admin', password: await hashPassword('pass') }] });
    const user = await authenticate('admin', 'pass');
    expect(user.id).toBe(1);

    query.mockResolvedValueOnce({ rows: [] }); // User não existe
    expect(await authenticate('unknown', 'pass')).toBeNull();

    query.mockResolvedValueOnce({ rows: [{ password: await hashPassword('pass') }] }); // Senha errada
    expect(await authenticate('admin', 'wrong')).toBeNull();
  });

  it('authenticateAndGenerateToken: não devolve refresh token não persistido quando o armazenamento falha', async () => {
    const passwordHash = await hashPassword('123456');

    query.mockResolvedValueOnce({ rows: [{ id: 1, username: 'admin', password: passwordHash, role: 'admin' }] }); // Usuário existe
    query.mockResolvedValueOnce({ rowCount: 1, rows: [] }); // Atualiza last_login_at
    query.mockResolvedValueOnce({ rows: [{ permissions: '["Visão Geral"]' }] }); // Busca permissões (TEXT → string JSON)
    query.mockRejectedValueOnce(new Error('DB Error')); // Falha ao armazenar refresh token

    const consoleErrorSpy = filterConsoleError(['Falha ao armazenar refresh token']);
    try {
      const result = await authenticateAndGenerateToken('admin', '123456', '127.0.0.1');
      expect(result.error).toBeNull();
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeNull();
      expect(result.user.permissions).toEqual(['Visão Geral']);
      expect(result.permissionsLoaded).toBe(true);
      // O log intencional de "Falha ao armazenar refresh token" realmente
      // ocorreu — asserta antes do mockRestore, que limpa as chamadas do spy
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Falha ao armazenar refresh token'));
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('refreshAccessToken: devolve user.permissions normalizado a partir do TEXT do banco', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ user_id: 1 }] }) // validateRefreshToken
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // revokeRefreshToken (rotação)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // storeRefreshToken (novo par)
      .mockResolvedValueOnce({ rows: [{ id: 1, username: 'admin', role: 'comum' }] }) // SELECT users
      .mockResolvedValueOnce({ rows: [{ permissions: '["Visão Geral"]' }] }); // roles (TEXT → string JSON)

    const result = await refreshAccessToken('valid-refresh-token');

    expect(result.error).toBeNull();
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user).toEqual({
      id: 1,
      username: 'admin',
      role: 'comum',
      permissions: ['Visão Geral'],
      permissionsLoaded: true,
    });
  });

  it('refreshAccessToken: devolve permissions: [] sem quebrar o refresh se a consulta a roles falhar', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ user_id: 1 }] }) // validateRefreshToken
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // revokeRefreshToken (rotação)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // storeRefreshToken (novo par)
      .mockResolvedValueOnce({ rows: [{ id: 1, username: 'admin', role: 'comum' }] }) // SELECT users
      .mockRejectedValueOnce(new Error('relation "roles" does not exist')); // roles falha

    const result = await refreshAccessToken('valid-refresh-token');

    expect(result.error).toBeNull();
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user.permissions).toEqual([]);
    expect(result.user.permissionsLoaded).toBe(false);
  });

  it('withAuth: protege rotas de API como middleware', async () => {
    const handler = jest.fn();
    const middleware = withAuth(handler);
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    
    await middleware({ headers: {} }, res); // Sem token
    expect(res.status).toHaveBeenCalledWith(401);
    
    await middleware({ headers: { authorization: 'Bearer invalid' } }, res); // Inválido
    expect(res.status).toHaveBeenCalledWith(401);

    const token = generateToken({ id: 1 }); // Válido
    const req = { headers: { authorization: `Bearer ${token}` } };
    await middleware(req, res);
    expect(handler).toHaveBeenCalledWith(req, res);
    expect(req.user.userId).toBe(1);
  });

  it('withAuth: assinatura viva é withAuth(handler) — só aceita função e devolve middleware async (req, res)', async () => {
    // Congela a assinatura do `withAuth` VIVO (lib/auth/auth.js:324) para que
    // ele nunca seja confundido com o morto de lib/api/middleware.js:88
    // (`withAuth({ roles })`, que aceita objeto de opções).
    const handler = jest.fn(async () => 'ok-do-handler');
    const middleware = withAuth(handler);

    expect(typeof middleware).toBe('function');
    expect(middleware.length).toBe(2); // async (req, res) => { ... }

    const token = generateToken({ id: 1 });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await expect(middleware(req, res)).resolves.toBe('ok-do-handler');
    expect(handler).toHaveBeenCalledWith(req, res);
  });

  it('withAuth: NÃO é o withAuth({ roles }) morto — objeto de opções no lugar do handler quebra detectavelmente', async () => {
    // Comportamento real descoberto empiricamente: passar `{ roles: ['admin'] }`
    // NÃO lança erro na montagem (withAuth não valida o argumento), devolve um
    // middleware que responde 401 normalmente sem token, mas FALHA com TypeError
    // quando autentica com sucesso — porque `handler(req, res)` chama um objeto.
    // Ou seja: o objeto de opções não "funciona" como checagem de role nenhuma.
    const middleware = withAuth({ roles: ['admin'] });
    expect(typeof middleware).toBe('function'); // montagem não valida o handler

    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await middleware({ headers: {} }, res); // Sem token: 401 sem tocar no objeto
    expect(res.status).toHaveBeenCalledWith(401);

    const token = generateToken({ id: 1 }); // Com token válido: TypeError na chamada
    const req = { headers: { authorization: `Bearer ${token}` } };
    await expect(middleware(req, res)).rejects.toThrow('handler is not a function');
  });

  it('withAuth: req.user injetado vem do payload decodificado do token', async () => {
    const handler = jest.fn();
    const middleware = withAuth(handler);
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    const token = generateToken({ id: 7, username: 'maria', role: 'editor' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    await middleware(req, res);

    expect(req.user).toEqual(verifyToken(token)); // Mesmo payload que o JWT carrega
    expect(req.user).toEqual(
      expect.objectContaining({ userId: 7, username: 'maria', role: 'editor' })
    );
  });

  it('initializeAuth: cria tabelas e verifica criação/atualização do admin default', async () => {
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD = 'password';
    
    query.mockResolvedValue({ rows: [] }); // Admin inexistente
    await initializeAuth();
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO users'), expect.any(Array));

    query.mockResolvedValue({ rows: [{ id: 1, role: 'user' }] }); // Admin com role errada
    await initializeAuth();
    expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE users SET role'), expect.any(Array));
  });

  it('initializeAuth: lança erro se credenciais de admin não estiverem no env', async () => {
    delete process.env.ADMIN_USERNAME;
    const consoleErrorSpy = filterConsoleError(['Erro ao inicializar sistema de autenticação']);
    try {
      await expect(initializeAuth()).rejects.toThrow('ADMIN_USERNAME and ADMIN_PASSWORD environment variables must be set');
      // O log intencional de "Erro ao inicializar..." realmente ocorreu (o erro
      // interno é logado antes de ser relançado, mesmo sem credenciais no env).
      // Asserta antes do mockRestore, que limpa as chamadas do spy
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Erro ao inicializar sistema de autenticação'));
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('initializeAuth: repassa erros do banco de dados e loga no console', async () => {
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD = 'password';
    query.mockRejectedValueOnce(new Error('DB Error'));

    const consoleErrorSpy = filterConsoleError(['Erro ao inicializar sistema de autenticação']);
    try {
      await expect(initializeAuth()).rejects.toThrow('DB Error');
      // O log intencional de "Erro ao inicializar..." realmente ocorreu —
      // asserta antes do mockRestore, que limpa as chamadas do spy
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Erro ao inicializar sistema de autenticação'));
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});