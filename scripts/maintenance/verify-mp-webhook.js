#!/usr/bin/env node
/**
 * Utilitário de homologação de webhooks da Orders API do Mercado Pago.
 *
 * Gera, assina (HMAC-SHA256 v2 com `data.id` alfanumérico normalizado em minúsculas),
 * valida localmente usando a mesma regra de `lib/payment/mercadopago.js` e,
 * opcionalmente (`--send`), envia o POST assinado para o endpoint de webhook.
 *
 * Nunca imprime `MP_WEBHOOK_SECRET` ou `MP_ACCESS_TOKEN` na saída.
 */
import { createHmac, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { verifyMercadoPagoWebhookSignature } from '../../lib/payment/mercadopago.js';

export const DEFAULT_ORDER_22_EVENT = Object.freeze({
  orderId: '22',
  mpOrderId: 'ORDTST01M7JZQWF8JS91B32MM9DRDETA',
  mpPaymentId: 'PAY01M7JZQWFXWQE3K0CHK70QYX77',
  totalAmount: '0.50',
  paymentMethodId: 'master',
  paymentTypeId: 'credit_card',
  installments: 1,
  status: 'processed',
  statusDetail: 'accredited',
  userId: '3840680678',
  applicationId: '516565028360615',
  referenceId: '000hzlabo5',
});

function resolveDotenv(cwd) {
  for (const baseDir of [cwd, process.cwd()]) {
    try {
      const req = createRequire(path.join(baseDir, 'package.json'));
      const mod = req('dotenv');
      if (mod && typeof mod.config === 'function') {
        return mod;
      }
    } catch {
      // Tenta o próximo diretório candidato
    }
  }
  return null;
}

export function loadWebhookEnv(cwd = process.cwd()) {
  const dotenv = resolveDotenv(cwd);
  const loadedFiles = [];

  for (const fileName of ['.env.local', '.env']) {
    const envPath = path.join(cwd, fileName);
    if (!fs.existsSync(envPath)) continue;
    if (dotenv) {
      dotenv.config({ path: envPath, quiet: true });
    }
    loadedFiles.push(fileName);
  }

  return loadedFiles;
}

export function buildMercadoPagoOrderWebhookPayload(options = {}) {
  const orderId = String(options.orderId ?? DEFAULT_ORDER_22_EVENT.orderId);
  const mpOrderId = String(options.mpOrderId ?? DEFAULT_ORDER_22_EVENT.mpOrderId);
  const mpPaymentId = String(options.mpPaymentId ?? DEFAULT_ORDER_22_EVENT.mpPaymentId);
  const totalAmount = String(options.totalAmount ?? DEFAULT_ORDER_22_EVENT.totalAmount);
  const paymentMethodId = String(options.paymentMethodId ?? DEFAULT_ORDER_22_EVENT.paymentMethodId);
  const paymentTypeId = String(options.paymentTypeId ?? DEFAULT_ORDER_22_EVENT.paymentTypeId);
  const installments = Number(options.installments ?? DEFAULT_ORDER_22_EVENT.installments) || 1;
  const status = String(options.status ?? DEFAULT_ORDER_22_EVENT.status);
  const statusDetail = String(options.statusDetail ?? DEFAULT_ORDER_22_EVENT.statusDetail);
  const userId = String(options.userId ?? DEFAULT_ORDER_22_EVENT.userId);
  const applicationId = String(options.applicationId ?? DEFAULT_ORDER_22_EVENT.applicationId);
  const referenceId = String(options.referenceId ?? DEFAULT_ORDER_22_EVENT.referenceId);

  return {
    action: String(options.action || `order.${status}`),
    api_version: 'v1',
    application_id: applicationId,
    data: {
      currency_id: 'BRL',
      external_reference: orderId,
      id: mpOrderId,
      status,
      status_detail: statusDetail,
      total_amount: totalAmount,
      total_paid_amount: totalAmount,
      transactions: {
        payments: [
          {
            amount: totalAmount,
            id: mpPaymentId,
            paid_amount: totalAmount,
            payment_method: {
              id: paymentMethodId,
              installments,
              type: paymentTypeId,
            },
            reference: {
              id: referenceId,
            },
            status,
            status_detail: statusDetail,
          },
        ],
      },
      type: 'online',
      version: 1,
    },
    date_created: options.dateCreated || new Date().toISOString(),
    live_mode: Boolean(options.liveMode),
    type: 'order',
    user_id: userId,
  };
}

export function signMercadoPagoWebhook({
  dataId,
  secret,
  requestId = randomUUID(),
  ts = String(Math.floor(Date.now() / 1000)),
}) {
  if (!secret || typeof secret !== 'string') {
    throw new Error('MP_WEBHOOK_SECRET é obrigatório para assinar o webhook.');
  }

  const normalizedDataId = String(dataId || '').trim().toLowerCase();
  const safeRequestId = String(requestId);
  const safeTs = String(ts);
  const manifest = `id:${normalizedDataId};request-id:${safeRequestId};ts:${safeTs};`;
  const v1 = createHmac('sha256', secret).update(manifest).digest('hex');

  return {
    signatureHeader: `ts=${safeTs},v1=${v1}`,
    requestIdHeader: safeRequestId,
    ts: safeTs,
    v1,
    manifest,
  };
}

export { verifyMercadoPagoWebhookSignature };

export function parseCliArgs(argv = process.argv.slice(2)) {
  const options = {
    help: false,
    send: false,
    url: 'http://localhost:3000/api/webhooks/mercadopago',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--send') {
      options.send = true;
      continue;
    }

    const eqIdx = arg.indexOf('=');
    const flag = eqIdx > 0 ? arg.slice(0, eqIdx) : arg;
    const inlineValue = eqIdx > 0 ? arg.slice(eqIdx + 1) : null;
    const nextValue = () => {
      if (inlineValue !== null) return inlineValue;
      if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        i += 1;
        return argv[i];
      }
      return '';
    };

    switch (flag) {
      case '--order-id':
        options.orderId = nextValue();
        break;
      case '--mp-order-id':
        options.mpOrderId = nextValue();
        break;
      case '--mp-payment-id':
        options.mpPaymentId = nextValue();
        break;
      case '--amount':
        options.totalAmount = nextValue();
        break;
      case '--status':
        options.status = nextValue();
        break;
      case '--status-detail':
        options.statusDetail = nextValue();
        break;
      case '--url':
        options.url = nextValue() || options.url;
        break;
      case '--secret':
        options.secret = nextValue();
        break;
      default:
        break;
    }
  }

  return options;
}

