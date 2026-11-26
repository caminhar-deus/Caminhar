/**
 * Mapeia status e detalhes de retorno do Mercado Pago para feedback claro em pt-BR.
 * Compartilhado entre `/checkout/[id]`, `/minha-conta`, API e domínio de pedidos.
 */

export const MIN_PAYMENT_METHOD_AMOUNTS = Object.freeze({
  pix: 0.01,
  debit_card: 0.5,
  credit_card: 0.5,
  ticket: 4.0,
});

const REJECTION_DETAIL_MESSAGES = {
  cc_rejected_insufficient_amount:
    'Pagamento recusado por saldo ou limite insuficiente no cartão.',
  insufficient_amount:
    'Pagamento recusado por saldo ou limite insuficiente no cartão.',
  cc_rejected_bad_filled_security_code:
    'Código de segurança (CVV) inválido. Confira os dígitos no verso do cartão.',
  invalid_security_code:
    'Código de segurança (CVV) inválido. Confira os dígitos no verso do cartão.',
  cc_rejected_bad_filled_date:
    'Data de validade do cartão inválida. Verifique mês e ano informados.',
  expired_card:
    'Cartão vencido ou data de validade inválida. Verifique mês e ano informados.',
  cc_rejected_bad_filled_card_number:
    'Número do cartão incorreto ou inválido para esta bandeira.',
  cc_rejected_bad_filled_other:
    'Algum dado do cartão ou titular está incorreto. Revise os campos e tente novamente.',
  bad_filled_card_data:
    'Algum dado do cartão ou código de segurança está incorreto. Revise os campos e tente novamente.',
  cc_rejected_call_for_authorize:
    'A operadora solicitou autorização prévia. Entre em contato com o banco emissor do cartão.',
  required_call_for_authorize:
    'A operadora solicitou autorização prévia. Entre em contato com o banco emissor do cartão.',
  cc_rejected_high_risk:
    'Pagamento recusado pela análise antifraude. Recomendamos tentar com outro cartão ou via PIX.',
  high_risk:
    'Pagamento recusado pela análise antifraude. Recomendamos tentar com outro cartão ou via PIX.',
  cc_rejected_card_disabled:
    'Este cartão está desabilitado para compras online. Contate o banco ou utilize outro meio.',
  card_disabled:
    'Este cartão está desabilitado para compras online. Contate o banco ou utilize outro meio.',
  cc_rejected_max_attempts:
    'Limite de tentativas excedido para este cartão.',
  max_attempts_exceeded:
    'Limite de tentativas excedido para este cartão.',
  cc_rejected_other_reason:
    'Pagamento recusado pela operadora do cartão. Tente outro meio de pagamento.',
  rejected_by_issuer:
    'Pagamento recusado pela operadora do cartão. Tente outro cartão ou outro meio de pagamento.',
  rejected_by_bank:
    'Pagamento recusado pelo banco emissor. Tente outro cartão ou outro meio de pagamento.',
};

const IN_PROCESS_DETAIL_MESSAGES = {
  in_process:
    'Pagamento em análise pelo Mercado Pago. A confirmação será atualizada automaticamente em instantes.',
  waiting_retry:
    'Pagamento em reprocessamento automático pelo Mercado Pago. Aguarde alguns instantes.',
  pending_contingency:
    'Pagamento em análise pelo Mercado Pago. A confirmação será atualizada automaticamente em instantes.',
  pending_review_manual:
    'Pagamento em revisão manual de segurança. Acompanhe a atualização nesta página ou em Minha Conta.',
};

