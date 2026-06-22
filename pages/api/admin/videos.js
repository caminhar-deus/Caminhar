import { getPaginatedVideos, createVideo, updateVideo, deleteVideo, reorderVideos } from '../../../lib/domain/videos.js';
import { createAdminHandler } from '../../../lib/api/adminCrudHandler.js';
import { z } from 'zod';

// Schema de validação para garantir a integridade dos dados.
const videoSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
  url_youtube: z.string().min(1, 'URL do YouTube é obrigatória'),
  descricao: z.string().max(500, 'Descrição deve ter no máximo 500 caracteres').optional().nullable(),
  thumbnail: z.string().optional().nullable(),
  publicado: z.boolean().optional()
});

const youtubeUrlRegex = /^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=[\w-]{11}|youtu\.be\/[\w-]{11})(?:[&?].*)?$/;

async function handleGet(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || '';
  const data = await getPaginatedVideos(page, limit, search);
  return res.status(200).json(data);
}

async function handlePost(req, res) {
  const validation = videoSchema.safeParse(req.body);
  if (!validation.success) {
    const fieldErrors = validation.error.flatten().fieldErrors;
    const firstErrorMessage = Object.values(fieldErrors)[0]?.[0] || 'Erro de validação desconhecido.';
    return res.status(400).json({ message: firstErrorMessage });
  }
  if (!youtubeUrlRegex.test(req.body.url_youtube)) {
    return res.status(400).json({ message: 'URL do YouTube inválida' });
  }
  const newVideo = await createVideo(req.body);
  await req.adminUtils.logActivity('CRIAR VÍDEO', newVideo.id, `Criou o vídeo: ${newVideo.titulo}`);
  return res.status(201).json(newVideo);
}

async function handlePut(req, res) {
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
  await req.adminUtils.logActivity('ATUALIZAR VÍDEO', id, `Atualizou o vídeo: ${updatedVideo.titulo}`);
  return res.status(200).json(updatedVideo);
}

async function handleDelete(req, res) {
  const idToDelete = req.query.id
    ? parseInt(req.query.id, 10)
    : (req.body?.id ? parseInt(req.body.id, 10) : null);

  if (!idToDelete) {
    return res.status(400).json({ message: 'ID do vídeo é obrigatório para exclusão' });
  }
  const deletedVideo = await deleteVideo(idToDelete);
  if (!deletedVideo) {
    return res.status(404).json({ message: 'Vídeo não encontrado' });
  }
  await req.adminUtils.logActivity('EXCLUIR VÍDEO', idToDelete, `Removeu o vídeo: ${deletedVideo.titulo}`);
  return res.status(200).json({ message: 'Vídeo excluído com sucesso' });
}

export default createAdminHandler({
  name: 'Video',
  permission: 'Gestão de Vídeos',
  handlers: { GET: handleGet, POST: handlePost, PUT: handlePut, DELETE: handleDelete },
  rateLimit: { max: 300, window: 60000 },
  cacheKeys: 'public_videos:*',
});
