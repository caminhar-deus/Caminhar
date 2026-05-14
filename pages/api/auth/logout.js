import { serialize } from 'cookie';

export default function handler(req, res) {
  // Limpa o cookie usando as mesmas opções seguras da criação (httpOnly, secure, sameSite, path)
  const cookieString = serialize('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0, // Expira imediatamente
    path: '/',
  });

  res.setHeader('Set-Cookie', cookieString);
  
  return res.status(200).json({ success: true, message: 'Deslogado com sucesso' });
}
