/**
 * @module utils/resolve-next
 */

/**
 * Resolve o destino pós-login a partir de ?next= / ?returnUrl=.
 * Validação por resolução de URL (não por substring): o candidato precisa
 * começar com "/", não conter "//", "://", caracteres de controle (CRLF etc.)
 * nem "\\", e ao resolver contra um host fixo precisa manter a mesma origem.
 * Qualquer outro valor cai para /admin (evita open redirect).
 */
export function resolveNext(query) {
  const first = (value) => (Array.isArray(value) ? value[0] : value);
  const candidate = first(query?.next) || first(query?.returnUrl);
  if (typeof candidate !== 'string') return '/admin';
  if (
    !candidate.startsWith('/') ||
    candidate.includes('//') ||
    candidate.includes('://') ||
    // eslint-disable-next-line no-control-regex -- rejeição deliberada de controles (CRLF etc.)
    /[\x00-\x1F\x7F\\]/.test(candidate)
  ) {
    return '/admin';
  }
  try {
    const resolved = new URL(candidate, 'https://x.local');
    return resolved.origin === 'https://x.local' ? candidate : '/admin';
  } catch {
    return '/admin';
  }
}
