import { getAuthToken, verifyToken } from '../../../lib/auth/auth.js';
import { logger } from '../../../lib/infra/logger.js';
import { query } from '../../../lib/infra/db.js';
import { getRolePermissions, isPermissionParseFailure } from '../../../lib/domain/permissions.js';

/**
 * Endpoint de verificação de autenticação.
 *
 * GET /api/auth/check — Valida token JWT e retorna informações do usuário
 *
 * `data.user.permissions` (array normalizado via `getRolePermissions`) foi
 * adicionado porque este endpoint RECONSTRÓI a sessão após o reload do `/admin`
 * feito logo após o login (`pages/admin.js`): sem ele, `currentUser.permissions`
 * ficava `undefined` e o não-admin legítimo perdia acesso à UI. A coluna
 * `roles.permissions` é TEXT (string JSON), então o valor é normalizado na
 * fronteira.
 *
 * `data.user.permissionsLoaded` (boolean) distingue os dois significados de um
 * `permissions: []` no corpo:
 *  - `permissions: []` + `permissionsLoaded: true` → consulta a `roles` OK;
 *    cargo legitimamente sem permissões (ou com JSON `'[]'`).
 *  - `permissions: []` + `permissionsLoaded: false` → a consulta a `roles`
 *    FALHOU (inclusive tabela ausente, 42P01); `[]` é só o fallback
 *    fail-closed, não um fato sobre o cargo. Mesma semântica de `login.js` e de
 *    `refreshAccessToken`.
 *
 * Resiliência: se a consulta a `roles` falhar, o endpoint continua respondendo
 * 200 com `permissions: []` + `permissionsLoaded: false` e registra o erro via
 * logger — o `check` responde sobre autenticação, não sobre schema, e não pode
 * estourar 500 por causa de `roles` (o status 200 é intencional e revisado).
 *
 * Integrado ao padrão do projeto: usa cookie httpOnly (web) ou Bearer token (API).
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Método não permitido - apenas GET é aceito',
    });
  }

  try {
    // Obtém token do header Authorization ou cookie
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Autenticação necessária',
      });
    }

    // Verifica token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token inválido ou expirado',
      });
    }

    // Permissões do cargo (roles.permissions é TEXT com string JSON).
    // Resiliência obrigatória: falha aqui nunca derruba o check.
    // `permissionsLoaded` informa ao front se `permissions` é real ou fallback.
    let permissions = [];
    let permissionsLoaded = true;
    try {
      const roleQuery = await query('SELECT permissions FROM roles WHERE name = $1', [decoded.role], { log: false });
      const rawPermissions = roleQuery.rows[0]?.permissions;
      permissions = getRolePermissions(roleQuery.rows[0]);

      // Fail-closed SEM telemetria: dado corrompido viraria "sem permissão" em
      // silêncio. Só alerta quando o parse FALHOU (string não vazia que não
      // resulta em permissões) — nunca no caso legítimo de cargo sem
      // permissões (`[]`/`'[]'`), para não spammar o log.
      if (permissions.length === 0 && isPermissionParseFailure(rawPermissions)) {
        logger.warn(
          'Auth',
          `permissions corrompidos no cargo "${decoded.role}" (parse falhou; fail-closed para []): ${String(rawPermissions).slice(0, 120)}`,
        );
      }
    } catch (roleError) {
      logger.warn('Auth', 'Falha ao buscar permissões do cargo no /api/auth/check:', roleError);
      permissions = [];
      permissionsLoaded = false;
    }

    // Retorna informações do usuário
    res.status(200).json({
      success: true,
      data: {
        authenticated: true,
        user: {
          userId: decoded.userId,
          username: decoded.username,
          role: decoded.role,
          permissions,
          permissionsLoaded,
        },
      },
      message: 'Autenticação válida',
    });
  } catch (error) {
    logger.error('Auth', 'Erro na verificação de autenticação:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Erro no servidor durante verificação de autenticação',
    });
  }
}