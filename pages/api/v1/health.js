export default function handler(req, res) {
  // Retorna 200 OK imediatamente, sem processamento pesado
  res.status(200).json({ status: 'ok' });
}