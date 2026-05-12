import { getPaginatedMusicas, createMusica, updateMusica, deleteMusica } from '../../../lib/domain/musicas.js';
import { updateRecords } from '../../../lib/crud.js';
import { query } from '../../../lib/db.js';
import { createAdminHandler } from '../../../lib/api/adminCrudHandler.js';

const isValidSpotifyUrl = (url) => {
  return url.includes('spotify.com') || url.includes('spotify:');
};

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
  const { titulo, artista, descricao, url_spotify, publicado } = req.body;

  if (!titulo || !artista || !url_spotify) {
    return res.status(400).json({ message: 'Título, artista e URL do Spotify são obrigatórios' });
  }

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
    const { items } = req.body;
    for (const item of items) {
      await updateRecords('musicas', { position: item.position }, { id: item.id });
    }
    return res.status(200).json({ success: true, message: 'Ordem atualizada' });
  }

  const { id, titulo, artista, descricao, url_spotify, publicado } = req.body;

  if (!id) {
    return res.status(400).json({ message: 'ID é obrigatório' });
  }

  if (!titulo || !artista || !url_spotify) {
    return res.status(400).json({ message: 'Título, artista e URL do Spotify são obrigatórios' });
  }

  if (!isValidSpotifyUrl(url_spotify)) {
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
  const { id } = req.body;

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
  rateLimit: { max: 30, window: 60000 },
  cacheKeys: 'musicas',
});