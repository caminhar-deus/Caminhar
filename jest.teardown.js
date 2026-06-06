import { redis } from './lib/redis.js';
import { closeDatabase } from './lib/db.js';

export default async function globalTeardown() {
  // ✅ Limpeza global após execução de todos os testes
  try {
    // Fechar conexão do Redis
    if (redis) {
      await redis.quit();
    }

    // Fechar todas as conexões do pool PostgreSQL
    await closeDatabase();

    // Parar container do banco de testes, se existir
    if (global.__TEST_DB_CONTAINER__) {
      await global.__TEST_DB_CONTAINER__.stop();
      console.log('✅ Container PostgreSQL de teste finalizado.');
    }

    // Aguardar finalização completa das conexões
    await new Promise(resolve => setTimeout(resolve, 1000));

  } catch (error) {
    console.warn('⚠️ Aviso durante limpeza global dos testes:', error.message);
  }
}
