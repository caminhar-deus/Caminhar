import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Carrega variáveis de ambiente
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkDatabaseReady() {
  console.log('🔍 Verificando conexão com o banco de dados...');
  try {
    // Importação dinâmica para garantir que as variáveis de ambiente estejam carregadas
    const { query, closeDatabase } = await import('../lib/db.js');
    await query('SELECT 1');
    await closeDatabase();
    console.log('✅ Banco de dados está pronto.');
    return true;
  } catch (error) {
    console.error('❌ Banco de dados não está acessível:', error.message);
    return false;
  }
}

async function runSeed(scriptName) {
  console.log(`\n🌱 Executando seed: ${scriptName}...`);
  try {
    const scriptPath = path.join(__dirname, scriptName);
    
    // ALTERAÇÃO: Importa dinamicamente e executa, em vez de criar sub-processo shell
    // Nota: Isso requer que seus arquivos de seed exportem uma função default ou 'run'
    const module = await import(scriptPath);
    if (module.default) await module.default();
    else if (module.run) await module.run();
    
    console.log(`✅ ${scriptName} concluído.`);
  } catch (error) {
    console.error(`❌ Falha ao executar ${scriptName}:`, error);
    throw error;
  }
}

async function seedAll() {
  const shouldClean = process.argv.includes('--clean');

  if (shouldClean) {
    console.log('🧹 Opção --clean detectada. Limpando e recriando tabelas antes de popular...');
    try {
      // Executa o comando de reset que já existe no package.json
      // O stdio: 'inherit' garante que os logs do processo filho sejam exibidos no terminal atual.
      // AQUI: Mantemos execSync pois db:reset geralmente chama binários do Prisma/ORM
      // Mas poderíamos importar a lib do banco diretamente se quiséssemos ser puristas.
      const { execSync } = await import('child_process');
      execSync('npm run db:reset', { stdio: 'inherit' });
      console.log('✅ Banco de dados resetado com sucesso.');
    } catch (error) {
      console.error('❌ Falha ao resetar o banco de dados. Abortando.');
      process.exit(1);
    }
  }

  const isDbReady = await checkDatabaseReady();
  if (!isDbReady) {
    console.error('❌ Abortando seeds devido a erro de conexão com o banco.');
    process.exit(1);
  }

  try {
    // Lista de scripts de seed para executar em ordem
    const seeds = [
      'seed-posts.js',
      'seed-musicas.js',
      'seed-videos.js'
    ];

    for (const seed of seeds) {
      await runSeed(seed);
    }
    
    console.log('\n✨ Todos os seeds foram executados com sucesso!');
  } catch (error) {
    console.error('\n❌ Erro durante a execução dos seeds.');
    process.exit(1);
  }
}

seedAll();