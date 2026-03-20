import { getPaginatedMusicas, createMusica, updateMusica, deleteMusica } from '../../../lib/db.js';
import { withAuth } from '../../../lib/auth.js';
import { invalidateCache } from '../../../lib/cache.js';

const isValidSpotifyUrl = (url) => {
  return url.includes('spotify.com') || url.includes('spotify:');
};

async function handler(req, res) {
  switch (req.method) {
    case 'GET':
      try {
        // Desabilita cache para garantir que a lista administrativa esteja sempre atualizada
        res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        
        const result = await getPaginatedMusicas(page, limit, search);
        
        // Log para diagnóstico: Verifique isso no terminal onde o servidor está rodando
        console.log('🔍 Admin Musicas GET:', { 
          total: result.pagination.total, 
          retornados: result.musicas.length,
          primeiroItem: result.musicas[0] ? result.musicas[0].titulo : 'Nenhum'
        });

        res.status(200).json(result);
      } catch (error) {
        console.error('Error fetching musicas:', error);
        res.status(500).json({ message: 'Erro ao buscar músicas' });
      }
      break;

    case 'POST':
      try {
        const { titulo, artista, descricao, url_spotify, publicado } = req.body;

        if (!titulo || !artista || !url_spotify) {
          return res.status(400).json({ message: 'Título, artista e URL do Spotify são obrigatórios' });
        }

        // Validação básica de URL do Spotify
        if (!isValidSpotifyUrl(url_spotify)) {
          return res.status(400).json({ message: 'URL do Spotify inválida' });
        }

        const novaMusica = await createMusica({
          titulo,
          artista,
          descricao,
          url_spotify,
          publicado: publicado !== undefined ? publicado : false // Default false se não enviado
        });

        // Invalida o cache para atualizar a listagem imediatamente
        await invalidateCache('musicas');

        res.status(201).json(novaMusica);
      } catch (error) {
        console.error('Error creating musica:', error);
        res.status(500).json({ message: 'Erro ao criar música', details: error.message });
      }
      break;

    case 'PUT':
      try {
        const { id, titulo, artista, descricao, url_spotify, publicado } = req.body;

        if (!id) {
          return res.status(400).json({ message: 'ID é obrigatório' });
        }

        if (!titulo || !artista || !url_spotify) {
          return res.status(400).json({ message: 'Título, artista e URL do Spotify são obrigatórios' });
        }

        // Validação básica de URL do Spotify
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

        // Invalida o cache após atualização
        await invalidateCache('musicas');

        res.status(200).json(musicaAtualizada);
      } catch (error) {
        console.error('Error updating musica:', error);
        res.status(500).json({ message: 'Erro ao atualizar música', details: error.message });
      }
      break;

    case 'DELETE':
      try {
        const { id } = req.body;

        if (!id) {
          return res.status(400).json({ message: 'ID é obrigatório' });
        }

        const resultado = await deleteMusica(id);

        if (!resultado) {
          return res.status(404).json({ message: 'Música não encontrada' });
        }

        // Invalida o cache após exclusão
        await invalidateCache('musicas');

        res.status(200).json({ message: 'Música excluída com sucesso' });
      } catch (error) {
        console.error('Error deleting musica:', error);
        res.status(500).json({ message: 'Erro ao excluir música', details: error.message });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Método ${req.method} não permitido`);
  }
}

export default withAuth(handler);