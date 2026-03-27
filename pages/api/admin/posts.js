import { getPaginatedPosts, createPost, updatePost, deletePost, logActivity, updateRecords, query } from '../../../lib/db.js';
import { withAuth } from '../../../lib/auth.js';
import { invalidateCache, checkRateLimit } from '../../../lib/cache.js'; // Importar checkRateLimit
import { z } from 'zod'; // Importar Zod para validação de esquema

// Schemas de validação com Zod
const postCreateSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  slug: z.string().min(1, 'Slug é obrigatório'),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  image_url: z.string().url('URL da imagem inválida').optional().or(z.literal('')), // Permite string vazia ou URL válida
  published: z.boolean().optional(),
});

const postUpdateDataSchema = z.object({ // Schema para os dados do corpo da requisição de atualização
  title: z.string().min(1, 'Título não pode ser vazio').optional(),
  slug: z.string().min(1, 'Slug não pode ser vazio').optional(),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  image_url: z.string().url('URL da imagem inválida').optional().or(z.literal('')),
  published: z.boolean().optional(),
});

const reorderItemSchema = z.object({
  id: z.number().int('ID do item deve ser um número inteiro').positive('ID do item deve ser positivo'),
  position: z.number().int('Posição deve ser um número inteiro').positive('Posição deve ser positiva'),
});

const reorderSchema = z.object({
  action: z.literal('reorder'),
  items: z.array(reorderItemSchema).min(1, 'Array de itens para reordenar não pode ser vazio'),
});

async function handler(req, res) {
  const { method } = req;
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  const user = req.user; // Usuário logado fornecido pelo middleware withAuth

  // 1. Verificação de Segurança e Autorização (Role-Based Access Control - RBAC)
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  // Busca as permissões atualizadas do cargo do usuário no banco de dados
  const roleQuery = await query('SELECT permissions FROM roles WHERE name = $1', [user.role], { log: false });
  const userPermissions = roleQuery.rows[0]?.permissions || [];

  const isSuperAdmin = user.role === 'admin';
  // Verifica se é super admin ou se tem a permissão específica para Posts/Artigos
  if (!isSuperAdmin && !userPermissions.includes('Posts/Artigos')) {
    return res.status(403).json({ error: 'Acesso negado. Requer permissão de Posts/Artigos.' });
  }

  // 2. Proteção contra requisições massivas (Rate Limit) nas mutações
  if (['POST', 'PUT', 'DELETE'].includes(method)) {
    const isRateLimited = await checkRateLimit(ip, 'api:admin:posts', 30, 60000); // Exemplo: 30 requisições por minuto
    if (isRateLimited) return res.status(429).json({ error: 'Muitas requisições. Tente novamente mais tarde.' });
  }

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
        // 2. Validação de entrada com Zod para criação de posts
        const validationResult = postCreateSchema.safeParse(req.body);
        if (!validationResult.success) {
          return res.status(400).json({ 
            message: 'Dados inválidos para criação de post', 
            errors: validationResult.error.flatten().fieldErrors 
          });
        }
        const { title, slug, excerpt, content, image_url, published } = validationResult.data;

        const newPost = await createPost({ title, slug, excerpt, content, image_url, published });
        
        if (user) await logActivity(user.username, 'CRIAR POST', 'POST', newPost.id, `Criou o artigo: ${title}`, ip);
        
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
        if (req.body.action === 'reorder') { // 3. Validação de entrada com Zod para reordenação
          const reorderValidation = reorderSchema.safeParse(req.body);
          if (!reorderValidation.success) {
            return res.status(400).json({
              message: 'Dados inválidos para reordenação',
              errors: reorderValidation.error.flatten().fieldErrors
            });
          }
          const { items } = reorderValidation.data;
          for (const item of items) { // Assumindo que updateRecords usa prepared statements
            await updateRecords('posts', { position: item.position }, { id: item.id }); 
          }
          await invalidateCache('posts:public:all'); // Invalida cache após reordenação
          return res.status(200).json({ success: true, message: 'Ordem atualizada' });
        }

        // 4. Validação de entrada para ID e dados de atualização de post
        const { id } = req.body;
        if (!id) {
          return res.status(400).json({ message: 'ID do post é obrigatório para atualização' });
        }
        const parsedId = z.number().int('ID deve ser um número inteiro').positive('ID deve ser positivo').safeParse(parseInt(id));
        if (!parsedId.success) {
          return res.status(400).json({ message: 'ID inválido para atualização de post', errors: parsedId.error.flatten().fieldErrors });
        }
        const postId = parsedId.data;

        const updateDataValidation = postUpdateDataSchema.safeParse(req.body);
        if (!updateDataValidation.success) {
          return res.status(400).json({ message: 'Dados inválidos para atualização de post', errors: updateDataValidation.error.flatten().fieldErrors });
        }
        const updatePayload = updateDataValidation.data;

        // Verifica se há dados reais para atualizar, excluindo o ID que já foi processado
        if (Object.keys(updatePayload).length === 0) {
          return res.status(400).json({ message: 'Nenhum dado fornecido para atualização' });
        }

        const updatedPost = await updatePost(postId, updatePayload);
        if (!updatedPost) {
          return res.status(404).json({ message: 'Post não encontrado' });
        }
        
        if (user) await logActivity(user.username, 'ATUALIZAR POST', 'POST', id, `Atualizou o artigo: ${title}`, ip);
        
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

        const postQueryToDel = await query('SELECT title FROM posts WHERE id = $1', [id]);
        const titlePost = postQueryToDel.rows[0]?.title || id;

        const deleted = await deletePost(id);
        if (!deleted) {
          return res.status(404).json({ message: 'Post não encontrado' });
        }

        if (user) await logActivity(user.username, 'EXCLUIR POST', 'POST', id, `Removeu o artigo: ${titlePost}`, ip);
        
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