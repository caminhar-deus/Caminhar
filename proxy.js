import { NextResponse } from 'next/server';
import { redis } from './lib/redis.js';

// Armazenamento em memória para o Rate Limiting
// Nota: Em ambientes serverless (como Vercel), este Map é recriado por instância/lambda.
// Para servidores Node.js persistentes (VPS) ou desenvolvimento local, funciona perfeitamente.
const ipRateLimit = new Map();

// Configuração: 5 tentativas a cada 15 minutos
const RATE_LIMIT_WINDOW = 15 * 60; // 15 minutos em segundos
const MAX_ATTEMPTS = 5;

export async function proxy(request) {
  // Identifica o IP do cliente
  // request.ip funciona na maioria dos hostings Next.js
  // x-forwarded-for é necessário se estiver atrás de um proxy (Nginx, etc)
  const ip = request.ip || request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  
  // --- 0. WHITELIST CHECK ---
  // Verifica variável de ambiente (ex: ADMIN_IP_WHITELIST=127.0.0.1,192.168.1.1)
  const envWhitelist = (process.env.ADMIN_IP_WHITELIST || '').split(',').map(i => i.trim());
  if (envWhitelist.includes(ip)) {
    return NextResponse.next();
  }

  // Verifica Whitelist no Redis
  if (redis) {
    try {
      const isWhitelisted = await redis.sismember('rate_limit:whitelist', ip);
      if (isWhitelisted) {
        return NextResponse.next();
      }
    } catch (error) {
      console.error('Redis error (whitelist check):', error);
    }
  }

  let isBlocked = false;
  let remainingMinutes = 0;

  // --- ESTRATÉGIA 1: REDIS (Persistente) ---
  if (redis) {
    try {
      const key = `rate_limit:${ip}`;
      const count = await redis.incr(key);
      
      // Se for a primeira tentativa, define a expiração
      if (count === 1) {
        await redis.expire(key, RATE_LIMIT_WINDOW);
      }
      
      if (count > MAX_ATTEMPTS) {
        isBlocked = true;
        const ttl = await redis.ttl(key);
        remainingMinutes = Math.ceil(ttl / 60);
      }
    } catch (error) {
      console.error('Redis error:', error);
      // Em caso de erro no Redis, o código continuará e usará o fallback de memória abaixo (opcional)
      // ou simplesmente deixará passar (fail-open).
    }
  } 
  
  // --- ESTRATÉGIA 2: MEMÓRIA (Fallback / Local) ---
  // Executa apenas se o Redis não estiver configurado ou se não tiver bloqueado via Redis ainda
  if (!redis && !isBlocked) {
    const now = Date.now();
    const windowMs = RATE_LIMIT_WINDOW * 1000;

    if (ipRateLimit.size > 10000) ipRateLimit.clear();

    let record = ipRateLimit.get(ip);
    if (!record) {
      record = { count: 0, startTime: now };
      ipRateLimit.set(ip, record);
    }

    if (now - record.startTime > windowMs) {
      record.count = 0;
      record.startTime = now;
    }

    record.count++;
    
    if (record.count > MAX_ATTEMPTS) {
      isBlocked = true;
      remainingMinutes = Math.ceil((windowMs - (now - record.startTime)) / 60000);
    }
  }

  if (isBlocked) {
    
    // Registra a tentativa bloqueada no log do servidor
    console.warn(`[SECURITY] ⛔ Tentativa de login bloqueada (Rate Limit) | IP: ${ip} | UA: ${request.headers.get('user-agent') || 'Unknown'} | Data: ${new Date().toISOString()}`);

    return NextResponse.json(
      { message: `Muitas tentativas de login. Por favor, aguarde ${remainingMinutes} minutos.` },
      { status: 429 }
    );
  }

  return NextResponse.next();
}

// Configura o middleware para rodar APENAS na rota de login
export const config = {
  matcher: '/api/auth/login',
};