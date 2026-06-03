#!/usr/bin/env node
import fs from 'fs';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente, priorizando .env.local
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config();

async function seedVideoRecords() {
  const { query, closeDatabase } = await import('../lib/db.js');

  try {
    console.log('🌱 Inserindo vídeos de teste...');
    
    await query(`
      INSERT INTO videos (titulo, url_youtube, descricao, publicado)
      VALUES 
      ('Ousado Amor', 'https://www.youtube.com/watch?v=o-YBDTqX_ZU', 'Uma reflexão sobre o amor de Deus.', true),
      ('Lindo És', 'https://www.youtube.com/watch?v=zSif77IVs_Y', 'Canção de adoração.', true),
      ('Grandes Coisas', 'https://www.youtube.com/watch?v=5D2q1XJcLgM', 'Deus faz grandes coisas em nossas vidas.', true),
      ('Oceanos', 'https://www.youtube.com/watch?v=7sSYlQD3sHM', 'Mergulhe no amor de Deus.', true),
      ('Meu Universo', 'https://www.youtube.com/watch?v=uTy6cMm6dgo', 'Deus é o centro de tudo.', true),
      ('Faz Chover', 'https://www.youtube.com/watch?v=KNw7tYCekgk', 'Clamando por avivamento.', true)
    `);
    
    console.log('✅ Vídeos de teste inseridos com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao inserir vídeos:', error.message);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

seedVideoRecords();
