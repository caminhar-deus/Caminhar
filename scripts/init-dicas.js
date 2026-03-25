import 'dotenv/config';
import { query, closeDatabase } from '../lib/db.js';

async function initDicas() {
  console.log('⏳ Iniciando criação da tabela de Dicas do Dia...');
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS dicas (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        published BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabela "dicas" pronta.');

    // Garante que a coluna published seja adicionada caso a tabela já exista de uma versão anterior
    await query('ALTER TABLE dicas ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT true;');

    // Verifica se a tabela está vazia para não duplicar dados
    const check = await query('SELECT count(*) FROM dicas');
    if (parseInt(check.rows[0].count) === 0) {
      console.log('📝 Populando tabela com os dados iniciais padrão...');
      await query(`
        INSERT INTO dicas (name, content, published) VALUES
        ('Palavra do dia', 'Os artigos e reflexões mudaram a minha forma de ver as dificuldades do dia a dia. Encontrei muita paz e direcionamento nas mensagens.', true),
        ('Oração do Dia', 'A curadoria de músicas e os vídeos recomendados têm sido fundamentais nos meus momentos de devocional e oração. Trabalho incrível!', true),
        ('Anjos do Dia', 'Uso frequentemente os materiais do projeto para embasar os estudos com os jovens. É um conteúdo profundo e muito acessível.', true);
      `);
    }
    console.log('🎉 Processo de dicas finalizado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao inicializar dicas:', error);
  } finally {
    await closeDatabase();
  }
}
initDicas();