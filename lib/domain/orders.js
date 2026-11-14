import { query, transaction } from '../infra/db.js';

function formatBrl(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

function parseJsonSafe(rawValue, fallback = null) {
  if (!rawValue) return fallback;
  if (typeof rawValue === 'object') return rawValue;
  try {
    return JSON.parse(rawValue);
  } catch {
    return fallback;
  }
}

function formatOrderRow(row) {
  if (!row) return null;
  return {
    ...row,
    unit_price: Number(row.unit_price),
    shipping_cost: Number(row.shipping_cost || 0),
    total_amount: Number(row.total_amount),
    formatted_unit_price: formatBrl(row.unit_price),
    formatted_shipping_cost: formatBrl(row.shipping_cost),
    formatted_total_amount: formatBrl(row.total_amount),
    delivery_address: parseJsonSafe(row.shipping_address ?? row.delivery_address, {}),
    payment_payload: parseJsonSafe(row.mp_payload ?? row.payment_payload, null),
  };
}

/**
 * Calcula o valor do frete para um produto interno e quantidade.
 */
export function calculateShippingCost(product, quantity = 1) {
  if (!product || product.shipping_type === 'free') {
    return 0;
  }
  const baseCost = Number(product.shipping_cost || 0);
  if (product.shipping_type === 'fixed') {
    return Number(baseCost.toFixed(2));
  }
  if (product.shipping_type === 'calculated') {
    const base = baseCost > 0 ? baseCost : 19.9;
    const extraUnits = Math.max(0, Number(quantity || 1) - 1);
    return Number((base + extraUnits * 4.5).toFixed(2));
  }
  return 0;
}

/**
 * Cria um pedido interno com reserva atômica de estoque (`SELECT ... FOR UPDATE`).
 */
export async function createInternalOrder({
  customerId,
  productId,
  quantity,
  deliveryAddress,
  paymentMethod,
}) {
  const qty = Math.max(1, parseInt(quantity, 10) || 1);

  return await transaction(async (client) => {
    const productRes = await query(
      'SELECT * FROM products WHERE id = $1 AND published = true FOR UPDATE',
      [productId],
      { client }
    );
    const product = productRes.rows[0];

    if (!product) {
      throw new Error('PRODUCT_NOT_FOUND');
    }
    if (product.modality !== 'internal') {
      throw new Error('PRODUCT_NOT_INTERNAL');
    }
    if (Number(product.stock || 0) < qty) {
      throw new Error('INSUFFICIENT_STOCK');
    }

    await query(
      'UPDATE products SET stock = stock - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [qty, product.id],
      { client }
    );

    const unitPrice = Number(product.price);
    const shippingCost = calculateShippingCost(product, qty);
    const totalAmount = Number((unitPrice * qty + shippingCost).toFixed(2));

    const shippingType = product.shipping_type || 'free';
    const orderRes = await query(
      `INSERT INTO orders (
        customer_id,
        product_id,
        product_name,
        unit_price,
        quantity,
        shipping_type,
        shipping_cost,
        total_amount,
        shipping_address,
        payment_method,
        payment_status,
        order_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', 'awaiting_payment')
      RETURNING *`,
      [
        customerId,
        product.id,
        product.name,
        unitPrice,
        qty,
        shippingType,
        shippingCost,
        totalAmount,
        JSON.stringify(deliveryAddress || {}),
        paymentMethod,
      ],
      { client }
    );

    return formatOrderRow(orderRes.rows[0]);
  });
}

const MP_FAILURE_STATUSES = new Set(['rejected', 'cancelled', 'refunded', 'charged_back']);

function buildStoredPayload(paymentPayload, mpPreferenceId) {
  if (!paymentPayload && !mpPreferenceId) return null;
  if (mpPreferenceId) {
    return JSON.stringify({
      ...(paymentPayload || {}),
      mp_preference_id: String(mpPreferenceId),
    });
  }
  return JSON.stringify(paymentPayload);
}

/**
 * Anexa os metadados da cobrança gerada no Mercado Pago ao pedido recém-criado.
 * Caso o Mercado Pago recuse ou cancele de imediato, cancela o pedido e devolve estoque uma única vez.
 */
export async function attachOrderPaymentInfo(
  orderId,
  { mpPaymentId, mpPreferenceId = null, paymentStatus = 'pending', paymentPayload = null }
) {
  const normalizedStatus = paymentStatus || 'pending';
  const payloadJson = buildStoredPayload(paymentPayload, mpPreferenceId);

  if (MP_FAILURE_STATUSES.has(normalizedStatus)) {
    return await transaction(async (client) => {
      const currentRes = await query(
        'SELECT * FROM orders WHERE id = $1 FOR UPDATE',
        [orderId],
        { client }
      );
      const current = currentRes.rows[0];
      if (!current) return null;

      let nextStockRestored = Boolean(current.stock_restored);
      if (current.product_id && !nextStockRestored) {
        await query(
          'UPDATE products SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [current.quantity, current.product_id],
          { client }
        );
        nextStockRestored = true;
      }

      const { rows } = await query(
        `UPDATE orders
         SET mp_payment_id = $1,
             payment_status = $2,
             order_status = 'cancelled',
             mp_payload = $3,
             stock_restored = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING *`,
        [
          mpPaymentId ? String(mpPaymentId) : null,
          normalizedStatus,
          payloadJson,
          nextStockRestored,
          orderId,
        ],
        { client }
      );

      return formatOrderRow(rows[0]);
    });
  }

  const nextOrderStatus = normalizedStatus === 'approved' ? 'paid' : 'awaiting_payment';

  const { rows } = await query(
    `UPDATE orders
     SET mp_payment_id = $1,
         payment_status = $2,
         order_status = $3,
         mp_payload = $4,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $5
     RETURNING *`,
    [
      mpPaymentId ? String(mpPaymentId) : null,
      normalizedStatus,
      nextOrderStatus,
      payloadJson,
      orderId,
    ]
  );

  return formatOrderRow(rows[0]);
}

/**
 * Cancela e devolve estoque de um pedido recém-criado quando a criação do pagamento no MP falha.
 */
export async function cancelFailedCheckoutOrder(orderId, reason = 'Falha ao iniciar pagamento no Mercado Pago') {
  return await transaction(async (client) => {
    const currentRes = await query(
      'SELECT * FROM orders WHERE id = $1 FOR UPDATE',
      [orderId],
      { client }
    );
    const current = currentRes.rows[0];
    if (!current) return null;

    let nextStockRestored = Boolean(current.stock_restored);
    if (current.product_id && !nextStockRestored && current.order_status !== 'cancelled') {
      await query(
        'UPDATE products SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [current.quantity, current.product_id],
        { client }
      );
      nextStockRestored = true;
    }

    const existingPayload = parseJsonSafe(current.mp_payload ?? current.payment_payload, null) || {};
    const { rows } = await query(
      `UPDATE orders
       SET payment_status = 'cancelled',
           order_status = 'cancelled',
           stock_restored = $1,
           mp_payload = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [
        nextStockRestored,
        JSON.stringify({ ...existingPayload, error_reason: String(reason) }),
        orderId,
      ],
      { client }
    );

    return formatOrderRow(rows[0]);
  });
}

/**
 * Retorna os pedidos internos de um visitante específico.
 */
export async function getCustomerOrders(customerId) {
  const { rows } = await query(
    `SELECT o.*, p.image_url AS product_image_url
     FROM orders o
     LEFT JOIN products p ON p.id = o.product_id
     WHERE o.customer_id = $1
     ORDER BY o.created_at DESC, o.id DESC`,
    [customerId]
  );
  return rows.map(formatOrderRow);
}

/**
 * Lista os pedidos internos para a aba Gestão de Vendas do painel administrativo.
 */
export async function getAdminOrders({
  page = 1,
  limit = 10,
  search = '',
  paymentStatus = '',
  orderStatus = '',
  paymentMethod = '',
} = {}) {
  const offset = (page - 1) * limit;
  const conditions = [];
  const filterParams = [];

  const term = typeof search === 'string' ? search.trim() : '';
  if (term) {
    filterParams.push(`%${term}%`);
    const idx = filterParams.length;
    conditions.push(
      `(o.product_name ILIKE $${idx} OR c.name ILIKE $${idx} OR c.email ILIKE $${idx} OR COALESCE(o.mp_payment_id, '') ILIKE $${idx} OR COALESCE(o.tracking_code, '') ILIKE $${idx})`
    );
  }

  if (paymentStatus) {
    filterParams.push(paymentStatus);
    conditions.push(`o.payment_status = $${filterParams.length}`);
  }

  if (orderStatus) {
    filterParams.push(orderStatus);
    conditions.push(`o.order_status = $${filterParams.length}`);
  }

  if (paymentMethod) {
    filterParams.push(paymentMethod);
    conditions.push(`o.payment_method = $${filterParams.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(
    `SELECT COUNT(*) FROM orders o JOIN customers c ON c.id = o.customer_id ${whereClause}`,
    filterParams
  );
  const total = parseInt(countResult.rows[0].count, 10);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const listParams = [...filterParams, limit, offset];
  const limitIdx = filterParams.length + 1;
  const offsetIdx = filterParams.length + 2;

  const { rows } = await query(
    `SELECT o.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone
     FROM orders o
     JOIN customers c ON c.id = o.customer_id
     ${whereClause}
     ORDER BY o.created_at DESC, o.id DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    listParams
  );

  return {
    data: rows.map(formatOrderRow),
    pagination: { page, limit, total, totalPages },
  };
}

/**
 * Atualiza o andamento logístico (`order_status`) e/ou código de rastreio (`tracking_code`) de um pedido.
 * Se o pedido transitar para `cancelled`, devolve o estoque ao produto correspondente.
 */
export async function updateAdminOrder(orderId, { orderStatus, trackingCode }) {
  return await transaction(async (client) => {
    const currentRes = await query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [orderId], { client });
    const current = currentRes.rows[0];
    if (!current) {
      return null;
    }

    const nextOrderStatus = orderStatus !== undefined ? orderStatus : current.order_status;
    const nextTrackingCode = trackingCode !== undefined ? trackingCode : current.tracking_code;

    const isCancellingNow = nextOrderStatus === 'cancelled' && current.order_status !== 'cancelled';
    let nextStockRestored = Boolean(current.stock_restored);
    if (isCancellingNow && current.product_id && !nextStockRestored) {
      await query(
        'UPDATE products SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [current.quantity, current.product_id],
        { client }
      );
      nextStockRestored = true;
    }

    const updatedRes = await query(
      `UPDATE orders
       SET order_status = $1,
           tracking_code = $2,
           stock_restored = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [nextOrderStatus, nextTrackingCode || null, nextStockRestored, orderId],
      { client }
    );

    return formatOrderRow(updatedRes.rows[0]);
  });
}

/**
 * Processa um evento de webhook do Mercado Pago de forma idempotente.
 */
export async function processMercadoPagoWebhookEvent({
  eventId,
  eventType = 'payment',
  mpPaymentId,
  paymentStatus,
  paymentPayload = null,
}) {
  return await transaction(async (client) => {
    const insertEvent = await query(
      `INSERT INTO payment_webhook_events (event_key, mp_payment_id, action)
       VALUES ($1, $2, $3)
       ON CONFLICT (event_key) DO NOTHING
       RETURNING id`,
      [String(eventId), mpPaymentId ? String(mpPaymentId) : null, String(eventType || 'payment')],
      { client }
    );

    if (insertEvent.rows.length === 0) {
      return { duplicate: true, order: null };
    }

    if (!mpPaymentId) {
      return { duplicate: false, order: null };
    }

    const orderRes = await query(
      'SELECT * FROM orders WHERE mp_payment_id = $1 FOR UPDATE',
      [String(mpPaymentId)],
      { client }
    );
    const current = orderRes.rows[0];
    if (!current) {
      return { duplicate: false, order: null };
    }

    const incomingStatus = paymentStatus || current.payment_status;
    let nextPaymentStatus = incomingStatus;
    let nextOrderStatus = current.order_status;
    let nextStockRestored = Boolean(current.stock_restored);

    // Impede que notificação atrasada de pendência rebaixe um pagamento já aprovado
    if (
      current.payment_status === 'approved' &&
      (incomingStatus === 'pending' || incomingStatus === 'in_process' || incomingStatus === 'authorized')
    ) {
      nextPaymentStatus = current.payment_status;
    }

    if (nextPaymentStatus === 'approved' && current.order_status === 'awaiting_payment') {
      nextOrderStatus = 'paid';
    } else if (MP_FAILURE_STATUSES.has(nextPaymentStatus)) {
      const canAutoCancel =
        current.order_status === 'awaiting_payment' || current.order_status === 'paid';
      if (canAutoCancel) {
        nextOrderStatus = 'cancelled';
        if (current.product_id && !nextStockRestored) {
          await query(
            'UPDATE products SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [current.quantity, current.product_id],
            { client }
          );
          nextStockRestored = true;
        }
      }
    }

    const existingPayload = parseJsonSafe(current.mp_payload ?? current.payment_payload, null);
    const mergedPayload = paymentPayload
      ? { ...(existingPayload || {}), ...paymentPayload }
      : existingPayload;

    const updatedRes = await query(
      `UPDATE orders
       SET payment_status = $1,
           order_status = $2,
           stock_restored = $3,
           mp_payload = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [
        nextPaymentStatus,
        nextOrderStatus,
        nextStockRestored,
        mergedPayload ? JSON.stringify(mergedPayload) : null,
        current.id,
      ],
      { client }
    );

    return { duplicate: false, order: formatOrderRow(updatedRes.rows[0]) };
  });
}
