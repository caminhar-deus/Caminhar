import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { serialize, parse } from 'cookie';
import { initializeDatabase, getUserByUsername, createUser } from './db.js';

// Secret key for JWT - in production, use environment variables
const JWT_SECRET = 'caminhar-com-deus-secret-key-2026';
const SALT_ROUNDS = 10;

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
  const cookie = serialize('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600, // 1 hour
    path: '/',
  });
  res.setHeader('Set-Cookie', cookie);
}

// Get auth cookie
export function getAuthCookie(req) {
  const cookies = parse(req.headers.cookie || '');
  return cookies.token;
}

// Authenticate user
export async function authenticate(username, password) {
  const user = await getUserByUsername(username);
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
  try {
    // Initialize database
    await initializeDatabase();

    // Check if admin user exists
    const adminUser = await getUserByUsername('admin');

    if (!adminUser) {
      // Create default admin user
      await createUser('admin', 'password', 'admin');
      console.log('Default admin user created');
    } else {
      console.log('Admin user already exists');
    }

    console.log('Sistema de autenticação inicializado');
  } catch (error) {
    console.error('Error initializing auth system:', error);
    throw error;
  }
}
