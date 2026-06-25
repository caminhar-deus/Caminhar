import { setAuthCookie } from '../../../lib/auth.js';

export default function handler(req, res) {
  // Limpa o cookie usando a mesma função de criação (garante opções consistentes)
  setAuthCookie(res, '', { maxAge: 0 });

  return res.status(200).json({ success: true, message: 'Deslogado com sucesso' });
}
