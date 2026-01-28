import { withAuth } from '../../../lib/auth';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { z } from 'zod';

// Helper para conexão com o banco
async function openDb() {
  return open({
    filename: path.join(process.cwd(), 'data', 'caminhar.db'),
    driver: sqlite3.Database
  });
}

async function handler(req, res) {
  const db = await openDb();

  try {
    // LISTAR POSTS
    if (req.method === 'GET') {
      const { search, page = 1, limit = 5 } = req.query;
      const offset = (page - 1) * limit;
      
      let queryBase = 'FROM posts';
      const params = [];

      if (search) {
        queryBase += ' WHERE title LIKE ? OR content LIKE ?';
        params.push(`%${search}%`, `%${search}%`);
      }

      // Conta o total de registros para a paginação
      const countResult = await db.get(`SELECT COUNT(*) as total ${queryBase}`, params);
      const total = countResult.total;

      // Busca os registros da página atual
      const posts = await db.all(
        `SELECT * ${queryBase} ORDER BY created_at DESC LIMIT ? OFFSET ?`, 
        [...params, limit, offset]
      );

      // Converte 1/0 do SQLite para boolean
      const formattedPosts = posts.map(p => ({
        ...p,
        published: !!p.published
      }));
      
      return res.status(200).json({
        data: formattedPosts,
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

      const result = await db.run(
        `INSERT INTO posts (title, slug, excerpt, content, image_url, published, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [title, slug, excerpt, content, image_url, published ? 1 : 0]
      );

      const newPost = await db.get('SELECT * FROM posts WHERE id = ?', result.lastID);
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

      await db.run(
        `UPDATE posts 
         SET title = ?, slug = ?, excerpt = ?, content = ?, image_url = ?, published = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [title, slug, excerpt, content, image_url, published ? 1 : 0, id]
      );

      const updatedPost = await db.get('SELECT * FROM posts WHERE id = ?', id);
      return res.status(200).json(updatedPost);
    }

    // DELETAR POST
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ message: 'ID é obrigatório' });

      await db.run('DELETE FROM posts WHERE id = ?', id);
      return res.status(200).json({ message: 'Post excluído com sucesso' });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);

  } catch (error) {
    console.error('Database error:', error);
    // Verifica erro de duplicidade (slug único)
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: 'Já existe um post com este Slug (URL)' });
    }
    return res.status(500).json({ message: 'Erro interno do servidor', error: error.message });
  } finally {
    await db.close();
  }
}

export default withAuth(handler);