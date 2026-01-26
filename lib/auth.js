import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { serialize, parse } from 'cookie';

// Secret key for JWT - in production, use environment variables
const JWT_SECRET = 'caminhar-com-deus-secret-key-2026';
const SALT_ROUNDS = 10;

// Mock database - in production, use a real database
const users = [
  {
    id: 1,
    username: 'admin',
    password: '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrJQ6XQ5Z3z3Z3z3Z3z3Z3z3Z3z3Z3z', // bcrypt hash for 'password'
    role: 'admin'
  }
];

// Hash password
export async function hashPassword(password) {
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
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Verify JWT token
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Set auth cookie
export function setAuthCookie(res, token) {
  serialize('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600, // 1 hour
    path: '/',
  });
}

// Get auth cookie
export function getAuthCookie(req) {
  const cookies = parse(req.headers.cookie || '');
  return cookies.token;
}

// Authenticate user
export async function authenticate(username, password) {
  const user = users.find(u => u.username === username);
  if (!user) return null;

  const isValid = await verifyPassword(password, user.password);
  return isValid ? user : null;
}

// Middleware for authentication
export function withAuth(handler) {
  return async (req, res) => {
    const token = getAuthCookie(req);
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
  // In a real app, you would check the database here
  // For this demo, we'll just ensure the default user has a proper hash
  const defaultPassword = 'password';
  const hashedPassword = await hashPassword(defaultPassword);

  // Update the mock user with the correct hash
  users[0].password = hashedPassword;

  console.log('Sistema de autenticação inicializado');
}