export async function runWebhookHomologation(options = {}, { fetchImpl = global.fetch } = {}) {
  const payload = buildMercadoPagoOrderWebhookPayload(options);
  const mpOrderId = payload.data.id;
  const secret = options.secret || process.env.MP_WEBHOOK_SECRET || 'sandbox-webhook-secret-local';
  const usingLocalFallbackSecret = !options.secret && !process.env.MP_WEBHOOK_SECRET;

  const signed = signMercadoPagoWebhook({
    dataId: mpOrderId,
    secret,
    requestId: options.requestId,
    ts: options.ts,
  });

  const signatureValid = verifyMercadoPagoWebhookSignature({
    signatureHeader: signed.signatureHeader,
    requestIdHeader: signed.requestIdHeader,
    dataId: mpOrderId,
    secret,
  });

  const baseUrl = String(options.url || 'http://localhost:3000/api/webhooks/mercadopago').replace(
    /\/+$/,
    ''
  );
  const targetUrl = `${baseUrl}?data.id=${encodeURIComponent(mpOrderId)}`;
  const headers = {
    'Content-Type': 'application/json',
    'x-signature': signed.signatureHeader,
    'x-request-id': signed.requestIdHeader,
  };

  const curlCommand = [
    `curl -sS -X POST "${targetUrl}"`,
    `-H "Content-Type: application/json"`,
    `-H "x-signature: ${signed.signatureHeader}"`,
    `-H "x-request-id: ${signed.requestIdHeader}"`,
    `-d '${JSON.stringify(payload)}'`,
  ].join(' ');

  if (!options.send) {
    return {
      mode: 'dry-run',
      ok: signatureValid,
      signatureValid,
      usingLocalFallbackSecret,
      targetUrl,
      headers,
      signed,
      payload,
      curlCommand,
    };
  }

  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch indisponível neste ambiente para enviar o webhook.');
  }

  const response = await fetchImpl(targetUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const rawBody = await response.text();
  let parsedBody;
  try {
    parsedBody = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    parsedBody = rawBody;
  }

  return {
    mode: 'send',
    ok: response.ok && signatureValid,
    signatureValid,
    usingLocalFallbackSecret,
    statusCode: response.status,
    responseBody: parsedBody,
    targetUrl,
    headers,
    signed,
    payload,
  };
}

