import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createMocks } from 'node-mocks-http';
import { hashPassword, verifyPassword, generateToken, verifyToken, setAuthCookie, getAuthCookie, withAuth, authenticate, initializeAuth, getAuthToken } from '../lib/auth';
import { query } from '../lib/db';

// Mock external dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../lib/db', () => ({
  query: jest.fn(),
}));

describe('auth.js', () => {
  // Clear mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('hashPassword returns a hash', async () => {
    bcrypt.hash.mockResolvedValue('hashedPassword');

    const result = await hashPassword('password');
    expect(result).toBe('hashedPassword');
    expect(bcrypt.hash).toHaveBeenCalledWith('password', 10);
  });

  it('hashPassword deve lançar um erro se a senha for inválida', async () => {
    bcrypt.hash.mockImplementation(() => {
      throw new Error('Invalid password');
    });
    await expect(hashPassword(null)).rejects.toThrow('Senha inválida');
  });

  it('verifyPassword deve retornar true se a senha for válida', async () => {
    bcrypt.compare.mockResolvedValue(true);
    const result = await verifyPassword('password', 'hashedPassword');

    expect(result).toBe(true);
    expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashedPassword');
  });

  it('generateToken deve retornar um token', () => {
    jwt.sign.mockReturnValue('token');
    const user = { id: 1, username: 'test', role: 'admin' };

    const result = generateToken(user);
    expect(result).toBe('token');
    expect(jwt.sign).toHaveBeenCalledWith(
      { userId: 1, username: 'test', role: 'admin' },
      'caminhar-com-deus-secret-key-2026',
      { expiresIn: '1h' }
    );
  });

  it('verifyToken deve retornar o payload se o token for válido', () => {
    jwt.verify.mockReturnValue({ userId: 1, username: 'test', role: 'admin' });
    const result = verifyToken('token');

    expect(result).toEqual({ userId: 1, username: 'test', role: 'admin' });
    expect(jwt.verify).toHaveBeenCalledWith('token', 'caminhar-com-deus-secret-key-2026');
  });

  it('verifyToken deve retornar null se o token for inválido', () => {
    jwt.verify.mockImplementation(() => { throw new Error('invalid token'); });
    const result = verifyToken('token');

    expect(result).toBeNull();
  });

  it('setAuthCookie deve adicionar o cookie ao response', () => {
    const { res } = createMocks();
    // Mock setHeader to be a jest function
    res.setHeader = jest.fn();
    setAuthCookie(res, 'token');

    expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', expect.stringContaining('token=token'));
  });

  it('getAuthCookie deve retornar o token do cookie', () => {
    const { req } = createMocks({ headers: { cookie: 'token=testToken' } });
    const result = getAuthCookie(req);

    expect(result).toBe('testToken');
  });

  it('getAuthCookie deve retornar undefined se não houver cookie', () => {
    const { req } = createMocks();
    const result = getAuthCookie(req);

    expect(result).toBeUndefined();
  });

  it('getAuthToken deve retornar o token do header Authorization', () => {
    const { req } = createMocks({ headers: { authorization: 'Bearer testToken' } });
    const result = getAuthToken(req);

    expect(result).toBe('testToken');
  });

  it('getAuthToken deve retornar o token do cookie se não houver header Authorization', () => {
    const { req } = createMocks({ headers: { cookie: 'token=testToken' } });
    const result = getAuthToken(req);

    expect(result).toBe('testToken');
  });

  it('authenticate deve retornar o usuário se as credenciais forem válidas', async () => {
    query.mockResolvedValue({ rows: [{ id: 1, username: 'test', password: 'hashedPassword' }] });
    bcrypt.compare.mockResolvedValue(true);

    const result = await authenticate('test', 'password');
    expect(result).toEqual({ id: 1, username: 'test', password: 'hashedPassword' });
  });

  it('authenticate deve retornar null se o usuário não existir', async () => {
    query.mockResolvedValue({ rows: [] });
    const result = await authenticate('test', 'password');

    expect(result).toBeNull();
  });

  it('authenticate deve retornar null se a senha for inválida', async () => {
    query.mockResolvedValue({ rows: [{ id: 1, username: 'test', password: 'hashedPassword' }] });
    bcrypt.compare.mockResolvedValue(false);

    const result = await authenticate('test', 'password');
    expect(result).toBeNull();
  });

  it('withAuth deve retornar 401 se não houver token', async () => {
    const { req, res } = createMocks();
    const handler = jest.fn();

    const result = await withAuth(handler)(req, res);
    expect(res.statusCode).toBe(401);
  });

  it('withAuth deve retornar 401 se o token for inválido', async () => {
    const { req, res } = createMocks({ headers: { cookie: 'token=invalidToken' } });
    jwt.verify.mockImplementation(() => { throw new Error('invalid token'); });

    const handler = jest.fn();
    const result = await withAuth(handler)(req, res);
    expect(res.statusCode).toBe(401);
  });

  it('withAuth deve chamar o handler se o token for válido', async () => {
    const { req, res } = createMocks({ headers: { cookie: 'token=validToken' } });
    jwt.verify.mockReturnValue({ userId: 1, username: 'test', role: 'admin' });

    const handler = jest.fn();
    await withAuth(handler)(req, res);
    expect(handler).toHaveBeenCalled();
    expect(req.user).toEqual({ userId: 1, username: 'test', role: 'admin' });
  });

  it('initializeAuth deve criar o usuário admin se ele não existir', async () => {
    query.mockResolvedValue({ rows: [] });
    bcrypt.hash.mockResolvedValue('hashedPassword');

    await initializeAuth();
    expect(query).toHaveBeenCalledWith(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING *',
      ['admin', 'hashedPassword', 'admin']
    );
  });

  it('initializeAuth deve tratar erros ao criar o usuário admin', async () => {
    query.mockRejectedValue(new Error('Erro ao criar usuário'));
    bcrypt.hash.mockResolvedValue('hashedPassword');

    await expect(initializeAuth()).rejects.toThrow(
      'Erro ao criar usuário'
    );
  });

  it('initializeAuth não deve criar o usuário admin se ele já existir', async () => {
    query.mockResolvedValue({ rows: [{ id: 1, username: 'admin' }] });
    await initializeAuth();

    expect(query).not.toHaveBeenCalledWith(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING *',
      ['admin', 'password', 'admin']
    );
  });
});