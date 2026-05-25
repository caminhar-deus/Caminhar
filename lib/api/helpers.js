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

/**
 * Detecta tentativa de IP spoofing comparando múltiplas fontes de IP.
 *
 * Um IP é considerado "spoofed" quando há discrepância entre o IP do socket
 * (que nunca pode ser falsificado pelo cliente) e o header X-Forwarded-For
 * (que pode ser facilmente manipulado).
 *
 * @param {Object} req - Objeto de requisição Next.js/Express
 * @returns {Object} Resultado da detecção: { isSpoofed: boolean, socketIP: string, forwardedIP: string|null }
 *
 * @example
 * const { isSpoofed } = detectSpoofedIP(req);
 * if (isSpoofed) {
 *   return res.status(403).json({ error: 'IP spoofing detectado' });
 * }
 */
export function detectSpoofedIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const socketIP = req.socket?.remoteAddress;
  const normalizedSocketIP = socketIP === '::1' ? '127.0.0.1' : socketIP;

  // Se não há header X-Forwarded-For, não há como detectar spoofing (provavelmente conexão direta)
  if (!forwarded) {
    return { isSpoofed: false, socketIP: normalizedSocketIP || 'unknown', forwardedIP: null };
  }

  const forwardedIP = forwarded.split(',')[0].trim();

  // Se temos socket IP e ele é diferente do forwarded, investiga spoofing
  if (normalizedSocketIP && normalizedSocketIP !== forwardedIP) {
    // Caso 1: Socket é localhost (::1 ou 127.0.0.1) e forwarded é IP público → spoofing
    if (normalizedSocketIP === '127.0.0.1' || normalizedSocketIP === '::1') {
      const isForwardedPublic = !/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|::1$)/.test(forwardedIP);
      if (isForwardedPublic) {
        return { isSpoofed: true, socketIP: normalizedSocketIP, forwardedIP };
      }
      // Se forwarded também é privado, assume proxy legítimo local
      return { isSpoofed: false, socketIP: normalizedSocketIP, forwardedIP };
    }

    // Caso 2: Socket não é localhost e os IPs diferem
    const isPrivateIP = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.)/.test(normalizedSocketIP);
    if (!isPrivateIP && !normalizedSocketIP.startsWith('::')) {
      return { isSpoofed: true, socketIP: normalizedSocketIP, forwardedIP };
    }
  }

  return { isSpoofed: false, socketIP: normalizedSocketIP || 'unknown', forwardedIP };
}
