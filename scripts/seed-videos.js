import fs from 'fs';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente, priorizando .env.local
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config();

async function seedVideos() {
  const { query, closeDatabase } = await import('../lib/db.js');

  try {
    console.log('🌱 Inserindo vídeos de teste...');
    
    await query(`
      INSERT INTO videos (titulo, url_youtube, descricao, publicado)
      VALUES 
      ('Ousado Amor', 'https://www.youtube.com/watch?v=o-YBDTqX_ZU', 'Uma reflexão sobre o amor de Deus.', true),
      ('Lindo És', 'https://www.youtube.com/watch?v=zSif77IVs_Y', 'Canção de adoração.', true)
    `);
    
    console.log('✅ Vídeos de teste inseridos com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao inserir vídeos:', error);
  } finally {
    await closeDatabase();
  }
}

seedVideos();