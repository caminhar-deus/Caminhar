import { describe, it, expect } from '@jest/globals';
import {
  getPaymentFeedback,
  formatCpfCnpj,
  isValidCpfCnpjDigits,
  normalizeMercadoPagoTicketUrl,
} from '../../../../lib/payment/payment-status-messages.js';

describe('payment-status-messages — feedback e validação de documento', () => {
  it('retorna feedback de sucesso para pagamento aprovado', () => {
    const fb = getPaymentFeedback({ id: 10, payment_status: 'approved', payment_method: 'pix' });
    expect(fb.tone).toBe('success');
    expect(fb.title).toContain('#10');
  });

  it('retorna mensagem específica para recusa por saldo insuficiente no cartão (legado e Orders API)', () => {
    const fb = getPaymentFeedback({
      id: 11,
      payment_status: 'rejected',
      payment_method: 'credit_card',
      payment_payload: { status_detail: 'cc_rejected_insufficient_amount' },
    });
    expect(fb.tone).toBe('error');
    expect(fb.description).toMatch(/saldo ou limite insuficiente/i);

    const fbOrders = getPaymentFeedback({
      id: 112,
      payment_status: 'rejected',
      payment_method: 'credit_card',
      payment_payload: { status_detail: 'insufficient_amount' },
    });
    expect(fbOrders.tone).toBe('error');
    expect(fbOrders.description).toMatch(/saldo ou limite insuficiente/i);

    const fbIssuer = getPaymentFeedback({
      id: 113,
      payment_status: 'rejected',
      payment_method: 'credit_card',
      payment_payload: { status_detail: 'rejected_by_issuer' },
    });
    expect(fbIssuer.tone).toBe('error');
    expect(fbIssuer.description).toMatch(/operadora do cartão/i);
  });

  it('retorna aviso claro para pagamento em análise e estorno', () => {
    const inProc = getPaymentFeedback({
      id: 12,
      payment_status: 'in_process',
      payment_method: 'credit_card',
      payment_payload: { status_detail: 'pending_review_manual' },
    });
    expect(inProc.tone).toBe('warning');

    const refunded = getPaymentFeedback({
      id: 13,
      payment_status: 'refunded',
      payment_method: 'credit_card',
    });
    expect(refunded.tone).toBe('warning');
    expect(refunded.title).toMatch(/estornado/i);
  });

  it('retorna orientações corretas para PIX e Boleto pendentes', () => {
    const pix = getPaymentFeedback({ id: 14, payment_status: 'pending', payment_method: 'pix' });
    expect(pix.tone).toBe('info');
    expect(pix.description).toMatch(/QR Code/i);

    const boleto = getPaymentFeedback({ id: 15, payment_status: 'pending', payment_method: 'ticket' });
    expect(boleto.tone).toBe('info');
    expect(boleto.description).toMatch(/linha digitável/i);
  });

  it('formata e valida CPF e CNPJ aplicando dígitos verificadores (módulo 11) e rejeitando repetidos', () => {
    expect(formatCpfCnpj('19119119100')).toBe('191.191.191-00');
    expect(formatCpfCnpj('12345678000195')).toBe('12.345.678/0001-95');
    expect(isValidCpfCnpjDigits('191.191.191-00')).toBe(true);
    expect(isValidCpfCnpjDigits('12345678909')).toBe(true);
    expect(isValidCpfCnpjDigits('12345678000195')).toBe(true);
    expect(isValidCpfCnpjDigits('11.222.333/0001-81')).toBe(true);
    expect(isValidCpfCnpjDigits('11111111111')).toBe(false);
    expect(isValidCpfCnpjDigits('12345678900')).toBe(false);
    expect(isValidCpfCnpjDigits('12345678000100')).toBe(false);
    expect(isValidCpfCnpjDigits('12345')).toBe(false);
  });

  it('normaliza URLs /staging/payments/ do Mercado Pago para /sandbox/payments/ preservando parâmetros e domínios válidos', () => {
    const stagingUrl =
      'https://www.mercadopago.com.br/staging/payments/189650364540/ticket?caller_id=3845624858&payment_method_id=bolbradesco&payment_id=189650364540&payment_method_reference_id=6010877038&hash=57246646-0bce-4389-89c6-5fc7b9542f44';
    const expectedSandboxUrl =
      'https://www.mercadopago.com.br/sandbox/payments/189650364540/ticket?caller_id=3845624858&payment_method_id=bolbradesco&payment_id=189650364540&payment_method_reference_id=6010877038&hash=57246646-0bce-4389-89c6-5fc7b9542f44';

    expect(normalizeMercadoPagoTicketUrl(stagingUrl)).toBe(expectedSandboxUrl);
    expect(normalizeMercadoPagoTicketUrl(`  ${stagingUrl}  `)).toBe(expectedSandboxUrl);
    expect(normalizeMercadoPagoTicketUrl(expectedSandboxUrl)).toBe(expectedSandboxUrl);
  });

  it('preserva URLs de produção, domínios externos, rotas relativas e trata valores inválidos', () => {
    const prodUrl =
      'https://www.mercadopago.com.br/payments/189650364540/ticket?caller_id=3845624858&hash=abc';
    const otherHostUrl = 'https://example.com/staging/payments/189650364540/ticket';

    expect(normalizeMercadoPagoTicketUrl(prodUrl)).toBe(prodUrl);
    expect(normalizeMercadoPagoTicketUrl(otherHostUrl)).toBe(otherHostUrl);
    expect(normalizeMercadoPagoTicketUrl('/minha-conta?pedido=21')).toBe('/minha-conta?pedido=21');
    expect(normalizeMercadoPagoTicketUrl('not a valid url')).toBe('not a valid url');
    expect(normalizeMercadoPagoTicketUrl(null)).toBeNull();
    expect(normalizeMercadoPagoTicketUrl('')).toBeNull();
    expect(normalizeMercadoPagoTicketUrl('   ')).toBeNull();
  });
});
