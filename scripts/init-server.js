#!/usr/bin/env node
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
 * Inicializa o servidor - configura banco de dados e autenticação
 */
export async function initializeServer() {
  if (isInitialized) return; // Evita dupla inicialização

  try {
    console.log('Inicializando servidor...');

    // Inicializa o sistema de autenticação (que também inicializa o banco de dados)
    const { initializeAuth } = await import('../lib/auth.js');
    await initializeAuth();

    isInitialized = true;
    console.log('Inicialização do servidor concluída com sucesso');
  } catch (error) {
    console.error('Falha ao inicializar servidor:', error);
    throw error;
  }
}

/**
 * Libera recursos do servidor
 */
export async function cleanupServer() {
  try {
    console.log('Limpando recursos do servidor...');
    const { closeDatabase } = await import('../lib/db.js');
    await closeDatabase();
    console.log('Limpeza do servidor concluída');
  } catch (error) {
    console.error('Erro durante limpeza do servidor:', error.message);
    throw error;
  }
}

// Executa a inicialização se o arquivo for chamado diretamente (ex: npm run init-db)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    try {
      await initializeServer();
      process.exit(0);
    } catch (error) {
      console.error('❌ Erro ao inicializar servidor:', error.message);
      process.exit(1);
    }
  })();
}
