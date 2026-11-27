import { describe, it, expect } from '@jest/globals';
import {
  formatGatewayPaymentDetail,
  getPaymentFeedback,
  formatCpfCnpj,
  isDebitCardEnabled,
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

  it('retorna orientações corretas para PIX e Boleto pendentes e fallbacks de status/objeto ausente', () => {
    const unknown = getPaymentFeedback(null);
    expect(unknown.tone).toBe('info');
    expect(unknown.title).toBe('Status desconhecido');

    const pix = getPaymentFeedback({ id: 14, payment_status: 'pending', payment_method: 'pix' });
    expect(pix.tone).toBe('info');
    expect(pix.description).toMatch(/QR Code/i);

    const boleto = getPaymentFeedback({ id: 15, payment_status: 'pending', payment_method: 'ticket' });
    expect(boleto.tone).toBe('info');
    expect(boleto.description).toMatch(/linha digitável/i);

    const pendingCard = getPaymentFeedback({ id: 16, payment_status: 'pending', payment_method: 'credit_card' });
    expect(pendingCard.tone).toBe('info');
    expect(pendingCard.title).toMatch(/aguardando confirmação/i);

    const authorized = getPaymentFeedback({ id: 17, payment_status: 'authorized', payment_method: 'credit_card' });
    expect(authorized.tone).toBe('warning');
    expect(authorized.title).toMatch(/em análise/i);

    const chargedBack = getPaymentFeedback({ id: 18, payment_status: 'charged_back', payment_method: 'credit_card' });
    expect(chargedBack.tone).toBe('warning');
    expect(chargedBack.title).toMatch(/contestado/i);

    const cancelledDefault = getPaymentFeedback({ id: 19, payment_status: 'cancelled', payment_method: 'ticket' });
    expect(cancelledDefault.tone).toBe('error');
    expect(cancelledDefault.description).toMatch(/cancelado e o estoque/i);

    const cancelledReason = getPaymentFeedback({
      id: 20,
      payment_status: 'cancelled',
      payment_method: 'ticket',
      payment_payload: { error_reason: 'Boleto expirado pelo banco.' },
    });
    expect(cancelledReason.tone).toBe('error');
    expect(cancelledReason.description).toBe('Boleto expirado pelo banco.');

    const rejectedGeneric = getPaymentFeedback({ id: 21, payment_status: 'rejected', payment_method: 'credit_card' });
    expect(rejectedGeneric.tone).toBe('error');
    expect(rejectedGeneric.description).toMatch(/pagamento foi recusado/i);
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

  it('avalia corretamente a flag comercial isDebitCardEnabled mantendo padrão habilitado', () => {
    expect(isDebitCardEnabled(undefined)).toBe(true);
    expect(isDebitCardEnabled(null)).toBe(true);
    expect(isDebitCardEnabled('')).toBe(true);
    expect(isDebitCardEnabled('   ')).toBe(true);
    expect(isDebitCardEnabled('true')).toBe(true);
    expect(isDebitCardEnabled('1')).toBe(true);
    expect(isDebitCardEnabled('false')).toBe(false);
    expect(isDebitCardEnabled(' FALSE ')).toBe(false);
    expect(isDebitCardEnabled('0')).toBe(false);
    expect(isDebitCardEnabled('off')).toBe(false);
    expect(isDebitCardEnabled('no')).toBe(false);
  });

  it('formata bandeira e tipo processados pelo Mercado Pago via formatGatewayPaymentDetail', () => {
    expect(formatGatewayPaymentDetail(null)).toBeNull();
    expect(formatGatewayPaymentDetail({})).toBeNull();
    expect(
      formatGatewayPaymentDetail({ payment_method_id: 'elo', payment_type_id: 'prepaid_card' })
    ).toBe('Pré-pago — Elo');
    expect(
      formatGatewayPaymentDetail({ payment_method_id: 'master', payment_type_id: 'credit_card' })
    ).toBe('Crédito — Mastercard');
    expect(
      formatGatewayPaymentDetail({ payment_method_id: 'debelo', payment_type_id: 'debit_card' })
    ).toBe('Elo Débito');
    expect(
      formatGatewayPaymentDetail({ payment_method_id: 'pix', payment_type_id: 'bank_transfer' })
    ).toBe('PIX');
    expect(
      formatGatewayPaymentDetail({ payment_method_id: 'bolbradesco', payment_type_id: 'ticket' })
    ).toBe('Boleto — Bradesco');
    expect(formatGatewayPaymentDetail({ payment_method_id: 'cabali' })).toBe('cabali');
  });
});
