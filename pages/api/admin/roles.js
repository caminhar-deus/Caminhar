import { query, createRecord, updateRecords, deleteRecords, logActivity } from '../../../lib/db';
import { getAuthToken, verifyToken } from '../../../lib/auth';

export default async function handler(req, res) {
  const { method } = req;
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';

  let user = null;
  const token = getAuthToken(req);
  if (token) {
    user = verifyToken(token);
  }

  if (!user) {
    return res.status(401).json({ error: 'Não autorizado. Token ausente ou inválido.' });
  }

  try {
    // Busca as permissões atualizadas do cargo do usuário no banco de dados
    const roleQuery = await query('SELECT permissions FROM roles WHERE name = $1', [user.role], { log: false });
    const userPermissions = roleQuery.rows[0]?.permissions || [];
    
    // O cargo "admin" tem passe livre, ou o cargo do usuário precisa ter a permissão de "Segurança" ou "Usuários"
    const isSuperAdmin = user.role === 'admin';
    if (!isSuperAdmin && !userPermissions.includes('Segurança') && !userPermissions.includes('Usuários')) {
      return res.status(403).json({ error: 'Acesso negado. Requer permissão de Segurança.' });
    }

    switch (method) {
      case 'GET':
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

      case 'POST':
        const { name, permissions } = req.body;
        const newRole = await createRecord('roles', { name, permissions: Array.isArray(permissions) ? JSON.stringify(permissions) : permissions });
        await logActivity(user.username, 'CRIAR CARGO', 'ROLE', newRole.id, `Criou o cargo: ${name}`, ip);
        return res.status(201).json(newRole);

      case 'PUT':
        const updateId = req.body.id || parseInt(req.query.id);
        const { id, ...updateData } = req.body;
        if (updateData.permissions && Array.isArray(updateData.permissions)) updateData.permissions = JSON.stringify(updateData.permissions);
        const updatedRoles = await updateRecords('roles', updateData, { id: updateId });
        await logActivity(user.username, 'ATUALIZAR CARGO', 'ROLE', updateId, `Atualizou o cargo: ${updateData.name || updateId}`, ip);
        return res.status(200).json(updatedRoles[0] || {});

      case 'DELETE':
        const deleteId = req.body.id || parseInt(req.query.id);
        await deleteRecords('roles', { id: deleteId });
        await logActivity(user.username, 'EXCLUIR CARGO', 'ROLE', deleteId, `Removeu um cargo (ID: ${deleteId})`, ip);
        return res.status(200).json({ success: true, message: 'Cargo removido com sucesso' });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('❌ [API Roles] Error:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}