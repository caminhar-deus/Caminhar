import { createBackup, getAvailableBackups } from '../../../scripts/backup';
import { createAdminHandler } from '../../../lib/api/adminCrudHandler.js';

async function handleGet(req, res) {
  try {
    // Reusa a listagem do script de backup, que ordena pelo timestamp gravado
    // no NOME do arquivo (data de criação, gerada por `formatISODate`) — não
    // pelo mtime, que cópias/movimentações do diretório reescrevem e que fazia
    // o painel exibir uma data meses divergente do nome (§8 do doc privado,
    // item 3). A extração do timestamp vive em `parseBackupTimestamp`.
    const backups = await getAvailableBackups();
    const files = backups.map((b) => ({ name: b.filename, date: b.date, size: b.size }));
    const latest = files.length > 0 ? files[0] : null;

    return res.status(200).json({ latest, backups: files });
  } catch {
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro ao listar backups' });
  }
}

async function handlePost(req, res) {
  const result = await createBackup();
  await req.adminUtils.logActivity('CRIAR BACKUP', null, 'Backup criado manualmente');
  return res.status(200).json({ success: true, message: 'Backup criado com sucesso', result });
}

export default createAdminHandler({
  name: 'Backup',
  permission: 'Segurança',
  allowedMethods: ['GET', 'POST'],
  handlers: { GET: handleGet, POST: handlePost },
  rateLimit: { max: 10, window: 60000 },
});
