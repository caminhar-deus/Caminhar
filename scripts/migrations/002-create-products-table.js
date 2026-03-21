// Arquivo: scripts/migrations/002-create-products-table.js
import pkg from '@next/env';
const { loadEnvConfig } = pkg;
loadEnvConfig(process.cwd()); // Carrega o .env ou .env.local do projeto

const { query } = await import('../../lib/db.js'); // Importação dinâmica após as variáveis existirem

async function migrate() {
  console.log('Iniciando migração: Criar tabela de produtos...');

  const sql = `
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      price VARCHAR(100) NOT NULL,
      images TEXT NOT NULL,
      description TEXT,
      link_ml TEXT,
      link_shopee TEXT,
      link_amazon TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await query(sql);
    console.log('✅ Tabela "products" criada/verificada com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar a tabela products:', error);
    process.exit(1);
  }
}

migrate();
