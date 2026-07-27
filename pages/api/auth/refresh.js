import { refreshAccessToken, setAuthCookie, setRefreshTokenCookie, getRefreshTokenCookie } from '../../../lib/auth';
import { logger } from '../../../lib/logger';

/**
 * Endpoint de renovação de access token via refresh token.
 *
 * POST /api/auth/refresh
 * Body (opcional): { refreshToken } — usado quando o cookie não está disponível
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed', message: `Método ${req.method} não permitido` });
  }

  // Tenta obter refresh token do cookie primeiro, depois do body
  const refreshToken = getRefreshTokenCookie(req) || req.body?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Refresh token não fornecido' });
  }

  try {
    const result = await refreshAccessToken(refreshToken);

    if (result.error) {
      // Remove os cookies antigos
      setAuthCookie(res, '', { maxAge: 0 });
      setRefreshTokenCookie(res, '', { maxAge: 0 });
      return res.status(401).json({ error: result.error, message: result.message });
    }

    // Atualiza os cookies
    setAuthCookie(res, result.accessToken);
    setRefreshTokenCookie(res, result.refreshToken);

    return res.status(200).json({
      success: true,
      data: {
        token: result.accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: result.refreshToken,
        refresh_token_expires_in: 2592000,
        user: result.user,
      },
      message: 'Token renovado com sucesso',
    });
  } catch (error) {
    logger.error('Auth', 'Erro ao renovar token:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro interno do servidor' });
  }
}