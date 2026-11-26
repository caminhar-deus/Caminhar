/** @jest-environment node */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, jest } from '@jest/globals';
import {
  DEFAULT_ORDER_22_EVENT,
  buildMercadoPagoOrderWebhookPayload,
  loadWebhookEnv,
  parseCliArgs,
  runWebhookHomologation,
  signMercadoPagoWebhook,
  verifyMercadoPagoWebhookSignature,
} from '../../../scripts/maintenance/verify-mp-webhook.js';

describe('scripts/maintenance/verify-mp-webhook.js', () => {
  it('gera payload order.processed padrão com os dados homologados do Pedido #22', () => {
    const payload = buildMercadoPagoOrderWebhookPayload();

    expect(payload.type).toBe('order');
    expect(payload.action).toBe('order.processed');
    expect(payload.live_mode).toBe(false);
    expect(payload.data.external_reference).toBe(DEFAULT_ORDER_22_EVENT.orderId);
    expect(payload.data.id).toBe(DEFAULT_ORDER_22_EVENT.mpOrderId);
    expect(payload.data.total_amount).toBe('0.50');
    expect(payload.data.transactions.payments[0]).toMatchObject({
      id: DEFAULT_ORDER_22_EVENT.mpPaymentId,
      status: 'processed',
      status_detail: 'accredited',
      payment_method: {
        id: 'master',
        type: 'credit_card',
        installments: 1,
      },
    });
  });

  it('normaliza data.id alfanumérico em minúsculas na assinatura HMAC-SHA256 v2 e aprova verificação', () => {
    const secret = 'segredo-teste-hmac-v2';
    const signed = signMercadoPagoWebhook({
      dataId: 'ORDTST01M7JZQWF8JS91B32MM9DRDETA',
      secret,
      requestId: 'req-order-22',
      ts: '1794860000',
    });

    expect(signed.manifest).toBe(
      'id:ordtst01m7jzqwf8js91b32mm9drdeta;request-id:req-order-22;ts:1794860000;'
    );
    expect(
      verifyMercadoPagoWebhookSignature({
        signatureHeader: signed.signatureHeader,
        requestIdHeader: signed.requestIdHeader,
        dataId: 'ORDTST01M7JZQWF8JS91B32MM9DRDETA',
        secret,
        nowSeconds: 1794860000,
      })
    ).toBe(true);

    expect(
      verifyMercadoPagoWebhookSignature({
        signatureHeader: signed.signatureHeader,
        requestIdHeader: signed.requestIdHeader,
        dataId: 'ORDTST01M7JZQWF8JS91B32MM9DRDETA',
        secret,
        nowSeconds: 1794862000,
      })
    ).toBe(false);

    expect(
      verifyMercadoPagoWebhookSignature({
        signatureHeader: signed.signatureHeader,
        requestIdHeader: signed.requestIdHeader,
        dataId: 'ORDTST01M7JZQWF8JS91B32MM9DRDETA',
        secret: 'segredo-adulterado',
        nowSeconds: 1794860000,
      })
    ).toBe(false);
  });

  it('interpreta flags CLI corretamente em parseCliArgs', () => {
    const parsed = parseCliArgs([
      '--order-id=25',
      '--mp-order-id=ORDTST999',
      '--mp-payment-id=PAY999',
      '--amount=10.00',
      '--status=failed',
      '--status-detail=insufficient_amount',
      '--url=https://exemplo.trycloudflare.com/api/webhooks/mercadopago',
      '--send',
      '--help',
    ]);

    expect(parsed).toMatchObject({
      orderId: '25',
      mpOrderId: 'ORDTST999',
      mpPaymentId: 'PAY999',
      totalAmount: '10.00',
      status: 'failed',
      statusDetail: 'insufficient_amount',
      url: 'https://exemplo.trycloudflare.com/api/webhooks/mercadopago',
      send: true,
      help: true,
    });
  });

  it('executa dry-run válido sem expor segredo bruto no comando curl', async () => {
    const secret = 'segredo-super-confidencial-123';
    const result = await runWebhookHomologation({
      secret,
      requestId: 'req-dry-run',
      ts: '1794860100',
    });

    expect(result.mode).toBe('dry-run');
    expect(result.signatureValid).toBe(true);
    expect(result.usingLocalFallbackSecret).toBe(false);
    expect(result.targetUrl).toBe(
      'http://localhost:3000/api/webhooks/mercadopago?data.id=ORDTST01M7JZQWF8JS91B32MM9DRDETA'
    );
    expect(result.curlCommand).toContain('x-signature: ts=1794860100,v1=');
    expect(result.curlCommand).not.toContain(secret);
  });

  it('envia POST assinado no modo --send e reporta sucesso ou erro HTTP', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ received: true, duplicate: false, orderId: 22 }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        text: async () => JSON.stringify({ error: 'Bad Gateway' }),
      });

    const okResult = await runWebhookHomologation(
      {
        send: true,
        secret: 'segredo-send',
        url: 'https://meu-tunel.trycloudflare.com/api/webhooks/mercadopago/',
      },
      { fetchImpl: fetchMock }
    );

    expect(okResult.mode).toBe('send');
    expect(okResult.ok).toBe(true);
    expect(okResult.statusCode).toBe(200);
    expect(okResult.responseBody).toEqual({ received: true, duplicate: false, orderId: 22 });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://meu-tunel.trycloudflare.com/api/webhooks/mercadopago?data.id=ORDTST01M7JZQWF8JS91B32MM9DRDETA',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-signature': okResult.headers['x-signature'],
          'x-request-id': okResult.headers['x-request-id'],
        }),
      })
    );

    const failResult = await runWebhookHomologation(
      { send: true, secret: 'segredo-send' },
      { fetchImpl: fetchMock }
    );
    expect(failResult.ok).toBe(false);
    expect(failResult.statusCode).toBe(502);
  });

  it('carrega MP_WEBHOOK_SECRET de .env.local e .env em loadWebhookEnv sem sobrescrever variáveis já definidas', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-mp-env-'));
    const previousSecret = process.env.MP_WEBHOOK_SECRET;
    delete process.env.MP_WEBHOOK_SECRET;

    try {
      fs.writeFileSync(path.join(tmpDir, '.env.local'), 'MP_WEBHOOK_SECRET=segredo-env-local\n');
      fs.writeFileSync(path.join(tmpDir, '.env'), 'MP_WEBHOOK_SECRET=segredo-env-fallback\n');

      const loaded = loadWebhookEnv(tmpDir);
      expect(loaded).toEqual(['.env.local', '.env']);
      expect(process.env.MP_WEBHOOK_SECRET).toBe('segredo-env-local');
    } finally {
      if (previousSecret === undefined) {
        delete process.env.MP_WEBHOOK_SECRET;
      } else {
        process.env.MP_WEBHOOK_SECRET = previousSecret;
      }
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
