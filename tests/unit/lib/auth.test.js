import { describe, it, expect, jest } from '@jest/globals';
import { hashPassword, verifyPassword, generateToken, verifyToken, setAuthCookie, getAuthToken, authenticate, authenticateAndGenerateToken, withAuth, initializeAuth } from '../../../lib/auth/auth.js';
import { query } from '../../../lib/infra/db.js';

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
    query.mockResolvedValueOnce({ rows: [{ permissions: ['Visão Geral'] }] }); // Busca permissões
    query.mockRejectedValueOnce(new Error('DB Error')); // Falha ao armazenar refresh token

    const result = await authenticateAndGenerateToken('admin', '123456', '127.0.0.1');
    expect(result.error).toBeNull();
    expect(result.token).toBeDefined();
    expect(result.refreshToken).toBeNull();
    expect(result.user.permissions).toEqual(['Visão Geral']);
    expect(result.permissionsLoaded).toBe(true);
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
    await expect(initializeAuth()).rejects.toThrow('ADMIN_USERNAME and ADMIN_PASSWORD environment variables must be set');
  });

  it('initializeAuth: repassa erros do banco de dados e loga no console', async () => {
    process.env.ADMIN_USERNAME = 'admin';
    process.env.ADMIN_PASSWORD = 'password';
    query.mockRejectedValueOnce(new Error('DB Error'));
    
    await expect(initializeAuth()).rejects.toThrow('DB Error');
  });
});