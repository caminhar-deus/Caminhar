import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

jest.mock('../../../lib/infra/db.js', () => require('../../mocks/db-module').mockDb());

jest.mock('../../../lib/cache/cache.js', () => ({
  checkRateLimit: jest.fn().mockResolvedValue(false),
  invalidateCache: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../../lib/auth/customer-auth.js', () => ({
  getAuthenticatedCustomer: jest.fn(),
}));

jest.mock('../../../lib/domain/customers.js', () => ({
  getCustomerById: jest.fn(),
  updateCustomerProfile: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../../lib/domain/orders.js', () => ({
  createInternalOrder: jest.fn(),
  attachOrderPaymentInfo: jest.fn(),
  calculateShippingCost: jest.fn().mockReturnValue(15),
}));

jest.mock('../../../lib/payment/mercadopago.js', () => ({
  createMercadoPagoPayment: jest.fn(),
}));

import handler from '../../../pages/api/checkout.js';
import { query } from '../../../lib/infra/db.js';
import { getAuthenticatedCustomer } from '../../../lib/auth/customer-auth.js';
import { getCustomerById } from '../../../lib/domain/customers.js';
import {
  createInternalOrder,
  attachOrderPaymentInfo,
  calculateShippingCost,
} from '../../../lib/domain/orders.js';
import { createMercadoPagoPayment } from '../../../lib/payment/mercadopago.js';

describe('API Checkout (/api/checkout)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET - Dados do produto para checkout', () => {
    it('deve retornar dados do produto interno para venda direta', async () => {
      query.mockResolvedValueOnce({
        rows: [
          {
            id: 25,
            name: 'Escapulário de Prata',
            price: '85.00',
            stock: 10,
            modality: 'internal',
            shipping_type: 'fixed',
            shipping_cost: '15.00',
            published: true,
          },
        ],
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: { productId: '25' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.product.id).toBe(25);
      expect(data.product.price).toBe(85);
      expect(calculateShippingCost).toHaveBeenCalled();
    });

    it('deve retornar 400 se productId for inválido', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { productId: 'abc' },
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });

    it('deve retornar 404 se produto não for interno ou não existir', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const { req, res } = createMocks({
        method: 'GET',
        query: { productId: '999' },
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(404);
    });
  });

  describe('POST - Finalização de compra', () => {
    const validAddress = {
      cep: '01001-000',
      street: 'Praça da Sé',
      number: '100',
      neighborhood: 'Sé',
      city: 'São Paulo',
      state: 'SP',
    };

    it('deve retornar 401 se visitante não estiver autenticado', async () => {
      getAuthenticatedCustomer.mockReturnValue(null);

      const { req, res } = createMocks({
        method: 'POST',
        body: { productId: 25, deliveryAddress: validAddress, paymentMethod: 'pix' },
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(401);
    });

    it('deve processar pedido e cobrança com sucesso para visitante autenticado', async () => {
      getAuthenticatedCustomer.mockReturnValue({ customerId: 8 });
      getCustomerById.mockResolvedValueOnce({
        id: 8,
        name: 'Carlos Oliveira',
        email: 'carlos@test.com',
      });

      createInternalOrder.mockResolvedValueOnce({
        id: 201,
        customer_id: 8,
        product_id: 25,
        product_name: 'Escapulário',
        total_amount: 100,
      });

      createMercadoPagoPayment.mockResolvedValueOnce({
        mpPaymentId: 'mp_pix_201_test',
        mpPreferenceId: null,
        paymentStatus: 'pending',
        paymentPayload: { qr_code: 'BR.GOV.BCB.PIX...' },
      });

      attachOrderPaymentInfo.mockResolvedValueOnce({
        id: 201,
        total_amount: 100,
        payment_status: 'pending',
        order_status: 'awaiting_payment',
        mp_payment_id: 'mp_pix_201_test',
        payment_payload: { qr_code: 'BR.GOV.BCB.PIX...' },
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          productId: 25,
          quantity: 1,
          deliveryAddress: validAddress,
          paymentMethod: 'pix',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.order).toBeTruthy();
      expect(data.order.id).toBe(201);
      expect(createInternalOrder).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: 8, productId: 25, quantity: 1 })
      );
      expect(createMercadoPagoPayment).toHaveBeenCalled();
      expect(attachOrderPaymentInfo).toHaveBeenCalledWith(
        201,
        expect.objectContaining({ mpPaymentId: 'mp_pix_201_test' })
      );
    });

    it('deve retornar 409 se estoque for insuficiente', async () => {
      getAuthenticatedCustomer.mockReturnValue({ customerId: 8 });
      getCustomerById.mockResolvedValueOnce({ id: 8, name: 'Carlos', email: 'carlos@test.com' });
      createInternalOrder.mockRejectedValueOnce(new Error('INSUFFICIENT_STOCK'));

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          productId: 25,
          quantity: 500,
          deliveryAddress: validAddress,
          paymentMethod: 'pix',
        },
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(409);
    });

    it('deve retornar 400 se os dados de entrega ou pagamento forem inválidos', async () => {
      getAuthenticatedCustomer.mockReturnValue({ customerId: 8 });
      getCustomerById.mockResolvedValueOnce({ id: 8, name: 'Carlos', email: 'carlos@test.com' });

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          productId: 25,
          deliveryAddress: { cep: '' },
          paymentMethod: 'invalid_method',
        },
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
    });
  });

  describe('Métodos não permitidos', () => {
    it('deve retornar 405 para DELETE', async () => {
      const { req, res } = createMocks({ method: 'DELETE' });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(405);
    });
  });
});