function printHelp() {
  console.log(`Uso: node scripts/maintenance/verify-mp-webhook.js [opções]

Opções:
  --order-id=<id>          ID interno do pedido (padrão: ${DEFAULT_ORDER_22_EVENT.orderId})
  --mp-order-id=<id>       ID da Order MP (padrão: ${DEFAULT_ORDER_22_EVENT.mpOrderId})
  --mp-payment-id=<id>     ID do pagamento MP (padrão: ${DEFAULT_ORDER_22_EVENT.mpPaymentId})
  --amount=<valor>         Valor total (padrão: ${DEFAULT_ORDER_22_EVENT.totalAmount})
  --status=<status>        Status da Order (padrão: ${DEFAULT_ORDER_22_EVENT.status})
  --status-detail=<detail> Detalhe do status (padrão: ${DEFAULT_ORDER_22_EVENT.statusDetail})
  --url=<endpoint>         URL de destino (padrão: http://localhost:3000/api/webhooks/mercadopago)
  --secret=<segredo>       Segredo HMAC (padrão: MP_WEBHOOK_SECRET do ambiente ou fallback local)
  --send                   Envia a requisição POST assinada ao endpoint informado
  --help, -h               Exibe esta ajuda`);
}

export async function main() {
  const args = parseCliArgs();
  if (args.help) {
    printHelp();
    return;
  }

  loadWebhookEnv();

  const result = await runWebhookHomologation(args);
  const payment = result.payload.data.transactions.payments[0];

  console.log('=== Homologação de Webhook Mercado Pago (Orders API v1) ===');
  console.log(`Pedido interno (external_reference): #${result.payload.data.external_reference}`);
  console.log(`Order MP (data.id):                  ${result.payload.data.id}`);
  console.log(
    `Pagamento MP:                        ${payment.id} (${payment.payment_method.id} / ${payment.payment_method.type})`
  );
  console.log(
    `Valor / Status:                      R$ ${result.payload.data.total_amount} | ${result.payload.data.status} (${result.payload.data.status_detail})`
  );
  console.log(`Manifesto HMAC v2:                   ${result.signed.manifest}`);
  console.log(
    `Segredo utilizado:                   ${
      result.usingLocalFallbackSecret
        ? 'fallback local de validação (MP_WEBHOOK_SECRET ausente no ambiente)'
        : 'MP_WEBHOOK_SECRET configurado (valor omitido por segurança)'
    }`
  );
  console.log(
    `Assinatura HMAC-SHA256 v2:           ${result.signatureValid ? 'VÁLIDA (true)' : 'INVÁLIDA (false)'}`
  );
  console.log(`URL de destino:                      ${result.targetUrl}`);
  console.log(`Header x-request-id:                 ${result.headers['x-request-id']}`);
  console.log(`Header x-signature:                  ${result.headers['x-signature']}`);

  if (result.mode === 'send') {
    console.log(`\nResposta HTTP:                       ${result.statusCode}`);
    console.log(`Corpo da resposta:                   ${JSON.stringify(result.responseBody)}`);
    if (result.statusCode === 401) {
      console.log(
        '\nDica: HTTP 401 indica divergência entre o MP_WEBHOOK_SECRET carregado por este script e o ativo no servidor Next.js. Confira o .env/.env.local e reinicie `npm run dev`.'
      );
    }
    if (!result.ok) {
      process.exitCode = 1;
    }
  } else {
    console.log('\nModo dry-run (nenhum POST enviado). Para enviar, adicione --send ou execute:');
    console.log(`\n${result.curlCommand}`);
    if (!result.signatureValid) {
      process.exitCode = 1;
    }
  }
}

if (process.argv[1] && process.argv[1].endsWith('verify-mp-webhook.js')) {
  main().catch((err) => {
    console.error('Erro ao validar/enviar webhook:', err?.message || err);
    process.exitCode = 1;
  });
}
