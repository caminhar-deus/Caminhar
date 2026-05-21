#!/usr/bin/env node
import fs from 'fs';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente, priorizando .env.local
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config();

async function seedPostRecords() {
  const { query, closeDatabase } = await import('../lib/db.js');

  try {
    console.log('🌱 Inserindo posts de teste...');
    
    await query(`
      INSERT INTO posts (title, slug, excerpt, content, image_url, published)
      VALUES 
      (
        'Bem-vindo ao Caminhar com Deus', 
        'bem-vindo-ao-caminhar-com-deus', 
        'Este é o primeiro post do nosso blog. Aqui compartilharemos reflexões e estudos.', 
        'Seja bem-vindo ao nosso blog! Este espaço foi criado para compartilhar a palavra de Deus, reflexões diárias e estudos bíblicos para edificar a sua vida. Fique à vontade para navegar e deixar seus comentários.', 
        'https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?auto=format&fit=crop&w=800&q=80', 
        true
      ),
      (
        'A Importância da Oração', 
        'a-importancia-da-oracao', 
        'Descubra como a oração pode transformar a sua vida e fortalecer sua fé.', 
        'A oração é a chave para uma vida espiritual plena. É através dela que nos conectamos com o Criador, apresentamos nossas gratidões e petições. A Bíblia nos ensina a orar sem cessar (1 Tessalonicenses 5:17).', 
        'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=800&q=80', 
        true
      ),
      (
        'Post de Rascunho', 
        'post-de-rascunho', 
        'Este é um exemplo de post que ainda não foi publicado.', 
        'Conteúdo do rascunho...', 
        NULL, 
        false
      )
      ON CONFLICT (slug) DO NOTHING;
    `);
    
    console.log('✅ Posts de teste inseridos com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao inserir posts:', error);
  } finally {
    await closeDatabase();
  }
}

seedPostRecords();
