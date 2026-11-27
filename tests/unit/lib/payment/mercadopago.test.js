import { createHmac } from 'crypto';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  createMercadoPagoPayment,
  fetchMercadoPagoPaymentDetails,
  mapMercadoPagoStatus,
  refundMercadoPagoOrder,
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

  it('normaliza ticket_url de /staging/payments/ para /sandbox/payments/ ao criar boleto preservando digitable_line e barcode_content', async () => {
    process.env.MP_ACCESS_TOKEN = 'test-token-mp';
    const stagingTicketUrl =
      'https://www.mercadopago.com.br/staging/payments/189650364540/ticket?caller_id=3845624858&payment_method_id=bolbradesco&payment_id=189650364540&payment_method_reference_id=6010877038&hash=57246646-0bce-4389-89c6-5fc7b9542f44';
    const expectedSandboxTicketUrl =
      'https://www.mercadopago.com.br/sandbox/payments/189650364540/ticket?caller_id=3845624858&payment_method_id=bolbradesco&payment_id=189650364540&payment_method_reference_id=6010877038&hash=57246646-0bce-4389-89c6-5fc7b9542f44';

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'ORDTST01M7DJXA5Q2GJ40TPX5DGVKP48',
        status: 'action_required',
        status_detail: 'waiting_payment',
        transactions: {
          payments: [
            {
              id: 'PAY01M7DJXA67SDK8PSMSPD8GRP2R',
              status: 'action_required',
              status_detail: 'waiting_payment',
              payment_method: {
                id: 'bolbradesco',
                type: 'ticket',
                ticket_url: stagingTicketUrl,
                digitable_line: '23793380296060108770738006333306316330000000400',
                barcode_content: '23793163300000004003380260601087703800633330',
              },
            },
          ],
        },
      }),
    });

    const boletoRes = await createMercadoPagoPayment({
      order: {
        id: 21,
        product_name: 'Livro Teste',
        total_amount: 4,
        delivery_address: {
          cep: '01310-100',
          street: 'Av Paulista',
          number: '100',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
        },
      },
      customer: sampleCustomer,
      paymentMethod: 'ticket',
      paymentDetails: { payerDocument: '191.191.191-00' },
    });

    expect(boletoRes.paymentStatus).toBe('pending');
    expect(boletoRes.paymentPayload.ticket_url).toBe(expectedSandboxTicketUrl);
    expect(boletoRes.paymentPayload.digitable_line).toBe(
      '23793380296060108770738006333306316330000000400'
    );
    expect(boletoRes.paymentPayload.barcode_content).toBe(
      '23793163300000004003380260601087703800633330'
    );
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

  describe('fetchMercadoPagoPaymentDetails()', () => {
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

      await expect(fetchMercadoPagoPaymentDetails('1/2')).resolves.toMatchObject({
        paymentStatus: 'approved',
        mpOrderStatus: 'approved',
      });
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://api.mercadopago.com/v1/payments/1%2F2',
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-token-mp' },
          signal: expect.anything(),
        })
      );

      await expect(
        fetchMercadoPagoPaymentDetails('ORDTST01', { eventType: 'order' })
      ).resolves.toMatchObject({
        paymentStatus: 'approved',
        statusDetail: 'accredited',
      });
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://api.mercadopago.com/v1/orders/ORDTST01',
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-token-mp' },
        })
      );

      await expect(fetchMercadoPagoPaymentDetails('ORDTST02')).resolves.toMatchObject({
        paymentStatus: 'in_process',
        statusDetail: 'in_process',
      });
    });

    it('prioriza tentativa aprovada/processada em transactions.payments quando há múltiplas tentativas', async () => {
      process.env.MP_ACCESS_TOKEN = 'test-token-mp';
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'ORDTST_MULTI',
          external_reference: '44',
          status: 'processed',
          transactions: {
            payments: [
              { id: 'PAY_FAIL', status: 'failed', status_detail: 'insufficient_amount' },
              { id: 'PAY_OK', status: 'processed', status_detail: 'accredited' },
            ],
          },
        }),
      });

      await expect(fetchMercadoPagoPaymentDetails('ORDTST_MULTI')).resolves.toEqual({
        paymentStatus: 'approved',
        rawStatus: 'processed',
        mpOrderStatus: 'processed',
        statusDetail: 'accredited',
        externalReference: '44',
        transactionId: 'PAY_OK',
      });
    });

    it('lança MP_NOT_CONFIGURED sem token', async () => {
      delete process.env.MP_ACCESS_TOKEN;
      await expect(fetchMercadoPagoPaymentDetails('1')).rejects.toThrow('MP_NOT_CONFIGURED');
    });

    it('lança MP_API_ERROR quando a API responde com erro HTTP', async () => {
      process.env.MP_ACCESS_TOKEN = 'test-token-mp';
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });
      await expect(fetchMercadoPagoPaymentDetails('1')).rejects.toThrow('MP_API_ERROR');
    });

    it('lança MP_API_ERROR em falha de rede ou timeout', async () => {
      process.env.MP_ACCESS_TOKEN = 'test-token-mp';
      global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
      await expect(fetchMercadoPagoPaymentDetails('1')).rejects.toThrow('MP_API_ERROR');
    });

    it('lança MP_INVALID_RESPONSE quando a resposta não traz status', async () => {
      process.env.MP_ACCESS_TOKEN = 'test-token-mp';
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 1 }) });
      await expect(fetchMercadoPagoPaymentDetails('1')).rejects.toThrow('MP_INVALID_RESPONSE');
    });
  });

  describe('verifyMercadoPagoWebhookSignature()', () => {
    it('deve validar assinatura HMAC-SHA256 legítima dentro da janela temporal e rejeitar adulterada ou expirada', () => {
      const secret = 'test-webhook-secret-key';
      const dataId = '998877';
      const requestIdHeader = 'req-abc-123';
      const now = Math.floor(Date.now() / 1000);
      const ts = String(now);
      const manifest = `id:${dataId};request-id:${requestIdHeader};ts:${ts};`;
      const validHash = createHmac('sha256', secret).update(manifest).digest('hex');

      expect(
        verifyMercadoPagoWebhookSignature({
          signatureHeader: `ts=${ts},v1=${validHash}`,
          requestIdHeader,
          dataId,
          secret,
          nowSeconds: now,
        })
      ).toBe(true);

      // Aceita ts em milissegundos dentro da janela
      const tsMs = String(now * 1000);
      const hashMs = createHmac('sha256', secret)
        .update(`id:${dataId};request-id:${requestIdHeader};ts:${tsMs};`)
        .digest('hex');
      expect(
        verifyMercadoPagoWebhookSignature({
          signatureHeader: `ts=${tsMs},v1=${hashMs}`,
          requestIdHeader,
          dataId,
          secret,
          nowSeconds: now,
        })
      ).toBe(true);

      // Rejeita ts expirado (> 15 min) e ts no futuro distante
      expect(
        verifyMercadoPagoWebhookSignature({
          signatureHeader: `ts=${ts},v1=${validHash}`,
          requestIdHeader,
          dataId,
          secret,
          nowSeconds: now + 1200,
        })
      ).toBe(false);

      expect(
        verifyMercadoPagoWebhookSignature({
          signatureHeader: `ts=${ts},v1=${validHash}`,
          requestIdHeader,
          dataId,
          secret,
          nowSeconds: now - 1200,
        })
      ).toBe(false);

      // Rejeita ts não numérico mesmo com HMAC assinado
      const badTs = 'not-a-number';
      const badTsHash = createHmac('sha256', secret)
        .update(`id:${dataId};request-id:${requestIdHeader};ts:${badTs};`)
        .digest('hex');
      expect(
        verifyMercadoPagoWebhookSignature({
          signatureHeader: `ts=${badTs},v1=${badTsHash}`,
          requestIdHeader,
          dataId,
          secret,
          nowSeconds: now,
        })
      ).toBe(false);

      expect(
        verifyMercadoPagoWebhookSignature({
          signatureHeader: `ts=${ts},v1=0000000000000000000000000000000000000000000000000000000000000000`,
          requestIdHeader,
          dataId,
          secret,
          nowSeconds: now,
        })
      ).toBe(false);
    });

    it('deve aceitar assinatura vazia em ambiente de dev quando secret não estiver configurado', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.MP_WEBHOOK_SECRET;
      expect(
        verifyMercadoPagoWebhookSignature({
          signatureHeader: '',
          secret: undefined,
        })
      ).toBe(true);
    });

    it('deve rejeitar em produção se secret não estiver configurado', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.MP_WEBHOOK_SECRET;
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
      const ts = String(Math.floor(Date.now() / 1000));
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

  describe('mapMercadoPagoStatus() e fetchMercadoPagoPaymentDetails()', () => {
    it('normaliza corretamente status e status_detail da Orders API (/v1/orders)', () => {
      expect(mapMercadoPagoStatus('processed', 'accredited')).toBe('approved');
      expect(mapMercadoPagoStatus('processed', 'refunded')).toBe('refunded');
      expect(mapMercadoPagoStatus('processed', 'charged_back')).toBe('charged_back');
      expect(mapMercadoPagoStatus('action_required', 'waiting_transfer')).toBe('pending');
      expect(mapMercadoPagoStatus('action_required', 'expired')).toBe('cancelled');
      expect(mapMercadoPagoStatus('canceled')).toBe('cancelled');
      expect(mapMercadoPagoStatus('processing', 'waiting_capture')).toBe('authorized');
    });

    it('extrai paymentStatus, statusDetail, externalReference e transactionId no formato da Order #20', async () => {
      process.env.MP_ACCESS_TOKEN = 'test-token-mp';
      const mockFetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'ORDTST01M7CT3ZAZKHHJXSER0A1GCTAR',
          external_reference: '20',
          status: 'processed',
          status_detail: 'accredited',
          total_amount: '0.01',
          total_paid_amount: '0.01',
          transactions: {
            payments: [
              {
                id: 'PAY01M7CT3ZBCE8718PE0KR3DD7JR',
                status: 'processed',
                status_detail: 'accredited',
                payment_method: { id: 'pix', installments: 0, type: 'bank_transfer' },
              },
            ],
          },
        }),
      });
      global.fetch = mockFetch;

      const details = await fetchMercadoPagoPaymentDetails('ORDTST01M7CT3ZAZKHHJXSER0A1GCTAR');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.mercadopago.com/v1/orders/ORDTST01M7CT3ZAZKHHJXSER0A1GCTAR',
        expect.objectContaining({
          headers: { Authorization: 'Bearer test-token-mp' },
        })
      );
      expect(details).toEqual({
        paymentStatus: 'approved',
        rawStatus: 'processed',
        mpOrderStatus: 'processed',
        statusDetail: 'accredited',
        externalReference: '20',
        transactionId: 'PAY01M7CT3ZBCE8718PE0KR3DD7JR',
      });
    });

    it('lança MP_INVALID_RESPONSE quando a API responde sem campo status', async () => {
      process.env.MP_ACCESS_TOKEN = 'test-token-mp';
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'ORDTST_EMPTY' }),
      });

      await expect(fetchMercadoPagoPaymentDetails('ORDTST_EMPTY')).rejects.toThrow(
        'MP_INVALID_RESPONSE'
      );
    });

    it('cobre todos os status de mapMercadoPagoStatus, CNPJ, endereço incompleto, collector_id, erro 401/500/invalid_transaction_amount/rede e assinatura hex inválida', async () => {
      // mapMercadoPagoStatus completo (incluindo status diretos partially_refunded e in_mediation)
      expect(mapMercadoPagoStatus('processed', 'partially_refunded')).toBe('refunded');
      expect(mapMercadoPagoStatus('processed', 'in_mediation')).toBe('charged_back');
      expect(mapMercadoPagoStatus('partially_refunded')).toBe('refunded');
      expect(mapMercadoPagoStatus('in_mediation')).toBe('charged_back');
      expect(mapMercadoPagoStatus('action_required', 'waiting_capture')).toBe('authorized');
      expect(mapMercadoPagoStatus('action_required', 'waiting_retry')).toBe('in_process');
      expect(mapMercadoPagoStatus('created')).toBe('pending');
      expect(mapMercadoPagoStatus('failed')).toBe('rejected');
      expect(mapMercadoPagoStatus('refunded')).toBe('refunded');
      expect(mapMercadoPagoStatus('charged_back')).toBe('charged_back');
      expect(mapMercadoPagoStatus('')).toBe('pending');
      expect(mapMercadoPagoStatus('status_desconhecido')).toBe('status_desconhecido');

      // verifyMercadoPagoWebhookSignature com tamanho diferente e hex inválido
      const secret = 'mp-secret';
      const currentTs = String(Math.floor(Date.now() / 1000));
      expect(
        verifyMercadoPagoWebhookSignature({
          signatureHeader: `ts=${currentTs},v1=abcd`,
          requestIdHeader: 'req-1',
          dataId: '10',
          secret,
        })
      ).toBe(false);
      expect(
        verifyMercadoPagoWebhookSignature({
          signatureHeader: `ts=${currentTs},v1=zzzz`,
          requestIdHeader: 'req-1',
          dataId: '10',
          secret,
        })
      ).toBe(false);

      process.env.MP_ACCESS_TOKEN = 'test-token-mp';

      // CNPJ (14 dígitos), endereço incompleto (ignorado em PIX porque requireComplete=true), e collector_id fallback
      const mockFetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'ORD_CNPJ_01',
          collector_id: 987654,
          status: 'processed',
          status_detail: 'accredited',
          transactions: { payments: [{ id: 'PAY_CNPJ', status: 'processed', payment_method: { id: 'pix' } }] },
        }),
      });
      global.fetch = mockFetch;

      const cnpjRes = await createMercadoPagoPayment({
        order: { id: 88, product_name: 'Kit', total_amount: 100, delivery_address: { city: 'SP' } },
        customer: sampleCustomer,
        paymentMethod: 'pix',
        paymentDetails: {
          payerDocument: '11.222.333/0001-81',
          address: { cep: '01001-000', street: 'Praça da Sé', state: 'SP' }, // falta city -> requireComplete null
        },
      });
      const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(sentBody.payer.identification).toEqual({ type: 'CNPJ', number: '11222333000181' });
      expect(sentBody.payer.address).toBeUndefined();
      expect(cnpjRes.mpPreferenceId).toBe('987654');

      // Erro invalid_transaction_amount via cause legado
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 422,
        text: async () => JSON.stringify({ cause: [{ code: 'invalid_transaction_amount' }] }),
      });
      await expect(
        createMercadoPagoPayment({ order: sampleOrder, customer: sampleCustomer, paymentMethod: 'ticket' })
      ).rejects.toMatchObject({
        statusCode: 422,
        mpCauseCode: 'invalid_transaction_amount',
        userMessage: expect.stringMatching(/fora dos limites/i),
      });

      // Erro HTTP 401
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ message: 'Unauthorized' }),
      });
      await expect(
        createMercadoPagoPayment({ order: sampleOrder, customer: sampleCustomer, paymentMethod: 'pix' })
      ).rejects.toMatchObject({
        statusCode: 401,
        userMessage: expect.stringMatching(/autenticação nas credenciais/i),
      });

      // Erro HTTP 500
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal error',
      });
      await expect(
        createMercadoPagoPayment({ order: sampleOrder, customer: sampleCustomer, paymentMethod: 'pix' })
      ).rejects.toMatchObject({
        statusCode: 500,
        userMessage: expect.stringMatching(/Erro de comunicação/i),
      });

      // Falha de rede no POST /v1/orders
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('ECONNRESET'));
      await expect(
        createMercadoPagoPayment({ order: sampleOrder, customer: sampleCustomer, paymentMethod: 'pix' })
      ).rejects.toMatchObject({
        statusCode: 502,
        userMessage: expect.stringMatching(/Falha de conexão com o Mercado Pago/i),
      });

      // Fallback legado (point_of_interaction, barcode, collector_id ausente), ordem sem ID (UUID),
      // cliente sem nome completo, e erro 422 genérico sem rawCode
      expect(mapMercadoPagoStatus('action_required', 'cancelled')).toBe('cancelled');
      const legacyFetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'ORD_LEGACY_FB',
          status: 'processed',
          date_of_expiration: '2026-12-31T23:59:59Z',
          point_of_interaction: { transaction_data: { qr_code: 'legacy-qr', qr_code_base64: 'legacy-b64' } },
          transaction_details: { external_resource_url: 'https://www.mercadopago.com.br/staging/payments/99/ticket' },
          barcode: { content: '999888' },
        }),
      });
      global.fetch = legacyFetch;
      const legacyRes = await createMercadoPagoPayment({
        order: { total_amount: 10 },
        customer: { name: '', email: 'semnome@test.com' },
        paymentMethod: 'debit_card',
        paymentDetails: {},
      });
      expect(legacyRes.mpPreferenceId).toBeNull();
      expect(legacyRes.paymentPayload.qr_code).toBe('legacy-qr');
      expect(legacyRes.paymentPayload.ticket_url).toBe('https://www.mercadopago.com.br/sandbox/payments/99/ticket');
      expect(legacyRes.paymentPayload.digitable_line).toBe('999888');

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 422,
        text: async () => JSON.stringify({ message: 'Invalid payer' }),
      });
      await expect(
        createMercadoPagoPayment({ order: sampleOrder, customer: sampleCustomer, paymentMethod: 'credit_card' })
      ).rejects.toMatchObject({
        statusCode: 422,
        userMessage: expect.stringMatching(/recusados pelo Mercado Pago/i),
      });
    });
  });

  describe('refundMercadoPagoOrder()', () => {
    it('rejeita identificador inválido com MP_INVALID_ORDER_ID (400)', async () => {
      await expect(refundMercadoPagoOrder('../bad/id')).rejects.toMatchObject({
        code: 'MP_INVALID_ORDER_ID',
        status: 400,
      });
      await expect(refundMercadoPagoOrder('')).rejects.toMatchObject({
        code: 'MP_INVALID_ORDER_ID',
        status: 400,
      });
    });

    it('emula estorno em modo sandbox fora de produção e bloqueia ausência de token/pedido simulado em produção', async () => {
      process.env.NODE_ENV = 'test';
      delete process.env.MP_ACCESS_TOKEN;

      const sandboxRes = await refundMercadoPagoOrder('mp_pix_32_1234', { orderId: 32 });
      expect(sandboxRes).toMatchObject({
        mpOrderId: 'mp_pix_32_1234',
        paymentStatus: 'refunded',
        mpOrderStatus: 'refunded',
        refundMode: 'sandbox',
      });

      process.env.NODE_ENV = 'production';
      await expect(refundMercadoPagoOrder('ORDLIVE01')).rejects.toMatchObject({
        code: 'MP_NOT_CONFIGURED',
        status: 503,
      });

      process.env.MP_ACCESS_TOKEN = 'APP_USR-prod-token';
      await expect(refundMercadoPagoOrder('mp_pix_32_1234')).rejects.toMatchObject({
        code: 'MP_SANDBOX_ORDER_IN_PRODUCTION',
        status: 400,
      });
    });

    it('envia POST /v1/orders/{id}/refund com idempotência e trata sucesso, 401/403, 422, 500 e erro de rede', async () => {
      process.env.NODE_ENV = 'production';
      process.env.MP_ACCESS_TOKEN = 'APP_USR-prod-token';

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            id: 'ORDLIVE99',
            status: 'refunded',
            transactions: { payments: [{ id: 'PAY99', status: 'refunded', status_detail: 'refunded' }] },
          }),
      });

      const okRefund = await refundMercadoPagoOrder('ORDLIVE99', { orderId: 99 });
      expect(okRefund).toMatchObject({
        mpOrderId: 'ORDLIVE99',
        mpTransactionId: 'PAY99',
        paymentStatus: 'refunded',
        mpOrderStatus: 'refunded',
        statusDetail: 'refunded',
        refundMode: 'live',
      });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.mercadopago.com/v1/orders/ORDLIVE99/refund',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer APP_USR-prod-token',
            'X-Idempotency-Key': 'caminhar-refund-99',
          },
          signal: expect.anything(),
        })
      );

      // Recusa de negócio (422)
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 422,
        text: async () => JSON.stringify({ errors: [{ message: 'Order cannot be refunded' }] }),
      });
      await expect(refundMercadoPagoOrder('ORDLIVE99', { orderId: 99 })).rejects.toMatchObject({
        code: 'MP_REFUND_REJECTED',
        status: 422,
        userMessage: expect.stringMatching(/Order cannot be refunded/),
      });

      // Auth 401
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ message: 'Unauthorized' }),
      });
      await expect(refundMercadoPagoOrder('ORDLIVE99')).rejects.toMatchObject({
        code: 'MP_AUTH_ERROR',
        status: 502,
      });

      // Erro 500 do gateway
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'upstream error',
      });
      await expect(refundMercadoPagoOrder('ORDLIVE99')).rejects.toMatchObject({
        code: 'MP_REFUND_UNAVAILABLE',
        status: 502,
      });

      // Erro de rede / timeout
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('ETIMEDOUT'));
      await expect(refundMercadoPagoOrder('ORDLIVE99')).rejects.toMatchObject({
        code: 'MP_REFUND_UNAVAILABLE',
        status: 502,
      });
    });
  });
});
