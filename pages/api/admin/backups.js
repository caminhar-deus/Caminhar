import { createBackup } from '../../../scripts/backup';
import { createAdminHandler } from '../../../lib/api/adminCrudHandler.js';
import fs from 'fs';
import path from 'path';

async function handleGet(req, res) {
  const backupDir = path.join(process.cwd(), 'data', 'backups');

  if (!fs.existsSync(backupDir)) {
    return res.status(200).json({ latest: null });
  }

  // Lê o diretório, filtra arquivos de backup e ordena por data
  const files = fs.readdirSync(backupDir)
    .filter(file => file.endsWith('.sql') || file.endsWith('.gz') || file.endsWith('.enc'))
    .map(file => {
      const stats = fs.statSync(path.join(backupDir, file));
      return {
        name: file,
        date: stats.mtime,
        size: stats.size
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const latest = files.length > 0 ? files[0] : null;

  return res.status(200).json({ latest, backups: files });
}

async function handlePost(req, res) {
  const result = await createBackup();
  await req.adminUtils.logActivity('CRIAR BACKUP', null, 'Backup criado manualmente');
  return res.status(200).json({ success: true, message: 'Backup criado com sucesso', result });
}

export default createAdminHandler({
  name: 'Backup',
  allowedMethods: ['GET', 'POST'],
  handlers: { GET: handleGet, POST: handlePost },
  rateLimit: { max: 10, window: 60000 },
});