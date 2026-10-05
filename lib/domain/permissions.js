/**
 * Lista de permissões disponíveis para atribuição a cargos de administrador.
 * Utiliza Object.freeze para garantir imutabilidade em tempo de execução,
 * prevenindo modificações acidentais no array durante o ciclo de vida da aplicação.
 *
 * @type {ReadonlyArray<string>}
 */
const permissionsList = Object.freeze([
  'Visão Geral',
  'Posts/Artigos',
  'Gestão de Músicas',
  'Gestão de Vídeos',
  'Gestão de Produtos',
  'Gestão de Dicas',
  'Configuração de Cabeçalho',
  'Segurança',
  'Usuários',
  'Auditoria',
]);

/**
 * Normaliza o valor bruto de `roles.permissions` para um array de strings.
 *
 * Contrato: o banco guarda texto (coluna TEXT contendo uma string JSON);
 * `toPermissionArray` é a fronteira de normalização e a saída é SEMPRE `string[]`
 * — nunca `undefined`, nunca `null`, nunca uma string.
 *
 * Fail-closed: JSON inválido, resultado que não seja array (objeto, número, `null`)
 * ou elementos não-string viram "sem permissão" (`[]`), nunca "permissão fantasma".
 * Isso é o que garante que `array.includes(x)` nunca volte a ser match de substring
 * sobre o texto cru do banco. Não lança exceção. Não muta a entrada.
 *
 * NOTA: este módulo é importado pelo frontend (`components/Admin/AdminRolesTab.js`),
 * portanto deve permanecer com ZERO imports (nada de `logger`/`process.env`).
 * O `logger.warn` de parse inválido é responsabilidade dos call sites.
 *
 * @param {unknown} value - String JSON vinda do banco, array já normalizado ou `undefined`/`null`.
 * @returns {string[]} Permissões como array de strings (possivelmente vazio).
 */
export function toPermissionArray(value) {
  if (value === undefined || value === null) {
    return [];
  }

  if (typeof value === 'string') {
    let parsed;
    try {
      parsed = JSON.parse(value);
    } catch {
      // JSON inválido → fail-closed ("sem permissão")
      return [];
    }
    if (!Array.isArray(parsed)) {
      // Ex: '{"a":1}' (objeto), '123' (número), 'null' → fail-closed
      return [];
    }
    return parsed.filter((item) => typeof item === 'string');
  }

  if (Array.isArray(value)) {
    // Banco legado JSONB (ou valor já normalizado): passthrough tolerante.
    // `filter` devolve sempre uma NOVA array — a entrada nunca é mutada.
    return value.filter((item) => typeof item === 'string');
  }

  // number, boolean, object, etc. → fail-closed
  return [];
}

/**
 * Atalho para `toPermissionArray(role?.permissions)`.
 *
 * @param {{ permissions?: unknown } | undefined} role - Row da tabela `roles` (ou ausente).
 * @returns {string[]} Permissões do cargo como array de strings (possivelmente vazio).
 */
export function getRolePermissions(role) {
  return toPermissionArray(role?.permissions);
}

/**
 * Detecta quando `roles.permissions` está CORROMPIDO (parse falhou).
 *
 * Dado corrompido vira `[]` em `toPermissionArray` (fail-closed) e, sem
 * telemetria, viraria "cargo sem permissões" em silêncio. Este predicado é
 * puro (sem `logger` — este módulo é importado pelo client e mantém ZERO
 * imports) e deve ser usado pelos call sites server-side para decidir quando
 * registrar o `logger.warn`.
 *
 * Falso nos casos legítimos de "cargo sem permissões": ausência de dado
 * (`undefined`/`null`/string vazia) e a lista explicitamente vazia (`'[]'`).
 *
 * @param {unknown} rawValue - Valor BRUTO de `role.permissions` (antes do parse).
 * @returns {true|false} `true` somente quando houve tentativa de parse que falhou.
 */
export function isPermissionParseFailure(rawValue) {
  if (typeof rawValue !== 'string') {
    return false;
  }

  const trimmed = rawValue.trim();
  if (trimmed === '') {
    // Sem dado para parser (coluna NULL/'' — cargo sem permissões cadastradas)
    return false;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      // Ex: '{"a":1}', '123', '"admin"', 'null' → não é lista de permissões
      return true;
    }
    // Lista explicitamente vazia é o caso legítimo; itens não-string também
    // são corrupção (o `filter` de `toPermissionArray` descartaria dado).
    return parsed.some((item) => typeof item !== 'string');
  } catch {
    // JSON inválido
    return true;
  }
}

export default permissionsList;
