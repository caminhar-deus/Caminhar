#!/usr/bin/env node
import path from 'path';
import { loadEnv } from './utils/load-env.js';
import { query, closePool } from './db/connection.js';

loadEnv();

// Resolução dos seeds SEM `import.meta.url`: o `import.meta` sobrevive à
// compilação CommonJS do Babel (nenhum plugin o transforma) e o Jest 30 recusa o
// módulo com ERR_REQUIRE_ESM — sem removê-lo, o teste não consegue nem importar
// este arquivo. O `process.cwd()` é seguro porque as TRÊS invocações REAIS rodam
// da raiz do projeto: `npm run seed:all` (package.json:61),
// `node scripts/seed-all.js` (.github/actions/setup-db/action.yml:25) e
// `runNodeScript('scripts/seed-all.js', …)` (scripts/setup-test-db.js:256, que
// até passa `cwd: process.cwd()` explicitamente e usa caminho RELATIVO — já
// exigia cwd na raiz para o `node` encontrar o arquivo). Todas partem da raiz,
// logo `<cwd>/scripts` é o diretório correto dos seeds. O diretório é parâmetro
// com default para os testes injetarem outro caminho sem depender do cwd.

export async function checkDatabaseReady() {
  console.log('🔍 Verificando conexão com o banco de dados...');
  try {
    await query('SELECT 1');
    console.log('✅ Banco de dados está pronto.');
    return true;
  } catch (error) {
    console.error('❌ Banco de dados não está acessível:', error.message);
    return false;
  }
}

export async function runSeed(scriptName, seedsDir = path.join(process.cwd(), 'scripts')) {
  console.log(`\n🌱 Executando seed: ${scriptName}...`);
  try {
    const scriptPath = path.join(seedsDir, scriptName);

    // Importa dinamicamente e executa, em vez de criar sub-processo shell.
    // Os arquivos de seed exportam a função de seed como default (ou 'run').
    const module = await import(scriptPath);
    const seedFn = module.default ?? module.run;
    if (typeof seedFn !== 'function') {
      throw new Error(`${scriptName} não exporta uma função de seed (default ou run).`);
    }
    await seedFn();

    console.log(`✅ ${scriptName} concluído.`);
  } catch (error) {
    console.error(`❌ Falha ao executar ${scriptName}:`, error);
    throw error;
  }
}

export async function seedAll({ seedsDir = path.join(process.cwd(), 'scripts') } = {}) {
  const shouldClean = process.argv.includes('--clean');

  if (shouldClean) {
    console.log('🧹 Opção --clean detectada. Limpando e recriando tabelas antes de popular...');
    try {
      // Executa o comando de reset que já existe no package.json
      // O stdio: 'inherit' garante que os logs do processo filho sejam exibidos no terminal atual.
      const { execSync } = await import('child_process');
      execSync('npm run db:reset', { stdio: 'inherit' });
      console.log('✅ Banco de dados resetado com sucesso.');
    } catch (error) {
      console.error(`❌ Falha ao resetar o banco de dados: ${error.message}`);
      throw new Error('Falha ao resetar o banco de dados', { cause: error });
    }
  }

  const isDbReady = await checkDatabaseReady();
  if (!isDbReady) {
    console.error('❌ Abortando seeds devido a erro de conexão com o banco.');
    throw new Error('Abortando seeds devido a erro de conexão com o banco');
  }

  try {
    // Lista de scripts de seed para executar em ordem
    const seeds = [
      'seed-posts.js',
      'seed-musicas.js',
      'seed-videos.js',
      'seed-settings.js'
    ];

    for (const seed of seeds) {
      await runSeed(seed, seedsDir);
    }

    console.log('\n✨ Todos os seeds foram executados com sucesso!');
  } catch (error) {
    console.error('\n❌ Erro durante a execução dos seeds.');
    throw error;
  }
}

// Execução principal — só quando invocado como CLI (`node scripts/seed-all.js`
// ou `npm run seed:all`), no mesmo estilo de `clear-db.js`/`clear-musicas.js`.
// O corpo mora em `main()` (exportada para os testes fazerem `await main()` de
// forma determinística — a IIFE/top-level antiga não devolvia a promise).
// A guarda chama `main()` sem `await` porque o Babel compila o script como
// CommonJS e não há suporte a top-level `await` nessa transformação.
export async function main() {
  try {
    await seedAll();
  } catch (error) {
    console.error('❌ Erro durante a execução dos seeds:', error.message);
    process.exitCode = 1;
  } finally {
    // Dono do ciclo de vida do pool: fecha uma única vez ao final.
    await closePool();
  }
}

if (process.argv[1] && process.argv[1].endsWith('seed-all.js')) {
  main();
}
