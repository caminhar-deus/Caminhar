import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { serialize, parse } from 'cookie';
import { config } from 'dotenv';
import { initializeDatabase, getUserByUsername, createUser } from './db.js';

// Load environment variables
config();

// Use environment variables for secrets - required for production security
const JWT_SECRET = process.env.JWT_SECRET || 'caminhar-com-deus-secret-key-2026';
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

    // Use environment variables for admin credentials
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'password';

    // Validate environment variables
    if (!adminUsername || !adminPassword) {
      throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD environment variables must be set');
    }

    // Check if admin user exists
    const adminUser = await getUserByUsername(adminUsername);

    if (!adminUser) {
      // Create default admin user with environment variable credentials
      await createUser(adminUsername, adminPassword, 'admin');
      console.log(`Admin user '${adminUsername}' created successfully`);
    } else {
      console.log(`Admin user '${adminUsername}' already exists`);
    }

    console.log('Sistema de autenticação inicializado');
  } catch (error) {
    console.error('Error initializing auth system:', error);
    throw error;
  }
}
