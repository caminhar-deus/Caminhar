import { getPublishedVideos } from '../../lib/videos.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Método ${req.method} não permitido`);
  }

  try {
    const { search } = req.query;
    const videos = await getPublishedVideos(search);
    res.status(200).json(videos);
  } catch (error) {
    console.error('Error fetching published videos:', error);
    res.status(500).json({ message: 'Erro ao buscar vídeos' });
  }
}