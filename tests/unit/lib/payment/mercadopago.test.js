import { createHmac } from 'crypto';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  createMercadoPagoPayment,
  fetchMercadoPagoPaymentStatus,
  verifyMercadoPagoWebhookSignature,
} from '../../../../lib/payment/mercadopago.js';

describe('Integração Mercado Pago — lib/payment/mercadopago.js', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const sampleOrder = {
    id: 55,
    product_name: 'Bíblia Católica',
    total_amount: 120.5,
  };
  const sampleCustomer = {
    id: 10,
    name: 'Maria Aparecida',
    email: 'maria@exemplo.com',
  };

  it('deve gerar payload PIX com código copia e cola em ambiente de teste', async () => {
    delete process.env.MP_ACCESS_TOKEN;
    const res = await createMercadoPagoPayment({
      order: sampleOrder,
      customer: sampleCustomer,
      paymentMethod: 'pix',
    });

    expect(res.mpPaymentId).toMatch(/^mp_pix_55_/);
    expect(res.paymentStatus).toBe('pending');
    expect(res.paymentPayload.qr_code).toContain('BR.GOV.BCB.PIX');
  });

  it('deve gerar payload de boleto bancário com linha digitável em ambiente de teste', async () => {
    delete process.env.MP_ACCESS_TOKEN;
    const res = await createMercadoPagoPayment({
      order: sampleOrder,
      customer: sampleCustomer,
      paymentMethod: 'ticket',
    });

    expect(res.mpPaymentId).toMatch(/^mp_bol_55_/);
    expect(res.paymentStatus).toBe('pending');
    expect(res.paymentPayload.digitable_line).toBeTruthy();
  });

  it('deve gerar payload de cartão de crédito/débito em ambiente de teste', async () => {
    delete process.env.MP_ACCESS_TOKEN;
    const res = await createMercadoPagoPayment({
      order: sampleOrder,
      customer: sampleCustomer,
      paymentMethod: 'credit_card',
      paymentDetails: { installments: 3, cardNumber: '4111111111111234' },
    });

    expect(res.mpPaymentId).toMatch(/^mp_card_55_/);
    expect(res.paymentStatus).toBe('approved');
    expect(res.paymentPayload.card_last_digits).toBe('1234');
    expect(res.paymentPayload.installments).toBe(3);
  });

  it('deve lançar erro em produção se MP_ACCESS_TOKEN não estiver configurado', async () => {
    delete process.env.MP_ACCESS_TOKEN;
    process.env.NODE_ENV = 'production';

    await expect(
      createMercadoPagoPayment({
        order: sampleOrder,
        customer: sampleCustomer,
        paymentMethod: 'pix',
      })
    ).rejects.toThrow('MP_NOT_CONFIGURED');
  });

  it('deve chamar Orders API (/v1/orders) do Mercado Pago quando MP_ACCESS_TOKEN estiver definido', async () => {
    process.env.MP_ACCESS_TOKEN = 'test-token-mp';

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'ORDTST01PIXEL01',
        user_id: '112233',
        status: 'action_required',
        status_detail: 'waiting_transfer',
        transactions: {
          payments: [
            {
              id: 'PAY01TEST',
              status: 'action_required',
              status_detail: 'waiting_transfer',
              date_of_expiration: '2026-11-13T22:00:00Z',
              payment_method: {
                id: 'pix',
                type: 'bank_transfer',
                qr_code: 'pix-code-123',
                qr_code_base64: 'base64-image-string',
                ticket_url: 'https://mp.com/ticket',
                digitable_line: '123456789',
              },
            },
          ],
        },
      }),
    });
    global.fetch = mockFetch;

    const res = await createMercadoPagoPayment({
      order: sampleOrder,
      customer: sampleCustomer,
      paymentMethod: 'pix',
      paymentDetails: { payerDocument: '19119119100' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.mercadopago.com/v1/orders',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token-mp',
          'X-Idempotency-Key': 'caminhar-order-55',
        }),
      })
    );

    const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(sentBody.total_amount).toBe('120.50');
    expect(sentBody.type).toBe('online');
    expect(sentBody.processing_mode).toBe('automatic');
    expect(sentBody.notification_url).toBeUndefined();
    expect(sentBody.transactions.payments[0]).toEqual({
      amount: '120.50',
      payment_method: { id: 'pix', type: 'bank_transfer' },
    });

    expect(res.mpPaymentId).toBe('ORDTST01PIXEL01');
    expect(res.mpPreferenceId).toBe('112233');
    expect(res.paymentStatus).toBe('pending');
    expect(res.paymentPayload.qr_code).toBe('pix-code-123');
    expect(res.paymentPayload.digitable_line).toBe('123456789');
  });

  it('deve enviar boleto sem country/federal_unit e cartão pré-pago sem installments na Orders API', async () => {
    process.env.MP_ACCESS_TOKEN = 'test-token-mp';

    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'ORDTST_BOL',
          status: 'action_required',
          status_detail: 'waiting_payment',
          transactions: {
            payments: [
              {
                id: 'PAY_BOL',
                status: 'action_required',
                status_detail: 'waiting_payment',
                payment_method: {
                  id: 'bolbradesco',
                  type: 'ticket',
                  ticket_url: 'https://mp.com/boleto',
                  digitable_line: '23793.38128',
                },
              },
            ],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'ORDTST_PRE',
          status: 'processed',
          status_detail: 'accredited',
          transactions: {
            payments: [
              {
                id: 'PAY_PRE',
                status: 'processed',
                status_detail: 'accredited',
                payment_method: { id: 'elo', type: 'prepaid_card' },
              },
            ],
          },
        }),
      });
    global.fetch = mockFetch;

    const boletoRes = await createMercadoPagoPayment({
      order: {
        id: 70,
        product_name: 'Terço',
        total_amount: 35,
        delivery_address: {
          cep: '01310-100',
          street: 'Av Paulista',
          number: '100',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'sp',
        },
      },
      customer: sampleCustomer,
      paymentMethod: 'ticket',
      paymentDetails: { payerDocument: '191.191.191-00' },
    });

    const bolBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(bolBody.payer.address).toEqual({
      zip_code: '01310100',
      street_name: 'Av Paulista',
      street_number: '100',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
    });
    expect(bolBody.payer.address.country).toBeUndefined();
    expect(boletoRes.paymentStatus).toBe('pending');
    expect(boletoRes.paymentPayload.digitable_line).toBe('23793.38128');

    const preRes = await createMercadoPagoPayment({
      order: { id: 71, product_name: 'Bíblia', total_amount: 80 },
      customer: sampleCustomer,
      paymentMethod: 'debit_card',
      paymentDetails: {
        token: 'tok_elo',
        paymentMethodId: 'elo',
        paymentTypeId: 'prepaid_card',
        installments: 1,
      },
    });

    const preBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(preBody.transactions.payments[0].payment_method).toEqual({
      id: 'elo',
      type: 'prepaid_card',
      token: 'tok_elo',
    });
    expect(preRes.paymentStatus).toBe('approved');
  });

  it('deve interpretar HTTP 402 com data de ordem recusada sem lançar exceção fatal', async () => {
    process.env.MP_ACCESS_TOKEN = 'test-token-mp';

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 402,
      text: async () =>
        JSON.stringify({
          errors: [{ code: 'failed', message: 'The following transactions failed' }],
          data: {
            id: 'ORDTST_FAILED_402',
            status: 'failed',
            status_detail: 'failed',
            transactions: {
              payments: [
                {
                  id: 'PAY_FAILED',
                  status: 'failed',
                  status_detail: 'insufficient_amount',
                  payment_method: { id: 'visa', type: 'credit_card' },
                },
              ],
            },
          },
        }),
    });

    const declined = await createMercadoPagoPayment({
      order: sampleOrder,
      customer: sampleCustomer,
      paymentMethod: 'credit_card',
      paymentDetails: { token: 'tok_fund', paymentMethodId: 'visa', installments: 1 },
    });

    expect(declined.mpPaymentId).toBe('ORDTST_FAILED_402');
    expect(declined.paymentStatus).toBe('rejected');
    expect(declined.paymentPayload.status_detail).toBe('insufficient_amount');
  });

  it('deve tratar erro HTTP retornado pela API oficial do Mercado Pago', async () => {
    process.env.MP_ACCESS_TOKEN = 'test-token-mp';

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'Invalid payment data',
    });

    await expect(
      createMercadoPagoPayment({
        order: sampleOrder,
        customer: sampleCustomer,
        paymentMethod: 'pix',
      })
    ).rejects.toThrow('MP_API_ERROR: 400 Invalid payment data');
  });

  describe('fetchMercadoPagoPaymentStatus()', () => {
    it('retorna o status real do pagamento consultado na API legada e normaliza Orders API (/v1/orders)', async () => {
      process.env.MP_ACCESS_TOKEN = 'test-token-mp';
      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 1, status: 'approved' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'ORDTST01',
            status: 'processed',
            status_detail: 'accredited',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'ORDTST02',
            status: 'processing',
            transactions: { payments: [{ status_detail: 'in_process' }] },
          }),
        });
      global.fetch = mockFetch;

      await expect(fetchMercadoPagoPaymentStatus('1/2')).resolves.toBe('approved');
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://api.mercadopago.com/v1/payments/1%2F2',
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-token-mp' },
          signal: expect.anything(),
        })
      );

      await expect(
        fetchMercadoPagoPaymentStatus('ORDTST01', { eventType: 'order' })
      ).resolves.toBe('approved');
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://api.mercadopago.com/v1/orders/ORDTST01',
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-token-mp' },
        })
      );

      await expect(fetchMercadoPagoPaymentStatus('ORDTST02')).resolves.toBe('in_process');
    });

    it('lança MP_NOT_CONFIGURED sem token', async () => {
      delete process.env.MP_ACCESS_TOKEN;
      await expect(fetchMercadoPagoPaymentStatus('1')).rejects.toThrow('MP_NOT_CONFIGURED');
    });

    it('lança MP_API_ERROR quando a API responde com erro HTTP', async () => {
      process.env.MP_ACCESS_TOKEN = 'test-token-mp';
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });
      await expect(fetchMercadoPagoPaymentStatus('1')).rejects.toThrow('MP_API_ERROR');
    });

    it('lança MP_API_ERROR em falha de rede ou timeout', async () => {
      process.env.MP_ACCESS_TOKEN = 'test-token-mp';
      global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
      await expect(fetchMercadoPagoPaymentStatus('1')).rejects.toThrow('MP_API_ERROR');
    });

    it('lança MP_INVALID_RESPONSE quando a resposta não traz status', async () => {
      process.env.MP_ACCESS_TOKEN = 'test-token-mp';
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 1 }) });
      await expect(fetchMercadoPagoPaymentStatus('1')).rejects.toThrow('MP_INVALID_RESPONSE');
    });
  });

  describe('verifyMercadoPagoWebhookSignature()', () => {
    it('deve validar assinatura HMAC-SHA256 legítima e rejeitar assinatura adulterada', () => {
      const secret = 'test-webhook-secret-key';
      const dataId = '998877';
      const requestIdHeader = 'req-abc-123';
      const ts = '1700000000';
      const manifest = `id:${dataId};request-id:${requestIdHeader};ts:${ts};`;
      const validHash = createHmac('sha256', secret).update(manifest).digest('hex');

      expect(
        verifyMercadoPagoWebhookSignature({
          signatureHeader: `ts=${ts},v1=${validHash}`,
          requestIdHeader,
          dataId,
          secret,
        })
      ).toBe(true);

      expect(
        verifyMercadoPagoWebhookSignature({
          signatureHeader: `ts=${ts},v1=0000000000000000000000000000000000000000000000000000000000000000`,
          requestIdHeader,
          dataId,
          secret,
        })
      ).toBe(false);
    });

    it('deve aceitar assinatura vazia em ambiente de dev quando secret não estiver configurado', () => {
      process.env.NODE_ENV = 'test';
      expect(
        verifyMercadoPagoWebhookSignature({
          signatureHeader: '',
          secret: undefined,
        })
      ).toBe(true);
    });

    it('deve rejeitar em produção se secret não estiver configurado', () => {
      process.env.NODE_ENV = 'production';
      expect(
        verifyMercadoPagoWebhookSignature({
          signatureHeader: 'ts=1,v1=abc',
          secret: undefined,
        })
      ).toBe(false);
    });

    it('deve rejeitar se signatureHeader for nulo, inválido ou não contiver ts e v1', () => {
      const secret = 'test-secret';
      expect(verifyMercadoPagoWebhookSignature({ signatureHeader: null, secret })).toBe(false);
      expect(verifyMercadoPagoWebhookSignature({ signatureHeader: 'ts=123', secret })).toBe(false);
      expect(verifyMercadoPagoWebhookSignature({ signatureHeader: 'v1=123', secret })).toBe(false);
      expect(verifyMercadoPagoWebhookSignature({ signatureHeader: 'invalid-format', secret })).toBe(false);
    });

    it('deve normalizar dataId alfanumérico para minúsculas na verificação v2 e mapear erro payment_method_not_allowed_for_collector', async () => {
      const secret = 'mp-secret';
      const ts = '1700000100';
      const reqId = 'req-alpha';
      const dataId = 'ORDTST01ABC';
      const manifest = `id:${dataId.toLowerCase()};request-id:${reqId};ts:${ts};`;
      const v1 = createHmac('sha256', secret).update(manifest).digest('hex');

      expect(
        verifyMercadoPagoWebhookSignature({
          signatureHeader: `ts=${ts},v1=${v1}`,
          requestIdHeader: reqId,
          dataId,
          secret,
        })
      ).toBe(true);

      process.env.MP_ACCESS_TOKEN = 'APP_USR-orders-sandbox';
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () =>
          JSON.stringify({
            errors: [
              {
                code: 'payment_method_not_allowed_for_collector',
                message: 'The payment method is not allowed for this collector.',
              },
            ],
          }),
      });

      await expect(
        createMercadoPagoPayment({
          order: { id: 99, product_name: 'Livro', total_amount: 35 },
          customer: { email: 'comprador@test.com', name: 'Ana Maria' },
          paymentMethod: 'debit_card',
          paymentDetails: { token: 'tok_deb', paymentMethodId: 'debelo', payerDocument: '191.191.191-00' },
        })
      ).rejects.toMatchObject({
        statusCode: 400,
        mpCauseCode: 'payment_method_not_allowed_for_collector',
        userMessage: expect.stringMatching(/não está habilitado/i),
      });
    });
  });
});
