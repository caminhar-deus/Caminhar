/**
 * Checagem de permissão de cargo (RBAC) — helper compartilhado.
 *
 * Extraído de `lib/api/adminCrudHandler.js` SEM mudar comportamento observável:
 * - a tabela `roles` é consultada MESMO para o cargo `admin` (a consulta roda
 *   em todas as chamadas, inclusive quando o resultado é bypass);
 * - `role === 'admin'` é permitido POR DESENHO (o cargo ADMIN é um cargo comum
 *   que contém todas as permissões por definição — ADR-0010), inclusive quando
 *   a leitura do banco FALHA (fail-open apenas para o admin);
 * - para qualquer outro cargo, falha de leitura do cargo é fail-closed
 *   (`allowed: false, reason: 'error'`);
 * - `roles.permissions` corrompido (parse falhou) vira `[]` (fail-closed) e
 *   registra `logger.warn` — a telemetria fica aqui porque
 *   `lib/domain/permissions.js` é importado pelo client e mantém ZERO imports.
 */
import { getRolePermissions, isPermissionParseFailure } from '../domain/permissions.js';
import { query } from '../infra/db.js';
import { logger } from '../infra/logger.js';

/** Tag dos logs deste módulo (nome do módulo, contrato `logger.<nível>(tag, msg)`). */
const LOG_TAG = 'RolePermission';

/**
 * Verifica se o cargo tem (pelo menos uma das) permissão(ões) exigida(s).
 *
 * @param {string} role - Cargo de quem está agindo
 * @param {string|string[]} requiredPermissions - Permissão(ões) exigida(s) (semântica de OU)
 * @returns {Promise<{ allowed: boolean, reason: 'ok'|'admin'|'missing'|'error', error?: unknown }>}
 */
export async function checkRolePermission(role, requiredPermissions) {
  const required = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

  try {
    const roleQuery = await query(
      'SELECT permissions FROM roles WHERE name = $1',
      [role],
      { log: false },
    );
    // O banco guarda texto (TEXT com string JSON): normaliza na fronteira
    // para `string[]` — evita match de substring sobre a string crua.
    const rawPermissions = roleQuery.rows[0]?.permissions;
    const userPermissions = getRolePermissions(roleQuery.rows[0]);

    // Fail-closed SEM telemetria viraria "cargo sem permissões" em silêncio.
    // Só alerta quando o parse FALHOU (string não vazia que não resulta em
    // permissões) — nunca no caso legítimo de cargo sem permissões
    // (`[]`/`'[]'`), para não spammar o log.
    if (userPermissions.length === 0 && isPermissionParseFailure(rawPermissions)) {
      logger.warn(
        LOG_TAG,
        `permissions corrompidos no cargo "${role}" (parse falhou; fail-closed para []): ${String(rawPermissions).slice(0, 120)}`,
      );
    }

    // `role === 'admin'` pula a checagem de permissão POR DESENHO (ADR-0010).
    if (role === 'admin') {
      return { allowed: true, reason: 'admin' };
    }

    const hasPermission = required.some((p) => userPermissions.includes(p));
    return hasPermission
      ? { allowed: true, reason: 'ok' }
      : { allowed: false, reason: 'missing' };
  } catch (error) {
    // Se a tabela `roles` não existir (ou qualquer falha de leitura), permite
    // apenas o cargo `admin` (fail-closed para os demais). O erro original é
    // repassado no campo `error` para o call site registrar a telemetria.
    if (role === 'admin') {
      return { allowed: true, reason: 'admin' };
    }
    return { allowed: false, reason: 'error', error };
  }
}
