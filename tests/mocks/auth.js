/**
 * Auth Mocks
 * Mocks centralizados para o módulo lib/auth.js
 *
 * Uso em testes:
 *   jest.mock('../../../lib/auth.js', () => require('../../mocks/auth').mockAuthModule());
 */

/**
 * Cria um módulo de autenticação mockado completo
 * @param {Object} overrides - Sobrescreve funções específicas
 * @returns {Object} Módulo auth mockado
 */
export const mockAuthModule = (overrides = {}) => ({
  hashPassword: jest.fn(async (password) => `hashed_${password}`),
  verifyPassword: jest.fn(async (password, hashedPassword) => true),
  generateToken: jest.fn(() => 'mock-jwt-token'),
  verifyToken: jest.fn(() => ({ userId: 1, username: 'admin', role: 'admin' })),
  setAuthCookie: jest.fn(),
  getAuthCookie: jest.fn(() => 'mock-token'),
  getAuthToken: jest.fn(() => 'mock-token'),
  authenticate: jest.fn(async (username, password) => ({ id: 1, username, role: 'admin' })),
  authenticateAndGenerateToken: jest.fn(async () => ({
    user: { id: 1, username: 'admin', role: 'admin', permissions: [] },
    token: 'mock-jwt-token',
    error: null,
  })),
  withAuth: jest.fn((handler) => (req, res) => {
    req.user = { userId: 1, username: 'admin', role: 'admin' };
    return handler(req, res);
  }),
  initializeAuth: jest.fn(),
  ...overrides,
});

/**
 * Cria um módulo de autenticação que SIMULA FALHA de autenticação
 * @returns {Object} Módulo auth mockado com falha
 */
export const mockAuthFailure = () => mockAuthModule({
  getAuthToken: jest.fn(() => null),
  verifyToken: jest.fn(() => null),
  authenticate: jest.fn(async () => null),
  authenticateAndGenerateToken: jest.fn(async () => ({
    error: 'INVALID_CREDENTIALS',
    message: 'Credenciais inválidas',
  })),
  withAuth: jest.fn((handler) => (req, res) => res.status(401).json({ message: 'Não autenticado' })),
});

/**
 * Reseta todos os mocks de auth para comportamento padrão
 * @param {Object} authMock - Módulo de auth mockado
 */
export const resetAuthMocks = (authMock) => {
  authMock.hashPassword?.mockClear();
  authMock.verifyPassword?.mockClear();
  authMock.generateToken?.mockClear();
  authMock.verifyToken?.mockClear();
  authMock.setAuthCookie?.mockClear();
  authMock.getAuthCookie?.mockClear();
  authMock.getAuthToken?.mockClear();
  authMock.authenticate?.mockClear();
  authMock.authenticateAndGenerateToken?.mockClear();
  authMock.withAuth?.mockClear();
  authMock.initializeAuth?.mockClear();
};