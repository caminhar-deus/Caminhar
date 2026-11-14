import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('../../../../lib/infra/db.js', () => ({
  query: jest.fn(),
  transaction: jest.fn(async (cb) => await cb({ mockClient: true })),
}));

import { query } from '../../../../lib/infra/db.js';
import {
  calculateShippingCost,
  createInternalOrder,
  attachOrderPaymentInfo,
  cancelFailedCheckoutOrder,
  getCustomerOrders,
  getAdminOrders,
  updateAdminOrder,
  processMercadoPagoWebhookEvent,
} from '../../../../lib/domain/orders.js';

describe('Domínio de Pedidos Internos — lib/domain/orders.js', () => {
  beforeEach(() => {
    query.mockReset();
  });

  describe('calculateShippingCost()', () => {
    it('deve retornar 0 para frete grátis ou produto indefinido', () => {
      expect(calculateShippingCost(null, 2)).toBe(0);
      expect(calculateShippingCost({ shipping_type: 'free', shipping_cost: 15 }, 3)).toBe(0);
      expect(calculateShippingCost({ shipping_type: 'unknown' }, 1)).toBe(0);
    });

    it('deve retornar valor fixo para shipping_type = fixed', () => {
      expect(calculateShippingCost({ shipping_type: 'fixed', shipping_cost: 18.5 }, 2)).toBe(18.5);
    });

    it('deve calcular frete escalonado para shipping_type = calculated', () => {
      expect(calculateShippingCost({ shipping_type: 'calculated', shipping_cost: 20 }, 1)).toBe(20);
      expect(calculateShippingCost({ shipping_type: 'calculated', shipping_cost: 20 }, 3)).toBe(29);
      expect(calculateShippingCost({ shipping_type: 'calculated', shipping_cost: 0 }, 1)).toBe(19.9);
    });
  });

  describe('createInternalOrder()', () => {
    it('deve reservar estoque e criar pedido interno com sucesso', async () => {
      query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 5,
              name: 'Terço São Bento',
              price: '45.00',
              modality: 'internal',
              stock: 10,
              shipping_type: 'fixed',
              shipping_cost: '10.00',
              published: true,
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 101,
              customer_id: 7,
              product_id: 5,
              product_name: 'Terço São Bento',
              unit_price: '45.00',
              quantity: 2,
              shipping_cost: '10.00',
              total_amount: '100.00',
              delivery_address: '{"cep":"01001-000"}',
              payment_method: 'pix',
              payment_status: 'pending',
              order_status: 'awaiting_payment',
            },
          ],
        });

      const order = await createInternalOrder({
        customerId: 7,
        productId: 5,
        quantity: 2,
        deliveryAddress: { cep: '01001-000' },
        paymentMethod: 'pix',
      });

      expect(order.id).toBe(101);
      expect(order.total_amount).toBe(100);
      expect(query).toHaveBeenCalledWith(
        'UPDATE products SET stock = stock - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [2, 5],
        expect.any(Object)
      );
    });

    it('deve rejeitar com PRODUCT_NOT_FOUND se o produto não existir ou não estiver publicado', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      await expect(
        createInternalOrder({
          customerId: 1,
          productId: 999,
          quantity: 1,
          deliveryAddress: {},
          paymentMethod: 'pix',
        })
      ).rejects.toThrow('PRODUCT_NOT_FOUND');
    });

    it('deve rejeitar com PRODUCT_NOT_INTERNAL quando o produto é de loja externa', async () => {
      query.mockResolvedValueOnce({
        rows: [{ id: 8, name: 'Externo', modality: 'external', stock: 10, published: true }],
      });

      await expect(
        createInternalOrder({
          customerId: 1,
          productId: 8,
          quantity: 1,
          deliveryAddress: {},
          paymentMethod: 'pix',
        })
      ).rejects.toThrow('PRODUCT_NOT_INTERNAL');
    });

    it('deve rejeitar com INSUFFICIENT_STOCK quando não há saldo suficiente', async () => {
      query.mockResolvedValueOnce({
        rows: [{ id: 5, name: 'Terço', modality: 'internal', stock: 1, published: true }],
      });

      await expect(
        createInternalOrder({
          customerId: 1,
          productId: 5,
          quantity: 3,
          deliveryAddress: {},
          paymentMethod: 'pix',
        })
      ).rejects.toThrow('INSUFFICIENT_STOCK');
    });
  });

  describe('attachOrderPaymentInfo()', () => {
    it('deve atualizar pedido com status pending quando pagamento não é aprovado de imediato', async () => {
      query.mockResolvedValueOnce({
        rows: [
          {
            id: 10,
            unit_price: '50.00',
            shipping_cost: '10.00',
            total_amount: '60.00',
            mp_payment_id: 'mp_123',
            payment_status: 'pending',
            order_status: 'awaiting_payment',
            payment_payload: JSON.stringify({ qr_code: 'abc' }),
          },
        ],
      });

      const order = await attachOrderPaymentInfo(10, {
        mpPaymentId: 'mp_123',
        mpPreferenceId: null,
        paymentStatus: 'pending',
        paymentPayload: { qr_code: 'abc' },
      });

      expect(order.mp_payment_id).toBe('mp_123');
      expect(order.order_status).toBe('awaiting_payment');
      expect(order.payment_payload).toEqual({ qr_code: 'abc' });
    });

    it('deve atualizar pedido para paid quando pagamento for aprovado', async () => {
      query.mockResolvedValueOnce({
        rows: [
          {
            id: 11,
            unit_price: '50.00',
            shipping_cost: '0.00',
            total_amount: '50.00',
            mp_payment_id: 'mp_card_99',
            payment_status: 'approved',
            order_status: 'paid',
          },
        ],
      });

      const order = await attachOrderPaymentInfo(11, {
        mpPaymentId: 'mp_card_99',
        paymentStatus: 'approved',
      });

      expect(order.order_status).toBe('paid');
    });
  });

  describe('getCustomerOrders()', () => {
    it('deve listar os pedidos do cliente formatados', async () => {
      query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            product_id: 5,
            product_name: 'Bíblia',
            unit_price: '100.00',
            shipping_cost: '15.00',
            total_amount: '115.00',
            product_image_url: 'https://img.com/biblia.jpg',
            delivery_address: JSON.stringify({ cep: '01001-000' }),
          },
        ],
      });

      const orders = await getCustomerOrders(7);
      expect(orders).toHaveLength(1);
      expect(orders[0].formatted_total_amount).toContain('115');
      expect(orders[0].delivery_address.cep).toBe('01001-000');
    });
  });

  describe('getAdminOrders()', () => {
    it('deve listar pedidos com paginação e múltiplos filtros', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ count: '25' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              product_name: 'Terço',
              unit_price: '30.00',
              shipping_cost: '5.00',
              total_amount: '35.00',
              customer_name: 'Maria',
              customer_email: 'maria@test.com',
            },
          ],
        });

      const result = await getAdminOrders({
        page: 1,
        limit: 10,
        search: 'Maria',
        paymentStatus: 'paid',
        orderStatus: 'preparing',
        paymentMethod: 'pix',
      });

      expect(result.pagination.total).toBe(25);
      expect(result.pagination.totalPages).toBe(3);
      expect(result.data).toHaveLength(1);
    });

    it('deve listar pedidos com defaults e tratar JSON inválido no endereço/payload', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              product_name: 'Vela',
              unit_price: '20.00',
              shipping_cost: '0.00',
              total_amount: '20.00',
              delivery_address: 'invalid-json-string',
              payment_payload: 'invalid-json-payload',
            },
          ],
        });

      const result = await getAdminOrders();
      expect(result.pagination.total).toBe(1);
      expect(result.data[0].delivery_address).toEqual({});
      expect(result.data[0].payment_payload).toBeNull();
    });
  });

  describe('updateAdminOrder()', () => {
    it('deve preservar status e rastreio atuais se não informados', async () => {
      query
        .mockResolvedValueOnce({
          rows: [{ id: 8, product_id: 1, quantity: 1, order_status: 'paid', tracking_code: 'TRK123' }],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 8,
              product_id: 1,
              unit_price: '10.00',
              total_amount: '10.00',
              order_status: 'paid',
              tracking_code: 'TRK123',
            },
          ],
        });

      const updated = await updateAdminOrder(8, {});
      expect(updated.order_status).toBe('paid');
      expect(updated.tracking_code).toBe('TRK123');
    });
    it('deve retornar null se o pedido não for encontrado', async () => {
      query.mockResolvedValueOnce({ rows: [] });
      const res = await updateAdminOrder(999, { orderStatus: 'shipped' });
      expect(res).toBeNull();
    });

    it('deve atualizar status logístico e código de rastreio', async () => {
      query
        .mockResolvedValueOnce({
          rows: [{ id: 10, product_id: 5, quantity: 1, order_status: 'paid', tracking_code: null }],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 10,
              product_id: 5,
              unit_price: '50.00',
              shipping_cost: '0.00',
              total_amount: '50.00',
              order_status: 'shipped',
              tracking_code: 'BR123456789',
            },
          ],
        });

      const updated = await updateAdminOrder(10, {
        orderStatus: 'shipped',
        trackingCode: 'BR123456789',
      });

      expect(updated.order_status).toBe('shipped');
      expect(updated.tracking_code).toBe('BR123456789');
    });

    it('deve devolver estoque ao cancelar pedido em updateAdminOrder', async () => {
      query
        .mockResolvedValueOnce({
          rows: [{ id: 101, product_id: 5, quantity: 2, order_status: 'awaiting_payment', tracking_code: null }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 101,
              product_id: 5,
              quantity: 2,
              unit_price: '45.00',
              shipping_cost: '0.00',
              total_amount: '90.00',
              order_status: 'cancelled',
              tracking_code: null,
            },
          ],
        });

      const updated = await updateAdminOrder(101, { orderStatus: 'cancelled' });
      expect(updated.order_status).toBe('cancelled');
      expect(query).toHaveBeenCalledWith(
        'UPDATE products SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [2, 5],
        expect.any(Object)
      );
    });
  });

  describe('processMercadoPagoWebhookEvent()', () => {
    it('deve ignorar evento duplicado no webhook do Mercado Pago (idempotência)', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await processMercadoPagoWebhookEvent({
        eventId: 'evt_dup_1',
        mpPaymentId: 'mp_123',
        paymentStatus: 'approved',
      });

      expect(res).toEqual({ duplicate: true, order: null });
    });

    it('deve retornar duplicate false e order null se mpPaymentId estiver ausente', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const res = await processMercadoPagoWebhookEvent({
        eventId: 'evt_no_payment',
        mpPaymentId: null,
      });

      expect(res).toEqual({ duplicate: false, order: null });
    });

    it('deve retornar duplicate false e order null se pedido com mpPaymentId não for encontrado', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Insert webhook event
        .mockResolvedValueOnce({ rows: [] }); // Select order by mp_payment_id

      const res = await processMercadoPagoWebhookEvent({
        eventId: 'evt_order_not_found',
        mpPaymentId: 'mp_not_found',
        paymentStatus: 'approved',
      });

      expect(res).toEqual({ duplicate: false, order: null });
    });

    it('deve aprovar pedido quando status for approved e transitar para paid', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Insert webhook event
        .mockResolvedValueOnce({
          rows: [{ id: 50, product_id: 2, quantity: 1, order_status: 'awaiting_payment' }],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 50,
              product_id: 2,
              unit_price: '80.00',
              shipping_cost: '0.00',
              total_amount: '80.00',
              order_status: 'paid',
              payment_status: 'approved',
            },
          ],
        });

      const res = await processMercadoPagoWebhookEvent({
        eventId: 'evt_approved_1',
        mpPaymentId: 'mp_ok',
        paymentStatus: 'approved',
      });

      expect(res.duplicate).toBe(false);
      expect(res.order.order_status).toBe('paid');
      expect(res.order.payment_status).toBe('approved');
    });

    it('deve devolver estoque quando status for rejected e pedido for cancelado', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Webhook event
        .mockResolvedValueOnce({
          rows: [{ id: 51, product_id: 2, quantity: 2, order_status: 'awaiting_payment' }],
        })
        .mockResolvedValueOnce({ rows: [] }) // Restore stock
        .mockResolvedValueOnce({
          rows: [
            {
              id: 51,
              product_id: 2,
              unit_price: '80.00',
              shipping_cost: '0.00',
              total_amount: '160.00',
              order_status: 'cancelled',
              payment_status: 'rejected',
            },
          ],
        });

      const res = await processMercadoPagoWebhookEvent({
        eventId: 'evt_rejected_1',
        mpPaymentId: 'mp_rejected',
        paymentStatus: 'rejected',
      });

      expect(res.duplicate).toBe(false);
      expect(res.order.order_status).toBe('cancelled');
      expect(query).toHaveBeenCalledWith(
        'UPDATE products SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [2, 2],
        expect.any(Object)
      );
    });

    it('não deve duplicar devolução de estoque se stock_restored já for true nem rebaixar pedido aprovado', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ id: 2 }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 52,
              product_id: 2,
              quantity: 2,
              order_status: 'paid',
              payment_status: 'approved',
              stock_restored: false,
              mp_payload: JSON.stringify({ qr_code: 'abc' }),
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 52,
              product_id: 2,
              unit_price: '80.00',
              shipping_cost: '0.00',
              total_amount: '160.00',
              order_status: 'paid',
              payment_status: 'approved',
              stock_restored: false,
            },
          ],
        });

      const stalePending = await processMercadoPagoWebhookEvent({
        eventId: 'evt_stale_pending',
        mpPaymentId: 'mp_52',
        paymentStatus: 'pending',
      });
      expect(stalePending.order.payment_status).toBe('approved');
      expect(stalePending.order.order_status).toBe('paid');

      query.mockClear();
      query
        .mockResolvedValueOnce({ rows: [{ id: 3 }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 53,
              product_id: 2,
              quantity: 2,
              order_status: 'awaiting_payment',
              payment_status: 'pending',
              stock_restored: true,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 53,
              product_id: 2,
              unit_price: '80.00',
              shipping_cost: '0.00',
              total_amount: '160.00',
              order_status: 'cancelled',
              payment_status: 'cancelled',
              stock_restored: true,
            },
          ],
        });

      await processMercadoPagoWebhookEvent({
        eventId: 'evt_cancel_already_restored',
        mpPaymentId: 'mp_53',
        paymentStatus: 'cancelled',
      });

      expect(query).not.toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE products SET stock = stock \+/i),
        expect.anything(),
        expect.anything()
      );
    });
  });

  describe('recusa imediata e rollback de falha de checkout', () => {
    it('attachOrderPaymentInfo deve cancelar e devolver estoque quando status inicial já for rejected', async () => {
      query
        .mockResolvedValueOnce({
          rows: [{ id: 60, product_id: 7, quantity: 3, stock_restored: false }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 60,
              unit_price: '50.00',
              shipping_cost: '0.00',
              total_amount: '150.00',
              order_status: 'cancelled',
              payment_status: 'rejected',
              stock_restored: true,
            },
          ],
        });

      const res = await attachOrderPaymentInfo(60, {
        mpPaymentId: '991',
        paymentStatus: 'rejected',
        paymentPayload: { status_detail: 'cc_rejected_insufficient_amount' },
      });

      expect(res.order_status).toBe('cancelled');
      expect(res.stock_restored).toBe(true);
      expect(query).toHaveBeenCalledWith(
        'UPDATE products SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [3, 7],
        expect.any(Object)
      );
    });

    it('cancelFailedCheckoutOrder deve cancelar pedido órfão e devolver estoque', async () => {
      query
        .mockResolvedValueOnce({
          rows: [{ id: 61, product_id: 8, quantity: 1, order_status: 'awaiting_payment', stock_restored: false }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 61,
              unit_price: '40.00',
              shipping_cost: '0.00',
              total_amount: '40.00',
              order_status: 'cancelled',
              payment_status: 'cancelled',
              stock_restored: true,
            },
          ],
        });

      const res = await cancelFailedCheckoutOrder(61, 'Timeout Mercado Pago');
      expect(res.order_status).toBe('cancelled');
      expect(res.stock_restored).toBe(true);
    });
  });
});
