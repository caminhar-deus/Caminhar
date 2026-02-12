/**
 * Auth Helpers
 * Utilitários para testes de autenticação
 * 
 * Estes helpers simplificam a criação de tokens e mocks de autenticação.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'caminhar-com-deus-secret-key-2026';
const JWT_EXPIRES_IN = '1h';

/**
 * Cria um token JWT válido
 * @param {Object} payload - Dados para o token
 * @param {Object} options - Opções do JWT
 * @returns {string} Token JWT
 */
export const createAuthToken = (payload, options = {}) => {
  const defaultPayload = {
    userId: payload.id || payload.userId || 1,
    username: payload.username || 'testuser',
    role: payload.role || 'user',
    ...payload,
  };
  
  return jwt.sign(defaultPayload, JWT_SECRET, {
    expiresIn: options.expiresIn || JWT_EXPIRES_IN,
    ...options,
  });
};

/**
 * Cria um token JWT expirado
 * @param {Object} payload - Dados para o token
 * @returns {string} Token expirado
 */
export const createExpiredToken = (payload = {}) => {
  return jwt.sign(
    {
      userId: payload.id || 1,
      username: payload.username || 'testuser',
      role: payload.role || 'user',
      ...payload,
    },
    JWT_SECRET,
    { expiresIn: '-1h' } // Já expirado
  );
};

/**
 * Cria um token JWT inválido
 * @returns {string} Token inválido
 */
export const createInvalidToken = () => {
  return 'invalid.token.here';
};

/**
 * Decodifica um token JWT sem verificar
 * @param {string} token - Token JWT
 * @returns {Object|null} Payload decodificado
 */
export const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
};

/**
 * Verifica se um token é válido
 * @param {string} token - Token JWT
 * @returns {boolean} Se é válido
 */
export const isValidToken = (token) => {
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
};

/**
 * Mocka um usuário autenticado
 * @param {Object} user - Dados do usuário
 * @returns {Object} { user, token, headers }
 */
export const mockAuthenticatedUser = (user = {}) => {
  const mockUser = {
    id: user.id || 1,
    username: user.username || 'testuser',
    email: user.email || 'test@example.com',
    role: user.role || 'user',
    name: user.name || 'Test User',
    ...user,
  };
  
  const token = createAuthToken(mockUser);
  
  return {
    user: mockUser,
    token,
    headers: {
      authorization: `Bearer ${token}`,
    },
    cookies: {
      token,
    },
  };
};

/**
 * Mocka um admin autenticado
 * @param {Object} admin - Dados do admin
 * @returns {Object} { user, token, headers }
 */
export const mockAuthenticatedAdmin = (admin = {}) => {
  return mockAuthenticatedUser({
    role: 'admin',
    username: 'admin',
    ...admin,
  });
};

/**
 * Cria um hash de senha
 * @param {string} password - Senha em texto plano
 * @param {number} saltRounds - Rounds do bcrypt (default: 10)
 * @returns {Promise<string>} Hash da senha
 */
export const hashPassword = async (password, saltRounds = 10) => {
  return bcrypt.hash(password, saltRounds);
};

/**
 * Compara uma senha com um hash
 * @param {string} password - Senha em texto plano
 * @param {string} hash - Hash armazenado
 * @returns {Promise<boolean>} Se a senha confere
 */
export const verifyPassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

/**
 * Cria um mock do middleware de autenticação
 * @param {Object} user - Usuário para autenticar
 * @returns {Function} Middleware mockado
 */
export const createMockAuthMiddleware = (user = null) => {
  return (handler) => async (req, res) => {
    if (!user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }
    
    req.user = user;
    return handler(req, res);
  };
};

/**
 * Mock da lib auth completa
 * @param {Object} options - Opções de mock
 * @returns {Object} Objeto mockado
 */
export const mockAuthLib = (options = {}) => {
  const {
    user = null,
    isAuthenticated = true,
    token = null,
  } = options;
  
  const mockUser = user || {
    id: 1,
    username: 'testuser',
    role: 'user',
  };
  
  const mockToken = token || (isAuthenticated ? createAuthToken(mockUser) : null);
  
  return {
    hashPassword: jest.fn().mockResolvedValue('hashed_password'),
    verifyPassword: jest.fn().mockResolvedValue(true),
    generateToken: jest.fn().mockReturnValue(mockToken),
    verifyToken: jest.fn().mockReturnValue(isAuthenticated ? mockUser : null),
    setAuthCookie: jest.fn(),
    getAuthCookie: jest.fn().mockReturnValue(mockToken),
    getAuthToken: jest.fn().mockReturnValue(mockToken),
    withAuth: createMockAuthMiddleware(isAuthenticated ? mockUser : null),
    authenticate: jest.fn().mockResolvedValue(isAuthenticated ? mockUser : null),
    initializeAuth: jest.fn().mockResolvedValue(undefined),
  };
};

/**
 * Limpa todos os cookies simulados
 */
export const clearAuthCookies = () => {
  document.cookie.split(';').forEach(cookie => {
    const [name] = cookie.split('=');
    document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  });
};

/**
 * Cria um header de autorização Bearer
 * @param {string} token - Token JWT
 * @returns {Object} Header de autorização
 */
export const createBearerHeader = (token) => ({
  authorization: `Bearer ${token}`,
});

/**
 * Cria cookies de autenticação
 * @param {string} token - Token JWT
 * @returns {Object} Cookie de autenticação
 */
export const createAuthCookie = (token) => ({
  token,
});

/**
 * Payload padrão para tokens
 */
export const defaultTokenPayload = {
  userId: 1,
  username: 'testuser',
  role: 'user',
};

/**
 * Payload de admin para tokens
 */
export const adminTokenPayload = {
  userId: 1,
  username: 'admin',
  role: 'admin',
};
