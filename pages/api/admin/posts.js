import { getAllPosts, createPost, updatePost, deletePost } from '../../../lib/db';
import { withAuth } from '../../../lib/auth';

async function handler(req, res) {
  try {
    // LISTAR POSTS (GET)
    if (req.method === 'GET') {
      const posts = await getAllPosts();
      return res.status(200).json(posts);
    }

    // CRIAR POST (POST)
    if (req.method === 'POST') {
      const { title, slug, excerpt, content, image_url, published } = req.body;
      
      if (!title || !slug) {
        return res.status(400).json({ message: 'Título e Slug são obrigatórios' });
      }

      const newPost = await createPost({ title, slug, excerpt, content, image_url, published });
      return res.status(201).json(newPost);
    }

    // ATUALIZAR POST (PUT)
    if (req.method === 'PUT') {
      const { id, title, slug, excerpt, content, image_url, published } = req.body;
      
      if (!id) {
        return res.status(400).json({ message: 'ID do post é obrigatório' });
      }

      const updatedPost = await updatePost(id, { title, slug, excerpt, content, image_url, published });
      return res.status(200).json(updatedPost);
    }

    // DELETAR POST (DELETE)
    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ message: 'ID do post é obrigatório' });
      }

      await deletePost(id);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ message: 'Método não permitido' });
  } catch (error) {
    console.error('Admin Posts API Error:', error);
    return res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
}

export default withAuth(handler);