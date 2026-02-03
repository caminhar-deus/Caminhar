import { Redis } from '@upstash/redis';

// Inicializa o cliente Redis se as variáveis de ambiente estiverem configuradas
// Isso permite reutilizar a conexão em toda a aplicação
export const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Helper para gerar chaves consistentes
export const key = (...parts) => parts.join(':');