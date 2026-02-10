import 'dotenv/config';
import { query } from './db.js';

async function createVideoIndex() {
  console.log('🚀 Otimizando banco de dados (Criando índices)...');

  try {
    // Cria um índice ordenado de forma decrescente na data de criação
    // Isso otimiza diretamente a query: ORDER BY created_at DESC
    await query('CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos (created_at DESC)');
    
    console.log('✅ Índice "idx_videos_created_at" criado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar índice:', error);
  } finally {
    process.exit();
  }
}

createVideoIndex();