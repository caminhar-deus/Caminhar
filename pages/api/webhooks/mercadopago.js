import { invalidateCache } from '../../../lib/cache/cache.js';
import { processMercadoPagoWebhookEvent } from '../../../lib/domain/orders.js';
import {
  fetchMercadoPagoPaymentStatus,
  verifyMercadoPagoWebhookSignature,
} from '../../../lib/payment/mercadopago.js';
import { logger } from '../../../lib/infra/logger.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed', message: 'Método não permitido' });
  }

  try {
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

    // O status do pagamento nunca é presumido. Em produção vem sempre da API do Mercado Pago
    // (o corpo do webhook não é fonte confiável do status). Fora de produção, um status
    // explícito no corpo é aceito (testes/simulações) e, sem token, vale o modo sandbox local.
    const isProduction = process.env.NODE_ENV === 'production';
    const bodyStatus = body?.payment_status || body?.data?.status;
    let paymentStatus;
    if (!isProduction && bodyStatus) {
      const normalizedBodyStatus = String(bodyStatus).trim().toLowerCase();
      const simulatedOrderStatusMap = {
        processed: 'approved',
        processing: 'in_process',
        action_required: 'pending',
        created: 'pending',
        failed: 'rejected',
        canceled: 'cancelled',
      };
      paymentStatus = simulatedOrderStatusMap[normalizedBodyStatus] || bodyStatus;
    } else if (isProduction || process.env.MP_ACCESS_TOKEN) {
      try {
        paymentStatus = isOrderEvent
          ? await fetchMercadoPagoPaymentStatus(String(dataId), { eventType: 'order' })
          : await fetchMercadoPagoPaymentStatus(String(dataId));
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
    }

    const eventId = body?.id || `${eventType}_${action || 'evt'}_${dataId}_${paymentStatus}`;

    const result = await processMercadoPagoWebhookEvent({
      eventId: String(eventId),
      eventType: String(eventType),
      mpPaymentId: String(dataId),
      paymentStatus,
      paymentPayload: {
        last_webhook_event: String(eventType),
        last_webhook_action: typeof action === 'string' ? action : null,
        last_webhook_status: paymentStatus,
        webhook_received_at: new Date().toISOString(),
      },
    });

    await invalidateCache('products:*');

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
