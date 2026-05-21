#!/usr/bin/env node
import fs from 'fs';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente, priorizando .env.local
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config();

async function seedMusicRecords() {
  const { query, closeDatabase } = await import('../lib/db.js');

  try {
    console.log('🌱 Inserindo músicas de teste...');
    
    await query(`
      INSERT INTO musicas (titulo, artista, url_spotify, descricao, publicado)
      VALUES 
      ('Caminho no Deserto', 'Soraya Moraes', 'https://open.spotify.com/track/0d28khcov6AiegSCpG5TuT', 'Uma canção sobre fé no deserto.', true),
      ('Ousado Amor', 'Isaias Saad', 'https://open.spotify.com/track/1y7OxO5i6sfrBV52VUICE8', 'O amor de Deus é impressionante.', true)
    `);
    
    console.log('✅ Músicas de teste inseridas com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao inserir músicas:', error);
  } finally {
    await closeDatabase();
  }
}

seedMusicRecords();
