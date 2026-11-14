import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

jest.mock('../../../../lib/payment/mercadopago.js', () => ({
  fetchMercadoPagoPaymentDetails: jest.fn(),
}));

jest.mock('../../../../lib/domain/orders.js', () => ({
  syncOrderPaymentStatus: jest.fn(),
}));

jest.mock('../../../../lib/cache/cache.js', () => ({
  invalidateCache: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../../lib/infra/logger.js', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

import { reconcilePendingOrders } from '../../../../lib/payment/reconcile-orders.js';
import { fetchMercadoPagoPaymentDetails } from '../../../../lib/payment/mercadopago.js';
import { syncOrderPaymentStatus } from '../../../../lib/domain/orders.js';
import { invalidateCache } from '../../../../lib/cache/cache.js';
import { logger } from '../../../../lib/infra/logger.js';

describe('reconcilePendingOrders() — lib/payment/reconcile-orders.js', () => {
  const originalToken = process.env.MP_ACCESS_TOKEN;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MP_ACCESS_TOKEN = 'test-token-mp';
  });

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.MP_ACCESS_TOKEN;
    } else {
      process.env.MP_ACCESS_TOKEN = originalToken;
    }
  });

  it('retorna lista inalterada quando MP_ACCESS_TOKEN não está configurado ou não há pedidos elegíveis', async () => {
    delete process.env.MP_ACCESS_TOKEN;
    const baseOrders = [
      { id: 1, payment_status: 'pending', order_status: 'awaiting_payment', mp_payment_id: 'ORDTST1' },
    ];
    await expect(reconcilePendingOrders(baseOrders)).resolves.toEqual({
      orders: baseOrders,
      syncedCount: 0,
    });
    expect(fetchMercadoPagoPaymentDetails).not.toHaveBeenCalled();

    process.env.MP_ACCESS_TOKEN = 'test-token-mp';
    const ineligibleOrders = [
      { id: 2, payment_status: 'approved', order_status: 'paid', mp_payment_id: 'ORDTST2' },
      { id: 3, payment_status: 'pending', order_status: 'cancelled', mp_payment_id: 'ORDTST3' },
      { id: 4, payment_status: 'pending', order_status: 'awaiting_payment', mp_payment_id: 'mp_local_mock' },
      { id: 5, payment_status: 'pending', order_status: 'awaiting_payment', mp_payment_id: null },
    ];
    await expect(reconcilePendingOrders(ineligibleOrders)).resolves.toEqual({
      orders: ineligibleOrders,
      syncedCount: 0,
    });
    expect(fetchMercadoPagoPaymentDetails).not.toHaveBeenCalled();
  });

  it('sincroniza pedido pendente aprovado no Mercado Pago (ex.: Pedido #20) preservando os demais', async () => {
    const order20 = {
      id: 20,
      payment_status: 'pending',
      order_status: 'awaiting_payment',
      stock_restored: false,
      mp_payment_id: 'ORDTST01M7CT3ZAZKHHJXSER0A1GCTAR',
      payment_payload: {
        qr_code: '000201...',
        status_detail: 'waiting_transfer',
        mp_order_status: 'action_required',
      },
    };
    const approvedOrder = {
      id: 19,
      payment_status: 'approved',
      order_status: 'paid',
      mp_payment_id: 'ORDTST19',
    };

    fetchMercadoPagoPaymentDetails.mockResolvedValueOnce({
      paymentStatus: 'approved',
      rawStatus: 'processed',
      mpOrderStatus: 'processed',
      statusDetail: 'accredited',
      externalReference: '20',
      transactionId: 'PAY01M7CT3ZBCE8718PE0KR3DD7JR',
    });

    const syncedRow = {
      ...order20,
      payment_status: 'approved',
      order_status: 'paid',
      payment_payload: {
        qr_code: '000201...',
        status_detail: 'accredited',
        mp_order_status: 'processed',
        mp_transaction_id: 'PAY01M7CT3ZBCE8718PE0KR3DD7JR',
      },
    };
    syncOrderPaymentStatus.mockResolvedValueOnce(syncedRow);

    const result = await reconcilePendingOrders([order20, approvedOrder]);

    expect(fetchMercadoPagoPaymentDetails).toHaveBeenCalledTimes(1);
    expect(fetchMercadoPagoPaymentDetails).toHaveBeenCalledWith('ORDTST01M7CT3ZAZKHHJXSER0A1GCTAR');
    expect(syncOrderPaymentStatus).toHaveBeenCalledWith(20, {
      mpPaymentId: 'ORDTST01M7CT3ZAZKHHJXSER0A1GCTAR',
      paymentStatus: 'approved',
      paymentPayload: expect.objectContaining({
        status_detail: 'accredited',
        mp_order_status: 'processed',
        mp_transaction_id: 'PAY01M7CT3ZBCE8718PE0KR3DD7JR',
        last_sync_status: 'approved',
      }),
    });
    expect(result.syncedCount).toBe(1);
    expect(result.orders[0]).toMatchObject({
      id: 20,
      payment_status: 'approved',
      order_status: 'paid',
    });
    expect(result.orders[1]).toBe(approvedOrder);
    expect(invalidateCache).not.toHaveBeenCalled();
  });

  it('invalida cache de produtos ao restaurar estoque em recusa/cancelamento e ignora pedido sem alteração', async () => {
    const unchangedOrder = {
      id: 30,
      payment_status: 'pending',
      order_status: 'awaiting_payment',
      stock_restored: false,
      mp_payment_id: 'ORDTST30',
      payment_payload: { status_detail: 'waiting_transfer', mp_order_status: 'action_required' },
    };
    const rejectedOrder = {
      id: 31,
      payment_status: 'pending',
      order_status: 'awaiting_payment',
      stock_restored: false,
      mp_payment_id: 'ORDTST31',
      payment_payload: { status_detail: 'waiting_transfer', mp_order_status: 'action_required' },
    };

    fetchMercadoPagoPaymentDetails
      .mockResolvedValueOnce({
        paymentStatus: 'pending',
        mpOrderStatus: 'action_required',
        statusDetail: 'waiting_transfer',
      })
      .mockResolvedValueOnce({
        paymentStatus: 'rejected',
        mpOrderStatus: 'failed',
        statusDetail: 'expired',
      });

    syncOrderPaymentStatus.mockResolvedValueOnce({
      ...rejectedOrder,
      payment_status: 'rejected',
      order_status: 'cancelled',
      stock_restored: true,
    });

    const result = await reconcilePendingOrders([unchangedOrder, rejectedOrder]);

    expect(syncOrderPaymentStatus).toHaveBeenCalledTimes(1);
    expect(invalidateCache).toHaveBeenCalledWith('products:*');
    expect(result.syncedCount).toBe(1);
    expect(result.orders[0]).toBe(unchangedOrder);
    expect(result.orders[1].order_status).toBe('cancelled');
  });

  it('registra warning e respeita maxOrders sem interromper a listagem quando MP falha', async () => {
    const orders = [1, 2, 3].map((id) => ({
      id,
      payment_status: 'pending',
      order_status: 'awaiting_payment',
      mp_payment_id: `ORDTST_${id}`,
      payment_payload: { status_detail: 'waiting_transfer', mp_order_status: 'action_required' },
    }));

    fetchMercadoPagoPaymentDetails
      .mockRejectedValueOnce(new Error('MP timeout'))
      .mockResolvedValueOnce({
        paymentStatus: 'approved',
        mpOrderStatus: 'processed',
        statusDetail: 'accredited',
      });

    syncOrderPaymentStatus.mockResolvedValueOnce({
      ...orders[1],
      payment_status: 'approved',
      order_status: 'paid',
    });

    const result = await reconcilePendingOrders(orders, { maxOrders: 2 });

    expect(fetchMercadoPagoPaymentDetails).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      'MPReconcile',
      expect.stringContaining('pedido #1'),
      'MP timeout'
    );
    expect(result.syncedCount).toBe(1);
    expect(result.orders[1].payment_status).toBe('approved');
  });
});
