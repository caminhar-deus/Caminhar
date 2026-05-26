import { getPaginatedPosts, createPost, updatePost, deletePost } from '../../../lib/domain/posts.js';
import { updateRecords } from '../../../lib/crud.js';
import { query } from '../../../lib/db.js';
import { createAdminHandler } from '../../../lib/api/adminCrudHandler.js';
import { z } from 'zod';

// Schemas de validação com Zod
const postCreateSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  slug: z.string().min(1, 'Slug é obrigatório'),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  image_url: z.string().refine(val =>
    !val || val === '' || val.startsWith('http') || val.startsWith('/'), {
    message: 'A URL da imagem deve ser um link completo (https://...) ou um caminho local válido (/uploads/...).'
  }).optional(),
  published: z.boolean().optional(),
});

const postUpdateDataSchema = z.object({
  title: z.string().min(1, 'Título não pode ser vazio').optional(),
  slug: z.string().min(1, 'Slug não pode ser vazio').optional(),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  image_url: z.string().refine(val =>
    !val || val === '' || val.startsWith('http') || val.startsWith('/'), {
    message: 'A URL da imagem deve ser um link completo (https://...) ou um caminho local válido (/uploads/...).'
  }).optional(),
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

async function handleGet(req, res) {
  // Garante que a lista do admin esteja sempre atualizada
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || '';

  const result = await getPaginatedPosts(page, limit, search);

  return res.status(200).json(result);
}

async function handlePost(req, res) {
  const validationResult = postCreateSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({
      message: 'Dados inválidos para criação de post',
      errors: validationResult.error.flatten().fieldErrors
    });
  }
  const { title, slug, excerpt, content, image_url, published } = validationResult.data;

  const newPost = await createPost({ title, slug, excerpt, content, image_url, published });

  req.adminUtils.logActivity('CRIAR POST', newPost.id, `Criou o artigo: ${title}`);
  return res.status(201).json(newPost);
}

async function handlePut(req, res) {
  // Intercepta ação customizada de reordenação em massa (Drag & Drop)
  if (req.body.action === 'reorder') {
    const reorderValidation = reorderSchema.safeParse(req.body);
    if (!reorderValidation.success) {
      return res.status(400).json({
        message: 'Dados inválidos para reordenação',
        errors: reorderValidation.error.flatten().fieldErrors
      });
    }
    const { items } = reorderValidation.data;
    for (const item of items) {
      await updateRecords('posts', { position: item.position }, { id: item.id });
    }
    return res.status(200).json({ success: true, message: 'Ordem atualizada' });
  }

  // Validação de entrada para ID
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

  if (Object.keys(updatePayload).length === 0) {
    return res.status(400).json({ message: 'Nenhum dado fornecido para atualização' });
  }

  const updatedPost = await updatePost(postId, updatePayload);
  if (!updatedPost) {
    return res.status(404).json({ message: 'Post não encontrado' });
  }

  req.adminUtils.logActivity('ATUALIZAR POST', postId, `Atualizou o artigo: ${updatedPost.title}`);
  return res.status(200).json(updatedPost);
}

async function handleDelete(req, res) {
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

  req.adminUtils.logActivity('EXCLUIR POST', id, `Removeu o artigo: ${titlePost}`);
  return res.status(200).json({ success: true });
}

export default createAdminHandler({
  name: 'Post',
  permission: 'Posts/Artigos',
  handlers: { GET: handleGet, POST: handlePost, PUT: handlePut, DELETE: handleDelete },
  rateLimit: { max: 300, window: 60000 },
  cacheKeys: 'posts:*',
});
