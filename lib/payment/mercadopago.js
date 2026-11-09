import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Cria uma cobrança no Mercado Pago para um pedido interno (PIX, débito, crédito ou boleto).
 * Em ambiente de desenvolvimento/teste sem `MP_ACCESS_TOKEN`, gera resposta estruturada de sandbox.
 */
export async function createMercadoPagoPayment({
  order,
  customer,
  paymentMethod,
  paymentDetails = {},
}) {
  const accessToken = process.env.MP_ACCESS_TOKEN;

  if (accessToken && typeof global.fetch === 'function') {
    const mpMethodId =
      paymentMethod === 'pix'
        ? 'pix'
        : paymentMethod === 'ticket'
          ? paymentDetails.paymentMethodId || 'bolbradesco'
          : paymentDetails.paymentMethodId || paymentMethod;

    const body = {
      transaction_amount: Number(order.total_amount),
      description: `Pedido #${order.id} — ${order.product_name}`,
      payment_method_id: mpMethodId,
      external_reference: String(order.id),
      payer: {
        email: customer.email,
        first_name: customer.name?.split(' ')[0] || 'Cliente',
        last_name: customer.name?.split(' ').slice(1).join(' ') || 'Caminhar',
      },
    };

    if (paymentDetails.token) {
      body.token = paymentDetails.token;
    }
    if (paymentDetails.installments) {
      body.installments = Number(paymentDetails.installments) || 1;
    }

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `caminhar-order-${order.id}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`MP_API_ERROR: ${response.status} ${errBody}`);
    }

    const mpData = await response.json();
    const txData = mpData.point_of_interaction?.transaction_data || {};

    return {
      mpPaymentId: String(mpData.id),
      mpPreferenceId: mpData.collector_id ? String(mpData.collector_id) : null,
      paymentStatus: mpData.status || 'pending',
      paymentPayload: {
        qr_code: txData.qr_code || null,
        qr_code_base64: txData.qr_code_base64 || null,
        ticket_url: txData.ticket_url || mpData.transaction_details?.external_resource_url || null,
        digitable_line: mpData.barcode?.content || null,
      },
    };
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('MP_NOT_CONFIGURED');
  }

  // Modo sandbox local para desenvolvimento e testes automatizados
  const nowSuffix = `${order.id}_${Date.now()}`;

  if (paymentMethod === 'pix') {
    return {
      mpPaymentId: `mp_pix_${nowSuffix}`,
      mpPreferenceId: null,
      paymentStatus: 'pending',
      paymentPayload: {
        qr_code: `00020126580014BR.GOV.BCB.PIX0136caminhar-pedido-${order.id}520400005303986540${Number(order.total_amount).toFixed(2)}`,
        qr_code_base64: null,
      },
    };
  }

  if (paymentMethod === 'ticket') {
    return {
      mpPaymentId: `mp_bol_${nowSuffix}`,
      mpPreferenceId: null,
      paymentStatus: 'pending',
      paymentPayload: {
        digitable_line: `23793.38128 60000.000003 00000.000400 1 999900000${Math.round(Number(order.total_amount) * 100)}`,
        ticket_url: `/minha-conta?pedido=${order.id}`,
      },
    };
  }

  return {
    mpPaymentId: `mp_card_${nowSuffix}`,
    mpPreferenceId: null,
    paymentStatus: 'approved',
    paymentPayload: {
      installments: Number(paymentDetails.installments) || 1,
      card_last_digits: String(paymentDetails.cardNumber || '0000').slice(-4),
    },
  };
}

/**
 * Valida a assinatura HMAC-SHA256 enviada pelo Mercado Pago no header `x-signature`.
 */
export function verifyMercadoPagoWebhookSignature({
  signatureHeader,
  requestIdHeader = '',
  dataId = '',
  secret = process.env.MP_WEBHOOK_SECRET,
}) {
  if (!secret) {
    // Em ambiente sem segredo configurado (dev/test), permite apenas fora de produção
    return process.env.NODE_ENV !== 'production';
  }
  if (!signatureHeader || typeof signatureHeader !== 'string') {
    return false;
  }

  const parts = {};
  for (const piece of signatureHeader.split(',')) {
    const [k, v] = piece.trim().split('=');
    if (k && v) parts[k] = v;
  }

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) {
    return false;
  }

  const manifest = `id:${dataId};request-id:${requestIdHeader};ts:${ts};`;
  const computed = createHmac('sha256', secret).update(manifest).digest('hex');

  try {
    const bufA = Buffer.from(computed, 'hex');
    const bufB = Buffer.from(v1, 'hex');
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
