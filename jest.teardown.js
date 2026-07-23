import { getRedisInstance } from './lib/redis.js';
import { closeDatabase } from './lib/db.js';
import { cleanupRateLimitTimer } from './lib/cache.js';

export default async function globalTeardown() {
  // ✅ Limpeza global após execução de todos os testes
  try {
    // Limpar timer de cleanup periódico do cache em memória
    cleanupRateLimitTimer();

    // Fechar conexão do Redis (se houver instância ativa)
    const redisInstance = getRedisInstance();
    if (redisInstance) {
      await redisInstance.quit();
    }

    // Fechar todas as conexões do pool PostgreSQL
    await closeDatabase();

    // Parar container do banco de testes, se existir
    if (global.__TEST_DB_CONTAINER__) {
      await global.__TEST_DB_CONTAINER__.stop();
      console.log('✅ Container PostgreSQL de teste finalizado.');
    }

    // Aguardar finalização de eventuais callbacks assíncronos residuais
    // com timeout de segurança de 5s para evitar bloqueio indefinido
    await Promise.race([
      new Promise(resolve => setImmediate(resolve)),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Teardown timeout após 5s')), 5000)
      ),
    ]).catch(() => {
      console.warn('⚠️ Teardown excedeu 5s, prosseguindo mesmo assim.');
    });

  } catch (error) {
    console.warn('⚠️ Aviso durante limpeza global dos testes:', error.message);
  }
}