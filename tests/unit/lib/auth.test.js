import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals';
import { hashPassword, verifyPassword, generateToken, verifyToken, setAuthCookie, getAuthCookie, getAuthToken, authenticate, withAuth, initializeAuth } from '../../../lib/auth.js';
import { query } from '../../../lib/db.js';

jest.mock('../../../lib/db.js', () => ({ query: jest.fn() }));
jest.mock('cookie', () => ({
  parse: (str) => {
    if (!str) return {};
    return str.split(';').reduce((acc, val) => {
      const [k, v] = val.split('=');
      if (k && v) acc[k.trim()] = v.trim();
      return acc;
    }, {});
  },
  serialize: (name, val) => `${name}=${val}`
}));

describe('Library - Auth', () => {
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  beforeAll(() => {
    console.log = () => {};
    console.error = () => {};
  });

  afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  beforeEach(() => { jest.clearAllMocks(); });

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
    const res = { setHeader: jest.fn() };
    setAuthCookie(res, 'mytoken');
    expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('token=mytoken'));
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
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    await expect(initializeAuth()).rejects.toThrow('DB Error');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});