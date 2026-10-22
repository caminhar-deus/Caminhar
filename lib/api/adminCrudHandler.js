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
import { randomUUID } from 'node:crypto';
import { withAuth } from '../auth/auth.js';
import { logActivity } from '../domain/audit.js';
import { checkRolePermission } from './permissions.js';
import { checkRateLimit, invalidateCache as invalidateCacheFn } from '../cache/cache.js';
import { getClientIP } from './helpers.js';
import { logger, runWithRequestId } from '../infra/logger.js';

/**
 * Formato aceito do `x-request-id` enviado pelo cliente.
 *
 * O header é entrada NÃO confiável: o valor é copiado para o header da
 * resposta e para dentro do JSON de log, então só é aceito se casar com o
 * conjunto seguro (letras, dígitos, `.`, `_`, `-`) e até 128 caracteres.
 * Qualquer outra coisa é ignorada e um UUID novo é gerado no servidor —
 * evita injeção de conteúdo arbitrário no log via header.
 */
const CLIENT_REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

// ── Tratamento de erro do passo 6 ─────────────────────────────────────
/**
 * SQLSTATEs do PostgreSQL que indicam banco INDISPONÍVEL (falha de
 * infraestrutura, não erro da requisição) → 503 e não 500.
 * 53300 = too_many_connections; 08xxx = connection exceptions;
 * 57P01/57P02/57P03 = admin_shutdown / crash_shutdown / cannot_connect_now.
 */
const UNAVAILABLE_DB_CODES = new Set([
  '53300',
  '08000',
  '08003',
  '08006',
  '57P01',
  '57P02',
  '57P03',
]);

/**
 * Padrões de rede reconhecidos — MESMOS do retry em `lib/infra/db.js`.
 * Verificado empiricamente: `query()` relança o erro original (`throwOnError`
 * padrão, sem wrap), então o catch vê `error.code`/`error.message` direto.
 * - `ECONNREFUSED`/`ETIMEDOUT` chegam em `error.code` (erro do socket do Node);
 * - `Connection terminated`/`Connection terminated unexpectedly` o `pg` cria
 *   como `new Error(msg)` SEM `code`, então a checagem é pela mensagem.
 */
const NETWORK_ERROR_PATTERNS = [
  'timeout',
  'Connection terminated',
  'ECONNREFUSED',
  'socket not connected',
  'ETIMEDOUT',
];

/** Mensagem genérica de 500: `error.message` cru nunca chega ao cliente. */
const GENERIC_ERROR_MESSAGE = 'Erro interno ao processar a solicitação.';

/** Mensagem genérica de 503: indica temporariedade e convida ao retry. */
const UNAVAILABLE_ERROR_MESSAGE = 'Serviço temporariamente indisponível. Tente novamente em instantes.';

/** Sugestão de espera (segundos) para o `Retry-After` do 503. */
const RETRY_AFTER_SECONDS = 5;

/**
 * Classifica o erro como indisponibilidade de banco/rede (→ 503).
 * @param {Error & { code?: string }} error
 * @returns {boolean}
 */
