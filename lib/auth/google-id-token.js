import { createPublicKey } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { logger } from '../infra/logger.js';

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const VALID_GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000;
const MIN_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_FORCED_REFRESH_COOLDOWN_MS = 60 * 1000;
const DEFAULT_CLOCK_TOLERANCE_SECONDS = 5;

function createAuthError(code, message = code) {
  const err = new Error(message);
  err.code = code;
  return err;
}

function parseMaxAgeMs(cacheControlHeader) {
  if (!cacheControlHeader || typeof cacheControlHeader !== 'string') {
    return DEFAULT_CACHE_TTL_MS;
  }
  const match = cacheControlHeader.match(/(?:^|[,\s])max-age\s*=\s*(\d+)(?=$|[,\s;])/i);
  if (!match) {
    return DEFAULT_CACHE_TTL_MS;
  }
  const seconds = Number(match[1]);
  if (!Number.isFinite(seconds) || seconds < 0) {
    return DEFAULT_CACHE_TTL_MS;
  }
  return Math.min(MAX_CACHE_TTL_MS, Math.max(MIN_CACHE_TTL_MS, seconds * 1000));
}

function parseJwksKeys(body) {
  if (!body || !Array.isArray(body.keys)) {
    throw createAuthError('GOOGLE_UPSTREAM_UNAVAILABLE', 'GOOGLE_JWKS_INVALID_PAYLOAD');
  }

  const keys = new Map();
  for (const jwk of body.keys) {
    if (!jwk || jwk.kty !== 'RSA') continue;
    if (jwk.use && jwk.use !== 'sig') continue;
    const kid = typeof jwk.kid === 'string' ? jwk.kid.trim() : '';
    if (!kid) continue;

    try {
      const publicKey = createPublicKey({ key: jwk, format: 'jwk' });
      keys.set(kid, publicKey);
    } catch {
      // Ignora chave individual inválida e mantém as demais válidas do conjunto JWKS
    }
  }

  if (keys.size === 0) {
    throw createAuthError('GOOGLE_UPSTREAM_UNAVAILABLE', 'GOOGLE_JWKS_EMPTY');
  }

  return keys;
}

/**
 * Cria um verificador local de ID tokens do Google usando JWKS (`RS256`) com
 * cache em memória, single-flight e proteção por cooldown em rotação de `kid`.
 */
