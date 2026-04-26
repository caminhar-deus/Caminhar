import { Redis } from '@upstash/redis';

let redisInstance = null;

// Inicialização segura com validação completa
try {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Validar que ambas variáveis existem
  if (redisUrl && redisToken) {

    // Validação critica: Verificar se a URL realmente começa com https://
    if (!redisUrl.startsWith('https://')) {
      console.warn('⚠️  REDIS: UPSTASH_REDIS_REST_URL é inválido! Deve começar com https://');
      console.warn('⚠️  Redis desabilitado, usando cache em memória como fallback');
    }
    // Validação critica: Verificar que o token NÃO é uma URL (proteção contra variáveis trocadas)
    else if (redisToken.startsWith('https://')) {
      console.warn('⚠️  REDIS: As variáveis estão TROCADAS! UPSTASH_REDIS_REST_TOKEN recebeu a URL');
      console.warn('⚠️  Redis desabilitado, usando cache em memória como fallback');
    }
    else {
      // Tudo ok, inicializar cliente
      redisInstance = new Redis({
        url: redisUrl,
        token: redisToken,
      });

      console.log('✅ Redis Upstash inicializado com sucesso');
    }
  } else {
    console.log('ℹ️  Variáveis do Redis não definidas, cache desabilitado');
  }

} catch (error) {
  // Captura qualquer exceção na inicialização para não quebrar o app
  console.error('❌ Erro ao inicializar cliente Redis:', error.message);
  console.warn('⚠️  Redis desabilitado, continuando sem cache');
  redisInstance = null;
}

export const redis = redisInstance;