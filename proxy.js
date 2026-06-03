import { NextResponse } from 'next/server';
import { checkRateLimit } from './lib/cache.js';

/**
 * Middleware global do Next.js para Rate Limiting e Proteção DDoS.
 *
 * Funciona como primeira camada de defesa (antes de chegar ao handler da rota),
 * bloqueando requisições excessivas antes mesmo de processar o corpo da requisição.
 *
 * Integra com o sistema de rate limit existente em lib/cache.js (checkRateLimit),
 * que suporta Redis distribuído com fallback em memória.
 *
 * ## Rotas Protegidas
 *
 * | Rota | Limite | Janela | Propósito |
 * |------|--------|--------|-----------|
 * | `/api/auth/login` | 5 req | 1 min | Proteção contra brute force (P1) |
 * | `/api/posts` | 30 req | 1 min | Proteção DDoS contra busca massiva (P6) |
 * | `/api/videos` | 30 req | 1 min | Proteção DDoS contra busca massiva (P6) |
 * | `/api/musicas` | 30 req | 1 min | Proteção DDoS contra busca massiva (P6) |
 * | `/api/products` | 30 req | 1 min | Proteção DDoS contra busca massiva (P6) |
 */

// Configuração de proteção DDoS para rotas públicas de listagem/busca
const RATE_LIMIT_CONFIG = {
  '/api/auth/login': { limit: 5, window: 60000, key: 'api:auth:login' },
  '/api/posts':       { limit: 30, window: 60000, key: 'api:public:posts' },
  '/api/videos':      { limit: 30, window: 60000, key: 'api:public:videos' },
  '/api/musicas':     { limit: 30, window: 60000, key: 'api:public:musicas' },
  '/api/products':    { limit: 30, window: 60000, key: 'api:public:products' },
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

  // Identifica o IP do cliente de forma segura.
  //
  // Em desenvolvimento/teste (Next.js + k6), o request.ip sempre retorna 127.0.0.1 ou ::1
  // porque o servidor Node.js recebe a conexão localmente. O IP real do cliente só está
  // disponível no header X-Forwarded-For, que o k6 envia com um IP público simulado
  // (ex: 203.0.113.1) para testar o rate limit sem cair na whitelist de IPs locais.
  //
  // Em produção atrás de proxy reverso (Nginx), o proxy preenche X-Forwarded-For
  // com o IP real do cliente, e o Next.js expõe via request.ip.
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const socketIP = request.ip || '127.0.0.1';

  // Prioriza o header X-Forwarded-For quando:
  // 1. O socket é localhost (desenvolvimento/teste) — o IP real está no header
  // 2. Há um header válido presente
  // Caso contrário, usa o socket IP (produção ou conexão direta)
  const isLocalSocket = socketIP === '127.0.0.1' || socketIP === '::1' || socketIP === '::ffff:127.0.0.1';
  const ip = (isLocalSocket && forwardedFor) ? forwardedFor : socketIP;

  const isRateLimited = await checkRateLimit(ip, config.key, config.limit, config.window);

  if (isRateLimited) {
    const routeName = matchedRoute.replace('/api/', '');
    console.warn(
      `[SECURITY] ⛔ Bloqueio DDoS (Rate Limit) | Rota: ${routeName} | IP: ${ip} | ` +
      `UA: ${request.headers.get('user-agent') || 'Unknown'} | ` +
      `Data: ${new Date().toISOString()}`
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

// Configura o proxy para rodar nas rotas protegidas
export const config = {
  matcher: ['/api/auth/login', '/api/posts', '/api/videos', '/api/musicas', '/api/products'],
};