import { setAuthCookie, setRefreshTokenCookie, getRefreshTokenCookie, revokeRefreshToken } from '../../../lib/auth/auth.js';

export default async function handler(req, res) {
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
