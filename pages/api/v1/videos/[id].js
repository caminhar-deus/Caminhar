import { invalidateCache } from '../../../../lib/cache.js';
import { getAuthToken, verifyToken } from '../../../../lib/auth.js';
import { updateVideo, deleteVideo } from '../../../../lib/videos.js';

export default async function handler(req, res) {
  const token = getAuthToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Não autenticado' });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Token inválido' });
  }

  const { id } = req.query;
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({ success: false, message: 'ID do vídeo inválido ou não fornecido.' });
  }
  const videoId = parseInt(id);

  switch (req.method) {
    case 'PUT':
      return handlePut(req, res, videoId);
    case 'DELETE':
      return handleDelete(req, res, videoId);
    default:
      res.setHeader('Allow', ['PUT', 'DELETE']);
      return res.status(405).json({ success: false, message: `Método ${req.method} não permitido` });
  }
}

async function handlePut(req, res, videoId) {
  try {
    const updatedVideo = await updateVideo(videoId, req.body);
    if (!updatedVideo) {
      return res.status(404).json({ success: false, message: 'Vídeo não encontrado' });
    }
    await invalidateCache('videos:public:*');
    return res.status(200).json({ success: true, data: updatedVideo });
  } catch (error) {
    console.error(`Erro ao atualizar vídeo ${videoId}:`, error);
    return res.status(500).json({ success: false, message: 'Erro ao atualizar vídeo' });
  }
}

async function handleDelete(req, res, videoId) {
  try {
    const deletedVideo = await deleteVideo(videoId);
    if (!deletedVideo) {
      return res.status(404).json({ success: false, message: 'Vídeo não encontrado' });
    }
    await invalidateCache('videos:public:*');
    return res.status(200).json({ success: true, message: 'Vídeo deletado com sucesso' });
  } catch (error) {
    console.error(`Erro ao deletar vídeo ${videoId}:`, error);
    return res.status(500).json({ success: false, message: 'Erro ao deletar vídeo' });
  }
}