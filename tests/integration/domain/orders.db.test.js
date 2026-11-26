/**
 * Testes de Integração com Banco Real (PostgreSQL) — Pedidos e Webhooks (`orders` / `payment_webhook_events`).
 *
 * Valida queries SQL reais, colunas canônicas da migração 023 (`shipping_address`,
 * `mp_payload`, `mp_payment_id`, `stock_restored`, `event_key`, `action`), locks
 * transacionais (`SELECT ... FOR UPDATE`), reserva e devolução atômica de estoque,
 * paginação/busca administrativa com `JOIN customers` e idempotência de webhooks
 * contra um container PostgreSQL via Testcontainers, prevenindo regressões de
 * schema drift (ADR-0039, ADR-0041).
 *
 * Para executar: npm run test:db:container
 * Requer: Docker disponível
 */
import { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { createTestDb, applyMigrations, withTransaction, isDockerAvailable } from '../../helpers/db-test.js';
import {
  createInternalOrder,
  attachOrderPaymentInfo,
  cancelFailedCheckoutOrder,
  getCustomerOrders,
  getCustomerOrderById,
  getAdminOrders,
  updateAdminOrder,
  syncOrderPaymentStatus,
  processMercadoPagoWebhookEvent,
} from '../../../lib/domain/orders.js';

let mockDbQuery = null;
let mockDbTransaction = null;

jest.mock('../../../lib/infra/db.js', () => ({
  query: (...args) => {
    if (typeof mockDbQuery !== 'function') {
      return Promise.reject(new Error('mockDbQuery não configurado para este teste'));
    }
    return mockDbQuery(...args);
  },
  transaction: (...args) => {
    if (typeof mockDbTransaction !== 'function') {
      return Promise.reject(new Error('mockDbTransaction não configurado para este teste'));
    }
    return mockDbTransaction(...args);
  },
}));

let pool;
let tx;

beforeAll(async () => {
  if (!isDockerAvailable()) {
    return;
  }
  pool = createTestDb();
  await applyMigrations();
});

afterAll(async () => {
  if (tx && typeof tx.rollback === 'function') {
    try { await tx.rollback(); } catch { /* rollback de segurança */ }
  }
  if (pool) {
    await pool.end();
  }
});

beforeEach(async () => {
  if (!pool) return;
  tx = await withTransaction(pool);
  mockDbQuery = (text, params) => tx.query(text, params);
  mockDbTransaction = async (callback) => callback(tx);
});

afterEach(async () => {
  mockDbQuery = null;
  mockDbTransaction = null;
  if (tx) {
    await tx.rollback();
  }
});

/**
 * Helper para criar um cliente diretamente na transação do teste.
 */
async function insertTestCustomer(overrides = {}) {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const defaults = {
    name: 'Cliente de Teste',
    email: `cliente.${unique}@exemplo.com`,
    phone: '11999990000',
  };
  const data = { ...defaults, ...overrides };
  const result = await tx.query(
    `INSERT INTO customers (name, email, phone)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [data.name, data.email, data.phone]
  );
  return result.rows[0];
}

/**
 * Helper para criar um produto na transação do teste.
 */
async function insertTestProduct(overrides = {}) {
  const defaults = {
    name: 'Terço de Madeira',
    price: '45.00',
    image_url: JSON.stringify([`https://example.com/img/terco-${Date.now()}.jpg`]),
    description: 'Terço artesanal.',
    category: 'tercos',
    published: true,
    modality: 'internal',
    stock: 10,
    shipping_type: 'fixed',
    shipping_cost: '12.50',
    link: null,
  };
  const data = { ...defaults, ...overrides };
  const result = await tx.query(
    `INSERT INTO products (name, price, image_url, description, category, published, modality, stock, shipping_type, shipping_cost, link)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      data.name,
      data.price,
      data.image_url,
      data.description,
      data.category,
      data.published,
      data.modality,
      data.stock,
      data.shipping_type,
      data.shipping_cost,
      data.link,
    ]
  );
  return result.rows[0];
}

/**
 * describeIf condicional: só executa testes se Docker estiver disponível.
 */
const describeIf = isDockerAvailable() ? describe : describe.skip;

describeIf('Pedidos e Webhooks (orders) — Integração com PostgreSQL Real', () => {
  it('createInternalOrder reserva estoque atomicamente (SELECT ... FOR UPDATE) e persiste shipping_address como TEXT JSON', async () => {
    const customer = await insertTestCustomer();
    const product = await insertTestProduct({
      name: 'Bíblia Sagrada Pastoral',
      price: '80.00',
      stock: 5,
      shipping_type: 'fixed',
      shipping_cost: '15.00',
    });

    const address = {
      cep: '01310-100',
      street: 'Av. Paulista',
      number: '1000',
      city: 'São Paulo',
      state: 'SP',
    };

    const order = await createInternalOrder({
      customerId: customer.id,
      productId: product.id,
      quantity: 2,
      deliveryAddress: address,
      paymentMethod: 'pix',
    });

    expect(order).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        customer_id: customer.id,
        product_id: product.id,
        product_name: 'Bíblia Sagrada Pastoral',
        unit_price: 80,
        quantity: 2,
        shipping_type: 'fixed',
        shipping_cost: 15,
        total_amount: 175,
        payment_method: 'pix',
        payment_status: 'pending',
        order_status: 'awaiting_payment',
        stock_restored: false,
        delivery_address: address,
      })
    );

    const updatedProduct = await tx.query('SELECT stock FROM products WHERE id = $1', [product.id]);
    expect(updatedProduct.rows[0].stock).toBe(3);

    const rawOrder = await tx.query('SELECT shipping_address FROM orders WHERE id = $1', [order.id]);
    expect(typeof rawOrder.rows[0].shipping_address).toBe('string');
    expect(JSON.parse(rawOrder.rows[0].shipping_address)).toEqual(address);
  });

  it('createInternalOrder rejeita produto inexistente, rascunho, externo ou com estoque insuficiente', async () => {
    const customer = await insertTestCustomer();
    const externalProduct = await insertTestProduct({
      modality: 'external',
      link: 'https://shopee.com.br/item',
      stock: 10,
    });
    const lowStockProduct = await insertTestProduct({ stock: 1 });

    await expect(
      createInternalOrder({
        customerId: customer.id,
        productId: 99999999,
        quantity: 1,
        deliveryAddress: {},
        paymentMethod: 'pix',
      })
    ).rejects.toThrow('PRODUCT_NOT_FOUND');

    await expect(
      createInternalOrder({
        customerId: customer.id,
        productId: externalProduct.id,
        quantity: 1,
        deliveryAddress: {},
        paymentMethod: 'pix',
      })
    ).rejects.toThrow('PRODUCT_NOT_INTERNAL');

    await expect(
      createInternalOrder({
        customerId: customer.id,
        productId: lowStockProduct.id,
        quantity: 2,
        deliveryAddress: {},
        paymentMethod: 'pix',
      })
    ).rejects.toThrow('INSUFFICIENT_STOCK');
  });

  it('attachOrderPaymentInfo grava mp_payment_id e mp_payload (com normalização de ticket_url), e devolve estoque uma única vez em falha imediata', async () => {
    const customer = await insertTestCustomer();
    const product = await insertTestProduct({ stock: 10 });

    const order1 = await createInternalOrder({
      customerId: customer.id,
      productId: product.id,
      quantity: 3,
      deliveryAddress: { cep: '01001-000' },
      paymentMethod: 'bolbradesco',
    });

    const attachedPending = await attachOrderPaymentInfo(order1.id, {
      mpPaymentId: `ORD-BOL-${Date.now()}`,
      mpPreferenceId: 'PREF-123',
      paymentStatus: 'pending',
      paymentPayload: {
        ticket_url: 'https://www.mercadopago.com.br/payments/12345/ticket?caller_id=1',
        digitable_line: '23793.38128',
      },
    });

    expect(attachedPending.payment_status).toBe('pending');
    expect(attachedPending.order_status).toBe('awaiting_payment');
    expect(attachedPending.payment_payload.mp_preference_id).toBe('PREF-123');
    expect(attachedPending.payment_payload.digitable_line).toBe('23793.38128');

    // Segundo pedido: recusa imediata do cartão restaura as 2 unidades reservadas
    const order2 = await createInternalOrder({
      customerId: customer.id,
      productId: product.id,
      quantity: 2,
      deliveryAddress: { cep: '01001-000' },
      paymentMethod: 'credit_card',
    });

    const stockDuringOrder2 = await tx.query('SELECT stock FROM products WHERE id = $1', [product.id]);
    expect(stockDuringOrder2.rows[0].stock).toBe(5); // 10 - 3 - 2

    const rejected = await attachOrderPaymentInfo(order2.id, {
      mpPaymentId: `ORD-REJ-${Date.now()}`,
      paymentStatus: 'rejected',
      paymentPayload: { status_detail: 'cc_rejected_bad_filled_security_code' },
    });

    expect(rejected.payment_status).toBe('rejected');
    expect(rejected.order_status).toBe('cancelled');
    expect(rejected.stock_restored).toBe(true);

    const stockAfterReject = await tx.query('SELECT stock FROM products WHERE id = $1', [product.id]);
    expect(stockAfterReject.rows[0].stock).toBe(7); // devolveu apenas as 2 unidades de order2
  });

  it('cancelFailedCheckoutOrder cancela o pedido, grava error_reason em mp_payload e devolve o estoque sem duplicar', async () => {
    const customer = await insertTestCustomer();
    const product = await insertTestProduct({ stock: 6 });

    const order = await createInternalOrder({
      customerId: customer.id,
      productId: product.id,
      quantity: 4,
      deliveryAddress: { cep: '01001-000' },
      paymentMethod: 'pix',
    });

    const cancelled = await cancelFailedCheckoutOrder(order.id, 'Timeout na Orders API');
    expect(cancelled.payment_status).toBe('cancelled');
    expect(cancelled.order_status).toBe('cancelled');
    expect(cancelled.stock_restored).toBe(true);
    expect(cancelled.payment_payload.error_reason).toBe('Timeout na Orders API');

    // Chamada repetida é idempotente e não soma estoque de novo
    await cancelFailedCheckoutOrder(order.id, 'Segunda chamada');
    const stockRes = await tx.query('SELECT stock FROM products WHERE id = $1', [product.id]);
    expect(stockRes.rows[0].stock).toBe(6);
  });

  it('getCustomerOrders, getCustomerOrderById, getAdminOrders e updateAdminOrder executam JOINs reais e filtros ILIKE', async () => {
    const customerA = await insertTestCustomer({
      name: 'Bento XVI',
      email: `bento.${Date.now()}@exemplo.com`,
    });
    const customerB = await insertTestCustomer({
      name: 'Francisco Assis',
      email: `francisco.${Date.now()}@exemplo.com`,
    });
    const product = await insertTestProduct({
      name: 'Medalha Milagrosa',
      price: '25.00',
      stock: 20,
    });

    const orderA = await createInternalOrder({
      customerId: customerA.id,
      productId: product.id,
      quantity: 1,
      deliveryAddress: { city: 'Vaticano' },
      paymentMethod: 'pix',
    });
    const orderB = await createInternalOrder({
      customerId: customerB.id,
      productId: product.id,
      quantity: 2,
      deliveryAddress: { city: 'Assis' },
      paymentMethod: 'credit_card',
    });

    // Consulta individual escopada ao cliente dono do pedido
    const foundA = await getCustomerOrderById(orderA.id, customerA.id);
    expect(foundA).not.toBeNull();
    expect(foundA.id).toBe(orderA.id);
    expect(foundA.product_image_url).toBe(product.image_url);

    const crossCustomerLookup = await getCustomerOrderById(orderA.id, customerB.id);
    expect(crossCustomerLookup).toBeNull();

    const listA = await getCustomerOrders(customerA.id);
    expect(listA.map((o) => o.id)).toEqual([orderA.id]);

    // Listagem administrativa com JOIN customers e filtro search ILIKE
    const adminFiltered = await getAdminOrders({
      page: 1,
      limit: 10,
      search: 'Francisco Assis',
      paymentMethod: 'credit_card',
    });
    expect(adminFiltered.pagination.total).toBe(1);
    expect(adminFiltered.data[0].id).toBe(orderB.id);
    expect(adminFiltered.data[0].customer_name).toBe('Francisco Assis');
    expect(adminFiltered.data[0].customer_email).toBe(customerB.email);

    // Atualização logística e cancelamento administrativo devolvendo estoque
    const shipped = await updateAdminOrder(orderA.id, {
      orderStatus: 'shipped',
      trackingCode: 'BR123456789LP',
    });
    expect(shipped.order_status).toBe('shipped');
    expect(shipped.tracking_code).toBe('BR123456789LP');
    expect(shipped.stock_restored).toBe(false);

    const adminCancelled = await updateAdminOrder(orderB.id, {
      orderStatus: 'cancelled',
    });
    expect(adminCancelled.order_status).toBe('cancelled');
    expect(adminCancelled.stock_restored).toBe(true);

    const stockRes = await tx.query('SELECT stock FROM products WHERE id = $1', [product.id]);
    expect(stockRes.rows[0].stock).toBe(19); // 20 - 1 (orderA enviado) - 2 + 2 (orderB cancelado)
  });

  it('processMercadoPagoWebhookEvent e syncOrderPaymentStatus garantem idempotência por event_key, fallback por externalReference e proteção contra downgrade', async () => {
    const customer = await insertTestCustomer();
    const product = await insertTestProduct({ stock: 10 });

    const order = await createInternalOrder({
      customerId: customer.id,
      productId: product.id,
      quantity: 1,
      deliveryAddress: { cep: '01001-000' },
      paymentMethod: 'pix',
    });

    const mpId = `ORD-WH-${Date.now()}`;
    const eventKey1 = `evt-approve-${Date.now()}`;

    // Webhook chega antes de mp_payment_id estar gravado -> localiza pedido via externalReference (order.id)
    const firstProcess = await processMercadoPagoWebhookEvent({
      eventId: eventKey1,
      eventType: 'order.processed',
      mpPaymentId: mpId,
      externalReference: String(order.id),
      paymentStatus: 'approved',
      paymentPayload: {
        status_detail: 'accredited',
        ticket_url: 'https://www.mercadopago.com.br/staging/payments/999/ticket',
      },
    });

    expect(firstProcess.duplicate).toBe(false);
    expect(firstProcess.order).not.toBeNull();
    expect(firstProcess.order.payment_status).toBe('approved');
    expect(firstProcess.order.order_status).toBe('paid');
    expect(firstProcess.order.mp_payment_id).toBe(mpId);
    // Verifica normalização automática de /staging/payments/ -> /sandbox/payments/
    expect(firstProcess.order.payment_payload.ticket_url).toBe(
      'https://www.mercadopago.com.br/sandbox/payments/999/ticket'
    );

    // Reenvio do mesmo event_key é ignorado por ON CONFLICT (event_key) DO NOTHING
    const duplicateProcess = await processMercadoPagoWebhookEvent({
      eventId: eventKey1,
      eventType: 'order.processed',
      mpPaymentId: mpId,
      paymentStatus: 'approved',
    });
    expect(duplicateProcess).toEqual({ duplicate: true, order: null, stockChanged: false });

    // Tentativa de rebaixar pedido já 'approved' para 'pending' via reconciliação ativa é bloqueada
    const afterTransientSync = await syncOrderPaymentStatus(order.id, {
      mpPaymentId: mpId,
      paymentStatus: 'pending',
      paymentPayload: { sync_checked: true },
    });
    expect(afterTransientSync.payment_status).toBe('approved');
    expect(afterTransientSync.order_status).toBe('paid');
    expect(afterTransientSync.payment_payload.sync_checked).toBe(true);
    expect(afterTransientSync.payment_payload.status_detail).toBe('accredited');
  });

  it('preserva event_key em corrida de webhook, protege refunded contra downgrade e bloqueia reabertura de pedido cancelado', async () => {
    const customer = await insertTestCustomer();
    const product = await insertTestProduct({ stock: 5 });
    const order = await createInternalOrder({
      customerId: customer.id,
      productId: product.id,
      quantity: 2,
      deliveryAddress: { cep: '01001-000' },
      paymentMethod: 'pix',
    });

    const raceEventKey = `evt-race-${Date.now()}`;
    const raceMpId = `ORD-RACE-${Date.now()}`;

    // Webhook chega antes de mp_payment_id/externalReference existir -> não queima event_key
    const raceRes = await processMercadoPagoWebhookEvent({
      eventId: raceEventKey,
      eventType: 'order.processed',
      mpPaymentId: raceMpId,
      paymentStatus: 'approved',
    });
    expect(raceRes).toEqual({
      duplicate: false,
      order: null,
      orderNotFound: true,
      stockChanged: false,
    });

    // Retry com o mesmo eventKey após attach/externalReference é processado normalmente
    const retryRes = await processMercadoPagoWebhookEvent({
      eventId: raceEventKey,
      eventType: 'order.processed',
      mpPaymentId: raceMpId,
      externalReference: String(order.id),
      paymentStatus: 'approved',
    });
    expect(retryRes.duplicate).toBe(false);
    expect(retryRes.order.order_status).toBe('paid');

    // Estorno seguido de webhook atrasado 'approved' não faz downgrade e bloqueia reabertura manual
    const refunded = await processMercadoPagoWebhookEvent({
      eventId: `evt-refund-${Date.now()}`,
      eventType: 'order.refunded',
      mpPaymentId: raceMpId,
      paymentStatus: 'refunded',
    });
    expect(refunded.order.payment_status).toBe('refunded');
    expect(refunded.order.order_status).toBe('cancelled');
    expect(refunded.order.stock_restored).toBe(true);

    const lateApprovedAfterRefund = await processMercadoPagoWebhookEvent({
      eventId: `evt-late-refund-${Date.now()}`,
      eventType: 'order.processed',
      mpPaymentId: raceMpId,
      paymentStatus: 'approved',
    });
    expect(lateApprovedAfterRefund.order.payment_status).toBe('refunded');
    expect(lateApprovedAfterRefund.order.order_status).toBe('cancelled');

    await expect(updateAdminOrder(order.id, { orderStatus: 'paid' })).rejects.toThrow(
      'ORDER_CANCELLED_CANNOT_REOPEN'
    );
  });
});
