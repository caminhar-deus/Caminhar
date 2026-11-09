import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { logger } from '../infra/logger.js';

function parseCookie(header) {
  if (!header) return {};
  const cookies = {};
  for (const pair of header.split(';')) {
    const trimmed = pair.trim();
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    cookies[trimmed.slice(0, idx)] = decodeURIComponent(trimmed.slice(idx + 1));
  }
  return cookies;
}

function serializeCookie(name, value, options = {}) {
  let cookie = `${name}=${encodeURIComponent(value)}`;
  if (options.httpOnly) cookie += '; HttpOnly';
  if (options.secure) cookie += '; Secure';
  if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
  if (options.maxAge !== undefined && options.maxAge !== null) cookie += `; Max-Age=${options.maxAge}`;
  if (options.path) cookie += `; Path=${options.path}`;
  return cookie;
}

const JWT_SECRET = process.env.JWT_SECRET;
let JWT_SECRET_OR_FALLBACK;
if (!JWT_SECRET) {
  const env = process.env.NODE_ENV;
  if (env !== 'development' && env !== 'test') {
    throw new Error('JWT_SECRET environment variable is required outside development/test environments');
  }
  JWT_SECRET_OR_FALLBACK = createHash('sha256')
    .update(process.cwd() + env + 'caminhar-dev-salt')
    .digest('hex');
} else {
  JWT_SECRET_OR_FALLBACK = JWT_SECRET;
}

const CUSTOMER_TOKEN_COOKIE = 'customerToken';
const CUSTOMER_TOKEN_EXPIRY = '24h';
const CUSTOMER_COOKIE_MAX_AGE = 24 * 60 * 60;

/**
 * Gera JWT exclusivo para visitante/cliente da loja pública (`scope: 'customer'`).
 * Completamente isolado do JWT de operadores do `/admin`.
 */
export function generateCustomerToken(customer) {
  return jwt.sign(
    {
      customerId: customer.id,
      email: customer.email,
      name: customer.name,
      scope: 'customer',
    },
    JWT_SECRET_OR_FALLBACK,
    { expiresIn: CUSTOMER_TOKEN_EXPIRY }
  );
}

/**
 * Verifica um JWT de visitante, garantindo que `scope === 'customer'`.
 * Rejeita tokens administrativos ou inválidos.
 */
export function verifyCustomerToken(token) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET_OR_FALLBACK);
    if (!decoded || typeof decoded !== 'object' || decoded.scope !== 'customer') {
      return null;
    }
    return decoded;
  } catch (err) {
    logger.debug('CustomerAuth', `Falha ao verificar token de visitante: ${err?.name || 'TokenError'}`);
    return null;
  }
}

/**
 * Grava o cookie HttpOnly `customerToken` na resposta.
 */
export function setCustomerAuthCookie(res, token, options = {}) {
  const cookieString = serializeCookie(CUSTOMER_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: options.maxAge ?? CUSTOMER_COOKIE_MAX_AGE,
    path: '/',
  });
  res.appendHeader('Set-Cookie', cookieString);
}

/**
 * Remove o cookie `customerToken` (logout).
 */
export function clearCustomerAuthCookie(res) {
  setCustomerAuthCookie(res, '', { maxAge: 0 });
}

/**
 * Extrai e valida o visitante autenticado a partir da requisição.
 */
export function getAuthenticatedCustomer(req) {
  const cookies = parseCookie(req?.headers?.cookie || '');
  const token = cookies[CUSTOMER_TOKEN_COOKIE];
  if (!token) return null;
  return verifyCustomerToken(token);
}
