import { getAuthToken, verifyToken } from '../../../../lib/auth';

/**
 * External Authentication Check Endpoint (v1)
 * Validates JWT token and returns user information
 * @version 1.0
 * @public
 * @authenticated
 */
export default async function handler(req, res) {
    if (req.method !== 'GET') {
      return res.status(405).json({
        error: 'Method Not Allowed',
        message: 'Método não permitido - apenas GET é aceito',
        timestamp: new Date().toISOString()
      });
    }

    try {
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

      // Return user information
      res.status(200).json({
        success: true,
        data: {
          authenticated: true,
          user: {
            userId: decoded.userId,
            username: decoded.username,
            role: decoded.role
          }
        },
        message: 'Autenticação válida',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in external auth check:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Erro no servidor durante verificação de autenticação',
        timestamp: new Date().toISOString()
      });
    }
  }
