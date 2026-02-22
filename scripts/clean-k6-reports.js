import fs from 'fs';
import path from 'path';

// Configuração
const REPORTS_DIR = path.join(process.cwd(), 'reports', 'k6-summaries');
const RETENTION_DAYS = 7; // Mantém relatórios dos últimos 7 dias

async function cleanOldReports() {
  console.log(`🧹 Iniciando limpeza de relatórios k6 antigos (mais de ${RETENTION_DAYS} dias)...`);

  if (!fs.existsSync(REPORTS_DIR)) {
    console.log(`ℹ️ Diretório ${REPORTS_DIR} não encontrado. Nada a limpar.`);
    return;
  }

  try {
    const files = fs.readdirSync(REPORTS_DIR);
    const now = Date.now();
    const retentionMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(REPORTS_DIR, file);
      const stats = fs.statSync(filePath);
      const fileAgeMs = now - stats.mtimeMs;

      // Verifica se é um arquivo de relatório (.json ou .html) e se é antigo
      if ((file.endsWith('.json') || file.endsWith('.html')) && fileAgeMs > retentionMs) {
        fs.unlinkSync(filePath);
        console.log(`🗑️  Deletado: ${file} (${Math.round(fileAgeMs / (1000 * 60 * 60 * 24))} dias)`);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`✅ Limpeza concluída! ${deletedCount} relatórios antigos foram removidos.`);
    } else {
      console.log('✨ Nenhum relatório antigo encontrado para exclusão.');
    }

  } catch (error) {
    console.error('❌ Erro ao limpar relatórios:', error);
    process.exit(1);
  }
}

// Executa se chamado diretamente
if (process.argv[1] && process.argv[1].endsWith('clean-k6-reports.js')) {
  cleanOldReports();
}

export { cleanOldReports };