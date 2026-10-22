import { setAuthCookie, setRefreshTokenCookie, getRefreshTokenCookie, revokeRefreshToken } from '../../../lib/auth/auth.js';

export default async function handler(req, res) {
  // POST-only: um GET (ex.: `<img src="/api/auth/logout">` numa página de
  // terceiro) não pode deslogar a sessão. Padrão de `pages/api/status.js`.
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed', message: 'Método não permitido' });
  }

  // Invalida o refresh token no banco, se existir
  const refreshToken = getRefreshTokenCookie(req);
  if (refreshToken) {
    try {
      await revokeRefreshToken(refreshToken);
    } catch {
      // Falha na revogação não deve impedir o logout
    }
  }

  // Limpa os cookies usando as mesmas funções de criação (garante opções consistentes)
  setAuthCookie(res, '', { maxAge: 0 });
  setRefreshTokenCookie(res, '', { maxAge: 0 });

  return res.status(200).json({ success: true, message: 'Deslogado com sucesso' });
}
