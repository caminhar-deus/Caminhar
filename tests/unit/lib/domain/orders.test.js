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
  expireAbandonedOrders,
  getCustomerOrders,
  getCustomerOrderById,
  getAdminOrderById,
  getAdminOrders,
  updateAdminOrder,
  syncOrderPaymentStatus,
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
        rows: [{ id: 5, name: 'Terço', price: '10.00', modality: 'internal', stock: 1, published: true }],
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

    it('deve rejeitar com BELOW_MIN_PAYMENT_AMOUNT quando total ficar abaixo do mínimo do meio escolhido', async () => {
      query.mockResolvedValueOnce({
        rows: [{ id: 5, name: 'Botton', price: '0.10', modality: 'internal', stock: 10, shipping_type: 'free', published: true }],
      });

      await expect(
        createInternalOrder({
          customerId: 1,
          productId: 5,
          quantity: 1,
          deliveryAddress: {},
          paymentMethod: 'credit_card',
        })
      ).rejects.toThrow('BELOW_MIN_PAYMENT_AMOUNT');
      expect(query).toHaveBeenCalledTimes(1);
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

  describe('getCustomerOrderById()', () => {
    it('normaliza payment_payload.ticket_url salvo como /staging/payments/ para /sandbox/payments/', async () => {
      const stagingUrl =
        'https://www.mercadopago.com.br/staging/payments/189650364540/ticket?caller_id=3845624858&hash=57246646';
      const expectedSandboxUrl =
        'https://www.mercadopago.com.br/sandbox/payments/189650364540/ticket?caller_id=3845624858&hash=57246646';

      query.mockResolvedValueOnce({
        rows: [
          {
            id: 21,
            customer_id: 9,
            product_id: 19,
            product_name: 'Livro Teste',
            unit_price: '4.00',
            shipping_cost: '0.00',
            total_amount: '4.00',
            payment_method: 'ticket',
            payment_status: 'pending',
            order_status: 'awaiting_payment',
            payment_payload: JSON.stringify({
              ticket_url: stagingUrl,
              digitable_line: '23793380296060108770738006333306316330000000400',
            }),
          },
        ],
      });

      const order = await getCustomerOrderById(21, 9);
      expect(order).not.toBeNull();
      expect(order.payment_payload.ticket_url).toBe(expectedSandboxUrl);
      expect(order.payment_payload.digitable_line).toBe(
        '23793380296060108770738006333306316330000000400'
      );
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
        paymentStatus: 'approved',
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

    it('deve impedir reabertura de pedido já cancelado (ORDER_CANCELLED_CANNOT_REOPEN)', async () => {
      query.mockResolvedValueOnce({
        rows: [{ id: 102, product_id: 5, quantity: 2, order_status: 'cancelled', stock_restored: true }],
      });

      await expect(updateAdminOrder(102, { orderStatus: 'paid' })).rejects.toThrow(
        'ORDER_CANCELLED_CANNOT_REOPEN'
      );
    });
  });

  describe('processMercadoPagoWebhookEvent()', () => {
    it('deve ignorar evento duplicado no webhook do Mercado Pago (idempotência)', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ id: 50, product_id: 2, quantity: 1, order_status: 'awaiting_payment' }] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await processMercadoPagoWebhookEvent({
        eventId: 'evt_dup_1',
        mpPaymentId: 'mp_123',
        paymentStatus: 'approved',
      });

      expect(res).toEqual({ duplicate: true, order: null, stockChanged: false });
    });

    it('deve retornar duplicate false e order null se mpPaymentId estiver ausente', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const res = await processMercadoPagoWebhookEvent({
        eventId: 'evt_no_payment',
        mpPaymentId: null,
      });

      expect(res).toEqual({ duplicate: false, order: null, stockChanged: false });
    });

    it('deve retornar orderNotFound true sem inserir event_key se pedido com mpPaymentId não for encontrado', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await processMercadoPagoWebhookEvent({
        eventId: 'evt_order_not_found',
        mpPaymentId: 'mp_not_found',
        paymentStatus: 'approved',
      });

      expect(res).toEqual({
        duplicate: false,
        order: null,
        orderNotFound: true,
        stockChanged: false,
      });
      expect(query).toHaveBeenCalledTimes(1);
    });

    it('deve aprovar pedido quando status for approved e transitar para paid', async () => {
      query
        .mockResolvedValueOnce({
          rows: [{ id: 50, product_id: 2, quantity: 1, order_status: 'awaiting_payment' }],
        })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Insert webhook event
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
      expect(res.stockChanged).toBe(false);
      expect(res.order.order_status).toBe('paid');
      expect(res.order.payment_status).toBe('approved');
    });

    it('deve devolver estoque quando status for rejected e pedido for cancelado', async () => {
      query
        .mockResolvedValueOnce({
          rows: [{ id: 51, product_id: 2, quantity: 2, order_status: 'awaiting_payment' }],
        })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Webhook event
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
              stock_restored: true,
            },
          ],
        });

      const res = await processMercadoPagoWebhookEvent({
        eventId: 'evt_rejected_1',
        mpPaymentId: 'mp_rejected',
        paymentStatus: 'rejected',
      });

      expect(res.duplicate).toBe(false);
      expect(res.stockChanged).toBe(true);
      expect(res.order.order_status).toBe('cancelled');
      expect(query).toHaveBeenCalledWith(
        'UPDATE products SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [2, 2],
        expect.any(Object)
      );
    });

    it('não deve duplicar devolução de estoque se stock_restored já for true nem rebaixar pedido aprovado ou refunded/charged_back', async () => {
      query
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
        .mockResolvedValueOnce({ rows: [{ id: 2 }] })
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

      // Proteção de refunded/charged_back contra downgrade tardio por approved/pending
      query.mockClear();
      query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 54,
              product_id: 2,
              quantity: 1,
              order_status: 'cancelled',
              payment_status: 'refunded',
              stock_restored: true,
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ id: 4 }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 54,
              product_id: 2,
              unit_price: '50.00',
              shipping_cost: '0.00',
              total_amount: '50.00',
              order_status: 'cancelled',
              payment_status: 'refunded',
              stock_restored: true,
            },
          ],
        });
      const staleAfterRefund = await processMercadoPagoWebhookEvent({
        eventId: 'evt_stale_after_refund',
        mpPaymentId: 'mp_54',
        paymentStatus: 'approved',
      });
      expect(staleAfterRefund.order.payment_status).toBe('refunded');
      expect(staleAfterRefund.order.order_status).toBe('cancelled');

      query.mockClear();
      query
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
        .mockResolvedValueOnce({ rows: [{ id: 3 }] })
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

    it('trata aprovação tardia sobre pedido cancelado: re-reserva quando há estoque e sinaliza needs_manual_refund quando falta estoque', async () => {
      // Cenário A: há estoque -> recupera pedido para paid e stockChanged = true
      query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 55,
              product_id: 9,
              quantity: 2,
              order_status: 'cancelled',
              payment_status: 'cancelled',
              stock_restored: true,
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ id: 10 }] })
        .mockResolvedValueOnce({ rows: [{ stock: 3 }] }) // Re-reserva atômica com sucesso
        .mockResolvedValueOnce({
          rows: [
            {
              id: 55,
              product_id: 9,
              unit_price: '40.00',
              shipping_cost: '0.00',
              total_amount: '80.00',
              order_status: 'paid',
              payment_status: 'approved',
              stock_restored: false,
              mp_payload: JSON.stringify({ late_approval_recovered: true }),
            },
          ],
        });

      const recovered = await processMercadoPagoWebhookEvent({
        eventId: 'evt_late_ok',
        mpPaymentId: 'mp_55',
        paymentStatus: 'approved',
      });
      expect(recovered.stockChanged).toBe(true);
      expect(recovered.order.order_status).toBe('paid');
      expect(recovered.order.stock_restored).toBe(false);

      // Cenário B: sem estoque -> mantém cancelled e grava needs_manual_refund
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      try {
        query.mockClear();
        query
          .mockResolvedValueOnce({
            rows: [
              {
                id: 56,
                product_id: 9,
                quantity: 5,
                order_status: 'cancelled',
                payment_status: 'cancelled',
                stock_restored: true,
              },
            ],
          })
          .mockResolvedValueOnce({ rows: [{ id: 11 }] })
          .mockResolvedValueOnce({ rows: [] }) // Estoque insuficiente
          .mockResolvedValueOnce({
            rows: [
              {
                id: 56,
                product_id: 9,
                unit_price: '40.00',
                shipping_cost: '0.00',
                total_amount: '200.00',
                order_status: 'cancelled',
                payment_status: 'approved',
                stock_restored: true,
                mp_payload: JSON.stringify({ needs_manual_refund: true }),
              },
            ],
          });

        const manualRefund = await processMercadoPagoWebhookEvent({
          eventId: 'evt_late_nostock',
          mpPaymentId: 'mp_56',
          paymentStatus: 'approved',
        });
        expect(manualRefund.stockChanged).toBe(false);
        expect(manualRefund.order.order_status).toBe('cancelled');
        expect(manualRefund.order.payment_payload.needs_manual_refund).toBe(true);
        expect(errSpy).toHaveBeenCalled();
      } finally {
        errSpy.mockRestore();
      }
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

  describe('getCustomerOrderById(), syncOrderPaymentStatus() e fallback por externalReference', () => {
    it('getCustomerOrderById deve buscar pedido único do cliente autenticado e formatar valores', async () => {
      query.mockResolvedValueOnce({
        rows: [
          {
            id: 20,
            customer_id: 1,
            product_id: 19,
            product_name: 'Livro Teste',
            quantity: 1,
            unit_price: '0.01',
            shipping_cost: '0.00',
            total_amount: '0.01',
            payment_status: 'pending',
            order_status: 'awaiting_payment',
            mp_payment_id: 'ORDTST01M7CT3ZAZKHHJXSER0A1GCTAR',
            mp_payload: JSON.stringify({ qr_code: 'pix-code', status_detail: 'waiting_transfer' }),
          },
        ],
      });

      const order = await getCustomerOrderById(20, 1);
      expect(query).toHaveBeenCalledWith(
        expect.stringMatching(/WHERE o\.id = \$1 AND o\.customer_id = \$2/i),
        [20, 1]
      );
      expect(order).toMatchObject({
        id: 20,
        total_amount: 0.01,
        payment_payload: { qr_code: 'pix-code', status_detail: 'waiting_transfer' },
      });

      query.mockResolvedValueOnce({ rows: [] });
      await expect(getCustomerOrderById(999, 1)).resolves.toBeNull();
    });

    it('syncOrderPaymentStatus aprova pedido pendente preservando qr_code e atualizando metadados', async () => {
      query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 20,
              product_id: 19,
              quantity: 1,
              unit_price: '0.01',
              shipping_cost: '0.00',
              total_amount: '0.01',
              payment_status: 'pending',
              order_status: 'awaiting_payment',
              stock_restored: false,
              mp_payment_id: 'ORDTST01M7CT3ZAZKHHJXSER0A1GCTAR',
              mp_payload: JSON.stringify({
                qr_code: '000201...',
                status_detail: 'waiting_transfer',
              }),
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 20,
              unit_price: '0.01',
              shipping_cost: '0.00',
              total_amount: '0.01',
              payment_status: 'approved',
              order_status: 'paid',
              stock_restored: false,
              mp_payment_id: 'ORDTST01M7CT3ZAZKHHJXSER0A1GCTAR',
              mp_payload: JSON.stringify({
                qr_code: '000201...',
                status_detail: 'accredited',
                mp_order_status: 'processed',
                mp_transaction_id: 'PAY01M7CT3ZBCE8718PE0KR3DD7JR',
              }),
            },
          ],
        });

      const updated = await syncOrderPaymentStatus(20, {
        mpPaymentId: 'ORDTST01M7CT3ZAZKHHJXSER0A1GCTAR',
        paymentStatus: 'approved',
        paymentPayload: {
          status_detail: 'accredited',
          mp_order_status: 'processed',
          mp_transaction_id: 'PAY01M7CT3ZBCE8718PE0KR3DD7JR',
        },
      });

      expect(updated.payment_status).toBe('approved');
      expect(updated.order_status).toBe('paid');
      expect(updated.payment_payload).toMatchObject({
        qr_code: '000201...',
        status_detail: 'accredited',
        mp_order_status: 'processed',
        mp_transaction_id: 'PAY01M7CT3ZBCE8718PE0KR3DD7JR',
      });

      const updateArgs = query.mock.calls[1][1];
      expect(JSON.parse(updateArgs[3])).toMatchObject({
        qr_code: '000201...',
        status_detail: 'accredited',
      });
    });

    it('syncOrderPaymentStatus recusa atualização com mpPaymentId divergente e impede downgrade de rejected para pending', async () => {
      query.mockResolvedValueOnce({
        rows: [
          {
            id: 20,
            mp_payment_id: 'ORDTST_A',
            payment_status: 'pending',
            order_status: 'awaiting_payment',
          },
        ],
      });

      await expect(
        syncOrderPaymentStatus(20, { mpPaymentId: 'ORDTST_B', paymentStatus: 'approved' })
      ).resolves.toBeNull();
      expect(query).toHaveBeenCalledTimes(1);

      query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 21,
              product_id: 5,
              quantity: 1,
              unit_price: '10.00',
              shipping_cost: '0.00',
              total_amount: '10.00',
              mp_payment_id: 'ORDTST_21',
              payment_status: 'rejected',
              order_status: 'cancelled',
              stock_restored: true,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 21,
              unit_price: '10.00',
              shipping_cost: '0.00',
              total_amount: '10.00',
              mp_payment_id: 'ORDTST_21',
              payment_status: 'rejected',
              order_status: 'cancelled',
              stock_restored: true,
            },
          ],
        });

      const res = await syncOrderPaymentStatus(21, {
        mpPaymentId: 'ORDTST_21',
        paymentStatus: 'pending',
      });
      expect(res.payment_status).toBe('rejected');
      expect(res.order_status).toBe('cancelled');
    });

    it('processMercadoPagoWebhookEvent usa fallback por externalReference quando mp_payment_id ainda não foi gravado e bloqueia conflito de id', async () => {
      query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 20,
              product_id: 19,
              quantity: 1,
              unit_price: '0.01',
              shipping_cost: '0.00',
              total_amount: '0.01',
              payment_status: 'pending',
              order_status: 'awaiting_payment',
              stock_restored: false,
              mp_payment_id: null,
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 20,
              unit_price: '0.01',
              shipping_cost: '0.00',
              total_amount: '0.01',
              payment_status: 'approved',
              order_status: 'paid',
              stock_restored: false,
              mp_payment_id: 'ORDTST01M7CT3ZAZKHHJXSER0A1GCTAR',
            },
          ],
        });

      const okRes = await processMercadoPagoWebhookEvent({
        eventId: 'evt_ext_ref_20',
        eventType: 'order',
        mpPaymentId: 'ORDTST01M7CT3ZAZKHHJXSER0A1GCTAR',
        externalReference: '20',
        paymentStatus: 'approved',
        paymentPayload: { status_detail: 'accredited', mp_order_status: 'processed' },
      });

      expect(okRes.duplicate).toBe(false);
      expect(okRes.order.payment_status).toBe('approved');
      expect(okRes.order.order_status).toBe('paid');

      query.mockReset();
      query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 20,
              mp_payment_id: 'ORDTST_OUTRO_ID',
              payment_status: 'pending',
              order_status: 'awaiting_payment',
            },
          ],
        });

      const mismatchRes = await processMercadoPagoWebhookEvent({
        eventId: 'evt_ext_ref_mismatch',
        eventType: 'order',
        mpPaymentId: 'ORDTST_NOVO',
        externalReference: '20',
        paymentStatus: 'approved',
      });

      expect(mismatchRes).toEqual({
        duplicate: false,
        order: null,
        orderNotFound: true,
        stockChanged: false,
      });
    });
  });

  describe('getAdminOrderById(), estorno em updateAdminOrder() e expireAbandonedOrders()', () => {
    it('getAdminOrderById retorna pedido formatado ou null', async () => {
      query.mockResolvedValueOnce({
        rows: [
          {
            id: 40,
            unit_price: '25.00',
            shipping_cost: '5.00',
            total_amount: '30.00',
            customer_name: 'Maria',
            mp_payment_id: 'ORD_40',
          },
        ],
      });
      const found = await getAdminOrderById(40);
      expect(found.id).toBe(40);
      expect(found.total_amount).toBe(30);

      query.mockResolvedValueOnce({ rows: [] });
      await expect(getAdminOrderById(999)).resolves.toBeNull();
    });

    it('updateAdminOrder consolida estorno via API (payment_status=refunded, devolve estoque e limpa needs_manual_refund) e sinaliza estorno manual quando cancelado sem API', async () => {
      query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 71,
              product_id: 5,
              quantity: 2,
              payment_status: 'approved',
              order_status: 'paid',
              stock_restored: false,
              mp_payload: JSON.stringify({ needs_manual_refund: true, qr_code: 'pix-1' }),
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }) // restore stock
        .mockResolvedValueOnce({
          rows: [
            {
              id: 71,
              product_id: 5,
              quantity: 2,
              unit_price: '20.00',
              shipping_cost: '0.00',
              total_amount: '40.00',
              payment_status: 'refunded',
              order_status: 'cancelled',
              stock_restored: true,
              mp_payload: JSON.stringify({
                qr_code: 'pix-1',
                needs_manual_refund: false,
                refund_mode: 'live',
              }),
            },
          ],
        });

      const refunded = await updateAdminOrder(71, {
        orderStatus: 'cancelled',
        refundResult: {
          refundMode: 'live',
          mpOrderStatus: 'refunded',
          statusDetail: 'refunded',
          refundedBy: 'admin_user',
          mpTransactionId: 'PAY_71',
        },
      });
      expect(refunded.payment_status).toBe('refunded');
      expect(refunded.order_status).toBe('cancelled');
      expect(refunded.stock_restored).toBe(true);
      expect(query).toHaveBeenCalledWith(
        'UPDATE products SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [2, 5],
        expect.any(Object)
      );

      // Cancelamento manual de pedido aprovado sem refundResult marca needs_manual_refund: true
      query.mockReset();
      query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 72,
              product_id: 5,
              quantity: 1,
              payment_status: 'approved',
              order_status: 'paid',
              stock_restored: false,
              mp_payload: null,
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 72,
              unit_price: '20.00',
              shipping_cost: '0.00',
              total_amount: '20.00',
              payment_status: 'approved',
              order_status: 'cancelled',
              stock_restored: true,
              mp_payload: JSON.stringify({
                needs_manual_refund: true,
                manual_refund_reason: 'admin_cancelled_without_api_refund',
              }),
            },
          ],
        });

      const manualCancel = await updateAdminOrder(72, { orderStatus: 'cancelled' });
      expect(manualCancel.payment_payload.needs_manual_refund).toBe(true);
    });

    it('expireAbandonedOrders respeita dryRun, date_of_expiration, TTL por modalidade, reconciliação prévia (approved não cancela) e falhas de rede fail-safe', async () => {
      const now = new Date('2026-11-26T20:00:00Z');
      const candidates = [
        {
          id: 1,
          product_id: 10,
          quantity: 1,
          payment_method: 'pix',
          payment_status: 'pending',
          order_status: 'awaiting_payment',
          stock_restored: false,
          mp_payment_id: 'mp_pix_old',
          mp_payload: null,
          created_at: '2026-11-25T10:00:00Z', // > 24h
        },
        {
          id: 2,
          product_id: 10,
          quantity: 1,
          payment_method: 'pix',
          payment_status: 'pending',
          order_status: 'awaiting_payment',
          stock_restored: false,
          mp_payment_id: 'ORD_RECENT',
          mp_payload: null,
          created_at: '2026-11-26T18:00:00Z', // 2h atrás (< 24h, não expira)
        },
        {
          id: 3,
          product_id: 10,
          quantity: 2,
          payment_method: 'ticket',
          payment_status: 'pending',
          order_status: 'awaiting_payment',
          stock_restored: false,
          mp_payment_id: 'ORD_PAID_LATE',
          mp_payload: JSON.stringify({ date_of_expiration: '2026-11-26T12:00:00Z' }),
          created_at: '2026-11-26T10:00:00Z',
        },
        {
          id: 4,
          product_id: 10,
          quantity: 1,
          payment_method: 'pix',
          payment_status: 'pending',
          order_status: 'awaiting_payment',
          stock_restored: false,
          mp_payment_id: 'ORD_MP_FAIL',
          mp_payload: null,
          created_at: '2026-11-24T10:00:00Z',
        },
      ];

      // 1) Dry-run apenas contabiliza os 3 vencidos sem mutar nem chamar reconcile
      query.mockResolvedValueOnce({ rows: candidates });
      const drySummary = await expireAbandonedOrders({ now, dryRun: true });
      expect(drySummary).toMatchObject({
        dryRun: true,
        checkedCount: 4,
        expiredCount: 3,
        expiredOrderIds: [1, 3, 4],
      });

      // 2) Execução real: pedido 1 expira (restaura estoque), pedido 2 fica intacto,
      // pedido 3 reconcilia para 'approved' em vez de cancelar, pedido 4 falha consulta MP e não cancela
      query
        .mockResolvedValueOnce({ rows: candidates })
        // tx cancelamento pedido 1
        .mockResolvedValueOnce({ rows: [candidates[0]] })
        .mockResolvedValueOnce({ rows: [] }) // restore stock
        .mockResolvedValueOnce({ rows: [] }) // update order
        // tx syncOrderPaymentStatus pedido 3 -> FOR UPDATE + UPDATE
        .mockResolvedValueOnce({ rows: [candidates[2]] })
        .mockResolvedValueOnce({
          rows: [
            {
              ...candidates[2],
              unit_price: '10.00',
              shipping_cost: '0.00',
              total_amount: '20.00',
              payment_status: 'approved',
              order_status: 'paid',
            },
          ],
        });

      const reconcilePayment = jest.fn(async (mpId) => {
        if (mpId === 'ORD_PAID_LATE') {
          return { paymentStatus: 'approved', statusDetail: 'accredited', mpOrderStatus: 'processed' };
        }
        throw new Error('MP temporary timeout');
      });

      const realSummary = await expireAbandonedOrders({ now, reconcilePayment });
      expect(realSummary).toMatchObject({
        dryRun: false,
        checkedCount: 4,
        expiredCount: 1,
        reconciledToPaidCount: 1,
        skippedCount: 0,
        errorCount: 1,
        expiredOrderIds: [1],
        reconciledOrderIds: [3],
      });
      expect(query).toHaveBeenCalledWith(
        'UPDATE products SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [1, 10],
        expect.any(Object)
      );
    });
  });
});