function isDatabaseUnavailable(error) {
  const code = error?.code == null ? '' : String(error.code);
  if (code && (UNAVAILABLE_DB_CODES.has(code) || NETWORK_ERROR_PATTERNS.includes(code))) {
    return true;
  }
  const message = String(error?.message || '');
  return NETWORK_ERROR_PATTERNS.some(pattern => message.includes(pattern));
}

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
    // IP confiável: getClientIP aplica o modelo de TRUST_PROXY
    // (por padrão o X-Forwarded-For é ignorado e vale o socket)
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
    // A lógica de checagem (consulta de `roles`, normalização fail-closed e o
    // bypass do cargo `admin` por desenho — ADR-0010) vive em
    // `lib/api/permissions.js`, compartilhado com rotas fora do CRUD admin.
    if (permission) {
      const requiredPermissions = Array.isArray(permission) ? permission : [permission];
      const permissionCheck = await checkRolePermission(user.role, requiredPermissions);

      if (!permissionCheck.allowed) {
        // Falha de LEITURA do cargo (tabela `roles` inacessível): nega com
        // telemetria própria — sem este log, a negação por FALHA DE BANCO era
        // indistinguível de "usuário sem a permissão" (a segunda já é
        // registrada só pelo 403, a primeira só aqui).
        if (permissionCheck.reason === 'error') {
          logger.error(
            'AdminCrudHandler',
            `Falha ao verificar permissões no handler ${name} (fail-closed; role "${user?.role}"; cargo não pôde ser lido):`,
            permissionCheck.error,
          );
          return res.status(403).json({
            error: 'Acesso negado',
            message: 'Acesso negado. Não foi possível verificar permissões.',
          });
        }

        // Usuário autenticado sem a permissão exigida.
        return res.status(403).json({
          error: 'Acesso negado',
          message: `Acesso negado. Requer permissão: ${requiredPermissions.join(' ou ')}.`,
        });
      }
    }

    // ── 5. Rate limiting em mutações ──────────────────────────────
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

    // ── 6. Execução do handler específico ─────────────────────────
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

      // ── 7. Invalidação automática de cache em mutações bem-sucedidas ──
      if (['POST', 'PUT', 'DELETE'].includes(method) && cacheKeys && res.statusCode < 400) {
        const keyList = Array.isArray(cacheKeys) ? cacheKeys : [cacheKeys];
        await Promise.all(keyList.map(k => invalidateCacheFn(k)));
      }

      return result;
    } catch (error) {
      logger.error(`AdminCrudHandler`, `Erro no handler ${name}:`, error);

      // Indisponibilidade de banco/rede → 503 com retry (o detalhe cru fica
      // só no log acima, que já recebe o objeto completo).
      if (isDatabaseUnavailable(error)) {
        res.setHeader('Retry-After', String(RETRY_AFTER_SECONDS));
        return res.status(503).json({
          error: 'Serviço temporariamente indisponível',
          message: UNAVAILABLE_ERROR_MESSAGE,
        });
      }

      // Traduz mensagens de erro comuns do banco para português.
      // São os ÚNICOS textos que o cliente recebe fora do genérico: os 3
      // padrões abaixo são de negócio, intencionais e úteis ao operador.
      // Qualquer outra `error.message` é considerada detalhe interno e NÃO
      // vai para a resposta (só para o `logger.error` acima).
      const lowerMsg = String(error.message || '').toLowerCase();
      let friendlyMessage = GENERIC_ERROR_MESSAGE;
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

  // `withAuth` precisa envolver o handler (ele lê token, decodifica e seta
  // `req.user` ANTES de chamar o handler) — e o 401 dele acontece fora do
  // `handler` acima. Por isso o requestId é gerado no wrapper EXTERNO, que
  // é o que a rota exporta.
  const authenticatedHandler = withAuth(handler);

  /**
   * Ponto único de entrada de todas as rotas admin: gera/saneia o
   * `requestId`, devolve o header `X-Request-Id` e roda a request inteira
   * dentro do `AsyncLocalStorage` do logger, para que TODOS os logs
   * (withAuth, RBAC, handler e o catch final) carreguem o mesmo ID.
   */
  return function adminRequestHandler(req, res) {
    const rawRequestId = req.headers?.['x-request-id'];
    // Entrada não confiável: só aceita o formato seguro; o resto vira UUID.
    const requestId =
      typeof rawRequestId === 'string' && CLIENT_REQUEST_ID_PATTERN.test(rawRequestId)
        ? rawRequestId
        : randomUUID();

    // UMA única vez, antes de qualquer resposta — vale inclusive nos
    // early-returns (401 do withAuth, 403/405/429/500 do handler).
    res.setHeader('X-Request-Id', requestId);

    return runWithRequestId(requestId, () => authenticatedHandler(req, res));
  };
}