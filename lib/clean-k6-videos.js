import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

// Configuração para carregar .env corretamente em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function cleanK6Videos() {
  console.log('🧹 Iniciando limpeza de vídeos gerados pelo K6...');

  try {
    // Padrões comuns de títulos gerados pelo K6 ou testes automatizados
    // Ajuste conforme os títulos que você vê no admin
    const patterns = [
      'K6%',
      'Test Video%',
      'Load Test%',
      'Performance Test%',
      'Video de Teste%'
    ];

    // Constrói a query OR dinamicamente
    const whereClause = patterns.map((_, i) => `titulo LIKE $${i + 1}`).join(' OR ');
    
    // Executa a exclusão
    const deleteQuery = `DELETE FROM videos WHERE ${whereClause} RETURNING id, titulo`;
    const { rowCount, rows } = await pool.query(deleteQuery, patterns);

    if (rowCount > 0) {
      console.log(`✅ Sucesso! ${rowCount} vídeos foram removidos:`);
      rows.forEach(row => console.log(`   - [${row.id}] ${row.titulo}`));
    } else {
      console.log('✨ Nenhum vídeo de teste encontrado para exclusão.');
    }

  } catch (error) {
    console.error('❌ Erro ao limpar vídeos:', error);
  } finally {
    await pool.end();
  }
}

cleanK6Videos();