import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import { logger } from '../infra/logger.js';

function parseCookie(header) {
  if (!header) return {};
  const cookies = {};
  for (const pair of header.split(';')) {
    const trimmed = pair.trim();
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const name = trimmed.slice(0, idx).trim();
    if (!name) continue;
    const rawValue = trimmed.slice(idx + 1);
    try {
      cookies[name] = decodeURIComponent(rawValue);
    } catch {
      cookies[name] = rawValue;
    }
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
const CUSTOMER_TOKEN_EXPIRY = '1h';
const CUSTOMER_COOKIE_MAX_AGE = 60 * 60;
const CUSTOMER_REFRESH_COOKIE = 'customerRefreshToken';
const CUSTOMER_REFRESH_COOKIE_PATH = '/api/customer/auth';
const CUSTOMER_REFRESH_TOKEN_BYTES = 48;
const CUSTOMER_REFRESH_TOKEN_EXPIRY_DAYS = 30;
const CUSTOMER_REFRESH_COOKIE_MAX_AGE = CUSTOMER_REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60;
const CUSTOMER_REFRESH_TOKEN_PATTERN = /^[a-f0-9]{96}$/i;

/**
 * Gera JWT exclusivo para visitante/cliente da loja pública (`scope: 'customer'`, TTL 1h).
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
    { expiresIn: CUSTOMER_TOKEN_EXPIRY, algorithm: 'HS256' }
  );
}

/**
 * Verifica um JWT de visitante, garantindo que `scope === 'customer'`.
 * Rejeita tokens administrativos ou inválidos.
 */
export function verifyCustomerToken(token) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET_OR_FALLBACK, { algorithms: ['HS256'] });
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

/**
 * Gera um refresh token opaco criptograficamente seguro (96 caracteres hex) para visitantes.
 */
export function generateCustomerRefreshToken() {
  return randomBytes(CUSTOMER_REFRESH_TOKEN_BYTES).toString('hex');
}

/**
 * Calcula o hash SHA-256 do refresh token opaco de visitante para armazenamento no banco.
 * Retorna `null` quando o formato bruto é inválido, evitando consultas desnecessárias.
 */
export function hashCustomerRefreshToken(rawToken) {
  if (typeof rawToken !== 'string' || !CUSTOMER_REFRESH_TOKEN_PATTERN.test(rawToken)) {
    return null;
  }
  return createHash('sha256').update(rawToken.toLowerCase()).digest('hex');
}

/**
 * Grava o cookie HttpOnly `customerRefreshToken` restrito à rota `/api/customer/auth`.
 */
export function setCustomerRefreshCookie(res, token, options = {}) {
  const cookieString = serializeCookie(CUSTOMER_REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: options.maxAge ?? CUSTOMER_REFRESH_COOKIE_MAX_AGE,
    path: CUSTOMER_REFRESH_COOKIE_PATH,
  });
  res.appendHeader('Set-Cookie', cookieString);
}

/**
 * Remove o cookie `customerRefreshToken` (logout).
 */
export function clearCustomerRefreshCookie(res) {
  setCustomerRefreshCookie(res, '', { maxAge: 0 });
}

/**
 * Extrai o cookie `customerRefreshToken` da requisição, se presente.
 */
export function getCustomerRefreshTokenCookie(req) {
  const cookies = parseCookie(req?.headers?.cookie || '');
  return cookies[CUSTOMER_REFRESH_COOKIE] || null;
}
