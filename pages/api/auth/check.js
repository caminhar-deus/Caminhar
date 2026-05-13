import { getAuthToken, verifyToken } from '../../../lib/auth.js';

/**
 * Endpoint de verificação de autenticação.
 *
 * GET /api/auth/check — Valida token JWT e retorna informações do usuário
 *
 * Integrado ao padrão do projeto: usa cookie httpOnly (web) ou Bearer token (API).
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Método não permitido - apenas GET é aceito',
    });
  }

  try {
    // Obtém token do header Authorization ou cookie
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Autenticação necessária',
      });
    }

    // Verifica token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token inválido ou expirado',
      });
    }

    // Retorna informações do usuário
    res.status(200).json({
      success: true,
      data: {
        authenticated: true,
        user: {
          userId: decoded.userId,
          username: decoded.username,
          role: decoded.role,
        },
      },
      message: 'Autenticação válida',
    });
  } catch (error) {
    console.error('Error in auth check:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Erro no servidor durante verificação de autenticação',
    });
  }
}