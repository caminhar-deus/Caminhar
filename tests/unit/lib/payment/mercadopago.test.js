import { createHmac } from 'crypto';
import { describe, it, expect } from '@jest/globals';
import {
  createMercadoPagoPayment,
  verifyMercadoPagoWebhookSignature,
} from '../../../../lib/payment/mercadopago.js';

describe('Integração Mercado Pago — lib/payment/mercadopago.js', () => {
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
    const res = await createMercadoPagoPayment({
      order: sampleOrder,
      customer: sampleCustomer,
      paymentMethod: 'ticket',
    });

    expect(res.mpPaymentId).toMatch(/^mp_bol_55_/);
    expect(res.paymentStatus).toBe('pending');
    expect(res.paymentPayload.digitable_line).toBeTruthy();
  });

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
});
