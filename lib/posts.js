import { withAuth } from '../../../lib/auth';
import { query } from '../../../lib/db';
import { z } from 'zod';

async function handler(req, res) {
  try {
    // LISTAR POSTS
    if (req.method === 'GET') {
      const { search, page = 1, limit = 5 } = req.query;
      const offset = (page - 1) * limit;
      
      let whereClause = '';
      const params = [];
      let paramIndex = 1;

      if (search) {
        whereClause = `WHERE title ILIKE $${paramIndex++} OR content ILIKE $${paramIndex++}`;
        params.push(`%${search}%`, `%${search}%`);
      }

      // Conta o total de registros para a paginação
      const countResult = await query(`SELECT COUNT(*) as total FROM posts ${whereClause}`, params);
      const total = parseInt(countResult.rows[0].total, 10);

      // Busca os registros da página atual
      params.push(limit, offset);
      const postsResult = await query(
        `SELECT * FROM posts ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`, 
        params
      );

      return res.status(200).json({
        data: postsResult.rows,
        pagination: {
          total,
          page: Number(page),
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    // CRIAR POST
    if (req.method === 'POST') {
      const createPostSchema = z.object({
        title: z.string().min(1, 'Título é obrigatório'),
        slug: z.string().min(1, 'Slug é obrigatório'),
        excerpt: z.string().nullable().optional(),
        content: z.string().nullable().optional(),
        image_url: z.string().nullable().optional(),
        published: z.boolean().optional(),
      });

      const validation = createPostSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Dados inválidos', 
          errors: validation.error.flatten().fieldErrors 
        });
      }

      const { title, slug, excerpt, content, image_url, published } = validation.data;

      const result = await query(
        `INSERT INTO posts (title, slug, excerpt, content, image_url, published, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) RETURNING *`,
        [title, slug, excerpt, content, image_url, published]
      );

      const newPost = result.rows[0];
      return res.status(201).json(newPost);
    }

    // ATUALIZAR POST
    if (req.method === 'PUT') {
      const updatePostSchema = z.object({
        id: z.number().or(z.string().transform((val) => Number(val))),
        title: z.string().min(1, 'Título é obrigatório'),
        slug: z.string().min(1, 'Slug é obrigatório'),
        excerpt: z.string().nullable().optional(),
        content: z.string().nullable().optional(),
        image_url: z.string().nullable().optional(),
        published: z.boolean().optional(),
      });

      const validation = updatePostSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Dados inválidos', 
          errors: validation.error.flatten().fieldErrors 
        });
      }

      const { id, title, slug, excerpt, content, image_url, published } = validation.data;

      const result = await query(
        `UPDATE posts 
         SET title = $1, slug = $2, excerpt = $3, content = $4, image_url = $5, published = $6, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $7 RETURNING *`,
        [title, slug, excerpt, content, image_url, published, id]
      );

      const updatedPost = result.rows[0];
      return res.status(200).json(updatedPost);
    }

    // DELETAR POST
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ message: 'ID é obrigatório' });

      await query('DELETE FROM posts WHERE id = $1', [id]);
      return res.status(200).json({ message: 'Post excluído com sucesso' });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);

  } catch (error) {
    console.error('Database error:', error);
    if (error.code === '23505') { // PostgreSQL unique violation
      return res.status(409).json({ message: 'Já existe um post com este Slug (URL)' });
    }
    return res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  }
}

export default withAuth(handler);