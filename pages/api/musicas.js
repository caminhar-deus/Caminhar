import { getPublishedMusicas } from '../../lib/musicas.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Método ${req.method} não permitido`);
  }

  try {
    const { search } = req.query;
    const musicas = await getPublishedMusicas(search);
    res.status(200).json(musicas);
  } catch (error) {
    console.error('Error fetching published musicas:', error);
    res.status(500).json({ message: 'Erro ao buscar músicas' });
  }
}