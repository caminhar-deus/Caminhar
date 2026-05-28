#!/usr/bin/env node
import { loadEnv, cleanTableByPattern } from './utils/cleanup.js';

async function main() {
  loadEnv();
  await cleanTableByPattern({ table: 'posts', column: 'slug', patterns: ['post-carga-%', 'k6-%'] });
}

main().catch((err) => {
  console.error('❌ Erro ao limpar posts de teste:', err.message);
  process.exit(1);
});
