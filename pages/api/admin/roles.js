import { query } from '../../../lib/db';
import { createRecord, updateRecords, deleteRecords } from '../../../lib/crud';
import { createAdminHandler } from '../../../lib/api/adminCrudHandler.js';
import { z } from 'zod';

const roleSchema = z.object({
  name: z.string().min(1, 'Nome do cargo é obrigatório'),
  permissions: z.array(z.string()).optional(),
});

const roleUpdateSchema = z.object({
  id: z.number().int('ID deve ser um número inteiro').positive('ID deve ser positivo'),
  name: z.string().min(1, 'Nome do cargo é obrigatório').optional(),
  permissions: z.array(z.string()).optional(),
});

async function handleGet(req, res) {
  try {
    const { rows } = await query('SELECT * FROM roles ORDER BY id ASC');
    return res.status(200).json({ data: rows });
  } catch (e) {
    // Se a tabela não existir, ela será criada automaticamente no primeiro acesso
    if (e.code === '42P01') {
      await query(`
        CREATE TABLE roles (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          permissions JSONB DEFAULT '[]'::jsonb
        )
      `);
      // Popula os cargos iniciais por padrão
      await query(`INSERT INTO roles (name, permissions) VALUES ('admin', '["Visão Geral", "Posts/Artigos", "Gestão de Músicas", "Gestão de Vídeos", "Gestão de Produtos", "Configuração de Cabeçalho", "Segurança", "Usuários", "Auditoria"]')`);
      await query(`INSERT INTO roles (name, permissions) VALUES ('user', '["Visão Geral"]')`);

      const { rows } = await query('SELECT * FROM roles ORDER BY id ASC');
      return res.status(200).json({ data: rows });
    }
    throw e;
  }
}

async function handlePost(req, res) {
  const validation = roleSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      message: 'Dados inválidos para criação de cargo',
      errors: validation.error.flatten().fieldErrors,
    });
  }

  const { name, permissions } = validation.data;
  const newRole = await createRecord('roles', { name, permissions: Array.isArray(permissions) ? JSON.stringify(permissions) : permissions });
  req.adminUtils.logActivity('CRIAR CARGO', newRole.id, `Criou o cargo: ${name}`);
  return res.status(201).json(newRole);
}

async function handlePut(req, res) {
  const updateId = typeof req.body.id === 'string' ? parseInt(req.body.id, 10) : req.body.id;
  const { id, ...updateData } = req.body;

  const validation = roleUpdateSchema.partial().safeParse({ id: updateId, ...updateData });
  if (!validation.success) {
    return res.status(400).json({
      message: 'Dados inválidos para atualização de cargo',
      errors: validation.error.flatten().fieldErrors,
    });
  }

  if (updateData.permissions && Array.isArray(updateData.permissions)) updateData.permissions = JSON.stringify(updateData.permissions);
  const updatedRoles = await updateRecords('roles', updateData, { id: updateId });
  req.adminUtils.logActivity('ATUALIZAR CARGO', updateId, `Atualizou o cargo: ${updateData.name || updateId}`);
  return res.status(200).json(updatedRoles[0] || {});
}

async function handleDelete(req, res) {
  const deleteId = req.body.id || parseInt(req.query.id);
  const roleQueryToDel = await query('SELECT name FROM roles WHERE id = $1', [deleteId]);
  const roleName = roleQueryToDel.rows[0]?.name || deleteId;
  await deleteRecords('roles', { id: deleteId });
  req.adminUtils.logActivity('EXCLUIR CARGO', deleteId, `Removeu o cargo: ${roleName}`);
  return res.status(200).json({ success: true, message: 'Cargo removido com sucesso' });
}

export default createAdminHandler({
  name: 'Role',
  permission: ['Segurança', 'Usuários'],
  handlers: { GET: handleGet, POST: handlePost, PUT: handlePut, DELETE: handleDelete },
  rateLimit: { max: 30, window: 60000 },
});