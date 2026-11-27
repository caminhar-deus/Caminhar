#!/usr/bin/env node

import { createHmac, randomUUID } from 'node:crypto';
import { validateMercadoPagoEnv } from '../check-env.js';
import { verifyMercadoPagoWebhookSignature } from '../../lib/payment/mercadopago.js';
import { isDebitCardEnabled } from '../../lib/payment/payment-status-messages.js';

const TEMP_TUNNEL_HOST_PATTERN = /(ngrok|trycloudflare\.com|loca\.lt|localtunnel)/i;
const PRIVATE_IPV4_PATTERN =
  /^(127\.|10\.|192\.168\.|169\.254\.|0\.0\.0\.0|172\.(1[6-9]|2\d|3[01])\.)/;

/**
 * Interpreta argumentos CLI do preflight de produção Mercado Pago.
 */
export function parsePreflightArgs(argv = []) {
  const args = {
    webhookUrl: '',
    strict: false,
    json: false,
  };

  for (const token of argv) {
    if (token === '--strict') {
      args.strict = true;
    } else if (token === '--json') {
      args.json = true;
    } else if (token.startsWith('--webhook-url=')) {
      args.webhookUrl = token.slice('--webhook-url='.length).trim();
    }
  }

  return args;
}

/**
 * Valida se uma URL de webhook atende aos requisitos de produção HTTPS (`live_mode: true`).
 */
export function validateWebhookUrl(rawUrl) {
  const trimmed = String(rawUrl || '').trim();
  const errors = [];
  const warnings = [];

  if (!trimmed) {
    errors.push('URL pública do webhook ausente (informe --webhook-url=https://seu-dominio.com/api/webhooks/mercadopago ou defina SITE_URL HTTPS).');
    return { valid: false, url: null, errors, warnings };
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    errors.push('URL de webhook inválida.');
    return { valid: false, url: null, errors, warnings };
  }

  if (parsed.protocol !== 'https:') {
    errors.push('URL de webhook em produção deve utilizar HTTPS (protocolo https:).');
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '::1' ||
    hostname === '[::1]' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    PRIVATE_IPV4_PATTERN.test(hostname)
  ) {
    errors.push('URL de webhook não pode apontar para localhost, loopback ou rede privada em produção.');
  }

  if (TEMP_TUNNEL_HOST_PATTERN.test(hostname)) {
    errors.push('URL de webhook aponta para túnel temporário de desenvolvimento; configure o domínio definitivo de produção.');
  }

  if (parsed.pathname !== '/api/webhooks/mercadopago') {
    errors.push('Caminho da URL de webhook deve apontar exatamente para /api/webhooks/mercadopago.');
  }

  return {
    valid: errors.length === 0,
    url: parsed.toString(),
    errors,
    warnings,
  };
}

/**
 * Executa autoteste criptográfico da assinatura HMAC-SHA256 v2 e janela anti-replay.
 */
