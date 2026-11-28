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
  generateCustomerRefreshToken: jest.fn().mockReturnValue('a'.repeat(96)),
  hashCustomerRefreshToken: jest.fn((raw) =>
    typeof raw === 'string' && /^[a-f0-9]{96}$/i.test(raw) ? `hash_${raw.toLowerCase()}` : null
  ),
  setCustomerRefreshCookie: jest.fn(),
  clearCustomerRefreshCookie: jest.fn(),
  getCustomerRefreshTokenCookie: jest.fn().mockReturnValue(null),
}));

jest.mock('../../../../lib/domain/customers.js', () => ({
  registerCustomer: jest.fn(),
  authenticateCustomer: jest.fn(),
  upsertGoogleCustomer: jest.fn(),
  getCustomerById: jest.fn(),
  updateCustomerProfile: jest.fn(),
  storeCustomerRefreshToken: jest.fn().mockResolvedValue({ id: 1 }),
  validateCustomerRefreshToken: jest.fn().mockResolvedValue(null),
  consumeCustomerRefreshToken: jest.fn().mockResolvedValue(null),
  revokeCustomerRefreshToken: jest.fn().mockResolvedValue(true),
}));

import handler from '../../../../pages/api/customer/auth.js';
import { checkRateLimit } from '../../../../lib/cache/cache.js';
import { logger } from '../../../../lib/infra/logger.js';
import {
  generateCustomerToken,
  setCustomerAuthCookie,
  clearCustomerAuthCookie,
  getAuthenticatedCustomer,
  generateCustomerRefreshToken,
  hashCustomerRefreshToken,
  setCustomerRefreshCookie,
  clearCustomerRefreshCookie,
  getCustomerRefreshTokenCookie,
} from '../../../../lib/auth/customer-auth.js';
import {
  registerCustomer,
  authenticateCustomer,
  upsertGoogleCustomer,
  getCustomerById,
  updateCustomerProfile,
  storeCustomerRefreshToken,
  validateCustomerRefreshToken,
  consumeCustomerRefreshToken,
  revokeCustomerRefreshToken,
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

    it('deve limpar cookies e retornar authenticated: false quando cliente não existir mais no banco', async () => {
      getAuthenticatedCustomer.mockReturnValue({ customerId: 999, email: 'removido@test.com' });
      getCustomerById.mockResolvedValueOnce(null);

      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(clearCustomerAuthCookie).toHaveBeenCalledWith(res);
      expect(clearCustomerRefreshCookie).toHaveBeenCalledWith(res);
      expect(JSON.parse(res._getData())).toEqual({ authenticated: false, customer: null });
    });

    it('deve renovar customerToken de forma idempotente quando houver customerRefreshToken válido e não rotacionar em GET', async () => {
      const validRefresh = 'b'.repeat(96);
      getAuthenticatedCustomer.mockReturnValueOnce(null);
      getCustomerRefreshTokenCookie.mockReturnValueOnce(validRefresh);
      validateCustomerRefreshToken.mockResolvedValueOnce({
        id: 15,
        customer_id: 42,
        expires_at: new Date(Date.now() + 86400000),
      });
      getCustomerById.mockResolvedValueOnce({
        id: 42,
        name: 'Maria Renovada',
        email: 'maria.renovada@test.com',
      });

      const { req, res } = createMocks({ method: 'GET' });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(validateCustomerRefreshToken).toHaveBeenCalledWith(`hash_${validRefresh}`);
      expect(consumeCustomerRefreshToken).not.toHaveBeenCalled();
      expect(setCustomerRefreshCookie).not.toHaveBeenCalled();
      expect(generateCustomerToken).toHaveBeenCalledWith(
        expect.objectContaining({ id: 42, email: 'maria.renovada@test.com' })
      );
      expect(setCustomerAuthCookie).toHaveBeenCalledWith(res, 'mock-customer-token');
      expect(JSON.parse(res._getData())).toEqual({
        authenticated: true,
        customer: { id: 42, name: 'Maria Renovada', email: 'maria.renovada@test.com' },
      });
    });

    it('deve limpar cookies em GET quando customerRefreshToken tiver formato inválido, estiver revogado ou cliente não existir', async () => {
      getAuthenticatedCustomer.mockReturnValueOnce(null);
      getCustomerRefreshTokenCookie.mockReturnValueOnce('token-curto-invalido');
      const { req: badFmtReq, res: badFmtRes } = createMocks({ method: 'GET' });
      await handler(badFmtReq, badFmtRes);
      expect(badFmtRes._getStatusCode()).toBe(200);
      expect(validateCustomerRefreshToken).not.toHaveBeenCalled();
      expect(clearCustomerAuthCookie).toHaveBeenCalledWith(badFmtRes);
      expect(clearCustomerRefreshCookie).toHaveBeenCalledWith(badFmtRes);
      expect(JSON.parse(badFmtRes._getData())).toEqual({ authenticated: false, customer: null });

      const deadRefresh = 'c'.repeat(96);
      getAuthenticatedCustomer.mockReturnValueOnce(null);
      getCustomerRefreshTokenCookie.mockReturnValueOnce(deadRefresh);
      validateCustomerRefreshToken.mockResolvedValueOnce(null);
      const { req: deadReq, res: deadRes } = createMocks({ method: 'GET' });
      await handler(deadReq, deadRes);
      expect(deadRes._getStatusCode()).toBe(200);
      expect(clearCustomerAuthCookie).toHaveBeenCalledWith(deadRes);
      expect(clearCustomerRefreshCookie).toHaveBeenCalledWith(deadRes);

      getAuthenticatedCustomer.mockReturnValueOnce(null);
      getCustomerRefreshTokenCookie.mockReturnValueOnce(deadRefresh);
      validateCustomerRefreshToken.mockResolvedValueOnce({ id: 16, customer_id: 999 });
      getCustomerById.mockResolvedValueOnce(null);
      const { req: ghostReq, res: ghostRes } = createMocks({ method: 'GET' });
      await handler(ghostReq, ghostRes);
      expect(ghostRes._getStatusCode()).toBe(200);
      expect(clearCustomerAuthCookie).toHaveBeenCalledWith(ghostRes);
      expect(clearCustomerRefreshCookie).toHaveBeenCalledWith(ghostRes);
    });
  });

  describe('GET e PUT - Cabeçalhos de cache, Rate Limit e conta inexistente', () => {
    it('GET deve definir Cache-Control no-store, private e retornar 429 quando rate limit bloquear', async () => {
      const { req: okReq, res: okRes } = createMocks({ method: 'GET' });
      await handler(okReq, okRes);
      expect(okRes._getStatusCode()).toBe(200);
      expect(okRes._getHeaders()['cache-control']).toBe('no-store, private');
      expect(checkRateLimit).toHaveBeenCalledWith(expect.any(String), 'api:customer:session', 120, 60000);

      getAuthenticatedCustomer.mockClear();
      checkRateLimit.mockResolvedValueOnce(true);
      const { req: rlReq, res: rlRes } = createMocks({
        method: 'GET',
        socket: { remoteAddress: '198.51.100.77' },
      });
      await handler(rlReq, rlRes);

      expect(rlRes._getStatusCode()).toBe(429);
      expect(rlRes._getHeaders()['cache-control']).toBe('no-store, private');
      expect(getAuthenticatedCustomer).not.toHaveBeenCalled();
    });

    it('PUT deve definir Cache-Control no-store, private, limpar cookies e retornar 404 quando visitante não existir', async () => {
      getAuthenticatedCustomer.mockReturnValueOnce({ customerId: 999 });
      updateCustomerProfile.mockResolvedValueOnce(null);

      const { req, res } = createMocks({
        method: 'PUT',
        body: { name: 'Visitante Removido' },
      });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(404);
      expect(res._getHeaders()['cache-control']).toBe('no-store, private');
      expect(clearCustomerAuthCookie).toHaveBeenCalledWith(res);
      expect(clearCustomerRefreshCookie).toHaveBeenCalledWith(res);
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
      expect(storeCustomerRefreshToken).toHaveBeenCalledWith(1, `hash_${'a'.repeat(96)}`);
      expect(setCustomerRefreshCookie).toHaveBeenCalledWith(res, 'a'.repeat(96));
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
      expect(storeCustomerRefreshToken).toHaveBeenCalledWith(5, `hash_${'a'.repeat(96)}`);
      expect(setCustomerRefreshCookie).toHaveBeenCalledWith(res, 'a'.repeat(96));
    });

    it('action=login: não deve bloquear o login se a gravação do refresh token falhar ou hash resultar nulo', async () => {
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
      try {
        authenticateCustomer.mockResolvedValueOnce({
          id: 6,
          name: 'Visitante Resiliente',
          email: 'resiliente@test.com',
        });
        storeCustomerRefreshToken.mockRejectedValueOnce(new Error('DB write timeout'));

        const { req, res } = createMocks({
          method: 'POST',
          body: { action: 'login', email: 'resiliente@test.com', password: 'senhaValida' },
        });
        await handler(req, res);

        expect(res._getStatusCode()).toBe(200);
        expect(setCustomerAuthCookie).toHaveBeenCalledWith(res, 'mock-customer-token');
        expect(setCustomerRefreshCookie).not.toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalledWith(
          'CustomerAuth',
          'Falha ao armazenar refresh token do visitante:',
          expect.any(Error)
        );

        authenticateCustomer.mockResolvedValueOnce({
          id: 7,
          name: 'Visitante Sem Hash',
          email: 'semhash@test.com',
        });
        hashCustomerRefreshToken.mockReturnValueOnce(null);
        const { req: req2, res: res2 } = createMocks({
          method: 'POST',
          body: { action: 'login', email: 'semhash@test.com', password: 'senhaValida' },
        });
        await handler(req2, res2);
        expect(res2._getStatusCode()).toBe(200);
        expect(setCustomerAuthCookie).toHaveBeenCalledWith(res2, 'mock-customer-token');
        expect(setCustomerRefreshCookie).not.toHaveBeenCalled();
      } finally {
        errorSpy.mockRestore();
      }
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

    it('action=logout: deve revogar refresh token no banco, limpar ambos os cookies e tolerar falha transitória na revogação', async () => {
      const validRefresh = 'd'.repeat(96);
      getCustomerRefreshTokenCookie.mockReturnValueOnce(validRefresh);

      const { req, res } = createMocks({
        method: 'POST',
        body: { action: 'logout' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(checkRateLimit).toHaveBeenCalledWith(expect.any(String), 'api:customer:logout', 30, 60000);
      expect(revokeCustomerRefreshToken).toHaveBeenCalledWith(`hash_${validRefresh}`);
      expect(clearCustomerAuthCookie).toHaveBeenCalledWith(res);
      expect(clearCustomerRefreshCookie).toHaveBeenCalledWith(res);

      // Sem cookie não consulta banco e ainda limpa cookies
      revokeCustomerRefreshToken.mockClear();
      getCustomerRefreshTokenCookie.mockReturnValueOnce(null);
      const { req: reqNoCookie, res: resNoCookie } = createMocks({
        method: 'POST',
        body: { action: 'logout' },
      });
      await handler(reqNoCookie, resNoCookie);
      expect(resNoCookie._getStatusCode()).toBe(200);
      expect(revokeCustomerRefreshToken).not.toHaveBeenCalled();
      expect(clearCustomerAuthCookie).toHaveBeenCalledWith(resNoCookie);
      expect(clearCustomerRefreshCookie).toHaveBeenCalledWith(resNoCookie);

      // Falha ao revogar no banco não impede o logout
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      try {
        getCustomerRefreshTokenCookie.mockReturnValueOnce(validRefresh);
        revokeCustomerRefreshToken.mockRejectedValueOnce(new Error('DB transient error'));
        const { req: reqErr, res: resErr } = createMocks({
          method: 'POST',
          body: { action: 'logout' },
        });
        await handler(reqErr, resErr);
        expect(resErr._getStatusCode()).toBe(200);
        expect(warnSpy).toHaveBeenCalledWith(
          'CustomerAuth',
          'Falha ao revogar refresh token no logout:',
          expect.any(Error)
        );
        expect(clearCustomerAuthCookie).toHaveBeenCalledWith(resErr);
        expect(clearCustomerRefreshCookie).toHaveBeenCalledWith(resErr);
      } finally {
        warnSpy.mockRestore();
      }
    });

    it('action=logout: deve retornar 429 quando exceder rate limit de logout', async () => {
      checkRateLimit.mockResolvedValueOnce(true);
      const { req, res } = createMocks({
        method: 'POST',
        body: { action: 'logout' },
      });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(429);
      expect(clearCustomerAuthCookie).not.toHaveBeenCalled();
    });

    it('action=refresh: deve rotacionar refresh token por cookie HttpOnly sem expor tokens no body', async () => {
      const currentRefresh = 'e'.repeat(96);
      const nextRefresh = 'f'.repeat(96);
      getCustomerRefreshTokenCookie.mockReturnValueOnce(currentRefresh);
      consumeCustomerRefreshToken.mockResolvedValueOnce({
        id: 21,
        customer_id: 55,
        expires_at: new Date(Date.now() + 86400000),
      });
      getCustomerById.mockResolvedValueOnce({
        id: 55,
        name: 'Visitante Rotacionado',
        email: 'rotacao@test.com',
      });
      generateCustomerRefreshToken.mockReturnValueOnce(nextRefresh);

      const { req, res } = createMocks({
        method: 'POST',
        body: { action: 'refresh' },
      });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(consumeCustomerRefreshToken).toHaveBeenCalledWith(`hash_${currentRefresh}`);
      expect(storeCustomerRefreshToken).toHaveBeenCalledWith(55, `hash_${nextRefresh}`);
      expect(setCustomerAuthCookie).toHaveBeenCalledWith(res, 'mock-customer-token');
      expect(setCustomerRefreshCookie).toHaveBeenCalledWith(res, nextRefresh);
      const body = JSON.parse(res._getData());
      expect(body).toEqual({
        authenticated: true,
        customer: { id: 55, name: 'Visitante Rotacionado', email: 'rotacao@test.com' },
      });
      expect(body).not.toHaveProperty('token');
      expect(body).not.toHaveProperty('refreshToken');
    });

    it('action=refresh: deve recusar com 401 e limpar cookies quando ausente no cookie (mesmo se enviado no body), malformado, consumido ou cliente ausente', async () => {
      // 1. Sem cookie (ignora body.refreshToken por segurança — ADR-0011)
      getCustomerRefreshTokenCookie.mockReturnValueOnce(null);
      const { req: noCookieReq, res: noCookieRes } = createMocks({
        method: 'POST',
        body: { action: 'refresh', refreshToken: 'a'.repeat(96) },
      });
      await handler(noCookieReq, noCookieRes);
      expect(noCookieRes._getStatusCode()).toBe(401);
      expect(consumeCustomerRefreshToken).not.toHaveBeenCalled();
      expect(clearCustomerAuthCookie).toHaveBeenCalledWith(noCookieRes);
      expect(clearCustomerRefreshCookie).toHaveBeenCalledWith(noCookieRes);

      // 2. Formato inválido
      getCustomerRefreshTokenCookie.mockReturnValueOnce('invalido');
      const { req: badFmtReq, res: badFmtRes } = createMocks({
        method: 'POST',
        body: { action: 'refresh' },
      });
      await handler(badFmtReq, badFmtRes);
      expect(badFmtRes._getStatusCode()).toBe(401);
      expect(consumeCustomerRefreshToken).not.toHaveBeenCalled();

      // 3. Já revogado/expirado (replay)
      const replayed = '9'.repeat(96);
      getCustomerRefreshTokenCookie.mockReturnValueOnce(replayed);
      consumeCustomerRefreshToken.mockResolvedValueOnce(null);
      const { req: replayReq, res: replayRes } = createMocks({
        method: 'POST',
        body: { action: 'refresh' },
      });
      await handler(replayReq, replayRes);
      expect(replayRes._getStatusCode()).toBe(401);
      expect(clearCustomerAuthCookie).toHaveBeenCalledWith(replayRes);
      expect(clearCustomerRefreshCookie).toHaveBeenCalledWith(replayRes);

      // 4. Cliente removido após emissão do refresh token
      getCustomerRefreshTokenCookie.mockReturnValueOnce(replayed);
      consumeCustomerRefreshToken.mockResolvedValueOnce({ id: 30, customer_id: 999 });
      getCustomerById.mockResolvedValueOnce(null);
      const { req: missingCustReq, res: missingCustRes } = createMocks({
        method: 'POST',
        body: { action: 'refresh' },
      });
      await handler(missingCustReq, missingCustRes);
      expect(missingCustRes._getStatusCode()).toBe(401);
      expect(clearCustomerAuthCookie).toHaveBeenCalledWith(missingCustRes);
      expect(clearCustomerRefreshCookie).toHaveBeenCalledWith(missingCustRes);
    });

    it('action=refresh: deve limpar customerRefreshToken e retornar 500 se persistência do novo refresh falhar', async () => {
      const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
      try {
        const currentRefresh = '8'.repeat(96);
        getCustomerRefreshTokenCookie.mockReturnValueOnce(currentRefresh);
        consumeCustomerRefreshToken.mockResolvedValueOnce({ id: 31, customer_id: 55 });
        getCustomerById.mockResolvedValueOnce({ id: 55, name: 'Maria', email: 'm@t.com' });
        storeCustomerRefreshToken.mockRejectedValueOnce(new Error('DB write failure'));

        const { req, res } = createMocks({
          method: 'POST',
          body: { action: 'refresh' },
        });
        await handler(req, res);

        expect(res._getStatusCode()).toBe(500);
        expect(clearCustomerRefreshCookie).toHaveBeenCalledWith(res);
        expect(setCustomerAuthCookie).not.toHaveBeenCalled();
      } finally {
        errorSpy.mockRestore();
      }
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
        expect(warnSpy).not.toHaveBeenCalled();
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
          expect(warnSpy).not.toHaveBeenCalled();
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
        expect(warnSpy).not.toHaveBeenCalled();
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

  describe('Métodos não permitidos e validações de borda', () => {
    it('deve retornar 405 para DELETE', async () => {
      const { req, res } = createMocks({ method: 'DELETE' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(405);
    });

    it('PUT: deve retornar 400 quando dados de perfil forem inválidos', async () => {
      getAuthenticatedCustomer.mockReturnValue({ customerId: 10, email: 'maria@test.com' });

      const { req, res } = createMocks({
        method: 'PUT',
        body: { name: 'A', defaultAddress: { cep: '123', state: 'SPP' } },
      });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(updateCustomerProfile).not.toHaveBeenCalled();
    });

    it('POST: deve retornar 429 quando rate limit exceder no POST', async () => {
      checkRateLimit.mockResolvedValueOnce(true);

      const { req, res } = createMocks({
        method: 'POST',
        body: { action: 'login', email: 'a@b.com', password: '123' },
      });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(429);
    });

    it('POST action=register: deve retornar 400 em payload inválido e 500 em erro inesperado', async () => {
      const { req: badReq, res: badRes } = createMocks({
        method: 'POST',
        body: { action: 'register', name: 'A', email: 'invalido', password: '123' },
      });
      await handler(badReq, badRes);
      expect(badRes._getStatusCode()).toBe(400);

      const errSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});
      try {
        registerCustomer.mockRejectedValueOnce(new Error('DB connection lost'));
        const { req, res } = createMocks({
          method: 'POST',
          body: {
            action: 'register',
            name: 'Carlos Silva',
            email: 'carlos@test.com',
            password: 'senha_segura_123',
          },
        });
        await handler(req, res);

        expect(res._getStatusCode()).toBe(500);
        expect(JSON.parse(res._getData())).toEqual({
          error: 'Internal Server Error',
          message: 'Erro interno no servidor.',
        });
      } finally {
        errSpy.mockRestore();
      }
    });

    it('POST action=login: deve retornar 400 em payload inválido', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { action: 'login', email: 'nao-e-email', password: '' },
      });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    it('POST action=google: deve retornar 400 para schema inválido e derivar nome do e-mail no dev bypass sem name', async () => {
      const { req: badReq, res: badRes } = createMocks({
        method: 'POST',
        body: { action: 'google', email: 'invalido' },
      });
      await handler(badReq, badRes);
      expect(badRes._getStatusCode()).toBe(400);

      process.env.ALLOW_GOOGLE_DEV_BYPASS = 'true';
      upsertGoogleCustomer.mockResolvedValueOnce({
        id: 30,
        name: 'peregrino',
        email: 'peregrino@gmail.com',
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          action: 'google',
          googleSub: 'sub-no-name',
          email: 'peregrino@gmail.com',
        },
      });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(upsertGoogleCustomer).toHaveBeenCalledWith({
        googleSub: 'sub-no-name',
        email: 'peregrino@gmail.com',
        name: 'peregrino',
      });
    });

    it('POST action desconhecida: deve retornar 400', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { action: 'desconhecida' },
      });
      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData()).message).toBe('Ação inválida.');
    });
  });
});
