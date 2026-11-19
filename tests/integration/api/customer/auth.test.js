import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
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
import { logger } from '../../../../lib/infra/logger.js';
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
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
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

  describe('POST - action=google com id_token (verifyGoogleCredential)', () => {
    const futureExp = String(Math.floor(Date.now() / 1000) + 3600);

    const buildTokenInfo = (overrides = {}) => ({
      aud: 'client-prod.apps.googleusercontent.com',
      iss: 'https://accounts.google.com',
      email_verified: 'true',
      sub: 'google-sub-default',
      email: 'user@gmail.com',
      exp: futureExp,
      ...overrides,
    });

    it('deve validar id_token no tokeninfo usando GOOGLE_CLIENT_ID, criar sessão e retornar 200', async () => {
      process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () =>
          buildTokenInfo({
            sub: 'google-sub-001',
            email: 'Maria.Silva@gmail.com',
            name: 'Maria Silva',
          }),
      });
      upsertGoogleCustomer.mockResolvedValueOnce({
        id: 31,
        name: 'Maria Silva',
        email: 'maria.silva@gmail.com',
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: { action: 'google', credential: 'valid.google.jwt' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/tokeninfo?id_token=valid.google.jwt',
        expect.any(Object)
      );
      expect(upsertGoogleCustomer).toHaveBeenCalledWith({
        googleSub: 'google-sub-001',
        email: 'maria.silva@gmail.com',
        name: 'Maria Silva',
      });
      expect(setCustomerAuthCookie).toHaveBeenCalledWith(res, 'mock-customer-token');
    });

    it('deve aceitar fallback para NEXT_PUBLIC_GOOGLE_CLIENT_ID quando GOOGLE_CLIENT_ID estiver ausente', async () => {
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'client-public.apps.googleusercontent.com';
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () =>
          buildTokenInfo({
            aud: 'client-public.apps.googleusercontent.com',
            iss: 'accounts.google.com',
            email_verified: true,
            sub: 'google-sub-002',
            email: 'joao@gmail.com',
          }),
      });
      upsertGoogleCustomer.mockResolvedValueOnce({
        id: 32,
        name: 'joao',
        email: 'joao@gmail.com',
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: { action: 'google', credential: 'valid.fallback.jwt' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(upsertGoogleCustomer).toHaveBeenCalledWith({
        googleSub: 'google-sub-002',
        email: 'joao@gmail.com',
        name: 'joao',
      });
      expect(setCustomerAuthCookie).toHaveBeenCalledWith(res, 'mock-customer-token');
    });

    it('deve priorizar GOOGLE_CLIENT_ID e emitir warning sem vazar valores quando diferir de NEXT_PUBLIC_GOOGLE_CLIENT_ID', async () => {
      const serverClientId = 'server-secret-client.apps.googleusercontent.com';
      const publicClientId = 'public-mismatch-client.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_ID = serverClientId;
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = publicClientId;

      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      try {
        global.fetch = jest.fn().mockResolvedValueOnce({
          ok: true,
          json: async () =>
            buildTokenInfo({
              aud: serverClientId,
              sub: 'google-sub-warn',
              email: 'warn@gmail.com',
            }),
        });
        upsertGoogleCustomer.mockResolvedValueOnce({
          id: 33,
          name: 'warn',
          email: 'warn@gmail.com',
        });

        const { req, res } = createMocks({
          method: 'POST',
          body: { action: 'google', credential: 'valid.mismatch-env.jwt' },
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(200);
        expect(warnSpy).toHaveBeenCalledWith(
          'CustomerAuth',
          expect.stringContaining('possuem valores diferentes')
        );
        const loggedArgs = warnSpy.mock.calls.flat().join(' ');
        expect(loggedArgs).not.toContain(serverClientId);
        expect(loggedArgs).not.toContain(publicClientId);
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('deve falhar fechado (401) sem chamar fetch quando nenhum Client ID está configurado', async () => {
      global.fetch = jest.fn();

      const { req, res } = createMocks({
        method: 'POST',
        body: { action: 'google', credential: 'valid.google.jwt' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(upsertGoogleCustomer).not.toHaveBeenCalled();
    });

    it('deve bloquear atalho de desenvolvimento (googleSub + email sem credential) em NODE_ENV=production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        const { req, res } = createMocks({
          method: 'POST',
          body: {
            action: 'google',
            googleSub: 'sub-dev-only',
            email: 'bypass@gmail.com',
            name: 'Dev Bypass',
          },
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(401);
        expect(upsertGoogleCustomer).not.toHaveBeenCalled();
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('deve retornar 401 quando aud for divergente do Client ID esperado', async () => {
      process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => buildTokenInfo({ aud: 'outro-client.apps.googleusercontent.com' }),
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: { action: 'google', credential: 'wrong-aud.jwt' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(upsertGoogleCustomer).not.toHaveBeenCalled();
    });

    it('deve retornar 401 quando iss for inválido', async () => {
      process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => buildTokenInfo({ iss: 'https://evil.example.com' }),
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: { action: 'google', credential: 'wrong-iss.jwt' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(upsertGoogleCustomer).not.toHaveBeenCalled();
    });

    it('deve retornar 401 quando email_verified for falso ou ausente', async () => {
      process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => buildTokenInfo({ email_verified: 'false' }),
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: { action: 'google', credential: 'unverified-email.jwt' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(upsertGoogleCustomer).not.toHaveBeenCalled();
    });

    it.each([
      ['passado', String(Math.floor(Date.now() / 1000) - 60)],
      ['ausente', undefined],
      ['zero', '0'],
      ['não numérico', 'not-a-number'],
    ])('deve retornar 401 (fail-closed) quando exp for %s', async (_label, expValue) => {
      process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => buildTokenInfo({ exp: expValue }),
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: { action: 'google', credential: 'invalid-exp.jwt' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(upsertGoogleCustomer).not.toHaveBeenCalled();
    });

    it.each([
      ['sub ausente', { sub: '' }],
      ['email ausente', { email: '' }],
    ])('deve retornar 401 quando %s no tokeninfo', async (_label, overrides) => {
      process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => buildTokenInfo(overrides),
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: { action: 'google', credential: 'incomplete-profile.jwt' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(upsertGoogleCustomer).not.toHaveBeenCalled();
    });

    it('deve retornar 401 quando /tokeninfo responder com status HTTP 400', async () => {
      process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: { action: 'google', credential: 'invalid-tokeninfo.jwt' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(upsertGoogleCustomer).not.toHaveBeenCalled();
    });

    it.each(['TimeoutError', 'AbortError'])(
      'deve retornar 503 quando a consulta ao /tokeninfo falhar com %s',
      async (errorName) => {
        process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
        const abortOrTimeout = new Error(`Fetch failed: ${errorName}`);
        abortOrTimeout.name = errorName;
        global.fetch = jest.fn().mockRejectedValueOnce(abortOrTimeout);

        const { req, res } = createMocks({
          method: 'POST',
          body: { action: 'google', credential: `${errorName}.jwt` },
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(503);
        expect(upsertGoogleCustomer).not.toHaveBeenCalled();
      }
    );
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