export function createGoogleIdTokenVerifier({
  forcedRefreshCooldownMs = DEFAULT_FORCED_REFRESH_COOLDOWN_MS,
  fetchFn,
  now = () => Date.now(),
} = {}) {
  let cachedKeys = null;
  let expiresAt = 0;
  let lastForcedRefreshAt = 0;
  let inflightFetch = null;

  async function getJwks({ force = false } = {}) {
    const currentNow = now();

    if (!force && cachedKeys && currentNow < expiresAt) {
      return { keys: cachedKeys, refreshed: false };
    }

    if (inflightFetch) {
      return { keys: await inflightFetch, refreshed: true };
    }

    if (
      force &&
      cachedKeys &&
      lastForcedRefreshAt > 0 &&
      currentNow - lastForcedRefreshAt < forcedRefreshCooldownMs
    ) {
      return { keys: cachedKeys, refreshed: false };
    }

    if (force) {
      lastForcedRefreshAt = currentNow;
    }

    const currentPromise = (async () => {
      const fetcher = fetchFn || global.fetch;
      if (typeof fetcher !== 'function') {
        throw createAuthError('GOOGLE_UPSTREAM_UNAVAILABLE', 'GOOGLE_JWKS_FETCH_UNAVAILABLE');
      }

      const fetchOptions =
        typeof AbortSignal?.timeout === 'function'
          ? { signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS) }
          : {};

      let res;
      try {
        res = await fetcher(GOOGLE_JWKS_URL, fetchOptions);
      } catch (err) {
        throw createAuthError(
          'GOOGLE_UPSTREAM_UNAVAILABLE',
          err?.name || 'GOOGLE_JWKS_FETCH_FAILED'
        );
      }

      if (!res?.ok) {
        throw createAuthError(
          'GOOGLE_UPSTREAM_UNAVAILABLE',
          `GOOGLE_JWKS_HTTP_${res?.status ?? 'ERR'}`
        );
      }

      let data;
      try {
        data = await res.json();
      } catch {
        throw createAuthError('GOOGLE_UPSTREAM_UNAVAILABLE', 'GOOGLE_JWKS_INVALID_JSON');
      }

      const keys = parseJwksKeys(data);
      const ttlMs = parseMaxAgeMs(res.headers?.get?.('cache-control'));
      const fetchedAt = now();

      cachedKeys = keys;
      expiresAt = fetchedAt + ttlMs;
      if (force) {
        lastForcedRefreshAt = fetchedAt;
      }
      return keys;
    })().finally(() => {
      if (inflightFetch === currentPromise) {
        inflightFetch = null;
      }
    });

    inflightFetch = currentPromise;

    return { keys: await inflightFetch, refreshed: true };
  }

  async function verify(credential) {
    const serverClientId = String(process.env.GOOGLE_CLIENT_ID || '').trim();
    const publicClientId = String(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '').trim();
    if (serverClientId && publicClientId && serverClientId !== publicClientId) {
      logger.warn(
        'CustomerAuth',
        'GOOGLE_CLIENT_ID e NEXT_PUBLIC_GOOGLE_CLIENT_ID possuem valores diferentes; usando GOOGLE_CLIENT_ID na validação.'
      );
    }

    const expectedClientId = serverClientId || publicClientId;
    if (!expectedClientId) {
      throw createAuthError('GOOGLE_NOT_CONFIGURED');
    }

    if (typeof credential !== 'string' || !credential.trim()) {
      throw createAuthError('INVALID_GOOGLE_TOKEN');
    }

    let decodedComplete;
    try {
      decodedComplete = jwt.decode(credential, { complete: true });
    } catch {
      throw createAuthError('INVALID_GOOGLE_TOKEN');
    }
    const alg = decodedComplete?.header?.alg;
    const rawKid = decodedComplete?.header?.kid;
    const kid = typeof rawKid === 'string' ? rawKid.trim() : '';
    if (alg !== 'RS256' || !kid) {
      throw createAuthError('INVALID_GOOGLE_TOKEN');
    }

    let { keys, refreshed } = await getJwks({ force: false });
    let publicKey = keys.get(kid);
    if (!publicKey && !refreshed) {
      ({ keys } = await getJwks({ force: true }));
      publicKey = keys.get(kid);
    }
    if (!publicKey) {
      throw createAuthError('INVALID_GOOGLE_TOKEN', 'GOOGLE_UNKNOWN_KID');
    }

    let decoded;
    try {
      decoded = jwt.verify(credential, publicKey, {
        algorithms: ['RS256'],
        audience: expectedClientId,
        issuer: VALID_GOOGLE_ISSUERS,
        clockTolerance: DEFAULT_CLOCK_TOLERANCE_SECONDS,
        clockTimestamp: Math.floor(now() / 1000),
      });
    } catch (err) {
      if (err?.name === 'TokenExpiredError') {
        throw createAuthError('GOOGLE_TOKEN_EXPIRED');
      }
      const message = String(err?.message || '');
      if (message.includes('jwt audience invalid')) {
        throw createAuthError('GOOGLE_AUDIENCE_MISMATCH');
      }
      if (message.includes('jwt issuer invalid')) {
        throw createAuthError('INVALID_GOOGLE_ISSUER');
      }
      throw createAuthError('INVALID_GOOGLE_TOKEN');
    }

    const isScalarAudienceMatch = decoded?.aud === expectedClientId;
    const isArrayAudienceWithAzp =
      Array.isArray(decoded?.aud) &&
      decoded.aud.includes(expectedClientId) &&
      decoded?.azp === expectedClientId;
    if (!isScalarAudienceMatch && !isArrayAudienceWithAzp) {
      throw createAuthError('GOOGLE_AUDIENCE_MISMATCH');
    }

    const exp = Number(decoded?.exp);
    if (!Number.isFinite(exp) || exp * 1000 <= now() - DEFAULT_CLOCK_TOLERANCE_SECONDS * 1000) {
      throw createAuthError('GOOGLE_TOKEN_EXPIRED');
    }

    if (!(decoded?.email_verified === true || decoded?.email_verified === 'true')) {
      throw createAuthError('GOOGLE_EMAIL_NOT_VERIFIED');
    }

    const googleSub = typeof decoded?.sub === 'string' ? decoded.sub.trim() : '';
    const email = typeof decoded?.email === 'string' ? decoded.email.trim().toLowerCase() : '';
    if (!googleSub || !email) {
      throw createAuthError('INCOMPLETE_GOOGLE_PROFILE');
    }

    const rawName = typeof decoded?.name === 'string' ? decoded.name.trim() : '';

    return {
      googleSub,
      email,
      name: rawName || email.split('@')[0] || 'Visitante',
    };
  }

  return { verify };
}

const defaultVerifier = createGoogleIdTokenVerifier();

/**
 * Valida localmente um ID token (`RS256`) emitido pelo Sign in with Google.
 */
export async function verifyGoogleIdToken(credential) {
  return defaultVerifier.verify(credential);
}
