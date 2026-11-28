import { z } from 'zod';
import { checkRateLimit } from '../../../lib/cache/cache.js';
import { getClientIP } from '../../../lib/api/helpers.js';
import { logger } from '../../../lib/infra/logger.js';
import {
  generateCustomerToken,
  setCustomerAuthCookie,
  clearCustomerAuthCookie,
  getAuthenticatedCustomer,
  generateCustomerRefreshToken,
  hashCustomerRefreshToken,
  setCustomerRefreshCookie,
  clearCustomerRefreshCookie,
  getCustomerRefreshTokenCookie,
} from '../../../lib/auth/customer-auth.js';
import { verifyGoogleIdToken } from '../../../lib/auth/google-id-token.js';
import {
  registerCustomer,
  authenticateCustomer,
  upsertGoogleCustomer,
  getCustomerById,
  updateCustomerProfile,
  storeCustomerRefreshToken,
  validateCustomerRefreshToken,
  consumeCustomerRefreshToken,
  revokeCustomerRefreshToken,
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

const GOOGLE_CONFIG_ERROR_CODES = new Set(['GOOGLE_NOT_CONFIGURED', 'GOOGLE_AUDIENCE_MISMATCH']);

function clearCustomerSessionCookies(res) {
  clearCustomerAuthCookie(res);
  clearCustomerRefreshCookie(res);
}

async function issueCustomerSession(res, customer) {
  const token = generateCustomerToken(customer);
  setCustomerAuthCookie(res, token);

  const refreshToken = generateCustomerRefreshToken();
  const tokenHash = hashCustomerRefreshToken(refreshToken);
  if (!tokenHash) {
    return;
  }

  try {
    await storeCustomerRefreshToken(customer.id, tokenHash);
    setCustomerRefreshCookie(res, refreshToken);
  } catch (storeErr) {
    logger.error('CustomerAuth', 'Falha ao armazenar refresh token do visitante:', storeErr);
  }
}

async function verifyGoogleCredential(payload) {
  if (payload.credential) {
    return verifyGoogleIdToken(payload.credential);
  }

  if (
    payload.googleSub &&
    payload.email &&
    process.env.NODE_ENV !== 'production' &&
    process.env.ALLOW_GOOGLE_DEV_BYPASS === 'true'
  ) {
    return {
      googleSub: payload.googleSub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
    };
  }

  const hasClientId = Boolean(
    String(process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '').trim()
  );
  const errorCode = hasClientId ? 'INVALID_GOOGLE_TOKEN' : 'GOOGLE_NOT_CONFIGURED';
  const err = new Error(errorCode);
  err.code = errorCode;
  throw err;
}

export default async function handler(req, res) {
  try {
    res.setHeader('Cache-Control', 'no-store, private');

    if (req.method === 'GET') {
      const ip = getClientIP(req);
      if (await checkRateLimit(ip, 'api:customer:session', 120, 60000)) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Muitas consultas em sequência. Aguarde um instante e tente novamente.',
        });
      }
      const session = getAuthenticatedCustomer(req);
      if (session) {
        const customer = await getCustomerById(session.customerId);
        if (!customer) {
          clearCustomerSessionCookies(res);
          return res.status(200).json({ authenticated: false, customer: null });
        }
        return res.status(200).json({ authenticated: true, customer });
      }

      const rawRefresh = getCustomerRefreshTokenCookie(req);
      if (!rawRefresh) {
        return res.status(200).json({ authenticated: false, customer: null });
      }

      const tokenHash = hashCustomerRefreshToken(rawRefresh);
      if (!tokenHash) {
        clearCustomerSessionCookies(res);
        return res.status(200).json({ authenticated: false, customer: null });
      }

      const stored = await validateCustomerRefreshToken(tokenHash);
      if (!stored) {
        clearCustomerSessionCookies(res);
        return res.status(200).json({ authenticated: false, customer: null });
      }

      const customer = await getCustomerById(stored.customer_id);
      if (!customer) {
        clearCustomerSessionCookies(res);
        return res.status(200).json({ authenticated: false, customer: null });
      }

      const renewedToken = generateCustomerToken(customer);
      setCustomerAuthCookie(res, renewedToken);
      return res.status(200).json({ authenticated: true, customer });
    }

    if (req.method === 'PUT') {
      const session = getAuthenticatedCustomer(req);
      if (!session) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Faça login para atualizar seus dados.' });
      }
      const ip = getClientIP(req);
      if (await checkRateLimit(ip, 'api:customer:profile', 30, 60000)) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Muitas tentativas. Aguarde um minuto e tente novamente.',
        });
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
      if (!updated) {
        clearCustomerSessionCookies(res);
        return res.status(404).json({ error: 'Not Found', message: 'Conta não encontrada.' });
      }
      return res.status(200).json({ customer: updated });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed', message: 'Método não permitido' });
    }

    const ip = getClientIP(req);
    const action = req.body?.action;

    if (action === 'logout') {
      if (await checkRateLimit(ip, 'api:customer:logout', 30, 60000)) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Muitas tentativas. Aguarde um minuto e tente novamente.',
        });
      }
      const rawRefresh = getCustomerRefreshTokenCookie(req);
      const tokenHash = hashCustomerRefreshToken(rawRefresh);
      if (tokenHash) {
        try {
          await revokeCustomerRefreshToken(tokenHash);
        } catch (revokeErr) {
          logger.warn('CustomerAuth', 'Falha ao revogar refresh token no logout:', revokeErr);
        }
      }
      clearCustomerSessionCookies(res);
      return res.status(200).json({ message: 'Sessão encerrada com sucesso.' });
    }

    const isRateLimited = await checkRateLimit(ip, 'api:customer:auth', 20, 60000);
    if (isRateLimited) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Muitas tentativas. Aguarde um minuto e tente novamente.',
      });
    }

    if (action === 'refresh') {
      const rawRefresh = getCustomerRefreshTokenCookie(req);
      const tokenHash = hashCustomerRefreshToken(rawRefresh);
      if (!tokenHash) {
        clearCustomerSessionCookies(res);
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Sessão expirada. Faça login novamente.',
        });
      }

      const consumed = await consumeCustomerRefreshToken(tokenHash);
      if (!consumed) {
        clearCustomerSessionCookies(res);
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Sessão expirada. Faça login novamente.',
        });
      }

      const customer = await getCustomerById(consumed.customer_id);
      if (!customer) {
        clearCustomerSessionCookies(res);
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Sessão expirada. Faça login novamente.',
        });
      }

      const newRefreshToken = generateCustomerRefreshToken();
      const newTokenHash = hashCustomerRefreshToken(newRefreshToken);
      try {
        await storeCustomerRefreshToken(customer.id, newTokenHash);
      } catch (storeErr) {
        clearCustomerRefreshCookie(res);
        throw storeErr;
      }

      const newAccessToken = generateCustomerToken(customer);
      setCustomerAuthCookie(res, newAccessToken);
      setCustomerRefreshCookie(res, newRefreshToken);
      return res.status(200).json({ authenticated: true, customer });
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
        await issueCustomerSession(res, customer);
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
      await issueCustomerSession(res, customer);
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
        const reason = err?.code || err?.message || err?.name || 'UnknownError';
        if (GOOGLE_CONFIG_ERROR_CODES.has(reason)) {
          logger.error('CustomerAuth', 'Erro de configuração na autenticação Google:', reason);
        } else {
          logger.warn('CustomerAuth', 'Falha na autenticação Google:', reason);
        }
        if (err?.code === 'GOOGLE_UPSTREAM_UNAVAILABLE') {
          return res.status(503).json({
            error: 'Service Unavailable',
            message: 'Serviço de autenticação do Google temporariamente indisponível. Tente novamente ou use seu e-mail e senha.',
          });
        }
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Não foi possível autenticar com o Google. Tente novamente ou use seu e-mail e senha.',
        });
      }
      let customer;
      try {
        customer = await upsertGoogleCustomer(googleProfile);
      } catch (err) {
        if (err?.code === 'GOOGLE_ACCOUNT_CONFLICT' || err?.message === 'GOOGLE_ACCOUNT_CONFLICT') {
          logger.warn('CustomerAuth', 'Conflito de vínculo de conta Google:', 'GOOGLE_ACCOUNT_CONFLICT');
          return res.status(409).json({
            error: 'Conflict',
            message: 'Este e-mail já está vinculado a outra conta Google.',
          });
        }
        throw err;
      }
      await issueCustomerSession(res, customer);
      return res.status(200).json({ customer });
    }

    return res.status(400).json({ error: 'Bad Request', message: 'Ação inválida.' });
  } catch (error) {
    logger.error('CustomerAuth', 'Erro na rota de autenticação do visitante:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro interno no servidor.' });
  }
}
