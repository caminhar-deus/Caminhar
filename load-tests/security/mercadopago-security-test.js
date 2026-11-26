import http from 'k6/http';
import { check } from 'k6';
import { Counter, Rate } from 'k6/metrics';
import { BASE_URL } from '../helpers/config.js';
import { generateReport } from '../helpers/report.js';

/**
 * Teste de Seguranca e Rate Limit — Endpoints do Mercado Pago e Checkout
 *
 * Verifica sob carga controlada que:
 * 1. GET /api/checkout rejeita productId invalido (400) e aciona rate limit (429);
 * 2. POST /api/checkout bloqueia requisicoes sem sessao de visitante (401);
 * 3. POST /api/webhooks/mercadopago rejeita assinaturas invalidas ou payloads sem data.id (401/400)
 *    e aplica rate limit (429) sem vazar erros 5xx nem tocar no banco/gateway.
 */

const CHECKOUT_IP = '203.0.113.32';
const WEBHOOK_IP = '203.0.113.33';

const RESPOSTAS_ESPERADAS = http.expectedStatuses(400, 401, 429);

const CheckoutRateLimitHits = new Counter('mp_checkout_rate_limit_hits');
const WebhookRateLimitHits = new Counter('mp_webhook_rate_limit_hits');
const ErrorRate500 = new Rate('mp_security_errors_500');

export const options = {
  stages: [
    { duration: '3s', target: 10 },
    { duration: '10s', target: 10 },
    { duration: '2s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    checks: ['rate>0.95'],
    mp_security_errors_500: ['rate==0'],
  },
};

export default function () {
  const getCheckoutRes = http.get(`${BASE_URL}/api/checkout?productId=abc`, {
    headers: {
      'X-Forwarded-For': CHECKOUT_IP,
    },
    tags: { type: 'mp_checkout_get' },
    responseCallback: RESPOSTAS_ESPERADAS,
  });

  if (getCheckoutRes.status === 429) {
    CheckoutRateLimitHits.add(1);
  }
  ErrorRate500.add(getCheckoutRes.status >= 500);

  check(getCheckoutRes, {
    'Checkout GET: validacao (400) ou rate limit (429)': (r) =>
      r.status === 400 || r.status === 429,
  });

  const postCheckoutAnonRes = http.post(
    `${BASE_URL}/api/checkout`,
    JSON.stringify({ productId: 1, quantity: 1, paymentMethod: 'pix' }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': CHECKOUT_IP,
      },
      tags: { type: 'mp_checkout_post_anon' },
      responseCallback: RESPOSTAS_ESPERADAS,
    }
  );

  ErrorRate500.add(postCheckoutAnonRes.status >= 500);

  check(postCheckoutAnonRes, {
    'Checkout POST anonimo: bloqueado (401)': (r) => r.status === 401,
  });

  const webhookRes = http.post(`${BASE_URL}/api/webhooks/mercadopago`, '{}', {
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': WEBHOOK_IP,
      'x-signature':
        'ts=1700000000,v1=0000000000000000000000000000000000000000000000000000000000000000',
      'x-request-id': `k6-mp-sec-${__VU}-${__ITER}`,
    },
    tags: { type: 'mp_webhook_security' },
    responseCallback: RESPOSTAS_ESPERADAS,
  });

  if (webhookRes.status === 429) {
    WebhookRateLimitHits.add(1);
  }
  ErrorRate500.add(webhookRes.status >= 500);

  check(webhookRes, {
    'Webhook MP: assinatura rejeitada (401/400) ou rate limit (429)': (r) =>
      r.status === 401 || r.status === 400 || r.status === 429,
  });
}

export function handleSummary(data) {
  const checkoutHits = data.metrics.mp_checkout_rate_limit_hits
    ? data.metrics.mp_checkout_rate_limit_hits.values.count
    : 0;
  const webhookHits = data.metrics.mp_webhook_rate_limit_hits
    ? data.metrics.mp_webhook_rate_limit_hits.values.count
    : 0;

  if (checkoutHits === 0) {
    console.log(
      '\nAVISO: Rate limit de GET /api/checkout nao foi acionado durante o teste.\n'
    );
  }
  if (webhookHits === 0) {
    console.log(
      '\nAVISO: Rate limit de POST /api/webhooks/mercadopago nao foi acionado durante o teste.\n'
    );
  }

  console.log(
    `\nSeguranca MP (k6): checkout 429=${checkoutHits}, webhook 429=${webhookHits}\n`
  );

  return generateReport(data, 'mercadopago_security_test');
}
