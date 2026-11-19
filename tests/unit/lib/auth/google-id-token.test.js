import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { logger } from '../../../../lib/infra/logger.js';
import { createGoogleIdTokenVerifier } from '../../../../lib/auth/google-id-token.js';

function createBase64Url(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function makeJwksResponse(jwks, cacheControl = 'public, max-age=3600') {
  return {
    ok: true,
    status: 200,
    headers: {
      get: (name) => (String(name).toLowerCase() === 'cache-control' ? cacheControl : null),
    },
    json: async () => ({ keys: jwks }),
  };
}

describe('Verificador local de ID Token Google (JWKS RS256) — lib/auth/google-id-token.js', () => {
  const BASE_NOW_MS = 1_700_000_000_000;
  const originalGoogleClientId = process.env.GOOGLE_CLIENT_ID;
  const originalPublicGoogleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  let keyPair1;
  let keyPair2;
  let otherKeyPair;
  let jwk1;
  let jwk2;

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
  });

  beforeAll(() => {
    keyPair1 = generateKeyPairSync('rsa', { modulusLength: 2048 });
    keyPair2 = generateKeyPairSync('rsa', { modulusLength: 2048 });
    otherKeyPair = generateKeyPairSync('rsa', { modulusLength: 2048 });

    jwk1 = {
      ...keyPair1.publicKey.export({ format: 'jwk' }),
      kid: 'google-kid-1',
      use: 'sig',
      alg: 'RS256',
    };
    jwk2 = {
      ...keyPair2.publicKey.export({ format: 'jwk' }),
      kid: 'google-kid-2',
      use: 'sig',
      alg: 'RS256',
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  });

  afterEach(() => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  });

  function signToken(
    payloadOverrides = {},
    {
      privateKey = keyPair1.privateKey,
      kid = 'google-kid-1',
      nowMs = BASE_NOW_MS,
      includeExp = true,
    } = {}
  ) {
    const nowSec = Math.floor(nowMs / 1000);
    const payload = {
      aud: 'client-prod.apps.googleusercontent.com',
      iss: 'https://accounts.google.com',
      email_verified: true,
      sub: 'sub-google-123',
      email: 'Maria.Silva@gmail.com',
      name: 'Maria Silva',
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
  }

  it('valida assinatura RS256 via JWKS e reutiliza cache na segunda chamada sem refazer fetch', async () => {
    process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
    const fetchFn = jest.fn().mockResolvedValueOnce(makeJwksResponse([jwk1]));
    const verifier = createGoogleIdTokenVerifier({
      fetchFn,
      now: () => BASE_NOW_MS,
    });

    const token = signToken();
    const first = await verifier.verify(token);
    const second = await verifier.verify(token);

    expect(first).toEqual({
      googleSub: 'sub-google-123',
      email: 'maria.silva@gmail.com',
      name: 'Maria Silva',
    });
    expect(second).toEqual(first);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith(
      'https://www.googleapis.com/oauth2/v3/certs',
      expect.any(Object)
    );
  });

  it('respeita expiração do cache via Cache-Control max-age e rebusca JWKS após vencer', async () => {
    process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
    let currentNowMs = BASE_NOW_MS;
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(makeJwksResponse([jwk1], 'public, max-age=300'))
      .mockResolvedValueOnce(makeJwksResponse([jwk1], 'public, max-age=300'));

    const verifier = createGoogleIdTokenVerifier({
      fetchFn,
      now: () => currentNowMs,
    });

    await verifier.verify(signToken({}, { nowMs: currentNowMs }));
    expect(fetchFn).toHaveBeenCalledTimes(1);

    currentNowMs += 299 * 1000;
    await verifier.verify(signToken({}, { nowMs: currentNowMs }));
    expect(fetchFn).toHaveBeenCalledTimes(1);

    currentNowMs += 2 * 1000;
    await verifier.verify(signToken({}, { nowMs: currentNowMs }));
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('aplica clamp no TTL mínimo (5 min) e fallback (1 h) quando Cache-Control está ausente ou pequeno', async () => {
    process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
    let currentNowMs = BASE_NOW_MS;
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(makeJwksResponse([jwk1], 'public, max-age=10'))
      .mockResolvedValueOnce(makeJwksResponse([jwk1], null))
      .mockResolvedValueOnce(makeJwksResponse([jwk1], null));

    const verifier = createGoogleIdTokenVerifier({
      fetchFn,
      now: () => currentNowMs,
    });

    await verifier.verify(signToken({}, { nowMs: currentNowMs }));
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // max-age=10 sofre clamp mínimo para 300s (5 min)
    currentNowMs += 60 * 1000;
    await verifier.verify(signToken({}, { nowMs: currentNowMs }));
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Após 5 min completos, vence e recebe resposta sem Cache-Control (fallback 1h)
    currentNowMs += 241 * 1000;
    await verifier.verify(signToken({}, { nowMs: currentNowMs }));
    expect(fetchFn).toHaveBeenCalledTimes(2);

    // Dentro de 1h ainda usa cache
    currentNowMs += 59 * 60 * 1000;
    await verifier.verify(signToken({}, { nowMs: currentNowMs }));
    expect(fetchFn).toHaveBeenCalledTimes(2);

    // Após 1h completa, refaz fetch
    currentNowMs += 2 * 60 * 1000;
    await verifier.verify(signToken({}, { nowMs: currentNowMs }));
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('executa single-flight em múltiplas verificações concorrentes com cache frio', async () => {
    process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
    let resolveFetch;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    const fetchFn = jest.fn().mockReturnValueOnce(fetchPromise);

    const verifier = createGoogleIdTokenVerifier({
      fetchFn,
      now: () => BASE_NOW_MS,
    });

    const token = signToken();
    const pending = Promise.all([
      verifier.verify(token),
      verifier.verify(token),
      verifier.verify(token),
    ]);

    resolveFetch(makeJwksResponse([jwk1]));
    const results = await pending;

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(3);
    results.forEach((profile) => expect(profile.googleSub).toBe('sub-google-123'));
  });

  it('suporta rotação de chave (novo kid força refresh) e aplica cooldown contra spam de kid desconhecido', async () => {
    process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
    let currentNowMs = BASE_NOW_MS;
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(makeJwksResponse([jwk1]))
      .mockResolvedValueOnce(makeJwksResponse([jwk1, jwk2]))
      .mockResolvedValueOnce(makeJwksResponse([jwk1, jwk2]));

    const verifier = createGoogleIdTokenVerifier({
      fetchFn,
      now: () => currentNowMs,
      forcedRefreshCooldownMs: 60_000,
    });

    // Popula cache inicial com kid-1
    await verifier.verify(signToken({}, { kid: 'google-kid-1', nowMs: currentNowMs }));
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Token com novo kid-2 força 1 refresh e valida com sucesso
    const rotated = await verifier.verify(
      signToken(
        { sub: 'sub-rotated' },
        { privateKey: keyPair2.privateKey, kid: 'google-kid-2', nowMs: currentNowMs }
      )
    );
    expect(rotated.googleSub).toBe('sub-rotated');
    expect(fetchFn).toHaveBeenCalledTimes(2);

    // Dentro da janela de cooldown (60s), kid inexistente não dispara novo fetch
    currentNowMs += 10_000;
    await expect(
      verifier.verify(signToken({}, { privateKey: otherKeyPair.privateKey, kid: 'unknown-kid', nowMs: currentNowMs }))
    ).rejects.toMatchObject({ code: 'INVALID_GOOGLE_TOKEN' });
    expect(fetchFn).toHaveBeenCalledTimes(2);

    // Após cooldown expirar, novo kid desconhecido tenta 1 refresh e ainda falha fechado
    currentNowMs += 55_000;
    await expect(
      verifier.verify(signToken({}, { privateKey: otherKeyPair.privateKey, kid: 'unknown-kid', nowMs: currentNowMs }))
    ).rejects.toMatchObject({ code: 'INVALID_GOOGLE_TOKEN' });
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('falha fechado (GOOGLE_NOT_CONFIGURED) sem chamar fetch quando Client IDs estão ausentes', async () => {
    const fetchFn = jest.fn();
    const verifier = createGoogleIdTokenVerifier({
      fetchFn,
      now: () => BASE_NOW_MS,
    });

    await expect(verifier.verify(signToken())).rejects.toMatchObject({
      code: 'GOOGLE_NOT_CONFIGURED',
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('usa fallback de NEXT_PUBLIC_GOOGLE_CLIENT_ID e registra warning sem vazar valores quando Client IDs diferem', async () => {
    const serverClientId = 'server-only-id.apps.googleusercontent.com';
    const publicClientId = 'public-other-id.apps.googleusercontent.com';
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = publicClientId;

    const fetchFn = jest
      .fn()
      .mockResolvedValue(makeJwksResponse([jwk1]));
    const verifier = createGoogleIdTokenVerifier({
      fetchFn,
      now: () => BASE_NOW_MS,
    });

    const fallbackProfile = await verifier.verify(signToken({ aud: publicClientId }));
    expect(fallbackProfile.googleSub).toBe('sub-google-123');

    process.env.GOOGLE_CLIENT_ID = serverClientId;
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    try {
      const serverProfile = await verifier.verify(signToken({ aud: serverClientId }));
      expect(serverProfile.googleSub).toBe('sub-google-123');
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

  it('rejeita alg=none, alg=HS256 e assinatura adulterada', async () => {
    process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
    const fetchFn = jest.fn().mockResolvedValue(makeJwksResponse([jwk1]));
    const verifier = createGoogleIdTokenVerifier({
      fetchFn,
      now: () => BASE_NOW_MS,
    });

    const nowSec = Math.floor(BASE_NOW_MS / 1000);
    const unsignedToken = `${createBase64Url({
      alg: 'none',
      typ: 'JWT',
      kid: 'google-kid-1',
    })}.${createBase64Url({
      aud: 'client-prod.apps.googleusercontent.com',
      iss: 'https://accounts.google.com',
      email_verified: true,
      sub: 'sub-none',
      email: 'none@gmail.com',
      exp: nowSec + 3600,
    })}.`;

    await expect(verifier.verify(unsignedToken)).rejects.toMatchObject({
      code: 'INVALID_GOOGLE_TOKEN',
    });

    const hs256Token = jwt.sign(
      {
        aud: 'client-prod.apps.googleusercontent.com',
        iss: 'https://accounts.google.com',
        email_verified: true,
        sub: 'sub-hs',
        email: 'hs@gmail.com',
        exp: nowSec + 3600,
      },
      'secret-confusion',
      { algorithm: 'HS256', keyid: 'google-kid-1' }
    );

    await expect(verifier.verify(hs256Token)).rejects.toMatchObject({
      code: 'INVALID_GOOGLE_TOKEN',
    });

    const wrongKeyToken = signToken({}, { privateKey: otherKeyPair.privateKey, kid: 'google-kid-1' });
    await expect(verifier.verify(wrongKeyToken)).rejects.toMatchObject({
      code: 'INVALID_GOOGLE_TOKEN',
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('rejeita aud divergente, iss inválido, email_verified falso, exp expirado/ausente e sub/email ausentes', async () => {
    process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
    const fetchFn = jest.fn().mockResolvedValue(makeJwksResponse([jwk1]));
    const verifier = createGoogleIdTokenVerifier({
      fetchFn,
      now: () => BASE_NOW_MS,
    });

    await expect(
      verifier.verify(signToken({ aud: 'outro-app.apps.googleusercontent.com' }))
    ).rejects.toMatchObject({ code: 'GOOGLE_AUDIENCE_MISMATCH' });

    await expect(
      verifier.verify(signToken({ iss: 'https://evil.example.com' }))
    ).rejects.toMatchObject({ code: 'INVALID_GOOGLE_ISSUER' });

    await expect(
      verifier.verify(signToken({ email_verified: false }))
    ).rejects.toMatchObject({ code: 'GOOGLE_EMAIL_NOT_VERIFIED' });

    await expect(
      verifier.verify(signToken({ email_verified: undefined }))
    ).rejects.toMatchObject({ code: 'GOOGLE_EMAIL_NOT_VERIFIED' });

    await expect(
      verifier.verify(signToken({ exp: Math.floor(BASE_NOW_MS / 1000) - 60 }))
    ).rejects.toMatchObject({ code: 'GOOGLE_TOKEN_EXPIRED' });

    await expect(
      verifier.verify(signToken({}, { includeExp: false }))
    ).rejects.toMatchObject({ code: 'GOOGLE_TOKEN_EXPIRED' });

    await expect(
      verifier.verify(signToken({ sub: '' }))
    ).rejects.toMatchObject({ code: 'INCOMPLETE_GOOGLE_PROFILE' });

    await expect(
      verifier.verify(signToken({ email: '   ' }))
    ).rejects.toMatchObject({ code: 'INCOMPLETE_GOOGLE_PROFILE' });
  });

  it('lança GOOGLE_UPSTREAM_UNAVAILABLE em timeout, abort, erro de rede, HTTP 5xx, JSON inválido e JWKS vazio', async () => {
    process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
    const token = signToken();

    const makeError = (name) => {
      const err = new Error(`Error: ${name}`);
      err.name = name;
      return err;
    };

    const scenarios = [
      jest.fn().mockRejectedValueOnce(makeError('TimeoutError')),
      jest.fn().mockRejectedValueOnce(makeError('AbortError')),
      jest.fn().mockRejectedValueOnce(new TypeError('fetch failed')),
      jest.fn().mockResolvedValueOnce({ ok: false, status: 500 }),
      jest.fn().mockResolvedValueOnce({ ok: false, status: 503 }),
      jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => {
          throw new SyntaxError('Unexpected token');
        },
      }),
      jest.fn().mockResolvedValueOnce(makeJwksResponse([])),
    ];

    for (const fetchFn of scenarios) {
      const verifier = createGoogleIdTokenVerifier({
        fetchFn,
        now: () => BASE_NOW_MS,
      });
      await expect(verifier.verify(token)).rejects.toMatchObject({
        code: 'GOOGLE_UPSTREAM_UNAVAILABLE',
      });
    }
  });

  it('aplica clamp máximo (24h), clamp em max-age=0 (5 min) e ignora s-maxage no Cache-Control', async () => {
    process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
    let currentNowMs = BASE_NOW_MS;
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(makeJwksResponse([jwk1], 'public, max-age=999999'))
      .mockResolvedValueOnce(makeJwksResponse([jwk1], 'public, max-age=0'))
      .mockResolvedValueOnce(makeJwksResponse([jwk1], 'public, s-maxage=30, max-age=600'))
      .mockResolvedValueOnce(makeJwksResponse([jwk1], 'public, s-maxage=30, max-age=600'));

    const verifier = createGoogleIdTokenVerifier({
      fetchFn,
      now: () => currentNowMs,
    });

    await verifier.verify(signToken({}, { nowMs: currentNowMs }));
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Antes de 24h permanece em cache apesar de max-age=999999 (~11,5 dias)
    currentNowMs += 23 * 60 * 60 * 1000;
    await verifier.verify(signToken({}, { nowMs: currentNowMs }));
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Após 24h completas vence e recebe max-age=0 (clamp mínimo para 5 min)
    currentNowMs += 2 * 60 * 60 * 1000;
    await verifier.verify(signToken({}, { nowMs: currentNowMs }));
    expect(fetchFn).toHaveBeenCalledTimes(2);

    // Antes de 5 min permanece em cache
    currentNowMs += 4 * 60 * 1000;
    await verifier.verify(signToken({}, { nowMs: currentNowMs }));
    expect(fetchFn).toHaveBeenCalledTimes(2);

    // Após 5 min vence e recebe s-maxage=30, max-age=600 (usa 600s e ignora 30s)
    currentNowMs += 2 * 60 * 1000;
    await verifier.verify(signToken({}, { nowMs: currentNowMs }));
    expect(fetchFn).toHaveBeenCalledTimes(3);

    currentNowMs += 45 * 1000;
    await verifier.verify(signToken({}, { nowMs: currentNowMs }));
    expect(fetchFn).toHaveBeenCalledTimes(3);

    currentNowMs += 556 * 1000;
    await verifier.verify(signToken({}, { nowMs: currentNowMs }));
    expect(fetchFn).toHaveBeenCalledTimes(4);
  });

  it('lança GOOGLE_UPSTREAM_UNAVAILABLE em HTTP 403/404 ou payload JWKS sem array keys', async () => {
    process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
    const token = signToken();

    const scenarios = [
      jest.fn().mockResolvedValueOnce({ ok: false, status: 403 }),
      jest.fn().mockResolvedValueOnce({ ok: false, status: 404 }),
      jest.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => ({ invalid: true }),
      }),
    ];

    for (const fetchFn of scenarios) {
      const verifier = createGoogleIdTokenVerifier({
        fetchFn,
        now: () => BASE_NOW_MS,
      });
      await expect(verifier.verify(token)).rejects.toMatchObject({
        code: 'GOOGLE_UPSTREAM_UNAVAILABLE',
      });
    }
  });

  it('evita segundo fetch imediato quando cache frio ou TTL expirado já retornaram JWKS sem o kid', async () => {
    process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
    let currentNowMs = BASE_NOW_MS;
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(makeJwksResponse([jwk1], 'public, max-age=300'))
      .mockResolvedValueOnce(makeJwksResponse([jwk1], 'public, max-age=300'));

    const verifier = createGoogleIdTokenVerifier({
      fetchFn,
      now: () => currentNowMs,
    });

    // Cache frio com kid desconhecido faz apenas 1 fetch e rejeita
    await expect(
      verifier.verify(signToken({}, { privateKey: otherKeyPair.privateKey, kid: 'unknown-cold', nowMs: currentNowMs }))
    ).rejects.toMatchObject({ code: 'INVALID_GOOGLE_TOKEN' });
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Após TTL expirar, novo refresh normal com kid desconhecido também faz apenas 1 fetch
    currentNowMs += 301 * 1000;
    await expect(
      verifier.verify(signToken({}, { privateKey: otherKeyPair.privateKey, kid: 'unknown-expired', nowMs: currentNowMs }))
    ).rejects.toMatchObject({ code: 'INVALID_GOOGLE_TOKEN' });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('preserva cooldown após falha em refresh forçado e mantém tokens em cache funcionando', async () => {
    process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
    let currentNowMs = BASE_NOW_MS;
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(makeJwksResponse([jwk1]))
      .mockResolvedValueOnce({ ok: false, status: 503 });

    const verifier = createGoogleIdTokenVerifier({
      fetchFn,
      now: () => currentNowMs,
      forcedRefreshCooldownMs: 60_000,
    });

    // Aquece cache com kid-1
    await verifier.verify(signToken({}, { kid: 'google-kid-1', nowMs: currentNowMs }));
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Kid desconhecido dispara refresh forçado que falha (503)
    currentNowMs += 1_000;
    await expect(
      verifier.verify(signToken({}, { privateKey: otherKeyPair.privateKey, kid: 'unknown-fail', nowMs: currentNowMs }))
    ).rejects.toMatchObject({ code: 'GOOGLE_UPSTREAM_UNAVAILABLE' });
    expect(fetchFn).toHaveBeenCalledTimes(2);

    // Novo kid desconhecido dentro de 60s respeita cooldown (sem novo fetch) e falha com INVALID_GOOGLE_TOKEN
    currentNowMs += 10_000;
    await expect(
      verifier.verify(signToken({}, { privateKey: otherKeyPair.privateKey, kid: 'unknown-fail-2', nowMs: currentNowMs }))
    ).rejects.toMatchObject({ code: 'INVALID_GOOGLE_TOKEN' });
    expect(fetchFn).toHaveBeenCalledTimes(2);

    // Token válido cujo kid-1 já está em cache continua autenticando normalmente
    const valid = await verifier.verify(signToken({}, { kid: 'google-kid-1', nowMs: currentNowMs }));
    expect(valid.googleSub).toBe('sub-google-123');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('aglutina requisições concorrentes em um único refresh forçado durante rotação de kid', async () => {
    process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
    let resolveRotationFetch;
    const rotationPromise = new Promise((resolve) => {
      resolveRotationFetch = resolve;
    });
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(makeJwksResponse([jwk1]))
      .mockReturnValueOnce(rotationPromise);

    const verifier = createGoogleIdTokenVerifier({
      fetchFn,
      now: () => BASE_NOW_MS,
      forcedRefreshCooldownMs: 60_000,
    });

    await verifier.verify(signToken({}, { kid: 'google-kid-1' }));
    expect(fetchFn).toHaveBeenCalledTimes(1);

    const rotatedToken = signToken(
      { sub: 'sub-concurrent-rotated' },
      { privateKey: keyPair2.privateKey, kid: 'google-kid-2' }
    );
    const pending = Promise.all([
      verifier.verify(rotatedToken),
      verifier.verify(rotatedToken),
    ]);

    resolveRotationFetch(makeJwksResponse([jwk1, jwk2]));
    const results = await pending;

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(2);
    expect(results[0].googleSub).toBe('sub-concurrent-rotated');
    expect(results[1].googleSub).toBe('sub-concurrent-rotated');
  });

  it('rejeita kid não-string no header sem consultar JWKS e usa fallback de nome quando name só tem espaços', async () => {
    process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
    const fetchFn = jest.fn().mockResolvedValueOnce(makeJwksResponse([jwk1]));
    const verifier = createGoogleIdTokenVerifier({
      fetchFn,
      now: () => BASE_NOW_MS,
    });

    const nowSec = Math.floor(BASE_NOW_MS / 1000);
    const nonStringKidToken = `${createBase64Url({
      alg: 'RS256',
      typ: 'JWT',
      kid: 123,
    })}.${createBase64Url({
      aud: 'client-prod.apps.googleusercontent.com',
      iss: 'https://accounts.google.com',
      email_verified: true,
      sub: 'sub-bad-kid',
      email: 'badkid@gmail.com',
      exp: nowSec + 3600,
    })}.fakesig`;

    await expect(verifier.verify(nonStringKidToken)).rejects.toMatchObject({
      code: 'INVALID_GOOGLE_TOKEN',
    });
    expect(fetchFn).not.toHaveBeenCalled();

    const profile = await verifier.verify(signToken({ name: '   ' }));
    expect(profile.name).toBe('maria.silva');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('rejeita token malformado com typ=JWT e payload não-JSON como INVALID_GOOGLE_TOKEN sem vazar SyntaxError', async () => {
    process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
    const fetchFn = jest.fn();
    const verifier = createGoogleIdTokenVerifier({
      fetchFn,
      now: () => BASE_NOW_MS,
    });

    const malformedPayloadToken = `${createBase64Url({
      alg: 'RS256',
      typ: 'JWT',
      kid: 'google-kid-1',
    })}.${Buffer.from('not-json').toString('base64url')}.fakesig`;

    await expect(verifier.verify(malformedPayloadToken)).rejects.toMatchObject({
      code: 'INVALID_GOOGLE_TOKEN',
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('exige aud escalar ou azp correspondente quando aud é array OIDC', async () => {
    process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
    const fetchFn = jest.fn().mockResolvedValueOnce(makeJwksResponse([jwk1]));
    const verifier = createGoogleIdTokenVerifier({
      fetchFn,
      now: () => BASE_NOW_MS,
    });

    await expect(
      verifier.verify(
        signToken({
          aud: ['client-prod.apps.googleusercontent.com', 'other-client.apps.googleusercontent.com'],
        })
      )
    ).rejects.toMatchObject({ code: 'GOOGLE_AUDIENCE_MISMATCH' });

    const withMatchingAzp = await verifier.verify(
      signToken({
        aud: ['client-prod.apps.googleusercontent.com', 'other-client.apps.googleusercontent.com'],
        azp: 'client-prod.apps.googleusercontent.com',
      })
    );
    expect(withMatchingAzp.googleSub).toBe('sub-google-123');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('rejeita sub/email não-string e usa fallback de nome quando name não é string', async () => {
    process.env.GOOGLE_CLIENT_ID = 'client-prod.apps.googleusercontent.com';
    const fetchFn = jest.fn().mockResolvedValueOnce(makeJwksResponse([jwk1]));
    const verifier = createGoogleIdTokenVerifier({
      fetchFn,
      now: () => BASE_NOW_MS,
    });

    await expect(verifier.verify(signToken({ sub: 12345 }))).rejects.toMatchObject({
      code: 'INCOMPLETE_GOOGLE_PROFILE',
    });

    await expect(
      verifier.verify(signToken({ email: { raw: 'a@b.com' } }))
    ).rejects.toMatchObject({
      code: 'INCOMPLETE_GOOGLE_PROFILE',
    });

    const profile = await verifier.verify(signToken({ name: 12345 }));
    expect(profile.name).toBe('maria.silva');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
