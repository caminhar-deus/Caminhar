import { createHmac, randomUUID, timingSafeEqual } from 'crypto';

/**
 * Cria uma ordem/cobrança no Mercado Pago (Orders API `/v1/orders` — PIX, débito/pré-pago, crédito ou boleto).
 * Em ambiente de desenvolvimento/teste sem `MP_ACCESS_TOKEN`, gera resposta estruturada de sandbox.
 */
const MP_PAYMENT_CREATE_TIMEOUT_MS = 15000;

function mapMercadoPagoStatus(rawStatus, rawDetail = '') {
  const status = String(rawStatus || '').trim().toLowerCase();
  const detail = String(rawDetail || '').trim().toLowerCase();

  switch (status) {
    case 'processed':
      return detail === 'refunded' ? 'refunded' : 'approved';
    case 'processing':
      return 'in_process';
    case 'action_required':
      if (detail === 'waiting_capture') return 'authorized';
      if (detail === 'waiting_retry') return 'in_process';
      return 'pending';
    case 'created':
      return 'pending';
    case 'failed':
      return 'rejected';
    case 'canceled':
    case 'cancelled':
    case 'expired':
      return 'cancelled';
    case 'refunded':
      return 'refunded';
    case 'charged_back':
      return 'charged_back';
    default:
      return status || 'pending';
  }
}

function tryParseJson(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  try {
    return JSON.parse(rawText);
  } catch {
    return null;
  }
}

function parseMercadoPagoError(status, errBody = '') {
  const parsed = tryParseJson(errBody);
  const firstOrderError = parsed?.errors?.[0] || null;
  const firstLegacyCause = parsed?.cause?.[0] || null;
  const rawCode = firstOrderError?.code || firstLegacyCause?.code || null;

  let userMessage = 'Erro de comunicação com o Mercado Pago ao iniciar o pagamento.';

  if (rawCode === 'payment_method_not_allowed_for_collector') {
    userMessage =
      'Este meio de pagamento (como débito direto na bandeira) não está habilitado para recebimento nesta conta do Mercado Pago. Tente cartão de crédito, pré-pago, PIX ou boleto.';
  } else if (rawCode === 'invalid_transaction_amount') {
    userMessage =
      'O valor ou parcelamento selecionado está fora dos limites permitidos para este meio de pagamento no Mercado Pago (mínimo de R$ 0,01 para PIX, R$ 0,50 para cartão e R$ 4,00 para boleto).';
  } else if (status === 401) {
    userMessage =
      'Falha de autenticação nas credenciais do Mercado Pago para a Orders API. Confira Access Token e permissões da aplicação.';
  } else if (status === 400 || status === 422) {
    userMessage =
      'Dados de pagamento ou comprador recusados pelo Mercado Pago. Verifique CPF/CNPJ, endereço e os dados do meio de pagamento.';
  }

  const error = new Error(`MP_API_ERROR: ${status} ${errBody}`);
  error.statusCode = status;
  error.mpCauseCode = rawCode;
  error.userMessage = userMessage;
  return error;
}

function buildPayerIdentification(payerDocument) {
  const digits = String(payerDocument || '').replace(/\D/g, '');
  if (digits.length === 11) {
    return { type: 'CPF', number: digits };
  }
  if (digits.length === 14) {
    return { type: 'CNPJ', number: digits };
  }
  return null;
}

function buildPayerAddress(address, { requireComplete = false } = {}) {
  if (!address || typeof address !== 'object') return null;
  const zipCode = String(address.cep || address.zip_code || '').replace(/\D/g, '');
  const streetName = String(address.street || address.street_name || '').trim();
  const streetNumber = String(address.number || address.street_number || 'S/N').trim();
  const neighborhood = String(address.neighborhood || 'Centro').trim();
  const city = String(address.city || '').trim();
  const state = String(address.state || address.federal_unit || '')
    .trim()
    .toUpperCase()
    .slice(0, 2);

  if (!zipCode && !streetName) return null;
  if (requireComplete && (!zipCode || !streetName || !city || state.length !== 2)) {
    return null;
  }

  return {
    ...(zipCode ? { zip_code: zipCode } : {}),
    ...(streetName ? { street_name: streetName } : {}),
    street_number: streetNumber,
    neighborhood,
    ...(city ? { city } : {}),
    ...(state ? { state } : {}),
  };
}

