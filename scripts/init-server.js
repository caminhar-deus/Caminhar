import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Carrega variáveis de ambiente
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config();

let isInitialized = false;

/**
 * Initialize server - set up database and authentication
 */
export async function initializeServer() {
  if (isInitialized) return; // Prevent double-initialization

  try {
    console.log('Initializing server...');

    // Initialize authentication system (which also initializes database)
    const { initializeAuth } = await import('../lib/auth.js');
    await initializeAuth();

    isInitialized = true;
    console.log('Server initialization completed successfully');
  } catch (error) {
    console.error('Failed to initialize server:', error);
    throw error;
  }
}

/**
 * Cleanup server resources
 */
export async function cleanupServer() {
  try {
    console.log('Cleaning up server resources...');
    const { closeDatabase } = await import('../lib/db.js');
    await closeDatabase();
    console.log('Server cleanup completed');
  } catch (error) {
    console.error('Error during server cleanup:', error);
  }
}

// Executa a inicialização se o arquivo for chamado diretamente (ex: npm run init-db)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initializeServer().catch(console.error);
}
