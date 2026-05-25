/**
 * Helpers compartilhados para endpoints da API.
 * Centraliza funções comuns como extração de IP confiável.
 */

/**
 * Extrai o IP real do cliente de forma segura, prevenindo IP spoofing.
 *
 * Estratégia:
 * 1. Se atrás de um proxy reverso confiável (Nginx, Cloudflare, etc.),
 *    o header 'x-forwarded-for' pode ser confiado porque o proxy
 *    substitui/prefixa com o IP real do cliente.
 * 2. Se NÃO atrás de proxy, usar req.socket.remoteAddress diretamente.
 * 3. Fallback: usa x-forwarded-for se disponível, senão socket.
 *
 * @param {Object} req - Objeto de requisição Next.js/Express
 * @param {Object} [options]
 * @param {boolean} [options.trustProxy=false] - Se true, confia em X-Forwarded-For
 * @returns {string} IP do cliente
 */
export function getClientIP(req, options = {}) {
  const { trustProxy = false } = options;

  // Se confiamos no proxy, usamos o header X-Forwarded-For
  if (trustProxy) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
  }

  // IP direto do socket (não pode ser falsificado pelo cliente)
  const socketIP = req.socket?.remoteAddress;
  if (socketIP && socketIP !== '::1') {
    return socketIP;
  }

  // Fallback: se é localhost (::1 ou 127.0.0.1)
  if (socketIP === '::1') {
    return '127.0.0.1';
  }

  // Último fallback: headers (pode ser falsificado, mas é melhor que 'unknown')
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return '127.0.0.1';
}