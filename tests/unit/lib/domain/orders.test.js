import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('../../../../lib/infra/db.js', () => ({
  query: jest.fn(),
  transaction: jest.fn(async (cb) => await cb({ mockClient: true })),
}));

import { query } from '../../../../lib/infra/db.js';
import {
  calculateShippingCost,
  createInternalOrder,
  updateAdminOrder,
  processMercadoPagoWebhookEvent,
} from '../../../../lib/domain/orders.js';

describe('Domínio de Pedidos Internos — lib/domain/orders.js', () => {
  beforeEach(() => {
    query.mockReset();
  });

  describe('calculateShippingCost()', () => {
    it('deve retornar 0 para frete grátis', () => {
      expect(calculateShippingCost({ shipping_type: 'free', shipping_cost: 15 }, 3)).toBe(0);
    });

    it('deve retornar valor fixo para shipping_type = fixed', () => {
      expect(calculateShippingCost({ shipping_type: 'fixed', shipping_cost: 18.5 }, 2)).toBe(18.5);
    });

    it('deve calcular frete escalonado para shipping_type = calculated', () => {
      expect(calculateShippingCost({ shipping_type: 'calculated', shipping_cost: 20 }, 1)).toBe(20);
      expect(calculateShippingCost({ shipping_type: 'calculated', shipping_cost: 20 }, 3)).toBe(29);
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

  describe('updateAdminOrder() e processMercadoPagoWebhookEvent()', () => {
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

    it('deve ignorar evento duplicado no webhook do Mercado Pago (idempotência)', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const res = await processMercadoPagoWebhookEvent({
        eventId: 'evt_dup_1',
        mpPaymentId: 'mp_123',
        paymentStatus: 'approved',
      });

      expect(res).toEqual({ duplicate: true, order: null });
    });
  });
});
