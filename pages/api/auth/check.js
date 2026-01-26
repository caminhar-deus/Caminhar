import { getAuthCookie, verifyToken } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const token = getAuthCookie(req);
    if (!token) {
      return res.status(401).json({ authenticated: false, message: 'Não autenticado' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ authenticated: false, message: 'Token inválido' });
    }

    return res.status(200).json({
      authenticated: true,
      user: {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role
      }
    });

  } catch (error) {
    console.error('Error in auth check:', error);
    return res.status(500).json({ authenticated: false, message: 'Erro no servidor' });
  }
}