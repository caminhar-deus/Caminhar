import { serialize } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    // Clear the auth cookie
    serialize('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: new Date(0), // Set to past date to expire
      path: '/',
    });

    return res.status(200).json({
      message: 'Logout realizado com sucesso'
    });

  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ message: 'Erro no servidor' });
  }
}