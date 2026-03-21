import { authenticate, generateToken, setAuthCookie } from '../../../lib/auth';
import { checkRateLimit } from '../../../lib/cache';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  // 1. Pega o IP do usuário
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  
  // 2. Verifica o rate limit (Chave: 'api:auth:login', Limite: 5 tentativas, Janela: 60s)
  const isRateLimited = await checkRateLimit(ip, 'api:auth:login', 5, 60000);

  if (isRateLimited) {
    console.warn(`🚨 [Rate Limit] IP ${ip} bloqueado por excesso de tentativas de login.`);
    return res.status(429).json({ message: 'Muitas tentativas de login. Aguarde um minuto e tente novamente.' });
  }

  const { username, password } = req.body;

  try {
    const user = await authenticate(username, password);

    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const token = generateToken(user);
    setAuthCookie(res, token);

    return res.status(200).json({ user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}