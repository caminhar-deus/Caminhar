import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { query } from './db.js';
import { checkRateLimit } from './cache.js';
import { logger } from './logger.js';

// Funções utilitárias para manipulação de cookies (sem dependência externa)
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
  if (options.domain) cookie += `; Domain=${options.domain}`;
  if (options.expires) cookie += `; Expires=${options.expires.toUTCString()}`;
  return cookie;
}

// Use environment variables for secrets - required for production security
const JWT_SECRET = process.env.JWT_SECRET;
let JWT_SECRET_OR_FALLBACK;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production mode');
  }
  // Gera chave determinística a partir do ambiente local
  const envHash = createHash('sha256')
    .update(process.cwd() + process.env.NODE_ENV + 'caminhar-dev-salt')
    .digest('hex');
  JWT_SECRET_OR_FALLBACK = envHash;
  logger.warn('Auth', 'JWT_SECRET não definido. Usando chave derivada do ambiente local apenas para desenvolvimento.');
} else {
  JWT_SECRET_OR_FALLBACK = JWT_SECRET;
}
const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;
const REFRESH_TOKEN_BYTES = 48;

// Hash password
export async function hashPassword(password) {
  if (!password) {
    throw new Error('Senha inválida');
  }
  return await bcrypt.hash(password, SALT_ROUNDS);
}

// Verify password
export async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

// Generate JWT token
export function generateToken(user) {
  return jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    JWT_SECRET_OR_FALLBACK,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

// Gera refresh token criptograficamente seguro
function generateRefreshToken() {
  return randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
}

// Armazena refresh token no banco
export async function storeRefreshToken(userId, refreshToken) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, refreshToken, expiresAt]
  );
}

// Valida refresh token no banco
export async function validateRefreshToken(refreshToken) {
  const { rows } = await query(
    'SELECT * FROM refresh_tokens WHERE token = $1 AND revoked = false AND expires_at > NOW()',
    [refreshToken]
  );
  return rows[0] || null;
}

// Revoga um refresh token específico
export async function revokeRefreshToken(refreshToken) {
  await query(
    'UPDATE refresh_tokens SET revoked = true WHERE token = $1',
    [refreshToken]
  );
}

// Revoga todos os refresh tokens de um usuário
export async function revokeAllUserRefreshTokens(userId) {
  await query(
    'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1',
    [userId]
  );
}

// Função completa de renovação com rotação de tokens
export async function refreshAccessToken(refreshToken) {
  const storedToken = await validateRefreshToken(refreshToken);
  if (!storedToken) {
    return { error: 'INVALID_REFRESH_TOKEN', message: 'Refresh token inválido ou expirado' };
  }

  // Revoga o refresh token atual (rotação — uso único)
  await revokeRefreshToken(refreshToken);

  // Gera novo par de tokens
  const newRefreshToken = generateRefreshToken();
  await storeRefreshToken(storedToken.user_id, newRefreshToken);

  // Busca dados do usuário para gerar novo access token
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [storedToken.user_id]);
  const user = rows[0];

  const newAccessToken = generateToken(user);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: { id: user.id, username: user.username, role: user.role },
    error: null,
  };
}

// Set refresh token cookie
export function setRefreshTokenCookie(res, token, options = {}) {
  const cookieString = serializeCookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: options.maxAge ?? REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60, // 30 dias em segundos
    path: '/api/auth/refresh',
  });
  res.appendHeader('Set-Cookie', cookieString);
}

// Get refresh token cookie
export function getRefreshTokenCookie(req) {
  const cookies = parseCookie(req.headers.cookie || '');
  return cookies.refreshToken;
}

// Verify JWT token
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET_OR_FALLBACK);
  } catch {
    return null;
  }
}

// Set auth cookie
export function setAuthCookie(res, token, options = {}) {
  const cookieString = serializeCookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: options.maxAge ?? 3600, // 1 hour (ou 0 para logout)
    path: '/',
  });
  res.appendHeader('Set-Cookie', cookieString);
}

// Get auth cookie
export function getAuthCookie(req) {
  const cookies = parseCookie(req.headers.cookie || '');
  return cookies.token;
}

// Get auth token from header (for external API consumption)
export function getAuthToken(req) {
  // Check Authorization header first (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }

  // Fallback to cookie-based authentication
  return getAuthCookie(req);
}

// Helper functions for Database Operations
async function getUserByUsername(username) {
  const { rows } = await query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
  return rows[0];
}

async function createUser(username, password, role) {
  // Hash password before saving
  const hashedPassword = await hashPassword(password);
  
  const { rows } = await query(
    'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING *',
    [username, hashedPassword, role]
  );
  return rows[0];
}

