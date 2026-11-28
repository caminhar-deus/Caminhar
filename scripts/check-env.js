#!/usr/bin/env node

import { isDebitCardEnabled } from '../lib/payment/payment-status-messages.js';

export function validateMercadoPagoEnv(env = process.env) {
  const warnings = [];
  const mpAccessToken = String(env.MP_ACCESS_TOKEN || '').trim();
  const mpPublicKey = String(env.NEXT_PUBLIC_MP_PUBLIC_KEY || '').trim();
  const mpWebhookSecret = String(env.MP_WEBHOOK_SECRET || '').trim();
  const isProduction = env.NODE_ENV === 'production';

  if (mpAccessToken && !mpPublicKey) {
    warnings.push(
      'MP_ACCESS_TOKEN está definida sem NEXT_PUBLIC_MP_PUBLIC_KEY; pagamentos com cartão exigem tokenização no navegador e serão recusados pela validação.'
    );
  } else if (!mpAccessToken && mpPublicKey) {
    warnings.push(
      'NEXT_PUBLIC_MP_PUBLIC_KEY está definida sem MP_ACCESS_TOKEN; a tokenização no navegador pode enviar tokens para um backend em modo sandbox local.'
    );
  }

  if (mpAccessToken && mpPublicKey) {
    const tokenIsTest = mpAccessToken.startsWith('TEST-');
    const pubIsTest = mpPublicKey.startsWith('TEST-');
    const tokenIsAppUsr = mpAccessToken.startsWith('APP_USR-');
    const pubIsAppUsr = mpPublicKey.startsWith('APP_USR-');
    if ((tokenIsTest && pubIsAppUsr) || (tokenIsAppUsr && pubIsTest)) {
      warnings.push(
        'MP_ACCESS_TOKEN e NEXT_PUBLIC_MP_PUBLIC_KEY possuem prefixos incompatíveis (TEST- vs APP_USR-); pagamentos com cartão podem falhar na API do Mercado Pago.'
      );
    }
  }

  if (isProduction && (mpAccessToken.startsWith('TEST-') || mpPublicKey.startsWith('TEST-'))) {
    warnings.push(
      'Credenciais sandbox (TEST-) configuradas com NODE_ENV=production; substitua por credenciais de produção (APP_USR-) para operar com live_mode: true.'
    );
  }

  const hasServerDebitFlag =
    env.MP_ENABLE_DEBIT_CARD !== undefined && String(env.MP_ENABLE_DEBIT_CARD).trim() !== '';
  const hasClientDebitFlag =
    env.NEXT_PUBLIC_MP_ENABLE_DEBIT_CARD !== undefined &&
    String(env.NEXT_PUBLIC_MP_ENABLE_DEBIT_CARD).trim() !== '';
  if (
    (hasServerDebitFlag || hasClientDebitFlag) &&
    isDebitCardEnabled(env.MP_ENABLE_DEBIT_CARD) !==
      isDebitCardEnabled(env.NEXT_PUBLIC_MP_ENABLE_DEBIT_CARD)
  ) {
    warnings.push(
      'MP_ENABLE_DEBIT_CARD e NEXT_PUBLIC_MP_ENABLE_DEBIT_CARD estão divergentes; alinhe ambas as flags e gere novo build para evitar inconsistência entre checkout e API.'
    );
  }

  if (isProduction) {
    const missingProd = [
      !mpAccessToken ? 'MP_ACCESS_TOKEN' : null,
      !mpPublicKey ? 'NEXT_PUBLIC_MP_PUBLIC_KEY' : null,
      !mpWebhookSecret ? 'MP_WEBHOOK_SECRET' : null,
    ].filter(Boolean);
    if (missingProd.length > 0) {
      warnings.push(
        `Ambiente de produção com credenciais do Mercado Pago ausentes (${missingProd.join(', ')}); checkout e webhooks falharão com 503/401.`
      );
    }
  }

  return warnings;
}

/**
 * Valida a coerência da configuração de OAuth do Google entre backend e frontend.
 * Nunca inclui valores literais dos Client IDs nas mensagens retornadas.
 */
