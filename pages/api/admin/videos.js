import { withAuth } from '../../../lib/auth.js';
import { getPaginatedVideos, createVideo, updateVideo, deleteVideo, reorderVideos } from '../../../lib/domain/videos.js';
import { z } from 'zod';

// Schema de validação para garantir a integridade dos dados.
const videoSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
  url_youtube: z.string().min(1, 'URL do YouTube é obrigatória'),
  descricao: z.string().max(500, 'Descrição deve ter no máximo 500 caracteres').optional().nullable(),
  thumbnail: z.string().optional().nullable(),
  publicado: z.boolean().optional()
});

const youtubeUrlRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)/;

async function handler(req, res) {
  // Garante que apenas administradores possam acessar esta rota.
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acesso negado. Requer privilégios de administrador.' });
  }

  try {
    switch (req.method) {
      case 'GET': {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const data = await getPaginatedVideos(page, limit, search);
        return res.status(200).json(data);
      }

      case 'POST': {
        const validation = videoSchema.safeParse(req.body);
        if (!validation.success) {
          // Usar .flatten() é mais robusto para extrair a primeira mensagem de erro.
          const fieldErrors = validation.error.flatten().fieldErrors;
          const firstErrorMessage = Object.values(fieldErrors)[0]?.[0] || 'Erro de validação desconhecido.';
          return res.status(400).json({ message: firstErrorMessage });
        }
        if (!youtubeUrlRegex.test(req.body.url_youtube)) {
            return res.status(400).json({ message: 'URL do YouTube inválida' });
        }
        const newVideo = await createVideo(req.body);
        return res.status(201).json(newVideo);
      }

      case 'PUT': {
        if (req.body.action === 'reorder') {
            await reorderVideos(req.body.items);
            return res.status(200).json({ message: 'Ordem atualizada com sucesso' });
        }

        const { id, ...updateData } = req.body;
        if (!id) {
            return res.status(400).json({ message: 'ID é obrigatório para atualização' });
        }
        
        const validation = videoSchema.partial().safeParse(updateData);
        if (!validation.success) {
            // Usar .flatten() é mais robusto para extrair a primeira mensagem de erro.
            const fieldErrors = validation.error.flatten().fieldErrors;
            const firstErrorMessage = Object.values(fieldErrors)[0]?.[0] || 'Erro de validação desconhecido.';
            return res.status(400).json({ message: firstErrorMessage });
        }

        if (updateData.url_youtube && !youtubeUrlRegex.test(updateData.url_youtube)) {
            return res.status(400).json({ message: 'URL do YouTube inválida' });
        }
        const updatedVideo = await updateVideo(id, updateData);
        if (!updatedVideo) {
            return res.status(404).json({ message: 'Vídeo não encontrado' });
        }
        return res.status(200).json(updatedVideo);
      }

      case 'DELETE': {
        // CORREÇÃO: Lê o ID da query string (enviado pelo frontend) com fallback para o body (para testes).
        const idToDelete = req.query.id ? parseInt(req.query.id, 10) : req.body?.id;
        
        if (!idToDelete) {
            return res.status(400).json({ message: 'ID do vídeo é obrigatório para exclusão' });
        }
        const deletedVideo = await deleteVideo(idToDelete);
        if (!deletedVideo) {
            return res.status(404).json({ message: 'Vídeo não encontrado' });
        }
        return res.status(200).json({ message: 'Vídeo excluído com sucesso' });
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ message: `Método ${req.method} não permitido` });
    }
  } catch (error) {
    console.error(`Erro ao manusear ${req.method} /api/admin/videos:`, error);
    const errorMessage = error.message.includes('unique constraint') 
      ? 'Já existe um vídeo com este título ou URL.'
      : 'Erro interno ao processar a requisição de vídeos.';
    res.status(500).json({ message: errorMessage });
  }
}

export default withAuth(handler);