export function runWebhookSignatureSelfTest(configuredValue = '') {
  const trimmed = String(configuredValue || '').trim();
  const testKey = trimmed || `preflight-ephemeral-${randomUUID()}`;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const dataId = 'ORDPREFLIGHT01';
  const requestId = 'req-preflight-check-1';

  const sign = (tsValue) => {
    const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${tsValue};`;
    return createHmac('sha256', testKey).update(manifest).digest('hex');
  };

  const validSig = sign(nowSeconds);
  const validAccepted = verifyMercadoPagoWebhookSignature({
    signatureHeader: `ts=${nowSeconds},v1=${validSig}`,
    requestIdHeader: requestId,
    dataId,
    secret: testKey,
    nowSeconds,
  });

  const expiredTs = nowSeconds - 1800;
  const expiredSig = sign(expiredTs);
  const expiredRejected = !verifyMercadoPagoWebhookSignature({
    signatureHeader: `ts=${expiredTs},v1=${expiredSig}`,
    requestIdHeader: requestId,
    dataId,
    secret: testKey,
    nowSeconds,
  });

  const tamperedChar = validSig[0] === 'a' ? 'b' : 'a';
  const tamperedSig = `${tamperedChar}${validSig.slice(1)}`;
  const tamperedRejected = !verifyMercadoPagoWebhookSignature({
    signatureHeader: `ts=${nowSeconds},v1=${tamperedSig}`,
    requestIdHeader: requestId,
    dataId,
    secret: testKey,
    nowSeconds,
  });

  return {
    ok: Boolean(validAccepted && expiredRejected && tamperedRejected),
    validAccepted: Boolean(validAccepted),
    expiredRejected: Boolean(expiredRejected),
    tamperedRejected: Boolean(tamperedRejected),
    usedConfiguredKey: Boolean(trimmed),
  };
}

/**
 * Avalia prontidão de produção HTTPS (`live_mode: true`) sem nunca expor segredos no retorno.
 */
export function evaluateMercadoPagoProductionReadiness({
  env = process.env,
  webhookUrl = '',
} = {}) {
  const errors = [];
  const warnings = [];
  const checks = [];

  const mpAccessToken = String(env.MP_ACCESS_TOKEN || '').trim();
  const mpPublicKey = String(env.NEXT_PUBLIC_MP_PUBLIC_KEY || '').trim();
  const mpWebhookKey = String(env.MP_WEBHOOK_SECRET || '').trim();
  const siteUrl = String(env.SITE_URL || '').trim();
  const nodeEnv = String(env.NODE_ENV || 'development').trim();
  const trustProxy = String(env.TRUST_PROXY || '').trim().toLowerCase();
  const hasUpstash =
    Boolean(String(env.UPSTASH_REDIS_REST_URL || '').trim()) &&
    Boolean(String(env.UPSTASH_REDIS_REST_TOKEN || '').trim());

  if (nodeEnv !== 'production') {
    warnings.push(
      `NODE_ENV atual é "${nodeEnv || 'vazio'}" (esperado "production" no servidor final em go-live).`
    );
  }
  checks.push({
    id: 'node_env',
    label: 'NODE_ENV === "production"',
    status: nodeEnv === 'production' ? 'ok' : 'warn',
  });

  const missingKeys = [
    !mpAccessToken ? 'MP_ACCESS_TOKEN' : null,
    !mpPublicKey ? 'NEXT_PUBLIC_MP_PUBLIC_KEY' : null,
    !mpWebhookKey ? 'MP_WEBHOOK_SECRET' : null,
  ].filter(Boolean);
  if (missingKeys.length > 0) {
    errors.push(
      `Variáveis obrigatórias do Mercado Pago ausentes: ${missingKeys.join(', ')}.`
    );
  }
  checks.push({
    id: 'mp_credentials_present',
    label: 'Credenciais MP_ACCESS_TOKEN, NEXT_PUBLIC_MP_PUBLIC_KEY e MP_WEBHOOK_SECRET definidas',
    status: missingKeys.length === 0 ? 'ok' : 'fail',
  });

  const envWarnings = validateMercadoPagoEnv({
    ...env,
    NODE_ENV: 'production',
  });
  for (const msg of envWarnings) {
    if (!msg.includes('ausentes')) {
      errors.push(msg);
    }
  }

  const effectiveWebhookUrl =
    webhookUrl ||
    (siteUrl ? `${siteUrl.replace(/\/+$/, '')}/api/webhooks/mercadopago` : '');
  const webhookValidation = validateWebhookUrl(effectiveWebhookUrl);
  for (const err of webhookValidation.errors) {
    errors.push(err);
  }
  for (const warn of webhookValidation.warnings) {
    warnings.push(warn);
  }
  checks.push({
    id: 'webhook_https_url',
    label: 'URL pública do webhook em HTTPS (/api/webhooks/mercadopago)',
    status: webhookValidation.valid ? 'ok' : 'fail',
  });

  if (!siteUrl || !siteUrl.startsWith('https://')) {
    warnings.push(
      'SITE_URL não está em https://; confirme a configuração de domínio TLS e ALLOWED_ORIGINS no servidor de produção.'
    );
  }

  if (!trustProxy || trustProxy === 'false' || trustProxy === '0') {
    warnings.push(
      'TRUST_PROXY está desativado; atrás de Nginx/Cloudflare/load balancer defina TRUST_PROXY=1 (ou o número real de hops) para preservar o rate limit por IP em /api/checkout e /api/webhooks/mercadopago.'
    );
  }
  checks.push({
    id: 'trust_proxy',
    label: 'TRUST_PROXY revisado para arquitetura atrás de proxy reverso',
    status: trustProxy && trustProxy !== 'false' && trustProxy !== '0' ? 'ok' : 'warn',
  });

  if (!hasUpstash) {
    warnings.push(
      'UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN ausentes; rate limiting e X-Idempotency-Key do checkout rodarão em memória local.'
    );
  }
  checks.push({
    id: 'distributed_redis',
    label: 'Redis distribuído (Upstash) configurado para rate limit e idempotência',
    status: hasUpstash ? 'ok' : 'warn',
  });

  const hmacSelfTest = runWebhookSignatureSelfTest(mpWebhookKey);
  if (!hmacSelfTest.ok) {
    errors.push('Autoteste criptográfico HMAC-SHA256 v2 / anti-replay falhou.');
  }
  checks.push({
    id: 'webhook_hmac_selftest',
    label: 'Autoteste HMAC-SHA256 v2 (ts válido aceito, replay >900s rejeitado, adulteração rejeitada)',
    status: hmacSelfTest.ok ? 'ok' : 'fail',
  });

  const serverDebit = isDebitCardEnabled(env.MP_ENABLE_DEBIT_CARD);
  const clientDebit = isDebitCardEnabled(env.NEXT_PUBLIC_MP_ENABLE_DEBIT_CARD);
  checks.push({
    id: 'debit_card_policy',
    label: `Política comercial debit_card: backend=${serverDebit ? 'habilitado' : 'desabilitado'}, frontend=${clientDebit ? 'habilitado' : 'desabilitado'}`,
    status: serverDebit === clientDebit ? 'ok' : 'fail',
  });

  const manualChecklist = [
    'Painel Mercado Pago (Produção / live_mode: true): cadastrar URL HTTPS de Webhook apontando para /api/webhooks/mercadopago e tópico Orders (orders).',
    'Copiar a assinatura secreta oficial gerada no painel MP para MP_WEBHOOK_SECRET no servidor de produção.',
    'Validar comercialmente se Cartão de Débito direto está habilitado para a conta recebedora; se não estiver, definir MP_ENABLE_DEBIT_CARD=false e NEXT_PUBLIC_MP_ENABLE_DEBIT_CARD=false antes do build.',
    'Subir build HTTPS, validar /entrar (COOP + Google OAuth) e realizar 1 compra controlada via PIX (R$ 0,50-R$ 1,00) e 1 via cartão confirmando webhook HTTP 200, baixa de estoque e visualização em /minha-conta e /admin.',
    'Agendar execução periódica (cron / job diário ou horário) de `npm run orders:expire` para liberar estoque de pedidos `awaiting_payment` abandonados.',
  ];

  return {
    ready: errors.length === 0,
    nodeEnv,
    debitCardEnabled: serverDebit && clientDebit,
    webhookUrlChecked: webhookValidation.url,
    hmacSelfTest,
    checks,
    errors,
    warnings,
    manualChecklist,
  };
}

/**
 * Formata o relatório textual do preflight sem exibir nenhum segredo ou token.
 */
export function formatPreflightReport(report) {
  const lines = [
    '=== Preflight de Virada para Produção HTTPS — Mercado Pago (live_mode: true) ===',
    `Pronto para produção (bloqueadores): ${report.ready ? 'SIM (0 bloqueadores)' : `NÃO (${report.errors.length} bloqueador(es))`}`,
    `NODE_ENV avaliado:                   ${report.nodeEnv || 'indefinido'}`,
    `Modalidade debit_card:               ${report.debitCardEnabled ? 'HABILITADA' : 'DESABILITADA'}`,
    `URL de Webhook verificada:           ${report.webhookUrlChecked || '(não informada)'}`,
    `Autoteste HMAC-SHA256 v2:            ${report.hmacSelfTest.ok ? 'APROVADO' : 'FALHOU'} (${report.hmacSelfTest.usedConfiguredKey ? 'segredo configurado — valor omitido' : 'chave efêmera de diagnóstico'})`,
    '',
    'Verificações:',
    ...report.checks.map((c) => `  [${c.status.toUpperCase()}] ${c.label}`),
  ];

  if (report.errors.length > 0) {
    lines.push('', 'Bloqueadores para Go-Live:');
    report.errors.forEach((err) => lines.push(`  - [ERRO] ${err}`));
  }

  if (report.warnings.length > 0) {
    lines.push('', 'Alertas / Revisões Recomendadas:');
    report.warnings.forEach((warn) => lines.push(`  - [AVISO] ${warn}`));
  }

  lines.push('', 'Checklist Manual Obrigatório em Produção:');
  report.manualChecklist.forEach((step, idx) => lines.push(`  ${idx + 1}. ${step}`));

  return lines.join('\n');
}

const isDirectExecution =
  Boolean(process.argv[1]) && process.argv[1].endsWith('check-mp-production-readiness.js');

async function main() {
  const nextEnv = await import('@next/env');
  const loadEnvConfig = nextEnv.default?.loadEnvConfig || nextEnv.loadEnvConfig;
  loadEnvConfig(process.cwd());

  const args = parsePreflightArgs(process.argv.slice(2));
  const report = evaluateMercadoPagoProductionReadiness({
    env: process.env,
    webhookUrl: args.webhookUrl,
  });

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatPreflightReport(report));
  }

  const strictBlocked = args.strict && (!report.ready || report.nodeEnv !== 'production');
  process.exitCode = strictBlocked || (!args.strict && !report.ready) ? 1 : 0;
}

if (isDirectExecution) {
  main();
}
