/**
 * Admin CRUD Handler Factory
 *
 * Centraliza o boilerplate comum a todos os endpoints admin:
 * - Verificação de método HTTP + resposta 405 padronizada
 * - Autenticação via `withAuth`
 * - RBAC (verificação de permissão por cargo)
 * - Rate limiting em mutações
 * - Invalidação automática de cache em mutações
 * - Injeção de utilitários (logActivity, invalidateCache)
 * - Try/catch unificado com resposta de erro padronizada
 *
 * Uso:
 *   import { createAdminHandler } from '../../../lib/api/adminCrudHandler.js';
 *   import { z } from 'zod';
 *
 *   const schema = z.object({ title: z.string().min(1) });
 *
 *   async function handleGet(req, res) { ... }
 *   async function handlePost(req, res) { ... }
 *
 *   export default createAdminHandler({
 *     name: 'Post',
 *     permission: 'Posts/Artigos',
 *     handlers: { GET: handleGet, POST: handlePost },
 *     rateLimit: { max: 30, window: 60000 },
 *     cacheKeys: 'posts:public:all',
 *   });
 */
import { withAuth } from '../auth.js';
import { logActivity } from '../domain/audit.js';
import { checkRateLimit, invalidateCache as invalidateCacheFn } from '../cache.js';
import { query } from '../db.js';
import { getClientIP, detectSpoofedIP } from './helpers.js';
import { logger } from '../logger.js';

/**
 * @param {Object} config
 * @param {string} config.name            - Nome da entidade para logs (ex: 'Post', 'Dica')
 * @param {string|string[]} [config.permission] - Permissão(ões) exigida(s) (OR). Ex: 'Posts/Artigos' ou ['Auditoria', 'Segurança']
 * @param {boolean} [config.requireAdmin] - Se true, exige role === 'admin' (sem buscar permissões no banco)
 * @param {Object} config.handlers        - Mapeamento método -> handler: { GET: fn, POST: fn, ... }
 * @param {Object} [config.rateLimit]     - { max: number, window: number (ms) }
 * @param {string|string[]} [config.cacheKeys] - Chave(s) de cache para invalidar em mutações
 * @param {string[]} [config.allowedMethods]   - Métodos permitidos (default: GET, POST, PUT, DELETE)
 * @returns {Function} Next.js API handler
 */
