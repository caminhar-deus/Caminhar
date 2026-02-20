/**
 * @fileoverview API de Login - Versão Refatorada (v2)
 * 
 * Demonstração do uso do API Response Standardizer.
 * Versão atualizada do endpoint de autenticação.
 * 
 * @module pages/api/auth/login.v2
 * @author API Standardizer Team
 * @version 2.0.0
 */

import { z } from 'zod';
import { authenticate, generateToken, setAuthCookie } from '../../../lib/auth.js';
import { success, unauthorized, serverError, validationError } from '../../../lib/api/response.js';
import { ValidationError, AuthenticationError } from '../../../lib/api/errors.js';
import { validateBody } from '../../../lib/api/validate.js';
import { composeMiddleware, withMethod, withRateLimit, withCors, withErrorHandler } from '../../../lib/api/middleware.js';

// Schema de validação para login
const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'Nome de usuário é obrigatório')
    .max(100, 'Nome de usuário muito longo'),
  password: z
    .string()
    .min(1, 'Senha é obrigatória')
    .max(128, 'Senha muito longa'),
});

/**
 * Handler de autenticação
 * @param {import('http').IncomingMessage} req - Requisição HTTP
 * @param {import('http').ServerResponse} res - Resposta HTTP
 */
async function handler(req, res) {
  const { username, password } = req.body;

  try {
    // Autentica o usuário
    const user = await authenticate(username, password);

    if (!user) {
      throw new AuthenticationError('Credenciais inválidas');
    }

    // Gera token e configura cookie
    const token = generateToken(user);
    setAuthCookie(res, token);

    // Retorna dados do usuário (sem senha)
    return success(res, {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      token, // Opcional: retornar token no body para clientes mobile
    }, {
      message: 'Login realizado com sucesso',
      expiresIn: '1h',
    });

  } catch (error) {
    console.error('Login error:', error);
    throw error; // Será tratado pelo withErrorHandler
  }
}

/**
 * Exporta handler com middlewares compostos
 * 
 * Configuração:
 * - Rate limit mais estrito (5 tentativas por 15 min)
 * - CORS configurado
 * - Apenas POST permitido
 * - Validação automática do body
 * - Tratamento de erros padronizado
 */
export default composeMiddleware(
  withErrorHandler({ includeStack: process.env.NODE_ENV === 'development' }),
  withRateLimit({ 
    maxRequests: 5,  // Mais restrito para login
    windowMs: 15 * 60 * 1000, // 15 minutos
  }),
  withCors({ 
    origins: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
    credentials: true,
  }),
  withMethod(['POST']),
  validateBody(loginSchema)
)(handler);

/**
 * Configuração do Next.js
 */
export const config = {
  api: {
    bodyParser: true,
  },
};
