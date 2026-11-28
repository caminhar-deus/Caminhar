import { describe, it, expect, jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import {
  generateCustomerToken,
  verifyCustomerToken,
  setCustomerAuthCookie,
  clearCustomerAuthCookie,
  getAuthenticatedCustomer,
} from '../../../../lib/auth/customer-auth.js';
import { generateToken, verifyToken } from '../../../../lib/auth/auth.js';

describe('Autenticação do Visitante — lib/auth/customer-auth.js', () => {
  const sampleCustomer = {
    id: 77,
    name: 'João Católico',
    email: 'joao@exemplo.com',
  };

  it('deve gerar e validar um JWT exclusivo de visitante com scope=customer', () => {
    const token = generateCustomerToken(sampleCustomer);
    const decoded = verifyCustomerToken(token);

    expect(decoded).toBeTruthy();
    expect(decoded.customerId).toBe(77);
    expect(decoded.email).toBe('joao@exemplo.com');
    expect(decoded.name).toBe('João Católico');
    expect(decoded.scope).toBe('customer');
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

    const cookieHeader = headers[0][1].split(';')[0];
    const req = { headers: { cookie: cookieHeader } };
    const authenticated = getAuthenticatedCustomer(req);
    expect(authenticated?.customerId).toBe(77);

    clearCustomerAuthCookie(res);
    expect(headers[1][1]).toContain('Max-Age=0');
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
    } finally {
      process.env.NODE_ENV = prevEnv;
      if (prevSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = prevSecret;
      jest.resetModules();
    }
  });
});
