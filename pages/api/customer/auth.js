import { z } from 'zod';
import { checkRateLimit } from '../../../lib/cache/cache.js';
import { getClientIP } from '../../../lib/api/helpers.js';
import { logger } from '../../../lib/infra/logger.js';
import {
  generateCustomerToken,
  setCustomerAuthCookie,
  clearCustomerAuthCookie,
  getAuthenticatedCustomer,
} from '../../../lib/auth/customer-auth.js';
import { verifyGoogleIdToken } from '../../../lib/auth/google-id-token.js';
import {
  registerCustomer,
  authenticateCustomer,
  upsertGoogleCustomer,
  getCustomerById,
  updateCustomerProfile,
} from '../../../lib/domain/customers.js';

const registerSchema = z.object({
  action: z.literal('register'),
  name: z.string().trim().min(2, 'Informe seu nome completo'),
  email: z.string().trim().email('E-mail inválido'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
  phone: z.string().trim().optional(),
});

const loginSchema = z.object({
  action: z.literal('login'),
  email: z.string().trim().email('E-mail inválido'),
  password: z.string().min(1, 'Informe sua senha'),
});

const googleSchema = z.object({
  action: z.literal('google'),
  credential: z.string().trim().min(1).optional(),
  email: z.string().trim().email('E-mail inválido').optional(),
  name: z.string().trim().optional(),
  googleSub: z.string().trim().optional(),
});

const profileUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome completo').optional(),
  phone: z.string().trim().optional(),
  defaultAddress: z.object({
    cep: z.string().trim().min(8, 'CEP inválido'),
    street: z.string().trim().min(2, 'Informe a rua/logradouro'),
    number: z.string().trim().min(1, 'Informe o número'),
    complement: z.string().trim().optional(),
    neighborhood: z.string().trim().min(2, 'Informe o bairro'),
    city: z.string().trim().min(2, 'Informe a cidade'),
    state: z.string().trim().min(2, 'Informe o estado (UF)').max(2, 'Use a sigla da UF'),
  }).optional(),
});

async function verifyGoogleCredential(payload) {
  if (payload.credential) {
    return verifyGoogleIdToken(payload.credential);
  }

  if (payload.googleSub && payload.email && process.env.NODE_ENV !== 'production') {
    return {
      googleSub: payload.googleSub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
    };
  }

  throw new Error('GOOGLE_NOT_CONFIGURED');
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const session = getAuthenticatedCustomer(req);
      if (!session) {
        return res.status(200).json({ authenticated: false, customer: null });
      }
      const customer = await getCustomerById(session.customerId);
      if (!customer) {
        clearCustomerAuthCookie(res);
        return res.status(200).json({ authenticated: false, customer: null });
      }
      return res.status(200).json({ authenticated: true, customer });
    }

    if (req.method === 'PUT') {
      const session = getAuthenticatedCustomer(req);
      if (!session) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Faça login para atualizar seus dados.' });
      }
      const validation = profileUpdateSchema.safeParse(req.body || {});
      if (!validation.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Dados inválidos.',
          errors: validation.error.flatten().fieldErrors,
        });
      }
      const updated = await updateCustomerProfile(session.customerId, validation.data);
      return res.status(200).json({ customer: updated });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed', message: 'Método não permitido' });
    }

    const action = req.body?.action;

    if (action === 'logout') {
      clearCustomerAuthCookie(res);
      return res.status(200).json({ message: 'Sessão encerrada com sucesso.' });
    }

    const ip = getClientIP(req);
    const isRateLimited = await checkRateLimit(ip, 'api:customer:auth', 20, 60000);
    if (isRateLimited) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Muitas tentativas. Aguarde um minuto e tente novamente.',
      });
    }

    if (action === 'register') {
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Verifique os campos informados.',
          errors: validation.error.flatten().fieldErrors,
        });
      }
      try {
        const customer = await registerCustomer(validation.data);
        const token = generateCustomerToken(customer);
        setCustomerAuthCookie(res, token);
        return res.status(201).json({ customer });
      } catch (err) {
        if (err.message === 'EMAIL_ALREADY_REGISTERED') {
          return res.status(409).json({
            error: 'Conflict',
            message: 'Este e-mail já está cadastrado. Acesse sua conta ou use outro e-mail.',
          });
        }
        throw err;
      }
    }

    if (action === 'login') {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Informe um e-mail válido e sua senha.',
          errors: validation.error.flatten().fieldErrors,
        });
      }
      const customer = await authenticateCustomer(validation.data);
      if (!customer) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'E-mail ou senha incorretos.',
        });
      }
      const token = generateCustomerToken(customer);
      setCustomerAuthCookie(res, token);
      return res.status(200).json({ customer });
    }

    if (action === 'google') {
      const validation = googleSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Dados do Google inválidos.',
        });
      }
      let googleProfile;
      try {
        googleProfile = await verifyGoogleCredential(validation.data);
      } catch (err) {
        logger.warn(
          'CustomerAuth',
          'Falha na autenticação Google:',
          err?.code || err?.message || err?.name || 'UnknownError'
        );
        if (err?.code === 'GOOGLE_UPSTREAM_UNAVAILABLE') {
          return res.status(503).json({
            error: 'Service Unavailable',
            message: 'Serviço de autenticação do Google temporariamente indisponível. Tente novamente ou use seu e-mail e senha.',
          });
        }
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Não foi possível autenticar com o Google. Verifique a configuração ou use seu e-mail e senha.',
        });
      }
      const customer = await upsertGoogleCustomer(googleProfile);
      const token = generateCustomerToken(customer);
      setCustomerAuthCookie(res, token);
      return res.status(200).json({ customer });
    }

    return res.status(400).json({ error: 'Bad Request', message: 'Ação inválida.' });
  } catch (error) {
    logger.error('CustomerAuth', 'Erro na rota de autenticação do visitante:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro interno no servidor.' });
  }
}
