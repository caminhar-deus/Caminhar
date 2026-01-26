import { authenticate, generateToken, setAuthCookie } from '../../../lib/auth';
import { initializeAuth } from '../../../lib/auth';

// Initialize auth system
initializeAuth();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Usuário e senha são obrigatórios' });
    }

    const user = await authenticate(username, password);

    if (!user) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Set HTTP-only cookie
    setAuthCookie(res, token);

    return res.status(200).json({
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
}