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
  cancelFailedCheckoutOrder: jest.fn().mockResolvedValue({}),
  calculateShippingCost: jest.fn().mockReturnValue(15),
}));

jest.mock('../../../lib/payment/mercadopago.js', () => ({
  createMercadoPagoPayment: jest.fn(),
}));

import handler from '../../../pages/api/checkout.js';
import { query } from '../../../lib/infra/db.js';
import { getAuthenticatedCustomer } from '../../../lib/auth/customer-auth.js';
import { getCustomerById, updateCustomerProfile } from '../../../lib/domain/customers.js';
import {
  createInternalOrder,
  attachOrderPaymentInfo,
  cancelFailedCheckoutOrder,
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

    it('deve retornar 400 para boleto sem CPF/CNPJ do pagador', async () => {
      getAuthenticatedCustomer.mockReturnValue({ customerId: 8 });
      getCustomerById.mockResolvedValueOnce({ id: 8, name: 'Carlos', email: 'carlos@test.com' });

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          productId: 25,
          quantity: 1,
          deliveryAddress: validAddress,
          paymentMethod: 'ticket',
        },
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(400);
      expect(JSON.parse(res._getData()).message).toMatch(/CPF ou CNPJ/i);
    });

    it('deve exigir token e bandeira para cartão quando MP_ACCESS_TOKEN está configurado', async () => {
      const prevToken = process.env.MP_ACCESS_TOKEN;
      process.env.MP_ACCESS_TOKEN = 'TEST-token-sandbox';
      try {
        getAuthenticatedCustomer.mockReturnValue({ customerId: 8 });
        getCustomerById.mockResolvedValueOnce({ id: 8, name: 'Carlos', email: 'carlos@test.com' });

        const { req, res } = createMocks({
          method: 'POST',
          body: {
            productId: 25,
            quantity: 1,
            deliveryAddress: validAddress,
            paymentMethod: 'credit_card',
            paymentDetails: { payerDocument: '19119119100' },
          },
        });

        await handler(req, res);
        expect(res._getStatusCode()).toBe(400);
        expect(JSON.parse(res._getData()).message).toMatch(/Tokenização/i);
      } finally {
        if (prevToken === undefined) delete process.env.MP_ACCESS_TOKEN;
        else process.env.MP_ACCESS_TOKEN = prevToken;
      }
    });

    it('deve cancelar pedido e devolver estoque se o Mercado Pago falhar após reservar o pedido', async () => {
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      try {
        getAuthenticatedCustomer.mockReturnValue({ customerId: 8 });
        getCustomerById.mockResolvedValueOnce({
          id: 8,
          name: 'Carlos',
          email: 'carlos@test.com',
        });
        createInternalOrder.mockResolvedValueOnce({
          id: 305,
          customer_id: 8,
          product_id: 25,
          product_name: 'Terço',
          total_amount: 90,
        });
        const mpErr = new Error('MP_API_ERROR: 401 Unauthorized use of live credentials');
        mpErr.statusCode = 401;
        mpErr.userMessage = 'Credenciais incompatíveis com ambiente de testes.';
        createMercadoPagoPayment.mockRejectedValueOnce(mpErr);

        const { req, res } = createMocks({
          method: 'POST',
          body: {
            productId: 25,
            quantity: 1,
            deliveryAddress: validAddress,
            paymentMethod: 'pix',
            paymentDetails: { payerDocument: '19119119100' },
          },
        });

        await handler(req, res);
        expect(res._getStatusCode()).toBe(502);
        expect(cancelFailedCheckoutOrder).toHaveBeenCalledWith(
          305,
          'Credenciais incompatíveis com ambiente de testes.'
        );
        expect(JSON.parse(res._getData()).message).toBe(
          'Credenciais incompatíveis com ambiente de testes.'
        );
      } finally {
        errSpy.mockRestore();
      }
    });

    it('não deve chamar updateCustomerProfile quando default_address já coincide com deliveryAddress', async () => {
      getAuthenticatedCustomer.mockReturnValue({ customerId: 8 });
      getCustomerById.mockReset();
      getCustomerById.mockResolvedValueOnce({
        id: 8,
        name: 'Carlos Oliveira',
        email: 'carlos@test.com',
        default_address: {
          cep: '01001000',
          street: ' Praça da Sé ',
          number: '100',
          complement: '',
          neighborhood: 'Sé',
          city: 'São Paulo',
          state: 'sp',
        },
      });
      createInternalOrder.mockResolvedValueOnce({
        id: 210,
        customer_id: 8,
        product_id: 25,
        product_name: 'Escapulário',
        total_amount: 100,
      });
      createMercadoPagoPayment.mockResolvedValueOnce({
        mpPaymentId: 'mp_pix_210_test',
        mpPreferenceId: null,
        paymentStatus: 'pending',
        paymentPayload: { qr_code: 'BR.GOV.BCB.PIX...' },
      });
      attachOrderPaymentInfo.mockResolvedValueOnce({
        id: 210,
        total_amount: 100,
        payment_status: 'pending',
        order_status: 'awaiting_payment',
        mp_payment_id: 'mp_pix_210_test',
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
      expect(updateCustomerProfile).not.toHaveBeenCalled();
    });

    it('deve executar updateCustomerProfile em paralelo com createMercadoPagoPayment quando o endereço mudar', async () => {
      getAuthenticatedCustomer.mockReturnValue({ customerId: 8 });
      getCustomerById.mockReset();
      getCustomerById.mockResolvedValueOnce({
        id: 8,
        name: 'Carlos Oliveira',
        email: 'carlos@test.com',
        default_address: { ...validAddress, number: '50' },
      });
      createInternalOrder.mockResolvedValueOnce({
        id: 211,
        customer_id: 8,
        product_id: 25,
        product_name: 'Escapulário',
        total_amount: 100,
      });

      let resolveProfileUpdate;
      updateCustomerProfile.mockImplementationOnce(
        () => new Promise((resolve) => {
          resolveProfileUpdate = resolve;
        })
      );

      // Só libera o update de perfil depois que createMercadoPagoPayment já foi iniciado,
      // provando que o pagamento não fica bloqueado aguardando o profile update.
      createMercadoPagoPayment.mockImplementationOnce(async () => {
        expect(updateCustomerProfile).toHaveBeenCalledTimes(1);
        resolveProfileUpdate({});
        return {
          mpPaymentId: 'mp_pix_211_test',
          mpPreferenceId: null,
          paymentStatus: 'pending',
          paymentPayload: { qr_code: 'BR.GOV.BCB.PIX...' },
        };
      });

      attachOrderPaymentInfo.mockResolvedValueOnce({
        id: 211,
        total_amount: 100,
        payment_status: 'pending',
        order_status: 'awaiting_payment',
        mp_payment_id: 'mp_pix_211_test',
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
      expect(updateCustomerProfile).toHaveBeenCalledWith(8, { defaultAddress: validAddress });
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
