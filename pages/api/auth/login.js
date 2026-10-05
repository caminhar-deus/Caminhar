import { authenticateAndGenerateToken, setAuthCookie, setRefreshTokenCookie } from '../../../lib/auth/auth';
import { resolveClientIP, fromNodeRequest, UNKNOWN_IP } from '../../../lib/api/helpers.js';
import { checkRateLimit } from '../../../lib/cache/cache.js';
import { logger } from '../../../lib/infra/logger.js';

/** Chave e janela compartilhadas com o `proxy.js` (bucket único, sem contagem dupla). */
const LOGIN_RATE_LIMIT = { key: 'api:auth:login', limit: 5, window: 60000 };
/** Backstop por usuário: 10 falhas em 5 min, independente de IP. */
const LOGIN_USER_LIMIT = { key: 'api:auth:login:username', limit: 10, window: 300000 };

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

  // 1. Resolve o IP do cliente pelo modelo de confiança de TRUST_PROXY
  const { clientIP, untrustedForwarded, socketIP, forwardedIP } = resolveClientIP(fromNodeRequest(req));

  // Topologia não declarada (há X-Forwarded-For, mas TRUST_PROXY está em 0):
  // registra para o operador, sem bloquear a autenticação.
  if (untrustedForwarded) {
    logger.warn('Auth',
      `X-Forwarded-For divergente do socket sem TRUST_PROXY | socket=${socketIP} | forwarded=${forwardedIP}`
    );
  }

  // IP usado no rate limit da autenticação
  const ip = clientIP;

  const { username, password } = req.body;

  // Limite por IP. Mesma chave e janela do `proxy.js`, então os dois
  // compartilham um único bucket: o middleware rejeita antes de ler o corpo e
  // este é o backstop quando o middleware não tem IP confiável.
  // `lib/auth/auth.js` NÃO aplica limite nenhum (o parâmetro `ip` é ignorado
  // lá), então sem esta chamada o login fica sem proteção de brute force.
  //
  // Sem IP confiável o limite é pulado de propósito: chavear por `unknown`
  // criaria um bucket global que qualquer visitor esgota, derrubando o login
  // de todos. Nesse caso resta o limite por usuário, abaixo.
  if (ip !== UNKNOWN_IP) {
    const ipLimited = await checkRateLimit(ip, LOGIN_RATE_LIMIT.key, LOGIN_RATE_LIMIT.limit, LOGIN_RATE_LIMIT.window);
    if (ipLimited) {
      logger.warn('Auth', `Rate limit de login excedido | IP: ${ip}`);
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Muitas tentativas de login. Tente novamente mais tarde.',
      });
    }
  }

  // 2. Usa a função compartilhada de autenticação (rate limit + validação + token)
  let result;
  try {
    result = await authenticateAndGenerateToken(username, password, ip, {
      rateLimitLimit: 5,
      rateLimitWindow: 60000,
    });
  } catch (error) {
    logger.error('Auth', 'Erro interno durante a autenticação:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro interno do servidor' });
  }

  // 3. Trata os diferentes tipos de erro
  if (result.error === 'RATE_LIMITED') {
    return res.status(429).json({ error: 'Too Many Requests', message: result.message });
  }

  if (result.error === 'INVALID_CREDENTIALS') {
    // Backstop por usuário: não depende de IP, então sobrevive tanto à
    // rotação de X-Forwarded-For quanto à ausência de IP confiável.
    // Conta só falhas, para não punir quem acerta o login.
    if (username && await checkRateLimit(username, LOGIN_USER_LIMIT.key, LOGIN_USER_LIMIT.limit, LOGIN_USER_LIMIT.window)) {
      logger.warn('Auth', `Rate limit por usuário excedido | usuário: ${username}`);
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Muitas tentativas de login. Tente novamente mais tarde.',
      });
    }
    return res.status(401).json({ error: 'Unauthorized', message: result.message });
  }

  if (result.error === 'MISSING_FIELDS') {
    return res.status(400).json({ error: 'Bad Request', message: result.message });
  }

  if (result.error) {
    return res.status(500).json({ error: 'Internal Server Error', message: result.message || 'Erro interno do servidor' });
  }

  const { user, token, refreshToken, permissionsLoaded } = result;

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
        refresh_token: refreshToken,
        refresh_token_stored: refreshToken !== undefined && refreshToken !== null,
        refresh_token_expires_in: 2592000,
        user: {
          userId: user.id,
          username: user.username,
          role: user.role,
          permissions: user.permissions,
          permissionsLoaded,
        },
      },
      message: 'Autenticação bem-sucedida',
      timestamp: new Date().toISOString(),
    });
  }

  // Modo padrão: retorna cookie httpOnly + dados do usuário
  setAuthCookie(res, token);
  if (refreshToken) {
    setRefreshTokenCookie(res, refreshToken);
  }

  return res.status(200).json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
      permissionsLoaded,
    },
    message: 'Autenticação bem-sucedida',
    timestamp: new Date().toISOString(),
  });
}