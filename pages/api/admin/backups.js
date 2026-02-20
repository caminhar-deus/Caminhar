import { createBackup } from '../../../scripts/backup';
import { withAuth } from '../../../lib/auth';
import fs from 'fs';
import path from 'path';

async function handler(req, res) {
  const backupDir = path.join(process.cwd(), 'data', 'backups');

  // LISTAR BACKUPS (GET)
  if (req.method === 'GET') {
    try {
      if (!fs.existsSync(backupDir)) {
        return res.status(200).json({ latest: null });
      }

      // Lê o diretório, filtra arquivos .sql ou .gz e ordena por data
      const files = fs.readdirSync(backupDir)
        .filter(file => file.endsWith('.sql.gz') || file.endsWith('.sql'))
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
    } catch (error) {
      console.error('Error listing backups:', error);
      return res.status(500).json({ message: 'Erro ao listar backups' });
    }
  }

  // CRIAR BACKUP (POST)
  if (req.method === 'POST') {
    try {
      const result = await createBackup();
      return res.status(200).json({ success: true, message: 'Backup criado com sucesso', result });
    } catch (error) {
      console.error('Error creating backup:', error);
      return res.status(500).json({ message: 'Erro ao criar backup', error: error.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default withAuth(handler);