import { z } from 'zod';
import { query } from '../../lib/infra/db.js';
import { checkRateLimit, invalidateCache } from '../../lib/cache/cache.js';
import { getClientIP } from '../../lib/api/helpers.js';
import { getAuthenticatedCustomer } from '../../lib/auth/customer-auth.js';
import { getCustomerById, updateCustomerProfile } from '../../lib/domain/customers.js';
import {
  createInternalOrder,
  attachOrderPaymentInfo,
  calculateShippingCost,
} from '../../lib/domain/orders.js';
import { createMercadoPagoPayment } from '../../lib/payment/mercadopago.js';
import { logger } from '../../lib/infra/logger.js';

const deliveryAddressSchema = z.object({
  cep: z.string().trim().min(8, 'Informe um CEP válido'),
  street: z.string().trim().min(2, 'Informe a rua ou logradouro'),
  number: z.string().trim().min(1, 'Informe o número'),
  complement: z.string().trim().optional(),
  neighborhood: z.string().trim().min(2, 'Informe o bairro'),
  city: z.string().trim().min(2, 'Informe a cidade'),
  state: z.string().trim().min(2, 'Informe a UF (2 letras)').max(2, 'Informe apenas a sigla da UF'),
});

const checkoutPostSchema = z.object({
  productId: z.union([z.number(), z.string()]).transform((v) => parseInt(v, 10)),
  quantity: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => Math.max(1, parseInt(v, 10) || 1)),
  deliveryAddress: deliveryAddressSchema,
  paymentMethod: z.enum(['pix', 'debit_card', 'credit_card', 'ticket']),
  paymentDetails: z
    .object({
      cardHolderName: z.string().trim().optional(),
      cardNumber: z.string().trim().optional(),
      installments: z.union([z.number(), z.string()]).optional(),
      token: z.string().optional(),
      paymentMethodId: z.string().optional(),
    })
    .optional(),
});

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const productId = parseInt(req.query?.productId, 10);
      if (Number.isNaN(productId) || productId <= 0) {
        return res.status(400).json({ error: 'Bad Request', message: 'ID do produto inválido.' });
      }

      const { rows } = await query(
        `SELECT id, name, description, price, image_url, category, modality, stock, shipping_type, shipping_cost
         FROM products
         WHERE id = $1 AND published = true`,
        [productId]
      );
      const product = rows[0];
      if (!product || product.modality !== 'internal') {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Produto interno não encontrado ou indisponível para venda direta.',
        });
      }

      const formattedPrice = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
        Number(product.price || 0)
      );

      return res.status(200).json({
        product: {
          ...product,
          price: Number(product.price),
          stock: Number(product.stock || 0),
          shipping_cost: Number(product.shipping_cost || 0),
          formatted_price: formattedPrice,
          estimated_shipping_single: calculateShippingCost(product, 1),
        },
      });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed', message: 'Método não permitido' });
    }

    const session = getAuthenticatedCustomer(req);
    if (!session) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Faça login ou crie sua conta para finalizar a compra.',
      });
    }

    const ip = getClientIP(req);
    const isRateLimited = await checkRateLimit(ip, 'api:public:checkout', 15, 60000);
    if (isRateLimited) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Muitas tentativas de compra. Aguarde um instante e tente novamente.',
      });
    }

    const validation = checkoutPostSchema.safeParse(req.body || {});
    if (!validation.success || Number.isNaN(validation.data.productId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Verifique os dados de entrega e de pagamento informados.',
        errors: validation.success ? undefined : validation.error.flatten().fieldErrors,
      });
    }

    const customer = await getCustomerById(session.customerId);
    if (!customer) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Sessão inválida. Faça login novamente.',
      });
    }

    const { productId, quantity, deliveryAddress, paymentMethod, paymentDetails } = validation.data;

    let order;
    try {
      order = await createInternalOrder({
        customerId: customer.id,
        productId,
        quantity,
        deliveryAddress,
        paymentMethod,
      });
    } catch (err) {
      if (err.message === 'PRODUCT_NOT_FOUND' || err.message === 'PRODUCT_NOT_INTERNAL') {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Este produto não está disponível para venda direta no site.',
        });
      }
      if (err.message === 'INSUFFICIENT_STOCK') {
        return res.status(409).json({
          error: 'Conflict',
          message: 'Quantidade solicitada indisponível em estoque.',
        });
      }
      throw err;
    }

    // Salva o endereço como padrão da conta do visitante para próximas compras
    await updateCustomerProfile(customer.id, { defaultAddress: deliveryAddress }).catch(() => {});

    const mpResult = await createMercadoPagoPayment({
      order,
      customer,
      paymentMethod,
      paymentDetails,
    });

    const finalOrder = await attachOrderPaymentInfo(order.id, mpResult);
    await invalidateCache('products:*');

    return res.status(201).json({ order: finalOrder });
  } catch (error) {
    logger.error('Checkout', 'Erro ao processar checkout interno:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Não foi possível processar o seu pedido no momento.',
    });
  }
}
