/**
 * User Factory
 * Gera dados de teste para usuários
 * 
 * Uso básico:
 *   const user = userFactory();
 *   const admin = adminFactory();
 * 
 * Com senha hash:
 *   const user = await userFactory.withHash({ password: 'secret123' });
 */

import bcrypt from 'bcryptjs';

let idCounter = 1;
const generateId = () => idCounter++;

export const resetUserIdCounter = () => { idCounter = 1; };

// Templates de dados
const firstNames = ['João', 'Maria', 'Pedro', 'Ana', 'Lucas', 'Julia', 'Gabriel', 'Sofia', 'Mateus', 'Laura'];
const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Carvalho', 'Almeida', 'Ferreira', 'Rodrigues'];
const domains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com'];

// Helper para escolher item aleatório
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Gerar username
const generateUsername = (firstName, lastName) => {
  const first = firstName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const last = lastName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return `${first}.${last}${Math.floor(Math.random() * 100)}`;
};

/**
 * Cria um objeto de usuário para testes
 * @param {Object} overrides - Propriedades para sobrescrever
 * @returns {Object} Usuário completo
 */
export const userFactory = (overrides = {}) => {
  const id = overrides.id ?? generateId();
  const firstName = overrides.firstName ?? pickRandom(firstNames);
  const lastName = overrides.lastName ?? pickRandom(lastNames);
  const username = overrides.username ?? generateUsername(firstName, lastName);
  
  return {
    id,
    username,
    email: overrides.email ?? `${username}@${pickRandom(domains)}`,
    password: overrides.password ?? `Senha${Math.floor(Math.random() * 1000)}!`,
    role: overrides.role ?? 'user',
    name: overrides.name ?? `${firstName} ${lastName}`,
    avatar: overrides.avatar ?? `https://i.pravatar.cc/150?u=${id}`,
    created_at: overrides.created_at ?? new Date(Date.now() - id * 86400000).toISOString(),
    updated_at: overrides.updated_at ?? new Date().toISOString(),
    ...overrides,
  };
};

/**
 * Cria um usuário admin
 * @param {Object} overrides - Propriedades para sobrescrever
 * @returns {Object} Usuário admin
 */
export const adminFactory = (overrides = {}) =>
  userFactory({ role: 'admin', ...overrides });

/**
 * Cria um usuário comum
 * @param {Object} overrides - Propriedades para sobrescrever
 * @returns {Object} Usuário comum
 */
export const regularUserFactory = (overrides = {}) =>
  userFactory({ role: 'user', ...overrides });

/**
 * Cria múltiplos usuários
 * @param {number} count - Quantidade de usuários
 * @param {Object} overrides - Propriedades para sobrescrever em todos
 * @param {Function} mapFn - Função para mapear cada usuário
 * @returns {Array} Lista de usuários
 */
userFactory.list = (count, overrides = {}, mapFn) => {
  const users = Array.from({ length: count }, () => userFactory(overrides));
  return mapFn ? users.map(mapFn) : users;
};

/**
 * Cria usuário com senha hasheada (async)
 * @param {Object} overrides - Propriedades para sobrescrever
 * @param {number} saltRounds - Rounds para bcrypt (default: 10)
 * @returns {Promise<Object>} Usuário com senha hasheada
 */
userFactory.withHash = async (overrides = {}, saltRounds = 10) => {
  const user = userFactory(overrides);
  const hashedPassword = await bcrypt.hash(user.password, saltRounds);
  return {
    ...user,
    password: hashedPassword,
    plainPassword: overrides.password || user.password, // Mantém a senha original para testes
  };
};

/**
 * Cria dados para criação de usuário (sem id, timestamps)
 * @param {Object} overrides - Propriedades para sobrescrever
 * @returns {Object} Dados para criação
 */
export const createUserInput = (overrides = {}) => ({
  username: overrides.username ?? 'novousuario',
  email: overrides.email ?? 'novo@exemplo.com',
  password: overrides.password ?? 'Senha123!',
  role: overrides.role ?? 'user',
  name: overrides.name ?? 'Novo Usuário',
  ...overrides,
});

/**
 * Cria dados para login
 * @param {Object} overrides - Propriedades para sobrescrever
 * @returns {Object} Credenciais de login
 */
export const loginInput = (overrides = {}) => ({
  username: overrides.username ?? 'testuser',
  password: overrides.password ?? 'Senha123!',
  ...overrides,
});

/**
 * Cria payload JWT para testes
 * @param {Object} overrides - Propriedades para sobrescrever
 * @returns {Object} Payload JWT
 */
export const jwtPayloadFactory = (overrides = {}) => {
  const user = userFactory(overrides);
  return {
    userId: user.id,
    username: user.username,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hora
    ...overrides,
  };
};

/**
 * Cria dados inválidos para testes de validação
 * @param {string} type - Tipo de invalidade ('empty', 'short', 'invalid_email', etc.)
 * @returns {Object} Dados inválidos
 */
export const invalidUserInput = (type = 'empty') => {
  const types = {
    empty: { username: '', email: '', password: '' },
    short: { username: 'ab', email: 'a@b.c', password: '123' },
    invalid_email: { username: 'validuser', email: 'not-an-email', password: 'validpass123' },
    no_username: { email: 'test@example.com', password: 'validpass123' },
    no_password: { username: 'validuser', email: 'test@example.com' },
    weak_password: { username: 'validuser', email: 'test@example.com', password: '123' },
  };
  
  return types[type] || types.empty;
};
