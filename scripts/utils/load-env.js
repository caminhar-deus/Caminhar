import fs from 'fs';
import dotenv from 'dotenv';

/**
 * Carrega variáveis de ambiente priorizando .env.local (comum em projetos Next.js).
 * Única fonte de verdade para carregamento de env em scripts.
 *
 * @returns {void}
 */
export function loadEnv() {
  if (fs.existsSync('.env.local')) {
    dotenv.config({ path: '.env.local' });
  }
  dotenv.config();
}

/**
 * Valida se DATABASE_URL está definida.
 * Dispara erro com mensagem clara se não estiver.
 *
 * @returns {void}
 * @throws {Error} Se DATABASE_URL não estiver definida.
 */
export function requireDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL não definida. Verifique se o arquivo .env ou .env.local existe e contém a variável.'
    );
  }
}