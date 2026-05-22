#!/usr/bin/env node
import fs from 'fs';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente, priorizando .env.local
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config();

// Função para mascarar a senha na URL do banco de dados
function maskPassword(url) {
  if (!url) return 'Não definida';
  return url.replace(/:([^:]+)@/, ':****@');
}

async function checkDbStatus() {
  console.log('🔍 Verificando status do banco de dados...');
  console.log('-----------------------------------------');

  const dbUrl = process.env.DATABASE_URL;
  console.log(`DATABASE_URL: ${maskPassword(dbUrl)}`);

  if (!dbUrl) {
    console.error('\n❌ Erro: A variável de ambiente DATABASE_URL não está configurada.');
    console.log('   Verifique seus arquivos .env e .env.local.');
    return;
  }

  let db;
  try {
    // Importação dinâmica para garantir que o .env foi carregado
    db = await import('../lib/db.js');
    
    console.log('\n🔌 Tentando conectar ao banco de dados...');
    const versionResult = await db.query('SELECT version()');
    console.log(`✅ Conexão bem-sucedida! Versão: ${versionResult.rows[0].version}`);

    console.log('\n📊 Contagem de itens nas tabelas:');
    
    const tables = ['posts', 'videos', 'musicas', 'users'];
    for (const table of tables) {
      const countResult = await db.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`   - ${table.padEnd(10)}: ${countResult.rows[0].count} itens`);
    }
    console.log('-----------------------------------------');

  } catch (error) {
    console.error('\n❌ Falha ao conectar ou consultar o banco de dados:', error.message);
    process.exit(1);
  } finally {
    if (db) {
      await db.closeDatabase();
    }
  }
}

checkDbStatus();