import { checkRateLimit, invalidateCache } from '../../../lib/cache/cache.js';
import { getClientIP } from '../../../lib/api/helpers.js';
import { processMercadoPagoWebhookEvent } from '../../../lib/domain/orders.js';
import {
  fetchMercadoPagoPaymentDetails,
  mapMercadoPagoStatus,
  verifyMercadoPagoWebhookSignature,
} from '../../../lib/payment/mercadopago.js';
import { logger } from '../../../lib/infra/logger.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed', message: 'Método não permitido' });
  }

  try {
    const ip = getClientIP(req);
    const isRateLimited = await checkRateLimit(ip, 'api:webhooks:mercadopago', 120, 60000);
    if (isRateLimited) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Muitas notificações em sequência. Tente novamente em instantes.',
      });
    }

    const body = req.body || {};
    const signatureDataId = req.query?.['data.id'] || body?.data?.id || req.query?.id || '';
    const dataId = body?.data?.id || req.query?.['data.id'] || req.query?.id || '';
    const eventType = body?.type || body?.action || 'payment';

    const signatureHeader = req.headers?.['x-signature'] || '';
    const requestIdHeader = req.headers?.['x-request-id'] || '';

    const isSignatureValid = verifyMercadoPagoWebhookSignature({
      signatureHeader,
      requestIdHeader,
      dataId: String(signatureDataId),
    });

    if (!isSignatureValid) {
      logger.warn('MPWebhook', 'Assinatura de webhook do Mercado Pago inválida');
      return res.status(401).json({ error: 'Unauthorized', message: 'Assinatura inválida' });
    }

    if (!dataId) {
      return res.status(400).json({ error: 'Bad Request', message: 'Identificador de pagamento ausente' });
    }

    // Eventos de Orders API (`type: 'order'` / `action: 'order.*'`) e legado (`payment`)
    // são validados na fonte oficial; tópicos alheios (ex.: `merchant_order`) são apenas confirmados.
    const action = typeof body?.action === 'string' ? body.action : '';
    const bodyType = typeof body?.type === 'string' ? body.type : '';
    const isOrderEvent =
      bodyType === 'order' ||
      action.startsWith('order') ||
      (!bodyType && !action && /^ORD/i.test(String(dataId)));
    const isPaymentEvent =
      isOrderEvent ||
      ((!bodyType || bodyType === 'payment') && (!action || action.startsWith('payment')));
    if (!isPaymentEvent) {
      return res.status(200).json({ received: true, ignored: true });
    }

    // O status do pagamento nunca é presumido. Em produção (ou quando há token sem status explícito),
    // status, external_reference e detalhes vêm exclusivamente da API oficial do Mercado Pago.
    const isProduction = process.env.NODE_ENV === 'production';
    const txPayment = body?.data?.transactions?.payments?.[0] || null;
    const bodyStatus = body?.payment_status || body?.data?.status;
    const bodyStatusDetail = txPayment?.status_detail || body?.data?.status_detail || '';
    const bodyOrderStatus = typeof body?.data?.status === 'string' ? body.data.status : null;
    const bodyTxId = txPayment?.id ? String(txPayment.id) : null;
    const bodyExternalRef =
      body?.data?.external_reference !== undefined && body?.data?.external_reference !== null
        ? String(body.data.external_reference)
        : null;

    let paymentStatus;
    let statusDetail = '';
    let resolvedOrderStatus = null;
    let resolvedTxId = null;
    let externalReference = null;

    if (!isProduction && bodyStatus) {
      paymentStatus = mapMercadoPagoStatus(bodyStatus, bodyStatusDetail);
      statusDetail = bodyStatusDetail;
      resolvedOrderStatus = bodyOrderStatus;
      resolvedTxId = bodyTxId;
      externalReference = bodyExternalRef;
    } else if (isProduction || process.env.MP_ACCESS_TOKEN) {
      try {
        const apiDetails = isOrderEvent
          ? await fetchMercadoPagoPaymentDetails(String(dataId), { eventType: 'order' })
          : await fetchMercadoPagoPaymentDetails(String(dataId));
        paymentStatus = apiDetails.paymentStatus;
        externalReference = apiDetails.externalReference || null;
        statusDetail = apiDetails.statusDetail || '';
        resolvedOrderStatus = apiDetails.mpOrderStatus || null;
        resolvedTxId = apiDetails.transactionId || null;
      } catch (lookupError) {
        const notConfigured = lookupError?.message?.startsWith('MP_NOT_CONFIGURED');
        logger.error('MPWebhook', 'Não foi possível confirmar o status do pagamento no Mercado Pago:', lookupError);
        return res.status(notConfigured ? 503 : 502).json({
          error: notConfigured ? 'Service Unavailable' : 'Bad Gateway',
          message: 'Não foi possível confirmar o pagamento; o Mercado Pago tentará reenviar o evento',
        });
      }
    } else {
      paymentStatus = 'approved';
      externalReference = bodyExternalRef;
      statusDetail = bodyStatusDetail;
      resolvedOrderStatus = bodyOrderStatus;
      resolvedTxId = bodyTxId;
    }

    const eventId = body?.id || `${eventType}_${action || 'evt'}_${dataId}_${paymentStatus}`;

    const result = await processMercadoPagoWebhookEvent({
      eventId: String(eventId),
      eventType: String(eventType),
      mpPaymentId: String(dataId),
      ...(externalReference ? { externalReference } : {}),
      paymentStatus,
      paymentPayload: {
        last_webhook_event: String(eventType),
        last_webhook_action: typeof action === 'string' ? action : null,
        last_webhook_status: paymentStatus,
        ...(statusDetail ? { status_detail: String(statusDetail) } : {}),
        ...(resolvedOrderStatus ? { mp_order_status: resolvedOrderStatus } : {}),
        ...(resolvedTxId ? { mp_transaction_id: resolvedTxId } : {}),
        webhook_received_at: new Date().toISOString(),
      },
    });

    if (result.orderNotFound) {
      logger.warn(
        'MPWebhook',
        `Pedido não localizado para webhook ${String(dataId)}; respondendo 503 para retentativa.`
      );
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'Pedido ainda não localizado; o Mercado Pago tentará reenviar o evento',
        retryable: true,
      });
    }

    if (!result.duplicate && result.stockChanged) {
      await invalidateCache('products:*').catch(() => {});
    }

    return res.status(200).json({
      received: true,
      duplicate: result.duplicate,
      orderId: result.order?.id || null,
    });
  } catch (error) {
    logger.error('MPWebhook', 'Erro ao processar webhook do Mercado Pago:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro ao processar webhook' });
  }
}
