import { describe, it, expect } from '@jest/globals';
import {
  getPaymentFeedback,
  formatCpfCnpj,
  isValidCpfCnpjDigits,
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

  it('formata e valida CPF e CNPJ rejeitando sequências repetidas', () => {
    expect(formatCpfCnpj('19119119100')).toBe('191.191.191-00');
    expect(formatCpfCnpj('12345678000195')).toBe('12.345.678/0001-95');
    expect(isValidCpfCnpjDigits('191.191.191-00')).toBe(true);
    expect(isValidCpfCnpjDigits('12345678000195')).toBe(true);
    expect(isValidCpfCnpjDigits('11111111111')).toBe(false);
    expect(isValidCpfCnpjDigits('12345')).toBe(false);
  });
});
