import {
  getPaginatedCategories,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../../lib/domain/categories.js';
import { query } from '../../../lib/infra/db.js';
import { createAdminHandler } from '../../../lib/api/adminCrudHandler.js';
import { z } from 'zod';

// Schemas de validação com Zod
const categoryCreateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome não pode exceder 100 caracteres'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens').optional(),
});

const categoryUpdateDataSchema = z.object({
  name: z.string().min(1, 'Nome não pode ser vazio').max(100, 'Nome não pode exceder 100 caracteres').optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens').optional(),
});

/** Traduz o erro de slug duplicado do domínio em 409 (demais erros são repassados ao catch do handler). */
function isDuplicateSlug(error) {
  return error?.code === 'DUPLICATE_SLUG';
}

async function handleGet(req, res) {
  // Garante que a lista do admin esteja sempre atualizada
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');

  // ?all=1 → lista completa sem paginação (usada pelo campo de seleção de categorias do formulário de posts)
  if (req.query.all === '1') {
    const allCategories = await getAllCategories();
    return res.status(200).json({ data: allCategories });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || '';

  const result = await getPaginatedCategories(page, limit, search);

  return res.status(200).json(result);
}

async function handlePost(req, res) {
  const validationResult = categoryCreateSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({
      message: 'Dados inválidos para criação de categoria',
      errors: validationResult.error.flatten().fieldErrors,
    });
  }
  const { name, slug } = validationResult.data;

  let newCategory;
  try {
    newCategory = await createCategory({ name, slug });
  } catch (error) {
    if (isDuplicateSlug(error)) {
      return res.status(409).json({ message: 'Já existe uma categoria com esse slug' });
    }
    if (error?.code === 'INVALID_SLUG') {
      return res.status(400).json({
        message: error.message,
        errors: { slug: [error.message] },
      });
    }
    throw error;
  }

  await req.adminUtils.logActivity('CRIAR CATEGORIA', newCategory.id, `Criou a categoria: ${name}`);
  return res.status(201).json(newCategory);
}

async function handlePut(req, res) {
  // Validação de entrada para ID
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ message: 'ID da categoria é obrigatório para atualização' });
  }
  const parsedId = z.number().int('ID deve ser um número inteiro').positive('ID deve ser positivo').safeParse(parseInt(id));
  if (!parsedId.success) {
    return res.status(400).json({ message: 'ID inválido para atualização de categoria', errors: parsedId.error.flatten().fieldErrors });
  }
  const categoryId = parsedId.data;

  const updateDataValidation = categoryUpdateDataSchema.safeParse(req.body);
  if (!updateDataValidation.success) {
    return res.status(400).json({ message: 'Dados inválidos para atualização de categoria', errors: updateDataValidation.error.flatten().fieldErrors });
  }
  const updatePayload = updateDataValidation.data;

  if (Object.keys(updatePayload).length === 0) {
    return res.status(400).json({ message: 'Nenhum dado fornecido para atualização' });
  }

  let updatedCategory;
  try {
    updatedCategory = await updateCategory(categoryId, updatePayload);
  } catch (error) {
    if (isDuplicateSlug(error)) {
      return res.status(409).json({ message: 'Já existe uma categoria com esse slug' });
    }
    if (error?.code === 'INVALID_SLUG') {
      return res.status(400).json({
        message: error.message,
        errors: { slug: [error.message] },
      });
    }
    throw error;
  }
  if (!updatedCategory) {
    return res.status(404).json({ message: 'Categoria não encontrada' });
  }

  await req.adminUtils.logActivity('ATUALIZAR CATEGORIA', categoryId, `Atualizou a categoria: ${updatedCategory.name}`);
  return res.status(200).json(updatedCategory);
}

async function handleDelete(req, res) {
  const id = req.body?.id || req.query?.id;
  if (!id) {
    return res.status(400).json({ message: 'ID da categoria é obrigatório' });
  }

  const categoryQueryToDel = await query('SELECT name FROM categories WHERE id = $1', [id]);
  const categoryName = categoryQueryToDel.rows[0]?.name || id;

  const deleted = await deleteCategory(id);
  if (!deleted) {
    return res.status(404).json({ message: 'Categoria não encontrada' });
  }

  await req.adminUtils.logActivity('EXCLUIR CATEGORIA', id, `Removeu a categoria: ${categoryName}`);
  return res.status(200).json({ success: true });
}

export default createAdminHandler({
  name: 'Categoria',
  permission: 'Posts/Artigos',
  handlers: { GET: handleGet, POST: handlePost, PUT: handlePut, DELETE: handleDelete },
  rateLimit: { max: 300, window: 60000 },
  cacheKeys: 'posts:*',
});
