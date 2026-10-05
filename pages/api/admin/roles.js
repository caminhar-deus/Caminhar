import { query } from '../../../lib/infra/db';
import { createRecord, updateRecords, deleteRecords } from '../../../lib/crud/crud';
import { createAdminHandler } from '../../../lib/api/adminCrudHandler.js';
import { getRolePermissions } from '../../../lib/domain/permissions.js';
import { logger } from '../../../lib/infra/logger.js';
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

/**
 * Normaliza as rows antes do `res.json`: `roles.permissions` é TEXT (string JSON)
 * e os consumidores da UI (`AdminRolesTab`, `AdminDashboard`) esperam array.
 * Só `permissions` é convertido; os demais campos são preservados.
 *
 * @param {Array<Object>} rows
 * @returns {Array<Object>}
 */
const normalizeRoleRows = (rows) =>
  rows.map((row) => ({ ...row, permissions: getRolePermissions(row) }));

async function handleGet(req, res) {
  try {
    const { rows } = await query('SELECT * FROM roles ORDER BY id ASC');
    return res.status(200).json({ data: normalizeRoleRows(rows) });
  } catch (e) {
    if (e.code === '42P01') {
      // Schema é responsabilidade das migrações (`npm run migrate`), não do
      // path de request: o DDL/DML inline foi removido (código morto em produção
      // — a migração 000 já cria a tabela — e divergente do schema real).
      logger.error('Role', 'Schema desatualizado: tabela "roles" ausente. Execute "npm run migrate".', e);
      return res.status(500).json({
        error: 'Erro interno no servidor',
        message: 'Schema desatualizado: tabela "roles" ausente. Execute "npm run migrate".',
      });
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
  await req.adminUtils.logActivity('CRIAR CARGO', newRole.id, `Criou o cargo: ${name}`);
  // `createRecord` usa RETURNING * sobre a coluna TEXT: sem normalizar, a
  // resposta traria `permissions` como string (contradizendo o GET).
  return res.status(201).json(normalizeRoleRows([newRole])[0]);
}

async function handlePut(req, res) {
  const { id: Id, ...updateData } = req.body;
  const updateId = typeof Id === 'string' ? parseInt(Id, 10) : Id;

  const validation = roleUpdateSchema.partial().safeParse({ id: updateId, ...updateData });
  if (!validation.success) {
    return res.status(400).json({
      message: 'Dados inválidos para atualização de cargo',
      errors: validation.error.flatten().fieldErrors,
    });
  }

  if (updateData.permissions && Array.isArray(updateData.permissions)) updateData.permissions = JSON.stringify(updateData.permissions);
  const updatedRoles = await updateRecords('roles', updateData, { id: updateId });
  await req.adminUtils.logActivity('ATUALIZAR CARGO', updateId, `Atualizou o cargo: ${updateData.name || updateId}`);
  // RETURNING * sobre a coluna TEXT → mesmo formato array do GET (mantém o
  // fallback `{}` quando nenhuma row foi atualizada).
  return res.status(200).json(normalizeRoleRows(updatedRoles)[0] || {});
}

async function handleDelete(req, res) {
  const deleteId = req.body.id || parseInt(req.query.id);
  const roleQueryToDel = await query('SELECT name FROM roles WHERE id = $1', [deleteId]);
  const roleName = roleQueryToDel.rows[0]?.name || deleteId;
  await deleteRecords('roles', { id: deleteId });
  await req.adminUtils.logActivity('EXCLUIR CARGO', deleteId, `Removeu o cargo: ${roleName}`);
  return res.status(200).json({ success: true, message: 'Cargo removido com sucesso' });
}

export default createAdminHandler({
  name: 'Role',
  permission: ['Segurança', 'Usuários'],
  handlers: { GET: handleGet, POST: handlePost, PUT: handlePut, DELETE: handleDelete },
  rateLimit: { max: 30, window: 60000 },
});