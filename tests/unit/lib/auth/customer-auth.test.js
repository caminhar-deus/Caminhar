import { describe, it, expect, jest } from '@jest/globals';
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
});
