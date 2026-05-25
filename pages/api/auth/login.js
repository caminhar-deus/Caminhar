import { authenticateAndGenerateToken, setAuthCookie } from '../../../lib/auth';
import { detectSpoofedIP } from '../../../lib/api/helpers.js';

/**
 * Endpoint de autenticação de usuários.
 * Unificado: suporta retorno de token via cookie (padrão) ou via body (para API externa).
 * 
 * POST /api/auth/login
 * Body: { username, password }
 * Query: ?response=body (opcional - retorna token no body em vez de cookie)
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed', message: `Método ${req.method} não permitido` });
  }

  // 1. Detecção de IP spoofing
  const { isSpoofed, socketIP: detectedSocketIP } = detectSpoofedIP(req);
  if (isSpoofed) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'IP spoofing detectado. Requisição bloqueada.',
    });
  }

  // Pega o IP real do usuário (socket) para rate limiting, prevenindo spoofing
  const socketIP = req.socket?.remoteAddress;
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded && socketIP && socketIP !== '::1' && socketIP !== forwarded.split(',')[0].trim()
    ? socketIP // Socket IP é a fonte confiável quando há discrepância (spoofing)
    : forwarded?.split(',')[0] || socketIP || 'unknown';

  const { username, password } = req.body;

  // 2. Usa a função compartilhada de autenticação (rate limit + validação + token)
  const result = await authenticateAndGenerateToken(username, password, ip, {
    rateLimitLimit: 5,
    rateLimitWindow: 60000,
  });

  // 3. Trata os diferentes tipos de erro
  if (result.error === 'RATE_LIMITED') {
    return res.status(429).json({ error: 'Too Many Requests', message: result.message });
  }

  if (result.error === 'INVALID_CREDENTIALS') {
    return res.status(401).json({ error: 'Unauthorized', message: result.message });
  }

  if (result.error === 'MISSING_FIELDS') {
    return res.status(400).json({ error: 'Bad Request', message: result.message });
  }

  if (result.error) {
    return res.status(500).json({ error: 'Internal Server Error', message: result.message || 'Erro interno do servidor' });
  }

  const { user, token } = result;

  // 4. Decide o formato de resposta baseado no parâmetro ?response=
  const responseMode = req.query.response;

  if (responseMode === 'body') {
    // Modo API externa: retorna token no body
    return res.status(200).json({
      success: true,
      data: {
        token,
        token_type: 'Bearer',
        expires_in: 3600,
        user: {
          userId: user.id,
          username: user.username,
          role: user.role,
          permissions: user.permissions,
        },
      },
      message: 'Autenticação bem-sucedida',
      timestamp: new Date().toISOString(),
    });
  }

  // Modo padrão: retorna cookie httpOnly + dados do usuário
  setAuthCookie(res, token);

  return res.status(200).json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
    },
    message: 'Autenticação bem-sucedida',
    timestamp: new Date().toISOString(),
  });
}