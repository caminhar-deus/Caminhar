import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

jest.mock('../../../../lib/cache/cache.js', () => ({
  checkRateLimit: jest.fn().mockResolvedValue(false),
  invalidateCache: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../../../lib/domain/orders.js', () => ({
  processMercadoPagoWebhookEvent: jest.fn(),
}));

jest.mock('../../../../lib/payment/mercadopago.js', () => {
  const actual = jest.requireActual('../../../../lib/payment/mercadopago.js');
  return {
    ...actual,
    verifyMercadoPagoWebhookSignature: jest.fn(),
    fetchMercadoPagoPaymentDetails: jest.fn(),
  };
});

import handler from '../../../../pages/api/webhooks/mercadopago.js';
import { checkRateLimit, invalidateCache } from '../../../../lib/cache/cache.js';
import { processMercadoPagoWebhookEvent } from '../../../../lib/domain/orders.js';
import {
  fetchMercadoPagoPaymentDetails,
  verifyMercadoPagoWebhookSignature,
} from '../../../../lib/payment/mercadopago.js';

describe('API Webhook Mercado Pago (/api/webhooks/mercadopago)', () => {
  const originalEnv = process.env;
  let consoleSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    checkRateLimit.mockResolvedValue(false);
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
      headers: {
        'x-signature': `ts=${Math.floor(Date.now() / 1000)},v1=validhash`,
        'x-request-id': 'req-1',
      },
      body,
    });

  describe('confirmação do status em produção', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      verifyMercadoPagoWebhookSignature.mockReturnValue(true);
      processMercadoPagoWebhookEvent.mockResolvedValue({
        duplicate: false,
        order: { id: 7 },
        stockChanged: false,
      });
    });

    it('usa o status e metadados autoritativos retornados pela API do Mercado Pago', async () => {
      fetchMercadoPagoPaymentDetails.mockResolvedValueOnce({
        paymentStatus: 'pending',
        rawStatus: 'pending',
        mpOrderStatus: 'pending',
        statusDetail: 'waiting_transfer',
        externalReference: '7',
        transactionId: 'PAY_API_7',
      });
      const { req, res } = signedPaymentRequest();

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(fetchMercadoPagoPaymentDetails).toHaveBeenCalledWith('99887766');
      expect(processMercadoPagoWebhookEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          mpPaymentId: '99887766',
          externalReference: '7',
          paymentStatus: 'pending',
          paymentPayload: expect.objectContaining({
            status_detail: 'waiting_transfer',
            mp_order_status: 'pending',
            mp_transaction_id: 'PAY_API_7',
          }),
        }),
      );
      // Não invalida cache de produtos quando não houve alteração de estoque
      expect(invalidateCache).not.toHaveBeenCalled();
    });

    it('ignora status, external_reference e status_detail forjados no corpo e usa os da API oficial', async () => {
      fetchMercadoPagoPaymentDetails.mockResolvedValueOnce({
        paymentStatus: 'rejected',
        rawStatus: 'failed',
        mpOrderStatus: 'failed',
        statusDetail: 'insufficient_amount',
        externalReference: '88',
        transactionId: 'PAY_REAL_88',
      });
      const { req, res } = signedPaymentRequest({
        id: 'evt_2',
        type: 'payment',
        data: {
          id: '99887766',
          status: 'approved',
          external_reference: '999999',
          status_detail: 'accredited',
        },
        payment_status: 'approved',
      });

      await handler(req, res);

      expect(processMercadoPagoWebhookEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentStatus: 'rejected',
          externalReference: '88',
          paymentPayload: expect.objectContaining({
            status_detail: 'insufficient_amount',
            mp_order_status: 'failed',
            mp_transaction_id: 'PAY_REAL_88',
          }),
        }),
      );
    });

    it('retorna 502 e não processa o pedido quando a API do Mercado Pago falha', async () => {
      fetchMercadoPagoPaymentDetails.mockRejectedValueOnce(
        new Error('MP_API_ERROR: consulta de pagamento retornou HTTP 500'),
      );
      const { req, res } = signedPaymentRequest();

      await handler(req, res);

      expect(res._getStatusCode()).toBe(502);
      expect(processMercadoPagoWebhookEvent).not.toHaveBeenCalled();
      expect(invalidateCache).not.toHaveBeenCalled();
    });

    it('processa webhook da Orders API (type: "order") consultando GET /v1/orders', async () => {
      fetchMercadoPagoPaymentDetails.mockResolvedValueOnce({
        paymentStatus: 'approved',
        mpOrderStatus: 'processed',
        statusDetail: 'accredited',
        externalReference: '20',
        transactionId: 'PAY_ORD_1',
      });
      const { req, res } = signedPaymentRequest({
        id: 'evt_ord_1',
        type: 'order',
        action: 'order.processed',
        data: { id: 'ORDTST01ABC99' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(fetchMercadoPagoPaymentDetails).toHaveBeenCalledWith('ORDTST01ABC99', {
        eventType: 'order',
      });
      expect(processMercadoPagoWebhookEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'order',
          mpPaymentId: 'ORDTST01ABC99',
          externalReference: '20',
          paymentStatus: 'approved',
        }),
      );
    });

    it('retorna 503 e não processa o pedido quando o token não está configurado', async () => {
      fetchMercadoPagoPaymentDetails.mockRejectedValueOnce(new Error('MP_NOT_CONFIGURED'));
      const { req, res } = signedPaymentRequest();

      await handler(req, res);

      expect(res._getStatusCode()).toBe(503);
      expect(processMercadoPagoWebhookEvent).not.toHaveBeenCalled();
    });

    it('processa evento order.processed sem id de topo consultando /v1/orders e usando dados da API', async () => {
      fetchMercadoPagoPaymentDetails.mockResolvedValueOnce({
        paymentStatus: 'approved',
        mpOrderStatus: 'processed',
        statusDetail: 'accredited',
        externalReference: '20',
        transactionId: 'PAY01M7CT3ZBCE8718PE0KR3DD7JR',
      });
      const { req, res } = signedPaymentRequest({
        action: 'order.processed',
        api_version: 'v1',
        type: 'order',
        data: {
          id: 'ORDTST01M7CT3ZAZKHHJXSER0A1GCTAR',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      expect(fetchMercadoPagoPaymentDetails).toHaveBeenCalledWith(
        'ORDTST01M7CT3ZAZKHHJXSER0A1GCTAR',
        { eventType: 'order' }
      );
      expect(processMercadoPagoWebhookEvent).toHaveBeenCalledWith({
        eventId: 'order_order.processed_ORDTST01M7CT3ZAZKHHJXSER0A1GCTAR_approved',
        eventType: 'order',
        mpPaymentId: 'ORDTST01M7CT3ZAZKHHJXSER0A1GCTAR',
        externalReference: '20',
        paymentStatus: 'approved',
        paymentPayload: expect.objectContaining({
          last_webhook_event: 'order',
          last_webhook_action: 'order.processed',
          last_webhook_status: 'approved',
          status_detail: 'accredited',
          mp_order_status: 'processed',
          mp_transaction_id: 'PAY01M7CT3ZBCE8718PE0KR3DD7JR',
        }),
      });
    });

    it('retorna 503 retryable quando pedido não é encontrado (condição de corrida) sem invalidar cache', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        fetchMercadoPagoPaymentDetails.mockResolvedValueOnce({
          paymentStatus: 'approved',
          mpOrderStatus: 'processed',
          statusDetail: 'accredited',
          externalReference: '999',
          transactionId: 'PAY_RACE',
        });
        processMercadoPagoWebhookEvent.mockResolvedValueOnce({
          duplicate: false,
          order: null,
          orderNotFound: true,
          stockChanged: false,
        });

        const { req, res } = signedPaymentRequest();
        await handler(req, res);

        expect(res._getStatusCode()).toBe(503);
        expect(JSON.parse(res._getData()).retryable).toBe(true);
        expect(invalidateCache).not.toHaveBeenCalled();
      } finally {
        warnSpy.mockRestore();
      }
    });
  });

  describe('fora de produção', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test';
      verifyMercadoPagoWebhookSignature.mockReturnValue(true);
      processMercadoPagoWebhookEvent.mockResolvedValue({
        duplicate: false,
        order: { id: 8 },
        stockChanged: false,
      });
    });

    it('aceita o status explícito do corpo sem consultar a API', async () => {
      const { req, res } = signedPaymentRequest({
        id: 'evt_3',
        type: 'payment',
        data: { id: '123', status: 'cancelled' },
      });

      await handler(req, res);

      expect(fetchMercadoPagoPaymentDetails).not.toHaveBeenCalled();
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

      expect(fetchMercadoPagoPaymentDetails).not.toHaveBeenCalled();
      expect(processMercadoPagoWebhookEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          mpPaymentId: 'ORDTST01SIM',
          paymentStatus: 'cancelled',
        }),
      );
    });

    it('consulta a API quando há token e o corpo não traz status; falha da API retorna 502', async () => {
      process.env.MP_ACCESS_TOKEN = 'token-de-teste';
      fetchMercadoPagoPaymentDetails.mockRejectedValueOnce(new Error('MP_API_ERROR: x'));
      const { req, res } = signedPaymentRequest();

      await handler(req, res);

      expect(res._getStatusCode()).toBe(502);
      expect(processMercadoPagoWebhookEvent).not.toHaveBeenCalled();
    });
  });

  it('mapeia corretamente webhook order.processed com status_detail=accredited fora de produção', async () => {
    verifyMercadoPagoWebhookSignature.mockReturnValue(true);
    processMercadoPagoWebhookEvent.mockResolvedValueOnce({
      duplicate: false,
      order: { id: 20, order_status: 'paid' },
      stockChanged: false,
    });

    const { req, res } = signedPaymentRequest({
      action: 'order.processed',
      type: 'order',
      data: {
        id: 'ORDTST01M7CT3ZAZKHHJXSER0A1GCTAR',
        external_reference: '20',
        status: 'processed',
        status_detail: 'accredited',
        transactions: {
          payments: [
            {
              id: 'PAY01M7CT3ZBCE8718PE0KR3DD7JR',
              status: 'processed',
              status_detail: 'accredited',
            },
          ],
        },
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({
      received: true,
      duplicate: false,
      orderId: 20,
    });
    expect(processMercadoPagoWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        mpPaymentId: 'ORDTST01M7CT3ZAZKHHJXSER0A1GCTAR',
        externalReference: '20',
        paymentStatus: 'approved',
        paymentPayload: expect.objectContaining({
          status_detail: 'accredited',
          mp_order_status: 'processed',
          mp_transaction_id: 'PAY01M7CT3ZBCE8718PE0KR3DD7JR',
        }),
      })
    );
    expect(invalidateCache).not.toHaveBeenCalled();
  });

  it('fora de produção com body.data.transactions.payments múltiplo seleciona a tentativa prioritária via selectPrimaryOrderPayment', async () => {
    process.env.NODE_ENV = 'development';
    verifyMercadoPagoWebhookSignature.mockReturnValue(true);
    processMercadoPagoWebhookEvent.mockResolvedValueOnce({
      duplicate: false,
      order: { id: 33, order_status: 'paid' },
      stockChanged: false,
    });

    const { req, res } = signedPaymentRequest({
      action: 'order.processed',
      type: 'order',
      data: {
        id: 'ORDTST_MULTI_DEV_33',
        external_reference: '33',
        status: 'processed',
        transactions: {
          payments: [
            {
              id: 'PAY_FAIL_1',
              status: 'failed',
              status_detail: 'rejected_by_issuer',
            },
            {
              id: 'PAY_OK_2',
              status: 'processed',
              status_detail: 'accredited',
            },
          ],
        },
      },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(processMercadoPagoWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        mpPaymentId: 'ORDTST_MULTI_DEV_33',
        externalReference: '33',
        paymentStatus: 'approved',
        paymentPayload: expect.objectContaining({
          status_detail: 'accredited',
          mp_order_status: 'processed',
          mp_transaction_id: 'PAY_OK_2',
        }),
      })
    );
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
    expect(fetchMercadoPagoPaymentDetails).not.toHaveBeenCalled();
  });

  it('deve invalidar cache de produtos quando stockChanged=true e ignorar em webhook duplicado', async () => {
    verifyMercadoPagoWebhookSignature.mockReturnValue(true);
    processMercadoPagoWebhookEvent.mockResolvedValueOnce({
      duplicate: false,
      order: { id: 301, order_status: 'cancelled', stock_restored: true },
      stockChanged: true,
    });

    const { req, res } = signedPaymentRequest({
      id: 'evt_12345',
      type: 'payment',
      data: { id: '99887766', status: 'rejected' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.received).toBe(true);
    expect(data.duplicate).toBe(false);
    expect(data.orderId).toBe(301);
    expect(invalidateCache).toHaveBeenCalledWith('products:*');

    invalidateCache.mockClear();
    processMercadoPagoWebhookEvent.mockResolvedValueOnce({
      duplicate: true,
      order: null,
      stockChanged: false,
    });
    const { req: reqDup, res: resDup } = signedPaymentRequest();
    await handler(reqDup, resDup);
    expect(resDup._getStatusCode()).toBe(200);
    expect(invalidateCache).not.toHaveBeenCalled();
  });

  it('deve retornar 429 quando rate limit do webhook for excedido', async () => {
    checkRateLimit.mockResolvedValueOnce(true);
    const { req, res } = signedPaymentRequest();
    await handler(req, res);
    expect(res._getStatusCode()).toBe(429);
    expect(verifyMercadoPagoWebhookSignature).not.toHaveBeenCalled();
  });

  it('deve retornar 401 quando a assinatura for inválida', async () => {
    verifyMercadoPagoWebhookSignature.mockReturnValue(false);

    const { req, res } = createMocks({
      method: 'POST',
      headers: {
        'x-signature': `ts=${Math.floor(Date.now() / 1000)},v1=tamperedhash`,
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