export function createAdminHandler(config) {
  const {
    name,
    permission,
    requireAdmin = false,
    handlers = {},
    rateLimit,
    cacheKeys,
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE'],
  } = config;

  async function handler(req, res) {
    const { method } = req;
    // IP confiável: usa socket diretamente (evita IP spoofing via X-Forwarded-For)
    const ip = getClientIP(req);
    const user = req.user;

    // ── 1. Verificação de método HTTP ──────────────────────────────
    if (!allowedMethods.includes(method)) {
      res.setHeader('Allow', allowedMethods);
      return res.status(405).json({
        error: 'Método não permitido',
        message: `Método ${method} não permitido. Use: ${allowedMethods.join(', ')}.`,
      });
    }

    // ── 2. Verificação de autenticação ────────────────────────────
    if (!user) {
      return res.status(401).json({
        error: 'Não autenticado',
        message: 'Usuário não autenticado.',
      });
    }

    // ── 3. RBAC — administrador obrigatório ───────────────────────
    if (requireAdmin && user.role !== 'admin') {
      return res.status(403).json({
        error: 'Acesso negado',
        message: 'Acesso negado. Requer privilégios de administrador.',
      });
    }

    // ── 4. RBAC — verificação de permissão específica ─────────────
    if (permission) {
      const requiredPermissions = Array.isArray(permission) ? permission : [permission];

      try {
        const roleQuery = await query(
          'SELECT permissions FROM roles WHERE name = $1',
          [user.role],
          { log: false },
        );
        const userPermissions = roleQuery.rows[0]?.permissions || [];

        if (user.role !== 'admin') {
          const hasPermission = requiredPermissions.some(p => userPermissions.includes(p));
          if (!hasPermission) {
            return res.status(403).json({
              error: 'Acesso negado',
              message: `Acesso negado. Requer permissão: ${requiredPermissions.join(' ou ')}.`,
            });
          }
        }
      } catch {
        // Se a tabela roles não existir, permite apenas admin
        if (!user || user.role !== 'admin') {
          return res.status(403).json({
            error: 'Acesso negado',
            message: 'Acesso negado. Não foi possível verificar permissões.',
          });
        }
      }
    }

    // ── 5. Detecção de IP spoofing ────────────────────────────────
    if (['POST', 'PUT', 'DELETE'].includes(method)) {
      const { isSpoofed } = detectSpoofedIP(req);
      if (isSpoofed) {
        return res.status(403).json({
          error: 'IP spoofing detectado',
          message: 'Tentativa de IP spoofing detectada. Requisição bloqueada.',
        });
      }
    }

    // ── 6. Rate limiting em mutações ──────────────────────────────
    if (rateLimit && ['POST', 'PUT', 'DELETE'].includes(method)) {
      const isRateLimited = await checkRateLimit(
        ip,
        `api:admin:${name.toLowerCase()}`,
        rateLimit.max,
        rateLimit.window,
      );
      if (isRateLimited) {
        return res.status(429).json({
          error: 'Muitas requisições',
          message: 'Muitas requisições. Tente novamente mais tarde.',
        });
      }
    }

    // ── 7. Execução do handler específico ─────────────────────────
    const handlerFn = handlers[method];
    if (!handlerFn) {
      res.setHeader('Allow', allowedMethods);
      return res.status(405).json({
        error: 'Método não permitido',
        message: `Método ${method} não permitido. Use: ${allowedMethods.join(', ')}.`,
      });
    }

    try {
      // Injeta utilitários no request para os handlers usarem
      req.adminUtils = {
        /**
         * Registra atividade no log de auditoria.
         * @param {string} action  - Ex: 'CRIAR POST', 'ATUALIZAR DICA'
         * @param {number|string} entityId
         * @param {string} description
         */
        logActivity(action, entityId, description) {
          if (user) {
            return logActivity(
              user.username,
              action,
              name.toUpperCase(),
              entityId,
              description,
              ip,
            );
          }
        },

        /**
         * Invalida chave(s) de cache.
         * @param {string|string[]} [keys] - Se omitido, usa cacheKeys da config
         */
        invalidateCache(keys) {
          const keyList = keys
            ? (Array.isArray(keys) ? keys : [keys])
            : (cacheKeys
              ? (Array.isArray(cacheKeys) ? cacheKeys : [cacheKeys])
              : []);
          return Promise.all(keyList.map(k => invalidateCacheFn(k)));
        },

        user,
        ip,
      };

      const result = await handlerFn(req, res);

      // ── 8. Invalidação automática de cache em mutações bem-sucedidas ──
      if (['POST', 'PUT', 'DELETE'].includes(method) && cacheKeys && res.statusCode < 400) {
        const keyList = Array.isArray(cacheKeys) ? cacheKeys : [cacheKeys];
        await Promise.all(keyList.map(k => invalidateCacheFn(k)));
      }

      return result;
    } catch (error) {
      logger.error(`AdminCrudHandler`, `Erro no handler ${name}:`, error);

      // Traduz mensagens de erro comuns do banco para português
      let friendlyMessage = error.message;
      const lowerMsg = error.message?.toLowerCase() || '';
      if (lowerMsg.includes('unique constraint') || lowerMsg.includes('duplicate key')) {
        friendlyMessage = 'Já existe um registro com esses dados.';
      } else if (lowerMsg.includes('foreign key') || lowerMsg.includes('violates foreign')) {
        friendlyMessage = 'Registro possui referências em outros dados e não pode ser excluído.';
      } else if (lowerMsg.includes('not null') || lowerMsg.includes('null value')) {
        friendlyMessage = 'Um campo obrigatório não foi informado.';
      }

      return res.status(500).json({
        error: 'Erro interno no servidor',
        message: friendlyMessage,
      });
    }
  }

  return withAuth(handler);
}