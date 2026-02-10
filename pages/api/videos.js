import { getVideos } from '../../lib/videos';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const videos = await getVideos();
      res.status(200).json(videos);
    } catch (error) {
      console.error('Error fetching videos:', error);
      res.status(500).json({ error: 'Erro ao buscar vídeos' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Método ${req.method} não permitido` });
  }
}