import { describe, it, expect, jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { createHash } from 'node:crypto';
import {
  generateCustomerToken,
  verifyCustomerToken,
  setCustomerAuthCookie,
  clearCustomerAuthCookie,
  getAuthenticatedCustomer,
  generateCustomerRefreshToken,
  hashCustomerRefreshToken,
  setCustomerRefreshCookie,
  clearCustomerRefreshCookie,
  getCustomerRefreshTokenCookie,
} from '../../../../lib/auth/customer-auth.js';
import { generateToken, verifyToken } from '../../../../lib/auth/auth.js';

describe('Autenticação do Visitante — lib/auth/customer-auth.js', () => {
  const sampleCustomer = {
    id: 77,
    name: 'João Católico',
    email: 'joao@exemplo.com',
  };

  it('deve gerar e validar um JWT exclusivo de visitante com scope=customer e expiração de 1h', () => {
    const token = generateCustomerToken(sampleCustomer);
    const decoded = verifyCustomerToken(token);

    expect(decoded).toBeTruthy();
    expect(decoded.customerId).toBe(77);
    expect(decoded.email).toBe('joao@exemplo.com');
    expect(decoded.name).toBe('João Católico');
    expect(decoded.scope).toBe('customer');
    expect(decoded.exp - decoded.iat).toBe(3600);
  });

  it('deve impedir que o verifyToken administrativo aceite um token de visitante (isolamento estrito)', () => {
    const customerToken = generateCustomerToken(sampleCustomer);
    expect(verifyToken(customerToken)).toBeNull();
  });

  it('deve impedir que verifyCustomerToken aceite um token administrativo de /admin', () => {
    const adminToken = generateToken({ id: 1, username: 'admin', role: 'admin' });
    expect(verifyCustomerToken(adminToken)).toBeNull();
  });

  it('deve gravar, ler e limpar o cookie customerToken corretamente', () => {
    const headers = [];
    const res = {
      appendHeader: jest.fn((name, val) => headers.push([name, val])),
    };

    const token = generateCustomerToken(sampleCustomer);
    setCustomerAuthCookie(res, token);

    expect(res.appendHeader).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining('customerToken=')
    );
    expect(headers[0][1]).toContain('Max-Age=3600');
    expect(headers[0][1]).toContain('SameSite=Lax');

    const cookieHeader = headers[0][1].split(';')[0];
    const req = { headers: { cookie: cookieHeader } };
    const authenticated = getAuthenticatedCustomer(req);
    expect(authenticated?.customerId).toBe(77);

    clearCustomerAuthCookie(res);
    expect(headers[1][1]).toContain('Max-Age=0');
  });

  it('deve gerar refresh token opaco seguro, gerar hash SHA-256 canônico e validar formato bruto', () => {
    const raw1 = generateCustomerRefreshToken();
    const raw2 = generateCustomerRefreshToken();

    expect(raw1).toMatch(/^[a-f0-9]{96}$/);
    expect(raw2).toMatch(/^[a-f0-9]{96}$/);
    expect(raw1).not.toBe(raw2);

    const expectedDigest = createHash('sha256').update(raw1).digest('hex');
    expect(hashCustomerRefreshToken(raw1)).toBe(expectedDigest);
    expect(hashCustomerRefreshToken(raw1.toUpperCase())).toBe(expectedDigest);
    expect(hashCustomerRefreshToken(raw1)).toMatch(/^[a-f0-9]{64}$/);

    expect(hashCustomerRefreshToken('')).toBeNull();
    expect(hashCustomerRefreshToken(null)).toBeNull();
    expect(hashCustomerRefreshToken(12345)).toBeNull();
    expect(hashCustomerRefreshToken('abc')).toBeNull();
    expect(hashCustomerRefreshToken('z'.repeat(96))).toBeNull();
  });

  it('deve gravar, ler e limpar o cookie customerRefreshToken com HttpOnly, SameSite=Strict e Path=/api/customer/auth', () => {
    const headers = [];
    const res = {
      appendHeader: jest.fn((name, val) => headers.push([name, val])),
    };

    const refreshToken = generateCustomerRefreshToken();
    setCustomerRefreshCookie(res, refreshToken);

    expect(headers[0][1]).toContain(`customerRefreshToken=${refreshToken}`);
    expect(headers[0][1]).toContain('HttpOnly');
    expect(headers[0][1]).toContain('SameSite=Strict');
    expect(headers[0][1]).toContain('Max-Age=2592000');
    expect(headers[0][1]).toContain('Path=/api/customer/auth');

    const cookiePair = headers[0][1].split(';')[0];
    expect(getCustomerRefreshTokenCookie({ headers: { cookie: `outro=1; ${cookiePair}` } })).toBe(
      refreshToken
    );
    expect(getCustomerRefreshTokenCookie({ headers: { cookie: 'customerToken=abc' } })).toBeNull();
    expect(getCustomerRefreshTokenCookie({})).toBeNull();
    expect(getCustomerRefreshTokenCookie(null)).toBeNull();

    clearCustomerRefreshCookie(res);
    expect(headers[1][1]).toContain('customerRefreshToken=');
    expect(headers[1][1]).toContain('Max-Age=0');
    expect(headers[1][1]).toContain('Path=/api/customer/auth');
  });

  it('deve rejeitar token vazio/inválido, ignorar cookies malformados e devolver null sem headers', () => {
    expect(verifyCustomerToken('')).toBeNull();
    expect(verifyCustomerToken(null)).toBeNull();
    expect(verifyCustomerToken('token.invalido.aqui')).toBeNull();
    expect(getAuthenticatedCustomer({})).toBeNull();
    expect(getAuthenticatedCustomer(null)).toBeNull();

    const token = generateCustomerToken(sampleCustomer);
    const req = {
      headers: {
        cookie: `sem_igual; outro=1; quebrado=%E0%A4%A; =semNome; customerToken=${encodeURIComponent(token)}`,
      },
    };
    expect(getAuthenticatedCustomer(req)?.customerId).toBe(77);

    const brokenTokenReq = { headers: { cookie: 'customerToken=%E0%A4%A' } };
    expect(getAuthenticatedCustomer(brokenTokenReq)).toBeNull();
  });

  it('deve assinar explicitamente com HS256 e rejeitar tokens assinados com outro algoritmo (ex.: HS384)', async () => {
    const prevEnv = process.env.NODE_ENV;
    const prevSecret = process.env.JWT_SECRET;

    try {
      process.env.NODE_ENV = 'test';
      process.env.JWT_SECRET = 'explicit-hs256-test-secret';
      jest.resetModules();

      const authMod = await import('../../../../lib/auth/customer-auth.js');
      const token = authMod.generateCustomerToken(sampleCustomer);
      const decodedComplete = jwt.decode(token, { complete: true });
      expect(decodedComplete?.header?.alg).toBe('HS256');
      expect(authMod.verifyCustomerToken(token)?.customerId).toBe(77);

      const hs384Token = jwt.sign(
        { customerId: 77, email: sampleCustomer.email, name: sampleCustomer.name, scope: 'customer' },
        'explicit-hs256-test-secret',
        { algorithm: 'HS384' }
      );
      expect(authMod.verifyCustomerToken(hs384Token)).toBeNull();

      const expiredToken = jwt.sign(
        { customerId: 77, email: sampleCustomer.email, name: sampleCustomer.name, scope: 'customer' },
        'explicit-hs256-test-secret',
        { algorithm: 'HS256', expiresIn: -10 }
      );
      expect(authMod.verifyCustomerToken(expiredToken)).toBeNull();
    } finally {
      process.env.NODE_ENV = prevEnv;
      if (prevSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = prevSecret;
      jest.resetModules();
    }
  });

  it('deve exigir JWT_SECRET em produção (fail-closed) e adicionar Secure no cookie quando NODE_ENV=production', async () => {
    const prevEnv = process.env.NODE_ENV;
    const prevSecret = process.env.JWT_SECRET;

    try {
      delete process.env.JWT_SECRET;
      process.env.NODE_ENV = 'production';
      jest.resetModules();

      await expect(import('../../../../lib/auth/customer-auth.js')).rejects.toThrow(
        'JWT_SECRET environment variable is required outside development/test environments'
      );

      process.env.JWT_SECRET = 'prod-explicit-secret-test';
      jest.resetModules();
      const prodAuth = await import('../../../../lib/auth/customer-auth.js');

      const headers = [];
      const res = { appendHeader: jest.fn((name, val) => headers.push([name, val])) };
      const token = prodAuth.generateCustomerToken(sampleCustomer);
      expect(prodAuth.verifyCustomerToken(token)?.customerId).toBe(77);

      prodAuth.setCustomerAuthCookie(res, token);
      expect(headers[0][1]).toContain('; Secure');
      expect(headers[0][1]).toContain('; HttpOnly');

      const refresh = prodAuth.generateCustomerRefreshToken();
      prodAuth.setCustomerRefreshCookie(res, refresh);
      expect(headers[1][1]).toContain('; Secure');
      expect(headers[1][1]).toContain('; HttpOnly');
      expect(headers[1][1]).toContain('; SameSite=Strict');
      expect(headers[1][1]).toContain('; Path=/api/customer/auth');
    } finally {
      process.env.NODE_ENV = prevEnv;
      if (prevSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = prevSecret;
      jest.resetModules();
    }
  });
});
