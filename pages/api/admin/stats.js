import { query } from '../../../lib/infra/db';
import { createAdminHandler } from '../../../lib/api/adminCrudHandler.js';

async function handleGet(req, res) {
  // Executa as contagens simultaneamente para maior performance
  const [
    postsRes, musicasRes, videosRes, productsRes,
    productsPubRes, productsDraftRes, usersRes,
    postsPubRes, postsDraftRes,
    musicasPubRes, musicasDraftRes,
    videosPubRes, videosDraftRes,
    usersTodayRes, usersMonthRes, usersYearRes,
    dicasRes, dicasPubRes, dicasDraftRes,
    internalProductsRes, internalProductsPubRes, internalProductsDraftRes,
    salesRes,
    salesPaymentPixRes, salesPaymentCreditCardRes, salesPaymentDebitCardRes, salesPaymentTicketRes,
    salesOrderAwaitingPaymentRes, salesOrderPaidRes, salesOrderPreparingRes,
    salesOrderShippedRes, salesOrderDeliveredRes, salesOrderCancelledRes
  ] = await Promise.all([
    query('SELECT COUNT(*) FROM posts'),
    query('SELECT COUNT(*) FROM musicas'),
    query('SELECT COUNT(*) FROM videos'),
    query("SELECT COUNT(*) FROM products WHERE modality = 'external'"),
    query("SELECT COUNT(*) FROM products WHERE modality = 'external' AND published = true"),
    query("SELECT COUNT(*) FROM products WHERE modality = 'external' AND published = false"),
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
    query("SELECT COUNT(*) FROM products WHERE modality = 'internal'"),
    query("SELECT COUNT(*) FROM products WHERE modality = 'internal' AND published = true"),
    query("SELECT COUNT(*) FROM products WHERE modality = 'internal' AND published = false"),
    query('SELECT COUNT(*) FROM orders'),
    query("SELECT COUNT(*) FROM orders WHERE payment_method = 'pix'"),
    query("SELECT COUNT(*) FROM orders WHERE payment_method = 'credit_card'"),
    query("SELECT COUNT(*) FROM orders WHERE payment_method = 'debit_card'"),
    query("SELECT COUNT(*) FROM orders WHERE payment_method IN ('ticket', 'bolbradesco')"),
    query("SELECT COUNT(*) FROM orders WHERE order_status = 'awaiting_payment'"),
    query("SELECT COUNT(*) FROM orders WHERE order_status = 'paid'"),
    query("SELECT COUNT(*) FROM orders WHERE order_status = 'preparing'"),
    query("SELECT COUNT(*) FROM orders WHERE order_status = 'shipped'"),
    query("SELECT COUNT(*) FROM orders WHERE order_status = 'delivered'"),
    query("SELECT COUNT(*) FROM orders WHERE order_status = 'cancelled'")
  ]);

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
    products: parseInt(productsRes?.rows[0]?.count || 0, 10),
    productsPublished: parseInt(productsPubRes?.rows[0]?.count || 0, 10),
    productsDraft: parseInt(productsDraftRes?.rows[0]?.count || 0, 10),
    internalProducts: parseInt(internalProductsRes?.rows[0]?.count || 0, 10),
    internalProductsPublished: parseInt(internalProductsPubRes?.rows[0]?.count || 0, 10),
    internalProductsDraft: parseInt(internalProductsDraftRes?.rows[0]?.count || 0, 10),
    sales: parseInt(salesRes?.rows[0]?.count || 0, 10),
    salesPaymentPix: parseInt(salesPaymentPixRes?.rows[0]?.count || 0, 10),
    salesPaymentCreditCard: parseInt(salesPaymentCreditCardRes?.rows[0]?.count || 0, 10),
    salesPaymentDebitCard: parseInt(salesPaymentDebitCardRes?.rows[0]?.count || 0, 10),
    salesPaymentTicket: parseInt(salesPaymentTicketRes?.rows[0]?.count || 0, 10),
    salesOrderAwaitingPayment: parseInt(salesOrderAwaitingPaymentRes?.rows[0]?.count || 0, 10),
    salesOrderPaid: parseInt(salesOrderPaidRes?.rows[0]?.count || 0, 10),
    salesOrderPreparing: parseInt(salesOrderPreparingRes?.rows[0]?.count || 0, 10),
    salesOrderShipped: parseInt(salesOrderShippedRes?.rows[0]?.count || 0, 10),
    salesOrderDelivered: parseInt(salesOrderDeliveredRes?.rows[0]?.count || 0, 10),
    salesOrderCancelled: parseInt(salesOrderCancelledRes?.rows[0]?.count || 0, 10),
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
