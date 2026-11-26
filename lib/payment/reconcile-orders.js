import { invalidateCache } from '../cache/cache.js';
import { syncOrderPaymentStatus } from '../domain/orders.js';
import { logger } from '../infra/logger.js';
import { fetchMercadoPagoPaymentDetails } from './mercadopago.js';

const TRANSIENT_PAYMENT_STATUSES = new Set(['pending', 'in_process', 'authorized']);
const DEFAULT_COOLDOWN_MS = 15000;
const reconcileCooldownMap = new Map();
const reconcileInflightMap = new Map();

function pruneCooldownMap(now, cooldownMs) {
  if (reconcileCooldownMap.size <= 500) return;
  for (const [key, timestamp] of reconcileCooldownMap.entries()) {
    if (now - timestamp > cooldownMs) {
      reconcileCooldownMap.delete(key);
    }
  }
}

async function fetchPaymentDetailsSingleFlight(mpId) {
  const existing = reconcileInflightMap.get(mpId);
  if (existing) {
    return existing;
  }
  const promise = fetchMercadoPagoPaymentDetails(mpId).finally(() => {
    reconcileInflightMap.delete(mpId);
  });
  reconcileInflightMap.set(mpId, promise);
  return promise;
}

function isReconcilableOrder(order) {
  if (!order || !order.mp_payment_id) return false;
  if (order.order_status === 'cancelled') return false;
  const mpId = String(order.mp_payment_id).trim();
  if (!mpId || mpId.startsWith('mp_')) return false;
  return TRANSIENT_PAYMENT_STATUSES.has(order.payment_status || 'pending');
}

/**
 * Reconcilia ativamente pedidos com pagamento pendente/em análise junto à API do Mercado Pago.
 * Aplica cooldown e single-flight em memória por `mp_payment_id` para evitar consultas
 * duplicadas em polling concorrente; passe `force: true` em acionamentos manuais (`sync=1`/`force=1`).
 */
export async function reconcilePendingOrders(
  orders,
  { maxOrders = 5, force = false, cooldownMs = DEFAULT_COOLDOWN_MS } = {}
) {
  if (!Array.isArray(orders) || orders.length === 0 || !process.env.MP_ACCESS_TOKEN) {
    return { orders: orders || [], syncedCount: 0 };
  }

  const now = Date.now();
  pruneCooldownMap(now, cooldownMs);

  const eligible = orders.filter((order) => {
    if (!isReconcilableOrder(order)) return false;
    if (force || cooldownMs <= 0) return true;
    const mpId = String(order.mp_payment_id).trim();
    const lastCheckedAt = reconcileCooldownMap.get(mpId);
    return !lastCheckedAt || now - lastCheckedAt >= cooldownMs;
  });

  const candidates = eligible.slice(0, maxOrders);
  if (candidates.length === 0) {
    return { orders, syncedCount: 0 };
  }

  const updatesById = new Map();
  let restoredStock = false;
  let syncedCount = 0;

  await Promise.allSettled(
    candidates.map(async (order) => {
      const mpId = String(order.mp_payment_id).trim();
      try {
        const details = await fetchPaymentDetailsSingleFlight(mpId);
        reconcileCooldownMap.set(mpId, Date.now());
        const currentPaymentStatus = order.payment_status || 'pending';
        const hasStatusChange =
          details.paymentStatus !== currentPaymentStatus ||
          (details.paymentStatus === 'approved' && order.order_status === 'awaiting_payment');
        const hasDetailChange =
          (details.statusDetail && details.statusDetail !== order.payment_payload?.status_detail) ||
          (details.mpOrderStatus && details.mpOrderStatus !== order.payment_payload?.mp_order_status);

        if (!hasStatusChange && !hasDetailChange) {
          return;
        }

        const updated = await syncOrderPaymentStatus(order.id, {
          mpPaymentId: order.mp_payment_id,
          paymentStatus: details.paymentStatus,
          paymentPayload: {
            ...(details.statusDetail ? { status_detail: details.statusDetail } : {}),
            ...(details.mpOrderStatus ? { mp_order_status: details.mpOrderStatus } : {}),
            ...(details.transactionId ? { mp_transaction_id: details.transactionId } : {}),
            last_sync_status: details.paymentStatus,
            last_sync_at: new Date().toISOString(),
          },
        });

        if (updated) {
          updatesById.set(order.id, { ...order, ...updated });
          if (hasStatusChange) {
            syncedCount += 1;
          }
          if (updated.stock_restored && !order.stock_restored) {
            restoredStock = true;
          }
        }
      } catch (error) {
        logger.warn(
          'MPReconcile',
          `Não foi possível sincronizar o pedido #${order.id} (${order.mp_payment_id}):`,
          error?.message || error
        );
      }
    })
  );

  if (restoredStock) {
    await invalidateCache('products:*').catch(() => {});
  }

  if (updatesById.size === 0) {
    return { orders, syncedCount: 0 };
  }

  return {
    orders: orders.map((order) => updatesById.get(order.id) || order),
    syncedCount,
  };
}
