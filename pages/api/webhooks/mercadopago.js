import { invalidateCache } from '../../../lib/cache/cache.js';
import { processMercadoPagoWebhookEvent } from '../../../lib/domain/orders.js';
import { verifyMercadoPagoWebhookSignature } from '../../../lib/payment/mercadopago.js';
import { logger } from '../../../lib/infra/logger.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed', message: 'Método não permitido' });
  }

  try {
    const body = req.body || {};
    const dataId = body?.data?.id || req.query?.['data.id'] || req.query?.id || '';
    const eventId = body?.id || `${body?.type || 'payment'}_${dataId}`;
    const eventType = body?.type || body?.action || 'payment';

    const signatureHeader = req.headers?.['x-signature'] || '';
    const requestIdHeader = req.headers?.['x-request-id'] || '';

    const isSignatureValid = verifyMercadoPagoWebhookSignature({
      signatureHeader,
      requestIdHeader,
      dataId: String(dataId),
    });

    if (!isSignatureValid) {
      logger.warn('MPWebhook', 'Assinatura de webhook do Mercado Pago inválida');
      return res.status(401).json({ error: 'Unauthorized', message: 'Assinatura inválida' });
    }

    if (!dataId) {
      return res.status(400).json({ error: 'Bad Request', message: 'Identificador de pagamento ausente' });
    }

    // Se MP_ACCESS_TOKEN estiver presente e o status não vier no corpo, consulta a API do Mercado Pago
    let paymentStatus = body?.payment_status || body?.data?.status || 'approved';
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (accessToken && !body?.payment_status && !body?.data?.status && typeof global.fetch === 'function') {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (mpRes.ok) {
        const mpPayment = await mpRes.json();
        paymentStatus = mpPayment.status || 'pending';
      }
    }

    const result = await processMercadoPagoWebhookEvent({
      eventId: String(eventId),
      eventType: String(eventType),
      mpPaymentId: String(dataId),
      paymentStatus,
      paymentPayload: body,
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
