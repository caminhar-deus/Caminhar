import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { normalizeMercadoPagoTicketUrl } from './payment-status-messages.js';

/**
 * Cria uma ordem/cobrança no Mercado Pago (Orders API `/v1/orders` — PIX, débito/pré-pago, crédito ou boleto).
 * Em ambiente de desenvolvimento/teste sem `MP_ACCESS_TOKEN`, gera resposta estruturada de sandbox.
 */
const MP_PAYMENT_CREATE_TIMEOUT_MS = 15000;

export function mapMercadoPagoStatus(rawStatus, rawDetail = '') {
  const status = String(rawStatus || '').trim().toLowerCase();
  const detail = String(rawDetail || '').trim().toLowerCase();

  switch (status) {
    case 'processed':
      if (detail === 'refunded' || detail === 'partially_refunded') return 'refunded';
      if (detail === 'charged_back' || detail === 'in_mediation') return 'charged_back';
      return 'approved';
    case 'processing':
      return detail === 'waiting_capture' ? 'authorized' : 'in_process';
    case 'action_required':
      if (detail === 'waiting_capture') return 'authorized';
      if (detail === 'waiting_retry') return 'in_process';
      if (detail === 'expired' || detail === 'canceled' || detail === 'cancelled') return 'cancelled';
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
    case 'partially_refunded':
      return 'refunded';
    case 'charged_back':
    case 'in_mediation':
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

function getPaymentPriority(payment) {
  const status = mapMercadoPagoStatus(payment?.status, payment?.status_detail);
  if (status === 'approved') return 5;
  if (status === 'refunded' || status === 'charged_back') return 4;
  if (status === 'authorized' || status === 'in_process') return 3;
  if (status === 'pending') return 2;
  return 1;
}

export function selectPrimaryOrderPayment(orderData) {
  const payments = orderData?.transactions?.payments;
  if (!Array.isArray(payments) || payments.length === 0) {
    return null;
  }
  if (payments.length === 1) {
    return payments[0];
  }
  let selected = payments[0];
  let bestScore = getPaymentPriority(selected);
  for (let i = 1; i < payments.length; i += 1) {
    const candidate = payments[i];
    const score = getPaymentPriority(candidate);
    if (score >= bestScore) {
      selected = candidate;
      bestScore = score;
    }
  }
  return selected;
}

function normalizeOrderResponse(orderData, fallbackMethodId, { forceRejected = false } = {}) {
  const tx = selectPrimaryOrderPayment(orderData) || {};
  const txPm = tx.payment_method || {};
  const legacyTxData = orderData?.point_of_interaction?.transaction_data || {};
  const statusDetail = tx.status_detail || orderData?.status_detail || null;
  const resolvedStatus = forceRejected
    ? 'rejected'
    : mapMercadoPagoStatus(orderData?.status || tx.status, statusDetail);

  const rawTicketUrl =
    txPm.ticket_url ||
    legacyTxData.ticket_url ||
    orderData?.transaction_details?.external_resource_url ||
    null;

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
      ticket_url: normalizeMercadoPagoTicketUrl(rawTicketUrl),
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
 * Consulta na API do Mercado Pago os detalhes atualizados de uma Order (`/v1/orders/{id}`) ou
 * pagamento legado (`/v1/payments/{id}`) e normaliza status e metadados relevantes.
 */
export async function fetchMercadoPagoPaymentDetails(paymentId, { eventType } = {}) {
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

  const tx = selectPrimaryOrderPayment(data);
  const detail = tx?.status_detail || data?.status_detail || '';
  return {
    paymentStatus: mapMercadoPagoStatus(data.status, detail),
    rawStatus: data.status,
    mpOrderStatus: data.status,
    statusDetail: detail || null,
    externalReference: data.external_reference != null ? String(data.external_reference) : null,
    transactionId: tx?.id ? String(tx.id) : null,
  };
}

const MP_WEBHOOK_MAX_AGE_SECONDS = 900; // 15 minutos

/**
 * Valida a assinatura HMAC-SHA256 enviada pelo Mercado Pago no header `x-signature`
 * e impõe janela temporal anti-replay sobre o timestamp `ts`.
 */
export function verifyMercadoPagoWebhookSignature({
  signatureHeader,
  requestIdHeader = '',
  dataId = '',
  secret = process.env.MP_WEBHOOK_SECRET,
  nowSeconds = Math.floor(Date.now() / 1000),
  maxAgeSeconds = MP_WEBHOOK_MAX_AGE_SECONDS,
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
  if (!ts || !v1 || !/^\d+$/.test(ts)) {
    return false;
  }

  const rawTs = Number(ts);
  const tsSeconds = rawTs > 1e12 ? Math.floor(rawTs / 1000) : rawTs;
  if (
    !Number.isFinite(tsSeconds) ||
    (maxAgeSeconds > 0 && Math.abs(nowSeconds - tsSeconds) > maxAgeSeconds)
  ) {
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

const MP_ORDER_ID_PATTERN = /^[A-Za-z0-9_-]{3,128}$/;

/**
 * Solicita estorno total de uma Order do Mercado Pago via Orders API (`POST /v1/orders/{id}/refund`).
 * Em ambiente não produtivo sem credenciais ou para pedidos simulados (`mp_*`), emula o estorno localmente.
 */
export async function refundMercadoPagoOrder(mpOrderId, { orderId = null, idempotencyKey = '' } = {}) {
  const normalizedOrderId = String(mpOrderId || '').trim();
  if (!MP_ORDER_ID_PATTERN.test(normalizedOrderId)) {
    const error = new Error('MP_INVALID_ORDER_ID');
    error.code = 'MP_INVALID_ORDER_ID';
    error.status = 400;
    error.statusCode = 400;
    error.userMessage = 'Identificador do pedido no Mercado Pago inválido para estorno.';
    throw error;
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  const isProduction = process.env.NODE_ENV === 'production';
  const isSimulatedOrder = normalizedOrderId.startsWith('mp_');

  if (isProduction && !accessToken) {
    const error = new Error('MP_NOT_CONFIGURED');
    error.code = 'MP_NOT_CONFIGURED';
    error.status = 503;
    error.statusCode = 503;
    error.userMessage = 'Gateway Mercado Pago não configurado em produção.';
    throw error;
  }

  if (isProduction && isSimulatedOrder) {
    const error = new Error('MP_SANDBOX_ORDER_IN_PRODUCTION');
    error.code = 'MP_SANDBOX_ORDER_IN_PRODUCTION';
    error.status = 400;
    error.statusCode = 400;
    error.userMessage = 'Não é possível estornar um pedido simulado em ambiente de produção.';
    throw error;
  }

  if (!accessToken || isSimulatedOrder || typeof global.fetch !== 'function') {
    return {
      mpOrderId: normalizedOrderId,
      mpTransactionId: null,
      paymentStatus: 'refunded',
      mpOrderStatus: 'refunded',
      statusDetail: 'refunded',
      refundMode: 'sandbox',
      refundedAt: new Date().toISOString(),
    };
  }

  const rawKey = String(
    idempotencyKey || (orderId ? `caminhar-refund-${orderId}` : `caminhar-refund-${normalizedOrderId}`)
  )
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, '');
  const safeIdempotencyKey = (rawKey || `caminhar-refund-${randomUUID()}`).slice(0, 64);

  let response;
  try {
    response = await fetch(
      `https://api.mercadopago.com/v1/orders/${encodeURIComponent(normalizedOrderId)}/refund`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Idempotency-Key': safeIdempotencyKey,
        },
        signal: AbortSignal.timeout(MP_PAYMENT_CREATE_TIMEOUT_MS),
      }
    );
  } catch (networkError) {
    const error = new Error(
      `MP_REFUND_UNAVAILABLE: falha de rede ao solicitar estorno (${networkError?.name || 'erro'})`,
      { cause: networkError }
    );
    error.code = 'MP_REFUND_UNAVAILABLE';
    error.status = 502;
    error.statusCode = 502;
    error.userMessage =
      'Não foi possível comunicar com o Mercado Pago para processar o estorno. Tente novamente.';
    throw error;
  }

  const rawBody = await response.text().catch(() => '');
  const parsed = tryParseJson(rawBody);

  if (!response.ok) {
    const detail =
      parsed?.errors?.[0]?.message ||
      parsed?.errors?.[0]?.description ||
      parsed?.cause?.[0]?.description ||
      parsed?.message ||
      `Erro HTTP ${response.status}`;

    if (response.status === 401 || response.status === 403) {
      const error = new Error(`MP_AUTH_ERROR: ${response.status}`);
      error.code = 'MP_AUTH_ERROR';
      error.status = 502;
      error.statusCode = 502;
      error.userMessage =
        'Credenciais do Mercado Pago inválidas ou sem permissão para estornar pedidos.';
      throw error;
    }

    if (response.status >= 500) {
      const error = new Error(`MP_REFUND_UNAVAILABLE: ${response.status}`);
      error.code = 'MP_REFUND_UNAVAILABLE';
      error.status = 502;
      error.statusCode = 502;
      error.userMessage =
        'Serviço de estorno do Mercado Pago temporariamente indisponível. Tente novamente.';
      throw error;
    }

    const error = new Error(`MP_REFUND_REJECTED: ${response.status} ${detail}`);
    error.code = 'MP_REFUND_REJECTED';
    error.status = 422;
    error.statusCode = 422;
    error.mpStatus = response.status;
    error.userMessage = `O Mercado Pago recusou o estorno: ${detail}`;
    throw error;
  }

  const primaryPayment = selectPrimaryOrderPayment(parsed);
  return {
    mpOrderId: parsed?.id ? String(parsed.id) : normalizedOrderId,
    mpTransactionId: primaryPayment?.id ? String(primaryPayment.id) : null,
    paymentStatus: 'refunded',
    mpOrderStatus: parsed?.status || 'refunded',
    statusDetail: primaryPayment?.status_detail || parsed?.status_detail || 'refunded',
    refundMode: 'live',
    refundedAt: new Date().toISOString(),
  };
}
