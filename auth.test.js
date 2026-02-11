import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

// Mock do JWT
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mocked.jwt.token'),
  verify: jest.fn(),
}));

// Mock do bcrypt para comparação de senhas
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}), { virtual: true });

// Mock do repositório do banco de dados
jest.mock('./lib/db/repository', () => ({
  findUserByUsername: jest.fn(),
}), { virtual: true });

const bcrypt = jest.requireMock('bcrypt');
const repository = jest.requireMock('./lib/db/repository');

// Simula o handler da API de login, pois o arquivo não foi fornecido
const loginHandler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Usuário e senha são obrigatórios' });
  }

  const user = await repository.findUserByUsername(username);
  if (!user) {
    return res.status(401).json({ message: 'Credenciais inválidas' });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ message: 'Credenciais inválidas' });
  }

  const jwt = jest.requireMock('jsonwebtoken');
  const token = jwt.sign({ sub: user.id, username: user.username }, 'secret', { expiresIn: '1h' });

  return res.status(200).json({ token });
};


describe('API de Autenticação (/api/auth/login)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve retornar um token JWT com credenciais válidas', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { username: 'admin', password: 'correct-password' },
    });

    repository.findUserByUsername.mockResolvedValue({ id: 1, username: 'admin', password: 'hashed-password' });
    bcrypt.compare.mockResolvedValue(true);

    await loginHandler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({ token: 'mocked.jwt.token' });
  });

  it('deve retornar 401 com senha incorreta', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { username: 'admin', password: 'wrong-password' },
    });

    repository.findUserByUsername.mockResolvedValue({ id: 1, username: 'admin', password: 'hashed-password' });
    bcrypt.compare.mockResolvedValue(false); // Senha não confere

    await loginHandler(req, res);

    expect(res._getStatusCode()).toBe(401);
    expect(JSON.parse(res._getData()).message).toBe('Credenciais inválidas');
  });

  it('deve retornar 400 se usuário ou senha não forem fornecidos', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { username: 'admin' } });
    await loginHandler(req, res);
    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData()).message).toBe('Usuário e senha são obrigatórios');
  });
});

// --- Simulação do Middleware de Autenticação ---

// Simula o HOC `withAuth` de `lib/auth.js` para testar a lógica de verificação de token
const withAuth = (handler) => async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token não fornecido ou mal formatado.' });
  }

  const token = authHeader.split(' ')[1];
  const jwt = jest.requireMock('jsonwebtoken');

  try {
    // Simula a verificação do token
    const decoded = jwt.verify(token, 'secret-placeholder');
    req.user = decoded; // Anexa o usuário decodificado à requisição
    return handler(req, res);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado.' });
    }
    return res.status(401).json({ message: 'Token inválido.' });
  }
};

// Handler simples para uma rota protegida
const protectedHandler = (req, res) => {
  res.status(200).json({ message: 'Acesso concedido', user: req.user });
};

// Rota protegida envolvida pelo middleware
const protectedApiRoute = withAuth(protectedHandler);


describe('Middleware de Autenticação (withAuth)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve permitir o acesso com um token JWT válido', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: { 'Authorization': 'Bearer valid.token' },
    });

    const mockUser = { sub: 1, username: 'admin' };
    const jwt = jest.requireMock('jsonwebtoken');
    jwt.verify.mockReturnValue(mockUser);

    await protectedApiRoute(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({ message: 'Acesso concedido', user: mockUser });
  });

  it('deve retornar 401 se o token JWT estiver expirado', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: { 'Authorization': 'Bearer expired.token' },
    });

    const jwt = jest.requireMock('jsonwebtoken');
    // Para simular o erro, precisamos da classe de erro real do `jsonwebtoken`
    const originalJwt = jest.requireActual('jsonwebtoken');
    const expiredError = new originalJwt.TokenExpiredError('jwt expired', new Date());

    jwt.verify.mockImplementation(() => { throw expiredError; });

    await protectedApiRoute(req, res);

    expect(res._getStatusCode()).toBe(401);
    expect(JSON.parse(res._getData())).toEqual({ message: 'Token expirado.' });
  });

  it('deve retornar 401 se o token JWT for inválido (assinatura incorreta)', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: { 'Authorization': 'Bearer invalid.token' },
    });

    const jwt = jest.requireMock('jsonwebtoken');
    jwt.verify.mockImplementation(() => { throw new Error('invalid signature'); });

    await protectedApiRoute(req, res);

    expect(res._getStatusCode()).toBe(401);
    expect(JSON.parse(res._getData())).toEqual({ message: 'Token inválido.' });
  });

  it('deve retornar 401 se o token não for fornecido', async () => {
    const { req, res } = createMocks({ method: 'GET', headers: {} }); // Sem header
    await protectedApiRoute(req, res);
    expect(res._getStatusCode()).toBe(401);
    expect(JSON.parse(res._getData()).message).toBe('Token não fornecido ou mal formatado.');
  });
});