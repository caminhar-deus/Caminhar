import { getPaginatedPosts, createPost, updatePost, deletePost, logActivity, updateRecords } from '../../../lib/db.js';
import { withAuth } from '../../../lib/auth.js';
import { invalidateCache } from '../../../lib/cache.js';

async function handler(req, res) {
  const { method } = req;
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  const user = req.user; // Usuário logado fornecido pelo middleware withAuth

  switch (method) {
    case 'GET':
      try {
        // Garante que a lista do admin esteja sempre atualizada
        res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
        
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        
        const result = await getPaginatedPosts(page, limit, search);
        
        // Log para diagnóstico: Verifique isso no terminal onde o servidor está rodando
        console.log('🔍 Admin Posts GET:', { 
          total: result.pagination.total, 
          retornados: result.posts.length,
          primeiroItem: result.posts[0] ? result.posts[0].title : 'Nenhum'
        });

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
        
        if (user) await logActivity(user.username, 'CREATE', 'POST', newPost.id, `Criou o artigo: ${title}`, ip);
        
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
        // Intercepta ação customizada de reordenação em massa (Drag & Drop)
        if (req.body.action === 'reorder') {
          const { items } = req.body;
          for (const item of items) {
            await updateRecords('posts', { position: item.position }, { id: item.id });
          }
          return res.status(200).json({ success: true, message: 'Ordem atualizada' });
        }

        const { id, title, slug, excerpt, content, image_url, published } = req.body;
        
        if (!id) {
          return res.status(400).json({ message: 'ID do post é obrigatório' });
        }

        const updatedPost = await updatePost(id, { title, slug, excerpt, content, image_url, published });
        if (!updatedPost) {
          return res.status(404).json({ message: 'Post não encontrado' });
        }
        
        if (user) await logActivity(user.username, 'UPDATE', 'POST', id, `Atualizou o artigo: ${title}`, ip);
        
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
        
        if (user) await logActivity(user.username, 'DELETE', 'POST', id, `Removeu o artigo ID: ${id}`, ip);
        
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