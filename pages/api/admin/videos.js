import { getPaginatedVideos, createVideo, updateVideo, deleteVideo, updateRecords, logActivity, query } from '../../../lib/db.js';
import { withAuth } from '../../../lib/auth.js';

const isValidYouTubeUrl = (url) => {
  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  return youtubeRegex.test(url);
};

async function handler(req, res) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  const user = req.user; // Extraído automaticamente pelo middleware withAuth

  switch (req.method) {
    case 'GET':
      try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        
        const result = await getPaginatedVideos(page, limit, search);

        // Log para diagnóstico: Verifique isso no terminal onde o servidor está rodando
        console.log('🔍 Admin Videos GET:', { 
          total: result.pagination.total, 
          retornados: result.videos.length,
          primeiroItem: result.videos[0] ? result.videos[0].titulo : 'Nenhum'
        });

        res.status(200).json(result);
      } catch (error) {
        console.error('Error fetching videos:', error);
        res.status(500).json({ message: 'Erro ao buscar vídeos' });
      }
      break;

    case 'POST':
      try {
        const { titulo, url_youtube, descricao, publicado, thumbnail } = req.body;

        if (!titulo || !url_youtube) {
          return res.status(400).json({ message: 'Título e URL do YouTube são obrigatórios' });
        }

        if (descricao && descricao.length > 500) {
          return res.status(400).json({ message: 'A descrição deve ter no máximo 500 caracteres' });
        }

        // Debug: Log the URL being received
        console.log('URL recebida para validação:', url_youtube);
        
        if (!isValidYouTubeUrl(url_youtube)) {
          console.log('URL falhou na validação');
          return res.status(400).json({ message: 'URL do YouTube inválida' });
        }

        const novoVideo = await createVideo({
          titulo,
          url_youtube,
          descricao,
          publicado: publicado !== undefined ? publicado : false, // Default false se não enviado
          thumbnail
        });

        if (user) await logActivity(user.username, 'CRIAR VÍDEO', 'VIDEO', novoVideo.id, `Criou o vídeo: ${titulo}`, ip);

        res.status(201).json(novoVideo);
      } catch (error) {
        console.error('Error creating video:', error);
        res.status(500).json({ message: error.message || 'Erro ao criar vídeo' });
      }
      break;

    case 'PUT':
      try {
        // Intercepta ação customizada de reordenação em massa (Drag & Drop)
        if (req.body.action === 'reorder') {
          const { items } = req.body;
          for (const item of items) {
            await updateRecords('videos', { position: item.position }, { id: item.id });
          }
          return res.status(200).json({ success: true, message: 'Ordem atualizada' });
        }

        const { id, titulo, url_youtube, descricao, publicado, thumbnail } = req.body;

        if (!id) {
          return res.status(400).json({ message: 'ID é obrigatório' });
        }

        if (!titulo || !url_youtube) {
          return res.status(400).json({ message: 'Título e URL do YouTube são obrigatórios' });
        }

        if (descricao && descricao.length > 500) {
          return res.status(400).json({ message: 'A descrição deve ter no máximo 500 caracteres' });
        }

        if (!isValidYouTubeUrl(url_youtube)) {
          return res.status(400).json({ message: 'URL do YouTube inválida' });
        }

        const videoAtualizado = await updateVideo(id, {
          titulo,
          url_youtube,
          descricao,
          publicado,
          thumbnail
        });

        if (!videoAtualizado) {
          return res.status(404).json({ message: 'Vídeo não encontrado' });
        }

        if (user) await logActivity(user.username, 'ATUALIZAR VÍDEO', 'VIDEO', id, `Atualizou o vídeo: ${titulo}`, ip);

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

        const videoQueryToDel = await query('SELECT titulo FROM videos WHERE id = $1', [id]);
        const tituloVideo = videoQueryToDel.rows[0]?.titulo || id;

        const resultado = await deleteVideo(id);

        if (!resultado) {
          return res.status(404).json({ message: 'Vídeo não encontrado' });
        }

        if (user) await logActivity(user.username, 'EXCLUIR VÍDEO', 'VIDEO', id, `Removeu o vídeo: ${tituloVideo}`, ip);

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

export default withAuth(handler);