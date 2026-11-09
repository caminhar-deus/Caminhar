import { createHmac } from 'crypto';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  createMercadoPagoPayment,
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

  it('deve chamar API oficial do Mercado Pago quando MP_ACCESS_TOKEN estiver definido', async () => {
    process.env.MP_ACCESS_TOKEN = 'test-token-mp';

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 99887766,
        collector_id: 112233,
        status: 'pending',
        point_of_interaction: {
          transaction_data: {
            qr_code: 'pix-code-123',
            qr_code_base64: 'base64-image-string',
            ticket_url: 'https://mp.com/ticket',
          },
        },
        barcode: { content: '123456789' },
      }),
    });
    global.fetch = mockFetch;

    const res = await createMercadoPagoPayment({
      order: sampleOrder,
      customer: sampleCustomer,
      paymentMethod: 'pix',
      paymentDetails: { token: 'card-token', installments: 2 },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.mercadopago.com/v1/payments',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token-mp',
        }),
      })
    );

    expect(res.mpPaymentId).toBe('99887766');
    expect(res.mpPreferenceId).toBe('112233');
    expect(res.paymentPayload.qr_code).toBe('pix-code-123');
    expect(res.paymentPayload.digitable_line).toBe('123456789');
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
  });
});
