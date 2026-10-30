import { query } from '../../../lib/infra/db';
import { createRecord, updateRecords, deleteRecords } from '../../../lib/crud/crud';
import { hashPassword } from '../../../lib/auth/auth';
import { strongPasswordPattern, passwordPolicyMessage } from '../../../lib/auth/password-policy.js';
import { createAdminHandler } from '../../../lib/api/adminCrudHandler.js';
import { z } from 'zod';

const userCreateSchema = z.object({
  username: z.string().min(3, 'O nome de usuário deve ter no mínimo 3 caracteres'),
  password: z.string().refine((v) => strongPasswordPattern.test(v), { message: passwordPolicyMessage }),
  // ADR-0010: SEM `.default('admin')` — quem cria usuário declara o cargo
  // explicitamente; POST direto sem `role` é erro de validação, não criação
  // implícita de administrador.
  role: z.string({ error: 'Cargo é obrigatório' }).min(1, 'Cargo é obrigatório'),
});

const userUpdateSchema = z.object({
  id: z.number().int('ID deve ser um número inteiro').positive('ID deve ser positivo'),
  username: z.string().min(3, 'O nome de usuário deve ter no mínimo 3 caracteres').optional(),
  // Senha vazia/só espaços = "manter a atual" (o handler descarta); quando
  // preenchida, vale a política completa (ADR-0031).
  password: z.string().refine((v) => v.trim() === '' || strongPasswordPattern.test(v.trim()), { message: passwordPolicyMessage }).optional(),
  role: z.string().optional(),
});

/**
 * Verifica se o cargo informado existe na tabela `roles` (integridade do nome — ADR-0010).
 *
 * Antes, `role` era string livre: nome de cargo inexistente era gravado e só aparecia
 * depois como 403 genérico de permissão (o `adminCrudHandler` falha fechada com
 * `getRolePermissions(undefined) === []`), sem nada que dissesse "cargo inexistente".
 *
 * Falha de banco NÃO é traduzida para 400 de "cargo inválido" — seria mentira: a
 * exceção sobe para o `adminCrudHandler`, que já trata falha de leitura de `roles`
 * como negação fechada.
 *
 * @param {string} role - Nome do cargo a validar
 * @returns {Promise<boolean>} `true` se existir row em `roles` com esse nome
 */
async function roleExists(role) {
  const { rows } = await query('SELECT name FROM roles WHERE name = $1', [role]);
  return rows.length > 0;
}

/**
 * Usuário administrador protegido (trava de integridade — §9 do doc privado).
 *
 * É o usuário criado com `process.env.ADMIN_USERNAME` em `lib/auth/auth.js`
 * (cujo boot força o cargo dele para `admin`). Sem a variável definida, o
 * default é `'admin'` (mesmo default de `.env.example`). A leitura é feita por
 * chamada — não em tempo de módulo — para refletir o ambiente de execução.
 *
 * @returns {string} Username do administrador que não pode ser excluído nem ter o cargo alterado
 */
function getProtectedAdminUsername() {
  return process.env.ADMIN_USERNAME || 'admin';
}

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
  const validation = userCreateSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Dados inválidos para criação de usuário',
      errors: validation.error.flatten().fieldErrors,
    });
  }

  const { username, password, role } = validation.data;

  // Integridade do nome do cargo (ADR-0010): 400 nomeando o cargo, não 403
  // genérico de permissão depois. Erro de banco aqui sobe para o handler.
  if (!(await roleExists(role))) {
    return res.status(400).json({
      error: 'Cargo inexistente',
      message: `O cargo "${role}" não existe. Escolha um cargo já cadastrado.`,
    });
  }

  const existingUser = await query('SELECT id FROM users WHERE username = $1', [username]);
  if (existingUser.rows.length > 0) return res.status(400).json({ error: 'Este nome de usuário já está em uso.' });

  const hashedPassword = await hashPassword(password);
  const newUser = await createRecord('users', { username, password: hashedPassword, role }, ['id', 'username', 'role']);

  await req.adminUtils.logActivity('CRIAR USUÁRIO', newUser.id, `Criou o usuário: ${username}`);
  return res.status(201).json(newUser);
}

