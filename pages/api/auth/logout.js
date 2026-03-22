export default function handler(req, res) {
  // Limpa o cookie definindo a data de expiração para o passado
  res.setHeader('Set-Cookie', [
    'token=; Path=/; HttpOnly; SameSite=Strict; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  ]);
  
  return res.status(200).json({ success: true, message: 'Deslogado com sucesso' });
}