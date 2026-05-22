#!/usr/bin/env node
import { spawn } from 'child_process';
import fs from 'fs';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente, priorizando .env.local
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config();

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ Erro: DATABASE_URL não definida no arquivo .env ou .env.local');
  process.exit(1);
}

console.log('🔌 Conectando ao PostgreSQL via psql...');
console.log('   (Digite \\q para sair)');

try {
  // Inicia o psql usando a string de conexão
  // stdio: 'inherit' permite interação direta com o terminal (input/output)
  const psql = spawn('psql', [dbUrl], { stdio: 'inherit' });

  psql.on('close', (code) => {
    process.exit(code ?? 0);
  });

  psql.on('error', (error) => {
    console.error('❌ Erro ao iniciar psql:', error.message);
    process.exit(1);
  });
} catch (error) {
  console.error('❌ Erro ao conectar ao banco de dados:', error.message);
  process.exit(1);
}