async function handlePut(req, res) {
  const updateId = typeof req.body.id === 'string' ? parseInt(req.body.id, 10) : req.body.id;

  const updateData = { ...req.body };
  delete updateData.id;
  delete updateData.created_at;

  const validation = userUpdateSchema.partial().safeParse({ id: updateId, ...updateData });
  if (!validation.success) {
    return res.status(400).json({
      error: 'Dados inválidos para atualização de usuário',
      errors: validation.error.flatten().fieldErrors,
    });
  }

  const validatedData = { ...validation.data };
  delete validatedData.id;

  // Integridade do nome do cargo (ADR-0010): só valida quando o PUT envia
  // `role` (atualização parcial). Mesmo 400 nomeado do POST; falha de banco sobe.
  if (validatedData.role !== undefined && !(await roleExists(validatedData.role))) {
    return res.status(400).json({
      error: 'Cargo inexistente',
      message: `O cargo "${validatedData.role}" não existe. Escolha um cargo já cadastrado.`,
    });
  }

  // Trava de integridade do administrador (§9 do doc privado): o vínculo do
  // usuário protegido com o cargo `admin` não pode ser alterado. Só consulta o
  // alvo quando o PUT tenta trocar de cargo; reenviar o MESMO cargo `admin` é
  // idempotente (permitido) e PUT sem `role` não é afetado. Na recusa, o
  // `updateRecords` não é chamado.
  if (validatedData.role !== undefined && validatedData.role !== 'admin') {
    const targetQuery = await query('SELECT username FROM users WHERE id = $1', [updateId]);
    const targetUsername = targetQuery.rows[0]?.username;

    if (targetUsername === getProtectedAdminUsername()) {
      return res.status(400).json({
        error: 'Vínculo do administrador protegido',
        message: `O usuário administrador "${targetUsername}" não pode ter o vínculo com o cargo "admin" alterado.`,
      });
    }
  }

  // Se uma nova senha for enviada, criamos o hash. Se não, ignoramos e mantemos a antiga.
  if (validatedData.password && validatedData.password.trim() !== '') {
    validatedData.password = await hashPassword(validatedData.password);
  } else {
    delete validatedData.password;
  }

  const updatedUsers = await updateRecords('users', validatedData, { id: updateId }, ['id', 'username', 'role']);

  await req.adminUtils.logActivity('ATUALIZAR USUÁRIO', updateId, `Atualizou o usuário: ${updatedUsers[0]?.username}`);
  return res.status(200).json(updatedUsers[0] || {});
}

async function handleDelete(req, res) {
  const deleteId = parseInt(req.body.id || req.query.id, 10);
  if (isNaN(deleteId)) return res.status(400).json({ error: 'ID inválido' });

  if (deleteId === req.adminUtils.user.userId) return res.status(400).json({ error: 'Você não pode excluir sua própria conta enquanto está logado nela.' });

  // Busca o nome do usuário antes de deletar para o Log
  const userQueryToDel = await query('SELECT username FROM users WHERE id = $1', [deleteId]);
  const deletedUsername = userQueryToDel.rows[0]?.username || deleteId;

  // Trava de integridade do administrador (§9 do doc privado): o usuário
  // protegido (`ADMIN_USERNAME`) não pode ser excluído — sem essa trava, outro
  // admin o remove sem resistência e o painel fica sem conta administrativa.
  // Na recusa, o `deleteRecords` não é chamado.
  if (deletedUsername === getProtectedAdminUsername()) {
    return res.status(400).json({
      error: 'Usuário administrador protegido',
      message: `O usuário administrador "${deletedUsername}" não pode ser excluído.`,
    });
  }

  await deleteRecords('users', { id: deleteId });

  await req.adminUtils.logActivity('EXCLUIR USUÁRIO', deleteId, `Removeu o usuário: ${deletedUsername}`);
  return res.status(200).json({ success: true, message: 'Usuário removido com sucesso.' });
}

export default createAdminHandler({
  name: 'User',
  permission: ['Segurança', 'Usuários'],
  handlers: { GET: handleGet, POST: handlePost, PUT: handlePut, DELETE: handleDelete },
  rateLimit: { max: 30, window: 60000 },
});