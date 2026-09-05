#!/usr/bin/env node
import nextEnv from '@next/env';
const { loadEnvConfig } = nextEnv;

// Carrega as variáveis de ambiente do projeto (mesma lógica do Next.js)
const projectDir = process.cwd();
loadEnvConfig(projectDir);

const REQUIRED_VARS = [
  'DATABASE_URL', // Necessário para conexão com PostgreSQL
  'JWT_SECRET'    // Necessário para segurança da autenticação
];

const OPTIONAL_VARS = [
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD',
  // 'UPSTASH_REDIS_REST_URL', // Opcional: Descomente se for usar Redis (Upstash)
  // 'UPSTASH_REDIS_REST_TOKEN' // Opcional: Descomente se for usar Redis (Upstash)
];

function checkEnv() {
  console.log('🔍 Verificando variáveis de ambiente...');

  const missingRequired = REQUIRED_VARS.filter(key => !process.env[key]);
  const missingOptional = OPTIONAL_VARS.filter(key => !process.env[key]);

  if (missingRequired.length > 0) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Erro Crítico: Variáveis de ambiente obrigatórias não definidas:');
    missingRequired.forEach(key => console.error(`   - ${key}`));
    console.error('\x1b[33m%s\x1b[0m', '👉 Por favor, configure-as no arquivo .env ou .env.local');
    throw new Error('Variáveis de ambiente obrigatórias não definidas');
  }

  if (missingOptional.length > 0) {
    console.warn('\x1b[33m%s\x1b[0m', '⚠️  Aviso: Algumas variáveis opcionais não estão definidas (usando padrões ou funcionalidade desativada):');
    missingOptional.forEach(key => console.warn(`   - ${key}`));
  } else {
    console.log('\x1b[32m%s\x1b[0m', '✅ Todas as variáveis de ambiente verificadas estão definidas.');
  }

  console.log('\x1b[32m%s\x1b[0m', '✅ Ambiente validado com sucesso.\n');
}

/**
 * Verifica a conectividade com o PostgreSQL e emite aviso caso o banco
 * não esteja acessível. Não interrompe o fluxo (apenas diagnóstico): uma
 * falha aqui não bloqueia o `dev`, mas indica que a API retornará 500.
 */
async function checkDatabaseConnection() {
  const { healthCheck, closeDatabase } = await import('../lib/infra/db.js');
  try {
    const healthy = await healthCheck();
    if (healthy) {
      console.log('\x1b[32m%s\x1b[0m', '✅ PostgreSQL acessível e conexão validada com sucesso.');
    } else {
      console.warn('\x1b[33m%s\x1b[0m', '⚠️  PostgreSQL indisponível/inacessível — a API retornará 500 até o banco estar de pé (verifique DATABASE_URL e credenciais).');
    }
  } finally {
    await closeDatabase();
  }
}

try {
  checkEnv();
  await checkDatabaseConnection();
  process.exit(0);
} catch (error) {
  console.error('❌ Erro:', error.message);
  process.exit(1);
}
