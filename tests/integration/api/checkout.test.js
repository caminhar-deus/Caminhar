import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';

jest.mock('../../../lib/infra/db.js', () => require('../../mocks/db-module').mockDb());

jest.mock('../../../lib/cache/cache.js', () => ({
  checkRateLimit: jest.fn().mockResolvedValue(false),
  getOrSetCache: jest.fn(async (_key, fetchFn) => await fetchFn()),
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
import { checkRateLimit, getOrSetCache } from '../../../lib/cache/cache.js';
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

    it('deve retornar 429 no GET quando checkRateLimit indicar excesso de requisições', async () => {
      checkRateLimit.mockResolvedValueOnce(true);

      const { req, res } = createMocks({
        method: 'GET',
        query: { productId: '25' },
        socket: { remoteAddress: '203.0.113.45' },
      });

      await handler(req, res);
      expect(res._getStatusCode()).toBe(429);
      expect(query).not.toHaveBeenCalled();
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
          quantity: 5,
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

    it('deve retornar 429 no POST quando checkRateLimit bloquear', async () => {
      getAuthenticatedCustomer.mockReturnValue({ customerId: 8 });
      checkRateLimit.mockResolvedValueOnce(true);

      const { req, res } = createMocks({
        method: 'POST',
        body: { productId: 25, quantity: 1, deliveryAddress: validAddress, paymentMethod: 'pix' },
      });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(429);
    });

    it('deve validar CPF/CNPJ inválido (400) e exigir bandeira de cartão quando token está presente com MP_ACCESS_TOKEN', async () => {
      getAuthenticatedCustomer.mockReturnValue({ customerId: 8 });

      const { req: cpfReq, res: cpfRes } = createMocks({
        method: 'POST',
        body: {
          productId: 25,
          quantity: 1,
          deliveryAddress: validAddress,
          paymentMethod: 'pix',
          paymentDetails: { payerDocument: '11111111111' },
        },
      });
      await handler(cpfReq, cpfRes);
      expect(cpfRes._getStatusCode()).toBe(400);
      expect(JSON.parse(cpfRes._getData()).message).toMatch(/CPF.*CNPJ/i);

      const prevToken = process.env.MP_ACCESS_TOKEN;
      process.env.MP_ACCESS_TOKEN = 'TEST-token-sandbox';
      try {
        const { req: cardReq, res: cardRes } = createMocks({
          method: 'POST',
          body: {
            productId: 25,
            quantity: 1,
            deliveryAddress: validAddress,
            paymentMethod: 'debit_card',
            paymentDetails: { token: 'tok_card_123' },
          },
        });
        await handler(cardReq, cardRes);
        expect(cardRes._getStatusCode()).toBe(400);
        expect(JSON.parse(cardRes._getData()).message).toMatch(/Bandeira\/meio de pagamento/i);
      } finally {
        if (prevToken === undefined) delete process.env.MP_ACCESS_TOKEN;
        else process.env.MP_ACCESS_TOKEN = prevToken;
      }
    });

    it('deve retornar 401 se o cliente autenticado no JWT não existir no banco', async () => {
      getAuthenticatedCustomer.mockReturnValue({ customerId: 999 });
      getCustomerById.mockResolvedValueOnce(null);

      const { req, res } = createMocks({
        method: 'POST',
        body: { productId: 25, quantity: 1, deliveryAddress: validAddress, paymentMethod: 'pix' },
      });
      await handler(req, res);
      expect(res._getStatusCode()).toBe(401);
    });

    it('deve retornar 404 para PRODUCT_NOT_FOUND / PRODUCT_NOT_INTERNAL e 500 para erro inesperado', async () => {
      getAuthenticatedCustomer.mockReturnValue({ customerId: 8 });
      getCustomerById.mockResolvedValue({ id: 8, name: 'Carlos', email: 'carlos@test.com' });

      createInternalOrder.mockRejectedValueOnce(new Error('PRODUCT_NOT_INTERNAL'));
      const { req: req404, res: res404 } = createMocks({
        method: 'POST',
        body: { productId: 25, quantity: 1, deliveryAddress: validAddress, paymentMethod: 'pix' },
      });
      await handler(req404, res404);
      expect(res404._getStatusCode()).toBe(404);

      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      try {
        createInternalOrder.mockRejectedValueOnce(new Error('DB unexpected failure'));
        const { req: req500, res: res500 } = createMocks({
          method: 'POST',
          body: { productId: 25, quantity: 1, deliveryAddress: validAddress, paymentMethod: 'pix' },
        });
        await handler(req500, res500);
        expect(res500._getStatusCode()).toBe(500);
      } finally {
        errSpy.mockRestore();
      }
    });

    it('deve atualizar endereço quando apenas o CEP divergir e retornar 422 padrão quando MP falhar com status 422 sem userMessage', async () => {
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      try {
        getAuthenticatedCustomer.mockReturnValue({ customerId: 8 });
        getCustomerById.mockResolvedValueOnce({
          id: 8,
          name: 'Carlos',
          email: 'carlos@test.com',
          default_address: { ...validAddress, cep: '99999-999' },
        });
        createInternalOrder.mockResolvedValueOnce({
          id: 399,
          customer_id: 8,
          product_id: 25,
          product_name: 'Terço',
          total_amount: 50,
        });
        const mpErr = new Error('MP 422 raw');
        mpErr.statusCode = 422;
        createMercadoPagoPayment.mockRejectedValueOnce(mpErr);

        const { req, res } = createMocks({
          method: 'POST',
          body: { productId: 25, quantity: 1, deliveryAddress: validAddress, paymentMethod: 'pix' },
        });
        await handler(req, res);

        expect(updateCustomerProfile).toHaveBeenCalledWith(8, { defaultAddress: validAddress });
        expect(res._getStatusCode()).toBe(422);
        expect(JSON.parse(res._getData()).message).toMatch(/Não foi possível processar o pagamento junto ao Mercado Pago/i);
      } finally {
        errSpy.mockRestore();
      }
    });

    it('deve validar estritamente quantity, installments, cardNumber bruto com MP ativo e BELOW_MIN_PAYMENT_AMOUNT (400)', async () => {
      getAuthenticatedCustomer.mockReturnValue({ customerId: 8 });
      getCustomerById.mockResolvedValue({ id: 8, name: 'Carlos', email: 'carlos@test.com' });

      // quantity inválida (0 e não-numérica)
      for (const badQty of [0, -2, 'abc', 100]) {
        const { req, res } = createMocks({
          method: 'POST',
          body: { productId: 25, quantity: badQty, deliveryAddress: validAddress, paymentMethod: 'pix' },
        });
        await handler(req, res);
        expect(res._getStatusCode()).toBe(400);
      }

      // installments inválido para crédito (13) e débito (2)
      const { req: badCreditInst, res: resCreditInst } = createMocks({
        method: 'POST',
        body: {
          productId: 25,
          quantity: 1,
          deliveryAddress: validAddress,
          paymentMethod: 'credit_card',
          paymentDetails: { installments: 13 },
        },
      });
      await handler(badCreditInst, resCreditInst);
      expect(resCreditInst._getStatusCode()).toBe(400);

      const { req: badDebitInst, res: resDebitInst } = createMocks({
        method: 'POST',
        body: {
          productId: 25,
          quantity: 1,
          deliveryAddress: validAddress,
          paymentMethod: 'debit_card',
          paymentDetails: { installments: 2 },
        },
      });
      await handler(badDebitInst, resDebitInst);
      expect(resDebitInst._getStatusCode()).toBe(400);

      // cardNumber bruto rejeitado quando MP_ACCESS_TOKEN está ativo
      const prevToken = process.env.MP_ACCESS_TOKEN;
      process.env.MP_ACCESS_TOKEN = 'APP_USR-active';
      try {
        const { req: rawCardReq, res: rawCardRes } = createMocks({
          method: 'POST',
          body: {
            productId: 25,
            quantity: 1,
            deliveryAddress: validAddress,
            paymentMethod: 'credit_card',
            paymentDetails: {
              token: 'tok_ok',
              paymentMethodId: 'visa',
              cardNumber: '4111111111111111',
            },
          },
        });
        await handler(rawCardReq, rawCardRes);
        expect(rawCardRes._getStatusCode()).toBe(400);
        expect(JSON.parse(rawCardRes._getData()).message).toMatch(/Número de cartão bruto/i);
      } finally {
        if (prevToken === undefined) delete process.env.MP_ACCESS_TOKEN;
        else process.env.MP_ACCESS_TOKEN = prevToken;
      }

      // BELOW_MIN_PAYMENT_AMOUNT mapeado para 400
      const minErr = new Error('BELOW_MIN_PAYMENT_AMOUNT');
      minErr.minAmount = 4.0;
      createInternalOrder.mockRejectedValueOnce(minErr);
      const { req: minReq, res: minRes } = createMocks({
        method: 'POST',
        body: {
          productId: 25,
          quantity: 1,
          deliveryAddress: validAddress,
          paymentMethod: 'ticket',
          paymentDetails: { payerDocument: '19119119100' },
        },
      });
      await handler(minReq, minRes);
      expect(minRes._getStatusCode()).toBe(400);
      expect(JSON.parse(minRes._getData()).message).toMatch(/abaixo do mínimo/i);
    });

    it('deve respeitar X-Idempotency-Key (rejeitar formato inválido, reutilizar resultado sem recriar pedido e recusar divergência 409)', async () => {
      getAuthenticatedCustomer.mockReturnValue({ customerId: 8 });
      getCustomerById.mockResolvedValue({ id: 8, name: 'Carlos', email: 'carlos@test.com' });

      // Formato inválido de chave
      const { req: badKeyReq, res: badKeyRes } = createMocks({
        method: 'POST',
        headers: { 'x-idempotency-key': 'curta' },
        body: { productId: 25, quantity: 1, deliveryAddress: validAddress, paymentMethod: 'pix' },
      });
      await handler(badKeyReq, badKeyRes);
      expect(badKeyRes._getStatusCode()).toBe(400);

      // Reuso da mesma chave em cache retorna o pedido existente sem duplicar createInternalOrder
      const cachedOrder = { id: 777, total_amount: 100, payment_status: 'pending' };
      getOrSetCache.mockResolvedValueOnce({
        order: cachedOrder,
        fingerprint: '25:1:pix',
      });
      const { req: hitReq, res: hitRes } = createMocks({
        method: 'POST',
        headers: { 'x-idempotency-key': 'chk_idem_key_123456' },
        body: { productId: 25, quantity: 1, deliveryAddress: validAddress, paymentMethod: 'pix' },
      });
      await handler(hitReq, hitRes);
      expect(hitRes._getStatusCode()).toBe(201);
      expect(JSON.parse(hitRes._getData()).order.id).toBe(777);
      expect(createInternalOrder).not.toHaveBeenCalled();

      // Reuso da mesma chave com parâmetros diferentes -> 409 Conflict
      getOrSetCache.mockResolvedValueOnce({
        order: cachedOrder,
        fingerprint: '25:1:pix',
      });
      const { req: conflictReq, res: conflictRes } = createMocks({
        method: 'POST',
        headers: { 'x-idempotency-key': 'chk_idem_key_123456' },
        body: { productId: 25, quantity: 2, deliveryAddress: validAddress, paymentMethod: 'pix' },
      });
      await handler(conflictReq, conflictRes);
      expect(conflictRes._getStatusCode()).toBe(409);
    });

    it('deve recusar debit_card com 400 quando MP_ENABLE_DEBIT_CARD estiver desabilitado e manter PIX ativo', async () => {
      const prevFlag = process.env.MP_ENABLE_DEBIT_CARD;
      process.env.MP_ENABLE_DEBIT_CARD = 'false';

      try {
        getAuthenticatedCustomer.mockReturnValue({ customerId: 8 });
        getCustomerById.mockResolvedValue({
          id: 8,
          name: 'Carlos',
          email: 'carlos@test.com',
          default_address: validAddress,
        });

        const { req: debitReq, res: debitRes } = createMocks({
          method: 'POST',
          body: {
            productId: 25,
            quantity: 1,
            deliveryAddress: validAddress,
            paymentMethod: 'debit_card',
          },
        });
        await handler(debitReq, debitRes);

        expect(debitRes._getStatusCode()).toBe(400);
        expect(JSON.parse(debitRes._getData()).message).toMatch(/débito direto não está habilitado/i);
        expect(createInternalOrder).not.toHaveBeenCalled();

        createInternalOrder.mockResolvedValueOnce({
          id: 880,
          customer_id: 8,
          product_id: 25,
          product_name: 'Terço',
          total_amount: 50,
          payment_method: 'pix',
          payment_status: 'pending',
          order_status: 'awaiting_payment',
        });
        createMercadoPagoPayment.mockResolvedValueOnce({
          mpPaymentId: 'ORD_PIX_880',
          mpPreferenceId: null,
          paymentStatus: 'pending',
          paymentPayload: { qr_code: '000201PIX880' },
        });
        attachOrderPaymentInfo.mockResolvedValueOnce({
          id: 880,
          payment_method: 'pix',
          payment_status: 'pending',
          order_status: 'awaiting_payment',
        });

        const { req: pixReq, res: pixRes } = createMocks({
          method: 'POST',
          body: {
            productId: 25,
            quantity: 1,
            deliveryAddress: validAddress,
            paymentMethod: 'pix',
          },
        });
        await handler(pixReq, pixRes);
        expect(pixRes._getStatusCode()).toBe(201);
        expect(createInternalOrder).toHaveBeenCalledTimes(1);
      } finally {
        if (prevFlag === undefined) delete process.env.MP_ENABLE_DEBIT_CARD;
        else process.env.MP_ENABLE_DEBIT_CARD = prevFlag;
      }
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
