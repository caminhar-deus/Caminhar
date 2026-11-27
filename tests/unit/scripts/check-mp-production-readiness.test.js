import { describe, it, expect } from '@jest/globals';
import {
  parsePreflightArgs,
  validateWebhookUrl,
  runWebhookSignatureSelfTest,
  evaluateMercadoPagoProductionReadiness,
  formatPreflightReport,
} from '../../../scripts/maintenance/check-mp-production-readiness.js';

describe('scripts/maintenance/check-mp-production-readiness.js', () => {
  it('parsePreflightArgs interpreta flags --webhook-url, --strict e --json', () => {
    expect(
      parsePreflightArgs(['--webhook-url=https://loja.exemplo.com.br/api/webhooks/mercadopago', '--strict', '--json'])
    ).toEqual({
      webhookUrl: 'https://loja.exemplo.com.br/api/webhooks/mercadopago',
      strict: true,
      json: true,
    });
  });

  it('validateWebhookUrl aceita apenas HTTPS público terminando em /api/webhooks/mercadopago', () => {
    expect(validateWebhookUrl('https://caminhar.com.br/api/webhooks/mercadopago')).toMatchObject({
      valid: true,
      errors: [],
    });

    expect(validateWebhookUrl('http://caminhar.com.br/api/webhooks/mercadopago')).toMatchObject({
      valid: false,
      errors: expect.arrayContaining([expect.stringMatching(/HTTPS/i)]),
    });

    expect(validateWebhookUrl('https://localhost:3000/api/webhooks/mercadopago')).toMatchObject({
      valid: false,
      errors: expect.arrayContaining([expect.stringMatching(/localhost/i)]),
    });

    expect(validateWebhookUrl('https://192.168.0.10/api/webhooks/mercadopago')).toMatchObject({
      valid: false,
      errors: expect.arrayContaining([expect.stringMatching(/rede privada/i)]),
    });

    expect(validateWebhookUrl('https://abc.ngrok-free.app/api/webhooks/mercadopago')).toMatchObject({
      valid: false,
      errors: expect.arrayContaining([expect.stringMatching(/túnel temporário/i)]),
    });

    expect(validateWebhookUrl('https://caminhar.com.br/outro-caminho')).toMatchObject({
      valid: false,
      errors: expect.arrayContaining([expect.stringMatching(/\/api\/webhooks\/mercadopago/)]),
    });
  });

  it('runWebhookSignatureSelfTest valida assinatura atual e rejeita replay expirado ou adulterado', () => {
    const configured = runWebhookSignatureSelfTest('chave-teste-hmac-producao');
    expect(configured).toEqual({
      ok: true,
      validAccepted: true,
      expiredRejected: true,
      tamperedRejected: true,
      usedConfiguredKey: true,
    });

    const ephemeral = runWebhookSignatureSelfTest('');
    expect(ephemeral.ok).toBe(true);
    expect(ephemeral.usedConfiguredKey).toBe(false);
  });

  it('evaluateMercadoPagoProductionReadiness valida prontidão, nunca vaza valores sensíveis e aponta bloqueadores/avisos', () => {
    const secretVal = 'segredo-super-confidencial-mp-999';
    const tokenVal = 'APP_USR-999999999-live-privado';
    const reportReady = evaluateMercadoPagoProductionReadiness({
      env: {
        NODE_ENV: 'production',
        MP_ACCESS_TOKEN: tokenVal,
        NEXT_PUBLIC_MP_PUBLIC_KEY: 'APP_USR-public-live-123',
        MP_WEBHOOK_SECRET: secretVal,
        SITE_URL: 'https://caminhar.com.br',
        TRUST_PROXY: '1',
        UPSTASH_REDIS_REST_URL: 'https://redis.upstash.io',
        UPSTASH_REDIS_REST_TOKEN: 'upstash-live-value',
        MP_ENABLE_DEBIT_CARD: 'false',
        NEXT_PUBLIC_MP_ENABLE_DEBIT_CARD: 'false',
      },
    });

    expect(reportReady.ready).toBe(true);
    expect(reportReady.errors).toEqual([]);
    expect(reportReady.warnings).toEqual([]);
    expect(reportReady.debitCardEnabled).toBe(false);
    expect(reportReady.hmacSelfTest.ok).toBe(true);

    const textReport = formatPreflightReport(reportReady);
    expect(textReport).not.toContain(secretVal);
    expect(textReport).not.toContain(tokenVal);
    expect(textReport).toContain('Checklist Manual Obrigatório');

    const reportBlocked = evaluateMercadoPagoProductionReadiness({
      env: {
        NODE_ENV: 'development',
        MP_ACCESS_TOKEN: 'TEST-sandbox-only',
        NEXT_PUBLIC_MP_PUBLIC_KEY: 'TEST-pub-sandbox',
        MP_WEBHOOK_SECRET: '',
        MP_ENABLE_DEBIT_CARD: 'false',
        NEXT_PUBLIC_MP_ENABLE_DEBIT_CARD: 'true',
      },
      webhookUrl: 'http://localhost:3000/api/webhooks/mercadopago',
    });

    expect(reportBlocked.ready).toBe(false);
    expect(reportBlocked.errors.length).toBeGreaterThanOrEqual(4);
    expect(reportBlocked.warnings.some((w) => w.includes('TRUST_PROXY'))).toBe(true);
    expect(reportBlocked.warnings.some((w) => w.includes('UPSTASH_REDIS'))).toBe(true);
  });
});
