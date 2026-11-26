import { query } from '../../../lib/infra/db';
import { createAdminHandler } from '../../../lib/api/adminCrudHandler.js';

async function handleGet(req, res) {
  // Executa as contagens simultaneamente usando agregações condicionais em `products` e `orders`
  // para reduzir conexões simultâneas no pool.
  const [
    postsRes, musicasRes, videosRes, productsStatsRes,
    usersRes,
    postsPubRes, postsDraftRes,
    musicasPubRes, musicasDraftRes,
    videosPubRes, videosDraftRes,
    usersTodayRes, usersMonthRes, usersYearRes,
    dicasRes, dicasPubRes, dicasDraftRes,
    ordersStatsRes,
  ] = await Promise.all([
    query('SELECT COUNT(*) FROM posts'),
    query('SELECT COUNT(*) FROM musicas'),
    query('SELECT COUNT(*) FROM videos'),
    query(`SELECT
      COUNT(*) FILTER (WHERE modality = 'external') AS external_total,
      COUNT(*) FILTER (WHERE modality = 'external' AND published = true) AS external_published,
      COUNT(*) FILTER (WHERE modality = 'external' AND published = false) AS external_draft,
      COUNT(*) FILTER (WHERE modality = 'internal') AS internal_total,
      COUNT(*) FILTER (WHERE modality = 'internal' AND published = true) AS internal_published,
      COUNT(*) FILTER (WHERE modality = 'internal' AND published = false) AS internal_draft
    FROM products`),
    query('SELECT COUNT(*) FROM users'),
    query('SELECT COUNT(*) FROM posts WHERE published = true'),
    query('SELECT COUNT(*) FROM posts WHERE published = false'),
    query('SELECT COUNT(*) FROM musicas WHERE published = true'),
    query('SELECT COUNT(*) FROM musicas WHERE published = false'),
    query('SELECT COUNT(*) FROM videos WHERE published = true'),
    query('SELECT COUNT(*) FROM videos WHERE published = false'),
    query('SELECT COUNT(*) FROM users WHERE last_login_at >= CURRENT_DATE'), // Logados Hoje
    query("SELECT COUNT(*) FROM users WHERE last_login_at >= date_trunc('month', CURRENT_DATE)"), // Logados no Mês
    query("SELECT COUNT(*) FROM users WHERE last_login_at >= date_trunc('year', CURRENT_DATE)"), // Logados no Ano
    query('SELECT COUNT(*) FROM dicas'),
    query('SELECT COUNT(*) FROM dicas WHERE published = true'),
    query('SELECT COUNT(*) FROM dicas WHERE published = false'),
    query(`SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE payment_method = 'pix') AS payment_pix,
      COUNT(*) FILTER (WHERE payment_method = 'credit_card') AS payment_credit_card,
      COUNT(*) FILTER (WHERE payment_method = 'debit_card') AS payment_debit_card,
      COUNT(*) FILTER (WHERE payment_method IN ('ticket', 'bolbradesco')) AS payment_ticket,
      COUNT(*) FILTER (WHERE order_status = 'awaiting_payment') AS order_awaiting_payment,
      COUNT(*) FILTER (WHERE order_status = 'paid') AS order_paid,
      COUNT(*) FILTER (WHERE order_status = 'preparing') AS order_preparing,
      COUNT(*) FILTER (WHERE order_status = 'shipped') AS order_shipped,
      COUNT(*) FILTER (WHERE order_status = 'delivered') AS order_delivered,
      COUNT(*) FILTER (WHERE order_status = 'cancelled') AS order_cancelled
    FROM orders`),
  ]);

  const prodStats = productsStatsRes?.rows?.[0] || {};
  const ordStats = ordersStatsRes?.rows?.[0] || {};

  return res.status(200).json({
    posts: parseInt(postsRes?.rows[0]?.count || 0, 10),
    postsPublished: parseInt(postsPubRes?.rows[0]?.count || 0, 10),
    postsDraft: parseInt(postsDraftRes?.rows[0]?.count || 0, 10),
    musicas: parseInt(musicasRes?.rows[0]?.count || 0, 10),
    musicasPublished: parseInt(musicasPubRes?.rows[0]?.count || 0, 10),
    musicasDraft: parseInt(musicasDraftRes?.rows[0]?.count || 0, 10),
    videos: parseInt(videosRes?.rows[0]?.count || 0, 10),
    videosPublished: parseInt(videosPubRes?.rows[0]?.count || 0, 10),
    videosDraft: parseInt(videosDraftRes?.rows[0]?.count || 0, 10),
    products: parseInt(prodStats.external_total ?? prodStats.count ?? 0, 10),
    productsPublished: parseInt(prodStats.external_published ?? prodStats.count ?? 0, 10),
    productsDraft: parseInt(prodStats.external_draft ?? prodStats.count ?? 0, 10),
    internalProducts: parseInt(prodStats.internal_total ?? prodStats.count ?? 0, 10),
    internalProductsPublished: parseInt(prodStats.internal_published ?? prodStats.count ?? 0, 10),
    internalProductsDraft: parseInt(prodStats.internal_draft ?? prodStats.count ?? 0, 10),
    sales: parseInt(ordStats.total ?? ordStats.count ?? 0, 10),
    salesPaymentPix: parseInt(ordStats.payment_pix ?? ordStats.count ?? 0, 10),
    salesPaymentCreditCard: parseInt(ordStats.payment_credit_card ?? ordStats.count ?? 0, 10),
    salesPaymentDebitCard: parseInt(ordStats.payment_debit_card ?? ordStats.count ?? 0, 10),
    salesPaymentTicket: parseInt(ordStats.payment_ticket ?? ordStats.count ?? 0, 10),
    salesOrderAwaitingPayment: parseInt(ordStats.order_awaiting_payment ?? ordStats.count ?? 0, 10),
    salesOrderPaid: parseInt(ordStats.order_paid ?? ordStats.count ?? 0, 10),
    salesOrderPreparing: parseInt(ordStats.order_preparing ?? ordStats.count ?? 0, 10),
    salesOrderShipped: parseInt(ordStats.order_shipped ?? ordStats.count ?? 0, 10),
    salesOrderDelivered: parseInt(ordStats.order_delivered ?? ordStats.count ?? 0, 10),
    salesOrderCancelled: parseInt(ordStats.order_cancelled ?? ordStats.count ?? 0, 10),
    users: parseInt(usersRes?.rows[0]?.count || 0, 10),
    usersToday: parseInt(usersTodayRes?.rows[0]?.count || 0, 10),
    usersMonth: parseInt(usersMonthRes?.rows[0]?.count || 0, 10),
    usersYear: parseInt(usersYearRes?.rows[0]?.count || 0, 10),
    dicas: parseInt(dicasRes?.rows[0]?.count || 0, 10),
    dicasPublished: parseInt(dicasPubRes?.rows[0]?.count || 0, 10),
    dicasDraft: parseInt(dicasDraftRes?.rows[0]?.count || 0, 10),
  });
}

export default createAdminHandler({
  name: 'Stats',
  permission: 'Visão Geral',
  allowedMethods: ['GET'],
  handlers: { GET: handleGet },
  rateLimit: { max: 30, window: 60000 },
});