function buildOrderPaymentMethodSpec({ paymentMethod, paymentDetails, fallbackMethodId }) {
  if (paymentMethod === 'pix') {
    return { id: 'pix', type: 'bank_transfer' };
  }
  if (paymentMethod === 'ticket') {
    return { id: fallbackMethodId || 'bolbradesco', type: 'ticket' };
  }

  const explicitType = paymentDetails.paymentTypeId;
  const cardType =
    explicitType === 'credit_card' ||
    explicitType === 'debit_card' ||
    explicitType === 'prepaid_card'
      ? explicitType
      : paymentMethod === 'debit_card'
        ? 'debit_card'
        : 'credit_card';

  const spec = {
    id: fallbackMethodId || (paymentMethod === 'debit_card' ? 'debelo' : 'visa'),
    type: cardType,
    ...(paymentDetails.token ? { token: paymentDetails.token } : {}),
  };

  if (cardType !== 'prepaid_card') {
    spec.installments = Number(paymentDetails.installments) || 1;
  }

  return spec;
}

function normalizeOrderResponse(orderData, fallbackMethodId, { forceRejected = false } = {}) {
  const tx = orderData?.transactions?.payments?.[0] || {};
  const txPm = tx.payment_method || {};
  const legacyTxData = orderData?.point_of_interaction?.transaction_data || {};
  const statusDetail = tx.status_detail || orderData?.status_detail || null;
  const resolvedStatus = forceRejected
    ? 'rejected'
    : mapMercadoPagoStatus(orderData?.status || tx.status, statusDetail);

  return {
    mpPaymentId: String(orderData.id),
    mpPreferenceId: orderData.user_id
      ? String(orderData.user_id)
      : orderData.collector_id
        ? String(orderData.collector_id)
        : null,
    paymentStatus: resolvedStatus,
    paymentPayload: {
      qr_code: txPm.qr_code || legacyTxData.qr_code || null,
      qr_code_base64: txPm.qr_code_base64 || legacyTxData.qr_code_base64 || null,
      ticket_url:
        txPm.ticket_url ||
        legacyTxData.ticket_url ||
        orderData?.transaction_details?.external_resource_url ||
        null,
      digitable_line:
        txPm.digitable_line || txPm.barcode_content || orderData?.barcode?.content || null,
      barcode_content: txPm.barcode_content || null,
      status_detail: statusDetail,
      mp_order_status: orderData?.status || null,
      mp_transaction_id: tx.id ? String(tx.id) : null,
      payment_method_id: txPm.id || orderData?.payment_method_id || fallbackMethodId,
      payment_type_id: txPm.type || null,
      date_of_expiration: tx.date_of_expiration || orderData?.date_of_expiration || null,
    },
  };
}

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
          : paymentDetails.paymentMethodId || (paymentMethod === 'debit_card' ? 'debelo' : 'visa');

    const fullName = String(customer.name || '').trim();
    const firstName = fullName.split(' ')[0] || 'Cliente';
    const lastName = fullName.split(' ').slice(1).join(' ') || 'Caminhar';

    const payer = {
      email: customer.email,
      first_name: firstName,
      last_name: lastName,
    };

    const identification = buildPayerIdentification(paymentDetails.payerDocument);
    if (identification) {
      payer.identification = identification;
    }

    const payerAddress = buildPayerAddress(
      paymentDetails.address || order.delivery_address || order.shipping_address,
      { requireComplete: paymentMethod !== 'ticket' }
    );
    if (payerAddress) {
      payer.address = payerAddress;
    }

    const formattedAmount = Number(order.total_amount).toFixed(2);
    const paymentMethodSpec = buildOrderPaymentMethodSpec({
      paymentMethod,
      paymentDetails,
      fallbackMethodId: mpMethodId,
    });

    const body = {
      type: 'online',
      processing_mode: 'automatic',
      total_amount: formattedAmount,
      external_reference: String(order.id ?? ''),
      description: `Pedido #${order.id} — ${order.product_name || 'Produto'}`.slice(0, 250),
      payer,
      transactions: {
        payments: [
          {
            amount: formattedAmount,
            payment_method: paymentMethodSpec,
          },
        ],
      },
    };

    const idempotencyKey = order?.id ? `caminhar-order-${order.id}` : randomUUID();

    let response;
    try {
      response = await fetch('https://api.mercadopago.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(MP_PAYMENT_CREATE_TIMEOUT_MS),
      });
    } catch (networkError) {
      const error = new Error(
        `MP_API_ERROR: falha de rede ao criar pagamento (${networkError?.name || 'erro'})`,
        { cause: networkError }
      );
      error.statusCode = 502;
      error.userMessage =
        'Falha de conexão com o Mercado Pago ao processar o pagamento. Tente novamente em instantes.';
      throw error;
    }

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      const parsedErr = response.status === 402 ? tryParseJson(errBody) : null;
      if (response.status === 402 && parsedErr?.data?.id) {
        return normalizeOrderResponse(parsedErr.data, mpMethodId, { forceRejected: true });
      }
      throw parseMercadoPagoError(response.status, errBody);
    }

    const mpData = await response.json();
    return normalizeOrderResponse(mpData, mpMethodId);
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

