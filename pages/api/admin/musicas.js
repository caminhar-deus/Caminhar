import { getPaginatedMusicas, createMusica, updateMusica, deleteMusica } from '../../../lib/domain/musicas.js';
import { updateRecords } from '../../../lib/crud.js';
import { query } from '../../../lib/db.js';
import { createAdminHandler } from '../../../lib/api/adminCrudHandler.js';
import { z } from 'zod';

const isValidSpotifyUrl = (url) => {
  return url.includes('spotify.com') || url.includes('spotify:');
};

const musicaSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório'),
  artista: z.string().min(1, 'Artista é obrigatório'),
  descricao: z.string().optional(),
  url_spotify: z.string().min(1, 'URL do Spotify é obrigatória'),
  publicado: z.boolean().optional(),
});

const reorderItemSchema = z.object({
  id: z.number().int('ID deve ser um número inteiro').positive('ID deve ser positivo'),
  position: z.number().int('Posição deve ser um número inteiro'),
});

const reorderSchema = z.object({
  action: z.literal('reorder'),
  items: z.array(reorderItemSchema).min(1, 'Array de itens para reordenar não pode ser vazio'),
});

async function handleGet(req, res) {
  // Desabilita cache para garantir que a lista administrativa esteja sempre atualizada
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || '';

  const result = await getPaginatedMusicas(page, limit, search);

  console.log('🔍 Admin Musicas GET:', {
    total: result.pagination.total,
    retornados: result.musicas.length,
    primeiroItem: result.musicas[0] ? result.musicas[0].titulo : 'Nenhum'
  });

  return res.status(200).json(result);
}

async function handlePost(req, res) {
  const validation = musicaSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      message: 'Dados inválidos para criação de música',
      errors: validation.error.flatten().fieldErrors,
    });
  }

  const { titulo, artista, descricao, url_spotify, publicado } = validation.data;

  if (!isValidSpotifyUrl(url_spotify)) {
    return res.status(400).json({ message: 'URL do Spotify inválida' });
  }

  const novaMusica = await createMusica({
    titulo,
    artista,
    descricao,
    url_spotify,
    publicado: publicado !== undefined ? publicado : false
  });

  req.adminUtils.logActivity('CRIAR MÚSICA', novaMusica.id, `Criou a música: ${titulo}`);
  return res.status(201).json(novaMusica);
}

async function handlePut(req, res) {
  // Intercepta ação customizada de reordenação em massa (Drag & Drop)
  if (req.body.action === 'reorder') {
    const reorderValidation = reorderSchema.safeParse(req.body);
    if (!reorderValidation.success) {
      return res.status(400).json({
        message: 'Dados inválidos para reordenação',
        errors: reorderValidation.error.flatten().fieldErrors,
      });
    }
    const { items } = reorderValidation.data;
    for (const item of items) {
      await updateRecords('musicas', { position: item.position }, { id: item.id });
    }
    return res.status(200).json({ success: true, message: 'Ordem atualizada' });
  }

  // Validação para atualização: campos de texto são opcionais para permitir
  // toggle rápido de status (publicado) sem precisar reenviar todos os campos.
  const validation = z.object({
    id: z.number().int('ID deve ser um número inteiro').positive('ID deve ser positivo'),
    titulo: z.string().min(1, 'Título é obrigatório').optional(),
    artista: z.string().min(1, 'Artista é obrigatório').optional(),
    descricao: z.string().optional(),
    url_spotify: z.string().min(1, 'URL do Spotify é obrigatória').optional(),
    publicado: z.boolean().optional(),
  }).safeParse({
    ...req.body,
    id: typeof req.body.id === 'string' ? parseInt(req.body.id, 10) : req.body.id,
  });

  if (!validation.success) {
    return res.status(400).json({
      message: 'Dados inválidos para atualização de música',
      errors: validation.error.flatten().fieldErrors,
    });
  }

  const { id, titulo, artista, descricao, url_spotify, publicado } = validation.data;

  // Se url_spotify foi enviado, valida; se não (ex: toggle de status), pula validação
  if (url_spotify !== undefined && !isValidSpotifyUrl(url_spotify)) {
    return res.status(400).json({ message: 'URL do Spotify inválida' });
  }

  const musicaAtualizada = await updateMusica(id, {
    titulo,
    artista,
    descricao,
    url_spotify,
    publicado
  });

  if (!musicaAtualizada) {
    return res.status(404).json({ message: 'Música não encontrada' });
  }

  req.adminUtils.logActivity('ATUALIZAR MÚSICA', id, `Atualizou a música: ${titulo}`);
  return res.status(200).json(musicaAtualizada);
}

async function handleDelete(req, res) {
  const id = req.query.id
    ? parseInt(req.query.id, 10)
    : (req.body?.id ? (typeof req.body.id === 'string' ? parseInt(req.body.id, 10) : req.body.id) : null);

  if (!id) {
    return res.status(400).json({ message: 'ID é obrigatório' });
  }

  const deletedMusica = await deleteMusica(id, { returning: ['id', 'titulo'] });

  if (!deletedMusica) {
    return res.status(404).json({ message: 'Música não encontrada' });
  }

  const tituloMusica = deletedMusica.titulo || id;
  req.adminUtils.logActivity('EXCLUIR MÚSICA', id, `Removeu a música: ${tituloMusica}`);
  return res.status(200).json({ message: 'Música excluída com sucesso' });
}

export default createAdminHandler({
  name: 'Musica',
  handlers: { GET: handleGet, POST: handlePost, PUT: handlePut, DELETE: handleDelete },
  rateLimit: { max: 300, window: 60000 },
  cacheKeys: 'musicas:*',
});
