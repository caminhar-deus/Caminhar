import { getPaginatedPosts, createPost, updatePost, deletePost } from '../../../lib/db.js';
import { withAuth } from '../../../lib/auth.js';
import { invalidateCache } from '../../../lib/cache.js';

async function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        // Garante que a lista do admin esteja sempre atualizada
        res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
        
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        
        const result = await getPaginatedPosts(page, limit, search);
        res.status(200).json(result);
      } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: 'Erro ao buscar posts' });
      }
      break;

    case 'POST':
      try {
        const { title, slug, excerpt, content, image_url, published } = req.body;
        
        if (!title || !slug) {
          return res.status(400).json({ message: 'Título e Slug são obrigatórios' });
        }

        const newPost = await createPost({ title, slug, excerpt, content, image_url, published });
        // Invalida o cache público se um novo post for criado
        await invalidateCache('posts:public:all');
        res.status(201).json(newPost);
      } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ message: 'Erro ao criar post', details: error.message });
      }
      break;

    case 'PUT':
      try {
        const { id, title, slug, excerpt, content, image_url, published } = req.body;
        
        if (!id) {
          return res.status(400).json({ message: 'ID do post é obrigatório' });
        }

        const updatedPost = await updatePost(id, { title, slug, excerpt, content, image_url, published });
        if (!updatedPost) {
          return res.status(404).json({ message: 'Post não encontrado' });
        }
        await invalidateCache('posts:public:all');
        res.status(200).json(updatedPost);
      } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ message: 'Erro ao atualizar post', details: error.message });
      }
      break;

    case 'DELETE':
      try {
        const { id } = req.body;
        if (!id) {
          return res.status(400).json({ message: 'ID do post é obrigatório' });
        }

        const deleted = await deletePost(id);
        if (!deleted) {
          return res.status(404).json({ message: 'Post não encontrado' });
        }
        await invalidateCache('posts:public:all');
        res.status(200).json({ success: true });
      } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ message: 'Erro ao excluir post', details: error.message });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Método ${method} não permitido`);
  }
}

export default withAuth(handler);