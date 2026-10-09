#!/usr/bin/env node
import { loadEnv } from './utils/load-env.js';
import { query, closePool } from './db/connection.js';

loadEnv();

export default async function seedMusicRecords() {
  try {
    console.log('🌱 Inserindo músicas de teste...');
    
    await query(`
      INSERT INTO musicas (titulo, artista, url_spotify, descricao, publicado)
      VALUES 
      ('Caminho no Deserto', 'Soraya Moraes', 'https://open.spotify.com/track/0d28khcov6AiegSCpG5TuT', 'Uma canção sobre fé no deserto.', true),
      ('Ousado Amor', 'Isaias Saad', 'https://open.spotify.com/track/1y7OxO5i6sfrBV52VUICE8', 'O amor de Deus é impressionante.', true),
      ('Raridade', 'Anderson Freire', 'https://open.spotify.com/track/3Gam4E5BENoqF5R1W67QWr', 'Você é especial para Deus.', true),
      ('Deus Proverá', 'Gabriela Gomes', 'https://open.spotify.com/track/2Nk0qNdLyYbFT1V7PqhLPj', 'Deus cuida de cada detalhe.', true),
      ('Ninguém Explica Deus', 'Preto no Branco', 'https://open.spotify.com/track/4x7FqE7pk4Eyd1I3vTUW7b', 'O incompreensível amor de Deus.', true),
      ('A Mesa', 'Eliana Ribeiro', 'https://open.spotify.com/track/2kfLnOMHmcqF75ohjj0Yhe', 'Celebrando a comunhão com Deus.', true)
    `);
    
    console.log('✅ Músicas de teste inseridas com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao inserir músicas:', error.message);
    throw error;
  }
}

// Uso como CLI: só neste caminho fechamos o pool e sinalizamos exit code.
if (process.argv[1] && process.argv[1].endsWith('seed-musicas.js')) {
  try {
    await seedMusicRecords();
  } catch (error) {
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}
