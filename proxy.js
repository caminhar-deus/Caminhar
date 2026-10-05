import { NextResponse } from 'next/server';
import { checkRateLimit } from './lib/cache/cache.js';
import { logger } from './lib/infra/logger.js';
import { fromMiddlewareRequest, resolveClientIP, UNKNOWN_IP } from './lib/api/helpers.js';

/**
 * Middleware global do Next.js para Rate Limiting e Proteção DDoS.
 *
 * Funciona como primeira camada de defesa (antes de chegar ao handler da rota),
 * bloqueando requisições excessivas antes mesmo de processar o corpo da requisição.
 *
 * Integra com o sistema de rate limit existente em lib/cache/cache.js (checkRateLimit),
 * que suporta Redis distribuído com fallback em memória.
 *
 * O rate limit das rotas públicas de listagem/busca (posts, videos, musicas, products
 * e dicas) é aplicado nos próprios handlers, evitando duplicidade de contagem com o
 * middleware (cada request era contado 2x, dobrando o consumo do limite).
 *
 * ## Rotas Protegidas
 *
 * | Rota | Limite | Janela | Propósito |
 * |------|--------|--------|-----------|
 * | `/api/auth/login` | 5 req | 1 min | Proteção contra brute force (P1) |
 */

// Configuração de proteção para rotas sensíveis
const RATE_LIMIT_CONFIG = {
  '/api/auth/login': { limit: 5, window: 60000, key: 'api:auth:login' },
};

export async function proxy(request) {
  const pathname = request.nextUrl.pathname;

  // Verifica se a rota atual está na lista de proteção
  const matchedRoute = Object.keys(RATE_LIMIT_CONFIG).find(route => 
    pathname === route || pathname.startsWith(route + '?') || pathname.startsWith(route + '/')
  );

  if (!matchedRoute) {
    return NextResponse.next();
  }

  const config = RATE_LIMIT_CONFIG[matchedRoute];

  // Identifica o IP do cliente pelo modelo de confiança de TRUST_PROXY.
  //
  // O middleware do Next não expõe o socket, então `fromMiddlewareRequest`
  // devolve `socketIP: null`: sem um proxy confiável declarado não existe IP
  // de cliente confiável neste runtime. Com TRUST_PROXY=N, a entrada confiável
  // é a N-ésima da direita de X-Forwarded-For — o cliente não a controla.
  const { clientIP, untrustedForwarded, hops } = resolveClientIP(fromMiddlewareRequest(request));

  // Avisa o operador sobre topologia não declarada, sem bloquear a requisição.
  if (untrustedForwarded) {
    logger.warn('Security',
      `X-Forwarded-For divergente do socket sem TRUST_PROXY configurado (hops=${hops}) | ` +
      `Rota: ${matchedRoute} | Cliente usado: ${clientIP} | ` +
      `UA: ${request.headers.get('user-agent') || 'Unknown'}`
    );
  }

  // Sem IP confiável, um limite por IP aqui seria um bucket único e global:
  // qualquer visitante estouraria o limite e derrubaria o login de todos.
  // O handler em `pages/api/auth/login.js` tem o socket e é o backstop real —
  // ele divide a MESMA chave, então o bucket não é contado em dobro.
  if (clientIP === UNKNOWN_IP) {
    logger.warn('Security',
      `Rate limit de ${matchedRoute} não aplicado: sem IP confiável no middleware ` +
      `(TRUST_PROXY=${hops || 'não configurado'}). Defina TRUST_PROXY para o limite valer aqui.`
    );
    return NextResponse.next();
  }

  const isRateLimited = await checkRateLimit(clientIP, config.key, config.limit, config.window);

  if (isRateLimited) {
    const routeName = matchedRoute.replace('/api/', '');
    logger.warn('Security',
      `⛔ Bloqueio DDoS (Rate Limit) | Rota: ${routeName} | IP: ${clientIP} | ` +
      `UA: ${request.headers.get('user-agent') || 'Unknown'}`
    );

    return NextResponse.json(
      {
        error: 'Too Many Requests',
        message: 'Muitas requisições. Tente novamente mais tarde.',
      },
      { status: 429 }
    );
  }

  return NextResponse.next();
}

// Configura o proxy para rodar na rota de autenticação (demais proteções ficam nos handlers)
export const config = {
  matcher: ['/api/auth/login'],
};