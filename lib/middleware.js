import Cors from 'cors';
import { withAuth, getAuthToken, verifyToken } from './auth.js';

// Initialize CORS middleware
const cors = Cors({
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,
});

// Helper method to wait for a middleware to execute before continuing
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

/**
 * API Middleware - handles CORS, authentication, and common API functionality
 */
export function apiMiddleware(handler) {
  return async (req, res) => {
    try {
      // Validate that handler is a function
      if (typeof handler !== 'function') {
        console.error('API Middleware Error: handler is not a function');
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Invalid handler function',
          timestamp: new Date().toISOString()
        });
      }

      // Run CORS middleware
      await runMiddleware(req, res, cors);

      // Handle OPTIONS requests for CORS preflight
      if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
      }

      // Add common headers
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('X-API-Version', '1.0');

      // Call the actual handler
      return handler(req, res);

    } catch (error) {
      console.error('API Middleware Error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * Authenticated API Middleware - combines API middleware with authentication
 */
export function authenticatedApiMiddleware(handler) {
  return apiMiddleware(withAuth(handler));
}

/**
 * External API Authentication Middleware - supports both header and cookie authentication
 */
export function externalAuthMiddleware(handler) {
  return async (req, res) => {
    // Get token from header or cookie
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
        timestamp: new Date().toISOString()
      });
    }

    // Attach user to request
    req.user = decoded;
    return handler(req, res);
  };
}

/**
 * Rate limiting middleware
 */
export function rateLimitMiddleware(handler) {
  // Simple in-memory rate limiting (for production, consider Redis)
  const requestCounts = new Map();

  return async (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const key = `${ip}-${req.url}`;
    const now = Date.now();
    const window = 15 * 60 * 1000; // 15 minutes

    // Clean up old entries
    if (requestCounts.has(key)) {
      const [timestamp, count] = requestCounts.get(key);
      if (now - timestamp > window) {
        requestCounts.delete(key);
      }
    }

    // Initialize or increment count
    const count = requestCounts.has(key) ? requestCounts.get(key)[1] + 1 : 1;
    requestCounts.set(key, [now, count]);

    // Check rate limit (100 requests per 15 minutes)
    if (count > 100) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: 15 * 60 // 15 minutes in seconds
      });
    }

    return handler(req, res);
  };
}

/**
 * Error handling middleware
 */
export function errorHandlingMiddleware(handler) {
  return async (req, res) => {
    try {
      // Validate that handler is a function
      if (typeof handler !== 'function') {
        console.error('Error Handling Middleware Error: handler is not a function');
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Invalid handler function',
          timestamp: new Date().toISOString()
        });
      }

      await handler(req, res);
    } catch (error) {
      console.error('API Error:', error);

      let statusCode = 500;
      let errorType = 'Internal Server Error';
      let errorMessage = 'An unexpected error occurred';

      // Handle specific error types
      if (error.name === 'ValidationError') {
        statusCode = 400;
        errorType = 'Validation Error';
        errorMessage = error.message;
      } else if (error.name === 'UnauthorizedError') {
        statusCode = 401;
        errorType = 'Unauthorized';
        errorMessage = 'Authentication required';
      } else if (error.name === 'ForbiddenError') {
        statusCode = 403;
        errorType = 'Forbidden';
        errorMessage = 'Insufficient permissions';
      } else if (error.name === 'NotFoundError') {
        statusCode = 404;
        errorType = 'Not Found';
        errorMessage = error.message;
      }

      res.status(statusCode).json({
        error: errorType,
        message: errorMessage,
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
  };
}
