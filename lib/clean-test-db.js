import fs from 'fs';
import path from 'path';

const DB_DIR = path.join(process.cwd(), 'data');
// Lista de arquivos de banco de dados que devem ser limpos
const TARGET_DBS = ['test.db', 'caminhar-test.db'];

async function cleanTestDb() {
  console.log('🧹 Iniciando limpeza dos bancos de dados de teste...');

  let cleaned = false;

  for (const dbName of TARGET_DBS) {
    const dbPath = path.join(DB_DIR, dbName);
    
    if (fs.existsSync(dbPath)) {
      try {
        fs.unlinkSync(dbPath);
        console.log(`✅ Removido: ${dbPath}`);
        cleaned = true;
      } catch (error) {
        console.error(`❌ Erro ao remover ${dbPath}:`, error.message);
      }
    }
  }

  if (!cleaned) {
    console.log('ℹ️  Nenhum banco de dados de teste encontrado para limpar.');
  }
}

cleanTestDb();