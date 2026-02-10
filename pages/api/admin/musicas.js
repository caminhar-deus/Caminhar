import { getAllMusicas, createMusica, updateMusica, deleteMusica } from '../../../lib/musicas.js';
import { withAuth } from '../../../lib/auth.js';

async function handler(req, res) {
  switch (req.method) {
    case 'GET':
      try {
        const { search } = req.query;
        const musicas = await getAllMusicas(search);
        res.status(200).json(musicas);
      } catch (error) {
        console.error('Error fetching musicas:', error);
        res.status(500).json({ message: 'Erro ao buscar músicas' });
      }
      break;

    case 'POST':
      try {
        const { titulo, artista, url_imagem, url_spotify, publicado } = req.body;

        if (!titulo || !artista || !url_spotify) {
          return res.status(400).json({ message: 'Título, artista e URL do Spotify são obrigatórios' });
        }

        // Validação básica de URL do Spotify
        if (!url_spotify.includes('spotify.com') && !url_spotify.includes('spotify:')) {
          return res.status(400).json({ message: 'URL do Spotify inválida' });
        }

        const novaMusica = await createMusica({
          titulo,
          artista,
          url_imagem,
          url_spotify,
          publicado: publicado !== undefined ? publicado : false // Default false se não enviado
        });

        res.status(201).json(novaMusica);
      } catch (error) {
        console.error('Error creating musica:', error);
        res.status(500).json({ message: 'Erro ao criar música' });
      }
      break;

    case 'PUT':
      try {
        const { id, titulo, artista, url_imagem, url_spotify, publicado } = req.body;

        if (!id) {
          return res.status(400).json({ message: 'ID é obrigatório' });
        }

        if (!titulo || !artista || !url_spotify) {
          return res.status(400).json({ message: 'Título, artista e URL do Spotify são obrigatórios' });
        }

        // Validação básica de URL do Spotify
        if (!url_spotify.includes('spotify.com') && !url_spotify.includes('spotify:')) {
          return res.status(400).json({ message: 'URL do Spotify inválida' });
        }

        const musicaAtualizada = await updateMusica(id, {
          titulo,
          artista,
          url_imagem,
          url_spotify,
          publicado
        });

        if (!musicaAtualizada) {
          return res.status(404).json({ message: 'Música não encontrada' });
        }

        res.status(200).json(musicaAtualizada);
      } catch (error) {
        console.error('Error updating musica:', error);
        res.status(500).json({ message: 'Erro ao atualizar música' });
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

        res.status(200).json({ message: 'Música excluída com sucesso' });
      } catch (error) {
        console.error('Error deleting musica:', error);
        res.status(500).json({ message: 'Erro ao excluir música' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Método ${req.method} não permitido`);
  }
}

export default withAuth(handler);