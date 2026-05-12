import { query } from '../../../lib/db';
import { createRecord, updateRecords, deleteRecords } from '../../../lib/crud';
import { hashPassword } from '../../../lib/auth';
import { createAdminHandler } from '../../../lib/api/adminCrudHandler.js';

async function handleGet(req, res) {
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '100', 10);
  const search = req.query.search || '';
  const offset = (page - 1) * limit;

  let whereClause = '';
  const params = [];
  const countParams = [];

  if (search) {
    whereClause = 'WHERE LOWER(username) LIKE $1';
    const searchPattern = `%${search.toLowerCase()}%`;
    params.push(searchPattern);
    countParams.push(searchPattern);
  }

  params.push(limit, offset);
  const limitIdx = params.length - 1;
  const offsetIdx = params.length;

  const countRes = await query(`SELECT COUNT(*) FROM users ${whereClause}`, countParams);
  const total = parseInt(countRes?.rows[0]?.count || '0', 10);
  const totalPages = Math.ceil(total / limit) || 1;

  // Nunca retorna as senhas (mesmo em hash) para o Frontend por segurança
  const dataRes = await query(`SELECT id, username, role, created_at, last_login_at FROM users ${whereClause} ORDER BY id ASC LIMIT $${limitIdx} OFFSET $${offsetIdx}`, params);

  return res.status(200).json({ data: dataRes?.rows || [], pagination: { page, limit, total, totalPages } });
}

async function handlePost(req, res) {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });

  const existingUser = await query('SELECT id FROM users WHERE username = $1', [username]);
  if (existingUser.rows.length > 0) return res.status(400).json({ error: 'Este nome de usuário já está em uso.' });

  const hashedPassword = await hashPassword(password);
  const newUser = await createRecord('users', { username, password: hashedPassword, role: role || 'admin' }, ['id', 'username', 'role']);

  req.adminUtils.logActivity('CRIAR USUÁRIO', newUser.id, `Criou o usuário: ${username}`);
  return res.status(201).json(newUser);
}

async function handlePut(req, res) {
  const updateId = parseInt(req.body.id || req.query.id, 10);
  if (isNaN(updateId)) return res.status(400).json({ error: 'ID inválido' });

  const updateData = { ...req.body };
  delete updateData.id;
  delete updateData.created_at;

  // Se uma nova senha for enviada, criamos o hash. Se não, ignoramos e mantemos a antiga.
  if (updateData.password && updateData.password.trim() !== '') {
    updateData.password = await hashPassword(updateData.password);
  } else {
    delete updateData.password;
  }

  const updatedUsers = await updateRecords('users', updateData, { id: updateId }, ['id', 'username', 'role']);

  req.adminUtils.logActivity('ATUALIZAR USUÁRIO', updateId, `Atualizou o usuário: ${updatedUsers[0]?.username}`);
  return res.status(200).json(updatedUsers[0] || {});
}

async function handleDelete(req, res) {
  const deleteId = parseInt(req.body.id || req.query.id, 10);
  if (isNaN(deleteId)) return res.status(400).json({ error: 'ID inválido' });

  if (deleteId === req.adminUtils.user.userId) return res.status(400).json({ error: 'Você não pode excluir sua própria conta enquanto está logado nela.' });

  // Busca o nome do usuário antes de deletar para o Log
  const userQueryToDel = await query('SELECT username FROM users WHERE id = $1', [deleteId]);
  const deletedUsername = userQueryToDel.rows[0]?.username || deleteId;

  await deleteRecords('users', { id: deleteId });

  req.adminUtils.logActivity('EXCLUIR USUÁRIO', deleteId, `Removeu o usuário: ${deletedUsername}`);
  return res.status(200).json({ success: true, message: 'Usuário removido com sucesso.' });
}

export default createAdminHandler({
  name: 'User',
  permission: ['Segurança', 'Usuários'],
  handlers: { GET: handleGet, POST: handlePost, PUT: handlePut, DELETE: handleDelete },
  rateLimit: { max: 30, window: 60000 },
});