// Authenticate user
export async function authenticate(username, password) {
  const user = await getUserByUsername(username);
  if (!user) {
    logger.warn('Auth', `Falha: Usuário '${username}' não encontrado.`);
    return null;
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    logger.warn('Auth', `Falha: Senha incorreta para usuário '${username}'.`);
  }
  return isValid ? user : null;
}

/**
 * Função compartilhada de autenticação e geração de token.
 * Usada pelo endpoint /api/auth/login.js.
 * 
 * @param {string} username - Nome de usuário
 * @param {string} password - Senha do usuário
 * @param {string} ip - Endereço IP do cliente (para rate limiting)
 * @param {Object} [options] - Opções adicionais
 * @param {number} [options.rateLimitLimit=5] - Limite de tentativas de login
 * @param {number} [options.rateLimitWindow=60000] - Janela de tempo do rate limit em ms
 * @returns {Promise<Object>} Objeto com { user, token } em caso de sucesso,
 *                            ou { error: 'RATE_LIMITED'/'INVALID_CREDENTIALS', message } em caso de falha
 */
export async function authenticateAndGenerateToken(username, password, ip, options = {}) {
  const { rateLimitLimit = 5, rateLimitWindow = 60000 } = options;

  // Validação de entrada
  if (!username || !password) {
    return { error: 'MISSING_FIELDS', message: 'Usuário e senha são obrigatórios' };
  }

  // Rate limiting (antes da autenticação para evitar brute force)
  const isRateLimited = await checkRateLimit(ip, 'api:auth:login', rateLimitLimit, rateLimitWindow);
  if (isRateLimited) {
    logger.warn('Auth', `IP ${ip} bloqueado por excesso de tentativas de login.`);
    return { error: 'RATE_LIMITED', message: 'Muitas tentativas de login. Aguarde um minuto e tente novamente.' };
  }

  // Autenticação
  const user = await authenticate(username, password);
  if (!user) {
    logger.warn('Auth', `Falha na tentativa de login para o usuário: "${username}"`);
    return { error: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas' };
  }

  // Atualiza o timestamp de último login
  try {
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
  } catch (updateError) {
    logger.error('Auth', 'Falha ao atualizar o timestamp de login:', updateError);
  }

  // Busca as permissões atreladas ao cargo do usuário
  try {
    const roleQuery = await query('SELECT permissions FROM roles WHERE name = $1', [user.role], { log: false });
    const permissions = roleQuery.rows[0]?.permissions || [];
    user.permissions = permissions;
  } catch (permError) {
    logger.error('Auth', 'Falha ao buscar permissões do usuário:', permError);
    user.permissions = [];
  }

  // Geração do access token
  const token = generateToken(user);

  // Geração do refresh token
  const refreshToken = generateRefreshToken();
  try {
    await storeRefreshToken(user.id, refreshToken);
  } catch (storeError) {
    logger.error('Auth', 'Falha ao armazenar refresh token:', storeError);
    // Não bloqueia o login — o refresh token é opcional para a sessão atual
  }

  return { user, token, refreshToken, error: null };
}

// Middleware for authentication
export function withAuth(handler) {
  return async (req, res) => {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: 'Token inválido' });
    }

    req.user = decoded;
    return handler(req, res);
  };
}

// Initialize auth system - create default admin user if not exists
export async function initializeAuth() {
  try {
    // Ensure users table exists
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure role column exists (migration for existing tables)
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'`);

    // Use environment variables for admin credentials
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    // Validate environment variables
    if (!adminUsername || !adminPassword) {
      throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD environment variables must be set');
    }

    // Check if admin user exists
    const adminUser = await getUserByUsername(adminUsername);

    if (!adminUser) {
      // Create default admin user with environment variable credentials
      await createUser(adminUsername, adminPassword, 'admin');
      logger.success('Auth', 'Usuário admin criado com sucesso');
    } else {
      logger.info('Auth', 'Usuário admin já existe');
      // Garante que o usuário admin tenha a role 'admin' caso tenha sido criado incorretamente
      if (adminUser.role !== 'admin') {
        await query('UPDATE users SET role = $1 WHERE id = $2', ['admin', adminUser.id]);
        logger.info('Auth', 'Role do usuário admin atualizada para admin');
      }
    }

    // Cria tabela de refresh tokens se não existir
    await query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        revoked BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Índices para busca rápida
    await query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token
      ON refresh_tokens(token)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
      ON refresh_tokens(user_id)
    `);

    logger.success('Auth', 'Sistema de autenticação inicializado');
  } catch (error) {
    logger.error('Auth', 'Erro ao inicializar sistema de autenticação:', error);
    throw error;
  }
}