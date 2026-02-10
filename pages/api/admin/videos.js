import { getPaginatedVideos, createVideo, updateVideo, deleteVideo } from '../../../lib/videos.js';

export default async function handler(req, res) {
  // Check authentication
  const origin = req.headers.origin || req.headers.host || 'http://localhost:3000';
  const baseUrl = origin.startsWith('http') ? origin : `http://${origin}`;
  
  const authResponse = await fetch(`${baseUrl}/api/auth/check`, {
    method: 'GET',
    headers: {
      'Cookie': req.headers.cookie || ''
    }
  });

  if (!authResponse.ok) {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  switch (req.method) {
    case 'GET':
      try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        
        const result = await getPaginatedVideos(page, limit);
        res.status(200).json(result);
      } catch (error) {
        console.error('Error fetching videos:', error);
        res.status(500).json({ message: 'Erro ao buscar vídeos' });
      }
      break;

    case 'POST':
      try {
        const { titulo, url_youtube, descricao, publicado } = req.body;

        if (!titulo || !url_youtube) {
          return res.status(400).json({ message: 'Título e URL do YouTube são obrigatórios' });
        }

        if (descricao && descricao.length > 500) {
          return res.status(400).json({ message: 'A descrição deve ter no máximo 500 caracteres' });
        }

        // Debug: Log the URL being received
        console.log('URL recebida para validação:', url_youtube);
        
        // Validate YouTube URL format
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        console.log('Regex test result:', youtubeRegex.test(url_youtube));
        
        if (!youtubeRegex.test(url_youtube)) {
          console.log('URL falhou na validação');
          return res.status(400).json({ message: 'URL do YouTube inválida' });
        }

        const novoVideo = await createVideo({
          titulo,
          url_youtube,
          descricao,
          publicado: publicado !== undefined ? publicado : false // Default false se não enviado
        });

        res.status(201).json(novoVideo);
      } catch (error) {
        console.error('Error creating video:', error);
        res.status(500).json({ message: error.message || 'Erro ao criar vídeo' });
      }
      break;

    case 'PUT':
      try {
        const { id, titulo, url_youtube, descricao, publicado } = req.body;

        if (!id) {
          return res.status(400).json({ message: 'ID é obrigatório' });
        }

        if (!titulo || !url_youtube) {
          return res.status(400).json({ message: 'Título e URL do YouTube são obrigatórios' });
        }

        if (descricao && descricao.length > 500) {
          return res.status(400).json({ message: 'A descrição deve ter no máximo 500 caracteres' });
        }

        // Validate YouTube URL format
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        if (!youtubeRegex.test(url_youtube)) {
          return res.status(400).json({ message: 'URL do YouTube inválida' });
        }

        const videoAtualizado = await updateVideo(id, {
          titulo,
          url_youtube,
          descricao,
          publicado
        });

        if (!videoAtualizado) {
          return res.status(404).json({ message: 'Vídeo não encontrado' });
        }

        res.status(200).json(videoAtualizado);
      } catch (error) {
        console.error('Error updating video:', error);
        res.status(500).json({ message: error.message || 'Erro ao atualizar vídeo' });
      }
      break;

    case 'DELETE':
      try {
        const { id } = req.body;

        if (!id) {
          return res.status(400).json({ message: 'ID é obrigatório' });
        }

        const resultado = await deleteVideo(id);

        if (!resultado) {
          return res.status(404).json({ message: 'Vídeo não encontrado' });
        }

        res.status(200).json({ message: 'Vídeo excluído com sucesso' });
      } catch (error) {
        console.error('Error deleting video:', error);
        res.status(500).json({ message: 'Erro ao excluir vídeo' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Método ${req.method} não permitido`);
  }
}