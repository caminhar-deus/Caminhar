import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
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
import { checkRateLimit } from '../../../../lib/cache/cache.js';
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
  const originalGoogleClientId = process.env.GOOGLE_CLIENT_ID;
  const originalPublicGoogleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const originalAllowGoogleDevBypass = process.env.ALLOW_GOOGLE_DEV_BYPASS;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    delete process.env.ALLOW_GOOGLE_DEV_BYPASS;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    delete process.env.ALLOW_GOOGLE_DEV_BYPASS;
  });

  afterAll(() => {
    if (originalGoogleClientId === undefined) {
      delete process.env.GOOGLE_CLIENT_ID;
    } else {
      process.env.GOOGLE_CLIENT_ID = originalGoogleClientId;
    }
    if (originalPublicGoogleClientId === undefined) {
      delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    } else {
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = originalPublicGoogleClientId;
    }
    if (originalAllowGoogleDevBypass === undefined) {
      delete process.env.ALLOW_GOOGLE_DEV_BYPASS;
    } else {
      process.env.ALLOW_GOOGLE_DEV_BYPASS = originalAllowGoogleDevBypass;
    }
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

    it('action=google: deve vincular ou autenticar conta do Google quando ALLOW_GOOGLE_DEV_BYPASS=true fora de produção', async () => {
      process.env.ALLOW_GOOGLE_DEV_BYPASS = 'true';
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

  describe('POST - action=google com id_token RS256 (JWKS local)', () => {
    const KID = 'auth-int-key-1';
    let rsaKeyPair;
    let rsaPublicJwk;
    let otherKeyPair;
    let fakeNowMs = 1_700_000_000_000;
    let dateNowSpy;

    beforeAll(() => {
      rsaKeyPair = generateKeyPairSync('rsa', { modulusLength: 2048 });
      otherKeyPair = generateKeyPairSync('rsa', { modulusLength: 2048 });
      rsaPublicJwk = {
        ...rsaKeyPair.publicKey.export({ format: 'jwk' }),
        kid: KID,
        use: 'sig',
        alg: 'RS256',
      };
    });

    const mockJwksFetch = (jwks = [rsaPublicJwk], cacheControl = 'public, max-age=3600') =>
      jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: (name) => (String(name).toLowerCase() === 'cache-control' ? cacheControl : null),
        },
        json: async () => ({ keys: jwks }),
      });

    const signGoogleToken = (
      payloadOverrides = {},
      { privateKey = rsaKeyPair.privateKey, kid = KID, includeExp = true } = {}
    ) => {
      const nowSec = Math.floor(fakeNowMs / 1000);
      const payload = {
        aud: 'client-prod.apps.googleusercontent.com',
        iss: 'https://accounts.google.com',
        email_verified: 'true',
        sub: 'google-sub-default',
        email: 'user@gmail.com',
        iat: nowSec,
        ...(includeExp ? { exp: nowSec + 3600 } : {}),
        ...payloadOverrides,
      };
      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });
      return jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
        keyid: kid,
        noTimestamp: true,
      });
    };

    beforeEach(() => {
      fakeNowMs += 25 * 60 * 60 * 1000;
      dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => fakeNowMs);
      global.fetch = mockJwksFetch();
    });

    afterEach(() => {
      dateNowSpy?.mockRestore();
    });

    it('deve validar id_token RS256 via JWKS usando GOOGLE_CLIENT_ID, criar sessão e retornar 200', async () => {
      process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
      const jwksFetch = mockJwksFetch();
      global.fetch = jwksFetch;

      upsertGoogleCustomer.mockResolvedValueOnce({
        id: 31,
        name: 'Maria Silva',
        email: 'maria.silva@gmail.com',
      });

      const credential = signGoogleToken({
        sub: 'google-sub-001',
        email: 'Maria.Silva@gmail.com',
        name: 'Maria Silva',
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: { action: 'google', credential },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(jwksFetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v3/certs',
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
      upsertGoogleCustomer.mockResolvedValueOnce({
        id: 32,
        name: 'joao',
        email: 'joao@gmail.com',
      });

      const credential = signGoogleToken({
        aud: 'client-public.apps.googleusercontent.com',
        iss: 'accounts.google.com',
        email_verified: true,
        sub: 'google-sub-002',
        email: 'joao@gmail.com',
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: { action: 'google', credential },
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
        upsertGoogleCustomer.mockResolvedValueOnce({
          id: 33,
          name: 'warn',
          email: 'warn@gmail.com',
        });

        const credential = signGoogleToken({
          aud: serverClientId,
          sub: 'google-sub-warn',
          email: 'warn@gmail.com',
        });

        const { req, res } = createMocks({
          method: 'POST',
          body: { action: 'google', credential },
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

    it('deve falhar fechado (401), registrar erro de configuração em logger.error sem expor ID e sem chamar fetch quando nenhum Client ID está configurado', async () => {
      const noCallFetch = jest.fn();
      global.fetch = noCallFetch;
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

      try {
        const { req, res } = createMocks({
          method: 'POST',
          body: { action: 'google', credential: signGoogleToken() },
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(401);
        const data = JSON.parse(res._getData());
        expect(data.message).not.toContain('Verifique a configuração');
        expect(noCallFetch).not.toHaveBeenCalled();
        expect(upsertGoogleCustomer).not.toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalledWith(
          'CustomerAuth',
          'Erro de configuração na autenticação Google:',
          'GOOGLE_NOT_CONFIGURED'
        );
      } finally {
        warnSpy.mockRestore();
        errorSpy.mockRestore();
      }
    });

    it.each(['production', 'development', 'test'])(
      'deve bloquear atalho de desenvolvimento (googleSub + email sem credential) em NODE_ENV=%s sem ALLOW_GOOGLE_DEV_BYPASS=true',
      async (envName) => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = envName;
        const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
        const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
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
          expect(warnSpy).toHaveBeenCalledWith(
            'CustomerAuth',
            'Falha na autenticação Google:',
            'GOOGLE_NOT_CONFIGURED'
          );
          expect(errorSpy).toHaveBeenCalledWith(
            'CustomerAuth',
            'Erro de configuração na autenticação Google:',
            'GOOGLE_NOT_CONFIGURED'
          );
        } finally {
          warnSpy.mockRestore();
          errorSpy.mockRestore();
          process.env.NODE_ENV = originalEnv;
        }
      }
    );

    it('deve bloquear atalho de desenvolvimento em NODE_ENV=production mesmo com ALLOW_GOOGLE_DEV_BYPASS=true', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      process.env.ALLOW_GOOGLE_DEV_BYPASS = 'true';
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
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
        warnSpy.mockRestore();
        errorSpy.mockRestore();
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('deve registrar INVALID_GOOGLE_TOKEN (e não GOOGLE_NOT_CONFIGURED) quando Client ID estiver configurado mas credential for omitido', async () => {
      process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
      try {
        const { req, res } = createMocks({
          method: 'POST',
          body: {
            action: 'google',
            googleSub: 'sub-dev-only',
            email: 'bypass@gmail.com',
          },
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(401);
        expect(upsertGoogleCustomer).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledWith(
          'CustomerAuth',
          'Falha na autenticação Google:',
          'INVALID_GOOGLE_TOKEN'
        );
        expect(errorSpy).not.toHaveBeenCalled();
      } finally {
        warnSpy.mockRestore();
        errorSpy.mockRestore();
      }
    });

    it('deve retornar 401 e registrar erro de configuração em logger.error sem vazar Client IDs quando aud for divergente', async () => {
      const serverClientId = 'client-prod.apps.googleusercontent.com';
      const wrongClientId = 'outro-client.apps.googleusercontent.com';
      process.env.GOOGLE_CLIENT_ID = serverClientId;
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

      try {
        const { req, res } = createMocks({
          method: 'POST',
          body: {
            action: 'google',
            credential: signGoogleToken({ aud: wrongClientId }),
          },
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(401);
        const data = JSON.parse(res._getData());
        expect(data.message).not.toContain('Verifique a configuração');
        expect(upsertGoogleCustomer).not.toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalledWith(
          'CustomerAuth',
          'Erro de configuração na autenticação Google:',
          'GOOGLE_AUDIENCE_MISMATCH'
        );
        const loggedArgs = errorSpy.mock.calls.flat().join(' ');
        expect(loggedArgs).not.toContain(serverClientId);
        expect(loggedArgs).not.toContain(wrongClientId);
      } finally {
        warnSpy.mockRestore();
        errorSpy.mockRestore();
      }
    });

    it('deve retornar 401 quando iss for inválido', async () => {
      process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          action: 'google',
          credential: signGoogleToken({ iss: 'https://evil.example.com' }),
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(upsertGoogleCustomer).not.toHaveBeenCalled();
    });

    it('deve retornar 401 quando email_verified for falso', async () => {
      process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          action: 'google',
          credential: signGoogleToken({ email_verified: 'false' }),
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(upsertGoogleCustomer).not.toHaveBeenCalled();
    });

    it('deve retornar 401 para assinatura inválida ou algoritmo não-RS256 (HS256)', async () => {
      process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';

      const invalidSigToken = signGoogleToken({}, { privateKey: otherKeyPair.privateKey });
      const { req: req1, res: res1 } = createMocks({
        method: 'POST',
        body: { action: 'google', credential: invalidSigToken },
      });
      await handler(req1, res1);
      expect(res1._getStatusCode()).toBe(401);

      const hs256Token = jwt.sign(
        {
          aud: 'client-prod.apps.googleusercontent.com',
          iss: 'https://accounts.google.com',
          email_verified: true,
          sub: 'sub-hs',
          email: 'hs@gmail.com',
          exp: Math.floor(fakeNowMs / 1000) + 3600,
        },
        'hs-secret',
        { algorithm: 'HS256', keyid: KID }
      );
      const { req: req2, res: res2 } = createMocks({
        method: 'POST',
        body: { action: 'google', credential: hs256Token },
      });
      await handler(req2, res2);
      expect(res2._getStatusCode()).toBe(401);
      expect(upsertGoogleCustomer).not.toHaveBeenCalled();
    });

    it.each([
      ['passado', { exp: -60 }],
      ['ausente', { includeExp: false }],
    ])('deve retornar 401 (fail-closed) quando exp for %s', async (_label, opts) => {
      process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
      const nowSec = Math.floor(fakeNowMs / 1000);
      const credential =
        opts.includeExp === false
          ? signGoogleToken({}, { includeExp: false })
          : signGoogleToken({ exp: nowSec + opts.exp });

      const { req, res } = createMocks({
        method: 'POST',
        body: { action: 'google', credential },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(upsertGoogleCustomer).not.toHaveBeenCalled();
    });

    it.each([
      ['sub ausente', { sub: '' }],
      ['email ausente', { email: '' }],
    ])('deve retornar 401 quando %s no payload do token', async (_label, overrides) => {
      process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';

      const { req, res } = createMocks({
        method: 'POST',
        body: { action: 'google', credential: signGoogleToken(overrides) },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      expect(upsertGoogleCustomer).not.toHaveBeenCalled();
    });

    it.each([
      ['TimeoutError', () => Object.assign(new Error('Timed out'), { name: 'TimeoutError' })],
      ['AbortError', () => Object.assign(new Error('Aborted'), { name: 'AbortError' })],
      ['TypeError (erro de rede)', () => new TypeError('fetch failed')],
    ])('deve retornar 503 quando a consulta ao JWKS falhar com %s', async (_label, makeErr) => {
      process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
      global.fetch = jest.fn().mockRejectedValueOnce(makeErr());

      const { req, res } = createMocks({
        method: 'POST',
        body: { action: 'google', credential: signGoogleToken() },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(503);
      expect(upsertGoogleCustomer).not.toHaveBeenCalled();
    });

    it('deve retornar 503 quando o endpoint JWKS responder com HTTP 500', async () => {
      process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: { action: 'google', credential: signGoogleToken() },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(503);
      expect(upsertGoogleCustomer).not.toHaveBeenCalled();
    });

    it('deve retornar 500 (e não 401) quando upsertGoogleCustomer falhar no banco após token válido', async () => {
      process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
      upsertGoogleCustomer.mockRejectedValueOnce(new Error('DB connection lost'));
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

      try {
        const { req, res } = createMocks({
          method: 'POST',
          body: {
            action: 'google',
            credential: signGoogleToken({
              sub: 'google-sub-db-err',
              email: 'dberr@gmail.com',
              name: 'DB Error User',
            }),
          },
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(500);
        expect(errorSpy).toHaveBeenCalledWith(
          'CustomerAuth',
          'Erro na rota de autenticação do visitante:',
          expect.any(Error)
        );
      } finally {
        errorSpy.mockRestore();
      }
    });

    it('deve retornar 409 quando upsertGoogleCustomer detectar conflito de vínculo de conta Google (GOOGLE_ACCOUNT_CONFLICT)', async () => {
      process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
      const conflictErr = Object.assign(new Error('GOOGLE_ACCOUNT_CONFLICT'), {
        code: 'GOOGLE_ACCOUNT_CONFLICT',
      });
      upsertGoogleCustomer.mockRejectedValueOnce(conflictErr);
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

      try {
        const { req, res } = createMocks({
          method: 'POST',
          body: {
            action: 'google',
            credential: signGoogleToken({
              sub: 'google-sub-conflict',
              email: 'conflict@gmail.com',
              name: 'Conflict User',
            }),
          },
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(409);
        expect(setCustomerAuthCookie).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledWith(
          'CustomerAuth',
          'Conflito de vínculo de conta Google:',
          'GOOGLE_ACCOUNT_CONFLICT'
        );
      } finally {
        warnSpy.mockRestore();
      }
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

    it('deve retornar 429 no PUT quando exceder o rate limit do perfil', async () => {
      getAuthenticatedCustomer.mockReturnValue({ customerId: 10, email: 'maria@test.com' });
      checkRateLimit.mockResolvedValueOnce(true);

      const { req, res } = createMocks({
        method: 'PUT',
        body: { phone: '11988887777' },
        socket: { remoteAddress: '203.0.113.46' },
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(429);
      expect(updateCustomerProfile).not.toHaveBeenCalled();
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
