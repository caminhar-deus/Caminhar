import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

jest.mock('../../../../lib/cache/cache.js', () => ({
  checkRateLimit: jest.fn().mockResolvedValue(false),
}));

jest.mock('../../../../lib/auth/customer-auth.js', () => ({
  generateCustomerToken: jest.fn().mockReturnValue('mock-customer-token'),
  setCustomerAuthCookie: jest.fn(),
  clearCustomerAuthCookie: jest.fn(),
  getAuthenticatedCustomer: jest.fn(),
}));

jest.mock('../../../../lib/domain/customers.js', () => ({
  registerCustomer: jest.fn(),
  authenticateCustomer: jest.fn(),
  upsertGoogleCustomer: jest.fn(),
  getCustomerById: jest.fn(),
  updateCustomerProfile: jest.fn(),
}));

import handler from '../../../../pages/api/customer/auth.js';
import {
  setCustomerAuthCookie,
  clearCustomerAuthCookie,
  getAuthenticatedCustomer,
} from '../../../../lib/auth/customer-auth.js';
import {
  registerCustomer,
  authenticateCustomer,
  upsertGoogleCustomer,
  getCustomerById,
  updateCustomerProfile,
} from '../../../../lib/domain/customers.js';

describe('API Visitante/Cliente - Autenticação e Perfil (/api/customer/auth)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET - Perfil autenticado', () => {
    it('deve retornar authenticated: false se visitante não estiver autenticado', async () => {
      getAuthenticatedCustomer.mockReturnValue(null);

      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.authenticated).toBe(false);
      expect(data.customer).toBeNull();
    });

    it('deve retornar os dados do perfil autenticado com sucesso', async () => {
      getAuthenticatedCustomer.mockReturnValue({ customerId: 10, email: 'maria@test.com' });
      getCustomerById.mockResolvedValueOnce({
        id: 10,
        name: 'Maria Silva',
        email: 'maria@test.com',
        phone: '11999998888',
      });

      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.customer.name).toBe('Maria Silva');
    });
  });

  describe('POST - Registro, Login e Logout', () => {
    it('action=register: deve registrar novo visitante e setar cookie de auth', async () => {
      registerCustomer.mockResolvedValueOnce({
        id: 1,
        name: 'Novo Visitante',
        email: 'novo@test.com',
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          action: 'register',
          name: 'Novo Visitante',
          email: 'novo@test.com',
          password: 'senha_segura_123',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.customer.name).toBe('Novo Visitante');
      expect(setCustomerAuthCookie).toHaveBeenCalledWith(res, 'mock-customer-token');
    });

    it('action=register: deve retornar 409 se e-mail já estiver cadastrado', async () => {
      registerCustomer.mockRejectedValueOnce(new Error('EMAIL_ALREADY_REGISTERED'));

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          action: 'register',
          name: 'Visitante Repetido',
          email: 'repetido@test.com',
          password: 'senha_segura_123',
        },
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(409);
    });

    it('action=login: deve autenticar visitante com credenciais válidas', async () => {
      authenticateCustomer.mockResolvedValueOnce({
        id: 5,
        name: 'Visitante Ativo',
        email: 'ativo@test.com',
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          action: 'login',
          email: 'ativo@test.com',
          password: 'senhaValida',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.customer.id).toBe(5);
      expect(setCustomerAuthCookie).toHaveBeenCalledWith(res, 'mock-customer-token');
    });

    it('action=login: deve retornar 401 se credenciais forem inválidas', async () => {
      authenticateCustomer.mockResolvedValueOnce(null);

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          action: 'login',
          email: 'ativo@test.com',
          password: 'senhaIncorreta',
        },
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(401);
    });

    it('action=logout: deve limpar cookie de autenticação', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { action: 'logout' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(clearCustomerAuthCookie).toHaveBeenCalledWith(res);
    });

    it('action=google: deve vincular ou autenticar conta do Google', async () => {
      upsertGoogleCustomer.mockResolvedValueOnce({
        id: 20,
        name: 'Google User',
        email: 'google@gmail.com',
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          action: 'google',
          googleSub: 'sub-123456',
          email: 'google@gmail.com',
          name: 'Google User',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(upsertGoogleCustomer).toHaveBeenCalledWith(
        expect.objectContaining({ googleSub: 'sub-123456', email: 'google@gmail.com' })
      );
      expect(setCustomerAuthCookie).toHaveBeenCalledWith(res, 'mock-customer-token');
    });
  });

  describe('PUT - Atualização de perfil', () => {
    it('deve atualizar telefone e endereço padrão do visitante autenticado', async () => {
      getAuthenticatedCustomer.mockReturnValue({ customerId: 10, email: 'maria@test.com' });
      updateCustomerProfile.mockResolvedValueOnce({
        id: 10,
        name: 'Maria Silva',
        phone: '11988887777',
        default_address: { cep: '01001-000', street: 'Rua Direita', number: '10', neighborhood: 'Centro', city: 'São Paulo', state: 'SP' },
      });

      const { req, res } = createMocks({
        method: 'PUT',
        body: {
          phone: '11988887777',
          defaultAddress: {
            cep: '01001-000',
            street: 'Rua Direita',
            number: '10',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
          },
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.customer.phone).toBe('11988887777');
    });

    it('deve retornar 401 se tentar atualizar perfil sem estar autenticado', async () => {
      getAuthenticatedCustomer.mockReturnValue(null);

      const { req, res } = createMocks({
        method: 'PUT',
        body: { phone: '11988887777' },
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(401);
    });
  });

  describe('Métodos não permitidos', () => {
    it('deve retornar 405 para DELETE', async () => {
      const { req, res } = createMocks({ method: 'DELETE' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(405);
    });
  });
});