export function validateGoogleEnv(env = process.env) {
  const warnings = [];
  const serverClientId = String(env.GOOGLE_CLIENT_ID || '').trim();
  const publicClientId = String(env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '').trim();
  const devBypass = String(env.ALLOW_GOOGLE_DEV_BYPASS || '').trim();
  const nodeEnv = String(env.NODE_ENV || '').trim();

  if (serverClientId && publicClientId && serverClientId !== publicClientId) {
    warnings.push(
      'GOOGLE_CLIENT_ID e NEXT_PUBLIC_GOOGLE_CLIENT_ID possuem valores diferentes; o login com Google pode falhar com GOOGLE_AUDIENCE_MISMATCH.'
    );
  } else if (serverClientId && !publicClientId) {
    warnings.push(
      'GOOGLE_CLIENT_ID está definida sem NEXT_PUBLIC_GOOGLE_CLIENT_ID; o botão "Continuar com o Google" permanecerá oculto na interface pública.'
    );
  } else if (!serverClientId && publicClientId) {
    warnings.push(
      'NEXT_PUBLIC_GOOGLE_CLIENT_ID está definida sem GOOGLE_CLIENT_ID; o botão "Continuar com o Google" aparecerá na interface pública, mas o backend rejeitará o login com GOOGLE_NOT_CONFIGURED.'
    );
  }

  if (nodeEnv === 'production' && devBypass === 'true') {
    warnings.push(
      'ALLOW_GOOGLE_DEV_BYPASS está ativo com NODE_ENV=production; o verificador local sempre exige JWKS em produção, mas essa variável não deve permanecer definida.'
    );
  }

  return warnings;
}

const REQUIRED_VARS = [
  'DATABASE_URL', // Necessário para conexão com PostgreSQL
  'JWT_SECRET'    // Necessário para segurança da autenticação
];

const OPTIONAL_VARS = [
  'ADMIN_USERNAME',
  'ADMIN_PASSWORD',
  'MP_ACCESS_TOKEN',
  'NEXT_PUBLIC_MP_PUBLIC_KEY',
  'MP_WEBHOOK_SECRET',
  'GOOGLE_CLIENT_ID',
  'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
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

  for (const googleWarning of validateGoogleEnv(process.env)) {
    console.warn('\x1b[33m%s\x1b[0m', `⚠️  Aviso: ${googleWarning}`);
  }

  for (const mpWarning of validateMercadoPagoEnv(process.env)) {
    console.warn('\x1b[33m%s\x1b[0m', `⚠️  Aviso: ${mpWarning}`);
  }

  console.log('\x1b[32m%s\x1b[0m', '✅ Ambiente validado com sucesso.\n');
}

/**
 * Verifica a conectividade com o PostgreSQL.
 *
 * Por padrão é apenas diagnóstico: uma falha NÃO bloqueia o `dev` (a API
 * simplesmente vai retornar 500 até o banco estar de pé). Com
 * `CHECK_ENV_STRICT=true` a falha sai com código diferente de zero — é o
 * comportamento usado na CI, onde subir com o banco quebrado produz minutos
 * de 500 sem diagnóstico algum.
 */
async function checkDatabaseConnection() {
  const strict = ['true', '1'].includes(
    String(process.env.CHECK_ENV_STRICT ?? '').trim().toLowerCase(),
  );
  const { healthCheck, closeDatabase } = await import('../lib/infra/db.js');
  try {
    const healthy = await healthCheck();
    if (healthy) {
      console.log('\x1b[32m%s\x1b[0m', '✅ PostgreSQL acessível e conexão validada com sucesso.');
    } else if (strict) {
      throw new Error(
        'PostgreSQL inacessível e CHECK_ENV_STRICT=true: abortando aqui, porque a API retornaria 500 em todos os endpoints (verifique DATABASE_URL, credenciais e se o banco está de pé).',
      );
    } else {
      console.warn('\x1b[33m%s\x1b[0m', '⚠️  PostgreSQL indisponível/inacessível — a API retornará 500 até o banco estar de pé (verifique DATABASE_URL e credenciais).');
    }
  } finally {
    await closeDatabase();
  }
}

const isDirectExecution =
  Boolean(process.argv[1]) && process.argv[1].endsWith('check-env.js');

async function main() {
  // Carrega as variáveis de ambiente do projeto (mesma lógica do Next.js)
  const nextEnv = await import('@next/env');
  const loadEnvConfig = nextEnv.default?.loadEnvConfig || nextEnv.loadEnvConfig;
  loadEnvConfig(process.cwd());
  try {
    checkEnv();
    await checkDatabaseConnection();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

if (isDirectExecution) {
  main();
}