export function getPaymentFeedback(order) {
  if (!order) {
    return {
      tone: 'info',
      title: 'Status desconhecido',
      description: 'Não foi possível identificar o status atual do pagamento.',
    };
  }

  const status = order.payment_status || 'pending';
  const method = order.payment_method;
  const detail = order.payment_payload?.status_detail || '';

  if (status === 'approved') {
    return {
      tone: 'success',
      title: `Pedido #${order.id} confirmado e pago!`,
      description:
        'Pagamento aprovado pelo Mercado Pago. Seu pedido já foi encaminhado para preparação e envio.',
    };
  }

  if (status === 'in_process' || status === 'authorized') {
    return {
      tone: 'warning',
      title: `Pedido #${order.id} em análise`,
      description:
        IN_PROCESS_DETAIL_MESSAGES[detail] ||
        'Seu pagamento está em processamento pelo Mercado Pago. Assim que confirmado, o status será atualizado automaticamente.',
    };
  }

  if (status === 'rejected') {
    return {
      tone: 'error',
      title: `Pagamento recusado no Pedido #${order.id}`,
      description:
        REJECTION_DETAIL_MESSAGES[detail] ||
        'O pagamento foi recusado e nenhum valor foi cobrado. O estoque reservado foi liberado e você pode tentar novamente.',
    };
  }

  if (status === 'cancelled') {
    return {
      tone: 'error',
      title: `Pedido #${order.id} cancelado`,
      description:
        order.payment_payload?.error_reason ||
        'Este pagamento foi cancelado e o estoque foi devolvido automaticamente.',
    };
  }

  if (status === 'refunded' || status === 'charged_back') {
    return {
      tone: 'warning',
      title: `Pagamento ${status === 'refunded' ? 'estornado' : 'contestado'} (Pedido #${order.id})`,
      description:
        'O Mercado Pago notificou o estorno ou contestação desta cobrança.',
    };
  }

  if (method === 'pix') {
    return {
      tone: 'info',
      title: `Pedido #${order.id} aguardando pagamento via PIX`,
      description:
        'Escaneie o QR Code ou copie o código PIX Copia e Cola abaixo. A aprovação é confirmada automaticamente após o pagamento.',
    };
  }

  if (method === 'ticket') {
    return {
      tone: 'info',
      title: `Boleto gerado para o Pedido #${order.id}`,
      description:
        'Utilize a linha digitável ou abra o boleto bancário. A compensação pode levar até 2 dias úteis após o pagamento.',
    };
  }

  return {
    tone: 'info',
    title: `Pedido #${order.id} aguardando confirmação`,
    description:
      'O pagamento está pendente de confirmação pelo Mercado Pago.',
  };
}

export function formatCpfCnpj(rawValue) {
  const digits = String(rawValue || '').replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function isValidCpfCnpjDigits(rawValue) {
  const digits = String(rawValue || '').replace(/\D/g, '');
  if (digits.length !== 11 && digits.length !== 14) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  if (digits.length === 11) {
    for (let t = 9; t < 11; t += 1) {
      let sum = 0;
      for (let i = 0; i < t; i += 1) {
        sum += Number(digits[i]) * (t + 1 - i);
      }
      const dv = ((sum * 10) % 11) % 10;
      if (dv !== Number(digits[t])) return false;
    }
    return true;
  }

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const calcCnpjDigit = (weights) => {
    const remainder =
      weights.reduce((acc, weight, idx) => acc + Number(digits[idx]) * weight, 0) % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  return (
    calcCnpjDigit(weights1) === Number(digits[12]) &&
    calcCnpjDigit(weights2) === Number(digits[13])
  );
}

const MP_HOST_PATTERN = /(^|\.)mercadopago\.(com(\.[a-z]{2})?|[a-z]{2})$/i;

/**
 * Normaliza URLs de ticket/boleto retornadas em sandbox pela Orders API do Mercado Pago:
 * boletos de teste têm sido emitidos com `/staging/payments/...` (rota interna que retorna
 * 503/500 externo), enquanto `/sandbox/payments/...` carrega o PDF válido do boleto.
 * Links de produção (`/payments/...`) e rotas relativas locais são preservados intactos.
 */
export function normalizeMercadoPagoTicketUrl(rawUrl) {
  if (typeof rawUrl !== 'string') return rawUrl || null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('/')) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (MP_HOST_PATTERN.test(parsed.hostname) && parsed.pathname.startsWith('/staging/payments/')) {
      parsed.pathname = `/sandbox/${parsed.pathname.slice('/staging/'.length)}`;
      return parsed.toString();
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}