const MP_STATUS_LOOKUP_TIMEOUT_MS = 8000;

/**
 * Consulta na API do Mercado Pago o status real de uma Order (`/v1/orders/{id}`) ou pagamento legado
 * (`/v1/payments/{id}`) e normaliza para os status do domínio (`approved`, `pending`, `in_process`,
 * `authorized`, `rejected`, `cancelled`, `refunded`, `charged_back`).
 */
export async function fetchMercadoPagoPaymentStatus(paymentId, { eventType } = {}) {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken || typeof global.fetch !== 'function') {
    throw new Error('MP_NOT_CONFIGURED');
  }

  const normalizedId = String(paymentId || '').trim();
  const isOrderLookup = eventType === 'order' || /^ORD/i.test(normalizedId);
  const endpoint = isOrderLookup
    ? `https://api.mercadopago.com/v1/orders/${encodeURIComponent(normalizedId)}`
    : `https://api.mercadopago.com/v1/payments/${encodeURIComponent(normalizedId)}`;

  let response;
  try {
    response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(MP_STATUS_LOOKUP_TIMEOUT_MS),
    });
  } catch (error) {
    throw new Error(`MP_API_ERROR: falha de rede ao consultar pagamento (${error?.name || 'erro'})`, {
      cause: error,
    });
  }

  if (!response.ok) {
    throw new Error(`MP_API_ERROR: consulta de pagamento retornou HTTP ${response.status}`);
  }

  const data = await response.json().catch(() => null);
  if (!data || typeof data.status !== 'string' || !data.status) {
    throw new Error('MP_INVALID_RESPONSE: pagamento sem status');
  }

  const detail = data?.transactions?.payments?.[0]?.status_detail || data?.status_detail || '';
  return mapMercadoPagoStatus(data.status, detail);
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
    const trimmed = piece.trim();
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      const k = trimmed.slice(0, eqIndex).trim();
      const v = trimmed.slice(eqIndex + 1).trim();
      if (k && v) parts[k] = v;
    }
  }

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) {
    return false;
  }

  // Especificação v2 do Mercado Pago: valores alfanuméricos de `data.id` no manifesto devem ir em minúsculas.
  const normalizedDataId = String(dataId || '').toLowerCase();
  const manifest = `id:${normalizedDataId};request-id:${requestIdHeader};ts:${ts};`;
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
