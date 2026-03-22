import { query, createRecord, updateRecords, deleteRecords, logActivity } from '../../../lib/db';
import { getAuthToken, verifyToken, hashPassword } from '../../../lib/auth';
import { checkRateLimit } from '../../../lib/cache';

export default async function handler(req, res) {
  const { method } = req;
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';

  // 1. Verificação de Segurança e Autenticação
  const token = getAuthToken(req);
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Não autorizado. Token ausente ou inválido.' });
  }

  try {
    // 2. Busca as permissões atualizadas do cargo do usuário no banco de dados
    const roleQuery = await query('SELECT permissions FROM roles WHERE name = $1', [user.role], { log: false });
    const userPermissions = roleQuery.rows[0]?.permissions || [];
    
    // 3. O cargo "admin" tem passe livre, ou o cargo precisa ter a permissão de "Segurança" ou "Usuários"
    const isSuperAdmin = user.role === 'admin';
    if (!isSuperAdmin && !userPermissions.includes('Segurança') && !userPermissions.includes('Usuários')) {
      return res.status(403).json({ error: 'Acesso negado. Requer permissão de Usuários ou Segurança.' });
    }

    // 4. Proteção contra requisições massivas (Rate Limit) nas mutações
    if (['POST', 'PUT', 'DELETE'].includes(method)) {
      const isRateLimited = await checkRateLimit(ip, 'api:admin:users', 30, 60000);
      if (isRateLimited) return res.status(429).json({ error: 'Muitas requisições. Tente novamente mais tarde.' });
    }

    switch (method) {
      case 'GET':
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
        const dataRes = await query(`SELECT id, username, role, created_at FROM users ${whereClause} ORDER BY id ASC LIMIT $${limitIdx} OFFSET $${offsetIdx}`, params);

        return res.status(200).json({ data: dataRes?.rows || [], pagination: { page, limit, total, totalPages } });

      case 'POST':
        const { username, password, role } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
        
        const existingUser = await query('SELECT id FROM users WHERE username = $1', [username]);
        if (existingUser.rows.length > 0) return res.status(400).json({ error: 'Este nome de usuário já está em uso.' });

        const hashedPassword = await hashPassword(password);
        const newUser = await createRecord('users', { username, password: hashedPassword, role: role || 'admin' }, ['id', 'username', 'role']);
        
        await logActivity(user.username, 'CRIAR USUÁRIO', 'USER', newUser.id, `Criou o usuário: ${username}`, ip);
        
        return res.status(201).json(newUser);

      case 'PUT':
        const updateId = req.body.id || parseInt(req.query.id);
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
        
        await logActivity(user.username, 'ATUALIZAR USUÁRIO', 'USER', updateId, `Atualizou o usuário: ${updatedUsers[0]?.username}`, ip);
        
        return res.status(200).json(updatedUsers[0] || {});

      case 'DELETE':
        const deleteId = parseInt(req.body.id || req.query.id, 10);
        
        if (deleteId === user.userId) return res.status(400).json({ error: 'Você não pode excluir sua própria conta enquanto está logado nela.' });

        // Busca o nome do usuário antes de deletar para o Log
        const userQueryToDel = await query('SELECT username FROM users WHERE id = $1', [deleteId]);
        const deletedUsername = userQueryToDel.rows[0]?.username || deleteId;

        await deleteRecords('users', { id: deleteId });
        
        await logActivity(user.username, 'EXCLUIR USUÁRIO', 'USER', deleteId, `Removeu o usuário: ${deletedUsername}`, ip);
        
        return res.status(200).json({ success: true, message: 'Usuário removido com sucesso.' });
    }
  } catch (error) {
    console.error('❌ [API Users] Error:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}