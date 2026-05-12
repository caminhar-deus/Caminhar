import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import * as cookie from 'cookie';
import { query } from './db.js';
import { checkRateLimit } from './cache.js';

// Handle CJS/ESM module interop issue in Jest by safely accessing parse/serialize.
const parse = cookie.parse || cookie.default?.parse;
const serialize = cookie.serialize || cookie.default?.serialize;

// Use environment variables for secrets - required for production security
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production mode');
  }
  console.warn('[Auth] ⚠️ JWT_SECRET não definido. Usando fallback inseguro apenas para desenvolvimento.');
}
const JWT_SECRET_OR_FALLBACK = JWT_SECRET || 'caminhar-com-deus-secret-key-2026';
const SALT_ROUNDS = 10;

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
    { expiresIn: '1h' }
  );
}

// Verify JWT token
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET_OR_FALLBACK);
  } catch (error) {
    return null;
  }
}

// Set auth cookie
export function setAuthCookie(res, token) {
  const cookieString = serialize('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600, // 1 hour
    path: '/',
  });
  res.setHeader('Set-Cookie', cookieString);
}

// Get auth cookie
export function getAuthCookie(req) {
  const cookies = parse(req.headers.cookie || '');
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
    console.log(`[Auth] Falha: Usuário '${username}' não encontrado.`);
    return null;
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    console.log(`[Auth] Falha: Senha incorreta para usuário '${username}'.`);
  }
  return isValid ? user : null;
}

/**
 * Função compartilhada de autenticação e geração de token.
 * Unifica a lógica de login usada pelos endpoints /api/auth/login.js e /api/v1/auth/login.js.
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
    console.warn(`[Auth] ⚠️ IP ${ip} bloqueado por excesso de tentativas de login.`);
    return { error: 'RATE_LIMITED', message: 'Muitas tentativas de login. Aguarde um minuto e tente novamente.' };
  }

  // Autenticação
  const user = await authenticate(username, password);
  if (!user) {
    console.warn(`[Auth] ⚠️ Falha na tentativa de login para o usuário: "${username}"`);
    return { error: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas' };
  }

  // Atualiza o timestamp de último login
  try {
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
  } catch (updateError) {
    console.error('[Auth] ❌ Falha ao atualizar o timestamp de login:', updateError);
  }

  // Busca as permissões atreladas ao cargo do usuário
  try {
    const roleQuery = await query('SELECT permissions FROM roles WHERE name = $1', [user.role], { log: false });
    const permissions = roleQuery.rows[0]?.permissions || [];
    user.permissions = permissions;
  } catch (permError) {
    console.error('[Auth] ❌ Falha ao buscar permissões do usuário:', permError);
    user.permissions = [];
  }

  // Geração do token
  const token = generateToken(user);

  return { user, token, error: null };
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
      console.log('[Auth] Usuário admin criado com sucesso');
    } else {
      console.log('[Auth] Usuário admin já existe');
      // Garante que o usuário admin tenha a role 'admin' caso tenha sido criado incorretamente
      if (adminUser.role !== 'admin') {
        await query('UPDATE users SET role = $1 WHERE id = $2', ['admin', adminUser.id]);
        console.log('[Auth] Role do usuário admin atualizada para admin');
      }
    }

    console.log('[Auth] Sistema de autenticação inicializado');
  } catch (error) {
    console.error('[Auth] ❌ Erro ao inicializar sistema de autenticação:', error);
    throw error;
  }
}