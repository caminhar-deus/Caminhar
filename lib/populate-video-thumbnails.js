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

async function populateThumbnails() {
  console.log('🖼️  Iniciando população de thumbnails para vídeos existentes...');

  try {
    // 1. Buscar vídeos que ainda não têm thumbnail definida
    const { rows: videos } = await pool.query('SELECT id, titulo, url_youtube FROM videos WHERE thumbnail IS NULL');
    
    if (videos.length === 0) {
      console.log('✅ Todos os vídeos já possuem thumbnail.');
      return;
    }

    console.log(`📊 Encontrados ${videos.length} vídeos para processar.`);

    let updatedCount = 0;

    for (const video of videos) {
      if (!video.url_youtube) continue;

      // Extrair ID do YouTube (suporta formatos variados de URL)
      const videoIdMatch = video.url_youtube.match(/(?:youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/watch\?v=)([^&?\s]+)/);
      const videoId = videoIdMatch ? videoIdMatch[1] : null;

      if (videoId) {
        // Gera a URL da thumbnail de alta qualidade do YouTube
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

        await pool.query('UPDATE videos SET thumbnail = $1 WHERE id = $2', [thumbnailUrl, video.id]);
        console.log(`   ✅ [${video.id}] Thumbnail salva: ${thumbnailUrl}`);
        updatedCount++;
      } else {
        console.log(`   ⚠️  [${video.id}] Não foi possível extrair ID do YouTube: ${video.url_youtube}`);
      }
    }

    console.log(`\n✨ Concluído! ${updatedCount} vídeos foram atualizados.`);

  } catch (error) {
    console.error('❌ Erro ao popular thumbnails:', error);
  } finally {
    await pool.end();
  }
}

populateThumbnails();