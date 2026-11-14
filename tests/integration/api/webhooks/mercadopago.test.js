import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

jest.mock('../../../../lib/cache/cache.js', () => ({
  invalidateCache: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../../../lib/domain/orders.js', () => ({
  processMercadoPagoWebhookEvent: jest.fn(),
}));

jest.mock('../../../../lib/payment/mercadopago.js', () => ({
  verifyMercadoPagoWebhookSignature: jest.fn(),
  fetchMercadoPagoPaymentStatus: jest.fn(),
}));

import handler from '../../../../pages/api/webhooks/mercadopago.js';
import { invalidateCache } from '../../../../lib/cache/cache.js';
import { processMercadoPagoWebhookEvent } from '../../../../lib/domain/orders.js';
import {
  fetchMercadoPagoPaymentStatus,
  verifyMercadoPagoWebhookSignature,
} from '../../../../lib/payment/mercadopago.js';

describe('API Webhook Mercado Pago (/api/webhooks/mercadopago)', () => {
  const originalEnv = process.env;
  let consoleSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    // O logger escreve falhas esperadas em console.error; silencia só neste arquivo (ADR-0020)
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env = { ...originalEnv };
    delete process.env.MP_ACCESS_TOKEN;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    process.env = originalEnv;
  });

  const signedPaymentRequest = (body = { id: 'evt_1', type: 'payment', data: { id: '99887766' } }) =>
    createMocks({
      method: 'POST',
      headers: { 'x-signature': 'ts=1700000000,v1=validhash', 'x-request-id': 'req-1' },
      body,
    });

  describe('confirmação do status em produção', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      verifyMercadoPagoWebhookSignature.mockReturnValue(true);
      processMercadoPagoWebhookEvent.mockResolvedValue({ duplicate: false, order: { id: 7 } });
    });

    it('usa o status retornado pela API do Mercado Pago', async () => {
      fetchMercadoPagoPaymentStatus.mockResolvedValueOnce('pending');
      const { req, res } = signedPaymentRequest();

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(fetchMercadoPagoPaymentStatus).toHaveBeenCalledWith('99887766');
      expect(processMercadoPagoWebhookEvent).toHaveBeenCalledWith(
        expect.objectContaining({ mpPaymentId: '99887766', paymentStatus: 'pending' }),
      );
    });

    it('ignora status "approved" forjado no corpo e usa o da API', async () => {
      fetchMercadoPagoPaymentStatus.mockResolvedValueOnce('rejected');
      const { req, res } = signedPaymentRequest({
        id: 'evt_2',
        type: 'payment',
        data: { id: '99887766', status: 'approved' },
        payment_status: 'approved',
      });

      await handler(req, res);

      expect(processMercadoPagoWebhookEvent).toHaveBeenCalledWith(
        expect.objectContaining({ paymentStatus: 'rejected' }),
      );
    });

    it('retorna 502 e não processa o pedido quando a API do Mercado Pago falha', async () => {
      fetchMercadoPagoPaymentStatus.mockRejectedValueOnce(
        new Error('MP_API_ERROR: consulta de pagamento retornou HTTP 500'),
      );
      const { req, res } = signedPaymentRequest();

      await handler(req, res);

      expect(res._getStatusCode()).toBe(502);
      expect(processMercadoPagoWebhookEvent).not.toHaveBeenCalled();
      expect(invalidateCache).not.toHaveBeenCalled();
    });

    it('processa webhook da Orders API (type: "order") consultando GET /v1/orders', async () => {
      fetchMercadoPagoPaymentStatus.mockResolvedValueOnce('approved');
      const { req, res } = signedPaymentRequest({
        id: 'evt_ord_1',
        type: 'order',
        action: 'order.processed',
        data: { id: 'ORDTST01ABC99' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(fetchMercadoPagoPaymentStatus).toHaveBeenCalledWith('ORDTST01ABC99', {
        eventType: 'order',
      });
      expect(processMercadoPagoWebhookEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'order',
          mpPaymentId: 'ORDTST01ABC99',
          paymentStatus: 'approved',
        }),
      );
    });

    it('retorna 503 e não processa o pedido quando o token não está configurado', async () => {
      fetchMercadoPagoPaymentStatus.mockRejectedValueOnce(new Error('MP_NOT_CONFIGURED'));
      const { req, res } = signedPaymentRequest();

      await handler(req, res);

      expect(res._getStatusCode()).toBe(503);
      expect(processMercadoPagoWebhookEvent).not.toHaveBeenCalled();
    });
  });

  describe('fora de produção', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test';
      verifyMercadoPagoWebhookSignature.mockReturnValue(true);
      processMercadoPagoWebhookEvent.mockResolvedValue({ duplicate: false, order: { id: 8 } });
    });

    it('aceita o status explícito do corpo sem consultar a API', async () => {
      const { req, res } = signedPaymentRequest({
        id: 'evt_3',
        type: 'payment',
        data: { id: '123', status: 'cancelled' },
      });

      await handler(req, res);

      expect(fetchMercadoPagoPaymentStatus).not.toHaveBeenCalled();
      expect(processMercadoPagoWebhookEvent).toHaveBeenCalledWith(
        expect.objectContaining({ paymentStatus: 'cancelled' }),
      );
    });

    it('normaliza status simulado da Orders API no corpo fora de produção ("canceled" -> "cancelled")', async () => {
      const { req, res } = signedPaymentRequest({
        id: 'evt_ord_sim',
        type: 'order',
        action: 'order.canceled',
        data: { id: 'ORDTST01SIM', status: 'canceled' },
      });

      await handler(req, res);

      expect(fetchMercadoPagoPaymentStatus).not.toHaveBeenCalled();
      expect(processMercadoPagoWebhookEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          mpPaymentId: 'ORDTST01SIM',
          paymentStatus: 'cancelled',
        }),
      );
    });

    it('consulta a API quando há token e o corpo não traz status; falha da API retorna 502', async () => {
      process.env.MP_ACCESS_TOKEN = 'token-de-teste';
      fetchMercadoPagoPaymentStatus.mockRejectedValueOnce(new Error('MP_API_ERROR: x'));
      const { req, res } = signedPaymentRequest();

      await handler(req, res);

      expect(res._getStatusCode()).toBe(502);
      expect(processMercadoPagoWebhookEvent).not.toHaveBeenCalled();
    });
  });

  it('confirma sem processar eventos que não são de pagamento', async () => {
    verifyMercadoPagoWebhookSignature.mockReturnValue(true);
    const { req, res } = signedPaymentRequest({
      id: 'evt_4',
      type: 'merchant_order',
      data: { id: '555' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({ received: true, ignored: true });
    expect(processMercadoPagoWebhookEvent).not.toHaveBeenCalled();
    expect(fetchMercadoPagoPaymentStatus).not.toHaveBeenCalled();
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
