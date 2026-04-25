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

    // Aguardar finalização completa das conexões
    await new Promise(resolve => setTimeout(resolve, 1000));

  } catch (error) {
    console.warn('⚠️ Aviso durante limpeza global dos testes:', error.message);
  }
}
