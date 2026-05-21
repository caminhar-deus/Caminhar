#!/usr/bin/env node
import { loadEnv } from './utils/load-env.js';
import { createBackup } from './backup.js';

// Carrega variáveis de ambiente, priorizando .env.local (módulo compartilhado)
loadEnv();

async function runBackup() {
  try {
    await createBackup();
  } catch (error) {
    console.error('❌ Falha ao criar backup:', error);
    process.exit(1);
  }
}

runBackup();
