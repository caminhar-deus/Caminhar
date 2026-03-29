import { withAuth } from '../../../lib/auth.js';
import { getPaginatedVideos, createVideo, updateVideo, deleteVideo } from '../../../lib/domain/videos.js';
import { logActivity } from '../../../lib/domain/audit.js';
import { z } from 'zod';

// Zod schemas for robust input validation
const videoUpdateSchema = z.object({
  titulo: z.string().optional(),
  url_youtube: z.string().optional(),
  descricao: z.string().max(500, { message: 'A descrição deve ter no máximo 500 caracteres' }).optional(),
  publicado: z.boolean().optional(),
  thumbnail: z.string().optional(),
});

const videoCreateSchema = videoUpdateSchema.superRefine((data, ctx) => {
  // Validação customizada para campos obrigatórios, que oferece mais controle sobre as mensagens de erro.
  if (!data.titulo || data.titulo.trim() === '') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'O campo Título é obrigatório.',
      path: ['titulo'],
    });
  }
  if (!data.url_youtube || data.url_youtube.trim() === '') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'O campo URL do YouTube é obrigatório.',
      path: ['url_youtube'],
    });
  }

  // Validação de formato da URL do YouTube, apenas se o campo existir
  if (data.url_youtube) {
    const isYoutubeUrl = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(data.url_youtube);
    if (!isYoutubeUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'URL do YouTube inválida',
        path: ['url_youtube'],
      });
    }
  }
});

// The original `videoSchema` is now split into `videoCreateSchema` (for POST) and `videoUpdateSchema` (for PUT)

async function handler(req, res) {
  const { method, body, query: reqQuery, user } = req;
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';

  try {
    switch (method) {
      case 'GET': {
        const { page = 1, limit = 10, search = '' } = reqQuery;
        const result = await getPaginatedVideos(Number(page), Number(limit), search);
        return res.status(200).json(result);
      }

      case 'POST': {
        const validation = videoCreateSchema.safeParse(body);
        if (!validation.success) {
          const firstErrorMessage = validation.error.issues[0]?.message;
          return res.status(400).json({ message: firstErrorMessage || 'Campos obrigatórios: titulo, url_youtube' });
        }
        
        const newVideo = await createVideo(validation.data);
        await logActivity(user.username, 'CREATE', 'VIDEO', newVideo.id, `Criou o vídeo: ${newVideo.titulo}`, ip);
        return res.status(201).json(newVideo);
      }

      case 'PUT': {
        const { id, ...updateData } = body;
        if (!id) {
          return res.status(400).json({ message: 'ID é obrigatório' });
        }
        
        const validation = videoUpdateSchema.safeParse(updateData);
        if (!validation.success) {
            const firstErrorMessage = validation.error.issues[0]?.message;
            return res.status(400).json({ message: firstErrorMessage || 'Dados de atualização inválidos' });
        }

        const updatedVideo = await updateVideo(id, validation.data);
        if (!updatedVideo) {
          return res.status(404).json({ message: 'Vídeo não encontrado' });
        }
        await logActivity(user.username, 'UPDATE', 'VIDEO', id, `Atualizou o vídeo: ${updatedVideo.titulo}`, ip);
        return res.status(200).json(updatedVideo);
      }

      case 'DELETE': {
        const { id } = body;
        if (!id) {
          return res.status(400).json({ message: 'ID é obrigatório' });
        }
        const deletedVideo = await deleteVideo(id);
        if (!deletedVideo) {
          return res.status(404).json({ message: 'Vídeo não encontrado' });
        }
        await logActivity(user.username, 'DELETE', 'VIDEO', id, `Excluiu o vídeo ID: ${id}`, ip);
        return res.status(200).json({ message: 'Vídeo excluído com sucesso' });
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ message: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error(`Error handling ${method} /api/admin/videos:`, error);
    const message = `Erro ao ${method === 'GET' ? 'buscar' : method === 'POST' ? 'criar' : method === 'PUT' ? 'atualizar' : 'excluir'} vídeos`;
    return res.status(500).json({ message });
  }
}

export default withAuth(handler);