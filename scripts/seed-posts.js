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
        'Seja bem-vindo ao nosso blog! Este espaço foi criado para compartilhar a palavra de Deus, reflexões diárias e estudos bíblicos para edificar a sua vida.', 
        'https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?auto=format&fit=crop&w=800&q=80', 
        true
      ),
      (
        'A Importância da Oração', 
        'a-importancia-da-oracao', 
        'Descubra como a oração pode transformar a sua vida e fortalecer sua fé.', 
        'A oração é a chave para uma vida espiritual plena. É através dela que nos conectamos com o Criador, apresentamos nossas gratidões e petições.', 
        'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=800&q=80', 
        true
      ),
      (
        'Fé em Tempos Difíceis', 
        'fe-em-tempos-dificeis', 
        'Como manter a fé quando enfrentamos tribulações e desafios no dia a dia.', 
        'A fé é a certeza daquilo que esperamos e a prova das coisas que não vemos. Em tempos difíceis, nossa fé é testada e fortalecida.', 
        'https://images.unsplash.com/photo-1504052434568-70ad5836ab65?auto=format&fit=crop&w=800&q=80', 
        true
      ),
      (
        'O Poder da Gratidão', 
        'o-poder-da-gratidao', 
        'A gratidão transforma nossa perspectiva e nos aproxima de Deus.', 
        'Em tudo dai graças, porque esta é a vontade de Deus em Cristo Jesus para convosco. A gratidão abre portas e renova nossa alma.', 
        'https://images.unsplash.com/photo-1528716321680-815a08120ed7?auto=format&fit=crop&w=800&q=80', 
        true
      ),
      (
        'Versículos para Meditar', 
        'versiculos-para-meditar', 
        'Seleção de versículos bíblicos para fortalecer sua meditação diária.', 
        'Meditar na palavra de Deus é fonte de sabedoria e paz. Selecionamos alguns versículos para sua reflexão diária.', 
        'https://images.unsplash.com/photo-1490126125528-a0ceb6870e6f?auto=format&fit=crop&w=800&q=80', 
        true
      ),
      (
        'Propósito e Vocação', 
        'proposito-e-vocacao', 
        'Descubra seu propósito em Deus e viva uma vida com significado.', 
        'Cada um de nós foi criado com um propósito único por Deus. Descobrir e viver esse propósito é a chave para uma vida plena.', 
        'https://images.unsplash.com/photo-1438232997411-2b5670c75c7d?auto=format&fit=crop&w=800&q=80', 
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
    console.error('❌ Erro ao inserir posts:', error.message);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

seedPostRecords();
