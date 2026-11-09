import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

jest.mock('../../../../lib/cache/cache.js', () => ({
  invalidateCache: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../../../lib/domain/orders.js', () => ({
  processMercadoPagoWebhookEvent: jest.fn(),
}));

jest.mock('../../../../lib/payment/mercadopago.js', () => ({
  verifyMercadoPagoWebhookSignature: jest.fn(),
}));

import handler from '../../../../pages/api/webhooks/mercadopago.js';
import { invalidateCache } from '../../../../lib/cache/cache.js';
import { processMercadoPagoWebhookEvent } from '../../../../lib/domain/orders.js';
import { verifyMercadoPagoWebhookSignature } from '../../../../lib/payment/mercadopago.js';

describe('API Webhook Mercado Pago (/api/webhooks/mercadopago)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve processar webhook com assinatura válida com sucesso', async () => {
    verifyMercadoPagoWebhookSignature.mockReturnValue(true);
    processMercadoPagoWebhookEvent.mockResolvedValueOnce({
      duplicate: false,
      order: { id: 301, order_status: 'paid' },
    });

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'x-signature': 'ts=1700000000,v1=validhash',
        'x-request-id': 'req-1234',
      },
      body: {
        id: 'evt_12345',
        type: 'payment',
        data: { id: '99887766' },
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.received).toBe(true);
    expect(data.duplicate).toBe(false);
    expect(data.orderId).toBe(301);
    expect(invalidateCache).toHaveBeenCalledWith('products:*');
  });

  it('deve retornar 401 quando a assinatura for inválida', async () => {
    verifyMercadoPagoWebhookSignature.mockReturnValue(false);

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'x-signature': 'ts=1700000000,v1=tamperedhash',
      },
      body: { data: { id: '99887766' } },
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(401);
  });

  it('deve retornar 400 se dataId estiver ausente', async () => {
    verifyMercadoPagoWebhookSignature.mockReturnValue(true);

    const { req, res } = createMocks({
      method: 'POST',
      body: {},
    });

    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });

  it('deve retornar 405 para requisições GET ou PUT', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });
});
